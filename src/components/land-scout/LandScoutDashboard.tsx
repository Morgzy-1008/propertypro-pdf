import { useState, useMemo, useEffect } from "react";
import {
  Search,
  SlidersHorizontal,
  LayoutGrid,
  Table as TableIcon,
  RotateCcw,
  Compass,
  ExternalLink,
  Loader2,
  Trash2,
  MapPin,
  Building,
  User,
  Phone,
  Mail,
  ArrowRight,
} from "lucide-react";
import {
  type LandParcel,
  type LandScoutFilterState,
} from "@/lib/land-scout/landScoutTypes";
import {
  getLandParcels,
  purgeOldTestParcels,
  clearAllLandParcels,
  bulkAddOrUpdateParcels,
} from "@/lib/land-scout/landScoutStorage";
import {
  searchDatabaseLotsAsParcels,
  syncAllDatabaseLots,
  searchLiveWebForLand,
  hasSystemSavedApiKey,
  clearGeminiApiKey,
} from "@/lib/land-scout/landScoutWebSearch";
import { LandParcelCard } from "./LandParcelCard";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme";

const POPULAR_CORRIDORS = [
  "Box Hill",
  "Austral",
  "Flagstone",
  "Ripley",
  "Calderwood",
  "Warnervale",
  "Marsden Park",
  "Lilywood",
];

