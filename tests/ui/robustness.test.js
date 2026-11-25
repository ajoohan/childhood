// 2026-11-25 전수 점검에서 고친 것들: 채팅 화면 멈춤, 말하기 화면(소리·마이크·깨어나는 중), 꾸미기 축하,
// 두 번째 창의 하루 제한 우회, PIN 재설정 경고, 새 아이 추가 취소, 기록 지우기, 그림 만들기 안전 알림.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, launchBrowser, openApp, seed, pinKeys, BASE } from "./helpers.js";

let server, browser;
before(async () => { server = await startServer(); browser = await launchBrowser(); });
after(async () => { await browser?.close(); server?.kill(); });

const sseBody = (text) => `data: ${JSON.stringify({ text })}\n\ndata: [DONE]\n\n`;
const replyWith = (page, text) =>
  page.route("**/api/chat", (r) => r.fulfill({ status: 200, contentType: "text/event-stream", body: sseBody(text) }));

test("채팅: 별이 그림이 안 불러와져도, 기록이 40개를 넘어 밀릴 때 앱이 멈추지 않는다", async () => {
  const hist = [];
  for (let i = 0; i < 40; i++)
    hist.push(i % 2 === 0 ? { role: "user", content: "질문 " + i, t: new Date().toISOString() } : { role: "assistant", content: "답 " + i });
  const state = seed();
  state.kids.k.histories = { learn_ask: hist };
  const { page, errors } = await openApp(browser, state, {
    beforeLoad: async (p) => {
      await p.route("**/img/chat-ai.png", (r) => r.fulfill({ status: 404, body: "" }));
      await replyWith(p, "새 답");
    },
  });
  await page.click(".fx-cai");
  await page.waitForSelector(".chat-screen", { timeout: 8000 });
  await page.waitForTimeout(500);
  for (const t of ["또 질문", "하나 더"]) {
    await page.fill(".cx-composer input", t);
    await page.press(".cx-composer input", "Enter");
    await page.waitForFunction(() => !document.querySelector(".bubble.typing"), null, { timeout: 8000 });
    await page.waitForTimeout(300);
  }
  assert.ok(await page.$(".chat-screen"), "채팅 화면이 오류 화면으로 바뀌었다");
  assert.equal(errors.filter((e) => /removeChild|NotFoundError/.test(e)).length, 0, errors.join("\n"));
  await page.close();
});

test("꾸미기: 완성 연출 중 다른 테마 탭을 눌러도 축하 화면은 방금 완성한 테마를 보여 준다", async () => {
  const state = seed();
  state.kids.k.decor = { theme: "room", placed: { room: { bed: 0, lamp: 0, plant: 0, toy: 0, window: 0 } }, completed: [] };
  const { page } = await openApp(browser, state);
  await page.click(".tab:nth-child(4)");
  await page.waitForSelector(".place-scene-wrap", { timeout: 8000 });
  await (await page.$$(".place-scene-wrap"))[0].click();
  await page.waitForSelector(".decor-finish", { timeout: 8000 });
  await page.click(".decor-finish");
  await page.waitForTimeout(200);
  await (await page.$$(".decor-tab"))[1].click(); // 연출(1.1초) 사이에 열린 다음 테마
  await page.waitForSelector(".celebrate", { timeout: 4000 });
  const text = await page.innerText(".celebrate");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("banjjaktalk_v2")).kids.k);
  assert.deepEqual(saved.decor.completed, ["room"]);
  assert.match(text, /방/, text);
  assert.doesNotMatch(text, /우주선/, "다른 테마로 축하했다");
  assert.match(text, new RegExp(`별 ${27 - saved.rewards.balance}개`), "실제로 쓴 별 수와 다르다");
  const objs = await page.$$eval(".celebrate-objs span", (els) => els.map((e) => e.textContent.trim()));
  assert.ok(objs.length > 0 && objs.every(Boolean), `완성한 방의 물건이 비어 있다: ${JSON.stringify(objs)}`);
  await page.close();
});

