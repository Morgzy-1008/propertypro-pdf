import React, { useState, useEffect, useMemo } from "react";
import {
  CrmLead,
  CrmStageId,
  CRM_PIPELINE_STAGES,
  HUDSON_CONSULTANTS,
  CrmMessage,
  normalizeConsultantId,
} from "@/lib/crm/crmTypes";
import {
  loadAllCrmLeads,
  saveCrmLead,
  updateCrmLeadStage,
  loadAllCrmMessages,
  saveCrmMessage,
  getOutlookSyncStatus,
  triggerOutlookSync,
  logLeftVoicemail,
} from "@/lib/crm/crmStorage";
import {
  loadGhlSettings,
  syncHoneyGhlLeadsToCrm,
  queueOrExecuteGhlAction,
} from "@/lib/crm/ghlIntegration";
import { calculateLeadHeatScore } from "@/lib/crm/crmAiEngine";
import { CrmKanbanBoard } from "./CrmKanbanBoard";
import { CrmTopTrBoard } from "./CrmTopTrBoard";
import { CrmBulkSmsModal } from "./CrmBulkSmsModal";
import { CrmTelnyxSettingsModal } from "./CrmTelnyxSettingsModal";
import { CrmTeamChatView } from "./CrmTeamChatView";
import { CrmCommissionDashboard } from "./CrmCommissionDashboard";
import { CrmClientDetailPage } from "./CrmClientDetailPage";
import { CrmConversationsView } from "./CrmConversationsView";
import { CrmTasksView } from "./CrmTasksView";
import { CrmNewClientModal } from "./CrmNewClientModal";
import { CrmHoneyImportModal } from "./CrmHoneyImportModal";
import { CrmQuickCommunicationModal } from "./CrmQuickCommunicationModal";
import { CrmAskHoneyCopilot } from "./CrmAskHoneyCopilot";
import { CrmGhlControlModal } from "./CrmGhlControlModal";
import { CrmPriorityQueueView } from "./CrmPriorityQueueView";
import { CrmHighDensityTableView } from "./CrmHighDensityTableView";
import {
  Users,
  Award,
  Plus,
  Monitor,
  Search,
  MessageSquare,
  RefreshCw,
  Sparkles,
  TrendingUp,
  DollarSign,
  Briefcase,
  CheckSquare,
  FileSpreadsheet,
  Lock,
  Flame,
  Smartphone,
  PhoneCall,
  UserCheck,
  AlertTriangle,
  Bell,
  Settings,
  Shield,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { formatAud } from "@/lib/pricing";
import { useTheme } from "@/lib/theme";
import {
  getActiveStaffUser,
  onStaffUserChanged,
  canViewRemuneration,
  type StaffProfile,
} from "@/lib/authSession";

export function CrmWorkspace() {
  const { mode } = useTheme();
  const isLight = mode === "normal";

  const [staffUser, setStaffUser] = useState<StaffProfile | null>(() => getActiveStaffUser());
  const canViewCommissions = useMemo(() => canViewRemuneration(staffUser), [staffUser]);
  const isAdmin = useMemo(
    () =>
      staffUser?.role === "admin" ||
      staffUser?.id === "morgan-hales" ||
      staffUser?.email === "morgan.hales@hudsonhomes.com.au",
    [staffUser]
  );

  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [messages, setMessages] = useState<CrmMessage[]>([]);
  const [activeTab, setActiveTab] = useState<
    | "priority_queue"
    | "table"
    | "kanban"
    | "top_tr"
    | "tasks"
    | "team_chat"
    | "conversations"
    | "commissions"
  >(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("tab");
      if (
        t === "priority_queue" ||
        t === "table" ||
        t === "tasks" ||
        t === "top_tr" ||
        t === "team_chat" ||
        t === "conversations" ||
        t === "commissions" ||
        t === "kanban"
      ) {
        return t as any;
      }
    }
    return "priority_queue";
  });
  const [selectedConsultantId, setSelectedConsultantId] = useState<string>(() => {
    const user = getActiveStaffUser();
    return normalizeConsultantId(user?.id || user?.email || user?.name);
  });
  const [userRole, setUserRole] = useState<"nhc" | "viewer">("nhc");
  const [isAssistantMode, setIsAssistantMode] = useState<boolean>(false);

  // Modals state
  const [activeLead, setActiveLead] = useState<CrmLead | null>(null);
  const [isClientDetailOpen, setIsClientDetailOpen] = useState(false);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isHoneyImportModalOpen, setIsHoneyImportModalOpen] = useState(false);
  const [isBulkSmsOpen, setIsBulkSmsOpen] = useState(false);
  const [isTelnyxSettingsOpen, setIsTelnyxSettingsOpen] = useState(false);
  const [isGhlControlOpen, setIsGhlControlOpen] = useState(false);
  const [aiFilteredLeadIds, setAiFilteredLeadIds] = useState<string[] | null>(null);
  const [aiFilterLabel, setAiFilterLabel] = useState<string | null>(null);

  // Quick Communication Modal state
  const [quickCommLead, setQuickCommLead] = useState<CrmLead | null>(null);
  const [quickCommChannel, setQuickCommChannel] = useState<"call" | "sms" | "email">("call");
  const [isQuickCommOpen, setIsQuickCommOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [outlookSyncState, setOutlookSyncState] = useState(getOutlookSyncStatus());
  const [ghlSettingsState, setGhlSettingsState] = useState(() => loadGhlSettings());

  const refreshData = async () => {
    const loadedLeads = await loadAllCrmLeads();
    const loadedMessages = await loadAllCrmMessages();
    setLeads(loadedLeads);
    setMessages(loadedMessages);
    setGhlSettingsState(loadGhlSettings());
  };

  useEffect(() => {
    void (async () => {
      await syncHoneyGhlLeadsToCrm();
      await refreshData();
    })();
    const unsub = onStaffUserChanged((user) => {
      setStaffUser(user);
      if (user) {
        setSelectedConsultantId(normalizeConsultantId(user.id || user.email || user.name));
      }
      if (!canViewRemuneration(user)) {
        setActiveTab((prev) => (prev === "commissions" ? "priority_queue" : prev));
      }
    });

    const handleCrmChange = () => {
      refreshData();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("hudson_crm_change", handleCrmChange);
      window.addEventListener("hudson_ghl_settings_change", handleCrmChange);
    }

    return () => {
      unsub();
      if (typeof window !== "undefined") {
        window.removeEventListener("hudson_crm_change", handleCrmChange);
        window.removeEventListener("hudson_ghl_settings_change", handleCrmChange);
      }
    };
  }, []);

  useEffect(() => {
    if (!canViewCommissions && activeTab === "commissions") {
      setActiveTab("kanban");
    }
  }, [canViewCommissions, activeTab]);

  const handleUpdateStage = async (leadId: string, newStage: CrmStageId) => {
    const updated = await updateCrmLeadStage(leadId, newStage);
    setLeads(updated);
    toast.success("Lead moved to new pipeline stage!");
  };

  const handleOpenLead = (lead: CrmLead) => {
    setActiveLead(lead);
    setIsClientDetailOpen(true);
  };

  const handleSaveLead = async (updatedLead: CrmLead) => {
    const list = await saveCrmLead(updatedLead);
    setLeads(list);
  };

  const handleSendMessage = async (msg: Partial<CrmMessage>) => {
    const fullMsg: CrmMessage = {
      id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      clientEmail: msg.clientEmail || "",
      direction: msg.direction || "outbound",
      channel: msg.channel || "email",
      senderName: msg.senderName || "Morgan Hales",
      recipientName: msg.recipientName || "",
      body: msg.body || "",
      timestamp: msg.timestamp || new Date().toISOString(),
      isRead: msg.isRead ?? true,
      ...msg,
    } as CrmMessage;
    const list = await saveCrmMessage(fullMsg);
    setMessages(list);
  };

  const handleTriggerSync = () => {
    const next = triggerOutlookSync();
    setOutlookSyncState(next);
    toast.success(`Outlook 365 synchronized! ${next.count} emails captured across all clients.`);
  };

  const handleQuickAction = (lead: CrmLead, action: "call" | "sms" | "email") => {
    setQuickCommLead(lead);
    setQuickCommChannel(action);
    setIsQuickCommOpen(true);
  };

  // Top TR Targets count
  const topTrCount = useMemo(() => {
    return leads.filter((l) => l.isTopTrTarget).length;
  }, [leads]);

  // Count active pending tasks & overdue tasks
  const { openTasksCount, overdueTasksCount } = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    let openCount = 0;
    let overdueCount = 0;

    leads.forEach((lead) => {
      if (
        selectedConsultantId !== "all" &&
        lead.assignedConsultantId !== selectedConsultantId
      ) {
        return;
      }
      (lead.tasks || []).forEach((t) => {
        if (!t.completed) {
          openCount++;
          const lowerDue = (t.dueDate || "").toLowerCase();
          if (
            lowerDue.includes("overdue") ||
            lowerDue.includes("yesterday") ||
            (t.dueDate && t.dueDate < todayStr)
          ) {
            overdueCount++;
          }
        }
      });
    });

    return { openTasksCount: openCount, overdueTasksCount: overdueCount };
  }, [leads, selectedConsultantId]);

  const handleLogLvmQuick = async (lead: CrmLead) => {
    const res = await logLeftVoicemail(lead.id);
    await queueOrExecuteGhlAction({
      actionType: "log_lvm",
      leadId: lead.id,
      leadName: lead.clientName,
      ghlContactId: lead.ghlContactId,
      httpMethod: "POST",
      ghlEndpoint: `/contacts/${lead.ghlContactId || lead.id}/tasks`,
      payload: {
        title: `LVM #${res.lvmCount} Callback — ${lead.clientName}`,
        tags: [`lvm-${res.lvmCount}`],
      },
      summary: `Logged LVM #${res.lvmCount} + Auto-Scheduled Callback Task`,
    });
    toast.success(
      `LVM #${res.lvmCount} logged for ${lead.clientName}! Next callback task auto-scheduled.`
    );
    await refreshData();
  };

  const filteredLeads = leads.filter((l) => {
    const matchesConsultant =
      isAssistantMode ||
      selectedConsultantId === "all" ||
      l.assignedConsultantId === selectedConsultantId ||
      Boolean(l.isUnassignedPool);
    const matchesSearch =
      l.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.mobile.includes(searchTerm) ||
      l.targetEstate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.preferredDesign.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAiCohort =
      !aiFilteredLeadIds || aiFilteredLeadIds.includes(l.id);
    return matchesConsultant && matchesSearch && matchesAiCohort;
  });

  const briefingMetrics = useMemo(() => {
    let speedToLeadCount = 0;
    let staleCount = 0;
    let lvmQueueCount = 0;
    let hotCount = 0;

    filteredLeads.forEach((l) => {
      const h = calculateLeadHeatScore(l);
      if (h.isSpeedToLead) speedToLeadCount++;
      if (h.isStaleLead) staleCount++;
      if ((l.lvmCount || 0) > 0) lvmQueueCount++;
      if (h.score >= 80) hotCount++;
    });

    return { speedToLeadCount, staleCount, lvmQueueCount, hotCount };
  }, [filteredLeads]);

  const totalPipelineVal = leads.reduce((acc, l) => acc + (l.totalEstimatedDealValue || 0), 0);

  return (
    <div className={`min-h-screen ${isLight ? "bg-slate-50 text-slate-900" : "bg-slate-950 text-slate-100"} p-4 sm:p-6 lg:p-8 2xl:p-12 w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto space-y-5 font-sans`}>
      {/* Top Header Bar */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b ${isLight ? "border-slate-200" : "border-slate-800/80"} pb-5`}>
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs px-2.5 py-1 rounded-md tracking-wider uppercase">
              Hudson Horizon x Honey AI
            </span>
            <h1 className={`text-xl sm:text-2xl font-black ${isLight ? "text-slate-900" : "text-white"} tracking-tight`}>
              Elevated AI Sales Pipeline &amp; Call Cockpit
            </h1>
            <button
              type="button"
              onClick={() => setIsGhlControlOpen(true)}
              className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all"
            >
              🛡️ Honey GHL Mode:{" "}
              {ghlSettingsState.syncMode === "dry_run_sandbox"
                ? "Dry-Run Sandbox Active"
                : ghlSettingsState.syncMode === "two_way_live"
                ? "Two-Way Live Sync"
                : "Read-Only Sync"}
            </button>
            {isAssistantMode && (
              <span className="bg-purple-950/80 text-purple-300 border border-purple-800/80 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <UserCheck className="h-3 w-3" /> Assistant Mode
              </span>
            )}
          </div>
          <p className={`text-xs ${isLight ? "text-slate-600" : "text-slate-400"} mt-1`}>
            GoHighLevel (Honey) API integration, Ask Honey AI natural-language copilot, 1-click LVM cadence, AI call summaries &amp; auto-tasks, and 2-way Quoting/Floorplan links.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Honey GHL API Control & Sandbox Button */}
          <Button
            variant="outline"
            size="sm"
            data-testid="open-ghl-control-btn"
            onClick={() => setIsGhlControlOpen(true)}
            className={`text-xs gap-1.5 font-black ${
              isLight
                ? "border-amber-400 bg-amber-50/80 text-amber-950 hover:bg-amber-100"
                : "border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
            }`}
          >
            <Shield className="h-3.5 w-3.5 text-amber-500" />
            Honey GHL API &amp; Sandbox
          </Button>

          {/* Assistant / NHC Mode Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsAssistantMode(!isAssistantMode);
              toast.info(
                !isAssistantMode
                  ? "Switched to Assistant / Admin Mode (Viewing all pipelines & delegation tools)"
                  : "Switched to Consultant Mode"
              );
            }}
            className={`text-xs gap-1.5 font-bold ${
              isAssistantMode
                ? "bg-purple-950/60 border-purple-600 text-purple-300"
                : isLight
                ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                : "border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
            }`}
          >
            <UserCheck className="h-3.5 w-3.5 text-purple-400" />
            {isAssistantMode ? "Assistant Mode Active" : "Assistant Mode"}
          </Button>

          {/* Bulk SMS Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBulkSmsOpen(true)}
            className={`text-xs gap-1.5 font-semibold ${
              isLight
                ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-50 hover:text-slate-950 shadow-xs"
                : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5 text-amber-500" />
            Bulk SMS
          </Button>

          {/* Telnyx Config */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTelnyxSettingsOpen(true)}
            className={`text-xs gap-1.5 font-semibold ${
              isLight
                ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-50 hover:text-slate-950 shadow-xs"
                : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <PhoneCall className="h-3.5 w-3.5 text-emerald-500" />
            Telnyx Setup
          </Button>

          {/* Import Honey Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHoneyImportModalOpen(true)}
            className={`text-xs gap-1.5 font-semibold ${
              isLight
                ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-50 hover:text-slate-950 shadow-xs"
                : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <FileSpreadsheet className={`h-3.5 w-3.5 ${isLight ? "text-amber-700" : "text-amber-400"}`} />
            Import CSV
          </Button>

          {/* Add New Client */}
          <Button
            size="sm"
            onClick={() => setIsNewClientModalOpen(true)}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs gap-1.5 shadow-md shadow-amber-500/20"
          >
            <Plus className="h-3.5 w-3.5" />
            Add New Client
          </Button>
        </div>
      </div>

      {/* AI Morning Briefing & Stale Lead Rescue Radar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
        <button
          type="button"
          onClick={() => setActiveTab("priority_queue")}
          className={`p-3 rounded-xl border text-left transition-all ${
            isLight ? "bg-white border-slate-200 hover:border-rose-400 shadow-2xs" : "bg-slate-900/60 border-slate-800 hover:border-rose-500/50"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">
            🔥 Blazing Hot Leads (80+ Score)
          </span>
          <span className="text-base font-black">{briefingMetrics.hotCount} Priority Leads</span>
          <span className="block text-[10px] text-slate-500">Registered land &amp; finance ready</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("priority_queue")}
          className={`p-3 rounded-xl border text-left transition-all ${
            isLight ? "bg-white border-slate-200 hover:border-amber-400 shadow-2xs" : "bg-slate-900/60 border-slate-800 hover:border-amber-500/50"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block">
            ⚡ Speed-to-Lead (&lt;48h)
          </span>
          <span className="text-base font-black">{briefingMetrics.speedToLeadCount} Fresh Enquiries</span>
          <span className="block text-[10px] text-slate-500">New Honey Meta/Google leads</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("priority_queue")}
          className={`p-3 rounded-xl border text-left transition-all ${
            isLight ? "bg-white border-slate-200 hover:border-purple-400 shadow-2xs" : "bg-slate-900/60 border-slate-800 hover:border-purple-500/50"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-500 block">
            📞 LVM Cadence Queue
          </span>
          <span className="text-base font-black">{briefingMetrics.lvmQueueCount} LVM Callbacks</span>
          <span className="block text-[10px] text-slate-500">LVM #1 / #2 / #3 follow-ups</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("priority_queue")}
          className={`p-3 rounded-xl border text-left transition-all ${
            isLight ? "bg-white border-slate-200 hover:border-orange-400 shadow-2xs" : "bg-slate-900/60 border-slate-800 hover:border-orange-500/50"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-500 block">
            ⚠️ Stale Lead Rescue (7d+)
          </span>
          <span className="text-base font-black">{briefingMetrics.staleCount} Need Rescue</span>
          <span className="block text-[10px] text-slate-500">Active quotes/concepts untouched</span>
        </button>

        <div
          className={`p-3 rounded-xl border ${
            isLight ? "bg-white border-slate-200 shadow-2xs" : "bg-slate-900/60 border-slate-800"
          }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 block">
            💰 Total Active Pipeline
          </span>
          <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
            {formatAud(totalPipelineVal)}
          </span>
          <span className="block text-[10px] text-slate-500">{openTasksCount} Active SLA Tasks</span>
        </div>
      </div>

      {/* Ask Honey AI Natural Language Command Bar */}
      <CrmAskHoneyCopilot
        leads={leads}
        onOpenLead={handleOpenLead}
        onQuickAction={handleQuickAction}
        onLogLvmQuick={handleLogLvmQuick}
        onApplyLeadIdFilter={(ids, label) => {
          setAiFilteredLeadIds(ids);
          setAiFilterLabel(label || null);
        }}
        onOpenBulkSmsWithLeads={() => setIsBulkSmsOpen(true)}
        onTasksCreated={refreshData}
      />

      {/* Active AI Cohort Filter Pill if applied */}
      {aiFilteredLeadIds && (
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-xs">
          <span className="font-bold">
            ✨ Active AI Cohort Filter: <strong>{aiFilterLabel}</strong> ({filteredLeads.length} leads shown)
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setAiFilteredLeadIds(null);
              setAiFilterLabel(null);
            }}
            className="h-6 text-xs font-bold"
          >
            Clear AI Filter
          </Button>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className={`flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b pb-3 ${
        isLight ? "border-slate-200" : "border-slate-800/80"
      }`}>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* 0A. Priority Queue & Power Dialer Cockpit */}
          <button
            type="button"
            data-testid="tab-priority-queue"
            onClick={() => setActiveTab("priority_queue")}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === "priority_queue"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : isLight
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                : "text-slate-400 hover:text-white hover:bg-slate-900/80"
            }`}
          >
            <Flame className="h-3.5 w-3.5 text-rose-500" />
            Priority Queue &amp; Call Cockpit
          </button>

          {/* 0B. High-Density Table (Attio / Linear style) */}
          <button
            type="button"
            data-testid="tab-high-density-table"
            onClick={() => setActiveTab("table")}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === "table"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : isLight
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                : "text-slate-400 hover:text-white hover:bg-slate-900/80"
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-emerald-500" />
            High-Density Table
          </button>

          {/* 1. Kanban Pipeline */}
          <button
            type="button"
            data-testid="tab-kanban-pipeline"
            onClick={() => setActiveTab("kanban")}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === "kanban"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : isLight
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                : "text-slate-400 hover:text-white hover:bg-slate-900/80"
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" />
            Pipeline (13 Stages)
          </button>

          {/* 2. Top 10 TR Radar */}
          <button
            type="button"
            onClick={() => setActiveTab("top_tr")}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === "top_tr"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : isLight
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                : "text-slate-400 hover:text-white hover:bg-slate-900/80"
            }`}
          >
            <Flame className="h-3.5 w-3.5 text-rose-500" />
            Top 10 TR Radar
            {topTrCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold border ${
                activeTab === "top_tr"
                  ? "bg-slate-950 text-amber-400 border-slate-800"
                  : "bg-rose-500/20 text-rose-400 border-rose-500/40"
              }`}>
                {topTrCount}
              </span>
            )}
          </button>

          {/* 3. Tasks & Colleague Sharing */}
          <button
            type="button"
            data-testid="tab-tasks-center"
            onClick={() => {
              setActiveTab("tasks");
              if (typeof window !== "undefined") {
                const url = new URL(window.location.href);
                url.searchParams.set("tab", "tasks");
                window.history.replaceState(null, "", url.toString());
              }
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === "tasks"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : isLight
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                : "text-slate-400 hover:text-white hover:bg-slate-900/80"
            }`}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Tasks &amp; Action Lanes
            {openTasksCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold border ${
                overdueTasksCount > 0
                  ? "bg-rose-500 text-white border-rose-600 animate-pulse"
                  : isLight
                  ? "bg-amber-100 text-amber-800 border-amber-300"
                  : "bg-amber-950/80 text-amber-300 border-amber-800/80"
              }`}>
                {openTasksCount}
              </span>
            )}
          </button>

          {/* 4. Internal Team Chat & Handoffs */}
          <button
            type="button"
            onClick={() => setActiveTab("team_chat")}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === "team_chat"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : isLight
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                : "text-slate-400 hover:text-white hover:bg-slate-900/80"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />
            Team Chat
          </button>

          {/* 5. Client Conversations */}
          <button
            type="button"
            onClick={() => setActiveTab("conversations")}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === "conversations"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : isLight
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                : "text-slate-400 hover:text-white hover:bg-slate-900/80"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
            Client Inbox
            <span className={`text-[9px] px-1.5 rounded-full font-mono ${
              isLight ? "bg-slate-200 text-slate-700" : "bg-amber-950/60 text-amber-300"
            }`}>
              {messages.length}
            </span>
          </button>

          {/* 6. Commissions */}
          {canViewCommissions && (
            <button
              type="button"
              onClick={() => setActiveTab("commissions")}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === "commissions"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/80"
              }`}
            >
              <Award className="h-3.5 w-3.5" />
              Commissions
            </button>
          )}
        </div>

        {/* Search & Consultant Filter */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search leads, lot, estate..."
              className={`h-8 pl-8 text-xs w-48 sm:w-60 ${
                isLight ? "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400" : "bg-slate-900 border-slate-700 text-slate-100"
              }`}
            />
          </div>

          {activeTab === "commissions" && !isAdmin ? (
            <div className={`h-8 flex items-center gap-1.5 px-3 rounded-lg border text-xs font-bold shrink-0 ${
              isLight ? "bg-amber-100/80 border-amber-300 text-amber-900" : "bg-amber-500/10 border-amber-500/30 text-amber-300"
            }`}>
              <Lock className="h-3 w-3" />
              <span>{staffUser?.name || "My Account"}</span>
            </div>
          ) : (
            <select
              value={selectedConsultantId}
              onChange={(e) => setSelectedConsultantId(e.target.value)}
              className={`h-8 text-xs rounded-lg border px-2.5 font-medium ${
                isLight ? "bg-white border-slate-300 text-slate-800" : "bg-slate-900 border-slate-700 text-slate-200"
              }`}
            >
              <option value="all">All Consultants (QLD &amp; NSW)</option>
              {HUDSON_CONSULTANTS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.displayOffice})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === "priority_queue" && (
        <CrmPriorityQueueView
          leads={filteredLeads}
          onOpenFullModal={handleOpenLead}
          onQuickAction={handleQuickAction}
          onDataChanged={refreshData}
        />
      )}

      {activeTab === "table" && (
        <CrmHighDensityTableView
          leads={filteredLeads}
          onOpenLead={handleOpenLead}
          onUpdateStage={handleUpdateStage}
          onQuickAction={handleQuickAction}
          onLogLvmQuick={handleLogLvmQuick}
        />
      )}

      {activeTab === "kanban" && (
        <CrmKanbanBoard
          leads={filteredLeads}
          onOpenLead={handleOpenLead}
          onUpdateStage={handleUpdateStage}
          onQuickAction={handleQuickAction}
          canViewCommissions={canViewCommissions}
        />
      )}

      {activeTab === "top_tr" && (
        <CrmTopTrBoard
          leads={filteredLeads}
          onOpenLead={handleOpenLead}
          onQuickAction={handleQuickAction}
          onDataChanged={refreshData}
        />
      )}

      {activeTab === "tasks" && (
        <CrmTasksView
          leads={leads}
          selectedConsultantId={selectedConsultantId}
          onOpenLead={handleOpenLead}
          onQuickAction={handleQuickAction}
          onTasksUpdated={refreshData}
        />
      )}

      {activeTab === "team_chat" && (
        <CrmTeamChatView
          leads={leads}
          onOpenLead={handleOpenLead}
        />
      )}

      {activeTab === "conversations" && (
        <CrmConversationsView
          leads={filteredLeads}
          messages={messages}
          onSendMessage={handleSendMessage}
          onOpenClientProfile={handleOpenLead}
          onTriggerOutlookSync={handleTriggerSync}
          outlookSyncState={outlookSyncState}
        />
      )}

      {activeTab === "commissions" && canViewCommissions && (
        <CrmCommissionDashboard
          leads={leads}
          selectedConsultantId={selectedConsultantId}
          onSelectConsultant={setSelectedConsultantId}
          userRole={userRole}
        />
      )}

      {/* Honey GHL API Control & Sandbox Modal */}
      <CrmGhlControlModal
        isOpen={isGhlControlOpen}
        onClose={() => setIsGhlControlOpen(false)}
        onSynced={refreshData}
      />

      {/* 360° Client Detail Profile Modal */}
      {activeLead && (
        <CrmClientDetailPage
          lead={activeLead}
          isOpen={isClientDetailOpen}
          onClose={() => {
            setIsClientDetailOpen(false);
            refreshData();
          }}
          onSave={async (updated) => {
            await handleSaveLead(updated);
            setActiveLead(updated);
          }}
          onSendMessage={handleSendMessage}
          clientMessages={messages}
        />
      )}

      {/* Add New Client Modal */}
      <CrmNewClientModal
        isOpen={isNewClientModalOpen}
        onClose={() => setIsNewClientModalOpen(false)}
        defaultConsultantId={selectedConsultantId !== "all" ? selectedConsultantId : normalizeConsultantId(staffUser?.id || staffUser?.name)}
        onCreated={(newLead) => {
          setLeads((prev) => [newLead, ...prev.filter((l) => l.id !== newLead.id)]);
          if (selectedConsultantId !== "all" && selectedConsultantId !== newLead.assignedConsultantId) {
            setSelectedConsultantId(newLead.assignedConsultantId);
          }
          setActiveTab("priority_queue");
          void refreshData();
          setActiveLead(newLead);
          setIsClientDetailOpen(true);
        }}
      />

      {/* Bulk SMS Composer Modal */}
      <CrmBulkSmsModal
        isOpen={isBulkSmsOpen}
        onClose={() => setIsBulkSmsOpen(false)}
        leads={leads}
        onSent={refreshData}
        onOpenTelnyxSettings={() => setIsTelnyxSettingsOpen(true)}
      />

      {/* Telnyx Gateway Settings Modal */}
      <CrmTelnyxSettingsModal
        isOpen={isTelnyxSettingsOpen}
        onClose={() => setIsTelnyxSettingsOpen(false)}
      />

      {/* Honey CRM Importer Modal */}
      <CrmHoneyImportModal
        isOpen={isHoneyImportModalOpen}
        onClose={() => setIsHoneyImportModalOpen(false)}
        onImportComplete={(allLeads) => {
          setLeads(allLeads);
        }}
      />

      {/* Quick Action Modal (Call with AI & WebRTC, SMS, Email) */}
      <CrmQuickCommunicationModal
        isOpen={isQuickCommOpen}
        onClose={() => setIsQuickCommOpen(false)}
        lead={quickCommLead}
        initialChannel={quickCommChannel}
        onUpdated={refreshData}
      />
    </div>
  );
}
