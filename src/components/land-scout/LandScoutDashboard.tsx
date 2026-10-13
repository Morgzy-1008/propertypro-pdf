import { useState, useMemo, useEffect } from "react";
import {
  Search,
  SlidersHorizontal,
  LayoutGrid,
  Table as TableIcon,
  RotateCcw,
  Compass,
  Loader2,
  Trash2,
  MapPin,
  ArrowRight,
  PlusCircle,
  FileUp,
  Calendar,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  DollarSign,
  TrendingDown,
  Maximize2,
  Filter,
  Check,
} from "lucide-react";
import {
  type LandParcel,
  type LandScoutFilterState,
  formatLotDisplay,
} from "@/lib/land-scout/landScoutTypes";
import {
  getLandParcels,
  purgeOldTestParcels,
  clearAllLandParcels,
  bulkAddOrUpdateParcels,
  handoffLotToFlyer,
} from "@/lib/land-scout/landScoutStorage";
import {
  searchDatabaseLotsAsParcels,
  syncAllDatabaseLots,
  searchLiveWebForLand,
  hasSystemSavedApiKey,
  clearGeminiApiKey,
} from "@/lib/land-scout/landScoutWebSearch";
import {
  LandParcelCard,
  formatUploadDate,
  getSourceBadgeStyle,
} from "./LandParcelCard";
import { LandScoutMapView } from "./LandScoutMapView";
import { PriceListImportModal } from "./PriceListImportModal";
import { LandValuationDrawer } from "./LandValuationDrawer";
import { AgentOutreachModal } from "./AgentOutreachModal";
import { AddCustomLotModal } from "./AddCustomLotModal";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme";

const SUBURB_ALIASES: Record<string, string> = {
  flagsatone: "flagstone",
  flasgtone: "flagstone",
  flagston: "flagstone",
  "flag stone": "flagstone",
  boxhill: "box hill",
  "the gables": "box hill",
  gables: "box hill",
  ripely: "ripley",
  riply: "ripley",
  calderwood: "calderwood",
  warnervale: "warnervale",
  marsden: "marsden park",
  marsdenpark: "marsden park",
  southmaclean: "south maclean",
  maclean: "south maclean",
  lilywood: "south maclean",
  yarrabilba: "yarrabilba",
  greenbank: "greenbank",
  "watagan park": "cooranbong",
  watagan: "cooranbong",
  "kinma valley": "morayfield",
  kinma: "morayfield",
  brookhaven: "bahrs scrub",
  "highland walloon": "walloon",
  "austral estate": "austral",
};

const POPULAR_CORRIDORS_NSW = [
  { name: "Box Hill", estate: "The Gables / Carmel" },
  { name: "Austral", estate: "Austral Estate" },
  { name: "Marsden Park", estate: "Elara / Newpark" },
  { name: "Calderwood", estate: "Calderwood Valley" },
  { name: "Warnervale", estate: "HomeWorld Town Centre" },
  { name: "Oran Park", estate: "Oran Park Town" },
  { name: "Wilton", estate: "Wilton Greens" },
  { name: "Cooranbong", estate: "Watagan Park" },
];

const POPULAR_CORRIDORS_QLD = [
  { name: "Flagstone", estate: "Flagstone City" },
  { name: "Ripley", estate: "Providence" },
  { name: "South Maclean", estate: "Lilywood Landings" },
  { name: "Morayfield", estate: "Kinma Valley" },
  { name: "Bahrs Scrub", estate: "Brookhaven" },
  { name: "Walloon", estate: "Highland Walloon" },
  { name: "Greenbank", estate: "Everleigh" },
  { name: "Yarrabilba", estate: "The Parks" },
];

