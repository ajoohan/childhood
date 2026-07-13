export default function TabBar({ screen, onHome, onRecent, onGuard }) {
  return (
    <nav className="tab-bar">
      <button
        className={`tab ${screen === "home" ? "active" : ""}`}
        onClick={onHome}
      >
        <span className="tab-icon">🏠</span>
        <span>홈</span>
      </button>
      <button
        className={`tab ${screen === "recent" ? "active" : ""}`}
        onClick={onRecent}
      >
        <span className="tab-icon">💬</span>
        <span>대화</span>
      </button>
      <button className="tab" onClick={onGuard}>
        <span className="tab-icon">👨‍👩‍👧</span>
        <span>보호자</span>
      </button>
    </nav>
  );
}
