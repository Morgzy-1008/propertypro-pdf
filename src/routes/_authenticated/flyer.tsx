import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Download, FileText, BookOpen, Database, Save, Home } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
const logoUrl = "/hudson-homes-logo.png";
import { FlyerForm } from "@/components/flyer/FlyerForm";
import {
  ExpressFlyer,
  HouseOnlyFlyer,
  ShowcaseCover,
  ShowcaseDetails,
  HudsonMark,
} from "@/components/flyer/FlyerTemplates";
import { defaultFlyer, type FlyerData, type TemplateId } from "@/components/flyer/types";
import { useFitScale } from "@/components/flyer/useFitScale";
import { parseAud } from "@/lib/pricing";
import { downloadA4Pdf, buildFlyerPdfFilename } from "@/lib/downloadPdf";

export const Route = createFileRoute("/_authenticated/flyer")({
  head: () => ({
    meta: [
      { title: "Hudson Homes | House & Land Package Flyer Builder" },
      {
        name: "description",
        content:
          "Create print-ready A4 House & Land package flyers for Hudson Homes in seconds — live preview, brand templates and one-click PDF export.",
      },
      { property: "og:title", content: "Hudson Homes | House & Land Package Flyer Builder" },
      {
        property: "og:description",
        content:
          "Create print-ready A4 House & Land package flyers for Hudson Homes in seconds — live preview, brand templates and one-click PDF export.",
      },
    ],
  }),
  component: Index,
});

const A4_WIDTH_PX = 794; // 210mm @ 96dpi

function Index() {
  const [data, setData] = useState<FlyerData>(defaultFlyer);
  const [template, setTemplate] = useState<TemplateId>("express");
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { ref, scale } = useFitScale(A4_WIDTH_PX);
  const navigate = useNavigate();

  const set = useCallback(
    <K extends keyof FlyerData>(key: K, value: FlyerData[K]) =>
      setData((prev) => ({ ...prev, [key]: value })),
    [],
  );

  /** Pick up a lot or saved package handed over from the database page. */
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("hudson-flyer-handoff");
      if (!raw) return;
      window.sessionStorage.removeItem("hudson-flyer-handoff");
      const patch = JSON.parse(raw) as Partial<FlyerData>;
      setData((prev) => ({ ...prev, ...patch }));
      toast.success("Package details loaded from the database");
    } catch {
      /* ignore malformed handoff */
    }
  }, []);

  const saveToDatabase = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      navigate({ to: "/auth" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("packages").insert({
      lot_id: data.lotId || null,
      name: `${data.designName || data.floorplanName} · ${data.estate}`,
      housing_type: data.housingType,
      design: data.designName || data.floorplanName,
      range_id: data.range,
      facade_id: data.facadeId || null,
      facade_name: data.facadeName || null,
      facade_url: data.facadeUrl || null,
      house_price: parseAud(data.housePrice) || null,
      land_price: parseAud(data.landPrice) || null,
      total_price: parseAud(data.price) || null,
      beds: data.beds,
      baths: data.baths,
      cars: data.cars,
      floorplan_size: data.floorplanSize,
      flyer_data: JSON.parse(JSON.stringify(data)),
      created_by: auth.user.id,
      updated_by: auth.user.id,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Package saved to the QLD database");
  };

  const pages =
    template === "express" ? (
      <ExpressFlyer d={data} />
    ) : template === "house-only" ? (
      <HouseOnlyFlyer d={data} />
    ) : (
      <>
        <ShowcaseCover d={data} />
        <ShowcaseDetails d={data} />
      </>
    );

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      await document.fonts.ready;
      await downloadA4Pdf(document.querySelector(".print-root") ?? document, buildFlyerPdfFilename(data));
    } catch {
      toast.error("Could not create the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-muted/40 print:hidden">
        <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-6 py-2">
            <Link to="/hub" className="flex items-center gap-3 hover:opacity-85 transition-opacity">
              <HudsonMark size={7} />
              <div className="leading-tight">
                <h1 className="text-sm font-bold tracking-[0.16em] text-brand-navy uppercase">
                  Hudson Homes
                </h1>
                <p className="text-xs text-muted-foreground">House &amp; Land Flyer Builder</p>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <Link to="/hub">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                  Hub
                </Button>
              </Link>
              <div className="flex rounded-md border bg-background p-1">
                <button
                  onClick={() => setTemplate("express")}
                  className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                    template === "express"
                      ? "bg-brand-navy text-brand-cream"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  1-Page Express
                </button>
                <button
                  onClick={() => setTemplate("showcase")}
                  className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                    template === "showcase"
                      ? "bg-brand-navy text-brand-cream"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  2-Page Showcase
                </button>
                <button
                  onClick={() => setTemplate("house-only")}
                  className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                    template === "house-only"
                      ? "bg-brand-navy text-brand-cream"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Home className="h-3.5 w-3.5" />
                  House Only
                </button>
              </div>

              <Link to="/database">
                <Button variant="outline" size="sm">
                  <Database className="h-4 w-4" />
                  Package database
                </Button>
              </Link>

              <Button variant="outline" size="sm" disabled={saving} onClick={saveToDatabase}>
                <Save className="h-4 w-4" />
                Save package
              </Button>

              <Button
                onClick={downloadPdf}
                disabled={downloading}
                className="bg-brand-gold-deep text-brand-navy-deep hover:bg-brand-gold"
              >
                <Download className="h-4 w-4" />
                {downloading ? "Creating PDF…" : "Download Print-Ready PDF"}
              </Button>
            </div>
          </div>
        </header>

        <main className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[360px_1fr]">
          <aside className="h-fit rounded-lg border bg-background p-5 lg:sticky lg:top-[76px] lg:max-h-[calc(100vh-100px)] lg:overflow-y-auto">
            <FlyerForm data={data} set={set} />
          </aside>

          <section ref={ref} className="min-w-0">
            <div
              className="flex flex-col items-start gap-6"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                height: (template === "showcase" ? 1123 * 2 + 24 : 1123) * scale,
              }}
            >
              <div className="flyer-preview-container flex flex-col gap-6 [&>.flyer-page]:shadow-[var(--shadow-page)]">
                {pages}
              </div>
            </div>
          </section>
        </main>
      </div>

      <div className="print-root hidden">{pages}</div>
    </>
  );
}
