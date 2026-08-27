import React from "react";
import {
  CrmLead,
  CRM_PIPELINE_STAGES,
  CrmStageId,
} from "@/lib/crm/crmTypes";
import {
  MapPin,
  Home,
  Phone,
  Layers,
  Send,
  FileCheck,
  DollarSign,
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculateDealCommission } from "@/lib/commission/commissionCalculator";

interface CrmKanbanBoardProps {
  leads: CrmLead[];
  onUpdateStage: (leadId: string, newStage: CrmStageId) => void;
  onOpenLead: (lead: CrmLead) => void;
}

export function CrmKanbanBoard({
  leads,
  onUpdateStage,
  onOpenLead,
}: CrmKanbanBoardProps) {
  const formatAud = (val: number) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(val);

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 pt-2 scrollbar-thin">
      {CRM_PIPELINE_STAGES.filter((s) => s.id !== "lost").map((stage) => {
        const stageLeads = leads.filter((l) => l.stage === stage.id);
        const stageTotalValue = stageLeads.reduce(
          (acc, l) => acc + (l.totalEstimatedDealValue || 0),
          0
        );

        return (
          <div
            key={stage.id}
            className="flex-none w-80 bg-slate-900/70 border border-slate-800/90 rounded-2xl flex flex-col max-h-[calc(100vh-14rem)] shadow-xl"
          >
            {/* Stage Column Header */}
            <div className="p-3.5 border-b border-slate-800/80 bg-slate-950/80 rounded-t-2xl">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-white truncate">
                  {stage.shortLabel}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${stage.badgeBg} ${stage.badgeText}`}>
                  {stageLeads.length}
                </span>
              </div>
              <div className="text-[11px] font-mono text-amber-400/90 font-semibold mt-1">
                {formatAud(stageTotalValue)}
              </div>
            </div>

            {/* Leads List */}
            <div className="p-3 space-y-3 overflow-y-auto flex-1 scrollbar-thin">
              {stageLeads.length === 0 ? (
                <div className="py-8 text-center text-[11px] text-slate-500 italic">
                  No deals in this stage
                </div>
              ) : (
                stageLeads.map((lead) => {
                  const comms = calculateDealCommission(lead);

                  return (
                    <div
                      key={lead.id}
                      onClick={() => onOpenLead(lead)}
                      className="group p-3.5 rounded-xl border border-slate-800 bg-slate-950/90 hover:border-amber-500/60 hover:shadow-lg hover:shadow-amber-500/5 transition-all cursor-pointer space-y-2.5"
                    >
                      {/* Client Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-black text-white group-hover:text-amber-300 transition-colors">
                            {lead.clientName}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {lead.mobile}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          {formatAud(lead.totalEstimatedDealValue)}
                        </span>
                      </div>

                      {/* Design & Location Spec */}
                      <div className="text-[11px] text-slate-300 space-y-1 bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                        <div className="flex items-center gap-1.5 text-amber-300 font-medium">
                          <Home className="h-3 w-3 flex-none text-amber-400" />
                          <span className="truncate">
                            {lead.preferredDesign} &bull; {lead.facadeName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
                          <MapPin className="h-3 w-3 flex-none text-cyan-400" />
                          <span className="truncate">
                            Lot {lead.lotNumber || "TBA"}, {lead.targetEstate} ({lead.suburb})
                          </span>
                        </div>
                      </div>

                      {/* Linked Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {lead.linkedQuoteNumber && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 text-[9px] font-mono font-bold">
                            <Layers className="h-2.5 w-2.5" />
                            {lead.linkedQuoteNumber}
                          </span>
                        )}
                        {lead.linkedTenderSubmissionNumber && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60 text-[9px] font-mono font-bold">
                            <Send className="h-2.5 w-2.5" />
                            {lead.linkedTenderSubmissionNumber}
                          </span>
                        )}
                        {comms.realizedCommission > 0 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono font-bold">
                            💰 {formatAud(comms.realizedCommission)} Comms
                          </span>
                        )}
                      </div>

                      {/* Quick Stage Move Dropdown */}
                      <div
                        className="pt-2 border-t border-slate-800/80 flex items-center justify-between"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[10px] text-slate-400">Move:</span>
                        <Select
                          value={lead.stage}
                          onValueChange={(val) => onUpdateStage(lead.id, val as CrmStageId)}
                        >
                          <SelectTrigger className="h-6 text-[10px] py-0 px-2 border-slate-800 bg-slate-900 text-slate-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-slate-800 bg-slate-950 text-slate-100">
                            {CRM_PIPELINE_STAGES.map((s) => (
                              <SelectItem key={s.id} value={s.id} className="text-xs">
                                {s.shortLabel}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
