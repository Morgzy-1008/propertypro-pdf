import React from "react";
import { Logo } from "@/components/flyer/FlyerTemplates";
import { formatAud } from "@/lib/pricing";
import type { TenderSubmission } from "@/lib/tender/tenderTypes";
import { Check, CheckCircle2, FileText, Home, Layers, MapPin, User, ShieldCheck } from "lucide-react";

interface TenderRequestFormPdfProps {
  tender: TenderSubmission;
}

export function TenderRequestFormPdf({ tender }: TenderRequestFormPdfProps) {
  const { customer1, customer2, hasCustomer2, land, homeSpec, variations, solicitor, financier, atp, checklist } = tender;

  const variationsPage1 = variations.slice(0, 14);
  const variationsPage2 = variations.slice(14);

  return (
    <div className="space-y-8 bg-slate-900/50 p-4 rounded-2xl">
      {/* ========================================================================= */}
      {/* PAGE 1: CUSTOMER, CURRENT RESIDENCE & LAND DETAILS                         */}
      {/* ========================================================================= */}
      <div className="quote-page bg-white min-h-[297mm] p-10 flex flex-col justify-between text-slate-900 shadow-2xl print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-4">
            <div>
              <h1 className="text-2xl font-extrabold uppercase tracking-tight text-slate-950">
                TENDER REQUEST FORM
              </h1>
              <span className="text-xs font-semibold text-cyan-800 uppercase tracking-widest block mt-0.5">
                OnSite Client Profile &amp; Estimating Instructions
              </span>
            </div>
            <Logo size={10} />
          </div>

          {/* Build Type & Purchaser Type Badges */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">Build Type:</span>
              <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
                {["Vacant Land", "Knock-Down, Rebuild", "Home & Land Package", "Custom"].map((t) => {
                  const isSel = tender.buildType === t;
                  return (
                    <span
                      key={t}
                      className={`px-2 py-0.5 rounded-md border text-[10.5px] flex items-center gap-1 ${
                        isSel
                          ? "bg-cyan-500 text-slate-950 border-cyan-500 font-bold"
                          : "bg-white text-slate-600 border-slate-200"
                      }`}
                    >
                      {isSel && <Check className="h-3 w-3" />} {t}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">Purchaser Type:</span>
              <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
                {["Owner Occupier", "Property Investor", "First-Home Buyer", "Repeat Purchaser"].map((t) => {
                  const isSel = tender.purchaserType === t;
                  return (
                    <span
                      key={t}
                      className={`px-2 py-0.5 rounded-md border text-[10.5px] flex items-center gap-1 ${
                        isSel
                          ? "bg-emerald-500 text-slate-950 border-emerald-500 font-bold"
                          : "bg-white text-slate-600 border-slate-200"
                      }`}
                    >
                      {isSel && <Check className="h-3 w-3" />} {t}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Header Metadata Grid */}
          <div className="grid grid-cols-4 gap-2 text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4">
            <div>
              <span className="text-[9px] uppercase text-slate-500 block">Tender Request Date:</span>
              <strong className="font-mono text-slate-900">{tender.tenderRequestDate}</strong>
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-500 block">Price List Date:</span>
              <strong className="font-mono text-slate-900">{tender.priceListDate}</strong>
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-500 block">Display / Office:</span>
              <strong className="text-slate-900 truncate block">{tender.displayOffice}</strong>
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-500 block">New Home Consultant:</span>
              <strong className="text-slate-900">{tender.newHomeConsultant}</strong>
            </div>
            <div className="col-span-2 pt-1 border-t border-slate-200">
              <span className="text-[9px] uppercase text-slate-500 block">iQuote Reference / Estimate #:</span>
              <strong className="font-mono text-cyan-800">{tender.iquoteId}</strong>
            </div>
            <div className="col-span-2 pt-1 border-t border-slate-200">
              <span className="text-[9px] uppercase text-slate-500 block">Lead Source:</span>
              <strong className="text-slate-900">{tender.source}</strong>
            </div>
          </div>

          {/* Customer 1 & Customer 2 Cards */}
          <div className="mb-4">
            <div className="text-xs font-bold uppercase tracking-wider text-cyan-800 mb-2">
              CUSTOMER / PURCHASER DETAILS
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Customer 1 */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 block border-b border-slate-200 pb-1">
                  Primary Applicant (Customer 1):
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[9px] text-slate-500 block">First Name:</span>
                    <strong className="text-slate-900">{customer1.firstName || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">Surname:</span>
                    <strong className="text-slate-900">{customer1.surname || "—"}</strong>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-[9px] text-slate-500 block">Mobile Phone:</span>
                    <strong className="font-mono text-slate-900">{customer1.mobile || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">Home / Work Phone:</span>
                    <span className="font-mono text-slate-700">{customer1.workPh || customer1.homePh || "—"}</span>
                  </div>
                </div>
                <div className="pt-1">
                  <span className="text-[9px] text-slate-500 block">Email Address:</span>
                  <strong className="text-slate-900 break-all">{customer1.email || "—"}</strong>
                </div>
              </div>

              {/* Customer 2 */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 block border-b border-slate-200 pb-1">
                  Secondary Applicant (Customer 2):
                </span>
                {hasCustomer2 ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[9px] text-slate-500 block">First Name:</span>
                        <strong className="text-slate-900">{customer2.firstName || "—"}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block">Surname:</span>
                        <strong className="text-slate-900">{customer2.surname || "—"}</strong>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <span className="text-[9px] text-slate-500 block">Mobile Phone:</span>
                        <strong className="font-mono text-slate-900">{customer2.mobile || "—"}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-500 block">Home / Work Phone:</span>
                        <span className="font-mono text-slate-700">{customer2.workPh || customer2.homePh || "—"}</span>
                      </div>
                    </div>
                    <div className="pt-1">
                      <span className="text-[9px] text-slate-500 block">Email Address:</span>
                      <strong className="text-slate-900 break-all">{customer2.email || "—"}</strong>
                    </div>
                  </>
                ) : (
                  <div className="py-6 text-center text-slate-400 text-xs italic">
                    Single Applicant (No secondary purchaser)
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Current Home Address */}
          <div className="mb-4 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
              Current Residential Address:
            </span>
            <strong className="text-slate-900">
              {[
                tender.currentHomeAddress.streetNumber,
                tender.currentHomeAddress.streetName,
                tender.currentHomeAddress.suburb,
                tender.currentHomeAddress.state,
                tender.currentHomeAddress.postcode,
              ]
                .filter(Boolean)
                .join(" ") || "Site Address / As Below"}
            </strong>
          </div>

          {/* Proposed Land & Site Details */}
          <div className="mb-4">
            <div className="text-xs font-bold uppercase tracking-wider text-cyan-800 mb-2">
              PROPOSED LAND &amp; SITING DETAILS
            </div>
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-2.5 text-xs">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <span className="text-[9px] text-slate-500 block">Estate Name:</span>
                  <strong className="text-slate-900">{land.estate || "—"}</strong>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block">Stage:</span>
                  <strong className="text-slate-900">{land.stage || "—"}</strong>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block">Lot Number:</span>
                  <strong className="font-mono font-bold text-cyan-800">{land.lotNo ? `Lot ${land.lotNo}` : "TBA"}</strong>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block">Lot Area &amp; Frontage:</span>
                  <strong className="font-mono text-slate-900">
                    {land.lotSizeM2 ? `${land.lotSizeM2} m²` : "—"} · {land.frontageM ? `${land.frontageM}m front` : ""}
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-1 border-t border-slate-200">
                <div className="col-span-2">
                  <span className="text-[9px] text-slate-500 block">Proposed Site Address:</span>
                  <strong className="text-slate-900">
                    {[land.streetNumber, land.streetName, land.suburb].filter(Boolean).join(" ")}
                  </strong>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block">Local Council:</span>
                  <strong className="text-slate-900">{land.council}</strong>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-1 border-t border-slate-200">
                <div>
                  <span className="text-[9px] text-slate-500 block">Registration Status:</span>
                  <strong className="text-slate-900">
                    {land.isRegistered ? "Registered Land" : `Unregistered (${land.registeredDate || "TBA"})`}
                  </strong>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block">Land Status:</span>
                  <strong className="text-slate-900">{land.landStatus}</strong>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block">Covenants / Guidelines:</span>
                  <strong className="text-slate-900">{land.covenantsGuidelines ? "Yes (Applicable)" : "No"}</strong>
                </div>
              </div>

              {tender.buildType === "Knock-Down, Rebuild" && (
                <div className="pt-1 border-t border-slate-200 grid grid-cols-3 gap-3">
                  <div>
                    <span className="text-[9px] text-slate-500 block">KDR Occupancy:</span>
                    <strong className="text-slate-900">{land.ifKdrOccupancy || "Owner Occupied"}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">Access Contact:</span>
                    <strong className="text-slate-900">{land.kdrAccessName || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 block">Access Phone:</span>
                    <span className="font-mono text-slate-900">{land.kdrAccessPhone || "—"}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page 1 Footer */}
        <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-500">
          <div>Hudson Homes Pty Ltd · TR Form (Job Specification)</div>
          <div className="flex items-center gap-4">
            <div className="border border-slate-400 px-3 py-0.5 text-[9px] font-bold uppercase text-slate-600 rounded">
              CUSTOMER INITIAL
            </div>
            <div className="font-mono">Page 1 of 4</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 2: NEW HOME SPECIFICATION & NUMBERED VARIATIONS (1-14)                */}
      {/* ========================================================================= */}
      <div className="quote-page bg-white min-h-[297mm] p-10 flex flex-col justify-between text-slate-900 shadow-2xl print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-4">
            <div>
              <h2 className="text-xl font-extrabold uppercase tracking-tight text-slate-950">
                NEW HOME SPECIFICATION &amp; VARIATIONS
              </h2>
              <span className="text-xs font-semibold text-cyan-800 uppercase tracking-widest block mt-0.5">
                Design Configuration &amp; Itemized Variation Schedule (Page 1)
              </span>
            </div>
            <div className="text-right text-xs">
              <div className="font-mono font-bold text-slate-900">Ref: {tender.submissionNumber}</div>
              <div className="text-slate-500">{customer1.surname} Residence</div>
            </div>
          </div>

          {/* New Home Details Grid */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 grid grid-cols-3 gap-3 text-xs mb-4">
            <div>
              <span className="text-[9px] uppercase text-slate-500 block">Home Design:</span>
              <strong className="text-slate-900 text-sm">{homeSpec.homeDesign}</strong>
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-500 block">Selected Facade:</span>
              <strong className="text-slate-900 text-sm">{homeSpec.facade}</strong>
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-500 block">Inclusions Range:</span>
              <strong className="text-emerald-700 text-sm">{homeSpec.inclusionsType}</strong>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <span className="text-[9px] uppercase text-slate-500 block">Garage Location:</span>
              <strong className="text-slate-900">{homeSpec.garageLocation}</strong>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-200">
              <span className="text-[9px] uppercase text-slate-500 block">Setbacks (F / R / L / R):</span>
              <strong className="font-mono text-slate-900">
                Front: {homeSpec.setbacks.frontBoundary} · Rear: {homeSpec.setbacks.rearBoundary} · Left: {homeSpec.setbacks.leftBoundary} · Right: {homeSpec.setbacks.rightBoundary}
              </strong>
            </div>

            <div className="col-span-3 pt-2 border-t border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase text-slate-500 block">Special Offers &amp; Promotions:</span>
                <strong className="text-slate-900">{homeSpec.specialOffers || "Standard Builder Promotion"}</strong>
              </div>
              <div className="text-right">
                <span className="text-[9px] uppercase text-slate-500 block">Customer Budget:</span>
                <strong className="font-mono text-cyan-800 text-sm">
                  {homeSpec.customerBudget ? formatAud(Number(homeSpec.customerBudget)) : formatAud(homeSpec.totalBudgetEstimate)}
                </strong>
              </div>
            </div>
          </div>

          {/* Cost Summary Table */}
          <div className="mb-4">
            <div className="text-xs font-bold uppercase tracking-wider text-cyan-800 mb-1.5">
              ESTIMATED CONSTRUCTION COST SUMMARY
            </div>
            <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
              <tbody className="divide-y divide-slate-200">
                <tr className="bg-slate-50">
                  <td className="py-1.5 px-3 font-semibold">Home Design ({homeSpec.homeDesign})</td>
                  <td className="py-1.5 px-3 text-right font-mono font-bold">{formatAud(homeSpec.baseDesignCost)}</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3">Architectural Facade ({homeSpec.facade})</td>
                  <td className="py-1.5 px-3 text-right font-mono">{formatAud(homeSpec.facadeCost)}</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="py-1.5 px-3">Numbered Variations &amp; Custom Upgrades</td>
                  <td className="py-1.5 px-3 text-right font-mono font-bold text-cyan-800">{formatAud(homeSpec.additionsCost)}</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3">Site Earthworks, Engineering &amp; Statutory Costs</td>
                  <td className="py-1.5 px-3 text-right font-mono">{formatAud(homeSpec.additionalSiteCost)}</td>
                </tr>
                {homeSpec.promotionDiscountCost > 0 && (
                  <tr className="bg-emerald-50/60 text-emerald-900 font-semibold">
                    <td className="py-1.5 px-3">Builder Promotional Discount</td>
                    <td className="py-1.5 px-3 text-right font-mono">-{formatAud(homeSpec.promotionDiscountCost)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Numbered Variations Table (Items 1 to 14) */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-cyan-800 mb-1.5 flex items-center justify-between">
              <span>ITEMIZED VARIATIONS (Detail on marked-up plans where applicable)</span>
              <span className="text-[10px] text-slate-500 font-normal">Items 1 to {Math.min(14, variations.length)}</span>
            </div>

            <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-1.5 px-2 text-center w-12">#</th>
                  <th className="py-1.5 px-3 text-left">Variation Description</th>
                  <th className="py-1.5 px-3 text-right w-28">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {Array.from({ length: 14 }).map((_, i) => {
                  const item = variationsPage1[i];
                  return (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="py-1 px-2 text-center font-mono font-bold text-slate-500 text-[11px]">
                        {item ? item.itemNumber : i + 1}
                      </td>
                      <td className="py-1 px-3 text-slate-800 text-[11px]">
                        {item ? item.description : ""}
                      </td>
                      <td className="py-1 px-3 text-right font-mono text-slate-900 text-[11px]">
                        {item ? formatAud(item.cost) : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Page 2 Footer */}
        <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-500">
          <div>Hudson Homes Pty Ltd · TR Form (Variations Schedule)</div>
          <div className="flex items-center gap-4">
            <div className="border border-slate-400 px-3 py-0.5 text-[9px] font-bold uppercase text-slate-600 rounded">
              CUSTOMER INITIAL
            </div>
            <div className="font-mono">Page 2 of 4</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 3: VARIATIONS CONTINUATION & TOTAL BUDGET ESTIMATE                     */}
      {/* ========================================================================= */}
      <div className="quote-page bg-white min-h-[297mm] p-10 flex flex-col justify-between text-slate-900 shadow-2xl print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-4">
            <div>
              <h2 className="text-xl font-extrabold uppercase tracking-tight text-slate-950">
                VARIATIONS CONTINUATION SCHEDULE
              </h2>
              <span className="text-xs font-semibold text-cyan-800 uppercase tracking-widest block mt-0.5">
                Itemized Variation Request &amp; Specification Continuation (Page 2)
              </span>
            </div>
            <div className="text-right text-xs">
              <div className="font-mono font-bold text-slate-900">Ref: {tender.submissionNumber}</div>
              <div className="text-slate-500">{customer1.surname} Residence</div>
            </div>
          </div>

          {/* Numbered Variations Continuation (Items 15 to 36) */}
          <div className="mb-6">
            <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-1.5 px-2 text-center w-12">#</th>
                  <th className="py-1.5 px-3 text-left">Variation Description</th>
                  <th className="py-1.5 px-3 text-right w-28">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {Array.from({ length: 22 }).map((_, i) => {
                  const item = variationsPage2[i];
                  return (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="py-1 px-2 text-center font-mono font-bold text-slate-500 text-[11px]">
                        {item ? item.itemNumber : i + 15}
                      </td>
                      <td className="py-1 px-3 text-slate-800 text-[11px]">
                        {item ? item.description : ""}
                      </td>
                      <td className="py-1 px-3 text-right font-mono text-slate-900 text-[11px]">
                        {item ? formatAud(item.cost) : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Total Budget Estimate Grand Box */}
          <div className="border-2 border-slate-900 rounded-xl p-4 bg-slate-50 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                TOTAL ESTIMATED BUILD INVESTMENT (INC. GST):
              </span>
              <span className="text-[10px] text-slate-500">
                Subject to final soil classification, contour survey, and developer approvals.
              </span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono text-slate-950">
                {formatAud(homeSpec.totalBudgetEstimate)}
              </span>
            </div>
          </div>
        </div>

        {/* Page 3 Footer */}
        <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-500">
          <div>Hudson Homes Pty Ltd · TR Form (Variations Continuation)</div>
          <div className="flex items-center gap-4">
            <div className="border border-slate-400 px-3 py-0.5 text-[9px] font-bold uppercase text-slate-600 rounded">
              CUSTOMER INITIAL
            </div>
            <div className="font-mono">Page 3 of 4</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 4: SOLICITOR, FINANCIER & 15-POINT SUBMISSION CHECKLIST               */}
      {/* ========================================================================= */}
      <div className="quote-page bg-white min-h-[297mm] p-10 flex flex-col justify-between text-slate-900 shadow-2xl print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-4">
            <div>
              <h2 className="text-xl font-extrabold uppercase tracking-tight text-slate-950">
                SOLICITOR, FINANCIER &amp; CHECKLIST
              </h2>
              <span className="text-xs font-semibold text-cyan-800 uppercase tracking-widest block mt-0.5">
                Legal Contacts, Lending Details &amp; Workflow Manager Submission
              </span>
            </div>
            <Logo size={10} />
          </div>

          {/* Solicitor & Financier Side-by-Side */}
          <div className="grid grid-cols-2 gap-4 text-xs mb-4">
            {/* Solicitor */}
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-1.5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                Purchaser&apos;s Solicitor / Conveyancer:
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block">Firm Name:</span>
                <strong className="text-slate-900">{solicitor.firmOrCompany || "To Be Advised"}</strong>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block">Address:</span>
                <span className="text-slate-700">{solicitor.address || "—"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-[9px] text-slate-500 block">Telephone:</span>
                  <span className="font-mono text-slate-900">{solicitor.telephone || "—"}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block">Contact Person:</span>
                  <span className="text-slate-900">{solicitor.contactPerson || "—"}</span>
                </div>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block">Email:</span>
                <span className="text-slate-900">{solicitor.email || "—"}</span>
              </div>
            </div>

            {/* Financier */}
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-1.5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                Purchaser&apos;s Financier / Mortgage Broker:
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block">Lender / Brokerage:</span>
                <strong className="text-slate-900">{financier.firmOrCompany || "To Be Advised"}</strong>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block">Address:</span>
                <span className="text-slate-700">{financier.address || "—"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-[9px] text-slate-500 block">Telephone:</span>
                  <span className="font-mono text-slate-900">{financier.telephone || "—"}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block">Contact Person:</span>
                  <span className="text-slate-900">{financier.contactPerson || "—"}</span>
                </div>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block">Email:</span>
                <span className="text-slate-900">{financier.email || "—"}</span>
              </div>
            </div>
          </div>

          {/* Consultant Notes */}
          {tender.consultantNotes && (
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 text-xs mb-4">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                Consultant Notes for Workflow &amp; Estimating:
              </span>
              <p className="text-slate-700 italic leading-relaxed">{tender.consultantNotes}</p>
            </div>
          )}

          {/* 15-Point Submission Checklist */}
          <div className="mb-4">
            <div className="text-xs font-bold uppercase tracking-wider text-cyan-800 mb-2">
              TENDER REQUEST SUBMISSION CHECKLIST
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              {checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-slate-700">
                  <div
                    className={`h-4 w-4 rounded flex items-center justify-center flex-none ${
                      item.checked ? "bg-emerald-600 text-white" : "border border-slate-300 bg-white"
                    }`}
                  >
                    {item.checked && <Check className="h-3 w-3" />}
                  </div>
                  <span className={item.checked ? "font-medium text-slate-900" : "text-slate-500"}>
                    {item.id}. {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Consultant Sign-off */}
          <div className="border border-slate-300 rounded-xl p-3 bg-slate-50 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">New Home Consultant:</span>
              <strong className="text-slate-900">{tender.newHomeConsultant}</strong>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Display Centre:</span>
              <span className="text-slate-700">{tender.displayOffice}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Tender Request Date:</span>
              <span className="font-mono font-bold text-slate-900">{tender.tenderRequestDate}</span>
            </div>
          </div>
        </div>

        {/* Page 4 Footer */}
        <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-500">
          <div>Hudson Homes Pty Ltd · TR Form (Checklist &amp; Contacts)</div>
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
