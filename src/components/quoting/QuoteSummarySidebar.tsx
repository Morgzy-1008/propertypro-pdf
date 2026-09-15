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
  Send,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { formatAud } from "@/lib/pricing";
import { getEffectiveDesignM2, getEffectiveDesignName } from "@/lib/quoting/quoteEngine";
import type { FullQuote } from "@/lib/quoting/quoteTypes";
import { useTheme } from "@/lib/theme";

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
  const { mode } = useTheme();
  const isLight = mode === "normal";
  const { pricing, design, client } = quote;
  const effectiveDesignName = getEffectiveDesignName(design);
  const effectiveM2 = getEffectiveDesignM2(design);

  return (
    <div className="space-y-4">
      {/* Primary Financial Breakdown Card */}
      <div className={`rounded-2xl border p-5 space-y-4 ${
        isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/90 border-slate-800 backdrop-blur-xl shadow-2xl"
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-3 ${
          isLight ? "border-slate-200" : "border-slate-800"
        }`}>
          <div className="flex items-center gap-2">
            <Building className={`h-4 w-4 ${isLight ? "text-emerald-600" : "text-emerald-400"}`} />
            <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-200"}`}>
              Builders Estimate Summary
            </span>
          </div>
          <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full border ${
            isLight
              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
              : "bg-emerald-950/60 text-emerald-300 border-emerald-800/40"
          }`}>
            {quote.status}
          </span>
        </div>

        {/* Selected Model Capsule */}
        <div className={`rounded-xl p-3 border space-y-1 ${
          isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/80 border-slate-800"
        }`}>
          <div className="flex items-center justify-between">
            <span className={`font-bold text-xs ${isLight ? "text-slate-900" : "text-white"}`}>
              {effectiveDesignName}
            </span>
            <span className={`text-xs font-bold font-mono ${isLight ? "text-amber-700" : "text-amber-400"}`}>
              {design.designName || design.mode === "custom_floorplan"
                ? formatAud(pricing.baseHousePrice)
                : "$0"}
            </span>
          </div>
          <div className={`flex items-center justify-between text-[11px] ${isLight ? "text-slate-600" : "text-slate-400"}`}>
            <span>{design.specTier}</span>
            <span>{effectiveM2 > 0 ? `${effectiveM2} m² (${(effectiveM2 * 0.107639).toFixed(1)} sq)` : "0 m²"}</span>
          </div>
        </div>

        {/* Breakdown Line Items */}
        <div className={`space-y-2 text-xs divide-y ${isLight ? "divide-slate-200" : "divide-slate-800/60"}`}>
          <div className={`pt-2 flex justify-between ${isLight ? "text-slate-600" : "text-slate-400"}`}>
            <span>Base Home Price:</span>
            <span className={`font-mono ${isLight ? "text-slate-900 font-semibold" : "text-slate-200"}`}>{formatAud(pricing.baseHousePrice)}</span>
          </div>

          {pricing.facadePrice > 0 && (
            <div className={`pt-2 flex justify-between ${isLight ? "text-slate-600" : "text-slate-400"}`}>
              <span>Facade Upgrade ({design.facadeName}):</span>
              <span className={`font-mono ${isLight ? "text-slate-900 font-semibold" : "text-slate-200"}`}>+{formatAud(pricing.facadePrice)}</span>
            </div>
          )}

          {/* Builder Promotion on its own distinct line */}
          {pricing.promotionsDiscount > 0 && (
            <div className={`pt-2 flex justify-between font-semibold px-2 py-1 rounded ${
              isLight ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "text-emerald-400 bg-emerald-950/20"
            }`}>
              <span className="truncate max-w-[170px]">{pricing.promotionName}:</span>
              <span className="font-mono">-{formatAud(pricing.promotionsDiscount)}</span>
            </div>
          )}

          {pricing.siteCostsSubtotal !== 0 && (
            <div className={`pt-2 flex justify-between ${isLight ? "text-slate-600" : "text-slate-400"}`}>
              <span>Site Costs &amp; Earthworks:</span>
              <span className={`font-mono ${isLight ? "text-slate-900 font-semibold" : "text-slate-200"}`}>
                {pricing.siteCostsSubtotal > 0 ? `+${formatAud(pricing.siteCostsSubtotal)}` : `-${formatAud(Math.abs(pricing.siteCostsSubtotal))}`}
              </span>
            </div>
          )}

          {pricing.councilStatutorySubtotal > 0 && (
            <div className={`pt-2 flex justify-between ${isLight ? "text-slate-600" : "text-slate-400"}`}>
              <span>Council &amp; Statutory:</span>
              <span className={`font-mono ${isLight ? "text-slate-900 font-semibold" : "text-slate-200"}`}>+{formatAud(pricing.councilStatutorySubtotal)}</span>
            </div>
          )}

          {/* Conditional Category Subtotals — only rendered if amount > 0 */}
          {pricing.categorySubtotals.map((cat) => (
            <div key={cat.category} className={`pt-2 flex justify-between ${isLight ? "text-slate-600" : "text-slate-400"}`}>
              <span>{cat.label}:</span>
              <span className={`font-mono ${isLight ? "text-slate-900 font-semibold" : "text-slate-200"}`}>+{formatAud(cat.amount)}</span>
            </div>
          ))}

          {/* Subtotal & GST */}
          <div className={`pt-2.5 flex justify-between text-[11px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            <span>Net Estimate (ex GST):</span>
            <span className={`font-mono ${isLight ? "text-slate-700" : "text-slate-300"}`}>{formatAud(pricing.netContractPriceExGst)}</span>
          </div>
          <div className={`pt-1.5 flex justify-between text-[11px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            <span>GST (10% Component):</span>
            <span className={`font-mono ${isLight ? "text-slate-700" : "text-slate-300"}`}>{formatAud(pricing.gstAmount)}</span>
          </div>

          {/* Initial Deposit Required to Proceed */}
          <div className={`pt-2.5 flex justify-between text-[11px] items-center ${isLight ? "text-slate-600" : "text-slate-400"}`}>
            <span className="flex items-center gap-1.5">
              <span>Initial Deposit:</span>
              {client.custom3dTourSelected && (
                <span className={`text-[9.5px] px-1.5 py-0.2 rounded font-bold border ${
                  isLight ? "bg-cyan-100 text-cyan-800 border-cyan-300" : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                }`}>
                  + 3D Tour
                </span>
              )}
            </span>
            <span className={`font-mono font-bold ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
              {formatAud(pricing.initialDepositAmount || (client.custom3dTourSelected ? (client.depositType === "brownfield" ? 4100 : 2450) : (client.depositType === "brownfield" ? 3300 : 1650)))}
            </span>
          </div>

          {/* Total Investment */}
          <div className={`pt-3 border-t-2 ${isLight ? "border-slate-300" : "border-slate-700"}`}>
            <div className="flex justify-between items-baseline">
              <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-900" : "text-slate-200"}`}>
                Estimated Total Cost:
              </span>
              <span className={`text-xl font-extrabold font-mono ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
                {formatAud(pricing.grossEstimatedInvestment)}
              </span>
            </div>
            <span className={`text-[10px] block mt-0.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              Preliminary Builders Estimate (14-day validity) · Inc. 10% GST
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className={`space-y-2 pt-2 border-t ${isLight ? "border-slate-200" : "border-slate-800"}`}>
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
              className={`text-xs gap-1 font-semibold ${
                isLight
                  ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  : "border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Save className="h-3.5 w-3.5 text-amber-500" />
              {saving ? "Saving…" : "Save Estimate"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onOpenClientShare}
              className={`text-xs gap-1 font-semibold ${
                isLight
                  ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  : "border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Share2 className="h-3.5 w-3.5 text-cyan-500" /> Client Link
            </Button>
          </div>

          <Link to="/tender-request">
            <Button
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold hover:from-amber-400 text-xs gap-1.5 shadow-md shadow-amber-500/20"
            >
              <Send className="h-3.5 w-3.5" />
              Submit Tender Request (ATP)
            </Button>
          </Link>

          {onOpenSavedEstimates && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenSavedEstimates}
              className={`w-full text-xs gap-1.5 font-semibold ${
                isLight
                  ? "border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
                  : "border-slate-800 bg-slate-950/70 text-slate-300 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <FolderOpen className="h-3.5 w-3.5 text-cyan-500" />
              Saved Estimates ({savedQuotesCount})
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenAdminCatalogue}
            className={`w-full text-xs gap-1.5 ${
              isLight ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100" : "text-slate-400 hover:text-slate-200 hover:bg-slate-950"
            }`}
          >
            <Layers className={`h-3.5 w-3.5 ${isLight ? "text-slate-500" : "text-slate-400"}`} />
            Admin Catalogue &amp; Rates
          </Button>
        </div>
      </div>

      {/* Sales Consultant Badge */}
      <div className={`rounded-2xl border p-4 space-y-1 text-xs ${
        isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/60 border-slate-800"
      }`}>
        <div className={`flex items-center gap-1.5 font-semibold text-[11px] ${
          isLight ? "text-emerald-700" : "text-emerald-400"
        }`}>
          <Shield className="h-3.5 w-3.5" />
          <span>Assigned Sales Consultant</span>
        </div>
        <div className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{client.consultantName || "Sales Consultant"}</div>
        <div className={`text-[11px] ${isLight ? "text-slate-600" : "text-slate-400"}`}>{client.consultantOffice}</div>
        <div className={`text-[11px] font-mono ${isLight ? "text-slate-600" : "text-slate-400"}`}>{client.consultantPhone}</div>
      </div>
    </div>
  );
}
