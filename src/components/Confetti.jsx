import { useMemo } from "react";

const COLORS = ["#FF7A3D", "#37E6FF", "#A46BFF", "#FF5CC8", "#FFC93C", "#6EE7A0"];

// 완료 축하용 컨페티 — 라이브러리 없이 CSS 파티클. 부모가 마운트/언마운트로 제어.
export default function Confetti({ count = 70 }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.35,
        dur: 1.7 + Math.random() * 1.3,
        drift: (Math.random() * 2 - 1) * 90,
        rot: Math.floor(Math.random() * 360),
        color: COLORS[i % COLORS.length],
        w: 6 + Math.random() * 7,
        h: 9 + Math.random() * 9,
        round: Math.random() < 0.32,
      })),
    [count]
  );
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-p"
          style={{
            left: `${p.left}%`,
            background: p.color,
            width: `${p.w}px`,
            height: `${p.h}px`,
            borderRadius: p.round ? "50%" : "2px",
            "--drift": `${p.drift}px`,
            "--rot": `${p.rot}deg`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
          }}
        />
      ))}
    </div>
  );
}
