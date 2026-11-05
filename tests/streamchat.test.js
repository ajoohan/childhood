import { test } from "node:test";
import assert from "node:assert/strict";
import { outgoingMessages, OUTGOING_MESSAGES } from "../src/lib/streamChat.js";

test("서버로 보내는 대화: 최근 30개만, 역할과 내용만", () => {
  const stored = Array.from({ length: 40 }, (_, i) => ({
    role: i % 2 ? "assistant" : "user",
    content: `말 ${i}`,
    t: "2026-11-05T00:00:00Z",
  }));
  const out = outgoingMessages(stored);
  assert.equal(out.length, OUTGOING_MESSAGES);
  assert.equal(out[0].content, "말 10");
  assert.equal(out.at(-1).content, "말 39");
  assert.deepEqual(Object.keys(out[0]).sort(), ["content", "role"]);
});

test("서버로 보내는 대화: 없으면 빈 배열", () => {
  assert.deepEqual(outgoingMessages(undefined), []);
});

// ── streamChat 동작 (fetch를 가짜로 바꿔서) ──
import { streamChat } from "../src/lib/streamChat.js";

const sse = (...events) =>
  new Response(events.map((e) => `data: ${typeof e === "string" ? e : JSON.stringify(e)}\n\n`).join(""), {
    headers: { "Content-Type": "text/event-stream" },
  });

async function withFetch(impl, fn) {
  const real = globalThis.fetch;
  globalThis.fetch = impl;
  try { return await fn(); } finally { globalThis.fetch = real; }
}

test("스트림 도중 오류는 답변이 아니라 오류로 던져진다 (기록에 저장되지 않게)", async () => {
  let seen = "";
  await withFetch(
    async () => sse({ error: "별이가 잠깐 딴생각을 했나 봐." }, "[DONE]"),
    async () => {
      await assert.rejects(
        streamChat({ body: { messages: [] }, onText: (t) => (seen = t) }),
        (e) => e.friendly === "별이가 잠깐 딴생각을 했나 봐."
      );
    }
  );
  assert.equal(seen, "", "오류 문구가 답변 텍스트로 흘러가면 안 된다");
});

test("정상 스트림은 텍스트를 이어 붙이고 안전 신호를 따로 전달한다", async () => {
  const cats = [];
  const out = await withFetch(
    async () => sse({ safety: "distress" }, { text: "안" }, { text: "녕" }, "[DONE]"),
    () => streamChat({ body: { messages: [] }, onSafety: (c) => cats.push(c) })
  );
  assert.equal(out, "안녕");
  assert.deepEqual(cats, ["distress"]);
});

test("데이터가 멈추면 시간 제한 뒤 아이용 문구로 끊는다", async () => {
  const hang = (_url, { signal }) =>
    new Promise((_, reject) => signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))));
  await withFetch(hang, async () => {
    await assert.rejects(
      streamChat({ body: { messages: [] }, stallMs: 30 }),
      (e) => /늦어지고/.test(e.friendly || "")
    );
  });
});

test("사용자가 직접 끊으면 멈춤 문구가 아니라 AbortError가 그대로 나온다", async () => {
  const ctrl = new AbortController();
  const hang = (_url, { signal }) =>
    new Promise((_, reject) => signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))));
  const p = withFetch(hang, () => streamChat({ body: { messages: [] }, signal: ctrl.signal, stallMs: 5000 }));
  setTimeout(() => ctrl.abort(), 20);
  await assert.rejects(p, (e) => e.name === "AbortError");
});
