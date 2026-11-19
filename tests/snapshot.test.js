import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSnapshot, applySnapshot, isSnapshot, sameSnapshot, MAX_SNAPSHOT_BYTES } from "../src/lib/snapshot.js";
import { emptyKid, todayKey } from "../src/lib/store.js";

function kid(name, extra = {}) {
  const k = emptyKid();
  k.profile = { ...k.profile, onboarded: true, name, age: 6, avatar: "🦊", interests: ["art"] };
  k.rewards = { ...k.rewards, day: todayKey(), balance: 27 };
  k.histories = { story_listen: [{ role: "user", content: "비밀 이야기", t: "2026-11-01T00:00:00Z" }] };
  k.safety = [{ t: "2026-11-01T00:00:00Z", category: "distress", text: "아이가 한 말" }];
  k.notices = [{ t: "2026-11-01T00:00:00Z", title: "알림" }];
  k.stickers = { star: 2 };
  return { ...k, ...extra };
}

const store = () => ({
  settings: { limitPerDay: 5, voice: "shimmer", sound: true, notifyMissions: true, pin: "1234", pinResetAt: "2026-11-01T00:00:00Z", ageMode: "young" },
  activeKid: "k_a",
  kids: { k_a: kid("지안"), k_b: kid("하준") },
});

test("스냅샷: 대화 기록·안전 알림 발췌·알림함·PIN은 계정에 올리지 않는다", () => {
  const snap = buildSnapshot(store());
  const text = JSON.stringify(snap);
  assert.ok(!text.includes("비밀 이야기"), "대화 내용이 들어갔다");
  assert.ok(!text.includes("아이가 한 말"), "안전 알림 발췌가 들어갔다");
  assert.ok(!text.includes("1234"), "PIN이 들어갔다");
  assert.ok(!("histories" in snap.kids.k_a) && !("safety" in snap.kids.k_a) && !("notices" in snap.kids.k_a));
  assert.ok(!("pin" in snap.settings) && !("pinResetAt" in snap.settings) && !("ageMode" in snap.settings));
  assert.equal(snap.kids.k_a.profile.name, "지안");
  assert.equal(snap.kids.k_a.rewards.balance, 27);
  assert.deepEqual(snap.settings, { limitPerDay: 5, voice: "shimmer", sound: true, notifyMissions: true });
});

test("스냅샷: 가입을 마치지 않은 빈 프로필과 이상한 id는 올리지 않는다", () => {
  const s = store();
  s.kids.k_empty = emptyKid(); // onboarded false
  s.kids["../evil"] = kid("나쁜"); // 허용되지 않는 id
  const snap = buildSnapshot(s);
  assert.deepEqual(Object.keys(snap.kids).sort(), ["k_a", "k_b"]);
});

test("스냅샷: activeKid가 올리지 않는 아이면 올리는 아이 중 첫째로 바꾼다", () => {
  const s = store();
  s.activeKid = "k_empty";
  s.kids.k_empty = emptyKid();
  assert.equal(buildSnapshot(s).activeKid, "k_a");
});

test("스냅샷: 너무 크면 던진다", () => {
  const s = store();
  s.kids.k_a.parentMissions = [{ id: "m", title: "가".repeat(MAX_SNAPSHOT_BYTES) }];
  assert.throws(() => buildSnapshot(s), /too large/);
});

test("스냅샷: 크기는 글자 수가 아니라 바이트로 잰다 (한글은 글자당 3바이트)", () => {
  const s = store();
  const chars = Math.floor(MAX_SNAPSHOT_BYTES / 2); // 글자 수로는 한도의 절반, 바이트로는 1.5배
  s.kids.k_a.parentMissions = [{ id: "m", title: "가".repeat(chars) }];
  assert.throws(() => buildSnapshot(s), /too large/);
  s.kids.k_a.parentMissions = [{ id: "m", title: "a".repeat(chars) }]; // 같은 글자 수의 영문은 한도 안
  assert.doesNotThrow(() => buildSnapshot(s));
});

test("불러오기: 아이 목록은 스냅샷으로 바뀌고, 같은 아이의 대화 기록과 기기의 PIN은 남는다", () => {
  const remote = buildSnapshot(store());
  remote.kids.k_a.rewards.balance = 99;
  remote.kids.k_c = remote.kids.k_b; // 다른 기기에서 추가된 아이
  delete remote.kids.k_b;
  remote.settings.limitPerDay = 3;

  const local = store();
  delete local.settings.pin; // 새 기기라 PIN이 없다고 가정
  local.settings.pin = "9999";
  const out = applySnapshot(local, remote);

  assert.deepEqual(Object.keys(out.kids).sort(), ["k_a", "k_c"], "k_b는 사라지고 k_c가 생긴다");
  assert.equal(out.kids.k_a.rewards.balance, 99);
  assert.equal(out.kids.k_a.histories.story_listen[0].content, "비밀 이야기", "같은 아이의 기기 대화 기록은 그대로");
  assert.equal(out.kids.k_a.safety.length, 1);
  assert.deepEqual(out.kids.k_c.histories, {}, "새 아이는 대화 기록이 없다");
  assert.equal(out.settings.pin, "9999", "PIN은 기기 것을 유지");
  assert.equal(out.settings.limitPerDay, 3);
  assert.equal(out.activeKid, "k_a");
});

test("불러오기: 모양이 잘못된 값은 거부하고, 이상한 값은 걸러낸다", () => {
  assert.throws(() => applySnapshot(store(), null), /invalid/);
  assert.throws(() => applySnapshot(store(), { v: 2, kids: { k: {} } }), /invalid/);
  assert.throws(() => applySnapshot(store(), { v: 1, kids: {} }), /invalid/);
  assert.equal(isSnapshot({ v: 1, kids: { "../x": {} } }), false, "허용되지 않는 id뿐이면 거부");

  const weird = buildSnapshot(store());
  weird.settings.limitPerDay = "열 번";
  weird.settings.pin = "0000"; // 스냅샷에 PIN이 끼어 있어도 적용하지 않는다
  weird.activeKid = "없는아이";
  weird.kids["../evil"] = weird.kids.k_a;
  weird.kids.k_a.parentMissions = "배열 아님";
  const out = applySnapshot(store(), weird);
  assert.equal(out.settings.limitPerDay, null);
  assert.equal(out.settings.pin, "1234");
  assert.ok(!("../evil" in out.kids));
  assert.deepEqual(out.kids.k_a.parentMissions, []);
  assert.ok(out.kids[out.activeKid], "activeKid가 실제 아이를 가리킨다");
});

test("불러오기를 다시 올리면 같은 내용이다 (저장→불러오기→저장이 안정적)", () => {
  const first = buildSnapshot(store());
  const roundTrip = buildSnapshot(applySnapshot(store(), first));
  assert.ok(sameSnapshot(first, roundTrip));
});

test("sameSnapshot: 키 순서와 무관하고 값이 다르면 다르다", () => {
  assert.ok(sameSnapshot({ a: 1, b: { c: [1, 2] } }, { b: { c: [1, 2] }, a: 1 }));
  assert.ok(!sameSnapshot({ a: 1 }, { a: 2 }));
});
