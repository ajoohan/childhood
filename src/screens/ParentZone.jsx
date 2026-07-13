import { useState } from "react";
import { SAFETY_LABEL } from "../lib/data.js";
import { userMsgCount, messagesToday, lastTime, fmtTime } from "../lib/store.js";

// Parent Zone — 성인 인증 게이트 뒤. 대시보드·시간통제·활동 로그·구독·연령.
export default function ParentZone({
  activities,
  histories,
  safety,
  settings,
  onBack,
  onSaveLimit,
  onSetAge,
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
  const rows = activities
    .map((a) => ({
      a,
      n: userMsgCount(histories[a.id]),
      last: lastTime(histories[a.id]),
    }))
    .filter((r) => r.n > 0)
    .sort((x, y) => y.n - x.n);

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
        <button className="back-btn" onClick={onBack} aria-label="닫기">
          ←
        </button>
        <div className="logo">부모 존</div>
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
                      {ev.activityTitle || ev.characterName || "활동"} 중
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
            오늘 <b>{messagesToday(histories)}</b>번 · 전체 <b>{total}</b>번 대화했어요.
          </p>
          {rows.length === 0 ? (
            <p className="guard-hint">아직 활동 기록이 없어요.</p>
          ) : (
            rows.map(({ a, n, last }) => (
              <div key={a.id} className="usage-item">
                <span className="usage-emoji">{a.emoji}</span>
                <span className="usage-name">{a.title}</span>
                <span className="usage-count">
                  {n}번{last ? ` · ${fmtTime(last)}` : ""}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="guard-card">
          <h3>🧒 자녀 연령 모드</h3>
          <div className="age-switch">
            {[
              { v: "young", label: "영유아", sub: "0–6세 · 부모와 함께" },
              { v: "kid", label: "초등", sub: "7–12세 · 아이 직접" },
            ].map((o) => (
              <button
                key={o.v}
                className={`age-opt ${settings.ageMode === o.v ? "on" : ""}`}
                onClick={() => onSetAge(o.v)}
              >
                <b>{o.label}</b>
                <span>{o.sub}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="guard-card">
          <h3>⏱️ 시간 통제</h3>
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
        </div>

        <div className="guard-card sub-card">
          <h3>💳 구독</h3>
          <p className="sub-lead">광고 없는 부모 구독</p>
          <p className="guard-hint">
            아이 대면 결제·광고 없이, 안전·시간통제·학습 인사이트를 제공하는 월
            구독이에요. 결제는 항상 부모가, 이 부모 존에서만 이뤄집니다.
          </p>
          <button className="guard-btn" disabled>
            준비 중 (무료 체험 예정)
          </button>
        </div>

        <div className="guard-card">
          <h3>🛡️ 안전 안내</h3>
          <ul className="guard-info">
            <li>AI는 '도우미 도구'로, 활동(이야기·학습·마음) 범위 안에서만 상호작용합니다.</li>
            <li>개방형 자유 대화·역할극, 아이 대면 결제, 광고는 제공하지 않습니다.</li>
            <li>모든 메시지는 안전 필터를 거치고, 위기 신호 시 1388을 안내합니다.</li>
            <li>대화·기록은 서버가 아니라 이 기기(브라우저)에만 저장됩니다.</li>
          </ul>
        </div>

        <div className="guard-card">
          <h3>🗑️ 기록 관리</h3>
          <button className="guard-btn danger" onClick={clearAll}>
            모든 기록 지우기
          </button>
        </div>
      </div>
    </section>
  );
}