// 말하기 화면: 브라우저 음성 인식·읽어 주기를 가짜로 바꾼다
async function fakeSpeech(p) {
  await p.addInitScript(() => {
    class FakeSR { start() { window.__sr = this; } stop() { this.onend && this.onend(); } abort() {} }
    window.webkitSpeechRecognition = FakeSR;
    window.SpeechRecognition = FakeSR;
    window.__spoken = [];
    const synth = { speak: (u) => window.__spoken.push(u.text), cancel: () => {}, speaking: false, getVoices: () => [] };
    Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
    window.__say = (t) => window.__sr.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: t }], { isFinal: true })] });
  });
}

test("말하기: 답을 기다리는 사이 소리를 끄면 답을 읽어 주지 않는다", async () => {
  let release;
  const gate = new Promise((r) => (release = r));
  const { page } = await openApp(browser, seed(), {
    beforeLoad: async (p) => {
      await fakeSpeech(p);
      await p.route("**/api/chat", async (r) => {
        await gate;
        await r.fulfill({ status: 200, contentType: "text/event-stream", body: sseBody("답이에요") }).catch(() => {});
      });
    },
  });
  await page.click(".tab.speak");
  await page.waitForSelector(".call-btn.mic", { timeout: 8000 });
  await page.click(".call-btn.mic");
  await page.evaluate(() => window.__say("공룡 얘기 해줘"));
  await page.waitForTimeout(300);
  await page.click('[aria-label="소리 끄기"]');
  release();
  await page.waitForFunction(() => document.body.innerText.includes("답이에요"), null, { timeout: 8000 });
  await page.waitForTimeout(300);
  assert.deepEqual(await page.evaluate(() => window.__spoken), [], "소리를 껐는데 읽었다");
  await page.close();
});

test("말하기: 서버가 깨어나는 중(활동 목록 없음)에 한 말은 조용히 버리지 않고 알려 준다", async () => {
  const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
  await page.addInitScript((s) => localStorage.setItem("banjjaktalk_v2", JSON.stringify(s)), seed());
  await fakeSpeech(page);
  await page.route("**/api/activities", () => {}); // 대답하지 않는다(깨어나는 중)
  await page.goto(BASE + "/");
  const start = await page.waitForSelector(".splash-primary", { timeout: 8000 }).catch(() => null);
  if (start) await start.click();
  await page.waitForSelector(".kids-home", { timeout: 10000 });
  await page.click(".tab.speak");
  await page.waitForSelector(".call-btn.mic", { timeout: 8000 });
  await page.click(".call-btn.mic");
  await page.evaluate(() => window.__say("안녕 별이야"));
  await page.waitForFunction(() => document.body.innerText.includes("깨어나는 중"), null, { timeout: 4000 });
  await page.close();
});

test("말하기: 녹음 중에 글자 모드로 바꾸면 마이크가 꺼진다", async () => {
  const ctx = await browser.newContext({ viewport: { width: 402, height: 874 } });
  const page = await ctx.newPage();
  await page.addInitScript((s) => {
    if (!localStorage.getItem("banjjaktalk_v2")) localStorage.setItem("banjjaktalk_v2", JSON.stringify(s));
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
    // 가짜 마이크: 트랙 상태만 흉내 낸다
    window.__tracks = [];
    navigator.mediaDevices.getUserMedia = async () => {
      const t = { readyState: "live", stop() { this.readyState = "ended"; } };
      window.__tracks.push(t);
      return { getTracks: () => [t] };
    };
    window.MediaRecorder = class {
      constructor() { this.state = "inactive"; this.mimeType = "audio/webm"; }
      start() { this.state = "recording"; }
      stop() { this.state = "inactive"; setTimeout(() => this.onstop && this.onstop(), 0); }
    };
  }, seed());
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const start = await page.$(".splash-primary");
  if (start) await start.click();
  await page.waitForSelector(".kids-home", { timeout: 10000 });
  let transcribes = 0;
  await page.route("**/api/transcribe", (r) => { transcribes++; r.fulfill({ status: 200, contentType: "application/json", body: '{"text":"버린 녹음"}' }); });
  await page.click(".tab.speak");
  await page.waitForSelector('[aria-label="녹음해서 말하기"]', { timeout: 8000 });
  await page.click('[aria-label="녹음해서 말하기"]');
  await page.waitForFunction(() => window.__tracks.length === 1 && window.__tracks[0].readyState === "live", null, { timeout: 4000 });
  await page.click('[aria-label="글자로 이야기하기"]');
  await page.waitForFunction(() => window.__tracks[0].readyState === "ended", null, { timeout: 4000 });
  await page.waitForTimeout(300);
  assert.equal(transcribes, 0, "모드를 바꿔 버린 녹음을 받아쓰기로 보냈다");
  await ctx.close();
});

