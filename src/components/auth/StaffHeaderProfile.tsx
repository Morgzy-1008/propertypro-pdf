import React, { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  getActiveStaffUser,
  clearActiveStaffUser,
  onStaffUserChanged,
  isStaffSessionActive,
  type StaffProfile,
} from "@/lib/authSession";
import { getUnreadAlertCount, onAdminAlertsChanged } from "@/lib/adminAlerts";
import { AdminDashboardModal } from "@/components/admin/AdminDashboardModal";
import {
  ShieldCheck,
  LogOut,
  ChevronDown,
  Building,
  Shield,
  Bell,
  Clock,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

import { DivisionSwitcher } from "./DivisionSwitcher";

interface StaffHeaderProfileProps {
  isLight?: boolean;
}

export function StaffHeaderProfile({ isLight = false }: StaffHeaderProfileProps) {
  const navigate = useNavigate();
  const [activeUser, setActiveUser] = useState<StaffProfile | null>(() => getActiveStaffUser());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState<number>(() => getUnreadAlertCount());

  useEffect(() => {
    setActiveUser(getActiveStaffUser());
    setUnreadAlerts(getUnreadAlertCount());

    const unsubUser = onStaffUserChanged((user) => setActiveUser(user));
    const unsubAlerts = onAdminAlertsChanged(() => setUnreadAlerts(getUnreadAlertCount()));

    return () => {
      unsubUser();
      unsubAlerts();
    };
  }, []);

  const handleSignOut = () => {
    clearActiveStaffUser(false);
    setIsDropdownOpen(false);
    toast.info("Signed out. Redirecting to authentication page...");
    navigate({ to: "/auth", replace: true });
  };

  const isAdmin = activeUser?.role === "admin" || activeUser?.id === "morgan-hales";

  return (
    <div className="flex items-center gap-2">
      {/* Top Bar State Switcher (QLD ⇄ NSW) */}
      <DivisionSwitcher isLight={isLight} size="sm" />
      {/* Website Admin Button for Morgan Hales */}
      {isAdmin && (
        <button
          type="button"
          onClick={() => setIsAdminModalOpen(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all text-xs font-bold shadow-md ${
            isLight
              ? "bg-amber-100/90 border-amber-300 text-amber-900 hover:bg-amber-200"
              : "bg-amber-950/50 border-amber-500/50 text-amber-300 hover:bg-amber-900/60 hover:border-amber-400"
          }`}
          title="Open Website Admin & Security Approvals"
        >
          <Shield className="h-3.5 w-3.5 text-amber-400" />
          <span className="hidden sm:inline">Website Admin</span>
          {unreadAlerts > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono text-[9px] font-bold animate-pulse">
              {unreadAlerts}
            </span>
          )}
        </button>
      )}

      {/* Staff Profile Dropdown */}
      {activeUser ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full border transition-all text-xs font-semibold ${
              isLight
                ? "bg-slate-100/90 border-slate-300 text-slate-800 hover:bg-slate-200/80 shadow-xs"
                : "bg-slate-900/90 border-slate-700/80 text-slate-200 hover:bg-slate-800 hover:border-slate-600 shadow-md"
            }`}
          >
            <div
              className={`h-6 w-6 rounded-full bg-gradient-to-br ${activeUser.accentColor || "from-amber-500 to-orange-600"} flex items-center justify-center text-white text-[10px] font-black shadow-xs`}
            >
              {activeUser.avatarInitials || "NHC"}
            </div>
            <div className="text-left hidden sm:block">
              <span className="block leading-tight text-white font-bold">{activeUser.name}</span>
              <span className="block text-[9.5px] text-amber-400 font-medium leading-none truncate max-w-[130px]">
                {activeUser.displayCentre.replace(" Display Home", "")}
              </span>
            </div>
            <ChevronDown className="h-3 w-3 text-slate-400 ml-0.5" />
          </button>

          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-800 bg-slate-950/95 backdrop-blur-xl shadow-2xl p-3 z-50 text-xs text-slate-200 animate-in fade-in zoom-in-95 duration-100 space-y-2">
                <div className="pb-2.5 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white block">{activeUser.name}</span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded font-mono font-bold">
                      24h Active
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 block font-mono truncate">
                    {activeUser.email}
                  </span>
                  <span className="text-[10px] text-amber-400 font-medium mt-1 inline-flex items-center gap-1">
                    <Building className="h-3 w-3" /> {activeUser.displayCentre}
                  </span>
                </div>

                <div className="space-y-1">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setIsAdminModalOpen(true);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-950/40 text-amber-300 flex items-center justify-between font-medium border border-amber-500/30"
                    >
                      <span className="flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5 text-amber-400" />
                        <span>Website Admin Portal</span>
                      </span>
                      {unreadAlerts > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono text-[9px]">
                          {unreadAlerts}
                        </span>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-950/40 text-rose-400 flex items-center gap-2 font-medium"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out &amp; Switch Account</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => navigate({ to: "/auth", replace: true })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 text-xs font-semibold shadow-xs"
        >
          <Lock className="h-3.5 w-3.5" />
          <span>Sign In (24h)</span>
        </button>
      )}

      {/* Admin Dashboard Modal */}
      {isAdmin && (
        <AdminDashboardModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
        />
      )}
    </div>
  );
}
