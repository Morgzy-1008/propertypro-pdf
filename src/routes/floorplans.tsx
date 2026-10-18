import { createFileRoute } from "@tanstack/react-router";
import { ClientFloorplanLibraryView } from "@/components/floorplan-library/ClientFloorplanLibraryView";

interface FloorplansSearchParams {
  token?: string;
  state?: string;
  division?: string;
  c?: string;
  consultant?: string;
  design?: string;
  q?: string;
}

export const Route = createFileRoute("/floorplans")({
  validateSearch: (search: Record<string, unknown>): FloorplansSearchParams => {
    return {
      token: typeof search.token === "string" ? search.token : undefined,
      state: typeof search.state === "string" ? search.state : undefined,
      division: typeof search.division === "string" ? search.division : undefined,
      c: typeof search.c === "string" ? search.c : undefined,
      consultant: typeof search.consultant === "string" ? search.consultant : undefined,
      design: typeof search.design === "string" ? search.design : undefined,
      q: typeof search.q === "string" ? search.q : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Floorplan Gallery | Hudson Homes" },
      {
        name: "description",
        content:
          "Explore the Hudson Homes design collection. High-resolution floorplans, interactive dimensions, facade library, and room layouts.",
      },
    ],
  }),
  component: FloorplansRoutePage,
});

function FloorplansRoutePage() {
  return <ClientFloorplanLibraryView />;
}
