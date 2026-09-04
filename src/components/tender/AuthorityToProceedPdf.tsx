import React from "react";
import { Logo } from "@/components/flyer/FlyerTemplates";
import { formatAud } from "@/lib/pricing";
import type { TenderSubmission } from "@/lib/tender/tenderTypes";
import { Check, CheckCircle2, ShieldCheck } from "lucide-react";

interface AuthorityToProceedPdfProps {
  tender: TenderSubmission;
}

export function AuthorityToProceedPdf({ tender }: AuthorityToProceedPdfProps) {
  const { customer1, customer2, hasCustomer2, atp, land, homeSpec } = tender;

  const isGreenfield = atp.feeType === "greenfield_1650";
  const isKdr = atp.feeType === "kdr_duplex_3300";
  const isPackage = atp.feeType === "package_3000";
  const isCustom = atp.isCustomDesignAddon || atp.feeType === "custom_design_800";

  return (
    <div className="quote-page bg-white min-h-[297mm] p-10 flex flex-col justify-between text-slate-900 shadow-2xl print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always">
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold uppercase tracking-tight text-slate-950 font-sans">
              AUTHORITY TO PROCEED
            </h1>
            <span className="text-sm font-light text-slate-500 block uppercase tracking-widest mt-0.5">
              Preliminary Building Tender Request Form
            </span>
          </div>
          <Logo size={10} />
        </div>

        {/* Introduction Statements */}
        <div className="space-y-2 text-xs leading-relaxed text-slate-700 mb-3.5">
          <p>
            I/We hereby request that a Tender document be produced outlining the cost of constructing my/our new Hudson Home along with all assessed site costs, inclusions, options, upgrades and variations that I/we have selected with our New Home Consultant.
          </p>
          <p>
            I/We provide my/our consent and authority for Hudson Homes to conduct a full and proper site assessment, to obtain a contour survey, to conduct a soil test and to assess any specific covenants, restrictions or requirements applicable to the construction of my/our new home.
          </p>
        </div>

        {/* Fee Selection Box */}
        <div className="border border-slate-300 rounded-xl p-3.5 bg-slate-50 mb-3.5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2.5 flex items-center justify-between">
            <span>I/We acknowledge a non-refundable charge of (tick applicable):</span>
            <span className="text-[9.5px] uppercase font-black tracking-wider text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded border border-amber-300">
              Strictly Non-Refundable &bull; Credited to Deposit
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className={`p-2.5 rounded-lg border flex items-center gap-2.5 ${isGreenfield ? "bg-cyan-50/80 border-cyan-500 font-bold text-cyan-950" : "bg-white border-slate-200 text-slate-700"}`}>
              <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${isGreenfield ? "border-cyan-600 bg-cyan-600 text-white" : "border-slate-400"}`}>
                {isGreenfield && <Check className="h-3 w-3" />}
              </div>
              <span>$1,650 (inc GST) for Greenfield site</span>
            </div>

            <div className={`p-2.5 rounded-lg border flex items-center gap-2.5 ${isPackage ? "bg-cyan-50/80 border-cyan-500 font-bold text-cyan-950" : "bg-white border-slate-200 text-slate-700"}`}>
              <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${isPackage ? "border-cyan-600 bg-cyan-600 text-white" : "border-slate-400"}`}>
                {isPackage && <Check className="h-3 w-3" />}
              </div>
              <span>$3,000 (inc GST) for House &amp; Land packages</span>
            </div>

            <div className={`p-2.5 rounded-lg border flex items-center gap-2.5 ${isKdr ? "bg-cyan-50/80 border-cyan-500 font-bold text-cyan-950" : "bg-white border-slate-200 text-slate-700"}`}>
              <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${isKdr ? "border-cyan-600 bg-cyan-600 text-white" : "border-slate-400"}`}>
                {isKdr && <Check className="h-3 w-3" />}
              </div>
              <span>$3,300 (inc GST) for Knock-Down, Rebuild &amp; Duplex site</span>
            </div>

            <div className={`p-2.5 rounded-lg border flex items-center gap-2.5 ${isCustom ? "bg-cyan-50/80 border-cyan-500 font-bold text-cyan-950" : "bg-white border-slate-200 text-slate-700"}`}>
              <div className={`h-4 w-4 rounded border flex items-center justify-center ${isCustom ? "border-cyan-600 bg-cyan-600 text-white" : "border-slate-400"}`}>
                {isCustom && <Check className="h-3 w-3" />}
              </div>
              <span>Plus $800 (inc GST) for Custom Design</span>
            </div>
          </div>

          <div className="mt-2.5 text-[10.5px] text-slate-600 leading-snug bg-white p-2.5 rounded-lg border border-slate-200">
            <strong>Tender Fee Scope &amp; Non-Refundable Policy:</strong> The preliminary charge is payable for the cost of producing the Tender and includes obtaining a contour survey and bore holes for soil testing where necessary. The Tender Fee covers up to <strong>(3) three tenders</strong>. Any additional tender thereafter will incur a <strong>$1,000 fee, payable upfront</strong>. We understand that whilst the Tender Fee is <strong>strictly non-refundable under any circumstances</strong>, it will be <strong>credited towards my/our Building Deposit</strong> upon building contract signing.
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="space-y-2.5 text-xs text-slate-700 mb-3.5">
          <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/80 text-[10.5px] text-slate-700 leading-snug">
            <strong>Substantial Variations &amp; Redesigns:</strong> I/We further acknowledge that any substantial variations or redesigns requested after the issue of the initial Tender may incur <strong>additional administration fees</strong>, which will be advised prior to commencement of such work and are payable in addition to the Tender Fee.
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="border-l-2 border-cyan-700 pl-3">
              <h4 className="font-bold text-slate-900 text-[11px] uppercase tracking-wide">
                For Registered / Unregistered Land:
              </h4>
              <p className="text-[10px] text-slate-600 mt-0.5 leading-snug">
                Must be accepted within 10 days of issue. Valid for <strong>270 days (9 months)</strong> from date of issue (&ldquo;Fixed Price Guarantee Date&rdquo;). Upon acceptance, a non-refundable Tender Acceptance Fee of <strong>$4,400 (inc. GST)</strong> is payable, credited towards my/our Building Deposit.
              </p>
            </div>

            <div className="border-l-2 border-slate-700 pl-3">
              <h4 className="font-bold text-slate-900 text-[11px] uppercase tracking-wide">
                For Knock-Down, Rebuild &amp; Duplex:
              </h4>
              <p className="text-[10px] text-slate-600 mt-0.5 leading-snug">
                Must be accepted within 10 days of issue. Valid for <strong>270 days (9 months)</strong> from date of issue. Upon acceptance, a non-refundable Tender Acceptance Fee of <strong>$6,600 (inc. GST)</strong> is payable, credited towards my/our Building Deposit.
              </p>
            </div>
          </div>
        </div>

        {/* Signatures & Execution Section */}
        <div className="border border-slate-300 rounded-xl p-3.5 bg-slate-50 mb-3.5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3 flex items-center justify-between">
            <span>CLIENT &amp; CONSULTANT SIGNATURES</span>
            <span className="text-[10px] text-emerald-700 font-mono font-normal flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Digitally Authenticated
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            {/* Client 1 Signature */}
            <div className="space-y-1 bg-white p-3 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Primary Applicant (Client 1):</span>
              <div className="h-14 border border-dashed border-slate-300 rounded flex items-center justify-center bg-slate-50/50 overflow-hidden">
                {atp.client1SignatureDataUrl ? (
                  <img src={atp.client1SignatureDataUrl} alt="Client 1 Signature" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-slate-400 font-serif italic text-sm">
                    {atp.client1Signed ? atp.client1Name || "Signed Electronically" : "Signature Pending"}
                  </span>
                )}
              </div>
              <div className="flex justify-between text-[11px] pt-1">
                <span>Print: <strong>{atp.client1Name || `${customer1.firstName} ${customer1.surname}`}</strong></span>
                <span>Date: <strong>{atp.client1SignatureDate}</strong></span>
              </div>
            </div>

            {/* Client 2 Signature */}
            <div className="space-y-1 bg-white p-3 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Secondary Applicant (Client 2):</span>
              <div className="h-14 border border-dashed border-slate-300 rounded flex items-center justify-center bg-slate-50/50 overflow-hidden">
                {atp.client2SignatureDataUrl ? (
                  <img src={atp.client2SignatureDataUrl} alt="Client 2 Signature" className="max-h-full max-w-full object-contain" />
                ) : hasCustomer2 ? (
                  <span className="text-slate-400 font-serif italic text-sm">
                    {atp.client2Signed ? atp.client2Name || "Signed Electronically" : "Signature Pending"}
                  </span>
                ) : (
                  <span className="text-slate-400 text-xs">N/A (Single Applicant)</span>
                )}
              </div>
              <div className="flex justify-between text-[11px] pt-1">
                <span>Print: <strong>{hasCustomer2 ? atp.client2Name || `${customer2.firstName} ${customer2.surname}` : "N/A"}</strong></span>
                <span>Date: <strong>{hasCustomer2 ? atp.client2SignatureDate : "—"}</strong></span>
              </div>
            </div>
          </div>

          {/* Consultant Signature */}
          <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">New Home Consultant:</span>
              <span className="font-bold text-slate-900">{tender.newHomeConsultant || "Morgan Hales"}</span>
              <span className="text-[10px] text-slate-500 block">{tender.displayOffice} · {tender.consultantPhone}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Signed &amp; Verified:</span>
              <span className="font-mono font-bold text-slate-900">{tender.tenderRequestDate}</span>
              <span className="text-[10px] text-emerald-600 block">Status: Tender Active</span>
            </div>
          </div>
        </div>

        {/* Payment Remittance Section */}
        <div className="border border-slate-300 rounded-xl p-3 bg-slate-50 text-xs">
          <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
            <span>EFT PAYMENT REMITTANCE DETAILS</span>
            <span className="text-cyan-800 font-mono">Amount Payable: {formatAud(atp.feeAmount)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-700 bg-white p-2 rounded border border-slate-200">
            <div><strong>Bank:</strong> National Australia Bank (NAB)</div>
            <div><strong>Account Name:</strong> Hudson Homes (QLD) Pty Ltd</div>
            <div><strong>BSB:</strong> 082 - 778</div>
            <div><strong>Account No:</strong> 74-586-5607</div>
            <div className="col-span-2"><strong>Remittance Reference:</strong> <span className="font-mono font-bold text-slate-900">{atp.eftReference}</span></div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-500">
        <div>Hudson Homes Pty Ltd · ABN: 49 163 189 071 · Builder&apos;s Licence: 259372C</div>
        <div className="flex items-center gap-4">
          <div className="border border-slate-400 px-3 py-0.5 text-[9px] font-bold uppercase text-slate-600 rounded">
            CUSTOMER INITIAL
          </div>
          <div className="font-mono">Authority to Proceed · Page 1 of 1</div>
        </div>
      </div>
    </div>
  );
}
