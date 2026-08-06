import { chromium } from 'playwright';
const Y = new Date().getFullYear();
const today = new Date().toISOString().slice(0,10);
const v2 = {
  settings: { limitPerDay: null, pin: null, voice: "shimmer", sound: true },
  activeKid: "k_aaa",
  kids: { k_aaa: {
    profile: { onboarded: true, name: "지안", age: 6, birthYear: Y-6, birthMonth: 1, avatar: "🦊", interests: ["art","animals","science"], plan: "free" },
    histories: {}, safety: [], notices: [],
    rewards: { day: today, balance: 27, earnedToday: 0, attendance:false, doneToday:[], allClear:false, chestOpened:false },
    parentMissions: [], decor: { theme:"room", placed:{}, completed:[] }, badges: [], stickers: {},
  }},
};
const dir = "/tmp/claude-0/-home-user-childhood/5cace64c-ecf2-52eb-845f-e8ae8d706df3/scratchpad/";
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
page.on("pageerror", e => console.log("PAGEERROR:", String(e).slice(0,160)));
await page.addInitScript((s) => { localStorage.setItem("banjjaktalk_v2", JSON.stringify(s)); }, v2);
const fixed = new Date(); fixed.setHours(10,0,0,0);
await page.clock.setFixedTime(fixed);
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.waitForTimeout(700);
const b = await page.$(".splash-primary"); if (b) { await b.click(); }
await page.waitForTimeout(2600);
await page.screenshot({ path: dir + "f_fallback.png" });
console.log("done");
await browser.close();
