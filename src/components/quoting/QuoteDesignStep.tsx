import React, { useState, useRef } from "react";
import {
  Home,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Upload,
  CheckCircle2,
  Tag,
  PenTool,
  Trees,
  Car,
  ExternalLink,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ModifiedFloorplanModal } from "./ModifiedFloorplanModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatAud } from "@/lib/pricing";
import { landscapingPriceFor } from "@/lib/landscaping";
import {
  DOUBLE_STOREY_PRICES,
  DUAL_OC_PRICES,
  SINGLE_STOREY_PRICES,
  SPLIT_LEVEL_PRICES,
  type PriceRow,
} from "@/lib/pricelist.data";
import { plansForDesign } from "@/components/flyer/floorplans";
import {
  calculateCustomFloorplanPrice,
  calculateCustomTotalM2,
  getAutomatedPromotionDiscount,
} from "@/lib/quoting/quoteEngine";
import type { InclusionTier, QuoteDesignSelection } from "@/lib/quoting/quoteTypes";

interface QuoteDesignStepProps {
  design: QuoteDesignSelection;
  onChange: (patch: Partial<QuoteDesignSelection>) => void;
}

const HOUSING_TYPE_PRICES: Record<string, PriceRow[]> = {
  "Single Storey": SINGLE_STOREY_PRICES,
  "Double Storey": DOUBLE_STOREY_PRICES,
  "Split Level": SPLIT_LEVEL_PRICES,
  "Dual Living": DUAL_OC_PRICES,
};

// Clean titles for Inclusions without paragraph descriptions to save space
export const INCLUSION_TIERS: { id: InclusionTier; label: string; tag: string }[] = [
  {
    id: "H1 Smart Inclusions",
    label: "H1 Smart Inclusions",
    tag: "Essential Value",
  },
  {
    id: "H2 Design Inclusions",
    label: "H2 Design Inclusions",
    tag: "Most Popular",
  },
  {
    id: "H3 Luxury Inclusions",
    label: "H3 Luxury Inclusions",
    tag: "Ultimate Luxury",
  },
];