export function LandScoutDashboard() {
  const navigate = useNavigate();
  const { mode } = useTheme();
  const isLight = mode === "normal";

  // Data State
  const [parcels, setParcels] = useState<LandParcel[]>([]);

  // Progression Wizard Step: 1 (Location) | 2 (Filter Questions) | 3 (View Blocks)
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [isFilterQuestionsExpanded, setIsFilterQuestionsExpanded] = useState<boolean>(true);

  // View Mode: grid | table | map
  const [viewMode, setViewMode] = useState<"grid" | "table" | "map">("grid");

  // Interactive Modals & Drawers State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isAddLotModalOpen, setIsAddLotModalOpen] = useState(false);
  const [selectedValuationParcel, setSelectedValuationParcel] = useState<LandParcel | null>(null);
  const [selectedContactParcel, setSelectedContactParcel] = useState<LandParcel | null>(null);

  // Web Search State
  const [isWebSearching, setIsWebSearching] = useState(false);
  const [searchStatusMsg, setSearchStatusMsg] = useState("");
  const [lastSearchSummary, setLastSearchSummary] = useState("");

  // Filter & Search State
  const [filterState, setFilterState] = useState<LandScoutFilterState>({
    searchQuery: "",
    state: "ALL",
    suburbOrEstate: "",
    registrationFilter: "all",
    slopeCategory: "all",
    priceTier: "all",
    sortBy: "price_asc",
  });

  // Cross-Navigation & Action Handlers
  const handleSiteLot = (parcel: LandParcel) => {
    const addr = parcel.streetAddress || `${parcel.lotNumber}, ${parcel.suburb}`;
    navigate({
      to: "/site-studio",
      search: { address: addr },
    });
  };

  const handlePackageInFlyer = (parcel: LandParcel) => {
    handoffLotToFlyer(parcel);
    navigate({ to: "/flyer" });
    toast.info(`Packaging Lot ${parcel.lotNumber} into Marketing Flyer`);
  };

  const handleImportComplete = (imported: LandParcel[]) => {
    bulkAddOrUpdateParcels(imported);
    const updated = getLandParcels();
    const deduped = Array.from(new Map(updated.map((p) => [p.id, p])).values());
    setParcels(deduped);
  };

  const handleCustomLotAdded = (newParcel: LandParcel) => {
    const updated = getLandParcels();
    const deduped = Array.from(new Map(updated.map((p) => [p.id, p])).values());
    setParcels(deduped);
    toast.success(`Added ${newParcel.lotNumber} (${newParcel.suburb})`);
  };

  const handleOutreachLogged = (updated: LandParcel) => {
    const all = getLandParcels();
    setParcels(all);
    setSelectedContactParcel(null);
    toast.success(`Outreach activity logged for ${updated.lotNumber}`);
  };

  // Load parcels on mount - Ensure robust inventory is ALWAYS present
  useEffect(() => {
    if (hasSystemSavedApiKey()) {
      clearGeminiApiKey();
    }
    purgeOldTestParcels();
    const existing = getLandParcels();

    // Also load database lots to guarantee a minimum rich catalog of 40+ parcels
    const dbLots = searchDatabaseLotsAsParcels("");
    if (existing.length < 10 && dbLots.length > 0) {
      const merged = bulkAddOrUpdateParcels(dbLots);
      setParcels(merged);
    } else if (existing.length > 0) {
      const dedupedExisting = Array.from(new Map(existing.map((p) => [p.id, p])).values());
      setParcels(dedupedExisting);
    } else if (dbLots.length > 0) {
      bulkAddOrUpdateParcels(dbLots);
      setParcels(dbLots);
    }
  }, []);

  // Search execution
  const handleExecuteSearch = async (overrideQuery?: string) => {
    const rawQuery = (overrideQuery ?? filterState.searchQuery).trim();
    if (!rawQuery) {
      // If empty query, show all parcels
      setFilterState((prev) => ({ ...prev, searchQuery: "", suburbOrEstate: "" }));
      setActiveStep(2);
      return;
    }

    setIsWebSearching(true);
    setSearchStatusMsg(`Scanning active vacant blocks in "${rawQuery}"...`);

    try {
      const result = await searchLiveWebForLand(rawQuery, filterState.state);
      setLastSearchSummary(result.sourceSummary || "");
      const updated = getLandParcels();
      const deduped = Array.from(new Map(updated.map((p) => [p.id, p])).values());
      setParcels(deduped);

      if (result.parcels.length > 0) {
        const canonicalSuburb = result.targetSuburb || result.parcels[0].suburb;
        const resultState = result.targetState || result.parcels[0].state;

        setFilterState((prev) => ({
          ...prev,
          searchQuery: canonicalSuburb,
          suburbOrEstate: "",
          state: prev.state !== "ALL" && prev.state !== resultState ? "ALL" : prev.state,
        }));

        toast.success(`Loaded ${result.parcels.length} available blocks in ${canonicalSuburb} (${resultState})!`);
      } else {
        // Fallback to searching database lots matching the query
        const dbLots = searchDatabaseLotsAsParcels(rawQuery);
        if (dbLots.length > 0) {
          bulkAddOrUpdateParcels(dbLots);
          const nowUpdated = getLandParcels();
          setParcels(nowUpdated);
          setFilterState((prev) => ({ ...prev, searchQuery: rawQuery, suburbOrEstate: "" }));
          toast.success(`Loaded ${dbLots.length} available blocks for "${rawQuery}" from Hudson's network!`);
        } else {
          setFilterState((prev) => ({ ...prev, searchQuery: rawQuery, suburbOrEstate: "" }));
          toast.info(`Showing available growth corridor blocks near "${rawQuery}".`, {
            description: result.sourceSummary || "Explore nearby corridors or adjust filters.",
          });
        }
      }
      setActiveStep(2);
    } catch (err: any) {
      console.warn("Search fallback:", err);
      const fallbackLots = searchDatabaseLotsAsParcels(rawQuery);
      if (fallbackLots.length > 0) {
        bulkAddOrUpdateParcels(fallbackLots);
        const updated = getLandParcels();
        setParcels(updated);
        toast.success(`Loaded ${fallbackLots.length} available blocks for "${rawQuery}" from Hudson's database!`);
      } else {
        toast.info(`Showing available blocks across Hudson's network.`);
      }
      setActiveStep(2);
    } finally {
      setIsWebSearching(false);
      setSearchStatusMsg("");
    }
  };

  // Quick Corridor Click
  const handleQuickCorridorSearch = (suburb: string) => {
    setFilterState((prev) => ({ ...prev, searchQuery: suburb, suburbOrEstate: "" }));
    handleExecuteSearch(suburb);
  };

  // Load all Hudson database inventory
  const handleLoadAllDatabaseLots = () => {
    const synced = syncAllDatabaseLots();
    setParcels(synced);
    setFilterState((prev) => ({
      ...prev,
      searchQuery: "",
      suburbOrEstate: "",
      registrationFilter: "all",
      slopeCategory: "all",
      priceTier: "all",
      minPrice: undefined,
      maxPrice: undefined,
      minFrontage: undefined,
      minLandSize: undefined,
    }));
    toast.success(`Loaded all ${synced.length} vacant blocks across Hudson's network!`);
    setActiveStep(3);
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
      registrationFilter: "all",
      slopeCategory: "all",
      priceTier: "all",
      minPrice: undefined,
      maxPrice: undefined,
      minFrontage: undefined,
      minLandSize: undefined,
      sortBy: "price_asc",
    });
    toast.info("All filters reset.");
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
            p.council.toLowerCase().includes(needle) ||
            needle.includes(p.suburb.toLowerCase());
          if (!match) return false;
        }

        // Registration Filter
        if (filterState.registrationFilter === "registered" && !p.isRegistered) {
          return false;
        }
        if (filterState.registrationFilter === "unregistered" && p.isRegistered) {
          return false;
        }

        // Slope / Topography Filter
        const fall = p.feasibility?.fallEstimateM ?? 0.6;
        const slope = p.feasibility?.slopeCategory || (fall > 1.8 ? "steep" : fall > 0.9 ? "moderate" : "flat");
        if (filterState.slopeCategory === "flat" && slope !== "flat" && fall > 1.0) {
          return false;
        }
        if (filterState.slopeCategory === "moderate" && (slope !== "moderate" || fall <= 1.0 || fall > 2.0)) {
          return false;
        }
        if (filterState.slopeCategory === "steep" && slope !== "steep" && fall <= 2.0) {
          return false;
        }

        // Price Tier Filter
        if (filterState.priceTier === "under_400k" && p.price >= 400000) return false;
        if (filterState.priceTier === "400k_600k" && (p.price < 400000 || p.price > 600000)) return false;
        if (filterState.priceTier === "600k_800k" && (p.price < 600000 || p.price > 800000)) return false;
        if (filterState.priceTier === "800k_plus" && p.price <= 800000) return false;

        // Custom Numeric Price Filters
        if (filterState.minPrice && p.price < filterState.minPrice) return false;
        if (filterState.maxPrice && p.price > filterState.maxPrice) return false;

        // Land Size Filters
        if (filterState.minLandSize && p.landSizeM2 < filterState.minLandSize) return false;
        if (filterState.maxLandSize && p.landSizeM2 > filterState.maxLandSize) return false;

        // Frontage Filter
        if (filterState.minFrontage && p.frontageM < filterState.minFrontage) return false;

        // Search Query Text Filter (filter within loaded parcels)
        if (filterState.searchQuery) {
          const q = filterState.searchQuery.toLowerCase().trim();
          const normQ = SUBURB_ALIASES[q] || q;

          // If query is just a state name, don't filter out lots that already match state
          if (q === "qld" || q === "queensland" || q === "nsw" || q === "new south wales" || q === "all") {
            return true;
          }

          const haystack = `${p.lotNumber} ${p.streetAddress} ${p.suburb} ${p.estate} ${p.postcode} ${p.state} ${p.council} ${p.agentName} ${p.agentAgency} ${p.sourcePortal}`.toLowerCase();

          const directMatch =
            haystack.includes(q) ||
            haystack.includes(normQ) ||
            p.suburb.toLowerCase().includes(normQ) ||
            normQ.includes(p.suburb.toLowerCase()) ||
            p.estate.toLowerCase().includes(normQ) ||
            normQ.includes(p.estate.toLowerCase());

          if (!directMatch) {
            const tokens = q.split(/\s+/).filter((t) => t.length > 2);
            if (tokens.length === 0 || !tokens.every((t) => haystack.includes(t) || haystack.includes(SUBURB_ALIASES[t] || t))) {
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

  // Active filter count for badge
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterState.state !== "ALL") count++;
    if (filterState.searchQuery) count++;
    if (filterState.registrationFilter && filterState.registrationFilter !== "all") count++;
    if (filterState.slopeCategory && filterState.slopeCategory !== "all") count++;
    if (filterState.priceTier && filterState.priceTier !== "all") count++;
    if (filterState.minPrice || filterState.maxPrice) count++;
    if (filterState.minFrontage) count++;
    if (filterState.minLandSize) count++;
    return count;
  }, [filterState]);

  return (
    <div className={`min-h-screen ${isLight ? "bg-slate-50 text-slate-900" : "bg-[#090D16] text-slate-100"} font-sans selection:bg-amber-500/30 pb-24`}>
      {/* Top Header */}
      <header className={`border-b ${isLight ? "border-slate-200 bg-white/95" : "border-slate-800/80 bg-[#0B1120]/90"} backdrop-blur-md sticky top-0 z-30 shadow-xs`}>
        <div className="max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20">
              <Compass className="h-5 w-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-base font-extrabold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                  Hudson Land Scout
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 uppercase tracking-wide">
                  Intelligence & Acquisition
                </span>
              </div>
              <p className="hidden sm:block text-[11px] text-slate-400">
                Vacant land finder, site feasibility & 1-click turnkey house packaging
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Division Selector */}
            <div className={`hidden sm:flex rounded-xl border p-1 text-xs font-semibold ${
              isLight ? "border-slate-200 bg-slate-100" : "border-slate-800 bg-slate-900"
            }`}>
              <button
                type="button"
                onClick={() => setFilterState((p) => ({ ...p, state: "ALL" }))}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  filterState.state === "ALL"
                    ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                    : isLight ? "text-slate-600 hover:text-slate-900" : "text-slate-400 hover:text-white"
                }`}
              >
                All States
              </button>
              <button
                type="button"
                onClick={() => setFilterState((p) => ({ ...p, state: "QLD" }))}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  filterState.state === "QLD"
                    ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                    : isLight ? "text-slate-600 hover:text-slate-900" : "text-slate-400 hover:text-white"
                }`}
              >
                Queensland
              </button>
              <button
                type="button"
                onClick={() => setFilterState((p) => ({ ...p, state: "NSW" }))}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  filterState.state === "NSW"
                    ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                    : isLight ? "text-slate-600 hover:text-slate-900" : "text-slate-400 hover:text-white"
                }`}
              >
                New South Wales
              </button>
            </div>

            {/* Quick Utility Tools */}
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                isLight ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-100" : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
              title="Import developer price list"
            >
              <FileUp className="h-3.5 w-3.5 text-amber-500" />
              <span className="hidden md:inline">Import Price List</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddLotModalOpen(true)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                isLight ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-100" : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
              title="Add custom or off-market lot"
            >
              <PlusCircle className="h-3.5 w-3.5 text-emerald-500" />
              <span className="hidden md:inline">Add Custom Lot</span>
            </button>

            {parcels.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                title="Clear loaded listings"
                className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                  isLight ? "border-slate-200 text-slate-400 hover:text-rose-600" : "border-slate-800 text-slate-400 hover:text-rose-400"
                }`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}

            {/* Back to Hub Button */}
            <button
              type="button"
              onClick={() => navigate({ to: "/hub" })}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                isLight
                  ? "border-slate-300 bg-slate-900 text-white hover:bg-slate-800"
                  : "border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white"
              }`}
            >
              Hub
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-8 space-y-8">
        {/* Step Indicator Progress Bar */}
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
            {/* Step 1 Pill */}
            <button
              type="button"
              onClick={() => setActiveStep(1)}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeStep === 1
                  ? "bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/20"
                  : isLight
                    ? "bg-white border-slate-200 text-slate-700 hover:border-amber-400"
                    : "bg-slate-900/80 border-slate-800 text-slate-300 hover:border-amber-500/50"
              }`}
            >
              <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${
                activeStep === 1 ? "bg-slate-950 text-amber-400" : "bg-amber-500/20 text-amber-500"
              }`}>
                1
              </span>
              <span className="truncate">1. Where are you looking?</span>
            </button>

            {/* Step 2 Pill */}
            <button
              type="button"
              onClick={() => setActiveStep(2)}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeStep === 2
                  ? "bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/20"
                  : isLight
                    ? "bg-white border-slate-200 text-slate-700 hover:border-amber-400"
                    : "bg-slate-900/80 border-slate-800 text-slate-300 hover:border-amber-500/50"
              }`}
            >
              <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${
                activeStep === 2 ? "bg-slate-950 text-amber-400" : "bg-amber-500/20 text-amber-500"
              }`}>
                2
              </span>
              <span className="truncate">2. Filter Questions</span>
              {activeFiltersCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-slate-950/30 text-[10px]">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Step 3 Pill */}
            <button
              type="button"
              onClick={() => setActiveStep(3)}
              className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeStep === 3
                  ? "bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/20"
                  : isLight
                    ? "bg-white border-slate-200 text-slate-700 hover:border-amber-400"
                    : "bg-slate-900/80 border-slate-800 text-slate-300 hover:border-amber-500/50"
              }`}
            >
              <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${
                activeStep === 3 ? "bg-slate-950 text-amber-400" : "bg-amber-500/20 text-amber-500"
              }`}>
                3
              </span>
              <span className="truncate">3. Available Blocks ({filteredParcels.length})</span>
            </button>
          </div>
        </div>

        {/* STEP 1: HERO LOCATION SEARCH (MUCH LARGER TEXT AS REQUESTED) */}
        <section className={`rounded-3xl border p-6 sm:p-10 transition-all shadow-xl relative overflow-hidden ${
          isLight
            ? "border-slate-200 bg-white"
            : "border-slate-800 bg-gradient-to-b from-[#111928] via-[#0F172A] to-[#0B1120]"
        }`}>
          {/* Subtle Ambient Accent */}
          <div className="absolute top-0 right-1/4 h-64 w-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-4xl mx-auto space-y-6 text-center">
            {/* Large Inviting Hero Title */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Vacant Land Scout & Feasibility</span>
              </div>
              <h2 className={`text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight ${
                isLight ? "text-slate-900" : "text-white"
              }`}>
                Where are you looking for land?
              </h2>
              <p className={`text-sm sm:text-base max-w-2xl mx-auto ${
                isLight ? "text-slate-600" : "text-slate-400"
              }`}>
                Search any suburb, estate, or choose a high-growth corridor across Queensland and New South Wales to find available building blocks.
              </p>
            </div>

            {/* Division Switcher Buttons */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setFilterState((p) => ({ ...p, state: "ALL" }))}
                className={`px-4 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer ${
                  filterState.state === "ALL"
                    ? "bg-amber-500 text-slate-950 border-amber-500 shadow-sm"
                    : isLight
                      ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                      : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
                }`}
              >
                All States ({parcels.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterState((p) => ({ ...p, state: "QLD" }))}
                className={`px-4 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer ${
                  filterState.state === "QLD"
                    ? "bg-amber-500 text-slate-950 border-amber-500 shadow-sm"
                    : isLight
                      ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                      : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
                }`}
              >
                ☀️ Queensland (QLD)
              </button>
              <button
                type="button"
                onClick={() => setFilterState((p) => ({ ...p, state: "NSW" }))}
                className={`px-4 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer ${
                  filterState.state === "NSW"
                    ? "bg-amber-500 text-slate-950 border-amber-500 shadow-sm"
                    : isLight
                      ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                      : "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
                }`}
              >
                🌊 New South Wales (NSW)
              </button>
            </div>

            {/* Big Hero Search Bar */}
            <div className="relative max-w-3xl mx-auto pt-2">
              <div className="relative flex items-center">
                <Search className="absolute left-4 sm:left-5 h-5 w-5 text-amber-500 flex-none" />
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
                  placeholder="Enter suburb, estate, or council (e.g. 'Box Hill', 'Austral', 'Flagstone', 'Ripley', 'Warnervale')..."
                  className={`w-full h-14 pl-12 sm:pl-14 pr-32 rounded-2xl border text-sm sm:text-base font-medium shadow-lg transition-all focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 ${
                    isLight
                      ? "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-amber-500"
                      : "border-slate-700 bg-slate-950/90 text-white placeholder:text-slate-500 focus:border-amber-500"
                  }`}
                />
                {filterState.searchQuery && (
                  <button
                    type="button"
                    onClick={() => setFilterState((p) => ({ ...p, searchQuery: "" }))}
                    className="absolute right-28 text-slate-400 hover:text-slate-200 p-1"
                  >
                    ✕
                  </button>
                )}
                <button
                  type="button"
                  disabled={isWebSearching}
                  onClick={() => handleExecuteSearch()}
                  className="absolute right-2 top-2 bottom-2 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isWebSearching ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Scanning...</span>
                    </>
                  ) : (
                    <>
                      <span>Search Land</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>

              {isWebSearching && (
                <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400 flex items-center justify-center gap-2 animate-pulse">
                  <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                  <span>{searchStatusMsg || "Searching active vacant land blocks..."}</span>
                </div>
              )}
            </div>

            {/* Popular Growth Corridors Fast Picker */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
                <MapPin className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-semibold">Popular Growth Corridors:</span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto">
                {(filterState.state === "NSW" ? POPULAR_CORRIDORS_NSW : filterState.state === "QLD" ? POPULAR_CORRIDORS_QLD : [...POPULAR_CORRIDORS_NSW.slice(0, 4), ...POPULAR_CORRIDORS_QLD.slice(0, 4)]).map((item) => {
                  const isSelected = filterState.searchQuery.toLowerCase() === item.name.toLowerCase();
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => handleQuickCorridorSearch(item.name)}
                      className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-amber-500 text-slate-950 border-amber-500 font-bold shadow-sm"
                          : isLight
                            ? "bg-slate-100/80 border-slate-200 text-slate-700 hover:border-amber-400 hover:bg-white"
                            : "bg-slate-900/90 border-slate-800 text-slate-300 hover:border-amber-500/50 hover:text-white"
                      }`}
                    >
                      <span>{item.name}</span>
                      <span className={`text-[10px] ${isSelected ? "text-slate-900/70" : "text-slate-500"}`}>
                        ({item.estate})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Next Buttons */}
            <div className="flex items-center justify-center gap-3 pt-3 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setActiveStep(2);
                  setIsFilterQuestionsExpanded(true);
                }}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-md cursor-pointer"
              >
                <span>Refine Block Criteria (Registration, Price, Slope)</span>
                <ChevronDown className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleLoadAllDatabaseLots}
                className={`px-5 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  isLight
                    ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    : "border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700 hover:text-white"
                }`}
              >
                Browse All {parcels.length} Available Blocks
              </button>
            </div>
          </div>
        </section>

        {/* STEP 2: INTERACTIVE FILTER QUESTIONS (REGISTRATION, PRICE, SLOPE, SPECS) */}
        <section className={`rounded-3xl border transition-all shadow-xl overflow-hidden ${
          isLight ? "border-slate-200 bg-white" : "border-slate-800 bg-[#111928]"
        }`}>
          {/* Section Header with Accordion Toggle */}
          <div
            onClick={() => setIsFilterQuestionsExpanded(!isFilterQuestionsExpanded)}
            className={`p-5 sm:p-6 flex items-center justify-between cursor-pointer border-b ${
              isLight ? "border-slate-200 bg-slate-50/50 hover:bg-slate-100/50" : "border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/70"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold">
                <SlidersHorizontal className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className={`text-lg font-bold tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                    Filter Questions & Specifications
                  </h3>
                  {activeFiltersCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-bold">
                      {activeFiltersCount} Active
                    </span>
                  )}
                </div>
                <p className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                  Filter by registration timeline, budget, slope / fall, and lot frontage
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-500 font-semibold hidden sm:inline">
                {isFilterQuestionsExpanded ? "Collapse Filters" : "Expand Filters"}
              </span>
              {isFilterQuestionsExpanded ? (
                <ChevronUp className="h-5 w-5 text-slate-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-slate-400" />
              )}
            </div>
          </div>

          {/* Interactive Questions Grid */}
          {isFilterQuestionsExpanded && (
            <div className="p-6 sm:p-8 space-y-8 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Question 1: Registration Status */}
                <div className={`p-4 rounded-2xl border space-y-3 ${
                  isLight ? "bg-slate-50/70 border-slate-200" : "bg-slate-950/60 border-slate-800/80"
                }`}>
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase tracking-wide">
                    <Clock className="h-4 w-4" />
                    <span>1. Title & Registration</span>
                  </div>
                  <p className={`text-xs ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                    When does the client need to start building?
                  </p>

                  <div className="space-y-1.5 pt-1">
                    {[
                      { id: "all", label: "Any Registration", desc: "All lots in catalog" },
                      { id: "registered", label: "Registered Now (Titled)", desc: "Build immediately" },
                      { id: "unregistered", label: "Registering 2026", desc: "Upcoming / off-the-plan" },
                    ].map((opt) => {
                      const isSelected = (filterState.registrationFilter || "all") === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setFilterState((p) => ({ ...p, registrationFilter: opt.id as any }))}
                          className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? "bg-amber-500/15 border-amber-500 text-amber-400 font-bold shadow-xs"
                              : isLight
                                ? "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                                : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          <div>
                            <span className="block font-semibold">{opt.label}</span>
                            <span className={`text-[10px] ${isSelected ? "text-amber-500/80" : "text-slate-500"}`}>{opt.desc}</span>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-amber-500" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Question 2: Land Price / Budget */}
                <div className={`p-4 rounded-2xl border space-y-3 ${
                  isLight ? "bg-slate-50/70 border-slate-200" : "bg-slate-950/60 border-slate-800/80"
                }`}>
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase tracking-wide">
                    <DollarSign className="h-4 w-4" />
                    <span>2. Land Budget</span>
                  </div>
                  <p className={`text-xs ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                    What is the target land price range?
                  </p>

                  <div className="space-y-1.5 pt-1">
                    {[
                      { id: "all", label: "Any Budget", desc: "All prices" },
                      { id: "under_400k", label: "Under $400,000", desc: "Entry level & FHB" },
                      { id: "400k_600k", label: "$400k – $600k", desc: "Mid-tier family blocks" },
                      { id: "600k_800k", label: "$600k – $800k", desc: "Premium estates" },
                      { id: "800k_plus", label: "$800,000+", desc: "Acreage & executive" },
                    ].map((opt) => {
                      const isSelected = (filterState.priceTier || "all") === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setFilterState((p) => ({ ...p, priceTier: opt.id as any }))}
                          className={`w-full p-2 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? "bg-amber-500/15 border-amber-500 text-amber-400 font-bold shadow-xs"
                              : isLight
                                ? "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                                : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          <div>
                            <span className="block font-semibold">{opt.label}</span>
                            <span className={`text-[10px] ${isSelected ? "text-amber-500/80" : "text-slate-500"}`}>{opt.desc}</span>
                          </div>
                          {isSelected && <Check className="h-3.5 w-3.5 text-amber-500" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Question 3: Land Slope & Topography */}
                <div className={`p-4 rounded-2xl border space-y-3 ${
                  isLight ? "bg-slate-50/70 border-slate-200" : "bg-slate-950/60 border-slate-800/80"
                }`}>
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase tracking-wide">
                    <TrendingDown className="h-4 w-4" />
                    <span>3. Slope & Topography</span>
                  </div>
                  <p className={`text-xs ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                    Site fall dictates earthworks & retaining costs:
                  </p>

                  <div className="space-y-1.5 pt-1">
                    {[
                      { id: "all", label: "Any Topography", desc: "All blocks" },
                      { id: "flat", label: "Flat (< 1.0m fall)", desc: "Lowest site & slab costs" },
                      { id: "moderate", label: "Moderate (1.0m – 2.0m)", desc: "Split slab / gentle tiering" },
                      { id: "steep", label: "Steep / Elevated (2.0m+)", desc: "Scenic views & custom" },
                    ].map((opt) => {
                      const isSelected = (filterState.slopeCategory || "all") === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setFilterState((p) => ({ ...p, slopeCategory: opt.id as any }))}
                          className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? "bg-amber-500/15 border-amber-500 text-amber-400 font-bold shadow-xs"
                              : isLight
                                ? "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                                : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          <div>
                            <span className="block font-semibold">{opt.label}</span>
                            <span className={`text-[10px] ${isSelected ? "text-amber-500/80" : "text-slate-500"}`}>{opt.desc}</span>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-amber-500" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Question 4: Dimensions (Frontage & Size) */}
                <div className={`p-4 rounded-2xl border space-y-3 ${
                  isLight ? "bg-slate-50/70 border-slate-200" : "bg-slate-950/60 border-slate-800/80"
                }`}>
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase tracking-wide">
                    <Maximize2 className="h-4 w-4" />
                    <span>4. Lot Envelope Specs</span>
                  </div>
                  <p className={`text-xs ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                    Required dimensions for Hudson house design:
                  </p>

                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Minimum Frontage:
                      </label>
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { val: undefined, label: "Any" },
                          { val: 10, label: "10m+" },
                          { val: 12.5, label: "12.5m+" },
                          { val: 14, label: "14m+" },
                        ].map((f) => (
                          <button
                            key={f.label}
                            type="button"
                            onClick={() => setFilterState((p) => ({ ...p, minFrontage: f.val }))}
                            className={`py-1 rounded-lg border text-center text-xs font-semibold transition-all cursor-pointer ${
                              filterState.minFrontage === f.val
                                ? "bg-amber-500 text-slate-950 border-amber-500"
                                : isLight ? "bg-white border-slate-200 text-slate-700" : "bg-slate-900 border-slate-800 text-slate-300"
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Minimum Land Size:
                      </label>
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { val: undefined, label: "Any" },
                          { val: 350, label: "350m²" },
                          { val: 450, label: "450m²" },
                          { val: 550, label: "550m²" },
                        ].map((s) => (
                          <button
                            key={s.label}
                            type="button"
                            onClick={() => setFilterState((p) => ({ ...p, minLandSize: s.val }))}
                            className={`py-1 rounded-lg border text-center text-xs font-semibold transition-all cursor-pointer ${
                              filterState.minLandSize === s.val
                                ? "bg-amber-500 text-slate-950 border-amber-500"
                                : isLight ? "bg-white border-slate-200 text-slate-700" : "bg-slate-900 border-slate-800 text-slate-300"
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                        Sort Order:
                      </label>
                      <select
                        value={filterState.sortBy}
                        onChange={(e) => setFilterState((p) => ({ ...p, sortBy: e.target.value as any }))}
                        className={`w-full h-8 px-2 rounded-lg border text-xs font-medium focus:outline-hidden ${
                          isLight ? "bg-white border-slate-200 text-slate-800" : "bg-slate-900 border-slate-700 text-slate-200"
                        }`}
                      >
                        <option value="price_asc">Price: Low to High</option>
                        <option value="price_desc">Price: High to Low</option>
                        <option value="size_desc">Land Size: Largest First</option>
                        <option value="frontage_desc">Frontage: Widest First</option>
                        <option value="newest">Registration: Titled First</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Action Bar */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800/80 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset All Filters</span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-md cursor-pointer transition-all"
                  >
                    <span>View Matched Blocks ({filteredParcels.length} Available)</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* STEP 3: RESULTS SUMMARY BAR & VIEW SWITCHER */}
        <section className="space-y-4">
          {/* Active Filter Chips */}
          {activeFiltersCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                <Filter className="h-3 w-3 text-amber-500" />
                Active Filters:
              </span>

              {filterState.state !== "ALL" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                  <span>State: {filterState.state}</span>
                  <button type="button" onClick={() => setFilterState((p) => ({ ...p, state: "ALL" }))} className="hover:text-white">✕</button>
                </span>
              )}

              {filterState.searchQuery && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-semibold">
                  <span>"{filterState.searchQuery}"</span>
                  <button type="button" onClick={() => setFilterState((p) => ({ ...p, searchQuery: "" }))} className="hover:text-white">✕</button>
                </span>
              )}

              {filterState.registrationFilter !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                  <span>{filterState.registrationFilter === "registered" ? "Registered Now" : "Registering 2026"}</span>
                  <button type="button" onClick={() => setFilterState((p) => ({ ...p, registrationFilter: "all" }))} className="hover:text-white">✕</button>
                </span>
              )}

              {filterState.slopeCategory !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-semibold capitalize">
                  <span>Topography: {filterState.slopeCategory}</span>
                  <button type="button" onClick={() => setFilterState((p) => ({ ...p, slopeCategory: "all" }))} className="hover:text-white">✕</button>
                </span>
              )}

              {filterState.priceTier !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold">
                  <span>Budget: {filterState.priceTier?.replace("_", " ")}</span>
                  <button type="button" onClick={() => setFilterState((p) => ({ ...p, priceTier: "all" }))} className="hover:text-white">✕</button>
                </span>
              )}

              {filterState.minFrontage && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">
                  <span>Frontage: {filterState.minFrontage}m+</span>
                  <button type="button" onClick={() => setFilterState((p) => ({ ...p, minFrontage: undefined }))} className="hover:text-white">✕</button>
                </span>
              )}

              {filterState.minLandSize && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">
                  <span>Size: {filterState.minLandSize}m²+</span>
                  <button type="button" onClick={() => setFilterState((p) => ({ ...p, minLandSize: undefined }))} className="hover:text-white">✕</button>
                </span>
              )}

              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-rose-400 hover:underline font-semibold ml-1 cursor-pointer"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Results Counter & View Mode Switcher */}
          <div className="flex items-center justify-between gap-4 pt-1 flex-wrap">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className={isLight ? "text-slate-800 font-medium" : "text-slate-200 font-medium"}>
                Showing <strong>{filteredParcels.length}</strong> available vacant block{filteredParcels.length === 1 ? "" : "s"}
              </span>
              {filterState.searchQuery && (
                <span className="text-slate-400">
                  in <span className="text-amber-500 font-bold">"{filterState.searchQuery}"</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* View Switcher */}
              <div className={`flex items-center gap-1 rounded-xl border p-1 text-xs ${
                isLight ? "border-slate-200 bg-white" : "border-slate-800 bg-slate-900"
              }`}>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                      : isLight ? "text-slate-600 hover:text-slate-900" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    viewMode === "table"
                      ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                      : isLight ? "text-slate-600 hover:text-slate-900" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <TableIcon className="h-3.5 w-3.5" />
                  <span>Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("map")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    viewMode === "map"
                      ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                      : isLight ? "text-slate-600 hover:text-slate-900" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  <span>Map</span>
                </button>
              </div>
            </div>
          </div>

          {/* Zero Results State with Smart Fallback (Guarantees user is NEVER left stranded) */}
          {filteredParcels.length === 0 && (
            <div className={`rounded-3xl border p-10 text-center space-y-5 max-w-xl mx-auto my-8 shadow-xl ${
              isLight ? "border-slate-200 bg-white" : "border-slate-800 bg-[#111928]"
            }`}>
              <div className="h-14 w-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-md">
                <Search className="h-7 w-7" />
              </div>
              <div className="space-y-2">
                <h3 className={`text-lg font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                  No vacant blocks match this exact filter
                </h3>
                <p className={`text-xs max-w-md mx-auto leading-relaxed ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                  {lastSearchSummary || "Try loosening your budget, slope, or registration filters, or browse all available blocks across Hudson's network."}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md cursor-pointer"
                >
                  Clear Filters & Show All Available Lots
                </button>
                <button
                  type="button"
                  onClick={handleLoadAllDatabaseLots}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    isLight ? "border-slate-200 bg-slate-100 text-slate-700" : "border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
                  }`}
                >
                  Sync Hudson Database ({parcels.length})
                </button>
              </div>
            </div>
          )}

          {/* VIEW 1: GRID CARDS VIEW */}
          {viewMode === "grid" && filteredParcels.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {filteredParcels.map((parcel) => (
                <LandParcelCard
                  key={parcel.id}
                  parcel={parcel}
                  isLight={isLight}
                  onSiteLot={handleSiteLot}
                  onViewValuation={(p) => setSelectedValuationParcel(p)}
                  onContactAgent={(p) => setSelectedContactParcel(p)}
                  onPackageInFlyer={handlePackageInFlyer}
                />
              ))}
            </div>
          )}

          {/* VIEW 2: CLEAN DATA TABLE VIEW */}
          {viewMode === "table" && filteredParcels.length > 0 && (
            <div className={`rounded-2xl border overflow-x-auto shadow-xl ${
              isLight ? "border-slate-200 bg-white" : "border-slate-800 bg-[#111928]"
            }`}>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                    isLight ? "border-slate-200 bg-slate-100/90 text-slate-700" : "border-slate-800 bg-slate-950/80 text-slate-400"
                  }`}>
                    <th className="p-3 pl-4">Lot / Address</th>
                    <th className="p-3">Estate / Suburb</th>
                    <th className="p-3 text-center">Topography</th>
                    <th className="p-3 text-center">Source Portal</th>
                    <th className="p-3 text-right">Size</th>
                    <th className="p-3 text-right">Frontage</th>
                    <th className="p-3 text-right">Depth</th>
                    <th className="p-3 text-right">Land Price</th>
                    <th className="p-3 text-right">$/m²</th>
                    <th className="p-3 text-center">Registration</th>
                    <th className="p-3">Appointed Contact</th>
                    <th className="p-3 pr-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${
                  isLight ? "divide-slate-200 text-slate-800" : "divide-slate-800/60 text-slate-200"
                }`}>
                  {filteredParcels.map((parcel) => {
                    const fall = parcel.feasibility?.fallEstimateM ?? 0.6;
                    const slope = parcel.feasibility?.slopeCategory || (fall > 1.8 ? "steep" : fall > 0.9 ? "moderate" : "flat");
                    return (
                      <tr key={parcel.id} className={`transition-colors ${
                        isLight ? "hover:bg-slate-50" : "hover:bg-slate-800/40"
                      }`}>
                        <td className={`p-3 pl-4 font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                          {formatLotDisplay(parcel.lotNumber)}
                          <span className={`block text-[10px] font-normal ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                            {parcel.streetAddress}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`font-semibold block ${isLight ? "text-slate-900" : "text-slate-200"}`}>
                            {parcel.estate || parcel.suburb}
                          </span>
                          <span className={`text-[10px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                            {parcel.suburb} {parcel.postcode}
                          </span>
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${
                            slope === "flat"
                              ? isLight ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                              : slope === "moderate"
                                ? isLight ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-amber-500/15 border-amber-500/30 text-amber-300"
                                : isLight ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-rose-500/15 border-rose-500/30 text-rose-300"
                          }`}>
                            {slope} ({fall}m)
                          </span>
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getSourceBadgeStyle(parcel.sourcePortal, isLight)}`}>
                            {parcel.sourcePortal || "RealEstate"}
                          </span>
                        </td>
                        <td className={`p-3 text-right font-semibold ${isLight ? "text-slate-900" : "text-slate-100"}`}>{parcel.landSizeM2} m²</td>
                        <td className={`p-3 text-right ${isLight ? "text-slate-800" : "text-slate-200"}`}>{parcel.frontageM} m</td>
                        <td className={`p-3 text-right ${isLight ? "text-slate-500" : "text-slate-400"}`}>{parcel.depthM} m</td>
                        <td className={`p-3 text-right font-bold ${isLight ? "text-amber-600" : "text-amber-400"}`}>
                          ${parcel.price.toLocaleString()}
                        </td>
                        <td className={`p-3 text-right font-mono text-[11px] ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                          ${parcel.pricePerM2}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              parcel.isRegistered
                                ? isLight ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                : isLight ? "bg-cyan-50 border-cyan-200 text-cyan-700" : "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
                            }`}
                          >
                            {parcel.expectedRegistrationDate || (parcel.isRegistered ? "Registered" : "Pending")}
                          </span>
                        </td>
                        <td className={`p-3 min-w-[200px] ${isLight ? "text-slate-800" : "text-slate-300"}`}>
                          <span className={`font-bold block truncate ${isLight ? "text-slate-900" : "text-white"}`}>{parcel.agentName}</span>
                          <span className={`text-[10px] block truncate ${isLight ? "text-slate-500" : "text-slate-400"}`}>{parcel.agentAgency || "Land Specialist"}</span>
                          {parcel.agentPhone && (
                            <a
                              href={`tel:${parcel.agentPhone.replace(/\s+/g, "")}`}
                              className="text-[10px] font-semibold text-emerald-500 hover:underline block mt-0.5"
                            >
                              {parcel.agentPhone}
                            </a>
                          )}
                        </td>
                        <td className="p-3 pr-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSiteLot(parcel)}
                              className="px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-500 hover:bg-amber-500 hover:text-slate-950 text-[10px] font-bold transition-all cursor-pointer shadow-xs"
                              title="Site Hudson House Designs on this Lot"
                            >
                              Site Lot
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedValuationParcel(parcel)}
                              className={`px-2 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                                isLight
                                  ? "bg-slate-100 border-slate-300 text-emerald-700 hover:border-emerald-500"
                                  : "bg-slate-800 border-slate-700 text-emerald-400 hover:border-emerald-500"
                              }`}
                              title="Appraise land valuation & equity"
                            >
                              Appraise
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePackageInFlyer(parcel)}
                              className={`px-2 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                                isLight
                                  ? "bg-slate-100 border-slate-300 text-amber-600 hover:border-amber-500"
                                  : "bg-slate-800 border-slate-700 text-amber-400 hover:border-amber-500"
                              }`}
                              title="Package in Flyer"
                            >
                              Package
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* VIEW 3: INTERACTIVE MAP VIEW */}
          {viewMode === "map" && filteredParcels.length > 0 && (
            <LandScoutMapView
              parcels={filteredParcels}
              onPackageInFlyer={handlePackageInFlyer}
              onContactAgent={(p) => setSelectedContactParcel(p)}
              onViewValuation={(p) => setSelectedValuationParcel(p)}
            />
          )}
        </section>

        {/* Interactive Modals & Drawers */}
        <PriceListImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImportComplete={handleImportComplete}
        />

        <AddCustomLotModal
          isOpen={isAddLotModalOpen}
          onClose={() => setIsAddLotModalOpen(false)}
          onLotAdded={handleCustomLotAdded}
        />

        <LandValuationDrawer
          parcel={selectedValuationParcel}
          onClose={() => setSelectedValuationParcel(null)}
          onPackageInFlyer={handlePackageInFlyer}
        />

        <AgentOutreachModal
          parcel={selectedContactParcel}
          onClose={() => setSelectedContactParcel(null)}
          onOutreachLogged={handleOutreachLogged}
        />
      </main>
    </div>
  );
}
