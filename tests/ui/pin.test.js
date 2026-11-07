// 부모 PIN 대책: 가입 때 정하기, 프로필 전환 잠금, 재설정 알림, 가려지면 다시 잠금, 대화창 접근성, 다른 탭 보호.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, launchBrowser, openApp, seed, BASE, pinKeys } from "./helpers.js";

let server, browser;
before(async () => { server = await startServer(); browser = await launchBrowser(); });
after(async () => { await browser?.close(); server?.kill(); });

// 아이 두 명이 있는 저장값 (지안 + 하준)
function twoKids(over = {}) {
  const s = seed(over);
  s.kids.j = JSON.parse(JSON.stringify(s.kids.k));
  s.kids.j.profile.name = "하준";
  s.kids.j.profile.avatar = "🐻";
  return s;
}

async function openSwitcher(page) {
  await page.click(".fx-ava");
  await page.click("text=프로필 바꾸기");
  await page.waitForSelector(".kid-item", { timeout: 8000 });
}

test("가입: PIN을 두 번 다르게 입력하면 다시 정하게 하고, 같게 입력해야 시작된다", async () => {
  const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const start = await page.$(".splash-primary");
  if (start) await start.click();
  await page.waitForSelector(".ob-step", { timeout: 8000 });
  await page.fill(".ob-field input:not([type=number])", "지안");
  await page.click(".ob-primary:not([disabled])");
  for (const s of await page.$$("select")) {
    const o = await s.$$eval("option", (x) => x.map((y) => y.value).filter(Boolean));
    if (o.length) await s.selectOption(o[Math.min(3, o.length - 1)]);
  }
  await page.click(".ob-primary:not([disabled])");
  for (const c of (await page.$$(".ob-chip")).slice(0, 2)) await c.click();
  await page.click(".ob-primary:not([disabled])");
  await page.click(".ob-primary:not([disabled])"); // 안전 안내 → PIN
  await page.waitForSelector(".pin-inline", { timeout: 8000 });

  await pinKeys(page, "1234");
  await pinKeys(page, "9999");
  await page.waitForSelector("text=서로 달라요", { timeout: 4000 });
  assert.ok(!(await page.$(".kids-home")), "다른 PIN이면 시작되면 안 된다");
  await pinKeys(page, "4321");
  await pinKeys(page, "4321");
  await page.waitForSelector(".kids-home", { timeout: 20000 });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("banjjaktalk_v2")));
  assert.equal(saved.settings.pin, "4321");
  await page.close();
});

test("프로필 전환: PIN이 있으면 PIN 뒤에만 되고, 부모 화면은 열리지 않는다", async () => {
  const { page } = await openApp(browser, twoKids({ settings: { pin: "1234" } }));
  assert.match(await page.innerText(".fx-hi"), /지안/);
  await openSwitcher(page);
  await page.click(".kid-item:not(.on):not(.add)");
  await page.waitForSelector(".pin-card", { timeout: 8000 });
  assert.match(await page.innerText(".fx-hi"), /지안/, "PIN 전에는 전환되지 않는다");

  await pinKeys(page, "9999");
  await page.waitForTimeout(500);
  assert.match(await page.innerText(".fx-hi"), /지안/, "틀린 PIN으로는 전환되지 않는다");

  await pinKeys(page, "1234");
  await page.waitForSelector(".kids-home", { timeout: 8000 });
  await page.waitForFunction(() => /하준/.test(document.querySelector(".fx-hi")?.innerText || ""), null, { timeout: 8000 });
  assert.ok(!(await page.$(".guard-screen")), "부모 존은 열지 않고 전환만 한다");
  await page.close();
});

test("프로필 전환: PIN을 정하지 않았다면 바로 전환된다", async () => {
  const { page } = await openApp(browser, twoKids());
  await openSwitcher(page);
  await page.click(".kid-item:not(.on):not(.add)");
  await page.waitForFunction(() => /하준/.test(document.querySelector(".fx-hi")?.innerText || ""), null, { timeout: 8000 });
  assert.ok(!(await page.$(".pin-card")));
  await page.close();
});

