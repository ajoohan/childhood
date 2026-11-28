import { useEffect, useRef, useState } from "react";
import {
  CONSENT_VERSION,
  ConflictError,
  deleteMyAccount,
  errorKind,
  getSession,
  loadAccountState,
  onAuthChange,
  hasConsented,
  recordConsents,
  saveAccountState,
  sendLoginCode,
  signOut,
  verifyLoginCode,
} from "../lib/account.js";
import { CONSENTS } from "../lib/consentText.js";
import { applySnapshot, buildSnapshot, isSnapshot, sameSnapshot } from "../lib/snapshot.js";
import { fmtTime, replaceStore } from "../lib/store.js";

// 부모 화면의 "부모 계정" 카드. 계정은 선택이다 — 로그인하지 않아도 앱은 지금처럼 이 기기에서 그대로 쓴다.
// 계정에는 아이 프로필·별·콜렉션만 올린다(대화 기록·안전 알림·PIN은 올리지 않는다, lib/snapshot.js).

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// 코드를 요청한 뒤의 "코드 입력 단계"를 이 탭에 기억해 둔다. 코드를 보려고 메일 앱으로 가면 앱이 가려져
// 부모 화면이 다시 잠기고(이 카드도 사라진다) 돌아왔을 때 처음부터 다시 해야 했다 — 새 코드를 받으러 또 메일로 가면
// 같은 일이 되풀이돼, 휴대폰 한 대로는 로그인을 끝낼 수 없었다. 동의는 코드를 요청할 때 이미 했으므로 버전과 함께 기억한다.
const PENDING_KEY = "childhood_acct_pending";
const PENDING_MS = 15 * 60 * 1000;
const RESEND_SECONDS = 60;
function readPending() {
  try {
    const p = JSON.parse(sessionStorage.getItem(PENDING_KEY));
    const age = Date.now() - p.at;
    if (typeof p.email === "string" && EMAIL_OK.test(p.email) && p.version === CONSENT_VERSION && age >= 0 && age < PENDING_MS)
      return p;
  } catch {}
  return null;
}
function writePending(email) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ email, version: CONSENT_VERSION, at: Date.now() }));
  } catch {}
}
function clearPending() {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {}
}

const MESSAGES = {
  rate_limit: "메일을 너무 자주 요청했어요. 잠시 뒤에 다시 해 주세요.",
  bad_code: "코드가 맞지 않거나 만료됐어요. 다시 확인하거나 새 코드를 받아 주세요.",
  bad_email: "이메일 주소를 다시 확인해 주세요.",
  too_large: "기록이 너무 커서 계정에 저장할 수 없어요.",
  network: "연결이 불안정해요. 인터넷을 확인하고 다시 해 주세요.",
  not_allowed: "지금은 이 이메일로 가입할 수 없어요.",
  conflict: "다른 기기에서 더 최근에 저장했어요. 계정에서 불러오거나, 이 기기의 기록으로 덮어쓸 수 있어요.",
  unknown: "잘 안 됐어요. 잠시 뒤에 다시 해 주세요.",
};
const say = (e) => MESSAGES[errorKind(e)] || MESSAGES.unknown;

