import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  Phone,
  Mail,
  Send,
  Building,
  Home,
  DollarSign,
  ShieldCheck,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatAud } from "@/lib/pricing";
import { Logo } from "@/components/flyer/FlyerTemplates";
import { calculateQuotePricing } from "@/lib/quoting/quoteEngine";
import { saveQuote } from "@/lib/quoting/quoteStorage";
import type { FullQuote } from "@/lib/quoting/quoteTypes";

interface ClientQuoteReviewProps {
  initialQuote: FullQuote;
}

export function ClientQuoteReview({ initialQuote }: ClientQuoteReviewProps) {
  const [quote, setQuote] = useState<FullQuote>(initialQuote);
  const [clientNotes, setClientNotes] = useState(quote.clientNotes || "");
  const [submitted, setSubmitted] = useState(quote.status === "client_reviewed");

  const toggleUpgrade = (itemId: string) => {
    const updatedLineItems = quote.lineItems.map((item) => {
      if (item.id === itemId && item.isClientSelectable) {
        const nextState = item.clientSelected === false ? true : false;
        return {
          ...item,
          clientSelected: nextState,
          isIncluded: nextState,
        };
      }
      return item;
    });

    const updatedPricing = calculateQuotePricing(
      quote.design,
      quote.siteConditions,
      updatedLineItems,
      quote.client.depositAmount,
    );

    const updated: FullQuote = {
      ...quote,
      lineItems: updatedLineItems,
      pricing: updatedPricing,
    };

    setQuote(updated);
    saveQuote(updated);
  };

  const handleSubmitSelections = () => {
    const updated: FullQuote = {
      ...quote,
      clientNotes,
      status: "client_reviewed",
      updatedAt: new Date().toISOString(),
    };
    setQuote(updated);
    saveQuote(updated);
    setSubmitted(true);
    toast.success("Your selections have been submitted to your Hudson Homes Sales Consultant!");
  };

  const clientSelectableItems = quote.lineItems.filter((i) => i.isClientSelectable && i.unitRate > 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-brand-gold/30 relative overflow-hidden flex flex-col">
      {/* Ambient Glow */}
      <div className="ambient-glow-gold h-96 w-96 -top-20 -right-20 pointer-events-none" />
      <div className="ambient-glow-cyan h-96 w-96 -bottom-20 -left-20 pointer-events-none" />

      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo light size={11} />
          <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/60 px-3 py-1.5 rounded-full border border-slate-700/60">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Interactive Client Collaboration Portal</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-10 w-full flex-1 space-y-8 relative z-10">
        {/* Welcome Card */}
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 p-6 sm:p-8 shadow-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
            <Sparkles className="h-3.5 w-3.5" /> Builders Estimate #{quote.quoteNumber} (14-Day Validity)
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Hello, {quote.client.clientName || "Valued Client"}
          </h1>
          <p className="mt-2 text-sm text-slate-400 max-w-2xl leading-relaxed">
            Review your custom home estimate for{" "}
            <span className="text-slate-200 font-semibold">
              {[quote.client.siteAddress, quote.client.estate, quote.client.suburb].filter(Boolean).join(", ") || "your proposed building site"}
            </span>
            . Customize your optional upgrade packages below to see live pricing updates.
          </p>

          <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Design Model:</span>
              <span className="font-bold text-white text-sm">
                {quote.design.mode === "standard" ? quote.design.designName : "Custom Floorplan"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Total Area:</span>
              <span className="font-bold text-white text-sm">
                {quote.design.designM2} m²
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Facade Style:</span>
              <span className="font-bold text-white text-sm">{quote.design.facadeName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Estimated Investment:</span>
              <span className="font-bold text-emerald-400 text-sm">
                {formatAud(quote.pricing.grossEstimatedInvestment)}
              </span>
            </div>
          </div>
        </div>

        {/* Upgrades Checklist */}
        {clientSelectableItems.length > 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                Customise Optional Variations &amp; Upgrades
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Select or deselect packages to tailor your building contract to your exact budget.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clientSelectableItems.map((item) => {
                const isSelected = item.clientSelected !== false && item.isIncluded;
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleUpgrade(item.id)}
                    className={`rounded-xl border p-4 cursor-pointer transition-all ${
                      isSelected
                        ? "border-emerald-500/80 bg-slate-900/90 ring-1 ring-emerald-500/40 shadow-lg shadow-emerald-950/30"
                        : "border-slate-800 bg-slate-900/40 opacity-70 hover:opacity-100 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="h-4 w-4 accent-emerald-500 rounded cursor-pointer"
                          />
                          <span className="font-bold text-sm text-white truncate">{item.name}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      <div className="text-right flex-none">
                        <span className="text-sm font-bold text-emerald-400">
                          {item.unitRate === 0 ? "Included" : `+${formatAud(item.quantity * item.unitRate)}`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Live Total & Submission */}
        <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-950 p-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">
                Total Estimated Builders Investment:
              </span>
              <div className="text-3xl font-extrabold text-white mt-1 bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
                {formatAud(quote.pricing.grossEstimatedInvestment)}
              </div>
              <span className="text-xs text-slate-400">Preliminary Builders Estimate (14-day validity) · Inclusive of 10% GST</span>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-400 block">Sales Consultant:</span>
              <span className="font-bold text-white text-sm">{quote.client.consultantName}</span>
              <span className="text-xs text-slate-400 block">{quote.client.consultantPhone}</span>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Have questions or custom requests for your consultant?
              </label>
              <Textarea
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                placeholder="Type any questions or requested layout alterations here..."
                rows={3}
                className="border-slate-800 bg-slate-950/80 text-xs text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-400">
                {submitted
                  ? "✓ Your selections have been registered with your sales consultant."
                  : "Click below to send your chosen upgrade package back to your consultant."}
              </div>

              <Button
                onClick={handleSubmitSelections}
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold hover:from-emerald-400 text-xs gap-2 shadow-md shadow-emerald-500/20"
              >
                <Send className="h-3.5 w-3.5" />
                {submitted ? "Update My Selections" : "Submit My Selected Upgrades"}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
