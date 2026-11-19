// 기기 저장값 ↔ 부모 계정에 올리는 스냅샷 변환 (순수 함수).
//
// 계정에는 "아이 프로필·별·콜렉션" 같은 진행 상황만 올린다.
// 올리지 않는 것: 대화 기록(histories), 안전 알림(safety, 아이가 한 말의 발췌가 들어 있다), 알림함(notices),
// 부모 PIN과 재설정 시각. 이것들은 이 기기에만 남는다.
import { normalizeKid } from "./store.js";

export const SNAPSHOT_VERSION = 1;
export const MAX_SNAPSHOT_BYTES = 400_000; // 서버 제한(500KB)보다 작게
const MAX_KIDS = 12;
const KID_ID = /^[A-Za-z0-9_-]{1,32}$/;

const KID_FIELDS = ["profile", "rewards", "parentMissions", "decor", "badges", "stickers"];
const SETTING_FIELDS = ["limitPerDay", "voice", "sound", "notifyMissions"];

const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => obj && k in obj).map((k) => [k, obj[k]]));

// store = { settings, activeKid, kids }  →  계정에 올릴 객체
export function buildSnapshot(store) {
  const kids = {};
  for (const [id, kid] of Object.entries(store.kids || {})) {
    if (!KID_ID.test(id)) continue;
    if (!kid?.profile?.onboarded) continue; // 가입을 마치지 않은 빈 프로필은 올리지 않는다
    kids[id] = pick(kid, KID_FIELDS);
  }
  const snap = {
    v: SNAPSHOT_VERSION,
    activeKid: kids[store.activeKid] ? store.activeKid : Object.keys(kids)[0] || null,
    settings: pick(store.settings, SETTING_FIELDS),
    kids,
  };
  if (JSON.stringify(snap).length > MAX_SNAPSHOT_BYTES) throw new Error("snapshot too large");
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
    Object.keys(snap.kids).some((id) => KID_ID.test(id))
  );
}

// 기기 저장값 위에 스냅샷을 적용해 새 저장값을 만든다.
// 아이 목록은 스냅샷으로 바뀌고, 같은 아이(id)의 대화 기록·안전 알림·알림함과 기기의 PIN은 그대로 둔다.
export function applySnapshot(local, snap) {
  if (!isSnapshot(snap)) throw new Error("invalid snapshot");
  const kids = {};
  for (const id of Object.keys(snap.kids).filter((k) => KID_ID.test(k)).slice(0, MAX_KIDS)) {
    const kept = local.kids?.[id];
    kids[id] = {
      ...normalizeKid({ ...snap.kids[id], histories: {}, safety: [], notices: [] }),
      histories: kept?.histories || {},
      safety: kept?.safety || [],
      notices: kept?.notices || [],
    };
  }
  const ids = Object.keys(kids);
  const safeSettings = pick(snap.settings, SETTING_FIELDS);
  if (safeSettings.limitPerDay != null) {
    const n = Math.floor(Number(safeSettings.limitPerDay));
    safeSettings.limitPerDay = Number.isFinite(n) && n >= 0 ? n : null;
  }
  return {
    settings: { ...(local.settings || {}), ...safeSettings },
    activeKid: kids[snap.activeKid] ? snap.activeKid : ids[0],
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
