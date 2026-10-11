import { createFileRoute } from "@tanstack/react-router";
import { BrainDumpPortal } from "@/components/braindump/BrainDumpPortal";

export const Route = createFileRoute("/_authenticated/braindump")({
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
