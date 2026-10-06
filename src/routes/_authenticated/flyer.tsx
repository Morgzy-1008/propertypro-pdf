import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Download, FileText, BookOpen, Database, Save, Home, Layers, Compass } from "lucide-react";
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
  ExpressFlyerV2,
  HouseOnlyFlyerV2,
  resolveUpdatedFacadeRender,
} from "@/components/flyer/FlyerTemplates";
import { SitingPlanPage } from "@/components/flyer/SitingPlanPage";
import { SitingPlanV2 } from "@/components/flyer/SitingPlanV2";
import { defaultFlyer, type FlyerData, type TemplateId } from "@/components/flyer/types";
import { useFitScale } from "@/components/flyer/useFitScale";
import { parseAud, normalizeHousingType } from "@/lib/pricing";
import { downloadA4Pdf, buildFlyerPdfFilename } from "@/lib/downloadPdf";
import { findConsultant, findConsultantByEmail, type Consultant } from "@/components/flyer/consultants";
import { getActiveStaffUser, onStaffUserChanged, type StaffProfile } from "@/lib/authSession";
import { toValidUuid, isValidUuid, generateUuid } from "@/lib/uuid";
import { getLocalLots, upsertLocalPackage, type Pkg } from "@/lib/databaseStorage";
import { ensureStaffSupabaseAuth, syncPackageToSupabase, syncLotToSupabase } from "@/lib/supabaseSync";
import { StaffHeaderProfile } from "@/components/auth/StaffHeaderProfile";
import { plansForDesign } from "@/components/flyer/floorplans";
import { findFacadeForDesign, isNarrowDoubleStorey } from "@/lib/quoting/facadeLookup";

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
      if (t && ["express", "siting", "showcase", "house-only", "house_only", "house-only-v2", "siting-v2"].includes(t)) {
        return (t === "house_only" ? "house-only" : t) as TemplateId;
      }
    }
    return "express";
  });
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { ref, scale } = useFitScale(A4_WIDTH_PX);
  const { mode } = useTheme();
  const isLight = mode === "normal";
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
      if (patch.facadeUrl) {
        patch.facadeUrl = resolveUpdatedFacadeRender(patch.facadeUrl);
        patch.rawFacadeUrl = resolveUpdatedFacadeRender(patch.rawFacadeUrl || patch.facadeUrl);
      }

      if (patch.housingType) {
        patch.housingType = normalizeHousingType(patch.housingType);
      }

      if (patch.designName) {
        const cleanDesign = patch.designName.split(/\s+[·•\-–]\s+/)[0].trim() || patch.designName;
        patch.designName = cleanDesign;
        const plans = plansForDesign(cleanDesign);
        if (plans.length > 0) {
          const matchedPlan = plans.find(
            (pl) =>
              (patch.floorplanName && pl.label.toLowerCase() === patch.floorplanName.toLowerCase()) ||
              (patch.floorplanUrl && pl.url === patch.floorplanUrl) ||
              (patch.floorplanName && pl.label.toLowerCase().includes(patch.floorplanName.toLowerCase())) ||
              (patch.floorplanName && patch.floorplanName.toLowerCase().includes(pl.label.toLowerCase()))
          ) || plans[0];

          if (!patch.floorplanUrl) {
            patch.floorplanUrl = matchedPlan.url;
          }
          if (!patch.floorplanName || patch.floorplanName === "Floorplan") {
            patch.floorplanName = matchedPlan.label;
          }
          if (!patch.floorplanSize) {
            patch.floorplanSize = matchedPlan.size;
          }
        }
        if (!patch.facadeUrl) {
          const isDouble =
            patch.housingType === "double-storey" ||
            isNarrowDoubleStorey(cleanDesign);
          const resolvedFacade = findFacadeForDesign(
            patch.facadeName || "Classic",
            isDouble,
            patch.housingType || "single-storey",
            cleanDesign
          );
          if (resolvedFacade?.url) {
            patch.facadeUrl = resolveUpdatedFacadeRender(resolvedFacade.url);
            patch.rawFacadeUrl = resolvedFacade.originalUrl || resolvedFacade.url;
            patch.facadeName = resolvedFacade.name || patch.facadeName;
            patch.facadeId = resolvedFacade.id || patch.facadeId;
          }
        }
      }
      
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
    // We NEVER overwrite with any arbitrary service account!
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
    const cleanDesign = (finalData.designName || finalData.floorplanName || "").split(/\s+[·•\-–]\s+/)[0].trim();
    const localPkg: Pkg = {
      id: finalPkgId,
      lot_id: targetLotId || candidateLotId,
      name: `${cleanDesign || finalData.floorplanName} · ${finalData.estate}`,
      housing_type: normalizeHousingType(finalData.housingType),
      design: cleanDesign || finalData.floorplanName,
      range_id: finalData.range,
      facade_name: finalData.facadeName || null,
      facade_id: finalData.facadeId || null,
      facade_url: finalData.facadeUrl || null,
      floorplan_url: finalData.floorplanUrl || null,
      floorplan_name: finalData.floorplanName || null,
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
      flyer_data: JSON.parse(JSON.stringify(finalData)),
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
    ) : template === "house-only-v2" ? (
      <HouseOnlyFlyerV2 d={data} />
    ) : template === "siting" ? (
      <>
        <ExpressFlyer d={data} />
        <SitingPlanPage d={data} set={set} />
      </>
    ) : template === "siting-v2" ? (
      <>
        <ExpressFlyerV2 d={data} />
        <SitingPlanV2 d={data} set={set} />
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

        <header className={`flex-shrink-0 z-30 border-b backdrop-blur-xl sticky top-0 shadow-lg ${
          isLight ? "border-slate-200 bg-white/95" : "border-slate-800/80 bg-slate-950/80"
        }`}>
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-2.5 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-3 flex-shrink-0">
              <Link to="/hub" className="flex items-center gap-3 hover:opacity-90 transition-opacity flex-shrink-0">
                <HudsonMark className="h-8 w-auto text-brand-gold" />
                <div className={`leading-tight border-l pl-3 ${isLight ? "border-slate-200" : "border-slate-800"}`}>
                  <h1 className={`text-xs font-bold tracking-[0.14em] uppercase ${isLight ? "text-slate-900" : "text-white"}`}>
                    Package Studio
                  </h1>
                  <p className={`text-[10px] tracking-wider font-semibold uppercase ${isLight ? "text-amber-800" : "text-brand-gold"}`}>
                    Flyer Builder
                  </p>
                </div>
              </Link>
              <div className={`hidden sm:block border-l pl-2 ${isLight ? "border-slate-200" : "border-slate-800"}`}>
                <StaffHeaderProfile isLight={isLight} />
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
              <Link to="/hub">
                <Button variant="ghost" size="sm" className={`text-xs border ${
                  isLight
                    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-900 border-transparent hover:border-slate-800"
                }`}>
                  Hub
                </Button>
              </Link>

              <div className={`flex rounded-lg border p-1 backdrop-blur-md shadow-inner flex-wrap gap-0.5 ${
                isLight ? "border-slate-200 bg-slate-100" : "border-slate-800/90 bg-slate-900/90"
              }`}>
                <button
                  onClick={() => setTemplate("express")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    template === "express"
                      ? isLight
                        ? "bg-white text-amber-900 border border-amber-300 shadow-xs font-bold"
                        : "bg-gradient-to-r from-amber-500/20 to-brand-gold/20 text-brand-gold border border-brand-gold/40 shadow-sm"
                      : isLight
                      ? "text-slate-600 hover:text-slate-900 hover:bg-white/60"
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
                      ? isLight
                        ? "bg-white text-amber-900 border border-amber-300 shadow-xs font-bold"
                        : "bg-gradient-to-r from-amber-500/20 to-brand-gold/20 text-brand-gold border border-brand-gold/40 shadow-sm"
                      : isLight
                      ? "text-slate-600 hover:text-slate-900 hover:bg-white/60"
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
                      ? isLight
                        ? "bg-white text-amber-900 border border-amber-300 shadow-xs font-bold"
                        : "bg-gradient-to-r from-amber-500/20 to-brand-gold/20 text-brand-gold border border-brand-gold/40 shadow-sm"
                      : isLight
                      ? "text-slate-600 hover:text-slate-900 hover:bg-white/60"
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
                      ? isLight
                        ? "bg-white text-amber-900 border border-amber-300 shadow-xs font-bold"
                        : "bg-gradient-to-r from-amber-500/20 to-brand-gold/20 text-brand-gold border border-brand-gold/40 shadow-sm"
                      : isLight
                      ? "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Home className="h-3.5 w-3.5" />
                  House Only
                </button>
                <button
                  onClick={() => setTemplate("house-only-v2")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    template === "house-only-v2"
                      ? isLight
                        ? "bg-white text-amber-900 border border-amber-300 shadow-xs font-bold"
                        : "bg-gradient-to-r from-amber-500/20 to-brand-gold/20 text-brand-gold border border-brand-gold/40 shadow-sm"
                      : isLight
                      ? "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Home className="h-3.5 w-3.5" />
                  House Only V2
                </button>
                <button
                  onClick={() => setTemplate("siting-v2")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    template === "siting-v2"
                      ? isLight
                        ? "bg-white text-amber-900 border border-amber-300 shadow-xs font-bold"
                        : "bg-gradient-to-r from-amber-500/20 to-brand-gold/20 text-brand-gold border border-brand-gold/40 shadow-sm"
                      : isLight
                      ? "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  House + Site Plan V2
                </button>
              </div>

              <ThemeToggle />

              <Link to="/database">
                <Button variant="outline" size="sm" className={`text-xs gap-1.5 ${
                  isLight
                    ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
                    : "border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}>
                  <Database className={`h-3.5 w-3.5 ${isLight ? "text-cyan-600" : "text-cyan-400"}`} />
                  Database
                </Button>
              </Link>

              <Link to="/land-scout">
                <Button variant="outline" size="sm" className={`text-xs gap-1.5 ${
                  isLight
                    ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                    : "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 hover:text-white"
                }`}>
                  <Compass className={`h-3.5 w-3.5 ${isLight ? "text-amber-600" : "text-amber-400"}`} />
                  Land Scout
                </Button>
              </Link>

              <Button
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={saveToDatabase}
                className={`text-xs gap-1.5 ${
                  isLight
                    ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
                    : "border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Save className={`h-3.5 w-3.5 ${isLight ? "text-amber-600" : "text-amber-400"}`} />
                {saving ? "Saving…" : "Save package"}
              </Button>

              <Button
                onClick={downloadPdf}
                disabled={downloading}
                className={`font-semibold shadow-md text-xs gap-1.5 transition-all ${
                  isLight
                    ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20"
                    : "bg-gradient-to-r from-amber-500 to-brand-gold text-slate-950 hover:from-amber-400 hover:to-amber-300 shadow-brand-gold/20"
                }`}
              >
                <Download className="h-3.5 w-3.5" />
                {downloading ? "Creating PDF…" : "Download PDF"}
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative z-10 min-h-0">
          <aside className={`w-full lg:w-[420px] xl:w-[450px] flex-shrink-0 h-full overflow-y-auto border-r ${
            isLight
              ? "border-slate-200 bg-white text-slate-900"
              : "border-slate-800/80 bg-slate-900/90 text-slate-200"
          } backdrop-blur-xl p-5 shadow-2xl custom-scrollbar overscroll-contain`}>
            <FlyerForm data={data} set={set} template={template} />
          </aside>

          {/* Flyer Preview Viewport - scrolls smoothly without displacing LHS bar */}
          <section ref={ref} className="flex-1 h-full overflow-y-auto overflow-x-hidden p-6 lg:p-8 flex justify-center custom-scrollbar">
            <div
              className="flex flex-col items-center gap-6 pb-16"
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "top center",
                height: ((template === "showcase" || template === "siting" || template === "siting-v2") ? 1123 * 2 + 24 : 1123) * scale,
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
