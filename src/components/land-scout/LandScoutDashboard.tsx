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
  Globe,
  Loader2,
  Plus,
  Key,
  Trash2,
  RefreshCw,
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
  purgeOldTestParcels,
  clearAllLandParcels,
  bulkAddOrUpdateParcels,
} from "@/lib/land-scout/landScoutStorage";
import {
  searchDatabaseLotsAsParcels,
  syncAllDatabaseLots,
  searchLiveWebForLand,
  getGeminiApiKey,
  hasSystemSavedApiKey,
  clearGeminiApiKey,
} from "@/lib/land-scout/landScoutWebSearch";
import { parseNaturalLanguageLandQuery } from "@/lib/land-scout/landScoutAiMatching";
import { LandParcelCard } from "./LandParcelCard";
import { LandValuationDrawer } from "./LandValuationDrawer";
import { AgentOutreachModal } from "./AgentOutreachModal";
import { LandScoutMapView } from "./LandScoutMapView";
import { GeminiApiKeyModal } from "./GeminiApiKeyModal";
import { PriceListImportModal } from "./PriceListImportModal";
import { AddCustomLotModal } from "./AddCustomLotModal";
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

  // Web Search & Modal States
  const [isWebSearching, setIsWebSearching] = useState(false);
  const [searchStatusMsg, setSearchStatusMsg] = useState("");
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isPriceListModalOpen, setIsPriceListModalOpen] = useState(false);
  const [isAddLotModalOpen, setIsAddLotModalOpen] = useState(false);

  // Filter & Search State
  const [filterState, setFilterState] = useState<LandScoutFilterState>({
    searchQuery: "",
    state: "ALL",
    suburbOrEstate: "",
    sortBy: "deal_score",
  });

  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Load parcels on mount - Purge any old test items first
  useEffect(() => {
    // If system key is present, proactively purge any stale custom keys so the system key is used cleanly
    if (hasSystemSavedApiKey()) {
      clearGeminiApiKey();
    }
    purgeOldTestParcels();
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

  // Trigger Live Web Search via Google Grounding
  const handleExecuteLiveWebSearch = async (overrideQuery?: string) => {
    const query = (overrideQuery ?? filterState.searchQuery).trim();
    if (!query) {
      toast.error("Please enter a suburb, estate, or search query (e.g. 'Flagstone' or 'Box Hill').");
      return;
    }

    setIsWebSearching(true);
    setSearchStatusMsg(`Scanning active land listings for "${query}" across REA, Domain, and OpenLot...`);

    try {
      const result = await searchLiveWebForLand(query, filterState.state);
      const updated = getLandParcels();
      setParcels(updated);
      toast.success(result.sourceSummary || `Found ${result.parcels.length} lots online!`, {
        description: `Imported into Land Scout with auto CAD home siting & deal score.`,
      });
    } catch (err: any) {
      console.error("Live web search error:", err);
      const isAuth =
        err?.isAuthError ||
        err?.message?.includes("service account") ||
        err?.message?.includes("ACCOUNT_STATE_INVALID") ||
        err?.message?.includes("401") ||
        err?.message?.includes("API key not valid") ||
        err?.message?.includes("UNAUTHENTICATED");

      if (isAuth) {
        setIsApiKeyModalOpen(true);
        // Fallback to searching internal Hudson database lots so the user is never stuck
        const internalLots = searchDatabaseLotsAsParcels(query);
        if (internalLots.length > 0) {
          bulkAddOrUpdateParcels(internalLots);
          setParcels(getLandParcels());
          toast.warning("Gemini API Key Disabled or Invalid", {
            description: `${err.message || "Key rejected by Google."} Displaying ${internalLots.length} matching lots from Hudson's database instead.`,
            action: {
              label: "Update Key",
              onClick: () => setIsApiKeyModalOpen(true),
            },
          });
        } else {
          toast.error("Gemini API Key Disabled or Invalid", {
            description: err.message || "Your Gemini API key was rejected by Google. Please enter an active API key.",
            action: {
              label: "Update Key",
              onClick: () => setIsApiKeyModalOpen(true),
            },
          });
        }
      } else {
        toast.error(err?.message || "Failed to search live web for land.", {
          description: "Check your Gemini API key or try a different suburb query.",
        });
      }
    } finally {
      setIsWebSearching(false);
      setSearchStatusMsg("");
    }
  };

  // Sync Real Hudson Database Lots
  const handleSyncDatabaseLots = () => {
    const synced = syncAllDatabaseLots();
    setParcels(synced);
    toast.success(`Synchronized ${synced.length} real lots from Hudson's Database!`, {
      description: "Includes active inventory across QLD and NSW growth corridors.",
    });
  };

  // Clear all parcels
  const handleClearAll = () => {
    if (confirm("Are you sure you want to clear loaded land listings?")) {
      clearAllLandParcels();
      setParcels([]);
      toast.info("Cleared land listings.");
    }
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
          const directMatch =
            p.suburb.toLowerCase().includes(rawQ) ||
            p.estate.toLowerCase().includes(rawQ) ||
            p.streetAddress.toLowerCase().includes(rawQ) ||
            `${p.suburb} ${p.state}`.toLowerCase().includes(rawQ) ||
            `${p.streetAddress} ${p.state}`.toLowerCase().includes(rawQ) ||
            p.lotNumber.toLowerCase().includes(rawQ) ||
            p.sourcePortal.toLowerCase().includes(rawQ) ||
            p.agentName.toLowerCase().includes(rawQ);

          if (!directMatch) {
            const parsedSuburb = (filterState.suburbOrEstate || "").toLowerCase();
            const tokens = rawQ
              .replace(/[,$/]/g, " ")
              .split(/\s+/)
              .filter(
                (t) =>
                  t.length > 2 &&
                  ![
                    "under",
                    "over",
                    "with",
                    "from",
                    "lots",
                    "land",
                    "registered",
                    "available",
                    "deal",
                    "beds",
                    "frontage",
                    "blocks",
                    "nsw",
                    "qld",
                    "vic",
                    "act",
                    "australia",
                  ].includes(t) &&
                  !t.match(/^\d+k?$/) &&
                  (!parsedSuburb || !parsedSuburb.includes(t))
              );

            if (tokens.length > 0) {
              const haystack = `${p.suburb} ${p.estate} ${p.streetAddress} ${p.lotNumber} ${p.state} ${p.postcode} ${p.council} ${p.sourcePortal} ${p.agentName}`.toLowerCase();
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
                Live web scouting, REA / Domain grounding &amp; instant turnkey packaging
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Division Toggle */}
            <div className="hidden sm:flex rounded-xl border border-slate-800 bg-slate-900 p-1 text-xs font-semibold">
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

            {/* Quick Sourcing Actions */}
            <button
              type="button"
              data-testid="sync-db-lots-btn"
              onClick={handleSyncDatabaseLots}
              title="Sync lots from Hudson Internal Database"
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Database className="h-3.5 w-3.5" />
              <span>Sync Hudson DB Lots</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPriceListModalOpen(true)}
              title="Import developer price list text or table"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5 text-brand-gold" />
              <span>Import Price List</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddLotModalOpen(true)}
              title="Add a custom or off-market block"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-brand-gold" />
              <span>+ Add Block</span>
            </button>

            <button
              type="button"
              onClick={() => setIsApiKeyModalOpen(true)}
              title="Configure Gemini API Key for Live Web Grounding"
              className="p-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <Key className="h-4 w-4" />
            </button>

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
        {/* Search & Prompt Bar */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-950/80 shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={filterState.searchQuery}
                onChange={(e) => handlePromptSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleExecuteLiveWebSearch();
                  }
                }}
                placeholder="Search suburb, estate, or prompt (e.g. 'Flagstone', 'Box Hill under 450k', '14m frontage Ripley')..."
                className="w-full h-10 pl-10 pr-28 rounded-xl border border-slate-700 bg-slate-950 text-sm text-slate-100 placeholder:text-slate-500 font-medium focus:outline-hidden focus:ring-2 focus:ring-brand-gold/60 focus:border-brand-gold"
              />
              <div className="absolute right-2 top-2 flex items-center gap-1.5">
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md bg-amber-500/10 text-[10px] font-bold text-amber-400 border border-amber-500/20 items-center gap-1">
                  <Sparkles className="h-3 w-3" /> AI
                </span>
              </div>
            </div>

            {/* Live Web Search Button */}
            <button
              type="button"
              disabled={isWebSearching}
              onClick={() => handleExecuteLiveWebSearch()}
              className="px-4 py-2 rounded-xl bg-brand-gold text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
            >
              {isWebSearching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Searching Web...</span>
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4" />
                  <span>Search Live Web</span>
                </>
              )}
            </button>

            {/* Filters Drawer Toggle */}
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

          {/* Web Search In-Progress Notice */}
          {isWebSearching && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-brand-gold/30 text-xs text-amber-300 flex items-center gap-2.5 animate-pulse">
              <Loader2 className="h-4 w-4 animate-spin text-brand-gold flex-none" />
              <span>{searchStatusMsg || "Scanning active land listings across REA, Domain, and OpenLot..."}</span>
            </div>
          )}

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
              🔥 Strong Buys (Spec Candidates)
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
                  value={filterState.suburbOrEstate || ""}
                  onChange={(e) =>
                    setFilterState((p) => ({
                      ...p,
                      suburbOrEstate: e.target.value,
                    }))
                  }
                  placeholder="e.g. Flagstone, Box Hill"
                  className="w-full h-8 px-3 rounded-lg border border-slate-700 bg-slate-950 text-xs text-white placeholder:text-slate-600 focus:outline-hidden focus:border-brand-gold"
                />
              </div>

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
                </select>
              </div>

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
                  <option value="350">350 m²+</option>
                  <option value="400">400 m²+</option>
                  <option value="450">450 m²+</option>
                  <option value="500">500 m²+</option>
                  <option value="600">600 m²+</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400">
                  Sort Intel By
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
                  <option value="deal_score">Deal Score (Best Value)</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="size_desc">Land Size: Largest</option>
                  <option value="frontage_desc">Frontage: Widest</option>
                  <option value="newest">Registration Status</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Aggregate KPI Ribbon (Only visible when parcels exist) */}
        {parcels.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-0.5">Matching Parcels</span>
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
                🔥 Spec Deals
              </span>
              <span className="text-xl font-extrabold text-amber-300">{metrics.strongBuys}</span>
            </div>
          </div>
        )}

        {/* View Switcher Toolbar (When parcels exist) */}
        {parcels.length > 0 && (
          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="text-xs text-slate-400">
              Showing <strong>{filteredParcels.length}</strong> of <strong>{parcels.length}</strong> loaded parcels
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
                <span>Satellite Map</span>
              </button>
            </div>
          </div>
        )}

        {/* LAUNCHPAD / EMPTY STATE: No parcels loaded yet */}
        {parcels.length === 0 && (
          <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-8 sm:p-12 text-center space-y-6 shadow-2xl max-w-4xl mx-auto my-8">
            <div className="h-16 w-16 mx-auto rounded-2xl bg-amber-500/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold shadow-lg">
              <Compass className="h-8 w-8" />
            </div>

            <div className="space-y-2 max-w-xl mx-auto">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Hudson Vacant Land Sourcing Engine
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Zero test data loaded. Search live portals across Australia, synchronize Hudson’s active database lots, or import a developer price list to begin sourcing.
              </p>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left pt-2">
              {/* Card 1: Sync DB Lots */}
              <button
                type="button"
                data-testid="sync-db-lots-card"
                onClick={handleSyncDatabaseLots}
                className="w-full text-left p-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-950/30 hover:border-emerald-500/50 transition-all cursor-pointer group space-y-3"
              >
                <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                    Sync Hudson DB Lots
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Instantly load real available lots from Hudson's internal database (Flagstone, Lilywood, Box Hill, Austral, etc.).
                  </p>
                </div>
                <div className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                  Sync Database <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </button>

              {/* Card 2: Live Web Search */}
              <button
                type="button"
                data-testid="live-web-search-card"
                onClick={() => {
                  const sub = prompt("Enter suburb or estate to search live web (e.g. Flagstone, Ripley, Box Hill):", "Flagstone");
                  if (sub) {
                    setFilterState((p) => ({ ...p, searchQuery: sub }));
                    handleExecuteLiveWebSearch(sub);
                  }
                }}
                className="w-full text-left p-5 rounded-2xl border border-amber-500/30 bg-amber-950/20 hover:bg-amber-950/30 hover:border-brand-gold/60 transition-all cursor-pointer group space-y-3"
              >
                <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-brand-gold flex items-center justify-center">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-brand-gold transition-colors">
                    Search Live Web
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Search RealEstate, Domain, OpenLot and developer portals via AI Google Grounding.
                  </p>
                </div>
                <div className="text-brand-gold text-xs font-bold flex items-center gap-1">
                  Start Web Search <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </button>

              {/* Card 3: Import Price List */}
              <button
                type="button"
                data-testid="import-price-list-card"
                onClick={() => setIsPriceListModalOpen(true)}
                className="w-full text-left p-5 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 hover:bg-cyan-950/30 hover:border-cyan-500/50 transition-all cursor-pointer group space-y-3"
              >
                <div className="h-9 w-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                    Import Price List
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Paste raw text or release tables from developer emails, PDFs, or CSV files.
                  </p>
                </div>
                <div className="text-cyan-400 text-xs font-bold flex items-center gap-1">
                  Paste Release <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </button>
            </div>

            {/* Corridor Quick Searches */}
            <div className="pt-4 border-t border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                Or pick a priority growth corridor to scan:
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {[
                  "Flagstone",
                  "Ripley",
                  "Lilywood",
                  "Watagan Park",
                  "Warnervale",
                  "Box Hill",
                  "Calderwood",
                  "Austral",
                  "Marsden Park",
                ].map((suburb) => (
                  <button
                    key={suburb}
                    type="button"
                    onClick={() => {
                      setFilterState((p) => ({ ...p, searchQuery: suburb }));
                      handleExecuteLiveWebSearch(suburb);
                    }}
                    className="px-3 py-1 rounded-full border border-slate-800 bg-slate-900 text-xs text-slate-300 hover:border-brand-gold hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Search className="h-3 w-3 text-brand-gold" />
                    <span>{suburb}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* EMPTY FILTER STATE: Parcels exist but none match active filters */}
        {parcels.length > 0 && filteredParcels.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center space-y-4 max-w-xl mx-auto my-8">
            <div className="h-12 w-12 mx-auto rounded-xl bg-slate-800 flex items-center justify-center text-slate-400">
              <Search className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No loaded parcels match your search</h3>
              <p className="text-xs text-slate-400">
                {filterState.searchQuery
                  ? `No lots in your loaded list match "${filterState.searchQuery}".`
                  : "Try clearing some of your filters to see more results."}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {filterState.searchQuery && (
                <button
                  type="button"
                  onClick={() => handleExecuteLiveWebSearch()}
                  className="px-4 py-2 rounded-xl bg-brand-gold text-slate-950 font-bold text-xs hover:bg-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Globe className="h-4 w-4" />
                  <span>Search Live Web for "{filterState.searchQuery}"</span>
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

        {/* VIEW 1: Grid Cards */}
        {viewMode === "grid" && filteredParcels.length > 0 && (
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
                          className="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
                          title="Contact Agent"
                        >
                          <Send className="h-3.5 w-3.5 text-amber-400" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePackageInFlyer(parcel)}
                          className="px-2.5 py-1 rounded-lg bg-brand-gold text-slate-950 font-bold text-[11px] hover:bg-amber-400 transition-colors cursor-pointer"
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
        {viewMode === "map" && filteredParcels.length > 0 && (
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

      {/* API Key Modal */}
      <GeminiApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onKeySaved={() => {
          if (filterState.searchQuery) {
            handleExecuteLiveWebSearch();
          }
        }}
      />

      {/* Price List Import Modal */}
      <PriceListImportModal
        isOpen={isPriceListModalOpen}
        onClose={() => setIsPriceListModalOpen(false)}
        onImportComplete={(imported) => {
          setParcels(getLandParcels());
        }}
      />

      {/* Add Custom Lot Modal */}
      <AddCustomLotModal
        isOpen={isAddLotModalOpen}
        onClose={() => setIsAddLotModalOpen(false)}
        onLotAdded={(newLot) => {
          setParcels(getLandParcels());
        }}
      />
    </div>
  );
}
