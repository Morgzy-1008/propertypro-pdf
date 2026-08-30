import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  FileText,
  Database,
  Sparkles,
  ArrowRight,
  Building2,
  Layers,
  LogOut,
  CheckCircle2,
  ShieldCheck,
  Clock,
  Send,
  Sliders,
  Users,
  Award,
  Monitor,
  Building,
  Shield,
  Bell,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/flyer/FlyerTemplates";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useTheme } from "@/lib/theme";
import { getActiveStaffUser, onStaffUserChanged, isStaffSessionActive, type StaffProfile } from "@/lib/authSession";
import { getUnreadAlertCount, getPendingAccessRequests, onAdminAlertsChanged } from "@/lib/adminAlerts";
import { StaffHeaderProfile } from "@/components/auth/StaffHeaderProfile";
import { AdminDashboardModal } from "@/components/admin/AdminDashboardModal";

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

function WelcomeHubPage() {
  const { mode } = useTheme();
  const navigate = useNavigate();
  const [staffUser, setStaffUser] = useState<StaffProfile | null>(() => getActiveStaffUser());
  const [greeting, setGreeting] = useState("Good day");
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState<number>(() => getPendingAccessRequests().length);
  const [unreadAlerts, setUnreadAlerts] = useState<number>(() => getUnreadAlertCount());

  useEffect(() => {
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

  return (
    <div className={`min-h-screen ${isLight ? "bg-slate-50 text-slate-900" : "bg-slate-950 text-slate-100"} flex flex-col font-sans selection:bg-brand-gold/30`}>
      {/* Top Navigation Bar */}
      <header className={`border-b ${isLight ? "border-slate-200 bg-white/95 shadow-xs" : "border-slate-800/80 bg-slate-900/60"} backdrop-blur-md sticky top-0 z-40`}>
        <div className="w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo light={!isLight} size={11} />
            <div className={`hidden sm:block border-l ${isLight ? "border-slate-300" : "border-slate-700/80"} pl-3`}>
              <span className={`text-xs font-bold tracking-widest ${isLight ? "text-slate-800" : "text-slate-300"} uppercase`}>
                Digital Builder OS
              </span>
              <span className="block text-[10px] tracking-widest text-brand-gold-deep font-semibold uppercase">
                Queensland Division
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            <Link to="/kiosk" target="_blank">
              <Button
                variant="outline"
                size="sm"
                className={`hidden sm:flex ${isLight ? "border-cyan-200 bg-cyan-50 text-cyan-900 hover:bg-cyan-100" : "border-cyan-500/40 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/50"} text-xs gap-1.5`}
              >
                <Monitor className="h-3.5 w-3.5 text-cyan-500" />
                iPad Kiosk Mode
              </Button>
            </Link>

            {/* NHC Active Profile Pill with Website Admin button */}
            <StaffHeaderProfile isLight={isLight} />
          </div>
        </div>
      </header>

      {/* Main Hub Content */}
      <main className="flex-1 w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-10 flex flex-col justify-center">
        {/* Welcome Greeting Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-medium tracking-wide mb-3">
            <Sparkles className="h-3.5 w-3.5" /> Hudson Homes Queensland Digital Operating System
          </div>
          <h1 className={`text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
            {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-brand-gold to-amber-500">{displayName}</span>.
          </h1>
          {staffUser && (
            <div className="mt-2.5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-slate-300 text-xs font-medium shadow-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-amber-400 font-semibold">{staffUser.displayCentre}</span>
              <span className="text-slate-600">&bull;</span>
              <span className="text-slate-400">{staffUser.phone}</span>
              <span className="text-slate-600">&bull;</span>
              <span className="text-emerald-400 text-[11px] font-mono">24h Active Session</span>
            </div>
          )}
        </div>

        {/* Action / Tool Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto w-full">
          {/* Card 1: Package Studio / Flyer Builder */}
          <Link
            to="/flyer"
            className={`group relative overflow-hidden rounded-2xl border ${
              isLight
                ? "border-slate-200 bg-white shadow-xs hover:border-brand-gold/70 hover:shadow-xl hover:-translate-y-1"
                : "border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-900/40 hover:border-brand-gold/60 hover:shadow-2xl hover:shadow-brand-gold/10 hover:-translate-y-1"
            } p-6 transition-all duration-300 flex flex-col justify-between`}
          >
            <div className="absolute top-0 right-0 h-32 w-32 bg-brand-gold/5 rounded-full blur-3xl group-hover:bg-brand-gold/15 transition-all duration-500" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-brand-gold/20 to-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold group-hover:scale-110 transition-transform duration-300 shadow-inner">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-brand-gold bg-brand-gold/10 px-2.5 py-0.5 rounded-full border border-brand-gold/20">
                  Flyer Builder
                </span>
              </div>
              <h2 className={`text-lg font-bold ${isLight ? "text-slate-900 group-hover:text-amber-700" : "text-white group-hover:text-brand-gold"} transition-colors`}>
                House &amp; Land Package Studio
              </h2>
            </div>
            <div className={`mt-5 pt-4 border-t ${isLight ? "border-slate-100" : "border-slate-800/80"} flex items-center justify-between text-xs`}>
              <div className={`flex items-center gap-1.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Flyers &amp; Social Renders</span>
              </div>
              <span className="font-semibold text-brand-gold group-hover:translate-x-1 transition-transform inline-flex items-center">
                Open Studio <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </span>
            </div>
          </Link>

          {/* Card 2: House & Land Database */}
          <Link
            to="/database"
            className={`group relative overflow-hidden rounded-2xl border ${
              isLight
                ? "border-slate-200 bg-white shadow-xs hover:border-cyan-500/70 hover:shadow-xl hover:-translate-y-1"
                : "border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-900/40 hover:border-cyan-500/60 hover:shadow-2xl hover:shadow-cyan-500/10 hover:-translate-y-1"
            } p-6 transition-all duration-300 flex flex-col justify-between`}
          >
            <div className="absolute top-0 right-0 h-32 w-32 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/15 transition-all duration-500" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-500 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                  <Database className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-cyan-600 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
                  Land Inventory
                </span>
              </div>
              <h2 className={`text-lg font-bold ${isLight ? "text-slate-900 group-hover:text-cyan-700" : "text-white group-hover:text-cyan-200"} transition-colors`}>
                House &amp; Land Database
              </h2>
            </div>
            <div className={`mt-5 pt-4 border-t ${isLight ? "border-slate-100" : "border-slate-800/80"} flex items-center justify-between text-xs`}>
              <div className={`flex items-center gap-1.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                <CheckCircle2 className="h-3.5 w-3.5 text-cyan-500" />
                <span>Price List AI Import</span>
              </div>
              <span className="font-semibold text-cyan-600 group-hover:translate-x-1 transition-transform inline-flex items-center">
                Open Database <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </span>
            </div>
          </Link>

          {/* Card 3: Hudson Quoting System */}
          <Link
            to="/quote-builder"
            className={`group relative overflow-hidden rounded-2xl border ${
              isLight
                ? "border-slate-200 bg-white shadow-xs hover:border-emerald-500/70 hover:shadow-xl hover:-translate-y-1"
                : "border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-900/40 hover:border-emerald-500/60 hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1"
            } p-6 transition-all duration-300 flex flex-col justify-between`}
          >
            <div className="absolute top-0 right-0 h-32 w-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/15 transition-all duration-500" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                  <Layers className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  Estimating Engine
                </span>
              </div>
              <h2 className={`text-lg font-bold ${isLight ? "text-slate-900 group-hover:text-emerald-700" : "text-white group-hover:text-emerald-200"} transition-colors`}>
                Hudson Quoting System
              </h2>
            </div>
            <div className={`mt-5 pt-4 border-t ${isLight ? "border-slate-100" : "border-slate-800/80"} flex items-center justify-between text-xs`}>
              <div className={`flex items-center gap-1.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Delta Area Pricing</span>
              </div>
              <span className="font-semibold text-emerald-600 group-hover:translate-x-1 transition-transform inline-flex items-center">
                Launch Quoting <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </span>
            </div>
          </Link>

          {/* Card 4: Submit Your Tender Request */}
          <Link
            to="/tender-request"
            className={`group relative overflow-hidden rounded-2xl border ${
              isLight
                ? "border-slate-200 bg-white shadow-xs hover:border-amber-500/70 hover:shadow-xl hover:-translate-y-1"
                : "border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-900/40 hover:border-amber-500/60 hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-1"
            } p-6 transition-all duration-300 flex flex-col justify-between`}
          >
            <div className="absolute top-0 right-0 h-32 w-32 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/15 transition-all duration-500" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                  <Send className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-amber-400 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1 shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Under Development
                  </span>
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    Tender Portal
                  </span>
                </div>
              </div>
              <h2 className={`text-lg font-bold ${isLight ? "text-slate-900 group-hover:text-amber-700" : "text-white group-hover:text-amber-200"} transition-colors`}>
                Submit Your Tender Request
              </h2>
            </div>
            <div className={`mt-5 pt-4 border-t ${isLight ? "border-slate-100" : "border-slate-800/80"} flex items-center justify-between text-xs`}>
              <div className={`flex items-center gap-1.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-500" />
                <span>OnSite Ready • ZIP</span>
              </div>
              <span className="font-semibold text-amber-600 group-hover:translate-x-1 transition-transform inline-flex items-center">
                Open Tender <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </span>
            </div>
          </Link>

          {/* Card 5: Concept Floorplan Editor */}
          <Link
            to="/floorplan-editor"
            className={`group relative overflow-hidden rounded-2xl border ${
              isLight
                ? "border-slate-200 bg-white shadow-xs hover:border-blue-500/70 hover:shadow-xl hover:-translate-y-1"
                : "border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-900/40 hover:border-blue-500/60 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1"
            } p-6 transition-all duration-300 flex flex-col justify-between`}
          >
            <div className="absolute top-0 right-0 h-32 w-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/15 transition-all duration-500" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-500/30 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                  <Sliders className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-blue-600 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                  Concept Studio
                </span>
              </div>
              <h2 className={`text-lg font-bold ${isLight ? "text-slate-900 group-hover:text-blue-700" : "text-white group-hover:text-blue-200"} transition-colors`}>
                Concept Floorplan Editor
              </h2>
            </div>
            <div className={`mt-5 pt-4 border-t ${isLight ? "border-slate-100" : "border-slate-800/80"} flex items-center justify-between text-xs`}>
              <div className={`flex items-center gap-1.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                <span>Connected Web App</span>
              </div>
              <span className="font-semibold text-blue-600 group-hover:translate-x-1 transition-transform inline-flex items-center">
                Launch Editor <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </span>
            </div>
          </Link>

          {/* Card 6: Website Admin & Security Approvals (For Morgan Hales) OR Horizon CRM */}
          {isAdmin ? (
            <div
              onClick={() => setIsAdminModalOpen(true)}
              className={`group relative overflow-hidden rounded-2xl border cursor-pointer ${
                isLight
                  ? "border-amber-300 bg-amber-50/70 shadow-xs hover:border-amber-500 hover:shadow-xl hover:-translate-y-1"
                  : "border-amber-500/40 bg-gradient-to-b from-amber-950/40 to-slate-900/80 hover:border-amber-400 hover:shadow-2xl hover:shadow-amber-500/20 hover:-translate-y-1"
              } p-6 transition-all duration-300 flex flex-col justify-between`}
            >
              <div className="absolute top-0 right-0 h-32 w-32 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/25 transition-all duration-500" />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {pendingCount > 0 && (
                      <span className="text-[10px] font-bold tracking-wider uppercase text-amber-950 bg-amber-400 px-2 py-0.5 rounded-full animate-bounce shadow-xs">
                        {pendingCount} Pending Approval
                      </span>
                    )}
                    <span className="text-[10px] font-bold tracking-wider uppercase text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/40">
                      System Admin
                    </span>
                  </div>
                </div>
                <h2 className={`text-lg font-bold ${isLight ? "text-amber-900 group-hover:text-amber-700" : "text-amber-200 group-hover:text-amber-100"} transition-colors`}>
                  Website Admin Portal
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Manage staff logins, whitelist approvals, security alerts, and system diagnostics.
                </p>
              </div>
              <div className={`mt-5 pt-4 border-t ${isLight ? "border-amber-200" : "border-slate-800/80"} flex items-center justify-between text-xs`}>
                <div className={`flex items-center gap-1.5 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                  <UserCheck className="h-3.5 w-3.5 text-amber-400" />
                  <span>5 Authorized Staff</span>
                </div>
                <span className="font-semibold text-amber-400 group-hover:translate-x-1 transition-transform inline-flex items-center">
                  Open Admin Center <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          ) : (
            <Link
              to="/crm"
              className={`group relative overflow-hidden rounded-2xl border ${
                isLight
                  ? "border-slate-200 bg-white shadow-xs hover:border-purple-500/70 hover:shadow-xl hover:-translate-y-1"
                  : "border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-900/40 hover:border-purple-500/60 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1"
              } p-6 transition-all duration-300 flex flex-col justify-between`}
            >
              <div className="absolute top-0 right-0 h-32 w-32 bg-purple-500/5 rounded-full blur-3xl group-hover:bg-purple-500/15 transition-all duration-500" />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-500/30 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-purple-400 bg-purple-500/15 px-2.5 py-0.5 rounded-full border border-purple-500/30 flex items-center gap-1 shadow-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
                      Under Development
                    </span>
                    <span className="text-[10px] font-semibold tracking-wider uppercase text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                      Builder CRM
                    </span>
                  </div>
                </div>
                <h2 className={`text-lg font-bold ${isLight ? "text-slate-900 group-hover:text-purple-700" : "text-white group-hover:text-purple-200"} transition-colors`}>
                  Hudson Horizon CRM
                </h2>
              </div>
              <div className={`mt-5 pt-4 border-t ${isLight ? "border-slate-100" : "border-slate-800/80"} flex items-center justify-between text-xs`}>
                <div className={`flex items-center gap-1.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                  <Award className="h-3.5 w-3.5 text-purple-500" />
                  <span>$75k + 2.25% Comms</span>
                </div>
                <span className="font-semibold text-purple-600 group-hover:translate-x-1 transition-transform inline-flex items-center">
                  Open CRM <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
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

      {/* Footer Branding Bar */}
      <footer className={`border-t ${isLight ? "border-slate-200 bg-white/80 text-slate-500" : "border-slate-800/80 bg-slate-950/80 text-slate-500"} py-4 text-center text-xs`}>
        Hudson Homes Queensland • Zero Surprises • Powered by Package Studio &amp; Hudson Horizon
      </footer>
    </div>
  );
}
