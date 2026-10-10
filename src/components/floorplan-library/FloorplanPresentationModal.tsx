import { useState, useEffect } from "react";
import {
  X,
  FlipHorizontal,
  Home,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Calculator,
  Compass,
  FileText,
  Zap,
  Layers,
} from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { FloorplanLibraryItem } from "@/lib/floorplan-library/floorplanLibraryEngine";

interface FloorplanPresentationModalProps {
  item: FloorplanLibraryItem | null;
  onClose: () => void;
  isLight: boolean;
}

export function FloorplanPresentationModal({
  item,
  onClose,
  isLight,
}: FloorplanPresentationModalProps) {
  const navigate = useNavigate();
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(item?.defaultVariantIndex || 0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isMirrored, setIsMirrored] = useState(false);
  const [showFacade, setShowFacade] = useState(false);

  useEffect(() => {
    if (item?.defaultVariantIndex !== undefined) {
      setSelectedVariantIndex(item.defaultVariantIndex);
    }
  }, [item?.defaultVariantIndex, item?.id]);

  if (!item) return null;

  const activeVariant = item.variants?.[selectedVariantIndex] ?? item.variants?.[0] ?? item;

  const handleLaunchQuoting = () => {
    try {
      const bridge = {
        designName: activeVariant.label,
        standardDesignM2: activeVariant.totalM2,
        totalM2: activeVariant.totalM2,
        housingType: activeVariant.housingType,
        floorplanUrl: activeVariant.url,
      };
      sessionStorage.setItem("hudson_plan_bridge", JSON.stringify(bridge));
      localStorage.setItem("hudson_plan_bridge", JSON.stringify(bridge));
      navigate({ to: "/quote-builder" });
    } catch {
      navigate({ to: "/quote-builder" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-7xl max-h-[96vh] rounded-3xl border flex flex-col overflow-hidden shadow-2xl ${
          isLight ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-slate-950 border-slate-800 text-white"
        }`}
      >
        {/* Modal Header */}
        <header
          className={`px-6 py-4 border-b flex flex-wrap items-center justify-between gap-4 ${
            isLight ? "border-slate-200 bg-white" : "border-slate-800 bg-slate-900/80"
          }`}
        >
          {/* Left Title & Category */}
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                  {activeVariant.housingType}
                </span>
                {activeVariant.isBtbReady && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold font-mono flex items-center gap-1">
                    <Zap className="h-3 w-3 fill-current text-amber-400" />
                    BTB Ready
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black">{activeVariant.label}</h2>
            </div>
          </div>

          {/* Center: Prominent Size Variant Selector at the top of the screen */}
          {item.variants && item.variants.length > 1 && (
            <div
              className={`flex items-center p-1 rounded-xl border flex-wrap gap-1 ${
                isLight ? "bg-slate-100 border-slate-200" : "bg-slate-900 border-slate-800"
              }`}
            >
              <span className="text-[10px] uppercase font-bold text-slate-400 px-2 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-indigo-400" />
                Select Size:
              </span>
              {item.variants.map((v, idx) => {
                const active = selectedVariantIndex === idx;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedVariantIndex(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      active
                        ? "bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black shadow-md scale-105"
                        : isLight
                        ? "text-slate-600 hover:text-slate-950 hover:bg-slate-200/70"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/70"
                    }`}
                  >
                    <span className="font-extrabold">{v.sizeLabel}</span>
                    <span className="text-[10px] opacity-80 font-bold">sq</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div
              className={`flex items-center p-1 rounded-xl border ${
                isLight ? "bg-slate-100 border-slate-200" : "bg-slate-900 border-slate-800"
              }`}
            >
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.2))}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <span className="text-[11px] font-mono px-1.5 font-bold">{Math.round(zoomLevel * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer ml-1"
                title="Reset Zoom"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Mirror / Flip */}
            <button
              type="button"
              onClick={() => setIsMirrored(!isMirrored)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                isMirrored
                  ? "bg-cyan-500 text-slate-950 border-cyan-400"
                  : isLight
                  ? "bg-white border-slate-200 text-slate-700"
                  : "bg-slate-900 border-slate-800 text-slate-300"
              }`}
            >
              <FlipHorizontal className="h-3.5 w-3.5" />
              <span>Flip (LH/RH)</span>
            </button>

            {/* Facade Switch */}
            {activeVariant.facadeUrl && (
              <button
                type="button"
                onClick={() => setShowFacade(!showFacade)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  showFacade
                    ? "bg-amber-500 text-slate-950 border-amber-400"
                    : isLight
                    ? "bg-white border-slate-200 text-slate-700"
                    : "bg-slate-900 border-slate-800 text-slate-300"
                }`}
              >
                <Home className="h-3.5 w-3.5" />
                <span>{showFacade ? "Floorplan" : "Classic Facade"}</span>
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isLight ? "hover:bg-slate-200 text-slate-600" : "hover:bg-slate-800 text-slate-400 hover:text-white"
              }`}
              title="Close Presentation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Modal Body: Interactive Zoomable Canvas */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-slate-900/20 select-none">
          <div
            className="w-full h-full min-h-[600px] flex items-center justify-center bg-white rounded-2xl p-6 shadow-inner border border-slate-200 transition-transform duration-200"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: "center center",
            }}
          >
            {showFacade && activeVariant.facadeUrl ? (
              <img
                src={activeVariant.facadeUrl}
                alt={`${activeVariant.label} Facade`}
                className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-xl"
              />
            ) : (
              <img
                src={activeVariant.url}
                alt={`${activeVariant.label} Floorplan Full High Res`}
                className={`max-h-[75vh] max-w-full object-contain transition-transform duration-300 ${
                  isMirrored ? "scale-x-[-1]" : ""
                } filter contrast-[1.04]`}
              />
            )}
          </div>
        </div>

        {/* Modal Footer: Pricing Across All Inclusions Tiers + Action Buttons */}
        <div
          className={`px-6 py-4 border-t flex flex-col md:flex-row items-center justify-between gap-4 ${
            isLight ? "border-slate-200 bg-white" : "border-slate-800 bg-slate-900/80"
          }`}
        >
          {/* Multi-Tier Inclusions Pricing Grid */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                Pricelist:
              </span>
              <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
                H1: ${activeVariant.prices.h1.toLocaleString()}
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-mono font-black shadow-xs">
                H2: ${activeVariant.prices.h2.toLocaleString()}
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-mono font-bold">
                H3: ${activeVariant.prices.h3.toLocaleString()}
              </div>
            </div>
            <div className="text-xs text-slate-400 hidden lg:inline">
              Width: <strong className={isLight ? "text-slate-900" : "text-white"}>{activeVariant.widthM}m</strong> • Depth:{" "}
              <strong className={isLight ? "text-slate-900" : "text-white"}>{activeVariant.lengthM}m</strong> • Size:{" "}
              <strong className="text-emerald-400">{activeVariant.totalM2.toFixed(1)}m²</strong>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleLaunchQuoting}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-slate-950 text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Calculator className="h-3.5 w-3.5" />
              <span>Quote This Plan</span>
            </button>
            <Link
              to="/flyer"
              search={{ design: activeVariant.label }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <FileText className="h-3.5 w-3.5 text-amber-400" />
              <span>Package Studio</span>
            </Link>
            <Link
              to="/site-studio"
              search={{ design: activeVariant.id }}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Compass className="h-3.5 w-3.5 text-cyan-400" />
              <span>Site</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