test("두 번째 창: 다른 창에서 하루 제한을 다 쓰면 이 창도 새로 읽어 더 보내지 못한다", async () => {
  const ctx = await browser.newContext({ viewport: { width: 402, height: 874 } });
  await ctx.addInitScript((s) => {
    if (!localStorage.getItem("banjjaktalk_v2")) localStorage.setItem("banjjaktalk_v2", JSON.stringify(s));
  }, seed({ settings: { limitPerDay: 2 } }));
  await ctx.route("**/api/chat", (r) => r.fulfill({ status: 200, contentType: "text/event-stream", body: sseBody("응!") }));
  const open = async (p) => {
    const st = await p.$(".splash-primary");
    if (st) await st.click();
    await p.waitForSelector(".kids-home", { timeout: 10000 });
    await p.click(".fx-cai");
    await p.waitForSelector(".chat-screen", { timeout: 8000 });
  };
  const a = await ctx.newPage();
  await a.goto(BASE + "/", { waitUntil: "networkidle" });
  await open(a);
  const b = await ctx.newPage();
  let bLoads = 0;
  b.on("load", () => bLoads++);
  await b.goto(BASE + "/", { waitUntil: "networkidle" });
  await open(b);

  const send = async (p, t) => {
    await p.fill(".cx-composer input", t);
    await p.press(".cx-composer input", "Enter");
    await p.waitForTimeout(700);
  };
  await send(a, "하나");
  await send(a, "둘");
  await a.waitForFunction(() => !document.querySelector(".bubble.typing"), null, { timeout: 8000 });
  // A가 저장할 때마다 B는 새로 읽는다(아이 말·답이 따로 저장되면 여러 번). 더 이상 새로 읽지 않을 때까지 기다린다.
  let last = -1;
  for (let i = 0; i < 40 && bLoads !== last; i++) {
    last = bLoads;
    await b.waitForTimeout(800);
  }
  assert.ok(bLoads >= 2, `B가 새로 읽지 않았다 (load ${bLoads}번)`);
  await b.waitForLoadState("networkidle");
  await open(b);
  await send(b, "셋");
  assert.match(await b.innerText(".chat"), /오늘은 이야기를 2번/, "다른 창에서 제한을 다 썼는데 더 보낼 수 있다");
  const saved = await b.evaluate(() => JSON.parse(localStorage.getItem("banjjaktalk_v2")).kids.k.rewards.msgsToday);
  assert.equal(saved, 2);
  await ctx.close();
});

// 화면에 나온 "a×b+c" 문제의 답
async function solveChallenge(page) {
  const [, a, b, c] = (await page.innerText(".gate-q")).match(/(\d+)\s*[×x*]\s*(\d+)\s*\+\s*(\d+)/);
  return String(Number(a) * Number(b) + Number(c));
}

