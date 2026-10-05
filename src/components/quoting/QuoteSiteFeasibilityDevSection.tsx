import React, { useState } from "react";
import { Compass, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFeasibilityDrawer } from "@/components/feasibility/SiteFeasibilityDrawer";
import type { SiteFeasibilityDossier, EditableAllowanceItem } from "@/lib/feasibility/feasibilityTypes";
import type { FullQuote, SiteConditions } from "@/lib/quoting/quoteTypes";
import { formatAud } from "@/lib/pricing";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme";

/**
 * Checks if Site Feasibility is enabled for localhost / dev testing.
 * In production deployments (e.g. Vercel), this returns false so the
 * inaccurate feature is completely removed from Page 3 of the quoting tool.
 */
export function isFeasibilityDevEnabled(): boolean {
  if (typeof window === "undefined") return false;

  const hostname = (window as any).__MOCK_HOSTNAME__ || window.location.hostname;
  const isLocalhost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".local");

  // Allow localhost testing or explicit URL override ?dev_feasibility=true
  return isLocalhost || window.location.search.includes("dev_feasibility=true");
}

interface QuoteSiteFeasibilityDevSectionProps {
  quote: FullQuote;
  site: SiteConditions;
  onSiteChange: (patch: Partial<SiteConditions>) => void;
  onFeasibilityApply?: (dossier: SiteFeasibilityDossier, patch: Partial<SiteConditions>) => void;
  isDouble?: boolean;
}

/**
 * Feasibility engine saved to the side for developer calibration on localhost only.
 * Completely removed from production quoting tool.
 */
