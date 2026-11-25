// 에셋 이미지 오버레이 — /img/{name}.png 가 있으면 이모지 폴백을 덮어 씌우고,
// 파일이 없으면(404) 스스로 사라져 이모지가 보인다.
// hideFallback: 바로 앞 형제(이모지)를 이미지가 뜬 뒤 숨긴다. 장식 레이어는 false.
export default function AssetImg({ src, className, hideFallback = true }) {
  return (
    <img
      className={className}
      src={src}
      alt=""
      loading="lazy"
      // 지우지 않고 숨긴다(React가 관리하는 노드를 지우면 다시 그릴 때 removeChild 오류가 난다).
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
      onLoad={(e) => {
        if (!hideFallback) return;
        const prev = e.currentTarget.previousElementSibling;
        if (prev) prev.style.visibility = "hidden";
      }}
    />
  );
}
