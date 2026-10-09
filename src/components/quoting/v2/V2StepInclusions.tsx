import React from "react";
import { Check, Sparkles, ArrowRight, ArrowLeft, Layers, ShieldCheck, Star, Award, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatAud } from "@/lib/pricing";
import {
  SINGLE_STOREY_PRICES,
  DOUBLE_STOREY_PRICES,
  DUAL_OC_PRICES,
  SPLIT_LEVEL_PRICES,
} from "@/lib/pricelist.data";
import { getTierPrice } from "@/lib/quoting/quoteEngine";
import { getFacadesForDesignAndHousingType } from "@/components/quoting/QuoteDesignStep";
import type { QuoteDesignSelection, InclusionTier } from "@/lib/quoting/quoteTypes";
import { toast } from "sonner";

interface V2StepInclusionsProps {
  design: QuoteDesignSelection;
  onChange: (patch: Partial<QuoteDesignSelection>) => void;
  onNext: () => void;
  onPrev: () => void;
  isLight: boolean;
}

interface TierCardDef {
  tier: InclusionTier;
  shortCode: "H1" | "H2" | "H3";
  title: string;
  tagline: string;
  badge?: string;
  badgeColor?: string;
  features: { text: string; isUpgrade?: boolean }[];
  accentBorder: string;
  glowClass: string;
}

const TIERS: TierCardDef[] = [
  {
    tier: "H1 Smart Living",
    shortCode: "H1",
    title: "Smart Living",
    tagline: "Essential Value & Reliable Quality",
    features: [
      { text: "20mm engineered stone kitchen benchtop" },
      { text: "600mm Westinghouse European stainless appliances" },
      { text: "Semi-frameless shower screens with chrome tapware" },
      { text: "Termimesh stainless steel physical termite barrier" },
      { text: "Quality carpet to bedrooms & ceramic tiles to living" },
      { text: "R2.5 ceiling insulation batts & roof sarking" },
    ],
    accentBorder: "border-slate-500/40",
    glowClass: "hover:border-slate-400",
  },
  {
    tier: "H2 Design Collection",
    shortCode: "H2",
    title: "Design Collection",
    tagline: "The Hudson Signature Standard",
    badge: "Most Popular",
    badgeColor: "bg-emerald-500 text-slate-950",
    features: [
      { text: "900mm Westinghouse gas cooktop & canopy rangehood", isUpgrade: true },
      { text: "20mm stone to kitchen, bathroom & ensuite vanities", isUpgrade: true },
      { text: "Soft-close cabinet doors & drawers throughout", isUpgrade: true },
      { text: "LED downlight package to main open-plan living zones", isUpgrade: true },
      { text: "Flyscreens to all opening windows & sliding doors" },
      { text: "Automated sectional garage door with 2 remote keyfobs" },
    ],
    accentBorder: "border-emerald-500",
    glowClass: "hover:border-emerald-400 shadow-emerald-500/10",
  },
  {
    tier: "H3 Luxury Inclusions",
    shortCode: "H3",
    title: "Luxury Living",
    tagline: "Executive Architectural Finish",
    badge: "Executive",
    badgeColor: "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950",
    features: [
      { text: "40mm stone benchtops with dual waterfall ends", isUpgrade: true },
      { text: "2740mm (9ft) high ceilings to ground floor", isUpgrade: true },
      { text: "Multi-zone reverse cycle ducted air conditioning", isUpgrade: true },
      { text: "Floor-to-ceiling rectified porcelain bathroom tiling", isUpgrade: true },
      { text: "Freestanding designer acrylic bath & black mixers", isUpgrade: true },
      { text: "Fisher & Paykel premium appliance package", isUpgrade: true },
    ],
    accentBorder: "border-amber-500/80",
    glowClass: "hover:border-amber-400 shadow-amber-500/10",
  },
];

