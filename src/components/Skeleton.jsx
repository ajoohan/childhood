import { useEffect, useState } from "react";

// 스켈레톤 화면: 서버에서 활동 목록을 받기 전에 빈 화면 대신 자리 모양을 보여 준다.
// 무료 서버가 잠에서 깨는 동안(10~20초 이상) 홈이 통째로 비어 있어, 앱이 멈춘 것처럼 보였다.
// - 자리 블록(Bone)은 화면 읽기 프로그램에 숨기고, 감싸는 영역에 aria-busy와 이름을 준다.
// - 움직임 줄이기(prefers-reduced-motion)를 켠 기기에서는 빛이 흐르는 움직임을 끈다(CSS).

export function Bone({ className = "", style }) {
  return <span className={`sk ${className}`} style={style} aria-hidden="true" />;
}

// 잠깐(3초) 넘게 걸리면 "깨어나는 중" 안내를 덧붙이고, 끝내 받지 못하면 다시 시도 버튼을 보여 준다.
export function WakeNote({ failed = false, onRetry }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 3000);
    return () => clearTimeout(t);
  }, []);
  if (failed) {
    return (
      <div className="sk-note failed" role="alert">
        <p>별이와 연결이 잘 안 돼요. 인터넷을 확인하고 다시 해 볼까?</p>
        {onRetry && (
          <button className="sk-retry" onClick={onRetry}>
            다시 시도
          </button>
        )}
      </div>
    );
  }
  return (
    <p className={`sk-note ${slow ? "" : "quiet"}`} role="status">
      {slow ? "별이가 깨어나는 중이에요. 잠깐만 기다려 줘! ⭐" : "불러오는 중이에요…"}
    </p>
  );
}

// 홈 화면의 자리: 큰 타일 2개, 추천 카드 줄, 바로가기 3행
export function HomeSkeleton({ failed, onRetry }) {
  return (
    <div className="fx-skel" aria-busy={!failed} aria-label="홈을 불러오는 중">
      <WakeNote failed={failed} onRetry={onRetry} />
      <div className="fx-tiles">
        <Bone className="sk-tile" />
        <Bone className="sk-tile" />
      </div>
      <section className="fx-sec">
        <Bone className="sk-line" style={{ width: 120 }} />
        <div className="fx-row sk-row">
          <Bone className="sk-card" />
          <Bone className="sk-card" />
          <Bone className="sk-card" />
          <Bone className="sk-card" />
        </div>
      </section>
      <div className="fx-quick">
        <Bone className="sk-qrow" />
        <Bone className="sk-qrow" />
        <Bone className="sk-qrow" />
      </div>
    </div>
  );
}

// 저널(대화 기록) 화면의 자리: 폴라로이드 4장
export function JournalSkeleton({ failed, onRetry }) {
  return (
    <div className="sk-journal" aria-busy={!failed} aria-label="기록을 불러오는 중">
      <WakeNote failed={failed} onRetry={onRetry} />
      <div className="polaroids">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="sk-polaroid" aria-hidden="true">
            <Bone className="sk-photo" />
            <Bone className="sk-line" style={{ width: "70%" }} />
          </span>
        ))}
      </div>
    </div>
  );
}
