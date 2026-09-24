// UI 테스트 공용 도구: 빌드된 앱을 띄우고 브라우저로 조작한다.
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import net from "node:net";
import { existsSync } from "node:fs";

// node:test는 파일을 병렬로 돌린다. 고정 포트를 쓰면 두 파일이 같은 서버를
// 공유하다가 먼저 끝난 쪽이 종료시켜 나머지가 끊긴다. 파일마다 빈 포트를 잡는다.
function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

// startServer()가 실제 주소를 채워 넣는다 (ESM live binding).
export let BASE = "";

export async function startServer() {
  const port = await freePort();
  BASE = `http://localhost:${port}`;
  const proc = spawn("node", ["server.js"], {
    env: { ...process.env, PORT: String(port), NODE_ENV: "production" },
    stdio: "ignore",
  });
  // 응답할 때까지 기다린다 (최대 20초)
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(BASE + "/");
      if (r.ok) return proc;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  proc.kill();
  throw new Error("서버가 뜨지 않았습니다");
}

// 이 저장소의 개발 환경에는 크로미움이 미리 깔려 있지만 CI에는 없다.
// 명시 경로 → 사전 설치 경로 → Playwright 기본 해석 순으로 고른다.
export function launchBrowser() {
  const explicit = process.env.CHROMIUM_PATH;
  const preinstalled = "/opt/pw-browsers/chromium";
  const executablePath =
    explicit || (existsSync(preinstalled) ? preinstalled : undefined);
  return chromium.launch(executablePath ? { executablePath } : {});
}

const today = () => new Date().toISOString().slice(0, 10);

// 온보딩을 건너뛴 아이 한 명이 있는 저장값
export function seed(over = {}) {
  const Y = new Date().getFullYear();
  return {
    settings: { limitPerDay: null, pin: null, voice: "shimmer", sound: true, ...over.settings },
    activeKid: "k",
    kids: {
      k: {
        profile: { onboarded: true, name: "지안", age: 6, birthYear: Y - 6, birthMonth: 1,
                   avatar: "🦊", interests: ["art", "science", "animals"], plan: "free" },
        histories: {}, safety: [], notices: [],
        rewards: { day: today(), balance: 27, earnedToday: 0, attendance: false,
                   doneToday: [], allClear: false, chestOpened: false, msgsToday: 0, ...over.rewards },
        parentMissions: [], decor: { theme: "room", placed: {}, completed: [] },
        badges: [], stickers: {},
      },
    },
  };
}

// 스플래시를 지나 홈까지 온 페이지를 돌려준다. 콘솔 오류는 errors에 모인다.
export async function openApp(browser, state = seed()) {
  const page = await browser.newPage({ viewport: { width: 402, height: 874 } });
  // 앱 자체 오류만 모은다. 외부 호스트(폰트 CDN 등) 로딩 실패는 망 환경에
  // 좌우되므로 external에 따로 담고 errors에는 넣지 않는다.
  const errors = [];
  const external = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("requestfailed", (r) => {
    if (!r.url().includes("localhost")) external.push(r.url());
  });
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (/Failed to load resource/i.test(t)) return; // 위 requestfailed로 분류됨
    errors.push(t);
  });
  await page.addInitScript((s) => localStorage.setItem("banjjaktalk_v2", JSON.stringify(s)), state);
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  const start = await page.$(".splash-primary");
  if (start) await start.click();
  await page.waitForSelector(".kids-home", { timeout: 10000 });
  await page.waitForTimeout(600);
  return { page, errors, external };
}

export const pinKeys = async (page, pin) => {
  for (const d of pin) {
    for (const k of await page.$$(".pin-card .pin-key")) {
      if ((await k.innerText()).trim() === d) { await k.click(); break; }
    }
    await page.waitForTimeout(120);
  }
};
