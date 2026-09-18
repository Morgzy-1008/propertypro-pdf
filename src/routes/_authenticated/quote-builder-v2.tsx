import { createFileRoute, redirect } from "@tanstack/react-router";
import { QuoteBuilderV2 } from "@/components/quoting/v2/QuoteBuilderV2";
import { getActiveStaffUser } from "@/lib/authSession";

export const Route = createFileRoute("/_authenticated/quote-builder-v2")({
  beforeLoad: async () => {
    const staffUser = getActiveStaffUser();
    const isMorgan =
      staffUser?.id === "morgan-hales" ||
      staffUser?.email === "morgan.hales@hudsonhomes.com.au" ||
      staffUser?.role === "admin";
    if (!isMorgan) {
      throw redirect({ to: "/hub", replace: true });
    }
  },
  head: () => ({
    meta: [
      { title: "Hudson Quoting System v2 | Automated Pricing & Floorplan Recognition" },
      {
        name: "description",
        content:
          "Next-generation automated floorplan recognition, Databuild recipe delta auto-costing, and autonomous site costing engine for Hudson Homes.",
      },
    ],
  }),
  component: QuoteBuilderV2Page,
});

function QuoteBuilderV2Page() {
  return <QuoteBuilderV2 />;
}
