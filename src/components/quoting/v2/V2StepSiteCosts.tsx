import React, { useState, useMemo } from "react";
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flame,
  Volume2,
  Building2,
  Shovel,
  Sparkles,
  Layers,
  Shield,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  calculateDesignGFA,
  calculateTopographyFallCost,
  getSoilRatePerM2,
  isDoubleStoreyDesign,
} from "@/lib/quoting/quoteEngine";
import { SITE_COST_PRESETS, type SiteCostPreset } from "./V2Types";
import type { FullQuote, SiteConditions, SoilClass } from "@/lib/quoting/quoteTypes";

interface V2StepSiteCostsProps {
  quote: FullQuote;
  site: SiteConditions;
  onChange: (patch: Partial<SiteConditions>) => void;
  onNext: () => void;
  onPrev: () => void;
  isLight: boolean;
}

const COUNCIL_REGIONS = [
  "Brisbane City Council",
  "Moreton Bay Regional Council",
  "City of Gold Coast",
  "Ipswich City Council",
  "Logan City Council",
  "Sunshine Coast Council",
  "Redland City Council",
  "Toowoomba Regional Council",
  "Scenic Rim Regional Council",
  "Somerset Regional Council",
  "Lockyer Valley Regional Council",
];

const SOIL_OPTIONS: { id: SoilClass; label: string; desc: string }[] = [
  { id: "Class M", label: "Class M", desc: "Moderately reactive (Included standard)" },
  { id: "Class H1", label: "Class H1", desc: "Highly reactive clay (+$30/m²)" },
  { id: "Class H2", label: "Class H2", desc: "Severely reactive clay (+$55/m²)" },
  { id: "Class E", label: "Class E", desc: "Extremely reactive (+$80/m²)" },
  { id: "Class P", label: "Class P", desc: "Problem site / controlled fill (+$120/m²)" },
];

const FALL_OPTIONS = [
  { meters: 0, label: "0m (Flat)" },
  { meters: 0.5, label: "0.5m (Gentle)" },
  { meters: 1.0, label: "1.0m (Moderate)" },
  { meters: 1.5, label: "1.5m (Steep)" },
  { meters: 2.0, label: "2.0m+ (Severe)" },
];

