import { useState } from "react";
import {
  X,
  Mail,
  MessageSquare,
  Phone,
  Copy,
  Check,
  Send,
  ExternalLink,
  ShieldCheck,
  Clock,
  UserCheck,
} from "lucide-react";
import { type LandParcel, type AvailabilityStatus } from "@/lib/land-scout/landScoutTypes";
import { generateAgentOutreachMessage } from "@/lib/land-scout/landScoutAiMatching";
import { logAgentOutreach } from "@/lib/land-scout/landScoutStorage";
import { getActiveStaffUser } from "@/lib/authSession";
import { toast } from "sonner";

interface AgentOutreachModalProps {
  parcel: LandParcel | null;
  onClose: () => void;
  onOutreachLogged?: (updated: LandParcel) => void;
}

export function AgentOutreachModal({
  parcel,
  onClose,
  onOutreachLogged,
}: AgentOutreachModalProps) {
  if (!parcel) return null;

  const staff = getActiveStaffUser();
  const consultantName = staff?.name || "Morgan Hales";
  const consultantPhone = staff?.phone || "0417 571 864";
  const consultantEmail = staff?.email || "morgan.hales@hudsonhomes.com.au";

  const [channel, setChannel] = useState<"email" | "sms" | "phone">("email");
  const [inquiryType, setInquiryType] = useState<
    "availability_check" | "builder_hold" | "disclosure_plan_request" | "price_negotiation"
  >("availability_check");

  const [copied, setCopied] = useState(false);

  // Generate real-time message based on selection
  const { subject, message } = generateAgentOutreachMessage({
    parcel,
    consultantName,
    consultantPhone,
    consultantEmail,
    channel,
    inquiryType,
  });

  const handleCopy = () => {
    const textToCopy = channel === "email" && subject ? `Subject: ${subject}\n\n${message}` : message;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success("Message copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenMailClient = () => {
    const mailtoUrl = `mailto:${encodeURIComponent(parcel.agentEmail)}?subject=${encodeURIComponent(
      subject || ""
    )}&body=${encodeURIComponent(message)}`;
    window.open(mailtoUrl, "_blank");
    handleLogOutreach("sent");
  };

  const handleOpenSms = () => {
    const smsUrl = `sms:${parcel.agentPhone.replace(/\s+/g, "")}?body=${encodeURIComponent(message)}`;
    window.open(smsUrl, "_blank");
    handleLogOutreach("sent");
  };

  const handleLogOutreach = (newStatus: "sent" | "confirmed_available") => {
    const updated = logAgentOutreach(parcel.id, {
      consultantName,
      channel,
      inquiryType,
      notes: `${inquiryType.replace(/_/g, " ").toUpperCase()} initiated via ${channel.toUpperCase()} to ${parcel.agentName} (${parcel.agentEmail || parcel.agentPhone}).`,
      status: newStatus,
    });

    if (updated) {
      toast.success(
        newStatus === "confirmed_available"
          ? "Parcel marked as Verified Available!"
          : "Outreach logged in Land Scout history!"
      );
      if (onOutreachLogged) onOutreachLogged(updated);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-slate-900 border border-brand-gold/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Contact Listing Agent · AI Outreach Engine
              </h2>
              <p className="text-xs text-slate-400">
                Lot {parcel.lotNumber} {parcel.estate ? `(${parcel.estate})` : ""} · {parcel.suburb}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Agent Info Strip */}
        <div className="px-5 py-3 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-amber-300">
              {parcel.agentName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <span className="font-bold text-white block">{parcel.agentName}</span>
              <span className="text-[11px] text-slate-400">{parcel.agentAgency}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-slate-300 font-mono text-[11px]">
            <a
              href={`tel:${parcel.agentPhone}`}
              className="flex items-center gap-1 hover:text-amber-300 transition-colors"
            >
              <Phone className="h-3.5 w-3.5 text-amber-400" />
              <span>{parcel.agentPhone}</span>
            </a>
            <a
              href={`mailto:${parcel.agentEmail}`}
              className="flex items-center gap-1 hover:text-amber-300 transition-colors"
            >
              <Mail className="h-3.5 w-3.5 text-cyan-400" />
              <span>{parcel.agentEmail}</span>
            </a>
          </div>
        </div>

        {/* Modal Controls */}
        <div className="p-5 space-y-4 flex-1 overflow-y-auto max-h-[60vh] custom-scrollbar">
          {/* Channel Tabs */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex rounded-xl border border-slate-800 bg-slate-950 p-1">
              <button
                type="button"
                onClick={() => setChannel("email")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  channel === "email"
                    ? "bg-amber-500/20 text-brand-gold border border-brand-gold/40 shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Mail className="h-3.5 w-3.5" />
                Email Builder Enquiry
              </button>
              <button
                type="button"
                onClick={() => setChannel("sms")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  channel === "sms"
                    ? "bg-amber-500/20 text-brand-gold border border-brand-gold/40 shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Direct Mobile SMS
              </button>
              <button
                type="button"
                onClick={() => setChannel("phone")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  channel === "phone"
                    ? "bg-amber-500/20 text-brand-gold border border-brand-gold/40 shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Phone className="h-3.5 w-3.5" />
                Phone Call Script
              </button>
            </div>

            {/* Outreach Objective */}
            <select
              value={inquiryType}
              onChange={(e) => setInquiryType(e.target.value as any)}
              className="h-8 rounded-lg border border-slate-800 bg-slate-950 px-2.5 text-xs text-slate-200 font-medium focus:outline-hidden focus:border-brand-gold"
            >
              <option value="availability_check">Check Availability</option>
              <option value="builder_hold">Request 7-Day Hold</option>
              <option value="disclosure_plan_request">Request Disclosure Plan</option>
              <option value="price_negotiation">Negotiate Builder Rebate</option>
            </select>
          </div>

          {/* Email Subject Line (if email mode) */}
          {channel === "email" && subject && (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Subject Line</label>
              <input
                readOnly
                value={subject}
                className="w-full h-8 px-3 rounded-lg border border-slate-800 bg-slate-950/70 text-xs text-white font-medium focus:outline-hidden"
              />
            </div>
          )}

          {/* Message Preview Box */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-400">
                Generated Outreach Message
              </label>
              <span className="text-[10px] text-slate-500">
                Formatted as Hudson NHC ({consultantName})
              </span>
            </div>
            <textarea
              readOnly
              rows={8}
              value={message}
              className="w-full p-3.5 rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs text-slate-200 leading-relaxed focus:outline-hidden selection:bg-brand-gold/30 custom-scrollbar"
            />
          </div>

          {/* Outreach History on this Parcel */}
          {parcel.outreachHistory && parcel.outreachHistory.length > 0 && (
            <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-950/50 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                <Clock className="h-3 w-3 text-amber-400" />
                <span>Outreach Log ({parcel.outreachHistory.length})</span>
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar text-[10px]">
                {parcel.outreachHistory.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-slate-400 border-b border-slate-800/60 pb-1">
                    <span>
                      <strong className="text-slate-300">{new Date(item.timestamp).toLocaleDateString("en-AU")}:</strong>{" "}
                      {item.notes}
                    </span>
                    <span className="text-brand-gold font-mono uppercase">{item.channel}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900 text-xs font-semibold text-slate-300 hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? "Copied!" : "Copy Text"}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleLogOutreach("confirmed_available")}
              className="px-3.5 py-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/20 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Agent confirmed lot is live"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Mark Verified Live</span>
            </button>

            {channel === "email" && (
              <button
                type="button"
                onClick={handleOpenMailClient}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-brand-gold text-slate-950 text-xs font-bold hover:from-amber-400 hover:to-amber-300 shadow-md shadow-brand-gold/20 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Mail className="h-4 w-4" />
                <span>Open in Email App &amp; Log</span>
              </button>
            )}

            {channel === "sms" && (
              <button
                type="button"
                onClick={handleOpenSms}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-bold hover:from-emerald-400 hover:to-teal-400 shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Send SMS to Agent</span>
              </button>
            )}

            {channel === "phone" && (
              <a
                href={`tel:${parcel.agentPhone}`}
                onClick={() => handleLogOutreach("sent")}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 text-xs font-bold hover:from-cyan-400 hover:to-blue-400 shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Phone className="h-4 w-4" />
                <span>Dial {parcel.agentPhone}</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
