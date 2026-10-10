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
import {
  SINGLE_STOREY_PRICES,
  DOUBLE_STOREY_PRICES,
  DUAL_OC_PRICES,
  SPLIT_LEVEL_PRICES,
  type PriceRow,
} from "@/lib/pricelist.data";
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
} from "@/lib/quoting/quoteTypes";
import { ModifiedPlanReviewModal } from "@/components/quoting/ModifiedPlanReviewModal";
import { BaseDesignConfirmationModal } from "@/components/quoting/BaseDesignConfirmationModal";

interface V2StepFloorPlanProps {
  design: QuoteDesignSelection;
  onChange: (patch: Partial<QuoteDesignSelection>) => void;
  onAddInclusionLineItems?: (items: QuoteSelectedLineItem[]) => void;
  onNext: () => void;
  onPrev: () => void;
  isLight: boolean;
}

type HousingTypeTab = "Single Storey" | "Double Storey" | "Dual Living" | "Split Level" | "Granny Flat";

interface TierCardDef {
  tier: InclusionTier;
  shortCode: "H1" | "H2" | "H3";
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
];

export function V2StepFloorPlan({
  design,
  onChange,
  onAddInclusionLineItems,
  onNext,
  onPrev,
  isLight,
}: V2StepFloorPlanProps) {
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

  // 2nd Dwelling states
  const isSecondDwellingActive = Boolean(design.hasSecondDwelling && design.secondDwelling?.enabled);
  const [secondHouseType, setSecondHouseType] = useState<HousingTypeTab>(() => {
    return (design.secondDwelling?.housingType as HousingTypeTab) || "Granny Flat";
  });
  const [secondSearchQuery, setSecondSearchQuery] = useState(design.secondDwelling?.designName || "");
  const [isSecondDropdownOpen, setIsSecondDropdownOpen] = useState(false);
  const secondDropdownRef = useRef<HTMLDivElement>(null);

  // Explicit user tier selection state (so Point 4 is hidden until Point 3 is clicked)
  const [selectedTierCode, setSelectedTierCode] = useState<"H1" | "H2" | "H3" | null>(() => {
    if (design.hasExplicitlySelectedTier && design.specTier) {
      if (design.specTier.includes("H1")) return "H1";
      if (design.specTier.includes("H3")) return "H3";
      return "H2";
    }
    return null;
  });

  // File scan states for modified plan
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const customElevationInputRef = useRef<HTMLInputElement>(null);
  const [modifiedPlanPreviewUrl, setModifiedPlanPreviewUrl] = useState<string>(() => design.modifiedPlanImageUrl || "");
  const [isDimensionTableUnchanged, setIsDimensionTableUnchanged] = useState(false);
  const [scanMessage, setScanMessage] = useState<{ type: "success" | "warning" | "info"; text: string } | null>(null);

  // Façade selection mode: "catalogue" | "custom"
  const [facadeMode, setFacadeMode] = useState<"catalogue" | "custom">(() => {
    return design.isCustomFacade ? "custom" : "catalogue";
  });

  const [pendingCandidate, setPendingCandidate] = useState<BaseDesignCandidate | null>(null);
  const [isBaseConfirmOpen, setIsBaseConfirmOpen] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState<PlanModificationAnalysis | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
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

  // Sync secondSearchQuery when secondDwelling.designName changes from outside
  useEffect(() => {
    if (design.secondDwelling?.designName && design.secondDwelling.designName !== secondSearchQuery && !isSecondDropdownOpen) {
      setSecondSearchQuery(design.secondDwelling.designName);
    }
  }, [design.secondDwelling?.designName]);

  // All price rows grouped
  const allModels = useMemo(() => {
    const list: { row: PriceRow; type: HousingTypeTab }[] = [];
    const isGrannyFlat = (r: PriceRow) => /^aqua\b/i.test(r.name);

    SINGLE_STOREY_PRICES.forEach((r) => {
      if (isGrannyFlat(r)) {
        list.push({ row: r, type: "Granny Flat" });
      } else {
        list.push({ row: r, type: "Single Storey" });
      }
    });
    DOUBLE_STOREY_PRICES.forEach((r) => list.push({ row: r, type: "Double Storey" }));
    DUAL_OC_PRICES.forEach((r) => list.push({ row: r, type: "Dual Living" }));
    SPLIT_LEVEL_PRICES.forEach((r) => list.push({ row: r, type: "Split Level" }));

    return list;
  }, []);

  // Filtered designs for current house type and search
  const filteredModels = useMemo(() => {
    return allModels.filter(({ row, type }) => {
      if (type !== houseType) return false;
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase().trim();
        return row.name.toLowerCase().includes(query);
      }
      return true;
    });
  }, [allModels, houseType, searchQuery]);

  // Current matched model
  const currentModel = useMemo(() => {
    if (!design.designName) return null;
    return allModels.find(
      (m) => m.row.name.toLowerCase() === design.designName.toLowerCase()
    );
  }, [allModels, design.designName]);

  // Suitable facades for selected design
  const suitableFacades = useMemo(() => {
    if (!design.designName) return [];
    return getFacadesForDesignAndHousingType(design.designName, design.housingType || houseType);
  }, [design.designName, design.housingType, houseType]);

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
      design.secondDwelling.housingType || secondHouseType
    );
  }, [design.secondDwelling?.designName, design.secondDwelling?.housingType, secondHouseType]);

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
    const facades = getFacadesForDesignAndHousingType(defaultModel.name, "Granny Flat");
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
        widthM: planInfo?.width || "6.8m",
        lengthM: planInfo?.length || "8.82m",
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
    const facades = getFacadesForDesignAndHousingType(firstModel.name, type);
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
        widthM: planInfo?.width || "",
        lengthM: planInfo?.length || "",
      },
    });
    setSecondSearchQuery(firstModel.name);
  };

  const handleSelectSecondModel = (row: PriceRow, type: HousingTypeTab) => {
    const currentTier = design.secondDwelling?.specTier || design.specTier || "H1 Smart Living";
    const basePrice = getTierPrice(row, currentTier, type);
    const planInfo = plansForDesign(row.name)[0];
    const stdAreas = getStandardAreaBreakdown(row.name, type, row.m2);
    const facades = getFacadesForDesignAndHousingType(row.name, type);
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
        widthM: planInfo?.width || "",
        lengthM: planInfo?.length || "",
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
      design.secondDwelling?.housingType || secondHouseType
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

  // Handle selecting a standard catalogue design
  const handleSelectModel = (row: PriceRow, type: HousingTypeTab) => {
    const tier = selectedTierCode
      ? (selectedTierCode === "H1" ? "H1 Smart Living" : selectedTierCode === "H2" ? "H2 Design Collection" : "H3 Luxury Inclusions")
      : (design.specTier || "H2 Design Collection");
    const basePrice = getTierPrice(row, tier, type);
    const planInfo = plansForDesign(row.name)[0];
    const stdAreas = getStandardAreaBreakdown(row.name, type, row.m2);

    const facades = getFacadesForDesignAndHousingType(row.name, type);
    const initialFacade = facades[0] || { name: "Classic", uplift: 0 };

    onChange({
      mode: "standard",
      isModifiedFloorplan: false,
      designName: row.name,
      modelName: row.name,
      designM2: row.m2,
      housingType: type,
      basePrice,
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
    const tier = tierDef.tier;
    let nextBasePrice = design.basePrice || 350000;

    if (designMode === "standard" && currentModel) {
      nextBasePrice = getTierPrice(currentModel.row, tier, houseType);
    } else if (designMode === "modified" && design.baseDesignCandidate) {
      const candModel = allModels.find(
        (m) => m.row.name.toLowerCase() === design.baseDesignCandidate!.modelName.toLowerCase()
      );
      if (candModel) {
        const stdBase = getTierPrice(candModel.row, tier, houseType);
        const calc = calculateModifiedFloorplanPricing({
          ...design,
          specTier: tier,
          basePrice: stdBase,
        });
        nextBasePrice = calc.modifiedTotalPrice;
      }
    } else if (designMode === "modified" && currentModel) {
      const stdBase = getTierPrice(currentModel.row, tier, houseType);
      const calc = calculateModifiedFloorplanPricing({
        ...design,
        specTier: tier,
        basePrice: stdBase,
      });
      nextBasePrice = calc.modifiedTotalPrice;
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

  // Modified Area change handler
  const handleModifiedAreaChange = (field: keyof FloorplanAreaBreakdown, valStr: string) => {
    const val = parseFloat(valStr) || 0;
    const currentAreas = design.areas || getStandardAreaBreakdown(design.designName, design.housingType, design.designM2);
    const updatedAreas = { ...currentAreas, [field]: val };
    const updatedTotal = Math.round(
      ((updatedAreas.livingM2 || 0) +
      (updatedAreas.garageM2 || 0) +
      (updatedAreas.alfrescoM2 || 0) +
      (updatedAreas.porchM2 || 0)) * 100
    ) / 100;

    const currentBasePrice = design.standardBasePrice || currentModelPrice || design.basePrice || 0;
    const calc = calculateModifiedFloorplanPricing({
      ...design,
      isModifiedFloorplan: true,
      standardAreas: standardBaselineAreas,
      modifiedAreas: { ...updatedAreas, totalM2: updatedTotal },
      areas: { ...updatedAreas, totalM2: updatedTotal },
      designM2: updatedTotal,
      modifiedDesignM2: updatedTotal,
      standardDesignM2: standardBaselineAreas.totalM2,
      standardBasePrice: currentBasePrice,
    });

    onChange({
      isModifiedFloorplan: true,
      standardAreas: standardBaselineAreas,
      modifiedAreas: { ...updatedAreas, totalM2: updatedTotal },
      areas: { ...updatedAreas, totalM2: updatedTotal },
      designM2: updatedTotal,
      modifiedDesignM2: updatedTotal,
      standardDesignM2: standardBaselineAreas.totalM2,
      standardBasePrice: currentBasePrice,
      basePrice: calc.modifiedTotalPrice,
    });
  };

  // File Upload scan for architectural modified plans (extract schedule or prompt for manual sizes)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
        (parsedSchedule.totalM2 || parsedSchedule.livingM2)
      );

      // Check if the extracted dimensions are changed from baseline
      const isChangedFromBaseline = Boolean(hasParsedDimensions && (
        (parsedSchedule?.totalM2 && Math.abs(parsedSchedule.totalM2 - (baselineAreas.totalM2 || 0)) > 0.1) ||
        (parsedSchedule?.livingM2 && Math.abs(parsedSchedule.livingM2 - (baselineAreas.livingM2 || 0)) > 0.1) ||
        (parsedSchedule?.garageM2 && Math.abs(parsedSchedule.garageM2 - (baselineAreas.garageM2 || 0)) > 0.1) ||
        (parsedSchedule?.alfrescoM2 && Math.abs(parsedSchedule.alfrescoM2 - (baselineAreas.alfrescoM2 || 0)) > 0.1) ||
        (parsedSchedule?.porchM2 && Math.abs(parsedSchedule.porchM2 - (baselineAreas.porchM2 || 0)) > 0.1)
      ));

      if (hasParsedDimensions && isChangedFromBaseline && parsedSchedule) {
        const newLiving = parsedSchedule.livingM2 || baselineAreas.livingM2 || 0;
        const newGarage = parsedSchedule.garageM2 || baselineAreas.garageM2 || 0;
        const newAlfresco = parsedSchedule.alfrescoM2 || baselineAreas.alfrescoM2 || 0;
        const newPorch = parsedSchedule.porchM2 || baselineAreas.porchM2 || 0;
        const newTotal = parsedSchedule.totalM2 || Math.round((newLiving + newGarage + newAlfresco + newPorch) * 100) / 100;

        const updatedAreas: FloorplanAreaBreakdown = {
          livingM2: newLiving,
          garageM2: newGarage,
          alfrescoM2: newAlfresco,
          porchM2: newPorch,
          totalM2: newTotal,
        };

        const currentBasePrice = design.standardBasePrice || currentModelPrice || design.basePrice || 0;
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
          basePrice: calc.modifiedTotalPrice,
          modifiedPlanFileName: file.name,
          modifiedPlanImageUrl: previewUrl,
        });

        setIsDimensionTableUnchanged(false);
        setScanMessage({
          type: "success",
          text: `Dimension table detected! Living: ${newLiving} m², Garage: ${newGarage} m², Alfresco: ${newAlfresco} m², Porch: ${newPorch} m² (Total: ${newTotal} m²)`,
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

      setIsScanning(false);
      setScanStatus("");
    } catch (err: any) {
      setIsScanning(false);
      setScanStatus("");
      setIsDimensionTableUnchanged(true);
      setScanMessage({
        type: "warning",
        text: "Could not scan dimension table automatically. Please enter the new modified sizes below:",
      });
      toast.error("Could not scan dimensions. Please input sizes manually below.");
    }
  };

  const hasFloorPlanSelected = Boolean(design.designName && design.designName.trim().length > 0);
  const hasInclusionSelected = Boolean(selectedTierCode);

  // Baseline reference areas for modified plan comparison
  const standardBaselineAreas = useMemo(() => {
    return getStandardAreaBreakdown(design.designName, design.housingType, design.standardDesignM2 || design.designM2);
  }, [design.designName, design.housingType, design.standardDesignM2, design.designM2]);

  const currentLiving = design.areas?.livingM2 ?? standardBaselineAreas.livingM2 ?? 0;
  const currentGarage = design.areas?.garageM2 ?? standardBaselineAreas.garageM2 ?? 0;
  const currentAlfresco = design.areas?.alfrescoM2 ?? standardBaselineAreas.alfrescoM2 ?? 0;
  const currentPorch = design.areas?.porchM2 ?? standardBaselineAreas.porchM2 ?? 0;
  const currentTotal = design.areas?.totalM2 ?? design.designM2 ?? 0;
  const totalVariance = Math.round((currentTotal - (standardBaselineAreas.totalM2 || 0)) * 100) / 100;

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
          <p className="text-sm sm:text-base text-slate-400 mt-1">
            Select house type, quick search floor plan, choose inclusion specification, and customize façade.
          </p>
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
                    const tierPrice = getTierPrice(row, design.specTier || "H2", type);
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
                          <div className="flex items-center gap-2.5">
                            <span className="text-base font-extrabold truncate">{row.name}</span>
                            <span className="text-xs px-2.5 py-0.5 rounded-md bg-slate-500/10 text-slate-400 font-mono font-semibold">
                              {row.m2} m²
                            </span>
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

        {/* MODIFIED FLOOR PLAN OPTIONS */}
        {designMode === "modified" && (
          <div className="space-y-5 pt-2">
            {/* Top Action & Upload Bar */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isLight ? "bg-amber-50/80 border-amber-300 shadow-xs" : "bg-amber-950/20 border-amber-500/30"
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className={`text-sm sm:text-base font-bold ${isLight ? "text-amber-950" : "text-amber-300"}`}>
                    Modified Floor Plan Mode
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-xl">
                  Upload an architectural plan to scan for schedule of areas, or enter customized room sizes below.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isScanning}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm h-11 px-4 gap-2 rounded-xl shadow-md cursor-pointer"
                >
                  <Upload className="h-4 w-4 stroke-[2.5]" />
                  {isScanning ? (scanStatus || "Scanning Plan…") : "Upload Modified Design (PDF / Image)"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Uploaded Drawing Preview Thumbnail & File Info */}
            {modifiedPlanPreviewUrl && (
              <div
                className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-300 ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 flex-none flex items-center justify-center">
                    {modifiedPlanPreviewUrl.startsWith("data:image") || modifiedPlanPreviewUrl.includes(".jpg") || modifiedPlanPreviewUrl.includes(".png") ? (
                      <img
                        src={modifiedPlanPreviewUrl}
                        alt="Uploaded modified plan"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileText className="h-8 w-8 text-amber-400" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs uppercase font-extrabold tracking-wider text-amber-500 block">
                      Uploaded Architectural Drawing
                    </span>
                    <span className={`text-sm font-bold truncate block ${isLight ? "text-slate-900" : "text-white"}`}>
                      {design.modifiedPlanFileName || "Custom Modified Plan Drawing"}
                    </span>
                    <span className="text-xs text-slate-400 block mt-0.5">
                      Drawing sheet attached to quote package.
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs h-9 px-3 font-semibold rounded-xl self-start sm:self-auto cursor-pointer"
                >
                  Replace Drawing
                </Button>
              </div>
            )}

            {/* Base Design Dropdown */}
            <div className="space-y-2">
              <Label className={`text-sm font-bold uppercase tracking-wider block ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                Base Hudson Design to Modify
              </Label>
              <div className="relative">
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Select base design to modify (e.g. Jasper 26, Tiffany 22)..."
                  value={searchQuery}
                  onFocus={() => setIsDropdownOpen(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  className={`pl-12 text-base h-12 rounded-xl ${
                    isLight ? "bg-slate-50 border-slate-300 text-slate-900" : "bg-slate-950/80 border-slate-800 text-white"
                  }`}
                />
              </div>
            </div>

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
                  {scanMessage.type === "warning" && (
                    <span className="text-xs text-slate-400 block mt-0.5">
                      Adjust living, garage, alfresco, or porch sizes below. The base price and tender delta update live.
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Side-by-Side Modified Area Dimensions Grid */}
            {hasFloorPlanSelected && (
              <div className="space-y-4 pt-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <Label className={`text-sm font-bold uppercase tracking-wider block ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                      Modified Dimensions Schedule (m²)
                    </Label>
                    <span className="text-xs text-slate-400">
                      Enter customized sizes. Base CAD reference values shown for comparison.
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs font-bold py-1 px-2.5">
                      Baseline: {standardBaselineAreas.totalM2} m²
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
                      Modified: {currentTotal} m² ({totalVariance >= 0 ? `+${totalVariance}` : `${totalVariance}`} m²)
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Living Area */}
                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Living Area
                      </Label>
                      <span className="text-[11px] font-mono text-slate-400">
                        Std: {standardBaselineAreas.livingM2} m²
                      </span>
                    </div>
                    <Input
                      type="number"
                      step="0.1"
                      value={design.areas?.livingM2 ?? currentLiving}
                      onChange={(e) => handleModifiedAreaChange("livingM2", e.target.value)}
                      className="h-12 text-lg font-mono font-bold rounded-xl"
                    />
                    <div className="flex items-center justify-between mt-2 text-xs font-mono">
                      <span className="text-slate-400">Variance:</span>
                      <span
                        className={`font-bold ${
                          (design.areas?.livingM2 || currentLiving) - (standardBaselineAreas.livingM2 || 0) >= 0
                            ? "text-emerald-500"
                            : "text-rose-400"
                        }`}
                      >
                        {Math.round(((design.areas?.livingM2 || currentLiving) - (standardBaselineAreas.livingM2 || 0)) * 100) / 100 >= 0 ? "+" : ""}
                        {Math.round(((design.areas?.livingM2 || currentLiving) - (standardBaselineAreas.livingM2 || 0)) * 100) / 100} m²
                      </span>
                    </div>
                  </div>

                  {/* Garage Area */}
                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Garage Area
                      </Label>
                      <span className="text-[11px] font-mono text-slate-400">
                        Std: {standardBaselineAreas.garageM2} m²
                      </span>
                    </div>
                    <Input
                      type="number"
                      step="0.1"
                      value={design.areas?.garageM2 ?? currentGarage}
                      onChange={(e) => handleModifiedAreaChange("garageM2", e.target.value)}
                      className="h-12 text-lg font-mono font-bold rounded-xl"
                    />
                    <div className="flex items-center justify-between mt-2 text-xs font-mono">
                      <span className="text-slate-400">Variance:</span>
                      <span
                        className={`font-bold ${
                          (design.areas?.garageM2 || currentGarage) - (standardBaselineAreas.garageM2 || 0) >= 0
                            ? "text-emerald-500"
                            : "text-rose-400"
                        }`}
                      >
                        {Math.round(((design.areas?.garageM2 || currentGarage) - (standardBaselineAreas.garageM2 || 0)) * 100) / 100 >= 0 ? "+" : ""}
                        {Math.round(((design.areas?.garageM2 || currentGarage) - (standardBaselineAreas.garageM2 || 0)) * 100) / 100} m²
                      </span>
                    </div>
                  </div>

                  {/* Alfresco Area */}
                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Alfresco
                      </Label>
                      <span className="text-[11px] font-mono text-slate-400">
                        Std: {standardBaselineAreas.alfrescoM2} m²
                      </span>
                    </div>
                    <Input
                      type="number"
                      step="0.1"
                      value={design.areas?.alfrescoM2 ?? currentAlfresco}
                      onChange={(e) => handleModifiedAreaChange("alfrescoM2", e.target.value)}
                      className="h-12 text-lg font-mono font-bold rounded-xl"
                    />
                    <div className="flex items-center justify-between mt-2 text-xs font-mono">
                      <span className="text-slate-400">Variance:</span>
                      <span
                        className={`font-bold ${
                          (design.areas?.alfrescoM2 || currentAlfresco) - (standardBaselineAreas.alfrescoM2 || 0) >= 0
                            ? "text-emerald-500"
                            : "text-rose-400"
                        }`}
                      >
                        {Math.round(((design.areas?.alfrescoM2 || currentAlfresco) - (standardBaselineAreas.alfrescoM2 || 0)) * 100) / 100 >= 0 ? "+" : ""}
                        {Math.round(((design.areas?.alfrescoM2 || currentAlfresco) - (standardBaselineAreas.alfrescoM2 || 0)) * 100) / 100} m²
                      </span>
                    </div>
                  </div>

                  {/* Porch Area */}
                  <div
                    className={`p-4 rounded-2xl border transition-all ${
                      isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Porch
                      </Label>
                      <span className="text-[11px] font-mono text-slate-400">
                        Std: {standardBaselineAreas.porchM2} m²
                      </span>
                    </div>
                    <Input
                      type="number"
                      step="0.1"
                      value={design.areas?.porchM2 ?? currentPorch}
                      onChange={(e) => handleModifiedAreaChange("porchM2", e.target.value)}
                      className="h-12 text-lg font-mono font-bold rounded-xl"
                    />
                    <div className="flex items-center justify-between mt-2 text-xs font-mono">
                      <span className="text-slate-400">Variance:</span>
                      <span
                        className={`font-bold ${
                          (design.areas?.porchM2 || currentPorch) - (standardBaselineAreas.porchM2 || 0) >= 0
                            ? "text-emerald-500"
                            : "text-rose-400"
                        }`}
                      >
                        {Math.round(((design.areas?.porchM2 || currentPorch) - (standardBaselineAreas.porchM2 || 0)) * 100) / 100 >= 0 ? "+" : ""}
                        {Math.round(((design.areas?.porchM2 || currentPorch) - (standardBaselineAreas.porchM2 || 0)) * 100) / 100} m²
                      </span>
                    </div>
                  </div>
                </div>

                {/* Live Base Price Summary Bar */}
                <div
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isLight ? "bg-emerald-50/70 border-emerald-200" : "bg-emerald-950/20 border-emerald-500/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-500">
                      Modified Design Base
                    </span>
                    <span className={`text-base font-extrabold ${isLight ? "text-slate-900" : "text-white"}`}>
                      {design.designName} ({currentTotal} m²)
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 font-mono">
                      Standard: {formatAud(design.standardBasePrice || design.basePrice || 0)}
                    </span>
                    <span className={`text-lg font-mono font-black ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
                      Total Base: {formatAud(design.basePrice || 0)}
                    </span>
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
                    className="w-full h-full object-cover"
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
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Choose the standard finishes package for {design.designName}.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {INCLUSION_TIERS.map((tierDef) => {
              const isSelected = selectedTierCode === tierDef.shortCode;
              return (
                <div
                  key={tierDef.shortCode}
                  data-testid={`tier-card-${tierDef.shortCode.toLowerCase()}`}
                  onClick={() => handleSelectTier(tierDef)}
                  className={`p-5 sm:p-6 rounded-2xl border text-left cursor-pointer transition-all hover:scale-[1.01] relative flex flex-col justify-between ${
                    isSelected
                      ? isLight
                        ? "bg-emerald-50/90 border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
                        : "bg-emerald-950/30 border-emerald-400 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-400"
                      : isLight
                      ? "bg-slate-50 border-slate-200 hover:border-slate-300"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {tierDef.badge && (
                    <span
                      className={`absolute -top-3 right-4 text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full shadow-xs ${tierDef.badgeColor}`}
                    >
                      {tierDef.badge}
                    </span>
                  )}

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
                    <p className="text-xs sm:text-sm text-slate-400 mb-4">{tierDef.tagline}</p>

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
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Choose a certified catalogue façade or specify an architectural custom bespoke façade.
              </p>
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
                <div className="relative h-64 sm:h-80 w-full bg-slate-900 overflow-hidden flex items-center justify-center">
                  <img
                    src={facadePreviewUrl}
                    alt={design.facadeName || "Façade Preview"}
                    className="w-full h-full object-cover object-center"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/facades/classic-facade-single-stry.jpg";
                    }}
                  />

                  {/* Gradient overlay badge */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-5 sm:p-6 flex items-end justify-between">
                    <div>
                      <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-400 block">
                        {design.isCustomFacade ? "Custom Bespoke Façade" : "Live Architectural Preview"}
                      </span>
                      <h4 className="text-lg sm:text-xl font-bold text-white leading-tight">
                        {design.facadeName || (design.isCustomFacade ? "Custom Elevation" : "Classic Façade")}
                      </h4>
                    </div>

                    <Badge
                      className={`text-sm font-mono font-bold py-1 px-3 ${
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
          onCancel={() => setIsBaseConfirmOpen(false)}
        />
      )}

      {pendingAnalysis && (
        <ModifiedPlanReviewModal
          isOpen={isReviewModalOpen}
          analysis={pendingAnalysis}
          onApply={(updatedDesign, lineItems) => {
            onChange(updatedDesign);
            if (onAddInclusionLineItems && lineItems.length > 0) {
              onAddInclusionLineItems(lineItems);
            }
            setIsReviewModalOpen(false);
            toast.success("Applied modified floor plan parameters!");
          }}
          onClose={() => setIsReviewModalOpen(false)}
        />
      )}
    </div>
  );
}
