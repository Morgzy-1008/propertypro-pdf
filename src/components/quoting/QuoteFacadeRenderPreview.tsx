import React, { useState, useEffect } from "react";
import { Sparkles, PenTool, Image as ImageIcon, Check } from "lucide-react";
import { HUDSON_FACADES } from "@/components/flyer/facades.data";
import { PRE_RENDERED_FACADES } from "@/components/flyer/preRenderedFacades.data";
import { prepareFacade } from "@/components/flyer/facadeEngine";
import { getIdbEnhanced } from "@/components/flyer/idbFacadeCache";
import { loadEnhancedAsync } from "@/components/flyer/facadeLibrary";
import { formatAud } from "@/lib/pricing";
import { findFacadeForDesign } from "@/lib/quoting/facadeLookup";
import { isDoubleStoreyDesign } from "@/lib/quoting/quoteEngine";
import type { QuoteDesignSelection } from "@/lib/quoting/quoteTypes";

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

  const facadeName = design.facadeName || (design.designName ? "Classic" : "");
  const housingType = design.housingType || "Single Storey";
  const isDouble = isDoubleStoreyDesign(
    design.designName,
    housingType,
    design.customSpec?.storeys,
  );
  const isDoubleOrSplit = Boolean(
    isDouble ||
    housingType === "Double Storey" ||
    housingType === "Split Level" ||
    housingType === "Split" ||
    /double|split/i.test(housingType) ||
    /cobalt|split/i.test(design.designName || design.modelName || "") ||
    (src && /double|2-storey|-ds-|2stry|split|cobalt/i.test(src))
  );

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
    const matched = findFacadeForDesign(facadeName, isDouble, housingType, design.designName || design.modelName);

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
          </div>
        </div>
      )}

      {/* Image Render Canvas */}
      <div
        className="w-full relative flex items-center justify-center overflow-hidden bg-slate-950 aspect-[210/95] min-h-[220px] max-h-[380px]"
      >
        {src ? (
          <img
            src={src}
            alt={design.facadeName || "Architectural Facade Render"}
            className={`w-full h-full object-cover transition-all duration-300 ${isDoubleOrSplit ? "object-[center_42%]" : "object-center"}`}
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
  );
}
