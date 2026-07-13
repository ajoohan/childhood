import { userMsgCount, lastTime } from "../lib/store.js";

// 활동 카테고리별 폴라로이드 사진 배경 (아이 활동을 담는 오리지널 구성)
const PHOTO_BG = {
  story: ["#FFE3C0", "#FFB877"],
  learn: ["#D3ECFF", "#8FC9F5"],
  heart: ["#E6F5C2", "#B6DE7E"],
};
// 폴라로이드가 자연스럽게 흩어진 느낌을 주는 회전 각도
const TILT = [-4, 3, -2.5, 4, -3.5, 2];

function photoDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

// Collection — 아이가 한 활동을 폴라로이드로 모아 보는 "저널"
export default function Collection({ activities, histories, name, stars, onPick }) {
  const done = activities
    .map((a) => ({ a, n: userMsgCount(histories[a.id]), last: lastTime(histories[a.id]) }))
    .filter((x) => x.n > 0)
    .sort((x, y) => y.n - x.n);

  const title = name ? `${name}의 저널` : "내 저널";

  return (
    <section className="collection journal">
      <header className="journal-hd">
        <div className="jhd-title">
          <b>📔 {title}</b>
          <small>했던 활동이 사진처럼 쌓여요</small>
        </div>
        <span className="star-badge">
          <b>{stars}</b> ⭐
        </span>
      </header>

      <div className="journal-pad">
        <span className="journal-clip" aria-hidden="true" />
        {done.length === 0 ? (
          <p className="journal-empty">
            아직 사진이 없어요.{"\n"}홈에서 재미있는 걸 해 보면{"\n"}여기에 하나씩
            담겨요 ✨
          </p>
        ) : (
          <div className="polaroids">
            {done.map(({ a, n, last }, i) => {
              const bg = PHOTO_BG[a.category] || ["#FFE3C0", "#FFB877"];
              return (
                <button
                  key={a.id}
                  className="polaroid"
                  style={{ "--tilt": `${TILT[i % TILT.length]}deg` }}
                  onClick={() => onPick(a)}
                >
                  <span
                    className="polaroid-photo"
                    style={{
                      background: `linear-gradient(155deg, ${bg[0]}, ${bg[1]})`,
                    }}
                  >
                    <span className="polaroid-emoji">{a.emoji}</span>
                    <span className="polaroid-count">{n}</span>
                  </span>
                  <span className="polaroid-cap">{a.title}</span>
                  <span className="polaroid-date">{photoDate(last)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <p className="journal-hint">
        폴라로이드를 눌러 그 활동을 다시 이어 해요 · 기록 삭제는 부모 존에서
      </p>
    </section>
  );
}
