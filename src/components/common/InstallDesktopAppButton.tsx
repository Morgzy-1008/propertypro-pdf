import React, { useEffect, useState } from "react";
import { Download, Monitor, CheckCircle2, FolderOpen, Cpu } from "lucide-react";
import { toast } from "sonner";
import {
  isTauriDesktop,
  getNativeDesktopInfo,
  openInWindowsExplorer,
  type DesktopSystemInfo,
} from "@/lib/tauriNativeBridge";

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
  const [isNativeTauri, setIsNativeTauri] = useState(() => isTauriDesktop());
  const [nativeInfo, setNativeInfo] = useState<DesktopSystemInfo | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Check Tauri native runtime
      const tauriActive = isTauriDesktop();
      setIsNativeTauri(tauriActive);
      if (tauriActive) {
        void getNativeDesktopInfo().then((info) => {
          if (info) setNativeInfo(info);
        });
      }

      // 1. Check if running in standalone desktop window
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
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
      };

      const handleAppInstalled = () => {
        setIsInstalled(true);
        setDeferredPrompt(null);
        toast.success("Hudson Sales Hub installed to your desktop!", {
          description: "You can now launch it directly from your Windows Taskbar or Start Menu.",
        });
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.addEventListener("appinstalled", handleAppInstalled);

      // Dev helpers for visual verification
      (window as any).__triggerInstallPromptForTesting = () => {
        setIsNativeTauri(false);
        setDeferredPrompt({
          prompt: async () => {},
          userChoice: Promise.resolve({ outcome: "accepted", platform: "windows" }),
        } as any);
      };

      (window as any).__triggerTauriNativeModeForTesting = () => {
        (window as any).__HUDSON_FORCE_NATIVE_DESKTOP__ = true;
        setIsNativeTauri(true);
        setNativeInfo({
          isNativeDesktop: true,
          appVersion: "2026.1.0",
          os: "windows",
          arch: "x86_64",
          cpuCores: 16,
          exportsRootDir: "C:\\Users\\morga\\Documents\\Hudson Homes OS",
          workspaceBackupDir: "C:\\Users\\morga\\Documents\\Hudson Homes OS\\Workspace",
        });
      };

      return () => {
        matcher.removeEventListener("change", onChange);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.removeEventListener("appinstalled", handleAppInstalled);
      };
    }
  }, []);

  // When running inside the Native Tauri Windows Desktop App, show the Native OS status & Open Exports Folder button
  if (isNativeTauri) {
    const handleOpenNativeFolder = async () => {
      const opened = await openInWindowsExplorer(nativeInfo?.exportsRootDir);
      if (opened) {
        toast.success("Opened Hudson Homes OS Folder", {
          description: nativeInfo?.exportsRootDir || "Documents\\Hudson Homes OS",
        });
      } else {
        toast.info("Hudson Homes Native Desktop OS Active", {
          description: `Exports directory: ${nativeInfo?.exportsRootDir || "Documents\\Hudson Homes OS"}`,
        });
      }
    };

    return (
      <button
        type="button"
        data-testid="tauri-native-desktop-badge"
        onClick={handleOpenNativeFolder}
        title={`Running Hudson Sales Hub Native Windows App v${nativeInfo?.appVersion || "2026.1"} (${nativeInfo?.cpuCores || 8} CPU cores). Click to open local Documents folder in Windows Explorer.`}
        className={`inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md active:scale-95 border ${
          isLight
            ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300"
            : "bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border-emerald-500/40"
        } ${className}`}
      >
        <Cpu className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
        <span className="font-extrabold tracking-tight">Native Windows OS</span>
        <span className="hidden md:inline text-[10px] opacity-75 font-mono">• Open Folder</span>
        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-amber-500" />
      </button>
    );
  }

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
          description: "Hudson Sales Hub is being pinned to your Windows desktop and taskbar.",
        });
        setDeferredPrompt(null);
      } else {
        toast.info("Installation dismissed", {
          description: "You can install Hudson Sales Hub at any time from this header.",
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
      title="Install Hudson Sales Hub to your Windows Desktop and Taskbar for instant offline access"
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
