import React, { useRef } from "react";
import {
  Home,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Upload,
  CheckCircle2,
  Tag,
  PenTool,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatAud } from "@/lib/pricing";
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
    { name: "Modern Classical Option A", uplift: 41900 },
    { name: "Modern Classical Option B", uplift: 41900 },
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const models = HOUSING_TYPE_PRICES[design.housingType] || SINGLE_STOREY_PRICES;
  const currentModel = models.find((m) => m.name === design.designName);

  const suitableFacades = HOUSING_FACADES[design.housingType] || HOUSING_FACADES["Single Storey"];

  const getTierPrice = (model: PriceRow | undefined, tier: InclusionTier): number => {
    if (!model) return 0;
    if (tier === "H3 Luxury Inclusions" || tier === "H3 Inclusions (2025)") {
      return model.h3 || model.hbs || 0;
    }
    if (tier === "H2 Design Inclusions" || tier === "H2 Inclusions (2025)") {
      return model.h2 || model.hbs || 0;
    }
    if (tier === "H1 Smart Inclusions" || tier === "H1 Inclusions (2025)") {
      return model.h1 || model.hbs || 0;
    }
    return model.hbs || 0;
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
    const basePrice = getTierPrice(m, design.specTier);
    const defaultFacade = suitableFacades[0] || { name: "Classic", uplift: 0 };

    onChange({
      designName: m.name,
      designM2: m.m2,
      basePrice,
      facadeName: design.facadeName || defaultFacade.name,
      facadePrice: design.facadeName ? design.facadePrice : defaultFacade.uplift,
      floorplanUrl,
      beds: plans[0]?.beds || "4",
      baths: plans[0]?.baths || "2",
      cars: plans[0]?.cars || "2",
      widthM: plans[0]?.width || "14.0m",
      lengthM: plans[0]?.depth || "22.0m",
    });
  };

  const handleTierChange = (tier: InclusionTier) => {
    const basePrice = currentModel ? getTierPrice(currentModel, tier) : 0;
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

  const handleCustomSpecChange = (field: keyof typeof design.customSpec, val: any) => {
    const updated = { ...design.customSpec, [field]: val };
    const calculatedBase = calculateCustomFloorplanPrice(updated);
    onChange({
      customSpec: updated,
      basePrice: calculatedBase,
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
                value={design.customSpec.storeys}
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
                value={design.customSpec.groundLivingM2 || ""}
                onChange={(e) => handleCustomSpecChange("groundLivingM2", Number(e.target.value))}
                placeholder="0"
                className="h-9 text-xs border-slate-800 bg-slate-950 text-slate-100 font-bold font-mono"
              />
            </div>

            {design.customSpec.storeys === "double" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">First Floor Living Area (m²)</Label>
                <Input
                  type="number"
                  value={design.customSpec.firstLivingM2 || ""}
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
                value={design.customSpec.garageM2 || ""}
                onChange={(e) => handleCustomSpecChange("garageM2", Number(e.target.value))}
                placeholder="0"
                className="h-9 text-xs border-slate-800 bg-slate-950 text-slate-100 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Alfresco Area (m²)</Label>
              <Input
                type="number"
                value={design.customSpec.alfrescoM2 || ""}
                onChange={(e) => handleCustomSpecChange("alfrescoM2", Number(e.target.value))}
                placeholder="0"
                className="h-9 text-xs border-slate-800 bg-slate-950 text-slate-100 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Porch Area (m²)</Label>
              <Input
                type="number"
                value={design.customSpec.porchM2 || ""}
                onChange={(e) => handleCustomSpecChange("porchM2", Number(e.target.value))}
                placeholder="0"
                className="h-9 text-xs border-slate-800 bg-slate-950 text-slate-100 font-mono"
              />
            </div>

            {design.customSpec.storeys === "double" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Balcony Area (m²)</Label>
                <Input
                  type="number"
                  value={design.customSpec.balconyM2 || ""}
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
                {calculateCustomTotalM2(design.customSpec)} m²
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
    </div>
  );
}
