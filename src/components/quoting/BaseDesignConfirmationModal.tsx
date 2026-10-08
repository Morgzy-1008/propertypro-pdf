import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  ArrowRight,
  ChevronDown,
  FileText,
  Home,
  Scan,
  Pencil,
  RotateCcw,
  Check,
} from "lucide-react";
import {
  SINGLE_STOREY_PRICES,
  DOUBLE_STOREY_PRICES,
  SPLIT_LEVEL_PRICES,
  DUAL_OC_PRICES,
} from "@/lib/pricelist.data";
import { LOCAL_FLOORPLAN_MAP } from "@/lib/quoting/localFloorplanMap.data";
import { getStandardAreaBreakdown } from "@/lib/quoting/quoteEngine";
import type { BaseDesignCandidate, CustomStandardAreas } from "@/lib/quoting/quoteTypes";

interface BaseDesignConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: BaseDesignCandidate | null;
  onConfirm: (
    confirmedDesignName: string,
    confirmedHousingType: string,
    customStandardAreas?: CustomStandardAreas
  ) => void;
  isLight?: boolean;
}

export function BaseDesignConfirmationModal({
  isOpen,
  onClose,
  candidate,
  onConfirm,
  isLight = false,
}: BaseDesignConfirmationModalProps) {
  const [selectedDesignName, setSelectedDesignName] = useState<string>(candidate?.designName || "");
  const [isChangingModel, setIsChangingModel] = useState<boolean>(false);
  const [isEditingStandardAreas, setIsEditingStandardAreas] = useState<boolean>(false);
  const [customAreas, setCustomAreas] = useState<CustomStandardAreas>({
    livingM2: undefined,
    garageM2: undefined,
    alfrescoM2: undefined,
    porchM2: undefined,
    totalM2: undefined,
  });

  React.useEffect(() => {
    if (candidate?.designName) {
      setSelectedDesignName(candidate.designName);
      setIsChangingModel(false);
      setCustomAreas(
        candidate.customStandardAreas || {
          livingM2: undefined,
          garageM2: undefined,
          alfrescoM2: undefined,
          porchM2: undefined,
          totalM2: undefined,
        }
      );
      setIsEditingStandardAreas(false);
    }
  }, [candidate]);

  React.useEffect(() => {
    // When manually selecting a different base model, reset custom areas
    setCustomAreas({
      livingM2: undefined,
      garageM2: undefined,
      alfrescoM2: undefined,
      porchM2: undefined,
      totalM2: undefined,
    });
    setIsEditingStandardAreas(false);
  }, [selectedDesignName]);

  if (!candidate) return null;

  // Compile all master designs for alternative selector
  const allMasterDesigns = [
    ...SINGLE_STOREY_PRICES.map((m) => ({ name: m.name, type: "Single Storey", m2: m.m2 })),
    ...DOUBLE_STOREY_PRICES.map((m) => ({ name: m.name, type: "Double Storey", m2: m.m2 })),
    ...SPLIT_LEVEL_PRICES.map((m) => ({ name: m.name, type: "Split Level", m2: m.m2 })),
    ...DUAL_OC_PRICES.map((m) => ({ name: m.name, type: "Dual Living", m2: m.m2 })),
  ];

  const currentSelection = allMasterDesigns.find((d) => d.name === selectedDesignName) || {
    name: candidate.designName,
    type: candidate.housingType,
    m2: candidate.standardTotalM2,
  };

  const masterThumb =
    LOCAL_FLOORPLAN_MAP[selectedDesignName.toLowerCase()] ||
    candidate.thumbnailUrl ||
    "/floorplans/AMBER 21.png";

  const stdAreas = getStandardAreaBreakdown(
    currentSelection.name,
    currentSelection.type,
    currentSelection.m2
  );

  const defaultLiving = Number((stdAreas.livingM2 || stdAreas.groundLivingM2 || 0).toFixed(2));
  const defaultGarage = Number((stdAreas.garageM2 || 0).toFixed(2));
  const defaultAlfresco = Number((stdAreas.alfrescoM2 || 0).toFixed(2));
  const defaultPorch = Number((stdAreas.porchM2 || 0).toFixed(2));
  const defaultTotal = Number(currentSelection.m2.toFixed(2));

  const effectiveLiving = customAreas.livingM2 !== undefined ? customAreas.livingM2 : defaultLiving;
  const effectiveGarage = customAreas.garageM2 !== undefined ? customAreas.garageM2 : defaultGarage;
  const effectiveAlfresco = customAreas.alfrescoM2 !== undefined ? customAreas.alfrescoM2 : defaultAlfresco;
  const effectivePorch = customAreas.porchM2 !== undefined ? customAreas.porchM2 : defaultPorch;
  const effectiveTotal = customAreas.totalM2 !== undefined ? customAreas.totalM2 : defaultTotal;

  const hasCustomizedStd =
    customAreas.livingM2 !== undefined ||
    customAreas.garageM2 !== undefined ||
    customAreas.alfrescoM2 !== undefined ||
    customAreas.porchM2 !== undefined ||
    customAreas.totalM2 !== undefined;

  const handleStartEditing = () => {
    if (!hasCustomizedStd) {
      setCustomAreas({
        livingM2: defaultLiving,
        garageM2: defaultGarage,
        alfrescoM2: defaultAlfresco,
        porchM2: defaultPorch,
        totalM2: defaultTotal,
      });
    }
    setIsEditingStandardAreas(true);
  };

  const handleResetStandardAreas = () => {
    setCustomAreas({
      livingM2: undefined,
      garageM2: undefined,
      alfrescoM2: undefined,
      porchM2: undefined,
      totalM2: undefined,
    });
    setIsEditingStandardAreas(false);
  };

  const handleAreaInputChange = (field: keyof CustomStandardAreas, val: string) => {
    const num = parseFloat(val);
    const updated = {
      ...customAreas,
      [field]: isNaN(num) ? 0 : Math.round(num * 100) / 100,
    };
    if (field !== "totalM2") {
      const liv = field === "livingM2" ? (isNaN(num) ? 0 : num) : (updated.livingM2 ?? defaultLiving);
      const gar = field === "garageM2" ? (isNaN(num) ? 0 : num) : (updated.garageM2 ?? defaultGarage);
      const alf = field === "alfrescoM2" ? (isNaN(num) ? 0 : num) : (updated.alfrescoM2 ?? defaultAlfresco);
      const por = field === "porchM2" ? (isNaN(num) ? 0 : num) : (updated.porchM2 ?? defaultPorch);
      updated.totalM2 = Math.round((liv + gar + alf + por) * 100) / 100;
    }
    setCustomAreas(updated);
  };

  const handleConfirmClick = () => {
    onConfirm(
      currentSelection.name,
      currentSelection.type,
      hasCustomizedStd
        ? {
            livingM2: effectiveLiving,
            garageM2: effectiveGarage,
            alfrescoM2: effectiveAlfresco,
            porchM2: effectivePorch,
            totalM2: effectiveTotal,
          }
        : undefined
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`max-w-4xl max-h-[92vh] overflow-y-auto p-0 border rounded-2xl shadow-2xl ${
          isLight
            ? "bg-white text-slate-900 border-slate-200"
            : "bg-slate-950 text-slate-100 border-slate-800"
        }`}
      >
        {/* Header Question Banner */}
        <div className="bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-700 p-6 text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
            <Home className="w-56 h-56" />
          </div>
          <div className="flex items-center gap-2 mb-2 text-cyan-200 text-xs font-semibold uppercase tracking-wider">
            <Scan className="w-4 h-4 animate-pulse" />
            <span>Step 1 of 2: Master Floorplan Verification</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight text-white">
            Is this floorplan based off the {currentSelection.name} Design?
          </h2>
        </div>

        {/* Comparison Body */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Card: Uploaded Floorplan */}
            <div
              className={`p-4 rounded-xl border flex flex-col justify-between ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-slate-800"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <FileText className="w-4 h-4" /> Uploaded Modified Plan
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
                    {candidate.file?.name || "Uploaded Plan Sheet"}
                  </span>
                </div>

                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-slate-950/80 border border-slate-800 flex items-center justify-center p-2 mb-3">
                  {candidate.candidateFloorplanUrl ? (
                    <img
                      src={candidate.candidateFloorplanUrl}
                      alt="Uploaded Modified Plan"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-center text-slate-500 text-xs">
                      <Scan className="w-8 h-8 mx-auto mb-1 opacity-50" />
                      Plan Sheet Preview
                    </div>
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-400 space-y-1 bg-black/20 p-2.5 rounded-lg border border-slate-800/60">
                <div className="flex justify-between">
                  <span>Match Confidence:</span>
                  <span className="font-semibold text-emerald-400">
                    {Math.round(candidate.confidence * 100)}% Verified
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Detection Source:</span>
                  <span className="font-medium text-slate-300 capitalize">
                    {candidate.matchSource.replace("_", " ")}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Card: Master Hudson Standard Design */}
            <div
              className={`p-4 rounded-xl border flex flex-col justify-between ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-slate-800"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Hudson Master Baseline
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-semibold">
                    {currentSelection.type}
                  </span>
                </div>

                <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-slate-950/80 border border-slate-800 flex items-center justify-center p-2 mb-3">
                  {masterThumb ? (
                    <img
                      src={masterThumb}
                      alt={currentSelection.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <div className="text-center text-slate-500 text-xs">
                      <Home className="w-8 h-8 mx-auto mb-1 opacity-50" />
                      Standard Brochure Floorplan
                    </div>
                  )}
                </div>
              </div>

              {/* Standard Dimensions Breakdown & Editable Specifications */}
              {!isEditingStandardAreas ? (
                <div className="bg-black/20 p-2.5 rounded-lg border border-slate-800/60 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-300 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-cyan-400" /> Standard Baseline Areas
                    </span>
                    <div className="flex items-center gap-2">
                      {hasCustomizedStd && (
                        <button
                          type="button"
                          onClick={handleResetStandardAreas}
                          className="text-amber-400 hover:text-amber-300 text-[10px] inline-flex items-center gap-1 underline"
                          title="Revert to master catalogue specifications"
                        >
                          <RotateCcw className="w-3 h-3" /> Reset
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleStartEditing}
                        className="text-cyan-400 hover:text-cyan-300 text-[11px] font-bold inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors"
                        title="Adjust standard m² if catalogue specifications differ"
                      >
                        <Pencil className="w-3 h-3" /> Edit Standard m²
                      </button>
                    </div>
                  </div>

                  {hasCustomizedStd && (
                    <div className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300 flex items-center justify-between">
                      <span className="font-semibold">✨ Custom Standard Baseline active</span>
                      <span className="font-mono font-bold text-amber-400">Total {effectiveTotal.toFixed(2)} m²</span>
                    </div>
                  )}

                  <div className="grid grid-cols-5 gap-1.5 text-center text-xs">
                    <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">Living</div>
                      <div className="font-bold text-white">{effectiveLiving.toFixed(1)}m²</div>
                    </div>
                    <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">Garage</div>
                      <div className="font-bold text-white">{effectiveGarage.toFixed(1)}m²</div>
                    </div>
                    <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">Alfresco</div>
                      <div className="font-bold text-white">{effectiveAlfresco.toFixed(1)}m²</div>
                    </div>
                    <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">Porch</div>
                      <div className="font-bold text-white">{effectivePorch.toFixed(1)}m²</div>
                    </div>
                    <div className="bg-cyan-950/40 p-1.5 rounded border border-cyan-800/40">
                      <div className="text-[10px] text-cyan-300 uppercase font-semibold">Total</div>
                      <div className="font-bold text-cyan-300">{effectiveTotal.toFixed(1)}m²</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/90 p-3 rounded-xl border border-cyan-500/40 space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <Pencil className="w-3.5 h-3.5 text-amber-400" /> Edit Standard Design Baseline m²
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleResetStandardAreas}
                        className="text-slate-400 hover:text-slate-200 text-[10px] underline inline-flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingStandardAreas(false)}
                        className="text-xs font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 px-2.5 py-0.5 rounded inline-flex items-center gap-1 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" /> Done
                      </button>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 leading-tight">
                    Tweak standard areas if the brochure spec differs from your specific plan sheet revision.
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                        Living m²
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={customAreas.livingM2 ?? defaultLiving}
                        onChange={(e) => handleAreaInputChange("livingM2", e.target.value)}
                        className="w-full px-2 py-1 text-xs font-mono font-bold bg-slate-950 border border-slate-700 rounded text-white focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                        Garage m²
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={customAreas.garageM2 ?? defaultGarage}
                        onChange={(e) => handleAreaInputChange("garageM2", e.target.value)}
                        className="w-full px-2 py-1 text-xs font-mono font-bold bg-slate-950 border border-slate-700 rounded text-white focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                        Alfresco m²
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={customAreas.alfrescoM2 ?? defaultAlfresco}
                        onChange={(e) => handleAreaInputChange("alfrescoM2", e.target.value)}
                        className="w-full px-2 py-1 text-xs font-mono font-bold bg-slate-950 border border-slate-700 rounded text-white focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                        Porch m²
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={customAreas.porchM2 ?? defaultPorch}
                        onChange={(e) => handleAreaInputChange("porchM2", e.target.value)}
                        className="w-full px-2 py-1 text-xs font-mono font-bold bg-slate-950 border border-slate-700 rounded text-white focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-cyan-300 mb-1">
                        Total m²
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={customAreas.totalM2 ?? defaultTotal}
                        onChange={(e) => handleAreaInputChange("totalM2", e.target.value)}
                        className="w-full px-2 py-1 text-xs font-mono font-bold bg-slate-950 border border-cyan-500/60 rounded text-cyan-300 focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Change Model Alternative Dropdown */}
          <div className="pt-2">
            {!isChangingModel ? (
              <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                <span>Not the right design? You can pick any Hudson base model manually.</span>
                <button
                  type="button"
                  onClick={() => setIsChangingModel(true)}
                  className="text-cyan-400 hover:text-cyan-300 font-medium underline inline-flex items-center gap-1"
                >
                  Choose a different base design <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                  isLight ? "bg-slate-100 border-slate-300" : "bg-slate-900 border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">
                    Select Hudson Homes Base Model:
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsChangingModel(false)}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    Close
                  </button>
                </div>
                <select
                  value={selectedDesignName}
                  onChange={(e) => setSelectedDesignName(e.target.value)}
                  className={`w-full p-2 rounded-lg border font-medium ${
                    isLight
                      ? "bg-white text-slate-900 border-slate-300"
                      : "bg-slate-950 text-white border-slate-700"
                  }`}
                >
                  <optgroup label="Single Storey Designs">
                    {SINGLE_STOREY_PRICES.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name} ({m.m2} m²)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Double Storey Designs">
                    {DOUBLE_STOREY_PRICES.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name} ({m.m2} m²)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Split Level Designs">
                    {SPLIT_LEVEL_PRICES.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name} ({m.m2} m²)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Dual Living / Duplex">
                    {DUAL_OC_PRICES.map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name} ({m.m2} m²)
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 bg-slate-900/50 border-t border-slate-800 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleConfirmClick}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold px-6 py-2.5 shadow-lg shadow-cyan-500/20 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-cyan-200 animate-pulse" />
            <span>Yes, Confirm {currentSelection.name} &amp; Run Full Scan</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
