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

// Inclusions order: H1 on LHS, H2 in Middle, H3 on RHS
const INCLUSION_TIERS: { id: InclusionTier; label: string; tag: string; desc: string }[] = [
  {
    id: "H1 Inclusions (2025)",
    label: "H1 Standard Inclusions (2025)",
    tag: "Essential Value",
    desc: "Quality turnkey inclusions with 2,440mm ceilings, Haier/Fisher & Paykel appliances, reverse cycle split system A/C, and floor tiles/carpet throughout.",
  },
  {
    id: "H2 Inclusions (2025)",
    label: "H2 Premium Inclusions (2025)",
    tag: "Most Popular",
    desc: "Day/Night ducted air conditioning, 20mm stone benchtops throughout, 2,590mm high ceilings, and Fisher & Paykel 900mm luxury appliances.",
  },
  {
    id: "H3 Inclusions (2025)",
    label: "H3 Luxury Inclusions (2025)",
    tag: "Ultimate Luxury",
    desc: "Fully zoned MyAir5 touchscreen ducted A/C, 40mm/20mm stone benchtops, 2,740mm high ceilings, Fisher & Paykel 900mm luxury appliances, and solar PV.",
  },
];

const HOUSING_FACADES: Record<string, { name: string; uplift: number }[]> = {
  "Single Storey": [
    { name: "Classic", uplift: 0 },
    { name: "Classic Plus", uplift: 4700 },
    { name: "Traditional", uplift: 0 },
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
    { name: "Nuvo", uplift: 28400 },
    { name: "Regal", uplift: 28400 },
    { name: "Veinna", uplift: 28400 },
    { name: "Vogue", uplift: 28400 },
    { name: "Vibe", uplift: 37700 },
    { name: "Visage", uplift: 37700 },
    { name: "Modern Classical", uplift: 41900 },
    { name: "Modern Farmhouse", uplift: 28400 },
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
    { name: "Modern Farmhouse", uplift: 41900 },
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
  const currentModel = models.find((m) => m.name === design.designName) || models[0];

  const suitableFacades = HOUSING_FACADES[design.housingType] || HOUSING_FACADES["Single Storey"];

  const getTierPrice = (model: PriceRow, tier: InclusionTier): number => {
    if (tier === "H3 Inclusions (2025)") return model.h3 || model.hbs || 0;
    if (tier === "H2 Inclusions (2025)") return model.h2 || model.hbs || 0;
    if (tier === "H1 Inclusions (2025)") return model.h1 || model.hbs || 0;
    return model.hbs || 0;
  };

  const handleHousingTypeChange = (type: QuoteDesignSelection["housingType"]) => {
    const newModels = HOUSING_TYPE_PRICES[type] || SINGLE_STOREY_PRICES;
    const first = newModels[0];
    const plans = plansForDesign(first.name);
    const floorplanUrl = plans[0]?.url || "";
    const basePrice = getTierPrice(first, design.specTier);
    const facadesForType = HOUSING_FACADES[type] || HOUSING_FACADES["Single Storey"];
    const firstFacade = facadesForType[0];

    onChange({
      housingType: type,
      designName: first.name,
      designM2: first.m2,
      basePrice,
      facadeName: firstFacade.name,
      facadePrice: firstFacade.uplift,
      isCustomFacade: false,
      floorplanUrl,
      beds: plans[0]?.beds || "4",
      baths: plans[0]?.baths || "2",
      cars: plans[0]?.cars || "2",
      widthM: plans[0]?.width || "14.0m",
      lengthM: plans[0]?.depth || "22.0m",
    });
  };

  const handleDesignModelChange = (modelName: string) => {
    const m = models.find((x) => x.name === modelName);
    if (!m) return;

    const plans = plansForDesign(m.name);
    const floorplanUrl = plans[0]?.url || "";
    const basePrice = getTierPrice(m, design.specTier);

    onChange({
      designName: m.name,
      designM2: m.m2,
      basePrice,
      floorplanUrl,
      beds: plans[0]?.beds || "4",
      baths: plans[0]?.baths || "2",
      cars: plans[0]?.cars || "2",
      widthM: plans[0]?.width || "14.0m",
      lengthM: plans[0]?.depth || "22.0m",
    });
  };

  const handleTierChange = (tier: InclusionTier) => {
    const basePrice = getTierPrice(currentModel, tier);
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
            Choose a standard Hudson design with H1/H2/H3 inclusions, or calculate custom floorplan dimensions.
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
                value={design.designName}
                onValueChange={(v) => handleDesignModelChange(v)}
              >
                <SelectTrigger className="border-slate-800 bg-slate-950/70 text-xs text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-900 text-slate-200 max-h-64">
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
                value={`${design.designM2} m² (${(design.designM2 * 0.107639).toFixed(1)} sq)`}
                className="border-slate-800 bg-slate-950/50 text-xs text-slate-400 cursor-not-allowed font-medium"
              />
            </div>
          </div>

          {/* Inclusion Tier Range: FLIPPED ORDER -> H1 on LHS, H2 in Middle, H3 on RHS */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Inclusion Range (H1, H2, H3 Set Pricing)
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {INCLUSION_TIERS.map((tier) => {
                const isSelected = design.specTier === tier.id;
                const tierPrice = getTierPrice(currentModel, tier.id);
                return (
                  <div
                    key={tier.id}
                    onClick={() => handleTierChange(tier.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
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
                    <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                      {tier.desc}
                    </p>
                    <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-slate-400">Base Price:</span>
                      <span className="font-bold text-emerald-400 font-mono">
                        {formatAud(tierPrice)}
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
                  {design.facadePrice === 0 ? "Standard Included" : `+${formatAud(design.facadePrice)}`}
                </span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] text-slate-400">Select Facade from Price List</Label>
                <Select
                  value={design.isCustomFacade ? "CUSTOM_FACADE" : design.facadeName}
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
                    placeholder="e.g. Hudson Super Savings Promotion"
                    className="h-8.5 text-xs border-slate-800 bg-slate-900 text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-400">Promotional Discount Amount ($)</Label>
                  <Input
                    type="number"
                    value={design.promotionsDiscount || ""}
                    onChange={(e) => onChange({ promotionsDiscount: Number(e.target.value) || 0 })}
                    placeholder="e.g. 10000"
                    className="h-8.5 text-xs border-slate-800 bg-slate-900 text-emerald-400 font-bold font-mono"
                  />
                </div>
                <span className="text-[11px] text-slate-400 block pt-0.5">
                  This promotional discount will be itemized on its own distinct line in the Builders Estimate.
                </span>
              </div>
            </div>
          </div>

          {/* Floorplan Drawing Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-cyan-400" />
                Selected Floorplan Drawing
              </Label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleCustomFloorplanUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  <Upload className="h-3 w-3" /> Upload Custom / Cropped Plan
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 flex flex-col items-center justify-center gap-4 min-h-[220px]">
              {design.floorplanUrl ? (
                <div className="flex flex-col items-center w-full">
                  <img
                    src={design.floorplanUrl}
                    alt={design.designName}
                    className="max-h-64 object-contain rounded border border-slate-800 bg-white p-3 shadow-md"
                  />
                  <div className="mt-3 text-center">
                    <span className="text-xs font-bold text-slate-200">{design.designName} Floorplan</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {design.beds || 4} Bed · {design.baths || 2} Bath · {design.cars || 2} Car · Total Area: {design.designM2} m² ({(design.designM2 * 0.107639).toFixed(1)} sq)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center text-slate-500 text-xs py-8">
                  No floorplan graphic loaded. Click upload to attach custom plan drawing.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: CUSTOM FLOORPLAN (M2 CALCULATOR) */}
      {design.mode === "custom_floorplan" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/10 p-4 text-xs text-cyan-300">
            <span className="font-bold">Custom Floorplan Formula Engine:</span> Specify custom room and area dimensions in square metres (m²). Rates dynamically calculate based on single vs double storey engineering.
          </div>

          <div className="flex items-center gap-4">
            <Label className="text-xs text-slate-300">Storeys Configuration:</Label>
            <div className="flex gap-2">
              {[
                { id: "single", label: "Single Storey" },
                { id: "double", label: "Double Storey" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleCustomSpecChange("storeys", s.id)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                    design.customSpec.storeys === s.id
                      ? "border-cyan-500 bg-cyan-500/20 text-cyan-200"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Area Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Ground Living Area (m²)</Label>
              <Input
                type="number"
                step="0.1"
                value={design.customSpec.groundLivingM2 || ""}
                onChange={(e) => handleCustomSpecChange("groundLivingM2", Number(e.target.value))}
                placeholder="150.0"
                className="border-slate-800 bg-slate-950/70 text-xs text-slate-100"
              />
              <span className="text-[10px] text-slate-400">
                Rate: ${design.customSpec.groundRateM2}/m²
              </span>
            </div>

            {design.customSpec.storeys === "double" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">First Floor Living Area (m²)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={design.customSpec.firstLivingM2 || ""}
                  onChange={(e) => handleCustomSpecChange("firstLivingM2", Number(e.target.value))}
                  placeholder="95.0"
                  className="border-slate-800 bg-slate-950/70 text-xs text-slate-100"
                />
                <span className="text-[10px] text-slate-400">
                  Rate: ${design.customSpec.upperRateM2}/m²
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Garage Area (m²)</Label>
              <Input
                type="number"
                step="0.1"
                value={design.customSpec.garageM2 || ""}
                onChange={(e) => handleCustomSpecChange("garageM2", Number(e.target.value))}
                placeholder="36.0"
                className="border-slate-800 bg-slate-950/70 text-xs text-slate-100"
              />
              <span className="text-[10px] text-slate-400">
                Rate: ${design.customSpec.ancillaryRateM2}/m²
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Under-Roof Alfresco (m²)</Label>
              <Input
                type="number"
                step="0.1"
                value={design.customSpec.alfrescoM2 || ""}
                onChange={(e) => handleCustomSpecChange("alfrescoM2", Number(e.target.value))}
                placeholder="15.0"
                className="border-slate-800 bg-slate-950/70 text-xs text-slate-100"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Entry Porch (m²)</Label>
              <Input
                type="number"
                step="0.1"
                value={design.customSpec.porchM2 || ""}
                onChange={(e) => handleCustomSpecChange("porchM2", Number(e.target.value))}
                placeholder="4.5"
                className="border-slate-800 bg-slate-950/70 text-xs text-slate-100"
              />
            </div>

            {design.customSpec.storeys === "double" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Upper Balcony (m²)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={design.customSpec.balconyM2 || ""}
                  onChange={(e) => handleCustomSpecChange("balconyM2", Number(e.target.value))}
                  placeholder="8.0"
                  className="border-slate-800 bg-slate-950/70 text-xs text-slate-100"
                />
              </div>
            )}
          </div>

          {/* Summary Box */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-950/80">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Total Custom Floorplan Area:
              </span>
              <div className="text-base font-extrabold text-white">
                {calculateCustomTotalM2(design.customSpec)} m²{" "}
                <span className="text-xs text-slate-400 font-normal">
                  ({(calculateCustomTotalM2(design.customSpec) * 0.107639).toFixed(1)} sq)
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Calculated Custom Base Price:
              </span>
              <div className="text-lg font-extrabold text-cyan-400 font-mono">
                {formatAud(calculateCustomFloorplanPrice(design.customSpec))}
              </div>
            </div>
          </div>

          {/* Custom Plan Uploader */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5 text-cyan-400" />
              Upload Custom Floorplan Drawing
            </Label>
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-center space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleCustomFloorplanUpload}
                accept="image/*"
                className="hidden"
              />
              {design.floorplanUrl ? (
                <div className="flex flex-col items-center">
                  <img
                    src={design.floorplanUrl}
                    alt="Custom Plan"
                    className="max-h-56 object-contain rounded border border-slate-800 bg-white p-3"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 text-xs text-cyan-400 hover:underline"
                  >
                    Replace Custom Drawing
                  </button>
                </div>
              ) : (
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 hover:bg-slate-800"
                  >
                    <Upload className="h-4 w-4 text-cyan-400" /> Choose Drawing File
                  </button>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Upload PNG, JPG or WebP floorplan drawing for the quotation document.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
