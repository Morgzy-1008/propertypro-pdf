import React from "react";
import {
  Compass,
  AlertTriangle,
  Flame,
  Volume2,
  Building2,
  CheckCircle2,
  Layers,
  ArrowDownUp,
  Shield,
  Waves,
  FileCheck2,
  Truck,
  Mountain,
  Hammer,
  TreeDeciduous,
  DollarSign,
  Check,
  FileText,
  Plus,
  Minus,
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
  calculateDesignGFA,
  calculateTopographyFallCost,
  getAcousticCost,
  getBushfireCost,
  getSoilRatePerM2,
} from "@/lib/quoting/quoteEngine";
import type { FullQuote, SiteConditions, SoilClass } from "@/lib/quoting/quoteTypes";

interface QuoteSiteCostsStepProps {
  quote: FullQuote;
  site: SiteConditions;
  onSiteChange: (patch: Partial<SiteConditions>) => void;
}

const SOIL_CLASSES: { id: SoilClass; name: string; rate: number }[] = [
  {
    id: "Class S",
    name: "Class S — Slightly Reactive Soil",
    rate: -30,
  },
  {
    id: "Class M",
    name: "Class M — Moderately Reactive (Included)",
    rate: 0,
  },
  {
    id: "Class H1",
    name: "Class H1 — Highly Reactive Soil",
    rate: 30,
  },
  {
    id: "Class H2",
    name: "Class H2 — Highly Reactive (Severe Clay)",
    rate: 55,
  },
  {
    id: "Class E1",
    name: "Class E1 — Extremely Reactive Soil",
    rate: 80,
  },
  {
    id: "Class E2",
    name: "Class E2 — Extremely Reactive (Severe)",
    rate: 100,
  },
  {
    id: "Class P",
    name: "Class P — Problem Soil / Uncontrolled Fill",
    rate: 150,
  },
];

const BUSHFIRE_LEVELS = [
  { id: "None" as const, desc: "Standard site (No BAL requirements)" },
  { id: "BAL-12.5" as const, desc: "Aluminium ember mesh to weep holes and subfloor" },
  { id: "BAL-19" as const, desc: "Solid timber doors, 5mm Grade A safety glass & sarking" },
  { id: "BAL-29" as const, desc: "Toughened glazing, non-combustible cladding & ember seals" },
  { id: "BAL-40" as const, desc: "Extreme fire protection with radiant heat shielding" },
];

const ACOUSTIC_TIERS = [
  { id: "None" as const, desc: "Standard quiet residential zone" },
  { id: "Category 1" as const, desc: "Thickened 6.38mm laminate acoustic glazing to exposed facade" },
  { id: "Category 2" as const, desc: "Acoustic perimeter seals and upgraded external glass" },
  { id: "Category 3" as const, desc: "Heavy acoustic insulation batts & laminated glass" },
];

