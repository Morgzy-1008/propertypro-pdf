import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  FileText,
  Database,
  Sparkles,
  ArrowRight,
  Layers,
  CheckCircle2,
  ShieldCheck,
  Send,
  Sliders,
  Users,
  Compass,
  UserCheck,
  Clock,
  Trophy,
  X,
  LayoutGrid,
  Box,
  Scale,
} from "lucide-react";
import { Logo, HudsonMark } from "@/components/flyer/FlyerTemplates";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useTheme } from "@/lib/theme";
import {
  getActiveStaffUser,
  onStaffUserChanged,
  KNOWN_STAFF_PROFILES,
  setActiveStaffUser,
  returnToMorganAdmin,
  type StaffProfile,
} from "@/lib/authSession";
import { getPendingAccessRequests, getUnreadAlertCount, onAdminAlertsChanged } from "@/lib/adminAlerts";
import { StaffHeaderProfile } from "@/components/auth/StaffHeaderProfile";
import { ProfileSwitcherModal } from "@/components/auth/ProfileSwitcherModal";
import { AdminDashboardModal } from "@/components/admin/AdminDashboardModal";
import { canAccessFloorplanEditor, isMorganHales, canAccess3dStudio, canAccessFacadeGenerator } from "@/lib/access";
import { HubAiAssistant } from "@/components/hub/HubAiAssistant";
import { InstallDesktopAppButton } from "@/components/common/InstallDesktopAppButton";
import { FullscreenToggleButton } from "@/components/common/FullscreenToggleButton";
import { isLocalhost } from "@/lib/isLocalhost";

