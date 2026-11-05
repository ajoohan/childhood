// /api/chat SSE 스트림을 읽는 공용 함수 (채팅 화면과 음성 화면이 함께 쓴다).
// 두 화면에 복사돼 있던 코드가 서로 어긋나, 음성 쪽만 서버의 친절한 오류 문구를
// 버리던 문제가 있었다.
//
//   streamChat({ body, signal, onText, onSafety }) → 전체 답변 문자열
//
// - 서버가 오류 본문({error})을 주면 그 문구를 err.friendly 에 담아 던진다.
// - signal 로 중단하면 AbortError 가 그대로 던져진다(호출한 쪽에서 구분한다).
// 서버는 최근 30개만 쓰고(MAX_HISTORY_MESSAGES) 본문은 100KB가 한도다. 보관 기록 40개를 그대로 보내면
// 긴 이야기 활동에서 한도를 넘어 413이 나고, 기록을 지울 때까지 그 활동 대화가 막혔다.
export const OUTGOING_MESSAGES = 30;

export function outgoingMessages(messages) {
  return (messages || [])
    .slice(-OUTGOING_MESSAGES)
    .map(({ role, content }) => ({ role, content }));
}

// 데이터가 이 시간 동안 전혀 오지 않으면 끊고 아이용 문구를 보여 준다. 모바일 망이나 서버가 깨어나는
// 중에 연결이 멈추면 read()가 영영 끝나지 않아 입력창이 "생각 중"에 갇혔다.
export const STALL_MS = 60_000;

export async function streamChat({ body, signal, onText, onSafety, stallMs = STALL_MS }) {
  const ctrl = new AbortController();
  const relay = () => ctrl.abort();
  if (signal) signal.aborted ? ctrl.abort() : signal.addEventListener("abort", relay);
  let stalled = false;
  let timer;
  const arm = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      stalled = true;
      ctrl.abort();
    }, stallMs);
  };

  try {
    arm();
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, messages: outgoingMessages(body.messages) }),
      signal: ctrl.signal,
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
    let streamError = null;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      arm();
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
        // 서버가 스트림 도중 실패를 알리면(키 오류·과부하 등) 답변이 아니라 오류로 다룬다.
        // 예전에는 이 문구가 별이의 말로 저장돼 다음 요청에 모델이 "내가 한 말"로 읽었다.
        if (obj.error) {
          streamError = obj.error;
          continue;
        }
        acc += obj.text || "";
        onText && onText(acc);
      }
    }
    if (streamError) {
      const e = new Error(streamError);
      e.friendly = streamError;
      throw e;
    }
    return acc;
  } catch (e) {
    if (stalled) {
      const err = new Error("stalled");
      err.friendly = "별이가 대답이 늦어지고 있어. 조금 뒤에 다시 말해 줄래?";
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", relay);
  }
}
