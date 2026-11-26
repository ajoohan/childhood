import { useEffect, useRef, useState } from "react";
import { allMissions, praiseFor, REWARD } from "../lib/missions.js";
import { streamChat } from "../lib/streamChat.js";
import { useSpeech } from "../lib/useSpeech.js";
import { robotMascot, robotHead } from "../lib/mascot.js";
import Confetti from "../components/Confetti.jsx";
import Dialog from "../components/Dialog.jsx";
import { aYa } from "../lib/josa.js";

// 별이와 짧게 이야기한 뒤 별을 받는 것들. kind: "mission"(한 일을 묻고 칭찬) | "greet"(아침 인사, 기분 묻기)
// 출석 버튼과 기본 미션 "AI와 아침 인사하기"는 실제로 별이와 인사를 나눠야 별을 받는다.
const GREET_MISSION_ID = "greet";
const ATTEND = { id: "__attend", emoji: "🌅", title: "출석 · AI와 아침 인사", kind: "greet", attend: true };

// 미션 확인에서 별이가 하는 질문
export const checkQuestion = (m, name) =>
  m.kind === "greet"
    ? `좋은 아침${name ? `, ${aYa(name)}` : ""}! 오늘 기분은 어때? 별이에게 인사해 줘!`
    : `"${m.title}" 미션, 어떻게 했는지 별이에게 알려 줄래?`;

const GREET_PRAISE = "좋은 아침! 인사해 줘서 고마워. 오늘도 즐겁게 보내자! ☀️";

