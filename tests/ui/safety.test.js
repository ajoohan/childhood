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

test("PIN: 다섯 번 틀리면 잠기고, 그 사이에는 맞는 번호도 받지 않는다", async () => {
  const { page } = await openApp(browser, seed({ settings: { pin: "1234" } }));
  await parentTab(page);
  await page.waitForSelector(".pin-card", { timeout: 8000 });
  for (let i = 0; i < 5; i++) {
    await pinKeys(page, "9999");
    await page.waitForTimeout(350);
  }
  assert.match(await page.innerText(".pin-card"), /너무 여러 번 틀렸어요/, "잠금 안내가 보여야 한다");

  await pinKeys(page, "1234"); // 잠긴 동안은 정답이어도 열리면 안 된다
  await page.waitForTimeout(600);
  assert.ok(!(await page.$(".guard-screen")), "잠긴 동안 부모 존이 열리면 안 된다");
  await page.close();
});

test("PIN: '잊으셨나요?' 확인 문제는 아이가 어림으로 맞힐 수 없는 곱셈이고, 틀리면 문제가 바뀐다", async () => {
  const { page } = await openApp(browser, seed({ settings: { pin: "1234" } }));
  await parentTab(page);
  await page.waitForSelector(".pin-card", { timeout: 8000 });
  await page.click(".pin-link");
  await page.waitForSelector(".gate-q", { timeout: 8000 });
  const q1 = await page.innerText(".gate-q");
  assert.match(q1, /\d+ × \d+ \+ \d+/, "곱셈 문제여야 한다");

  await page.fill(".pin-forgot-input", "1");
  await page.press(".pin-forgot-input", "Enter");
  await page.waitForTimeout(300);
  assert.ok(!(await page.$(".guard-screen")), "틀린 답으로 열리면 안 된다");
  assert.match(await page.innerText(".pin-card"), /답이 맞지 않아요/);
  await page.close();
});

test("음성 화면에서 뒤로 가면 읽던 소리를 멈춘다", async () => {
  const { page, errors } = await openApp(browser);
  await page.click(".tab.speak");
  await page.waitForSelector(".voice-back", { timeout: 8000 });
  await page.evaluate(() => {
    window.__cancels = 0;
    const o = window.speechSynthesis.cancel.bind(window.speechSynthesis);
    window.speechSynthesis.cancel = () => { window.__cancels++; o(); };
  });
  await page.click(".voice-back");
  await page.waitForSelector(".kids-home", { timeout: 8000 });
  assert.ok(await page.evaluate(() => window.__cancels) >= 1, "나갈 때 음성 출력을 취소해야 한다");
  assert.deepEqual(errors, []);
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

// 유저 변경 시트를 열고 "새 아이 추가"를 누른다
async function tapAddKid(page) {
  await page.click(".fx-ava");
  await page.click("text=유저 변경");
  await page.waitForSelector(".kid-item.add", { timeout: 8000 });
  await page.click(".kid-item.add");
}

test("새 아이 추가: PIN이 있으면 PIN 뒤에만 된다 (하루 제한을 새 프로필로 피할 수 없다)", async () => {
  const { page } = await openApp(browser, seed({ settings: { pin: "1234", limitPerDay: 5 } }));
  await tapAddKid(page);
  await page.waitForSelector(".pin-card", { timeout: 8000 });
  assert.ok(!(await page.$(".ob")), "PIN 전에는 가입 화면이 뜨면 안 된다");

  await pinKeys(page, "9999");
  await page.waitForTimeout(500);
  assert.ok(!(await page.$(".ob")), "틀린 PIN으로는 추가되면 안 된다");

  await pinKeys(page, "1234");
  await page.waitForSelector(".ob", { timeout: 8000 });
  assert.ok(!(await page.$(".guard-screen")), "아이만 추가하고 부모 존은 열지 않는다");
  await page.close();
});

test("새 아이 추가: PIN을 정해 두지 않았다면 바로 추가된다", async () => {
  const { page } = await openApp(browser);
  await tapAddKid(page);
  await page.waitForSelector(".ob", { timeout: 8000 });
  assert.ok(!(await page.$(".pin-card")));
  await page.close();
});

test("요청이 실패하면 안내만 보이고, 실패 문구는 대화 기록에 저장되지 않는다", async () => {
  const { page } = await openApp(browser);
  const friendly = "지금 친구들이 너무 많이 놀러 왔어! 조금만 기다렸다가 다시 말해 줘.";
  await page.route("**/api/chat", (route) =>
    route.fulfill({ status: 429, contentType: "application/json", body: JSON.stringify({ error: friendly }) })
  );
  await (await page.$$(".fx-card"))[0].click();
  await page.waitForSelector(".chat-screen", { timeout: 8000 });
  await page.fill(".cx-composer input", "안녕");
  await page.press(".cx-composer input", "Enter");
  await page.waitForFunction((t) => document.body.innerText.includes(t), friendly, { timeout: 8000 });

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("banjjaktalk_v2")));
  const hist = Object.values(saved.kids.k.histories).flat();
  assert.ok(hist.some((m) => m.role === "user" && m.content === "안녕"), "보낸 말은 기록에 있다");
  assert.ok(!hist.some((m) => m.role === "assistant"), "실패 문구가 '별이가 한 말'로 저장되면 안 된다");
  await page.close();
});

