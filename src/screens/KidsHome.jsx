import { useEffect, useState } from "react";
import { recommendActivities, interestEmojis } from "../lib/data.js";
import { robotHead } from "../lib/mascot.js";
import Confetti from "../components/Confetti.jsx";
import FloatingStars from "../components/FloatingStars.jsx";

// 앱 실행 후 홈 첫 진입에서 환영 컨페티를 1회만
let welcomedThisSession = false;
const FACE_CYCLE = ["happy", "happy", "wink", "happy", "love", "happy", "proud", "cool"];

const LEARN_GRAD = [
  ["#FFC48A", "#FF8A3D"],
  ["#8FD0F5", "#5AA9EE"],
  ["#B7E88F", "#7CC24A"],
  ["#FFB0C9", "#FF7EA8"],
];

const REC_GRAD = [
  ["#FFB27A", "#FF7A3D"],
  ["#9FD8F7", "#5AA9EE"],
  ["#C6E88F", "#7CC24A"],
  ["#FFB0C9", "#FF7EA8"],
];

// Kids Zone 홈 — 인사 헤더 + 큰 액션 타일 + 배움 카드. 결제·설정 진입점 없음.
export default function KidsHome({
  categories,
  activities,
  ageMode,
  stars,
  name,
  interests,
  onPickCategory,
  onPickActivity,
  onParent,
  onStars,
  onCollection,
  onImageMaker,
  onBadges,
  onStickers,
  imageEnabled,
}) {
  const hi = name ? `안녕, ${name}! 👋` : "안녕! 👋";
  const [menuOpen, setMenuOpen] = useState(false);
  const [face, setFace] = useState("happy");
  const [poked, setPoked] = useState(false);
  const [welcome, setWelcome] = useState(!welcomedThisSession);

  // 마스코트를 콕 누르면 통통 튀며 재밌는 표정
  function pokeMascot() {
    const fun = ["wow", "love", "excited", "cool", "proud"];
    setFace(fun[Math.floor(Math.random() * fun.length)]);
    setPoked(true);
    setTimeout(() => setPoked(false), 700);
  }

  // 홈 첫 진입 환영 컨페티 (앱 실행당 1회)
  useEffect(() => {
    if (welcomedThisSession) return;
    welcomedThisSession = true;
    const t = setTimeout(() => setWelcome(false), 2600);
    return () => clearTimeout(t);
  }, []);

  // 마스코트 표정 주기적 변화
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % FACE_CYCLE.length;
      setFace(FACE_CYCLE[i]);
    }, 3800);
    return () => clearInterval(id);
  }, []);
  const MENU = [
    { icon: "🏅", label: "내 배지", go: onBadges },
    { icon: "🪄", label: "스티커 도감", go: onStickers },
    { icon: "🖼️", label: "그림 만들기", go: onImageMaker, pending: !imageEnabled },
    { icon: "🕘", label: "내 기록", go: onCollection },
    { icon: "✏️", label: "프로필 수정", go: onParent },
  ];
  const bigTiles = categories.filter((c) => c.id === "story" || c.id === "heart");
  const learn = activities.filter(
    (a) => a.category === "learn" && a.ages.includes(ageMode)
  );
  const ask = activities.find((a) => a.id === "learn_ask");
  const recommended = recommendActivities(interests, activities, ageMode, 4);
  const emojis = interestEmojis(interests);
  const recTitle = name ? `${name}를 위한 추천` : "너를 위한 추천";

  return (
    <section className="kids-home">
      <FloatingStars />
      {welcome && <Confetti count={80} />}
      <header className="home-hd">
        <div className="hd-menu-wrap">
          <button
            className="hd-menu-btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="메뉴"
          >
            ☰
          </button>
          {menuOpen && (
            <>
              <div className="hd-menu-scrim" onClick={() => setMenuOpen(false)} />
              <div className="hd-menu">
                {MENU.map((m) => (
                  <button
                    key={m.label}
                    className="hd-menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      m.go && m.go();
                    }}
                  >
                    <span>{m.icon}</span>
                    <span className="hd-menu-label">{m.label}</span>
                    {m.pending && <span className="hd-menu-tag">준비 중</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <span
          className={`hd-ava ${poked ? "poked" : ""}`}
          onClick={pokeMascot}
          role="button"
          aria-label="별이 콕 누르기"
          dangerouslySetInnerHTML={{ __html: robotHead(face) }}
        />
        <div className="hd-hi">
          <b>{hi}</b>
          <small>오늘도 반가워</small>
        </div>
        <button className="star-badge" onClick={onStars} aria-label="별 모으기">
          <b>{stars}</b> ⭐
        </button>
      </header>

      <button className="parent-banner" onClick={onParent}>
        <span className="pb-icon">🔒</span>
        <span className="pb-text">
          <b>부모님 공간</b>
          <small>설정 · 안전 리포트 · 구독</small>
        </span>
        <span className="pb-arrow">›</span>
      </button>

      <div className="big-tiles">
        {bigTiles.map((c) => (
          <button
            key={c.id}
            className="big-tile"
            style={{
              background: `linear-gradient(150deg, ${c.theme[0]}, ${c.theme[1]})`,
            }}
            onClick={() => onPickCategory(c)}
          >
            <span className="bt-emoji">{c.emoji}</span>
            <span className="bt-title">{c.title}</span>
            <span className="bt-desc">{c.desc}</span>
          </button>
        ))}
      </div>

      {recommended.length > 0 && (
        <>
          <div className="rec-head">
            <span>✨ {recTitle}</span>
            {emojis.length > 0 && (
              <span className="rec-emojis">{emojis.join(" ")}</span>
            )}
          </div>
          <div className="rec-row">
            {recommended.map((a, i) => {
              const g = REC_GRAD[i % REC_GRAD.length];
              return (
                <button
                  key={a.id}
                  className="rec-card"
                  style={{
                    background: `linear-gradient(160deg, ${g[0]}, ${g[1]})`,
                  }}
                  onClick={() => onPickActivity(a)}
                >
                  <span className="rc-emoji">{a.emoji}</span>
                  <span className="rc-title">{a.title}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="learn-head">💡 새로운 걸 배워요</div>
      <div className="learn-row">
        {learn.map((a, i) => {
          const g = LEARN_GRAD[i % LEARN_GRAD.length];
          return (
            <button
              key={a.id}
              className="learn-card"
              style={{ background: `linear-gradient(160deg, ${g[0]}, ${g[1]})` }}
              onClick={() => onPickActivity(a)}
            >
              <span className="lc-emoji">{a.emoji}</span>
              <span className="lc-title">{a.title}</span>
            </button>
          );
        })}
      </div>

      {ask && (
        <button className="ask-bar" onClick={() => onPickActivity(ask)}>
          <span className="ask-text">궁금한 거 있어? 물어봐!</span>
          <span className="ask-btn">🎤 물어보기</span>
        </button>
      )}
    </section>
  );
}
