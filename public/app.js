const homeScreen = document.getElementById("homeScreen");
const recentScreen = document.getElementById("recentScreen");
const chatScreen = document.getElementById("chatScreen");
const tabBar = document.getElementById("tabBar");
const heroTrack = document.getElementById("heroTrack");
const heroPause = document.getElementById("heroPause");
const heroIndex = document.getElementById("heroIndex");
const heroTotal = document.getElementById("heroTotal");
const characterRow = document.getElementById("characterRow");
const recentList = document.getElementById("recentList");
const chatEl = document.getElementById("chat");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const backBtn = document.getElementById("backBtn");
const headerAvatar = document.getElementById("headerAvatar");
const headerName = document.getElementById("headerName");
const headerTagline = document.getElementById("headerTagline");
const guardScreen = document.getElementById("guardScreen");
const tabHome = document.getElementById("tabHome");
const tabChat = document.getElementById("tabChat");
const gateDialog = document.getElementById("gateDialog");
const gateQ = document.getElementById("gateQ");
const gateAnswer = document.getElementById("gateAnswer");
const gateError = document.getElementById("gateError");

let characters = [];
let current = null;
let previousScreen = "home";
let guardUnlocked = false;
let gateExpected = 0;

// ── 로컬 저장 (서버가 아닌 이 기기 브라우저에만 저장됨) ──
const STORE_KEY = "banjjaktalk_v1";
function loadStore() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch {
    return {};
  }
}
function saveStore() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {}
}
const store = loadStore();
if (!store.histories) store.histories = {};
if (!Array.isArray(store.safety)) store.safety = [];
if (!store.settings) store.settings = { limitPerDay: null };

// 캐릭터별 대화 기록 (기기에 저장됨)
const histories = store.histories;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function msgCount(id) {
  return (histories[id] || []).filter((m) => m.role === "user").length;
}

function messagesToday() {
  const t = todayKey();
  let n = 0;
  for (const h of Object.values(histories)) {
    for (const m of h) if (m.role === "user" && (m.t || "").slice(0, 10) === t) n++;
  }
  return n;
}

// ── 보호자 확인 게이트 → 대시보드 ──
function openGuard() {
  if (guardUnlocked) {
    showScreen("guard");
    return;
  }
  const a = 3 + Math.floor(Math.random() * 8);
  const b = 4 + Math.floor(Math.random() * 8);
  gateExpected = a + b;
  gateQ.textContent = `${a} + ${b} = ?`;
  gateAnswer.value = "";
  gateError.hidden = true;
  gateDialog.showModal();
  gateAnswer.focus();
}
function submitGate() {
  if (Number(gateAnswer.value) === gateExpected) {
    guardUnlocked = true;
    gateDialog.close();
    showScreen("guard");
  } else {
    gateError.hidden = false;
    gateAnswer.value = "";
    gateAnswer.focus();
  }
}
for (const id of ["parentBtn", "parentBtnHome", "parentBtnRecent", "tabParent"]) {
  document.getElementById(id).addEventListener("click", openGuard);
}
document.getElementById("gateCancel").addEventListener("click", () => gateDialog.close());
document.getElementById("gateOk").addEventListener("click", submitGate);
gateAnswer.addEventListener("keydown", (e) => {
  if (e.key === "Enter") submitGate();
});
document.getElementById("guardBack").addEventListener("click", () => showScreen("home"));

// ── 화면 전환 ──
function showScreen(name) {
  homeScreen.hidden = name !== "home";
  recentScreen.hidden = name !== "recent";
  chatScreen.hidden = name !== "chat";
  guardScreen.hidden = name !== "guard";
  tabBar.hidden = name === "chat" || name === "guard";
  tabHome.classList.toggle("active", name === "home");
  tabChat.classList.toggle("active", name === "recent");

  if (name === "home") {
    renderCharacterRow();
    if (!heroPaused) startHeroTimer();
  } else {
    clearInterval(heroTimer);
  }
  if (name === "recent") renderRecent();
  if (name === "guard") renderGuard();
}

tabHome.addEventListener("click", () => showScreen("home"));
tabChat.addEventListener("click", () => showScreen("recent"));
backBtn.addEventListener("click", () => showScreen(previousScreen));

