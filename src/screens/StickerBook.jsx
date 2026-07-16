import { STICKERS } from "../lib/collectibles.js";

// 스티커 도감 — 활동으로 모은 스티커 앨범 (수집/미수집)
export default function StickerBook({ stickers, onBack }) {
  const owned = stickers || {};
  const gotCount = STICKERS.filter((s) => owned[s.id]).length;

  return (
    <section className="book">
      <header className="book-top">
        <button className="voice-back" onClick={onBack}>
          ‹ 뒤로
        </button>
        <b className="book-title">🪄 스티커 도감</b>
        <span className="book-count">
          {gotCount}/{STICKERS.length}
        </span>
      </header>

      <p className="book-hint">미션을 완료하면 스티커를 하나씩 모을 수 있어요!</p>

      <div className="sticker-grid">
        {STICKERS.map((s) => {
          const n = owned[s.id] || 0;
          return (
            <div key={s.id} className={`sticker-slot ${n ? "got" : "empty"}`}>
              <span className="sticker-emoji">{s.emoji}</span>
              <small className="sticker-name">{n ? s.name : "?"}</small>
              {n > 1 && <span className="sticker-count">×{n}</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
