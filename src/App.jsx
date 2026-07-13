import { useEffect, useState } from "react";
import Home from "./screens/Home.jsx";
import Recent from "./screens/Recent.jsx";
import Chat from "./screens/Chat.jsx";
import Guard from "./screens/Guard.jsx";
import TabBar from "./components/TabBar.jsx";
import GateDialog from "./components/GateDialog.jsx";
import { loadStore, persist } from "./lib/store.js";

const initial = loadStore();

export default function App() {
  const [characters, setCharacters] = useState([]);
  const [screen, setScreen] = useState("home");
  const [current, setCurrent] = useState(null);
  const [previousScreen, setPreviousScreen] = useState("home");

  // 기기에 저장되는 상태
  const [histories, setHistories] = useState(initial.histories);
  const [safety, setSafety] = useState(initial.safety);
  const [settings, setSettings] = useState(initial.settings);

  // 보호자 게이트
  const [gate, setGate] = useState(null); // { a, b } 또는 null
  const [guardUnlocked, setGuardUnlocked] = useState(false);

  useEffect(() => {
    persist({ histories, safety, settings });
  }, [histories, safety, settings]);

  useEffect(() => {
    let alive = true;
    fetch("/api/characters")
      .then((r) => r.json())
      .then((d) => {
        if (alive) setCharacters(d);
      })
      .catch(() => {
        if (alive)
          setCharacters([
            {
              id: "kongi",
              name: "콩이",
              tagline: "동네에서 제일가는 개구쟁이 대장",
              quote: "재밌는 거 없나~? 오늘은 뭐 하고 놀까!",
              theme: ["#FFD8A6", "#FFA94D"],
              isNew: false,
              greeting: "안녕! 나는 개구쟁이 대장 콩이야! 🧡",
              image: null,
            },
          ]);
      });
    return () => {
      alive = false;
    };
  }, []);

  function openChat(character, from) {
    setCurrent(character);
    setPreviousScreen(from || "home");
    if (!histories[character.id]) {
      setHistories((h) => ({ ...h, [character.id]: [] }));
    }
    setScreen("chat");
  }

  function openGuard() {
    if (guardUnlocked) {
      setScreen("guard");
      return;
    }
    setGate({ a: 3 + Math.floor(Math.random() * 8), b: 4 + Math.floor(Math.random() * 8) });
  }

  function addUserMessage(id, msg) {
    setHistories((h) => ({ ...h, [id]: [...(h[id] || []), msg] }));
  }
  function addBotMessage(id, msg) {
    setHistories((h) => ({ ...h, [id]: [...(h[id] || []), msg] }));
  }
  function addSafety(ev) {
    setSafety((s) => [ev, ...s].slice(0, 100));
  }

  const showTabBar = screen === "home" || screen === "recent";
  const history = current ? histories[current.id] || [] : [];

  return (
    <div className="app">
      <div className="screens">
        {screen === "home" && (
          <Home
            characters={characters}
            histories={histories}
            onPick={(c) => openChat(c, "home")}
            onGuard={openGuard}
          />
        )}
        {screen === "recent" && (
          <Recent
            characters={characters}
            histories={histories}
            onPick={(c) => openChat(c, "recent")}
            onGuard={openGuard}
          />
        )}
        {screen === "chat" && current && (
          <Chat
            character={current}
            history={history}
            histories={histories}
            settings={settings}
            onBack={() => setScreen(previousScreen)}
            onUserMessage={addUserMessage}
            onBotMessage={addBotMessage}
            onSafety={addSafety}
            onGuard={openGuard}
          />
        )}
        {screen === "guard" && (
          <Guard
            characters={characters}
            histories={histories}
            safety={safety}
            settings={settings}
            onBack={() => setScreen("home")}
            onSaveLimit={(val) => setSettings({ limitPerDay: val })}
            onClear={() => {
              setHistories({});
              setSafety([]);
              setSettings({ limitPerDay: null });
            }}
          />
        )}
      </div>

      {showTabBar && (
        <TabBar
          screen={screen}
          onHome={() => setScreen("home")}
          onRecent={() => setScreen("recent")}
          onGuard={openGuard}
        />
      )}

      {gate && (
        <GateDialog
          a={gate.a}
          b={gate.b}
          onPass={() => {
            setGuardUnlocked(true);
            setGate(null);
            setScreen("guard");
          }}
          onClose={() => setGate(null)}
        />
      )}
    </div>
  );
}
