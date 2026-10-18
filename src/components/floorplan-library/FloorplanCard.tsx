import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Maximize2,
  FlipHorizontal,
  Home,
  Calculator,
  Share2,
  Check,
  Bed,
  Bath,
  Car,
  Layers,
  ArrowRight,
  ZoomIn,
  Sparkles,
  Eye,
  Scaling,
  MessageSquare,
} from "lucide-react";
import type {
  FloorplanLibraryItem,
  InclusionsTier,
} from "@/lib/floorplan-library/floorplanLibraryEngine";
import { getActiveTierPrice } from "@/lib/floorplan-library/floorplanLibraryEngine";
import { useTrimmedFloorplan } from "@/lib/floorplan-library/floorplanImageTrimmer";
import {
  DesignFacadeLibraryModal,
  type DesignFacadeOption,
} from "./DesignFacadeLibraryModal";
import { getFacadesForDesignAndHousingType } from "@/components/quoting/QuoteDesignStep";
import type { Division } from "@/lib/divisionContext";
import type { FloorplanRecord } from "@/components/flyer/floorplans.data";

interface FloorplanCardProps {
  item: FloorplanLibraryItem;
  activeTier?: InclusionsTier;
  division?: Division;
  onOpenZoom: (item: FloorplanLibraryItem) => void;
  isLight: boolean;
  isClientMode?: boolean;
  hidePricing?: boolean;
  consultantId?: string;
  onEnquire?: (variant: FloorplanRecord, facadeName?: string) => void;
}

