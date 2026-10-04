import { useState, useMemo, useEffect, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ListingSheet, PrintBar, paginate } from "@/components/listing/ListingSheet";
import { QrCode } from "@/components/flyer/QrCode";
import { listPublicPackages, formatPublicPackage, ALL_DATABASE_PACKAGES, type PublicPackage } from "@/lib/public-listings.functions";
import { supabase } from "@/integrations/supabase/client";
import { ensureStaffSupabaseAuth } from "@/lib/supabaseSync";
import { formatAud } from "@/lib/pricing";
import { Logo } from "@/components/flyer/FlyerTemplates";
import {
  Search,
  Home,
  MapPin,
  BedDouble,
  Bath,
  Car,
  Maximize2,
  Phone,
  Mail,
  ArrowUpRight,
  SlidersHorizontal,
  FileText,
  LayoutGrid,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Loader2,
  Globe,
  Filter,
  DollarSign,
  X,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomerPdfExportModal } from "@/components/database/CustomerPdfExportModal";

export const Route = createFileRoute("/browse/packages")({
  head: () => ({
    meta: [
      { title: "Available House & Land Packages (QLD & NSW) | Hudson Homes" },
      {
        name: "description",
        content:
          "Explore every Hudson Homes House & Land package available across Queensland and New South Wales — fixed pricing, complete inclusions, and direct consultant contacts.",
      },
      { property: "og:title", content: "Available House & Land Packages (QLD & NSW) | Hudson Homes" },
      {
        property: "og:description",
        content: "Complete House & Land packages available now across QLD and NSW, organised by estate and design.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: () => listPublicPackages(),
  errorComponent: () => (
    <div className="p-10 text-center text-sm text-muted-foreground">
      We couldn&rsquo;t load packages right now.
    </div>
  ),
  notFoundComponent: () => (
    <div className="p-10 text-center text-sm text-muted-foreground">Nothing to show here.</div>
  ),
  component: PackagesBrowse,
});

const money = (v: number | null) => (v == null ? "POA" : formatAud(v));

type Block =
  | { kind: "group"; key: string; label: string }
  | { kind: "pkg"; key: string; pkg: PublicPackage };

function PackagesBrowse() {
  const initialPackages = Route.useLoaderData();
  const [packages, setPackages] = useState<PublicPackage[]>(
    initialPackages && initialPackages.length > 0 ? initialPackages : ALL_DATABASE_PACKAGES
  );
  const [loading, setLoading] = useState(false);
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  const loadPackages = useCallback(async () => {
    try {
      const combinedMap = new Map<string, PublicPackage>();
      ALL_DATABASE_PACKAGES.forEach((p) => combinedMap.set(p.id, p));

      await ensureStaffSupabaseAuth();
      const [lotRes, pkgRes] = await Promise.all([
        supabase.from("land_lots").select("*").order("created_at", { ascending: false }),
        supabase.from("packages").select("*").not("name", "like", "Tender Request%").order("created_at", { ascending: false }),
      ]);

      const lots = (lotRes.data ?? []) as any[];
      const lotById = new Map(lots.map((l) => [l.id, l]));

      const rawPkgs = (pkgRes.data ?? []) as any[];
      if (rawPkgs.length > 0) {
        rawPkgs
          .filter((p) => p.status !== "sold")
          .forEach((p) => {
            const lot = p.lot_id ? lotById.get(p.lot_id) : null;
            const formatted = formatPublicPackage({ ...p, land_lots: lot });
            combinedMap.set(formatted.id, formatted);
          });
      }
      setPackages(Array.from(combinedMap.values()));
    } catch (e) {
      console.error("[PackagesBrowse] Sync error:", e);
    }
  }, []);

  useEffect(() => {
    void loadPackages();
  }, [loadPackages]);

  const [viewMode, setViewMode] = useState<"grid" | "sheet">(() => {
    if (typeof window === "undefined") return "grid";
    return new URLSearchParams(window.location.search).get("view") === "sheet" ? "sheet" : "grid";
  });

  const [selectedState, setSelectedState] = useState<"All" | "QLD" | "NSW">(() => {
    if (typeof window === "undefined") return "All";
    const s = new URLSearchParams(window.location.search).get("state");
    if (s === "QLD" || s === "NSW" || s === "All") return s;
    return "All";
  });

  const [maxPrice, setMaxPrice] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const p = new URLSearchParams(window.location.search).get("maxPrice");
    return p ? Number(p) : null;
  });

  const [customPriceInput, setCustomPriceInput] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const p = new URLSearchParams(window.location.search).get("maxPrice");
    return p ? String(p) : "";
  });

  const [selectedHouseTypes, setSelectedHouseTypes] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const t = new URLSearchParams(window.location.search).get("types");
    return t ? t.split(",").map((s) => s.trim()).filter(Boolean) : [];
  });

  const [selectedBeds, setSelectedBeds] = useState<string>(() => {
    if (typeof window === "undefined") return "All";
    return new URLSearchParams(window.location.search).get("beds") || "All";
  });

  const [selectedEstate, setSelectedEstate] = useState<string>(() => {
    if (typeof window === "undefined") return "All";
    return new URLSearchParams(window.location.search).get("estate") || "All";
  });

  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("q") || "";
  });

  const [sortOrder, setSortOrder] = useState<"suburb" | "price-asc" | "price-desc" | "name">(() => {
    if (typeof window === "undefined") return "suburb";
    const so = new URLSearchParams(window.location.search).get("sort");
    if (so === "price-asc" || so === "price-desc" || so === "suburb" || so === "name") return so;
    return "suburb";
  });

  // Custom filter params from staff CustomerPdfExportModal
  const [filterParams, setFilterParams] = useState<{
    ids?: string[];
    maxPrice?: number | null;
    types?: string[];
    estates?: string[];
    suburbs?: string[];
    state?: string;
  } | null>(null);

  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // Ingest session storage filters from CustomerPdfExportModal if present
  useEffect(() => {
    if (typeof window === "undefined") return;
    let sessionData: any = null;
    try {
      const raw = sessionStorage.getItem("customer_packages_pdf_filter");
      if (raw) sessionData = JSON.parse(raw);
    } catch {}

    if (sessionData) {
      if (sessionData.ids?.length) {
        setFilterParams((prev) => ({ ...(prev || {}), ids: sessionData.ids }));
      }
      if (sessionData.maxPrice && maxPrice == null) {
        setMaxPrice(sessionData.maxPrice);
        setCustomPriceInput(String(sessionData.maxPrice));
      }
      if (sessionData.houseTypes?.length && selectedHouseTypes.length === 0) {
        setSelectedHouseTypes(sessionData.houseTypes);
      }
      if (sessionData.state && selectedState === "All") {
        setSelectedState(sessionData.state);
      }
      if (sessionData.estates?.length && selectedEstate === "All") {
        setSelectedEstate(sessionData.estates[0]);
      }
    }
  }, []);

  // Sync state to URL search parameters for link sharing & persistence
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (viewMode === "sheet") params.set("view", "sheet");
    if (selectedState !== "All") params.set("state", selectedState);
    if (maxPrice != null && maxPrice > 0) params.set("maxPrice", String(maxPrice));
    if (selectedHouseTypes.length > 0 && !selectedHouseTypes.includes("All")) {
      params.set("types", selectedHouseTypes.join(","));
    }
    if (selectedBeds !== "All") params.set("beds", selectedBeds);
    if (selectedEstate !== "All") params.set("estate", selectedEstate);
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (sortOrder !== "suburb") params.set("sort", sortOrder);
    if (filterParams?.ids && filterParams.ids.length > 0) {
      params.set("ids", filterParams.ids.join(","));
    }

    const query = params.toString();
    const newUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
    window.history.replaceState({}, "", newUrl);
  }, [viewMode, selectedState, maxPrice, selectedHouseTypes, selectedBeds, selectedEstate, searchQuery, sortOrder, filterParams]);

  // State package counts
  const qldCount = useMemo(() => packages.filter((p) => p.state === "QLD").length, [packages]);
  const nswCount = useMemo(() => packages.filter((p) => p.state === "NSW").length, [packages]);

  // Extract unique estates & suburbs based on current state selection
  const uniqueEstates = useMemo(() => {
    const estateMap = new Map<string, number>();
    packages.forEach((p) => {
      if (selectedState !== "All" && p.state && p.state !== selectedState) return;
      const estate = p.estate && p.estate !== "Queensland" ? p.estate.trim() : "";
      const suburb = p.suburb ? p.suburb.trim() : "";
      const label = [estate, suburb].filter(Boolean).join(" · ") || suburb || estate;
      if (label) {
        estateMap.set(label, (estateMap.get(label) || 0) + 1);
      }
    });
    return Array.from(estateMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [packages, selectedState]);

  // Housing Type categories for multi-select
  const HOUSE_TYPE_OPTIONS = [
    { label: "Single Storey (SS)", value: "Single Storey" },
    { label: "Double Storey (DS)", value: "Double Storey" },
    { label: "Dual Living / Duplex", value: "Dual Living" },
    { label: "Split Level", value: "Split Level" },
    { label: "Acreage", value: "Acreage" },
  ];

  const PRICE_PRESETS = [
    { label: "All Prices", value: null },
    { label: "< $750k", value: 750000 },
    { label: "< $850k", value: 850000 },
    { label: "< $950k", value: 950000 },
    { label: "< $1.1M", value: 1100000 },
    { label: "< $1.3M", value: 1300000 },
  ];

  const BEDROOM_OPTIONS = [
    { label: "All Beds", value: "All" },
    { label: "3 Beds", value: "3" },
    { label: "4 Beds", value: "4" },
    { label: "5+ Beds", value: "5+" },
  ];

  const toggleHouseType = (typeVal: string) => {
    if (typeVal === "All") {
      setSelectedHouseTypes([]);
      return;
    }
    setSelectedHouseTypes((prev) => {
      if (prev.includes(typeVal)) {
        return prev.filter((t) => t !== typeVal);
      } else {
        return [...prev, typeVal];
      }
    });
  };

  const isAnyFilterActive = Boolean(
    selectedState !== "All" ||
    (maxPrice != null && maxPrice > 0) ||
    selectedHouseTypes.length > 0 ||
    selectedBeds !== "All" ||
    selectedEstate !== "All" ||
    searchQuery.trim() !== "" ||
    filterParams?.ids?.length
  );

  const resetAllFilters = () => {
    setSelectedState("All");
    setMaxPrice(null);
    setCustomPriceInput("");
    setSelectedHouseTypes([]);
    setSelectedBeds("All");
    setSelectedEstate("All");
    setSearchQuery("");
    setSortOrder("suburb");
    setFilterParams(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("customer_packages_pdf_filter");
      window.history.replaceState({}, "", "/browse/packages");
    }
  };

  // Filtered and sorted packages
  const filteredPackages = useMemo(() => {
    return packages
      .filter((p) => {
        // State filter (QLD / NSW / All)
        if (selectedState !== "All") {
          const pkgState = p.state || "QLD";
          if (pkgState !== selectedState) return false;
        }

        // Whitelisted IDs from Staff Custom Selection
        if (filterParams?.ids && filterParams.ids.length > 0) {
          const idSet = new Set(filterParams.ids);
          if (!idSet.has(p.id) && !idSet.has(p.name)) return false;
        }

        // Max price filter
        if (maxPrice != null && maxPrice > 0) {
          if (p.totalPrice != null && p.totalPrice > maxPrice) return false;
        }

        // Housing Type filter (Multi-Select support)
        if (selectedHouseTypes.length > 0 && !selectedHouseTypes.includes("All")) {
          const pType = (p.housingType || "").toLowerCase();
          const pDesign = (p.design || p.name || "").toLowerCase();
          const fullText = `${pType} ${pDesign}`;

          const matchesType = selectedHouseTypes.some((t) => {
            const tl = t.toLowerCase();
            if (tl === "ss" || tl.includes("single")) {
              return (
                pType.includes("single") ||
                (!fullText.includes("double") &&
                  !fullText.includes("two") &&
                  !fullText.includes("split") &&
                  !fullText.includes("dual") &&
                  !fullText.includes("duplex"))
              );
            }
            if (tl === "ds" || tl.includes("double") || tl.includes("two")) {
              return (
                fullText.includes("double") ||
                fullText.includes("two") ||
                fullText.includes("2 storey") ||
                fullText.includes("2 story")
              );
            }
            if (tl.includes("dual") || tl.includes("duplex")) {
              return (
                fullText.includes("dual") ||
                fullText.includes("duplex") ||
                fullText.includes("duet") ||
                fullText.includes("auxiliary")
              );
            }
            if (tl.includes("split")) {
              return fullText.includes("split") || fullText.includes("cobalt");
            }
            if (tl.includes("acreage")) {
              return (
                fullText.includes("acreage") ||
                fullText.includes("ranch") ||
                fullText.includes("mulberry")
              );
            }
            return fullText.includes(tl);
          });
          if (!matchesType) return false;
        }

        // Bedrooms filter
        if (selectedBeds !== "All") {
          const bCount = parseInt(String(p.beds || "0"), 10);
          if (selectedBeds === "3" && bCount !== 3) return false;
          if (selectedBeds === "4" && bCount !== 4) return false;
          if (selectedBeds === "5+" && bCount < 5) return false;
        }

        // Estate/Suburb filter
        if (selectedEstate !== "All") {
          const target = selectedEstate.toLowerCase();
          const pEst = (p.estate || "").toLowerCase();
          const pSub = (p.suburb || "").toLowerCase();
          const pComb = `${pEst} · ${pSub}`;
          if (
            !pEst.includes(target) &&
            !pSub.includes(target) &&
            !target.includes(pEst) &&
            !target.includes(pSub) &&
            !pComb.includes(target)
          ) {
            return false;
          }
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchText = `${p.name} ${p.design} ${p.suburb} ${p.estate} ${p.address} ${p.facadeName} ${p.consultantName}`.toLowerCase();
          if (!matchText.includes(q)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === "suburb") {
          const subA = (a.suburb || "").trim().toLowerCase();
          const subB = (b.suburb || "").trim().toLowerCase();
          if (subA !== subB) return subA.localeCompare(subB);
          return (a.name || "").localeCompare(b.name || "");
        }
        if (sortOrder === "price-asc") {
          return (a.totalPrice ?? 0) - (b.totalPrice ?? 0);
        }
        if (sortOrder === "price-desc") {
          return (b.totalPrice ?? 0) - (a.totalPrice ?? 0);
        }
        return a.name.localeCompare(b.name);
      });
  }, [
    packages,
    selectedState,
    filterParams,
    maxPrice,
    selectedHouseTypes,
    selectedBeds,
    selectedEstate,
    searchQuery,
    sortOrder,
  ]);

  // Group packages for the printable ListingSheet view
  const groups = useMemo(() => {
    const map = new Map<string, PublicPackage[]>();
    for (const p of filteredPackages) {
      const key = [p.suburb, p.estate].filter(Boolean).join(" — ") || "Queensland";
      const arr = map.get(key);
      if (arr) arr.push(p);
      else map.set(key, [p]);
    }
    return map;
  }, [filteredPackages]);

  const blocks: Block[] = useMemo(() => {
    const bList: Block[] = [];
    for (const [key, items] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      bList.push({ kind: "group", key: `g-${key}`, label: key.replace(" — ", ", ") });
      [...items]
        .sort((a, b) => (a.totalPrice ?? 0) - (b.totalPrice ?? 0))
        .forEach((p) => bList.push({ kind: "pkg", key: p.id, pkg: p }));
    }
    return bList;
  }, [groups]);

  // Safe pagination: capacity 3.8 ensures at most 3-4 cards per page, never clipping footer or off-screen
  const rawPages = paginate(blocks, (b) => (b.kind === "group" ? 0.7 : 1), 3.8, (b) => b.kind === "group");
  const basePages = rawPages.length > 0 ? rawPages : [[]];

  // Repeat the estate heading when a group spills onto the next sheet.
  let cursor = 0;
  const pages = basePages.map((pageBlocks) => {
    const before = blocks.slice(0, cursor);
    cursor += pageBlocks.length;
    if (!pageBlocks.length || pageBlocks[0]?.kind === "group") return pageBlocks;
    const last = [...before].reverse().find((b) => b.kind === "group");
    return last ? [{ ...last, key: `${last.key}-cont` }, ...pageBlocks] : pageBlocks;
  });

  // Adapt public packages for CustomerPdfExportModal
  const modalPackages = useMemo(
    () =>
      packages.map((p) => ({
        id: p.id,
        lot_id: null,
        name: p.name,
        housing_type: p.housingType,
        design: p.design,
        range_id: p.rangeLabel,
        facade_name: p.facadeName,
        house_price: p.housePrice ?? null,
        land_price: p.landPrice ?? null,
        total_price: p.totalPrice ?? null,
        beds: p.beds,
        baths: p.baths,
        cars: p.cars,
        floorplan_size: p.homeSize,
        state: p.state,
        status: "live" as any,
        exclusive_consultants: null,
        flyer_json: { estate: p.estate, suburb: p.suburb },
        flyer_data: { estate: p.estate, suburb: p.suburb },
        notes: null,
        needs_review: null,
        updated_at: null,
      })),
    [packages]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-brand-gold/30 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo light size={11} />
            <span className="hidden sm:inline-block h-4 w-px bg-slate-700" />
            <span className="hidden sm:inline-block text-xs font-semibold text-slate-300">
              All Available Packages · QLD &amp; NSW
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFilterModalOpen(true)}
              className="h-8 text-xs border-amber-500/40 bg-amber-950/40 text-amber-300 hover:bg-amber-900/60 hover:text-white gap-1.5"
            >
              <Filter className="h-3.5 w-3.5 text-amber-400" /> Filter &amp; Select Packages
            </Button>

            {/* View Mode Switcher */}
            <div className="flex items-center rounded-lg bg-slate-800/80 p-1 border border-slate-700/60 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all ${
                  viewMode === "grid"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Interactive Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("sheet")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all ${
                  viewMode === "sheet"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Printable Catalog</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-900/60 to-slate-950 border-b border-slate-800/80 px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{packages.length} Turnkey House &amp; Land Packages Available (QLD &amp; NSW)</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                {selectedState === "QLD" ? "Queensland" : selectedState === "NSW" ? "New South Wales" : "Queensland & NSW"} House &amp; Land Packages
              </h1>
              <p className="mt-2 text-sm text-slate-400 max-w-2xl leading-relaxed">
                Discover complete, turn-key House &amp; Land packages across Queensland and New South Wales. Every home features our Zero Surprises guarantee, lifetime structural warranty, and premium inclusions.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Turnkey Package
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Full Inclusions
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Direct Consultant Contact
              </span>
            </div>
          </div>

          {/* State Division Filter Bar */}
          <div className="flex items-center gap-2 pt-3 flex-wrap">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1.5 mr-1">
              <Globe className="h-3.5 w-3.5 text-brand-gold" /> State Division:
            </span>
            <button
              type="button"
              onClick={() => setSelectedState("All")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedState === "All"
                  ? "bg-brand-gold text-slate-950 shadow-md font-bold"
                  : "bg-slate-900/90 text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-slate-800"
              }`}
            >
              All States ({packages.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedState("QLD")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedState === "QLD"
                  ? "bg-amber-500 text-slate-950 shadow-md font-bold"
                  : "bg-slate-900/90 text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-slate-800"
              }`}
            >
              Queensland ({qldCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedState("NSW")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedState === "NSW"
                  ? "bg-sky-500 text-slate-950 shadow-md font-bold"
                  : "bg-slate-900/90 text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-slate-800"
              }`}
            >
              New South Wales ({nswCount})
            </button>
          </div>

          {/* Interactive Customer Filter Console */}
          <div className="mt-4 rounded-2xl border border-slate-800/90 bg-slate-900/90 backdrop-blur-md p-4 sm:p-5 shadow-2xl space-y-4">
            {/* Top Row: Search, Estate, & Sort */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="relative md:col-span-5">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search design, suburb, estate, or keyword..."
                  className="pl-10 pr-8 bg-slate-950 border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 h-10"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Suburb / Estate Select */}
              <div className="md:col-span-4">
                <select
                  value={selectedEstate}
                  onChange={(e) => setSelectedEstate(e.target.value)}
                  className="w-full h-10 rounded-md border border-slate-800 bg-slate-950 px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="All">All Suburbs &amp; Estates</option>
                  {uniqueEstates.map(([label, count]) => (
                    <option key={label} value={label}>
                      {label} ({count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Order */}
              <div className="md:col-span-3">
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="w-full h-10 rounded-md border border-slate-800 bg-slate-950 px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="suburb">Suburb: A to Z</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="name">Design: A to Z</option>
                </select>
              </div>
            </div>

            {/* Price Filter Row */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
              <span className="text-slate-400 font-semibold flex items-center gap-1.5 mr-1 shrink-0">
                <DollarSign className="h-3.5 w-3.5 text-emerald-400" /> Max Price:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {PRICE_PRESETS.map((p) => {
                  const active = p.value === null ? maxPrice == null : maxPrice === p.value;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setMaxPrice(p.value);
                        setCustomPriceInput(p.value ? String(p.value) : "");
                      }}
                      className={`px-3 py-1 rounded-full text-xs transition-all font-medium ${
                        active
                          ? "bg-emerald-500 text-slate-950 font-bold shadow-xs"
                          : "bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              {/* Custom numeric price input */}
              <div className="flex items-center gap-1.5 ml-auto sm:ml-2">
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                  <input
                    type="number"
                    value={customPriceInput}
                    onChange={(e) => setCustomPriceInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = parseInt(customPriceInput, 10);
                        setMaxPrice(val > 0 ? val : null);
                      }
                    }}
                    placeholder="Custom Max"
                    className="w-28 pl-6 pr-2 py-1 h-7 rounded-md bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const val = parseInt(customPriceInput, 10);
                    setMaxPrice(val > 0 ? val : null);
                  }}
                  className="px-2 py-1 h-7 rounded-md bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold"
                >
                  Set
                </button>
              </div>
            </div>

            {/* House Type Multi-Select & Bedrooms Row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
              {/* House Types (Multi-select) */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5 mr-1 shrink-0">
                  <Home className="h-3.5 w-3.5 text-amber-400" /> Storeys / Type:
                </span>
                <button
                  type="button"
                  onClick={() => toggleHouseType("All")}
                  className={`px-3 py-1 rounded-full text-xs transition-all font-medium ${
                    selectedHouseTypes.length === 0
                      ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                      : "bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800"
                  }`}
                >
                  All Types
                </button>
                {HOUSE_TYPE_OPTIONS.map((ht) => {
                  const active = selectedHouseTypes.includes(ht.value);
                  return (
                    <button
                      key={ht.value}
                      type="button"
                      onClick={() => toggleHouseType(ht.value)}
                      className={`px-3 py-1 rounded-full text-xs transition-all font-medium ${
                        active
                          ? "bg-amber-400 text-slate-950 font-bold shadow-xs"
                          : "bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800"
                      }`}
                    >
                      {ht.label}
                    </button>
                  );
                })}
              </div>

              {/* Bedrooms Filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5 mr-1 shrink-0">
                  <BedDouble className="h-3.5 w-3.5 text-sky-400" /> Beds:
                </span>
                {BEDROOM_OPTIONS.map((b) => (
                  <button
                    key={b.value}
                    type="button"
                    onClick={() => setSelectedBeds(b.value)}
                    className={`px-2.5 py-1 rounded-full text-xs transition-all font-medium ${
                      selectedBeds === b.value
                        ? "bg-sky-400 text-slate-950 font-bold shadow-xs"
                        : "bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Filter Chips & Summary */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-slate-400 text-xs mr-1">
                  Showing <strong className="text-emerald-400">{filteredPackages.length}</strong> of {packages.length} packages
                  {selectedState !== "All" ? ` in ${selectedState === "QLD" ? "Queensland" : "New South Wales"}` : ""}
                </span>

                {selectedState !== "All" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-[11px] text-slate-200 border border-slate-700">
                    State: {selectedState}
                    <button type="button" onClick={() => setSelectedState("All")} className="text-slate-400 hover:text-white">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {maxPrice != null && maxPrice > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/80 text-[11px] text-emerald-300 border border-emerald-800">
                    Under {formatAud(maxPrice)}
                    <button
                      type="button"
                      onClick={() => {
                        setMaxPrice(null);
                        setCustomPriceInput("");
                      }}
                      className="text-emerald-400 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {selectedHouseTypes.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/80 text-[11px] text-amber-300 border border-amber-800">
                    {t}
                    <button type="button" onClick={() => toggleHouseType(t)} className="text-amber-400 hover:text-white">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}

                {selectedBeds !== "All" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-950/80 text-[11px] text-sky-300 border border-sky-800">
                    {selectedBeds} Beds
                    <button type="button" onClick={() => setSelectedBeds("All")} className="text-sky-400 hover:text-white">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {selectedEstate !== "All" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-[11px] text-slate-200 border border-slate-700">
                    {selectedEstate}
                    <button type="button" onClick={() => setSelectedEstate("All")} className="text-slate-400 hover:text-white">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {searchQuery.trim() && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-[11px] text-slate-200 border border-slate-700">
                    "{searchQuery}"
                    <button type="button" onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-white">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>

              {isAnyFilterActive && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="inline-flex items-center gap-1 text-slate-400 hover:text-white underline text-xs ml-auto transition-colors"
                >
                  <RotateCcw className="h-3 w-3" /> Reset All Filters
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Active Custom Filter Notification Banner */}
      {filterParams && (
        <div className="bg-amber-900 border-b border-amber-800 px-6 py-2.5 print:hidden flex flex-wrap items-center justify-between gap-3 text-xs text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-300 shrink-0" />
            <span className="font-bold text-white">Custom Selection Active:</span>
            <span className="text-amber-100 font-medium">
              Showing {filteredPackages.length} package{filteredPackages.length === 1 ? "" : "s"}
              {filterParams.types?.length ? ` (${filterParams.types.join(", ")})` : ""}
              {filterParams.maxPrice ? ` under ${formatAud(filterParams.maxPrice)}` : ""}
              {filterParams.estates?.length ? ` across ${filterParams.estates.length} estate${filterParams.estates.length === 1 ? "" : "s"}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFilterModalOpen(true)}
              className="text-white hover:text-amber-200 underline font-bold text-xs"
            >
              Modify Selection
            </button>
            <span className="text-amber-400">·</span>
            <button
              type="button"
              onClick={() => {
                setFilterParams(null);
                sessionStorage.removeItem("customer_packages_pdf_filter");
                window.history.replaceState({}, "", "/browse/packages");
              }}
              className="text-amber-200 hover:text-white underline text-xs"
            >
              Clear Filters (Show All)
            </button>
          </div>
        </div>
      )}

      {/* Main Content View */}
      <main className="w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-8 flex-1">
        {viewMode === "grid" ? (
          /* ========================================================
             GRID / CARDS VIEW (Visual, Interactive, Client-Friendly)
             ======================================================== */
          <div className="space-y-6">
            {filteredPackages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 gap-6">
                {filteredPackages.map((p) => {
                  return (
                    <div
                      key={p.id}
                      className="rounded-2xl border border-slate-800/80 bg-slate-900/60 overflow-hidden shadow-xl hover:border-slate-700 transition-all flex flex-col group"
                    >
                      {/* Facade Image Header */}
                      <div className="relative h-48 sm:h-52 w-full bg-slate-950 overflow-hidden">
                        {p.facadeUrl ? (
                          <img
                            src={p.facadeUrl}
                            alt={p.name}
                            className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-slate-600 text-xs">
                            Hudson Homes Architecture
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30" />

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-md backdrop-blur-md border text-[10px] font-extrabold uppercase tracking-wider shadow-sm ${
                            p.state === "NSW"
                              ? "bg-sky-950/90 border-sky-500/60 text-sky-400"
                              : "bg-amber-950/90 border-amber-500/60 text-amber-400"
                          }`}>
                            {p.state || "QLD"}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md border border-slate-700 text-[10px] font-bold uppercase tracking-wider text-emerald-400 shadow-sm">
                            {p.housingType}
                          </span>
                          {p.facadeName && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-950/70 backdrop-blur-md border border-slate-700 text-[10px] text-slate-300">
                              {p.facadeName} Facade
                            </span>
                          )}
                        </div>

                        {/* Estate Tag */}
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                          <span className="text-xs font-semibold text-white flex items-center gap-1 drop-shadow-md">
                            <MapPin className="h-3.5 w-3.5 text-amber-400 flex-none" />
                            {[p.estate, p.suburb].filter(Boolean).join(", ")}
                          </span>
                        </div>
                      </div>

                      {/* Package Body */}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-extrabold text-base text-white group-hover:text-emerald-400 transition-colors">
                                {p.design || p.name}
                              </h3>
                              <span className="text-xs text-slate-400 block font-mono">
                                {p.rangeLabel}
                              </span>
                            </div>
                            <div className="text-right flex-none">
                              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                                Fixed Package From
                              </span>
                              <span className="text-lg font-black text-emerald-400 font-mono">
                                {money(p.totalPrice)}
                              </span>
                            </div>
                          </div>

                          {p.address && (
                            <p className="text-xs text-slate-300 line-clamp-1">
                              {p.address}
                            </p>
                          )}

                          {/* Specification Strip */}
                          <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-800/80 text-center text-xs">
                            <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60">
                              <span className="text-[10px] text-slate-400 block font-medium">Beds</span>
                              <span className="font-bold text-white font-mono">{p.beds || "4"}</span>
                            </div>
                            <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60">
                              <span className="text-[10px] text-slate-400 block font-medium">Baths</span>
                              <span className="font-bold text-white font-mono">{p.baths || "2"}</span>
                            </div>
                            <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60">
                              <span className="text-[10px] text-slate-400 block font-medium">Cars</span>
                              <span className="font-bold text-white font-mono">{p.cars || "2"}</span>
                            </div>
                            <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60">
                              <span className="text-[10px] text-slate-400 block font-medium">House</span>
                              <span className="font-bold text-emerald-400 font-mono text-[11px]">
                                {p.homeSize ? `${p.homeSize} m²` : "—"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Consultant Contact & Actions */}
                        <div className="pt-3 border-t border-slate-800 space-y-3">
                          {p.consultantName && (
                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                              <span>Consultant: <strong className="text-slate-200">{p.consultantName}</strong></span>
                              <span className="text-slate-400 font-medium">{p.consultantOffice}</span>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2">
                            <a
                              href={`/package/${p.id}`}
                              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-2 text-xs transition-all shadow-md shadow-emerald-950/20"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              View Full Flyer
                            </a>

                            {p.consultantPhone ? (
                              <a
                                href={`tel:${p.consultantPhone.replace(/\s+/g, "")}`}
                                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white px-3 py-2 text-xs transition-all"
                              >
                                <Phone className="h-3.5 w-3.5 text-emerald-400" />
                                Call
                              </a>
                            ) : (
                              <a
                                href={`mailto:salesqld@hudsonhomes.com.au?subject=${encodeURIComponent(`Enquiry for ${p.name}`)}`}
                                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white px-3 py-2 text-xs transition-all"
                              >
                                <Mail className="h-3.5 w-3.5 text-emerald-400" />
                                Enquire
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center space-y-3">
                <Home className="h-10 w-10 text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-white">No matching packages found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Try adjusting your search query, suburb selection, or housing type filter above.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedType("All");
                    setSelectedEstate("All");
                  }}
                  className="border-slate-700 text-xs text-slate-300"
                >
                  Reset All Filters
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* ========================================================
             PRINTABLE DOCUMENT VIEW (Paginated A4 Listing Sheet)
             ======================================================== */
          <div className="flex flex-col items-center gap-6">
            <PrintBar
              label={`House & Land packages — ${filteredPackages.length} available`}
              filename="hudson-homes-house-and-land-packages"
            />
            {pages.map((blocksOnPage, pi) => (
              <ListingSheet
                key={pi}
                title="House &amp; Land Packages"
                subtitle={
                  selectedState === "QLD"
                    ? "Queensland"
                    : selectedState === "NSW"
                      ? "New South Wales"
                      : "Queensland & New South Wales"
                }
                page={pi + 1}
                pages={pages.length}
              >
                <div className="space-y-[3mm]">
                  {blocksOnPage.map((b) =>
                    b.kind === "group" ? (
                      <div
                        key={b.key}
                        className="font-display text-[4.6mm] leading-none tracking-[0.06em] text-brand-navy pt-[1mm]"
                      >
                        {b.label}
                      </div>
                    ) : (
                      <div
                        key={b.key}
                        className="flex items-start justify-between gap-[4mm] rounded-[1.5mm] border border-brand-sand bg-white/70 px-[4mm] py-[2.8mm]"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-[2mm] flex-wrap">
                            <span className="inline-flex items-center rounded-[1mm] bg-brand-navy px-[2mm] py-[0.6mm] text-[2.2mm] font-bold tracking-[0.14em] text-brand-cream uppercase shadow-xs">
                              {b.pkg.housingType || "Single Storey"}
                            </span>
                            <div className="font-display text-[4.5mm] leading-tight text-brand-navy">
                              {b.pkg.name.includes("—")
                                ? b.pkg.name
                                : `${b.pkg.housingType || "Single Storey"} — ${b.pkg.design || b.pkg.name}`}
                            </div>
                          </div>
                          <div className="mt-[1mm] text-[2.5mm] text-brand-ink/65">
                            {[
                              b.pkg.facadeName ? `${b.pkg.facadeName} facade` : null,
                              b.pkg.rangeLabel,
                              b.pkg.address,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                          <div className="mt-[1.2mm] flex flex-wrap gap-[3mm] text-[2.5mm] text-brand-ink/80">
                            <span>{b.pkg.beds || "—"} bed</span>
                            <span>{b.pkg.baths || "—"} bath</span>
                            <span>{b.pkg.cars || "—"} car</span>
                            {b.pkg.homeSize && <span>{b.pkg.homeSize} m² home</span>}
                            {b.pkg.landSize && <span>{b.pkg.landSize} m² land</span>}
                          </div>
                          {b.pkg.consultantName && (
                            <div className="mt-[1.2mm] text-[2.4mm] text-brand-ink/65">
                              Enquire: {b.pkg.consultantName}
                              {b.pkg.consultantPhone ? ` · ${b.pkg.consultantPhone}` : ""}
                              {b.pkg.consultantEmail ? ` · ${b.pkg.consultantEmail}` : ""}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-none items-center gap-[3mm]">
                          <div className="text-right">
                            <div className="text-[2.2mm] tracking-[0.2em] text-brand-ink/50">FROM</div>
                            <div className="font-display text-[6.5mm] leading-[1] text-brand-navy">
                              {money(b.pkg.totalPrice)}
                            </div>
                            <a
                              href={`/package/${b.pkg.id}`}
                              className="mt-[0.8mm] block text-[2.2mm] tracking-[0.14em] text-brand-gold-deep uppercase font-semibold"
                            >
                              View full flyer
                            </a>
                          </div>
                          <QrCode value={`${origin}/package/${b.pkg.id}`} size={15} />
                        </div>
                      </div>
                    ),
                  )}
                  {!blocksOnPage.length && (
                    <div className="py-[10mm] text-center text-[3mm] text-brand-ink/50">
                      No packages are published right now — please contact us.
                    </div>
                  )}
                </div>
              </ListingSheet>
            ))}
          </div>
        )}
      </main>

      {/* Customer Packages PDF Export Modal */}
      {filterModalOpen && (
        <CustomerPdfExportModal
          isOpen={filterModalOpen}
          onClose={() => setFilterModalOpen(false)}
          mode="packages"
          lots={[]}
          packages={modalPackages}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-6 text-center text-xs text-slate-400 space-y-2">
        <p>
          Hudson Homes (QLD) Pty Ltd · ABN 49 163 189 071 · QBCC Licence 259372C
        </p>
        <p className="text-[11px] text-slate-400">
          Prices, floorplans, land availability and registration dates are subject to change. Terms &amp; conditions apply.
        </p>
      </footer>
    </div>
  );
}
