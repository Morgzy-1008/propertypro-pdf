import { createFileRoute } from "@tanstack/react-router";
import { SiteStudioWorkspace } from "@/components/site-studio/SiteStudioWorkspace";

export const Route = createFileRoute("/_authenticated/site-studio")({
  head: () => ({
    meta: [
      { title: "Hudson Site Studio | Cadastre Boundaries & 1:200 Siting" },
      {
        name: "description",
        content: "Professional architectural site analysis, cadastral boundaries, satellite imagery, and 1:200 floorplan siting for Hudson Homes.",
      },
    ],
  }),
  component: SiteStudioPage,
});

function SiteStudioPage() {
  return <SiteStudioWorkspace />;
}
