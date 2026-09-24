import { test } from "node:test";
import assert from "node:assert/strict";
import { THEMES, themeById, themePlaceNo, isThemeUnlocked, isThemeFilled } from "../src/lib/decor.js";

test("테마: 첫 장소는 처음부터 열려 있다", () => {
  assert.equal(isThemeUnlocked(THEMES[0].id, []), true);
});

test("테마: 이전 장소를 끝내야 다음이 열린다", () => {
  const [first, second] = THEMES;
  assert.equal(isThemeUnlocked(second.id, []), false, "아직 잠김");
  assert.equal(isThemeUnlocked(second.id, [first.id]), true, "앞을 끝내면 열림");
});

test("themeById / themePlaceNo: 정의와 순서가 맞는다", () => {
  THEMES.forEach((t, i) => {
    assert.equal(themeById(t.id).id, t.id);
    assert.equal(themePlaceNo(t.id), i + 1, "장소 번호는 1부터");
  });
});

test("themeById: 모르는 id에도 무언가를 돌려준다", () => {
  assert.ok(themeById("없는테마"));
});

test("isThemeFilled: 칸을 다 채워야 완성", () => {
  const t = THEMES[0];
  assert.equal(isThemeFilled(t, {}), false);
  const full = Object.fromEntries(t.slots.map((s, i) => [s.id ?? i, "무엇"]));
  assert.equal(isThemeFilled(t, full), true);
});
