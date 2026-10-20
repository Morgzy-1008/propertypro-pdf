import React, { useEffect, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { toast } from "sonner";
import {
  toggleFullscreenNativeOrWeb,
  isFullscreenNativeOrWeb,
  isTauriDesktop,
} from "@/lib/tauriNativeBridge";

interface FullscreenToggleButtonProps {
  isLight?: boolean;
  className?: string;
  showText?: boolean;
}

export function FullscreenToggleButton({
  isLight = false,
  className = "",
  showText = false,
}: FullscreenToggleButtonProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    // Initial check
    void isFullscreenNativeOrWeb().then((fs) => setIsFullscreen(fs));

    const handleFsChange = () => {
      void isFullscreenNativeOrWeb().then((fs) => setIsFullscreen(fs));
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F11") {
        e.preventDefault();
        void toggleFullscreen();
      }
    };

    if (typeof window !== "undefined") {
      document.addEventListener("fullscreenchange", handleFsChange);
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("fullscreenchange", handleFsChange);
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, []);

  const toggleFullscreen = async () => {
    const nextState = await toggleFullscreenNativeOrWeb();
    setIsFullscreen(nextState);
    if (nextState) {
      toast.info("Fullscreen Mode Active", {
        description: "Press F11 or click Exit Fullscreen to restore window.",
      });
    }
  };

  return (
    <button
      type="button"
      data-testid="fullscreen-toggle-btn"
      onClick={toggleFullscreen}
      title={
        isFullscreen
          ? "Exit Fullscreen Mode (F11)"
          : isTauriDesktop()
          ? "Enter Fullscreen Mode (F11) — eliminates window chrome and titlebar"
          : "Enter Fullscreen Mode (F11)"
      }
      aria-label="Toggle Fullscreen Mode"
      className={`p-2 rounded-xl border transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
        isFullscreen
          ? "bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-xs"
          : isLight
          ? "bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-xs"
          : "bg-slate-900/90 hover:bg-slate-800 text-slate-300 border-slate-800 hover:text-white"
      } ${className}`}
    >
      {isFullscreen ? (
        <Minimize2 className="h-4 w-4 shrink-0" />
      ) : (
        <Maximize2 className="h-4 w-4 shrink-0" />
      )}
      {showText && (
        <span className="text-xs font-bold tracking-tight">
          {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        </span>
      )}
    </button>
  );
}
