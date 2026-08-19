import { useState } from "react";
import { VOICES } from "./Speak.jsx";
import { MODE_LABEL } from "../lib/age.js";

// 설정 화면 — 부모 존 안(성인 인증 뒤)에서 앱 환경설정을 모아 관리한다.
// 효과음 · AI 목소리 · 시간 통제 · 부모 잠금(PIN) · 앱 정보 · 기록 관리.
export default function Settings({
  settings,
  version,
  onBack,
  onSetSound,
  onSetNotifyMissions,
  onSaveLimit,
  onSetVoice,
  onSetPin,
  onClear,
}) {
  const [limitInput, setLimitInput] = useState(
    settings.limitPerDay != null ? String(settings.limitPerDay) : ""
  );
  const [savedLimit, setSavedLimit] = useState("");

  // PIN 관리 상태
  const [pinEdit, setPinEdit] = useState(false);
  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [pinMsg, setPinMsg] = useState("");

  function saveLimit() {
    const v = limitInput.trim();
    const val = v ? Math.max(0, parseInt(v, 10) || 0) : null;
    onSaveLimit(val);
    setSavedLimit(val ? `하루 ${val}번으로 저장했어요.` : "제한 없음으로 저장했어요.");
  }

  function savePin() {
    const a = pin1.replace(/\D/g, "");
    const b = pin2.replace(/\D/g, "");
    if (a.length !== 4) {
      setPinMsg("숫자 4자리로 정해 주세요.");
      return;
    }
    if (a !== b) {
      setPinMsg("두 번 입력한 비밀번호가 달라요.");
      return;
    }
    onSetPin(a);
    setPinEdit(false);
    setPin1("");
    setPin2("");
    setPinMsg("부모 잠금을 저장했어요.");
  }

  function removePin() {
    if (!window.confirm("부모 잠금(PIN)을 해제할까요?")) return;
    onSetPin(null);
    setPinEdit(false);
    setPin1("");
    setPin2("");
    setPinMsg("잠금을 해제했어요.");
  }

  function clearAll() {
    if (!window.confirm("모든 대화·알림·설정 기록을 지울까요? 되돌릴 수 없어요.")) return;
    onClear();
    setLimitInput("");
    setSavedLimit("");
  }

  return (
    <section className="guard-screen">
      <header className="top-bar">
        <button className="back-btn" onClick={onBack} aria-label="뒤로">
          ←
        </button>
        <div className="logo">설정</div>
      </header>

      <div className="guard-scroll">
        {/* 효과음 */}
        <div className="guard-card">
          <h3>🔊 효과음</h3>
          <label className="sound-row">
            <span>버튼·성공 효과음</span>
            <button
              className={`toggle ${settings.sound ? "on" : ""}`}
              onClick={() => onSetSound(!settings.sound)}
              aria-label="효과음 켜기/끄기"
            >
              <span className="toggle-knob" />
            </button>
          </label>
          <p className="guard-hint">
            {settings.sound ? "켜짐 — 아이가 누를 때 부드러운 소리가 나요." : "꺼짐"}
          </p>
        </div>

        {/* 부모 알림 */}
        <div className="guard-card">
          <h3>
            🔔 부모 알림 <span className="push-pending-tag">푸시 발송 준비 중</span>
          </h3>
          <label className="sound-row">
            <span>커스텀 미션 완료 알림</span>
            <button
              className={`toggle ${settings.notifyMissions ? "on" : ""}`}
              onClick={() => onSetNotifyMissions(!settings.notifyMissions)}
              aria-label="미션 완료 알림 켜기/끄기"
            >
              <span className="toggle-knob" />
            </button>
          </label>
          <p className="guard-hint">
            {settings.notifyMissions
              ? "켜짐 — 아이가 알림이 켜진 미션을 완료하면 부모 존 알림함에 기록돼요."
              : "꺼짐 — 미션 완료 알림을 만들지 않아요."}{" "}
            폰으로 오는 앱 푸시는 서버 연결 후 제공될 예정이에요.
          </p>
        </div>

        {/* AI 목소리 */}
        <div className="guard-card">
          <h3>🎙️ AI 목소리</h3>
          <p className="guard-hint">
            음성 대화에서 AI 도우미가 사용할 목소리를 골라요.
          </p>
          <div className="set-voices">
            {VOICES.map((v) => (
              <button
                key={v.id}
                className={`voice-opt ${settings.voice === v.id ? "on" : ""}`}
                onClick={() => onSetVoice(v.id)}
              >
                <span className="vo-emoji">{v.emoji}</span>
                <span className="vo-body">
                  <b>{v.name}</b>
                  <small>{v.desc}</small>
                </span>
                <span className={`vo-radio ${settings.voice === v.id ? "on" : ""}`} />
              </button>
            ))}
          </div>
        </div>

        {/* 시간 통제 */}
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
              onChange={(e) => {
                setLimitInput(e.target.value);
                setSavedLimit("");
              }}
            />
          </label>
          <button className="guard-btn" onClick={saveLimit}>
            저장
          </button>
          {savedLimit && <p className="guard-hint">{savedLimit}</p>}
        </div>

        {/* 부모 잠금(PIN) */}
        <div className="guard-card">
          <h3>🔒 부모 잠금</h3>
          <p className="guard-hint">
            부모 존에 들어올 때 쓰는 4자리 비밀번호예요. 설정하면 아이가 혼자
            들어올 수 없어요.
          </p>

          {!pinEdit ? (
            <>
              <div className="set-pin-state">
                <span className={`set-pin-dot ${settings.pin ? "on" : ""}`} />
                <b>{settings.pin ? "잠금 사용 중" : "잠금 없음"}</b>
              </div>
              <div className="set-pin-actions">
                <button
                  className="guard-btn"
                  onClick={() => {
                    setPinEdit(true);
                    setPin1("");
                    setPin2("");
                    setPinMsg("");
                  }}
                >
                  {settings.pin ? "비밀번호 변경" : "비밀번호 설정"}
                </button>
                {settings.pin && (
                  <button className="guard-btn ghost" onClick={removePin}>
                    잠금 해제
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="set-pin-edit">
              <label className="prof-row">
                <span>새 비밀번호</span>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="숫자 4자리"
                  value={pin1}
                  onChange={(e) => setPin1(e.target.value.replace(/\D/g, "").slice(0, 4))}
                />
              </label>
              <label className="prof-row">
                <span>다시 입력</span>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="한 번 더"
                  value={pin2}
                  onChange={(e) => setPin2(e.target.value.replace(/\D/g, "").slice(0, 4))}
                />
              </label>
              <div className="set-pin-actions">
                <button className="guard-btn" onClick={savePin}>
                  저장
                </button>
                <button
                  className="guard-btn ghost"
                  onClick={() => {
                    setPinEdit(false);
                    setPinMsg("");
                  }}
                >
                  취소
                </button>
              </div>
            </div>
          )}
          {pinMsg && <p className="guard-hint">{pinMsg}</p>}
        </div>

        {/* 앱 정보 */}
        <div className="guard-card">
          <h3>ℹ️ 앱 정보</h3>
          <div className="set-info-row">
            <span>서비스</span>
            <b>
              Childhood · {MODE_LABEL[settings.ageMode]?.name || "영유아"}(
              {MODE_LABEL[settings.ageMode]?.range || MODE_LABEL.young.range})
            </b>
          </div>
          <div className="set-info-row">
            <span>버전</span>
            <b>v{version}</b>
          </div>
          <ul className="guard-info">
            <li>AI는 '도우미 도구'로, 활동 범위 안에서만 상호작용합니다.</li>
            <li>개방형 자유 대화·역할극, 아이 대면 결제, 광고는 없습니다.</li>
            <li>모든 메시지는 안전 필터를 거치고, 위기 신호 시 1388을 안내합니다.</li>
            <li>대화·기록은 서버가 아니라 이 기기(브라우저)에만 저장됩니다.</li>
          </ul>
        </div>

        {/* 기록 관리 */}
        <div className="guard-card">
          <h3>🗑️ 기록 관리</h3>
          <p className="guard-hint">
            모든 대화·알림·설정을 지우고 처음 상태로 되돌려요. 되돌릴 수 없어요.
          </p>
          <button className="guard-btn danger" onClick={clearAll}>
            모든 기록 지우기
          </button>
        </div>
      </div>
    </section>
  );
}
