import React, { useState } from "react";
import { CrmLead, CrmTask } from "@/lib/crm/crmTypes";
import {
  runAskHoneyQuery,
  calculateLeadHeatScore,
  type AskHoneyQueryResult,
} from "@/lib/crm/crmAiEngine";
import { addCrmTask } from "@/lib/crm/crmStorage";
import { queueOrExecuteGhlAction } from "@/lib/crm/ghlIntegration";
import {
  Sparkles,
  Search,
  Mic,
  MicOff,
  Flame,
  Phone,
  MessageSquare,
  Calculator,
  PenTool,
  CheckSquare,
  X,
  ArrowRight,
  MapPin,
  Home,
  Filter,
  Volume2,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAud } from "@/lib/pricing";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { useTheme } from "@/lib/theme";

interface CrmAskHoneyCopilotProps {
  leads: CrmLead[];
  onOpenLead: (lead: CrmLead) => void;
  onQuickAction: (lead: CrmLead, action: "call" | "sms" | "email") => void;
  onLogLvmQuick: (lead: CrmLead) => void;
  onApplyLeadIdFilter: (leadIds: string[] | null, label?: string) => void;
  onOpenBulkSmsWithLeads: (leads: CrmLead[], prefillBody?: string) => void;
  onTasksCreated: () => void;
}

const PRESET_PROMPTS = [
  {
    label: "🏡 Flagstone leads (Last 30 days)",
    query: "Give me a list of all the leads who have enquired about Flagstone in the last month",
  },
  {
    label: "🔥 Hottest leads (Registered Land)",
    query: "Show me my hottest priority leads with registered titled land",
  },
  {
    label: "📞 LVM Voicemail Callbacks",
    query: "Give me all leads where we left a voicemail (LVM) that need a follow-up call",
  },
  {
    label: "📐 Pending Mark-Up or Estimate",
    query: "Show leads waiting on a floorplan mark-up plan or builders estimate",
  },
  {
    label: "⚠️ Stale Leads (7+ days no contact)",
    query: "Show stale leads with no contact in the last 7 days",
  },
  {
    label: "📥 Unassigned Honey Pool",
    query: "Show unassigned inbound pool leads from Honey CRM",
  },
];