export function V2StepInclusions({
  design,
  onChange,
  onNext,
  onPrev,
  isLight,
}: V2StepInclusionsProps) {
  // Find current model to compute exact base price differences
  const allPriceRows = [
    ...SINGLE_STOREY_PRICES,
    ...DOUBLE_STOREY_PRICES,
    ...DUAL_OC_PRICES,
    ...SPLIT_LEVEL_PRICES,
  ];
  const currentModel = allPriceRows.find(
    (m) => m.name.toLowerCase() === (design.designName || "").toLowerCase()
  );

  const currentTierNormalized = (design.specTier || "H2").toUpperCase();

  const handleSelectTier = (tier: InclusionTier, shortCode: "H1" | "H2" | "H3", autoShift: boolean = true) => {
    let nextBasePrice = design.basePrice;
    let nextStdBasePrice = design.standardBasePrice;

    if (currentModel) {
      nextBasePrice = getTierPrice(currentModel, tier, design.housingType);
      nextStdBasePrice = nextBasePrice;
    }

    onChange({
      specTier: tier,
      basePrice: nextBasePrice,
      standardBasePrice: nextStdBasePrice,
    });

    toast.success(`Inclusion level set to ${tier}!`);

    if (autoShift) {
      setTimeout(() => {
        onNext();
      }, 350);
    }
  };

  // Facades for current design
  const facades = getFacadesForDesignAndHousingType(
    design.designName,
    design.housingType || "Single Storey"
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Prompt */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/50 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs">
              3
            </span>
            <span className="text-xs uppercase tracking-wider font-bold text-emerald-400">Step 3 of 6</span>
          </div>
          <h2 className={`text-2xl font-bold mt-1 ${isLight ? "text-slate-900" : "text-white"}`}>
            Choose an Inclusions Level
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Select the specification package for {design.designName || "your home"}. Selecting a tier automatically shifts to Site Costs.
          </p>
        </div>
      </div>

      {/* 3 Inclusion Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {TIERS.map((item) => {
          const isSelected =
            currentTierNormalized.includes(item.shortCode) ||
            design.specTier?.toLowerCase() === item.tier.toLowerCase();

          // Calculate price for this design at this tier
          const tierPrice = currentModel
            ? getTierPrice(currentModel, item.tier, design.housingType)
            : design.basePrice || 0;

          return (
            <div
              key={item.shortCode}
              onClick={() => handleSelectTier(item.tier, item.shortCode, true)}
              className={`rounded-2xl border p-6 flex flex-col justify-between cursor-pointer transition-all duration-200 relative hover:scale-[1.01] ${
                isSelected
                  ? isLight
                    ? "bg-emerald-50/90 border-emerald-500 shadow-lg ring-2 ring-emerald-500/30"
                    : "bg-emerald-950/30 border-emerald-500 shadow-xl ring-2 ring-emerald-500/40"
                  : isLight
                  ? "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                  : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700 backdrop-blur-md"
              }`}
            >
              {/* Optional Ribbon Badge */}
              {item.badge && (
                <div className="absolute -top-3 right-4">
                  <Badge className={`${item.badgeColor || "bg-emerald-500 text-slate-950"} font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 shadow-sm`}>
                    {item.badge}
                  </Badge>
                </div>
              )}

              <div>
                {/* Header info */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-xl font-bold text-xs ${
                        item.shortCode === "H3"
                          ? "bg-amber-500/20 text-amber-400"
                          : item.shortCode === "H2"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-slate-500/20 text-slate-300"
                      }`}
                    >
                      {item.shortCode}
                    </span>
                    <h3 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                      {item.title}
                    </h3>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center flex-none">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-400 mb-5">{item.tagline}</p>

                {/* Price Box */}
                <div
                  className={`p-3.5 rounded-xl border mb-5 ${
                    isLight
                      ? "bg-slate-50 border-slate-200"
                      : "bg-slate-950/60 border-slate-800/80"
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
                    Base House Price
                  </span>
                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className={`text-xl font-bold font-mono ${isLight ? "text-slate-900" : "text-white"}`}>
                      {formatAud(tierPrice)}
                    </span>
                    {currentModel && item.shortCode !== "H2" && (
                      <span className="text-xs font-semibold font-mono text-slate-400">
                        {tierPrice > design.basePrice
                          ? `+${formatAud(tierPrice - design.basePrice)}`
                          : formatAud(tierPrice - design.basePrice)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Feature Bullet Points with High Contrast */}
                <div className="space-y-2.5">
                  <span className={`text-[11px] font-bold uppercase tracking-wider block ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                    Key Specifications:
                  </span>
                  {item.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs">
                      <CheckCircle2
                        className={`h-3.5 w-3.5 flex-none mt-0.5 ${
                          feat.isUpgrade ? "text-amber-500" : "text-emerald-500"
                        }`}
                      />
                      <span
                        className={
                          feat.isUpgrade
                            ? isLight
                              ? "font-semibold text-slate-900"
                              : "font-semibold text-slate-100"
                            : isLight
                            ? "text-slate-700"
                            : "text-slate-300"
                        }
                      >
                        {feat.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 1-Click Action Button */}
              <div className="mt-6 pt-4 border-t border-slate-700/30">
                <Button
                  type="button"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectTier(item.tier, item.shortCode, true);
                  }}
                  className={`w-full text-xs font-bold transition-all h-9 cursor-pointer ${
                    isSelected
                      ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                      : isLight
                      ? "border border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200"
                      : "border border-slate-800 bg-slate-800/60 text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  {isSelected ? "Selected ✓ Continue to Site Costs →" : `Select ${item.title} & Continue →`}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Facade Selection Bar */}
      {facades && facades.length > 0 && (
        <div
          className={`p-6 rounded-2xl border transition-all ${
            isLight
              ? "bg-white border-slate-200 shadow-sm"
              : "bg-slate-900/60 border-slate-800/80"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-cyan-400" />
              <h3 className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                Choose Exterior Facade
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              Active: <span className="font-bold text-emerald-500">{design.facadeName || "Classic"}</span>
              {design.facadePrice ? ` (+${formatAud(design.facadePrice)})` : " (Included)"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {facades.slice(0, 6).map((facade) => {
              const isCurrent = (design.facadeName || "Classic").toLowerCase() === facade.name.toLowerCase();
              return (
                <button
                  key={facade.name}
                  type="button"
                  onClick={() => {
                    onChange({
                      facadeName: facade.name,
                      facadePrice: facade.uplift || 0,
                      facadeImageUrl: facade.url || "",
                      isCustomFacade: false,
                    });
                    toast.success(`Selected facade: ${facade.name}`);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isCurrent
                      ? isLight
                        ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
                        : "bg-emerald-950/40 border-emerald-400 ring-1 ring-emerald-400 shadow-xs"
                      : isLight
                      ? "bg-slate-50 border-slate-200 hover:border-slate-300"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <span className={`text-xs font-bold block truncate ${isLight ? "text-slate-900" : "text-white"}`}>
                    {facade.name}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {facade.uplift ? `+${formatAud(facade.uplift)}` : "Included"}
                  </span>
                </button>
              );
            })}
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
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Floor Plan
        </Button>

        <Button
          type="button"
          onClick={onNext}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold px-8 shadow-lg shadow-emerald-500/20 gap-2 cursor-pointer h-11"
        >
          Continue to Site Costs
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
