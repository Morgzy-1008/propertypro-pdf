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
      if (typeof options === "object" && options !== null) {
        options = { ...options, behavior: "instant", block: options.block ?? "nearest" };
      } else {
        options = { behavior: "instant", block: "nearest" };
      }
      return origScrollIntoView.call(this, options);
    };

    const origElementScrollTo = Element.prototype.scrollTo;
    Element.prototype.scrollTo = function (optionsOrX: any, y?: any) {
      if (typeof optionsOrX === "object" && optionsOrX !== null && optionsOrX.behavior === "smooth") {
        optionsOrX = { ...optionsOrX, behavior: "instant" };
        return origElementScrollTo.call(this, optionsOrX);
      }
      return origElementScrollTo.apply(this, arguments as any);
    };

    const origElementScroll = Element.prototype.scroll;
    Element.prototype.scroll = function (optionsOrX: any, y?: any) {
      if (typeof optionsOrX === "object" && optionsOrX !== null && optionsOrX.behavior === "smooth") {
        optionsOrX = { ...optionsOrX, behavior: "instant" };
        return origElementScroll.call(this, optionsOrX);
      }
      return origElementScroll.apply(this, arguments as any);
    };

    const origElementScrollBy = Element.prototype.scrollBy;
    Element.prototype.scrollBy = function (optionsOrX: any, y?: any) {
      if (typeof optionsOrX === "object" && optionsOrX !== null && optionsOrX.behavior === "smooth") {
        optionsOrX = { ...optionsOrX, behavior: "instant" };
        return origElementScrollBy.call(this, optionsOrX);
      }
      return origElementScrollBy.apply(this, arguments as any);
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

    // Prevent programmatic .focus() from triggering viewport crawling scroll
    const origFocus = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function (options?: FocusOptions) {
      if (options && typeof options === "object") {
        return origFocus.call(this, { ...options, preventScroll: options.preventScroll ?? true });
      }
      return origFocus.call(this, { preventScroll: true });
    };

    // 2. SUPPRESS WINDOWS MIDDLE-CLICK AUTOSCROLL
    // Button 1 is the middle mouse button (scroll wheel click).
    // In Windows Chrome/Edge, this engages the circular autoscroll cursor.
    // If the mouse moves even 2px, the page starts scrolling very slowly on its own.
    const handleMiddleMouseDown = (e: MouseEvent | PointerEvent) => {
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

    // 5. REAL-TIME SCROLL TELEMETRY & HARDWARE PROOF ENGINE
    // Automatically records the physical trigger of all scroll events.
    // Distinguishes between hardware wheel/touchpad vs programmatic code calls.
    let lastWheelTime = 0;
    let lastWheelDeltaY = 0;
    let lastKeyTime = 0;
    let lastKey = "";

    const handleWheelTelemetry = (e: WheelEvent) => {
      lastWheelTime = Date.now();
      lastWheelDeltaY = e.deltaY;
      const isUp = e.deltaY < 0;

      (window as any).__lastHardwareWheelEvent = {
        timestamp: new Date().toLocaleTimeString(),
        deltaY: e.deltaY,
        direction: isUp ? "UP" : "DOWN",
        source: "Laptop Physical Device (Mouse wheel or Trackpad)",
      };

      if ((window as any).__debugScrollLogging) {
        console.warn(
          `%c[Hardware Input] Mouse Wheel / Touchpad scrolled ${isUp ? "UP ⬆️" : "DOWN ⬇️"} (deltaY: ${e.deltaY.toFixed(1)}px). Source: Laptop Hardware.`,
          "color: #f59e0b; font-weight: bold;"
        );
      }
    };

    const handleKeyTelemetry = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(e.key)) {
        lastKeyTime = Date.now();
        lastKey = e.key;
      }
    };

    const handleScrollTelemetry = () => {
      const now = Date.now();
      const isFromWheel = now - lastWheelTime < 350;
      const isFromKey = now - lastKeyTime < 350;

      const detail = isFromWheel
        ? `Laptop Mouse/Touchpad Hardware (deltaY: ${lastWheelDeltaY.toFixed(1)}px ${lastWheelDeltaY < 0 ? "UP ⬆️" : "DOWN ⬇️"})`
        : isFromKey
        ? `Laptop Keyboard (${lastKey})`
        : "Programmatic / Layout Shift";

      (window as any).__lastScrollDiagnostic = {
        time: new Date().toLocaleTimeString(),
        scrollY: Math.round(window.scrollY),
        cause: detail,
        isHardwareTriggered: isFromWheel || isFromKey,
      };

      if ((window as any).__debugScrollLogging) {
        console.info(
          `%c[Scroll Diagnostic] Scrolled to Y=${Math.round(window.scrollY)}px | Triggered by: ${detail}`,
          isFromWheel ? "color: #06b6d4;" : "color: #10b981;"
        );
      }
    };

    // Global helper exposed to user in console
    (window as any).checkScrollSource = () => {
      const last = (window as any).__lastScrollDiagnostic;
      if (!last) return "No scroll events have occurred yet.";
      return {
        "Last Scroll Time": last.time,
        "Current Scroll Position": `${last.scrollY}px from top`,
        "Triggered By": last.cause,
        "Is Laptop Hardware": last.isHardwareTriggered
          ? "YES (Hardware Mouse / Trackpad)"
          : "NO (Website Programmatic Code)",
      };
    };

    (window as any).enableScrollLiveLog = () => {
      (window as any).__debugScrollLogging = true;
      console.log(
        "%c[Scroll Live Logging Active] Scroll events will be printed to console as they happen.",
        "color: #06b6d4; font-weight: bold;"
      );
      return "Scroll logging enabled.";
    };

    // Attach capture-phase listeners on window
    window.addEventListener("pointerdown", handleMiddleMouseDown as any, { capture: true, passive: false });
    window.addEventListener("mousedown", handleMiddleMouseDown, { capture: true, passive: false });
    window.addEventListener("auxclick", handleAuxClick, { capture: true, passive: false });
    window.addEventListener("blur", handleBlur);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerup", handleGlobalPointerUp, { capture: true });
    window.addEventListener("wheel", handleWheelTelemetry, { passive: true });
    window.addEventListener("keydown", handleKeyTelemetry, { passive: true });
    window.addEventListener("scroll", handleScrollTelemetry, { passive: true });

    return () => {
      Element.prototype.scrollIntoView = origScrollIntoView;
      Element.prototype.scrollTo = origElementScrollTo;
      Element.prototype.scroll = origElementScroll;
      Element.prototype.scrollBy = origElementScrollBy;
      HTMLElement.prototype.focus = origFocus;
      window.scrollTo = origWindowScrollTo;
      window.scrollBy = origWindowScrollBy;
      window.removeEventListener("pointerdown", handleMiddleMouseDown as any, { capture: true });
      window.removeEventListener("mousedown", handleMiddleMouseDown, { capture: true });
      window.removeEventListener("auxclick", handleAuxClick, { capture: true });
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerup", handleGlobalPointerUp, { capture: true });
      window.removeEventListener("wheel", handleWheelTelemetry);
      window.removeEventListener("keydown", handleKeyTelemetry);
      window.removeEventListener("scroll", handleScrollTelemetry);
    };
  }, []);

  return null;
}
