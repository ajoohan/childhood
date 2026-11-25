// 미션 AI 확인(2026-11-25 사용자 결정 "실제 AI 확인 기능 추가")과 그림 만들기의 하루 횟수 포함("2번 포함해").
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, launchBrowser, openApp, seed } from "./helpers.js";

let server, browser;
before(async () => { server = await startServer(); browser = await launchBrowser(); });
after(async () => { await browser?.close(); server?.kill(); });

const sse = (...events) => events.map((e) => `data: ${typeof e === "string" ? e : JSON.stringify(e)}\n\n`).join("");
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("banjjaktalk_v2")).kids.k);

async function openMission(page) {
  await page.locator(".tab-bar .tab").nth(1).click();
  await page.waitForSelector(".missions", { timeout: 8000 });
  await page.locator("text=완료하기").first().click(); // 첫 미션: 양치질하기
  await page.waitForSelector(".mission-modal", { timeout: 8000 });
  await page.click("text=네, 다 했어요!");
}

test("미션 확인: 별이가 미션에 맞게 묻고, 아이의 대답을 AI가 칭찬하며 확인한 뒤 별을 준다", async () => {
  const bodies = [];
  const { page } = await openApp(browser, seed({ rewards: { balance: 10 } }), {
    beforeLoad: (p) =>
      p.route("**/api/chat", (r) => {
        bodies.push(r.request().postDataJSON());
        r.fulfill({ status: 200, contentType: "text/event-stream", body: sse({ text: "치카치카 " }, { text: "구석구석 닦았구나, 멋져!" }, "[DONE]") });
      }),
  });
  await openMission(page);
  await page.waitForSelector(".mm-answer input", { timeout: 8000 });
  assert.match(await page.innerText(".mission-modal"), /양치질하기.*미션, 어떻게 했는지/s, "별이가 미션에 맞는 질문을 한다");
  assert.equal(bodies.length, 0, "대답하기 전에는 AI를 부르지 않는다");
  assert.equal((await saved(page)).rewards.balance, 10, "대답하기 전에는 별을 주지 않는다");

  await page.fill(".mm-answer input", "윗니 아랫니 다 닦았어");
  await page.click("text=알려 주기");
  await page.waitForSelector(".mission-modal.praise", { timeout: 8000 });
  assert.match(await page.innerText(".mission-modal.praise"), /구석구석 닦았구나, 멋져!/, "AI의 확인 답이 칭찬으로 보인다");

  assert.equal(bodies.length, 1);
  assert.equal(bodies[0].activityId, "mission_check");
  assert.equal(bodies[0].mission.title, "양치질하기");
  assert.deepEqual(bodies[0].messages, [{ role: "user", content: "윗니 아랫니 다 닦았어" }]);
  const k = await saved(page);
  assert.equal(k.rewards.balance, 12, "미션 별 +2");
  assert.deepEqual(k.rewards.doneToday, ["brush"]);
  assert.equal(k.rewards.msgsToday, 1, "AI 확인은 하루 대화 횟수에 1번으로 센다");
  assert.deepEqual(k.histories, {}, "미션 확인은 활동 대화 기록에 남기지 않는다");
  await page.close();
});

test("미션 확인: 오늘 대화 횟수를 다 썼으면 AI를 부르지 않고, 별은 기본 칭찬과 함께 준다", async () => {
  let calls = 0;
  const { page } = await openApp(browser, seed({ settings: { limitPerDay: 3 }, rewards: { balance: 10, msgsToday: 3 } }), {
    beforeLoad: (p) => p.route("**/api/chat", (r) => { calls++; r.abort(); }),
  });
  await openMission(page);
  await page.waitForSelector(".mission-modal.praise", { timeout: 8000 });
  assert.equal(calls, 0);
  const k = await saved(page);
  assert.equal(k.rewards.balance, 12);
  assert.equal(k.rewards.msgsToday, 3, "횟수를 더 세지 않는다");
  await page.close();
});

