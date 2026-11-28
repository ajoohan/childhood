// 기기 저장값 ↔ 부모 계정에 올리는 스냅샷 변환 (순수 함수).
//
// 계정에는 "아이 프로필·별·콜렉션" 같은 진행 상황만 올린다.
// 올리지 않는 것: 대화 기록(histories), 안전 알림(safety, 아이가 한 말의 발췌가 들어 있다), 알림함(notices),
// 부모 PIN과 재설정 시각. 이것들은 이 기기에만 남는다.
import { normalizeKid } from "./store.js";

export const SNAPSHOT_VERSION = 1;
// UTF-8 바이트 기준(한글은 글자당 3바이트). 서버 제한(500,000바이트)보다 넉넉히 작게 둔다:
// 서버는 저장한 값을 글로 바꿔 재는데, 그때 쉼표·콜론 뒤에 공백이 붙어 조금 더 길어진다.
export const MAX_SNAPSHOT_BYTES = 300_000;
const byteLength = (text) => new TextEncoder().encode(text).length;
const MAX_KIDS = 12;
const KID_ID = /^[A-Za-z0-9_-]{1,32}$/;

const KID_FIELDS = ["profile", "rewards", "parentMissions", "decor", "badges", "stickers"];
const SETTING_FIELDS = ["limitPerDay", "voice", "sound", "notifyMissions"];

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj && k in obj).map((k) => [k, obj[k]]));
// id로 쓸 수 없는 이름(객체의 내장 속성). 정규식은 통과하지만 kids["__proto__"]처럼 쓰면 아이 목록이 깨졌다.
const RESERVED = new Set(["__proto__", "constructor", "prototype", "hasOwnProperty", "toString", "valueOf"]);
const validId = (id) => typeof id === "string" && KID_ID.test(id) && !RESERVED.has(id);
const has = (obj, k) => !!obj && Object.prototype.hasOwnProperty.call(obj, k);

// ── 계정에서 받은 값 검사 ──
// 계정의 값은 이 앱이 올린 것이지만, 다른 버전의 앱이나 직접 쓴 값일 수 있다. 모양이 틀린 값이 기기에 저장되면
// 앱이 켤 때마다 같은 곳에서 멈췄다(되돌리려면 모든 기록을 지워야 했다). 알려진 칸만, 맞는 종류일 때만 받는다.
const str = (v, max) => (typeof v === "string" ? Array.from(v).slice(0, max).join("") : undefined);
const int = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : undefined);
const num = (v, lo, hi) => (typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi ? v : undefined);
const plain = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const defined = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

function cleanProfile(p) {
  if (!plain(p)) return { onboarded: true };
  const year = new Date().getFullYear();
  return defined({
    onboarded: true,
    name: str(p.name, 20),
    age: int(p.age, 0, 19) ?? (p.age === null ? null : undefined),
    birthYear: int(p.birthYear, year - 20, year) ?? (p.birthYear === null ? null : undefined),
    birthMonth: int(p.birthMonth, 1, 12) ?? (p.birthMonth === null ? null : undefined),
    avatar: str(p.avatar, 16) ?? (p.avatar === null ? null : undefined),
    interests: Array.isArray(p.interests) ? p.interests.filter((x) => typeof x === "string").slice(0, 12).map((x) => str(x, 20)) : undefined,
    plan: str(p.plan, 20),
  });
}

function cleanRewards(r) {
  if (!plain(r)) return undefined;
  return defined({
    day: typeof r.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.day) ? r.day : undefined,
    balance: int(r.balance, 0, 1_000_000),
    earnedToday: int(r.earnedToday, 0, 1_000_000),
    attendance: typeof r.attendance === "boolean" ? r.attendance : undefined,
    doneToday: Array.isArray(r.doneToday) ? r.doneToday.filter((x) => typeof x === "string").slice(0, 50) : undefined,
    allClear: typeof r.allClear === "boolean" ? r.allClear : undefined,
    chestOpened: typeof r.chestOpened === "boolean" ? r.chestOpened : undefined,
    msgsToday: int(r.msgsToday, 0, 100_000),
  });
}

