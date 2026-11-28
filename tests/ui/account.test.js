// 부모 계정 화면: 로그인 코드, 동의 기록, 저장·불러오기·충돌·삭제. 가짜 Supabase를 쓴다(fakeSupabase.js).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, launchBrowser, openApp, seed, pinKeys, BASE } from "./helpers.js";
import { installFakeSupabase, newFakeDb, GOOD_CODE } from "./fakeSupabase.js";

let server, browser;
before(async () => { server = await startServer(); browser = await launchBrowser(); });
after(async () => { await browser?.close(); server?.kill(); });

const EMAIL = "parent@example.com";

// 가짜를 붙인 채 홈까지 열고, 부모 화면(PIN 통과)으로 들어간다
async function openParent({ db = newFakeDb(), state = seed({ settings: { pin: "1234" } }), accounts = true } = {}) {
  const { page, errors } = await openApp(browser, state, {
    beforeLoad: (p) => installFakeSupabase(p, db, { accounts }),
  });
  await page.click(".tab >> text=부모");
  await pinKeys(page, "1234");
  await page.waitForSelector(".guard-screen", { timeout: 8000 });
  return { page, db, errors };
}

async function login(page) {
  await page.waitForSelector(".acct-card input[type=email]", { timeout: 15000 });
  await page.fill(".acct-card input[type=email]", EMAIL);
  for (const box of await page.$$(".acct-consent input[type=checkbox]")) await box.check();
  await page.click("text=로그인 코드 받기");
  await page.waitForSelector(".acct-card input[inputmode=numeric]", { timeout: 8000 });
  await page.fill(".acct-card input[inputmode=numeric]", GOOD_CODE);
  await page.click(".acct-card >> text=확인");
  await page.waitForSelector("text=로그인했어요", { timeout: 8000 });
}

test("계정 기능이 꺼져 있으면(서버에 설정 없음) 부모 화면에 계정 카드가 없다", async () => {
  const { page } = await openParent({ accounts: false });
  assert.equal(await page.$(".acct-card"), null);
  await page.close();
});

test("로그인: 이메일과 세 가지 동의가 모두 있어야 코드를 받을 수 있다", async () => {
  const { page, db } = await openParent();
  await page.waitForSelector(".acct-card input[type=email]", { timeout: 15000 });
  const send = page.locator(".acct-card >> text=로그인 코드 받기");
  assert.equal(await send.isDisabled(), true, "아무것도 없으면 막힌다");

  await page.fill(".acct-card input[type=email]", "이메일아님");
  for (const box of await page.$$(".acct-consent input[type=checkbox]")) await box.check();
  assert.equal(await send.isDisabled(), true, "이메일 모양이 아니면 막힌다");

  await page.fill(".acct-card input[type=email]", EMAIL);
  const boxes = await page.$$(".acct-consent input[type=checkbox]");
  await boxes[1].uncheck();
  assert.equal(await send.isDisabled(), true, "동의 하나라도 빠지면 막힌다");
  await boxes[1].check();
  assert.equal(await send.isDisabled(), false);
  assert.equal(db.codesSent, 0, "버튼을 누르기 전에는 메일 요청이 없다");

  // 동의 문서는 펼쳐서 읽을 수 있고, 초안임을 밝힌다
  await page.click(".acct-more >> nth=0");
  assert.match(await page.innerText(".acct-doc"), /초안/);
  await page.close();
});

test("로그인: 틀린 코드는 안내하고, 맞는 코드면 동의 3건이 기록되고 로그인된다", async () => {
  const { page, db } = await openParent();
  await page.waitForSelector(".acct-card input[type=email]", { timeout: 15000 });
  await page.fill(".acct-card input[type=email]", EMAIL);
  for (const box of await page.$$(".acct-consent input[type=checkbox]")) await box.check();
  await page.click("text=로그인 코드 받기");
  await page.waitForSelector(".acct-card input[inputmode=numeric]", { timeout: 8000 });
  assert.equal(db.email, EMAIL);

  await page.fill(".acct-card input[inputmode=numeric]", "000000");
  await page.click(".acct-card >> text=확인");
  await page.waitForSelector(".acct-card .gate-error", { timeout: 8000 });
  assert.match(await page.innerText(".acct-card .gate-error"), /코드가 맞지 않거나/);
  assert.equal(db.consents.length, 0, "로그인 전에는 동의 기록이 없다");

  await page.fill(".acct-card input[inputmode=numeric]", GOOD_CODE);
  await page.click(".acct-card >> text=확인");
  await page.waitForSelector(".acct-card .set-info-row >> text=계정에 저장된 기록", { timeout: 8000 }); // 로그인된 화면
  assert.deepEqual(db.consents.map((c) => c.document).sort(), ["overseas_transfer", "privacy", "terms"]);
  assert.ok(db.consents.every((c) => c.version === "2026-11-draft"));
  await page.close();
});

