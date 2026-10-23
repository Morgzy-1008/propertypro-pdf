import React, { useState, useMemo, useEffect } from "react";
import {
  CrmLead,
  CrmStageId,
  CRM_PIPELINE_STAGES,
  CrmTask,
  CrmCallRecord,
} from "@/lib/crm/crmTypes";
import {
  calculateLeadHeatScore,
  analyzeCallTranscriptWithAi,
  getLeadConnectedAssets,
} from "@/lib/crm/crmAiEngine";
import {
  saveCrmLead,
  logLeftVoicemail,
  addCrmTask,
  saveCrmMessage,
} from "@/lib/crm/crmStorage";
import { queueOrExecuteGhlAction } from "@/lib/crm/ghlIntegration";
import {
  Flame,
  Phone,
  PhoneCall,
  PhoneForwarded,
  MessageSquare,
  Mail,
  Sparkles,
  Calculator,
  PenTool,
  Send,
  FileText,
  Pin,
  Clock,
  MapPin,
  Home,
  CheckCircle2,
  AlertTriangle,
  Mic,
  MicOff,
  Play,
  Plus,
  Building2,
  UserCheck,
  ExternalLink,
  CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatAud } from "@/lib/pricing";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { useTheme } from "@/lib/theme";
import { getActiveStaffUser } from "@/lib/authSession";

interface CrmPriorityQueueViewProps {
  leads: CrmLead[];
  onOpenFullModal: (lead: CrmLead) => void;
  onQuickAction: (lead: CrmLead, action: "call" | "sms" | "email") => void;
  onDataChanged: () => void;
}

type QueueFilterMode =
  | "all_hot"
  | "speed_to_lead"
  | "lvm_cadence"
  | "markup_estimate"
  | "stale_rescue"
  | "unassigned_pool";

