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
} from "lucide-react";
import {
  SINGLE_STOREY_PRICES,
  DOUBLE_STOREY_PRICES,
  SPLIT_LEVEL_PRICES,
  DUAL_OC_PRICES,
} from "@/lib/pricelist.data";
import { LOCAL_FLOORPLAN_MAP } from "@/lib/quoting/localFloorplanMap.data";
import { getStandardAreaBreakdown } from "@/lib/quoting/quoteEngine";
import type { BaseDesignCandidate } from "@/lib/quoting/quoteTypes";

interface BaseDesignConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: BaseDesignCandidate | null;
  onConfirm: (confirmedDesignName: string, confirmedHousingType: string) => void;
  isLight?: boolean;
}

export function BaseDesignConfirmationModal({
  isOpen,
  onClose,
  candidate,
  onConfirm,
  isLight = false,
}: BaseDesignConfirmationModalProps) {
  const [selectedDesignName, setSelectedDesignName] = useState<string>(candidate?.designName || "Amber 21");
  const [isChangingModel, setIsChangingModel] = useState<boolean>(false);

  React.useEffect(() => {
    if (candidate?.designName) {
      setSelectedDesignName(candidate.designName);
      setIsChangingModel(false);
    }
  }, [candidate]);

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

  const handleConfirmClick = () => {
    onConfirm(currentSelection.name, currentSelection.type);
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

          <h2 className="text-2xl font-black tracking-tight text-white mb-2">
            Is this floorplan based off the{" "}
            <span className="underline decoration-cyan-300 decoration-wavy decoration-2">
              {currentSelection.name}
            </span>{" "}
            Design?
          </h2>

          <p className="text-cyan-100 text-sm max-w-2xl">
            {candidate.matchReason ||
              "The scanning engine recognizes matching architectural boundaries and sheet titles against our standard master files."}
          </p>
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

              {/* Standard Dimensions Breakdown */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs bg-black/20 p-2.5 rounded-lg border border-slate-800/60">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Living</div>
                  <div className="font-bold text-white">
                    {(stdAreas.livingM2 || stdAreas.groundLivingM2 || 0).toFixed(1)}m²
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Garage</div>
                  <div className="font-bold text-white">{(stdAreas.garageM2 || 0).toFixed(1)}m²</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Alfresco</div>
                  <div className="font-bold text-white">{(stdAreas.alfrescoM2 || 0).toFixed(1)}m²</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase">Total</div>
                  <div className="font-bold text-cyan-400">{currentSelection.m2.toFixed(1)}m²</div>
                </div>
              </div>
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
