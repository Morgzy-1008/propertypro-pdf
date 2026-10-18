import { useState, useEffect, useMemo } from "react";
import {
  X,
  FlipHorizontal,
  Home,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Calculator,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import type { FloorplanLibraryItem } from "@/lib/floorplan-library/floorplanLibraryEngine";
import { getActiveStaffUser } from "@/lib/authSession";
import { getActiveDivision } from "@/lib/divisionContext";
import { getFacadesForDesignAndHousingType } from "@/components/quoting/QuoteDesignStep";
import { findFacadeForDesign } from "@/lib/quoting/facadeLookup";
import {
  DesignFacadeLibraryModal,
  type DesignFacadeOption,
} from "./DesignFacadeLibraryModal";
import {
  primeFacadeThumbnails,
  preloadHighResFacades,
} from "@/lib/floorplan-library/facadeThumbnailCache";

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
  const staffUser = getActiveStaffUser();
  const divisionContext =
    (staffUser?.division || staffUser?.state || getActiveDivision()) === "NSW" ? "NSW" : "QLD";

  const [selectedVariantIndex, setSelectedVariantIndex] = useState(
    item?.defaultVariantIndex || 0
  );
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isMirrored, setIsMirrored] = useState(false);
  const [showFacade, setShowFacade] = useState(false);
  const [currentFacadeIndex, setCurrentFacadeIndex] = useState(0);
  const [isFacadeModalOpen, setIsFacadeModalOpen] = useState(false);

  useEffect(() => {
    if (item?.defaultVariantIndex !== undefined) {
      setSelectedVariantIndex(item.defaultVariantIndex);
    }
  }, [item?.defaultVariantIndex, item?.id]);

  if (!item) return null;

  const activeVariant = item.variants?.[selectedVariantIndex] ?? item.variants?.[0] ?? item;

  // Derive all suitable and verified architectural facades for this design
  const eligibleFacades: DesignFacadeOption[] = useMemo(() => {
    const isDouble =
      item.housingType === "Double Storey" ||
      item.housingType === "double" ||
      Boolean(activeVariant.label && /cinnamon|mauve/i.test(activeVariant.label));

    const suitable = getFacadesForDesignAndHousingType(
      activeVariant.label || item.designName,
      item.housingType,
      divisionContext
    );

    return suitable.map((f, idx) => {
      const resolved = findFacadeForDesign(f.name, isDouble, item.housingType, activeVariant.label);
      return {
        id: resolved?.id || f.id || `${f.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${idx}`,
        name: f.name,
        uplift: f.uplift,
        range: f.range || resolved?.range || item.housingType,
        note: f.note,
        url: resolved?.url || f.url || "/facades/classic-double-garage.jpg",
      };
    });
  }, [item, activeVariant.label, divisionContext]);

  // Active facade item (falls back to Classic)
  const activeFacade: DesignFacadeOption =
    eligibleFacades[currentFacadeIndex] || {
      name: "Classic",
      uplift: 0,
      url: activeVariant.facadeUrl || "/facades/classic-double-garage.jpg",
    };

  // Pre-prime thumbnails for rapid 0ms loading in the library modal
  useEffect(() => {
    if (eligibleFacades.length > 0) {
      primeFacadeThumbnails(eligibleFacades.map((f) => f.url));
    }
  }, [eligibleFacades]);

  // Preload current, adjacent, and next high-resolution renders for instantaneous switching
  useEffect(() => {
    if (eligibleFacades.length === 0) return;
    const len = eligibleFacades.length;
    const prevIdx = (currentFacadeIndex - 1 + len) % len;
    const nextIdx = (currentFacadeIndex + 1) % len;
    const nextNextIdx = (currentFacadeIndex + 2) % len;
    const urls = [
      eligibleFacades[currentFacadeIndex]?.url,
      eligibleFacades[nextIdx]?.url,
      eligibleFacades[prevIdx]?.url,
      eligibleFacades[nextNextIdx]?.url,
    ].filter(Boolean) as string[];
    preloadHighResFacades(urls);
  }, [showFacade, currentFacadeIndex, eligibleFacades]);

  // Keyboard navigation for Left/Right arrow keys
  useEffect(() => {
    if (!showFacade || eligibleFacades.length <= 1) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFacadeModalOpen) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setCurrentFacadeIndex((prev) => (prev > 0 ? prev - 1 : eligibleFacades.length - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setCurrentFacadeIndex((prev) => (prev < eligibleFacades.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showFacade, eligibleFacades.length, isFacadeModalOpen]);

  const handlePrevFacade = () => {
    if (eligibleFacades.length <= 1) return;
    setCurrentFacadeIndex((prev) => (prev > 0 ? prev - 1 : eligibleFacades.length - 1));
  };

  const handleNextFacade = () => {
    if (eligibleFacades.length <= 1) return;
    setCurrentFacadeIndex((prev) => (prev < eligibleFacades.length - 1 ? prev + 1 : 0));
  };

  const handleLaunchQuoting = () => {
    try {
      const bridge = {
        designName: activeVariant.label,
        standardDesignM2: activeVariant.totalM2,
        totalM2: activeVariant.totalM2,
        housingType: (activeVariant as any).housingType || item.housingType,
        floorplanUrl: activeVariant.url,
        facadeName: activeFacade?.name || "Classic",
        facadePrice: activeFacade?.uplift || 0,
        facadeImageUrl: activeFacade?.url || activeVariant.facadeUrl,
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
                  {item.housingType}
                </span>
                {showFacade && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 text-[10px] font-mono font-bold flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5" />
                    {activeFacade.name} Facade
                    {activeFacade.uplift > 0 && ` (+$${activeFacade.uplift.toLocaleString()})`}
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
                    onClick={() => {
                      setSelectedVariantIndex(idx);
                      setCurrentFacadeIndex(0);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      active
                        ? "bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black shadow-md scale-105"
                        : isLight
                        ? "text-slate-600 hover:text-slate-950 hover:bg-slate-200/70"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/70"
                    }`}
                  >
                    <span className="font-extrabold">{v.sizeLabel}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {!showFacade ? (
              <>
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
                  <span className="text-[11px] font-mono px-1.5 font-bold">
                    {Math.round(zoomLevel * 100)}%
                  </span>
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
                      ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                      : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <FlipHorizontal className="h-3.5 w-3.5" />
                  <span>Flip (LH/RH)</span>
                </button>

                {/* View Facades Switch Button */}
                <button
                  type="button"
                  onClick={() => setShowFacade(true)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-amber-400/80 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                  title={`View all ${eligibleFacades.length} facades for ${activeVariant.label}`}
                >
                  <Home className="h-3.5 w-3.5" />
                  <span>View Facades</span>
                </button>
              </>
            ) : (
              <>
                {/* Switch back to Floorplan */}
                <button
                  type="button"
                  onClick={() => setShowFacade(false)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    isLight
                      ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                      : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                  }`}
                  title="Switch to floorplan view"
                >
                  <Layers className="h-3.5 w-3.5 text-indigo-400" />
                  <span>View Floorplan</span>
                </button>

                {/* View Facade Library in this tab */}
                <button
                  type="button"
                  onClick={() => setIsFacadeModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-black border border-amber-400 bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all cursor-pointer flex items-center gap-1.5 shadow-xs active:scale-95"
                  title={`Browse full facade library (${eligibleFacades.length} available)`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>View Facade Library</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-950/20 text-[10px] font-mono font-black">
                    {eligibleFacades.length}
                  </span>
                </button>
              </>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isLight
                  ? "hover:bg-slate-200 text-slate-600"
                  : "hover:bg-slate-800 text-slate-400 hover:text-white"
              }`}
              title="Close Presentation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Modal Body: Interactive Canvas / Large Format Facade Viewer */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-slate-900/20 select-none relative">
          {showFacade ? (
            <div className="relative w-full h-full min-h-[600px] flex flex-col items-center justify-between p-2 sm:p-4 select-none">
              {/* Left / Right Side Arrows */}
              {eligibleFacades.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevFacade();
                    }}
                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-3.5 rounded-2xl bg-slate-950/80 hover:bg-slate-900 text-white hover:text-amber-400 border border-slate-700/80 hover:border-amber-400 shadow-2xl backdrop-blur-md transition-all cursor-pointer group active:scale-90"
                    title="Previous Facade (Left Arrow)"
                    aria-label="Previous Facade"
                  >
                    <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8 group-hover:-translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextFacade();
                    }}
                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 p-2.5 sm:p-3.5 rounded-2xl bg-slate-950/80 hover:bg-slate-900 text-white hover:text-amber-400 border border-slate-700/80 hover:border-amber-400 shadow-2xl backdrop-blur-md transition-all cursor-pointer group active:scale-90"
                    title="Next Facade (Right Arrow)"
                    aria-label="Next Facade"
                  >
                    <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </>
              )}

              {/* Large Format Image Container */}
              <div className="flex-1 w-full flex items-center justify-center relative overflow-hidden py-2">
                <img
                  key={activeFacade.url}
                  src={activeFacade.url}
                  alt={`${activeVariant.label} - ${activeFacade.name} Facade`}
                  fetchPriority="high"
                  decoding="async"
                  className="max-h-[66vh] max-w-full object-contain rounded-2xl shadow-2xl transition-all duration-300 filter contrast-[1.03]"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/facades/classic-double-garage.jpg";
                  }}
                />
              </div>

              {/* Bottom Floating Control Bar: Facade Info + Library Shortcut */}
              <div className="relative z-20 flex flex-wrap items-center justify-center gap-3 mt-2 px-4 py-2.5 rounded-2xl bg-slate-950/85 border border-slate-800 backdrop-blur-md shadow-xl text-white">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-400">
                    Facade {currentFacadeIndex + 1} of {eligibleFacades.length}
                  </span>
                  <span className="font-extrabold text-sm text-white">
                    {activeFacade.name} Facade
                  </span>
                  {activeFacade.uplift === 0 ? (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black font-mono">
                      Standard Included
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black font-mono">
                      +${activeFacade.uplift.toLocaleString()}
                    </span>
                  )}
                </div>

                <div className="h-4 w-px bg-slate-700 hidden sm:block" />

                <button
                  type="button"
                  onClick={() => setIsFacadeModalOpen(true)}
                  className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                  title="Browse full facade library in grid"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>View Facade Library</span>
                </button>
              </div>
            </div>
          ) : (
            <div
              className="w-full h-full min-h-[600px] flex items-center justify-center bg-white rounded-2xl p-6 shadow-inner border border-slate-200 transition-transform duration-200"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: "center center",
              }}
            >
              <img
                src={activeVariant.url}
                alt={`${activeVariant.label} Floorplan Full High Res`}
                className={`max-h-[75vh] max-w-full object-contain transition-transform duration-300 ${
                  isMirrored ? "scale-x-[-1]" : ""
                } filter contrast-[1.04]`}
              />
            </div>
          )}
        </div>

        {/* Modal Footer: Pricing Across All Inclusions Tiers + Quote This Plan Button */}
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
              <div className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-mono font-bold">
                FHB: ${(activeVariant.prices.ss + (showFacade ? activeFacade.uplift : 0)).toLocaleString()}
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
                H1: ${(activeVariant.prices.h1 + (showFacade ? activeFacade.uplift : 0)).toLocaleString()}
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-mono font-black shadow-xs">
                H2: ${(activeVariant.prices.h2 + (showFacade ? activeFacade.uplift : 0)).toLocaleString()}
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-mono font-bold">
                H3: ${(activeVariant.prices.h3 + (showFacade ? activeFacade.uplift : 0)).toLocaleString()}
              </div>
            </div>
            <div className="text-xs text-slate-400 hidden lg:inline">
              Width: <strong className={isLight ? "text-slate-900" : "text-white"}>{activeVariant.widthM}m</strong> • Depth:{" "}
              <strong className={isLight ? "text-slate-900" : "text-white"}>{activeVariant.lengthM}m</strong> • Size:{" "}
              <strong className="text-emerald-400">{activeVariant.totalM2.toFixed(1)}m²</strong>
            </div>
          </div>

          {/* Quick Actions: Only Quote This Plan */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleLaunchQuoting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-slate-950 text-xs sm:text-sm font-black shadow-lg transition-all cursor-pointer flex items-center gap-2 active:scale-95"
            >
              <Calculator className="h-4 w-4" />
              <span>Quote This Plan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Full Facade Library for this design */}
      <DesignFacadeLibraryModal
        isOpen={isFacadeModalOpen}
        onClose={() => setIsFacadeModalOpen(false)}
        designName={activeVariant.label || item.designName}
        housingType={item.housingType}
        division={divisionContext}
        currentFacadeName={activeFacade.name}
        onSelectFacade={(facade) => {
          const matchIdx = eligibleFacades.findIndex(
            (f) => f.name.toLowerCase() === facade.name.toLowerCase()
          );
          if (matchIdx !== -1) {
            setCurrentFacadeIndex(matchIdx);
          }
          setShowFacade(true);
        }}
        isLight={isLight}
      />
    </div>
  );
}
