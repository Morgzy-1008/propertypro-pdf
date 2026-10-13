import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/braindump")({
  beforeLoad: () => {
    throw redirect({
      to: "/crm",
      search: { tab: "tasks" },
      replace: true,
    });
  },
  component: () => null,
});

