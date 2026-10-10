import { useState, useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Maximize2,
  FlipHorizontal,
  Home,
  FileText,
  Calculator,
  Compass,
  Zap,
  Share2,
  Check,
  Bed,
  Bath,
  Car,
  Layers,
  ArrowRight,
} from "lucide-react";
import type {
  FloorplanLibraryItem,
  InclusionsTier,
  ViewMode,
} from "@/lib/floorplan-library/floorplanLibraryEngine";
import { getActiveTierPrice } from "@/lib/floorplan-library/floorplanLibraryEngine";

interface FloorplanCardProps {
  item: FloorplanLibraryItem;
  activeTier: InclusionsTier;
  viewMode: ViewMode;
  onOpenZoom: (item: FloorplanLibraryItem) => void;
  isLight: boolean;
}

export function FloorplanCard({
  item,
  activeTier,
  viewMode,
  onOpenZoom,
  isLight,
}: FloorplanCardProps) {
  const navigate = useNavigate();
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(item.defaultVariantIndex || 0);
  const [isMirrored, setIsMirrored] = useState(false);
  const [showFacade, setShowFacade] = useState(false);
  const [cardTierOverride, setCardTierOverride] = useState<InclusionsTier | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync selected variant when defaultVariantIndex changes from filter updates
  useEffect(() => {
    if (item.defaultVariantIndex !== undefined) {
      setSelectedVariantIndex(item.defaultVariantIndex);
    }
  }, [item.defaultVariantIndex, item.id]);

  // Active variant (falls back to first variant or item)
  const activeVariant = item.variants?.[selectedVariantIndex] ?? item.variants?.[0] ?? item;

  // Sync card tier when parent activeTier changes, unless overridden locally
  const currentTier = cardTierOverride ?? activeTier;
  const currentPrice = getActiveTierPrice(activeVariant, currentTier);

  // Format currency
  const formattedPrice = currentPrice > 0 ? `$${currentPrice.toLocaleString()}` : "Price on Application";

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

  const handleCopyLink = () => {
    try {
      const url = `${window.location.origin}/floorplan-library?design=${encodeURIComponent(activeVariant.label)}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(`Copied shareable link for ${activeVariant.label}!`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const isFeed = viewMode === "feed";

  return (
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
      <div className="p-5 sm:p-6 pb-4 border-b border-inherit">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          {/* Title & Category */}
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] font-bold text-slate-400">
                {activeVariant.housingType}
              </span>
              {activeVariant.isBtbReady && (
                <span
                  className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/15 to-orange-500/15 border border-amber-500/40 text-amber-400 text-[10px] font-bold font-mono flex items-center gap-1 shadow-xs"
                  title={activeVariant.btbDescription || "Built to boundary zero-lot garage ready"}
                >
                  <Zap className="h-3 w-3 fill-current text-amber-400" />
                  BTB Ready
                </span>
              )}
              {isMirrored && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold font-mono">
                  Mirrored (LH/RH)
                </span>
              )}
            </div>

            <h2
              className={`font-black tracking-tight group-hover:text-indigo-400 transition-colors ${
                viewMode === "grid-3" ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
              }`}
            >
              {activeVariant.label}
            </h2>
          </div>

          {/* Price Callout with Inclusions Switcher */}
          <div className="flex flex-col sm:items-end">
            <div className="flex items-baseline gap-1.5">
              <span
                className={`font-black font-mono text-emerald-400 tracking-tight ${
                  viewMode === "grid-3" ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
                }`}
              >
                {formattedPrice}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tier:</span>
              {(["H1", "H2", "H3", "HBS"] as InclusionsTier[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setCardTierOverride(t)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    currentTier === t
                      ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                      : isLight
                      ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      : "bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                  title={`Switch to ${t} pricing`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SIZE VARIANTS SELECTOR: Click any size right at the top of the plan to switch sizes */}
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
                  onClick={() => setSelectedVariantIndex(idx)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? "bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black shadow-md scale-105"
                      : isLight
                      ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                      : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
                  }`}
                  title={`${v.label} • ${v.totalM2.toFixed(1)}m² (${v.squares}sq) • Width ${v.widthM}m`}
                >
                  <span>{v.sizeLabel}</span>
                  <span className={`text-[10px] font-mono ${isSelected ? "opacity-90 font-bold" : "text-slate-400"}`}>
                    ({v.squares}sq)
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Telemetry Dimensions & Features Pill Grid */}
        <div
          className={`gap-1.5 mt-3 pt-3 border-t border-dashed border-inherit ${
            viewMode === "grid-3"
              ? "grid grid-cols-4 sm:grid-cols-7"
              : "grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mt-4"
          }`}
        >
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

          {/* Min Lot Frontage */}
          <div
            className={`p-1.5 rounded-xl border flex flex-col justify-center items-center text-center ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-slate-800/80"
            }`}
          >
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Min Lot</span>
            <span className="text-xs font-black font-mono text-amber-400">
              {activeVariant.frontageM ? `${activeVariant.frontageM.toFixed(1)}m` : "12.5m"}
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

      {/* Main Floorplan Large Display Viewport */}
      <div className="relative p-3 sm:p-5 flex-1 flex flex-col justify-center items-center">
        {/* Floating Quick Action Overlay at top-right of canvas */}
        <div className="absolute top-6 right-6 z-20 flex items-center gap-2">
          {/* Facade / Floorplan Switcher */}
          {activeVariant.facadeUrl && (
            <button
              type="button"
              onClick={() => setShowFacade(!showFacade)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5 border backdrop-blur-md ${
                showFacade
                  ? "bg-amber-500 text-slate-950 border-amber-400"
                  : isLight
                  ? "bg-white/90 border-slate-200 text-slate-700 hover:bg-white"
                  : "bg-slate-900/90 border-slate-700 text-slate-200 hover:bg-slate-800"
              }`}
              title="Toggle between Floorplan and Classic Facade render"
            >
              <Home className="h-3.5 w-3.5" />
              <span>{showFacade ? "View Floorplan" : "View Facade"}</span>
            </button>
          )}

          {/* Horizontal Flip (LH / RH) */}
          <button
            type="button"
            onClick={() => setIsMirrored(!isMirrored)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5 border backdrop-blur-md ${
              isMirrored
                ? "bg-cyan-500 text-slate-950 border-cyan-400"
                : isLight
                ? "bg-white/90 border-slate-200 text-slate-700 hover:bg-white"
                : "bg-slate-900/90 border-slate-700 text-slate-200 hover:bg-slate-800"
            }`}
            title="Mirror / Flip plan horizontally (LH / RH lot orientation)"
          >
            <FlipHorizontal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Flip</span>
          </button>

          {/* Zoom Modal Button */}
          <button
            type="button"
            onClick={() =>
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
              })
            }
            className={`p-2 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center border backdrop-blur-md ${
              isLight
                ? "bg-white/90 border-slate-200 text-slate-700 hover:bg-white"
                : "bg-slate-900/90 border-slate-700 text-slate-200 hover:bg-slate-800"
            }`}
            title="Inspect in full-screen zoom"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* The Architectural High-Contrast Canvas */}
        <div
          className={`w-full rounded-2xl p-3 sm:p-5 flex items-center justify-center overflow-hidden border shadow-inner transition-all duration-300 ${
            viewMode === "feed"
              ? "h-[540px] sm:h-[640px] md:h-[700px] lg:h-[750px]"
              : viewMode === "grid-2"
              ? "h-[450px] sm:h-[500px]"
              : "h-[360px] sm:h-[390px]"
          } ${
            isLight
              ? "bg-white border-slate-200"
              : "bg-white border-slate-300"
          }`}
        >
          {showFacade && activeVariant.facadeUrl ? (
            <img
              src={activeVariant.facadeUrl}
              alt={`${activeVariant.label} Classic Facade Render`}
              className="max-h-full max-w-full object-contain rounded-xl shadow-lg transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <img
              src={activeVariant.url}
              alt={`${activeVariant.label} Architectural Floorplan`}
              className={`max-h-full max-w-full object-contain transition-transform duration-300 ${
                isMirrored ? "scale-x-[-1]" : ""
              } filter contrast-[1.04]`}
              loading="lazy"
            />
          )}
        </div>

        {/* Plan Caption & Dimensions Reminder */}
        <div className="w-full flex items-center justify-between pt-2 px-1 text-[11px] text-slate-400">
          <span className="truncate pr-2">
            {activeVariant.label} • {activeVariant.housingType} • {activeVariant.totalM2.toFixed(1)} m² ({activeVariant.squares} sq)
          </span>
          <span className="font-mono shrink-0">
            Lot: {activeVariant.frontageM || 12.5}m • {activeVariant.widthM}m × {activeVariant.lengthM}m
          </span>
        </div>
      </div>

      {/* Card Action Bar */}
      <div
        className={`px-4 sm:px-5 py-3 border-t flex flex-wrap items-center justify-between gap-2 ${
          isLight ? "border-slate-100 bg-slate-50/70" : "border-slate-800/80 bg-slate-900/40"
        }`}
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Instant Quoting Launch */}
          <button
            type="button"
            onClick={handleLaunchQuoting}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1 active:scale-95"
          >
            <Calculator className="h-3.5 w-3.5" />
            <span>Quote</span>
            <ArrowRight className="h-3 w-3 ml-0.5" />
          </button>

          {/* Package Studio (Flyer) Launch */}
          <Link
            to="/flyer"
            search={{ design: activeVariant.label }}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
              isLight
                ? "bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-xs"
                : "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200"
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-amber-400" />
            <span>Flyer</span>
          </Link>

          {/* Siting Launch */}
          <Link
            to="/site-studio"
            search={{ design: activeVariant.id }}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
              isLight
                ? "bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-xs"
                : "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200"
            }`}
          >
            <Compass className="h-3.5 w-3.5 text-cyan-400" />
            <span>Site</span>
          </Link>
        </div>

        {/* Share / Copy Client Link */}
        <button
          type="button"
          onClick={handleCopyLink}
          className={`p-1.5 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
            copied
              ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
              : isLight
              ? "bg-white hover:bg-slate-100 border-slate-300 text-slate-600"
              : "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
          }`}
          title="Copy direct shareable link for this plan"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Share2 className="h-3.5 w-3.5" />}
          <span className="text-[11px] hidden sm:inline">{copied ? "Copied" : "Share"}</span>
        </button>
      </div>
    </div>
  );
}
