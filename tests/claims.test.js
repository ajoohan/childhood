// 근거 없는 홍보 문구가 화면과 공유 미리보기에 다시 들어오지 않게 지킨다.
// 평점·인증·후기·사용량 약속은 실제 데이터나 기능이 있을 때만 쓴다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const BANNED = [
  [/AI 안전 검증/, "안전 인증을 받은 것처럼 보이는 배지"],
  [/안심 검증/, "안전 인증을 받은 것처럼 보이는 배지"],
  [/4\.8/, "근거 없는 평점"],
  [/평점/, "평점 표시"],
  [/어느 부모님/, "꾸며낸 후기"],
  [/100분/, "구현되지 않은 사용량 약속"],
  [/50장/, "구현되지 않은 사용량 약속"],
  [/완전한 투명성/, "앱이 하지 않는 열람 약속"],
  [/무제한 질문/, "서버 상한과 맞지 않는 무제한 약속"],
  [/음성 대화 기록/, "앱이 저장하지 않는 음성 기록 약속"],
  [/대화 기록·만든 그림/, "앱이 저장하지 않는 그림 열람 약속"],
  [/그림을 부모가/, "앱이 저장하지 않는 그림 열람 약속"],
  [/반짝이/, "옛 이름(도우미 이름은 별이)"],
  [/안심하고 맡길/, "보장처럼 읽히는 안심 약속"],
  [/100% 광고/, "과장된 단정"],
];

function sources(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...sources(p));
    else if (/\.(jsx?|html)$/.test(name)) out.push(p);
  }
  return out;
}

test("홍보 문구: 화면 코드와 index.html에 근거 없는 문구가 없다", () => {
  const files = [...sources("src"), "index.html"];
  assert.ok(files.length > 10, "검사 대상이 있어야 한다");
  const hits = [];
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    for (const [re, why] of BANNED) if (re.test(text)) hits.push(`${f}: ${re} (${why})`);
  }
  assert.deepEqual(hits, []);
});
