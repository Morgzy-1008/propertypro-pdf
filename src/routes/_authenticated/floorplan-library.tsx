import { createFileRoute, redirect } from "@tanstack/react-router";
import { FloorplanLibraryView } from "@/components/floorplan-library/FloorplanLibraryView";
import { getActiveStaffUser } from "@/lib/authSession";
import { canAccessFloorplanLibrary } from "@/lib/access";

export const Route = createFileRoute("/_authenticated/floorplan-library")({
  beforeLoad: () => {
    const user = getActiveStaffUser();
    if (!canAccessFloorplanLibrary(user)) {
      throw redirect({ to: "/hub", replace: true });
    }
  },
  head: () => ({
    meta: [
      { title: "Floorplan Library | Hudson Sales Hub" },
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