// 오늘의 미션 보드 — 미션 수행 → AI 대화형 인증(별이가 묻고, 아이가 답하면 칭찬하며 확인) → 별 지급 → 꾸미기로 소모
// AI 확인은 하루 대화 횟수에 1번으로 센다. 횟수를 다 썼거나 연결이 안 되면 별은 그대로 주고 기본 칭찬을 보여 준다
// (아이가 실제로 한 일의 별을 잃지 않게).
export default function MissionBoard({
  name,
  rewards,
  parentMissions,
  persona,
  limitReached = false,
  onCountMessage,
  onSafety,
  onComplete,
  onClaimAttendance,
  onOpenChest,
  onCollection,
}) {
  const missions = allMissions(parentMissions);
  const doneCount = missions.filter((m) => rewards.doneToday.includes(m.id)).length;
  const [checking, setChecking] = useState(null); // 인증 대기 미션
  const [step, setStep] = useState("confirm"); // confirm | ask | reply
  const [answer, setAnswer] = useState("");
  const [reply, setReply] = useState("");
  const abortRef = useRef(null);
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      abortRef.current?.abort();
    };
  }, []);
  const speech = useSpeech({ onResult: (t) => setAnswer((a) => (a ? a + " " : "") + t.trim()) });
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
    openCheck(ATTEND);
  }

  function openCheck(raw) {
    const m = raw.kind ? raw : { ...raw, kind: raw.id === GREET_MISSION_ID ? "greet" : "mission" };
    setChecking(m);
    // 인사는 그 자리에서 하는 것이라 "정말 다 했나요?"를 묻지 않는다. 횟수를 다 썼으면 바로 별을 준다.
    if (m.kind === "greet") {
      if (limitReached) return confirmDone(m);
      setStep("ask");
    } else setStep("confirm");
    setAnswer("");
    setReply("");
  }

  function closeCheck() {
    abortRef.current?.abort();
    abortRef.current = null;
    if (speech.listening) speech.toggle();
    setChecking(null);
  }

  // 별 지급 + 칭찬. text가 없으면(AI 확인을 못 했으면) 기본 칭찬.
  function confirmDone(m, text) {
    setChecking(null);
    if (m.attend) {
      onClaimAttendance();
      setPraise({ text: text || GREET_PRAISE, reward: REWARD.attendance });
      return;
    }
    onComplete(m);
    const seed = m.id.split("").reduce((n, c) => n + c.charCodeAt(0), doneCount);
    const fallback = m.kind === "greet" ? GREET_PRAISE : praiseFor(name, seed);
    setPraise({ text: text || fallback, reward: m.reward || REWARD.mission });
  }

  function saidDone(m) {
    if (limitReached) return confirmDone(m); // 오늘 대화 횟수를 다 썼다 — 별은 준다
    setStep("ask");
  }

  async function sendAnswer(m) {
    const text = answer.trim();
    if (!text || step !== "ask") return;
    if (speech.listening) speech.toggle();
    setStep("reply");
    setReply("");
    onCountMessage?.();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let got = "";
    try {
      const greet = m.kind === "greet";
      got = await streamChat({
        body: {
          activityId: greet ? "morning_greet" : "mission_check",
          ...(greet ? {} : { mission: { title: m.title } }),
          messages: [{ role: "user", content: text }],
          profile: persona,
        },
        signal: ctrl.signal,
        onText: (t) => aliveRef.current && setReply(t),
        onSafety: (category) =>
          onSafety?.({
            t: new Date().toISOString(),
            activityId: greet ? "morning_greet" : "mission_check",
            activityTitle: greet ? "아침 인사" : `미션 확인 · ${m.title}`,
            category,
            text,
          }),
      });
    } catch {
      if (ctrl.signal.aborted) return; // 창을 닫았거나 화면을 나갔다 — 별을 주지 않는다
      got = ""; // 연결이 안 됐다 — 기본 칭찬으로 별은 준다
    }
    if (!aliveRef.current || abortRef.current !== ctrl) return;
    abortRef.current = null;
    confirmDone(m, got.trim());
  }

  return (
    <section className="missions mx">
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
          <small>{name ? `${aYa(name)}, 오늘도 도전!` : "오늘도 도전해 볼까?"}</small>
        </div>
        <span className="mb-balance">
          <b>{rewards.balance}</b> ⭐
        </span>
      </header>

      <div className="mb-progress game">
        <div className="mb-progress-bar">
          <i
            style={{
              width: `${missions.length ? (doneCount / missions.length) * 100 : 0}%`,
            }}
          />
          <b className="mb-progress-count">
            {doneCount}/{missions.length}
          </b>
        </div>
        {rewards.allClear && <span className="mb-allclear">올클리어! 🎉</span>}
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
                <button className="mb-do" onClick={() => openCheck(m)}>
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
        <Dialog onClose={closeCheck} label="미션 확인" className="mission-modal">
          <div className="mm-emoji">{checking.emoji}</div>
          <h2>{checking.title}</h2>
          {step === "confirm" && (
            <>
              <p>정말 다 했나요? AI 도우미가 확인해 줄게요!</p>
              <div className="mm-actions">
                <button className="mm-later" onClick={closeCheck}>
                  아직이요
                </button>
                <button className="mm-yes" onClick={() => saidDone(checking)}>
                  네, 다 했어요!
                </button>
              </div>
            </>
          )}
          {step !== "confirm" && (
            <div className="mm-chat">
              <div className="mm-bubble bot">
                <span className="mm-ava" dangerouslySetInnerHTML={{ __html: robotHead("happy") }} />
                <span>{checkQuestion(checking, name)}</span>
              </div>
              {step === "ask" ? (
                <>
                  <div className="mm-answer">
                    <input
                      type="text"
                      aria-label="별이에게 대답하기"
                      maxLength={300}
                      placeholder={
                        speech.listening ? "듣고 있어요…" : checking.kind === "greet" ? "별이에게 인사해 줘!" : "어떻게 했는지 말해 줘!"
                      }
                      value={speech.listening && speech.interim ? speech.interim : answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.nativeEvent.isComposing) sendAnswer(checking);
                      }}
                      autoFocus
                    />
                    {speech.supported && (
                      <button
                        className={`mm-mic ${speech.listening ? "on" : ""}`}
                        onClick={speech.toggle}
                        aria-label={speech.listening ? "그만 듣기" : "말로 대답하기"}
                      >
                        🎤
                      </button>
                    )}
                  </div>
                  <div className="mm-actions">
                    <button className="mm-later" onClick={closeCheck}>
                      나중에
                    </button>
                    <button className="mm-yes" disabled={!answer.trim()} onClick={() => sendAnswer(checking)}>
                      알려 주기
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mm-bubble user">{answer.trim()}</div>
                  <div className="mm-bubble bot" aria-live="polite">
                    <span className="mm-ava" dangerouslySetInnerHTML={{ __html: robotHead(reply ? "talking" : "thinking") }} />
                    <span>{reply || "별이가 확인하고 있어요…"}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </Dialog>
      )}

      {/* 칭찬 + 별 지급 모달 */}
      {praise && (
        <div className="modal-backdrop" onClick={() => setPraise(null)}>
          <Confetti />
          <div className="mission-modal praise" role="dialog" aria-modal="true" aria-label="별 받기" onClick={(e) => e.stopPropagation()}>
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
          <div className="mission-modal praise" role="dialog" aria-modal="true" aria-label="보물상자" onClick={(e) => e.stopPropagation()}>
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
