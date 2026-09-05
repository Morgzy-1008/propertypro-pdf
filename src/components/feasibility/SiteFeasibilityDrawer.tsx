import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  Compass,
  Building,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Waves,
  Bus,
  School,
  Zap,
  Trees,
  CheckCircle2,
  DollarSign,
  Maximize2,
  ExternalLink,
  Info,
  Sliders,
  Sparkles,
  Layers,
  ArrowRight,
  HelpCircle,
  Eye,
} from "lucide-react";
import { formatAud } from "@/lib/pricing";
import {
  SiteFeasibilityDossier,
  FeasibilityMode,
  HouseStoreyType,
  EditableAllowanceItem,
  SetbackRules,
} from "@/lib/feasibility/feasibilityTypes";
import {
  runSiteFeasibilityAnalysis,
} from "@/lib/feasibility/qspatialCadastreService";
import {
  getAllEstateStages,
  resolveSetbacksForStorey,
  EstateStagePoD,
} from "@/lib/feasibility/estateVaultStorage";

interface SiteFeasibilityDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialAddress?: string;
  initialMode?: FeasibilityMode;
  initialStorey?: HouseStoreyType;
  initialHouseDesign?: string;
  onApplyAllowances?: (dossier: SiteFeasibilityDossier, appliedItems: EditableAllowanceItem[]) => void;
}

