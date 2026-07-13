import { useEffect, useRef, useState } from "react";

// 브라우저 음성 인식(Web Speech API) 래퍼.
// interim(중간 결과)로 말하는 즉시 한글 텍스트를 실시간 표시하고,
// 문장이 확정되면 onResult(최종 텍스트)를 호출한다. 미지원 시 supported=false.
export function useSpeech({
  lang = "ko-KR",
  onResult,
  interim = true,
  continuous = false,
} = {}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState(""); // 실시간 받아쓰기 (미확정)
  const recRef = useRef(null);
  // onResult는 렌더마다 새로 생기므로 ref로 잡아 인식기 재생성을 막는다.
  const cbRef = useRef(onResult);
  cbRef.current = onResult;

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = interim;
    rec.continuous = continuous;
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      let finalText = "";
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else live += r[0].transcript;
      }
      setInterimText(live);
      if (finalText.trim()) {
        setInterimText("");
        if (cbRef.current) cbRef.current(finalText.trim());
      }
    };
    rec.onend = () => {
      setListening(false);
      setInterimText("");
    };
    rec.onerror = () => {
      setListening(false);
      setInterimText("");
    };
    recRef.current = rec;
    return () => {
      try {
        rec.abort();
      } catch {}
    };
  }, [lang, interim, continuous]);

  function start() {
    const rec = recRef.current;
    if (!rec || listening) return;
    setInterimText("");
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }
  function stop() {
    const rec = recRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {}
    setListening(false);
  }
  function toggle() {
    if (listening) stop();
    else start();
  }

  return { supported, listening, interim: interimText, toggle, start, stop };
}
