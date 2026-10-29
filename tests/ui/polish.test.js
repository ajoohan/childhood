// UI 전수점검(2026-10-29)에서 고친 것들이 되돌아오지 않게 지킨다.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { startServer, launchBrowser, openApp } from "./helpers.js";

let server, browser;
before(async () => { server = await startServer(); browser = await launchBrowser(); });
after(async () => { await browser?.close(); server?.kill(); });

// 요소 중심에서 위아래로 21px 떨어진 곳을 눌러도 그 요소가 눌리는가 (터치 영역 44px)
const hitsAbove = (page, sel) =>
  page.$eval(sel, (el) => {
    el.scrollIntoView({ block: "center" });
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    return [-21, 21].every((dy) => {
      const hit = document.elementFromPoint(cx, cy + dy);
      return hit && (hit === el || el.contains(hit));
    });
  });

test("터치 영역: 홈 입력 바와 별 버튼은 눌리는 세로 범위가 44px 이상이다", async () => {
  const { page } = await openApp(browser);
  for (const sel of [".fx-cplus", ".fx-cmic", ".fx-cai", ".fx-star"]) {
    assert.ok(await hitsAbove(page, sel), `${sel} 터치 영역`);
  }
  await page.close();
});

test("채팅: 제목은 한국어이고 입력칸에 이름이 있으며, 낱말 중간에서 줄이 바뀌지 않는다", async () => {
  const { page } = await openApp(browser);
  await page.click(".fx-qrow >> nth=0");
  await page.waitForSelector(".cx-title");
  assert.equal((await page.innerText(".cx-title")).trim(), "별이와 대화");
  assert.ok(await page.getAttribute(".cx-composer input", "aria-label"));
  assert.equal(await page.$eval(".bubble", (b) => getComputedStyle(b).wordBreak), "keep-all");
  for (const sel of [".cx-mic", ".cx-send"]) {
    if (await page.$(sel)) assert.ok(await hitsAbove(page, sel), `${sel} 터치 영역`);
  }
  await page.close();
});

test("하단 탭: 꺼진 탭의 글자도 바탕과 4.5:1 이상 대비된다", async () => {
  const { page } = await openApp(browser);
  const ratio = await page.evaluate(() => {
    const lum = ([r, g, b]) => {
      const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const rgba = (s) => s.match(/[\d.]+/g).map(Number);
    const tab = [...document.querySelectorAll(".tab")].find((t) => !t.classList.contains("active"));
    const [r, g, b, a = 1] = rgba(getComputedStyle(tab).color);
    // 가장 밝은 쪽 바탕(그라데이션 위끝 #8B4F65)을 기준으로 최악을 본다
    const bg = [0x8b, 0x4f, 0x65];
    const fg = [r, g, b].map((v, i) => v * a + bg[i] * (1 - a));
    const [hi, lo] = [lum(fg), lum(bg)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  });
  assert.ok(ratio >= 4.5, `대비 ${ratio.toFixed(2)}`);
  await page.close();
});

test("좁은 화면(360px): 인사말이 별 알약 밑으로 잘리지 않는다", async () => {
  const { page } = await openApp(browser);
  await page.setViewportSize({ width: 360, height: 640 });
  await page.waitForTimeout(200);
  const clipped = await page.$eval(".fx-hi-2", (el) => el.scrollWidth > el.clientWidth + 1);
  assert.equal(clipped, false);
  const box = await page.$eval(".fx-hi", (e) => e.getBoundingClientRect().right);
  const star = await page.$eval(".fx-star", (e) => e.getBoundingClientRect().left);
  assert.ok(box <= star + 1, "인사말이 별 버튼을 넘지 않는다");
  await page.close();
});
