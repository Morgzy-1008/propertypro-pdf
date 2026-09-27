import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Loader2, X, Building, Check } from "lucide-react";
import { searchAustralianAddresses, type AddressSuggestion } from "@/lib/address/addressService";

export interface AddressAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectAddress: (address: AddressSuggestion) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  stateFilter?: string;
  limit?: number;
  id?: string;
  "aria-label"?: string;
}

export const AddressAutocompleteInput: React.FC<AddressAutocompleteInputProps> = ({
  value,
  onChange,
  onSelectAddress,
  placeholder = "Start typing street address, lot, or suburb...",
  className = "",
  disabled = false,
  autoFocus = false,
  stateFilter,
  limit = 10,
  id,
  "aria-label": ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<any>(null);

  // Debounced address search
  const performSearch = useCallback(
    async (query: string) => {
      const q = query.trim();
      if (q.length < 2) {
        setSuggestions([]);
        setIsOpen(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const results = await searchAustralianAddresses(q, { limit, state: stateFilter });
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setHighlightedIndex(-1);
      } catch (err) {
        console.warn("Address search failed:", err);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [limit, stateFilter]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(val);
    }, 250);
  };

  const handleSelect = (suggestion: AddressSuggestion) => {
    onSelectAddress(suggestion);
    setIsOpen(false);
    setSuggestions([]);
    setHighlightedIndex(-1);
  };

  const handleClear = () => {
    onChange("");
    setSuggestions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === "ArrowDown" && value.trim().length >= 2) {
        performSearch(value);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <MapPin className="absolute left-2.5 h-3.5 w-3.5 text-cyan-400 pointer-events-none select-none z-10" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
            else if (value.trim().length >= 2) performSearch(value);
          }}
          disabled={disabled}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-label={ariaLabel || placeholder}
          autoComplete="off"
          spellCheck={false}
          className={`w-full pl-8 pr-14 py-1.5 rounded-lg border text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-cyan-500/50 ${
            disabled ? "opacity-50 cursor-not-allowed" : ""
          } ${className}`}
        />

        <div className="absolute right-2 flex items-center gap-1 z-10">
          {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />}
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
              title="Clear address"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown List */}
      {isOpen && suggestions.length > 0 && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-72 overflow-y-auto rounded-xl border border-cyan-500/30 bg-slate-950/95 backdrop-blur-md shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-2 py-1 flex items-center justify-between border-b border-slate-800/80 text-[10px] text-slate-400">
            <span className="font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
              <Building className="h-3 w-3" />
              Suggested Australian Addresses ({suggestions.length})
            </span>
            <span className="text-[9px] text-slate-500 font-mono">Click or Enter to Auto-Fill</span>
          </div>

          {suggestions.map((item, idx) => {
            const isHighlighted = idx === highlightedIndex;
            return (
              <div
                key={item.id || idx}
                role="option"
                aria-selected={isHighlighted}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onClick={() => handleSelect(item)}
                className={`group flex items-start gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all ${
                  isHighlighted
                    ? "bg-cyan-500/15 border border-cyan-500/40 text-cyan-100 shadow-sm"
                    : "hover:bg-slate-900/80 border border-transparent text-slate-200"
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  <div className={`p-1 rounded-md transition-colors ${
                    isHighlighted ? "bg-cyan-500/20 text-cyan-300" : "bg-slate-800 text-slate-400 group-hover:text-cyan-400"
                  }`}>
                    <MapPin className="h-3 w-3" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.lotNumber && (
                      <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Lot {item.lotNumber}
                      </span>
                    )}
                    <span className="text-xs font-semibold text-slate-100 group-hover:text-cyan-300 truncate">
                      {item.fullStreet || item.formattedAddress.split(",")[0]}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                    <span className="truncate">{item.suburb}</span>
                    <span className="font-bold text-cyan-400/90 font-mono">{item.state}</span>
                    {item.postcode && (
                      <span className="text-slate-400 font-mono">{item.postcode}</span>
                    )}
                  </div>

                  {(item.estate || item.council) && (
                    <div className="flex items-center gap-1.5 mt-1">
                      {item.estate && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 truncate max-w-[200px]">
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

                {isHighlighted && (
                  <div className="shrink-0 self-center text-cyan-400">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
