import { useEffect, useRef, useState } from "react";
import { robotMascot, robotHead } from "../lib/mascot.js";
import { useSpeech } from "../lib/useSpeech.js";
import { messagesToday } from "../lib/store.js";

// 음성 목소리 프리셋 (브라우저 TTS의 pitch/rate로 개성 부여)
export const VOICES = [
  { id: "shimmer", name: "반짝이", emoji: "🤖", desc: "밝고 또랑또랑한 목소리", pitch: 1.15, rate: 1.02 },
  { id: "echo", name: "부엉이", emoji: "🦉", desc: "차분하고 다정한 목소리", pitch: 0.9, rate: 0.95 },
  { id: "coral", name: "코랄", emoji: "🧭", desc: "명랑하고 활기찬 목소리", pitch: 1.3, rate: 1.06 },
];

// 말하기 + 자막(캡션). onBoundary(charIndex)로 지금 읽는 위치를 알려 가라오케 자막을 만든다.
function speak(text, voiceId, { onBoundary, onEnd } = {}) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return onEnd && onEnd();
    const v = VOICES.find((x) => x.id === voiceId) || VOICES[0];
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR";
    u.pitch = v.pitch;
    u.rate = v.rate;
    if (onBoundary)
      u.onboundary = (e) => onBoundary(typeof e.charIndex === "number" ? e.charIndex : 0);
    if (onEnd) u.onend = onEnd;
    synth.cancel();
    synth.speak(u);
  } catch {
    onEnd && onEnd();
  }
}

function Bubble({ role, children, typing, expr = "happy" }) {
  return (
    <div className={`message ${role}`}>
      <div className="avatar">
        {role === "bot" ? (
          <span
            className="ava-svg"
            dangerouslySetInnerHTML={{ __html: robotHead(expr) }}
          />
        ) : (
          "🙂"
        )}
      </div>
      <div className={`bubble ${typing ? "typing" : ""}`}>{children}</div>
    </div>
  );
}

