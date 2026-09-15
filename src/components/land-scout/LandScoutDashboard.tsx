import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Filter,
  Sparkles,
  SlidersHorizontal,
  LayoutGrid,
  Table as TableIcon,
  Map as MapIcon,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  Award,
  Building2,
  Layers,
  ArrowRight,
  Send,
  Scale,
  DollarSign,
  Compass,
  FileText,
  Database,
  ExternalLink,
} from "lucide-react";
import {
  type LandParcel,
  type LandScoutFilterState,
  type AvailabilityStatus,
} from "@/lib/land-scout/landScoutTypes";
import {
  getLandParcels,
  updateParcelAvailability,
  handoffLotToFlyer,
  syncLotToDatabase,
} from "@/lib/land-scout/landScoutStorage";
import { parseNaturalLanguageLandQuery } from "@/lib/land-scout/landScoutAiMatching";
import { LandParcelCard } from "./LandParcelCard";
import { LandValuationDrawer } from "./LandValuationDrawer";
import { AgentOutreachModal } from "./AgentOutreachModal";
import { LandScoutMapView } from "./LandScoutMapView";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme";

export function LandScoutDashboard() {
  const navigate = useNavigate();
  const { mode } = useTheme();
  const isLight = mode === "normal";

  // Data State
  const [parcels, setParcels] = useState<LandParcel[]>([]);
  const [activeParcelForValuation, setActiveParcelForValuation] = useState<LandParcel | null>(null);
  const [activeParcelForOutreach, setActiveParcelForOutreach] = useState<LandParcel | null>(null);

  // View Mode: grid | table | map
  const [viewMode, setViewMode] = useState<"grid" | "table" | "map">("grid");

  // Filter & Search State
  const [filterState, setFilterState] = useState<LandScoutFilterState>({
    searchQuery: "",
    state: "ALL",
    suburbOrEstate: "",
    sortBy: "deal_score",
  });

  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Load parcels on mount
  useEffect(() => {
    setParcels(getLandParcels());
  }, []);

  // Handle Natural Language Prompt Search
  const handlePromptSearch = (input: string) => {
    const aiParsed = parseNaturalLanguageLandQuery(input);
    setFilterState((prev) => ({
      ...prev,
      searchQuery: input,
      ...(aiParsed.state ? { state: aiParsed.state } : {}),
      ...(aiParsed.suburbOrEstate ? { suburbOrEstate: aiParsed.suburbOrEstate } : {}),
      ...(aiParsed.maxPrice !== undefined ? { maxPrice: aiParsed.maxPrice } : {}),
      ...(aiParsed.minPrice !== undefined ? { minPrice: aiParsed.minPrice } : {}),
      ...(aiParsed.minLandSize !== undefined ? { minLandSize: aiParsed.minLandSize } : {}),
      ...(aiParsed.maxLandSize !== undefined ? { maxLandSize: aiParsed.maxLandSize } : {}),
      ...(aiParsed.minFrontage !== undefined ? { minFrontage: aiParsed.minFrontage } : {}),
      ...(aiParsed.isRegisteredOnly !== undefined ? { isRegisteredOnly: aiParsed.isRegisteredOnly } : {}),
      ...(aiParsed.strongBuysOnly !== undefined ? { strongBuysOnly: aiParsed.strongBuysOnly } : {}),
    }));
  };

  // Reset Filters
  const handleResetFilters = () => {
    setFilterState({
      searchQuery: "",
      state: "ALL",
      suburbOrEstate: "",
      sortBy: "deal_score",
    });
    toast.info("Filters reset to default.");
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

        // Verified Live Only
        if (filterState.availabilityOnly && p.availabilityStatus !== "verified_available") {
          return false;
        }

        // Strong Buys Only
        if (filterState.strongBuysOnly && p.valuation.dealScoreRating !== "strong_buy") {
          return false;
        }

        // Text / Prompt Search
        if (filterState.searchQuery) {
          const rawQ = filterState.searchQuery.toLowerCase().trim();
          // If the raw query directly matches a field (e.g. searching "Peet", "Domain", or "Trailblazer")
          const directMatch =
            p.suburb.toLowerCase().includes(rawQ) ||
            p.estate.toLowerCase().includes(rawQ) ||
            p.streetAddress.toLowerCase().includes(rawQ) ||
            p.lotNumber.toLowerCase().includes(rawQ) ||
            p.sourcePortal.toLowerCase().includes(rawQ) ||
            p.agentName.toLowerCase().includes(rawQ);

          if (!directMatch) {
            // If direct match failed, it is likely a natural language prompt (e.g. "Flagstone registered under 350k")
            // In that case, the structured filters (suburbOrEstate, maxPrice, isRegisteredOnly) already apply.
            // Check remaining specific keywords (like lot number or street) that aren't stop words or parsed suburb.
            const parsedSuburb = (filterState.suburbOrEstate || "").toLowerCase();
            const tokens = rawQ
              .replace(/[,$/]/g, " ")
              .split(/\s+/)
              .filter(
                (t) =>
                  t.length > 2 &&
                  !["under", "over", "with", "from", "lots", "land", "registered", "available", "deal", "beds", "frontage", "blocks"].includes(t) &&
                  !t.match(/^\d+k?$/) &&
                  (!parsedSuburb || !parsedSuburb.includes(t))
              );

            if (tokens.length > 0) {
              const haystack = `${p.suburb} ${p.estate} ${p.streetAddress} ${p.lotNumber} ${p.sourcePortal} ${p.agentName}`.toLowerCase();
              const allTokensMatch = tokens.every((t) => haystack.includes(t));
              if (!allTokensMatch) return false;
            }
          }
        }

        return true;
      })
      .sort((a, b) => {
        switch (filterState.sortBy) {
          case "deal_score":
            return b.valuation.dealScorePoints - a.valuation.dealScorePoints;
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

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = filteredParcels.length;
    const verifiedLive = filteredParcels.filter(
      (p) => p.availabilityStatus === "verified_available"
    ).length;
    const registered = filteredParcels.filter((p) => p.isRegistered).length;
    const strongBuys = filteredParcels.filter(
      (p) => p.valuation.dealScoreRating === "strong_buy"
    ).length;
    const avgPricePerM2 =
      total > 0
        ? Math.round(
            filteredParcels.reduce((sum, p) => sum + p.pricePerM2, 0) / total
          )
        : 0;

    return { total, verifiedLive, registered, strongBuys, avgPricePerM2 };
  }, [filteredParcels]);

  // Handlers
  const handleUpdateAvailability = (id: string, newStatus: AvailabilityStatus) => {
    const updated = updateParcelAvailability(id, newStatus);
    if (updated) {
      setParcels(getLandParcels());
      toast.success(`Lot ${updated.lotNumber} marked as ${newStatus.replace(/_/g, " ")}`);
    }
  };

  const handlePackageInFlyer = (parcel: LandParcel) => {
    handoffLotToFlyer(parcel);
    toast.success(`Handoff ready for Lot ${parcel.lotNumber}!`, {
      description: "Opening Package Studio with auto-matched Hudson design & siting...",
    });
    navigate({ to: "/flyer" });
  };

  const handleAddToDatabase = (parcel: LandParcel) => {
    const ok = syncLotToDatabase(parcel);
    if (ok) {
      toast.success(`Lot ${parcel.lotNumber} saved to Hudson Land Database!`, {
        description: "Now accessible by all consultants for quoting & packaging.",
      });
    } else {
      toast.error("Could not save lot to database.");
    }
  };

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
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center gap-1 uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Under Development
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-brand-gold uppercase">
                  Vacant Land Intel &amp; Acquisition
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Sourcing web listings, verifying availability &amp; instant turnkey packaging
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Division Toggle */}
            <div className="flex rounded-xl border border-slate-800 bg-slate-900 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterState((p) => ({ ...p, state: "ALL" }))}
                className={`px-3 py-1 rounded-lg transition-all ${
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
                className={`px-3 py-1 rounded-lg transition-all ${
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
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterState.state === "NSW"
                    ? "bg-brand-gold text-slate-950 shadow-xs"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                NSW Division
              </button>
            </div>

            {/* Back to Hub Button */}
            <button
              type="button"
              onClick={() => navigate({ to: "/hub" })}
              className="px-3.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
            >
              Return to Hub
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-6 space-y-6">
        {/* Search & Prompt Bar */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-950/80 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={filterState.searchQuery}
                onChange={(e) => handlePromptSearch(e.target.value)}
                placeholder="Ask Land Scout AI: e.g. 'Registered 450m² lots in Flagstone under $380k' or '14m frontage in Box Hill'..."
                className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-700 bg-slate-950 text-sm text-slate-100 placeholder:text-slate-500 font-medium focus:outline-hidden focus:ring-2 focus:ring-brand-gold/60 focus:border-brand-gold"
              />
              <span className="absolute right-3 top-2.5 px-2 py-0.5 rounded-md bg-amber-500/10 text-[10px] font-bold text-amber-400 border border-amber-500/20 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> AI Parser Active
              </span>
            </div>

            {/* Filters Drawer Toggle */}
            <button
              type="button"
              onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
              className={`px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                isFilterDrawerOpen
                  ? "bg-brand-gold text-slate-950 border-brand-gold shadow-md"
                  : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filter Specs</span>
            </button>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1 text-xs">
            <span className="text-slate-400 font-semibold text-[11px] mr-1 flex-none">
              Quick Focus:
            </span>

            <button
              type="button"
              onClick={() =>
                setFilterState((p) => ({
                  ...p,
                  isRegisteredOnly: !p.isRegisteredOnly,
                }))
              }
              className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterState.isRegisteredOnly
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-xs"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              Registered / Ready to Build
            </button>

            <button
              type="button"
              onClick={() =>
                setFilterState((p) => ({
                  ...p,
                  availabilityOnly: !p.availabilityOnly,
                }))
              }
              className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterState.availabilityOnly
                  ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-xs"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              Verified Live Available
            </button>

            <button
              type="button"
              onClick={() =>
                setFilterState((p) => ({
                  ...p,
                  strongBuysOnly: !p.strongBuysOnly,
                }))
              }
              className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterState.strongBuysOnly
                  ? "bg-amber-500/20 border-brand-gold text-brand-gold shadow-xs"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              🔥 Strong Buys (Hudson Spec Candidates)
            </button>

            <button
              type="button"
              onClick={() =>
                setFilterState((p) => ({
                  ...p,
                  minFrontage: p.minFrontage === 14 ? undefined : 14,
                }))
              }
              className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterState.minFrontage === 14
                  ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-xs"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              14m+ Frontage
            </button>

            <button
              type="button"
              onClick={() =>
                setFilterState((p) => ({
                  ...p,
                  maxPrice: p.maxPrice === 400000 ? undefined : 400000,
                }))
              }
              className={`px-3 py-1 rounded-full border text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                filterState.maxPrice === 400000
                  ? "bg-amber-500/20 border-brand-gold text-brand-gold shadow-xs"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              Under $400k
            </button>

            {(filterState.searchQuery ||
              filterState.minPrice ||
              filterState.maxPrice ||
              filterState.minFrontage ||
              filterState.isRegisteredOnly ||
              filterState.availabilityOnly ||
              filterState.strongBuysOnly ||
              filterState.suburbOrEstate) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-1 text-slate-400 hover:text-rose-400 flex items-center gap-1 text-xs transition-colors ml-auto flex-none cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Expandable Advanced Filter Drawer */}
          {isFilterDrawerOpen && (
            <div className="pt-4 border-t border-slate-800/90 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">
                  Target Suburb or Estate
                </label>
                <input
                  type="text"
                  value={filterState.suburbOrEstate}
                  onChange={(e) =>
                    setFilterState((p) => ({ ...p, suburbOrEstate: e.target.value }))
                  }
                  placeholder="e.g. Flagstone, Ripley, Box Hill..."
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-800 bg-slate-950 text-xs text-white focus:outline-hidden focus:border-brand-gold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">
                  Max Land Price ($)
                </label>
                <input
                  type="number"
                  step="10000"
                  value={filterState.maxPrice || ""}
                  onChange={(e) =>
                    setFilterState((p) => ({
                      ...p,
                      maxPrice: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  placeholder="e.g. 450000"
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-800 bg-slate-950 text-xs text-white focus:outline-hidden focus:border-brand-gold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">
                  Min Land Size (m²)
                </label>
                <input
                  type="number"
                  step="25"
                  value={filterState.minLandSize || ""}
                  onChange={(e) =>
                    setFilterState((p) => ({
                      ...p,
                      minLandSize: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                  placeholder="e.g. 400"
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-800 bg-slate-950 text-xs text-white focus:outline-hidden focus:border-brand-gold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">Sort Lots By</label>
                <select
                  value={filterState.sortBy}
                  onChange={(e) =>
                    setFilterState((p) => ({
                      ...p,
                      sortBy: e.target.value as any,
                    }))
                  }
                  className="w-full h-8 px-2.5 rounded-lg border border-slate-800 bg-slate-950 text-xs text-white font-medium focus:outline-hidden focus:border-brand-gold"
                >
                  <option value="deal_score">🔥 Hudson Deal Score (Best Value)</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="size_desc">Land Size: Largest First</option>
                  <option value="frontage_desc">Frontage: Widest First</option>
                  <option value="newest">Registration: Titled First</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Intelligence KPIs Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-0.5">Discovered Lots</span>
            <span className="text-xl font-bold text-white">{metrics.total}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-0.5">Verified Available</span>
            <span className="text-xl font-bold text-emerald-400">{metrics.verifiedLive}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-0.5">Registered (Immediate)</span>
            <span className="text-xl font-bold text-cyan-300">{metrics.registered}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-0.5">Average $/m²</span>
            <span className="text-xl font-bold text-amber-300 font-mono">${metrics.avgPricePerM2.toLocaleString()}</span>
          </div>

          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/15 to-slate-900 border border-brand-gold/40 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-brand-gold block mb-0.5 font-bold">
              🔥 Spec Purchase Deals
            </span>
            <span className="text-xl font-extrabold text-amber-300">{metrics.strongBuys}</span>
          </div>
        </div>

        {/* View Switcher Toolbar */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <div className="text-xs text-slate-400">
            Showing <strong>{filteredParcels.length}</strong> vacant parcels matching active criteria
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
              <span>Grid Cards</span>
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
              <span>Data Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                viewMode === "map"
                  ? "bg-brand-gold text-slate-950 shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" />
              <span>Satellite &amp; Corridors</span>
            </button>
          </div>
        </div>

        {/* VIEW 1: Grid Cards */}
        {viewMode === "grid" && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredParcels.map((parcel) => (
              <LandParcelCard
                key={parcel.id}
                parcel={parcel}
                isLight={isLight}
                onContactAgent={(p) => setActiveParcelForOutreach(p)}
                onViewValuation={(p) => setActiveParcelForValuation(p)}
                onPackageInFlyer={handlePackageInFlyer}
                onAddToDatabase={handleAddToDatabase}
                onUpdateAvailability={handleUpdateAvailability}
              />
            ))}
          </div>
        )}

        {/* VIEW 2: Dense Table View */}
        {viewMode === "table" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-x-auto shadow-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="p-3 pl-4">Lot / Address</th>
                  <th className="p-3">Estate / Suburb</th>
                  <th className="p-3 text-center">State</th>
                  <th className="p-3 text-right">Size</th>
                  <th className="p-3 text-right">Frontage</th>
                  <th className="p-3 text-right">Price</th>
                  <th className="p-3 text-right">$/m²</th>
                  <th className="p-3 text-center">Deal Score</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3">Matching Design</th>
                  <th className="p-3 pr-4 text-right">Actions</th>
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
                      <span className="font-semibold text-slate-200 block">{parcel.estate}</span>
                      <span className="text-[10px] text-slate-400">{parcel.suburb}</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-bold text-amber-300">
                        {parcel.state}
                      </span>
                    </td>
                    <td className="p-3 text-right font-semibold">{parcel.landSizeM2} m²</td>
                    <td className="p-3 text-right">{parcel.frontageM} m</td>
                    <td className="p-3 text-right font-bold text-brand-gold">
                      ${parcel.price.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-[11px] text-slate-400">
                      ${parcel.pricePerM2}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => setActiveParcelForValuation(parcel)}
                        className={`px-2 py-0.5 rounded-full border text-[10px] font-bold cursor-pointer ${
                          parcel.valuation.dealScoreRating === "strong_buy"
                            ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                            : "bg-amber-500/20 border-amber-500/50 text-amber-300"
                        }`}
                      >
                        {parcel.valuation.dealScorePoints}/100
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          parcel.availabilityStatus === "verified_available"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                        }`}
                      >
                        {parcel.availabilityStatus.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-amber-300">
                      {parcel.suggestedDesign}
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveParcelForOutreach(parcel)}
                          className="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors"
                          title="Contact Agent"
                        >
                          <Send className="h-3.5 w-3.5 text-amber-400" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePackageInFlyer(parcel)}
                          className="px-2.5 py-1 rounded-lg bg-brand-gold text-slate-950 font-bold text-[11px] hover:bg-amber-400 transition-colors"
                        >
                          Package
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW 3: Map & Corridors */}
        {viewMode === "map" && (
          <LandScoutMapView
            parcels={filteredParcels}
            onPackageInFlyer={handlePackageInFlyer}
            onContactAgent={(p) => setActiveParcelForOutreach(p)}
            onViewValuation={(p) => setActiveParcelForValuation(p)}
          />
        )}
      </main>

      {/* Floating Valuation & Comps Drawer */}
      <LandValuationDrawer
        parcel={activeParcelForValuation}
        onClose={() => setActiveParcelForValuation(null)}
        onPackageInFlyer={handlePackageInFlyer}
      />

      {/* Floating Agent AI Outreach Modal */}
      <AgentOutreachModal
        parcel={activeParcelForOutreach}
        onClose={() => setActiveParcelForOutreach(null)}
        onOutreachLogged={(updated) => {
          setParcels(getLandParcels());
          setActiveParcelForOutreach(null);
        }}
      />
    </div>
  );
}
