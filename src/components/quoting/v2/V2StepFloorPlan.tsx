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

  // File scan states for modified plan
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // All price rows grouped
  const allModels = useMemo(() => {
    const list: { row: PriceRow; type: HousingTypeTab }[] = [];
    SINGLE_STOREY_PRICES.forEach((r) => list.push({ row: r, type: "Single Storey" }));
    DOUBLE_STOREY_PRICES.forEach((r) => list.push({ row: r, type: "Double Storey" }));
    DUAL_OC_PRICES.forEach((r) => list.push({ row: r, type: "Dual Living" }));
    SPLIT_LEVEL_PRICES.forEach((r) => list.push({ row: r, type: "Split Level" }));

    list.push(
      { row: { name: "Acacia 60", m2: 60, h1: 154000, h2: 169000, h3: 189000 }, type: "Granny Flat" },
      { row: { name: "Banksia 60", m2: 60, h1: 156000, h2: 171000, h3: 192000 }, type: "Granny Flat" }
    );
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

  // Handle selecting a standard catalogue design
  const handleSelectModel = (row: PriceRow, type: HousingTypeTab) => {
    const tier = design.specTier || "H2 Design Collection";
    const basePrice = getTierPrice(row, tier, type);
    const planInfo = plansForDesign(row.name);
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
      bedrooms: planInfo?.beds ?? (row.m2 > 240 ? 4 : 3),
      bathrooms: planInfo?.baths ?? (row.m2 > 180 ? 2 : 1),
      garage: planInfo?.cars ?? (row.m2 > 180 ? 2 : 1),
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

  // Switch Inclusion Tier
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
    } else if (designMode === "custom") {
      nextBasePrice = calculateCustomFloorplanPrice(design.customSpec, tier);
    }

    onChange({
      specTier: tier,
      basePrice: nextBasePrice,
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

  // Modified Area change handler
  const handleModifiedAreaChange = (field: keyof FloorplanAreaBreakdown, valStr: string) => {
    const val = parseFloat(valStr) || 0;
    const currentAreas = design.areas || getStandardAreaBreakdown(design.designName, design.housingType, design.designM2);
    const updatedAreas = { ...currentAreas, [field]: val };
    const updatedTotal =
      (updatedAreas.livingM2 || 0) +
      (updatedAreas.garageM2 || 0) +
      (updatedAreas.alfrescoM2 || 0) +
      (updatedAreas.porchM2 || 0);

    const calc = calculateModifiedFloorplanPricing({
      ...design,
      areas: { ...updatedAreas, totalM2: updatedTotal },
      designM2: updatedTotal,
    });

    onChange({
      isModifiedFloorplan: true,
      areas: { ...updatedAreas, totalM2: updatedTotal },
      designM2: updatedTotal,
      basePrice: calc.modifiedTotalPrice,
    });
  };

  // File Upload scan for architectural modified plans
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsScanning(true);
      setScanStatus("Parsing architectural drawing & OCR room schedules…");
      const analysis = await analyzeModifiedFloorplanFile(file);
      setPendingAnalysis(analysis);
      setIsScanning(false);
      setScanStatus("");

      if (analysis.baseDesignCandidate) {
        setPendingCandidate(analysis.baseDesignCandidate);
        setIsBaseConfirmOpen(true);
      } else {
        setIsReviewModalOpen(true);
      }
    } catch (err: any) {
      setIsScanning(false);
      setScanStatus("");
      toast.error(err.message || "Failed to analyze floor plan drawing");
    }
  };

  const hasFloorPlanSelected = Boolean(design.designName && design.designName.trim().length > 0);
  const hasInclusionSelected = Boolean(design.specTier);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Prompt */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/50 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs">
              2
            </span>
            <span className="text-xs uppercase tracking-wider font-bold text-emerald-400">Step 2 of 5</span>
          </div>
          <h2 className={`text-2xl font-bold mt-1 ${isLight ? "text-slate-900" : "text-white"}`}>
            Floor Plan, Inclusions &amp; Façade
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Select house type, quick search floor plan, choose inclusion specification, and customize façade.
          </p>
        </div>

        {/* Selected Plan Snapshot Badge */}
        {hasFloorPlanSelected && (
          <div
            className={`py-2 px-3.5 rounded-xl border flex items-center gap-3 self-start sm:self-center ${
              isLight ? "bg-emerald-50 border-emerald-300" : "bg-emerald-500/10 border-emerald-500/30"
            }`}
          >
            <Home className="h-4 w-4 text-emerald-500 flex-none" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-bold ${isLight ? "text-emerald-950" : "text-white"}`}>
                  {design.designName}
                </span>
                <span className="text-[10px] text-slate-400">({design.designM2} m²)</span>
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold block">
                Base: {formatAud(design.basePrice || 0)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Mode Switcher Tabs: Standard Catalogue vs Modified vs Custom */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-700/40 pb-3">
        <button
          type="button"
          onClick={() => {
            setDesignMode("standard");
            onChange({ mode: "standard", isModifiedFloorplan: false });
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
            designMode === "standard"
              ? isLight
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm"
              : isLight
              ? "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
              : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white"
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
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
            designMode === "modified"
              ? isLight
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm"
              : isLight
              ? "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
              : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span>Modified Floor Plan</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setDesignMode("custom");
            onChange({ mode: "custom_floorplan", isModifiedFloorplan: false });
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
            designMode === "custom"
              ? isLight
                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                : "bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm"
              : isLight
              ? "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
              : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white"
          }`}
        >
          🏛️ Custom Bespoke Design
        </button>
      </div>

      {/* BOX 1 & BOX 2: HOUSE TYPE & SEARCHABLE FLOORPLAN DROPDOWN */}
      <div
        className={`p-6 rounded-2xl border transition-all ${
          isLight
            ? "bg-white border-slate-200 shadow-sm"
            : "bg-slate-900/60 border-slate-800/80 backdrop-blur-md"
        }`}
      >
        {/* House Type selector */}
        <div className="space-y-2 mb-5">
          <Label className={`text-xs font-bold uppercase tracking-wider block ${isLight ? "text-slate-700" : "text-slate-300"}`}>
            1. Select House Type
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(["Single Storey", "Double Storey", "Dual Living", "Split Level", "Granny Flat"] as HousingTypeTab[]).map(
              (type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleSelectHouseType(type)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center ${
                    houseType === type
                      ? isLight
                        ? "bg-emerald-50 border-emerald-500 text-emerald-950 shadow-xs ring-1 ring-emerald-500/20"
                        : "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-sm ring-1 ring-emerald-400/30"
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

        {/* Floorplan Searchable Dropdown Combobox */}
        {designMode === "standard" && (
          <div className="space-y-2 relative" ref={dropdownRef}>
            <Label className={`text-xs font-bold uppercase tracking-wider block ${isLight ? "text-slate-700" : "text-slate-300"}`}>
              2. Select Floor Plan (Search by Typing)
            </Label>
            <div className="relative">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                placeholder={`Type to search ${houseType} floor plans (e.g. Jasper 26, Topaz, Sapphire)...`}
                value={searchQuery}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                className={`pl-10 pr-10 text-sm h-11 ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-emerald-600"
                    : "bg-slate-950/80 border-slate-800 text-white focus:border-emerald-500"
                }`}
              />
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="absolute right-3 top-3 p-0.5 text-slate-400 hover:text-slate-200"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>

            {/* Dropdown Results Menu */}
            {isDropdownOpen && (
              <div
                className={`absolute left-0 right-0 top-full mt-1.5 z-50 max-h-72 overflow-y-auto rounded-2xl border shadow-2xl backdrop-blur-xl ${
                  isLight
                    ? "bg-white/98 border-slate-300 text-slate-900 divide-y divide-slate-100"
                    : "bg-slate-950/98 border-slate-800 text-white divide-y divide-slate-800/80"
                }`}
              >
                {filteredModels.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No matching floor plans found for "{searchQuery}" in {houseType}.
                  </div>
                ) : (
                  filteredModels.map(({ row, type }) => {
                    const isSelected = design.designName?.toLowerCase() === row.name.toLowerCase();
                    const tierPrice = getTierPrice(row, design.specTier || "H2", type);
                    const planInfo = plansForDesign(row.name);

                    return (
                      <div
                        key={row.name}
                        onClick={() => handleSelectModel(row, type)}
                        className={`p-3.5 cursor-pointer transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? isLight
                              ? "bg-emerald-50/90 text-emerald-950"
                              : "bg-emerald-500/20 text-emerald-300"
                            : isLight
                            ? "hover:bg-slate-100"
                            : "hover:bg-slate-900"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold truncate">{row.name}</span>
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-500/10 text-slate-400 font-mono">
                              {row.m2} m²
                            </span>
                            {isSelected && (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-none" />
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                            <span className="flex items-center gap-1">
                              <Bed className="h-3 w-3" /> {planInfo?.beds ?? (row.m2 > 240 ? 4 : 3)} Beds
                            </span>
                            <span className="flex items-center gap-1">
                              <Bath className="h-3 w-3" /> {planInfo?.baths ?? (row.m2 > 180 ? 2 : 1)} Baths
                            </span>
                            <span className="flex items-center gap-1">
                              <Car className="h-3 w-3" /> {planInfo?.cars ?? (row.m2 > 180 ? 2 : 1)} Cars
                            </span>
                          </div>
                        </div>

                        <div className="text-right flex-none">
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">
                            Base Price
                          </span>
                          <span className={`text-sm font-mono font-bold ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
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
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl">
              <div>
                <span className="text-xs font-bold text-amber-400 block">
                  Modified Floor Plan Mode Active
                </span>
                <span className="text-[11px] text-slate-400">
                  Select a base catalogue design, then adjust room area dimensions below or scan a drawing.
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isScanning}
                  className="text-xs gap-1.5 border-amber-500/40 text-amber-300 hover:bg-amber-500/20"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {isScanning ? "Scanning PDF…" : "Scan Architectural Plan"}
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

            {/* Base Design Dropdown */}
            <div className="space-y-1.5">
              <Label className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                Base Hudson Design
              </Label>
              <div className="relative">
                <Input
                  placeholder="Select base design to modify (e.g. Jasper 26)..."
                  value={searchQuery}
                  onFocus={() => setIsDropdownOpen(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  className={`text-sm h-11 ${
                    isLight ? "bg-slate-50 border-slate-300" : "bg-slate-950/80 border-slate-800"
                  }`}
                />
              </div>
            </div>

            {/* Modified Area Dimensions Grid */}
            {hasFloorPlanSelected && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-400">Living Area (m²)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={design.areas?.livingM2 || ""}
                    onChange={(e) => handleModifiedAreaChange("livingM2", e.target.value)}
                    className="h-10 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-400">Garage Area (m²)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={design.areas?.garageM2 || ""}
                    onChange={(e) => handleModifiedAreaChange("garageM2", e.target.value)}
                    className="h-10 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-400">Alfresco (m²)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={design.areas?.alfrescoM2 || ""}
                    onChange={(e) => handleModifiedAreaChange("alfrescoM2", e.target.value)}
                    className="h-10 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-400">Porch (m²)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={design.areas?.porchM2 || ""}
                    onChange={(e) => handleModifiedAreaChange("porchM2", e.target.value)}
                    className="h-10 text-sm font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* CUSTOM FLOOR PLAN OPTIONS */}
        {designMode === "custom" && (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
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
                className={`text-sm h-11 ${
                  isLight ? "bg-slate-50 border-slate-300" : "bg-slate-950/80 border-slate-800"
                }`}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-400">Ground Living (m²)</Label>
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
                  className="h-10 text-sm font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-slate-400">Garage (m²)</Label>
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
                  className="h-10 text-sm font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-slate-400">Alfresco (m²)</Label>
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
                  className="h-10 text-sm font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-slate-400">Porch (m²)</Label>
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
                  className="h-10 text-sm font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: INCLUSION LEVEL (SMOOTHLY APPEARS ONCE FLOORPLAN SELECTED) */}
      {hasFloorPlanSelected && (
        <div
          className={`p-6 rounded-2xl border transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
            isLight
              ? "bg-white border-slate-200 shadow-sm"
              : "bg-slate-900/60 border-slate-800/80 backdrop-blur-md"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <Label className={`text-xs font-bold uppercase tracking-wider block ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                3. Select Inclusion Specification Tier
              </Label>
              <p className="text-xs text-slate-400 mt-0.5">
                Choose the standard finishes package for {design.designName}.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {INCLUSION_TIERS.map((tierDef) => {
              const isSelected = design.specTier?.includes(tierDef.shortCode) || (tierDef.shortCode === "H2" && !design.specTier);
              return (
                <div
                  key={tierDef.shortCode}
                  onClick={() => handleSelectTier(tierDef)}
                  className={`p-4 rounded-2xl border text-left cursor-pointer transition-all hover:scale-[1.01] relative flex flex-col justify-between ${
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
                      className={`absolute -top-2.5 right-4 text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full shadow-xs ${tierDef.badgeColor}`}
                    >
                      {tierDef.badge}
                    </span>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">
                        {tierDef.shortCode}
                      </span>
                      {isSelected && <Check className="h-4 w-4 text-emerald-500 stroke-[3]" />}
                    </div>

                    <h4 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                      {tierDef.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 mb-3">{tierDef.tagline}</p>

                    <ul className="space-y-1.5 text-[11px] text-slate-400 border-t border-slate-700/40 pt-2.5">
                      {tierDef.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <Check className="h-3 w-3 text-emerald-500 flex-none mt-0.5" />
                          <span className="leading-tight">{f}</span>
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

      {/* SECTION 3: FAÇADE SELECTION & RHS LIVE PREVIEW (SMOOTHLY APPEARS ONCE INCLUSION SELECTED) */}
      {hasFloorPlanSelected && hasInclusionSelected && (
        <div
          className={`p-6 rounded-2xl border transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
            isLight
              ? "bg-white border-slate-200 shadow-sm"
              : "bg-slate-900/60 border-slate-800/80 backdrop-blur-md"
          }`}
        >
          <div className="mb-4">
            <Label className={`text-xs font-bold uppercase tracking-wider block ${isLight ? "text-slate-700" : "text-slate-300"}`}>
              4. Select Façade (Filtered for {design.designName})
            </Label>
            <p className="text-xs text-slate-400 mt-0.5">
              Only showing façades engineered and certified for this specific floor plan.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LHS: Façade Dropdown Box */}
            <div className="lg:col-span-6 space-y-4">
              <div className="space-y-1.5">
                <Label className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                  Choose Façade ({suitableFacades.length} certified options)
                </Label>
                <Select
                  value={design.facadeName || (suitableFacades[0]?.name ?? "Classic")}
                  onValueChange={handleSelectFacade}
                >
                  <SelectTrigger
                    data-testid="facade-select-trigger"
                    className={`h-12 text-sm font-bold ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-emerald-600 shadow-xs"
                        : "bg-slate-950/80 border-slate-800 text-white focus:border-emerald-500"
                    }`}
                  >
                    <SelectValue placeholder="Select compatible façade…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {suitableFacades.map((facade) => (
                      <SelectItem key={facade.name} value={facade.name} className="py-2.5 cursor-pointer">
                        <div className="flex items-center justify-between w-full gap-4">
                          <span className="font-bold">{facade.name}</span>
                          <span className="text-xs font-mono font-bold text-emerald-500">
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
                className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                }`}
              >
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Selected Architectural Model
                  </span>
                  <span className={`text-sm font-extrabold ${isLight ? "text-slate-900" : "text-white"}`}>
                    {design.facadeName || "Classic"} Façade
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Full architectural elevations and brickwork included.
                  </span>
                </div>

                <div className="text-right flex-none">
                  <Badge
                    variant="outline"
                    className={`font-mono font-bold text-xs py-1 px-2.5 ${
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
            </div>

            {/* RHS: Façade Live Preview Card */}
            <div className="lg:col-span-6">
              <div
                className={`rounded-2xl border overflow-hidden shadow-lg ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-slate-800"
                }`}
              >
                <div className="relative h-56 sm:h-64 w-full bg-slate-900 overflow-hidden flex items-center justify-center">
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
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 flex items-end justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-extrabold tracking-wider text-emerald-400 block">
                        Live Architectural Preview
                      </span>
                      <h4 className="text-base font-bold text-white leading-tight">
                        {design.facadeName || "Classic"} Façade
                      </h4>
                    </div>

                    <Badge
                      className={`text-xs font-mono font-bold ${
                        (design.facadePrice || 0) > 0
                          ? "bg-cyan-500 text-slate-950"
                          : "bg-emerald-500 text-slate-950"
                      }`}
                    >
                      {(design.facadePrice || 0) > 0 ? `+${formatAud(design.facadePrice || 0)}` : "Included Standard"}
                    </Badge>
                  </div>
                </div>

                <div className="p-3.5 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Building className="h-3.5 w-3.5 text-slate-400" />
                    <span>{design.designName}</span>
                  </div>
                  <span>{design.designM2} m² Total Area</span>
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
          <span>Back to Client</span>
        </Button>

        <Button
          type="button"
          onClick={onNext}
          disabled={!hasFloorPlanSelected}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold px-8 shadow-lg shadow-emerald-500/20 gap-2 cursor-pointer h-12"
        >
          Continue to Site Costs
          <ArrowRight className="h-4 w-4" />
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
