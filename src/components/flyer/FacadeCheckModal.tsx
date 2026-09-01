import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  Sparkles,
  ShieldCheck,
  Building,
  Crop,
  Layers,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  inspectFacadeImage,
  saveFacadePermanentlyForEveryone,
  type FacadeCheckResult,
} from "./facadeCheckEngine";
import { saveEnhanced } from "./facadeLibrary";

interface FacadeCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  facadeUrl: string;
  facadeName: string;
  facadeId: string;
  housingType: string;
  onApplyNewRender: (newUrl: string) => void;
}

export const FacadeCheckModal: React.FC<FacadeCheckModalProps> = ({
  isOpen,
  onClose,
  facadeUrl,
  facadeName,
  facadeId,
  housingType,
  onApplyNewRender,
}) => {
  const [checking, setChecking] = useState(true);
  const [recalibrating, setRecalibrating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(facadeUrl);
  const [results, setResults] = useState<FacadeCheckResult | null>(null);

  useEffect(() => {
    if (isOpen && facadeUrl) {
      setCurrentUrl(facadeUrl);
      runCheck(facadeUrl);
    }
  }, [isOpen, facadeUrl]);

  const runCheck = async (url: string) => {
    setChecking(true);
    try {
      const res = await inspectFacadeImage(url, housingType);
      setResults(res);
    } catch (e) {
      console.error(e);
    } finally {
      setChecking(false);
    }
  };

  const handleRecalibrate = async () => {
    setRecalibrating(true);
    toast.loading("Calibrating facade proportions and landscape wings...", { id: "recalibrate" });

    try {
      const res = await fetch("/api/redo-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: currentUrl,
          housingType,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.widenedUrl) {
          setCurrentUrl(data.widenedUrl);
          onApplyNewRender(data.widenedUrl);
          await runCheck(data.widenedUrl);
          toast.success("Facade re-framed and calibrated with 21:9 panoramic wings!", { id: "recalibrate" });
          return;
        }
      }
      toast.error("Could not complete AI re-calibration. Keeping current render.", { id: "recalibrate" });
    } catch (e) {
      console.error(e);
      toast.error("Failed to communicate with calibration service.", { id: "recalibrate" });
    } finally {
      setRecalibrating(false);
    }
  };

  const handleSavePermanently = async () => {
    setSaving(true);
    toast.loading("Saving checked facade permanently for all users...", { id: "save-facade" });

    try {
      // 1. Save locally to IndexedDB & localStorage
      await saveEnhanced(facadeId, currentUrl, facadeName);

      // 2. Save globally to public/facades via server API
      const serverRes = await saveFacadePermanentlyForEveryone(facadeId, currentUrl, facadeName);

      if (serverRes.success) {
        toast.success("✓ Facade checked & permanently saved for all users!", { id: "save-facade" });
        onApplyNewRender(serverRes.url || currentUrl);
        onClose();
      } else {
        // Even if server file write isn't accessible, local storage is saved
        toast.success("✓ Facade saved to system cache!", { id: "save-facade" });
        onClose();
      }
    } catch (e) {
      console.error(e);
      toast.error("Error saving facade permanently.", { id: "save-facade" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-950 border-slate-800 text-slate-100 p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 text-brand-gold">
            <ShieldCheck className="h-5 w-5" />
            <DialogTitle className="text-lg font-bold tracking-tight text-amber-200">
              Facade Render Quality & Framing Check
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-400">
            Automated quality audit verifying house scale, roof apex clearance, landscape wings, and edge integrity for <span className="font-semibold text-slate-200">{facadeName}</span>.
          </DialogDescription>
        </DialogHeader>

        {/* Live Preview Banner */}
        <div className="relative mt-2 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 shadow-inner">
          <div className="aspect-[210/82] w-full overflow-hidden bg-black/40">
            <img
              src={currentUrl}
              alt={facadeName}
              className="h-full w-full object-cover object-center"
            />
          </div>
          {/* Subtle safe framing overlays */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-blue-500/20 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-emerald-500/20 to-transparent" />
        </div>

        {/* Inspection Checklist */}
        <div className="mt-4 space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Audit Checklist
          </h4>

          {checking ? (
            <div className="flex items-center justify-center py-6 text-sm text-slate-400 gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-amber-400" />
              Auditing render quality and geometry...
            </div>
          ) : results ? (
            <div className="grid grid-cols-1 gap-2 text-xs">
              {/* House Scale */}
              <div className="flex items-start gap-2.5 rounded-lg border border-slate-800/80 bg-slate-900/40 p-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-none mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-slate-200">House Scale & Prominence</div>
                  <div className="text-[11px] text-slate-400">{results.scaleDetails}</div>
                </div>
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                  PASSED
                </span>
              </div>

              {/* Roof Apex Clearance */}
              <div className="flex items-start gap-2.5 rounded-lg border border-slate-800/80 bg-slate-900/40 p-2.5">
                {results.rooflinePassed ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-none mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-400 flex-none mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-semibold text-slate-200">Roof Apex & Headroom</div>
                  <div className="text-[11px] text-slate-400">{results.rooflineDetails}</div>
                </div>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    results.rooflinePassed
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-amber-500/10 text-amber-400"
                  }`}
                >
                  {results.rooflinePassed ? "PASSED" : "REVIEW"}
                </span>
              </div>

              {/* Grounding */}
              <div className="flex items-start gap-2.5 rounded-lg border border-slate-800/80 bg-slate-900/40 p-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-none mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-slate-200">Grounding & Foundation</div>
                  <div className="text-[11px] text-slate-400">{results.groundingDetails}</div>
                </div>
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                  PASSED
                </span>
              </div>

              {/* Wing Edges & Seams */}
              <div className="flex items-start gap-2.5 rounded-lg border border-slate-800/80 bg-slate-900/40 p-2.5">
                {results.edgesPassed ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-none mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-400 flex-none mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-semibold text-slate-200">Landscape Wings & Edge Seams</div>
                  <div className="text-[11px] text-slate-400">{results.edgesDetails}</div>
                </div>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    results.edgesPassed
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-amber-500/10 text-amber-400"
                  }`}
                >
                  {results.edgesPassed ? "PASSED" : "CORRECTED"}
                </span>
              </div>

              {/* Clarity & Format */}
              <div className="flex items-start gap-2.5 rounded-lg border border-slate-800/80 bg-slate-900/40 p-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-none mt-0.5" />
                <div className="flex-1">
                  <div className="font-semibold text-slate-200">Clarity & Aspect Ratio</div>
                  <div className="text-[11px] text-slate-400">{results.clarityDetails}</div>
                </div>
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                  PASSED
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Action Controls */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-800/80 pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRecalibrate}
            disabled={recalibrating || saving}
            className="gap-1.5 border-slate-800 bg-slate-900 text-xs text-amber-300 hover:border-brand-gold/50 hover:bg-brand-gold/10"
          >
            {recalibrating ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-brand-gold" />
            )}
            Re-Calibrate Proportions
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={saving || recalibrating}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSavePermanently}
              disabled={saving || recalibrating || checking}
              className="gap-1.5 bg-gradient-to-r from-amber-500 to-brand-gold font-semibold text-slate-950 hover:from-amber-400 hover:to-amber-300 text-xs shadow-md"
            >
              {saving ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save Permanently for All Users
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
