import React, { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  getActiveStaffUser,
  setActiveStaffUser,
  clearActiveStaffUser,
  onStaffUserChanged,
  isStaffSessionActive,
  KNOWN_STAFF_PROFILES,
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
  UserCheck,
  Users,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { DivisionSwitcher } from "./DivisionSwitcher";
import { useTheme } from "@/lib/theme";

interface StaffHeaderProfileProps {
  isLight?: boolean;
  compact?: boolean;
}

export function StaffHeaderProfile({ isLight: propIsLight, compact = false }: StaffHeaderProfileProps) {
  const navigate = useNavigate();
  const { mode } = useTheme();
  const isNormalMode = mode === "normal" || (typeof document !== "undefined" && document.documentElement.classList.contains("normal-mode"));
  const isLight = propIsLight !== undefined ? (propIsLight || isNormalMode) : isNormalMode;
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

  const isMorgan =
    activeUser?.id === "morgan-hales" ||
    activeUser?.email?.toLowerCase() === "morgan.hales@hudsonhomes.com.au" ||
    activeUser?.role === "admin";

  const isImpersonating =
    typeof window !== "undefined" &&
    (sessionStorage.getItem("hudson_admin_impersonator") === "morgan.hales@hudsonhomes.com.au" ||
      localStorage.getItem("hudson_admin_impersonator") === "morgan.hales@hudsonhomes.com.au");

  const canSwitchProfiles = isMorgan || isImpersonating;

  const handleSwitchToProfile = (profile: StaffProfile) => {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("hudson_admin_impersonator", "morgan.hales@hudsonhomes.com.au");
        localStorage.setItem("hudson_admin_impersonator", "morgan.hales@hudsonhomes.com.au");
        try {
          sessionStorage.setItem(
            "hudson_login_toast",
            JSON.stringify({ name: profile.name, type: "switched", title: profile.title })
          );
        } catch {}
      }
      setActiveStaffUser(profile, true);
      if (profile.division) {
        localStorage.setItem("hudson_active_division", profile.division);
      }
      setIsDropdownOpen(false);

      const path = typeof window !== "undefined" ? window.location.pathname : "/hub";
      const isRestrictedForMarketing =
        path.includes("quote") ||
        path.includes("crm") ||
        path.includes("tender") ||
        path.includes("site-studio") ||
        path.includes("floorplan-editor");

      const targetPath = (profile.role === "marketing" && isRestrictedForMarketing) ? "/hub" : path;
      const targetUrl = `${targetPath}?switched=${encodeURIComponent(profile.id)}&_t=${Date.now()}`;

      if (typeof window !== "undefined") {
        window.location.href = targetUrl;
      }
    } catch (e) {
      console.error("Profile switch error:", e);
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    }
  };

  const handleReturnToMorgan = () => {
    try {
      const morgan = KNOWN_STAFF_PROFILES.find((p) => p.id === "morgan-hales");
      if (morgan) {
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("hudson_admin_impersonator");
          localStorage.removeItem("hudson_admin_impersonator");
          try {
            sessionStorage.setItem(
              "hudson_login_toast",
              JSON.stringify({ name: "Morgan Hales", type: "returned" })
            );
          } catch {}
        }
        setActiveStaffUser(morgan, true);
        if (morgan.division) {
          localStorage.setItem("hudson_active_division", morgan.division);
        }
        setIsDropdownOpen(false);
        if (typeof window !== "undefined") {
          window.location.href = `/hub?returned=admin&_t=${Date.now()}`;
        }
      }
    } catch (e) {
      console.error("Return to admin error:", e);
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    }
  };

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("hudson_admin_impersonator");
      localStorage.removeItem("hudson_admin_impersonator");
    }
    clearActiveStaffUser(false);
    setIsDropdownOpen(false);
    toast.info("Signed out. Redirecting to authentication page...");
    navigate({ to: "/auth", replace: true });
  };

  const isAdmin = activeUser?.role === "admin" || activeUser?.id === "morgan-hales";

  return (
    <div className="flex items-center gap-2">
      {/* Top Bar State Switcher (QLD ⇄ NSW) */}
      {!compact && <DivisionSwitcher isLight={isLight} size="sm" />}
      {/* Website Admin Button for Morgan Hales */}
      {!compact && isAdmin && (
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
              <span className={`block leading-tight font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{activeUser.name}</span>
              <span className={`block text-[9.5px] font-semibold leading-none truncate max-w-[130px] ${isLight ? "text-amber-800" : "text-amber-400"}`}>
                {activeUser.displayCentre.replace(" Display Home", "")}
              </span>
            </div>
            <ChevronDown className={`h-3 w-3 ml-0.5 ${isLight ? "text-slate-600" : "text-slate-400"}`} />
          </button>

          {isDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className={`absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl border shadow-2xl p-3 z-50 text-xs animate-in fade-in zoom-in-95 duration-100 space-y-2 ${
                isLight
                  ? "border-slate-200 bg-white text-slate-800 shadow-slate-900/10"
                  : "border-slate-800 bg-slate-950/95 text-slate-200 backdrop-blur-xl"
              }`}>
                <div className={`pb-2.5 border-b ${isLight ? "border-slate-200" : "border-slate-800"}`}>
                  <div className="flex items-center justify-between">
                    <span className={`font-bold block text-sm ${isLight ? "text-slate-900" : "text-white"}`}>{activeUser.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold border ${
                      isLight
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    }`}>
                      24h Active
                    </span>
                  </div>
                  <span className={`text-[11px] block font-mono truncate ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                    {activeUser.email}
                  </span>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-[10px] font-semibold inline-flex items-center gap-1 ${isLight ? "text-amber-800" : "text-amber-400"}`}>
                      <Building className="h-3 w-3" /> {activeUser.displayCentre}
                    </span>
                    <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                      activeUser.role === "marketing"
                        ? "bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30"
                        : activeUser.role === "admin"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    }`}>
                      {activeUser.title}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setIsAdminModalOpen(true);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between font-semibold border ${
                        isLight
                          ? "hover:bg-amber-50 text-amber-900 border-amber-200 bg-amber-50/50"
                          : "hover:bg-amber-950/40 text-amber-300 border-amber-500/30"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Shield className={`h-3.5 w-3.5 ${isLight ? "text-amber-700" : "text-amber-400"}`} />
                        <span>Website Admin Portal</span>
                      </span>
                      {unreadAlerts > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-mono text-[9px]">
                          {unreadAlerts}
                        </span>
                      )}
                    </button>
                  )}

                  {/* Colleague Profile Switcher for Morgan Hales & Admin Session Testing */}
                  {canSwitchProfiles && (
                    <div className={`pt-2 mt-1 border-t space-y-1.5 ${isLight ? "border-slate-200" : "border-slate-800"}`}>
                      <div className="flex items-center justify-between px-1">
                        <span className={`text-[10.5px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${isLight ? "text-amber-800" : "text-amber-400"}`}>
                          <Users className="h-3.5 w-3.5" />
                          <span>Switch Colleague View</span>
                        </span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${isLight ? "bg-amber-100 text-amber-900" : "bg-amber-500/20 text-amber-300"}`}>
                          Instant Access
                        </span>
                      </div>

                      {/* Quick Return to Morgan button if currently previewing as another colleague */}
                      {isImpersonating && activeUser?.id !== "morgan-hales" && (
                        <button
                          type="button"
                          onClick={handleReturnToMorgan}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between font-bold border transition-all ${
                            isLight
                              ? "bg-amber-100 border-amber-300 text-amber-950 hover:bg-amber-200 shadow-xs"
                              : "bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30 shadow-md"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <UserCheck className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                            <span>Return to Morgan Hales (Admin)</span>
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black">
                            RESET
                          </span>
                        </button>
                      )}

                      {/* Colleague Profiles List Grouped by Department */}
                      <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {/* Section: Marketing Team */}
                        <div>
                          <div className="text-[9px] font-mono uppercase tracking-wider font-bold text-fuchsia-400 px-1 mb-1">
                            Marketing Team (Restricted Access)
                          </div>
                          <div className="space-y-1">
                            {KNOWN_STAFF_PROFILES.filter((p) => p.role === "marketing").map((p) => {
                              const isCurrent = activeUser?.id === p.id || activeUser?.email?.toLowerCase() === p.email.toLowerCase();
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => handleSwitchToProfile(p)}
                                  disabled={isCurrent}
                                  className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between transition-all group ${
                                    isCurrent
                                      ? isLight
                                        ? "bg-amber-50 border border-amber-300 text-slate-900 font-bold"
                                        : "bg-amber-500/15 border border-amber-500/30 text-white font-bold"
                                      : isLight
                                        ? "hover:bg-slate-100 text-slate-700 cursor-pointer"
                                        : "hover:bg-slate-800/70 text-slate-300 cursor-pointer"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={`h-5 w-5 rounded-full bg-gradient-to-br ${p.accentColor || "from-fuchsia-500 to-pink-600"} flex items-center justify-center text-white text-[9px] font-black shrink-0 shadow-xs`}>
                                      {p.avatarInitials}
                                    </div>
                                    <div className="truncate">
                                      <div className="flex items-center gap-1.5">
                                        <span className="truncate font-semibold leading-tight text-[11px]">{p.name}</span>
                                        <span className="text-[8.5px] px-1 rounded bg-fuchsia-500/20 text-fuchsia-400 font-bold uppercase">
                                          Marketing
                                        </span>
                                      </div>
                                      <span className={`block text-[9.5px] truncate leading-none mt-0.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                                        {p.title}
                                      </span>
                                    </div>
                                  </div>
                                  {isCurrent ? (
                                    <span className="text-[9px] font-bold text-emerald-500 dark:text-emerald-400 shrink-0 font-mono flex items-center gap-0.5">
                                      <CheckCircle2 className="h-3 w-3" /> Active
                                    </span>
                                  ) : (
                                    <span className={`text-[9.5px] font-bold shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${isLight ? "text-amber-700" : "text-amber-400"}`}>
                                      Switch →
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Section: Queensland NHCs */}
                        <div>
                          <div className="text-[9px] font-mono uppercase tracking-wider font-bold text-amber-400 px-1 mb-1">
                            Queensland Sales Team
                          </div>
                          <div className="space-y-1">
                            {KNOWN_STAFF_PROFILES.filter((p) => p.role !== "marketing" && (p.division === "QLD" || p.state === "QLD")).map((p) => {
                              const isCurrent = activeUser?.id === p.id || activeUser?.email?.toLowerCase() === p.email.toLowerCase();
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => handleSwitchToProfile(p)}
                                  disabled={isCurrent}
                                  className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between transition-all group ${
                                    isCurrent
                                      ? isLight
                                        ? "bg-amber-50 border border-amber-300 text-slate-900 font-bold"
                                        : "bg-amber-500/15 border border-amber-500/30 text-white font-bold"
                                      : isLight
                                        ? "hover:bg-slate-100 text-slate-700 cursor-pointer"
                                        : "hover:bg-slate-800/70 text-slate-300 cursor-pointer"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={`h-5 w-5 rounded-full bg-gradient-to-br ${p.accentColor || "from-amber-500 to-orange-600"} flex items-center justify-center text-white text-[9px] font-black shrink-0 shadow-xs`}>
                                      {p.avatarInitials}
                                    </div>
                                    <div className="truncate">
                                      <div className="flex items-center gap-1.5">
                                        <span className="truncate font-semibold leading-tight text-[11px]">{p.name}</span>
                                        {p.role === "admin" && (
                                          <span className="text-[8.5px] px-1 rounded bg-amber-500/20 text-amber-400 font-bold uppercase">
                                            Admin
                                          </span>
                                        )}
                                      </div>
                                      <span className={`block text-[9.5px] truncate leading-none mt-0.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                                        {p.title.replace("Senior New Home Consultant & System Admin", "Admin & NHC")} • {p.displayCentre.replace(" Display Home", "")}
                                      </span>
                                    </div>
                                  </div>
                                  {isCurrent ? (
                                    <span className="text-[9px] font-bold text-emerald-500 dark:text-emerald-400 shrink-0 font-mono flex items-center gap-0.5">
                                      <CheckCircle2 className="h-3 w-3" /> Active
                                    </span>
                                  ) : (
                                    <span className={`text-[9.5px] font-bold shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${isLight ? "text-amber-700" : "text-amber-400"}`}>
                                      Switch →
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Section: NSW NHCs */}
                        <div>
                          <div className="text-[9px] font-mono uppercase tracking-wider font-bold text-blue-400 px-1 mb-1">
                            New South Wales Sales Team
                          </div>
                          <div className="space-y-1">
                            {KNOWN_STAFF_PROFILES.filter((p) => p.role !== "marketing" && (p.division === "NSW" || p.state === "NSW")).map((p) => {
                              const isCurrent = activeUser?.id === p.id || activeUser?.email?.toLowerCase() === p.email.toLowerCase();
                              return (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => handleSwitchToProfile(p)}
                                  disabled={isCurrent}
                                  className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between transition-all group ${
                                    isCurrent
                                      ? isLight
                                        ? "bg-amber-50 border border-amber-300 text-slate-900 font-bold"
                                        : "bg-amber-500/15 border border-amber-500/30 text-white font-bold"
                                      : isLight
                                        ? "hover:bg-slate-100 text-slate-700 cursor-pointer"
                                        : "hover:bg-slate-800/70 text-slate-300 cursor-pointer"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={`h-5 w-5 rounded-full bg-gradient-to-br ${p.accentColor || "from-indigo-500 to-blue-600"} flex items-center justify-center text-white text-[9px] font-black shrink-0 shadow-xs`}>
                                      {p.avatarInitials}
                                    </div>
                                    <div className="truncate">
                                      <div className="flex items-center gap-1.5">
                                        <span className="truncate font-semibold leading-tight text-[11px]">{p.name}</span>
                                      </div>
                                      <span className={`block text-[9.5px] truncate leading-none mt-0.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                                        {p.title} • {p.displayCentre.replace(" Display Home", "").replace(" Display", "")}
                                      </span>
                                    </div>
                                  </div>
                                  {isCurrent ? (
                                    <span className="text-[9px] font-bold text-emerald-500 dark:text-emerald-400 shrink-0 font-mono flex items-center gap-0.5">
                                      <CheckCircle2 className="h-3 w-3" /> Active
                                    </span>
                                  ) : (
                                    <span className={`text-[9.5px] font-bold shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${isLight ? "text-amber-700" : "text-amber-400"}`}>
                                      Switch →
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className={`pt-1 border-t ${isLight ? "border-slate-200" : "border-slate-800"}`}>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 font-semibold ${
                        isLight
                          ? "hover:bg-rose-50 text-rose-700"
                          : "hover:bg-rose-950/40 text-rose-400"
                      }`}
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => navigate({ to: "/auth", replace: true })}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-xs border ${
            isLight
              ? "bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100"
              : "bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30"
          }`}
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
