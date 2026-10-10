import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
} from "lucide-react";
import { Logo, HudsonMark } from "@/components/flyer/FlyerTemplates";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useTheme } from "@/lib/theme";
import {
  getActiveStaffUser,
  onStaffUserChanged,
  KNOWN_STAFF_PROFILES,
  setActiveStaffUser,
  type StaffProfile,
} from "@/lib/authSession";
import { getPendingAccessRequests, getUnreadAlertCount, onAdminAlertsChanged } from "@/lib/adminAlerts";
import { StaffHeaderProfile } from "@/components/auth/StaffHeaderProfile";
import { ProfileSwitcherModal } from "@/components/auth/ProfileSwitcherModal";
import { AdminDashboardModal } from "@/components/admin/AdminDashboardModal";
import { canAccessFloorplanEditor, isMorganHales } from "@/lib/access";
import { HubAiAssistant } from "@/components/hub/HubAiAssistant";
import { isLocalhost } from "@/lib/isLocalhost";

export const Route = createFileRoute("/_authenticated/hub")({
  head: () => ({
    meta: [
      { title: "Welcome Hub | Hudson Homes Digital Builder OS" },
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

interface PortalCardProps {
  to: string;
  portalNumber: string;
  categoryBadge: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  features: string;
  actionText: string;
  glowGradient: string;
  lightBeam: string;
  innerGlow: string;
  iconColor: string;
  iconBg: string;
  badgeStyle: string;
  statusBadge?: {
    text: string;
    pulse?: boolean;
    style: string;
  };
  isLight: boolean;
  isWide?: boolean;
  isComingSoon?: boolean;
}

function PortalCard({
  to,
  portalNumber,
  categoryBadge,
  title,
  description,
  icon: Icon,
  features,
  actionText,
  glowGradient,
  lightBeam,
  innerGlow,
  iconColor,
  iconBg,
  badgeStyle,
  statusBadge,
  isLight,
  isWide = false,
  isComingSoon = false,
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
        className={`absolute -top-10 -right-10 h-44 w-44 rounded-full bg-gradient-to-br ${innerGlow} blur-3xl ${
          isComingSoon ? "opacity-10" : "opacity-20 group-hover:opacity-50"
        } transition-opacity duration-500 pointer-events-none`}
      />

      {/* Content Block */}
      <div className={`relative z-10 flex-1 ${isWide ? "lg:max-w-3xl" : ""}`}>
        {/* Top Telemetry Header */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            {/* Futuristic Glowing Icon Pod */}
            <div
              className={`h-11 w-11 rounded-xl bg-gradient-to-br ${iconBg} border flex items-center justify-center ${iconColor} ${
                isComingSoon ? "" : "group-hover:scale-110 group-hover:rotate-1"
              } transition-all duration-300 shadow-inner`}
            >
              <Icon className="h-5 w-5" />
            </div>

            {/* Portal Coordinate Telemetry */}
            <span className="font-mono text-[9px] uppercase tracking-[0.22em] font-semibold text-slate-400 group-hover:text-slate-300 transition-colors">
              {portalNumber}
            </span>
          </div>

          {/* Badges Container */}
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {isComingSoon ? (
              <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full border flex items-center gap-1 shadow-xs text-amber-400 bg-amber-500/15 border-amber-500/30 font-mono">
                <Clock className="h-3 w-3 text-amber-400 shrink-0" />
                Coming Soon
              </span>
            ) : (
              statusBadge && (
                <span
                  className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full border flex items-center gap-1 shadow-xs ${statusBadge.style}`}
                >
                  {statusBadge.pulse && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />}
                  {statusBadge.text}
                </span>
              )
            )}
            <span
              className={`text-[10px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full border font-mono ${badgeStyle}`}
            >
              {categoryBadge}
            </span>
          </div>
        </div>

        {/* Title & Description */}
        <div>
          <h2
            className={`text-lg font-extrabold tracking-tight transition-colors duration-200 ${
              isLight
                ? isComingSoon
                  ? "text-slate-800"
                  : "text-slate-900 group-hover:text-amber-700"
                : isComingSoon
                ? "text-slate-200"
                : "text-white group-hover:text-amber-200"
            }`}
          >
            {title}
          </h2>
          <p className={`mt-2 text-xs leading-relaxed ${isLight ? "text-slate-600" : "text-slate-400"} line-clamp-2`}>
            {description}
          </p>
        </div>
      </div>

      {/* Bottom Feature & Action Bar */}
      <div
        className={`relative z-10 mt-5 pt-4 border-t ${
          isLight ? "border-slate-100" : "border-slate-800/80"
        } flex items-center justify-between gap-3 text-xs ${
          isWide ? "lg:mt-0 lg:pt-0 lg:border-t-0 lg:border-l lg:border-slate-800/80 lg:pl-8 lg:flex-col lg:items-end lg:justify-center lg:gap-3" : ""
        }`}
      >
        <div className={`flex items-center gap-1.5 min-w-0 flex-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
          <span className="truncate">{features}</span>
        </div>
        {isComingSoon ? (
          <span className="font-semibold text-amber-400/80 inline-flex items-center shrink-0 pl-1 text-xs cursor-default">
            Coming Soon <Clock className="ml-1.5 h-3.5 w-3.5 shrink-0" />
          </span>
        ) : (
          <span
            className={`font-semibold ${iconColor} group-hover:translate-x-1.5 transition-transform duration-300 inline-flex items-center shrink-0 pl-1`}
          >
            {actionText} <ArrowRight className="ml-1.5 h-3.5 w-3.5 shrink-0" />
          </span>
        )}
      </div>
    </>
  );

  const cardClasses = `relative h-full rounded-[21px] p-6 sm:p-7 flex flex-col justify-between overflow-hidden transition-all duration-300 backdrop-blur-xl ${
    isLight
      ? isComingSoon
        ? "bg-white/80 text-slate-800 shadow-md shadow-slate-200/50"
        : "bg-white/88 text-slate-900 group-hover:bg-white/95 shadow-xl shadow-slate-300/40"
      : isComingSoon
      ? "bg-slate-950/78 text-slate-200 shadow-lg shadow-black/50"
      : "bg-slate-950/82 text-slate-100 group-hover:bg-slate-900/90 shadow-2xl shadow-black/80"
  } ${isWide ? "lg:flex-row lg:items-center lg:gap-8" : ""}`;

  return (
    <div
      className={`group relative flex flex-col transition-transform duration-300 ease-out ${
        isComingSoon ? "cursor-default select-none opacity-90" : "hover:-translate-y-1.5"
      } ${isWide ? "md:col-span-2 lg:col-span-3" : ""}`}
    >
      {/* Layer 1: Ambient Outer Radiant Glow */}
      <div
        className={`absolute -inset-1 rounded-[26px] bg-gradient-to-r ${glowGradient} ${
          isComingSoon ? "opacity-10 blur-md" : "opacity-20 blur-xl group-hover:opacity-75 group-hover:blur-2xl"
        } transition-all duration-500 pointer-events-none -z-10`}
      />

      {/* Layer 2: Precision Laser Perimeter Outline */}
      <div
        className={`absolute -inset-[1px] rounded-[22px] bg-gradient-to-r ${glowGradient} ${
          isComingSoon ? "opacity-20" : "opacity-35 group-hover:opacity-100"
        } transition-opacity duration-300 pointer-events-none -z-10`}
      />

      {/* Layer 3: Glassmorphic Floating Core */}
      {isComingSoon ? (
        <div
          role="button"
          aria-disabled="true"
          tabIndex={0}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className={`${cardClasses} cursor-default`}
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

    return () => {
      unsubUser();
      unsubAlerts();
    };
  }, []);

  const displayName = staffUser ? staffUser.name.split(" ")[0] : "there";
  const isLight = mode === "normal";
  const isAdmin = staffUser?.role === "admin" || staffUser?.id === "morgan-hales";
  const isMarketing = staffUser?.role === "marketing";
  const isMorgan = isMorganHales(staffUser);
  const hasFloorplanAccess = canAccessFloorplanEditor(staffUser);

  const isImpersonating =
    typeof window !== "undefined" &&
    (sessionStorage.getItem("hudson_admin_impersonator") === "morgan.hales@hudsonhomes.com.au" ||
      localStorage.getItem("hudson_admin_impersonator") === "morgan.hales@hudsonhomes.com.au");

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
      if (saved) return saved;
    }
    return "/facades/hamptons_widescreen.jpg"; // Signature Hudson Homes Hamptons Display Home (No HIA circle, clean & serene)
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

      {/* Futuristic Atmospheric Ambient Glow Orbs */}
      <div className="fixed top-8 left-1/4 w-[550px] h-[350px] bg-gradient-to-br from-amber-500/10 via-brand-gold/5 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed top-32 right-1/4 w-[500px] h-[350px] bg-gradient-to-bl from-cyan-500/10 via-blue-500/5 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed bottom-12 left-1/3 w-[600px] h-[300px] bg-gradient-to-t from-emerald-500/8 via-purple-500/5 to-transparent rounded-full blur-[150px] pointer-events-none" />

      {/* Top Navigation Bar with Optical Laser Accent */}
      <header
        className={`border-b ${
          isLight ? "border-slate-200/90 bg-white/90 shadow-xs" : "border-slate-800/80 bg-slate-950/80"
        } backdrop-blur-xl sticky top-0 z-40 transition-colors`}
      >
        <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
        <div className="w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link to="/hub" className="flex items-center">
              <HudsonMark size={9} className="sm:hidden" />
              <div className="hidden sm:block">
                <Logo light={!isLight} size={11} />
              </div>
            </Link>
            <div className={`hidden md:block border-l ${isLight ? "border-slate-300" : "border-slate-700/80"} pl-3`}>
              <span className={`text-xs font-bold tracking-widest ${isLight ? "text-slate-800" : "text-slate-300"} uppercase font-mono`}>
                Digital Builder OS
              </span>
              <span className="block text-[10px] tracking-widest text-brand-gold font-semibold uppercase">
                {staffUser?.division === "NSW" || staffUser?.state === "NSW" ? "New South Wales Division" : "Queensland Division"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
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
                onClick={() => {
                  const morgan = KNOWN_STAFF_PROFILES.find((p) => p.id === "morgan-hales");
                  if (morgan) {
                    sessionStorage.removeItem("hudson_admin_impersonator");
                    localStorage.removeItem("hudson_admin_impersonator");
                    sessionStorage.setItem(
                      "hudson_login_toast",
                      JSON.stringify({ name: "Morgan Hales", type: "returned" })
                    );
                    setActiveStaffUser(morgan, true);
                    if (morgan.division) {
                      localStorage.setItem("hudson_active_division", morgan.division);
                    }
                    window.location.href = `/hub?returned=admin&_t=${Date.now()}`;
                  }
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md hover:shadow-lg transition-all shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <UserCheck className="h-4 w-4" />
                <span>Return to Morgan Hales (Admin)</span>
              </button>
            </div>
          </div>
        )}

        {/* Welcome Greeting Header */}
        <div className="text-center max-w-5xl mx-auto mb-8 sm:mb-12 relative pt-2 sm:pt-4">
          <h1
            className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight leading-[1.12] sm:leading-[1.08] pb-4 overflow-visible ${
              isLight ? "text-slate-900" : "text-white"
            }`}
          >
            {greeting},{" "}
            <span className="relative inline-block px-2 pt-1 pb-4 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-orange-400 drop-shadow-[0_0_35px_rgba(245,158,11,0.4)] align-baseline">
              {displayName}
            </span>.
          </h1>
        </div>

        {/* Hudson Homes Personal AI Assistant with Ambient Aura */}
        <div className="w-full max-w-6xl mx-auto mb-8 relative group">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-amber-500/20 via-brand-gold/30 to-amber-500/20 opacity-25 group-hover:opacity-70 blur-xl transition-all duration-500 pointer-events-none -z-10" />
          <HubAiAssistant isLight={isLight} staffUser={staffUser} />
        </div>

        {/* Portals Grid with Futuristic Gradient Glows */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto w-full">
          {/* Portal 01: Hudson Quoting System (Accessible to all logins) */}
          <PortalCard
            to="/quote-builder"
            portalNumber="PORTAL // 01"
            categoryBadge="Estimating Engine"
            title="Hudson Quoting System"
            description="Calculate precise client tenders with dynamic m² area extensions, piering allowances, and live variation subtotals."
            icon={Layers}
            features="Delta Area Pricing • Tender PDF"
            actionText="Launch Quoting"
            glowGradient="from-emerald-400 via-teal-400 to-green-500"
            lightBeam="from-transparent via-emerald-400 to-transparent"
            innerGlow="from-emerald-500/25 to-transparent"
            iconColor="text-emerald-400"
            iconBg="from-emerald-500/20 to-teal-500/10 border-emerald-500/30"
            badgeStyle="text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
            isLight={isLight}
          />

          {/* Portal 02: Floorplan Library (Accessible to all logins) */}
          <PortalCard
            to="/floorplan-library"
            portalNumber="PORTAL // 02"
            categoryBadge="Display Suite & Catalog"
            statusBadge={{
              text: "220+ Plans • Live Pricing",
              pulse: true,
              style: "text-indigo-400 bg-indigo-500/15 border-indigo-500/30 font-mono",
            }}
            title="Floorplan Library"
            description="Scan through Hudson floorplans with clients in display homes. Filter by width, length, bedrooms, size, BTB zero-lot, and live multi-tier pricelists."
            icon={LayoutGrid}
            features="Large Client Showcase • Multi-Tier Pricing • BTB Ready"
            actionText="Open Library"
            glowGradient="from-blue-600 via-indigo-500 to-cyan-400"
            lightBeam="from-transparent via-indigo-400 to-transparent"
            innerGlow="from-indigo-500/25 to-transparent"
            iconColor="text-indigo-400"
            iconBg="from-indigo-500/20 to-blue-500/10 border-indigo-500/30"
            badgeStyle="text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
            isLight={isLight}
          />

          {/* Portal 03: House & Land Database */}
          <PortalCard
            to="/database"
            portalNumber="PORTAL // 03"
            categoryBadge="Land Inventory"
            title="House & Land Database"
            description="Search live developer estate lots, import price lists with AI parsing, and generate 1-click packages."
            icon={Database}
            features="Price List AI Import • Lot Matrix"
            actionText="Open Database"
            glowGradient="from-cyan-400 via-teal-400 to-blue-500"
            lightBeam="from-transparent via-cyan-400 to-transparent"
            innerGlow="from-cyan-500/25 to-transparent"
            iconColor="text-cyan-400"
            iconBg="from-cyan-500/20 to-blue-500/10 border-cyan-500/30"
            badgeStyle="text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
            isLight={isLight}
          />

          {/* Portal 04: House & Land Package Studio (Flyer Builder) */}
          <PortalCard
            to="/flyer"
            portalNumber="PORTAL // 04"
            categoryBadge="Flyer Builder"
            title="House & Land Package Studio"
            description="Generate branded 1-page & 2-page package brochures, social marketing tiles, and facade showcase renders."
            icon={FileText}
            features="Flyers & Social Renders • PDF Engine"
            actionText="Open Studio"
            glowGradient="from-amber-500 via-amber-400 to-orange-500"
            lightBeam="from-transparent via-amber-400 to-transparent"
            innerGlow="from-amber-500/25 to-transparent"
            iconColor="text-amber-400"
            iconBg="from-amber-500/20 to-orange-500/10 border-amber-500/30"
            badgeStyle="text-amber-400 bg-amber-500/10 border-amber-500/20"
            isLight={isLight}
          />

          {/* Portal 05: Concept Floorplan Editor (Accessible to all logins) */}
          <PortalCard
            to="/floorplan-editor"
            portalNumber="PORTAL // 05"
            categoryBadge="Concept Studio"
            title="Concept Floorplan Editor"
            description="Interact with live floorplans on a high-precision canvas, modify zone dimensions, and preview instant 3D geometry."
            icon={Sliders}
            features="Connected Web App • Live Canvas"
            actionText="Launch Editor"
            glowGradient="from-blue-500 via-indigo-500 to-violet-500"
            lightBeam="from-transparent via-indigo-400 to-transparent"
            innerGlow="from-indigo-500/25 to-transparent"
            iconColor="text-indigo-400"
            iconBg="from-blue-500/20 to-indigo-500/10 border-indigo-500/30"
            badgeStyle="text-indigo-400 bg-indigo-500/10 border-indigo-500/20"
            isLight={isLight}
          />

          {/* Portal 06: Hudson Land Scout (Only accessible by Morgan Hales; Coming Soon for others) */}
          <PortalCard
            to="/land-scout"
            portalNumber="PORTAL // 06"
            categoryBadge="Land Intelligence"
            statusBadge={{
              text: "Live Cadastre & Estates",
              pulse: true,
              style: "text-amber-400 bg-amber-500/15 border-amber-500/30 font-mono",
            }}
            title="Hudson Land Scout"
            description="Discover all available vacant subdivision blocks across QLD & NSW growth corridors, inspect cadastre boundaries, and 1-click package."
            icon={Compass}
            features="NSW & QLD Cadastre • Auto-Siting"
            actionText="Launch Land Scout"
            glowGradient="from-amber-400 via-brand-gold to-yellow-500"
            lightBeam="from-transparent via-brand-gold to-transparent"
            innerGlow="from-amber-500/30 to-transparent"
            iconColor="text-brand-gold"
            iconBg="from-amber-500/20 to-yellow-500/10 border-brand-gold/30"
            badgeStyle="text-amber-400 bg-amber-500/10 border-amber-500/20"
            isLight={isLight}
            isComingSoon={!isMorgan}
          />

          {/* Portal 07: Submit Your Tender Request (Only accessible by Morgan Hales; Coming Soon for others) */}
          <PortalCard
            to="/tender-request"
            portalNumber="PORTAL // 07"
            categoryBadge="Tender Portal"
            statusBadge={{
              text: "Tender Archive Engine",
              pulse: true,
              style: "text-amber-400 bg-amber-500/15 border-amber-500/30 font-mono",
            }}
            title="Submit Your Tender Request"
            description="Draft automated tender request packages (ATP), export OnSite ZIP archives, and sync specifications directly."
            icon={Send}
            features="OnSite Ready • ZIP Archive"
            actionText="Open Tender"
            glowGradient="from-amber-500 via-orange-500 to-rose-500"
            lightBeam="from-transparent via-orange-400 to-transparent"
            innerGlow="from-orange-500/25 to-transparent"
            iconColor="text-amber-400"
            iconBg="from-amber-500/20 to-orange-500/10 border-amber-500/30"
            badgeStyle="text-amber-400 bg-amber-500/10 border-amber-500/20"
            isLight={isLight}
            isComingSoon={!isMorgan}
          />

          {/* Portal 08: Hudson Horizon CRM (Only accessible by Morgan Hales; Coming Soon for others) */}
          <PortalCard
            to="/crm"
            portalNumber="PORTAL // 08"
            categoryBadge="Builder CRM"
            statusBadge={{
              text: "Pipeline Management",
              pulse: true,
              style: "text-purple-400 bg-purple-500/15 border-purple-500/30 font-mono",
            }}
            title="Hudson Horizon CRM"
            description="Manage client pipelines, follow up display home registrations, and forecast contract conversions across regions."
            icon={Users}
            features="Client Pipeline & Deals"
            actionText="Open CRM"
            glowGradient="from-purple-500 via-fuchsia-500 to-pink-500"
            lightBeam="from-transparent via-purple-400 to-transparent"
            innerGlow="from-purple-500/25 to-transparent"
            iconColor="text-purple-400"
            iconBg="from-purple-500/20 to-fuchsia-500/10 border-purple-500/30"
            badgeStyle="text-purple-400 bg-purple-500/10 border-purple-500/20"
            isLight={isLight}
            isComingSoon={!isMorgan}
          />


        </div>
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
              { id: "/facades/hamptons_widescreen.jpg", label: "Hamptons (Signature)" },
              { id: "/facades/riviera_widescreen.jpg", label: "Riviera (Twilight)" },
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
