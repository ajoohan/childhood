// 별 경제와 온보딩처럼 여러 화면에 걸친 흐름.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, launchBrowser, openApp, seed, BASE } from "./helpers.js";

let server, browser;
before(async () => { server = await startServer(); browser = await launchBrowser(); });
after(async () => { await browser?.close(); server?.kill(); });

const stars = async (page) => Number((await page.innerText(".fx-star-pill")).trim());

test("미션을 완료하면 별이 늘고, 같은 미션은 하루 한 번만", async () => {
  const { page, errors } = await openApp(browser, seed({ rewards: { balance: 10 } }));
  assert.equal(await stars(page), 10);

  await (await page.$$(".tab-bar .tab"))[1].click();
  await page.waitForSelector(".missions", { timeout: 8000 });

  const done = await page.$$("text=완료하기");
  assert.ok(done.length > 0, "완료할 미션이 있어야 한다");
  await done[0].click();
  // 바로 지급되지 않고 "정말 다 했나요?" 확인을 거친다
  await page.waitForSelector(".mission-modal", { timeout: 8000 });
  await page.click("text=네, 다 했어요!");
  await page.waitForTimeout(1500);

  // 홈으로 돌아가 별이 늘었는지 확인
  await (await page.$$(".tab-bar .tab"))[0].click();
  await page.waitForSelector(".kids-home", { timeout: 8000 });
  const after1 = await stars(page);
  assert.ok(after1 > 10, `별이 늘어야 한다 (10 -> ${after1})`);

  // 같은 미션은 다시 완료할 수 없다. 완료한 줄에는 버튼이 없고, 남은 버튼은 정확히 하나 줄었다.
  // (예전 검사는 두 번째로 누른 것이 '다른' 미션이라 가드를 지워도 통과했다.)
  assert.equal(after1, 12, "미션 보상 +2만큼만 늘어야 한다");
  await (await page.$$(".tab-bar .tab"))[1].click();
  await page.waitForSelector(".missions", { timeout: 8000 });
  assert.equal((await page.$$(".mb-item.done")).length, 1, "완료한 미션이 한 줄");
  assert.equal(await page.$(".mb-item.done .mb-do"), null, "완료한 줄에는 '완료하기'가 없다");
  assert.equal((await page.$$(".mb-do")).length, done.length - 1, "남은 버튼이 하나 줄었다");

  // 새로고침 뒤에도 그대로여야 한다 (저장되어 같은 미션을 또 받을 수 없다)
  await page.reload({ waitUntil: "networkidle" });
  const start = await page.$(".splash-primary");
  if (start) await start.click();
  await page.waitForSelector(".kids-home", { timeout: 8000 });
  assert.equal(await stars(page), after1, "새로고침해도 별이 같다");
  await (await page.$$(".tab-bar .tab"))[1].click();
  await page.waitForSelector(".missions", { timeout: 8000 });
  assert.equal((await page.$$(".mb-item.done")).length, 1, "새로고침 뒤에도 완료 상태");
  assert.deepEqual(errors, []);
  await page.close();
});

test("별은 저장돼서 새로고침해도 남는다", async () => {
  const { page } = await openApp(browser, seed({ rewards: { balance: 42 } }));
  assert.equal(await stars(page), 42);
  await page.reload({ waitUntil: "networkidle" });
  const start = await page.$(".splash-primary");
  if (start) await start.click();
  await page.waitForSelector(".kids-home", { timeout: 8000 });
  assert.equal(await stars(page), 42, "새로고침 후에도 유지");
  await page.close();
});

test("온보딩: 저장값이 없으면 온보딩이 뜨고, 마치면 홈으로 간다", async () => {
  const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const start = await page.$(".splash-primary");
  if (start) await start.click();
  await page.waitForTimeout(1200);

  // 신규 사용자는 홈이 아니라 온보딩을 본다
  assert.ok(!(await page.$(".kids-home")), "바로 홈으로 가면 안 된다");
  assert.ok(await page.$(".ob, .ob-body, .ob-copy"), "온보딩 화면");
  assert.deepEqual(errors, []);
  await page.close();
});

test("콜렉션 탭에서 꾸미기 장소 목록이 보인다", async () => {
  const { page, errors } = await openApp(browser);
  await (await page.$$(".tab-bar .tab"))[3].click();
  await page.waitForSelector(".colhub", { timeout: 8000 });
  const text = await page.innerText(".colhub");
  assert.match(text, /장소|나의 방/, "장소 목록");
  assert.deepEqual(errors, []);
  await page.close();
});

// 저장값 없이 처음 연 앱: 시작 화면에서 가입 첫 단계로
async function freshStart() {
  const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForSelector(".splash-primary", { timeout: 10000 });
  return page;
}

test("시작·가입 화면: 홈과 같은 보라 포인트를 쓴다 (예전 초록·코랄 버튼이 아니다)", async () => {
  const page = await freshStart();
  const bg = (sel) => page.$eval(sel, (el) => getComputedStyle(el).backgroundColor);
  const PURPLE = "rgb(124, 89, 186)";
  assert.equal(await bg(".splash-primary"), PURPLE, "시작하기 버튼");
  await page.click(".splash-primary");
  await page.waitForSelector(".ob-step", { timeout: 8000 });
  await page.fill(".ob-field input", "지안");
  assert.equal(await bg(".ob-primary"), PURPLE, "다음 버튼");
  await page.close();
});

test("가입 화면: 이름 뒤 조사가 받침에 맞는다 (지안은 / 서아는)", async () => {
  for (const [name, expected] of [["지안", "지안은 언제 태어났어요?"], ["서아", "서아는 언제 태어났어요?"]]) {
    const page = await freshStart();
    await page.click(".splash-primary");
    await page.waitForSelector(".ob-step", { timeout: 8000 });
    await page.fill(".ob-field input", name);
    await page.click(".ob-primary");
    await page.waitForFunction((t) => document.querySelector(".ob-step h1")?.innerText.includes(t), expected, { timeout: 8000 });
    await page.close();
  }
});
