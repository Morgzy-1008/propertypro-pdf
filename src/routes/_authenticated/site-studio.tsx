import { createFileRoute, redirect } from "@tanstack/react-router";
import { SiteStudioWorkspace } from "@/components/site-studio/SiteStudioWorkspace";
import { getActiveStaffUser } from "@/lib/authSession";

export const Route = createFileRoute("/_authenticated/site-studio")({
  beforeLoad: async () => {
    const staffUser = getActiveStaffUser();
    const isMorgan =
      staffUser?.id === "morgan-hales" ||
      staffUser?.email?.toLowerCase() === "morgan.hales@hudsonhomes.com.au" ||
      staffUser?.role === "admin";
    if (!isMorgan) {
      throw redirect({ to: "/hub", replace: true });
    }
  },
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
