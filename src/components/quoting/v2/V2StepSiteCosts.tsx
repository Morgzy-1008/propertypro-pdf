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
  Plus,
  Minus,
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
  getWindRatingDefaultCost,
  calculateTopographyFallCost,
  detectCouncilFromLocation,
} from "@/lib/quoting/quoteEngine";
import type { FullQuote, SiteConditions, SoilClass, WindRating, DepositType } from "@/lib/quoting/quoteTypes";
import { toast } from "sonner";
import { getActiveDivision } from "@/lib/divisionContext";
import {
  runVerifiedPropertyOverlayCheck,
  getCachedPropertyOverlayReport,
  saveCachedPropertyOverlayReport,
  type PropertyOverlayCheckReport,
} from "@/lib/quoting/autoQuoteEngine";

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

const WIND_RATING_OPTIONS: { id: WindRating; label: string; desc: string; cost: number }[] = [
  { id: "N2", label: "N1 / N2 (Std)", desc: "Standard Wind Classification (Included)", cost: 0 },
  { id: "N3", label: "N3 Wind", desc: "N3 Non-Cyclonic High Wind Tie-Downs", cost: 4000 },
  { id: "N4", label: "N4 Wind", desc: "N4 Exposed / Hilltop Wind Tie-Downs", cost: 7500 },
  { id: "C1", label: "C1 Cyclonic", desc: "C1 Cyclonic Wind Rating Engineering", cost: 11000 },
  { id: "C2", label: "C2 Cyclonic", desc: "C2 Severe Cyclonic Structural Framing", cost: 15500 },
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
  { id: "BAL-LOW", label: "BAL-LOW ($0 - Report Only / Low Risk)", cost: 0 },
  { id: "BAL-12.5", label: "BAL 12.5 (Low) - $5,500", cost: 5500 },
  { id: "BAL-19", label: "BAL 19 (Moderate) - $8,900", cost: 8900 },
  { id: "BAL-29", label: "BAL 29 (High) - $14,500", cost: 14500 },
  { id: "BAL-40", label: "BAL 40 (Very High) - $26,000", cost: 26000 },
];