// Exact facade lists and pricing from official Hudson Homes Price Lists (Single, Double, Split, Dual)
export const HOUSING_FACADES: Record<string, { name: string; uplift: number }[]> = {
  "Single Storey": [
    { name: "Classic", uplift: 0 },
    { name: "Classic Plus", uplift: 4700 },
    { name: "Avoca", uplift: 7200 },
    { name: "Bayside", uplift: 7200 },
    { name: "Breeze", uplift: 7200 },
    { name: "Crest", uplift: 7200 },
    { name: "Executive", uplift: 7200 },
    { name: "Harmony", uplift: 7200 },
    { name: "Banksia", uplift: 9900 },
    { name: "Contemporary", uplift: 9900 },
    { name: "Eden", uplift: 9900 },
    { name: "Infinity", uplift: 9900 },
    { name: "Majestic", uplift: 9900 },
    { name: "Serenity", uplift: 9900 },
    { name: "Elite", uplift: 15300 },
    { name: "Hamptons", uplift: 15300 },
    { name: "Modern Coastal", uplift: 15300 },
    { name: "Riviera", uplift: 15300 },
    { name: "Savoy", uplift: 15300 },
    { name: "Aspen", uplift: 21300 },
    { name: "Chateaux", uplift: 21300 },
    { name: "Coastal", uplift: 21300 },
    { name: "Hillsdale", uplift: 21300 },
    { name: "Pavillion", uplift: 21300 },
    { name: "Sovereign", uplift: 21300 },
    { name: "Statesman", uplift: 21300 },
    { name: "Avalon", uplift: 25900 },
    { name: "Havanna", uplift: 25900 },
    { name: "Newport", uplift: 25900 },
    { name: "Imperial", uplift: 28400 },
    { name: "Merlot", uplift: 28400 },
    { name: "Modern Barn", uplift: 28400 },
    { name: "Modern Box", uplift: 28400 },
    { name: "Modern Farmhouse Option B", uplift: 28400 },
    { name: "Nuvo", uplift: 28400 },
    { name: "Regal", uplift: 28400 },
    { name: "Veinna", uplift: 28400 },
    { name: "Vogue", uplift: 28400 },
    { name: "Vibe", uplift: 37700 },
    { name: "Visage", uplift: 37700 },
  ],
  "Double Storey": [
    { name: "Classic", uplift: 0 },
    { name: "Classic Plus", uplift: 5900 },
    { name: "Breeze", uplift: 12300 },
    { name: "Deco", uplift: 12300 },
    { name: "Oxford", uplift: 12300 },
    { name: "Windsor", uplift: 12300 },
    { name: "Allure", uplift: 14000 },
    { name: "Novare", uplift: 14000 },
    { name: "Contemporary", uplift: 16300 },
    { name: "Majestic", uplift: 16300 },
    { name: "Mantra", uplift: 16300 },
    { name: "Marina", uplift: 16300 },
    { name: "Ashton", uplift: 24700 },
    { name: "Mondo", uplift: 24700 },
    { name: "Vista", uplift: 24700 },
    { name: "Cambridge", uplift: 24800 },
    { name: "Chateaux", uplift: 24800 },
    { name: "Monash", uplift: 24800 },
    { name: "Hamptons", uplift: 27400 },
    { name: "Aspen", uplift: 32700 },
    { name: "Madison", uplift: 32700 },
    { name: "Mocha Hamptons", uplift: 32700 },
    { name: "Modern Box", uplift: 32700 },
    { name: "Modern Coastal", uplift: 32700 },
    { name: "Statesman", uplift: 32700 },
    { name: "Modern Barn", uplift: 34900 },
    { name: "Chateaux (with Balcony)", uplift: 38900 },
    { name: "Delta", uplift: 38900 },
    { name: "Hamptons (with Balcony)", uplift: 38900 },
    { name: "Riviera", uplift: 38900 },
    { name: "Sierra", uplift: 38900 },
    { name: "Deluxe", uplift: 39000 },
    { name: "Grande", uplift: 39000 },
    { name: "Royale", uplift: 39000 },
    { name: "Saville", uplift: 39000 },
    { name: "Modern Farmhouse Option B", uplift: 41900 },
    { name: "Mocha Hamptons (with Balcony)", uplift: 44400 },
    { name: "Modern Classical", uplift: 50900 },
    { name: "Ascot", uplift: 53400 },
    { name: "Centro", uplift: 53400 },
    { name: "Como", uplift: 53400 },
    { name: "Flair", uplift: 53400 },
    { name: "Meridian", uplift: 53400 },
    { name: "Soho", uplift: 53400 },
    { name: "Vista (with Balcony)", uplift: 53400 },
    { name: "Metro", uplift: 53500 },
    { name: "Nuvo", uplift: 53500 },
    { name: "Regal", uplift: 53500 },
    { name: "Tempo", uplift: 53500 },
    { name: "Vogue", uplift: 53500 },
    { name: "Reed", uplift: 86100 },
    { name: "Clarence", uplift: 89200 },
  ],
  "Split Level": [
    { name: "Classic", uplift: 0 },
    { name: "Classic Plus", uplift: 5200 },
    { name: "Contemporary", uplift: 14500 },
    { name: "Hamptons", uplift: 22800 },
    { name: "Modern Coastal", uplift: 22800 },
    { name: "Modern Barn", uplift: 29500 },
    { name: "Vogue", uplift: 38900 },
  ],
  "Dual Living": [
    { name: "Classic", uplift: 0 },
    { name: "Classic Plus", uplift: 6500 },
    { name: "Madison", uplift: 18500 },
    { name: "Marina", uplift: 22000 },
    { name: "Vista", uplift: 29500 },
    { name: "Brixton", uplift: 80900 },
    { name: "Modena", uplift: 86100 },
    { name: "Cranbrook", uplift: 96400 },
    { name: "Bronte", uplift: 105600 },
    { name: "Woodlands", uplift: 105600 },
    { name: "Mayfield", uplift: 113800 },
  ],
};

