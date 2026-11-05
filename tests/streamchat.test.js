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
