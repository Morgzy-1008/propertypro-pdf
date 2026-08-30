import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { isStaffSessionActive, getActiveStaffUser } from "@/lib/authSession";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (!isStaffSessionActive()) {
      throw redirect({ to: "/auth", replace: true });
    }
    const staffUser = getActiveStaffUser();
    return { staffUser };
  },
  component: () => <Outlet />,
});
