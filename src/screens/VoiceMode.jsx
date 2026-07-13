import { useRef, useState } from "react";
import { SPLASH_ROBOT } from "../lib/data.js";
import { useSpeech } from "../lib/useSpeech.js";

// 음성 목소리 프리셋 (브라우저 TTS의 pitch/rate로 개성 부여)
export const VOICES = [
  { id: "shimmer", name: "반짝이", emoji: "🤖", desc: "밝고 또랑또랑한 목소리", pitch: 1.15, rate: 1.02 },
  { id: "echo", name: "부엉이", emoji: "🦉", desc: "차분하고 다정한 목소리", pitch: 0.9, rate: 0.95 },
  { id: "coral", name: "코랄", emoji: "🧭", desc: "명랑하고 활기찬 목소리", pitch: 1.3, rate: 1.06 },
];

function speak(text, voiceId, onEnd) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return onEnd && onEnd();
    const v = VOICES.find((x) => x.id === voiceId) || VOICES[0];
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR";
    u.pitch = v.pitch;
    u.rate = v.rate;
    if (onEnd) u.onend = onEnd;
    synth.cancel();
    synth.speak(u);
  } catch {
    onEnd && onEnd();
  }
}

// 음성 대화 모드 — 활동 스코프(궁금한 거 물어봐요) 안에서 음성으로 대화.
export default function VoiceMode({
  activity,
  history,
  persona,
  voice,
  onSetVoice,
  onUserMessage,
  onBotMessage,
  onSafety,
  onBack,
}) {
  const [status, setStatus] = useState("idle"); // idle|thinking|speaking
  const [lastSaid, setLastSaid] = useState("");
  const [reply, setReply] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const busyRef = useRef(false);

  const speech = useSpeech({
    onResult: (t) => handleSpeech(t),
  });
  const curVoice = VOICES.find((v) => v.id === voice) || VOICES[0];

  async function handleSpeech(text) {
    const trimmed = (text || "").trim();
    if (!trimmed || busyRef.current || !activity) return;
    busyRef.current = true;
    setLastSaid(trimmed);
    setReply("");
    setStatus("thinking");

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
        }
      }
    } catch {
      acc = acc || "앗, 잠깐 연결이 끊겼어. 다시 말해 줄래?";
      setReply(acc);
    }

    onBotMessage(activity.id, { role: "assistant", content: acc });
    setStatus("speaking");
    speak(acc, voice, () => {
      setStatus("idle");
      busyRef.current = false;
    });
  }

  const statusText =
    speech.listening
      ? "듣고 있어요…"
      : status === "thinking"
      ? "생각 중이에요…"
      : status === "speaking"
      ? `${curVoice.name}가 이야기하고 있어요`
      : "마이크를 누르고 말해 봐!";

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
          dangerouslySetInnerHTML={{ __html: SPLASH_ROBOT }}
        />
        <div className="voice-note">🤖 나는 AI 도우미예요. 진짜 사람은 아니에요!</div>
        <h1 className="voice-status">{statusText}</h1>
        {lastSaid && <p className="voice-said">“{lastSaid}”</p>}
        {reply && <p className="voice-reply">{reply}</p>}
      </div>

      <div className="voice-controls">
        {speech.supported ? (
          <button
            className={`voice-mic ${speech.listening ? "on" : ""}`}
            onClick={speech.toggle}
            disabled={status === "thinking" || status === "speaking"}
            aria-label="말하기"
          >
            🎤
          </button>
        ) : (
          <p className="voice-unsupported">
            이 브라우저는 음성 인식을 지원하지 않아요. 활동 화면에서 글로 이야기해 봐요!
          </p>
        )}
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
