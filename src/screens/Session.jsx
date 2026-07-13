import { useEffect, useRef, useState } from "react";
import { HELPER } from "../lib/data.js";
import { messagesToday } from "../lib/store.js";
import { useSpeech } from "../lib/useSpeech.js";

function Bubble({ role, children, typing }) {
  return (
    <div className={`message ${role}`}>
      <div className="avatar">
        {role === "bot" ? (
          <span className="ava-svg" dangerouslySetInnerHTML={{ __html: HELPER }} />
        ) : (
          "🙂"
        )}
      </div>
      <div className={`bubble ${typing ? "typing" : ""}`}>{children}</div>
    </div>
  );
}

// 활동 스코프 안에서의 AI 도우미 세션 (개방형 대화가 아님)
export default function Session({
  activity,
  history,
  histories,
  settings,
  persona,
  onBack,
  onUserMessage,
  onBotMessage,
  onSafety,
}) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState(null);
  const [notice, setNotice] = useState(null);
  const chatRef = useRef(null);
  const inputRef = useRef(null);
  const speech = useSpeech({
    onResult: (t) => setInput((prev) => (prev ? prev + " " + t : t)),
  });

  useEffect(() => {
    setNotice(null);
    setStreaming(null);
  }, [activity.id]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [history, streaming, notice]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;

    const limit = settings.limitPerDay;
    if (limit && messagesToday(histories) >= limit) {
      setInput("");
      setNotice(
        `오늘은 이야기를 ${limit}번이나 나눴대! 오늘은 여기까지 하고 내일 또 만나자 😊`
      );
      return;
    }

    setInput("");
    setNotice(null);
    setBusy(true);
    setStreaming("");

    const userMsg = { role: "user", content: text, t: new Date().toISOString() };
    onUserMessage(activity.id, userMsg);
    const outgoing = [...history, userMsg];

    let reply = "";
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
      if (!res.ok || !res.body) {
        let msg = null;
        try {
          const j = await res.json();
          if (j && j.error) msg = j.error;
        } catch {}
        const e = new Error(msg || `HTTP ${res.status}`);
        if (msg) e.friendly = msg;
        throw e;
      }
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
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          const obj = JSON.parse(data);
          if (obj.safety) {
            onSafety({
              t: new Date().toISOString(),
              activityId: activity.id,
              activityTitle: activity.title,
              category: obj.safety,
              text,
            });
            continue;
          }
          reply += obj.text || "";
          setStreaming(reply);
        }
      }
    } catch (err) {
      console.error(err);
      reply = reply || err.friendly || "앗, 잠깐 연결이 끊겼어. 다시 말해 줄래?";
    } finally {
      setStreaming(null);
      onBotMessage(activity.id, { role: "assistant", content: reply });
      setBusy(false);
      if (inputRef.current) inputRef.current.focus();
    }
  }

  return (
    <section className="chat-screen session">
      <header className="header">
        <button className="back-btn" onClick={onBack} aria-label="뒤로">
          ←
        </button>
        <div className="header-star">
          <span className="ava-svg" dangerouslySetInnerHTML={{ __html: HELPER }} />
        </div>
        <div className="header-text">
          <h1>
            {activity.emoji} {activity.title}
          </h1>
          <p>별이가 도와줄게 · AI 도우미</p>
        </div>
      </header>

      <main className="chat" ref={chatRef}>
        <div className="ai-note">🤖 나는 AI 도우미예요. 진짜 사람은 아니에요!</div>
        <Bubble role="bot">{activity.greeting}</Bubble>
        {history.map((m, i) => (
          <Bubble key={i} role={m.role === "user" ? "user" : "bot"}>
            {m.content}
          </Bubble>
        ))}
        {streaming !== null && (
          <Bubble role="bot" typing={streaming === ""}>
            {streaming || "생각 중이에요"}
          </Bubble>
        )}
        {notice && <Bubble role="bot">{notice}</Bubble>}
      </main>

      <footer className="composer">
        {speech.supported && (
          <button
            className={`mic-btn ${speech.listening ? "on" : ""}`}
            onClick={speech.toggle}
            disabled={busy}
            aria-label="음성으로 말하기"
            title="음성으로 말하기"
          >
            🎤
          </button>
        )}
        <input
          ref={inputRef}
          type="text"
          maxLength={1000}
          placeholder={speech.listening ? "듣고 있어요…" : "하고 싶은 말을 써 봐!"}
          autoComplete="off"
          value={input}
          disabled={busy}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) send();
          }}
        />
        <button onClick={send} disabled={busy} aria-label="보내기">
          보내기 🚀
        </button>
      </footer>
    </section>
  );
}