// 햇살 가득한 수채화풍 야외 배경 (모든 히어로 슬라이드 공통)
// feTurbulence+feDisplacementMap 으로 붓 번짐 같은 불규칙한 가장자리를 만든다.
const HERO_SCENE = `<svg class="scene-svg" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#AFE0FF"/><stop offset="0.75" stop-color="#EAF7EE"/></linearGradient>
    <linearGradient id="grassG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#CDEA92"/><stop offset="1" stop-color="#8FC94F"/></linearGradient>
    <filter id="wc" x="-15%" y="-15%" width="130%" height="130%">
      <feTurbulence type="fractalNoise" baseFrequency="0.012 0.022" numOctaves="3" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G"/>
      <feGaussianBlur stdDeviation="0.5"/>
    </filter>
    <filter id="soft"><feGaussianBlur stdDeviation="1.4"/></filter>
  </defs>
  <rect width="400" height="250" fill="url(#sky)"/>
  <g filter="url(#wc)">
    <circle cx="336" cy="50" r="50" fill="#FFE08A" opacity="0.35"/>
    <circle cx="336" cy="50" r="33" fill="#FFE49A"/>
    <ellipse cx="92" cy="58" rx="36" ry="15" fill="#ffffff" opacity="0.8"/>
    <ellipse cx="124" cy="50" rx="27" ry="12" fill="#ffffff" opacity="0.8"/>
    <path d="M0 170 Q110 136 210 168 T400 162 L400 250 L0 250 Z" fill="#B9E084" opacity="0.9"/>
    <path d="M0 198 Q130 172 250 198 T400 192 L400 250 L0 250 Z" fill="url(#grassG)"/>
    <rect x="56" y="174" width="8" height="24" rx="3" fill="#9c7a4a"/>
    <circle cx="60" cy="164" r="25" fill="#7FBE49"/>
    <circle cx="47" cy="171" r="15" fill="#8FCB58"/>
    <circle cx="74" cy="171" r="15" fill="#8FCB58"/>
  </g>
  <g filter="url(#soft)" opacity="0.5">
    <ellipse cx="150" cy="215" rx="70" ry="14" fill="#7CB945"/>
    <ellipse cx="300" cy="225" rx="90" ry="16" fill="#84C24C"/>
  </g>
</svg>`;

// ── 히어로 캐러셀 ──
let heroIdx = 0;
let heroTimer = null;
let heroPaused = false;

function pad(n) {
  return String(n).padStart(2, "0");
}

function renderHero() {
  heroTrack.innerHTML = "";
  for (const c of characters) {
    const slide = document.createElement("div");
    slide.className = "hero-slide";
    slide.innerHTML = `
      <div class="hero-scene">${HERO_SCENE}</div>
      ${c.isNew ? '<span class="hero-new">New</span>' : ""}
      <span class="hero-art">${avatarHTML(c)}</span>
      <div class="hero-text">
        <div class="hero-eyebrow">${c.name}</div>
        <div class="hero-name">${c.tagline}</div>
        <div class="hero-quote">"${c.quote}"</div>
      </div>`;
    slide.addEventListener("click", () => openChat(c, "home"));
    heroTrack.appendChild(slide);
  }
  heroTotal.textContent = pad(characters.length);
  updateHero();
}

function updateHero() {
  heroTrack.style.transform = `translateX(-${heroIdx * 100}%)`;
  heroIndex.textContent = pad(heroIdx + 1);
}

function startHeroTimer() {
  clearInterval(heroTimer);
  heroTimer = setInterval(() => {
    heroIdx = (heroIdx + 1) % characters.length;
    updateHero();
  }, 4000);
}

heroPause.addEventListener("click", (e) => {
  e.stopPropagation();
  heroPaused = !heroPaused;
  heroPause.textContent = heroPaused ? "▶" : "⏸";
  if (heroPaused) clearInterval(heroTimer);
  else startHeroTimer();
});

// ── 인기 친구들 카드 ──
function renderCharacterRow() {
  characterRow.innerHTML = "";
  for (const c of characters) {
    const card = document.createElement("button");
    card.className = "pop-card";
    card.innerHTML = `
      <span class="pop-thumb" style="background: linear-gradient(160deg, #ffffff, ${c.theme[0]})">
        ${c.isNew ? '<span class="pop-new">New</span>' : ""}
        <span class="pop-art">${avatarHTML(c)}</span>
        <span class="pop-count">💬 ${msgCount(c.id)}</span>
      </span>
      <span class="pop-name">${c.name}</span>
      <span class="pop-quote">"${c.quote}"</span>`;
    card.addEventListener("click", () => openChat(c, "home"));
    characterRow.appendChild(card);
  }
}

document.getElementById("moreBtn").addEventListener("click", () => {
  characterRow.scrollTo({ left: characterRow.scrollWidth, behavior: "smooth" });
});

