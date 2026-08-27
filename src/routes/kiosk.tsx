import { createFileRoute } from "@tanstack/react-router";
import { CrmDisplayKiosk } from "@/components/crm/CrmDisplayKiosk";

export const Route = createFileRoute("/kiosk")({
  head: () => ({
    meta: [
      { title: "Springfield Central Touch Kiosk | Hudson Homes" },
      {
        name: "description",
        content: "Display Home iPad Registration Touch Kiosk.",
      },
    ],
  }),
  component: KioskPage,
});

function KioskPage() {
  return <CrmDisplayKiosk />;
}
