import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  Building,
  Smartphone,
  Mail,
  Phone,
  Trash2,
  Check,
  Sparkles,
  RefreshCw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getAllAccessRequests,
  getPendingAccessRequests,
  approveAccessRequest,
  rejectAccessRequest,
  getAllSystemAlerts,
  markAllAlertsAsRead,
  clearAllSystemAlerts,
  onAdminAlertsChanged,
  type AdminAccessRequest,
  type AdminSystemAlert,
} from "@/lib/adminAlerts";
import { KNOWN_STAFF_PROFILES, getActiveStaffUser, type StaffProfile } from "@/lib/authSession";

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminDashboardModal({ isOpen, onClose }: AdminDashboardModalProps) {
  const [activeTab, setActiveTab] = useState<"approvals" | "users" | "alerts">("approvals");
  const [requests, setRequests] = useState<AdminAccessRequest[]>(() => getAllAccessRequests());
  const [alerts, setAlerts] = useState<AdminSystemAlert[]>(() => getAllSystemAlerts());
  const currentUser = getActiveStaffUser();

  const refreshData = () => {
    setRequests(getAllAccessRequests());
    setAlerts(getAllSystemAlerts());
  };

  useEffect(() => {
    if (!isOpen) return;
    refreshData();
    const unsub = onAdminAlertsChanged(() => refreshData());
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const unreadAlerts = alerts.filter((a) => !a.read);

  const handleApprove = (id: string, name: string) => {
    approveAccessRequest(id);
    refreshData();
    toast.success(`Access approved for ${name}. They can now sign into the portal.`);
  };

  const handleReject = (id: string, name: string) => {
    rejectAccessRequest(id);
    refreshData();
    toast.error(`Login request rejected for ${name}.`);
  };

  const handleMarkAllRead = () => {
    markAllAlertsAsRead();
    refreshData();
    toast.info("All system alerts marked as read.");
  };

  const handleClearAlerts = () => {
    clearAllSystemAlerts();
    refreshData();
    toast.info("System alerts feed cleared.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-4xl rounded-3xl border border-slate-800 bg-slate-900/95 backdrop-blur-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-wide">Website Admin Portal</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  SYSTEM ADMINISTRATOR
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Staff Authentication Approvals, Authorized Logins &amp; Security Alert Center
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full border border-slate-800 bg-slate-950/80 text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-800/80 flex items-center gap-2 bg-slate-950/50">
          <button
            onClick={() => setActiveTab("approvals")}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "approvals"
                ? "border-amber-400 text-amber-300 bg-slate-900/90"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <UserCheck className="h-4 w-4" />
            <span>Pending Approvals</span>
            {pendingRequests.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px]">
                {pendingRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "users"
                ? "border-cyan-400 text-cyan-300 bg-slate-900/90"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Authorized Logins ({KNOWN_STAFF_PROFILES.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("alerts")}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "alerts"
                ? "border-rose-400 text-rose-300 bg-slate-900/90"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Bell className="h-4 w-4" />
            <span>System Alerts &amp; Bugs</span>
            {unreadAlerts.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold text-[10px] animate-pulse">
                {unreadAlerts.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: PENDING APPROVALS */}
          {activeTab === "approvals" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Login Access Requests</h4>
                  <p className="text-xs text-slate-400">
                    Staff members with @hudsonhomes.com.au emails who requested platform access.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={refreshData}
                  className="h-8 text-xs border-slate-800 bg-slate-950 text-slate-300 gap-1.5"
                >
                  <RefreshCw className="h-3 w-3" /> Refresh
                </Button>
              </div>

              {pendingRequests.length === 0 ? (
                <div className="text-center py-12 border border-slate-800 rounded-2xl bg-slate-950/60 p-8 space-y-2">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto opacity-80" />
                  <h5 className="text-sm font-bold text-slate-200">No Pending Approvals</h5>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    All staff login attempts are verified against the authorized whitelist.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl border border-amber-500/40 bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{req.name}</span>
                          <span className="text-[10px] bg-amber-500/30 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-mono">
                            Pending Approval
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-300 font-mono">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5 text-slate-400" /> {req.email}
                          </span>
                          {req.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5 text-slate-400" /> {req.phone}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 pt-1">
                          <Clock className="h-3 w-3" /> Requested: {new Date(req.requestedAt).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleReject(req.id, req.name)}
                          variant="outline"
                          className="h-8.5 text-xs border-slate-700 bg-slate-900 text-rose-400 hover:bg-rose-950/40 hover:border-rose-700"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(req.id, req.name)}
                          className="h-8.5 text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-md"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Approve Access
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AUTHORIZED USERS */}
          {activeTab === "users" && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-white">Active Authorized Staff Logins</h4>
                <p className="text-xs text-slate-400">
                  Approved staff permitted to access the Hudson Homes enterprise workspace.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {KNOWN_STAFF_PROFILES.map((staff) => (
                  <div
                    key={staff.id}
                    className="p-4 rounded-2xl border border-slate-800 bg-slate-950/70 flex items-start gap-3.5 relative overflow-hidden"
                  >
                    <div
                      className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${staff.accentColor} flex items-center justify-center text-white text-xs font-black shadow-md flex-none`}
                    >
                      {staff.avatarInitials}
                    </div>

                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-sm truncate">{staff.name}</span>
                        <span
                          className={`text-[9.5px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                            staff.role === "admin"
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                          }`}
                        >
                          {staff.role === "admin" ? "System Admin" : "NHC"}
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 font-mono truncate">{staff.email}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                        <Phone className="h-3 w-3 text-slate-500" /> {staff.phone}
                      </div>
                      <div className="text-[10px] text-amber-400 flex items-center gap-1 pt-1">
                        <Building className="h-3 w-3" /> {staff.displayCentre}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SYSTEM ALERTS & BUGS */}
          {activeTab === "alerts" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">System Security &amp; Error Activity Feed</h4>
                  <p className="text-xs text-slate-400">
                    Live log of access approvals, login security alerts, and system health status.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleMarkAllRead}
                    className="h-8 text-xs border-slate-800 bg-slate-950 text-slate-300"
                  >
                    Mark All Read
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClearAlerts}
                    className="h-8 text-xs border-slate-800 bg-slate-950 text-rose-400 hover:bg-rose-950/30"
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Clear Feed
                  </Button>
                </div>
              </div>

              {alerts.length === 0 ? (
                <div className="text-center py-12 border border-slate-800 rounded-2xl bg-slate-950/60 p-8 space-y-2">
                  <ShieldCheck className="h-10 w-10 text-cyan-400 mx-auto opacity-80" />
                  <h5 className="text-sm font-bold text-slate-200">System Healthy &amp; Secure</h5>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    No active security alerts or unhandled exceptions logged.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {alerts.map((a) => (
                    <div
                      key={a.id}
                      className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
                        !a.read
                          ? a.severity === "danger"
                            ? "border-rose-500/50 bg-rose-950/30"
                            : a.severity === "warning"
                            ? "border-amber-500/50 bg-amber-950/20"
                            : "border-cyan-500/50 bg-cyan-950/20"
                          : "border-slate-800 bg-slate-950/60"
                      }`}
                    >
                      <div className="mt-0.5">
                        {a.severity === "danger" ? (
                          <XCircle className="h-4 w-4 text-rose-400" />
                        ) : a.severity === "warning" ? (
                          <AlertTriangle className="h-4 w-4 text-amber-400" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-white">{a.title}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(a.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">{a.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <span>Logged in as: <strong className="text-white">{currentUser?.name}</strong> (Administrator)</span>
          <Button
            size="sm"
            onClick={onClose}
            className="h-8 text-xs bg-slate-800 hover:bg-slate-700 text-white font-semibold"
          >
            Close Admin Portal
          </Button>
        </div>
      </div>
    </div>
  );
}
