// 캐릭터별 인라인 SVG 일러스트 (오리지널 캐릭터, 자체 완결형)
// 동네 놀이터 네 친구 — 콩이 / 만두 / 하늘 / 초코
export const AVATARS = {
  kongi: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="콩이">
    <defs><linearGradient id="ga-kongi" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFD8A6"/><stop offset="1" stop-color="#FF9E3D"/></linearGradient></defs>
    <path d="M18 100 Q18 76 50 76 Q82 76 82 100 Z" fill="url(#ga-kongi)"/>
    <circle cx="50" cy="46" r="30" fill="#FDD9B5"/>
    <path d="M21 44 Q22 17 50 17 Q78 17 79 44 Q70 31 50 31 Q30 31 21 44 Z" fill="#7A5230"/>
    <path d="M49 18 q2 -11 9 -7 q-3 5 -4 9 z" fill="#7A5230"/>
    <circle cx="34" cy="53" r="4.2" fill="#FF9EB0" opacity="0.6"/>
    <circle cx="66" cy="53" r="4.2" fill="#FF9EB0" opacity="0.6"/>
    <circle cx="40" cy="45" r="3.6" fill="#3a2a1a"/>
    <circle cx="60" cy="45" r="3.6" fill="#3a2a1a"/>
    <path d="M38 55 Q50 69 62 55 Q50 61 38 55 Z" fill="#B34A3A"/>
  </svg>`,

  mandu: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="만두">
    <defs><linearGradient id="ga-mandu" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#E4F2AE"/><stop offset="1" stop-color="#A6D65A"/></linearGradient></defs>
    <path d="M16 100 Q16 76 50 76 Q84 76 84 100 Z" fill="url(#ga-mandu)"/>
    <circle cx="50" cy="47" r="31" fill="#FDD9B5"/>
    <path d="M25 44 Q28 18 50 18 Q72 18 75 44 Q64 30 50 30 Q36 30 25 44 Z" fill="#5C4326"/>
    <path d="M50 19 q1 -8 6 -6 q-2 4 -2 8 z" fill="#5C4326"/>
    <path d="M35 47 Q40 42 45 47" fill="none" stroke="#3a2a1a" stroke-width="3" stroke-linecap="round"/>
    <path d="M55 47 Q60 42 65 47" fill="none" stroke="#3a2a1a" stroke-width="3" stroke-linecap="round"/>
    <circle cx="32" cy="55" r="5" fill="#FF9EB0" opacity="0.55"/>
    <circle cx="68" cy="55" r="5" fill="#FF9EB0" opacity="0.55"/>
    <path d="M44 58 Q50 63 56 58" fill="none" stroke="#8a3b2e" stroke-width="3" stroke-linecap="round"/>
  </svg>`,

  haneul: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="하늘">
    <defs><linearGradient id="ga-haneul" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#BFE3FF"/><stop offset="1" stop-color="#6FB4F0"/></linearGradient></defs>
    <path d="M18 100 Q18 76 50 76 Q82 76 82 100 Z" fill="url(#ga-haneul)"/>
    <circle cx="50" cy="46" r="30" fill="#FDD9B5"/>
    <path d="M21 42 Q21 17 50 17 Q79 17 79 42 Q77 29 55 28 L52 41 Q40 29 21 42 Z" fill="#3E2C1A"/>
    <circle cx="40" cy="45" r="4" fill="#2a2417"/><circle cx="41.5" cy="43.4" r="1.3" fill="#fff"/>
    <circle cx="60" cy="45" r="4" fill="#2a2417"/><circle cx="61.5" cy="43.4" r="1.3" fill="#fff"/>
    <circle cx="34" cy="53" r="3.6" fill="#FF9EB0" opacity="0.5"/>
    <circle cx="66" cy="53" r="3.6" fill="#FF9EB0" opacity="0.5"/>
    <path d="M41 56 Q50 63 59 56" fill="none" stroke="#8a3b2e" stroke-width="3" stroke-linecap="round"/>
    <path d="M77 23 l1.2 3 l3 1.2 l-3 1.2 l-1.2 3 l-1.2 -3 l-3 -1.2 l3 -1.2 z" fill="#FFD34E"/>
  </svg>`,

  choco: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="초코">
    <defs><linearGradient id="ga-choco" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFD3E3"/><stop offset="1" stop-color="#FF8FB8"/></linearGradient></defs>
    <path d="M18 100 Q18 76 50 76 Q82 76 82 100 Z" fill="url(#ga-choco)"/>
    <ellipse cx="77" cy="54" rx="9" ry="15" fill="#5A3B2A" transform="rotate(14 77 54)"/>
    <circle cx="50" cy="46" r="30" fill="#FDD9B5"/>
    <path d="M21 44 Q21 17 50 17 Q79 17 79 44 Q70 30 50 30 Q30 30 21 44 Z" fill="#5A3B2A"/>
    <circle cx="73" cy="38" r="4" fill="#FF6FA3"/>
    <circle cx="40" cy="46" r="4.2" fill="#3a2417"/><circle cx="41.6" cy="44.3" r="1.4" fill="#fff"/>
    <circle cx="60" cy="46" r="4.2" fill="#3a2417"/><circle cx="61.6" cy="44.3" r="1.4" fill="#fff"/>
    <circle cx="33" cy="54" r="4" fill="#FF7EA8" opacity="0.55"/>
    <circle cx="67" cy="54" r="4" fill="#FF7EA8" opacity="0.55"/>
    <path d="M43 58 Q50 64 57 58" fill="none" stroke="#a0455f" stroke-width="3" stroke-linecap="round"/>
  </svg>`,
};

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
