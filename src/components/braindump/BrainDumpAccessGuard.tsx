import React from "react";
import { Link } from "@tanstack/react-router";
import { Lock, ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StaffProfile } from "@/lib/authSession";

interface BrainDumpAccessGuardProps {
  currentStaff: StaffProfile | null;
  isLight: boolean;
}

export function BrainDumpAccessGuard({
  currentStaff,
  isLight,
}: BrainDumpAccessGuardProps) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div
        className={`max-w-md w-full p-8 rounded-3xl border shadow-2xl text-center space-y-6 ${
          isLight
            ? "bg-white border-slate-200 text-slate-900 shadow-slate-200"
            : "bg-slate-900/90 border-slate-800 text-white shadow-black/80 backdrop-blur-xl"
        }`}
      >
        <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/15 text-rose-500 flex items-center justify-center border border-rose-500/30">
          <Lock className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="h-3.5 w-3.5" /> Access Restricted
          </div>
          <h2 className="text-2xl font-black tracking-tight">
            Morgan &amp; Alyssa's BrainDump
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            This private task portal is exclusively restricted to <strong>Morgan Hales</strong> and <strong>Alyssa Hales</strong>.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-500/10 border border-slate-500/20 text-xs text-left space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span>Signed In As:</span>
            <span className="font-bold text-white">{currentStaff?.name || "Guest User"}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Authorised Accounts:</span>
            <span className="font-bold text-amber-400">Morgan Hales &amp; Alyssa Hales</span>
          </div>
        </div>

        <div className="pt-2">
          <Link to="/hub" className="w-full block">
            <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl gap-2 cursor-pointer">
              <ArrowLeft className="h-4 w-4" /> Return to Welcome Hub
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
