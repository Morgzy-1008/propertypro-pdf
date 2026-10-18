import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Sparkles, PenTool, Image as ImageIcon, Check, Maximize2, X, ShieldCheck } from "lucide-react";
import { HUDSON_FACADES } from "@/components/flyer/facades.data";
import { PRE_RENDERED_FACADES } from "@/components/flyer/preRenderedFacades.data";
import { prepareFacade } from "@/components/flyer/facadeEngine";
import { getIdbEnhanced } from "@/components/flyer/idbFacadeCache";
import { loadEnhancedAsync } from "@/components/flyer/facadeLibrary";
import { formatAud } from "@/lib/pricing";
import { findFacadeForDesign } from "@/lib/quoting/facadeLookup";
import { isDoubleStoreyDesign } from "@/lib/quoting/quoteEngine";
import type { QuoteDesignSelection } from "@/lib/quoting/quoteTypes";

export interface QuoteFacadeEnlargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  src: string;
  facadeName: string;
  housingType?: string;
  designName?: string;
  facadePrice?: number;
  renderNote?: string;
}

export function QuoteFacadeEnlargeModal({
  isOpen,
  onClose,
  src,
  facadeName,
  housingType,
  designName,
  facadePrice = 0,
  renderNote,
}: QuoteFacadeEnlargeModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !src || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="enlarged-facade-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 md:p-10 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-6xl max-h-[92vh] rounded-3xl border border-slate-800 bg-slate-950 text-white flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Laser Top Accent */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span id="enlarged-facade-title" className="text-lg sm:text-xl font-black text-white">
                  {facadeName || "Classic"} Facade
                </span>
                {housingType && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-700/60 text-cyan-300 font-mono font-bold">
                    {housingType}
                  </span>
                )}
                {renderNote && (
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 font-mono">
                    {renderNote}
                  </span>
                )}
              </div>
              {designName && (
                <p className="text-xs text-slate-400 mt-0.5">
                  Architectural Elevation for {designName}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs sm:text-sm font-mono font-bold text-amber-400 bg-amber-950/50 border border-amber-500/40 px-3 py-1 rounded-xl">
              {facadePrice === 0 ? "Standard Included ($0)" : `+${formatAud(facadePrice)}`}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Close (Esc)"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Render Canvas */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center bg-slate-950/70 select-none">
          <img
            src={src}
            alt={`${facadeName} Architectural Facade Render`}
            className="max-h-[72vh] w-auto max-w-full object-contain rounded-xl shadow-2xl drop-shadow-2xl"
          />
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>High-Definition Architectural Render &bull; Press ESC to close</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

interface QuoteFacadeRenderPreviewProps {
  design: QuoteDesignSelection;
  className?: string;
  maxHeight?: string;
  showBadge?: boolean;
}

export function QuoteFacadeRenderPreview({
  design,
  className = "",
  maxHeight = "340px",
  showBadge = true,
}: QuoteFacadeRenderPreviewProps) {
  const [src, setSrc] = useState<string>("");
  const [renderNote, setRenderNote] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [isEnlarged, setIsEnlarged] = useState(false);

  const facadeName = design.facadeName || (design.designName ? "Classic" : "");
  const housingType = design.housingType || "Single Storey";
  const isDoubleFrontSplit = Boolean(design.designName && /cinnamon|mauve/i.test(design.designName));
  const isDouble = isDoubleStoreyDesign(
    design.designName,
    housingType,
    design.customSpec?.storeys,
  ) || isDoubleFrontSplit;
  const isDoubleOrSplit = Boolean(
    isDouble ||
    housingType === "Double Storey" ||
    housingType === "Split Level" ||
    (housingType as string) === "Split" ||
    /double|split/i.test(housingType) ||
    /cobalt|split/i.test(design.designName || design.modelName || "") ||
    (src && /double|2-storey|-ds-|2stry|split|cobalt/i.test(src))
  );

  const isSg = Boolean(
    design.garage === 1 ||
    /terracotta 23|\(s\/g\)|single garage/i.test(design.designName || design.modelName || "") ||
    /single garage/i.test(design.facadeName || "") ||
    (src && /single-garage|single_garage|narrow-single-garage|classic-single-garage|-sg-/i.test(src))
  );
  const isSingleGarageDouble = isDoubleOrSplit && isSg;

  useEffect(() => {
    if (!facadeName) {
      setSrc("");
      setRenderNote("");
      return;
    }

    // Custom facade image URL override if provided
    if (design.isCustomFacade && design.facadeImageUrl) {
      setSrc(design.facadeImageUrl);
      setRenderNote("Custom Elevation");
      return;
    }

    let isMounted = true;
    setLoading(true);

    // Find matching facade using the comprehensive lookup engine
    const matched = findFacadeForDesign(facadeName, isDouble, isDoubleFrontSplit ? "Double Storey" : housingType, design.designName || design.modelName);

    if (matched) {
      if (isMounted) {
        setRenderNote(matched.range || "");
      }

      // 1. Check pre-rendered static high-res catalogue first
      if (PRE_RENDERED_FACADES[matched.id]) {
        if (isMounted) {
          setSrc(PRE_RENDERED_FACADES[matched.id]);
          setLoading(false);
        }
        return;
      }

      // Set base render immediately so it displays instantly with zero lag
      if (isMounted) {
        setSrc(matched.url);
        setLoading(false);
      }

      // 2. Check IndexedDB cache for AI-enhanced render in background
      getIdbEnhanced(matched.id)
        .then((cached) => {
          if (!isMounted) return;
          if (cached) {
            const clean = cached.replace("::AI_OUTPAINT_V7_FRESH::", "");
            if (clean.startsWith("data:image/")) {
              setSrc(clean);
              return;
            }
          }

          // 3. Check Supabase remote store
          loadEnhancedAsync(matched!.id).then((remoteB64) => {
            if (!isMounted) return;
            if (remoteB64) {
              setSrc(remoteB64);
              return;
            }

            // 4. Fallback to prepareFacade for enhancement
            prepareFacade(matched!.url, matched!.originalUrl, matched!.id, housingType)
              .then((res) => {
                if (isMounted && res) {
                  setSrc(res);
                }
              })
              .catch(() => {});
          });
        })
        .catch(() => {});
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [design.facadeName, design.housingType, design.mode, design.customSpec, design.isCustomFacade, design.facadeImageUrl, facadeName, isDouble, housingType]);

  if (!design.designName && !design.facadeName && design.mode !== "custom_floorplan") {
    return (
      <div className={`w-full bg-slate-950/80 rounded-2xl p-8 border border-slate-800 text-center space-y-2 ${className}`}>
        <ImageIcon className="h-10 w-10 mx-auto text-slate-500 opacity-60" />
        <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Architectural Facade Render Preview
        </h5>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Select a Home Design Model and Facade above to preview the high-definition architectural facade render.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={`w-full rounded-2xl border border-slate-800 bg-slate-950/90 overflow-hidden shadow-2xl relative ${className}`}>
        {/* Header Bar */}
        {showBadge && (
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2 bg-slate-900/60">
            <div className="flex items-center gap-2 flex-wrap">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-100">
                Architectural Facade Render &bull; {design.facadeName || "Classic"}
              </span>
              {renderNote && (
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                  {renderNote}
                </span>
              )}
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">
                {housingType}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-amber-400">
                {design.facadePrice === 0 ? "Standard Included ($0)" : `+${formatAud(design.facadePrice)}`}
              </span>
              {src && (
                <button
                  type="button"
                  onClick={() => setIsEnlarged(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 hover:border-cyan-500/50 transition-all cursor-pointer shadow-xs"
                  title="Enlarge facade render"
                >
                  <Maximize2 className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Enlarge</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Image Render Canvas */}
        <div
          onClick={() => src && setIsEnlarged(true)}
          className={`w-full relative flex items-center justify-center overflow-hidden bg-slate-950 aspect-[210/95] min-h-[220px] max-h-[380px] ${
            src ? "cursor-zoom-in group" : ""
          }`}
          title={src ? "Click to enlarge facade render" : undefined}
        >
          {src ? (
            <img
              src={src}
              alt={design.facadeName || "Architectural Facade Render"}
              className="w-full h-full object-contain object-center drop-shadow-md transition-all duration-300 p-3 sm:p-4 group-hover:scale-[1.02]"
              style={{
                imageRendering: "auto",
              }}
            />
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs flex flex-col items-center gap-2">
              {loading ? (
                <div className="flex items-center gap-2 text-cyan-400">
                  <span className="animate-spin text-base">⏳</span>
                  <span>Loading high-definition {design.facadeName || "Classic"} facade render...</span>
                </div>
              ) : (
                <>
                  <PenTool className="h-8 w-8 text-slate-600" />
                  <span>Selected Facade: {design.facadeName || "Classic"} ({housingType})</span>
                </>
              )}
            </div>
          )}

          {/* Floating Enlarge Button on Image */}
          {src && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEnlarged(true);
              }}
              className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/85 hover:bg-slate-900 text-slate-200 hover:text-white text-xs font-bold border border-slate-700/80 hover:border-cyan-400/60 shadow-lg backdrop-blur-md transition-all cursor-pointer group/btn z-10"
              title="Enlarge facade render"
            >
              <Maximize2 className="h-3.5 w-3.5 text-cyan-400 group-hover/btn:scale-110 transition-transform" />
              <span>Enlarge Render</span>
            </button>
          )}

          {/* Selected Pill Floating Overlay */}
          {src && (
            <div className="absolute bottom-3 left-3 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] font-bold text-white uppercase tracking-wider border border-white/20 shadow-lg flex items-center gap-2 pointer-events-none">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>HD Facade Render &bull; {design.facadeName || "Classic"}</span>
              {renderNote && (
                <span className="text-emerald-300 font-sans normal-case">({renderNote})</span>
              )}
              <span className="text-amber-400 font-mono">
                {design.facadePrice === 0 ? "($0 Included)" : `(+${formatAud(design.facadePrice)})`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Enlarged Facade Modal */}
      <QuoteFacadeEnlargeModal
        isOpen={isEnlarged}
        onClose={() => setIsEnlarged(false)}
        src={src}
        facadeName={design.facadeName || "Classic"}
        housingType={housingType}
        designName={design.designName}
        facadePrice={design.facadePrice}
        renderNote={renderNote}
      />
    </>
  );
}
