// 부모 확인을 아이가 무차별로 뚫지 못하게 하는 장치.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

class MemStorage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
}
globalThis.localStorage = new MemStorage();
const { FREE_TRIES, lockRemaining, recordFail, recordSuccess, makeChallenge } =
  await import("../src/lib/pinGuard.js");

beforeEach(() => { globalThis.localStorage = new MemStorage(); });

test("한도 안에서는 잠기지 않는다", () => {
  const now = 1_000_000;
  for (let i = 0; i < FREE_TRIES - 1; i++) recordFail(now);
  assert.equal(lockRemaining(now), 0);
});

test("한도를 넘기면 잠기고, 시간이 지나면 풀린다", () => {
  const now = 1_000_000;
  for (let i = 0; i < FREE_TRIES; i++) recordFail(now);
  assert.equal(lockRemaining(now), 60_000, "처음에는 1분");
  assert.equal(lockRemaining(now + 59_999), 1);
  assert.equal(lockRemaining(now + 60_000), 0);
});

test("계속 틀리면 잠금이 점점 길어지고 30분에서 멈춘다", () => {
  const now = 1_000_000;
  for (let i = 0; i < FREE_TRIES; i++) recordFail(now);
  const steps = [];
  for (let i = 0; i < 6; i++) {
    recordFail(now);
    steps.push(lockRemaining(now));
  }
  assert.deepEqual(steps, [300_000, 900_000, 1_800_000, 1_800_000, 1_800_000, 1_800_000]);
});

test("새로고침해도(저장소를 다시 읽어도) 횟수가 초기화되지 않는다", () => {
  const now = 1_000_000;
  for (let i = 0; i < FREE_TRIES; i++) recordFail(now);
  const kept = globalThis.localStorage; // 같은 저장소 = 새로고침 후
  globalThis.localStorage = kept;
  assert.ok(lockRemaining(now) > 0);
});

test("맞히면 횟수가 초기화된다", () => {
  const now = 1_000_000;
  for (let i = 0; i < FREE_TRIES; i++) recordFail(now);
  recordSuccess();
  assert.equal(lockRemaining(now), 0);
  recordFail(now);
  assert.equal(lockRemaining(now), 0, "다시 처음부터 센다");
});

test("저장소가 없거나 깨져도 던지지 않는다", () => {
  globalThis.localStorage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  assert.doesNotThrow(() => { recordFail(); lockRemaining(); recordSuccess(); });
  globalThis.localStorage = new MemStorage();
  globalThis.localStorage.setItem("cw_pin_guard", "{깨진 json");
  assert.equal(lockRemaining(), 0);
});

test("확인 문제: 답이 맞고, 쉬운 덧셈이 아니다", () => {
  for (let i = 0; i < 200; i++) {
    const { text, answer } = makeChallenge();
    const m = text.match(/^(\d+) × (\d+) \+ (\d+)$/);
    assert.ok(m, text);
    assert.equal(Number(m[1]) * Number(m[2]) + Number(m[3]), answer);
    assert.ok(answer >= 83, "한 자리 덧셈 수준(최대 21)이면 안 된다");
  }
});