test("저장: 아이 프로필·별은 올라가고, 대화 기록·안전 알림·PIN은 올라가지 않는다", async () => {
  const state = seed({ settings: { pin: "1234" }, rewards: { balance: 27 } });
  state.kids.k.histories = { story_listen: [{ role: "user", content: "비밀 이야기", t: "2026-11-01T00:00:00Z" }] };
  state.kids.k.safety = [{ t: "2026-11-01T00:00:00Z", category: "distress", activityId: "x", text: "아이가 한 말" }];
  const { page, db } = await openParent({ state });
  await login(page);
  await page.waitForSelector("text=아직 없어요", { timeout: 8000 });

  await page.click("text=이 기기 기록을 계정에 저장");
  await page.waitForSelector("text=계정에 저장했어요", { timeout: 8000 });
  assert.equal(db.state.rev, 1);
  const uploaded = JSON.stringify(db.state.data);
  assert.ok(uploaded.includes("지안") && uploaded.includes('"balance":27'));
  assert.ok(!uploaded.includes("비밀 이야기"), "대화 내용이 올라갔다");
  assert.ok(!uploaded.includes("아이가 한 말"), "안전 알림의 아이 말이 올라갔다");
  assert.ok(!uploaded.includes("1234"), "PIN이 올라갔다");
  assert.ok(db.authHeaders.every((h) => h && h.startsWith("Bearer ")), "모든 데이터 요청에 로그인 토큰이 붙는다");
  await page.waitForSelector("text=아이 1명", { timeout: 8000 });
  assert.equal(await page.$(".acct-dirty"), null, "방금 저장했으니 저장하지 않은 변경은 없다");
  await page.close();
});

test("불러오기: 새 기기에서 계정의 기록으로 바뀌고, 이 기기의 PIN과 대화 기록은 남는다", async () => {
  // 다른 기기에서 별 99개로 저장해 둔 계정
  const old = seed({ rewards: { balance: 99 } });
  const remoteData = {
    v: 1, activeKid: "k",
    settings: { limitPerDay: 4, voice: "shimmer", sound: true, notifyMissions: true },
    kids: { k: { profile: { ...old.kids.k.profile, name: "서아" }, rewards: old.kids.k.rewards, parentMissions: [], decor: old.kids.k.decor, badges: [], stickers: {} } },
  };
  const db = newFakeDb({ state: { rev: 3, data: remoteData, updated_at: "2026-11-18T10:00:00Z" } });

  // 새 기기: 별 5개, 같은 아이 id의 대화 기록이 있고 PIN은 1234
  const local = seed({ settings: { pin: "1234" }, rewards: { balance: 5 } });
  local.kids.k.histories = { story_listen: [{ role: "user", content: "이 기기의 대화", t: "2026-11-01T00:00:00Z" }] };
  const { page } = await openParent({ db, state: local });
  await login(page);
  await page.waitForSelector("text=아이 1명", { timeout: 8000 });

  page.once("dialog", (d) => d.accept());
  await page.click("text=계정에서 불러오기");
  await page.waitForLoadState("networkidle"); // 다시 불러온 뒤 시작 화면 → 홈
  const start = await page.waitForSelector(".splash-primary, .kids-home", { timeout: 15000 });
  if (await start.evaluate((el) => el.classList.contains("splash-primary"))) await start.click();
  await page.waitForSelector(".kids-home", { timeout: 15000 });
  assert.equal((await page.innerText(".fx-star-pill")).trim(), "99");
  assert.match(await page.innerText(".fx-hi"), /서아/);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("banjjaktalk_v2")));
  assert.equal(saved.settings.pin, "1234", "기기의 PIN 유지");
  assert.equal(saved.settings.limitPerDay, 4, "계정의 하루 횟수 설정이 적용된다");
  assert.equal(saved.kids.k.histories.story_listen[0].content, "이 기기의 대화", "기기의 대화 기록 유지");
  await page.close();
});

