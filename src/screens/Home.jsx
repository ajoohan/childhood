import { useEffect, useState } from "react";
import TopBar from "../components/TopBar.jsx";
import Avatar from "../components/Avatar.jsx";
import { HERO_SCENE } from "../lib/data.js";
import { userMsgCount } from "../lib/store.js";

function pad(n) {
  return String(n).padStart(2, "0");
}

function Hero({ characters, onPick }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || characters.length === 0) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % characters.length);
    }, 4000);
    return () => clearInterval(t);
  }, [paused, characters.length]);

  if (characters.length === 0) return <div className="hero" />;

  return (
    <div className="hero">
      <div
        className="hero-track"
        style={{ transform: `translateX(-${idx * 100}%)` }}
      >
        {characters.map((c) => (
          <div
            key={c.id}
            className="hero-slide"
            onClick={() => onPick(c)}
          >
            <div
              className="hero-scene"
              dangerouslySetInnerHTML={{ __html: HERO_SCENE }}
            />
            {c.isNew && <span className="hero-new">New</span>}
            <span className="hero-art">
              <Avatar character={c} />
            </span>
            <div className="hero-text">
              <div className="hero-eyebrow">{c.name}</div>
              <div className="hero-name">{c.tagline}</div>
              <div className="hero-quote">"{c.quote}"</div>
            </div>
          </div>
        ))}
      </div>
      <div className="hero-controls">
        <button
          className="hero-pause"
          onClick={(e) => {
            e.stopPropagation();
            setPaused((p) => !p);
          }}
          aria-label="자동 넘김 멈춤"
        >
          {paused ? "▶" : "⏸"}
        </button>
        <div className="hero-indicator">
          <b>{pad(idx + 1)}</b>&nbsp;|&nbsp;{pad(characters.length)}
        </div>
      </div>
    </div>
  );
}

export default function Home({ characters, histories, onPick, onGuard }) {
  return (
    <section className="home-screen">
      <TopBar showSafe onGuard={onGuard} />
      <div className="home-scroll">
        <Hero characters={characters} onPick={onPick} />

        <div className="section-head">
          <h2>인기 친구들</h2>
          <button className="more-btn">더보기 ›</button>
        </div>

        <div className="character-row">
          {characters.map((c) => (
            <button key={c.id} className="pop-card" onClick={() => onPick(c)}>
              <span
                className="pop-thumb"
                style={{
                  background: `linear-gradient(160deg, #ffffff, ${c.theme[0]})`,
                }}
              >
                {c.isNew && <span className="pop-new">New</span>}
                <span className="pop-art">
                  <Avatar character={c} />
                </span>
                <span className="pop-count">
                  💬 {userMsgCount(histories[c.id])}
                </span>
              </span>
              <span className="pop-name">{c.name}</span>
              <span className="pop-quote">"{c.quote}"</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
