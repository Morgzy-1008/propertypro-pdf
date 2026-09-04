import React, { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Logo } from "@/components/flyer/FlyerTemplates";
import {
  getTenderByIdAsync,
  saveTenderToIdb,
  getTenderFromSupabase,
  syncTenderToSupabase,
  decodeTenderFromRemoteLink,
  renderMultiPageDraftsmenVariationPdfBlob,
} from "@/lib/tender/tenderStorage";
import { supabase } from "@/integrations/supabase/client";
import type { TenderSubmission, TenderNumberedVariation } from "@/lib/tender/tenderTypes";
import {
  Compass,
  CheckCircle2,
  AlertTriangle,
  Send,
  Home,
  Layers,
  Download,
  Phone,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FloorplanMarkupViewer } from "@/components/tender/FloorplanMarkupViewer";

export const Route = createFileRoute("/tender-drafting/$id")({
  head: () => ({
    meta: [
      { title: "Draftsman Review & Working Drawings | Hudson Homes" },
      {
        name: "description",
        content: "Collaborative drafting directives, siting review, and RFI flag portal for Hudson Homes drafting team and Bernie.",
      },
    ],
  }),
  component: DraftsmanReviewPage,
});

function DraftsmanReviewPage() {
  const { id } = Route.useParams();
  const [tender, setTender] = useState<TenderSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"siting" | "plans" | "variations" | "submit">("variations");

  const [variationsState, setVariationsState] = useState<TenderNumberedVariation[]>([]);
  const [generalNotes, setGeneralNotes] = useState("");
  const [drafterName, setDrafterName] = useState("Bernie (OnSite Drafting)");
  const [overallStatus, setOverallStatus] = useState<"approved" | "rfi_raised">("approved");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    async function loadData() {
      let found: TenderSubmission | null = null;

      if (typeof window !== "undefined" && window.location.search) {
        try {
          const searchParams = new URLSearchParams(window.location.search);
          const dParam = searchParams.get("d") || searchParams.get("data");
          if (dParam) {
            const decoded = decodeTenderFromRemoteLink(dParam);
            if (decoded) found = decoded;
          }
        } catch (err) {
          console.warn("Could not decode query payload:", err);
        }
      }

      if (!found) {
        found = await getTenderByIdAsync(id);
      }

      if (!found) {
        found = await getTenderFromSupabase(id);
      }

      if (found) {
        setTender(found);
        setVariationsState(found.variations || []);
        setGeneralNotes(found.draftsmanGeneralNotes || "");
        if (found.draftsmanReviewStatus === "rfi_raised") {
          setOverallStatus("rfi_raised");
        } else if (found.draftsmanReviewStatus === "approved") {
          setOverallStatus("approved");
        }
      }
      setLoading(false);
    }
    loadData();
  }, [id]);

  const updateVariationRow = (varId: string, patch: Partial<TenderNumberedVariation>) => {
    setVariationsState((prev) =>
      prev.map((v) => (v.id === varId ? { ...v, ...patch } : v))
    );
  };

  const handleDownloadDraftsmanPdf = async () => {
    if (!tender) return;
    setDownloadingPdf(true);
    const toastId = toast.loading("Generating Interactive Form-Fillable PDF Package...");
    try {
      const mergedTender: TenderSubmission = {
        ...tender,
        variations: variationsState,
        draftsmanGeneralNotes: generalNotes,
        draftsmanReviewStatus: overallStatus,
        draftsmanReviewedAt: new Date().toLocaleDateString("en-AU"),
      };
      const blob = await renderMultiPageDraftsmenVariationPdfBlob(mergedTender);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const surname = (tender.customer1.surname || "Client").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
      a.download = `${surname} - Draftsmen Variations & Working Drawing Directives.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Draftsman Working Drawing Directives PDF downloaded!", { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error("Could not generate PDF", { id: toastId });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!tender) return;
    setSubmitting(true);
    const toastId = toast.loading("Submitting drafting review & notifying consultant...");
    try {
      const anyRfi = variationsState.some((v) => v.draftsmanStatus === "rfi") || overallStatus === "rfi_raised";
      const finalStatus: "approved" | "rfi_raised" = anyRfi ? "rfi_raised" : "approved";
      const today = new Date().toLocaleDateString("en-AU");

      const updatedTender: TenderSubmission = {
        ...tender,
        variations: variationsState,
        draftsmanGeneralNotes: generalNotes,
        draftsmanReviewStatus: finalStatus,
        draftsmanReviewedAt: today,
      };

      await saveTenderToIdb(updatedTender).catch(() => {});
      try {
        localStorage.setItem(`hudson_tender_${tender.id}`, JSON.stringify(updatedTender));
        localStorage.setItem(`hudson_tender_${tender.submissionNumber}`, JSON.stringify(updatedTender));
        localStorage.setItem("hudson_current_tender_draft", JSON.stringify(updatedTender));
      } catch {}

      await syncTenderToSupabase(updatedTender);

      const channel = supabase.channel(`tender_sync_${tender.submissionNumber}`);
      await channel.send({
        type: "broadcast",
        event: "draftsman_review_submitted",
        payload: {
          submissionNumber: tender.submissionNumber,
          reviewStatus: finalStatus,
          generalNotes,
          reviewedAt: today,
          drafterName,
        },
      });

      try {
        const bc = new BroadcastChannel("hudson_tender_sync");
        bc.postMessage({
          type: "DRAFTSMAN_REVIEW_SUBMITTED",
          tender: updatedTender,
        });
        bc.close();
      } catch {}

      setTender(updatedTender);
      setSubmitted(true);
      toast.success(
        finalStatus === "rfi_raised"
          ? "RFI Raised! Notification transmitted to consultant to amend."
          : "Drafting review approved! Notification transmitted to consultant.",
        { id: toastId }
      );
    } catch (err) {
      console.error(err);
      toast.error("Could not submit review", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm font-medium">Loading drafting directives package...</p>
      </div>
    );
  }

  if (!tender) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h2 className="text-xl font-bold">Drafting Directives Not Found</h2>
        <p className="text-slate-400 max-w-md text-sm">
          Could not locate tender reference "{id}". Please verify the URL link or contact the New Home Consultant.
        </p>
      </div>
    );
  }

  const sb = tender.homeSpec.setbacks || {
    frontBoundary: "6.0m",
    rearBoundary: "1.5m",
    leftBoundary: "1.0m",
    rightBoundary: "1.0m",
  };

  const rfiCount = variationsState.filter((v) => v.draftsmanStatus === "rfi").length;
  const approvedCount = variationsState.filter((v) => v.draftsmanStatus === "approved").length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Logo size={8} />
            <div className="border-l border-slate-700 pl-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                Draftsman Directives & RFI Portal
              </span>
              <h1 className="text-base font-black text-white tracking-tight">
                {tender.homeSpec.homeDesign} — {tender.customer1.surname || "Client"} Residence
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadDraftsmanPdf}
              disabled={downloadingPdf}
              className="border-slate-700 bg-slate-800 text-xs text-slate-200 hover:bg-slate-700 gap-1.5"
            >
              <Download className="h-3.5 w-3.5 text-cyan-400" />
              Download Form-Fillable PDF
            </Button>
            <Button
              size="sm"
              onClick={() => setActiveTab("submit")}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5 shadow-md shadow-amber-500/20"
            >
              <Send className="h-3.5 w-3.5" />
              Submit Review ({variationsState.length} Items)
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Project Meta Hero Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Job Reference</span>
            <span className="font-mono font-bold text-cyan-400 text-base">{tender.submissionNumber}</span>
            <span className="text-xs text-slate-400 block mt-0.5">Tender Date: {tender.tenderRequestDate || "Active"}</span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Site Location</span>
            <span className="font-semibold text-slate-100 text-sm block">
              Lot {tender.land.lotNo || "TBA"}, {tender.land.streetName || "Street"}
            </span>
            <span className="text-xs text-slate-400 block">
              {tender.land.suburb || "QLD"} · Council: {tender.land.council || "Standard"}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Design & Facade</span>
            <span className="font-semibold text-slate-100 text-sm block">
              {tender.homeSpec.homeDesign} ({tender.homeSpec.facade})
            </span>
            <span className="text-xs text-amber-400/90 block">
              Tier: {tender.homeSpec.inclusionsType} · Garage: {tender.homeSpec.garageLocation || "RHS"}
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assigned Consultant</span>
            <span className="font-bold text-slate-100 text-sm block">{tender.newHomeConsultant || "Morgan Hales"}</span>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
              {tender.atp.consultantPhone && (
                <a href={`tel:${tender.atp.consultantPhone}`} className="hover:text-cyan-400 flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {tender.atp.consultantPhone}
                </a>
              )}
              {tender.atp.consultantEmail && (
                <a href={`mailto:${tender.atp.consultantEmail}`} className="hover:text-cyan-400 flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Button
            size="sm"
            variant={activeTab === "variations" ? "default" : "ghost"}
            onClick={() => setActiveTab("variations")}
            className={
              activeTab === "variations"
                ? "bg-amber-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-white"
            }
          >
            <Layers className="h-3.5 w-3.5 mr-1.5" />
            1. Numbered Variations Schedule ({variationsState.length})
            {rfiCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 text-[10px] bg-rose-600 text-white rounded-full font-black">
                {rfiCount} RFI
              </span>
            )}
          </Button>

          <Button
            size="sm"
            variant={activeTab === "plans" ? "default" : "ghost"}
            onClick={() => setActiveTab("plans")}
            className={
              activeTab === "plans"
                ? "bg-amber-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-white"
            }
          >
            <Home className="h-3.5 w-3.5 mr-1.5" />
            2. Floorplan & Markups ({tender.homeSpec.floorplanPins?.length || 0} Pins)
          </Button>

          <Button
            size="sm"
            variant={activeTab === "siting" ? "default" : "ghost"}
            onClick={() => setActiveTab("siting")}
            className={
              activeTab === "siting"
                ? "bg-amber-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-white"
            }
          >
            <Compass className="h-3.5 w-3.5 mr-1.5" />
            3. Siting & Setbacks
          </Button>

          <Button
            size="sm"
            variant={activeTab === "submit" ? "default" : "ghost"}
            onClick={() => setActiveTab("submit")}
            className={
              activeTab === "submit"
                ? "bg-amber-500 text-slate-950 font-bold"
                : "text-slate-400 hover:text-white"
            }
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            4. Review Sign-off & Submit
          </Button>
        </div>

        {/* TAB 1: VARIATIONS SCHEDULE */}
        {activeTab === "variations" && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Itemised Working Drawing Directives & Approvals
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Review each numbered variation directive. Mark as Approved or flag an RFI if clarification or amendment is required.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {approvedCount} Approved
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {rfiCount} RFI Raised
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {variationsState.map((v, idx) => {
                const isRfi = v.draftsmanStatus === "rfi";
                const isApproved = v.draftsmanStatus === "approved";

                return (
                  <div
                    key={v.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isRfi
                        ? "bg-rose-950/20 border-rose-500/50 shadow-md shadow-rose-950/20"
                        : isApproved
                        ? "bg-emerald-950/20 border-emerald-500/40"
                        : "bg-slate-900/60 border-slate-800"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs flex-none ${
                            v.isStructural
                              ? "bg-amber-500 text-slate-950 shadow-sm"
                              : "bg-cyan-600 text-white"
                          }`}
                        >
                          {v.itemNumber || idx + 1}
                        </div>

                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                                v.isStructural
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                              }`}
                            >
                              {v.isStructural ? "Structural Modification" : "Inclusion / Allowance"}
                            </span>
                            {v.category && (
                              <span className="text-[10px] text-slate-400 uppercase font-mono">{v.category}</span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-slate-100 leading-snug">{v.description}</p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-none">
                        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                          <button
                            type="button"
                            onClick={() => updateVariationRow(v.id, { draftsmanStatus: "approved" })}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
                              isApproved
                                ? "bg-emerald-500 text-slate-950 shadow-sm"
                                : "text-slate-400 hover:text-emerald-300"
                            }`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => updateVariationRow(v.id, { draftsmanStatus: "rfi" })}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
                              isRfi
                                ? "bg-rose-600 text-white shadow-sm"
                                : "text-slate-400 hover:text-rose-300"
                            }`}
                          >
                            <AlertTriangle className="h-3.5 w-3.5" /> RFI / Issue
                          </button>
                        </div>

                        <div className="w-28">
                          <Input
                            placeholder="Sht: WD-01"
                            value={v.draftsmanSheetRef || ""}
                            onChange={(e) => updateVariationRow(v.id, { draftsmanSheetRef: e.target.value })}
                            className="h-8 text-xs bg-slate-950 border-slate-800 font-mono text-cyan-300"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-800/80">
                      <Label className="text-[11px] text-slate-400 flex items-center gap-1">
                        Draftsman Notes / Query for Consultant:
                        {isRfi && <span className="text-rose-400 font-bold">* Explain issue for consultant</span>}
                      </Label>
                      <Input
                        placeholder={
                          isRfi
                            ? "Explain why this variation is not possible or requires consultant action..."
                            : "Optional drafting remark or structural specification detail..."
                        }
                        value={v.draftsmanNotes || ""}
                        onChange={(e) => updateVariationRow(v.id, { draftsmanNotes: e.target.value })}
                        className={`mt-1 text-xs bg-slate-950 ${
                          isRfi
                            ? "border-rose-500/60 focus:border-rose-400 text-rose-200"
                            : "border-slate-800 text-slate-200"
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: PLANS & MARKUPS */}
        {activeTab === "plans" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Architectural Floorplan Markup & Pin Locations
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Review the numbered pins placed by the consultant to locate structural modifications on the plan.
              </p>
            </div>

            {tender.homeSpec.floorplanUrl ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
                <FloorplanMarkupViewer
                  floorplanUrl={tender.homeSpec.floorplanUrl}
                  pins={tender.homeSpec.floorplanPins || []}
                  selectedPinId={null}
                  onPinSelect={() => {}}
                  readOnly={true}
                  designName={tender.homeSpec.homeDesign}
                />
              </div>
            ) : (
              <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500">
                No floorplan preview image available for this tender.
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SITING & SETBACKS */}
        {activeTab === "siting" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Boundary Setbacks & Siting Clearances
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Front Setback</span>
                  <span className="text-lg font-mono font-bold text-amber-400">{sb.frontBoundary}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Min council clearance</span>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Rear Setback</span>
                  <span className="text-lg font-mono font-bold text-amber-400">{sb.rearBoundary}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Min structure clearance</span>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Left & Right Setbacks</span>
                  <span className="text-lg font-mono font-bold text-cyan-400">
                    {sb.leftBoundary} / {sb.rightBoundary}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Side boundaries</span>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Garage Crossover</span>
                  <span className="text-lg font-mono font-bold text-emerald-400">
                    {tender.homeSpec.garageLocation || "RHS"}
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Orientation to street</span>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-200 block">Land Registration Status:</span>
                  <span className="text-xs text-slate-400">
                    {tender.land.registeredDate?.trim()
                      ? `Unregistered — Expected Date: ${tender.land.registeredDate}`
                      : "Already Registered Land"}
                  </span>
                </div>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full ${
                    tender.land.registeredDate?.trim()
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  }`}
                >
                  {tender.land.registeredDate?.trim() ? "Un-registered" : "Already Registered"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: REVIEW SIGN-OFF & SUBMIT */}
        {activeTab === "submit" && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  Drafting Team Review & Consultant Notification
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Once submitted, the New Home Consultant will receive an instant notification in their portal. If any RFIs are flagged, the consultant will be requested to review and resubmit.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-300">Overall Drafting Status</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOverallStatus("approved")}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      overallStatus === "approved"
                        ? "bg-emerald-950/40 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-950/30"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      Approved for Working Drawings
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      All variations are feasible and ready to be drafted into Rev A plans.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOverallStatus("rfi_raised")}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      overallStatus === "rfi_raised"
                        ? "bg-rose-950/40 border-rose-500 text-rose-300 shadow-md shadow-rose-950/30"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <AlertTriangle className="h-4 w-4 text-rose-400" />
                      RFI Raised (Action Required by Consultant)
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      One or more items require amendment, clarification, or structural modification by the NHC.
                    </p>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-300">
                  General Drafting Remarks / Notes for Consultant
                </Label>
                <Textarea
                  rows={4}
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="Enter any overall structural notes, slab requirements, or explanation of RFIs..."
                  className="bg-slate-950 border-slate-800 text-slate-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Lead Draftsman / Reviewer Name</Label>
                  <Input
                    value={drafterName}
                    onChange={(e) => setDrafterName(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Target Consultant</Label>
                  <Input
                    value={`${tender.newHomeConsultant || "Morgan Hales"} (${tender.atp.consultantEmail || "Consultant"})`}
                    disabled
                    className="bg-slate-950 border-slate-800 text-xs text-slate-400"
                  />
                </div>
              </div>

              {submitted && (
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-none" />
                  <div>
                    <strong className="font-bold block">Review Transmitted Successfully!</strong>
                    <span>
                      The assigned New Home Consultant ({tender.newHomeConsultant || "Consultant"}) has been updated with your review status and notes.
                    </span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownloadDraftsmanPdf}
                  disabled={downloadingPdf}
                  className="border-slate-700 bg-slate-800 text-xs text-slate-200 hover:bg-slate-700 gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Form-Fillable PDF
                </Button>

                <Button
                  type="button"
                  onClick={handleSubmitReview}
                  disabled={submitting}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs gap-1.5 px-6 py-2.5 shadow-lg shadow-amber-500/20"
                >
                  <Send className="h-3.5 w-3.5" />
                  {submitting ? "Transmitting..." : "Submit Review & Notify Consultant"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
