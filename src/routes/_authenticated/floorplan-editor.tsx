import { createFileRoute, redirect } from "@tanstack/react-router";
import { ForesightEditorFrame } from "@/components/floorplan-editor/ForesightEditorFrame";
import { getActiveStaffUser } from "@/lib/authSession";
import { canAccessFloorplanEditor } from "@/lib/access";

export const Route = createFileRoute("/_authenticated/floorplan-editor")({
  beforeLoad: async () => {
    const staffUser = getActiveStaffUser();
    if (!canAccessFloorplanEditor(staffUser)) {
      throw redirect({ to: "/hub", replace: true });
    }
  },
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
