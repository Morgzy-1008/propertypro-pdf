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
  Info,
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
  getSoilRatePerM2,
} from "@/lib/quoting/quoteEngine";
import type { FullQuote, SiteConditions, SoilClass } from "@/lib/quoting/quoteTypes";

interface QuoteSiteCostsStepProps {
  quote: FullQuote;
  site: SiteConditions;
  onSiteChange: (patch: Partial<SiteConditions>) => void;
}

const SOIL_CLASSES: { id: SoilClass; name: string; rate: number; desc: string }[] = [
  {
    id: "Class S",
    name: "Class S — Slightly Reactive",
    rate: -30,
    desc: "Sand / gravel ground with negligible movement. Saves $30/m² on slab platform.",
  },
  {
    id: "Class M",
    name: "Class M — Moderately Reactive (Standard Included)",
    rate: 0,
    desc: "Standard engineered waffle pod slab system suitable for moderately reactive soil ($0).",
  },
  {
    id: "Class H1",
    name: "Class H1 — Highly Reactive Soil",
    rate: 30,
    desc: "Deepened edge beams and extra internal stiffening ribs (+$30/m² of GFA).",
  },
  {
    id: "Class H2",
    name: "Class H2 — Highly Reactive (Severe)",
    rate: 60,
    desc: "Heavy duty reinforcement and 300mm deepened perimeter beams (+$60/m² of GFA).",
  },
  {
    id: "Class E",
    name: "Class E — Extremely Reactive Soil",
    rate: 100,
    desc: "Specialised geotechnical design for extreme reactive clay ground (+$100/m² of GFA).",
  },
  {
    id: "Class P",
    name: "Class P — Problem / Fill / Mine Subsidence",
    rate: 150,
    desc: "Uncontrolled fill or soft ground requiring bored concrete piers (+$150/m² of GFA).",
  },
];

const BUSHFIRE_LEVELS = [
  { id: "None", cost: 0, desc: "Standard site (No BAL requirements)" },
  { id: "BAL-12.5", cost: 4600, desc: "Aluminium ember mesh to weep holes and subfloor" },
  { id: "BAL-19", cost: 10000, desc: "Solid timber doors, 5mm Grade A safety glass & sarking" },
  { id: "BAL-29", cost: 16500, desc: "Toughened glazing, non-combustible cladding & ember seals" },
  { id: "BAL-40", cost: 24500, desc: "Extreme fire protection with radiant heat shielding" },
] as const;

const ACOUSTIC_TIERS = [
  { id: "None", cost: 0, desc: "Standard quiet residential zone" },
  { id: "Category 1", cost: 2800, desc: "Thickened 6.38mm laminate acoustic glazing to exposed facade" },
  { id: "Category 2", cost: 4200, desc: "Acoustic perimeter seals and upgraded external glass" },
  { id: "Category 3", cost: 6800, desc: "Heavy acoustic insulation batts & laminated glass" },
] as const;

