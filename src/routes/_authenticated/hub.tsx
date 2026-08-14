import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FileText, Database, Sparkles, ArrowRight, Building2, Layers, LogOut, CheckCircle2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/flyer/FlyerTemplates";

export const Route = createFileRoute("/_authenticated/hub")({
  head: () => ({
    meta: [
      { title: "Welcome Hub | Hudson Homes Package Studio" },
      {
        name: "description",
        content: "Staff portal for Hudson Homes QLD Package Studio and Flyer Builder.",
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
                Package Studio
              </span>
              <span className="block text-[10px] tracking-widest text-brand-gold font-medium uppercase">
                Queensland Division
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
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
      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full flex flex-col justify-center">
        {/* Welcome Greeting Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-medium tracking-wide mb-4">
            <Sparkles className="h-3.5 w-3.5" /> Hudson Homes Digital Hub
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-brand-gold to-amber-400">{displayName}</span>.
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-400 font-light leading-relaxed">
            Where would you like to start today?
          </p>
        </div>

        {/* Primary Module Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto w-full">
          {/* Card 1: Flyer Builder */}
          <Link
            to="/flyer"
            className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-900/40 p-8 transition-all duration-300 hover:border-brand-gold/60 hover:shadow-2xl hover:shadow-brand-gold/10 hover:-translate-y-1"
          >
            <div className="absolute top-0 right-0 h-32 w-32 bg-brand-gold/5 rounded-full blur-3xl group-hover:bg-brand-gold/15 transition-all duration-500" />
            
            <div className="flex items-center justify-between mb-6">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-brand-gold/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold group-hover:scale-110 transition-transform duration-300 shadow-inner">
                <FileText className="h-7 w-7" />
              </div>
              <span className="text-xs font-semibold tracking-wider uppercase text-brand-gold bg-brand-gold/10 px-3 py-1 rounded-full border border-brand-gold/20">
                Studio
              </span>
            </div>

            <h2 className="text-2xl font-bold text-white group-hover:text-amber-200 transition-colors">
              Flyer Builder
            </h2>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed min-h-[56px]">
              Design and export print-ready 1-page Express, 2-page Showcase, and House-Only flyers with widescreen facade renders, pricing calculations, and floorplans.
            </p>

            <div className="mt-6 pt-6 border-t border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>AI Facades &amp; Floorplans</span>
              </div>
              <span className="inline-flex items-center text-xs font-semibold text-brand-gold group-hover:translate-x-1 transition-transform">
                Launch Studio <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </span>
            </div>
          </Link>

          {/* Card 2: House & Land Database */}
          <Link
            to="/database"
            className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-900/40 p-8 transition-all duration-300 hover:border-cyan-500/60 hover:shadow-2xl hover:shadow-cyan-500/10 hover:-translate-y-1"
          >
            <div className="absolute top-0 right-0 h-32 w-32 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/15 transition-all duration-500" />
            
            <div className="flex items-center justify-between mb-6">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                <Database className="h-7 w-7" />
              </div>
              <span className="text-xs font-semibold tracking-wider uppercase text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                Database
              </span>
            </div>

            <h2 className="text-2xl font-bold text-white group-hover:text-cyan-200 transition-colors">
              House &amp; Land Database
            </h2>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed min-h-[56px]">
              Explore active QLD land estates, import developer price lists via automated AI parsing, manage packages, and export instant flyers.
            </p>

            <div className="mt-6 pt-6 border-t border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
                <span>Price List AI Import</span>
              </div>
              <span className="inline-flex items-center text-xs font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform">
                Open Database <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </span>
            </div>
          </Link>
        </div>

        {/* Future expansion slot */}
        <div className="mt-12 text-center text-xs text-slate-500">
          Hudson Homes Queensland · Zero Surprises · Powered by Package Studio
        </div>
      </main>
    </div>
  );
}
