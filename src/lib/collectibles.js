// 배지(성취) + 스티커(도감) 정의 — 모두 활동으로만 획득, 결제 없음

// ── 배지: 특정 성취를 달성하면 잠금 해제 ──
export const BADGES = [
  { id: "first", emoji: "🐣", name: "첫걸음", desc: "Childhood를 시작했어요" },
  { id: "talk", emoji: "💬", name: "첫 대화", desc: "별이와 처음 이야기했어요" },
  { id: "story", emoji: "📖", name: "이야기꾼", desc: "이야기 활동을 해봤어요" },
  { id: "mission1", emoji: "🎯", name: "미션 도전", desc: "미션을 완료했어요" },
  { id: "allclear", emoji: "🏆", name: "올클리어", desc: "하루 미션을 모두 끝냈어요" },
  { id: "star10", emoji: "⭐", name: "별 부자", desc: "별을 10개 모았어요" },
  { id: "star30", emoji: "🌟", name: "별 대장", desc: "별을 30개 모았어요" },
  { id: "decor1", emoji: "🪴", name: "꼬마 인테리어", desc: "방을 꾸미기 시작했어요" },
  { id: "theme", emoji: "🏰", name: "공간 완성", desc: "테마 하나를 완성했어요" },
  { id: "voice", emoji: "🎙️", name: "목소리 친구", desc: "음성으로 이야기했어요" },
  { id: "curious", emoji: "❓", name: "궁금쟁이", desc: "질문을 많이 했어요" },
  { id: "sticker5", emoji: "🪄", name: "스티커 수집가", desc: "스티커 5개를 모았어요" },
];

// 현재 상태로 달성한 배지 id 목록
export function earnedBadges({ profile, histories, rewards, decor, stickers }) {
  const ids = [];
  const has = (id) => (histories && histories[id] && histories[id].length) || 0;
  const totalUser = Object.values(histories || {}).reduce(
    (n, h) => n + h.filter((m) => m.role === "user").length,
    0
  );
  if (profile && profile.onboarded) ids.push("first");
  if (totalUser > 0) ids.push("talk");
  if (has("story_listen") || has("story_make")) ids.push("story");
  if ((rewards?.doneToday || []).length > 0 || rewards?.balance > 0) ids.push("mission1");
  if (rewards?.allClear) ids.push("allclear");
  if ((rewards?.balance || 0) >= 10) ids.push("star10");
  if ((rewards?.balance || 0) >= 30) ids.push("star30");
  if (decor && Object.values(decor.placed || {}).some((o) => Object.keys(o).length)) ids.push("decor1");
  if ((decor?.completed || []).length > 0) ids.push("theme");
  if (has("learn_ask")) ids.push("voice"); // 음성은 learn_ask 스코프
  if (has("learn_ask") >= 5) ids.push("curious");
  const stickerCount = Object.values(stickers || {}).reduce((n, c) => n + c, 0);
  if (stickerCount >= 5) ids.push("sticker5");
  return ids;
}

// ── 스티커 도감: 미션 완료 등으로 랜덤 획득 ──
export const STICKERS = [
  { id: "cat", emoji: "🐱", name: "야옹이" },
  { id: "dog", emoji: "🐶", name: "멍멍이" },
  { id: "rabbit", emoji: "🐰", name: "토끼" },
  { id: "bear", emoji: "🐻", name: "곰돌이" },
  { id: "fox", emoji: "🦊", name: "여우" },
  { id: "lion", emoji: "🦁", name: "사자" },
  { id: "unicorn", emoji: "🦄", name: "유니콘" },
  { id: "dino", emoji: "🦕", name: "공룡" },
  { id: "rocket", emoji: "🚀", name: "로켓" },
  { id: "planet", emoji: "🪐", name: "행성" },
  { id: "rainbow", emoji: "🌈", name: "무지개" },
  { id: "star", emoji: "⭐", name: "별" },
  { id: "flower", emoji: "🌸", name: "꽃" },
  { id: "cake", emoji: "🍰", name: "케이크" },
  { id: "balloon", emoji: "🎈", name: "풍선" },
  { id: "crown", emoji: "👑", name: "왕관" },
];

// 랜덤 스티커 하나 뽑기 (미완성 우선으로 도감 채우기 유도)
export function drawSticker(owned = {}) {
  const missing = STICKERS.filter((s) => !owned[s.id]);
  const pool = missing.length ? missing : STICKERS;
  return pool[Math.floor(Math.random() * pool.length)].id;
}
