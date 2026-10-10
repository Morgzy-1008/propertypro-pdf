import { useState } from "react";
import {
  Search,
  X,
  SlidersHorizontal,
  RotateCcw,
  Zap,
  ArrowUpDown,
  LayoutList,
  LayoutGrid,
  ChevronDown,
  ChevronUp,
  MapPin,
  Tag,
  Bed,
  Bath,
  Car,
  Maximize,
} from "lucide-react";
import type {
  FloorplanFiltersState,
  HouseTypeFilter,
  InclusionsTier,
  SortOption,
  ViewMode,
} from "@/lib/floorplan-library/floorplanLibraryEngine";

interface FloorplanFilterBarProps {
  filters: FloorplanFiltersState;
  onFilterChange: <K extends keyof FloorplanFiltersState>(key: K, value: FloorplanFiltersState[K]) => void;
  onResetFilters: () => void;
  totalCount: number;
  filteredCount: number;
  bounds: {
    minWidth: number;
    maxWidth: number;
    minLength: number;
    maxLength: number;
    minSize: number;
    maxSize: number;
    minPrice: number;
    maxPrice: number;
  };
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  isLight: boolean;
}

const HOUSE_TYPES: { label: string; value: HouseTypeFilter }[] = [
  { label: "All House Types", value: "All" },
  { label: "Single Storey", value: "Single Storey" },
  { label: "Double Storey", value: "Double Storey" },
  { label: "Dual Living / Duplex", value: "Dual Living" },
  { label: "Split Level", value: "Split Level" },
  { label: "Granny Flat", value: "Granny Flat" },
];

const INCLUSIONS_TIERS: { label: string; sub: string; value: InclusionsTier }[] = [
  { label: "H1", sub: "Smart Living", value: "H1" },
  { label: "H2", sub: "Design Collection", value: "H2" },
  { label: "H3", sub: "Luxury Inclusions", value: "H3" },
  { label: "HBS", sub: "Home Builder", value: "HBS" },
];

const LOT_FRONTAGE_PRESETS = [
  { label: "All Lots", width: 30 },
  { label: "10m Lot", width: 8.5 },
  { label: "12.5m Lot", width: 11.4 },
  { label: "14m Lot", width: 12.5 },
  { label: "16m+ Lot", width: 30 },
];

const PRICE_PRESETS = [
  { label: "All Prices", min: 0, max: 2000000 },
  { label: "Under $350k", min: 0, max: 350000 },
  { label: "$350k - $450k", min: 350000, max: 450000 },
  { label: "$450k - $550k", min: 450000, max: 550000 },
  { label: "$550k+", min: 550000, max: 2000000 },
];

