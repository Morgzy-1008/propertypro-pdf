import React, { useState } from "react";
import {
  Building2,
  Copy,
  Check,
  CreditCard,
  ShieldCheck,
  ExternalLink,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Logo } from "@/components/flyer/FlyerTemplates";
import { Button } from "@/components/ui/button";
import { formatAud } from "@/lib/pricing";

export interface EftPaymentDetails {
  accountName: string;
  bsb: string;
  accountNumber: string;
  reference: string;
  amount: number;
  bankName?: string;
  quoteNumber?: string;
  clientName?: string;
}

interface EftPaymentPortalProps {
  details: EftPaymentDetails;
}

export function EftPaymentPortal({ details }: EftPaymentPortalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2500);
  };

  const cleanBsb = details.bsb.replace(/\D/g, "");
  const formattedBsb = cleanBsb.length === 6 ? `${cleanBsb.slice(0, 3)} ${cleanBsb.slice(3)}` : details.bsb;
  const cleanAcc = details.accountNumber.replace(/\D/g, "");

  const fullCopyText = [
    `Hudson Homes EFT Payment Details:`,
    `Account Name: ${details.accountName}`,
    `Bank: ${details.bankName || "National Australia Bank (NAB)"}`,
    `BSB: ${formattedBsb}`,
    `Account Number: ${details.accountNumber}`,
    `Amount: $${details.amount.toLocaleString("en-AU", { minimumFractionDigits: 2 })}`,
    `Payment Reference: ${details.reference}`,
  ].join("\n");

  const fields = [
    {
      key: "amount",
      label: "Deposit Amount",
      displayValue: `$${details.amount.toLocaleString("en-AU", { minimumFractionDigits: 2 })}`,
      copyValue: details.amount.toString(),
      highlight: true,
      hint: "Enter exact deposit amount in your bank transfer",
    },
    {
      key: "name",
      label: "Account Name",
      displayValue: details.accountName,
      copyValue: details.accountName,
      hint: "Official Hudson Homes entity",
    },
    {
      key: "bsb",
      label: "BSB Number",
      displayValue: formattedBsb,
      copyValue: cleanBsb || details.bsb,
      hint: "6-digit bank state branch code",
    },
    {
      key: "acc",
      label: "Account Number",
      displayValue: details.accountNumber,
      copyValue: cleanAcc || details.accountNumber,
      hint: "NAB builder account",
    },
    {
      key: "ref",
      label: "Payment Reference (Required)",
      displayValue: details.reference,
      copyValue: details.reference,
      highlight: true,
      hint: "Crucial: Identifies your file and deposit immediately",
    },
    {
      key: "bank",
      label: "Financial Institution",
      displayValue: details.bankName || "National Australia Bank (NAB)",
      copyValue: details.bankName || "National Australia Bank",
      hint: "Australian registered bank",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-slate-950 font-sans">
      {/* Top Brand Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-30 px-4 py-3 sm:px-6">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Logo size={12} />
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-800/60">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Verified Builder Account</span>
          </div>
        </div>
      </header>

      {/* Main Payment Container */}
      <main className="max-w-xl w-full mx-auto p-4 sm:p-6 space-y-6 my-auto">
        {/* Title Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 text-xs font-bold uppercase tracking-wider">
            <CreditCard className="h-3.5 w-3.5" />
            Initial Tender Deposit
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            EFT Bank Transfer Details
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Tap the copy buttons below to paste each line directly into your mobile banking app.
          </p>
        </div>

        {/* Highlighted Amount Callout Card */}
        <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-slate-900/90 to-slate-900 p-5 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider block">
                Required Deposit Amount
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono mt-1">
                ${details.amount.toLocaleString("en-AU", { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Preliminary investigation, soil test &amp; architectural draft allocation
              </span>
            </div>
            <Button
              size="sm"
              onClick={() => handleCopy(details.amount.toString(), "amount-top")}
              className="bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 text-xs gap-1.5 shadow-lg flex-none"
            >
              {copiedKey === "amount-top" ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Amount
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 1-Click Copy Fields */}
        <div className="space-y-3">
          {fields.map((f) => {
            const isCopied = copiedKey === f.key;
            return (
              <div
                key={f.key}
                className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  f.highlight
                    ? "border-cyan-500/50 bg-slate-900/90 shadow-lg ring-1 ring-cyan-500/20"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                }`}
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {f.label}
                    </span>
                    {f.highlight && (
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                        Key
                      </span>
                    )}
                  </div>
                  <div className="text-base sm:text-lg font-bold text-white font-mono tracking-tight truncate">
                    {f.displayValue}
                  </div>
                  {f.hint && <div className="text-[10px] text-slate-500">{f.hint}</div>}
                </div>

                <Button
                  size="sm"
                  variant={isCopied ? "default" : "outline"}
                  onClick={() => handleCopy(f.copyValue, f.key)}
                  className={`h-9 px-3.5 text-xs font-bold gap-1.5 flex-none transition-all ${
                    isCopied
                      ? "bg-cyan-500 text-slate-950 hover:bg-cyan-400 border-transparent shadow-md"
                      : "border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-400" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Copy All Details Button */}
        <Button
          onClick={() => handleCopy(fullCopyText, "all")}
          className="w-full py-6 text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-xl gap-2 shadow-xl"
        >
          {copiedKey === "all" ? (
            <>
              <Check className="h-4 w-4 text-emerald-400" />
              All Banking Details Copied to Clipboard!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 text-cyan-400" />
              Copy Complete Transfer Details
            </>
          )}
        </Button>

        {/* 3-Step Simple Mobile Guide */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-cyan-400" />
            Quick 3-Step Transfer Guide
          </div>
          <div className="space-y-2.5 text-xs text-slate-400">
            <div className="flex items-start gap-2.5">
              <span className="flex-none h-5 w-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-[11px] font-mono">
                1
              </span>
              <span>
                Tap <strong className="text-slate-200">Copy</strong> on the BSB, Account Number, and Reference above.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="flex-none h-5 w-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-[11px] font-mono">
                2
              </span>
              <span>
                Open your Mobile Banking App (<em className="text-slate-300">CommBank, NAB, ANZ, Westpac, Suncorp, etc.</em>) and choose <strong className="text-slate-200">Pay Anyone / Transfer</strong>.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="flex-none h-5 w-5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold flex items-center justify-center text-[11px] font-mono">
                3
              </span>
              <span>
                Paste the details, enter the deposit amount, and confirm payment.
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 px-4 text-center text-xs text-slate-500 space-y-1">
        <div>Hudson Homes Pty Ltd · ABN 49 163 189 071 · Builder Licence 259372C</div>
        <div className="text-[11px] text-slate-600">Zero Surprises Guarantee · National Australia Bank Trust Account</div>
      </footer>
    </div>
  );
}
