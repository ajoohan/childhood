import { useEffect, useRef, useState } from "react";
import { recommendActivities } from "../lib/data.js";
import { timeGreeting } from "../lib/greeting.js";
import { robotHead } from "../lib/mascot.js";
import Confetti from "../components/Confetti.jsx";
import FloatingStars from "../components/FloatingStars.jsx";

// 요즘 인기 있는(유익한) 활동 (제작사 큐레이션 — MVP)
const POPULAR_IDS = ["learn_hangul", "draw_idea", "feel_talk", "habit_routine"];

// 활동 카드의 따뜻한 '사진' 톤 배경 (실제 3D 이미지는 추후 에셋으로 교체)
const CARD_TONE = [
  ["#F6D9C0", "#E9B892"],
  ["#E7D6C4", "#D2B79A"],
  ["#DCE6D2", "#B9CFA6"],
  ["#EAD6DE", "#D3AEBE"],
  ["#D8E0EC", "#B4C2D8"],
];

// 큰 액션 타일 — 시안 라벨/부제
const TILE = {
  story: { title: "이야기 하기", desc: "하고 싶은 얘기가 있어요~" },
  heart: { title: "마음 나누기", desc: "오늘 기분이 어때?" },
};

// 앱 실행 후 홈 첫 진입에서 환영 컨페티를 1회만
let welcomedThisSession = false;

// 에셋 이미지 오버레이 — /img/{name}.png 가 있으면 그 위에 덮어 씌우고,
// 파일이 없으면(404) 스스로 사라져 이모지/기본 아이콘이 보인다. (플러그앤플레이)
function AssetImg({ src, className }) {
  return (
    <img
      className={className}
      src={src}
      alt=""
      loading="lazy"
      onError={(e) => e.currentTarget.remove()}
    />
  );
}

// Kids Zone 홈 (피그마 시안 반영) — 라벤더→크림 배경, 보라 포인트, 이미지 카드
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
  // 시간대에 따라 바뀌는 질문 (아랫줄 큰 글씨). 예: 9~12시 → "오늘은 뭐 하고 놀까?"
  const greet = timeGreeting(name);
  const [menuOpen, setMenuOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false); // 유저 변경 시트
  const [welcome, setWelcome] = useState(!welcomedThisSession);
  const homeRef = useRef(null);

  // 홈 첫 진입 환영 컨페티 (앱 실행당 1회)
  useEffect(() => {
    if (welcomedThisSession) return;
    welcomedThisSession = true;
    const t = setTimeout(() => setWelcome(false), 2600);
    return () => clearTimeout(t);
  }, []);

  // 프로필(아바타) 팝업 메뉴 — 편집·유저 변경·업적·히스토리
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
  const recommended = recommendActivities(interests, activities, ageMode, 6);
  const popular = POPULAR_IDS.map((id) => activities.find((a) => a.id === id))
    .filter(Boolean)
    .filter((a) => a.ages.includes(ageMode));
  const recTitle = name ? `${name}~이 에게 추천!` : "너에게 추천!";
  // "새로운 유익한 놀이" = 배움 + 인기, 중복 제거
  const recIds = new Set(recommended.map((a) => a.id));
  const playSeen = new Set();
  const learnPlay = learn.concat(popular).filter((a) => {
    if (playSeen.has(a.id)) return false;
    playSeen.add(a.id);
    return true;
  });

  // 가로 스크롤 이미지 카드 한 줄
  const CardRow = ({ items, offset = 0 }) => (
    <div className="act-row">
      {items.map((a, i) => {
        const g = CARD_TONE[(i + offset) % CARD_TONE.length];
        return (
          <button key={a.id} className="act-card" onClick={() => onPickActivity(a)}>
            <span
              className="act-photo"
              style={{ background: `linear-gradient(155deg, ${g[0]}, ${g[1]})` }}
            >
              <span className="act-emoji">{a.emoji}</span>
              <AssetImg className="act-img" src={`/img/act-${a.id}.png`} />
            </span>
            <span className="act-label">{a.title}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <section className="kids-home figma" ref={homeRef}>
      <FloatingStars />
      {welcome && <Confetti count={70} />}

      <header className="home-hd">
        <div className="hd-menu-wrap">
          <button
            className="hd-profile-btn round"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="프로필 메뉴"
          >
            <span className="hp-emoji">{avatar || "🙂"}</span>
            <AssetImg className="hp-img" src={`/img/avatar-${avatar || "default"}.png`} />
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
          <small>안녕, {name || "친구"}~</small>
          <b>{greet.sub}</b>
        </div>
        <button className="star-badge star3d" onClick={onStars} aria-label="별 모으기">
          <b>{stars}</b>
          <span className="star3d-icon">⭐</span>
        </button>
      </header>

      {/* 프리미엄 배너 (보라) — 누르면 부모 인증(PIN) 뒤 부모 존 구독. 아이 직접 결제 없음 */}
      <button className="premium-banner purple" onClick={onParent}>
        <span className="prb-crown">
          <span className="prb-crown-emoji">👑</span>
          <AssetImg className="prb-crown-img" src="/img/crown.png" />
        </span>
        <b>프리미엄으로 업그레이드!</b>
        <span className="prb-go">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </span>
      </button>

      {/* 큰 타일 — 크림 카드 + 3D 아이콘 + 부제 */}
      <div className="big-tiles">
        {bigTiles.map((c) => (
          <button
            key={c.id}
            className={`big-tile soft bt-${c.id}`}
            onClick={() => onPickCategory(c)}
          >
            <span className={`bt-ic3d ${c.id}`}>
              <span className="bt-emoji3d">{c.id === "story" ? "💬" : "❤️"}</span>
              <AssetImg className="bt-img" src={`/img/tile-${c.id}.png`} />
            </span>
            <span className="bt-title">{TILE[c.id]?.title || c.title}</span>
            <span className="bt-sub">{TILE[c.id]?.desc || c.desc}</span>
          </button>
        ))}
      </div>

      {/* 추천 — 마스코트 살짝 + 이미지 카드 */}
      {recommended.length > 0 && (
        <>
          <div className="sec-head">
            <span>{recTitle}</span>
            <span className="sec-mascot">
              <span dangerouslySetInnerHTML={{ __html: robotHead("wow") }} />
              <AssetImg className="sec-mascot-img" src="/img/mascot.png" />
            </span>
          </div>
          <CardRow items={recommended} />
        </>
      )}

      {/* 새로운 유익한 놀이 */}
      {learnPlay.length > 0 && (
        <>
          <div className="sec-head">
            <span>새로운 유익한 놀이가 있어요~</span>
          </div>
          <CardRow items={learnPlay} offset={2} />
        </>
      )}

      {/* 하단 고정 입력 바 (뭐든지 물어봐요) — 보라 톤 */}
      {ask && (
        <div className="home-composer">
          <button className="hc-plus" onClick={onImageMaker} aria-label="더보기">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <span className="hc-text" onClick={() => onPickActivity(ask)}>
            뭐든지 물어봐요~!
          </span>
          <button className="hc-ic" onClick={() => onPickActivity(ask)} aria-label="말하기">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M6 11a6 6 0 0 0 12 0M12 17v3" />
            </svg>
          </button>
          <button className="hc-ic wave" onClick={() => onPickActivity(ask)} aria-label="물어보기">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" />
            </svg>
          </button>
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
