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

// 미션을 실제로 완료했다는 증거: 오늘 완료한 미션이 있거나, 스티커가 있다.
// 스티커는 미션을 완료할 때만 지급되므로(출석·별 잔액으로는 생기지 않는다) 날짜가 지나도 남는 증거다.
function completedAMission(rewards, stickers) {
  const stickerCount = Object.values(stickers || {}).reduce((n, c) => n + (Number(c) || 0), 0);
  return (rewards?.doneToday || []).length > 0 || stickerCount > 0;
}

// 예전 조건(별 잔액이 있으면 "미션 도전")으로 잘못 받은 배지를 거둔다.
// 근거가 남아 있어 틀렸다고 확인되는 것만 거둔다: 미션을 한 번도 완료한 적 없는데(스티커 0개)
// 출석 보너스로 받은 "미션 도전". "목소리 친구"는 당시에 음성 표시를 남기지 않아 옳고 그름을
// 가릴 수 없고, "궁금쟁이"는 기록을 지우면 근거도 사라지므로 그대로 둔다.
export function reconcileBadges(badges, { rewards, stickers } = {}) {
  const list = Array.isArray(badges) ? badges : [];
  if (completedAMission(rewards, stickers)) return list;
  return list.filter((id) => id !== "mission1");
}

// 현재 상태로 달성한 배지 id 목록
export function earnedBadges({ profile, histories, rewards, decor, stickers }) {
  const ids = [];
  // 이 함수는 렌더 중 호출되므로, 저장값이 예상과 다르면 화면 전체가 죽는다.
  // store가 정상화해 주지만 여기서도 배열만 센다.
  const list = (id) => (Array.isArray(histories?.[id]) ? histories[id] : []);
  const has = (id) => list(id).length;
  const totalUser = Object.values(histories || {}).reduce(
    (n, h) => n + (Array.isArray(h) ? h.filter((m) => m?.role === "user").length : 0),
    0
  );
  if (profile && profile.onboarded) ids.push("first");
  if (totalUser > 0) ids.push("talk");
  if (has("story_listen") || has("story_make")) ids.push("story");
  // 출석 보너스로도 별이 생기므로 별 잔액으로 판단하면 안 된다 — 완료한 미션이 있어야 한다.
  if (completedAMission(rewards, stickers)) ids.push("mission1");
  if (rewards?.allClear) ids.push("allclear");
  if ((rewards?.balance || 0) >= 10) ids.push("star10");
  if ((rewards?.balance || 0) >= 30) ids.push("star30");
  if (decor && Object.values(decor.placed || {}).some((o) => Object.keys(o).length)) ids.push("decor1");
  if ((decor?.completed || []).length > 0) ids.push("theme");
  // 음성으로 보낸 말에는 via:"voice"가 붙는다. 홈의 글 입력창으로 한 질문은 해당하지 않는다.
  const spokeAloud = Object.values(histories || {}).some(
    (h) => Array.isArray(h) && h.some((m) => m?.role === "user" && m.via === "voice")
  );
  if (spokeAloud) ids.push("voice");
  // 질문 횟수는 아이가 보낸 말만 센다 (답변까지 세면 2~3번만 물어도 달성된다).
  const asked = list("learn_ask").filter((m) => m?.role === "user").length;
  if (asked >= 5) ids.push("curious");
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
