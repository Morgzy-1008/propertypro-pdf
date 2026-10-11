import { createFileRoute } from "@tanstack/react-router";
import { Studio3dWorkspace } from "@/components/studio3d/Studio3dWorkspace";

export const Route = createFileRoute("/_authenticated/elevations-3d")({
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
