import { test } from "node:test";
import assert from "node:assert/strict";
import { allMissions, isAllClear, REWARD, openTreasure } from "../src/lib/missions.js";

test("allMissions: 기본 미션에 부모가 추가한 미션이 더해진다", () => {
  const base = allMissions([]).length;
  const withParent = allMissions([{ id: "p1", title: "방 정리" }]);
  assert.equal(withParent.length, base + 1);
  assert.ok(withParent.some((m) => m.id === "p1"));
});

test("isAllClear: 지금 있는 미션을 전부 해야 참", () => {
  const parent = [{ id: "p1", title: "방 정리" }];
  const ids = allMissions(parent).map((m) => m.id);
  assert.equal(isAllClear(ids, parent), true);
  assert.equal(isAllClear(ids.slice(0, -1), parent), false);
});

test("isAllClear: 삭제된 부모 미션의 id가 남아도 보너스를 주지 않는다", () => {
  // 부모가 p1을 완료 처리된 뒤 삭제한 상황. 개수만 비교하면 총량이 맞아떨어져
  // 화면은 2/3인데 보너스가 나가던 버그.
  const done = [...allMissions([]).map((m) => m.id).slice(0, -1), "p1_삭제됨"];
  assert.equal(done.length, allMissions([]).length, "개수는 같지만");
  assert.equal(isAllClear(done, []), false, "실제로는 올클리어가 아니다");
});

test("isAllClear: 아무것도 안 했으면 거짓", () => {
  assert.ok(allMissions([]).length > 0, "기본 미션이 있어야 의미 있는 검증");
  assert.equal(isAllClear([], []), false);
  assert.equal(isAllClear(undefined, []), false);
});

test("REWARD: 별 지급량이 양수", () => {
  assert.ok(REWARD.mission > 0);
  assert.ok(REWARD.allClear > 0);
});

test("openTreasure: 언제나 결과를 주고 현금성 보상이 없다", () => {
  for (let i = 0; i < 50; i++) {
    const r = openTreasure({});
    assert.ok(r, "보물상자는 항상 무언가를 준다");
    assert.equal(typeof JSON.stringify(r), "string");
    assert.doesNotMatch(JSON.stringify(r), /원|won|cash|결제/i);
  }
});