// 음성 화면에서 글자 모드로 바꾼다 (헤드리스 브라우저에는 음성 인식이 없어 글로 보낸다)
async function openTextChat(page) {
  await page.click(".tab.speak");
  await page.waitForSelector('[aria-label="글자로 이야기하기"]', { timeout: 8000 });
  await page.click('[aria-label="글자로 이야기하기"]');
  await page.waitForSelector(".composer input", { timeout: 8000 });
}

test("음성 화면: 요청이 실패하면 안내만 보이고 기록에는 남지 않으며, 다시 보낼 수 있다", async () => {
  const { page } = await openApp(browser);
  const friendly = "지금 친구들이 너무 많이 놀러 왔어! 조금만 기다렸다가 다시 말해 줘.";
  await page.route("**/api/chat", (route) =>
    route.fulfill({ status: 429, contentType: "application/json", body: JSON.stringify({ error: friendly }) })
  );
  await openTextChat(page);
  await page.fill(".composer input", "안녕");
  await page.press(".composer input", "Enter");
  await page.waitForFunction((t) => document.body.innerText.includes(t), friendly, { timeout: 8000 });

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("banjjaktalk_v2")));
  const hist = Object.values(saved.kids.k.histories).flat();
  assert.ok(hist.some((m) => m.role === "user" && m.content === "안녕"), "보낸 말은 기록에 있다");
  assert.ok(!hist.some((m) => m.role === "assistant"), "실패 문구가 '별이가 한 말'로 저장되면 안 된다");
  assert.ok(await page.isEnabled(".composer input"), "실패한 뒤에도 다시 쓸 수 있어야 한다");
  await page.close();
});

test("음성 화면: 이전 답이 진행 중일 때 보낸 글은 지워지지 않고 남는다", async () => {
  const { page } = await openApp(browser);
  let release;
  const gate = new Promise((r) => { release = r; });
  let calls = 0;
  await page.route("**/api/chat", async (route) => {
    calls++;
    await gate; // 첫 요청을 붙잡아 둔다
    await route.fulfill({
      status: 200, contentType: "text/event-stream",
      body: 'data: {"text":"응!"}\n\ndata: [DONE]\n\n',
    });
  });
  await openTextChat(page);
  await page.fill(".composer input", "첫 번째");
  await page.press(".composer input", "Enter");
  await page.waitForFunction(() => true);
  await page.waitForTimeout(300);

  // 모드를 오가면 입력창은 다시 켜지지만 첫 답은 아직 진행 중이다
  await page.click(".mic-btn");
  await page.waitForSelector('[aria-label="글자로 이야기하기"]', { timeout: 8000 });
  await page.click('[aria-label="글자로 이야기하기"]');
  await page.waitForSelector(".composer input:not([disabled])", { timeout: 8000 });

  await page.fill(".composer input", "두 번째");
  await page.press(".composer input", "Enter");
  await page.waitForTimeout(300);
  assert.equal(await page.inputValue(".composer input"), "두 번째", "보내지지 않은 글을 지우면 안 된다");
  assert.equal(calls, 1, "진행 중에는 두 번째 요청이 나가지 않는다");

  release();
  await page.waitForTimeout(500);
  await page.close();
});
