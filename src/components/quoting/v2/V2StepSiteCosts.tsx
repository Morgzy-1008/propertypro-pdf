import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Compass,
  Check,
  RotateCcw,
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
  Lock,
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
  detectCouncilFromLocation,
} from "@/lib/quoting/quoteEngine";
import type { FullQuote, SiteConditions, SoilClass, DepositType } from "@/lib/quoting/quoteTypes";
import { toast } from "sonner";
import { getActiveDivision } from "@/lib/divisionContext";

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

const QLD_COUNCIL_REGIONS: { name: string; fee: number }[] = [
  { name: "Moreton Bay Regional Council", fee: 2227 },
  { name: "Logan City Council", fee: 2227 },
  { name: "Ipswich City Council", fee: 2227 },
  { name: "Gold Coast City Council", fee: 2950 },
  { name: "Sunshine Coast Council", fee: 2950 },
  { name: "Redland City Council", fee: 2227 },
  { name: "Toowoomba Regional Council", fee: 2227 },
  { name: "Brisbane City Council", fee: 0 },
  { name: "Council Fee Allowance (No Location Mentioned)", fee: 2200 },
];

const NSW_COUNCIL_REGIONS: { name: string; fee: number }[] = [
  { name: "NSW Local Council (Standard Statutory Fee)", fee: 2000 },
  { name: "Blacktown City Council", fee: 2000 },
  { name: "Camden Council", fee: 2000 },
  { name: "Campbelltown City Council", fee: 2000 },
  { name: "Penrith City Council", fee: 2000 },
  { name: "The Hills Shire Council", fee: 2000 },
  { name: "Liverpool City Council", fee: 2000 },
  { name: "City of Parramatta", fee: 2000 },
  { name: "Hawkesbury City Council", fee: 2000 },
  { name: "Wollondilly Shire Council", fee: 2000 },
  { name: "Central Coast Council", fee: 2000 },
  { name: "Lake Macquarie City Council", fee: 2000 },
  { name: "City of Newcastle", fee: 2000 },
  { name: "Maitland City Council", fee: 2000 },
  { name: "Cessnock City Council", fee: 2000 },
  { name: "Wollongong City Council", fee: 2000 },
  { name: "Shellharbour City Council", fee: 2000 },
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

  // Progressive disclosure: start at stage 1 or persisted siteCostsRevealedStage
  const [revealedStage, setRevealedStageState] = useState<number>(() => {
    if (site.siteCostsRevealedStage && site.siteCostsRevealedStage >= 1 && site.siteCostsRevealedStage <= 7) {
      return site.siteCostsRevealedStage;
    }
    return 1;
  });

  const setRevealedStage = (updater: number | ((prev: number) => number)) => {
    setRevealedStageState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (next !== site.siteCostsRevealedStage) {
        onChange({ siteCostsRevealedStage: next });
      }
      return next;
    });
  };

  // Section element refs for smooth auto-scrolling to next appeared step
  const stage1Ref = useRef<HTMLDivElement>(null);
  const stage2Ref = useRef<HTMLDivElement>(null);
  const stage3Ref = useRef<HTMLDivElement>(null);
  const stage4Ref = useRef<HTMLDivElement>(null);
  const stage5Ref = useRef<HTMLDivElement>(null);
  const stage6Ref = useRef<HTMLDivElement>(null);
  const stage7Ref = useRef<HTMLDivElement>(null);

  const scrollToStage = (stageNum: number) => {
    const map: Record<number, React.RefObject<HTMLDivElement | null>> = {
      1: stage1Ref,
      2: stage2Ref,
      3: stage3Ref,
      4: stage4Ref,
      5: stage5Ref,
      6: stage6Ref,
      7: stage7Ref,
    };
    const el = map[stageNum]?.current;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // If siteType switched away from KDRB while at stage 4, advance to 5
  useEffect(() => {
    if (siteType !== "kdrb" && revealedStage === 4) {
      setRevealedStage(5);
    }
  }, [siteType, revealedStage]);

  const getNextStageNum = (curr: number): number => {
    if (curr === 1) return 2;
    if (curr === 2) return 3;
    if (curr === 3) return siteType === "kdrb" ? 4 : 5;
    if (curr === 4) return 5;
    if (curr === 5) return 6;
    if (curr === 6) return 7;
    return 7;
  };

  const getNextStageInfo = (curr: number) => {
    const nextNum = getNextStageNum(curr);
    let title = "Next Step";
    let helper = "Complete previous step above to continue.";

    if (nextNum === 2) {
      title = "2. Land Slope & Contour Fall";
      helper = "Select a site type above to unlock land slope and contour fall calculation.";
    } else if (nextNum === 3) {
      title = "3. Soil Class, Concrete Specification & Piering Allowance";
      helper = "Confirm land slope fall above to unlock foundation slab engineering and piering.";
    } else if (nextNum === 4) {
      title = "4. Existing House Demolition & Asbestos Removal (KDRB)";
      helper = "Confirm foundation specifications above to unlock KDRB demolition options.";
    } else if (nextNum === 5) {
      title = `${siteType === "kdrb" ? "5." : "4."} Site Specific Allowances & Surcharges`;
      helper = "Confirm foundation specifications above to unlock retaining walls, rock and site allowances.";
    } else if (nextNum === 6) {
      title = `${siteType === "kdrb" ? "6." : "5."} Overlays & Site Problems`;
      helper = "Confirm site allowances above to unlock bushfire, flood, acoustic & sewer overlays.";
    } else if (nextNum === 7) {
      title = `${siteType === "kdrb" ? "7." : "6."} Council Fees & Statutory Applications`;
      helper = "Confirm overlays above to unlock local council fees and statutory applications.";
    }

    return { nextNum, title, helper };
  };

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

  const isNsw = (quote.client?.state || getActiveDivision()) === "NSW";
  const councilList = useMemo(() => {
    return isNsw ? NSW_COUNCIL_REGIONS : QLD_COUNCIL_REGIONS;
  }, [isNsw]);

  // Auto-detect and sync council region to client address, suburb and state
  const lastLocationRef = useRef<string>("");
  useEffect(() => {
    const activeState = (quote.client?.state || getActiveDivision()) === "NSW" ? "NSW" : "QLD";
    const locationKey = `${quote.client?.suburb || ""}|${quote.client?.siteAddress || ""}|${quote.client?.postcode || ""}|${activeState}`;

    const detected = detectCouncilFromLocation(
      quote.client?.suburb || "",
      `${quote.client?.siteAddress || ""} ${quote.client?.estate || ""}`,
      quote.client?.postcode || "",
      activeState
    );

    const currentBelongsToActiveList = councilList.some((c) => c.name === site.councilRegion);
    const locationChanged = lastLocationRef.current !== "" && lastLocationRef.current !== locationKey;
    lastLocationRef.current = locationKey;

    // If location changed or current council region is empty or belongs to another state's list
    if (!currentBelongsToActiveList || !site.councilRegion || (locationChanged && detected.region && detected.region !== site.councilRegion && !detected.isUnrecognized)) {
      const fallbackCouncil = detected.region && councilList.some((c) => c.name === detected.region)
        ? detected.region
        : (isNsw ? "NSW Local Council (Standard Statutory Fee)" : "Moreton Bay Regional Council");
      const fallbackFee = detected.fee > 0 ? detected.fee : (isNsw ? 2000 : 2227);

      onChange({
        councilRegion: fallbackCouncil,
        councilFee: fallbackFee,
      });
    }
  }, [quote.client?.suburb, quote.client?.siteAddress, quote.client?.postcode, quote.client?.state, isNsw, councilList]);

  // Default council fee based on selected region
  const defaultCouncilFee = useMemo(() => {
    const matched = councilList.find((c) => c.name === site.councilRegion);
    if (matched) return matched.fee;
    return isNsw ? 2000 : 2227;
  }, [site.councilRegion, councilList, isNsw]);

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
    setTimeout(() => scrollToStage(2), 150);

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
      councilRegion: site.councilRegion || (isNsw ? "NSW Local Council (Standard Statutory Fee)" : "Moreton Bay Regional Council"),
      councilFee: currentCouncilFee > 0 ? currentCouncilFee : (isNsw ? 2000 : 2227),
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
  const handleFallChange = (rawMeters: number | string, autoAdvance = false) => {
    const val = typeof rawMeters === "string" ? parseFloat(rawMeters) || 0 : rawMeters;
    const fallMeters = Math.max(0, val);
    const fallTotalCost = calculateTopographyFallCost(fallMeters, gfaM2, isSplit);
    setRevealedStage((prev) => Math.max(prev, 3));
    onChange({
      fallMeters,
      fallTotalCost,
    });
    if (autoAdvance) {
      setTimeout(() => scrollToStage(3), 150);
    }
  };

  // Soil Class Handler
  const handleSoilClassChange = (soilClass: SoilClass) => {
    const rate = getSoilRatePerM2(soilClass);
    const soilTotalCost = Math.round(rate * gfaM2);
    const next = siteType === "kdrb" ? 4 : 5;
    setRevealedStage((prev) => Math.max(prev, next));
    onChange({
      soilClass,
      soilCostSqm: rate,
      soilTotalCost,
    });
    setTimeout(() => scrollToStage(next), 150);
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
  const [hasSewer, setHasSewer] = useState(
    Boolean(
      site.buildingOverSewerRequired ||
      site.sewerBosCouncilAppRequired ||
      site.sewerBridgingPiersRequired ||
      site.sewerPotholingRequired ||
      site.sewerCctvInspectionRequired ||
      site.cctvSewerReportRequired ||
      site.sewerBridgingRequired
    )
  );

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

  // Toggle Sewer (Sewer Main Running Through The Block - Image 1)
  const handleToggleSewer = (active: boolean) => {
    setHasSewer(active);
    if (active) {
      onChange({
        buildingOverSewerRequired: true,
        sewerBosCouncilAppRequired: site.sewerBosCouncilAppRequired ?? true,
        sewerBosCouncilAppCost: site.sewerBosCouncilAppCost ?? 1700,
        sewerBridgingPiersRequired: site.sewerBridgingPiersRequired ?? true,
        sewerBridgingPiersLm: site.sewerBridgingPiersLm ?? 1,
        sewerBridgingPiersCost: site.sewerBridgingPiersCost ?? 1500,
        sewerPotholingRequired: site.sewerPotholingRequired ?? true,
        sewerPotholingCost: site.sewerPotholingCost ?? 4500,
        sewerCctvInspectionRequired: site.sewerCctvInspectionRequired ?? true,
        sewerCctvInspectionCost: site.sewerCctvInspectionCost ?? 2500,
        cctvSewerReportRequired: true,
        cctvSewerReportCost: 2500,
      });
    } else {
      onChange({
        buildingOverSewerRequired: false,
        sewerBosCouncilAppRequired: false,
        sewerBridgingPiersRequired: false,
        sewerPotholingRequired: false,
        sewerCctvInspectionRequired: false,
        cctvSewerReportRequired: false,
        sewerBridgingRequired: false,
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
                onClick={() => scrollToStage(stg.num)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
                  isCurrent
                    ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm"
                    : isCompleted
                    ? isLight
                      ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                      : "bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800 cursor-pointer"
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

        {(() => {
          const currentStageObj = stagesList.find((s) => s.num === revealedStage) || stagesList[stagesList.length - 1];
          const currentDisplayNum = currentStageObj ? currentStageObj.displayNum : stagesList.length;
          return (
            <span className="text-xs font-semibold text-slate-400 hidden md:inline px-3">
              Stage {currentDisplayNum} of {stagesList.length}
            </span>
          );
        })()}
      </div>

      {/* STEP 1: TYPE OF SITE WE'RE BUILDING ON (Greenfield, Brownfield, KDRB) */}
      <div
        ref={stage1Ref}
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
              onClick={() => {
                setRevealedStage((prev) => Math.max(prev, 2));
                setTimeout(() => scrollToStage(2), 120);
              }}
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
          ref={stage2Ref}
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setRevealedStage((prev) => Math.max(prev, 3));
                      setTimeout(() => scrollToStage(3), 120);
                    }
                  }}
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
                    onClick={() => handleFallChange(m, true)}
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
                onClick={() => {
                  setRevealedStage((prev) => Math.max(prev, 3));
                  setTimeout(() => scrollToStage(3), 120);
                }}
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
          ref={stage3Ref}
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
                  const rate = getSoilRatePerM2(opt.id);
                  const optCost = Math.round(rate * gfaM2);
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

                      <div className="mt-3 pt-2 border-t border-slate-700/20 flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Design Cost</span>
                        <span className={`text-xs font-mono font-bold ${
                          isSelected
                            ? isLight ? "text-emerald-700" : "text-emerald-300 font-extrabold"
                            : optCost > 0 ? (isLight ? "text-slate-800" : "text-slate-300") : "text-slate-400"
                        }`}>
                          {optCost > 0 ? `+${formatAud(optCost)}` : "$0 Included"}
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
                  site.concrete32MpaRequired
                    ? isLight ? "bg-emerald-50/70 border-emerald-300" : "bg-emerald-950/20 border-emerald-500/40"
                    : isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm sm:text-base font-bold block ${isLight ? "text-slate-900" : "text-white"}`}>
                      32MPa High-Strength Concrete
                    </span>
                    {site.concrete32MpaRequired && (
                      <span className="text-xs font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                        +{formatAud(site.concrete32MpaCost || Math.round(gfaM2 * 14))}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 block mt-0.5">
                    Higher compressive slab rating for reactive soil ({formatAud(Math.round(gfaM2 * 14))} for {Math.round(gfaM2)}m² footprint)
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
                  site.flexibleConnectionsRequired
                    ? isLight ? "bg-emerald-50/70 border-emerald-300" : "bg-emerald-950/20 border-emerald-500/40"
                    : isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm sm:text-base font-bold block ${isLight ? "text-slate-900" : "text-white"}`}>
                      Flexible Plumbing Service Connections
                    </span>
                    {site.flexibleConnectionsRequired && (
                      <span className="text-xs font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                        +{formatAud(site.flexibleConnectionsCost || 2500)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 block mt-0.5">
                    Articulated pipe couplings for reactive soil movement ({formatAud(2500)})
                  </span>
                </div>
                <Switch
                  checked={Boolean(site.flexibleConnectionsRequired)}
                  onCheckedChange={(checked) =>
                    onChange({
                      flexibleConnectionsRequired: checked,
                      flexibleConnectionsCost: checked ? 2500 : 0,
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
                onClick={() => {
                  const next = siteType === "kdrb" ? 4 : 5;
                  setRevealedStage((prev) => Math.max(prev, next));
                  setTimeout(() => scrollToStage(next), 120);
                }}
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
          ref={stage4Ref}
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
                    setTimeout(() => scrollToStage(5), 150);
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
                onClick={() => {
                  setRevealedStage((prev) => Math.max(prev, 5));
                  setTimeout(() => scrollToStage(5), 120);
                }}
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
          ref={stage5Ref}
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
                onClick={() => {
                  setRevealedStage((prev) => Math.max(prev, 6));
                  setTimeout(() => scrollToStage(6), 120);
                }}
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
          ref={stage6Ref}
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
                    <div className="flex items-center gap-2">
                      <span className={`text-sm sm:text-base font-bold block ${isLight ? "text-slate-900" : "text-white"}`}>
                        Bushfire Overlay (BAL Rating)
                      </span>
                      {hasBushfire && (
                        <Badge variant="outline" className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400 border-orange-500/40">
                          +{formatAud((site.bushfireReportCost || 850) + (site.bushfireCost || 5500))}
                        </Badge>
                      )}
                    </div>
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
                    <div className="flex items-center gap-2">
                      <span className={`text-sm sm:text-base font-bold block ${isLight ? "text-slate-900" : "text-white"}`}>
                        Flood Overlay (Defined Flood Level)
                      </span>
                      {hasFlood && (
                        <Badge variant="outline" className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 border-blue-500/40">
                          +{formatAud((site.floodReportCost || 7600) + (site.floodOverlayCost || 6500))}
                        </Badge>
                      )}
                    </div>
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
                    <div className="flex items-center gap-2">
                      <span className={`text-sm sm:text-base font-bold block ${isLight ? "text-slate-900" : "text-white"}`}>
                        Acoustic Overlay / Noise Corridor
                      </span>
                      {hasAcoustic && (
                        <Badge variant="outline" className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400 border-purple-500/40">
                          +{formatAud((site.acousticReportCost || 1200) + (site.acousticCost || 3800))}
                        </Badge>
                      )}
                    </div>
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

            {/* 4. SEWER LINE (SEWER MAIN RUNNING THROUGH THE BLOCK - IMAGE 1) */}
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
                    <div className="flex items-center gap-2">
                      <span className={`text-sm sm:text-base font-bold block ${isLight ? "text-slate-900" : "text-white"}`}>
                        Building Near / Over Sewer
                      </span>
                      {hasSewer && (
                        <Badge variant="outline" className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400 border-teal-500/40">
                          +{formatAud(
                            (site.sewerBosCouncilAppRequired ? (site.sewerBosCouncilAppCost ?? 1700) : 0) +
                            (site.sewerBridgingPiersRequired ? (site.sewerBridgingPiersCost ?? ((site.sewerBridgingPiersLm || 1) * 1500)) : 0) +
                            (site.sewerPotholingRequired ? (site.sewerPotholingCost ?? 4500) : 0) +
                            ((site.sewerCctvInspectionRequired || site.cctvSewerReportRequired) ? (site.sewerCctvInspectionCost ?? site.cctvSewerReportCost ?? 2500) : 0)
                          )}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 mt-0.5 block">
                      SEWER MAIN RUNNING THROUGH THE BLOCK • Council applications, bridging piers, potholing, and CCTV inspection
                    </span>
                  </div>
                </div>
                <Switch data-testid="sewer-main-switch" checked={hasSewer} onCheckedChange={handleToggleSewer} />
              </div>

              {hasSewer && (
                <div className="mt-5 pt-4 border-t border-teal-500/20 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 1. BOS Council Application ($1,700 Each) */}
                    <div
                      className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                        site.sewerBosCouncilAppRequired
                          ? isLight ? "bg-white border-teal-400 shadow-xs" : "bg-slate-900 border-teal-500/50"
                          : isLight ? "bg-slate-50 border-slate-200 opacity-80" : "bg-slate-950/60 border-slate-800 opacity-70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`text-xs sm:text-sm font-bold block ${isLight ? "text-slate-900" : "text-white"}`}>
                          BOS Council Application
                        </span>
                        <Switch
                          checked={Boolean(site.sewerBosCouncilAppRequired)}
                          onCheckedChange={(checked) =>
                            onChange({
                              sewerBosCouncilAppRequired: checked,
                              sewerBosCouncilAppCost: checked ? (site.sewerBosCouncilAppCost ?? 1700) : 0,
                            })
                          }
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        Statutory Building Over Sewer (BOS) council application &amp; engineering approvals.
                      </p>
                      <div className="mt-3 pt-2 border-t border-slate-700/20 flex items-center justify-between text-xs font-mono font-bold">
                        <span className="text-slate-400 text-[10px] uppercase font-sans">Rate: $1,700 Each</span>
                        <span className={site.sewerBosCouncilAppRequired ? "text-teal-600 dark:text-teal-400 font-extrabold" : "text-slate-500"}>
                          {site.sewerBosCouncilAppRequired ? `+${formatAud(site.sewerBosCouncilAppCost ?? 1700)}` : "$0"}
                        </span>
                      </div>
                    </div>

                    {/* 2. Bridging Piers Required ($1,500 /lm) */}
                    <div
                      className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                        site.sewerBridgingPiersRequired
                          ? isLight ? "bg-white border-teal-400 shadow-xs" : "bg-slate-900 border-teal-500/50"
                          : isLight ? "bg-slate-50 border-slate-200 opacity-80" : "bg-slate-950/60 border-slate-800 opacity-70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`text-xs sm:text-sm font-bold block ${isLight ? "text-slate-900" : "text-white"}`}>
                          Bridging Piers Required for Building Over Sewer
                        </span>
                        <Switch
                          checked={Boolean(site.sewerBridgingPiersRequired)}
                          onCheckedChange={(checked) => {
                            const lm = site.sewerBridgingPiersLm || 1;
                            onChange({
                              sewerBridgingPiersRequired: checked,
                              sewerBridgingPiersLm: lm,
                              sewerBridgingPiersCost: checked ? lm * 1500 : 0,
                              sewerBridgingRequired: checked,
                              sewerBridgingCost: checked ? lm * 1500 : 0,
                            });
                          }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        Engineered concrete bridging piers spanning sewer line zone of influence ($1,500 /lm).
                      </p>

                      <div className="mt-3 pt-2 border-t border-slate-700/20 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Label className="text-[10px] text-slate-400 uppercase font-bold">Length:</Label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={!site.sewerBridgingPiersRequired}
                              onClick={() => {
                                const current = site.sewerBridgingPiersLm || 1;
                                const next = Math.max(1, current - 1);
                                onChange({
                                  sewerBridgingPiersLm: next,
                                  sewerBridgingPiersCost: next * 1500,
                                  sewerBridgingCost: next * 1500,
                                });
                              }}
                              className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-800 text-xs font-bold flex items-center justify-center cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-40"
                            >
                              -
                            </button>
                            <span className="font-mono font-bold text-xs px-1.5">
                              {site.sewerBridgingPiersLm || 1} lm
                            </span>
                            <button
                              type="button"
                              disabled={!site.sewerBridgingPiersRequired}
                              onClick={() => {
                                const current = site.sewerBridgingPiersLm || 1;
                                const next = current + 1;
                                onChange({
                                  sewerBridgingPiersLm: next,
                                  sewerBridgingPiersCost: next * 1500,
                                  sewerBridgingCost: next * 1500,
                                });
                              }}
                              className="w-6 h-6 rounded bg-slate-200 dark:bg-slate-800 text-xs font-bold flex items-center justify-center cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700 disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <span className={`font-mono text-xs font-bold ${site.sewerBridgingPiersRequired ? "text-teal-600 dark:text-teal-400 font-extrabold" : "text-slate-500"}`}>
                          {site.sewerBridgingPiersRequired
                            ? `+${formatAud(site.sewerBridgingPiersCost ?? ((site.sewerBridgingPiersLm || 1) * 1500))}`
                            : "$0"}
                        </span>
                      </div>
                    </div>

                    {/* 3. Potholing ($4,500 Each) */}
                    <div
                      className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                        site.sewerPotholingRequired
                          ? isLight ? "bg-white border-teal-400 shadow-xs" : "bg-slate-900 border-teal-500/50"
                          : isLight ? "bg-slate-50 border-slate-200 opacity-80" : "bg-slate-950/60 border-slate-800 opacity-70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`text-xs sm:text-sm font-bold block ${isLight ? "text-slate-900" : "text-white"}`}>
                          Potholing - Mark Out Existing Line
                        </span>
                        <Switch
                          checked={Boolean(site.sewerPotholingRequired)}
                          onCheckedChange={(checked) =>
                            onChange({
                              sewerPotholingRequired: checked,
                              sewerPotholingCost: checked ? (site.sewerPotholingCost ?? 4500) : 0,
                            })
                          }
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        Potholing - Mark out existing sewer or stormwater line depth &amp; alignment.
                      </p>
                      <div className="mt-3 pt-2 border-t border-slate-700/20 flex items-center justify-between text-xs font-mono font-bold">
                        <span className="text-slate-400 text-[10px] uppercase font-sans">Rate: $4,500 Each</span>
                        <span className={site.sewerPotholingRequired ? "text-teal-600 dark:text-teal-400 font-extrabold" : "text-slate-500"}>
                          {site.sewerPotholingRequired ? `+${formatAud(site.sewerPotholingCost ?? 4500)}` : "$0"}
                        </span>
                      </div>
                    </div>

                    {/* 4. CCTV - Checks sewer line for existing damage ($2,500 Each) */}
                    <div
                      className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                        (site.sewerCctvInspectionRequired || site.cctvSewerReportRequired)
                          ? isLight ? "bg-white border-teal-400 shadow-xs" : "bg-slate-900 border-teal-500/50"
                          : isLight ? "bg-slate-50 border-slate-200 opacity-80" : "bg-slate-950/60 border-slate-800 opacity-70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className={`text-xs sm:text-sm font-bold block ${isLight ? "text-slate-900" : "text-white"}`}>
                          CCTV - Checks Sewer Line for Damage
                        </span>
                        <Switch
                          checked={Boolean(site.sewerCctvInspectionRequired || site.cctvSewerReportRequired)}
                          onCheckedChange={(checked) =>
                            onChange({
                              sewerCctvInspectionRequired: checked,
                              sewerCctvInspectionCost: checked ? (site.sewerCctvInspectionCost ?? 2500) : 0,
                              cctvSewerReportRequired: checked,
                              cctvSewerReportCost: checked ? 2500 : 0,
                            })
                          }
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        CCTV - Checks sewer line for existing damage with certified robotic inspection report.
                      </p>
                      <div className="mt-3 pt-2 border-t border-slate-700/20 flex items-center justify-between text-xs font-mono font-bold">
                        <span className="text-slate-400 text-[10px] uppercase font-sans">Rate: $2,500 Each</span>
                        <span className={(site.sewerCctvInspectionRequired || site.cctvSewerReportRequired) ? "text-teal-600 dark:text-teal-400 font-extrabold" : "text-slate-500"}>
                          {(site.sewerCctvInspectionRequired || site.cctvSewerReportRequired)
                            ? `+${formatAud(site.sewerCctvInspectionCost ?? site.cctvSewerReportCost ?? 2500)}`
                            : "$0"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Combined Callout */}
                  <div
                    className={`px-4 py-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                      isLight
                        ? "bg-teal-100/70 border-teal-300 text-teal-900"
                        : "bg-teal-900/30 border-teal-500/30 text-teal-300"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-teal-600 dark:text-teal-400 stroke-[3]" />
                      <span>Total Sewer Protection &amp; Engineering:</span>
                    </div>
                    <span className="font-mono font-black text-sm text-teal-800 dark:text-teal-300">
                      +{formatAud(
                        (site.sewerBosCouncilAppRequired ? (site.sewerBosCouncilAppCost ?? 1700) : 0) +
                        (site.sewerBridgingPiersRequired ? (site.sewerBridgingPiersCost ?? ((site.sewerBridgingPiersLm || 1) * 1500)) : 0) +
                        (site.sewerPotholingRequired ? (site.sewerPotholingCost ?? 4500) : 0) +
                        ((site.sewerCctvInspectionRequired || site.cctvSewerReportRequired) ? (site.sewerCctvInspectionCost ?? site.cctvSewerReportCost ?? 2500) : 0)
                      )}
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
                onClick={() => {
                  setRevealedStage((prev) => Math.max(prev, 7));
                  setTimeout(() => scrollToStage(7), 120);
                }}
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
          ref={stage7Ref}
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
                  {site.councilRegion || (isNsw ? "NSW Local Council (Standard Statutory Fee)" : "Moreton Bay Regional Council")} ({formatAud(currentCouncilFee)})
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
                <div className="flex items-center justify-between">
                  <Label className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                    Local Government Council Region
                  </Label>
                  {(quote.client?.suburb || quote.client?.siteAddress) && (
                    <button
                      type="button"
                      onClick={() => {
                        const activeState = (quote.client?.state || getActiveDivision()) === "NSW" ? "NSW" : "QLD";
                        const det = detectCouncilFromLocation(
                          quote.client?.suburb || "",
                          `${quote.client?.siteAddress || ""} ${quote.client?.estate || ""}`,
                          quote.client?.postcode || "",
                          activeState
                        );
                        if (det.region) {
                          onChange({
                            councilRegion: det.region,
                            councilFee: det.fee > 0 ? det.fee : (isNsw ? 2000 : 2227),
                          });
                          toast.success(`Tailored council to: ${det.region} (${formatAud(det.fee || (isNsw ? 2000 : 2227))})`);
                        }
                      }}
                      className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Auto-detect for {quote.client.suburb || quote.client.siteAddress}
                    </button>
                  )}
                </div>
                <Select
                  value={site.councilRegion || (isNsw ? "NSW Local Council (Standard Statutory Fee)" : "Moreton Bay Regional Council")}
                  onValueChange={(val) => {
                    const matched = councilList.find((c) => c.name === val);
                    onChange({
                      councilRegion: val,
                      councilFee: matched ? matched.fee : (isNsw ? 2000 : 2227),
                    });
                  }}
                >
                  <SelectTrigger className="h-12 text-base font-bold rounded-xl">
                    <SelectValue placeholder="Select Council" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {councilList.map((c) => (
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
                    site.councilDaRequired
                      ? isLight ? "bg-cyan-50/70 border-cyan-300" : "bg-cyan-950/20 border-cyan-500/40"
                      : isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-bold block">Council DA / Town Planning</span>
                      {site.councilDaRequired && (
                        <span className="text-xs font-mono font-extrabold text-cyan-600 dark:text-cyan-400">
                          +{formatAud(site.councilDaCost || 11000)}
                        </span>
                      )}
                    </div>
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
                    site.councilSetbackRelaxationRequired
                      ? isLight ? "bg-cyan-50/70 border-cyan-300" : "bg-cyan-950/20 border-cyan-500/40"
                      : isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-bold block">Setback Relaxation / Dispensation</span>
                      {site.councilSetbackRelaxationRequired && (
                        <span className="text-xs font-mono font-extrabold text-cyan-600 dark:text-cyan-400">
                          +{formatAud(site.councilSetbackRelaxationCost || 2000)}
                        </span>
                      )}
                    </div>
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

                {/* Dual Living Infrastructure Fee */}
                <div
                  className={`p-4 sm:p-5 rounded-2xl border flex items-center justify-between gap-4 ${
                    site.dualLivingInfrastructureRequired
                      ? isLight ? "bg-cyan-50/70 border-cyan-300" : "bg-cyan-950/20 border-cyan-500/40"
                      : isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-bold block">Dual Living Infrastructure Fee</span>
                      {site.dualLivingInfrastructureRequired && (
                        <span className="text-xs font-mono font-extrabold text-cyan-600 dark:text-cyan-400">
                          +{formatAud(site.dualLivingInfrastructureCost || 23000)}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 mt-0.5 block">Statutory headworks, second water meter &amp; infrastructure ($23,000)</span>
                  </div>
                  <Switch
                    checked={Boolean(site.dualLivingInfrastructureRequired)}
                    onCheckedChange={(checked) =>
                      onChange({
                        dualLivingInfrastructureRequired: checked,
                        dualLivingInfrastructureCost: checked ? 23000 : 0,
                      })
                    }
                  />
                </div>

                {/* Traffic Control */}
                <div
                  className={`p-4 sm:p-5 rounded-2xl border flex items-center justify-between gap-4 ${
                    site.trafficControlRequired
                      ? isLight ? "bg-cyan-50/70 border-cyan-300" : "bg-cyan-950/20 border-cyan-500/40"
                      : isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm sm:text-base font-bold block">Traffic Guidance &amp; Safety Control</span>
                      {site.trafficControlRequired && (
                        <span className="text-xs font-mono font-extrabold text-cyan-600 dark:text-cyan-400">
                          +{formatAud(site.trafficControlCost || 6500)}
                        </span>
                      )}
                    </div>
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

      {/* Progressive Disclosure: Locked Teaser for the Next Step */}
      {revealedStage < 7 && (() => {
        const nextInfo = getNextStageInfo(revealedStage);
        return (
          <div
            className={`p-6 sm:p-7 rounded-2xl sm:rounded-3xl border border-dashed transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              isLight
                ? "bg-slate-50/70 border-slate-300 text-slate-500"
                : "bg-slate-900/30 border-slate-800/80 text-slate-400"
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                  isLight ? "bg-slate-200 text-slate-600" : "bg-slate-800 text-slate-400"
                }`}
              >
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h3 className={`text-base font-bold uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                  Next: {nextInfo.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {nextInfo.helper}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-200/50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                <Lock className="h-3 w-3" />
                <span>Awaiting Previous Step</span>
              </span>
            </div>
          </div>
        );
      })()}

      {/* Footer Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-700/50">
        <Button
          type="button"
          variant="outline"
          onClick={onPrev}
          className={`w-full sm:w-auto h-14 px-8 text-sm font-bold rounded-xl gap-2 cursor-pointer ${
            isLight
              ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Floor Plan</span>
        </Button>

        {revealedStage >= 7 ? (
          <Button
            type="button"
            onClick={onNext}
            className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold px-10 h-14 text-base rounded-xl shadow-lg shadow-emerald-500/20 gap-2 cursor-pointer"
          >
            Continue to House Variations
            <ArrowRight className="h-5 w-5" />
          </Button>
        ) : (
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Button
              type="button"
              onClick={() => {
                const next = getNextStageNum(revealedStage);
                setRevealedStage((prev) => Math.max(prev, next));
                setTimeout(() => scrollToStage(next), 120);
              }}
              className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 h-14 rounded-xl gap-2 cursor-pointer shadow-md"
            >
              <span>Proceed to {stagesList.find((s) => s.num === getNextStageNum(revealedStage))?.title || "Next Step"}</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
