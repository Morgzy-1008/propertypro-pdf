import React, { useState, useMemo } from "react";
import {
  FileText,
  Download,
  Share2,
  Copy,
  Check,
  Building,
  User,
  Home,
  Compass,
  PackageCheck,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  RotateCcw,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatAud } from "@/lib/pricing";
import {
  getEffectiveDesignName,
  calculateModifiedFloorplanPricing,
} from "@/lib/quoting/quoteEngine";
import type { FullQuote } from "@/lib/quoting/quoteTypes";
import { toast } from "sonner";
import { QuotePdfDocument } from "../QuotePdfDocument";

interface V2StepReviewProps {
  quote: FullQuote;
  onPrev: () => void;
  onSaveQuote: () => Promise<void>;
  onDownloadPdf: () => Promise<void>;
  onOpenShare: () => void;
  onSwitchToDetailed: () => void;
  onNewQuote: () => void;
  saving: boolean;
  downloading: boolean;
  isLight: boolean;
}

export function V2StepReview({
  quote,
  onPrev,
  onSaveQuote,
  onDownloadPdf,
  onOpenShare,
  onSwitchToDetailed,
  onNewQuote,
  saving,
  downloading,
  isLight,
}: V2StepReviewProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSms, setCopiedSms] = useState(false);

  const pricing = quote.pricing;
  const designName = getEffectiveDesignName(quote.design) || "Home Design";
  const tierName = quote.design.specTier || "H2 Design Collection";

  // Calculate plan modifications delta properly using calculateModifiedFloorplanPricing
  const modCalc = quote.design.isModifiedFloorplan ? calculateModifiedFloorplanPricing(quote.design) : null;
  const modAdjustment = modCalc ? modCalc.totalCostAdjustment : 0;

  // Calculate non-mod variations so sub-boxes add up with 100% mathematical integrity
  const nonModVariationsSubtotal = useMemo(() => {
    const items = (quote.lineItems || []).filter(
      (it) => it.isIncluded && !it.id.startsWith("mod_area_") && !it.id.startsWith("mod_")
    );
    const lineTotal = items.reduce((sum, it) => sum + (it.subtotal || 0), 0);
    const facadeTotal = quote.design.facadePrice || 0;
    return lineTotal + facadeTotal;
  }, [quote.lineItems, quote.design.facadePrice]);

  const clientShareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/quote/${quote.id}`
      : `/quote/${quote.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(clientShareUrl);
    setCopiedLink(true);
    toast.success("Interactive client estimate link copied!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopySms = () => {
    const name = quote.client.clientName || "there";
    const text = `Hi ${name}, here is your Hudson Homes Builders Estimate for the ${designName}:\n${clientShareUrl}\n\nReview your design specifications, floorplan sizing, and included variations online anytime!`;
    navigator.clipboard.writeText(text);
    setCopiedSms(true);
    toast.success("Client SMS message copied!");
    setTimeout(() => setCopiedSms(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Prompt */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/50 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs">
              5
            </span>
            <span className="text-xs uppercase tracking-wider font-bold text-emerald-400">Step 5 of 5: Review &amp; Export</span>
          </div>
          <h2 className={`text-2xl font-bold mt-1 ${isLight ? "text-slate-900" : "text-white"}`}>
            Review &amp; Export Builders Estimate
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Estimate #{quote.quoteNumber || "MH"} for {quote.client.clientName || "Client"} • Ready for PDF generation &amp; client presentation.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onSwitchToDetailed}
          className={`text-xs gap-1.5 font-bold cursor-pointer ${
            isLight
              ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-100 shadow-xs"
              : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <Layers className="h-3.5 w-3.5 text-cyan-400" />
          Open Detailed Studio Mode
        </Button>
      </div>

      {/* Main Financial Hero Card */}
      <div
        className={`p-8 rounded-3xl border shadow-xl relative overflow-hidden transition-all ${
          isLight
            ? "bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 border-emerald-200 shadow-emerald-500/5"
            : "bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/20 border-slate-800/90 backdrop-blur-xl"
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-700/30">
          <div>
            <span className="text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Total Turnkey Estimated Investment
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-4xl sm:text-5xl font-black font-mono tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                {formatAud(pricing?.grossEstimatedInvestment || 0)}
              </span>
              <span className="text-xs text-slate-400 font-semibold">Incl. GST</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Fixed for 14 days • Includes promotional builder discounts and standard inclusions.
            </p>
          </div>

          {/* Quick PDF & Share Action Pill Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="lg"
              onClick={onDownloadPdf}
              disabled={downloading}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold px-6 shadow-lg shadow-emerald-500/20 gap-2 cursor-pointer h-12"
            >
              <Download className="h-4 w-4" />
              {downloading ? "Creating PDF…" : "Download Official PDF"}
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={handleCopyLink}
              className={`h-12 px-5 text-xs font-bold gap-1.5 cursor-pointer ${
                isLight
                  ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-100 shadow-xs"
                  : "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {copiedLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-cyan-500" />}
              {copiedLink ? "Link Copied!" : "Copy Client Link"}
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={handleCopySms}
              className={`h-12 px-5 text-xs font-bold gap-1.5 cursor-pointer ${
                isLight
                  ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-100 shadow-xs"
                  : "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {copiedSms ? <Check className="h-4 w-4 text-emerald-500" /> : <MessageSquare className="h-4 w-4 text-amber-500" />}
              {copiedSms ? "SMS Copied!" : "Copy SMS"}
            </Button>
          </div>
        </div>

        {/* Financial Line Item Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          {/* Base House */}
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
              Base House ({tierName.split(" ")[0]})
            </span>
            <span className={`text-xl font-bold font-mono ${isLight ? "text-slate-900" : "text-white"}`}>
              {formatAud(pricing?.baseHousePrice || quote.design.basePrice || 0)}
            </span>
            <span className="text-[10px] text-slate-400 block truncate">
              {designName} • {quote.design.designM2} m²
            </span>
          </div>

          {/* Modification Delta */}
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
              Plan Modifications
            </span>
            <span className={`text-xl font-bold font-mono ${quote.design.isModifiedFloorplan ? "text-amber-500" : isLight ? "text-slate-900" : "text-white"}`}>
              {quote.design.isModifiedFloorplan
                ? `${modAdjustment >= 0 ? "+" : ""}${formatAud(modAdjustment)}`
                : "$0 (Standard)"}
            </span>
            <span className="text-[10px] text-slate-400 block truncate">
              {quote.design.isModifiedFloorplan
                ? `Altered: ${modCalc?.modifiedTotalM2 || quote.design.designM2} m²`
                : "Official brochure specs"}
            </span>
          </div>

          {/* Site Costs */}
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
              Site Works &amp; Earthworks
            </span>
            <span className={`text-xl font-bold font-mono ${isLight ? "text-slate-900" : "text-white"}`}>
              +{formatAud(pricing?.siteCostsSubtotal || 0)}
            </span>
            <span className="text-[10px] text-slate-400 block truncate">
              {quote.siteConditions.soilClass} • {quote.siteConditions.fallMeters || 0}m Fall
            </span>
          </div>

          {/* Variations & Upgrades */}
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
              Variations &amp; Upgrades
            </span>
            <span className={`text-xl font-bold font-mono ${isLight ? "text-slate-900" : "text-white"}`}>
              +{formatAud(nonModVariationsSubtotal)}
            </span>
            <span className="text-[10px] text-slate-400 block truncate">
              {(quote.lineItems || []).filter((i) => i.isIncluded).length} upgrade items selected
            </span>
          </div>
        </div>

        {/* Promotion Discount Banner (if applicable) */}
        {(pricing?.promotionsDiscount || 0) > 0 && (
          <div className={`mt-6 p-3 rounded-xl border flex items-center justify-between text-xs ${
            isLight
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
          }`}>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-500" />
              <span>Hudson Promotional Incentive Discount applied automatically</span>
            </div>
            <span className="font-mono font-bold">-{formatAud(pricing?.promotionsDiscount || 0)}</span>
          </div>
        )}
      </div>

      {/* Client & Project Details Recap Cards with High-Contrast Light Mode */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Client & Site */}
        <div
          className={`p-6 rounded-2xl border transition-all ${
            isLight
              ? "bg-white border-slate-200 shadow-sm"
              : "bg-slate-900/60 border-slate-800/80"
          }`}
        >
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-700/30">
            <User className="h-4 w-4 text-emerald-500" />
            <h3 className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-200"}`}>
              Client &amp; Site Information
            </h3>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Client Name:</span>
              <span className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{quote.client.clientName || "Not specified"}</span>
            </div>
            {quote.client.hasClient2 && quote.client.client2Name && (
              <div className="flex justify-between">
                <span className="text-slate-400">Co-Client:</span>
                <span className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{quote.client.client2Name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">Phone:</span>
              <span className={isLight ? "text-slate-800" : "text-slate-300"}>{quote.client.clientPhone || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Email:</span>
              <span className={isLight ? "text-slate-800" : "text-slate-300"}>{quote.client.clientEmail || "—"}</span>
            </div>
            <div className={`flex justify-between pt-2 border-t ${isLight ? "border-slate-200" : "border-slate-700/20"}`}>
              <span className="text-slate-400">Site Address:</span>
              <span className={`font-semibold ${isLight ? "text-slate-900" : "text-slate-200"}`}>{quote.client.siteAddress || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Suburb / Estate:</span>
              <span className={isLight ? "text-slate-800" : "text-slate-300"}>
                {quote.client.suburb || "—"} {quote.client.estate ? `(${quote.client.estate})` : ""}
              </span>
            </div>
            {quote.client.lotNumber && (
              <div className="flex justify-between">
                <span className="text-slate-400">Lot Number:</span>
                <span className={isLight ? "text-slate-800" : "text-slate-300"}>{quote.client.lotNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Design & Specifications */}
        <div
          className={`p-6 rounded-2xl border transition-all ${
            isLight
              ? "bg-white border-slate-200 shadow-sm"
              : "bg-slate-900/60 border-slate-800/80"
          }`}
        >
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-700/30">
            <Home className="h-4 w-4 text-cyan-500" />
            <h3 className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-200"}`}>
              House Design &amp; Inclusions
            </h3>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Home Design:</span>
              <span className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{designName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Housing Type:</span>
              <span className={isLight ? "text-slate-800" : "text-slate-300"}>{quote.design.housingType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Inclusions Tier:</span>
              <span className={`font-bold ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>{tierName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Exterior Facade:</span>
              <span className={isLight ? "text-slate-800" : "text-slate-300"}>
                {quote.design.facadeName || "Classic"}
                {quote.design.facadePrice ? ` (+${formatAud(quote.design.facadePrice)})` : " (Included)"}
              </span>
            </div>
            <div className={`flex justify-between pt-2 border-t ${isLight ? "border-slate-200" : "border-slate-700/20"}`}>
              <span className="text-slate-400">Total Area:</span>
              <span className={`font-mono font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                {quote.design.isModifiedFloorplan
                  ? `${quote.design.modifiedDesignM2 || quote.design.designM2} m² (Modified)`
                  : `${quote.design.designM2} m²`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Bed / Bath / Car:</span>
              <span className={isLight ? "text-slate-800" : "text-slate-300"}>
                {quote.design.beds || 4} Bed • {quote.design.baths || 2} Bath • {quote.design.cars || 2} Car
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Sales Consultant:</span>
              <span className={isLight ? "text-slate-800" : "text-slate-300"}>
                {quote.client.consultantName || "Hudson New Home Consultant"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FULL ESTIMATE PDF DOCUMENT PREVIEW */}
      <div
        className={`rounded-3xl border overflow-hidden shadow-2xl transition-all ${
          isLight ? "bg-white border-slate-200" : "bg-slate-900/60 border-slate-800 backdrop-blur-md"
        }`}
      >
        <div
          className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${
            isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/80 border-slate-800"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-none">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                  Official Builders Estimate PDF Document
                </h3>
                <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/40">
                  Live Multi-Page Preview
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Full 4-page estimate presentation document matching final contract specifications.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={onDownloadPdf}
              disabled={downloading}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs gap-1.5 h-9 px-4 shadow-sm cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{downloading ? "Generating..." : "Download Estimate PDF"}</span>
            </Button>
          </div>
        </div>

        <div
          className="pdf-preview-stage p-4 sm:p-8 overflow-x-auto flex justify-center bg-slate-950/80 light normal-mode"
          style={{ colorScheme: "light" }}
        >
          <div className="shadow-2xl rounded-xl overflow-hidden bg-white max-w-full">
            <QuotePdfDocument quote={quote} coverVersion="v1" />
          </div>
        </div>
      </div>

      {/* Bottom Navigation & Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-700/50">
        <Button
          type="button"
          variant="outline"
          onClick={onPrev}
          className={`w-full sm:w-auto text-xs gap-1.5 cursor-pointer ${
            isLight
              ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Variations
        </Button>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onSaveQuote}
            disabled={saving}
            className={`text-xs gap-1.5 cursor-pointer ${
              isLight
                ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            {saving ? "Saving..." : "Save to CRM"}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onNewQuote}
            className={`text-xs gap-1.5 cursor-pointer ${
              isLight
                ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            New Estimate
          </Button>

          <Button
            type="button"
            onClick={onDownloadPdf}
            disabled={downloading}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold px-6 shadow-lg shadow-emerald-500/20 gap-2 cursor-pointer h-10 text-xs"
          >
            <Download className="h-4 w-4" />
            {downloading ? "Creating PDF…" : "Download PDF"}
          </Button>
        </div>
      </div>
    </div>
  );
}
