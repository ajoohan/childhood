import { userMsgCount } from "../lib/store.js";

// 기록(Collection) — 아이가 했던 활동을 다시 이어 하기
export default function Collection({ activities, histories, onPick }) {
  const done = activities
    .map((a) => ({ a, n: userMsgCount(histories[a.id]) }))
    .filter((x) => x.n > 0)
    .sort((x, y) => y.n - x.n);

  return (
    <section className="collection">
      <header className="home-hd simple">
        <div className="hd-hi">
          <b>📦 내 기록</b>
          <small>했던 활동을 다시 이어 해요</small>
        </div>
      </header>

      <div className="coll-list">
        {done.length === 0 && (
          <p className="recent-empty">
            아직 한 활동이 없어요.{"\n"}홈에서 재미있는 걸 골라 볼까요? ✨
          </p>
        )}
        {done.map(({ a, n }) => {
          const history = histories[a.id] || [];
          const lastUser = [...history].reverse().find((m) => m.role === "user");
          const preview = lastUser ? lastUser.content : "다시 이어 해요";
          return (
            <button key={a.id} className="coll-item" onClick={() => onPick(a)}>
              <span className="coll-emoji">{a.emoji}</span>
              <span className="coll-body">
                <b>{a.title}</b>
                <span className="coll-preview">{preview}</span>
              </span>
              <span className="coll-badge">{n}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
