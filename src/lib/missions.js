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

// ── 보물상자 (하루 미션 올클리어 보상) ──
// 안전 원칙: 결제로 열 수 없고, 하루 1회만, '미션 완료'로만 열린다.
// 보상은 앱 안에서 이미 얻을 수 있는 것(추가 별 또는 스티커)뿐 — 유료·독점 아이템 없음.
// 열었을 때 별인지 스티커인지는 랜덤(작은 즐거움)이되, 손해는 없다(항상 무언가 받음).
import { drawSticker, STICKERS } from "./collectibles.js";

export const CHEST_BONUS_STARS = [2, 3, 5]; // 별이 나올 때의 보너스 후보

// 소유 스티커를 받아 랜덤 보상 하나를 만든다.
export function openTreasure(ownedStickers = {}) {
  // 약 55% 별 / 45% 스티커
  if (Math.random() < 0.55) {
    const amount =
      CHEST_BONUS_STARS[Math.floor(Math.random() * CHEST_BONUS_STARS.length)];
    return { type: "star", amount };
  }
  const id = drawSticker(ownedStickers);
  const s = STICKERS.find((x) => x.id === id) || STICKERS[0];
  return { type: "sticker", id: s.id, emoji: s.emoji, name: s.name };
}
