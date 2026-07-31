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
    <div className="flyer-page font-sans">
      <div className="flex items-end justify-between px-[14mm] pt-[10mm] pb-[4mm]">
        <div className="flex items-center gap-[3.5mm]">
          <img src={logoUrl} alt="Hudson Homes" className="h-[15mm] w-auto object-contain" />
          <div className="border-l border-brand-navy/20 pl-[3.5mm] leading-none">
            <div className="font-display text-[6mm] tracking-[0.14em] text-brand-navy">
              HUDSON HOMES
            </div>
            <div className="mt-[1mm] text-[2.3mm] tracking-[0.3em] text-brand-gold-deep">
              BUILD HAPPY
            </div>
          </div>
        </div>
        <div className="text-right">
          <h1 className="text-[3.4mm] font-semibold tracking-[0.24em] text-brand-gold-deep uppercase">
            {title}
          </h1>
          <p className="mt-[1mm] text-[2.8mm] text-brand-ink/60">{subtitle}</p>
        </div>
      </div>

      <div className="gold-bar h-[1.4mm] w-full" />

      <div className="px-[12mm] pt-[5mm]">{children}</div>

      <div className="navy-panel absolute inset-x-0 bottom-0 flex items-center justify-between px-[14mm] py-[2.6mm] text-[2.5mm] text-brand-cream/85">
        <span>Prices, availability and registration dates are indicative and subject to change.</span>
        <span>
          Page {page} of {pages}
        </span>
      </div>
    </div>
  );
}

/** Splits a flat list of rendered blocks into A4-sized pages by weight. */
export function paginate<T>(items: T[], weight: (item: T) => number, capacity: number): T[][] {
  const pages: T[][] = [];
  let current: T[] = [];
  let used = 0;
  for (const item of items) {
    const w = weight(item);
    if (used + w > capacity && current.length) {
      pages.push(current);
      current = [];
      used = 0;
    }
    current.push(item);
    used += w;
  }
  if (current.length) pages.push(current);
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