export function V2StepSiteCosts({
  quote,
  site,
  onChange,
  onNext,
  onPrev,
  isLight,
}: V2StepSiteCostsProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>("flat_greenfield");
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const gfaM2 = useMemo(() => calculateDesignGFA(quote.design), [quote.design]);
  const isDouble = useMemo(
    () => isDoubleStoreyDesign(quote.design.designName, quote.design.housingType),
    [quote.design]
  );

  // Compute live site total
  const siteTotal = useMemo(() => {
    const soilRate = getSoilRatePerM2(site.soilClass);
    const soilTotal = Math.round(soilRate * gfaM2);
    const fallTotal = calculateTopographyFallCost(site.fallMeters, gfaM2, isDouble);
    const pieringCost = site.screwPieringRequired ? Math.round(gfaM2 * 90) : 0;
    const demoCost = site.demolitionAsbestosRequired ? (site.demolitionAsbestosCost || 32500) : 0;
    const sedimentCost = Number(site.sedimentAssetProtectionCost) || 0;
    const bushfireCost = Number(site.bushfireCost) || 0;
    const acousticCost = Number(site.acousticCost) || 0;
    const rockCost = Number(site.rockExcavationAllowance) || 0;
    const retainingCost = Number(site.retainingWallAllowance) || 0;

    return (
      soilTotal +
      fallTotal +
      pieringCost +
      demoCost +
      sedimentCost +
      bushfireCost +
      acousticCost +
      rockCost +
      retainingCost
    );
  }, [site, gfaM2, isDouble]);

  // Apply a preset
  const handleApplyPreset = (preset: SiteCostPreset) => {
    setSelectedPresetId(preset.id);
    const patch: Partial<SiteConditions> = {
      soilClass: preset.soilClass,
      fallMeters: preset.fallMeters,
      screwPieringRequired: preset.piering,
      demolitionAsbestosRequired: preset.demo,
      sedimentAssetProtectionCost: preset.sediment ? 1950 : 0,
    };

    if (preset.id === "sloping_reactive") {
      patch.retainingWallAllowance = 7500;
      patch.rockExcavationAllowance = 5000;
    } else if (preset.id === "knockdown_rebuild") {
      patch.demolitionAsbestosCost = 34500;
      patch.trafficControlRequired = true;
      patch.trafficControlCost = 6500;
      patch.postDemoContourSoilTestRequired = true;
    } else {
      patch.retainingWallAllowance = 0;
      patch.rockExcavationAllowance = 0;
    }

    onChange(patch);
    toast.success(`Applied ${preset.title} preset!`);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Prompt */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/50 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs">
              4
            </span>
            <span className="text-xs uppercase tracking-wider font-bold text-emerald-400">Step 4 of 5</span>
          </div>
          <h2 className={`text-2xl font-bold mt-1 ${isLight ? "text-slate-900" : "text-white"}`}>
            Estimate Site Costs & Earthworks
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Pick a quick site preset or tailor contour fall, soil classification, and council region.
          </p>
        </div>

        {/* Live Site Costs Pill */}
        <div className="py-2 px-4 rounded-xl bg-slate-950/60 border border-slate-800 text-right self-start sm:self-center">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
            Calculated Site Costs
          </span>
          <span className={`text-lg font-bold font-mono ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
            {formatAud(siteTotal)}
          </span>
        </div>
      </div>

      {/* 4 One-Click Site Presets */}
      <div>
        <Label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
          1-Click Smart Site Packages
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {SITE_COST_PRESETS.map((preset) => {
            const isSelected = selectedPresetId === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => handleApplyPreset(preset)}
                className={`p-4 rounded-2xl border text-left cursor-pointer transition-all hover:scale-[1.01] flex flex-col justify-between ${
                  isSelected
                    ? isLight
                      ? "bg-emerald-50/80 border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
                      : "bg-emerald-950/30 border-emerald-400 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-400"
                    : isLight
                    ? "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <h4 className={`text-xs font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                      {preset.title}
                    </h4>
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center flex-none">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-400 block mb-2">
                    {preset.estimatedCostLabel}
                  </span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{preset.description}</p>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-700/20 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Soil: {preset.soilClass}</span>
                  <span>Fall: {preset.fallMeters}m</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Land Conditions Card */}
      <div
        className={`p-6 rounded-2xl border transition-all space-y-6 ${
          isLight
            ? "bg-white border-slate-200 shadow-sm"
            : "bg-slate-900/60 border-slate-800/80"
        }`}
      >
        <div className="flex items-center gap-2 pb-2 border-b border-slate-700/30">
          <Compass className="h-4 w-4 text-cyan-400" />
          <h3 className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-200"}`}>
            Site & Foundation Specifications
          </h3>
        </div>

        {/* Land Fall / Topography Slope */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-slate-300">
              Land Fall / Slope across Building Footprint
            </Label>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {site.fallMeters || 0}m Fall
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {FALL_OPTIONS.map((opt) => {
              const active = Number(site.fallMeters || 0) === opt.meters;
              return (
                <button
                  key={opt.meters}
                  type="button"
                  onClick={() => onChange({ fallMeters: opt.meters })}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    active
                      ? "bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-xs"
                      : isLight
                      ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      : "bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Soil Reactivity Classification */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-slate-300">
              Geotechnical Soil Classification
            </Label>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {site.soilClass || "Class M"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {SOIL_OPTIONS.map((soil) => {
              const active = (site.soilClass || "Class M") === soil.id;
              return (
                <button
                  key={soil.id}
                  type="button"
                  onClick={() => onChange({ soilClass: soil.id })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    active
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500"
                      : isLight
                      ? "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                      : "bg-slate-950/60 border-slate-800 hover:bg-slate-800 text-slate-300"
                  }`}
                >
                  <span className="text-xs font-bold block">{soil.label}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{soil.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Council Region Dropdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-slate-400" /> Council / Municipal Region
            </Label>
            <Select
              value={site.councilRegion || "Moreton Bay Regional Council"}
              onValueChange={(val) => onChange({ councilRegion: val })}
            >
              <SelectTrigger className="h-11 text-xs bg-slate-950/80 border-slate-800">
                <SelectValue placeholder="Select council area" />
              </SelectTrigger>
              <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                {COUNCIL_REGIONS.map((reg) => (
                  <SelectItem key={reg} value={reg} className="text-xs">
                    {reg}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick Foundation Toggles */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-300">Foundation Enhancements</Label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onChange({ screwPieringRequired: !site.screwPieringRequired })}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  site.screwPieringRequired
                    ? "bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                Screw Piering (+{formatAud(Math.round(gfaM2 * 90))})
              </button>

              <button
                type="button"
                onClick={() =>
                  onChange({
                    demolitionAsbestosRequired: !site.demolitionAsbestosRequired,
                    demolitionAsbestosCost: !site.demolitionAsbestosRequired ? 34500 : 0,
                  })
                }
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-medium transition-all ${
                  site.demolitionAsbestosRequired
                    ? "bg-amber-500/20 border-amber-500 text-amber-300 font-bold"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                House Demolition / KDRB
              </button>
            </div>
          </div>
        </div>

        {/* Environmental Overlays (Bushfire & Acoustic) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-700/30">
          {/* Bushfire BAL */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-amber-400" /> Bushfire Attack Level (BAL)
            </Label>
            <div className="flex gap-1.5">
              {(["None", "BAL-12.5", "BAL-19", "BAL-29"] as const).map((bal) => {
                const active = (site.bushfireBal || "None") === bal;
                return (
                  <button
                    key={bal}
                    type="button"
                    onClick={() => {
                      const costMap = { None: 0, "BAL-12.5": 5800, "BAL-19": 8900, "BAL-29": 14500 };
                      onChange({ bushfireBal: bal, bushfireCost: costMap[bal] });
                    }}
                    className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-all ${
                      active
                        ? "bg-amber-500 text-slate-950 font-bold border-amber-400"
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {bal}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Acoustic Tier */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Volume2 className="h-3.5 w-3.5 text-cyan-400" /> Acoustic Traffic / Noise Category
            </Label>
            <div className="flex gap-1.5">
              {(["None", "Category 1", "Category 2", "Category 3"] as const).map((cat) => {
                const active = (site.acousticTier || "None") === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      const costMap = { None: 0, "Category 1": 3200, "Category 2": 5800, "Category 3": 9800 };
                      onChange({ acousticTier: cat, acousticCost: costMap[cat] });
                    }}
                    className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-all ${
                      active
                        ? "bg-cyan-500 text-slate-950 font-bold border-cyan-400"
                        : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {cat.replace("Category ", "Cat ")}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Collapsible Advanced Allowances */}
        <div className="pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="text-xs text-slate-400 hover:text-slate-200 gap-1.5 p-0 h-auto"
          >
            {isAdvancedOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {isAdvancedOpen ? "Hide Advanced Site Overlays & Reports" : "Show Advanced Site Overlays & Engineering Reports"}
          </Button>

          {isAdvancedOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-4 animate-in fade-in-50 duration-200">
              <div className="space-y-1">
                <Label className="text-[11px] text-slate-400">Rock Excavation Allowance ($)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 2500"
                  value={site.rockExcavationAllowance || ""}
                  onChange={(e) => onChange({ rockExcavationAllowance: Number(e.target.value) || 0 })}
                  className="h-9 text-xs bg-slate-950/80 border-slate-800"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-slate-400">Retaining Wall Allowance ($)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 5000"
                  value={site.retainingWallAllowance || ""}
                  onChange={(e) => onChange({ retainingWallAllowance: Number(e.target.value) || 0 })}
                  className="h-9 text-xs bg-slate-950/80 border-slate-800"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-slate-400">Sediment & Asset Protection ($)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 1950"
                  value={site.sedimentAssetProtectionCost || ""}
                  onChange={(e) => onChange({ sedimentAssetProtectionCost: Number(e.target.value) || 0 })}
                  className="h-9 text-xs bg-slate-950/80 border-slate-800"
                />
              </div>
            </div>
          )}
        </div>
      </div>

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
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Inclusions
        </Button>

        <Button
          type="button"
          onClick={onNext}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold px-8 shadow-lg shadow-emerald-500/20 gap-2 cursor-pointer"
        >
          Continue to Variations
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