export function CrmPriorityQueueView({
  leads,
  onOpenFullModal,
  onQuickAction,
  onDataChanged,
}: CrmPriorityQueueViewProps) {
  const { mode } = useTheme();
  const isLight = mode === "normal";

  const [queueFilter, setQueueFilter] = useState<QueueFilterMode>("all_hot");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [callTranscriptInput, setCallTranscriptInput] = useState("");
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isAnalyzingCall, setIsAnalyzingCall] = useState(false);
  const [lastAiSmsDraft, setLastAiSmsDraft] = useState<string | null>(null);

  const scoredLeads = useMemo(() => {
    return leads
      .map((lead) => ({
        lead,
        heat: calculateLeadHeatScore(lead),
      }))
      .sort((a, b) => {
        if (a.lead.isVipPinned && !b.lead.isVipPinned) return -1;
        if (!a.lead.isVipPinned && b.lead.isVipPinned) return 1;
        return b.heat.score - a.heat.score;
      });
  }, [leads]);

  const filteredQueue = useMemo(() => {
    return scoredLeads.filter(({ lead, heat }) => {
      if (queueFilter === "speed_to_lead") return heat.isSpeedToLead;
      if (queueFilter === "lvm_cadence") return (lead.lvmCount || 0) > 0;
      if (queueFilter === "markup_estimate") {
        return (
          lead.stage === "concept_plan" ||
          lead.stage === "estimate_presented" ||
          (lead.tasks || []).some(
            (t) =>
              !t.completed &&
              (t.type === "mark_up" || t.type === "estimate")
          )
        );
      }
      if (queueFilter === "stale_rescue") return heat.isStaleLead;
      if (queueFilter === "unassigned_pool") return Boolean(lead.isUnassignedPool);
      return true;
    });
  }, [scoredLeads, queueFilter]);

  const activeEntry = useMemo(() => {
    if (selectedLeadId) {
      const found = scoredLeads.find((x) => x.lead.id === selectedLeadId);
      if (found) return found;
    }
    return filteredQueue[0] || scoredLeads[0] || null;
  }, [selectedLeadId, filteredQueue, scoredLeads]);

  useEffect(() => {
    if (activeEntry?.lead) {
      setLastAiSmsDraft(null);
    }
  }, [activeEntry?.lead?.id]);

  const connectedAssets = useMemo(() => {
    if (!activeEntry?.lead) {
      return { matchingLots: [], matchingPackages: [], linkedQuotes: [] };
    }
    return getLeadConnectedAssets(activeEntry.lead);
  }, [activeEntry?.lead]);

  const handleToggleVipPin = async (lead: CrmLead, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated: CrmLead = {
      ...lead,
      isVipPinned: !lead.isVipPinned,
      updatedAt: new Date().toISOString(),
    };
    await saveCrmLead(updated);
    toast.success(
      updated.isVipPinned
        ? `Pinned ${lead.clientName} to top of Hot Priority Queue!`
        : `Unpinned ${lead.clientName}.`
    );
    onDataChanged();
  };

  const handleClaimUnassignedLead = async (lead: CrmLead) => {
    const staff = getActiveStaffUser();
    const updated: CrmLead = {
      ...lead,
      isUnassignedPool: false,
      assignedConsultantId: "morgan_hales",
      updatedAt: new Date().toISOString(),
    };
    await saveCrmLead(updated);
    toast.success(`Claimed ${lead.clientName} into ${staff?.name || "Morgan Hales"}'s pipeline!`);
    onDataChanged();
  };

  const handleOneClickLvm = async (lead: CrmLead) => {
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
        smsDraft: res.lvmSmsBody,
      },
      summary: `Logged LVM #${res.lvmCount} + Auto-Scheduled Callback Task & SMS Draft`,
    });
    setLastAiSmsDraft(res.lvmSmsBody);
    toast.success(
      `LVM #${res.lvmCount} logged! Auto-scheduled callback task & prepared 'Missed You' SMS.`
    );
    onDataChanged();
  };

  const handleQuickCreateTask = async (
    lead: CrmLead,
    type: "mark_up" | "estimate" | "call" | "tender_submission"
  ) => {
    const titles = {
      mark_up: `📐 Floorplan Mark-Up (${lead.preferredDesign}) for ${lead.clientName}`,
      estimate: `🧮 Prepare Builders Estimate (${lead.preferredDesign} on Lot ${lead.lotNumber} ${lead.targetEstate})`,
      call: `📞 Priority Follow-Up Call: ${lead.clientName} (${lead.targetEstate})`,
      tender_submission: `🚀 Prepare ATP / Tender Submission Pack for ${lead.clientName}`,
    };
    const urls = {
      mark_up: "/floorplan-editor",
      estimate: "/quote-builder",
      call: "/crm",
      tender_submission: "/tender-request",
    };

    await addCrmTask(
      {
        title: titles[type],
        description: `Queued from Priority Cockpit for ${lead.clientName} (${lead.targetEstate} Lot ${lead.lotNumber})`,
        dueDate: type === "call" ? "Today" : "Tomorrow",
        slaDays: type === "call" ? 0 : 1,
        priority: "urgent",
        type,
        leadId: lead.id,
        clientName: lead.clientName,
        clientMobile: lead.mobile,
        estate: lead.targetEstate,
        lotNumber: lead.lotNumber,
        designName: lead.preferredDesign,
        quickActionUrl: urls[type],
        tags: [lead.targetEstate, type === "mark_up" ? "Mark-Up" : type === "estimate" ? "Estimate" : "Priority"],
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
        title: titles[type],
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      },
      summary: `Created ${type.toUpperCase()} Task: ${titles[type]}`,
    });

    toast.success(`Added task: "${titles[type]}"!`);
    onDataChanged();
  };

  const handleRunAiCallAnalysis = async () => {
    if (!activeEntry?.lead) return;
    const lead = activeEntry.lead;
    const sampleTranscript =
      callTranscriptInput.trim() ||
      `Spoke with ${lead.clientName} on speakerphone regarding Lot ${lead.lotNumber !== "TBA" ? lead.lotNumber : "318"} at ${lead.targetEstate || "Flagstone Rise"}. Land is registered and finance is pre-approved up to $560k. They love the ${lead.preferredDesign || "Burgundy 27"} design and asked us to mark up the floorplan to extend the alfresco and send through an itemised Builders Estimate with 2590mm high ceilings by tomorrow.`;

    setIsAnalyzingCall(true);
    await new Promise((r) => setTimeout(r, 350));

    const analysis = analyzeCallTranscriptWithAi(sampleTranscript, lead);
    const staff = getActiveStaffUser();
    const consultantName = staff?.name || "Morgan Hales";

    // Create auto-tasks on the lead
    const newTasks: CrmTask[] = analysis.autoTasks.map((t, idx) => ({
      id: `task_ai_${Date.now()}_${idx}`,
      title: t.title,
      description: t.description,
      dueDate: t.dueDateLabel,
      dueAt: new Date(Date.now() + t.slaDays * 86400000).toISOString(),
      slaDays: t.slaDays,
      completed: false,
      assignedTo: lead.assignedConsultantId,
      createdBy: "Honey AI Call Intelligence",
      priority: t.priority,
      type: t.type,
      leadId: lead.id,
      clientName: lead.clientName,
      clientMobile: lead.mobile,
      estate: analysis.extractedFields?.targetEstate || lead.targetEstate,
      lotNumber: analysis.extractedFields?.lotNumber || lead.lotNumber,
      designName: analysis.extractedFields?.preferredDesign || lead.preferredDesign,
      quickActionUrl: t.quickActionUrl,
      tags: ["AI Call Auto-Task", analysis.extractedFields?.targetEstate || lead.targetEstate],
      createdAt: new Date().toISOString(),
    }));

    const callRecord: CrmCallRecord = {
      id: `call_ai_${Date.now()}`,
      leadId: lead.id,
      consultantName,
      direction: "outbound",
      source: "voice_debrief",
      outcome: analysis.sentiment === "voicemail" ? "lvm_1" : "answered",
      durationSeconds: 310,
      transcript: sampleTranscript,
      aiSummary: analysis.summary,
      aiSentiment: analysis.sentiment,
      extractedFields: analysis.extractedFields,
      autoCreatedTaskIds: newTasks.map((t) => t.id),
      createdAt: new Date().toISOString(),
    };

    const updatedLead: CrmLead = {
      ...lead,
      targetEstate: analysis.extractedFields?.targetEstate || lead.targetEstate,
      suburb: analysis.extractedFields?.suburb || lead.suburb,
      lotNumber: analysis.extractedFields?.lotNumber || lead.lotNumber,
      preferredDesign: analysis.extractedFields?.preferredDesign || lead.preferredDesign,
      landStatus: analysis.extractedFields?.landStatus || lead.landStatus,
      financeStatus: (analysis.extractedFields?.financeStatus as any) || lead.financeStatus,
      totalEstimatedDealValue:
        analysis.extractedFields?.budget || lead.totalEstimatedDealValue,
      stage: analysis.suggestedStage || lead.stage,
      callRecords: [callRecord, ...(lead.callRecords || [])],
      clientNotes: [
        {
          id: `note_ai_${Date.now()}`,
          author: `${consultantName} (AI Call Summary)`,
          content: `🎙️ [AI Call Summary]:\n${analysis.summary}`,
          createdAt: new Date().toISOString(),
        },
        ...(lead.clientNotes || []),
      ],
      tasks: [...newTasks, ...(lead.tasks || [])],
      activities: [
        {
          id: `act_ai_${Date.now()}`,
          type: "ai_call_summary",
          title: `🎙️ AI Call Summary & ${newTasks.length} Auto-Task(s) Created`,
          description: analysis.summary.split("\n")[0] || "Call analyzed by AI.",
          timestamp: new Date().toISOString(),
        },
        ...(lead.activities || []),
      ],
      lastContactedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveCrmLead(updatedLead);

    await queueOrExecuteGhlAction({
      actionType: "log_call_summary",
      leadId: lead.id,
      leadName: lead.clientName,
      ghlContactId: lead.ghlContactId,
      httpMethod: "POST",
      ghlEndpoint: `/contacts/${lead.ghlContactId || lead.id}/notes`,
      payload: {
        body: `🎙️ [Hudson AI Call Summary]:\n${analysis.summary}\n\nAuto-Created Tasks:\n${newTasks
          .map((t) => `- ${t.title} (${t.dueDate})`)
          .join("\n")}`,
        extractedFields: analysis.extractedFields,
      },
      summary: `AI Call Summary + ${newTasks.length} Auto-Tasks (${newTasks
        .map((t) => t.type)
        .join(", ")}) staged for Honey GHL`,
    });

    setIsAnalyzingCall(false);
    setCallTranscriptInput("");
    setLastAiSmsDraft(analysis.followUpSmsDraft);
    toast.success(
      `AI Call Summary saved! Auto-updated specs & created ${newTasks.length} follow-up task(s).`
    );
    onDataChanged();
  };

  const handleSendDraftSms = async () => {
    if (!activeEntry?.lead || !lastAiSmsDraft) return;
    const lead = activeEntry.lead;
    const staff = getActiveStaffUser();
    await saveCrmMessage({
      id: `msg_sms_${Date.now()}`,
      clientEmail: lead.email,
      clientMobile: lead.mobile,
      direction: "outbound",
      channel: "sms",
      senderName: staff?.name || "Morgan Hales",
      recipientName: lead.clientName,
      body: lastAiSmsDraft,
      timestamp: new Date().toISOString(),
      isRead: true,
    });
    toast.success(`SMS sent to ${lead.clientName} (${lead.mobile})!`);
    setLastAiSmsDraft(null);
    onDataChanged();
  };

  return (
    <div
      data-testid="crm-priority-queue-view"
      className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start"
    >
      {/* LEFT PANE: Ranked Hot Lead & LVM Queue (5 cols) */}
      <div
        className={`lg:col-span-5 rounded-2xl border p-3.5 space-y-3 ${
          isLight ? "bg-white border-slate-200 shadow-xs" : "bg-slate-900/70 border-slate-800"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-black flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-rose-500" />
              Smart Priority Queue &amp; Power Dialer
            </h3>
            <p className="text-[11px] text-slate-500">
              AI-ranked by Speed-to-Lead, Land Titling, Finance, LVM Cadence &amp; Deal Value
            </p>
          </div>
          <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            {filteredQueue.length} Leads
          </span>
        </div>

        {/* Sub-queue filter pills */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "all_hot" as const, label: `🔥 All Ranked (${scoredLeads.length})` },
            {
              id: "speed_to_lead" as const,
              label: `⚡ Speed-to-Lead (${scoredLeads.filter((x) => x.heat.isSpeedToLead).length})`,
            },
            {
              id: "lvm_cadence" as const,
              label: `📞 LVM Queue (${scoredLeads.filter((x) => (x.lead.lvmCount || 0) > 0).length})`,
            },
            {
              id: "markup_estimate" as const,
              label: `📐 Mark-Up / Est (${
                scoredLeads.filter(
                  (x) =>
                    x.lead.stage === "concept_plan" ||
                    x.lead.stage === "estimate_presented"
                ).length
              })`,
            },
            {
              id: "stale_rescue" as const,
              label: `⚠️ Stale 7d+ (${scoredLeads.filter((x) => x.heat.isStaleLead).length})`,
            },
            {
              id: "unassigned_pool" as const,
              label: `📥 Inbound Pool (${scoredLeads.filter((x) => x.lead.isUnassignedPool).length})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setQueueFilter(tab.id)}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                queueFilter === tab.id
                  ? "bg-amber-500 text-slate-950 border-amber-600 shadow-2xs"
                  : isLight
                  ? "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Ranked Lead Cards */}
        <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
          {filteredQueue.map(({ lead, heat }, idx) => {
            const isSelected = activeEntry?.lead?.id === lead.id;
            const stageDef =
              CRM_PIPELINE_STAGES.find((s) => s.id === lead.stage) || CRM_PIPELINE_STAGES[0];

            return (
              <div
                key={lead.id}
                onClick={() => setSelectedLeadId(lead.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all space-y-2 ${
                  isSelected
                    ? isLight
                      ? "bg-amber-50/70 border-amber-500 ring-1 ring-amber-500/40 shadow-xs"
                      : "bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/40"
                    : isLight
                    ? "bg-white border-slate-200 hover:border-slate-300"
                    : "bg-slate-950/80 border-slate-800/90 hover:border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <span
                      className={`h-6 w-6 rounded-lg text-[11px] font-black flex items-center justify-center shrink-0 ${
                        heat.score >= 85
                          ? "bg-rose-500 text-white"
                          : heat.score >= 70
                          ? "bg-amber-500 text-slate-950"
                          : "bg-slate-700 text-white"
                      }`}
                    >
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black">{lead.clientName}</span>
                        {lead.isVipPinned && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500 text-slate-950">
                            📌 VIP
                          </span>
                        )}
                        {(lead.lvmCount || 0) > 0 && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                            LVM #{lead.lvmCount}
                          </span>
                        )}
                        {lead.isUnassignedPool && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30">
                            Unassigned Pool
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {lead.targetEstate} (Lot {lead.lotNumber || "TBA"})
                        </span>
                        <span>•</span>
                        <span>{lead.preferredDesign}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleToggleVipPin(lead, e)}
                      title="Pin / Star VIP Hot Lead to top of queue"
                      className={`p-1 rounded-md border ${
                        lead.isVipPinned
                          ? "bg-amber-500 text-slate-950 border-amber-600"
                          : "text-slate-400 border-transparent hover:border-slate-300"
                      }`}
                    >
                      <Pin className="h-3 w-3" />
                    </button>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        heat.score >= 85
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      🔥 {heat.score}
                    </span>
                  </div>
                </div>

                {/* Heat Reasons & Stage */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px]">
                  <div className="flex flex-wrap gap-1">
                    <span className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-800 font-bold">
                      {stageDef.shortLabel}
                    </span>
                    {heat.reasons.slice(0, 2).map((r) => (
                      <span
                        key={r}
                        className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 font-medium"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">
                    {formatAud(lead.totalEstimatedDealValue || 0)}
                  </span>
                </div>

                <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="truncate">👉 {heat.nextRecommendedAction}</span>
                  <span className="text-slate-400 shrink-0 ml-2">
                    {heat.daysSinceLastContact < 1
                      ? "Touched today"
                      : `${heat.daysSinceLastContact}d ago`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT PANE: Split-Screen Live Call & Lead Cockpit (7 cols) */}
      <div className="lg:col-span-7 space-y-4">
        {activeEntry ? (
          <div
            data-testid="crm-lead-cockpit"
            className={`rounded-2xl border p-4 sm:p-5 space-y-4 ${
              isLight ? "bg-white border-slate-200 shadow-xs" : "bg-slate-900/70 border-slate-800"
            }`}
          >
            {/* Lead Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b pb-3.5 border-slate-200 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-black">{activeEntry.lead.clientName}</h2>
                  <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                    🔥 Heat Score: {activeEntry.heat.score}/100
                  </span>
                  {(activeEntry.lead.lvmCount || 0) > 0 && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                      📞 LVM #{activeEntry.lead.lvmCount}
                    </span>
                  )}
                  {activeEntry.lead.isUnassignedPool && (
                    <Button
                      size="sm"
                      onClick={() => handleClaimUnassignedLead(activeEntry.lead)}
                      className="h-6 px-2.5 text-[10px] bg-cyan-600 hover:bg-cyan-500 text-white font-black"
                    >
                      <UserCheck className="h-3 w-3 mr-1" />
                      Claim Lead from Pool
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                    📱 {activeEntry.lead.mobile}
                  </span>
                  <span>✉️ {activeEntry.lead.email}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    📍 {activeEntry.lead.targetEstate} (Lot {activeEntry.lead.lotNumber || "TBA"},{" "}
                    {activeEntry.lead.suburb})
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenFullModal(activeEntry.lead)}
                  className="h-8 text-xs font-bold gap-1"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Full 360° Profile
                </Button>
              </div>
            </div>

            {/* 1-Click Call Outcome & LVM Cadence Bar + Hudson OS Deep Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Call & LVM Dispositions */}
              <div
                className={`p-3 rounded-xl border space-y-2 ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/70 border-slate-800"
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  1-Click Call Disposition &amp; Smart LVM Cadence
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    onClick={() => onQuickAction(activeEntry.lead, "call")}
                    className="h-8 text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
                  >
                    <PhoneCall className="h-3.5 w-3.5" />
                    Dial Client
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    data-testid="one-click-lvm-btn"
                    onClick={() => handleOneClickLvm(activeEntry.lead)}
                    className="h-8 text-xs font-bold gap-1 border-purple-500/40 text-purple-600 dark:text-purple-300 hover:bg-purple-500/10"
                  >
                    <PhoneForwarded className="h-3.5 w-3.5" />
                    Log LVM #{(activeEntry.lead.lvmCount || 0) + 1} (+Task &amp; SMS)
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onQuickAction(activeEntry.lead, "sms")}
                    className="h-8 text-xs font-bold gap-1"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-amber-500" />
                    SMS
                  </Button>
                </div>
              </div>

              {/* 1-Click Hudson OS Portal Launchers & Task Creators */}
              <div
                className={`p-3 rounded-xl border space-y-2 ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/70 border-slate-800"
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  1-Click Hudson OS Portals &amp; Instant Task Queue
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <Link
                    to="/quote-builder"
                    onClick={() => {
                      localStorage.setItem(
                        "hudson_crm_prefill_lead",
                        JSON.stringify(activeEntry.lead)
                      );
                    }}
                  >
                    <Button
                      size="sm"
                      className="h-8 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 gap-1"
                    >
                      <Calculator className="h-3.5 w-3.5" />
                      Open in Quoting Tool
                    </Button>
                  </Link>

                  <Link to="/floorplan-editor">
                    <Button size="sm" variant="outline" className="h-8 text-xs font-bold gap-1">
                      <PenTool className="h-3.5 w-3.5 text-cyan-500" />
                      Floorplan Mark-Up
                    </Button>
                  </Link>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickCreateTask(activeEntry.lead, "mark_up")}
                    className="h-8 text-xs font-bold gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Task: Mark-Up
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickCreateTask(activeEntry.lead, "estimate")}
                    className="h-8 text-xs font-bold gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Task: Estimate
                  </Button>
                </div>
              </div>
            </div>

            {/* Auto-Generated SMS Draft Banner (after LVM or AI Call) */}
            {lastAiSmsDraft && (
              <div
                className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs ${
                  isLight
                    ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                    : "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                }`}
              >
                <div className="space-y-0.5">
                  <span className="font-black text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                    ✨ AI Follow-Up SMS Ready to Send to {activeEntry.lead.mobile}
                  </span>
                  <p className="text-xs italic">&ldquo;{lastAiSmsDraft}&rdquo;</p>
                </div>
                <Button
                  size="sm"
                  onClick={handleSendDraftSms}
                  className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send SMS Now
                </Button>
              </div>
            )}

            {/* Gong.io-Style AI Call Summary & Auto-Task Generator */}
            <div
              className={`p-3.5 rounded-xl border space-y-2.5 ${
                isLight
                  ? "bg-gradient-to-br from-amber-50/60 to-white border-amber-200/80"
                  : "bg-gradient-to-br from-slate-950 to-amber-950/15 border-amber-500/30"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-black">
                    AI Call Recorder, Transcript Summary &amp; Auto-Task Engine
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setCallTranscriptInput(
                        `Just finished call with ${activeEntry.lead.clientName}. They confirmed registered Lot ${
                          activeEntry.lead.lotNumber !== "TBA" ? activeEntry.lead.lotNumber : "318"
                        } at ${activeEntry.lead.targetEstate || "Flagstone Rise"} with pre-approved finance up to $560k. Requested a floorplan mark-up on the ${
                          activeEntry.lead.preferredDesign || "Burgundy 27"
                        } to extend the alfresco and want an itemised Builders Estimate with 2590mm ceilings sent by tomorrow.`
                      )
                    }
                    className="h-7 text-[10px] font-bold"
                  >
                    Load Sample Call Transcript
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    data-testid="run-ai-call-summary-btn"
                    disabled={isAnalyzingCall}
                    onClick={handleRunAiCallAnalysis}
                    className="h-7 text-[11px] font-black bg-amber-500 hover:bg-amber-400 text-slate-950 gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    {isAnalyzingCall
                      ? "Analyzing Call..."
                      : "Generate AI Summary & Auto-Create Tasks"}
                  </Button>
                </div>
              </div>

              <Textarea
                value={callTranscriptInput}
                onChange={(e) => setCallTranscriptInput(e.target.value)}
                rows={2}
                placeholder="Paste call notes, dictate after a phone call, or analyze a synced Honey GHL call recording — AI will summarise, extract Estate/Lot/Design/Budget, and auto-create Mark-Up & Estimate tasks..."
                className="text-xs"
              />

              {/* Previous Call Summaries */}
              {(activeEntry.lead.callRecords || []).length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Recent AI Call Summaries ({activeEntry.lead.callRecords?.length})
                  </span>
                  {activeEntry.lead.callRecords?.slice(0, 2).map((rec) => (
                    <div
                      key={rec.id}
                      className={`p-2.5 rounded-lg border text-[11px] space-y-1 ${
                        isLight ? "bg-white border-slate-200" : "bg-slate-900/90 border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-amber-600 dark:text-amber-400">
                          🎙️ {rec.source === "ghl_recording" ? "Honey GHL Call Recording" : "AI Call Summary"} •{" "}
                          {Math.floor(rec.durationSeconds / 60)}m {rec.durationSeconds % 60}s
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(rec.createdAt).toLocaleDateString("en-AU")}
                        </span>
                      </div>
                      <p className="whitespace-pre-line text-slate-600 dark:text-slate-300 leading-relaxed">
                        {rec.aiSummary}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Connected Assets: Linked Saved Estimates + Matching Database Land Lots */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Linked Saved Estimates & Active Tasks */}
              <div
                className={`p-3 rounded-xl border space-y-2 ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  Linked Builders Estimates &amp; Active Tasks
                </span>

                {connectedAssets.linkedQuotes.length > 0 ? (
                  <div className="space-y-1.5">
                    {connectedAssets.linkedQuotes.map((q) => (
                      <div
                        key={q.id}
                        className={`p-2 rounded-lg border flex items-center justify-between text-xs ${
                          isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
                        }`}
                      >
                        <div>
                          <span className="font-black text-emerald-600 dark:text-emerald-400">
                            #{q.quoteNumber}
                          </span>{" "}
                          <span className="font-bold">{q.design.designName}</span>
                          <span className="block text-[10px] text-slate-500">
                            Lot {q.client.lotNumber} {q.client.estate}
                          </span>
                        </div>
                        <Link to="/quote-builder">
                          <Button size="sm" variant="outline" className="h-6 text-[10px] font-bold">
                            Open Quote
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    No saved Builders Estimate linked yet — click &ldquo;Open in Quoting Tool&rdquo; above to create one in 1 click.
                  </p>
                )}

                {/* Open Tasks on this Lead */}
                {(activeEntry.lead.tasks || []).filter((t) => !t.completed).length > 0 && (
                  <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block">
                      Pending Tasks ({(activeEntry.lead.tasks || []).filter((t) => !t.completed).length}):
                    </span>
                    {(activeEntry.lead.tasks || [])
                      .filter((t) => !t.completed)
                      .slice(0, 3)
                      .map((t) => (
                        <div
                          key={t.id}
                          className="text-[11px] flex items-center justify-between gap-2 py-0.5"
                        >
                          <span className="truncate font-medium">• {t.title}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                            {t.dueDate || "Due"}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Matching Available Land Lots & Packages from Database */}
              <div
                className={`p-3 rounded-xl border space-y-2 ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    🏡 Matching Land Lots ({activeEntry.lead.targetEstate})
                  </span>
                  <Link
                    to="/packages"
                    className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    View Database →
                  </Link>
                </div>

                {connectedAssets.matchingLots.length > 0 ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {connectedAssets.matchingLots.slice(0, 3).map((lot) => (
                      <div
                        key={lot.id}
                        className={`p-2 rounded-lg border flex items-center justify-between text-[11px] ${
                          isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
                        }`}
                      >
                        <div>
                          <span className="font-bold">
                            Lot {lot.lot_number || "TBA"} • {lot.estate}
                          </span>
                          <span className="block text-[10px] text-slate-500">
                            {lot.land_size ? `${lot.land_size}m²` : "450m²"} •{" "}
                            {lot.frontage ? `${lot.frontage}m front` : "15m front"} •{" "}
                            {lot.titled ? "Registered" : "Unregistered"}
                          </span>
                        </div>
                        <span className="font-black text-emerald-600 dark:text-emerald-400">
                          {lot.land_price ? formatAud(lot.land_price) : "POA"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    Ready to match land lots in {activeEntry.lead.targetEstate || "Queensland / NSW"} from the Land &amp; Package Database.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-2xl border text-center text-xs text-slate-500">
            Select any lead on the left to open the Split-Screen Call &amp; Quoting Cockpit.
          </div>
        )}
      </div>
    </div>
  );
}
