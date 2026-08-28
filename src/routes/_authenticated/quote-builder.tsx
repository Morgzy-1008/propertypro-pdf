import { createFileRoute, Link } from "@tanstack/react-router";
import { QuoteBuilder } from "@/components/quoting/QuoteBuilder";
import { Logo } from "@/components/flyer/FlyerTemplates";
import { ShieldCheck, FileText, Database, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/quote-builder")({
  head: () => ({
    meta: [
      { title: "Hudson Quoting System | Technical House & Land Quoting" },
      {
        name: "description",
        content:
          "Advanced technical quoting system, custom floorplan calculator, dynamic site costs and architectural tender export for Hudson Homes Queensland.",
      },
    ],
  }),
  component: QuoteBuilderPage,
});

function QuoteBuilderPage() {
  const { mode } = useTheme();
  const isLight = mode === "normal";

  return (
    <div className={`min-h-screen ${isLight ? "bg-slate-50 text-slate-900" : "bg-slate-950 text-slate-100"} font-sans selection:bg-emerald-500/30 relative overflow-hidden flex flex-col`}>
      {/* Ambient Gradient Lights */}
      <div className="ambient-glow-gold h-96 w-96 -top-20 -right-20 pointer-events-none" />
      <div className="ambient-glow-cyan h-96 w-96 -bottom-20 -left-20 pointer-events-none" />

      {/* Top Header */}
      <header className={`border-b ${isLight ? "border-slate-200 bg-white/95 shadow-xs" : "border-slate-800 bg-slate-900/60"} backdrop-blur-md sticky top-0 z-40`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo light={!isLight} size={11} />
            <div className={`hidden sm:block border-l ${isLight ? "border-slate-300" : "border-slate-800"} pl-4`}>
              <span className={`text-xs font-bold tracking-widest ${isLight ? "text-slate-800" : "text-white"} uppercase`}>
                Hudson Quoting System
              </span>
              <span className="block text-[10px] tracking-widest text-emerald-500 font-semibold uppercase">
                Technical Pricing &amp; Tender Engine
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            <Link to="/hub">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900 gap-1.5"
              >
                <Home className="h-3.5 w-3.5" />
                Hub
              </Button>
            </Link>

            <Link to="/flyer">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white text-xs gap-1.5"
              >
                <FileText className="h-3.5 w-3.5 text-amber-400" />
                Flyer Builder
              </Button>
            </Link>

            <Link to="/database">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white text-xs gap-1.5"
              >
                <Database className="h-3.5 w-3.5 text-cyan-400" />
                Database
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Quoting Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1 relative z-10">
        <QuoteBuilder />
      </main>
    </div>
  );
}
