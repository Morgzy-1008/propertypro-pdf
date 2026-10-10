import { createFileRoute } from "@tanstack/react-router";
import { FloorplanLibraryView } from "@/components/floorplan-library/FloorplanLibraryView";

export const Route = createFileRoute("/_authenticated/floorplan-library")({
  head: () => ({
    meta: [
      { title: "Floorplan Library | Hudson Homes Digital Builder OS" },
      {
        name: "description",
        content:
          "Browse, scan, and present 220+ Hudson Homes floorplans directly with clients in display homes. Filter by width, length, bedrooms, size, BTB zero-lot, and live multi-tier pricelists.",
      },
    ],
  }),
  component: FloorplanLibraryPage,
});

function FloorplanLibraryPage() {
  return <FloorplanLibraryView />;
}
