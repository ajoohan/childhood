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
    histories: normalizeHistories(k.histories),
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
// 저장값이 손상돼도(문자열·null·배열 등) 렌더가 터지지 않도록 형태를 맞춘다.
// 잘못된 값이 그대로 들어오면 매 기동마다 같은 지점에서 실패해 새로고침이 반복된다.
function normalizeHistories(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out = {};
  for (const [id, list] of Object.entries(raw)) {
    if (Array.isArray(list)) {
      out[id] = list.filter((m) => m && typeof m === "object" && typeof m.role === "string");
    }
  }
  return out;
}

export function emptyRewards() {
  return {
    day: todayKey(),
    balance: 0, // 사용 가능한 별 잔액
    earnedToday: 0, // 오늘 획득한 별
    attendance: false, // 오늘 출석·AI 첫인사 보상 여부
    doneToday: [], // 오늘 완료한 미션 id
    allClear: false, // 오늘 올클리어 보너스 지급 여부
    chestOpened: false, // 오늘 보물상자 개봉 여부 (하루 1회)
    msgsToday: 0, // 오늘 아이가 보낸 메시지 수 (부모의 하루 제한 판정용)
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
      msgsToday: 0,
    };
  }
  return base;
}

// 꾸미기(로열매치식) 상태 — 테마별 배치한 오브젝트와 완성 기록
export function emptyDecor() {
  return { theme: "room", placed: {}, completed: [] };
}

// 활동별로 보관하는 최대 대화 수. 서버는 최근 30개만 쓰므로(MAX_HISTORY_MESSAGES)
// 화면 연속성을 위해 약간의 여유만 둔다. 상한이 없으면 localStorage가 가득 차
// 저장이 통째로 실패한다.
export const MAX_STORED_MESSAGES = 40;

export function persist(state) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    return true;
  } catch {
    // 용량 초과로 추정. 대화 기록은 버리더라도 프로필·별·콜렉션은 지킨다.
    try {
      const lean = {
        ...state,
        kids: Object.fromEntries(
          Object.entries(state.kids || {}).map(([id, k]) => [id, { ...k, histories: {} }])
        ),
      };
      localStorage.setItem(STORE_KEY, JSON.stringify(lean));
      return true;
    } catch {
      return false;
    }
  }
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function userMsgCount(history) {
  return (history || []).filter((m) => m.role === "user").length;
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
