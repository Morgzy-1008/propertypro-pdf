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
  Send,
  BookOpen,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatAud } from "@/lib/pricing";
import {
  getEffectiveDesignName,
  calculateModifiedFloorplanPricing,
} from "@/lib/quoting/quoteEngine";
import { getHudsonCompanyInfo } from "@/lib/divisionContext";
import { PaymentQrCode } from "../PaymentQrCode";
import type { FullQuote } from "@/lib/quoting/quoteTypes";
import { toast } from "sonner";
import { QuotePdfDocument } from "../QuotePdfDocument";

interface V2StepReviewProps {
  quote: FullQuote;
  onPrev: () => void;
  onSaveQuote: () => Promise<void>;
  onDownloadPdf: () => Promise<void>;
  onOpenShare: () => void;
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

  const includedVariations = useMemo(() => {
    return (quote.lineItems || []).filter(
      (it) => it.isIncluded && !it.id.startsWith("mod_area_") && !it.id.startsWith("mod_")
    );
  }, [quote.lineItems]);

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

  const company = useMemo(() => {
    return getHudsonCompanyInfo({
      state: quote.client.state,
      postcode: quote.client.postcode,
      suburb: quote.client.suburb,
      siteAddress: quote.client.siteAddress,
      consultantOffice: quote.client.consultantOffice,
    });
  }, [quote.client]);

