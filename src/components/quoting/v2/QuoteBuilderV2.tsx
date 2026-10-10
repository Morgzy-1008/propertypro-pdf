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
  type V2StepId,
} from "./V2Types";
import { V2StepClient } from "./V2StepClient";
import { V2StepFloorPlan } from "./V2StepFloorPlan";
import { V2StepSiteCosts } from "./V2StepSiteCosts";
import { V2StepVariations } from "./V2StepVariations";
import { V2StepReview } from "./V2StepReview";
import type { FullQuote } from "@/lib/quoting/quoteTypes";
import { getEffectiveDesignName } from "@/lib/quoting/quoteEngine";

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

  // Instant scroll to top of window so top header and quoting mode switcher are never cut off
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "instant" });
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

  // Pricing values from quote engine
  const grossTotal = quote.pricing?.grossEstimatedInvestment ?? 0;
  const designName = getEffectiveDesignName(quote.design) || "Select Floor Plan";

  return (
    <div ref={stepContainerRef} className="space-y-6 pb-12">
      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700/50 pb-4">
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="border-emerald-500/40 text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[11px] font-bold"
          >
            Quoting Tool V2
          </Badge>
          <span className="text-xs text-slate-400">
            Rapid Progressive Quoting Engine • Hudson Homes QLD
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {savedQuotesCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenSavedEstimates}
              className={`text-xs gap-1.5 ${
                isLight
                  ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <FolderOpen className="h-3.5 w-3.5 text-cyan-400" />
              Saved Estimates ({savedQuotesCount})
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onNewQuote}
            className={`text-xs gap-1.5 ${
              isLight
                ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            New Blank
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenShare}
            className={`text-xs gap-1.5 ${
              isLight
                ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Share2 className="h-3.5 w-3.5 text-indigo-400" />
            Share
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onOpenAdminCatalogue}
            className={`text-xs gap-1.5 ${
              isLight
                ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-amber-400" />
            Admin Catalogue
          </Button>

        </div>
      </div>

      {/* Stepper Navigation Indicator */}
      <div className="overflow-x-auto pb-1 -mx-2 px-2 scrollbar-none">
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
            onSiteChange={handleSiteChange}
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

        {activeStep === "site_costs" && (
          <V2StepSiteCosts
            quote={quote}
            site={quote.siteConditions}
            onChange={handleSiteChange}
            onClientChange={handleClientChange}
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
    </div>
  );
}
