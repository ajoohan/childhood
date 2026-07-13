// 로컬 저장 (서버가 아닌 이 기기 브라우저에만 저장됨)
const STORE_KEY = "banjjaktalk_v1";

export function loadStore() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    return {
      histories: s.histories || {},
      safety: Array.isArray(s.safety) ? s.safety : [],
      settings: s.settings || { limitPerDay: null },
      profile: s.profile || emptyProfile(),
    };
  } catch {
    return {
      histories: {},
      safety: [],
      settings: { limitPerDay: null },
      profile: emptyProfile(),
    };
  }
}

// 온보딩(회원가입)으로 채워지는 아이 프로필 — 이 기기에만 저장
export function emptyProfile() {
  return { onboarded: false, name: "", age: null, interests: [], plan: "free" };
}

export function persist(state) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {}
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function userMsgCount(history) {
  return (history || []).filter((m) => m.role === "user").length;
}

export function messagesToday(histories) {
  const t = todayKey();
  let n = 0;
  for (const h of Object.values(histories || {})) {
    for (const m of h) if (m.role === "user" && (m.t || "").slice(0, 10) === t) n++;
  }
  return n;
}

export function lastTime(history) {
  const h = history || [];
  for (let i = h.length - 1; i >= 0; i--) {
    if (h[i].role === "user" && h[i].t) return h[i].t;
  }
  return null;
}

export function fmtTime(iso) {
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
