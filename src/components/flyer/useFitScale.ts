import { useEffect, useRef, useState } from "react";

/** Scales a fixed-size (mm) page down to fit the available container width. */
export function useFitScale(pageWidthPx: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(Math.min(1, w / pageWidthPx));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pageWidthPx]);

  return { ref, scale };
}
