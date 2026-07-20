import { useEffect, useRef, useState } from "react";
import { recommendActivities, interestEmojis } from "../lib/data.js";
import { timeGreeting } from "../lib/greeting.js";
import Confetti from "../components/Confetti.jsx";
import FloatingStars from "../components/FloatingStars.jsx";

// 요즘 인기 있는 활동 (제작사 큐레이션 — 기획서 2장 7~9번 영역, MVP는 큐레이션)
const POPULAR_IDS = ["story_listen", "draw_idea", "feel_talk", "habit_routine"];
const POP_GRAD = [
  ["#FFD9A3", "#FFB35C"],
  ["#C9E8FF", "#8FC9F5"],
  ["#FFD1DC", "#FF9EB8"],
  ["#D6F0C2", "#A4D97E"],
];

// 앱 실행 후 홈 첫 진입에서 환영 컨페티를 1회만
let welcomedThisSession = false;

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
  avatar,
  interests,
  kidList,
  onSwitchKid,
  onAddKid,
  onPickCategory,
  onPickActivity,
  onParent,
  onStars,
  onCollection,
  onImageMaker,
  onBadges,
  imageEnabled,
}) {
  // 시간대에 따라 바뀌는 환영 문구 (저녁 9시 → "치카치카 했어요?")
  const greet = timeGreeting(name);
  const [menuOpen, setMenuOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false); // 유저 변경 시트
  const [welcome, setWelcome] = useState(!welcomedThisSession);
  const [scrollHint, setScrollHint] = useState(false);
  const homeRef = useRef(null);

  // 아래에 더 있으면 스크롤 유도 표시 (끝까지 내리면 사라짐)
  useEffect(() => {
    const el = homeRef.current;
    if (!el) return;
    const check = () =>
      setScrollHint(el.scrollHeight - el.clientHeight - el.scrollTop > 24);
    check();
    el.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  // 홈 첫 진입 환영 컨페티 (앱 실행당 1회)
  useEffect(() => {
    if (welcomedThisSession) return;
    welcomedThisSession = true;
    const t = setTimeout(() => setWelcome(false), 2600);
    return () => clearTimeout(t);
  }, []);
  // 프로필(아바타) 팝업 메뉴 — 기획서 2장 1번: 편집·유저 변경·업적·히스토리
  const MENU = [
    { icon: "✏️", label: "프로필 편집", go: onParent },
    { icon: "👥", label: "유저 변경", go: () => setSwitcherOpen(true) },
    { icon: "🏅", label: "내 배지", go: onBadges },
    { icon: "🕘", label: "챗 히스토리", go: onCollection },
    { icon: "🖼️", label: "그림 만들기", go: onImageMaker, pending: !imageEnabled },
  ];
  const bigTiles = categories.filter((c) => c.id === "story" || c.id === "heart");
  const learn = activities.filter(
    (a) => a.category === "learn" && a.ages.includes(ageMode)
  );
  const ask = activities.find((a) => a.id === "learn_ask");
  const recommended = recommendActivities(interests, activities, ageMode, 4);
  const emojis = interestEmojis(interests);
  const recTitle = name ? `${name}를 위한 추천` : "너를 위한 추천";
  const popular = POPULAR_IDS.map((id) => activities.find((a) => a.id === id))
    .filter(Boolean)
    .filter((a) => a.ages.includes(ageMode));

  return (
    <section className="kids-home" ref={homeRef}>
      <FloatingStars />
      {welcome && <Confetti count={80} />}
      <header className="home-hd">
        <div className="hd-menu-wrap">
          <button
            className="hd-profile-btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="프로필 메뉴"
          >
            {avatar || "🙂"}
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
        <div className="hd-hi">
          <b>{greet.hi}</b>
          <small>{greet.sub}</small>
        </div>
        <button className="star-badge star3d" onClick={onStars} aria-label="별 모으기">
          <b>{stars}</b>
          <span className="star3d-icon">⭐</span>
        </button>
      </header>

      {/* 프리미엄 배너 — 누르면 부모 인증(PIN) 뒤 부모 존 구독으로. 아이 직접 결제 없음 */}
      <button className="premium-banner" onClick={onParent}>
        <span className="prb-icon">
          <svg viewBox="0 0 24 24" fill="#fff">
            <path d="M3 8l4.5 3.5L12 5l4.5 6.5L21 8l-1.6 10H4.6z" />
          </svg>
        </span>
        <b>프리미엄으로 업그레이드!</b>
        <span className="prb-arrow">›</span>
      </button>

      <div className="big-tiles">
        {bigTiles.map((c) => (
          <button
            key={c.id}
            className={`big-tile bt-${c.id}`}
            onClick={() => onPickCategory(c)}
          >
            <span className="bt-ic">
              {c.id === "story" ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M6 11a6 6 0 0 0 12 0M12 17v3" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="#fff">
                  <path d="M12 21s-7-4.6-9.2-8.3C1 9.6 2.8 6 6.2 6 8.3 6 9.6 7.3 12 9.9 14.4 7.3 15.7 6 17.8 6c3.4 0 5.2 3.6 3.4 6.7C19 16.4 12 21 12 21z" />
                </svg>
              )}
            </span>
            <span className="bt-title">{c.title}</span>
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

      <div className="learn-head">
        <svg className="lh-bulb" viewBox="0 0 24 24" fill="#E8447F">
          <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3h6c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2zM9.5 19h5v1a2.5 2.5 0 0 1-5 0z" />
        </svg>
        새로운 걸 배워요
      </div>
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
        <div className="ask-bar">
          <span
            className="ask-cam"
            role="button"
            aria-label="그림 만들기"
            onClick={onImageMaker}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="7" width="18" height="13" rx="3" />
              <circle cx="12" cy="13.5" r="3.5" />
              <path d="M9 7l1.2-2h3.6L15 7" />
            </svg>
          </span>
          <span className="ask-text" onClick={() => onPickActivity(ask)}>
            궁금한 거 있어? 물어봐!
          </span>
          <span
            className="ask-btn"
            role="button"
            onClick={() => onPickActivity(ask)}
          >
            <svg className="ask-wave" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
              <path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" />
            </svg>
            물어보기
          </span>
        </div>
      )}

      {popular.length > 0 && (
        <>
          <div className="rec-head pop-head">
            <span>🔥 요즘 인기 있는 활동</span>
          </div>
          <div className="rec-row">
            {popular.map((a, i) => {
              const g = POP_GRAD[i % POP_GRAD.length];
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

      {/* 아래에 더 있음을 알리는 스크롤 유도 (기획서: 하단 콘텐츠가 잘려 보이게) */}
      {scrollHint && (
        <div className="scroll-hint" aria-hidden="true">
          <span className="scroll-hint-chev">⌄</span>
        </div>
      )}

      {/* 유저 변경 시트 — 한 기기에서 형제·자매 프로필 전환 */}
      {switcherOpen && (
        <div className="sheet-backdrop" onClick={() => setSwitcherOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grip" />
            <div className="sparks-hd">
              <span className="sparks-star">👥</span>
              <div>
                <b>유저 변경</b>
                <small>누가 이야기할까요?</small>
              </div>
            </div>
            <div className="kid-list">
              {(kidList || []).map((k) => (
                <button
                  key={k.id}
                  className={`kid-item ${k.active ? "on" : ""}`}
                  onClick={() => {
                    setSwitcherOpen(false);
                    if (!k.active) onSwitchKid(k.id);
                  }}
                >
                  <span className="kid-ava">{k.avatar}</span>
                  <span className="kid-body">
                    <b>{k.name || "이름 없음"}</b>
                    <small>{k.age != null ? `만 ${k.age}살` : ""}</small>
                  </span>
                  {k.active && <span className="kid-now">지금</span>}
                </button>
              ))}
              <button
                className="kid-item add"
                onClick={() => {
                  setSwitcherOpen(false);
                  onAddKid();
                }}
              >
                <span className="kid-ava">➕</span>
                <span className="kid-body">
                  <b>새 아이 추가</b>
                  <small>형제·자매 프로필을 만들어요</small>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
