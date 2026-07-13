import { useEffect, useState } from "react";
import KidsHome from "./screens/KidsHome.jsx";
import ActivityList from "./screens/ActivityList.jsx";
import Session from "./screens/Session.jsx";
import Collection from "./screens/Collection.jsx";
import ParentZone from "./screens/ParentZone.jsx";
import GateDialog from "./components/GateDialog.jsx";
import { loadStore, persist, userMsgCount } from "./lib/store.js";

const initial = loadStore();

export default function App() {
  const [data, setData] = useState({ categories: [], activities: [] });
  const [zone, setZone] = useState("kids"); // kids | parent
  const [view, setView] = useState({ name: "home" }); // home | list | session | collection

  const [histories, setHistories] = useState(initial.histories);
  const [safety, setSafety] = useState(initial.safety);
  const [settings, setSettings] = useState({
    limitPerDay: initial.settings.limitPerDay ?? null,
    ageMode: initial.settings.ageMode || "kid",
  });

  const [gate, setGate] = useState(null);
  const [guardUnlocked, setGuardUnlocked] = useState(false);

  useEffect(() => {
    persist({ histories, safety, settings });
  }, [histories, safety, settings]);

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
    setGate({ a: 3 + Math.floor(Math.random() * 8), b: 4 + Math.floor(Math.random() * 8) });
  }

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
  const showTab =
    zone === "kids" && (view.name === "home" || view.name === "collection");

  return (
    <div className="app">
      <div className="screens">
        {zone === "kids" && view.name === "home" && (
          <KidsHome
            categories={data.categories}
            activities={data.activities}
            ageMode={settings.ageMode}
            stars={stars}
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
            onPick={openActivity}
          />
        )}

        {zone === "kids" && view.name === "session" && view.activity && (
          <Session
            activity={view.activity}
            history={history}
            histories={histories}
            settings={settings}
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
            onBack={() => setZone("kids")}
            onSaveLimit={(val) => setSettings((s) => ({ ...s, limitPerDay: val }))}
            onSetAge={(v) => setSettings((s) => ({ ...s, ageMode: v }))}
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

      {gate && (
        <GateDialog
          a={gate.a}
          b={gate.b}
          onPass={() => {
            setGuardUnlocked(true);
            setGate(null);
            setZone("parent");
          }}
          onClose={() => setGate(null)}
        />
      )}
    </div>
  );
}
