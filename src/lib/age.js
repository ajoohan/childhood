// 아이 나이 · 연령 모드 계산
// 생년월을 저장해 두면 시간이 지나면서 자동으로 나이가 오르고,
// 만 10세가 되는 순간 영유아(1–9세) 버전에서 아동(10–13세) 버전으로
// 자연스럽게 전환된다.

// 서비스 연령 경계 (기준 10세로 통일)
export const TODDLER_MIN = 1; // 영유아 시작
export const TODDLER_MAX = 9; // 영유아: 1–9세
export const CHILD_MIN = 10; // 아동 시작: 10세
export const CHILD_MAX = 13; // 아동: 10–13세

// 두 가지 서비스 컨셉
export const MODE_LABEL = {
  young: { name: "영유아", range: "1–9세", sub: "부모와 함께" },
  kid: { name: "아동", range: "10–13세", sub: "아이 스스로" },
};

// 만 나이 계산 — 생년(+생월) 기준. 생월까지만 보고 근사한다.
// 생년 정보가 없으면 예전 방식(고정 age)으로 폴백한다.
export function computeAge(profile, now = new Date()) {
  if (!profile) return null;
  const { birthYear, birthMonth, age } = profile;
  if (birthYear) {
    let a = now.getFullYear() - birthYear;
    // 올해 생월이 아직 안 지났으면 한 살 빼기(월 기준 근사)
    if (birthMonth && now.getMonth() + 1 < birthMonth) a -= 1;
    return a < 0 ? 0 : a;
  }
  return age != null ? age : null;
}

// 나이 → 연령 모드. 10세 미만은 영유아, 10세 이상은 아동.
export function ageModeForAge(age) {
  if (age == null) return "young";
  return age >= CHILD_MIN ? "kid" : "young";
}

// 프로필(생년월) → 현재 연령 모드. 앱을 열 때마다 다시 계산되므로
// 아이가 10세가 되면 다음 실행부터 자동으로 아동 모드가 된다.
export function ageModeForProfile(profile, now = new Date()) {
  return ageModeForAge(computeAge(profile, now));
}

// 서버가 활동에 minAge를 달아 두면, 연령 모드와 상관없이 그 나이부터 보인다.
// (아동용 활동을 7–9세에게도 열어 주기 위함.) 화면의 `ages.includes(ageMode)` 필터를
// 그대로 쓸 수 있도록, 해당하면 현재 연령 모드를 ages에 더한 목록을 돌려준다.
export function adaptActivities(activities, ageMode, age) {
  return (activities || []).map((a) => {
    const open =
      a.minAge != null && age != null && age >= a.minAge && !(a.ages || []).includes(ageMode);
    return open ? { ...a, ages: [...(a.ages || []), ageMode] } : a;
  });
}
