import React, { useState, useMemo, useEffect } from "react";
import {
  Compass,
  Check,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Building2,
  Flame,
  Volume2,
  Shovel,
  AlertTriangle,
  Waves,
  Hammer,
  Truck,
  FileText,
  Shield,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatAud } from "@/lib/pricing";
import {
  calculateDesignGFA,
  isDoubleStoreyDesign,
  getSoilRatePerM2,
  calculateTopographyFallCost,
} from "@/lib/quoting/quoteEngine";
import type { FullQuote, SiteConditions, SoilClass, DepositType } from "@/lib/quoting/quoteTypes";
import { toast } from "sonner";

interface V2StepSiteCostsProps {
  quote: FullQuote;
  site: FullQuote["siteConditions"];
  onChange: (patch: Partial<FullQuote["siteConditions"]>) => void;
  onClientChange?: (patch: Partial<FullQuote["client"]>) => void;
  onNext: () => void;
  onPrev: () => void;
  isLight: boolean;
}

type SiteTypeOption = "greenfield" | "brownfield" | "kdrb";

const SOIL_OPTIONS: { id: SoilClass; label: string; desc: string }[] = [
  { id: "Class M", label: "Class M", desc: "Moderately reactive (Standard builder baseline)" },
  { id: "Class H1", label: "Class H1", desc: "Highly reactive clay foundation" },
  { id: "Class H2", label: "Class H2", desc: "Severely reactive deep clay foundation" },
  { id: "Class E", label: "Class E", desc: "Extremely reactive foundation" },
  { id: "Class P", label: "Class P", desc: "Problem site / uncontrolled or deep fill" },
];

const COUNCIL_REGIONS: { name: string; fee: number }[] = [
  { name: "Moreton Bay Regional Council", fee: 2227 },
  { name: "Logan City Council", fee: 2227 },
  { name: "Ipswich City Council", fee: 2227 },
  { name: "Gold Coast City Council", fee: 2950 },
  { name: "Sunshine Coast Council", fee: 2950 },
  { name: "Redland City Council", fee: 2227 },
  { name: "Toowoomba Regional Council", fee: 2227 },
  { name: "Brisbane City Council", fee: 0 },
  { name: "Tweed Shire Council (NSW)", fee: 2000 },
];

const BAL_OPTIONS = [
  { id: "BAL-12.5", label: "BAL 12.5 (Low)", cost: 5500 },
  { id: "BAL-19", label: "BAL 19 (Moderate)", cost: 8900 },
  { id: "BAL-29", label: "BAL 29 (High)", cost: 14500 },
  { id: "BAL-40", label: "BAL 40 (Very High)", cost: 26000 },
];

const ACOUSTIC_CATEGORIES = [
  { id: "Category 1", label: "Category 1 (Suburban Arterial)", cost: 3800 },
  { id: "Category 2", label: "Category 2 (State Route / Major Highway)", cost: 7200 },
  { id: "Category 3", label: "Category 3 (Rail Corridor / Direct Motorway)", cost: 12500 },
];

