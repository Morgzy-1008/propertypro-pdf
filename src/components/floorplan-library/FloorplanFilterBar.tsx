import {
  Search,
  X,
  RotateCcw,
  ArrowUpDown,
  Bed,
  Bath,
  Car,
  Ruler,
  DollarSign,
  LayoutGrid,
} from "lucide-react";
import type {
  FloorplanFiltersState,
  HouseTypeFilter,
  SortOption,
} from "@/lib/floorplan-library/floorplanLibraryEngine";

interface FloorplanFilterBarProps {
  filters: FloorplanFiltersState;
  onFilterChange: <K extends keyof FloorplanFiltersState>(
    key: K,
    value: FloorplanFiltersState[K]
  ) => void;
  onResetFilters: () => void;
  totalCount: number;
  filteredCount: number;
  typeCounts?: Record<HouseTypeFilter, number>;
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

const BED_OPTIONS = [
  { label: "All", val: null },
  { label: "2", val: 2 },
  { label: "3", val: 3 },
  { label: "4", val: 4 },
  { label: "5+", val: 5 },
];

const BATH_OPTIONS = [
  { label: "All", val: null },
  { label: "1", val: 1 },
  { label: "2", val: 2 },
  { label: "3+", val: 3 },
];

const CAR_OPTIONS = [
  { label: "All", val: null },
  { label: "1", val: 1 },
  { label: "2", val: 2 },
  { label: "3+", val: 3 },
];

const LOT_WIDTH_PRESETS = [
  { id: "all", label: "All Lots", badge: "" },
  { id: "10m", label: "10m", badge: "≤8.8m" },
  { id: "12.5m", label: "12.5m", badge: "8.8–11.4m" },
  { id: "14m", label: "14m", badge: "11.4–12.8m" },
  { id: "16m+", label: "16m+", badge: ">12.8m" },
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
  isLight,
}: FloorplanFilterBarProps) {
  // Count active non-default filters
  let activeFilterCount = 0;
  if (filters.searchQuery.trim()) activeFilterCount++;
  if (filters.houseType !== "All") activeFilterCount++;
  if (filters.lotWidthPreset && filters.lotWidthPreset !== "all") activeFilterCount++;
  if (filters.pricePreset && filters.pricePreset !== "all") activeFilterCount++;
  if (filters.bedrooms !== null) activeFilterCount++;
  if (filters.bathrooms !== null) activeFilterCount++;
  if (filters.cars !== null) activeFilterCount++;

  return (
    <div
      className={`rounded-3xl border transition-all shadow-xl backdrop-blur-xl ${
        isLight
          ? "bg-white/95 border-slate-200/90 text-slate-900 shadow-slate-200/50"
          : "bg-slate-950/90 border-slate-800/80 text-white shadow-black/60"
      }`}
    >
      {/* ─────────────────────────────────────────────────────────────
          ROW 1: Primary Search, House Types, Sort & Division
          ───────────────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-5 pb-3 flex flex-col gap-3">
        <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
          {/* Quick Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search design (e.g. Amber 21, Jasper, Ruby, Carolina)..."
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
                title="Clear search"
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

          {/* Right Controls: Sort By + Pricing Division */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {/* Sort-by Dropdown */}
            <div
              className={`flex items-center px-2.5 py-1.5 rounded-xl border shrink-0 gap-1.5 shadow-xs ${
                isLight
                  ? "bg-slate-100 border-slate-300 text-slate-800"
                  : "bg-slate-900 border-slate-700/80 text-slate-200"
              }`}
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="text-xs font-bold text-slate-400 hidden sm:inline">Sort:</span>
              <select
                value={filters.sortBy}
                onChange={(e) => onFilterChange("sortBy", e.target.value as SortOption)}
                className={`bg-transparent text-xs font-bold outline-none cursor-pointer pr-1 ${
                  isLight ? "text-slate-900" : "text-white"
                }`}
                title="Sort floorplans"
              >
                <option value="size-desc" className={isLight ? "bg-white text-slate-900" : "bg-slate-900 text-white"}>
                  Size: Largest
                </option>
                <option value="size-asc" className={isLight ? "bg-white text-slate-900" : "bg-slate-900 text-white"}>
                  Size: Smallest
                </option>
                <option value="price-asc" className={isLight ? "bg-white text-slate-900" : "bg-slate-900 text-white"}>
                  Price: Low to High
                </option>
                <option value="price-desc" className={isLight ? "bg-white text-slate-900" : "bg-slate-900 text-white"}>
                  Price: High to Low
                </option>
                <option value="width-asc" className={isLight ? "bg-white text-slate-900" : "bg-slate-900 text-white"}>
                  Width: Narrowest
                </option>
                <option value="width-desc" className={isLight ? "bg-white text-slate-900" : "bg-slate-900 text-white"}>
                  Width: Widest
                </option>
                <option value="name-asc" className={isLight ? "bg-white text-slate-900" : "bg-slate-900 text-white"}>
                  Name: A to Z
                </option>
              </select>
            </div>

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
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          ROW 2: Fast Uncluttered Filters (All Visible Straight Away!)
          Bedrooms • Bathrooms • Cars • Lot Width • Price • Reset
          ───────────────────────────────────────────────────────────── */}
      <div
        className={`px-4 sm:px-5 py-3 border-t flex flex-wrap items-center justify-between gap-3 ${
          isLight ? "border-slate-100 bg-slate-50/70" : "border-slate-800/80 bg-slate-900/40"
        }`}
      >
        <div className="flex flex-wrap items-center gap-3 xl:gap-5">
          {/* Bedrooms Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1 text-slate-400 mr-0.5">
              <Bed className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Beds:</span>
            </div>
            <div
              className={`flex items-center p-0.5 rounded-lg border shrink-0 ${
                isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
              }`}
            >
              {BED_OPTIONS.map((opt) => {
                const active = filters.bedrooms === opt.val;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => onFilterChange("bedrooms", opt.val)}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                      active
                        ? "bg-indigo-600 text-white font-black shadow-xs"
                        : isLight
                        ? "text-slate-600 hover:text-slate-900"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className={`hidden md:block h-5 w-[1px] ${isLight ? "bg-slate-200" : "bg-slate-800"}`} />

          {/* Bathrooms Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1 text-slate-400 mr-0.5">
              <Bath className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Baths:</span>
            </div>
            <div
              className={`flex items-center p-0.5 rounded-lg border shrink-0 ${
                isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
              }`}
            >
              {BATH_OPTIONS.map((opt) => {
                const active = filters.bathrooms === opt.val;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => onFilterChange("bathrooms", opt.val)}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                      active
                        ? "bg-indigo-600 text-white font-black shadow-xs"
                        : isLight
                        ? "text-slate-600 hover:text-slate-900"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className={`hidden md:block h-5 w-[1px] ${isLight ? "bg-slate-200" : "bg-slate-800"}`} />

          {/* Garage / Cars Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1 text-slate-400 mr-0.5">
              <Car className="h-3.5 w-3.5 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Cars:</span>
            </div>
            <div
              className={`flex items-center p-0.5 rounded-lg border shrink-0 ${
                isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
              }`}
            >
              {CAR_OPTIONS.map((opt) => {
                const active = filters.cars === opt.val;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => onFilterChange("cars", opt.val)}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                      active
                        ? "bg-indigo-600 text-white font-black shadow-xs"
                        : isLight
                        ? "text-slate-600 hover:text-slate-900"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className={`hidden lg:block h-5 w-[1px] ${isLight ? "bg-slate-200" : "bg-slate-800"}`} />

          {/* Lot Width Filter */}
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
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className={`hidden xl:block h-5 w-[1px] ${isLight ? "bg-slate-200" : "bg-slate-800"}`} />

          {/* Price Range Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1 text-slate-400 mr-0.5">
              <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Price:</span>
            </div>
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

        {/* Reset Filter Button */}
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={onResetFilters}
            className={`p-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ml-auto shrink-0 shadow-xs ${
              isLight
                ? "bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                : "bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
            title="Reset all filters to defaults"
          >
            <RotateCcw className="h-3.5 w-3.5 text-amber-500" />
            <span>Reset ({activeFilterCount})</span>
          </button>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          FOOTER STRIP: Matches Count & Active Filter Tags
          ───────────────────────────────────────────────────────────── */}
      <div
        className={`px-4 sm:px-5 py-2.5 border-t flex items-center justify-between gap-3 text-xs ${
          isLight
            ? "border-slate-200 bg-slate-100/70 text-slate-600"
            : "border-slate-800/80 bg-slate-950/70 text-slate-400"
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold">
            Showing <strong className="text-amber-500 font-extrabold">{filteredCount}</strong> of{" "}
            <strong>{totalCount}</strong> Standard Designs
          </span>
          {filters.houseType !== "All" && (
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold">
              {filters.houseType}
            </span>
          )}
          {filters.bedrooms !== null && (
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold font-mono">
              {filters.bedrooms === 5 ? "5+ Beds" : `${filters.bedrooms} Beds`}
            </span>
          )}
          {filters.bathrooms !== null && (
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold font-mono">
              {filters.bathrooms === 3 ? "3+ Baths" : `${filters.bathrooms} Baths`}
            </span>
          )}
          {filters.cars !== null && (
            <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold font-mono">
              {filters.cars === 3 ? "3+ Cars" : `${filters.cars} Cars`}
            </span>
          )}
          {filters.lotWidthPreset && filters.lotWidthPreset !== "all" && (
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold font-mono">
              Width: {filters.lotWidthPreset}
            </span>
          )}
          {filters.pricePreset && filters.pricePreset !== "all" && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold font-mono">
              Price: {PRICE_PRESETS.find((p) => p.id === filters.pricePreset)?.label}
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
