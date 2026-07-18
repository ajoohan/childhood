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
      rewards: rollDay(s.rewards || emptyRewards()),
      parentMissions: Array.isArray(s.parentMissions) ? s.parentMissions : [],
      decor: s.decor || emptyDecor(),
      badges: Array.isArray(s.badges) ? s.badges : [],
      stickers: s.stickers && typeof s.stickers === "object" ? s.stickers : {},
    };
  } catch {
    return {
      histories: {},
      safety: [],
      settings: { limitPerDay: null },
      profile: emptyProfile(),
      rewards: emptyRewards(),
      parentMissions: [],
      decor: emptyDecor(),
      badges: [],
      stickers: {},
    };
  }
}

// 온보딩(회원가입)으로 채워지는 아이 프로필 — 이 기기에만 저장
export function emptyProfile() {
  return {
    onboarded: false,
    name: "",
    age: null,
    birthYear: null,
    birthMonth: null,
    interests: [],
    plan: "free",
  };
}

// 별 원장 + 오늘의 미션 진행 상태 (기획서 3. 보상 밸런싱)
export function emptyRewards() {
  return {
    day: todayKey(),
    balance: 0, // 사용 가능한 별 잔액
    earnedToday: 0, // 오늘 획득한 별
    attendance: false, // 오늘 출석·AI 첫인사 보상 여부
    doneToday: [], // 오늘 완료한 미션 id
    allClear: false, // 오늘 올클리어 보너스 지급 여부
  };
}

// 날짜가 바뀌면 일일 진행을 리셋(잔액은 유지). 데일리 재방문 사이클의 핵심.
export function rollDay(r) {
  const base = { ...emptyRewards(), ...(r || {}) };
  if (base.day !== todayKey()) {
    return {
      ...base,
      day: todayKey(),
      earnedToday: 0,
      attendance: false,
      doneToday: [],
      allClear: false,
    };
  }
  return base;
}

// 꾸미기(로열매치식) 상태 — 테마별 배치한 오브젝트와 완성 기록
export function emptyDecor() {
  return { theme: "room", placed: {}, completed: [] };
}

export function persist(state) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {}
}

// 활동 목록 캐시 — 서버 응답이 늦거나 실패해도(배포 콜드 스타트·오프라인)
// 지난 대화(세션)가 저널·부모 존에서 사라져 보이지 않는 일이 없게 한다.
const ACTIVITIES_KEY = "banjjaktalk_activities_v1";

export function loadActivitiesCache() {
  try {
    const d = JSON.parse(localStorage.getItem(ACTIVITIES_KEY));
    if (d && Array.isArray(d.categories) && Array.isArray(d.activities)) return d;
  } catch {}
  return null;
}

export function saveActivitiesCache(data) {
  try {
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(data));
  } catch {}
}

// 현재 활동 목록에 없는 id로 남아 있는 지난 대화도 화면에 불러올 수 있게 한다.
// (활동 개편 등으로 id가 사라져도 아이의 대화 기록은 계속 보여야 한다)
export function orphanHistories(activities, histories) {
  const known = new Set((activities || []).map((a) => a.id));
  return Object.entries(histories || {})
    .filter(([id]) => !known.has(id))
    .map(([id, h]) => ({
      a: {
        id,
        title: "지난 대화",
        emoji: "💬",
        category: null,
        greeting: "다시 만나서 반가워! 지난 이야기를 이어서 해 볼까?",
      },
      n: userMsgCount(h),
      last: lastTime(h),
    }))
    .filter((x) => x.n > 0);
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
