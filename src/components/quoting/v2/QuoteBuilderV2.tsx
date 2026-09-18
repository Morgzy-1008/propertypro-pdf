import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Cpu,
  Sparkles,
  Home,
  FileText,
  Database,
  Layers,
  ArrowRight,
  Upload,
  CheckCircle2,
  Building2,
  Mountain,
  Flame,
  Volume2,
  ShieldAlert,
  Wand2,
  RefreshCw,
  Info,
  Sliders,
  ChevronDown,
  ChevronUp,
  PackageCheck,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/flyer/FlyerTemplates";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { StaffHeaderProfile } from "@/components/auth/StaffHeaderProfile";
import { useTheme } from "@/lib/theme";
import { QuoteBuilder } from "@/components/quoting/QuoteBuilder";
import { QuoteAdminCatalogue } from "@/components/quoting/QuoteAdminCatalogue";
import { toast } from "sonner";
import { formatAud } from "@/lib/pricing";

// Sample Hudson Base Plans for Recognition Testing
interface RecognitionTestPreset {
  id: string;
  name: string;
  baseDesign: string;
  baseM2: number;
  detectedModification: string;
  deltaM2: number;
  newTotalM2: number;
  estimatedCostDelta: number;
  recipeBreakdown: { recipe: string; rate: number; delta: number; subtotal: number }[];
  siteDefaults: {
    slopeFallM: number;
    cutFillAllowance: number;
    bushfireBal: string;
    bushfireCost: number;
    acousticCategory: string;
    acousticCost: number;
    isKdrb: boolean;
    kdrbCost: number;
  };
}

const PRESET_MODIFICATIONS: RecognitionTestPreset[] = [
  {
    id: "amber-21-living-ext",
    name: "Amber 21 — Living Room Extended 1.2m",
    baseDesign: "Amber 21",
    baseM2: 195.4,
    detectedModification: "Rear living wall pushed out 1,200mm across 6,000mm span (+7.20 m² slab, brickwork & trusses)",
    deltaM2: 7.2,
    newTotalM2: 202.6,
    estimatedCostDelta: 10656,
    recipeBreakdown: [
      { recipe: "Living Extension (Single Storey)", rate: 1480, delta: 7.2, subtotal: 10656 },
    ],
    siteDefaults: {
      slopeFallM: 0.8,
      cutFillAllowance: 4800,
      bushfireBal: "BAL-12.5",
      bushfireCost: 4850,
      acousticCategory: "Standard (None)",
      acousticCost: 0,
      isKdrb: false,
      kdrbCost: 0,
    },
  },
  {
    id: "jasper-26-alfresco-exp",
    name: "Jasper 26 — Alfresco Grand Expansion 2.0m",
    baseDesign: "Jasper 26",
    baseM2: 242.8,
    detectedModification: "Covered alfresco slab extended 2,000mm towards rear boundary (+12.40 m² slab, piers & roofline)",
    deltaM2: 12.4,
    newTotalM2: 255.2,
    estimatedCostDelta: 11408,
    recipeBreakdown: [
      { recipe: "Alfresco Extension (Slab & Roof)", rate: 920, delta: 12.4, subtotal: 11408 },
    ],
    siteDefaults: {
      slopeFallM: 1.4,
      cutFillAllowance: 8400,
      bushfireBal: "BAL-29",
      bushfireCost: 8900,
      acousticCategory: "Cat 1 Acoustic",
      acousticCost: 2200,
      isKdrb: false,
      kdrbCost: 0,
    },
  },
  {
    id: "onyx-28-kdrb-reconfig",
    name: "Onyx 28 — KDRB Infill with Ensuite & Living Bump-Out",
    baseDesign: "Onyx 28",
    baseM2: 261.2,
    detectedModification: "Master Ensuite extended 800mm (+3.2 m² wet area) & Ground Living extended 1.0m (+6.0 m²)",
    deltaM2: 9.2,
    newTotalM2: 270.4,
    estimatedCostDelta: 16400,
    recipeBreakdown: [
      { recipe: "Bathroom / Ensuite Extension (Waterproofing & Plumbing)", rate: 2350, delta: 3.2, subtotal: 7520 },
      { recipe: "Living Extension (Single Storey)", rate: 1480, delta: 6.0, subtotal: 8880 },
    ],
    siteDefaults: {
      slopeFallM: 1.1,
      cutFillAllowance: 6600,
      bushfireBal: "Standard (None)",
      bushfireCost: 0,
      acousticCategory: "Cat 2 Acoustic (Main Road)",
      acousticCost: 4500,
      isKdrb: true,
      kdrbCost: 18500,
    },
  },
];

