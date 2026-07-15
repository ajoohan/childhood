// 탭 반짝임 효과 — 누른 지점에서 별이 튀어오른다 (아이용 즐거움)
const CHARS = ["✨", "⭐", "🌟", "💫", "🌠"];

export function sparkleBurst(x, y, layer, n = 6) {
  if (!layer) return;
  for (let i = 0; i < n; i++) {
    const s = document.createElement("span");
    s.className = "fx-sparkle";
    s.textContent = CHARS[Math.floor(Math.random() * CHARS.length)];
    const ang = Math.random() * Math.PI * 2;
    const dist = 22 + Math.random() * 40;
    s.style.left = x + "px";
    s.style.top = y + "px";
    s.style.setProperty("--dx", Math.cos(ang) * dist + "px");
    s.style.setProperty("--dy", Math.sin(ang) * dist - 14 + "px");
    s.style.fontSize = 12 + Math.random() * 14 + "px";
    s.style.animationDelay = Math.random() * 0.05 + "s";
    layer.appendChild(s);
    setTimeout(() => s.remove(), 700);
  }
}