test("불러오기: 취소하면 아무것도 바뀌지 않는다", async () => {
  const remoteData = { v: 1, activeKid: "k", settings: {}, kids: { k: { profile: { onboarded: true, name: "서아", age: 6 } } } };
  const db = newFakeDb({ state: { rev: 1, data: remoteData, updated_at: "2026-11-18T10:00:00Z" } });
  const { page } = await openParent({ db });
  await login(page);
  await page.waitForSelector("text=아이 1명", { timeout: 8000 });
  page.once("dialog", (d) => d.dismiss());
  await page.click("text=계정에서 불러오기");
  await page.waitForTimeout(500);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("banjjaktalk_v2")));
  assert.equal(saved.kids.k.profile.name, "지안");
  await page.close();
});

test("저장 충돌: 다른 기기가 먼저 저장했으면 덮어쓰지 않고 알리며, 덮어쓰기를 고를 수 있다", async () => {
  const remoteData = { v: 1, activeKid: "k", settings: {}, kids: { k: { profile: { onboarded: true, name: "서아", age: 6 } } } };
  const db = newFakeDb({ state: { rev: 1, data: remoteData, updated_at: "2026-11-18T10:00:00Z" } });
  const { page } = await openParent({ db });
  await login(page);
  await page.waitForSelector("text=아이 1명", { timeout: 8000 });

  // 로그인한 사이에 다른 기기가 또 저장했다
  db.state = { rev: 2, data: remoteData, updated_at: "2026-11-19T10:00:00Z" };
  await page.click("text=이 기기 기록을 계정에 저장");
  await page.waitForSelector(".acct-card .gate-error", { timeout: 8000 });
  assert.match(await page.innerText(".acct-card .gate-error"), /다른 기기에서 더 최근에 저장/);
  assert.equal(db.state.rev, 2, "충돌인데 덮어썼다");
  assert.equal(db.state.data.kids.k.profile.name, "서아");

  await page.click("text=이 기기 기록으로 덮어쓰기");
  await page.waitForSelector("text=계정에 저장했어요", { timeout: 8000 });
  assert.equal(db.state.rev, 3);
  assert.equal(db.state.data.kids.k.profile.name, "지안");
  assert.equal(await page.$("text=이 기기 기록으로 덮어쓰기"), null, "저장되면 덮어쓰기 버튼이 사라진다");
  await page.close();
});

test("로그아웃은 이 기기의 기록을 그대로 두고, 새로고침해도 로그인이 유지된다", async () => {
  const { page } = await openParent();
  await login(page);
  await page.waitForSelector("text=아직 없어요", { timeout: 8000 });

  // 새로고침 뒤에도 로그인 유지 (별도 저장 키)
  await page.reload({ waitUntil: "networkidle" });
  const start = await page.$(".splash-primary");
  if (start) await start.click();
  await page.click(".tab >> text=부모");
  await pinKeys(page, "1234");
  await page.waitForSelector(".acct-card .set-info-row >> text=계정에 저장된 기록", { timeout: 15000 });

  await page.click(".acct-card >> text=로그아웃");
  await page.waitForSelector(".acct-card input[type=email]", { timeout: 8000 });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("banjjaktalk_v2")));
  assert.equal(saved.kids.k.profile.name, "지안", "로그아웃해도 기기 기록은 그대로");
  await page.close();
});

test("계정 삭제: 확인을 거쳐 서버의 모든 기록을 지우고, 이 기기의 기록은 남긴다", async () => {
  const remoteData = { v: 1, activeKid: "k", settings: {}, kids: { k: { profile: { onboarded: true, name: "서아", age: 6 } } } };
  const db = newFakeDb({ state: { rev: 1, data: remoteData, updated_at: "2026-11-18T10:00:00Z" } });
  const { page } = await openParent({ db });
  await login(page);
  await page.waitForSelector("text=아이 1명", { timeout: 8000 });

  page.once("dialog", (d) => d.dismiss());
  await page.click("text=계정과 저장된 기록 삭제");
  await page.waitForTimeout(400);
  assert.equal(db.deleted, false, "취소하면 지우지 않는다");

  page.once("dialog", (d) => d.accept());
  await page.click("text=계정과 저장된 기록 삭제");
  await page.waitForSelector("text=모두 지웠어요", { timeout: 8000 });
  assert.equal(db.deleted, true);
  assert.equal(db.state, null);
  assert.equal(db.consents.length, 0, "동의 기록도 함께 지워진다");
  await page.waitForSelector(".acct-card input[type=email]", { timeout: 8000 });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("banjjaktalk_v2")));
  assert.equal(saved.kids.k.profile.name, "지안", "기기 기록은 남는다");
  await page.close();
});

