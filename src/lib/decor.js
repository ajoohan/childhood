// 꾸미기 시스템 (기획서 4장, 로열매치식 메커닉 — 오리지널 구성)
// 별을 소모해 빈 공간에 오브젝트를 하나씩 배치. 슬롯마다 3택. 뒤로 갈수록 고비용.

export const THEMES = [
  {
    id: "room",
    name: "나의 방",
    emoji: "🛏️",
    bg: ["#FFE8D6", "#FFC9A3"],
    slots: [
      { id: "bed", name: "침대", cost: 1, options: ["🛏️", "🛌", "🏕️"] },
      { id: "lamp", name: "조명", cost: 2, options: ["💡", "🕯️", "🪔"] },
      { id: "plant", name: "화분", cost: 3, options: ["🪴", "🌵", "🌻"] },
      { id: "toy", name: "장난감", cost: 5, options: ["🧸", "🪀", "🎨"] },
      { id: "window", name: "창문", cost: 8, options: ["🪟", "🖼️", "🎏"] },
    ],
  },
  {
    id: "spaceship",
    name: "우주선",
    emoji: "🚀",
    bg: ["#D6E4FF", "#9FB6E8"],
    slots: [
      { id: "console", name: "조종석", cost: 1, options: ["🕹️", "🎛️", "📟"] },
      { id: "porthole", name: "창", cost: 2, options: ["🪟", "🌍", "🌌"] },
      { id: "robot", name: "로봇 친구", cost: 3, options: ["🤖", "👾", "🛸"] },
      { id: "planet", name: "행성", cost: 5, options: ["🪐", "🌕", "⭐"] },
      { id: "booster", name: "부스터", cost: 8, options: ["🚀", "🛰️", "☄️"] },
    ],
  },
  {
    id: "castle",
    name: "마법의 성",
    emoji: "🏰",
    bg: ["#F3D6FF", "#C79FE8"],
    slots: [
      { id: "throne", name: "왕좌", cost: 1, options: ["👑", "🪑", "🛎️"] },
      { id: "torch", name: "횃불", cost: 2, options: ["🔥", "🕯️", "✨"] },
      { id: "pet", name: "마법 친구", cost: 3, options: ["🐉", "🦄", "🧚"] },
      { id: "gem", name: "보석", cost: 5, options: ["💎", "🔮", "🏆"] },
      { id: "flag", name: "깃발", cost: 8, options: ["🚩", "🎏", "🎐"] },
    ],
  },
];

export function themeById(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

// 해당 테마가 모두 배치되었는지
export function isThemeComplete(theme, placedForTheme) {
  const placed = placedForTheme || {};
  return theme.slots.every((s) => placed[s.id] != null);
}
