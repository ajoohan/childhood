// 표정을 바꿀 수 있는 로봇 마스코트 "별이" (오리지널)
// expr: happy | excited | wow | thinking | talking

function face(expr) {
  // 얼굴 스크린 영역(중심 x=130) 안에 눈썹·눈·코·입을 그린다.
  const cheeks = `
    <circle cx="103" cy="118" r="4.6" fill="#FF9E9E" opacity="0.75"/>
    <circle cx="157" cy="118" r="4.6" fill="#FF9E9E" opacity="0.75"/>`;
  if (expr === "excited") {
    return `
    <path d="M100 96 Q112 86 122 96" fill="none" stroke="#F58A3C" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M138 96 Q148 86 160 96" fill="none" stroke="#F58A3C" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M105 112 l3 -7 l3 7 l7 1 l-6 4 l2 7 l-6 -4 l-6 4 l2 -7 l-6 -4 z" fill="#2b3a44"/>
    <path d="M143 112 l3 -7 l3 7 l7 1 l-6 4 l2 7 l-6 -4 l-6 4 l2 -7 l-6 -4 z" fill="#2b3a44"/>
    ${cheeks}
    <path class="rm-mouth" d="M116 122 Q130 138 144 122 Q130 130 116 122 Z" fill="#B34A3A"/>`;
  }
  if (expr === "wow") {
    return `
    <path d="M102 94 Q112 88 122 94" fill="none" stroke="#F58A3C" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M138 94 Q148 88 158 94" fill="none" stroke="#F58A3C" stroke-width="4.5" stroke-linecap="round"/>
    <circle cx="112" cy="107" r="8.5" fill="#26323a"/><circle cx="115" cy="103.5" r="3" fill="#fff"/>
    <circle cx="148" cy="107" r="8.5" fill="#26323a"/><circle cx="151" cy="103.5" r="3" fill="#fff"/>
    ${cheeks}
    <ellipse class="rm-mouth" cx="130" cy="126" rx="7" ry="9" fill="#B34A3A"/>`;
  }
  if (expr === "thinking") {
    return `
    <path d="M100 98 Q112 92 122 96" fill="none" stroke="#F58A3C" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M138 94 Q150 88 160 92" fill="none" stroke="#F58A3C" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M104 106 Q112 100 120 106" fill="none" stroke="#26323a" stroke-width="5" stroke-linecap="round"/>
    <path d="M140 104 Q148 98 156 104" fill="none" stroke="#26323a" stroke-width="5" stroke-linecap="round"/>
    <path d="M120 124 Q130 121 140 126" fill="none" stroke="#8a3b2e" stroke-width="3" stroke-linecap="round"/>`;
  }
  if (expr === "talking") {
    return `
    <path d="M103 92 Q112 85 121 92" fill="none" stroke="#F58A3C" stroke-width="4" stroke-linecap="round"/>
    <path d="M139 92 Q148 85 157 92" fill="none" stroke="#F58A3C" stroke-width="4" stroke-linecap="round"/>
    <circle cx="112" cy="107" r="7" fill="#26323a"/><circle cx="114.5" cy="104" r="2.4" fill="#fff"/>
    <circle cx="148" cy="107" r="7" fill="#26323a"/><circle cx="150.5" cy="104" r="2.4" fill="#fff"/>
    ${cheeks}
    <ellipse class="rm-mouth" cx="130" cy="125" rx="8" ry="6" fill="#B34A3A"/>`;
  }
  // happy (기본)
  return `
    <path d="M103 92 Q112 85 121 92" fill="none" stroke="#F58A3C" stroke-width="4" stroke-linecap="round"/>
    <path d="M139 92 Q148 85 157 92" fill="none" stroke="#F58A3C" stroke-width="4" stroke-linecap="round"/>
    <circle cx="112" cy="107" r="7" fill="#26323a"/><circle cx="114.5" cy="104" r="2.4" fill="#fff"/>
    <circle cx="148" cy="107" r="7" fill="#26323a"/><circle cx="150.5" cy="104" r="2.4" fill="#fff"/>
    ${cheeks}
    <path class="rm-mouth" d="M120 120 Q130 130 140 120 Q130 126 120 120 Z" fill="#B34A3A"/>`;
}

