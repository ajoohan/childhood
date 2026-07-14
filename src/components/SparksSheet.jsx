import { robotHead } from "../lib/mascot.js";

// 별(Sparks) 모으기 시트 — 소비/상점 없이 '격려'만. 활동을 하면 별이 쌓여요.
const WAYS = [
  { id: "story_listen", emoji: "📖", label: "이야기 들어보기", tip: "동화를 듣고 이야기해요" },
  { id: "draw_idea", emoji: "🎨", label: "그림 놀이 하기", tip: "상상한 걸 그려 봐요" },
  { id: "learn_ask", emoji: "❓", label: "궁금한 거 물어보기", tip: "무엇이든 물어봐요" },
];

export default function SparksSheet({ stars, activities, onGo, onClose }) {
  const byId = (id) => activities.find((a) => a.id === id);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" />
        <div className="sparks-hd">
          <span
            className="sparks-robot"
            dangerouslySetInnerHTML={{ __html: robotHead("proud") }}
          />
          <div>
            <b>별 모으기</b>
            <small>재미있게 놀면 별이 쌓여요</small>
          </div>
          <span className="sparks-count">
            <b>{stars}</b> ⭐
          </span>
        </div>

        <div className="sparks-ways">
          {WAYS.map((w) => {
            const a = byId(w.id);
            if (!a) return null;
            return (
              <button key={w.id} className="sparks-way" onClick={() => onGo(a)}>
                <span className="sw-emoji">{w.emoji}</span>
                <span className="sw-body">
                  <b>{w.label}</b>
                  <small>{w.tip}</small>
                </span>
                <span className="sw-go">해보기</span>
              </button>
            );
          })}
        </div>

        <p className="sparks-note">
          ⭐ 별은 <b>모으는 재미</b>예요. 따로 사고파는 곳은 없어요. 😊
        </p>
      </div>
    </div>
  );
}
