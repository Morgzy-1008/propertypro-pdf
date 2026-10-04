import { useState, type ReactNode } from "react";
import { Download, Loader2 } from "lucide-react";
import logoUrl from "@/assets/hudson-homes-logo.png";
import { Button } from "@/components/ui/button";
import { downloadA4Pdf } from "@/lib/downloadPdf";

/** A4 sheet used by the customer-facing listing documents. */
export function ListingSheet({
  title,
  subtitle,
  page,
  pages,
  children,
}: {
  title: string;
  subtitle: string;
  page: number;
  pages: number;
  children: ReactNode;
}) {
  return (
    <div className="flyer-page font-sans !justify-between !p-0 bg-white shadow-xl print:shadow-none border border-slate-200 print:border-none">
      {/* Top Header Block */}
      <div className="shrink-0 w-full bg-white">
        <div className="flex items-end justify-between px-[14mm] pt-[8mm] pb-[3mm]">
          <div className="flex items-center gap-[3.5mm]">
            <img src={logoUrl} alt="Hudson Homes" className="h-[14mm] w-auto object-contain" />
            <div className="border-l border-brand-navy/20 pl-[3.5mm] leading-none">
              <div className="font-display text-[5.8mm] tracking-[0.14em] text-brand-navy">
                HUDSON HOMES
              </div>
              <div className="mt-[1mm] text-[2.2mm] tracking-[0.3em] text-brand-gold-deep font-semibold">
                BUILD HAPPY
              </div>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-[3.2mm] font-bold tracking-[0.22em] text-brand-gold-deep uppercase">
              {title}
            </h1>
            <p className="mt-[0.8mm] text-[2.6mm] font-medium text-brand-ink/70">{subtitle}</p>
          </div>
        </div>

        <div className="gold-bar h-[1.2mm] w-full" />
      </div>

      {/* Sheet Content: fills available height cleanly without overflowing */}
      <div className="flex-1 min-h-0 px-[12mm] pt-[3.5mm] pb-[3mm] overflow-hidden flex flex-col justify-start">
        {children}
      </div>

      {/* Bottom Footer: in-flow flex item pinned to bottom, never covered by or overlapping content */}
      <div className="shrink-0 w-full navy-panel flex items-center justify-between px-[14mm] py-[2.8mm] text-[2.4mm] text-brand-cream/90 bg-brand-navy">
        <span className="font-medium tracking-wide">
          Prices, availability and registration dates are indicative and subject to change.
        </span>
        <span className="font-semibold tracking-wider">
          Page {page} of {pages}
        </span>
      </div>
    </div>
  );
}

/** Splits a flat list of rendered blocks into A4-sized pages by weight, protecting against orphan headings. */
export function paginate<T>(
  items: T[],
  weight: (item: T) => number,
  capacity: number,
  isHeading?: (item: T) => boolean
): T[][] {
  const pages: T[][] = [];
  let current: T[] = [];
  let used = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const w = weight(item);

    // If adding this item exceeds capacity and we already have items on this page
    if (used + w > capacity && current.length) {
      // Check for orphan heading at the bottom of current page
      if (isHeading && current.length > 1 && isHeading(current[current.length - 1])) {
        const lastHeading = current.pop()!;
        pages.push(current);
        current = [lastHeading];
        used = weight(lastHeading);
      } else {
        pages.push(current);
        current = [];
        used = 0;
      }
    }
    current.push(item);
    used += w;
  }

  // Ensure last page is pushed
  if (current.length) {
    pages.push(current);
  }

  return pages.length ? pages : [[]];
}

export function PrintBar({ label, filename = "hudson-homes-listing" }: { label: string; filename?: string }) {
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      await document.fonts.ready;
      await downloadA4Pdf(document, filename);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-background px-6 py-3 print:hidden">
      <div className="text-sm font-medium text-brand-navy">{label}</div>
      <Button onClick={download} disabled={downloading} size="sm" className="bg-brand-navy text-brand-cream">
        {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {downloading ? "Creating PDF…" : "Download PDF"}
      </Button>
    </div>
  );
}
