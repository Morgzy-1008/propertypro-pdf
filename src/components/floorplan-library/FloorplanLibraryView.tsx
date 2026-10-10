import { useState, useMemo, useEffect } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import {
  ArrowLeft,
  LayoutGrid,
  Sparkles,
  Zap,
  ArrowUp,
  Layers,
  Search,
  Filter,
} from "lucide-react";
import { Logo, HudsonMark } from "@/components/flyer/FlyerTemplates";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useTheme } from "@/lib/theme";
import { StaffHeaderProfile } from "@/components/auth/StaffHeaderProfile";
import { getActiveStaffUser } from "@/lib/authSession";
import { getActiveDivision } from "@/lib/divisionContext";
import {
  loadAllFloorplanLibraryItems,
  filterAndSortFloorplans,
  getFilterBounds,
  type FloorplanLibraryItem,
  type FloorplanFiltersState,
  type ViewMode,
} from "@/lib/floorplan-library/floorplanLibraryEngine";
import { FloorplanFilterBar } from "./FloorplanFilterBar";
import { FloorplanCard } from "./FloorplanCard";
import { FloorplanPresentationModal } from "./FloorplanPresentationModal";

export function FloorplanLibraryView() {
  const { mode } = useTheme();
  const isLight = mode === "normal";
  const staffUser = getActiveStaffUser();
  const divisionContext = (staffUser?.division || staffUser?.state || getActiveDivision()) === "NSW" ? "NSW" : "QLD";

  // Check URL query parameters for pre-selected design or filters
  const searchParams = useSearch({ strict: false }) as Record<string, string | undefined>;
  const initialQuery = searchParams?.design || searchParams?.q || "";

  // 1. Load all floorplans
  const [division, setDivision] = useState<"QLD" | "NSW">(divisionContext);
  const allFloorplans = useMemo(() => loadAllFloorplanLibraryItems(division), [division]);
  const bounds = useMemo(() => getFilterBounds(allFloorplans), [allFloorplans]);

  // 2. Filter state
  const [filters, setFilters] = useState<FloorplanFiltersState>(() => ({
    searchQuery: initialQuery,
    houseType: "All",
    inclusionsTier: "H2",
    division: divisionContext,
    btbOnly: false,
    bedrooms: null,
    bathrooms: null,
    cars: null,
    minWidth: bounds.minWidth,
    maxWidth: bounds.maxWidth,
    minLength: bounds.minLength,
    maxLength: bounds.maxLength,
    minSize: bounds.minSize,
    maxSize: bounds.maxSize,
    minPrice: bounds.minPrice,
    maxPrice: bounds.maxPrice,
    sortBy: "size-desc",
  }));

  // Update bounds when division or items reload
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      division,
      minWidth: Math.min(prev.minWidth, bounds.minWidth),
      maxWidth: Math.max(prev.maxWidth, bounds.maxWidth),
      minPrice: Math.min(prev.minPrice, bounds.minPrice),
      maxPrice: Math.max(prev.maxPrice, bounds.maxPrice),
    }));
  }, [bounds, division]);

  // Sync division change
  const handleFilterChange = <K extends keyof FloorplanFiltersState>(
    key: K,
    value: FloorplanFiltersState[K]
  ) => {
    if (key === "division") {
      setDivision(value as "QLD" | "NSW");
    }
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      searchQuery: "",
      houseType: "All",
      inclusionsTier: "H2",
      division,
      btbOnly: false,
      bedrooms: null,
      bathrooms: null,
      cars: null,
      minWidth: bounds.minWidth,
      maxWidth: bounds.maxWidth,
      minLength: bounds.minLength,
      maxLength: bounds.maxLength,
      minSize: bounds.minSize,
      maxSize: bounds.maxSize,
      minPrice: bounds.minPrice,
      maxPrice: bounds.maxPrice,
      sortBy: "size-desc",
    });
  };

  // 3. View Mode (Showcase Feed vs Dual Grid)
  const [viewMode, setViewMode] = useState<ViewMode>("feed");

  // 4. Modal presentation state
  const [selectedZoomItem, setSelectedZoomItem] = useState<FloorplanLibraryItem | null>(null);

  // 5. Filtered items
  const filteredPlans = useMemo(
    () => filterAndSortFloorplans(allFloorplans, filters),
    [allFloorplans, filters]
  );

  // Scroll to top button visibility
  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={`min-h-screen ${
        isLight ? "bg-slate-100 text-slate-900" : "bg-slate-950 text-slate-100"
      } flex flex-col font-sans selection:bg-brand-gold/30 relative overflow-x-hidden`}
    >
      {/* Subtle Geometric Background */}
      <div
        className={`fixed inset-0 pointer-events-none ${
          isLight
            ? "bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:32px_32px] opacity-25"
            : "bg-[radial-gradient(#334155_1.2px,transparent_1.2px)] [background-size:32px_32px] opacity-20"
        }`}
      />

      {/* Atmospheric Ambient Glow Orbs */}
      <div className="fixed top-12 left-1/4 w-[500px] h-[350px] bg-gradient-to-br from-indigo-500/10 via-cyan-500/5 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed top-36 right-1/4 w-[500px] h-[350px] bg-gradient-to-bl from-amber-500/10 via-orange-500/5 to-transparent rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header */}
      <header
        className={`border-b ${
          isLight ? "border-slate-200/90 bg-white/90 shadow-xs" : "border-slate-800/80 bg-slate-950/80"
        } backdrop-blur-xl sticky top-0 z-40 transition-colors`}
      >
        <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
        <div className="w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 h-16 flex items-center justify-between gap-4">
          {/* Left: Back Link & Logo */}
          <div className="flex items-center gap-3">
            <Link
              to="/hub"
              className={`p-2 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-bold ${
                isLight
                  ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700"
                  : "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300"
              }`}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Hub</span>
            </Link>

            <Link to="/hub" className="flex items-center">
              <HudsonMark size={9} className="sm:hidden" />
              <div className="hidden sm:block">
                <Logo light={!isLight} size={11} />
              </div>
            </Link>

            <div className={`hidden md:block border-l ${isLight ? "border-slate-300" : "border-slate-700/80"} pl-3`}>
              <span className={`text-xs font-extrabold tracking-widest uppercase font-mono ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                Floorplan Library
              </span>
              <span className="block text-[10px] tracking-widest text-amber-500 font-bold uppercase">
                Display Suite Catalog • {division} Pricing
              </span>
            </div>
          </div>

          {/* Right: Theme Toggle & Staff Profile */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <StaffHeaderProfile isLight={isLight} />
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-8 relative z-10 flex flex-col gap-8">
        {/* Banner / Title Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                <LayoutGrid className="h-3 w-3" />
                Hudson Architectural Repository
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                <Zap className="h-3 w-3" />
                BTB Zero-Lot Compatible
              </span>
            </div>

            <h1
              className={`text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight ${
                isLight ? "text-slate-900" : "text-white"
              }`}
            >
              Floorplan{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-400 to-cyan-400">
                Library
              </span>
            </h1>
            <p className={`mt-2 text-sm sm:text-base max-w-3xl ${isLight ? "text-slate-600" : "text-slate-400"}`}>
              Effortlessly browse and present 220+ Hudson Homes floorplans directly with clients in display homes.
              Filter by lot width, house length, bedrooms, size, and multi-tier inclusions pricing.
            </p>
          </div>

          {/* Telemetry pill */}
          <div
            className={`p-3 rounded-2xl border flex items-center gap-3 shrink-0 ${
              isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/80 border-slate-800 shadow-lg"
            }`}
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-mono font-black text-sm">
              {filteredPlans.length}
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Matching Designs
              </span>
              <span className="text-sm font-extrabold">
                {filters.inclusionsTier} Tier Active
              </span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <FloorplanFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          totalCount={allFloorplans.length}
          filteredCount={filteredPlans.length}
          bounds={bounds}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          isLight={isLight}
        />

        {/* Floorplans Render List */}
        {filteredPlans.length === 0 ? (
          <div
            className={`rounded-3xl border p-12 text-center flex flex-col items-center justify-center gap-4 my-8 ${
              isLight ? "bg-white border-slate-200 text-slate-800" : "bg-slate-900/60 border-slate-800 text-slate-200"
            }`}
          >
            <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Search className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold">No Hudson floorplans match your exact filters</h3>
            <p className="text-sm text-slate-400 max-w-md">
              Try adjusting your width, length, or bedroom requirements, or click below to reset all filters.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md cursor-pointer transition-all active:scale-95"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div
            className={
              viewMode === "feed"
                ? "flex flex-col gap-10 max-w-6xl mx-auto w-full"
                : "grid grid-cols-1 md:grid-cols-2 gap-8 w-full"
            }
          >
            {filteredPlans.map((item) => (
              <FloorplanCard
                key={item.id}
                item={item}
                activeTier={filters.inclusionsTier}
                viewMode={viewMode}
                onOpenZoom={setSelectedZoomItem}
                isLight={isLight}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating Scroll to Top Button */}
      {showScrollTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-40 p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl transition-all cursor-pointer flex items-center justify-center active:scale-90"
          title="Scroll to top"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}

      {/* High-Resolution Presentation / Zoom Modal */}
      {selectedZoomItem && (
        <FloorplanPresentationModal
          item={selectedZoomItem}
          onClose={() => setSelectedZoomItem(null)}
          isLight={isLight}
        />
      )}
    </div>
  );
}
