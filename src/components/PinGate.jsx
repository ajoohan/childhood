import { useEffect, useState } from "react";
import Dialog from "./Dialog.jsx";
import {
  lockMessage,
  lockRemaining,
  makeChallenge,
  recordFail,
  recordSuccess,
} from "../lib/pinGuard.js";

// 부모 접근 잠금 — 4자리 PIN.
// savedPin 없음 → 설정(입력 후 확인). savedPin 있음 → 입력해서 확인.
// "PIN을 잊으셨나요?" → 어른 확인 계산 후 재설정. 이 경로로 바뀐 PIN은 onSetPin(pin, { viaForgot: true })로
// 알려, 앱이 부모 화면에 "재설정됨" 안내를 남기게 한다(아이가 계산으로 PIN을 바꿨을 때 부모가 알 수 있게).
// inline: 가입 화면 안에 끼워 넣는 모드 — 팝업 틀과 취소 링크 없이, PIN을 정하면 onUnlock이 불린다.
// 틀리면 횟수를 세어 잠시 잠근다(lib/pinGuard.js) — 아이가 번호를 하나씩 눌러 보는 것을 막는다.
export default function PinGate({ savedPin, onUnlock, onSetPin, onClose, inline = false }) {
  // phase: enter | set | confirm | forgot
  const [phase, setPhase] = useState(savedPin ? "enter" : "set");
  const [pin, setPin] = useState("");
  const [first, setFirst] = useState("");
  const [err, setErr] = useState("");
  const [forgot, setForgot] = useState(() => makeChallenge());
  const [forgotVal, setForgotVal] = useState("");
  const [locked, setLocked] = useState(() => lockRemaining());
  const [viaForgot, setViaForgot] = useState(false);

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
      // 여기서는 실패 횟수를 지우지 않는다. 지우면 "PIN 틀리기 → 잠금 → 계산 풀기"로
      // 잠금을 피할 수 있다. 횟수는 실제 PIN으로 열렸을 때만 초기화된다.
      setErr("");
      setPin("");
      setFirst("");
      setForgotVal("");
      setViaForgot(true);
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

  // 키보드(숫자·Backspace)로도 입력할 수 있게 한다. 계산 입력칸(forgot)에서는 쓰지 않는다.
  useEffect(() => {
    if (phase === "forgot") return;
    function onKey(e) {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") back();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

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
        recordSuccess(); // 새 PIN을 정한 시점부터 다시 센다
        onSetPin(value, { viaForgot });
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

  // 팝업(기본) 또는 가입 화면 안(inline)에 같은 내용을 담는다.
  const shell = (label, children) =>
    inline ? (
      <div className="pin-card px pin-inline">{children}</div>
    ) : (
      <Dialog onClose={onClose} label={label} className="pin-card px">
        {children}
      </Dialog>
    );

  if (phase === "forgot") {
    return shell(
      cur.t,
      <>
        <div className="pin-lock">🔐</div>
        <h2>{cur.t}</h2>
        <p className="pin-sub">{cur.s}</p>
        <p className="gate-q">{forgot.text} = ?</p>
        <input
          className="pin-forgot-input"
          type="number"
          inputMode="numeric"
          aria-label="계산 답"
          autoFocus
          value={forgotVal}
          onChange={(e) => setForgotVal(e.target.value)}
          disabled={locked > 0}
          onKeyDown={(e) => {
            if (e.key === "Enter") checkForgot();
          }}
        />
        {err && (
          <p className="gate-error" role="alert">
            {err}
          </p>
        )}
        <div className="gate-actions">
          <button id="gateCancel" onClick={onClose}>
            취소
          </button>
          <button id="gateOk" disabled={locked > 0} onClick={checkForgot}>
            확인
          </button>
        </div>
      </>
    );
  }

  return shell(
    cur.t,
    <>
      <div className="pin-lock">🔐</div>
      <h2>{cur.t}</h2>
      <p className="pin-sub">{cur.s}</p>

      <div className="pin-dots" role="img" aria-label={`${pin.length}자리 입력됨`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`pin-dot ${pin.length > i ? "on" : ""}`} />
        ))}
      </div>
      {locked > 0 && !err && (
        <p className="pin-error" role="alert">
          {lockMessage(locked)}
        </p>
      )}
      {err && (
        <p className="pin-error" role="alert">
          {err}
        </p>
      )}

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

      {!inline && (
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
      )}
    </>
  );
}
