import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  CadastreParcel,
  SitedHouse,
  SetbackRules,
  BasemapMode,
  DrawingScale,
} from "./siteStudioTypes";
import {
  lookupCadastreParcel,
  VERIFIED_CADASTRAL_CATALOG,
  getDisplayHomeLocationForStaff,
  getDisplayHomeParcelForStaff,
} from "@/lib/site-studio/cadastreBoundaryService";
import {
  resolveZoningRules,
  computeComplianceReport,
  canFitA3At1to100,
  ESTATE_ZONING_PRESETS,
} from "@/lib/site-studio/zoningRulesEngine";
import { HUDSON_DESIGNS_CATALOG } from "@/lib/site-studio/hudsonDesignCatalog";
import { calculateSolarOrientation } from "@/lib/site-studio/solarCalculator";
import { generateSitingPlanPdf, pushSitingToActiveTender } from "@/lib/site-studio/sitingPdfExporter";
import { SiteStudioCanvas } from "./SiteStudioCanvas";
import { SiteStudioCustomPlanModal } from "./SiteStudioCustomPlanModal";
import { getActiveStaffUser } from "@/lib/authSession";
import { useTheme } from "@/lib/theme";
import { Logo } from "@/components/flyer/FlyerTemplates";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Search,
  Compass,
  FileDown,
  Send,
  Upload,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Sun,
  Home,
  ShieldCheck,
  RotateCw,
  Ruler,
  Maximize2,
  Sparkles,
  ArrowRight,
  Building,
  DollarSign,
  MapPin,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

