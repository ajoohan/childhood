// 꾸미기 시스템 (기획서 4·5장 — 오리지널 구성)
// 빈 공간에 오브젝트를 자유롭게 배치(3택)하고, 다 채운 뒤 "완성하기"를 누르면
// 그때 별이 한 번에 소진된다(별이 날아가며 줄어드는 연출). 소진은 콜렉션 완성 시에만.
// cost = 그 콜렉션을 완성하는 데 드는 총 별 (뒤 테마일수록 비쌈).

export const THEMES = [
  {
    id: "room",
    name: "나의 방",
    emoji: "🛏️",
    cost: 10,
    bg: ["#FFE8D6", "#FFC9A3"],
    slots: [
      { id: "bed", name: "침대", options: ["🛏️", "🛌", "🏕️"] },
      { id: "lamp", name: "조명", options: ["💡", "🕯️", "🪔"] },
      { id: "plant", name: "화분", options: ["🪴", "🌵", "🌻"] },
      { id: "toy", name: "장난감", options: ["🧸", "🪀", "🎨"] },
      { id: "window", name: "창문", options: ["🪟", "🖼️", "🎏"] },
    ],
  },
  {
    id: "spaceship",
    name: "우주선",
    emoji: "🚀",
    cost: 15,
    bg: ["#D6E4FF", "#9FB6E8"],
    slots: [
      { id: "console", name: "조종석", options: ["🕹️", "🎛️", "📟"] },
      { id: "porthole", name: "창", options: ["🪟", "🌍", "🌌"] },
      { id: "robot", name: "로봇 친구", options: ["🤖", "👾", "🛸"] },
      { id: "planet", name: "행성", options: ["🪐", "🌕", "⭐"] },
      { id: "booster", name: "부스터", options: ["🚀", "🛰️", "☄️"] },
    ],
  },
  {
    id: "castle",
    name: "마법의 성",
    emoji: "🏰",
    cost: 20,
    bg: ["#F3D6FF", "#C79FE8"],
    slots: [
      { id: "throne", name: "왕좌", options: ["👑", "🪑", "🛎️"] },
      { id: "torch", name: "횃불", options: ["🔥", "🕯️", "✨"] },
      { id: "pet", name: "마법 친구", options: ["🐉", "🦄", "🧚"] },
      { id: "gem", name: "보석", options: ["💎", "🔮", "🏆"] },
      { id: "flag", name: "깃발", options: ["🚩", "🎏", "🎐"] },
    ],
  },
];

export function themeById(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

// 장소 번호 (1부터) — 기획서 5장의 "N번 장소" 표기
export function themePlaceNo(id) {
  const i = THEMES.findIndex((t) => t.id === id);
  return (i < 0 ? 0 : i) + 1;
}

// 순차 해금 — 첫 장소는 항상 열려 있고, 이전 장소를 완성해야 다음이 열린다.
export function isThemeUnlocked(id, completed) {
  const i = THEMES.findIndex((t) => t.id === id);
  if (i <= 0) return true;
  return (completed || []).includes(THEMES[i - 1].id);
}

// 해당 테마의 모든 칸이 채워졌는지 (완성하기를 누를 수 있는 상태)
export function isThemeFilled(theme, placedForTheme) {
  const placed = placedForTheme || {};
  return theme.slots.every((s) => placed[s.id] != null);
}