// ── 최근 대화 목록 ──
function renderRecent() {
  recentList.innerHTML = "";
  const sorted = [...characters].sort((a, b) => msgCount(b.id) - msgCount(a.id));
  const hasAny = sorted.some((c) => msgCount(c.id) > 0);

  if (!hasAny) {
    const empty = document.createElement("p");
    empty.className = "recent-empty";
    empty.textContent = "아직 나눈 이야기가 없어요.\n친구를 골라서 첫 대화를 시작해 볼까요? 💬";
    recentList.appendChild(empty);
  }

  for (const c of sorted) {
    const history = histories[c.id] || [];
    const lastUser = [...history].reverse().find((m) => m.role === "user");
    const preview = lastUser ? lastUser.content : "아직 대화하지 않았어요";
    const count = msgCount(c.id);

    const item = document.createElement("button");
    item.className = "recent-item";
    item.innerHTML = `
      <span class="recent-ava" style="background: linear-gradient(160deg, #ffffff, ${c.theme[0]})">${avatarHTML(c)}</span>
      <span class="recent-body">
        <b>${c.name}</b>
        <span class="recent-preview ${lastUser ? "" : "muted"}">${escapeHtml(preview)}</span>
      </span>
      ${count ? `<span class="recent-badge">${count}</span>` : '<span class="recent-go">›</span>'}`;
    item.addEventListener("click", () => openChat(c, "recent"));
    recentList.appendChild(item);
  }
}

// ── 채팅 ──
function openChat(character, from) {
  current = character;
  previousScreen = from || "home";
  headerAvatar.innerHTML = avatarHTML(character);
  headerName.textContent = character.name;
  headerTagline.textContent = character.tagline;

  if (!histories[character.id]) histories[character.id] = [];
  renderHistory();
  showScreen("chat");
  inputEl.focus();
}

function renderHistory() {
  chatEl.innerHTML = "";
  addMessage("bot", current.greeting);
  for (const m of histories[current.id]) {
    addMessage(m.role === "user" ? "user" : "bot", m.content);
  }
}