export function SiteStudioWorkspace() {
  const { mode } = useTheme();
  const isLight = mode === "normal";
  const navigate = useNavigate();

  const activeStaff = getActiveStaffUser();
  const consultantName = activeStaff?.name || "Morgan Hales";
  const displayHomeLocation = useMemo(() => getDisplayHomeLocationForStaff(activeStaff), [activeStaff]);

  // Search & Parcel State: starts fresh with empty address search input and consultant's display home parcel
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [parcel, setParcel] = useState<CadastreParcel>(() => getDisplayHomeParcelForStaff(activeStaff));

  // Client Details
  const [clientName, setClientName] = useState("John & Sarah Henderson");

  // Selected Sited House: starts unplaced (null) so consultant browses satellite and picks design
  const [sitedHouse, setSitedHouse] = useState<SitedHouse | null>(null);

  // Statutory Rules & Overrides
  const defaultRules = useMemo(() => {
    return resolveZoningRules({
      council: parcel.council,
      suburb: parcel.suburb,
      areaM2: parcel.areaM2,
    });
  }, [parcel.council, parcel.suburb, parcel.areaM2]);

  const [rules, setRules] = useState<SetbackRules>(defaultRules);

  useEffect(() => {
    setRules(defaultRules);
  }, [defaultRules]);

  // Viewport Settings
  const [basemapMode, setBasemapMode] = useState<BasemapMode>("satellite-hybrid");
  const [scale, setScale] = useState<DrawingScale>("1:200");
  const [showContours, setShowContours] = useState(true);
  const [showSolar, setShowSolar] = useState(true);

  // Custom Plan Upload Modal
  const [isCustomPlanModalOpen, setIsCustomPlanModalOpen] = useState(false);

  // Export State
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isPushingTender, setIsPushingTender] = useState(false);

  // Live Compliance Computation (computed only when a house is sited)
  const compliance = useMemo(() => {
    if (!sitedHouse) return null;
    return computeComplianceReport({
      parcel,
      rules,
      sitedHouse,
    });
  }, [parcel, rules, sitedHouse]);

  // Solar Orientation
  const solar = useMemo(() => {
    if (!sitedHouse) return null;
    return calculateSolarOrientation(sitedHouse.rotationDeg);
  }, [sitedHouse?.rotationDeg]);

  // A3 1:100 Scale Fit Check
  const a3ScaleFits = useMemo(() => {
    return canFitA3At1to100(parcel.frontageM, parcel.depthM);
  }, [parcel.frontageM, parcel.depthM]);

  // Handle Search Submission
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const found = await lookupCadastreParcel(searchQuery);
      setParcel(found);

      // Re-center house on new lot if already placed
      if (sitedHouse) {
        const centeredX = Math.max(0.2, Math.round(((found.frontageM - sitedHouse.widthM) / 2) * 100) / 100);
        setSitedHouse((prev) => (prev ? {
          ...prev,
          posX: centeredX,
          posY: Math.max(3.0, rules.frontSetback),
        } : null));
      }

      // If switching to a larger lot that does not fit A3 1:100, reset scale to 1:200
      if (!canFitA3At1to100(found.frontageM, found.depthM) && scale === "1:100") {
        setScale("1:200");
        toast.info("Lot dimensions exceed A3 1:100 boundary — scale set to 1:200.");
      }

      toast.success(`Cadastre loaded: ${found.standardLotPlan} (${found.areaM2}m²)`);
    } catch {
      toast.error("Could not locate address in cadastre. Using closest match.");
    } finally {
      setIsSearching(false);
    }
  };

  // Select Quick Chip Address
  const handleSelectQuickChip = (address: string) => {
    setSearchQuery(address);
    lookupCadastreParcel(address).then((found) => {
      setParcel(found);
      if (sitedHouse) {
        const centeredX = Math.max(0.2, Math.round(((found.frontageM - sitedHouse.widthM) / 2) * 100) / 100);
        setSitedHouse((prev) => (prev ? {
          ...prev,
          posX: centeredX,
          posY: Math.max(3.0, rules.frontSetback),
        } : null));
      }
    });
  };

  // Select Hudson Design
  const handleSelectDesign = (designId: string) => {
    const selected = HUDSON_DESIGNS_CATALOG.find((d) => d.id === designId);
    if (!selected) return;

    const centeredX = Math.max(0.2, Math.round(((parcel.frontageM - selected.widthM) / 2) * 100) / 100);

    setSitedHouse((prev) => ({
      designId: selected.id,
      designName: selected.name,
      source: "hudson-catalog",
      totalM2: selected.totalM2,
      widthM: selected.widthM,
      lengthM: selected.lengthM,
      posX: centeredX,
      posY: Math.max(3.0, rules.frontSetback),
      rotationDeg: prev?.rotationDeg ?? 0,
      isMirrored: prev?.isMirrored ?? false,
      isBtb: prev?.isBtb ?? false,
      btbSide: prev?.btbSide ?? "none",
      customPlanUrl: undefined,
    }));

    toast.info(`Loaded ${selected.name} (${selected.widthM}m × ${selected.lengthM}m)`);
  };

  // Handle Custom Plan Calibrated
  const handleCustomPlanCalibrated = (plan: {
    name: string;
    imageUrl: string;
    widthM: number;
    lengthM: number;
    areaM2: number;
    scalePxPerM: number;
  }) => {
    const centeredX = Math.max(0.2, Math.round(((parcel.frontageM - plan.widthM) / 2) * 100) / 100);

    setSitedHouse((prev) => ({
      designId: "custom-upload",
      designName: plan.name,
      source: "custom-upload",
      totalM2: plan.areaM2,
      widthM: plan.widthM,
      lengthM: plan.lengthM,
      posX: centeredX,
      posY: Math.max(3.0, rules.frontSetback),
      rotationDeg: prev?.rotationDeg ?? 0,
      isMirrored: prev?.isMirrored ?? false,
      isBtb: prev?.isBtb ?? false,
      btbSide: prev?.btbSide ?? "none",
      customPlanUrl: plan.imageUrl,
      customScalePxPerM: plan.scalePxPerM,
    }));
  };

  // Download Siting Plan PDF
  const handleDownloadPdf = async () => {
    if (!sitedHouse || !compliance) {
      toast.warning("Please select a home design from the catalog first.");
      return;
    }

    setIsExportingPdf(true);
    try {
      const { pdf, fileName } = await generateSitingPlanPdf({
        parcel,
        sitedHouse,
        rules,
        compliance,
        scale,
        clientName,
        consultantName,
      });

      pdf.save(fileName);
      toast.success(`1:200 Siting Plan PDF downloaded: ${fileName}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate Siting Plan PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Push Directly to Active Tender Job Folder
  const handlePushToTender = async () => {
    if (!sitedHouse || !compliance) {
      toast.warning("Please select a home design from the catalog first.");
      return;
    }

    setIsPushingTender(true);
    try {
      const { submissionNumber, fileName } = await pushSitingToActiveTender({
        parcel,
        sitedHouse,
        rules,
        compliance,
        scale,
        clientName,
        consultantName,
      });

      toast.success(`Siting Plan successfully attached to Tender Request #${submissionNumber}!`, {
        description: `${fileName} injected into Job Folder slot 'siting_plan'.`,
      });

      // Navigate to Tender Portal Tab 5 / Tab 6
      navigate({ to: "/tender-request" });
    } catch (e) {
      console.error(e);
      toast.error("Failed to attach Siting Plan to Tender Request.");
    } finally {
      setIsPushingTender(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans ${isLight ? "bg-slate-50 text-slate-900" : "bg-[#090D14] text-slate-100"}`}>
      {/* Top Navigation Bar */}
      <header className={`border-b ${isLight ? "border-slate-200 bg-white/95" : "border-slate-800/80 bg-slate-900/80"} backdrop-blur-md sticky top-0 z-40 px-4 py-2.5 flex items-center justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <Link to="/hub">
            <Logo light={!isLight} size={9} />
          </Link>
          <div className="border-l border-slate-700/80 pl-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-widest text-brand-gold uppercase">
                Hudson Site Studio
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                Archistar Replacement
              </span>
            </div>
            <span className="text-[10px] text-slate-400">
              Cadastre Boundaries • Satellite Imagery • 1:200 Siting
            </span>
          </div>
        </div>

        {/* Address Search Bar */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-auto flex items-center gap-2">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Address or Lot/Plan (e.g. 61 Paradise Rd, Flagstone)..."
              className="h-9 pl-9 pr-3 text-xs rounded-xl bg-slate-900/60 border-slate-700 text-slate-100"
            />
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={isSearching}
            className="h-9 px-3.5 bg-brand-gold hover:bg-brand-gold-deep text-slate-950 font-bold text-xs shrink-0"
          >
            {isSearching ? "Searching..." : "Search"}
          </Button>
        </form>

        {/* Action Controls & Top CTAs */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCustomPlanModalOpen(true)}
            className="h-9 text-xs gap-1.5 border-slate-700 hover:bg-slate-800"
          >
            <Upload className="h-3.5 w-3.5 text-brand-gold" />
            <span className="hidden sm:inline">Upload Client Plan</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={isExportingPdf || !sitedHouse}
            className={`h-9 text-xs gap-1.5 border-slate-700 hover:bg-slate-800 ${!sitedHouse ? "opacity-50 cursor-not-allowed" : ""}`}
            title={!sitedHouse ? "Select a design from catalog to export PDF" : "Export 1:200 Siting Plan PDF"}
          >
            <FileDown className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Export PDF</span>
          </Button>

          <Button
            size="sm"
            onClick={handlePushToTender}
            disabled={isPushingTender || !sitedHouse}
            className={`h-9 px-3.5 bg-gradient-to-r from-amber-500 to-brand-gold hover:from-amber-600 hover:to-amber-500 text-slate-950 font-black text-xs gap-1.5 shadow-md shadow-brand-gold/20 ${!sitedHouse ? "opacity-50 cursor-not-allowed" : ""}`}
            title={!sitedHouse ? "Select a design from catalog to attach to Tender Request" : "Push Siting Plan to Tender Request"}
          >
            <Send className="h-3.5 w-3.5" />
            <span>Push to Tender Request</span>
          </Button>
        </div>
      </header>

      {/* Sub-Header: Quick Preset Chips & Layer Toolbar */}
      <div className={`border-b ${isLight ? "border-slate-200 bg-slate-100/70" : "border-slate-800/60 bg-slate-950/40"} px-4 py-1.5 flex flex-wrap items-center justify-between gap-3 text-xs`}>
        {/* Quick Sample Address Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[11px] font-semibold text-slate-400 mr-1">Quick Lots:</span>
          {[
            { label: "Flagstone (450m²)", addr: "61 Paradise Road, Flagstone" },
            { label: "Jimboomba Acreage (2450m²)", addr: "14 Elegance Drive, Jimboomba" },
            { label: "Everleigh Greenbank (400m²)", addr: "22 Everleigh Drive, Greenbank" },
            { label: "South Ripley (375m²)", addr: "8 Ripley Way, South Ripley" },
          ].map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectQuickChip(chip.addr)}
              className="px-2.5 py-0.5 rounded-full bg-slate-800/80 hover:bg-brand-gold/20 hover:text-brand-gold border border-slate-700/60 text-[10px] text-slate-300 font-medium transition-colors cursor-pointer"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Viewport Modes & Layer Toggles */}
        <div className="flex items-center gap-2">
          {/* Basemap Switcher */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800">
            <button
              onClick={() => setBasemapMode("satellite-hybrid")}
              className={`px-2 py-1 rounded text-[10px] font-semibold transition-all ${
                basemapMode === "satellite-hybrid"
                  ? "bg-brand-gold text-slate-950 shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Satellite Hybrid
            </button>
            <button
              onClick={() => setBasemapMode("esri-aerial")}
              className={`px-2 py-1 rounded text-[10px] font-semibold transition-all ${
                basemapMode === "esri-aerial"
                  ? "bg-brand-gold text-slate-950 shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Esri Aerial
            </button>
            <button
              onClick={() => setBasemapMode("blueprint-cadastre")}
              className={`px-2 py-1 rounded text-[10px] font-semibold transition-all ${
                basemapMode === "blueprint-cadastre"
                  ? "bg-brand-gold text-slate-950 shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Cadastre Blueprint
            </button>
          </div>

          {/* Scale Selector (with A3 Fit Validation) */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800">
            <button
              onClick={() => setScale("1:200")}
              className={`px-2 py-1 rounded text-[10px] font-semibold transition-all ${
                scale === "1:200" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              1:200 Scale
            </button>
            <button
              onClick={() => {
                if (a3ScaleFits) {
                  setScale("1:100");
                } else {
                  toast.warning("Lot dimensions exceed A3 1:100 printable boundary — 1:200 applied.");
                }
              }}
              title={
                a3ScaleFits
                  ? "Lot fits within A3 page at 1:100"
                  : "Lot exceeds A3 page boundaries at 1:100 scale"
              }
              className={`px-2 py-1 rounded text-[10px] font-semibold transition-all flex items-center gap-1 ${
                scale === "1:100"
                  ? "bg-amber-500 text-slate-950"
                  : a3ScaleFits
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-600 cursor-not-allowed opacity-60"
              }`}
            >
              <span>1:100 Scale</span>
              {!a3ScaleFits && <span className="text-[8px] text-amber-500">(Exceeds A3)</span>}
            </button>
          </div>

          {/* Layer Toggles */}
          <button
            onClick={() => setShowContours((prev) => !prev)}
            className={`px-2 py-1 rounded border text-[10px] font-semibold transition-all ${
              showContours
                ? "bg-cyan-950/60 border-cyan-500/40 text-cyan-300"
                : "border-slate-800 text-slate-500 hover:text-slate-300"
            }`}
          >
            1m Contours
          </button>

          <button
            onClick={() => setShowSolar((prev) => !prev)}
            className={`px-2 py-1 rounded border text-[10px] font-semibold transition-all ${
              showSolar
                ? "bg-amber-950/60 border-amber-500/40 text-amber-300"
                : "border-slate-800 text-slate-500 hover:text-slate-300"
            }`}
          >
            Winter Sun (42°)
          </button>
        </div>
      </div>

      {/* Main Studio 3-Column Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Sidebar (Col 1-3): Lot Attributes & House Catalog */}
        <div className={`lg:col-span-3 border-r ${isLight ? "border-slate-200 bg-white" : "border-slate-800/80 bg-slate-950"} p-4 overflow-y-auto space-y-4 max-h-[calc(100vh-100px)]`}>
          {/* Parcel Information Card */}
          <div className={`p-3.5 rounded-2xl border ${isLight ? "border-slate-200 bg-slate-50" : "border-slate-800 bg-slate-900/60"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-brand-gold uppercase tracking-wider">
                Cadastral Parcel
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-mono font-bold">
                QLD QSpatial Live
              </span>
            </div>
            <h3 className="text-sm font-bold truncate">{parcel.streetAddress}</h3>
            <p className="text-xs text-amber-400 font-mono font-semibold">{parcel.standardLotPlan}</p>

            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800/60 text-center">
              <div>
                <span className="text-[10px] text-slate-400 block">Lot Area</span>
                <span className="text-xs font-bold text-white">{parcel.areaM2}m²</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Frontage</span>
                <span className="text-xs font-bold text-white">{parcel.frontageM}m</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Depth</span>
                <span className="text-xs font-bold text-white">{parcel.depthM}m</span>
              </div>
            </div>

            {/* Public Statutory Land Valuation */}
            {parcel.statutoryLandValuation && (
              <div className="mt-3 p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs">
                <span className="text-emerald-300 text-[10px]">Valuer-General Site Value:</span>
                <span className="font-bold text-emerald-400 font-mono">
                  ${parcel.statutoryLandValuation.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Hudson Homes Design Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Hudson Homes Designs
              </h4>
              <span className="text-[10px] text-brand-gold font-semibold">
                CAD Geometry Preloaded
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {HUDSON_DESIGNS_CATALOG.map((design) => {
                const isSelected = sitedHouse?.designId === design.id;
                return (
                  <div
                    key={design.id}
                    data-design-id={design.id}
                    data-testid={`design-card-${design.id}`}
                    onClick={() => handleSelectDesign(design.id)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-brand-gold bg-brand-gold/10 shadow-md shadow-brand-gold/5"
                        : "border-slate-800/80 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">{design.name}</span>
                      <span className="text-[10px] font-mono text-amber-400 font-semibold">
                        {design.totalM2}m²
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                      <span>{design.widthM}m W × {design.lengthM}m L</span>
                      <span>Min Lot: {design.minLotFrontageM}m</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Statutory Setback Rules Adjuster (With Hudson 450mm Eaves) */}
          <div className={`p-3.5 rounded-2xl border ${isLight ? "border-slate-200 bg-slate-50" : "border-slate-800 bg-slate-900/60"}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                Setback Controls
              </span>
              <span className="text-[10px] text-slate-400">
                Wall Setbacks (450mm Eaves)
              </span>
            </div>

            {/* Estate Preset Switcher */}
            <div className="mb-3">
              <Label className="text-[10px] text-slate-400">Planning Scheme / POD</Label>
              <select
                value={rules.presetName}
                onChange={(e) => {
                  const preset = Object.values(ESTATE_ZONING_PRESETS).find(
                    (p) => p.presetName === e.target.value
                  );
                  if (preset) setRules(preset);
                }}
                className="w-full h-8 mt-1 px-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-200"
              >
                {Object.values(ESTATE_ZONING_PRESETS).map((p) => (
                  <option key={p.presetName} value={p.presetName}>
                    {p.presetName}
                  </option>
                ))}
              </select>
            </div>

            {/* Sliders for Front, Left, Right, Rear */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-300">Front Wall Setback:</span>
                  <span className="font-mono font-bold text-brand-gold">{rules.frontSetback}m</span>
                </div>
                <Slider
                  min={2.0}
                  max={10.0}
                  step={0.1}
                  value={[rules.frontSetback]}
                  onValueChange={([val]) => setRules((prev) => ({ ...prev, frontSetback: val }))}
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-300">Garage Door Setback:</span>
                  <span className="font-mono font-bold text-brand-gold">{rules.garageSetback}m</span>
                </div>
                <Slider
                  min={4.5}
                  max={10.0}
                  step={0.1}
                  value={[rules.garageSetback]}
                  onValueChange={([val]) => setRules((prev) => ({ ...prev, garageSetback: val }))}
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-300">Left Side Wall:</span>
                  <span className="font-mono font-bold text-brand-gold">{rules.leftSetback}m</span>
                </div>
                <Slider
                  min={0.8}
                  max={5.0}
                  step={0.1}
                  value={[rules.leftSetback]}
                  onValueChange={([val]) => setRules((prev) => ({ ...prev, leftSetback: val }))}
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-300">Right Side Wall:</span>
                  <span className="font-mono font-bold text-brand-gold">{rules.rightSetback}m</span>
                </div>
                <Slider
                  min={0.8}
                  max={5.0}
                  step={0.1}
                  value={[rules.rightSetback]}
                  onValueChange={([val]) => setRules((prev) => ({ ...prev, rightSetback: val }))}
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-300">Rear Boundary Wall:</span>
                  <span className="font-mono font-bold text-brand-gold">{rules.rearSetback}m</span>
                </div>
                <Slider
                  min={0.8}
                  max={8.0}
                  step={0.1}
                  value={[rules.rearSetback]}
                  onValueChange={([val]) => setRules((prev) => ({ ...prev, rearSetback: val }))}
                />
              </div>
            </div>

            {/* Hudson Eaves Indicator */}
            <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
              <span>Standard Eaves Projection:</span>
              <span className="font-bold text-amber-400">450mm (0mm on BTB)</span>
            </div>
          </div>
        </div>

        {/* Center Viewport (Col 4-9): Interactive Canvas */}
        <div className="lg:col-span-6 relative h-full min-h-[600px] flex flex-col">
          <SiteStudioCanvas
            parcel={parcel}
            setParcel={setParcel}
            sitedHouse={sitedHouse}
            setSitedHouse={setSitedHouse}
            rules={rules}
            compliance={compliance}
            basemapMode={basemapMode}
            scale={scale}
            isLight={isLight}
            showContours={showContours}
            showSolar={showSolar}
            displayHomeLocation={displayHomeLocation}
          />
        </div>

        {/* Right Sidebar (Col 10-12): Compliance Dashboard & Export */}
        <div className={`lg:col-span-3 border-l ${isLight ? "border-slate-200 bg-white" : "border-slate-800/80 bg-slate-950"} p-4 overflow-y-auto space-y-4 max-h-[calc(100vh-100px)]`}>
          {sitedHouse && compliance && solar ? (
            <>
              {/* Site Coverage Gauge */}
              <div className={`p-4 rounded-2xl border ${isLight ? "border-slate-200 bg-slate-50" : "border-slate-800 bg-slate-900/60"}`}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Site Coverage Ratio
                </span>

                <div className="flex items-end justify-between mb-2">
                  <div>
                    <span className={`text-3xl font-black ${
                      compliance.isSiteCoveragePassed ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {compliance.siteCoveragePercent}%
                    </span>
                    <span className="text-xs text-slate-400 ml-1.5">
                      / Max {rules.maxSiteCoverage}%
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    compliance.isSiteCoveragePassed
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}>
                    {compliance.isSiteCoveragePassed ? "COMPLIANT" : "OVER LIMIT"}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      compliance.isSiteCoveragePassed ? "bg-emerald-500" : "bg-red-500"
                    }`}
                    style={{ width: `${Math.min(100, (compliance.siteCoveragePercent / rules.maxSiteCoverage) * 100)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                  <span>Footprint: {sitedHouse.totalM2}m²</span>
                  <span>Allotment: {parcel.areaM2}m²</span>
                </div>
              </div>

              {/* Private Open Space (POS) */}
              <div className={`p-3.5 rounded-2xl border ${isLight ? "border-slate-200 bg-slate-50" : "border-slate-800 bg-slate-900/60"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Private Open Space (POS)
                    </span>
                    <span className="text-lg font-black text-white">
                      {compliance.privateOpenSpaceM2} m²
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Min {rules.minPosM2} m² outdoor living area
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    compliance.isPosPassed
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}>
                    {compliance.isPosPassed ? "PASSED" : "NON-COMPLIANT"}
                  </span>
                </div>
              </div>

              {/* Live Setback Dimension Clearance Checklist */}
              <div className={`p-3.5 rounded-2xl border ${isLight ? "border-slate-200 bg-slate-50" : "border-slate-800 bg-slate-900/60"}`}>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Statutory Clearance Audit
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Front Wall:</span>
                    <span className={`font-mono font-bold ${compliance.isFrontCompliant ? "text-emerald-400" : "text-red-400"}`}>
                      {compliance.liveSetbacks.frontWallSetback}m / {rules.frontSetback}m
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Garage Door:</span>
                    <span className={`font-mono font-bold ${compliance.isGarageCompliant ? "text-emerald-400" : "text-red-400"}`}>
                      {compliance.liveSetbacks.garageWallSetback}m / {rules.garageSetback}m
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Left Side Wall:</span>
                    <span className={`font-mono font-bold ${compliance.isLeftCompliant ? "text-emerald-400" : "text-red-400"}`}>
                      {compliance.liveSetbacks.leftWallSetback}m / {rules.leftSetback}m
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Right Side Wall:</span>
                    <span className={`font-mono font-bold ${compliance.isRightCompliant ? "text-emerald-400" : "text-red-400"}`}>
                      {compliance.liveSetbacks.rightWallSetback}m / {rules.rightSetback}m
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Rear Boundary:</span>
                    <span className={`font-mono font-bold ${compliance.isRearCompliant ? "text-emerald-400" : "text-red-400"}`}>
                      {compliance.liveSetbacks.rearWallSetback}m / {rules.rearSetback}m
                    </span>
                  </div>
                </div>
              </div>

              {/* Solar Orientation Analysis */}
              <div className={`p-3.5 rounded-2xl border ${isLight ? "border-slate-200 bg-slate-50" : "border-slate-800 bg-slate-900/60"}`}>
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs mb-1.5">
                  <Sun className="h-4 w-4" />
                  <span>Solar &amp; Aspect Analysis</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {solar.orientationNotes}
                </p>
              </div>
            </>
          ) : (
            /* Guided Onboarding State when no house is sited yet */
            <div className="space-y-4">
              {/* Display Home Location Banner */}
              <div className={`p-4 rounded-2xl border ${isLight ? "border-slate-200 bg-amber-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Home className="h-4 w-4 text-brand-gold" />
                  <span className="text-xs font-bold text-brand-gold uppercase tracking-wider">
                    Display Home Geolocation
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">{displayHomeLocation.name}</h3>
                <p className="text-xs text-slate-300 mt-0.5">{displayHomeLocation.streetAddress}</p>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-400 font-mono">
                  <MapPin className="h-3 w-3" />
                  <span>{displayHomeLocation.suburb}, QLD {displayHomeLocation.postcode}</span>
                </div>
              </div>

              {/* Siting Workflow Checklist */}
              <div className={`p-4 rounded-2xl border ${isLight ? "border-slate-200 bg-slate-50" : "border-slate-800 bg-slate-900/60"} space-y-3`}>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Interactive Siting Workflow
                </span>

                <div className="flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 text-[10px] font-bold">
                    ✓
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">1. Lot Selected</span>
                    <span className="text-[11px] text-slate-400">
                      {parcel.standardLotPlan} ({parcel.areaM2}m²). Click any street lot on the satellite map to switch target property.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="h-5 w-5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 text-[10px] font-bold animate-pulse">
                    2
                  </div>
                  <div>
                    <span className="text-xs font-bold text-brand-gold block">2. Choose Hudson Design</span>
                    <span className="text-[11px] text-slate-300">
                      Pick any floorplan from the left catalog (e.g. Amber 21, Jasper 24) or upload a custom plan to site onto this lot.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 opacity-60">
                  <div className="h-5 w-5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center shrink-0 text-[10px] font-bold">
                    3
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 block">3. Real-Time Siting &amp; Export</span>
                    <span className="text-[11px] text-slate-500">
                      Auto-computes setbacks, POS, site coverage, 450mm eaves, and generates 1:200 Siting Plan PDF.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Client Name Input for Title Block */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-300">Client Name on Title Block</Label>
            <Input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. John & Sarah Henderson"
              className="h-8 text-xs bg-slate-900 border-slate-700 text-slate-100"
            />
          </div>

          {/* Primary Action Buttons */}
          <div className="space-y-2 pt-2">
            {!sitedHouse && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
                <span className="text-[11px] text-amber-300 font-medium">
                  Select a home design from the left catalog to activate 1:200 Siting Plan PDF and Tender Request export.
                </span>
              </div>
            )}

            <Button
              onClick={handlePushToTender}
              disabled={isPushingTender || !sitedHouse}
              className={`w-full h-11 bg-gradient-to-r from-amber-500 via-brand-gold to-amber-500 hover:from-amber-600 hover:to-amber-500 text-slate-950 font-black text-xs gap-2 shadow-lg shadow-brand-gold/15 ${
                !sitedHouse ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <Send className="h-4 w-4" />
              <span>Attach Siting Plan to Tender Request</span>
            </Button>

            <Button
              variant="outline"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf || !sitedHouse}
              className={`w-full h-9 text-xs border-slate-700 hover:bg-slate-800 gap-2 ${
                !sitedHouse ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <FileDown className="h-4 w-4 text-emerald-400" />
              <span>Download 1:200 Siting Plan PDF</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Custom Floorplan Upload Modal */}
      <SiteStudioCustomPlanModal
        isOpen={isCustomPlanModalOpen}
        onClose={() => setIsCustomPlanModalOpen(false)}
        onPlanCalibrated={handleCustomPlanCalibrated}
        isLight={isLight}
      />
    </div>
  );
}
