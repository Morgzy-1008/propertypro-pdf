import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { isStaffSessionActive, getActiveStaffUser } from "@/lib/authSession";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const isUnlocked =
      (typeof window !== "undefined" &&
        ((window as any).__HUDSON_HUB_UNLOCKED__ === true ||
          sessionStorage.getItem("hudson_hub_unlocked") === "true" ||
          localStorage.getItem("hudson_hub_unlocked") === "true")) ||
      (typeof document !== "undefined" &&
        document.cookie.includes("hudson_hub_unlocked=true"));

    if (!isUnlocked && !isStaffSessionActive()) {
      throw redirect({ to: "/auth", replace: true });
    }
    const staffUser = getActiveStaffUser();
    return { staffUser };
  },
  component: () => <Outlet />,
});
