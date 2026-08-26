import React from "react";
import {
  Download,
  Save,
  Share2,
  Building,
  Shield,
  Layers,
  Sparkles,
  Tag,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatAud } from "@/lib/pricing";
import { getEffectiveDesignM2, getEffectiveDesignName } from "@/lib/quoting/quoteEngine";
import type { FullQuote } from "@/lib/quoting/quoteTypes";

interface QuoteSummarySidebarProps {
  quote: FullQuote;
  onSave: () => void;
  onDownloadPdf: () => void;
  onOpenClientShare: () => void;
  onOpenAdminCatalogue: () => void;
  onOpenSavedEstimates?: () => void;
  savedQuotesCount?: number;
  saving?: boolean;
  downloading?: boolean;
}

export function QuoteSummarySidebar({
  quote,
  onSave,
  onDownloadPdf,
  onOpenClientShare,
  onOpenAdminCatalogue,
  onOpenSavedEstimates,
  savedQuotesCount = 0,
  saving,
  downloading,
}: QuoteSummarySidebarProps) {
  const { pricing, design, client } = quote;
  const effectiveDesignName = getEffectiveDesignName(design);
  const effectiveM2 = getEffectiveDesignM2(design);

  return (
    <div className="space-y-4">
      {/* Primary Financial Breakdown Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Builders Estimate Summary
            </span>
          </div>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
            {quote.status}
          </span>
        </div>

        {/* Selected Model Capsule */}
        <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-white">
              {effectiveDesignName}
            </span>
            <span className="text-xs font-bold text-amber-400 font-mono">
              {design.designName || design.mode === "custom_floorplan"
                ? formatAud(pricing.baseHousePrice)
                : "$0"}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>{design.specTier}</span>
            <span>{effectiveM2 > 0 ? `${effectiveM2} m² (${(effectiveM2 * 0.107639).toFixed(1)} sq)` : "0 m²"}</span>
          </div>
        </div>

        {/* Breakdown Line Items */}
        <div className="space-y-2 text-xs divide-y divide-slate-800/60">
          <div className="pt-2 flex justify-between text-slate-400">
            <span>Base Home Price:</span>
            <span className="font-mono text-slate-200">{formatAud(pricing.baseHousePrice)}</span>
          </div>

          {pricing.facadePrice > 0 && (
            <div className="pt-2 flex justify-between text-slate-400">
              <span>Facade Upgrade ({design.facadeName}):</span>
              <span className="font-mono text-slate-200">+{formatAud(pricing.facadePrice)}</span>
            </div>
          )}

          {/* Builder Promotion on its own distinct line */}
          {pricing.promotionsDiscount > 0 && (
            <div className="pt-2 flex justify-between text-emerald-400 font-semibold bg-emerald-950/20 px-2 py-1 rounded">
              <span className="truncate max-w-[170px]">{pricing.promotionName}:</span>
              <span className="font-mono">-{formatAud(pricing.promotionsDiscount)}</span>
            </div>
          )}

          {pricing.siteCostsSubtotal !== 0 && (
            <div className="pt-2 flex justify-between text-slate-400">
              <span>Site Costs &amp; Earthworks:</span>
              <span className="font-mono text-slate-200">
                {pricing.siteCostsSubtotal > 0 ? `+${formatAud(pricing.siteCostsSubtotal)}` : `-${formatAud(Math.abs(pricing.siteCostsSubtotal))}`}
              </span>
            </div>
          )}

          {pricing.councilStatutorySubtotal > 0 && (
            <div className="pt-2 flex justify-between text-slate-400">
              <span>Council &amp; Statutory:</span>
              <span className="font-mono text-slate-200">+{formatAud(pricing.councilStatutorySubtotal)}</span>
            </div>
          )}

          {/* Conditional Category Subtotals — only rendered if amount > 0 */}
          {pricing.categorySubtotals.map((cat) => (
            <div key={cat.category} className="pt-2 flex justify-between text-slate-400">
              <span>{cat.label}:</span>
              <span className="font-mono text-slate-200">+{formatAud(cat.amount)}</span>
            </div>
          ))}

          {/* Subtotal & GST */}
          <div className="pt-2.5 flex justify-between text-slate-400 text-[11px]">
            <span>Net Estimate (ex GST):</span>
            <span className="font-mono text-slate-300">{formatAud(pricing.netContractPriceExGst)}</span>
          </div>
          <div className="pt-1.5 flex justify-between text-slate-400 text-[11px]">
            <span>GST (10% Component):</span>
            <span className="font-mono text-slate-300">{formatAud(pricing.gstAmount)}</span>
          </div>

          {/* Total Investment */}
          <div className="pt-3 border-t-2 border-slate-700">
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Estimated Total Cost:
              </span>
              <span className="text-xl font-extrabold text-emerald-400 font-mono">
                {formatAud(pricing.grossEstimatedInvestment)}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Preliminary Builders Estimate (14-day validity) · Inc. 10% GST
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <Button
            onClick={onDownloadPdf}
            disabled={downloading}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold hover:from-emerald-400 text-xs gap-1.5 shadow-md shadow-emerald-500/20"
          >
            <Download className="h-3.5 w-3.5" />
            {downloading ? "Generating PDF…" : "Download Builders Estimate PDF"}
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onSave}
              disabled={saving}
              className="border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-white text-xs gap-1"
            >
              <Save className="h-3.5 w-3.5 text-amber-400" />
              {saving ? "Saving…" : "Save Estimate"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onOpenClientShare}
              className="border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-white text-xs gap-1"
            >
              <Share2 className="h-3.5 w-3.5 text-cyan-400" /> Client Link
            </Button>
          </div>

          {onOpenSavedEstimates && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenSavedEstimates}
              className="w-full border-slate-800 bg-slate-950/70 text-slate-300 hover:bg-slate-900 hover:text-white text-xs gap-1.5"
            >
              <FolderOpen className="h-3.5 w-3.5 text-cyan-400" />
              Saved Estimates ({savedQuotesCount})
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenAdminCatalogue}
            className="w-full text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-950 gap-1.5"
          >
            <Layers className="h-3.5 w-3.5 text-slate-400" />
            Admin Catalogue &amp; Rates
          </Button>
        </div>
      </div>

      {/* Sales Consultant Badge */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-1 text-xs">
        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
          <Shield className="h-3.5 w-3.5" />
          <span>Assigned Sales Consultant</span>
        </div>
        <div className="font-bold text-white">{client.consultantName || "Sales Consultant"}</div>
        <div className="text-slate-400 text-[11px]">{client.consultantOffice}</div>
        <div className="text-slate-400 text-[11px] font-mono">{client.consultantPhone}</div>
      </div>
    </div>
  );
}
