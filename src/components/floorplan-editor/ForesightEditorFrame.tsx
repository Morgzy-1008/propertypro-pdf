import React, { useState } from "react";
import {
  ExternalLink,
  RefreshCw,
  Send,
  Layers,
  Sparkles,
  Maximize2,
  FileCheck,
  Upload,
  ArrowRight,
  Info,
  Sliders,
  CheckCircle2,
  FileText,
  MapPin,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { pdfDocumentToPagesAndText } from "@/lib/pdfPages";
import { detectFloorplanFromText, type DetectedFloorplan } from "@/lib/floorplan/floorplanDetector";
import { AdvancedSitingStudio } from "./AdvancedSitingStudio";

type StudioTab = "floorplan_editor" | "siting_studio";

export function ForesightEditorFrame() {
  const navigate = useNavigate();
  const [activeStudioTab, setActiveStudioTab] = useState<StudioTab>("floorplan_editor");
  const [iframeKey, setIframeKey] = useState(0);
  const [isExportQuoteOpen, setIsExportQuoteOpen] = useState(false);
  const [isExportTenderOpen, setIsExportTenderOpen] = useState(false);

  // Auto-Detected Floorplan from PDF / File
  const [detectedPlan, setDetectedPlan] = useState<DetectedFloorplan | null>(null);
  const [uploadedPlanFileName, setUploadedPlanFileName] = useState<string>("");
  const [uploadedPlanDataUrl, setUploadedPlanDataUrl] = useState<string>("");
  const [isScanningPdf, setIsScanningPdf] = useState(false);

  // Form states for bridge
  const [clientName, setClientName] = useState("Jordan Mitchell");
  const [designName, setDesignName] = useState("Amber 21 (Modified Concept)");
  const [modifiedLivingM2, setModifiedLivingM2] = useState("138.6");
  const [modifiedAlfrescoM2, setModifiedAlfrescoM2] = useState("18.9");
  const [notes, setNotes] = useState("Extended family living room by 1200mm and widened alfresco with structural slab stepdown.");

  const editorUrl = "https://concept-floor-plan-editor.web.app/";

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
    toast.info("Foresight Floorplan Editor refreshed.");
  };

  const handleOpenExternal = () => {
    window.open(editorUrl, "_blank", "noopener,noreferrer");
  };

  // Upload PDF / Image & Auto-Detect Floorplan Design
  const handleFileUpload = async (file: File) => {
    setIsScanningPdf(true);
    setUploadedPlanFileName(file.name);
    try {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const { pages, rawText } = await pdfDocumentToPagesAndText(file, 4);

      if (pages[0]) {
        setUploadedPlanDataUrl(pages[0]);
      }

      // Auto-detect matching Hudson Homes floorplan
      const match = detectFloorplanFromText(rawText, file.name);
      if (match) {
        setDetectedPlan(match);
        setDesignName(match.matchedDesignName);
        setModifiedLivingM2(String(match.roomAreas.livingM2));
        setModifiedAlfrescoM2(String(match.roomAreas.alfrescoM2));
        toast.success(`✨ Auto-detected: ${match.matchedDesignName} (${match.housingType}, ${match.totalM2} m²)!`);
      } else {
        toast.info("Floorplan loaded. You can select or customize the design name.");
      }
    } catch (e) {
      console.warn("Floorplan scanning error:", e);
      toast.error("Could not scan PDF file.");
    } finally {
      setIsScanningPdf(false);
    }
  };

  const handleSendToQuoting = () => {
    try {
      const living = parseFloat(modifiedLivingM2) || (detectedPlan?.roomAreas.livingM2 ?? 135);
      const alfresco = parseFloat(modifiedAlfrescoM2) || (detectedPlan?.roomAreas.alfrescoM2 ?? 16);
      const garage = detectedPlan?.roomAreas.garageM2 ?? 38.2;
      const porch = detectedPlan?.roomAreas.porchM2 ?? 12.5;
      const rawTotal = detectedPlan?.totalM2 || living + alfresco + garage + porch;
      const totalM2 = Math.round(rawTotal * 100) / 100;

      const bridgePayload = {
        clientName: clientName || "Valued Client",
        notes: notes,
        designName: designName || detectedPlan?.matchedDesignName || "Amber 21",
        housingType: detectedPlan?.housingType || "Single Storey",
        totalM2: totalM2,
        basePrice: detectedPlan?.basePriceH2 || 0,
        priceRow: detectedPlan?.priceRow,
        floorplanUrl: uploadedPlanDataUrl || detectedPlan?.floorplanUrl || "",
        roomAreas: {
          livingM2: living,
          garageM2: garage,
          alfrescoM2: alfresco,
          porchM2: porch,
          totalM2: totalM2,
        },
        isModifiedFloorplan: true,
      };

      // Set bridge storage keys for QuoteBuilder
      localStorage.setItem("hudson_imported_floorplan_bridge", JSON.stringify(bridgePayload));
      localStorage.setItem("hudson_draft_quote_from_concept", JSON.stringify(bridgePayload));

      toast.success(`Bridged ${bridgePayload.designName} to Quoting Engine!`);
      setIsExportQuoteOpen(false);
      navigate({ to: "/quote-builder" });
    } catch {
      toast.error("Failed to bridge concept plan to Quoting Engine.");
    }
  };

  const handleSendToTender = () => {
    try {
      const living = parseFloat(modifiedLivingM2) || (detectedPlan?.roomAreas.livingM2 ?? 135);
      const alfresco = parseFloat(modifiedAlfrescoM2) || (detectedPlan?.roomAreas.alfrescoM2 ?? 16);
      const garage = detectedPlan?.roomAreas.garageM2 ?? 38.2;
      const porch = detectedPlan?.roomAreas.porchM2 ?? 12.5;
      const rawTotal = detectedPlan?.totalM2 || living + alfresco + garage + porch;
      const totalM2 = Math.round(rawTotal * 100) / 100;

      const bridgePayload = {
        customer1: {
          firstName: clientName.split(" ")[0] || "Jordan",
          surname: clientName.split(" ").slice(1).join(" ") || "Mitchell",
        },
        homeSpec: {
          homeDesign: designName || detectedPlan?.matchedDesignName || "Amber 21",
          housingType: detectedPlan?.housingType || "Single Storey",
          isModifiedFloorplan: true,
          floorplanUrl: uploadedPlanDataUrl || detectedPlan?.floorplanUrl || "",
          modifiedDesignM2: totalM2,
          modifiedAreas: {
            livingM2: living,
            garageM2: garage,
            alfrescoM2: alfresco,
            porchM2: porch,
            totalM2: totalM2,
          },
        },
      };

      localStorage.setItem("hudson_imported_floorplan_tender_bridge", JSON.stringify(bridgePayload));

      // Also merge into existing tender draft if present
      const rawTender = localStorage.getItem("hudson_current_tender_draft");
      let currentTender = rawTender ? JSON.parse(rawTender) : {};
      currentTender = {
        ...currentTender,
        customer1: {
          ...currentTender.customer1,
          ...bridgePayload.customer1,
        },
        homeSpec: {
          ...currentTender.homeSpec,
          ...bridgePayload.homeSpec,
        },
      };
      localStorage.setItem("hudson_current_tender_draft", JSON.stringify(currentTender));

      toast.success(`Bridged ${bridgePayload.homeSpec.homeDesign} to Tender Request Portal!`);
      setIsExportTenderOpen(false);
      navigate({ to: "/tender-request" });
    } catch {
      toast.error("Failed to bridge concept plan to Tender Portal.");
    }
  };

  return (
    <div className="flex flex-col bg-slate-950 text-slate-100 font-sans min-h-[calc(100vh-4rem)] p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      {/* Top Main Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-cyan-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                Foresight Studio — Architectural Planning &amp; Siting
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-800/60">
                Connected Studio
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive architectural 2D concept floorplans, PDF design auto-detection, and 1:200 lot siting calculations.
            </p>
          </div>
        </div>

        {/* Tab Mode Buttons: Floorplan Editor vs 1:200 Siting Studio */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 gap-1">
            <Button
              type="button"
              size="sm"
              variant={activeStudioTab === "floorplan_editor" ? "default" : "ghost"}
              onClick={() => setActiveStudioTab("floorplan_editor")}
              className={activeStudioTab === "floorplan_editor" ? "bg-amber-500 text-slate-950 font-bold text-xs gap-1.5 shadow-sm" : "text-slate-400 hover:text-white text-xs gap-1.5"}
            >
              <Sliders className="h-3.5 w-3.5" />
              Concept Floorplan Editor
            </Button>

            <Button
              type="button"
              size="sm"
              variant={activeStudioTab === "siting_studio" ? "default" : "ghost"}
              onClick={() => setActiveStudioTab("siting_studio")}
              className={activeStudioTab === "siting_studio" ? "bg-cyan-600 text-white font-bold text-xs gap-1.5 shadow-sm" : "text-slate-400 hover:text-white text-xs gap-1.5"}
            >
              <Building className="h-3.5 w-3.5 text-cyan-300" />
              1:200 Siting Studio
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExportQuoteOpen(true)}
            className="border-emerald-500/40 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/50 hover:text-white text-xs font-bold gap-1.5"
          >
            <Layers className="h-3.5 w-3.5 text-emerald-400" />
            Send Plan to Quoting Tool
          </Button>

          <Button
            size="sm"
            onClick={() => setIsExportTenderOpen(true)}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs gap-1.5 shadow-md shadow-amber-500/20"
          >
            <Send className="h-3.5 w-3.5" />
            Send Plan to Tender Portal
          </Button>
        </div>
      </div>

      {/* PDF / Floorplan Upload & Instant Auto-Detection Banner */}
      <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <label className="cursor-pointer flex-none">
            <input
              type="file"
              accept=".pdf,image/*,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f);
              }}
              disabled={isScanningPdf}
              className="hidden"
            />
            <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-cyan-500/50 bg-cyan-950/60 hover:bg-cyan-900 text-xs font-bold text-cyan-200 transition-colors shadow-xs">
              <Upload className="h-4 w-4 text-cyan-400" />
              {isScanningPdf ? "Scanning PDF Text…" : "Upload PDF / Image Floorplan"}
            </span>
          </label>

          <div>
            {detectedPlan ? (
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Auto-Detected: {detectedPlan.matchedDesignName} ({detectedPlan.housingType}, {detectedPlan.totalM2} m²)
                </div>
                <div className="text-[11px] text-slate-400">
                  Base Price: ${detectedPlan.basePriceH2.toLocaleString()} &bull; Living: {detectedPlan.roomAreas.livingM2}m² &bull; Garage: {detectedPlan.roomAreas.garageM2}m² &bull; Alfresco: {detectedPlan.roomAreas.alfrescoM2}m²
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400">
                {uploadedPlanFileName ? `Loaded: ${uploadedPlanFileName}` : "Upload an architectural plan PDF to automatically identify the design, areas, and pricing."}
              </div>
            )}
          </div>
        </div>

        {detectedPlan && (
          <div className="flex items-center gap-2 flex-none">
            <Button
              type="button"
              size="sm"
              onClick={handleSendToQuoting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Auto-Fill &amp; Open Quote
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setActiveStudioTab("siting_studio")}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs gap-1.5 shadow-sm"
            >
              <Building className="h-3.5 w-3.5" />
              Site This Design (1:200)
            </Button>
          </div>
        )}
      </div>

      {/* TAB 1: Foresight Concept Floorplan Editor Workspace */}
      {activeStudioTab === "floorplan_editor" && (
        <div className="relative flex-1 w-full min-h-[780px] rounded-2xl border border-slate-800/80 bg-slate-900 overflow-hidden shadow-2xl">
          <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="border-slate-800 bg-slate-950/90 text-slate-300 hover:bg-slate-800 text-xs gap-1 shadow-md"
            >
              <RefreshCw className="h-3 w-3" /> Reload
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenExternal}
              className="border-slate-800 bg-slate-950/90 text-slate-300 hover:bg-slate-800 text-xs gap-1 shadow-md"
            >
              <ExternalLink className="h-3 w-3 text-cyan-400" /> Full Window
            </Button>
          </div>

          <iframe
            key={iframeKey}
            src={editorUrl}
            title="Foresight Home Planning Concept Floorplan Editor"
            className="w-full h-full min-h-[780px] border-0"
            allow="clipboard-read; clipboard-write; fullscreen"
            loading="lazy"
          />

          <div className="absolute bottom-4 right-4 bg-slate-950/90 border border-slate-800/90 rounded-xl px-3.5 py-2 text-[11px] text-slate-300 backdrop-blur-md shadow-lg flex items-center gap-2 pointer-events-auto">
            <Info className="h-4 w-4 text-amber-400 flex-none" />
            <span>
              Design in Foresight &bull; Use &ldquo;1:200 Siting Studio&rdquo; above to site onto lot with setbacks!
            </span>
          </div>
        </div>
      )}

      {/* TAB 2: Advanced Interactive 1:200 Siting Studio */}
      {activeStudioTab === "siting_studio" && (
        <AdvancedSitingStudio
          detectedFloorplan={detectedPlan}
          onSendToQuoting={() => navigate({ to: "/quote-builder" })}
          onSendToTender={() => navigate({ to: "/tender-request" })}
        />
      )}

      {/* Modal 1: Send to Quoting Tool */}
      <Dialog open={isExportQuoteOpen} onOpenChange={setIsExportQuoteOpen}>
        <DialogContent className="border-slate-800 bg-slate-950 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-emerald-400 flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Transfer Concept Plan to Quoting Tool
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2 text-xs">
            <p className="text-slate-400 leading-relaxed">
              Transfer this customized concept plan and its calculated room dimensions directly into the Technical Builders Estimate.
            </p>
            <div className="space-y-3">
              <div>
                <Label className="text-[11px] text-slate-300">Client / Prospect Name</Label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="border-slate-800 bg-slate-900 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-300">Concept Design Name</Label>
                <Input
                  value={designName}
                  onChange={(e) => setDesignName(e.target.value)}
                  className="border-slate-800 bg-slate-900 text-xs mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] text-slate-300">Modified Living (m²)</Label>
                  <Input
                    type="number"
                    value={modifiedLivingM2}
                    onChange={(e) => setModifiedLivingM2(e.target.value)}
                    className="border-slate-800 bg-slate-900 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-slate-300">Modified Alfresco (m²)</Label>
                  <Input
                    type="number"
                    value={modifiedAlfrescoM2}
                    onChange={(e) => setModifiedAlfrescoM2(e.target.value)}
                    className="border-slate-800 bg-slate-900 text-xs mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-[11px] text-slate-300">Architectural Notes / Modifications</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="border-slate-800 bg-slate-900 text-xs mt-1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setIsExportQuoteOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSendToQuoting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                Open in Quoting Tool
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Send to Tender Portal */}
      <Dialog open={isExportTenderOpen} onOpenChange={setIsExportTenderOpen}>
        <DialogContent className="border-slate-800 bg-slate-950 text-slate-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-amber-400 flex items-center gap-2">
              <Send className="h-5 w-5" />
              Transfer Concept Plan to Tender Request
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2 text-xs">
            <p className="text-slate-400 leading-relaxed">
              Populate the modified concept plan directly into Tab 3 of your Tender Request for drafting callouts and Master PDF generation.
            </p>
            <div className="space-y-3">
              <div>
                <Label className="text-[11px] text-slate-300">Client / Purchaser Name</Label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="border-slate-800 bg-slate-900 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-300">Design Name</Label>
                <Input
                  value={designName}
                  onChange={(e) => setDesignName(e.target.value)}
                  className="border-slate-800 bg-slate-900 text-xs mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] text-slate-300">Modified Living (m²)</Label>
                  <Input
                    type="number"
                    value={modifiedLivingM2}
                    onChange={(e) => setModifiedLivingM2(e.target.value)}
                    className="border-slate-800 bg-slate-900 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-slate-300">Modified Alfresco (m²)</Label>
                  <Input
                    type="number"
                    value={modifiedAlfrescoM2}
                    onChange={(e) => setModifiedAlfrescoM2(e.target.value)}
                    className="border-slate-800 bg-slate-900 text-xs mt-1"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button variant="ghost" size="sm" onClick={() => setIsExportTenderOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSendToTender}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                Open in Tender Portal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
