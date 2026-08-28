import React from "react";
import {
  CrmLead,
  CrmStageId,
  CRM_PIPELINE_STAGES,
} from "@/lib/crm/crmTypes";
import {
  DollarSign,
  Phone,
  Mail,
  MapPin,
  Home,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  User,
  Sparkles,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { formatAud } from "@/lib/pricing";
import { useTheme } from "@/lib/theme";

interface CrmKanbanBoardProps {
  leads: CrmLead[];
  onOpenLead: (lead: CrmLead) => void;
  onUpdateStage: (leadId: string, newStage: CrmStageId) => void;
  onQuickAction?: (lead: CrmLead, action: "call" | "sms" | "email") => void;
}

export function CrmKanbanBoard({
  leads,
  onOpenLead,
  onUpdateStage,
  onQuickAction,
}: CrmKanbanBoardProps) {
  const { mode } = useTheme();
  const isLight = mode === "normal";

  return (
    <div className="space-y-4">
      {/* Horizontal Scroll Hint Banner */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span className="font-semibold text-amber-500">
          ⚡ 12-Stage Sales Pipeline (Scroll right for later milestones)
        </span>
        <span>Use quick Call / SMS / Email icons or click card for 360° Profile</span>
      </div>

      {/* 12-Column Kanban Columns Container */}
      <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-slate-700 min-h-[640px]">
        {CRM_PIPELINE_STAGES.map((stage) => {
          const stageLeads = leads.filter((l) => l.stage === stage.id);
          const totalVal = stageLeads.reduce((acc, l) => acc + (l.totalEstimatedDealValue || 0), 0);

          return (
            <div
              key={stage.id}
              className={`flex-none w-72 flex flex-col rounded-2xl border ${
                isLight ? "bg-slate-100/80 border-slate-200 shadow-xs" : "bg-slate-900/60 border-slate-800 shadow-xl"
              } backdrop-blur-md overflow-hidden`}
            >
              {/* Column Header */}
              <div className={`p-3.5 border-b ${
                isLight ? "bg-white border-slate-200" : "bg-slate-950/70 border-slate-800"
              }`}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-bold tracking-tight text-white truncate">
                    {stage.shortLabel}
                  </h3>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${stage.badgeBg} ${stage.badgeText}`}>
                    {stageLeads.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                  <span>{formatAud(totalVal)}</span>
                  {stage.isCommissionTrigger && (
                    <span className="text-[9px] font-bold text-amber-400 bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-800/50">
                      50% COMMS
                    </span>
                  )}
                </div>
              </div>

              {/* Column Cards Dropzone */}
              <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto max-h-[580px]">
                {stageLeads.length === 0 ? (
                  <div className="h-28 flex items-center justify-center text-center text-xs text-slate-500 border-2 border-dashed border-slate-800/40 rounded-xl">
                    No deals in {stage.shortLabel}
                  </div>
                ) : (
                  stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => onOpenLead(lead)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
                        isLight
                          ? "bg-white border-slate-200 hover:border-amber-500/70 text-slate-900"
                          : "bg-slate-950/90 border-slate-800 hover:border-amber-500/60 text-slate-100"
                      }`}
                    >
                      {/* Client Name & Budget */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div>
                          <span className="text-xs font-bold tracking-tight hover:text-amber-400 block truncate">
                            {lead.clientName}
                          </span>
                          {lead.secondaryCustomerName && (
                            <span className="text-[10px] text-slate-400 block truncate">
                              &amp; {lead.secondaryCustomerName}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono font-bold text-emerald-400 shrink-0">
                          {formatAud(lead.totalEstimatedDealValue)}
                        </span>
                      </div>

                      {/* Design & Estate */}
                      <div className="space-y-1 text-[11px] text-slate-400 mb-2.5">
                        <div className="flex items-center gap-1 truncate">
                          <Home className="h-3 w-3 text-amber-500 flex-none" />
                          <span className="text-slate-200 font-semibold">{lead.preferredDesign}</span>
                          <span className="text-slate-500">•</span>
                          <span className="truncate">{lead.facadeName}</span>
                        </div>
                        <div className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 text-cyan-400 flex-none" />
                          <span>Lot {lead.lotNumber || "TBA"}, {lead.targetEstate}</span>
                        </div>
                      </div>

                      {/* Card Footer: Quick Action Buttons (Call, SMS, Email, 360 Profile) */}
                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            title="Quick Call Client"
                            onClick={(e) => {
                              e.stopPropagation();
                              onQuickAction ? onQuickAction(lead, "call") : onOpenLead(lead);
                            }}
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
                          >
                            <Phone className="h-3 w-3" />
                          </button>

                          <button
                            type="button"
                            title="Send Instant SMS"
                            onClick={(e) => {
                              e.stopPropagation();
                              onQuickAction ? onQuickAction(lead, "sms") : onOpenLead(lead);
                            }}
                            className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-colors"
                          >
                            <MessageSquare className="h-3 w-3" />
                          </button>

                          <button
                            type="button"
                            title="Send Outlook Email"
                            onClick={(e) => {
                              e.stopPropagation();
                              onQuickAction ? onQuickAction(lead, "email") : onOpenLead(lead);
                            }}
                            className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 transition-colors"
                          >
                            <Mail className="h-3 w-3" />
                          </button>
                        </div>

                        <div className="flex items-center gap-1 text-amber-400 font-bold hover:underline">
                          <span>Profile →</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