  const paymentReference = useMemo(() => {
    return `${quote.quoteNumber || "MH"} ${quote.client.clientName?.split(" ").pop() || "Deposit"}`;
  }, [quote.quoteNumber, quote.client.clientName]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label} to clipboard: ${text}`);
  };

  const BROCHURES = [
    {
      title: "H1 Smart Living Inclusions",
      url: "https://www.hudsonhomes.com.au/wp-content/uploads/2025/01/Digital-H1-Brochure-Hudson-Homes-Jan-25.pdf",
      tier: "H1",
    },
    {
      title: "H2 Designer Living Inclusions",
      url: "https://www.hudsonhomes.com.au/wp-content/uploads/2025/01/Digital-H2-Brochure-Hudson-Homes-Jan-25.pdf",
      tier: "H2",
    },
    {
      title: "H3 Luxury Living Inclusions",
      url: "https://www.hudsonhomes.com.au/wp-content/uploads/2025/01/Digital-H3-Brochure-Hudson-Homes-Jan-25.pdf",
      tier: "H3",
    },
    {
      title: "Hudson Turnkey Landscaping",
      url: "http://www.hudsonhomes.com.au/wp-content/uploads/2025/01/Digital-Landscape-Brochure-Hudson-Homes-Jan-25.pdf",
      tier: "Landscaping",
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl 2xl:max-w-[1550px] mx-auto px-2 sm:px-4">
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

            <Link to="/tender-request">
              <Button
                size="lg"
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-base px-6 rounded-xl shadow-lg shadow-amber-500/20 gap-2 cursor-pointer h-14"
              >
                <Send className="h-5 w-5" />
                Submit Tender (ATP)
              </Button>
            </Link>

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
            <span className={`text-2xl sm:text-3xl font-extrabold font-mono ${
              nonModVariationsSubtotal < 0
                ? "text-rose-600 dark:text-rose-400"
                : isLight
                ? "text-slate-900"
                : "text-white"
            }`}>
              {nonModVariationsSubtotal > 0
                ? `+${formatAud(nonModVariationsSubtotal)}`
                : nonModVariationsSubtotal < 0
                ? `-${formatAud(Math.abs(nonModVariationsSubtotal))}`
                : "$0"}
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
            <div className="flex justify-between items-start">
              <span className="text-slate-400 font-medium">Sales Consultant:</span>
              <div className="text-right">
                <span className={`font-medium block ${isLight ? "text-slate-800" : "text-slate-300"}`}>
                  {quote.client.consultantName || "Hudson New Home Consultant"}
                  {quote.client.consultantOffice ? ` (${quote.client.consultantOffice})` : ""}
                </span>
                {(quote.client.consultantPhone || quote.client.consultantEmail) && (
                  <span className="text-xs text-slate-400 block mt-0.5">
                    {quote.client.consultantPhone}
                    {quote.client.consultantPhone && quote.client.consultantEmail ? " • " : ""}
                    {quote.client.consultantEmail}
                  </span>
                )}
              </div>
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

      {/* Selected Variations & Upgrades Itemized Recap Card */}
      {(includedVariations.length > 0 || (quote.design.facadePrice || 0) > 0 || (quote.design.isModifiedFloorplan && modCalc && modCalc.totalCostAdjustment !== 0)) && (
        <div
          className={`p-6 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all ${
            isLight
              ? "bg-white border-slate-200 shadow-sm"
              : "bg-slate-900/60 border-slate-800/80"
          }`}
        >
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-700/30">
            <div className="flex items-center gap-2.5">
              <PackageCheck className="h-5 w-5 text-emerald-500" />
              <h3 className={`text-base sm:text-lg font-bold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                Selected Variations &amp; Upgrades Breakdown
              </h3>
            </div>
            {(() => {
              const totalVar = nonModVariationsSubtotal + (quote.design.isModifiedFloorplan ? modAdjustment : 0);
              return (
                <span className={`font-mono font-extrabold text-base ${
                  totalVar < 0
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}>
                  {totalVar > 0
                    ? `+${formatAud(totalVar)}`
                    : totalVar < 0
                    ? `-${formatAud(Math.abs(totalVar))}`
                    : "$0"}
                </span>
              );
            })()}
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm">
            {/* Selected Facade */}
            {(quote.design.facadePrice || 0) > 0 && (
              <div className="py-2.5 flex items-center justify-between">
                <div>
                  <span className={`font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
                    Selected Façade: {quote.design.facadeName}
                  </span>
                  <span className="block text-xs text-slate-400">
                    {quote.design.isCustomFacade ? "Custom bespoke architectural elevation" : "Architectural catalogue façade"}
                  </span>
                </div>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  +{formatAud(quote.design.facadePrice || 0)}
                </span>
              </div>
            )}

            {/* Plan Modifications */}
            {quote.design.isModifiedFloorplan && modCalc && modCalc.zones.filter((z) => z.deltaM2 !== 0).map((z) => (
              <div key={z.key} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className={`font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
                    {z.label} {z.deltaM2 > 0 ? "Extension" : "Reduction"} ({z.deltaM2 > 0 ? `+${z.deltaM2.toFixed(2)}` : z.deltaM2.toFixed(2)} m²)
                  </span>
                  <span className="block text-xs text-slate-400">
                    Baseline: {z.standardM2.toFixed(2)} m² → Modified: {z.modifiedM2.toFixed(2)} m² @ {formatAud(z.ratePerM2)}/m²
                  </span>
                </div>
                <span className={`font-mono font-bold ${z.costAdjustment >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
                  {z.costAdjustment >= 0 ? `+${formatAud(z.costAdjustment)}` : `-${formatAud(Math.abs(z.costAdjustment))}`}
                </span>
              </div>
            ))}

            {/* Selected Line Item Variations */}
            {includedVariations.map((it) => {
              const hasDesc =
                it.description &&
                it.description.trim() &&
                it.description !== "Custom client variation request" &&
                it.description !== "Client Custom Variation";

              return (
                <div key={it.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
                        {it.name}
                      </span>
                      {it.quantity > 1 && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                          Qty: {it.quantity} {it.unitType === "sqm" ? "m²" : ""}
                        </span>
                      )}
                    </div>
                    {hasDesc && (
                      <span className="block text-xs text-slate-400 line-clamp-1 mt-0.5">
                        {it.description}
                      </span>
                    )}
                  </div>
                  {(() => {
                    const amount = it.subtotal ?? (it.unitRate * (it.quantity || 1));
                    return (
                      <span className={`font-mono font-bold ${
                        amount < 0
                          ? "text-rose-600 dark:text-rose-400"
                          : amount === 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : isLight
                          ? "text-slate-800"
                          : "text-slate-200"
                      }`}>
                        {amount > 0
                          ? `+${formatAud(amount)}`
                          : amount < 0
                          ? `-${formatAud(Math.abs(amount))}`
                          : "$0 (Included)"}
                      </span>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Official NAB Bank Account Details for Preliminary Deposit */}
      <div
        className={`p-6 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all ${
          isLight
            ? "bg-white border-slate-200 shadow-sm"
            : "bg-slate-900/60 border-slate-800/80"
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-4 flex-1">
            <div className="flex items-center justify-between border-b border-slate-700/30 pb-3">
              <div className="flex items-center gap-2.5">
                <Building className="h-5 w-5 text-amber-500" />
                <h3 className={`text-base sm:text-lg font-bold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-white"}`}>
                  Official EFT Remittance &amp; Trust Account Details
                </h3>
              </div>
              <Badge variant="outline" className="text-xs font-mono font-bold text-amber-500 border-amber-500/30">
                National Australia Bank
              </Badge>
            </div>

            <p className="text-xs sm:text-sm text-slate-400">
              For preliminary works agreement deposit (${formatAud(quote.client.depositAmount || 1650)}) or formal tender lodgement:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {/* Account Name */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/70 border-slate-800"
              }`}>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Account Name</span>
                  <span className={`text-sm font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{company.bankName}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(company.bankName, "Account Name")}
                  className="h-8 w-8 p-0"
                >
                  <Copy className="h-4 w-4 text-slate-400 hover:text-cyan-400" />
                </Button>
              </div>

              {/* Bank Institution */}
              <div className={`p-3 rounded-xl border ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/70 border-slate-800"
              }`}>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Bank Institution</span>
                <span className={`text-sm font-bold ${isLight ? "text-slate-900" : "text-white"}`}>National Australia Bank (NAB)</span>
              </div>

              {/* BSB Number */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/70 border-slate-800"
              }`}>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">BSB Number</span>
                  <span className="text-base font-black font-mono text-emerald-500 tracking-wider">{company.bsb}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(company.bsb, "BSB Number")}
                  className="h-8 w-8 p-0"
                >
                  <Copy className="h-4 w-4 text-slate-400 hover:text-cyan-400" />
                </Button>
              </div>

              {/* Account Number */}
              <div className={`p-3 rounded-xl border flex items-center justify-between ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/70 border-slate-800"
              }`}>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Account Number</span>
                  <span className={`text-base font-black font-mono tracking-wider ${isLight ? "text-slate-900" : "text-white"}`}>{company.accountNumber}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(company.accountNumberRaw, "Account Number")}
                  className="h-8 w-8 p-0"
                >
                  <Copy className="h-4 w-4 text-slate-400 hover:text-cyan-400" />
                </Button>
              </div>

              {/* Payment Reference */}
              <div className={`sm:col-span-2 p-3 rounded-xl border flex items-center justify-between ${
                isLight ? "bg-emerald-50/70 border-emerald-300" : "bg-emerald-950/30 border-emerald-500/40"
              }`}>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">EFT Payment Remittance Reference</span>
                  <span className="text-sm sm:text-base font-black font-mono text-emerald-800 dark:text-emerald-300">{paymentReference}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(paymentReference, "Payment Reference")}
                  className="h-8 w-8 p-0"
                >
                  <Copy className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </Button>
              </div>
            </div>
          </div>

          {/* Payment QR Code */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-950/80 border border-slate-800 rounded-2xl text-center flex-none">
            <PaymentQrCode
              accountName={company.bankName}
              bsb={company.bsb}
              accountNumber={company.accountNumberRaw}
              reference={paymentReference}
              amount={quote.client.depositAmount || 1650}
            />
            <span className="text-[11px] text-slate-400 mt-2 font-medium">Scan to pay deposit with bank app</span>
          </div>
        </div>
      </div>

      {/* Official Inclusion & Digital Brochures */}
      <div
        className={`p-6 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all ${
          isLight
            ? "bg-white border-slate-200 shadow-sm"
            : "bg-slate-900/60 border-slate-800/80"
        }`}
      >
        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-700/30">
          <BookOpen className="h-5 w-5 text-indigo-400" />
          <h3 className={`text-base sm:text-lg font-bold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-white"}`}>
            Official Digital Brochures &amp; Inclusions Guides
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BROCHURES.map((b) => (
            <a
              key={b.title}
              href={b.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`p-4 rounded-xl border flex items-center justify-between gap-3 transition-all hover:scale-[1.02] cursor-pointer ${
                isLight
                  ? "bg-slate-50 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50"
                  : "bg-slate-950/70 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900"
              }`}
            >
              <div className="space-y-0.5">
                <span className="text-xs uppercase font-extrabold text-indigo-500 dark:text-indigo-400 block">{b.tier}</span>
                <span className={`text-sm font-bold block ${isLight ? "text-slate-900" : "text-white"}`}>{b.title}</span>
              </div>
              <ExternalLink className="h-4 w-4 text-slate-400 shrink-0" />
            </a>
          ))}
        </div>
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

          <Link to="/tender-request">
            <Button
              type="button"
              className="h-14 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-base shadow-lg shadow-amber-500/20 gap-2 cursor-pointer"
            >
              <Send className="h-5 w-5" />
              Submit Tender (ATP)
            </Button>
          </Link>

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
