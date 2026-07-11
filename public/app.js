const chatEl = document.getElementById("chat");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("sendBtn");
const parentBtn = document.getElementById("parentBtn");
const parentDialog = document.getElementById("parentDialog");
const closeDialog = document.getElementById("closeDialog");

// 대화 기록은 브라우저 메모리에만 보관한다 (창을 닫으면 사라짐).
const history = [];

parentBtn.addEventListener("click", () => parentDialog.showModal());
closeDialog.addEventListener("click", () => parentDialog.close());

function addMessage(role, text) {
  const wrap = document.createElement("div");
  wrap.className = `message ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "bot" ? "⭐" : "🙂";

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
  if (!text || sendBtn.disabled) return;

  inputEl.value = "";
  sendBtn.disabled = true;
  inputEl.disabled = true;

  addMessage("user", text);
  history.push({ role: "user", content: text });

  const bubble = addMessage("bot", "");
  bubble.classList.add("typing");

  let reply = "";
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
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
    reply = reply || "앗, 별이랑 연결이 잠깐 끊겼어. 다시 말해 줄래?";
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
