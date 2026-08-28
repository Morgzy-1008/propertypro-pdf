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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/flyer/FlyerTemplates";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useTheme } from "@/lib/theme";

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

function getUserDisplayName(user: any): string {
  if (!user) return "there";
  if (user.user_metadata?.full_name) {
    return user.user_metadata.full_name.split(" ")[0];
  }
  if (user.user_metadata?.name) {
    return user.user_metadata.name.split(" ")[0];
  }
  if (user.email) {
    const namePart = user.email.split("@")[0].replace(/[._-]/g, " ");
    const firstName = namePart.split(" ")[0];
    return firstName.charAt(0).toUpperCase() + firstName.slice(1);
  }
  return "there";
}

function WelcomeHubPage() {
  const { mode } = useTheme();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [greeting, setGreeting] = useState("Good day");

  useEffect(() => {
    setGreeting(getGreeting());
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const displayName = getUserDisplayName(user);
  const isLight = mode === "normal";

  return (
    <div className={`min-h-screen ${isLight ? "bg-slate-50 text-slate-900" : "bg-slate-950 text-slate-100"} flex flex-col font-sans selection:bg-brand-gold/30`}>
      {/* Top Navigation Bar */}
      <header className={`border-b ${isLight ? "border-slate-200 bg-white/95 shadow-xs" : "border-slate-800/80 bg-slate-900/60"} backdrop-blur-md sticky top-0 z-40`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
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

            <div className={`hidden md:flex items-center gap-2 text-xs ${isLight ? "text-slate-700 bg-slate-100 border-slate-200" : "text-slate-400 bg-slate-800/50 border-slate-700/50"} px-3 py-1.5 rounded-full border`}>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>{user?.email || "Authorized Staff"}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className={`text-xs ${isLight ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100" : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"}`}
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Hub Content */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-10 w-full flex flex-col justify-center">
        {/* Welcome Greeting Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-medium tracking-wide mb-3">
            <Sparkles className="h-3.5 w-3.5" /> Hudson Homes Queensland Digital Operating System
          </div>
          <h1 className={`text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
            {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-brand-gold to-amber-500">{displayName}</span>.
          </h1>
          <p className={`mt-3 text-sm sm:text-base ${isLight ? "text-slate-600" : "text-slate-400"} font-light leading-relaxed`}>
            Select a studio portal below to manage marketing flyers, concept floorplans, builder quotes, client pipelines, or OnSite tender packages.
          </p>
        </div>

        {/* 6 Primary Module Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {/* Card 1: Flyer Builder */}
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
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-brand-gold/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold group-hover:scale-110 transition-transform duration-300 shadow-inner">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-brand-gold bg-brand-gold/10 px-2.5 py-0.5 rounded-full border border-brand-gold/20">
                  Marketing Studio
                </span>
              </div>
              <h2 className={`text-lg font-bold ${isLight ? "text-slate-900 group-hover:text-amber-700" : "text-white group-hover:text-amber-200"} transition-colors`}>
                Flyer Builder
              </h2>
              
            </div>
            <div className={`mt-5 pt-4 border-t ${isLight ? "border-slate-100" : "border-slate-800/80"} flex items-center justify-between text-xs`}>
              <div className={`flex items-center gap-1.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>AI Facades &amp; Siting</span>
              </div>
              <span className="font-semibold text-brand-gold group-hover:translate-x-1 transition-transform inline-flex items-center">
                Launch <ArrowRight className="ml-1 h-3.5 w-3.5" />
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

          {/* Card 6: Hudson Horizon CRM */}
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
        </div>
      </main>

      {/* Footer Branding Bar */}
      <footer className={`border-t ${isLight ? "border-slate-200 bg-white/80 text-slate-500" : "border-slate-800/80 bg-slate-950/80 text-slate-500"} py-4 text-center text-xs`}>
        Hudson Homes Queensland • Zero Surprises • Powered by Package Studio &amp; Hudson Horizon
      </footer>
    </div>
  );
}