export function QuoteSiteFeasibilityDevSection({
  quote,
  site,
  onSiteChange,
  onFeasibilityApply,
  isDouble = false,
}: QuoteSiteFeasibilityDevSectionProps) {
  const isDevHost = isFeasibilityDevEnabled();
  const { mode } = useTheme();
  const isLight = mode === "normal";
  const [isFeasibilityOpen, setIsFeasibilityOpen] = useState(false);

  // In production (Vercel / live domain): Completely removed from Page 3
  if (!isDevHost) {
    return null;
  }

  const handleFeasibilityApply = (dossier: SiteFeasibilityDossier, appliedItems: EditableAllowanceItem[]) => {
    const sitePatch: Partial<SiteConditions> = {};

    for (const item of appliedItems) {
      if (item.id === "allow_traffic_control") {
        sitePatch.trafficControlRequired = true;
        sitePatch.trafficControlCost = item.currentAmount;
      } else if (item.id === "allow_bushfire_spec") {
        sitePatch.bushfireBal = dossier.overlays.bushfireBal;
        sitePatch.bushfireCost = item.currentAmount;
      } else if (item.id === "allow_bushfire_report") {
        sitePatch.bushfireReportRequired = true;
        sitePatch.bushfireReportCost = item.currentAmount;
      } else if (item.id === "allow_flood_slab") {
        sitePatch.floodOverlayRequired = true;
        sitePatch.floodOverlayCost = item.currentAmount;
        sitePatch.slabElevationMeters = dossier.overlays.recommendedSlabElevationM || 0.3;
      } else if (item.id === "allow_flood_report") {
        sitePatch.floodReportRequired = true;
        sitePatch.floodReportCost = item.currentAmount;
      } else if (item.id === "allow_site_fall") {
        sitePatch.fallMeters = dossier.overlays.contoursFallM;
        sitePatch.fallTotalCost = item.currentAmount;
      } else if (item.id === "allow_retaining_wall") {
        sitePatch.retainingWallAllowance = item.currentAmount;
      } else if (item.id === "allow_cctv_sewer") {
        sitePatch.cctvSewerReportRequired = true;
        sitePatch.cctvSewerReportCost = item.currentAmount;
      } else if (item.id === "allow_demolition") {
        sitePatch.demolitionAsbestosRequired = true;
        sitePatch.demolitionAsbestosCost = item.currentAmount;
      } else if (item.id === "allow_arborist_report") {
        sitePatch.arboristReportRequired = true;
        sitePatch.arboristReportCost = item.currentAmount;
      }
    }

    if (onFeasibilityApply) {
      onFeasibilityApply(dossier, sitePatch);
    } else {
      onSiteChange(sitePatch);
    }
    toast.success(`[Dev Feasibility] Applied ${appliedItems.length} site allowances (${formatAud(dossier.totalAllowancesCost)}) to quote!`);
  };

  const isBrownfieldQuote = quote.client.depositType === "brownfield" || site.demolitionAsbestosRequired;
  const computedAddress = [
    !isBrownfieldQuote && quote.client.lotNumber
      ? (quote.client.lotNumber.toLowerCase().startsWith("lot") ? quote.client.lotNumber : `Lot ${quote.client.lotNumber}`)
      : "",
    quote.client.siteAddress,
    quote.client.suburb,
    !isBrownfieldQuote ? quote.client.estate : "",
    "QLD",
    quote.client.postcode,
  ]
    .filter(Boolean)
    .join(", ");

  const resolvedInitialAddress =
    computedAddress.length > 5
      ? computedAddress
      : isBrownfieldQuote
      ? "14 Waratah Avenue, Graceville, QLD"
      : "Lot 243, 61 Paradise Road, Flagstone, QLD";

  return (
    <>
      {/* Sleek Localhost Option Bar (Saved to Side for Developer Calibration) */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl border text-xs shadow-xs ${
        isLight ? "bg-amber-50 border-amber-200" : "bg-amber-950/20 border-amber-800/40"
      }`}>
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`h-6 w-6 rounded-lg border flex items-center justify-center shrink-0 ${
            isLight ? "bg-amber-100 border-amber-300 text-amber-800" : "bg-amber-500/20 border-amber-500/40 text-amber-400"
          }`}>
            <Compass className="h-3.5 w-3.5" />
          </div>
          <span className={`font-bold ${isLight ? "text-amber-950" : "text-amber-300"}`}>
            Site Feasibility Engine
          </span>
          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
            isLight ? "bg-amber-100 text-amber-900 border-amber-300" : "bg-amber-500/20 text-amber-300 border-amber-500/40"
          }`}>
            Localhost Option &bull; Saved to Side
          </span>
          <span className={`text-[11px] hidden md:inline ${isLight ? "text-slate-600" : "text-slate-400"}`}>
            (Removed from production quoting due to cadastre/overlay accuracy)
          </span>
          {quote.feasibility && (
            <span className={`text-[11px] flex items-center gap-1 font-semibold ml-1 ${isLight ? "text-emerald-800" : "text-emerald-400"}`}>
              <CheckCircle2 className="h-3 w-3" />
              Verified: {quote.feasibility.parcel.standardLotPlan} ({quote.feasibility.parcel.areaM2} m²)
            </span>
          )}
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => setIsFeasibilityOpen(true)}
          className={`h-7 px-3 font-bold text-xs gap-1.5 rounded-lg shadow-sm shrink-0 transition-all ${
            isLight
              ? "bg-amber-600 hover:bg-amber-700 text-white"
              : "bg-amber-500 hover:bg-amber-400 text-slate-950"
          }`}
        >
          <Sparkles className="h-3 w-3" />
          {quote.feasibility ? "Re-Run / Edit Feasibility" : "Launch Dev Feasibility"}
        </Button>
      </div>

      <SiteFeasibilityDrawer
        open={isFeasibilityOpen}
        onOpenChange={setIsFeasibilityOpen}
        initialAddress={resolvedInitialAddress}
        initialMode={isBrownfieldQuote ? "brownfield_kdrb" : "greenfield"}
        initialStorey={isDouble ? "double" : "single"}
        initialHouseDesign={quote.design.designName}
        onApplyAllowances={handleFeasibilityApply}
      />
    </>
  );
}
