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
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CrmLead, CrmMessage } from "@/lib/crm/crmTypes";
import { saveCrmLead, saveCrmMessage } from "@/lib/crm/crmStorage";
import { toast } from "sonner";

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
  const [activeTab, setActiveTab] = useState<"call" | "sms" | "email">(initialChannel);

  useEffect(() => {
    if (initialChannel) setActiveTab(initialChannel);
  }, [initialChannel]);

  // Call Logger State
  const [callOutcome, setCallOutcome] = useState("Spoke with client");
  const [callNotes, setCallNotes] = useState("");

  // SMS State
  const [smsBody, setSmsBody] = useState("");

  // Email State
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

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

  // 1. Dial Trigger & Log Call
  const handleDialNumber = () => {
    if (!lead.mobile) {
      toast.error("No phone number found for this client.");
      return;
    }
    window.open(`tel:${lead.mobile}`, "_self");
    toast.info(`Dialing ${lead.mobile}...`);
  };

  const handleSaveCallLog = async () => {
    const newNote = {
      id: `cn_${Date.now()}`,
      author: "Morgan Hales",
      content: `📞 [Phone Call - ${callOutcome}]: ${callNotes.trim() || "Routine client catch-up call."}`,
      createdAt: new Date().toISOString(),
    };

    const newActivity = {
      id: `act_${Date.now()}`,
      type: "sms" as const,
      title: `Phone Call: ${callOutcome}`,
      description: callNotes.trim() || "Consultation phone call with client.",
      timestamp: new Date().toISOString(),
    };

    const updatedLead: CrmLead = {
      ...lead,
      clientNotes: [newNote, ...(lead.clientNotes || [])],
      activities: [newActivity, ...(lead.activities || [])],
      lastContactedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveCrmLead(updatedLead);
    toast.success("Phone call logged into client record! ✓");
    setCallNotes("");
    onUpdated();
    onClose();
  };

  // 2. Send SMS
  const handleSendSms = async () => {
    if (!smsBody.trim()) {
      toast.error("Please enter an SMS message body.");
      return;
    }

    // Trigger native free SMS on mobile / Mac / PC
    const encoded = encodeURIComponent(smsBody);
    window.open(`sms:${lead.mobile}?body=${encoded}`, "_self");

    // Save in CRM Conversations thread
    const newMsg: CrmMessage = {
      id: `msg_${Date.now()}`,
      clientEmail: lead.email || "sms_client@hudsonhomes.com.au",
      clientMobile: lead.mobile,
      direction: "outbound",
      channel: "sms",
      senderName: "Morgan Hales",
      recipientName: lead.clientName,
      body: smsBody.trim(),
      timestamp: new Date().toISOString(),
      isRead: true,
    };

    await saveCrmMessage(newMsg);

    // Update lead activity
    const updatedLead: CrmLead = {
      ...lead,
      activities: [
        {
          id: `act_${Date.now()}`,
          type: "sms",
          title: "Outbound SMS Sent",
          description: `SMS: "${smsBody.substring(0, 50)}..."`,
          timestamp: new Date().toISOString(),
        },
        ...(lead.activities || []),
      ],
      lastContactedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveCrmLead(updatedLead);
    toast.success("SMS dispatched and logged to conversation history! ✓");
    onUpdated();
    onClose();
  };

  // 3. Send Email
  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      toast.error("Please enter both email subject and body.");
      return;
    }

    // Trigger Outlook / mailto
    const mailtoUrl = `mailto:${lead.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailtoUrl, "_self");

    // Save in CRM Conversations thread
    const newMsg: CrmMessage = {
      id: `msg_${Date.now()}`,
      clientEmail: lead.email,
      clientMobile: lead.mobile,
      direction: "outbound",
      channel: "email",
      senderName: "Morgan Hales",
      recipientName: lead.clientName,
      subject: emailSubject.trim(),
      body: emailBody.trim(),
      timestamp: new Date().toISOString(),
      isRead: true,
      outlookSynced: true,
    };

    await saveCrmMessage(newMsg);

    // Update lead activity
    const updatedLead: CrmLead = {
      ...lead,
      activities: [
        {
          id: `act_${Date.now()}`,
          type: "email",
          title: `Email: ${emailSubject.substring(0, 40)}`,
          description: "Outbound email sent via Outlook integration.",
          timestamp: new Date().toISOString(),
        },
        ...(lead.activities || []),
      ],
      lastContactedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveCrmLead(updatedLead);
    toast.success("Email drafted in Outlook & synced to CRM timeline! ✓");
    onUpdated();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        className="w-[95vw] max-w-lg max-h-[92vh] p-0 flex flex-col bg-slate-950 text-slate-100 border border-slate-800 shadow-2xl overflow-hidden rounded-2xl"
      >
        {/* Header */}
        <DialogHeader className="p-4 border-b border-slate-800 bg-slate-900/80 flex-none">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <User className="h-5 w-5 text-amber-400" />
              Quick Action &bull; {lead.clientName}
            </DialogTitle>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {lead.mobile || "No Mobile"} &bull; {lead.email || "No Email"} &bull; {lead.targetEstate}
          </p>

          {/* Channels Selector */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 mt-3">
            {[
              { id: "call", label: "Phone Call", icon: <Phone className="h-3.5 w-3.5" /> },
              { id: "sms", label: "Instant SMS", icon: <MessageSquare className="h-3.5 w-3.5" /> },
              { id: "email", label: "Outlook Email", icon: <Mail className="h-3.5 w-3.5" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: PHONE CALL */}
          {activeTab === "call" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-white block">
                    Direct Client Dial
                  </span>
                  <span className="font-mono text-sm text-emerald-400 font-extrabold">
                    {lead.mobile || "No Mobile on File"}
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={handleDialNumber}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs gap-1.5 shadow-md shadow-emerald-500/20"
                >
                  <PhoneCall className="h-3.5 w-3.5" />
                  Dial Now
                </Button>
              </div>

              <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                <Label className="text-xs font-bold text-slate-200">Log Call Outcome &amp; Notes</Label>
                
                <div className="grid grid-cols-2 gap-2">
                  {["Spoke with client", "Left voicemail", "No answer", "Follow-up required"].map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setCallOutcome(o)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all text-left truncate ${
                        callOutcome === o
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>

                <Textarea
                  rows={3}
                  value={callNotes}
                  onChange={(e) => setCallNotes(e.target.value)}
                  placeholder="Enter key notes from the call (e.g. loves the layout, waiting on soil test result)..."
                  className="text-xs border-slate-800 bg-slate-950 text-slate-200 resize-none"
                />

                <Button
                  onClick={handleSaveCallLog}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5"
                >
                  <Check className="h-4 w-4" /> Save Call Log to Client Record
                </Button>
              </div>
            </div>
          )}

          {/* TAB 2: INSTANT SMS */}
          {activeTab === "sms" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>To: <strong className="text-white font-mono">{lead.mobile}</strong></span>
                <span className="text-[11px] text-amber-400">Free Native Relay</span>
              </div>

              {/* Quick Template Chips */}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {[
                  { label: "Estimate Ready", text: `Hi ${firstName}, your Hudson Builders Estimate is ready to review: https://hudsonhomes.com.au/quote` },
                  { label: "Siting Plan", text: `Hi ${firstName}, we completed your 1:200 Siting Blueprint for Lot ${lead.lotNumber}. Let me know when suits to chat!` },
                  { label: "Check-in", text: `Hi ${firstName}, Morgan here from Hudson Homes checking in on your new build plans!` },
                ].map((t, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSmsBody(t.text)}
                    className="text-[10px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 px-2 py-1 rounded-md shrink-0 font-medium"
                  >
                    + {t.label}
                  </button>
                ))}
              </div>

              <Textarea
                rows={4}
                value={smsBody}
                onChange={(e) => setSmsBody(e.target.value)}
                placeholder="Type SMS message..."
                className="text-xs border-slate-800 bg-slate-950 text-slate-100 resize-none"
              />

              <Button
                onClick={handleSendSms}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs gap-1.5 shadow-md"
              >
                <Send className="h-3.5 w-3.5" /> Dispatch SMS &amp; Save to Thread
              </Button>
            </div>
          )}

          {/* TAB 3: OUTLOOK EMAIL */}
          {activeTab === "email" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-400">Subject</Label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="h-8.5 text-xs border-slate-800 bg-slate-950 text-white font-medium"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-slate-400">Email Message</Label>
                <Textarea
                  rows={6}
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="text-xs font-sans border-slate-800 bg-slate-950 text-slate-100 resize-none"
                />
              </div>

              <Button
                onClick={handleSendEmail}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs gap-1.5 shadow-md"
              >
                <Mail className="h-3.5 w-3.5" /> Open in Outlook &amp; Sync to CRM
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
