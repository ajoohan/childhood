import { test } from "node:test";
import assert from "node:assert/strict";
import { ageModeForAge, ageModeForProfile, computeAge, TODDLER_MAX, CHILD_MIN } from "../src/lib/age.js";

test("연령 경계: 9세까지 영유아, 10세부터 아동", () => {
  assert.equal(TODDLER_MAX, 9);
  assert.equal(CHILD_MIN, 10);
  assert.equal(ageModeForAge(9), "young");
  assert.equal(ageModeForAge(10), "kid");
});

test("ageModeForAge: 범위 밖 값도 모드를 돌려준다", () => {
  for (const a of [0, 1, 13, 20, null, undefined, NaN]) {
    assert.ok(["young", "kid"].includes(ageModeForAge(a)), `age=${a}`);
  }
});

test("computeAge: 생일이 지나지 않았으면 한 살 적다", () => {
  const now = new Date("2026-03-01T00:00:00Z");
  assert.equal(computeAge({ birthYear: 2020, birthMonth: 1 }, now), 6); // 지남
  assert.equal(computeAge({ birthYear: 2020, birthMonth: 6 }, now), 5); // 아직
});

test("ageModeForProfile: 10번째 생일에 아동 모드로 넘어간다", () => {
  const before = new Date("2026-05-01T00:00:00Z");
  const after = new Date("2026-07-01T00:00:00Z");
  const profile = { birthYear: 2016, birthMonth: 6 };
  assert.equal(ageModeForProfile(profile, before), "young");
  assert.equal(ageModeForProfile(profile, after), "kid");
});
