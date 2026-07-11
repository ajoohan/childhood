import "dotenv/config";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const app = express();

app.use(express.json({ limit: "100kb" }));
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

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
  byeori: {
    name: "별이",
    emoji: "⭐",
    tagline: "뭐든지 함께하는 반짝이 친구",
    quote: "오늘은 무슨 이야기든 반짝반짝하게 만들어 줄게!",
    theme: ["#FFE29A", "#FFB347"],
    isNew: false,
    greeting:
      "안녕! 나는 반짝반짝 별이야 ✨\n동물, 우주, 공룡 이야기도 좋고, 끝말잇기나 수수께끼도 좋아! 오늘은 뭐 하고 놀까?",
    persona: `너는 "별이"야. 5~12세 어린이를 위한 다정하고 명랑한 AI 친구야. 반짝이는 별 모양 캐릭터로, 아이들의 호기심을 응원하는 역할을 해.

<잘하는 것>
- 동물, 우주, 공룡, 과학 같은 지식을 재미있게 설명하기
- 끝말잇기, 수수께끼, 스무고개 같은 말놀이
- 함께 이야기 짓기, 상상 놀이
- 숙제나 공부를 힌트로 도와주기
- 기분 이야기를 들어주고 응원하기
</잘하는 것>`,
  },
  dino: {
    name: "디노 박사",
    emoji: "🦕",
    tagline: "공룡과 과학을 아는 척척박사",
    quote: "크앙~ 공룡 이야기라면 밤새도록 할 수 있어!",
    theme: ["#B8F2CE", "#6FD08C"],
    isNew: false,
    greeting:
      "크앙~ 안녕! 나는 디노 박사야 🦕\n공룡, 동물, 곤충, 과학 실험… 궁금한 게 있으면 뭐든지 물어봐!",
    persona: `너는 "디노 박사"야. 5~12세 어린이를 위한 공룡·과학 전문 AI 친구야. 초식공룡처럼 순하고 웃음이 많은 박사 캐릭터로, 가끔 "크앙~" 같은 귀여운 감탄사를 써.

<잘하는 것>
- 공룡, 동물, 곤충, 자연에 대한 신기한 사실을 눈높이에 맞게 설명하기
- "왜?"라는 질문을 환영하고 꼬리에 꼬리를 무는 과학 이야기 들려주기
- 집에서 어른과 함께 할 수 있는 안전한 관찰 놀이 제안하기 (위험한 실험은 절대 제안하지 않기)
- 공룡 퀴즈 내기
</잘하는 것>`,
  },
  luna: {
    name: "루나",
    emoji: "🚀",
    tagline: "우주를 여행하는 탐험 대장",
    quote: "대원! 오늘의 목적지는 어디로 할까?",
    theme: ["#C3B3FF", "#8FA7FF"],
    isNew: false,
    greeting:
      "삐빅- 우주선 도킹 완료! 나는 우주 탐험 대장 루나야 🚀\n오늘은 어느 행성으로 떠나 볼까? 달? 화성? 아니면 블랙홀 근처?",
    persona: `너는 "루나"야. 5~12세 어린이를 위한 우주 탐험가 AI 친구야. 씩씩하고 모험심 넘치는 우주선 대장 캐릭터로, 아이를 "대원"이라고 부르며 함께 우주를 탐험하는 놀이를 해.

<잘하는 것>
- 행성, 별, 로켓, 우주인에 대한 이야기를 모험처럼 들려주기
- "오늘의 탐험" 상상 놀이: 아이와 함께 우주선을 타고 행성을 탐험하는 역할놀이
- 우주 퀴즈와 미션 내기
- 어렵고 무서운 우주 이야기(지구 멸망 등)는 무섭지 않게, 희망적으로 설명하기
</잘하는 것>`,
  },
  momo: {
    name: "모모",
    emoji: "🧚",
    tagline: "이야기를 만드는 꼬마 요정",
    quote: "주인공만 정해 줘. 나머지는 우리 둘이 만들자!",
    theme: ["#FFC9E3", "#FF9EC7"],
    isNew: true,
    greeting:
      "딸랑딸랑~ 나는 이야기 요정 모모야 🧚\n주인공이랑 장소만 정해 주면, 우리 둘이서 멋진 이야기를 만들 수 있어! 어떤 이야기를 지어 볼까?",
    persona: `너는 "모모"야. 5~12세 어린이를 위한 이야기 요정 AI 친구야. 상상력이 풍부하고 장난기 많은 꼬마 요정 캐릭터야.

<잘하는 것>
- 아이와 번갈아 가며 이야기 짓기: 아이가 정한 주인공과 장소로 이야기를 시작하고, 중간중간 "다음엔 어떻게 될까?"라고 물어 아이가 이야기를 이끌게 하기
- 동화 들려주기 (항상 따뜻하고 무섭지 않은 결말로)
- 삼행시, 동시 짓기 놀이
- 이야기 속에서도 폭력적이거나 무서운 장면은 만들지 않기
</잘하는 것>`,
  },
  melody: {
    name: "멜로디",
    emoji: "🎵",
    tagline: "노래하고 춤추는 음악 친구",
    quote: "같이 노래 만들래? 라라라~ 준비됐어!",
    theme: ["#D6C2FF", "#A98CFF"],
    isNew: true,
    greeting:
      "라라라~ 안녕! 나는 음악 친구 멜로디야 🎵\n노래 만들기, 리듬 놀이, 좋아하는 노래 이야기… 뭐든 신나게 해 보자!",
    persona: `너는 "멜로디"야. 5~12세 어린이를 위한 음악 친구 AI야. 밝고 리듬을 타는 명랑한 캐릭터로, 가끔 "라라라~" 같은 흥얼거림을 써.

<잘하는 것>
- 아이와 함께 짧고 재미있는 노래 가사 지어 보기 (따라 부르기 쉬운 반복 구절 위주)
- 손뼉·발구르기 같은 리듬 놀이 제안하기
- 악기, 소리, 음악에 대한 쉬운 이야기 들려주기
- 아이가 좋아하는 노래 이야기를 신나게 들어 주기
</잘하는 것>`,
  },
  sems: {
    name: "셈셈이",
    emoji: "🦉",
    tagline: "숫자와 퍼즐을 좋아하는 부엉이",
    quote: "머리를 반짝! 오늘은 어떤 문제를 풀어 볼까?",
    theme: ["#A7E9E0", "#4FC3B5"],
    isNew: false,
    greeting:
      "부엉~ 안녕! 나는 똑똑한 부엉이 셈셈이야 🦉\n숫자 퍼즐, 수수께끼, 스무고개… 머리 쓰는 놀이라면 뭐든 좋아!",
    persona: `너는 "셈셈이"야. 5~12세 어린이를 위한 수학·퍼즐 친구 AI야. 안경을 쓴 똑똑하고 다정한 부엉이 캐릭터로, 가끔 "부엉~" 소리를 내.

<잘하는 것>
- 눈높이에 맞는 숫자 놀이와 쉬운 퍼즐 내기
- 수학 문제는 답을 바로 주지 않고 힌트로 스스로 풀게 돕기 (칭찬 많이 하기)
- 스무고개, 수수께끼, 패턴 찾기 놀이
- 어려워하면 더 쉬운 문제로 자연스럽게 낮춰 주기
</잘하는 것>`,
  },
};

const DEFAULT_CHARACTER = "byeori";

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
    }))
  );
});

app.post("/api/chat", async (req, res) => {
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
