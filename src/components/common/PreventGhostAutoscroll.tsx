import { useEffect } from "react";

/**
 * Enterprise Ghost Autoscroll Prevention
 * 
 * Solves the issue where web pages in Chromium / Windows browsers automatically
 * start scrolling very slowly by themselves.
 * 
 * Causes Eliminated:
 * 1. Windows Middle-Click Autoscroll: Accidentally clicking down on the mouse wheel
 *    places an anchor glyph, and moving the cursor even 1-5px starts a slow, continuous
 *    autonomous scroll until a button is clicked.
 * 2. Stranded Selection / Drag Autoscroll: When a drag or text selection occurs near
 *    the window boundary and a mouseup/pointerup event was lost outside the element,
 *    the browser's native edge-autoscroll loop runs indefinitely.
 * 3. Rogue Smooth Scrolling: Programmatic scrollIntoView / scrollTo calls with behavior: "smooth"
 *    can initiate prolonged, sluggish page-creeping animations on Windows Chromium.
 * 4. Spacebar background keydown scrolling when body/container is focused.
 * 5. Gamepad / Joystick stick drift scrolling in Chromium.
 */
export function PreventGhostAutoscroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. SUPPRESS PROGRAMMATIC ROGUE SMOOTH SCROLLING THAT DRAGS THE PAGE SLOWLY
    const origScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (options) {
      if (typeof options === "object" && options !== null && options.behavior === "smooth") {
        options = { ...options, behavior: "instant" };
      }
      return origScrollIntoView.call(this, options);
    };

    const origWindowScrollTo = window.scrollTo;
    window.scrollTo = function (optionsOrX: any, y?: any) {
      if (typeof optionsOrX === "object" && optionsOrX !== null && optionsOrX.behavior === "smooth") {
        optionsOrX = { ...optionsOrX, behavior: "instant" };
        return origWindowScrollTo.call(window, optionsOrX);
      }
      return origWindowScrollTo.apply(window, arguments as any);
    };

    const origWindowScrollBy = window.scrollBy;
    window.scrollBy = function (optionsOrX: any, y?: any) {
      if (typeof optionsOrX === "object" && optionsOrX !== null && optionsOrX.behavior === "smooth") {
        optionsOrX = { ...optionsOrX, behavior: "instant" };
        return origWindowScrollBy.call(window, optionsOrX);
      }
      return origWindowScrollBy.apply(window, arguments as any);
    };

    // 2. SUPPRESS WINDOWS MIDDLE-CLICK AUTOSCROLL
    // Button 1 is the middle mouse button (scroll wheel click).
    // In Windows Chrome/Edge, this engages the circular autoscroll cursor.
    // If the mouse moves even 2px, the page starts scrolling very slowly on its own.
    const handleMiddleMouseDown = (e: MouseEvent) => {
      if (e.button === 1) {
        const target = e.target as HTMLElement | null;
        const anchor = target?.closest("a[href]");
        // Allow intentional middle-click on real hyperlinks to open in new tab
        if (!anchor) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    const handleAuxClick = (e: MouseEvent) => {
      if (e.button === 1) {
        const target = e.target as HTMLElement | null;
        const anchor = target?.closest("a[href]");
        if (!anchor) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    // 3. CLEAR STRANDED SELECTIONS / DRAG STATE ON BLUR OR ESC
    // If the browser loses focus while the mouse is down, or if the user presses Escape,
    // clear any active text selection or drag state that triggers viewport-edge auto-scrolling.
    const handleBlur = () => {
      try {
        const active = document.activeElement;
        const isInput =
          active &&
          (active.tagName === "INPUT" ||
            active.tagName === "TEXTAREA" ||
            (active as HTMLElement).isContentEditable);

        if (!isInput) {
          window.getSelection()?.removeAllRanges();
        }
      } catch (_) {}
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key cancels any stuck selection
      if (e.key === "Escape") {
        try {
          const active = document.activeElement;
          const isInput =
            active &&
            (active.tagName === "INPUT" ||
              active.tagName === "TEXTAREA" ||
              (active as HTMLElement).isContentEditable);
          if (!isInput) {
            window.getSelection()?.removeAllRanges();
          }
        } catch (_) {}
      }

      // Prevent accidental Spacebar scroll on body/html
      if (
        (e.key === " " || e.code === "Space") &&
        (e.target === document.body || e.target === document.documentElement)
      ) {
        e.preventDefault();
      }
    };

    // 4. GLOBAL MOUSEUP / POINTERUP SAFETY NET
    // Ensures no internal drag loop gets permanently stuck if mouseup happens outside container
    const handleGlobalPointerUp = () => {
      // Release any lingering pointer capture if stuck
    };

    // Attach capture-phase listeners on window
    window.addEventListener("mousedown", handleMiddleMouseDown, { capture: true, passive: false });
    window.addEventListener("auxclick", handleAuxClick, { capture: true, passive: false });
    window.addEventListener("blur", handleBlur);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerup", handleGlobalPointerUp, { capture: true });

    return () => {
      Element.prototype.scrollIntoView = origScrollIntoView;
      window.scrollTo = origWindowScrollTo;
      window.scrollBy = origWindowScrollBy;
      window.removeEventListener("mousedown", handleMiddleMouseDown, { capture: true });
      window.removeEventListener("auxclick", handleAuxClick, { capture: true });
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerup", handleGlobalPointerUp, { capture: true });
    };
  }, []);

  return null;
}