export function QuoteDesignStep({ design, onChange }: QuoteDesignStepProps) {
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const models = HOUSING_TYPE_PRICES[design.housingType] || SINGLE_STOREY_PRICES;
  const currentModel = models.find((m) => m.name === design.designName);

  const customSpec = design.customSpec || {
    groundLivingM2: 0,
    firstLivingM2: 0,
    garageM2: 0,
    alfrescoM2: 0,
    porchM2: 0,
    balconyM2: 0,
    storeys: "single" as const,
    groundRateM2: 1580,
    upperRateM2: 2050,
    ancillaryRateM2: 1050,
    scaffoldingAllowance: 8500,
  };

  const isDouble =
    design.mode === "custom_floorplan"
      ? customSpec.storeys === "double"
      : design.housingType === "Double Storey" || design.housingType === "double";

  const standardPlans = design.designName ? plansForDesign(design.designName) : [];
  const standardFloorplanUrl = standardPlans[0]?.url || "";
  const activeFloorplanUrl = design.floorplanUrl || standardFloorplanUrl;

  const suitableFacades = HOUSING_FACADES[design.housingType] || HOUSING_FACADES["Single Storey"];

  const getTierPrice = (
    model: PriceRow | undefined,
    tier: InclusionTier,
    housingType: string = design.housingType,
  ): number => {
    if (!model) return 0;
    let raw = 0;
    if (tier === "H3 Luxury Inclusions" || tier === "H3 Inclusions (2025)") {
      raw = model.h3 || model.hbs || 0;
    } else if (tier === "H2 Design Inclusions" || tier === "H2 Inclusions (2025)") {
      raw = model.h2 || model.hbs || 0;
    } else if (tier === "H1 Smart Inclusions" || tier === "H1 Inclusions (2025)") {
      raw = model.h1 || model.hbs || 0;
    } else {
      raw = model.hbs || 0;
    }

    // For Duplex and Dual Occ plans:
    // They are already priced with the discount in the base price, so increase the base price
    // by that discount amount + $5,000 extra buffer (so every design has a $5k buffer).
    if (housingType === "Dual Living" || model.name.includes(" - TD") || model.name.includes(" - SD")) {
      const discount = getAutomatedPromotionDiscount(model.m2);
      return raw + discount + 5000;
    }

    return raw;
  };

  const handleHousingTypeChange = (type: QuoteDesignSelection["housingType"]) => {
    onChange({
      housingType: type,
      designName: "",
      designM2: 0,
      basePrice: 0,
      facadeName: "",
      facadePrice: 0,
      isCustomFacade: false,
      promotionsDiscount: 0,
      floorplanUrl: "",
      beds: "",
      baths: "",
      cars: "",
      widthM: "",
      lengthM: "",
    });
  };

  const handleDesignModelChange = (modelName: string) => {
    const m = models.find((x) => x.name === modelName);
    if (!m) return;

    const plans = plansForDesign(m.name);
    const floorplanUrl = plans[0]?.url || "";
    const basePrice = getTierPrice(m, design.specTier, design.housingType);
    const defaultFacade = suitableFacades[0] || { name: "Classic", uplift: 0 };
    const autoDiscount = getAutomatedPromotionDiscount(m.m2);

    onChange({
      designName: m.name,
      designM2: m.m2,
      basePrice,
      facadeName: design.facadeName || defaultFacade.name,
      facadePrice: design.facadeName ? design.facadePrice : defaultFacade.uplift,
      promotionsDiscount: autoDiscount,
      promotionName: design.promotionName || "Hudson Special Builder Promotion",
      floorplanUrl,
      beds: plans[0]?.beds || "4",
      baths: plans[0]?.baths || "2",
      cars: plans[0]?.cars || "2",
      widthM: plans[0]?.width || "14.0m",
      lengthM: plans[0]?.depth || "22.0m",
    });
  };

  const handleTierChange = (tier: InclusionTier) => {
    const basePrice = currentModel ? getTierPrice(currentModel, tier, design.housingType) : 0;
    onChange({ specTier: tier, basePrice });
  };

  const handleFacadeSelect = (facadeName: string) => {
    if (facadeName === "CUSTOM_FACADE") {
      onChange({
        isCustomFacade: true,
        facadeName: "Custom Architectural Facade",
        facadePrice: design.facadePrice || 5000,
      });
    } else {
      const match = suitableFacades.find((f) => f.name === facadeName);
      onChange({
        isCustomFacade: false,
        facadeName,
        facadePrice: match ? match.uplift : 0,
      });
    }
  };

  const handleCustomFloorplanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onChange({ floorplanUrl: url });
    }
  };

  const handleCustomSpecChange = (field: keyof typeof customSpec, val: any) => {
    const updated = { ...customSpec, [field]: val };
    const calculatedBase = calculateCustomFloorplanPrice(updated);
    const totalM2 = calculateCustomTotalM2(updated);
    const autoDiscount = getAutomatedPromotionDiscount(totalM2);
    onChange({
      customSpec: updated,
      basePrice: calculatedBase,
      designM2: totalM2,
      promotionsDiscount: autoDiscount,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">
              Step 2: House Design &amp; Architectural Specifications
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Select a Hudson home design and tailored inclusions, or calculate custom floorplan dimensions.
          </p>
        </div>

        {/* 2 Design Mode Tabs */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start">
          {[
            { id: "standard", label: "Standard Design" },
            { id: "custom_floorplan", label: "Custom Floorplan (m²)" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange({ mode: tab.id as any })}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                design.mode === tab.id
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-md font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* MODE 1: STANDARD HUDSON DESIGN */}
      {design.mode === "standard" && (
        <div className="space-y-6">
          {/* Housing Type & Model Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Housing Type</Label>
              <Select
                value={design.housingType}
                onValueChange={(v: any) => handleHousingTypeChange(v)}
              >
                <SelectTrigger className="border-slate-800 bg-slate-950/70 text-xs text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                  <SelectItem value="Single Storey">Single Storey</SelectItem>
                  <SelectItem value="Double Storey">Double Storey</SelectItem>
                  <SelectItem value="Split Level">Split Level</SelectItem>
                  <SelectItem value="Dual Living">Dual Living / Duplex</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Home Design Model</Label>
              <Select
                value={design.designName || "UNSELECTED"}
                onValueChange={(v) => v !== "UNSELECTED" && handleDesignModelChange(v)}
              >
                <SelectTrigger className={`border-slate-800 text-xs ${!design.designName ? "bg-slate-950/90 text-amber-400 border-amber-500/40 font-semibold" : "bg-slate-950/70 text-slate-200"}`}>
                  <SelectValue placeholder="Select a Home Design..." />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-900 text-slate-200 max-h-64">
                  <SelectItem value="UNSELECTED" disabled>
                    -- Select a Home Design Model --
                  </SelectItem>
                  {models.map((m) => (
                    <SelectItem key={m.name} value={m.name}>
                      {m.name} — {m.m2} m² ({formatAud(getTierPrice(m, design.specTier))})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Total Floor Area</Label>
              <Input
                readOnly
                value={
                  design.designM2 > 0
                    ? `${design.designM2} m² (${(design.designM2 * 0.107639).toFixed(1)} sq)`
                    : "— Select design model —"
                }
                className="border-slate-800 bg-slate-950/50 text-xs text-slate-400 cursor-not-allowed font-medium"
              />
            </div>
          </div>

          {/* Inclusion Tier Range: Simplified Clean Titles */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Inclusion Range (H1, H2, H3 Set Pricing)
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {INCLUSION_TIERS.map((tier) => {
                const isSelected =
                  design.specTier === tier.id ||
                  (tier.id === "H1 Smart Inclusions" && design.specTier === "H1 Inclusions (2025)") ||
                  (tier.id === "H2 Design Inclusions" && design.specTier === "H2 Inclusions (2025)") ||
                  (tier.id === "H3 Luxury Inclusions" && design.specTier === "H3 Inclusions (2025)");
                const tierPrice = getTierPrice(currentModel, tier.id);
                return (
                  <div
                    key={tier.id}
                    onClick={() => handleTierChange(tier.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/40 shadow-lg"
                        : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-white">{tier.label}</span>
                        <span className="ml-2 text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {tier.tag}
                        </span>
                      </div>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-slate-400">Base House Price:</span>
                      <span className="font-bold text-emerald-400 font-mono">
                        {currentModel ? formatAud(tierPrice) : "—"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* External Site Packages: Turnkey Landscaping & Exposed Agg Driveway (Mutually Exclusive) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Option 1: Complete Turnkey Landscaping Package */}
              <div
                onClick={() => {
                  const next = !design.landscapingSelected;
                  const size = design.landscapingLandSize || 450;
                  const price = next ? landscapingPriceFor(size, design.housingType, design.designName) : 0;
                  onChange({
                    landscapingSelected: next,
                    landscapingLandSize: size,
                    landscapingCost: price,
                    // Deselect driveway if landscaping is chosen
                    ...(next ? { exposedDrivewaySelected: false, exposedDrivewayCost: 0 } : {}),
                  });
                }}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                  design.landscapingSelected
                    ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/40 shadow-md"
                    : "border-slate-800 bg-slate-950/70 hover:border-slate-700"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white flex items-center gap-1.5">
                      <Trees className="h-4 w-4 text-emerald-400" />
                      Complete Turnkey Landscaping Package
                    </span>
                    {design.landscapingSelected ? (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                        <Check className="h-3 w-3" /> Selected
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        Optional
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Includes Turf &amp; Garden Beds, Treated Timber Perimeter Fencing &amp; Return Gate, Exposed Aggregate Concrete Driveway &amp; Path, Clothesline, and Rendered Letterbox.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3">
                  <div
                    className="space-y-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Label className="text-[10px] text-slate-400 block">Lot / Land Size:</Label>
                    <Select
                      value={String(design.landscapingLandSize || 450)}
                      onValueChange={(val) => {
                        const size = Number(val);
                        const price = landscapingPriceFor(size, design.housingType, design.designName);
                        onChange({
                          landscapingSelected: true,
                          landscapingLandSize: size,
                          landscapingCost: price,
                          exposedDrivewaySelected: false,
                          exposedDrivewayCost: 0,
                        });
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs border-slate-800 bg-slate-900 text-slate-200 w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                        <SelectItem value="300">Up to 300 m² Lot</SelectItem>
                        <SelectItem value="450">Up to 450 m² Lot</SelectItem>
                        <SelectItem value="600">Up to 600 m² Lot</SelectItem>
                        <SelectItem value="700">Up to 700 m² Lot</SelectItem>
                        <SelectItem value="800">Up to 800 m² Lot</SelectItem>
                        <SelectItem value="900">Up to 900 m² Lot</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="text-right pl-2">
                    <span className="text-[10px] text-slate-400 block">Package Total:</span>
                    <span className="font-extrabold text-emerald-400 font-mono text-sm block">
                      +{formatAud(landscapingPriceFor(design.landscapingLandSize || 450, design.housingType, design.designName))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Option 2: Exposed Agg Driveway Only */}
              <div
                onClick={() => {
                  const next = !design.exposedDrivewaySelected;
                  const m2 = design.exposedDrivewayM2 || 55;
                  const price = next ? Math.round(m2 * 230) : 0;
                  onChange({
                    exposedDrivewaySelected: next,
                    exposedDrivewayM2: m2,
                    exposedDrivewayCost: price,
                    // Deselect landscaping if driveway is chosen
                    ...(next ? { landscapingSelected: false, landscapingCost: 0 } : {}),
                  });
                }}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                  design.exposedDrivewaySelected
                    ? "border-cyan-500 bg-cyan-950/20 ring-1 ring-cyan-500/40 shadow-md"
                    : "border-slate-800 bg-slate-950/70 hover:border-slate-700"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white flex items-center gap-1.5">
                      <Car className="h-4 w-4 text-cyan-400" />
                      Exposed Agg Driveway Only ($230/m²)
                    </span>
                    {design.exposedDrivewaySelected ? (
                      <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                        <Check className="h-3 w-3" /> Selected
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        Optional
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Exposed aggregate concrete paving from road crossover to double garage and front entry porch ($230/m² × {design.exposedDrivewayM2 || 55} m²).
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3">
                  <div
                    className="space-y-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Label className="text-[10px] text-slate-400 block">Driveway Area (m²):</Label>
                    <div className="flex items-center gap-1.5 w-28">
                      <Input
                        type="number"
                        min="1"
                        max="300"
                        value={design.exposedDrivewayM2 ?? 55}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 55;
                          onChange({
                            exposedDrivewaySelected: true,
                            exposedDrivewayM2: val,
                            exposedDrivewayCost: Math.round(val * 230),
                            landscapingSelected: false,
                            landscapingCost: 0,
                          });
                        }}
                        className="h-8 text-xs text-right border-slate-800 bg-slate-900 text-cyan-300 font-mono font-bold"
                      />
                      <span className="text-xs text-slate-400 font-mono">m²</span>
                    </div>
                  </div>

                  <div className="text-right pl-2">
                    <span className="text-[10px] text-slate-400 block">Driveway Total:</span>
                    <span className="font-extrabold text-cyan-400 font-mono text-sm block">
                      +{formatAud((design.exposedDrivewayM2 || 55) * 230)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Facade Dropdown & Custom Facade Options */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Facade Dropdown for this specific Housing Type */}
            <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                  <PenTool className="h-3.5 w-3.5 text-cyan-400" />
                  Architectural Facade ({design.housingType} Range)
                </Label>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {design.facadePrice === 0 ? "Standard Included ($0)" : `+${formatAud(design.facadePrice)}`}
                </span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] text-slate-400">Select Facade from Price List ({suitableFacades.length} available)</Label>
                <Select
                  value={design.isCustomFacade ? "CUSTOM_FACADE" : design.facadeName || suitableFacades[0]?.name}
                  onValueChange={handleFacadeSelect}
                >
                  <SelectTrigger className="border-slate-800 bg-slate-900 text-xs text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-800 bg-slate-900 text-slate-200 max-h-72">
                    {suitableFacades.map((f) => (
                      <SelectItem key={f.name} value={f.name}>
                        {f.name} {f.uplift === 0 ? "(Standard Included)" : `(+${formatAud(f.uplift)})`}
                      </SelectItem>
                    ))}
                    <SelectItem value="CUSTOM_FACADE" className="text-cyan-400 font-bold border-t border-slate-800 mt-1">
                      + Custom Architectural Facade (Specify Details &amp; Price)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Facade Detailed Editor */}
              {design.isCustomFacade && (
                <div className="space-y-3 pt-3 border-t border-slate-800 bg-slate-900/50 p-3 rounded-lg">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                    <PenTool className="h-3.5 w-3.5" />
                    Custom Facade Specification
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-400">Custom Facade Title</Label>
                      <Input
                        value={design.facadeName}
                        onChange={(e) => onChange({ facadeName: e.target.value })}
                        placeholder="e.g. Bespoke Hamptons with Feature Gable"
                        className="h-8.5 text-xs border-slate-800 bg-slate-950 text-slate-100"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-400">Custom Facade Price ($)</Label>
                      <Input
                        type="number"
                        value={design.facadePrice || ""}
                        onChange={(e) => onChange({ facadePrice: Number(e.target.value) || 0 })}
                        placeholder="e.g. 8500"
                        className="h-8.5 text-xs border-slate-800 bg-slate-950 text-emerald-400 font-bold font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-400">Brief Architectural Scope / Description</Label>
                    <Input
                      value={design.customFacadeDescription || ""}
                      onChange={(e) => onChange({ customFacadeDescription: e.target.value })}
                      placeholder="e.g. Feature timber cladding, upgraded piers and custom portico roofing..."
                      className="h-8.5 text-xs border-slate-800 bg-slate-950 text-slate-100"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Builder Promotion / Discount Allowance */}
            <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-emerald-400" />
                  Builder Promotion / Special Discount
                </Label>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {design.promotionsDiscount > 0 ? `-${formatAud(design.promotionsDiscount)}` : "No Promotion"}
                </span>
              </div>

              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-400">Promotion Campaign Title</Label>
                  <Input
                    value={design.promotionName || ""}
                    onChange={(e) => onChange({ promotionName: e.target.value })}
                    placeholder="e.g. Summer Gold Coast Builder Promotion"
                    className="h-8.5 text-xs border-slate-800 bg-slate-900 text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-400">Promotional Discount Amount ($)</Label>
                  <Input
                    type="number"
                    value={design.promotionsDiscount || ""}
                    onChange={(e) => onChange({ promotionsDiscount: Number(e.target.value) || 0 })}
                    placeholder="0"
                    className="h-8.5 text-xs border-slate-800 bg-slate-900 text-emerald-400 font-bold font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: CUSTOM ARCHITECTURAL FLOORPLAN */}
      {design.mode === "custom_floorplan" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/40 text-xs text-cyan-200">
            <strong>Custom Floorplan Calculator:</strong> Enter individual floor area dimensions below. The base price calculates automatically using the Hudson custom formula rates.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Storey Configuration</Label>
              <Select
                value={customSpec.storeys}
                onValueChange={(v: any) => handleCustomSpecChange("storeys", v)}
              >
                <SelectTrigger className="border-slate-800 bg-slate-950 text-xs text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                  <SelectItem value="single">Single Storey</SelectItem>
                  <SelectItem value="double">Two Storey / Double</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Ground Living Area (m²)</Label>
              <Input
                type="number"
                value={customSpec.groundLivingM2 || ""}
                onChange={(e) => handleCustomSpecChange("groundLivingM2", Number(e.target.value))}
                placeholder="0"
                className="h-9 text-xs border-slate-800 bg-slate-950 text-slate-100 font-bold font-mono"
              />
            </div>

            {customSpec.storeys === "double" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">First Floor Living Area (m²)</Label>
                <Input
                  type="number"
                  value={customSpec.firstLivingM2 || ""}
                  onChange={(e) => handleCustomSpecChange("firstLivingM2", Number(e.target.value))}
                  placeholder="0"
                  className="h-9 text-xs border-slate-800 bg-slate-950 text-slate-100 font-bold font-mono"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Garage Area (m²)</Label>
              <Input
                type="number"
                value={customSpec.garageM2 || ""}
                onChange={(e) => handleCustomSpecChange("garageM2", Number(e.target.value))}
                placeholder="0"
                className="h-9 text-xs border-slate-800 bg-slate-950 text-slate-100 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Alfresco Area (m²)</Label>
              <Input
                type="number"
                value={customSpec.alfrescoM2 || ""}
                onChange={(e) => handleCustomSpecChange("alfrescoM2", Number(e.target.value))}
                placeholder="0"
                className="h-9 text-xs border-slate-800 bg-slate-950 text-slate-100 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Porch Area (m²)</Label>
              <Input
                type="number"
                value={customSpec.porchM2 || ""}
                onChange={(e) => handleCustomSpecChange("porchM2", Number(e.target.value))}
                placeholder="0"
                className="h-9 text-xs border-slate-800 bg-slate-950 text-slate-100 font-mono"
              />
            </div>

            {customSpec.storeys === "double" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Balcony Area (m²)</Label>
                <Input
                  type="number"
                  value={customSpec.balconyM2 || ""}
                  onChange={(e) => handleCustomSpecChange("balconyM2", Number(e.target.value))}
                  placeholder="0"
                  className="h-9 text-xs border-slate-800 bg-slate-950 text-slate-100 font-mono"
                />
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block">Total Calculated Area</span>
              <span className="text-base font-bold text-slate-100 font-mono">
                {calculateCustomTotalM2(customSpec)} m²
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Calculated Custom Base Price</span>
              <span className="text-lg font-bold text-emerald-400 font-mono">
                {formatAud(design.basePrice)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Architectural Floorplan Display & Modified Design Section */}
      <div className="space-y-3 bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <ImageIcon className="h-4 w-4 text-emerald-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100">
                Architectural Floorplan Specification
              </h4>
              {design.isModifiedFloorplan && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Modified Design Attached (Client Estimate Only)
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {design.isModifiedFloorplan
                ? "A custom/modified floorplan has been uploaded and cropped for this estimate. It will only be saved with this client's quote."
                : "Standard Hudson architectural floorplan layout. If you have made custom revisions, click 'Update with Modified Design' to crop and attach."}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {design.isModifiedFloorplan && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onChange({
                    floorplanUrl: standardFloorplanUrl,
                    isModifiedFloorplan: false,
                  });
                  toast.info("Reverted to standard Hudson floorplan.");
                }}
                className="h-8 text-xs border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
              >
                Revert to Standard Plan
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setIsCropperOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs gap-1.5 h-8 shadow-md"
            >
              <Upload className="h-3.5 w-3.5" />
              {design.isModifiedFloorplan ? "Re-crop / Update Modified Plan" : "Update with Modified Design"}
            </Button>
          </div>
        </div>

        {/* Floorplan Preview Canvas */}
        <div className="w-full bg-white rounded-xl p-4 border border-slate-800 min-h-[260px] max-h-[420px] flex items-center justify-center overflow-hidden shadow-inner relative group">
          {activeFloorplanUrl ? (
            <img
              src={activeFloorplanUrl}
              alt="Architectural Floorplan"
              className="max-h-[380px] w-auto max-w-full object-contain mx-auto transition-transform"
            />
          ) : (
            <div className="text-center text-slate-400 py-10 space-y-2">
              <Home className="h-10 w-10 mx-auto text-slate-300 opacity-60" />
              <p className="text-xs text-slate-500">
                {design.mode === "standard"
                  ? "Select a Home Design model above to display the standard floorplan layout, or upload a modified design."
                  : "Click 'Update with Modified Design' above to upload and crop your custom floorplan."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modified Floorplan Cropper Dialog */}
      <ModifiedFloorplanModal
        isOpen={isCropperOpen}
        onClose={() => setIsCropperOpen(false)}
        isDoubleStorey={isDouble}
        designName={design.designName || (design.mode === "custom_floorplan" ? "Custom Floorplan" : undefined)}
        onSave={(croppedDataUrl) => {
          onChange({
            floorplanUrl: croppedDataUrl,
            isModifiedFloorplan: true,
          });
        }}
      />
    </div>
  );
}
