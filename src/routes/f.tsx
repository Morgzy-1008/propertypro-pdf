import { createFileRoute } from "@tanstack/react-router";
import { ClientFloorplanLibraryView } from "@/components/floorplan-library/ClientFloorplanLibraryView";

interface FSearchParams {
  token?: string;
  state?: string;
  division?: string;
  c?: string;
  consultant?: string;
  design?: string;
  q?: string;
  noprice?: string;
  pricing?: string;
}

export const Route = createFileRoute("/f")({
  validateSearch: (search: Record<string, unknown>): FSearchParams => {
    return {
      token: typeof search.token === "string" ? search.token : undefined,
      state: typeof search.state === "string" ? search.state : undefined,
      division: typeof search.division === "string" ? search.division : undefined,
      c: typeof search.c === "string" ? search.c : undefined,
      consultant: typeof search.consultant === "string" ? search.consultant : undefined,
      design: typeof search.design === "string" ? search.design : undefined,
      q: typeof search.q === "string" ? search.q : undefined,
      noprice: typeof search.noprice === "string" ? search.noprice : undefined,
      pricing: typeof search.pricing === "string" ? search.pricing : undefined,
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
  component: FRoutePage,
});

function FRoutePage() {
  return <ClientFloorplanLibraryView />;
}
