// 부모 계정(Supabase) 얇은 래퍼. 계정 기능이 꺼져 있으면(서버에 SUPABASE_* 설정 없음) 이 파일은 불러오지도 않는다.
// supabase-js는 무거워서 계정 화면을 열 때 처음 불러온다(동적 import).
//
// 로그인은 비밀번호 없이 이메일로 받은 6자리 코드(또는 메일 속 링크)로 한다.
// 코드 입력을 기본으로 쓰는 이유: 메일 앱 안의 브라우저에서 링크를 열면 요청한 브라우저와 달라 로그인이 이어지지 않는 일이 흔하다.

// 동의 문서의 버전. 문구를 바꾸면 버전도 올려서, 이전에 동의한 사람에게 다시 받게 한다.
// "draft": 법률 검토 전의 초안이다. 정식 서비스 전에 전문가 검토를 거친 문구와 버전으로 바꾼다.
export const CONSENT_VERSION = "2026-11-draft";
export const CONSENT_DOCS = ["terms", "privacy", "overseas_transfer"];

export class ConflictError extends Error {
  constructor() {
    super("conflict");
    this.name = "ConflictError";
  }
}

let cfg = null;
let clientPromise = null;

export function configureAccounts(config) {
  if (cfg && config && cfg.url === config.url && cfg.key === config.key) return;
  cfg = config && config.url && config.key ? config : null;
  clientPromise = null;
}

export const accountsEnabled = () => !!cfg;

function client() {
  if (!cfg) return Promise.reject(new Error("accounts disabled"));
  if (!clientPromise) {
    clientPromise = import("@supabase/supabase-js").then(({ createClient }) =>
      createClient(cfg.url, cfg.key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true, // 메일의 링크로 돌아오면 주소에 실린 로그인 정보를 읽는다
          storageKey: "childhood_auth", // 아이 기록(banjjaktalk_v2)과 섞이지 않는 별도 키
        },
      })
    );
  }
  return clientPromise;
}

// 이 계정 기능이 던지는 오류를 화면용 분류로 바꾼다.
export function errorKind(e) {
  const msg = String(e?.message || e || "").toLowerCase();
  const status = e?.status;
  if (e?.name === "ConflictError") return "conflict";
  if (status === 429 || msg.includes("rate limit") || msg.includes("too many") || msg.includes("security purposes"))
    return "rate_limit";
  if (msg.includes("expired") || msg.includes("invalid") || (status === 403 && msg.includes("otp"))) return "bad_code";
  if (msg.includes("failed to fetch") || msg.includes("network") || msg.includes("load failed")) return "network";
  if (msg.includes("signups not allowed") || msg.includes("not allowed")) return "not_allowed";
  return "unknown";
}

export async function getSession() {
  const c = await client();
  const { data } = await c.auth.getSession();
  return data?.session || null;
}

// 로그인 상태가 바뀔 때마다 콜백. 해제 함수를 돌려준다.
export async function onAuthChange(cb) {
  const c = await client();
  const { data } = c.auth.onAuthStateChange((_event, session) => cb(session || null));
  return () => data.subscription.unsubscribe();
}

export async function sendLoginCode(email) {
  const c = await client();
  const { error } = await c.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: window.location.origin + "/" },
  });
  if (error) throw error;
}

export async function verifyLoginCode(email, token) {
  const c = await client();
  const { data, error } = await c.auth.verifyOtp({ email, token, type: "email" });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  const c = await client();
  await c.auth.signOut();
}

// 이미 이 버전에 동의한 기록이 있으면 다시 쓰지 않는다. 없는 문서만 추가한다.
export async function recordConsents() {
  const c = await client();
  const { data, error } = await c.from("consents").select("document, version");
  if (error) throw error;
  const have = new Set((data || []).filter((r) => r.version === CONSENT_VERSION).map((r) => r.document));
  const rows = CONSENT_DOCS.filter((d) => !have.has(d)).map((document) => ({ document, version: CONSENT_VERSION }));
  if (!rows.length) return;
  const { error: e2 } = await c.from("consents").insert(rows);
  if (e2) throw e2;
}

export async function hasConsented() {
  const c = await client();
  const { data, error } = await c.from("consents").select("document, version");
  if (error) throw error;
  const have = new Set((data || []).filter((r) => r.version === CONSENT_VERSION).map((r) => r.document));
  return CONSENT_DOCS.every((d) => have.has(d));
}

// 계정에 저장된 스냅샷: { rev, data, updatedAt } 또는 null(아직 저장한 적 없음)
export async function loadAccountState() {
  const c = await client();
  const { data, error } = await c.from("account_state").select("rev, data, updated_at").maybeSingle();
  if (error) throw error;
  return data ? { rev: data.rev, data: data.data, updatedAt: data.updated_at } : null;
}

// 내가 마지막으로 본 rev(처음이면 0)를 함께 보낸다. 다른 기기가 먼저 저장했으면 ConflictError.
export async function saveAccountState(expectedRev, snapshot) {
  const c = await client();
  const { data, error } = await c.rpc("save_account_state", { expected_rev: expectedRev, new_data: snapshot });
  if (error) {
    if (error.code === "40001" || /conflict/i.test(error.message || "")) throw new ConflictError();
    throw error;
  }
  return data; // 새 rev
}

export async function deleteMyAccount() {
  const c = await client();
  const { error } = await c.rpc("delete_my_account");
  if (error) throw error;
  await c.auth.signOut({ scope: "local" }).catch(() => {});
}
