import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Home,
  Sparkles,
  Search,
  Upload,
  Layers,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Bed,
  Bath,
  Car,
  Maximize2,
  FileText,
  AlertCircle,
  Plus,
  Minus,
  RefreshCw,
  ChevronDown,
  Image as ImageIcon,
  Building,
  Building2,
  X,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatAud } from "@/lib/pricing";
import { pdfDocumentToPagesAndText } from "@/lib/pdfPages";
import { parseAreaScheduleFromText } from "@/lib/floorplan/areaScheduleParser";
import { detectFloorplanFromText, type DetectedFloorplan } from "@/lib/floorplan/floorplanDetector";
import {
  SINGLE_STOREY_PRICES,
  DOUBLE_STOREY_PRICES,
  DUAL_OC_PRICES,
  SPLIT_LEVEL_PRICES,
  type PriceRow,
} from "@/lib/pricelist.data";
import {
  NSW_SINGLE_STOREY_PRICES,
  NSW_DOUBLE_STOREY_PRICES,
  NSW_SPLIT_LEVEL_PRICES,
  NSW_DUAL_OC_PRICES,
} from "@/lib/pricelist.nsw.data";
import {
  isFhbIpEligibleDesign,
  findFhbPrice,
  cleanDesignNameForFhb,
  QLD_FHB_IP_DESIGNS,
} from "@/lib/pricing/pricelists";
import { getActiveDivision, onDivisionChanged, type Division } from "@/lib/divisionContext";
import { plansForDesign } from "@/components/flyer/floorplans";
import {
  getHousingTypeForDesign,
  getTierPrice,
  getStandardAreaBreakdown,
  calculateModifiedFloorplanPricing,
  calculateCustomFloorplanPrice,
  calculateCustomTotalM2,
  isDoubleStoreyDesign,
} from "@/lib/quoting/quoteEngine";
import {
  DEFAULT_CATALOGUE,
  EXTENSION_RATES_BY_TIER,
  normalizeInclusionTier,
} from "@/lib/quoting/quoteCatalogue";
import { getFacadesForDesignAndHousingType } from "@/components/quoting/QuoteDesignStep";
import { findFacadeForDesign } from "@/lib/quoting/facadeLookup";
import { PRE_RENDERED_FACADES } from "@/components/flyer/preRenderedFacades.data";
import {
  identifyBaseDesignCandidate,
  analyzeModifiedFloorplanFile,
} from "@/lib/quoting/floorplanModificationDetector";
import type {
  QuoteDesignSelection,
  QuoteSelectedLineItem,
  InclusionTier,
  BaseDesignCandidate,
  PlanModificationAnalysis,
  FloorplanAreaBreakdown,
  CustomFloorAreaItem,
} from "@/lib/quoting/quoteTypes";
import { ModifiedPlanReviewModal } from "@/components/quoting/ModifiedPlanReviewModal";
import { BaseDesignConfirmationModal } from "@/components/quoting/BaseDesignConfirmationModal";

interface V2StepFloorPlanProps {
  design: QuoteDesignSelection;
  division?: Division;
  clientState?: "QLD" | "NSW";
  onChange: (patch: Partial<QuoteDesignSelection>) => void;
  onAddInclusionLineItems?: (items: QuoteSelectedLineItem[]) => void;
  onNext: () => void;
  onPrev: () => void;
  isLight: boolean;
}

type HousingTypeTab = "Single Storey" | "Double Storey" | "Dual Living" | "Split Level" | "Granny Flat";

interface TierCardDef {
  tier: InclusionTier;
  shortCode: "H1" | "H2" | "H3" | "IP" | "FHB";
  title: string;
  tagline: string;
  badge?: string;
  badgeColor?: string;
  features: string[];
}

const INCLUSION_TIERS: TierCardDef[] = [
  {
    tier: "H1 Smart Living" as InclusionTier,
    shortCode: "H1",
    title: "Smart Living",
    tagline: "Essential Value & Turnkey Quality",
    features: [
      "20mm engineered stone kitchen benchtop",
      "600mm European stainless appliances",
      "Semi-frameless shower screens & chrome tapware",
      "Quality carpet & ceramic floor tiling",
    ],
  },
  {
    tier: "H2 Design Collection" as InclusionTier,
    shortCode: "H2",
    title: "Design Collection",
    tagline: "The Hudson Signature Standard",
    badge: "Most Popular",
    badgeColor: "bg-emerald-500 text-slate-950",
    features: [
      "900mm Westinghouse gas cooktop & canopy rangehood",
      "20mm stone to kitchen, bathroom & ensuite vanities",
      "Soft-close cabinet doors & drawers throughout",
      "LED downlights to main living zones & flyscreens",
    ],
  },
  {
    tier: "H3 Luxury Inclusions" as InclusionTier,
    shortCode: "H3",
    title: "Luxury Living",
    tagline: "Executive Architectural Finish",
    badge: "Executive",
    badgeColor: "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950",
    features: [
      "40mm stone benchtops with dual waterfall ends",
      "2740mm (9ft) high ceilings to ground floor",
      "Multi-zone reverse cycle ducted air conditioning",
      "Floor-to-ceiling rectified porcelain bathroom tiling",
    ],
  },
  {
    tier: "IP Investor Pack" as InclusionTier,
    shortCode: "IP",
    title: "IP Investor Pack",
    tagline: "100% Turnkey High-Yield Finish",
    badge: "Turnkey Ready",
    badgeColor: "bg-cyan-500 text-slate-950",
    features: [
      "Driveway, crossover, fencing, letterbox & clothesline",
      "Block-out roller blinds & flyscreens throughout",
      "Reverse cycle air conditioning & LED downlights",
      "20mm stone kitchen benchtops & dishwasher",
    ],
  },
  {
    tier: "FHB Start Smart" as InclusionTier,
    shortCode: "FHB",
    title: "FHB Start Smart",
    tagline: "First Home Buyer Grant Ready",
    badge: "FHOG Ready",
    badgeColor: "bg-purple-500 text-white",
    features: [
      "Eligible for $30k QLD / $10k NSW FHOG",
      "Fixed-price contract with zero price blowouts",
      "600mm Haier stainless steel appliance suite",
      "Ceramic living tiles & quality carpet with underlay",
    ],
  },
];

