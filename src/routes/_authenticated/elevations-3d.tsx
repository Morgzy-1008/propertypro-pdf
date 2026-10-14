import { createFileRoute, redirect } from "@tanstack/react-router";
import { Studio3dWorkspace } from "@/components/studio3d/Studio3dWorkspace";
import { getActiveStaffUser } from "@/lib/authSession";
import { canAccess3dStudio } from "@/lib/access";

export const Route = createFileRoute("/_authenticated/elevations-3d")({
  beforeLoad: () => {
    const user = getActiveStaffUser();
    if (!canAccess3dStudio(user)) {
      throw redirect({ to: "/hub", replace: true });
    }
  },
  head: () => ({
    meta: [
      { title: "Architectural Elevations & 3D Plan Studio | Hudson Homes" },
      {
        name: "description",
        content:
          "Architectural CAD elevations (Front, Rear, Side) and clean 3D interactive floorplans with parametric hip roof lines.",
      },
    ],
  }),
  component: Elevations3dPage,
});

function Elevations3dPage() {
  return <Studio3dWorkspace />;
}