// 전신 마스코트 (책 + 붓, 구름 위) — 표정만 바뀜
export function robotMascot(expr = "happy") {
  return `<svg viewBox="0 0 260 320" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="별이" class="rm-svg rm-${expr}">
  <defs>
    <linearGradient id="rmb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7FCDF2"/><stop offset="1" stop-color="#3EA9E0"/></linearGradient>
    <linearGradient id="rmBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#68C2EF"/><stop offset="1" stop-color="#3196CF"/></linearGradient>
  </defs>
  <g fill="#FFC93C">
    <ellipse cx="92" cy="296" rx="44" ry="24" opacity="0.95"/><ellipse cx="150" cy="302" rx="54" ry="22" opacity="0.95"/>
    <ellipse cx="186" cy="290" rx="38" ry="21" opacity="0.95"/><ellipse cx="120" cy="282" rx="36" ry="21" opacity="0.95"/>
  </g>
  <ellipse cx="140" cy="306" rx="78" ry="9" fill="#E7A82F" opacity="0.35"/>
  <rect x="100" y="244" width="18" height="42" rx="9" fill="url(#rmBody)"/><rect x="142" y="244" width="18" height="42" rx="9" fill="url(#rmBody)"/>
  <rect x="100" y="260" width="18" height="8" rx="4" fill="#F58A3C"/><rect x="142" y="260" width="18" height="8" rx="4" fill="#F58A3C"/>
  <ellipse cx="105" cy="288" rx="17" ry="9" fill="#2E90C8"/><ellipse cx="155" cy="288" rx="17" ry="9" fill="#2E90C8"/>
  <rect x="120" y="146" width="20" height="12" fill="#2E90C8"/>
  <rect x="84" y="152" width="92" height="94" rx="26" fill="url(#rmBody)" stroke="#2E90C8" stroke-width="2.5"/>
  <rect x="112" y="150" width="36" height="9" rx="4.5" fill="#F58A3C"/>
  <rect x="112" y="182" width="40" height="40" rx="9" fill="#2E90C8"/>
  <g fill="#8AD8F7"><circle cx="121" cy="192" r="2"/><circle cx="132" cy="192" r="2"/><circle cx="143" cy="192" r="2"/><circle cx="121" cy="202" r="2"/><circle cx="132" cy="202" r="2"/><circle cx="143" cy="202" r="2"/><circle cx="121" cy="212" r="2"/><circle cx="132" cy="212" r="2"/><circle cx="143" cy="212" r="2"/></g>
  <circle cx="90" cy="172" r="10" fill="#F58A3C"/>
  <path d="M92 176 Q70 196 82 216" fill="none" stroke="#4FB3E0" stroke-width="14" stroke-linecap="round"/>
  <path d="M100 208 L56 219 L56 254 L100 250 Z" fill="#F07C2E"/><path d="M100 208 L144 219 L144 254 L100 250 Z" fill="#E86E22"/>
  <path d="M100 204 L60 214 L60 249 L100 246 Z" fill="#FFB37A" stroke="#E0913F" stroke-width="1.5"/><path d="M100 204 L140 214 L140 249 L100 246 Z" fill="#FFCE9E" stroke="#E0913F" stroke-width="1.5"/>
  <circle cx="84" cy="216" r="9" fill="#3EA9E0"/>
  <line x1="130" y1="60" x2="130" y2="40" stroke="#2E90C8" stroke-width="3.5"/><circle class="rm-antenna" cx="130" cy="34" r="6.5" fill="#FFC93C"/>
  <circle cx="74" cy="104" r="15" fill="#F58A3C"/><circle cx="74" cy="104" r="8" fill="#D96E24"/>
  <circle cx="186" cy="104" r="15" fill="#F58A3C"/><circle cx="186" cy="104" r="8" fill="#D96E24"/>
  <rect x="78" y="58" width="104" height="92" rx="28" fill="url(#rmb)" stroke="#2E90C8" stroke-width="2.5"/>
  <rect x="92" y="74" width="76" height="60" rx="22" fill="#EAF7FF"/>
  ${face(expr)}
  <circle cx="130" cy="116" r="3" fill="#2E90C8"/>
  <circle cx="170" cy="168" r="10" fill="#F58A3C"/>
  <path d="M170 170 Q200 158 208 132" fill="none" stroke="#4FB3E0" stroke-width="14" stroke-linecap="round"/>
  <circle cx="208" cy="130" r="9" fill="#3EA9E0"/>
  <line x1="208" y1="130" x2="226" y2="90" stroke="#C98A52" stroke-width="8" stroke-linecap="round"/>
  <line x1="217" y1="106" x2="225" y2="102" stroke="#B8BFC6" stroke-width="9" stroke-linecap="round"/>
  <path d="M226 90 l-8 -15 l14 5 z" fill="#E85A4A"/>
</svg>`;
}
