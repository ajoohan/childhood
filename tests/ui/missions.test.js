// 미션 AI 확인(2026-11-25 사용자 결정 "실제 AI 확인 기능 추가")과 그림 만들기의 하루 횟수 포함("2번 포함해").
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, launchBrowser, openApp, seed, BASE } from "./helpers.js";

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

test("출석: 누르기만 해서는 별을 주지 않고, 별이와 아침 인사를 나눠야 +1", async () => {
  const bodies = [];
  const { page } = await openApp(browser, seed({ rewards: { balance: 10 } }), {
    beforeLoad: (p) =>
      p.route("**/api/chat", (r) => {
        bodies.push(r.request().postDataJSON());
        r.fulfill({ status: 200, contentType: "text/event-stream", body: sse({ text: "좋은 아침, 지안아! 기분이 좋다니 나도 신나!" }, "[DONE]") });
      }),
  });
  await page.locator(".tab-bar .tab").nth(1).click();
  await page.waitForSelector(".missions", { timeout: 8000 });
  await page.click(".mb-attend");
  await page.waitForSelector(".mm-answer input", { timeout: 8000 });
  assert.match(await page.innerText(".mission-modal"), /좋은 아침, 지안아! 오늘 기분은 어때\?/);
  assert.equal(await page.$("text=정말 다 했나요?"), null, "인사는 '정말 다 했나요?'를 묻지 않는다");
  assert.equal((await saved(page)).rewards.balance, 10, "인사하기 전에는 별을 주지 않는다");

  await page.fill(".mm-answer input", "안녕 별이야! 오늘 기분 좋아");
  await page.click("text=알려 주기");
  await page.waitForSelector(".mission-modal.praise", { timeout: 8000 });
  assert.match(await page.innerText(".mission-modal.praise"), /\+1 별!/);
  assert.match(await page.innerText(".mission-modal.praise"), /기분이 좋다니 나도 신나/);
  assert.equal(bodies.length, 1);
  assert.equal(bodies[0].activityId, "morning_greet");
  assert.equal(bodies[0].mission, undefined);
  const k = await saved(page);
  assert.equal(k.rewards.balance, 11);
  assert.equal(k.rewards.attendance, true);
  assert.equal(k.rewards.msgsToday, 1);
  await page.click("text=좋아!");
  assert.equal(await page.isDisabled(".mb-attend"), true, "하루 한 번");
  await page.close();
});

test("'AI와 아침 인사하기' 미션도 '어떻게 했는지'가 아니라 별이와 인사를 나눠서 완료한다", async () => {
  const bodies = [];
  const { page } = await openApp(browser, seed({ rewards: { balance: 10 } }), {
    beforeLoad: (p) =>
      p.route("**/api/chat", (r) => {
        bodies.push(r.request().postDataJSON());
        r.fulfill({ status: 200, contentType: "text/event-stream", body: sse({ text: "반가워! 오늘도 화이팅!" }, "[DONE]") });
      }),
  });
  await page.locator(".tab-bar .tab").nth(1).click();
  await page.waitForSelector(".missions", { timeout: 8000 });
  await page.locator(".mb-item", { hasText: "AI와 아침 인사하기" }).locator(".mb-do").click();
  await page.waitForSelector(".mm-answer input", { timeout: 8000 });
  assert.match(await page.innerText(".mission-modal"), /오늘 기분은 어때/);
  assert.doesNotMatch(await page.innerText(".mission-modal"), /어떻게 했는지/);
  await page.fill(".mm-answer input", "안녕!");
  await page.click("text=알려 주기");
  await page.waitForSelector(".mission-modal.praise", { timeout: 8000 });
  assert.equal(bodies[0].activityId, "morning_greet");
  const k = await saved(page);
  assert.equal(k.rewards.balance, 12);
  assert.deepEqual(k.rewards.doneToday, ["greet"]);
  assert.equal(k.rewards.attendance, false, "미션과 출석은 따로다");
  await page.close();
});

test("출석: 오늘 대화 횟수를 다 썼으면 AI 없이 기본 인사로 별 +1", async () => {
  let calls = 0;
  const { page } = await openApp(browser, seed({ settings: { limitPerDay: 2 }, rewards: { balance: 10, msgsToday: 2 } }), {
    beforeLoad: (p) => p.route("**/api/chat", (r) => { calls++; r.abort(); }),
  });
  await page.locator(".tab-bar .tab").nth(1).click();
  await page.waitForSelector(".missions", { timeout: 8000 });
  await page.click(".mb-attend");
  await page.waitForSelector(".mission-modal.praise", { timeout: 8000 });
  assert.equal(calls, 0);
  const k = await saved(page);
  assert.equal(k.rewards.balance, 11);
  assert.equal(k.rewards.attendance, true);
  assert.equal(k.rewards.msgsToday, 2);
  await page.close();
});

