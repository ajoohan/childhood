// 한국어 조사 — 받침 유무로 고른다. 이름이 들어가는 문장에서 "지안는", "지안야"처럼 틀리지 않게 한다.
// 마지막 글자가 한글이 아니면(영문·숫자·기호) 받침이 없는 것으로 본다.

export function hasBatchim(word) {
  const s = String(word ?? "").trim();
  if (!s) return false;
  const code = s.charCodeAt(s.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

const pick = (word, withB, withoutB) => String(word ?? "") + (hasBatchim(word) ? withB : withoutB);

export const eunNeun = (w) => pick(w, "은", "는"); // 지안은 / 서아는
export const iGa = (w) => pick(w, "이", "가"); // 지안이 / 서아가
export const eulReul = (w) => pick(w, "을", "를"); // 지안을 / 서아를
export const aYa = (w) => pick(w, "아", "야"); // 지안아 / 서아야 (부를 때)
export const iEge = (w) => pick(w, "이에게", "에게"); // 지안이에게 / 서아에게 (이름 뒤)