test("미션 확인: 연결이 안 되면 기본 칭찬으로 별은 준다 (한 일의 별을 잃지 않는다)", async () => {
  const { page } = await openApp(browser, seed({ rewards: { balance: 10 } }), {
    beforeLoad: (p) => p.route("**/api/chat", (r) => r.abort()),
  });
  await openMission(page);
  await page.fill(".mm-answer input", "했어");
  await page.click("text=알려 주기");
  await page.waitForSelector(".mission-modal.praise", { timeout: 8000 });
  assert.equal((await saved(page)).rewards.balance, 12);
  await page.close();
});

test("미션 확인: 답을 기다리는 중에 창을 닫으면 별을 주지 않는다", async () => {
  let release;
  const gate = new Promise((r) => (release = r));
  const { page } = await openApp(browser, seed({ rewards: { balance: 10 } }), {
    beforeLoad: (p) =>
      p.route("**/api/chat", async (r) => {
        await gate;
        await r.fulfill({ status: 200, contentType: "text/event-stream", body: sse({ text: "잘했어!" }, "[DONE]") }).catch(() => {});
      }),
  });
  await openMission(page);
  await page.fill(".mm-answer input", "했어");
  await page.click("text=알려 주기");
  await page.waitForSelector("text=별이가 확인하고 있어요", { timeout: 8000 });
  await page.keyboard.press("Escape");
  await page.waitForSelector(".mission-modal", { state: "detached", timeout: 4000 });
  release();
  await page.waitForTimeout(800);
  assert.equal(await page.$(".mission-modal.praise"), null);
  const k = await saved(page);
  assert.equal(k.rewards.balance, 10);
  assert.deepEqual(k.rewards.doneToday, []);
  await page.close();
});

test("미션 확인: 대답에서 안전 신호가 나오면 부모 화면 안전 알림에 남는다", async () => {
  const { page } = await openApp(browser, seed(), {
    beforeLoad: (p) =>
      p.route("**/api/chat", (r) =>
        r.fulfill({ status: 200, contentType: "text/event-stream", body: sse({ safety: "distress" }, { text: "말해 줘서 고마워." }, "[DONE]") })
      ),
  });
  await openMission(page);
  await page.fill(".mm-answer input", "양치하다가 너무 슬펐어");
  await page.click("text=알려 주기");
  await page.waitForSelector(".mission-modal.praise", { timeout: 8000 });
  const k = await saved(page);
  assert.equal(k.safety.length, 1);
  assert.equal(k.safety[0].category, "distress");
  assert.match(k.safety[0].activityTitle, /미션 확인/);
  assert.equal(k.safety[0].text, "양치하다가 너무 슬펐어");
  await page.close();
});

test("그림 만들기: 하루 대화 횟수에 1번으로 세고, 다 쓰면 그리지 않는다", async () => {
  let calls = 0;
  const { page } = await openApp(browser, seed({ settings: { limitPerDay: 2 }, rewards: { msgsToday: 1 } }), {
    beforeLoad: async (p) => {
      await p.route("**/api/activities", async (route) => {
        const res = await route.fetch();
        const json = await res.json();
        json.features = { ...(json.features || {}), image: true };
        await route.fulfill({ response: res, json });
      });
      await p.route("**/api/image", (r) => {
        calls++;
        r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url: "data:image/png;base64,iVBORw0KGgo=" }) });
      });
    },
  });
  await page.click('[aria-label="프로필 메뉴"]');
  await page.click(".hd-menu-label >> text=그림 만들기");
  await page.waitForSelector(".imgmaker input", { timeout: 8000 });
  await page.fill(".imgmaker input", "웃는 고양이");
  await page.press(".imgmaker input", "Enter");
  await page.waitForSelector(".im-result", { timeout: 8000 });
  assert.equal(calls, 1);
  assert.equal((await saved(page)).rewards.msgsToday, 2, "그림 한 장 = 1번");

  await page.fill(".imgmaker input", "하나 더");
  await page.press(".imgmaker input", "Enter");
  await page.waitForFunction(() => document.body.innerText.includes("내일 또 그려 보자"), null, { timeout: 4000 });
  assert.equal(calls, 1, "횟수를 다 썼는데 그림을 요청했다");
  assert.equal((await saved(page)).rewards.msgsToday, 2);
  await page.close();
});