export function V2StepFloorPlan({
  design,
  division: propDivision,
  clientState,
  onChange,
  onAddInclusionLineItems,
  onNext,
  onPrev,
  isLight,
}: V2StepFloorPlanProps) {
  // Active Division (QLD vs NSW)
  const [division, setDivision] = useState<Division>(() => {
    return (clientState || propDivision || getActiveDivision()) === "NSW" ? "NSW" : "QLD";
  });

  useEffect(() => {
    if (clientState) {
      setDivision(clientState);
    } else if (propDivision) {
      setDivision(propDivision);
    }
  }, [clientState, propDivision]);

  useEffect(() => {
    return onDivisionChanged((newDiv) => {
      setDivision(newDiv);
    });
  }, []);

  // Mode: standard, modified, custom
  const [designMode, setDesignMode] = useState<"standard" | "modified" | "custom">(() => {
    if (design.mode === "custom_floorplan") return "custom";
    if (design.isModifiedFloorplan) return "modified";
    return "standard";
  });

  const [houseType, setHouseType] = useState<HousingTypeTab>(() => {
    const raw = design.housingType || "Single Storey";
    if (raw.includes("Double")) return "Double Storey";
    if (raw.includes("Dual") || raw.includes("Duplex")) return "Dual Living";
    if (raw.includes("Split")) return "Split Level";
    if (raw.includes("Granny")) return "Granny Flat";
    return "Single Storey";
  });

  // Dropdown search query
  const [searchQuery, setSearchQuery] = useState(design.designName || "");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Modified floor plan search & dropdown states
  const [modifiedSearchQuery, setModifiedSearchQuery] = useState(
    design.isModifiedFloorplan ? (design.designName || "") : ""
  );
  const [isModifiedDropdownOpen, setIsModifiedDropdownOpen] = useState(false);
  const modifiedDropdownRef = useRef<HTMLDivElement>(null);

  // 2nd Dwelling states
  const isSecondDwellingActive = Boolean(design.hasSecondDwelling && design.secondDwelling?.enabled);
  const [secondHouseType, setSecondHouseType] = useState<HousingTypeTab>(() => {
    return (design.secondDwelling?.housingType as HousingTypeTab) || "Granny Flat";
  });
  const [secondSearchQuery, setSecondSearchQuery] = useState(design.secondDwelling?.designName || "");
  const [isSecondDropdownOpen, setIsSecondDropdownOpen] = useState(false);
  const secondDropdownRef = useRef<HTMLDivElement>(null);

  // Explicit user tier selection state (so Point 4 is hidden until Point 3 is clicked)
  const [selectedTierCode, setSelectedTierCode] = useState<"H1" | "H2" | "H3" | "IP" | "FHB" | null>(() => {
    if (design.specTier) {
      const upper = design.specTier.toUpperCase();
      if (upper.includes("IP") || upper.includes("INVEST")) return "IP";
      if (upper.includes("FHB") || upper.includes("START SMART") || upper.includes("FIRST HOME") || upper.includes("SMART SERIES")) return "FHB";
      if (design.hasExplicitlySelectedTier) {
        if (upper.includes("H1")) return "H1";
        if (upper.includes("H3")) return "H3";
        return "H2";
      }
    }
    return null;
  });

  useEffect(() => {
    if (design.specTier) {
      const upper = design.specTier.toUpperCase();
      if (upper.includes("IP") || upper.includes("INVEST")) setSelectedTierCode("IP");
      else if (upper.includes("FHB") || upper.includes("START SMART") || upper.includes("FIRST HOME") || upper.includes("SMART SERIES")) setSelectedTierCode("FHB");
      else if (design.hasExplicitlySelectedTier) {
        if (upper.includes("H1")) setSelectedTierCode("H1");
        else if (upper.includes("H3")) setSelectedTierCode("H3");
        else setSelectedTierCode("H2");
      }
    }
  }, [design.specTier, design.hasExplicitlySelectedTier]);

  // File scan states for modified plan
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const customElevationInputRef = useRef<HTMLInputElement>(null);
  const [modifiedPlanPreviewUrl, setModifiedPlanPreviewUrl] = useState<string>(() => design.modifiedPlanImageUrl || "");
  const [isDimensionTableUnchanged, setIsDimensionTableUnchanged] = useState(false);
  const [scanMessage, setScanMessage] = useState<{ type: "success" | "warning" | "info"; text: string } | null>(null);
  // Progressive Sub-Steps for Modified Floor Plan: 1. upload -> 2. confirm_base -> 3. areas
  const [modifiedSubStep, setModifiedSubStep] = useState<"upload" | "confirm_base" | "areas">(() => {
    if (
      design.isModifiedFloorplan &&
      design.designName &&
      (design.modifiedPlanFileName || design.modifiedAreas || (design.areas && (design.areas.totalM2 || 0) > 0))
    ) {
      return "areas";
    }
    return "upload";
  });
  const [detectedCandidate, setDetectedCandidate] = useState<DetectedFloorplan | null>(null);

  // Façade selection mode: "catalogue" | "custom"
  const [facadeMode, setFacadeMode] = useState<"catalogue" | "custom">(() => {
    return design.isCustomFacade ? "custom" : "catalogue";
  });

  const activeNormTier = normalizeInclusionTier(design.specTier);
  const activeExtensionRates = EXTENSION_RATES_BY_TIER[activeNormTier] || EXTENSION_RATES_BY_TIER.H2;

  const [pendingCandidate, setPendingCandidate] = useState<BaseDesignCandidate | null>(null);
  const [isBaseConfirmOpen, setIsBaseConfirmOpen] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState<PlanModificationAnalysis | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [uploadedModifiedFile, setUploadedModifiedFile] = useState<File | null>(null);
  const [isAnalyzingDeepPlan, setIsAnalyzingDeepPlan] = useState(false);
  const [catalogueSearchQuery, setCatalogueSearchQuery] = useState("");
  const [selectedCatalogueCategory, setSelectedCatalogueCategory] = useState<string>("all");
  const [appliedCatalogueItems, setAppliedCatalogueItems] = useState<QuoteSelectedLineItem[]>([]);

  // Custom floor areas local state
  const [isAddingCustomArea, setIsAddingCustomArea] = useState(false);
  const [newCustomAreaName, setNewCustomAreaName] = useState("");
  const [newCustomAreaM2, setNewCustomAreaM2] = useState("");
  const [newCustomAreaRate, setNewCustomAreaRate] = useState("850");
  const [isBalconyActive, setIsBalconyActive] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (modifiedDropdownRef.current && !modifiedDropdownRef.current.contains(e.target as Node)) {
        setIsModifiedDropdownOpen(false);
      }
      if (secondDropdownRef.current && !secondDropdownRef.current.contains(e.target as Node)) {
        setIsSecondDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync searchQuery when designName changes from outside
  useEffect(() => {
    if (design.designName && design.designName !== searchQuery && !isDropdownOpen) {
      setSearchQuery(design.designName);
    }
  }, [design.designName]);

  // Sync modifiedSearchQuery when designName changes from outside
  useEffect(() => {
    if (design.isModifiedFloorplan && design.designName && design.designName !== modifiedSearchQuery && !isModifiedDropdownOpen) {
      setModifiedSearchQuery(design.designName);
    }
  }, [design.designName, design.isModifiedFloorplan]);

  // Sync secondSearchQuery when secondDwelling.designName changes from outside
  useEffect(() => {
    if (design.secondDwelling?.designName && design.secondDwelling.designName !== secondSearchQuery && !isSecondDropdownOpen) {
      setSecondSearchQuery(design.secondDwelling.designName);
    }
  }, [design.secondDwelling?.designName]);

  // All price rows grouped according to active state division (QLD vs NSW)
  const allModels = useMemo(() => {
    const list: { row: PriceRow; type: HousingTypeTab }[] = [];
    const isGrannyFlat = (r: PriceRow) => /^aqua\b/i.test(r.name);

    const isNsw = division === "NSW";
    const singlePrices = isNsw ? NSW_SINGLE_STOREY_PRICES : SINGLE_STOREY_PRICES;
    const doublePrices = isNsw ? NSW_DOUBLE_STOREY_PRICES : DOUBLE_STOREY_PRICES;
    const dualPrices = isNsw ? NSW_DUAL_OC_PRICES : DUAL_OC_PRICES;
    const splitPrices = isNsw ? NSW_SPLIT_LEVEL_PRICES : SPLIT_LEVEL_PRICES;

    singlePrices.forEach((r) => {
      if (isGrannyFlat(r)) {
        list.push({ row: r, type: "Granny Flat" });
      } else {
        list.push({ row: r, type: "Single Storey" });
      }
    });
    doublePrices.forEach((r) => list.push({ row: r, type: "Double Storey" }));
    dualPrices.forEach((r) => list.push({ row: r, type: "Dual Living" }));
    splitPrices.forEach((r) => list.push({ row: r, type: "Split Level" }));

    return list;
  }, [division]);

  const isNsw = division === "NSW";

  const isCurrentDesignFhbEligible = useMemo(() => {
    return isFhbIpEligibleDesign(design.designName, division);
  }, [design.designName, division]);

  // All 5 inclusion tiers (H1, H2, H3, IP, FHB) are available across both NSW and QLD
  const availableTiers = useMemo(() => {
    return INCLUSION_TIERS;
  }, []);

  // Re-price design when division changes so QLD vs NSW prices update live
  useEffect(() => {
    if (design.designName && (design.mode === "standard" || !design.mode)) {
      const cleanTarget = cleanDesignNameForFhb(design.designName);
      const matched =
        allModels.find((m) => m.row.name.toLowerCase() === design.designName.toLowerCase()) ||
        allModels.find((m) => cleanDesignNameForFhb(m.row.name) === cleanTarget);
      if (matched) {
        let tier = design.specTier || "H2 Design Collection";
        // If active tier is FHB/IP and design is not FHB-eligible in the new division, revert to H2
        if (
          (tier.includes("IP") || tier.includes("FHB") || tier.includes("Start Smart") || tier.includes("Smart Series")) &&
          !isFhbIpEligibleDesign(matched.row.name, division)
        ) {
          tier = "H2 Design Collection";
          setSelectedTierCode("H2");
        }
        const newBasePrice = getTierPrice(matched.row, tier, matched.type, division);
        if (newBasePrice > 0 && (newBasePrice !== design.basePrice || tier !== design.specTier)) {
          onChange({
            specTier: tier,
            standardBasePrice: newBasePrice,
            basePrice: newBasePrice,
            designM2: matched.row.m2,
          });
        }
      }
    }
  }, [division, allModels]);

  // Filtered designs for current house type and search
  const filteredModels = useMemo(() => {
    return allModels.filter(({ row, type }) => {
      if (type !== houseType) return false;
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = row.name.toLowerCase().includes(query);
        const matchesFhb =
          (query === "fhb" || query.includes("invest") || query === "turnkey") &&
          isFhbIpEligibleDesign(row.name, division);
        return matchesName || matchesFhb;
      }
      return true;
    });
  }, [allModels, houseType, searchQuery, division]);

  // Filtered designs for modified floor plan base design selector
  const filteredModifiedModels = useMemo(() => {
    const query = (modifiedSearchQuery || searchQuery || "").trim().toLowerCase();
    if (!query) {
      // Default: show models for active houseType
      const byType = allModels.filter((m) => m.type === houseType);
      return byType.length > 0 ? byType : allModels;
    }
    // With query: search across all models in catalogue
    const matches = allModels.filter(({ row }) => {
      return row.name.toLowerCase().includes(query);
    });

    return matches.sort((a, b) => {
      const aLower = a.row.name.toLowerCase();
      const bLower = b.row.name.toLowerCase();
      const aStarts = aLower.startsWith(query);
      const bStarts = bLower.startsWith(query);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      if (a.type === houseType && b.type !== houseType) return -1;
      if (a.type !== houseType && b.type === houseType) return 1;
      return a.row.name.localeCompare(b.row.name);
    });
  }, [allModels, houseType, modifiedSearchQuery, searchQuery]);

  // Current matched model
  const currentModel = useMemo(() => {
    if (!design.designName) return null;
    const cleanTarget = cleanDesignNameForFhb(design.designName);
    return (
      allModels.find((m) => m.row.name.toLowerCase() === design.designName.toLowerCase()) ||
      allModels.find((m) => cleanDesignNameForFhb(m.row.name) === cleanTarget) ||
      null
    );
  }, [allModels, design.designName]);

  // Suitable facades for selected design
  const suitableFacades = useMemo(() => {
    if (!design.designName) return [];
    return getFacadesForDesignAndHousingType(design.designName, design.housingType || houseType, division);
  }, [design.designName, design.housingType, houseType, division]);

  // Ensure a valid facade is selected
  useEffect(() => {
    if (suitableFacades.length > 0 && !design.facadeName) {
      const defaultFacade = suitableFacades[0];
      onChange({
        facadeName: defaultFacade.name,
        facadePrice: defaultFacade.uplift,
      });
    }
  }, [suitableFacades, design.facadeName]);

  // RHS Facade Preview image resolver
  const facadePreviewUrl = useMemo(() => {
    if (design.isCustomFacade && design.facadeImageUrl) {
      return design.facadeImageUrl;
    }
    const facadeName = design.facadeName || "Classic";
    const isDouble = isDoubleStoreyDesign(design.designName, design.housingType || houseType);
    const matched = findFacadeForDesign(facadeName, isDouble, design.housingType || houseType, design.designName);

    if (matched) {
      if (PRE_RENDERED_FACADES[matched.id]) {
        return PRE_RENDERED_FACADES[matched.id];
      }
      return matched.url || "/facades/classic-facade-single-stry.jpg";
    }
    return "/facades/classic-facade-single-stry.jpg";
  }, [design.facadeName, design.isCustomFacade, design.facadeImageUrl, design.designName, design.housingType, houseType]);

  // Filtered designs for 2nd dwelling search
  const filteredSecondModels = useMemo(() => {
    return allModels.filter(({ row, type }) => {
      if (type !== secondHouseType) return false;
      if (secondSearchQuery.trim().length > 0) {
        const query = secondSearchQuery.toLowerCase().trim();
        return row.name.toLowerCase().includes(query);
      }
      return true;
    });
  }, [allModels, secondHouseType, secondSearchQuery]);

  // Suitable facades for 2nd dwelling
  const secondSuitableFacades = useMemo(() => {
    if (!design.secondDwelling?.designName) return [];
    return getFacadesForDesignAndHousingType(
      design.secondDwelling.designName,
      design.secondDwelling.housingType || secondHouseType,
      division
    );
  }, [design.secondDwelling?.designName, design.secondDwelling?.housingType, secondHouseType, division]);

  // Ensure valid facade for 2nd dwelling when active
  useEffect(() => {
    if (isSecondDwellingActive && secondSuitableFacades.length > 0 && !design.secondDwelling?.facadeName) {
      const def = secondSuitableFacades[0];
      onChange({
        secondDwelling: {
          ...(design.secondDwelling as any),
          facadeName: def.name,
          facadePrice: def.uplift,
        },
      });
    }
  }, [isSecondDwellingActive, secondSuitableFacades, design.secondDwelling?.facadeName]);

  // 2nd Dwelling Facade Preview image
  const secondFacadePreviewUrl = useMemo(() => {
    if (!design.secondDwelling?.facadeName) return "/facades/classic-facade-single-stry.jpg";
    const matched = findFacadeForDesign(
      design.secondDwelling.facadeName,
      design.secondDwelling.housingType === "Double Storey",
      design.secondDwelling.housingType || "Granny Flat",
      design.secondDwelling.designName
    );
    if (matched) {
      if (PRE_RENDERED_FACADES[matched.id]) {
        return PRE_RENDERED_FACADES[matched.id];
      }
      return matched.url || "/facades/classic-facade-single-stry.jpg";
    }
    return "/facades/classic-facade-single-stry.jpg";
  }, [design.secondDwelling?.facadeName, design.secondDwelling?.housingType, design.secondDwelling?.designName]);

  const secondDwellingTotalPrice = useMemo(() => {
    const base = Number(design.secondDwelling?.basePrice) || 0;
    const facade = Number(design.secondDwelling?.facadePrice) || 0;
    return base + facade;
  }, [design.secondDwelling?.basePrice, design.secondDwelling?.facadePrice]);

  // Handlers for 2nd Dwelling
  const handleEnableSecondDwelling = () => {
    const grannyModels = allModels.filter((m) => m.type === "Granny Flat");
    const defaultModel = grannyModels[0]?.row || { name: "Aqua 1", m2: 59.96, h1: 138900, h2: 158900, h3: 185900 };
    const initialTier: InclusionTier = design.specTier || "H1 Smart Living";
    const basePrice = getTierPrice(defaultModel, initialTier, "Granny Flat") || 138900;
    const defaultStdAreas = getStandardAreaBreakdown(defaultModel.name, "Granny Flat", defaultModel.m2);
    const facades = getFacadesForDesignAndHousingType(defaultModel.name, "Granny Flat", division);
    const defaultFacade = facades[0] || { name: "Classic", uplift: 0 };
    const planInfo = plansForDesign(defaultModel.name)[0];

    onChange({
      hasSecondDwelling: true,
      secondDwelling: {
        enabled: true,
        housingType: "Granny Flat",
        designName: defaultModel.name,
        designM2: defaultModel.m2,
        standardDesignM2: defaultModel.m2,
        standardBasePrice: basePrice,
        basePrice,
        facadeName: defaultFacade.name,
        facadePrice: defaultFacade.uplift,
        specTier: initialTier,
        standardAreas: defaultStdAreas,
        modifiedAreas: defaultStdAreas,
        isModifiedFloorplan: false,
        beds: String(planInfo?.beds ?? "2"),
        baths: String(planInfo?.baths ?? "1"),
        cars: String(planInfo?.cars ?? "0"),
        widthM: planInfo?.houseWidth ? String(planInfo.houseWidth) : (planInfo?.width ? String(planInfo.width) : "6.8m"),
        lengthM: planInfo?.houseLength ? String(planInfo.houseLength) : (planInfo?.depth ? String(planInfo.depth) : "8.82m"),
      },
    });
    setSecondHouseType("Granny Flat");
    setSecondSearchQuery(defaultModel.name);
    toast.success("Added 2nd Dwelling (Aqua Granny Flat / Auxiliary Unit)");
  };

  const handleRemoveSecondDwelling = () => {
    onChange({
      hasSecondDwelling: false,
      secondDwelling: {
        ...(design.secondDwelling || {}),
        enabled: false,
      } as any,
    });
    toast.info("Removed 2nd Dwelling");
  };

  const handleSelectSecondHouseType = (type: HousingTypeTab) => {
    setSecondHouseType(type);
    const modelsForType = allModels.filter((m) => m.type === type);
    const firstModel = modelsForType[0]?.row || { name: "Aqua 1", m2: 59.96, h1: 138900 };
    const currentTier = design.secondDwelling?.specTier || design.specTier || "H1 Smart Living";
    const basePrice = getTierPrice(firstModel, currentTier, type);
    const facades = getFacadesForDesignAndHousingType(firstModel.name, type, division);
    const initialFacade = facades[0] || { name: "Classic", uplift: 0 };
    const planInfo = plansForDesign(firstModel.name)[0];
    const stdAreas = getStandardAreaBreakdown(firstModel.name, type, firstModel.m2);

    onChange({
      secondDwelling: {
        ...(design.secondDwelling || { enabled: true }),
        enabled: true,
        housingType: type,
        designName: firstModel.name,
        designM2: firstModel.m2,
        standardDesignM2: firstModel.m2,
        standardBasePrice: basePrice,
        basePrice,
        facadeName: initialFacade.name,
        facadePrice: initialFacade.uplift,
        specTier: currentTier,
        standardAreas: stdAreas,
        modifiedAreas: stdAreas,
        beds: String(planInfo?.beds ?? (firstModel.m2 > 150 ? 3 : 2)),
        baths: String(planInfo?.baths ?? 1),
        cars: String(planInfo?.cars ?? 0),
        widthM: planInfo?.houseWidth ? String(planInfo.houseWidth) : (planInfo?.width ? String(planInfo.width) : ""),
        lengthM: planInfo?.houseLength ? String(planInfo.houseLength) : (planInfo?.depth ? String(planInfo.depth) : ""),
      },
    });
    setSecondSearchQuery(firstModel.name);
  };

  const handleSelectSecondModel = (row: PriceRow, type: HousingTypeTab) => {
    const currentTier = design.secondDwelling?.specTier || design.specTier || "H1 Smart Living";
    const basePrice = getTierPrice(row, currentTier, type);
    const planInfo = plansForDesign(row.name)[0];
    const stdAreas = getStandardAreaBreakdown(row.name, type, row.m2);
    const facades = getFacadesForDesignAndHousingType(row.name, type, division);
    const initialFacade = facades[0] || { name: "Classic", uplift: 0 };

    onChange({
      secondDwelling: {
        ...(design.secondDwelling || { enabled: true }),
        enabled: true,
        housingType: type,
        designName: row.name,
        designM2: row.m2,
        standardDesignM2: row.m2,
        standardBasePrice: basePrice,
        basePrice,
        facadeName: initialFacade.name,
        facadePrice: initialFacade.uplift,
        specTier: currentTier,
        standardAreas: stdAreas,
        modifiedAreas: stdAreas,
        beds: String(planInfo?.beds ?? (type === "Granny Flat" ? "2" : (row.m2 > 150 ? "3" : "2"))),
        baths: String(planInfo?.baths ?? "1"),
        cars: String(planInfo?.cars ?? (type === "Granny Flat" ? "0" : "1")),
        widthM: planInfo?.houseWidth ? String(planInfo.houseWidth) : (planInfo?.width ? String(planInfo.width) : ""),
        lengthM: planInfo?.houseLength ? String(planInfo.houseLength) : (planInfo?.depth ? String(planInfo.depth) : ""),
      },
    });
    setSecondSearchQuery(row.name);
    setIsSecondDropdownOpen(false);
    toast.success(`Selected 2nd Dwelling: ${row.name} (${row.m2} m²)`);
  };

  const handleSelectSecondTier = (tierCode: "H1" | "H2" | "H3") => {
    const currentModelRow = allModels.find(
      (m) => m.row.name.toLowerCase() === (design.secondDwelling?.designName || "").toLowerCase()
    )?.row;

    const targetTier: InclusionTier =
      tierCode === "H1" ? "H1 Smart Living" : tierCode === "H2" ? "H2 Design Collection" : "H3 Luxury Inclusions";

    const nextBasePrice = currentModelRow
      ? getTierPrice(currentModelRow, targetTier, secondHouseType)
      : design.secondDwelling?.basePrice || 154000;

    onChange({
      secondDwelling: {
        ...(design.secondDwelling as any),
        specTier: targetTier,
        basePrice: nextBasePrice,
      },
    });
  };

  const handleSelectSecondFacade = (facadeName: string) => {
    const facades = getFacadesForDesignAndHousingType(
      design.secondDwelling?.designName,
      design.secondDwelling?.housingType || secondHouseType,
      division
    );
    const chosen = facades.find((f) => f.name === facadeName) || { name: facadeName, uplift: 0 };

    onChange({
      secondDwelling: {
        ...(design.secondDwelling as any),
        facadeName: chosen.name,
        facadePrice: chosen.uplift,
      },
    });
  };

  // Multi-storey detection
  const isDoubleOrSplit = useMemo(() => {
    return (
      houseType === "Double Storey" ||
      houseType === "Split Level" ||
      design.housingType === "Double Storey" ||
      design.housingType === "Split Level" ||
      isDoubleStoreyDesign(design.designName, design.housingType || houseType)
    );
  }, [houseType, design.housingType, design.designName]);

  // Baseline reference areas for modified plan comparison
  const standardBaselineAreas = useMemo(() => {
    return getStandardAreaBreakdown(design.designName, design.housingType, design.standardDesignM2 || design.designM2);
  }, [design.designName, design.housingType, design.standardDesignM2, design.designM2]);

  const customAreas: CustomFloorAreaItem[] = useMemo(() => {
    return ((design.modifiedAreas?.customAreas || design.areas?.customAreas || []) as CustomFloorAreaItem[]);
  }, [design.modifiedAreas?.customAreas, design.areas?.customAreas]);

  const isBalconyVisible = Boolean(
    isBalconyActive ||
    (standardBaselineAreas.balconyM2 && standardBaselineAreas.balconyM2 > 0) ||
    (design.areas?.balconyM2 !== undefined && design.areas.balconyM2 > 0) ||
    (design.modifiedAreas?.balconyM2 !== undefined && design.modifiedAreas.balconyM2 > 0)
  );

  const currentLiving = isDoubleOrSplit
    ? ((design.areas?.lowerLivingM2 || 0) + (design.areas?.groundLivingM2 || 0) + (design.areas?.firstLivingM2 || 0)) ||
      ((standardBaselineAreas.lowerLivingM2 || 0) + (standardBaselineAreas.groundLivingM2 || 0) + (standardBaselineAreas.firstLivingM2 || 0))
    : (design.areas?.livingM2 ?? standardBaselineAreas.livingM2 ?? 0);
  const currentGarage = design.areas?.garageM2 ?? standardBaselineAreas.garageM2 ?? 0;
  const currentAlfresco = design.areas?.alfrescoM2 ?? standardBaselineAreas.alfrescoM2 ?? 0;
  const currentPorch = design.areas?.porchM2 ?? standardBaselineAreas.porchM2 ?? 0;
  const currentTotal = design.areas?.totalM2 ?? design.designM2 ?? 0;
  const totalVariance = Math.round((currentTotal - (standardBaselineAreas.totalM2 || 0)) * 100) / 100;

  // Live calculation of modified pricing breakdown & zones
  const modPricingCalc = useMemo(() => {
    if (designMode !== "modified") return null;
    try {
      return calculateModifiedFloorplanPricing(design);
    } catch {
      return null;
    }
  }, [design, designMode]);

  // Handle selecting a standard catalogue design
  const handleSelectModel = (row: PriceRow, type: HousingTypeTab) => {
    let tier = selectedTierCode
      ? (selectedTierCode === "H1"
          ? "H1 Smart Living"
          : selectedTierCode === "H2"
          ? "H2 Design Collection"
          : selectedTierCode === "H3"
          ? "H3 Luxury Inclusions"
          : selectedTierCode === "IP"
          ? "IP Investor Pack"
          : "FHB Start Smart")
      : (design.specTier || "H2 Design Collection");

    // If active tier is IP or FHB, but the newly selected design is NOT eligible:
    if (
      (tier.includes("IP") || tier.includes("FHB") || tier.includes("Start Smart")) &&
      !isFhbIpEligibleDesign(row.name, division)
    ) {
      tier = "H2 Design Collection";
      setSelectedTierCode("H2");
      toast.info(
        `${row.name} is not in the FHB / Investor turnkey range. Specification reset to H2 Design Collection.`
      );
    }

    const basePrice = getTierPrice(row, tier, type, division);
    const planInfo = plansForDesign(row.name)[0];
    const stdAreas = getStandardAreaBreakdown(row.name, type, row.m2);

    const facades = getFacadesForDesignAndHousingType(row.name, type, division);
    const initialFacade = facades[0] || { name: "Classic", uplift: 0 };

    onChange({
      mode: "standard",
      isModifiedFloorplan: false,
      designName: row.name,
      modelName: row.name,
      designM2: row.m2,
      housingType: type,
      basePrice,
      specTier: tier,
      bedrooms: planInfo?.beds ? Number(planInfo.beds) : (type === "Granny Flat" ? 2 : (row.m2 > 240 ? 4 : 3)),
      bathrooms: planInfo?.baths ? Number(planInfo.baths) : 1,
      garage: planInfo?.cars ? Number(planInfo.cars) : (type === "Granny Flat" ? 0 : (row.m2 > 180 ? 2 : 1)),
      facadeName: initialFacade.name,
      facadePrice: initialFacade.uplift,
      areas: stdAreas,
    });

    setSearchQuery(row.name);
    setIsDropdownOpen(false);
    toast.success(`Selected ${row.name} (${row.m2} m²)`);
  };

  // Switch House Type
  const handleSelectHouseType = (type: HousingTypeTab) => {
    setHouseType(type);
    onChange({ housingType: type });
    // If current design doesn't belong to this house type, prompt user to pick from dropdown
    if (currentModel && currentModel.type !== type) {
      setSearchQuery("");
      setIsDropdownOpen(true);
    }
  };

  // Switch Inclusion Tier (Point 3)
  const handleSelectTier = (tierDef: TierCardDef) => {
    const isFhbOrIp = tierDef.shortCode === "IP" || tierDef.shortCode === "FHB";
    if (isFhbOrIp && !isCurrentDesignFhbEligible) {
      toast.error(
        `${tierDef.title} is only available on certified ${division} FHB / Investor Turnkey designs. Please choose an eligible design first.`
      );
      return;
    }

    const tier = tierDef.tier;
    let nextBasePrice = design.basePrice || 350000;

    if (designMode === "standard" && currentModel) {
      nextBasePrice = getTierPrice(currentModel.row, tier, houseType, division);
    } else if (designMode === "modified" && design.baseDesignCandidate) {
      const candModel = allModels.find(
        (m) => m.row.name.toLowerCase() === design.baseDesignCandidate!.modelName.toLowerCase()
      );
      if (candModel) {
        const stdBase = getTierPrice(candModel.row, tier, houseType, division);
        const calc = calculateModifiedFloorplanPricing({
          ...design,
          specTier: tier,
          basePrice: stdBase,
        });
        nextBasePrice = calc.modifiedBasePrice;
      }
    } else if (designMode === "modified" && currentModel) {
      const stdBase = getTierPrice(currentModel.row, tier, houseType, division);
      const calc = calculateModifiedFloorplanPricing({
        ...design,
        specTier: tier,
        basePrice: stdBase,
      });
      nextBasePrice = calc.modifiedBasePrice;
    } else if (designMode === "custom") {
      nextBasePrice = calculateCustomFloorplanPrice(design.customSpec, tier);
    }

    setSelectedTierCode(tierDef.shortCode);
    onChange({
      specTier: tier,
      basePrice: nextBasePrice,
      hasExplicitlySelectedTier: true,
    });
    toast.success(`Selected ${tierDef.title} (${tierDef.shortCode})`);
  };

  // Handle Façade Selection from Dropdown
  const handleSelectFacade = (facadeName: string) => {
    const matched = suitableFacades.find((f) => f.name.toLowerCase() === facadeName.toLowerCase());
    const uplift = matched ? matched.uplift : 0;
    onChange({
      facadeName,
      facadePrice: uplift,
      isCustomFacade: false,
    });
    toast.success(`Selected ${facadeName} Façade (${uplift > 0 ? `+${formatAud(uplift)}` : "Included standard"})`);
  };

  // Custom Elevation Image Upload
  const handleCustomElevationUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = (ev.target?.result as string) || "";
      onChange({
        isCustomFacade: true,
        facadeImageUrl: dataUrl,
      });
      toast.success("Uploaded custom façade elevation render!");
    };
    reader.readAsDataURL(file);
  };

  // Handle selecting a base design to modify in Modified Floor Plan mode
  const handleSelectModifiedBaseModel = (row: PriceRow, type: HousingTypeTab) => {
    if (type !== houseType) {
      setHouseType(type);
    }

    const tier = selectedTierCode
      ? (selectedTierCode === "H1"
          ? "H1 Smart Living"
          : selectedTierCode === "H2"
          ? "H2 Design Collection"
          : selectedTierCode === "H3"
          ? "H3 Luxury Inclusions"
          : selectedTierCode === "IP"
          ? "IP Investor Pack"
          : "FHB Start Smart")
      : (design.specTier || "H2 Design Collection");
    const stdBasePrice = getTierPrice(row, tier, type);
    const planInfo = plansForDesign(row.name)[0];
    const stdAreas = getStandardAreaBreakdown(row.name, type, row.m2);

    const isDouble = type === "Double Storey" || type === "Split Level" || isDoubleStoreyDesign(row.name, type);

    // If existing modified areas exist and have positive values, preserve them; otherwise initialize from standard CAD areas
    const currentModAreas = design.modifiedAreas || design.areas;
    const initialModifiedAreas: FloorplanAreaBreakdown = {
      ...(isDouble
        ? {
            lowerLivingM2: currentModAreas?.lowerLivingM2 && currentModAreas.lowerLivingM2 > 0 ? currentModAreas.lowerLivingM2 : (stdAreas.lowerLivingM2 || 0),
            groundLivingM2: currentModAreas?.groundLivingM2 && currentModAreas.groundLivingM2 > 0 ? currentModAreas.groundLivingM2 : (stdAreas.groundLivingM2 || 0),
            firstLivingM2: currentModAreas?.firstLivingM2 && currentModAreas.firstLivingM2 > 0 ? currentModAreas.firstLivingM2 : (stdAreas.firstLivingM2 || 0),
            balconyM2: currentModAreas?.balconyM2 !== undefined ? currentModAreas.balconyM2 : (stdAreas.balconyM2 || 0),
          }
        : {
            livingM2: currentModAreas?.livingM2 && currentModAreas.livingM2 > 0 ? currentModAreas.livingM2 : (stdAreas.livingM2 || 0),
            balconyM2: currentModAreas?.balconyM2 !== undefined ? currentModAreas.balconyM2 : (stdAreas.balconyM2 || 0),
          }),
      garageM2: currentModAreas?.garageM2 && currentModAreas.garageM2 > 0 ? currentModAreas.garageM2 : (stdAreas.garageM2 || 0),
      alfrescoM2: currentModAreas?.alfrescoM2 && currentModAreas.alfrescoM2 > 0 ? currentModAreas.alfrescoM2 : (stdAreas.alfrescoM2 || 0),
      porchM2: currentModAreas?.porchM2 && currentModAreas.porchM2 > 0 ? currentModAreas.porchM2 : (stdAreas.porchM2 || 0),
      customAreas: currentModAreas?.customAreas || [],
      totalM2: 0,
    };

    const customAreasSum = (initialModifiedAreas.customAreas || []).reduce((sum, ca) => sum + (Number(ca.m2) || 0), 0);
    const calculatedTotal = Math.round(
      ((isDouble
        ? (initialModifiedAreas.lowerLivingM2 || 0) + (initialModifiedAreas.groundLivingM2 || 0) + (initialModifiedAreas.firstLivingM2 || 0) + (initialModifiedAreas.balconyM2 || 0)
        : (initialModifiedAreas.livingM2 || 0) + (initialModifiedAreas.balconyM2 || 0)) +
       (initialModifiedAreas.garageM2 || 0) +
       (initialModifiedAreas.alfrescoM2 || 0) +
       (initialModifiedAreas.porchM2 || 0) +
       customAreasSum) * 100
    ) / 100;
    initialModifiedAreas.totalM2 = calculatedTotal;

    if (stdAreas.balconyM2 && stdAreas.balconyM2 > 0) {
      setIsBalconyActive(true);
    }

    const facades = getFacadesForDesignAndHousingType(row.name, type, division);
    const initialFacade = facades[0] || { name: "Classic", uplift: 0 };

    const calc = calculateModifiedFloorplanPricing({
      ...design,
      mode: "modified",
      isModifiedFloorplan: true,
      designName: row.name,
      modelName: row.name,
      housingType: type,
      standardDesignM2: row.m2,
      standardBasePrice: stdBasePrice,
      standardAreas: stdAreas,
      modifiedAreas: initialModifiedAreas,
      areas: initialModifiedAreas,
      designM2: initialModifiedAreas.totalM2,
      modifiedDesignM2: initialModifiedAreas.totalM2,
      basePrice: stdBasePrice,
    });

    onChange({
      mode: "modified",
      isModifiedFloorplan: true,
      designName: row.name,
      modelName: row.name,
      designM2: initialModifiedAreas.totalM2,
      modifiedDesignM2: initialModifiedAreas.totalM2,
      standardDesignM2: row.m2,
      housingType: type,
      standardBasePrice: stdBasePrice,
      basePrice: calc.modifiedBasePrice,
      bedrooms: planInfo?.beds ? Number(planInfo.beds) : (type === "Granny Flat" ? 2 : (row.m2 > 240 ? 4 : 3)),
      bathrooms: planInfo?.baths ? Number(planInfo.baths) : 1,
      garage: planInfo?.cars ? Number(planInfo.cars) : (type === "Granny Flat" ? 0 : (row.m2 > 180 ? 2 : 1)),
      facadeName: design.facadeName || initialFacade.name,
      facadePrice: design.facadePrice ?? initialFacade.uplift,
      standardAreas: stdAreas,
      modifiedAreas: initialModifiedAreas,
      areas: initialModifiedAreas,
      baseDesignCandidate: {
        modelName: row.name,
        confidence: 1.0,
        housingType: type,
        matchReasons: ["Selected by user"],
        m2Difference: 0,
      },
    });

    setModifiedSearchQuery(row.name);
    setIsModifiedDropdownOpen(false);
    toast.success(`Selected base design: ${row.name} (${row.m2} m²)`);

    if (uploadedModifiedFile) {
      void runDeepPlanModificationScan(uploadedModifiedFile, row.name, type, { openModal: false });
    }
  };

  const handleConfirmDetectedBase = (detected: DetectedFloorplan) => {
    const matched = allModels.find(
      (m) => m.row.name.toLowerCase() === detected.matchedDesignName.toLowerCase()
    );
    const row = matched?.row || detected.priceRow || {
      name: detected.matchedDesignName,
      m2: detected.standardTotalM2,
      h1: detected.basePriceH1,
      h2: detected.basePriceH2,
      hbs: detected.basePriceHBS,
    };
    const type = matched?.type || (detected.housingType as HousingTypeTab) || "Single Storey";
    handleSelectModifiedBaseModel(row as PriceRow, type);

    if (detected.roomAreas && detected.hasSqmVariance && detected.extractedTable) {
      const isDouble = type === "Double Storey" || type === "Split Level" || isDoubleStoreyDesign(row.name, type);
      const newAreas: FloorplanAreaBreakdown = {
        ...(isDouble
          ? {
              lowerLivingM2: (detected.roomAreas as any).lowerLivingM2 ?? 0,
              groundLivingM2: detected.roomAreas.groundLivingM2 ?? detected.roomAreas.livingM2 ?? 0,
              firstLivingM2: detected.roomAreas.firstLivingM2 ?? 0,
              balconyM2: detected.roomAreas.balconyM2 ?? 0,
            }
          : {
              livingM2: detected.roomAreas.livingM2 ?? 0,
              balconyM2: detected.roomAreas.balconyM2 ?? 0,
            }),
        garageM2: detected.roomAreas.garageM2 ?? 0,
        alfrescoM2: detected.roomAreas.alfrescoM2 ?? 0,
        porchM2: detected.roomAreas.porchM2 ?? 0,
        customAreas: [],
        totalM2: detected.totalM2 || detected.roomAreas.totalM2 || row.m2,
      };

      if ((detected.roomAreas.balconyM2 || 0) > 0) {
        setIsBalconyActive(true);
      }

      onChange({
        modifiedAreas: newAreas,
        areas: newAreas,
        designM2: newAreas.totalM2,
        modifiedDesignM2: newAreas.totalM2,
      });
    }

    setModifiedSubStep("areas");
    toast.success(`Confirmed base design: ${detected.matchedDesignName}`);

    if (
      pendingAnalysis &&
      pendingAnalysis.baseDesignName.toLowerCase() === row.name.toLowerCase()
    ) {
      handleApplyModifiedPlan(pendingAnalysis, { keepModalOpen: false, silent: true });
    } else if (uploadedModifiedFile && !isAnalyzingDeepPlan) {
      void runDeepPlanModificationScan(uploadedModifiedFile, row.name, type, { openModal: false });
    }
  };

  // Modified Area change handler
  const handleModifiedAreaChange = (field: keyof FloorplanAreaBreakdown, valStr: string) => {
    const val = parseFloat(valStr) || 0;
    const currentAreas = design.areas || design.modifiedAreas || getStandardAreaBreakdown(design.designName, design.housingType, design.designM2);
    const updatedAreas: FloorplanAreaBreakdown = {
      garageM2: 0,
      alfrescoM2: 0,
      porchM2: 0,
      ...currentAreas,
      [field]: val,
      totalM2: 0,
    };

    const isDouble = design.housingType === "Double Storey" ||
      design.housingType === "Split Level" ||
      isDoubleStoreyDesign(design.designName, design.housingType || houseType);

    const customAreasSum = (updatedAreas.customAreas || []).reduce((sum, ca) => sum + (Number(ca.m2) || 0), 0);
    const updatedTotal = Math.round(
      ((isDouble
        ? (updatedAreas.lowerLivingM2 || 0) + (updatedAreas.groundLivingM2 || 0) + (updatedAreas.firstLivingM2 || 0) + (updatedAreas.balconyM2 || 0)
        : (updatedAreas.livingM2 || 0) + (updatedAreas.balconyM2 || 0)) +
      (updatedAreas.garageM2 || 0) +
      (updatedAreas.alfrescoM2 || 0) +
      (updatedAreas.porchM2 || 0) +
      customAreasSum) * 100
    ) / 100;

    updatedAreas.totalM2 = updatedTotal;

    const currentBasePrice = design.standardBasePrice || currentModel?.row.h1 || currentModel?.row.hbs || design.basePrice || 0;
    const calc = calculateModifiedFloorplanPricing({
      ...design,
      isModifiedFloorplan: true,
      standardAreas: standardBaselineAreas,
      modifiedAreas: updatedAreas,
      areas: updatedAreas,
      designM2: updatedTotal,
      modifiedDesignM2: updatedTotal,
      standardDesignM2: standardBaselineAreas.totalM2,
      standardBasePrice: currentBasePrice,
    });

    onChange({
      isModifiedFloorplan: true,
      standardAreas: standardBaselineAreas,
      modifiedAreas: updatedAreas,
      areas: updatedAreas,
      designM2: updatedTotal,
      modifiedDesignM2: updatedTotal,
      standardDesignM2: standardBaselineAreas.totalM2,
      standardBasePrice: currentBasePrice,
      basePrice: calc.modifiedBasePrice,
    });
  };

  // Add a bespoke / custom floor area (e.g. Balcony, Deck, Pergola, Workshop)
  const handleAddCustomArea = (name: string, m2: number, ratePerM2: number) => {
    if (!name.trim() || m2 <= 0) return;
    const currentAreas = design.areas || design.modifiedAreas || getStandardAreaBreakdown(design.designName, design.housingType, design.designM2);
    const existingCustom = currentAreas.customAreas || [];
    const newCustomItem: CustomFloorAreaItem = {
      id: `custom_${Date.now()}`,
      name: name.trim(),
      m2: Math.round(m2 * 100) / 100,
      ratePerM2: Math.round(ratePerM2) || 850,
      recipeId: "recipe_custom_ext",
    };
    const updatedCustom = [...existingCustom, newCustomItem];
    const updatedAreas: FloorplanAreaBreakdown = {
      garageM2: 0,
      alfrescoM2: 0,
      porchM2: 0,
      ...currentAreas,
      customAreas: updatedCustom,
      totalM2: 0,
    };

    const isDouble = design.housingType === "Double Storey" ||
      design.housingType === "Split Level" ||
      isDoubleStoreyDesign(design.designName, design.housingType || houseType);

    const customAreasSum = updatedCustom.reduce((sum, ca) => sum + (Number(ca.m2) || 0), 0);
    const updatedTotal = Math.round(
      ((isDouble
        ? (updatedAreas.lowerLivingM2 || 0) + (updatedAreas.groundLivingM2 || 0) + (updatedAreas.firstLivingM2 || 0) + (updatedAreas.balconyM2 || 0)
        : (updatedAreas.livingM2 || 0) + (updatedAreas.balconyM2 || 0)) +
      (updatedAreas.garageM2 || 0) +
      (updatedAreas.alfrescoM2 || 0) +
      (updatedAreas.porchM2 || 0) +
      customAreasSum) * 100
    ) / 100;

    updatedAreas.totalM2 = updatedTotal;
    const currentBasePrice = design.standardBasePrice || currentModel?.row.h1 || currentModel?.row.hbs || design.basePrice || 0;
    const calc = calculateModifiedFloorplanPricing({
      ...design,
      isModifiedFloorplan: true,
      standardAreas: standardBaselineAreas,
      modifiedAreas: updatedAreas,
      areas: updatedAreas,
      designM2: updatedTotal,
      modifiedDesignM2: updatedTotal,
      standardDesignM2: standardBaselineAreas.totalM2,
      standardBasePrice: currentBasePrice,
    });

    onChange({
      isModifiedFloorplan: true,
      standardAreas: standardBaselineAreas,
      modifiedAreas: updatedAreas,
      areas: updatedAreas,
      designM2: updatedTotal,
      modifiedDesignM2: updatedTotal,
      standardDesignM2: standardBaselineAreas.totalM2,
      standardBasePrice: currentBasePrice,
      basePrice: calc.modifiedBasePrice,
    });

    setIsAddingCustomArea(false);
    setNewCustomAreaName("");
    setNewCustomAreaM2("");
    toast.success(`Added ${newCustomItem.name} (${newCustomItem.m2} m² @ $${newCustomItem.ratePerM2}/m²)`);
  };

  // Delete a bespoke / custom floor area
  const handleDeleteCustomArea = (id: string) => {
    const currentAreas = design.areas || design.modifiedAreas || getStandardAreaBreakdown(design.designName, design.housingType, design.designM2);
    const existingCustom = currentAreas.customAreas || [];
    const updatedCustom = existingCustom.filter((c) => c.id !== id);
    const updatedAreas: FloorplanAreaBreakdown = {
      garageM2: 0,
      alfrescoM2: 0,
      porchM2: 0,
      ...currentAreas,
      customAreas: updatedCustom,
      totalM2: 0,
    };

    const isDouble = design.housingType === "Double Storey" ||
      design.housingType === "Split Level" ||
      isDoubleStoreyDesign(design.designName, design.housingType || houseType);

    const customAreasSum = updatedCustom.reduce((sum, ca) => sum + (Number(ca.m2) || 0), 0);
    const updatedTotal = Math.round(
      ((isDouble
        ? (updatedAreas.lowerLivingM2 || 0) + (updatedAreas.groundLivingM2 || 0) + (updatedAreas.firstLivingM2 || 0) + (updatedAreas.balconyM2 || 0)
        : (updatedAreas.livingM2 || 0) + (updatedAreas.balconyM2 || 0)) +
      (updatedAreas.garageM2 || 0) +
      (updatedAreas.alfrescoM2 || 0) +
      (updatedAreas.porchM2 || 0) +
      customAreasSum) * 100
    ) / 100;

    updatedAreas.totalM2 = updatedTotal;
    const currentBasePrice = design.standardBasePrice || currentModel?.row.h1 || currentModel?.row.hbs || design.basePrice || 0;
    const calc = calculateModifiedFloorplanPricing({
      ...design,
      isModifiedFloorplan: true,
      standardAreas: standardBaselineAreas,
      modifiedAreas: updatedAreas,
      areas: updatedAreas,
      designM2: updatedTotal,
      modifiedDesignM2: updatedTotal,
      standardDesignM2: standardBaselineAreas.totalM2,
      standardBasePrice: currentBasePrice,
    });

    onChange({
      isModifiedFloorplan: true,
      standardAreas: standardBaselineAreas,
      modifiedAreas: updatedAreas,
      areas: updatedAreas,
      designM2: updatedTotal,
      modifiedDesignM2: updatedTotal,
      standardDesignM2: standardBaselineAreas.totalM2,
      standardBasePrice: currentBasePrice,
      basePrice: calc.modifiedBasePrice,
    });
    toast.info("Custom area removed");
  };

  // Update an existing custom floor area
  const handleUpdateCustomArea = (id: string, newM2: number, newRate?: number) => {
    const currentAreas = design.areas || design.modifiedAreas || getStandardAreaBreakdown(design.designName, design.housingType, design.designM2);
    const existingCustom = currentAreas.customAreas || [];
    const updatedCustom = existingCustom.map((c) => {
      if (c.id === id) {
        return {
          ...c,
          m2: Math.max(0, Math.round(newM2 * 100) / 100),
          ...(newRate !== undefined ? { ratePerM2: Math.max(0, Math.round(newRate)) } : {}),
        };
      }
      return c;
    });
    const updatedAreas: FloorplanAreaBreakdown = {
      garageM2: 0,
      alfrescoM2: 0,
      porchM2: 0,
      ...currentAreas,
      customAreas: updatedCustom,
      totalM2: 0,
    };

    const isDouble = design.housingType === "Double Storey" ||
      design.housingType === "Split Level" ||
      isDoubleStoreyDesign(design.designName, design.housingType || houseType);

    const customAreasSum = updatedCustom.reduce((sum, ca) => sum + (Number(ca.m2) || 0), 0);
    const updatedTotal = Math.round(
      ((isDouble
        ? (updatedAreas.lowerLivingM2 || 0) + (updatedAreas.groundLivingM2 || 0) + (updatedAreas.firstLivingM2 || 0) + (updatedAreas.balconyM2 || 0)
        : (updatedAreas.livingM2 || 0) + (updatedAreas.balconyM2 || 0)) +
      (updatedAreas.garageM2 || 0) +
      (updatedAreas.alfrescoM2 || 0) +
      (updatedAreas.porchM2 || 0) +
      customAreasSum) * 100
    ) / 100;

    updatedAreas.totalM2 = updatedTotal;
    const currentBasePrice = design.standardBasePrice || currentModel?.row.h1 || currentModel?.row.hbs || design.basePrice || 0;
    const calc = calculateModifiedFloorplanPricing({
      ...design,
      isModifiedFloorplan: true,
      standardAreas: standardBaselineAreas,
      modifiedAreas: updatedAreas,
      areas: updatedAreas,
      designM2: updatedTotal,
      modifiedDesignM2: updatedTotal,
      standardDesignM2: standardBaselineAreas.totalM2,
      standardBasePrice: currentBasePrice,
    });

    onChange({
      isModifiedFloorplan: true,
      standardAreas: standardBaselineAreas,
      modifiedAreas: updatedAreas,
      areas: updatedAreas,
      designM2: updatedTotal,
      modifiedDesignM2: updatedTotal,
      standardDesignM2: standardBaselineAreas.totalM2,
      standardBasePrice: currentBasePrice,
      basePrice: calc.modifiedBasePrice,
    });
  };

  // Quick stepper adjustments
  const handleStepArea = (field: keyof FloorplanAreaBreakdown, delta: number) => {
    const currentVal = design.areas?.[field] ?? design.modifiedAreas?.[field] ?? (standardBaselineAreas as any)[field] ?? 0;
    const newVal = Math.max(0, Math.round((currentVal + delta) * 10) / 10);
    handleModifiedAreaChange(field, newVal.toString());
  };

  // Reset zone area to CAD standard baseline
  const handleResetArea = (field: keyof FloorplanAreaBreakdown) => {
    const stdVal = (standardBaselineAreas as any)[field] ?? 0;
    handleModifiedAreaChange(field, stdVal.toString());
  };

  // File Upload scan for architectural modified plans (extract schedule or prompt for manual sizes)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedModifiedFile(file);

    try {
      setIsScanning(true);
      setScanStatus("Parsing architectural drawing & scanning dimension table…");

      let rawText = "";
      let previewUrl = "";

      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        try {
          const parsed = await pdfDocumentToPagesAndText(file, 1);
          rawText = parsed.rawText || "";
          previewUrl = parsed.primaryFloorplanDataUrl || parsed.pages[0] || "";
        } catch (pdfErr) {
          console.warn("PDF parse error:", pdfErr);
        }
      } else {
        // Image file (JPG / PNG)
        previewUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve((ev.target?.result as string) || "");
          reader.readAsDataURL(file);
        });
      }

      if (previewUrl) {
        setModifiedPlanPreviewUrl(previewUrl);
      }

      // Check for dimension table in extracted text
      const parsedSchedule = rawText ? parseAreaScheduleFromText(rawText) : null;
      const baselineAreas = design.areas || getStandardAreaBreakdown(design.designName, design.housingType, design.designM2);

      const hasParsedDimensions = Boolean(
        parsedSchedule &&
        (parsedSchedule.totalM2 || parsedSchedule.livingM2 || parsedSchedule.groundLivingM2 || parsedSchedule.lowerLivingM2 || parsedSchedule.balconyM2)
      );

      // Check if the extracted dimensions are changed from baseline
      const isChangedFromBaseline = Boolean(hasParsedDimensions && (
        (parsedSchedule?.totalM2 && Math.abs(parsedSchedule.totalM2 - (baselineAreas.totalM2 || 0)) > 0.1) ||
        (parsedSchedule?.livingM2 && Math.abs(parsedSchedule.livingM2 - (baselineAreas.livingM2 || 0)) > 0.1) ||
        (parsedSchedule?.lowerLivingM2 && Math.abs(parsedSchedule.lowerLivingM2 - (baselineAreas.lowerLivingM2 || 0)) > 0.1) ||
        (parsedSchedule?.groundLivingM2 && Math.abs(parsedSchedule.groundLivingM2 - (baselineAreas.groundLivingM2 || 0)) > 0.1) ||
        (parsedSchedule?.firstLivingM2 && Math.abs(parsedSchedule.firstLivingM2 - (baselineAreas.firstLivingM2 || 0)) > 0.1) ||
        (parsedSchedule?.garageM2 && Math.abs(parsedSchedule.garageM2 - (baselineAreas.garageM2 || 0)) > 0.1) ||
        (parsedSchedule?.alfrescoM2 && Math.abs(parsedSchedule.alfrescoM2 - (baselineAreas.alfrescoM2 || 0)) > 0.1) ||
        (parsedSchedule?.porchM2 && Math.abs(parsedSchedule.porchM2 - (baselineAreas.porchM2 || 0)) > 0.1) ||
        (parsedSchedule?.balconyM2 !== undefined && Math.abs(parsedSchedule.balconyM2 - (baselineAreas.balconyM2 || 0)) > 0.1) ||
        (parsedSchedule?.unassignedItems && parsedSchedule.unassignedItems.length > 0)
      ));

      if (hasParsedDimensions && isChangedFromBaseline && parsedSchedule) {
        const isDouble = design.housingType === "Double Storey" ||
          design.housingType === "Split Level" ||
          isDoubleStoreyDesign(design.designName, design.housingType || houseType);

        const newLowerLiving = parsedSchedule.lowerLivingM2 ?? baselineAreas.lowerLivingM2 ?? 0;
        const newGroundLiving = parsedSchedule.groundLivingM2 ?? (isDouble && parsedSchedule.livingM2 ? parsedSchedule.livingM2 : (baselineAreas.groundLivingM2 ?? 0));
        const newFirstLiving = parsedSchedule.firstLivingM2 ?? baselineAreas.firstLivingM2 ?? 0;
        const newLiving = !isDouble ? (parsedSchedule.livingM2 || baselineAreas.livingM2 || 0) : 0;
        const newGarage = parsedSchedule.garageM2 ?? baselineAreas.garageM2 ?? 0;
        const newAlfresco = parsedSchedule.alfrescoM2 ?? baselineAreas.alfrescoM2 ?? 0;
        const newPorch = parsedSchedule.porchM2 ?? baselineAreas.porchM2 ?? 0;
        const newBalcony = parsedSchedule.balconyM2 !== undefined ? parsedSchedule.balconyM2 : (baselineAreas.balconyM2 ?? 0);

        // Extract custom areas from unassigned items
        const existingCustom = (design.areas?.customAreas || design.modifiedAreas?.customAreas || []) as CustomFloorAreaItem[];
        const extractedCustom: CustomFloorAreaItem[] = (parsedSchedule.unassignedItems || [])
          .filter((item) => item.sqm > 0 && !existingCustom.some((ec) => ec.name.toLowerCase() === item.label.toLowerCase()))
          .map((item, idx) => ({
            id: `extracted_${Date.now()}_${idx}`,
            name: item.label,
            m2: item.sqm,
            ratePerM2: 850,
          }));
        const combinedCustom = [...existingCustom, ...extractedCustom];
        const customSum = combinedCustom.reduce((sum, ca) => sum + (Number(ca.m2) || 0), 0);

        const livingSum = isDouble
          ? newLowerLiving + newGroundLiving + newFirstLiving + newBalcony
          : newLiving + newBalcony;

        const newTotal = parsedSchedule.totalM2 || Math.round((livingSum + newGarage + newAlfresco + newPorch + customSum) * 100) / 100;

        const updatedAreas: FloorplanAreaBreakdown = {
          ...(isDouble
            ? {
                lowerLivingM2: newLowerLiving,
                groundLivingM2: newGroundLiving,
                firstLivingM2: newFirstLiving,
                balconyM2: newBalcony,
              }
            : {
                livingM2: newLiving,
                balconyM2: newBalcony,
              }),
          garageM2: newGarage,
          alfrescoM2: newAlfresco,
          porchM2: newPorch,
          customAreas: combinedCustom,
          totalM2: newTotal,
        };

        if (newBalcony > 0) {
          setIsBalconyActive(true);
        }

        const currentBasePrice = design.standardBasePrice || currentModel?.row.h1 || currentModel?.row.hbs || design.basePrice || 0;
        const calc = calculateModifiedFloorplanPricing({
          ...design,
          isModifiedFloorplan: true,
          standardAreas: baselineAreas,
          modifiedAreas: updatedAreas,
          areas: updatedAreas,
          designM2: newTotal,
          modifiedDesignM2: newTotal,
          standardDesignM2: baselineAreas.totalM2,
          standardBasePrice: currentBasePrice,
        });

        onChange({
          isModifiedFloorplan: true,
          standardAreas: baselineAreas,
          modifiedAreas: updatedAreas,
          areas: updatedAreas,
          designM2: newTotal,
          modifiedDesignM2: newTotal,
          standardDesignM2: baselineAreas.totalM2,
          standardBasePrice: currentBasePrice,
          basePrice: calc.modifiedBasePrice,
          modifiedPlanFileName: file.name,
          modifiedPlanImageUrl: previewUrl,
        });

        setIsDimensionTableUnchanged(false);
        const parts: string[] = [];
        if (isDouble) {
          if (newLowerLiving > 0) parts.push(`Lower: ${newLowerLiving} m²`);
          if (newGroundLiving > 0) parts.push(`Ground: ${newGroundLiving} m²`);
          if (newFirstLiving > 0) parts.push(`First: ${newFirstLiving} m²`);
        } else {
          if (newLiving > 0) parts.push(`Living: ${newLiving} m²`);
        }
        if (newGarage > 0) parts.push(`Garage: ${newGarage} m²`);
        if (newAlfresco > 0) parts.push(`Alfresco: ${newAlfresco} m²`);
        if (newPorch > 0) parts.push(`Porch: ${newPorch} m²`);
        if (newBalcony > 0) parts.push(`Balcony: ${newBalcony} m²`);
        extractedCustom.forEach((ca) => parts.push(`${ca.name}: ${ca.m2} m²`));

        setScanMessage({
          type: "success",
          text: `Dimension table detected! ${parts.join(" • ")} (Total: ${newTotal} m²)`,
        });
        toast.success(`Extracted modified areas: Total ${newTotal} m²`);
      } else {
        // Dimension table was unchanged or not detected
        setIsDimensionTableUnchanged(true);
        onChange({
          isModifiedFloorplan: true,
          modifiedPlanFileName: file.name,
          modifiedPlanImageUrl: previewUrl,
        });
        setScanMessage({
          type: "warning",
          text: "Schedule of areas was unchanged or not detected on drawing. Please enter the new modified sizes below:",
        });
        toast.info("Dimension table not changed or detected on plan. Please enter the modified sizes below.");
      }

      // Detect base design candidate from drawing text / filename
      const detected = detectFloorplanFromText(rawText, file.name);
      if (detected && detected.matchedDesignName) {
        setDetectedCandidate(detected);
        void runDeepPlanModificationScan(
          file,
          detected.matchedDesignName,
          detected.housingType || design.housingType || houseType,
          { openModal: false }
        );
      } else if (design.designName) {
        setDetectedCandidate(null);
        void runDeepPlanModificationScan(
          file,
          design.designName,
          design.housingType || houseType,
          { openModal: false }
        );
      } else {
        setDetectedCandidate(null);
      }
      setModifiedSubStep("confirm_base");

      setIsScanning(false);
      setScanStatus("");
    } catch (err: any) {
      setIsScanning(false);
      setScanStatus("");
      setIsDimensionTableUnchanged(true);
      setDetectedCandidate(null);
      setModifiedSubStep("confirm_base");
      setScanMessage({
        type: "warning",
        text: "Could not scan dimension table automatically. Please confirm or select base design below:",
      });
      toast.info("Please select base design to continue.");
    }
  };

  // Run full architectural + visual + fixture/benchtop/vanity modification scan against the base Hudson design
  const runDeepPlanModificationScan = async (
    file: File,
    baseDesignName: string,
    baseHousingType: string,
    options?: { openModal?: boolean }
  ) => {
    if (!file || !baseDesignName) return;
    try {
      setIsAnalyzingDeepPlan(true);
      const analysis = await analyzeModifiedFloorplanFile(
        file,
        baseDesignName,
        baseHousingType || houseType,
        design.specTier || "H2 Design Collection"
      );
      setPendingAnalysis(analysis);
      handleApplyModifiedPlan(analysis, {
        keepModalOpen: Boolean(options?.openModal),
        silent: true,
      });
      if (options?.openModal) {
        setIsReviewModalOpen(true);
      }
    } catch (err) {
      console.warn("Deep plan modification scan warning:", err);
    } finally {
      setIsAnalyzingDeepPlan(false);
    }
  };

  const handleApplyModifiedPlan = (
    approved: PlanModificationAnalysis,
    options?: { keepModalOpen?: boolean; silent?: boolean }
  ) => {
    setPendingAnalysis(approved);
    const stdM2 = approved.standardTotalM2;
    const stdAreas = getStandardAreaBreakdown(approved.baseDesignName, approved.housingType, stdM2);

    const updatedModifiedAreas: FloorplanAreaBreakdown = {
      ...stdAreas,
      ...(design.modifiedAreas || {}),
      totalM2: approved.modifiedTotalM2 || stdM2,
    };

    for (const delta of approved.areaDeltas) {
      if (delta.accepted) {
        (updatedModifiedAreas as any)[delta.zoneKey] = delta.modifiedM2;
      } else {
        (updatedModifiedAreas as any)[delta.zoneKey] = delta.standardM2;
      }
    }

    const effectiveHousingType = approved.housingType || houseType;
    const isDouble =
      effectiveHousingType === "Double Storey" ||
      effectiveHousingType === "Split Level" ||
      isDoubleStoreyDesign(approved.baseDesignName, effectiveHousingType);

    const customSum = (updatedModifiedAreas.customAreas || []).reduce(
      (sum, ca) => sum + (Number(ca.m2) || 0),
      0
    );
    const computedTotal =
      Math.round(
        ((isDouble
          ? (updatedModifiedAreas.lowerLivingM2 || 0) +
            (updatedModifiedAreas.groundLivingM2 || 0) +
            (updatedModifiedAreas.firstLivingM2 || 0) +
            (updatedModifiedAreas.balconyM2 || 0)
          : (updatedModifiedAreas.livingM2 || 0) + (updatedModifiedAreas.balconyM2 || 0)) +
          (updatedModifiedAreas.garageM2 || 0) +
          (updatedModifiedAreas.alfrescoM2 || 0) +
          (updatedModifiedAreas.porchM2 || 0) +
          customSum) *
          100
      ) / 100;

    updatedModifiedAreas.totalM2 = computedTotal > 0 ? computedTotal : (approved.modifiedTotalM2 || stdM2);

    const modelName = approved.baseDesignName;
    const matchedModel = allModels.find(
      (m) => m.row.name.toLowerCase() === modelName.toLowerCase()
    );
    const stdPrice = matchedModel
      ? getTierPrice(matchedModel.row, design.specTier, effectiveHousingType)
      : design.standardBasePrice || design.basePrice || 0;

    const calc = calculateModifiedFloorplanPricing({
      ...design,
      mode: "modified",
      isModifiedFloorplan: true,
      designName: modelName,
      housingType: effectiveHousingType as any,
      standardDesignM2: stdM2,
      standardBasePrice: stdPrice,
      standardAreas: stdAreas,
      modifiedAreas: updatedModifiedAreas,
      areas: updatedModifiedAreas,
      designM2: updatedModifiedAreas.totalM2,
      modifiedDesignM2: updatedModifiedAreas.totalM2,
    });

    const updatedDesign: Partial<QuoteDesignSelection> = {
      mode: "modified",
      housingType: effectiveHousingType as any,
      designName: modelName,
      designM2: updatedModifiedAreas.totalM2,
      standardDesignM2: stdM2,
      standardBasePrice: stdPrice,
      isModifiedFloorplan: true,
      standardAreas: stdAreas,
      modifiedAreas: updatedModifiedAreas,
      areas: updatedModifiedAreas,
      modifiedDesignM2: updatedModifiedAreas.totalM2,
      basePrice: calc.modifiedBasePrice,
      ...(approved.floorplanDataUrl ? { floorplanUrl: approved.floorplanDataUrl } : {}),
    };

    onChange(updatedDesign);

    if (onAddInclusionLineItems && !options?.silent) {
      const acceptedUpgrades = (approved.inclusionUpgrades || []).filter((u) => u.accepted);
      const acceptedOpenings = (approved.openingReplacements || []).filter((o) => o.accepted);
      const acceptedRooms = (approved.internalRoomChanges || []).filter((r) => r.accepted);

      const lineItemsToAdd: QuoteSelectedLineItem[] = [
        ...acceptedUpgrades.map((u) => ({
          id: `mod_${u.id}`,
          catalogueItemId: u.id,
          category: u.category,
          name: u.name,
          description: u.description,
          unitType: "fixed" as const,
          unitRate: u.unitPrice,
          quantity: u.quantity,
          subtotal: u.subtotal,
          isIncluded: true,
          isClientSelectable: true,
          clientSelected: true,
          notes: `Detected from modified floorplan (${approved.fileName || "Plan"}): ${u.detected}`,
        })),
        ...acceptedOpenings.map((o) => ({
          id: `mod_op_${o.id}`,
          catalogueItemId: o.id,
          category: "doors_windows" as const,
          name: `${o.newItemName} (80% Credit Applied)`,
          description: o.description,
          unitType: "fixed" as const,
          unitRate: o.netCost,
          quantity: 1,
          subtotal: o.netCost,
          isIncluded: true,
          isClientSelectable: true,
          clientSelected: true,
          notes: `Replaces ${o.replacedItemName} ($${o.replacedItemBaselineCost.toFixed(2)}) with 80% trade credit (-$${Math.abs(o.creditAmount).toFixed(2)}) applied against $${o.newItemCost.toFixed(2)}.`,
        })),
        ...acceptedRooms.map((r) => {
          const isZero = r.isZeroCost || r.subtotal === 0;
          const mappedCategory = isZero
            ? "structural"
            : r.category === "wet_area"
            ? "internal_bathroom"
            : r.category === "doors_hardware"
            ? "doors_windows"
            : r.category === "joinery"
            ? "internal_kitchen"
            : "structural";

          const displayName = isZero
            ? r.roomName
            : r.deltaM2 > 0
            ? `${r.roomName} (+${r.deltaM2} m²)`
            : r.roomName;

          return {
            id: `mod_room_${r.id}`,
            catalogueItemId: r.id,
            category: mappedCategory as any,
            name: displayName,
            description: r.description,
            unitType: "fixed" as const,
            unitRate: isZero ? 0 : r.subtotal,
            quantity: 1,
            subtotal: isZero ? 0 : r.subtotal,
            isIncluded: true,
            isClientSelectable: true,
            clientSelected: true,
            notes: isZero
              ? "Internal non-structural dry layout variation ($0.00)"
              : r.description,
          };
        }),
        ...appliedCatalogueItems,
      ];

      onAddInclusionLineItems(lineItemsToAdd);
    }

    if (!options?.keepModalOpen) {
      setIsReviewModalOpen(false);
    }
    if (!options?.silent) {
      toast.success("Applied modified floor plan parameters!");
    }
  };

  // Quick-add any item from the backend pricing catalogue (benchtops, vanities, sinks, showers, internal elements, doors/windows, structural)
  const handleQuickAddCatalogueItem = (catalogueItemId: string) => {
    const catItem = DEFAULT_CATALOGUE.find((c) => c.id === catalogueItemId);
    if (!catItem) return;

    const lineItem: QuoteSelectedLineItem = {
      id: `mod_cat_${catItem.id}`,
      catalogueItemId: catItem.id,
      category: catItem.category,
      name: catItem.name,
      description: catItem.description,
      unitType: catItem.unitType,
      unitRate: catItem.unitRate,
      quantity: 1,
      subtotal: catItem.unitRate,
      isIncluded: true,
      isClientSelectable: true,
      clientSelected: true,
      notes: "Added in Step 2 Modified Floor Plan from Backend Pricing Catalogue",
    };

    const nextCatalogueItems = [
      ...appliedCatalogueItems.filter((i) => i.id !== lineItem.id),
      lineItem,
    ];
    setAppliedCatalogueItems(nextCatalogueItems);

    if (pendingAnalysis) {
      // Also add to pendingAnalysis.inclusionUpgrades if not already there so it shows unified
      const alreadyInPending = (pendingAnalysis.inclusionUpgrades || []).some((u) => u.id === catItem.id);
      if (!alreadyInPending) {
        const nextAnalysis: PlanModificationAnalysis = {
          ...pendingAnalysis,
          inclusionUpgrades: [
            ...(pendingAnalysis.inclusionUpgrades || []),
            {
              id: catItem.id,
              category: catItem.category,
              name: catItem.name,
              description: catItem.description,
              baseline: "Standard Inclusion",
              detected: "Selected from Backend Pricing Catalogue",
              unitPrice: catItem.unitRate,
              quantity: 1,
              subtotal: catItem.unitRate,
              confidence: 1,
              accepted: true,
            },
          ],
        };
        handleApplyModifiedPlan(nextAnalysis, { keepModalOpen: false, silent: true });
        toast.success(`Added ${catItem.name} (+${formatAud(catItem.unitRate)}) to Modified Plan`);
        return;
      }
    }

    if (onAddInclusionLineItems) {
      onAddInclusionLineItems(nextCatalogueItems);
    }
    toast.success(`Added ${catItem.name} (+${formatAud(catItem.unitRate)}) to Modified Plan`);
  };

  const handleRemoveCatalogueItem = (itemId: string) => {
    const nextCatalogueItems = appliedCatalogueItems.filter(
      (i) => i.id !== itemId && i.catalogueItemId !== itemId
    );
    setAppliedCatalogueItems(nextCatalogueItems);

    if (pendingAnalysis) {
      const nextAnalysis: PlanModificationAnalysis = {
        ...pendingAnalysis,
        inclusionUpgrades: (pendingAnalysis.inclusionUpgrades || []).map((u) =>
          u.id === itemId || `mod_${u.id}` === itemId ? { ...u, accepted: false } : u
        ),
      };
      handleApplyModifiedPlan(nextAnalysis, { keepModalOpen: false, silent: true });
      return;
    }

    if (onAddInclusionLineItems) {
      onAddInclusionLineItems(nextCatalogueItems);
    }
  };

  const isFloorPlanStepComplete = useMemo(() => {
    if (designMode === "standard") {
      return Boolean(design.designName && design.designName.trim().length > 0);
    }
    if (designMode === "modified") {
      return Boolean(
        modifiedSubStep === "areas" &&
        design.designName &&
        design.designName.trim().length > 0
      );
    }
    // custom
    return Boolean(
      design.designName &&
      design.designName.trim().length > 0 &&
      (design.basePrice || 0) > 0
    );
  }, [designMode, modifiedSubStep, design.designName, design.basePrice]);

  const hasFloorPlanSelected = isFloorPlanStepComplete;
  const hasInclusionSelected = Boolean(selectedTierCode);

  return (
    <div className="space-y-8 max-w-7xl 2xl:max-w-[1550px] mx-auto px-2 sm:px-4">
      {/* Header Prompt */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/50 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-xs">
              2
            </span>
            <span className="text-sm uppercase tracking-wider font-extrabold text-emerald-500">Step 2 of 5</span>
          </div>
          <h2 className={`text-3xl sm:text-4xl font-extrabold tracking-tight mt-1.5 ${isLight ? "text-slate-900" : "text-white"}`}>
            Floor Plan, Inclusions &amp; Façade
          </h2>
        </div>

        {/* Selected Plan Snapshot Badge */}
        {hasFloorPlanSelected && (
          <div
            className={`py-2.5 px-4 rounded-xl border flex items-center gap-3 self-start sm:self-center shadow-xs ${
              isLight ? "bg-emerald-50 border-emerald-300" : "bg-emerald-500/10 border-emerald-500/30"
            }`}
          >
            <Home className="h-5 w-5 text-emerald-500 flex-none" />
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${isLight ? "text-emerald-950" : "text-white"}`}>
                  {design.designName}
                </span>
                <span className="text-xs text-slate-400 font-mono">({design.designM2} m²)</span>
              </div>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono font-bold block">
                Base: {formatAud(design.basePrice || 0)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Mode Switcher Tabs: Standard Catalogue vs Modified vs Custom */}
      <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-700/40 pb-4">
        <button
          type="button"
          onClick={() => {
            setDesignMode("standard");
            onChange({ mode: "standard", isModifiedFloorplan: false });
          }}
          className={`px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold transition-all border cursor-pointer ${
            designMode === "standard"
              ? isLight
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm"
              : isLight
              ? "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
              : "bg-slate-900/60 text-slate-300 border-slate-800 hover:text-white"
          }`}
        >
          📐 Standard Catalogue Floor Plan
        </button>

        <button
          type="button"
          onClick={() => {
            setDesignMode("modified");
            onChange({ isModifiedFloorplan: true });
            if (!design.designName || (!design.modifiedPlanFileName && !design.modifiedAreas)) {
              setModifiedSubStep("upload");
            }
          }}
          className={`px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold transition-all border flex items-center gap-2 cursor-pointer ${
            designMode === "modified"
              ? isLight
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm"
              : isLight
              ? "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
              : "bg-slate-900/60 text-slate-300 border-slate-800 hover:text-white"
          }`}
        >
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span>Modified Floor Plan</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setDesignMode("custom");
            onChange({ mode: "custom_floorplan", isModifiedFloorplan: false });
          }}
          className={`px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold transition-all border cursor-pointer ${
            designMode === "custom"
              ? isLight
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm"
              : isLight
              ? "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
              : "bg-slate-900/60 text-slate-300 border-slate-800 hover:text-white"
          }`}
        >
          🏛️ Custom Bespoke Design
        </button>
      </div>

      {/* BOX 1 & BOX 2: HOUSE TYPE & SEARCHABLE FLOORPLAN DROPDOWN */}
      <div
        className={`p-6 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all ${
          isLight
            ? "bg-white border-slate-200 shadow-sm"
            : "bg-slate-900/60 border-slate-800/80 backdrop-blur-md"
        }`}
      >
        {/* House Type selector */}
        <div className="space-y-3 mb-6">
          <Label className={`text-sm font-bold uppercase tracking-wider block ${isLight ? "text-slate-700" : "text-slate-200"}`}>
            1. Select House Type
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {(["Single Storey", "Double Storey", "Dual Living", "Split Level", "Granny Flat"] as HousingTypeTab[]).map(
              (type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleSelectHouseType(type)}
                  className={`py-3 px-4 rounded-xl text-sm font-bold transition-all border text-center cursor-pointer ${
                    houseType === type
                      ? isLight
                        ? "bg-emerald-50 border-emerald-500 text-emerald-950 shadow-xs ring-2 ring-emerald-500/20"
                        : "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-sm ring-1 ring-emerald-400/30"
                      : isLight
                      ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      : "bg-slate-950/60 border-slate-800 text-slate-300 hover:text-white"
                  }`}
                >
                  {type}
                </button>
              )
            )}
          </div>
        </div>

        {/* Floorplan Searchable Dropdown Combobox */}
        {designMode === "standard" && (
          <div className="space-y-3 relative" ref={dropdownRef}>
            <Label className={`text-sm font-bold uppercase tracking-wider block ${isLight ? "text-slate-700" : "text-slate-200"}`}>
              2. Select Floor Plan (Search by Typing)
            </Label>
            <div className="relative">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 pointer-events-none" />
              <Input
                placeholder={
                  houseType === "Granny Flat"
                    ? "Type to search Aqua Granny Flats (e.g. Aqua 1, Aqua 2)..."
                    : `Type to search ${houseType} floor plans (e.g. Jasper 26, Topaz, Sapphire)...`
                }
                value={searchQuery}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                className={`pl-12 pr-12 text-base h-12 rounded-xl ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-emerald-600"
                    : "bg-slate-950/80 border-slate-800 text-white focus:border-emerald-500"
                }`}
              />
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="absolute right-4 top-3.5 p-0.5 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>

            {/* Dropdown Results Menu */}
            {isDropdownOpen && (
              <div
                className={`absolute left-0 right-0 top-full mt-2 z-50 max-h-80 overflow-y-auto rounded-2xl border shadow-2xl backdrop-blur-xl ${
                  isLight
                    ? "bg-white/98 border-slate-300 text-slate-900 divide-y divide-slate-100"
                    : "bg-slate-950/98 border-slate-800 text-white divide-y divide-slate-800/80"
                }`}
              >
                {filteredModels.length === 0 ? (
                  <div className="p-5 text-center text-sm text-slate-400">
                    No matching floor plans found for "{searchQuery}" in {houseType}.
                  </div>
                ) : (
                  filteredModels.map(({ row, type }) => {
                    const isSelected = design.designName?.toLowerCase() === row.name.toLowerCase();
                    const tierPrice = getTierPrice(row, design.specTier || "H2", type, division);
                    const planInfo = plansForDesign(row.name)[0];

                    return (
                      <div
                        key={row.name}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleSelectModel(row, type)}
                        className={`p-4 cursor-pointer transition-all flex items-center justify-between gap-4 ${
                          isSelected
                            ? isLight
                              ? "bg-emerald-50/90 text-emerald-950 font-bold"
                              : "bg-emerald-500/20 text-emerald-300 font-bold"
                            : isLight
                            ? "hover:bg-slate-100"
                            : "hover:bg-slate-900"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-base font-extrabold truncate">{row.name}</span>
                            <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-500/10 text-slate-400 font-mono font-semibold">
                              {row.m2} m²
                            </span>
                            {isFhbIpEligibleDesign(row.name, division) && (
                              <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30">
                                FHB / IP Turnkey
                              </span>
                            )}
                            {isSelected && (
                              <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-none" />
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                            <span className="flex items-center gap-1.5">
                              <Bed className="h-3.5 w-3.5" /> {planInfo?.beds ?? (type === "Granny Flat" ? 2 : (row.m2 > 240 ? 4 : 3))} Beds
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Bath className="h-3.5 w-3.5" /> {planInfo?.baths ?? (row.m2 > 180 ? 2 : 1)} Baths
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Car className="h-3.5 w-3.5" /> {planInfo?.cars ?? (type === "Granny Flat" ? 0 : (row.m2 > 180 ? 2 : 1))} Cars
                            </span>
                          </div>
                        </div>

                        <div className="text-right flex-none">
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">
                            Base Price
                          </span>
                          <span className={`text-base font-mono font-extrabold ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
                            {formatAud(tierPrice)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* MODIFIED FLOOR PLAN OPTIONS (PROGRESSIVE 3-STEP FLOW) */}
        {designMode === "modified" && (
          <div className="space-y-6 pt-2">
            {/* Progressive Sub-Step Progress Indicator */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-700/40 pb-3">
              <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto py-1">
                <button
                  type="button"
                  onClick={() => setModifiedSubStep("upload")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    modifiedSubStep === "upload"
                      ? "bg-amber-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-slate-950/30 flex items-center justify-center text-[10px]">1</span>
                  <span>Upload Drawing</span>
                </button>

                <ChevronDown className="w-3.5 h-3.5 text-slate-600 -rotate-90 flex-none" />

                <button
                  type="button"
                  onClick={() => setModifiedSubStep("confirm_base")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    modifiedSubStep === "confirm_base"
                      ? "bg-amber-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/40"
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-slate-950/30 flex items-center justify-center text-[10px]">2</span>
                  <span>Confirm Base Design</span>
                </button>

                <ChevronDown className="w-3.5 h-3.5 text-slate-600 -rotate-90 flex-none" />

                <button
                  type="button"
                  disabled={!design.designName}
                  onClick={() => design.designName && setModifiedSubStep("areas")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    modifiedSubStep === "areas"
                      ? "bg-amber-500 text-slate-950 shadow-sm"
                      : design.designName
                      ? "text-slate-400 hover:text-white hover:bg-slate-800/40 cursor-pointer"
                      : "text-slate-600 opacity-50 cursor-not-allowed"
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-slate-950/30 flex items-center justify-center text-[10px]">3</span>
                  <span>Area Schedule &amp; Pricing</span>
                </button>
              </div>

              {design.designName && (
                <Badge variant="outline" className="hidden sm:inline-flex font-mono text-xs font-bold py-1 px-2.5">
                  Base: {design.designName}
                </Badge>
              )}
            </div>

            {/* SUB-STEP 1: UPLOADING MODIFIED FLOORPLAN (NOTHING ELSE VISIBLE) */}
            {modifiedSubStep === "upload" && (
              <div className="space-y-5 animate-in fade-in duration-300">
                <div
                  className={`p-6 sm:p-10 rounded-2xl sm:rounded-3xl border text-center transition-all ${
                    isLight
                      ? "bg-gradient-to-br from-amber-50/70 via-white to-amber-50/40 border-amber-300/80 shadow-md"
                      : "bg-gradient-to-br from-amber-950/20 via-slate-900/60 to-slate-900/80 border-amber-500/30"
                  }`}
                >
                  <div className="max-w-xl mx-auto space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center">
                      <Upload className="h-8 w-8 stroke-[2.5]" />
                    </div>

                    <div>
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs font-bold text-amber-500 border-amber-500/30">
                          Step 1 of 3
                        </Badge>
                        <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
                          Modified Plan
                        </span>
                      </div>
                      <h3 className={`text-xl sm:text-2xl font-black ${isLight ? "text-slate-900" : "text-white"}`}>
                        Upload Modified Architectural Plan
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-400 mt-1">
                        Upload your architectural drawing (PDF, JPG, or PNG) to detect the Hudson base design and scan the schedule of areas.
                      </p>
                    </div>

                    {/* Drag-and-drop / Click Area */}
                    <div
                      onClick={() => !isScanning && fileInputRef.current?.click()}
                      className={`p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                        isLight
                          ? "border-amber-300 hover:border-amber-500 bg-white/80 hover:bg-amber-50/50"
                          : "border-amber-500/40 hover:border-amber-400 bg-slate-950/40 hover:bg-amber-950/20"
                      }`}
                    >
                      <FileText className="h-10 w-10 text-amber-500" />
                      <div className="space-y-1">
                        <span className={`text-sm sm:text-base font-extrabold block ${isLight ? "text-slate-900" : "text-white"}`}>
                          {isScanning ? (scanStatus || "Scanning Plan…") : "Click or drag drawing file here"}
                        </span>
                        <span className="text-xs text-slate-400 block font-mono">
                          Supports PDF architectural sheets, PNG, JPG renders
                        </span>
                      </div>

                      <Button
                        type="button"
                        disabled={isScanning}
                        className="mt-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm h-11 px-6 rounded-xl shadow-md cursor-pointer gap-2"
                      >
                        <Upload className="h-4 w-4 stroke-[2.5]" />
                        {isScanning ? (scanStatus || "Scanning…") : "Browse Architectural Plan"}
                      </Button>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    {/* Manual Bypass Link */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setModifiedSubStep("confirm_base");
                          setDetectedCandidate(null);
                        }}
                        className="text-xs text-slate-400 hover:text-amber-500 font-semibold underline underline-offset-4 transition-colors cursor-pointer"
                      >
                        Skip upload &amp; select base Hudson design manually →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-STEP 2: CONFIRMATION OF BASE DESIGN */}
            {modifiedSubStep === "confirm_base" && (
              <div className="space-y-5 animate-in fade-in duration-300">
                {/* Uploaded Drawing Snippet */}
                {modifiedPlanPreviewUrl && (
                  <div
                    className={`p-3 sm:p-4 rounded-2xl border flex items-center justify-between gap-3 ${
                      isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 flex-none flex items-center justify-center">
                        {modifiedPlanPreviewUrl.startsWith("data:image") || modifiedPlanPreviewUrl.includes(".jpg") || modifiedPlanPreviewUrl.includes(".png") ? (
                          <img
                            src={modifiedPlanPreviewUrl}
                            alt="Uploaded modified plan"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileText className="h-6 w-6 text-amber-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500 block">
                          Uploaded Drawing
                        </span>
                        <span className={`text-xs sm:text-sm font-bold truncate block ${isLight ? "text-slate-900" : "text-white"}`}>
                          {design.modifiedPlanFileName || "Architectural Drawing Attached"}
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setModifiedSubStep("upload")}
                      className="text-xs h-8 px-2.5 text-slate-400 hover:text-white"
                    >
                      ← Replace Drawing
                    </Button>
                  </div>
                )}

                {/* Detected Base Design Card (if auto-detected from plan) */}
                {detectedCandidate && (
                  <div
                    className={`p-6 sm:p-7 rounded-2xl sm:rounded-3xl border transition-all ${
                      isLight
                        ? "bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-md"
                        : "bg-emerald-950/25 border-emerald-500/40 text-emerald-300 shadow-lg"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center flex-none mt-0.5">
                          <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge className="bg-emerald-600 text-white font-bold text-[10px] uppercase px-2 py-0.5">
                              Detected from Plan
                            </Badge>
                            <Badge variant="outline" className="font-mono text-xs font-bold py-0.5 px-2">
                              CAD Baseline: {detectedCandidate.standardTotalM2} m²
                            </Badge>
                            <Badge className="text-xs bg-emerald-500/20 text-emerald-400 font-semibold py-0.5 px-2 border border-emerald-500/30">
                              {detectedCandidate.housingType}
                            </Badge>
                          </div>
                          <h4 className={`text-xl sm:text-2xl font-black ${isLight ? "text-emerald-950" : "text-white"}`}>
                            {detectedCandidate.matchedDesignName}
                          </h4>
                          <span className="text-xs font-mono text-slate-400 mt-1 block">
                            Standard Base Price: {formatAud(detectedCandidate.basePriceH2 || detectedCandidate.effectiveBasePrice || 0)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        <Button
                          type="button"
                          onClick={() => handleConfirmDetectedBase(detectedCandidate)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm h-12 px-6 rounded-xl shadow-md cursor-pointer gap-2"
                        >
                          Confirm &amp; Proceed to Areas <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Combobox Search Selector (Always available to pick or change) */}
                <div className="space-y-3 relative" ref={modifiedDropdownRef}>
                  <div className="flex items-center justify-between">
                    <Label className={`text-sm font-bold uppercase tracking-wider block ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                      {detectedCandidate ? "Or Select a Different Base Design" : "Step 2 of 3: Select Base Hudson Design"}
                    </Label>
                    <span className="text-xs text-slate-400">
                      Search all {allModels.length} Hudson floor plans
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 pointer-events-none" />
                    <Input
                      placeholder="Type to search base design (e.g. Jasper 26, Tiffany 22, Amber, Sapphire)..."
                      value={modifiedSearchQuery}
                      onFocus={() => setIsModifiedDropdownOpen(true)}
                      onChange={(e) => {
                        setModifiedSearchQuery(e.target.value);
                        setIsModifiedDropdownOpen(true);
                      }}
                      className={`pl-12 pr-20 text-base h-12 rounded-xl ${
                        isLight
                          ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-emerald-600"
                          : "bg-slate-950/80 border-slate-800 text-white focus:border-emerald-500"
                      }`}
                    />
                    <div className="absolute right-3 top-2.5 flex items-center gap-1">
                      {modifiedSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setModifiedSearchQuery("");
                            setIsModifiedDropdownOpen(true);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-500/10 cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsModifiedDropdownOpen(!isModifiedDropdownOpen)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-500/10 cursor-pointer"
                      >
                        <ChevronDown className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Dropdown Results */}
                  {isModifiedDropdownOpen && (
                    <div
                      className={`absolute left-0 right-0 top-full mt-2 z-50 max-h-80 overflow-y-auto rounded-2xl border shadow-2xl backdrop-blur-xl ${
                        isLight
                          ? "bg-white/98 border-slate-300 text-slate-900 divide-y divide-slate-100"
                          : "bg-slate-950/98 border-slate-800 text-white divide-y divide-slate-800/80"
                      }`}
                    >
                      {filteredModifiedModels.length === 0 ? (
                        <div className="p-5 text-center text-sm text-slate-400">
                          No matching floor plans found for "{modifiedSearchQuery}".
                        </div>
                      ) : (
                        filteredModifiedModels.map(({ row, type }) => {
                          const isSelected = design.designName?.toLowerCase() === row.name.toLowerCase();
                          const tierPrice = getTierPrice(row, design.specTier || "H2 Design Collection", type);
                          const planInfo = plansForDesign(row.name)[0];

                          return (
                            <div
                              key={`${type}-${row.name}`}
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => {
                                handleSelectModifiedBaseModel(row, type);
                                setModifiedSubStep("areas");
                              }}
                              className={`p-4 cursor-pointer transition-all flex items-center justify-between gap-4 ${
                                isSelected
                                  ? isLight
                                    ? "bg-emerald-50/90 text-emerald-950 font-bold"
                                    : "bg-emerald-500/20 text-emerald-300 font-bold"
                                  : isLight
                                  ? "hover:bg-slate-100"
                                  : "hover:bg-slate-900"
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <span className="text-base font-extrabold truncate">{row.name}</span>
                                  <Badge variant="outline" className="text-[11px] font-mono font-semibold py-0.5 px-2 bg-slate-500/10">
                                    {row.m2} m²
                                  </Badge>
                                  <Badge
                                    variant="secondary"
                                    className={`text-[10px] uppercase font-bold py-0.5 px-2 ${
                                      type === "Double Storey"
                                        ? "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                                        : type === "Dual Living"
                                        ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                                        : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                    }`}
                                  >
                                    {type}
                                  </Badge>
                                  {isSelected && (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-none" />
                                  )}
                                </div>

                                <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                                  <span className="flex items-center gap-1.5">
                                    <Bed className="h-3.5 w-3.5" /> {planInfo?.beds ?? (type === "Granny Flat" ? 2 : (row.m2 > 240 ? 4 : 3))} Beds
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <Bath className="h-3.5 w-3.5" /> {planInfo?.baths ?? (row.m2 > 180 ? 2 : 1)} Baths
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <Car className="h-3.5 w-3.5" /> {planInfo?.cars ?? (type === "Granny Flat" ? 0 : (row.m2 > 180 ? 2 : 1))} Cars
                                  </span>
                                </div>
                              </div>

                              <div className="text-right flex-none">
                                <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">
                                  Base Price
                                </span>
                                <span className={`text-base font-mono font-extrabold ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
                                  {formatAud(tierPrice)}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Navigation controls for Sub-Step 2 */}
                  <div className="flex items-center justify-between pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setModifiedSubStep("upload")}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      ← Back to Upload
                    </Button>
                    {design.designName && (
                      <Button
                        type="button"
                        onClick={() => setModifiedSubStep("areas")}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs h-10 px-5 rounded-xl cursor-pointer gap-1.5"
                      >
                        Proceed to Areas Schedule <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SUB-STEP 3: SCHEDULE OF AREAS & PRICING */}
            {modifiedSubStep === "areas" && (
              <div className="space-y-5 animate-in fade-in duration-300">
                {/* Active Base Design Overview Banner */}
                {design.designName && (
                  <div
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isLight
                        ? "bg-slate-50 border-slate-200 text-slate-900 shadow-xs"
                        : "bg-slate-950/60 border-slate-800 text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-500 flex-none">
                        <Home className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-extrabold">{design.designName}</span>
                          <Badge variant="outline" className="font-mono text-xs font-bold py-0.5 px-2">
                            CAD Baseline: {standardBaselineAreas.totalM2 || design.standardDesignM2 || design.designM2} m²
                          </Badge>
                          <Badge className="text-xs bg-emerald-600 text-white font-semibold py-0.5 px-2">
                            {design.housingType || houseType}
                          </Badge>
                        </div>
                        <span className="text-xs text-slate-400 font-mono mt-0.5 block">
                          Standard Base Price: {formatAud(design.standardBasePrice || design.basePrice || 0)}
                          {design.modifiedPlanFileName ? ` • Plan: ${design.modifiedPlanFileName}` : ""}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setModifiedSubStep("confirm_base")}
                        className="text-xs h-9 px-3 font-semibold rounded-xl cursor-pointer"
                      >
                        Change Base Design
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setModifiedSubStep("upload")}
                        className="text-xs h-9 px-3 font-semibold rounded-xl cursor-pointer"
                      >
                        Replace Drawing
                      </Button>
                    </div>
                  </div>
                )}

                {/* Guidance / Alert Message Banner */}
                {scanMessage && (
                  <div
                    className={`p-4 rounded-xl border flex items-start gap-3 animate-in fade-in duration-300 ${
                      scanMessage.type === "success"
                        ? isLight
                          ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : isLight
                        ? "bg-amber-50 border-amber-300 text-amber-950"
                        : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                    }`}
                  >
                    {scanMessage.type === "success" ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-none mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-amber-500 flex-none mt-0.5" />
                    )}
                    <div>
                      <span className="text-sm font-bold block">{scanMessage.text}</span>
                    </div>
                  </div>
                )}

                {/* Side-by-Side Modified Area Dimensions Grid */}
                <div className="space-y-4 pt-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <Label className={`text-sm font-bold uppercase tracking-wider block ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                        Modified Dimensions Schedule (m²)
                      </Label>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="font-mono text-xs font-bold py-1 px-2.5">
                        Baseline: {standardBaselineAreas.totalM2 > 0 ? `${standardBaselineAreas.totalM2} m²` : "Not selected"}
                      </Badge>
                      <Badge
                        className={`font-mono text-xs font-bold py-1 px-2.5 ${
                          totalVariance > 0
                            ? "bg-emerald-500 text-slate-950"
                            : totalVariance < 0
                            ? "bg-rose-500 text-white"
                            : "bg-slate-700 text-white"
                        }`}
                      >
                        Modified: {currentTotal > 0 ? `${currentTotal} m²` : "0.00 m²"}
                        {standardBaselineAreas.totalM2 > 0 ? ` (${totalVariance >= 0 ? `+${totalVariance}` : `${totalVariance}`} m²)` : ""}
                      </Badge>
                    </div>
                  </div>

                  {/* Dynamic Zones Grid */}
                  <div className={`grid gap-4 ${isDoubleOrSplit ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-2 lg:grid-cols-4"}`}>
                    {(isDoubleOrSplit
                      ? [
                          ...(standardBaselineAreas.lowerLivingM2 || design.areas?.lowerLivingM2 || (design.designName && /cinnamon|mauve/i.test(design.designName))
                            ? [
                                {
                                  key: "lowerLivingM2" as const,
                                  label: "Lower Ground Living",
                                  std: standardBaselineAreas.lowerLivingM2 || 0,
                                  val: design.areas?.lowerLivingM2 ?? (design.modifiedAreas?.lowerLivingM2 ?? standardBaselineAreas.lowerLivingM2 ?? 0),
                                  rate: activeExtensionRates.gf || 1420,
                                },
                              ]
                            : []),
                          {
                            key: "groundLivingM2" as const,
                            label: "Ground Floor Living",
                            std: standardBaselineAreas.groundLivingM2 || 0,
                            val: design.areas?.groundLivingM2 ?? (design.modifiedAreas?.groundLivingM2 ?? standardBaselineAreas.groundLivingM2 ?? 0),
                            rate: activeExtensionRates.gf || 1420,
                          },
                          {
                            key: "firstLivingM2" as const,
                            label: "First Floor Living",
                            std: standardBaselineAreas.firstLivingM2 || 0,
                            val: design.areas?.firstLivingM2 ?? (design.modifiedAreas?.firstLivingM2 ?? standardBaselineAreas.firstLivingM2 ?? 0),
                            rate: activeExtensionRates.ff || 1580,
                          },
                          {
                            key: "garageM2" as const,
                            label: "Garage Area",
                            std: standardBaselineAreas.garageM2 || 0,
                            val: design.areas?.garageM2 ?? (design.modifiedAreas?.garageM2 ?? standardBaselineAreas.garageM2 ?? 0),
                            rate: activeExtensionRates.garage || 950,
                          },
                          {
                            key: "alfrescoM2" as const,
                            label: "Alfresco Area",
                            std: standardBaselineAreas.alfrescoM2 || 0,
                            val: design.areas?.alfrescoM2 ?? (design.modifiedAreas?.alfrescoM2 ?? standardBaselineAreas.alfrescoM2 ?? 0),
                            rate: activeExtensionRates.alfresco || 780,
                          },
                          {
                            key: "porchM2" as const,
                            label: "Porch Area",
                            std: standardBaselineAreas.porchM2 || 0,
                            val: design.areas?.porchM2 ?? (design.modifiedAreas?.porchM2 ?? standardBaselineAreas.porchM2 ?? 0),
                            rate: activeExtensionRates.porch || 780,
                          },
                          ...(isBalconyVisible
                            ? [
                                {
                                  key: "balconyM2" as const,
                                  label: "Balcony Area",
                                  std: standardBaselineAreas.balconyM2 || 0,
                                  val: design.areas?.balconyM2 ?? (design.modifiedAreas?.balconyM2 ?? standardBaselineAreas.balconyM2 ?? 0),
                                  rate: activeExtensionRates.balcony || 2050,
                                  isRemovable: !standardBaselineAreas.balconyM2 || standardBaselineAreas.balconyM2 === 0,
                                },
                              ]
                            : []),
                        ]
                      : [
                          {
                            key: "livingM2" as const,
                            label: "Living Area",
                            std: standardBaselineAreas.livingM2 || 0,
                            val: design.areas?.livingM2 ?? (design.modifiedAreas?.livingM2 ?? standardBaselineAreas.livingM2 ?? 0),
                            rate: activeExtensionRates.gf || 1420,
                          },
                          {
                            key: "garageM2" as const,
                            label: "Garage Area",
                            std: standardBaselineAreas.garageM2 || 0,
                            val: design.areas?.garageM2 ?? (design.modifiedAreas?.garageM2 ?? standardBaselineAreas.garageM2 ?? 0),
                            rate: activeExtensionRates.garage || 950,
                          },
                          {
                            key: "alfrescoM2" as const,
                            label: "Alfresco Area",
                            std: standardBaselineAreas.alfrescoM2 || 0,
                            val: design.areas?.alfrescoM2 ?? (design.modifiedAreas?.alfrescoM2 ?? standardBaselineAreas.alfrescoM2 ?? 0),
                            rate: activeExtensionRates.alfresco || 780,
                          },
                          {
                            key: "porchM2" as const,
                            label: "Porch Area",
                            std: standardBaselineAreas.porchM2 || 0,
                            val: design.areas?.porchM2 ?? (design.modifiedAreas?.porchM2 ?? standardBaselineAreas.porchM2 ?? 0),
                            rate: activeExtensionRates.porch || 780,
                          },
                          ...(isBalconyVisible
                            ? [
                                {
                                  key: "balconyM2" as const,
                                  label: "Balcony Area",
                                  std: standardBaselineAreas.balconyM2 || 0,
                                  val: design.areas?.balconyM2 ?? (design.modifiedAreas?.balconyM2 ?? standardBaselineAreas.balconyM2 ?? 0),
                                  rate: activeExtensionRates.balcony || 2050,
                                  isRemovable: !standardBaselineAreas.balconyM2 || standardBaselineAreas.balconyM2 === 0,
                                },
                              ]
                            : []),
                        ]
                    ).map((zone) => {
                      const delta = zone.std > 0 ? Math.round((zone.val - zone.std) * 100) / 100 : (zone.val || 0);
                      let cost = 0;
                      if (zone.key === "garageM2" && zone.std >= 25) {
                        // Standard coverage up to 5.7x6.0 (34.20 m²) at $0
                        if (Math.abs(zone.val - 34.2) <= 0.05) {
                          cost = 0;
                        } else if (delta > 0) {
                          if (zone.val <= 34.25) {
                            cost = 0;
                          } else {
                            const chargeableBase = Math.max(zone.std, 34.2);
                            const chargeableDelta = Math.max(0, Math.round((zone.val - chargeableBase) * 100) / 100);
                            cost = Math.round(chargeableDelta * zone.rate);
                          }
                        } else if (delta < 0) {
                          cost = Math.round(delta * zone.rate * 0.8);
                        }
                      } else {
                        cost = zone.std > 0
                          ? (delta > 0 ? Math.round(delta * zone.rate) : delta < 0 ? Math.round(delta * zone.rate * 0.8) : 0)
                          : Math.round(delta * zone.rate);
                      }
                      const hasVariance = zone.std > 0 ? Math.abs(delta) > 0.05 : zone.val > 0;

                      return (
                        <div
                          key={zone.key}
                          className={`p-4 rounded-2xl border transition-all ${
                            isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                              {zone.label}
                            </Label>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-mono text-slate-400">
                                Std: {zone.std > 0 ? `${zone.std} m²` : "—"}
                              </span>
                              {(zone as any).isRemovable && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsBalconyActive(false);
                                    handleModifiedAreaChange("balconyM2", "0");
                                    toast.info("Removed Balcony");
                                  }}
                                  className="p-1 rounded text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                                  title="Remove Balcony"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Input
                              type="number"
                              step="0.01"
                              placeholder={zone.std > 0 ? String(zone.std) : "0.00"}
                              value={zone.val > 0 ? zone.val : ""}
                              onChange={(e) => handleModifiedAreaChange(zone.key, e.target.value)}
                              className="h-12 text-lg font-mono font-bold rounded-xl"
                            />

                            {/* Steppers & Reset */}
                            <div className="flex items-center gap-1.5 pt-1">
                              <button
                                type="button"
                                onClick={() => handleStepArea(zone.key, -1)}
                                className="flex-1 py-1 px-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Decrease by 1m²"
                              >
                                -1m²
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStepArea(zone.key, 1)}
                                className="flex-1 py-1 px-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Increase by 1m²"
                              >
                                +1m²
                              </button>
                              {zone.std > 0 && hasVariance && (
                                <button
                                  type="button"
                                  onClick={() => handleResetArea(zone.key)}
                                  className="py-1 px-2 text-[11px] font-semibold rounded-lg border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors cursor-pointer"
                                  title="Reset to CAD standard"
                                >
                                  Reset
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Variance & Total Price Breakdown */}
                          <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1">
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className="text-slate-400">Variance:</span>
                              <span
                                className={`font-bold ${
                                  !hasVariance
                                    ? "text-slate-400"
                                    : delta >= 0
                                    ? "text-emerald-500"
                                    : "text-rose-400"
                                }`}
                              >
                                {zone.std > 0
                                  ? `${delta >= 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)} m²`
                                  : `${delta.toFixed(2)} m² (added)`}
                              </span>
                            </div>

                            {hasVariance && (
                              <div className="flex items-center justify-between text-[11px] font-mono">
                                <span className="text-slate-400">Total Price:</span>
                                <span className={cost > 0 ? "text-emerald-500 font-bold" : cost < 0 ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                                  {cost > 0 ? `+${formatAud(cost)}` : cost < 0 ? `${formatAud(cost)} (80% credit)` : "$0 (Std 5.7×6.0m)"}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Action Buttons to Add Balcony or Custom Area */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {!isBalconyVisible && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsBalconyActive(true);
                          handleModifiedAreaChange("balconyM2", "6.5");
                          toast.success(`Added Balcony zone (6.50 m²)`);
                        }}
                        className="rounded-xl border-dashed border-cyan-500/40 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 font-semibold cursor-pointer"
                      >
                        <Plus className="w-4 h-4 mr-1.5" />
                        + Add Balcony
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddingCustomArea(!isAddingCustomArea)}
                      className={`rounded-xl border-dashed font-semibold cursor-pointer ${
                        isAddingCustomArea
                          ? "border-amber-500/60 text-amber-400 bg-amber-500/10"
                          : "border-emerald-500/40 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                      }`}
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      {isAddingCustomArea ? "Cancel Custom Area" : "+ Add Custom Floor Area"}
                    </Button>
                  </div>

                  {/* Inline Add Custom Floor Area Form */}
                  {isAddingCustomArea && (
                    <div
                      className={`p-4 sm:p-5 rounded-2xl border space-y-4 animate-in fade-in duration-200 ${
                        isLight ? "bg-amber-50/50 border-amber-200" : "bg-amber-950/20 border-amber-500/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-400" />
                          <span className="text-sm font-bold uppercase tracking-wider text-amber-400">
                            Add Custom Floor Area / Extension
                          </span>
                        </div>
                      </div>

                      {/* Suggestion Chips */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] text-slate-400 font-semibold mr-1">Quick presets:</span>
                        {[
                          { name: "Rear Covered Deck", rate: 850, m2: 15 },
                          { name: "Covered Terrace", rate: 850, m2: 12 },
                          { name: "Workshop Extension", rate: 950, m2: 18 },
                          { name: "Alfresco Extension", rate: 780, m2: 10 },
                          { name: "Pergola / Patio", rate: 650, m2: 14 },
                          { name: "Gym / Studio", rate: 1200, m2: 20 },
                        ].map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => {
                              setNewCustomAreaName(preset.name);
                              setNewCustomAreaM2(preset.m2.toString());
                              setNewCustomAreaRate(preset.rate.toString());
                            }}
                            className="px-2.5 py-1 text-xs rounded-lg border border-slate-700 bg-slate-900/60 hover:border-amber-500/50 hover:text-amber-300 text-slate-300 transition-colors cursor-pointer"
                          >
                            {preset.name} ({preset.m2}m² @ ${preset.rate}/m²)
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs text-slate-400 font-semibold mb-1 block">
                            Area / Room Name
                          </Label>
                          <Input
                            placeholder="e.g. Rear Covered Deck, Workshop..."
                            value={newCustomAreaName}
                            onChange={(e) => setNewCustomAreaName(e.target.value)}
                            className="h-10 text-sm rounded-xl"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-400 font-semibold mb-1 block">
                            Size (m²)
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="e.g. 15.00"
                            value={newCustomAreaM2}
                            onChange={(e) => setNewCustomAreaM2(e.target.value)}
                            className="h-10 text-sm font-mono font-bold rounded-xl"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-400 font-semibold mb-1 block">
                            Rate ($/m²)
                          </Label>
                          <Input
                            type="number"
                            step="10"
                            placeholder="850"
                            value={newCustomAreaRate}
                            onChange={(e) => setNewCustomAreaRate(e.target.value)}
                            className="h-10 text-sm font-mono font-bold rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-amber-500/20">
                        <div className="text-xs text-slate-400 font-mono">
                          {Number(newCustomAreaM2) > 0 && Number(newCustomAreaRate) > 0 ? (
                            <span>
                              Addition:{" "}
                              <strong className="text-emerald-400">
                                +{formatAud(Math.round(Number(newCustomAreaM2) * Number(newCustomAreaRate)))}
                              </strong>{" "}
                              ({Number(newCustomAreaM2)} m² @ ${Number(newCustomAreaRate)}/m²)
                            </span>
                          ) : (
                            "Specify name and size to add to modified plan"
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsAddingCustomArea(false)}
                            className="rounded-xl text-xs text-slate-400 hover:text-white"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={!newCustomAreaName.trim() || Number(newCustomAreaM2) <= 0}
                            onClick={() => {
                              handleAddCustomArea(
                                newCustomAreaName,
                                Number(newCustomAreaM2),
                                Number(newCustomAreaRate) || 850
                              );
                            }}
                            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add Zone to Plan
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Custom Floor Areas List */}
                  {customAreas.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-cyan-400" />
                          Custom &amp; Additional Floor Areas ({customAreas.length})
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          Subtotal:{" "}
                          <strong className="text-emerald-400">
                            +{formatAud(
                              customAreas.reduce(
                                (sum, ca) => sum + Math.round((Number(ca.m2) || 0) * (Number(ca.ratePerM2) || 850)),
                                0
                              )
                            )}
                          </strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {customAreas.map((ca) => {
                          const m2Val = Number(ca.m2) || 0;
                          const rateVal = Number(ca.ratePerM2) || 850;
                          const addition = Math.round(m2Val * rateVal);

                          return (
                            <div
                              key={ca.id}
                              className={`p-4 rounded-2xl border transition-all ${
                                isLight
                                  ? "bg-slate-50 border-cyan-200"
                                  : "bg-slate-950/60 border-cyan-500/30"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 truncate max-w-[170px]" title={ca.name}>
                                  {ca.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCustomArea(ca.id)}
                                  className="p-1 rounded text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                                  title="Delete custom area"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="space-y-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={m2Val > 0 ? m2Val : ""}
                                  onChange={(e) => handleUpdateCustomArea(ca.id, parseFloat(e.target.value) || 0)}
                                  className="h-12 text-lg font-mono font-bold rounded-xl"
                                />

                                {/* Steppers */}
                                <div className="flex items-center gap-1.5 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateCustomArea(ca.id, Math.max(0, m2Val - 1))}
                                    className="flex-1 py-1 px-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                  >
                                    -1m²
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateCustomArea(ca.id, m2Val + 1)}
                                    className="flex-1 py-1 px-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                  >
                                    +1m²
                                  </button>
                                </div>
                              </div>

                              <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                                  <span>Area:</span>
                                  <span>{m2Val.toFixed(2)} m²</span>
                                </div>
                                <div className="flex items-center justify-between text-[11px] font-mono">
                                  <span className="text-slate-400">Total Price:</span>
                                  <span className="text-emerald-500 font-bold">
                                    +{formatAud(addition)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Detected Plan Modifications & Backend Pricing Catalogue (Benchtops, Vanities, Sinks, Showers, Internal Rooms & Openings) */}
                  <div
                    data-testid="modified-plan-catalogue-scanner-panel"
                    className={`p-5 sm:p-6 rounded-2xl border space-y-5 ${
                      isLight
                        ? "bg-slate-50/90 border-slate-200 text-slate-900"
                        : "bg-slate-950/70 border-slate-800 text-white"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          <h4 className="text-sm sm:text-base font-extrabold tracking-tight">
                            Detected Plan Modifications &amp; Backend Catalogue Pricing
                          </h4>
                          <Badge className="bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[10px] font-bold uppercase">
                            {isAnalyzingDeepPlan
                              ? "Scanning against Standard CAD…"
                              : pendingAnalysis
                              ? "CAD Comparison Active"
                              : "Backend Pricing Catalogue"}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Automatically detects &amp; prices benchtops, vanities, sinks, showers, internal rooms, structural extensions, and window/door replacements (with 80% trade credit) against the standard {design.designName || "Hudson"} plan.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {uploadedModifiedFile && design.designName && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isAnalyzingDeepPlan}
                            onClick={() =>
                              void runDeepPlanModificationScan(
                                uploadedModifiedFile,
                                design.designName,
                                design.housingType || houseType,
                                { openModal: true }
                              )
                            }
                            className="h-9 px-3 text-xs font-bold rounded-xl gap-1.5 cursor-pointer"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingDeepPlan ? "animate-spin" : ""}`} />
                            {isAnalyzingDeepPlan ? "Scanning Plan…" : "Deep Re-Scan Plan"}
                          </Button>
                        )}
                        {pendingAnalysis && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setIsReviewModalOpen(true)}
                            className="h-9 px-3.5 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 gap-1.5 cursor-pointer"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            Review Full CAD Diff &amp; Overlay
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Detected Items from PlanModificationAnalysis */}
                    {pendingAnalysis &&
                      ((pendingAnalysis.areaDeltas?.length || 0) > 0 ||
                        (pendingAnalysis.inclusionUpgrades?.length || 0) > 0 ||
                        (pendingAnalysis.internalRoomChanges?.length || 0) > 0 ||
                        (pendingAnalysis.openingReplacements?.length || 0) > 0) && (
                        <div className="space-y-3" data-testid="detected-modifications-list">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                              Detected Changes on Uploaded Modified Plan (
                              {(pendingAnalysis.areaDeltas?.length || 0) +
                                (pendingAnalysis.inclusionUpgrades?.length || 0) +
                                (pendingAnalysis.internalRoomChanges?.length || 0) +
                                (pendingAnalysis.openingReplacements?.length || 0)}
                              )
                            </span>
                            <span className="text-xs font-mono text-slate-400">
                              Detected Extensions &amp; Variations Subtotal:{" "}
                              <strong className="text-emerald-500">
                                +
                                {formatAud(
                                  (pendingAnalysis.areaDeltas || [])
                                    .filter((d) => d.accepted)
                                    .reduce((s, d) => s + (d.subtotal || 0), 0) +
                                    (pendingAnalysis.inclusionUpgrades || [])
                                      .filter((u) => u.accepted)
                                      .reduce((s, u) => s + (u.subtotal || 0), 0) +
                                    (pendingAnalysis.internalRoomChanges || [])
                                      .filter((r) => r.accepted && !r.isZeroCost)
                                      .reduce((s, r) => s + (r.subtotal || 0), 0) +
                                    (pendingAnalysis.openingReplacements || [])
                                      .filter((o) => o.accepted)
                                      .reduce((s, o) => s + (o.netCost || 0), 0)
                                )}
                              </strong>
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {(pendingAnalysis.areaDeltas || []).map((d, idx) => (
                              <div
                                key={`area-${d.zoneKey}-${idx}`}
                                onClick={() => {
                                  const next: PlanModificationAnalysis = {
                                    ...pendingAnalysis,
                                    areaDeltas: pendingAnalysis.areaDeltas.map((item, i) =>
                                      i === idx ? { ...item, accepted: !item.accepted } : item
                                    ),
                                  };
                                  handleApplyModifiedPlan(next, { keepModalOpen: false, silent: true });
                                }}
                                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                                  d.accepted
                                    ? isLight
                                      ? "bg-emerald-50/70 border-emerald-300"
                                      : "bg-emerald-950/25 border-emerald-500/40"
                                    : isLight
                                    ? "bg-white border-slate-200 opacity-60"
                                    : "bg-slate-900/40 border-slate-800 opacity-60"
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <CheckCircle2
                                      className={`w-4 h-4 flex-none ${
                                        d.accepted ? "text-emerald-500" : "text-slate-400"
                                      }`}
                                    />
                                    <span className="text-xs sm:text-sm font-bold">
                                      {d.zoneLabel} ({d.deltaM2 > 0 ? `+${d.deltaM2}` : d.deltaM2} m²)
                                    </span>
                                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                                      STRUCTURAL AREA
                                    </Badge>
                                  </div>
                                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                                    {d.reason || `Standard ${d.standardM2} m² → Modified ${d.modifiedM2} m² (@ ${formatAud(d.unitRate)}/m²)`}
                                  </p>
                                </div>
                                <div className="text-right flex-none font-mono text-xs font-extrabold text-emerald-500">
                                  {d.subtotal >= 0 ? `+${formatAud(d.subtotal)}` : formatAud(d.subtotal)}
                                </div>
                              </div>
                            ))}

                            {(pendingAnalysis.inclusionUpgrades || []).map((u, idx) => (
                              <div
                                key={`upg-${u.id}-${idx}`}
                                onClick={() => {
                                  const next: PlanModificationAnalysis = {
                                    ...pendingAnalysis,
                                    inclusionUpgrades: pendingAnalysis.inclusionUpgrades.map((item, i) =>
                                      i === idx ? { ...item, accepted: !item.accepted } : item
                                    ),
                                  };
                                  handleApplyModifiedPlan(next, { keepModalOpen: false, silent: true });
                                }}
                                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                                  u.accepted
                                    ? isLight
                                      ? "bg-emerald-50/70 border-emerald-300"
                                      : "bg-emerald-950/25 border-emerald-500/40"
                                    : isLight
                                    ? "bg-white border-slate-200 opacity-60"
                                    : "bg-slate-900/40 border-slate-800 opacity-60"
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <CheckCircle2
                                      className={`w-4 h-4 flex-none ${
                                        u.accepted ? "text-emerald-500" : "text-slate-400"
                                      }`}
                                    />
                                    <span className="text-xs sm:text-sm font-bold">{u.name}</span>
                                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                                      {u.category.replace("internal_", "")}
                                    </Badge>
                                  </div>
                                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                                    {u.detected || u.description}
                                  </p>
                                </div>
                                <div className="text-right flex-none">
                                  <span className="text-xs sm:text-sm font-mono font-extrabold text-emerald-500">
                                    +{formatAud(u.subtotal)}
                                  </span>
                                </div>
                              </div>
                            ))}

                            {(pendingAnalysis.internalRoomChanges || []).map((r, idx) => (
                              <div
                                key={`room-${r.id}-${idx}`}
                                onClick={() => {
                                  const next: PlanModificationAnalysis = {
                                    ...pendingAnalysis,
                                    internalRoomChanges: (pendingAnalysis.internalRoomChanges || []).map((item, i) =>
                                      i === idx ? { ...item, accepted: !item.accepted } : item
                                    ),
                                  };
                                  handleApplyModifiedPlan(next, { keepModalOpen: false, silent: true });
                                }}
                                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                                  r.accepted
                                    ? isLight
                                      ? "bg-cyan-50/70 border-cyan-300"
                                      : "bg-cyan-950/25 border-cyan-500/40"
                                    : isLight
                                    ? "bg-white border-slate-200 opacity-60"
                                    : "bg-slate-900/40 border-slate-800 opacity-60"
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <CheckCircle2
                                      className={`w-4 h-4 flex-none ${
                                        r.accepted ? "text-cyan-500" : "text-slate-400"
                                      }`}
                                    />
                                      <span className="text-xs sm:text-sm font-bold">{r.roomName}</span>
                                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                                        {r.category}
                                      </Badge>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{r.description}</p>
                                  </div>
                                  <div className="text-right flex-none">
                                    <span className="text-xs sm:text-sm font-mono font-extrabold text-cyan-500">
                                      {r.isZeroCost || r.subtotal === 0 ? "$0 (Included)" : `+${formatAud(r.subtotal)}`}
                                    </span>
                                  </div>
                                </div>
                              ))}

                              {(pendingAnalysis.openingReplacements || []).map((o, idx) => (
                                <div
                                  key={`open-${o.id}-${idx}`}
                                  onClick={() => {
                                    const next: PlanModificationAnalysis = {
                                      ...pendingAnalysis,
                                      openingReplacements: (pendingAnalysis.openingReplacements || []).map((item, i) =>
                                        i === idx ? { ...item, accepted: !item.accepted } : item
                                      ),
                                    };
                                    handleApplyModifiedPlan(next, { keepModalOpen: false, silent: true });
                                  }}
                                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                                    o.accepted
                                      ? isLight
                                        ? "bg-amber-50/70 border-amber-300"
                                        : "bg-amber-950/25 border-amber-500/40"
                                      : isLight
                                      ? "bg-white border-slate-200 opacity-60"
                                      : "bg-slate-900/40 border-slate-800 opacity-60"
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <CheckCircle2
                                        className={`w-4 h-4 flex-none ${
                                          o.accepted ? "text-amber-500" : "text-slate-400"
                                        }`}
                                      />
                                      <span className="text-xs sm:text-sm font-bold">{o.newItemName}</span>
                                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                                        80% Credit
                                      </Badge>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{o.description}</p>
                                  </div>
                                  <div className="text-right flex-none">
                                    <span className="text-xs sm:text-sm font-mono font-extrabold text-amber-500">
                                      +{formatAud(o.netCost)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* Backend Pricing Catalogue Quick-Add Browser (Benchtops, Vanities, Sinks, Showers, Internal Elements, Doors & Structural) */}
                      <div className="space-y-3 pt-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            + Add Variation from Backend Pricing Catalogue (Benchtops, Vanities, Sinks, Showers, Rooms &amp; Doors)
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {[
                              { id: "all", label: "Featured" },
                              { id: "internal_kitchen", label: "Kitchen & Benchtops" },
                              { id: "internal_bathroom", label: "Vanities & Wet Areas" },
                              { id: "internal_laundry", label: "Laundry & Joinery" },
                              { id: "doors_windows", label: "Doors & Windows" },
                              { id: "structural", label: "Structural & Rooms" },
                            ].map((cat) => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => setSelectedCatalogueCategory(cat.id)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                  selectedCatalogueCategory === cat.id
                                    ? "bg-emerald-600 text-white"
                                    : isLight
                                    ? "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                                }`}
                              >
                                {cat.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="relative">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                          <Input
                            data-testid="step2-catalogue-search"
                            placeholder="Search backend pricing catalogue (e.g. 40mm stone, waterfall, 1500 double vanity, undermount sink, butler's pantry, stacker door)..."
                            value={catalogueSearchQuery}
                            onChange={(e) => setCatalogueSearchQuery(e.target.value)}
                            className={`pl-10 h-10 text-xs sm:text-sm rounded-xl ${
                              isLight ? "bg-white border-slate-300" : "bg-slate-900 border-slate-800"
                            }`}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                          {DEFAULT_CATALOGUE.filter((item) => {
                            if (item.unitType !== "fixed") return false;
                            if (selectedCatalogueCategory !== "all" && item.category !== selectedCatalogueCategory) {
                              return false;
                            }
                            if (catalogueSearchQuery.trim()) {
                              const q = catalogueSearchQuery.toLowerCase().trim();
                              return (
                                item.name.toLowerCase().includes(q) ||
                                item.description.toLowerCase().includes(q) ||
                                item.id.toLowerCase().includes(q)
                              );
                            }
                            // Default featured modified plan items (benchtops, vanities, sinks, showers, rooms, doors)
                            return [
                              "kit_stone_40mm_upgrade",
                              "kit_waterfall_stone_end_20mm",
                              "kit_waterfall_stone_end_40mm",
                              "kit_extend_island_bench",
                              "kit_clark_polar_undermount_sink",
                              "kit_butlers_pantry_package",
                              "kit_butlers_pantry_sink_mixer",
                              "bath_double_vanity_1500",
                              "bath_double_vanity_1800",
                              "bath_extended_single_vanity_1200",
                              "bath_vanity_stone_40mm",
                              "bath_shower_enlarge_1200x900",
                              "bath_shower_enlarge_1500x900",
                              "bath_freestanding_bath_upgrade",
                              "bath_additional_powder_room",
                              "laun_joinery_benchtop_sink",
                              "bed_study_desk_joinery",
                              "int_media_cinema_conversion",
                              "dw_barn_sliding_door",
                              "dw_stacker_door_2436",
                            ].includes(item.id) || selectedCatalogueCategory !== "all";
                          })
                            .slice(0, 18)
                            .map((catItem) => {
                              const isAdded =
                                appliedCatalogueItems.some((a) => a.catalogueItemId === catItem.id) ||
                                (pendingAnalysis?.inclusionUpgrades || []).some(
                                  (u) => u.id === catItem.id && u.accepted
                                );

                              return (
                                <div
                                  key={catItem.id}
                                  data-testid={`catalogue-card-${catItem.id}`}
                                  className={`p-3 rounded-xl border flex flex-col justify-between gap-2 transition-all ${
                                    isAdded
                                      ? isLight
                                        ? "bg-emerald-50 border-emerald-300"
                                        : "bg-emerald-950/30 border-emerald-500/40"
                                      : isLight
                                      ? "bg-white border-slate-200 hover:border-slate-300"
                                      : "bg-slate-900/70 border-slate-800 hover:border-slate-700"
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-start justify-between gap-2">
                                      <span className="text-xs font-bold leading-snug">{catItem.name}</span>
                                      <span className="text-xs font-mono font-extrabold text-emerald-500 flex-none">
                                        +{formatAud(catItem.unitRate)}
                                      </span>
                                    </div>
                                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                                    {catItem.description}
                                  </p>
                                </div>
                                <div className="flex items-center justify-end pt-1">
                                  {isAdded ? (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveCatalogueItem(catItem.id)}
                                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/20 text-emerald-500 hover:bg-rose-500/20 hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1"
                                    >
                                      <Check className="w-3 h-3" /> Added (Click to Remove)
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      data-testid={`add-cat-${catItem.id}`}
                                      onClick={() => handleQuickAddCatalogueItem(catItem.id)}
                                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer flex items-center gap-1"
                                    >
                                      <Plus className="w-3 h-3" /> Add to Modified Plan
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>

                  {/* Direct Base Price Summary Bar */}
                  <div
                    className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isLight ? "bg-emerald-50/80 border-emerald-200" : "bg-emerald-950/20 border-emerald-500/20"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-500">
                          Modified Design Base
                        </span>
                        {design.designName ? (
                          <span className={`text-base font-extrabold ${isLight ? "text-slate-900" : "text-white"}`}>
                            {design.designName} ({currentTotal} m²)
                          </span>
                        ) : (
                          <span className="text-xs text-amber-500 font-semibold">
                            Select a base Hudson design above to link standard CAD baseline areas
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                      {design.designName && (
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                            Standard Base
                          </span>
                          <span className="text-sm font-mono text-slate-400">
                            {formatAud(design.standardBasePrice || design.basePrice || 0)}
                          </span>
                        </div>
                      )}

                      {design.designName && modPricingCalc?.totalCostAdjustment !== undefined && modPricingCalc.totalCostAdjustment !== 0 && (
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                            Area Tender Delta
                          </span>
                          <span className={`text-sm font-mono font-bold ${modPricingCalc.totalCostAdjustment >= 0 ? "text-emerald-500" : "text-rose-400"}`}>
                            {modPricingCalc.totalCostAdjustment >= 0 ? `+${formatAud(modPricingCalc.totalCostAdjustment)}` : formatAud(modPricingCalc.totalCostAdjustment)}
                          </span>
                        </div>
                      )}

                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                          Total Modified Base
                        </span>
                        <span className={`text-xl sm:text-2xl font-mono font-black ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
                          {formatAud(design.basePrice || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CUSTOM FLOOR PLAN OPTIONS */}
        {designMode === "custom" && (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                Custom Design Name
              </Label>
              <Input
                placeholder="e.g. Custom Architectural Residence"
                value={design.designName || ""}
                onChange={(e) => {
                  const name = e.target.value;
                  onChange({
                    mode: "custom_floorplan",
                    designName: name,
                    modelName: name,
                  });
                }}
                className={`text-base h-12 rounded-xl ${
                  isLight ? "bg-slate-50 border-slate-300" : "bg-slate-950/80 border-slate-800"
                }`}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-400">Ground Living (m²)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={design.customSpec?.groundLivingM2 || 140}
                  onChange={(e) => {
                    const gM2 = parseFloat(e.target.value) || 0;
                    const spec = { ...(design.customSpec || { storeys: "single", firstLivingM2: 0, garageM2: 36, alfrescoM2: 15, porchM2: 4, balconyM2: 0, groundRateM2: 0, upperRateM2: 0, ancillaryRateM2: 0, scaffoldingAllowance: 0 }), groundLivingM2: gM2 };
                    const totalM2 = calculateCustomTotalM2(spec);
                    const basePrice = calculateCustomFloorplanPrice(spec, design.specTier);
                    onChange({
                      customSpec: spec,
                      designM2: totalM2,
                      basePrice,
                    });
                  }}
                  className="h-12 text-base font-mono font-bold rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-400">Garage (m²)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={design.customSpec?.garageM2 || 36}
                  onChange={(e) => {
                    const garM2 = parseFloat(e.target.value) || 0;
                    const spec = { ...(design.customSpec || { storeys: "single", groundLivingM2: 140, firstLivingM2: 0, alfrescoM2: 15, porchM2: 4, balconyM2: 0, groundRateM2: 0, upperRateM2: 0, ancillaryRateM2: 0, scaffoldingAllowance: 0 }), garageM2: garM2 };
                    const totalM2 = calculateCustomTotalM2(spec);
                    const basePrice = calculateCustomFloorplanPrice(spec, design.specTier);
                    onChange({
                      customSpec: spec,
                      designM2: totalM2,
                      basePrice,
                    });
                  }}
                  className="h-12 text-base font-mono font-bold rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-400">Alfresco (m²)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={design.customSpec?.alfrescoM2 || 15}
                  onChange={(e) => {
                    const alfM2 = parseFloat(e.target.value) || 0;
                    const spec = { ...(design.customSpec || { storeys: "single", groundLivingM2: 140, firstLivingM2: 0, garageM2: 36, porchM2: 4, balconyM2: 0, groundRateM2: 0, upperRateM2: 0, ancillaryRateM2: 0, scaffoldingAllowance: 0 }), alfrescoM2: alfM2 };
                    const totalM2 = calculateCustomTotalM2(spec);
                    const basePrice = calculateCustomFloorplanPrice(spec, design.specTier);
                    onChange({
                      customSpec: spec,
                      designM2: totalM2,
                      basePrice,
                    });
                  }}
                  className="h-12 text-base font-mono font-bold rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-400">Porch (m²)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={design.customSpec?.porchM2 || 4}
                  onChange={(e) => {
                    const porM2 = parseFloat(e.target.value) || 0;
                    const spec = { ...(design.customSpec || { storeys: "single", groundLivingM2: 140, firstLivingM2: 0, garageM2: 36, alfrescoM2: 15, balconyM2: 0, groundRateM2: 0, upperRateM2: 0, ancillaryRateM2: 0, scaffoldingAllowance: 0 }), porchM2: porM2 };
                    const totalM2 = calculateCustomTotalM2(spec);
                    const basePrice = calculateCustomFloorplanPrice(spec, design.specTier);
                    onChange({
                      customSpec: spec,
                      designM2: totalM2,
                      basePrice,
                    });
                  }}
                  className="h-12 text-base font-mono font-bold rounded-xl"
                />
              </div>
            </div>
          </div>
        )}

        {/* Primary Floor Plan Confirmation & Option to Add 2nd Dwelling */}
        {hasFloorPlanSelected && (
          <div className="pt-5 mt-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <span className={`text-sm font-bold ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                Selected Primary Design:
              </span>
              <Badge
                variant="outline"
                className={`font-mono text-sm font-bold py-1.5 px-3 rounded-lg ${
                  isLight ? "bg-slate-100 text-slate-900 border-slate-300" : "bg-slate-800 text-white border-slate-700"
                }`}
              >
                🏠 {design.designName} • {design.designM2} m²
              </Badge>
            </div>

            {!isSecondDwellingActive ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid="add-second-dwelling-btn"
                onClick={handleEnableSecondDwelling}
                className={`text-sm font-bold h-10 px-4 gap-2 transition-all cursor-pointer rounded-xl ${
                  isLight
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-400 shadow-xs"
                    : "border-emerald-500/40 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-950/40 hover:border-emerald-500/60"
                }`}
              >
                <Plus className="h-4 w-4 text-emerald-500 stroke-[3]" />
                Add 2nd Dwelling
              </Button>
            ) : (
              <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 font-mono text-sm font-bold py-1.5 px-3 flex items-center gap-2 rounded-lg">
                <Building2 className="h-4 w-4 text-cyan-400" />
                2nd Dwelling Active: {design.secondDwelling?.designName || "Secondary"}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* 2ND DWELLING CONFIGURATION CARD (SMOOTHLY APPEARS WHEN ADD 2ND DWELLING IS CLICKED) */}
      {hasFloorPlanSelected && isSecondDwellingActive && (
        <div
          data-testid="second-dwelling-card"
          className={`p-6 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
            isLight
              ? "bg-gradient-to-br from-white via-cyan-50/20 to-slate-50 border-cyan-300/80 shadow-md shadow-cyan-500/5"
              : "bg-gradient-to-br from-slate-900/90 via-cyan-950/20 to-slate-900/60 border-cyan-500/40 backdrop-blur-md shadow-lg shadow-cyan-950/20"
          }`}
        >
          {/* Header with Title and Remove Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-5 border-b border-cyan-500/20">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-500 flex items-center justify-center flex-none">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className={`text-base sm:text-lg font-bold uppercase tracking-wider ${isLight ? "text-slate-900" : "text-white"}`}>
                    Second Dwelling / Auxiliary Residence
                  </h3>
                  <Badge variant="outline" className="text-xs text-cyan-600 dark:text-cyan-400 border-cyan-500/40 font-bold px-2.5 py-0.5">
                    Dual Occupancy / Granny Flat
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  Configure independent secondary living, granny flat, or duplex second home.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-testid="remove-second-dwelling-btn"
              onClick={handleRemoveSecondDwelling}
              className="text-sm text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 gap-1.5 h-9 px-3 font-semibold cursor-pointer self-start sm:self-center rounded-xl"
            >
              <X className="h-4 w-4" />
              Remove 2nd Dwelling
            </Button>
          </div>

          {/* 2nd Dwelling Form Fields */}
          <div className="space-y-5">
            {/* 1. House Type for 2nd Dwelling */}
            <div className="space-y-2">
              <Label className={`text-sm font-bold uppercase tracking-wider block ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                2nd Dwelling Type
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {(["Granny Flat", "Single Storey", "Double Storey", "Dual Living", "Split Level"] as HousingTypeTab[]).map(
                  (type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleSelectSecondHouseType(type)}
                      className={`py-2.5 px-3 rounded-xl text-sm font-bold transition-all border text-center cursor-pointer ${
                        secondHouseType === type
                          ? isLight
                            ? "bg-cyan-50 border-cyan-500 text-cyan-950 shadow-xs ring-2 ring-cyan-500/20"
                            : "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm ring-1 ring-cyan-400/30"
                          : isLight
                          ? "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                          : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {type}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* 2. Searchable Floorplan Dropdown for 2nd Dwelling */}
            <div className="space-y-2 relative" ref={secondDropdownRef}>
              <Label className={`text-sm font-bold uppercase tracking-wider block ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                2nd Dwelling Floor Plan (Search by Typing)
              </Label>
              <div className="relative">
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 pointer-events-none" />
                <Input
                  data-testid="second-dwelling-search-input"
                  placeholder={
                    secondHouseType === "Granny Flat"
                      ? "Search Aqua Granny Flats (e.g. Aqua 1, Aqua 2)..."
                      : `Search ${secondHouseType} models (e.g. Jasper 26, Topaz)...`
                  }
                  value={secondSearchQuery}
                  onFocus={() => setIsSecondDropdownOpen(true)}
                  onChange={(e) => {
                    setSecondSearchQuery(e.target.value);
                    setIsSecondDropdownOpen(true);
                  }}
                  className={`pl-12 pr-12 text-base h-12 rounded-xl ${
                    isLight
                      ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-cyan-600"
                      : "bg-slate-950/80 border-slate-800 text-white focus:border-cyan-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setIsSecondDropdownOpen(!isSecondDropdownOpen)}
                  className="absolute right-4 top-3.5 p-0.5 text-slate-400 hover:text-slate-200"
                >
                  <ChevronDown className="h-5 w-5" />
                </button>
              </div>

              {/* 2nd Dropdown Results Menu */}
              {isSecondDropdownOpen && (
                <div
                  role="listbox"
                  className={`absolute left-0 right-0 top-full mt-2 z-50 max-h-72 overflow-y-auto rounded-2xl border shadow-2xl backdrop-blur-xl ${
                    isLight
                      ? "bg-white/98 border-slate-300 text-slate-900 divide-y divide-slate-100"
                      : "bg-slate-950/98 border-slate-800 text-white divide-y divide-slate-800/80"
                  }`}
                >
                  {filteredSecondModels.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-400">
                      No matching floor plans found for "{secondSearchQuery}" in {secondHouseType}.
                    </div>
                  ) : (
                    filteredSecondModels.map(({ row, type }) => {
                      const isSelected = design.secondDwelling?.designName?.toLowerCase() === row.name.toLowerCase();
                      const tierPrice = getTierPrice(row, design.secondDwelling?.specTier || "H1", type);
                      const planInfo = plansForDesign(row.name)[0];

                      return (
                        <div
                          key={row.name}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleSelectSecondModel(row, type)}
                          className={`p-4 cursor-pointer transition-all flex items-center justify-between gap-4 ${
                            isSelected
                              ? isLight
                                ? "bg-cyan-50/90 text-cyan-950 font-bold"
                                : "bg-cyan-500/20 text-cyan-300 font-bold"
                              : isLight
                              ? "hover:bg-slate-100"
                              : "hover:bg-slate-900"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2.5">
                              <span className="text-base font-extrabold truncate">{row.name}</span>
                              <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-500/10 text-slate-400 font-mono font-semibold">
                                {row.m2} m²
                              </span>
                              {isSelected && (
                                <CheckCircle2 className="h-5 w-5 text-cyan-500 flex-none" />
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                              <span className="flex items-center gap-1.5">
                                <Bed className="h-3.5 w-3.5" /> {planInfo?.beds ?? (type === "Granny Flat" ? 2 : (row.m2 > 150 ? 3 : 2))} Beds
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Bath className="h-3.5 w-3.5" /> {planInfo?.baths ?? 1} Bath
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Car className="h-3.5 w-3.5" /> {planInfo?.cars ?? (type === "Granny Flat" ? 0 : 1)} Cars
                              </span>
                            </div>
                          </div>

                          <div className="text-right flex-none">
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">
                              Base Price
                            </span>
                            <span className={`text-base font-mono font-extrabold ${isLight ? "text-cyan-700" : "text-cyan-400"}`}>
                              {formatAud(tierPrice)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* 3. Inclusions & Façade Row for 2nd Dwelling */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Inclusions Tier */}
              <div className="space-y-2">
                <Label className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                  2nd Dwelling Inclusions
                </Label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { code: "H1" as const, label: "H1 Smart" },
                    { code: "H2" as const, label: "H2 Design" },
                    { code: "H3" as const, label: "H3 Luxury" },
                  ].map(({ code, label }) => {
                    const isSelected = design.secondDwelling?.specTier?.includes(code) || (code === "H1" && !design.secondDwelling?.specTier);
                    return (
                      <button
                        key={code}
                        type="button"
                        onClick={() => handleSelectSecondTier(code)}
                        className={`py-2.5 px-3 rounded-xl text-sm font-bold transition-all border text-center cursor-pointer ${
                          isSelected
                            ? isLight
                              ? "bg-cyan-50 border-cyan-500 text-cyan-950 ring-2 ring-cyan-500/20"
                              : "bg-cyan-500/20 border-cyan-400 text-cyan-300 ring-1 ring-cyan-400/30"
                            : isLight
                            ? "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                            : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Façade Selection */}
              <div className="space-y-2">
                <Label className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                  2nd Dwelling Façade
                </Label>
                <Select
                  value={design.secondDwelling?.facadeName || (secondSuitableFacades[0]?.name ?? "Classic")}
                  onValueChange={handleSelectSecondFacade}
                >
                  <SelectTrigger
                    className={`h-12 text-sm font-bold rounded-xl ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-cyan-600 shadow-xs"
                        : "bg-slate-950/80 border-slate-800 text-white focus:border-cyan-500"
                    }`}
                  >
                    <SelectValue placeholder="Select 2nd dwelling façade…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {secondSuitableFacades.map((facade) => (
                      <SelectItem key={facade.name} value={facade.name} className="text-sm py-2.5 cursor-pointer">
                        <div className="flex items-center justify-between w-full gap-4">
                          <span className="font-bold">{facade.name}</span>
                          <span className="text-sm font-mono font-bold text-cyan-500">
                            {facade.uplift > 0 ? `+${formatAud(facade.uplift)}` : "Standard Included"}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 4. Live 2nd Dwelling Subtotal & Summary Strip */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isLight ? "bg-white/80 border-cyan-200" : "bg-slate-950/60 border-cyan-500/20"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-16 h-12 rounded-xl overflow-hidden bg-slate-900 flex-none border border-cyan-500/30">
                  <img
                    src={secondFacadePreviewUrl}
                    alt="2nd Dwelling"
                    className="w-full h-full object-contain object-center"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/facades/classic-facade-single-stry.jpg";
                    }}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className={`text-sm sm:text-base font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                      {design.secondDwelling?.designName || "Aqua 1"}
                    </span>
                    <span className="text-xs sm:text-sm font-mono text-cyan-600 dark:text-cyan-400 font-bold">
                      {design.secondDwelling?.designM2 || 59.96} m²
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 block mt-0.5">
                    {design.secondDwelling?.specTier || "H1 Smart Living"} • {design.secondDwelling?.facadeName || "Classic"} Façade
                  </span>
                </div>
              </div>

              <div className="text-right flex-none flex items-center sm:flex-col justify-between sm:justify-center">
                <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                  2nd Dwelling Total
                </span>
                <span className={`text-xl font-mono font-black ${isLight ? "text-cyan-700" : "text-cyan-400"}`}>
                  +{formatAud(secondDwellingTotalPrice)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      {hasFloorPlanSelected && (
        <div
          className={`p-6 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
            isLight
              ? "bg-white border-slate-200 shadow-sm"
              : "bg-slate-900/60 border-slate-800/80 backdrop-blur-md"
          }`}
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <Label className={`text-sm sm:text-base font-bold uppercase tracking-wider block ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                3. Select Inclusion Specification Tier
              </Label>
            </div>
          </div>

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {availableTiers.map((tierDef) => {
              const isSelected = selectedTierCode === tierDef.shortCode;
              const isFhbOrIp = tierDef.shortCode === "IP" || tierDef.shortCode === "FHB";
              const isTierDisabled = isFhbOrIp && !isCurrentDesignFhbEligible;

              // Direct card price calculation
              let cardPrice: number | null = null;
              if (currentModel) {
                cardPrice = getTierPrice(currentModel.row, tierDef.tier, houseType, division);
              }

              return (
                <div
                  key={tierDef.shortCode}
                  data-testid={`tier-card-${tierDef.shortCode.toLowerCase()}`}
                  onClick={() => !isTierDisabled && handleSelectTier(tierDef)}
                  className={`p-5 sm:p-6 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                    isTierDisabled
                      ? isLight
                        ? "bg-slate-100/70 border-slate-200 opacity-60 cursor-not-allowed"
                        : "bg-slate-950/40 border-slate-900 opacity-50 cursor-not-allowed"
                      : isSelected
                      ? isLight
                        ? "bg-emerald-50/90 border-emerald-500 shadow-md ring-2 ring-emerald-500/20 cursor-pointer hover:scale-[1.01]"
                        : "bg-emerald-950/30 border-emerald-400 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-400 cursor-pointer hover:scale-[1.01]"
                      : isLight
                      ? "bg-slate-50 border-slate-200 hover:border-slate-300 cursor-pointer hover:scale-[1.01]"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-700 cursor-pointer hover:scale-[1.01]"
                  }`}
                >
                  {isTierDisabled ? (
                    <span className="absolute -top-3 right-4 text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full shadow-xs bg-amber-500/20 text-amber-500 border border-amber-500/30">
                      {isNsw ? "76 NSW Models Only" : "22 QLD Models Only"}
                    </span>
                  ) : tierDef.badge ? (
                    <span
                      className={`absolute -top-3 right-4 text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full shadow-xs ${tierDef.badgeColor}`}
                    >
                      {tierDef.badge}
                    </span>
                  ) : null}

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs sm:text-sm font-extrabold text-emerald-400 uppercase tracking-wider">
                        {tierDef.shortCode}
                      </span>
                      {isSelected && <Check className="h-5 w-5 text-emerald-500 stroke-[3]" />}
                    </div>

                    <h4 className={`text-lg sm:text-xl font-extrabold ${isLight ? "text-slate-900" : "text-white"}`}>
                      {tierDef.title}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-400 mb-2">{tierDef.tagline}</p>

                    {/* Direct Pricing Display on Card */}
                    <div className="mb-3">
                      {isTierDisabled ? (
                        <span className="text-[11px] text-amber-500/90 font-semibold block leading-tight">
                          Only available on {isNsw ? "76 NSW" : "22 QLD"} certified FHB/Investor designs
                        </span>
                      ) : cardPrice ? (
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xl sm:text-2xl font-mono font-black text-emerald-500">
                            {formatAud(cardPrice)}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                            Base
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <ul className="space-y-2 text-xs sm:text-sm text-slate-400 border-t border-slate-700/40 pt-3">
                      {tierDef.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-emerald-500 flex-none mt-0.5" />
                          <span className="leading-snug">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 3: FAÇADE SELECTION & RHS LIVE PREVIEW (SMOOTHLY APPEARS ONLY AFTER INCLUSION TIER SELECTED) */}
      {hasFloorPlanSelected && hasInclusionSelected && (
        <div
          className={`p-6 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
            isLight
              ? "bg-white border-slate-200 shadow-sm"
              : "bg-slate-900/60 border-slate-800/80 backdrop-blur-md"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <Label className={`text-sm sm:text-base font-bold uppercase tracking-wider block ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                4. Select Façade (Filtered for {design.designName})
              </Label>
            </div>

            {/* Catalogue vs Custom Toggle */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setFacadeMode("catalogue");
                  onChange({ isCustomFacade: false });
                }}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer ${
                  facadeMode === "catalogue"
                    ? isLight
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : "bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm"
                    : isLight
                    ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                    : "bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                📐 Certified Catalogue ({suitableFacades.length})
              </button>

              <button
                type="button"
                onClick={() => {
                  setFacadeMode("custom");
                  onChange({
                    isCustomFacade: true,
                    facadeName: design.facadeName && !suitableFacades.some((f) => f.name === design.facadeName) ? design.facadeName : "Custom Architectural Façade",
                    facadePrice: design.facadePrice || 0,
                  });
                }}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                  facadeMode === "custom"
                    ? isLight
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : "bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm"
                    : isLight
                    ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                    : "bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                🎨 Custom Bespoke Façade
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LHS: Façade Controls */}
            <div className="lg:col-span-6 space-y-4">
              {facadeMode === "catalogue" ? (
                <>
                  <div className="space-y-2">
                    <Label className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                      Choose Façade ({suitableFacades.length} certified options)
                    </Label>
                    <Select
                      value={design.facadeName || (suitableFacades[0]?.name ?? "Classic")}
                      onValueChange={handleSelectFacade}
                    >
                      <SelectTrigger
                        data-testid="facade-select-trigger"
                        className={`h-12 text-base font-bold rounded-xl ${
                          isLight
                            ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-emerald-600 shadow-xs"
                            : "bg-slate-950/80 border-slate-800 text-white focus:border-emerald-500"
                        }`}
                      >
                        <SelectValue placeholder="Select compatible façade…" />
                      </SelectTrigger>
                      <SelectContent className="max-h-80">
                        {suitableFacades.map((facade) => (
                          <SelectItem key={facade.name} value={facade.name} className="py-2.5 text-sm cursor-pointer">
                            <div className="flex items-center justify-between w-full gap-4">
                              <span className="font-bold">{facade.name}</span>
                              <span className="text-sm font-mono font-bold text-emerald-500">
                                {facade.uplift > 0 ? `+${formatAud(facade.uplift)}` : "Standard Included"}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Selected Façade Summary Badge Card */}
                  <div
                    className={`p-4 sm:p-5 rounded-2xl border flex items-center justify-between gap-4 ${
                      isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                    }`}
                  >
                    <div>
                      <span className="text-xs uppercase font-bold text-slate-400 block tracking-wider">
                        Selected Architectural Model
                      </span>
                      <span className={`text-base font-extrabold ${isLight ? "text-slate-900" : "text-white"}`}>
                        {design.facadeName || "Classic"} Façade
                      </span>
                      <span className="text-xs sm:text-sm text-slate-400 block mt-0.5">
                        Full architectural elevations and brickwork included.
                      </span>
                    </div>

                    <div className="text-right flex-none">
                      <Badge
                        variant="outline"
                        className={`font-mono font-bold text-sm py-1.5 px-3 rounded-lg ${
                          (design.facadePrice || 0) > 0
                            ? "border-cyan-500/40 text-cyan-500 bg-cyan-500/10"
                            : "border-emerald-500/40 text-emerald-500 bg-emerald-500/10"
                        }`}
                      >
                        {(design.facadePrice || 0) > 0
                          ? `+${formatAud(design.facadePrice || 0)}`
                          : "Standard Included"}
                      </Badge>
                    </div>
                  </div>
                </>
              ) : (
                /* Custom Bespoke Façade Form */
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                      Custom Façade Name / Specification
                    </Label>
                    <Input
                      placeholder="e.g. Architectural Coastal Hampton Elevation"
                      value={design.facadeName || ""}
                      onChange={(e) => {
                        onChange({
                          isCustomFacade: true,
                          facadeName: e.target.value,
                        });
                      }}
                      className={`h-12 text-base font-bold rounded-xl ${
                        isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-slate-950/80 border-slate-800 text-white"
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                        Façade Uplift / Price ($)
                      </Label>
                      <Input
                        type="number"
                        step="100"
                        value={design.facadePrice || ""}
                        placeholder="0"
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          onChange({
                            isCustomFacade: true,
                            facadePrice: val,
                          });
                        }}
                        className={`h-12 text-base font-mono font-bold rounded-xl ${
                          isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-slate-950/80 border-slate-800 text-white"
                        }`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                        Custom Elevation Render
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => customElevationInputRef.current?.click()}
                        className="w-full h-12 rounded-xl text-xs sm:text-sm font-bold gap-2 cursor-pointer"
                      >
                        <Upload className="h-4 w-4" />
                        {design.facadeImageUrl ? "Replace Elevation Image" : "Upload Elevation Render"}
                      </Button>
                      <input
                        ref={customElevationInputRef}
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleCustomElevationUpload}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Custom Façade Summary Badge Card */}
                  <div
                    className={`p-4 sm:p-5 rounded-2xl border flex items-center justify-between gap-4 ${
                      isLight ? "bg-amber-50/80 border-amber-300" : "bg-amber-950/20 border-amber-500/30"
                    }`}
                  >
                    <div>
                      <span className="text-xs uppercase font-bold text-amber-500 block tracking-wider">
                        Bespoke Architectural Façade
                      </span>
                      <span className={`text-base font-extrabold ${isLight ? "text-slate-900" : "text-white"}`}>
                        {design.facadeName || "Custom Elevation"}
                      </span>
                      <span className="text-xs sm:text-sm text-slate-400 block mt-0.5">
                        Client custom design tailored to architectural drawing.
                      </span>
                    </div>

                    <div className="text-right flex-none">
                      <Badge className="font-mono font-bold text-sm py-1.5 px-3 bg-amber-500 text-slate-950">
                        +{(design.facadePrice || 0) > 0 ? formatAud(design.facadePrice || 0) : "$0 Included"}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RHS: Façade Live Preview Card */}
            <div className="lg:col-span-6">
              <div
                className={`rounded-2xl sm:rounded-3xl border overflow-hidden shadow-xl ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-slate-800"
                }`}
              >
                {/* Generous headroom and padding, no gradient overlay blocking roofline */}
                <div className="relative h-64 sm:h-80 w-full bg-slate-900/95 overflow-hidden flex items-center justify-center p-4 sm:p-6 border-b border-slate-800/80">
                  <img
                    src={facadePreviewUrl}
                    alt={design.facadeName || "Façade Preview"}
                    className="w-full h-full object-contain object-center drop-shadow-md"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/facades/classic-facade-single-stry.jpg";
                    }}
                  />
                </div>

                {/* Dedicated info bar below image (eliminates roofline obscuring overlay) */}
                <div className={`p-4 sm:p-5 flex items-center justify-between border-b gap-3 ${
                  isLight ? "bg-slate-100/80 border-slate-200" : "bg-slate-900/80 border-slate-800"
                }`}>
                  <div>
                    <span className="text-[11px] uppercase font-extrabold tracking-wider text-emerald-500 block">
                      {design.isCustomFacade ? "Custom Bespoke Façade" : "Live Architectural Preview"}
                    </span>
                    <h4 className={`text-base sm:text-lg font-bold leading-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                      {design.facadeName || (design.isCustomFacade ? "Custom Elevation" : "Classic Façade")}
                    </h4>
                  </div>

                  <Badge
                    className={`text-xs sm:text-sm font-mono font-bold py-1 px-3 ${
                      design.isCustomFacade
                        ? "bg-amber-500 text-slate-950"
                        : (design.facadePrice || 0) > 0
                        ? "bg-cyan-500 text-slate-950"
                        : "bg-emerald-500 text-slate-950"
                    }`}
                  >
                    {(design.facadePrice || 0) > 0 ? `+${formatAud(design.facadePrice || 0)}` : "Included Standard"}
                  </Badge>
                </div>

                <div className="p-4 sm:p-5 flex items-center justify-between text-sm text-slate-400">
                  <div className="flex items-center gap-2 font-medium">
                    <Building className="h-4 w-4 text-slate-400" />
                    <span>{design.designName}</span>
                  </div>
                  <span className="font-semibold">{design.designM2} m² Total Area</span>
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
          <span>Back to Client</span>
        </Button>

        <Button
          type="button"
          onClick={onNext}
          disabled={!hasFloorPlanSelected}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold px-10 h-14 text-base rounded-xl shadow-lg shadow-emerald-500/20 gap-2 cursor-pointer"
        >
          Continue to Site Costs
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Modals for modified floor plan candidate verification */}
      {pendingCandidate && (
        <BaseDesignConfirmationModal
          isOpen={isBaseConfirmOpen}
          candidate={pendingCandidate}
          onConfirm={() => {
            setIsBaseConfirmOpen(false);
            if (pendingAnalysis) {
              setIsReviewModalOpen(true);
            }
          }}
          onClose={() => setIsBaseConfirmOpen(false)}
        />
      )}

      {pendingAnalysis && (
        <ModifiedPlanReviewModal
          isOpen={isReviewModalOpen}
          analysis={pendingAnalysis}
          onApply={handleApplyModifiedPlan}
          onClose={() => setIsReviewModalOpen(false)}
        />
      )}
    </div>
  );
}
