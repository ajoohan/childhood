
// 햇살 가득한 수채화풍 야외 배경 (히어로 배너 공통)
export const HERO_SCENE = `<svg class="scene-svg" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#AFE0FF"/><stop offset="0.75" stop-color="#EAF7EE"/></linearGradient>
    <linearGradient id="grassG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#CDEA92"/><stop offset="1" stop-color="#8FC94F"/></linearGradient>
    <filter id="wc" x="-15%" y="-15%" width="130%" height="130%">
      <feTurbulence type="fractalNoise" baseFrequency="0.012 0.022" numOctaves="3" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G"/>
      <feGaussianBlur stdDeviation="0.5"/>
    </filter>
    <filter id="soft"><feGaussianBlur stdDeviation="1.4"/></filter>
  </defs>
  <rect width="400" height="250" fill="url(#sky)"/>
  <g filter="url(#wc)">
    <circle cx="336" cy="50" r="50" fill="#FFE08A" opacity="0.35"/>
    <circle cx="336" cy="50" r="33" fill="#FFE49A"/>
    <ellipse cx="92" cy="58" rx="36" ry="15" fill="#ffffff" opacity="0.8"/>
    <ellipse cx="124" cy="50" rx="27" ry="12" fill="#ffffff" opacity="0.8"/>
    <path d="M0 170 Q110 136 210 168 T400 162 L400 250 L0 250 Z" fill="#B9E084" opacity="0.9"/>
    <path d="M0 198 Q130 172 250 198 T400 192 L400 250 L0 250 Z" fill="url(#grassG)"/>
    <rect x="56" y="174" width="8" height="24" rx="3" fill="#9c7a4a"/>
    <circle cx="60" cy="164" r="25" fill="#7FBE49"/>
    <circle cx="47" cy="171" r="15" fill="#8FCB58"/>
    <circle cx="74" cy="171" r="15" fill="#8FCB58"/>
  </g>
  <g filter="url(#soft)" opacity="0.5">
    <ellipse cx="150" cy="215" rx="70" ry="14" fill="#7CB945"/>
    <ellipse cx="300" cy="225" rx="90" ry="16" fill="#84C24C"/>
  </g>
</svg>`;

export const SAFETY_LABEL = {
  personal_info: {
    icon: "🔒",
    name: "개인정보 공유 시도",
    cls: "warn",
    tip: "아이와 함께 개인정보(주소·학교·전화번호 등)를 인터넷에서 말하지 않기로 이야기해 보세요.",
  },
  harmful_request: {
    icon: "🚫",
    name: "부적절한 요청",
    cls: "warn",
    tip: "아이가 어떤 맥락에서 물었는지 부드럽게 대화해 보세요.",
  },
  distress: {
    icon: "❤️",
    name: "마음 신호 감지",
    cls: "danger",
    tip: "아이의 마음을 살펴봐 주세요. 필요하면 청소년 상담전화 1388에 도움을 청할 수 있어요.",
  },
};

// AI 도우미 "별이" — 친근한 로봇 마스코트 (AI를 '도우미 도구'로 프레이밍)
export const HELPER = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="별이">
  <defs><linearGradient id="ga-robot" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#8AD8F7"/><stop offset="1" stop-color="#3EA9E0"/></linearGradient></defs>
  <line x1="50" y1="22" x2="50" y2="11" stroke="#2E90C8" stroke-width="3"/>
  <circle cx="50" cy="8" r="4.2" fill="#FFCE4A"/>
  <rect x="15" y="45" width="8" height="16" rx="4" fill="#3EA9E0"/>
  <rect x="77" y="45" width="8" height="16" rx="4" fill="#3EA9E0"/>
  <rect x="34" y="79" width="32" height="17" rx="9" fill="url(#ga-robot)"/>
  <rect x="22" y="24" width="56" height="52" rx="18" fill="url(#ga-robot)" stroke="#2E90C8" stroke-width="2"/>
  <rect x="30" y="34" width="40" height="30" rx="12" fill="#EAF7FF"/>
  <circle cx="42" cy="47" r="5" fill="#2b3a44"/><circle cx="43.6" cy="45.4" r="1.7" fill="#fff"/>
  <circle cx="58" cy="47" r="5" fill="#2b3a44"/><circle cx="59.6" cy="45.4" r="1.7" fill="#fff"/>
  <circle cx="34" cy="55" r="3.2" fill="#FF9E9E" opacity="0.75"/>
  <circle cx="66" cy="55" r="3.2" fill="#FF9E9E" opacity="0.75"/>
  <path d="M44 56 Q50 61 56 56" fill="none" stroke="#2b3a44" stroke-width="2.6" stroke-linecap="round"/>
