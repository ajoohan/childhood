import { useEffect, useState } from "react";
import Splash from "./screens/Splash.jsx";
import Onboarding from "./screens/Onboarding.jsx";
import KidsHome from "./screens/KidsHome.jsx";
import ActivityList from "./screens/ActivityList.jsx";
import Session from "./screens/Session.jsx";
import Collection from "./screens/Collection.jsx";
import ParentZone from "./screens/ParentZone.jsx";
import PinGate from "./components/PinGate.jsx";
import { INTERESTS } from "./lib/data.js";
import { loadStore, persist, userMsgCount } from "./lib/store.js";

const initial = loadStore();

// 스플래시는 "앱 구동 시 1회"만 노출. 모듈 스코프라 리마운트/HMR에는 유지되고,
// 페이지(앱)를 완전히 재시작하면 모듈이 새로 로드되어 다시 false → 스플래시 재노출.
let splashSeen = false;

export default function App() {
  const [data, setData] = useState({ categories: [], activities: [] });
  const [zone, setZone] = useState("kids"); // kids | parent
  const [view, setView] = useState({ name: "home" }); // home | list | session | collection

  const [histories, setHistories] = useState(initial.histories);
  const [safety, setSafety] = useState(initial.safety);
  const [settings, setSettings] = useState({
    limitPerDay: initial.settings.limitPerDay ?? null,
    ageMode: initial.settings.ageMode || "kid",
    pin: initial.settings.pin || null,
    voice: initial.settings.voice || "shimmer",
  });
  const [profile, setProfile] = useState(initial.profile);

  const [splash, setSplash] = useState(!splashSeen);
  const [pinOpen, setPinOpen] = useState(false);
  const [guardUnlocked, setGuardUnlocked] = useState(false);

  const dismissSplash = () => {
    splashSeen = true;
    setSplash(false);
  };

  useEffect(() => {
    persist({ histories, safety, settings, profile });
  }, [histories, safety, settings, profile]);

  function completeOnboarding(p) {
    // 나이를 연령 모드로 매핑: 0–6세 영유아 / 7세 이상 초등
    const ageMode = p.age != null && p.age <= 6 ? "young" : "kid";
    setProfile(p);
    setSettings((s) => ({ ...s, ageMode }));
  }

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
  const stars = Object.values(histories).reduce(
    (n, h) => n + userMsgCount(h),
    0
  );
  const history =
    view.name === "session" && view.activity
      ? histories[view.activity.id] || []
      : [];
  // 온보딩 프로필을 AI 개인화용으로 변환 (관심사 id → 한글 라벨)
  const persona = {
    name: profile.name,
    age: profile.age,
    interests: (profile.interests || [])
      .map((id) => INTERESTS.find((x) => x.id === id)?.label)
      .filter(Boolean),
  };
  const showTab =
    zone === "kids" && (view.name === "home" || view.name === "collection");

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
            interests={profile.interests}
            onPickCategory={(c) => setView({ name: "list", category: c })}
            onPickActivity={openActivity}
            onParent={openParent}
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
          <Collection
            activities={data.activities}
            histories={histories}
            name={profile.name}
            stars={stars}
            onPick={openActivity}
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

        {zone === "parent" && (
          <ParentZone
            activities={data.activities}
            histories={histories}
            safety={safety}
            settings={settings}
            profile={profile}
            onBack={() => setZone("kids")}
            onSaveLimit={(val) => setSettings((s) => ({ ...s, limitPerDay: val }))}
            onSetAge={(v) => setSettings((s) => ({ ...s, ageMode: v }))}
            onSaveProfile={(patch) =>
              setProfile((p) => {
                const next = { ...p, ...patch };
                // 나이가 바뀌면 연령 모드도 함께 맞춘다 (0–6 영유아 / 7+ 초등)
                if (patch.age != null && patch.age !== p.age) {
                  setSettings((s) => ({
                    ...s,
                    ageMode: patch.age <= 6 ? "young" : "kid",
                  }));
                }
                return next;
              })
            }
            onClear={() => {
              setHistories({});
              setSafety([]);
              setSettings((s) => ({ limitPerDay: null, ageMode: s.ageMode }));
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
            <span className="tab-icon">🏠</span>
            <span>홈</span>
          </button>
          <button
            className={`tab ${view.name === "collection" ? "active" : ""}`}
            onClick={() => setView({ name: "collection" })}
          >
            <span className="tab-icon">📦</span>
            <span>기록</span>
          </button>
          <button className="tab" onClick={openParent}>
            <span className="tab-icon">👨‍👩‍👧</span>
            <span>부모</span>
          </button>
        </nav>
      )}

      {pinGate}
    </div>
  );
}
