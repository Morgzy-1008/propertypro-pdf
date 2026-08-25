import React from "react";
import { formatAud } from "@/lib/pricing";
import { Logo } from "@/components/flyer/FlyerTemplates";
import type { FullQuote } from "@/lib/quoting/quoteTypes";
import { calculateCustomTotalM2 } from "@/lib/quoting/quoteEngine";
import {
  CheckCircle2,
  Award,
  Sparkles,
  Home,
  ShieldCheck,
  Building,
  FileCheck2,
  Check,
} from "lucide-react";
import { PaymentQrCode } from "./PaymentQrCode";

import { plansForDesign } from "@/components/flyer/floorplans";
import { prepareFloorplan } from "@/components/flyer/floorplanEngine";

interface QuotePdfDocumentProps {
  quote: FullQuote;
}

function formatInclusionTierTitle(tier: string): string {
  if (!tier) return "H2 Design Inclusions (2025)";
  if (tier.includes("H1")) return "H1 Smart Inclusions (2025)";
  if (tier.includes("H2")) return "H2 Design Inclusions (2025)";
  if (tier.includes("H3")) return "H3 Luxury Inclusions (2025)";
  return tier;
}

function QuoteFloorplanViewer({ design }: { design: FullQuote["design"] }) {
  const [src, setSrc] = React.useState(design.floorplanUrl || "");

  React.useEffect(() => {
    if (design.floorplanUrl && design.floorplanUrl.startsWith("data:")) {
      setSrc(design.floorplanUrl);
      return;
    }
    if (design.designName) {
      const plans = plansForDesign(design.designName);
      if (plans[0]) {
        if (plans[0].url && !plans[0].url.startsWith("data:")) {
          setSrc(plans[0].url);
        }
        prepareFloorplan(plans[0]).then((enhanced) => {
          if (enhanced) setSrc(enhanced);
        }).catch(() => {});
      }
    }
  }, [design.designName, design.floorplanUrl]);

  if (!src) {
    return (
      <div className="text-center text-slate-400 text-xs py-32">
        <Home className="h-8 w-8 mx-auto mb-2 text-slate-300" />
        Architectural Floorplan Drawing — Standard Hudson Design Layout
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-2 bg-white">
      <img
        src={src}
        alt="Selected Floorplan Drawing"
        className="max-h-[690px] max-w-[670px] w-auto h-auto object-contain block mx-auto my-auto drop-shadow-sm transition-all"
        style={{ imageRendering: "auto" }}
      />
    </div>
  );
}

export function QuotePdfDocument({ quote }: QuotePdfDocumentProps) {
  const { client, design, siteConditions, lineItems, pricing } = quote;

  const validUntilDate = new Date(quote.createdAt);
  validUntilDate.setDate(validUntilDate.getDate() + (client.quoteValidityDays || 14));

  const formattedCreatedDate = new Date(quote.createdAt).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });

  const formattedValidDate = validUntilDate.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });

  const totalAreaM2 =
    design.mode === "custom_floorplan"
      ? calculateCustomTotalM2(design.customSpec)
      : design.designM2;

  const siteAddressFull =
    [client.lotNumber, client.siteAddress, client.suburb, `QLD ${client.postcode || ""}`]
      .filter(Boolean)
      .join(", ") || "Proposed Site Address TBA, Queensland";

  const clientCombinedNames = [client.clientName, client.hasClient2 && client.client2Name]
    .filter(Boolean)
    .join(" & ");

  const hasVariations = pricing.categorySubtotals && pricing.categorySubtotals.length > 0;
  const totalPages = hasVariations ? 6 : 5;

  return (
    <div className="quote-pdf-root text-slate-900 font-sans space-y-12 max-w-[210mm] mx-auto print:space-y-0">
      {/* ========================================================================= */}
      {/* PAGE 1: OFFICIAL BUILDERS ESTIMATE COVER PAGE                             */}
      {/* ========================================================================= */}
      <div className="quote-page bg-white w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] p-10 flex flex-col justify-between relative overflow-hidden shadow-2xl box-border print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always">
        {/* Crisp Vector Top Poly Header Banner (Supported 100% in html2canvas) */}
        <div className="absolute top-0 left-0 right-0 h-80 pointer-events-none overflow-hidden">
          <svg
            viewBox="0 0 794 320"
            className="w-full h-full"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="polyGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.95" />
                <stop offset="45%" stopColor="#06b6d4" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="polyGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ec4899" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="polyGrad3" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.6" />
              </linearGradient>
            </defs>
            <polygon points="0,0 794,0 794,220 480,290 0,160" fill="url(#polyGrad1)" />
            <polygon points="220,0 794,0 794,270 320,200" fill="url(#polyGrad2)" />
            <polygon points="0,0 450,0 300,180 0,140" fill="url(#polyGrad3)" />
          </svg>
        </div>

        {/* Top Header Row with Badges & Logo */}
        <div className="relative z-10 flex items-center justify-between pt-2">
          <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-white/60 flex items-center gap-3">
            <Logo size={11} />
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-900/90 text-white px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase border border-slate-700 shadow-md flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-amber-400" />
              Builders Estimate #{quote.quoteNumber || "MH"}
            </div>
            <div className="bg-emerald-500 text-slate-950 px-3 py-1.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase shadow-md">
              14-Day Price Hold
            </div>
          </div>
        </div>

        {/* Center Hero Title Area */}
        <div className="relative z-10 my-auto text-right pr-4 flex flex-col justify-center">
          <div className="text-3xl font-extrabold uppercase tracking-widest text-slate-900">
            YOUR
          </div>
          <div className="text-4xl font-extrabold uppercase tracking-wider text-slate-900 mt-1">
            NEW HOME
          </div>
          <div className="text-6xl font-serif italic text-cyan-600 font-bold -mt-1 tracking-tight">
            Builders Estimate
          </div>
          <p className="text-xs text-slate-500 font-medium tracking-wide mt-2">
            Comprehensive Architectural Tender &amp; Site Investment Breakdown
          </p>
        </div>

        {/* Presentation Metadata Card (Matching Website Aesthetic) */}
        <div className="relative z-10 bg-slate-50/90 border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-6 text-xs">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-700">
                PRESENTED TO
              </div>
              <div className="text-base font-bold text-slate-900 mt-1">
                {clientCombinedNames || "Valued Client"}
              </div>
              <div className="text-slate-500 text-[11px] mt-0.5">
                {client.clientPhone && <span>{client.clientPhone} · </span>}
                {client.clientEmail || "client@email.com"}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-700">
                PROPOSED SITE ADDRESS
              </div>
              <div className="text-sm font-bold text-slate-900 mt-1">
                {[client.lotNumber, client.siteAddress].filter(Boolean).join(", ") || "Site Address TBA"}
              </div>
              <div className="text-slate-600 text-xs mt-0.5">
                {[client.suburb, `QLD ${client.postcode || ""}`].filter(Boolean).join(" ")}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 grid grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Selected Design:</span>
              <span className="font-bold text-slate-900 text-sm">
                {design.mode === "standard" ? design.designName : "Custom Architectural Plan"}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Facade Style:</span>
              <span className="font-bold text-slate-900 text-sm">{design.facadeName || "Standard"}</span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Inclusions Tier:</span>
              <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                {formatInclusionTierTitle(design.specTier)}
              </span>
            </div>
          </div>
        </div>

        {/* Page 1 Footer */}
        <div className="relative z-10 border-t border-slate-200 pt-4 flex items-center justify-between text-[10px] text-slate-500">
          <div>
            Hudson Homes Pty Ltd · ABN 49 163 189 071 · Licence 259372C
          </div>
          <div className="font-mono">
            Estimate #{quote.quoteNumber || "MH"} · Issued {formattedCreatedDate}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 2: EXECUTIVE LETTER & ESTIMATED CONSTRUCTION COST SUMMARY            */}
      {/* ========================================================================= */}
      <div className="quote-page bg-white min-h-[297mm] p-10 flex flex-col justify-between relative shadow-2xl print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always">
        <div>
          {/* Top Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-5">
            <div>
              <Logo size={12} />
              <div className="text-[10px] text-slate-500 mt-1">
                Hudson Homes Pty Ltd · ABN 49 163 189 071 · Licence 259372C
              </div>
            </div>
            <div className="text-right text-xs">
              <div className="font-bold text-slate-900">Date: {formattedCreatedDate}</div>
              <div className="text-slate-600 font-mono">Estimate No: {client.estimateNumber || quote.quoteNumber}</div>
            </div>
          </div>

          {/* Owner & Estimate Details Box */}
          <div className="mb-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-700 mb-2">
              OWNER &amp; ESTIMATE DETAILS
            </h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 block text-[10px]">Owner/s Details:</span>
                <span className="font-bold text-slate-900">{clientCombinedNames || "Client Name"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Estimate No / Version:</span>
                <span className="font-mono font-bold text-slate-900">
                  {client.estimateNumber || quote.quoteNumber} / Version {client.estimateVersion || 1}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">New Home Consultant:</span>
                <span className="font-semibold text-slate-900">{client.consultantName}</span>
                <span className="text-slate-500 block text-[10px]">{client.consultantOffice} · {client.consultantPhone}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Estimate Valid To:</span>
                <span className="font-semibold text-amber-700">{formattedValidDate} (14-day validity)</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block text-[10px]">Proposed Site Address:</span>
                <span className="font-semibold text-slate-900">{siteAddressFull}</span>
              </div>
            </div>
          </div>

          {/* Comprehensive Itemized Construction Cost Summary Table */}
          <div className="mb-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-700 mb-2">
              ESTIMATED CONSTRUCTION COST SUMMARY
            </h3>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900 bg-slate-100 text-[10px] uppercase text-slate-700 font-bold">
                  <th className="py-2.5 px-3 text-left">Description</th>
                  <th className="py-2.5 px-3 text-right w-36">Estimated Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr className="font-semibold">
                  <td className="py-2.5 px-3">
                    <div className="text-slate-900 font-bold">
                      {design.mode === "standard"
                        ? `${design.designName || "Selected Design"} with ${formatInclusionTierTitle(design.specTier)}`
                        : `Custom Architectural Floorplan (${design.customSpec.storeys === "double" ? "Two" : "Single"} Storey)`}
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal">
                      Living area {totalAreaM2} m² ({(totalAreaM2 * 0.107639).toFixed(1)} sq) · GFA Platform {pricing.gfaM2} m²
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                    {formatAud(pricing.baseHousePrice)}
                  </td>
                </tr>

                {pricing.facadePrice > 0 && (
                  <tr>
                    <td className="py-2 px-3 text-slate-700">
                      <span className="font-semibold text-slate-900">Architectural Facade:</span> {design.facadeName}
                      {design.isCustomFacade && design.customFacadeDescription && (
                        <span className="block text-[10px] text-slate-500 italic mt-0.5">
                          {design.customFacadeDescription}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-800">
                      +{formatAud(pricing.facadePrice)}
                    </td>
                  </tr>
                )}

                {/* Builder Promotion on its own distinct emerald highlighted line */}
                {pricing.promotionsDiscount > 0 && (
                  <tr className="text-emerald-800 font-semibold bg-emerald-50/80 border-l-4 border-l-emerald-500">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-900">{pricing.promotionName}</span>
                        <span className="text-[9px] font-bold uppercase bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded">
                          Special Savings
                        </span>
                      </div>
                      <span className="block text-[10px] text-emerald-700">
                        Automated builder promotion applied to base house price
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">
                      -{formatAud(pricing.promotionsDiscount)}
                    </td>
                  </tr>
                )}

                {pricing.siteCostsSubtotal !== 0 && (
                  <tr>
                    <td className="py-2 px-3 text-slate-700">
                      <span className="font-semibold text-slate-900">Site Specific Earthworks &amp; Engineering:</span>
                      <span className="block text-[10px] text-slate-500">
                        Topography Fall ({siteConditions.fallMeters || 1.0}m fall) &amp; Soil Classification ({siteConditions.soilClass || "Class M"})
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-800">
                      {pricing.siteCostsSubtotal > 0 ? `+${formatAud(pricing.siteCostsSubtotal)}` : `-${formatAud(Math.abs(pricing.siteCostsSubtotal))}`}
                    </td>
                  </tr>
                )}

                {pricing.councilStatutorySubtotal > 0 && (
                  <tr>
                    <td className="py-2 px-3 text-slate-700">
                      <span className="font-semibold text-slate-900">Council &amp; Statutory Approvals:</span> {siteConditions.councilRegion}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-800">
                      +{formatAud(pricing.councilStatutorySubtotal)}
                    </td>
                  </tr>
                )}

                {/* Conditional Variations by Category */}
                {pricing.categorySubtotals.map((cat) => (
                  <tr key={cat.category}>
                    <td className="py-2 px-3 text-slate-700">
                      <span className="font-semibold text-slate-900">{cat.label}</span> ({cat.items.length} item{cat.items.length > 1 ? "s" : ""})
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-800">
                      +{formatAud(cat.amount)}
                    </td>
                  </tr>
                ))}

                {/* Total Cost Line */}
                <tr className="border-t-2 border-slate-900 bg-slate-900 text-white font-extrabold text-sm">
                  <td className="py-3 px-3 uppercase tracking-wider">
                    TOTAL ESTIMATED BUILDERS INVESTMENT (INC. GST)
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-base text-amber-400">
                    {formatAud(pricing.grossEstimatedInvestment)}
                  </td>
                </tr>

                {/* Deposit & Balance Rows */}
                <tr className="bg-slate-50 text-[11px]">
                  <td className="py-1.5 px-3 text-slate-600 font-medium">
                    Initial Deposit to Proceed ({client.depositType === "brownfield" ? "Brownfield Site" : "Greenfield Site"} Allocation)
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-700">
                    {formatAud(pricing.initialDepositAmount)}
                  </td>
                </tr>
                <tr className="bg-slate-50 text-[11px]">
                  <td className="py-1.5 px-3 text-slate-600 font-medium">
                    Estimated Balance Due on Building Contract
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                    {formatAud(pricing.balanceDueOnContract)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Letter / Notes Summary */}
          <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 text-[11px] text-slate-600 leading-relaxed space-y-1.5">
            <div className="font-bold text-slate-800">Executive Estimate Notice:</div>
            <p>
              Thank you for the opportunity to present this Builders Estimate for your new Hudson home. This quotation remains valid for 14 days from the date of issue.
            </p>
            <p className="text-[10px] text-slate-500 italic">
              *** This document represents a preliminary Builders Estimate and is subject to geotechnical soil classification, registered contour survey, and developer covenant approval. ***
            </p>
          </div>
        </div>

        {/* Page 2 Footer */}
        <div className="border-t border-slate-200 pt-4 flex items-center justify-between text-[10px] text-slate-500">
          <div>
            Hudson Homes Pty Ltd · ABN: 49 163 189 071 · Builder&apos;s Licence: 259372C
          </div>
          <div className="flex items-center gap-4">
            <div className="border border-slate-400 px-3 py-1 text-[9px] font-bold uppercase text-slate-600 rounded">
              CUSTOMER INITIAL
            </div>
            <div className="font-mono">Page 2 of {totalPages}</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 3: DEDICATED FULL-PAGE HIGH-QUALITY FLOORPLAN DRAWING                */}
      {/* ========================================================================= */}
      <div className="quote-page bg-white min-h-[297mm] p-10 flex flex-col justify-between relative shadow-2xl print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always">
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-2 mb-2 flex-none">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-700">
                ARCHITECTURAL FLOORPLAN &amp; SPATIAL SPECIFICATIONS
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 leading-tight mt-0.5">
                {design.mode === "standard"
                  ? `${design.designName} — ${design.specTier}`
                  : "Custom Architectural Floorplan"}
              </h2>
              <div className="text-[11px] text-slate-600 mt-0.5">
                Facade: <span className="font-semibold text-slate-900">{design.facadeName}</span>
                {design.widthM && design.lengthM && (
                  <span> · Dimensions: {design.widthM}m wide × {design.lengthM}m deep</span>
                )}
              </div>
            </div>
            <div className="text-right flex-none">
              <span className="text-[9px] text-slate-500 block uppercase tracking-wider font-semibold">Total Area</span>
              <span className="text-sm font-extrabold text-cyan-700 font-mono">
                {totalAreaM2} m² ({(totalAreaM2 * 0.107639).toFixed(1)} sq)
              </span>
            </div>
          </div>

          {/* Area & Configuration Pill Bar */}
          <div className="grid grid-cols-4 gap-2 bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 mb-2 text-center text-xs flex-none">
            <div>
              <span className="text-slate-500 text-[9px] block">Bedrooms:</span>
              <span className="font-bold text-slate-900 text-xs">{design.beds || 4} Beds</span>
            </div>
            <div>
              <span className="text-slate-500 text-[9px] block">Bathrooms:</span>
              <span className="font-bold text-slate-900 text-xs">{design.baths || 2} Baths</span>
            </div>
            <div>
              <span className="text-slate-500 text-[9px] block">Garage:</span>
              <span className="font-bold text-slate-900 text-xs">{design.cars || 2} Cars</span>
            </div>
            <div>
              <span className="text-slate-500 text-[9px] block">GFA Platform:</span>
              <span className="font-bold text-slate-900 text-xs">{pricing.gfaM2} m²</span>
            </div>
          </div>

          {/* Maximized High-Resolution Floorplan Drawing (Proportionally sized with zero zooming) */}
          <div className="flex-1 w-full border border-slate-200 rounded-2xl p-4 bg-white flex items-center justify-center min-h-[690px] max-h-[730px] overflow-hidden shadow-inner">
            <QuoteFloorplanViewer design={design} />
          </div>
        </div>

        {/* Page 3 Footer */}
        <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-500 flex-none mt-2">
          <div>
            Hudson Homes Pty Ltd · ABN: 49 163 189 071 · Builder&apos;s Licence: 259372C
          </div>
          <div className="flex items-center gap-4">
            <div className="border border-slate-400 px-3 py-1 text-[9px] font-bold uppercase text-slate-600 rounded">
              CUSTOMER INITIAL
            </div>
            <div className="font-mono">Page 3 of {totalPages}</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 4 (OPTIONAL): DETAILED VARIATIONS & UPGRADES BREAKDOWN SCHEDULE       */}
      {/* ========================================================================= */}
      {hasVariations && (
        <div className="quote-page bg-white min-h-[297mm] p-10 flex flex-col justify-between relative shadow-2xl print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-5">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-cyan-700">
                  ESTIMATE VARIATIONS &amp; CUSTOM UPGRADES SCHEDULE
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
                  Itemized Specification Breakdown
                </h2>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">
                  Variations Subtotal
                </span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {formatAud(pricing.categorySubtotals.reduce((s, c) => s + c.amount, 0))}
                </span>
              </div>
            </div>

            {/* Grouped Category Variations */}
            <div className="space-y-4">
              {pricing.categorySubtotals.map((cat) => (
                <div key={cat.category} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex justify-between items-center text-xs font-bold text-slate-800">
                    <span className="uppercase tracking-wider">{cat.label}</span>
                    <span className="font-mono text-cyan-800">+{formatAud(cat.amount)}</span>
                  </div>
                  <table className="w-full text-[11px] border-collapse">
                    <tbody className="divide-y divide-slate-100">
                      {cat.items.map((it) => (
                        <tr key={it.id} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3">
                            <div className="font-semibold text-slate-900">{it.name}</div>
                            {it.description && (
                              <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                                {it.description}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center text-slate-600 w-24 font-mono">
                            {it.quantity > 1 ? `${it.quantity} × ${formatAud(it.unitRate)}` : "1 Item"}
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900 w-28">
                            +{formatAud(it.quantity * it.unitRate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>

          {/* Page 4 Footer */}
          <div className="border-t border-slate-200 pt-4 flex items-center justify-between text-[10px] text-slate-500">
            <div>
              Hudson Homes Pty Ltd · ABN: 49 163 189 071 · Builder&apos;s Licence: 259372C
            </div>
            <div className="flex items-center gap-4">
              <div className="border border-slate-400 px-3 py-1 text-[9px] font-bold uppercase text-slate-600 rounded">
                CUSTOMER INITIAL
              </div>
              <div className="font-mono">Page 4 of {totalPages}</div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAGE 5: EXPANDED FULL-PAGE STANDARD INCLUSIONS SCHEDULE                    */}
      {/* ========================================================================= */}
      <div className="quote-page bg-white min-h-[297mm] p-10 flex flex-col justify-between relative shadow-2xl print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-cyan-700">
                STANDARD INCLUSIONS SPECIFICATION SCHEDULE
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
                {formatInclusionTierTitle(design.specTier)}
              </h2>
            </div>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-300">
              ✓ Fully Included in Base Builders Estimate
            </span>
          </div>

          {/* Comprehensive 8-Category Inclusions Grid */}
          <div className="space-y-2.5 text-[9.5px] leading-snug">
            {/* Certification & Approvals */}
            <div className="border border-slate-200 rounded-xl p-2.5 bg-slate-50">
              <div className="font-bold text-slate-900 flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                <span className="tracking-wide">CERTIFICATION AND APPROVALS</span>
                <span className="text-emerald-700 font-bold text-[8.5px]">INCLUDED</span>
              </div>
              <div className="text-slate-600 grid grid-cols-2 gap-x-4 gap-y-0.5">
                <div>• Site contour survey by registered surveyor &amp; physical set out</div>
                <div>• Building Application (BA) preparation, lodgement &amp; fees</div>
                <div>• Structural engineering design for concrete slab &amp; footing</div>
                <div>• Form 15 Pre-nail frame/truss layout &amp; Form 16 Structural certs</div>
                <div>• Glazing acoustics Form 15 &amp; energy efficiency assessment report</div>
                <div>• Final Occupation Certificate (Form 21) upon completion</div>
              </div>
            </div>

            {/* Site Costs, Preparation & Foundation */}
            <div className="border border-slate-200 rounded-xl p-2.5 bg-slate-50">
              <div className="font-bold text-slate-900 flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                <span className="tracking-wide">SITE COSTS, PREPARATION &amp; FOUNDATION</span>
                <span className="text-emerald-700 font-bold text-[8.5px]">INCLUDED</span>
              </div>
              <div className="text-slate-600 grid grid-cols-2 gap-x-4 gap-y-0.5">
                <div>• Bulk earthworks &amp; levelling up to 1.0m fall across building pad</div>
                <div>• Engineered waffle pod concrete slab on ground including alfresco</div>
                <div>• Roof edge safety rail &amp; scaffolding to strict WHS compliance</div>
                <div>• Connect sewer, water, power &amp; storm water services to mains</div>
                <div>• Part A &amp; Part B Termite Management System with warranty</div>
                <div>• Smooth power-trowelled finish to garage and internal living areas</div>
              </div>
            </div>

            {/* External Features, Roof & Windows */}
            <div className="border border-slate-200 rounded-xl p-2.5 bg-slate-50">
              <div className="font-bold text-slate-900 flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                <span className="tracking-wide">EXTERNAL FEATURES, ROOF &amp; GLAZING</span>
                <span className="text-emerald-700 font-bold text-[8.5px]">INCLUDED</span>
              </div>
              <div className="text-slate-600 grid grid-cols-2 gap-x-4 gap-y-0.5">
                <div>• {design.specTier.includes("H3") ? "Colorbond® steel roof or flat profile concrete designer roof tiles" : "Colorbond® corrugated steel roofing with medium duty reflective foil"}</div>
                <div>• Colorbond® fascia and gutters with painted UPVC downpipes</div>
                <div>• Engineered T2 treated timber roof trusses and wall framing</div>
                <div>• {design.specTier.includes("H3") ? "Stain grade decorative solid core front door up to 1200mm wide" : "Hume Newington 2040mm solid core front entry door with double lock"}</div>
                <div>• Powder coated aluminium windows &amp; flyscreens with fibreglass mesh</div>
                <div>• 2 external garden taps &amp; energy-efficient heat pump hot water system</div>
              </div>
            </div>

            {/* Internal Ceilings, Walls & Doors */}
            <div className="border border-slate-200 rounded-xl p-2.5 bg-slate-50">
              <div className="font-bold text-slate-900 flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                <span className="tracking-wide">INTERNAL CEILINGS, WALLS &amp; DOORS</span>
                <span className="text-emerald-700 font-bold text-[8.5px]">INCLUDED</span>
              </div>
              <div className="text-slate-600 grid grid-cols-2 gap-x-4 gap-y-0.5">
                <div>• {design.specTier.includes("H3") ? "2,740mm ceiling height to single storey / ground floor" : design.specTier.includes("H2") ? "2,590mm ceiling height throughout" : "2,440mm ceiling height throughout"}</div>
                <div>• {design.specTier.includes("H3") ? "Hume Linear HLR270 2340mm high internal doors" : "Hume Linear 2040mm internal doors"} with Dulux gloss enamel</div>
                <div>• Dulux multi-coat paint system to all internal walls and ceilings</div>
                <div>• {design.specTier.includes("H3") ? "2400mm high frameless mirror sliding doors to wardrobes" : "Frameless mirror or vinyl sliding wardrobe doors"}</div>
                <div>• 67x18mm skirting &amp; architraves with Dulux painted full gloss enamel</div>
                <div>• Glass wool insulation batts to external walls &amp; ceilings</div>
              </div>
            </div>

            {/* Gourmet Kitchen & Luxury Appliances */}
            <div className="border border-slate-200 rounded-xl p-2.5 bg-slate-50">
              <div className="font-bold text-slate-900 flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                <span className="tracking-wide">GOURMET KITCHEN &amp; APPLIANCES</span>
                <span className="text-emerald-700 font-bold text-[8.5px]">INCLUDED</span>
              </div>
              <div className="text-slate-600 grid grid-cols-2 gap-x-4 gap-y-0.5">
                <div>• {design.specTier.includes("H3") ? "40mm mitred edge stone kitchen benchtops" : design.specTier.includes("H2") ? "20mm stone kitchen benchtops" : "Laminated benchtops with rolled edge"}</div>
                <div>• Fully lined overhead cupboards with plaster bulkhead feature</div>
                <div>• Bank of 4 soft-close cutlery drawers and matching pot drawers</div>
                <div>• {design.specTier.includes("H1") ? "Haier 600mm stainless steel electric oven, cooktop & dishwasher" : "Fisher & Paykel 900mm luxury stainless steel electric oven & 900mm cooktop"}</div>
                <div>• Fisher &amp; Paykel stainless steel dishwasher &amp; built-in microwave oven</div>
                <div>• Clark Polar undermount/drop-in sink with Liano II designer pull-out mixer</div>
              </div>
            </div>

            {/* Bathrooms, Ensuite & Powder Room */}
            <div className="border border-slate-200 rounded-xl p-2.5 bg-slate-50">
              <div className="font-bold text-slate-900 flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                <span className="tracking-wide">BATHROOM, ENSUITE &amp; POWDER ROOM</span>
                <span className="text-emerald-700 font-bold text-[8.5px]">INCLUDED</span>
              </div>
              <div className="text-slate-600 grid grid-cols-2 gap-x-4 gap-y-0.5">
                <div>• Contemporary floating vanities with {design.specTier.includes("H1") ? "laminate" : "20mm stone"} benchtops</div>
                <div>• {design.specTier.includes("H3") ? "10mm frameless glass shower screen with pivot doors" : "Semi-frameless shower screens with clear safety glass"}</div>
                <div>• Caroma Aura 1,775mm freestanding white bathtub &amp; Caroma tapware</div>
                <div>• Wall-faced closed coupled toilet suites with soft-close seats</div>
                <div>• {design.specTier.includes("H3") ? "Ceramic full-height wall tiling to wet areas with shower" : "Ceramic wall tiles to 2,100mm in shower recess"}</div>
                <div>• Smart tile floor wastes &amp; tiled shower recess niche</div>
              </div>
            </div>

            {/* Laundry & Interior Floor Coverings */}
            <div className="border border-slate-200 rounded-xl p-2.5 bg-slate-50">
              <div className="font-bold text-slate-900 flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                <span className="tracking-wide">LAUNDRY &amp; INTERNAL FLOOR COVERINGS</span>
                <span className="text-emerald-700 font-bold text-[8.5px]">INCLUDED</span>
              </div>
              <div className="text-slate-600 grid grid-cols-2 gap-x-4 gap-y-0.5">
                <div>• Built-in laundry cabinet (up to 1,200mm) with {design.specTier.includes("H1") ? "metal tub" : "20mm stone top & Clark 45L drop-in tub"}</div>
                <div>• {design.specTier.includes("H3") ? "Choice of 8.5mm Hybrid Timber flooring or Gold Range floor tiles" : "Floor tiles to entry, hallway, kitchen, family & meals"}</div>
                <div>• Quality carpet with underlay to all bedrooms and media rooms</div>
                <div>• Main floor outdoor ceramic tiling to under-roof alfresco</div>
              </div>
            </div>

            {/* Air-Conditioning & Electrical */}
            <div className="border border-slate-200 rounded-xl p-2.5 bg-slate-50">
              <div className="font-bold text-slate-900 flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                <span className="tracking-wide">AIR-CONDITIONING &amp; ELECTRICAL</span>
                <span className="text-emerald-700 font-bold text-[8.5px]">INCLUDED</span>
              </div>
              <div className="text-slate-600 grid grid-cols-2 gap-x-4 gap-y-0.5">
                <div>• {design.specTier.includes("H3") ? "Fully Zoned Ducted Air-Conditioning with MyAir5 Touch Screen Controller" : design.specTier.includes("H2") ? "Day/Night Ducted Air-Conditioning System (Living & Bedroom Zones)" : "Reverse Cycle Split System Air-Conditioner to Living Room"}</div>
                <div>• LED downlights throughout plus ceiling fan/lights to all bedrooms</div>
                <div>• {design.specTier.includes("H3") ? "1.5kW Solar PV Power System with single-phase inverter" : "Energy-efficient electrical fitout"}</div>
                <div>• Interconnected hardwired photoelectric smoke detectors</div>
                <div>• NBN pre-wiring with telephone &amp; data points to living</div>
              </div>
            </div>
          </div>
        </div>

        {/* Inclusions Page Footer */}
        <div className="border-t border-slate-200 pt-4 flex items-center justify-between text-[10px] text-slate-500">
          <div>
            Hudson Homes Pty Ltd · ABN: 49 163 189 071 · Builder&apos;s Licence: 259372C
          </div>
          <div className="flex items-center gap-4">
            <div className="border border-slate-400 px-3 py-1 text-[9px] font-bold uppercase text-slate-600 rounded">
              CUSTOMER INITIAL
            </div>
            <div className="font-mono">Page {hasVariations ? 5 : 4} of {totalPages}</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FINAL PAGE: LIFETIME GUARANTEE, INITIAL DEPOSIT & OFFICIAL NAB BANKING    */}
      {/* ========================================================================= */}
      <div className="quote-page bg-white min-h-[297mm] p-10 flex flex-col justify-between relative shadow-2xl print:shadow-none print:min-h-0 print:h-[297mm]">
        <div>
          {/* Lifetime Structural Guarantee Header */}
          <div className="border-2 border-slate-900 rounded-2xl p-5 mb-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white text-center relative overflow-hidden shadow-md">
            <div className="text-xs font-bold uppercase tracking-widest text-amber-400">
              HUDSON HOMES PEACE OF MIND
            </div>
            <h2 className="text-2xl font-serif italic text-white font-extrabold mt-1">
              Lifetime Structural Integrity Guarantee
            </h2>
            <p className="text-xs text-slate-300 max-w-xl mx-auto mt-1.5 leading-relaxed">
              Every Hudson home is engineered and constructed to the highest standards of Australian building compliance. We proudly back our workmanship with a **Lifetime Structural Integrity Guarantee** for total peace of mind.
            </p>

            <div className="flex justify-center gap-6 mt-3 pt-3 border-t border-slate-700 text-[10px] text-amber-300 font-bold uppercase tracking-wider">
              <span>★ 100% Australian Owned</span>
              <span>★ Lifetime Structural Guarantee</span>
              <span>★ ISO 9001 Certified</span>
              <span>★ 12-Month Defect Period</span>
            </div>
          </div>

          {/* Initial Deposit & Preliminary Works Container */}
          <div className="border border-emerald-600/60 bg-emerald-50/50 rounded-2xl p-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200 pb-2.5 mb-2.5">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  INITIAL DEPOSIT TO PROCEED
                </div>
                <div className="text-base font-extrabold text-slate-900">
                  {client.depositType === "brownfield" ? "Brownfield Site Allocation" : "Greenfield Site Allocation"}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Deposit Amount</span>
                <span className="text-xl font-extrabold text-emerald-700 font-mono">
                  {formatAud(client.depositAmount || 1650)}
                </span>
              </div>
            </div>

            {/* List of preliminary work completed */}
            <div className="text-[10.5px] text-slate-700 leading-relaxed">
              <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                <FileCheck2 className="h-3.5 w-3.5 text-emerald-600" />
                Preliminary Work Completed as a result of the Initial Deposit:
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-600 pt-0.5">
                <div>• On-site Investigation Report</div>
                <div>• Geotechnical Soil Test</div>
                <div>• Wind Classification Report</div>
                <div>• Registered Contour Survey</div>
                <div>• Developer Covenant Compliance Check</div>
                <div>• Drafted Plans &amp; Elevations by in-house draftsmen</div>
                <div className="col-span-2">• Completed Formal Tender Pricing by in-house estimator</div>
              </div>
            </div>
          </div>

          {/* Official National Australia Bank (NAB) Transfer Details & QR Code */}
          <div className="border border-slate-300 rounded-2xl p-4 bg-slate-50 flex items-center justify-between gap-6 mb-4">
            <div className="space-y-1 text-xs flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-800 flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-cyan-600" />
                HUDSON HOMES QLD BANK DETAILS
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 pt-1 text-[11px]">
                <div>
                  <span className="text-slate-500 text-[10px] block">Account Name:</span>
                  <span className="font-bold text-slate-900">Hudson Homes (QLD) Pty Ltd</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Bank:</span>
                  <span className="font-bold text-slate-900">National Australia Bank (NAB)</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">BSB Number:</span>
                  <span className="font-bold font-mono text-slate-900 text-sm">082 778</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Account Number:</span>
                  <span className="font-bold font-mono text-slate-900 text-sm">74-586-5607</span>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="text-slate-500 text-[10px] block">EFT Payment Remittance Reference:</span>
                    <span className="font-bold font-mono text-cyan-800 text-xs">
                      {((client.clientName || "Client").trim().split(/\s+/).pop() || "Client")}-{(client.estimateNumber || quote.quoteNumber || "MH").trim()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 text-[10px] block">Currency:</span>
                    <span className="font-bold font-mono text-slate-800">AUD</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Real Dynamic Payment QR Code - Directs to 1-Click Copy Web Portal */}
            <div className="flex flex-col items-center justify-center p-2.5 bg-white border border-slate-300 rounded-xl text-center flex-none shadow-sm">
              <PaymentQrCode
                accountName="Hudson Homes (QLD) Pty Ltd"
                bsb="082 778"
                accountNumber="74-586-5607"
                amount={client.depositAmount || 1650}
                reference={`${(client.clientName || "Client").trim().split(/\s+/).pop() || "Client"}-${(client.estimateNumber || quote.quoteNumber || "MH").trim()}`}
                quoteId={quote.id}
                size={85}
              />
              <span className="text-[8.5px] font-bold text-slate-600 mt-1 uppercase font-mono tracking-tight">
                Scan with Banking App
              </span>
            </div>
          </div>

          {/* Signature Block */}
          <div className="pt-2 grid grid-cols-2 gap-8 text-xs">
            <div className="space-y-4">
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-500 mb-5">
                  Client 1 Signature:
                </div>
                <div className="border-b-2 border-slate-900 mb-1" />
                <div className="font-bold text-slate-900">{client.clientName || "Primary Applicant"}</div>
                <div className="text-[10px] text-slate-500">Date: ____ / ____ / 2026</div>
              </div>

              {client.hasClient2 && client.client2Name && (
                <div>
                  <div className="text-[10px] font-bold uppercase text-slate-500 mb-5">
                    Client 2 Signature:
                  </div>
                  <div className="border-b-2 border-slate-900 mb-1" />
                  <div className="font-bold text-slate-900">{client.client2Name}</div>
                  <div className="text-[10px] text-slate-500">Date: ____ / ____ / 2026</div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-[10px] font-bold uppercase text-slate-500 mb-5">
                  Authorised New Home Consultant:
                </div>
                <div className="border-b-2 border-slate-900 mb-1" />
                <div className="font-bold text-slate-900">{client.consultantName}</div>
                <div className="text-[10px] text-slate-500">{client.consultantOffice} · {client.consultantPhone}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Date: {formattedCreatedDate}</div>
              </div>

              <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-200 text-[9.5px] text-slate-600">
                <span className="font-bold block text-slate-800 mb-0.5">Hudson Homes Pty Ltd</span>
                Level 5, 106 City Road, Beenleigh QLD 4207
                <br />Phone: 1300 246 200 · Fax: 1300 246 300 · www.hudsonhomes.com.au
              </div>
            </div>
          </div>
        </div>

        {/* Final Page Footer */}
        <div className="border-t border-slate-200 pt-4 flex items-center justify-between text-[10px] text-slate-500">
          <div>
            Hudson Homes Pty Ltd · ABN: 49 163 189 071 · Builder&apos;s Licence: 259372C
          </div>
          <div className="flex items-center gap-4">
            <div className="border border-slate-400 px-3 py-1 text-[9px] font-bold uppercase text-slate-600 rounded">
              CUSTOMER INITIAL
            </div>
            <div className="font-mono">Page {totalPages} of {totalPages}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
