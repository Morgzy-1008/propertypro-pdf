import React, { useState, useEffect } from "react";
import {
  CrmLead,
  CrmStageId,
  CRM_PIPELINE_STAGES,
  HUDSON_CONSULTANTS,
} from "@/lib/crm/crmTypes";
import {
  loadAllCrmLeads,
  saveCrmLead,
  updateCrmLeadStage,
} from "@/lib/crm/crmStorage";
import { CrmKanbanBoard } from "./CrmKanbanBoard";
import { CrmCommissionDashboard } from "./CrmCommissionDashboard";
import { CrmLeadDetailsModal } from "./CrmLeadDetailsModal";
import { SitingPlanCanvas } from "@/components/siting/SitingPlanCanvas";
import {
  Users,
  Award,
  Plus,
  Compass,
  Monitor,
  Search,
  Filter,
  Layers,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export function CrmWorkspace() {
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [activeTab, setActiveTab] = useState<"kanban" | "commissions" | "siting">("kanban");
  const [selectedConsultantId, setSelectedConsultantId] = useState<string>("morgan_hales");
  const [activeLead, setActiveLead] = useState<CrmLead | null>(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadAllCrmLeads().then((data) => {
      setLeads(data);
    });
  }, []);

  const handleUpdateStage = async (leadId: string, newStage: CrmStageId) => {
    const updated = await updateCrmLeadStage(leadId, newStage);
    setLeads(updated);
    toast.success("Lead moved to new pipeline stage!");
  };

  const handleOpenLead = (lead: CrmLead) => {
    setActiveLead(lead);
    setIsLeadModalOpen(true);
  };

  const handleSaveLead = async (updatedLead: CrmLead) => {
    const list = await saveCrmLead(updatedLead);
    setLeads(list);
  };

  const handleCreateNewLead = async () => {
    const newLead: CrmLead = {
      id: `lead_${Date.now()}`,
      clientName: "New Prospect",
      email: "client@example.com",
      mobile: "0400 000 000",
      targetEstate: "Providence Estate",
      suburb: "South Ripley",
      lotNumber: "TBA",
      landStatus: "Looking for Land",
      landBudget: 320000,
      preferredDesign: "Amber 21",
      facadeName: "Hampton Executive",
      housingType: "Single Storey",
      totalEstimatedDealValue: 465000,
      stage: "new_lead",
      assignedConsultantId: selectedConsultantId,
      leadSource: "Website Inquiry",
      notes: "Newly created prospect in Hudson Horizon CRM.",
      isAtpSigned: false,
      atpFeePaid: false,
      isContractSigned: false,
      contractDepositPaid: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastContactedAt: new Date().toISOString(),
    };

    const updated = await saveCrmLead(newLead);
    setLeads(updated);
    setActiveLead(newLead);
    setIsLeadModalOpen(true);
    toast.success("New lead created in CRM!");
  };

  const filteredLeads = leads.filter((l) => {
    const matchesConsultant =
      selectedConsultantId === "all" || l.assignedConsultantId === selectedConsultantId;
    const matchesSearch =
      l.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.mobile.includes(searchTerm) ||
      l.targetEstate.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesConsultant && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs px-2.5 py-1 rounded-md tracking-wider uppercase">
              Builder CRM
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Hudson Horizon CRM &amp; Pipeline
            </h1>
            <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-800/60">
              {leads.length} Total Deals
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Purpose-built Australian residential home builder CRM replacing Honey with native Quoting, Floorplans, Tenders, and Commission tracking.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/kiosk" target="_blank">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white text-xs gap-1.5"
            >
              <Monitor className="h-3.5 w-3.5 text-cyan-400" />
              Launch iPad Kiosk
            </Button>
          </Link>

          <Button
            size="sm"
            onClick={handleCreateNewLead}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs gap-1.5 shadow-md shadow-amber-500/20"
          >
            <Plus className="h-3.5 w-3.5" />
            Add New Client
          </Button>
        </div>
      </div>

      {/* Tabs & Search Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin">
          <button
            type="button"
            onClick={() => setActiveTab("kanban")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "kanban"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-900/60 border border-transparent"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Sales Pipeline Kanban ({filteredLeads.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("commissions")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "commissions"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-900/60 border border-transparent"
            }`}
          >
            <Award className="h-3.5 w-3.5 text-amber-400" />
            Commission &amp; Salary Forecaster
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("siting")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "siting"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-slate-900/60 border border-transparent"
            }`}
          >
            <Compass className="h-3.5 w-3.5 text-emerald-400" />
            1:200 Lot Siting &amp; POD Studio
          </button>
        </div>

        {/* Search Box */}
        <div className="relative min-w-[240px]">
          <Search className="h-3.5 w-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search client, phone, estate…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-xs border-slate-800 bg-slate-900/90 text-slate-200"
          />
        </div>
      </div>

      {/* Main Tab Views */}
      {activeTab === "kanban" && (
        <CrmKanbanBoard
          leads={filteredLeads}
          onUpdateStage={handleUpdateStage}
          onOpenLead={handleOpenLead}
        />
      )}

      {activeTab === "commissions" && (
        <CrmCommissionDashboard
          leads={leads}
          selectedConsultantId={selectedConsultantId}
          onSelectConsultant={setSelectedConsultantId}
        />
      )}

      {activeTab === "siting" && <SitingPlanCanvas standalone={false} />}

      {/* Lead Details 360 Modal */}
      <CrmLeadDetailsModal
        lead={activeLead}
        open={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        onSaveLead={handleSaveLead}
      />
    </div>
  );
}
