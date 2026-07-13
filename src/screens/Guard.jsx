import { useState } from "react";
import Avatar from "../components/Avatar.jsx";
import { SAFETY_LABEL } from "../lib/data.js";
import { userMsgCount, messagesToday, lastTime, fmtTime } from "../lib/store.js";

export default function Guard({
  characters,
  histories,
  safety,
  settings,
  onBack,
  onSaveLimit,
  onClear,
}) {
  const [limitInput, setLimitInput] = useState(
    settings.limitPerDay != null ? String(settings.limitPerDay) : ""
  );
  const [saved, setSaved] = useState("");

  const total = Object.values(histories).reduce(
    (n, h) => n + h.filter((m) => m.role === "user").length,
    0
  );
  const rows = characters
    .map((c) => ({
      c,
      n: userMsgCount(histories[c.id]),
      last: lastTime(histories[c.id]),
    }))
    .sort((a, b) => b.n - a.n);

  function saveLimit() {
    const v = limitInput.trim();
    const val = v ? Math.max(0, parseInt(v, 10) || 0) : null;
    onSaveLimit(val);
    setSaved(val ? `하루 ${val}번으로 저장했어요.` : "제한 없음으로 저장했어요.");
  }

  function clearAll() {
    if (!window.confirm("모든 대화·알림·설정 기록을 지울까요? 되돌릴 수 없어요.")) return;
    onClear();
    setLimitInput("");
    setSaved("");
  }

  return (
    <section className="guard-screen">
      <header className="top-bar">
        <button className="back-btn" onClick={onBack} aria-label="홈으로">
          ←
        </button>
        <div className="logo">보호자 대시보드</div>
      </header>

      <div className="guard-scroll">
        <div className="guard-card alert-card">
          <h3>🔔 안전 알림</h3>
          <p className="guard-hint">
            아이가 개인정보를 말하려 하거나, 부적절한 요청·마음의 어려움 신호가
            감지되면 여기에 기록돼요.
          </p>
          {safety.length === 0 ? (
            <p className="guard-empty">아직 특별한 알림이 없어요. 👍</p>
          ) : (
            safety.slice(0, 30).map((ev, i) => {
              const label = SAFETY_LABEL[ev.category] || {
                icon: "⚠️",
                name: "알림",
                cls: "warn",
                tip: "",
              };
              return (
                <div key={i} className={`alert-item ${label.cls}`}>
                  <span className="alert-icon">{label.icon}</span>
                  <div className="alert-body">
                    <div className="alert-top">
                      <b>{label.name}</b>
                      <span className="alert-time">{fmtTime(ev.t)}</span>
                    </div>
                    <div className="alert-meta">
                      {ev.characterName || ""}와의 대화
                    </div>
                    <div className="alert-text">"{ev.text || ""}"</div>
                    {label.tip && <div className="alert-tip">{label.tip}</div>}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="guard-card">
          <h3>📊 사용 현황</h3>
          <p className="usage-summary">
            오늘 <b>{messagesToday(histories)}</b>번 · 전체 <b>{total}</b>번
            대화했어요.
          </p>
          {rows.map(({ c, n, last }) => (
            <div key={c.id} className="usage-item">
              <span
                className="usage-ava"
                style={{
                  background: `linear-gradient(160deg,#fff,${c.theme[0]})`,
                }}
              >
                <Avatar character={c} />
              </span>
              <span className="usage-name">{c.name}</span>
              <span className="usage-count">
                {n}번{last ? ` · ${fmtTime(last)}` : ""}
              </span>
            </div>
          ))}
        </div>

        <div className="guard-card">
          <h3>⏱️ 이용 설정</h3>
          <label className="limit-row">
            <span>하루 대화 횟수 제한</span>
            <input
              type="number"
              min="0"
              inputMode="numeric"
              placeholder="비우면 제한 없음"
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
            />
          </label>
          <button className="guard-btn" onClick={saveLimit}>
            저장
          </button>
          {saved && <p className="guard-hint">{saved}</p>}
          <p className="guard-hint">
            아이가 하루에 보낼 수 있는 메시지 수예요. 서버에도 별도의 안전 한도가
            있습니다.
          </p>
        </div>

        <div className="guard-card">
          <h3>🛡️ 안전 안내</h3>
          <ul className="guard-info">
            <li>세이프 모드(어린이 보호 모드)는 항상 켜져 있으며 끌 수 없습니다.</li>
            <li>
              모든 메시지는 안전 필터를 거치고, 모든 캐릭터에 동일한 보호 원칙이
              적용됩니다.
            </li>
            <li>AI는 개인정보를 묻지 않으며, 아이가 공유하려 하면 하지 않도록 안내합니다.</li>
            <li>위기 신호가 감지되면 믿을 수 있는 어른과 청소년 상담전화 1388을 안내합니다.</li>
            <li>AI의 답변은 완벽하지 않을 수 있습니다. 보호자의 관심과 함께 사용해 주세요.</li>
          </ul>
        </div>

        <div className="guard-card">
          <h3>🗑️ 기록 관리</h3>
          <p className="guard-hint">
            대화·알림·설정은 서버가 아니라 <b>이 기기(브라우저)에만</b> 저장됩니다.
            언제든 지울 수 있어요.
          </p>
          <button className="guard-btn danger" onClick={clearAll}>
            모든 기록 지우기
          </button>
        </div>
      </div>
    </section>
  );
}
