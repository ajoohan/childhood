# ⭐ Childhood — 아이들을 위한 AI 학습 도우미

1~13세 어린이를 위한 안전한 AI 도우미입니다. AI 도우미 **"별이"** 와 함께
동화·그림·한글·과학 탐구 같은 **정해진 활동 안에서만** 상호작용합니다.

개방형 컴패니언 대화가 아니라 **활동 스코프** 구조인 이유는
[CONCEPT.md](./CONCEPT.md)에 정리되어 있습니다.

## 주요 기능

- **활동 13종** — 각 활동마다 AI의 역할 범위(scope)가 고정됩니다
  - 📖 이야기: 동화 들어요 · 이야기 만들기 · 그림 놀이 · 재미있는 게임
  - ✏️ 학습: 한글 배우기 · 영어 놀이 · 궁금한 거 물어봐요 · 동식물 도감 ·
    낱말 게임 · 과학 탐구 · 숙제 도움
  - 💛 마음: 기분 이야기 · 생활습관 도우미
- **연령 모드 자동 전환** — 생년월로 나이를 계산해 영유아(1–9세)/아동(10–13세)
  모드를 자동 적용하고, 모드에 맞는 활동만 노출
- **하단 탭 5개** — 홈 · 미션 · 말하기 · 콜렉션 · 부모
- **미션과 별** — 출석·생활습관 미션을 하면 별이 쌓이고, 콜렉션 꾸미기에 사용.
  현금 결제나 상점은 없습니다
- **콜렉션** — 별로 방을 꾸미고 스티커·배지를 모읍니다
- **말하기(음성)** — 브라우저 TTS/STT로 음성 대화, 목소리 3종 선택
- **멀티 프로필** — 한 기기에서 형제·자매 프로필을 전환 (데이터 분리)
- **부모 존** — PIN 잠금 뒤 대화 기록·안전 이벤트 열람, 미션 추가,
  사용 시간 제한, 기록 삭제
- **어린이 눈높이 대화** — 쉬운 우리말, 짧은 답변 (Claude Opus 4.8)
- **실시간 스트리밍** — 답변이 타자 치듯 표시됩니다 (SSE)
- **2단계 안전장치**
  1. 빠른 안전 분류기(Claude Haiku 4.5)가 모든 메시지를 사전 검사
     (`개인정보 공유 / 유해 요청 / 위기 신호` 감지)
  2. 메인 모델의 시스템 프롬프트가 어린이 보호 원칙을 항상 적용
- **위기 대응** — 괴롭힘·마음의 어려움 등 위기 신호 감지 시 믿을 수 있는 어른과
  청소년 상담전화 **1388** 안내
- **데이터 보관** — 프로필·대화 기록·별·콜렉션은 **사용자 기기의 브라우저
  저장소(localStorage)에만** 저장되고, 서버에는 보관하지 않습니다.
  대화는 활동당 최근 40개로 제한되며, 부모 존에서 언제든 지울 수 있습니다.

## 기술 스택

- **프론트엔드**: React + Vite (SPA, `src/`)
- **백엔드**: Node.js + Express (`server.js`) — Claude 연동·안전 분류·요청 제한
- 배포 시 Express가 Vite 빌드 결과물(`dist/`)과 `/api`를 함께 서빙 (단일 서비스)

## 실행 방법

```bash
# 1. 의존성 설치
npm install

# 2. API 키 설정
cp .env.example .env
# .env 파일에 ANTHROPIC_API_KEY를 입력하세요

# 3-a. 개발 모드 (권장) — Vite 개발서버 + API 서버 동시 실행
npm run dev
# → http://localhost:5173 (자동 새로고침, /api는 3000으로 프록시)

# 3-b. 프로덕션처럼 실행 — 빌드 후 Express가 서빙
npm run build
npm start
# → http://localhost:3000
```

## 테스트

```bash
npm test        # 로직 (빠름, 브라우저 불필요)
npm run test:ui # 화면 (빌드 필요: npm run build)
npm run test:all
```

Node 내장 러너(`node --test`)를 씁니다.

**로직** — 조용히 깨지면 위험한 부분: 대화 기록 정리(첫 메시지는 user여야 API가
받는다), 프로필 프롬프트 이스케이프, 하루 사용량 카운터의 날짜 롤링,
올클리어 보너스 판정, 저장 용량 초과 폴백, 손상된 저장값 복구, 연령 모드 경계.

**화면** — 실제 브라우저(Playwright)로 빌드된 앱을 띄워 확인: 홈의 시안 요소,
탭 5개와 각 화면 전환, 채팅 진입, 깨진 이미지 없음, OG 메타,
**부모 PIN이 나갔다 오면 다시 잠기는지**, **하루 제한이 실제로 막는지**,
손상된 저장값에서도 흰 화면이 아닌지.

화면 테스트는 `devDependencies`의 Playwright를 쓰며, 배포 빌드는
`npm install --omit=dev`라 브라우저를 내려받지 않습니다.

## 외부에 공개하기 (다른 사람도 주소로 접속)

이 앱은 Claude API를 호출하는 **서버가 필요**하므로, Node 서버를 실행해 주는 호스팅에 배포해야 공개 URL이 생깁니다. (정적 사이트 호스팅은 불가)

