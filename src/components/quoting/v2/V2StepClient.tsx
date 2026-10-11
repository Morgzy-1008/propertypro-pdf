import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Building,
  Sparkles,
  ArrowRight,
  UserPlus,
  UserMinus,
  Plus,
  MapPinOff,
  Loader2,
  X,
  Check,
  Search,
  ShieldCheck,
  Users,
  Lock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FullQuote, SiteConditions } from "@/lib/quoting/quoteTypes";
import { toast } from "sonner";
import { searchAustralianAddresses, type AddressSuggestion } from "@/lib/address/addressService";
import { detectCouncilFromLocation, detectStateFromAddress } from "@/lib/quoting/quoteEngine";
import { getActiveDivision, setActiveDivision } from "@/lib/divisionContext";
import { ALL_STAFF_CONSULTANTS, findConsultant } from "@/components/flyer/consultants";
import { getActiveStaffUser } from "@/lib/authSession";
import { canChangeQuoteConsultant } from "@/lib/access";
import { loadAllCrmLeads } from "@/lib/crm/crmStorage";
import type { CrmLead } from "@/lib/crm/crmTypes";
import { loadAllQuotes } from "@/lib/quoting/quoteStorage";

/**
 * Detects if the user has typed at least 2 letters of the actual street name.
 * Strips leading unit/apt/suite/shop/lot keywords and numbers: e.g. "unit 3/14", "lot 108"
 * Strips fractional slashes and street numbers: e.g. "24", "108B", "12-14"
 */
export function hasTypedTwoLettersOfStreet(input: string): boolean {
  if (!input) return false;
  let s = input.trim();
  // 1. Strip unit/apt/suite/shop/lot prefixes
  s = s.replace(/^(?:unit|apt|suite|shop|u|lot)\s*[\dA-Za-z\-\/]+[,\s]*/i, "");
  // 2. Strip unit slash e.g. "2/15", "12/"
  s = s.replace(/^\d+[\dA-Za-z]?\s*\/\s*/, "");
  // 3. Strip street numbers e.g. "42", "12-14", "108B", "24 "
  s = s.replace(/^\d+[\dA-Za-z\-]*(?:\s*,\s*|\s+)?/, "");
  // 4. Strip standalone "lot"
  s = s.replace(/^lot\b\s*/i, "");

  const remaining = s.trim();
  // Match at least two alphabetical characters
  return /[a-zA-Z]{2,}/.test(remaining);
}

interface V2StepClientProps {
  client: FullQuote["client"];
  site?: SiteConditions;
  onChange: (patch: Partial<FullQuote["client"]>) => void;
  onSiteChange?: (patch: Partial<SiteConditions>) => void;
  onNext: () => void;
  isLight: boolean;
}

