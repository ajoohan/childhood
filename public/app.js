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
const parentDialog = document.getElementById("parentDialog");
const tabHome = document.getElementById("tabHome");
const tabChat = document.getElementById("tabChat");

let characters = [];
let current = null;
let previousScreen = "home";

// 캐릭터별 대화 기록은 브라우저 메모리에만 보관한다 (창을 닫으면 사라짐).
const histories = {};

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function msgCount(id) {
  return (histories[id] || []).filter((m) => m.role === "user").length;
}

// ── 보호자 안내 ──
for (const id of ["parentBtn", "parentBtnHome", "parentBtnRecent", "tabParent"]) {
  document.getElementById(id).addEventListener("click", () => parentDialog.showModal());
}
document.getElementById("closeDialog").addEventListener("click", () => parentDialog.close());

// ── 화면 전환 ──
function showScreen(name) {
  homeScreen.hidden = name !== "home";
  recentScreen.hidden = name !== "recent";
  chatScreen.hidden = name !== "chat";
  tabBar.hidden = name === "chat";
  tabHome.classList.toggle("active", name === "home");
  tabChat.classList.toggle("active", name === "recent");

  if (name === "home") {
    renderCharacterRow();
    if (!heroPaused) startHeroTimer();
  } else {
    clearInterval(heroTimer);
  }
  if (name === "recent") renderRecent();
}

tabHome.addEventListener("click", () => showScreen("home"));
tabChat.addEventListener("click", () => showScreen("recent"));
backBtn.addEventListener("click", () => showScreen(previousScreen));

// 햇살 가득한 손그림풍 야외 배경 (모든 히어로 슬라이드 공통)
const HERO_SCENE = `<svg class="scene-svg" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#AFE0FF"/><stop offset="0.7" stop-color="#E8F7FF"/></linearGradient></defs>
  <rect width="400" height="250" fill="url(#sky)"/>
  <circle cx="336" cy="52" r="52" fill="#FFE08A" opacity="0.4"/>
  <circle cx="336" cy="52" r="34" fill="#FFE49A"/>
  <ellipse cx="90" cy="60" rx="34" ry="14" fill="#ffffff" opacity="0.85"/>
  <ellipse cx="120" cy="52" rx="26" ry="12" fill="#ffffff" opacity="0.85"/>
  <path d="M0 172 Q110 138 210 170 T400 164 L400 250 L0 250 Z" fill="#C6E68A"/>
  <path d="M0 200 Q130 174 250 200 T400 194 L400 250 L0 250 Z" fill="#98CE5C"/>
  <rect x="56" y="176" width="8" height="22" rx="3" fill="#9c7a4a"/>
  <circle cx="60" cy="166" r="24" fill="#83C24E"/>
  <circle cx="48" cy="172" r="15" fill="#8FCB58"/>
  <circle cx="73" cy="172" r="15" fill="#8FCB58"/>
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
      <span class="hero-art">${avatarSVG(c.id)}</span>
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
        <span class="pop-art">${avatarSVG(c.id)}</span>
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
      <span class="recent-ava" style="background: linear-gradient(160deg, #ffffff, ${c.theme[0]})">${avatarSVG(c.id)}</span>
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
  headerAvatar.innerHTML = avatarSVG(character.id);
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
  if (role === "bot") avatar.innerHTML = avatarSVG(current.id);
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

  inputEl.value = "";
  sendBtn.disabled = true;
  inputEl.disabled = true;

  const history = histories[current.id];
  addMessage("user", text);
  history.push({ role: "user", content: text });

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
        const { text: delta } = JSON.parse(data);
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
    sendBtn.disabled = false;
    inputEl.disabled = false;
    inputEl.focus();
  }
}

sendBtn.addEventListener("click", send);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.isComposing) send();
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
