import React from "react";

// 렌더 중 오류가 나면 React가 트리 전체를 내려 흰 화면만 남는다.
// 아이가 혼자 쓰는 앱이라 복구 방법이 보여야 해서, 다정한 안내와
// 다시 시작 버튼을 대신 띄운다. (저장된 프로필·별은 그대로 남는다)
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    // 부모가 문의할 때 단서가 되도록 콘솔에만 남긴다.
    console.error("화면 오류:", error, info?.componentStack);
  }

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
        <small>모아둔 별과 콜렉션은 그대로 있어요 ⭐</small>
      </div>
    );
  }
}
