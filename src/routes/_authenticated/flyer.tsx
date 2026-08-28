import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Download, FileText, BookOpen, Database, Save, Home, Layers } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useTheme } from "@/lib/theme";
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
import { SitingPlanPage } from "@/components/flyer/SitingPlanPage";
import { defaultFlyer, type FlyerData, type TemplateId } from "@/components/flyer/types";
import { useFitScale } from "@/components/flyer/useFitScale";
import { parseAud } from "@/lib/pricing";
import { downloadA4Pdf, buildFlyerPdfFilename } from "@/lib/downloadPdf";
import { findConsultantByEmail, type Consultant } from "@/components/flyer/consultants";

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
  const { mode } = useTheme();
  const navigate = useNavigate();

  const set = useCallback(
    <K extends keyof FlyerData>(key: K, value: FlyerData[K]) =>
      setData((prev) => ({ ...prev, [key]: value })),
    [],
  );

  /** Check if the signed-in user is one of the 3 consultants */
  useEffect(() => {
    supabase.auth.getUser().then(({ data: auth }) => {
      if (auth.user?.email) {
        const consultant = findConsultantByEmail(auth.user.email);
        if (consultant) {
          setData((prev) => ({
            ...prev,
            consultantId: consultant.id,
            contactName: consultant.name,
            contactPhone: consultant.phone,
            contactEmail: consultant.email,
            contactOffice: consultant.displayCentre,
          }));
        }
      }
    });
  }, []);

  /** Pick up a lot or saved package handed over from the database page. */
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("hudson-flyer-handoff");
      if (!raw) return;
      window.sessionStorage.removeItem("hudson-flyer-handoff");
      const patch = JSON.parse(raw) as Partial<FlyerData>;
      
      supabase.auth.getUser().then(({ data: auth }) => {
        const consultant = auth.user?.email ? findConsultantByEmail(auth.user.email) : null;
        if (consultant) {
          // If signed in as one of the 3 consultants, apply their details over the package
          setData((prev) => ({
            ...prev,
            ...patch,
            consultantId: consultant.id,
            contactName: consultant.name,
            contactPhone: consultant.phone,
            contactEmail: consultant.email,
            contactOffice: consultant.displayCentre,
          }));
        } else {
          // Keep original saved package details for non-consultant users
          setData((prev) => ({ ...prev, ...patch }));
        }
      });
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

    // If the signed-in user is one of the 3 consultants, make sure their details are on the saved package
    const consultant = auth.user.email ? findConsultantByEmail(auth.user.email) : null;
    const finalData: FlyerData = consultant
      ? {
          ...data,
          consultantId: consultant.id,
          contactName: consultant.name,
          contactPhone: consultant.phone,
          contactEmail: consultant.email,
          contactOffice: consultant.displayCentre,
        }
      : data;

    const { data: savedPkg, error } = await supabase
      .from("packages")
      .insert({
        lot_id: finalData.lotId || null,
        name: `${finalData.designName || finalData.floorplanName} · ${finalData.estate}`,
        housing_type: finalData.housingType,
        design: finalData.designName || finalData.floorplanName,
        range_id: finalData.range,
        status: "live",
        facade_id: finalData.facadeId || null,
        facade_name: finalData.facadeName || null,
        facade_url: finalData.facadeUrl || null,
        house_price: parseAud(finalData.housePrice) || null,
        land_price: parseAud(finalData.landPrice) || null,
        total_price: parseAud(finalData.price) || null,
        beds: finalData.beds,
        baths: finalData.baths,
        cars: finalData.cars,
        floorplan_size: finalData.floorplanSize,
        flyer_data: JSON.parse(JSON.stringify(finalData)),
        created_by: auth.user.id,
        updated_by: auth.user.id,
      })
      .select("id")
      .single();

    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      if (savedPkg?.id) {
        setData((prev) => ({ ...prev, packageId: savedPkg.id, id: savedPkg.id }));
      }
      toast.success("Package saved to the QLD database");
    }
  };

  const pages =
    template === "express" ? (
      <ExpressFlyer d={data} />
    ) : template === "house-only" ? (
      <HouseOnlyFlyer d={data} />
    ) : template === "siting" ? (
      <>
        <ExpressFlyer d={data} />
        <SitingPlanPage d={data} set={set} />
      </>
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
      const { data: auth } = await supabase.auth.getUser();
      const consultant = auth.user?.email ? findConsultantByEmail(auth.user.email) : null;
      const pdfData: FlyerData = consultant
        ? {
            ...data,
            consultantId: consultant.id,
            contactName: consultant.name,
            contactPhone: consultant.phone,
            contactEmail: consultant.email,
            contactOffice: consultant.displayCentre,
          }
        : data;

      if (consultant && data.consultantId !== consultant.id) {
        setData(pdfData);
        await new Promise((r) => setTimeout(r, 100));
      }

      await downloadA4Pdf(document.querySelector(".print-root") ?? document, buildFlyerPdfFilename(pdfData));
    } catch {
      toast.error("Could not create the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <div className={`min-h-screen ${mode === "normal" ? "bg-slate-100 text-slate-900" : "bg-slate-950 text-slate-100"} print:hidden relative overflow-hidden flex flex-col font-sans selection:bg-brand-gold/30`}>
        {/* Ambient Gradient Lights */}
        <div className="ambient-glow-gold h-96 w-96 -top-20 right-10" />
        <div className="ambient-glow-cyan h-96 w-96 top-96 -left-20" />

        <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4 px-6 py-2.5">
            <Link to="/hub" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <HudsonMark className="h-8 w-auto text-brand-gold" />
              <div className="leading-tight border-l border-slate-800 pl-3">
                <h1 className="text-xs font-bold tracking-[0.14em] text-white uppercase">
                  Package Studio
                </h1>
                <p className="text-[10px] tracking-wider text-brand-gold font-medium uppercase">
                  Flyer Builder
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-2.5 sm:gap-3">
              <Link to="/hub">
                <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-900 border border-transparent hover:border-slate-800">
                  Hub
                </Button>
              </Link>

              <div className="flex rounded-lg border border-slate-800/90 bg-slate-900/90 p-1 backdrop-blur-md shadow-inner">
                <button
                  onClick={() => setTemplate("express")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    template === "express"
                      ? "bg-gradient-to-r from-amber-500/20 to-brand-gold/20 text-brand-gold border border-brand-gold/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  1-Page Express
                </button>
                <button
                  onClick={() => setTemplate("siting")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    template === "siting"
                      ? "bg-gradient-to-r from-amber-500/20 to-brand-gold/20 text-brand-gold border border-brand-gold/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  2-Page + Siting
                </button>
                <button
                  onClick={() => setTemplate("showcase")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    template === "showcase"
                      ? "bg-gradient-to-r from-amber-500/20 to-brand-gold/20 text-brand-gold border border-brand-gold/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  2-Page Showcase
                </button>
                <button
                  onClick={() => setTemplate("house-only")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    template === "house-only"
                      ? "bg-gradient-to-r from-amber-500/20 to-brand-gold/20 text-brand-gold border border-brand-gold/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Home className="h-3.5 w-3.5" />
                  House Only
                </button>
              </div>

              <ThemeToggle />

              <Link to="/database">
                <Button variant="outline" size="sm" className="border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white text-xs gap-1.5">
                  <Database className="h-3.5 w-3.5 text-cyan-400" />
                  Database
                </Button>
              </Link>

              <Button
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={saveToDatabase}
                className="border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white text-xs gap-1.5"
              >
                <Save className="h-3.5 w-3.5 text-amber-400" />
                {saving ? "Saving…" : "Save package"}
              </Button>

              <Button
                onClick={downloadPdf}
                disabled={downloading}
                className="bg-gradient-to-r from-amber-500 to-brand-gold text-slate-950 font-semibold hover:from-amber-400 hover:to-amber-300 shadow-md shadow-brand-gold/20 text-xs gap-1.5 transition-all"
              >
                <Download className="h-3.5 w-3.5" />
                {downloading ? "Creating PDF…" : "Download PDF"}
              </Button>
            </div>
          </div>
        </header>

        <main className="grid grid-cols-1 gap-8 p-6 lg:grid-cols-[380px_1fr] relative z-10 flex-1">
          <aside className="h-fit rounded-2xl border border-slate-800/80 bg-slate-900/80 backdrop-blur-xl p-5 shadow-2xl lg:sticky lg:top-[76px] lg:max-h-[calc(100vh-96px)] lg:overflow-y-auto text-slate-200">
            <FlyerForm data={data} set={set} template={template} />
          </aside>

          <section ref={ref} className="min-w-0 flex justify-center lg:justify-start">
            <div
              className="flex flex-col items-start gap-6"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                height: (template === "showcase" || template === "siting" ? 1123 * 2 + 24 : 1123) * scale,
              }}
            >
              <div className="flyer-preview-container flex flex-col gap-6 [&>.flyer-page]:shadow-[0_24px_60px_-18px_rgba(0,0,0,0.6)] [&>.flyer-page]:rounded-sm">
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
