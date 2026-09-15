import { createFileRoute } from "@tanstack/react-router";
import { LandScoutDashboard } from "@/components/land-scout/LandScoutDashboard";

export const Route = createFileRoute("/_authenticated/land-scout")({
  head: () => ({
    meta: [
      { title: "Hudson Land Scout | Vacant Land Intelligence & Acquisition" },
      {
        name: "description",
        content:
          "AI Vacant Land Search, Live Availability Verification, Agent Outreach & Instant Turnkey House and Land Packaging for Hudson Homes.",
      },
    ],
  }),
  component: LandScoutDashboard,
});
