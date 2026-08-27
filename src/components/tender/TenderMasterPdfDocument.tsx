import React from "react";
import { Logo } from "@/components/flyer/FlyerTemplates";
import { formatAud } from "@/lib/pricing";
import type { TenderSubmission } from "@/lib/tender/tenderTypes";
import { Check, CheckCircle2, ShieldCheck, Home, MapPin, User, FileText, Layers, Sparkles, HardHat } from "lucide-react";

interface TenderMasterPdfDocumentProps {
  tender: TenderSubmission;
}

export function TenderMasterPdfDocument({ tender }: TenderMasterPdfDocumentProps) {
  const { customer1, customer2, hasCustomer2, land, homeSpec, variations, atp } = tender;

  const structuralVariations = variations.filter((v) => v.isStructural);
  const inclusionsVariations = variations.filter((v) => !v.isStructural && v.category !== "site_council");
  const siteCouncilVariations = variations.filter((v) => v.category === "site_council");

  const isGreenfield = atp.feeType === "greenfield_1650";
  const isKdr = atp.feeType === "kdr_duplex_3300";
  const isPackage = atp.feeType === "package_3000";
  const isCustom = atp.isCustomDesignAddon || atp.feeType === "custom_design_800";

  const showSideBySide =
    homeSpec.isModifiedFloorplan &&
    homeSpec.originalFloorplanUrl &&
    homeSpec.originalFloorplanUrl !== homeSpec.floorplanUrl;

  return (
    <div className="space-y-8 bg-slate-900/50 p-4 rounded-2xl">
      {/* ========================================================================= */}
      {/* PAGE 1: PROJECT PROFILE, LAND & PRICING SUMMARY                           */}
      {/* ========================================================================= */}
      <div className="quote-page bg-white min-h-[297mm] p-10 flex flex-col justify-between text-slate-900 shadow-2xl print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-4">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-950">
                TENDER REQUEST SPECIFICATION
              </h1>
              <span className="text-xs font-semibold text-cyan-800 uppercase tracking-widest block mt-0.5">
                Head Office Estimating Instructions &amp; Project Profile
              </span>
            </div>
            <Logo size={10} />
          </div>

          {/* Top Meta Strip */}
          <div className="grid grid-cols-4 gap-2 text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4">
            <div>
              <span className="text-[9px] uppercase text-slate-500 block">Tender Reference:</span>
              <strong className="font-mono text-cyan-800 font-bold">{tender.submissionNumber}</strong>
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-500 block">Tender Request Date:</span>
              <strong className="font-mono text-slate-900">{tender.tenderRequestDate}</strong>
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-500 block">New Home Consultant:</span>
              <strong className="text-slate-900">{tender.newHomeConsultant}</strong>
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-500 block">Display Centre:</span>
              <strong className="text-slate-900 truncate block">{tender.displayOffice}</strong>
            </div>
          </div>

          {/* Customer Profile Cards */}
          <div className="mb-4">
            <div className="text-xs font-bold uppercase tracking-wider text-cyan-800 mb-2">
              1. CUSTOMER / PURCHASER PROFILE
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 block border-b border-slate-200 pb-1">
                  Primary Purchaser (Customer 1):
                </span>
                <div className="text-sm font-bold text-slate-900">
                  {customer1.title || "Mr"} {customer1.firstName} {customer1.surname}
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-[9px] text-slate-500 block">Mobile Phone:</span>
                    <strong className="font-mono text-slate-900">{customer1.mobile || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">Email:</span>
                    <span className="text-slate-900 truncate block">{customer1.email || "—"}</span>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 block border-b border-slate-200 pb-1">
                  Secondary Purchaser (Customer 2):
                </span>
                {hasCustomer2 ? (
                  <>
                    <div className="text-sm font-bold text-slate-900">
                      {customer2.title || "Mrs"} {customer2.firstName} {customer2.surname}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div>
                        <span className="text-[9px] text-slate-500 block">Mobile Phone:</span>
                        <strong className="font-mono text-slate-900">{customer2.mobile || "—"}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block">Email:</span>
                        <span className="text-slate-900 truncate block">{customer2.email || "—"}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-4 text-center text-slate-400 text-xs italic">
                    Single Purchaser Application
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Proposed Land & Siting Details */}
          <div className="mb-4">
            <div className="text-xs font-bold uppercase tracking-wider text-cyan-800 mb-2">
              2. PROPOSED LAND &amp; SITING CONDITIONS
            </div>
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-2 text-xs">
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <span className="text-[9px] text-slate-500 block">Estate &amp; Stage:</span>
                  <strong className="text-slate-900">{land.estate || "—"} {land.stage ? `· ${land.stage}` : ""}</strong>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block">Lot Number:</span>
                  <strong className="font-mono font-bold text-cyan-800">Lot {land.lotNo || "TBA"}</strong>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block">Lot Area &amp; Frontage:</span>
                  <strong className="font-mono text-slate-900">
                    {land.lotSizeM2 ? `${land.lotSizeM2} m²` : "—"} · {land.frontageM ? `${land.frontageM}m` : ""}
                  </strong>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block">Local Council:</span>
                  <strong className="text-slate-900">{land.council}</strong>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-slate-200">
                <div className="col-span-2">
                  <span className="text-[9px] text-slate-500 block">Site Street Address:</span>
                  <strong className="text-slate-900">
                    {[land.streetNumber, land.streetName, land.suburb].filter(Boolean).join(" ") || "Address TBA"}
                  </strong>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block">Registration Status:</span>
                  <strong className="text-slate-900">
                    {land.isRegistered ? "Registered Land" : `Unregistered (${land.registeredDate || "TBA"})`}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* New Home Build Specification */}
          <div className="mb-4">
            <div className="text-xs font-bold uppercase tracking-wider text-cyan-800 mb-2">
              3. NEW HOME BUILD SPECIFICATION
            </div>
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 grid grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[9px] uppercase text-slate-500 block">Home Design:</span>
                <strong className="text-slate-900 text-sm">{homeSpec.homeDesign}</strong>
              </div>
              <div>
                <span className="text-[9px] uppercase text-slate-500 block">Architectural Facade:</span>
                <strong className="text-slate-900 text-sm">{homeSpec.facade}</strong>
              </div>
              <div>
                <span className="text-[9px] uppercase text-slate-500 block">Inclusions Range:</span>
                <strong className="text-emerald-700 text-sm">{homeSpec.inclusionsType}</strong>
              </div>
              <div>
                <span className="text-[9px] uppercase text-slate-500 block">Garage Placement:</span>
                <strong className="text-slate-900">{homeSpec.garageLocation}</strong>
              </div>
            </div>
          </div>

          {/* Estimated Build Investment Summary Table */}
          <div className="mb-2">
            <div className="text-xs font-bold uppercase tracking-wider text-cyan-800 mb-1.5">
              4. ESTIMATED BUILD INVESTMENT BREAKDOWN
            </div>
            <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
              <tbody className="divide-y divide-slate-200">
                <tr className="bg-slate-50">
                  <td className="py-2 px-3 font-semibold">Base House Price ({homeSpec.homeDesign})</td>
                  <td className="py-2 px-3 text-right font-mono font-bold">{formatAud(homeSpec.baseDesignCost)}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3">Architectural Facade Uplift ({homeSpec.facade})</td>
                  <td className="py-2 px-3 text-right font-mono">{formatAud(homeSpec.facadeCost)}</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="py-2 px-3">Numbered Structural Variations ({structuralVariations.length} items on plan)</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-amber-800">{formatAud(homeSpec.structuralVariationsCost)}</td>
                </tr>
                <tr>
                  <td className="py-2 px-3">Internal Luxury Inclusions &amp; Fixtures Upgrades ({inclusionsVariations.length} items)</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-cyan-800">{formatAud(homeSpec.internalUpgradesCost)}</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="py-2 px-3">Site Earthworks, Foundation Engineering &amp; Council Allowances ({siteCouncilVariations.length} items)</td>
                  <td className="py-2 px-3 text-right font-mono">{formatAud(homeSpec.additionalSiteCost)}</td>
                </tr>
                {homeSpec.promotionDiscountCost > 0 && (
                  <tr className="bg-emerald-50/70 text-emerald-900 font-semibold">
                    <td className="py-2 px-3">Special Builder Promotion Discount</td>
                    <td className="py-2 px-3 text-right font-mono">-{formatAud(homeSpec.promotionDiscountCost)}</td>
                  </tr>
                )}
                <tr className="bg-slate-900 text-white font-bold text-sm">
                  <td className="py-2.5 px-3">TOTAL ESTIMATED BUILD INVESTMENT (INC. GST)</td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-amber-300">{formatAud(homeSpec.totalBudgetEstimate)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-500">
          <div>Hudson Homes Pty Ltd · Master Tender Request Specification</div>
          <div className="flex items-center gap-4">
            <div className="border border-slate-400 px-3 py-0.5 text-[9px] font-bold uppercase text-slate-600 rounded">
              CUSTOMER INITIAL
            </div>
            <div className="font-mono">Page 1 of 4</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 2: ARCHITECTURAL FLOORPLAN WITH NUMBERED STRUCTURAL BADGES           */}
      {/* ========================================================================= */}
      <div className="quote-page bg-white min-h-[297mm] p-10 flex flex-col justify-between text-slate-900 shadow-2xl print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-4">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-950">
                ARCHITECTURAL FLOORPLAN DRAWING
              </h2>
              <span className="text-xs font-semibold text-cyan-800 uppercase tracking-widest block mt-0.5">
                {showSideBySide ? "Original Catalog Layout vs. Modified Floorplan with Structural Badges" : "Structural Modifications & Numbered Markup Overlay"}
              </span>
            </div>
            <div className="text-right text-xs">
              <div className="font-mono font-bold text-slate-900">Ref: {tender.submissionNumber}</div>
              <div className="text-slate-500">{customer1.surname} Residence &bull; {homeSpec.homeDesign}</div>
            </div>
          </div>

          {/* Floorplan Container (Side-by-side if modified) */}
          <div className="mb-4">
            {showSideBySide ? (
              <div className="grid grid-cols-2 gap-4">
                {/* Left: Original */}
                <div className="border border-slate-300 rounded-2xl p-3 bg-slate-50">
                  <span className="text-[10px] uppercase font-black text-slate-700 block border-b border-slate-200 pb-1 mb-2">
                    ORIGINAL {homeSpec.homeDesign} FLOORPLAN (Standard)
                  </span>
                  <div className="h-[430px] flex items-center justify-center">
                    <img
                      src={homeSpec.originalFloorplanUrl}
                      alt={`Original ${homeSpec.homeDesign}`}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                </div>

                {/* Right: Modified */}
                <div className="border-2 border-amber-500/60 rounded-2xl p-3 bg-slate-50 relative">
                  <span className="text-[10px] uppercase font-black text-amber-800 block border-b border-slate-200 pb-1 mb-2">
                    MODIFIED FLOORPLAN (With Numbered Structural Badges)
                  </span>
                  <div className="h-[430px] relative flex items-center justify-center">
                    <img
                      src={homeSpec.floorplanUrl}
                      alt={`Modified ${homeSpec.homeDesign}`}
                      className="max-h-full max-w-full object-contain"
                    />
                    {homeSpec.floorplanPins.map((pin) => (
                      <div
                        key={pin.id}
                        style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-amber-500 text-slate-950 border-2 border-slate-950 font-mono font-black text-[10px] flex items-center justify-center shadow-lg"
                      >
                        {pin.number}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 relative min-h-[480px] flex items-center justify-center">
                {homeSpec.floorplanUrl ? (
                  <div className="relative w-full max-w-xl mx-auto">
                    <img
                      src={homeSpec.floorplanUrl}
                      alt={homeSpec.homeDesign}
                      className="w-full h-auto max-h-[460px] object-contain mx-auto block"
                    />
                    {homeSpec.floorplanPins.map((pin) => (
                      <div
                        key={pin.id}
                        style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-amber-500 text-slate-950 border-2 border-slate-950 font-mono font-black text-xs flex items-center justify-center shadow-lg"
                      >
                        {pin.number}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 text-slate-400 text-xs italic">
                    Standard {homeSpec.homeDesign} floorplan layout selected
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Structural Callout Key below Plan */}
          {structuralVariations.length > 0 && (
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <span className="text-[10px] uppercase font-bold text-slate-600 block mb-1.5">
                Numbered Structural Changes Referenced on Plan Above:
              </span>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {structuralVariations.map((v) => (
                  <div key={v.id} className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full bg-amber-500 text-slate-950 font-mono font-bold text-[9px] flex items-center justify-center flex-none">
                      {v.itemNumber}
                    </span>
                    <span className="text-slate-800 text-[11px] font-medium truncate">{v.description}</span>
                    <span className="font-mono text-[10.5px] text-slate-600 ml-auto flex-none">{formatAud(v.cost)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-500">
          <div>Hudson Homes Pty Ltd · Floorplan Drawing with Structural Callouts</div>
          <div className="flex items-center gap-4">
            <div className="border border-slate-400 px-3 py-0.5 text-[9px] font-bold uppercase text-slate-600 rounded">
              CUSTOMER INITIAL
            </div>
            <div className="font-mono">Page 2 of 4</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 3: ITEMIZED VARIATION SCHEDULE (TITLES ONLY - 3 SECTIONS)             */}
      {/* ========================================================================= */}
      <div className="quote-page bg-white min-h-[297mm] p-10 flex flex-col justify-between text-slate-900 shadow-2xl print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-4">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-950">
                ITEMIZED VARIATION SCHEDULE
              </h2>
              <span className="text-xs font-semibold text-cyan-800 uppercase tracking-widest block mt-0.5">
                Head Office Scope of Works · Titles &amp; Cost Allowances
              </span>
            </div>
            <div className="text-right text-xs">
              <div className="font-mono font-bold text-slate-900">Ref: {tender.submissionNumber}</div>
              <div className="text-slate-500">{customer1.surname} Residence</div>
            </div>
          </div>

          {/* Section A: Numbered Structural Variations */}
          <div className="mb-4">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-1.5 flex items-center justify-between border-b border-amber-500/40 pb-1">
              <span>A. NUMBERED STRUCTURAL VARIATIONS (Refer to marked-up floorplan)</span>
              <span className="font-mono text-slate-900">{formatAud(homeSpec.structuralVariationsCost)}</span>
            </div>

            {structuralVariations.length === 0 ? (
              <div className="py-2 text-slate-400 text-xs italic">Standard architectural layout with no structural deviations.</div>
            ) : (
              <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-1.5 px-2 text-center w-12">#</th>
                    <th className="py-1.5 px-3 text-left">Structural Modification Title</th>
                    <th className="py-1.5 px-3 text-right w-28">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {structuralVariations.map((v) => (
                    <tr key={v.id} className="bg-white">
                      <td className="py-1 px-2 text-center font-mono font-bold text-amber-800 text-[11px]">
                        #{v.itemNumber}
                      </td>
                      <td className="py-1 px-3 text-slate-800 font-medium text-[11px]">
                        {v.description}
                      </td>
                      <td className="py-1 px-3 text-right font-mono text-slate-900 text-[11px]">
                        {formatAud(v.cost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Section B: Internal Inclusions & Specification Upgrades */}
          <div className="mb-4">
            <div className="text-xs font-bold uppercase tracking-wider text-cyan-800 mb-1.5 flex items-center justify-between border-b border-cyan-500/40 pb-1">
              <span>B. INCLUSIONS &amp; SPECIFICATION UPGRADES</span>
              <span className="font-mono text-slate-900">{formatAud(homeSpec.internalUpgradesCost)}</span>
            </div>

            {inclusionsVariations.length === 0 ? (
              <div className="py-2 text-slate-400 text-xs italic">Standard {homeSpec.inclusionsType} inclusion specification.</div>
            ) : (
              <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-1.5 px-3 text-left">Selected Upgrade / Addition Title</th>
                    <th className="py-1.5 px-3 text-right w-28">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {inclusionsVariations.map((v) => (
                    <tr key={v.id} className="bg-white">
                      <td className="py-1 px-3 text-slate-800 text-[11px]">
                        {v.description}
                      </td>
                      <td className="py-1 px-3 text-right font-mono text-slate-900 text-[11px]">
                        {formatAud(v.cost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Section C: Site & Council Costs */}
          <div className="mb-4">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1.5 flex items-center justify-between border-b border-emerald-500/40 pb-1">
              <span>C. SITE &amp; COUNCIL COSTS</span>
              <span className="font-mono text-slate-900">{formatAud(homeSpec.additionalSiteCost)}</span>
            </div>

            {siteCouncilVariations.length === 0 ? (
              <div className="py-2 text-slate-400 text-xs italic">Standard statutory allowances and site earthworks.</div>
            ) : (
              <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-1.5 px-3 text-left">Site &amp; Council Allowance Title</th>
                    <th className="py-1.5 px-3 text-right w-28">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {siteCouncilVariations.map((v) => (
                    <tr key={v.id} className="bg-white">
                      <td className="py-1 px-3 text-slate-800 text-[11px]">
                        {v.description}
                      </td>
                      <td className="py-1 px-3 text-right font-mono text-slate-900 text-[11px]">
                        {formatAud(v.cost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Total Budget Summary Box */}
          <div className="border-2 border-slate-900 rounded-xl p-3.5 bg-slate-50 flex items-center justify-between mt-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                TOTAL ESTIMATED BUILD INVESTMENT (INC. GST):
              </span>
              <span className="text-[10px] text-slate-500">
                Subject to contour survey, soil classification boreholes, and council assessment.
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono text-slate-950">
                {formatAud(homeSpec.totalBudgetEstimate)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-500">
          <div>Hudson Homes Pty Ltd · Itemized Variation Schedule</div>
          <div className="flex items-center gap-4">
            <div className="border border-slate-400 px-3 py-0.5 text-[9px] font-bold uppercase text-slate-600 rounded">
              CUSTOMER INITIAL
            </div>
            <div className="font-mono">Page 3 of 4</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 4: AUTHORITY TO PROCEED (ATP) & SIGNED REMITTANCE                     */}
      {/* ========================================================================= */}
      <div className="quote-page bg-white min-h-[297mm] p-10 flex flex-col justify-between text-slate-900 shadow-2xl print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-4">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight text-slate-950">
                AUTHORITY TO PROCEED
              </h2>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block mt-0.5">
                Preliminary Building Tender Request Form &amp; Digital Signatures
              </span>
            </div>
            <Logo size={10} />
          </div>

          {/* Acknowledgement Text */}
          <div className="space-y-2.5 text-xs text-slate-700 leading-relaxed mb-4">
            <p>
              I/We hereby request that a Tender document be produced outlining the cost of constructing my/our new Hudson Home along with all assessed site costs, inclusions, options, upgrades and variations that I/we have selected with our New Home Consultant.
            </p>
            <p>
              I/We provide my/our consent and authority for Hudson Homes to conduct a full and proper site assessment, to obtain a contour survey, to conduct a soil test and to assess any specific covenants or restrictions applicable to our lot.
            </p>
          </div>

          {/* Fee Selection Box */}
          <div className="border border-slate-300 rounded-xl p-3.5 bg-slate-50 mb-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">
              I/We acknowledge a non-refundable charge of:
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${isGreenfield ? "bg-cyan-50 border-cyan-500 font-bold text-cyan-950" : "bg-white border-slate-200 text-slate-700"}`}>
                <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${isGreenfield ? "border-cyan-600 bg-cyan-600 text-white" : "border-slate-400"}`}>
                  {isGreenfield && <Check className="h-3 w-3" />}
                </div>
                <span>$1,650 (inc GST) for Greenfield site</span>
              </div>

              <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${isPackage ? "bg-cyan-50 border-cyan-500 font-bold text-cyan-950" : "bg-white border-slate-200 text-slate-700"}`}>
                <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${isPackage ? "border-cyan-600 bg-cyan-600 text-white" : "border-slate-400"}`}>
                  {isPackage && <Check className="h-3 w-3" />}
                </div>
                <span>$3,000 (inc GST) for House &amp; Land package</span>
              </div>

              <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${isKdr ? "bg-cyan-50 border-cyan-500 font-bold text-cyan-950" : "bg-white border-slate-200 text-slate-700"}`}>
                <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${isKdr ? "border-cyan-600 bg-cyan-600 text-white" : "border-slate-400"}`}>
                  {isKdr && <Check className="h-3 w-3" />}
                </div>
                <span>$3,300 (inc GST) for Knock-Down / Duplex</span>
              </div>

              <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${isCustom ? "bg-cyan-50 border-cyan-500 font-bold text-cyan-950" : "bg-white border-slate-200 text-slate-700"}`}>
                <div className={`h-4 w-4 rounded border flex items-center justify-center ${isCustom ? "border-cyan-600 bg-cyan-600 text-white" : "border-slate-400"}`}>
                  {isCustom && <Check className="h-3 w-3" />}
                </div>
                <span>Plus $800 (inc GST) for Custom Design</span>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="space-y-2 text-[11px] text-slate-600 mb-4 leading-snug">
            <p>
              &bull; <strong>Fixed Price Guarantee:</strong> Tender is valid for <strong>270 days (9 months)</strong> from issue date and must be accepted within 10 days of issue.
            </p>
            <p>
              &bull; <strong>Building Deposit Credit:</strong> Whilst the Tender Fee is non-refundable, it is 100% credited towards your final Building Deposit.
            </p>
          </div>

          {/* Signatures Grid */}
          <div className="border border-slate-300 rounded-xl p-3.5 bg-slate-50 mb-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2.5 flex items-center justify-between">
              <span>AUTHENTICATED DIGITAL SIGNATURES</span>
              <span className="text-[10px] text-emerald-700 font-mono flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Digitally Signed
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Client 1 */}
              <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">Primary Purchaser (Client 1):</span>
                <div className="h-12 border border-dashed border-slate-300 rounded flex items-center justify-center bg-slate-50/50 overflow-hidden">
                  {atp.client1SignatureDataUrl ? (
                    <img src={atp.client1SignatureDataUrl} alt="Client 1 Signature" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-slate-400 italic text-xs">
                      {atp.client1Signed ? atp.client1Name : "Signature Pending"}
                    </span>
                  )}
                </div>
                <div className="flex justify-between text-[10.5px] pt-0.5">
                  <span>Print: <strong>{atp.client1Name || `${customer1.firstName} ${customer1.surname}`}</strong></span>
                  <span>Date: <strong>{atp.client1SignatureDate}</strong></span>
                </div>
              </div>

              {/* Client 2 */}
              <div className="space-y-1 bg-white p-2.5 rounded-lg border border-slate-200">
                <span className="text-[9px] text-slate-500 uppercase font-bold block">Secondary Purchaser (Client 2):</span>
                <div className="h-12 border border-dashed border-slate-300 rounded flex items-center justify-center bg-slate-50/50 overflow-hidden">
                  {atp.client2SignatureDataUrl ? (
                    <img src={atp.client2SignatureDataUrl} alt="Client 2 Signature" className="max-h-full max-w-full object-contain" />
                  ) : hasCustomer2 ? (
                    <span className="text-slate-400 italic text-xs">
                      {atp.client2Signed ? atp.client2Name : "Signature Pending"}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[11px]">N/A (Single Purchaser)</span>
                  )}
                </div>
                <div className="flex justify-between text-[10.5px] pt-0.5">
                  <span>Print: <strong>{hasCustomer2 ? atp.client2Name || `${customer2.firstName} ${customer2.surname}` : "N/A"}</strong></span>
                  <span>Date: <strong>{hasCustomer2 ? atp.client2SignatureDate : "—"}</strong></span>
                </div>
              </div>
            </div>

            {/* Consultant Signature */}
            <div className="mt-2.5 pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-[9px] text-slate-500 uppercase block font-bold">New Home Consultant:</span>
                <strong className="text-slate-900">{tender.newHomeConsultant}</strong>
                <span className="text-[10px] text-slate-500 block">{tender.displayOffice} · {tender.consultantPhone}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-slate-500 uppercase block font-bold">Verified Date:</span>
                <span className="font-mono font-bold text-slate-900">{tender.tenderRequestDate}</span>
                <span className="text-[10px] text-emerald-600 block">Status: Tender Active</span>
              </div>
            </div>
          </div>

          {/* Payment Remittance Details */}
          <div className="border border-slate-300 rounded-xl p-3 bg-slate-50 text-xs">
            <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
              <span>EFT PAYMENT REMITTANCE</span>
              <span className="text-cyan-800 font-mono font-bold">Amount: {formatAud(atp.feeAmount)}</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-[11px] text-slate-700 bg-white p-2 rounded border border-slate-200">
              <div><strong>Bank:</strong> NAB</div>
              <div><strong>BSB:</strong> 082 - 778</div>
              <div><strong>Account:</strong> 74-586-5607</div>
              <div><strong>Ref:</strong> <span className="font-mono font-bold text-slate-900">{atp.eftReference}</span></div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-500">
          <div>Hudson Homes Pty Ltd · ABN 49 163 189 071 · Builder&apos;s Licence: 259372C</div>
          <div className="flex items-center gap-4">
            <div className="border border-slate-400 px-3 py-0.5 text-[9px] font-bold uppercase text-slate-600 rounded">
              CUSTOMER INITIAL
            </div>
            <div className="font-mono">Page 4 of 4</div>
          </div>
        </div>
      </div>
    </div>
  );
}
