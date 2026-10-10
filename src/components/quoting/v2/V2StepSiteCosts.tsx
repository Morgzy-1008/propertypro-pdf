import React, { useState, useMemo, useEffect, useRef } from "react";
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
    // Only if quote already progressed to variations step or beyond, show all sections
    if (quote.selectedUpgrades && quote.selectedUpgrades.length > 0) return 7;
    // Otherwise start strictly at Stage 1 so user starts with only Site Type
    return 1;
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

  // Progressive breadcrumbs stages list
  const stagesList = useMemo(() => {
    const list = [
      { id: "type", num: 1, displayNum: 1, title: "Site Type" },
      { id: "slope", num: 2, displayNum: 2, title: "Slope Fall" },
      { id: "foundations", num: 3, displayNum: 3, title: "Soil & Piering" },
    ];
    if (siteType === "kdrb") {
      list.push({ id: "demo", num: 4, displayNum: 4, title: "Demolition" });
      list.push({ id: "allowances", num: 5, displayNum: 5, title: "Site Allowances" });
      list.push({ id: "overlays", num: 6, displayNum: 6, title: "Overlays" });
      list.push({ id: "council", num: 7, displayNum: 7, title: "Council Fees" });
    } else {
      list.push({ id: "allowances", num: 5, displayNum: 4, title: "Site Allowances" });
      list.push({ id: "overlays", num: 6, displayNum: 5, title: "Overlays" });
      list.push({ id: "council", num: 7, displayNum: 6, title: "Council Fees" });
    }
    return list;
  }, [siteType]);

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

  const [isManualPiering, setIsManualPiering] = useState(false);
  const prevGfaRef = useRef<number>(gfaM2);
  const prevRateRef = useRef<number>(pieringSqmRate);

  // Piering Lump Sum Handler (user can directly edit the lump sum amount without seeing $/sqm)
  const handlePieringLumpSumChange = (valStr: string) => {
    setIsManualPiering(true);
    const cost = parseFloat(valStr) || 0;
    onChange({
      screwPieringRequired: cost > 0,
      screwPieringCost: cost,
      pieringCost: cost,
    });
  };

  // Ensure initial fall, soil, and piering costs are calibrated if fresh or if design footprint GFA changes
  useEffect(() => {
    if (gfaM2 > 0) {
      const lump = Math.round(gfaM2 * pieringSqmRate);
      const currentCost = Number(site.pieringCost ?? site.screwPieringCost ?? 0);
      const isOldBuggedAmount = currentCost > 0 && Math.abs(currentCost - Math.round(55.78 * pieringSqmRate)) <= 50;

      if (
        !site.pieringCost ||
        isOldBuggedAmount ||
        (!isManualPiering && (prevGfaRef.current !== gfaM2 || prevRateRef.current !== pieringSqmRate))
      ) {
        prevGfaRef.current = gfaM2;
        prevRateRef.current = pieringSqmRate;
        onChange({
          screwPieringRequired: true,
          screwPieringCost: lump,
          pieringCost: lump,
        });
      }
    }
  }, [gfaM2, pieringSqmRate, isManualPiering]);

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
        cctvSewerReportCost: site.cctvSewerReportCost && site.cctvSewerReportCost > 0 ? site.cctvSewerReportCost : 3500,
        sewerBridgingRequired: true,
        sewerBridgingCost: site.sewerBridgingCost && site.sewerBridgingCost > 0 ? site.sewerBridgingCost : 4500,
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
    <div className="space-y-8 max-w-7xl 2xl:max-w-[1550px] mx-auto px-2 sm:px-4">
      {/* Header Prompt */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/50 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-xs">
              3
            </span>
            <span className="text-xs uppercase tracking-wider font-extrabold text-emerald-400">Step 3 of 5</span>
          </div>
          <h2 className={`text-3xl sm:text-4xl font-extrabold tracking-tight mt-1.5 ${isLight ? "text-slate-900" : "text-white"}`}>
            Site Costs &amp; Earthworks
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-1 max-w-3xl">
            Configure site type, slope fall, foundation piering, allowances, overlays, and statutory council fees.
          </p>
        </div>

        {/* Action Controls & Live Site Subtotal */}
        <div className="flex items-center gap-3.5 self-start sm:self-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setRevealedStage((prev) => (prev < 7 ? 7 : 1))}
            className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 font-bold h-9 px-3 border border-emerald-500/20 rounded-xl cursor-pointer"
          >
            {revealedStage < 7 ? "⚡ Show All Sections" : "Step-by-Step Mode"}
          </Button>

          <div
            className={`py-2.5 px-5 rounded-2xl border text-right ${
              isLight ? "bg-slate-50 border-slate-200 shadow-xs" : "bg-slate-950/60 border-slate-800"
            }`}
          >
            <span className="text-xs uppercase tracking-wider text-slate-400 block font-bold">
              Site Costs Subtotal
            </span>
            <span className={`text-2xl sm:text-3xl font-extrabold font-mono ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
              +{formatAud((quote.pricing?.siteCostsSubtotal || 0) + (quote.pricing?.councilStatutorySubtotal || 0))}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Progressive Stage Stepper / Breadcrumbs */}
      <div
        className={`p-3 rounded-2xl border flex items-center justify-between gap-3 overflow-x-auto ${
          isLight ? "bg-slate-50/80 border-slate-200" : "bg-slate-950/40 border-slate-800/80"
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-2.5">
          {stagesList.map((stg) => {
            const isCompleted = revealedStage > stg.num;
            const isCurrent = revealedStage === stg.num;
            const isAccessible = revealedStage >= stg.num || revealedStage === 7;

            return (
              <button
                key={stg.id}
                type="button"
                disabled={!isAccessible}
                onClick={() => setRevealedStage(stg.num)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
                  isCurrent
                    ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm"
                    : isCompleted
                    ? isLight
                      ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                      : "bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800"
                    : isLight
                    ? "bg-transparent border-transparent text-slate-400 opacity-60 cursor-not-allowed"
                    : "bg-transparent border-transparent text-slate-600 opacity-60 cursor-not-allowed"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                    isCurrent
                      ? "bg-slate-950 text-emerald-400"
                      : isCompleted
                      ? "bg-emerald-500 text-slate-950"
                      : isLight
                      ? "bg-slate-200 text-slate-600"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : stg.displayNum}
                </span>
                <span>{stg.title}</span>
              </button>
            );
          })}
        </div>

        <span className="text-xs font-semibold text-slate-400 hidden md:inline px-3">
          Stage {Math.min(revealedStage, stagesList.length)} of {stagesList.length}
        </span>
      </div>

      {/* STEP 1: TYPE OF SITE WE'RE BUILDING ON (Greenfield, Brownfield, KDRB) */}
      <div
        className={`p-6 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all ${
          isLight
            ? "bg-white border-slate-200 shadow-sm"
            : "bg-slate-900/60 border-slate-800/80 backdrop-blur-md"
        }`}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Label className={`text-base sm:text-lg font-bold uppercase tracking-wider block ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                1. Select Site Type
              </Label>
              {revealedStage > 1 && (
                <Badge variant="outline" className="text-xs font-bold text-emerald-500 border-emerald-500/30 px-2.5 py-0.5">
                  <Check className="h-3.5 w-3.5 mr-1" />
                  {siteType === "greenfield" ? "Greenfield" : siteType === "brownfield" ? "Brownfield" : "KDRB"}
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Automatically updates the preliminary deposit and banking schedule on your estimate PDF.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Greenfield */}
          <div
            onClick={() => handleSelectSiteType("greenfield")}
            className={`p-5 sm:p-6 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between ${
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
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">🌿</span>
                {siteType === "greenfield" && <Check className="h-5 w-5 text-emerald-500 stroke-[3]" />}
              </div>
              <h4 className={`text-lg sm:text-xl font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                Greenfield Site
              </h4>
              <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
                New masterplanned estate or registered residential subdivision with engineered services.
              </p>
            </div>
            <div className="mt-5 pt-3.5 border-t border-slate-700/40 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">Tender Deposit</span>
              <span className="text-sm font-bold font-mono text-emerald-400">$1,650 Deposit</span>
            </div>
          </div>

          {/* Brownfield */}
          <div
            onClick={() => handleSelectSiteType("brownfield")}
            className={`p-5 sm:p-6 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between ${
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
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">🏘️</span>
                {siteType === "brownfield" && <Check className="h-5 w-5 text-emerald-500 stroke-[3]" />}
              </div>
              <h4 className={`text-lg sm:text-xl font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                Brownfield Site
              </h4>
              <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
                Established suburb, infill vacant allotment, or battle-axe parcel subject to local council planning.
              </p>
            </div>
            <div className="mt-5 pt-3.5 border-t border-slate-700/40 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">Tender Deposit</span>
              <span className="text-sm font-bold font-mono text-emerald-400">$3,300 Deposit</span>
            </div>
          </div>

          {/* KDRB */}
          <div
            onClick={() => handleSelectSiteType("kdrb")}
            className={`p-5 sm:p-6 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between ${
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
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">🏗️</span>
                {siteType === "kdrb" && <Check className="h-5 w-5 text-emerald-500 stroke-[3]" />}
              </div>
              <h4 className={`text-lg sm:text-xl font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                Knock-Down Rebuild (KDRB)
              </h4>
              <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed">
                Existing home to be demolished and replaced with a new build. Includes screw piering allowance.
              </p>
            </div>
            <div className="mt-5 pt-3.5 border-t border-slate-700/40 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-semibold">Tender Deposit</span>
              <span className="text-sm font-bold font-mono text-emerald-400">$3,300 Deposit</span>
            </div>
          </div>
        </div>

        {revealedStage === 1 && (
          <div className="flex justify-end pt-4 mt-5 border-t border-slate-700/20">
            <Button
              type="button"
              size="sm"
              onClick={() => setRevealedStage((prev) => Math.max(prev, 2))}
              className="text-sm h-11 px-5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 gap-2 font-bold cursor-pointer"
            >
              <span>Confirm Site Type &amp; Proceed to Slope Fall</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* STEP 2: SLOPE FALL (ONLY APPEARS ONCE SITE TYPE SELECTED) */}
      {revealedStage >= 2 && (
        <div
          className={`p-6 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
            isLight
              ? "bg-white border-slate-200 shadow-sm"
              : "bg-slate-900/60 border-slate-800/80 backdrop-blur-md"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <div className="flex items-center gap-3">
                <Label className={`text-base sm:text-lg font-bold uppercase tracking-wider block ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                  2. Land Slope &amp; Contour Fall
                </Label>
                {revealedStage > 2 && (
                  <Badge variant="outline" className="text-xs font-bold text-emerald-500 border-emerald-500/30 px-2.5 py-0.5">
                    <Check className="h-3.5 w-3.5 mr-1" />
                    {site.fallMeters || 0}m Fall
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Type the exact elevation fall across your proposed building envelope in metres.
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs uppercase text-slate-400 font-bold block">Fall Earthworks Cost</span>
              <span className={`text-xl font-mono font-extrabold ${isLight ? "text-slate-900" : "text-emerald-400"}`}>
                {formatAud(site.fallTotalCost || 0)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
            {/* Exact typed slope input */}
            <div className="sm:col-span-5 space-y-2">
              <Label className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-300"}`}>
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
                  className={`text-base h-12 rounded-xl font-mono font-bold pl-4 pr-12 ${
                    isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-slate-950/80 border-slate-800 text-white"
                  }`}
                />
                <span className="absolute right-4 top-3.5 text-sm text-slate-400 font-bold">m</span>
              </div>
            </div>

            {/* Quick selector buttons */}
            <div className="sm:col-span-7 space-y-2">
              <Label className="text-sm font-bold uppercase tracking-wider text-slate-400">Quick Preset Contours</Label>
              <div className="flex flex-wrap gap-2.5">
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
                    className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border cursor-pointer ${
                      site.fallMeters === m
                        ? "bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-sm"
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
            <div className="flex justify-end pt-4 mt-5 border-t border-slate-700/20">
              <Button
                type="button"
                size="sm"
                onClick={() => setRevealedStage((prev) => Math.max(prev, 3))}
                className="text-sm h-11 px-5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 gap-2 font-bold cursor-pointer"
              >
                <span>Proceed to Soil Class &amp; Foundations</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: SOIL CLASS, 32MPA CONCRETE, FLEXIBLE SERVICES & PIERING ALLOWANCE */}
      {revealedStage >= 3 && (
        <div
          className={`p-6 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
            isLight
              ? "bg-white border-slate-200 shadow-sm"
              : "bg-slate-900/60 border-slate-800/80 backdrop-blur-md"
          }`}
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Label className={`text-base sm:text-lg font-bold uppercase tracking-wider block ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                  3. Soil Class, Concrete Specification &amp; Piering Allowance
                </Label>
                {revealedStage > 3 && (
                  <Badge variant="outline" className="text-xs font-bold text-emerald-500 border-emerald-500/30 px-2.5 py-0.5">
                    <Check className="h-3.5 w-3.5 mr-1" />
                    {site.soilClass || "Class M"} • {formatAud(currentPieringCost)} Piering
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Foundation slab engineering, 32MPa concrete, flexible services, and piering allowance.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Geotechnical Soil Classification - Side by Side Cards */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                  Geotechnical Soil Classification
                </Label>
                <Badge variant="outline" className="text-xs font-mono font-bold text-emerald-500 border-emerald-500/30">
                  {site.soilClass || "Class M"} Active
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {SOIL_OPTIONS.map((opt) => {
                  const isSelected = (site.soilClass || "Class M") === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      data-testid={`soil-option-${opt.id.toLowerCase().replace(/\s+/g, "-")}`}
                      onClick={() => handleSoilClassChange(opt.id)}
                      className={`p-3.5 sm:p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? isLight
                            ? "bg-emerald-50/90 border-emerald-500 text-slate-900 shadow-md ring-2 ring-emerald-500/20"
                            : "bg-emerald-500/20 border-emerald-400 text-white shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-400"
                          : isLight
                          ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                          : "bg-slate-950/60 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-base sm:text-lg font-black tracking-tight">
                            {opt.label}
                          </span>
                          {isSelected && (
                            <Check className="h-4 w-4 text-emerald-500 stroke-[3]" />
                          )}
                        </div>
                        <span className="text-xs text-slate-400 leading-tight block">
                          {opt.desc}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 32MPa Concrete & Flexible Services Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div
                className={`p-4 sm:p-5 rounded-2xl border flex items-center justify-between gap-3 ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                }`}
              >
                <div>
                  <span className={`text-sm sm:text-base font-bold block ${isLight ? "text-slate-900" : "text-white"}`}>
                    32MPa High-Strength Concrete
                  </span>
                  <span className="text-xs text-slate-400 block mt-0.5">
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
                className={`p-4 sm:p-5 rounded-2xl border flex items-center justify-between gap-3 ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                }`}
              >
                <div>
                  <span className={`text-sm sm:text-base font-bold block ${isLight ? "text-slate-900" : "text-white"}`}>
                    Flexible Plumbing Service Connections
                  </span>
                  <span className="text-xs text-slate-400 block mt-0.5">
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
              className={`p-5 sm:p-6 rounded-2xl border ${
                isLight ? "bg-emerald-50/60 border-emerald-300" : "bg-emerald-950/20 border-emerald-500/40"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-emerald-500 uppercase tracking-wider">
                      {siteType === "kdrb" ? "Screw Piering Allowance" : "Foundation Piering Allowance"}
                    </span>
                    <Badge variant="outline" className="text-xs font-bold text-emerald-400 border-emerald-500/40">
                      Auto-Calculated
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Allowance for piering if required, and subject to geotech report.
                  </p>
                </div>

                <div className="w-full sm:w-56">
                  <div className="relative">
                    <span className="absolute left-3.5 top-3 text-sm text-slate-400 font-bold">$</span>
                    <Input
                      type="number"
                      step="100"
                      value={currentPieringCost}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handlePieringLumpSumChange(e.target.value)}
                      className="h-12 text-base font-mono font-bold pl-8 pr-3 bg-white dark:bg-slate-950 border-emerald-500/50 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-400 pt-1.5 flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-emerald-500 flex-none" />
                <span>
                  Calibrated for {quote.design.designName || "home"} ground floor area ({gfaM2} m² footprint). User-editable lump sum.
                </span>
              </div>
            </div>
          </div>

          {revealedStage === 3 && (
            <div className="flex justify-end pt-4 mt-5 border-t border-slate-700/20">
              <Button
                type="button"
                size="sm"
                onClick={() => setRevealedStage((prev) => Math.max(prev, siteType === "kdrb" ? 4 : 5))}
                className="text-sm h-11 px-5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 gap-2 font-bold cursor-pointer"
              >
                <span>{siteType === "kdrb" ? "Proceed to Demolition & Asbestos" : "Proceed to Site Allowances"}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: KDRB HOUSE DEMOLITION & ASBESTOS (ONLY APPEARS IF KDRB SELECTED) */}
      {siteType === "kdrb" && revealedStage >= 4 && (
        <div
          className={`p-6 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
            isLight
              ? "bg-amber-50/70 border-amber-300 shadow-sm"
              : "bg-amber-950/20 border-amber-500/40 backdrop-blur-md"
          }`}
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Hammer className="h-5 w-5 text-amber-500" />
                <Label className={`text-base sm:text-lg font-bold uppercase tracking-wider block ${isLight ? "text-amber-950" : "text-amber-300"}`}>
                  4. Existing House Demolition &amp; Asbestos Removal (KDRB)
                </Label>
                {revealedStage > 4 && (
                  <Badge variant="outline" className="text-xs font-bold text-amber-500 border-amber-500/30 px-2.5 py-0.5">
                    <Check className="h-3.5 w-3.5 mr-1" />
                    {site.kdrbDemolitionOption === "builder"
                      ? "Builder Demo ($34.5k)"
                      : site.kdrbDemolitionOption === "owner"
                      ? "By Owner ($0)"
                      : "Not Required ($0)"}
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Specify how the existing residential structure will be cleared prior to construction start.
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
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
                    setRevealedStage((prev) => Math.max(prev, 5));
                  }}
                  className={`p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-4 ${
                    isSelected
                      ? isLight
                        ? "bg-white border-amber-500 shadow-xs ring-2 ring-amber-500/30"
                        : "bg-amber-500/20 border-amber-400 text-white shadow-sm ring-1 ring-amber-400"
                      : isLight
                      ? "bg-white/60 border-slate-200 hover:bg-white text-slate-700"
                      : "bg-slate-900/60 border-slate-800 hover:bg-slate-900 text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center flex-none border ${
                        isSelected
                          ? "bg-amber-500 border-amber-500 text-slate-950"
                          : "border-slate-500 text-transparent"
                      }`}
                    >
                      <Check className="h-3 w-3 stroke-[3]" />
                    </div>
                    <div>
                      <span className="text-sm sm:text-base font-bold block">{opt.title}</span>
                      <span className="text-xs text-slate-400 block mt-0.5">{opt.desc}</span>
                    </div>
                  </div>

                  <div className="text-right flex-none">
                    <span className="text-sm sm:text-base font-bold font-mono">
                      {opt.amount > 0 ? formatAud(opt.amount) : "$0"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {revealedStage === 4 && (
            <div className="flex justify-end pt-4 mt-5 border-t border-amber-500/20">
              <Button
                type="button"
                size="sm"
                onClick={() => setRevealedStage((prev) => Math.max(prev, 5))}
                className="text-sm h-11 px-5 rounded-xl bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30 gap-2 font-bold cursor-pointer"
              >
                <span>Proceed to Site Allowances</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* STEP 5: NEW SITE COSTS SECTION (RETAINING, MATERIAL HANDLING, OUT OF ZONE, ROCK BREAKER, UNKNOWN CONDITIONS) */}
      {revealedStage >= 5 && (
        <div
          className={`p-6 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
            isLight
              ? "bg-white border-slate-200 shadow-sm"
              : "bg-slate-900/60 border-slate-800/80 backdrop-blur-md"
          }`}
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Label className={`text-base sm:text-lg font-bold uppercase tracking-wider block ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                  {siteType === "kdrb" ? "5." : "4."} Site Specific Allowances &amp; Surcharges
                </Label>
                {revealedStage > 5 && (
                  <Badge variant="outline" className="text-xs font-bold text-emerald-500 border-emerald-500/30 px-2.5 py-0.5">
                    <Check className="h-3.5 w-3.5 mr-1" />
                    {formatAud(
                      (site.retainingWallAllowance || 0) +
                      (site.materialHandlingAllowance || 0) +
                      (site.outOfZoneSurcharge || 0) +
                      (site.rockExcavationAllowance || 0) +
                      (site.unknownSiteConditionsAllowance || 0)
                    )}
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Enter provisional contingency allowances for retaining walls, materials handling, travel zones, rock excavation, and unforeseen ground conditions.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Retaining Wall Allowance */}
            <div className="space-y-2">
              <Label className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                Retaining Wall Allowance
              </Label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-sm text-slate-400 font-bold">$</span>
                <Input
                  type="number"
                  step="500"
                  value={site.retainingWallAllowance || 0}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => onChange({ retainingWallAllowance: parseFloat(e.target.value) || 0 })}
                  className="h-12 text-base font-mono pl-8 rounded-xl font-bold"
                />
              </div>
            </div>

            {/* Material Handling Allowance */}
            <div className="space-y-2">
              <Label className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                Material Handling &amp; Access
              </Label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-sm text-slate-400 font-bold">$</span>
                <Input
                  type="number"
                  step="500"
                  value={site.materialHandlingAllowance || 0}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => onChange({ materialHandlingAllowance: parseFloat(e.target.value) || 0 })}
                  className="h-12 text-base font-mono pl-8 rounded-xl font-bold"
                />
              </div>
            </div>

            {/* Out of Zone Surcharge */}
            <div className="space-y-2">
              <Label className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                Out of Zone Surcharge
              </Label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-sm text-slate-400 font-bold">$</span>
                <Input
                  type="number"
                  step="500"
                  value={site.outOfZoneSurcharge || 0}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => onChange({ outOfZoneSurcharge: parseFloat(e.target.value) || 0 })}
                  className="h-12 text-base font-mono pl-8 rounded-xl font-bold"
                />
              </div>
            </div>

            {/* Rock Breaker Allowance */}
            <div className="space-y-2">
              <Label className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                Rock Breaker Allowance
              </Label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-sm text-slate-400 font-bold">$</span>
                <Input
                  type="number"
                  step="500"
                  value={site.rockExcavationAllowance || 0}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => onChange({ rockExcavationAllowance: parseFloat(e.target.value) || 0 })}
                  className="h-12 text-base font-mono pl-8 rounded-xl font-bold"
                />
              </div>
            </div>

            {/* Unknown Site Conditions Allowance */}
            <div className="space-y-2 sm:col-span-2 lg:col-span-2">
              <Label className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                Unknown Site Conditions Allowance (Contingency)
              </Label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-sm text-slate-400 font-bold">$</span>
                <Input
                  type="number"
                  step="500"
                  value={site.unknownSiteConditionsAllowance || 0}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => onChange({ unknownSiteConditionsAllowance: parseFloat(e.target.value) || 0 })}
                  className="h-12 text-base font-mono pl-8 rounded-xl font-bold"
                />
              </div>
            </div>
          </div>

          {revealedStage === 5 && (
            <div className="flex justify-end pt-4 mt-5 border-t border-slate-700/20">
              <Button
                type="button"
                size="sm"
                onClick={() => setRevealedStage((prev) => Math.max(prev, 6))}
                className="text-sm h-11 px-5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 gap-2 font-bold cursor-pointer"
              >
                <span>Proceed to Overlays &amp; Site Problems</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* STEP 6: OVERLAYS / SITE PROBLEMS (BUSHFIRE, FLOOD, ACOUSTIC, SEWER LINE) */}
      {revealedStage >= 6 && (
        <div
          className={`p-6 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
            isLight
              ? "bg-white border-slate-200 shadow-sm"
              : "bg-slate-900/60 border-slate-800/80 backdrop-blur-md"
          }`}
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Label className={`text-base sm:text-lg font-bold uppercase tracking-wider block ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                  {siteType === "kdrb" ? "6." : "5."} Overlays &amp; Site Problems
                </Label>
                {revealedStage > 6 && (
                  <Badge variant="outline" className="text-xs font-bold text-emerald-500 border-emerald-500/30 px-2.5 py-0.5">
                    <Check className="h-3.5 w-3.5 mr-1" />
                    {[hasBushfire, hasFlood, hasAcoustic, hasSewer].filter(Boolean).length} Overlays Active
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Select any applicable environmental planning overlays. Selecting an overlay automatically includes the specialist engineering report and unlocks editable construction costs.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* 1. BUSHFIRE */}
            <div
              className={`p-5 rounded-2xl border transition-all ${
                hasBushfire
                  ? isLight
                    ? "bg-orange-50/70 border-orange-400 shadow-xs"
                    : "bg-orange-950/20 border-orange-500/40"
                  : isLight
                  ? "bg-slate-50 border-slate-200"
                  : "bg-slate-950/60 border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Flame className="h-5 w-5 text-orange-500 flex-none" />
                  <div>
                    <span className={`text-sm sm:text-base font-bold block ${isLight ? "text-slate-900" : "text-white"}`}>
                      Bushfire Overlay (BAL Rating)
                    </span>
                    <span className="text-xs text-slate-400 mt-0.5 block">
                      Auto-includes $850 Bushfire Management Report
                    </span>
                  </div>
                </div>
                <Switch checked={hasBushfire} onCheckedChange={handleToggleBushfire} />
              </div>

              {hasBushfire && (
                <div className="mt-4 pt-4 border-t border-orange-500/20 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">BAL Rating Level</Label>
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
                      <SelectTrigger className="h-11 text-sm font-bold rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BAL_OPTIONS.map((b) => (
                          <SelectItem key={b.id} value={b.id} className="py-2 text-sm">
                            {b.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">BAL Construction Cost ($)</Label>
                    <Input
                      type="number"
                      step="100"
                      value={site.bushfireCost || 5500}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => onChange({ bushfireCost: parseFloat(e.target.value) || 0 })}
                      className="h-11 text-base font-mono font-bold rounded-xl"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. FLOOD */}
            <div
              className={`p-5 rounded-2xl border transition-all ${
                hasFlood
                  ? isLight
                    ? "bg-blue-50/70 border-blue-400 shadow-xs"
                    : "bg-blue-950/20 border-blue-500/40"
                  : isLight
                  ? "bg-slate-50 border-slate-200"
                  : "bg-slate-950/60 border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Waves className="h-5 w-5 text-blue-500 flex-none" />
                  <div>
                    <span className={`text-sm sm:text-base font-bold block ${isLight ? "text-slate-900" : "text-white"}`}>
                      Flood Overlay (Defined Flood Level)
                    </span>
                    <span className="text-xs text-slate-400 mt-0.5 block">
                      Auto-includes $7,600 Hydraulic Assessment Report
                    </span>
                  </div>
                </div>
                <Switch checked={hasFlood} onCheckedChange={handleToggleFlood} />
              </div>

              {hasFlood && (
                <div className="mt-4 pt-4 border-t border-blue-500/20 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div className="text-xs sm:text-sm text-slate-400">
                    Slab elevation &amp; elevated piering construction works
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Flood Allowance Cost ($)</Label>
                    <Input
                      type="number"
                      step="500"
                      value={site.floodOverlayCost || 6500}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => onChange({ floodOverlayCost: parseFloat(e.target.value) || 0 })}
                      className="h-11 text-base font-mono font-bold rounded-xl"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. ACOUSTIC */}
            <div
              className={`p-5 rounded-2xl border transition-all ${
                hasAcoustic
                  ? isLight
                    ? "bg-purple-50/70 border-purple-400 shadow-xs"
                    : "bg-purple-950/20 border-purple-500/40"
                  : isLight
                  ? "bg-slate-50 border-slate-200"
                  : "bg-slate-950/60 border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Volume2 className="h-5 w-5 text-purple-500 flex-none" />
                  <div>
                    <span className={`text-sm sm:text-base font-bold block ${isLight ? "text-slate-900" : "text-white"}`}>
                      Acoustic Overlay / Noise Corridor
                    </span>
                    <span className="text-xs text-slate-400 mt-0.5 block">
                      Auto-includes $1,200 Certified Acoustic Engineer Report
                    </span>
                  </div>
                </div>
                <Switch checked={hasAcoustic} onCheckedChange={handleToggleAcoustic} />
              </div>

              {hasAcoustic && (
                <div className="mt-4 pt-4 border-t border-purple-500/20 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Noise Category</Label>
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
                      <SelectTrigger className="h-11 text-sm font-bold rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACOUSTIC_CATEGORIES.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="py-2 text-sm">
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Acoustic Glazing &amp; Seals Cost ($)</Label>
                    <Input
                      type="number"
                      step="200"
                      value={site.acousticCost || 3800}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => onChange({ acousticCost: parseFloat(e.target.value) || 0 })}
                      className="h-11 text-base font-mono font-bold rounded-xl"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 4. SEWER LINE */}
            <div
              className={`p-5 rounded-2xl border transition-all ${
                hasSewer
                  ? isLight
                    ? "bg-teal-50/70 border-teal-400 shadow-xs"
                    : "bg-teal-950/20 border-teal-500/40"
                  : isLight
                  ? "bg-slate-50 border-slate-200"
                  : "bg-slate-950/60 border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Shovel className="h-5 w-5 text-teal-500 flex-none" />
                  <div>
                    <span className={`text-sm sm:text-base font-bold block ${isLight ? "text-slate-900" : "text-white"}`}>
                      Sewer Line Near / Under Proposed Building Pad
                    </span>
                    <span className="text-xs text-slate-400 mt-0.5 block">
                      Auto-includes $3,500 CCTV Pipe Camera Inspection + Bridging Allowance on top
                    </span>
                  </div>
                </div>
                <Switch checked={hasSewer} onCheckedChange={handleToggleSewer} />
              </div>

              {hasSewer && (
                <div className="mt-4 pt-4 border-t border-teal-500/20 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                    {/* CCTV Inspection Cost */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          1. CCTV Pipe Camera Inspection ($)
                        </Label>
                        <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 font-mono">
                          {formatAud(site.cctvSewerReportCost ?? 3500)}
                        </span>
                      </div>
                      <Input
                        type="number"
                        step="100"
                        value={site.cctvSewerReportCost ?? 3500}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => onChange({ cctvSewerReportCost: parseFloat(e.target.value) || 0 })}
                        className="h-11 text-base font-mono font-bold rounded-xl"
                      />
                      <span className="text-[11px] text-slate-400 block">
                        Robotic drainage camera log, connection point depth verification &amp; asset check
                      </span>
                    </div>

                    {/* Sewer Bridging Cost (On Top) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          2. Sewer Bridging Allowance (On Top) ($)
                        </Label>
                        <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 font-mono">
                          {formatAud(site.sewerBridgingCost || 4500)}
                        </span>
                      </div>
                      <Input
                        type="number"
                        step="250"
                        value={site.sewerBridgingCost || 4500}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => onChange({ sewerBridgingCost: parseFloat(e.target.value) || 0 })}
                        className="h-11 text-base font-mono font-bold rounded-xl"
                      />
                      <span className="text-[11px] text-slate-400 block">
                        Concrete encasement &amp; pier footings bridging sewer zone of influence (ZOI)
                      </span>
                    </div>
                  </div>

                  {/* Combined Callout */}
                  <div
                    className={`px-4 py-2.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                      isLight
                        ? "bg-teal-100/70 border-teal-300 text-teal-900"
                        : "bg-teal-900/30 border-teal-500/30 text-teal-300"
                    }`}
                  >
                    <span>Combined Sewer Protection Total (CCTV + Bridging):</span>
                    <span className="font-mono font-black text-sm">
                      {formatAud((site.cctvSewerReportCost ?? 3500) + (site.sewerBridgingCost || 4500))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {revealedStage === 6 && (
            <div className="flex justify-end pt-4 mt-5 border-t border-slate-700/20">
              <Button
                type="button"
                size="sm"
                onClick={() => setRevealedStage((prev) => Math.max(prev, 7))}
                className="text-sm h-11 px-5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 gap-2 font-bold cursor-pointer"
              >
                <span>Proceed to Council Fees &amp; Statutory Applications</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* STEP 7: COUNCIL FEES & STATUTORY LODGEMENT */}
      {revealedStage >= 7 && (
        <div
          className={`p-6 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
            isLight
              ? "bg-white border-slate-200 shadow-sm"
              : "bg-slate-900/60 border-slate-800/80 backdrop-blur-md"
          }`}
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-cyan-400" />
                <Label className={`text-base sm:text-lg font-bold uppercase tracking-wider block ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                  {siteType === "kdrb" ? "7." : "6."} Council Fees &amp; Statutory Applications
                </Label>
                <Badge variant="outline" className="text-xs font-bold text-cyan-500 border-cyan-500/30 px-2.5 py-0.5">
                  <Check className="h-3.5 w-3.5 mr-1" />
                  {site.councilRegion || "Moreton Bay Regional Council"} ({formatAud(currentCouncilFee)})
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Standard council fee automated by location with optional statutory applications.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Standard council selection */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
              <div className="sm:col-span-8 space-y-2">
                <Label className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-300"}`}>
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
                  <SelectTrigger className="h-12 text-base font-bold rounded-xl">
                    <SelectValue placeholder="Select Council" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNCIL_REGIONS.map((c) => (
                      <SelectItem key={c.name} value={c.name} className="py-2.5 text-sm">
                        {c.name} ({formatAud(c.fee)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-4 space-y-2">
                <Label className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                  Statutory Fee ($)
                </Label>
                <Input
                  type="number"
                  value={currentCouncilFee}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => onChange({ councilFee: parseFloat(e.target.value) || 0 })}
                  className="h-12 text-base font-mono font-bold rounded-xl"
                />
              </div>
            </div>

            {/* Other Council Options */}
            <div className="space-y-3 pt-3 border-t border-slate-700/40">
              <Label className="text-sm font-bold text-slate-400 uppercase tracking-wider block">
                Additional Council &amp; Statutory Applications (Optional)
              </Label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Council DA */}
                <div
                  className={`p-4 sm:p-5 rounded-2xl border flex items-center justify-between gap-4 ${
                    isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                  }`}
                >
                  <div>
                    <span className="text-sm sm:text-base font-bold block">Council DA / Town Planning</span>
                    <span className="text-xs text-slate-400 mt-0.5 block">Material Change of Use ($11,000)</span>
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
                  className={`p-4 sm:p-5 rounded-2xl border flex items-center justify-between gap-4 ${
                    isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                  }`}
                >
                  <div>
                    <span className="text-sm sm:text-base font-bold block">Setback Relaxation / Dispensation</span>
                    <span className="text-xs text-slate-400 mt-0.5 block">Boundary variation lodgement ($2,000)</span>
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
                  className={`p-4 sm:p-5 rounded-2xl border flex items-center justify-between gap-4 ${
                    isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                  }`}
                >
                  <div>
                    <span className="text-sm sm:text-base font-bold block">Traffic Guidance &amp; Safety Control</span>
                    <span className="text-xs text-slate-400 mt-0.5 block">Permits, spotters &amp; signs ($6,500)</span>
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
                  className={`p-4 sm:p-5 rounded-2xl border flex items-center justify-between gap-4 ${
                    isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                  }`}
                >
                  <div>
                    <span className="text-sm sm:text-base font-bold block">Sediment &amp; Asset Protection</span>
                    <span className="text-xs text-slate-400 mt-0.5 block">Silt fences &amp; crossover ($1,950)</span>
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
      <div className="flex items-center justify-between pt-6 border-t border-slate-700/50">
        <Button
          type="button"
          variant="outline"
          onClick={onPrev}
          className={`h-14 px-8 text-sm font-bold rounded-xl gap-2 cursor-pointer ${
            isLight
              ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Floor Plan</span>
        </Button>

        <Button
          type="button"
          onClick={onNext}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold px-10 h-14 text-base rounded-xl shadow-lg shadow-emerald-500/20 gap-2 cursor-pointer"
        >
          Continue to House Variations
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