export function CrmAskHoneyCopilot({
  leads,
  onOpenLead,
  onQuickAction,
  onLogLvmQuick,
  onApplyLeadIdFilter,
  onOpenBulkSmsWithLeads,
  onTasksCreated,
}: CrmAskHoneyCopilotProps) {
  const { mode } = useTheme();
  const isLight = mode === "normal";

  const [queryText, setQueryText] = useState("");
  const [activeResult, setActiveResult] = useState<AskHoneyQueryResult | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isCreatingBulkTasks, setIsCreatingBulkTasks] = useState(false);

  const executeQuery = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setQueryText(trimmed);
    const allTasks: CrmTask[] = [];
    leads.forEach((l) => {
      (l.tasks || []).forEach((t) => allTasks.push({ ...t, leadId: l.id, clientName: l.clientName }));
    });
    const res = runAskHoneyQuery(trimmed, leads, allTasks);
    setActiveResult(res);
  };

  const handleVoiceToggle = () => {
    if (typeof window === "undefined") return;
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      toast.info("Voice recognition not supported in this browser; running sample Flagstone query!");
      executeQuery(
        "Give me a list of all the leads who have enquired about Flagstone in the last month"
      );
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = "en-AU";
      rec.interimResults = false;
      setIsListening(true);
      toast.info("Listening... Ask Honey AI a question about your leads!");

      rec.onresult = (event: any) => {
        const transcript = event?.results?.[0]?.[0]?.transcript || "";
        setIsListening(false);
        if (transcript) {
          executeQuery(transcript);
        }
      };
      rec.onerror = () => {
        setIsListening(false);
      };
      rec.onend = () => {
        setIsListening(false);
      };
      rec.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleBulkCreateTasks = async () => {
    if (!activeResult || activeResult.matchedLeads.length === 0) return;
    setIsCreatingBulkTasks(true);
    try {
      for (const lead of activeResult.matchedLeads) {
        await addCrmTask(
          {
            title: `${activeResult.suggestedTaskTitle} — ${lead.clientName}`,
            description: `Created via Ask Honey AI cohort action (${activeResult.filterDescriptor})`,
            dueDate: "Tomorrow",
            slaDays: 1,
            priority: "high",
            type: activeResult.suggestedTaskType,
            leadId: lead.id,
            clientName: lead.clientName,
            clientMobile: lead.mobile,
            estate: lead.targetEstate,
            lotNumber: lead.lotNumber,
            designName: lead.preferredDesign,
            tags: ["Ask Honey AI", lead.targetEstate],
          },
          lead.id
        );

        await queueOrExecuteGhlAction({
          actionType: "create_task",
          leadId: lead.id,
          leadName: lead.clientName,
          ghlContactId: lead.ghlContactId,
          httpMethod: "POST",
          ghlEndpoint: `/contacts/${lead.ghlContactId || lead.id}/tasks`,
          payload: {
            title: `${activeResult.suggestedTaskTitle} — ${lead.clientName}`,
            dueDate: new Date(Date.now() + 86400000).toISOString(),
          },
          summary: `Queue AI Cohort Task (${activeResult.suggestedTaskTitle}) for ${lead.clientName}`,
        });
      }
      toast.success(
        `Created ${activeResult.matchedLeads.length} follow-up tasks & staged them in GHL Sandbox!`
      );
      onTasksCreated();
    } finally {
      setIsCreatingBulkTasks(false);
    }
  };

  return (
    <div
      data-testid="ask-honey-copilot"
      className={`rounded-2xl border p-4 transition-all ${
        isLight
          ? "bg-gradient-to-r from-amber-50/90 via-white to-emerald-50/70 border-amber-200/90 shadow-sm"
          : "bg-gradient-to-r from-slate-900/95 via-slate-900/90 to-emerald-950/30 border-amber-500/30 shadow-lg"
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20 shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-black uppercase tracking-wider ${
                  isLight ? "text-slate-900" : "text-white"
                }`}
              >
                Ask Honey AI Copilot
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Natural Language Lead &amp; Call Intelligence
              </span>
            </div>
            <p className={`text-[11px] ${isLight ? "text-slate-600" : "text-slate-400"}`}>
              Ask anything in plain English — filter by estate, timeframe, LVM status, mark-ups, estimates, or call transcripts.
            </p>
          </div>
        </div>

        {/* Search / Ask Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            executeQuery(queryText);
          }}
          className="flex items-center gap-2 flex-1 max-w-2xl"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-amber-500" />
            <Input
              data-testid="ask-honey-input"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder='Try: "Give me a list of all the leads who have enquired about Flagstone in the last month"'
              className={`h-9 pl-9 pr-9 text-xs font-medium rounded-xl ${
                isLight
                  ? "bg-white border-slate-300 text-slate-900 placeholder:text-slate-400"
                  : "bg-slate-950/90 border-slate-700 text-white placeholder:text-slate-500"
              }`}
            />
            {queryText && (
              <button
                type="button"
                onClick={() => {
                  setQueryText("");
                  setActiveResult(null);
                  onApplyLeadIdFilter(null);
                }}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleVoiceToggle}
            title="Talk to Honey AI with your microphone"
            className={`h-9 px-2.5 rounded-xl ${
              isListening
                ? "bg-rose-500 text-white border-rose-600 animate-pulse"
                : isLight
                ? "border-slate-300 bg-white text-slate-700"
                : "border-slate-700 bg-slate-900 text-slate-300"
            }`}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4 text-amber-500" />}
          </Button>

          <Button
            type="submit"
            size="sm"
            data-testid="ask-honey-submit-btn"
            className="h-9 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs gap-1.5 shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Ask Honey
          </Button>
        </form>
      </div>

      {/* Quick Prompt Chips */}
      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        <span className={`text-[10px] font-bold uppercase tracking-wider mr-1 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
          Instant Prompts:
        </span>
        {PRESET_PROMPTS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => executeQuery(p.query)}
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
              queryText === p.query
                ? "bg-amber-500 text-slate-950 border-amber-600 font-bold shadow-xs"
                : isLight
                ? "bg-white/90 border-slate-200/90 text-slate-700 hover:border-amber-400 hover:bg-amber-50/50"
                : "bg-slate-950/70 border-slate-800 text-slate-300 hover:border-amber-500/50 hover:text-white"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* AI Answer & Matched Leads Panel */}
      {activeResult && (
        <div
          data-testid="ask-honey-results-panel"
          className={`mt-4 pt-4 border-t space-y-3 ${
            isLight ? "border-amber-200/80" : "border-slate-800"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500 text-slate-950">
                  {activeResult.filterDescriptor}
                </span>
                <span className={`text-xs font-bold ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                  {activeResult.matchedLeads.length} Matched Lead{activeResult.matchedLeads.length === 1 ? "" : "s"} •{" "}
                  <span className="text-emerald-600 dark:text-emerald-400 font-black">
                    {formatAud(activeResult.totalPipelineValue)} Pipeline
                  </span>
                </span>
              </div>
              <p className={`text-xs leading-relaxed ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                {activeResult.answerMarkdown.replace(/\*\*/g, "").replace(/\*/g, "")}
              </p>
            </div>

            {/* Cohort 1-Click Bulk Actions */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onApplyLeadIdFilter(
                    activeResult.matchedLeads.map((l) => l.id),
                    activeResult.filterDescriptor
                  );
                  toast.success(`Filtered workspace to ${activeResult.matchedLeads.length} matched leads!`);
                }}
                className="h-8 text-xs font-bold gap-1.5"
              >
                <Filter className="h-3.5 w-3.5 text-amber-500" />
                Filter Board to Cohort ({activeResult.matchedLeads.length})
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  onOpenBulkSmsWithLeads(
                    activeResult.matchedLeads,
                    activeResult.suggestedBulkSms
                  )
                }
                className="h-8 text-xs font-bold gap-1.5"
              >
                <MessageSquare className="h-3.5 w-3.5 text-emerald-500" />
                SMS All ({activeResult.matchedLeads.length})
              </Button>

              <Button
                size="sm"
                disabled={isCreatingBulkTasks}
                onClick={handleBulkCreateTasks}
                className="h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                Queue Follow-Up Tasks ({activeResult.matchedLeads.length})
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setActiveResult(null);
                  onApplyLeadIdFilter(null);
                }}
                className="h-8 px-2 text-xs"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Interactive Lead Cards Grid */}
          {activeResult.matchedLeads.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
              {activeResult.matchedLeads.map((lead) => {
                const heat = calculateLeadHeatScore(lead);
                return (
                  <div
                    key={lead.id}
                    className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 transition-all ${
                      isLight
                        ? "bg-white border-slate-200 hover:border-amber-400 shadow-2xs"
                        : "bg-slate-950/90 border-slate-800 hover:border-amber-500/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <button
                          type="button"
                          onClick={() => onOpenLead(lead)}
                          className={`text-xs font-black hover:underline text-left flex items-center gap-1.5 ${
                            isLight ? "text-slate-900" : "text-white"
                          }`}
                        >
                          {lead.clientName}
                          {lead.ghlContactId && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              Honey GHL
                            </span>
                          )}
                        </button>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                            <MapPin className="h-3 w-3" />
                            {lead.targetEstate} (Lot {lead.lotNumber || "TBA"})
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Home className="h-3 w-3" />
                            {lead.preferredDesign}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${
                            heat.score >= 85
                              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          <Flame className="h-3 w-3" />
                          {heat.score} Heat
                        </span>
                        <span className="block text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {formatAud(lead.totalEstimatedDealValue || 0)}
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold truncate">
                      Next: {heat.nextRecommendedAction}
                    </div>

                    <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onQuickAction(lead, "call")}
                          className="h-6 px-2 text-[10px] font-bold gap-1"
                        >
                          <Phone className="h-2.5 w-2.5 text-emerald-500" />
                          Call / AI
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onLogLvmQuick(lead)}
                          className="h-6 px-2 text-[10px] font-bold gap-1"
                        >
                          LVM #{(lead.lvmCount || 0) + 1}
                        </Button>
                      </div>

                      <div className="flex items-center gap-1">
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
                            variant="ghost"
                            className="h-6 px-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400"
                          >
                            <Calculator className="h-2.5 w-2.5 mr-1" />
                            Estimate
                          </Button>
                        </Link>
                        <Link to="/floorplan-editor">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px] font-bold text-amber-600 dark:text-amber-400"
                          >
                            <PenTool className="h-2.5 w-2.5 mr-1" />
                            Mark-Up
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
