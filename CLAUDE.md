# Childhood — 작업 메모

만 1~13세 어린이용 한국어 AI 학습 도우미 (React 19 + Vite SPA, Express 서버, Anthropic SDK).
제품 이름은 **Childhood**, 도우미 이름은 **별이**.

## 배포 (Render)

- **접속 주소: `https://banjjaktalk.onrender.com`** — 서비스를 만들 때 정해졌고 바꿀 수 없다.
- 사용자 확인(2026-10-22): 이 주소를 쓰는 서비스는 Render 대시보드 목록에서 **`childhood`**라는 이름으로 보인다.
  서비스 이름은 바꿀 수 있어도 주소는 그대로이므로 **이름이 아니라 주소로 서비스를 구별한다.**
- 대시보드에 서비스가 **하나 더** 있다(이름·주소 미확인). 2026-08-19 커밋 `baa7bdb`가 `render.yaml`의
  서비스 이름을 `Childhood`로 바꿨을 때 Blueprint가 새 서비스를 만든 것으로 **추정**한다. 확인되면
  **삭제하지 말고 일시 중지(Suspend)** 한다. 삭제하면 되돌릴 수 없다.
- `render.yaml`의 `name`은 `banjjaktalk`이고, 대시보드의 실제 이름(`childhood`)과 **다르다.** Blueprint가
  연결돼 있는지 확인되지 않아서 아직 바꾸지 않았다. 연결돼 있다면 이름이 다를 때 동기화 때 서비스가 또
  생길 수 있다. **바꾸기 전에 사용자에게 Blueprint 연결 여부와 두 서비스의 이름·주소를 확인한다.**
- `main`에 푸시하면 자동 배포된다. 무료 플랜이라 15분간 접속이 없으면 꺼지고 첫 응답이 느리다(10~20초 이상).
- 필수 환경변수 `ANTHROPIC_API_KEY`는 Render 대시보드에서만 입력한다(`sync: false`). **키 값은 대화나 저장소에
  절대 적지 않는다.** 2026-10-15 확인 결과 서버의 키가 인증 오류(401)였고, 사용자가 교체하기로 했다.
- 선택 환경변수: `FEEDBACK_URL`(부모 화면 의견 링크), `RL_GLOBAL_PER_DAY`(테스트 기간에는 300 정도 권장),
  `RL_TZ`, `STT_API_KEY`, `IMAGE_API_KEY`. 자세한 설명은 `render.yaml` 주석.

### 배포 확인 방법

- `GET /api/health` → `{ ok, chat, lastError }`. `chat`은 키가 설정됐는지, `lastError`는 마지막 상류 오류의
  분류(`auth`=키 잘못됨, `bad_request`=결제/요청, `model_not_found`, `rate_limit`, `overloaded`)만 보여 준다.
- 채팅이 "별이가 잠깐 딴생각을 했나 봐…"만 돌려주면 서버의 Anthropic 호출이 실패한 것이다. `/api/health`의
  `lastError`로 원인을 가린다.
- 로컬과 같은 빌드인지는 `index.html`의 `assets/index-*.js` 해시를 비교한다.

## 이 환경(클라우드 세션)의 제약

- 클라우드 컨테이너이며 **사용자 컴퓨터의 브라우저·로그인 상태에 접근할 수 없다.** 계정 로그인이 필요한 일
  (Render 환경변수, Anthropic 키)은 사용자가 직접 한다. 비밀번호·키를 받지 않는다.
- 네트워크는 환경 설정의 허용 목록만 나간다. `banjjaktalk.onrender.com`은 허용돼 있다. 다른 서비스 주소가
  필요하면 사용자가 환경의 Allowed domains(Network access = Custom)에 추가해야 하며, 반영에는 약 1분이 걸린다.
- 브라우저로 배포 사이트를 확인할 때는 인증서 검증을 끄지 않는다. 프록시 CA 하나만 공개키 해시로 신뢰시킨다
  (`--ignore-certificate-errors-spki-list`, 값은 `/root/.ccr/agent-proxy-ca.crt`에서 계산).

## 작업 방식 (사용자 지시)

- **작업이 끝나면 묻지 않고 `main`에 병합한다.** 병합 전에 `npm test`와 `npm run test:ui`가 모두 통과하고
  `npm audit --omit=dev --audit-level=high`가 깨끗해야 한다. 실패하거나 `main`과 갈라져 강제 푸시가
  필요하면 병합하지 않고 알린다. 빨리감기(fast-forward)로만 병합한다.
- 개발 브랜치는 `claude/ai-chat-kids-service-seznwa`.
- 새 테스트는 **수정을 되돌렸을 때 실제로 실패하는지**(변이 검증) 확인한다. 화면 테스트는 동시에 여러 개
  돌려도 통과해야 한다(불안정 방지).
- 사용자가 정해야 할 항목(홍보 문구 삭제 등)은 임의로 지우지 않고 묻는다.
- 저장 키 `banjjaktalk_v2`(localStorage)는 **절대 바꾸지 않는다.** 바꾸면 기존 사용자의 데이터가 사라진다.
- 응답은 한국어, 한 줄 요약 → 근거 → 남은 일 순서로 짧게.

## 화면 스타일

홈·채팅(Figma 시안)과 같은 디자인 언어를 쓴다: 라벤더 배경(`#FFFDEF → #F7EFFF`), 흰 카드 + 연보라 테두리
(`#EDE6F5`), 보라 포인트 `#7C59BA`, 주황 별 알약 `#DB6A00`. 화면별로 `px` / `fx` / `cx` / `mx` 같은 클래스로
범위를 한정해 덮어쓰며, 코랄 토큰(`--accent`)은 그 안에서만 보라로 바꾼다. 미션·콜렉션·부모·가입 등은 시안이
없어 직접 맞춘 것이므로 시안이 오면 시안 기준으로 다시 맞춘다.

## 열려 있는 일 (사용자 결정/자료 필요)

1. Render `ANTHROPIC_API_KEY` 교체 후 채팅 재확인, 중복 서비스 정리(Suspend).
2. 홍보 문구: "AI 안전 검증 2026" 배지, "4.8 평점", "주 100분 / 50장", "부모가 그림·음성 기록 확인"은
   근거가 없거나 기능이 없다. 실제 서비스 전에 삭제할지 결정이 필요하다(테스트 기간에도 부모에게 보인다).
3. `FEEDBACK_URL` 설정, 테스트 기간 안전장치(`RL_GLOBAL_PER_DAY`, Anthropic 월 한도).
4. 계정 도입 여부(기기 변경 시 데이터 유실, PIN 재설정 한계가 함께 해결됨) — 3개월 테스트 중에 결정.
5. 개인정보: 만 14세 미만 보호자 동의와 처리방침 확인(법률 전문가 확인 권장).
6. 임시 이미지 8장(`public/img/act-*.png`, `README.md` 참고) 교체, 도메인 구매 후 `index.html`의 `og:url` /
   `og:image` 교체, 설정의 AI 목소리 이름 "반짝이"를 "별이"와 맞출지 결정.
7. 정식 서비스 전 호스팅 재검토(후보: Google Cloud Run — 서울 리전 무료 한도와 시작 시간은 직접 확인 필요).
