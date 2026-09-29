# 넘버 사천성 (Number Shisen-sho)

사천성의 '경로 연결' + 사과게임의 '숫자 합산'. 상단의 **목표 숫자**와 합이 같은 두 패를 최대 1번 꺾이는 빈 경로로 이으면 팡! 120초 타임어택 퍼즐.

## 실행

```bash
pip install -r requirements.txt
python app.py          # http://localhost:15004
```

## 서버 운영 (Ubuntu)

```bash
./startup.sh              # git pull → 의존성 → 기존 프로세스 종료 → gunicorn 기동 (포트 15004)
./startup.sh --no-pull    # git pull 없이 재기동
./startup.sh stop | status | logs
./startup.sh dev          # Flask 개발 서버(포그라운드, 자동 리로드)
```

| 항목 | 경로 |
| --- | --- |
| 프로젝트 | `/scsrun/app/nine-shisen-sho` (startup.sh 위치 기준) |
| PID | `/scsrun/pid/nine-shisen-sho.pid` |
| 로그 | `/scslog/app/nine-shisen-sho/app-YYYY-MM-DD.log` (일별, `LOG_KEEP_DAYS`일 보관) |

실제 동작은 공통 런처 `scripts/scs-run.sh <앱이름>`이 담당하고, 포트·워커 수 등은 `scsrun.conf`에서 바꿉니다. 다른 앱에서는 `startup.sh`의 `APP_NAME`(=레포지토리 이름)과 `scsrun.conf`만 바꿔 그대로 씁니다. git pull·pip 설치가 실패하면 기존 서버는 멈추지 않고 그대로 둡니다.

## 테스트

```bash
node --test tests/*.test.js   # 경로 판정 · 보드 생성 · 목표 생성 · 막힘 처리
```

## 구조

| 파일 | 역할 |
| --- | --- |
| `app.py` | Flask 앱, `/` 게임 · `/healthz` |
| `wsgi.py` | gunicorn 진입점 (`wsgi:app`), `startup.sh dev`에서 직접 실행 |
| `startup.sh`, `scripts/scs-run.sh`, `scsrun.conf` | 서버 기동 스크립트 · 공통 런처 · 설정 |
| `templates/index.html` | 시작 · 게임 · 결과 화면, 규칙/설정/일시정지 오버레이 |
| `static/js/logic.js` | DOM 없는 규칙 엔진: 최소 꺾임 BFS 경로 판정, 1~9 보드 생성, 목표 숫자 생성, 막힘 검사 → 셔플(10회) → 위치 스왑 보정 |
| `static/js/main.js` | 게임 루프, 목표 숫자 큐, 점수, 입력(탭/클릭/키보드), 점선·팡·셔플 연출, 결과 공유 이미지 |
| `static/js/confetti.js` | 패 제거 시 작은 색종이, 퍼펙트(판 전체 클리어) 시 화면 전체 색종이 |
| `static/js/audio.js` | Web Audio API 효과음 합성 (음원 파일 없음) |
| `static/js/i18n.js` | 한·영·중·일 |
| `static/css/style.css` | 크림 톤 라이트/다크 테마, 반응형 보드 |

## 규칙과 결정 사항

- **목표 숫자**: 상단에 이번 목표(큰 칩)와 다음 목표 두 개가 보입니다. 한 쌍을 터뜨릴 때마다 목표가 한 칸씩 당겨집니다.
- **목표 생성**: 새 목표는 '지금 보드에서 실제로 이을 수 있는 쌍'의 합에서 뽑아서 대체로 5~14 사이가 나오고, 연달아 같은 숫자는 피합니다. 차례가 왔을 때 이을 쌍이 없으면 패를 섞고(최대 10회), 그래도 없으면 합이 맞는 두 패를 이을 수 있는 자리로 옮깁니다. 남은 패로 아예 만들 수 없는 합이면(주로 판 막바지) 그 목표만 바꿉니다.
- **패**: 1~9, 보드 8×14 = 112패(숫자마다 12~13개).
- **연결**: 가로·세로로 최대 1번 꺾임. 꺾이는 지점이 항상 보드 안이라 외곽 테두리는 경로로 쓰이지 않습니다(화면의 테두리 여백은 반 칸).
- **팡**: 두 번째 패를 누르는 순간 바로 터지고, 점선은 번쩍 나타났다가 곧바로 사라집니다(0.28초).
- **점수 = 지운 칸의 개수** (한 쌍 = 2점). 콤보 · 클리어 보너스 없음. 결과 화면은 점수만 표시합니다.
- **퍼펙트**(112패 전부 제거): 화면 전체 색종이 + PERFECT!, 이어서 새 보드. 패를 지울 때마다 작은 색종이.
- 가로 화면(폭 ≥ 640px)은 14×8, 세로는 8×14. 게임 중 회전하면 보드를 전치해 이어서 진행합니다.

## 조작

- 모바일: 탭-탭
- PC: 클릭, 방향키 + Space, `Esc` 일시정지
