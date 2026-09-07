import { createFileRoute, Link } from "@tanstack/react-router";
import { ForesightEditorFrame } from "@/components/floorplan-editor/ForesightEditorFrame";
import { Logo } from "@/components/flyer/FlyerTemplates";
import { Home, Layers, Database, FileText, Send, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StaffHeaderProfile } from "@/components/auth/StaffHeaderProfile";

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
    <div className="h-screen w-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500/30 overflow-hidden flex flex-col">
      <ForesightEditorFrame />
    </div>
  );
}
