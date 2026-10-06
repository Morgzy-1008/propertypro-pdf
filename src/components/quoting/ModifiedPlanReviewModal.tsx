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
  Pencil,
  Plus,
  Trash2,
  RotateCcw,
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

  // State for editing standard total m² and individual area rows in Tab 1
  const [editingAreaIndex, setEditingAreaIndex] = useState<number | null>(null);
  const [isAddingCustomArea, setIsAddingCustomArea] = useState<boolean>(false);
  const [newAreaLabel, setNewAreaLabel] = useState<string>("Living & Family Room Extension");
  const [newAreaStd, setNewAreaStd] = useState<string>("132.4");
  const [newAreaMod, setNewAreaMod] = useState<string>("140.0");
  const [newAreaRate, setNewAreaRate] = useState<string>("1420");

  const [isEditingStandardTotal, setIsEditingStandardTotal] = useState<boolean>(false);
  const [customStandardTotalInput, setCustomStandardTotalInput] = useState<string>(
    analysis?.standardTotalM2 ? String(analysis.standardTotalM2) : ""
  );

  useEffect(() => {
    setLocalAnalysis(analysis);
    setUnconfirmedItems(analysis?.unconfirmedFeatures || []);
    if (analysis?.standardTotalM2) {
      setCustomStandardTotalInput(String(analysis.standardTotalM2));
    }
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

  const handleUpdateAreaDelta = (
    index: number,
    field: "standardM2" | "modifiedM2" | "unitRate" | "zoneLabel",
    val: string
  ) => {
    if (!localAnalysis) return;
    const updated = [...localAnalysis.areaDeltas];
    const item = { ...updated[index] };

    if (field === "zoneLabel") {
      item.zoneLabel = val;
    } else {
      const num = parseFloat(val);
      const safeNum = isNaN(num) ? 0 : Math.round(num * 100) / 100;
      if (field === "standardM2") item.standardM2 = safeNum;
      if (field === "modifiedM2") item.modifiedM2 = safeNum;
      if (field === "unitRate") item.unitRate = safeNum;

      item.deltaM2 = Math.max(0, Math.round((item.modifiedM2 - item.standardM2) * 100) / 100);
      item.subtotal = Math.round(item.deltaM2 * item.unitRate);
    }

    updated[index] = item;
    recalculateAll(
      updated,
      localAnalysis.inclusionUpgrades,
      localAnalysis.openingReplacements || [],
      localAnalysis.internalRoomChanges || []
    );
  };

  const handleSaveStandardTotal = () => {
    if (!localAnalysis) return;
    const num = parseFloat(customStandardTotalInput);
    if (!isNaN(num) && num > 0) {
      const acceptedNetDeltaM2 = localAnalysis.areaDeltas
        .filter((a) => a.accepted)
        .reduce((acc, a) => acc + a.deltaM2, 0);

      const roundedStd = Math.round(num * 100) / 100;
      setLocalAnalysis({
        ...localAnalysis,
        standardTotalM2: roundedStd,
        modifiedTotalM2: Math.round((roundedStd + acceptedNetDeltaM2) * 100) / 100,
      });
      setIsEditingStandardTotal(false);
      toast.success(`Standard baseline total updated to ${roundedStd} m²`);
    }
  };

  const handleAddCustomAreaSubmit = () => {
    if (!localAnalysis) return;
    const std = parseFloat(newAreaStd) || 0;
    const mod = parseFloat(newAreaMod) || 0;
    const rate = parseFloat(newAreaRate) || 1420;
    const delta = Math.max(0, Math.round((mod - std) * 100) / 100);

    const newArea: DetectedAreaDelta = {
      zoneKey: `custom_area_${Date.now()}`,
      zoneLabel: newAreaLabel.trim() || "Custom Area Extension",
      standardM2: std,
      modifiedM2: mod,
      deltaM2: delta,
      recipeId: "recipe_custom_ext",
      unitRate: rate,
      subtotal: Math.round(delta * rate),
      accepted: true,
    };

    const updated = [...localAnalysis.areaDeltas, newArea];
    recalculateAll(
      updated,
      localAnalysis.inclusionUpgrades,
      localAnalysis.openingReplacements || [],
      localAnalysis.internalRoomChanges || []
    );
    setIsAddingCustomArea(false);
    toast.success(`Added ${newArea.zoneLabel} (+${delta} m²)`);
  };

  const handleDeleteAreaDelta = (index: number) => {
    if (!localAnalysis) return;
    const updated = localAnalysis.areaDeltas.filter((_, i) => i !== index);
    recalculateAll(
      updated,
      localAnalysis.inclusionUpgrades,
      localAnalysis.openingReplacements || [],
      localAnalysis.internalRoomChanges || []
    );
    setEditingAreaIndex(null);
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

  const handleOpeningPriceChange = (index: number, newPrice: number) => {
    if (!localAnalysis || !localAnalysis.openingReplacements) return;
    const updated = [...localAnalysis.openingReplacements];
    const price = Math.max(0, newPrice);
    const item = updated[index];
    const credit = item.creditAmount !== undefined ? item.creditAmount : -Math.round(item.replacedItemBaselineCost * (item.creditPercent || 80) / 100);
    const netCost = Math.max(0, price + credit);
    updated[index] = {
      ...item,
      newItemCost: price,
      netCost: Math.round(netCost * 100) / 100,
    };
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

          {/* Historical Tender Knowledge & Consultant Approval Notice */}
          <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs text-slate-300 leading-relaxed">
              <span className="font-semibold text-amber-300">Prompt to Approve Price Changes &amp; Variation Additions:</span>{" "}
              The engine has matched items against authentic client tenders (Job 700469 Dacayanan Jan 2026, Job 700529 Diamond May 2026, Job 700548 Flagstone Sep 2026, Job TR-Lyons Aug 2026, Job 700512-DUAL Dave &amp; Selena Aug 2026). Review and check the boxes to approve each variation addition and price adjustment before applying to the quote.
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

        {/* Tab 1: Structural Footprint & External Extensions */}
        {activeTab === "structural" && (
          <div className="space-y-4 py-4">
            {/* Master Baseline Header Banner with Standard Total m² Quick Edit */}
            <div
              className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isLight ? "bg-amber-50/70 border-amber-200" : "bg-amber-950/20 border-amber-500/30"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Master Baseline Design:
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {localAnalysis.baseDesignName}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5 flex flex-wrap items-center gap-2">
                    <span>
                      Standard Total:{" "}
                      <strong className="text-white">{localAnalysis.standardTotalM2} m²</strong>
                    </span>
                    <span className="text-slate-500">•</span>
                    <span>
                      Modified:{" "}
                      <strong className="text-amber-400">{localAnalysis.modifiedTotalM2} m²</strong>
                    </span>
                    <span className="text-slate-500">•</span>
                    <span>
                      Net Variance:{" "}
                      <strong className="text-emerald-400">
                        {localAnalysis.netDeltaM2 >= 0 ? `+${localAnalysis.netDeltaM2}` : localAnalysis.netDeltaM2} m²
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                {!isEditingStandardTotal ? (
                  <button
                    type="button"
                    onClick={() => setIsEditingStandardTotal(true)}
                    className="text-xs font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Edit standard total m² if brochure specification is incorrect"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit Standard Total
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-amber-500/50">
                    <span className="text-[10px] text-slate-400 px-1 font-semibold uppercase">Std m²:</span>
                    <input
                      type="number"
                      step="0.01"
                      value={customStandardTotalInput}
                      onChange={(e) => setCustomStandardTotalInput(e.target.value)}
                      className="w-20 px-2 py-0.5 text-xs font-mono font-bold bg-slate-900 border border-slate-700 rounded text-amber-400 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={handleSaveStandardTotal}
                      className="px-2 py-0.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 border border-emerald-800 rounded cursor-pointer"
                      title="Save standard total"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingStandardTotal(false)}
                      className="px-1.5 py-0.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingCustomArea(true)}
                  className="text-xs font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Extension
                </button>
                <span className="text-xs text-amber-400 font-mono font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                  Subtotal: {formatAud(localAnalysis.totalAreaCost)}
                </span>
              </div>
            </div>

            {/* Add Custom Area Form */}
            {isAddingCustomArea && (
              <div className="p-3.5 rounded-xl border border-cyan-500/40 bg-slate-900/90 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-cyan-400" /> Add Structural Footprint Extension
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingCustomArea(false)}
                    className="text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="sm:col-span-4">
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                      Zone / Extension Description
                    </label>
                    <input
                      type="text"
                      value={newAreaLabel}
                      onChange={(e) => setNewAreaLabel(e.target.value)}
                      placeholder="e.g. Living Room Extension, Alfresco Extension"
                      className="w-full px-2.5 py-1 text-xs bg-slate-950 border border-slate-700 rounded text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                      Standard m²
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newAreaStd}
                      onChange={(e) => setNewAreaStd(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs font-mono bg-slate-950 border border-slate-700 rounded text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                      Modified m²
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newAreaMod}
                      onChange={(e) => setNewAreaMod(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs font-mono bg-slate-950 border border-slate-700 rounded text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">
                      Rate ($/m²)
                    </label>
                    <input
                      type="number"
                      step="10"
                      value={newAreaRate}
                      onChange={(e) => setNewAreaRate(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs font-mono bg-slate-950 border border-slate-700 rounded text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div className="sm:col-span-4 flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingCustomArea(false)}
                      className="px-3 py-1 text-xs text-slate-400 hover:text-white cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCustomAreaSubmit}
                      className="px-4 py-1 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-sm cursor-pointer"
                    >
                      Add &amp; Apply Rate
                    </button>
                  </div>
                </div>
              </div>
            )}

            {localAnalysis.areaDeltas.length === 0 ? (
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 text-center text-xs text-slate-400">
                No external perimeter footprint extensions detected. Standard external envelope maintained.
              </div>
            ) : (
              <div className="space-y-2.5">
                {localAnalysis.areaDeltas.map((area, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border transition-all ${
                      area.accepted
                        ? isLight
                          ? "bg-amber-50/50 border-amber-200"
                          : "bg-slate-900/80 border-slate-700"
                        : "opacity-50 border-dashed border-slate-800 bg-slate-950/40"
                    }`}
                  >
                    {editingAreaIndex !== idx ? (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                              {area.deltaM2 > 0 ? `+${area.deltaM2}` : `${area.deltaM2}`} m² @ ${area.unitRate}/m²)
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                            area.deltaM2 >= 0
                              ? "text-emerald-400 bg-emerald-950/60 border border-emerald-800"
                              : "text-amber-400 bg-amber-950/60 border border-amber-800"
                          }`}>
                            {area.deltaM2 > 0 ? `+${area.deltaM2}` : `${area.deltaM2}`} m²
                          </span>
                          <span className="text-xs font-mono font-bold min-w-20 text-right text-white">
                            {formatAud(area.subtotal)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingAreaIndex(idx)}
                            className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors ml-1 cursor-pointer"
                            title="Edit standard m², modified m², or rate"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Inline Editing Mode for this Area Row */
                      <div className="space-y-2.5 bg-slate-950/80 p-3 rounded-lg border border-amber-500/40">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                            <Pencil className="w-3.5 h-3.5" /> Edit Area Specification
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDeleteAreaDelta(idx)}
                              className="text-xs text-rose-400 hover:text-rose-300 inline-flex items-center gap-1 cursor-pointer"
                              title="Delete this area line item"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingAreaIndex(null)}
                              className="px-2.5 py-0.5 text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 rounded inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" /> Done
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          <div className="sm:col-span-4">
                            <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-0.5">
                              Label / Description
                            </label>
                            <input
                              type="text"
                              value={area.zoneLabel}
                              onChange={(e) => handleUpdateAreaDelta(idx, "zoneLabel", e.target.value)}
                              className="w-full px-2 py-1 text-xs bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-amber-400"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-0.5">
                              Standard m²
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={area.standardM2}
                              onChange={(e) => handleUpdateAreaDelta(idx, "standardM2", e.target.value)}
                              className="w-full px-2 py-1 text-xs font-mono bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-amber-400"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-0.5">
                              Modified m²
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={area.modifiedM2}
                              onChange={(e) => handleUpdateAreaDelta(idx, "modifiedM2", e.target.value)}
                              className="w-full px-2 py-1 text-xs font-mono bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-amber-400"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-0.5">
                              Delta m² (auto)
                            </label>
                            <input
                              type="text"
                              disabled
                              value={`+${area.deltaM2} m²`}
                              className="w-full px-2 py-1 text-xs font-mono bg-slate-900/50 border border-slate-800 rounded text-emerald-400"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-0.5">
                              Rate ($/m²)
                            </label>
                            <input
                              type="number"
                              step="10"
                              value={area.unitRate}
                              onChange={(e) => handleUpdateAreaDelta(idx, "unitRate", e.target.value)}
                              className="w-full px-2 py-1 text-xs font-mono bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:border-amber-400"
                            />
                          </div>
                        </div>
                      </div>
                    )}
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
                    key={room.id ? `${room.id}_${idx}` : `room_${idx}`}
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
                            {`80% Trade Credit: -$${Math.abs(op.creditAmount).toFixed(2)}`}
                          </span>
                          <span className="text-slate-300">New Item: +${op.newItemCost.toFixed(2)}</span>
                          <span className="text-cyan-300 font-bold">= Net: +${op.netCost.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-400">Price:</span>
                        <div className="relative w-24">
                          <span className="absolute left-2 top-2 text-[11px] text-slate-500">$</span>
                          <Input
                            type="number"
                            value={op.newItemCost}
                            onChange={(e) => handleOpeningPriceChange(idx, Number(e.target.value))}
                            disabled={!op.accepted}
                            className="h-8 pl-5 pr-1 text-xs font-mono border-slate-700 bg-slate-950 text-white"
                          />
                        </div>
                      </div>

                      <div className="text-right min-w-20">
                        <span className="text-[10px] text-slate-400 uppercase block">Net Cost</span>
                        <span className="text-xs font-mono font-bold text-emerald-400">
                          +{formatAud(op.netCost)}
                        </span>
                      </div>
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
                          {(() => {
                            const desc = `${inc.id || ""} ${inc.name || ""} ${inc.description || ""} ${inc.reason || ""}`;
                            const tenderMatch = desc.match(/Job\s+([\w-]+)\s+([\d/]+|[A-Za-z]+\s+\d{4})/i) ||
                              desc.match(/Job\s+([\w-]+).*?dated\s+([^.]+)\./i);
                            const isTenderItem = tenderMatch || /tender_bench_|cornerless|freestanding|double shower|full ht|sq\. set|barn door|laundry.*stone|overhead cupboards|scullery stone|front gable|dual 18-09/i.test(desc);

                            if (!isTenderItem) return null;

                            const jobLabel = tenderMatch
                              ? `Job ${tenderMatch[1]} (${tenderMatch[2].trim()})`
                              : /700469/i.test(desc)
                              ? "Job 700469 (27 Jan 2026)"
                              : /700548/i.test(desc)
                              ? "Job 700548 (29 Sep 2026)"
                              : /700529/i.test(desc)
                              ? "Job 700529 (19 May 2026)"
                              : /lyons/i.test(desc)
                              ? "Job TR-Lyons (12 Aug 2026)"
                              : /700512|alabaster/i.test(desc)
                              ? "Job 700512-DUAL (23 Aug 2026)"
                              : "Historical Tender Benchmark";

                            return (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-medium">
                                Tender Benchmark: {jobLabel}
                              </span>
                            );
                          })()}
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
