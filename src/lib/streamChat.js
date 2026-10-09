// /api/chat SSE 스트림을 읽는 공용 함수 (채팅 화면과 음성 화면이 함께 쓴다).
// 두 화면에 복사돼 있던 코드가 서로 어긋나, 음성 쪽만 서버의 친절한 오류 문구를
// 버리던 문제가 있었다.
//
//   streamChat({ body, signal, onText, onSafety }) → 전체 답변 문자열
//
// - 서버가 오류 본문({error})을 주면 그 문구를 err.friendly 에 담아 던진다.
// - signal 로 중단하면 AbortError 가 그대로 던져진다(호출한 쪽에서 구분한다).
export async function streamChat({ body, signal, onText, onSafety }) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    let msg = null;
    try {
      const j = await res.json();
      if (j && j.error) msg = j.error;
    } catch {}
    const e = new Error(msg || `HTTP ${res.status}`);
    if (msg) e.friendly = msg;
    throw e;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let acc = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6);
      if (data === "[DONE]") continue;
      let obj;
      try {
        obj = JSON.parse(data);
      } catch {
        continue; // 깨진 조각 하나 때문에 대화 전체를 버리지 않는다
      }
      if (obj.safety) {
        onSafety && onSafety(obj.safety);
        continue;
      }
      acc += obj.text || "";
      onText && onText(acc);
    }
  }
  return acc;
}
