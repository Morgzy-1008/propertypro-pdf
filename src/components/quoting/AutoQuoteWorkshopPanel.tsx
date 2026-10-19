import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Ruler,
  Layers,
  Check,
  Crop,
  FileText,
  RefreshCw,
  MapPin,
  ArrowRight,
  Lock,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatAud } from "@/lib/pricing";
import type { DivisionId } from "@/lib/divisionContext";
import type {
  QuoteDesignSelection,
  QuoteSelectedLineItem,
  FloorplanAreaBreakdown,
  CustomFloorAreaItem,
} from "@/lib/quoting/quoteTypes";
import {
  getStandardAreaBreakdown,
  calculateModifiedFloorplanPricing,
  calculateCustomFloorplanPrice,
  calculateCustomTotalM2,
  getCustomAreaRates,
} from "@/lib/quoting/quoteEngine";
import {
  scanFloorplanForAutoQuote,
  buildLineItemsFromAutoQuoteCheckOff,
  runVerifiedPropertyOverlayCheck,
  getCachedPropertyOverlayReport,
  type AutoQuoteSubMode,
  type AutoQuoteScanResult,
  type AutoQuoteCheckOffItem,
  type VerifiedPropertyComplianceReport,
} from "@/lib/quoting/autoQuoteEngine";

interface AutoQuoteWorkshopPanelProps {
  design: QuoteDesignSelection;
  division: DivisionId;
  siteAddress?: string;
  suburb?: string;
  isLight: boolean;
  allModels: Array<{ row: any; type: any }>;
  onChangeDesign: (patch: Partial<QuoteDesignSelection>) => void;
  onAddInclusionLineItems?: (items: QuoteSelectedLineItem[]) => void;
  onOpenCropper?: (file: File | null) => void;
}

