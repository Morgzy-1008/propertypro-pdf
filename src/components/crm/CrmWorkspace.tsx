import React, { useState, useEffect, useMemo } from "react";
import {
  CrmLead,
  CrmStageId,
  CRM_PIPELINE_STAGES,
  HUDSON_CONSULTANTS,
  CrmMessage,
} from "@/lib/crm/crmTypes";
import {
  loadAllCrmLeads,
  saveCrmLead,
  updateCrmLeadStage,
  loadAllCrmMessages,
  saveCrmMessage,
  getOutlookSyncStatus,
  triggerOutlookSync,
} from "@/lib/crm/crmStorage";
import { CrmKanbanBoard } from "./CrmKanbanBoard";
import { CrmCommissionDashboard } from "./CrmCommissionDashboard";
import { CrmClientDetailPage } from "./CrmClientDetailPage";
import { CrmConversationsView } from "./CrmConversationsView";
import { CrmTasksView } from "./CrmTasksView";
import { CrmNewClientModal } from "./CrmNewClientModal";
import { CrmHoneyImportModal } from "./CrmHoneyImportModal";
import { CrmQuickCommunicationModal } from "./CrmQuickCommunicationModal";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { formatAud } from "@/lib/pricing";
import { useTheme } from "@/lib/theme";

