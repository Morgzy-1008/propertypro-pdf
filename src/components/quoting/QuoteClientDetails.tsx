import React, { useMemo } from "react";
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
  MapPinOff,
  Building2,
  Sparkles,
  Users,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";
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
import { detectCouncilFromLocation } from "@/lib/quoting/quoteEngine";
import { loadAllQuotes } from "@/lib/quoting/quoteStorage";
import type { ClientDetails, DepositType, FullQuote, SiteConditions } from "@/lib/quoting/quoteTypes";

interface QuoteClientDetailsProps {
  client: ClientDetails;
  site?: SiteConditions;
  onChange: (updated: Partial<ClientDetails>) => void;
  onSiteChange?: (updated: Partial<SiteConditions>) => void;
  onLoadEntireQuote?: (savedQuote: FullQuote) => void;
}

export function QuoteClientDetails({
  client,
  site,
  onChange,
  onSiteChange,
  onLoadEntireQuote,
}: QuoteClientDetailsProps) {
  // Consultant-scoped saved clients
  const savedQuotes = useMemo(() => loadAllQuotes(), []);

  const consultantQuotes = useMemo(() => {
    return savedQuotes.filter((q) => {
      if (!q.client?.clientName || q.client.clientName.trim() === "") return false;
      // Filter by consultant ID or email if present, or show if matches
      if (client.consultantId && q.client.consultantId) {
        return q.client.consultantId === client.consultantId;
      }
      if (client.consultantEmail && q.client.consultantEmail) {
        return q.client.consultantEmail.toLowerCase() === client.consultantEmail.toLowerCase();
      }
      return true;
    });
  }, [savedQuotes, client.consultantId, client.consultantEmail]);

  const handleSelectExistingClient = (quoteId: string) => {
    const found = consultantQuotes.find((q) => q.id === quoteId || q.quoteNumber === quoteId);
    if (!found) return;

    if (onLoadEntireQuote) {
      onLoadEntireQuote(found);
      toast.success(`Loaded client details & estimate for ${found.client.clientName}`);
    } else {
      onChange({
        clientName: found.client.clientName,
        clientPhone: found.client.clientPhone,
        clientEmail: found.client.clientEmail,
        hasClient2: found.client.hasClient2,
        client2Name: found.client.client2Name,
        client2Phone: found.client.client2Phone,
        client2Email: found.client.client2Email,
        siteAddress: found.client.siteAddress,
        lotNumber: found.client.lotNumber,
        suburb: found.client.suburb,
        estate: found.client.estate,
        postcode: found.client.postcode,
        depositType: found.client.depositType,
        depositAmount: found.client.depositAmount,
        notes: found.client.notes,
      });
      toast.success(`Loaded client details for ${found.client.clientName}`);
    }
  };

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

    if (type === "brownfield" && onSiteChange) {
      onSiteChange({ screwPieringRequired: true });
    }
  };

  const isNoAddressActive =
    client.lotNumber === "TBA" ||
    client.siteAddress?.includes("To Be Advised") ||
    client.suburb?.includes("Location TBA");

  const handleAddressChange = (patch: Partial<ClientDetails>) => {
    const merged = { ...client, ...patch };
    onChange(patch);

    if (onSiteChange) {
      const detected = detectCouncilFromLocation(
        merged.suburb || "",
        `${merged.siteAddress || ""} ${merged.estate || ""}`,
        merged.postcode || ""
      );
      onSiteChange({
        councilRegion: detected.region,
        councilFee: detected.fee,
      });
    }
  };

  const handleToggleNoAddressYet = () => {
    if (isNoAddressActive) {
      // Clear fields so user can type an address
      onChange({
        lotNumber: "",
        siteAddress: "",
        suburb: "",
        estate: "",
        postcode: "",
      });

      if (onSiteChange) {
        onSiteChange({
          councilRegion: "Logan City Council",
          councilFee: 2227,
        });
      }
    } else {
      onChange({
        lotNumber: "TBA",
        siteAddress: "Address To Be Advised (Land Not Purchased)",
        suburb: "Location TBA",
        estate: "",
        postcode: "",
      });

      if (onSiteChange) {
        onSiteChange({
          councilRegion: "Council Fee Allowance (No Location Mentioned)",
          councilFee: 2200,
        });
      }
    }
  };

  const currentCouncil = site?.councilRegion || "Logan City Council";
  const currentFee = site?.councilFee ?? 2227;

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

      {/* Select Existing Client Banner (Scoped to current consultant) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/90 p-4 rounded-xl border border-slate-800 ring-1 ring-emerald-500/20 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex-none">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
              Select Existing Client
              <span className="text-[10px] font-mono font-normal bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                {consultantQuotes.length} saved for {client.consultantName?.split(" ")[0] || "Consultant"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Instantly load contact &amp; site data from your previously saved client estimates.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-none">
          <Select value="" onValueChange={handleSelectExistingClient}>
            <SelectTrigger className="h-9 text-xs border-slate-800 bg-slate-900 text-slate-200 w-72">
              <SelectValue placeholder="Choose an existing client…" />
            </SelectTrigger>
            <SelectContent className="border-slate-800 bg-slate-900 text-slate-200 max-h-72">
              {consultantQuotes.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500">
                  No saved client estimates found for your account yet.
                </div>
              ) : (
                consultantQuotes.map((q) => (
                  <SelectItem key={q.id} value={q.id}>
                    {q.client.clientName} — {q.client.siteAddress ? `${q.client.lotNumber ? `Lot ${q.client.lotNumber}, ` : ""}${q.client.suburb || q.client.siteAddress}` : "Site TBA"} ({q.quoteNumber})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
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

      {/* Proposed Building Site Address with Auto-Council Detection */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <MapPin className="h-3.5 w-3.5 text-cyan-400" />
            Proposed Building Site Location
          </div>

          {/* "No Address Yet" Toggle Button */}
          <button
            type="button"
            onClick={handleToggleNoAddressYet}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              isNoAddressActive
                ? "bg-rose-500/20 border border-rose-500/50 text-rose-300 hover:bg-rose-500/30 shadow-sm"
                : "bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25"
            }`}
          >
            <MapPinOff className={`h-3.5 w-3.5 ${isNoAddressActive ? "text-rose-400" : "text-amber-400"}`} />
            {isNoAddressActive
              ? "✕ Clear 'No Address' / Enter Custom Address"
              : "No Address Yet / Land Not Purchased (Auto $2,200 Council Allowance)"}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-[11px] text-slate-400">Lot Number</Label>
            <Input
              value={client.lotNumber}
              onChange={(e) => handleAddressChange({ lotNumber: e.target.value })}
              placeholder="e.g. Lot 134"
              className="h-8.5 border-slate-800 bg-slate-950/70 text-xs text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1.5 md:col-span-4">
            <Label className="text-[11px] text-slate-400">Street Address</Label>
            <Input
              value={client.siteAddress}
              onChange={(e) => handleAddressChange({ siteAddress: e.target.value })}
              placeholder="e.g. 31 Broad Axe Crescent"
              className="h-8.5 border-slate-800 bg-slate-950/70 text-xs text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2 md:col-span-2">
            <Label className="text-[11px] text-slate-400">Suburb</Label>
            <Input
              value={client.suburb}
              onChange={(e) => handleAddressChange({ suburb: e.target.value })}
              placeholder="e.g. Flagstone / Coomera / Ripley"
              className="h-8.5 border-slate-800 bg-slate-950/70 text-xs text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2 md:col-span-2">
            <Label className="text-[11px] text-slate-400">Estate Name</Label>
            <Input
              value={client.estate}
              onChange={(e) => handleAddressChange({ estate: e.target.value })}
              placeholder="e.g. Flagstone Rise"
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

        {/* Live Detected Council Fee Notification Card */}
        <div className="mt-2 bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-cyan-400 flex-none" />
            <div>
              <span className="text-slate-400 text-[11px] block">Auto-Configured Council Jurisdiction:</span>
              <span className="font-bold text-white text-xs">{currentCouncil}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Statutory Fee:</span>
            <span className="font-mono font-bold text-emerald-400 text-xs">
              {currentFee === 0 ? "Standard ($0 Included)" : `+${formatAud(currentFee)}`}
            </span>
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
