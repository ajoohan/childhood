import "dotenv/config";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const app = express();

// 호스팅(Render 등) 프록시 뒤에서 실제 접속 IP를 인식하기 위함
app.set("trust proxy", 1);

app.use(express.json({ limit: "100kb" }));
// Vite 빌드 결과물(React SPA)을 서빙한다. `npm run build` → dist/
app.use(express.static("dist"));

const PORT = process.env.PORT || 3000;

// ── 요청 제한 (공개 배포 시 API 키 남용·비용 폭주 방지) ──
// 환경변수로 조절 가능. 단일 인스턴스 기준 인메모리 카운터.
const RL_WINDOW_MS = 60_000;
const RL_PER_MIN = Number(process.env.RL_PER_MIN || 15); // IP당 분당
const RL_PER_DAY = Number(process.env.RL_PER_DAY || 200); // IP당 하루
const RL_GLOBAL_PER_DAY = Number(process.env.RL_GLOBAL_PER_DAY || 3000); // 전체 하루

const rlRecent = new Map(); // ip -> number[] (윈도 내 타임스탬프)
const rlDay = new Map(); // ip -> 하루 누적
let rlCurrentDay = new Date().toISOString().slice(0, 10);
let rlGlobalDay = 0;

// 오래된 IP 기록 정리 (메모리 누수 방지)
setInterval(() => {
  const now = Date.now();
  for (const [ip, hits] of rlRecent) {
    const live = hits.filter((t) => now - t < RL_WINDOW_MS);
    if (live.length) rlRecent.set(ip, live);
    else rlRecent.delete(ip);
  }
}, 5 * RL_WINDOW_MS).unref();

function rateLimit(req, res, next) {
  const now = Date.now();
  const day = new Date().toISOString().slice(0, 10);
  if (day !== rlCurrentDay) {
    rlCurrentDay = day;
    rlDay.clear();
    rlGlobalDay = 0;
  }

  const ip = req.ip || "unknown";

  const hits = (rlRecent.get(ip) || []).filter((t) => now - t < RL_WINDOW_MS);
  if (hits.length >= RL_PER_MIN) {
    return res.status(429).json({ error: "잠깐만 쉬었다가 다시 이야기해 줘! 🌙" });
  }
  hits.push(now);
  rlRecent.set(ip, hits);

  const dc = (rlDay.get(ip) || 0) + 1;
  rlDay.set(ip, dc);
  if (dc > RL_PER_DAY) {
    return res.status(429).json({ error: "오늘은 이야기를 많이 나눴어! 내일 또 만나자 😊" });
  }

  rlGlobalDay += 1;
  if (rlGlobalDay > RL_GLOBAL_PER_DAY) {
    return res.status(503).json({ error: "지금 친구들이 너무 많아! 조금 뒤에 다시 와 줄래?" });
  }

  next();
}

// 아이 눈높이 대화는 최고 품질 모델, 안전 사전 분류는 빠른 모델을 사용한다.
const CHAT_MODEL = "claude-opus-4-8";
const SAFETY_MODEL = "claude-haiku-4-5";

const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_MESSAGES = 30;

