import { createFileRoute, Link } from "@tanstack/react-router";
import { QuoteBuilder } from "@/components/quoting/QuoteBuilder";
import { Logo } from "@/components/flyer/FlyerTemplates";
import { ShieldCheck, FileText, Database, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30 relative overflow-hidden flex flex-col">
      {/* Ambient Gradient Lights */}
      <div className="ambient-glow-gold h-96 w-96 -top-20 -right-20 pointer-events-none" />
      <div className="ambient-glow-cyan h-96 w-96 -bottom-20 -left-20 pointer-events-none" />

      {/* Top Header */}
      <header className="glass-header sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo light size={11} />
            <div className="hidden sm:block border-l border-slate-800 pl-4">
              <span className="text-xs font-bold tracking-widest text-white uppercase">
                Hudson Quoting System
              </span>
              <span className="block text-[10px] tracking-widest text-emerald-400 font-medium uppercase">
                Technical Pricing &amp; Tender Engine
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
