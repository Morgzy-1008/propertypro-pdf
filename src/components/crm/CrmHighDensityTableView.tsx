import React, { useState, useMemo } from "react";
import {
  CrmLead,
  CrmStageId,
  CRM_PIPELINE_STAGES,
  HUDSON_CONSULTANTS,
} from "@/lib/crm/crmTypes";
import { calculateLeadHeatScore } from "@/lib/crm/crmAiEngine";
import {
  Flame,
  Phone,
  PhoneForwarded,
  MessageSquare,
  Calculator,
  PenTool,
  Pin,
  ArrowUpDown,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatAud } from "@/lib/pricing";
import { Link } from "@tanstack/react-router";
import { useTheme } from "@/lib/theme";

interface CrmHighDensityTableViewProps {
  leads: CrmLead[];
  onOpenLead: (lead: CrmLead) => void;
  onUpdateStage: (leadId: string, newStage: CrmStageId) => void;
  onQuickAction: (lead: CrmLead, action: "call" | "sms" | "email") => void;
  onLogLvmQuick: (lead: CrmLead) => void;
}

export function CrmHighDensityTableView({
  leads,
  onOpenLead,
  onUpdateStage,
  onQuickAction,
  onLogLvmQuick,
}: CrmHighDensityTableViewProps) {
  const { mode } = useTheme();
  const isLight = mode === "normal";

  const [estateFilter, setEstateFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [landFilter, setLandFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<
    "heat_desc" | "date_newest" | "last_contact_oldest" | "value_desc" | "estate_asc"
  >("heat_desc");

  const uniqueEstates = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.targetEstate) set.add(l.targetEstate);
    });
    return Array.from(set).sort();
  }, [leads]);

  const rows = useMemo(() => {
    return leads
      .map((lead) => ({
        lead,
        heat: calculateLeadHeatScore(lead),
      }))
      .filter(({ lead }) => {
        if (estateFilter !== "all" && lead.targetEstate !== estateFilter) return false;
        if (stageFilter !== "all" && lead.stage !== stageFilter) return false;
        if (landFilter !== "all" && lead.landStatus !== landFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "heat_desc") return b.heat.score - a.heat.score;
        if (sortBy === "date_newest") {
          return (
            new Date(b.lead.createdAt || 0).getTime() -
            new Date(a.lead.createdAt || 0).getTime()
          );
        }
        if (sortBy === "last_contact_oldest") {
          return b.heat.daysSinceLastContact - a.heat.daysSinceLastContact;
        }
        if (sortBy === "value_desc") {
          return (
            (b.lead.totalEstimatedDealValue || 0) -
            (a.lead.totalEstimatedDealValue || 0)
          );
        }
        return (a.lead.targetEstate || "").localeCompare(b.lead.targetEstate || "");
      });
  }, [leads, estateFilter, stageFilter, landFilter, sortBy]);

  return (
    <div
      data-testid="crm-high-density-table-view"
      className={`rounded-2xl border overflow-hidden ${
        isLight ? "bg-white border-slate-200 shadow-xs" : "bg-slate-900/70 border-slate-800"
      }`}
    >
      {/* Top Filter & Sort Bar */}
      <div
        className={`p-3.5 border-b flex flex-wrap items-center justify-between gap-2.5 text-xs ${
          isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-black text-[11px] uppercase tracking-wider text-slate-500">
            Filter Table:
          </span>

          <select
            value={estateFilter}
            onChange={(e) => setEstateFilter(e.target.value)}
            className={`h-8 rounded-lg border px-2.5 text-xs font-semibold ${
              isLight
                ? "bg-white border-slate-300 text-slate-800"
                : "bg-slate-900 border-slate-700 text-slate-200"
            }`}
          >
            <option value="all">All Estates ({uniqueEstates.length})</option>
            {uniqueEstates.map((est) => (
              <option key={est} value={est}>
                📍 {est}
              </option>
            ))}
          </select>

          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className={`h-8 rounded-lg border px-2.5 text-xs font-semibold ${
              isLight
                ? "bg-white border-slate-300 text-slate-800"
                : "bg-slate-900 border-slate-700 text-slate-200"
            }`}
          >
            <option value="all">All Pipeline Stages</option>
            {CRM_PIPELINE_STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          <select
            value={landFilter}
            onChange={(e) => setLandFilter(e.target.value)}
            className={`h-8 rounded-lg border px-2.5 text-xs font-semibold ${
              isLight
                ? "bg-white border-slate-300 text-slate-800"
                : "bg-slate-900 border-slate-700 text-slate-200"
            }`}
          >
            <option value="all">All Land Statuses</option>
            <option value="Have Land (Registered)">Have Land (Registered)</option>
            <option value="Land Under Contract (Unregistered)">
              Land Under Contract (Unregistered)
            </option>
            <option value="Looking for Land">Looking for Land</option>
            <option value="Knockdown Rebuild (KDRB)">Knockdown Rebuild (KDRB)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-bold text-[11px] text-slate-500 flex items-center gap-1">
            <ArrowUpDown className="h-3 w-3" />
            Sort By:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className={`h-8 rounded-lg border px-2.5 text-xs font-bold ${
              isLight
                ? "bg-white border-slate-300 text-slate-900"
                : "bg-slate-900 border-slate-700 text-amber-400"
            }`}
          >
            <option value="heat_desc">🔥 Highest AI Heat Score</option>
            <option value="date_newest">📅 Enquired Date (Newest First)</option>
            <option value="last_contact_oldest">⚠️ Longest Since Last Contact (Stale First)</option>
            <option value="value_desc">💰 Highest Deal Value</option>
            <option value="estate_asc">📍 Estate Name (A → Z)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr
              className={`border-b text-[10px] font-black uppercase tracking-wider ${
                isLight
                  ? "bg-slate-100/80 border-slate-200 text-slate-600"
                  : "bg-slate-950/90 border-slate-800 text-slate-400"
              }`}
            >
              <th className="p-3">Heat</th>
              <th className="p-3">Client &amp; Contact</th>
              <th className="p-3">Estate, Lot &amp; Land</th>
              <th className="p-3">Design &amp; Value</th>
              <th className="p-3">Stage</th>
              <th className="p-3">LVM / Next Step</th>
              <th className="p-3 text-right">1-Click Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/80">
            {rows.map(({ lead, heat }) => {
              const openTaskCount = (lead.tasks || []).filter((t) => !t.completed).length;
              return (
                <tr
                  key={lead.id}
                  className={`transition-colors ${
                    isLight ? "hover:bg-amber-50/40" : "hover:bg-slate-900/90"
                  }`}
                >
                  <td className="p-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black ${
                        heat.score >= 85
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                          : heat.score >= 70
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                          : "bg-slate-500/15 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      <Flame className="h-3 w-3" />
                      {heat.score}
                    </span>
                  </td>

                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => onOpenLead(lead)}
                      className="font-black text-xs hover:underline text-left flex items-center gap-1.5"
                    >
                      {lead.clientName}
                      {lead.ghlContactId && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold">
                          Honey
                        </span>
                      )}
                    </button>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {lead.mobile} • {lead.email}
                    </div>
                  </td>

                  <td className="p-3">
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {lead.targetEstate} (Lot {lead.lotNumber || "TBA"})
                    </div>
                    <div className="text-[10px] text-slate-500">{lead.landStatus}</div>
                  </td>

                  <td className="p-3">
                    <div className="font-bold">{lead.preferredDesign}</div>
                    <div className="font-black text-emerald-600 dark:text-emerald-400">
                      {formatAud(lead.totalEstimatedDealValue || 0)}
                    </div>
                  </td>

                  <td className="p-3">
                    <select
                      value={lead.stage}
                      onChange={(e) =>
                        onUpdateStage(lead.id, e.target.value as CrmStageId)
                      }
                      className={`h-7 rounded-lg border px-2 text-[11px] font-bold ${
                        isLight
                          ? "bg-white border-slate-300 text-slate-800"
                          : "bg-slate-950 border-slate-700 text-slate-200"
                      }`}
                    >
                      {CRM_PIPELINE_STAGES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.shortLabel}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="p-3 max-w-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(lead.lvmCount || 0) > 0 && (
                        <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                          LVM #{lead.lvmCount}
                        </span>
                      )}
                      {openTaskCount > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
                          {openTaskCount} Task{openTaskCount === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                      {heat.nextRecommendedAction}
                    </div>
                  </td>

                  <td className="p-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onQuickAction(lead, "call")}
                        className="h-7 px-2 text-[10px] font-bold gap-1"
                      >
                        <Phone className="h-3 w-3 text-emerald-500" />
                        Call
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onLogLvmQuick(lead)}
                        className="h-7 px-2 text-[10px] font-bold gap-1"
                      >
                        LVM #{(lead.lvmCount || 0) + 1}
                      </Button>
                      <Link
                        to="/quote-builder"
                        onClick={() => {
                          localStorage.setItem(
                            "hudson_crm_prefill_lead",
                            JSON.stringify(lead)
                          );
                        }}
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[10px] font-bold gap-1"
                        >
                          <Calculator className="h-3 w-3 text-amber-500" />
                          Quote
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
