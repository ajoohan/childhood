import { useEffect, useState } from "react";
import Splash from "./screens/Splash.jsx";
import Onboarding from "./screens/Onboarding.jsx";
import KidsHome from "./screens/KidsHome.jsx";
import ActivityList from "./screens/ActivityList.jsx";
import Session from "./screens/Session.jsx";
import Collection from "./screens/Collection.jsx";
import CollectionHub from "./screens/CollectionHub.jsx";
import Speak from "./screens/Speak.jsx";
import ParentZone from "./screens/ParentZone.jsx";
import Settings from "./screens/Settings.jsx";
import PinGate from "./components/PinGate.jsx";
import SparksSheet from "./components/SparksSheet.jsx";
import MissionBoard from "./screens/MissionBoard.jsx";
import DecorRoom from "./screens/DecorRoom.jsx";
import ImageMaker from "./screens/ImageMaker.jsx";
import BadgeBook from "./screens/BadgeBook.jsx";
import StickerBook from "./screens/StickerBook.jsx";
import { INTERESTS, AVATARS } from "./lib/data.js";
import { sparkleBurst } from "./lib/fx.js";
import { sfx, setSfxEnabled } from "./lib/sfx.js";
import { earnedBadges, drawSticker } from "./lib/collectibles.js";
import { REWARD, allMissions, openTreasure } from "./lib/missions.js";
import { loadStore, persist, rollDay, emptyKid, newKidId } from "./lib/store.js";
import { ageModeForProfile, computeAge } from "./lib/age.js";

const initial = loadStore();
const initKid = initial.kids[initial.activeKid];
const APP_VERSION = "0.2.0";

// 스플래시는 "앱 구동 시 1회"만 노출. 모듈 스코프라 리마운트/HMR에는 유지되고,
// 페이지(앱)를 완전히 재시작하면 모듈이 새로 로드되어 다시 false → 스플래시 재노출.
let splashSeen = false;

