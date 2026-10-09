import { useEffect, useState } from "react";
import {
  lockMessage,
  lockRemaining,
  makeChallenge,
  recordFail,
  recordSuccess,
} from "../lib/pinGuard.js";

// 부모 접근 잠금 — 4자리 PIN.
// savedPin 없음 → 설정(입력 후 확인). savedPin 있음 → 입력해서 확인.
// "PIN을 잊으셨나요?" → 어른 확인 계산 후 재설정.
// 틀리면 횟수를 세어 잠시 잠근다(lib/pinGuard.js) — 아이가 번호를 하나씩 눌러 보는 것을 막는다.
export default function PinGate({ savedPin, onUnlock, onSetPin, onClose }) {
  // phase: enter | set | confirm | forgot
  const [phase, setPhase] = useState(savedPin ? "enter" : "set");
  const [pin, setPin] = useState("");
  const [first, setFirst] = useState("");
  const [err, setErr] = useState("");
  const [forgot, setForgot] = useState(() => makeChallenge());
  const [forgotVal, setForgotVal] = useState("");
  const [locked, setLocked] = useState(() => lockRemaining());

  // 잠금이 풀릴 때까지 남은 시간을 갱신한다
  useEffect(() => {
    if (!locked) return;
    const t = setInterval(() => setLocked(lockRemaining()), 1000);
    return () => clearInterval(t);
  }, [locked > 0]);

  // 틀렸을 때: 횟수를 기록하고, 한도를 넘었으면 잠근다. 잠겼으면 true.
  function failed() {
    recordFail();
    const left = lockRemaining();
    setLocked(left);
    return left > 0;
  }

  function checkForgot() {
    if (locked) return;
    if (Number(forgotVal) === forgot.answer) {
      recordSuccess();
      setErr("");
      setPin("");
      setFirst("");
      setForgotVal("");
      setPhase("set");
    } else {
      setForgotVal("");
      setForgot(makeChallenge()); // 같은 문제를 반복해서 찍지 못하게 바꾼다
      setErr(failed() ? lockMessage(lockRemaining()) : "답이 맞지 않아요.");
    }
  }

  function press(d) {
    if (locked || pin.length >= 4) return;
    const next = pin + d;
    setErr("");
    setPin(next);
    if (next.length === 4) setTimeout(() => complete(next), 120);
  }
  function back() {
    setErr("");
    setPin((p) => p.slice(0, -1));
  }

  function complete(value) {
    if (phase === "enter") {
      if (locked) {
        setPin("");
        return;
      }
      if (value === savedPin) {
        recordSuccess();
        onUnlock();
      } else {
        setErr(failed() ? lockMessage(lockRemaining()) : "PIN이 맞지 않아요.");
        setPin("");
      }
    } else if (phase === "set") {
      setFirst(value);
      setPin("");
      setPhase("confirm");
    } else if (phase === "confirm") {
      if (value === first) {
        onSetPin(value);
        onUnlock();
      } else {
        setErr("PIN이 서로 달라요. 다시 설정해 주세요.");
        setPin("");
        setFirst("");
        setPhase("set");
      }
    }
  }

  const titles = {
    enter: { t: "부모 확인", s: "PIN을 입력해 주세요" },
    set: { t: "부모 PIN 설정", s: "사용할 4자리 PIN을 정해 주세요" },
    confirm: { t: "PIN 확인", s: "같은 PIN을 한 번 더 입력해 주세요" },
    forgot: { t: "어른 확인", s: "아래 계산의 답을 적어 주세요" },
  };
  const cur = titles[phase];

  if (phase === "forgot") {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="pin-card" onClick={(e) => e.stopPropagation()}>
          <div className="pin-lock">🔐</div>
          <h2>{cur.t}</h2>
          <p className="pin-sub">{cur.s}</p>
          <p className="gate-q">{forgot.text} = ?</p>
          <input
            className="pin-forgot-input"
            type="number"
            inputMode="numeric"
            autoFocus
            value={forgotVal}
            onChange={(e) => setForgotVal(e.target.value)}
            disabled={locked > 0}
            onKeyDown={(e) => {
              if (e.key === "Enter") checkForgot();
            }}
          />
          {err && <p className="gate-error">{err}</p>}
          <div className="gate-actions">
            <button id="gateCancel" onClick={onClose}>
              취소
            </button>
            <button
              id="gateOk"
              disabled={locked > 0}
              onClick={checkForgot}
            >
              확인
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="pin-card" onClick={(e) => e.stopPropagation()}>
        <div className="pin-lock">🔐</div>
        <h2>{cur.t}</h2>
        <p className="pin-sub">{cur.s}</p>

        <div className="pin-dots">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`pin-dot ${pin.length > i ? "on" : ""}`} />
          ))}
        </div>
        {locked > 0 && !err && <p className="pin-error">{lockMessage(locked)}</p>}
        {err && <p className="pin-error">{err}</p>}

        <div className="pin-pad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
            <button key={d} className="pin-key" onClick={() => press(String(d))}>
              {d}
            </button>
          ))}
          <span className="pin-key ghost" />
          <button className="pin-key" onClick={() => press("0")}>
            0
          </button>
          <button className="pin-key back" onClick={back} aria-label="지우기">
            ⌫
          </button>
        </div>

        <div className="pin-foot">
          {savedPin && phase === "enter" ? (
            <button className="pin-link" onClick={() => setPhase("forgot")}>
              PIN을 잊으셨나요?
            </button>
          ) : (
            <button className="pin-link" onClick={onClose}>
              취소
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
