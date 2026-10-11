import { createFileRoute, redirect } from "@tanstack/react-router";
import { BrainDumpPortal } from "@/components/braindump/BrainDumpPortal";
import { getActiveStaffUser } from "@/lib/authSession";
import { canAccessBrainDump } from "@/lib/access";

export const Route = createFileRoute("/_authenticated/braindump")({
  beforeLoad: () => {
    const staff = getActiveStaffUser();
    if (!canAccessBrainDump(staff)) {
      throw redirect({
        to: "/hub",
      });
    }
  },
  head: () => ({
    meta: [
      { title: "Morgan and Alyssa's BrainDump | Task Execution Engine" },
      {
        name: "description",
        content:
          "Private task execution engine and rapid SLA backlog blitz portal for Morgan Hales and Alyssa Hales.",
      },
    ],
  }),
  component: BrainDumpPage,
});

function BrainDumpPage() {
  return <BrainDumpPortal />;
}