export default function App() {
  const [data, setData] = useState({ categories: [], activities: [] });
  const [zone, setZone] = useState("kids"); // kids | parent
  const [view, setView] = useState({ name: "home" }); // home | list | session | collection

  // 멀티 프로필: 활성 아이의 데이터만 개별 state로 풀어 두고,
  // 나머지 아이들은 kids 맵에 스냅샷으로 보관한다.
  const [activeKid, setActiveKid] = useState(initial.activeKid);
  const [kids, setKids] = useState(initial.kids);
  const [histories, setHistories] = useState(initKid.histories);
  const [safety, setSafety] = useState(initKid.safety);
  const [notices, setNotices] = useState(initKid.notices || []);
  const [settings, setSettings] = useState({
    limitPerDay: initial.settings.limitPerDay ?? null,
    // 연령 모드는 아이 생년월에서 자동 계산 (10세부터 아동 모드)
    ageMode: ageModeForProfile(initKid.profile),
    pin: initial.settings.pin || null,
    voice: initial.settings.voice || "shimmer",
    sound: initial.settings.sound !== false,
    notifyMissions: initial.settings.notifyMissions !== false, // 커스텀 미션 완료 부모 알림
  });
  const [profile, setProfile] = useState(initKid.profile);
  const [rewards, setRewards] = useState(initKid.rewards);
  const [parentMissions, setParentMissions] = useState(initKid.parentMissions);
  const [decor, setDecor] = useState(initKid.decor);
  const [badges, setBadges] = useState(initKid.badges);
  const [stickers, setStickers] = useState(initKid.stickers);

  const [splash, setSplash] = useState(!splashSeen);
  const [parentView, setParentView] = useState("main"); // main | settings
  const [pinOpen, setPinOpen] = useState(false);
  const [sparksOpen, setSparksOpen] = useState(false);
  const [guardUnlocked, setGuardUnlocked] = useState(false);

  const dismissSplash = () => {
    splashSeen = true;
    setSplash(false);
  };

  // 현재 화면의 활성 아이 슬라이스를 한 덩어리로
  const kidSnapshot = () => ({
    profile,
    histories,
    safety,
    notices,
    rewards,
    parentMissions,
    decor,
    badges,
    stickers,
  });

  useEffect(() => {
    persist({
      settings,
      activeKid,
      kids: { ...kids, [activeKid]: kidSnapshot() },
    });
  }, [histories, safety, notices, settings, profile, rewards, parentMissions, decor, badges, stickers, activeKid, kids]);

  // 아이 슬라이스 일괄 로드 (전환/추가 시)
  function loadKidSlices(k) {
    setProfile(k.profile);
    setHistories(k.histories);
    setSafety(k.safety);
    setNotices(k.notices || []);
    setRewards(rollDay(k.rewards));
    setParentMissions(k.parentMissions);
    setDecor(k.decor);
    setBadges(k.badges);
    setStickers(k.stickers);
  }

  // 유저 변경 — 현재 아이를 스냅샷으로 저장하고 다른 아이 데이터를 불러온다.
  function switchKid(id) {
    if (id === activeKid || !kids[id]) return;
    setKids((m) => ({ ...m, [activeKid]: kidSnapshot() }));
    setActiveKid(id);
    loadKidSlices(kids[id]);
    setZone("kids");
    setView({ name: "home" });
  }

  // 새 아이 추가 — 빈 프로필로 시작하면 온보딩 흐름이 자동으로 뜬다.
  function addKid() {
    const id = newKidId();
    const k = emptyKid();
    setKids((m) => ({ ...m, [activeKid]: kidSnapshot(), [id]: k }));
    setActiveKid(id);
    loadKidSlices(k);
    setZone("kids");
    setView({ name: "home" });
  }

  // 홈 아바타 팝업·유저 변경 시트에서 쓰는 아이 목록
  const kidList = Object.entries({ ...kids, [activeKid]: kidSnapshot() })
    .filter(([, k]) => k.profile.onboarded)
    .map(([id, k]) => ({
      id,
      name: k.profile.name,
      avatar: k.profile.avatar || AVATARS[0],
      age: computeAge(k.profile),
      active: id === activeKid,
    }));

  // 연령 모드 자동 전환 — 아이 생년월로 현재 나이를 계산해 모드를 맞춘다.
  // 앱을 열 때마다(그리고 프로필이 바뀔 때) 다시 계산되므로, 아이가 10세가 되면
  // 다음 실행부터 영유아(1–9세)에서 아동(10–13세) 모드로 자연스럽게 넘어간다.
  useEffect(() => {
    const mode = ageModeForProfile(profile);
    setSettings((s) => (s.ageMode === mode ? s : { ...s, ageMode: mode }));
  }, [profile.birthYear, profile.birthMonth, profile.age]);

  // 아바타 없는 기존(v1 마이그레이션) 프로필에 자동 배정
  useEffect(() => {
    if (profile.onboarded && !profile.avatar) {
      const seed = (profile.name || "").split("").reduce((n, c) => n + c.charCodeAt(0), 0);
      setProfile((p) => ({ ...p, avatar: AVATARS[seed % AVATARS.length] }));
    }
  }, [profile.onboarded, profile.avatar]);

  // 효과음 on/off 반영
  useEffect(() => {
    setSfxEnabled(settings.sound);
  }, [settings.sound]);

  // 새로 달성한 배지 자동 잠금 해제
  useEffect(() => {
    const met = earnedBadges({ profile, histories, rewards, decor, stickers });
    setBadges((prev) => {
      const set = new Set(prev);
      let changed = false;
      met.forEach((id) => {
        if (!set.has(id)) {
          set.add(id);
          changed = true;
        }
      });
      return changed ? Array.from(set) : prev;
    });
  }, [profile, histories, rewards, decor, stickers]);

  // 미션 완료 → 별 지급 + 올클리어 보너스 (기획서 3장 밸런싱)
  function completeMission(mission) {
    setRewards((r0) => {
      const r = rollDay(r0);
      if (r.doneToday.includes(mission.id)) return r; // 하루 1회
      const doneToday = [...r.doneToday, mission.id];
      const gain = mission.reward || REWARD.mission;
      let balance = r.balance + gain;
      let earnedToday = r.earnedToday + gain;
      let allClear = r.allClear;
      // 오늘의 모든 미션(기본+부모)을 다 했으면 올클리어 보너스
      const total = allMissions(parentMissions).length;
      if (!allClear && doneToday.length >= total && total > 0) {
        balance += REWARD.allClear;
        earnedToday += REWARD.allClear;
        allClear = true;
      }
      return { ...r, doneToday, balance, earnedToday, allClear };
    });
    // 미션 완료 보상: 랜덤 스티커 + 효과음
    setStickers((s) => {
      const id = drawSticker(s);
      return { ...s, [id]: (s[id] || 0) + 1 };
    });
    // 부모 알림 — 알림 켜진 커스텀 미션이면 부모 알림함에 적재
    // (앱 푸시 발송은 서버 연결 후 이 지점에서 함께 전송)
    if (mission.notify && settings.notifyMissions) {
      setNotices((n) =>
        [
          {
            t: new Date().toISOString(),
            type: "mission",
            kidName: profile.name,
            emoji: mission.emoji,
            title: mission.title,
            reward: mission.reward || REWARD.mission,
          },
          ...n,
        ].slice(0, 50)
      );
    }
    sfx.success();
  }

  // 보물상자 개봉 — 하루 미션 올클리어 시 1회. 랜덤 보상(별 또는 스티커).
  // 결제 없음·하루 1회·미션 완료로만. 반환값을 화면이 받아 연출한다.
  function openChest() {
    if (!rewards.allClear || rewards.chestOpened) return null;
    const reward = openTreasure(stickers);
    setRewards((r0) => {
      const r = rollDay(r0);
      if (r.chestOpened) return r;
      const extra = reward.type === "star" ? reward.amount : 0;
      return {
        ...r,
        chestOpened: true,
        balance: r.balance + extra,
        earnedToday: r.earnedToday + extra,
      };
    });
    if (reward.type === "sticker") {
      setStickers((s) => ({ ...s, [reward.id]: (s[reward.id] || 0) + 1 }));
    }
    sfx.success();
    return reward;
  }

  // 출석 + AI 첫인사 (하루 1회)
  function claimAttendance() {
    setRewards((r0) => {
      const r = rollDay(r0);
      if (r.attendance) return r;
      return {
        ...r,
        attendance: true,
        balance: r.balance + REWARD.attendance,
        earnedToday: r.earnedToday + REWARD.attendance,
      };
    });
    sfx.star();
  }

  const addParentMission = (m) => setParentMissions((p) => [...p, m]);
  const removeParentMission = (id) =>
    setParentMissions((p) => p.filter((x) => x.id !== id));

  // 꾸미기: 오브젝트 배치는 무료(자유롭게 꾸미기). 별은 여기서 차감하지 않는다.
  function placeDecor(themeId, slot, optIndex) {
    setDecor((d) => ({
      ...d,
      placed: {
        ...d.placed,
        [themeId]: { ...(d.placed[themeId] || {}), [slot.id]: optIndex },
      },
    }));
    return true;
  }
  const setDecorTheme = (themeId) => setDecor((d) => ({ ...d, theme: themeId }));

  // 콜렉션 완성 → 이때만 별이 소진된다(별이 날아가며 줄어드는 순간). 하루 언제든 1회.
  // 별 잔액이 부족하면 완성 불가(false 반환).
  function completeCollection(theme) {
    if (decor.completed.includes(theme.id)) return false;
    if (rewards.balance < theme.cost) return false;
    setRewards((r0) => {
      const r = rollDay(r0);
      if (r.balance < theme.cost) return r;
      return { ...r, balance: r.balance - theme.cost };
    });
    setDecor((d) =>
      d.completed.includes(theme.id)
        ? d
        : { ...d, completed: [...d.completed, theme.id] }
    );
    return true;
  }

  function completeOnboarding(p) {
    // 아바타 미선택 시 이름 기반으로 하나 배정 (부모존에서 언제든 변경 가능)
    const seed = (p.name || "").split("").reduce((n, c) => n + c.charCodeAt(0), 0);
    const withAvatar = { ...p, avatar: p.avatar || AVATARS[seed % AVATARS.length] };
    // 연령 모드는 생년월 기반으로 useEffect에서 자동 계산된다.
    setProfile(withAvatar);
    setSettings((s) => ({ ...s, ageMode: ageModeForProfile(withAvatar) }));
  }

  // 탭 반짝임 효과 — 누르는 곳마다 별이 튄다 (아이용 즐거움)
  useEffect(() => {
    const layer = document.createElement("div");
    layer.className = "fx-layer";
    document.body.appendChild(layer);
    const SEL =
      "button,.big-tile,.learn-card,.rec-card,.act-card,.parent-banner,.coll-item,.hd-ava,.polaroid,.decor-slot,.sparks-way";
    function onDown(e) {
      const t = e.target.closest && e.target.closest(SEL);
      if (!t || t.disabled) return;
      sparkleBurst(e.clientX, e.clientY, layer);
      sfx.tap();
    }
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      layer.remove();
    };
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/activities")
      .then((r) => r.json())
      .then((d) => alive && setData(d))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  function openParent() {
    if (guardUnlocked) {
      setZone("parent");
      return;
    }
    setPinOpen(true);
  }

  const pinGate = pinOpen ? (
    <PinGate
      savedPin={settings.pin}
      onSetPin={(pin) => setSettings((s) => ({ ...s, pin }))}
      onUnlock={() => {
        setGuardUnlocked(true);
        setPinOpen(false);
        setSplash(false);
        setZone("parent");
      }}
      onClose={() => setPinOpen(false)}
    />
  ) : null;

  const addUser = (id, msg) =>
    setHistories((h) => ({ ...h, [id]: [...(h[id] || []), msg] }));
  const addBot = (id, msg) =>
    setHistories((h) => ({ ...h, [id]: [...(h[id] || []), msg] }));
  const addSafety = (ev) => setSafety((s) => [ev, ...s].slice(0, 100));

  const openActivity = (a) => setView({ name: "session", activity: a });
  const stars = rewards.balance; // 별 잔액 (미션으로 획득, 꾸미기로 소모)
  const history =
    view.name === "session" && view.activity
      ? histories[view.activity.id] || []
      : [];
  // 온보딩 프로필을 AI 개인화용으로 변환 (관심사 id → 한글 라벨)
  const persona = {
    name: profile.name,
    age: computeAge(profile) ?? profile.age,
    interests: (profile.interests || [])
      .map((id) => INTERESTS.find((x) => x.id === id)?.label)
      .filter(Boolean),
  };
  const showTab =
    zone === "kids" &&
    (view.name === "home" ||
      view.name === "collection" ||
      view.name === "missions");

  if (splash) {
    return (
      <div className="app">
        <Splash onStart={dismissSplash} onParent={openParent} />
        {pinGate}
      </div>
    );
  }

  if (!profile.onboarded) {
    return (
      <div className="app">
        <Onboarding onDone={completeOnboarding} />
      </div>
    );
  }

  return (
    <div className="app">
      <div className="screens">
        {zone === "kids" && view.name === "home" && (
          <KidsHome
            categories={data.categories}
            activities={data.activities}
            ageMode={settings.ageMode}
            stars={stars}
            name={profile.name}
            avatar={profile.avatar}
            interests={profile.interests}
            kidList={kidList}
            onSwitchKid={switchKid}
            onAddKid={addKid}
            onPickCategory={(c) => setView({ name: "list", category: c })}
            onPickActivity={openActivity}
            onParent={openParent}
            onStars={() => setSparksOpen(true)}
            onCollection={() => setView({ name: "history" })}
            onImageMaker={() => setView({ name: "image" })}
            onBadges={() => setView({ name: "badges" })}
            imageEnabled={!!data.features?.image}
          />
        )}

        {zone === "kids" && view.name === "list" && (
          <ActivityList
            category={view.category}
            activities={data.activities}
            ageMode={settings.ageMode}
            onBack={() => setView({ name: "home" })}
            onPick={openActivity}
          />
        )}

        {zone === "kids" && view.name === "collection" && (
          <CollectionHub
            decor={decor}
            stickers={stickers}
            stars={stars}
            onDecor={() => setView({ name: "decor" })}
            onStickers={() => setView({ name: "stickers" })}
          />
        )}

        {zone === "kids" && view.name === "history" && (
          <Collection
            activities={data.activities}
            histories={histories}
            name={profile.name}
            stars={stars}
            onPick={openActivity}
            onBack={() => setView({ name: "home" })}
          />
        )}

        {zone === "kids" && view.name === "voice" && (
          <Speak
            activity={data.activities.find((a) => a.id === "learn_ask")}
            history={histories["learn_ask"] || []}
            histories={histories}
            settings={settings}
            persona={persona}
            voice={settings.voice}
            // 10세 미만은 음성 통화, 10세 이상은 텍스트 챗이 기본 (기획서 3장)
            defaultMode={settings.ageMode === "kid" ? "text" : "voice"}
            onSetVoice={(v) => setSettings((s) => ({ ...s, voice: v }))}
            onUserMessage={addUser}
            onBotMessage={addBot}
            onSafety={addSafety}
            onBack={() => setView({ name: "home" })}
          />
        )}

        {zone === "kids" && view.name === "session" && view.activity && (
          <Session
            activity={view.activity}
            history={history}
            histories={histories}
            settings={settings}
            persona={persona}
            onBack={() =>
              setView({
                name: "list",
                category: data.categories.find(
                  (c) => c.id === view.activity.category
                ),
              })
            }
            onUserMessage={addUser}
            onBotMessage={addBot}
            onSafety={addSafety}
          />
        )}

        {zone === "kids" && view.name === "missions" && (
          <MissionBoard
            name={profile.name}
            rewards={rewards}
            parentMissions={parentMissions}
            onComplete={completeMission}
            onClaimAttendance={claimAttendance}
            onOpenChest={openChest}
            onCollection={() => setView({ name: "collection" })}
          />
        )}

        {zone === "kids" && view.name === "image" && (
          <ImageMaker
            enabled={!!data.features?.image}
            onBack={() => setView({ name: "home" })}
          />
        )}

        {zone === "kids" && view.name === "badges" && (
          <BadgeBook badges={badges} onBack={() => setView({ name: "home" })} />
        )}

        {zone === "kids" && view.name === "stickers" && (
          <StickerBook
            stickers={stickers}
            onBack={() => setView({ name: "collection" })}
          />
        )}

        {zone === "kids" && view.name === "decor" && (
          <DecorRoom
            decor={decor}
            balance={rewards.balance}
            onPlace={placeDecor}
            onSetTheme={setDecorTheme}
            onComplete={completeCollection}
            onBack={() => setView({ name: "collection" })}
          />
        )}

        {zone === "parent" && parentView === "main" && (
          <ParentZone
            activities={data.activities}
            histories={histories}
            safety={safety}
            notices={notices}
            onClearNotices={() => setNotices([])}
            settings={settings}
            profile={profile}
            rewards={rewards}
            parentMissions={parentMissions}
            onAddMission={addParentMission}
            onRemoveMission={removeParentMission}
            onBack={() => {
              setZone("kids");
              setParentView("main");
            }}
            onSettings={() => setParentView("settings")}
            onSaveProfile={(patch) =>
              // 생년월이 바뀌면 연령 모드는 useEffect가 자동으로 다시 계산한다.
              setProfile((p) => ({ ...p, ...patch }))
            }
          />
        )}

        {zone === "parent" && parentView === "settings" && (
          <Settings
            settings={settings}
            version={APP_VERSION}
            onBack={() => setParentView("main")}
            onSetSound={(v) => setSettings((s) => ({ ...s, sound: v }))}
            onSetNotifyMissions={(v) => setSettings((s) => ({ ...s, notifyMissions: v }))}
            onSaveLimit={(val) => setSettings((s) => ({ ...s, limitPerDay: val }))}
            onSetVoice={(v) => setSettings((s) => ({ ...s, voice: v }))}
            onSetPin={(pin) => setSettings((s) => ({ ...s, pin }))}
            onClear={() => {
              setHistories({});
              setSafety([]);
              setSettings((s) => ({ ...s, limitPerDay: null }));
            }}
          />
        )}
      </div>

      {showTab && (
        <nav className="tab-bar">
          <button
            className={`tab ${view.name === "home" ? "active" : ""}`}
            onClick={() => setView({ name: "home" })}
          >
            <svg className="tab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 11l8-7 8 7" />
              <path d="M6 10v9h12v-9" />
            </svg>
            <span>홈</span>
          </button>
          <button
            className={`tab ${view.name === "missions" ? "active" : ""}`}
            onClick={() => setView({ name: "missions" })}
          >
            <svg className="tab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="8" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>미션</span>
          </button>
          <button
            className={`tab speak ${view.name === "voice" ? "active" : ""}`}
            onClick={() => setView({ name: "voice" })}
          >
            <span className="tab-speak-ring">
              <svg className="tab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M6 11a6 6 0 0 0 12 0M12 17v3" />
              </svg>
            </span>
            <span>스피크</span>
          </button>
          <button
            className={`tab ${view.name === "collection" ? "active" : ""}`}
            onClick={() => setView({ name: "collection" })}
          >
            <svg className="tab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="6" width="16" height="14" rx="2" />
              <path d="M4 10h16M9 6V4h6v2" />
            </svg>
            <span>콜렉션</span>
          </button>
          <button className="tab" onClick={openParent}>
            <svg className="tab-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="8" r="3" />
              <circle cx="17" cy="9" r="2.4" />
              <path d="M3.5 19a5.5 5.5 0 0 1 11 0M14.5 19a4 4 0 0 1 6 0" />
            </svg>
            <span>부모</span>
          </button>
        </nav>
      )}

      {pinGate}

      {sparksOpen && (
        <SparksSheet
          stars={stars}
          activities={data.activities}
          onGo={(a) => {
            setSparksOpen(false);
            openActivity(a);
          }}
          onClose={() => setSparksOpen(false)}
        />
      )}
    </div>
  );
}
