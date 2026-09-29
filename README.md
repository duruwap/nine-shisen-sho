# 드래그 넘버 (Drag Number)

사과게임처럼 숫자판 위를 드래그해 네모 영역을 그리고, 영역 안 숫자의 합이 상단 **목표 숫자**와 같으면 팡! 120초 타임어택 퍼즐.

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

## 링크 미리보기 (카카오톡 등)

- `templates/index.html`에 Open Graph / Twitter 카드 메타 태그가 있고, 미리보기 이미지는 `static/og-image.png`(1200×630)입니다.
- 카카오톡은 `og:image`를 절대 URL로 요구하므로 `scsrun.conf`의 `PUBLIC_URL`(기본 `https://nine.duruwap.com`)을 앞에 붙입니다. 비워 두면 요청 호스트(nginx의 `X-Forwarded-Proto/Host`)를 씁니다.
- 이미지를 고치려면 `design/og-image.html`을 수정하고 `node design/render-og.js`로 다시 렌더링합니다.
- 카카오톡은 미리보기를 캐시하므로, 예전 미리보기가 보이면 [카카오 공유 디버거](https://developers.kakao.com/tool/debugger/sharing)에서 URL을 넣고 캐시를 초기화합니다.

## 테스트

```bash
node --test tests/*.test.js   # 영역 합 계산 · 보드 생성 · 목표 생성
```

## 구조

| 파일 | 역할 |
| --- | --- |
| `app.py` | Flask 앱, `/` 게임 · `/healthz`. 정적 파일 URL에 `?v=<수정시각>`을 붙여 배포 즉시 새 JS/CSS가 적용되게 함 |
| `wsgi.py` | gunicorn 진입점 (`wsgi:app`), `startup.sh dev`에서 직접 실행 |
| `startup.sh`, `scripts/scs-run.sh`, `scsrun.conf` | 서버 기동 스크립트 · 공통 런처 · 설정 |
| `templates/index.html` | 시작 · 게임 · 결과 화면, 규칙/설정/일시정지 오버레이 |
| `static/js/logic.js` | DOM 없는 규칙 엔진: 1~9 보드 생성, 영역 합 계산, 2차원 누적합으로 모든 네모 영역 탐색, 목표 숫자 생성 |
| `static/js/main.js` | 게임 루프, 목표 숫자 큐, 점수, 드래그 선택(포인터 이벤트), 팡 연출, 결과 공유 이미지 |
| `static/js/confetti.js` | 패 제거 시 작은 색종이, 퍼펙트(판 전체 클리어) 시 화면 전체 색종이 |
| `static/js/audio.js` | Web Audio API 효과음 합성 (음원 파일 없음) |
| `static/js/i18n.js` | 한·영·중·일 |
| `static/css/style.css` | 크림 톤 라이트/다크 테마, 반응형 보드 |
| `static/og-image.png`, `design/` | 링크 미리보기 이미지와 그 원본(HTML) · 렌더 스크립트 |

## 규칙과 결정 사항

- **드래그**: 보드(또는 그 바깥 여백)에서 드래그하면 네모 영역이 그려지고, 영역에 조금이라도 걸친 숫자(보이는 칩 기준, 칩 사이 틈은 제외)가 모두 선택됩니다. 선처럼 얇게 그어도 지나간 숫자가 선택됩니다. 손을 떼는 순간 합이 목표와 같으면 바로 터집니다. 숫자는 2개 이상 묶어야 합니다(빈 칸은 0).
- **드래그 중 합 표시**: 영역 모서리에 지금 합이 보입니다. 목표와 같으면 초록, 넘으면 빨강. 틀린 채로 놓으면 흔들리며 합을 보여 주고 감점은 없습니다.
- **목표 숫자**: 상단에 이번 목표와 다음 두 개가 보이고, 터질 때마다 한 칸씩 당겨집니다. 목표는 지금 보드에서 실제로 만들 수 있는 합(2~3칸짜리 영역 기준, 5~15 우선, 직전과 다른 숫자 우선)에서 뽑습니다. 숫자는 사라지기만 하므로, 터질 때마다 보이는 목표 3개를 모두 검사해 남은 숫자로 만들 수 없는 목표는 가능한 숫자로 바꾸고 "만들 수 있는 조합이 없어서 목표를 바꿨어요" 알림을 띄웁니다.
- **보드**: 1~9, 세로 10×17 = 170칸(사과게임과 같은 크기), 가로 화면(폭 ≥ 640px)은 17×10. 지운 칸은 비어 있고 채워지지 않습니다.
- **점수 = 지운 칸의 개수**. 결과 화면은 점수만 표시합니다.
- **퍼펙트**(전부 제거): 화면 전체 색종이 + PERFECT!, 이어서 새 보드. 숫자가 1개만 남으면 새 보드. 칸을 지울 때마다 작은 색종이.

## 조작

- 모바일: 손가락 드래그
- PC: 마우스 드래그, `Esc` 일시정지
