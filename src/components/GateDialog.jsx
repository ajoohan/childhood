import { useEffect, useRef, useState } from "react";

// 어린이 접근 차단용 보호자 확인 (간단한 덧셈)
export default function GateDialog({ a, b, onPass, onClose }) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setVal("");
    setErr(false);
    if (inputRef.current) inputRef.current.focus();
  }, [a, b]);

  function submit() {
    if (Number(val) === a + b) {
      onPass();
    } else {
      setErr(true);
      setVal("");
      if (inputRef.current) inputRef.current.focus();
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
        <p className="gate-q">
          {a} + {b} = ?
        </p>
        <input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          autoComplete="off"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        {err && <p className="gate-error">답이 맞지 않아요. 다시 확인해 주세요.</p>}
        <div className="gate-actions">
          <button id="gateCancel" onClick={onClose}>
            취소
          </button>
          <button id="gateOk" onClick={submit}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
