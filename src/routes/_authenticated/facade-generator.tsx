import { createFileRoute, redirect } from "@tanstack/react-router";
import { FacadeGeneratorPortal } from "@/components/facade-generator/FacadeGeneratorPortal";
import { getActiveStaffUser } from "@/lib/authSession";
import { canAccessFacadeGenerator } from "@/lib/access";

export const Route = createFileRoute("/_authenticated/facade-generator")({
  beforeLoad: () => {
    const user = getActiveStaffUser();
    if (!canAccessFacadeGenerator(user)) {
      throw redirect({ to: "/hub", replace: true });
    }
  },
  head: () => ({
    meta: [
      { title: "Facade Generator | Hudson Sales Hub" },
      {
        name: "description",
        content:
          "AI Architectural Facade Generator for custom 2400x937 widescreen facade renders with text and voice prompting, back-end design/garage filters, and Admin review approval.",
      },
    ],
  }),
  component: FacadeGeneratorPage,
});

function FacadeGeneratorPage() {
  return <FacadeGeneratorPortal />;
}