export function CrmWorkspace() {
  const { mode } = useTheme();
  const isLight = mode === "normal";

  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [messages, setMessages] = useState<CrmMessage[]>([]);
  const [activeTab, setActiveTab] = useState<"kanban" | "tasks" | "conversations" | "commissions">("kanban");
  const [selectedConsultantId, setSelectedConsultantId] = useState<string>("morgan_hales");
  const [userRole, setUserRole] = useState<"nhc" | "viewer">("nhc");

  // Modals state
  const [activeLead, setActiveLead] = useState<CrmLead | null>(null);
  const [isClientDetailOpen, setIsClientDetailOpen] = useState(false);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isHoneyImportModalOpen, setIsHoneyImportModalOpen] = useState(false);

  // Quick Communication Modal state
  const [quickCommLead, setQuickCommLead] = useState<CrmLead | null>(null);
  const [quickCommChannel, setQuickCommChannel] = useState<"call" | "sms" | "email">("call");
  const [isQuickCommOpen, setIsQuickCommOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [outlookSyncState, setOutlookSyncState] = useState(getOutlookSyncStatus());

  const refreshData = async () => {
    const loadedLeads = await loadAllCrmLeads();
    const loadedMessages = await loadAllCrmMessages();
    setLeads(loadedLeads);
    setMessages(loadedMessages);
  };

  useEffect(() => {
    refreshData();
  }, []);

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

  const handleSendMessage = async (msg: CrmMessage) => {
    const list = await saveCrmMessage(msg);
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

  // Count active pending tasks
  const openTasksCount = useMemo(() => {
    return leads.reduce((acc, lead) => {
      if (
        selectedConsultantId !== "all" &&
        lead.assignedConsultantId !== selectedConsultantId
      ) {
        return acc;
      }
      return acc + (lead.tasks ? lead.tasks.filter((t) => !t.completed).length : 0);
    }, 0);
  }, [leads, selectedConsultantId]);

  const filteredLeads = leads.filter((l) => {
    const matchesConsultant =
      selectedConsultantId === "all" || l.assignedConsultantId === selectedConsultantId;
    const matchesSearch =
      l.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.mobile.includes(searchTerm) ||
      l.targetEstate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.preferredDesign.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesConsultant && matchesSearch;
  });

  const totalPipelineVal = leads.reduce((acc, l) => acc + (l.totalEstimatedDealValue || 0), 0);
  const totalUnderConstruction = leads.filter(l => l.stage === "under_construction" || l.stage === "contract_signed").length;

  return (
    <div className={`min-h-screen ${isLight ? "bg-slate-50 text-slate-900" : "bg-slate-950 text-slate-100"} p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans`}>
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs px-2.5 py-1 rounded-md tracking-wider uppercase">
              Hudson Horizon CRM
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Sales Pipeline &amp; Client Hub
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Complete residential builder CRM with 12 pipeline milestones, tasks reminder engine, omnichannel conversations, and Outlook integration.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHoneyImportModalOpen(true)}
            className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white text-xs gap-1.5 font-semibold"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-amber-400" />
            Import from Honey
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleTriggerSync}
            className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white text-xs gap-1.5 font-semibold"
          >
            <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
            Sync Outlook
          </Button>

          <Link to="/kiosk" target="_blank">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white text-xs gap-1.5"
            >
              <Monitor className="h-3.5 w-3.5 text-cyan-400" />
              iPad Kiosk
            </Button>
          </Link>

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

      {/* KPI Performance Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`p-3.5 rounded-xl border ${isLight ? "bg-white border-slate-200" : "bg-slate-900/60 border-slate-800"}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Active Pipeline</span>
          <span className="text-lg font-black text-amber-400">{formatAud(totalPipelineVal)}</span>
        </div>
        <div className={`p-3.5 rounded-xl border ${isLight ? "bg-white border-slate-200" : "bg-slate-900/60 border-slate-800"}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Active Deals in Pipeline</span>
          <span className="text-lg font-black text-cyan-400">{leads.length} Clients</span>
        </div>
        <div className={`p-3.5 rounded-xl border ${isLight ? "bg-white border-slate-200" : "bg-slate-900/60 border-slate-800"}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Open Follow-up Tasks</span>
          <span className="text-lg font-black text-emerald-400">{openTasksCount} Tasks</span>
        </div>
        <div className={`p-3.5 rounded-xl border ${isLight ? "bg-white border-slate-200" : "bg-slate-900/60 border-slate-800"}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Outlook 365 Sync</span>
          <span className="text-lg font-black text-purple-400">{outlookSyncState.count} Emails Captured</span>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin">
          <button
            type="button"
            onClick={() => setActiveTab("kanban")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "kanban"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900/80"
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" />
            Sales Pipeline (12 Buckets)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("tasks")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "tasks"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900/80"
            }`}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Tasks &amp; Reminders
            {openTasksCount > 0 && (
              <span className="bg-amber-950/80 text-amber-300 text-[10px] px-1.5 py-0.2 rounded-full font-mono border border-amber-800/80 font-bold">
                {openTasksCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("conversations")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "conversations"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-slate-900/80"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Conversations &amp; Outlook
            <span className="bg-amber-950/60 text-amber-300 text-[9px] px-1.5 rounded-full font-mono">
              {messages.length}
            </span>
          </button>

          {userRole === "nhc" && (
            <button
              type="button"
              onClick={() => setActiveTab("commissions")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "commissions"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-900/80"
              }`}
            >
              <Award className="h-3.5 w-3.5" />
              Commissions &amp; Salary
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
              className="h-8 pl-8 text-xs bg-slate-900 border-slate-700 w-48 sm:w-60"
            />
          </div>

          <select
            value={selectedConsultantId}
            onChange={(e) => setSelectedConsultantId(e.target.value)}
            className="h-8 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-200 px-2.5 font-medium"
          >
            <option value="all">All Consultants</option>
            {HUDSON_CONSULTANTS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.displayOffice})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === "kanban" && (
        <CrmKanbanBoard
          leads={filteredLeads}
          onOpenLead={handleOpenLead}
          onUpdateStage={handleUpdateStage}
          onQuickAction={handleQuickAction}
        />
      )}

      {activeTab === "tasks" && (
        <CrmTasksView
          leads={leads}
          selectedConsultantId={selectedConsultantId}
          onOpenLead={handleOpenLead}
          onTasksUpdated={refreshData}
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

      {activeTab === "commissions" && userRole === "nhc" && (
        <CrmCommissionDashboard
          leads={leads}
          selectedConsultantId={selectedConsultantId}
          onSelectConsultant={setSelectedConsultantId}
          userRole={userRole}
        />
      )}

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
        defaultConsultantId={selectedConsultantId !== "all" ? selectedConsultantId : "morgan_hales"}
        onCreated={(newLead) => {
          refreshData();
          setActiveLead(newLead);
          setIsClientDetailOpen(true);
        }}
      />

      {/* Honey CRM Importer Modal */}
      <CrmHoneyImportModal
        isOpen={isHoneyImportModalOpen}
        onClose={() => setIsHoneyImportModalOpen(false)}
        onImportComplete={(allLeads) => {
          setLeads(allLeads);
        }}
      />

      {/* Quick Action Modal (Call, SMS, Email) */}
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
