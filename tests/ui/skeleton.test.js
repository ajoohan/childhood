// 스켈레톤 화면: 서버가 깨어나는 동안(활동 목록을 아직 못 받음) 빈 화면 대신 자리 모양과 안내를 보여 준다.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, launchBrowser, seed, BASE } from "./helpers.js";

let server, browser;
before(async () => { server = await startServer(); browser = await launchBrowser(); });
after(async () => { await browser?.close(); server?.kill(); });

// 활동 목록 응답을 붙잡아 두었다가 release()로 보낸다
async function openHeld(state = seed(), { clock = false } = {}) {
  const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
  if (clock) await page.clock.install();
  await page.addInitScript((s) => localStorage.setItem("banjjaktalk_v2", JSON.stringify(s)), state);
  let release;
  const gate = new Promise((r) => (release = r));
  await page.route("**/api/activities", async (route) => {
    await gate;
    await route.continue().catch(() => {});
  });
  await page.goto(BASE + "/");
  const st = await page.waitForSelector(".splash-primary", { timeout: 8000 }).catch(() => null);
  if (st) await st.click();
  await page.waitForSelector(".kids-home", { timeout: 10000 });
  return { page, release };
}

test("홈: 활동 목록을 받기 전에는 빈 화면 대신 스켈레톤, 오래 걸리면 깨어나는 중 안내, 받으면 진짜 화면", async () => {
  const { page, release } = await openHeld();
  await page.waitForSelector(".fx-skel", { timeout: 4000 });
  assert.equal(await page.getAttribute(".fx-skel", "aria-busy"), "true");
  assert.ok((await page.$$(".fx-skel .sk")).length >= 8, "타일·카드·바로가기 자리");
  assert.equal(await page.$(".fx-tile"), null, "받기 전에는 진짜 타일이 없다");
  assert.equal(await page.$$eval(".fx-skel .sk", (els) => els.every((e) => e.getAttribute("aria-hidden") === "true")), true);

  await page.waitForFunction(() => document.body.innerText.includes("별이가 깨어나는 중이에요"), null, { timeout: 6000 });

  release();
  await page.waitForSelector(".fx-tile", { timeout: 8000 });
  assert.equal(await page.$(".fx-skel"), null, "받은 뒤에는 스켈레톤이 사라진다");
  assert.ok((await page.$$(".fx-qrow")).length > 0);
  await page.close();
});

test("홈: 끝내 받지 못하면 스켈레톤을 계속 돌리지 않고 '다시 시도'를 보여 주며, 누르면 다시 받는다", async () => {
  const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
  await page.clock.install();
  await page.addInitScript((s) => localStorage.setItem("banjjaktalk_v2", JSON.stringify(s)), seed());
  let fail = true;
  await page.route("**/api/activities", (route) => (fail ? route.fulfill({ status: 503, body: "" }) : route.continue()));
  await page.goto(BASE + "/");
  const st = await page.waitForSelector(".splash-primary", { timeout: 8000 }).catch(() => null);
  if (st) await st.click();
  await page.waitForSelector(".fx-skel", { timeout: 8000 });
  for (let i = 0; i < 8 && !(await page.$(".sk-note.failed")); i++) {
    await page.clock.runFor(16_000);
    await page.waitForTimeout(150);
  }
  await page.waitForSelector(".sk-note.failed", { timeout: 4000 });
  assert.equal(await page.getAttribute(".fx-skel", "aria-busy"), "false");

  fail = false;
  await page.click(".sk-retry");
  await page.waitForSelector(".fx-tile", { timeout: 8000 });
  assert.equal(await page.$(".sk-note.failed"), null);
  await page.close();
});

test("저널: 받기 전에는 기록이 있어도 '아직 사진이 없어요'가 아니라 스켈레톤을 보여 준다", async () => {
  const state = seed();
  state.kids.k.histories = { learn_ask: [{ role: "user", content: "안녕", t: new Date().toISOString() }] };
  const { page, release } = await openHeld(state);
  await page.click('[aria-label="프로필 메뉴"]');
  await page.click(".hd-menu-label >> text=대화 기록");
  await page.waitForSelector(".sk-journal", { timeout: 4000 });
  assert.doesNotMatch(await page.innerText(".journal"), /아직 사진이 없어요/);
  release();
  await page.waitForSelector(".polaroid", { timeout: 8000 });
  assert.equal(await page.$(".sk-journal"), null);
  await page.close();
});

test("움직임 줄이기를 켠 기기에서는 스켈레톤이 반짝이지 않는다", async () => {
  const ctx = await browser.newContext({ viewport: { width: 402, height: 874 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.addInitScript((s) => localStorage.setItem("banjjaktalk_v2", JSON.stringify(s)), seed());
  await page.route("**/api/activities", () => {});
  await page.goto(BASE + "/");
  const st = await page.waitForSelector(".splash-primary", { timeout: 8000 }).catch(() => null);
  if (st) await st.click();
  await page.waitForSelector(".fx-skel .sk", { timeout: 8000 });
  assert.equal(await page.$eval(".fx-skel .sk", (e) => getComputedStyle(e).animationName), "none");
  await ctx.close();
});