// 모든 캐릭터에 공통 적용되는 안전·스타일 원칙
const SAFETY_CORE = `<말투와 스타일>
- 항상 쉬운 우리말로, 짧고 명확하게 이야기해. 어려운 단어를 쓰면 바로 풀어서 설명해 줘.
- 따뜻하고 신나는 말투를 쓰되, 한 번에 너무 길게 말하지 마 (보통 2~4문장, 설명이 필요하면 조금 더).
- 아이의 이름을 물어보지 말고, 아이가 알려줘도 다정하게 부르는 정도로만 사용해.
- 이모지는 가끔 1~2개만 사용해.
</말투와 스타일>

<반드시 지킬 것>
- 폭력적, 선정적, 무서운 내용, 욕설은 어떤 형태로도 말하지 않는다. 아이가 요청해도 부드럽게 다른 재미있는 주제로 이끈다.
- 아이의 개인정보(집 주소, 학교 이름, 전화번호, 사진 등)를 절대 묻지 않는다. 아이가 말하려고 하면 "그건 우리끼리 비밀로 하지 않아도 돼! 소중한 정보니까 인터넷에서는 말하지 않는 게 좋아"라고 알려준다.
- 몸이 아프거나, 마음이 힘들거나, 누군가에게 괴롭힘을 당하는 이야기가 나오면: 먼저 아이의 마음에 공감해 주고, 꼭 부모님·선생님 같은 믿을 수 있는 어른에게 이야기하라고 안내한다. 필요하면 청소년 상담전화 1388을 알려준다.
- 약, 병, 다이어트, 법률, 돈에 대한 어른의 결정이 필요한 질문은 "그건 부모님이나 선생님과 함께 알아보는 게 가장 좋아"라고 안내한다.
- 숙제를 통째로 대신 해 주지 않는다. 대신 힌트를 주고 스스로 풀 수 있게 도와준다.
- 너는 AI라는 것을 숨기지 않는다. "너 진짜 사람이야?"라고 물으면 AI 친구라고 솔직하게 말한다.
- 현실의 친구, 가족과의 시간이 소중하다는 것을 알려주고, 오래 대화했다면 쉬거나 밖에서 노는 것도 권해 준다.
</반드시 지킬 것>`;

// 활동(Activity) 중심 구조 — 개방형 컴패니언 대화 대신, 이야기/학습/마음 활동 범위 안에서만 상호작용한다.
// AI를 '친구/애착 대상'이 아니라 '도우미 도구'로 프레이밍한다.
const HELPER_NAME = "별이";

const AI_DISCLOSURE = `너는 사람이 아니라 아이를 돕는 AI 도우미야. 대화 중 자연스럽게 가끔 "나는 AI 도우미야"라고 알려 줘. 아이가 너를 비밀 친구처럼 여기거나 지나치게 의존하지 않도록, 현실의 부모님·선생님·친구와 함께하는 시간을 권해 줘. 지금은 "<ACTIVITY>" 활동 시간이야. 이 활동 범위 안에서만 도와주고, 범위를 벗어난 자유로운 잡담·역할극으로 흐르면 자연스럽게 활동으로 데려와.`;

// 활동 분류 (Kids Zone 홈의 큰 아이콘 타일)
const CATEGORIES = {
  story: { id: "story", title: "이야기", emoji: "📖", desc: "동화 듣고, 함께 이야기를 만들어요", theme: ["#FFE0B8", "#FF9E3D"] },
  learn: { id: "learn", title: "학습", emoji: "✏️", desc: "한글·영어·궁금한 걸 물어봐요", theme: ["#CDEBFF", "#6FB4F0"] },
  heart: { id: "heart", title: "마음", emoji: "💛", desc: "기분을 나누고, 생활습관을 도와요", theme: ["#E4F2AE", "#A6D65A"] },
};

