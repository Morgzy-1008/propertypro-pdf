import React, { useState } from "react";
import { User, Phone, Mail, MapPin, Building, Sparkles, ArrowRight, UserPlus, UserMinus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { FullQuote } from "@/lib/quoting/quoteTypes";
import { toast } from "sonner";

interface V2StepClientProps {
  client: FullQuote["client"];
  onChange: (patch: Partial<FullQuote["client"]>) => void;
  onNext: () => void;
  isLight: boolean;
}

export function V2StepClient({
  client,
  onChange,
  onNext,
  isLight,
}: V2StepClientProps) {
  const [showClient2, setShowClient2] = useState(Boolean(client.hasClient2 || client.client2Name));

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

  const handleToggleClient2 = () => {
    const nextState = !showClient2;
    setShowClient2(nextState);
    onChange({
      hasClient2: nextState,
      ...(!nextState ? { client2Name: "", client2Phone: "", client2Email: "" } : {}),
    });
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
            <span className="text-xs uppercase tracking-wider font-bold text-emerald-400">Step 1 of 5</span>
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
                placeholder="e.g. David Miller"
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
                placeholder="e.g. david.miller@example.com.au"
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

          {/* Little tab "Add 2nd client" positioned directly below 1st client details */}
          <div className="mt-4 pt-3 flex items-center justify-start border-t border-slate-700/20">
            <button
              type="button"
              onClick={handleToggleClient2}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border cursor-pointer ${
                showClient2
                  ? isLight
                    ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 shadow-xs"
                    : "bg-rose-950/30 text-rose-300 border-rose-800/50 hover:bg-rose-900/40"
                  : isLight
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-xs"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
              }`}
            >
              {showClient2 ? (
                <>
                  <UserMinus className="h-3.5 w-3.5" />
                  <span>Remove 2nd Client</span>
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add 2nd Client</span>
                </>
              )}
            </button>
          </div>

          {/* 2nd Client Details Box smoothly appearing directly below 1st client */}
          {showClient2 && (
            <div
              className={`mt-4 pt-4 border-t transition-all animate-in fade-in slide-in-from-top-2 duration-300 ${
                isLight ? "border-slate-200" : "border-slate-800"
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <UserPlus className="h-4 w-4 text-cyan-400" />
                <h4 className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                  2nd Client / Co-Borrower Details
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                    Full Name
                  </Label>
                  <Input
                    placeholder="e.g. Sarah Miller"
                    value={client.client2Name || ""}
                    onChange={(e) => onChange({ client2Name: e.target.value })}
                    className={`text-sm h-10 ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                        : "bg-slate-950/80 border-slate-800 text-white"
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                    Phone
                  </Label>
                  <Input
                    type="tel"
                    placeholder="e.g. 0423 456 789"
                    value={client.client2Phone || ""}
                    onChange={(e) => onChange({ client2Phone: e.target.value })}
                    className={`text-sm h-10 ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                        : "bg-slate-950/80 border-slate-800 text-white"
                    }`}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                    Email
                  </Label>
                  <Input
                    type="email"
                    placeholder="e.g. sarah.miller@example.com.au"
                    value={client.client2Email || ""}
                    onChange={(e) => onChange({ client2Email: e.target.value })}
                    className={`text-sm h-10 ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                        : "bg-slate-950/80 border-slate-800 text-white"
                    }`}
                  />
                </div>
              </div>
            </div>
          )}
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

        {/* Continue to Step 2 */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            size="lg"
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold px-8 shadow-lg shadow-emerald-500/20 gap-2 cursor-pointer h-12"
          >
            Continue to Floor Plan &amp; Inclusions
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
