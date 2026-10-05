import React, { useMemo, useState, useEffect } from "react";
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
  MapPinOff,
  Building2,
  Sparkles,
  Users,
  FolderOpen,
  FileText,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { ALL_STAFF_CONSULTANTS, findConsultant } from "@/components/flyer/consultants";
import { formatAud } from "@/lib/pricing";
import { getActiveDivision, setActiveDivision } from "@/lib/divisionContext";
import { detectCouncilFromLocation } from "@/lib/quoting/quoteEngine";
import { loadAllQuotes } from "@/lib/quoting/quoteStorage";
import { loadAllCrmLeads } from "@/lib/crm/crmStorage";
import type { CrmLead } from "@/lib/crm/crmTypes";
import { AddressAutocompleteInput } from "@/components/common/AddressAutocompleteInput";
import { lookupSuburbsByPostcode } from "@/lib/address/australianSuburbsData";
import { pdfDocumentToPagesAndText } from "@/lib/pdfPages";
import { parseQuoteFromEstimatePdf } from "@/lib/quoting/parseQuotePdf";
import type { ClientDetails, DepositType, FullQuote, SiteConditions } from "@/lib/quoting/quoteTypes";
import { useTheme } from "@/lib/theme";

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
  const { mode } = useTheme();
  const isLight = mode === "normal";
  const [importingPdf, setImportingPdf] = useState(false);
  const [crmLeads, setCrmLeads] = useState<CrmLead[]>([]);

  useEffect(() => {
    const fetchLeads = () => {
      loadAllCrmLeads().then(setCrmLeads).catch(() => {});
    };
    fetchLeads();
    if (typeof window !== "undefined") {
      window.addEventListener("hudson_crm_change", fetchLeads);
      return () => window.removeEventListener("hudson_crm_change", fetchLeads);
    }
  }, []);

  const handleSelectCrmLead = (leadId: string) => {
    const found = crmLeads.find((l) => l.id === leadId);
    if (!found) return;

    onChange({
      clientName: found.clientName,
      clientPhone: found.mobile,
      clientEmail: found.email,
      hasClient2: !!found.secondaryCustomerName,
      client2Name: found.secondaryCustomerName || "",
      client2Phone: found.secondaryCustomerMobile || "",
      client2Email: found.secondaryCustomerEmail || "",
      estate: found.targetEstate !== "Unspecified Estate" ? found.targetEstate : "",
      suburb: found.suburb !== "Queensland" ? found.suburb : "",
      lotNumber: found.lotNumber !== "TBA" ? found.lotNumber : "",
      siteAddress: found.targetEstate && found.targetEstate !== "Unspecified Estate" ? `${found.lotNumber && found.lotNumber !== "TBA" ? `Lot ${found.lotNumber}, ` : ""}${found.targetEstate}, ${found.suburb}` : "",
      notes: found.notes || "",
    });

    if (found.assignedConsultantId) {
      handleConsultantChange(found.assignedConsultantId);
    }

    toast.success(`Imported client details for ${found.clientName} from CRM! ✓`);
  };
  // Consultant-scoped saved clients
  const savedQuotes = useMemo(() => loadAllQuotes(), []);

  const handleImportPdfFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingPdf(true);
    const toastId = toast.loading(`Reading & parsing "${file.name}"...`);
    try {
      const { rawText } = await pdfDocumentToPagesAndText(file, 10);
      if (!rawText || rawText.trim().length === 0) {
        throw new Error("Could not extract readable text from PDF");
      }
      const parsedQuote = parseQuoteFromEstimatePdf(rawText, file.name);
      if (onLoadEntireQuote) {
        onLoadEntireQuote(parsedQuote);
      }
      toast.success(
        `Successfully restored estimate #${parsedQuote.quoteNumber || "MH"} for ${parsedQuote.client.clientName || "Client"} from PDF!`,
        { id: toastId }
      );
    } catch (err: any) {
      console.error("PDF Import error:", err);
      toast.error("Could not parse estimate from PDF. Please make sure it is a Hudson Homes estimate PDF.", { id: toastId });
    } finally {
      setImportingPdf(false);
      e.target.value = "";
    }
  };

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

  const handleToggleCustom3dTour = (selected: boolean) => {
    let baseAmount = client.depositType === "brownfield" ? 3300 : 1650;
    if (client.depositType === "custom") baseAmount = client.depositAmount || 1650;
    const finalAmount = selected ? baseAmount + 800 : baseAmount;
    onChange({
      custom3dTourSelected: selected,
      depositAmount: finalAmount,
    });
  };

  const handleDepositTypeChange = (type: DepositType) => {
    let baseAmount = 1650;
    if (type === "brownfield") baseAmount = 3300;
    if (type === "custom") baseAmount = client.depositAmount || 1650;
    const finalAmount = client.custom3dTourSelected ? baseAmount + 800 : baseAmount;
    
    const patch: Partial<ClientDetails> = {
      depositType: type,
      depositAmount: finalAmount,
    };
    if (type === "brownfield") {
      patch.estate = "";
    }
    onChange(patch);

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
      const activeState = merged.state || (getActiveDivision() === "NSW" ? "NSW" : "QLD");
      const detected = detectCouncilFromLocation(
        merged.suburb || "",
        `${merged.siteAddress || ""} ${merged.estate || ""}`,
        merged.postcode || "",
        activeState
      );
      onSiteChange({
        councilRegion: detected.region,
        councilFee: detected.fee,
      });
    }
  };

  const handleToggleNoAddressYet = () => {
    const isNsw = (client.state || getActiveDivision()) === "NSW";
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
          councilRegion: isNsw ? "NSW Local Council (Standard Statutory Fee)" : "Logan City Council",
          councilFee: isNsw ? 2000 : 2227,
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
          councilRegion: isNsw ? "NSW Local Council (Standard Statutory Fee)" : "Council Fee Allowance (No Location Mentioned)",
          councilFee: isNsw ? 2000 : 2200,
        });
      }
    }
  };

  const isNswDivision = (client.state || getActiveDivision()) === "NSW";
  const currentCouncil =
    site?.councilRegion ||
    (client.suburb || client.siteAddress
      ? isNswDivision
        ? "NSW Local Council (Standard Statutory Fee)"
        : "Logan City Council"
      : "Pending Building Location");
  const currentFee = site?.councilFee ?? (isNswDivision ? 2000 : 0);

  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className={`border-b pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
        isLight ? "border-slate-200" : "border-slate-800/80"
      }`}>
        <div>
          <h3 className={`text-base font-bold flex items-center gap-2 ${
            isLight ? "text-slate-900" : "text-white"
          }`}>
            <User className={`h-4 w-4 ${isLight ? "text-emerald-600" : "text-emerald-400"}`} />
            Step 1: Client &amp; Job Information
          </h3>
          <p className={`text-xs mt-0.5 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
            Enter primary client details, secondary applicant information (optional), proposed site address, and initial deposit options.
          </p>
        </div>
        {client.clientName && client.clientName.trim().length >= 2 && (
          <div className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border text-xs font-semibold shadow-xs self-start sm:self-center ${
            isLight
              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
              : "bg-emerald-950/70 border-emerald-700/60 text-emerald-300"
          }`}>
            <span className={`h-2 w-2 rounded-full ${isLight ? "bg-emerald-500" : "bg-emerald-400"} animate-pulse`} />
            <span>Synced to CRM &bull; {client.consultantName || "Consultant"}</span>
          </div>
        )}
      </div>

      {/* Primary Client (Client 1) Contact Info */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
            isLight ? "text-slate-800" : "text-slate-200"
          }`}>
            <User className={`h-3.5 w-3.5 ${isLight ? "text-emerald-600" : "text-emerald-400"}`} /> Primary Applicant (Client 1)
          </span>
          {!client.hasClient2 && (
            <button
              type="button"
              onClick={() => onChange({ hasClient2: true, client2Name: "" })}
              className={`text-xs flex items-center gap-1 font-semibold cursor-pointer ${
                isLight ? "text-cyan-700 hover:text-cyan-800" : "text-cyan-400 hover:text-cyan-300"
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" /> + Add Second Applicant (Client 2)
            </button>
          )}
        </div>

        <div className={`grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-xl border ${
          isLight ? "bg-white border-slate-200 shadow-xs" : "bg-slate-950/70 border-slate-800"
        }`}>
          <div className="space-y-1">
            <Label className={`text-[11px] font-medium ${isLight ? "text-slate-700" : "text-slate-300"}`}>Client 1 Full Name *</Label>
            <Input
              value={client.clientName}
              onChange={(e) => onChange({ clientName: e.target.value })}
              placeholder="e.g. Jordan Samuel Mitchell"
              className={`h-8.5 text-xs ${
                isLight
                  ? "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                  : "border-slate-800 bg-slate-900 text-slate-100 placeholder:text-slate-500"
              }`}
            />
          </div>

          <div className="space-y-1">
            <Label className={`text-[11px] font-medium ${isLight ? "text-slate-700" : "text-slate-300"}`}>Client 1 Phone</Label>
            <Input
              value={client.clientPhone}
              onChange={(e) => onChange({ clientPhone: e.target.value })}
              placeholder="e.g. 0417 555 123"
              className={`h-8.5 text-xs ${
                isLight
                  ? "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                  : "border-slate-800 bg-slate-900 text-slate-100 placeholder:text-slate-500"
              }`}
            />
          </div>

          <div className="space-y-1">
            <Label className={`text-[11px] font-medium ${isLight ? "text-slate-700" : "text-slate-300"}`}>Client 1 Email</Label>
            <Input
              value={client.clientEmail}
              onChange={(e) => onChange({ clientEmail: e.target.value })}
              placeholder="e.g. jordan.mitchell@example.com"
              className={`h-8.5 text-xs ${
                isLight
                  ? "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                  : "border-slate-800 bg-slate-900 text-slate-100 placeholder:text-slate-500"
              }`}
            />
          </div>
        </div>
      </div>

      {/* Secondary Client (Client 2) - Optional */}
      {client.hasClient2 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              isLight ? "text-slate-800" : "text-slate-200"
            }`}>
              <UserPlus className={`h-3.5 w-3.5 ${isLight ? "text-cyan-700" : "text-cyan-400"}`} /> Second Applicant (Client 2)
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
              className="text-xs text-rose-500 hover:text-rose-600 font-semibold cursor-pointer"
            >
              Remove Client 2
            </button>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-xl border ${
            isLight ? "bg-white border-slate-200 shadow-xs" : "bg-slate-950/70 border-slate-800"
          }`}>
            <div className="space-y-1">
              <Label className={`text-[11px] font-medium ${isLight ? "text-slate-700" : "text-slate-300"}`}>Client 2 Full Name</Label>
              <Input
                value={client.client2Name || ""}
                onChange={(e) => onChange({ client2Name: e.target.value })}
                placeholder="e.g. Stephannie Ann Krause"
                className={`h-8.5 text-xs ${
                  isLight
                    ? "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                    : "border-slate-800 bg-slate-900 text-slate-100 placeholder:text-slate-500"
                }`}
              />
            </div>

            <div className="space-y-1">
              <Label className={`text-[11px] font-medium ${isLight ? "text-slate-700" : "text-slate-300"}`}>Client 2 Phone</Label>
              <Input
                value={client.client2Phone || ""}
                onChange={(e) => onChange({ client2Phone: e.target.value })}
                placeholder="e.g. 0418 777 888"
                className={`h-8.5 text-xs ${
                  isLight
                    ? "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                    : "border-slate-800 bg-slate-900 text-slate-100 placeholder:text-slate-500"
                }`}
              />
            </div>

            <div className="space-y-1">
              <Label className={`text-[11px] font-medium ${isLight ? "text-slate-700" : "text-slate-300"}`}>Client 2 Email</Label>
              <Input
                value={client.client2Email || ""}
                onChange={(e) => onChange({ client2Email: e.target.value })}
                placeholder="e.g. stephannie.krause@example.com"
                className={`h-8.5 text-xs ${
                  isLight
                    ? "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                    : "border-slate-800 bg-slate-900 text-slate-100 placeholder:text-slate-500"
                }`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Proposed Building Site Address with Auto-Council Detection */}
      <div className={`rounded-xl border p-3.5 space-y-2.5 ${
        isLight ? "bg-white border-slate-200 shadow-xs" : "border-slate-800/80 bg-slate-900/40"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className={`flex items-center gap-2 text-xs font-semibold ${
            isLight ? "text-slate-800" : "text-slate-300"
          }`}>
            <MapPin className={`h-3.5 w-3.5 ${isLight ? "text-cyan-700" : "text-cyan-400"}`} />
            Proposed Building Site Location
          </div>

          {/* "No Address Yet" Toggle Button */}
          <button
            type="button"
            onClick={handleToggleNoAddressYet}
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              isNoAddressActive
                ? isLight
                  ? "bg-rose-100 border border-rose-400 text-rose-800 hover:bg-rose-200 shadow-xs"
                  : "bg-rose-500/20 border border-rose-500/50 text-rose-300 hover:bg-rose-500/30 shadow-sm"
                : isLight
                  ? "bg-amber-100 border border-amber-400 text-amber-900 hover:bg-amber-200 shadow-xs"
                  : "bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25"
            }`}
          >
            <MapPinOff className={`h-3 w-3 ${isNoAddressActive ? (isLight ? "text-rose-700" : "text-rose-400") : (isLight ? "text-amber-700" : "text-amber-400")}`} />
            {isNoAddressActive
              ? "✕ Clear 'No Address' / Enter Custom Address"
              : "No Address Yet / Land Not Purchased (Auto $2,200 Council Allowance)"}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5">
          <div className="space-y-1 md:col-span-2">
            <Label className="text-[11px] text-slate-400">Lot Number</Label>
            <Input
              value={client.lotNumber}
              onChange={(e) => handleAddressChange({ lotNumber: e.target.value })}
              placeholder="e.g. Lot 134"
              className="h-8.5 border-slate-800 bg-slate-950/70 text-xs text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1.5 md:col-span-4">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] text-slate-400">Street Address</Label>
              <span className="text-[9.5px] text-cyan-400 font-medium">Type address or lot to auto-fill</span>
            </div>
            <AddressAutocompleteInput
              value={client.siteAddress}
              onChange={(val) => handleAddressChange({ siteAddress: val })}
              onSelectAddress={(item) => {
                const patch: Partial<ClientDetails> = {
                  siteAddress: item.fullStreet || item.streetName || item.formattedAddress,
                  suburb: item.suburb || client.suburb,
                  state: (item.state === "NSW" ? "NSW" : "QLD"),
                  postcode: item.postcode || client.postcode,
                };
                if (item.lotNumber) {
                  patch.lotNumber = `Lot ${item.lotNumber}`;
                }
                if (item.estate) {
                  patch.estate = item.estate;
                }
                handleAddressChange(patch);
                if (patch.state) {
                  setActiveDivision(patch.state as "QLD" | "NSW");
                }
              }}
              placeholder="e.g. 31 Broad Axe Crescent / Lot 243 Paradise Rd"
              className="h-8.5 border-slate-800 bg-slate-950/70 text-xs text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2 md:col-span-2">
            <Label className="text-[11px] text-slate-400">Suburb</Label>
            <AddressAutocompleteInput
              value={client.suburb}
              onChange={(val) => handleAddressChange({ suburb: val })}
              onSelectAddress={(item) => {
                const patch: Partial<ClientDetails> = {
                  suburb: item.suburb || client.suburb,
                  state: (item.state === "NSW" ? "NSW" : "QLD"),
                  postcode: item.postcode || client.postcode,
                };
                if (item.estate) {
                  patch.estate = item.estate;
                }
                handleAddressChange(patch);
                if (patch.state) {
                  setActiveDivision(patch.state as "QLD" | "NSW");
                }
              }}
              placeholder="e.g. Flagstone / Coomera / Ripley / Parramatta"
              className="h-8.5 border-slate-800 bg-slate-950/70 text-xs text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-1 md:col-span-1">
            <Label className="text-[11px] text-slate-400">State</Label>
            <Select
              value={client.state || (getActiveDivision() === "NSW" ? "NSW" : "QLD")}
              onValueChange={(val: "QLD" | "NSW") => {
                handleAddressChange({ state: val });
                setActiveDivision(val);
              }}
            >
              <SelectTrigger className="h-8.5 border-slate-800 bg-slate-950/70 text-xs text-slate-100">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                <SelectItem value="QLD">QLD</SelectItem>
                <SelectItem value="NSW">NSW</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-1 md:col-span-1">
            <Label className="text-[11px] text-slate-400">Postcode</Label>
            <Input
              value={client.postcode || ""}
              onChange={(e) => {
                const pc = e.target.value.trim();
                const stateGuess = pc.startsWith("2") ? "NSW" : pc.startsWith("4") ? "QLD" : undefined;
                const patch: Partial<ClientDetails> = { postcode: pc, ...(stateGuess ? { state: stateGuess } : {}) };
                if (pc.length === 4 && !client.suburb) {
                  const matches = lookupSuburbsByPostcode(pc);
                  if (matches.length > 0) {
                    patch.suburb = matches[0].suburb;
                    if (matches[0].state === "NSW" || matches[0].state === "QLD") {
                      patch.state = matches[0].state;
                    }
                  }
                }
                handleAddressChange(patch);
                if (stateGuess) setActiveDivision(stateGuess);
              }}
              placeholder="e.g. 4280 / 2150"
              className="h-8.5 border-slate-800 bg-slate-950/70 text-xs text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2 md:col-span-2">
            <Label className="text-[11px] text-slate-400">Estate Name</Label>
            <Input
              value={client.depositType === "brownfield" ? "" : client.estate}
              disabled={client.depositType === "brownfield"}
              onChange={(e) => handleAddressChange({ estate: e.target.value })}
              placeholder={client.depositType === "brownfield" ? "N/A (Established Suburb / KDRB)" : "e.g. Flagstone Rise"}
              className={`h-8.5 border-slate-800 text-xs ${
                client.depositType === "brownfield"
                  ? "bg-slate-900/40 text-slate-500 cursor-not-allowed italic"
                  : "bg-slate-950/70 text-slate-100 placeholder:text-slate-500"
              }`}
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
        <div className={`mt-2 rounded-lg p-2.5 flex items-center justify-between text-xs border ${
          isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/80 border-slate-800"
        }`}>
          <div className="flex items-center gap-2">
            <Building2 className={`h-4 w-4 flex-none ${isLight ? "text-cyan-700" : "text-cyan-400"}`} />
            <div>
              <span className={`text-[11px] block ${isLight ? "text-slate-600 font-medium" : "text-slate-400"}`}>Auto-Configured Council Jurisdiction:</span>
              <span className={`font-bold text-xs ${isLight ? "text-slate-900" : "text-white"}`}>{currentCouncil}</span>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-[10px] uppercase tracking-wider block ${isLight ? "text-slate-500" : "text-slate-500"}`}>Statutory Fee:</span>
            <span className={`font-mono font-bold text-xs ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
              {currentFee === 0 ? "Standard ($0 Included)" : `+${formatAud(currentFee)}`}
            </span>
          </div>
        </div>

        {/* Unrecognized / New Council Notification Alert */}
        {(currentCouncil.includes("Approval Required") || currentCouncil.includes("Other") || currentCouncil.includes("Unlisted")) && (
          <div className={`mt-2 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border ${
            isLight
              ? "bg-amber-50 border-amber-300 text-amber-900"
              : "bg-amber-950/30 border-amber-500/50 text-amber-200"
          }`}>
            <div className="flex items-start gap-2">
              <Shield className={`h-4 w-4 flex-none mt-0.5 ${isLight ? "text-amber-700" : "text-amber-400"}`} />
              <div>
                <strong className={`block font-bold ${isLight ? "text-amber-950" : "text-white"}`}>⚠️ Unrecognized Council LGA for Suburb &quot;{client.suburb || "Custom Location"}&quot;</strong>
                <p className={`text-[11px] mt-0.5 ${isLight ? "text-amber-800" : "text-amber-300/90"}`}>
                  This suburb is not currently mapped to an existing approved council schedule. Standard allowance ($2,200) applied pending approval.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => {
                const subject = encodeURIComponent(`[Hudson Quoting] New Council Approval Request: ${client.suburb || "New Suburb"}`);
                const body = encodeURIComponent(`Hi Morgan,\n\nA new suburb/location was entered into the Hudson Quote Builder:\n- Suburb: ${client.suburb || "TBA"}\n- Address: ${client.siteAddress || "TBA"}\n- Estate: ${client.estate || "TBA"}\n- Client: ${client.clientName || "TBA"}\n- Consultant: ${client.consultantName || "Consultant"}\n\nPlease review and approve the council jurisdiction and statutory fee schedule.\n\nThank you!`);
                window.open(`mailto:morgan.hales@hudsonhomes.com.au?subject=${subject}&body=${body}`, "_blank");
                toast.success("Council approval notification email prepared for Morgan Hales.");
              }}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5 h-8 whitespace-nowrap self-start sm:self-center shadow-md flex-none"
            >
              <Mail className="h-3.5 w-3.5" />
              Request Council Approval
            </Button>
          </div>
        )}
      </div>

      {/* Consultant & Initial Deposit Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Sales Consultant */}
        <div className={`rounded-xl border p-3.5 space-y-2.5 ${isLight ? "bg-white border-slate-200 shadow-xs" : "border-slate-800/80 bg-slate-900/40"}`}>
          <div className={`flex items-center gap-2 text-xs font-semibold ${isLight ? "text-slate-800" : "text-slate-300"}`}>
            <Shield className={`h-3.5 w-3.5 ${isLight ? "text-amber-600" : "text-brand-gold"}`} />
            New Home Sales Consultant
          </div>

          <div className="space-y-1">
            <Label className={`text-[11px] ${isLight ? "text-slate-700 font-medium" : "text-slate-400"}`}>Select Consultant</Label>
            <Select value={client.consultantId} onValueChange={handleConsultantChange}>
              <SelectTrigger className={`h-8.5 text-xs ${isLight ? "border-slate-300 bg-white text-slate-900" : "border-slate-800 bg-slate-950/70 text-slate-200"}`}>
                <SelectValue placeholder="Select consultant" />
              </SelectTrigger>
              <SelectContent className={isLight ? "border-slate-200 bg-white text-slate-900" : "border-slate-800 bg-slate-900 text-slate-200"}>
                {ALL_STAFF_CONSULTANTS.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} — {c.displayCentre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={`text-[11px] rounded-lg p-2 space-y-0.5 border ${isLight ? "bg-slate-50 border-slate-200 text-slate-600" : "bg-slate-950/50 border-transparent text-slate-400"}`}>
            <div className="flex justify-between">
              <span>Display Centre:</span>
              <span className={`font-medium ${isLight ? "text-slate-900" : "text-slate-200"}`}>{client.consultantOffice}</span>
            </div>
            <div className="flex justify-between">
              <span>Direct Phone:</span>
              <span className={`font-mono font-medium ${isLight ? "text-slate-900" : "text-slate-200"}`}>{client.consultantPhone}</span>
            </div>
          </div>
        </div>

        {/* Initial Deposit Required for Preliminary Works */}
        <div className={`rounded-xl border p-3.5 space-y-2.5 ${isLight ? "bg-white border-slate-200 shadow-xs" : "border-slate-800/80 bg-slate-900/40"}`}>
          <div className={`flex items-center gap-2 text-xs font-semibold ${isLight ? "text-slate-800" : "text-slate-300"}`}>
            <DollarSign className={`h-3.5 w-3.5 ${isLight ? "text-emerald-600" : "text-emerald-400"}`} />
            Initial Deposit &amp; Preliminary Works
          </div>

          <div className="space-y-1">
            <Label className={`text-[11px] ${isLight ? "text-slate-700 font-medium" : "text-slate-400"}`}>Site Land Status</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDepositTypeChange("greenfield")}
                className={`p-2 rounded-lg border text-left transition-all ${
                  client.depositType === "greenfield"
                    ? isLight
                      ? "border-emerald-500 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-500/40 shadow-xs"
                      : "border-emerald-500 bg-emerald-950/30 text-emerald-200 ring-1 ring-emerald-500/40"
                    : isLight
                      ? "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
                      : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className={`text-xs font-bold ${isLight ? "text-slate-900" : "text-slate-100"}`}>Greenfield</div>
                <div className={`text-[11px] font-mono font-bold mt-0.5 ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
                  {client.custom3dTourSelected ? "$2,450 Deposit" : "$1,650 Deposit"}
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDepositTypeChange("brownfield")}
                className={`p-2 rounded-lg border text-left transition-all ${
                  client.depositType === "brownfield"
                    ? isLight
                      ? "border-emerald-500 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-500/40 shadow-xs"
                      : "border-emerald-500 bg-emerald-950/30 text-emerald-200 ring-1 ring-emerald-500/40"
                    : isLight
                      ? "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
                      : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700"
                }`}
              >
                <div className={`text-xs font-bold ${isLight ? "text-slate-900" : "text-slate-100"}`}>Brownfield</div>
                <div className={`text-[11px] font-mono font-bold mt-0.5 ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
                  {client.custom3dTourSelected ? "$4,100 Deposit" : "$3,300 Deposit"}
                </div>
              </button>
            </div>
          </div>

          {/* Custom $800 Fee (3D Virtual Tour Prior to Contract) */}
          <div
            onClick={() => handleToggleCustom3dTour(!client.custom3dTourSelected)}
            className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
              client.custom3dTourSelected
                ? isLight
                  ? "border-cyan-500 bg-cyan-50 text-cyan-950 ring-1 ring-cyan-500/40 shadow-xs"
                  : "border-cyan-500/80 bg-cyan-950/40 text-cyan-200 ring-1 ring-cyan-500/40"
                : isLight
                  ? "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700"
            }`}
          >
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!!client.custom3dTourSelected}
                onChange={(e) => handleToggleCustom3dTour(e.target.checked)}
                className="h-4 w-4 rounded border-slate-400 text-cyan-600 focus:ring-cyan-500/30"
                onClick={(e) => e.stopPropagation()}
              />
              <span className={`font-bold text-xs flex items-center gap-1.5 ${isLight ? "text-slate-900" : "text-slate-100"}`}>
                <Sparkles className={`h-3.5 w-3.5 ${isLight ? "text-cyan-700" : "text-cyan-400"}`} />
                Include Custom 3D Virtual Tour
              </span>
            </div>
            <span className={`text-xs font-mono font-bold ${isLight ? "text-cyan-800" : "text-cyan-300"}`}>
              +$800 Upfront Deposit
            </span>
          </div>
        </div>
      </div>

      {/* Estimate Notes */}
      <div className="space-y-1">
        <Label className={`text-xs ${isLight ? "text-slate-700 font-medium" : "text-slate-300"}`}>Builders Estimate Notes &amp; Special Conditions</Label>
        <Textarea
          value={client.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Special conditions, covenant notes, or client requests..."
          rows={2}
          className={`text-xs focus:border-emerald-500/60 min-h-[50px] ${
            isLight
              ? "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
              : "border-slate-800 bg-slate-950/70 text-slate-100 placeholder:text-slate-500"
          }`}
        />
      </div>
    </div>
  );
}