export function V2StepSiteCosts({
  quote,
  site,
  onChange,
  onClientChange,
  onNext,
  onPrev,
  isLight,
}: V2StepSiteCostsProps) {
  // 1. Site Type: Greenfield, Brownfield, KDRB
  const [siteType, setSiteType] = useState<SiteTypeOption>(() => {
    if (site.siteType) return site.siteType;
    if (quote.client.depositType === "kdrb") return "kdrb";
    if (quote.client.depositType === "brownfield") return "brownfield";
    return "greenfield";
  });

  // Progressive 1-by-1 disclosure stage (1 to 7)
  const [revealedStage, setRevealedStage] = useState<number>(() => {
    // If the estimate already has explicit site conditions saved, reveal up to that stage
    if (site.councilRegion || (site.councilFee ?? 0) > 0 || site.bushfireReportRequired || site.floodReportRequired) return 7;
    if (site.retainingWallAllowance || site.materialHandlingAllowance || site.outOfZoneSurcharge) return 5;
    if (site.kdrbDemolitionOption && site.kdrbDemolitionOption !== "none") return 4;
    if (site.soilClass && site.soilClass !== "Class M") return 3;
    if (site.fallMeters !== undefined && site.fallMeters > 0) return 2;
    // For fresh unconfigured quotes, start strictly at Stage 1 (only Site Type is visible!)
    return site.siteType ? 2 : 1;
  });

  const gfaM2 = useMemo(() => calculateDesignGFA(quote.design), [quote.design]);
  const isSplit = useMemo(
    () => quote.design.housingType === "Split Level",
    [quote.design.housingType]
  );

  // Canonical ground area rate for piering calculation
  const pieringSqmRate = useMemo(() => {
    if (siteType === "kdrb") return 50;
    if (siteType === "brownfield") return 30;
    return 25; // Greenfield
  }, [siteType]);

  // Default council fee based on selected region
  const defaultCouncilFee = useMemo(() => {
    const matched = COUNCIL_REGIONS.find((c) => c.name === (site.councilRegion || "Moreton Bay Regional Council"));
    return matched ? matched.fee : 2227;
  }, [site.councilRegion]);

  const currentCouncilFee = site.councilFee !== undefined && site.councilFee > 0 ? site.councilFee : defaultCouncilFee;

  // Handle Site Type Selection (Greenfield, Brownfield, KDRB)
  const handleSelectSiteType = (type: SiteTypeOption) => {
    setSiteType(type);
    setRevealedStage((prev) => Math.max(prev, 2));

    const depositAmount = type === "greenfield" ? 1650 : 3300;
    const rate = type === "kdrb" ? 50 : type === "brownfield" ? 30 : 25;
    const autoPieringLumpSum = Math.round(gfaM2 * rate);

    // Update site conditions
    const patch: Partial<SiteConditions> = {
      siteType: type,
      screwPieringRequired: true,
      screwPieringCost: autoPieringLumpSum,
      pieringCost: autoPieringLumpSum,
      demolitionAsbestosRequired: type === "kdrb",
      kdrbDemolitionOption: type === "kdrb" ? "builder" : "none",
      demolitionAsbestosCost: type === "kdrb" ? 34500 : 0,
      councilRegion: site.councilRegion || "Moreton Bay Regional Council",
      councilFee: currentCouncilFee,
    };
    onChange(patch);

    // Automatically update Client deposit type and deposit amount so estimate PDF updates on last page!
    if (onClientChange) {
      onClientChange({
        depositType: type as DepositType,
        depositAmount: depositAmount + (quote.client.custom3dTourSelected ? 800 : 0),
      });
    }

    toast.success(
      `Selected ${
        type === "greenfield"
          ? "Greenfield Site ($1,650 Deposit)"
          : type === "brownfield"
          ? "Brownfield Site ($3,300 Deposit)"
          : "Knock-Down Rebuild ($3,300 Deposit)"
      }`
    );
  };

  // Slope Fall Handler
  const handleFallChange = (rawMeters: number | string) => {
    const val = typeof rawMeters === "string" ? parseFloat(rawMeters) || 0 : rawMeters;
    const fallMeters = Math.max(0, val);
    const fallTotalCost = calculateTopographyFallCost(fallMeters, gfaM2, isSplit);
    setRevealedStage((prev) => Math.max(prev, 3));
    onChange({
      fallMeters,
      fallTotalCost,
    });
  };

  // Soil Class Handler
  const handleSoilClassChange = (soilClass: SoilClass) => {
    const rate = getSoilRatePerM2(soilClass);
    const soilTotalCost = Math.round(rate * gfaM2);
    setRevealedStage((prev) => Math.max(prev, siteType === "kdrb" ? 4 : 5));
    onChange({
      soilClass,
      soilCostSqm: rate,
      soilTotalCost,
    });
  };

  // Piering Lump Sum Handler (user can directly edit the lump sum amount without seeing $/sqm)
  const handlePieringLumpSumChange = (valStr: string) => {
    const cost = parseFloat(valStr) || 0;
    onChange({
      screwPieringRequired: cost > 0,
      screwPieringCost: cost,
      pieringCost: cost,
    });
  };

  // Ensure initial fall, soil, and piering costs are calibrated if fresh
  useEffect(() => {
    if (!site.pieringCost && gfaM2 > 0) {
      const lump = Math.round(gfaM2 * pieringSqmRate);
      onChange({
        screwPieringRequired: true,
        screwPieringCost: lump,
        pieringCost: lump,
      });
    }
  }, [gfaM2, pieringSqmRate]);

  // Current piering allowance
  const currentPieringCost = site.pieringCost ?? site.screwPieringCost ?? Math.round(gfaM2 * pieringSqmRate);

  // Overlay state toggles
  const [hasBushfire, setHasBushfire] = useState(Boolean(site.bushfireReportRequired || (site.bushfireCost || 0) > 0));
  const [hasFlood, setHasFlood] = useState(Boolean(site.floodReportRequired || (site.floodOverlayCost || 0) > 0));
  const [hasAcoustic, setHasAcoustic] = useState(Boolean(site.acousticReportRequired || (site.acousticCost || 0) > 0));
  const [hasSewer, setHasSewer] = useState(Boolean(site.cctvSewerReportRequired || site.sewerBridgingRequired));

  // Toggle Bushfire
  const handleToggleBushfire = (active: boolean) => {
    setHasBushfire(active);
    if (active) {
      onChange({
        bushfireReportRequired: true,
        bushfireReportCost: 850,
        bushfireBal: site.bushfireBal === "None" ? "BAL-12.5" : site.bushfireBal || "BAL-12.5",
        bushfireCost: site.bushfireCost > 0 ? site.bushfireCost : 5500,
      });
    } else {
      onChange({
        bushfireReportRequired: false,
        bushfireReportCost: 0,
        bushfireBal: "None",
        bushfireCost: 0,
      });
    }
  };

  // Toggle Flood
  const handleToggleFlood = (active: boolean) => {
    setHasFlood(active);
    if (active) {
      onChange({
        floodReportRequired: true,
        floodReportCost: 7600,
        floodOverlayRequired: true,
        floodOverlayCost: site.floodOverlayCost > 0 ? site.floodOverlayCost : 6500,
      });
    } else {
      onChange({
        floodReportRequired: false,
        floodReportCost: 0,
        floodOverlayRequired: false,
        floodOverlayCost: 0,
      });
    }
  };

  // Toggle Acoustic
  const handleToggleAcoustic = (active: boolean) => {
    setHasAcoustic(active);
    if (active) {
      onChange({
        acousticReportRequired: true,
        acousticReportCost: 1200,
        acousticTier: site.acousticTier === "None" ? "Category 1" : site.acousticTier || "Category 1",
        acousticCost: site.acousticCost > 0 ? site.acousticCost : 3800,
      });
    } else {
      onChange({
        acousticReportRequired: false,
        acousticReportCost: 0,
        acousticTier: "None",
        acousticCost: 0,
      });
    }
  };

  // Toggle Sewer
  const handleToggleSewer = (active: boolean) => {
    setHasSewer(active);
    if (active) {
      onChange({
        cctvSewerReportRequired: true,
        cctvSewerReportCost: 850,
        sewerBridgingRequired: true,
        sewerBridgingCost: site.sewerBridgingCost > 0 ? site.sewerBridgingCost : 4500,
      });
    } else {
      onChange({
        cctvSewerReportRequired: false,
        cctvSewerReportCost: 0,
        sewerBridgingRequired: false,
        sewerBridgingCost: 0,
      });
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Prompt */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/50 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs">
              3
            </span>
            <span className="text-xs uppercase tracking-wider font-bold text-emerald-400">Step 3 of 5</span>
          </div>
          <h2 className={`text-2xl font-bold mt-1 ${isLight ? "text-slate-900" : "text-white"}`}>
            Site Costs &amp; Earthworks
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure site type, slope fall, foundation piering, allowances, overlays, and statutory council fees.
          </p>
        </div>

        {/* Action Controls & Live Site Subtotal */}
        <div className="flex items-center gap-3 self-start sm:self-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRevealedStage((prev) => (prev < 7 ? 7 : 2))}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-semibold h-8 px-2.5 border border-emerald-500/20 rounded-lg cursor-pointer"
          >
            {revealedStage < 7 ? "⚡ Show All Sections" : "Step-by-Step Mode"}
          </Button>

          <div
            className={`py-2 px-4 rounded-xl border text-right ${
              isLight ? "bg-slate-50 border-slate-200 shadow-xs" : "bg-slate-950/60 border-slate-800"
            }`}
          >
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
              Site Costs Subtotal
            </span>
            <span className={`text-lg font-bold font-mono ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
              +{formatAud((quote.pricing?.siteCostsSubtotal || 0) + (quote.pricing?.councilStatutorySubtotal || 0))}
            </span>
          </div>
        </div>
      </div>

      {/* STEP 1: TYPE OF SITE WE'RE BUILDING ON (Greenfield, Brownfield, KDRB) */}
      <div
        className={`p-6 rounded-2xl border transition-all ${
          isLight
            ? "bg-white border-slate-200 shadow-sm"
            : "bg-slate-900/60 border-slate-800/80 backdrop-blur-md"
        }`}
      >
        <div className="mb-4">
          <Label className={`text-xs font-bold uppercase tracking-wider block ${isLight ? "text-slate-700" : "text-slate-300"}`}>
            1. Select Site Type
          </Label>
          <p className="text-xs text-slate-400 mt-0.5">
            Automatically updates the preliminary deposit and banking schedule on your estimate PDF.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Greenfield */}
          <div
            onClick={() => handleSelectSiteType("greenfield")}
            className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between ${
              siteType === "greenfield"
                ? isLight
                  ? "bg-emerald-50/90 border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
                  : "bg-emerald-950/30 border-emerald-400 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-400"
                : isLight
                ? "bg-slate-50 border-slate-200 hover:border-slate-300"
                : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">🌿</span>
                {siteType === "greenfield" && <Check className="h-4 w-4 text-emerald-500 stroke-[3]" />}
              </div>
              <h4 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                Greenfield Site
              </h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                New masterplanned estate or registered residential subdivision with engineered services.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-700/40 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-semibold">Tender Deposit</span>
              <span className="text-xs font-bold font-mono text-emerald-400">$1,650 Deposit</span>
            </div>
          </div>

          {/* Brownfield */}
          <div
            onClick={() => handleSelectSiteType("brownfield")}
            className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between ${
              siteType === "brownfield"
                ? isLight
                  ? "bg-emerald-50/90 border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
                  : "bg-emerald-950/30 border-emerald-400 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-400"
                : isLight
                ? "bg-slate-50 border-slate-200 hover:border-slate-300"
                : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">🏘️</span>
                {siteType === "brownfield" && <Check className="h-4 w-4 text-emerald-500 stroke-[3]" />}
              </div>
              <h4 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                Brownfield Site
              </h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Established suburb, infill vacant allotment, or battle-axe parcel subject to local council planning.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-700/40 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-semibold">Tender Deposit</span>
              <span className="text-xs font-bold font-mono text-emerald-400">$3,300 Deposit</span>
            </div>
          </div>

          {/* KDRB */}
          <div
            onClick={() => handleSelectSiteType("kdrb")}
            className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between ${
              siteType === "kdrb"
                ? isLight
                  ? "bg-emerald-50/90 border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
                  : "bg-emerald-950/30 border-emerald-400 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-400"
                : isLight
                ? "bg-slate-50 border-slate-200 hover:border-slate-300"
                : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl">🏗️</span>
                {siteType === "kdrb" && <Check className="h-4 w-4 text-emerald-500 stroke-[3]" />}
              </div>
              <h4 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                Knock-Down Rebuild (KDRB)
              </h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Existing home to be demolished and replaced with a new build. Includes screw piering allowance.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-700/40 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-semibold">Tender Deposit</span>
              <span className="text-xs font-bold font-mono text-emerald-400">$3,300 Deposit</span>
            </div>
          </div>
        </div>
      </div>

      {/* STEP 2: SLOPE FALL (ONLY APPEARS ONCE SITE TYPE SELECTED) */}
      {revealedStage >= 2 && (
        <div
          className={`p-6 rounded-2xl border transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
            isLight
              ? "bg-white border-slate-200 shadow-sm"
              : "bg-slate-900/60 border-slate-800/80 backdrop-blur-md"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <Label className={`text-xs font-bold uppercase tracking-wider block ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                2. Land Slope &amp; Contour Fall
              </Label>
              <p className="text-xs text-slate-400 mt-0.5">
                Type the exact elevation fall across your proposed building envelope in metres.
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase text-slate-400 font-semibold block">Fall Earthworks Cost</span>
              <span className={`text-sm font-mono font-bold ${isLight ? "text-slate-900" : "text-emerald-400"}`}>
                {formatAud(site.fallTotalCost || 0)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            {/* Exact typed slope input */}
            <div className="sm:col-span-5 space-y-1.5">
              <Label className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                Exact Fall (Metres)
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.05"
                  min="0"
                  max="5"
                  value={site.fallMeters || 0}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => handleFallChange(e.target.value)}
                  className={`text-sm h-11 font-mono font-bold pl-3 pr-12 ${
                    isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-slate-950/80 border-slate-800 text-white"
                  }`}
                />
                <span className="absolute right-3.5 top-3.5 text-xs text-slate-400 font-bold">m</span>
              </div>
            </div>

            {/* Quick selector buttons */}
            <div className="sm:col-span-7 space-y-1.5">
              <Label className="text-xs text-slate-400">Quick Preset Contours</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { m: 0, label: "0m Flat" },
                  { m: 0.5, label: "0.5m Gentle" },
                  { m: 1.0, label: "1.0m Moderate" },
                  { m: 1.5, label: "1.5m Steep" },
                  { m: 2.0, label: "2.0m Severe" },
                ].map(({ m, label }) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleFallChange(m)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                      site.fallMeters === m
                        ? "bg-emerald-500 text-slate-950 border-emerald-400 font-bold"
                        : isLight
                        ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        : "bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {revealedStage === 2 && (
            <div className="flex justify-end pt-3 mt-4 border-t border-slate-700/20">
              <Button
                type="button"
                size="sm"
                onClick={() => setRevealedStage((prev) => Math.max(prev, 3))}
                className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 gap-1.5 font-bold cursor-pointer"
              >
                <span>Proceed to Soil Class &amp; Foundations</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: SOIL CLASS, 32MPA CONCRETE, FLEXIBLE SERVICES & PIERING ALLOWANCE */}
      {revealedStage >= 3 && (
        <div
          className={`p-6 rounded-2xl border transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
            isLight
              ? "bg-white border-slate-200 shadow-sm"
              : "bg-slate-900/60 border-slate-800/80 backdrop-blur-md"
          }`}
        >
          <div className="mb-4">
            <Label className={`text-xs font-bold uppercase tracking-wider block ${isLight ? "text-slate-700" : "text-slate-300"}`}>
              3. Soil Class, Concrete Specification &amp; Piering Allowance
            </Label>
            <p className="text-xs text-slate-400 mt-0.5">
              Foundation slab engineering, 32MPa concrete, flexible services, and piering allowance.
            </p>
          </div>

          <div className="space-y-4">
            {/* Soil Class Dropdown */}
            <div className="space-y-1.5">
              <Label className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                Geotechnical Soil Classification
              </Label>
              <Select
                value={site.soilClass || "Class M"}
                onValueChange={(val) => handleSoilClassChange(val as SoilClass)}
              >
                <SelectTrigger
                  className={`h-11 text-sm ${
                    isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-slate-950/80 border-slate-800 text-white"
                  }`}
                >
                  <SelectValue placeholder="Select Soil Class" />
                </SelectTrigger>
                <SelectContent>
                  {SOIL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      <span className="font-bold mr-2">{opt.label}</span>
                      <span className="text-slate-400 text-xs">({opt.desc})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 32MPa Concrete & Flexible Services Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                }`}
              >
                <div>
                  <span className={`text-xs font-bold block ${isLight ? "text-slate-900" : "text-white"}`}>
                    32MPa High-Strength Concrete
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Higher compressive slab rating for reactive soil
                  </span>
                </div>
                <Switch
                  checked={Boolean(site.concrete32MpaRequired)}
                  onCheckedChange={(checked) =>
                    onChange({
                      concrete32MpaRequired: checked,
                      concrete32MpaCost: checked ? Math.round(gfaM2 * 14) : 0,
                    })
                  }
                />
              </div>

              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                }`}
              >
                <div>
                  <span className={`text-xs font-bold block ${isLight ? "text-slate-900" : "text-white"}`}>
                    Flexible Plumbing Service Connections
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Articulated pipe couplings for reactive soil movement
                  </span>
                </div>
                <Switch
                  checked={Boolean(site.flexibleConnectionsRequired)}
                  onCheckedChange={(checked) =>
                    onChange({
                      flexibleConnectionsRequired: checked,
                      flexibleConnectionsCost: checked ? 1800 : 0,
                    })
                  }
                />
              </div>
            </div>

            {/* PIERING ALLOWANCE (LUMP SUM - RATE HIDDEN PER REQUIREMENT) */}
            <div
              className={`p-4 rounded-xl border ${
                isLight ? "bg-emerald-50/60 border-emerald-300" : "bg-emerald-950/20 border-emerald-500/40"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-emerald-500 uppercase tracking-wider">
                      {siteType === "kdrb" ? "Screw Piering Allowance" : "Foundation Piering Allowance"}
                    </span>
                    <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/40">
                      Auto-Calculated
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Allowance for piering if required, and subject to geotech report.
                  </p>
                </div>

                <div className="w-full sm:w-48">
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">$</span>
                    <Input
                      type="number"
                      step="100"
                      value={currentPieringCost}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handlePieringLumpSumChange(e.target.value)}
                      className="h-10 text-sm font-mono font-bold pl-7 pr-3 bg-white dark:bg-slate-950 border-emerald-500/50"
                    />
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 pt-1 flex items-center gap-1.5">
                <HelpCircle className="h-3 w-3 text-emerald-500" />
                <span>
                  Calibrated for {quote.design.designName || "home"} ground floor area ({gfaM2} m² footprint). User-editable lump sum.
                </span>
              </div>
            </div>
          </div>

          {revealedStage === 3 && (
            <div className="flex justify-end pt-3 mt-4 border-t border-slate-700/20">
              <Button
                type="button"
                size="sm"
                onClick={() => setRevealedStage((prev) => Math.max(prev, siteType === "kdrb" ? 4 : 5))}
                className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 gap-1.5 font-bold cursor-pointer"
              >
                <span>{siteType === "kdrb" ? "Proceed to Demolition & Asbestos" : "Proceed to Site Allowances"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: KDRB HOUSE DEMOLITION & ASBESTOS (ONLY APPEARS IF KDRB SELECTED) */}
      {siteType === "kdrb" && revealedStage >= 4 && (
        <div
          className={`p-6 rounded-2xl border transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
            isLight
              ? "bg-amber-50/70 border-amber-300 shadow-sm"
              : "bg-amber-950/20 border-amber-500/40 backdrop-blur-md"
          }`}
        >
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <Hammer className="h-4 w-4 text-amber-500" />
              <Label className={`text-xs font-bold uppercase tracking-wider block ${isLight ? "text-amber-950" : "text-amber-300"}`}>
                4. Existing House Demolition &amp; Asbestos Removal (KDRB)
              </Label>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Specify how the existing residential structure will be cleared prior to construction start.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                id: "builder",
                title: "Hudson Homes Demolition Allowance",
                desc: "Complete dwelling demo, asbestos abatement, site clearance & certification.",
                amount: site.demolitionAsbestosCost || 34500,
              },
              {
                id: "owner",
                title: "Demolition Done by Owner ($0)",
                desc: "Owner coordinates demolition and tree removal directly prior to builder site start.",
                amount: 0,
              },
              {
                id: "none",
                title: "Not Required / Already Vacant Allotment ($0)",
                desc: "Site is already cleared, pegged, and ready for immediate construction.",
                amount: 0,
              },
            ].map((opt) => {
              const isSelected = (site.kdrbDemolitionOption || "builder") === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => {
                    onChange({
                      kdrbDemolitionOption: opt.id as any,
                      demolitionAsbestosRequired: opt.id !== "none",
                      demolitionAsbestosCost: opt.amount,
                    });
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? isLight
                        ? "bg-white border-amber-500 shadow-xs ring-1 ring-amber-500"
                        : "bg-amber-500/20 border-amber-400 text-white shadow-sm ring-1 ring-amber-400"
                      : isLight
                      ? "bg-white/60 border-slate-200 hover:bg-white text-slate-700"
                      : "bg-slate-900/60 border-slate-800 hover:bg-slate-900 text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center flex-none border ${
                        isSelected
                          ? "bg-amber-500 border-amber-500 text-slate-950"
                          : "border-slate-500 text-transparent"
                      }`}
                    >
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                    <div>
                      <span className="text-xs font-bold block">{opt.title}</span>
                      <span className="text-[10px] text-slate-400 block">{opt.desc}</span>
                    </div>
                  </div>

                  <div className="text-right flex-none">
                    <span className="text-xs font-bold font-mono">
                      {opt.amount > 0 ? formatAud(opt.amount) : "$0"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {revealedStage === 4 && (
            <div className="flex justify-end pt-3 mt-4 border-t border-amber-500/20">
              <Button
                type="button"
                size="sm"
                onClick={() => setRevealedStage((prev) => Math.max(prev, 5))}
                className="text-xs bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 gap-1.5 font-bold cursor-pointer"
              >
                <span>Proceed to Site Allowances</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* STEP 5: NEW SITE COSTS SECTION (RETAINING, MATERIAL HANDLING, OUT OF ZONE, ROCK BREAKER, UNKNOWN CONDITIONS) */}
      {revealedStage >= 5 && (
        <div
          className={`p-6 rounded-2xl border transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
            isLight
              ? "bg-white border-slate-200 shadow-sm"
              : "bg-slate-900/60 border-slate-800/80 backdrop-blur-md"
          }`}
        >
          <div className="mb-4">
            <Label className={`text-xs font-bold uppercase tracking-wider block ${isLight ? "text-slate-700" : "text-slate-300"}`}>
              {siteType === "kdrb" ? "5." : "4."} Site Specific Allowances &amp; Surcharges
            </Label>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter provisional contingency allowances for retaining walls, materials handling, travel zones, rock excavation, and unforeseen ground conditions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Retaining Wall Allowance */}
            <div className="space-y-1.5">
              <Label className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                Retaining Wall Allowance
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">$</span>
                <Input
                  type="number"
                  step="500"
                  value={site.retainingWallAllowance || 0}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => onChange({ retainingWallAllowance: parseFloat(e.target.value) || 0 })}
                  className="h-10 text-sm font-mono pl-7"
                />
              </div>
            </div>

            {/* Material Handling Allowance */}
            <div className="space-y-1.5">
              <Label className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                Material Handling &amp; Access
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">$</span>
                <Input
                  type="number"
                  step="500"
                  value={site.materialHandlingAllowance || 0}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => onChange({ materialHandlingAllowance: parseFloat(e.target.value) || 0 })}
                  className="h-10 text-sm font-mono pl-7"
                />
              </div>
            </div>

            {/* Out of Zone Surcharge */}
            <div className="space-y-1.5">
              <Label className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                Out of Zone Surcharge
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">$</span>
                <Input
                  type="number"
                  step="500"
                  value={site.outOfZoneSurcharge || 0}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => onChange({ outOfZoneSurcharge: parseFloat(e.target.value) || 0 })}
                  className="h-10 text-sm font-mono pl-7"
                />
              </div>
            </div>

            {/* Rock Breaker Allowance */}
            <div className="space-y-1.5">
              <Label className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                Rock Breaker Allowance
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">$</span>
                <Input
                  type="number"
                  step="500"
                  value={site.rockExcavationAllowance || 0}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => onChange({ rockExcavationAllowance: parseFloat(e.target.value) || 0 })}
                  className="h-10 text-sm font-mono pl-7"
                />
              </div>
            </div>

            {/* Unknown Site Conditions Allowance */}
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
              <Label className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                Unknown Site Conditions Allowance (Contingency)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">$</span>
                <Input
                  type="number"
                  step="500"
                  value={site.unknownSiteConditionsAllowance || 0}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => onChange({ unknownSiteConditionsAllowance: parseFloat(e.target.value) || 0 })}
                  className="h-10 text-sm font-mono pl-7"
                />
              </div>
            </div>
          </div>

          {revealedStage === 5 && (
            <div className="flex justify-end pt-3 mt-4 border-t border-slate-700/20">
              <Button
                type="button"
                size="sm"
                onClick={() => setRevealedStage((prev) => Math.max(prev, 6))}
                className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 gap-1.5 font-bold cursor-pointer"
              >
                <span>Proceed to Overlays &amp; Site Problems</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* STEP 6: OVERLAYS / SITE PROBLEMS (BUSHFIRE, FLOOD, ACOUSTIC, SEWER LINE) */}
      {revealedStage >= 6 && (
        <div
          className={`p-6 rounded-2xl border transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
            isLight
              ? "bg-white border-slate-200 shadow-sm"
              : "bg-slate-900/60 border-slate-800/80 backdrop-blur-md"
          }`}
        >
          <div className="mb-4">
            <Label className={`text-xs font-bold uppercase tracking-wider block ${isLight ? "text-slate-700" : "text-slate-300"}`}>
              {siteType === "kdrb" ? "6." : "5."} Overlays &amp; Site Problems
            </Label>
            <p className="text-xs text-slate-400 mt-0.5">
              Select any applicable environmental planning overlays. Selecting an overlay automatically includes the specialist engineering report and unlocks editable construction costs.
            </p>
          </div>

          <div className="space-y-4">
            {/* 1. BUSHFIRE */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                hasBushfire
                  ? isLight
                    ? "bg-orange-50/70 border-orange-400"
                    : "bg-orange-950/20 border-orange-500/40"
                  : isLight
                  ? "bg-slate-50 border-slate-200"
                  : "bg-slate-950/60 border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <div>
                    <span className={`text-xs font-bold block ${isLight ? "text-slate-900" : "text-white"}`}>
                      Bushfire Overlay (BAL Rating)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Auto-includes $850 Bushfire Management Report
                    </span>
                  </div>
                </div>
                <Switch checked={hasBushfire} onCheckedChange={handleToggleBushfire} />
              </div>

              {hasBushfire && (
                <div className="mt-3 pt-3 border-t border-orange-500/20 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-400">BAL Rating Level</Label>
                    <Select
                      value={site.bushfireBal || "BAL-12.5"}
                      onValueChange={(val) => {
                        const matched = BAL_OPTIONS.find((b) => b.id === val);
                        onChange({
                          bushfireBal: val as any,
                          bushfireCost: matched ? matched.cost : 5500,
                        });
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BAL_OPTIONS.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-400">BAL Construction Cost ($)</Label>
                    <Input
                      type="number"
                      step="100"
                      value={site.bushfireCost || 5500}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => onChange({ bushfireCost: parseFloat(e.target.value) || 0 })}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. FLOOD */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                hasFlood
                  ? isLight
                    ? "bg-blue-50/70 border-blue-400"
                    : "bg-blue-950/20 border-blue-500/40"
                  : isLight
                  ? "bg-slate-50 border-slate-200"
                  : "bg-slate-950/60 border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Waves className="h-4 w-4 text-blue-500" />
                  <div>
                    <span className={`text-xs font-bold block ${isLight ? "text-slate-900" : "text-white"}`}>
                      Flood Overlay (Defined Flood Level)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Auto-includes $7,600 Hydraulic Assessment Report
                    </span>
                  </div>
                </div>
                <Switch checked={hasFlood} onCheckedChange={handleToggleFlood} />
              </div>

              {hasFlood && (
                <div className="mt-3 pt-3 border-t border-blue-500/20 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div className="text-[11px] text-slate-400">
                    Slab elevation &amp; elevated piering construction works
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-400">Flood Allowance Cost ($)</Label>
                    <Input
                      type="number"
                      step="500"
                      value={site.floodOverlayCost || 6500}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => onChange({ floodOverlayCost: parseFloat(e.target.value) || 0 })}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. ACOUSTIC */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                hasAcoustic
                  ? isLight
                    ? "bg-purple-50/70 border-purple-400"
                    : "bg-purple-950/20 border-purple-500/40"
                  : isLight
                  ? "bg-slate-50 border-slate-200"
                  : "bg-slate-950/60 border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Volume2 className="h-4 w-4 text-purple-500" />
                  <div>
                    <span className={`text-xs font-bold block ${isLight ? "text-slate-900" : "text-white"}`}>
                      Acoustic Overlay / Noise Corridor
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Auto-includes $1,200 Certified Acoustic Engineer Report
                    </span>
                  </div>
                </div>
                <Switch checked={hasAcoustic} onCheckedChange={handleToggleAcoustic} />
              </div>

              {hasAcoustic && (
                <div className="mt-3 pt-3 border-t border-purple-500/20 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-400">Noise Category</Label>
                    <Select
                      value={site.acousticTier || "Category 1"}
                      onValueChange={(val) => {
                        const matched = ACOUSTIC_CATEGORIES.find((c) => c.id === val);
                        onChange({
                          acousticTier: val as any,
                          acousticCost: matched ? matched.cost : 3800,
                        });
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACOUSTIC_CATEGORIES.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-400">Acoustic Glazing &amp; Seals Cost ($)</Label>
                    <Input
                      type="number"
                      step="200"
                      value={site.acousticCost || 3800}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => onChange({ acousticCost: parseFloat(e.target.value) || 0 })}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 4. SEWER LINE */}
            <div
              className={`p-4 rounded-xl border transition-all ${
                hasSewer
                  ? isLight
                    ? "bg-teal-50/70 border-teal-400"
                    : "bg-teal-950/20 border-teal-500/40"
                  : isLight
                  ? "bg-slate-50 border-slate-200"
                  : "bg-slate-950/60 border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Shovel className="h-4 w-4 text-teal-500" />
                  <div>
                    <span className={`text-xs font-bold block ${isLight ? "text-slate-900" : "text-white"}`}>
                      Sewer Line Near / Under Proposed Building Pad
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Auto-includes $850 CCTV Pipe Camera Inspection
                    </span>
                  </div>
                </div>
                <Switch checked={hasSewer} onCheckedChange={handleToggleSewer} />
              </div>

              {hasSewer && (
                <div className="mt-3 pt-3 border-t border-teal-500/20 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  <div className="text-[11px] text-slate-400">
                    Concrete encasement &amp; zone-of-influence pier bridging allowance
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] text-slate-400">Sewer Bridging Allowance ($)</Label>
                    <Input
                      type="number"
                      step="250"
                      value={site.sewerBridgingCost || 4500}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => onChange({ sewerBridgingCost: parseFloat(e.target.value) || 0 })}
                      className="h-9 text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {revealedStage === 6 && (
            <div className="flex justify-end pt-3 mt-4 border-t border-slate-700/20">
              <Button
                type="button"
                size="sm"
                onClick={() => setRevealedStage((prev) => Math.max(prev, 7))}
                className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 gap-1.5 font-bold cursor-pointer"
              >
                <span>Proceed to Council Fees &amp; Statutory Applications</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* STEP 7: COUNCIL FEES & STATUTORY LODGEMENT */}
      {revealedStage >= 7 && (
        <div
          className={`p-6 rounded-2xl border transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
            isLight
              ? "bg-white border-slate-200 shadow-sm"
              : "bg-slate-900/60 border-slate-800/80 backdrop-blur-md"
          }`}
        >
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-cyan-400" />
              <Label className={`text-xs font-bold uppercase tracking-wider block ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                {siteType === "kdrb" ? "7." : "6."} Council Fees &amp; Statutory Applications
              </Label>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Standard council fee automated by location with optional statutory applications.
            </p>
          </div>

          <div className="space-y-4">
            {/* Standard council selection */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-8 space-y-1.5">
                <Label className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                  Local Government Council Region
                </Label>
                <Select
                  value={site.councilRegion || "Moreton Bay Regional Council"}
                  onValueChange={(val) => {
                    const matched = COUNCIL_REGIONS.find((c) => c.name === val);
                    onChange({
                      councilRegion: val,
                      councilFee: matched ? matched.fee : 2227,
                    });
                  }}
                >
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder="Select Council" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNCIL_REGIONS.map((c) => (
                      <SelectItem key={c.name} value={c.name}>
                        {c.name} ({formatAud(c.fee)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-4 space-y-1.5">
                <Label className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                  Statutory Fee ($)
                </Label>
                <Input
                  type="number"
                  value={currentCouncilFee}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => onChange({ councilFee: parseFloat(e.target.value) || 0 })}
                  className="h-10 text-sm font-mono font-bold"
                />
              </div>
            </div>

            {/* Other Council Options */}
            <div className="space-y-2 pt-2 border-t border-slate-700/40">
              <Label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Additional Council &amp; Statutory Applications (Optional)
              </Label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Council DA */}
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold block">Council DA / Town Planning</span>
                    <span className="text-[10px] text-slate-400">Material Change of Use ($11,000)</span>
                  </div>
                  <Switch
                    checked={Boolean(site.councilDaRequired)}
                    onCheckedChange={(checked) =>
                      onChange({ councilDaRequired: checked, councilDaCost: checked ? 11000 : 0 })
                    }
                  />
                </div>

                {/* Setback Relaxation */}
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold block">Setback Relaxation / Dispensation</span>
                    <span className="text-[10px] text-slate-400">Boundary variation lodgement ($2,000)</span>
                  </div>
                  <Switch
                    checked={Boolean(site.councilSetbackRelaxationRequired)}
                    onCheckedChange={(checked) =>
                      onChange({
                        councilSetbackRelaxationRequired: checked,
                        councilSetbackRelaxationCost: checked ? 2000 : 0,
                      })
                    }
                  />
                </div>

                {/* Traffic Control */}
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold block">Traffic Guidance &amp; Safety Control</span>
                    <span className="text-[10px] text-slate-400">Permits, spotters &amp; signs ($6,500)</span>
                  </div>
                  <Switch
                    checked={Boolean(site.trafficControlRequired)}
                    onCheckedChange={(checked) =>
                      onChange({
                        trafficControlRequired: checked,
                        trafficControlCost: checked ? 6500 : 0,
                      })
                    }
                  />
                </div>

                {/* Sediment & Asset Protection */}
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                    isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold block">Sediment &amp; Asset Protection</span>
                    <span className="text-[10px] text-slate-400">Silt fences &amp; crossover ($1,950)</span>
                  </div>
                  <Switch
                    checked={Boolean((site.sedimentAssetProtectionCost || 0) > 0)}
                    onCheckedChange={(checked) =>
                      onChange({ sedimentAssetProtectionCost: checked ? 1950 : 0 })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
        <Button
          type="button"
          variant="outline"
          onClick={onPrev}
          className={`text-xs gap-1.5 ${
            isLight
              ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Floor Plan</span>
        </Button>

        <Button
          type="button"
          onClick={onNext}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold px-8 shadow-lg shadow-emerald-500/20 gap-2 cursor-pointer h-12"
        >
          Continue to House Variations
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
