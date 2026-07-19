import { useState } from "react";
import { allMissions, praiseFor, REWARD } from "../lib/missions.js";
import { robotMascot, robotHead } from "../lib/mascot.js";
import Confetti from "../components/Confetti.jsx";

// 오늘의 미션 보드 — 미션 수행 → AI 대화형 인증(칭찬) → 별 지급 → 꾸미기로 소모
export default function MissionBoard({
  name,
  rewards,
  parentMissions,
  onComplete,
  onClaimAttendance,
  onOpenChest,
  onCollection,
}) {
  const missions = allMissions(parentMissions);
  const doneCount = missions.filter((m) => rewards.doneToday.includes(m.id)).length;
  const [checking, setChecking] = useState(null); // 인증 대기 미션
  const [praise, setPraise] = useState(null); // {text, reward}
  const [burst, setBurst] = useState(false); // 출석 등 짧은 컨페티
  const [chestReward, setChestReward] = useState(null); // 보물상자 개봉 결과

  function handleChest() {
    const r = onOpenChest && onOpenChest();
    if (r) {
      setChestReward(r);
      setBurst(true);
      setTimeout(() => setBurst(false), 2200);
    }
  }

  function claimAttend() {
    if (rewards.attendance) return;
    onClaimAttendance();
    setBurst(true);
    setTimeout(() => setBurst(false), 2200);
  }

  function confirmDone(m) {
    onComplete(m);
    const seed = m.id.split("").reduce((n, c) => n + c.charCodeAt(0), doneCount);
    setChecking(null);
    setPraise({ text: praiseFor(name, seed), reward: m.reward || REWARD.mission });
  }

  return (
    <section className="missions">
      {burst && <Confetti count={60} />}
      <header className="mb-hd">
        <span
          className="mb-mascot"
          dangerouslySetInnerHTML={{
            __html: robotHead(
              rewards.allClear ? "proud" : doneCount > 0 ? "excited" : "happy"
            ),
          }}
        />
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
        onClick={claimAttend}
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

      {/* 보물상자 — 오늘 미션을 모두 끝내면 열림 (하루 1회, 랜덤 보상) */}
      {rewards.allClear && (
        <button
          className={`mb-chest ${rewards.chestOpened ? "opened" : ""}`}
          onClick={handleChest}
          disabled={rewards.chestOpened}
        >
          <span className="mb-chest-emoji">{rewards.chestOpened ? "📭" : "🎁"}</span>
          <span className="mb-chest-body">
            <b>{rewards.chestOpened ? "오늘 보물상자 완료!" : "보물상자가 열렸어요!"}</b>
            <small>
              {rewards.chestOpened
                ? "내일 또 미션을 모두 끝내면 열 수 있어요"
                : "미션을 모두 끝낸 선물 · 눌러서 열어 봐!"}
            </small>
          </span>
          {!rewards.chestOpened && <span className="mb-chest-cta">열기</span>}
        </button>
      )}

      <button className="mb-decor" onClick={onCollection}>
        <span className="mb-decor-emoji">📦</span>
        <span className="mb-decor-body">
          <b>콜렉션 하러 가기</b>
          <small>모은 별로 꾸미고, 스티커를 모아요</small>
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
          <Confetti />
          <div className="mission-modal praise" onClick={(e) => e.stopPropagation()}>
            <span
              className="mm-robot"
              dangerouslySetInnerHTML={{ __html: robotMascot("excited") }}
            />
            <div className="star-burst">
              <span className="mm-star">⭐</span>
              {Array.from({ length: 8 }).map((_, i) => (
                <i key={i} className="sb" style={{ "--a": `${i * 45}deg` }} />
              ))}
            </div>
            <h2>+{praise.reward} 별!</h2>
            <p>{praise.text}</p>
            <button className="mm-yes wide" onClick={() => setPraise(null)}>
              좋아!
            </button>
          </div>
        </div>
      )}

      {/* 보물상자 개봉 결과 */}
      {chestReward && (
        <div className="modal-backdrop" onClick={() => setChestReward(null)}>
          <Confetti count={90} />
          <div className="mission-modal praise" onClick={(e) => e.stopPropagation()}>
            <div className="chest-reveal">
              <span className="chest-reveal-box">🎁</span>
              <span className="chest-reveal-prize">
                {chestReward.type === "star" ? "⭐" : chestReward.emoji}
              </span>
            </div>
            <h2>
              {chestReward.type === "star"
                ? `+${chestReward.amount} 별!`
                : `${chestReward.name} 스티커!`}
            </h2>
            <p>
              {chestReward.type === "star"
                ? "보물상자에서 별이 나왔어요! ✨"
                : "보물상자에서 스티커가 나왔어요! 콜렉션에 담겼어요."}
            </p>
            <button className="mm-yes wide" onClick={() => setChestReward(null)}>
              좋아!
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