> ⚠️ **공개 전 필독**: 공개 URL에서 오는 대화는 여러분의 API 키로 과금됩니다. 본 서버에는 기본 **요청 제한**(IP당 분당·하루, 전체 하루 한도)이 들어 있으나, 실제 공개 시 한도·비용 알림을 반드시 점검하세요. 환경변수 `RL_PER_MIN`, `RL_PER_DAY`, `RL_GLOBAL_PER_DAY`로 조절합니다.

### 방법 A — Render.com (무료, 가장 간단)

1. 이 저장소를 본인 GitHub 계정으로 fork(또는 push)
2. [render.com](https://render.com) 가입 후 **New → Blueprint** 선택
3. 저장소를 고르면 `render.yaml`대로 자동 설정됨
4. 배포 화면에서 환경변수 **`ANTHROPIC_API_KEY`** 에 실제 키 입력
5. 배포가 끝나면 `https://<서비스이름>.onrender.com` 주소가 생성됨 → 누구나 접속 가능
   (현재 배포 주소: https://banjjaktalk.onrender.com — Render는 서비스 이름을 바꿔도
   `.onrender.com` 주소가 생성 시점 그대로 유지된다. 주소를 바꾸려면 커스텀 도메인을 연결한다.)

무료 플랜은 일정 시간 미사용 시 잠들었다가 첫 요청에 몇십 초 걸릴 수 있습니다.

### 방법 B — Docker (Fly.io, Railway, 직접 서버 등)

`Dockerfile`이 포함되어 있어 컨테이너 호스팅 어디서든 실행됩니다.

```bash
docker build -t childhood .
docker run -p 3000:3000 -e ANTHROPIC_API_KEY=sk-... childhood
```

호스팅에서는 `ANTHROPIC_API_KEY` 환경변수만 설정하면 됩니다. 서버는 `PORT` 환경변수를 자동으로 따릅니다.

### 배포 체크리스트

- [ ] `ANTHROPIC_API_KEY`를 호스팅 환경변수로 설정 (코드/깃에 넣지 말 것)
- [ ] 요청 제한 한도(`RL_*`)를 예상 사용량에 맞게 조정
- [ ] Anthropic 콘솔에서 사용량·비용 한도(usage limit) 설정
- [ ] 아동 개인정보 관련 법적 검토 (아래 "운영 전 확인 사항" 참고)

## 프로젝트 구조

```
├── server.js               # Express + Claude 연동 + 안전 분류 + 활동 정의 + 요청 제한
├── index.html              # Vite 진입 HTML (OG/트위터 카드 메타 포함)
├── vite.config.js          # Vite 설정 (dev 프록시, 빌드 outDir=dist)
├── src/
│   ├── main.jsx            # React 진입점 (ErrorBoundary로 감쌈)
│   ├── App.jsx             # 상태·화면 전환·PIN 게이트·멀티 프로필·저장
│   ├── index.css           # 전체 스타일 (Figma 시안 토큰 포함)
│   ├── screens/            # Splash / Onboarding / KidsHome / Session / Speak
│   │                       # MissionBoard / CollectionHub / DecorRoom / StickerBook
│   │                       # BadgeBook / ImageMaker / ParentZone / Settings 등
│   ├── components/         # ErrorBoundary / PinGate / Confetti / SparksSheet / GateDialog
│   └── lib/                # data(활동·SVG) store(로컬 저장) missions collectibles
│                           # age greeting mascot sfx fx decor useSpeech
├── public/img/             # Figma 3D 에셋 (카드·아이콘·마스코트) + og.png
├── dist/                   # 빌드 결과물 (git 제외, 배포 시 생성)
├── Dockerfile / render.yaml
├── package.json
└── .env.example
```

## 안전 설계

| 상황 | 동작 |
|---|---|
| 개인정보 공유 시도 | 개인정보는 인터넷에서 말하지 않도록 다정하게 안내 |
| 유해·부적절 요청 | 요청을 따르지 않고 다른 주제로 부드럽게 전환 |
| 위기 신호 (자해·학대·괴롭힘) | 공감 후 믿을 수 있는 어른 + 청소년 상담전화 1388 안내 |
| 의료·법률·금전 질문 | 부모님/선생님과 함께 알아보도록 안내 |
| 숙제 대신 해달라는 요청 | 답 대신 힌트를 주어 스스로 풀도록 유도 |
| API 안전 필터 거부 응답 | 아이가 이해할 수 있는 부드러운 메시지로 대체 |

## 운영 전 확인 사항 (보호자·운영자용)

- **법적 검토**: 만 14세 미만 아동의 개인정보 처리에는 법정대리인 동의가 필요합니다
  (개인정보보호법 제22조의2). 미국 서비스 시 COPPA 준수가 필요합니다.
- **현재 서버는 대화를 저장하지 않지만**, 로그·모니터링을 추가할 경우 위 법규를
  먼저 검토하세요.
- AI의 답변은 완벽하지 않을 수 있습니다. 보호자의 관심과 함께 사용을 권장합니다.

## 향후 개선 아이디어

- 미션·콜렉션 화면의 Figma 시안 적용 (홈·채팅은 적용 완료)
- 남은 활동의 카드 이미지 추가 (현재 13종 중 5종만 실사 이미지)
- 커스텀 도메인 연결 — 연결 시 `index.html`의 `og:url`·`og:image`도 함께 수정
