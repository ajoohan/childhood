// 아이 보호 장치의 화면 동작. 이번 세션에서 두 번 다 조용히 깨졌던 부분이다.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, launchBrowser, openApp, seed, pinKeys, BASE } from "./helpers.js";

let server, browser;
before(async () => { server = await startServer(); browser = await launchBrowser(); });
after(async () => { await browser?.close(); server?.kill(); });

const parentTab = async (page) => (await page.$$(".tab-bar .tab"))[4].click();

test("PIN: 부모 탭은 잠겨 있고, 한 번 연 뒤 나가면 다시 잠긴다", async () => {
  const { page, errors } = await openApp(browser, seed({ settings: { pin: "1234" } }));

  await parentTab(page);
  await page.waitForSelector(".pin-card", { timeout: 8000 });
  assert.ok(await page.$(".pin-card"), "처음에는 PIN을 묻는다");

  await pinKeys(page, "1234");
  await page.waitForSelector(".guard-screen", { timeout: 8000 });
  assert.ok(await page.$(".guard-screen"), "정답이면 부모 존이 열린다");

  await page.click(".guard-screen .back-btn");
  await page.waitForSelector(".kids-home", { timeout: 8000 });

  await parentTab(page);
  await page.waitForSelector(".pin-card", { timeout: 8000 });
  assert.ok(await page.$(".pin-card"), "나갔다 들어오면 PIN을 다시 물어야 한다");
  assert.ok(!(await page.$(".guard-screen")), "PIN 없이 부모 존이 열리면 안 된다");

  assert.deepEqual(errors, []);
  await page.close();
});

test("PIN: 틀린 번호로는 부모 존이 열리지 않는다", async () => {
  const { page } = await openApp(browser, seed({ settings: { pin: "1234" } }));
  await parentTab(page);
  await page.waitForSelector(".pin-card", { timeout: 8000 });
  await pinKeys(page, "9999");
  await page.waitForTimeout(800);
  assert.ok(!(await page.$(".guard-screen")), "틀린 PIN으로는 진입 불가");
  await page.close();
});

test("하루 제한: 사용량이 한도에 닿으면 아이에게 안내가 뜬다", async () => {
  // 기록은 비어 있지만 카운터가 한도에 도달한 상태.
  // 기록에서 사용량을 세던 예전 방식이라면 이 상황을 놓친다.
  const { page } = await openApp(
    browser,
    seed({ settings: { limitPerDay: 5 }, rewards: { msgsToday: 5 } })
  );
  await (await page.$$(".fx-card"))[0].click();
  await page.waitForSelector(".chat-screen", { timeout: 8000 });

  await page.fill(".cx-composer input", "안녕");
  await page.press(".cx-composer input", "Enter");
  await page.waitForTimeout(1200);

  const text = await page.innerText(".chat-screen");
  assert.match(text, /오늘은 여기까지|내일 또 만나/, "제한 안내가 보여야 한다");
  await page.close();
});

test("하루 제한: 한도 아래면 정상적으로 보낼 수 있다", async () => {
  const { page } = await openApp(
    browser,
    seed({ settings: { limitPerDay: 5 }, rewards: { msgsToday: 1 } })
  );
  await (await page.$$(".fx-card"))[0].click();
  await page.waitForSelector(".chat-screen", { timeout: 8000 });
  await page.fill(".cx-composer input", "안녕");
  await page.press(".cx-composer input", "Enter");
  await page.waitForTimeout(1200);
  const text = await page.innerText(".chat-screen");
  assert.doesNotMatch(text, /오늘은 여기까지/, "한도 아래에서는 막히면 안 된다");
  assert.match(text, /안녕/, "보낸 말이 화면에 남는다");
  await page.close();
});

test("손상된 저장값으로도 앱이 흰 화면이 되지 않는다", async () => {
  const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
  page.on("pageerror", () => {});
  await page.addInitScript(() => {
    localStorage.setItem("banjjaktalk_v2", JSON.stringify({
      settings: {}, activeKid: "k",
      kids: { k: { profile: { onboarded: true, name: "지안", age: 6 }, histories: "문자열" } },
    }));
  });
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  // 고정 시간 대기는 느린 실행에서 흔들린다. 실제로 무언가 그려질 때까지 기다린다.
  await page.waitForSelector(".app, .eb", { timeout: 10000 });
  await page.waitForFunction(() => document.body.innerText.trim().length > 0, { timeout: 10000 });
  const body = (await page.innerText("body")).trim();
  assert.ok(body.length > 0, "흰 화면이면 안 된다");
  await page.close();
});
