// 실제 서버를 띄워 요청 단위로 확인한다. (순수 함수 검사로는 프로세스가 죽는 문제를 못 잡는다)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";

let proc, base;
const freePort = () =>
  new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, () => { const { port } = s.address(); s.close(() => resolve(port)); });
  });

before(async () => {
  const port = await freePort();
  base = `http://localhost:${port}`;
  // 키가 없는 서버. 두 선택 기능은 꺼 둔 채로, 이미지는 켜서 입력 검증 경로까지 들어가게 한다.
  proc = spawn("node", ["server.js"], {
    env: {
      PATH: process.env.PATH, PORT: String(port), NODE_ENV: "production",
      RL_GLOBAL_PER_DAY: "5", IMAGE_API_KEY: "test-image-key-not-real", RL_PER_MIN: "100", RL_PER_DAY: "100",
      ANTHROPIC_API_KEY: "test-key-not-real",
    },
    stdio: "ignore",
  });
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(base + "/api/health")).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("서버가 뜨지 않았습니다");
});
after(() => proc?.kill());

const post = (path, body, raw) =>
  fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ?? JSON.stringify(body),
  });

test("잘못된 JSON은 HTML이 아니라 JSON 400으로 답한다", async () => {
  const r = await post("/api/chat", null, "{not json");
  assert.equal(r.status, 400);
  assert.match(r.headers.get("content-type"), /json/);
  assert.ok((await r.json()).error);
});

test("너무 큰 본문은 JSON 413으로 답한다", async () => {
  const r = await post("/api/chat", { messages: [{ role: "user", content: "가".repeat(200_000) }] });
  assert.equal(r.status, 413);
  assert.match(r.headers.get("content-type"), /json/);
});

test("없는 해시 파일(/assets/*.js)은 index.html이 아니라 404", async () => {
  const r = await fetch(base + "/assets/index-OLDHASH.js");
  assert.equal(r.status, 404);
  assert.doesNotMatch(await r.text(), /id="root"/, "index.html을 돌려줬다");
});

test("꺼진 기능으로 보낸 요청은 하루 상한을 쓰지 않는다", async () => {
  // 상한은 5. 꺼진 기능 요청을 10번 보낸 뒤에도 채팅이 상한(503)에 막히면 안 된다.
  for (let i = 0; i < 10; i++) {
    const r = await post("/api/transcribe", { audio: "AAAA" });
    assert.equal(r.status, 503);
    await r.text();
  }
  const r = await post("/api/chat", { activityId: "story_listen", messages: [{ role: "user", content: "안녕" }] });
  assert.notEqual(r.status, 503, "채팅이 하루 상한에 막혔다");
  r.body?.cancel();
});

test("그림 요청의 prompt가 객체여도 서버가 죽지 않는다", async () => {
  // {"toString":1}은 (x).toString() 호출에서 TypeError를 던져 Express 4 프로세스를 내렸다.
  const r = await post("/api/image", { prompt: { toString: 1 } });
  assert.equal(r.status, 400);
  const alive = await fetch(base + "/api/health");
  assert.equal(alive.status, 200, "서버가 죽었다");
});

test("하루 전체 상한은 거절된 요청을 세지 않고 정확히 그 수만큼 허용한다", async () => {
  // 위 테스트에서 채팅이 1번 계산됐다. 상한 5 중 채팅·그림이 2번 썼으니 남은 3번까지 허용되고 그 다음부터 503.
  const statuses = [];
  for (let i = 0; i < 6; i++) {
    const r = await post("/api/chat", { activityId: "story_listen", messages: [{ role: "user", content: "안녕" }] });
    statuses.push(r.status);
    r.body?.cancel();
  }
  assert.deepEqual(statuses, [200, 200, 200, 503, 503, 503]);
});

test("보안 헤더가 붙고 서버 종류는 알리지 않는다", async () => {
  const r = await fetch(base + "/api/health");
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.equal(r.headers.get("x-frame-options"), "DENY");
  assert.equal(r.headers.get("x-powered-by"), null);
});