// 앱이 가려졌다가(다른 앱으로 전환) 다시 보이는 상황. 부모 화면은 다시 잠긴다.
async function hideAndShow(page) {
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForSelector(".guard-screen", { state: "detached", timeout: 4000 });
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

test("로그인: 코드를 보러 메일 앱에 다녀와도(부모 화면이 다시 잠겨도) 코드 입력에서 이어 간다", async () => {
  const { page, db } = await openParent();
  await page.waitForSelector(".acct-card input[type=email]", { timeout: 15000 });
  await page.fill(".acct-card input[type=email]", EMAIL);
  for (const box of await page.$$(".acct-consent input[type=checkbox]")) await box.check();
  await page.click("text=로그인 코드 받기");
  await page.waitForSelector(".acct-card input[inputmode=numeric]", { timeout: 8000 });

  await hideAndShow(page);
  await page.click(".tab >> text=부모");
  await pinKeys(page, "1234");
  await page.waitForSelector(".guard-screen", { timeout: 8000 });

  // 이메일·동의를 다시 하지 않고 바로 코드 입력 단계다. 메일도 다시 보내지 않았다.
  await page.waitForSelector(".acct-card input[inputmode=numeric]", { timeout: 15000 });
  assert.match(await page.innerText(".acct-card"), new RegExp(EMAIL.replace(".", "\\.")));
  assert.equal(db.codesSent, 1, "돌아왔다고 코드를 다시 보내지 않는다");
  assert.equal(await page.locator(".acct-card >> text=/다시 받기|코드 다시 받기/").isDisabled(), true, "방금 보냈으니 다시 받기는 잠시 막혀 있다");

  await page.fill(".acct-card input[inputmode=numeric]", GOOD_CODE);
  await page.click(".acct-card >> text=확인");
  await page.waitForSelector(".acct-card .set-info-row >> text=계정에 저장된 기록", { timeout: 8000 });
  assert.equal(db.consents.length, 3, "이어서 로그인해도 동의 3건이 기록된다");

  // 로그인이 끝나면 기억해 둔 코드 단계는 지운다: 로그아웃하면 처음(이메일 입력)으로 간다
  await page.click(".acct-card >> text=로그아웃");
  await page.waitForSelector(".acct-card input[type=email]", { timeout: 8000 });
  assert.equal(await page.evaluate(() => sessionStorage.getItem("childhood_acct_pending")), null);
  await page.close();
});

test("로그인: '이메일 바꾸기'를 누르면 기억해 둔 코드 단계를 버린다", async () => {
  const { page } = await openParent();
  await page.waitForSelector(".acct-card input[type=email]", { timeout: 15000 });
  await page.fill(".acct-card input[type=email]", EMAIL);
  for (const box of await page.$$(".acct-consent input[type=checkbox]")) await box.check();
  await page.click("text=로그인 코드 받기");
  await page.waitForSelector(".acct-card input[inputmode=numeric]", { timeout: 8000 });
  await page.click(".acct-card >> text=이메일 바꾸기");
  await page.waitForSelector(".acct-card input[type=email]", { timeout: 8000 });

  await hideAndShow(page);
  await page.click(".tab >> text=부모");
  await pinKeys(page, "1234");
  await page.waitForSelector(".acct-card input[type=email]", { timeout: 15000 });
  assert.equal(await page.$(".acct-card input[inputmode=numeric]"), null);
  await page.close();
});

test("저장 충돌 뒤 불러오기: 화면에 떠 있던 옛 기록이 아니라 지금 계정에 있는 기록을 불러온다", async () => {
  const kidNamed = (name) => ({ v: 1, activeKid: "k", settings: {}, kids: { k: { profile: { onboarded: true, name, age: 6 } } } });
  const db = newFakeDb({ state: { rev: 1, data: kidNamed("서아"), updated_at: "2026-11-18T10:00:00Z" } });
  const { page } = await openParent({ db });
  await login(page);
  await page.waitForSelector("text=아이 1명", { timeout: 8000 });

  // 로그인한 사이에 다른 기기가 "도윤"으로 저장했다
  db.state = { rev: 2, data: kidNamed("도윤"), updated_at: "2026-11-19T10:00:00Z" };
  await page.click("text=이 기기 기록을 계정에 저장");
  await page.waitForSelector(".acct-card .gate-error", { timeout: 8000 });
  assert.equal(
    await page.locator(".acct-card >> text=이 기기 기록을 계정에 저장").isDisabled(), true,
    "충돌 중에는 보통 저장이 막힌다(한 번 더 눌러 덮어쓰지 않게)"
  );

  let asked = "";
  page.once("dialog", (d) => { asked = d.message(); d.accept(); });
  await page.click("text=계정에서 불러오기");
  await page.waitForLoadState("networkidle");
  const start = await page.waitForSelector(".splash-primary, .kids-home", { timeout: 15000 });
  if (await start.evaluate((el) => el.classList.contains("splash-primary"))) await start.click();
  await page.waitForSelector(".kids-home", { timeout: 15000 });
  assert.match(await page.innerText(".fx-hi"), /도윤/, "최신 기록(도윤)이 아니라 옛 기록을 불러왔다");
  assert.ok(!/사라져요/.test(asked), "같은 아이(id)만 있으면 사라진다는 경고는 없다");
  assert.equal(db.state.rev, 2, "불러오기는 계정의 기록을 바꾸지 않는다");
  await page.close();
});

test("불러오기: 이 기기에만 있는 아이가 사라진다는 것을 이름과 함께 미리 알린다", async () => {
  // 계정에는 다른 id의 아이(서아)만 있다. 이 기기의 지안(id k)은 불러오면 사라진다.
  const remoteData = { v: 1, activeKid: "k2", settings: {}, kids: { k2: { profile: { onboarded: true, name: "서아", age: 6 } } } };
  const db = newFakeDb({ state: { rev: 1, data: remoteData, updated_at: "2026-11-18T10:00:00Z" } });
  const { page } = await openParent({ db });
  await login(page);
  await page.waitForSelector("text=아이 1명", { timeout: 8000 });

  let asked = "";
  page.once("dialog", (d) => { asked = d.message(); d.dismiss(); });
  await page.click("text=계정에서 불러오기");
  await page.waitForFunction(() => !document.querySelector(".acct-card .guard-btn.ghost[disabled]"), null, { timeout: 8000 });
  assert.match(asked, /지안/, "사라지는 아이의 이름을 알린다");
  assert.match(asked, /사라져요/);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("banjjaktalk_v2")));
  assert.equal(saved.kids.k.profile.name, "지안", "취소했으니 그대로");
  await page.close();
});

