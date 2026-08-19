import { useEffect, useRef, useState } from "react";
import { recommendActivities } from "../lib/data.js";
import Confetti from "../components/Confetti.jsx";

// 시안 "새로운 유익한 놀이" 3카드 (Figma Home 62:78)
const NEW_IDS = ["learn_hangul", "learn_nature", "learn_science"];

// 시안 하단 리스트 3행 (Figma Home 62:96 / 62:101 / 62:106)
const QUICK_ROWS = [
  { id: "story_listen", label: "동화책 읽어줘", icon: "icon-book", emoji: "📖" },
  { id: "game_word", label: "낱말 게임 하자!", icon: "icon-word", emoji: "🔤" },
  { id: "game_fun", label: "재미있는 게임한번 해볼래?", icon: "icon-game", emoji: "🎲" },
];

// 큰 액션 타일 — 시안 라벨/부제 (62:37 / 62:48)
const TILE = {
  story: { title: "이야기 하기", desc: "하고 싶은 얘기가 있어요~", icon: "tile-story", emoji: "💬" },
  heart: { title: "마음 나누기", desc: "오늘 기분이 어때?", icon: "tile-heart", emoji: "❤️" },
};

// 앱 실행 후 홈 첫 진입에서 환영 컨페티를 1회만
let welcomedThisSession = false;

// 에셋 이미지 오버레이 — /img/{name}.png 가 있으면 이모지 폴백을 덮어 씌우고,
// 파일이 없으면(404) 스스로 사라져 이모지가 보인다.
function AssetImg({ src, className }) {
  return (
    <img
      className={className}
      src={src}
      alt=""
      loading="lazy"
      onError={(e) => e.currentTarget.remove()}
      onLoad={(e) => {
        const prev = e.currentTarget.previousElementSibling;
        if (prev) prev.style.visibility = "hidden";
      }}
    />
  );
}

// Kids Zone 홈 — Figma "Home"(62:27) 시안 반영
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

  const byId = (id) => activities.find((a) => a.id === id);
  const bigTiles = categories.filter((c) => c.id === "story" || c.id === "heart");
  const ask = byId("learn_ask");
  const recommended = recommendActivities(interests, activities, ageMode, 6);
  const fresh = NEW_IDS.map(byId).filter(Boolean).filter((a) => a.ages.includes(ageMode));
  const quick = QUICK_ROWS.map((r) => ({ ...r, act: byId(r.id) })).filter(
    (r) => r.act && r.act.ages.includes(ageMode)
  );

  // 이미지 카드 한 장 (라벨이 이미지 위에 얹히고 아래쪽에 어두운 그라데이션)
  const Card = ({ a, wide }) => (
    <button
      className={`fx-card ${wide ? "wide" : ""}`}
      onClick={() => onPickActivity(a)}
    >
      <span className="fx-card-emoji">{a.emoji}</span>
      <AssetImg className="fx-card-img" src={`/img/act-${a.id}.png`} />
      <span className="fx-card-veil" />
      <span className="fx-card-label">{a.title}</span>
    </button>
  );

  return (
    <section className="kids-home fx" ref={homeRef}>
      {welcome && <Confetti count={70} />}

      {/* 헤더 — 아바타 80, 인사 2줄, 별 배지 */}
      <header className="fx-hd">
        <div className="hd-menu-wrap">
          <button
            className="fx-ava"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="프로필 메뉴"
          >
            <span className="fx-ava-emoji">{avatar || "🙂"}</span>
            <AssetImg className="fx-ava-img" src="/img/avatar-default.png" />
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
        <div className="fx-hi">
          <p className="fx-hi-1">
            안녕, <b>{name || "친구"}~</b>
          </p>
          <p className="fx-hi-2">오늘은 뭐하고 놀까?</p>
        </div>
        <button className="fx-star" onClick={onStars} aria-label="별 모으기">
          <span className="fx-star-pill">{stars}</span>
          <span className="fx-star-ic">
            <span className="fx-star-emoji">⭐</span>
            <AssetImg className="fx-star-img" src="/img/icon-star.png" />
          </span>
        </button>
      </header>

      {/* 프리미엄 배너 — 누르면 부모 인증(PIN) 뒤 부모 존 구독. 아이 직접 결제 없음 */}
      <button className="fx-premium" onClick={onParent}>
        <span className="fx-crown">
          <span className="fx-crown-emoji">👑</span>
          <AssetImg className="fx-crown-img" src="/img/crown.png" />
        </span>
        <b>프리미엄으로 업그레이드!</b>
        <span className="fx-premium-go">
          <svg viewBox="0 0 24 24" fill="none" stroke="#7C59BA" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </button>

      {/* 큰 타일 2개 */}
      <div className="fx-tiles">
        {bigTiles.map((c) => {
          const t = TILE[c.id] || {};
          return (
            <button key={c.id} className="fx-tile" onClick={() => onPickCategory(c)}>
              <span className="fx-tile-ic">
                <span className="fx-tile-emoji">{t.emoji}</span>
                <AssetImg className="fx-tile-img" src={`/img/${t.icon}.png`} />
              </span>
              <b>{t.title || c.title}</b>
              <small>{t.desc || c.desc}</small>
            </button>
          );
        })}
      </div>

      {/* 추천 — 마스코트가 헤딩 오른쪽에 살짝 걸침 */}
      {recommended.length > 0 && (
        <section className="fx-sec">
          <h2 className="fx-sec-hd">
            <b>{name || "친구"}~</b>이 에게 추천!
          </h2>
          <span className="fx-mascot">
            <span className="fx-mascot-emoji">🤖</span>
            <AssetImg className="fx-mascot-img" src="/img/mascot.png" />
            <AssetImg className="fx-mascot-spark" src="/img/mascot-sparkle.png" />
          </span>
          <div className="fx-row">
            {recommended.map((a) => (
              <Card key={a.id} a={a} />
            ))}
          </div>
        </section>
      )}

      {/* 새로운 유익한 놀이 */}
      {fresh.length > 0 && (
        <section className="fx-sec">
          <h2 className="fx-sec-hd">
            <b>새로운 유익한 놀이</b> 가 있어요~
          </h2>
          <div className="fx-row">
            {fresh.map((a) => (
              <Card key={a.id} a={a} wide />
            ))}
          </div>
        </section>
      )}

      {/* 바로가기 리스트 3행 */}
      <div className="fx-quick">
        {quick.map((r) => (
          <button key={r.id} className="fx-qrow" onClick={() => onPickActivity(r.act)}>
            <span className="fx-qic">
              <span className="fx-qic-emoji">{r.emoji}</span>
              <AssetImg className="fx-qic-img" src={`/img/${r.icon}.png`} />
            </span>
            <span className="fx-qlabel">{r.label}</span>
            <svg className="fx-qgo" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>

      {/* 하단 입력 바 — 탭바와 하나의 다크 그라데이션 패널을 이룬다 */}
      {ask && (
        <div className="fx-composer">
          <button className="fx-cplus" onClick={onImageMaker} aria-label="더보기">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <span className="fx-ctext" onClick={() => onPickActivity(ask)}>
            뭐든지 물어봐요~!
          </span>
          <button className="fx-cmic" onClick={() => onPickActivity(ask)} aria-label="말하기">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M6 11a6 6 0 0 0 12 0M12 17v3" />
            </svg>
          </button>
          <button className="fx-cai" onClick={() => onPickActivity(ask)} aria-label="물어보기">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
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
