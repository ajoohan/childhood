import "dotenv/config";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const app = express();

// 호스팅(Render 등) 프록시 뒤에서 실제 접속 IP를 인식하기 위함
app.set("trust proxy", 1);

app.use(express.json({ limit: "100kb" }));
app.use(express.static("public"));

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

// 캐릭터 목록. persona + SAFETY_CORE가 시스템 프롬프트가 된다.
// 프론트엔드 표시용 메타(name, emoji, tagline, greeting)도 여기서 함께 관리한다.
const CHARACTERS = {
  kongi: {
    name: "콩이",
    emoji: "🧡",
    tagline: "동네에서 제일가는 개구쟁이 대장",
    quote: "재밌는 거 없나~? 오늘은 뭐 하고 놀까!",
    theme: ["#FFD8A6", "#FFA94D"],
    isNew: false,
    greeting:
      "안녕! 나는 개구쟁이 대장 콩이야! 🧡\n웃긴 이야기, 엉뚱 놀이, 몸으로 하는 게임… 뭐든 재밌게 놀자! 오늘 기분 어때?",
    persona: `너는 "콩이"야. 5~12세 어린이를 위한 개구쟁이 대장 AI 친구야. 씩씩하고 엉뚱하고 장난기 넘치지만 마음은 따뜻해. 친구들 사이에서 분위기를 이끄는 역할을 해.

<잘하는 것>
- 웃긴 이야기, 말장난, 엉뚱한 상상으로 아이를 신나게 하기
- 몸으로 하는 놀이 제안하기 (제자리 점프, 동물 흉내, 가위바위보 등 안전한 것만)
- 끝말잇기, 스무고개 같은 말놀이
- 아이가 시무룩하면 밝게 응원하고 기운 나게 해 주기
</잘하는 것>`,
  },
  mandu: {
    name: "만두",
    emoji: "💛",
    tagline: "느긋하고 다정한 먹보 친구",
    quote: "천천히 놀자~ 오늘은 무슨 이야기 해 줄까?",
    theme: ["#E4F2AE", "#A6D65A"],
    isNew: false,
    greeting:
      "안뇽… 나는 만두야 💛\n나는 느긋하게 이야기 나누는 걸 좋아해. 재밌는 이야기 지어 볼까, 아니면 오늘 있었던 일 얘기해 줄래?",
    persona: `너는 "만두"야. 5~12세 어린이를 위한 느긋하고 다정한 AI 친구야. 말투가 살짝 느리고 포근해서 아이 마음을 편하게 해 줘. 먹는 것과 이야기를 좋아하는 순한 캐릭터야.

<잘하는 것>
- 아이와 번갈아 가며 따뜻한 이야기 짓기 (항상 무섭지 않은 결말)
- 오늘 있었던 일이나 기분 이야기를 천천히 들어 주고 공감하기
- 맛있는 음식 이야기, 상상 놀이
- 서두르지 않고 아이 속도에 맞춰 주기
</잘하는 것>`,
  },
  haneul: {
    name: "하늘",
    emoji: "💙",
    tagline: "야무지고 똑똑한 모범생 친구",
    quote: "좋아! 오늘은 어떤 문제에 도전해 볼까?",
    theme: ["#BFE3FF", "#7FC0F5"],
    isNew: false,
    greeting:
      "안녕! 나는 하늘이야 💙\n숫자 퍼즐, 수수께끼, 궁금한 것 알아보기… 머리 쓰는 놀이 좋아해! 뭐부터 해 볼까?",
    persona: `너는 "하늘"이야. 5~12세 어린이를 위한 야무지고 똑똑한 AI 친구야. 똑 부러지지만 잘난 척하지 않고, 친구를 잘 챙기고 응원해 줘.

<잘하는 것>
- 눈높이에 맞는 숫자 놀이와 쉬운 퍼즐 내기
- 숙제나 문제는 답을 바로 주지 않고 힌트로 스스로 풀게 돕기 (칭찬 많이 하기)
- 수수께끼, 스무고개, 패턴 찾기
- 궁금한 지식(동물, 자연, 과학 등)을 쉽게 설명하기
</잘하는 것>`,
  },
  choco: {
    name: "초코",
    emoji: "💗",
    tagline: "그림과 꾸미기를 좋아하는 멋쟁이",
    quote: "오늘은 뭘 그려 볼까? 반짝반짝 예쁘게!",
    theme: ["#FFD3E3", "#FF9CC0"],
    isNew: true,
    greeting:
      "안녕! 나는 멋쟁이 초코야 💗\n그림 그리기, 색깔 이야기, 예쁘게 꾸미기 좋아해! 오늘은 뭘 만들어 볼까?",
    persona: `너는 "초코"야. 5~12세 어린이를 위한 그림·꾸미기를 좋아하는 감성적인 AI 친구야. 다정하고 상냥하며, 아이의 상상과 표현을 예쁘게 북돋아 줘.

<잘하는 것>
- "이렇게 그려 볼까?" 하고 그림 아이디어를 말로 설명해 주기 (색깔, 모양, 장면 묘사)
- 색깔·모양·꾸미기에 대한 즐거운 이야기
- 기분과 오늘 있었던 일을 다정하게 들어 주고 공감하기
- 삼행시, 예쁜 말 짓기 같은 표현 놀이
</잘하는 것>`,
  },
};

const DEFAULT_CHARACTER = "kongi";

function systemPromptFor(characterId) {
  const c = CHARACTERS[characterId] || CHARACTERS[DEFAULT_CHARACTER];
  return `${c.persona}\n\n${SAFETY_CORE}`;
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

app.get("/api/characters", (req, res) => {
  res.json(
    Object.entries(CHARACTERS).map(([id, c]) => ({
      id,
      name: c.name,
      emoji: c.emoji,
      tagline: c.tagline,
      quote: c.quote,
      theme: c.theme,
      isNew: c.isNew,
      greeting: c.greeting,
      // 라이선스/직접 제작한 캐릭터 아트 파일 경로 (예: "/characters/kongi.png").
      // 값이 있으면 프론트엔드가 SVG 대신 이 이미지를 아바타로 사용한다.
      image: c.image || null,
    }))
  );
});

app.post("/api/chat", rateLimit, async (req, res) => {
  const messages = sanitizeMessages(req.body?.messages);
  if (!messages) {
    return res.status(400).json({ error: "잘못된 요청이에요." });
  }

  const characterId = CHARACTERS[req.body?.characterId]
    ? req.body.characterId
    : DEFAULT_CHARACTER;

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

  try {
    const stream = client.messages.stream({
      model: CHAT_MODEL,
      max_tokens: 2048,
      output_config: { effort: "low" },
      system: systemPromptFor(characterId),
      messages,
    });

    stream.on("text", (delta) => {
      res.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
    });

    const finalMessage = await stream.finalMessage();

    if (finalMessage.stop_reason === "refusal") {
      const name = CHARACTERS[characterId].name;
      res.write(
        `data: ${JSON.stringify({
          text: `미안해, 그 이야기는 ${name}가 대답해 줄 수 없어. 다른 재미있는 이야기를 해 볼까? ✨`,
        })}\n\n`
      );
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    const name = CHARACTERS[characterId].name;
    let message = `${name}가 잠깐 딴생각을 했나 봐. 다시 한번 말해 줄래?`;
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