</svg>`;

// 스플래시용 전신 로봇 마스코트 "별이" — 책 + 붓을 든 모습, 노란 구름 위 (오리지널)
export const SPLASH_ROBOT = `<svg viewBox="0 0 260 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="AI 학습 도우미 별이" class="splash-robot-svg">
  <defs>
    <linearGradient id="rb" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7FCDF2"/><stop offset="1" stop-color="#3EA9E0"/></linearGradient>
    <linearGradient id="rbBody" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#68C2EF"/><stop offset="1" stop-color="#3196CF"/></linearGradient>
  </defs>

  <!-- 노란 구름 받침 -->
  <g fill="#FFC93C">
    <ellipse cx="92" cy="296" rx="44" ry="24" opacity="0.95"/>
    <ellipse cx="150" cy="302" rx="54" ry="22" opacity="0.95"/>
    <ellipse cx="186" cy="290" rx="38" ry="21" opacity="0.95"/>
    <ellipse cx="120" cy="282" rx="36" ry="21" opacity="0.95"/>
  </g>
  <ellipse cx="140" cy="306" rx="78" ry="9" fill="#E7A82F" opacity="0.35"/>

  <!-- 다리 -->
  <rect x="100" y="244" width="18" height="42" rx="9" fill="url(#rbBody)"/>
  <rect x="142" y="244" width="18" height="42" rx="9" fill="url(#rbBody)"/>
  <rect x="100" y="260" width="18" height="8" rx="4" fill="#F58A3C"/>
  <rect x="142" y="260" width="18" height="8" rx="4" fill="#F58A3C"/>
  <ellipse cx="105" cy="288" rx="17" ry="9" fill="#2E90C8"/>
  <ellipse cx="155" cy="288" rx="17" ry="9" fill="#2E90C8"/>

  <!-- 몸통 -->
  <rect x="120" y="146" width="20" height="12" fill="#2E90C8"/>
  <rect x="84" y="152" width="92" height="94" rx="26" fill="url(#rbBody)" stroke="#2E90C8" stroke-width="2.5"/>
  <rect x="112" y="150" width="36" height="9" rx="4.5" fill="#F58A3C"/>
  <rect x="112" y="182" width="40" height="40" rx="9" fill="#2E90C8"/>
  <g fill="#8AD8F7">
    <circle cx="121" cy="192" r="2"/><circle cx="132" cy="192" r="2"/><circle cx="143" cy="192" r="2"/>
    <circle cx="121" cy="202" r="2"/><circle cx="132" cy="202" r="2"/><circle cx="143" cy="202" r="2"/>
    <circle cx="121" cy="212" r="2"/><circle cx="132" cy="212" r="2"/><circle cx="143" cy="212" r="2"/>
  </g>

  <!-- 왼팔 + 펼친 책 -->
  <circle cx="90" cy="172" r="10" fill="#F58A3C"/>
  <path d="M92 176 Q70 196 82 216" fill="none" stroke="#4FB3E0" stroke-width="14" stroke-linecap="round"/>
  <path d="M100 208 L56 219 L56 254 L100 250 Z" fill="#F07C2E"/>
  <path d="M100 208 L144 219 L144 254 L100 250 Z" fill="#E86E22"/>
  <path d="M100 204 L60 214 L60 249 L100 246 Z" fill="#FFB37A" stroke="#E0913F" stroke-width="1.5"/>
  <path d="M100 204 L140 214 L140 249 L100 246 Z" fill="#FFCE9E" stroke="#E0913F" stroke-width="1.5"/>
  <g stroke="#E7A56A" stroke-width="1.4" stroke-linecap="round">
    <path d="M70 220 L94 216"/><path d="M70 228 L94 224"/><path d="M70 236 L94 232"/>
    <path d="M106 216 L130 220"/><path d="M106 224 L130 228"/><path d="M106 232 L130 236"/>
  </g>
  <circle cx="84" cy="216" r="9" fill="#3EA9E0"/>

  <!-- 안테나 -->
  <line x1="130" y1="60" x2="130" y2="40" stroke="#2E90C8" stroke-width="3.5"/>
  <circle cx="130" cy="34" r="6.5" fill="#FFC93C"/>

  <!-- 귀 -->
  <circle cx="74" cy="104" r="15" fill="#F58A3C"/><circle cx="74" cy="104" r="8" fill="#D96E24"/>
  <circle cx="186" cy="104" r="15" fill="#F58A3C"/><circle cx="186" cy="104" r="8" fill="#D96E24"/>

  <!-- 머리 -->
  <rect x="78" y="58" width="104" height="92" rx="28" fill="url(#rb)" stroke="#2E90C8" stroke-width="2.5"/>
  <rect x="92" y="74" width="76" height="60" rx="22" fill="#EAF7FF"/>
  <path d="M103 92 Q112 85 121 92" fill="none" stroke="#F58A3C" stroke-width="4" stroke-linecap="round"/>
  <path d="M139 92 Q148 85 157 92" fill="none" stroke="#F58A3C" stroke-width="4" stroke-linecap="round"/>
  <circle cx="112" cy="107" r="11" fill="#26323a"/><circle cx="115.5" cy="103" r="3.6" fill="#fff"/><circle cx="109" cy="110" r="1.7" fill="#fff" opacity="0.8"/>
  <circle cx="148" cy="107" r="11" fill="#26323a"/><circle cx="151.5" cy="103" r="3.6" fill="#fff"/><circle cx="145" cy="110" r="1.7" fill="#fff" opacity="0.8"/>
  <circle cx="130" cy="116" r="3" fill="#2E90C8"/>
  <path d="M120 122 Q130 134 140 122 Q130 128 120 122 Z" fill="#B34A3A"/>

  <!-- 오른팔 + 붓 -->
  <circle cx="170" cy="168" r="10" fill="#F58A3C"/>
  <path d="M170 170 Q200 158 208 132" fill="none" stroke="#4FB3E0" stroke-width="14" stroke-linecap="round"/>
  <circle cx="208" cy="130" r="9" fill="#3EA9E0"/>
  <line x1="208" y1="130" x2="226" y2="90" stroke="#C98A52" stroke-width="8" stroke-linecap="round"/>
  <line x1="217" y1="106" x2="225" y2="102" stroke="#B8BFC6" stroke-width="9" stroke-linecap="round"/>
  <path d="M226 90 l-8 -15 l14 5 z" fill="#E85A4A"/>
  <g fill="#ffffff" opacity="0.92">
    <ellipse cx="238" cy="74" rx="16" ry="11"/><ellipse cx="224" cy="70" rx="11" ry="8"/><ellipse cx="250" cy="80" rx="10" ry="8"/>
  </g>
