import { useMemo } from "react";

const GLYPHS = ["✨", "⭐", "🌟", "💫", "🫧", "🌙"];

// 홈 배경에 은은히 떠다니는 별/거품 장식 (콘텐츠 뒤)
export default function FloatingStars({ count = 12 }) {
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 12 + Math.random() * 20,
        dur: 6 + Math.random() * 8,
        delay: -Math.random() * 8,
        drift: (Math.random() * 2 - 1) * 20,
        glyph: GLYPHS[i % GLYPHS.length],
        op: 0.18 + Math.random() * 0.22,
      })),
    [count]
  );
  return (
    <div className="floaty" aria-hidden="true">
      {items.map((s, i) => (
        <span
          key={i}
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            fontSize: `${s.size}px`,
            opacity: s.op,
            "--dur": `${s.dur}s`,
            "--delay": `${s.delay}s`,
            "--drift": `${s.drift}px`,
          }}
        >
          {s.glyph}
        </span>
      ))}
    </div>
  );
}
