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
  Radio,
} from "lucide-react";
import { Logo } from "@/components/flyer/FlyerTemplates";
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
import { AdminDashboardModal } from "@/components/admin/AdminDashboardModal";
import { canAccessFloorplanEditor } from "@/lib/access";
import { HubAiAssistant } from "@/components/hub/HubAiAssistant";

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
}: PortalCardProps) {
  return (
    <div
      className={`group relative flex flex-col transition-transform duration-300 ease-out hover:-translate-y-1.5 ${
        isWide ? "md:col-span-2 lg:col-span-3" : ""
      }`}
    >
      {/* Layer 1: Ambient Outer Radiant Glow (diffuse neon aura behind the portal) */}
      <div
        className={`absolute -inset-1 rounded-[26px] bg-gradient-to-r ${glowGradient} opacity-20 blur-xl group-hover:opacity-75 group-hover:blur-2xl transition-all duration-500 pointer-events-none -z-10`}
      />

      {/* Layer 2: Precision Laser Perimeter Outline */}
      <div
        className={`absolute -inset-[1px] rounded-[22px] bg-gradient-to-r ${glowGradient} opacity-35 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none -z-10`}
      />

      {/* Layer 3: Glassmorphic Floating Core */}
      <Link
        to={to}
        className={`relative h-full rounded-[21px] p-6 sm:p-7 flex flex-col justify-between overflow-hidden transition-all duration-300 backdrop-blur-2xl ${
          isLight
            ? "bg-white/92 text-slate-900 group-hover:bg-white shadow-xl shadow-slate-300/40"
            : "bg-slate-950/85 text-slate-100 group-hover:bg-slate-900/90 shadow-2xl shadow-black/80"
        } ${isWide ? "lg:flex-row lg:items-center lg:gap-8" : ""}`}
      >
        {/* Top Edge Laser Optical Highlight */}
        <div
          className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r ${lightBeam} opacity-40 group-hover:opacity-100 transition-opacity duration-300`}
        />

        {/* Specular Ambient Corner Bloom */}
        <div
          className={`absolute -top-10 -right-10 h-44 w-44 rounded-full bg-gradient-to-br ${innerGlow} blur-3xl opacity-20 group-hover:opacity-50 transition-opacity duration-500 pointer-events-none`}
        />

        {/* Content Block */}
        <div className={`relative z-10 flex-1 ${isWide ? "lg:max-w-3xl" : ""}`}>
          {/* Top Telemetry Header */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-3">
              {/* Futuristic Glowing Icon Pod */}
              <div
                className={`h-11 w-11 rounded-xl bg-gradient-to-br ${iconBg} border flex items-center justify-center ${iconColor} group-hover:scale-110 group-hover:rotate-1 transition-all duration-300 shadow-inner`}
              >
                <Icon className="h-5 w-5" />
              </div>

              {/* Portal Coordinate Telemetry */}
              <span className="font-mono text-[9px] uppercase tracking-[0.22em] font-semibold text-slate-400 group-hover:text-white transition-colors">
                {portalNumber}
              </span>
            </div>

            {/* Badges Container */}
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {statusBadge && (
                <span
                  className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full border flex items-center gap-1 shadow-xs ${statusBadge.style}`}
                >
                  {statusBadge.pulse && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />}
                  {statusBadge.text}
                </span>
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
                isLight ? "text-slate-900 group-hover:text-amber-700" : "text-white group-hover:text-amber-200"
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
          } flex items-center justify-between text-xs ${
            isWide ? "lg:mt-0 lg:pt-0 lg:border-t-0 lg:border-l lg:border-slate-800/80 lg:pl-8 lg:flex-col lg:items-end lg:justify-center lg:gap-3" : ""
          }`}
        >
          <div className={`flex items-center gap-1.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
            <span className="truncate">{features}</span>
          </div>
          <span
            className={`font-semibold ${iconColor} group-hover:translate-x-1.5 transition-transform duration-300 inline-flex items-center shrink-0`}
          >
            {actionText} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </span>
        </div>
      </Link>
    </div>
  );
}

