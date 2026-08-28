import { createFileRoute, Link } from "@tanstack/react-router";
import { CrmWorkspace } from "@/components/crm/CrmWorkspace";
import { Logo } from "@/components/flyer/FlyerTemplates";
import { Home, Layers, Database, FileText, Send, Users, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/crm")({
  head: () => ({
    meta: [
      { title: "Hudson Horizon CRM | Sales Pipeline & Client Hub" },
      {
        name: "description",
        content: "Sales pipeline, client conversations, Outlook email capture, and commission forecasting for Hudson Homes.",
      },
    ],
  }),
  component: CrmPage,
});

function CrmPage() {
  const { mode } = useTheme();
  const isLight = mode === "normal";

  return (
    <div className={`min-h-screen ${isLight ? "bg-slate-50 text-slate-900" : "bg-slate-950 text-slate-100"} font-sans selection:bg-amber-500/30 relative overflow-hidden flex flex-col`}>
      {/* Top Header */}
      <header className={`border-b ${isLight ? "border-slate-200 bg-white/95 shadow-xs" : "border-slate-800 bg-slate-900/60"} backdrop-blur-md sticky top-0 z-40`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo light={!isLight} size={11} />
            <div className={`hidden sm:block border-l ${isLight ? "border-slate-300" : "border-slate-800"} pl-4`}>
              <span className={`text-xs font-bold tracking-widest ${isLight ? "text-slate-800" : "text-white"} uppercase`}>
                Hudson Horizon CRM
              </span>
              <span className="block text-[10px] tracking-widest text-amber-500 font-semibold uppercase">
                Sales Pipeline &amp; Client Hub
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            <Link to="/hub">
              <Button
                variant="ghost"
                size="sm"
                className={`text-xs ${isLight ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100" : "text-slate-400 hover:text-white hover:bg-slate-900"} border border-slate-800/60`}
              >
                <Home className="h-3.5 w-3.5 mr-1.5" />
                Hub
              </Button>
            </Link>
            <Link to="/quote-builder">
              <Button
                variant="ghost"
                size="sm"
                className={`text-xs ${isLight ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100" : "text-slate-400 hover:text-white hover:bg-slate-900"} border border-slate-800/60`}
              >
                <Layers className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
                Quoting
              </Button>
            </Link>
            <Link to="/tender-request">
              <Button
                variant="ghost"
                size="sm"
                className={`text-xs ${isLight ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100" : "text-slate-400 hover:text-white hover:bg-slate-900"} border border-slate-800/60`}
              >
                <Send className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                Tender
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main CRM View */}
      <main className="flex-1 w-full relative z-10">
        <CrmWorkspace />
      </main>
    </div>
  );
}