export default function AccountPanel({ buildStore }) {
  const [phase, setPhase] = useState("loading"); // loading | out | code | in
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [agreed, setAgreed] = useState({});
  const [open, setOpen] = useState(null); // 펼친 동의 문서
  const [remote, setRemote] = useState(undefined); // undefined: 아직 모름 | null: 저장한 적 없음 | {rev, data, updatedAt}
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [conflict, setConflict] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false); // 로그인은 돼 있는데 계정의 기록을 확인하지 못함
  const sessionRef = useRef(null);
  sessionRef.current = session;
  const phaseRef = useRef("loading");
  const [cooldown, setCooldown] = useState(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    let unsub = () => {};
    (async () => {
      try {
        const s = await getSession();
        if (!alive.current) return;
        if (s) {
          clearPending();
          await enter(s, false);
        } else {
          const pending = readPending();
          if (pending) {
            // 코드를 받으러 메일 앱에 다녀온 경우: 코드 입력 단계에서 이어 간다
            setEmail(pending.email);
            setCooldown(Math.max(0, RESEND_SECONDS - Math.floor((Date.now() - pending.at) / 1000)));
            setPhase("code");
          } else setPhase("out");
        }
        unsub = await onAuthChange((next) => {
          if (!alive.current) return;
          // 다른 탭에서 다른 계정으로 로그인했다: 이 탭의 요청도 그 계정의 토큰으로 나가므로, 화면도 그 계정으로 다시 연다.
          const cur = sessionRef.current?.user?.id;
          if (next && cur && next.user?.id && next.user.id !== cur) {
            setConflict(false);
            setAgreed({});
            setMsg("다른 창에서 다른 계정으로 로그인해서, 그 계정으로 바꿨어요.");
            enter(next, false);
            return;
          }
          if (!next) {
            if (phaseRef.current !== "code") setAgreed({}); // 로그아웃되면 다음 사람이 동의 칸을 직접 고르게 한다
            setSession(null);
            setRemote(undefined);
            setConflict(false);
            setLoadFailed(false);
            setPhase((p) => (p === "code" ? p : "out")); // 코드 입력 중이면 그대로 둔다
          }
        });
      } catch (e) {
        if (alive.current) {
          setPhase("out");
          setErr(say(e));
        }
      }
    })();
    return () => {
      alive.current = false;
      unsub();
    };
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // 로그인된 상태로 들어간다.
  //  fresh(방금 로그인): 동의 기록을 먼저 남긴다. 못 남기면 로그인을 취소한다(동의 없이 계정을 쓰지 않는다).
  //  이전 로그인 유지(fresh 아님): 지금 버전의 동의가 기록돼 있는지 확인한다. 문구가 바뀌어 없으면 다시 받는다.
  async function enter(s, fresh) {
    setSession(s);
    setLoadFailed(false);
    try {
      if (fresh) await recordConsents();
      else if (!(await hasConsented())) {
        await signOut().catch(() => {});
        if (!alive.current) return false;
        setSession(null);
        setPhase("out");
        setMsg("이 계정에 지금 약관에 동의한 기록이 없어요. 동의하고 다시 로그인해 주세요.");
        return false;
      }
      const r = await loadAccountState();
      if (!alive.current) return false;
      setRemote(r);
      setPhase("in");
      return true;
    } catch (e) {
      if (!alive.current) return false;
      if (fresh) {
        await signOut().catch(() => {});
        setSession(null);
        setPhase("out");
      } else {
        // 로그인은 유지하되 "다시 확인"을 보여 준다(연결이 잠깐 끊긴 것일 수 있다)
        setRemote(undefined);
        setLoadFailed(true);
        setPhase("in");
      }
      setErr(say(e));
      return false;
    }
  }

  const retryLoad = async () => {
    setBusy(true);
    setErr("");
    await enter(session, false);
    if (alive.current) setBusy(false);
  };

  phaseRef.current = phase;
  const allAgreed = CONSENTS.every((c) => agreed[c.id]);
  const emailOk = EMAIL_OK.test(email.trim());

  async function wrap(fn) {
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      await fn();
    } catch (e) {
      if (alive.current) {
        if (e instanceof ConflictError) setConflict(true);
        setErr(say(e));
      }
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  const requestCode = () =>
    wrap(async () => {
      await sendLoginCode(email.trim());
      writePending(email.trim());
      if (!alive.current) return;
      setPhase("code");
      setCode("");
      setCooldown(RESEND_SECONDS);
      setMsg("메일로 6자리 코드를 보냈어요.");
    });

  const submitCode = () =>
    wrap(async () => {
      const s = await verifyLoginCode(email.trim(), code.trim());
      clearPending(); // 코드는 한 번만 쓸 수 있다. 여기서부터는 성공이든 실패든 코드 단계로 돌아갈 일이 없다
      if ((await enter(s, true)) && alive.current) setMsg("로그인했어요.");
    });

  const changeEmail = () => {
    clearPending();
    setCode("");
    setErr("");
    setMsg("");
    setPhase("out");
  };

  // 이 기기의 기록을 계정에 저장한다. force: 다른 기기의 더 최근 기록을 덮어쓴다.
  const save = (force = false) =>
    wrap(async () => {
      let rev = remote ? remote.rev : 0;
      if (force) {
        const latest = await loadAccountState();
        rev = latest ? latest.rev : 0;
      }
      const snap = buildSnapshot(buildStore());
      let nextRev;
      try {
        nextRev = await saveAccountState(rev, snap);
      } catch (e) {
        if (e instanceof ConflictError) {
          // 화면의 "계정에 저장된 기록"을 지금 계정에 있는 것으로 바꿔 둔다. 그래야 부모가 무엇을 불러오거나
          // 덮어쓰는지 알 수 있다. (충돌 동안 보통 저장 버튼은 막혀, 실수로 한 번 더 눌러 덮어쓰는 일은 없다.)
          const latest = await loadAccountState().catch(() => undefined);
          if (latest !== undefined && alive.current) setRemote(latest);
        }
        throw e;
      }
      setRemote({ rev: nextRev, data: snap, updatedAt: new Date().toISOString() });
      setConflict(false);
      setMsg("계정에 저장했어요.");
    });

  // 계정의 기록을 이 기기로 불러온다. 화면에 떠 있던 값이 아니라 지금 계정에 있는 값을 새로 받아서 쓴다
  // (로그인한 뒤 다른 기기가 저장했을 수 있다).
  const restore = () =>
    wrap(async () => {
      const latest = await loadAccountState();
      if (!alive.current) return;
      setRemote(latest);
      if (!latest) {
        setConflict(false);
        setErr("계정에 저장된 기록이 없어요.");
        return;
      }
      if (!isSnapshot(latest.data)) {
        setErr("저장된 기록을 읽을 수 없어요.");
        return;
      }
      const local = buildStore();
      // 이 기기에만 있는 아이는 불러오면 사라진다(대화 기록까지). 누구인지 알려 준다.
      const gone = Object.entries(local.kids || {})
        .filter(([id, k]) => k?.profile?.onboarded && !latest.data.kids[id])
        .map(([, k]) => String(k.profile.name || "이름 없는 아이"));
      const ok = window.confirm(
        `이 기기의 아이 프로필·별·콜렉션이 계정에 저장된 기록(${fmtTime(latest.updatedAt)})으로 바뀌어요.\n` +
          (gone.length ? `계정에 없는 아이(${gone.join(", ")})는 대화 기록까지 이 기기에서 사라져요.\n` : "") +
          "(계정에도 있는 아이의 대화 기록과 부모 PIN은 그대로 남아요.) 불러올까요?"
      );
      if (!ok) return;
      try {
        replaceStore(applySnapshot(local, latest.data));
      } catch {
        setErr("저장된 기록을 불러오지 못했어요.");
        return;
      }
      window.location.reload();
    });

  const logout = () =>
    wrap(async () => {
      await signOut();
      setSession(null);
      setRemote(undefined);
      setConflict(false);
      setLoadFailed(false);
      setAgreed({}); // 다음 사람이 동의 칸을 직접 고르게 한다(체크된 채 남으면 다른 부모의 동의가 그냥 기록됐다)
      setPhase("out");
      setMsg("로그아웃했어요. 이 기기의 기록은 그대로예요.");
    });

  const remove = () => {
    const ok = window.confirm(
      "계정과 계정에 저장된 모든 기록(이메일, 동의 기록 포함)을 지워요. 되돌릴 수 없어요.\n(이 기기의 기록은 지워지지 않아요.) 정말 삭제할까요?"
    );
    if (!ok) return;
    wrap(async () => {
      await deleteMyAccount();
      setSession(null);
      setRemote(undefined);
      setConflict(false);
      setLoadFailed(false);
      setPhase("out");
      setAgreed({});
      setMsg("계정과 저장된 기록을 모두 지웠어요.");
    });
  };

  let dirty = false;
  if (phase === "in" && remote !== undefined) {
    try {
      dirty = !remote || !sameSnapshot(buildSnapshot(buildStore()), remote.data);
    } catch {
      dirty = true;
    }
  }
  const kidCount = remote && isSnapshot(remote.data) ? Object.keys(remote.data.kids).length : 0;

  return (
    <div className="guard-card acct-card">
      <h3>👤 부모 계정</h3>

      {phase === "loading" && <p className="guard-hint">불러오는 중이에요…</p>}

      {phase === "out" && (
        <>
          <p className="guard-hint">
            계정은 선택이에요. 만들면 기기를 바꾸거나 브라우저 기록을 지워도 아이의 별과 콜렉션을 이어 갈 수 있어요.
            대화 내용은 계정에 저장하지 않아요.
          </p>
          <label className="prof-row">
            <span>보호자 이메일</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <div className="acct-consents">
            {CONSENTS.map((c) => (
              <div key={c.id} className="acct-consent">
                <label>
                  <input
                    type="checkbox"
                    checked={!!agreed[c.id]}
                    onChange={(e) => setAgreed((a) => ({ ...a, [c.id]: e.target.checked }))}
                  />
                  <span>{c.label}</span>
                </label>
                <button
                  className="pin-link acct-more"
                  aria-expanded={open === c.id}
                  onClick={() => setOpen(open === c.id ? null : c.id)}
                >
                  {open === c.id ? "접기" : "내용 보기"}
                </button>
                {open === c.id && (
                  <div className="acct-doc">
                    <b>{c.title}</b>
                    <ul>
                      {c.body.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                    <small>정식 서비스 전에 전문가 검토를 거쳐 고쳐질 수 있는 초안이에요.</small>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button className="guard-btn" disabled={busy || !emailOk || !allAgreed} onClick={requestCode}>
            로그인 코드 받기
          </button>
        </>
      )}

      {phase === "code" && (
        <>
          <p className="guard-hint">
            <b>{email.trim()}</b>(으)로 보낸 6자리 코드를 입력해 주세요. 메일을 보러 다른 앱에 다녀오면 부모 화면이
            다시 잠겨요. PIN을 입력하고 돌아오면 여기서 이어서 할 수 있어요.
          </p>
          <label className="prof-row">
            <span>코드</span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="6자리"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && code.length === 6) submitCode();
              }}
            />
          </label>
          <div className="set-pin-actions">
            <button className="guard-btn" disabled={busy || code.length !== 6} onClick={submitCode}>
              확인
            </button>
            <button className="guard-btn ghost" disabled={busy || cooldown > 0} onClick={requestCode}>
              {cooldown > 0 ? `다시 받기 (${cooldown}초)` : "코드 다시 받기"}
            </button>
            <button className="guard-btn ghost" disabled={busy} onClick={changeEmail}>
              이메일 바꾸기
            </button>
          </div>
        </>
      )}

      {phase === "in" && (
        <>
          <div className="set-info-row">
            <span>로그인</span>
            <b>{session?.user?.email || "로그인됨"}</b>
          </div>
          <div className="set-info-row">
            <span>계정에 저장된 기록</span>
            <b>
              {remote === undefined
                ? loadFailed
                  ? "확인하지 못했어요"
                  : "확인 중…"
                : remote
                  ? `${fmtTime(remote.updatedAt)} · 아이 ${kidCount}명`
                  : "아직 없어요"}
            </b>
          </div>
          {dirty && remote !== undefined && (
            <p className="guard-hint acct-dirty">이 기기에 계정에 저장하지 않은 변경이 있어요.</p>
          )}
          {loadFailed && (
            <div className="set-pin-actions">
              <button className="guard-btn" disabled={busy} onClick={retryLoad}>
                다시 확인
              </button>
            </div>
          )}
          <div className="set-pin-actions">
            <button className="guard-btn" disabled={busy || remote === undefined || conflict} onClick={() => save(false)}>
              이 기기 기록을 계정에 저장
            </button>
            <button className="guard-btn ghost" disabled={busy || !remote} onClick={restore}>
              계정에서 불러오기
            </button>
          </div>
          {conflict && (
            <div className="set-pin-actions">
              <button className="guard-btn danger" disabled={busy} onClick={() => save(true)}>
                이 기기 기록으로 덮어쓰기
              </button>
            </div>
          )}
          <div className="set-pin-actions">
            <button className="guard-btn ghost" disabled={busy} onClick={logout}>
              로그아웃
            </button>
            <button className="guard-btn danger" disabled={busy} onClick={remove}>
              계정과 저장된 기록 삭제
            </button>
          </div>
          <p className="guard-hint">
            계정에는 아이 프로필·별·콜렉션만 저장돼요. 대화 기록, 안전 알림, 부모 PIN은 이 기기에만 있어요. 새 기기에서는
            PIN을 다시 정해 주세요.
          </p>
        </>
      )}

      {msg && (
        <p className="guard-hint acct-msg" role="status">
          {msg}
        </p>
      )}
      {err && (
        <p className="gate-error" role="alert">
          {err}
        </p>
      )}
    </div>
  );
}
