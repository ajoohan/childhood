// 부모 확인(PIN·"잊으셨나요?" 계산·구독 확인)을 아이가 무차별로 뚫지 못하게 하는 장치.
// 시도 횟수는 localStorage에 남겨 새로고침으로 초기화되지 않게 한다.
// 이 앱은 서버 계정이 없어 완벽한 방어는 불가능하다 — 목표는 "아이가 우연히, 혹은
// 몇 분 만지작거려서 풀 수 없게" 만드는 것이다.

const KEY = "cw_pin_guard";
export const FREE_TRIES = 5; // 이만큼은 바로 다시 시도할 수 있다
const LOCK_STEPS_MS = [60_000, 300_000, 900_000, 1_800_000]; // 1분 → 5분 → 15분 → 30분

function store() {
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

function read() {
  try {
    const raw = JSON.parse(store()?.getItem(KEY) || "null");
    if (raw && Number.isFinite(raw.fails) && Number.isFinite(raw.lockUntil)) return raw;
  } catch {}
  return { fails: 0, lockUntil: 0 };
}

function write(v) {
  try {
    store()?.setItem(KEY, JSON.stringify(v));
  } catch {}
  return v;
}

// 지금 잠겨 있다면 남은 시간(ms), 아니면 0
export function lockRemaining(now = Date.now()) {
  const { lockUntil } = read();
  return lockUntil > now ? lockUntil - now : 0;
}

// 실패를 기록한다. FREE_TRIES를 넘으면 횟수가 늘수록 더 오래 잠근다.
export function recordFail(now = Date.now()) {
  const { fails } = read();
  const n = fails + 1;
  let lockUntil = 0;
  if (n >= FREE_TRIES) {
    const step = Math.min(n - FREE_TRIES, LOCK_STEPS_MS.length - 1);
    lockUntil = now + LOCK_STEPS_MS[step];
  }
  return write({ fails: n, lockUntil });
}

export function recordSuccess() {
  write({ fails: 0, lockUntil: 0 });
}

// "3분 남았어요" 같은 안내용
export function lockMessage(ms) {
  const min = Math.max(1, Math.ceil(ms / 60_000));
  return `너무 여러 번 틀렸어요. ${min}분 뒤에 다시 해 주세요.`;
}

// 어른 확인 문제. 두 자리 곱셈 + 덧셈이라 초등 고학년이 어림으로 맞히기 어렵다.
export function makeChallenge(rand = Math.random) {
  const a = 12 + Math.floor(rand() * 8); // 12–19
  const b = 6 + Math.floor(rand() * 4); // 6–9
  const c = 11 + Math.floor(rand() * 29); // 11–39
  return { text: `${a} × ${b} + ${c}`, answer: a * b + c };
}