const CATEGORY_LABELS: Record<string, { label: string; badgeColor: string }> = {
  structural_areas: {
    label: "Structural & Added Floor Areas",
    badgeColor: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  benchtops: {
    label: "Benchtops, Stone & Joinery",
    badgeColor: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  wet_rooms: {
    label: "Showers, Ensuites & Wet Rooms",
    badgeColor: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  },
  doors_windows: {
    label: "Doors, Stackers & Glazing Schedule",
    badgeColor: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  ceilings: {
    label: "Ceiling Heights & Framing",
    badgeColor: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  },
  driveway_external: {
    label: "Driveway & External Concrete",
    badgeColor: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  },
  custom_complexity: {
    label: "Custom Design Density & Rate Uplift",
    badgeColor: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  },
};

export function AutoQuoteWorkshopPanel({
  design,
  division,
  siteAddress,
  suburb,
  isLight,
  allModels,
  onChangeDesign,
  onAddInclusionLineItems,
  onOpenCropper,
}: AutoQuoteWorkshopPanelProps) {
  const [subMode, setSubMode] = useState<AutoQuoteSubMode>(
    design.mode === "custom_floorplan" ? "custom" : "modified"
  );
  const [selectedBaseDesign, setSelectedBaseDesign] = useState<string>(
    design.designName && design.designName !== "Custom Architectural Residence"
      ? design.designName
      : "Jasper 26"
  );
  const [isScanning, setIsScanning] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [scanResult, setScanResult] = useState<AutoQuoteScanResult | null>(null);
  const [checkOffItems, setCheckOffItems] = useState<AutoQuoteCheckOffItem[]>([]);
  const [editableWidthM, setEditableWidthM] = useState<number>(0);
  const [editableLengthM, setEditableLengthM] = useState<number>(0);

  // Verified Zero-Hallucination Property Overlay Compliance State
  const fullAddress = [siteAddress, suburb, division].filter(Boolean).join(", ");
  const [addressInput, setAddressInput] = useState<string>(
    siteAddress && siteAddress !== "Address TBA" ? fullAddress : ""
  );
  const [overlayReport, setOverlayReport] = useState<VerifiedPropertyComplianceReport | null>(() =>
    getCachedPropertyOverlayReport(fullAddress)
  );
  const [checkingOverlays, setCheckingOverlays] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (siteAddress && siteAddress !== "Address TBA" && siteAddress.trim().length > 3) {
      const nextAddr = [siteAddress, suburb, division].filter(Boolean).join(", ");
      setAddressInput(nextAddr);
      const cached = getCachedPropertyOverlayReport(nextAddr);
      if (cached) {
        setOverlayReport(cached);
      } else {
        // Trigger background zero-hallucination compliance check automatically when address is present
        setCheckingOverlays(true);
        runVerifiedPropertyOverlayCheck(nextAddr, division)
          .then((rep) => setOverlayReport(rep))
          .catch(() => {})
          .finally(() => setCheckingOverlays(false));
      }
    }
  }, [siteAddress, suburb, division]);

  const handleRunScanOnFile = async (
    file: File,
    activeSubMode: AutoQuoteSubMode = subMode,
    baseName: string = selectedBaseDesign
  ) => {
    setIsScanning(true);
    setUploadedFile(file);
    const toastId = toast.loading(
      `Auto-Quote Workshop: Scanning "${file.name}" in scale (${
        activeSubMode === "modified" ? "Modified vs " + baseName : "Custom Bespoke Scan"
      })...`
    );
    try {
      const res = await scanFloorplanForAutoQuote({
        file,
        subMode: activeSubMode,
        overrideBaseDesignName: activeSubMode === "modified" ? baseName : undefined,
        specTier: design.specTier || "H2 Design Collection",
        division,
      });
      setScanResult(res);
      setCheckOffItems(res.takeOffItems);
      setEditableWidthM(res.overallWidthM);
      setEditableLengthM(res.overallLengthM);
      if (activeSubMode === "modified" && res.matchedBaseDesignName) {
        setSelectedBaseDesign(res.matchedBaseDesignName);
      }
      toast.success(
        `Auto-Quote scan complete! Detected ${res.scannedTotalM2} m² (${res.overallWidthM}m W × ${res.overallLengthM}m L) & ${res.takeOffItems.length} take-off items.`,
        { id: toastId }
      );
    } catch (err: any) {
      console.error("Auto-Quote scan error:", err);
      toast.error("Could not scan floorplan file. Please upload a valid PDF or image.", {
        id: toastId,
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleToggleCheckItem = (id: string) => {
    setCheckOffItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, checked: !it.checked } : it))
    );
  };

  const handleUpdateCheckItemQtyOrRate = (
    id: string,
    field: "quantity" | "unitRate",
    val: number
  ) => {
    setCheckOffItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const nextQty = field === "quantity" ? Math.max(0, val) : it.quantity;
        const nextRate = field === "unitRate" ? val : it.unitRate;
        return {
          ...it,
          quantity: nextQty,
          unitRate: nextRate,
          totalPriceDelta: Math.round(nextQty * nextRate),
        };
      })
    );
  };

  const handleApplyAutoQuoteToEstimate = () => {
    if (!scanResult) return;

    const isDouble = scanResult.housingType === "Double Storey" || scanResult.housingType === "Split Level";
    const zoneMap = new Map(scanResult.zoneComparisons.map((z) => [z.key, z.scannedM2]));

    if (subMode === "modified") {
      const matchedModel = allModels.find(
        (m) => m.row.name.toLowerCase() === selectedBaseDesign.toLowerCase()
      );
      const stdM2 = matchedModel?.row.m2 || scanResult.standardTotalM2 || 241.5;
      const stdAreas = getStandardAreaBreakdown(selectedBaseDesign, scanResult.housingType, stdM2);

      const customItems: CustomFloorAreaItem[] = scanResult.addedCustomAreas.map((ca, idx) => ({
        id: `aq_custom_${Date.now()}_${idx}`,
        name: ca.name,
        m2: ca.m2,
        ratePerM2: ca.ratePerM2,
      }));

      const updatedAreas: FloorplanAreaBreakdown = {
        ...(isDouble
          ? {
              groundLivingM2: zoneMap.get("groundLivingM2") ?? stdAreas.groundLivingM2 ?? 0,
              firstLivingM2: zoneMap.get("firstLivingM2") ?? stdAreas.firstLivingM2 ?? 0,
              balconyM2: zoneMap.get("balconyM2") ?? stdAreas.balconyM2 ?? 0,
            }
          : {
              livingM2: zoneMap.get("livingM2") ?? stdAreas.livingM2 ?? 0,
              balconyM2: zoneMap.get("balconyM2") ?? stdAreas.balconyM2 ?? 0,
            }),
        garageM2: zoneMap.get("garageM2") ?? stdAreas.garageM2 ?? 0,
        alfrescoM2: zoneMap.get("alfrescoM2") ?? stdAreas.alfrescoM2 ?? 0,
        porchM2: zoneMap.get("porchM2") ?? stdAreas.porchM2 ?? 0,
        customAreas: customItems,
        totalM2: scanResult.scannedTotalM2,
      };

      const calc = calculateModifiedFloorplanPricing({
        ...design,
        mode: "modified",
        isModifiedFloorplan: true,
        designName: selectedBaseDesign,
        modelName: selectedBaseDesign,
        housingType: scanResult.housingType,
        standardDesignM2: stdM2,
        standardBasePrice: scanResult.standardBasePrice,
        standardAreas: stdAreas,
        modifiedAreas: updatedAreas,
        areas: updatedAreas,
        designM2: scanResult.scannedTotalM2,
        modifiedDesignM2: scanResult.scannedTotalM2,
      });

      onChangeDesign({
        mode: "modified",
        isModifiedFloorplan: true,
        designName: selectedBaseDesign,
        modelName: selectedBaseDesign,
        housingType: scanResult.housingType,
        standardDesignM2: stdM2,
        standardBasePrice: scanResult.standardBasePrice,
        designM2: scanResult.scannedTotalM2,
        modifiedDesignM2: scanResult.scannedTotalM2,
        basePrice: calc.modifiedBasePrice,
        standardAreas: stdAreas,
        modifiedAreas: updatedAreas,
        areas: updatedAreas,
        modifiedPlanFileName: scanResult.fileName,
        ...(scanResult.previewImageUrl
          ? {
              floorplanUrl: scanResult.previewImageUrl,
              modifiedPlanImageUrl: scanResult.previewImageUrl,
            }
          : {}),
      });
    } else {
      // Custom Mode Application
      const rates = getCustomAreaRates(design.specTier);
      const customSpec = {
        groundLivingM2:
          (isDouble ? zoneMap.get("groundLivingM2") : zoneMap.get("livingM2")) || 150,
        firstLivingM2: isDouble ? zoneMap.get("firstLivingM2") || 100 : 0,
        garageM2: zoneMap.get("garageM2") || 36,
        alfrescoM2: zoneMap.get("alfrescoM2") || 16,
        porchM2: zoneMap.get("porchM2") || 4.5,
        balconyM2: zoneMap.get("balconyM2") || 0,
        storeys: isDouble ? ("double" as const) : ("single" as const),
        groundRateM2: rates.groundLiving,
        upperRateM2: rates.firstLiving,
        ancillaryRateM2: rates.garage,
        scaffoldingAllowance: isDouble ? 8500 : 0,
      };
      const totalM2 = calculateCustomTotalM2(customSpec);
      const basePrice = calculateCustomFloorplanPrice(customSpec, design.specTier);

      onChangeDesign({
        mode: "custom_floorplan",
        isModifiedFloorplan: false,
        designName: `Custom Residence (${editableWidthM}m × ${editableLengthM}m)`,
        modelName: `Custom Residence (${editableWidthM}m × ${editableLengthM}m)`,
        housingType: scanResult.housingType,
        customSpec,
        designM2: totalM2,
        basePrice,
        bedrooms: scanResult.customDensity?.bedroomCount || 4,
        bathrooms: scanResult.customDensity?.bathroomCount || 2,
        ...(scanResult.previewImageUrl
          ? {
              floorplanUrl: scanResult.previewImageUrl,
              customPlanImageUrl: scanResult.previewImageUrl,
            }
          : {}),
      });
    }

    // Add all checked non-structural take-off items to Variations & Upgrades
    const lineItems = buildLineItemsFromAutoQuoteCheckOff(checkOffItems);
    if (onAddInclusionLineItems) {
      onAddInclusionLineItems(lineItems);
    }

    toast.success(
      `Applied Auto-Quote (${scanResult.scannedTotalM2} m², ${editableWidthM}m × ${editableLengthM}m) + ${lineItems.length} checked tender take-off items to Estimate!`
    );
  };

  const handleRunManualOverlayCheck = async () => {
    if (!addressInput.trim()) {
      toast.error("Enter a property address first to run the GIS compliance check.");
      return;
    }
    setCheckingOverlays(true);
    const toastId = toast.loading(`Querying official ${division} Government Spatial GIS layers...`);
    try {
      const rep = await runVerifiedPropertyOverlayCheck(addressInput, division);
      setOverlayReport(rep);
      toast.success(
        `Verified GIS Compliance Check complete for ${rep.lotPlanParcel || rep.addressQueried}!`,
        { id: toastId }
      );
    } catch (err: any) {
      toast.error(err?.message || "Could not verify property coordinates.", { id: toastId });
    } finally {
      setCheckingOverlays(false);
    }
  };

  const checkedTakeOffTotal = checkOffItems
    .filter((i) => i.checked && i.category !== "structural_areas")
    .reduce((s, i) => s + i.totalPriceDelta, 0);

  const structuralZoneDeltaTotal = checkOffItems
    .filter((i) => i.checked && i.category === "structural_areas")
    .reduce((s, i) => s + i.totalPriceDelta, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300" data-testid="auto-quote-workshop-panel">
      {/* Top Workshop Header Banner */}
      <div
        className={`p-5 sm:p-6 rounded-2xl border transition-all ${
          isLight
            ? "bg-gradient-to-r from-amber-50 via-white to-emerald-50 border-amber-300 text-slate-900 shadow-sm"
            : "bg-gradient-to-r from-amber-950/30 via-slate-900/90 to-emerald-950/30 border-amber-500/40 text-white shadow-lg"
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-amber-500 text-slate-950 font-extrabold text-[11px] uppercase px-2.5 py-0.5 gap-1">
                <Lock className="w-3 h-3" /> Morgan Hales Exclusive Workshop
              </Badge>
              <Badge
                variant="outline"
                className={`font-mono text-[11px] font-bold ${
                  isLight ? "border-emerald-600 text-emerald-800 bg-emerald-50" : "border-emerald-400/50 text-emerald-300"
                }`}
              >
                Scale-Calibrated Tender Take-Off Engine
              </Badge>
            </div>
            <h3 className={`text-xl sm:text-2xl font-black tracking-tight ${isLight ? "text-slate-950" : "text-white"}`}>
              Auto-Quote &amp; Architectural Plan Recognition Workshop
            </h3>
            <p className={`text-xs sm:text-sm max-w-3xl ${isLight ? "text-slate-600" : "text-slate-300"}`}>
              Scans any Modified or Custom floorplan in scale to detect exact overall Width, Length &amp; Zone Areas,
              measures benchtops, showers, wet rooms, doors/windows, ceiling heights &amp; driveways, and runs a
              100% deterministic government GIS property overlay check.
            </p>
          </div>

          {/* Sub-Mode Toggle: Modified vs Custom (No Standard option per requirement) */}
          <div
            className={`inline-flex p-1.5 rounded-2xl border self-start lg:self-center ${
              isLight ? "bg-slate-100 border-slate-300" : "bg-slate-950 border-slate-800"
            }`}
          >
            <button
              type="button"
              data-testid="auto-quote-submode-modified"
              onClick={() => setSubMode("modified")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                subMode === "modified"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : isLight
                  ? "text-slate-700 hover:text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              📐 Modified Plan Auto-Quote
            </button>
            <button
              type="button"
              data-testid="auto-quote-submode-custom"
              onClick={() => setSubMode("custom")}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                subMode === "custom"
                  ? "bg-emerald-500 text-slate-950 shadow-sm"
                  : isLight
                  ? "text-slate-700 hover:text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🏛️ Custom Plan Auto-Quote
            </button>
          </div>
        </div>
      </div>

      {/* Step 1: Base Design Selection (if Modified) + Plan Upload / Scan Trigger */}
      <div
        className={`p-5 sm:p-6 rounded-2xl border space-y-5 ${
          isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
        }`}
      >
        {subMode === "modified" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="space-y-1.5">
              <Label className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                Base Hudson Design for Comparison (Auto-Matched on Scan or Select Below)
              </Label>
              <select
                value={selectedBaseDesign}
                onChange={(e) => {
                  setSelectedBaseDesign(e.target.value);
                  if (uploadedFile) {
                    handleRunScanOnFile(uploadedFile, "modified", e.target.value);
                  }
                }}
                className={`w-full h-11 px-3 rounded-xl border text-sm font-bold ${
                  isLight
                    ? "bg-white border-slate-300 text-slate-900"
                    : "bg-slate-900 border-slate-700 text-white"
                }`}
              >
                {allModels.map(({ row, type }) => (
                  <option key={`${type}-${row.name}`} value={row.name}>
                    {row.name} ({row.m2} m² — {type})
                  </option>
                ))}
              </select>
            </div>
            <div className={`text-xs p-3 rounded-xl border ${isLight ? "bg-white border-slate-200 text-slate-600" : "bg-slate-900/70 border-slate-800 text-slate-300"}`}>
              <span className="font-bold block text-amber-500">Modified Auto-Quote Rule:</span>
              Calculates exact m² difference in every zone against <strong>{selectedBaseDesign}</strong> and automatically adds any new rooms/areas found on the modified plan that were not on the original plan.
            </div>
          </div>
        )}

        {subMode === "custom" && (
          <div className={`text-xs p-3.5 rounded-xl border ${isLight ? "bg-white border-slate-200 text-slate-700" : "bg-slate-900/70 border-slate-800 text-slate-300"}`}>
            <span className="font-bold text-emerald-500 block mb-0.5">Custom Plan Density &amp; Rate Engine Active:</span>
            Uses Hudson&apos;s custom m² rates and scans internal wet-area ratio, ensuite-to-bedroom ratio, scullery/butler&apos;s pantry joinery, glazing openings, ceiling heights, and driveway to automatically adjust pricing where design density exceeds standard averages.
          </div>
        )}

        {/* File Upload Dropzone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const f = e.dataTransfer.files?.[0];
            if (f) handleRunScanOnFile(f, subMode, selectedBaseDesign);
          }}
          className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-4 ${
            isLight
              ? "border-amber-400/80 bg-white hover:bg-amber-50/40"
              : "border-amber-500/40 bg-slate-900/60 hover:bg-slate-900"
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center flex-none">
              {isScanning ? <RefreshCw className="w-7 h-7 animate-spin" /> : <Upload className="w-7 h-7" />}
            </div>
            <div>
              <h4 className={`text-base sm:text-lg font-extrabold ${isLight ? "text-slate-900" : "text-white"}`}>
                {uploadedFile
                  ? `Scanned Plan: ${uploadedFile.name}`
                  : `Upload ${subMode === "modified" ? "Modified" : "Custom"} Floorplan (PDF, PNG, JPG)`}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically detects scale, exact overall Width × Length (m), room/zone m², benchtops, showers, wet rooms, doors/windows &amp; ceiling heights.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs h-10 px-4 rounded-xl cursor-pointer gap-1.5"
            >
              <Upload className="w-4 h-4" />
              {uploadedFile ? "Scan Another Plan" : "Upload & Scan Plan"}
            </Button>

            {uploadedFile && onOpenCropper && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenCropper(uploadedFile)}
                className="text-xs h-10 px-3.5 font-bold rounded-xl gap-1.5 cursor-pointer"
              >
                <Crop className="w-3.5 h-3.5 text-amber-500" />
                500mm Smart Crop
              </Button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleRunScanOnFile(f, subMode, selectedBaseDesign);
              e.target.value = "";
            }}
            className="hidden"
          />
        </div>
      </div>

      {/* Step 2: Scale-Calibrated Dimensions, Area Breakdown & Interactive Estimator Check-Off List */}
      {scanResult && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Scale & Overall Building Dimensions KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              className={`p-4 rounded-2xl border ${
                isLight ? "bg-white border-slate-200 shadow-xs" : "bg-slate-950/80 border-slate-800"
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-amber-500" />
                Overall Design Width (m)
              </span>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={editableWidthM}
                  onChange={(e) => setEditableWidthM(parseFloat(e.target.value) || 0)}
                  className={`h-10 font-mono text-base font-extrabold rounded-xl ${
                    isLight ? "bg-white border-slate-300 text-slate-950" : "bg-slate-900 border-slate-700 text-white"
                  }`}
                />
                <span className="text-xs font-mono font-bold text-slate-400">m</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                {(editableWidthM * 1000).toFixed(0)} mm External Wall Span
              </span>
            </div>

            <div
              className={`p-4 rounded-2xl border ${
                isLight ? "bg-white border-slate-200 shadow-xs" : "bg-slate-950/80 border-slate-800"
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5 text-cyan-500" />
                Overall Design Length (m)
              </span>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={editableLengthM}
                  onChange={(e) => setEditableLengthM(parseFloat(e.target.value) || 0)}
                  className={`h-10 font-mono text-base font-extrabold rounded-xl ${
                    isLight ? "bg-white border-slate-300 text-slate-950" : "bg-slate-900 border-slate-700 text-white"
                  }`}
                />
                <span className="text-xs font-mono font-bold text-slate-400">m</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                {(editableLengthM * 1000).toFixed(0)} mm External Depth
              </span>
            </div>

            <div
              className={`p-4 rounded-2xl border ${
                isLight ? "bg-white border-slate-200 shadow-xs" : "bg-slate-950/80 border-slate-800"
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-500" />
                Total Scanned Area
              </span>
              <div className={`text-2xl font-mono font-black mt-1.5 ${isLight ? "text-slate-950" : "text-white"}`}>
                {scanResult.scannedTotalM2.toFixed(2)} m²
              </div>
              <span className="text-[11px] font-mono text-emerald-500 font-bold block mt-0.5">
                {subMode === "modified"
                  ? `Std: ${scanResult.standardTotalM2} m² (${
                      scanResult.netVarianceM2 >= 0 ? `+${scanResult.netVarianceM2}` : scanResult.netVarianceM2
                    } m²)`
                  : `${(scanResult.scannedTotalM2 * 0.107639).toFixed(1)} Squares • ${scanResult.housingType}`}
              </span>
            </div>

            <div
              className={`p-4 rounded-2xl border ${
                isLight
                  ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
                  : "bg-emerald-950/30 border-emerald-500/40 text-white"
              }`}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500 block">
                Auto-Quote Proposed Total
              </span>
              <div className="text-2xl font-mono font-black mt-1.5 text-emerald-500">
                {formatAud(
                  (subMode === "modified" ? scanResult.standardBasePrice : scanResult.recommendedBaseOrCustomPrice) +
                    structuralZoneDeltaTotal +
                    checkedTakeOffTotal
                )}
              </div>
              <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                {scanResult.scaleLabel}
              </span>
            </div>
          </div>

          {/* Custom Plan Density Analysis Card (When in Custom Mode) */}
          {subMode === "custom" && scanResult.customDensity && (
            <div
              className={`p-5 rounded-2xl border space-y-3 ${
                isLight ? "bg-white border-slate-200 shadow-xs" : "bg-slate-950/70 border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-500" />
                  <h4 className={`text-sm font-extrabold uppercase tracking-wider ${isLight ? "text-slate-900" : "text-white"}`}>
                    Custom Design Internal Recognition &amp; Wet-Area Density Check
                  </h4>
                </div>
                <Badge className="bg-emerald-500 text-slate-950 font-mono text-xs font-bold">
                  {scanResult.customDensity.recommendedRateAdjustmentPerM2 > 0
                    ? `Recommended Density Uplift: +$${scanResult.customDensity.recommendedRateAdjustmentPerM2}/m²`
                    : "Standard Custom Rate Verified"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className={`p-3 rounded-xl border ${isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                  <span className="text-slate-400 block">Bedrooms / Ensuites</span>
                  <span className={`font-mono font-bold text-sm ${isLight ? "text-slate-900" : "text-white"}`}>
                    {scanResult.customDensity.bedroomCount} Beds • {scanResult.customDensity.ensuiteCount} Ensuites
                  </span>
                </div>
                <div className={`p-3 rounded-xl border ${isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                  <span className="text-slate-400 block">Wet Area Footprint</span>
                  <span className={`font-mono font-bold text-sm ${isLight ? "text-slate-900" : "text-white"}`}>
                    {scanResult.customDensity.wetAreaTotalM2} m² ({scanResult.customDensity.wetAreaRatioPercent}% vs {scanResult.customDensity.industryAverageWetRatioPercent}% std)
                  </span>
                </div>
                <div className={`p-3 rounded-xl border ${isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                  <span className="text-slate-400 block">Butler&apos;s Pantry / WIP</span>
                  <span className={`font-mono font-bold text-sm ${isLight ? "text-slate-900" : "text-white"}`}>
                    {scanResult.customDensity.hasButlersPantryOrScullery ? "Detected (Included in Take-Off)" : "Standard Pantry"}
                  </span>
                </div>
                <div className={`p-3 rounded-xl border ${isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900 border-slate-800"}`}>
                  <span className="text-slate-400 block">Separate Living Zones</span>
                  <span className={`font-mono font-bold text-sm ${isLight ? "text-slate-900" : "text-white"}`}>
                    {scanResult.customDensity.hasMultipleLivingZones} Living / Media Zones
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Estimator Tender Take-Off Check-Off List */}
          <div
            className={`p-5 sm:p-6 rounded-2xl border space-y-4 ${
              isLight ? "bg-white border-slate-200 shadow-xs" : "bg-slate-950/80 border-slate-800"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/30 pb-3">
              <div>
                <h4 className={`text-base font-extrabold flex items-center gap-2 ${isLight ? "text-slate-900" : "text-white"}`}>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  Estimator Tender Take-Off Check-Off Schedule ({checkOffItems.filter((i) => i.checked).length} of {checkOffItems.length} Checked)
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Review every measured item (structural areas, benchtops, showers, wet rooms, doors/windows, ceiling height &amp; driveway). Uncheck any item to exclude it, or adjust qty/rate before applying.
                </p>
              </div>

              <Button
                type="button"
                data-testid="apply-auto-quote-btn"
                onClick={handleApplyAutoQuoteToEstimate}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-xs h-11 px-5 rounded-xl shadow-md cursor-pointer gap-2"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                Apply Checked Take-Off to Estimate ({formatAud(structuralZoneDeltaTotal + checkedTakeOffTotal)})
              </Button>
            </div>

            <div className="space-y-2.5">
              {checkOffItems.map((item) => {
                const catMeta = CATEGORY_LABELS[item.category] || {
                  label: item.category,
                  badgeColor: "bg-slate-500/15 text-slate-300 border-slate-500/30",
                };

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                      item.checked
                        ? isLight
                          ? "bg-emerald-50/40 border-emerald-300"
                          : "bg-emerald-950/20 border-emerald-500/40"
                        : isLight
                        ? "bg-slate-50 border-slate-200 opacity-75"
                        : "bg-slate-900/40 border-slate-800 opacity-70"
                    }`}
                  >
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => handleToggleCheckItem(item.id)}
                        className="mt-1 h-4 w-4 rounded border-slate-400 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-extrabold ${isLight ? "text-slate-900" : "text-white"}`}>
                            {item.title}
                          </span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${catMeta.badgeColor}`}>
                            {catMeta.label}
                          </span>
                          {item.confidence === "schedule_verified" && (
                            <Badge className="bg-emerald-600 text-white text-[10px] py-0 px-2">
                              Plan Schedule Verified
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-0.5">
                          <div>
                            <span className="text-slate-400 font-semibold">Scanned on Plan: </span>
                            <span className={`font-mono font-bold ${isLight ? "text-slate-900" : "text-slate-200"}`}>
                              {item.measuredSpec}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-semibold">Standard Baseline: </span>
                            <span className="font-mono text-slate-400">{item.standardBaselineSpec}</span>
                          </div>
                        </div>
                        <div className="text-[11px] text-emerald-500 font-medium">
                          Flagged Variance: {item.varianceSummary} • <span className="text-slate-400">{item.sourceNote}</span>
                        </div>
                      </div>
                    </div>

                    {/* Editable Qty, Unit Rate & Subtotal */}
                    <div className="flex items-center gap-2.5 self-end lg:self-center flex-none">
                      <div className="w-20">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Qty ({item.unit})</span>
                        <Input
                          type="number"
                          step="0.1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateCheckItemQtyOrRate(item.id, "quantity", parseFloat(e.target.value) || 0)
                          }
                          className={`h-8 text-xs font-mono font-bold ${
                            isLight ? "bg-white border-slate-300 text-slate-950" : "bg-slate-900 border-slate-700 text-white"
                          }`}
                        />
                      </div>

                      <div className="w-24">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Rate ($)</span>
                        <Input
                          type="number"
                          step="10"
                          value={item.unitRate}
                          onChange={(e) =>
                            handleUpdateCheckItemQtyOrRate(item.id, "unitRate", parseFloat(e.target.value) || 0)
                          }
                          className={`h-8 text-xs font-mono font-bold ${
                            isLight ? "bg-white border-slate-300 text-slate-950" : "bg-slate-900 border-slate-700 text-white"
                          }`}
                        />
                      </div>

                      <div className="w-28 text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Impact</span>
                        <span
                          className={`text-sm font-mono font-extrabold ${
                            item.totalPriceDelta >= 0 ? "text-emerald-500" : "text-rose-400"
                          }`}
                        >
                          {item.totalPriceDelta >= 0
                            ? `+${formatAud(item.totalPriceDelta)}`
                            : formatAud(item.totalPriceDelta)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: 100% Deterministic Zero-Hallucination Government GIS Property Overlay Compliance Check */}
      <div
        className={`p-5 sm:p-6 rounded-2xl border space-y-4 ${
          isLight ? "bg-white border-slate-200 shadow-xs" : "bg-slate-950/80 border-slate-800"
        }`}
        data-testid="auto-quote-overlay-compliance-card"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-500" />
              <h4 className={`text-base font-extrabold ${isLight ? "text-slate-900" : "text-white"}`}>
                Verified Property Overlay &amp; Hazard Compliance Check (Zero-Hallucination GIS)
              </h4>
              <Badge variant="outline" className="text-[10px] font-mono font-bold border-cyan-500/40 text-cyan-500">
                100% Authoritative ArcGIS / Spatial Cadastre
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Queries official QLD Spatial GIS &amp; NSW Planning Portal hazard layers directly at the property&apos;s parcel coordinates and flags verified overlays in the Site Costs section. Never guessed or hallucinated.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <Input
              placeholder="Enter site address (e.g. 15 Flagstone Creek Rd, Flagstone QLD or 42 Austral Ave, Austral NSW)..."
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              className={`pl-10 h-10 text-xs font-semibold rounded-xl ${
                isLight ? "bg-white border-slate-300 text-slate-950" : "bg-slate-900 border-slate-700 text-white"
              }`}
            />
          </div>
          <Button
            type="button"
            onClick={handleRunManualOverlayCheck}
            disabled={checkingOverlays}
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs h-10 px-4 rounded-xl cursor-pointer gap-1.5"
          >
            {checkingOverlays ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            {checkingOverlays ? "Querying GIS..." : "Verify Property Overlays"}
          </Button>
        </div>

        {overlayReport && (
          <div className="space-y-3 pt-2">
            <div
              className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs ${
                isLight ? "bg-slate-50 border-slate-200 text-slate-800" : "bg-slate-900/90 border-slate-800 text-slate-200"
              }`}
            >
              <div>
                <span className="font-bold">Verified Geocode: </span>
                <span>{overlayReport.geocodedDisplayName}</span>
                {overlayReport.lotPlanParcel && (
                  <Badge className="ml-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-mono text-[10px]">
                    {overlayReport.lotPlanParcel}
                  </Badge>
                )}
                {overlayReport.lgaCouncil && (
                  <Badge className="ml-1.5 bg-slate-500/20 text-slate-300 font-mono text-[10px]">
                    {overlayReport.lgaCouncil}
                  </Badge>
                )}
              </div>
              <span className="font-mono text-[11px] text-slate-400">
                Coords: {overlayReport.lat.toFixed(5)}, {overlayReport.lng.toFixed(5)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {overlayReport.overlays.map((ov) => (
                <div
                  key={ov.id}
                  className={`p-3.5 rounded-xl border text-xs space-y-1 ${
                    ov.status === "verified_hit"
                      ? isLight
                        ? "bg-rose-50 border-rose-300 text-rose-950"
                        : "bg-rose-950/30 border-rose-500/40 text-rose-200"
                      : ov.status === "verified_clear"
                      ? isLight
                        ? "bg-emerald-50/70 border-emerald-300 text-emerald-950"
                        : "bg-emerald-950/20 border-emerald-500/30 text-emerald-200"
                      : isLight
                      ? "bg-amber-50/80 border-amber-300 text-amber-950"
                      : "bg-amber-950/20 border-amber-500/30 text-amber-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold">{ov.name}</span>
                    <Badge
                      className={`text-[10px] uppercase font-bold ${
                        ov.status === "verified_hit"
                          ? "bg-rose-600 text-white"
                          : ov.status === "verified_clear"
                          ? "bg-emerald-600 text-white"
                          : "bg-amber-500 text-slate-950"
                      }`}
                    >
                      {ov.status === "verified_hit"
                        ? "⚠️ Verified Hit"
                        : ov.status === "verified_clear"
                        ? "✓ Verified Clear"
                        : "Council Cert Check"}
                    </Badge>
                  </div>
                  <p className="text-[11px] leading-snug">{ov.detail}</p>
                  {ov.siteCostFlag && (
                    <p className="text-[11px] font-bold text-rose-500 pt-0.5">
                      Site Costs Flag: {ov.siteCostFlag}
                    </p>
                  )}
                  <span className="text-[10px] font-mono opacity-75 block">
                    Source: {ov.authoritySource}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
