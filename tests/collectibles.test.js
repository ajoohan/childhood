import { test } from "node:test";
import assert from "node:assert/strict";
import { BADGES, STICKERS, earnedBadges, drawSticker } from "../src/lib/collectibles.js";

const base = { profile: { onboarded: true }, histories: {}, rewards: {}, decor: {}, stickers: {} };

test("배지: 온보딩을 마치면 첫걸음", () => {
  assert.ok(earnedBadges(base).includes("first"));
  assert.ok(!earnedBadges({ ...base, profile: { onboarded: false } }).includes("first"));
});

test("배지: 별 잔액 문턱", () => {
  assert.ok(!earnedBadges({ ...base, rewards: { balance: 9 } }).includes("star10"));
  assert.ok(earnedBadges({ ...base, rewards: { balance: 10 } }).includes("star10"));
  assert.ok(!earnedBadges({ ...base, rewards: { balance: 29 } }).includes("star30"));
  assert.ok(earnedBadges({ ...base, rewards: { balance: 30 } }).includes("star30"));
});

test("배지: 대화를 해야 첫 대화", () => {
  assert.ok(!earnedBadges(base).includes("talk"));
  const withTalk = { ...base, histories: { story_listen: [{ role: "user", content: "안녕" }] } };
  assert.ok(earnedBadges(withTalk).includes("talk"));
  assert.ok(earnedBadges(withTalk).includes("story"), "이야기 활동을 했으므로");
});

test("배지: 스티커 5개를 모으면 sticker5", () => {
  assert.ok(!earnedBadges({ ...base, stickers: { a: 2, b: 2 } }).includes("sticker5"));
  assert.ok(earnedBadges({ ...base, stickers: { a: 3, b: 2 } }).includes("sticker5"));
});

test("배지: 저장값이 망가져도 터지지 않는다", () => {
  // 렌더 중에 호출되므로 예외가 나면 화면 전체가 죽는다.
  for (const histories of [{ a: "문자열" }, { a: null }, { a: 123 }, null, "x", []]) {
    assert.doesNotThrow(() => earnedBadges({ ...base, histories }), JSON.stringify(histories));
  }
});

test("배지 정의: id가 겹치지 않고 이름·설명이 있다", () => {
  const ids = BADGES.map((b) => b.id);
  assert.equal(new Set(ids).size, ids.length, "중복 id 없음");
  for (const b of BADGES) {
    assert.ok(b.name && b.desc, `${b.id} 에 이름·설명`);
  }
});

test("스티커: 아직 없는 것을 우선으로 뽑는다", () => {
  const owned = Object.fromEntries(STICKERS.slice(1).map((s) => [s.id, 1]));
  for (let i = 0; i < 20; i++) {
    assert.equal(drawSticker(owned), STICKERS[0].id, "하나만 안 가졌으면 그것이 나온다");
  }
});

test("스티커: 다 모았으면 그래도 하나를 준다", () => {
  const all = Object.fromEntries(STICKERS.map((s) => [s.id, 1]));
  const id = drawSticker(all);
  assert.ok(STICKERS.some((s) => s.id === id));
});

test("스티커 정의: id가 겹치지 않는다", () => {
  const ids = STICKERS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

const msgs = (n, role = "user", extra = {}) =>
  Array.from({ length: n }, (_, i) => ({ role, content: `m${i}`, ...extra }));

test("배지: 출석 보너스로 별만 생겨도 '미션 도전'은 아니다", () => {
  const withStarsOnly = { ...base, rewards: { balance: 1, doneToday: [] } };
  assert.ok(!earnedBadges(withStarsOnly).includes("mission1"));
  const done = { ...base, rewards: { balance: 3, doneToday: ["m1"] } };
  assert.ok(earnedBadges(done).includes("mission1"));
});

test("배지: '목소리 친구'는 음성으로 보낸 말이 있어야 한다 (글로 한 질문은 아니다)", () => {
  const typed = { ...base, histories: { learn_ask: msgs(3, "user") } };
  assert.ok(!earnedBadges(typed).includes("voice"));
  const spoken = { ...base, histories: { learn_ask: [{ role: "user", content: "안녕", via: "voice" }] } };
  assert.ok(earnedBadges(spoken).includes("voice"));
  // 봇이 한 말에 표시가 있어도 아이가 말한 것이 아니다
  const botOnly = { ...base, histories: { learn_ask: [{ role: "assistant", content: "응", via: "voice" }] } };
  assert.ok(!earnedBadges(botOnly).includes("voice"));
});

test("배지: '궁금쟁이'는 아이가 보낸 질문 5개부터 (답변은 세지 않는다)", () => {
  const four = { ...base, histories: { learn_ask: [...msgs(4, "user"), ...msgs(4, "assistant")] } };
  assert.ok(!earnedBadges(four).includes("curious"), "질문 4개 + 답변 4개는 8개지만 아직 아니다");
  const five = { ...base, histories: { learn_ask: [...msgs(5, "user"), ...msgs(5, "assistant")] } };
  assert.ok(earnedBadges(five).includes("curious"));
});
