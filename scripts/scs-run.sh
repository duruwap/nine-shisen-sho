#!/bin/bash
# 공통 앱 런처 (Ubuntu) — gunicorn 으로 Flask 앱을 백그라운드 기동하고 일별 로그를 남긴다.
#
#   scs-run.sh <앱이름> [start] [--no-pull]   # git pull → 의존성 → 기존 프로세스 종료 → 기동
#   scs-run.sh <앱이름> restart [--no-pull]   # start 와 동일
#   scs-run.sh <앱이름> stop | status
#   scs-run.sh <앱이름> logs [줄수]           # 오늘 로그 tail -F
#
# 경로 규칙 (<앱이름> = 레포지토리 이름)
#   프로젝트  $SCS_APP_DIR (기본 /scsrun/app/<앱이름>)
#   PID      /scsrun/pid/<앱이름>.pid
#   로그     /scslog/app/<앱이름>/app-YYYY-MM-DD.log (일별, 자정에 새 파일)
#   데이터    /scsdat/app/<앱이름>  (SCS_DATA_DIR 로 앱에 전달)
#
# 앱 디렉토리의 scsrun.conf 에서 PORT, WORKERS 등을 읽는다.
# 루트 경로는 SCS_RUN_ROOT / SCS_LOG_ROOT / SCS_DAT_ROOT 환경변수로 바꿀 수 있다.

set -uo pipefail

# ---------- 내부용: stdin 을 날짜별 파일로 기록 ----------
if [ "${1:-}" = "__logpipe" ]; then
    dir="$2"
    cur=""
    while IFS= read -r line || [ -n "$line" ]; do
        printf -v day '%(%Y-%m-%d)T' -1
        if [ "$day" != "$cur" ]; then
            exec 3>>"$dir/app-$day.log"
            cur="$day"
        fi
        printf '%s\n' "$line" >&3
    done
    exit 0
fi

APP_NAME="${1:-}"
if [ -z "$APP_NAME" ]; then
    echo "사용법: $0 <앱이름> [start|restart|stop|status|logs] [--no-pull]" >&2
    exit 2
fi
shift

CMD="start"
NO_PULL=0
LOG_LINES=100
for arg in "$@"; do
    case "$arg" in
        start|restart|stop|status|logs) CMD="$arg" ;;
        --no-pull) NO_PULL=1 ;;
        [0-9]*) LOG_LINES="$arg" ;;
        *) echo "알 수 없는 인자: $arg" >&2; exit 2 ;;
    esac
done

SCS_RUN_ROOT="${SCS_RUN_ROOT:-/scsrun}"
SCS_LOG_ROOT="${SCS_LOG_ROOT:-/scslog}"
SCS_DAT_ROOT="${SCS_DAT_ROOT:-/scsdat}"

APP_DIR="${SCS_APP_DIR:-$SCS_RUN_ROOT/app/$APP_NAME}"
PID_DIR="$SCS_RUN_ROOT/pid"
PID_FILE="$PID_DIR/$APP_NAME.pid"
LOG_DIR="$SCS_LOG_ROOT/app/$APP_NAME"
DATA_DIR="$SCS_DAT_ROOT/app/$APP_NAME"
SELF="$(readlink -f "$0")"

# ---------- 설정 ----------
PORT=8000
BIND_HOST=0.0.0.0
WSGI_APP="wsgi:app"
WORKERS=2
THREADS=4
TIMEOUT=30
HEALTH_PATH=""
LOG_KEEP_DAYS=30
# shellcheck disable=SC1091
[ -f "$APP_DIR/scsrun.conf" ] && . "$APP_DIR/scsrun.conf"

VENV="$APP_DIR/venv"

log() { printf '[%(%Y-%m-%d %H:%M:%S)T] [%s] %s\n' -1 "$APP_NAME" "$*"; }
die() { log "오류: $*" >&2; exit 1; }
today_log() { printf '%s/app-%(%Y-%m-%d)T.log' "$LOG_DIR" -1; }

# PID 파일의 프로세스가 살아 있고 실제로 gunicorn 인지 확인 (PID 재사용 방지)
running_pid() {
    [ -f "$PID_FILE" ] || return 1
    local pid
    pid="$(cat "$PID_FILE" 2>/dev/null)"
    [[ "$pid" =~ ^[0-9]+$ ]] || return 1
    kill -0 "$pid" 2>/dev/null || return 1
    tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null | grep -q gunicorn || return 1
    echo "$pid"
}

port_in_use() {
    python3 - "$BIND_HOST" "$PORT" <<'PY' 2>/dev/null
import socket, sys
s = socket.socket()
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
try:
    s.bind((sys.argv[1], int(sys.argv[2])))
except OSError:
    sys.exit(0)
sys.exit(1)
PY
}

health_ok() {
    [ -z "$HEALTH_PATH" ] && return 0
    curl -fsS -m 2 -o /dev/null "http://127.0.0.1:$PORT$HEALTH_PATH"
}

do_stop() {
    local pid
    if ! pid="$(running_pid)"; then
        rm -f "$PID_FILE"
        log "실행 중인 프로세스 없음"
        return 0
    fi
    log "종료 중 (PID $pid)"
    kill -TERM "$pid" 2>/dev/null
    for _ in $(seq 1 30); do
        kill -0 "$pid" 2>/dev/null || break
        sleep 0.5
    done
    if kill -0 "$pid" 2>/dev/null; then
        log "15초 안에 종료되지 않아 강제 종료"
        kill -KILL "$pid" 2>/dev/null
        sleep 0.5
    fi
    rm -f "$PID_FILE"
    log "종료됨"
}