export function FloorplanFilterBar({
  filters,
  onFilterChange,
  onResetFilters,
  totalCount,
  filteredCount,
  bounds,
  viewMode,
  onViewModeChange,
  isLight,
}: FloorplanFilterBarProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Count active non-default filters
  let activeFilterCount = 0;
  if (filters.searchQuery.trim()) activeFilterCount++;
  if (filters.houseType !== "All") activeFilterCount++;
  if (filters.btbOnly) activeFilterCount++;
  if (filters.bedrooms !== null) activeFilterCount++;
  if (filters.bathrooms !== null) activeFilterCount++;
  if (filters.cars !== null) activeFilterCount++;
  if (filters.minWidth > bounds.minWidth || filters.maxWidth < bounds.maxWidth) activeFilterCount++;
  if (filters.minLength > bounds.minLength || filters.maxLength < bounds.maxLength) activeFilterCount++;
  if (filters.minSize > bounds.minSize || filters.maxSize < bounds.maxSize) activeFilterCount++;
  if (filters.minPrice > bounds.minPrice || filters.maxPrice < bounds.maxPrice) activeFilterCount++;

  return (
    <div
      className={`rounded-2xl border transition-all shadow-xl backdrop-blur-xl ${
        isLight
          ? "bg-white/95 border-slate-200/90 text-slate-900 shadow-slate-200/50"
          : "bg-slate-950/90 border-slate-800/80 text-white shadow-black/60"
      }`}
    >
      {/* Primary Top Bar */}
      <div className="p-4 sm:p-5 flex flex-col gap-4">
        {/* Row 1: Search + House Type + View Switcher */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Quick Search */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search design (e.g. Amber 21, Jasper, Ruby, Double Storey)..."
              value={filters.searchQuery}
              onChange={(e) => onFilterChange("searchQuery", e.target.value)}
              className={`w-full pl-10 pr-9 py-2.5 rounded-xl border text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-amber-500/40 ${
                isLight
                  ? "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                  : "bg-slate-900/90 border-slate-700/80 text-white placeholder-slate-500"
              }`}
            />
            {filters.searchQuery && (
              <button
                type="button"
                onClick={() => onFilterChange("searchQuery", "")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Regional Division Toggle: QLD vs NSW */}
          <div
            className={`flex items-center p-1 rounded-xl border shrink-0 ${
              isLight ? "bg-slate-100 border-slate-200" : "bg-slate-900 border-slate-800"
            }`}
          >
            <button
              type="button"
              onClick={() => onFilterChange("division", "QLD")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filters.division === "QLD"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <MapPin className="h-3 w-3" />
              QLD Pricing
            </button>
            <button
              type="button"
              onClick={() => onFilterChange("division", "NSW")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filters.division === "NSW"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <MapPin className="h-3 w-3" />
              NSW Pricing
            </button>
          </div>

          {/* Inclusions Tier Selector */}
          <div
            className={`flex items-center p-1 rounded-xl border shrink-0 overflow-x-auto ${
              isLight ? "bg-slate-100 border-slate-200" : "bg-slate-900 border-slate-800"
            }`}
          >
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-2 font-bold hidden sm:inline">
              Tier:
            </span>
            {INCLUSIONS_TIERS.map((tier) => {
              const active = filters.inclusionsTier === tier.value;
              return (
                <button
                  key={tier.value}
                  type="button"
                  onClick={() => onFilterChange("inclusionsTier", tier.value)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                    active
                      ? "bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-sm font-extrabold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                  title={`${tier.label} - ${tier.sub}`}
                >
                  <Tag className="h-3 w-3" />
                  <span>{tier.label}</span>
                  <span className="hidden xl:inline text-[10px] opacity-80">({tier.sub})</span>
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle: Showcase Feed vs Grid */}
          <div
            className={`flex items-center p-1 rounded-xl border shrink-0 ${
              isLight ? "bg-slate-100 border-slate-200" : "bg-slate-900 border-slate-800"
            }`}
          >
            <button
              type="button"
              onClick={() => onViewModeChange("feed")}
              className={`p-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "feed"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Showcase Feed (Extra Large High-Def Plans for effortless scanning)"
            >
              <LayoutList className="h-4 w-4" />
              <span className="text-xs hidden md:inline">Showcase Feed</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              className={`p-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === "grid"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Dual Column Grid (Side-by-side Large Plans)"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="text-xs hidden md:inline">Dual Grid</span>
            </button>
          </div>
        </div>

        {/* Row 2: House Types Segmented Bar + BTB Quick Button + Bedrooms */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          {/* House Types Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {HOUSE_TYPES.map((type) => {
              const active = filters.houseType === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => onFilterChange("houseType", type.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-bold scale-[1.02]"
                      : isLight
                      ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                  }`}
                >
                  {type.label}
                </button>
              );
            })}
          </div>

          {/* BTB (Built to Boundary) Pill Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onFilterChange("btbOnly", !filters.btbOnly)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-sm ${
                filters.btbOnly
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 border-amber-400 font-extrabold shadow-amber-500/20 scale-[1.02]"
                  : isLight
                  ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 border-amber-300/50"
                  : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30"
              }`}
              title="Filter plans ready for Built-To-Boundary / Zero-Lot garage walls (200mm clearance)"
            >
              <Zap className={`h-3.5 w-3.5 ${filters.btbOnly ? "text-slate-950 fill-current" : "text-amber-500"}`} />
              <span>BTB Ready Only</span>
              {filters.btbOnly && <span className="h-1.5 w-1.5 rounded-full bg-slate-950 animate-pulse ml-0.5" />}
            </button>

            {/* Advanced Filters Expand/Collapse */}
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 border ${
                activeFilterCount > 0
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold"
                  : isLight
                  ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                  : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                  {activeFilterCount}
                </span>
              )}
              {isAdvancedOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Advanced Filters Tray */}
      {isAdvancedOpen && (
        <div
          className={`border-t px-4 sm:px-5 py-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in duration-200 ${
            isLight ? "border-slate-200 bg-slate-50/70" : "border-slate-800/80 bg-slate-900/40"
          }`}
        >
          {/* Col 1: Bedrooms & Bathrooms */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Bed className="h-3.5 w-3.5 text-indigo-400" />
              Bedrooms
            </label>
            <div className="flex items-center gap-1.5">
              {[
                { label: "All", val: null },
                { label: "2", val: 2 },
                { label: "3", val: 3 },
                { label: "4", val: 4 },
                { label: "5+", val: 5 },
              ].map((opt) => {
                const active = filters.bedrooms === opt.val;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => onFilterChange("bedrooms", opt.val)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      active
                        ? "bg-indigo-600 text-white shadow-sm"
                        : isLight
                        ? "bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                        : "bg-slate-900 border border-slate-700 text-slate-300 hover:bg-slate-800"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 pt-2">
              <Bath className="h-3.5 w-3.5 text-indigo-400" />
              Bathrooms &amp; Garage
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={filters.bathrooms === null ? "all" : String(filters.bathrooms)}
                onChange={(e) =>
                  onFilterChange("bathrooms", e.target.value === "all" ? null : parseInt(e.target.value, 10))
                }
                className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-semibold outline-none ${
                  isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-white"
                }`}
              >
                <option value="all">Any Baths</option>
                <option value="1">1 Bath</option>
                <option value="2">2 Baths</option>
                <option value="3">3+ Baths</option>
              </select>

              <select
                value={filters.cars === null ? "all" : String(filters.cars)}
                onChange={(e) =>
                  onFilterChange("cars", e.target.value === "all" ? null : parseInt(e.target.value, 10))
                }
                className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-semibold outline-none ${
                  isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-white"
                }`}
              >
                <option value="all">Any Garage</option>
                <option value="1">1 Car</option>
                <option value="2">2 Cars</option>
                <option value="3">3+ Cars</option>
              </select>
            </div>
          </div>

          {/* Col 2: Width & Lot Frontage */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Maximize className="h-3.5 w-3.5 text-cyan-400" />
                Floorplan Width
              </label>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {filters.minWidth.toFixed(1)}m – {filters.maxWidth.toFixed(1)}m
              </span>
            </div>

            {/* Quick lot width presets */}
            <div className="flex flex-wrap gap-1">
              {LOT_FRONTAGE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    if (preset.label === "All Lots") {
                      onFilterChange("minWidth", bounds.minWidth);
                      onFilterChange("maxWidth", bounds.maxWidth);
                    } else {
                      onFilterChange("minWidth", bounds.minWidth);
                      onFilterChange("maxWidth", preset.width);
                    }
                  }}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                    filters.maxWidth === preset.width
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                      : isLight
                      ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">Min Width (m)</span>
                <input
                  type="number"
                  step="0.1"
                  min={bounds.minWidth}
                  max={filters.maxWidth}
                  value={filters.minWidth}
                  onChange={(e) => onFilterChange("minWidth", parseFloat(e.target.value) || bounds.minWidth)}
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold ${
                    isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-white"
                  }`}
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">Max Width (m)</span>
                <input
                  type="number"
                  step="0.1"
                  min={filters.minWidth}
                  max={bounds.maxWidth}
                  value={filters.maxWidth}
                  onChange={(e) => onFilterChange("maxWidth", parseFloat(e.target.value) || bounds.maxWidth)}
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold ${
                    isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-white"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Col 3: Length & Size (m²) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Size (m²)
              </label>
              <span className="text-xs font-mono font-bold text-amber-400">
                {filters.minSize}m² – {filters.maxSize}m²
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">Min m²</span>
                <input
                  type="number"
                  step="5"
                  min={bounds.minSize}
                  max={filters.maxSize}
                  value={filters.minSize}
                  onChange={(e) => onFilterChange("minSize", parseInt(e.target.value, 10) || bounds.minSize)}
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold ${
                    isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-white"
                  }`}
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">Max m²</span>
                <input
                  type="number"
                  step="5"
                  min={filters.minSize}
                  max={bounds.maxSize}
                  value={filters.maxSize}
                  onChange={(e) => onFilterChange("maxSize", parseInt(e.target.value, 10) || bounds.maxSize)}
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold ${
                    isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-white"
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                House Length (m)
              </label>
              <span className="text-xs font-mono font-bold text-slate-400">
                {filters.minLength}m – {filters.maxLength}m
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="0.5"
                min={bounds.minLength}
                max={filters.maxLength}
                value={filters.minLength}
                onChange={(e) => onFilterChange("minLength", parseFloat(e.target.value) || bounds.minLength)}
                className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold ${
                  isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-white"
                }`}
                placeholder="Min Length"
              />
              <input
                type="number"
                step="0.5"
                min={filters.minLength}
                max={bounds.maxLength}
                value={filters.maxLength}
                onChange={(e) => onFilterChange("maxLength", parseFloat(e.target.value) || bounds.maxLength)}
                className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold ${
                  isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-white"
                }`}
                placeholder="Max Length"
              />
            </div>
          </div>

          {/* Col 4: Price & Sort */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Price ({filters.inclusionsTier})
              </label>
              <span className="text-xs font-mono font-bold text-emerald-400">
                ${(filters.minPrice / 1000).toFixed(0)}k – ${(filters.maxPrice / 1000).toFixed(0)}k
              </span>
            </div>

            {/* Quick Price presets */}
            <div className="flex flex-wrap gap-1">
              {PRICE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    onFilterChange("minPrice", preset.min);
                    onFilterChange("maxPrice", preset.max);
                  }}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                    filters.maxPrice === preset.max && filters.minPrice === preset.min
                      ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                      : isLight
                      ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="pt-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
                <ArrowUpDown className="h-3.5 w-3.5 text-amber-400" />
                Sort Floorplans
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => onFilterChange("sortBy", e.target.value as SortOption)}
                className={`w-full px-3 py-1.5 rounded-lg border text-xs font-bold outline-none cursor-pointer ${
                  isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-white"
                }`}
              >
                <option value="size-desc">Size: Largest to Smallest</option>
                <option value="size-asc">Size: Smallest to Largest</option>
                <option value="price-asc">Price: Lowest to Highest</option>
                <option value="price-desc">Price: Highest to Lowest</option>
                <option value="width-asc">Width: Narrowest (Lot Fit)</option>
                <option value="width-desc">Width: Widest First</option>
                <option value="name-asc">Alphabetical: A to Z</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Results Telemetry & Reset Bar */}
      <div
        className={`px-4 sm:px-5 py-2.5 border-t flex items-center justify-between gap-3 text-xs ${
          isLight ? "border-slate-200 bg-slate-100/70 text-slate-600" : "border-slate-800/80 bg-slate-950/70 text-slate-400"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold">
            Showing <strong className="text-amber-500 font-extrabold">{filteredCount}</strong> of{" "}
            <strong>{totalCount}</strong> Hudson floorplans
          </span>
          {filters.btbOnly && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold font-mono">
              ⚡ BTB Only
            </span>
          )}
          {filters.houseType !== "All" && (
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold">
              {filters.houseType}
            </span>
          )}
        </div>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onResetFilters}
            className="flex items-center gap-1.5 text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset All Filters</span>
          </button>
        )}
      </div>
    </div>
  );
}
