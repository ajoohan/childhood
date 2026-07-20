// 로컬 저장 (서버가 아닌 이 기기 브라우저에만 저장됨)
// v2: 한 기기에서 여러 아이(멀티 프로필)를 지원한다.
//   { settings, activeKid, kids: { [id]: { profile, histories, safety,
//     rewards, parentMissions, decor, badges, stickers } } }
// settings(PIN·효과음·시간제한·목소리)는 기기 공통, 나머지는 아이별.
const STORE_KEY = "banjjaktalk_v2";
const LEGACY_KEY = "banjjaktalk_v1";

export function newKidId() {
  return "k_" + Math.random().toString(36).slice(2, 9);
}

// 온보딩(회원가입)으로 채워지는 아이 프로필 — 이 기기에만 저장
export function emptyProfile() {
  return {
    onboarded: false,
    name: "",
    age: null,
    birthYear: null,
    birthMonth: null,
    avatar: null, // 프로필 아바타 (이모지)
    interests: [],
    plan: "free",
  };
}

// 아이 1명의 전체 데이터
export function emptyKid() {
  return {
    profile: emptyProfile(),
    histories: {},
    safety: [],
    notices: [], // 부모 알림함 (푸시 발송 전 단계 — 앱 안에 쌓이는 알림)
    rewards: emptyRewards(),
    parentMissions: [],
    decor: emptyDecor(),
    badges: [],
    stickers: {},
  };
}

function normalizeKid(k) {
  const base = emptyKid();
  if (!k || typeof k !== "object") return base;
  return {
    profile: { ...base.profile, ...(k.profile || {}) },
    histories: k.histories || {},
    safety: Array.isArray(k.safety) ? k.safety : [],
    notices: Array.isArray(k.notices) ? k.notices : [],
    rewards: rollDay(k.rewards || emptyRewards()),
    parentMissions: Array.isArray(k.parentMissions) ? k.parentMissions : [],
    decor: k.decor || emptyDecor(),
    badges: Array.isArray(k.badges) ? k.badges : [],
    stickers: k.stickers && typeof k.stickers === "object" ? k.stickers : {},
  };
}

export function loadStore() {
  // v2 우선
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY));
    if (s && s.kids && s.activeKid && s.kids[s.activeKid]) {
      const kids = {};
      for (const [id, k] of Object.entries(s.kids)) kids[id] = normalizeKid(k);
      return {
        settings: s.settings || { limitPerDay: null },
        activeKid: s.activeKid,
        kids,
      };
    }
  } catch {}

  // v1 → v2 마이그레이션 (기존 한 아이 데이터를 첫 프로필로 감싼다)
  try {
    const old = JSON.parse(localStorage.getItem(LEGACY_KEY));
    if (old && typeof old === "object") {
      const id = newKidId();
      return {
        settings: old.settings || { limitPerDay: null },
        activeKid: id,
        kids: {
          [id]: normalizeKid({
            profile: old.profile,
            histories: old.histories,
            safety: old.safety,
            rewards: old.rewards,
            parentMissions: old.parentMissions,
            decor: old.decor,
            badges: old.badges,
            stickers: old.stickers,
          }),
        },
      };
    }
  } catch {}

  // 신규
  const id = newKidId();
  return {
    settings: { limitPerDay: null },
    activeKid: id,
    kids: { [id]: emptyKid() },
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
    chestOpened: false, // 오늘 보물상자 개봉 여부 (하루 1회)
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
      chestOpened: false,
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
