import React, { useState } from "react";
import { User, Phone, Mail, MapPin, Building, Sparkles, ArrowRight, PlusCircle, Check, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { FullQuote } from "@/lib/quoting/quoteTypes";
import { QUICK_QUOTE_TEMPLATES, type QuickQuoteTemplate } from "./V2Types";
import { toast } from "sonner";

interface V2StepClientProps {
  client: FullQuote["client"];
  onChange: (patch: Partial<FullQuote["client"]>) => void;
  onApplyTemplate?: (template: QuickQuoteTemplate) => void;
  onNext: () => void;
  isLight: boolean;
}

export function V2StepClient({
  client,
  onChange,
  onApplyTemplate,
  onNext,
  isLight,
}: V2StepClientProps) {
  const [showClient2, setShowClient2] = useState(Boolean(client.hasClient2));

  const handleQuickDemo = () => {
    onChange({
      clientName: "David & Sarah Miller",
      clientPhone: "0412 345 678",
      clientEmail: "david.miller@example.com.au",
      siteAddress: "42 Sanctuary Boulevard",
      suburb: "North Lakes",
      estate: "The Sanctuary",
      lotNumber: "Lot 108",
      hasClient2: true,
      client2Name: "Sarah Miller",
      client2Phone: "0423 456 789",
      client2Email: "sarah.miller@example.com.au",
    });
    setShowClient2(true);
    toast.success("Loaded demo client: David & Sarah Miller (North Lakes)");
  };

  const handleContinue = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!client.clientName || client.clientName.trim().length === 0) {
      toast.error("Please enter a client name to continue");
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Prompt */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/50 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs">
              1
            </span>
            <span className="text-xs uppercase tracking-wider font-bold text-emerald-400">Step 1 of 6</span>
          </div>
          <h2 className={`text-2xl font-bold mt-1 ${isLight ? "text-slate-900" : "text-white"}`}>
            Who is this estimate for?
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Enter your client's contact details and land address to personalize their quote.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleQuickDemo}
            className={`text-xs gap-1.5 font-medium ${
              isLight
                ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            Quick Demo Client
          </Button>
        </div>
      </div>

      {/* 1-Click Fast Start Bundles */}
      {onApplyTemplate && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? "text-slate-600" : "text-slate-400"}`}>
              ⚡ 1-Click Express Quote Bundles (Fast Start)
            </span>
            <span className="text-[10px] text-slate-400">Pre-populates design, inclusions &amp; site package</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {QUICK_QUOTE_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => onApplyTemplate(tmpl)}
                className={`p-3.5 rounded-2xl border text-left transition-all hover:scale-[1.01] cursor-pointer group ${
                  isLight
                    ? "bg-slate-50 hover:bg-emerald-50/50 border-slate-200 hover:border-emerald-400 shadow-xs"
                    : "bg-slate-900/60 hover:bg-slate-900 border-slate-800 hover:border-emerald-500/50 shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400">
                    {tmpl.badge}
                  </span>
                  <Zap className="h-3.5 w-3.5 text-emerald-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className={`text-xs font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                  {tmpl.name}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                  {tmpl.tagline}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleContinue} className="space-y-6">
        {/* Primary Client Card */}
        <div
          className={`p-6 rounded-2xl border transition-all ${
            isLight
              ? "bg-white border-slate-200 shadow-sm"
              : "bg-slate-900/60 border-slate-800/80 backdrop-blur-md"
          }`}
        >
          <div className="flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-emerald-400" />
            <h3 className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-200"}`}>
              Primary Client Information
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-1.5">
              <Label className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                Client Full Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                autoFocus
                placeholder="e.g. John & Jane Smith"
                value={client.clientName || ""}
                onChange={(e) => onChange({ clientName: e.target.value })}
                className={`text-sm h-11 ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-emerald-600"
                    : "bg-slate-950/80 border-slate-800 text-white focus:border-emerald-500"
                }`}
              />
            </div>

            <div className="space-y-1.5">
              <Label className={`text-xs font-semibold flex items-center gap-1.5 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                <Phone className="h-3 w-3 text-slate-400" /> Contact Phone
              </Label>
              <Input
                type="tel"
                placeholder="e.g. 0412 345 678"
                value={client.clientPhone || ""}
                onChange={(e) => onChange({ clientPhone: e.target.value })}
                className={`text-sm h-11 ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                    : "bg-slate-950/80 border-slate-800 text-white"
                }`}
              />
            </div>

            <div className="space-y-1.5">
              <Label className={`text-xs font-semibold flex items-center gap-1.5 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                <Mail className="h-3 w-3 text-slate-400" /> Email Address
              </Label>
              <Input
                type="email"
                placeholder="e.g. john.smith@example.com"
                value={client.clientEmail || ""}
                onChange={(e) => onChange({ clientEmail: e.target.value })}
                className={`text-sm h-11 ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                    : "bg-slate-950/80 border-slate-800 text-white"
                }`}
              />
            </div>
          </div>
        </div>

        {/* Land / Site Location Card */}
        <div
          className={`p-6 rounded-2xl border transition-all ${
            isLight
              ? "bg-white border-slate-200 shadow-sm"
              : "bg-slate-900/60 border-slate-800/80 backdrop-blur-md"
          }`}
        >
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-4 w-4 text-cyan-400" />
            <h3 className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-200"}`}>
              Proposed Site / Property Location
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>Street Address</Label>
              <Input
                placeholder="e.g. 24 Bottletree Circuit"
                value={client.siteAddress || ""}
                onChange={(e) => onChange({ siteAddress: e.target.value })}
                className={`text-sm h-11 ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                    : "bg-slate-950/80 border-slate-800 text-white"
                }`}
              />
            </div>

            <div className="space-y-1.5">
              <Label className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>Suburb / Postcode</Label>
              <Input
                placeholder="e.g. Narangba QLD 4504"
                value={client.suburb || ""}
                onChange={(e) => onChange({ suburb: e.target.value })}
                className={`text-sm h-11 ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                    : "bg-slate-950/80 border-slate-800 text-white"
                }`}
              />
            </div>

            <div className="space-y-1.5">
              <Label className={`text-xs font-semibold flex items-center gap-1.5 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                <Building className="h-3 w-3 text-slate-400" /> Estate Name (Optional)
              </Label>
              <Input
                placeholder="e.g. Ridgeview Estate"
                value={client.estate || ""}
                onChange={(e) => onChange({ estate: e.target.value })}
                className={`text-sm h-11 ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                    : "bg-slate-950/80 border-slate-800 text-white"
                }`}
              />
            </div>

            <div className="space-y-1.5">
              <Label className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>Lot Number (Optional)</Label>
              <Input
                placeholder="e.g. Lot 412"
                value={client.lotNumber || ""}
                onChange={(e) => onChange({ lotNumber: e.target.value })}
                className={`text-sm h-11 ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                    : "bg-slate-950/80 border-slate-800 text-white"
                }`}
              />
            </div>
          </div>
        </div>

        {/* Secondary Co-Borrower Toggle & Continue */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              const nextVal = !showClient2;
              setShowClient2(nextVal);
              onChange({ hasClient2: nextVal });
            }}
            className={`text-xs gap-1.5 self-start sm:self-center ${isLight ? "text-slate-600 hover:text-slate-900" : "text-slate-400 hover:text-slate-200"}`}
          >
            <PlusCircle className="h-3.5 w-3.5 text-emerald-400" />
            {showClient2 ? "Remove Co-Client Details" : "+ Add Second Client / Co-Borrower"}
          </Button>

          <Button
            type="submit"
            size="lg"
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold px-8 shadow-lg shadow-emerald-500/20 gap-2 cursor-pointer h-12"
          >
            Continue to Floor Plan
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Second Client Expanded Box */}
        {showClient2 && (
          <div
            className={`p-6 rounded-2xl border transition-all animate-in fade-in-50 duration-200 ${
              isLight
                ? "bg-slate-50 border-slate-200"
                : "bg-slate-900/40 border-slate-800/60"
            }`}
          >
            <div className="flex items-center gap-2 mb-4">
              <User className="h-4 w-4 text-emerald-400" />
              <h4 className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-300"}`}>
                Co-Client / Partner Details
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>Full Name</Label>
                <Input
                  placeholder="e.g. Jane Smith"
                  value={client.client2Name || ""}
                  onChange={(e) => onChange({ client2Name: e.target.value })}
                  className={`text-sm h-10 ${
                    isLight
                      ? "bg-white border-slate-300 text-slate-900"
                      : "bg-slate-950/80 border-slate-800 text-white"
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <Label className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>Phone</Label>
                <Input
                  type="tel"
                  placeholder="e.g. 0422 123 456"
                  value={client.client2Phone || ""}
                  onChange={(e) => onChange({ client2Phone: e.target.value })}
                  className={`text-sm h-10 ${
                    isLight
                      ? "bg-white border-slate-300 text-slate-900"
                      : "bg-slate-950/80 border-slate-800 text-white"
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <Label className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>Email</Label>
                <Input
                  type="email"
                  placeholder="e.g. jane.smith@example.com"
                  value={client.client2Email || ""}
                  onChange={(e) => onChange({ client2Email: e.target.value })}
                  className={`text-sm h-10 ${
                    isLight
                      ? "bg-white border-slate-300 text-slate-900"
                      : "bg-slate-950/80 border-slate-800 text-white"
                  }`}
                />
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