export function QuoteBuilderV2() {
  const { mode } = useTheme();
  const isLight = mode === "normal";

  const [isEngineExpanded, setIsEngineExpanded] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<RecognitionTestPreset | null>(PRESET_MODIFICATIONS[0]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(100);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const simulateScan = (preset: RecognitionTestPreset, customName?: string) => {
    setIsScanning(true);
    setScanProgress(15);
    setUploadedFileName(customName || `${preset.baseDesign}_Modified_Sheet.pdf`);

    setTimeout(() => setScanProgress(45), 350);
    setTimeout(() => setScanProgress(75), 700);
    setTimeout(() => {
      setScanProgress(100);
      setIsScanning(false);
      setSelectedPreset(preset);
      toast.success(
        `✨ Recognition Engine Verified: ${preset.baseDesign} matched! ${preset.deltaM2 > 0 ? `+${preset.deltaM2} m² detected (${formatAud(preset.estimatedCostDelta)} Databuild recipe addition)` : "Standard plan confirmed"}`
      );
    }, 1000);
  };

  const handleApplyToQuote = () => {
    if (!selectedPreset) return;

    // Bridge the recognized data into local storage so QuoteBuilder picks it up immediately
    const bridgePayload = {
      designName: selectedPreset.baseDesign,
      housingType: selectedPreset.baseDesign.includes("Onyx") || selectedPreset.baseDesign.includes("Jasper") ? "Single Storey" : "Single Storey",
      standardDesignM2: selectedPreset.baseM2,
      modifiedDesignM2: selectedPreset.newTotalM2,
      isModifiedFloorplan: true,
      modifiedAreas: {
        livingM2: selectedPreset.baseDesign.includes("Amber") ? 142.2 : 160.0,
        garageM2: 34.5,
        alfrescoM2: selectedPreset.baseDesign.includes("Jasper") ? 24.4 : 12.0,
        porchM2: 3.5,
        totalM2: selectedPreset.newTotalM2,
      },
      clientName: "Automated Recognition Demo Client",
      notes: `Auto-recognized from modified floorplan: ${selectedPreset.detectedModification}. Databuild recipe rate applied: ${formatAud(selectedPreset.estimatedCostDelta)}.`,
    };

    localStorage.setItem("hudson_imported_floorplan_bridge", JSON.stringify(bridgePayload));

    toast.success("🚀 Applied recognized plan & Databuild delta to active quote! Reloading workspace...");
    window.location.reload();
  };

  return (
    <div className={`min-h-screen ${isLight ? "bg-slate-50 text-slate-900" : "bg-slate-950 text-slate-100"} font-sans selection:bg-cyan-500/30 relative overflow-hidden flex flex-col`}>
      {/* Ambient Gradient Lights */}
      <div className="ambient-glow-cyan h-96 w-96 -top-20 -right-20 pointer-events-none opacity-40" />
      <div className="ambient-glow-gold h-96 w-96 -bottom-20 -left-20 pointer-events-none opacity-30" />

      {/* Top Header */}
      <header className={`border-b ${isLight ? "border-slate-200 bg-white/95 shadow-xs" : "border-slate-800 bg-slate-900/60"} backdrop-blur-md sticky top-0 z-40`}>
        <div className="w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo light={!isLight} size={11} />
            <div className={`hidden sm:block border-l ${isLight ? "border-slate-300" : "border-slate-800"} pl-4`}>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold tracking-widest ${isLight ? "text-slate-800" : "text-white"} uppercase`}>
                  Hudson Quoting System
                </span>
                <span className="text-[10px] font-bold tracking-wider uppercase text-cyan-400 bg-cyan-500/15 px-2 py-0.5 rounded-full border border-cyan-500/30 flex items-center gap-1 shadow-xs">
                  <Cpu className="h-3 w-3 text-cyan-400" />
                  v2 Auto-Pricing Beta
                </span>
              </div>
              <span className="block text-[10px] tracking-widest text-cyan-600 dark:text-cyan-400 font-semibold uppercase">
                AI Floorplan Vision Recognition &bull; Autonomous Site Costing
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            <Link to="/hub">
              <Button
                variant="ghost"
                size="sm"
                className={`text-xs ${isLight ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100" : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"} gap-1.5`}
              >
                <Home className="h-3.5 w-3.5" />
                Hub
              </Button>
            </Link>

            <Link to="/quote-builder">
              <Button
                variant="outline"
                size="sm"
                className={`text-xs gap-1.5 ${isLight ? "border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700" : "border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white"}`}
              >
                <Layers className="h-3.5 w-3.5 text-emerald-500" />
                Quoting Tool v1
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdminOpen(true)}
              className={`text-xs gap-1.5 ${isLight ? "border-slate-300 bg-white hover:bg-slate-100 text-slate-700" : "border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white"}`}
            >
              <Database className="h-3.5 w-3.5 text-amber-400" />
              Cost Recipes (Databuild)
            </Button>

            {/* NHC Active Profile */}
            <StaffHeaderProfile isLight={isLight} />
          </div>
        </div>
      </header>

      {/* Main Quoting Workspace */}
      <main className="w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-6 flex-1 relative z-10 flex flex-col gap-6">
        
        {/* Next-Gen Automated Pricing Engine Banner */}
        <section className={`rounded-2xl border ${isLight ? "border-cyan-200 bg-gradient-to-br from-cyan-50/70 via-white to-blue-50/50 shadow-sm" : "border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 via-slate-900/90 to-slate-950 shadow-xl shadow-cyan-950/30"} p-6 transition-all`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-cyan-500/20 pb-4">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25">
                <Cpu className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className={`text-xl font-bold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                    Quoting Tool v2: Automated Recognition &amp; Site Engine
                  </h1>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30">
                    Restricted: Morgan Hales
                  </span>
                </div>
                <p className={`text-xs mt-0.5 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                  Upload modified floorplans <strong>without a printed dimensions graph</strong>. Our engine aligns against Hudson master plans, detects geometric deltas, prices additions with Databuild recipes, and calculates site allowances.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEngineExpanded(!isEngineExpanded)}
                className={`text-xs gap-1.5 ${isLight ? "border-cyan-300 hover:bg-cyan-50 text-cyan-800" : "border-cyan-500/40 hover:bg-cyan-500/10 text-cyan-300"}`}
              >
                {isEngineExpanded ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" />
                    Collapse Engine Panel
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    Expand Engine Scaffolding
                  </>
                )}
              </Button>
            </div>
          </div>

          {isEngineExpanded && (
            <div className="mt-6 space-y-6">
              {/* Architecture 3-Pillar Visualizer */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                
                {/* Pillar 1: Floorplan Vision & Vector Delta Recognition */}
                <div className={`rounded-xl border ${isLight ? "border-slate-200 bg-white" : "border-slate-800 bg-slate-900/70"} p-4 flex flex-col justify-between`}>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-cyan-500 flex items-center gap-1.5">
                        <Wand2 className="h-4 w-4" />
                        1. Vision Delta Detection
                      </span>
                      <span className="text-[10px] bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 px-2 py-0.5 rounded font-mono">
                        No Schedule Table Needed
                      </span>
                    </div>

                    <p className={`text-xs ${isLight ? "text-slate-600" : "text-slate-400"} mb-4`}>
                      Drop any modified architectural sheet. The system compares wall perimeters against Hudson's canonical CAD footprint catalog to detect spatial push-outs.
                    </p>

                    {/* Drag and Drop Zone */}
                    <div className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                      isLight
                        ? "border-cyan-300 hover:border-cyan-500 bg-cyan-50/40"
                        : "border-cyan-500/30 hover:border-cyan-400 bg-slate-950/40"
                    }`}>
                      <Upload className="h-6 w-6 text-cyan-500 mx-auto mb-1.5" />
                      <p className="text-xs font-semibold">Drop Modified Floorplan (PDF / PNG)</p>
                      <p className={`text-[10px] ${isLight ? "text-slate-500" : "text-slate-400"} mt-0.5`}>
                        Scans exterior &amp; interior walls automatically
                      </p>
                    </div>

                    {/* Test Presets */}
                    <div className="mt-4">
                      <p className={`text-[11px] font-semibold uppercase tracking-wider ${isLight ? "text-slate-500" : "text-slate-400"} mb-2`}>
                        Simulate Recognition on Hudson Models:
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {PRESET_MODIFICATIONS.map((preset) => (
                          <button
                            key={preset.id}
                            onClick={() => simulateScan(preset)}
                            className={`text-left text-xs p-2 rounded-lg border transition-all flex items-center justify-between ${
                              selectedPreset?.id === preset.id
                                ? isLight
                                  ? "border-cyan-500 bg-cyan-50/80 text-cyan-950 font-medium"
                                  : "border-cyan-500 bg-cyan-950/40 text-cyan-200 font-medium"
                                : isLight
                                ? "border-slate-200 hover:bg-slate-100/60 text-slate-700"
                                : "border-slate-800 hover:bg-slate-800/40 text-slate-300"
                            }`}
                          >
                            <span className="truncate">{preset.name}</span>
                            <span className="text-[10px] opacity-75 font-mono">+{preset.deltaM2}m²</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {isScanning && (
                    <div className="mt-4 pt-3 border-t border-cyan-500/20">
                      <div className="flex items-center justify-between text-[11px] mb-1 text-cyan-400">
                        <span className="flex items-center gap-1">
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          Matching against 100+ Hudson CAD footprints...
                        </span>
                        <span>{scanProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-cyan-500 h-1.5 transition-all duration-300"
                          style={{ width: `${scanProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Pillar 2: Databuild Recipe Cost Mapping */}
                <div className={`rounded-xl border ${isLight ? "border-slate-200 bg-white" : "border-slate-800 bg-slate-900/70"} p-4 flex flex-col justify-between`}>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                        <Database className="h-4 w-4" />
                        2. Databuild Recipe Costing
                      </span>
                      <span className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-300 px-2 py-0.5 rounded font-mono">
                        Synced with Databuild
                      </span>
                    </div>

                    <p className={`text-xs ${isLight ? "text-slate-600" : "text-slate-400"} mb-3`}>
                      Detected spatial extensions automatically convert into Databuild component recipes (slab, framing, trusses, tiles, waterproofing).
                    </p>

                    {selectedPreset && (
                      <div className={`rounded-lg border p-3 ${isLight ? "bg-amber-50/40 border-amber-200" : "bg-slate-950/60 border-slate-800"}`}>
                        <div className="flex items-center justify-between border-b border-amber-500/20 pb-2 mb-2">
                          <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                            {selectedPreset.baseDesign} Detected
                          </span>
                          <span className="text-xs font-bold font-mono">
                            {formatAud(selectedPreset.estimatedCostDelta)}
                          </span>
                        </div>

                        <p className={`text-[11px] mb-2 leading-relaxed ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                          {selectedPreset.detectedModification}
                        </p>

                        <div className="space-y-1.5 text-[11px]">
                          {selectedPreset.recipeBreakdown.map((r, i) => (
                            <div key={i} className="flex items-center justify-between py-1 border-t border-slate-200/50 dark:border-slate-800/60">
                              <span className="truncate pr-2">{r.recipe}</span>
                              <span className="font-mono text-xs whitespace-nowrap">
                                {r.delta}m² &times; ${r.rate} = {formatAud(r.subtotal)}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="mt-3 pt-2 border-t border-amber-500/20 flex items-center justify-between text-xs font-bold">
                          <span>Total Modification Adjustment:</span>
                          <span className="text-amber-600 dark:text-amber-400 font-mono">
                            +{formatAud(selectedPreset.estimatedCostDelta)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <Button
                      onClick={handleApplyToQuote}
                      className="w-full text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white gap-2 shadow-sm"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Apply Recognized Plan &amp; Costing to Quote
                    </Button>
                  </div>
                </div>

                {/* Pillar 3: Autonomous Site Costing & Planning Overlays */}
                <div className={`rounded-xl border ${isLight ? "border-slate-200 bg-white" : "border-slate-800 bg-slate-900/70"} p-4 flex flex-col justify-between`}>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                        <Mountain className="h-4 w-4" />
                        3. Autonomous Site &amp; Overlays
                      </span>
                      <span className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 px-2 py-0.5 rounded font-mono">
                        Cadastre + Overlay Engine
                      </span>
                    </div>

                    <p className={`text-xs ${isLight ? "text-slate-600" : "text-slate-400"} mb-3`}>
                      Calculates slope fall cut &amp; fill, council bushfire/acoustic overlays, and KDRB asbestos demo automatically from address/cadastre.
                    </p>

                    {selectedPreset && (
                      <div className={`rounded-lg border p-3 ${isLight ? "bg-emerald-50/40 border-emerald-200" : "bg-slate-950/60 border-slate-800"} space-y-2`}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                            <Mountain className="h-3.5 w-3.5 text-emerald-500" />
                            Fall: {selectedPreset.siteDefaults.slopeFallM}m crossfall
                          </span>
                          <span className="font-mono font-semibold">
                            {formatAud(selectedPreset.siteDefaults.cutFillAllowance)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                            <Flame className="h-3.5 w-3.5 text-amber-500" />
                            Bushfire: {selectedPreset.siteDefaults.bushfireBal}
                          </span>
                          <span className="font-mono font-semibold">
                            {formatAud(selectedPreset.siteDefaults.bushfireCost)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                            <Volume2 className="h-3.5 w-3.5 text-blue-500" />
                            Acoustic: {selectedPreset.siteDefaults.acousticCategory}
                          </span>
                          <span className="font-mono font-semibold">
                            {formatAud(selectedPreset.siteDefaults.acousticCost)}
                          </span>
                        </div>

                        {selectedPreset.siteDefaults.isKdrb && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                              <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                              KDRB (Asbestos/Demo)
                            </span>
                            <span className="font-mono font-semibold text-rose-500">
                              {formatAud(selectedPreset.siteDefaults.kdrbCost)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 text-cyan-500 shrink-0" />
                    <span>Consultant only inputs lifestyle extras (ducted AC, 2.7m ceiling, etc.).</span>
                  </div>
                </div>

              </div>
            </div>
          )}
        </section>

        {/* Live Interactive Quoting Tool (Full Engine & PDF Preview) */}
        <section className="flex-1">
          <QuoteBuilder />
        </section>
      </main>

      {/* Admin Cost Recipe Catalogue Modal */}
      {isAdminOpen && (
        <QuoteAdminCatalogue
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
        />
      )}
    </div>
  );
}