do_pull() {
    [ "$NO_PULL" = 1 ] && { log "git pull 생략 (--no-pull)"; return 0; }
    [ -d "$APP_DIR/.git" ] || { log "git 저장소가 아니라 pull 생략"; return 0; }
    log "git pull"
    git -C "$APP_DIR" pull --ff-only || die "git pull 실패 — 서버는 그대로 둡니다"
}

do_deps() {
    if [ ! -x "$VENV/bin/python" ]; then
        log "venv 생성"
        python3 -m venv "$VENV" || die "venv 생성 실패 (sudo apt install python3-venv 필요할 수 있음)"
    fi
    local want have=""
    want="$(sha256sum "$APP_DIR/requirements.txt" | cut -d' ' -f1)"
    [ -f "$VENV/.requirements.sha256" ] && have="$(cat "$VENV/.requirements.sha256")"
    if [ "$want" != "$have" ] || [ ! -x "$VENV/bin/gunicorn" ]; then
        log "의존성 설치"
        "$VENV/bin/pip" install --disable-pip-version-check -q -r "$APP_DIR/requirements.txt" \
            || die "pip install 실패 — 서버는 그대로 둡니다"
        echo "$want" > "$VENV/.requirements.sha256"
    else
        log "의존성 변경 없음"
    fi
}

cleanup_logs() {
    [ "${LOG_KEEP_DAYS:-0}" -gt 0 ] 2>/dev/null || return 0
    find "$LOG_DIR" -maxdepth 1 -name 'app-*.log' -type f -mtime "+$LOG_KEEP_DAYS" -delete 2>/dev/null
}

do_start() {
    [ -d "$APP_DIR" ] || die "프로젝트 디렉토리 없음: $APP_DIR"
    mkdir -p "$PID_DIR" "$LOG_DIR" "$DATA_DIR" || die "디렉토리 생성 실패 (권한 확인: $PID_DIR, $LOG_DIR, $DATA_DIR)"

    # pull·설치가 실패하면 기존 서버를 살려 둔 채 중단한다.
    do_pull
    do_deps
    do_stop

    if port_in_use; then
        # Something not tracked by our PID file (e.g. an old manual run) still serves the
        # port — and keeps serving the OLD code. Show who it is instead of guessing.
        log "오류: 포트 $PORT 을(를) PID 파일에 없는 다른 프로세스가 사용 중입니다." >&2
        log "      그 프로세스가 계속 예전 코드를 서비스하고 있을 수 있습니다. 종료 후 다시 실행하세요." >&2
        if command -v ss >/dev/null 2>&1; then
            ss -ltnp "sport = :$PORT" 2>/dev/null >&2 || true
        elif command -v lsof >/dev/null 2>&1; then
            lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >&2 || true
        fi
        exit 1
    fi
    cleanup_logs

    # gunicorn 24+ 는 기본으로 ~/.gunicorn/gunicorn.ctl 을 만들어 여러 앱끼리 충돌하므로 끈다.
    local extra=""
    "$VENV/bin/gunicorn" --help 2>/dev/null | grep -q -- --no-control-socket && extra="--no-control-socket"

    log "기동: $BIND_HOST:$PORT (workers=$WORKERS, threads=$THREADS)"
    log "로그: $LOG_DIR/app-YYYY-MM-DD.log"
    (
        cd "$APP_DIR" || exit 1
        export SCS_APP_NAME="$APP_NAME" SCS_DATA_DIR="$DATA_DIR" SCS_LOG_DIR="$LOG_DIR" PORT
        [ -n "${PUBLIC_URL:-}" ] && export PUBLIC_URL
        setsid nohup bash -c '
            "$0" --chdir "$1" --bind "$2" --workers "$3" --threads "$4" --timeout "$5" \
                 --pid "$6" --access-logfile - --error-logfile - --capture-output \
                 --access-logformat "%(t)s %(h)s \"%(r)s\" %(s)s %(b)s %(M)sms \"%(a)s\"" \
                 ${10} "$7" 2>&1 | "$8" __logpipe "$9"
        ' "$VENV/bin/gunicorn" "$APP_DIR" "$BIND_HOST:$PORT" "$WORKERS" "$THREADS" "$TIMEOUT" \
          "$PID_FILE" "$WSGI_APP" "$SELF" "$LOG_DIR" "$extra" \
          < /dev/null > /dev/null 2>&1 &
    )

    local pid=""
    for _ in $(seq 1 40); do
        if pid="$(running_pid)" && health_ok; then
            log "기동 완료 (PID $pid) → http://$(hostname -I 2>/dev/null | awk '{print $1}'):$PORT"
            return 0
        fi
        sleep 0.5
    done
    log "기동 실패 — 최근 로그:" >&2
    tail -n 30 "$(today_log)" >&2 2>/dev/null
    exit 1
}

do_status() {
    local pid
    if pid="$(running_pid)"; then
        local up
        up="$(ps -o etime= -p "$pid" 2>/dev/null | tr -d ' ')"
        if health_ok; then
            log "실행 중 (PID $pid, 가동 $up, 포트 $PORT, 헬스체크 OK)"
        else
            log "실행 중이지만 헬스체크 실패 (PID $pid, 포트 $PORT)"
        fi
        [ -n "$HEALTH_PATH" ] && log "헬스체크: $(curl -fsS -m 2 "http://127.0.0.1:$PORT$HEALTH_PATH" 2>/dev/null)"
        log "로그: $(today_log)"
        return 0
    fi
    log "중지됨"
    return 3
}

do_logs() {
    local f
    f="$(today_log)"
    [ -f "$f" ] || { log "오늘 로그 없음: $f"; exit 1; }
    exec tail -n "$LOG_LINES" -F "$f"
}

case "$CMD" in
    start|restart) do_start ;;
    stop) do_stop ;;
    status) do_status ;;
    logs) do_logs ;;
esac