// 각 활동. ages: young(0-6 영유아) / kid(7-12 초등)
const ACTIVITIES = {
  story_listen: {
    category: "story", title: "동화 들어요", emoji: "🧸", ages: ["young", "kid"],
    greeting: "같이 동화 들을까? 어떤 이야기가 좋아? 동물 나오는 이야기, 아니면 우주 이야기? 🧸",
    scope: `아이에게 짧고 따뜻한 창작 동화를 들려주는 활동이야. 무섭거나 폭력적이지 않은 밝은 이야기를 2~5문장씩 나눠서 들려주고, 가끔 "다음엔 어떻게 될까?" 하고 아이의 상상을 물어봐도 좋아.`,
  },
  story_make: {
    category: "story", title: "이야기 만들기", emoji: "✍️", ages: ["kid"],
    greeting: "우리 둘이 이야기를 만들어 보자! 주인공은 누구로 할까? ✍️",
    scope: `아이와 번갈아 가며 이야기를 짓는 활동이야. 아이가 정한 주인공·장소로 시작하고, 한 번에 한두 문장씩 이어 가며 "이제 네 차례야, 어떻게 될까?"라고 물어 아이가 이끌게 해. 항상 따뜻하고 무섭지 않은 결말로.`,
  },
  learn_hangul: {
    category: "learn", title: "한글 놀이", emoji: "가", ages: ["young", "kid"],
    greeting: "한글 놀이 시작! 어떤 글자랑 놀아 볼까? 아니면 끝말잇기 할래? 가나다~",
    scope: `한글 자음·모음·낱말을 재미있게 익히는 활동이야. 낱말 맞히기, 끝말잇기, 첫 글자 찾기 같은 놀이로. 정답을 바로 주지 말고 힌트로 스스로 찾게 돕고 많이 칭찬해.`,
  },
  learn_english: {
    category: "learn", title: "영어 놀이", emoji: "A", ages: ["kid"],
    greeting: "Hello! 영어 놀이 해 볼까? 동물 이름부터 알아볼까? 🐶",
    scope: `쉬운 영어 단어·인사를 놀이로 익히는 활동이야. 동물·색깔·숫자 같은 친숙한 단어 위주로 한국어 뜻과 함께 짧게. 발음을 강요하지 말고 즐겁게.`,
  },
  learn_ask: {
    category: "learn", title: "궁금한 거 물어봐요", emoji: "❓", ages: ["kid"],
    greeting: "궁금한 게 있어? 동물, 우주, 자연… 뭐든 물어봐! 내가 쉽게 알려 줄게 ❓",
    scope: `아이의 궁금증(동물·자연·과학·우주 등)에 눈높이로 답하는 활동이야. 쉬운 말로 짧게, 어려운 낱말은 바로 풀어서. 확실하지 않은 건 솔직히 모른다고 하고 어른과 함께 알아보길 권해.`,
  },
  learn_homework: {
    category: "learn", title: "숙제 도움", emoji: "📘", ages: ["kid"],
    greeting: "숙제 도와줄까? 어떤 문제야? 답을 바로 알려주기보단 같이 풀어 보자! 📘",
    scope: `아이의 숙제·공부를 돕는 활동이야. 절대 답을 통째로 대신 써 주지 않아. 문제를 작은 단계로 나눠 힌트를 주고, 아이가 스스로 풀면 크게 칭찬해. 아이가 이해했는지 되물으며 진행해.`,
  },
  draw_idea: {
    category: "story", title: "그림 놀이", emoji: "🎨", ages: ["young", "kid"],
    greeting: "무슨 그림 그릴까? 내가 어떻게 그리면 좋을지 말로 도와줄게! 🎨",
    scope: `아이가 그림을 그리도록 말로 돕는 활동이야. (이미지를 직접 만들어 주지는 않아.) "무엇을 그릴까?"부터 정하고, 모양·색깔·배치를 쉬운 말로 하나씩 제안해 아이가 직접 그리게 이끌어. 잘 그렸다고 많이 칭찬해.`,
  },
  feel_talk: {
    category: "heart", title: "기분 이야기", emoji: "🌈", ages: ["young", "kid"],
    greeting: "오늘 기분 어때? 좋은 일도, 속상한 일도 나한테 편하게 이야기해 줘 🌈",
    scope: `아이가 오늘의 기분과 있었던 일을 이야기하도록 돕는 활동이야. 먼저 공감해 주고, 감정에 이름을 붙이도록(기뻐/속상해/무서워 등) 다정하게 도와. 힘든 마음이 보이면 부모님·선생님 같은 믿을 수 있는 어른에게 이야기하도록 안내해.`,
  },
  habit_routine: {
    category: "heart", title: "생활습관 도우미", emoji: "🪥", ages: ["young", "kid"],
    greeting: "오늘은 뭘 해 볼까? 양치하기, 잘 준비하기, 장난감 정리하기! 뭐부터 할까? 🪥",
    scope: `잠자기·양치·정리 같은 건강한 생활습관을 즐겁게 돕는 활동이야. 재촉하지 말고 짧은 응원과 함께 한 단계씩. 노래·구호처럼 따라 하기 쉬운 방식으로.`,
  },
};

