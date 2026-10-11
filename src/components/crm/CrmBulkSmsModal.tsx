import React, { useState, useMemo } from "react";
import {
  CrmLead,
  BulkSmsTemplate,
} from "@/lib/crm/crmTypes";
import {
  DEFAULT_BULK_SMS_TEMPLATES,
  sendBulkSms,
  loadTelnyxSettings,
} from "@/lib/crm/crmStorage";
import {
  MessageSquare,
  Send,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Search,
  Filter,
  Flame,
  PhoneCall,
  Settings,
  Layers,
  ChevronRight,
  Eye,
  Check,
  Smartphone,
  Radio,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme";
import { getActiveStaffUser } from "@/lib/authSession";

interface CrmBulkSmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  leads: CrmLead[];
  onSent: () => void;
  onOpenTelnyxSettings?: () => void;
}

export function CrmBulkSmsModal({
  isOpen,
  onClose,
  leads,
  onSent,
  onOpenTelnyxSettings,
}: CrmBulkSmsModalProps) {
  const { mode } = useTheme();
  const isLight = mode === "normal";

  const telnyxSettings = useMemo(() => loadTelnyxSettings(), [isOpen]);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(DEFAULT_BULK_SMS_TEMPLATES[0].id);
  const [smsBody, setSmsBody] = useState<string>(DEFAULT_BULK_SMS_TEMPLATES[0].body);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(() => {
    // Default select clients who have a mobile number
    return new Set(leads.filter((l) => !!l.mobile).slice(0, 5).map((l) => l.id));
  });

  const [recipientFilter, setRecipientFilter] = useState<string>("all_mobile");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState<{ current: number; total: number } | null>(null);

  // Template select change
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = DEFAULT_BULK_SMS_TEMPLATES.find((t) => t.id === templateId);
    if (tmpl) {
      setSmsBody(tmpl.body);
    }
  };

  // Insert dynamic tag into text
  const handleInsertTag = (tag: string) => {
    setSmsBody((prev) => prev + ` {${tag}}`);
  };

  // Filter recipient leads
  const eligibleLeads = useMemo(() => {
    return leads.filter((l) => {
      if (!l.mobile) return false;
      const matchesSearch =
        l.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.targetEstate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.preferredDesign.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (recipientFilter === "top_tr") return !!l.isTopTrTarget;
      if (recipientFilter === "registered_land") return l.landStatus === "Have Land (Registered)";
      if (recipientFilter === "looking_for_land") return l.landStatus === "Looking for Land";
      if (recipientFilter === "estimate_presented") return l.stage === "estimate_presented";
      return true;
    });
  }, [leads, searchTerm, recipientFilter]);

  const toggleLead = (leadId: string) => {
    const next = new Set(selectedLeadIds);
    if (next.has(leadId)) {
      next.delete(leadId);
    } else {
      next.add(leadId);
    }
    setSelectedLeadIds(next);
  };

  const handleSelectAllVisible = () => {
    const next = new Set(selectedLeadIds);
    eligibleLeads.forEach((l) => next.add(l.id));
    setSelectedLeadIds(next);
  };

  const handleDeselectAllVisible = () => {
    const next = new Set(selectedLeadIds);
    eligibleLeads.forEach((l) => next.delete(l.id));
    setSelectedLeadIds(next);
  };

  // GSM Character and Parts count calculation
  const charCount = smsBody.length;
  const smsParts = Math.max(1, Math.ceil(charCount / 160));

  // First selected recipient preview
  const firstSelectedLead = useMemo(() => {
    return leads.find((l) => selectedLeadIds.has(l.id)) || leads[0];
  }, [leads, selectedLeadIds]);

  const staffUser = getActiveStaffUser();
  const currentConsultantName = staffUser?.name || "Morgan Hales";

  const previewBody = useMemo(() => {
    if (!firstSelectedLead) return smsBody;
    const firstName = firstSelectedLead.clientName.split(" ")[0];
    const budgetStr = firstSelectedLead.totalEstimatedDealValue
      ? `$${(firstSelectedLead.totalEstimatedDealValue / 1000).toFixed(0)}k`
      : "$450k";

    return smsBody
      .replace(/{firstName}/g, firstName)
      .replace(/{clientName}/g, firstSelectedLead.clientName)
      .replace(/{estate}/g, firstSelectedLead.targetEstate || "Flagstone")
      .replace(/{lotNumber}/g, firstSelectedLead.lotNumber || "1042")
      .replace(/{design}/g, firstSelectedLead.preferredDesign || "Aspen 25")
      .replace(/{consultantName}/g, currentConsultantName)
      .replace(/{landStatus}/g, firstSelectedLead.landStatus || "Looking for Land")
      .replace(/{packageBudget}/g, budgetStr)
      .replace(/{dealValue}/g, budgetStr)
      .replace(/{suburb}/g, firstSelectedLead.suburb || "Flagstone")
      .replace(/{housingType}/g, firstSelectedLead.housingType || "Single Storey");
  }, [smsBody, firstSelectedLead, currentConsultantName]);

  // Execute Dispatch
  const handleDispatchBulkSms = async () => {
    if (selectedLeadIds.size === 0) {
      toast.error("Please select at least one recipient client.");
      return;
    }
    if (!smsBody.trim()) {
      toast.error("SMS message content cannot be empty.");
      return;
    }

    setIsSending(true);
    const ids = Array.from(selectedLeadIds);
    setSendProgress({ current: 0, total: ids.length });

    try {
      // Simulate real-time progress steps for polished feel
      for (let i = 1; i <= ids.length; i++) {
        await new Promise((r) => setTimeout(r, 120));
        setSendProgress({ current: i, total: ids.length });
      }

      const { sentCount, errors } = await sendBulkSms(ids, smsBody, currentConsultantName);

      if (sentCount > 0) {
        toast.success(`🚀 Bulk SMS successfully sent to ${sentCount} clients via Telnyx!`);
        onSent();
        onClose();
      } else {
        toast.error(`Failed to send SMS: ${errors.join(", ")}`);
      }
    } catch (err: any) {
      toast.error(`Error sending bulk SMS: ${err?.message || "Unknown error"}`);
    } finally {
      setIsSending(false);
      setSendProgress(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSending && !open && onClose()}>
      <DialogContent className={`max-w-4xl p-0 overflow-hidden ${
        isLight ? "bg-white text-slate-900 border-slate-200" : "bg-slate-950 text-white border-slate-800"
      }`}>
        <DialogHeader className={`p-4 sm:p-5 border-b ${
          isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900 border-slate-800"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-md">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-black tracking-tight flex items-center gap-2">
                  <span>Bulk SMS Marketing &amp; Tender Pusher</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <Radio className="h-2.5 w-2.5 animate-pulse text-emerald-400" />
                    Telnyx Ready
                  </span>
                </DialogTitle>
                <p className={`text-xs ${isLight ? "text-slate-600" : "text-slate-400"} mt-0.5`}>
                  Blast targeted SMS reminders, price protections, or tender invitations to filtered clients with dynamic personal tags.
                </p>
              </div>
            </div>

            {onOpenTelnyxSettings && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenTelnyxSettings}
                className="h-8 text-xs gap-1 border-slate-700 text-slate-300 hover:text-white"
              >
                <Settings className="h-3 w-3 text-amber-400" />
                Telnyx Settings
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* 2-Column Layout: Left Recipient Selector (5 cols), Right Composer (7 cols) */}
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[500px]">
          {/* Left Column: Recipients Selection */}
          <div className={`md:col-span-5 border-r p-4 flex flex-col ${
            isLight ? "border-slate-200 bg-slate-50/50" : "border-slate-800 bg-slate-900/30"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> Select Recipients
              </span>
              <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                {selectedLeadIds.size} Selected
              </span>
            </div>

            {/* Quick Filters */}
            <div className="space-y-2 mb-3">
              <select
                value={recipientFilter}
                onChange={(e) => setRecipientFilter(e.target.value)}
                className={`w-full h-8 text-xs rounded-lg border px-2.5 ${
                  isLight ? "bg-white border-slate-300 text-slate-800" : "bg-slate-950 border-slate-700 text-slate-200"
                }`}
              >
                <option value="all_mobile">All Clients with Mobile ({leads.filter((l) => !!l.mobile).length})</option>
                <option value="top_tr">🔥 Top 10 TR Targets Only ({leads.filter((l) => l.isTopTrTarget).length})</option>
                <option value="estimate_presented">Estimate Presented Stage ({leads.filter((l) => l.stage === "estimate_presented").length})</option>
                <option value="registered_land">Have Registered Land ({leads.filter((l) => l.landStatus === "Have Land (Registered)").length})</option>
                <option value="looking_for_land">Looking for Land ({leads.filter((l) => l.landStatus === "Looking for Land").length})</option>
              </select>

              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search candidate clients..."
                  className={`h-8 pl-8 text-xs ${
                    isLight ? "bg-white border-slate-300" : "bg-slate-950 border-slate-700"
                  }`}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] pt-1">
                <button
                  type="button"
                  onClick={handleSelectAllVisible}
                  className="text-amber-600 dark:text-amber-400 hover:underline font-semibold"
                >
                  Select All Visible ({eligibleLeads.length})
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllVisible}
                  className="text-slate-400 hover:underline"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            {/* Recipients Checklist */}
            <div className="flex-1 overflow-y-auto max-h-[340px] space-y-1.5 pr-1">
              {eligibleLeads.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No matching clients with mobile numbers found.</p>
              ) : (
                eligibleLeads.map((lead) => {
                  const isChecked = selectedLeadIds.has(lead.id);
                  return (
                    <div
                      key={lead.id}
                      onClick={() => toggleLead(lead.id)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                        isChecked
                          ? isLight
                            ? "bg-amber-50 border-amber-300 text-slate-900"
                            : "bg-amber-950/30 border-amber-500/50 text-white"
                          : isLight
                          ? "bg-white border-slate-200 hover:border-slate-300 text-slate-700"
                          : "bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by parent div
                          className="h-3.5 w-3.5 rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                        />
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold truncate">{lead.clientName}</span>
                            {lead.isTopTrTarget && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                #{lead.trPriorityRank || 1} TR
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 block truncate">
                            {lead.mobile} • {lead.preferredDesign} ({lead.targetEstate})
                          </span>
                        </div>
                      </div>

                      <span className={`text-[10px] font-mono shrink-0 ${isChecked ? "text-amber-500 font-bold" : "text-slate-500"}`}>
                        ${(lead.totalEstimatedDealValue / 1000).toFixed(0)}k
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Template, Personalization Tags, Preview & Dispatch */}
          <div className="md:col-span-7 p-4 sm:p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              {/* Template Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Choose SMS Campaign Template
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => handleSelectTemplate(e.target.value)}
                  className={`w-full h-9 text-xs rounded-lg border px-3 font-medium ${
                    isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-slate-100"
                  }`}
                >
                  {DEFAULT_BULK_SMS_TEMPLATES.map((tmpl) => (
                    <option key={tmpl.id} value={tmpl.id}>
                      {tmpl.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Insert Tags */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span className="font-semibold">Insert Dynamic Personalization Tags:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { tag: "firstName", label: "+ First Name" },
                    { tag: "estate", label: "+ Estate" },
                    { tag: "lotNumber", label: "+ Lot #" },
                    { tag: "design", label: "+ Home Design" },
                    { tag: "packageBudget", label: "+ Budget" },
                    { tag: "landStatus", label: "+ Land Status" },
                    { tag: "suburb", label: "+ Suburb" },
                    { tag: "consultantName", label: "+ My Name" },
                  ].map(({ tag, label }) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleInsertTag(tag)}
                      className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md border transition-all ${
                        isLight
                          ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800"
                          : "bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-amber-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Composer Area */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <label className="font-bold text-slate-400">Message Body</label>
                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    <span className={charCount > 160 ? "text-amber-500 font-bold" : "text-slate-400"}>
                      {charCount} chars
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className={`px-1.5 py-0.2 rounded border ${
                      smsParts > 1 ? "bg-amber-950/60 text-amber-300 border-amber-800" : "bg-slate-800 text-slate-300 border-slate-700"
                    }`}>
                      {smsParts} SMS {smsParts > 1 ? "Parts" : "Part"}
                    </span>
                  </div>
                </div>
                <Textarea
                  value={smsBody}
                  onChange={(e) => setSmsBody(e.target.value)}
                  rows={4}
                  className={`text-xs leading-relaxed ${
                    isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-slate-100"
                  }`}
                  placeholder="Type your SMS message or select a template above..."
                />
              </div>

              {/* Live Rendered Preview */}
              <div className={`p-3 rounded-xl border text-xs ${
                isLight ? "bg-amber-50/50 border-amber-200" : "bg-slate-900/60 border-slate-800"
              }`}>
                <div className="flex items-center justify-between text-[10px] font-bold text-amber-600 dark:text-amber-400 mb-1">
                  <span className="flex items-center gap-1 uppercase tracking-wider">
                    <Eye className="h-3 w-3" /> Live Recipient Preview
                  </span>
                  <span>To: {firstSelectedLead?.clientName || "Lachlan Murdoch"} ({firstSelectedLead?.mobile || "0412 884 921"})</span>
                </div>
                <p className={`p-2.5 rounded-lg border text-xs font-sans whitespace-pre-wrap leading-relaxed ${
                  isLight ? "bg-white border-slate-200 text-slate-800 shadow-xs" : "bg-slate-950/80 border-slate-800 text-emerald-300 font-mono text-[11px]"
                }`}>
                  {previewBody}
                </p>
              </div>
            </div>

            {/* Bottom Bar: Sender Info & Dispatch Action */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Radio className="h-3 w-3 text-emerald-400" />
                  Sender ID: <strong className="text-white">{telnyxSettings.fromPhoneNumber || "0488 888 123"} (Telnyx Carrier)</strong>
                </span>
                <span>Each message logged in client conversation thread</span>
              </div>

              {/* Progress bar during sending */}
              {isSending && sendProgress && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold text-amber-400">
                    <span>Dispatching Telnyx SMS packets...</span>
                    <span>{sendProgress.current} / {sendProgress.total}</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all duration-150"
                      style={{ width: `${(sendProgress.current / sendProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5">
                <Button variant="outline" size="sm" onClick={onClose} disabled={isSending}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleDispatchBulkSms}
                  disabled={isSending || selectedLeadIds.size === 0}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs gap-1.5 shadow-md shadow-amber-500/20 px-5"
                >
                  <Send className="h-3.5 w-3.5" />
                  {isSending ? "Dispatching..." : `Send Bulk SMS (${selectedLeadIds.size} Clients)`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