export function SiteFeasibilityDrawer({
  open,
  onOpenChange,
  initialAddress = "Lot 243, 61 Paradise Road, Flagstone",
  initialMode = "greenfield",
  initialStorey = "single",
  initialHouseDesign = "Amber 21",
  onApplyAllowances,
}: SiteFeasibilityDrawerProps) {
  const [addressInput, setAddressInput] = useState(initialAddress);
  const [mode, setMode] = useState<FeasibilityMode>(initialMode);
  const [houseStorey, setHouseStorey] = useState<HouseStoreyType>(initialStorey);
  const [selectedStageId, setSelectedStageId] = useState<string>(
    initialMode === "brownfield_kdrb" ? "qdc_statutory" : "flagstone_stg12"
  );
  const [activeTab, setActiveTab] = useState<"aerial_street" | "siting_envelope" | "hazard_radar" | "allowances">("aerial_street");
  const [loading, setLoading] = useState(false);
  const [dossier, setDossier] = useState<SiteFeasibilityDossier | null>(null);
  const [editableAllowances, setEditableAllowances] = useState<EditableAllowanceItem[]>([]);

  const estateStages = useMemo(() => getAllEstateStages(), []);

  // Run feasibility analysis
  const executeAnalysis = async (
    searchQuery?: string,
    selectedMode?: FeasibilityMode,
    selectedStorey?: HouseStoreyType,
    stageId?: string
  ) => {
    setLoading(true);
    try {
      const q = searchQuery || addressInput;
      const m = selectedMode || mode;
      const s = selectedStorey || houseStorey;
      const stg = m === "brownfield_kdrb" ? "qdc_statutory" : (stageId || (selectedStageId === "qdc_statutory" ? "flagstone_stg12" : selectedStageId));

      const result = await runSiteFeasibilityAnalysis({
        addressOrLot: q,
        mode: m,
        houseStorey: s,
        estateStageId: stg,
        houseDesignName: initialHouseDesign,
      });

      setDossier(result);
      setEditableAllowances(result.allowances);
      if (result.stageId) setSelectedStageId(result.stageId);
    } catch (e) {
      console.error("Feasibility analysis failed:", e);
    } finally {
      setLoading(false);
    }
  };

  // Synchronize and re-scan when modal opens or initial props change
  useEffect(() => {
    if (open) {
      const addr = initialAddress || addressInput;
      const m = initialMode || mode;
      const st = initialStorey || houseStorey;
      const stg = m === "brownfield_kdrb" ? "qdc_statutory" : (selectedStageId === "qdc_statutory" ? "flagstone_stg12" : selectedStageId);

      setAddressInput(addr);
      setMode(m);
      setHouseStorey(st);
      setSelectedStageId(stg);
      executeAnalysis(addr, m, st, stg);
    }
  }, [open, initialAddress, initialMode, initialStorey]);

  // Handle Greenfield vs Brownfield mode change
  const handleModeChange = (newMode: FeasibilityMode) => {
    setMode(newMode);
    const targetStage = newMode === "brownfield_kdrb" ? "qdc_statutory" : (selectedStageId === "qdc_statutory" ? "flagstone_stg12" : selectedStageId);
    setSelectedStageId(targetStage);
    executeAnalysis(addressInput, newMode, houseStorey, targetStage);
  };

  // Handle house storey change (SS vs DS)
  const handleStoreyChange = (newStorey: HouseStoreyType) => {
    setHouseStorey(newStorey);
    if (dossier) {
      const activeStageId = mode === "brownfield_kdrb" ? "qdc_statutory" : selectedStageId;
      const stage = estateStages.find((s) => s.id === activeStageId) || estateStages[0];
      const newSetbacks = resolveSetbacksForStorey(stage, newStorey);
      setDossier({
        ...dossier,
        houseStorey: newStorey,
        activeSetbacks: newSetbacks,
      });
    }
  };

  // Handle stage change
  const handleStageChange = (newStageId: string) => {
    setSelectedStageId(newStageId);
    executeAnalysis(addressInput, mode, houseStorey, newStageId);
  };

  // Allowance editing functions
  const toggleAllowance = (id: string) => {
    setEditableAllowances((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isApplied: !item.isApplied } : item))
    );
  };

  const updateAllowanceAmount = (id: string, amount: number) => {
    setEditableAllowances((prev) =>
      prev.map((item) => (item.id === id ? { ...item, currentAmount: Math.max(0, amount) } : item))
    );
  };

  const stepAllowanceAmount = (id: string, delta: number) => {
    setEditableAllowances((prev) =>
      prev.map((item) => (item.id === id ? { ...item, currentAmount: Math.max(0, item.currentAmount + delta) } : item))
    );
  };

  const totalAppliedAllowances = useMemo(() => {
    return editableAllowances
      .filter((a) => a.isApplied)
      .reduce((sum, a) => sum + a.currentAmount, 0);
  }, [editableAllowances]);

  const handleApply = () => {
    if (!dossier) return;
    const finalDossier: SiteFeasibilityDossier = {
      ...dossier,
      allowances: editableAllowances,
      totalAllowancesCost: totalAppliedAllowances,
    };
    onApplyAllowances?.(finalDossier, editableAllowances.filter((a) => a.isApplied));
    onOpenChange(false);
  };

  const parcel = dossier?.parcel;
  const surrounding = dossier?.surrounding;
  const overlays = dossier?.overlays;
  const setbacks = dossier?.activeSetbacks;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto bg-slate-950 border-slate-800 text-slate-100 p-6 shadow-2xl">
        <DialogHeader className="border-b border-slate-800/80 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Compass className="h-4 w-4 animate-spin-slow" />
                </div>
                <DialogTitle className="text-base sm:text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
                  NHC Site Feasibility &amp; Archistar-Equivalent Dossier Engine
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    $0 Gov Spatial DCDB
                  </span>
                </DialogTitle>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Instant surveyed cadastral boundaries, Queensland SPP planning overlays, bus stops, school zones, and Archistar-equivalent 1st-person street inspection.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start">
              <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-right">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">Total Allowances</span>
                <span className="text-sm font-black font-mono text-emerald-400">{formatAud(totalAppliedAllowances)}</span>
              </div>
            </div>
          </div>

          {/* Top Control Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-3">
            {/* Address Search */}
            <div className="sm:col-span-4">
              <Label className="text-[10.5px] uppercase font-semibold text-slate-400">Address / Lot / Estate Query</Label>
              <div className="flex gap-1.5 mt-1">
                <Input
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="e.g. Lot 243, 61 Paradise Rd, Flagstone"
                  className="border-slate-800 bg-slate-900 text-xs font-semibold text-white h-8"
                  onKeyDown={(e) => e.key === "Enter" && executeAnalysis()}
                />
                <Button
                  size="sm"
                  onClick={() => executeAnalysis()}
                  disabled={loading}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs h-8 px-3"
                >
                  {loading ? "Scanning..." : "Scan"}
                </Button>
              </div>
            </div>

            {/* Greenfield vs Brownfield */}
            <div className="sm:col-span-2">
              <Label className="text-[10.5px] uppercase font-semibold text-slate-400">Build Type</Label>
              <Select
                value={mode}
                onValueChange={(v: FeasibilityMode) => handleModeChange(v)}
              >
                <SelectTrigger className="border-slate-800 bg-slate-900 text-xs h-8 font-semibold text-cyan-400 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                  <SelectItem value="greenfield">Greenfield Estate</SelectItem>
                  <SelectItem value="brownfield_kdrb">Brownfield / KDRB</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Estate & Stage Selector (Only for Greenfield) */}
            {mode === "greenfield" ? (
              <div className="sm:col-span-3">
                <Label className="text-[10.5px] uppercase font-semibold text-slate-400">Estate &amp; Stage PoD Rules</Label>
                <Select value={selectedStageId} onValueChange={handleStageChange}>
                  <SelectTrigger className="border-slate-800 bg-slate-900 text-xs h-8 font-medium text-slate-200 mt-1 truncate">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-800 bg-slate-900 text-slate-200 max-h-64">
                    {estateStages
                      .filter((s) => s.id !== "qdc_statutory")
                      .map((stage) => (
                        <SelectItem key={stage.id} value={stage.id} className="text-xs">
                          {stage.estateName} — {stage.stageName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="sm:col-span-3">
                <Label className="text-[10.5px] uppercase font-semibold text-amber-400">Statutory Planning Framework</Label>
                <div className="h-8 rounded-md bg-amber-950/40 border border-amber-500/40 px-2.5 flex items-center justify-between mt-1 text-xs text-amber-200">
                  <span className="font-bold flex items-center gap-1.5 truncate text-[11px]">
                    <ShieldCheck className="h-3.5 w-3.5 text-amber-400 flex-none" />
                    QDC MP 1.1 / 1.2 Infill (No Estate)
                  </span>
                  <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 flex-none font-bold">
                    Statutory
                  </span>
                </div>
              </div>
            )}

            {/* House Storey Filter */}
            <div className="sm:col-span-3">
              <Label className="text-[10.5px] uppercase font-semibold text-slate-400">House Storey Rule Filter</Label>
              <div className="grid grid-cols-2 gap-1 mt-1">
                <button
                  type="button"
                  onClick={() => handleStoreyChange("single")}
                  className={`h-8 px-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    houseStorey === "single"
                      ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Building className="h-3 w-3" />
                  Single Storey
                </button>
                <button
                  type="button"
                  onClick={() => handleStoreyChange("double")}
                  className={`h-8 px-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    houseStorey === "double"
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Building className="h-3 w-3" />
                  Double Storey
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800/80 gap-2 mt-4">
            <button
              type="button"
              onClick={() => setActiveTab("aerial_street")}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === "aerial_street"
                  ? "border-cyan-400 text-cyan-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              1. Satellite &amp; 1st-Person Street View
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("siting_envelope")}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === "siting_envelope"
                  ? "border-cyan-400 text-cyan-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              2. Siting Envelope &amp; Setbacks ({houseStorey === "double" ? "Double Storey" : "Single Storey"})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("hazard_radar")}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === "hazard_radar"
                  ? "border-cyan-400 text-cyan-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              3. Hazard &amp; Surrounding Radar
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("allowances")}
              className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === "allowances"
                  ? "border-emerald-400 text-emerald-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <DollarSign className="h-3.5 w-3.5" />
              4. Editable Allowances Checklist ({editableAllowances.filter((a) => a.isApplied).length})
            </button>
          </div>
        </DialogHeader>

        {/* Tab 1: Aerial Satellite & 1st-Person Street Inspection */}
        {activeTab === "aerial_street" && parcel && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Satellite High-Res Map View */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Compass className="h-3.5 w-3.5 text-cyan-400" />
                    Aerial Cadastral &amp; Boundary Map
                  </span>
                  <span className="text-[10.5px] font-mono text-cyan-400">
                    Lat: {parcel.latitude.toFixed(4)}, Lng: {parcel.longitude.toFixed(4)}
                  </span>
                </div>
                <div className="relative h-64 rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center">
                  <iframe
                    title="Aerial Satellite Map"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight={0}
                    marginWidth={0}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${parcel.longitude - 0.003}%2C${parcel.latitude - 0.003}%2C${parcel.longitude + 0.003}%2C${parcel.latitude + 0.003}&layer=mapnik&marker=${parcel.latitude}%2C${parcel.longitude}`}
                    className="w-full h-full opacity-90"
                  />
                  <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-md px-2 py-1 rounded text-[10px] text-slate-300 font-mono border border-slate-800">
                    {parcel.standardLotPlan} &bull; {parcel.areaM2} m² ({parcel.frontageM}m &times; {parcel.depthM}m)
                  </div>
                </div>
              </div>

              {/* 1st-Person Street View Inspection Frame */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-amber-400" />
                    Archistar-Equivalent 1st-Person Street Inspection
                  </span>
                  <a
                    href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${parcel.latitude},${parcel.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10.5px] text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    Open Google Street View <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="relative h-64 rounded-lg overflow-hidden border border-slate-800 bg-slate-950 flex flex-col items-center justify-center text-center p-4">
                  <div className="h-12 w-12 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2">
                    <Eye className="h-6 w-6" />
                  </div>
                  <strong className="text-xs text-white">1st-Person Street View Ready</strong>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                    Inspect physical streetscape constraints: road kerb, power poles, overhead wires, bus stops, school crossings, and neighbour setbacks.
                  </p>
                  <a
                    href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${parcel.latitude},${parcel.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-md transition-all"
                  >
                    Launch Full Panoramic 360&deg; Street View <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Surrounding Constraint Radar Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-none ${
                  surrounding?.hasBusStopWithin50m ? "bg-red-500/20 text-red-400 border border-red-500/40" : "bg-slate-800 text-slate-400"
                }`}>
                  <Bus className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Bus Stop (&lt;50m)</span>
                  <span className={`text-xs font-bold ${surrounding?.hasBusStopWithin50m ? "text-red-400" : "text-slate-300"}`}>
                    {surrounding?.hasBusStopWithin50m ? `${surrounding.busStopDistanceM}m Away (Flagged)` : "None Detected"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-none ${
                  surrounding?.hasSchoolWithin100m ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" : "bg-slate-800 text-slate-400"
                }`}>
                  <School className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">School Zone (&lt;100m)</span>
                  <span className={`text-xs font-bold ${surrounding?.hasSchoolWithin100m ? "text-amber-400" : "text-slate-300"}`}>
                    {surrounding?.hasSchoolWithin100m ? `${surrounding.schoolDistanceM}m Away` : "None Detected"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-none ${
                  surrounding?.hasPowerPoleOnFrontage || surrounding?.hasOverheadPowerLines ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" : "bg-slate-800 text-slate-400"
                }`}>
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Power Infrastructure</span>
                  <span className="text-xs font-bold text-slate-300">
                    {surrounding?.hasPowerPoleOnFrontage ? "Pole on Frontage" : surrounding?.hasOverheadPowerLines ? "Overhead Lines" : "Underground Clean"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-none ${
                  surrounding?.trafficControlRequired ? "bg-red-500/20 text-red-400 border border-red-500/40" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                }`}>
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Traffic Control ($10k)</span>
                  <span className={`text-xs font-extrabold ${surrounding?.trafficControlRequired ? "text-red-400" : "text-emerald-400"}`}>
                    {surrounding?.trafficControlRequired ? "MANDATORY ($10,000)" : "Not Required ($0)"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Siting Envelope & Clearances */}
        {activeTab === "siting_envelope" && setbacks && parcel && (
          <div className="space-y-4 py-2">
            <div className="bg-gradient-to-r from-cyan-950/40 to-slate-900 border border-cyan-500/30 p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-cyan-400" />
                <span className="text-xs font-bold text-cyan-200">
                  Active Setbacks Calibrated for:{" "}
                  <span className="uppercase text-white underline decoration-cyan-400">
                    {houseStorey === "double" ? "Double Storey Home" : "Single Storey Home"}
                  </span>
                </span>
              </div>
              <span className="text-[10.5px] font-mono text-slate-400">
                Source: {setbacks.sourceDocument}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="text-[10.5px] uppercase font-semibold text-slate-400 block">Front OMP Setback</span>
                <span className="text-lg font-black font-mono text-cyan-400">{setbacks.frontOmpM}m</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">To outermost projection</span>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="text-[10.5px] uppercase font-semibold text-slate-400 block">Front Garage Setback</span>
                <span className="text-lg font-black font-mono text-cyan-400">{setbacks.frontGarageM}m</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">To garage door face</span>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="text-[10.5px] uppercase font-semibold text-slate-400 block">
                  Side Boundary ({houseStorey === "double" ? "Upper Floor" : "Standard"})
                </span>
                <span className="text-lg font-black font-mono text-amber-400">
                  {houseStorey === "double" ? `${setbacks.sideUpperM}m (Upper)` : `${setbacks.sideStandardM}m`}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  BTB permitted: {setbacks.sideBtbM > 0 ? `${setbacks.sideBtbM}m offset` : "No BTB"}
                </span>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="text-[10.5px] uppercase font-semibold text-slate-400 block">Rear Setback</span>
                <span className="text-lg font-black font-mono text-emerald-400">{setbacks.rearM}m</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Max coverage: {setbacks.maxSiteCoveragePct}%</span>
              </div>
            </div>

            {/* Building Envelope Sizing Summary */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <strong className="text-xs text-white block">Maximum Buildable Building Envelope</strong>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Calculated from lot width ({parcel.frontageM}m) minus side setbacks &times; lot depth ({parcel.depthM}m) minus front &amp; rear setbacks.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] uppercase text-slate-400 block">Max Envelope Width</span>
                  <span className="text-sm font-bold font-mono text-cyan-400">
                    {(parcel.frontageM - setbacks.sideStandardM - (setbacks.sideBtbM || setbacks.sideStandardM)).toFixed(1)}m
                  </span>
                </div>
                <div className="text-right border-l border-slate-800 pl-3">
                  <span className="text-[10px] uppercase text-slate-400 block">Max Envelope Depth</span>
                  <span className="text-sm font-bold font-mono text-cyan-400">
                    {(parcel.depthM - setbacks.frontOmpM - setbacks.rearM).toFixed(1)}m
                  </span>
                </div>
                <div className="text-right border-l border-slate-800 pl-3">
                  <span className="text-[10px] uppercase text-slate-400 block">Max Footprint M²</span>
                  <span className="text-sm font-bold font-mono text-emerald-400">
                    {Math.round(parcel.areaM2 * (setbacks.maxSiteCoveragePct / 100))} m²
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Hazard Radar & Overlays */}
        {activeTab === "hazard_radar" && overlays && (
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Bushfire */}
              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Flame className="h-4 w-4" /> Bushfire (SPP Overlay)
                  </span>
                  <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40">
                    {overlays.bushfireBal}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {overlays.bushfireBal === "None"
                    ? "Site is clear of statutory bushfire hazard overlay."
                    : `Buffer zone ${overlays.bushfireBufferM || 50}m from bushland. Requires BAL compliance screens, seals, and certified report.`}
                </p>
                <div className="pt-1 flex items-center justify-between text-xs border-t border-slate-800">
                  <span className="text-slate-400">Allowance:</span>
                  <span className="font-bold text-amber-300 font-mono">{formatAud(overlays.bushfireCost)}</span>
                </div>
              </div>

              {/* Flood */}
              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                    <Waves className="h-4 w-4" /> Flood / Overland Flow
                  </span>
                  <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/40">
                    {overlays.floodHazard}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  {overlays.floodHazard === "None"
                    ? "No river or overland flow flooding detected within property boundaries."
                    : `Finished floor level must be elevated ${overlays.recommendedSlabElevationM || 0.3}m above ground.`}
                </p>
                <div className="pt-1 flex items-center justify-between text-xs border-t border-slate-800">
                  <span className="text-slate-400">Allowance:</span>
                  <span className="font-bold text-blue-300 font-mono">{formatAud(overlays.floodCost)}</span>
                </div>
              </div>

              {/* Contours & Fall */}
              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Compass className="h-4 w-4" /> Contours &amp; Site Fall
                  </span>
                  <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40">
                    {overlays.contoursFallM}m Fall
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Slope orientation: {overlays.slopeDirection}. Standard Hudson contract includes up to 1.0m fall.
                </p>
                <div className="pt-1 flex items-center justify-between text-xs border-t border-slate-800">
                  <span className="text-slate-400">Extra Fall Allowance:</span>
                  <span className="font-bold text-emerald-300 font-mono">{formatAud(overlays.fallCost)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Editable Allowances Checklist */}
        {activeTab === "allowances" && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <div>
                <strong className="text-xs text-white">Itemized Site &amp; Covenant Allowances</strong>
                <p className="text-[11px] text-slate-400">
                  Adjust any dollar amount before applying. Checked items will be automatically injected into the Quote and Tender Request.
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase text-slate-400 block font-semibold">Total Selected</span>
                <span className="text-base font-black font-mono text-emerald-400">{formatAud(totalAppliedAllowances)}</span>
              </div>
            </div>

            <div className="space-y-2.5 max-h-[46vh] overflow-y-auto pr-1">
              {editableAllowances.map((item) => {
                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      item.isApplied
                        ? "bg-slate-900/90 border-slate-700 shadow-sm"
                        : "bg-slate-950/40 border-slate-800/60 opacity-60"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={item.isApplied}
                        onChange={() => toggleAllowance(item.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-xs font-bold text-white">{item.title}</strong>
                          <span className="text-[9.5px] uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            {item.category}
                          </span>
                          {item.isRequired && (
                            <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                              Mandatory
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 max-w-xl">{item.description}</p>
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">{item.rationale}</span>
                      </div>
                    </div>

                    {/* Editable Dollar Input */}
                    <div className="flex items-center gap-2 self-end sm:self-center flex-none">
                      <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => stepAllowanceAmount(item.id, -500)}
                          className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-900 text-xs font-mono"
                        >
                          -$500
                        </button>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1.5 text-xs text-slate-400">$</span>
                          <Input
                            type="number"
                            value={item.currentAmount}
                            onChange={(e) => updateAllowanceAmount(item.id, Number(e.target.value) || 0)}
                            className="w-24 pl-5 h-7 text-xs font-mono font-bold text-emerald-400 bg-transparent border-0 text-right pr-2 focus-visible:ring-0"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => stepAllowanceAmount(item.id, 500)}
                          className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-900 text-xs font-mono"
                        >
                          +$500
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Footer */}
        <div className="border-t border-slate-800/80 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>
              {dossier?.notes || "Feasibility check ready. All adjustments sync directly into client estimate."}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs"
            >
              Close
            </Button>

            <Button
              type="button"
              onClick={handleApply}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs gap-1.5 shadow-lg shadow-emerald-500/20"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Apply Allowances ({formatAud(totalAppliedAllowances)})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
