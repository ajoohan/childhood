// 데일리 미션 시스템 (기획서 2~3장)

// 별 지급량 밸런싱
export const REWARD = {
  attendance: 1, // 출석 + AI 첫인사 (일 1회)
  mission: 2, // 단일 미션 완료 (부모가 미션별로 변경 가능)
  allClear: 5, // 일일 미션 올클리어 보너스
};

// 앱 내장 기본 미션 (아동 발달 보편 습관)
export const BASIC_MISSIONS = [
  { id: "brush", emoji: "🪥", title: "양치질하기", reward: 2 },
  { id: "wakeup", emoji: "☀️", title: "일찍 일어나기", reward: 2 },
  { id: "greet", emoji: "👋", title: "AI와 아침 인사하기", reward: 2 },
];

// 부모 설정 미션에 고를 수 있는 이모지
export const MISSION_EMOJIS = ["🧸", "🥦", "📚", "🧹", "🛏️", "🚿", "🎒", "🐶", "💧", "🍎"];

// 오늘의 전체 미션 = 기본 + 부모 설정
export function allMissions(parentMissions) {
  return [...BASIC_MISSIONS, ...(parentMissions || [])];
}

// AI 인증 칭찬 멘트 (완료 시 AI 도우미가 승인·칭찬)
const PRAISE = [
  "우와, 정말 잘했어! 약속을 지키다니 멋져! 🎉",
  "대단한걸? 오늘도 최고야! ⭐",
  "짝짝짝! 스스로 해내다니 자랑스러워! 👏",
  "멋지다! 이렇게 하나씩 해내는 네가 대견해! 💪",
  "완벽해! 별을 선물할게. 반짝반짝! ✨",
];

export function praiseFor(name, seed) {
  const msg = PRAISE[Math.abs(seed) % PRAISE.length];
  return name ? `${name}야, ${msg}` : msg;
}
