import { HELPER } from "../lib/data.js";

const LEARN_GRAD = [
  ["#FFC48A", "#FF8A3D"],
  ["#8FD0F5", "#5AA9EE"],
  ["#B7E88F", "#7CC24A"],
  ["#FFB0C9", "#FF7EA8"],
];

// Kids Zone 홈 — 인사 헤더 + 큰 액션 타일 + 배움 카드. 결제·설정 진입점 없음.
export default function KidsHome({
  categories,
  activities,
  ageMode,
  stars,
  onPickCategory,
  onPickActivity,
  onParent,
}) {
  const bigTiles = categories.filter((c) => c.id === "story" || c.id === "heart");
  const learn = activities.filter(
    (a) => a.category === "learn" && a.ages.includes(ageMode)
  );
  const ask = activities.find((a) => a.id === "learn_ask");

  return (
    <section className="kids-home">
      <header className="home-hd">
        <span
          className="hd-ava"
          dangerouslySetInnerHTML={{ __html: HELPER }}
        />
        <div className="hd-hi">
          <b>안녕! 👋</b>
          <small>오늘도 반가워</small>
        </div>
        <span className="star-badge">
          <b>{stars}</b> ⭐
        </span>
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
