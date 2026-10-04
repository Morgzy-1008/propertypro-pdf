import { useState, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ListingSheet, PrintBar, paginate } from "@/components/listing/ListingSheet";
import { listPublicLots, type PublicLot } from "@/lib/public-listings.functions";
import { formatAud } from "@/lib/pricing";
import { Globe, MapPin, Filter, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomerPdfExportModal } from "@/components/database/CustomerPdfExportModal";

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
        content: "Vacant land available now across Queensland and New South Wales, organised by estate and state.",
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

function LandBrowse() {
  const lots = Route.useLoaderData();
  const [selectedState, setSelectedState] = useState<"All" | "QLD" | "NSW">("All");

  // Check URL search parameters or session storage filter
  const [filterParams, setFilterParams] = useState<{
    ids?: string[];
    maxPrice?: number | null;
    estates?: string[];
    suburbs?: string[];
    state?: string;
  } | null>(null);

  const [filterModalOpen, setFilterModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const search = new URLSearchParams(window.location.search);
    const idsParam = search.get("ids");
    const maxPriceParam = search.get("maxPrice");
    const stateParam = search.get("state");
    const estateParam = search.get("estate");
    const suburbParam = search.get("suburb");

    let sessionData: any = null;
    try {
      const raw = sessionStorage.getItem("customer_land_pdf_filter");
      if (raw) sessionData = JSON.parse(raw);
    } catch {}

    const ids = idsParam ? idsParam.split(",").map((s) => s.trim()).filter(Boolean) : (sessionData?.ids || undefined);
    const maxPrice = maxPriceParam ? Number(maxPriceParam) : (sessionData?.maxPrice ?? null);
    const state = (stateParam as any) || sessionData?.state || undefined;
    const estates = estateParam ? [estateParam] : (sessionData?.estates || undefined);
    const suburbs = suburbParam ? [suburbParam] : (sessionData?.suburbs || undefined);

    if (state === "QLD" || state === "NSW" || state === "All") {
      setSelectedState(state);
    }

    if (ids?.length || maxPrice || estates?.length || suburbs?.length) {
      setFilterParams({ ids, maxPrice, estates, suburbs, state });
    }
  }, []);

  const qldCount = useMemo(() => lots.filter((l) => (l.state || "QLD") === "QLD").length, [lots]);
  const nswCount = useMemo(() => lots.filter((l) => (l.state || "QLD") === "NSW").length, [lots]);

  const activeLots = useMemo(() => {
    let list = lots;
    if (selectedState !== "All") {
      list = list.filter((l) => (l.state || "QLD") === selectedState);
    }

    if (filterParams) {
      if (filterParams.ids && filterParams.ids.length > 0) {
        const idSet = new Set(filterParams.ids);
        list = list.filter((l) => idSet.has(l.id || "") || idSet.has(l.lotNumber || "") || idSet.has(l.address || ""));
      }
      if (filterParams.maxPrice != null) {
        list = list.filter((l) => l.landPrice == null || l.landPrice <= filterParams.maxPrice!);
      }
      if (filterParams.estates && filterParams.estates.length > 0) {
        list = list.filter((l) => filterParams.estates!.some((e) => l.estate.toLowerCase().includes(e.toLowerCase())));
      }
      if (filterParams.suburbs && filterParams.suburbs.length > 0) {
        list = list.filter((l) => filterParams.suburbs!.some((s) => l.suburb.toLowerCase().includes(s.toLowerCase())));
      }
    }

    return list;
  }, [lots, selectedState, filterParams]);

  const groups = new Map<string, PublicLot[]>();
  for (const l of activeLots) {
    const state = l.state || "QLD";
    const key = `${state} — ${l.estate} — ${l.suburb || ""}`;
    const arr = groups.get(key);
    if (arr) arr.push(l);
    else groups.set(key, [l]);
  }

  const blocks: Block[] = [];
  for (const [key, items] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const sorted = [...items].sort((a, b) => (a.landPrice ?? 0) - (b.landPrice ?? 0));
    const first = sorted[0];
    blocks.push({
      kind: "group",
      key: `g-${key}`,
      estate: first.estate,
      suburb: first.suburb,
      state: (first.state || "QLD") as "QLD" | "NSW",
      lot: first,
    });
    sorted.forEach((l, i) =>
      blocks.push({ kind: "lot", key: `l-${key}-${i}`, lot: l }),
    );
  }

  // Safe pagination: capacity 20, group weight 2.5, lot weight 1.0, protecting against orphan headings
  const rawPages = paginate(blocks, (b) => (b.kind === "group" ? 2.5 : 1), 20, (b) => b.kind === "group");
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

  // Adapt lots for CustomerPdfExportModal
  const modalLots = useMemo(
    () =>
      lots.map((l, idx) => ({
        id: l.id || `lot-${idx}-${l.estate}-${l.lotNumber}`,
        estate: l.estate,
        suburb: l.suburb,
        state: l.state,
        developer: l.developer,
        developer_contact_name: l.developerContactName,
        developer_contact_phone: l.developerContactPhone,
        developer_contact_email: l.developerContactEmail,
        lot_number: l.lotNumber,
        address: l.address,
        land_size: l.landSize,
        frontage: l.frontage,
        land_price: l.landPrice,
        titled: l.titled,
        registration_date: l.registrationDate,
        status: (l.status || "available") as any,
        exclusive_consultants: null,
        deadline: null,
        notes: null,
        updated_at: null,
      })),
    [lots]
  );

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Top Controls Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 print:hidden flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Globe className="h-4 w-4 text-brand-gold" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">State Filter:</span>
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

          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterModalOpen(true)}
            className="h-7 text-xs border-cyan-500/40 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/60 hover:text-white gap-1.5 ml-2"
          >
            <Filter className="h-3.5 w-3.5 text-cyan-400" /> Filter &amp; Select Lots
          </Button>
        </div>
        <PrintBar label={`Available land — ${activeLots.length} lot${activeLots.length === 1 ? "" : "s"}`} filename="hudson-homes-available-land" />
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
              {filterParams.estates?.length ? ` across ${filterParams.estates.length} estate${filterParams.estates.length === 1 ? "" : "s"}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFilterModalOpen(true)}
              className="text-white hover:text-cyan-200 underline font-bold text-xs"
            >
              Modify Selection
            </button>
            <span className="text-cyan-400">·</span>
            <button
              type="button"
              onClick={() => {
                setFilterParams(null);
                sessionStorage.removeItem("customer_land_pdf_filter");
                window.history.replaceState({}, "", "/browse/land");
              }}
              className="text-cyan-200 hover:text-white underline text-xs"
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
                            {b.estate}
                            {b.suburb ? `, ${b.suburb}` : ""}
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

      {/* Customer Land PDF Export Modal */}
      {filterModalOpen && (
        <CustomerPdfExportModal
          isOpen={filterModalOpen}
          onClose={() => setFilterModalOpen(false)}
          mode="land"
          lots={modalLots}
        />
      )}
    </div>
  );
}
