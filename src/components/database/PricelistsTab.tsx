import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search,
  FileText,
  Calculator,
  Trees,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Home,
  Layers,
  Info,
  DollarSign,
  TrendingDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatAud } from "@/lib/pricing";
import {
  NSW_FHB_SINGLE_STOREY_PRICES,
  NSW_FHB_DOUBLE_STOREY_PRICES,
  QLD_FHB_DOUBLE_STOREY_PRICES,
  ALL_FHB_PRICES,
  FHB_LANDSCAPE_PACKAGES,
  cleanDesignNameForFhb,
  type FhbPriceRow,
} from "@/lib/pricing/pricelists";
import {
  SINGLE_STOREY_PRICES as QLD_SINGLE_STOREY_PRICES,
  DOUBLE_STOREY_PRICES as QLD_DOUBLE_STOREY_PRICES,
  type PriceRow,
} from "@/lib/pricelist.data";
import {
  NSW_SINGLE_STOREY_PRICES,
  NSW_DOUBLE_STOREY_PRICES,
} from "@/lib/pricelist.nsw.data";

export interface PricelistsTabProps {
  isLight: boolean;
  initialStateFilter?: "ALL" | "QLD" | "NSW";
}

type SpecTierFilter = "FHB" | "H1" | "H2" | "H3" | "HBS" | "ALL";

interface DisplayDesignRow {
  id: string;
  name: string;
  division: "NSW" | "QLD";
  housingType: "Single Storey" | "Double Storey" | "Granny Flat";
  totalM2: number;
  groundM2?: number;
  firstM2?: number;
  bedrooms?: number;
  isSingleGarage?: boolean;
  fhbPrice?: number;
  hbsPrice?: number;
  ssPrice?: number;
  h1Price?: number;
  h2Price?: number;
  h3Price?: number;
}

