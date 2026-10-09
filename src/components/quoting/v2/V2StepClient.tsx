import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { FullQuote, SiteConditions } from "@/lib/quoting/quoteTypes";
import { toast } from "sonner";
import { searchAustralianAddresses, type AddressSuggestion } from "@/lib/address/addressService";
import { detectCouncilFromLocation } from "@/lib/quoting/quoteEngine";
import { getActiveDivision } from "@/lib/divisionContext";

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
  onChange: (patch: Partial<FullQuote["client"]>) => void;
  onSiteChange?: (patch: Partial<SiteConditions>) => void;
  onNext: () => void;
  isLight: boolean;
}

export function V2StepClient({
  client,
  onChange,
  onSiteChange,
  onNext,
  isLight,
}: V2StepClientProps) {
  const [showClient2, setShowClient2] = useState(Boolean(client.hasClient2 || client.client2Name));

  // Address search and autofill states
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const streetInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<any>(null);

  // Address TBA state
  const isAddressTba = Boolean(
    client.siteAddress?.toLowerCase().trim() === "address tba" ||
    client.siteAddress?.toLowerCase().includes("address tba") ||
    client.siteAddress?.toLowerCase().includes("to be advised") ||
    (client.lotNumber === "TBA" && client.suburb === "Location TBA")
  );

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
    const patch: Partial<FullQuote["client"]> = { siteAddress: val };
    if (isAddressTba && val !== "Address TBA") {
      if (client.suburb === "Location TBA") patch.suburb = "";
      if (client.lotNumber === "TBA") patch.lotNumber = "";
    }
    onChange(patch);

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
          state: client.state || "QLD",
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

    const patch: Partial<FullQuote["client"]> = {
      siteAddress: fullStreet,
      suburb: suburbDisplay,
      state: (suggestion.state === "NSW" ? "NSW" : "QLD"),
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
      const activeState = (suggestion.state === "NSW" ? "NSW" : "QLD");
      const detected = detectCouncilFromLocation(
        suggestion.suburb,
        `${fullStreet} ${suggestion.estate || ""}`,
        suggestion.postcode || "",
        activeState
      );
      onSiteChange({
        councilRegion: detected.region,
        councilFee: detected.fee,
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-cyan-400" />
              <h3 className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                Proposed Site / Property Location
              </h3>
            </div>

            {/* Address TBA Option Toggle */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={handleToggleAddressTba}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border cursor-pointer ${
                  isAddressTba
                    ? isLight
                      ? "bg-amber-100 text-amber-900 border-amber-400 shadow-xs ring-2 ring-amber-400/30"
                      : "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm ring-1 ring-amber-400/40"
                    : isLight
                    ? "bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200"
                    : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <MapPinOff className="h-3.5 w-3.5" />
                <span>{isAddressTba ? "✓ Address TBA Active" : "Address TBA (Land Not Purchased)"}</span>
              </button>
            </div>
          </div>

          {/* Active Address TBA Banner */}
          {isAddressTba && (
            <div
              className={`mb-4 p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs animate-in fade-in duration-200 ${
                isLight
                  ? "bg-amber-50/90 border-amber-300 text-amber-950"
                  : "bg-amber-950/30 border-amber-500/40 text-amber-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                <span>
                  <strong>Address TBA Active:</strong> Using provisional allowances and standard statutory fee schedule. Type a street address below at any time to switch to a specific allotment.
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleAddressTba}
                className="text-[11px] underline font-bold shrink-0 hover:opacity-80 cursor-pointer"
              >
                Clear TBA
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Street Address Input with 2-Letter Auto-Fill Trigger */}
            <div ref={searchContainerRef} className="space-y-1.5 relative">
              <div className="flex items-center justify-between">
                <Label className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                  Street Address
                </Label>
                {hasTypedTwoLettersOfStreet(client.siteAddress || "") ? (
                  <span className="text-[10px] font-semibold text-emerald-500 dark:text-emerald-400 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Auto-fill active
                  </span>
                ) : !isAddressTba && (client.siteAddress || "").trim().length > 0 ? (
                  <span className="text-[10px] text-slate-400">
                    Type 2 letters of street name to auto-fill
                  </span>
                ) : null}
              </div>

              <div className="relative flex items-center">
                <MapPin className="absolute left-3.5 h-4 w-4 text-cyan-400 pointer-events-none select-none z-10" />
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
                  className={`text-sm h-11 pl-10 pr-16 ${
                    isLight
                      ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-cyan-500"
                      : "bg-slate-950/80 border-slate-800 text-white focus:border-cyan-500"
                  }`}
                />

                <div className="absolute right-2.5 flex items-center gap-1 z-10">
                  {isSearching && <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />}
                  {client.siteAddress && (
                    <button
                      type="button"
                      onClick={handleClearStreet}
                      className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
                      title="Clear address"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Helper guidance hint if user typed numbers only without 2 letters of street name yet */}
              {!isAddressTba &&
                (client.siteAddress || "").trim().length > 0 &&
                !hasTypedTwoLettersOfStreet(client.siteAddress || "") && (
                  <p className="text-[10px] text-slate-400 italic">
                    Type at least 2 letters of the street name (e.g. &quot;24 Bo...&quot;) to trigger address auto-fill.
                  </p>
                )}

              {/* Suggestions Dropdown */}
              {isSearchOpen && suggestions.length > 0 && hasTypedTwoLettersOfStreet(client.siteAddress || "") && (
                <div
                  role="listbox"
                  className={`absolute left-0 right-0 top-full mt-1.5 z-50 max-h-72 overflow-y-auto rounded-2xl border p-1.5 space-y-1 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 ${
                    isLight
                      ? "bg-white/95 border-slate-300 text-slate-900 shadow-slate-900/10"
                      : "bg-slate-950/95 border-cyan-500/40 text-slate-100 shadow-black/80"
                  }`}
                >
                  <div className="px-3 py-1.5 flex items-center justify-between border-b border-slate-700/30 text-[10px] text-slate-400">
                    <span className="font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3" />
                      Suggested Addresses ({suggestions.length})
                    </span>
                    <span className="text-[9.5px] font-mono text-slate-400">Click or Press Enter to Auto-Fill</span>
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
                        className={`group flex items-start gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition-all ${
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
                            className={`p-1 rounded-md transition-colors ${
                              isHighlighted
                                ? "bg-cyan-500/20 text-cyan-400"
                                : isLight
                                ? "bg-slate-100 text-slate-500 group-hover:text-cyan-600"
                                : "bg-slate-800 text-slate-400 group-hover:text-cyan-400"
                            }`}
                          >
                            <MapPin className="h-3.5 w-3.5" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {item.lotNumber && (
                              <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-amber-500/20 text-amber-500 dark:text-amber-300 border border-amber-500/40">
                                Lot {item.lotNumber}
                              </span>
                            )}
                            <span
                              className={`text-xs font-bold truncate ${
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

                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                            <span className="truncate">{item.suburb}</span>
                            <span className="font-bold text-cyan-500 dark:text-cyan-400 font-mono">{item.state}</span>
                            {item.postcode && <span className="font-mono">{item.postcode}</span>}
                          </div>

                          {(item.estate || item.council) && (
                            <div className="flex items-center gap-1.5 mt-1">
                              {item.estate && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 truncate max-w-[200px]">
                                  {item.estate}
                                </span>
                              )}
                              {item.council && (
                                <span className="text-[9.5px] text-slate-400 truncate">
                                  {item.council}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="shrink-0 self-center text-xs font-semibold flex items-center gap-1 text-emerald-500">
                          <span className="text-[10px] hidden group-hover:inline">Auto-fill</span>
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Suburb / Postcode Input */}
            <div className="space-y-1.5">
              <Label className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                Suburb / Postcode
              </Label>
              <Input
                placeholder="e.g. Narangba QLD 4504"
                value={client.suburb || ""}
                onChange={(e) => onChange({ suburb: e.target.value })}
                className={`text-sm h-11 ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-cyan-500"
                    : "bg-slate-950/80 border-slate-800 text-white focus:border-cyan-500"
                }`}
              />
            </div>

            {/* Estate Name Input */}
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
                    ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-cyan-500"
                    : "bg-slate-950/80 border-slate-800 text-white focus:border-cyan-500"
                }`}
              />
            </div>

            {/* Lot Number Input */}
            <div className="space-y-1.5">
              <Label className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                Lot Number (Optional)
              </Label>
              <Input
                placeholder="e.g. Lot 412"
                value={client.lotNumber || ""}
                onChange={(e) => onChange({ lotNumber: e.target.value })}
                className={`text-sm h-11 ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-cyan-500"
                    : "bg-slate-950/80 border-slate-800 text-white focus:border-cyan-500"
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
