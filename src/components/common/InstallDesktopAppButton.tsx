import React, { useEffect, useState } from "react";
import { Download, Monitor, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface InstallDesktopAppButtonProps {
  isLight?: boolean;
  className?: string;
  forceVisibleForDev?: boolean;
}

export function InstallDesktopAppButton({
  isLight = false,
  className = "",
  forceVisibleForDev = false,
}: InstallDesktopAppButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Check if running in standalone desktop window
    if (typeof window !== "undefined") {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes("android-app://");
      setIsStandalone(isStandaloneMode);

      // Listen for display-mode changes
      const matcher = window.matchMedia("(display-mode: standalone)");
      const onChange = (e: MediaQueryListEvent) => setIsStandalone(e.matches);
      matcher.addEventListener("change", onChange);

      // 2. Listen for Chrome/Edge PWA install prompt
      const handleBeforeInstallPrompt = (e: Event) => {
        // Prevent default mini-infobar on mobile/desktop
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
      };

      const handleAppInstalled = () => {
        setIsInstalled(true);
        setDeferredPrompt(null);
        toast.success("Hudson Homes OS installed to your desktop!", {
          description: "You can now launch it directly from your Windows Taskbar or Start Menu.",
        });
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.addEventListener("appinstalled", handleAppInstalled);

      // Dev helper for visual testing
      (window as any).__triggerInstallPromptForTesting = () => {
        setDeferredPrompt({
          prompt: async () => {},
          userChoice: Promise.resolve({ outcome: "accepted", platform: "windows" }),
        } as any);
      };

      return () => {
        matcher.removeEventListener("change", onChange);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.removeEventListener("appinstalled", handleAppInstalled);
      };
    }
  }, []);

  // Do not show if already running inside the installed standalone desktop app
  if (isStandalone && !forceVisibleForDev) {
    return null;
  }

  // Only render if browser fired beforeinstallprompt or explicitly forced for dev/preview
  if (!deferredPrompt && !forceVisibleForDev) {
    return null;
  }

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast.info("Desktop App Installation", {
        description: "To install, click the Install App icon in your Chrome/Edge browser address bar.",
      });
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        toast.success("Installation started", {
          description: "Hudson OS is being pinned to your Windows desktop and taskbar.",
        });
        setDeferredPrompt(null);
      } else {
        toast.info("Installation dismissed", {
          description: "You can install Hudson Homes OS at any time from this header.",
        });
      }
    } catch (err) {
      console.warn("[PWA Install Error]", err);
    }
  };

  if (isInstalled) {
    return (
      <div
        className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
          isLight
            ? "bg-emerald-50 text-emerald-700 border border-emerald-300"
            : "bg-emerald-950/60 text-emerald-300 border border-emerald-500/40"
        } ${className}`}
      >
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        <span>Desktop App Installed</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      data-testid="pwa-install-desktop-btn"
      onClick={handleInstallClick}
      title="Install Hudson Homes OS to your Windows Desktop and Taskbar for instant offline access"
      className={`inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg active:scale-95 border ${
        isLight
          ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 border-amber-400/80 shadow-amber-500/20"
          : "bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 border-amber-300/80 shadow-amber-500/30"
      } ${className}`}
    >
      <Monitor className="h-3.5 w-3.5 shrink-0 text-slate-950" />
      <span className="font-extrabold tracking-tight">Install Desktop App</span>
      <Download className="h-3 w-3 shrink-0 opacity-70" />
    </button>
  );
}
