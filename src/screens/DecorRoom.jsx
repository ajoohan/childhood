import { useEffect, useState } from "react";
import { HELPER } from "../lib/data.js";
import { THEMES, themeById, isThemeComplete } from "../lib/decor.js";
import Confetti from "../components/Confetti.jsx";

// 꾸미기 방 — 별을 소모해 오브젝트 배치 (로열매치식). 테마 완성 시 기념 사진.
export default function DecorRoom({
  decor,
  balance,
  onPlace,
  onSetTheme,
  onCompleteTheme,
  onBack,
}) {
  const theme = themeById(decor.theme);
  const placed = decor.placed[theme.id] || {};
  const [choosing, setChoosing] = useState(null); // 배치할 슬롯
  const [celebrate, setCelebrate] = useState(false);

  const complete = isThemeComplete(theme, placed);
  const alreadyDone = decor.completed.includes(theme.id);

  // 테마를 방금 완성하면 기념 사진 표시 + 완성 기록
  useEffect(() => {
    if (complete && !alreadyDone) {
      onCompleteTheme(theme.id);
      setCelebrate(true);
    }
  }, [complete, alreadyDone, theme.id]);

  function pick(slot, optIndex) {
    const ok = onPlace(theme.id, slot, optIndex);
    if (ok) setChoosing(null);
  }

  return (
    <section className="decor">
      <header className="decor-top">
        <button className="voice-back" onClick={onBack}>
          ‹ 뒤로
        </button>
        <span className="decor-balance">
          <b>{balance}</b> ⭐
        </span>
      </header>

      <div className="decor-themes">
        {THEMES.map((t) => (
          <button
            key={t.id}
            className={`decor-tab ${decor.theme === t.id ? "on" : ""}`}
            onClick={() => onSetTheme(t.id)}
          >
            {t.emoji} {t.name}
            {decor.completed.includes(t.id) && " ✓"}
          </button>
        ))}
      </div>

      <div
        className="decor-stage"
        style={{ background: `linear-gradient(160deg, ${theme.bg[0]}, ${theme.bg[1]})` }}
      >
        <div className="decor-grid">
          {theme.slots.map((slot) => {
            const idx = placed[slot.id];
            const filled = idx != null;
            const affordable = balance >= slot.cost;
            return (
              <button
                key={slot.id}
                className={`decor-slot ${filled ? "filled" : ""}`}
                onClick={() => !filled && setChoosing(slot)}
              >
                {filled ? (
                  <span className="ds-obj">{slot.options[idx]}</span>
                ) : (
                  <>
                    <span className="ds-plus">＋</span>
                    <span className="ds-name">{slot.name}</span>
                    <span className={`ds-cost ${affordable ? "" : "no"}`}>
                      {slot.cost} ⭐
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <p className="decor-hint">
        빈 자리를 눌러 별로 꾸며 보세요. 다 채우면 기념 사진을 받아요! 📸
      </p>

      {/* 오브젝트 3택 선택 */}
      {choosing && (
        <div className="sheet-backdrop" onClick={() => setChoosing(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grip" />
            <div className="sparks-hd">
              <span className="sparks-star">{theme.emoji}</span>
              <div>
                <b>{choosing.name} 고르기</b>
                <small>마음에 드는 걸 골라요 · {choosing.cost}⭐</small>
              </div>
              <span className="sparks-count">
                <b>{balance}</b> ⭐
              </span>
            </div>
            <div className="decor-options">
              {choosing.options.map((op, i) => (
                <button
                  key={i}
                  className="decor-option"
                  disabled={balance < choosing.cost}
                  onClick={() => pick(choosing, i)}
                >
                  <span className="do-emoji">{op}</span>
                </button>
              ))}
            </div>
            {balance < choosing.cost && (
              <p className="decor-need">
                별이 조금 더 필요해요! 미션을 하고 별을 모아 볼까요? ⭐
              </p>
            )}
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
                  dangerouslySetInnerHTML={{ __html: HELPER }}
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
            <p>멋진 {theme.name}을(를) 완성했어요. 다음 공간도 꾸며 볼까요?</p>
            <button className="mm-yes wide" onClick={() => setCelebrate(false)}>
              좋아!
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