// 화면에 나온 "a×b+c" 문제의 답
async function solveChallenge(page) {
  const text = await page.innerText(".gate-q");
  const [, a, b, c] = text.match(/(\d+)\s*[×x*]\s*(\d+)\s*\+\s*(\d+)/) || [];
  assert.ok(a, `문제를 읽지 못했다: ${text}`);
  return String(Number(a) * Number(b) + Number(c));
}

test("PIN을 잊어 계산으로 재설정하면 부모 화면에 안내가 남고, 설정에서 PIN을 다시 정하면 사라진다", async () => {
  const { page } = await openApp(browser, seed({ settings: { pin: "1234" } }));
  await page.click(".tab >> text=부모");
  await page.waitForSelector(".pin-card", { timeout: 8000 });
  await page.click("text=PIN을 잊으셨나요?");
  await page.waitForSelector(".gate-q", { timeout: 8000 });
  await page.fill(".pin-forgot-input", await solveChallenge(page));
  await page.click("#gateOk");
  await pinKeys(page, "7777");
  await pinKeys(page, "7777");
  await page.waitForSelector(".guard-screen", { timeout: 8000 });
  await page.waitForSelector(".pin-alert", { timeout: 4000 });
  assert.match(await page.innerText(".pin-alert"), /PIN이 다시 정해졌어요/);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("banjjaktalk_v2")));
  assert.equal(saved.settings.pin, "7777");
  assert.ok(saved.settings.pinResetAt, "재설정 시각이 저장된다");

  // 새로고침해도 안내는 남는다
  await page.reload({ waitUntil: "networkidle" });
  const start = await page.$(".splash-primary");
  if (start) await start.click();
  await page.click(".tab >> text=부모");
  await pinKeys(page, "7777");
  await page.waitForSelector(".pin-alert", { timeout: 8000 });

  // 설정에서 PIN을 직접 다시 정하면 안내가 사라진다
  await page.click('[aria-label="설정"]');
  await page.click("text=비밀번호 변경");
  const boxes = await page.$$(".set-pin-edit input");
  await boxes[0].fill("2468");
  await boxes[1].fill("2468");
  await page.click(".set-pin-edit >> text=저장");
  await page.click(".back-btn");
  await page.waitForSelector(".guard-screen", { timeout: 8000 });
  assert.equal(await page.$(".pin-alert"), null, "PIN을 다시 정하면 안내가 사라진다");
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem("banjjaktalk_v2")));
  assert.equal(after.settings.pin, "2468");
  assert.equal(after.settings.pinResetAt, null);
  await page.close();
});

test("PIN으로 직접 연 것은 재설정 안내를 만들지 않는다", async () => {
  const { page } = await openApp(browser, seed({ settings: { pin: "1234" } }));
  await page.click(".tab >> text=부모");
  await pinKeys(page, "1234");
  await page.waitForSelector(".guard-screen", { timeout: 8000 });
  assert.equal(await page.$(".pin-alert"), null);
  await page.close();
});

test("앱이 가려지면 열려 있던 부모 존이 다시 잠긴다", async () => {
  const { page } = await openApp(browser, seed({ settings: { pin: "1234" } }));
  await page.click(".tab >> text=부모");
  await pinKeys(page, "1234");
  await page.waitForSelector(".guard-screen", { timeout: 8000 });

  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForSelector(".guard-screen", { state: "detached", timeout: 4000 });
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  // 다시 부모 탭을 누르면 PIN을 묻는다
  await page.click(".tab >> text=부모");
  await page.waitForSelector(".pin-card", { timeout: 8000 });
  assert.equal(await page.$(".guard-screen"), null);
  await page.close();
});

