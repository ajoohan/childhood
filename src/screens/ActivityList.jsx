import AssetImg from "../components/AssetImg.jsx";

// 카테고리 안의 활동 목록 (연령 모드에 맞는 활동만 노출)
export default function ActivityList({ category, activities, ageMode, onBack, onPick }) {
  const list = activities.filter(
    (a) => a.category === category.id && a.ages.includes(ageMode)
  );

  return (
    <section className="activity-list px">
      <header className="sub-top">
        <button className="back-btn" onClick={onBack} aria-label="뒤로">
          ←
        </button>
        <div className="sub-title">
          <span className="sub-emoji">{category.emoji}</span>
          {category.title}
        </div>
      </header>

      <div className="act-grid">
        {list.map((a) => (
          <button key={a.id} className="act-card" onClick={() => onPick(a)}>
            <span className="act-emoji">{a.emoji}</span>
            <AssetImg className="act-img" src={`/img/act-${a.id}.png`} />
            <span className="act-veil" />
            <span className="act-title">{a.title}</span>
          </button>
        ))}
        {list.length === 0 && (
          <p className="act-empty">이 연령에 맞는 활동을 준비 중이에요.</p>
        )}
      </div>
    </section>
  );
}
