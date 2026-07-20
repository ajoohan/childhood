import {
  THEMES,
  themeById,
  isThemeUnlocked,
  themePlaceNo,
} from "../lib/decor.js";
import { STICKERS } from "../lib/collectibles.js";

// 콜렉션 허브 — 꾸미기(별로 채우는 콜렉션)와 스티커(모은 아트 오브젝트)를 한곳에.
// 하단 탭 '콜렉션'의 메인 화면.
export default function CollectionHub({
  decor,
  stickers,
  stars,
  onDecor,
  onStickers,
}) {
  const theme = themeById(decor.theme);
  const placed = decor.placed[theme.id] || {};
  const filled = theme.slots.filter((s) => placed[s.id] != null).length;
  const total = theme.slots.length;
  const completed = THEMES.filter((t) => (decor.completed || []).includes(t.id));
  // 아직 잠긴 다음 장소들 (순차 해금)
  const lockedNext = THEMES.filter(
    (t) => !isThemeUnlocked(t.id, decor.completed)
  );

  const owned = stickers || {};
  const gotCount = STICKERS.filter((s) => owned[s.id]).length;
  const preview = STICKERS.slice(0, 8);

  return (
    <section className="colhub">
      <header className="colhub-hd">
        <div>
          <b>📦 콜렉션</b>
          <small>별로 꾸미고, 스티커를 모아요</small>
        </div>
        <span className="star-badge">
          <b>{stars}</b> ⭐
        </span>
      </header>

      {/* 진행 중인 콜렉션 (꾸미기) */}
      <div className="colhub-sec-label">진행 중인 콜렉션</div>
      <button className="colhub-decor" onClick={onDecor}>
        <span
          className="colhub-decor-scene"
          style={{
            background: `linear-gradient(160deg, ${theme.bg[0]}, ${theme.bg[1]})`,
          }}
        >
          {theme.slots.map((s) => (
            <span key={s.id} className="chd-slot">
              {placed[s.id] != null ? s.options[placed[s.id]] : ""}
            </span>
          ))}
        </span>
        <div className="colhub-decor-info">
          <span className="colhub-place">{themePlaceNo(theme.id)}번 장소</span>
          <b>
            {theme.emoji} {theme.name}
          </b>
          <div className="colhub-bar">
            <i style={{ width: `${total ? (filled / total) * 100 : 0}%` }} />
          </div>
          <small>
            {filled}/{total} 채웠어요 · 눌러서 꾸미기
          </small>
        </div>
      </button>

      {/* 다음 장소 — 잠김 (이전 장소를 완성하면 열려요) */}
      {lockedNext.length > 0 && (
        <div className="colhub-next-row">
          {lockedNext.map((t) => (
            <div key={t.id} className="colhub-next">
              <span className="colhub-next-thumb">🔒</span>
              <div>
                <span className="colhub-place">{themePlaceNo(t.id)}번 장소</span>
                <b>{t.name}</b>
                <small>이전 장소를 완성하면 열려요</small>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 완성한 콜렉션 */}
      {completed.length > 0 && (
        <>
          <div className="colhub-sec-label">완성한 콜렉션 ✨</div>
          <div className="colhub-done-row">
            {completed.map((t) => (
              <button key={t.id} className="colhub-done" onClick={onDecor}>
                <span
                  className="colhub-done-thumb"
                  style={{
                    background: `linear-gradient(160deg, ${t.bg[0]}, ${t.bg[1]})`,
                  }}
                >
                  {t.emoji}
                </span>
                <small>{t.name}</small>
              </button>
            ))}
          </div>
        </>
      )}

      {/* 스티커 앨범 */}
      <div className="colhub-sec-label">스티커 앨범</div>
      <button className="colhub-stickers" onClick={onStickers}>
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
    </section>
  );
}