// 스피크 — 음성 위주(통화식)와 텍스트 챗을 하나로 합친 화면.
// 10세 미만 디폴트=음성, 10세 이상 디폴트=텍스트 (기획서 3장).
// 두 모드는 동일한 대화 스코프(learn_ask)·기록을 공유해 동선이 헷갈리지 않는다.
export default function Speak({
  activity,
  history,
  histories,
  settings,
  persona,
  voice,
  defaultMode = "voice",
  onSetVoice,
  onUserMessage,
  onBotMessage,
  onSafety,
  onBack,
}) {
  const [mode, setMode] = useState(defaultMode); // voice | text
  const [status, setStatus] = useState("idle"); // idle|thinking|speaking
  const [lastSaid, setLastSaid] = useState("");
  const [reply, setReply] = useState("");
  const [capIdx, setCapIdx] = useState(0); // 자막에서 지금까지 읽은 글자 수
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true); // 통화 바 스피커(응답 소리) on/off
  const [notice, setNotice] = useState(null); // 시간제한 등 안내
  // 텍스트 모드 상태
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(null);
  const busyRef = useRef(false);
  const recRef = useRef(null);
  const chatRef = useRef(null);
  const inputRef = useRef(null);

  const curVoice = VOICES.find((v) => v.id === voice) || VOICES[0];

  // 텍스트 모드: 새 메시지에 맞춰 스크롤
  useEffect(() => {
    if (mode === "text" && chatRef.current)
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [history, streaming, notice, mode]);

  // 모드 전환 시 진행 중인 음성 출력 정리
  function switchMode(next) {
    try {
      window.speechSynthesis && window.speechSynthesis.cancel();
    } catch {}
    if (speech.listening) speech.toggle();
    setStatus("idle");
    setStreaming(null);
    setMode(next);
  }

  function endCall() {
    try {
      window.speechSynthesis && window.speechSynthesis.cancel();
    } catch {}
    onBack();
  }

  // 하루 대화 제한 (부모 설정) — 두 모드 공통
  function limitReached() {
    const limit = settings?.limitPerDay;
    if (limit && messagesToday(histories) >= limit) {
      setNotice(
        `오늘은 이야기를 ${limit}번이나 나눴대! 오늘은 여기까지 하고 내일 또 만나자 😊`
      );
      return true;
    }
    return false;
  }

  // 브라우저 음성인식 미지원 기기 → 녹음 후 서버 STT로 받아쓰기 (폴백)
  async function toggleRecord() {
    if (recording) {
      try {
        recRef.current && recRef.current.stop();
      } catch {}
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks = [];
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setStatus("thinking");
        try {
          const blob = new Blob(chunks, { type: mr.mimeType || "audio/webm" });
          const buf = await blob.arrayBuffer();
          let bin = "";
          const bytes = new Uint8Array(buf);
          for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
          const b64 = btoa(bin);
          const res = await fetch("/api/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio: b64, mime: blob.type }),
          });
          const j = await res.json().catch(() => ({}));
          if (j.text) converse(j.text);
          else {
            setStatus("idle");
            setLastSaid(j.error || "받아쓰기가 아직 준비 중이에요.");
          }
        } catch {
          setStatus("idle");
          setLastSaid("받아쓰기에 실패했어요.");
        }
      };
      recRef.current = mr;
      mr.start();
      setRecording(true);
      setStatus("idle");
    } catch {
      setLastSaid("마이크를 사용할 수 없어요. 권한을 확인해 주세요.");
    }
  }

  const speech = useSpeech({
    onResult: (t) => converse(t),
  });

  // 공용 대화 함수 — 음성/텍스트 모드가 같은 스코프·기록을 공유한다.
  async function converse(text) {
    const trimmed = (text || "").trim();
    if (!trimmed || busyRef.current || !activity) return;
    if (limitReached()) return;
    busyRef.current = true;
    setNotice(null);
    setLastSaid(trimmed);
    setReply("");
    setStatus("thinking");
    if (mode === "text") setStreaming("");

    const userMsg = { role: "user", content: trimmed, t: new Date().toISOString() };
    onUserMessage(activity.id, userMsg);
    const outgoing = [...(history || []), userMsg];

    let acc = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId: activity.id,
          messages: outgoing,
          profile: persona,
        }),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const d = line.slice(6);
          if (d === "[DONE]") continue;
          const obj = JSON.parse(d);
          if (obj.safety) {
            onSafety({
              t: new Date().toISOString(),
              activityId: activity.id,
              activityTitle: activity.title,
              category: obj.safety,
              text: trimmed,
            });
            continue;
          }
          acc += obj.text || "";
          setReply(acc);
          if (mode === "text") setStreaming(acc);
        }
      }
    } catch {
      acc = acc || "앗, 잠깐 연결이 끊겼어. 다시 말해 줄래?";
      setReply(acc);
    }

    onBotMessage(activity.id, { role: "assistant", content: acc });
    setStreaming(null);

    // 음성 모드 + 스피커 켜짐이면 소리로 읽어 준다 (자막 동기화)
    if (mode === "voice" && speakerOn) {
      setStatus("speaking");
      setCapIdx(0);
      speak(acc, voice, {
        onBoundary: (ci) => setCapIdx(ci),
        onEnd: () => {
          setCapIdx(acc.length);
          setStatus("idle");
          busyRef.current = false;
        },
      });
    } else {
      setStatus("idle");
      busyRef.current = false;
      if (mode === "text" && inputRef.current) inputRef.current.focus();
    }
  }

  function sendText() {
    const t = input.trim();
    if (!t) return;
    setInput("");
    converse(t);
  }

  const statusText = notice
    ? "오늘은 여기까지! 내일 또 만나요"
    : speech.listening
      ? "듣고 있어요…"
      : status === "thinking"
        ? "생각 중이에요…"
        : status === "speaking"
          ? `${curVoice.name}가 이야기하고 있어요`
          : "마이크를 누르고 말해 봐!";

  const mascotExpr = notice
    ? "sleepy"
    : status === "thinking"
      ? "thinking"
      : status === "speaking"
        ? "talking"
        : speech.listening
          ? "wow"
          : "happy";

  // ── 텍스트 챗 모드 ──
  if (mode === "text") {
    return (
      <section className="chat-screen session speak-text">
        <header className="header">
          <button className="back-btn" onClick={onBack} aria-label="뒤로">
            ←
          </button>
          <div className="header-star">
            <span
              className="ava-svg"
              dangerouslySetInnerHTML={{
                __html: robotHead(
                  notice
                    ? "sleepy"
                    : streaming === ""
                      ? "thinking"
                      : streaming
                        ? "talking"
                        : "happy"
                ),
              }}
            />
          </div>
          <div className="header-text">
            <h1>💬 스피크</h1>
            <p>별이가 도와줄게 · AI 도우미</p>
          </div>
          <button
            className="speak-mode-btn"
            onClick={() => switchMode("voice")}
            aria-label="음성으로 전환"
            title="음성으로 전환"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M6 11a6 6 0 0 0 12 0M12 17v3" />
            </svg>
          </button>
        </header>

        <main className="chat" ref={chatRef}>
          <div className="ai-note">🤖 나는 AI 도우미예요. 진짜 사람은 아니에요!</div>
          {activity && <Bubble role="bot" expr="love">{activity.greeting}</Bubble>}
          {(history || []).map((m, i) => (
            <Bubble key={i} role={m.role === "user" ? "user" : "bot"}>
              {m.content}
            </Bubble>
          ))}
          {streaming !== null && (
            <Bubble
              role="bot"
              typing={streaming === ""}
              expr={streaming === "" ? "thinking" : "talking"}
            >
              {streaming || "생각 중이에요"}
            </Bubble>
          )}
          {notice && (
            <Bubble role="bot" expr="sleepy">
              {notice}
            </Bubble>
          )}
        </main>

        <footer className="composer">
          <button
            className="mic-btn"
            onClick={() => switchMode("voice")}
            aria-label="음성 대화로 전환"
            title="음성 대화로 전환"
          >
            🎤
          </button>
          <input
            ref={inputRef}
            type="text"
            maxLength={1000}
            placeholder="하고 싶은 말을 써 봐!"
            autoComplete="off"
            value={input}
            disabled={streaming !== null}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) sendText();
            }}
          />
          <button onClick={sendText} disabled={streaming !== null} aria-label="보내기">
            보내기 🚀
          </button>
        </footer>
      </section>
    );
  }

  // ── 음성 통화 모드 ──
  return (
    <section className="voice-mode">
      <header className="voice-top">
        <button className="voice-back" onClick={onBack}>
          ‹ 뒤로
        </button>
        <button className="voice-pick" onClick={() => setPickerOpen(true)}>
          {curVoice.emoji} 목소리 고르기
        </button>
      </header>

      <div className="voice-stage">
        <span
          className={`voice-robot ${status === "speaking" ? "talking" : ""}`}
          dangerouslySetInnerHTML={{ __html: robotMascot(mascotExpr) }}
        />
        <div className="voice-note">🤖 나는 AI 도우미예요. 진짜 사람은 아니에요!</div>
        <h1 className="voice-status">{statusText}</h1>

        {/* 자막(캡션) — 아이가 읽기 쉽게 */}
        {(speech.listening || recording) && (
          <div className="caption caption-in">
            <span className="cap-label">🎤 내가 한 말</span>
            <p className="cap-text">
              {speech.interim || (recording ? "듣고 있어요…" : "…")}
              <span className="voice-caret" />
            </p>
          </div>
        )}

        {status === "speaking" && reply && (
          <div className="caption caption-out">
            <span className="cap-label">🔊 {curVoice.name}가 하는 말</span>
            <p className="cap-text">
              <span className="cap-spoken">{reply.slice(0, capIdx)}</span>
              <span className="cap-rest">{reply.slice(capIdx)}</span>
            </p>
          </div>
        )}

        {status !== "speaking" && !speech.listening && !recording && lastSaid && (
          <p className="voice-said">“{lastSaid}”</p>
        )}
        {status === "idle" && reply && <p className="voice-reply">{reply}</p>}
        {notice && <p className="voice-reply">{notice}</p>}
      </div>

      {/* 통화식 컨트롤 바 — 스피커 · 마이크 · 텍스트 전환 · 종료 */}
      <div className="call-bar">
        <button
          className={`call-btn ${speakerOn ? "" : "off"}`}
          onClick={() => {
            if (speakerOn) {
              try {
                window.speechSynthesis && window.speechSynthesis.cancel();
              } catch {}
              if (status === "speaking") {
                setStatus("idle");
                busyRef.current = false;
              }
            }
            setSpeakerOn(!speakerOn);
          }}
          aria-label={speakerOn ? "소리 끄기" : "소리 켜기"}
          title={speakerOn ? "소리 끄기" : "소리 켜기"}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5L6 9H3v6h3l5 4z" />
            {speakerOn ? (
              <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 6a9 9 0 0 1 0 12" />
            ) : (
              <path d="M16 9l5 6M21 9l-5 6" />
            )}
          </svg>
        </button>

        {speech.supported ? (
          <button
            className={`call-btn mic ${speech.listening ? "on" : ""}`}
            onClick={speech.toggle}
            disabled={status === "thinking" || status === "speaking"}
            aria-label="말하기"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M6 11a6 6 0 0 0 12 0M12 17v3" />
            </svg>
          </button>
        ) : (
          <button
            className={`call-btn mic ${recording ? "on" : ""}`}
            onClick={toggleRecord}
            disabled={status === "thinking" || status === "speaking"}
            aria-label="녹음해서 말하기"
          >
            {recording ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="7" y="7" width="10" height="10" rx="2" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M6 11a6 6 0 0 0 12 0M12 17v3" />
              </svg>
            )}
          </button>
        )}

        <button
          className="call-btn"
          onClick={() => switchMode("text")}
          aria-label="글자로 이야기하기"
          title="글자로 이야기하기"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12a8 8 0 0 1-8 8H5l-2 2V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z" />
            <path d="M8 11h8M8 15h5" />
          </svg>
        </button>

        <button className="call-btn end" onClick={endCall} aria-label="대화 끝내기">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 14c5-4.5 11-4.5 16 0l-2.5 3c-1-.7-2-1.3-3-1.6l-.5-2.9a12 12 0 0 0-4 0l-.5 2.9c-1 .3-2 .9-3 1.6z" />
          </svg>
        </button>
      </div>

      {pickerOpen && (
        <div className="sheet-backdrop" onClick={() => setPickerOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grip" />
            <div className="sparks-hd">
              <span className="sparks-star">🎙️</span>
              <div>
                <b>목소리 고르기</b>
                <small>누구와 이야기할지 골라요</small>
              </div>
            </div>
            <div className="voice-list">
              {VOICES.map((v) => (
                <button
                  key={v.id}
                  className={`voice-opt ${voice === v.id ? "on" : ""}`}
                  onClick={() => {
                    onSetVoice(v.id);
                    speak("안녕! 나랑 이야기하자.", v.id);
                  }}
                >
                  <span className="vo-emoji">{v.emoji}</span>
                  <span className="vo-body">
                    <b>{v.name}</b>
                    <small>{v.desc}</small>
                  </span>
                  <span className={`vo-radio ${voice === v.id ? "on" : ""}`} />
                </button>
              ))}
            </div>
            <button className="ob-primary" onClick={() => setPickerOpen(false)}>
              완료
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
