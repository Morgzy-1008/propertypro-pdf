import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ListingSheet, PrintBar, paginate } from "@/components/listing/ListingSheet";
import { listPublicLots, type PublicLot } from "@/lib/public-listings.functions";
import { formatAud } from "@/lib/pricing";
import { Globe, MapPin } from "lucide-react";

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

  const qldCount = useMemo(() => lots.filter((l) => (l.state || "QLD") === "QLD").length, [lots]);
  const nswCount = useMemo(() => lots.filter((l) => (l.state || "QLD") === "NSW").length, [lots]);

  const activeLots = useMemo(() => {
    if (selectedState === "All") return lots;
    return lots.filter((l) => (l.state || "QLD") === selectedState);
  }, [lots, selectedState]);

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

  const rawPages = paginate(blocks, (b) => (b.kind === "group" ? 2.4 : 1), 34);
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

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 print:hidden flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
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
        </div>
        <PrintBar label={`Available land — ${activeLots.length} lot${activeLots.length === 1 ? "" : "s"}`} filename="hudson-homes-available-land" />
      </div>

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
    </div>
  );
}