test("로그인된 채로 열었는데 계정 기록을 못 읽으면 '다시 확인'으로 이어 갈 수 있다", async () => {
  const { page, db } = await openParent();
  await login(page);
  await page.waitForSelector("text=아직 없어요", { timeout: 8000 });

  await page.reload({ waitUntil: "networkidle" });
  const start = await page.$(".splash-primary");
  if (start) await start.click();
  db.failState = 1; // 다음 한 번은 연결이 끊긴 것처럼
  await page.click(".tab >> text=부모");
  await pinKeys(page, "1234");
  await page.waitForSelector(".acct-card >> text=확인하지 못했어요", { timeout: 15000 });
  assert.equal(await page.locator(".acct-card >> text=이 기기 기록을 계정에 저장").isDisabled(), true);

  await page.click(".acct-card >> text=다시 확인");
  await page.waitForSelector(".acct-card >> text=아직 없어요", { timeout: 8000 });
  assert.equal(await page.$(".acct-card >> text=다시 확인"), null);
  assert.equal(await page.locator(".acct-card >> text=이 기기 기록을 계정에 저장").isDisabled(), false);
  await page.close();
});

test("메일의 링크로 들어와도 주소에 실린 로그인 정보는 지워지고 로그인되지 않는다 (코드로만 로그인)", async () => {
  const { page, db } = await openParent();
  await page.goto(BASE + "/#access_token=aaa.bbb.ccc&refresh_token=rrr&expires_in=3600&token_type=bearer&type=magiclink");
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.evaluate(() => location.hash), "", "주소에 로그인 정보가 남았다");
  const start = await page.$(".splash-primary");
  if (start) await start.click();
  await page.click(".tab >> text=부모");
  await pinKeys(page, "1234");
  await page.waitForSelector(".acct-card input[type=email]", { timeout: 15000 }); // 로그인 전 화면
  assert.equal(db.consents.length, 0);
  await page.close();
});

