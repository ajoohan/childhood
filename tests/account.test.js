// 계정 래퍼의 순수 함수: 오류 분류, 주소에 실린 로그인 정보 지우기. (Supabase 연결은 화면 테스트의 가짜로 확인한다.)
import { test } from "node:test";
import assert from "node:assert/strict";
import { errorKind, scrubAuthHash, ConflictError } from "../src/lib/account.js";

test("오류 분류: Supabase 오류 코드를 먼저 본다", () => {
  assert.equal(errorKind({ code: "otp_expired", status: 403, message: "Token has expired or is invalid" }), "bad_code");
  assert.equal(errorKind({ code: "over_email_send_rate_limit", status: 429, message: "email rate limit exceeded" }), "rate_limit");
  assert.equal(errorKind({ status: 429, message: "For security purposes, you can only request this after 42 seconds." }), "rate_limit");
  assert.equal(errorKind({ code: "email_address_not_authorized", status: 400, message: "Email address not authorized" }), "not_allowed");
  assert.equal(errorKind({ code: "signup_disabled", message: "Signups not allowed for otp" }), "not_allowed");
  assert.equal(errorKind(new TypeError("Failed to fetch")), "network");
  assert.equal(errorKind(new ConflictError()), "conflict");
  assert.equal(errorKind(new Error("snapshot too large")), "too_large");
  assert.equal(errorKind(new Error("뭔지 모를 오류")), "unknown");
});

test("오류 분류: 'invalid'가 들어 있다고 모두 '코드가 틀림'은 아니다", () => {
  // 이메일 주소가 거부된 것을 "코드가 맞지 않아요"로 안내하면 부모가 코드만 계속 다시 넣게 된다
  assert.equal(errorKind({ code: "email_address_invalid", status: 400, message: 'Email address "a@b" is invalid' }), "bad_email");
  assert.equal(errorKind({ status: 401, message: "Invalid API key" }), "unknown");
  assert.equal(errorKind({ status: 400, message: "invalid input syntax for type json" }), "unknown");
});

test("주소에 실린 로그인 정보는 지운다 (링크 로그인은 쓰지 않는다)", () => {
  const calls = [];
  const hist = { replaceState: (...a) => calls.push(a) };
  assert.equal(scrubAuthHash({ hash: "#access_token=abc&refresh_token=def&type=magiclink", pathname: "/", search: "?x=1" }, hist), true);
  assert.deepEqual(calls[0], [null, "", "/?x=1"]);
  assert.equal(scrubAuthHash({ hash: "#error=access_denied&error_code=otp_expired", pathname: "/", search: "" }, hist), true);
  assert.equal(scrubAuthHash({ hash: "", pathname: "/", search: "" }, hist), false);
  assert.equal(scrubAuthHash({ hash: "#section", pathname: "/", search: "" }, hist), false, "앱이 쓰는 다른 해시는 건드리지 않는다");
  assert.equal(calls.length, 2);
});
