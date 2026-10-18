import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Search,
  Check,
  Sparkles,
  ExternalLink,
  Layers,
  ArrowRight,
  ShieldCheck,
  Building,
} from "lucide-react";
import { getFacadesForDesignAndHousingType } from "@/components/quoting/QuoteDesignStep";
import { findFacadeForDesign } from "@/lib/quoting/facadeLookup";
import { getActiveDivision, type Division } from "@/lib/divisionContext";
import {
  useFacadeThumbnail,
  primeFacadeThumbnails,
} from "@/lib/floorplan-library/facadeThumbnailCache";

function FacadeCardImage({
  url,
  name,
  children,
}: {
  url: string;
  name: string;
  children?: React.ReactNode;
}) {
  const thumbUrl = useFacadeThumbnail(url);
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="relative aspect-[16/9] w-full bg-slate-950 overflow-hidden">
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 animate-pulse flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-amber-500/40 animate-spin" />
        </div>
      )}
      <img
        src={thumbUrl || url}
        alt={`${name} Facade Render`}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        className={`w-full h-full object-cover object-center group-hover:scale-105 transition-all duration-300 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = "/facades/classic-double-garage.jpg";
          setIsLoaded(true);
        }}
      />
      {children}
    </div>
  );
}

export interface DesignFacadeOption {
  id?: string;
  name: string;
  uplift: number;
  url: string;
  range?: string;
  note?: string;
}

interface DesignFacadeLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  designName: string;
  housingType: string;
  division?: Division;
  currentFacadeName?: string;
  onSelectFacade: (facade: DesignFacadeOption) => void;
  isLight: boolean;
}

export function DesignFacadeLibraryModal({
  isOpen,
  onClose,
  designName,
  housingType,
  division = getActiveDivision(),
  currentFacadeName = "Classic",
  onSelectFacade,
  isLight,
}: DesignFacadeLibraryModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Load all eligible facades for this design using established filters
  const allFacades: DesignFacadeOption[] = useMemo(() => {
    const effectiveHousingType = housingType || "Single Storey";
    const effectiveDesign = designName || "";
    const isDouble =
      effectiveHousingType === "Double Storey" ||
      effectiveHousingType === "double" ||
      Boolean(effectiveDesign && /cinnamon|mauve|maroon/i.test(effectiveDesign));

    const suitable = getFacadesForDesignAndHousingType(effectiveDesign, effectiveHousingType, division);

    return suitable.map((f, idx) => {
      const resolved = findFacadeForDesign(f.name, isDouble, effectiveHousingType, effectiveDesign);
      return {
        id: resolved?.id || f.id || `${f.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${idx}`,
        name: f.name,
        uplift: f.uplift,
        range: f.range || resolved?.range || effectiveHousingType,
        note: f.note,
        url: resolved?.url || f.url || "/facades/classic-double-garage.jpg",
      };
    });
  }, [designName, housingType, division]);

  // Filtered by search query
  const filteredFacades = useMemo(() => {
    if (!searchQuery.trim()) return allFacades;
    const q = searchQuery.toLowerCase().trim();
    return allFacades.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.range && f.range.toLowerCase().includes(q)) ||
        (f.note && f.note.toLowerCase().includes(q))
    );
  }, [allFacades, searchQuery]);

  // Batch prime thumbnails from IndexedDB/cache when modal opens
  useEffect(() => {
    if (!isOpen || allFacades.length === 0) return;
    primeFacadeThumbnails(allFacades.map((f) => f.url));
  }, [isOpen, allFacades]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="facade-library-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 md:p-8 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      style={{ overscrollBehavior: "contain" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`relative w-full max-w-5xl max-h-[90vh] rounded-3xl border flex flex-col overflow-hidden shadow-2xl transition-all duration-200 ${
          isLight
            ? "bg-slate-50 border-slate-200 text-slate-900 shadow-slate-300/50"
            : "bg-slate-950 border-slate-800 text-white shadow-black/90"
        }`}
        style={{ overscrollBehavior: "contain" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Laser Accent */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />

        {/* Modal Header */}
        <header
          className={`p-5 sm:p-6 border-b flex flex-wrap items-center justify-between gap-4 shrink-0 ${
            isLight ? "bg-white border-slate-200" : "bg-slate-900/90 border-slate-800"
          }`}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-extrabold bg-amber-500/15 border border-amber-500/30 text-amber-500">
                {housingType}
              </span>
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 font-mono">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                {division} Division Catalog
              </span>
            </div>
            <h2 id="facade-library-title" className="text-xl sm:text-2xl font-black tracking-tight">
              Facade Library{" "}
              {designName ? (
                <>
                  for{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500">
                    {designName}
                  </span>
                </>
              ) : (
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500">
                  ({housingType})
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Showing {allFacades.length} architectural facades engineered and verified for {designName || housingType}.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative w-48 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search facades..."
                className={`w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs font-medium outline-hidden transition-all ${
                  isLight
                    ? "bg-slate-100 border-slate-200 text-slate-900 focus:bg-white focus:border-amber-400"
                    : "bg-slate-900 border-slate-700 text-white focus:bg-slate-800 focus:border-amber-400"
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isLight
                  ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                  : "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300"
              }`}
              title="Close (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Facades Grid Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6" style={{ overscrollBehavior: "contain" }}>
          {filteredFacades.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm font-bold text-slate-400">
                No facades match &quot;{searchQuery}&quot; for {designName}.
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-3 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-black"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFacades.map((facade, idx) => {
                const isSelected =
                  currentFacadeName.toLowerCase() === facade.name.toLowerCase() ||
                  currentFacadeName.toLowerCase().startsWith(facade.name.toLowerCase());

                return (
                  <div
                    key={`${facade.id || facade.name}-${idx}`}
                    onClick={() => {
                      onSelectFacade(facade);
                      onClose();
                    }}
                    className={`group relative rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer flex flex-col ${
                      isSelected
                        ? "border-amber-400 ring-2 ring-amber-400/40 shadow-lg"
                        : isLight
                        ? "bg-white border-slate-200 hover:border-amber-300 hover:shadow-md"
                        : "bg-slate-900/80 border-slate-800 hover:border-slate-600 hover:shadow-md"
                    }`}
                  >
                    {/* Facade Render Image */}
                    <FacadeCardImage url={facade.url} name={facade.name}>
                      {/* Selected Badge Overlay */}
                      {isSelected && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-black text-[10px] flex items-center gap-1 shadow-md">
                          <Check className="h-3 w-3" />
                          <span>Active</span>
                        </div>
                      )}

                      {/* Uplift Price Pill */}
                      <div className="absolute top-2 right-2">
                        {facade.uplift === 0 ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/90 text-slate-950 text-[10px] font-black shadow-md backdrop-blur-xs">
                            Standard Included
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-900/90 border border-amber-500/60 text-amber-300 text-[10px] font-black font-mono shadow-md backdrop-blur-xs">
                            +${facade.uplift.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </FacadeCardImage>

                    {/* Card Footer: Name & Action */}
                    <div className="p-3 flex items-center justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm group-hover:text-amber-400 transition-colors">
                          {facade.name}
                        </h4>
                        {facade.range && (
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {facade.range}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectFacade(facade);
                          onClose();
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          isSelected
                            ? "bg-amber-500 text-slate-950 font-black"
                            : isLight
                            ? "bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900"
                            : "bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300"
                        }`}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <footer
          className={`p-3 px-6 border-t flex items-center justify-between text-xs text-slate-400 shrink-0 ${
            isLight ? "bg-slate-100 border-slate-200" : "bg-slate-900 border-slate-800"
          }`}
        >
          <span>
            {filteredFacades.length} of {allFacades.length} facades matching criteria
          </span>
          <span className="font-mono text-[11px]">
            Filtered strictly for {designName} ({housingType})
          </span>
        </footer>
      </div>
    </div>,
    document.body
  );
}
