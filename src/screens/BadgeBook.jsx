import { BADGES } from "../lib/collectibles.js";

// 배지(성취) 화면 — 잠금/해제 그리드
export default function BadgeBook({ badges, onBack }) {
  const owned = new Set(badges || []);
  const gotCount = BADGES.filter((b) => owned.has(b.id)).length;

  return (
    <section className="book">
      <header className="book-top">
        <button className="voice-back" onClick={onBack}>
          ‹ 뒤로
        </button>
        <b className="book-title">🏅 내 배지</b>
        <span className="book-count">
          {gotCount}/{BADGES.length}
        </span>
      </header>

      <div className="book-grid">
        {BADGES.map((b) => {
          const got = owned.has(b.id);
          return (
            <div key={b.id} className={`badge-card ${got ? "got" : "locked"}`}>
              <span className="badge-emoji">{got ? b.emoji : "❓"}</span>
              <b className="badge-name">{got ? b.name : "???"}</b>
              <small className="badge-desc">{got ? b.desc : "아직 잠겨 있어요"}</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}
