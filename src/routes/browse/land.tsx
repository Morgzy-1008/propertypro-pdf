import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ListingSheet, PrintBar, paginate } from "@/components/listing/ListingSheet";
import { listPublicLots, type PublicLot } from "@/lib/public-listings.functions";
import { formatAud } from "@/lib/pricing";
import { Globe, MapPin, Search, X, RotateCcw, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/browse/land")({
  head: () => ({
    meta: [
      { title: "Available Land Across QLD & NSW | Hudson Homes" },
      {
        name: "description",
        content:
          "Browse every available vacant land lot Hudson Homes has across Queensland and New South Wales — size, frontage, price, registration and developer contact details.",
      },
      { property: "og:title", content: "Available Land Across QLD & NSW | Hudson Homes" },
      {
        property: "og:description",
        content: "Vacant land available now across Queensland and New South Wales, organised by suburb and state.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: () => listPublicLots(),
  errorComponent: () => <Fallback msg="We couldn't load land availability right now." />,
  notFoundComponent: () => <Fallback msg="Nothing to show here." />,
  component: LandBrowse,
});

function Fallback({ msg }: { msg: string }) {
  return <div className="p-10 text-center text-sm text-muted-foreground">{msg}</div>;
}

const money = (v: number | null) => (v == null ? "POA" : formatAud(v));

type Block =
  | { kind: "group"; key: string; estate: string; suburb: string; state: "QLD" | "NSW"; lot: PublicLot }
  | { kind: "lot"; key: string; lot: PublicLot };

const LAND_PRICE_PRESETS = [
  { label: "All Prices", value: null },
  { label: "<$350k", value: 350000 },
  { label: "<$450k", value: 450000 },
  { label: "<$550k", value: 550000 },
  { label: "<$650k", value: 650000 },
];

function LandBrowse() {
  const lots = Route.useLoaderData();

  // Filter States
  const [selectedState, setSelectedState] = useState<"All" | "QLD" | "NSW">(() => {
    if (typeof window === "undefined") return "All";
    const s = new URLSearchParams(window.location.search).get("state");
    return s === "QLD" || s === "NSW" ? s : "All";
  });

  const [selectedSuburb, setSelectedSuburb] = useState<string>(() => {
    if (typeof window === "undefined") return "All";
    const p = new URLSearchParams(window.location.search);
    return p.get("suburb") || p.get("estate") || "All";
  });

  const [searchQuery, setSearchQuery] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("q") || "";
  });

  const [maxPrice, setMaxPrice] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const p = new URLSearchParams(window.location.search).get("maxPrice");
    return p ? Number(p) : null;
  });

  // Custom filter params
  const [filterParams, setFilterParams] = useState<{
    ids?: string[];
    maxPrice?: number | null;
    suburbs?: string[];
    state?: string;
  } | null>(null);

  // Ingest session storage filter if present
  useEffect(() => {
    if (typeof window === "undefined") return;
    let sessionData: any = null;
    try {
      const raw = sessionStorage.getItem("customer_land_pdf_filter");
      if (raw) sessionData = JSON.parse(raw);
    } catch {}

    if (sessionData) {
      if (sessionData.ids?.length) {
        setFilterParams((prev) => ({ ...(prev || {}), ids: sessionData.ids }));
      }
      if (sessionData.maxPrice && maxPrice == null) {
        setMaxPrice(sessionData.maxPrice);
      }
      if (sessionData.state && selectedState === "All") {
        setSelectedState(sessionData.state);
      }
      if (sessionData.suburbs?.length && selectedSuburb === "All") {
        setSelectedSuburb(sessionData.suburbs[0]);
      }
    }
  }, []);

  // Sync filters to URL query params
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (selectedState !== "All") params.set("state", selectedState);
    if (selectedSuburb !== "All") params.set("suburb", selectedSuburb);
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (maxPrice != null && maxPrice > 0) params.set("maxPrice", String(maxPrice));
    if (filterParams?.ids && filterParams.ids.length > 0) {
      params.set("ids", filterParams.ids.join(","));
    }

    const query = params.toString();
    const newUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
    window.history.replaceState({}, "", newUrl);
  }, [selectedState, selectedSuburb, searchQuery, maxPrice, filterParams]);

  const qldCount = useMemo(() => lots.filter((l) => (l.state || "QLD") === "QLD").length, [lots]);
  const nswCount = useMemo(() => lots.filter((l) => (l.state || "QLD") === "NSW").length, [lots]);

  // Extract unique suburbs based on current state selection
  const uniqueSuburbs = useMemo(() => {
    const suburbMap = new Map<string, number>();
    lots.forEach((l) => {
      if (selectedState !== "All" && (l.state || "QLD") !== selectedState) return;
      const sub = (l.suburb || "").trim();
      if (sub) {
        suburbMap.set(sub, (suburbMap.get(sub) || 0) + 1);
      }
    });
    return Array.from(suburbMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [lots, selectedState]);

  // Active filtered lots
  const activeLots = useMemo(() => {
    let list = lots;

    // Filter by State
    if (selectedState !== "All") {
      list = list.filter((l) => (l.state || "QLD") === selectedState);
    }

    // Filter by Suburb
    if (selectedSuburb !== "All") {
      const target = selectedSuburb.toLowerCase().trim();
      list = list.filter((l) => {
        const sub = (l.suburb || "").toLowerCase().trim();
        return sub === target || sub.includes(target) || target.includes(sub);
      });
    }

    // Filter by Max Price
    if (maxPrice != null && maxPrice > 0) {
      list = list.filter((l) => l.landPrice == null || l.landPrice <= maxPrice);
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((l) => {
        const text = `${l.lotNumber || ""} ${l.address || ""} ${l.suburb || ""} ${l.estate || ""} ${l.developer || ""}`.toLowerCase();
        return text.includes(q);
      });
    }

    // Filter by Selected IDs if preset
    if (filterParams?.ids && filterParams.ids.length > 0) {
      const idSet = new Set(filterParams.ids);
      list = list.filter((l) => idSet.has(l.id || "") || idSet.has(l.lotNumber || "") || idSet.has(l.address || ""));
    }

    return list;
  }, [lots, selectedState, selectedSuburb, maxPrice, searchQuery, filterParams]);

  // Group strictly by Suburb
  const groups = useMemo(() => {
    const map = new Map<string, PublicLot[]>();
    for (const l of activeLots) {
      const state = l.state || "QLD";
      const suburb = (l.suburb || l.estate || "Queensland").trim();
      const key = `${state} — ${suburb}`;
      const arr = map.get(key);
      if (arr) arr.push(l);
      else map.set(key, [l]);
    }
    return map;
  }, [activeLots]);

  const blocks: Block[] = useMemo(() => {
    const list: Block[] = [];
    for (const [key, items] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const sorted = [...items].sort((a, b) => (a.landPrice ?? 0) - (b.landPrice ?? 0));
      const first = sorted[0];
      list.push({
        kind: "group",
        key: `g-${key}`,
        suburb: first.suburb || first.estate,
        estate: first.estate,
        state: (first.state || "QLD") as "QLD" | "NSW",
        lot: first,
      });
      sorted.forEach((l, i) =>
        list.push({ kind: "lot", key: `l-${key}-${i}`, lot: l }),
      );
    }
    return list;
  }, [groups]);

  // Safe pagination: capacity 20, group weight 2.5, lot weight 1.0
  const rawPages = paginate(blocks, (b) => (b.kind === "group" ? 2.5 : 1), 20, (b) => b.kind === "group");
  const basePages = rawPages.length > 0 ? rawPages : [[]];

  // Repeat the suburb heading when a group spills onto the next sheet
  let cursor = 0;
  const pages = basePages.map((pageBlocks) => {
    const before = blocks.slice(0, cursor);
    cursor += pageBlocks.length;
    if (!pageBlocks.length || pageBlocks[0]?.kind === "group") return pageBlocks;
    const last = [...before].reverse().find((b) => b.kind === "group");
    return last ? [{ ...last, key: `${last.key}-cont` }, ...pageBlocks] : pageBlocks;
  });

  const isAnyFilterActive =
    selectedState !== "All" ||
    selectedSuburb !== "All" ||
    searchQuery.trim() !== "" ||
    maxPrice !== null ||
    (filterParams?.ids && filterParams.ids.length > 0);

  const resetFilters = () => {
    setSelectedState("All");
    setSelectedSuburb("All");
    setSearchQuery("");
    setMaxPrice(null);
    setFilterParams(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("customer_land_pdf_filter");
      window.history.replaceState({}, "", "/browse/land");
    }
  };

  return (
    <div className="min-h-screen bg-muted/40 font-sans">
      {/* Top Interactive Controls Console (Screen Only) */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-3 print:hidden shadow-md sticky top-0 z-40">
        <div className="max-w-[1920px] mx-auto flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              {/* State Filter */}
              <div className="flex items-center gap-1.5 mr-2">
                <Globe className="h-4 w-4 text-brand-gold shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">State:</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedState("All")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  selectedState === "All"
                    ? "bg-brand-gold text-slate-950 font-bold shadow-sm"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                All States ({lots.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedState("QLD")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  selectedState === "QLD"
                    ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                Queensland ({qldCount})
              </button>
              <button
                type="button"
                onClick={() => setSelectedState("NSW")}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  selectedState === "NSW"
                    ? "bg-sky-500 text-slate-950 font-bold shadow-sm"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                New South Wales ({nswCount})
              </button>

              {/* Suburb Selector Dropdown */}
              <div className="ml-2 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <select
                  value={selectedSuburb}
                  onChange={(e) => setSelectedSuburb(e.target.value)}
                  className="h-8 rounded-md border border-slate-700 bg-slate-950 px-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer max-w-[200px]"
                >
                  <option value="All">All Suburbs ({uniqueSuburbs.reduce((acc, [, c]) => acc + c, 0)})</option>
                  {uniqueSuburbs.map(([suburb, count]) => (
                    <option key={suburb} value={suburb}>
                      {suburb} ({count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Bar */}
              <div className="relative ml-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search suburb, address, or lot..."
                  className="h-8 pl-8 pr-7 text-xs bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500 w-48 sm:w-56"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* PrintBar Actions */}
            <div className="flex items-center gap-3">
              <PrintBar
                label={`Available land — ${activeLots.length} lot${activeLots.length === 1 ? "" : "s"}`}
                filename="hudson-homes-available-land"
              />
            </div>
          </div>

          {/* Secondary Filter Row: Price Caps & Reset */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-400 font-semibold mr-1">Max Land Price:</span>
              {LAND_PRICE_PRESETS.map((p) => {
                const active = p.value === null ? maxPrice == null : maxPrice === p.value;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setMaxPrice(p.value)}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                      active
                        ? "bg-cyan-500 text-slate-950 font-bold shadow-xs"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {isAnyFilterActive && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-slate-400 hover:text-white underline text-xs transition-colors"
              >
                <RotateCcw className="h-3 w-3" /> Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Active Custom Filter Notification Banner */}
      {filterParams && (
        <div className="bg-cyan-900 border-b border-cyan-800 px-6 py-2.5 print:hidden flex flex-wrap items-center justify-between gap-3 text-xs text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-300 shrink-0" />
            <span className="font-bold text-white">Custom Selection Active:</span>
            <span className="text-cyan-100 font-medium">
              Showing {activeLots.length} lot{activeLots.length === 1 ? "" : "s"}
              {filterParams.maxPrice ? ` under ${formatAud(filterParams.maxPrice)}` : ""}
              {filterParams.suburbs?.length ? ` in ${filterParams.suburbs.join(", ")}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setFilterParams(null);
                sessionStorage.removeItem("customer_land_pdf_filter");
                window.history.replaceState({}, "", "/browse/land");
              }}
              className="text-cyan-200 hover:text-white underline text-xs font-semibold"
            >
              Clear Filters (Show All)
            </button>
          </div>
        </div>
      )}

      {/* Printable Sheet View */}
      <div className="flex flex-col items-center gap-6 p-6 print:gap-0 print:p-0">
        {pages.map((blocksOnPage, pi) => (
          <ListingSheet
            key={pi}
            title="Available Land"
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
            <table className="w-full border-collapse text-[2.7mm]">
              <thead>
                <tr className="border-b border-brand-sand text-left text-[2.3mm] tracking-[0.16em] text-brand-ink/50 uppercase">
                  <th className="py-[1.6mm]">Lot / address</th>
                  <th className="py-[1.6mm]">Size</th>
                  <th className="py-[1.6mm]">Frontage</th>
                  <th className="py-[1.6mm]">Registration</th>
                  <th className="py-[1.6mm] text-right">Land price</th>
                </tr>
              </thead>
              <tbody>
                {blocksOnPage.map((b) =>
                  b.kind === "group" ? (
                    <tr key={b.key}>
                      <td colSpan={5} className="pt-[4mm] pb-[1.5mm]">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[2mm] font-extrabold uppercase tracking-wider ${
                              b.state === "NSW"
                                ? "bg-sky-900/40 text-sky-800 border border-sky-600/40"
                                : "bg-amber-900/40 text-amber-800 border border-amber-600/40"
                            }`}
                          >
                            {b.state}
                          </span>
                          <div className="font-display text-[5mm] leading-none tracking-[0.06em] text-brand-navy">
                            {b.suburb}
                            {b.estate && b.estate !== b.suburb ? (
                              <span className="text-[2.6mm] font-sans font-normal text-brand-ink/50 ml-2">
                                ({b.estate})
                              </span>
                            ) : null}
                          </div>
                        </div>
                        {(b.lot.developer || b.lot.developerContactName) && (
                          <div className="mt-[1.2mm] text-[2.5mm] text-brand-ink/65">
                            {[
                              b.lot.developer,
                              b.lot.developerContactName,
                              b.lot.developerContactPhone,
                              b.lot.developerContactEmail,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    <tr key={b.key} className="border-b border-brand-sand/70">
                      <td className="py-[1.5mm]">
                        <span className="font-medium text-brand-navy">
                          {b.lot.lotNumber ? `Lot ${b.lot.lotNumber}` : "Lot"}
                        </span>
                        {b.lot.address && (
                          <span className="text-brand-ink/60"> · {b.lot.address}</span>
                        )}
                      </td>
                      <td className="py-[1.5mm]">
                        {b.lot.landSize ? `${b.lot.landSize} m²` : "—"}
                      </td>
                      <td className="py-[1.5mm]">
                        {b.lot.frontage ? `${b.lot.frontage} m` : "—"}
                      </td>
                      <td className="py-[1.5mm]">
                        {b.lot.titled
                          ? "Registered"
                          : b.lot.registrationDate
                            ? `Expected ${b.lot.registrationDate}`
                            : "TBC"}
                      </td>
                      <td className="py-[1.5mm] text-right font-medium text-brand-navy">
                        {money(b.lot.landPrice)}
                      </td>
                    </tr>
                  ),
                )}
                {!blocksOnPage.length && (
                  <tr>
                    <td colSpan={5} className="py-[10mm] text-center text-brand-ink/50">
                      No land is available at the moment — please contact us.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ListingSheet>
        ))}
      </div>
    </div>
  );
}