export function LandScoutDashboard() {
  const navigate = useNavigate();
  const { mode } = useTheme();
  const isLight = mode === "normal";

  // Data State
  const [parcels, setParcels] = useState<LandParcel[]>([]);

  // View Mode: grid | table
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Web Search State
  const [isWebSearching, setIsWebSearching] = useState(false);
  const [searchStatusMsg, setSearchStatusMsg] = useState("");

  // Filter & Search State
  const [filterState, setFilterState] = useState<LandScoutFilterState>({
    searchQuery: "",
    state: "ALL",
    suburbOrEstate: "",
    sortBy: "price_asc",
  });

  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Load parcels on mount - Purge any old test items first
  useEffect(() => {
    if (hasSystemSavedApiKey()) {
      clearGeminiApiKey();
    }
    purgeOldTestParcels();
    const existing = getLandParcels();
    if (existing.length > 0) {
      const dedupedExisting = Array.from(new Map(existing.map((p) => [p.id, p])).values());
      setParcels(dedupedExisting);
    } else {
      // Auto-load available Hudson database lots as initial inventory
      const initialLots = searchDatabaseLotsAsParcels("");
      if (initialLots.length > 0) {
        bulkAddOrUpdateParcels(initialLots);
        setParcels(initialLots);
      }
    }
  }, []);

  // Search execution
  const handleExecuteSearch = async (overrideQuery?: string) => {
    const query = (overrideQuery ?? filterState.searchQuery).trim();
    if (!query) {
      toast.info("Please enter a suburb, estate, or area to search (e.g. 'Box Hill' or 'Flagstone').");
      return;
    }

    setIsWebSearching(true);
    setSearchStatusMsg(`Searching available vacant blocks in "${query}"...`);

    try {
      const result = await searchLiveWebForLand(query, filterState.state);
      const updated = getLandParcels();
      const deduped = Array.from(new Map(updated.map((p) => [p.id, p])).values());
      setParcels(deduped);
      if (result.parcels.length > 0) {
        toast.success(`Found ${result.parcels.length} available blocks for "${query}"!`);
      } else {
        toast.info(`No active vacant blocks found for "${query}".`, {
          description: "Try searching another area like Box Hill, Flagstone, Ripley, or Austral.",
        });
      }
    } catch (err: any) {
      console.warn("Search fallback:", err);
      const fallbackLots = searchDatabaseLotsAsParcels(query);
      if (fallbackLots.length > 0) {
        bulkAddOrUpdateParcels(fallbackLots);
        const updated = getLandParcels();
        const deduped = Array.from(new Map(updated.map((p) => [p.id, p])).values());
        setParcels(deduped);
        toast.success(`Loaded ${fallbackLots.length} available blocks for "${query}" from Hudson's database!`);
      } else {
        toast.info(`No active vacant blocks found matching "${query}".`);
      }
    } finally {
      setIsWebSearching(false);
      setSearchStatusMsg("");
    }
  };

  // Quick Corridor Click
  const handleQuickCorridorSearch = (suburb: string) => {
    setFilterState((prev) => ({ ...prev, searchQuery: suburb, suburbOrEstate: suburb }));
    handleExecuteSearch(suburb);
  };

  // Load all Hudson database inventory
  const handleLoadAllDatabaseLots = () => {
    const synced = syncAllDatabaseLots();
    setParcels(synced);
    setFilterState((prev) => ({ ...prev, searchQuery: "", suburbOrEstate: "" }));
    toast.success(`Loaded all ${synced.length} vacant blocks across Hudson's network!`);
  };

  // Clear all parcels
  const handleClearAll = () => {
    clearAllLandParcels();
    setParcels([]);
    toast.info("Cleared land listings.");
  };

  // Reset Filters
  const handleResetFilters = () => {
    setFilterState({
      searchQuery: "",
      state: "ALL",
      suburbOrEstate: "",
      sortBy: "price_asc",
    });
    toast.info("Filters reset.");
  };

  // Filter & Sort Logic
  const filteredParcels = useMemo(() => {
    return parcels
      .filter((p) => {
        // State Filter
        if (filterState.state !== "ALL" && p.state !== filterState.state) {
          return false;
        }

        // Suburb / Estate Filter
        if (filterState.suburbOrEstate) {
          const needle = filterState.suburbOrEstate.toLowerCase();
          const match =
            p.suburb.toLowerCase().includes(needle) ||
            p.estate.toLowerCase().includes(needle) ||
            p.council.toLowerCase().includes(needle);
          if (!match) return false;
        }

        // Price Filters
        if (filterState.minPrice && p.price < filterState.minPrice) return false;
        if (filterState.maxPrice && p.price > filterState.maxPrice) return false;

        // Land Size Filters
        if (filterState.minLandSize && p.landSizeM2 < filterState.minLandSize) return false;
        if (filterState.maxLandSize && p.landSizeM2 > filterState.maxLandSize) return false;

        // Frontage Filter
        if (filterState.minFrontage && p.frontageM < filterState.minFrontage) return false;

        // Registered Only
        if (filterState.isRegisteredOnly && !p.isRegistered) return false;

        // Search Query Text Filter (filter within loaded parcels)
        if (filterState.searchQuery) {
          const q = filterState.searchQuery.toLowerCase().trim();
          const haystack = `${p.lotNumber} ${p.streetAddress} ${p.suburb} ${p.estate} ${p.postcode} ${p.state} ${p.council} ${p.agentName} ${p.agentAgency} ${p.sourcePortal}`.toLowerCase();
          if (!haystack.includes(q)) {
            // Also test individual tokens (e.g. "Box Hill 450")
            const tokens = q.split(/\s+/).filter((t) => t.length > 2);
            if (tokens.length === 0 || !tokens.every((t) => haystack.includes(t))) {
              return false;
            }
          }
        }

        return true;
      })
      .sort((a, b) => {
        switch (filterState.sortBy) {
          case "price_asc":
            return a.price - b.price;
          case "price_desc":
            return b.price - a.price;
          case "size_desc":
            return b.landSizeM2 - a.landSizeM2;
          case "frontage_desc":
            return b.frontageM - a.frontageM;
          case "newest":
          default:
            return b.isRegistered ? 1 : -1;
        }
      });
  }, [parcels, filterState]);

  return (
    <div className={`min-h-screen ${isLight ? "bg-slate-50 text-slate-900" : "bg-slate-950 text-slate-100"} font-sans selection:bg-brand-gold/30 pb-20`}>
      {/* Top Header */}
      <header className={`border-b ${isLight ? "border-slate-200 bg-white/95" : "border-slate-800/80 bg-slate-900/60"} backdrop-blur-md sticky top-0 z-30`}>
        <div className="max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-gold to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-md">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-base font-extrabold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                  Hudson Land Scout
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 uppercase">
                  Vacant Land Search
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Search and browse available vacant land blocks across QLD and NSW
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Division Toggle */}
            <div className="hidden sm:flex rounded-xl border border-slate-800 bg-slate-900 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterState((p) => ({ ...p, state: "ALL" }))}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  filterState.state === "ALL"
                    ? "bg-brand-gold text-slate-950 shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                All States
              </button>
              <button
                type="button"
                onClick={() => setFilterState((p) => ({ ...p, state: "QLD" }))}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  filterState.state === "QLD"
                    ? "bg-brand-gold text-slate-950 shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                QLD Division
              </button>
              <button
                type="button"
                onClick={() => setFilterState((p) => ({ ...p, state: "NSW" }))}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  filterState.state === "NSW"
                    ? "bg-brand-gold text-slate-950 shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                NSW Division
              </button>
            </div>

            {parcels.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                title="Clear loaded listings"
                className="p-1.5 rounded-xl border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}

            {/* Back to Hub Button */}
            <button
              type="button"
              onClick={() => navigate({ to: "/hub" })}
              className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
            >
              Hub
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-6 space-y-6">
        {/* Search Bar Container */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-950/80 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={filterState.searchQuery}
                onChange={(e) =>
                  setFilterState((p) => ({ ...p, searchQuery: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleExecuteSearch();
                  }
                }}
                placeholder="Search suburb, estate, postcode, or area (e.g. 'Box Hill', 'Flagstone', 'Ripley', 'Austral')..."
                className="w-full h-10 pl-10 pr-10 rounded-xl border border-slate-700 bg-slate-950 text-sm text-slate-100 placeholder:text-slate-500 font-medium focus:outline-hidden focus:ring-2 focus:ring-brand-gold/60 focus:border-brand-gold"
              />
              {filterState.searchQuery && (
                <button
                  type="button"
                  onClick={() => setFilterState((p) => ({ ...p, searchQuery: "" }))}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Search Land Button */}
            <button
              type="button"
              disabled={isWebSearching}
              onClick={() => handleExecuteSearch()}
              className="px-5 py-2 rounded-xl bg-brand-gold text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
            >
              {isWebSearching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  <span>Search Land</span>
                </>
              )}
            </button>

            {/* Filters Specs Drawer Toggle */}
            <button
              type="button"
              onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
              className={`px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                isFilterDrawerOpen
                  ? "bg-slate-700 text-white border-slate-600 shadow-md"
                  : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filter Specs</span>
            </button>
          </div>

          {/* Search In-Progress Notice */}
          {isWebSearching && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-brand-gold/30 text-xs text-amber-300 flex items-center gap-2.5 animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin text-brand-gold flex-none" />
              <span>{searchStatusMsg || "Searching active vacant land blocks..."}</span>
            </div>
          )}

          {/* Quick Corridor Selection Chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1 text-xs">
            <span className="text-slate-400 font-semibold text-[11px] mr-1 flex-none">
              Popular Corridors:
            </span>
            {POPULAR_CORRIDORS.map((corridor) => (
              <button
                key={corridor}
                type="button"
                onClick={() => handleQuickCorridorSearch(corridor)}
                className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  filterState.searchQuery.toLowerCase() === corridor.toLowerCase()
                    ? "bg-brand-gold text-slate-950 border-brand-gold shadow-xs"
                    : "bg-slate-950 border-slate-800 text-slate-300 hover:border-brand-gold/60 hover:text-white"
                }`}
              >
                {corridor}
              </button>
            ))}

            <button
              type="button"
              onClick={handleLoadAllDatabaseLots}
              className="px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ml-auto"
            >
              All Available Lots ({parcels.length})
            </button>

            {(filterState.searchQuery ||
              filterState.minPrice ||
              filterState.maxPrice ||
              filterState.minFrontage ||
              filterState.minLandSize ||
              filterState.isRegisteredOnly ||
              filterState.suburbOrEstate) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-1 text-slate-400 hover:text-rose-400 flex items-center gap-1 text-xs transition-colors flex-none cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Expandable Filter Specs Drawer */}
          {isFilterDrawerOpen && (
            <div className="pt-4 border-t border-slate-800/90 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Filter: State */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">
                  State
                </label>
                <select
                  value={filterState.state}
                  onChange={(e) =>
                    setFilterState((p) => ({
                      ...p,
                      state: e.target.value as any,
                    }))
                  }
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-700 bg-slate-950 text-xs text-white focus:outline-hidden focus:border-brand-gold"
                >
                  <option value="ALL">All States</option>
                  <option value="QLD">Queensland (QLD)</option>
                  <option value="NSW">New South Wales (NSW)</option>
                </select>
              </div>

              {/* Filter: Max Price */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">
                  Max Land Price
                </label>
                <select
                  value={filterState.maxPrice || ""}
                  onChange={(e) =>
                    setFilterState((p) => ({
                      ...p,
                      maxPrice: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-700 bg-slate-950 text-xs text-white focus:outline-hidden focus:border-brand-gold"
                >
                  <option value="">Any Price</option>
                  <option value="350000">Up to $350,000</option>
                  <option value="400000">Up to $400,000</option>
                  <option value="450000">Up to $450,000</option>
                  <option value="550000">Up to $550,000</option>
                  <option value="650000">Up to $650,000</option>
                  <option value="800000">Up to $800,000</option>
                  <option value="1000000">Up to $1,000,000</option>
                </select>
              </div>

              {/* Filter: Min Size */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">
                  Min Land Size (m²)
                </label>
                <select
                  value={filterState.minLandSize || ""}
                  onChange={(e) =>
                    setFilterState((p) => ({
                      ...p,
                      minLandSize: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-700 bg-slate-950 text-xs text-white focus:outline-hidden focus:border-brand-gold"
                >
                  <option value="">Any Size</option>
                  <option value="300">300 m²+</option>
                  <option value="350">350 m²+</option>
                  <option value="400">400 m²+</option>
                  <option value="450">450 m²+</option>
                  <option value="500">500 m²+</option>
                  <option value="600">600 m²+</option>
                </select>
              </div>

              {/* Filter: Min Frontage */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">
                  Min Frontage (m)
                </label>
                <select
                  value={filterState.minFrontage || ""}
                  onChange={(e) =>
                    setFilterState((p) => ({
                      ...p,
                      minFrontage: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-700 bg-slate-950 text-xs text-white focus:outline-hidden focus:border-brand-gold"
                >
                  <option value="">Any Frontage</option>
                  <option value="10">10m+</option>
                  <option value="12">12m+</option>
                  <option value="12.5">12.5m+</option>
                  <option value="14">14m+</option>
                  <option value="16">16m+</option>
                </select>
              </div>

              {/* Filter: Sort By */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">
                  Sort By
                </label>
                <select
                  value={filterState.sortBy}
                  onChange={(e) =>
                    setFilterState((p) => ({
                      ...p,
                      sortBy: e.target.value as any,
                    }))
                  }
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-700 bg-slate-950 text-xs text-white focus:outline-hidden focus:border-brand-gold"
                >
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="size_desc">Land Size: Largest</option>
                  <option value="frontage_desc">Frontage: Widest</option>
                  <option value="newest">Registration: Titled First</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Results Counter & View Switcher */}
        {parcels.length > 0 && (
          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="text-xs text-slate-300">
              Showing <strong>{filteredParcels.length}</strong> available vacant block{filteredParcels.length === 1 ? "" : "s"}
              {filterState.searchQuery && (
                <span> in <span className="font-semibold text-amber-300">"{filterState.searchQuery}"</span></span>
              )}
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-brand-gold text-slate-950 shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  viewMode === "table"
                    ? "bg-brand-gold text-slate-950 shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <TableIcon className="h-3.5 w-3.5" />
                <span>Table</span>
              </button>
            </div>
          </div>
        )}

        {/* Empty Search State: No parcels loaded at all */}
        {parcels.length === 0 && !isWebSearching && (
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-8 sm:p-12 text-center space-y-6 shadow-2xl max-w-2xl mx-auto my-8">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-lg">
              <Search className="h-8 w-8" />
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <h2 className="text-xl font-bold text-white tracking-tight">
                Search Available Vacant Land
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Enter an area above or choose a growth corridor to view all currently available vacant blocks.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {POPULAR_CORRIDORS.slice(0, 6).map((corridor) => (
                <button
                  key={corridor}
                  type="button"
                  onClick={() => handleQuickCorridorSearch(corridor)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200 hover:border-brand-gold hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                >
                  <MapPin className="h-3 w-3 text-brand-gold" />
                  <span>{corridor}</span>
                </button>
              ))}
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={handleLoadAllDatabaseLots}
                className="px-4 py-2 rounded-xl bg-brand-gold text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all cursor-pointer shadow-md"
              >
                Browse All Available Lots
              </button>
            </div>
          </div>
        )}

        {/* No Filter Matches State */}
        {parcels.length > 0 && filteredParcels.length === 0 && !isWebSearching && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center space-y-4 max-w-xl mx-auto my-8">
            <div className="h-12 w-12 mx-auto rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
              <Search className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No vacant blocks match this search</h3>
              <p className="text-xs text-slate-400">
                {filterState.searchQuery
                  ? `No blocks in your current list match "${filterState.searchQuery}".`
                  : "Try clearing your filters to see more results."}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {filterState.searchQuery && (
                <button
                  type="button"
                  onClick={() => handleExecuteSearch()}
                  className="px-4 py-2 rounded-xl bg-brand-gold text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Search className="h-4 w-4" />
                  <span>Search Online for "{filterState.searchQuery}"</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* View 1: Grid Cards */}
        {viewMode === "grid" && filteredParcels.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredParcels.map((parcel) => (
              <LandParcelCard
                key={parcel.id}
                parcel={parcel}
                isLight={isLight}
              />
            ))}
          </div>
        )}

        {/* View 2: Clean Data Table */}
        {viewMode === "table" && filteredParcels.length > 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-x-auto shadow-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-3 pl-4">Lot / Address</th>
                  <th className="p-3">Estate / Suburb</th>
                  <th className="p-3 text-center">State</th>
                  <th className="p-3 text-right">Size</th>
                  <th className="p-3 text-right">Frontage</th>
                  <th className="p-3 text-right">Depth</th>
                  <th className="p-3 text-right">Price</th>
                  <th className="p-3 text-right">$/m²</th>
                  <th className="p-3 text-center">Registration</th>
                  <th className="p-3">Agent / Agency</th>
                  <th className="p-3 pr-4 text-right">Listing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {filteredParcels.map((parcel) => (
                  <tr key={parcel.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 pl-4 font-bold text-white">
                      Lot {parcel.lotNumber}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {parcel.streetAddress}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-semibold text-slate-200 block">{parcel.estate || parcel.suburb}</span>
                      <span className="text-[10px] text-slate-400">{parcel.suburb} {parcel.postcode}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold text-amber-300">
                        {parcel.state}
                      </span>
                    </td>
                    <td className="p-3 text-right font-semibold">{parcel.landSizeM2} m²</td>
                    <td className="p-3 text-right">{parcel.frontageM} m</td>
                    <td className="p-3 text-right text-slate-400">{parcel.depthM} m</td>
                    <td className="p-3 text-right font-bold text-brand-gold">
                      ${parcel.price.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-[11px] text-slate-400">
                      ${parcel.pricePerM2}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          parcel.isRegistered
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
                        }`}
                      >
                        {parcel.expectedRegistrationDate || (parcel.isRegistered ? "Registered" : "Pending")}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300">
                      <span className="font-medium block">{parcel.agentName}</span>
                      <span className="text-[10px] text-slate-400">{parcel.agentAgency}</span>
                    </td>
                    <td className="p-3 pr-4 text-right">
                      {parcel.listingUrl ? (
                        <a
                          href={parcel.listingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-cyan-300 hover:underline font-semibold"
                        >
                          <span>View</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
