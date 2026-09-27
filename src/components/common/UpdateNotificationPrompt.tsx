import React, { useEffect, useState, useCallback, useRef } from "react";
import { RefreshCw, Sparkles, X, AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UpdateNotificationPrompt() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [snoozed, setSnoozed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newVersionTime, setNewVersionTime] = useState<number | null>(null);
  const initialBuildTimeRef = useRef<number>(typeof __APP_BUILD_TIME__ === "number" ? __APP_BUILD_TIME__ : Date.now());

  // Check remote /version.json
  const checkForUpdates = useCallback(async () => {
    try {
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
        },
      });

      if (!response.ok) return;
      const data = await response.json();

      if (data && typeof data.buildTime === "number") {
        const currentLocalBuildTime = initialBuildTimeRef.current;
        // If the server buildTime is strictly newer than our initial client build time
        if (data.buildTime > currentLocalBuildTime) {
          setHasUpdate(true);
          setNewVersionTime(data.buildTime);
        }
      }
    } catch {
      // Ignore network errors during polling
    }
  }, []);

  useEffect(() => {
    // Expose testing hook for dev and automated Playwright verification
    if (typeof window !== "undefined") {
      window.__triggerUpdatePromptForTesting = (forced = true) => {
        setHasUpdate(forced);
        setSnoozed(false);
        setNewVersionTime(Date.now());
      };
      window.__getAppBuildTime = () => initialBuildTimeRef.current;
    }

    // 1. Initial check shortly after mount (after 10s)
    const initialTimer = setTimeout(() => {
      checkForUpdates();
    }, 10000);

    // 2. Periodic polling every 45 seconds
    const intervalTimer = setInterval(() => {
      checkForUpdates();
    }, 45000);

    // 3. Check on window focus and tab visibility change (natural user switch-back moment)
    const handleVisibilityOrFocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        checkForUpdates();
      }
    };

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
    };
  }, [checkForUpdates]);

  const handleHardRefresh = async () => {
    setIsRefreshing(true);

    try {
      // 1. Dispatch custom event so active forms (e.g. QuoteBuilder) can auto-save
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("hudson:before-app-refresh"));
      }

      // 2. Clear browser cache storage if available
      if (typeof window !== "undefined" && "caches" in window) {
        const cacheKeys = await window.caches.keys();
        await Promise.all(cacheKeys.map((k) => window.caches.delete(k)));
      }
    } catch {
      // Proceed even if cache clear fails
    }

    // 3. Short delay so user sees feedback, then hard refresh
    setTimeout(() => {
      if (typeof window !== "undefined") {
        // Force bypass cache reload
        window.location.reload();
      }
    }, 400);
  };

  const handleSnooze = () => {
    setSnoozed(true);
    // Snooze for 10 minutes (600,000 ms)
    setTimeout(() => {
      setSnoozed(false);
    }, 600000);
  };

  if (!hasUpdate || snoozed) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[999999] max-w-md w-[calc(100vw-2rem)] sm:w-[420px] animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
    >
      <div className="relative rounded-2xl border border-cyan-500/50 bg-slate-950/95 p-5 text-slate-100 shadow-[0_20px_60px_-15px_rgba(6,182,212,0.35)] backdrop-blur-2xl ring-1 ring-cyan-500/40">
        {/* Glow ambient background pill */}
        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-cyan-500/15 blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 text-slate-950 shadow-md">
              <Sparkles className="h-5 w-5 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-extrabold text-white tracking-wide">Website Update Deployed</h4>
                <span className="rounded-full bg-cyan-950/80 px-2 py-0.5 text-[9px] font-bold font-mono text-cyan-300 border border-cyan-700/60 uppercase">
                  New Live Release
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Hudson Digital Platform</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSnooze}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900 transition-colors"
            title="Dismiss for 10 minutes"
            aria-label="Dismiss update notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body Message */}
        <div className="mt-3.5 space-y-2 text-xs text-slate-300 relative z-10 leading-relaxed">
          <p>
            A new version of the website has just been published with updated features, bug fixes, and pricing.
          </p>
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-2.5 flex items-start gap-2 text-amber-200/90 text-[11.5px]">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Please save any active estimate or work</strong> before refreshing to ensure zero data loss.
            </span>
          </div>
          <div className="text-[11px] text-slate-300/90 font-sans flex items-center gap-1.5 pt-0.5 flex-wrap">
            <span className="text-cyan-400 font-bold">💡 Tip:</span>
            <span>
              Hard refresh with <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-cyan-200 font-mono font-bold text-[10.5px] shadow-xs">Ctrl / ⌘</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-cyan-200 font-mono font-bold text-[10.5px] shadow-xs">Shift</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-600 text-cyan-200 font-mono font-bold text-[10.5px] shadow-xs">R</kbd>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2.5 relative z-10 pt-2 border-t border-slate-800/80">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSnooze}
            disabled={isRefreshing}
            className="text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900 px-3 h-8"
          >
            Remind Me Later
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleHardRefresh}
            disabled={isRefreshing}
            className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-extrabold text-xs px-4 h-9 shadow-lg gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Hard Refreshing…" : "Hard Refresh & Update Now"}
          </Button>
        </div>
      </div>
    </div>
  );
}
