import { useState } from "react";
import {
  THEMES,
  themeById,
  isThemeFilled,
  isThemeUnlocked,
  themePlaceNo,
} from "../lib/decor.js";
import { robotHead } from "../lib/mascot.js";
import Confetti from "../components/Confetti.jsx";

// 꾸미기 방 — 빈 칸을 자유롭게 채우고, "완성하기"를 누르면 그때 별이 한 번에
// 소진된다(별이 날아가며 줄어드는 연출). 소진은 오직 이 콜렉션 완성 순간에만.
export default function DecorRoom({
  decor,
  balance,
  onPlace,
  onSetTheme,
  onComplete,
  onBack,
}) {
  const theme = themeById(decor.theme);
  const placed = decor.placed[theme.id] || {};
  const [choosing, setChoosing] = useState(null); // 배치할 슬롯
  const [celebrate, setCelebrate] = useState(false);
  const [spending, setSpending] = useState(false); // 별 날아가는 소진 연출 중

  const filled = isThemeFilled(theme, placed);
  const alreadyDone = decor.completed.includes(theme.id);
  const unlocked = isThemeUnlocked(theme.id, decor.completed);
  const affordable = balance >= theme.cost;
  const need = Math.max(0, theme.cost - balance);

  function pick(slot, optIndex) {
    if (onPlace(theme.id, slot, optIndex)) setChoosing(null);
  }

  // 완성하기 → 별 소진(날아가는 연출) → 기념 사진
  function finishCollection() {
    if (alreadyDone || !filled || !affordable || spending) return;
    const ok = onComplete(theme);
    if (!ok) return;
    setSpending(true);
    setTimeout(() => {
      setSpending(false);
      setCelebrate(true);
    }, 1100);
  }

  return (
    <section className="decor">
      <header className="decor-top">
        <button className="voice-back" onClick={onBack}>
          ‹ 뒤로
        </button>
        <span className={`decor-balance ${spending ? "spending" : ""}`}>
          <b>{balance}</b> ⭐
        </span>
        {/* 별이 날아가며 소진되는 연출 (완성 순간에만) */}
        {spending && (
          <span className="star-spend" aria-hidden="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <i key={i} style={{ "--i": i }}>
                ⭐
              </i>
            ))}
            <b className="star-spend-amt">−{theme.cost}</b>
          </span>
        )}
      </header>

      <div className="decor-themes">
        {THEMES.map((t) => {
          const open = isThemeUnlocked(t.id, decor.completed);
          return (
            <button
              key={t.id}
              className={`decor-tab ${decor.theme === t.id ? "on" : ""} ${open ? "" : "locked"}`}
              onClick={() => onSetTheme(t.id)}
            >
              {open ? t.emoji : "🔒"} {t.name}
              {decor.completed.includes(t.id) && " ✓"}
            </button>
          );
        })}
      </div>

      <div className="decor-place">
        {themePlaceNo(theme.id)}번 장소 · {theme.name}
      </div>

      <div
        className="decor-stage"
        style={{ background: `linear-gradient(160deg, ${theme.bg[0]}, ${theme.bg[1]})` }}
      >
        {/* 잠긴 장소 — 이전 장소를 완성해야 열림 (순차 해금) */}
        {!unlocked && (
          <div className="decor-lock">
            <span className="decor-lock-icon">🔒</span>
            <b>아직 잠겨 있어요</b>
            <p>
              {themePlaceNo(theme.id) - 1}번 장소를 완성하면
              <br />이 장소가 열려요!
            </p>
          </div>
        )}
        <div className={`decor-grid ${unlocked ? "" : "blur"}`}>
          {theme.slots.map((slot) => {
            const idx = placed[slot.id];
            const isFilled = idx != null;
            return (
              <button
                key={slot.id}
                className={`decor-slot ${isFilled ? "filled" : ""}`}
                disabled={!unlocked}
                onClick={() => unlocked && !alreadyDone && setChoosing(slot)}
              >
                {isFilled ? (
                  <span className="ds-obj">{slot.options[idx]}</span>
                ) : (
                  <>
                    <span className="ds-plus">＋</span>
                    <span className="ds-name">{slot.name}</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 완성하기 — 채운 뒤 누르면 별이 소진되며 콜렉션 완성 */}
      {!unlocked ? (
        <p className="decor-hint">이전 장소를 완성하면 이곳이 열려요 🔒</p>
      ) : alreadyDone ? (
        <div className="decor-done">✓ 완성한 콜렉션이에요</div>
      ) : filled ? (
        <button
          className={`decor-finish ${affordable ? "" : "short"}`}
          onClick={finishCollection}
          disabled={!affordable || spending}
        >
          {affordable ? (
            <>
              완성하기 <span className="df-cost">{theme.cost} ⭐ 소진</span>
            </>
          ) : (
            <>별 {need}개 더 모으면 완성! ⭐</>
          )}
        </button>
      ) : (
        <p className="decor-hint">
          빈 자리를 눌러 자유롭게 꾸며요. 다 채우면 완성할 수 있어요! 📸
        </p>
      )}
      {filled && !alreadyDone && affordable && (
        <p className="decor-subhint">완성하면 별 {theme.cost}개가 소진돼요.</p>
      )}

      {/* 오브젝트 3택 선택 */}
      {choosing && (
        <div className="sheet-backdrop" onClick={() => setChoosing(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grip" />
            <div className="sparks-hd">
              <span className="sparks-star">{theme.emoji}</span>
              <div>
                <b>{choosing.name} 고르기</b>
                <small>마음에 드는 걸 골라요</small>
              </div>
            </div>
            <div className="decor-options">
              {choosing.options.map((op, i) => (
                <button
                  key={i}
                  className="decor-option"
                  onClick={() => pick(choosing, i)}
                >
                  <span className="do-emoji">{op}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 테마 완성 기념 사진 */}
      {celebrate && (
        <div className="modal-backdrop" onClick={() => setCelebrate(false)}>
          <Confetti count={90} />
          <div className="celebrate" onClick={(e) => e.stopPropagation()}>
            <div className="celebrate-frame">
              <div
                className="celebrate-scene"
                style={{
                  background: `linear-gradient(160deg, ${theme.bg[0]}, ${theme.bg[1]})`,
                }}
              >
                <span
                  className="celebrate-robot"
                  dangerouslySetInnerHTML={{ __html: robotHead("excited") }}
                />
                <div className="celebrate-objs">
                  {theme.slots.map((s) => (
                    <span key={s.id}>{s.options[placed[s.id]]}</span>
                  ))}
                </div>
              </div>
              <div className="celebrate-cap">{theme.name} 완성! 📸</div>
            </div>
            <h2>축하해요! 🎉</h2>
            <p>별 {theme.cost}개로 멋진 {theme.name}을(를) 완성했어요!</p>
            <button className="mm-yes wide" onClick={() => setCelebrate(false)}>
              좋아!
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
