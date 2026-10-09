import React, { useState, useRef } from "react";
import {
  User,
  Home,
  PackageCheck,
  Compass,
  FileText,
  Save,
  Download,
  Share2,
  FolderOpen,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  ChevronRight,
  Layers,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatAud } from "@/lib/pricing";
import { useTheme } from "@/lib/theme";
import {
  V2_STEPS,
  POPULAR_VARIATIONS,
  type V2StepId,
  type QuickQuoteTemplate,
} from "./V2Types";
import { V2StepClient } from "./V2StepClient";
import { V2StepFloorPlan } from "./V2StepFloorPlan";
import { V2StepInclusions } from "./V2StepInclusions";
import { V2StepSiteCosts } from "./V2StepSiteCosts";
import { V2StepVariations } from "./V2StepVariations";
import { V2StepReview } from "./V2StepReview";
import type { FullQuote, QuoteSelectedLineItem } from "@/lib/quoting/quoteTypes";
import {
  getEffectiveDesignName,
  getStandardAreaBreakdown,
  getTierPrice,
  getAutomatedPromotionDiscount,
} from "@/lib/quoting/quoteEngine";
import {
  SINGLE_STOREY_PRICES,
  DOUBLE_STOREY_PRICES,
  DUAL_OC_PRICES,
  SPLIT_LEVEL_PRICES,
} from "@/lib/pricelist.data";
import { plansForDesign } from "@/components/flyer/floorplans";
import { toast } from "sonner";

interface QuoteBuilderV2Props {
  quote: FullQuote;
  onUpdateQuote: (patch: Partial<FullQuote>) => void;
  onSaveQuote: () => Promise<void>;
  onDownloadPdf: () => Promise<void>;
  onOpenShare: () => void;
  onOpenSavedEstimates: () => void;
  onOpenAdminCatalogue: () => void;
  onNewQuote: () => void;
  onSwitchToDetailed: () => void;
  savedQuotesCount: number;
  saving: boolean;
  downloading: boolean;
}

