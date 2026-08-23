import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ListingSheet, PrintBar, paginate } from "@/components/listing/ListingSheet";
import { QrCode } from "@/components/flyer/QrCode";
import { listPublicPackages, type PublicPackage } from "@/lib/public-listings.functions";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/browse/packages")({
  head: () => ({
    meta: [
      { title: "Available House & Land Packages in QLD | Hudson Homes" },
      {
        name: "description",
        content:
          "Explore every Hudson Homes House & Land package available across South East Queensland — fixed pricing, complete inclusions, and direct consultant contacts.",
      },
      { property: "og:title", content: "Available House & Land Packages in QLD | Hudson Homes" },
      {
        property: "og:description",
        content: "Fixed-price House & Land packages available now, organised by estate and design.",
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
  const packages = Route.useLoaderData();
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  const [viewMode, setViewMode] = useState<"grid" | "sheet">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [selectedEstate, setSelectedEstate] = useState<string>("All");
  const [sortOrder, setSortOrder] = useState<"price-asc" | "price-desc" | "name">("price-asc");

  // Extract unique estates & suburbs
  const uniqueEstates = useMemo(() => {
    const set = new Set<string>();
    packages.forEach((p) => {
      if (p.suburb) set.add(p.suburb);
      if (p.estate && p.estate !== "Queensland") set.add(p.estate);
    });
    return ["All", ...Array.from(set).sort()];
  }, [packages]);

  // Housing Type categories
  const housingTypes = ["All", "Single Storey", "Double Storey", "Dual Living", "Acreage"];

  // Filtered and sorted packages
  const filteredPackages = useMemo(() => {
    return packages
      .filter((p) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchText = `${p.name} ${p.design} ${p.suburb} ${p.estate} ${p.address} ${p.facadeName} ${p.consultantName}`.toLowerCase();
          if (!matchText.includes(q)) return false;
        }

        // Housing Type filter
        if (selectedType !== "All") {
          if (p.housingType.toLowerCase() !== selectedType.toLowerCase()) return false;
        }

        // Estate/Suburb filter
        if (selectedEstate !== "All") {
          const match =
            p.estate.toLowerCase() === selectedEstate.toLowerCase() ||
            p.suburb.toLowerCase() === selectedEstate.toLowerCase();
          if (!match) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === "price-asc") {
          return (a.totalPrice ?? 0) - (b.totalPrice ?? 0);
        }
        if (sortOrder === "price-desc") {
          return (b.totalPrice ?? 0) - (a.totalPrice ?? 0);
        }
        return a.name.localeCompare(b.name);
      });
  }, [packages, searchQuery, selectedType, selectedEstate, sortOrder]);

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

  const rawPages = paginate(blocks, (b) => (b.kind === "group" ? 1.2 : 1), 6);
  const pages = rawPages.length > 0 ? rawPages : [[]];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-brand-gold/30 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo light size={11} />
            <span className="hidden sm:inline-block h-4 w-px bg-slate-700" />
            <span className="hidden sm:inline-block text-xs font-semibold text-slate-300">
              South East Queensland Package Gallery
            </span>
          </div>

          <div className="flex items-center gap-2">
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
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{packages.length} Fixed-Price House &amp; Land Packages Available</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Queensland House &amp; Land Packages
              </h1>
              <p className="mt-2 text-sm text-slate-400 max-w-2xl leading-relaxed">
                Discover complete, turn-key House &amp; Land packages across South East Queensland. Every home features our Zero Surprises guarantee, lifetime structural warranty, and premium inclusions.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Fixed Price
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Full Inclusions
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Direct Consultant Contact
              </span>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by suburb, estate, design name, or consultant..."
                className="pl-10 bg-slate-900 border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 h-10"
              />
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-2">
              {/* Estate filter */}
              <select
                value={selectedEstate}
                onChange={(e) => setSelectedEstate(e.target.value)}
                className="h-10 rounded-md border border-slate-800 bg-slate-900 px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {uniqueEstates.map((est) => (
                  <option key={est} value={est}>
                    {est === "All" ? "All Suburbs & Estates" : est}
                  </option>
                ))}
              </select>

              {/* Sort order */}
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="h-10 rounded-md border border-slate-800 bg-slate-900 px-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name">Design: A to Z</option>
              </select>
            </div>
          </div>

          {/* Housing Type Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {housingTypes.map((ht) => (
              <button
                key={ht}
                type="button"
                onClick={() => setSelectedType(ht)}
                className={`px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all font-medium ${
                  selectedType === ht
                    ? "bg-emerald-500 text-slate-950 font-bold shadow-xs"
                    : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800"
                }`}
              >
                {ht}
              </button>
            ))}
            <span className="text-slate-500 text-[11px] ml-auto">
              Showing {filteredPackages.length} of {packages.length} packages
            </span>
          </div>
        </div>
      </section>

      {/* Main Content View */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1">
        {viewMode === "grid" ? (
          /* ========================================================
             GRID / CARDS VIEW (Visual, Interactive, Client-Friendly)
             ======================================================== */
          <div className="space-y-6">
            {filteredPackages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                                Fixed Package From
                              </span>
                              <span className="text-lg font-black text-emerald-400 font-mono">
                                {money(p.totalPrice)}
                              </span>
                            </div>
                          </div>

                          {p.address && (
                            <p className="text-xs text-slate-400 line-clamp-1">
                              {p.address}
                            </p>
                          )}

                          {/* Specification Strip */}
                          <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-800/80 text-center text-xs">
                            <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60">
                              <span className="text-[10px] text-slate-500 block">Beds</span>
                              <span className="font-bold text-white font-mono">{p.beds || "4"}</span>
                            </div>
                            <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60">
                              <span className="text-[10px] text-slate-500 block">Baths</span>
                              <span className="font-bold text-white font-mono">{p.baths || "2"}</span>
                            </div>
                            <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60">
                              <span className="text-[10px] text-slate-500 block">Cars</span>
                              <span className="font-bold text-white font-mono">{p.cars || "2"}</span>
                            </div>
                            <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800/60">
                              <span className="text-[10px] text-slate-500 block">House</span>
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
                              <span className="text-slate-500">{p.consultantOffice}</span>
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
                subtitle="South East Queensland"
                page={pi + 1}
                pages={pages.length}
              >
                <div className="space-y-[3.5mm]">
                  {blocksOnPage.map((b) =>
                    b.kind === "group" ? (
                      <div
                        key={b.key}
                        className="font-display text-[5mm] leading-none tracking-[0.06em] text-brand-navy"
                      >
                        {b.label}
                      </div>
                    ) : (
                      <div
                        key={b.key}
                        className="flex items-start justify-between gap-[5mm] rounded-[1.5mm] border border-brand-sand bg-white/70 px-[4mm] py-[3mm]"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-[2.2mm] flex-wrap">
                            <span className="inline-flex items-center rounded-[1mm] bg-brand-navy px-[2.2mm] py-[0.8mm] text-[2.4mm] font-bold tracking-[0.14em] text-brand-cream uppercase shadow-xs">
                              {b.pkg.housingType || "Single Storey"}
                            </span>
                            <div className="font-display text-[4.8mm] leading-[1.1] text-brand-navy">
                              {b.pkg.name.includes("—")
                                ? b.pkg.name
                                : `${b.pkg.housingType || "Single Storey"} — ${b.pkg.design || b.pkg.name}`}
                            </div>
                          </div>
                          <div className="mt-[1.2mm] text-[2.6mm] text-brand-ink/65">
                            {[
                              b.pkg.facadeName ? `${b.pkg.facadeName} facade` : null,
                              b.pkg.rangeLabel,
                              b.pkg.address,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                          <div className="mt-[1.6mm] flex flex-wrap gap-[3.5mm] text-[2.6mm] text-brand-ink/80">
                            <span>{b.pkg.beds || "—"} bed</span>
                            <span>{b.pkg.baths || "—"} bath</span>
                            <span>{b.pkg.cars || "—"} car</span>
                            {b.pkg.homeSize && <span>{b.pkg.homeSize} m² home</span>}
                            {b.pkg.landSize && <span>{b.pkg.landSize} m² land</span>}
                          </div>
                          {b.pkg.consultantName && (
                            <div className="mt-[1.6mm] text-[2.5mm] text-brand-ink/65">
                              Enquire: {b.pkg.consultantName}
                              {b.pkg.consultantPhone ? ` · ${b.pkg.consultantPhone}` : ""}
                              {b.pkg.consultantEmail ? ` · ${b.pkg.consultantEmail}` : ""}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-none items-center gap-[3.5mm]">
                          <div className="text-right">
                            <div className="text-[2.3mm] tracking-[0.2em] text-brand-ink/50">FROM</div>
                            <div className="font-display text-[7mm] leading-[1] text-brand-navy">
                              {money(b.pkg.totalPrice)}
                            </div>
                            <a
                              href={`/package/${b.pkg.id}`}
                              className="mt-[1mm] block text-[2.3mm] tracking-[0.14em] text-brand-gold-deep uppercase"
                            >
                              View full flyer
                            </a>
                          </div>
                          <QrCode value={`${origin}/package/${b.pkg.id}`} size={16} />
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

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-6 text-center text-xs text-slate-500 space-y-2">
        <p>
          Hudson Homes (QLD) Pty Ltd · ABN 49 163 189 071 · QBCC Licence 259372C
        </p>
        <p className="text-[11px] text-slate-600">
          Prices, floorplans, land availability and registration dates are subject to change. Terms &amp; conditions apply.
        </p>
      </footer>
    </div>
  );
}
