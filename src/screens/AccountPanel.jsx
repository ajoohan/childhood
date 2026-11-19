import { useEffect, useRef, useState } from "react";
import {
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

const MESSAGES = {
  rate_limit: "메일을 너무 자주 요청했어요. 잠시 뒤에 다시 해 주세요.",
  bad_code: "코드가 맞지 않거나 만료됐어요. 다시 확인하거나 새 코드를 받아 주세요.",
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
  const [cooldown, setCooldown] = useState(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    let unsub = () => {};
    (async () => {
      try {
        const s = await getSession();
        if (!alive.current) return;
        if (s) await enter(s, false);
        else setPhase("out");
        unsub = await onAuthChange((next) => {
          if (!alive.current) return;
          if (!next) {
            setSession(null);
            setRemote(undefined);
            setPhase("out");
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
    try {
      if (fresh) await recordConsents();
      else if (!(await hasConsented())) {
        await signOut().catch(() => {});
        if (!alive.current) return false;
        setSession(null);
        setPhase("out");
        setMsg("약관이 바뀌었어요. 다시 동의하고 로그인해 주세요.");
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
        setPhase("in");
      }
      setErr(say(e));
      return false;
    }
  }

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
      setPhase("code");
      setCode("");
      setCooldown(60);
      setMsg("메일로 6자리 코드를 보냈어요. 메일의 링크를 열어도 로그인돼요.");
    });

  const submitCode = () =>
    wrap(async () => {
      const s = await verifyLoginCode(email.trim(), code.trim());
      if ((await enter(s, true)) && alive.current) setMsg("로그인했어요.");
    });

  // 이 기기의 기록을 계정에 저장한다. force: 다른 기기의 더 최근 기록을 덮어쓴다.
  const save = (force = false) =>
    wrap(async () => {
      let rev = remote ? remote.rev : 0;
      if (force) {
        const latest = await loadAccountState();
        rev = latest ? latest.rev : 0;
      }
      const snap = buildSnapshot(buildStore());
      const nextRev = await saveAccountState(rev, snap);
      setRemote({ rev: nextRev, data: snap, updatedAt: new Date().toISOString() });
      setConflict(false);
      setMsg("계정에 저장했어요.");
    });

  const restore = () => {
    if (!remote) return;
    if (!isSnapshot(remote.data)) {
      setErr("저장된 기록을 읽을 수 없어요.");
      return;
    }
    const ok = window.confirm(
      "이 기기의 아이 프로필·별·콜렉션이 계정에 저장된 기록으로 바뀌어요.\n(이 기기의 대화 기록과 부모 PIN은 그대로 남아요.) 불러올까요?"
    );
    if (!ok) return;
    setErr("");
    try {
      replaceStore(applySnapshot(buildStore(), remote.data));
    } catch {
      setErr("저장된 기록을 불러오지 못했어요.");
      return;
    }
    window.location.reload();
  };

  const logout = () =>
    wrap(async () => {
      await signOut();
      setSession(null);
      setRemote(undefined);
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
                <button className="pin-link acct-more" onClick={() => setOpen(open === c.id ? null : c.id)}>
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
            <b>{email.trim()}</b>(으)로 보낸 6자리 코드를 입력해 주세요.
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
            <button className="guard-btn ghost" disabled={busy} onClick={() => setPhase("out")}>
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
                ? "확인 중…"
                : remote
                  ? `${fmtTime(remote.updatedAt)} · 아이 ${kidCount}명`
                  : "아직 없어요"}
            </b>
          </div>
          {dirty && remote !== undefined && (
            <p className="guard-hint acct-dirty">이 기기에 계정에 저장하지 않은 변경이 있어요.</p>
          )}
          <div className="set-pin-actions">
            <button className="guard-btn" disabled={busy || remote === undefined} onClick={() => save(false)}>
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
