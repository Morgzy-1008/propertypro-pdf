import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatAud } from "@/lib/pricing";
import { useTheme } from "@/lib/theme";
import type { Lot, Pkg } from "@/lib/databaseStorage";
import {
  MapPin,
  Home,
  FileDown,
  DollarSign,
  Layers,
  Search,
  Check,
  X,
  Filter,
  CheckSquare,
  Square,
  Sparkles,
  BedDouble,
  Building,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

export interface CustomerPdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "land" | "packages";
  lots: Lot[];
  packages?: Pkg[];
}

export function CustomerPdfExportModal({
  isOpen,
  onClose,
  mode,
  lots,
  packages = [],
}: CustomerPdfExportModalProps) {
  const { mode: themeMode } = useTheme();
  const isLight = themeMode === "normal";

  // Filter states
  const [selectedState, setSelectedState] = useState<"All" | "QLD" | "NSW">("All");
  const [selectedEstates, setSelectedEstates] = useState<string[]>([]);
  const [selectedSuburbs, setSelectedSuburbs] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [selectedHouseTypes, setSelectedHouseTypes] = useState<string[]>([]);
  const [selectedBeds, setSelectedBeds] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Individual selection set
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Derive unique estates & suburbs based on current mode
  const { availableEstates, availableSuburbs } = useMemo(() => {
    const estateSet = new Set<string>();
    const suburbSet = new Set<string>();

    if (mode === "land") {
      lots.forEach((l) => {
        if (selectedState !== "All" && l.state && l.state !== selectedState) return;
        if (l.estate && l.estate.trim()) estateSet.add(l.estate.trim());
        if (l.suburb && l.suburb.trim()) suburbSet.add(l.suburb.trim());
      });
    } else {
      const lotMap = new Map(lots.map((l) => [l.id, l]));
      packages.forEach((p) => {
        const lot = p.lot_id ? lotMap.get(p.lot_id) : undefined;
        const pState = p.state || lot?.state || "QLD";
        if (selectedState !== "All" && pState !== selectedState) return;

        const estate = lot?.estate || (p.flyer_data as any)?.estate || (p.flyer_json as any)?.estate;
        const suburb = lot?.suburb || (p.flyer_data as any)?.suburb || (p.flyer_json as any)?.suburb;
        if (estate && String(estate).trim() && String(estate) !== "Queensland") {
          estateSet.add(String(estate).trim());
        }
        if (suburb && String(suburb).trim()) {
          suburbSet.add(String(suburb).trim());
        }
      });
    }

    return {
      availableEstates: Array.from(estateSet).sort(),
      availableSuburbs: Array.from(suburbSet).sort(),
    };
  }, [mode, lots, packages, selectedState]);

  // Housing Type definitions for packages
  const housingTypeOptions = [
    { label: "Single Storey (SS)", value: "Single Storey" },
    { label: "Double Storey (DS)", value: "Double Storey" },
    { label: "Dual Living / Duplex", value: "Dual Living" },
    { label: "Split Level", value: "Split Level" },
    { label: "Acreage", value: "Acreage" },
  ];

  // Helper to normalize housing type from package
  const normalizeHousingType = (ht: string, design: string): string => {
    const text = `${ht || ""} ${design || ""}`.toLowerCase();
    if (text.includes("double") || text.includes("two") || text.includes("2 storey") || text.includes("2 story")) {
      return "Double Storey";
    }
    if (text.includes("split")) return "Split Level";
    if (text.includes("dual") || text.includes("duplex") || text.includes("duet") || text.includes("auxiliary")) {
      return "Dual Living";
    }
    if (text.includes("acreage") || text.includes("mulberry") || text.includes("ranch")) return "Acreage";
    return "Single Storey";
  };

  // Filter lots according to all active criteria
  const matchingLots = useMemo(() => {
    if (mode !== "land") return [];
    return lots.filter((l) => {
      // Exclude sold lots by default unless specifically selected
      if (selectedStatus === "All") {
        if (l.status === "sold") return false;
      } else if (l.status !== selectedStatus) {
        return false;
      }

      // State filter
      if (selectedState !== "All" && l.state && l.state !== selectedState) return false;

      // Estate filter
      if (selectedEstates.length > 0 && (!l.estate || !selectedEstates.includes(l.estate.trim()))) {
        return false;
      }

      // Suburb filter
      if (selectedSuburbs.length > 0 && (!l.suburb || !selectedSuburbs.includes(l.suburb.trim()))) {
        return false;
      }

      // Max price filter
      if (maxPrice !== null && l.land_price !== null && l.land_price > maxPrice) {
        return false;
      }

      // Text query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = `${l.lot_number || ""} ${l.address || ""} ${l.estate || ""} ${l.suburb || ""}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      return true;
    });
  }, [mode, lots, selectedState, selectedEstates, selectedSuburbs, maxPrice, selectedStatus, searchQuery]);

  // Filter packages according to all active criteria
  const matchingPackages = useMemo(() => {
    if (mode !== "packages") return [];
    const lotMap = new Map(lots.map((l) => [l.id, l]));

    return packages.filter((p) => {
      // Status filter
      if (selectedStatus === "All") {
        if (p.status === "sold") return false;
      } else if (p.status !== selectedStatus) {
        return false;
      }

      const lot = p.lot_id ? lotMap.get(p.lot_id) : undefined;
      const pState = p.state || lot?.state || "QLD";
      if (selectedState !== "All" && pState !== selectedState) return false;

      const estate = (lot?.estate || (p.flyer_data as any)?.estate || (p.flyer_json as any)?.estate || "").trim();
      const suburb = (lot?.suburb || (p.flyer_data as any)?.suburb || (p.flyer_json as any)?.suburb || "").trim();

      // Estate filter
      if (selectedEstates.length > 0 && (!estate || !selectedEstates.includes(estate))) {
        return false;
      }

      // Suburb filter
      if (selectedSuburbs.length > 0 && (!suburb || !selectedSuburbs.includes(suburb))) {
        return false;
      }

      // Max price filter
      if (maxPrice !== null && p.total_price !== null && p.total_price > maxPrice) {
        return false;
      }

      // Housing type / Storeys filter
      if (selectedHouseTypes.length > 0) {
        const itemType = normalizeHousingType(p.housing_type, p.design);
        if (!selectedHouseTypes.includes(itemType)) return false;
      }

      // Beds filter
      if (selectedBeds !== "All") {
        const bedsNum = parseInt(p.beds || "0", 10);
        if (selectedBeds === "3" && bedsNum !== 3) return false;
        if (selectedBeds === "4" && bedsNum !== 4) return false;
        if (selectedBeds === "5+" && bedsNum < 5) return false;
      }

      // Text query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const text = `${p.name || ""} ${p.design || ""} ${p.facade_name || ""} ${estate} ${suburb}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      return true;
    });
  }, [
    mode,
    packages,
    lots,
    selectedState,
    selectedEstates,
    selectedSuburbs,
    maxPrice,
    selectedHouseTypes,
    selectedBeds,
    selectedStatus,
    searchQuery,
  ]);

  // When the modal opens or active matching items change, pre-select all matching by default
  useEffect(() => {
    if (!isOpen) return;
    const currentMatching = mode === "land" ? matchingLots : matchingPackages;
    const initialSet = new Set(currentMatching.map((item) => item.id));
    setSelectedIds(initialSet);
  }, [isOpen, mode]);

  // Toggle single item ID selection
  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select all currently matching
  const selectAllMatching = () => {
    const currentMatching = mode === "land" ? matchingLots : matchingPackages;
    setSelectedIds(new Set(currentMatching.map((item) => item.id)));
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Reset all filters
  const resetFilters = () => {
    setSelectedState("All");
    setSelectedEstates([]);
    setSelectedSuburbs([]);
    setMaxPrice(null);
    setSelectedHouseTypes([]);
    setSelectedBeds("All");
    setSelectedStatus("All");
    setSearchQuery("");
  };

  // Quick price caps
  const landPricePresets = [350000, 450000, 550000, 650000];
  const pkgPricePresets = [750000, 850000, 950000, 1100000];

  // Submit and create customized PDF page
  const handleSubmit = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      toast.error(`Please select at least 1 ${mode === "land" ? "lot" : "package"} to export.`);
      return;
    }

    const filterPayload = {
      ids,
      state: selectedState,
      estates: selectedEstates,
      suburbs: selectedSuburbs,
      maxPrice,
      houseTypes: selectedHouseTypes,
      beds: selectedBeds,
      exportTimestamp: Date.now(),
    };

    if (mode === "land") {
      sessionStorage.setItem("customer_land_pdf_filter", JSON.stringify(filterPayload));
      const params = new URLSearchParams();
      if (selectedState !== "All") params.set("state", selectedState);
      if (maxPrice) params.set("maxPrice", String(maxPrice));
      if (selectedEstates.length === 1) params.set("estate", selectedEstates[0]);
      if (selectedSuburbs.length === 1) params.set("suburb", selectedSuburbs[0]);
      params.set("filterToken", String(Date.now()));
      if (ids.length <= 40) params.set("ids", ids.join(","));

      const url = `/browse/land?${params.toString()}`;
      window.open(url, "_blank", "noopener");
      toast.success(`Generated Customer Land PDF with ${ids.length} selected lots`);
    } else {
      sessionStorage.setItem("customer_packages_pdf_filter", JSON.stringify(filterPayload));
      const params = new URLSearchParams();
      params.set("view", "sheet"); // Force printable A4 catalog view
      if (selectedState !== "All") params.set("state", selectedState);
      if (maxPrice) params.set("maxPrice", String(maxPrice));
      if (selectedHouseTypes.length > 0) params.set("types", selectedHouseTypes.join(","));
      if (selectedEstates.length === 1) params.set("estate", selectedEstates[0]);
      if (selectedSuburbs.length === 1) params.set("suburb", selectedSuburbs[0]);
      params.set("filterToken", String(Date.now()));
      if (ids.length <= 40) params.set("ids", ids.join(","));

      const url = `/browse/packages?${params.toString()}`;
      window.open(url, "_blank", "noopener");
      toast.success(`Generated Customer Packages PDF with ${ids.length} selected packages`);
    }

    onClose();
  };

  const lotMap = useMemo(() => new Map(lots.map((l) => [l.id, l])), [lots]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden border shadow-2xl ${
          isLight ? "bg-white text-slate-900 border-slate-200" : "bg-slate-950 text-slate-100 border-slate-800"
        }`}
      >
        {/* Modal Header */}
        <DialogHeader
          className={`px-6 py-4 border-b flex-shrink-0 ${
            isLight ? "bg-slate-50/80 border-slate-200" : "bg-slate-900/60 border-slate-800"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl border ${
                  mode === "land"
                    ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-500"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-500"
                }`}
              >
                {mode === "land" ? <MapPin className="h-5 w-5" /> : <Home className="h-5 w-5" />}
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <span>Export Customer {mode === "land" ? "Land" : "Packages"} PDF</span>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                      mode === "land"
                        ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-600 dark:text-cyan-400"
                        : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    Custom Flyer Link
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select suburbs, estates, price ceiling, and house types (SS/DS) to generate a tailored customer PDF.
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Reset Filters
            </Button>
          </div>
        </DialogHeader>

        {/* Modal Body: Multi-Filter Controls */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 min-h-0">
          {/* Row 1: State Filter & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                Target State Division:
              </Label>
              <div className="flex items-center gap-2">
                {(["All", "QLD", "NSW"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setSelectedState(st);
                      setSelectedEstates([]);
                      setSelectedSuburbs([]);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                      selectedState === st
                        ? "bg-brand-navy text-white border-brand-navy shadow-xs"
                        : isLight
                          ? "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                          : "bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    {st === "All" ? "All States" : st === "QLD" ? "Queensland" : "New South Wales"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                Availability Status:
              </Label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {mode === "land" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedStatus("All")}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                        selectedStatus === "All"
                          ? "bg-cyan-500 text-slate-950 font-bold border-cyan-400"
                          : "border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      Active (Excl. Sold)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedStatus("available")}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                        selectedStatus === "available"
                          ? "bg-emerald-500 text-slate-950 font-bold border-emerald-400"
                          : "border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      Available Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedStatus("on_hold")}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                        selectedStatus === "on_hold"
                          ? "bg-amber-500 text-slate-950 font-bold border-amber-400"
                          : "border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      On Hold
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedStatus("nhc_exclusive")}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                        selectedStatus === "nhc_exclusive"
                          ? "bg-sky-500 text-slate-950 font-bold border-sky-400"
                          : "border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      NHC Exclusive
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedStatus("All")}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                        selectedStatus === "All"
                          ? "bg-amber-500 text-slate-950 font-bold border-amber-400"
                          : "border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      Active Packages
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedStatus("live")}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                        selectedStatus === "live"
                          ? "bg-emerald-500 text-slate-950 font-bold border-emerald-400"
                          : "border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      Live Only
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedStatus("nhc_exclusive")}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border ${
                        selectedStatus === "nhc_exclusive"
                          ? "bg-sky-500 text-slate-950 font-bold border-sky-400"
                          : "border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      NHC Exclusive
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Price Filter */}
          <div
            className={`p-3.5 rounded-xl border ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/40 border-slate-800"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-brand-gold" />
                  Maximum Price Filter:
                </Label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {maxPrice ? `Showing items priced up to ${formatAud(maxPrice)}` : "No price cap applied (Any Price)"}
                </p>
              </div>

              {/* Price Preset Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setMaxPrice(null)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                    maxPrice === null
                      ? "bg-brand-navy text-white border-brand-navy font-bold shadow-xs"
                      : "border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-white"
                  }`}
                >
                  Any
                </button>
                {(mode === "land" ? landPricePresets : pkgPricePresets).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setMaxPrice(preset)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
                      maxPrice === preset
                        ? "bg-emerald-600 text-white border-emerald-500 font-bold shadow-xs"
                        : "border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-white"
                    }`}
                  >
                    &lt; {formatAud(preset)}
                  </button>
                ))}
              </div>

              {/* Custom Number Input */}
              <div className="flex items-center gap-1.5 w-36">
                <span className="text-xs font-semibold text-slate-500">$</span>
                <Input
                  type="number"
                  step="5000"
                  placeholder="Custom max"
                  value={maxPrice ?? ""}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    setMaxPrice(val ? Number(val) : null);
                  }}
                  className="h-8 text-xs font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Row 3: Housing Type & Storey Filter (Only for Packages) */}
          {mode === "packages" && (
            <div
              className={`p-3.5 rounded-xl border ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/40 border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-amber-500" />
                  House Type / Storeys (Select Multiple):
                </Label>
                {selectedHouseTypes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedHouseTypes([])}
                    className="text-[11px] text-amber-500 hover:underline"
                  >
                    Clear Types ({selectedHouseTypes.length})
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {housingTypeOptions.map((opt) => {
                  const active = selectedHouseTypes.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setSelectedHouseTypes((prev) =>
                          active ? prev.filter((t) => t !== opt.value) : [...prev, opt.value]
                        );
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        active
                          ? "bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-xs"
                          : isLight
                            ? "bg-white text-slate-700 border-slate-300 hover:border-slate-400"
                            : "bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600 hover:text-white"
                      }`}
                    >
                      {active ? <Check className="h-3 w-3" /> : <div className="h-3 w-3 rounded-full border" />}
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Bedrooms filter row */}
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <BedDouble className="h-3.5 w-3.5 text-brand-gold" /> Bedrooms:
                </span>
                <div className="flex items-center gap-1.5">
                  {["All", "3", "4", "5+"].map((bed) => (
                    <button
                      key={bed}
                      type="button"
                      onClick={() => setSelectedBeds(bed)}
                      className={`px-2.5 py-0.5 rounded text-xs font-medium border ${
                        selectedBeds === bed
                          ? "bg-brand-navy text-white border-brand-navy font-bold"
                          : "border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {bed === "All" ? "All Beds" : `${bed} Bed`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Row 4: Multi-select Estates & Suburbs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Estates Box */}
            <div
              className={`p-3.5 rounded-xl border flex flex-col ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/40 border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-cyan-500" />
                  Estates ({selectedEstates.length ? `${selectedEstates.length} selected` : "All"}):
                </Label>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setSelectedEstates(availableEstates)}
                    className="text-cyan-600 dark:text-cyan-400 hover:underline"
                  >
                    Select All
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => setSelectedEstates([])}
                    className="text-slate-500 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                {availableEstates.map((estate) => {
                  const checked = selectedEstates.includes(estate);
                  return (
                    <label
                      key={estate}
                      className={`flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                        checked
                          ? isLight
                            ? "bg-cyan-50 text-cyan-900 font-semibold"
                            : "bg-cyan-950/40 text-cyan-200 font-semibold"
                          : "hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedEstates((prev) =>
                            checked ? prev.filter((e) => e !== estate) : [...prev, estate]
                          );
                        }}
                        className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 h-3.5 w-3.5"
                      />
                      <span className="truncate">{estate}</span>
                    </label>
                  );
                })}
                {availableEstates.length === 0 && (
                  <p className="text-[11px] text-slate-400 py-2 text-center">No estates found</p>
                )}
              </div>
            </div>

            {/* Suburbs Box */}
            <div
              className={`p-3.5 rounded-xl border flex flex-col ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/40 border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                  Suburbs ({selectedSuburbs.length ? `${selectedSuburbs.length} selected` : "All"}):
                </Label>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setSelectedSuburbs(availableSuburbs)}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    Select All
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => setSelectedSuburbs([])}
                    className="text-slate-500 hover:underline"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                {availableSuburbs.map((suburb) => {
                  const checked = selectedSuburbs.includes(suburb);
                  return (
                    <label
                      key={suburb}
                      className={`flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                        checked
                          ? isLight
                            ? "bg-emerald-50 text-emerald-900 font-semibold"
                            : "bg-emerald-950/40 text-emerald-200 font-semibold"
                          : "hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedSuburbs((prev) =>
                            checked ? prev.filter((s) => s !== suburb) : [...prev, suburb]
                          );
                        }}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                      />
                      <span className="truncate">{suburb}</span>
                    </label>
                  );
                })}
                {availableSuburbs.length === 0 && (
                  <p className="text-[11px] text-slate-400 py-2 text-center">No suburbs found</p>
                )}
              </div>
            </div>
          </div>

          {/* Row 5: Live Matching Counter & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold">
                Matching items:{" "}
                <span className="text-cyan-500 dark:text-cyan-400">
                  {mode === "land" ? matchingLots.length : matchingPackages.length}
                </span>{" "}
                {mode === "land" ? "lots" : "packages"}
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-xs font-bold text-emerald-500">
                {selectedIds.size} selected for PDF
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllMatching}
                className="h-8 text-xs gap-1 border-slate-300 dark:border-slate-700"
              >
                <CheckSquare className="h-3.5 w-3.5 text-emerald-500" />
                Select All Matching ({mode === "land" ? matchingLots.length : matchingPackages.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={deselectAll}
                className="h-8 text-xs gap-1 border-slate-300 dark:border-slate-700"
              >
                <Square className="h-3.5 w-3.5 text-slate-400" />
                Deselect All
              </Button>
            </div>
          </div>

          {/* Search within results */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Filter list by ${mode === "land" ? "lot #, estate, suburb, or address" : "design name, facade, suburb"}...`}
              className="pl-9 h-8 text-xs"
            />
          </div>

          {/* Interactive Checklist Table */}
          <div
            className={`rounded-xl border overflow-hidden max-h-56 overflow-y-auto ${
              isLight ? "bg-white border-slate-200" : "bg-slate-900/50 border-slate-800"
            }`}
          >
            {mode === "land" ? (
              <table className="w-full text-xs">
                <thead
                  className={`sticky top-0 border-b text-[11px] font-semibold text-slate-500 ${
                    isLight ? "bg-slate-100" : "bg-slate-900"
                  }`}
                >
                  <tr>
                    <th className="p-2 w-10 text-center">Pick</th>
                    <th className="p-2 text-left">Lot / Address</th>
                    <th className="p-2 text-left">Estate &amp; Suburb</th>
                    <th className="p-2 text-right">Size</th>
                    <th className="p-2 text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {matchingLots.map((l) => {
                    const isSelected = selectedIds.has(l.id);
                    return (
                      <tr
                        key={l.id}
                        onClick={() => toggleSelectId(l.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? isLight
                              ? "bg-cyan-50/60 hover:bg-cyan-50"
                              : "bg-cyan-950/20 hover:bg-cyan-950/30"
                            : isLight
                              ? "hover:bg-slate-50"
                              : "hover:bg-slate-800/40"
                        }`}
                      >
                        <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectId(l.id)}
                            className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 h-3.5 w-3.5 cursor-pointer"
                          />
                        </td>
                        <td className="p-2 font-medium">
                          {l.lot_number ? `Lot ${l.lot_number}` : "Lot"}
                          {l.address ? ` · ${l.address}` : ""}
                        </td>
                        <td className="p-2 text-slate-500 dark:text-slate-400">
                          {l.estate} {l.suburb ? `(${l.suburb})` : ""}
                        </td>
                        <td className="p-2 text-right text-slate-500 dark:text-slate-400">
                          {l.land_size ? `${l.land_size} m²` : "—"}
                        </td>
                        <td className="p-2 text-right font-semibold text-brand-navy dark:text-slate-200">
                          {formatAud(l.land_price)}
                        </td>
                      </tr>
                    );
                  })}
                  {matchingLots.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-xs text-slate-400">
                        No lots match the current filter selection. Try adjusting the filters above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-xs">
                <thead
                  className={`sticky top-0 border-b text-[11px] font-semibold text-slate-500 ${
                    isLight ? "bg-slate-100" : "bg-slate-900"
                  }`}
                >
                  <tr>
                    <th className="p-2 w-10 text-center">Pick</th>
                    <th className="p-2 text-left">Package &amp; Design</th>
                    <th className="p-2 text-left">Type</th>
                    <th className="p-2 text-left">Estate &amp; Suburb</th>
                    <th className="p-2 text-center">Specs</th>
                    <th className="p-2 text-right">Package Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {matchingPackages.map((p) => {
                    const isSelected = selectedIds.has(p.id);
                    const lot = p.lot_id ? lotMap.get(p.lot_id) : undefined;
                    const estate = lot?.estate || (p.flyer_data as any)?.estate || "Queensland";
                    const suburb = lot?.suburb || (p.flyer_data as any)?.suburb || "";
                    const typeLabel = normalizeHousingType(p.housing_type, p.design);

                    return (
                      <tr
                        key={p.id}
                        onClick={() => toggleSelectId(p.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? isLight
                              ? "bg-amber-50/60 hover:bg-amber-50"
                              : "bg-amber-950/20 hover:bg-amber-950/30"
                            : isLight
                              ? "hover:bg-slate-50"
                              : "hover:bg-slate-800/40"
                        }`}
                      >
                        <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectId(p.id)}
                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5 cursor-pointer"
                          />
                        </td>
                        <td className="p-2 font-medium">
                          {p.name || p.design}
                          {p.facade_name ? ` · ${p.facade_name}` : ""}
                        </td>
                        <td className="p-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              typeLabel.includes("Double")
                                ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                                : typeLabel.includes("Dual")
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                  : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                            }`}
                          >
                            {typeLabel.includes("Double")
                              ? "DS"
                              : typeLabel.includes("Single")
                                ? "SS"
                                : typeLabel}
                          </span>
                        </td>
                        <td className="p-2 text-slate-500 dark:text-slate-400">
                          {estate} {suburb ? `(${suburb})` : ""}
                        </td>
                        <td className="p-2 text-center text-slate-500 dark:text-slate-400">
                          {p.beds || "—"}b · {p.baths || "—"}ba · {p.cars || "—"}c
                        </td>
                        <td className="p-2 text-right font-semibold text-brand-navy dark:text-slate-200">
                          {formatAud(p.total_price)}
                        </td>
                      </tr>
                    );
                  })}
                  {matchingPackages.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-xs text-slate-400">
                        No packages match the current filter selection. Try adjusting the filters above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Modal Footer: Action Bar */}
        <DialogFooter
          className={`px-6 py-4 border-t flex items-center justify-between gap-4 flex-shrink-0 ${
            isLight ? "bg-slate-50/80 border-slate-200" : "bg-slate-900/60 border-slate-800"
          }`}
        >
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Export Payload:</span>
            <span
              className={`font-bold px-2.5 py-0.5 rounded-full ${
                selectedIds.size > 0
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
              }`}
            >
              {selectedIds.size} {mode === "land" ? "Lots" : "Packages"} Chosen
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={selectedIds.size === 0}
              className={`text-xs gap-1.5 font-bold shadow-md ${
                mode === "land"
                  ? "bg-cyan-600 hover:bg-cyan-500 text-white"
                  : "bg-amber-600 hover:bg-amber-500 text-white"
              }`}
            >
              <FileDown className="h-4 w-4" />
              Generate Customer {mode === "land" ? "Land" : "Packages"} PDF ({selectedIds.size})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
