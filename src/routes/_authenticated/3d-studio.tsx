import { createFileRoute } from "@tanstack/react-router";
import { Studio3dWorkspace } from "@/components/studio3d/Studio3dWorkspace";

export const Route = createFileRoute("/_authenticated/3d-studio")({
  head: () => ({
    meta: [
      { title: "3D Plan Studio & Architectural Elevations | Hudson Homes Digital Builder OS" },
      {
        name: "description",
        content:
          "Clean, interactive 3D floorplans, Australian hip roofs, virtual walkthrough tours, and architectural CAD elevations for Hudson Homes master designs and modified plans.",
      },
    ],
  }),
  component: Studio3dPage,
});

function Studio3dPage() {
  return <Studio3dWorkspace />;
}