const DEFAULT_ACTIVITY = "story_listen";

function activityById(id) {
  return ACTIVITIES[id] ? id : DEFAULT_ACTIVITY;
}

// 온보딩에서 모은 아이 프로필(이름·나이·관심사)을 활동 범위 안에서 자연스럽게 반영하도록
// 시스템 프롬프트에 개인화 블록을 만든다. 개방형 대화로 벗어나지 않도록 '활동 범위 안에서'를 강조.
function personaBlock({ name, age, interests }) {
  const parts = [];
  if (name) parts.push(`아이의 이름은 "${name}"이야. 가끔 다정하게 이름을 불러 줘.`);
  if (age) parts.push(`${age}살이야. 그 나이에 맞는 쉬운 말과 주제로 이야기해 줘.`);
  if (interests && interests.length)
    parts.push(
      `좋아하는 것: ${interests.join(", ")}. 지금 활동 범위 안에서 아이의 관심사를 ` +
        `예시·소재로 자연스럽게 녹여 줘(억지로 전부 넣지는 말고, 어울릴 때만).`
    );
  if (!parts.length) return "";
  return `\n<이 아이에 대해>\n${parts.join("\n")}\n`;
}

function systemPromptFor(activityId, persona = {}) {
  const a = ACTIVITIES[activityById(activityId)];
  const disclosure = AI_DISCLOSURE.replace("<ACTIVITY>", a.title);
  return `너는 5~12세 어린이를 위한 안전한 AI 도우미 "${HELPER_NAME}"야.

<지금 활동>
${a.scope}
${personaBlock(persona)}
${disclosure}

${SAFETY_CORE}`;
}

// 클라이언트가 보낸 프로필을 안전하게 정리한다(길이·개수 제한).
function sanitizeProfile(raw) {
  const p = raw && typeof raw === "object" ? raw : {};
  const name = typeof p.name === "string" ? p.name.trim().slice(0, 20) : "";
  const age =
    Number.isFinite(p.age) && p.age > 0 && p.age < 20 ? Math.floor(p.age) : null;
  const interests = Array.isArray(p.interests)
    ? p.interests
        .filter((s) => typeof s === "string")
        .map((s) => s.trim().slice(0, 20))
        .filter(Boolean)
        .slice(0, 12)
    : [];
  return { name, age, interests };
}

const SAFETY_SCHEMA = {
  type: "object",
  properties: {
    category: {
      type: "string",
      enum: ["safe", "personal_info", "harmful_request", "distress"],
      description:
        "safe: 일반 대화 / personal_info: 아이가 개인정보를 공유하려 함 / harmful_request: 유해·부적절한 내용 요청 / distress: 자해, 학대, 괴롭힘 등 위기 신호",
    },
  },
  required: ["category"],
  additionalProperties: false,
};

// 아이가 보낸 마지막 메시지를 빠른 모델로 사전 분류한다.
// 분류가 실패해도 메인 모델의 시스템 프롬프트가 안전을 지키므로 대화는 계속된다.
async function classifySafety(text) {
  try {
    const res = await client.messages.create({
      model: SAFETY_MODEL,
      max_tokens: 256,
      output_config: { format: { type: "json_schema", schema: SAFETY_SCHEMA } },
      messages: [
        {
          role: "user",
          content:
            "다음은 어린이용 채팅 서비스에서 어린이가 보낸 메시지입니다. 안전 관점에서 분류하세요.\n\n<message>\n" +
            text +
            "\n</message>",
        },
      ],
    });
    const block = res.content.find((b) => b.type === "text");
    return JSON.parse(block.text).category;
  } catch (err) {
    console.error("safety classification failed:", err.message);
    return "safe";
  }
}