const ACOUSTIC_CATEGORIES = [
  { id: "None", label: "None ($0 - Report Only / No Attenuation)", cost: 0 },
  { id: "Category 1", label: "Category 1 (Suburban Arterial) - $3,800", cost: 3800 },
  { id: "Category 2", label: "Category 2 (State Route / Major Highway) - $7,200", cost: 7200 },
  { id: "Category 3", label: "Category 3 (Rail Corridor / Direct Motorway) - $12,500", cost: 12500 },
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
    setRevealedStageState((prev) => (typeof updater === "function" ? updater(prev) : updater));
  };

  useEffect(() => {
    if (revealedStage !== site.siteCostsRevealedStage) {
      onChange({ siteCostsRevealedStage: revealedStage });
    }
  }, [revealedStage, site.siteCostsRevealedStage]);

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
      const headerOffset = 180;
      const rect = el.getBoundingClientRect();
      const targetY = rect.top + window.scrollY - headerOffset;
      window.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
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
        : (isNsw ? "NSW Local Council (Standard Statutory Fee)" : "Brisbane City Council");
      const fallbackFee = typeof detected.fee === "number" ? detected.fee : (isNsw ? 2000 : 2227);

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
    return isNsw ? 2000 : (site.councilRegion === "Brisbane City Council" ? 0 : 2227);
  }, [site.councilRegion, councilList, isNsw]);

  const currentCouncilFee = typeof site.councilFee === "number" ? site.councilFee : defaultCouncilFee;

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
      councilRegion: site.councilRegion || (isNsw ? "NSW Local Council (Standard Statutory Fee)" : "Brisbane City Council"),
      councilFee: typeof currentCouncilFee === "number" ? currentCouncilFee : (isNsw ? 2000 : 2227),
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

  // Soil Class Handler - updates soil classification without prematurely advancing or jumping past concrete/flexible plumbing/piering
  const handleSoilClassChange = (soilClass: SoilClass) => {
    const rate = getSoilRatePerM2(soilClass);
    const soilTotalCost = Math.round(rate * gfaM2);
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
  const handlePieringLumpSumChange = (valStr: string | number, unlockNext = false) => {
    setIsManualPiering(true);
    const cost = typeof valStr === "number" ? valStr : parseFloat(valStr) || 0;
    onChange({
      screwPieringRequired: cost > 0,
      screwPieringCost: cost,
      pieringCost: cost,
    });
    if (unlockNext) {
      const next = siteType === "kdrb" ? 4 : 5;
      setRevealedStage((prev) => Math.max(prev, next));
    }
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
        bushfireReportCost: site.bushfireReportCost || 850,
        bushfireBal: site.bushfireBal === "None" ? "BAL-12.5" : site.bushfireBal || "BAL-12.5",
        bushfireCost: typeof site.bushfireCost === "number" ? site.bushfireCost : 5500,
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
        floodReportCost: site.floodReportCost || 7600,
        floodOverlayRequired: typeof site.floodOverlayRequired === "boolean" ? site.floodOverlayRequired : true,
        floodOverlayCost: typeof site.floodOverlayCost === "number" ? site.floodOverlayCost : 6500,
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
        acousticReportCost: site.acousticReportCost || 1200,
        acousticTier: site.acousticTier === "None" ? "Category 1" : site.acousticTier || "Category 1",
        acousticCost: typeof site.acousticCost === "number" ? site.acousticCost : 3800,
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

  // Sync overlay state toggles from props
  useEffect(() => {
    setHasBushfire(Boolean(site.bushfireReportRequired || (site.bushfireCost || 0) > 0));
  }, [site.bushfireReportRequired, site.bushfireCost]);

  useEffect(() => {
    setHasFlood(Boolean(site.floodReportRequired || (site.floodOverlayCost || 0) > 0));
  }, [site.floodReportRequired, site.floodOverlayCost]);

  useEffect(() => {
    setHasAcoustic(Boolean(site.acousticReportRequired || (site.acousticCost || 0) > 0));
  }, [site.acousticReportRequired, site.acousticCost]);

  const isBushfireReportOnly = !site.bushfireCost || site.bushfireCost === 0 || site.bushfireBal === "BAL-LOW" || site.bushfireBal === "None";
  const isFloodReportOnly = !site.floodOverlayCost || site.floodOverlayCost === 0 || !site.floodOverlayRequired;
  const isAcousticReportOnly = !site.acousticCost || site.acousticCost === 0 || site.acousticTier === "None";

  const totalBushfire = (site.bushfireReportRequired ? (Number(site.bushfireReportCost) || 850) : 0) + (isBushfireReportOnly ? 0 : (Number(site.bushfireCost) || 0));
  const totalFlood = (site.floodReportRequired ? (Number(site.floodReportCost) || 7600) : 0) + (isFloodReportOnly ? 0 : (Number(site.floodOverlayCost) || 0));
  const totalAcoustic = (site.acousticReportRequired ? (Number(site.acousticReportCost) || 1200) : 0) + (isAcousticReportOnly ? 0 : (Number(site.acousticCost) || 0));

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

  // Deterministic Zero-Hallucination Government GIS Property Overlay Check
  const fullAddressQuery = useMemo(() => {
    const parts = [quote.client?.siteAddress, quote.client?.suburb].filter(Boolean);
    return parts.join(", ").trim();
  }, [quote.client?.siteAddress, quote.client?.suburb]);

  const [overlayReport, setOverlayReport] = useState<PropertyOverlayCheckReport | null>(() =>
    fullAddressQuery ? getCachedPropertyOverlayReport(fullAddressQuery) : null
  );
  const [isScanningOverlays, setIsScanningOverlays] = useState(false);

  useEffect(() => {
    if (!fullAddressQuery || fullAddressQuery.length < 5) return;
    const cached = getCachedPropertyOverlayReport(fullAddressQuery);
    if (cached) {
      setOverlayReport(cached);
      return;
    }
    let cancelled = false;
    setIsScanningOverlays(true);
    runVerifiedPropertyOverlayCheck(fullAddressQuery, isNsw ? "NSW" : "QLD")
      .then((res) => {
        if (!cancelled) {
          setOverlayReport(res);
          saveCachedPropertyOverlayReport(res);
        }
      })
      .finally(() => {
        if (!cancelled) setIsScanningOverlays(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fullAddressQuery, isNsw]);

  const overlayItems = overlayReport?.overlays || [];
  const hasFlaggedOverlay = overlayItems.some((f) => f.status === "verified_hit");

  const handleRefreshOverlayCheck = async () => {
    if (!fullAddressQuery) return;
    setIsScanningOverlays(true);
    try {
      const res = await runVerifiedPropertyOverlayCheck(fullAddressQuery, isNsw ? "NSW" : "QLD");
      setOverlayReport(res);
      saveCachedPropertyOverlayReport(res);
      const flagged = (res.overlays || []).filter((f) => f.status === "verified_hit");
      toast.success(
        flagged.length > 0
          ? `GIS Overlay Check: ${flagged.length} property overlay(s) flagged.`
          : "GIS Overlay Check complete: Zero spatial overlays intersected."
      );
    } finally {
      setIsScanningOverlays(false);
    }
  };

  const handleApplyFlaggedOverlaysToSite = () => {
    if (!overlayReport) return;
    const patch: Partial<SiteConditions> = { siteCostsRevealedStage: 7 };
    let appliedCount = 0;

    for (const flag of overlayItems) {
      if (flag.status !== "verified_hit") continue;
      if (flag.category === "bushfire" || flag.id.includes("bushfire")) {
        patch.bushfireReportRequired = true;
        if (!site.bushfireBal || site.bushfireBal === "None" || site.bushfireBal === "BAL-LOW") {
          patch.bushfireBal = "BAL-12.5";
          patch.bushfireCost = 5500;
        }
        appliedCount++;
      } else if (flag.category === "flood" || flag.id.includes("flood")) {
        patch.floodReportRequired = true;
        patch.floodOverlayRequired = true;
        if (!site.floodOverlayCost || site.floodOverlayCost <= 0) {
          patch.floodOverlayCost = 3500;
        }
        appliedCount++;
      } else if (flag.category === "acoustic" || flag.id.includes("acoustic")) {
        patch.acousticReportRequired = true;
        if (!site.acousticTier || site.acousticTier === "None") {
          patch.acousticTier = "Category 1";
          patch.acousticCost = 3800;
        }
        appliedCount++;
      }
    }

    setRevealedStage(7);
    onChange(patch);
    toast.success(
      appliedCount > 0
        ? `Activated ${appliedCount} flagged GIS overlay allowance(s) in Site Costs.`
        : "Opened Overlays section for review."
    );
    setTimeout(() => scrollToStage(6), 120);
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

      {/* Zero-Hallucination Government GIS Property Overlay Compliance Banner */}
      {(fullAddressQuery.length >= 5 || overlayItems.length > 0) && (
        <div
          data-testid="site-costs-gis-overlay-banner"
          className={`p-5 rounded-2xl border space-y-3.5 transition-all ${
            hasFlaggedOverlay
              ? isLight
                ? "bg-amber-50/90 border-amber-400 shadow-xs"
                : "bg-amber-950/25 border-amber-500/50"
              : isLight
              ? "bg-slate-50 border-slate-200"
              : "bg-slate-950/60 border-slate-800"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <Shield className={`w-5 h-5 mt-0.5 flex-none ${hasFlaggedOverlay ? "text-amber-500" : "text-emerald-500"}`} />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-black uppercase tracking-wider ${isLight ? "text-slate-900" : "text-white"}`}>
                    Verified Government GIS Property Overlay Compliance Check
                  </span>
                  <Badge className="bg-emerald-500/20 text-emerald-500 border border-emerald-500/40 text-[10px] font-bold">
                    Zero-Hallucination GIS
                  </Badge>
                </div>
                <p className={`text-xs mt-0.5 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                  Site: <strong>{overlayReport?.geocodedDisplayName || fullAddressQuery}</strong>
                  {typeof overlayReport?.lat === "number" && typeof overlayReport?.lng === "number"
                    ? ` (${overlayReport.lat.toFixed(5)}, ${overlayReport.lng.toFixed(5)})`
                    : ""}
                  {overlayReport?.lotPlanParcel ? ` • ${overlayReport.lotPlanParcel}` : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {hasFlaggedOverlay && (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApplyFlaggedOverlaysToSite}
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs h-9 px-3.5 cursor-pointer"
                >
                  Apply Flagged Overlays to Site Costs
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isScanningOverlays}
                onClick={handleRefreshOverlayCheck}
                className="rounded-xl text-xs font-bold h-9 px-3 cursor-pointer"
              >
                <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${isScanningOverlays ? "animate-spin" : ""}`} />
                {isScanningOverlays ? "Querying State GIS..." : "Re-Verify GIS"}
              </Button>
            </div>
          </div>

          {overlayItems.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
              {overlayItems.map((flag) => {
                const isFlagged = flag.status === "verified_hit";
                const isClear = flag.status === "verified_clear";
                return (
                  <div
                    key={flag.id}
                    className={`p-3 rounded-xl border text-xs flex flex-col justify-between gap-1.5 ${
                      isFlagged
                        ? isLight
                          ? "bg-white border-amber-400 text-slate-900"
                          : "bg-slate-900/90 border-amber-500/50 text-white"
                        : isClear
                        ? isLight
                          ? "bg-white border-emerald-200 text-slate-800"
                          : "bg-slate-900/60 border-emerald-500/25 text-slate-200"
                        : isLight
                        ? "bg-white border-slate-200 text-slate-700"
                        : "bg-slate-900/60 border-slate-800 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold truncate">{flag.name}</span>
                      <Badge
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 ${
                          isFlagged
                            ? "bg-rose-600 text-white"
                            : isClear
                            ? "bg-emerald-600 text-white"
                            : "bg-amber-500 text-slate-950"
                        }`}
                      >
                        {isFlagged
                          ? "⚠️ VERIFIED HIT"
                          : isClear
                          ? "✓ VERIFIED CLEAR"
                          : "COUNCIL CERT REQ"}
                      </Badge>
                    </div>
                    <p className={`text-[11px] leading-snug ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                      {flag.detail}
                    </p>
                    {flag.siteCostFlag && (
                      <p className="text-[11px] font-bold text-rose-500 leading-snug">
                        {flag.siteCostFlag}
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800 text-[10px] font-mono text-slate-400">
                      <span className="truncate">{flag.authoritySource}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
        data-testid="stage-1-site-type"
        className={`scroll-mt-44 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all ${
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
          data-testid="stage-2-slope-fall"
          className={`scroll-mt-44 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
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
                onClick={() => {
                  setRevealedStage((prev) => Math.max(prev, 3));
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
          data-testid="stage-3-soil-foundations"
          className={`scroll-mt-44 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
            isLight
              ? "bg-white border-slate-200 shadow-sm"
              : "bg-slate-900/60 border-slate-800/80 backdrop-blur-md"
          }`}
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Label className={`text-base sm:text-lg font-bold uppercase tracking-wider block ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                  3. Soil Class, Concrete Specification, Wind Rating &amp; Piering Allowance
                </Label>
                {revealedStage > 3 && (
                  <Badge variant="outline" className="text-xs font-bold text-emerald-500 border-emerald-500/30 px-2.5 py-0.5">
                    <Check className="h-3.5 w-3.5 mr-1" />
                    {site.soilClass || "Class M"} • {site.windRating || "N2"} Wind • {formatAud(currentPieringCost)} Piering
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Foundation slab engineering, 32MPa concrete, flexible services, wind rating, and piering allowance.
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
                  data-testid="concrete-32mpa-switch"
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
                  data-testid="flexible-connections-switch"
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

            {/* WIND RATING & PIERING ALLOWANCE (SIDE-BY-SIDE: WIND RATING ON LEFT, PIERING ALLOWANCE ON RIGHT) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
              {/* LEFT: WIND RATING ALLOWANCE */}
              <div
                data-testid="wind-rating-card"
                className={`p-5 sm:p-6 rounded-2xl border flex flex-col justify-between ${
                  (site.windRating && site.windRating !== "N1" && site.windRating !== "N2") || (Number(site.windRatingCost) || 0) > 0
                    ? isLight
                      ? "bg-emerald-50/60 border-emerald-300"
                      : "bg-emerald-950/20 border-emerald-500/40"
                    : isLight
                    ? "bg-slate-50 border-slate-200"
                    : "bg-slate-950/60 border-slate-800"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-emerald-500 uppercase tracking-wider">
                          Site Wind Rating (AS 4055)
                        </span>
                        <Badge variant="outline" className="text-xs font-bold text-emerald-400 border-emerald-500/40">
                          {site.windRating && site.windRating !== "N1" ? site.windRating : "N1 / N2 Std"}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Select site wind speed classification and structural tie-down engineering allowance.
                      </p>
                    </div>

                    <div className="w-full sm:w-44">
                      <div className="relative">
                        <span className="absolute left-3.5 top-3 text-sm text-slate-400 font-bold">$</span>
                        <Input
                          type="number"
                          step="100"
                          data-testid="wind-rating-cost-input"
                          value={
                            site.windRatingCost !== undefined && !isNaN(Number(site.windRatingCost))
                              ? Number(site.windRatingCost)
                              : getWindRatingDefaultCost(site.windRating)
                          }
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                            onChange({
                              windRating: site.windRating || (val > 0 ? "N3" : "N2"),
                              windRatingCost: val,
                            });
                          }}
                          className="h-12 text-base font-mono font-bold pl-8 pr-3 bg-white dark:bg-slate-950 border-emerald-500/50 rounded-xl"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quick Wind Rating Selector Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                    {WIND_RATING_OPTIONS.map((opt) => {
                      const activeRating = site.windRating || "N2";
                      const isSelected =
                        activeRating === opt.id ||
                        (opt.id === "N2" && (activeRating === "N1" || activeRating === "N2"));
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          data-testid={`wind-option-${opt.id.toLowerCase()}`}
                          onClick={() =>
                            onChange({
                              windRating: opt.id,
                              windRatingCost: opt.cost,
                            })
                          }
                          className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? isLight
                                ? "bg-emerald-50 border-emerald-500 text-slate-900 shadow-sm ring-1 ring-emerald-500"
                                : "bg-emerald-500/20 border-emerald-400 text-white shadow-sm ring-1 ring-emerald-400"
                              : isLight
                              ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                              : "bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-extrabold">{opt.label}</span>
                            {isSelected && <Check className="h-3 w-3 text-emerald-500 stroke-[3]" />}
                          </div>
                          <span className="text-[11px] font-mono font-bold text-emerald-500 mt-1">
                            {opt.cost > 0 ? `+${formatAud(opt.cost)}` : "$0 Std"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="text-xs text-slate-400 pt-2.5 flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-emerald-500 flex-none" />
                  <span>
                    Standard N1/N2 included ($0). N3: $4,000 · N4: $7,500 · C1: $11,000 · C2: $15,500 (editable).
                  </span>
                </div>
              </div>

              {/* RIGHT: PIERING ALLOWANCE (LUMP SUM - RATE HIDDEN PER REQUIREMENT) */}
              <div
                data-testid="piering-allowance-card"
                className={`p-5 sm:p-6 rounded-2xl border flex flex-col justify-between ${
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

                  <div className="w-full sm:w-44">
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-sm text-slate-400 font-bold">$</span>
                      <Input
                        type="number"
                        step="100"
                        value={currentPieringCost}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const next = siteType === "kdrb" ? 4 : 5;
                            setRevealedStage((prev) => Math.max(prev, next));
                          }
                        }}
                        onBlur={() => {
                          const next = siteType === "kdrb" ? 4 : 5;
                          setRevealedStage((prev) => Math.max(prev, next));
                        }}
                        onChange={(e) => handlePieringLumpSumChange(e.target.value)}
                        className="h-12 text-base font-mono font-bold pl-8 pr-3 bg-white dark:bg-slate-950 border-emerald-500/50 rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Piering Selector Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {[
                    { label: "Auto Calc", amount: Math.round(gfaM2 * pieringSqmRate), desc: "Standard" },
                    { label: "None ($0)", amount: 0, desc: "Slab on Ground" },
                    { label: "$5,000", amount: 5000, desc: "Allowance" },
                    { label: "$10,000", amount: 10000, desc: "Heavy Piering" },
                  ].map((preset) => {
                    const isSelected = currentPieringCost === preset.amount;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        data-testid={`piering-preset-${preset.amount}`}
                        onClick={() => handlePieringLumpSumChange(preset.amount, true)}
                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? isLight
                              ? "bg-emerald-50 border-emerald-500 text-slate-900 shadow-sm ring-1 ring-emerald-500"
                              : "bg-emerald-500/20 border-emerald-400 text-white shadow-sm ring-1 ring-emerald-400"
                            : isLight
                            ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                            : "bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-extrabold">{preset.label}</span>
                          {isSelected && <Check className="h-3 w-3 text-emerald-500 stroke-[3]" />}
                        </div>
                        <span className="text-[11px] font-mono font-bold text-emerald-500 mt-1">
                          {preset.amount > 0 ? formatAud(preset.amount) : "$0"}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="text-xs text-slate-400 pt-2 flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-emerald-500 flex-none" />
                  <span>
                    Calibrated for {quote.design.designName || "home"} ground floor area ({gfaM2} m² footprint). User-editable lump sum.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {revealedStage <= 3 && (
            <div className="flex justify-end pt-4 mt-5 border-t border-slate-700/20">
              <Button
                type="button"
                size="sm"
                data-testid="proceed-from-foundations-btn"
                onClick={() => {
                  const next = siteType === "kdrb" ? 4 : 5;
                  setRevealedStage((prev) => Math.max(prev, next));
                }}
                className="text-sm h-11 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold gap-2 cursor-pointer shadow-md"
              >
                <span>{siteType === "kdrb" ? "Confirm Foundations & Proceed to 4. Demolition & Asbestos" : "Confirm Foundations & Proceed to 4. Site Allowances"}</span>
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
          data-testid="stage-4-demolition"
          className={`scroll-mt-44 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
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
                onClick={() => {
                  setRevealedStage((prev) => Math.max(prev, 5));
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
          data-testid="stage-5-site-allowances"
          className={`scroll-mt-44 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
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
                      (site.trafficControlCost || 0) +
                      (site.outOfZoneSurcharge || 0) +
                      (site.rockExcavationAllowance || 0) +
                      (site.unknownSiteConditionsAllowance || 0)
                    )}
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Enter provisional contingency allowances for retaining walls, materials handling, traffic control &amp; safety, travel zones, rock excavation, and unforeseen ground conditions.
              </p>
            </div>
          </div>

          {(() => {
            const siteAllowancesList = [
              {
                field: "retainingWallAllowance" as const,
                title: "Retaining Wall Allowance",
                icon: Hammer,
                desc: "Provisional retaining wall allowance for cut & fill earthworks (subject to initial site reports).",
                value: site.retainingWallAllowance || 0,
                onChange: (val: number) => onChange({ retainingWallAllowance: val }),
              },
              {
                field: "materialHandlingAllowance" as const,
                title: "Material Handling & Access",
                icon: Truck,
                desc: "Specialized crane truck offloading, spotters and restricted lot access (subject to initial site reports).",
                value: site.materialHandlingAllowance || 0,
                onChange: (val: number) => onChange({ materialHandlingAllowance: val }),
              },
              {
                field: "trafficControlCost" as const,
                title: "Traffic Control Allowance",
                icon: AlertTriangle,
                desc: "Safety signage, barriers, traffic guidance scheme and controllers (subject to initial site reports).",
                value: site.trafficControlCost || 0,
                onChange: (val: number) =>
                  onChange({
                    trafficControlCost: val,
                    trafficControlRequired: val > 0,
                  }),
              },
              {
                field: "outOfZoneSurcharge" as const,
                title: "Out of Zone Surcharge",
                icon: Compass,
                desc: "Extended delivery travel, freight and contractor logistics allowance (subject to initial site reports).",
                value: site.outOfZoneSurcharge || 0,
                onChange: (val: number) => onChange({ outOfZoneSurcharge: val }),
              },
              {
                field: "rockExcavationAllowance" as const,
                title: "Rock Breaker Allowance",
                icon: Shovel,
                desc: "Provisional hydraulic rock breaker for sub-surface trenching & rock (subject to initial site reports).",
                value: site.rockExcavationAllowance || 0,
                onChange: (val: number) => onChange({ rockExcavationAllowance: val }),
              },
              {
                field: "unknownSiteConditionsAllowance" as const,
                title: "Unknown Site Conditions Allowance (Contingency)",
                icon: Shield,
                desc: "Provisional contingency for unforeseen sub-surface site conditions (subject to initial site reports).",
                value: site.unknownSiteConditionsAllowance || 0,
                onChange: (val: number) => onChange({ unknownSiteConditionsAllowance: val }),
              },
            ];

            const handleAllowanceStep = (field: string, delta: number) => {
              const item = siteAllowancesList.find((a) => a.field === field);
              if (!item) return;
              const current = item.value;
              const next = Math.max(0, current + delta);
              item.onChange(next);
            };

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {siteAllowancesList.map((item) => {
                  const IconComp = item.icon;
                  const isSelected = item.value > 0;
                  return (
                    <div
                      key={item.field}
                      data-testid={`allowance-card-${item.field}`}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                        isSelected
                          ? isLight
                            ? "bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-500/20 shadow-xs"
                            : "bg-emerald-950/20 border-emerald-500/40 ring-1 ring-emerald-500/20 shadow-xs"
                          : isLight
                          ? "bg-slate-50/80 border-slate-200"
                          : "bg-slate-950/60 border-slate-800"
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <IconComp className={`h-4 w-4 flex-none ${isSelected ? "text-emerald-500" : "text-slate-400"}`} />
                            <Label className={`text-xs sm:text-sm font-bold uppercase tracking-wider block ${isLight ? "text-slate-900" : "text-white"}`}>
                              {item.title}
                            </Label>
                          </div>
                          {isSelected ? (
                            <Badge variant="outline" className="text-xs font-mono font-bold text-emerald-500 border-emerald-500/40 bg-emerald-500/10 shrink-0">
                              {formatAud(item.value)}
                            </Badge>
                          ) : (
                            <span className="text-[11px] font-mono text-slate-400 shrink-0">$0</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>

                      <div className="space-y-2 mt-auto">
                        <div className="relative">
                          <span className="absolute left-3.5 top-3 text-sm text-slate-400 font-bold">$</span>
                          <Input
                            type="number"
                            min="0"
                            step="2500"
                            data-testid={`input-${item.field}`}
                            value={item.value > 0 ? item.value : ""}
                            placeholder="0"
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const clean = e.target.value.replace(/^0+(?=\d)/, "");
                              const num = clean === "" ? 0 : parseFloat(clean) || 0;
                              item.onChange(num);
                            }}
                            className={`h-12 text-base font-mono pl-8 pr-3 rounded-xl font-bold ${
                              isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-800 text-white"
                            }`}
                          />
                        </div>

                        {/* Quick Step Buttons: - $2,500 and + $2,500 */}
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={item.value <= 0}
                            onClick={() => handleAllowanceStep(item.field, -2500)}
                            data-testid={`dec-${item.field}`}
                            className={`flex-1 h-9 rounded-xl text-xs font-mono font-bold gap-1 cursor-pointer transition-all ${
                              item.value <= 0
                                ? "opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-800 text-slate-400"
                                : isLight
                                ? "bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-xs"
                                : "bg-slate-900 hover:bg-slate-800 text-slate-200 border-slate-700"
                            }`}
                            title="Decrease by $2,500"
                          >
                            <Minus className="h-3.5 w-3.5 stroke-[2.5]" />
                            <span>$2,500</span>
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleAllowanceStep(item.field, 2500)}
                            data-testid={`inc-${item.field}`}
                            className={`flex-1 h-9 rounded-xl text-xs font-mono font-bold gap-1 cursor-pointer transition-all ${
                              isLight
                                ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 shadow-xs"
                                : "bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-500/40"
                            }`}
                            title="Increase by $2,500"
                          >
                            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                            <span>$2,500</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {revealedStage === 5 && (
            <div className="flex justify-end pt-4 mt-5 border-t border-slate-700/20">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setRevealedStage((prev) => Math.max(prev, 6));
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
          className={`scroll-mt-44 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
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
              data-testid="card-overlay-bushfire"
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
                          +{formatAud(totalBushfire)} {isBushfireReportOnly ? "(Report Only)" : ""}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 mt-0.5 block">
                      {isBushfireReportOnly
                        ? "Report Only ($850) — $0 construction allowance (subject to initial site reports)"
                        : `Auto-includes $850 Bushfire Management Report + ${formatAud(site.bushfireCost || 5500)} BAL allowance`}
                    </span>
                  </div>
                </div>
                <Switch checked={hasBushfire} onCheckedChange={handleToggleBushfire} />
              </div>

              {hasBushfire && (
                <div className="mt-4 pt-4 border-t border-orange-500/20 space-y-4">
                  {/* Mode Selector: Report Only ($0) vs Report + Allowance */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 rounded-xl bg-slate-200/60 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        onChange({
                          bushfireReportRequired: true,
                          bushfireReportCost: site.bushfireReportCost || 850,
                          bushfireCost: 0,
                          bushfireBal: "BAL-LOW",
                        });
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isBushfireReportOnly
                          ? isLight
                            ? "bg-white text-orange-600 shadow-xs border border-orange-200"
                            : "bg-orange-500 text-white shadow-xs"
                          : isLight
                          ? "text-slate-600 hover:text-slate-900"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Report Only ($0 Allowance)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onChange({
                          bushfireReportRequired: true,
                          bushfireReportCost: site.bushfireReportCost || 850,
                          bushfireCost: (site.bushfireCost && site.bushfireCost > 0) ? site.bushfireCost : 5500,
                          bushfireBal: (site.bushfireBal && site.bushfireBal !== "None" && site.bushfireBal !== "BAL-LOW") ? site.bushfireBal : "BAL-12.5",
                        });
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        !isBushfireReportOnly
                          ? isLight
                            ? "bg-white text-orange-600 shadow-xs border border-orange-200"
                            : "bg-orange-500 text-white shadow-xs"
                          : isLight
                          ? "text-slate-600 hover:text-slate-900"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Hammer className="h-3.5 w-3.5" />
                      <span>Report + Construction Allowance</span>
                    </button>
                  </div>

                  {isBushfireReportOnly ? (
                    <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 ${
                      isLight
                        ? "bg-orange-50/90 border-orange-200 text-orange-950"
                        : "bg-orange-950/30 border-orange-500/30 text-orange-200"
                    }`}>
                      <FileText className="h-4 w-4 text-orange-500 mt-0.5 flex-none" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">Report Only Mode — $0 Construction Allowance</span>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                            $0 Physical Works
                          </Badge>
                        </div>
                        <p className="text-[11.5px] opacity-90 leading-relaxed">
                          Includes $850 Bushfire Management Report to verify and confirm the site has no additional overlays (e.g. BAL-LOW / non-combustible). If the site report determines a BAL rating applies, switch to <strong>Report + Construction Allowance</strong> to include the required physical works.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
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
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                              BAL Construction Cost ($)
                            </Label>
                            <span className="text-[10px] text-slate-400 italic">
                              (subject to initial site reports)
                            </span>
                          </div>
                          <Input
                            type="number"
                            step="100"
                            placeholder="0"
                            value={site.bushfireCost > 0 ? site.bushfireCost : ""}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const cleaned = e.target.value.replace(/^0+(?=\d)/, "");
                              onChange({ bushfireCost: parseFloat(cleaned) || 0 });
                            }}
                            className="h-11 text-base font-mono font-bold rounded-xl"
                          />
                        </div>
                      </div>

                      {/* Quick adjustments */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onChange({
                              bushfireReportRequired: true,
                              bushfireReportCost: site.bushfireReportCost || 850,
                              bushfireCost: 0,
                              bushfireBal: "BAL-LOW",
                            });
                          }}
                          className="h-8 text-[11px] font-bold text-orange-600 dark:text-orange-400 border-orange-500/30 hover:bg-orange-500/10 cursor-pointer"
                        >
                          Set to $0 (Report Only)
                        </Button>
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!site.bushfireCost || site.bushfireCost <= 0}
                            onClick={() => {
                              const nextVal = Math.max(0, (site.bushfireCost || 0) - 2500);
                              onChange({ bushfireCost: nextVal });
                            }}
                            className="h-8 text-xs font-bold font-mono px-2.5 rounded-lg border-slate-300 dark:border-slate-700 cursor-pointer"
                          >
                            <Minus className="h-3 w-3 mr-1" /> $2,500
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const nextVal = (site.bushfireCost || 0) + 2500;
                              onChange({ bushfireCost: nextVal });
                            }}
                            className="h-8 text-xs font-bold font-mono px-2.5 rounded-lg border-slate-300 dark:border-slate-700 cursor-pointer"
                          >
                            <Plus className="h-3 w-3 mr-1" /> $2,500
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. FLOOD */}
            <div
              data-testid="card-overlay-flood"
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
                          +{formatAud(totalFlood)} {isFloodReportOnly ? "(Report Only)" : ""}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 mt-0.5 block">
                      {isFloodReportOnly
                        ? "Report Only ($7,600) — $0 flood allowance (subject to initial site reports)"
                        : `Auto-includes $7,600 Hydraulic Assessment Report + ${formatAud(site.floodOverlayCost || 6500)} flood allowance`}
                    </span>
                  </div>
                </div>
                <Switch checked={hasFlood} onCheckedChange={handleToggleFlood} />
              </div>

              {hasFlood && (
                <div className="mt-4 pt-4 border-t border-blue-500/20 space-y-4">
                  {/* Mode Selector: Report Only ($0) vs Report + Allowance */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 rounded-xl bg-slate-200/60 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        onChange({
                          floodReportRequired: true,
                          floodReportCost: site.floodReportCost || 7600,
                          floodOverlayCost: 0,
                          floodOverlayRequired: false,
                        });
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isFloodReportOnly
                          ? isLight
                            ? "bg-white text-blue-600 shadow-xs border border-blue-200"
                            : "bg-blue-500 text-white shadow-xs"
                          : isLight
                          ? "text-slate-600 hover:text-slate-900"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Report Only ($0 Allowance)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onChange({
                          floodReportRequired: true,
                          floodReportCost: site.floodReportCost || 7600,
                          floodOverlayRequired: true,
                          floodOverlayCost: (site.floodOverlayCost && site.floodOverlayCost > 0) ? site.floodOverlayCost : 6500,
                        });
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        !isFloodReportOnly
                          ? isLight
                            ? "bg-white text-blue-600 shadow-xs border border-blue-200"
                            : "bg-blue-500 text-white shadow-xs"
                          : isLight
                          ? "text-slate-600 hover:text-slate-900"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Hammer className="h-3.5 w-3.5" />
                      <span>Report + Construction Allowance</span>
                    </button>
                  </div>

                  {isFloodReportOnly ? (
                    <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 ${
                      isLight
                        ? "bg-blue-50/90 border-blue-200 text-blue-950"
                        : "bg-blue-950/30 border-blue-500/30 text-blue-200"
                    }`}>
                      <FileText className="h-4 w-4 text-blue-500 mt-0.5 flex-none" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">Report Only Mode — $0 Construction Allowance</span>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                            $0 Physical Works
                          </Badge>
                        </div>
                        <p className="text-[11.5px] opacity-90 leading-relaxed">
                          Includes $7,600 Hydraulic Assessment Report to assess overland flow and verify whether the proposed slab level is above the Defined Flood Level (DFL). If the report identifies that slab elevation or elevated piering is required, switch to <strong>Report + Construction Allowance</strong>.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                        <div className="text-xs sm:text-sm text-slate-400">
                          Slab elevation &amp; elevated piering construction works
                          <div className="text-[11px] text-slate-500 mt-0.5 italic">
                            (subject to initial site reports)
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                              Flood Allowance Cost ($)
                            </Label>
                            <span className="text-[10px] text-slate-400 italic">
                              (subject to initial site reports)
                            </span>
                          </div>
                          <Input
                            type="number"
                            step="500"
                            placeholder="0"
                            value={(site.floodOverlayCost ?? 0) > 0 ? site.floodOverlayCost : ""}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const cleaned = e.target.value.replace(/^0+(?=\d)/, "");
                              onChange({
                                floodOverlayCost: parseFloat(cleaned) || 0,
                                floodOverlayRequired: true,
                              });
                            }}
                            className="h-11 text-base font-mono font-bold rounded-xl"
                          />
                        </div>
                      </div>

                      {/* Quick adjustments */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onChange({
                              floodReportRequired: true,
                              floodReportCost: site.floodReportCost || 7600,
                              floodOverlayCost: 0,
                              floodOverlayRequired: false,
                            });
                          }}
                          className="h-8 text-[11px] font-bold text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/10 cursor-pointer"
                        >
                          Set to $0 (Report Only)
                        </Button>
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!site.floodOverlayCost || site.floodOverlayCost <= 0}
                            onClick={() => {
                              const nextVal = Math.max(0, (site.floodOverlayCost || 0) - 2500);
                              onChange({ floodOverlayCost: nextVal, floodOverlayRequired: nextVal > 0 });
                            }}
                            className="h-8 text-xs font-bold font-mono px-2.5 rounded-lg border-slate-300 dark:border-slate-700 cursor-pointer"
                          >
                            <Minus className="h-3 w-3 mr-1" /> $2,500
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const nextVal = (site.floodOverlayCost || 0) + 2500;
                              onChange({ floodOverlayCost: nextVal, floodOverlayRequired: true });
                            }}
                            className="h-8 text-xs font-bold font-mono px-2.5 rounded-lg border-slate-300 dark:border-slate-700 cursor-pointer"
                          >
                            <Plus className="h-3 w-3 mr-1" /> $2,500
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 3. ACOUSTIC */}
            <div
              data-testid="card-overlay-acoustic"
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
                          +{formatAud(totalAcoustic)} {isAcousticReportOnly ? "(Report Only)" : ""}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 mt-0.5 block">
                      {isAcousticReportOnly
                        ? "Report Only ($1,200) — $0 glazing allowance (subject to initial site reports)"
                        : `Auto-includes $1,200 Certified Acoustic Engineer Report + ${formatAud(site.acousticCost || 3800)} acoustic package`}
                    </span>
                  </div>
                </div>
                <Switch checked={hasAcoustic} onCheckedChange={handleToggleAcoustic} />
              </div>

              {hasAcoustic && (
                <div className="mt-4 pt-4 border-t border-purple-500/20 space-y-4">
                  {/* Mode Selector: Report Only ($0) vs Report + Allowance */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 rounded-xl bg-slate-200/60 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        onChange({
                          acousticReportRequired: true,
                          acousticReportCost: site.acousticReportCost || 1200,
                          acousticCost: 0,
                          acousticTier: "None",
                        });
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isAcousticReportOnly
                          ? isLight
                            ? "bg-white text-purple-600 shadow-xs border border-purple-200"
                            : "bg-purple-500 text-white shadow-xs"
                          : isLight
                          ? "text-slate-600 hover:text-slate-900"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Report Only ($0 Allowance)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onChange({
                          acousticReportRequired: true,
                          acousticReportCost: site.acousticReportCost || 1200,
                          acousticCost: (site.acousticCost && site.acousticCost > 0) ? site.acousticCost : 3800,
                          acousticTier: (site.acousticTier && site.acousticTier !== "None") ? site.acousticTier : "Category 1",
                        });
                      }}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        !isAcousticReportOnly
                          ? isLight
                            ? "bg-white text-purple-600 shadow-xs border border-purple-200"
                            : "bg-purple-500 text-white shadow-xs"
                          : isLight
                          ? "text-slate-600 hover:text-slate-900"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      <Hammer className="h-3.5 w-3.5" />
                      <span>Report + Construction Allowance</span>
                    </button>
                  </div>

                  {isAcousticReportOnly ? (
                    <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 ${
                      isLight
                        ? "bg-purple-50/90 border-purple-200 text-purple-950"
                        : "bg-purple-950/30 border-purple-500/30 text-purple-200"
                    }`}>
                      <FileText className="h-4 w-4 text-purple-500 mt-0.5 flex-none" />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">Report Only Mode — $0 Construction Allowance</span>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                            $0 Physical Works
                          </Badge>
                        </div>
                        <p className="text-[11.5px] opacity-90 leading-relaxed">
                          Includes $1,200 Certified Acoustic Engineer Report to test noise corridor levels and confirm if any acoustic glazing or insulation upgrades are necessary. If the acoustic report specifies required attenuation, switch to <strong>Report + Construction Allowance</strong>.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
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
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                              Acoustic Glazing &amp; Seals Cost ($)
                            </Label>
                            <span className="text-[10px] text-slate-400 italic">
                              (subject to initial site reports)
                            </span>
                          </div>
                          <Input
                            type="number"
                            step="200"
                            placeholder="0"
                            value={site.acousticCost > 0 ? site.acousticCost : ""}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const cleaned = e.target.value.replace(/^0+(?=\d)/, "");
                              onChange({ acousticCost: parseFloat(cleaned) || 0 });
                            }}
                            className="h-11 text-base font-mono font-bold rounded-xl"
                          />
                        </div>
                      </div>

                      {/* Quick adjustments */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onChange({
                              acousticReportRequired: true,
                              acousticReportCost: site.acousticReportCost || 1200,
                              acousticCost: 0,
                              acousticTier: "None",
                            });
                          }}
                          className="h-8 text-[11px] font-bold text-purple-600 dark:text-purple-400 border-purple-500/30 hover:bg-purple-500/10 cursor-pointer"
                        >
                          Set to $0 (Report Only)
                        </Button>
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!site.acousticCost || site.acousticCost <= 0}
                            onClick={() => {
                              const nextVal = Math.max(0, (site.acousticCost || 0) - 2500);
                              onChange({ acousticCost: nextVal });
                            }}
                            className="h-8 text-xs font-bold font-mono px-2.5 rounded-lg border-slate-300 dark:border-slate-700 cursor-pointer"
                          >
                            <Minus className="h-3 w-3 mr-1" /> $2,500
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const nextVal = (site.acousticCost || 0) + 2500;
                              onChange({ acousticCost: nextVal });
                            }}
                            className="h-8 text-xs font-bold font-mono px-2.5 rounded-lg border-slate-300 dark:border-slate-700 cursor-pointer"
                          >
                            <Plus className="h-3 w-3 mr-1" /> $2,500
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
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
          className={`scroll-mt-44 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
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
                  {site.councilRegion || (isNsw ? "NSW Local Council (Standard Statutory Fee)" : "Brisbane City Council")} ({formatAud(currentCouncilFee)})
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
                          const fee = typeof det.fee === "number" ? det.fee : (isNsw ? 2000 : 2227);
                          onChange({
                            councilRegion: det.region,
                            councilFee: fee,
                          });
                          toast.success(`Tailored council to: ${det.region} (${formatAud(fee)})`);
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
                  value={site.councilRegion || (isNsw ? "NSW Local Council (Standard Statutory Fee)" : "Brisbane City Council")}
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Council DA */}
                <div
                  data-testid="card-council-da"
                  className={`p-4 sm:p-5 rounded-2xl border flex flex-col justify-between gap-3 transition-all ${
                    site.councilDaRequired
                      ? isLight ? "bg-cyan-50/70 border-cyan-300 shadow-xs" : "bg-cyan-950/20 border-cyan-500/40"
                      : isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base font-bold block">Council DA / Town Planning</span>
                        {site.councilDaRequired && (
                          <span className="text-xs font-mono font-extrabold text-cyan-600 dark:text-cyan-400">
                            +{formatAud(site.councilDaCost ?? 11000)}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 mt-0.5 block">Material Change of Use ($11,000)</span>
                    </div>
                    <Switch
                      checked={Boolean(site.councilDaRequired)}
                      onCheckedChange={(checked) =>
                        onChange({
                          councilDaRequired: checked,
                          councilDaCost: checked ? (site.councilDaCost || 11000) : 0,
                        })
                      }
                    />
                  </div>

                  {site.councilDaRequired && (
                    <div className="pt-2 border-t border-cyan-500/20 space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Application Cost ($)
                      </Label>
                      <Input
                        type="number"
                        placeholder="11000"
                        value={(site.councilDaCost ?? 0) > 0 ? site.councilDaCost : ""}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(/^0+(?=\d)/, "");
                          onChange({ councilDaCost: parseFloat(cleaned) || 0 });
                        }}
                        className="h-10 text-sm font-mono font-bold rounded-xl"
                      />
                    </div>
                  )}
                </div>

                {/* Setback Relaxation */}
                <div
                  data-testid="card-council-setback"
                  className={`p-4 sm:p-5 rounded-2xl border flex flex-col justify-between gap-3 transition-all ${
                    site.councilSetbackRelaxationRequired
                      ? isLight ? "bg-cyan-50/70 border-cyan-300 shadow-xs" : "bg-cyan-950/20 border-cyan-500/40"
                      : isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base font-bold block">Setback Relaxation / Dispensation</span>
                        {site.councilSetbackRelaxationRequired && (
                          <span className="text-xs font-mono font-extrabold text-cyan-600 dark:text-cyan-400">
                            +{formatAud(site.councilSetbackRelaxationCost ?? 2000)}
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
                          councilSetbackRelaxationCost: checked ? (site.councilSetbackRelaxationCost || 2000) : 0,
                        })
                      }
                    />
                  </div>

                  {site.councilSetbackRelaxationRequired && (
                    <div className="pt-2 border-t border-cyan-500/20 space-y-2">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Application Cost ($)
                        </Label>
                        <Input
                          type="number"
                          placeholder="2000"
                          value={(site.councilSetbackRelaxationCost ?? 0) > 0 ? site.councilSetbackRelaxationCost : ""}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const cleaned = e.target.value.replace(/^0+(?=\d)/, "");
                            onChange({ councilSetbackRelaxationCost: parseFloat(cleaned) || 0 });
                          }}
                          className="h-10 text-sm font-mono font-bold rounded-xl"
                        />
                      </div>
                      {/* Interval buttons: -$1,000 / +$1,000 */}
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          data-testid="btn-setback-minus-1000"
                          variant="outline"
                          size="sm"
                          disabled={!site.councilSetbackRelaxationCost || site.councilSetbackRelaxationCost <= 0}
                          onClick={() => {
                            const current = site.councilSetbackRelaxationCost || 2000;
                            const nextVal = Math.max(0, current - 1000);
                            onChange({ councilSetbackRelaxationCost: nextVal });
                          }}
                          className="h-7 text-xs font-bold font-mono px-2 rounded-lg border-slate-300 dark:border-slate-700 cursor-pointer"
                        >
                          <Minus className="h-3 w-3 mr-1" /> $1,000
                        </Button>
                        <Button
                          type="button"
                          data-testid="btn-setback-plus-1000"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const current = site.councilSetbackRelaxationCost || 2000;
                            const nextVal = current + 1000;
                            onChange({ councilSetbackRelaxationCost: nextVal });
                          }}
                          className="h-7 text-xs font-bold font-mono px-2 rounded-lg border-slate-300 dark:border-slate-700 cursor-pointer"
                        >
                          <Plus className="h-3 w-3 mr-1" /> $1,000
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dual Living Infrastructure Fee */}
                <div
                  data-testid="card-council-dual-living"
                  className={`p-4 sm:p-5 rounded-2xl border flex flex-col justify-between gap-3 transition-all ${
                    site.dualLivingInfrastructureRequired
                      ? isLight ? "bg-cyan-50/70 border-cyan-300 shadow-xs" : "bg-cyan-950/20 border-cyan-500/40"
                      : isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base font-bold block">Dual Living Infrastructure Fee</span>
                        {site.dualLivingInfrastructureRequired && (
                          <span className="text-xs font-mono font-extrabold text-cyan-600 dark:text-cyan-400">
                            +{formatAud(site.dualLivingInfrastructureCost ?? 23000)}
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
                          dualLivingInfrastructureCost: checked ? (site.dualLivingInfrastructureCost || 23000) : 0,
                        })
                      }
                    />
                  </div>

                  {site.dualLivingInfrastructureRequired && (
                    <div className="pt-2 border-t border-cyan-500/20 space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Infrastructure Fee ($)
                      </Label>
                      <Input
                        type="number"
                        placeholder="23000"
                        value={(site.dualLivingInfrastructureCost ?? 0) > 0 ? site.dualLivingInfrastructureCost : ""}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const cleaned = e.target.value.replace(/^0+(?=\d)/, "");
                          onChange({ dualLivingInfrastructureCost: parseFloat(cleaned) || 0 });
                        }}
                        className="h-10 text-sm font-mono font-bold rounded-xl"
                      />
                    </div>
                  )}
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
            data-testid="locked-teaser-card"
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
