// replaceStore는 이 탭의 저장을 멈추므로(모듈 상태) 다른 store 테스트와 파일을 나눈다.
import { test } from "node:test";
import assert from "node:assert/strict";

class MemStorage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
}
globalThis.localStorage = new MemStorage();
const { loadStore, persistChecked, replaceStore } = await import("../src/lib/store.js");

test("계정에서 불러온 뒤에는 이 탭의 옛 화면 상태가 저장값을 다시 덮어쓰지 못한다", () => {
  const old = loadStore();
  old.settings = { ...old.settings, marker: "옛 상태" };
  assert.equal(persistChecked(old), "ok");

  const restored = { ...old, settings: { ...old.settings, marker: "불러온 기록" } };
  replaceStore(restored);

  // 새로고침 직전에 화면(옛 상태)이 한 번 더 저장을 시도하는 상황
  assert.equal(persistChecked({ ...old, settings: { ...old.settings, marker: "옛 상태", extra: 1 } }), "ok");
  assert.equal(JSON.parse(localStorage.getItem("banjjaktalk_v2")).settings.marker, "불러온 기록");
});