test("터치 영역: 동의 체크와 '내용 보기'는 세로 44px 이상 눌린다", async () => {
  const { page } = await openParent();
  await page.waitForSelector(".acct-card input[type=email]", { timeout: 15000 });
  const tall = (sel) => page.$eval(sel, (el) => el.getBoundingClientRect().height);
  assert.ok((await tall(".acct-consent label")) >= 44, "동의 줄");
  assert.ok((await tall(".acct-more")) >= 44, "내용 보기");
  assert.equal(await page.getAttribute(".acct-more", "aria-expanded"), "false");
  await page.click(".acct-more >> nth=0");
  assert.equal(await page.getAttribute(".acct-more >> nth=0", "aria-expanded"), "true");
  await page.close();
});

test("로그아웃: 서버 요청이 실패해도 이 기기에서는 로그아웃되고, 동의 칸도 비워진다", async () => {
  const { page } = await openParent();
  await login(page);
  await page.waitForSelector("text=아직 없어요", { timeout: 8000 });
  await page.route("**/auth/v1/logout**", (r) => r.abort());
  await page.click(".acct-card >> text=로그아웃");
  await page.waitForSelector(".acct-card input[type=email]", { timeout: 8000 });
  assert.deepEqual(
    await page.$$eval(".acct-consent input[type=checkbox]", (els) => els.map((e) => e.checked)),
    [false, false, false],
    "다음 사람을 위해 동의 칸을 비운다"
  );
  // 다시 열어도 로그인돼 있지 않다
  await page.reload({ waitUntil: "networkidle" });
  const start = await page.$(".splash-primary");
  if (start) await start.click();
  await page.click(".tab >> text=부모");
  await pinKeys(page, "1234");
  await page.waitForSelector(".acct-card input[type=email]", { timeout: 15000 });
  assert.equal(await page.evaluate(() => localStorage.getItem("childhood_auth")), null, "로그인 정보가 남았다");
  await page.close();
});

test("다른 탭에서 로그아웃하고 다른 계정으로 로그인하면, 이 탭에 옛 계정 화면이 남지 않는다 (엉뚱한 계정에 저장하지 않게)", async () => {
  const ctx = await browser.newContext({ viewport: { width: 402, height: 874 } });
  const db = newFakeDb();
  await ctx.addInitScript((s) => {
    if (!localStorage.getItem("banjjaktalk_v2")) localStorage.setItem("banjjaktalk_v2", JSON.stringify(s));
  }, seed({ settings: { pin: "1234" } }));
  const openTab = async () => {
    const p = await ctx.newPage();
    await installFakeSupabase(p, db);
    await p.goto(BASE + "/", { waitUntil: "networkidle" });
    const st = await p.$(".splash-primary");
    if (st) await st.click();
    await p.waitForSelector(".kids-home", { timeout: 10000 });
    await p.click(".tab >> text=부모");
    await pinKeys(p, "1234");
    await p.waitForSelector(".acct-card", { timeout: 15000 });
    return p;
  };
  const loginAs = async (p, email) => {
    await p.waitForSelector(".acct-card input[type=email]", { timeout: 15000 });
    await p.fill(".acct-card input[type=email]", email);
    for (const box of await p.$$(".acct-consent input[type=checkbox]")) await box.check();
    await p.click("text=로그인 코드 받기");
    await p.waitForSelector(".acct-card input[inputmode=numeric]", { timeout: 8000 });
    await p.fill(".acct-card input[inputmode=numeric]", GOOD_CODE);
    await p.click(".acct-card >> text=확인");
    await p.waitForSelector(`.acct-card .set-info-row >> text=${email}`, { timeout: 8000 });
  };
  const a = await openTab();
  await loginAs(a, EMAIL);
  const b = await openTab();
  await b.waitForSelector(".acct-card >> text=로그아웃", { timeout: 15000 }); // B는 A의 로그인을 이어받는다
  await b.click(".acct-card >> text=로그아웃");
  await loginAs(b, "other@example.com");
  // A는 옛 계정(parent@)을 보여 주며 새 계정의 토큰으로 저장·불러오기를 하게 두면 안 된다.
  // (B의 로그아웃이 A에도 전해져 A는 로그아웃 화면이 되거나, 새 계정으로 다시 열린다.)
  await a.waitForFunction(
    (old) => {
      const card = document.querySelector(".acct-card");
      return card && !card.innerText.includes(old);
    },
    EMAIL,
    { timeout: 10000 }
  );
  assert.equal(await a.$(".acct-card >> text=이 기기 기록을 계정에 저장"), null, "옛 계정 화면에서 저장 버튼이 남았다");
  await ctx.close();
});
