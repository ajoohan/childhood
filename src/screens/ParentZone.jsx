import { useState } from "react";
import { SAFETY_LABEL, INTERESTS } from "../lib/data.js";
import { MISSION_EMOJIS } from "../lib/missions.js";
import {
  userMsgCount,
  messagesToday,
  lastTime,
  fmtTime,
  orphanHistories,
} from "../lib/store.js";
import { computeAge, ageModeForProfile, MODE_LABEL, CHILD_MIN } from "../lib/age.js";

const NOW = new Date();
const CUR_YEAR = NOW.getFullYear();
const BIRTH_YEARS = Array.from({ length: 14 }, (_, i) => CUR_YEAR - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

// Parent Zone — 성인 인증 게이트 뒤. 대시보드·시간통제·활동 로그·구독·연령·미션.
export default function ParentZone({
  activities,
  histories,
  safety,
  settings,
  profile,
  rewards,
  parentMissions,
  onAddMission,
  onRemoveMission,
  onBack,
  onSettings,
  onSaveProfile,
}) {
  const [mTitle, setMTitle] = useState("");
  const [mEmoji, setMEmoji] = useState(MISSION_EMOJIS[0]);
  const [mReward, setMReward] = useState(2);

  function addMission() {
    const title = mTitle.trim().slice(0, 30);
    if (!title) return;
    onAddMission({
      id: "p_" + Math.random().toString(36).slice(2, 9),
      emoji: mEmoji,
      title,
      reward: Math.max(1, Math.min(10, parseInt(mReward, 10) || 2)),
    });
    setMTitle("");
    setMEmoji(MISSION_EMOJIS[0]);
    setMReward(2);
  }
  const prof = profile || { name: "", birthYear: null, birthMonth: null, interests: [] };
  const [nameInput, setNameInput] = useState(prof.name || "");
  const [yearInput, setYearInput] = useState(prof.birthYear ? String(prof.birthYear) : "");
  const [monthInput, setMonthInput] = useState(prof.birthMonth ? String(prof.birthMonth) : "");
  const [picked, setPicked] = useState(prof.interests || []);
  const [profSaved, setProfSaved] = useState("");

  // 현재 프로필로 계산한 만 나이와 연령 모드 (미리보기용)
  const previewProfile = {
    birthYear: yearInput ? parseInt(yearInput, 10) : null,
    birthMonth: monthInput ? parseInt(monthInput, 10) : null,
    age: prof.age,
  };
  const curAge = computeAge(previewProfile, NOW);
  const curMode = ageModeForProfile(previewProfile, NOW);

  function toggleInterest(id) {
    setPicked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setProfSaved("");
  }
  function saveProfile() {
    const name = nameInput.trim().slice(0, 20);
    const birthYear = yearInput ? parseInt(yearInput, 10) : null;
    const birthMonth = monthInput ? parseInt(monthInput, 10) : null;
    const age = birthYear ? computeAge({ birthYear, birthMonth }, NOW) : null;
    onSaveProfile({ name, birthYear, birthMonth, age, interests: picked });
    setProfSaved("프로필을 저장했어요.");
  }

  const total = Object.values(histories).reduce(
    (n, h) => n + h.filter((m) => m.role === "user").length,
    0
  );
  // 현재 목록에 없는 id의 지난 세션도 사용 현황에 포함한다.
  const rows = activities
    .map((a) => ({
      a,
      n: userMsgCount(histories[a.id]),
      last: lastTime(histories[a.id]),
    }))
    .filter((r) => r.n > 0)
    .concat(orphanHistories(activities, histories))
    .sort((x, y) => y.n - x.n);

  return (
    <section className="guard-screen">
      <header className="top-bar">
        <button className="back-btn" onClick={onBack} aria-label="닫기">
          ←
        </button>
        <div className="logo">부모 존</div>
        <button className="settings-btn" onClick={onSettings} aria-label="설정">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </header>

      <div className="guard-scroll">
        <div className="guard-card">
          <h3>🧒 아이 프로필</h3>
          <p className="guard-hint">
            온보딩에서 입력한 이름·나이·관심사예요. AI가 활동 안에서 이 정보를
            참고해 아이에게 맞춰 줍니다. 언제든 수정할 수 있어요.
          </p>
          <label className="prof-row">
            <span>이름</span>
            <input
              type="text"
              maxLength={20}
              placeholder="아이 이름"
              value={nameInput}
              onChange={(e) => {
                setNameInput(e.target.value);
                setProfSaved("");
              }}
            />
          </label>
          <label className="prof-row">
            <span>태어난 해</span>
            <select
              value={yearInput}
              onChange={(e) => {
                setYearInput(e.target.value);
                setProfSaved("");
              }}
            >
              <option value="">선택</option>
              {BIRTH_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}년 (만 {CUR_YEAR - y}살 무렵)
                </option>
              ))}
            </select>
          </label>
          <label className="prof-row">
            <span>태어난 달</span>
            <select
              value={monthInput}
              onChange={(e) => {
                setMonthInput(e.target.value);
                setProfSaved("");
              }}
            >
              <option value="">모름</option>
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m}월
                </option>
              ))}
            </select>
          </label>
          {curAge != null && (
            <div className={`mode-preview ${curMode}`}>
              <b>
                만 {curAge}살 · {MODE_LABEL[curMode].name} 모드(
                {MODE_LABEL[curMode].range})
              </b>
              <span>
                {curMode === "young"
                  ? `만 ${CHILD_MIN}세가 되면 아동 모드로 자동 전환돼요.`
                  : "아이 스스로 탐구하는 아동 모드예요."}
              </span>
            </div>
          )}
          <div className="prof-interests-label">관심사</div>
          <div className="prof-chips">
            {INTERESTS.map((it) => (
              <button
                key={it.id}
                className={`prof-chip ${picked.includes(it.id) ? "on" : ""}`}
                onClick={() => toggleInterest(it.id)}
              >
                <span>{it.emoji}</span> {it.label}
              </button>
            ))}
          </div>
          <button className="guard-btn" onClick={saveProfile}>
            프로필 저장
          </button>
          {profSaved && <p className="guard-hint">{profSaved}</p>}
        </div>

        <div className="guard-card">
          <h3>🎯 미션 관리</h3>
          <p className="guard-hint">
            아이에게 줄 미션을 직접 추가해요. "장난감 정리하기"처럼 잔소리 대신
            AI와의 즐거운 미션으로 바꿔 주세요. 완료하면 아이가 별을 받아요.
          </p>

          {rewards && (
            <p className="usage-summary">
              오늘 획득 <b>{rewards.earnedToday}</b>⭐ · 현재 잔액{" "}
              <b>{rewards.balance}</b>⭐
            </p>
          )}

          {(parentMissions || []).length > 0 &&
            parentMissions.map((m) => (
              <div key={m.id} className="mission-row">
                <span className="mr-emoji">{m.emoji}</span>
                <span className="mr-title">{m.title}</span>
                <span className="mr-reward">+{m.reward}⭐</span>
                <button
                  className="mr-del"
                  onClick={() => onRemoveMission(m.id)}
                  aria-label="삭제"
                >
                  ✕
                </button>
              </div>
            ))}

          <div className="mission-add">
            <div className="ma-emojis">
              {MISSION_EMOJIS.map((e) => (
                <button
                  key={e}
                  className={`ma-emoji ${mEmoji === e ? "on" : ""}`}
                  onClick={() => setMEmoji(e)}
                >
                  {e}
                </button>
              ))}
            </div>
            <div className="ma-row">
              <input
                type="text"
                maxLength={30}
                placeholder="예: 장난감 정리하기"
                value={mTitle}
                onChange={(e) => setMTitle(e.target.value)}
              />
              <select value={mReward} onChange={(e) => setMReward(e.target.value)}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    +{n}⭐
                  </option>
                ))}
              </select>
            </div>
            <button className="guard-btn" onClick={addMission}>
              미션 추가
            </button>
          </div>
        </div>

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
          <p className="guard-hint">
            연령 모드는 아이 생일에 따라 <b>자동으로</b> 정해져요. 만{" "}
            {CHILD_MIN}세가 되면 영유아 버전에서 아동 버전으로 자연스럽게
            전환됩니다.
          </p>
          <div className="age-switch">
            {["young", "kid"].map((v) => {
              const m = MODE_LABEL[v];
              return (
                <div
                  key={v}
                  className={`age-opt readonly ${settings.ageMode === v ? "on" : ""}`}
                >
                  <b>{m.name}</b>
                  <span>
                    {m.range} · {m.sub}
                  </span>
                  {settings.ageMode === v && <span className="age-now">지금 여기</span>}
                </div>
              );
            })}
          </div>
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

        <button className="guard-settings-link" onClick={onSettings}>
          <span className="gsl-ic">⚙️</span>
          <span className="gsl-body">
            <b>설정</b>
            <small>효과음 · AI 목소리 · 시간 통제 · 부모 잠금 · 기록 관리</small>
          </span>
          <span className="gsl-arw">›</span>
        </button>
      </div>
    </section>
  );
}