export function QuoteBuilderV2({
  quote,
  onUpdateQuote,
  onSaveQuote,
  onDownloadPdf,
  onOpenShare,
  onOpenSavedEstimates,
  onOpenAdminCatalogue,
  onNewQuote,
  onSwitchToDetailed,
  savedQuotesCount,
  saving,
  downloading,
}: QuoteBuilderV2Props) {
  const { mode } = useTheme();
  const isLight = mode === "normal";

  const [activeStep, setActiveStep] = useState<V2StepId>("client");
  const stepContainerRef = useRef<HTMLDivElement>(null);

  const currentStepConfig = V2_STEPS.find((s) => s.id === activeStep) || V2_STEPS[0];
  const currentStepIndex = V2_STEPS.findIndex((s) => s.id === activeStep);

  const scrollToTop = () => {
    if (stepContainerRef.current) {
      stepContainerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleGoNext = () => {
    if (currentStepIndex < V2_STEPS.length - 1) {
      setActiveStep(V2_STEPS[currentStepIndex + 1].id);
      scrollToTop();
    }
  };

  const handleGoPrev = () => {
    if (currentStepIndex > 0) {
      setActiveStep(V2_STEPS[currentStepIndex - 1].id);
      scrollToTop();
    }
  };

  const handleStepClick = (stepId: V2StepId) => {
    setActiveStep(stepId);
    scrollToTop();
  };

  // Handlers for updating quote slices
  const handleClientChange = (patch: Partial<FullQuote["client"]>) => {
    onUpdateQuote({ client: { ...quote.client, ...patch } });
  };

  const handleDesignChange = (patch: Partial<FullQuote["design"]>) => {
    onUpdateQuote({ design: { ...quote.design, ...patch } });
  };

  const handleSiteChange = (patch: Partial<FullQuote["siteConditions"]>) => {
    onUpdateQuote({ siteConditions: { ...quote.siteConditions, ...patch } });
  };

  const handleLineItemsChange = (items: FullQuote["lineItems"]) => {
    onUpdateQuote({ lineItems: items });
  };

  const handleAddInclusionLineItems = (newItems: any[]) => {
    const filtered = (quote.lineItems || []).filter((item) => !item.id.startsWith("mod_"));
    const existingMap = new Map(filtered.map((item) => [item.id, item]));
    for (const item of newItems) {
      existingMap.set(item.id, item);
    }
    onUpdateQuote({ lineItems: Array.from(existingMap.values()) });
  };

  // 1-Click Fast Start Quote Template handler
  const handleApplyTemplate = (tmpl: QuickQuoteTemplate) => {
    const allModels = [
      ...SINGLE_STOREY_PRICES,
      ...DOUBLE_STOREY_PRICES,
      ...DUAL_OC_PRICES,
      ...SPLIT_LEVEL_PRICES,
    ];
    const matchedModel = allModels.find(
      (m) => m.name.toLowerCase() === tmpl.designName.toLowerCase()
    );

    const basePrice = matchedModel
      ? getTierPrice(matchedModel, tmpl.specTier, tmpl.housingType)
      : quote.design.basePrice || 349900;
    const stdM2 = matchedModel ? matchedModel.m2 : 192.24;
    const stdAreas = getStandardAreaBreakdown(tmpl.designName, tmpl.housingType, stdM2);
    const plans = plansForDesign(tmpl.designName);

    // Site settings based on preset
    const sitePatch: Partial<FullQuote["siteConditions"]> = {
      soilClass: tmpl.sitePresetId === "sloping_reactive" ? "Class H2" : tmpl.sitePresetId === "flat_greenfield" ? "Class M" : "Class H1",
      fallMeters: tmpl.sitePresetId === "sloping_reactive" ? 1.2 : tmpl.sitePresetId === "flat_greenfield" ? 0 : 0.5,
      screwPieringRequired: tmpl.sitePresetId !== "flat_greenfield",
      demolitionAsbestosRequired: tmpl.sitePresetId === "knockdown_rebuild",
      sedimentAssetProtectionCost: 1950,
    };
    if (tmpl.sitePresetId === "knockdown_rebuild") {
      sitePatch.demolitionAsbestosCost = 34500;
      sitePatch.trafficControlRequired = true;
      sitePatch.trafficControlCost = 6500;
    }

    // Line items
    const selectedLineItems: QuoteSelectedLineItem[] = POPULAR_VARIATIONS
      .filter((p) => tmpl.variationIds.includes(p.id))
      .map((p) => ({
        id: p.id,
        catalogueItemId: p.id,
        category: p.category,
        name: p.name,
        description: p.description,
        unitType: "fixed",
        unitRate: p.price,
        quantity: 1,
        subtotal: p.price,
        isIncluded: true,
        isClientSelectable: true,
        clientSelected: true,
      }));

    onUpdateQuote({
      client: {
        ...quote.client,
        ...tmpl.client,
      },
      design: {
        ...quote.design,
        designName: tmpl.designName,
        housingType: tmpl.housingType as any,
        specTier: tmpl.specTier,
        designM2: stdM2,
        standardDesignM2: stdM2,
        basePrice,
        standardBasePrice: basePrice,
        standardAreas: stdAreas,
        modifiedAreas: { ...stdAreas },
        isModifiedFloorplan: false,
        floorplanUrl: plans[0]?.url || quote.design.floorplanUrl,
        promotionsDiscount: getAutomatedPromotionDiscount(stdM2),
      },
      siteConditions: {
        ...quote.siteConditions,
        ...sitePatch,
      },
      lineItems: selectedLineItems,
    });

    toast.success(`Loaded ${tmpl.name} template! Advancing to estimate summary...`);
    setActiveStep("review");
    scrollToTop();
  };

  const designName = getEffectiveDesignName(quote.design) || "Design Not Selected";
  const grossTotal = quote.pricing?.grossEstimatedInvestment || 0;

  return (
    <div ref={stepContainerRef} className="space-y-6 pb-36">
      {/* V2 Intro & Step Indicator */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 rounded-2xl border ${
        isLight
          ? "bg-slate-50 border-slate-200"
          : "bg-slate-900/40 border-slate-800/80"
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs flex-none">
            ⚡
          </div>
          <div>
            <span className={`text-xs font-bold ${isLight ? "text-slate-800" : "text-slate-200"}`}>
              Quoting Tool V2 — Express Flow
            </span>
            <span className="text-[11px] text-slate-400 block">
              Step {currentStepIndex + 1} of 6: {currentStepConfig.label} • {currentStepConfig.description}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onSwitchToDetailed}
            className={`text-xs gap-1.5 h-8 cursor-pointer ${
              isLight ? "text-slate-600 hover:text-slate-950" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-cyan-400" />
            Switch to Detailed Studio
          </Button>
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="overflow-x-auto pb-2 scrollbar-none">
        <div className="flex items-center min-w-[640px] gap-2">
          {V2_STEPS.map((step, idx) => {
            const isCurrent = activeStep === step.id;
            const isCompleted = idx < currentStepIndex;

            return (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => handleStepClick(step.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isCurrent
                      ? isLight
                        ? "bg-emerald-100 text-emerald-950 font-bold border border-emerald-400 shadow-xs"
                        : "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/50 shadow-sm"
                      : isCompleted
                      ? isLight
                        ? "bg-slate-100 text-slate-800 border border-slate-200"
                        : "bg-slate-900/80 text-slate-300 border border-slate-800 hover:border-slate-700"
                      : isLight
                      ? "text-slate-400 hover:text-slate-600 border border-transparent"
                      : "text-slate-500 hover:text-slate-300 border border-transparent"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isCurrent
                        ? "bg-emerald-500 text-slate-950"
                        : isCompleted
                        ? "bg-emerald-500/30 text-emerald-400"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {isCompleted ? <Check className="h-3 w-3 stroke-[3]" /> : step.number}
                  </span>
                  <span>{step.label}</span>
                </button>

                {idx < V2_STEPS.length - 1 && (
                  <div
                    className={`h-[2px] flex-1 min-w-[12px] rounded-full transition-colors ${
                      idx < currentStepIndex
                        ? "bg-emerald-500/50"
                        : isLight
                        ? "bg-slate-200"
                        : "bg-slate-800"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Active Question / Step Content Box */}
      <div
        className={`rounded-3xl border p-6 sm:p-8 shadow-2xl transition-all ${
          isLight
            ? "border-slate-200 bg-white shadow-slate-900/5"
            : "border-slate-800/80 bg-slate-900/70 backdrop-blur-xl"
        }`}
      >
        {activeStep === "client" && (
          <V2StepClient
            client={quote.client}
            onChange={handleClientChange}
            onApplyTemplate={handleApplyTemplate}
            onNext={handleGoNext}
            isLight={isLight}
          />
        )}

        {activeStep === "floorplan" && (
          <V2StepFloorPlan
            design={quote.design}
            onChange={handleDesignChange}
            onAddInclusionLineItems={handleAddInclusionLineItems}
            onNext={handleGoNext}
            onPrev={handleGoPrev}
            isLight={isLight}
          />
        )}

        {activeStep === "inclusions" && (
          <V2StepInclusions
            design={quote.design}
            onChange={handleDesignChange}
            onNext={handleGoNext}
            onPrev={handleGoPrev}
            isLight={isLight}
          />
        )}

        {activeStep === "site_costs" && (
          <V2StepSiteCosts
            quote={quote}
            site={quote.siteConditions}
            onChange={handleSiteChange}
            onNext={handleGoNext}
            onPrev={handleGoPrev}
            isLight={isLight}
          />
        )}

        {activeStep === "variations" && (
          <V2StepVariations
            quote={quote}
            lineItems={quote.lineItems}
            onChange={handleLineItemsChange}
            onNext={handleGoNext}
            onPrev={handleGoPrev}
            isLight={isLight}
          />
        )}

        {activeStep === "review" && (
          <V2StepReview
            quote={quote}
            onPrev={handleGoPrev}
            onSaveQuote={onSaveQuote}
            onDownloadPdf={onDownloadPdf}
            onOpenShare={onOpenShare}
            onSwitchToDetailed={onSwitchToDetailed}
            onNewQuote={onNewQuote}
            saving={saving}
            downloading={downloading}
            isLight={isLight}
          />
        )}
      </div>

      {/* Floating Bottom Estimate Bar (Unified with Prev & Next actions) */}
      <div className="fixed bottom-4 left-0 right-0 z-40 px-4 pointer-events-none">
        <div
          className={`max-w-4xl mx-auto rounded-2xl border p-3.5 shadow-2xl backdrop-blur-xl pointer-events-auto flex items-center justify-between gap-4 ${
            isLight
              ? "bg-white/95 border-slate-200 text-slate-900 shadow-slate-900/10"
              : "bg-slate-950/95 border-slate-800 text-white shadow-black/40"
          }`}
        >
          {/* Left summary info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="hidden sm:flex w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 items-center justify-center flex-none">
              <Home className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-xs font-bold truncate">
                  {quote.client.clientName || "Draft Estimate"}
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-xs text-slate-400 truncate">
                  {designName}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block truncate">
                {quote.design.specTier || "H2"} • Step {currentStepIndex + 1} of 6: {currentStepConfig.shortLabel}
              </span>
            </div>
          </div>

          {/* Right total and action */}
          <div className="flex items-center gap-3 flex-none">
            <div className="text-right">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">
                Turnkey Investment
              </span>
              <span className={`text-base sm:text-lg font-bold font-mono ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
                {formatAud(grossTotal)}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {currentStepIndex > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGoPrev}
                  className={`h-10 px-3 text-xs gap-1 cursor-pointer ${
                    isLight
                      ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                      : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Prev</span>
                </Button>
              )}

              {activeStep !== "review" ? (
                <Button
                  size="sm"
                  onClick={handleGoNext}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs gap-1.5 h-10 px-4 shadow-sm cursor-pointer"
                >
                  <span>Next</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={onDownloadPdf}
                  disabled={downloading}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-slate-950 font-bold text-xs gap-1.5 h-10 px-4 shadow-sm cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>PDF</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