</svg>`;

// 로봇 얼굴(머리) — 로딩·페이월 배너용 (오리지널)
export const ROBOT_HEAD = `<svg viewBox="0 0 140 130" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="별이" class="robot-head-svg">
  <defs><linearGradient id="rh" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#7FCDF2"/><stop offset="1" stop-color="#3EA9E0"/></linearGradient></defs>
  <line x1="70" y1="34" x2="70" y2="16" stroke="#2E90C8" stroke-width="4"/>
  <circle cx="70" cy="11" r="7" fill="#FFC93C"/>
  <circle cx="30" cy="78" r="16" fill="#F58A3C"/><circle cx="30" cy="78" r="8" fill="#D96E24"/>
  <circle cx="110" cy="78" r="16" fill="#F58A3C"/><circle cx="110" cy="78" r="8" fill="#D96E24"/>
  <rect x="24" y="32" width="92" height="92" rx="30" fill="url(#rh)" stroke="#2E90C8" stroke-width="3"/>
  <rect x="40" y="50" width="60" height="52" rx="20" fill="#EAF7FF"/>
  <path d="M50 66 Q59 58 68 66" fill="none" stroke="#F58A3C" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M72 66 Q81 58 90 66" fill="none" stroke="#F58A3C" stroke-width="4.5" stroke-linecap="round"/>
  <circle cx="55" cy="82" r="10" fill="#26323a"/><circle cx="58.5" cy="78" r="3.4" fill="#fff"/>
  <circle cx="85" cy="82" r="10" fill="#26323a"/><circle cx="88.5" cy="78" r="3.4" fill="#fff"/>
  <circle cx="70" cy="90" r="2.6" fill="#2E90C8"/>
  <path d="M61 96 Q70 106 79 96 Q70 101 61 96 Z" fill="#B34A3A"/>