test("대화창: 역할이 있고, 열면 포커스가 안으로 들어오며, Esc로 닫히고 포커스가 돌아온다", async () => {
  const { page } = await openApp(browser);
  await page.focus(".fx-star");
  await page.click(".fx-star");
  await page.waitForSelector('[role="dialog"]', { timeout: 8000 });
  assert.equal(await page.getAttribute('[role="dialog"]', "aria-modal"), "true");
  assert.ok(await page.getAttribute('[role="dialog"]', "aria-label"));
  assert.ok(await page.evaluate(() => document.querySelector('[role="dialog"]').contains(document.activeElement)), "포커스가 대화창 안에 있다");

  // Tab을 여러 번 눌러도 밖으로 나가지 않는다
  for (let i = 0; i < 12; i++) await page.keyboard.press("Tab");
  assert.ok(await page.evaluate(() => document.querySelector('[role="dialog"]').contains(document.activeElement)), "Tab이 대화창 밖으로 샌다");

  await page.keyboard.press("Escape");
  await page.waitForSelector('[role="dialog"]', { state: "detached", timeout: 4000 });
  assert.ok(await page.evaluate(() => document.activeElement?.classList.contains("fx-star")), "닫으면 열었던 버튼으로 포커스가 돌아온다");
  await page.close();
});

test("PIN 입력은 키보드 숫자로도 되고 Esc로 닫힌다", async () => {
  const { page } = await openApp(browser, seed({ settings: { pin: "1234" } }));
  await page.click(".tab >> text=부모");
  await page.waitForSelector(".pin-card", { timeout: 8000 });
  await page.keyboard.type("1234");
  await page.waitForSelector(".guard-screen", { timeout: 8000 });
  await page.close();

  const { page: p2 } = await openApp(browser, seed({ settings: { pin: "1234" } }));
  await p2.click(".tab >> text=부모");
  await p2.waitForSelector(".pin-card", { timeout: 8000 });
  await p2.keyboard.press("Escape");
  await p2.waitForSelector(".pin-card", { state: "detached", timeout: 4000 });
  await p2.close();
});

test("다른 탭이 먼저 기록을 바꿨으면 덮어쓰지 않고 새로고침을 안내한다", async () => {
  const ctx = await browser.newContext({ viewport: { width: 402, height: 874 } });
  const state = seed({ rewards: { balance: 10 } });
  await ctx.addInitScript((s) => {
    if (!localStorage.getItem("banjjaktalk_v2")) localStorage.setItem("banjjaktalk_v2", JSON.stringify(s));
  }, state);
  const open = async () => {
    const p = await ctx.newPage();
    await p.goto(BASE + "/", { waitUntil: "networkidle" });
    const st = await p.$(".splash-primary");
    if (st) await st.click();
    await p.waitForSelector(".kids-home", { timeout: 10000 });
    return p;
  };
  const a = await open();
  const b = await open();

  const complete = async (p, idx) => {
    await (await p.$$(".tab-bar .tab"))[1].click();
    await p.waitForSelector(".missions", { timeout: 8000 });
    await (await p.$$("text=완료하기"))[idx].click();
    await p.waitForSelector(".mission-modal", { timeout: 8000 });
    await p.click("text=네, 다 했어요!");
    await p.waitForTimeout(800);
  };
  await complete(b, 0); // 탭 B가 먼저 미션 하나를 완료 (+2별)
  const afterB = await a.evaluate(() => localStorage.getItem("banjjaktalk_v2"));

  await complete(a, 1); // 탭 A는 오래된 상태에서 다른 미션을 완료하려 한다
  await a.waitForSelector(".storage-banner", { timeout: 4000 });
  const now = await a.evaluate(() => localStorage.getItem("banjjaktalk_v2"));
  assert.equal(now, afterB, "탭 B가 저장한 기록을 탭 A가 덮어썼다");

  await a.click(".storage-banner button");
  await a.waitForLoadState("networkidle");
  const st = await a.$(".splash-primary");
  if (st) await st.click();
  await a.waitForSelector(".kids-home", { timeout: 10000 });
  assert.equal(Number((await a.innerText(".fx-star-pill")).trim()), 12, "새로고침하면 탭 B의 기록으로 이어진다");
  await ctx.close();
});
