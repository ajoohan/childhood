import { THEMES, isThemeUnlocked, themePlaceNo } from "../lib/decor.js";
import { STICKERS } from "../lib/collectibles.js";

// 콜렉션 — 로열매치식 '장소' 피드 (네이비 배경 · 리본 타이틀 · 순차 해금)
// 잠김 → 진행 중(진행바) → 완성(✓ + 보기) 상태가 세로로 이어진다.
export default function CollectionHub({
  decor,
  stickers,
  stars,
  onOpenTheme,
  onStickers,
}) {
  const owned = stickers || {};
  const gotCount = STICKERS.filter((s) => owned[s.id]).length;
  const preview = STICKERS.slice(0, 8);

  return (
    <section className="colhub space">
      <header className="space-hd">
        <b className="space-title">콜렉션</b>
        <span className="star-badge star3d dark">
          <b>{stars}</b>
          <span className="star3d-icon">⭐</span>
        </span>
      </header>

      <div className="space-feed">
        {THEMES.map((t) => {
          const unlocked = isThemeUnlocked(t.id, decor.completed);
          const done = (decor.completed || []).includes(t.id);
          const placed = decor.placed[t.id] || {};
          const filled = t.slots.filter((s) => placed[s.id] != null).length;
          const total = t.slots.length;
          return (
            <div key={t.id} className={`place ${unlocked ? "" : "locked"}`}>
              <span className="place-chip">{themePlaceNo(t.id)}번 장소</span>
              <div className={`place-ribbon ${unlocked ? "" : "gray"}`}>
                {t.name}
              </div>
              <button
                className="place-scene-wrap"
                disabled={!unlocked}
                onClick={() => unlocked && onOpenTheme(t.id)}
              >
                <span
                  className="place-scene"
                  style={{
                    background: `linear-gradient(160deg, ${t.bg[0]}, ${t.bg[1]})`,
                  }}
                >
                  <span className="place-objs">
                    {t.slots.map((s) => (
                      <i key={s.id}>
                        {placed[s.id] != null ? s.options[placed[s.id]] : ""}
                      </i>
                    ))}
                  </span>

                  {!unlocked && (
                    <span className="place-lock">
                      <span className="place-lock-icon">🔒</span>
                    </span>
                  )}

                  {unlocked && !done && (
                    <span className="place-progress">
                      <i style={{ width: `${total ? (filled / total) * 100 : 0}%` }} />
                      <b>
                        {filled}/{total}
                      </b>
                    </span>
                  )}

                  {done && (
                    <>
                      <span className="place-done">✓ 완성!</span>
                      <span className="place-view">보기</span>
                    </>
                  )}
                </span>
              </button>
              {!unlocked && (
                <p className="place-hint">이전 장소를 완성하면 열려요</p>
              )}
            </div>
          );
        })}

        {/* 스티커 앨범 */}
        <button className="space-stickers" onClick={onStickers}>
          <div className="colhub-stk-top">
            <b>🪄 모은 스티커</b>
            <span className="colhub-stk-count">
              {gotCount}/{STICKERS.length}
            </span>
          </div>
          <div className="colhub-stk-row">
            {preview.map((s) => (
              <span
                key={s.id}
                className={`colhub-stk ${owned[s.id] ? "got" : "empty"}`}
              >
                {owned[s.id] ? s.emoji : "?"}
              </span>
            ))}
            <span className="colhub-stk more">…</span>
          </div>
        </button>
      </div>
    </section>
  );
}