export function V2StepClient({
  client,
  site,
  onChange,
  onSiteChange,
  onNext,
  isLight,
}: V2StepClientProps) {
  const [showClient2, setShowClient2] = useState(Boolean(client.hasClient2 || client.client2Name));
  const [manualAdvanceToLot, setManualAdvanceToLot] = useState(false);
  const lotSectionRef = useRef<HTMLDivElement>(null);

  // Address search and autofill states
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const streetInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<any>(null);

  const activeState = (client.state || getActiveDivision()) === "NSW" ? "NSW" : "QLD";

  // Consultant security & permissions: Only Alyssa and Ben can change/reassign consultant.
  // When other consultants are logged in, lock details to active login and remove change options.
  const activeStaff = useMemo(() => getActiveStaffUser(), []);
  const canChangeConsultant = canChangeQuoteConsultant(activeStaff);

  useEffect(() => {
    if (activeStaff && !canChangeConsultant) {
      if (
        client.consultantId !== activeStaff.id ||
        client.consultantEmail?.toLowerCase() !== activeStaff.email.toLowerCase() ||
        client.consultantName !== activeStaff.name ||
        client.consultantPhone !== activeStaff.phone ||
        client.consultantOffice !== activeStaff.displayCentre
      ) {
        onChange({
          consultantId: activeStaff.id,
          consultantName: activeStaff.name,
          consultantPhone: activeStaff.phone,
          consultantEmail: activeStaff.email,
          consultantOffice: activeStaff.displayCentre,
        });
      }
    }
  }, [activeStaff, canChangeConsultant, client.consultantId, client.consultantEmail, client.consultantName, client.consultantPhone, client.consultantOffice]);

  // CRM Leads and Saved Quotes for 1-click client loading
  const [crmLeads, setCrmLeads] = useState<CrmLead[]>([]);
  const savedQuotes = useMemo(() => {
    try {
      return loadAllQuotes();
    } catch {
      return [];
    }
  }, []);

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

    setManualAdvanceToLot(true);

    const suburbClean = found.suburb && found.suburb !== "Queensland" && found.suburb !== "New South Wales" ? found.suburb : "";
    const estateClean = found.targetEstate && found.targetEstate !== "Unspecified Estate" ? found.targetEstate : "";
    const lotClean = found.lotNumber && found.lotNumber !== "TBA" ? found.lotNumber : "";
    const siteAddr = estateClean ? `${lotClean ? `Lot ${lotClean}, ` : ""}${estateClean}, ${suburbClean}` : "";

    const detectedState = detectStateFromAddress(`${siteAddr} ${suburbClean}`, "", activeState);
    if (detectedState !== client.state) {
      setActiveDivision(detectedState);
    }

    let consultantPatch: Partial<FullQuote["client"]> = {};
    if (found.assignedConsultantId && canChangeConsultant) {
      const consultant = findConsultant(found.assignedConsultantId) || ALL_STAFF_CONSULTANTS.find((c) => c.id === found.assignedConsultantId);
      if (consultant) {
        consultantPatch = {
          consultantId: consultant.id,
          consultantName: consultant.name,
          consultantPhone: consultant.phone,
          consultantEmail: consultant.email,
          consultantOffice: consultant.displayCentre,
        };
      }
    }

    onChange({
      clientName: found.clientName,
      clientPhone: found.mobile,
      clientEmail: found.email,
      hasClient2: !!found.secondaryCustomerName,
      client2Name: found.secondaryCustomerName || "",
      client2Phone: found.secondaryCustomerMobile || "",
      client2Email: found.secondaryCustomerEmail || "",
      estate: estateClean,
      suburb: suburbClean,
      lotNumber: lotClean,
      siteAddress: siteAddr,
      notes: found.notes || "",
      state: detectedState,
      ...consultantPatch,
    });

    if (found.secondaryCustomerName) {
      setShowClient2(true);
    }

    if (onSiteChange) {
      const detected = detectCouncilFromLocation(suburbClean, siteAddr, "", detectedState);
      if (detected.region) {
        onSiteChange({
          councilRegion: detected.region,
          councilFee: detected.fee > 0 ? detected.fee : (detectedState === "NSW" ? 2000 : 2227),
        });
      }
    }

    toast.success(`Imported client details for ${found.clientName} from CRM! ✓`);
  };

  const handleSuburbChange = (val: string) => {
    const detectedState = detectStateFromAddress(`${val} ${client.siteAddress || ""}`, client.postcode, activeState);
    if (detectedState !== client.state) {
      setActiveDivision(detectedState);
    }
    onChange({ suburb: val, state: detectedState });
    if (onSiteChange) {
      const detected = detectCouncilFromLocation(
        val,
        `${client.siteAddress || ""} ${client.estate || ""}`,
        client.postcode || "",
        detectedState
      );
      if (detected.region) {
        onSiteChange({
          councilRegion: detected.region,
          councilFee: detected.fee > 0 ? detected.fee : (detectedState === "NSW" ? 2000 : 2227),
        });
      }
    }
  };

  // Address TBA state
  const isAddressTba = Boolean(
    client.siteAddress?.toLowerCase().trim() === "address tba" ||
    client.siteAddress?.toLowerCase().includes("address tba") ||
    client.siteAddress?.toLowerCase().includes("to be advised") ||
    (client.lotNumber === "TBA" && client.suburb === "Location TBA")
  );

  // Progressive disclosure:
  // 1. Contact info is filled if client name is entered AND (phone OR email is entered)
  const hasBasicContactInfo = Boolean(
    client.clientName?.trim() &&
    client.clientName.trim().length >= 2 &&
    (
      Boolean(client.clientPhone && client.clientPhone.trim().length >= 3) ||
      Boolean(client.clientEmail && client.clientEmail.trim().length >= 3)
    )
  );

  // If quote already has site or lot data saved/imported, never hide it
  const hasExistingLotData = Boolean(
    isAddressTba ||
    Boolean(client.siteAddress && client.siteAddress.trim().length > 0) ||
    Boolean(client.suburb && client.suburb.trim().length > 0) ||
    Boolean(client.estate && client.estate.trim().length > 0) ||
    Boolean(client.lotNumber && client.lotNumber.trim().length > 0)
  );

  // Section 2 (Lot info) is unlocked when contact info is filled, or if lot data already exists, or user advanced manually
  const isLotSectionUnlocked = hasBasicContactInfo || hasExistingLotData || manualAdvanceToLot;

  // 2. Lot info is completed if Address TBA is active, or a street address / suburb is provided
  const isLotInfoDone = Boolean(
    isAddressTba ||
    Boolean(client.siteAddress && client.siteAddress.trim().length >= 3 && client.siteAddress !== "Address TBA") ||
    Boolean(client.suburb && client.suburb.trim().length >= 2 && client.suburb !== "Location TBA")
  );

  // Auto-scroll to lot section when unlocked
  useEffect(() => {
    if (isLotSectionUnlocked && !hasExistingLotData && manualAdvanceToLot) {
      setTimeout(() => {
        lotSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 60);
    }
  }, [isLotSectionUnlocked, manualAdvanceToLot, hasExistingLotData]);

  // Auto-detect and sync council region on mount or address changes
  useEffect(() => {
    if (!onSiteChange) return;
    if (isAddressTba) return;
    const addr = client.siteAddress || "";
    const sub = client.suburb || "";
    if (!addr && !sub) return;

    const detectedState = detectStateFromAddress(`${addr} ${sub}`, client.postcode, activeState);
    if (detectedState !== client.state) {
      setActiveDivision(detectedState);
      onChange({ state: detectedState });
    }

    const detected = detectCouncilFromLocation(
      sub,
      `${addr} ${client.estate || ""}`,
      client.postcode || "",
      detectedState
    );
    if (detected.region && site?.councilRegion !== detected.region) {
      onSiteChange({
        councilRegion: detected.region,
        councilFee: detected.fee > 0 ? detected.fee : (detectedState === "NSW" ? 2000 : 2227),
      });
    }
  }, [client.siteAddress, client.suburb, client.estate, client.postcode, activeState, isAddressTba, site?.councilRegion]);

  // Close search suggestions on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const handleToggleAddressTba = () => {
    if (isAddressTba) {
      onChange({
        siteAddress: "",
        suburb: "",
        lotNumber: "",
        estate: "",
        postcode: "",
      });
      if (onSiteChange) {
        const isNsw = (client.state || getActiveDivision()) === "NSW";
        onSiteChange({
          councilRegion: isNsw ? "NSW Local Council (Standard Statutory Fee)" : "Moreton Bay Regional Council",
          councilFee: isNsw ? 2000 : 2227,
        });
      }
      toast.info("Cleared Address TBA. You can now enter a site address.");
    } else {
      const isNsw = (client.state || getActiveDivision()) === "NSW";
      onChange({
        siteAddress: "Address TBA",
        suburb: "Location TBA",
        lotNumber: "TBA",
        estate: "",
        postcode: "",
      });
      if (onSiteChange) {
        onSiteChange({
          councilRegion: isNsw ? "NSW Local Council (Standard Statutory Fee)" : "Council Fee Allowance (No Location Mentioned)",
          councilFee: isNsw ? 2000 : 2200,
        });
      }
      toast.success("Site address set to: Address TBA (Land Not Purchased)");
    }
    setIsSearchOpen(false);
    setSuggestions([]);
  };

  const handleStreetInputChange = (val: string) => {
    const detectedState = detectStateFromAddress(`${val} ${client.suburb || ""}`, client.postcode, activeState);
    if (detectedState !== client.state) {
      setActiveDivision(detectedState);
    }
    const patch: Partial<FullQuote["client"]> = { siteAddress: val, state: detectedState };
    if (isAddressTba && val !== "Address TBA") {
      if (client.suburb === "Location TBA") patch.suburb = "";
      if (client.lotNumber === "TBA") patch.lotNumber = "";
    }
    onChange(patch);

    if (onSiteChange) {
      const detected = detectCouncilFromLocation(
        client.suburb || "",
        `${val} ${client.estate || ""}`,
        client.postcode || "",
        detectedState
      );
      if (detected.region) {
        onSiteChange({
          councilRegion: detected.region,
          councilFee: detected.fee > 0 ? detected.fee : (detectedState === "NSW" ? 2000 : 2227),
        });
      }
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const has2Letters = hasTypedTwoLettersOfStreet(val);

    // STRICT REQUIREMENT: Only auto fill after the client has typed the first 2 letters of the street name!
    if (!has2Letters) {
      setSuggestions([]);
      setIsSearchOpen(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchAustralianAddresses(val, {
          limit: 8,
          state: detectedState,
        });
        setSuggestions(results);
        setIsSearchOpen(results.length > 0);
        setHighlightedIndex(-1);
      } catch (err) {
        console.warn("Address search error:", err);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 200);
  };

  const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
    const fullStreet =
      suggestion.fullStreet ||
      suggestion.formattedAddress.split(",")[0] ||
      suggestion.streetName ||
      "";
    const suburbDisplay = suggestion.postcode
      ? `${suggestion.suburb} ${suggestion.state} ${suggestion.postcode}`
      : `${suggestion.suburb} ${suggestion.state}`.trim();

    const detectedState = suggestion.state === "NSW" ? "NSW" : "QLD";
    setActiveDivision(detectedState);

    const patch: Partial<FullQuote["client"]> = {
      siteAddress: fullStreet,
      suburb: suburbDisplay,
      state: detectedState,
      postcode: suggestion.postcode || client.postcode || "",
    };

    if (suggestion.estate) {
      patch.estate = suggestion.estate;
    }
    if (suggestion.lotNumber) {
      patch.lotNumber = suggestion.lotNumber.toLowerCase().startsWith("lot")
        ? suggestion.lotNumber
        : `Lot ${suggestion.lotNumber}`;
    }

    onChange(patch);
    setIsSearchOpen(false);
    setSuggestions([]);
    setHighlightedIndex(-1);

    if (onSiteChange) {
      const detected = detectCouncilFromLocation(
        suggestion.suburb,
        `${fullStreet} ${suggestion.estate || ""}`,
        suggestion.postcode || "",
        detectedState
      );
      onSiteChange({
        councilRegion: detected.region,
        councilFee: detected.fee > 0 ? detected.fee : (detectedState === "NSW" ? 2000 : 2227),
      });
    }

    toast.success(`Auto-filled address: ${fullStreet}, ${suggestion.suburb}`);
  };

  const handleClearStreet = () => {
    onChange({ siteAddress: "" });
    setSuggestions([]);
    setIsSearchOpen(false);
    streetInputRef.current?.focus();
  };

  const handleStreetKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isSearchOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = highlightedIndex >= 0 ? suggestions[highlightedIndex] : suggestions[0];
      if (target) {
        handleSelectSuggestion(target);
      }
    } else if (e.key === "Tab") {
      if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsSearchOpen(false);
    }
  };


  const handleContinue = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!client.clientName || client.clientName.trim().length === 0) {
      toast.error("Please enter a client name to continue");
      return;
    }
    if (!isLotInfoDone) {
      toast.error("Please enter a site address or toggle 'Address TBA' to continue");
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
    <div className="space-y-8 max-w-7xl 2xl:max-w-[1550px] mx-auto px-2 sm:px-4">
      {/* Header Prompt */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/50 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-xs">
              1
            </span>
            <span className="text-sm uppercase tracking-wider font-extrabold text-emerald-500">Step 1 of 5</span>
          </div>
          <h2 className={`text-3xl sm:text-4xl font-extrabold tracking-tight mt-1.5 ${isLight ? "text-slate-900" : "text-white"}`}>
            Who is this estimate for?
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-1">
            Enter your client's contact details and land address to personalize their quote.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {crmLeads.length > 0 && (
            <Select onValueChange={handleSelectCrmLead}>
              <SelectTrigger
                className={`text-sm h-10 px-3.5 gap-2 font-semibold min-w-[210px] ${
                  isLight
                    ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                    : "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800"
                }`}
              >
                <Users className="h-4 w-4 text-cyan-400" />
                <SelectValue placeholder="Import CRM Lead..." />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {crmLeads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.clientName} {lead.targetEstate ? `• ${lead.targetEstate}` : ""} {lead.suburb ? `(${lead.suburb})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

        </div>
      </div>

      <form onSubmit={handleContinue} className="space-y-8">
        {/* Primary Client Card */}
        <div
          className={`p-6 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all ${
            isLight
              ? "bg-white border-slate-200 shadow-sm"
              : "bg-slate-900/60 border-slate-800/80 backdrop-blur-md"
          }`}
        >
          <div className="flex items-center justify-between gap-2.5 mb-5 flex-wrap">
            <div className="flex items-center gap-2.5">
              <User className="h-5 w-5 text-emerald-400" />
              <h3 className={`text-base sm:text-lg font-bold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-100"}`}>
                Primary Client Information
              </h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {hasBasicContactInfo && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>Contact Details Added</span>
                </span>
              )}
              {client.estimateNumber && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-black tracking-wide border shadow-xs ${
                  isLight 
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300" 
                    : "bg-emerald-950/60 text-emerald-400 border-emerald-500/40"
                }`}>
                  <span className="opacity-75 text-[11px] font-bold uppercase">Estimate</span> #{client.estimateNumber.replace(/^#/, "")}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2 space-y-2">
              <Label className={`text-sm font-bold ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                Client Full Name <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="e.g. David Miller"
                value={client.clientName || ""}
                onChange={(e) => onChange({ clientName: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (client.clientName || "").trim().length >= 2) {
                    e.preventDefault();
                    setManualAdvanceToLot(true);
                  }
                }}
                className={`text-base h-12 rounded-xl px-4 ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-emerald-600"
                    : "bg-slate-950/80 border-slate-800 text-white focus:border-emerald-500"
                }`}
              />
            </div>

            <div className="space-y-2">
              <Label className={`text-sm font-bold flex items-center gap-2 ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                <Phone className="h-4 w-4 text-slate-400" /> Contact Phone
              </Label>
              <Input
                type="tel"
                placeholder="e.g. 0412 345 678"
                value={client.clientPhone || ""}
                onChange={(e) => onChange({ clientPhone: e.target.value })}
                className={`text-base h-12 rounded-xl px-4 ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                    : "bg-slate-950/80 border-slate-800 text-white"
                }`}
              />
            </div>

            <div className="space-y-2">
              <Label className={`text-sm font-bold flex items-center gap-2 ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                <Mail className="h-4 w-4 text-slate-400" /> Email Address
              </Label>
              <Input
                type="email"
                placeholder="e.g. david.miller@example.com.au"
                value={client.clientEmail || ""}
                onChange={(e) => onChange({ clientEmail: e.target.value })}
                className={`text-base h-12 rounded-xl px-4 ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                    : "bg-slate-950/80 border-slate-800 text-white"
                }`}
              />
            </div>
          </div>

          {/* Little tab "Add 2nd client" positioned directly below 1st client details */}
          <div className="mt-5 pt-4 flex items-center justify-start border-t border-slate-700/20">
            <button
              type="button"
              onClick={handleToggleClient2}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border cursor-pointer ${
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
                  <UserMinus className="h-4 w-4" />
                  <span>Remove 2nd Client</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <Label className={`text-sm font-bold ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                    Full Name
                  </Label>
                  <Input
                    placeholder="e.g. Sarah Miller"
                    value={client.client2Name || ""}
                    onChange={(e) => onChange({ client2Name: e.target.value })}
                    className={`text-base h-12 rounded-xl px-4 ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                        : "bg-slate-950/80 border-slate-800 text-white"
                    }`}
                  />
                </div>

                <div className="space-y-2">
                  <Label className={`text-sm font-bold ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                    Phone
                  </Label>
                  <Input
                    type="tel"
                    placeholder="e.g. 0423 456 789"
                    value={client.client2Phone || ""}
                    onChange={(e) => onChange({ client2Phone: e.target.value })}
                    className={`text-base h-12 rounded-xl px-4 ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                        : "bg-slate-950/80 border-slate-800 text-white"
                    }`}
                  />
                </div>

                <div className="space-y-2">
                  <Label className={`text-sm font-bold ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                    Email
                  </Label>
                  <Input
                    type="email"
                    placeholder="e.g. sarah.miller@example.com.au"
                    value={client.client2Email || ""}
                    onChange={(e) => onChange({ client2Email: e.target.value })}
                    className={`text-base h-12 rounded-xl px-4 ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                        : "bg-slate-950/80 border-slate-800 text-white"
                    }`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Quick manual unlock if user provided name only */}
          {!isLotSectionUnlocked && (client.clientName || "").trim().length >= 2 && (
            <div className="mt-5 pt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-t border-slate-700/20">
              <span className={isLight ? "text-slate-500" : "text-slate-400"}>
                Enter phone or email to auto-unlock site &amp; lot details, or proceed with name only:
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setManualAdvanceToLot(true)}
                className={`text-xs h-8 px-3 gap-1.5 font-semibold cursor-pointer shrink-0 ${
                  isLight
                    ? "border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    : "border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <span>Proceed to Site Details</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>


        {/* Progressive Disclosure: Section 2 (Lot info) */}
        {!isLotSectionUnlocked ? (
          <div
            className={`p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-dashed transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              isLight
                ? "bg-slate-50/70 border-slate-300 text-slate-500"
                : "bg-slate-900/30 border-slate-800/80 text-slate-400"
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                isLight ? "bg-slate-200 text-slate-600" : "bg-slate-800 text-slate-400"
              }`}>
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h3 className={`text-base font-bold uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                  Proposed Site / Property Location
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete client contact info above to reveal lot number and site address fields.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-200/50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                <Lock className="h-3 w-3" />
                <span>Awaiting Contact Info</span>
              </span>
            </div>
          </div>
        ) : (
          /* Land / Site Location Card */
          <div
            ref={lotSectionRef}
            className={`p-6 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
              isLight
                ? "bg-white border-slate-200 shadow-sm"
                : "bg-slate-900/60 border-slate-800/80 backdrop-blur-md"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <MapPin className="h-5 w-5 text-cyan-400" />
                  <h3 className={`text-base sm:text-lg font-bold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-100"}`}>
                    Proposed Site / Property Location
                  </h3>
                </div>
                {isLotInfoDone && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>Location Set</span>
                  </span>
                )}
              </div>

            {/* Address TBA Option Toggle */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={handleToggleAddressTba}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border cursor-pointer ${
                  isAddressTba
                    ? isLight
                      ? "bg-amber-100 text-amber-900 border-amber-400 shadow-xs ring-2 ring-amber-400/30"
                      : "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm ring-1 ring-amber-400/40"
                    : isLight
                    ? "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                    : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <MapPinOff className="h-4 w-4" />
                <span>{isAddressTba ? "✓ Address TBA Active" : "Address TBA (Land Not Purchased)"}</span>
              </button>
            </div>
          </div>

          {/* Active Address TBA Banner */}
          {isAddressTba && (
            <div
              className={`mb-5 p-4 rounded-xl border flex items-center justify-between gap-3 text-sm animate-in fade-in duration-200 ${
                isLight
                  ? "bg-amber-50/90 border-amber-300 text-amber-950"
                  : "bg-amber-950/30 border-amber-500/40 text-amber-300"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                <span>
                  <strong>Address TBA Active:</strong> Using provisional allowances and standard statutory fee schedule. Type a street address below at any time to switch to a specific allotment.
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleAddressTba}
                className="text-xs underline font-bold shrink-0 hover:opacity-80 cursor-pointer"
              >
                Clear TBA
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Street Address Input with 2-Letter Auto-Fill Trigger */}
            <div ref={searchContainerRef} className="space-y-2 relative">
              <div className="flex items-center justify-between">
                <Label className={`text-sm font-bold ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                  Street Address
                </Label>
                {hasTypedTwoLettersOfStreet(client.siteAddress || "") ? (
                  <span className="text-xs font-semibold text-emerald-500 dark:text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Auto-fill active
                  </span>
                ) : !isAddressTba && (client.siteAddress || "").trim().length > 0 ? (
                  <span className="text-xs text-slate-400">
                    Type 2 letters of street name to auto-fill
                  </span>
                ) : null}
              </div>

              <div className="relative flex items-center">
                <MapPin className="absolute left-4 h-4 w-4 text-cyan-400 pointer-events-none select-none z-10" />
                <Input
                  ref={streetInputRef}
                  placeholder="e.g. 24 Bottletree Circuit / Lot 108 Sanctuary Blvd"
                  value={client.siteAddress || ""}
                  onChange={(e) => handleStreetInputChange(e.target.value)}
                  onKeyDown={handleStreetKeyDown}
                  onFocus={() => {
                    if (suggestions.length > 0 && hasTypedTwoLettersOfStreet(client.siteAddress || "")) {
                      setIsSearchOpen(true);
                    }
                  }}
                  autoComplete="off"
                  spellCheck={false}
                  className={`text-base h-12 pl-11 pr-16 rounded-xl ${
                    isLight
                      ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-cyan-500"
                      : "bg-slate-950/80 border-slate-800 text-white focus:border-cyan-500"
                  }`}
                />

                <div className="absolute right-3 flex items-center gap-1 z-10">
                  {isSearching && <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />}
                  {client.siteAddress && (
                    <button
                      type="button"
                      onClick={handleClearStreet}
                      className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
                      title="Clear address"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Helper guidance hint if user typed numbers only without 2 letters of street name yet */}
              {!isAddressTba &&
                (client.siteAddress || "").trim().length > 0 &&
                !hasTypedTwoLettersOfStreet(client.siteAddress || "") && (
                  <p className="text-xs text-slate-400 italic">
                    Type at least 2 letters of the street name (e.g. &quot;24 Bo...&quot;) to trigger address auto-fill.
                  </p>
                )}

              {/* Suggestions Dropdown */}
              {isSearchOpen && suggestions.length > 0 && hasTypedTwoLettersOfStreet(client.siteAddress || "") && (
                <div
                  role="listbox"
                  className={`absolute left-0 right-0 top-full mt-2 z-50 max-h-80 overflow-y-auto rounded-2xl border p-2 space-y-1 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 ${
                    isLight
                      ? "bg-white/95 border-slate-300 text-slate-900 shadow-slate-900/10"
                      : "bg-slate-950/95 border-cyan-500/40 text-slate-100 shadow-black/80"
                  }`}
                >
                  <div className="px-3.5 py-2 flex items-center justify-between border-b border-slate-700/30 text-xs text-slate-400">
                    <span className="font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      Suggested Addresses ({suggestions.length})
                    </span>
                    <span className="text-xs font-mono text-slate-400">Click or Press Enter to Auto-Fill</span>
                  </div>

                  {suggestions.map((item, idx) => {
                    const isHighlighted = idx === highlightedIndex;
                    return (
                      <div
                        key={item.id || idx}
                        role="option"
                        aria-selected={isHighlighted}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        onClick={() => handleSelectSuggestion(item)}
                        className={`group flex items-start gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer transition-all ${
                          isHighlighted
                            ? isLight
                              ? "bg-cyan-50 border border-cyan-400 text-cyan-950 shadow-xs"
                              : "bg-cyan-500/15 border border-cyan-500/40 text-cyan-100 shadow-sm"
                            : isLight
                            ? "hover:bg-slate-50 border border-transparent text-slate-800"
                            : "hover:bg-slate-900/80 border border-transparent text-slate-200"
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          <div
                            className={`p-1.5 rounded-lg transition-colors ${
                              isHighlighted
                                ? "bg-cyan-500/20 text-cyan-400"
                                : isLight
                                ? "bg-slate-100 text-slate-500 group-hover:text-cyan-600"
                                : "bg-slate-800 text-slate-400 group-hover:text-cyan-400"
                            }`}
                          >
                            <MapPin className="h-4 w-4" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.lotNumber && (
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40">
                                Lot {item.lotNumber}
                              </span>
                            )}
                            <span
                              className={`text-sm font-bold truncate ${
                                isHighlighted
                                  ? isLight
                                    ? "text-cyan-900"
                                    : "text-cyan-200"
                                  : isLight
                                  ? "text-slate-900 group-hover:text-cyan-700"
                                  : "text-slate-100 group-hover:text-cyan-300"
                              }`}
                            >
                              {item.fullStreet || item.formattedAddress.split(",")[0]}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 mt-0.5 text-xs text-slate-400">
                            <span className="truncate">{item.suburb}</span>
                            <span className="font-bold text-cyan-500 dark:text-cyan-400 font-mono">{item.state}</span>
                            {item.postcode && <span className="font-mono">{item.postcode}</span>}
                          </div>

                          {(item.estate || item.council) && (
                            <div className="flex items-center gap-2 mt-1">
                              {item.estate && (
                                <span className="px-2 py-0.5 rounded text-[10.5px] font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 truncate max-w-[240px]">
                                  {item.estate}
                                </span>
                              )}
                              {item.council && (
                                <span className="text-[11px] text-slate-400 truncate">
                                  {item.council}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="shrink-0 self-center text-xs font-semibold flex items-center gap-1 text-emerald-500">
                          <span className="text-[11px] hidden group-hover:inline">Auto-fill</span>
                          <Check className="h-4 w-4" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Suburb / Postcode Input */}
            <div className="space-y-2">
              <Label className={`text-sm font-bold ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                Suburb / Postcode
              </Label>
              <Input
                placeholder="e.g. Narangba QLD 4504 or Penrith NSW 2750"
                value={client.suburb || ""}
                onChange={(e) => handleSuburbChange(e.target.value)}
                className={`text-base h-12 rounded-xl px-4 ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-cyan-500"
                    : "bg-slate-950/80 border-slate-800 text-white focus:border-cyan-500"
                }`}
              />
            </div>

            {/* Auto-Detected Jurisdiction & Council */}
            <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
              isLight
                ? "bg-slate-50/80 border-slate-200"
                : "bg-slate-900/60 border-slate-800"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <Label className={`text-sm font-bold ${isLight ? "text-slate-800" : "text-white"}`}>
                    Jurisdiction &amp; Council
                  </Label>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    activeState === "NSW"
                      ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                      : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  }`}>
                    {activeState === "NSW" ? "NSW Division" : "QLD Division"}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5" /> Auto-Detected
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pt-1">
                <div>
                  <div className={`font-semibold ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                    {site?.councilRegion || (activeState === "NSW" ? "NSW Local Council (Standard Statutory Fee)" : "Moreton Bay Regional Council")}
                  </div>
                  <div className={`text-[11px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                    Determined automatically by login &amp; address
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:text-right">
                  <div className={`font-bold text-sm ${isLight ? "text-slate-900" : "text-emerald-400"}`}>
                    ${((site?.councilFee ?? (activeState === "NSW" ? 2000 : 2227))).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                    Statutory Fee
                  </div>
                </div>
              </div>
            </div>

            {/* Estate Name Input */}
            <div className="space-y-2">
              <Label className={`text-sm font-bold flex items-center gap-2 ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                <Building className="h-4 w-4 text-slate-400" /> Estate Name (Optional)
              </Label>
              <Input
                placeholder="e.g. Ridgeview Estate"
                value={client.estate || ""}
                onChange={(e) => onChange({ estate: e.target.value })}
                className={`text-base h-12 rounded-xl px-4 ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-cyan-500"
                    : "bg-slate-950/80 border-slate-800 text-white focus:border-cyan-500"
                }`}
              />
            </div>

            {/* Lot Number Input */}
            <div className="space-y-2">
              <Label className={`text-sm font-bold ${isLight ? "text-slate-700" : "text-slate-200"}`}>
                Lot Number (Optional)
              </Label>
              <Input
                placeholder="e.g. Lot 412"
                value={client.lotNumber || ""}
                onChange={(e) => onChange({ lotNumber: e.target.value })}
                className={`text-base h-12 rounded-xl px-4 ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-cyan-500"
                    : "bg-slate-950/80 border-slate-800 text-white focus:border-cyan-500"
                }`}
              />
            </div>
          </div>
        </div>
      )}

        {/* Continue to Step 2: Only show once lot info is done */}
        {isLotSectionUnlocked && (
          isLotInfoDone ? (
            <div className="flex justify-end pt-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <Button
                type="submit"
                size="lg"
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold px-10 shadow-lg shadow-emerald-500/20 gap-2.5 cursor-pointer h-14 text-base rounded-xl"
              >
                Continue to Floor Plan &amp; Inclusions
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <div className={`p-4 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all animate-in fade-in duration-200 ${
              isLight ? "bg-slate-50 border-slate-200 text-slate-600" : "bg-slate-900/40 border-slate-800 text-slate-400"
            }`}>
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>
                  Enter a street address, select a suburb, or toggle <strong>Address TBA</strong> above to proceed to Floor Plans &amp; Inclusions.
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleToggleAddressTba}
                className="text-xs h-7 px-2.5 font-bold text-cyan-500 hover:text-cyan-400 cursor-pointer self-start sm:self-center"
              >
                Use Address TBA &rarr;
              </Button>
            </div>
          )
        )}
      </form>
    </div>
  );
}