function cleanMissions(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((m) => plain(m) && typeof m.id === "string" && typeof m.title === "string")
    .slice(0, 30)
    .map((m) =>
      defined({
        id: str(m.id, 32),
        title: str(m.title, 30),
        emoji: str(m.emoji, 8) ?? "⭐",
        reward: int(m.reward, 1, 10) ?? 2,
        notify: typeof m.notify === "boolean" ? m.notify : undefined,
      })
    );
}

function cleanKid(k) {
  if (!plain(k)) return { profile: { onboarded: true } };
  const stickers = {};
  if (plain(k.stickers)) {
    for (const [id, n] of Object.entries(k.stickers)) {
      if (validId(id) && int(n, 0, 100_000) !== undefined) stickers[id] = n;
    }
  }
  return defined({
    profile: cleanProfile(k.profile),
    rewards: cleanRewards(k.rewards),
    parentMissions: cleanMissions(k.parentMissions),
    decor: plain(k.decor) ? k.decor : undefined, // normalizeKid가 모양을 맞춘다
    badges: Array.isArray(k.badges) ? k.badges.filter((x) => typeof x === "string").slice(0, 200) : undefined,
    stickers,
  });
}

// store = { settings, activeKid, kids }  →  계정에 올릴 객체
export function buildSnapshot(store) {
  const kids = {};
  for (const [id, kid] of Object.entries(store.kids || {})) {
    if (!validId(id)) continue;
    if (!kid?.profile?.onboarded) continue; // 가입을 마치지 않은 빈 프로필은 올리지 않는다
    kids[id] = pick(kid, KID_FIELDS);
  }
  const snap = {
    v: SNAPSHOT_VERSION,
    activeKid: has(kids, store.activeKid) ? store.activeKid : Object.keys(kids)[0] || null,
    settings: pick(store.settings, SETTING_FIELDS),
    kids,
  };
  if (byteLength(JSON.stringify(snap)) > MAX_SNAPSHOT_BYTES) throw new Error("snapshot too large");
  return snap;
}

// 계정에서 받은 값이 쓸 수 있는 모양인가
export function isSnapshot(snap) {
  return (
    !!snap &&
    typeof snap === "object" &&
    snap.v === SNAPSHOT_VERSION &&
    !!snap.kids &&
    typeof snap.kids === "object" &&
    !Array.isArray(snap.kids) &&
    Object.keys(snap.kids).some((id) => validId(id))
  );
}

// 기기 저장값 위에 스냅샷을 적용해 새 저장값을 만든다.
// 아이 목록은 스냅샷으로 바뀌고, 같은 아이(id)의 대화 기록·안전 알림·알림함과 기기의 PIN은 그대로 둔다.
export function applySnapshot(local, snap) {
  if (!isSnapshot(snap)) throw new Error("invalid snapshot");
  const kids = {};
  for (const id of Object.keys(snap.kids).filter((k) => validId(k)).slice(0, MAX_KIDS)) {
    const kept = has(local.kids, id) ? local.kids[id] : undefined;
    kids[id] = {
      ...normalizeKid({ ...cleanKid(snap.kids[id]), histories: {}, safety: [], notices: [] }),
      histories: kept?.histories || {},
      safety: kept?.safety || [],
      notices: kept?.notices || [],
    };
  }
  const ids = Object.keys(kids);
  const safeSettings = pick(plain(snap.settings) ? snap.settings : {}, SETTING_FIELDS);
  if (safeSettings.limitPerDay != null) {
    const n = Math.floor(Number(safeSettings.limitPerDay));
    safeSettings.limitPerDay = Number.isFinite(n) && n >= 0 ? n : null;
  }
  if ("voice" in safeSettings && typeof safeSettings.voice !== "string") delete safeSettings.voice;
  for (const k of ["sound", "notifyMissions"]) if (k in safeSettings && typeof safeSettings[k] !== "boolean") delete safeSettings[k];
  return {
    settings: { ...(local.settings || {}), ...safeSettings },
    activeKid: has(kids, snap.activeKid) ? snap.activeKid : ids[0],
    kids,
  };
}

// 두 스냅샷이 같은 내용인지(저장할 변경이 있는지 판단). 키 순서와 무관하게 비교한다.
export function sameSnapshot(a, b) {
  const canon = (v) =>
    Array.isArray(v)
      ? v.map(canon)
      : v && typeof v === "object"
        ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]))
        : v;
  return JSON.stringify(canon(a)) === JSON.stringify(canon(b));
}