function addMessage(role, text) {
  const wrap = document.createElement("div");
  wrap.className = `message ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  if (role === "bot") avatar.innerHTML = avatarHTML(current);
  else avatar.textContent = "🙂";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  wrap.appendChild(avatar);
  wrap.appendChild(bubble);
  chatEl.appendChild(wrap);
  chatEl.scrollTop = chatEl.scrollHeight;
  return bubble;
}

async function send() {
  const text = inputEl.value.trim();
  if (!text || sendBtn.disabled || !current) return;

  // 보호자가 정한 하루 대화 횟수 제한 (기기 저장, 소프트 제한)
  const limit = store.settings.limitPerDay;
  if (limit && messagesToday() >= limit) {
    inputEl.value = "";
    addMessage("bot", `오늘은 이야기를 ${limit}번이나 나눴대! 오늘은 여기까지 하고 내일 또 만나자 😊`);
    return;
  }

  inputEl.value = "";
  sendBtn.disabled = true;
  inputEl.disabled = true;

  const history = histories[current.id];
  addMessage("user", text);
  history.push({ role: "user", content: text, t: new Date().toISOString() });
  saveStore();

  const bubble = addMessage("bot", "");
  bubble.classList.add("typing");

  let reply = "";
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characterId: current.id, messages: history }),
    });

    if (!res.ok || !res.body) {
      let msg = null;
      try {
        const j = await res.json();
        if (j && j.error) msg = j.error;
      } catch {}
      const e = new Error(msg || `HTTP ${res.status}`);
      if (msg) e.friendly = msg;
      throw e;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") continue;
        const obj = JSON.parse(data);

        // 안전 분류 메타: 아이 화면엔 표시하지 않고 보호자 대시보드용으로 기록만 한다.
        if (obj.safety) {
          store.safety.unshift({
            t: new Date().toISOString(),
            characterId: current.id,
            characterName: current.name,
            category: obj.safety,
            text,
          });
          if (store.safety.length > 100) store.safety.length = 100;
          saveStore();
          continue;
        }

        const delta = obj.text || "";
        reply += delta;
        bubble.classList.remove("typing");
        bubble.textContent = reply;
        chatEl.scrollTop = chatEl.scrollHeight;
      }
    }
  } catch (err) {
    console.error(err);
    reply =
      reply ||
      err.friendly ||
      `앗, ${current.name}랑 연결이 잠깐 끊겼어. 다시 말해 줄래?`;
    bubble.textContent = reply;
  } finally {
    bubble.classList.remove("typing");
    history.push({ role: "assistant", content: reply });
    saveStore();
    sendBtn.disabled = false;
    inputEl.disabled = false;
    inputEl.focus();
  }
}

sendBtn.addEventListener("click", send);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.isComposing) send();
});

// ── 보호자 대시보드 렌더링 ──
const SAFETY_LABEL = {
  personal_info: {
    icon: "🔒",
    name: "개인정보 공유 시도",
    cls: "warn",
    tip: "아이와 함께 개인정보(주소·학교·전화번호 등)를 인터넷에서 말하지 않기로 이야기해 보세요.",
  },
  harmful_request: {
    icon: "🚫",
    name: "부적절한 요청",
    cls: "warn",
    tip: "아이가 어떤 맥락에서 물었는지 부드럽게 대화해 보세요.",
  },
  distress: {
    icon: "❤️",
    name: "마음 신호 감지",
    cls: "danger",
    tip: "아이의 마음을 살펴봐 주세요. 필요하면 청소년 상담전화 1388에 도움을 청할 수 있어요.",
  },
};

function fmtTime(iso) {
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function lastTime(id) {
  const h = histories[id] || [];
  for (let i = h.length - 1; i >= 0; i--) {
    if (h[i].role === "user" && h[i].t) return h[i].t;
  }
  return null;
}

function renderGuard() {
  // 안전 알림
  const alertList = document.getElementById("alertList");
  alertList.innerHTML = "";
  if (!store.safety.length) {
    alertList.innerHTML = '<p class="guard-empty">아직 특별한 알림이 없어요. 👍</p>';
  } else {
    for (const ev of store.safety.slice(0, 30)) {
      const label = SAFETY_LABEL[ev.category] || {
        icon: "⚠️",
        name: "알림",
        cls: "warn",
        tip: "",
      };
      const item = document.createElement("div");
      item.className = `alert-item ${label.cls}`;
      item.innerHTML = `
        <span class="alert-icon">${label.icon}</span>
        <div class="alert-body">
          <div class="alert-top"><b>${label.name}</b><span class="alert-time">${fmtTime(ev.t)}</span></div>
          <div class="alert-meta">${escapeHtml(ev.characterName || "")}와의 대화</div>
          <div class="alert-text">"${escapeHtml(ev.text || "")}"</div>
          ${label.tip ? `<div class="alert-tip">${label.tip}</div>` : ""}
        </div>`;
      alertList.appendChild(item);
    }
  }

  // 사용 현황
  const total = Object.values(histories).reduce(
    (n, h) => n + h.filter((m) => m.role === "user").length,
    0
  );
  document.getElementById("usageSummary").innerHTML =
    `오늘 <b>${messagesToday()}</b>번 · 전체 <b>${total}</b>번 대화했어요.`;

  const usageList = document.getElementById("usageList");
  usageList.innerHTML = "";
  const rows = characters
    .map((c) => ({ c, n: msgCount(c.id), last: lastTime(c.id) }))
    .sort((a, b) => b.n - a.n);
  for (const { c, n, last } of rows) {
    const row = document.createElement("div");
    row.className = "usage-item";
    row.innerHTML = `
      <span class="usage-ava" style="background: linear-gradient(160deg,#fff,${c.theme[0]})">${avatarHTML(c)}</span>
      <span class="usage-name">${c.name}</span>
      <span class="usage-count">${n}번${last ? ` · ${fmtTime(last)}` : ""}</span>`;
    usageList.appendChild(row);
  }

  // 설정
  document.getElementById("limitInput").value = store.settings.limitPerDay || "";
  document.getElementById("limitSaved").textContent = "";
}

document.getElementById("saveLimit").addEventListener("click", () => {
  const v = document.getElementById("limitInput").value.trim();
  store.settings.limitPerDay = v ? Math.max(0, parseInt(v, 10) || 0) : null;
  saveStore();
  document.getElementById("limitSaved").textContent = store.settings.limitPerDay
    ? `하루 ${store.settings.limitPerDay}번으로 저장했어요.`
    : "제한 없음으로 저장했어요.";
});

document.getElementById("clearData").addEventListener("click", () => {
  if (!confirm("모든 대화·알림·설정 기록을 지울까요? 되돌릴 수 없어요.")) return;
  for (const k of Object.keys(histories)) delete histories[k];
  store.safety.length = 0;
  store.settings.limitPerDay = null;
  saveStore();
  renderGuard();
});

// ── 초기화 ──
async function init() {
  try {
    const res = await fetch("/api/characters");
    characters = await res.json();
  } catch {
    characters = [
      {
        id: "byeori",
        name: "별이",
        emoji: "⭐",
        tagline: "뭐든지 함께하는 반짝이 친구",
        quote: "오늘은 무슨 이야기든 반짝반짝하게 만들어 줄게!",
        theme: ["#FFE29A", "#FFB347"],
        isNew: false,
        greeting: "안녕! 나는 반짝반짝 별이야 ✨ 오늘은 뭐 하고 놀까?",
      },
    ];
  }
  renderHero();
  renderCharacterRow();
  startHeroTimer();
}

init();
