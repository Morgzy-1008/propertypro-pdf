import React from "react";
import { Logo } from "@/components/flyer/FlyerTemplates";
import { formatAud } from "@/lib/pricing";
import type { TenderSubmission } from "@/lib/tender/tenderTypes";
import {
  Check,
  CheckCircle2,
  ShieldCheck,
  Home,
  MapPin,
  User,
  FileText,
  Layers,
  Sparkles,
  HardHat,
  Trees,
} from "lucide-react";

interface TenderMasterPdfDocumentProps {
  tender: TenderSubmission;
}

export function TenderMasterPdfDocument({ tender }: TenderMasterPdfDocumentProps) {
  const { customer1, customer2, hasCustomer2, land, homeSpec, variations, atp, buildType } = tender;

  const consultantName = tender.newHomeConsultant || tender.atp?.consultantName || "Morgan Hales";
  const consultantDisplayOffice = tender.displayOffice || "Flagstone Display Home";
  const consultantPhone = tender.consultantPhone || tender.atp?.consultantPhone || "0417 571 864";
  const consultantEmail = tender.consultantEmail || tender.atp?.consultantEmail || "morgan.hales@hudsonhomes.com.au";

  const structuralVariations = variations.filter((v) => v.isStructural);
  const allOtherVariations = variations.filter((v) => !v.isStructural);

  const isGreenfield = atp.feeType === "greenfield_1650";
  const isKdr = atp.feeType === "kdr_duplex_3300";
  const isPackage = atp.feeType === "package_3000";
  const isCustom = atp.isCustomDesignAddon || atp.feeType === "custom_design_800";

  // Dynamic calculation to ensure no table or text ever exceeds the printable A4 border
  const isKdrb = buildType.includes("KDRB");
  // Page 1 usable vertical height is ~1042px (1122px - 80px padding).
  // Fixed sections: Header (75px) + Meta Strip (90px) + Cust Profile (170px) + Land/Site (155px, +45px if KDRB) + Build Spec (100px) + Point 4 Title/Header/Total (105px) + Footer (45px) = 740px (785px if KDRB).
  // Available space remaining inside Page 1 border for Point 4 table rows is ~300px (255px if KDRB).
  const availableBorderHeightPx = isKdrb ? 255 : 300;

  // Exact physical height needed by all item rows
  let calculatedItemsHeightPx = 34; // Base price row
  if ((homeSpec.areaAdjustmentsBreakdown && homeSpec.areaAdjustmentsBreakdown.length > 0) || 
      (homeSpec.modifiedDesignM2 && homeSpec.designM2 && Math.abs(homeSpec.modifiedDesignM2 - homeSpec.designM2) > 0.05)) {
    calculatedItemsHeightPx += (homeSpec.areaAdjustmentsBreakdown?.length || 1) * 34;
  }
  calculatedItemsHeightPx += 34; // Facade row
  for (const v of structuralVariations) {
    const extraLines = Math.floor(Math.max(0, (v.description || "").length - 45) / 45);
    calculatedItemsHeightPx += 32 + extraLines * 16;
  }
  for (const v of allOtherVariations) {
    const extraLines = Math.floor(Math.max(0, (v.description || "").length - 45) / 45);
    calculatedItemsHeightPx += 32 + extraLines * 16;
  }
  if (homeSpec.includeLandscapePackage) calculatedItemsHeightPx += 34;
  if (homeSpec.promotionDiscountCost > 0) calculatedItemsHeightPx += 32;

  // Trigger overflow continuation whenever content exceeds physical printable border height
  const isPoint4Overflow = calculatedItemsHeightPx > availableBorderHeightPx;

  // Build the complete list of itemised Point 4 detail rows for clean continuation pagination
  interface Point4DetailItem {
    id: string;
    description: React.ReactNode;
    category: string;
    amount: number;
    isStructural?: boolean;
    itemNumber?: number;
    isDiscount?: boolean;
    rowBg?: string;
  }

  const allDetailItems: Point4DetailItem[] = [
    {
      id: "base_house_design",
      description: (
        <div>
          <span className="font-semibold text-slate-900">
            Base House Design — {homeSpec.homeDesign || "Standard Design"} ({homeSpec.inclusionsType})
          </span>
          {homeSpec.standardDesignM2 && homeSpec.modifiedDesignM2 && homeSpec.standardDesignM2 !== homeSpec.modifiedDesignM2 ? (
            <span className="block text-[10.5px] text-slate-600 font-normal mt-0.5">
              Standard Catalog Plan: {homeSpec.standardDesignM2.toFixed(2)} m² &rarr; Modified Construction Plan: {homeSpec.modifiedDesignM2.toFixed(2)} m²
            </span>
          ) : null}
        </div>
      ),
      category: `${(homeSpec.standardDesignM2 || homeSpec.designM2 || 195.4).toFixed(1)} m²`,
      amount: homeSpec.standardBasePrice || homeSpec.baseDesignCost,
      rowBg: "bg-slate-50",
    },
  ];

  if (homeSpec.areaAdjustmentsBreakdown && homeSpec.areaAdjustmentsBreakdown.length > 0) {
    homeSpec.areaAdjustmentsBreakdown.forEach((adj, idx) => {
      allDetailItems.push({
        id: `area_adj_${idx}`,
        description: (
          <div>
            <span className="text-blue-950 font-medium">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1.5"></span>
              Floorplan SQM Adjustment &mdash; {adj.label} ({adj.standardM2.toFixed(2)} m² &rarr; {adj.modifiedM2.toFixed(2)} m²)
            </span>
            {adj.ratePerM2 ? (
              <span className="text-[10px] text-blue-700 ml-1">(@ {formatAud(adj.ratePerM2)}/m²)</span>
            ) : null}
          </div>
        ),
        category: adj.diffM2 > 0 ? `+${adj.diffM2.toFixed(2)} m²` : `${adj.diffM2.toFixed(2)} m²`,
        amount: adj.cost,
        rowBg: "bg-blue-50/40",
      });
    });
  } else if (homeSpec.modifiedDesignM2 && homeSpec.designM2 && Math.abs(homeSpec.modifiedDesignM2 - homeSpec.designM2) > 0.05) {
    allDetailItems.push({
      id: "area_adj_total",
      description: (
        <span className="text-blue-950 font-medium">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1.5"></span>
          Floorplan SQM Adjustment &mdash; Modified Custom Layout ({homeSpec.designM2.toFixed(2)} m² &rarr; {homeSpec.modifiedDesignM2.toFixed(2)} m²)
        </span>
      ),
      category: `${(homeSpec.modifiedDesignM2 - homeSpec.designM2).toFixed(2)} m²`,
      amount: Math.round((homeSpec.modifiedDesignM2 - homeSpec.designM2) * (homeSpec.sqmRate || 1847)),
      rowBg: "bg-blue-50/40",
    });
  }

  allDetailItems.push({
    id: "facade_uplift",
    description: (
      <span className="text-slate-800 font-medium">
        Architectural Facade — {homeSpec.facade || "Standard Facade"} {homeSpec.isCustomFacade ? "(Custom Render / Inspo)" : ""}
      </span>
    ),
    category: "Facade",
    amount: homeSpec.facadeCost || 0,
  });

  structuralVariations.forEach((v) => {
    allDetailItems.push({
      id: `struct_${v.id}`,
      description: (
        <span className="text-slate-900 font-medium">
          <span className="font-mono font-bold text-amber-800 mr-1.5 bg-amber-200/60 px-1.5 py-0.5 rounded border border-amber-300">
            #{v.itemNumber}
          </span>
          {v.description}
        </span>
      ),
      category: `Structural #${v.itemNumber}`,
      amount: v.cost,
      isStructural: true,
      itemNumber: v.itemNumber,
      rowBg: "bg-amber-50/40",
    });
  });

  allOtherVariations.forEach((v) => {
    allDetailItems.push({
      id: `other_${v.id}`,
      description: <span className="text-slate-800 font-medium">{v.description}</span>,
      category: "Inclusion / Site",
      amount: v.cost,
    });
  });

  if (homeSpec.includeLandscapePackage) {
    allDetailItems.push({
      id: "landscape_package",
      description: (
        <span className="font-semibold text-emerald-950 flex items-center gap-1.5">
          <Trees className="h-3.5 w-3.5 text-emerald-600" /> Turnkey Complete Landscape Package
        </span>
      ),
      category: `${land.lotSizeM2 || 450} m² Lot`,
      amount: homeSpec.landscapePackageCost || 0,
      rowBg: "bg-emerald-50/50",
    });
  }

  if (homeSpec.promotionDiscountCost > 0) {
    allDetailItems.push({
      id: "promo_discount",
      description: <span className="text-emerald-900 font-semibold">Special Builder Promotion Discount</span>,
      category: "Discount",
      amount: -homeSpec.promotionDiscountCost,
      isDiscount: true,
      rowBg: "bg-emerald-50/70",
    });
  }

  // Chunk items cleanly across continuation pages so no continuation page ever overflows
  const CHUNK_SIZE = 20;
  const continuationChunks: Point4DetailItem[][] = [];
  if (isPoint4Overflow) {
    for (let i = 0; i < allDetailItems.length; i += CHUNK_SIZE) {
      continuationChunks.push(allDetailItems.slice(i, i + CHUNK_SIZE));
    }
  }
  const continuationPagesCount = continuationChunks.length;
  const totalPages = 5 + continuationPagesCount;

  return (
    <div className="tender-master-pdf-root space-y-8 bg-slate-900/50 p-4 rounded-2xl">
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
          <div className="grid grid-cols-[1fr_1fr_1.35fr_1.65fr] gap-3 text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4">
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
              <strong className="text-slate-900 block truncate">{consultantName}</strong>
              <span className="text-[9.5px] text-slate-600 font-mono block">{consultantPhone}</span>
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-500 block">Display Centre:</span>
              <strong className="text-slate-900 leading-snug block break-words">{consultantDisplayOffice}</strong>
              <span className="text-[9.5px] text-slate-600 truncate block">{consultantEmail}</span>
            </div>
          </div>

          {/* Customer Profile Cards */}
          <div className="mb-4">
            <div className="text-xs font-bold uppercase tracking-wider text-cyan-800 mb-2 flex items-center justify-between">
              <span>1. CUSTOMER / PURCHASER PROFILE</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-cyan-950 bg-cyan-100/80 px-2 py-0.5 rounded border border-cyan-300">
                  Buyer: <strong>{tender.buyerType || "Owner-Occupied"}</strong>
                </span>
                <span className="text-[10px] font-semibold text-emerald-950 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300 uppercase">
                  Lead: <strong>{tender.leadSource || "display home"}</strong>
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 block border-b border-slate-200 pb-1">
                  Primary Purchaser (Customer 1):
                </span>
                <div className="text-sm font-bold text-slate-900">
                  {customer1.title || "Mr"} {customer1.firstName || "—"} {customer1.surname || ""}
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
                      {customer2.title || "Mrs"} {customer2.firstName || "—"} {customer2.surname || ""}
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
              2. PROPOSED LAND &amp; SITE CONDITIONS
            </div>
            <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 space-y-2 text-xs">
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <span className="text-[9px] text-slate-500 block">Build Type:</span>
                  <strong className="text-slate-900 font-bold">{buildType}</strong>
                </div>
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
                    {land.lotSizeM2 ? `${land.lotSizeM2} m²` : "—"} {land.frontageM ? `· ${land.frontageM}m` : ""}
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-slate-200">
                <div className="col-span-2">
                  <span className="text-[9px] text-slate-500 block">Site Street Address:</span>
                  <strong className="text-slate-900">
                    {[land.streetNumber, land.streetName, land.suburb].filter(Boolean).join(" ") || "Address TBA"} {land.council ? `(${land.council})` : ""}
                  </strong>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block">Registration Status:</span>
                  <strong className="text-slate-900">
                    {land.registeredDate?.trim()
                      ? `Un-registered — Expected Rego Date: ${land.registeredDate.trim()}`
                      : "Already Registered"}
                  </strong>
                </div>
              </div>

              {buildType.includes("KDRB") && (
                <div className="pt-1.5 border-t border-slate-200 grid grid-cols-3 gap-2 text-[11px] bg-amber-50/50 p-2 rounded-lg">
                  <div>
                    <span className="text-[9px] text-slate-500 block uppercase font-bold">KDRB Occupancy:</span>
                    <strong>{land.ifKdrOccupancy || "Owner Occupied"}</strong>
                  </div>
                  {land.ifKdrOccupancy === "Tenanted" && (
                    <div className="col-span-2">
                      <span className="text-[9px] text-slate-500 block uppercase font-bold">Tenant Contact:</span>
                      <span>
                        {land.kdrTenantDetails?.name || "Tenant"} &bull; {land.kdrTenantDetails?.phone} &bull; {land.kdrTenantDetails?.accessNotes}
                      </span>
                    </div>
                  )}
                </div>
              )}
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
                <strong className="text-slate-900 text-sm">{homeSpec.homeDesign || "—"}</strong>
              </div>
              <div>
                <span className="text-[9px] uppercase text-slate-500 block">Architectural Facade:</span>
                <strong className="text-slate-900 text-sm">{homeSpec.facade || "—"}</strong>
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

          {/* Full Itemised Estimate Breakdown Table (or Executive Investment Summary if Overflowing) */}
          <div className="mb-2">
            <div className="text-xs font-bold uppercase tracking-wider text-cyan-800 mb-1.5 flex items-center justify-between">
              <span>4. {isPoint4Overflow ? "EXECUTIVE ESTIMATE SUMMARY & INVESTMENT SCHEDULE" : "FULL ITEMISED ESTIMATE BREAKDOWN & INVESTMENT SCHEDULE"}</span>
              <span className="text-[10px] font-normal text-slate-500">
                {isPoint4Overflow ? "High-Level Subtotals · Complete Breakdown Continues on Page 2" : "All Variations, Upgrades & Allowances Included"}
              </span>
            </div>
            <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 text-[9.5px] font-bold uppercase text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-1 px-3 text-left">Item Specification / Selection Description</th>
                  <th className="py-1 px-2.5 text-center w-28">Area / Category</th>
                  <th className="py-1 px-3 text-right w-24">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {/* 1. Base Price Breakdown */}
                <tr className="bg-slate-50">
                  <td className="py-1.5 px-3 font-semibold text-slate-900">
                    Base House Design — {homeSpec.homeDesign || "Standard Design"} ({homeSpec.inclusionsType})
                    <span className="block text-[10px] text-slate-500 font-normal">
                      Standard Catalog Area: {(homeSpec.standardDesignM2 || homeSpec.designM2 || 195.4).toFixed(1)} m²
                    </span>
                  </td>
                  <td className="py-1.5 px-2.5 text-center text-[10.5px] text-slate-600 font-mono">
                    Base
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-950">
                    {formatAud(homeSpec.standardBasePrice || homeSpec.baseDesignCost)}
                  </td>
                </tr>

                {/* 1b. Floorplan SQM Area Adjustments */}
                {(homeSpec.areaAdjustmentsBreakdown && homeSpec.areaAdjustmentsBreakdown.length > 0) || (homeSpec.modifiedDesignM2 && homeSpec.designM2 && Math.abs(homeSpec.modifiedDesignM2 - homeSpec.designM2) > 0.05) ? (
                  <tr className="bg-blue-50/40">
                    <td className="py-1.5 px-3 text-blue-950 font-medium">
                      Floorplan SQM Area Adjustments &amp; Extensions
                      {isPoint4Overflow ? (
                        <span className="block text-[10px] text-blue-700 font-normal">
                          Dimensional room adjustments detailed on Page 2
                        </span>
                      ) : null}
                    </td>
                    <td className="py-1.5 px-2.5 text-center text-[10px] font-mono font-semibold text-blue-800">
                      SQM Adj.
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold text-blue-950">
                      {formatAud(
                        homeSpec.areaAdjustmentsBreakdown?.reduce((sum, a) => sum + a.cost, 0) ??
                        Math.round((homeSpec.modifiedDesignM2! - homeSpec.designM2!) * (homeSpec.sqmRate || 1847))
                      )}
                    </td>
                  </tr>
                ) : null}

                {/* 2. Facade Uplift */}
                <tr>
                  <td className="py-1.5 px-3 text-slate-800 font-medium">
                    Architectural Facade — {homeSpec.facade || "Standard Facade"} {homeSpec.isCustomFacade ? "(Custom Render)" : ""}
                  </td>
                  <td className="py-1.5 px-2.5 text-center text-[10px] text-slate-500 uppercase">
                    Facade
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono text-slate-900 font-medium">
                    {homeSpec.facadeCost > 0 ? formatAud(homeSpec.facadeCost) : "Included"}
                  </td>
                </tr>

                {/* If Overflowing: Show summary rows for Structural & Selections */}
                {isPoint4Overflow ? (
                  <>
                    {structuralVariations.length > 0 && (
                      <tr className="bg-amber-50/40">
                        <td className="py-1.5 px-3 text-slate-900 font-medium">
                          Numbered Structural Modifications Subtotal ({structuralVariations.length} Items Pinned)
                          <span className="block text-[10px] text-amber-800 font-normal">
                            Individual #1–#{structuralVariations.length} specifications itemised on Page 2
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 text-center text-[10px] text-amber-800 font-bold uppercase">
                          Structural
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatAud(structuralVariations.reduce((sum, v) => sum + v.cost, 0))}
                        </td>
                      </tr>
                    )}
                    {allOtherVariations.length > 0 && (
                      <tr>
                        <td className="py-1.5 px-3 text-slate-800 font-medium">
                          Selections, Upgrades &amp; Site Allowances ({allOtherVariations.length} Items)
                          <span className="block text-[10px] text-slate-500 font-normal">
                            Detailed itemised selections listed on Page 2
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 text-center text-[10px] text-cyan-800 uppercase">
                          Inclusions
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono text-slate-900 font-medium">
                          {formatAud(allOtherVariations.reduce((sum, v) => sum + v.cost, 0))}
                        </td>
                      </tr>
                    )}
                  </>
                ) : (
                  /* Standard short list directly on Page 1 when not overflowing */
                  <>
                    {structuralVariations.map((v) => (
                      <tr key={v.id} className="bg-amber-50/40">
                        <td className="py-1.5 px-3 text-slate-900 font-medium">
                          <span className="font-mono font-bold text-amber-800 mr-1.5">#{v.itemNumber}</span>
                          {v.description}
                        </td>
                        <td className="py-1.5 px-2.5 text-center text-[10px] text-amber-800 font-bold uppercase">
                          Structural #{v.itemNumber}
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatAud(v.cost)}
                        </td>
                      </tr>
                    ))}
                    {allOtherVariations.map((v) => (
                      <tr key={v.id}>
                        <td className="py-1.5 px-3 text-slate-800 font-medium">
                          {v.description}
                        </td>
                        <td className="py-1.5 px-2.5 text-center text-[10px] text-cyan-800 uppercase">
                          Inclusion / Site
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono text-slate-900 font-medium">
                          {formatAud(v.cost)}
                        </td>
                      </tr>
                    ))}
                  </>
                )}

                {/* 5. Landscape Package */}
                {homeSpec.includeLandscapePackage && (
                  <tr className="bg-emerald-50/50">
                    <td className="py-1.5 px-3 font-semibold text-emerald-950 flex items-center gap-1.5">
                      <Trees className="h-3.5 w-3.5 text-emerald-600" /> Turnkey Complete Landscape Package
                    </td>
                    <td className="py-1.5 px-2.5 text-center text-[10px] text-emerald-800 uppercase font-bold">
                      {land.lotSizeM2 || 450} m² Lot
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-800">
                      {formatAud(homeSpec.landscapePackageCost || 0)}
                    </td>
                  </tr>
                )}

                {/* 6. Promotion / Discount */}
                {homeSpec.promotionDiscountCost > 0 && (
                  <tr className="bg-emerald-50/70 text-emerald-900 font-semibold">
                    <td className="py-1.5 px-3">Special Builder Promotion Discount</td>
                    <td className="py-1.5 px-2.5 text-center text-[10px] text-emerald-800 uppercase font-bold">Discount</td>
                    <td className="py-1.5 px-3 text-right font-mono text-emerald-700">-{formatAud(homeSpec.promotionDiscountCost)}</td>
                  </tr>
                )}

                {/* Total Row */}
                <tr className="bg-slate-900 text-white font-bold text-sm">
                  <td colSpan={2} className="py-2.5 px-3 uppercase tracking-wider">
                    TOTAL ESTIMATED BUILD INVESTMENT (INC. GST)
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-amber-300">
                    {formatAud(homeSpec.totalBudgetEstimate)}
                  </td>
                </tr>
              </tbody>
            </table>

            {isPoint4Overflow && (
              <div className="mt-2 text-center text-[10px] font-semibold text-cyan-800 bg-cyan-50/80 border border-cyan-200 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5">
                <span>&bull; Due to the comprehensive scope of variations, full itemised specifications continue on <strong>Page 2 (Full Itemised Schedule)</strong> &rarr;</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-500">
          <div>Hudson Homes Pty Ltd · Master Tender Request Specification · NHC: {consultantName} ({consultantDisplayOffice})</div>
          <div className="flex items-center gap-4">
            <div className="border border-slate-400 px-3 py-0.5 text-[9px] font-bold uppercase text-slate-600 rounded">
              CUSTOMER INITIAL
            </div>
            <div className="font-mono">Page 1 of {totalPages}</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 1b / 2: FULL ITEMISED VARIATION & INVESTMENT SCHEDULE (CONTINUED)   */}
      {/* ========================================================================= */}
      {isPoint4Overflow && continuationChunks.map((chunk, chunkIdx) => {
        const isLastChunk = chunkIdx === continuationChunks.length - 1;
        const pageNum = 2 + chunkIdx;
        return (
          <div key={`point4_cont_page_${chunkIdx}`} className="quote-page bg-white min-h-[297mm] p-10 flex flex-col justify-between text-slate-900 shadow-2xl print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always">
            <div>
              {/* Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-4">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight text-slate-950">
                    POINT 4: FULL ITEMISED VARIATION &amp; INVESTMENT SCHEDULE {continuationChunks.length > 1 ? `(PART ${chunkIdx + 1} OF ${continuationChunks.length})` : ""}
                  </h2>
                  <span className="text-xs font-semibold text-cyan-800 uppercase tracking-widest block mt-0.5">
                    Itemised Specification Schedule &bull; {homeSpec.homeDesign || "Home Design"} with {homeSpec.facade || "Facade"} ({homeSpec.inclusionsType})
                  </span>
                </div>
                <div className="text-right text-xs">
                  <div className="font-mono font-bold text-slate-900">Ref: {tender.submissionNumber}</div>
                  <div className="text-slate-500">{customer1.surname || "Client"} Residence</div>
                </div>
              </div>

              {/* Complete Itemised Table Chunk */}
              <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden mb-4">
                <thead className="bg-slate-100 text-[9.5px] font-bold uppercase text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-1.5 px-3 text-left">Detailed Specification / Selection Description</th>
                    <th className="py-1.5 px-2.5 text-center w-28">Category</th>
                    <th className="py-1.5 px-3 text-right w-28">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {chunk.map((item) => (
                    <tr key={item.id} className={item.rowBg || "bg-white"}>
                      <td className="py-2 px-3">{item.description}</td>
                      <td className="py-2 px-2.5 text-center text-[10px] font-mono font-semibold text-slate-600 uppercase">
                        {item.category}
                      </td>
                      <td className={`py-2 px-3 text-right font-mono font-bold ${item.isDiscount ? "text-emerald-700" : "text-slate-950"}`}>
                        {item.isDiscount ? `-${formatAud(Math.abs(item.amount))}` : formatAud(item.amount)}
                      </td>
                    </tr>
                  ))}

                  {/* Grand Total Row on Last Chunk */}
                  {isLastChunk ? (
                    <tr className="bg-slate-900 text-white font-bold text-sm">
                      <td colSpan={2} className="py-2.5 px-3 uppercase tracking-wider">
                        TOTAL ESTIMATED BUILD INVESTMENT (INC. GST)
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-amber-300">
                        {formatAud(homeSpec.totalBudgetEstimate)}
                      </td>
                    </tr>
                  ) : (
                    <tr className="bg-slate-100 text-slate-600 font-semibold text-xs italic">
                      <td colSpan={3} className="py-2 px-3 text-center">
                        Schedule continues on Page {pageNum + 1}...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-500">
              <div>Hudson Homes Pty Ltd · Master Tender Request Specification (Continuation)</div>
              <div className="flex items-center gap-4">
                <div className="border border-slate-400 px-3 py-0.5 text-[9px] font-bold uppercase text-slate-600 rounded">
                  CUSTOMER INITIAL
                </div>
                <div className="font-mono">Page {pageNum} of {totalPages}</div>
              </div>
            </div>
          </div>
        );
      })}

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* PAGE 2: ARCHITECTURAL FACADE RENDER & ORIGINAL CATALOG FLOORPLAN           */}
      {/* ========================================================================= */}
      <div className="quote-page bg-white min-h-[297mm] p-10 flex flex-col justify-between text-slate-900 shadow-2xl print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-3">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-950">
                ARCHITECTURAL FACADE PERSPECTIVE &amp; ORIGINAL CATALOG DESIGN
              </h2>
              <span className="text-xs font-semibold text-cyan-800 uppercase tracking-widest block mt-0.5">
                Exterior Perspective &amp; Standard Catalog Floorplan Drawing &bull; {homeSpec.homeDesign || "Home Design"} with {homeSpec.facade || "Facade"}
              </span>
            </div>
            <div className="text-right text-xs">
              <div className="font-mono font-bold text-slate-900">Ref: {tender.submissionNumber}</div>
              <div className="text-slate-500">{customer1.surname || "Client"} Residence</div>
            </div>
          </div>

          {/* Sized Facade Render (Framed with House Fully Visible) */}
          <div className="border border-slate-300 rounded-2xl overflow-hidden shadow-sm bg-slate-50 p-2 mb-3">
            <div className="relative w-full h-[240px] rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200">
              {homeSpec.facadeRenderUrl ? (
                <img
                  src={homeSpec.facadeRenderUrl}
                  alt={`${homeSpec.facade} Facade`}
                  className="w-full h-full object-contain mx-auto block"
                />
              ) : (
                <div className="text-center text-slate-400 text-sm">
                  <Home className="h-12 w-12 mx-auto mb-1 text-slate-500" />
                  <span>{homeSpec.facade || "Architectural"} Elevation Perspective</span>
                </div>
              )}
            </div>

            {/* Facade Spec Pill */}
            <div className="mt-2 pt-2 border-t border-slate-200 grid grid-cols-3 gap-2 text-xs px-2">
              <div>
                <span className="text-[9px] uppercase text-slate-500 block font-bold">Selected Facade:</span>
                <strong className="text-slate-900 text-xs">{homeSpec.facade || "Standard Facade"}</strong>
                <span className="text-[10px] text-slate-500 block">
                  {homeSpec.facadeCost > 0 ? `+${formatAud(homeSpec.facadeCost)} upgrade` : "Standard Included"}
                </span>
              </div>
              <div>
                <span className="text-[9px] uppercase text-slate-500 block font-bold">Design / Floor Area:</span>
                <strong className="text-slate-900 text-xs">{homeSpec.homeDesign || "Standard Design"}</strong>
                <span className="text-[10px] text-slate-500 block">{homeSpec.designM2 || 195.4} m² Total Area</span>
              </div>
              <div>
                <span className="text-[9px] uppercase text-slate-500 block font-bold">Inclusion Tier:</span>
                <strong className="text-emerald-700 text-xs">{homeSpec.inclusionsType}</strong>
                <span className="text-[10px] text-slate-500 block">Zero Surprises Guarantee</span>
              </div>
            </div>
          </div>

          {/* Original Catalog Architectural Floorplan Underneath */}
          <div className="border border-slate-300 rounded-2xl p-3 bg-white shadow-sm flex flex-col justify-between">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1 mb-2 flex items-center justify-between">
              <span>Original Standard Catalog Floorplan Layout</span>
              <span className="text-[10px] font-normal text-slate-500">Unmodified Base Plan</span>
            </div>
            <div className="min-h-[380px] flex items-center justify-center">
              {homeSpec.originalFloorplanUrl ? (
                <img
                  src={homeSpec.originalFloorplanUrl}
                  alt={`Original ${homeSpec.homeDesign}`}
                  className="w-full h-auto max-h-[380px] object-contain mx-auto block"
                />
              ) : (
                <div className="text-center py-16 text-slate-400 text-xs italic">
                  Standard catalog architectural layout
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-500">
          <div>Hudson Homes Pty Ltd · Architectural Facade Perspective &amp; Original Design</div>
          <div className="flex items-center gap-4">
            <div className="border border-slate-400 px-3 py-0.5 text-[9px] font-bold uppercase text-slate-600 rounded">
              CUSTOMER INITIAL
            </div>
            <div className="font-mono">Page {2 + continuationPagesCount} of {totalPages}</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 3: MODIFIED FLOORPLAN, STRUCTURAL CALLOUTS & VARIATION SCHEDULE      */}
      {/* ========================================================================= */}
      <div className="quote-page bg-white min-h-[297mm] p-10 flex flex-col justify-between text-slate-900 shadow-2xl print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-3">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-amber-800">
                MODIFIED FLOORPLAN &amp; COMPLETE VARIATION SCHEDULE
              </h2>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block mt-0.5">
                Active Client Layout · Numbered Badges &amp; All Selections Together for Drafting
              </span>
            </div>
            <div className="text-right text-xs">
              <div className="font-mono font-bold text-slate-900">Ref: {tender.submissionNumber}</div>
              <div className="text-slate-500">{customer1.surname || "Client"} Residence</div>
            </div>
          </div>

          {/* Floorplan Drawing with Overlaid Draggable Pins */}
          <div className="border-2 border-amber-500/60 rounded-2xl p-4 bg-white shadow-md relative min-h-[380px] flex items-center justify-center mb-4">
            {homeSpec.floorplanUrl ? (
              <div className="relative inline-block max-w-full mx-auto">
                <img
                  src={homeSpec.floorplanUrl}
                  alt={`Modified ${homeSpec.homeDesign}`}
                  className="w-full h-auto max-h-[360px] object-contain mx-auto block"
                />
                {homeSpec.floorplanPins.map((pin) => (
                  <div
                    key={pin.id}
                    style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 h-[16px] w-[16px] rounded-full bg-amber-400/80 text-slate-950 border border-slate-950/80 font-mono font-black text-[8.5px] flex items-center justify-center shadow-xs z-30"
                  >
                    {pin.number}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400 text-xs italic">
                No floorplan drawing loaded
              </div>
            )}
          </div>

          {/* Section A: Numbered Structural Variations (Pure Drafting Specification - No Pricing) */}
          <div className="mb-3">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-1 flex items-center justify-between border-b-2 border-amber-500 pb-1">
              <span>A. NUMBERED STRUCTURAL VARIATIONS (Correlating to Floorplan Badges Above)</span>
              <span className="text-[10px] font-normal text-slate-500">Drafting Specification · {structuralVariations.length} Items Pinned</span>
            </div>

            {structuralVariations.length === 0 ? (
              <div className="py-1 text-slate-400 text-xs italic">Standard architectural layout with no structural modifications.</div>
            ) : (
              <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-[9.5px] font-bold uppercase text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-1 px-2 text-center w-10">#</th>
                    <th className="py-1 px-2.5 text-left">Structural Modification Description (Drafting Specification)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {structuralVariations.map((v) => (
                    <tr key={v.id} className="bg-white">
                      <td className="py-1.5 px-2 text-center font-mono font-bold text-amber-800 text-[10.5px] align-top">
                        #{v.itemNumber}
                      </td>
                      <td className="py-1.5 px-2.5 text-slate-800 font-medium text-[10.5px] leading-snug">
                        {v.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Section B: All Other Variations & Inclusions (Pure Drafting Specification - No Pricing) */}
          <div className="mb-3">
            <div className="text-xs font-bold uppercase tracking-wider text-cyan-800 mb-1 flex items-center justify-between border-b-2 border-cyan-500 pb-1">
              <span>B. ALL OTHER VARIATIONS, INCLUSIONS &amp; SITE SPECIFICATIONS</span>
              <span className="text-[10px] font-normal text-slate-500">Tender Specifications for Drafting</span>
            </div>

            {allOtherVariations.length === 0 && !homeSpec.includeLandscapePackage ? (
              <div className="py-1 text-slate-400 text-xs italic">Standard inclusion specification.</div>
            ) : (
              <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-[9.5px] font-bold uppercase text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-1 px-2.5 text-left">Inclusion / Selection Specification for Drafting</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {homeSpec.includeLandscapePackage && (
                    <tr className="bg-emerald-50/50">
                      <td className="py-1.5 px-2.5 text-emerald-950 font-bold text-[10.5px]">
                        Turnkey Landscape Package (Full Turf, Concrete Driveway, Garden Beds, Fencing, Clothesline &amp; Letterbox based on {land.lotSizeM2 || 450} m² lot)
                      </td>
                    </tr>
                  )}
                  {allOtherVariations.map((v) => (
                    <tr key={v.id} className="bg-white">
                      <td className="py-1.5 px-2.5 text-slate-800 font-medium text-[10.5px] leading-snug">
                        {v.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-500">
          <div>Hudson Homes Pty Ltd · Floorplan Drawing, Structural Callouts &amp; Variation Schedule</div>
          <div className="flex items-center gap-4">
            <div className="border border-slate-400 px-3 py-0.5 text-[9px] font-bold uppercase text-slate-600 rounded">
              CUSTOMER INITIAL
            </div>
            <div className="font-mono">Page {3 + continuationPagesCount} of {totalPages}</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 4: 1:200 SCALE HOUSE SITING PLAN DRAWING                            */}
      {/* ========================================================================= */}
      <div className="quote-page bg-white min-h-[297mm] p-10 flex flex-col justify-between text-slate-900 shadow-2xl print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-4">
            <div>
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-950">
                1:200 SCALE HOUSE SITING PLAN
              </h2>
              <span className="text-xs font-semibold text-cyan-800 uppercase tracking-widest block mt-0.5">
                Proposed Boundary Setbacks &amp; Orientation on Lot {land.lotNo || "TBA"}
              </span>
            </div>
            <div className="text-right text-xs">
              <div className="font-mono font-bold text-slate-900">Ref: {tender.submissionNumber}</div>
              <div className="text-slate-500">Lot {land.lotNo || "TBA"}, {land.streetName || ""} {land.suburb || ""}</div>
            </div>
          </div>

          {/* Full Page Siting Plan Display */}
          <div className="border-2 border-slate-200 rounded-3xl p-6 bg-white shadow-xl flex items-center justify-center min-h-[580px] mb-4">
            {homeSpec.sitingPlanDataUrl ? (
              <img
                src={homeSpec.sitingPlanDataUrl}
                alt="House Siting Plan"
                className="w-full h-auto max-h-[560px] object-contain mx-auto block"
              />
            ) : (
              <div className="text-center py-24 text-slate-400 text-xs">
                <MapPin className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                <span className="font-bold text-slate-600 block">1:200 Scale House Siting Plan</span>
                <p className="text-slate-400 mt-1 max-w-sm mx-auto">
                  Upload the 1:200 Siting Plan PDF in Page 5 (Job Folder) to attach the boundary setback drawing here.
                </p>
              </div>
            )}
          </div>

          {/* Setback Specification Table */}
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 grid grid-cols-4 gap-2 text-xs">
            <div>
              <span className="text-[9px] uppercase text-slate-500 block">Front Boundary:</span>
              <strong className="text-slate-900 font-mono">{homeSpec.setbacks.frontBoundary || "—"}</strong>
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-500 block">Rear Boundary:</span>
              <strong className="text-slate-900 font-mono">{homeSpec.setbacks.rearBoundary || "—"}</strong>
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-500 block">Left Boundary:</span>
              <strong className="text-slate-900 font-mono">{homeSpec.setbacks.leftBoundary || "—"}</strong>
            </div>
            <div>
              <span className="text-[9px] uppercase text-slate-500 block">Right Boundary:</span>
              <strong className="text-slate-900 font-mono">{homeSpec.setbacks.rightBoundary || "—"}</strong>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-500">
          <div>Hudson Homes Pty Ltd · House Siting Plan</div>
          <div className="flex items-center gap-4">
            <div className="border border-slate-400 px-3 py-0.5 text-[9px] font-bold uppercase text-slate-600 rounded">
              CUSTOMER INITIAL
            </div>
            <div className="font-mono">Page {4 + continuationPagesCount} of {totalPages}</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 5: AUTHORITY TO PROCEED (ATP) & AUTHENTICATED SIGNATURES              */}
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
                Preliminary Building Tender Request Form &amp; Digital Authorization
              </span>
            </div>
            <Logo size={10} />
          </div>

          {/* Acknowledgement & Legal Terms */}
          <div className="space-y-2 text-[11px] text-slate-700 leading-relaxed mb-3">
            <p>
              I/We hereby request that a Tender document be produced outlining the cost of constructing my/our new Hudson Home along with all assessed site costs, inclusions, options, upgrades and variations that I/we have selected with our New Home Consultant.
            </p>
            <p>
              I/We provide my/our consent and authority for Hudson Homes to conduct a full and proper site assessment, to obtain a contour survey, to conduct a soil test and to assess any specific covenants or restrictions applicable to our lot.
            </p>
          </div>

          {/* Fee Selection Box */}
          <div className="border border-slate-300 rounded-xl p-3 bg-slate-50 mb-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2 flex items-center justify-between">
              <span>I/We acknowledge a non-refundable charge of:</span>
              <span className="text-[9.5px] uppercase font-black tracking-wider text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded border border-amber-300">
                Non-Refundable &bull; Credited to Deposit
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className={`p-2 rounded-lg border flex items-center gap-2 ${isGreenfield ? "bg-cyan-50 border-cyan-500 font-bold text-cyan-950" : "bg-white border-slate-200 text-slate-700"}`}>
                <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${isGreenfield ? "border-cyan-600 bg-cyan-600 text-white" : "border-slate-400"}`}>
                  {isGreenfield && <Check className="h-3 w-3" />}
                </div>
                <span>$1,650 (inc GST) for Greenfield site</span>
              </div>

              <div className={`p-2 rounded-lg border flex items-center gap-2 ${isPackage ? "bg-cyan-50 border-cyan-500 font-bold text-cyan-950" : "bg-white border-slate-200 text-slate-700"}`}>
                <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${isPackage ? "border-cyan-600 bg-cyan-600 text-white" : "border-slate-400"}`}>
                  {isPackage && <Check className="h-3 w-3" />}
                </div>
                <span>$3,000 (inc GST) for House &amp; Land package</span>
              </div>

              <div className={`p-2 rounded-lg border flex items-center gap-2 ${isKdr ? "bg-cyan-50 border-cyan-500 font-bold text-cyan-950" : "bg-white border-slate-200 text-slate-700"}`}>
                <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${isKdr ? "border-cyan-600 bg-cyan-600 text-white" : "border-slate-400"}`}>
                  {isKdr && <Check className="h-3 w-3" />}
                </div>
                <span>$3,300 (inc GST) for Knock-Down / Duplex</span>
              </div>

              <div className={`p-2 rounded-lg border flex items-center gap-2 ${isCustom ? "bg-cyan-50 border-cyan-500 font-bold text-cyan-950" : "bg-white border-slate-200 text-slate-700"}`}>
                <div className={`h-4 w-4 rounded border flex items-center justify-center ${isCustom ? "border-cyan-600 bg-cyan-600 text-white" : "border-slate-400"}`}>
                  {isCustom && <Check className="h-3 w-3" />}
                </div>
                <span>Plus $800 (inc GST) for Custom Design</span>
              </div>
            </div>
          </div>

          {/* Terms with Non-Refundable, 3-Tender Limit & Deposit Credit Clauses */}
          <div className="space-y-1.5 text-[10px] text-slate-600 mb-2.5 leading-snug bg-amber-50/60 p-2.5 rounded-xl border border-amber-300">
            <p>
              &bull; <strong>Tender Fee Scope &amp; Non-Refundable Policy:</strong> The Tender Fee covers up to <strong>(3) three tenders</strong>. Any additional tender thereafter will incur a <strong>$1,000 fee, payable upfront</strong>. We understand that whilst the Tender Fee is <strong>strictly non-refundable under any circumstances</strong>, it will be <strong>credited towards my/our Building Deposit</strong>.
            </p>
            <p>
              &bull; <strong>Variations &amp; Redesigns:</strong> I/We further acknowledge that any substantial variations or redesigns requested after the issue of the initial Tender may incur <strong>additional administration fees</strong>, which will be advised prior to commencement of such work and are payable in addition to the Tender Fee.
            </p>
            <p>
              &bull; <strong>Fixed Price Guarantee:</strong> Tender is valid for <strong>270 days (9 months)</strong> from issue date and must be accepted within 10 days of issue with payment of the <strong>${atp.tenderAcceptanceFee.toLocaleString()} Tender Acceptance Fee</strong>.
            </p>
            <p>
              &bull; <strong>5% Building Contract Deposit Crediting:</strong> Once the tender is accepted and the formal Building Contract is prepared, the 5% contract deposit will be credited with both the 1st deposit (Preliminary Tender Fee) and 2nd deposit (Tender Acceptance Fee) already paid.
            </p>
          </div>

          {/* Signatures Grid */}
          <div className="border border-slate-300 rounded-xl p-3 bg-slate-50 mb-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2 flex items-center justify-between">
              <span>AUTHENTICATED DIGITAL SIGNATURES</span>
              <span className="text-[10px] text-emerald-700 font-mono flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Digitally Authenticated
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
                  <span>Print: <strong>{atp.client1Name || `${customer1.firstName} ${customer1.surname}`.trim() || "Client 1"}</strong></span>
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
                  <span>Print: <strong>{hasCustomer2 ? atp.client2Name || `${customer2.firstName} ${customer2.surname}`.trim() || "Client 2" : "N/A"}</strong></span>
                  <span>Date: <strong>{hasCustomer2 ? atp.client2SignatureDate : "—"}</strong></span>
                </div>
              </div>
            </div>

            {/* Consultant Signature */}
            <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-[9px] text-slate-500 uppercase block font-bold">New Home Consultant:</span>
                <strong className="text-slate-900">{consultantName}</strong>
                <span className="text-[10px] text-slate-500 block">{consultantDisplayOffice} {consultantPhone ? `· ${consultantPhone}` : ""}</span>
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
            <div className="font-mono">Page {5 + continuationPagesCount} of {totalPages}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
