const selectScreen = document.getElementById("selectScreen");
const chatScreen = document.getElementById("chatScreen");
const characterGrid = document.getElementById("characterGrid");
const chatEl = document.getElementById("chat");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const backBtn = document.getElementById("backBtn");
const headerEmoji = document.getElementById("headerEmoji");
const headerName = document.getElementById("headerName");
const headerTagline = document.getElementById("headerTagline");
const parentDialog = document.getElementById("parentDialog");

let characters = [];
let current = null;

// 캐릭터별 대화 기록은 브라우저 메모리에만 보관한다 (창을 닫으면 사라짐).
const histories = {};

for (const id of ["parentBtn", "parentBtnSelect"]) {
  document.getElementById(id).addEventListener("click", () => parentDialog.showModal());
}
document.getElementById("closeDialog").addEventListener("click", () => parentDialog.close());

async function loadCharacters() {
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
        greeting: "안녕! 나는 반짝반짝 별이야 ✨ 오늘은 뭐 하고 놀까?",
      },
    ];
  }

  characterGrid.innerHTML = "";
  for (const c of characters) {
    const card = document.createElement("button");
    card.className = "character-card";
    card.innerHTML = `<span class="card-emoji">${c.emoji}</span><span class="card-name">${c.name}</span><span class="card-tagline">${c.tagline}</span>`;
    card.addEventListener("click", () => openChat(c));
    characterGrid.appendChild(card);
  }
}

function openChat(character) {
  current = character;
  headerEmoji.textContent = character.emoji;
  headerName.textContent = character.name;
  headerTagline.textContent = character.tagline;

  selectScreen.hidden = true;
  chatScreen.hidden = false;

  if (!histories[character.id]) histories[character.id] = [];
  renderHistory();
  inputEl.focus();
}

function renderHistory() {
  chatEl.innerHTML = "";
  addMessage("bot", current.greeting);
  for (const m of histories[current.id]) {
    addMessage(m.role === "user" ? "user" : "bot", m.content);
  }
}

backBtn.addEventListener("click", () => {
  chatScreen.hidden = true;
  selectScreen.hidden = false;
});

function addMessage(role, text) {
  const wrap = document.createElement("div");
  wrap.className = `message ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "bot" ? current.emoji : "🙂";

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
      throw new Error(`HTTP ${res.status}`);
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
    reply = reply || `앗, ${current.name}랑 연결이 잠깐 끊겼어. 다시 말해 줄래?`;
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

loadCharacters();
