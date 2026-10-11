import React from "react";
import { Link } from "@tanstack/react-router";
import { Lock, Shield, User, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StaffProfile, setActiveStaffUser, KNOWN_STAFF_PROFILES } from "@/lib/authSession";
import { toast } from "sonner";

interface BrainDumpAccessGuardProps {
  currentStaff: StaffProfile | null;
  isLight: boolean;
  onPreviewAs?: () => void;
}

export function BrainDumpAccessGuard({
  currentStaff,
  isLight,
  onPreviewAs,
}: BrainDumpAccessGuardProps) {
  const handleSwitchToMorgan = () => {
    const morgan = KNOWN_STAFF_PROFILES.find((p) => p.id === "morgan-hales");
    if (morgan) {
      setActiveStaffUser(morgan);
      toast.success("Switched preview to Morgan Hales (Admin)");
      onPreviewAs?.();
    }
  };

  const handleSwitchToAlyssa = () => {
    const alyssa = KNOWN_STAFF_PROFILES.find((p) => p.id === "alyssa-hales");
    if (alyssa) {
      setActiveStaffUser(alyssa);
      toast.success("Switched preview to Alyssa Hales (Sales Assistant)");
      onPreviewAs?.();
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div
        className={`max-w-md w-full p-8 rounded-3xl border shadow-2xl text-center space-y-6 ${
          isLight
            ? "bg-white border-slate-200 text-slate-900 shadow-slate-200"
            : "bg-slate-900/90 border-slate-800 text-white shadow-black/80 backdrop-blur-xl"
        }`}
      >
        <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/20 text-amber-500 flex items-center justify-center border border-amber-500/30">
          <Lock className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tight">
            Morgan &amp; Alyssa's BrainDump
          </h2>
          <p className="text-sm text-slate-400">
            This private execution portal is exclusively configured for <strong>Morgan Hales</strong> and <strong>Alyssa Hales</strong> to collaborate and smash out overdue tasks.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-500/10 border border-slate-500/20 text-xs text-left space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span>Currently Signed In:</span>
            <span className="font-bold text-white">{currentStaff?.name || "Guest User"}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Access Requirement:</span>
            <span className="font-bold text-amber-400">Morgan Hales / Alyssa Hales</span>
          </div>
        </div>

        {/* Development / Admin Quick Preview Switcher */}
        <div className="space-y-2 pt-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            Preview Workspace As:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleSwitchToMorgan}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl"
            >
              👤 Morgan Hales
            </Button>
            <Button
              onClick={handleSwitchToAlyssa}
              className="bg-rose-500 hover:bg-rose-400 text-white font-black text-xs rounded-xl"
            >
              👩 Alyssa Hales
            </Button>
          </div>
        </div>

        <div className="pt-2">
          <Link
            to="/hub"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Return to Welcome Hub
          </Link>
        </div>
      </div>
    </div>
  );
}
