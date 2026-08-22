import React from "react";
import {
  User,
  MapPin,
  Building,
  Phone,
  Mail,
  Shield,
  Calendar,
  DollarSign,
  UserPlus,
  CheckCircle2,
  FileCheck2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CONSULTANTS, findConsultant } from "@/components/flyer/consultants";
import { formatAud } from "@/lib/pricing";
import type { ClientDetails, DepositType } from "@/lib/quoting/quoteTypes";

interface QuoteClientDetailsProps {
  client: ClientDetails;
  onChange: (updated: Partial<ClientDetails>) => void;
}

export function QuoteClientDetails({ client, onChange }: QuoteClientDetailsProps) {
  const handleConsultantChange = (id: string) => {
    const c = findConsultant(id);
    if (!c) return;
    onChange({
      consultantId: c.id,
      consultantName: c.name,
      consultantPhone: c.phone,
      consultantEmail: c.email,
      consultantOffice: c.displayCentre,
    });
  };

  const handleDepositTypeChange = (type: DepositType) => {
    let amount = 1650;
    if (type === "brownfield") amount = 3300;
    if (type === "custom") amount = client.depositAmount || 1650;
    onChange({ depositType: type, depositAmount: amount });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800/80 pb-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <User className="h-4 w-4 text-emerald-400" />
          Step 1: Client &amp; Job Information
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Enter primary client details, secondary applicant information (optional), proposed site address, and initial deposit options.
        </p>
      </div>

      {/* Primary Client (Client 1) Contact Info */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-emerald-400" /> Primary Applicant (Client 1)
          </span>
          {!client.hasClient2 && (
            <button
              type="button"
              onClick={() => onChange({ hasClient2: true, client2Name: "" })}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
            >
              <UserPlus className="h-3.5 w-3.5" /> + Add Second Applicant (Client 2)
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Client 1 Full Name *</Label>
            <Input
              value={client.clientName}
              onChange={(e) => onChange({ clientName: e.target.value })}
              placeholder="e.g. Jordan Samuel Mitchell"
              className="border-slate-800 bg-slate-900 text-xs text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Client 1 Phone</Label>
            <Input
              value={client.clientPhone}
              onChange={(e) => onChange({ clientPhone: e.target.value })}
              placeholder="e.g. 0417 555 123"
              className="border-slate-800 bg-slate-900 text-xs text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Client 1 Email</Label>
            <Input
              value={client.clientEmail}
              onChange={(e) => onChange({ clientEmail: e.target.value })}
              placeholder="e.g. jordan.mitchell@example.com"
              className="border-slate-800 bg-slate-900 text-xs text-slate-100 placeholder:text-slate-500"
            />
          </div>
        </div>
      </div>

      {/* Secondary Client (Client 2) - Optional */}
      {client.hasClient2 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5 text-cyan-400" /> Second Applicant (Client 2)
            </span>
            <button
              type="button"
              onClick={() =>
                onChange({
                  hasClient2: false,
                  client2Name: "",
                  client2Phone: "",
                  client2Email: "",
                })
              }
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
            >
              Remove Client 2
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Client 2 Full Name</Label>
              <Input
                value={client.client2Name || ""}
                onChange={(e) => onChange({ client2Name: e.target.value })}
                placeholder="e.g. Stephannie Ann Krause"
                className="border-slate-800 bg-slate-900 text-xs text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Client 2 Phone</Label>
              <Input
                value={client.client2Phone || ""}
                onChange={(e) => onChange({ client2Phone: e.target.value })}
                placeholder="e.g. 0418 777 888"
                className="border-slate-800 bg-slate-900 text-xs text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Client 2 Email</Label>
              <Input
                value={client.client2Email || ""}
                onChange={(e) => onChange({ client2Email: e.target.value })}
                placeholder="e.g. stephannie.krause@example.com"
                className="border-slate-800 bg-slate-900 text-xs text-slate-100 placeholder:text-slate-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Proposed Building Site Address */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <MapPin className="h-3.5 w-3.5 text-cyan-400" />
          Proposed Building Site Location
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-[11px] text-slate-400">Lot Number</Label>
            <Input
              value={client.lotNumber}
              onChange={(e) => onChange({ lotNumber: e.target.value })}
              placeholder="e.g. Lot 134"
              className="h-8.5 border-slate-800 bg-slate-950/70 text-xs text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1.5 md:col-span-4">
            <Label className="text-[11px] text-slate-400">Street Address</Label>
            <Input
              value={client.siteAddress}
              onChange={(e) => onChange({ siteAddress: e.target.value })}
              placeholder="e.g. 31 Broad Axe Crescent"
              className="h-8.5 border-slate-800 bg-slate-950/70 text-xs text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2 md:col-span-2">
            <Label className="text-[11px] text-slate-400">Suburb</Label>
            <Input
              value={client.suburb}
              onChange={(e) => onChange({ suburb: e.target.value })}
              placeholder="e.g. New Beith"
              className="h-8.5 border-slate-800 bg-slate-950/70 text-xs text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2 md:col-span-2">
            <Label className="text-[11px] text-slate-400">Estate Name</Label>
            <Input
              value={client.estate}
              onChange={(e) => onChange({ estate: e.target.value })}
              placeholder="e.g. New Beith Estate"
              className="h-8.5 border-slate-800 bg-slate-950/70 text-xs text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2 md:col-span-2">
            <Label className="text-[11px] text-slate-400">Estimate Validity (Days)</Label>
            <Input
              type="number"
              value={client.quoteValidityDays}
              onChange={(e) => onChange({ quoteValidityDays: Number(e.target.value) || 14 })}
              className="h-8.5 border-slate-800 bg-slate-950/70 text-xs text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* Consultant & Initial Deposit Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sales Consultant */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Shield className="h-3.5 w-3.5 text-brand-gold" />
            New Home Sales Consultant
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-slate-400">Select Consultant</Label>
            <Select value={client.consultantId} onValueChange={handleConsultantChange}>
              <SelectTrigger className="border-slate-800 bg-slate-950/70 text-xs text-slate-200">
                <SelectValue placeholder="Select consultant" />
              </SelectTrigger>
              <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                {CONSULTANTS.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} — {c.displayCentre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-950/50 rounded-lg p-2.5 space-y-1">
            <div className="flex justify-between">
              <span>Display Centre:</span>
              <span className="text-slate-200">{client.consultantOffice}</span>
            </div>
            <div className="flex justify-between">
              <span>Direct Phone:</span>
              <span className="text-slate-200 font-mono">{client.consultantPhone}</span>
            </div>
          </div>
        </div>

        {/* Initial Deposit Required for Preliminary Works */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
            Initial Deposit &amp; Preliminary Works
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-slate-400">Site Land Status</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDepositTypeChange("greenfield")}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  client.depositType === "greenfield"
                    ? "border-emerald-500 bg-emerald-950/30 text-emerald-200 ring-1 ring-emerald-500/40"
                    : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="text-xs font-bold text-slate-100">Greenfield</div>
                <div className="text-[11px] text-emerald-400 font-mono font-bold mt-0.5">$1,650 Deposit</div>
              </button>

              <button
                type="button"
                onClick={() => handleDepositTypeChange("brownfield")}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  client.depositType === "brownfield"
                    ? "border-emerald-500 bg-emerald-950/30 text-emerald-200 ring-1 ring-emerald-500/40"
                    : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className="text-xs font-bold text-slate-100">Brownfield</div>
                <div className="text-[11px] text-emerald-400 font-mono font-bold mt-0.5">$3,300 Deposit</div>
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-950/50 rounded-lg p-2.5 space-y-1">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <FileCheck2 className="h-3.5 w-3.5 text-cyan-400" /> Preliminary Works Included with Deposit:
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-slate-400 pt-1">
              <div>✓ On-site Investigation Report</div>
              <div>✓ Geotechnical Soil Test</div>
              <div>✓ Wind Classification Report</div>
              <div>✓ Registered Contour Survey</div>
              <div>✓ Covenant Compliance Check</div>
              <div>✓ In-House Architectural Drafting</div>
            </div>
          </div>
        </div>
      </div>

      {/* Estimate Notes */}
      <div className="space-y-1.5">
        <Label className="text-xs text-slate-300">Builders Estimate Notes &amp; Special Conditions</Label>
        <Textarea
          value={client.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Special conditions, covenant notes, or client requests..."
          rows={2}
          className="border-slate-800 bg-slate-950/70 text-xs text-slate-100 placeholder:text-slate-500 focus:border-emerald-500/60"
        />
      </div>
    </div>
  );
}
