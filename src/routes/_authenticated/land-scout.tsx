import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LandScoutDashboard } from "@/components/land-scout/LandScoutDashboard";
import { getActiveStaffUser, type StaffProfile } from "@/lib/authSession";
import { canAccessLandScout } from "@/lib/access";
import { Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/land-scout")({
  head: () => ({
    meta: [
      { title: "Hudson Land Scout | Vacant Land Intelligence & Acquisition" },
      {
        name: "description",
        content:
          "AI Vacant Land Search, Live Availability Verification, Agent Outreach & Instant Turnkey House and Land Packaging for Hudson Homes.",
      },
    ],
  }),
  component: LandScoutPage,
});

function LandScoutPage() {
  const navigate = useNavigate();
  const [staffUser, setStaffUser] = useState<StaffProfile | null>(() => getActiveStaffUser());

  useEffect(() => {
    setStaffUser(getActiveStaffUser());
  }, []);

  const hasAccess = canAccessLandScout(staffUser);

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center font-sans selection:bg-amber-500/30">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Lock className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              Under Development
            </div>
            <h1 className="text-xl font-bold text-white">
              Hudson Land Scout · Restricted Access
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              This portal is currently under active development and restricted to system administration (Morgan Hales).
            </p>
          </div>

          <div className="pt-2">
            <Button
              onClick={() => navigate({ to: "/hub" })}
              className="w-full bg-brand-gold hover:bg-amber-400 text-slate-950 font-bold text-xs py-2.5 rounded-xl cursor-pointer"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Welcome Hub
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <LandScoutDashboard />;
}

