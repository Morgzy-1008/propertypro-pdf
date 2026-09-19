import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Cpu,
  Home,
  Database,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/flyer/FlyerTemplates";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { StaffHeaderProfile } from "@/components/auth/StaffHeaderProfile";
import { useTheme } from "@/lib/theme";
import { QuoteBuilder } from "@/components/quoting/QuoteBuilder";
import { QuoteAdminCatalogue } from "@/components/quoting/QuoteAdminCatalogue";

export function QuoteBuilderV2() {
  const { mode } = useTheme();
  const isLight = mode === "normal";
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  return (
    <div className={`min-h-screen ${isLight ? "bg-slate-50 text-slate-900" : "bg-slate-950 text-slate-100"} font-sans selection:bg-cyan-500/30 relative overflow-hidden flex flex-col`}>
      {/* Ambient Gradient Lights */}
      <div className="ambient-glow-cyan h-96 w-96 -top-20 -right-20 pointer-events-none opacity-40" />
      <div className="ambient-glow-gold h-96 w-96 -bottom-20 -left-20 pointer-events-none opacity-30" />

      {/* Top Header */}
      <header className={`border-b ${isLight ? "border-slate-200 bg-white/95 shadow-xs" : "border-slate-800 bg-slate-900/60"} backdrop-blur-md sticky top-0 z-40`}>
        <div className="w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo light={!isLight} size={11} />
            <div className={`hidden sm:block border-l ${isLight ? "border-slate-300" : "border-slate-800"} pl-4`}>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold tracking-widest ${isLight ? "text-slate-800" : "text-white"} uppercase`}>
                  Hudson Quoting System
                </span>
                <span className="text-[10px] font-bold tracking-wider uppercase text-cyan-400 bg-cyan-500/15 px-2 py-0.5 rounded-full border border-cyan-500/30 flex items-center gap-1 shadow-xs">
                  <Cpu className="h-3 w-3 text-cyan-400" />
                  v2 Automated Pricing
                </span>
              </div>
              <span className="block text-[10px] tracking-widest text-cyan-600 dark:text-cyan-400 font-semibold uppercase">
                Modified Floorplan Recognition &bull; Autonomous Site &amp; Inclusions Engine
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            <Link to="/hub">
              <Button
                variant="ghost"
                size="sm"
                className={`text-xs ${isLight ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100" : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"} gap-1.5`}
              >
                <Home className="h-3.5 w-3.5" />
                Hub
              </Button>
            </Link>

            <Link to="/quote-builder">
              <Button
                variant="outline"
                size="sm"
                className={`text-xs gap-1.5 ${isLight ? "border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700" : "border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white"}`}
              >
                <Layers className="h-3.5 w-3.5 text-emerald-500" />
                Quoting Tool v1
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdminOpen(true)}
              className={`text-xs gap-1.5 ${isLight ? "border-slate-300 bg-white hover:bg-slate-100 text-slate-700" : "border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white"}`}
            >
              <Database className="h-3.5 w-3.5 text-amber-400" />
              Cost Recipes (Databuild)
            </Button>

            {/* NHC Active Profile */}
            <StaffHeaderProfile isLight={isLight} />
          </div>
        </div>
      </header>

      {/* Main Quoting Workspace */}
      <main className="w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-6 flex-1 relative z-10 flex flex-col">
        {/* Live Interactive Quoting Tool with integrated Page 2 Modified Plan Recognition & Recipe Engine */}
        <section className="flex-1">
          <QuoteBuilder />
        </section>
      </main>

      {/* Admin Cost Recipe Catalogue Modal */}
      {isAdminOpen && (
        <QuoteAdminCatalogue
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
        />
      )}
    </div>
  );
}
