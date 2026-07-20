import { SPLASH_ROBOT, SAFETY_BADGE, SPLASH_DECO } from "../lib/data.js";

// 시작 화면(스플래시) — 참고 톤: 크림/피치 배경 + 파란 로봇 마스코트
export default function Splash({ onStart, onParent }) {
  return (
    <section className="splash">
      <div className="splash-hero">
        <span
          className="splash-badge"
          dangerouslySetInnerHTML={{ __html: SAFETY_BADGE }}
        />
        <span
          className="splash-deco"
          dangerouslySetInnerHTML={{ __html: SPLASH_DECO }}
        />
        <div className="splash-card" />
        <span
          className="splash-robot"
          dangerouslySetInnerHTML={{ __html: SPLASH_ROBOT }}
        />
      </div>

      <div className="splash-copy">
        <h1 className="splash-logo">
          반짝<span>톡</span>
        </h1>
        <p className="splash-tag">우리 아이의 AI 학습 도우미</p>
        <p>
          광고 없이 안전하게,
          <br />
          호기심을 키우는 즐거운 배움 ✨
        </p>
      </div>

      <div className="splash-actions">
        <button className="splash-primary game-go" onClick={onStart}>
          ▶ 시작하기
        </button>
        <button className="splash-secondary" onClick={onParent}>
          부모님이신가요? 부모 존 열기
        </button>
      </div>
    </section>
  );
}
