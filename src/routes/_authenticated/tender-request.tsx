import { createFileRoute, Link } from "@tanstack/react-router";
import { TenderRequestPortal } from "@/components/tender/TenderRequestPortal";
import { Logo } from "@/components/flyer/FlyerTemplates";
import { Home, Layers, Database, FileText, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StaffHeaderProfile } from "@/components/auth/StaffHeaderProfile";

export const Route = createFileRoute("/_authenticated/tender-request")({
  head: () => ({
    meta: [
      { title: "Submit Your Tender Request | Hudson Homes" },
      {
        name: "description",
        content:
          "Automated Tender Request Form, Authority to Proceed (ATP) e-signing, Job Folder packaging, and OnSite submission portal for Hudson Homes Queensland.",
      },
    ],
  }),
  component: TenderRequestPage,
});

function TenderRequestPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500/30 relative overflow-hidden flex flex-col">
      {/* Ambient Gradient Lights */}
      <div className="ambient-glow-gold h-96 w-96 -top-20 -right-20 pointer-events-none" />
      <div className="ambient-glow-cyan h-96 w-96 -bottom-20 -left-20 pointer-events-none" />

      {/* Top Header */}
      <header className="glass-header sticky top-0 z-40">
        <div className="w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo light size={11} />
            <div className="hidden sm:block border-l border-slate-800 pl-4">
              <span className="text-xs font-bold tracking-widest text-white uppercase">
                Tender Request Portal
              </span>
              <span className="block text-[10px] tracking-widest text-amber-400 font-medium uppercase">
                Digital ATP &amp; OnSite Packaging
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
                <span>Hub</span>
              </Button>
            </Link>

            <Link to="/quote-builder">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900 gap-1.5"
              >
                <Layers className="h-3.5 w-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Quoting Tool</span>
              </Button>
            </Link>

            <Link to="/flyer">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900 gap-1.5"
              >
                <FileText className="h-3.5 w-3.5 text-brand-gold" />
                <span className="hidden sm:inline">Flyers</span>
              </Button>
            </Link>

            {/* NHC Active Profile */}
            <StaffHeaderProfile isLight={false} />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full relative z-10 py-6">
        <TenderRequestPortal />
      </main>
    </div>
  );
}
