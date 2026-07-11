// 캐릭터별 인라인 SVG 일러스트. 외부 이미지 없이 자체 완결형이라
// 오프라인·엄격한 CSP 환경에서도 그대로 표시된다.
const AVATARS = {
  byeori: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="별이">
    <defs><linearGradient id="ga-byeori" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFE7A3"/><stop offset="1" stop-color="#FFB347"/></linearGradient></defs>
    <polygon points="50,6 62,38 96,38 68,59 79,93 50,72 21,93 32,59 4,38 38,38"
      fill="url(#ga-byeori)" stroke="#F4A100" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="36" cy="53" r="3.5" fill="#FF8FA3" opacity="0.65"/>
    <circle cx="64" cy="53" r="3.5" fill="#FF8FA3" opacity="0.65"/>
    <circle cx="43" cy="47" r="4" fill="#5a3d00"/>
    <circle cx="57" cy="47" r="4" fill="#5a3d00"/>
    <path d="M43 56 Q50 64 57 56" fill="none" stroke="#5a3d00" stroke-width="3" stroke-linecap="round"/>
  </svg>`,

  dino: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="디노 박사">
    <defs><linearGradient id="ga-dino" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#C7F6D9"/><stop offset="1" stop-color="#6FD08C"/></linearGradient></defs>
    <path d="M30 42 L36 26 L43 42 Z" fill="#4CAF7D"/>
    <path d="M44 38 L52 20 L60 38 Z" fill="#4CAF7D"/>
    <path d="M60 42 L67 28 L73 44 Z" fill="#4CAF7D"/>
    <ellipse cx="50" cy="61" rx="34" ry="30" fill="url(#ga-dino)" stroke="#4CAF7D" stroke-width="3"/>
    <ellipse cx="50" cy="72" rx="19" ry="15" fill="#EAFBF0"/>
    <circle cx="40" cy="56" r="6" fill="#fff"/><circle cx="41" cy="57" r="3" fill="#2e5c43"/>
    <circle cx="62" cy="56" r="6" fill="#fff"/><circle cx="61" cy="57" r="3" fill="#2e5c43"/>
    <path d="M44 69 Q50 75 56 69" fill="none" stroke="#2e5c43" stroke-width="3" stroke-linecap="round"/>
  </svg>`,

  luna: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="루나">
    <defs><linearGradient id="ga-luna" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#C3B3FF"/><stop offset="1" stop-color="#8FA7FF"/></linearGradient></defs>
    <rect x="33" y="58" width="34" height="34" rx="13" fill="url(#ga-luna)" stroke="#7C8CE0" stroke-width="2"/>
    <circle cx="50" cy="42" r="30" fill="#EEF2FF" stroke="#8FA7FF" stroke-width="3"/>
    <rect x="33" y="30" width="34" height="25" rx="12" fill="#333B66"/>
    <path d="M41 34 l1.6 4.2 l4.4 1.6 l-4.4 1.6 l-1.6 4.4 l-1.6 -4.4 l-4.4 -1.6 l4.4 -1.6 z" fill="#fff" opacity="0.85"/>
    <circle cx="58" cy="46" r="3" fill="#fff" opacity="0.5"/>
  </svg>`,

  momo: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="모모">
    <defs><linearGradient id="ga-momo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFD9EC"/><stop offset="1" stop-color="#FF9EC7"/></linearGradient></defs>
    <ellipse cx="26" cy="52" rx="15" ry="23" fill="#FFE6F3" opacity="0.95" transform="rotate(-22 26 52)"/>
    <ellipse cx="74" cy="52" rx="15" ry="23" fill="#FFE6F3" opacity="0.95" transform="rotate(22 74 52)"/>
    <line x1="42" y1="27" x2="37" y2="16" stroke="#FF7EB4" stroke-width="2.5"/><circle cx="36" cy="14" r="3.5" fill="#FFD34E"/>
    <line x1="58" y1="27" x2="63" y2="16" stroke="#FF7EB4" stroke-width="2.5"/><circle cx="64" cy="14" r="3.5" fill="#FFD34E"/>
    <circle cx="50" cy="52" r="26" fill="url(#ga-momo)" stroke="#FF7EB4" stroke-width="3"/>
    <circle cx="37" cy="56" r="3.2" fill="#fff" opacity="0.55"/><circle cx="63" cy="56" r="3.2" fill="#fff" opacity="0.55"/>
    <circle cx="43" cy="50" r="3.6" fill="#7a2f52"/><circle cx="57" cy="50" r="3.6" fill="#7a2f52"/>
    <path d="M44 58 Q50 64 56 58" fill="none" stroke="#7a2f52" stroke-width="3" stroke-linecap="round"/>
  </svg>`,

  melody: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="멜로디">
    <defs><linearGradient id="ga-melody" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#E3D6FF"/><stop offset="1" stop-color="#A98CFF"/></linearGradient></defs>
    <rect x="62" y="22" width="6" height="42" rx="3" fill="#7C5CD6"/>
    <path d="M68 22 q15 3 12 21 q-2 -11 -12 -9 z" fill="#7C5CD6"/>
    <ellipse cx="45" cy="66" rx="24" ry="20" fill="url(#ga-melody)" stroke="#7C5CD6" stroke-width="3"/>
    <circle cx="38" cy="63" r="3.6" fill="#3d2a66"/><circle cx="52" cy="63" r="3.6" fill="#3d2a66"/>
    <path d="M38 71 Q45 77 52 71" fill="none" stroke="#3d2a66" stroke-width="3" stroke-linecap="round"/>
    <path d="M20 30 l1.6 4.2 l4.4 1.6 l-4.4 1.6 l-1.6 4.4 l-1.6 -4.4 l-4.4 -1.6 l4.4 -1.6 z" fill="#FFD34E"/>
  </svg>`,

  sems: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="셈셈이">
    <defs><linearGradient id="ga-sems" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#B9EFE8"/><stop offset="1" stop-color="#4FC3B5"/></linearGradient></defs>
    <path d="M30 27 L34 12 L43 25 Z" fill="#3AA99B"/>
    <path d="M70 27 L66 12 L57 25 Z" fill="#3AA99B"/>
    <ellipse cx="50" cy="56" rx="30" ry="32" fill="url(#ga-sems)" stroke="#3AA99B" stroke-width="3"/>
    <ellipse cx="50" cy="67" rx="16" ry="18" fill="#EAFBF8"/>
    <circle cx="39" cy="49" r="11" fill="#fff" stroke="#2f7d72" stroke-width="3"/>
    <circle cx="61" cy="49" r="11" fill="#fff" stroke="#2f7d72" stroke-width="3"/>
    <path d="M48 49 h4" stroke="#2f7d72" stroke-width="3"/>
    <circle cx="39" cy="50" r="4.2" fill="#2f5d55"/><circle cx="61" cy="50" r="4.2" fill="#2f5d55"/>
    <path d="M45 59 L55 59 L50 67 Z" fill="#FFB347"/>
  </svg>`,
};

function avatarSVG(id) {
  return AVATARS[id] || "";
}
