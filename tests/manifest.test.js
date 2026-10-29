import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
const html = readFileSync("index.html", "utf8");

test("manifest가 가리키는 아이콘 파일이 모두 있다", () => {
  assert.ok(manifest.icons.length >= 2);
  for (const icon of manifest.icons) {
    assert.ok(existsSync(`public${icon.src}`), `${icon.src} 없음`);
  }
});

test("홈 화면 추가에 필요한 조건을 갖췄다", () => {
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  assert.ok(manifest.icons.some((i) => i.sizes === "512x512"));
  assert.ok(html.includes('rel="manifest" href="/manifest.webmanifest"'));
  assert.ok(html.includes('rel="apple-touch-icon" href="/apple-touch-icon.png"'));
  assert.ok(existsSync("public/apple-touch-icon.png"));
});
