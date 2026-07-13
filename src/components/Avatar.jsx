import { AVATARS } from "../lib/data.js";

// character.image 가 있으면 이미지 아트를, 없으면 기본 SVG 마스코트를 렌더한다.
// (SVG 문자열은 우리가 직접 만든 정적 문자열이라 dangerouslySetInnerHTML 사용)
export default function Avatar({ character }) {
  if (character?.image) {
    return <img className="ava-img" src={character.image} alt={character.name || ""} />;
  }
  const svg = AVATARS[character?.id] || "";
  return (
    <span className="ava-svg" dangerouslySetInnerHTML={{ __html: svg }} />
  );
}
