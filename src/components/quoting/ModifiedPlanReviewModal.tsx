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
} from "lucide-react";
import { formatAud } from "@/lib/pricing";
import { saveLearnedFeature } from "@/lib/quoting/featureMemoryRegistry";
import type {
  PlanModificationAnalysis,
  DetectedAreaDelta,
  DetectedInclusionUpgrade,
  UnconfirmedFeatureCandidate,
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

  useEffect(() => {
    setLocalAnalysis(analysis);
    setUnconfirmedItems(analysis?.unconfirmedFeatures || []);
  }, [analysis]);

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
    recalculateTotals(localAnalysis?.areaDeltas || [], updatedInclusions);
    setUnconfirmedItems((prev) => prev.filter((u) => u.triggerPhrase !== triggerPhrase));
    toast.success(`✨ Saved and remembered '${saved.canonicalName}' ($${saved.defaultUnitPrice}) for all future estimates!`);
  };

  if (!localAnalysis) return null;

  const handleToggleArea = (index: number) => {
    if (!localAnalysis) return;
    const updated = [...localAnalysis.areaDeltas];
    updated[index] = { ...updated[index], accepted: !updated[index].accepted };
    recalculateTotals(updated, localAnalysis.inclusionUpgrades);
  };

  const handleAreaRateChange = (index: number, newRate: number) => {
    if (!localAnalysis) return;
    const updated = [...localAnalysis.areaDeltas];
    const rate = Math.max(0, newRate);
    updated[index] = {
      ...updated[index],
      unitRate: rate,
      subtotal: Math.round(updated[index].deltaM2 * rate),
    };
    recalculateTotals(updated, localAnalysis.inclusionUpgrades);
  };

  const handleToggleInclusion = (index: number) => {
    if (!localAnalysis) return;
    const updated = [...localAnalysis.inclusionUpgrades];
    updated[index] = { ...updated[index], accepted: !updated[index].accepted };
    recalculateTotals(localAnalysis.areaDeltas, updated);
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
    recalculateTotals(localAnalysis.areaDeltas, updated);
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
    recalculateTotals(localAnalysis.areaDeltas, updated);
  };

  const recalculateTotals = (
    areas: DetectedAreaDelta[],
    inclusions: DetectedInclusionUpgrade[]
  ) => {
    const totalAreaCost = areas
      .filter((a) => a.accepted)
      .reduce((acc, a) => acc + a.subtotal, 0);
    const totalInclusionsCost = inclusions
      .filter((i) => i.accepted)
      .reduce((acc, i) => acc + i.subtotal, 0);
    const acceptedNetDeltaM2 = areas
      .filter((a) => a.accepted)
      .reduce((acc, a) => acc + a.deltaM2, 0);

    setLocalAnalysis({
      ...localAnalysis!,
      areaDeltas: areas,
      inclusionUpgrades: inclusions,
      totalAreaCost,
      totalInclusionsCost,
      netTotalCost: totalAreaCost + totalInclusionsCost,
      netDeltaM2: Math.round(acceptedNetDeltaM2 * 100) / 100,
      modifiedTotalM2: Math.round((localAnalysis!.standardTotalM2 + acceptedNetDeltaM2) * 100) / 100,
    });
  };

  const handleConfirm = () => {
    if (!localAnalysis) return;
    onApply(localAnalysis);
    toast.success(
      `✨ Applied modified floorplan (${localAnalysis.modifiedTotalM2} m²) and ${localAnalysis.inclusionUpgrades.filter((i) => i.accepted).length} inclusion upgrades to quote!`
    );
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-4xl max-h-[90vh] overflow-y-auto ${
          isLight
            ? "bg-white text-slate-900 border-slate-200"
            : "bg-slate-950 text-slate-100 border-slate-800"
        } p-6`}
      >
        <DialogHeader className="border-b border-slate-800/60 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  Modified Floorplan Recognition &amp; Discrepancy Review
                </DialogTitle>
                <p className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"} mt-0.5`}>
                  Verify detected area expansions and fixture upgrades before injecting into the active quote.
                </p>
              </div>
            </div>

            <div className="text-right flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5">
                {localAnalysis.detectionSource === "gemini_vision" && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-purple-400" />
                    Gemini AI Vision
                  </span>
                )}
                {localAnalysis.detectionSource === "canvas_vision" && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                    <Layers className="h-3 w-3 text-cyan-400" />
                    Architectural Vision Diff
                  </span>
                )}
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  {localAnalysis.baseDesignName} ({localAnalysis.housingType})
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                Standard: {localAnalysis.standardTotalM2} m² &rarr; Modified:{" "}
                <span className="text-cyan-400 font-bold">{localAnalysis.modifiedTotalM2} m²</span> (
                {localAnalysis.netDeltaM2 > 0 ? `+${localAnalysis.netDeltaM2}` : localAnalysis.netDeltaM2} m²)
              </p>
            </div>
          </div>
        </DialogHeader>

        {(localAnalysis.geminiNotes || localAnalysis.canvasNotes) && (
          <div className="mt-3 px-3.5 py-2.5 rounded-xl bg-purple-950/30 border border-purple-800/40 text-[11px] text-purple-200 flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="font-semibold text-purple-300">
                {localAnalysis.detectionSource === "canvas_vision" ? "Architectural Assessment:" : "AI Architectural Assessment:"}
              </strong>{" "}
              {localAnalysis.geminiNotes || localAnalysis.canvasNotes}
            </p>
          </div>
        )}

        {localAnalysis.areaDeltas.length === 0 && localAnalysis.inclusionUpgrades.length === 0 && (
          <div className="my-3 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs font-bold">Standard Baseline Verified — Zero False Positives</p>
              <p className="text-[11px] text-emerald-400/80 mt-0.5">
                This floorplan matches the standard {localAnalysis.baseDesignName} brochure specifications. Zero living extensions, zero waterfall ends, and zero unverified upgrades were found ($0.00 tender adjustment).
              </p>
            </div>
          </div>
        )}

        <div className="space-y-6 my-4">
          {/* Section 1: Spatial Area Modifications */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                <Layers className="h-4 w-4" />
                1. Spatial &amp; Room Area Modifications (Internal m²)
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">
                Subtotal: {formatAud(localAnalysis.totalAreaCost)}
              </span>
            </div>

            {localAnalysis.areaDeltas.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 border rounded-lg">
                No spatial perimeter changes detected from standard floorplan.
              </p>
            ) : (
              <div className="space-y-2">
                {localAnalysis.areaDeltas.map((area, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
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
                        <p className="text-[11px] text-slate-400">
                          {area.standardM2} m² baseline &rarr;{" "}
                          <span className="text-amber-400 font-semibold">{area.modifiedM2} m²</span> (
                          +{area.deltaM2} m²)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-400">Rate:</span>
                        <div className="relative w-24">
                          <span className="absolute left-2 top-2 text-[11px] text-slate-500">$</span>
                          <Input
                            type="number"
                            value={area.unitRate}
                            onChange={(e) => handleAreaRateChange(idx, Number(e.target.value))}
                            disabled={!area.accepted}
                            className="h-8 pl-5 pr-1 text-xs font-mono border-slate-700 bg-slate-950"
                          />
                        </div>
                        <span className="text-slate-400 text-[10px]">/m²</span>
                      </div>

                      <span className="text-xs font-mono font-bold min-w-20 text-right">
                        {formatAud(area.subtotal)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Learning Card for Unconfirmed NHC Features */}
          {unconfirmedItems.length > 0 && (
            <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-200 space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-300">
                    {unconfirmedItems.length} Unconfirmed NHC Feature(s) Detected (Zero Guessing)
                  </p>
                  <p className="text-[11px] text-amber-400/80">
                    Confirm the definition and price once. The engine will remember this for all future estimates.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                {unconfirmedItems.map((item) => {
                  const currentForm = learningForm[item.triggerPhrase] || {
                    name: item.triggerPhrase,
                    category: item.suggestedCategory || "internal_general",
                    price: item.suggestedPrice || 450,
                  };

                  return (
                    <div
                      key={item.triggerPhrase}
                      className="p-3 rounded-lg bg-slate-950/80 border border-amber-500/30 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded">
                            {item.triggerPhrase}
                          </span>
                          <span className="text-[10px] text-slate-400">Found on floorplan</span>
                        </div>
                        <Input
                          type="text"
                          value={currentForm.name}
                          placeholder="Feature Canonical Name"
                          onChange={(e) =>
                            setLearningForm({
                              ...learningForm,
                              [item.triggerPhrase]: { ...currentForm, name: e.target.value },
                            })
                          }
                          className="h-8 text-xs bg-slate-900 border-slate-700 text-slate-200"
                        />
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-auto">
                        <div className="relative w-24">
                          <span className="absolute left-2 top-2 text-[11px] text-slate-500">$</span>
                          <Input
                            type="number"
                            value={currentForm.price}
                            onChange={(e) =>
                              setLearningForm({
                                ...learningForm,
                                [item.triggerPhrase]: { ...currentForm, price: Number(e.target.value) },
                              })
                            }
                            className="h-8 pl-5 pr-1 text-xs font-mono bg-slate-900 border-slate-700 text-slate-200"
                          />
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleConfirmFeature(item.rawSnippet, item.triggerPhrase)}
                          className="h-8 text-xs bg-amber-600 hover:bg-amber-500 text-white font-medium"
                        >
                          <BookmarkPlus className="h-3.5 w-3.5 mr-1" />
                          Confirm &amp; Remember
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Detected Inclusions & Fixture Upgrades */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                <PackageCheck className="h-4 w-4" />
                2. Detected Inclusions &amp; Fixture Upgrades (Brochure Baseline Comparison)
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">
                Subtotal: {formatAud(localAnalysis.totalInclusionsCost)}
              </span>
            </div>

            {localAnalysis.inclusionUpgrades.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 border rounded-lg">
                No fixture upgrades detected above standard brochure specification.
              </p>
            ) : (
              <div className="space-y-2.5">
                {localAnalysis.inclusionUpgrades.map((inc, idx) => (
                  <div
                    key={inc.id}
                    className={`p-3 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      inc.accepted
                        ? isLight
                          ? "bg-cyan-50/50 border-cyan-200"
                          : "bg-slate-900/80 border-slate-700"
                        : "opacity-50 border-dashed border-slate-800 bg-slate-950/40"
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
                            {Math.round(inc.confidence * 100)}% Confidence
                          </span>
                          {inc.isByOwner ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                              By Owner / Excluded from Contract ($0)
                            </span>
                          ) : inc.unitPrice === 0 ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              Design / Layout Variation ($0)
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                              Billable Upgrade
                            </span>
                          )}
                          {inc.isCustomItem && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                              Custom Item (+20% Builder Margin)
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {inc.description}
                        </p>
                        {inc.customBreakdown && (
                          <p className={`text-[10px] font-mono px-2.5 py-1.5 rounded-lg border ${
                            isLight
                              ? "bg-blue-50 text-blue-900 border-blue-200"
                              : "bg-blue-950/40 text-blue-300 border-blue-800/50"
                          }`}>
                            Materials: {formatAud(inc.customBreakdown.materials)} + Trade Labor: {formatAud(inc.customBreakdown.labor)} + 20% Builder Margin: {formatAud(inc.customBreakdown.marginCost)}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-[10px] flex-wrap">
                          <span className="text-slate-500">Brochure Baseline: {inc.baseline}</span>
                          <span className="text-cyan-500">&bull;</span>
                          <span className="text-cyan-400">Detected: {inc.detected}</span>
                          {inc.reason && (
                            <>
                              <span className="text-slate-500">&bull;</span>
                              <span className="text-slate-400 italic">Source: {inc.reason}</span>
                            </>
                          )}
                        </div>
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
        </div>

        {/* Summary Footer */}
        <div className="border-t border-slate-800/80 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-slate-400">Area Delta: </span>
              <span className="font-bold text-amber-500 font-mono">
                {localAnalysis.netDeltaM2 > 0 ? `+${localAnalysis.netDeltaM2}` : localAnalysis.netDeltaM2} m² ({formatAud(localAnalysis.totalAreaCost)})
              </span>
            </div>
            <div>
              <span className="text-slate-400">Inclusions: </span>
              <span className="font-bold text-cyan-400 font-mono">
                {formatAud(localAnalysis.totalInclusionsCost)}
              </span>
            </div>
            <div className="border-l border-slate-800 pl-4">
              <span className="text-slate-400">Total Adjustment: </span>
              <span className="font-bold text-base text-emerald-400 font-mono">
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
              Cancel / Discard
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirm}
              className="text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white gap-1.5 shadow-md shadow-cyan-600/20"
            >
              <CheckCircle2 className="h-4 w-4" />
              Submit into Quote
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
