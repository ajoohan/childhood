import { useEffect, useRef } from "react";

// 모든 팝업·시트가 함께 쓰는 접근성 틀.
//  - role="dialog" aria-modal, 이름(label)
//  - 열리면 안쪽으로 포커스, Tab이 밖으로 새지 않음, Esc로 닫기, 닫히면 원래 자리로 포커스 복귀
// 겉모양은 그대로 두고(backdropClass / className) 동작만 더한다.
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Dialog({
  onClose,
  label,
  backdropClass = "modal-backdrop",
  className = "modal",
  children,
}) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const prev = document.activeElement;
    const node = ref.current;
    // 안쪽 입력칸이 이미 포커스를 가졌으면(autoFocus) 그대로 둔다.
    if (node && !node.contains(document.activeElement)) node.focus();

    function onKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current && closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !node) return;
      const items = [...node.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === node)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      try {
        prev && prev.focus && document.contains(prev) && prev.focus();
      } catch {}
    };
  }, []);

  return (
    <div className={backdropClass} onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={className}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