export function PricelistsTab({ isLight, initialStateFilter = "ALL" }: PricelistsTabProps) {
  const navigate = useNavigate();
  const [divisionFilter, setDivisionFilter] = useState<"ALL" | "NSW" | "QLD">(initialStateFilter);
  const [tierFilter, setTierFilter] = useState<SpecTierFilter>("FHB");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "Single Storey" | "Double Storey" | "Granny Flat">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Sync state filter if updated by parent
  useEffect(() => {
    setDivisionFilter(initialStateFilter);
  }, [initialStateFilter]);

  // Build unified catalog of designs with prices across states and tiers
  const allRows: DisplayDesignRow[] = useMemo(() => {
    const list: DisplayDesignRow[] = [];

    // 1. Official FHB NSW Single Storey & Granny Flats
    for (const row of NSW_FHB_SINGLE_STOREY_PRICES) {
      const cleanFhb = cleanDesignNameForFhb(row.name);
      const nswMatch = NSW_SINGLE_STOREY_PRICES.find(
        (r) => cleanDesignNameForFhb(r.name) === cleanFhb,
      );
      list.push({
        id: `NSW-FHB-${row.name}`,
        name: row.name,
        division: "NSW",
        housingType: row.housingType,
        totalM2: row.totalM2,
        groundM2: row.groundM2,
        bedrooms: row.bedrooms,
        isSingleGarage: row.isSingleGarage,
        fhbPrice: row.fhbPrice,
        ssPrice: row.fhbPrice,
        hbsPrice: nswMatch?.hbs,
        h1Price: nswMatch?.h1,
        h2Price: nswMatch?.h2,
        h3Price: nswMatch?.h3,
      });
    }

    // 2. Official FHB NSW Double Storey
    for (const row of NSW_FHB_DOUBLE_STOREY_PRICES) {
      const cleanFhb = cleanDesignNameForFhb(row.name);
      const nswMatch = NSW_DOUBLE_STOREY_PRICES.find(
        (r) => cleanDesignNameForFhb(r.name) === cleanFhb,
      );
      list.push({
        id: `NSW-FHB-DS-${row.name}`,
        name: row.name,
        division: "NSW",
        housingType: row.housingType,
        totalM2: row.totalM2,
        groundM2: row.groundM2,
        firstM2: row.firstM2,
        bedrooms: row.bedrooms,
        isSingleGarage: row.isSingleGarage,
        fhbPrice: row.fhbPrice,
        ssPrice: row.fhbPrice,
        hbsPrice: nswMatch?.hbs,
        h1Price: nswMatch?.h1,
        h2Price: nswMatch?.h2,
        h3Price: nswMatch?.h3,
      });
    }

    // 3. Official FHB QLD Double Storey
    for (const row of QLD_FHB_DOUBLE_STOREY_PRICES) {
      const cleanFhb = cleanDesignNameForFhb(row.name);
      const qldMatch = QLD_DOUBLE_STOREY_PRICES.find(
        (r) => cleanDesignNameForFhb(r.name) === cleanFhb,
      );
      list.push({
        id: `QLD-FHB-${row.name}`,
        name: row.name,
        division: "QLD",
        housingType: row.housingType,
        totalM2: row.totalM2,
        groundM2: row.groundM2,
        firstM2: row.firstM2,
        bedrooms: row.bedrooms,
        isSingleGarage: row.isSingleGarage,
        fhbPrice: row.fhbPrice,
        ssPrice: row.fhbPrice,
        hbsPrice: qldMatch?.hbs,
        h1Price: qldMatch?.h1,
        h2Price: qldMatch?.h2,
        h3Price: qldMatch?.h3,
      });
    }

    // 3. Add other retail designs for NSW not already in FHB list
    for (const row of NSW_SINGLE_STOREY_PRICES) {
      const clean = cleanDesignNameForFhb(row.name);
      if (
        !list.some(
          (existing) =>
            existing.division === "NSW" &&
            (existing.name.toLowerCase() === row.name.toLowerCase() ||
              cleanDesignNameForFhb(existing.name) === clean),
        )
      ) {
        list.push({
          id: `NSW-SS-${row.name}`,
          name: row.name,
          division: "NSW",
          housingType: row.name.toLowerCase().startsWith("aqua") ? "Granny Flat" : "Single Storey",
          totalM2: row.m2,
          fhbPrice: row.fhb,
          ssPrice: row.ss,
          hbsPrice: row.hbs,
          h1Price: row.h1,
          h2Price: row.h2,
          h3Price: row.h3,
        });
      }
    }

    for (const row of NSW_DOUBLE_STOREY_PRICES) {
      const clean = cleanDesignNameForFhb(row.name);
      if (
        !list.some(
          (existing) =>
            existing.division === "NSW" &&
            (existing.name.toLowerCase() === row.name.toLowerCase() ||
              cleanDesignNameForFhb(existing.name) === clean),
        )
      ) {
        list.push({
          id: `NSW-DS-${row.name}`,
          name: row.name,
          division: "NSW",
          housingType: "Double Storey",
          totalM2: row.m2,
          fhbPrice: row.fhb,
          ssPrice: row.ss,
          hbsPrice: row.hbs,
          h1Price: row.h1,
          h2Price: row.h2,
          h3Price: row.h3,
        });
      }
    }

    // 4. Add other retail designs for QLD not already in FHB list
    for (const row of QLD_SINGLE_STOREY_PRICES) {
      const clean = cleanDesignNameForFhb(row.name);
      if (
        !list.some(
          (existing) =>
            existing.division === "QLD" &&
            (existing.name.toLowerCase() === row.name.toLowerCase() ||
              cleanDesignNameForFhb(existing.name) === clean),
        )
      ) {
        list.push({
          id: `QLD-SS-${row.name}`,
          name: row.name,
          division: "QLD",
          housingType: "Single Storey",
          totalM2: row.m2,
          fhbPrice: row.fhb,
          ssPrice: row.ss,
          hbsPrice: row.hbs,
          h1Price: row.h1,
          h2Price: row.h2,
          h3Price: row.h3,
        });
      }
    }

    for (const row of QLD_DOUBLE_STOREY_PRICES) {
      const clean = cleanDesignNameForFhb(row.name);
      if (
        !list.some(
          (existing) =>
            existing.division === "QLD" &&
            (existing.name.toLowerCase() === row.name.toLowerCase() ||
              cleanDesignNameForFhb(existing.name) === clean),
        )
      ) {
        list.push({
          id: `QLD-DS-${row.name}`,
          name: row.name,
          division: "QLD",
          housingType: "Double Storey",
          totalM2: row.m2,
          fhbPrice: row.fhb,
          ssPrice: row.ss,
          hbsPrice: row.hbs,
          h1Price: row.h1,
          h2Price: row.h2,
          h3Price: row.h3,
        });
      }
    }

    return list;
  }, []);

  // Filter rows
  const filteredRows = useMemo(() => {
    return allRows.filter((r) => {
      // Division
      if (divisionFilter !== "ALL" && r.division !== divisionFilter) return false;

      // Housing type
      if (typeFilter !== "ALL" && r.housingType !== typeFilter) return false;

      // Tier check: if FHB tier is selected, must have an fhbPrice
      if (tierFilter === "FHB" && !r.fhbPrice) return false;
      if (tierFilter === "H1" && !r.h1Price) return false;
      if (tierFilter === "H2" && !r.h2Price) return false;
      if (tierFilter === "H3" && !r.h3Price) return false;
      if (tierFilter === "HBS" && !r.hbsPrice) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = r.name.toLowerCase().includes(q);
        const matchesType = r.housingType.toLowerCase().includes(q);
        const matchesDivision = r.division.toLowerCase().includes(q);
        const matchesM2 = String(r.totalM2).includes(q);
        if (!matchesName && !matchesType && !matchesDivision && !matchesM2) return false;
      }

      return true;
    });
  }, [allRows, divisionFilter, tierFilter, typeFilter, searchQuery]);

  // Statistics
  const priceValues = useMemo(() => {
    return filteredRows
      .map((r) => {
        if (tierFilter === "FHB") return r.fhbPrice;
        if (tierFilter === "H1") return r.h1Price;
        if (tierFilter === "H2") return r.h2Price;
        if (tierFilter === "H3") return r.h3Price;
        if (tierFilter === "HBS") return r.hbsPrice;
        return r.fhbPrice || r.ssPrice || r.h1Price || r.hbsPrice;
      })
      .filter((p): p is number => typeof p === "number" && p > 0);
  }, [filteredRows, tierFilter]);

  const minPrice = priceValues.length ? Math.min(...priceValues) : 0;
  const maxPrice = priceValues.length ? Math.max(...priceValues) : 0;
  const avgPrice = priceValues.length ? Math.round(priceValues.reduce((a, b) => a + b, 0) / priceValues.length) : 0;

  // Handlers for Flyer and Quote handoff
  const getSelectedPriceForRow = (row: DisplayDesignRow): number => {
    if (tierFilter === "FHB") return row.fhbPrice || row.ssPrice || row.h1Price || 0;
    if (tierFilter === "H1") return row.h1Price || row.ssPrice || row.hbsPrice || 0;
    if (tierFilter === "H2") return row.h2Price || row.h1Price || row.ssPrice || 0;
    if (tierFilter === "H3") return row.h3Price || row.h2Price || row.h1Price || 0;
    if (tierFilter === "HBS") return row.hbsPrice || row.h1Price || 0;
    return row.fhbPrice || row.h2Price || row.h1Price || row.ssPrice || row.hbsPrice || 0;
  };

  const handleCreateFlyer = (row: DisplayDesignRow) => {
    try {
      const selectedPrice = getSelectedPriceForRow(row);
      const isFhbActive = tierFilter === "FHB" || (tierFilter === "ALL" && Boolean(row.fhbPrice));
      const range = isFhbActive
        ? "ss"
        : tierFilter === "ALL"
        ? "h2"
        : tierFilter.toLowerCase();
      const handoff = {
        designName: row.name,
        bedrooms: row.bedrooms,
        housingType:
          row.housingType === "Double Storey"
            ? "double-storey"
            : row.housingType === "Granny Flat"
              ? "granny-flat"
              : "single-storey",
        state: row.division,
        range,
        price: selectedPrice,
        housePrice: formatAud(selectedPrice),
        landscaping: isFhbActive ? true : undefined,
      };
      sessionStorage.setItem("hudson-flyer-handoff", JSON.stringify(handoff));
      navigate({ to: "/flyer" });
    } catch {
      navigate({ to: "/flyer" });
    }
  };

  const handleCreateQuote = (row: DisplayDesignRow) => {
    try {
      const selectedPrice = getSelectedPriceForRow(row);
      const isFhbActive = tierFilter === "FHB" || (tierFilter === "ALL" && Boolean(row.fhbPrice));
      const specTier = isFhbActive
        ? "FHB Start Smart"
        : tierFilter === "H1" || tierFilter === "HBS"
        ? "H1 Smart Living"
        : tierFilter === "H3"
        ? "H3 Luxury Inclusions"
        : "H2 Design Collection";
      const bridge = {
        designName: row.name,
        bedrooms: row.bedrooms,
        standardDesignM2: row.totalM2,
        totalM2: row.totalM2,
        housingType:
          row.housingType === "Double Storey"
            ? "double-storey"
            : row.housingType === "Granny Flat"
              ? "granny-flat"
              : "single-storey",
        state: row.division,
        specTier,
        basePrice: selectedPrice,
        standardBasePrice: selectedPrice,
      };
      sessionStorage.setItem("hudson_plan_bridge", JSON.stringify(bridge));
      localStorage.setItem("hudson_plan_bridge", JSON.stringify(bridge));
      navigate({ to: "/quote-builder" });
    } catch {
      navigate({ to: "/quote-builder" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Overview Card */}
      <div
        className={`p-5 rounded-2xl border transition-all ${
          isLight
            ? "bg-white border-slate-200 shadow-sm"
            : "bg-slate-900/80 border-slate-800 backdrop-blur-xl shadow-xl"
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <Sparkles className="h-3.5 w-3.5" />
                2026 Price Lists
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Issue Date: 28/09/2026
              </span>
            </div>
            <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
              Master Builder Price Lists &amp; FHB Turnkey Schedules
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-3xl">
              Official turnkey pricing for First Home Buyers (NSW Single &amp; Double Storey, QLD Double Storey) including fixed site costs and turnkey landscaping packages, alongside full retail tier specifications (HBS, H1, H2, H3).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-xl border flex flex-col ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
              }`}
            >
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Matching Designs
              </span>
              <span className="text-lg font-bold font-mono text-cyan-400">
                {filteredRows.length}
              </span>
            </div>

            <div
              className={`p-3 rounded-xl border flex flex-col ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
              }`}
            >
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Price Range
              </span>
              <span className="text-sm font-bold font-mono text-emerald-400">
                {minPrice > 0 ? `${formatAud(minPrice)} - ${formatAud(maxPrice)}` : "—"}
              </span>
            </div>

            <div
              className={`p-3 rounded-xl border flex flex-col ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
              }`}
            >
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Average Price
              </span>
              <span className="text-sm font-bold font-mono text-amber-400">
                {avgPrice > 0 ? formatAud(avgPrice) : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Official FHB Landscaping Allowance Schedule Card */}
      <div
        className={`p-5 rounded-2xl border transition-all ${
          isLight
            ? "bg-emerald-50/70 border-emerald-200 shadow-sm"
            : "bg-emerald-950/20 border-emerald-500/40 backdrop-blur-xl shadow-lg ring-1 ring-emerald-500/20"
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Trees className="h-5 w-5" />
            </div>
            <div>
              <h2 className={`text-base font-bold flex items-center gap-2 ${isLight ? "text-slate-900" : "text-white"}`}>
                Official FHB Turnkey Landscape Packages (LP)
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Included in FHB Price
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Standard FHB turnkey packages include turf, boundary fencing with gate, letterbox, folding clothesline, garden beds &amp; driveway for lots up to 450 m².
              </p>
            </div>
          </div>
        </div>

        {/* Allowances Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {FHB_LANDSCAPE_PACKAGES.map((pkg) => {
            const isCredit = pkg.allowance < 0;
            const isIncluded = pkg.allowance === 0;
            return (
              <div
                key={pkg.upToM2}
                className={`p-3 rounded-xl border flex flex-col justify-between gap-1 transition-all ${
                  isLight
                    ? isCredit
                      ? "bg-emerald-100/70 border-emerald-300"
                      : isIncluded
                        ? "bg-white border-emerald-300"
                        : "bg-white border-slate-200"
                    : isCredit
                      ? "bg-emerald-950/50 border-emerald-500/50"
                      : isIncluded
                        ? "bg-slate-900/90 border-emerald-500/40"
                        : "bg-slate-900/70 border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                    Up to {pkg.upToM2} m²
                  </span>
                  {isCredit && (
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                      <TrendingDown className="h-3 w-3" /> Credit
                    </span>
                  )}
                  {isIncluded && (
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                      <CheckCircle2 className="h-3 w-3" /> Standard
                    </span>
                  )}
                </div>

                <div className="mt-1">
                  <span
                    className={`text-base font-extrabold font-mono ${
                      isCredit
                        ? "text-emerald-400"
                        : isIncluded
                          ? "text-emerald-300"
                          : isLight
                            ? "text-slate-800"
                            : "text-slate-200"
                    }`}
                  >
                    {isCredit
                      ? `-${formatAud(Math.abs(pkg.allowance))}`
                      : isIncluded
                        ? "Included ($0)"
                        : `+${formatAud(pkg.allowance)}`}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {isCredit
                    ? "Builder lot credit"
                    : isIncluded
                      ? "Standard turnkey lot"
                      : "Surcharge tier"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* State Filter Buttons */}
          <div
            className={`flex rounded-xl border p-1 ${
              isLight ? "border-slate-200 bg-white shadow-xs" : "border-slate-800 bg-slate-900 shadow-inner"
            }`}
          >
            {(["ALL", "NSW", "QLD"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setDivisionFilter(st)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  divisionFilter === st
                    ? st === "NSW"
                      ? isLight
                        ? "bg-amber-100 text-amber-900 border border-amber-300 shadow-xs font-bold"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm font-bold"
                      : st === "QLD"
                        ? isLight
                          ? "bg-cyan-100 text-cyan-900 border border-cyan-300 shadow-xs font-bold"
                          : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm font-bold"
                        : isLight
                          ? "bg-slate-900 text-white shadow-xs font-bold"
                          : "bg-slate-800 text-white border border-slate-700 shadow-sm font-bold"
                    : isLight
                      ? "text-slate-600 hover:text-slate-900"
                      : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {st === "ALL" ? "All States" : st === "NSW" ? "NSW (76 FHB)" : "QLD (22 FHB)"}
              </button>
            ))}
          </div>

          {/* Tier Filter Buttons */}
          <div
            className={`flex rounded-xl border p-1 ${
              isLight ? "border-slate-200 bg-white shadow-xs" : "border-slate-800 bg-slate-900 shadow-inner"
            }`}
          >
            {(
              [
                { id: "FHB", label: "FHB / Start Smart" },
                { id: "H1", label: "H1" },
                { id: "H2", label: "H2" },
                { id: "H3", label: "H3" },
                { id: "HBS", label: "HBS" },
                { id: "ALL", label: "All Tiers" },
              ] as const
            ).map((tier) => (
              <button
                key={tier.id}
                type="button"
                onClick={() => setTierFilter(tier.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  tierFilter === tier.id
                    ? tier.id === "FHB"
                      ? isLight
                        ? "bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs font-bold"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm font-bold"
                      : isLight
                        ? "bg-slate-900 text-white shadow-xs font-bold"
                        : "bg-slate-800 text-white border border-slate-700 shadow-sm font-bold"
                    : isLight
                      ? "text-slate-600 hover:text-slate-900"
                      : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>

          {/* Housing Type Filter Buttons */}
          <div
            className={`hidden md:flex rounded-xl border p-1 ${
              isLight ? "border-slate-200 bg-white shadow-xs" : "border-slate-800 bg-slate-900 shadow-inner"
            }`}
          >
            {(["ALL", "Single Storey", "Double Storey", "Granny Flat"] as const).map((typ) => (
              <button
                key={typ}
                type="button"
                onClick={() => setTypeFilter(typ)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                  typeFilter === typ
                    ? isLight
                      ? "bg-slate-200 text-slate-900 font-bold"
                      : "bg-slate-800 text-white font-bold"
                    : isLight
                      ? "text-slate-600 hover:text-slate-900"
                      : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {typ}
              </button>
            ))}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search designs or sizes…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`pl-9 h-9 text-xs rounded-xl ${
              isLight
                ? "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
                : "bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-500"
            }`}
          />
        </div>
      </div>

      {/* Main Pricelist Table */}
      <div
        className={`overflow-x-auto rounded-2xl border ${
          isLight
            ? "border-slate-200 bg-white shadow-sm"
            : "border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl"
        }`}
      >
        <table className="w-full text-sm">
          <thead
            className={`text-left text-[11px] font-bold tracking-wider uppercase border-b ${
              isLight
                ? "bg-slate-50 text-slate-600 border-slate-200"
                : "bg-slate-950/80 text-slate-400 border-slate-800/80"
            }`}
          >
            <tr>
              <th className="p-3.5">Design Name</th>
              <th className="p-3.5">State</th>
              <th className="p-3.5">Type</th>
              <th className="p-3.5">Total Size</th>
              {tierFilter === "ALL" ? (
                <>
                  <th className="p-3.5 text-right">FHB / Start Smart</th>
                  <th className="p-3.5 text-right">HBS</th>
                  <th className="p-3.5 text-right">H1</th>
                  <th className="p-3.5 text-right">H2</th>
                  <th className="p-3.5 text-right">H3</th>
                </>
              ) : (
                <th className="p-3.5 text-right">
                  {tierFilter === "FHB"
                    ? "Turnkey FHB Price (incl. Site & LP)"
                    : `${tierFilter} Base Price`}
                </th>
              )}
              <th className="p-3.5 text-right">Quick Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isLight ? "divide-slate-100" : "divide-slate-800/50"}`}>
            {filteredRows.map((row) => {
              const displayPrice =
                tierFilter === "FHB"
                  ? row.fhbPrice
                  : tierFilter === "H1"
                    ? row.h1Price
                    : tierFilter === "H2"
                      ? row.h2Price
                      : tierFilter === "H3"
                        ? row.h3Price
                        : tierFilter === "HBS"
                          ? row.hbsPrice
                          : row.fhbPrice || row.ssPrice;

              return (
                <tr
                  key={row.id}
                  className={`transition-colors ${
                    isLight ? "hover:bg-slate-50/80" : "hover:bg-slate-800/40"
                  }`}
                >
                  {/* Design Name & Badges */}
                  <td className="p-3.5">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                          {row.name}
                        </span>
                        {row.fhbPrice && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            FHB Official
                          </span>
                        )}
                        {row.isSingleGarage && (
                          <span className="text-[10px] text-slate-400 bg-slate-800/60 px-1.5 py-0.2 rounded border border-slate-700">
                            Single Garage
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">
                        {row.groundM2 && row.firstM2
                          ? `Ground: ${row.groundM2.toFixed(1)}m² · 1st: ${row.firstM2.toFixed(1)}m²`
                          : `${(row.totalM2 / 9.29).toFixed(1)} squares`}
                      </span>
                    </div>
                  </td>

                  {/* State Division */}
                  <td className="p-3.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                        row.division === "NSW"
                          ? isLight
                            ? "bg-amber-100 text-amber-900 border border-amber-300 font-bold"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold"
                          : isLight
                            ? "bg-cyan-100 text-cyan-900 border border-cyan-300 font-bold"
                            : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold"
                      }`}
                    >
                      {row.division}
                    </span>
                  </td>

                  {/* Housing Type */}
                  <td className="p-3.5">
                    <span className="text-xs text-slate-400">{row.housingType}</span>
                  </td>

                  {/* Total Size */}
                  <td className="p-3.5 font-mono text-xs">
                    <span className={`font-semibold ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                      {row.totalM2.toFixed(2)} m²
                    </span>
                    <span className="text-slate-500 ml-1">
                      ({(row.totalM2 / 9.29).toFixed(1)} sq)
                    </span>
                  </td>

                  {/* Pricing Columns */}
                  {tierFilter === "ALL" ? (
                    <>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-400">
                        {row.fhbPrice ? formatAud(row.fhbPrice) : row.ssPrice ? formatAud(row.ssPrice) : "—"}
                      </td>
                      <td className="p-3.5 text-right font-mono text-xs text-slate-400">
                        {row.hbsPrice ? formatAud(row.hbsPrice) : "—"}
                      </td>
                      <td className="p-3.5 text-right font-mono text-xs text-slate-300">
                        {row.h1Price ? formatAud(row.h1Price) : "—"}
                      </td>
                      <td className="p-3.5 text-right font-mono text-xs text-slate-400">
                        {row.h2Price ? formatAud(row.h2Price) : "—"}
                      </td>
                      <td className="p-3.5 text-right font-mono text-xs text-slate-400">
                        {row.h3Price ? formatAud(row.h3Price) : "—"}
                      </td>
                    </>
                  ) : (
                    <td className="p-3.5 text-right">
                      <div className="flex flex-col items-end">
                        <span
                          className={`text-base font-extrabold font-mono ${
                            tierFilter === "FHB"
                              ? "text-emerald-400"
                              : isLight
                                ? "text-slate-900"
                                : "text-white"
                          }`}
                        >
                          {displayPrice ? formatAud(displayPrice) : "—"}
                        </span>
                        {tierFilter === "FHB" && (
                          <span className="text-[10px] text-slate-400">
                            Turnkey complete
                          </span>
                        )}
                      </div>
                    </td>
                  )}

                  {/* Quick Action Buttons */}
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCreateFlyer(row)}
                        className={`h-7.5 px-2.5 text-xs font-semibold gap-1 ${
                          isLight
                            ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                            : "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800"
                        }`}
                        title="Create Flyer with this design"
                      >
                        <FileText className="h-3.5 w-3.5 text-cyan-400" />
                        Flyer
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleCreateQuote(row)}
                        className="h-7.5 px-2.5 text-xs font-semibold gap-1 bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                        title="Create Quote with this design"
                      >
                        <Calculator className="h-3.5 w-3.5" />
                        Quote
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {!filteredRows.length && (
              <tr>
                <td colSpan={tierFilter === "ALL" ? 9 : 6} className="p-8 text-center text-sm text-slate-400">
                  No designs match the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
