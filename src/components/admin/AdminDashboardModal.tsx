import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
  Activity,
  User,
  FileText,
  Layers,
  Eye,
  ArrowRight,
  MessageSquarePlus,
  Bug,
  Lightbulb,
  HelpCircle,
  Copy,
  Maximize2,
  MapPin,
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
import {
  getActivityLogs,
  clearActivityLogs,
  onActivityLogged,
  type ActivityLogItem,
} from "@/lib/activityLog";
import {
  getSupportTickets,
  getSupportTicketsAsync,
  updateSupportTicketStatus,
  deleteSupportTicket,
  markAllSupportTicketsRead,
  onSupportTicketsChanged,
  formatTicketAsAiPrompt,
  formatAllOpenTicketsAsAiPrompt,
  type SupportTicket,
} from "@/lib/supportFeedback";
import { isMorganHales } from "@/lib/access";
import {
  KNOWN_STAFF_PROFILES,
  getActiveStaffUser,
  setActiveStaffUser,
  switchActiveStaffProfile,
  type StaffProfile,
} from "@/lib/authSession";
import { setActiveDivision } from "@/lib/divisionContext";
import { useTheme } from "@/lib/theme";

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "support" | "approvals" | "users" | "alerts" | "activity";
}

export function AdminDashboardModal({
  isOpen,
  onClose,
  initialTab = "support",
}: AdminDashboardModalProps) {
  const { mode } = useTheme();
  const isLight = mode === "normal";
  const [activeTab, setActiveTab] = useState<
    "support" | "approvals" | "users" | "alerts" | "activity"
  >(initialTab);
  const [requests, setRequests] = useState<AdminAccessRequest[]>(() => getAllAccessRequests());
  const [alerts, setAlerts] = useState<AdminSystemAlert[]>(() => getAllSystemAlerts());
  const [activities, setActivities] = useState<ActivityLogItem[]>(() => getActivityLogs());
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(() => getSupportTickets());
  const [supportFilter, setSupportFilter] = useState<
    "all" | "open" | "resolved" | "issue" | "feedback"
  >("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    author: string;
    page: string;
  } | null>(null);
  const currentUser = getActiveStaffUser();
  const hasMorganAccess = isMorganHales(currentUser) || currentUser?.role === "admin";

  const refreshData = () => {
    setRequests(getAllAccessRequests());
    setAlerts(getAllSystemAlerts());
    setActivities(getActivityLogs());
    setSupportTickets(getSupportTickets());
    void getSupportTicketsAsync().then((merged) => setSupportTickets(merged));
  };

  useEffect(() => {
    if (!isOpen) return;
    refreshData();
    const unsub = onAdminAlertsChanged(() => refreshData());
    const unsubAct = onActivityLogged(() => refreshData());
    const unsubSup = onSupportTicketsChanged(() => refreshData());
    return () => {
      unsub();
      unsubAct();
      unsubSup();
    };
  }, [isOpen]);

  if (!isOpen || !hasMorganAccess) return null;

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const unreadAlerts = alerts.filter((a) => !a.read);
  const openTickets = supportTickets.filter((t) => t.status !== "resolved");

  const filteredSupportTickets = supportTickets.filter((t) => {
    if (supportFilter === "open") return t.status !== "resolved";
    if (supportFilter === "resolved") return t.status === "resolved";
    if (supportFilter === "issue") return t.category === "issue";
    if (supportFilter === "feedback") return t.category === "feedback";
    return true;
  });

  const handleCopyPrompt = async (text: string, idKey: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedId(idKey);
    setTimeout(() => {
      setCopiedId((prev) => (prev === idKey ? null : prev));
    }, 2500);
  };

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

  const handleClearActivities = () => {
    clearActivityLogs();
    refreshData();
    toast.info("Website activity log cleared.");
  };

  const handleSwitchToStaff = (staff: StaffProfile) => {
    toast.success(`Switched login to ${staff.name} (${staff.title || staff.role})`);
    onClose();
    switchActiveStaffProfile(staff);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
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
        <div className="px-6 pt-3 border-b border-slate-800/80 flex items-center gap-2 bg-slate-950/50 flex-wrap">
          <button
            type="button"
            data-testid="admin-tab-support"
            onClick={() => {
              setActiveTab("support");
              markAllSupportTicketsRead();
              refreshData();
            }}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === "support"
                ? "border-emerald-400 text-emerald-300 bg-slate-900/90"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <MessageSquarePlus className="h-4 w-4" />
            <span>Support &amp; Feedback Log</span>
            {openTickets.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500 text-slate-950 font-bold text-[10px]">
                {openTickets.length}
              </span>
            )}
          </button>

          <button
            type="button"
            data-testid="admin-tab-approvals"
            onClick={() => setActiveTab("approvals")}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
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
            onClick={() => setActiveTab("activity")}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "activity"
                ? "border-emerald-400 text-emerald-300 bg-slate-900/90"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Website Activity</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-[10px]">
              {activities.length}
            </span>
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
          {/* TAB 0: SUPPORT & FEEDBACK LOG (MORGAN EXCLUSIVE) */}
          {activeTab === "support" && (
            <div className="space-y-4" data-testid="admin-support-log-panel">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className={`text-sm font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                      Team Help, Support &amp; Feedback Log
                    </h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                        isLight
                          ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                          : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      }`}
                    >
                      MORGAN ACCESS ONLY
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                    Review issues, cropped screen snips, and improvement ideas submitted by colleagues across the website.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {openTickets.length > 0 && (
                    <Button
                      size="sm"
                      data-testid="copy-all-open-support-prompt-btn"
                      onClick={() =>
                        handleCopyPrompt(
                          formatAllOpenTicketsAsAiPrompt(supportTickets),
                          "bulk_all_open"
                        )
                      }
                      className="h-8 text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold gap-1.5 shadow-md cursor-pointer"
                    >
                      {copiedId === "bulk_all_open" ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Copied Prompt for All Open Issues!</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Copy All Open Issues ({openTickets.length}) as AI Prompt</span>
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={refreshData}
                    className="h-8 text-xs border-slate-800 bg-slate-950 text-slate-300 gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" /> Refresh
                  </Button>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(
                  [
                    { id: "all", label: `All (${supportTickets.length})` },
                    { id: "open", label: `Open (${openTickets.length})` },
                    {
                      id: "resolved",
                      label: `Resolved (${supportTickets.filter((t) => t.status === "resolved").length})`,
                    },
                    {
                      id: "issue",
                      label: `Problems (${supportTickets.filter((t) => t.category === "issue").length})`,
                    },
                    {
                      id: "feedback",
                      label: `Feedback (${supportTickets.filter((t) => t.category === "feedback").length})`,
                    },
                  ] as const
                ).map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setSupportFilter(pill.id)}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                      supportFilter === pill.id
                        ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {/* Tickets List */}
              {filteredSupportTickets.length === 0 ? (
                <div className="text-center py-12 border border-slate-800 rounded-2xl bg-slate-950/60 p-8 space-y-2">
                  <MessageSquarePlus className="h-10 w-10 text-emerald-400 mx-auto opacity-80" />
                  <h5 className="text-sm font-bold text-slate-200">
                    No Support or Feedback Requests Found
                  </h5>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    When colleagues use the "Help &amp; Support" button in the top toolbar to report an issue or attach a cropped screen snip, it will appear right here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
                  {filteredSupportTickets.map((ticket) => {
                    const isResolved = ticket.status === "resolved";
                    return (
                      <div
                        key={ticket.id}
                        data-testid="support-ticket-card"
                        className={`p-4 rounded-2xl border transition-all ${
                          isResolved
                            ? isLight
                              ? "border-slate-200 bg-slate-50 opacity-75"
                              : "border-slate-800/80 bg-slate-950/40 opacity-75"
                            : ticket.category === "issue"
                              ? isLight
                                ? "border-rose-300 bg-rose-50/40"
                                : "border-rose-500/40 bg-rose-950/15"
                              : ticket.category === "feedback"
                                ? isLight
                                  ? "border-amber-300 bg-amber-50/40"
                                  : "border-amber-500/40 bg-amber-950/15"
                                : isLight
                                  ? "border-cyan-300 bg-cyan-50/40"
                                  : "border-cyan-500/40 bg-cyan-950/15"
                        }`}
                      >
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          {/* Left: Author, Page, Message */}
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`font-bold text-sm ${
                                  isLight ? "text-slate-900" : "text-white"
                                }`}
                              >
                                {ticket.authorName}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded border font-mono ${
                                  isLight
                                    ? "bg-white text-slate-700 border-slate-300"
                                    : "bg-slate-800 text-slate-300 border-slate-700"
                                }`}
                              >
                                {ticket.authorRole}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1 border ${
                                  ticket.category === "issue"
                                    ? isLight
                                      ? "bg-rose-100 text-rose-900 border-rose-300"
                                      : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                                    : ticket.category === "feedback"
                                      ? isLight
                                        ? "bg-amber-100 text-amber-900 border-amber-300"
                                        : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                      : isLight
                                        ? "bg-cyan-100 text-cyan-900 border-cyan-300"
                                        : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                                }`}
                              >
                                {ticket.category === "issue" ? (
                                  <>
                                    <Bug className="h-3 w-3" /> Problem / Bug
                                  </>
                                ) : ticket.category === "feedback" ? (
                                  <>
                                    <Lightbulb className="h-3 w-3" /> Feedback
                                  </>
                                ) : (
                                  <>
                                    <HelpCircle className="h-3 w-3" /> Question
                                  </>
                                )}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-md border font-mono flex items-center gap-1 ${
                                  isLight
                                    ? "bg-white border-emerald-300 text-emerald-800"
                                    : "bg-slate-900 border-slate-800 text-emerald-400"
                                }`}
                              >
                                <MapPin className="h-3 w-3" />
                                {ticket.pageTitle}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase border ${
                                  isResolved
                                    ? isLight
                                      ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                                      : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                    : isLight
                                      ? "bg-amber-100 text-amber-900 border-amber-300"
                                      : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                }`}
                              >
                                {isResolved ? "Resolved" : "Open"}
                              </span>
                            </div>

                            <p
                              className={`text-xs sm:text-sm leading-relaxed whitespace-pre-wrap p-3 rounded-xl border ${
                                isLight
                                  ? "bg-white text-slate-900 border-slate-200 shadow-2xs"
                                  : "bg-slate-950/60 text-slate-100 border-slate-800/80"
                              }`}
                            >
                              {ticket.message}
                            </p>

                            <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
                              <span
                                className={`text-[10px] font-mono flex items-center gap-1 ${
                                  isLight ? "text-slate-600" : "text-slate-400"
                                }`}
                              >
                                <Clock className="h-3 w-3" />
                                {new Date(ticket.createdAt).toLocaleString()} &bull;{" "}
                                {ticket.authorEmail}
                              </span>

                              <div className="flex items-center gap-2 flex-wrap">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  data-testid="copy-ticket-prompt-btn"
                                  onClick={() =>
                                    handleCopyPrompt(
                                      formatTicketAsAiPrompt(ticket),
                                      ticket.id
                                    )
                                  }
                                  className={`h-7 px-2.5 text-[11px] font-bold gap-1 cursor-pointer ${
                                    isLight
                                      ? "border-emerald-400 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                                      : "border-emerald-500/40 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/50"
                                  }`}
                                >
                                  {copiedId === ticket.id ? (
                                    <>
                                      <Check className="h-3 w-3" />
                                      <span>Copied AI Fix Prompt!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-3 w-3" />
                                      <span>Copy AI Fix Prompt</span>
                                    </>
                                  )}
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  data-testid="toggle-ticket-status-btn"
                                  onClick={() => {
                                    updateSupportTicketStatus(
                                      ticket.id,
                                      isResolved ? "open" : "resolved"
                                    );
                                    refreshData();
                                  }}
                                  className={`h-7 px-2.5 text-[11px] gap-1 cursor-pointer ${
                                    isResolved
                                      ? "border-slate-700 bg-slate-900 text-slate-300 hover:text-white"
                                      : "border-emerald-500/40 bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-bold"
                                  }`}
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>{isResolved ? "Reopen" : "Mark Resolved"}</span>
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    deleteSupportTicket(ticket.id);
                                    refreshData();
                                  }}
                                  className="h-7 px-2 text-[11px] border-slate-800 bg-slate-950 text-rose-400 hover:bg-rose-950/40 cursor-pointer"
                                  title="Delete ticket"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Right: Attached Cropped Screenshot Thumbnail */}
                          {ticket.screenshotDataUrl && (
                            <div className="w-full md:w-48 shrink-0 space-y-1.5">
                              <button
                                type="button"
                                data-testid="support-ticket-screenshot-btn"
                                onClick={() =>
                                  setLightboxImage({
                                    url: ticket.screenshotDataUrl!,
                                    author: ticket.authorName,
                                    page: ticket.pageTitle,
                                  })
                                }
                                className="group relative w-full rounded-xl overflow-hidden border border-emerald-500/40 bg-slate-950 aspect-video flex items-center justify-center cursor-pointer"
                              >
                                <img
                                  src={ticket.screenshotDataUrl}
                                  alt="Cropped website snip"
                                  className="max-h-28 w-auto object-contain group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-[11px] font-bold text-white">
                                  <Maximize2 className="h-3.5 w-3.5 text-emerald-400" />
                                  <span>Enlarge Snip</span>
                                </div>
                              </button>
                              <span className="block text-center text-[10px] font-mono text-emerald-400">
                                ✂️ Attached Screen Snip
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

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
                {KNOWN_STAFF_PROFILES.map((staff) => {
                  const isCurrent = currentUser?.id === staff.id || currentUser?.email?.toLowerCase() === staff.email.toLowerCase();
                  return (
                    <div
                      key={staff.id}
                      className={`p-4 rounded-2xl border ${
                        isCurrent
                          ? "border-amber-500/50 bg-amber-950/20 shadow-md shadow-amber-500/10"
                          : "border-slate-800 bg-slate-950/70 hover:border-slate-750"
                      } flex flex-col justify-between gap-3 relative overflow-hidden transition-all`}
                    >
                      <div className="flex items-start gap-3.5">
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
                              {staff.role === "admin" ? "System Admin" : staff.title || "NHC"}
                            </span>
                          </div>

                          <div className="text-xs text-slate-300 font-mono truncate">{staff.email}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                            <Phone className="h-3 w-3 text-slate-500" /> {staff.phone}
                          </div>
                          <div className="text-[10px] text-amber-400 flex items-center gap-1 pt-0.5">
                            <Building className="h-3 w-3" /> {staff.displayCentre} ({staff.state})
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <div className="text-[10px] text-slate-400 font-mono">
                          {staff.division || staff.state} Division
                        </div>
                        {isCurrent ? (
                          <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Active Profile
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleSwitchToStaff(staff)}
                            className="h-7.5 px-3 text-xs bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 font-semibold border border-slate-700 transition-all flex items-center gap-1.5"
                          >
                            <Eye className="h-3.5 w-3.5" /> Preview Login
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
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

          {/* TAB 4: WEBSITE ACTIVITY FEED */}
          {activeTab === "activity" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Live Website Activity &amp; Audit Trail</h4>
                  <p className="text-xs text-slate-400">
                    Real-time chronological log of staff logins, package edits, lot updates, and quote generations.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={refreshData}
                    className="h-7 text-xs border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Refresh
                  </Button>
                  {activities.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleClearActivities}
                      className="h-7 text-xs border-rose-900/50 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50"
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Clear Feed
                    </Button>
                  )}
                </div>
              </div>

              {activities.length === 0 ? (
                <div className="text-center py-12 border border-slate-800 rounded-2xl bg-slate-950/60 p-8 space-y-2">
                  <Activity className="h-10 w-10 text-emerald-400 mx-auto opacity-80" />
                  <h5 className="text-sm font-bold text-slate-200">No Activity Recorded Yet</h5>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    New staff logins and package modifications will automatically stream into this feed.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {activities.map((item) => {
                    const timeAgo = Math.max(0, Math.round((Date.now() - new Date(item.timestamp).getTime()) / 60000));
                    const timeAgoStr =
                      timeAgo < 1
                        ? "Just now"
                        : timeAgo < 60
                          ? `${timeAgo}m ago`
                          : timeAgo < 60 * 24
                            ? `${Math.round(timeAgo / 60)}h ago`
                            : `${Math.round(timeAgo / (60 * 24))}d ago`;

                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 flex items-start gap-3 hover:border-slate-700 transition-colors"
                      >
                        <div className="mt-0.5">
                          {item.type === "login" ? (
                            <div className="h-7 w-7 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                              <User className="h-3.5 w-3.5" />
                            </div>
                          ) : item.type === "package_edit" ? (
                            <div className="h-7 w-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                              <FileText className="h-3.5 w-3.5" />
                            </div>
                          ) : item.type === "lot_edit" ? (
                            <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                              <Layers className="h-3.5 w-3.5" />
                            </div>
                          ) : (
                            <div className="h-7 w-7 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                              <Sparkles className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-white">{item.actorName}</span>
                              {item.actorRole && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                                  {item.actorRole}
                                </span>
                              )}
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                                item.type === "login"
                                  ? "bg-cyan-950 text-cyan-300 border border-cyan-800"
                                  : item.type === "package_edit"
                                    ? "bg-amber-950 text-amber-300 border border-amber-800"
                                    : item.type === "lot_edit"
                                      ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                      : "bg-purple-950 text-purple-300 border border-purple-800"
                              }`}>
                                {item.type.replace("_", " ")}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">
                              {timeAgoStr} &bull; {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 leading-snug">{item.description}</p>
                        </div>
                      </div>
                    );
                  })}
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

      {/* Fullscreen Lightbox for Attached Support Screen Snips */}
      {lightboxImage && (
        <div
          data-testid="support-snip-lightbox"
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-[10000] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-8"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-5xl w-full bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="text-xs text-slate-200">
                <span className="font-bold text-emerald-400">Cropped Screen Snip</span> &bull;{" "}
                Submitted by <strong className="text-white">{lightboxImage.author}</strong> on{" "}
                <span className="font-mono text-slate-400">{lightboxImage.page}</span>
              </div>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="h-7 w-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-slate-950">
              <img
                src={lightboxImage.url}
                alt="Full size cropped screen snip"
                className="max-w-full max-h-[75vh] object-contain rounded-lg border border-slate-800"
              />
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