</svg>`;

// 온보딩 관심사 (아이콘 다중선택)
// 프로필 아바타 후보 — 실제 사진 대신 캐릭터(아동 개인정보 보호)
export const AVATARS = ["🦁", "🐰", "🦊", "🐻", "🐼", "🦄", "🐯", "🐸", "🐥", "🐬", "🦖", "🚀"];

export const INTERESTS = [
  { id: "science", label: "과학", emoji: "🔬" },
  { id: "animals", label: "동물", emoji: "🦁" },
  { id: "space", label: "우주", emoji: "🚀" },
  { id: "reading", label: "읽기", emoji: "📚" },
  { id: "art", label: "그림", emoji: "🎨" },
  { id: "math", label: "수학", emoji: "🧮" },
  { id: "music", label: "음악", emoji: "🎵" },
  { id: "dino", label: "공룡", emoji: "🦕" },
  { id: "sports", label: "운동", emoji: "⚽" },
  { id: "body", label: "우리 몸", emoji: "🩺" },
];

// 관심사(id) → 어울리는 활동(id) 매핑. 관심사 기반 홈 추천에 사용.
export const INTEREST_ACT = {
  science: ["learn_science", "learn_ask"],
  animals: ["story_make", "learn_science"],
  space: ["learn_science", "learn_ask"],
  reading: ["story_listen", "story_make"],
  art: ["draw_idea", "story_make"],
  math: ["learn_homework", "learn_ask"],
  music: ["story_make", "draw_idea"],
  dino: ["learn_science", "story_make"],
  sports: ["habit_routine", "feel_talk"],
  body: ["learn_science", "habit_routine"],
};

// 아이의 관심사에 맞는 활동을 점수순으로 추천 (연령 모드로 필터, 최대 max개)
export function recommendActivities(interestIds, activities, ageMode, max = 4) {
  if (!interestIds || !interestIds.length) return [];
  const score = {};
  for (const id of interestIds) {
    (INTEREST_ACT[id] || []).forEach((actId, i) => {
      score[actId] = (score[actId] || 0) + (2 - i); // 첫 번째 매핑에 가중치
    });
  }
  return activities
    .filter((a) => score[a.id] && (a.ages || []).includes(ageMode))
    .sort((x, y) => score[y.id] - score[x.id])
    .slice(0, max);
}

// 관심사 id → 이모지 (홈 개인화 강조용)
export function interestEmojis(interestIds) {
  return (interestIds || [])
    .map((id) => INTERESTS.find((x) => x.id === id)?.emoji)
    .filter(Boolean);
}

// 스플래시용 안전 인증 배지 — 상표 무관 오리지널 (교육 앱스토어 배지 아님)
export const SAFETY_BADGE = `<svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="AI 안전 검증 2026" class="badge-svg">
  <defs><linearGradient id="shield" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#3FC7C4"/><stop offset="1" stop-color="#1FA6A3"/></linearGradient></defs>
  <path d="M60 6 L108 22 V64 Q108 104 60 130 Q12 104 12 64 V22 Z" fill="url(#shield)" stroke="#fff" stroke-width="4"/>
  <path d="M42 60 l12 12 l24 -26" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="60" y="34" text-anchor="middle" fill="#fff" font-size="13" font-weight="800" font-family="sans-serif">AI 안전</text>
  <path d="M6 78 H114 L104 96 H16 Z" fill="#F5883C" stroke="#fff" stroke-width="3"/>
  <text x="60" y="92" text-anchor="middle" fill="#fff" font-size="12" font-weight="800" font-family="sans-serif" letter-spacing="1">안심 검증</text>
  <text x="60" y="120" text-anchor="middle" fill="#fff" font-size="15" font-weight="800" font-family="sans-serif" letter-spacing="1">2026</text>
</svg>`;

// 스플래시 장식 — 하트 + 물감 방울
export const SPLASH_DECO = `<svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="deco-svg">
  <path d="M78 30 C78 20 92 20 92 32 C92 20 106 20 106 30 C106 42 92 52 92 52 C92 52 78 42 78 30 Z" fill="#FF5A5A"/>
  <path d="M60 12 C60 5 70 5 70 14 C70 5 80 5 80 12 C80 21 70 28 70 28 C70 28 60 21 60 12 Z" fill="#FF8A8A"/>
  <path d="M50 40 q6 -14 12 0 q-6 10 -12 0 z" fill="#F5883C"/>
  <path d="M96 62 q5 -12 10 0 q-5 9 -10 0 z" fill="#F5A83C"/>
  <circle cx="112" cy="46" r="5" fill="#9AD8D6"/>
  <circle cx="44" cy="20" r="4" fill="#FFC93C"/>
</svg>`;

// 밝은 게임풍 하늘 배경 (구름 + 초록 언덕) — 자체 완결형 SVG
export const KIDS_SKY = `<svg class="sky-svg" viewBox="0 0 400 700" preserveAspectRatio="xMidYMin slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs><linearGradient id="ksky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#8FD3FF"/><stop offset="0.55" stop-color="#BDE7FF"/><stop offset="1" stop-color="#E8F7FF"/></linearGradient></defs>
  <rect width="400" height="700" fill="url(#ksky)"/>
  <g fill="#ffffff">
    <ellipse cx="70" cy="70" rx="42" ry="20" opacity="0.92"/><ellipse cx="110" cy="60" rx="30" ry="15" opacity="0.92"/>
    <ellipse cx="320" cy="120" rx="46" ry="21" opacity="0.9"/><ellipse cx="360" cy="110" rx="30" ry="15" opacity="0.9"/>
    <ellipse cx="200" cy="200" rx="34" ry="16" opacity="0.8"/>
  </g>
  <g fill="#7FC24A">
    <ellipse cx="40" cy="690" rx="120" ry="70"/><ellipse cx="220" cy="700" rx="150" ry="66"/><ellipse cx="380" cy="690" rx="120" ry="72"/>
  </g>
</svg>`;
