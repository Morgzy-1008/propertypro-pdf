import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Loader2, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ExpressFlyer } from "@/components/flyer/FlyerTemplates";
import { defaultFlyer, type FlyerData } from "@/components/flyer/types";
import { getPublicPackage } from "@/lib/public-listings.functions";
import { downloadA4Pdf, buildFlyerPdfFilename } from "@/lib/downloadPdf";

export const Route = createFileRoute("/package/$id")({
  loader: async ({ params }) => {
    const res = await getPublicPackage({ data: { id: params.id } });
    if (!res) throw notFound();
    return res;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "House & Land Package"} | Hudson Homes` },
      {
        name: "description",
        content: `Full details, inclusions and pricing for the ${loaderData?.name ?? "House & Land"} package from Hudson Homes in South East Queensland.`,
      },
      { property: "og:title", content: `${loaderData?.name ?? "House & Land Package"} | Hudson Homes` },
      {
        property: "og:description",
        content: "Fixed-price House & Land package with full inclusions from Hudson Homes.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  errorComponent: () => (
    <div className="p-10 text-center text-sm text-muted-foreground">
      This package isn&rsquo;t available.
    </div>
  ),
  notFoundComponent: () => (
    <div className="p-10 text-center text-sm text-muted-foreground">
      This package is no longer available.
    </div>
  ),
  component: PublicPackagePage,
});

function PublicPackagePage() {
  const { flyerJson, name } = Route.useLoaderData();
  const parsed = JSON.parse(flyerJson) as Partial<FlyerData>;
  const d: FlyerData = { ...defaultFlyer, ...parsed };
  const [downloading, setDownloading] = useState(false);

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      await document.fonts.ready;
      await downloadA4Pdf(document.querySelector(".print-root") ?? document, buildFlyerPdfFilename(d));
    } catch {
      toast.error("Could not create the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-muted/40 print:hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-background px-6 py-3">
          <h1 className="text-sm font-semibold text-brand-navy">{name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            {d.contactPhone && (
              <a
                href={`tel:${d.contactPhone.replace(/\s+/g, "")}`}
                className="inline-flex items-center gap-2 rounded-md bg-brand-navy px-4 py-2 text-xs font-semibold tracking-wide text-brand-cream uppercase"
              >
                <Phone className="h-3.5 w-3.5" /> Call {d.contactName || "us"}
              </a>
            )}
            {d.contactEmail && (
              <a
                href={`mailto:${d.contactEmail}?subject=${encodeURIComponent(`Enquiry: ${name}`)}`}
                className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-xs font-semibold tracking-wide text-brand-navy uppercase"
              >
                <Mail className="h-3.5 w-3.5" /> Email enquiry
              </a>
            )}
            <Button variant="outline" size="sm" onClick={downloadPdf} disabled={downloading}>
              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {downloading ? "Creating PDF…" : "Download PDF"}
            </Button>
          </div>
        </header>
        <main className="flex justify-center overflow-x-auto p-6">
          <ExpressFlyer d={d} />
        </main>
      </div>
      <div className="print-root hidden">
        <ExpressFlyer d={d} />
      </div>
    </>
  );
}
