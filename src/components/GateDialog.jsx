import { useEffect, useRef, useState } from "react";
import {
  lockMessage,
  lockRemaining,
  makeChallenge,
  recordFail,
  recordSuccess,
} from "../lib/pinGuard.js";

// 어린이 접근 차단용 보호자 확인. 틀리면 횟수를 세어 잠시 잠그고, 문제도 바뀐다.
export default function GateDialog({ onPass, onClose }) {
  const [q, setQ] = useState(() => makeChallenge());
  const [locked, setLocked] = useState(() => lockRemaining());
  const [val, setVal] = useState("");
  const [err, setErr] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setVal("");
    setErr(false);
    if (inputRef.current) inputRef.current.focus();
  }, [q]);

  useEffect(() => {
    if (!locked) return;
    const t = setInterval(() => setLocked(lockRemaining()), 1000);
    return () => clearInterval(t);
  }, [locked > 0]);

  function submit() {
    if (locked) return;
    if (Number(val) === q.answer) {
      recordSuccess();
      onPass();
    } else {
      recordFail();
      setLocked(lockRemaining());
      setErr(true);
      setQ(makeChallenge()); // 같은 문제를 반복해서 찍지 못하게 바꾼다
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>보호자 확인</h2>
        <p>
          여기는 어른을 위한 공간이에요.
          <br />
          아래 계산의 답을 적어 주세요.
        </p>
        <p className="gate-q">{q.text} = ?</p>
        <input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          autoComplete="off"
          value={val}
          disabled={locked > 0}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        {locked > 0 ? (
          <p className="gate-error">{lockMessage(locked)}</p>
        ) : (
          err && <p className="gate-error">답이 맞지 않아요. 다시 확인해 주세요.</p>
        )}
        <div className="gate-actions">
          <button id="gateCancel" onClick={onClose}>
            취소
          </button>
          <button id="gateOk" onClick={submit} disabled={locked > 0}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
