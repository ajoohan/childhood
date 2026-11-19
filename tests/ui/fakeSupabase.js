// 화면 테스트용 가짜 Supabase. 실제 서버·메일 없이 로그인 코드, 동의 기록, 스냅샷 저장·불러오기·삭제 흐름을 확인한다.
// (메일이 실제로 오는지는 이 테스트로 알 수 없다 — 프로젝트를 만든 뒤 사람이 한 번 확인해야 한다.)
export const FAKE_URL = "https://testproj.supabase.co";
export const FAKE_KEY = "sb_publishable_test1234567890";
export const GOOD_CODE = "123456";

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Expose-Headers": "*",
};

export function newFakeDb(over = {}) {
  return {
    email: null, // 로그인 코드를 받은 이메일
    codesSent: 0,
    consents: [], // { document, version }
    state: null, // { rev, data, updated_at }
    deleted: false,
    saves: [], // 저장 요청 기록 { expected_rev, new_data }
    authHeaders: [],
    failState: 0, // 이 횟수만큼 account_state 읽기를 실패시킨다(연결 끊김 흉내)
    ...over,
  };
}

// page에 가짜를 연결한다. db는 테스트가 들여다보고 미리 채울 수 있다.
export async function installFakeSupabase(page, db, { accounts = true } = {}) {
  // 서버가 계정 설정을 내려주는 것처럼 /api/activities 응답에 끼워 넣는다
  await page.route("**/api/activities", async (route) => {
    const res = await route.fetch();
    const json = await res.json();
    json.features = { ...(json.features || {}), accounts: accounts ? { url: FAKE_URL, key: FAKE_KEY } : null };
    await route.fulfill({ response: res, json });
  });

  await page.route(`${FAKE_URL}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const send = (status, body, headers = {}) =>
      route.fulfill({
        status,
        headers: { ...CORS, "Content-Type": "application/json", ...headers },
        body: body === undefined ? "" : JSON.stringify(body),
      });

    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    const auth = req.headers()["authorization"];
    if (path.startsWith("/rest/")) db.authHeaders.push(auth || null);
    let body = {};
    try {
      body = req.postDataJSON() || {};
    } catch {}

    const user = () => ({
      id: "u-1", aud: "authenticated", role: "authenticated", email: db.email,
      app_metadata: {}, user_metadata: {}, created_at: "2026-11-19T00:00:00Z",
    });

    // ── 인증 ──
    if (path === "/auth/v1/otp") {
      db.email = body.email;
      db.codesSent += 1;
      return send(200, {});
    }
    if (path === "/auth/v1/verify") {
      if (body.token !== GOOD_CODE) return send(403, { code: 403, error_code: "otp_expired", msg: "Token has expired or is invalid" });
      const now = Math.floor(Date.now() / 1000);
      const jwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: "u-1", role: "authenticated", exp: now + 3600 })}.sig`;
      return send(200, { access_token: jwt, token_type: "bearer", expires_in: 3600, expires_at: now + 3600, refresh_token: "r-1", user: user() });
    }
    if (path === "/auth/v1/user") return send(200, user());
    if (path === "/auth/v1/logout") return route.fulfill({ status: 204, headers: CORS });

    // ── 데이터 ──
    if (path === "/rest/v1/consents") {
      if (req.method() === "GET") return send(200, db.consents);
      if (req.method() === "POST") {
        db.consents.push(...(Array.isArray(body) ? body : [body]));
        return route.fulfill({ status: 201, headers: CORS });
      }
    }
    if (path === "/rest/v1/account_state" && req.method() === "GET") {
      if (db.failState > 0) {
        db.failState -= 1;
        return send(500, { code: "XX000", message: "temporarily unavailable", details: null, hint: null });
      }
      const single = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
      if (single) {
        if (!db.state) return send(406, { code: "PGRST116", details: "The result contains 0 rows", hint: null, message: "JSON object requested, multiple (or no) rows returned" });
        return send(200, db.state);
      }
      return send(200, db.state ? [db.state] : []);
    }
    if (path === "/rest/v1/rpc/save_account_state") {
      db.saves.push(body);
      const cur = db.state ? db.state.rev : 0;
      if (body.expected_rev !== cur) return send(409, { code: "40001", message: "conflict", details: null, hint: null });
      db.state = { rev: cur + 1, data: body.new_data, updated_at: new Date().toISOString() };
      return send(200, cur + 1);
    }
    if (path === "/rest/v1/rpc/delete_my_account") {
      db.deleted = true;
      db.state = null;
      db.consents = [];
      return route.fulfill({ status: 204, headers: CORS });
    }
    return send(404, { message: `unhandled ${req.method()} ${path}` });
  });
}
