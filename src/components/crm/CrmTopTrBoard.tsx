import React, { useState } from "react";
import {
  CrmLead,
  CrmStageId,
  CRM_PIPELINE_STAGES,
} from "@/lib/crm/crmTypes";
import {
  toggleLeadTopTr,
  pushLeadToTenderRequested,
} from "@/lib/crm/crmStorage";
import {
  Flame,
  Zap,
  Clock,
  Sparkles,
  ArrowUpRight,
  Phone,
  MessageSquare,
  User,
  Plus,
  Target,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Calendar,
  Layers,
  Home,
  MapPin,
  TrendingUp,
  DollarSign,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatAud } from "@/lib/pricing";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme";

interface CrmTopTrBoardProps {
  leads: CrmLead[];
  onOpenLead: (lead: CrmLead) => void;
  onQuickAction: (lead: CrmLead, action: "call" | "sms" | "email") => void;
  onDataChanged: () => void;
}

export function CrmTopTrBoard({
  leads,
  onOpenLead,
  onQuickAction,
  onDataChanged,
}: CrmTopTrBoardProps) {
  const { mode } = useTheme();
  const isLight = mode === "normal";

  const [filterConfidence, setFilterConfidence] = useState<"all" | "hot" | "warm" | "nurturing">("all");
  const [focusMode, setFocusMode] = useState<"top5" | "top10" | "all">("top10");
  const [isAddTrModalOpen, setIsAddTrModalOpen] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");
  const [candidateRank, setCandidateRank] = useState<number>(1);
  const [candidateConfidence, setCandidateConfidence] = useState<"hot" | "warm" | "nurturing">("hot");
  const [candidateTargetDate, setCandidateTargetDate] = useState<string>("This Friday");
  const [candidateObstacle, setCandidateObstacle] = useState<string>("");

  // Filter top TR targets, sorted by priority rank (1..10)
  const topTrLeads = leads
    .filter((l) => l.isTopTrTarget)
    .sort((a, b) => (a.trPriorityRank || 99) - (b.trPriorityRank || 99));

  const filteredTopTr = topTrLeads.filter((l) => {
    if (filterConfidence !== "all" && l.trConfidenceScore !== filterConfidence) return false;
    const rank = l.trPriorityRank || 99;
    if (focusMode === "top5") return rank <= 5;
    if (focusMode === "top10") return rank <= 10;
    return true;
  });

  const handleShiftRank = async (lead: CrmLead, direction: "up" | "down") => {
    const currentRank = lead.trPriorityRank || 1;
    const newRank = direction === "up" ? Math.max(1, currentRank - 1) : Math.min(10, currentRank + 1);
    if (newRank === currentRank) return;

    await toggleLeadTopTr(lead.id, true, {
      trPriorityRank: newRank,
      trConfidenceScore: lead.trConfidenceScore,
      trTargetDate: lead.trTargetDate,
      trKeyObstacle: lead.trKeyObstacle,
    });
    onDataChanged();
    toast.success(`Updated ${lead.clientName} priority to #${newRank}`);
  };

  const totalTrVolume = topTrLeads.reduce((acc, l) => acc + (l.totalEstimatedDealValue || 0), 0);
  const hotCount = topTrLeads.filter((l) => l.trConfidenceScore === "hot").length;
  const warmCount = topTrLeads.filter((l) => l.trConfidenceScore === "warm").length;

  const handlePushToTr = async (lead: CrmLead) => {
    await pushLeadToTenderRequested(lead.id);
    onDataChanged();
    toast.success(`🎉 ${lead.clientName} officially pushed to Tender Requested! ATP marked as received.`);
  };

  const handleRemoveFromTr = async (leadId: string) => {
    await toggleLeadTopTr(leadId, false);
    onDataChanged();
    toast.info("Client removed from Top TR Radar.");
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidateId) {
      toast.error("Please select a client from the pipeline.");
      return;
    }

    await toggleLeadTopTr(selectedCandidateId, true, {
      trPriorityRank: Number(candidateRank),
      trConfidenceScore: candidateConfidence,
      trTargetDate: candidateTargetDate.trim() || "This Month",
      trKeyObstacle: candidateObstacle.trim() || "Awaiting final consultant review",
    });

    onDataChanged();
    setIsAddTrModalOpen(false);
    setSelectedCandidateId("");
    setCandidateObstacle("");
    toast.success("Client added to Top TR Radar!");
  };

  const nonTrCandidates = leads.filter((l) => !l.isTopTrTarget);

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Strip */}
      <div className={`p-4 sm:p-5 rounded-2xl border ${
        isLight ? "bg-white border-amber-200/80 shadow-xs" : "bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/30 border-amber-500/30"
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-amber-500 text-slate-950">
                <Flame className="h-4 w-4" />
              </span>
              <h2 className={`text-lg sm:text-xl font-black ${isLight ? "text-slate-900" : "text-white"} tracking-tight`}>
                Top 10 Most Likely to TR (Tender Request)
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">
                High Priority Radar
              </span>
            </div>
            <p className={`text-xs ${isLight ? "text-slate-600" : "text-slate-400"} mt-1 max-w-3xl`}>
              The critical deals closest to paying their ATP (Authority to Proceed) deposit and submitting for formal Tender. Focus your weekly call &amp; task energy on resolving obstacles here.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsAddTrModalOpen(true)}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs gap-1.5 shadow-md shadow-amber-500/20"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Client to Top 10
            </Button>
          </div>
        </div>

        {/* KPI Mini-Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/80">
          <div>
            <span className={`text-[10px] font-bold uppercase tracking-wider block ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              Target TR Volume
            </span>
            <span className={`text-base sm:text-lg font-black ${isLight ? "text-amber-700" : "text-amber-400"}`}>
              {formatAud(totalTrVolume)}
            </span>
          </div>
          <div>
            <span className={`text-[10px] font-bold uppercase tracking-wider block ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              Active TR Targets
            </span>
            <span className={`text-base sm:text-lg font-black ${isLight ? "text-slate-900" : "text-white"}`}>
              {topTrLeads.length} Clients
            </span>
          </div>
          <div>
            <span className={`text-[10px] font-bold uppercase tracking-wider block ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              🔥 Hot Closures (&gt;85%)
            </span>
            <span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
              {hotCount} Clients
            </span>
          </div>
          <div>
            <span className={`text-[10px] font-bold uppercase tracking-wider block ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              ⚡ Warm In Progress
            </span>
            <span className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400">
              {warmCount} Clients
            </span>
          </div>
        </div>
      </div>

      {/* Filter Chips & Top 5 vs Top 10 Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Top 5 vs Top 10 Toggle */}
          <div className={`flex items-center gap-1 p-0.5 rounded-xl border ${
            isLight ? "bg-slate-100 border-slate-300" : "bg-slate-900 border-slate-700"
          }`}>
            <button
              type="button"
              onClick={() => setFocusMode("top5")}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                focusMode === "top5"
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🔥 Top 5 Focus
            </button>
            <button
              type="button"
              onClick={() => setFocusMode("top10")}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                focusMode === "top10"
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ⚡ Top 10 Focus
            </button>
            <button
              type="button"
              onClick={() => setFocusMode("all")}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all ${
                focusMode === "all"
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : isLight
                  ? "text-slate-600 hover:text-slate-900"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              All Targets
            </button>
          </div>

          <div className="flex items-center gap-1">
            <span className={`font-semibold mr-1 ${isLight ? "text-slate-600" : "text-slate-400"}`}>Confidence:</span>
            {(["all", "hot", "warm", "nurturing"] as const).map((conf) => (
              <button
                key={conf}
                type="button"
                onClick={() => setFilterConfidence(conf)}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs capitalize transition-all ${
                  filterConfidence === conf
                    ? "bg-amber-500 text-slate-950 shadow-xs"
                    : isLight
                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                {conf === "all" ? "All" : conf === "hot" ? "🔥 Hot" : conf === "warm" ? "⚡ Warm" : "⏳ Nurturing"}
              </button>
            ))}
          </div>
        </div>

        <span className={`text-[11px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
          Ranked 1 to 10 by closing urgency • 1-click Push to TR converts lead to official Tender Requested
        </span>
      </div>

      {/* Top TR Ranked Cards Grid */}
      {filteredTopTr.length === 0 ? (
        <div className={`p-10 rounded-2xl border text-center ${
          isLight ? "bg-white border-slate-200" : "bg-slate-900/40 border-slate-800"
        }`}>
          <Flame className="h-10 w-10 text-amber-500/40 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-200">No leads currently in this TR filter</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Click &ldquo;Add Client to Top 10&rdquo; above to nominate your high-probability leads for this week.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredTopTr.map((lead, idx) => {
            const rank = lead.trPriorityRank || idx + 1;
            const isRank1 = rank === 1;
            const isRank2 = rank === 2;
            const isRank3 = rank === 3;

            const rankBadgeColor = isRank1
              ? "bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black shadow-md shadow-amber-500/30"
              : isRank2
              ? "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950 font-black"
              : isRank3
              ? "bg-gradient-to-br from-amber-700 to-orange-800 text-white font-black"
              : "bg-slate-800 text-cyan-300 font-bold border border-slate-700";

            return (
              <div
                key={lead.id}
                className={`relative rounded-2xl border p-4.5 transition-all duration-200 hover:shadow-xl ${
                  isLight
                    ? "bg-white border-slate-200 hover:border-amber-400"
                    : isRank1
                    ? "bg-gradient-to-b from-slate-900 via-slate-900/90 to-amber-950/20 border-amber-500/50 hover:border-amber-400"
                    : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
                }`}
              >
                {/* Top Row: Rank Badge & Target Date */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <span className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${rankBadgeColor}`}>
                        #{rank}
                      </span>
                      <div className="flex flex-col -space-y-1">
                        <button
                          type="button"
                          title="Move up priority rank"
                          disabled={rank <= 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShiftRank(lead, "up");
                          }}
                          className="text-slate-400 hover:text-amber-400 disabled:opacity-30 p-0.5"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          title="Move down priority rank"
                          disabled={rank >= 10}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShiftRank(lead, "down");
                          }}
                          className="text-slate-400 hover:text-amber-400 disabled:opacity-30 p-0.5"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <span className={`text-sm font-bold tracking-tight block cursor-pointer hover:text-amber-500 ${isLight ? "text-slate-900" : "text-white"}`} onClick={() => onOpenLead(lead)}>
                        {lead.clientName}
                      </span>
                      {lead.secondaryCustomerName && (
                        <span className={`text-[10px] block ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                          &amp; {lead.secondaryCustomerName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono font-black text-amber-600 dark:text-amber-400 block">
                      {formatAud(lead.totalEstimatedDealValue)}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      ATP Deposit: $2,500
                    </span>
                  </div>
                </div>

                {/* Build Details */}
                <div className={`space-y-1 text-xs mb-3.5 p-2 rounded-xl border ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800/80"
                }`}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                      <Home className="h-3 w-3 text-amber-500" />
                      {lead.preferredDesign} ({lead.housingType})
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {lead.facadeName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400">
                    <MapPin className="h-3 w-3 text-cyan-500" />
                    <span>Lot {lead.lotNumber || "TBA"}, {lead.targetEstate} ({lead.landStatus})</span>
                  </div>
                </div>

                {/* Target Date & Confidence Status */}
                <div className="flex items-center justify-between text-xs mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      lead.trConfidenceScore === "hot"
                        ? "bg-rose-950/60 text-rose-300 border-rose-800/60"
                        : lead.trConfidenceScore === "warm"
                        ? "bg-amber-950/60 text-amber-300 border-amber-800/60"
                        : "bg-blue-950/60 text-blue-300 border-blue-800/60"
                    }`}>
                      {lead.trConfidenceScore === "hot" ? "🔥 Hot Close" : lead.trConfidenceScore === "warm" ? "⚡ Warm" : "⏳ Nurturing"}
                    </span>
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {lead.trTargetDate || "Target: This Week"}
                    </span>
                  </div>

                  {lead.trAiReadinessScore && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded-md border border-cyan-800/50">
                      <Sparkles className="h-3 w-3 text-cyan-400" />
                      <span>AI: {lead.trAiReadinessScore}% Ready</span>
                    </div>
                  )}
                </div>

                {/* Key Obstacle to TR */}
                <div className={`p-2.5 rounded-xl border text-xs mb-3.5 ${
                  isLight ? "bg-amber-50/60 border-amber-200 text-amber-900" : "bg-amber-950/20 border-amber-800/40 text-amber-200"
                }`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider block text-amber-600 dark:text-amber-400 mb-0.5">
                    🎯 Key Obstacle to TR:
                  </span>
                  <p className="text-[11px] leading-snug">
                    {lead.trKeyObstacle || "Awaiting client review of concept plan & final quotation."}
                  </p>
                </div>

                {/* AI Readiness Insight */}
                {lead.trAiReadinessReason && (
                  <div className={`p-2 rounded-lg border text-[11px] mb-3.5 ${
                    isLight ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-slate-950/80 border-slate-800 text-slate-300"
                  }`}>
                    <span className="font-bold text-cyan-400 block text-[10px] uppercase">
                      ✨ AI Deal Intelligence:
                    </span>
                    <p className="line-clamp-2">{lead.trAiReadinessReason}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Quick Call Client"
                      onClick={() => onQuickAction(lead, "call")}
                      className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Quick SMS Client"
                      onClick={() => onQuickAction(lead, "sms")}
                      className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="360° Profile"
                      onClick={() => onOpenLead(lead)}
                      className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      <User className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {lead.stage !== "tender_requested" && lead.stage !== "tender_received" && lead.stage !== "tender_accepted" ? (
                      <Button
                        size="sm"
                        onClick={() => handlePushToTr(lead)}
                        className="h-7 text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold gap-1 shadow-sm"
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        Push to TR
                      </Button>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-950/40 border border-emerald-800 px-2 py-1 rounded-md">
                        ✓ In Tender Stage
                      </span>
                    )}

                    <button
                      type="button"
                      title="Remove from Top 10"
                      onClick={() => handleRemoveFromTr(lead.id)}
                      className="p-1 text-slate-400 hover:text-rose-400"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Client to Top 10 Modal */}
      <Dialog open={isAddTrModalOpen} onOpenChange={setIsAddTrModalOpen}>
        <DialogContent className={`max-w-md ${isLight ? "bg-white text-slate-900" : "bg-slate-900 text-white border-slate-800"}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-amber-500">
              <Flame className="h-4 w-4" /> Nominate Client to Top 10 TR Radar
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddCandidate} className="space-y-4 pt-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Select Client from Pipeline</label>
              <select
                value={selectedCandidateId}
                onChange={(e) => setSelectedCandidateId(e.target.value)}
                className={`w-full h-9 rounded-lg border px-3 text-xs ${
                  isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-950 border-slate-700 text-white"
                }`}
              >
                <option value="">-- Choose a client ({nonTrCandidates.length} eligible) --</option>
                {nonTrCandidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.clientName} — {c.preferredDesign} (${(c.totalEstimatedDealValue / 1000).toFixed(0)}k)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Priority Rank (1-10)</label>
                <select
                  value={candidateRank}
                  onChange={(e) => setCandidateRank(Number(e.target.value))}
                  className={`w-full h-9 rounded-lg border px-3 text-xs ${
                    isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-950 border-slate-700 text-white"
                  }`}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <option key={num} value={num}>
                      Rank #{num} {num === 1 ? "(Highest Urgency)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Confidence Score</label>
                <select
                  value={candidateConfidence}
                  onChange={(e) => setCandidateConfidence(e.target.value as any)}
                  className={`w-full h-9 rounded-lg border px-3 text-xs ${
                    isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-950 border-slate-700 text-white"
                  }`}
                >
                  <option value="hot">🔥 Hot (&gt;85%)</option>
                  <option value="warm">⚡ Warm (65-84%)</option>
                  <option value="nurturing">⏳ Nurturing (&lt;65%)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-semibold block mb-1">Target Close Date / Meeting</label>
              <Input
                value={candidateTargetDate}
                onChange={(e) => setCandidateTargetDate(e.target.value)}
                placeholder="e.g. This Friday 4pm, 15 Oct, End of Month"
                className={`h-9 text-xs ${isLight ? "bg-white border-slate-300" : "bg-slate-950 border-slate-700 text-white"}`}
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Key Obstacle or Next Step</label>
              <Input
                value={candidateObstacle}
                onChange={(e) => setCandidateObstacle(e.target.value)}
                placeholder="e.g. Broker finance capacity signoff, Bushfire BAL confirmation..."
                className={`h-9 text-xs ${isLight ? "bg-white border-slate-300" : "bg-slate-950 border-slate-700 text-white"}`}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddTrModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold">
                Add to Top 10 Radar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
