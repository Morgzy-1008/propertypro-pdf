import React, { useState } from "react";
import {
  ExternalLink,
  RefreshCw,
  Send,
  Layers,
  Sparkles,
  Upload,
  Info,
  Sliders,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Home,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate, Link } from "@tanstack/react-router";
import { pdfDocumentToPagesAndText } from "@/lib/pdfPages";
import {
  detectFloorplanFromText,
  findHudsonModelByName,
  type DetectedFloorplan,
} from "@/lib/floorplan/floorplanDetector";
import {
  getStandardAreaBreakdown,
  calculateModifiedFloorplanPricing,
} from "@/lib/quoting/quoteEngine";
import { Logo } from "@/components/flyer/FlyerTemplates";
import { StaffHeaderProfile } from "@/components/auth/StaffHeaderProfile";

export function ForesightEditorFrame() {
  const navigate = useNavigate();
  const [iframeKey, setIframeKey] = useState(0);
  const [isExportQuoteOpen, setIsExportQuoteOpen] = useState(false);
  const [isExportTenderOpen, setIsExportTenderOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto-Detected Floorplan from PDF / File
  const [detectedPlan, setDetectedPlan] = useState<DetectedFloorplan | null>(null);
  const [uploadedPlanFileName, setUploadedPlanFileName] = useState<string>("");
  const [uploadedPlanDataUrl, setUploadedPlanDataUrl] = useState<string>("");
  const [isScanningPdf, setIsScanningPdf] = useState(false);

  // Form states for bridge
  const [clientName, setClientName] = useState("Jordan Mitchell");
  const [designName, setDesignName] = useState("Amber 21");
  const [modifiedLivingM2, setModifiedLivingM2] = useState("143.5");
  const [modifiedAlfrescoM2, setModifiedAlfrescoM2] = useState("11.8");
  const [modifiedGarageM2, setModifiedGarageM2] = useState("34.1");
  const [modifiedPorchM2, setModifiedPorchM2] = useState("2.84");
  const [notes, setNotes] = useState("Hudson Homes concept floorplan planning.");

  const editorUrl = "https://concept-floor-plan-editor.web.app/";

  // 1. Live Hudson Model Detection
  const matchedHudson = findHudsonModelByName(designName);
  const housingType = matchedHudson ? matchedHudson.housingType : (detectedPlan?.housingType || "Single Storey");
  const standardTotalM2 = matchedHudson ? matchedHudson.row.m2 : 195;
  const stdAreas = matchedHudson ? getStandardAreaBreakdown(matchedHudson.row.name, housingType, standardTotalM2) : null;

  // Numeric breakdown
  const curLiving = parseFloat(modifiedLivingM2) || (stdAreas?.livingM2 ?? 135);
  const curGarage = parseFloat(modifiedGarageM2) || (stdAreas?.garageM2 ?? 34);
  const curAlfresco = parseFloat(modifiedAlfrescoM2) || (stdAreas?.alfrescoM2 ?? 12);
  const curPorch = parseFloat(modifiedPorchM2) || (stdAreas?.porchM2 ?? 3);
  const curTotalM2 = Math.round((curLiving + curGarage + curAlfresco + curPorch) * 100) / 100;

  // Detect variance from standard
  const hasAreaDifferences = matchedHudson ? (
    Math.abs(curTotalM2 - standardTotalM2) > 0.1 ||
    Math.abs(curLiving - (stdAreas?.livingM2 || 0)) > 0.1 ||
    Math.abs(curGarage - (stdAreas?.garageM2 || 0)) > 0.1 ||
    Math.abs(curAlfresco - (stdAreas?.alfrescoM2 || 0)) > 0.1 ||
    Math.abs(curPorch - (stdAreas?.porchM2 || 0)) > 0.1
  ) : false;

  const standardBasePrice = matchedHudson ? (matchedHudson.row.h2 || matchedHudson.row.h1 || 0) : 0;
  const deltaPricing = (matchedHudson && hasAreaDifferences && stdAreas) ? calculateModifiedFloorplanPricing({
    housingType,
    designName: matchedHudson.row.name,
    standardDesignM2: standardTotalM2,
    standardBasePrice,
    standardAreas: stdAreas,
    modifiedAreas: {
      livingM2: curLiving,
      garageM2: curGarage,
      alfrescoM2: curAlfresco,
      porchM2: curPorch,
      totalM2: curTotalM2,
    },
  }) : null;

  const handleRefresh = () => {
    setIframeKey((prev) => prev + 1);
    toast.info("Foresight Floorplan Editor reloaded.");
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleOpenExternal = () => {
    window.open(editorUrl, "_blank", "noopener,noreferrer");
  };

  const handleResetToStandard = () => {
    if (stdAreas && matchedHudson) {
      setModifiedLivingM2(String(stdAreas.livingM2 || 135));
      setModifiedGarageM2(String(stdAreas.garageM2 || 34));
      setModifiedAlfrescoM2(String(stdAreas.alfrescoM2 || 12));
      setModifiedPorchM2(String(stdAreas.porchM2 || 3));
      toast.info(`Reset to standard ${matchedHudson.row.name} dimensions (${standardTotalM2} m²).`);
    }
  };

  // Upload PDF / Image & Auto-Detect Floorplan Design
  const handleFileUpload = async (file: File) => {
    setIsScanningPdf(true);
    setUploadedPlanFileName(file.name);
    try {
      const { pages, rawText } = await pdfDocumentToPagesAndText(file, 4);

      if (pages[0]) {
        setUploadedPlanDataUrl(pages[0]);
      }

      // Auto-detect matching Hudson Homes floorplan
      const match = detectFloorplanFromText(rawText, file.name);
      if (match) {
        if (pages[0]) match.floorplanUrl = pages[0];
        setDetectedPlan(match);
        setDesignName(match.matchedDesignName);
        setModifiedLivingM2(String(match.roomAreas.livingM2));
        setModifiedGarageM2(String(match.roomAreas.garageM2));
        setModifiedAlfrescoM2(String(match.roomAreas.alfrescoM2));
        setModifiedPorchM2(String(match.roomAreas.porchM2));

        if (match.hasSqmVariance) {
          toast.success(`✨ Recognized Hudson Design: ${match.matchedDesignName} (Modified: ${match.totalM2} m² • Delta Pricing Applied)!`);
        } else {
          toast.success(`✨ Recognized Hudson Design: ${match.matchedDesignName} (Standard: ${match.totalM2} m²)!`);
        }
      } else if (pages[0]) {
        const customPlan: DetectedFloorplan = {
          matchedDesignName: file.name.replace(/\.[^/.]+$/, ""),
          family: "Custom",
          size: 21,
          confidence: 70,
          housingType: "Single Storey",
          isHudsonDesign: false,
          hasSqmVariance: true,
          standardTotalM2: 195,
          deltaM2: 0,
          costAdjustment: 0,
          effectiveBasePrice: 0,
          totalM2: 195,
          widthM: 11.2,
          lengthM: 19.5,
          basePriceH2: 0,
          basePriceH1: 0,
          basePriceHBS: 0,
          standardAreas: { livingM2: 138, garageM2: 38, alfrescoM2: 16, porchM2: 3, totalM2: 195 },
          roomAreas: { livingM2: 138, garageM2: 38, alfrescoM2: 16, porchM2: 3, totalM2: 195 },
          floorplanUrl: pages[0],
        };
        setDetectedPlan(customPlan);
        setDesignName(customPlan.matchedDesignName);
        toast.info("Floorplan loaded! Ready to export or edit.");
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
      const isHudson = !!matchedHudson;
      const canonicalName = matchedHudson ? matchedHudson.row.name : designName;
      const effectiveType = matchedHudson ? matchedHudson.housingType : housingType;
      const effectiveBase = deltaPricing ? deltaPricing.modifiedBasePrice : standardBasePrice;

      const bridgePayload = {
        clientName: clientName || "Valued Client",
        notes: notes,
        designName: canonicalName,
        housingType: effectiveType,
        standardDesignM2: matchedHudson ? matchedHudson.row.m2 : standardTotalM2,
        standardBasePrice,
        standardAreas: stdAreas || undefined,
        isHudsonDesign: isHudson,
        isModifiedFloorplan: isHudson ? hasAreaDifferences : true,
        modifiedDesignM2: (isHudson ? hasAreaDifferences : true) ? curTotalM2 : 0,
        modifiedAreas: {
          livingM2: curLiving,
          garageM2: curGarage,
          alfrescoM2: curAlfresco,
          porchM2: curPorch,
          totalM2: curTotalM2,
        },
        totalM2: curTotalM2,
        basePrice: effectiveBase,
        priceRow: matchedHudson?.row || detectedPlan?.priceRow,
        floorplanUrl: uploadedPlanDataUrl || detectedPlan?.floorplanUrl || "",
        roomAreas: {
          livingM2: curLiving,
          garageM2: curGarage,
          alfrescoM2: curAlfresco,
          porchM2: curPorch,
          totalM2: curTotalM2,
        },
      };

      localStorage.setItem("hudson_imported_floorplan_bridge", JSON.stringify(bridgePayload));
      localStorage.setItem("hudson_draft_quote_from_concept", JSON.stringify(bridgePayload));

      if (isHudson && hasAreaDifferences) {
        toast.success(`✨ Bridged ${canonicalName} (Modified Floorplan: ${curTotalM2} m²) to Quoting Engine!`);
      } else if (isHudson) {
        toast.success(`✨ Bridged ${canonicalName} (Standard: ${standardTotalM2} m²) to Quoting Engine!`);
      } else {
        toast.success(`Bridged ${canonicalName} to Quoting Engine!`);
      }

      setIsExportQuoteOpen(false);
      navigate({ to: "/quote-builder" });
    } catch {
      toast.error("Failed to bridge concept plan to Quoting Engine.");
    }
  };

  const handleSendToTender = () => {
    try {
      const isHudson = !!matchedHudson;
      const canonicalName = matchedHudson ? matchedHudson.row.name : designName;
      const effectiveType = matchedHudson ? matchedHudson.housingType : housingType;

      const bridgePayload = {
        customer1: {
          firstName: clientName.split(" ")[0] || "Jordan",
          surname: clientName.split(" ").slice(1).join(" ") || "Mitchell",
        },
        homeSpec: {
          homeDesign: canonicalName,
          housingType: effectiveType,
          isModifiedFloorplan: isHudson ? hasAreaDifferences : true,
          floorplanUrl: uploadedPlanDataUrl || detectedPlan?.floorplanUrl || "",
          modifiedDesignM2: curTotalM2,
          modifiedAreas: {
            livingM2: curLiving,
            garageM2: curGarage,
            alfrescoM2: curAlfresco,
            porchM2: curPorch,
            totalM2: curTotalM2,
          },
        },
      };

      localStorage.setItem("hudson_imported_floorplan_tender_bridge", JSON.stringify(bridgePayload));

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

      toast.success(`Bridged ${canonicalName} to Tender Request Portal!`);
      setIsExportTenderOpen(false);
      navigate({ to: "/tender-request" });
    } catch {
      toast.error("Failed to bridge concept plan to Tender Portal.");
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden select-none">
      {/* 1 SINGLE SLEEK HUDSON HOMES TAB */}
      <header className="h-[52px] bg-slate-900 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between gap-2 flex-none z-30 shadow-md">
        {/* Left: Hub Return + Logo + Title + Dynamic Plan Badge */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            to="/hub"
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-xs font-semibold shrink-0"
            title="Return to Hudson Hub"
          >
            <Home className="h-4 w-4 text-amber-400" />
            <span className="hidden md:inline">Hub</span>
          </Link>

          <div className="h-4 w-px bg-slate-800 shrink-0" />

          <div className="flex items-center gap-2 shrink-0">
            <Logo light={true} size={7} className="shrink-0" />
            <span className="text-xs font-bold text-slate-200 hidden md:inline tracking-wide">
              Floorplan Editor
            </span>
          </div>

          {/* Hudson Model Recognition Badge */}
          {matchedHudson ? (
            <button
              type="button"
              onClick={() => setIsExportQuoteOpen(true)}
              className="cursor-pointer hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 hover:border-amber-500/50 hover:bg-slate-800 transition-all text-[11px] shrink-0"
              title="Click to view area details and pricing"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-white">{matchedHudson.row.name}</span>
              {hasAreaDifferences ? (
                <span className="text-amber-300 font-bold bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.5 rounded text-[10px]">
                  Modified ({curTotalM2} m²)
                </span>
              ) : (
                <span className="text-emerald-300 font-semibold bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded text-[10px]">
                  Standard ({standardTotalM2} m²)
                </span>
              )}
            </button>
          ) : detectedPlan ? (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] shrink-0">
              <Sparkles className="h-3 w-3 text-cyan-400" />
              <span className="text-white font-semibold">{detectedPlan.matchedDesignName}</span>
            </div>
          ) : null}
        </div>

        {/* Right: Actions (Upload, Quoting, Tender, Window controls, Staff Profile) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Upload Plan Button */}
          <label className="cursor-pointer shrink-0">
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
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors shadow-xs">
              <Upload className="h-3.5 w-3.5 text-cyan-400" />
              <span className="hidden sm:inline">{isScanningPdf ? "Scanning..." : "Upload Plan"}</span>
            </span>
          </label>

          {/* Send to Quoting Tool */}
          <Button
            size="sm"
            onClick={() => setIsExportQuoteOpen(true)}
            className="h-8 px-2.5 sm:px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-sm shrink-0"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Send to Quoting</span>
          </Button>

          {/* Send to Tender */}
          <Button
            size="sm"
            onClick={() => setIsExportTenderOpen(true)}
            className="h-8 px-2.5 sm:px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs gap-1.5 shadow-sm shrink-0"
          >
            <Send className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Send to Tender</span>
          </Button>

          <div className="h-4 w-px bg-slate-800 mx-0.5 hidden sm:block shrink-0" />

          {/* Fullscreen Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleFullscreen}
            className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800 shrink-0"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </Button>

          {/* External Full Window */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenExternal}
            className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800 shrink-0"
            title="Open in external browser window"
          >
            <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
          </Button>

          {/* Reload iframe */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800 shrink-0"
            title="Reload Editor"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>

          {/* Staff Header Profile (Compact) */}
          <div className="pl-1 hidden sm:block shrink-0">
            <StaffHeaderProfile isLight={false} compact={true} />
          </div>
        </div>
      </header>

      {/* FULL-WINDOW FORESIGHT CONCEPT EDITOR WORKSPACE (Edge-to-Edge) */}
      <div className="flex-1 w-full h-[calc(100vh-52px)] bg-slate-950 overflow-hidden relative">
        <iframe
          key={iframeKey}
          src={editorUrl}
          title="Foresight Home Planning Concept Floorplan Editor"
          className="w-full h-full border-0 block"
          allow="clipboard-read; clipboard-write; fullscreen"
          loading="lazy"
        />
      </div>

      {/* Modal 1: Send to Quoting Tool with Live Hudson Model & Delta Verification */}
      <Dialog open={isExportQuoteOpen} onOpenChange={setIsExportQuoteOpen}>
        <DialogContent className="border-slate-800 bg-slate-950 text-slate-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-emerald-400 flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Transfer Concept Plan to Quoting Tool
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            {/* Hudson Recognition Banner */}
            {matchedHudson ? (
              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-emerald-400 text-xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>Recognized Hudson Design: {matchedHudson.row.name}</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-emerald-300 bg-emerald-900/60 px-2 py-0.5 rounded-full border border-emerald-700/50">
                    {matchedHudson.housingType}
                  </span>
                </div>

                {hasAreaDifferences ? (
                  <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-amber-300 font-semibold text-[11px]">
                      <span>Modified Floorplan Variance Detected:</span>
                      <span className="font-bold text-amber-200">
                        {curTotalM2} m² (Standard: {standardTotalM2} m²)
                      </span>
                    </div>
                    {deltaPricing && (
                      <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1 border-t border-amber-800/40">
                        <span>Auto-Calculated Modified Base Price:</span>
                        <span className="font-bold text-emerald-400 text-xs">
                          ${deltaPricing.modifiedBasePrice.toLocaleString()}
                          <span className="text-[10px] text-amber-300 ml-1 font-normal">
                            ({deltaPricing.totalCostAdjustment >= 0 ? "+" : ""}${deltaPricing.totalCostAdjustment.toLocaleString()} delta)
                          </span>
                        </span>
                      </div>
                    )}
                    <div className="pt-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleResetToStandard}
                        className="h-6 px-2 text-[10px] text-slate-400 hover:text-white hover:bg-slate-800 gap-1"
                      >
                        <RotateCcw className="h-3 w-3" /> Reset to Standard SQMs
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-[11px] text-emerald-300/90 flex items-center justify-between">
                    <span>Standard Hudson Floorplan Baseline ({standardTotalM2} m²):</span>
                    <span className="font-bold text-white">
                      Base Price: ${standardBasePrice.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 text-slate-300 text-[11px] flex items-center gap-2">
                <Info className="h-4 w-4 text-cyan-400 shrink-0" />
                <span>Custom design concept. Quoting tool will import dimensions as a custom plan.</span>
              </div>
            )}

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
                <Label className="text-[11px] text-slate-300">Floorplan Design Name</Label>
                <Input
                  value={designName}
                  onChange={(e) => setDesignName(e.target.value)}
                  placeholder="e.g. Amber 21, Jasper 26, Pearl 34"
                  className="border-slate-800 bg-slate-900 text-xs mt-1"
                />
              </div>

              {/* Area Table Inputs */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] text-slate-300">Living (m²)</Label>
                    {stdAreas?.livingM2 && (
                      <span className="text-[10px] text-slate-400">Std: {stdAreas.livingM2}</span>
                    )}
                  </div>
                  <Input
                    type="number"
                    step="0.1"
                    value={modifiedLivingM2}
                    onChange={(e) => setModifiedLivingM2(e.target.value)}
                    className="border-slate-800 bg-slate-900 text-xs mt-1"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] text-slate-300">Garage (m²)</Label>
                    {stdAreas?.garageM2 && (
                      <span className="text-[10px] text-slate-400">Std: {stdAreas.garageM2}</span>
                    )}
                  </div>
                  <Input
                    type="number"
                    step="0.1"
                    value={modifiedGarageM2}
                    onChange={(e) => setModifiedGarageM2(e.target.value)}
                    className="border-slate-800 bg-slate-900 text-xs mt-1"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] text-slate-300">Alfresco (m²)</Label>
                    {stdAreas?.alfrescoM2 && (
                      <span className="text-[10px] text-slate-400">Std: {stdAreas.alfrescoM2}</span>
                    )}
                  </div>
                  <Input
                    type="number"
                    step="0.1"
                    value={modifiedAlfrescoM2}
                    onChange={(e) => setModifiedAlfrescoM2(e.target.value)}
                    className="border-slate-800 bg-slate-900 text-xs mt-1"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] text-slate-300">Porch (m²)</Label>
                    {stdAreas?.porchM2 && (
                      <span className="text-[10px] text-slate-400">Std: {stdAreas.porchM2}</span>
                    )}
                  </div>
                  <Input
                    type="number"
                    step="0.1"
                    value={modifiedPorchM2}
                    onChange={(e) => setModifiedPorchM2(e.target.value)}
                    className="border-slate-800 bg-slate-900 text-xs mt-1"
                  />
                </div>
              </div>

              {/* Total Summary */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold">
                <span className="text-slate-400">Total Calculated Area:</span>
                <span className="text-white font-bold">{curTotalM2} m²</span>
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
                  <Label className="text-[11px] text-slate-300">Living (m²)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={modifiedLivingM2}
                    onChange={(e) => setModifiedLivingM2(e.target.value)}
                    className="border-slate-800 bg-slate-900 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-slate-300">Alfresco (m²)</Label>
                  <Input
                    type="number"
                    step="0.1"
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
