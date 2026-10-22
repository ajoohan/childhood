# Childhood — 작업 메모

만 1~13세 어린이용 한국어 AI 학습 도우미 (React 19 + Vite SPA, Express 서버, Anthropic SDK).
제품 이름은 **Childhood**, 도우미 이름은 **별이**.

## 배포 (Render)

- **접속 주소: `https://banjjaktalk.onrender.com`** — 서비스를 만들 때 정해졌고 바꿀 수 없다.
- 사용자 확인(2026-10-22): 이 주소를 쓰는 서비스는 Render 대시보드 목록에서 **`childhood`**라는 이름으로 보인다.
  서비스 이름은 바꿀 수 있어도 주소는 그대로이므로 **이름이 아니라 주소로 서비스를 구별한다.**
- 대시보드에는 서비스가 두 개 있었다: `childhood`와 `banjjaktalk`. 2026-08-19 커밋 `baa7bdb`가 `render.yaml`의
  서비스 이름을 `Childhood`로 바꾼 것이 중복의 원인으로 **추정**된다. **2026-10-22 사용자가 `banjjaktalk` 서비스를
  일시 중지(Suspend)했고 `childhood`를 남겼다.** 중지 뒤에도 `https://banjjaktalk.onrender.com`이 정상 응답하고
  채팅이 되는 것을 확인했으므로, 이 주소는 `childhood` 서비스의 것이다. 중지한 서비스는 삭제하지 않는다.
- **Blueprint "Childhood AI"(사용자 확인, 2026-10-22):** 저장소 `ajoohan/childhood`, 추적 브랜치는 `main`이 아니라
  개발 브랜치 `claude/ai-chat-kids-service-seznwa`, 상태 Synced. **관리하는 서비스는 중지된 `banjjaktalk` 하나뿐**이다.
  살아 있는 `childhood`는 Blueprint 관리 밖이라 **`render.yaml`의 값은 `childhood`에 적용되지 않는다.** 라이브 설정
  (환경변수 `RL_GLOBAL_PER_DAY` 등, 브랜치, 자동 배포)은 대시보드의 `childhood` 서비스에서 직접 바꾼다.
  동기화가 중지된 서비스를 다시 켜지 않는 것도 확인됐다(푸시 뒤에도 Suspended 유지).
- **`render.yaml`의 `name`은 `banjjaktalk`로 둔다.** Blueprint가 그 이름의 서비스를 관리하므로, 이름을 바꾸면 동기화
  때 서비스가 또 새로 생긴다(과거 중복의 원인). 살아 있는 서비스 이름(`childhood`)과 다른 것은 알려진 상태이며 문제가
  아니다. 사용자에게 "Manual sync", Blueprint 삭제, 서비스 삭제를 하지 말라고 안내했다. 테스트 기간 동안 이 구성을
  그대로 두고, 정식 서비스(호스팅 이전) 때 정리한다.
- 개발 브랜치를 삭제하면 Blueprint 추적이 끊긴다. 브랜치를 정리하기 전에 Blueprint의 추적 브랜치를 `main`으로 바꾼다.
- `main`에 푸시하면 자동 배포된다. 무료 플랜이라 15분간 접속이 없으면 꺼지고 첫 응답이 느리다(10~20초 이상).
- 필수 환경변수 `ANTHROPIC_API_KEY`는 Render 대시보드에서만 입력한다(`sync: false`). **키 값은 대화나 저장소에
  절대 적지 않는다.** 2026-10-15에는 서버의 키가 인증 오류(401)였고, 2026-10-22에 사용자가 새 키로 교체해
  채팅과 안전 분류(위기 신호 `distress`, 개인정보 `personal_info`)가 정상으로 확인됐다. 환경변수를 바꾼 뒤에는
  서버가 실제로 다시 시작돼야 반영되므로(저장만 하면 옛 값이 계속 돈다) `/api/health`의 `startedAt`으로 확인한다.
- 선택 환경변수: `FEEDBACK_URL`(부모 화면 의견 링크), `RL_GLOBAL_PER_DAY`(테스트 기간 값 300, 아래 "비용" 참고),
  `RL_TZ`, `STT_API_KEY`, `IMAGE_API_KEY`. 자세한 설명은 `render.yaml` 주석.

### 비용 (테스트 기간)

- 사용자 결정(2026-10-22): **Anthropic 콘솔 월 사용 한도 $10**, `RL_GLOBAL_PER_DAY`는 300 정도. 월 한도는 사용자가
  콘솔에서 직접 설정한다(이 환경에서는 할 수 없다). Render의 `RL_GLOBAL_PER_DAY`도 대시보드 환경변수에서 직접 바꿔야
  반영된다(`render.yaml`의 값은 Blueprint 동기화 때만 적용).
