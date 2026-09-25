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
import { findConsultant, findConsultantByEmail, type Consultant } from "@/components/flyer/consultants";
import { getActiveStaffUser, onStaffUserChanged, type StaffProfile } from "@/lib/authSession";
import { toValidUuid, isValidUuid, generateUuid } from "@/lib/uuid";
import { getLocalLots, upsertLocalPackage, type Pkg } from "@/lib/databaseStorage";
import { ensureStaffSupabaseAuth, syncPackageToSupabase, syncLotToSupabase } from "@/lib/supabaseSync";

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
  const [template, setTemplate] = useState<TemplateId>(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const t = sp.get("template") as TemplateId;
      if (t && ["express", "siting", "showcase", "house_only"].includes(t)) {
        return t;
      }
    }
    return "express";
  });
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

  /** Automate consultant details based on whichever NHC is signed in */
  useEffect(() => {
    const applyStaffConsultant = (staff: StaffProfile) => {
      if (!staff) return;
      const consultant = findConsultant(staff.id) || findConsultantByEmail(staff.email);
      const name = consultant?.name || staff.name;
      const phone = consultant?.phone || staff.phone;
      const email = consultant?.email || staff.email;
      const displayCentre = consultant?.displayCentre || staff.displayCentre || "Hudson Homes";
      const id = consultant?.id || staff.id || "nhc-staff";

      setData((prev) => ({
        ...prev,
        consultantId: id,
        contactName: name,
        contactPhone: phone,
        contactEmail: email,
        contactOffice: displayCentre,
      }));
    };

    const initialStaff = getActiveStaffUser();
    if (initialStaff) {
      applyStaffConsultant(initialStaff);
    }

    const unsub = onStaffUserChanged((newStaff) => {
      if (newStaff) applyStaffConsultant(newStaff);
    });

    return () => unsub();
  }, []);

  /** Pick up a lot or saved package handed over from the database page. */
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("hudson-flyer-handoff");
      if (!raw) return;
      window.sessionStorage.removeItem("hudson-flyer-handoff");
      const patch = JSON.parse(raw) as Partial<FlyerData>;
      
      const activeStaff = getActiveStaffUser();
      const staffConsultant = activeStaff ? (findConsultant(activeStaff.id) || findConsultantByEmail(activeStaff.email)) : null;

      setData((prev) => {
        // If the handoff package already explicitly has custom consultant details, preserve them;
        // otherwise automate with the signed-in NHC's details:
        const hasExplicitConsultant = !!patch.contactName && patch.contactName !== "Morgan Hales";
        const fallback = staffConsultant || activeStaff;

        return {
          ...prev,
          ...patch,
          ...(!hasExplicitConsultant && fallback ? {
            consultantId: fallback.id,
            contactName: fallback.name,
            contactPhone: fallback.phone,
            contactEmail: fallback.email,
            contactOffice: (fallback as any).displayCentre || prev.contactOffice,
          } : {}),
        };
      });
      toast.success("Package details loaded from the database");
    } catch {
      /* ignore malformed handoff */
    }
  }, []);

  const saveToDatabase = async () => {
    const activeStaff = getActiveStaffUser();
    const { data: auth } = await supabase.auth.getUser();

    if (!auth.user && !activeStaff) {
      navigate({ to: "/auth" });
      return;
    }
    setSaving(true);
    await ensureStaffSupabaseAuth();

    // Respect whichever consultant is currently selected/active in `data`.
    // We NEVER overwrite with Jesse or any arbitrary service account!
    const finalData: FlyerData = {
      ...data,
      contactName: data.contactName || activeStaff?.name || "Steve Slisar",
      contactPhone: data.contactPhone || activeStaff?.phone || "0483 950 830",
      contactEmail: data.contactEmail || activeStaff?.email || "steve.slisar@hudsonhomes.com.au",
      contactOffice: data.contactOffice || activeStaff?.displayCentre || "HomeWorld Warnervale Display",
      consultantId: data.consultantId || activeStaff?.id || "steve-slisar",
    };

    const candidateLotId = toValidUuid(finalData.lotId);

    // Pre-verify or pre-sync lot into Supabase to fulfill foreign key constraints
    let targetLotId: string | null = null;
    if (candidateLotId) {
      try {
        const { data: existingLot } = await supabase
          .from("land_lots")
          .select("id")
          .eq("id", candidateLotId)
          .maybeSingle();

        if (existingLot?.id) {
          targetLotId = existingLot.id;
        } else {
          // Pre-sync lot from localStorage if available
          const localLots = getLocalLots();
          const matchedLot = localLots.find(
            (l) => l.id === candidateLotId || (finalData.lotId && l.id === finalData.lotId),
          );
          if (matchedLot) {
            const lotSynced = await syncLotToSupabase(matchedLot);
            if (lotSynced) {
              targetLotId = matchedLot.id;
            }
          }
        }
      } catch (e) {
        console.warn("[flyer] Supabase lot check error:", e);
      }
    }

    const finalPkgId = (finalData.packageId && isValidUuid(finalData.packageId)) ? finalData.packageId : generateUuid();
    const localPkg: Pkg = {
      id: finalPkgId,
      lot_id: targetLotId || candidateLotId,
      name: `${finalData.designName || finalData.floorplanName} · ${finalData.estate}`,
      housing_type: finalData.housingType,
      design: finalData.designName || finalData.floorplanName,
      range_id: finalData.range,
      facade_name: finalData.facadeName || null,
      house_price: parseAud(finalData.housePrice) || null,
      land_price: parseAud(finalData.landPrice) || null,
      total_price: parseAud(finalData.price) || null,
      beds: finalData.beds,
      baths: finalData.baths,
      cars: finalData.cars,
      floorplan_size: finalData.floorplanSize,
      state: (finalData.state as "QLD" | "NSW") || "QLD",
      status: "live",
      exclusive_consultants: null,
      flyer_json: JSON.parse(JSON.stringify(finalData)),
      needs_review: false,
      updated_at: new Date().toISOString(),
    };
    upsertLocalPackage(localPkg);

    // Sync directly to Supabase cloud and broadcast to all staff in real-time
    try {
      await syncPackageToSupabase(localPkg);
    } catch (err) {
      console.warn("[flyer] Cloud package sync notice:", err);
    }

    setData((prev) => ({
      ...prev,
      packageId: finalPkgId,
      id: finalPkgId,
      lotId: targetLotId || candidateLotId || prev.lotId,
    }));

    setSaving(false);
    toast.success("Package saved to the database");
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
      // Download the flyer with the exact consultant details shown on screen (Steve Slisar or selected consultant)
      await downloadA4Pdf(document.querySelector(".print-root") ?? document, buildFlyerPdfFilename(data));
      toast.success("PDF downloaded successfully");
    } catch {
      toast.error("Could not create the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <div className={`h-screen ${mode === "normal" ? "bg-slate-100 text-slate-900" : "bg-slate-950 text-slate-100"} print:hidden relative overflow-hidden flex flex-col font-sans selection:bg-brand-gold/30`}>
        {/* Ambient Gradient Lights */}
        <div className="ambient-glow-gold h-96 w-96 -top-20 right-10" />
        <div className="ambient-glow-cyan h-96 w-96 top-96 -left-20" />

        <header className="flex-shrink-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 shadow-lg">
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5 overflow-x-auto no-scrollbar">
            <Link to="/hub" className="flex items-center gap-3 hover:opacity-90 transition-opacity flex-shrink-0">
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

            <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
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

        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative z-10 min-h-0">
          {/* Continuous LHS Toolbar - carries down the entire page height */}
          <aside className={`w-full lg:w-[420px] xl:w-[450px] flex-shrink-0 h-full overflow-y-auto border-r ${mode === "normal" ? "border-slate-200 bg-white" : "border-slate-800/80 bg-slate-900/90"} backdrop-blur-xl p-5 shadow-2xl text-slate-200 custom-scrollbar overscroll-contain`}>
            <FlyerForm data={data} set={set} template={template} />
          </aside>

          {/* Flyer Preview Viewport - scrolls smoothly without displacing LHS bar */}
          <section ref={ref} className="flex-1 h-full overflow-y-auto overflow-x-hidden p-6 lg:p-8 flex justify-center custom-scrollbar">
            <div
              className="flex flex-col items-center gap-6 pb-16"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "top center",
                height: ((template === "showcase" || template === "siting") ? 1123 * 2 + 24 : 1123) * scale,
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