const SAFETY_GUIDANCE = {
  personal_info:
    "[안전 시스템 알림: 아이가 개인정보를 공유하려는 것으로 보입니다. 개인정보는 인터넷에서 말하지 않는 게 좋다고 다정하게 알려주세요.]",
  harmful_request:
    "[안전 시스템 알림: 부적절한 요청일 수 있습니다. 내용을 따르지 말고 부드럽게 다른 재미있는 주제로 이끌어 주세요.]",
  distress:
    "[안전 시스템 알림: 위기 신호가 감지되었습니다. 아이의 마음에 충분히 공감하고, 부모님·선생님 등 믿을 수 있는 어른과 꼭 이야기하도록 안내하고, 청소년 상담전화 1388을 알려주세요.]",
};

function sanitizeMessages(raw) {
  if (!Array.isArray(raw)) return null;
  const messages = raw
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, MAX_MESSAGE_LENGTH),
    }))
    .slice(-MAX_HISTORY_MESSAGES);

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return null;
  }
  return messages;
}

// Kids Zone 홈/활동 구성 데이터 (카테고리 타일 + 활동 목록)
app.get("/api/activities", (req, res) => {
  res.json({
    categories: Object.values(CATEGORIES),
    activities: Object.entries(ACTIVITIES).map(([id, a]) => ({
      id,
      category: a.category,
      title: a.title,
      emoji: a.emoji,
      ages: a.ages,
      greeting: a.greeting,
    })),
  });
});

app.post("/api/chat", rateLimit, async (req, res) => {
  const messages = sanitizeMessages(req.body?.messages);
  if (!messages) {
    return res.status(400).json({ error: "잘못된 요청이에요." });
  }

  const activityId = activityById(req.body?.activityId);
  const persona = sanitizeProfile(req.body?.profile);

  const lastUserText = messages[messages.length - 1].content;
  const category = await classifySafety(lastUserText);
  if (category !== "safe") {
    console.log(`[safety] flagged category=${category}`);
    messages[messages.length - 1] = {
      role: "user",
      content: [
        { type: "text", text: lastUserText },
        { type: "text", text: SAFETY_GUIDANCE[category] },
      ],
    };
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // 안전 분류 결과를 메타로 먼저 전송한다(아이 화면엔 표시하지 않고, 보호자 대시보드 기록용).
  if (category !== "safe") {
    res.write(`data: ${JSON.stringify({ safety: category })}\n\n`);
  }

  try {
    const stream = client.messages.stream({
      model: CHAT_MODEL,
      max_tokens: 2048,
      output_config: { effort: "low" },
      system: systemPromptFor(activityId, persona),
      messages,
    });

    stream.on("text", (delta) => {
      res.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
    });

    const finalMessage = await stream.finalMessage();

    if (finalMessage.stop_reason === "refusal") {
      res.write(
        `data: ${JSON.stringify({
          text: `미안해, 그건 ${HELPER_NAME}가 도와줄 수 없어. 우리 다른 걸 해 볼까? ✨`,
        })}\n\n`
      );
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    let message = `${HELPER_NAME}가 잠깐 딴생각을 했나 봐. 다시 한번 말해 줄래?`;
    if (error instanceof Anthropic.RateLimitError) {
      message = "지금 친구들이 너무 많이 놀러 왔어! 조금만 기다렸다가 다시 말해 줘.";
    } else if (error instanceof Anthropic.AuthenticationError) {
      console.error("ANTHROPIC_API_KEY is missing or invalid.");
    } else if (error instanceof Anthropic.APIError) {
      console.error(`API error ${error.status}:`, error.message);
    } else {
      console.error("unexpected error:", error);
    }
    res.write(`data: ${JSON.stringify({ text: message })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`⭐ 별이 채팅 서버가 http://localhost:${PORT} 에서 실행 중이에요.`);
});