function WelcomeHubPage() {
  const { mode } = useTheme();
  const navigate = useNavigate();
  const [staffUser, setStaffUser] = useState<StaffProfile | null>(() => getActiveStaffUser());
  const [greeting, setGreeting] = useState("Good day");
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
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
  const isMorgan =
    staffUser?.id === "morgan-hales" ||
    staffUser?.email?.toLowerCase() === "morgan.hales@hudsonhomes.com.au" ||
    staffUser?.email?.toLowerCase().includes("morgan.hales") ||
    staffUser?.name?.toLowerCase().includes("morgan hales");
  const hasFloorplanAccess = canAccessFloorplanEditor(staffUser);

  const isImpersonating =
    typeof window !== "undefined" &&
    (sessionStorage.getItem("hudson_admin_impersonator") === "morgan.hales@hudsonhomes.com.au" ||
      localStorage.getItem("hudson_admin_impersonator") === "morgan.hales@hudsonhomes.com.au");

  return (
    <div
      className={`min-h-screen ${
        isLight ? "bg-slate-50 text-slate-900" : "bg-slate-950 text-slate-100"
      } flex flex-col font-sans selection:bg-brand-gold/30 relative overflow-x-hidden`}
    >
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
        <div className="w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo light={!isLight} size={11} />
            <div className={`hidden sm:block border-l ${isLight ? "border-slate-300" : "border-slate-700/80"} pl-3`}>
              <span className={`text-xs font-bold tracking-widest ${isLight ? "text-slate-800" : "text-slate-300"} uppercase font-mono`}>
                Digital Builder OS
              </span>
              <span className="block text-[10px] tracking-widest text-brand-gold font-semibold uppercase">
                Queensland Division
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
            <button
              type="button"
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
        )}

        {/* Welcome Greeting Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 relative">
          {/* Futuristic System Tag */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500/10 via-brand-gold/15 to-amber-500/10 border border-brand-gold/30 text-brand-gold text-[11px] font-mono tracking-widest uppercase mb-4 shadow-sm backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-brand-gold animate-pulse" />
            <span>HUDSON HOMES // DIGITAL BUILDER OS</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
          </div>

          <h1
            className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight ${
              isLight ? "text-slate-900" : "text-white"
            }`}
          >
            {greeting},{" "}
            <span className="relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-orange-400 drop-shadow-[0_0_25px_rgba(245,158,11,0.35)]">
              {displayName}
            </span>.
          </h1>

          {/* Futuristic Telemetry HUD Capsule */}
          {staffUser && (
            <div
              className={`mt-4 inline-flex flex-wrap items-center justify-center gap-2.5 px-4 py-1.5 rounded-full border shadow-lg backdrop-blur-xl ${
                isLight
                  ? "bg-white/90 border-slate-200/90 text-slate-700"
                  : "bg-slate-900/80 border-slate-800/90 text-slate-300 shadow-black/50"
              }`}
            >
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
                <span className="text-emerald-400 font-bold tracking-wider uppercase">NODE ONLINE</span>
              </span>
              <span className="text-slate-600 font-mono">|</span>
              <span className="text-amber-400 font-semibold text-xs tracking-wide">{staffUser.displayCentre}</span>
              <span className="text-slate-600 font-mono">|</span>
              <span className="text-slate-400 text-xs font-mono">{staffUser.phone}</span>
              <span className="text-slate-600 font-mono">|</span>
              <span className="text-cyan-400 text-[11px] font-mono uppercase tracking-wider font-semibold">
                24H ACTIVE SESSION
              </span>
            </div>
          )}

          {isAdmin && (
            <div className="mt-3.5 flex items-center justify-center">
              <button
                type="button"
                onClick={() => setIsAdminModalOpen(true)}
                className={`group relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all text-xs font-semibold shadow-md cursor-pointer overflow-hidden ${
                  isLight
                    ? "bg-amber-100/90 border-amber-300 text-amber-950 hover:bg-amber-200 hover:border-amber-400 hover:shadow-amber-500/20"
                    : "bg-gradient-to-r from-amber-950/70 via-slate-900/90 to-amber-950/70 border-amber-500/40 text-amber-300 hover:border-amber-400 hover:text-amber-200 hover:shadow-lg hover:shadow-amber-500/20"
                }`}
              >
                <ShieldCheck className="h-3.5 w-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="tracking-wide">Website Admin Portal &amp; Security Controls</span>
                {pendingCount > 0 && (
                  <span className="px-2 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black animate-pulse">
                    {pendingCount} Pending
                  </span>
                )}
                <ArrowRight className="h-3 w-3 text-amber-400 ml-0.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}
        </div>

        {/* Hudson Homes Personal AI Assistant with Ambient Aura */}
        <div className="w-full max-w-6xl mx-auto mb-8 relative group">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-amber-500/20 via-brand-gold/30 to-amber-500/20 opacity-25 group-hover:opacity-70 blur-xl transition-all duration-500 pointer-events-none -z-10" />
          <HubAiAssistant isLight={isLight} staffUser={staffUser} />
        </div>

        {/* Portals Grid with Futuristic Gradient Glows */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto w-full">
          {/* Portal 01: House & Land Package Studio (Flyer Builder) */}
          <PortalCard
            to="/flyer"
            portalNumber="PORTAL // 01"
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

          {/* Portal 02: House & Land Database */}
          <PortalCard
            to="/database"
            portalNumber="PORTAL // 02"
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

          {/* Portal 03: Hudson Quoting System (Restricted from Marketing Team) */}
          {!isMarketing && (
            <PortalCard
              to="/quote-builder"
              portalNumber="PORTAL // 03"
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
          )}

          {/* Portal 04: Concept Floorplan Editor (Allowed Staff) */}
          {hasFloorplanAccess && (
            <PortalCard
              to="/floorplan-editor"
              portalNumber="PORTAL // 04"
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
          )}

          {/* Portal 05: Submit Your Tender Request (Restricted to Morgan Hales) */}
          {isMorgan && (
            <PortalCard
              to="/tender-request"
              portalNumber="PORTAL // 05"
              categoryBadge="Tender Portal"
              statusBadge={{
                text: "Under Development",
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
            />
          )}

          {/* Portal 06: Hudson Horizon CRM (Restricted to Morgan Hales) */}
          {isMorgan && (
            <PortalCard
              to="/crm"
              portalNumber="PORTAL // 06"
              categoryBadge="Builder CRM"
              statusBadge={{
                text: "Under Development",
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
            />
          )}

          {/* Portal 07: Hudson Site Studio (Flagship Siting Engine - Restricted to Morgan Hales) */}
          {isMorgan && (
            <PortalCard
              to="/site-studio"
              portalNumber="PORTAL // 07"
              categoryBadge="Siting Studio"
              statusBadge={{
                text: "Archistar Replacement",
                pulse: false,
                style: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30 font-mono",
              }}
              title="Hudson Site Studio"
              description="Full 1:200 cadastre lot siting, building envelope setbacks, easement snapping, PDF export, and interactive lot orientation."
              icon={Compass}
              features="1:200 Cadastre Siting • Vector Canvas"
              actionText="Launch Site Studio"
              glowGradient="from-emerald-400 via-teal-400 to-cyan-500"
              lightBeam="from-transparent via-teal-400 to-transparent"
              innerGlow="from-teal-500/25 to-transparent"
              iconColor="text-teal-400"
              iconBg="from-emerald-500/20 to-teal-500/10 border-emerald-500/30"
              badgeStyle="text-teal-400 bg-teal-500/10 border-teal-500/20"
              isLight={isLight}
              isWide={true}
            />
          )}
        </div>
      </main>

      {/* Website Admin Modal */}
      {isAdmin && (
        <AdminDashboardModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
        />
      )}

      {/* Footer Branding Bar with Optical Laser Divider */}
      <footer
        className={`border-t ${
          isLight ? "border-slate-200/80 bg-white/70 text-slate-500" : "border-slate-800/80 bg-slate-950/70 text-slate-500"
        } py-4 text-center text-xs relative backdrop-blur-md`}
      >
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-slate-700/40 to-transparent" />
        Hudson Homes Queensland • Zero Surprises • Powered by Package Studio &amp; Hudson Horizon
      </footer>
    </div>
  );
}
