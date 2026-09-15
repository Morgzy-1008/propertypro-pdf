import { useState, useMemo } from "react";
import {
  MapPin,
  ExternalLink,
  Send,
  FileText,
  Scale,
  Compass,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { type LandParcel } from "@/lib/land-scout/landScoutTypes";

interface LandScoutMapViewProps {
  parcels: LandParcel[];
  onPackageInFlyer: (parcel: LandParcel) => void;
  onContactAgent: (parcel: LandParcel) => void;
  onViewValuation: (parcel: LandParcel) => void;
}

export function LandScoutMapView({
  parcels,
  onPackageInFlyer,
  onContactAgent,
  onViewValuation,
}: LandScoutMapViewProps) {
  const [selectedParcel, setSelectedParcel] = useState<LandParcel | null>(
    parcels[0] || null
  );
  const [selectedCorridor, setSelectedCorridor] = useState<string>("all");

  const corridors = [
    { id: "all", label: "All Corridors", state: "ALL" },
    { id: "flagstone", label: "Flagstone / Logan", state: "QLD" },
    { id: "ripley", label: "Ripley / Ipswich", state: "QLD" },
    { id: "coomera", label: "Coomera / Gold Coast", state: "QLD" },
    { id: "box_hill", label: "Box Hill / The Hills", state: "NSW" },
    { id: "oran_park", label: "Oran Park / Camden", state: "NSW" },
    { id: "marsden_park", label: "Marsden Park / Blacktown", state: "NSW" },
    { id: "calderwood", label: "Calderwood / Illawarra", state: "NSW" },
  ];

  const filtered = useMemo(() => {
    if (selectedCorridor === "all") return parcels;
    return parcels.filter(
      (p) =>
        p.suburb.toLowerCase().replace(/\s+/g, "_").includes(selectedCorridor) ||
        p.estate.toLowerCase().replace(/\s+/g, "_").includes(selectedCorridor)
    );
  }, [parcels, selectedCorridor]);

  return (
    <div className="space-y-4">
      {/* Corridor Quick Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-2 flex-none">
          <Compass className="h-3.5 w-3.5 text-brand-gold" />
          Growth Corridors:
        </span>
        {corridors.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedCorridor(c.id)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCorridor === c.id
                ? "bg-amber-500/20 text-brand-gold border border-brand-gold/40 shadow-xs"
                : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Map + Side Inspector Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 h-[650px] rounded-2xl border border-slate-800 overflow-hidden bg-slate-950">
        {/* Interactive Simulated Satellite & Map View */}
        <div className="relative h-full w-full bg-slate-950 overflow-hidden flex flex-col justify-between">
          {/* Satellite Map Texture & Grid */}
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

          {/* Map Header Overlay */}
          <div className="relative z-10 p-4 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl pointer-events-auto shadow-md">
              <Layers className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-bold text-slate-200">
                Satellite Intel Layer · High-Res Cadastral Boundaries
              </span>
            </div>

            <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl pointer-events-auto text-[11px] text-slate-300">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> Live Available
              </span>
              <span className="flex items-center gap-1 ml-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" /> Pending Outreach
              </span>
              <span className="flex items-center gap-1 ml-2">
                <span className="h-2 w-2 rounded-full bg-orange-400" /> Under Offer
              </span>
            </div>
          </div>

          {/* Interactive Plot Pins Canvas */}
          <div className="relative z-10 flex-1 p-6 flex items-center justify-center">
            <div className="relative w-full max-w-2xl h-96 rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/60 to-slate-950/80 backdrop-blur-md p-6 flex flex-wrap gap-4 items-center justify-around">
              {filtered.map((parcel, idx) => {
                const isSelected = selectedParcel?.id === parcel.id;
                const isLive = parcel.availabilityStatus === "verified_available";
                const isPending = parcel.availabilityStatus === "pending_outreach";

                return (
                  <div
                    key={parcel.id}
                    onClick={() => setSelectedParcel(parcel)}
                    className={`relative cursor-pointer transition-all duration-200 ${
                      isSelected ? "scale-115 z-20" : "hover:scale-105 z-10"
                    }`}
                  >
                    {/* Pulsing ring if selected */}
                    {isSelected && (
                      <span className="absolute -inset-1 rounded-xl bg-amber-400/40 animate-ping" />
                    )}

                    <div
                      className={`relative px-3 py-2 rounded-xl border flex items-center gap-2 shadow-xl ${
                        isSelected
                          ? "bg-slate-900 border-brand-gold text-white"
                          : "bg-slate-900/90 border-slate-700 text-slate-300"
                      }`}
                    >
                      <span
                        className={`h-2.5 w-2.5 rounded-full flex-none ${
                          isLive
                            ? "bg-emerald-400"
                            : isPending
                            ? "bg-amber-400 animate-pulse"
                            : "bg-orange-400"
                        }`}
                      />
                      <div className="text-left">
                        <span className="text-[11px] font-bold block leading-tight">
                          Lot {parcel.lotNumber} · {parcel.suburb}
                        </span>
                        <span className="text-[10px] text-brand-gold font-semibold font-mono">
                          ${parcel.price.toLocaleString()} ({parcel.landSizeM2}m²)
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Map Stats */}
          <div className="relative z-10 p-4 text-[11px] text-slate-400 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between">
            <span>
              Showing <strong>{filtered.length}</strong> active land parcels plotted across target growth corridors.
            </span>
            <span className="text-slate-500">
              Click any pin to inspect feasibility, comps, and trigger 1-click H&amp;L packaging.
            </span>
          </div>
        </div>

        {/* Selected Lot Quick Inspector Panel */}
        {selectedParcel && (
          <div className="p-5 flex flex-col justify-between h-full bg-slate-900/95 border-l border-slate-800 overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-brand-gold bg-brand-gold/10 px-2.5 py-0.5 rounded-full border border-brand-gold/20">
                  {selectedParcel.sourcePortal} · {selectedParcel.state}
                </span>
                <h3 className="text-lg font-bold text-white mt-1.5 leading-tight">
                  Lot {selectedParcel.lotNumber}
                </h3>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 text-brand-gold" />
                  <span>
                    {selectedParcel.streetAddress || selectedParcel.suburb} ({selectedParcel.estate})
                  </span>
                </p>
              </div>

              {/* Price & Dimensions */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-400">Land Price:</span>
                  <span className="text-base font-extrabold text-brand-gold">
                    ${selectedParcel.price.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-300 pt-1 border-t border-slate-800/80">
                  <span>Dimensions:</span>
                  <span className="font-semibold">
                    {selectedParcel.frontageM}m frontage × {selectedParcel.depthM}m depth
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-300">
                  <span>Land Area:</span>
                  <span className="font-semibold">{selectedParcel.landSizeM2} m² (${selectedParcel.pricePerM2}/m²)</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-300">
                  <span>Registration:</span>
                  <span className="text-emerald-400 font-semibold">{selectedParcel.expectedRegistrationDate}</span>
                </div>
              </div>

              {/* Deal Score & Comps */}
              <div
                onClick={() => onViewValuation(selectedParcel)}
                className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 cursor-pointer hover:bg-emerald-950/30 transition-colors"
              >
                <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                  <span>Deal Score: {selectedParcel.valuation.dealScorePoints}/100</span>
                  <span className="underline underline-offset-2 flex items-center gap-0.5 text-brand-gold">
                    <Scale className="h-3 w-3" /> View Comps
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1">
                  {selectedParcel.valuation.dealSummary}
                </p>
                <span className="text-[11px] text-emerald-400 font-bold block mt-1">
                  +${(selectedParcel.valuation.projectedGrossEquityMargin / 1000).toFixed(0)}k Finished Equity Buffer ({selectedParcel.valuation.projectedEquityMarginPercent}%)
                </span>
              </div>

              {/* Matching Design */}
              {selectedParcel.matchingDesigns[0] && (
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-slate-400">Matching Design:</span>
                    <span className="text-amber-300">{selectedParcel.matchingDesigns[0].designName}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Turnkey Package:</span>
                    <span className="font-semibold">
                      ${selectedParcel.matchingDesigns[0].estimatedPackagePrice.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Agent info */}
              <div className="text-xs text-slate-400 space-y-0.5 pt-1">
                <div>
                  <strong>Agent:</strong> {selectedParcel.agentName} ({selectedParcel.agentAgency})
                </div>
                <div className="font-mono text-slate-300">
                  {selectedParcel.agentPhone} · {selectedParcel.agentEmail}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <button
                type="button"
                onClick={() => onPackageInFlyer(selectedParcel)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-brand-gold text-slate-950 text-xs font-bold hover:from-amber-400 hover:to-amber-300 shadow-md shadow-brand-gold/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <FileText className="h-4 w-4" />
                <span>Package in Flyer Builder (1-Click)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onContactAgent(selectedParcel)}
                  className="py-2 rounded-xl border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5 text-amber-400" />
                  <span>Outreach</span>
                </button>
                <a
                  href={selectedParcel.listingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 rounded-xl border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200 hover:bg-slate-700 flex items-center justify-center gap-1 transition-colors"
                >
                  <span>Portal</span>
                  <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
