import { createFileRoute, Link } from "@tanstack/react-router";
import { ForesightEditorFrame } from "@/components/floorplan-editor/ForesightEditorFrame";
import { Logo } from "@/components/flyer/FlyerTemplates";
import { Home, Layers, Database, FileText, Send, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/floorplan-editor")({
  head: () => ({
    meta: [
      { title: "Foresight Concept Floorplan Editor | Hudson Homes" },
      {
        name: "description",
        content: "Interactive 2D Concept Floorplan Planning and Architectural Modification Studio.",
      },
    ],
  }),
  component: ForesightEditorPage,
});

function ForesightEditorPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500/30 relative overflow-hidden flex flex-col">
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
                Concept Floorplan Editor
              </span>
              <span className="block text-[10px] tracking-widest text-amber-400 font-medium uppercase">
                Foresight Home Planning Studio
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/hub">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800/60"
              >
                <Home className="h-3.5 w-3.5 mr-1.5" />
                Hub
              </Button>
            </Link>
            <Link to="/quote-builder">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800/60"
              >
                <Layers className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                Quoting Tool
              </Button>
            </Link>
            <Link to="/tender-request">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800/60"
              >
                <Send className="h-3.5 w-3.5 mr-1.5 text-amber-400" />
                Tender Portal
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Frame View */}
      <main className="flex-1 w-full relative z-10">
        <ForesightEditorFrame />
      </main>
    </div>
  );
}
