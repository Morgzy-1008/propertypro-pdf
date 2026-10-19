import { createFileRoute } from "@tanstack/react-router";
import { FacadeGeneratorPortal } from "@/components/facade-generator/FacadeGeneratorPortal";

export const Route = createFileRoute("/_authenticated/facade-generator")({
  head: () => ({
    meta: [
      { title: "Facade Generator | Hudson Homes Digital Builder OS" },
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
