import { createFileRoute } from "@tanstack/react-router";
import { ListingSheet, PrintBar, paginate } from "@/components/listing/ListingSheet";
import { QrCode } from "@/components/flyer/QrCode";
import { listPublicPackages, type PublicPackage } from "@/lib/public-listings.functions";
import { formatAud } from "@/lib/pricing";

export const Route = createFileRoute("/browse/packages")({
  head: () => ({
    meta: [
      { title: "House & Land Packages in QLD | Hudson Homes" },
      {
        name: "description",
        content:
          "Every Hudson Homes House & Land package available in South East Queensland — fixed prices, inclusions, and a direct line to your new home consultant.",
      },
      { property: "og:title", content: "House & Land Packages in QLD | Hudson Homes" },
      {
        property: "og:description",
        content: "Fixed-price House & Land packages available now, organised by estate.",
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

  const groups = new Map<string, PublicPackage[]>();
  for (const p of packages) {
    const key = [p.suburb, p.estate].filter(Boolean).join(" — ") || "Queensland";
    const arr = groups.get(key);
    if (arr) arr.push(p);
    else groups.set(key, [p]);
  }

  const blocks: Block[] = [];
  for (const [key, items] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    blocks.push({ kind: "group", key: `g-${key}`, label: key.replace(" — ", ", ") });
    [...items]
      .sort((a, b) => (a.totalPrice ?? 0) - (b.totalPrice ?? 0))
      .forEach((p) => blocks.push({ kind: "pkg", key: p.id, pkg: p }));
  }

  const rawPages = paginate(blocks, (b) => (b.kind === "group" ? 1.2 : 1), 6);
  const pages = rawPages.length > 0 ? rawPages : [[]];

  return (
    <div className="min-h-screen bg-muted/40">
      <PrintBar
        label={`House & Land packages — ${packages.length} available`}
        filename="hudson-homes-house-and-land-packages"
      />
      <div className="flex flex-col items-center gap-6 p-6 print:gap-0 print:p-0">
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
                      <div className="font-display text-[4.6mm] leading-[1.1] text-brand-navy">
                        {b.pkg.name}
                      </div>
                      <div className="mt-[1mm] text-[2.6mm] text-brand-ink/65">
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
    </div>
  );
}