export const Route = createFileRoute("/_authenticated/hub")({
  head: () => ({
    meta: [
      { title: "Welcome Hub | Hudson Sales Hub" },
      {
        name: "description",
        content: "Staff portal for Hudson Homes QLD Package Studio, CRM, Quoting, and Concept Floorplans.",
      },
    ],
  }),
  component: WelcomeHubPage,
});

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function HouseAndLandIcon({ className }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className || ""}`}>
      <FileText className="h-4 w-4 -translate-x-0.5 text-amber-400" />
      <Database className="h-3.5 w-3.5 translate-x-1 -translate-y-1 text-cyan-400 absolute" />
    </div>
  );
}

interface PortalCardProps {
  to?: string;
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  glowGradient?: string;
  lightBeam?: string;
  innerGlow?: string;
  iconColor?: string;
  iconBg?: string;
  badgeStyle?: string;
  isLight: boolean;
  isComingSoon?: boolean;
  comingSoonLabel?: string;
  devBadgeLabel?: string;
  children?: React.ReactNode;
}

function PortalCard({
  to,
  title,
  icon: Icon,
  glowGradient = "from-amber-400 via-brand-gold to-yellow-500",
  lightBeam = "from-transparent via-amber-400 to-transparent",
  innerGlow = "from-amber-500/25 to-transparent",
  iconColor = "text-brand-gold",
  iconBg = "from-amber-500/20 to-yellow-500/10 border-brand-gold/30",
  isLight,
  isComingSoon = false,
  comingSoonLabel = "Under Development... Coming Soon",
  devBadgeLabel,
  children,
}: PortalCardProps) {
  const cardContent = (
    <>
      {/* Top Edge Laser Optical Highlight */}
      <div
        className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r ${lightBeam} ${
          isComingSoon ? "opacity-25" : "opacity-40 group-hover:opacity-100"
        } transition-opacity duration-300`}
      />

      {/* Specular Ambient Corner Bloom */}
      <div
        className={`absolute -top-10 -right-10 h-36 w-36 rounded-full bg-gradient-to-br ${innerGlow} blur-3xl ${
          isComingSoon ? "opacity-10" : "opacity-20 group-hover:opacity-50"
        } transition-opacity duration-500 pointer-events-none`}
      />

      {/* Content Block */}
      <div className="relative z-10 flex flex-col justify-between h-full">
        <div>
          {/* Top Row: Icon Pod & Action Indicator */}
          <div className="flex items-center justify-between gap-3">
            {/* Glowing Icon Pod */}
            {Icon && (
              <div
                className={`h-11 w-11 rounded-xl bg-gradient-to-br ${iconBg} border flex items-center justify-center ${iconColor} ${
                  isComingSoon ? "" : "group-hover:scale-105 group-hover:rotate-1"
                } transition-all duration-300 shadow-inner shrink-0`}
              >
                <Icon className="h-5 w-5" />
              </div>
            )}

            {/* Top-Right Indicator: Coming Soon or Dev Badge + Hover Arrow */}
            {isComingSoon ? (
              <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full border flex items-center gap-1 shadow-xs text-amber-500 bg-amber-500/15 border-amber-500/35 font-mono">
                <Clock className="h-3 w-3 text-amber-500 shrink-0" />
                {comingSoonLabel}
              </span>
            ) : !children ? (
              <div className="flex items-center gap-2">
                {devBadgeLabel && (
                  <span className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border text-amber-400 bg-amber-500/15 border-amber-500/35 font-mono">
                    {devBadgeLabel}
                  </span>
                )}
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isLight
                      ? "text-slate-400 group-hover:text-slate-900 group-hover:bg-slate-200/60"
                      : "text-slate-500 group-hover:text-white group-hover:bg-slate-800/80"
                  }`}
                >
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </div>
            ) : null}
          </div>

          {/* Title */}
          <div className="mt-3.5">
            <h2
              className={`text-base sm:text-lg font-extrabold tracking-tight transition-colors duration-200 leading-snug ${
                isLight
                  ? isComingSoon
                    ? "text-slate-600"
                    : "text-slate-900 group-hover:text-amber-700"
                  : isComingSoon
                  ? "text-slate-300"
                  : "text-white group-hover:text-amber-200"
              }`}
            >
              {title}
            </h2>
            {isComingSoon && (
              <p className="text-[11px] text-amber-500/80 font-mono mt-1">
                🔒 Locked — {comingSoonLabel}
              </p>
            )}
          </div>
        </div>

        {/* Optional Sub-Actions (e.g. for combined House & Land Studio & Database) */}
        {children && <div className="mt-3 pt-3 border-t border-slate-700/20">{children}</div>}
      </div>
    </>
  );

  const cardClasses = `relative h-full rounded-[20px] p-5 sm:p-5.5 flex flex-col justify-between overflow-hidden transition-colors duration-200 backdrop-blur-md ${
    isLight
      ? isComingSoon
        ? "bg-white/80 text-slate-800 shadow-md shadow-slate-200/50"
        : "bg-white/90 text-slate-900 group-hover:bg-white/95 shadow-xl shadow-slate-300/40"
      : isComingSoon
      ? "bg-slate-950/78 text-slate-200 shadow-lg shadow-black/50"
      : "bg-slate-950/86 text-slate-100 group-hover:bg-slate-900/92 shadow-2xl shadow-black/80"
  }`;

  return (
    <div
      className={`group relative flex flex-col transition-transform duration-200 ease-out will-change-transform ${
        isComingSoon ? "cursor-default select-none opacity-90" : "hover:-translate-y-1"
      }`}
    >
      {/* Layer 1: Ambient Outer Radiant Glow */}
      <div
        className={`absolute -inset-1 rounded-[24px] bg-gradient-to-r ${glowGradient} ${
          isComingSoon ? "opacity-10 blur-sm" : "opacity-20 blur-md group-hover:opacity-75 group-hover:blur-lg"
        } transition-opacity duration-300 pointer-events-none -z-10`}
      />

      {/* Layer 2: Precision Laser Perimeter Outline */}
      <div
        className={`absolute -inset-[1px] rounded-[21px] bg-gradient-to-r ${glowGradient} ${
          isComingSoon ? "opacity-20" : "opacity-35 group-hover:opacity-100"
        } transition-opacity duration-300 pointer-events-none -z-10`}
      />

      {/* Layer 3: Glassmorphic Floating Core */}
      {isComingSoon || children || !to ? (
        <div
          role={isComingSoon ? "button" : undefined}
          aria-disabled={isComingSoon ? "true" : undefined}
          tabIndex={isComingSoon ? 0 : undefined}
          onClick={
            isComingSoon
              ? (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toast.info(`${title} is currently Under Development... Coming Soon.`);
                }
              : undefined
          }
          className={`${cardClasses} ${isComingSoon ? "cursor-not-allowed" : ""}`}
        >
          {cardContent}
        </div>
      ) : (
        <Link to={to} className={cardClasses}>
          {cardContent}
        </Link>
      )}
    </div>
  );
}

function WelcomeHubPage() {
  const { mode } = useTheme();
  const navigate = useNavigate();
  const router = useRouter();
  const [staffUser, setStaffUser] = useState<StaffProfile | null>(() => getActiveStaffUser());
  const [greeting, setGreeting] = useState("Good day");
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isProfileSwitcherOpen, setIsProfileSwitcherOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState<number>(() => getPendingAccessRequests().length);
  const [unreadAlerts, setUnreadAlerts] = useState<number>(() => getUnreadAlertCount());

  useEffect(() => {
    // Check for login toast notification
    try {
      const rawToast = sessionStorage.getItem("hudson_login_toast");
      if (rawToast) {
        sessionStorage.removeItem("hudson_login_toast");
        const { name, type, title } = JSON.parse(rawToast);
        if (type === "new") {
          toast.success(`Welcome to Hudson Homes, ${name}!`, {
            description: "Your password is saved and your 24-hr session is active.",
          });
        } else if (type === "reset") {
          toast.success(`Welcome back, ${name}!`, {
            description: "Password reset successfully. Your session is active for 24 hours.",
          });
        } else if (type === "switched") {
          toast.success(`Switched account to ${name}`, {
            description: `Now previewing as ${title || "Colleague Profile"}.`,
          });
        } else if (type === "returned") {
          toast.success("Returned to Morgan Hales (Admin)", {
            description: "Full administrative controls restored.",
          });
        } else {
          toast.success(`Welcome back, ${name}!`, {
            description: "Authenticated successfully for the next 24 hours.",
          });
        }
      }
    } catch {}

    setGreeting(getGreeting());
    const initial = getActiveStaffUser();
    setStaffUser(initial);
    setPendingCount(getPendingAccessRequests().length);
    setUnreadAlerts(getUnreadAlertCount());

    const unsubUser = onStaffUserChanged((u) => setStaffUser(u));
    const unsubAlerts = onAdminAlertsChanged(() => {
      setPendingCount(getPendingAccessRequests().length);
      setUnreadAlerts(getUnreadAlertCount());
    });

    // Warm up primary portals in background idle time so first portal open has zero delay
    const warmupTimer = setTimeout(() => {
      try {
        router.preloadRoute({ to: "/quote-builder" as any }).catch(() => {});
        router.preloadRoute({ to: "/crm" as any }).catch(() => {});
        router.preloadRoute({ to: "/packages" as any }).catch(() => {});
        router.preloadRoute({ to: "/builder" as any }).catch(() => {});
      } catch {}
    }, 120);

    return () => {
      clearTimeout(warmupTimer);
      unsubUser();
      unsubAlerts();
    };
  }, []);

  const displayName = staffUser ? (staffUser.role === "marketing" ? staffUser.name : staffUser.name.split(" ")[0]) : "there";
  const isLight = mode === "normal";
  const isAdmin = staffUser?.role === "admin" || staffUser?.id === "morgan-hales";
  const isMarketing = staffUser?.role === "marketing";
  const isMorgan = isMorganHales(staffUser);
  const hasFloorplanAccess = canAccessFloorplanEditor(staffUser);

  const isImpersonating =
    typeof window !== "undefined" &&
    Boolean(
      sessionStorage.getItem("hudson_admin_impersonator") ||
      localStorage.getItem("hudson_admin_impersonator")
    ) &&
    !isMorganHales(staffUser);

  const [hubBgOpacity, setHubBgOpacity] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("hudson_hub_bg_opacity");
      if (saved) return parseFloat(saved);
    }
    return 0.38; // Slightly less translucent (clearer architectural display)
  });
  const [hubBgPhoto, setHubBgPhoto] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("hudson_hub_bg_photo");
      if (saved && saved !== "/facades/hamptons_widescreen.jpg") return saved;
    }
    return "/facades/bronte-garage-inside.png"; // Hudson Homes Bronte Duplex Facade
  });
  const [isTeamBgVisible, setIsTeamBgVisible] = useState<boolean>(true);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState<boolean>(false);

  return (
    <div
      className={`min-h-screen ${
        isLight ? "bg-slate-50 text-slate-900" : "bg-slate-950 text-slate-100"
      } flex flex-col font-sans selection:bg-brand-gold/30 relative overflow-x-hidden`}
    >
      {/* Hudson Homes Signature Architectural Display Home Translucent Background (16:9 Widescreen) */}
      {isTeamBgVisible && (
        <div
          className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none transition-opacity duration-700"
          style={{
            opacity: isLight ? Math.min(hubBgOpacity, 0.40) : Math.min(hubBgOpacity, 0.50),
            maskImage:
              "linear-gradient(to bottom, rgba(0,0,0,0.98) 0%, rgba(0,0,0,1) 15%, rgba(0,0,0,1) 85%, rgba(0,0,0,0.65) 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, rgba(0,0,0,0.98) 0%, rgba(0,0,0,1) 15%, rgba(0,0,0,1) 85%, rgba(0,0,0,0.65) 100%)",
          }}
        >
          {/* High-fidelity widescreen architectural photo without HIA circle */}
          <img
            src={hubBgPhoto}
            alt="Hudson Homes Signature Display Home"
            className="w-full h-full object-cover object-center filter saturate-[1.12] contrast-[1.04]"
          />
          {/* Subtle atmospheric vignette gradient overlay for text readability */}
          <div
            className={`absolute inset-0 ${
              isLight
                ? "bg-gradient-to-b from-slate-50/15 via-transparent to-slate-50/65"
                : "bg-gradient-to-b from-slate-950/25 via-slate-950/5 to-slate-950/75"
            }`}
          />
        </div>
      )}

      {/* Cybernetic Geometric Grid Background with radial fade */}
      <div
        className={`fixed inset-0 pointer-events-none ${
          isLight
            ? "bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:32px_32px] opacity-25"
            : "bg-[radial-gradient(#334155_1.2px,transparent_1.2px)] [background-size:32px_32px] opacity-20"
        }`}
        style={{
          maskImage: "radial-gradient(ellipse 65% 55% at 50% 40%, black 20%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 65% 55% at 50% 40%, black 20%, transparent 80%)",
        }}
      />

      {/* Futuristic Atmospheric Ambient Glow Orbs (GPU-accelerated zero-filter radial gradients) */}
      <div className="fixed top-0 left-1/5 w-[650px] h-[420px] bg-[radial-gradient(closest-side,rgba(245,158,11,0.11),transparent)] pointer-events-none" />
      <div className="fixed top-24 right-1/5 w-[600px] h-[420px] bg-[radial-gradient(closest-side,rgba(6,182,212,0.11),transparent)] pointer-events-none" />
      <div className="fixed bottom-4 left-1/4 w-[680px] h-[360px] bg-[radial-gradient(closest-side,rgba(16,185,129,0.08),transparent)] pointer-events-none" />

      {/* Top Navigation Bar with Optical Laser Accent */}
      <header
        className={`border-b ${
          isLight ? "border-slate-200/90 bg-white/90 shadow-xs" : "border-slate-800/80 bg-slate-950/80"
        } backdrop-blur-xl sticky top-0 z-40 transition-colors`}
      >
        <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
        <div className="w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link to="/hub" className="flex items-center gap-2.5 sm:gap-3 group">
              <HudsonMark size={10} className="transition-transform group-hover:scale-105" />
              <div className={`border-l ${isLight ? "border-slate-300" : "border-slate-700/80"} pl-2.5 sm:pl-3`}>
                <span className={`text-xs sm:text-sm font-black tracking-wider ${isLight ? "text-slate-900" : "text-white"} uppercase font-sans block leading-tight`}>
                  Hudson Sales Hub
                </span>
                <span className="block text-[10px] tracking-widest text-brand-gold font-bold uppercase">
                  {staffUser?.division === "NSW" || staffUser?.state === "NSW" ? "New South Wales Division" : "Queensland Division"}
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Install Windows Desktop App Button */}
            <InstallDesktopAppButton isLight={isLight} />

            {/* Immersive Desktop Fullscreen Mode Toggle */}
            <FullscreenToggleButton isLight={isLight} />

            <ThemeToggle />

            {/* NHC Active Profile Pill (with Website Admin button for Admins) */}
            <StaffHeaderProfile isLight={isLight} />
          </div>
        </div>
      </header>

      {/* Main Hub Content */}
      <main className="flex-1 w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-10 flex flex-col justify-center relative z-10">
        {/* Admin Impersonation Active Banner */}
        {isImpersonating && staffUser && staffUser.id !== "morgan-hales" && (
          <div className="w-full max-w-6xl mx-auto mb-6 p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500/40 text-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-sm shrink-0 shadow-sm animate-pulse">
                👁️
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-extrabold text-amber-300 uppercase tracking-wide">
                    Admin Preview Mode Active:
                  </span>
                  <span className="text-xs sm:text-sm font-black text-white bg-slate-900/90 px-2 py-0.5 rounded-md border border-slate-700 font-mono">
                    {staffUser.name}
                  </span>
                </div>
                <p className="text-[11px] text-amber-400/90 mt-0.5">
                  You are previewing this account as <strong>{staffUser.title}</strong> ({staffUser.displayCentre} • {staffUser.division || staffUser.state || "QLD"}).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              <button
                type="button"
                data-testid="banner-switch-profile-btn"
                onClick={() => setIsProfileSwitcherOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-md transition-all shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Users className="h-4 w-4 text-amber-400" />
                <span>Switch Profile</span>
              </button>
              <button
                type="button"
                data-testid="banner-return-morgan-btn"
                onClick={returnToMorganAdmin}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md hover:shadow-lg transition-all shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <UserCheck className="h-4 w-4" />
                <span>Return to Morgan Hales (Admin)</span>
              </button>
            </div>
          </div>
        )}

        {/* Welcome Greeting Header */}
        <div className="text-center max-w-5xl mx-auto mb-8 sm:mb-10 relative pt-2 sm:pt-4">
          <h1
            className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.12] sm:leading-[1.08] pb-2 overflow-visible ${
              isLight ? "text-slate-900" : "text-white"
            }`}
          >
            {greeting},{" "}
            <span className="relative inline-block px-2 pt-1 pb-2 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 drop-shadow-[0_0_35px_rgba(245,158,11,0.4)] align-baseline">
              {displayName}
            </span>.
          </h1>
          <p className={`text-sm sm:text-base font-medium max-w-xl mx-auto mt-1 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
            {isMarketing
              ? "Select your marketing workspace portal below to build flyers, manage releases, or generate custom renders."
              : "Select a Hudson workspace portal or query the intelligence copilot below."}
          </p>

          {/* Quick Profile Switcher for Morgan Hales / Admin */}
          {isMorgan && !isImpersonating && (
            <div className="mt-3.5 flex items-center justify-center gap-2">
              <button
                type="button"
                data-testid="hub-quick-switch-profile-btn"
                onClick={() => setIsProfileSwitcherOpen(true)}
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer border ${
                  isLight
                    ? "bg-amber-100/90 hover:bg-amber-200 border-amber-300 text-amber-950 shadow-amber-500/10"
                    : "bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/40 text-amber-300 shadow-amber-500/10"
                }`}
                title="Switch view to test and experience the portal as any New Home Consultant or Marketing staff member"
              >
                <Users className="h-3.5 w-3.5 text-amber-500" />
                <span>Switch Colleague Profile View</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black">
                  ADMIN
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Hudson Homes Personal AI Assistant */}
        <div className="w-full max-w-6xl mx-auto mb-8">
          <HubAiAssistant isLight={isLight} staffUser={staffUser} />
        </div>

        {/* Portals Grid with Futuristic Radiant Glows */}
        {isMarketing ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto w-full">
            {/* Portal 01: House & Land Flyer Builder */}
            <PortalCard
              to="/flyer"
              title="House & Land Flyer Builder"
              icon={FileText}
              glowGradient="from-amber-500 via-orange-400 to-amber-600"
              lightBeam="from-transparent via-amber-400 to-transparent"
              innerGlow="from-amber-500/25 to-transparent"
              iconColor="text-amber-400"
              iconBg="from-amber-500/20 to-orange-500/10 border-amber-500/30"
              isLight={isLight}
            />

            {/* Portal 02: House & Land Lot Database */}
            <PortalCard
              to="/database"
              title="House & Land Lot Database"
              icon={Database}
              glowGradient="from-cyan-400 via-teal-400 to-blue-500"
              lightBeam="from-transparent via-cyan-400 to-transparent"
              innerGlow="from-cyan-500/25 to-transparent"
              iconColor="text-cyan-400"
              iconBg="from-cyan-500/20 to-blue-500/10 border-cyan-500/30"
              isLight={isLight}
            />

            {/* Portal 03: Facade Generator */}
            <PortalCard
              to="/facade-generator"
              title="Facade Generator"
              icon={Sparkles}
              glowGradient="from-fuchsia-400 via-pink-400 to-purple-500"
              lightBeam="from-transparent via-fuchsia-400 to-transparent"
              innerGlow="from-fuchsia-500/25 via-pink-500/15 to-transparent"
              iconColor="text-fuchsia-400"
              iconBg="from-fuchsia-500/20 to-pink-500/15 border-fuchsia-500/35"
              isLight={isLight}
              isComingSoon={false}
            />
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto w-full">
          {/* Portal 01: Hudson Quoting System (Accessible to all logins) */}
          <PortalCard
            to="/quote-builder"
            title="Hudson Quoting System"
            icon={Layers}
            glowGradient="from-emerald-400 via-teal-400 to-green-500"
            lightBeam="from-transparent via-emerald-400 to-transparent"
            innerGlow="from-emerald-500/25 to-transparent"
            iconColor="text-emerald-400"
            iconBg="from-emerald-500/20 to-teal-500/10 border-emerald-500/30"
            isLight={isLight}
          />

          {/* Portal 01b: Tender Compare (Locked for everyone except Morgan Hales as "Under Development... Coming Soon") */}
          <PortalCard
            to="/tender-compare"
            title="Tender Compare"
            icon={Scale}
            glowGradient="from-amber-400 via-orange-500 to-yellow-500"
            lightBeam="from-transparent via-amber-400 to-transparent"
            innerGlow="from-amber-500/25 to-transparent"
            iconColor="text-amber-400"
            iconBg="from-amber-500/20 to-orange-500/10 border-amber-500/30"
            isLight={isLight}
            isComingSoon={!isMorgan}
            comingSoonLabel="Under Development... Coming Soon"
            devBadgeLabel="Morgan Dev Only"
          />

          {/* Portal 02: Floorplan Library (Accessible to all logins) */}
          <PortalCard
            to="/floorplan-library"
            title="Floorplan Library"
            icon={LayoutGrid}
            glowGradient="from-blue-600 via-indigo-500 to-cyan-400"
            lightBeam="from-transparent via-indigo-400 to-transparent"
            innerGlow="from-indigo-500/25 to-transparent"
            iconColor="text-indigo-400"
            iconBg="from-indigo-500/20 to-blue-500/10 border-indigo-500/30"
            isLight={isLight}
          />

          {/* Portal 03: House & Land Studio & Database (Combined Flyer Builder + Lot Database) */}
          <PortalCard
            title="House & Land Studio & Database"
            icon={HouseAndLandIcon}
            glowGradient="from-amber-500 via-teal-400 to-cyan-500"
            lightBeam="from-transparent via-amber-400 to-transparent"
            innerGlow="from-amber-500/25 via-cyan-500/15 to-transparent"
            iconColor="text-amber-400"
            iconBg="from-amber-500/20 via-teal-500/10 to-cyan-500/20 border-amber-500/30"
            isLight={isLight}
          >
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/flyer"
                className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all duration-200 group/btn shadow-xs ${
                  isLight
                    ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-500/30 hover:border-amber-500/50"
                    : "bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 hover:border-amber-500/50"
                }`}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <FileText className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">Flyer Studio</span>
                </span>
                <ArrowRight className="h-3 w-3 shrink-0 opacity-60 group-hover/btn:opacity-100 group-hover/btn:translate-x-0.5 transition-all" />
              </Link>
              <Link
                to="/database"
                className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all duration-200 group/btn shadow-xs ${
                  isLight
                    ? "bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-900 border border-cyan-500/30 hover:border-cyan-500/50"
                    : "bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 hover:border-cyan-500/50"
                }`}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Database className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                  <span className="truncate">Lot Database</span>
                </span>
                <ArrowRight className="h-3 w-3 shrink-0 opacity-60 group-hover/btn:opacity-100 group-hover/btn:translate-x-0.5 transition-all" />
              </Link>
            </div>
          </PortalCard>

          {/* Portal 04: Concept Floorplan Editor (Accessible to all logins) */}
          <PortalCard
            to="/floorplan-editor"
            title="Concept Floorplan Editor"
            icon={Sliders}
            glowGradient="from-blue-500 via-indigo-500 to-violet-500"
            lightBeam="from-transparent via-indigo-400 to-transparent"
            innerGlow="from-indigo-500/25 to-transparent"
            iconColor="text-indigo-400"
            iconBg="from-blue-500/20 to-indigo-500/10 border-indigo-500/30"
            isLight={isLight}
          />

          {/* Portal 05: Hudson Land Scout (Accessible by all Hudson Staff) */}
          <PortalCard
            to="/land-scout"
            title="Hudson Land Scout"
            icon={Compass}
            glowGradient="from-amber-400 via-brand-gold to-yellow-500"
            lightBeam="from-transparent via-brand-gold to-transparent"
            innerGlow="from-amber-500/30 to-transparent"
            iconColor="text-brand-gold"
            iconBg="from-amber-500/20 to-yellow-500/10 border-brand-gold/30"
            isLight={isLight}
            isComingSoon={false}
          />

          {/* Portal 05b: Facade Generator */}
          <PortalCard
            to="/facade-generator"
            title="Facade Generator"
            icon={Sparkles}
            glowGradient="from-cyan-400 via-amber-400 to-orange-500"
            lightBeam="from-transparent via-cyan-400 to-transparent"
            innerGlow="from-cyan-500/25 via-amber-500/15 to-transparent"
            iconColor="text-cyan-400"
            iconBg="from-cyan-500/20 to-amber-500/15 border-cyan-500/35"
            isLight={isLight}
            isComingSoon={!canAccessFacadeGenerator(staffUser)}
            comingSoonLabel="Under Development... Coming Soon"
            devBadgeLabel={isMorgan ? "Morgan Dev Only" : undefined}
          />

          {/* Portal 06: 3D Studio & Architectural Elevations (Locked for everyone except Morgan Hales as "Under Development... Coming Soon") */}
          <PortalCard
            to="/3d-studio"
            title="3D Studio & Architectural Elevations"
            icon={Box}
            glowGradient="from-amber-500 via-orange-500 to-yellow-400"
            lightBeam="from-transparent via-amber-400 to-transparent"
            innerGlow="from-amber-500/25 to-transparent"
            iconColor="text-amber-400"
            iconBg="from-amber-500/20 to-orange-500/10 border-amber-500/30"
            isLight={isLight}
            isComingSoon={!canAccess3dStudio(staffUser)}
            comingSoonLabel="Under Development... Coming Soon"
            devBadgeLabel="Morgan Dev Only"
          />

          {/* Portal 07: Submit Your Tender Request (Only accessible by Morgan Hales; Coming Soon for others) */}
          <PortalCard
            to="/tender-request"
            title="Submit Your Tender Request"
            icon={Send}
            glowGradient="from-amber-500 via-orange-500 to-rose-500"
            lightBeam="from-transparent via-orange-400 to-transparent"
            innerGlow="from-orange-500/25 to-transparent"
            iconColor="text-amber-400"
            iconBg="from-amber-500/20 to-orange-500/10 border-amber-500/30"
            isLight={isLight}
            isComingSoon={!isMorgan}
            comingSoonLabel="Under Development... Coming Soon"
            devBadgeLabel="Morgan Dev Only"
          />

          {/* Portal 08: Hudson Horizon CRM (Locked for everyone except Morgan Hales as "Under Development... Coming Soon") */}
          <PortalCard
            to="/crm"
            title="Hudson Horizon CRM"
            icon={Users}
            glowGradient="from-purple-500 via-fuchsia-500 to-pink-500"
            lightBeam="from-transparent via-purple-400 to-transparent"
            innerGlow="from-purple-500/25 to-transparent"
            iconColor="text-purple-400"
            iconBg="from-purple-500/20 to-fuchsia-500/10 border-purple-500/30"
            isLight={isLight}
            isComingSoon={!isMorgan}
            comingSoonLabel="Under Development... Coming Soon"
            devBadgeLabel="Morgan Dev Only"
          />
        </div>
        )}
      </main>

      {/* Website Admin Modal */}
      {isAdmin && (
        <AdminDashboardModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
        />
      )}

      {/* Staff Profile Switcher & Login Preview Modal */}
      <ProfileSwitcherModal
        isOpen={isProfileSwitcherOpen}
        onClose={() => setIsProfileSwitcherOpen(false)}
      />

      {/* 2026 HIA Finalist Team Photo Full Lightbox Modal */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className={`relative max-w-4xl max-h-[92vh] w-full flex flex-col items-center ${
              isLight ? "bg-white border-slate-200 shadow-2xl text-slate-900" : "bg-slate-900 border-amber-500/40 shadow-black/80 text-white"
            } border rounded-2xl overflow-hidden shadow-2xl p-4 sm:p-6`}
          >
            <div className={`w-full flex items-center justify-between pb-3 border-b ${isLight ? "border-slate-200" : "border-slate-800"}`}>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500 shrink-0" />
                <span className={`font-bold text-sm sm:text-base ${isLight ? "!text-slate-900" : "!text-white"}`}>
                  Hudson Homes 2026 HIA Finalist Team
                </span>
                <span className={`text-xs font-mono hidden sm:inline ${isLight ? "!text-amber-700 font-semibold" : "!text-amber-400"}`}>
                  NSW Region Large Builder
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsTeamModalOpen(false)}
                className={`p-1.5 rounded-lg ${isLight ? "text-slate-500 hover:text-slate-900 hover:bg-slate-100" : "text-slate-400 hover:text-white hover:bg-slate-800"} transition-colors cursor-pointer`}
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="w-full flex-1 overflow-auto flex items-center justify-center py-3">
              <img
                src="/brand/hudson-team-2026-widescreen.jpg"
                alt="Hudson Homes 2026 HIA Finalist Team"
                className="max-h-[72vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
              />
            </div>
            <div className={`w-full pt-3 border-t ${isLight ? "border-slate-200 text-slate-600" : "border-slate-800 text-slate-400"} flex items-center justify-between text-xs`}>
              <span>Celebrating our incredible Hudson Homes team across Queensland &amp; New South Wales!</span>
              <button
                type="button"
                onClick={() => setIsTeamModalOpen(false)}
                className={`px-3 py-1.5 rounded-lg ${isLight ? "bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold" : "bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium"} cursor-pointer transition-colors`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Branding Bar with Optical Laser Divider */}
      <footer
        className={`border-t ${
          isLight ? "border-slate-200/80 bg-white/70 text-slate-500" : "border-slate-800/80 bg-slate-950/70 text-slate-400"
        } py-4 text-xs relative backdrop-blur-md`}
      >
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-slate-700/40 to-transparent" />
        <div className="max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <span>
            Hudson Homes {staffUser?.division === "NSW" || staffUser?.state === "NSW" ? "New South Wales" : "Queensland"} • Powered by Package Studio &amp; Hudson Horizon
          </span>
          <div className="flex items-center gap-2 text-[11px] flex-wrap justify-center sm:justify-end">
            <span className="opacity-70">Display Home Backdrop:</span>
            {[
              { id: "/facades/bronte-garage-inside.png", label: "Bronte Duplex" },
              { id: "/facades/bronte-garage-outside.png", label: "Bronte (Outside Garages)" },
              { id: "/facades/hamptons_widescreen.jpg", label: "Hamptons" },
              { id: "/facades/riviera_widescreen.jpg", label: "Riviera" },
              { id: "/facades/aspen_widescreen.jpg", label: "Aspen" },
            ].map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setHubBgPhoto(b.id);
                  if (typeof window !== "undefined") {
                    localStorage.setItem("hudson_hub_bg_photo", b.id);
                  }
                }}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                  hubBgPhoto === b.id
                    ? isLight
                      ? "bg-amber-500/20 text-amber-900 font-bold border border-amber-400/50"
                      : "bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40"
                    : isLight
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
