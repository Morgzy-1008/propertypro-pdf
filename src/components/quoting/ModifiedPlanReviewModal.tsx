import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  Check,
  X,
  Layers,
  ArrowRight,
  Database,
  Building2,
  DollarSign,
  AlertCircle,
  FileCheck2,
  Undo2,
  PackageCheck,
  CheckCircle2,
  BookmarkPlus,
  Lightbulb,
  DoorOpen,
  Maximize2,
  Grid,
  Bed,
  Bath,
  Utensils,
  Sofa,
  Percent,
} from "lucide-react";
import { formatAud } from "@/lib/pricing";
import { saveLearnedFeature } from "@/lib/quoting/featureMemoryRegistry";
import type {
  PlanModificationAnalysis,
  DetectedAreaDelta,
  DetectedInclusionUpgrade,
  UnconfirmedFeatureCandidate,
  OpeningReplacementItem,
  InternalRoomChange,
} from "@/lib/quoting/quoteTypes";
import { toast } from "sonner";

interface ModifiedPlanReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: PlanModificationAnalysis | null;
  onApply: (approved: PlanModificationAnalysis) => void;
  isLight?: boolean;
}

export function ModifiedPlanReviewModal({
  isOpen,
  onClose,
  analysis,
  onApply,
  isLight = false,
}: ModifiedPlanReviewModalProps) {
  const [localAnalysis, setLocalAnalysis] = useState<PlanModificationAnalysis | null>(analysis);
  const [unconfirmedItems, setUnconfirmedItems] = useState<UnconfirmedFeatureCandidate[]>(analysis?.unconfirmedFeatures || []);
  const [learningForm, setLearningForm] = useState<Record<string, { name: string; category: any; price: number }>>({});
  const [activeTab, setActiveTab] = useState<"structural" | "internal" | "openings" | "inclusions">("structural");

  useEffect(() => {
    setLocalAnalysis(analysis);
    setUnconfirmedItems(analysis?.unconfirmedFeatures || []);
  }, [analysis]);

  if (!localAnalysis) return null;

  const handleToggleArea = (index: number) => {
    if (!localAnalysis) return;
    const updated = [...localAnalysis.areaDeltas];
    updated[index] = { ...updated[index], accepted: !updated[index].accepted };
    recalculateAll(
      updated,
      localAnalysis.inclusionUpgrades,
      localAnalysis.openingReplacements || [],
      localAnalysis.internalRoomChanges || []
    );
  };

  const handleToggleInclusion = (index: number) => {
    if (!localAnalysis) return;
    const updated = [...localAnalysis.inclusionUpgrades];
    updated[index] = { ...updated[index], accepted: !updated[index].accepted };
    recalculateAll(
      localAnalysis.areaDeltas,
      updated,
      localAnalysis.openingReplacements || [],
      localAnalysis.internalRoomChanges || []
    );
  };

  const handleInclusionPriceChange = (index: number, newPrice: number) => {
    if (!localAnalysis) return;
    const updated = [...localAnalysis.inclusionUpgrades];
    const price = Math.max(0, newPrice);
    updated[index] = {
      ...updated[index],
      unitPrice: price,
      subtotal: Math.round(price * updated[index].quantity),
    };
    recalculateAll(
      localAnalysis.areaDeltas,
      updated,
      localAnalysis.openingReplacements || [],
      localAnalysis.internalRoomChanges || []
    );
  };

  const handleInclusionQtyChange = (index: number, newQty: number) => {
    if (!localAnalysis) return;
    const updated = [...localAnalysis.inclusionUpgrades];
    const qty = Math.max(1, newQty);
    updated[index] = {
      ...updated[index],
      quantity: qty,
      subtotal: Math.round(updated[index].unitPrice * qty),
    };
    recalculateAll(
      localAnalysis.areaDeltas,
      updated,
      localAnalysis.openingReplacements || [],
      localAnalysis.internalRoomChanges || []
    );
  };

  const handleToggleOpening = (index: number) => {
    if (!localAnalysis || !localAnalysis.openingReplacements) return;
    const updated = [...localAnalysis.openingReplacements];
    updated[index] = { ...updated[index], accepted: !updated[index].accepted };
    recalculateAll(
      localAnalysis.areaDeltas,
      localAnalysis.inclusionUpgrades,
      updated,
      localAnalysis.internalRoomChanges || []
    );
  };

  const handleToggleInternalRoom = (index: number) => {
    if (!localAnalysis || !localAnalysis.internalRoomChanges) return;
    const updated = [...localAnalysis.internalRoomChanges];
    updated[index] = { ...updated[index], accepted: !updated[index].accepted };
    recalculateAll(
      localAnalysis.areaDeltas,
      localAnalysis.inclusionUpgrades,
      localAnalysis.openingReplacements || [],
      updated
    );
  };

  const recalculateAll = (
    areas: DetectedAreaDelta[],
    inclusions: DetectedInclusionUpgrade[],
    openings: OpeningReplacementItem[],
    rooms: InternalRoomChange[]
  ) => {
    const totalAreaCost = areas
      .filter((a) => a.accepted)
      .reduce((acc, a) => acc + a.subtotal, 0);
    const totalInclusionsCost = inclusions
      .filter((i) => i.accepted)
      .reduce((acc, i) => acc + i.subtotal, 0);
    const totalOpeningsCost = openings
      .filter((o) => o.accepted)
      .reduce((acc, o) => acc + o.netCost, 0);
    const totalInternalRoomsCost = rooms
      .filter((r) => r.accepted && !r.isZeroCost)
      .reduce((acc, r) => acc + r.subtotal, 0);

    const acceptedNetDeltaM2 = areas
      .filter((a) => a.accepted)
      .reduce((acc, a) => acc + a.deltaM2, 0);

    const netTotalCost = totalAreaCost + totalInclusionsCost + totalOpeningsCost + totalInternalRoomsCost;

    setLocalAnalysis({
      ...localAnalysis!,
      areaDeltas: areas,
      inclusionUpgrades: inclusions,
      openingReplacements: openings,
      internalRoomChanges: rooms,
      totalAreaCost,
      totalInclusionsCost,
      totalOpeningsCost,
      totalInternalRoomsCost,
      netTotalCost,
      netDeltaM2: Math.round(acceptedNetDeltaM2 * 100) / 100,
      modifiedTotalM2: Math.round((localAnalysis!.standardTotalM2 + acceptedNetDeltaM2) * 100) / 100,
    });
  };

  const handleConfirmFeature = (rawSnippet: string, triggerPhrase: string) => {
    const formData = learningForm[triggerPhrase] || {
      name: triggerPhrase,
      category: "internal_general",
      price: 450,
    };

    const saved = saveLearnedFeature(
      triggerPhrase,
      formData.name,
      formData.category,
      formData.price,
      `NHC custom markup confirmed in review modal`
    );

    const newUpgrade: DetectedInclusionUpgrade = {
      id: saved.id,
      category: saved.category,
      name: saved.canonicalName,
      description: saved.description,
      baseline: "Standard brochure inclusion",
      detected: `Confirmed NHC markup '${triggerPhrase}'`,
      unitPrice: saved.defaultUnitPrice,
      quantity: 1,
      subtotal: saved.defaultUnitPrice,
      accepted: true,
      confidence: 1.0,
      isByOwner: false,
    };

    const updatedInclusions = [...(localAnalysis?.inclusionUpgrades || []), newUpgrade];
    recalculateAll(
      localAnalysis?.areaDeltas || [],
      updatedInclusions,
      localAnalysis?.openingReplacements || [],
      localAnalysis?.internalRoomChanges || []
    );
    setUnconfirmedItems((prev) => prev.filter((u) => u.triggerPhrase !== triggerPhrase));
    toast.success(`✨ Saved and remembered '${saved.canonicalName}' ($${saved.defaultUnitPrice})!`);
  };

  const handleConfirm = () => {
    if (!localAnalysis) return;
    onApply(localAnalysis);
    toast.success(
      `✨ Applied modified floorplan (${localAnalysis.modifiedTotalM2} m²) to quote!`
    );
    onClose();
  };

  const openingsList = localAnalysis.openingReplacements || [];
  const internalRoomsList = localAnalysis.internalRoomChanges || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-5xl max-h-[92vh] overflow-y-auto ${
          isLight
            ? "bg-white text-slate-900 border-slate-200"
            : "bg-slate-950 text-slate-100 border-slate-800"
        } p-6`}
      >
        <DialogHeader className="border-b border-slate-800/60 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-500/10">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>Modified Plan Full Scan Review</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                    {localAnalysis.baseDesignName}
                  </span>
                </DialogTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Standard Baseline: <strong>{localAnalysis.standardTotalM2} m²</strong> &bull; Modified Plan:{" "}
                  <strong>{localAnalysis.modifiedTotalM2} m²</strong> (
                  <span className={localAnalysis.netDeltaM2 >= 0 ? "text-emerald-400 font-semibold" : "text-amber-400 font-semibold"}>
                    {localAnalysis.netDeltaM2 >= 0 ? `+${localAnalysis.netDeltaM2}` : localAnalysis.netDeltaM2} m² net variance
                  </span>
                  )
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Tender Adjustment</span>
              <span className="text-2xl font-black text-cyan-400 font-mono">
                +{formatAud(localAnalysis.netTotalCost)}
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4 pt-2 border-t border-slate-800/80 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("structural")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === "structural"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>1. Structural Footprint ({localAnalysis.areaDeltas.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("internal")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === "internal"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <Grid className="w-3.5 h-3.5 text-purple-400" />
              <span>2. Internal Sweep &amp; Rooms ({internalRoomsList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("openings")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === "openings"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <DoorOpen className="w-3.5 h-3.5 text-emerald-400" />
              <span>3. Doors &amp; Windows 80% Credits ({openingsList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("inclusions")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === "inclusions"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>4. Inclusions &amp; Fixtures ({localAnalysis.inclusionUpgrades.length})</span>
            </button>
          </div>
        </DialogHeader>

        {/* Tab 1: Structural Footprint */}
        {activeTab === "structural" && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Layers className="h-4 w-4" />
                  Structural Footprint &amp; External Extensions
                </h4>
                <p className="text-[11px] text-slate-400">
                  External walls, covered alfresco, porches, garages, and major structural variations.
                </p>
              </div>
              <span className="text-xs text-amber-400 font-mono font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                Subtotal: {formatAud(localAnalysis.totalAreaCost)}
              </span>
            </div>

            {localAnalysis.areaDeltas.length === 0 ? (
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 text-center text-xs text-slate-400">
                No external perimeter footprint extensions detected. Standard external envelope maintained.
              </div>
            ) : (
              <div className="space-y-2.5">
                {localAnalysis.areaDeltas.map((area, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      area.accepted
                        ? isLight
                          ? "bg-amber-50/50 border-amber-200"
                          : "bg-slate-900/80 border-slate-700"
                        : "opacity-50 border-dashed border-slate-800 bg-slate-950/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={area.accepted}
                        onChange={() => handleToggleArea(idx)}
                        className="h-4 w-4 rounded border-slate-700 text-amber-500 focus:ring-amber-400"
                      />
                      <div>
                        <span className={`text-xs font-bold ${area.accepted ? "text-white" : "text-slate-500 line-through"}`}>
                          {area.zoneLabel}
                        </span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {area.standardM2} m² standard &rarr;{" "}
                          <span className="text-amber-400 font-semibold">{area.modifiedM2} m²</span> (
                          +{area.deltaM2} m² @ ${area.unitRate}/m²)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded text-[11px]">
                        +{area.deltaM2} m²
                      </span>
                      <span className="text-xs font-mono font-bold min-w-20 text-right text-white">
                        {formatAud(area.subtotal)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Full Internal Sweep & Rooms */}
        {activeTab === "internal" && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                  <Grid className="h-4 w-4" />
                  Full Internal Sweep &amp; Room Spatial Verification
                </h4>
                <p className="text-[11px] text-slate-400">
                  Scans internal partitions, verifies room functions via furniture stamps, and applies the $150/m² base wet area rate.
                </p>
              </div>
              <span className="text-xs text-purple-400 font-mono font-bold bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-lg">
                Subtotal: {formatAud(localAnalysis.totalInternalRoomsCost || 0)}
              </span>
            </div>

            {internalRoomsList.length === 0 ? (
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 text-center text-xs text-slate-400">
                All internal partition walls match standard room layouts.
              </div>
            ) : (
              <div className="space-y-2.5">
                {internalRoomsList.map((room, idx) => (
                  <div
                    key={room.id || idx}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      room.accepted
                        ? room.isZeroCost
                          ? "bg-slate-900/50 border-slate-800"
                          : "bg-purple-950/30 border-purple-800/60"
                        : "opacity-40 border-dashed border-slate-800"
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={room.accepted}
                        onChange={() => handleToggleInternalRoom(idx)}
                        className="h-4 w-4 mt-0.5 rounded border-slate-700 text-purple-500 focus:ring-purple-400"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-bold ${room.accepted ? "text-white" : "text-slate-500 line-through"}`}>
                            {room.roomName}
                          </span>
                          {room.isZeroCost ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                              <Check className="h-3 w-3 text-emerald-400" />
                              Internal Layout ($0.00 Variation)
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                              Wet Area Base + Differential (${room.unitRate}/m²)
                            </span>
                          )}

                          {room.furnitureDetected && room.furnitureDetected.length > 0 && (
                            <span className="text-[10px] text-slate-400 italic">
                              Verified: {room.furnitureDetected.join(", ")}
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {room.description}
                        </p>

                        {!room.isZeroCost && room.baseRatePerM2 && (
                          <div className="text-[10px] font-mono text-purple-300 bg-purple-950/40 border border-purple-800/40 px-2 py-1 rounded inline-block mt-1">
                            Breakdown: {room.deltaM2}m² @ ${room.baseRatePerM2}/m² base prep + ${room.finishesRatePerM2}/m² finishes
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="self-end md:self-auto text-right">
                      <span className="text-xs font-mono font-bold text-white">
                        {room.isZeroCost ? "$0.00" : formatAud(room.subtotal)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Doors & Windows (80% Credit Schedule) */}
        {activeTab === "openings" && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <DoorOpen className="h-4 w-4" />
                  Doors &amp; Windows Replacement Schedule (80% Trade Credit)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Concept Floorplan Editor openings: standard brochure items credited at 80% and new specification charged in full.
                </p>
              </div>
              <span className="text-xs text-emerald-400 font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                Subtotal: {formatAud(localAnalysis.totalOpeningsCost || 0)}
              </span>
            </div>

            {openingsList.length === 0 ? (
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 text-center text-xs text-slate-400">
                All doors and windows are unannotated standard brochure format ($0.00 variation).
              </div>
            ) : (
              <div className="space-y-2.5">
                {openingsList.map((op, idx) => (
                  <div
                    key={op.id || idx}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      op.accepted
                        ? "bg-slate-900/80 border-slate-700"
                        : "opacity-40 border-dashed border-slate-800"
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={op.accepted}
                        onChange={() => handleToggleOpening(idx)}
                        className="h-4 w-4 mt-1 rounded border-slate-700 text-emerald-500 focus:ring-emerald-400"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded">
                            {op.annotationCode}
                          </span>
                          <span className={`text-xs font-bold ${op.accepted ? "text-white" : "text-slate-500 line-through"}`}>
                            {op.newItemName}
                          </span>
                          <span className="text-[10px] text-slate-400">({op.location || "Perimeter Opening"})</span>
                        </div>

                        <p className="text-[11px] text-slate-400">
                          {op.description}
                        </p>

                        {/* Trade Credit Calculation Box */}
                        <div className="flex items-center gap-3 text-[11px] font-mono mt-1 flex-wrap">
                          <span className="text-slate-400">Replaced: {op.replacedItemName} (${op.replacedItemBaselineCost.toFixed(2)})</span>
                          <span className="text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/80 px-1.5 py-0.5 rounded">
                            80% Trade Credit: -${Math.abs(op.creditAmount).toFixed(2)}
                          </span>
                          <span className="text-slate-300">New Item: +${op.newItemCost.toFixed(2)}</span>
                          <span className="text-cyan-300 font-bold">= Net: +${op.netCost.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="self-end md:self-auto text-right">
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        +{formatAud(op.netCost)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Inclusions & Fixtures */}
        {activeTab === "inclusions" && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <PackageCheck className="h-4 w-4" />
                  Architectural Specifications &amp; Fixture Upgrades
                </h4>
                <p className="text-[11px] text-slate-400">
                  Kitchen waterfall stone ends, double basins, custom cabinetry, and ceiling height lifts.
                </p>
              </div>
              <span className="text-xs text-cyan-400 font-mono font-bold bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-lg">
                Subtotal: {formatAud(localAnalysis.totalInclusionsCost)}
              </span>
            </div>

            {localAnalysis.inclusionUpgrades.length === 0 ? (
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 text-center text-xs text-slate-400">
                No additional fixture upgrades detected above standard brochure specification.
              </div>
            ) : (
              <div className="space-y-2.5">
                {localAnalysis.inclusionUpgrades.map((inc, idx) => (
                  <div
                    key={inc.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      inc.accepted
                        ? "bg-slate-900/80 border-slate-700"
                        : "opacity-40 border-dashed border-slate-800"
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={inc.accepted}
                        onChange={() => handleToggleInclusion(idx)}
                        className="h-4 w-4 mt-1 rounded border-slate-700 text-cyan-500 focus:ring-cyan-400"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-bold ${inc.accepted ? "text-white" : "text-slate-500 line-through"}`}>
                            {inc.name}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                            {Math.round(inc.confidence * 100)}% Verified
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{inc.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-400">Qty:</span>
                        <Input
                          type="number"
                          min={1}
                          value={inc.quantity}
                          onChange={(e) => handleInclusionQtyChange(idx, Number(e.target.value))}
                          disabled={!inc.accepted}
                          className="h-8 w-14 text-xs font-mono border-slate-700 bg-slate-950 text-center"
                        />
                      </div>

                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-400">Price:</span>
                        <div className="relative w-24">
                          <span className="absolute left-2 top-2 text-[11px] text-slate-500">$</span>
                          <Input
                            type="number"
                            value={inc.unitPrice}
                            onChange={(e) => handleInclusionPriceChange(idx, Number(e.target.value))}
                            disabled={!inc.accepted}
                            className="h-8 pl-5 pr-1 text-xs font-mono border-slate-700 bg-slate-950"
                          />
                        </div>
                      </div>

                      <span className="text-xs font-mono font-bold min-w-20 text-right">
                        {formatAud(inc.subtotal)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer Summary & Action */}
        <DialogFooter className="border-t border-slate-800/80 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs flex-wrap">
            <div>
              <span className="text-slate-400">Footprint: </span>
              <span className="font-bold text-amber-400 font-mono">
                {formatAud(localAnalysis.totalAreaCost)}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Internal: </span>
              <span className="font-bold text-purple-400 font-mono">
                {formatAud(localAnalysis.totalInternalRoomsCost || 0)}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Openings (80% Credit): </span>
              <span className="font-bold text-emerald-400 font-mono">
                {formatAud(localAnalysis.totalOpeningsCost || 0)}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Inclusions: </span>
              <span className="font-bold text-cyan-400 font-mono">
                {formatAud(localAnalysis.totalInclusionsCost)}
              </span>
            </div>
            <div className="border-l border-slate-800 pl-4">
              <span className="text-slate-400 font-medium">Net Tender Delta: </span>
              <span className="font-bold text-base text-cyan-400 font-mono">
                +{formatAud(localAnalysis.netTotalCost)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs border-slate-700 text-slate-300 hover:bg-slate-900"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              className="text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white gap-1.5 shadow-md shadow-cyan-600/20"
            >
              <CheckCircle2 className="h-4 w-4" />
              Apply to Quote
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