export function QuoteSiteCostsStep({ quote, site, onSiteChange }: QuoteSiteCostsStepProps) {
  const gfaM2 = calculateDesignGFA(quote.design);
  const soilRate = getSoilRatePerM2(site.soilClass);
  const soilTotalCost = Math.round(soilRate * gfaM2);

  const fallCost = calculateTopographyFallCost(site.fallMeters, gfaM2);
  const excessMeters = Math.max(0, site.fallMeters - 1.0);
  const tenthsAbove1m = Math.round(excessMeters * 10);

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
    const cost = calculateTopographyFallCost(fall, gfaM2);
    onSiteChange({
      fallMeters: fall,
      fallTotalCost: cost,
    });
  };

  const handleBalChange = (bal: (typeof BUSHFIRE_LEVELS)[number]["id"]) => {
    const item = BUSHFIRE_LEVELS.find((b) => b.id === bal) || BUSHFIRE_LEVELS[0];
    onSiteChange({ bushfireBal: bal, bushfireCost: item.cost });
  };

  const handleAcousticChange = (tier: (typeof ACOUSTIC_TIERS)[number]["id"]) => {
    const item = ACOUSTIC_TIERS.find((a) => a.id === tier) || ACOUSTIC_TIERS[0];
    onSiteChange({ acousticTier: tier, acousticCost: item.cost });
  };

  const handleCouncilChange = (region: string) => {
    let fee = 0;
    if (region.includes("Logan") || region.includes("Ipswich") || region.includes("Moreton Bay")) {
      fee = 2227;
    } else if (region.includes("Gold Coast")) {
      fee = 2950;
    } else {
      fee = 0; // Brisbane City Council
    }
    onSiteChange({ councilRegion: region, councilFee: fee });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">
              Step 3: Site Earthworks, Soil &amp; Statutory Compliance
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure site-specific engineering parameters. Surcharges dynamically calculate based on the selected floorplan GFA ({gfaM2} m²).
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
          <Layers className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-slate-400">Design Footprint GFA:</span>
          <span className="font-bold text-white font-mono">{gfaM2} m²</span>
        </div>
      </div>

      {/* Section 1: Engineered Soil Classification */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-cyan-400" />
            Engineered Soil Classification (GFA Multiplier)
          </Label>
          <span className="text-xs font-mono font-bold text-emerald-400">
            {soilTotalCost === 0 ? "Standard Included ($0)" : soilTotalCost < 0 ? `-${formatAud(Math.abs(soilTotalCost))}` : `+${formatAud(soilTotalCost)}`}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SOIL_CLASSES.map((soil) => {
            const isSelected = site.soilClass === soil.id;
            const cost = Math.round(soil.rate * gfaM2);
            return (
              <div
                key={soil.id}
                onClick={() => handleSoilSelect(soil.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/40 shadow-lg"
                    : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">{soil.name}</span>
                  {isSelected && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  {soil.desc}
                </p>
                <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {soil.rate === 0 ? "Included" : `${soil.rate > 0 ? "+" : ""}$${soil.rate}/m²`}
                  </span>
                  <span className={`font-bold font-mono ${cost < 0 ? "text-cyan-400" : cost > 0 ? "text-amber-400" : "text-slate-300"}`}>
                    {cost === 0 ? "Included" : cost < 0 ? `-${formatAud(Math.abs(cost))}` : `+${formatAud(cost)}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Topography & Fall Across Building Envelope (Rate multiplied by 10) */}
      <div className="space-y-3 bg-slate-950/70 p-5 rounded-2xl border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
              <ArrowDownUp className="h-3.5 w-3.5 text-amber-400" />
              Topography &amp; Fall Across Building Envelope (m)
            </Label>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Standard equal cut &amp; fill is included up to 1.0m fall. Every 0.1m above 1.0m is calculated as:{" "}
              <span className="font-mono text-slate-300 font-semibold">Tenths × $10 × {gfaM2} m² GFA</span>
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

      {/* Section 3: Statutory Compliance Overlays (Council, BAL, Acoustics) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Council Jurisdiction */}
        <div className="space-y-1.5 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
          <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-cyan-400" />
            Council Jurisdiction
          </Label>
          <Select
            value={site.councilRegion}
            onValueChange={handleCouncilChange}
          >
            <SelectTrigger className="border-slate-800 bg-slate-900 text-xs text-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
              <SelectItem value="Brisbane City Council">Brisbane City Council (Standard $0)</SelectItem>
              <SelectItem value="Logan City Council">Logan City Council (+$2,227)</SelectItem>
              <SelectItem value="Ipswich City Council">Ipswich City Council (+$2,227)</SelectItem>
              <SelectItem value="Moreton Bay Regional Council">Moreton Bay Regional Council (+$2,227)</SelectItem>
              <SelectItem value="Gold Coast City Council">Gold Coast City Council (+$2,950)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bushfire BAL Rating */}
        <div className="space-y-1.5 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
          <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            Bushfire Attack Level (BAL)
          </Label>
          <Select
            value={site.bushfireBal}
            onValueChange={(v: any) => handleBalChange(v)}
          >
            <SelectTrigger className="border-slate-800 bg-slate-900 text-xs text-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
              {BUSHFIRE_LEVELS.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.id} {b.cost > 0 ? `(+${formatAud(b.cost)})` : "(Included)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Transport Noise Corridor */}
        <div className="space-y-1.5 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
          <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
            <Volume2 className="h-3.5 w-3.5 text-indigo-400" />
            Transport Noise Corridor
          </Label>
          <Select
            value={site.acousticTier}
            onValueChange={(v: any) => handleAcousticChange(v)}
          >
            <SelectTrigger className="border-slate-800 bg-slate-900 text-xs text-slate-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
              {ACOUSTIC_TIERS.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.id} {a.cost > 0 ? `(+${formatAud(a.cost)})` : "(Quiet Zone)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