test("PIN 재설정 경고: 계산 문제로 연 그 자리에서는 설정으로 PIN을 바꾸거나 풀어도 경고가 남는다", async () => {
  const { page } = await openApp(browser, seed({ settings: { pin: "1234" } }));
  await page.click(".tab >> text=부모");
  await page.waitForSelector(".pin-card", { timeout: 8000 });
  await page.click("text=PIN을 잊으셨나요?");
  await page.waitForSelector(".gate-q", { timeout: 8000 });
  await page.fill(".pin-forgot-input", await solveChallenge(page));
  await page.click("#gateOk");
  await pinKeys(page, "7777");
  await pinKeys(page, "7777");
  await page.waitForSelector(".pin-alert", { timeout: 8000 });

  await page.click('[aria-label="설정"]');
  await page.click("text=비밀번호 변경");
  const boxes = await page.$$(".set-pin-edit input");
  await boxes[0].fill("2468");
  await boxes[1].fill("2468");
  await page.click(".set-pin-edit >> text=저장");
  page.once("dialog", (d) => d.accept());
  await page.click("text=잠금 해제");
  await page.waitForTimeout(300);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("banjjaktalk_v2")).settings);
  assert.ok(saved.pinResetAt, "계산 문제로 연 사람이 경고를 지웠다");
  await page.click(".back-btn");
  await page.waitForSelector(".pin-alert", { timeout: 8000 });
  await page.close();
});

test("새 아이 추가를 취소하면 추가를 시작한 아이(먼저 만든 아이가 아니어도)로 돌아간다", async () => {
  const state = seed({ settings: { pin: "1234" } });
  state.kids.k2 = JSON.parse(JSON.stringify(state.kids.k));
  state.kids.k2.profile.name = "서아";
  state.activeKid = "k2"; // 두 번째로 만든 아이가 지금 아이
  const { page } = await openApp(browser, state);
  await page.click(".fx-ava");
  await page.click("text=프로필 바꾸기");
  await page.waitForSelector(".kid-item.add", { timeout: 8000 });
  await page.click(".kid-item.add");
  await pinKeys(page, "1234");
  await page.waitForSelector(".ob", { timeout: 8000 });
  // 새로고침해도 돌아갈 아이를 기억한다
  await page.reload({ waitUntil: "networkidle" });
  const start = await page.$(".splash-primary");
  if (start) await start.click();
  await page.waitForSelector(".ob", { timeout: 8000 });
  await page.click(".ob-back");
  await page.waitForSelector(".kids-home", { timeout: 10000 });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("banjjaktalk_v2")));
  assert.equal(saved.activeKid, "k2", "추가를 시작한 아이가 아닌 다른 아이로 돌아갔다");
  assert.deepEqual(Object.keys(saved.kids).sort(), ["k", "k2"], "빈 프로필이 남았다");
  await page.close();
});

test("이 아이의 기록 지우기는 하루 대화 횟수 제한(모든 아이 공통)을 풀지 않는다", async () => {
  const { page } = await openApp(browser, seed({ settings: { pin: "1234", limitPerDay: 10 } }));
  await page.click(".tab >> text=부모");
  await pinKeys(page, "1234");
  await page.waitForSelector(".guard-screen", { timeout: 8000 });
  await page.click('[aria-label="설정"]');
  let asked = "";
  page.once("dialog", (d) => { asked = d.message(); d.accept(); });
  await page.click("text=이 아이의 기록 지우기");
  await page.waitForTimeout(300);
  assert.doesNotMatch(asked, /제한을 지울까요/);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("banjjaktalk_v2")).settings);
  assert.equal(saved.limitPerDay, 10);
  await page.close();
});

test("그림 만들기: 서버가 안전 신호를 주면 부모 화면 안전 알림에 남는다", async () => {
  const { page } = await openApp(browser, seed(), {
    beforeLoad: async (p) => {
      await p.route("**/api/activities", async (route) => {
        const res = await route.fetch();
        const json = await res.json();
        json.features = { ...(json.features || {}), image: true };
        await route.fulfill({ response: res, json });
      });
      await p.route("**/api/image", (r) =>
        r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ safety: "distress", error: "그건 그릴 수 없어." }) })
      );
    },
  });
  await page.click('[aria-label="프로필 메뉴"]');
  await page.click(".hd-menu-label >> text=그림 만들기");
  await page.waitForSelector(".imgmaker input", { timeout: 8000 });
  await page.fill(".imgmaker input", "슬픈 그림");
  await page.press(".imgmaker input", "Enter");
  await page.waitForFunction(() => document.body.innerText.includes("그릴 수 없어"), null, { timeout: 8000 });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("banjjaktalk_v2")).kids.k.safety);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].category, "distress");
  await page.close();
});
