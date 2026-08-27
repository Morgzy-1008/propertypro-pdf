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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-brand-gold/30">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo light size={11} />
            <div className="hidden sm:block border-l border-slate-700/80 pl-3">
              <span className="text-xs font-bold tracking-widest text-slate-300 uppercase">
                Digital Builder OS
              </span>
              <span className="block text-[10px] tracking-widest text-brand-gold font-medium uppercase">
                Queensland Division
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/kiosk" target="_blank">
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex border-cyan-500/40 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/50 text-xs gap-1.5"
              >
                <Monitor className="h-3.5 w-3.5 text-cyan-400" />
                iPad Kiosk Mode
              </Button>
            </Link>

            <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700/50">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>{user?.email || "Authorized Staff"}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800"
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
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-brand-gold to-amber-400">{displayName}</span>.
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-400 font-light leading-relaxed">
            Select a studio portal below to manage marketing flyers, concept floorplans, builder quotes, client pipelines, or OnSite tender packages.
          </p>
        </div>

        {/* 6 Primary Module Action Cards - 3 Columns on Large Screens */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {/* Card 1: Flyer Builder */}
          <Link
            to="/flyer"
            className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-900/40 p-6 transition-all duration-300 hover:border-brand-gold/60 hover:shadow-2xl hover:shadow-brand-gold/10 hover:-translate-y-1 flex flex-col justify-between"
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
              <h2 className="text-lg font-bold text-white group-hover:text-amber-200 transition-colors">
                Flyer Builder
              </h2>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed min-h-[44px]">
                1-page Express, 2-page Showcase with 1:200 Siting Plans, widescreen facade renders, pricing formulas, and high-res print export.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
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
            className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-900/40 p-6 transition-all duration-300 hover:border-cyan-500/60 hover:shadow-2xl hover:shadow-cyan-500/10 hover:-translate-y-1 flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 h-32 w-32 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/15 transition-all duration-500" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                  <Database className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
                  Land Inventory
                </span>
              </div>
              <h2 className="text-lg font-bold text-white group-hover:text-cyan-200 transition-colors">
                House &amp; Land Database
              </h2>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed min-h-[44px]">
                Explore active QLD land estates, import developer price lists via automated AI parsing, manage packages, and export instant flyers.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
                <span>Price List AI Import</span>
              </div>
              <span className="font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform inline-flex items-center">
                Open Database <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </span>
            </div>
          </Link>

          {/* Card 3: Hudson Quoting System */}
          <Link
            to="/quote-builder"
            className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-900/40 p-6 transition-all duration-300 hover:border-emerald-500/60 hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1 flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 h-32 w-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/15 transition-all duration-500" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                  <Layers className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  Estimating Engine
                </span>
              </div>
              <h2 className="text-lg font-bold text-white group-hover:text-emerald-200 transition-colors">
                Hudson Quoting System
              </h2>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed min-h-[44px]">
                Technical Builders Estimate engine, H1/H2/H3 inclusions, site earthworks &amp; slope formulas, driveway &amp; porch paths, and 5-page PDF export.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Delta Area Pricing</span>
              </div>
              <span className="font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform inline-flex items-center">
                Launch Quoting <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </span>
            </div>
          </Link>

          {/* Card 4: Submit Your Tender Request */}
          <Link
            to="/tender-request"
            className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-900/40 p-6 transition-all duration-300 hover:border-amber-500/60 hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-1 flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 h-32 w-32 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/15 transition-all duration-500" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                  <Send className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  Tender Portal
                </span>
              </div>
              <h2 className="text-lg font-bold text-white group-hover:text-amber-200 transition-colors">
                Submit Your Tender Request
              </h2>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed min-h-[44px]">
                Full Itemized Estimate with SQM breakdowns, digital ATP e-signing, Draftsmen Variations directive, and standardized Job Folder ZIP packaging.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>OnSite Ready &bull; ZIP</span>
              </div>
              <span className="font-semibold text-amber-400 group-hover:translate-x-1 transition-transform inline-flex items-center">
                Open Tender <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </span>
            </div>
          </Link>

          {/* Card 5: Foresight Concept Floorplan Editor */}
          <Link
            to="/floorplan-editor"
            className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-900/40 p-6 transition-all duration-300 hover:border-cyan-500/60 hover:shadow-2xl hover:shadow-cyan-500/10 hover:-translate-y-1 flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 h-32 w-32 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/15 transition-all duration-500" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                  <Sliders className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-cyan-300 bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-800/60">
                  Concept Studio
                </span>
              </div>
              <h2 className="text-lg font-bold text-white group-hover:text-cyan-200 transition-colors">
                Concept Floorplan Editor
              </h2>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed min-h-[44px]">
                Foresight Home Planning 2D architectural editor. Custom wall layout changes, room expansions, and 1-click bridge to Quoting &amp; Tenders.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-cyan-400 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Connected Web App</span>
              </div>
              <span className="font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform inline-flex items-center">
                Launch Editor <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </span>
            </div>
          </Link>

          {/* Card 6: Hudson Horizon CRM & Commission Engine */}
          <Link
            to="/crm"
            className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-900/40 p-6 transition-all duration-300 hover:border-purple-500/60 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-1 flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 h-32 w-32 bg-purple-500/5 rounded-full blur-3xl group-hover:bg-purple-500/15 transition-all duration-500" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                  <Users className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-semibold tracking-wider uppercase text-purple-300 bg-purple-950/80 px-2.5 py-0.5 rounded-full border border-purple-800/60">
                  Builder CRM
                </span>
              </div>
              <h2 className="text-lg font-bold text-white group-hover:text-purple-200 transition-colors">
                Hudson Horizon CRM
              </h2>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed min-h-[44px]">
                Native Honey CRM replacement. Sales pipeline Kanban, 360° lead profiles, 1:200 Siting Studio, and 2.25% consultant commission forecasting.
              </p>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-purple-400 font-medium">
                <Award className="h-3.5 w-3.5" />
                <span>$75k + 2.25% Comms</span>
              </div>
              <span className="font-semibold text-purple-400 group-hover:translate-x-1 transition-transform inline-flex items-center">
                Open CRM <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </span>
            </div>
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-slate-500">
          Hudson Homes Queensland &bull; Zero Surprises &bull; Powered by Package Studio &amp; Hudson Horizon
        </div>
      </main>
    </div>
  );
}
