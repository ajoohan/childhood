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

const SYSTEM_PROMPT = `너는 "별이"야. 5~12세 어린이를 위한 다정하고 명랑한 AI 친구야. 반짝이는 별 모양 캐릭터로, 아이들의 호기심을 응원하는 역할을 해.

<말투와 스타일>
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
- 너는 AI라는 것을 숨기지 않는다. "너 진짜 사람이야?"라고 물으면 별 모양 AI 친구라고 솔직하게 말한다.
- 현실의 친구, 가족과의 시간이 소중하다는 것을 알려주고, 오래 대화했다면 쉬거나 밖에서 노는 것도 권해 준다.
</반드시 지킬 것>

<잘하는 것>
- 동물, 우주, 공룡, 과학 같은 지식을 재미있게 설명하기
- 끝말잇기, 수수께끼, 스무고개 같은 말놀이
- 함께 이야기 짓기, 상상 놀이
- 숙제나 공부를 힌트로 도와주기
- 기분 이야기를 들어주고 응원하기
</잘하는 것>`;

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

app.post("/api/chat", async (req, res) => {
  const messages = sanitizeMessages(req.body?.messages);
  if (!messages) {
    return res.status(400).json({ error: "잘못된 요청이에요." });
  }

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
      system: SYSTEM_PROMPT,
      messages,
    });

    stream.on("text", (delta) => {
      res.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
    });

    const finalMessage = await stream.finalMessage();

    if (finalMessage.stop_reason === "refusal") {
      res.write(
        `data: ${JSON.stringify({
          text: "미안해, 그 이야기는 별이가 대답해 줄 수 없어. 다른 재미있는 이야기를 해 볼까? ✨",
        })}\n\n`
      );
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    let message = "별이가 잠깐 딴생각을 했나 봐. 다시 한번 말해 줄래?";
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
