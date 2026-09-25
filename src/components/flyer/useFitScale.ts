import { useEffect, useRef, useState } from "react";

/** Scales a fixed-size (mm) page down to fit the available container width without flapping jitter. */
export function useFitScale(pageWidthPx: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let rafId: number | null = null;
    const update = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (!el) return;
        const style = window.getComputedStyle(el);
        const paddingLeft = parseFloat(style.paddingLeft) || 0;
        const paddingRight = parseFloat(style.paddingRight) || 0;
        const availableWidth = el.clientWidth - paddingLeft - paddingRight;

        if (availableWidth > 50) {
          // Leave 16px safety breathing room so horizontal scrollbars never spuriously trigger
          const targetScale = Math.min(1, Math.max(0.2, (availableWidth - 16) / pageWidthPx));
          // Round to 3 decimal places and only update if change is > 0.008 (prevents subpixel flapping loop)
          const rounded = Math.round(targetScale * 1000) / 1000;
          setScale((prev) => (Math.abs(prev - rounded) > 0.008 ? rounded : prev));
        }
      });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [pageWidthPx]);

  return { ref, scale };
}

