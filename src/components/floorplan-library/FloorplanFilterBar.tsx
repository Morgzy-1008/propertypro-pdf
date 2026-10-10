import { useState } from "react";
import {
  Search,
  X,
  SlidersHorizontal,
  RotateCcw,
  Zap,
  ArrowUpDown,
  LayoutList,
  Columns2,
  Columns3,
  ChevronDown,
  ChevronUp,
  Tag,
  Bed,
  Bath,
  Car,
  Maximize,
  Ruler,
  Layers,
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
  typeCounts?: Record<HouseTypeFilter, number>;
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

const HOUSE_TYPES: { label: string; short: string; value: HouseTypeFilter }[] = [
  { label: "All House Types", short: "All", value: "All" },
  { label: "Single Storey", short: "Single", value: "Single Storey" },
  { label: "Double Storey", short: "Double", value: "Double Storey" },
  { label: "Dual Living", short: "Dual", value: "Dual Living" },
  { label: "Split Level", short: "Split", value: "Split Level" },
  { label: "Granny Flat", short: "Granny", value: "Granny Flat" },
];

const INCLUSIONS_TIERS: { label: string; sub: string; value: InclusionsTier }[] = [
  { label: "H1", sub: "Smart Living", value: "H1" },
  { label: "H2", sub: "Design", value: "H2" },
  { label: "H3", sub: "Luxury", value: "H3" },
  { label: "HBS", sub: "Builder", value: "HBS" },
];

const LOT_WIDTH_PRESETS = [
  { id: "all", label: "All Lots", badge: "" },
  { id: "10m", label: "10m Lot", badge: "≤8.8m" },
  { id: "12.5m", label: "12.5m Lot", badge: "8.8–11.4m" },
  { id: "14m", label: "14m Lot", badge: "11.4–12.8m" },
  { id: "16m+", label: "16m+ Lot", badge: ">12.8m" },
];

const SIZE_PRESETS = [
  { id: "all", label: "All Sizes", badge: "" },
  { id: "under-20", label: "< 20sq", badge: "≤185m²" },
  { id: "20-25", label: "20–25sq", badge: "185–232m²" },
  { id: "25-30", label: "25–30sq", badge: "232–278m²" },
  { id: "30-35", label: "30–35sq", badge: "278–325m²" },
  { id: "35-plus", label: "35sq+", badge: ">325m²" },
];

const PRICE_PRESETS = [
  { id: "all", label: "All Prices" },
  { id: "under-350", label: "< $350k" },
  { id: "350-450", label: "$350k–$450k" },
  { id: "450-550", label: "$450k–$550k" },
  { id: "550-plus", label: "$550k+" },
];

export function FloorplanFilterBar({
  filters,
  onFilterChange,
  onResetFilters,
  totalCount,
  filteredCount,
  typeCounts,
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
  if (filters.lotWidthPreset && filters.lotWidthPreset !== "all") activeFilterCount++;
  if (filters.sizePreset && filters.sizePreset !== "all") activeFilterCount++;
  if (filters.pricePreset && filters.pricePreset !== "all") activeFilterCount++;
  if (filters.bedrooms !== null) activeFilterCount++;
  if (filters.bathrooms !== null) activeFilterCount++;
  if (filters.cars !== null) activeFilterCount++;
  if (filters.minWidth > bounds.minWidth || filters.maxWidth < bounds.maxWidth) activeFilterCount++;
  if (filters.minLength > bounds.minLength || filters.maxLength < bounds.maxLength) activeFilterCount++;
  if (filters.minSize > bounds.minSize || filters.maxSize < bounds.maxSize) activeFilterCount++;
  if (filters.minPrice > bounds.minPrice || filters.maxPrice < bounds.maxPrice) activeFilterCount++;

  return (
    <div
      className={`rounded-3xl border transition-all shadow-xl backdrop-blur-xl ${
        isLight
          ? "bg-white/95 border-slate-200/90 text-slate-900 shadow-slate-200/50"
          : "bg-slate-950/90 border-slate-800/80 text-white shadow-black/60"
      }`}
    >
      {/* ─────────────────────────────────────────────────────────────
          ROW 1: Primary Command Strip (Search + House Type + View Mode)
          ───────────────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 pb-3.5 flex flex-col gap-3">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
          {/* Quick Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search design (e.g. Amber 21, Jasper, Ruby, Double Storey)..."
              value={filters.searchQuery}
              onChange={(e) => onFilterChange("searchQuery", e.target.value)}
              className={`w-full pl-10 pr-9 py-2 rounded-xl border text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-amber-500/40 ${
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

          {/* House Types Segmented Bar */}
          <div
            className={`flex items-center p-1 rounded-xl border overflow-x-auto scrollbar-none shrink-0 ${
              isLight ? "bg-slate-100 border-slate-200" : "bg-slate-900 border-slate-800"
            }`}
          >
            {HOUSE_TYPES.map((type) => {
              const active = filters.houseType === type.value;
              const count = typeCounts ? typeCounts[type.value] : undefined;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => onFilterChange("houseType", type.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                    active
                      ? "bg-indigo-600 text-white shadow-sm font-extrabold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span>{type.short}</span>
                  {count !== undefined && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                        active
                          ? "bg-indigo-700/80 text-white"
                          : isLight
                          ? "bg-slate-200 text-slate-600"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Controls: BTB + Pricing Division + View Switcher */}
          <div className="flex items-center gap-2 shrink-0">
            {/* BTB Ready Toggle */}
            <button
              type="button"
              onClick={() => onFilterChange("btbOnly", !filters.btbOnly)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border shadow-sm ${
                filters.btbOnly
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 border-amber-400 font-extrabold shadow-amber-500/20"
                  : isLight
                  ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 border-amber-300/50"
                  : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30"
              }`}
              title="Filter standard designs engineered for Built-To-Boundary / Zero-Lot garage walls"
            >
              <Zap className={`h-3.5 w-3.5 ${filters.btbOnly ? "text-slate-950 fill-current" : "text-amber-500"}`} />
              <span>BTB Ready</span>
            </button>

            {/* Division Toggle (QLD / NSW) */}
            <div
              className={`flex items-center p-1 rounded-xl border shrink-0 ${
                isLight ? "bg-slate-100 border-slate-200" : "bg-slate-900 border-slate-800"
              }`}
            >
              <button
                type="button"
                onClick={() => onFilterChange("division", "QLD")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filters.division === "QLD"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                QLD
              </button>
              <button
                type="button"
                onClick={() => onFilterChange("division", "NSW")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filters.division === "NSW"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                NSW
              </button>
            </div>

            {/* View Mode Switcher: 3 Across (Default) vs 2 Across vs Feed */}
            <div
              className={`flex items-center p-1 rounded-xl border shrink-0 ${
                isLight ? "bg-slate-100 border-slate-200" : "bg-slate-900 border-slate-800"
              }`}
            >
              <button
                type="button"
                onClick={() => onViewModeChange("grid-3")}
                className={`p-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "grid-3"
                    ? "bg-indigo-600 text-white shadow-sm font-extrabold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="3 Floorplans Across (Scan more plans side-by-side)"
              >
                <Columns3 className="h-4 w-4" />
                <span className="hidden sm:inline">3 Across</span>
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange("grid-2")}
                className={`p-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "grid-2"
                    ? "bg-indigo-600 text-white shadow-sm font-extrabold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="2 Floorplans Across (Dual Grid)"
              >
                <Columns2 className="h-4 w-4" />
                <span className="hidden sm:inline">2 Across</span>
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange("feed")}
                className={`p-1.5 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === "feed"
                    ? "bg-indigo-600 text-white shadow-sm font-extrabold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Single Column Showcase Feed"
              >
                <LayoutList className="h-4 w-4" />
                <span className="hidden sm:inline">Feed</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ROW 2: Fast Uncluttered Filters: Width, Size Variants, and Pricing
          ───────────────────────────────────────────────────────────── */}
      <div
        className={`px-4 sm:px-5 py-3 border-t flex flex-wrap items-center justify-between gap-3 ${
          isLight ? "border-slate-100 bg-slate-50/50" : "border-slate-800/80 bg-slate-900/30"
        }`}
      >
        <div className="flex flex-wrap items-center gap-3 lg:gap-5">
          {/* Section 1: Lot Width Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1 text-slate-400 mr-0.5">
              <Ruler className="h-3.5 w-3.5 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Width:</span>
            </div>
            {LOT_WIDTH_PRESETS.map((preset) => {
              const active = (filters.lotWidthPreset || "all") === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onFilterChange("lotWidthPreset", preset.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                    active
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 font-black shadow-xs scale-[1.02]"
                      : isLight
                      ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <span>{preset.label}</span>
                  {preset.badge && (
                    <span className="text-[10px] opacity-75 font-mono">({preset.badge})</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className={`hidden md:block h-5 w-[1px] ${isLight ? "bg-slate-200" : "bg-slate-800"}`} />

          {/* Section 2: Size Variants / Squares (Selectable from screen top!) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1 text-slate-400 mr-0.5">
              <Layers className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Size:</span>
            </div>
            {SIZE_PRESETS.map((preset) => {
              const active = (filters.sizePreset || "all") === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onFilterChange("sizePreset", preset.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                    active
                      ? "bg-indigo-500/20 border-indigo-400 text-indigo-300 font-black shadow-xs scale-[1.02]"
                      : isLight
                      ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <span>{preset.label}</span>
                  {preset.badge && (
                    <span className="text-[10px] opacity-75 font-mono">({preset.badge})</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className={`hidden md:block h-5 w-[1px] ${isLight ? "bg-slate-200" : "bg-slate-800"}`} />

          {/* Section 3: Inclusions Tier & Price Brackets */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Inclusions Tier */}
            <div className="flex items-center gap-1">
              <Tag className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-0.5">Tier:</span>
              <div
                className={`flex items-center p-0.5 rounded-lg border shrink-0 ${
                  isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
                }`}
              >
                {INCLUSIONS_TIERS.map((tier) => {
                  const active = filters.inclusionsTier === tier.value;
                  return (
                    <button
                      key={tier.value}
                      type="button"
                      onClick={() => onFilterChange("inclusionsTier", tier.value)}
                      className={`px-2 py-0.5 rounded text-xs font-bold transition-all cursor-pointer ${
                        active
                          ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                      title={`${tier.label} - ${tier.sub}`}
                    >
                      {tier.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price Brackets */}
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 ml-1">Price:</span>
              {PRICE_PRESETS.map((preset) => {
                const active = (filters.pricePreset || "all") === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onFilterChange("pricePreset", preset.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      active
                        ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 font-black shadow-xs scale-[1.02]"
                        : isLight
                        ? "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 4: More Specs Drawer Trigger + Reset */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Expandable Advanced Specs */}
          <button
            type="button"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              isAdvancedOpen || activeFilterCount > 0
                ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-300 font-extrabold"
                : isLight
                ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>More Specs</span>
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                {activeFilterCount}
              </span>
            )}
            {isAdvancedOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {/* Quick Clear if active */}
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onResetFilters}
              className={`p-1.5 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                isLight
                  ? "bg-white border-slate-200 text-slate-600 hover:text-slate-900"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
              }`}
              title="Reset all filters to defaults"
            >
              <RotateCcw className="h-3 w-3 text-amber-500" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          EXPANDABLE TRAY: Secondary Specs (Beds, Baths, Cars, Sort, Sliders)
          ───────────────────────────────────────────────────────────── */}
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
                        ? "bg-indigo-600 text-white shadow-sm font-black"
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

          {/* Col 2: Custom Width Range & House Length */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Maximize className="h-3.5 w-3.5 text-cyan-400" />
                Custom Width (m)
              </label>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {filters.minWidth.toFixed(1)}m – {filters.maxWidth.toFixed(1)}m
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">Min Width</span>
                <input
                  type="number"
                  step="0.1"
                  min={bounds.minWidth}
                  max={filters.maxWidth}
                  value={filters.minWidth}
                  onChange={(e) => {
                    onFilterChange("lotWidthPreset", "all");
                    onFilterChange("minWidth", parseFloat(e.target.value) || bounds.minWidth);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold ${
                    isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-white"
                  }`}
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">Max Width</span>
                <input
                  type="number"
                  step="0.1"
                  min={filters.minWidth}
                  max={bounds.maxWidth}
                  value={filters.maxWidth}
                  onChange={(e) => {
                    onFilterChange("lotWidthPreset", "all");
                    onFilterChange("maxWidth", parseFloat(e.target.value) || bounds.maxWidth);
                  }}
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

          {/* Col 3: Total Area (m²) */}
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
          </div>

          {/* Col 4: Sort Option */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ArrowUpDown className="h-3.5 w-3.5 text-amber-400" />
              Sort Floorplans
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => onFilterChange("sortBy", e.target.value as SortOption)}
              className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none cursor-pointer ${
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
      )}

      {/* ─────────────────────────────────────────────────────────────
          FOOTER STRIP: Matches Count & Active Filter Indicators
          ───────────────────────────────────────────────────────────── */}
      <div
        className={`px-4 sm:px-5 py-2.5 border-t flex items-center justify-between gap-3 text-xs ${
          isLight ? "border-slate-200 bg-slate-100/70 text-slate-600" : "border-slate-800/80 bg-slate-950/70 text-slate-400"
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold">
            Showing <strong className="text-amber-500 font-extrabold">{filteredCount}</strong> of{" "}
            <strong>{totalCount}</strong> Standard Designs (221 Size Variants)
          </span>
          {filters.lotWidthPreset && filters.lotWidthPreset !== "all" && (
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold font-mono">
              Width: {filters.lotWidthPreset}
            </span>
          )}
          {filters.sizePreset && filters.sizePreset !== "all" && (
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold font-mono">
              Size: {SIZE_PRESETS.find((p) => p.id === filters.sizePreset)?.label}
            </span>
          )}
          {filters.pricePreset && filters.pricePreset !== "all" && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold font-mono">
              Price: {PRICE_PRESETS.find((p) => p.id === filters.pricePreset)?.label}
            </span>
          )}
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
