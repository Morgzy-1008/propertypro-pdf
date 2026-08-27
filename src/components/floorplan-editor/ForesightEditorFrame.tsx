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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

export function ForesightEditorFrame() {
  const navigate = useNavigate();
  const [iframeKey, setIframeKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExportQuoteOpen, setIsExportQuoteOpen] = useState(false);
  const [isExportTenderOpen, setIsExportTenderOpen] = useState(false);

  // Form states for bridge
  const [clientName, setClientName] = useState("Jordan Hales");
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

  const handleSendToQuoting = () => {
    try {
      const living = parseFloat(modifiedLivingM2) || 135;
      const alfresco = parseFloat(modifiedAlfrescoM2) || 16;
      const totalM2 = living + alfresco + 38.2 + 12.5;

      const draftQuote = {
        id: `quote_concept_${Date.now()}`,
        quoteNumber: `Q-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        createdAt: new Date().toISOString(),
        client: {
          clientName: clientName || "Valued Client",
          notes: notes,
        },
        design: {
          designName: designName,
          designM2: totalM2,
          isModifiedFloorplan: true,
          modifiedAreas: {
            livingM2: living,
            garageM2: 38.2,
            alfrescoM2: alfresco,
            porchM2: 12.5,
            totalM2: totalM2,
          },
        },
      };

      localStorage.setItem("hudson_draft_quote_from_concept", JSON.stringify(draftQuote));
      toast.success("Concept floorplan data bridged to Quoting Engine!");
      setIsExportQuoteOpen(false);
      navigate({ to: "/quote-builder" });
    } catch {
      toast.error("Failed to bridge concept plan to Quoting Engine.");
    }
  };

  const handleSendToTender = () => {
    try {
      const living = parseFloat(modifiedLivingM2) || 135;
      const alfresco = parseFloat(modifiedAlfrescoM2) || 16;
      const totalM2 = living + alfresco + 38.2 + 12.5;

      const rawTender = localStorage.getItem("hudson_current_tender_draft");
      let currentTender = rawTender ? JSON.parse(rawTender) : {};

      currentTender = {
        ...currentTender,
        customer1: {
          ...currentTender.customer1,
          firstName: clientName.split(" ")[0] || "Jordan",
          surname: clientName.split(" ").slice(1).join(" ") || "Hales",
        },
        homeSpec: {
          ...currentTender.homeSpec,
          homeDesign: designName,
          isModifiedFloorplan: true,
          modifiedDesignM2: totalM2,
          modifiedAreas: {
            livingM2: living,
            garageM2: 38.2,
            alfrescoM2: alfresco,
            porchM2: 12.5,
            totalM2: totalM2,
          },
        },
      };

      localStorage.setItem("hudson_current_tender_draft", JSON.stringify(currentTender));
      toast.success("Concept floorplan data bridged to Tender Request Portal!");
      setIsExportTenderOpen(false);
      navigate({ to: "/tender-request" });
    } catch {
      toast.error("Failed to bridge concept plan to Tender Portal.");
    }
  };

  return (
    <div className={`flex flex-col bg-slate-950 text-slate-100 font-sans ${isFullscreen ? "fixed inset-0 z-50 p-2" : "min-h-[calc(100vh-4rem)] p-4 sm:p-6 max-w-7xl mx-auto space-y-4"}`}>
      {/* Top Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-cyan-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                Foresight Home Planning — Concept Floorplan Editor
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-800/60">
                Connected Studio
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive architectural 2D floorplan planning, wall adjustments, room sizing, and client concept modifications.
            </p>
          </div>
        </div>

        {/* Toolbar Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white text-xs gap-1.5"
            title="Reload Editor"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reload
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenExternal}
            className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white text-xs gap-1.5"
          >
            <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
            Open in New Window
          </Button>

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

      {/* Embedded Iframe Workspace */}
      <div className="relative flex-1 w-full min-h-[780px] rounded-2xl border border-slate-800/80 bg-slate-900 overflow-hidden shadow-2xl">
        <iframe
          key={iframeKey}
          src={editorUrl}
          title="Foresight Home Planning Concept Floorplan Editor"
          className="w-full h-full min-h-[780px] border-0"
          allow="clipboard-read; clipboard-write; fullscreen"
          loading="lazy"
        />

        {/* Floating Quick-Help Badge */}
        <div className="absolute bottom-4 right-4 bg-slate-950/90 border border-slate-800/90 rounded-xl px-3.5 py-2 text-[11px] text-slate-300 backdrop-blur-md shadow-lg flex items-center gap-2 pointer-events-auto">
          <Info className="h-4 w-4 text-amber-400 flex-none" />
          <span>
            Design your floorplan in Foresight &bull; Use buttons above to push dimensions into Quoting or Tender!
          </span>
        </div>
      </div>

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
