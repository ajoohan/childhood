import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, launchBrowser, openApp, seed, BASE } from "./helpers.js";

let server, browser;
before(async () => { server = await startServer(); browser = await launchBrowser(); });
after(async () => { await browser?.close(); server?.kill(); });

test("홈: 시안의 주요 요소가 모두 그려진다", async () => {
  const { page, errors } = await openApp(browser);
  const has = async (sel) => (await page.$(sel)) !== null;

  assert.ok(await has(".fx-hd"), "헤더");
  assert.ok(await has(".fx-premium"), "프리미엄 배너");
  assert.equal((await page.$$(".fx-tile")).length, 2, "큰 타일 2개");
  assert.ok(await has(".fx-composer"), "하단 입력 바");
  assert.ok((await page.$$(".fx-card")).length > 0, "활동 카드");
  assert.ok((await page.$$(".fx-qrow")).length > 0, "바로가기 리스트");

  assert.match(await page.innerText(".fx-hi"), /지안/, "아이 이름이 인사말에 나온다");
  assert.equal((await page.innerText(".fx-star-pill")).trim(), "27", "별 잔액");
  assert.deepEqual(errors, [], "콘솔 오류 없음");
  await page.close();
});

test("탭: 다섯 개가 순서대로 있고 각 화면이 열린다", async () => {
  const { page, errors } = await openApp(browser);
  const labels = await page.$$eval(".tab-bar .tab", (ts) =>
    ts.map((t) => t.textContent.trim()));
  assert.deepEqual(labels, ["홈", "미션", "말하기", "콜렉션", "부모"]);

  const screens = [null, ".missions", ".voice-mode", ".colhub"];
  for (let i = 1; i < screens.length; i++) {
    const { page: p } = await openApp(browser);
    await (await p.$$(".tab-bar .tab"))[i].click();
    await p.waitForSelector(screens[i], { timeout: 8000 });
    assert.ok(await p.$(screens[i]), `${labels[i]} 화면`);
    await p.close();
  }
  assert.deepEqual(errors, []);
  await page.close();
});

test("활동 카드를 누르면 채팅 화면이 열린다", async () => {
  const { page, errors } = await openApp(browser);
  await (await page.$$(".fx-card"))[0].click();
  await page.waitForSelector(".chat-screen", { timeout: 8000 });
  assert.ok(await page.$(".cx-hd"), "채팅 헤더");
  assert.ok(await page.$(".cx-composer"), "채팅 입력 바");
  assert.match(await page.innerText(".cx-title"), /Kids AI 채팅/);
  assert.deepEqual(errors, []);
  await page.close();
});

test("에셋: 홈의 이미지가 실제로 로드된다 (깨진 링크 없음)", async () => {
  const { page } = await openApp(browser);
  const broken = await page.$$eval("img", (imgs) =>
    imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute("src")));
  assert.deepEqual(broken, [], "naturalWidth=0 인 이미지가 없어야 한다");
  await page.close();
});

test("OG 이미지와 메타 태그가 제공된다", async () => {
  const r = await fetch(BASE + "/og.png");
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type"), /image\/png/);
  const html = await (await fetch(BASE + "/")).text();
  for (const tag of ["og:title", "og:image", "og:url", "twitter:card"]) {
    assert.ok(html.includes(tag), `${tag} 누락`);
  }
});
