// 효과음 — 외부 파일 없이 Web Audio로 합성. 부모가 켜고 끌 수 있음.
let ctx = null;
let enabled = true;

export function setSfxEnabled(v) {
  enabled = !!v;
}

function ac() {
  if (!enabled) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq, start, dur, type = "sine", gain = 0.12) {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  o.connect(g);
  g.connect(c.destination);
  const t = c.currentTime + start;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export const sfx = {
  tap() {
    tone(660, 0, 0.09, "triangle", 0.06);
  },
  star() {
    tone(880, 0, 0.12, "sine", 0.1);
    tone(1320, 0.06, 0.14, "sine", 0.08);
  },
  success() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.18, "sine", 0.1));
  },
  sticker() {
    tone(988, 0, 0.1, "triangle", 0.09);
    tone(1319, 0.08, 0.16, "sine", 0.08);
  },
  poke() {
    tone(440, 0, 0.08, "square", 0.05);
    tone(880, 0.05, 0.1, "sine", 0.06);
  },
};
