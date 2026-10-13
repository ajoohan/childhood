import { test } from "node:test";
import assert from "node:assert/strict";
import { hasBatchim, eunNeun, iGa, eulReul, aYa, iEge } from "../src/lib/josa.js";
import { praiseFor } from "../src/lib/missions.js";

test("받침 판별: 한글 마지막 글자만 본다", () => {
  assert.equal(hasBatchim("지안"), true);
  assert.equal(hasBatchim("서아"), false);
  assert.equal(hasBatchim("얼"), true, "ㄹ 받침");
  assert.equal(hasBatchim("우리 아이"), false);
  for (const v of ["", "  ", null, undefined, "Anna", "123", "😀"]) assert.equal(hasBatchim(v), false, String(v));
});

test("조사: 받침 있으면 은/이/을/아, 없으면 는/가/를/야", () => {
  assert.equal(eunNeun("지안"), "지안은");
  assert.equal(eunNeun("서아"), "서아는");
  assert.equal(iGa("지안"), "지안이");
  assert.equal(iGa("서아"), "서아가");
  assert.equal(eulReul("나의 방"), "나의 방을");
  assert.equal(eulReul("마법의 성"), "마법의 성을");
  assert.equal(eulReul("우주선"), "우주선을");
  assert.equal(eulReul("서아"), "서아를");
  assert.equal(aYa("지안"), "지안아");
  assert.equal(aYa("서아"), "서아야");
  assert.equal(iEge("지안"), "지안이에게");
  assert.equal(iEge("서아"), "서아에게");
  assert.equal(iEge("친구"), "친구에게");
});

test("칭찬 문구: 이름 뒤 호칭이 받침에 맞는다", () => {
  assert.match(praiseFor("지안", 0), /^지안아, /);
  assert.match(praiseFor("서아", 0), /^서아야, /);
  assert.doesNotMatch(praiseFor("", 0), /아, |야, /, "이름이 없으면 호칭을 붙이지 않는다");
});
