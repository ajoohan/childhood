import TopBar from "../components/TopBar.jsx";
import Avatar from "../components/Avatar.jsx";
import { userMsgCount } from "../lib/store.js";

export default function Recent({ characters, histories, onPick, onGuard }) {
  const sorted = [...characters].sort(
    (a, b) => userMsgCount(histories[b.id]) - userMsgCount(histories[a.id])
  );
  const hasAny = sorted.some((c) => userMsgCount(histories[c.id]) > 0);

  return (
    <section className="recent-screen">
      <TopBar title="대화" onGuard={onGuard} />
      <div className="recent-list">
        {!hasAny && (
          <p className="recent-empty">
            아직 나눈 이야기가 없어요.{"\n"}친구를 골라서 첫 대화를 시작해 볼까요? 💬
          </p>
        )}
        {sorted.map((c) => {
          const history = histories[c.id] || [];
          const lastUser = [...history].reverse().find((m) => m.role === "user");
          const preview = lastUser ? lastUser.content : "아직 대화하지 않았어요";
          const count = userMsgCount(history);
          return (
            <button
              key={c.id}
              className="recent-item"
              onClick={() => onPick(c)}
            >
              <span
                className="recent-ava"
                style={{
                  background: `linear-gradient(160deg, #ffffff, ${c.theme[0]})`,
                }}
              >
                <Avatar character={c} />
              </span>
              <span className="recent-body">
                <b>{c.name}</b>
                <span className={`recent-preview ${lastUser ? "" : "muted"}`}>
                  {preview}
                </span>
              </span>
              {count ? (
                <span className="recent-badge">{count}</span>
              ) : (
                <span className="recent-go">›</span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
