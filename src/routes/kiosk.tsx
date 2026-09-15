import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/kiosk")({
  component: () => <Navigate to="/crm" replace />,
});
