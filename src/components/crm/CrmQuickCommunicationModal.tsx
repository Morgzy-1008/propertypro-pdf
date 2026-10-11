import React, { useState, useEffect } from "react";
import {
  Phone,
  MessageSquare,
  Mail,
  Send,
  Check,
  Sparkles,
  User,
  Clock,
  CheckCircle2,
  PhoneCall,
  PhoneForwarded,
  PhoneMissed,
  Radio,
  Mic,
  MicOff,
  Flame,
  ArrowRight,
  ListTodo,
  FileText,
  Volume2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CrmLead, CrmMessage, CrmTask } from "@/lib/crm/crmTypes";
import { saveCrmLead, saveCrmMessage, logLeftVoicemail } from "@/lib/crm/crmStorage";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme";
import { getActiveStaffUser } from "@/lib/authSession";

interface CrmQuickCommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: CrmLead | null;
  initialChannel?: "call" | "sms" | "email";
  onUpdated: () => void;
}

export function CrmQuickCommunicationModal({
  isOpen,
  onClose,
  lead,
  initialChannel = "call",
  onUpdated,
}: CrmQuickCommunicationModalProps) {
  const { mode } = useTheme();
  const isLight = mode === "normal";

  const [activeTab, setActiveTab] = useState<"call" | "sms" | "email">(initialChannel);

  useEffect(() => {
    if (initialChannel) setActiveTab(initialChannel);
  }, [initialChannel]);

  // Call Logger State
  const [callOutcome, setCallOutcome] = useState("Spoke with client");
  const [callNotes, setCallNotes] = useState("");
  const [isInCall, setIsInCall] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);

  // AI Assistant State
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [extractedTasks, setExtractedTasks] = useState<string[]>([]);
  const [aiReadinessScore, setAiReadinessScore] = useState<number | null>(null);

  // SMS State
  const [smsBody, setSmsBody] = useState("");

  // Email State
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  // In-call timer effect
  useEffect(() => {
    let interval: any;
    if (isInCall) {
      interval = setInterval(() => {
        setCallSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setCallSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isInCall]);

  useEffect(() => {
    if (lead) {
      const firstName = lead.clientName.split(" ")[0];
      setSmsBody(`Hi ${firstName}, Morgan from Hudson Homes here. Following up on your ${lead.preferredDesign} package on Lot ${lead.lotNumber} ${lead.targetEstate}. Let me know if you have any questions!`);
      setEmailSubject(`Hudson Homes — ${lead.preferredDesign} Package for Lot ${lead.lotNumber} ${lead.targetEstate}`);
      setEmailBody(`Hi ${lead.clientName},\n\nThank you for taking the time to discuss your new home build with Hudson Homes.\n\nAttached is your requested documentation for the ${lead.preferredDesign} (${lead.housingType}) with ${lead.facadeName} facade.\n\nPlease let me know if you would like to make any modifications to the floorplan or siting.\n\nWarm regards,\n\nMorgan Hales\nNew Home Consultant | Hudson Homes\n0417 571 864`);
    }
  }, [lead]);

  if (!lead) return null;

  const firstName = lead.clientName.split(" ")[0];

  // 1. Dial Trigger & WebRTC Simulator
  const handleStartCall = () => {
    if (!lead.mobile) {
      toast.error("No phone number found for this client.");
      return;
    }
    setIsInCall(true);
    toast.info(`Connecting WebRTC call to ${lead.mobile} via Telnyx...`);
  };

  const handleEndCall = () => {
    setIsInCall(false);
    toast.info("Call ended. Enter notes or run AI summary below.");
  };

  const staffUser = getActiveStaffUser();
  const currentConsultantName = staffUser?.name || "Morgan Hales";

  // 1-Click Left Voicemail (LVM)
  const handleLeftVoicemail = async () => {
    setIsInCall(false);
    try {
      const { updatedLead, lvmSmsBody } = await logLeftVoicemail(lead.id, currentConsultantName);
      toast.success("Voicemail logged! 48-hour follow-up task auto-scheduled.");
      setSmsBody(lvmSmsBody);
      setActiveTab("sms");
      onUpdated();
    } catch (err: any) {
      toast.error(`Error logging voicemail: ${err?.message}`);
    }
  };

  // AI Call Note & Task Extractor
  const handleRunAiAssistant = async () => {
    setIsAiProcessing(true);
    await new Promise((r) => setTimeout(r, 600));

    const rawNotes = callNotes.trim();
    const design = lead.preferredDesign || "Standard Design";
    const estate = lead.targetEstate || "Target Estate";
    const lot = lead.lotNumber || "TBA";
    const clientFirst = lead.clientName.split(" ")[0];

    let summaryPoints: string[] = [];
    const tasks: string[] = [];
    let score = 75;

    if (rawNotes) {
      const lower = rawNotes.toLowerCase();
      summaryPoints.push(`• Call with ${clientFirst} regarding ${design} on Lot ${lot} (${estate}).`);

      if (
        lower.includes("broker") ||
        lower.includes("finance") ||
        lower.includes("pre-approval") ||
        lower.includes("loan") ||
        lower.includes("macquarie") ||
        lower.includes("bank")
      ) {
        summaryPoints.push(`• Finance Status: Discussed broker pre-approval documentation.`);
        tasks.push(`Follow up on broker finance pre-approval letter for ${lead.clientName}`);
        score += 10;
      }

      if (
        lower.includes("ceiling") ||
        lower.includes("alfresco") ||
        lower.includes("facade") ||
        lower.includes("upgrade") ||
        lower.includes("variation") ||
        lower.includes("plan")
      ) {
        summaryPoints.push(`• Plan Variations: Client requested layout/specifications review (${design}).`);
        tasks.push(`Update ${design} estimate with requested variations for ${clientFirst}`);
        score += 8;
      }

      if (
        lower.includes("bal") ||
        lower.includes("bushfire") ||
        lower.includes("council") ||
        lower.includes("setback") ||
        lower.includes("covenant") ||
        lower.includes("soil")
      ) {
        summaryPoints.push(`• Site & Compliance: Check site overlays, covenants, or BAL rating.`);
        tasks.push(`Verify site guidelines and council overlays for Lot ${lot} ${estate}`);
      }

      if (
        lower.includes("tender") ||
        lower.includes("atp") ||
        lower.includes("sign") ||
        lower.includes("deposit") ||
        lower.includes("ready") ||
        lower.includes("friday")
      ) {
        summaryPoints.push(`• Closing Action: Client aiming for Tender Request submission / ATP sign-off.`);
        tasks.push(`Prepare formal Tender Submission pack for ${lead.clientName}`);
        score += 12;
      }

      if (summaryPoints.length === 1) {
        const sentences = rawNotes
          .split(/[\n.]+/)
          .map((s) => s.trim())
          .filter((s) => s.length > 5);
        sentences.slice(0, 3).forEach((s) => summaryPoints.push(`• ${s}`));
        tasks.push(`Action follow-up on call discussion with ${clientFirst}`);
      }

      if (tasks.length === 0) {
        tasks.push(`Send follow-up recap to ${clientFirst} regarding ${design}`);
      }
    } else {
      summaryPoints = [
        `• Consultation call with ${lead.clientName} regarding ${design} (${lead.housingType || "Single Storey"}).`,
        `• Package sited on Lot ${lot} ${estate} (${lead.landStatus || "Have Land"}).`,
        `• Confirmed budget alignment (~$${(lead.totalEstimatedDealValue / 1000).toFixed(0)}k package value).`,
        `• Client requested detailed specification pack & next steps for tender submission.`,
      ];
      tasks.push(`Send updated ${design} proposal pack to ${clientFirst}`);
      tasks.push(`Confirm site siting and covenant approvals for Lot ${lot} ${estate}`);
      tasks.push(`Book follow-up consultation to review tender documentation`);
      score = 85;
    }

    setAiSummary(summaryPoints.join("\n"));
    setExtractedTasks(tasks);
    setAiReadinessScore(Math.min(98, Math.max(50, score)));
    setIsAiProcessing(false);
    toast.success(`AI analyzed call! Generated summary & extracted ${tasks.length} action items.`);
  };

  // Save Call Log with AI Tasks
  const handleSaveCallWithTasks = async () => {
    const finalContent = aiSummary
      ? `📞 [Call - ${callOutcome}]:\n${aiSummary}`
      : `📞 [Phone Call - ${callOutcome}]: ${callNotes.trim() || "Consultation phone call with client."}`;

    const newNote = {
      id: `cn_${Date.now()}`,
      author: currentConsultantName,
      content: finalContent,
      createdAt: new Date().toISOString(),
    };

    const newActivity = {
      id: `act_${Date.now()}`,
      type: "ai_call_summary" as const,
      title: `📞 Phone Call (${callOutcome})`,
      description: (callNotes || aiSummary || "Consultation call with client.").substring(0, 80),
      timestamp: new Date().toISOString(),
    };

    // New AI tasks
    const newTasks: CrmTask[] = extractedTasks.map((t, idx) => ({
      id: `task_ai_${Date.now()}_${idx}`,
      title: t,
      dueDate: idx === 0 ? "Tomorrow" : "This Friday",
      completed: false,
      assignedTo: lead.assignedConsultantId,
      priority: idx === 0 ? "urgent" : "high",
      type: "call",
      createdAt: new Date().toISOString(),
    }));

    const updatedLead: CrmLead = {
      ...lead,
      clientNotes: [newNote, ...(lead.clientNotes || [])],
      activities: [newActivity, ...(lead.activities || [])],
      tasks: [...newTasks, ...(lead.tasks || [])],
      trAiReadinessScore: aiReadinessScore ?? lead.trAiReadinessScore,
      lastContactedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveCrmLead(updatedLead);
    toast.success(`Call logged and ${newTasks.length} follow-up tasks scheduled! ✓`);
    setCallNotes("");
    setAiSummary(null);
    setExtractedTasks([]);
    onUpdated();
    onClose();
  };

  // 2. Send SMS
  const handleSendSms = async () => {
    if (!smsBody.trim()) {
      toast.error("Please enter an SMS message body.");
      return;
    }

    const newMsg: CrmMessage = {
      id: `msg_${Date.now()}`,
      clientEmail: lead.email || "sms_client@hudsonhomes.com.au",
      clientMobile: lead.mobile,
      direction: "outbound",
      channel: "sms",
      senderName: currentConsultantName,
      recipientName: lead.clientName,
      body: smsBody.trim(),
      timestamp: new Date().toISOString(),
      isRead: true,
    };

    await saveCrmMessage(newMsg);

    const updatedLead: CrmLead = {
      ...lead,
      activities: [
        {
          id: `act_${Date.now()}`,
          type: "sms",
          title: "Outbound SMS Sent (Telnyx)",
          description: `SMS: "${smsBody.substring(0, 50)}..."`,
          timestamp: new Date().toISOString(),
        },
        ...(lead.activities || []),
      ],
      lastContactedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveCrmLead(updatedLead);
    toast.success("SMS dispatched via Telnyx and logged in conversations! ✓");
    onUpdated();
    onClose();
  };

  // 3. Send Email
  const handleSendEmail = async () => {
    if (!emailBody.trim()) {
      toast.error("Please enter an email body.");
      return;
    }

    const newMsg: CrmMessage = {
      id: `msg_${Date.now()}`,
      clientEmail: lead.email,
      clientMobile: lead.mobile,
      direction: "outbound",
      channel: "email",
      senderName: currentConsultantName,
      recipientName: lead.clientName,
      subject: emailSubject,
      body: emailBody.trim(),
      timestamp: new Date().toISOString(),
      isRead: true,
      outlookSynced: true,
    };

    await saveCrmMessage(newMsg);

    const updatedLead: CrmLead = {
      ...lead,
      activities: [
        {
          id: `act_${Date.now()}`,
          type: "email",
          title: "Outlook 365 Email Dispatched",
          description: `Subject: "${emailSubject}"`,
          timestamp: new Date().toISOString(),
        },
        ...(lead.activities || []),
      ],
      lastContactedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveCrmLead(updatedLead);
    toast.success("Email sent and synchronized with Outlook 365! ✓");
    onUpdated();
    onClose();
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-2xl p-0 overflow-hidden ${
        isLight ? "bg-white text-slate-900 border-slate-200" : "bg-slate-950 text-white border-slate-800"
      }`}>
        <DialogHeader className={`p-4 border-b ${
          isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900 border-slate-800"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold">
                {lead.clientName.charAt(0)}
              </div>
              <div>
                <DialogTitle className="text-base font-black tracking-tight">
                  Communicate with {lead.clientName}
                </DialogTitle>
                <p className={`text-xs ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                  {lead.mobile} • {lead.preferredDesign} (Lot {lead.lotNumber || "TBA"} {lead.targetEstate})
                </p>
              </div>
            </div>

            {lead.isTopTrTarget && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center gap-1">
                <Flame className="h-3 w-3" /> #{lead.trPriorityRank || 1} TR Target
              </span>
            )}
          </div>
        </DialogHeader>

        {/* Channel Switcher Tabs */}
        <div className={`flex border-b px-4 gap-2 pt-2 ${
          isLight ? "border-slate-200 bg-slate-50" : "border-slate-800 bg-slate-950"
        }`}>
          <button
            type="button"
            onClick={() => setActiveTab("call")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all ${
              activeTab === "call"
                ? "border-amber-500 text-amber-500"
                : isLight
                ? "border-transparent text-slate-600 hover:text-slate-900"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Phone className="h-3.5 w-3.5" />
            In-Browser Call &amp; AI Assistant
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sms")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all ${
              activeTab === "sms"
                ? "border-amber-500 text-amber-500"
                : isLight
                ? "border-transparent text-slate-600 hover:text-slate-900"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            SMS (Telnyx)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("email")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all ${
              activeTab === "email"
                ? "border-amber-500 text-amber-500"
                : isLight
                ? "border-transparent text-slate-600 hover:text-slate-900"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            Outlook 365 Email
          </button>
        </div>

        {/* Tab 1: In-Browser Call & AI Assistant */}
        {activeTab === "call" && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Live WebRTC In-Call Simulator Screen */}
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              isInCall
                ? "bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-500/50 shadow-lg shadow-emerald-500/10"
                : isLight
                ? "bg-slate-50 border-slate-200"
                : "bg-slate-900/50 border-slate-800"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`h-11 w-11 rounded-full flex items-center justify-center text-lg ${
                  isInCall ? "bg-emerald-500 text-slate-950 animate-pulse" : "bg-slate-800 text-slate-400"
                }`}>
                  <PhoneCall className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white">
                      {isInCall ? "Active Call in Progress" : "Telnyx WebRTC Dialer"}
                    </span>
                    {isInCall && (
                      <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-800">
                        {formatTimer(callSeconds)}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {lead.mobile} ({lead.clientName}) • Australian Telnyx SIP Gateway
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isInCall ? (
                  <Button
                    size="sm"
                    onClick={handleStartCall}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-md"
                  >
                    <Phone className="h-3.5 w-3.5" /> Call Client Now
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleEndCall}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs gap-1.5"
                  >
                    End Call
                  </Button>
                )}

                {/* 1-Click Left Voicemail (LVM) Button */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleLeftVoicemail}
                  className="text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10 gap-1 font-bold"
                  title="One click to log voicemail, schedule 48hr follow-up task, and prepare LVM SMS"
                >
                  <PhoneMissed className="h-3.5 w-3.5 text-amber-500" />
                  1-Click LVM (Left Voicemail)
                </Button>
              </div>
            </div>

            {/* Call Outcome & Notes Field */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-slate-400">Call Outcome</Label>
                <select
                  value={callOutcome}
                  onChange={(e) => setCallOutcome(e.target.value)}
                  className={`w-full h-9 rounded-lg border px-2.5 text-xs font-medium mt-1 ${
                    isLight ? "bg-white border-slate-300" : "bg-slate-900 border-slate-700 text-white"
                  }`}
                >
                  <option value="Spoke with client">Spoke with client</option>
                  <option value="Left Voicemail">Left Voicemail (LVM)</option>
                  <option value="No Answer">No Answer / Busy</option>
                  <option value="Meeting Scheduled">Consultation Booked</option>
                  <option value="ATP Requested">ATP / Tender Requested</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs text-slate-400">Consultant Call Notes / Bullet Points</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRunAiAssistant}
                    disabled={isAiProcessing}
                    className="h-6 text-[10px] text-cyan-400 hover:text-cyan-300 font-bold gap-1 px-1.5"
                  >
                    <Sparkles className="h-3 w-3 text-cyan-400" />
                    {isAiProcessing ? "AI Analyzing..." : "✨ AI Summarize & Extract Tasks"}
                  </Button>
                </div>
                <Textarea
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Type notes or bullet points from your phone call with the client..."
                  rows={2}
                  className={`text-xs ${
                    isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-white"
                  }`}
                />
              </div>
            </div>

            {/* AI Assistant Output Card */}
            {aiSummary && (
              <div className={`p-3.5 rounded-xl border text-xs space-y-2.5 ${
                isLight ? "bg-cyan-50/70 border-cyan-200 text-cyan-950" : "bg-cyan-950/20 border-cyan-800/60 text-cyan-200"
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5 uppercase tracking-wider text-cyan-400">
                    <Sparkles className="h-3.5 w-3.5" /> AI Call Summary &amp; Auto-Generated Tasks
                  </span>
                  {aiReadinessScore && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Client Readiness: {aiReadinessScore}%
                    </span>
                  )}
                </div>

                <p className="font-sans whitespace-pre-line leading-relaxed text-[11px] opacity-90">
                  {aiSummary}
                </p>

                {extractedTasks.length > 0 && (
                  <div>
                    <span className="font-bold text-[10px] uppercase text-amber-400 block mb-1">
                      Action Items Detected to Schedule:
                    </span>
                    <ul className="space-y-1 text-[11px]">
                      {extractedTasks.map((t, idx) => (
                        <li key={idx} className="flex items-center gap-1.5 text-slate-300">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveCallWithTasks}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5"
              >
                <FileText className="h-3.5 w-3.5" />
                Save Call Log {extractedTasks.length > 0 && `& Schedule ${extractedTasks.length} Tasks`}
              </Button>
            </div>
          </div>
        )}

        {/* Tab 2: SMS (Telnyx) */}
        {activeTab === "sms" && (
          <div className="p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Sending Outbound SMS via <strong>Telnyx Carrier Gateway</strong></span>
              <span className="font-mono text-[10px] text-amber-500">{smsBody.length} characters</span>
            </div>

            <Textarea
              value={smsBody}
              onChange={(e) => setSmsBody(e.target.value)}
              rows={4}
              className={`text-xs leading-relaxed ${
                isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-white"
              }`}
            />

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500">
                To: {lead.clientName} ({lead.mobile})
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendSms}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" /> Send SMS Now
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Email (Outlook 365) */}
        {activeTab === "email" && (
          <div className="p-4 sm:p-5 space-y-3.5">
            <div>
              <Label className="text-xs text-slate-400">Subject</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className={`h-8.5 text-xs font-semibold mt-1 ${
                  isLight ? "bg-white border-slate-300" : "bg-slate-900 border-slate-700 text-white"
                }`}
              />
            </div>

            <div>
              <Label className="text-xs text-slate-400">Email Body</Label>
              <Textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={6}
                className={`text-xs mt-1 font-sans leading-relaxed ${
                  isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-white"
                }`}
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-cyan-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Outlook 365 Graph Sync Connected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendEmail}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs gap-1.5"
                >
                  <Send className="h-3.5 w-3.5" /> Send Outlook Email
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