export function FloorplanCard({
  item,
  activeTier = "H2",
  division = "QLD",
  onOpenZoom,
  isLight,
  isClientMode = false,
  hidePricing = false,
  consultantId,
  onEnquire,
}: FloorplanCardProps) {
  const navigate = useNavigate();
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(item.defaultVariantIndex || 0);
  const [isMirrored, setIsMirrored] = useState(false);
  const [showFacade, setShowFacade] = useState(false);
  const [cardTierOverride, setCardTierOverride] = useState<InclusionsTier | null>(null);
  const [copied, setCopied] = useState(false);
  // Scale Mode: "scale" (1:1 Architectural Scale, default) vs "fit" (Full container fit)
  const [scaleMode, setScaleMode] = useState<"scale" | "fit">("scale");

  // Selected custom facade from the design's facade library
  const [selectedFacade, setSelectedFacade] = useState<DesignFacadeOption | null>(null);
  const [isFacadeModalOpen, setIsFacadeModalOpen] = useState(false);

  // Sync selected variant when defaultVariantIndex changes from filter updates
  useEffect(() => {
    if (item.defaultVariantIndex !== undefined) {
      setSelectedVariantIndex(item.defaultVariantIndex);
    }
  }, [item.defaultVariantIndex, item.id]);

  // Active variant (falls back to first variant or item)
  const activeVariant = item.variants?.[selectedVariantIndex] ?? item.variants?.[0] ?? item;

  // Trimmed floorplan URL (removes excess transparent/white padding in browser)
  const trimmedPlanUrl = useTrimmedFloorplan(activeVariant.url);

  // Available facades count for this specific design
  const eligibleFacades = useMemo(() => {
    return getFacadesForDesignAndHousingType(
      activeVariant.label || item.designName,
      item.housingType,
      division
    );
  }, [activeVariant.label, item.designName, item.housingType, division]);

  // Active facade render and name
  const activeFacadeUrl = selectedFacade?.url || activeVariant.facadeUrl || "/facades/classic-double-garage.jpg";
  const activeFacadeName = selectedFacade?.name || "Classic";
  const facadeUplift = selectedFacade ? selectedFacade.uplift : 0;

  // Sync card tier when parent activeTier changes, unless overridden locally
  const currentTier = cardTierOverride ?? activeTier;
  const basePrice = getActiveTierPrice(activeVariant, currentTier);
  const currentPrice = basePrice > 0 ? basePrice + facadeUplift : 0;

  // Format currency
  const formattedPrice =
    currentPrice > 0 ? `$${currentPrice.toLocaleString()}` : "Price on Application";

  // Architectural scale factor:
  // Standard catalog reference max house length = 26.0 meters
  const MAX_REF_LENGTH = 26.0;
  const houseLength = activeVariant.lengthM || 22.0;
  const architecturalScale = Math.min(1.0, Math.max(0.38, houseLength / MAX_REF_LENGTH));

  const handleLaunchQuoting = () => {
    try {
      const bridge = {
        designName: activeVariant.label,
        standardDesignM2: activeVariant.totalM2,
        totalM2: activeVariant.totalM2,
        housingType: (activeVariant as any).housingType || item.housingType,
        floorplanUrl: activeVariant.url,
        facadeName: activeFacadeName,
        facadePrice: facadeUplift,
        facadeImageUrl: activeFacadeUrl,
      };
      sessionStorage.setItem("hudson_plan_bridge", JSON.stringify(bridge));
      localStorage.setItem("hudson_plan_bridge", JSON.stringify(bridge));
      navigate({ to: "/quote-builder" });
    } catch {
      navigate({ to: "/quote-builder" });
    }
  };

  const handleCopyLink = () => {
    try {
      const c =
        consultantId ||
        (typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("c")
          : null) ||
        (division === "NSW" ? "steve-slisar" : "morgan-hales");
      const url = isClientMode
        ? `${window.location.origin}/floorplans?c=${encodeURIComponent(c)}&design=${encodeURIComponent(activeVariant.label)}`
        : `${window.location.origin}/floorplan-library?design=${encodeURIComponent(activeVariant.label)}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(`Copied shareable link for ${activeVariant.label}!`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <>
      <div
        id={`plan-${item.id}`}
        className={`group relative rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col shadow-xl ${
          isLight
            ? "bg-white border-slate-200/90 text-slate-900 shadow-slate-200/60 hover:shadow-2xl hover:border-indigo-300"
            : "bg-slate-950/90 border-slate-800/90 text-white shadow-black/80 hover:border-indigo-500/50 hover:shadow-indigo-500/10"
        }`}
      >
        {/* Top Edge Ambient Laser Beam */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent group-hover:via-indigo-400 transition-all duration-500" />

        {/* Card Header: Title, Badges, Metrics */}
        <div className="p-5 pb-4 border-b border-inherit">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            {/* Title & Category */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] font-bold text-slate-400">
                  {item.housingType}
                </span>
                {isMirrored && (
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold font-mono">
                    Mirrored (LH/RH)
                  </span>
                )}
                {showFacade && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 text-[10px] font-bold font-mono flex items-center gap-1">
                    <Sparkles className="h-2.5 w-2.5" />
                    {activeFacadeName}
                    {facadeUplift > 0 && ` (+$${facadeUplift.toLocaleString()})`}
                  </span>
                )}
              </div>

              <h2 className="font-black tracking-tight text-xl group-hover:text-indigo-400 transition-colors">
                {activeVariant.label}
              </h2>
            </div>

            {/* Price Callout with Direct Action Button */}
            <div className="flex flex-col sm:items-end">
              <div className="flex items-center gap-2">
                {!hidePricing && (
                  <span className="font-black font-mono text-emerald-400 tracking-tight text-xl">
                    {formattedPrice}
                  </span>
                )}
                {isClientMode ? (
                  <button
                    type="button"
                    onClick={() => onEnquire?.(activeVariant, selectedFacade?.name || (showFacade ? "Classic Facade" : undefined))}
                    className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-slate-950 text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                    title={`Enquire on ${activeVariant.label}`}
                  >
                    <MessageSquare className="h-3 w-3" />
                    <span>Enquire</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleLaunchQuoting}
                    className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black shadow-xs transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                    title={`Create quote for ${activeVariant.label}`}
                  >
                    <Calculator className="h-3 w-3" />
                    <span>Quote</span>
                    <ArrowRight className="h-2.5 w-2.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`p-1 px-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                    copied
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                      : isLight
                      ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-600"
                      : "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                  }`}
                  title="Copy direct shareable link"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Share2 className="h-3 w-3" />}
                </button>
              </div>
              <span className="text-[10px] font-bold text-slate-400 mt-1">
                {hidePricing ? "Floorplan & Facade Selection" : "Standard Catalogue Price"}
              </span>
            </div>
          </div>

          {/* SIZE VARIANTS SELECTOR */}
          {item.variants && item.variants.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap mt-3 pt-2.5 border-t border-dashed border-inherit">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1 mr-1">
                <Layers className="h-3.5 w-3.5 text-indigo-400" />
                Sizes:
              </span>
              {item.variants.map((v, idx) => {
                const isSelected = selectedVariantIndex === idx;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setSelectedVariantIndex(idx);
                      // Clear selected custom facade if switching sizes, to allow re-resolution
                      setSelectedFacade(null);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      isSelected
                        ? "bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black shadow-md scale-105"
                        : isLight
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                    }`}
                    title={`${v.label} • ${v.totalM2.toFixed(1)}m² • Width ${v.widthM}m`}
                  >
                    <span className="font-extrabold">{v.sizeLabel}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Telemetry Dimensions & Features: 6 Clean Metrics */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mt-3 pt-3 border-t border-dashed border-inherit">
            {/* Width */}
            <div
              className={`p-1.5 rounded-xl border flex flex-col justify-center items-center text-center ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-slate-800/80"
              }`}
            >
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Width</span>
              <span className="text-xs font-black font-mono text-cyan-400">
                {activeVariant.widthM ? `${activeVariant.widthM.toFixed(2)}m` : "—"}
              </span>
            </div>

            {/* Length */}
            <div
              className={`p-1.5 rounded-xl border flex flex-col justify-center items-center text-center ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-slate-800/80"
              }`}
            >
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Length</span>
              <span className="text-xs font-black font-mono text-cyan-400">
                {activeVariant.lengthM ? `${activeVariant.lengthM.toFixed(2)}m` : "—"}
              </span>
            </div>

            {/* Total Area */}
            <div
              className={`p-1.5 rounded-xl border flex flex-col justify-center items-center text-center ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-slate-800/80"
              }`}
            >
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Size</span>
              <span className="text-xs font-black font-mono text-emerald-400">
                {activeVariant.totalM2.toFixed(1)}m²
              </span>
            </div>

            {/* Beds */}
            <div
              className={`p-1.5 rounded-xl border flex items-center justify-center gap-1 ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-slate-800/80"
              }`}
            >
              <Bed className="h-3 w-3 text-indigo-400 shrink-0" />
              <div className="text-center">
                <span className="text-[8px] uppercase tracking-wider text-slate-400 block font-bold leading-none">
                  Beds
                </span>
                <span className="text-xs font-black font-mono">{activeVariant.beds}</span>
              </div>
            </div>

            {/* Baths */}
            <div
              className={`p-1.5 rounded-xl border flex items-center justify-center gap-1 ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-slate-800/80"
              }`}
            >
              <Bath className="h-3 w-3 text-indigo-400 shrink-0" />
              <div className="text-center">
                <span className="text-[8px] uppercase tracking-wider text-slate-400 block font-bold leading-none">
                  Baths
                </span>
                <span className="text-xs font-black font-mono">{activeVariant.baths}</span>
              </div>
            </div>

            {/* Cars */}
            <div
              className={`p-1.5 rounded-xl border flex items-center justify-center gap-1 ${
                isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-slate-800/80"
              }`}
            >
              <Car className="h-3 w-3 text-indigo-400 shrink-0" />
              <div className="text-center">
                <span className="text-[8px] uppercase tracking-wider text-slate-400 block font-bold leading-none">
                  Cars
                </span>
                <span className="text-xs font-black font-mono">{activeVariant.cars}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Floorplan Large Display Viewport: High-Contrast Architectural Canvas */}
        <div className="relative p-2 flex-1 flex flex-col justify-center items-center">
          {/* Floating Quick Action Overlay at top-right of canvas */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
            {/* Facade / Floorplan Switcher */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowFacade(!showFacade);
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1 border backdrop-blur-md ${
                showFacade
                  ? "bg-amber-500 text-slate-950 border-amber-400"
                  : isLight
                  ? "bg-white/95 border-slate-200 text-slate-700 hover:bg-white"
                  : "bg-slate-900/95 border-slate-700 text-slate-200 hover:bg-slate-800"
              }`}
              title="Toggle between Floorplan and Facade"
            >
              <Home className="h-3.5 w-3.5" />
              <span>{showFacade ? "Plan" : `Facade (${eligibleFacades.length})`}</span>
            </button>

            {/* When Facade is active: Quick button to open full Facade Library Modal */}
            {showFacade && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFacadeModalOpen(true);
                }}
                className="px-2.5 py-1 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1 border backdrop-blur-md bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 border-amber-400 hover:brightness-110 active:scale-95"
                title={`Browse full facade library for ${activeVariant.label}`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">All Facades</span>
              </button>
            )}

            {/* When Floorplan is active: Scale Mode Toggle (Uniform Architectural Scale vs Full Fit) */}
            {!showFacade && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setScaleMode((prev) => (prev === "scale" ? "fit" : "scale"));
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1 border backdrop-blur-md ${
                  scaleMode === "scale"
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-indigo-500/20"
                    : isLight
                    ? "bg-white/95 border-slate-200 text-slate-700 hover:bg-white"
                    : "bg-slate-900/95 border-slate-700 text-slate-200 hover:bg-slate-800"
                }`}
                title={
                  scaleMode === "scale"
                    ? `True 1:1 Architectural Scale (${houseLength.toFixed(1)}m length)`
                    : "Maximized Full Fit"
                }
              >
                <Scaling className="h-3.5 w-3.5" />
                <span>{scaleMode === "scale" ? "1:1 Scale" : "Fill"}</span>
              </button>
            )}

            {/* Horizontal Flip (LH / RH) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsMirrored(!isMirrored);
              }}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1 border backdrop-blur-md ${
                isMirrored
                  ? "bg-cyan-500 text-slate-950 border-cyan-400"
                  : isLight
                  ? "bg-white/95 border-slate-200 text-slate-700 hover:bg-white"
                  : "bg-slate-900/95 border-slate-700 text-slate-200 hover:bg-slate-800"
              }`}
              title="Mirror / Flip plan horizontally (LH / RH lot orientation)"
            >
              <FlipHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Flip</span>
            </button>

            {/* Zoom Modal Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenZoom({
                  ...item,
                  defaultVariantIndex: selectedVariantIndex,
                  label: activeVariant.label,
                  totalM2: activeVariant.totalM2,
                  squares: activeVariant.squares,
                  widthM: activeVariant.widthM,
                  lengthM: activeVariant.lengthM,
                  frontageM: activeVariant.frontageM,
                  url: activeVariant.url,
                  pdfUrl: activeVariant.pdfUrl,
                  prices: activeVariant.prices,
                });
              }}
              className={`p-1.5 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center border backdrop-blur-md ${
                isLight
                  ? "bg-white/95 border-slate-200 text-slate-700 hover:bg-white"
                  : "bg-slate-900/95 border-slate-700 text-slate-200 hover:bg-slate-800"
              }`}
              title="Inspect in full-screen zoom"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Scale Telemetry Pill when in 1:1 Scale Mode */}
          {!showFacade && scaleMode === "scale" && (
            <div className="absolute bottom-3 left-3 z-20 pointer-events-none">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-900/70 border border-slate-700/60 text-slate-300 backdrop-blur-xs shadow-xs">
                Uniform Scale • {houseLength.toFixed(1)}m length
              </span>
            </div>
          )}

          {/* The Canvas Area */}
          <div
            onClick={() => {
              if (showFacade) {
                // When pressing on a facade, open the full facade library modal for this design!
                setIsFacadeModalOpen(true);
              } else {
                onOpenZoom({
                  ...item,
                  defaultVariantIndex: selectedVariantIndex,
                  label: activeVariant.label,
                  totalM2: activeVariant.totalM2,
                  squares: activeVariant.squares,
                  widthM: activeVariant.widthM,
                  lengthM: activeVariant.lengthM,
                  frontageM: activeVariant.frontageM,
                  url: activeVariant.url,
                  pdfUrl: activeVariant.pdfUrl,
                  prices: activeVariant.prices,
                });
              }
            }}
            className={`w-full rounded-2xl p-3 flex items-center justify-center overflow-hidden border shadow-inner transition-all duration-300 cursor-pointer group-hover:border-indigo-500/40 h-[580px] sm:h-[620px] ${
              isLight ? "bg-white border-slate-200" : "bg-white border-slate-300"
            }`}
            title={
              showFacade
                ? `Click to view all ${eligibleFacades.length} facades for ${activeVariant.label}`
                : "Click to present in full-screen zoom"
            }
          >
            {showFacade ? (
              <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden group/facade">
                <img
                  src={activeFacadeUrl}
                  alt={`${activeVariant.label} ${activeFacadeName} Facade Render`}
                  className="max-h-full max-w-full w-auto h-auto object-contain rounded-xl shadow-lg transition-transform duration-300 group-hover/facade:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      "/facades/classic-double-garage.jpg";
                  }}
                />

                {/* Interactive Banner Overlay on Facade Render */}
                <div className="absolute bottom-3 inset-x-3 flex justify-center pointer-events-none">
                  <div className="px-3.5 py-1.5 rounded-xl bg-slate-950/85 border border-amber-500/50 text-white shadow-xl backdrop-blur-md flex items-center gap-2 text-xs font-bold transition-all duration-200 group-hover/facade:scale-105 group-hover/facade:border-amber-400">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    <span>
                      {activeFacadeName} • Press to browse {eligibleFacades.length} available facades
                    </span>
                    <ArrowRight className="h-3 w-3 text-amber-400" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center overflow-hidden">
                <div
                  className="relative flex items-center justify-center transition-all duration-300"
                  style={{
                    height: scaleMode === "scale" ? `${(architecturalScale * 100).toFixed(1)}%` : "100%",
                    maxHeight: "100%",
                    maxWidth: "100%",
                    width: "100%",
                  }}
                >
                  <img
                    src={trimmedPlanUrl || activeVariant.url}
                    alt={`${activeVariant.label} Architectural Floorplan`}
                    className={`max-h-full max-w-full w-auto h-auto object-contain transition-transform duration-300 select-none ${
                      isMirrored ? "scale-x-[-1]" : "scale-100"
                    } filter contrast-[1.08]`}
                    loading="lazy"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Design Facade Library Modal */}
      <DesignFacadeLibraryModal
        isOpen={isFacadeModalOpen}
        onClose={() => setIsFacadeModalOpen(false)}
        designName={activeVariant.label || item.designName}
        housingType={item.housingType}
        division={division}
        currentFacadeName={activeFacadeName}
        onSelectFacade={(facade) => {
          setSelectedFacade(facade);
          setShowFacade(true);
          toast.success(`Selected ${facade.name} facade for ${activeVariant.label}`);
        }}
        isLight={isLight}
      />
    </>
  );
}
