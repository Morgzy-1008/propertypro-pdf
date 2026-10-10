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
  Building2,
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
    <div className="space-y-8 max-w-6xl xl:max-w-7xl mx-auto px-2 sm:px-4">
      {/* Header Prompt */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/50 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-xs">
              5
            </span>
            <span className="text-xs uppercase tracking-wider font-extrabold text-emerald-400">Step 5 of 5: Review &amp; Export</span>
          </div>
          <h2 className={`text-3xl sm:text-4xl font-extrabold tracking-tight mt-1.5 ${isLight ? "text-slate-900" : "text-white"}`}>
            Review &amp; Export Builders Estimate
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-1">
            Estimate #{quote.quoteNumber || "MH"} for {quote.client.clientName || "Client"} • Ready for PDF generation &amp; client presentation.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onSwitchToDetailed}
          className={`h-11 px-5 text-sm gap-2 font-bold rounded-xl cursor-pointer ${
            isLight
              ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-100 shadow-xs"
              : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <Layers className="h-4 w-4 text-cyan-400" />
          Open Detailed Studio Mode
        </Button>
      </div>

      {/* Main Financial Hero Card */}
      <div
        className={`p-6 sm:p-10 rounded-2xl sm:rounded-3xl border shadow-xl relative overflow-hidden transition-all ${
          isLight
            ? "bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 border-emerald-200 shadow-emerald-500/5"
            : "bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/20 border-slate-800/90 backdrop-blur-xl"
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-8 border-b border-slate-700/30">
          <div>
            <span className="text-sm uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" /> Total Turnkey Estimated Investment
            </span>
            <div className="flex items-baseline gap-3 mt-2">
              <span className={`text-5xl sm:text-6xl font-black font-mono tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                {formatAud(pricing?.grossEstimatedInvestment || 0)}
              </span>
              <span className="text-sm text-slate-400 font-bold">Incl. GST</span>
            </div>
            <p className="text-sm text-slate-400 mt-2">
              Fixed for 14 days • Includes promotional builder discounts and standard inclusions.
            </p>
          </div>

          {/* Quick PDF & Share Action Pill Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              onClick={onDownloadPdf}
              disabled={downloading}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-base px-8 rounded-xl shadow-lg shadow-emerald-500/20 gap-2.5 cursor-pointer h-14"
            >
              <Download className="h-5 w-5" />
              {downloading ? "Creating PDF…" : "Download Official PDF"}
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={handleCopyLink}
              className={`h-14 px-6 text-sm font-bold rounded-xl gap-2 cursor-pointer ${
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
              className={`h-14 px-6 text-sm font-bold rounded-xl gap-2 cursor-pointer ${
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
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${(pricing?.secondDwellingPrice || 0) > 0 ? "lg:grid-cols-5" : "lg:grid-cols-4"} gap-6 pt-8`}>
          {/* Base House */}
          <div className="space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-slate-400 block font-bold">
              Base House ({tierName.split(" ")[0]})
            </span>
            <span className={`text-2xl sm:text-3xl font-extrabold font-mono ${isLight ? "text-slate-900" : "text-white"}`}>
              {formatAud(pricing?.baseHousePrice || quote.design.basePrice || 0)}
            </span>
            <span className="text-xs text-slate-400 block truncate font-medium">
              {designName} • {quote.design.designM2} m²
            </span>
          </div>

          {/* 2nd Dwelling if applicable */}
          {(pricing?.secondDwellingPrice || 0) > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs uppercase tracking-wider text-cyan-600 dark:text-cyan-400 block font-bold flex items-center gap-1.5">
                🏡 2nd Dwelling
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-cyan-600 dark:text-cyan-400">
                +{formatAud(pricing?.secondDwellingPrice || 0)}
              </span>
              <span className="text-xs text-slate-400 block truncate font-medium">
                {quote.design.secondDwelling?.designName} • {quote.design.secondDwelling?.designM2} m²
              </span>
            </div>
          )}

          {/* Modification Delta */}
          <div className="space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-slate-400 block font-bold">
              Plan Modifications
            </span>
            <span className={`text-2xl sm:text-3xl font-extrabold font-mono ${quote.design.isModifiedFloorplan ? "text-amber-500" : isLight ? "text-slate-900" : "text-white"}`}>
              {quote.design.isModifiedFloorplan
                ? `${modAdjustment >= 0 ? "+" : ""}${formatAud(modAdjustment)}`
                : "$0 (Standard)"}
            </span>
            <span className="text-xs text-slate-400 block truncate font-medium">
              {quote.design.isModifiedFloorplan
                ? `Altered: ${modCalc?.modifiedTotalM2 || quote.design.designM2} m²`
                : "Official brochure specs"}
            </span>
          </div>

          {/* Site Costs */}
          <div className="space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-slate-400 block font-bold">
              Site Works &amp; Earthworks
            </span>
            <span className={`text-2xl sm:text-3xl font-extrabold font-mono ${isLight ? "text-slate-900" : "text-white"}`}>
              +{formatAud(pricing?.siteCostsSubtotal || 0)}
            </span>
            <span className="text-xs text-slate-400 block truncate font-medium">
              {quote.siteConditions.soilClass} • {quote.siteConditions.fallMeters || 0}m Fall
            </span>
          </div>

          {/* Variations & Upgrades */}
          <div className="space-y-1.5">
            <span className="text-xs uppercase tracking-wider text-slate-400 block font-bold">
              Variations &amp; Upgrades
            </span>
            <span className={`text-2xl sm:text-3xl font-extrabold font-mono ${isLight ? "text-slate-900" : "text-white"}`}>
              +{formatAud(nonModVariationsSubtotal)}
            </span>
            <span className="text-xs text-slate-400 block truncate font-medium">
              {(quote.lineItems || []).filter((i) => i.isIncluded).length} upgrade items selected
            </span>
          </div>
        </div>

        {/* Promotion Discount Banner (if applicable) */}
        {(pricing?.promotionsDiscount || 0) > 0 && (
          <div className={`mt-8 p-4 rounded-2xl border flex items-center justify-between text-sm ${
            isLight
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
          }`}>
            <div className="flex items-center gap-2.5 font-medium">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              <span>Hudson Promotional Incentive Discount applied automatically</span>
            </div>
            <span className="font-mono font-extrabold text-base">-{formatAud(pricing?.promotionsDiscount || 0)}</span>
          </div>
        )}
      </div>

      {/* Client & Project Details Recap Cards with High-Contrast Light Mode */}
      <div className={`grid grid-cols-1 ${quote.design.hasSecondDwelling && quote.design.secondDwelling?.enabled ? "lg:grid-cols-3 md:grid-cols-2" : "md:grid-cols-2"} gap-6`}>
        {/* Client & Site */}
        <div
          className={`p-6 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all ${
            isLight
              ? "bg-white border-slate-200 shadow-sm"
              : "bg-slate-900/60 border-slate-800/80"
          }`}
        >
          <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-700/30">
            <User className="h-5 w-5 text-emerald-500" />
            <h3 className={`text-base sm:text-lg font-bold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-200"}`}>
              Client &amp; Site Information
            </h3>
          </div>

          <div className="space-y-3.5 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Client Name:</span>
              <span className={`font-bold text-base ${isLight ? "text-slate-900" : "text-white"}`}>{quote.client.clientName || "Not specified"}</span>
            </div>
            {quote.client.hasClient2 && quote.client.client2Name && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Co-Client:</span>
                <span className={`font-bold text-base ${isLight ? "text-slate-900" : "text-white"}`}>{quote.client.client2Name}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Phone:</span>
              <span className={`font-medium ${isLight ? "text-slate-800" : "text-slate-300"}`}>{quote.client.clientPhone || "—"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Email:</span>
              <span className={`font-medium ${isLight ? "text-slate-800" : "text-slate-300"}`}>{quote.client.clientEmail || "—"}</span>
            </div>
            <div className={`flex justify-between items-center pt-3 border-t ${isLight ? "border-slate-200" : "border-slate-700/20"}`}>
              <span className="text-slate-400 font-medium">Site Address:</span>
              <span className={`font-bold ${isLight ? "text-slate-900" : "text-slate-200"}`}>{quote.client.siteAddress || "—"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Suburb / Estate:</span>
              <span className={`font-medium ${isLight ? "text-slate-800" : "text-slate-300"}`}>
                {quote.client.suburb || "—"} {quote.client.estate ? `(${quote.client.estate})` : ""}
              </span>
            </div>
            {quote.client.lotNumber && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Lot Number:</span>
                <span className={`font-medium ${isLight ? "text-slate-800" : "text-slate-300"}`}>{quote.client.lotNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Design & Specifications */}
        <div
          className={`p-6 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all ${
            isLight
              ? "bg-white border-slate-200 shadow-sm"
              : "bg-slate-900/60 border-slate-800/80"
          }`}
        >
          <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-700/30">
            <Home className="h-5 w-5 text-cyan-500" />
            <h3 className={`text-base sm:text-lg font-bold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-200"}`}>
              House Design &amp; Inclusions
            </h3>
          </div>

          <div className="space-y-3.5 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Home Design:</span>
              <span className={`font-bold text-base ${isLight ? "text-slate-900" : "text-white"}`}>{designName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Housing Type:</span>
              <span className={`font-medium ${isLight ? "text-slate-800" : "text-slate-300"}`}>{quote.design.housingType}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Inclusions Tier:</span>
              <span className={`font-bold text-base ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>{tierName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Exterior Facade:</span>
              <span className={`font-medium ${isLight ? "text-slate-800" : "text-slate-300"}`}>
                {quote.design.facadeName || "Classic"}
                {quote.design.facadePrice ? ` (+${formatAud(quote.design.facadePrice)})` : " (Included)"}
              </span>
            </div>
            <div className={`flex justify-between items-center pt-3 border-t ${isLight ? "border-slate-200" : "border-slate-700/20"}`}>
              <span className="text-slate-400 font-medium">Total Area:</span>
              <span className={`font-mono font-bold text-base ${isLight ? "text-slate-900" : "text-white"}`}>
                {quote.design.isModifiedFloorplan
                  ? `${quote.design.modifiedDesignM2 || quote.design.designM2} m² (Modified)`
                  : `${quote.design.designM2} m²`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Bed / Bath / Car:</span>
              <span className={`font-medium ${isLight ? "text-slate-800" : "text-slate-300"}`}>
                {quote.design.beds || 4} Bed • {quote.design.baths || 2} Bath • {quote.design.cars || 2} Car
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-medium">Sales Consultant:</span>
              <span className={`font-medium ${isLight ? "text-slate-800" : "text-slate-300"}`}>
                {quote.client.consultantName || "Hudson New Home Consultant"}
              </span>
            </div>
          </div>
        </div>

        {/* 2nd Dwelling Specifications */}
        {quote.design.hasSecondDwelling && quote.design.secondDwelling?.enabled && (
          <div
            className={`p-6 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all ${
              isLight
                ? "bg-white border-cyan-200 shadow-sm"
                : "bg-slate-900/60 border-cyan-500/30"
            }`}
          >
            <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-cyan-500/20">
              <Building2 className="h-5 w-5 text-cyan-500" />
              <h3 className={`text-base sm:text-lg font-bold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                2nd Dwelling (Auxiliary)
              </h3>
            </div>

            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Design Model:</span>
                <span className={`font-bold text-base ${isLight ? "text-slate-900" : "text-white"}`}>
                  {quote.design.secondDwelling.designName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Housing Type:</span>
                <span className={`font-medium ${isLight ? "text-slate-800" : "text-slate-300"}`}>
                  {quote.design.secondDwelling.housingType}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Inclusions Tier:</span>
                <span className={`font-bold text-base ${isLight ? "text-cyan-700" : "text-cyan-400"}`}>
                  {quote.design.secondDwelling.specTier || "H1 Smart Living"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Exterior Facade:</span>
                <span className={`font-medium ${isLight ? "text-slate-800" : "text-slate-300"}`}>
                  {quote.design.secondDwelling.facadeName || "Classic"}
                  {quote.design.secondDwelling.facadePrice ? ` (+${formatAud(quote.design.secondDwelling.facadePrice)})` : " (Included)"}
                </span>
              </div>
              <div className={`flex justify-between items-center pt-3 border-t ${isLight ? "border-slate-200" : "border-slate-700/20"}`}>
                <span className="text-slate-400 font-medium">Total Area:</span>
                <span className={`font-mono font-bold text-base ${isLight ? "text-slate-900" : "text-white"}`}>
                  {quote.design.secondDwelling.designM2} m²
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Bed / Bath / Car:</span>
                <span className={`font-medium ${isLight ? "text-slate-800" : "text-slate-300"}`}>
                  {quote.design.secondDwelling.beds || 2} Bed • {quote.design.secondDwelling.baths || 1} Bath • {quote.design.secondDwelling.cars || 0} Car
                </span>
              </div>
              <div className="flex justify-between items-center font-bold pt-2 border-t border-cyan-500/20">
                <span className="text-slate-400 font-medium">2nd Dwelling Subtotal:</span>
                <span className={`font-mono text-base ${isLight ? "text-cyan-700" : "text-cyan-400"}`}>
                  +{formatAud((Number(quote.design.secondDwelling.basePrice) || 0) + (Number(quote.design.secondDwelling.facadePrice) || 0))}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FULL ESTIMATE PDF DOCUMENT PREVIEW */}
      <div
        className={`rounded-2xl sm:rounded-3xl border overflow-hidden shadow-2xl transition-all ${
          isLight ? "bg-white border-slate-200" : "bg-slate-900/60 border-slate-800 backdrop-blur-md"
        }`}
      >
        <div
          className={`p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b ${
            isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/80 border-slate-800"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-none">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className={`text-lg sm:text-xl font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                  Official Builders Estimate PDF Document
                </h3>
                <Badge variant="outline" className="text-xs px-2.5 py-0.5 text-emerald-400 border-emerald-500/40 font-bold">
                  Live Multi-Page Preview
                </Badge>
              </div>
              <p className="text-sm text-slate-400 mt-1">
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
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm gap-2 h-11 px-5 rounded-xl shadow-sm cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>{downloading ? "Generating..." : "Download Estimate PDF"}</span>
            </Button>
          </div>
        </div>

        <div
          className="pdf-preview-stage p-4 sm:p-10 overflow-x-auto flex justify-center bg-slate-950/80 light normal-mode"
          style={{ colorScheme: "light" }}
        >
          <div className="shadow-2xl rounded-2xl overflow-hidden bg-white max-w-full">
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
          className={`w-full sm:w-auto h-14 px-8 rounded-xl text-sm font-bold gap-2 cursor-pointer ${
            isLight
              ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Variations
        </Button>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onSaveQuote}
            disabled={saving}
            className={`h-14 px-6 rounded-xl text-sm font-bold gap-2 cursor-pointer ${
              isLight
                ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            {saving ? "Saving..." : "Save to CRM"}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onNewQuote}
            className={`h-14 px-6 rounded-xl text-sm font-bold gap-2 cursor-pointer ${
              isLight
                ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <RotateCcw className="h-4 w-4" />
            New Estimate
          </Button>

          <Button
            type="button"
            onClick={onDownloadPdf}
            disabled={downloading}
            className="h-14 px-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-base shadow-lg shadow-emerald-500/20 gap-2.5 cursor-pointer"
          >
            <Download className="h-5 w-5" />
            {downloading ? "Creating PDF…" : "Download PDF"}
          </Button>
        </div>
      </div>
    </div>
  );
}
