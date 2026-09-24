import React from "react";

// 렌더 중 오류가 나면 React가 트리 전체를 내려 흰 화면만 남는다.
// 아이가 혼자 쓰는 앱이라 복구 방법이 보여야 해서, 다정한 안내와
// 다시 시작 버튼을 대신 띄운다. (저장된 프로필·별은 그대로 남는다)
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    // 저장값이 원인이면 새로고침만으로는 같은 지점에서 다시 터진다.
    // 한 세션에서 두 번 넘게 실패하면 데이터 초기화 선택지를 보여 준다.
    let tries = 0;
    try {
      tries = Number(sessionStorage.getItem("cw_boom") || 0);
    } catch {}
    this.state = { failed: false, tries };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    // 부모가 문의할 때 단서가 되도록 콘솔에만 남긴다.
    console.error("화면 오류:", error, info?.componentStack);
    try {
      sessionStorage.setItem("cw_boom", String(this.state.tries + 1));
    } catch {}
  }

  // 저장된 데이터가 원인일 때의 마지막 수단. 별·콜렉션도 함께 지워지므로
  // 반복 실패했을 때만 노출한다.
  reset = () => {
    try {
      localStorage.removeItem("banjjaktalk_v2");
      sessionStorage.removeItem("cw_boom");
    } catch {}
    window.location.reload();
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="eb">
        <div className="eb-face">😵‍💫</div>
        <h1>앗, 잠깐 멈췄어요</h1>
        <p>
          별이가 잠깐 어지러웠나 봐요.
          <br />
          다시 시작하면 괜찮아질 거예요!
        </p>
        <button className="eb-btn" onClick={() => window.location.reload()}>
          다시 시작하기
        </button>
        {this.state.tries >= 2 ? (
          <>
            <button className="eb-reset" onClick={this.reset}>
              그래도 안 되면 · 처음부터 다시 시작
            </button>
            <small>처음부터 시작하면 모아둔 별과 콜렉션이 사라져요</small>
          </>
        ) : (
          <small>모아둔 별과 콜렉션은 그대로 있어요 ⭐</small>
        )}
      </div>
    );
  }
}
