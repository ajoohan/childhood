// 홈/최근 화면 상단 바 (로고 + 세이프 배지 + 보호자 버튼)
export default function TopBar({ title, showSafe, onGuard }) {
  return (
    <header className="top-bar">
      {title ? (
        <div className="logo">{title}</div>
      ) : (
        <div className="logo">
          반짝<span>톡</span>
        </div>
      )}
      {showSafe && (
        <div className="safe-badge" title="어린이 보호 모드는 항상 켜져 있어요">
          <span className="safe-toggle">
            <span className="safe-knob" />
          </span>
          <span className="safe-icon">🛡️</span>
          <span className="safe-label">세이프</span>
        </div>
      )}
      <button className="login-btn" onClick={onGuard}>
        보호자
      </button>
    </header>
  );
}
