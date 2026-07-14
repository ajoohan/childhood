import { useState } from "react";

const IDEAS = ["우주를 나는 공룡", "무지개 위의 고양이", "바닷속 마법 성", "웃는 로봇 친구"];

// 그림 만들기 — 프롬프트 → 서버 안전 분류 → 이미지 생성(키 설정 시). 미설정 시 "준비 중".
export default function ImageMaker({ enabled, onBack }) {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("idle"); // idle|loading|done|pending|blocked|error
  const [image, setImage] = useState(null);
  const [msg, setMsg] = useState("");

  async function draw() {
    if (!enabled) return; // 키 미설정 → 준비 중
    const text = prompt.trim();
    if (!text || status === "loading") return;
    setStatus("loading");
    setImage(null);
    setMsg("");
    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      const j = await res.json().catch(() => ({}));
      if (j.safety) {
        setStatus("blocked");
        setMsg(j.error || "그건 그릴 수 없어. 다른 걸 그려 볼까? ✨");
      } else if (j.pending) {
        setStatus("pending");
        setMsg(j.error || "그림 만들기는 준비 중이에요.");
      } else if (j.url) {
        setImage(j.url);
        setStatus("done");
      } else {
        setStatus("error");
        setMsg(j.error || "그림을 만들지 못했어요. 다시 해볼까?");
      }
    } catch {
      setStatus("error");
      setMsg("연결이 잠깐 끊겼어. 다시 해볼까?");
    }
  }

  return (
    <section className="imgmaker">
      <header className="im-top">
        <button className="voice-back" onClick={onBack}>
          ‹ 뒤로
        </button>
        <b className="im-title">🎨 그림 만들기</b>
        <span style={{ width: 48 }} />
      </header>

      <div className="im-stage">
        {!enabled ? (
          <div className="im-placeholder">
            <span className="im-badge">준비 중</span>
            <span className="im-ph-emoji">🖼️</span>
            <p>그림 만들기는 준비 중이에요.</p>
            <small className="im-note">
              부모님이 이미지 만들기 기능을 켜면 사용할 수 있어요.
            </small>
          </div>
        ) : status === "loading" ? (
          <div className="im-loading">
            <div className="im-spinner" />
            <p>그리고 있어요…</p>
          </div>
        ) : status === "done" && image ? (
          <img className="im-result" src={image} alt="만든 그림" />
        ) : (
          <div className="im-placeholder">
            <span className="im-ph-emoji">🖼️</span>
            <p>{msg || "무엇을 그릴지 알려 주면 내가 그려 줄게!"}</p>
          </div>
        )}
      </div>

      {enabled && (
        <div className="im-ideas">
          {IDEAS.map((i) => (
            <button key={i} className="im-idea" onClick={() => setPrompt(i)}>
              {i}
            </button>
          ))}
        </div>
      )}

      <footer className="im-bar">
        <input
          type="text"
          maxLength={200}
          placeholder={enabled ? "무엇을 그릴까?" : "준비 중이에요"}
          value={prompt}
          disabled={!enabled || status === "loading"}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) draw();
          }}
        />
        <button
          className="im-draw"
          onClick={draw}
          disabled={!enabled || status === "loading"}
        >
          그리기 ✨
        </button>
      </footer>
    </section>
  );
}