export function QuoteSiteCostsStep({ quote, site, onSiteChange }: QuoteSiteCostsStepProps) {
  const isDouble =
    quote.design.mode === "custom_floorplan"
      ? quote.design.customSpec.storeys === "double"
      : quote.design.housingType === "Double Storey";

  const isSplitLevel =
    quote.design.mode === "custom_floorplan"
      ? quote.design.customSpec.storeys === "split"
      : quote.design.housingType === "Split Level";

  const gfaM2 = calculateDesignGFA(quote.design);
  const soilRate = getSoilRatePerM2(site.soilClass);
  const soilTotalCost = Math.round(soilRate * gfaM2);

  const fallCost = calculateTopographyFallCost(site.fallMeters, gfaM2, isSplitLevel);
  const excessMeters = Math.max(0, site.fallMeters - 1.0);
  const tenthsAbove1m = Math.round(excessMeters * 10);

  // Soil items
  const concrete32Cost = site.concrete32MpaRequired ? (site.concrete32MpaCost ?? Math.round(gfaM2 * 14)) : 0;
  const flexibleConnectionsCost = site.flexibleConnectionsRequired ? (site.flexibleConnectionsCost ?? 1800) : 0;

  // Overlay Reports (LHS)
  const bushfireReportCost = site.bushfireReportRequired ? (site.bushfireReportCost ?? 850) : 0;
  const floodReportCost = site.floodReportRequired ? (site.floodReportCost ?? 1500) : 0;
  const acousticReportCost = site.acousticReportRequired ? (site.acousticReportCost ?? 1200) : 0;

  // Overlay Allowances (RHS)
  const currentBalCost = getBushfireCost(site.bushfireBal, isDouble);
  const floodCost = site.floodOverlayRequired ? (site.floodOverlayCost ?? 4800) : 0;
  const currentAcousticCost = getAcousticCost(site.acousticTier, isDouble);

  // Council & Statutory
  const councilDaCost = site.councilDaRequired ? (site.councilDaCost ?? 8000) : 0;
  const trafficCost = site.trafficControlRequired ? (site.trafficControlCost ?? 10000) : 0;
  const dualLivingCost = site.dualLivingInfrastructureRequired ? (site.dualLivingInfrastructureCost ?? 23000) : 0;
  const sedimentCost = Number(site.sedimentAssetProtectionCost) || 0;

  // Geotechnical Allowances
  const screwPieringCost = site.screwPieringRequired ? (site.screwPieringCost ?? Math.round(gfaM2 * 85)) : 0;
  const rockCost = Number(site.rockExcavationAllowance) || 0;
  const retainingCost = Number(site.retainingWallAllowance) || 0;

  const totalSiteAndStatutory =
    soilTotalCost +
    concrete32Cost +
    flexibleConnectionsCost +
    fallCost +
    bushfireReportCost +
    currentBalCost +
    floodReportCost +
    floodCost +
    acousticReportCost +
    currentAcousticCost +
    site.councilFee +
    councilDaCost +
    trafficCost +
    dualLivingCost +
    screwPieringCost +
    rockCost +
    retainingCost +
    sedimentCost;

  const handleSoilSelect = (soilClass: SoilClass) => {
    const rate = getSoilRatePerM2(soilClass);
    const cost = Math.round(rate * gfaM2);
    onSiteChange({
      soilClass,
      soilCostSqm: rate,
      soilTotalCost: cost,
    });
  };

  const handleFallChange = (fall: number) => {
    const cost = calculateTopographyFallCost(fall, gfaM2, isSplitLevel);
    onSiteChange({
      fallMeters: fall,
      fallTotalCost: cost,
    });
  };

  const handleBalChange = (bal: (typeof BUSHFIRE_LEVELS)[number]["id"]) => {
    const cost = getBushfireCost(bal, isDouble);
    onSiteChange({ bushfireBal: bal, bushfireCost: cost });
  };

  const handleAcousticChange = (tier: (typeof ACOUSTIC_TIERS)[number]["id"]) => {
    const cost = getAcousticCost(tier, isDouble);
    onSiteChange({ acousticTier: tier, acousticCost: cost });
  };

  const handleCouncilChange = (region: string) => {
    let fee = 0;
    if (region.includes("No Location") || region.includes("Allowance")) {
      fee = 2200;
    } else if (region.includes("Logan") || region.includes("Ipswich") || region.includes("Moreton Bay") || region.includes("Regional")) {
      fee = 2227;
    } else if (region.includes("Gold Coast") || region.includes("Sunshine Coast")) {
      fee = 2950;
    } else {
      fee = 0; // Brisbane City Council
    }
    onSiteChange({ councilRegion: region, councilFee: fee });
  };

  const handleTrafficStep = (delta: number) => {
    const current = site.trafficControlCost ?? 10000;
    const next = Math.max(2500, current + delta);
    onSiteChange({ trafficControlCost: next, trafficControlRequired: true });
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">
              Step 3: Site Earthworks, Soil &amp; Statutory Requirements
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure site-specific engineering foundations, 32MPa concrete, flexible connections, overlay reports &amp; allowances, statutory fees, and screw piering.
          </p>
        </div>

        <div className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 text-xs flex items-center gap-3 self-start">
          <div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Ground Slab GFA:</span>
            <span className="font-bold text-cyan-400 font-mono">{gfaM2} m²</span>
          </div>
          <div className="border-l border-slate-800 pl-3">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Total Site Investment:</span>
            <span className="font-extrabold text-emerald-400 font-mono text-sm">{formatAud(totalSiteAndStatutory)}</span>
          </div>
        </div>
      </div>

      {/* Section 1: Soil Classification & Foundation Earthworks */}
      <div className="space-y-4 bg-slate-950/70 p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-cyan-400" />
            Engineered Soil Classification &amp; Slab Footing
          </Label>
          <span className="text-xs font-mono font-bold text-emerald-400">
            {soilTotalCost === 0 ? "Standard Included ($0)" : soilTotalCost < 0 ? `-${formatAud(Math.abs(soilTotalCost))}` : `+${formatAud(soilTotalCost)}`}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {SOIL_CLASSES.map((soil) => {
            const isSelected = site.soilClass === soil.id;
            const cost = Math.round(soil.rate * gfaM2);
            return (
              <div
                key={soil.id}
                onClick={() => handleSoilSelect(soil.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/40 shadow-lg"
                    : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-xs text-white truncate block">{soil.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {soil.rate === 0 ? "Included" : `${soil.rate > 0 ? "+" : ""}$${soil.rate}/m²`}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <span className={`font-bold text-xs font-mono ${cost < 0 ? "text-cyan-400" : cost > 0 ? "text-amber-400" : "text-slate-300"}`}>
                    {cost === 0 ? "Included" : cost < 0 ? `-${formatAud(Math.abs(cost))}` : `+${formatAud(cost)}`}
                  </span>
                  {isSelected && <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-none" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* 32MPa Concrete Slab & Flexible Connections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
          {/* 32MPa Concrete */}
          <div
            onClick={() => onSiteChange({ concrete32MpaRequired: !site.concrete32MpaRequired })}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
              site.concrete32MpaRequired
                ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/40"
                : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-white">32 MPa Concrete Slab Upgrade</span>
                {site.concrete32MpaRequired && <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-semibold">Active</span>}
              </div>
              <p className="text-[11px] text-slate-400">
                High-strength concrete mix for marine, coastal saline proximity, or acid sulfate ground ($14/m² × {gfaM2} m²).
              </p>
            </div>
            <div className="text-right flex-none">
              <span className="font-bold text-xs text-emerald-400 font-mono block">
                +{formatAud(site.concrete32MpaCost ?? Math.round(gfaM2 * 14))}
              </span>
            </div>
          </div>

          {/* Flexible Connections */}
          <div
            onClick={() => onSiteChange({ flexibleConnectionsRequired: !site.flexibleConnectionsRequired })}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
              site.flexibleConnectionsRequired
                ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/40"
                : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-white">Flexible Service Connections</span>
                {site.flexibleConnectionsRequired && <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-semibold">Active</span>}
              </div>
              <p className="text-[11px] text-slate-400">
                Heavy-duty flexible articulation joints for plumbing and drainage to accommodate movement in reactive soils.
              </p>
            </div>
            <div className="text-right flex-none">
              <span className="font-bold text-xs text-emerald-400 font-mono block">
                +{formatAud(site.flexibleConnectionsCost ?? 1800)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Topography & Fall Across Building Envelope */}
      <div className="space-y-3 bg-slate-950/70 p-5 rounded-2xl border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
              <ArrowDownUp className="h-3.5 w-3.5 text-amber-400" />
              Topography &amp; Fall Across Building Envelope (m)
            </Label>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Standard equal cut &amp; fill is included up to 1.0m fall ($0).{" "}
              {isSplitLevel ? (
                <span className="text-cyan-300 font-semibold">Split Level Rates: $12.50/0.1m under 2m, $15.00/0.1m above 2m × {gfaM2} m² GFA</span>
              ) : (
                <span className="text-slate-300 font-semibold">Rates: $15.00/0.1m under 2m, $20.00/0.1m above 2m × {gfaM2} m² GFA</span>
              )}
            </span>
          </div>

          <div className="text-right flex-none">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
              Topography Cost:
            </span>
            <span className="text-base font-extrabold text-amber-400 font-mono">
              {fallCost === 0 ? "Included ($0)" : `+${formatAud(fallCost)}`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">Total Fall across Envelope (Metres)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={site.fallMeters || ""}
                onChange={(e) => handleFallChange(Math.max(0, Number(e.target.value)))}
                placeholder="0.5"
                className="h-10 text-sm border-slate-800 bg-slate-900 text-slate-100 font-bold font-mono"
              />
              <span className="text-xs text-slate-400 font-mono">m</span>
            </div>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800/80 text-xs space-y-1 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">Standard Allowance:</span>
              <span className="text-slate-300 font-medium">Up to 1.0m fall (Included)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Excess Fall:</span>
              <span className="font-mono text-slate-200">{excessMeters > 0 ? `${excessMeters.toFixed(1)}m (${tenthsAbove1m} tenths)` : "0.0m"}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-800 text-emerald-400 font-semibold">
              <span>Calculated Surcharge:</span>
              <span className="font-mono">{fallCost === 0 ? "$0 (Included)" : `+${formatAud(fallCost)}`}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Site Overlay Reports & Allowances (2-Column Setup) */}
      <div className="space-y-3 bg-slate-950/70 p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div>
            <Label className="text-xs text-slate-200 font-bold uppercase tracking-wider flex items-center gap-2">
              <Shield className="h-4 w-4 text-cyan-400" />
              Site Overlay Reports &amp; Allowances
            </Label>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Left side: specialist engineering assessment reports. Right side: physical construction rating allowances.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400">
            +{formatAud(bushfireReportCost + currentBalCost + floodReportCost + floodCost + acousticReportCost + currentAcousticCost)}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* LHS: Overlay Assessment Reports */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider">
              <FileText className="h-3.5 w-3.5 text-amber-400" />
              1. Overlay Assessment Reports (LHS)
            </div>

            {/* Bushfire Report */}
            <div
              onClick={() => onSiteChange({ bushfireReportRequired: !site.bushfireReportRequired })}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                site.bushfireReportRequired
                  ? "border-amber-500 bg-amber-950/20 ring-1 ring-amber-500/40"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-white">Bushfire Hazard Assessment Report</span>
                  {site.bushfireReportRequired && <Check className="h-3.5 w-3.5 text-amber-400" />}
                </div>
                <p className="text-[10px] text-slate-400">
                  Certified site BAL assessment, property vegetation categorization, and bushfire management statement.
                </p>
              </div>
              <span className="font-bold text-xs text-amber-400 font-mono flex-none">
                +{formatAud(site.bushfireReportCost ?? 850)}
              </span>
            </div>

            {/* Flood Report */}
            <div
              onClick={() => onSiteChange({ floodReportRequired: !site.floodReportRequired })}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                site.floodReportRequired
                  ? "border-cyan-500 bg-cyan-950/20 ring-1 ring-cyan-500/40"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-white">Flood Overlay Code Assessment Report</span>
                  {site.floodReportRequired && <Check className="h-3.5 w-3.5 text-cyan-400" />}
                </div>
                <p className="text-[10px] text-slate-400">
                  Registered hydraulic engineering overland flow modeling, DFL certification, and pad level report.
                </p>
              </div>
              <span className="font-bold text-xs text-cyan-400 font-mono flex-none">
                +{formatAud(site.floodReportCost ?? 1500)}
              </span>
            </div>

            {/* Acoustic Report */}
            <div
              onClick={() => onSiteChange({ acousticReportRequired: !site.acousticReportRequired })}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                site.acousticReportRequired
                  ? "border-indigo-500 bg-indigo-950/20 ring-1 ring-indigo-500/40"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-white">Acoustic Noise Corridor Assessment Report</span>
                  {site.acousticReportRequired && <Check className="h-3.5 w-3.5 text-indigo-400" />}
                </div>
                <p className="text-[10px] text-slate-400">
                  QDC MP 4.4 transport noise corridor testing, decibel frequency analysis, and engineering glazing schedule.
                </p>
              </div>
              <span className="font-bold text-xs text-indigo-400 font-mono flex-none">
                +{formatAud(site.acousticReportCost ?? 1200)}
              </span>
            </div>
          </div>

          {/* RHS: Physical Construction Rating Allowances */}
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider">
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
              2. Construction &amp; Rating Allowances (RHS)
            </div>

            {/* Bushfire BAL Rating Dropdown */}
            <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-amber-400" />
                  Bushfire Attack Level (BAL) Allowance
                </Label>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {currentBalCost === 0 ? "($0)" : `+${formatAud(currentBalCost)}`}
                </span>
              </div>
              <Select value={site.bushfireBal} onValueChange={(v: any) => handleBalChange(v)}>
                <SelectTrigger className="border-slate-800 bg-slate-950 text-xs text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                  {BUSHFIRE_LEVELS.map((b) => {
                    const cost = getBushfireCost(b.id, isDouble);
                    return (
                      <SelectItem key={b.id} value={b.id}>
                        {b.id} {cost > 0 ? `(+${formatAud(cost)})` : "($0)"}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Flood Pad Elevation Allowance */}
            <div
              onClick={() => onSiteChange({ floodOverlayRequired: !site.floodOverlayRequired })}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                site.floodOverlayRequired
                  ? "border-cyan-500 bg-cyan-950/20 ring-1 ring-cyan-500/40"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-white">Slab Elevation &amp; Flood Pad Works</span>
                  {site.floodOverlayRequired && <Check className="h-3.5 w-3.5 text-cyan-400" />}
                </div>
                <p className="text-[10px] text-slate-400">
                  Engineered elevated building pad, compaction testing, and perimeter swale drainage.
                </p>
              </div>
              <span className="font-bold text-xs text-cyan-400 font-mono flex-none">
                +{formatAud(site.floodOverlayCost ?? 4800)}
              </span>
            </div>

            {/* Acoustic Attenuation Tier Dropdown */}
            <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                  <Volume2 className="h-3.5 w-3.5 text-indigo-400" />
                  Acoustic Attenuation Package Allowance
                </Label>
                <span className="text-xs font-mono font-bold text-indigo-400">
                  {currentAcousticCost === 0 ? "($0)" : `+${formatAud(currentAcousticCost)}`}
                </span>
              </div>
              <Select value={site.acousticTier} onValueChange={(v: any) => handleAcousticChange(v)}>
                <SelectTrigger className="border-slate-800 bg-slate-950 text-xs text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                  {ACOUSTIC_TIERS.map((a) => {
                    const cost = getAcousticCost(a.id, isDouble);
                    return (
                      <SelectItem key={a.id} value={a.id}>
                        {a.id} {cost > 0 ? `(+${formatAud(cost)})` : "($0)"}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Council & Statutory Applications */}
      <div className="space-y-3 bg-slate-950/70 p-5 rounded-2xl border border-slate-800">
        <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 text-indigo-400" />
          Council &amp; Statutory Applications
        </Label>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Council Jurisdiction */}
          <div className="space-y-1.5 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
              Council Jurisdiction Fee
            </Label>
            <Select value={site.councilRegion} onValueChange={handleCouncilChange}>
              <SelectTrigger className="border-slate-800 bg-slate-950 text-xs text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                <SelectItem value="Brisbane City Council">Brisbane City Council (Standard $0)</SelectItem>
                <SelectItem value="Logan City Council">Logan City Council (+$2,227)</SelectItem>
                <SelectItem value="Ipswich City Council">Ipswich City Council (+$2,227)</SelectItem>
                <SelectItem value="Moreton Bay Regional Council">Moreton Bay Regional Council (+$2,227)</SelectItem>
                <SelectItem value="Gold Coast City Council">Gold Coast City Council (+$2,950)</SelectItem>
                <SelectItem value="Sunshine Coast Council">Sunshine Coast Council (+$2,950)</SelectItem>
                <SelectItem value="Council Fee Allowance (No Location Mentioned)">Council Fee Allowance — No Location ($2,200)</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-[10px] text-slate-400 block pt-1">
              Statutory plumbing, sewer &amp; archiving fees: <strong className="text-slate-200">{formatAud(site.councilFee)}</strong>
            </span>
          </div>

          {/* Council DA Application ($8,000) */}
          <div
            onClick={() => onSiteChange({ councilDaRequired: !site.councilDaRequired })}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
              site.councilDaRequired
                ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/40"
                : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white">Council DA Application</span>
                {site.councilDaRequired && <Check className="h-4 w-4 text-emerald-400" />}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Town planning statement of reasons, overlay code triggers, and formal council lodgement.
              </p>
            </div>
            <span className="font-bold text-xs text-emerald-400 font-mono mt-2 block text-right">
              +{formatAud(site.councilDaCost ?? 8000)}
            </span>
          </div>

          {/* Traffic Control ($10,000 with increments of $2,500) */}
          <div
            className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
              site.trafficControlRequired
                ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/40"
                : "border-slate-800 bg-slate-900/60"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span
                  onClick={() => onSiteChange({ trafficControlRequired: !site.trafficControlRequired })}
                  className="font-bold text-xs text-white cursor-pointer hover:underline"
                >
                  Traffic Management Plan
                </span>
                <input
                  type="checkbox"
                  checked={site.trafficControlRequired || false}
                  onChange={(e) => onSiteChange({ trafficControlRequired: e.target.checked })}
                  className="h-4 w-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Certified TGS &amp; safety corridor management ($2,500 increments).
              </p>
            </div>

            <div className="flex items-center justify-between gap-1.5 pt-2 mt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleTrafficStep(-2500)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Decrease $2,500"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="font-bold text-xs text-emerald-400 font-mono">
                {formatAud(site.trafficControlCost ?? 10000)}
              </span>
              <button
                type="button"
                onClick={() => handleTrafficStep(2500)}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Increase $2,500"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Infrastructure Fee for Dual Living ($23,000) */}
          <div
            onClick={() => onSiteChange({ dualLivingInfrastructureRequired: !site.dualLivingInfrastructureRequired })}
            className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
              site.dualLivingInfrastructureRequired
                ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/40"
                : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white">Dual Living Infrastructure Fee</span>
                {site.dualLivingInfrastructureRequired && <Check className="h-4 w-4 text-emerald-400" />}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Council headworks &amp; water/sewer network infrastructure charge for auxiliary / dual living units.
              </p>
            </div>
            <span className="font-bold text-xs text-emerald-400 font-mono mt-2 block text-right">
              +{formatAud(site.dualLivingInfrastructureCost ?? 23000)}
            </span>
          </div>
        </div>
      </div>

      {/* Section 5: Geotechnical & Site Allowances */}
      <div className="space-y-3 bg-slate-950/70 p-5 rounded-2xl border border-slate-800">
        <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
          <Mountain className="h-3.5 w-3.5 text-amber-400" />
          Geotechnical &amp; Site Allowances
        </Label>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Screw Piering Allowance ($85/m2) */}
          <div
            className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
              site.screwPieringRequired
                ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/40"
                : "border-slate-800 bg-slate-900/60"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span
                  onClick={() => onSiteChange({ screwPieringRequired: !site.screwPieringRequired })}
                  className="font-bold text-xs text-white cursor-pointer hover:underline"
                >
                  Screw Piering Allowance (KDRB / Fill)
                </span>
                <input
                  type="checkbox"
                  checked={site.screwPieringRequired || false}
                  onChange={(e) => onSiteChange({ screwPieringRequired: e.target.checked })}
                  className="h-4 w-4 accent-emerald-500 rounded cursor-pointer"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Allowance for helical screw piering due to KDRB demolition site or uncontrolled fill ($85 × {gfaM2} m² GFA).
              </p>
            </div>
            <span className="font-bold text-xs text-emerald-400 font-mono mt-2 block text-right">
              +{formatAud(site.screwPieringCost ?? Math.round(gfaM2 * 85))}
            </span>
          </div>

          {/* Rock Excavation Allowance */}
          <div className="space-y-1.5 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
              <Mountain className="h-3.5 w-3.5 text-amber-400" />
              Rock Excavation Allowance ($)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                step="500"
                value={site.rockExcavationAllowance || ""}
                onChange={(e) => onSiteChange({ rockExcavationAllowance: Math.max(0, Number(e.target.value)) })}
                placeholder="2500"
                className="h-9 text-xs border-slate-800 bg-slate-950 text-slate-100 font-mono font-bold"
              />
            </div>
            <span className="text-[10px] text-slate-500 font-mono block">
              Allowance: {formatAud(rockCost)}
            </span>
          </div>

          {/* Retaining Wall Allowance */}
          <div className="space-y-1.5 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
              <Hammer className="h-3.5 w-3.5 text-cyan-400" />
              Retaining Wall Allowance ($)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                step="500"
                value={site.retainingWallAllowance || ""}
                onChange={(e) => onSiteChange({ retainingWallAllowance: Math.max(0, Number(e.target.value)) })}
                placeholder="0"
                className="h-9 text-xs border-slate-800 bg-slate-950 text-slate-100 font-mono font-bold"
              />
            </div>
            <span className="text-[10px] text-slate-500 font-mono block">
              Allowance: {formatAud(retainingCost)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