// 말하기 인식을 가짜로: __interim(t)은 중간 결과, __final(t)은 확정 결과
async function fakeSR(p) {
  await p.addInitScript(() => {
    class FakeSR { start() { window.__sr = this; } stop() {} abort() {} }
    window.webkitSpeechRecognition = FakeSR;
    window.SpeechRecognition = FakeSR;
    const ev = (t, isFinal) => ({ resultIndex: 0, results: [Object.assign([{ transcript: t }], { isFinal })] });
    window.__interim = (t) => window.__sr.onresult(ev(t, false));
    window.__final = (t) => window.__sr.onresult(ev(t, true));
  });
}

test("미션 확인 창: 좁은 휴대폰에서도 질문·입력칸·마이크·'알려 주기'가 창 안에 다 보인다", async () => {
  for (const width of [320, 360]) {
    const page = await browser.newPage({ viewport: { width, height: 740 } });
    await fakeSR(page);
    await page.addInitScript((s) => localStorage.setItem("banjjaktalk_v2", JSON.stringify(s)), seed());
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    const st = await page.$(".splash-primary");
    if (st) await st.click();
    await page.waitForSelector(".kids-home", { timeout: 10000 });
    await openMission(page);
    await page.waitForSelector(".mm-mic", { timeout: 8000 });
    const box = (sel) => page.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right }; });
    const dlg = await box(".mission-modal");
    for (const sel of [".mm-answer input", ".mm-mic", ".mm-chat .mm-bubble.bot", ".mm-actions .mm-yes"]) {
      const b = await box(sel);
      assert.ok(b.l >= dlg.l - 1 && b.r <= dlg.r + 1, `${width}px: ${sel}가 창 밖으로 나갔다 (${JSON.stringify(b)} / 창 ${JSON.stringify(dlg)})`);
      assert.ok(b.r <= width, `${width}px: ${sel}가 화면 밖`);
    }
    await page.close();
  }
});

test("미션 확인: 말하는 중에 보내면 아직 확정 안 된 말도 보내고, 늦게 온 인식 결과는 보낸 말에 붙지 않는다", async () => {
  const bodies = [];
  const { page } = await openApp(browser, seed(), {
    beforeLoad: async (p) => {
      await fakeSR(p);
      await p.route("**/api/chat", (r) => {
        bodies.push(r.request().postDataJSON());
        r.fulfill({ status: 200, contentType: "text/event-stream", body: sse({ text: "잘했어!" }, "[DONE]") });
      });
    },
  });
  await openMission(page);
  await page.fill(".mm-answer input", "안녕");
  await page.click(".mm-mic");
  await page.evaluate(() => window.__interim("이 닦았어"));
  await page.click("text=알려 주기");
  await page.evaluate(() => window.__sr && window.__final("늦게 온 말"));
  await page.waitForSelector(".mission-modal.praise", { timeout: 8000 });
  assert.equal(bodies[0].messages[0].content, "안녕 이 닦았어");
  await page.close();
});

test("미션 확인: 대답에서 속상함(안전 신호)이 나오면 별은 주되 폭죽·'+별!' 축하로 보여 주지 않는다", async () => {
  const { page } = await openApp(browser, seed({ rewards: { balance: 10 } }), {
    beforeLoad: (p) =>
      p.route("**/api/chat", (r) =>
        r.fulfill({ status: 200, contentType: "text/event-stream", body: sse({ safety: "distress" }, { text: "많이 힘들었구나. 부모님께 꼭 이야기해 줘." }, "[DONE]") })
      ),
  });
  await page.locator(".tab-bar .tab").nth(1).click();
  await page.waitForSelector(".missions", { timeout: 8000 });
  await page.click(".mb-attend");
  await page.fill(".mm-answer input", "오늘 너무 슬퍼 아무도 나를 안 좋아해");
  await page.click("text=알려 주기");
  await page.waitForSelector(".mission-modal.praise", { timeout: 8000 });
  const text = await page.innerText(".mission-modal.praise");
  assert.match(text, /이야기해 줘서 고마워/);
  assert.match(text, /많이 힘들었구나/);
  assert.doesNotMatch(text, /\+1 별!/);
  assert.equal(await page.$(".confetti"), null, "속상한 말 위에 폭죽을 띄웠다");
  const k = await saved(page);
  assert.equal(k.rewards.balance, 11, "별은 준다");
  assert.equal(k.safety[0].category, "distress");
  await page.close();
});
