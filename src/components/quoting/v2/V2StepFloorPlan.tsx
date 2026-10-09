import React, { useState, useMemo, useRef } from "react";
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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  getAutomatedPromotionDiscount,
} from "@/lib/quoting/quoteEngine";
import {
  identifyBaseDesignCandidate,
  analyzeModifiedFloorplanFile,
} from "@/lib/quoting/floorplanModificationDetector";
import type {
  QuoteDesignSelection,
  QuoteSelectedLineItem,
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

type HousingTypeTab = "All" | "Single Storey" | "Double Storey" | "Dual Living" | "Granny Flat";

export function V2StepFloorPlan({
  design,
  onChange,
  onAddInclusionLineItems,
  onNext,
  onPrev,
  isLight,
}: V2StepFloorPlanProps) {
  const [activeTab, setActiveTab] = useState<"standard" | "modified">(
    design.isModifiedFloorplan ? "modified" : "standard"
  );
  const [typeFilter, setTypeFilter] = useState<HousingTypeTab>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals for modified plan analysis
  const [pendingCandidate, setPendingCandidate] = useState<BaseDesignCandidate | null>(null);
  const [isBaseConfirmOpen, setIsBaseConfirmOpen] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState<PlanModificationAnalysis | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // All standard price rows grouped
  const allModels = useMemo(() => {
    const list: { row: PriceRow; type: "Single Storey" | "Double Storey" | "Dual Living" | "Granny Flat" | "Split Level" }[] = [];
    SINGLE_STOREY_PRICES.forEach((r) => list.push({ row: r, type: "Single Storey" }));
    DOUBLE_STOREY_PRICES.forEach((r) => list.push({ row: r, type: "Double Storey" }));
    DUAL_OC_PRICES.forEach((r) => list.push({ row: r, type: "Dual Living" }));
    SPLIT_LEVEL_PRICES.forEach((r) => list.push({ row: r, type: "Split Level" }));

    // Granny Flats
    list.push(
      { row: { name: "Acacia 60", m2: 60, h1: 154000, h2: 169000, h3: 189000 }, type: "Granny Flat" },
      { row: { name: "Banksia 60", m2: 60, h1: 156000, h2: 171000, h3: 192000 }, type: "Granny Flat" }
    );
    return list;
  }, []);

  // Filtered designs
  const filteredModels = useMemo(() => {
    return allModels.filter(({ row, type }) => {
      if (typeFilter !== "All" && type !== typeFilter) {
        return false;
      }
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase().trim();
        return row.name.toLowerCase().includes(query) || type.toLowerCase().includes(query);
      }
      return true;
    });
  }, [allModels, typeFilter, searchQuery]);

  // Handle standard design selection
  const handleSelectModel = (model: PriceRow, housingType: string, autoShift: boolean = true) => {
    const tier = design.specTier || "H2";
    const basePrice = getTierPrice(model, tier, housingType);
    const stdAreas = getStandardAreaBreakdown(model.name, housingType, model.m2);
    const plans = plansForDesign(model.name);
    const planRec = plans[0];

    onChange({
      designName: model.name,
      housingType: housingType as any,
      designM2: model.m2,
      standardDesignM2: model.m2,
      standardBasePrice: basePrice,
      basePrice,
      standardAreas: stdAreas,
      modifiedAreas: { ...stdAreas },
      isModifiedFloorplan: false,
      modifiedDesignM2: 0,
      promotionsDiscount: getAutomatedPromotionDiscount(model.m2),
      floorplanUrl: planRec?.url || "",
      beds: planRec?.beds || "4",
      baths: planRec?.baths || "2",
      cars: planRec?.cars || "2",
      widthM: planRec?.frontage || "14.0m",
    });

    toast.success(`Selected ${model.name} (${model.m2} m²) — $${basePrice.toLocaleString()}`);
    if (autoShift) {
      setTimeout(() => {
        onNext();
      }, 350);
    }
  };

  // Modified file upload handling
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanStatus("Scanning title block & floorplan layout...");
    try {
      const candidate = await identifyBaseDesignCandidate(file, design.designName, design.housingType);
      setPendingCandidate(candidate);
      setIsBaseConfirmOpen(true);
    } catch (err: any) {
      console.error("Scan failed:", err);
      toast.error(err?.message || "Could not analyze floorplan file.");
    } finally {
      setIsScanning(false);
      setScanStatus("");
      e.target.value = "";
    }
  };

  const handleApplyModifiedPlan = (approved: PlanModificationAnalysis) => {
    const stdM2 = approved.standardTotalM2;
    const stdAreas = getStandardAreaBreakdown(approved.baseDesignName, approved.housingType, stdM2);

    const updatedModifiedAreas: Partial<FloorplanAreaBreakdown> = {
      ...stdAreas,
      ...(design.modifiedAreas || {}),
    };

    for (const delta of approved.areaDeltas) {
      if (delta.accepted) {
        (updatedModifiedAreas as any)[delta.zoneKey] = delta.modifiedM2;
      }
    }

    const effectiveHousingType = approved.housingType;
    const modelName = approved.baseDesignName;
    const matchedModel = allModels.find((m) => m.row.name === modelName);
    const stdPrice = matchedModel
      ? getTierPrice(matchedModel.row, design.specTier, effectiveHousingType)
      : design.standardBasePrice || design.basePrice;

    const tempDesign: QuoteDesignSelection = {
      ...design,
      mode: "modified",
      housingType: effectiveHousingType,
      designName: modelName,
      standardDesignM2: stdM2,
      standardBasePrice: stdPrice,
      standardAreas: stdAreas,
      modifiedAreas: updatedModifiedAreas,
      isModifiedFloorplan: true,
    };

    const modCalc = calculateModifiedFloorplanPricing(tempDesign);

    onChange({
      mode: "modified",
      housingType: effectiveHousingType,
      designName: modelName,
      standardDesignM2: stdM2,
      standardBasePrice: stdPrice,
      standardAreas: stdAreas,
      modifiedAreas: updatedModifiedAreas,
      isModifiedFloorplan: true,
      modifiedDesignM2: modCalc.modifiedTotalM2,
      basePrice: stdPrice,
      promotionsDiscount: getAutomatedPromotionDiscount(modCalc.modifiedTotalM2),
      floorplanUrl: approved.floorplanDataUrl || design.floorplanUrl,
    });

    if (approved.inclusionUpgrades && approved.inclusionUpgrades.length > 0 && onAddInclusionLineItems) {
      const newLineItems: QuoteSelectedLineItem[] = approved.inclusionUpgrades.map((upg, idx) => ({
        id: `mod_${upg.id}_${Date.now()}_${idx}`,
        catalogueItemId: upg.id,
        category: (upg.category as any) || "floorplan_extensions",
        name: upg.name,
        description: upg.description,
        unitType: "fixed",
        unitRate: upg.unitPrice,
        quantity: 1,
        subtotal: upg.unitPrice,
        isIncluded: true,
        isClientSelectable: true,
        clientSelected: true,
      }));
      onAddInclusionLineItems(newLineItems);
    }

    toast.success(
      `Applied Modified Plan for ${modelName}! Total: ${modCalc.modifiedTotalM2} m² (+${formatAud(modCalc.totalCostAdjustment)})`
    );
    setIsReviewModalOpen(false);
    onNext();
  };

  // Quick manual area adjusters (+/- 1m²)
  const handleAdjustArea = (zoneKey: "livingM2" | "garageM2" | "alfrescoM2" | "porchM2", delta: number) => {
    const stdAreas = design.standardAreas || getStandardAreaBreakdown(design.designName, design.housingType, design.designM2);
    const currentAreas = design.modifiedAreas || { ...stdAreas };
    const currentVal = Number((currentAreas as any)[zoneKey] || (stdAreas as any)[zoneKey] || 0);
    const nextVal = Math.max(0, Math.round((currentVal + delta) * 100) / 100);

    const nextModifiedAreas = {
      ...currentAreas,
      [zoneKey]: nextVal,
    };

    const tempDesign: QuoteDesignSelection = {
      ...design,
      isModifiedFloorplan: true,
      standardDesignM2: design.standardDesignM2 || design.designM2,
      standardAreas: stdAreas,
      modifiedAreas: nextModifiedAreas,
    };

    const pricing = calculateModifiedFloorplanPricing(tempDesign);

    onChange({
      isModifiedFloorplan: true,
      standardDesignM2: design.standardDesignM2 || design.designM2,
      standardAreas: stdAreas,
      modifiedAreas: nextModifiedAreas,
      modifiedDesignM2: pricing.modifiedTotalM2,
      promotionsDiscount: getAutomatedPromotionDiscount(pricing.modifiedTotalM2),
    });
  };

  const currentStd = design.standardAreas || getStandardAreaBreakdown(design.designName, design.housingType, design.designM2);
  const currentMod = design.modifiedAreas || { ...currentStd };

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
            Which house design are we quoting?
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Pick from the Hudson Homes master collection or upload an altered plan to auto-detect modifications.
          </p>
        </div>

        {/* Standard vs Modified Mode Switcher */}
        <div className={`flex rounded-xl p-1 border ${isLight ? "bg-slate-100 border-slate-200" : "bg-slate-900 border-slate-800"}`}>
          <button
            type="button"
            onClick={() => setActiveTab("standard")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "standard"
                ? isLight
                  ? "bg-white text-slate-900 shadow-xs"
                  : "bg-slate-800 text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Standard Collection
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("modified")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === "modified"
                ? isLight
                  ? "bg-emerald-100 text-emerald-900 font-bold shadow-xs border border-emerald-300"
                  : "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="h-3 w-3 text-amber-400" />
            Modified Plan Engine
          </button>
        </div>
      </div>

      {/* Selected Design Banner (if chosen) */}
      {design.designName && (
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isLight
              ? "bg-emerald-50/70 border-emerald-200"
              : "bg-emerald-950/20 border-emerald-500/30"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-none">
              <Home className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-base font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                  {design.designName}
                </span>
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px]">
                  {design.housingType}
                </Badge>
                {design.isModifiedFloorplan && (
                  <Badge className="bg-amber-500 text-slate-950 text-[10px] font-bold">
                    Modified ({design.modifiedDesignM2 || design.designM2} m²)
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Size: {design.isModifiedFloorplan ? `${design.modifiedDesignM2 || design.designM2} m²` : `${design.designM2} m²`} • Beds: {design.beds || 4} • Baths: {design.baths || 2} • Cars: {design.cars || 2}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Base Price</span>
              <span className={`text-base font-bold ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
                {formatAud(design.basePrice || 0)}
              </span>
            </div>
            <Button
              size="sm"
              onClick={onNext}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs gap-1.5 h-9"
            >
              Continue <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* TAB 1: STANDARD COLLECTION */}
      {activeTab === "standard" && (
        <div className="space-y-4">
          {/* Housing Type Filters & Search */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="flex flex-wrap gap-1.5">
              {(["All", "Single Storey", "Double Storey", "Dual Living", "Granny Flat"] as HousingTypeTab[]).map(
                (type) => (
                  <Button
                    key={type}
                    type="button"
                    variant={typeFilter === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTypeFilter(type)}
                    className={`text-xs h-8 ${
                      typeFilter === type
                        ? isLight
                          ? "bg-slate-900 text-white"
                          : "bg-emerald-500 text-slate-950 font-bold"
                        : isLight
                        ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        : "border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {type}
                  </Button>
                )
              )}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search design name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-9 text-xs h-9 ${
                  isLight
                    ? "bg-white border-slate-300 text-slate-900"
                    : "bg-slate-950/80 border-slate-800 text-white"
                }`}
              />
            </div>
          </div>

          {/* Grid of Designs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[520px] overflow-y-auto pr-1 scrollbar-thin">
            {filteredModels.map(({ row, type }) => {
              const isSelected = design.designName?.toLowerCase() === row.name.toLowerCase();
              const price = getTierPrice(row, design.specTier || "H2", type);
              const plans = plansForDesign(row.name);
              const plan = plans[0];

              return (
                <div
                  key={row.name}
                  onClick={() => handleSelectModel(row, type, true)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all hover:scale-[1.01] ${
                    isSelected
                      ? isLight
                        ? "bg-emerald-50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
                        : "bg-emerald-950/40 border-emerald-400 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-400"
                      : isLight
                      ? "bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50 shadow-xs"
                      : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <div>
                      <h4 className={`text-sm font-bold truncate ${isLight ? "text-slate-900" : "text-white"}`}>
                        {row.name}
                      </h4>
                      <span className="text-[10px] text-slate-400">{type}</span>
                    </div>
                    {isSelected ? (
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center flex-none">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    ) : (
                      <span className="text-xs font-mono font-bold text-slate-400">
                        {row.m2} m²
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-3 pt-1 border-t border-slate-700/20">
                    <span className="flex items-center gap-1">
                      <Bed className="h-3 w-3 text-slate-400" /> {plan?.beds || 4}
                    </span>
                    <span className="flex items-center gap-1">
                      <Bath className="h-3 w-3 text-slate-400" /> {plan?.baths || 2}
                    </span>
                    <span className="flex items-center gap-1">
                      <Car className="h-3 w-3 text-slate-400" /> {plan?.cars || 2}
                    </span>
                    {plan?.frontage && (
                      <span className="flex items-center gap-1 text-[10px]">
                        {plan.frontage}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400 uppercase">From</span>
                    <span className={`text-xs font-bold font-mono ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
                      {formatAud(price)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: MODIFIED PLAN ENGINE AUTOMATION */}
      {activeTab === "modified" && (
        <div className="space-y-6">
          {/* AI Modified Plan Dropzone */}
          <div
            className={`p-8 rounded-2xl border-2 border-dashed text-center transition-all ${
              isLight
                ? "bg-slate-50 border-emerald-300 hover:bg-emerald-50/50"
                : "bg-slate-900/40 border-emerald-500/40 hover:bg-emerald-950/20"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/*"
              onChange={handleFileChange}
              disabled={isScanning}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-3">
              <Upload className="h-6 w-6" />
            </div>
            <h3 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
              {isScanning ? "Analyzing Modified Floorplan..." : "Drop Modified Architectural Plan (PDF / Image)"}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
              {scanStatus ||
                "Our automated vision engine reads the sheet title block, matches the base Hudson model, and calculates area & fixture deltas."}
            </p>

            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs gap-2 px-6"
            >
              <Upload className="h-3.5 w-3.5" />
              {isScanning ? "Processing..." : "Select Architectural PDF / Image"}
            </Button>
          </div>

          {/* Quick Manual Area Adjusters */}
          <div
            className={`p-6 rounded-2xl border ${
              isLight
                ? "bg-white border-slate-200 shadow-sm"
                : "bg-slate-900/60 border-slate-800/80"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Maximize2 className="h-4 w-4 text-cyan-400" />
                <h3 className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                  Interactive Room Area Adjuster (+/- m²)
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Standard: {design.standardDesignM2 || design.designM2} m² ➔ Modified:{" "}
                <span className="text-emerald-400 font-bold">
                  {design.modifiedDesignM2 || design.designM2} m²
                </span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Living Area */}
              <div className={`p-4 rounded-xl border ${isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"}`}>
                <span className="text-xs font-semibold text-slate-300 block mb-1">Living Area</span>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold font-mono text-emerald-400">
                    {currentMod.livingM2 || currentMod.groundLivingM2 || 135} m²
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 text-xs border-slate-700"
                      onClick={() => handleAdjustArea("livingM2", -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 text-xs border-slate-700"
                      onClick={() => handleAdjustArea("livingM2", 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Std: {currentStd.livingM2 || currentStd.groundLivingM2 || 135} m²
                </span>
              </div>

              {/* Garage Area */}
              <div className={`p-4 rounded-xl border ${isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"}`}>
                <span className="text-xs font-semibold text-slate-300 block mb-1">Double Garage</span>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold font-mono text-emerald-400">
                    {currentMod.garageM2 || 34} m²
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 text-xs border-slate-700"
                      onClick={() => handleAdjustArea("garageM2", -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 text-xs border-slate-700"
                      onClick={() => handleAdjustArea("garageM2", 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Std: {currentStd.garageM2 || 34} m²
                </span>
              </div>

              {/* Alfresco Area */}
              <div className={`p-4 rounded-xl border ${isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"}`}>
                <span className="text-xs font-semibold text-slate-300 block mb-1">Outdoor Alfresco</span>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold font-mono text-emerald-400">
                    {currentMod.alfrescoM2 || 12} m²
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 text-xs border-slate-700"
                      onClick={() => handleAdjustArea("alfrescoM2", -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 text-xs border-slate-700"
                      onClick={() => handleAdjustArea("alfrescoM2", 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Std: {currentStd.alfrescoM2 || 12} m²
                </span>
              </div>

              {/* Porch Area */}
              <div className={`p-4 rounded-xl border ${isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"}`}>
                <span className="text-xs font-semibold text-slate-300 block mb-1">Entry Porch</span>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold font-mono text-emerald-400">
                    {currentMod.porchM2 || 3} m²
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 text-xs border-slate-700"
                      onClick={() => handleAdjustArea("porchM2", -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 text-xs border-slate-700"
                      onClick={() => handleAdjustArea("porchM2", 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Std: {currentStd.porchM2 || 3} m²
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
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
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Client Details
        </Button>

        <Button
          type="button"
          onClick={onNext}
          disabled={!design.designName}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold px-8 shadow-lg shadow-emerald-500/20 gap-2 cursor-pointer disabled:opacity-50"
        >
          Continue to Inclusions
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Modals for Floorplan Detection */}
      {pendingCandidate && (
        <BaseDesignConfirmationModal
          open={isBaseConfirmOpen}
          candidate={pendingCandidate}
          onOpenChange={setIsBaseConfirmOpen}
          onConfirm={async (confirmed) => {
            setIsBaseConfirmOpen(false);
            if (confirmed.file) {
              setIsScanning(true);
              setScanStatus("Analyzing modified plan geometry & room schedules...");
              try {
                const analysis = await analyzeModifiedFloorplanFile(
                  confirmed.file,
                  confirmed.designName,
                  confirmed.housingType,
                  confirmed.standardDesignM2,
                  confirmed.standardBasePrice,
                  confirmed.standardAreas
                );
                setPendingAnalysis(analysis);
                setIsReviewModalOpen(true);
              } catch (err: any) {
                toast.error("Deep analysis failed: " + err?.message);
              } finally {
                setIsScanning(false);
                setScanStatus("");
              }
            }
          }}
          onSelectDifferent={(newCandidate) => {
            setPendingCandidate(newCandidate);
          }}
        />
      )}

      {pendingAnalysis && (
        <ModifiedPlanReviewModal
          open={isReviewModalOpen}
          analysis={pendingAnalysis}
          onOpenChange={setIsReviewModalOpen}
          onApply={handleApplyModifiedPlan}
        />
      )}
    </div>
  );
}
