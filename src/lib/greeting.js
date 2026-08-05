// 시간대별 환영 문구 (기획서 2장 — "상황에 따라 텍스트가 변경",
// 예시: 저녁 9시 → "빌리, 치카치카 했어요?")

export function timeGreeting(name, now = new Date()) {
  const h = now.getHours();
  const who = name || "친구";

  if (h >= 5 && h < 9)
    return { hi: `좋은 아침, ${who}! ☀️`, sub: "일찍 일어났네, 대단해!" };
  if (h >= 9 && h < 12)
    return { hi: `안녕, ${who}! 👋`, sub: "오늘은 뭐하고 놀까?" };
  if (h >= 12 && h < 15)
    return { hi: `안녕, ${who}! 🍚`, sub: "점심 맛있게 먹었어?" };
  if (h >= 15 && h < 18)
    return { hi: `안녕, ${who}! 👋`, sub: "오늘 제일 재미있던 게 뭐야?" };
  if (h >= 18 && h < 21)
    return { hi: `안녕, ${who}! 🌆`, sub: "오늘 하루도 수고했어!" };
  if (h >= 21 && h < 23)
    return { hi: `${who}, 치카치카 했어요? 🪥`, sub: "자기 전에 이 닦는 거 잊지 마!" };
  return { hi: `${who}, 아직 안 잤어? 🌙`, sub: "이제 꿈나라 갈 시간이야" };
}
