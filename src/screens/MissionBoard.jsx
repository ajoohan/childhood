import { useState } from "react";
import { allMissions, praiseFor, REWARD } from "../lib/missions.js";

// 오늘의 미션 보드 — 미션 수행 → AI 대화형 인증(칭찬) → 별 지급 → 꾸미기로 소모
export default function MissionBoard({
  name,
  rewards,
  parentMissions,
  onComplete,
  onClaimAttendance,
  onDecor,
}) {
  const missions = allMissions(parentMissions);
  const doneCount = missions.filter((m) => rewards.doneToday.includes(m.id)).length;
  const [checking, setChecking] = useState(null); // 인증 대기 미션
  const [praise, setPraise] = useState(null); // {text, reward}

  function confirmDone(m) {
    onComplete(m);
    const seed = m.id.split("").reduce((n, c) => n + c.charCodeAt(0), doneCount);
    setChecking(null);
    setPraise({ text: praiseFor(name, seed), reward: m.reward || REWARD.mission });
  }

  return (
    <section className="missions">
      <header className="mb-hd">
        <div>
          <b>🎯 오늘의 미션</b>
          <small>{name ? `${name}야, 오늘도 도전!` : "오늘도 도전해 볼까?"}</small>
        </div>
        <span className="mb-balance">
          <b>{rewards.balance}</b> ⭐
        </span>
      </header>

      <div className="mb-progress">
        <div className="mb-progress-bar">
          <i
            style={{
              width: `${missions.length ? (doneCount / missions.length) * 100 : 0}%`,
            }}
          />
        </div>
        <span>
          {doneCount}/{missions.length} 완료
          {rewards.allClear && " · 올클리어! 🎉"}
        </span>
      </div>

      {/* 출석 + AI 첫인사 (하루 1회 +1) */}
      <button
        className={`mb-attend ${rewards.attendance ? "done" : ""}`}
        onClick={() => !rewards.attendance && onClaimAttendance()}
        disabled={rewards.attendance}
      >
        <span className="mb-att-emoji">🌅</span>
        <span className="mb-att-body">
          <b>출석 · AI와 아침 인사</b>
          <small>{rewards.attendance ? "오늘 인사 완료!" : "인사하고 별 받기"}</small>
        </span>
        <span className="mb-att-reward">
          {rewards.attendance ? "✓" : `+${REWARD.attendance} ⭐`}
        </span>
      </button>

      <div className="mb-list">
        {missions.map((m) => {
          const done = rewards.doneToday.includes(m.id);
          return (
            <div key={m.id} className={`mb-item ${done ? "done" : ""}`}>
              <span className="mb-emoji">{m.emoji}</span>
              <span className="mb-body">
                <b>{m.title}</b>
                <small>+{m.reward || REWARD.mission} ⭐</small>
              </span>
              {done ? (
                <span className="mb-check">완료 ✓</span>
              ) : (
                <button className="mb-do" onClick={() => setChecking(m)}>
                  완료하기
                </button>
              )}
            </div>
          );
        })}
      </div>

      <button className="mb-decor" onClick={onDecor}>
        <span className="mb-decor-emoji">🏠</span>
        <span className="mb-decor-body">
          <b>별로 내 방 꾸미기</b>
          <small>모은 별로 나만의 공간을 꾸며요</small>
        </span>
        <span className="mb-decor-arrow">›</span>
      </button>

      {/* AI 인증 확인 모달 */}
      {checking && (
        <div className="modal-backdrop" onClick={() => setChecking(null)}>
          <div className="mission-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mm-emoji">{checking.emoji}</div>
            <h2>{checking.title}</h2>
            <p>정말 다 했나요? AI 도우미가 확인해 줄게요!</p>
            <div className="mm-actions">
              <button className="mm-later" onClick={() => setChecking(null)}>
                아직이요
              </button>
              <button className="mm-yes" onClick={() => confirmDone(checking)}>
                네, 다 했어요!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 칭찬 + 별 지급 모달 */}
      {praise && (
        <div className="modal-backdrop" onClick={() => setPraise(null)}>
          <div className="mission-modal praise" onClick={(e) => e.stopPropagation()}>
            <div className="mm-star">⭐</div>
            <h2>+{praise.reward} 별!</h2>
            <p>{praise.text}</p>
            <button className="mm-yes wide" onClick={() => setPraise(null)}>
              좋아!
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
