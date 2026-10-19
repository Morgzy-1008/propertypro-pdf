import { useState, useMemo } from "react";
import {
  X,
  Share2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  QrCode as QrIcon,
  Sparkles,
  User,
  MapPin,
  Lock,
  Layers,
} from "lucide-react";
import { CONSULTANTS, type Consultant } from "@/components/flyer/consultants";
import { getActiveStaffUser } from "@/lib/authSession";
import { getActiveDivision } from "@/lib/divisionContext";
import { generateCustomerLink } from "@/lib/floorplan-library/customerLinkSecurity";
import { QrCode } from "@/components/flyer/QrCode";
import { toast } from "sonner";

interface ExportCustomerLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDesignName?: string;
  isLight: boolean;
}

export function ExportCustomerLinkModal({
  isOpen,
  onClose,
  activeDesignName,
  isLight,
}: ExportCustomerLinkModalProps) {
  if (!isOpen) return null;

  const staffUser = getActiveStaffUser();
  const defaultDivision =
    (staffUser?.division || staffUser?.state || getActiveDivision()) === "NSW" ? "NSW" : "QLD";

  // Find matching consultant for default
  const defaultConsultant =
    CONSULTANTS.find(
      (c) =>
        c.id.toLowerCase() === staffUser?.id?.toLowerCase() ||
        c.email.toLowerCase() === staffUser?.email?.toLowerCase() ||
        c.name.toLowerCase() === staffUser?.name?.toLowerCase()
    ) ||
    CONSULTANTS.find((c) => c.division === defaultDivision) ||
    CONSULTANTS[0];

  const [division, setDivision] = useState<"QLD" | "NSW">(defaultDivision);
  const [selectedConsultantId, setSelectedConsultantId] = useState<string>(
    defaultConsultant?.id || "morgan-hales"
  );
  const [includeSpecificDesign, setIncludeSpecificDesign] = useState<boolean>(false);
  const [showPricing, setShowPricing] = useState<boolean>(true);
  const [showQr, setShowQr] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [linkStyle, setLinkStyle] = useState<"clean" | "ultraShort" | "token">("clean");

  // Generate customer link options (Clean Short is primary default)
  const { cleanUrl, ultraShortUrl, tokenUrl } = useMemo(() => {
    return generateCustomerLink({
      division,
      consultantId: selectedConsultantId,
      preselectedDesign: includeSpecificDesign && activeDesignName ? activeDesignName : undefined,
      showPricing,
      expiresInDays: 90,
    });
  }, [division, selectedConsultantId, includeSpecificDesign, activeDesignName, showPricing]);

  const activeUrl = linkStyle === "clean" ? cleanUrl : linkStyle === "ultraShort" ? ultraShortUrl : tokenUrl;

  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(activeUrl);
      setCopied(true);
      toast.success("Shortened customer link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const handleOpenPreview = () => {
    window.open(activeUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
          isLight ? "bg-white border-slate-200 text-slate-900" : "bg-slate-900 border-slate-800 text-white"
        }`}
      >
        {/* Header */}
        <div className="p-5 border-b border-inherit flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight leading-tight flex items-center gap-2">
                Export Customer Link
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold font-mono">
                  Client Protected
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Share a private, client-safe interactive floorplan gallery
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isLight ? "hover:bg-slate-100 text-slate-500" : "hover:bg-slate-800 text-slate-400"
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-5">
          {/* Security Notice */}
          <div
            className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
              isLight ? "bg-emerald-50/70 border-emerald-200 text-emerald-950" : "bg-emerald-950/20 border-emerald-800/40 text-emerald-200"
            }`}
          >
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <strong>Private & Sandboxed:</strong> Clients who open this link can browse floorplans, explore facades, and submit enquiries, but are <strong>strictly restricted</strong> from navigating to the Hub, CRM, Quoting, Estimating, or any internal staff systems.
            </div>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Division Selector */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Target State / Division
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(["QLD", "NSW"] as const).map((div) => (
                  <button
                    key={div}
                    type="button"
                    onClick={() => setDivision(div)}
                    className={`py-2 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                      division === div
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-xs"
                        : isLight
                        ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                        : "bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-400"
                    }`}
                  >
                    {div === "QLD" ? "Queensland" : "New South Wales"}
                  </button>
                ))}
              </div>
            </div>

            {/* Assigned Consultant */}
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Assigned Sales Consultant
              </label>
              <select
                value={selectedConsultantId}
                onChange={(e) => setSelectedConsultantId(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-hidden transition-all ${
                  isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-950 border-slate-800 text-white"
                }`}
              >
                {CONSULTANTS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.displayCentre})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Additional Options */}
          <div
            className={`p-4 rounded-2xl border flex flex-col gap-3 ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
            }`}
          >
            {activeDesignName && (
              <label className="flex items-center gap-2.5 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={includeSpecificDesign}
                  onChange={(e) => setIncludeSpecificDesign(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span>
                  Pre-filter directly to <strong>{activeDesignName}</strong> upon opening
                </span>
              </label>
            )}

            <label className="flex items-center gap-2.5 cursor-pointer text-xs select-none">
              <input
                type="checkbox"
                checked={showPricing}
                onChange={(e) => setShowPricing(e.target.checked)}
                className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <span>
                Display Standard Catalogue Pricing (recommended for transparent quoting)
              </span>
            </label>
          </div>

          {/* Generated Link Box */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                  Format:
                </span>
                <button
                  type="button"
                  onClick={() => setLinkStyle("clean")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer transition-all ${
                    linkStyle === "clean"
                      ? "bg-emerald-500 text-slate-950 shadow-xs"
                      : isLight
                      ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                  title="Clean, branded, readable link (Recommended)"
                >
                  Clean Short
                </button>
                <button
                  type="button"
                  onClick={() => setLinkStyle("ultraShort")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer transition-all ${
                    linkStyle === "ultraShort"
                      ? "bg-cyan-500 text-slate-950 shadow-xs"
                      : isLight
                      ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                  title="Shortest path (/f) for SMS"
                >
                  Ultra-Short
                </button>
                <button
                  type="button"
                  onClick={() => setLinkStyle("token")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                    linkStyle === "token"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : isLight
                      ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                  title="Full signed cryptographic token"
                >
                  Full Token
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowQr(!showQr)}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer ml-auto"
              >
                <QrIcon className="h-3.5 w-3.5" />
                <span>{showQr ? "Hide QR Code" : "Show QR Code"}</span>
              </button>
            </div>

            <div
              className={`p-2.5 rounded-2xl border flex items-center justify-between gap-2 font-mono text-[11px] select-all overflow-hidden ${
                isLight ? "bg-slate-100 border-slate-300 text-slate-800" : "bg-slate-950 border-slate-800 text-slate-300"
              }`}
            >
              <span className="truncate flex-1">{activeUrl}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-sans text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors active:scale-95"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Copied" : "Copy Link"}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 px-1">
              {linkStyle === "clean" && "✨ Short, clean, and customer-friendly. Ideal for SMS, WhatsApp, and email."}
              {linkStyle === "ultraShort" && "⚡ Ultra-compact URL format (/f) for character-limited SMS."}
              {linkStyle === "token" && "🔒 Full 90-day HMAC cryptographic signed token."}
            </p>
          </div>

          {/* QR Code Container */}
          {showQr && (
            <div
              className={`p-5 rounded-2xl border flex flex-col items-center justify-center gap-3 animate-in zoom-in-95 duration-200 ${
                isLight ? "bg-white border-slate-200" : "bg-slate-950 border-slate-800"
              }`}
            >
              <div className="p-3 bg-white rounded-xl shadow-md">
                <QrCode value={activeUrl} size={180} />
              </div>
              <p className="text-[11px] text-slate-400 text-center max-w-xs">
                Scan with any mobile camera to open the private customer floorplan gallery instantly.
              </p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? "Copied to Clipboard!" : "Copy Customer Link"}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenPreview}
              className={`py-3 px-4 rounded-2xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                isLight
                  ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700"
                  : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200"
              }`}
              title="Open the customer view in a new tab"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Test Preview</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
