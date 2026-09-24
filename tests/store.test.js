// store.js는 localStorage를 쓰므로 최소 스텁을 깔고 불러온다.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

class MemStorage {
  constructor() { this.map = new Map(); this.failNext = 0; }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) {
    if (this.failNext > 0) {
      this.failNext--;
      const e = new Error("quota"); e.name = "QuotaExceededError"; throw e;
    }
    this.map.set(k, String(v));
  }
  removeItem(k) { this.map.delete(k); }
}
globalThis.localStorage = new MemStorage();

const { emptyRewards, rollDay, persist, loadStore, MAX_STORED_MESSAGES } =
  await import("../src/lib/store.js");

beforeEach(() => { globalThis.localStorage = new MemStorage(); });

test("MAX_STORED_MESSAGES: 서버가 읽는 30개보다 여유가 있다", () => {
  assert.ok(MAX_STORED_MESSAGES >= 30);
});

test("rollDay: 같은 날이면 오늘 수치를 유지한다", () => {
  const today = new Date().toISOString().slice(0, 10);
  const r = rollDay({ ...emptyRewards(), day: today, balance: 27, msgsToday: 12, attendance: true });
  assert.equal(r.msgsToday, 12);
  assert.equal(r.attendance, true);
  assert.equal(r.balance, 27);
});

test("rollDay: 날짜가 바뀌면 하루치만 초기화하고 별 잔액은 지킨다", () => {
  const r = rollDay({
    ...emptyRewards(), day: "2020-01-01",
    balance: 27, earnedToday: 9, msgsToday: 40,
    attendance: true, doneToday: ["m1"], allClear: true, chestOpened: true,
  });
  assert.equal(r.msgsToday, 0, "하루 대화 수가 초기화돼야 다음 날 다시 대화할 수 있다");
  assert.equal(r.earnedToday, 0);
  assert.equal(r.attendance, false);
  assert.deepEqual(r.doneToday, []);
  assert.equal(r.allClear, false);
  assert.equal(r.chestOpened, false);
  assert.equal(r.balance, 27, "모아둔 별은 날짜가 바뀌어도 사라지면 안 된다");
});

test("rollDay: msgsToday가 없는 기존 저장값도 0으로 시작한다", () => {
  const today = new Date().toISOString().slice(0, 10);
  const { msgsToday } = rollDay({ day: today, balance: 5 });
  assert.equal(msgsToday, 0);
});

test("persist: 용량이 부족하면 대화만 버리고 별·프로필은 지킨다", () => {
  globalThis.localStorage.failNext = 1; // 첫 저장만 실패시킨다
  const ok = persist({
    settings: {}, activeKid: "k",
    kids: { k: { profile: { name: "지안" }, rewards: { balance: 27 },
                 histories: { a: [{ role: "user", content: "x" }] } } },
  });
  assert.equal(ok, true, "폴백으로라도 저장에 성공해야 한다");
  const saved = JSON.parse(globalThis.localStorage.getItem("banjjaktalk_v2"));
  assert.equal(saved.kids.k.rewards.balance, 27);
  assert.equal(saved.kids.k.profile.name, "지안");
  assert.deepEqual(saved.kids.k.histories, {}, "대화 기록만 비워진다");
});

test("persist: 두 번 다 실패하면 false를 돌려준다", () => {
  globalThis.localStorage.failNext = 2;
  assert.equal(persist({ settings: {}, activeKid: "k", kids: {} }), false);
});

test("loadStore: 저장값이 손상돼도 기동할 수 있는 형태를 돌려준다", () => {
  for (const broken of ['"문자열"', "null", "[1,2,3]", '{"a":"배열아님"}']) {
    globalThis.localStorage = new MemStorage();
    globalThis.localStorage.setItem("banjjaktalk_v2", JSON.stringify({
      settings: {}, activeKid: "k",
      kids: { k: { profile: { onboarded: true, name: "지안" }, histories: JSON.parse(broken) } },
    }));
    const st = loadStore();
    const h = st.kids[st.activeKid].histories;
    assert.equal(typeof h, "object");
    assert.ok(!Array.isArray(h), `histories=${broken} 는 객체여야 한다`);
    for (const v of Object.values(h)) assert.ok(Array.isArray(v));
  }
});

test("loadStore: 저장값이 아예 깨져도 빈 상태로 시작한다", () => {
  globalThis.localStorage.setItem("banjjaktalk_v2", "{ 깨진 JSON");
  const st = loadStore();
  assert.ok(st.activeKid);
  assert.ok(st.kids[st.activeKid]);
});

test("회귀 방지: 하루 사용량을 잘린 기록에서 세면 안 된다", () => {
  // 한 번의 대화는 사용자+AI 2개를 저장하므로, 40개 상한에서 60번 대화해도
  // 기록에는 사용자 메시지가 20개만 남는다. 여기서 사용량을 유도하면
  // 부모의 하루 제한(예: 30)이 영원히 발동하지 않는다.
  let hist = [];
  for (let i = 0; i < 60; i++) {
    hist = [...hist, { role: "user" }, { role: "assistant" }].slice(-MAX_STORED_MESSAGES);
  }
  const fromHistory = hist.filter((m) => m.role === "user").length;
  assert.equal(fromHistory, 20);
  assert.ok(fromHistory < 30, "그래서 사용량은 rewards.msgsToday 카운터로 센다");
});
