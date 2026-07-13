import { useEffect, useRef, useState } from "react";
import Avatar from "../components/Avatar.jsx";
import { messagesToday } from "../lib/store.js";

function Bubble({ role, character, children, typing }) {
  return (
    <div className={`message ${role}`}>
      <div className="avatar">
        {role === "bot" ? <Avatar character={character} /> : "🙂"}
      </div>
      <div className={`bubble ${typing ? "typing" : ""}`}>{children}</div>
    </div>
  );
}

export default function Chat({
  character,
  history,
  histories,
  settings,
  onBack,
  onUserMessage,
  onBotMessage,
  onSafety,
  onGuard,
}) {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState(null); // 진행 중 봇 텍스트
  const [notice, setNotice] = useState(null); // 일시 안내(제한 등)
  const chatRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setNotice(null);
    setStreaming(null);
  }, [character.id]);

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
    onUserMessage(character.id, userMsg);
    const outgoing = [...history, userMsg];

    let reply = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: character.id, messages: outgoing }),
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
              characterId: character.id,
              characterName: character.name,
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
      reply =
        reply ||
        err.friendly ||
        `앗, ${character.name}랑 연결이 잠깐 끊겼어. 다시 말해 줄래?`;
    } finally {
      setStreaming(null);
      onBotMessage(character.id, { role: "assistant", content: reply });
      setBusy(false);
      if (inputRef.current) inputRef.current.focus();
    }
  }

  return (
    <section className="chat-screen">
      <header className="header">
        <button className="back-btn" onClick={onBack} aria-label="뒤로">
          ←
        </button>
        <div className="header-star">
          <Avatar character={character} />
        </div>
        <div className="header-text">
          <h1>{character.name}</h1>
          <p>{character.tagline}</p>
        </div>
        <button className="parent-btn" onClick={onGuard}>
          보호자
        </button>
      </header>

      <main className="chat" ref={chatRef}>
        <Bubble role="bot" character={character}>
          {character.greeting}
        </Bubble>
        {history.map((m, i) => (
          <Bubble
            key={i}
            role={m.role === "user" ? "user" : "bot"}
            character={character}
          >
            {m.content}
          </Bubble>
        ))}
        {streaming !== null && (
          <Bubble role="bot" character={character} typing={streaming === ""}>
            {streaming}
          </Bubble>
        )}
        {notice && (
          <Bubble role="bot" character={character}>
            {notice}
          </Bubble>
        )}
      </main>

      <footer className="composer">
        <input
          ref={inputRef}
          type="text"
          maxLength={1000}
          placeholder="하고 싶은 말을 써 봐!"
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