- **적용 상태(사용자 보고, 2026-10-22):** Anthropic 월 한도 설정 완료. Render `childhood`의 `RL_GLOBAL_PER_DAY=300`을
  저장·배포했고(한국 시간 14:46 = UTC 05:46), 서버 시작 시각 `05:46:02`와 일치해 반영된 것으로 본다. 값 자체는
  `/api/health`로 볼 수 없다.
- 채팅 모델은 `claude-opus-4-8`($5/$25 per MTok), 안전 분류는 `claude-haiku-4-5`. 메시지 1건에 입력 약 3~4K
  토큰으로 보면 **대략 $0.02(추정, 실측 아님)** → $10 ≈ 약 500건/월. 300건/일이면 하루 약 $6이라 월 한도가
  실제 안전장치이고 `RL_GLOBAL_PER_DAY`는 폭주를 막는 천장이다. 실제 사용량은 콘솔 Usage에서 며칠 지켜보고 다시
  계산한다. 모델을 낮추는 것(Sonnet 5.5 등)은 품질·사고(thinking) 설정이 달라 사용자 결정이 필요하다.

### 배포 확인 방법

- `GET /api/health` → `{ ok, chat, startedAt, lastError }`. `startedAt`은 서버 프로세스 시작 시각. `chat`은 키가 설정됐는지, `lastError`는 마지막 상류 오류의
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

1. (정식 서비스 전) Blueprint와 중지된 `banjjaktalk` 정리. 지금은 그대로 둔다. 개발 브랜치를 지우기 전에 Blueprint 추적 브랜치를 `main`으로 바꾼다.
2. 홍보 문구(2026-10-22 사용자 승인으로 정리 완료): 안전 검증 배지, 4.8 평점과 꾸며낸 후기, "주 100분 / 50장",
   "무제한 질문", 음성·그림 기록 열람 약속을 삭제하거나 실제 기능("부모 화면에서 사용 현황과 안전 알림을 확인해요",
   "AI가 활동 범위 안에서만 안전하게 도와줘요")에 맞게 바꿨다. `tests/claims.test.js`와 화면 테스트가 재유입을 막는다.
   새 문구를 쓸 때는 앱에 실제로 있는 기능만 약속한다. **구독 안내 화면(2026-10-22 사용자 결정 "가"):** 결제가
   구현돼 있지 않아 가입 흐름에서 **건너뛴다**(`src/screens/Onboarding.jsx`의 `SHOW_PAYWALL = false`, 가입이 끝나면
   `plan: "free"`로 홈으로 간다). 화면과 부모 확인 절차는 코드에 남아 있어 결제를 붙일 때 `true`로 되돌리면 살아난다.
   이미지 만들기는 서버 키가 없어 "준비 중".
3. `FEEDBACK_URL` 설정, 테스트 기간 안전장치(`RL_GLOBAL_PER_DAY`, Anthropic 월 한도).
4. 계정 도입 여부(기기 변경 시 데이터 유실, PIN 재설정 한계가 함께 해결됨) — 3개월 테스트 중에 결정.
   **사용자 방침(2026-10-22): 계정과 개인정보 처리는 성인인 부모를 대상으로 한다.** 즉 가입·동의의 주체가 부모이고
   아이는 부모 계정 아래 프로필로 둔다. 구현 전에 정할 것: 로그인 방식(부모 이메일 링크 등), 저장소(서버 DB),
   부모의 약관·개인정보 동의 화면과 기록, 아이 데이터(이름·나이·대화)의 보관·삭제, Anthropic API로 전달되는 대화의
   국외 이전 고지. 법률 검토는 전문가 확인을 권한다.
   설계 제안서: `docs/parent-accounts.md`(추천안·데이터 모델·단계·사용자가 정할 것). 구현은 사용자가 시작을 알린 뒤에 한다.
5. 개인정보 처리방침·동의 문구 작성(위 4번의 부모 동의 흐름과 함께).
6. 임시 이미지 8장(`public/img/act-*.png`, `README.md` 참고) 교체, 도메인 구매 후 `index.html`의 `og:url` /
   `og:image` 교체. (설정의 AI 목소리 이름은 2026-10-22에 "반짝이" → "별이"로 바꿨다.)
7. 정식 서비스 전 호스팅 재검토(후보: Google Cloud Run — 서울 리전 무료 한도와 시작 시간은 직접 확인 필요).
