import {
  MapPin,
  Ruler,
  DollarSign,
  TrendingUp,
  FileText,
  Database,
  ExternalLink,
  Send,
  Scale,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Droplets,
  ShieldCheck,
  Building,
  User,
  Phone,
} from "lucide-react";
import { type LandParcel, type AvailabilityStatus } from "@/lib/land-scout/landScoutTypes";

interface LandParcelCardProps {
  parcel: LandParcel;
  isLight?: boolean;
  onContactAgent: (parcel: LandParcel) => void;
  onViewValuation: (parcel: LandParcel) => void;
  onPackageInFlyer: (parcel: LandParcel) => void;
  onAddToDatabase: (parcel: LandParcel) => void;
  onUpdateAvailability: (id: string, status: AvailabilityStatus) => void;
}

export function LandParcelCard({
  parcel,
  isLight = false,
  onContactAgent,
  onViewValuation,
  onPackageInFlyer,
  onAddToDatabase,
  onUpdateAvailability,
}: LandParcelCardProps) {
  const val = parcel.valuation;
  const topDesign = parcel.matchingDesigns[0];

  const getStatusBadge = (status: AvailabilityStatus) => {
    switch (status) {
      case "verified_available":
        return {
          bg: "bg-emerald-500/15 border-emerald-500/40 text-emerald-400",
          dot: "bg-emerald-400",
          label: "Verified Live",
        };
      case "pending_outreach":
        return {
          bg: "bg-amber-500/15 border-amber-500/40 text-amber-300",
          dot: "bg-amber-400 animate-pulse",
          label: "Pending Outreach",
        };
      case "under_offer":
        return {
          bg: "bg-orange-500/15 border-orange-500/40 text-orange-300",
          dot: "bg-orange-400",
          label: "Under Offer / EOI",
        };
      case "sold":
        return {
          bg: "bg-rose-500/15 border-rose-500/40 text-rose-400",
          dot: "bg-rose-400",
          label: "Sold / Contracted",
        };
    }
  };

  const statusBadge = getStatusBadge(parcel.availabilityStatus);

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
        isLight
          ? "border-slate-200 bg-white shadow-xs hover:border-brand-gold/60 hover:shadow-xl"
          : "border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950/80 hover:border-brand-gold/50 hover:shadow-2xl hover:shadow-brand-gold/5"
      }`}
    >
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 h-28 w-28 bg-brand-gold/5 rounded-full blur-2xl group-hover:bg-brand-gold/10 transition-all duration-500 pointer-events-none" />

      {/* Card Header */}
      <div className="p-4 sm:p-5 pb-3">
        {/* Top Badges Row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
              {parcel.sourcePortal}
            </span>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                parcel.isRegistered
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
              }`}
            >
              {parcel.expectedRegistrationDate}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-amber-300">
              {parcel.state}
            </span>
          </div>

          {/* Availability Status Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                const nextStatus: AvailabilityStatus =
                  parcel.availabilityStatus === "verified_available"
                    ? "pending_outreach"
                    : parcel.availabilityStatus === "pending_outreach"
                    ? "under_offer"
                    : parcel.availabilityStatus === "under_offer"
                    ? "sold"
                    : "verified_available";
                onUpdateAvailability(parcel.id, nextStatus);
              }}
              title="Click to toggle availability status"
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold transition-colors cursor-pointer ${statusBadge.bg}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dot}`} />
              <span>{statusBadge.label}</span>
            </button>
          </div>
        </div>

        {/* Address & Estate Title */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className={`text-base font-bold leading-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                Lot {parcel.lotNumber} · {parcel.streetAddress || `${parcel.suburb}`}
              </h3>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 text-brand-gold flex-none" />
                <span>
                  {parcel.estate ? `${parcel.estate}, ` : ""}{parcel.suburb} {parcel.postcode} ({parcel.council})
                </span>
              </p>
            </div>
            <div className="text-right flex-none">
              <span className="text-lg font-extrabold text-brand-gold block leading-tight">
                ${parcel.price.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                ${parcel.pricePerM2}/m²
              </span>
            </div>
          </div>
        </div>

        {/* Dimensions Ribbon */}
        <div className="mt-3 grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center text-xs">
          <div>
            <span className="text-[10px] text-slate-500 block">Land Area</span>
            <span className="font-bold text-slate-200">{parcel.landSizeM2} m²</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">Frontage</span>
            <span className="font-bold text-slate-200">{parcel.frontageM} m</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block">Lot Depth</span>
            <span className="font-bold text-slate-200">{parcel.depthM} m</span>
          </div>
        </div>

        {/* Deal Score & Valuation Meter Pill */}
        <div className="mt-3">
          <div
            data-testid="deal-score-pill"
            onClick={() => onViewValuation(parcel)}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              val.dealScoreRating === "strong_buy"
                ? "bg-emerald-950/20 border-emerald-500/40 hover:bg-emerald-950/30"
                : val.dealScoreRating === "fair_deal"
                ? "bg-amber-950/20 border-amber-500/40 hover:bg-amber-950/30"
                : "bg-slate-900 border-slate-700 hover:bg-slate-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-7 w-7 rounded-lg text-xs font-black flex items-center justify-center ${
                  val.dealScoreRating === "strong_buy"
                    ? "bg-emerald-500 text-slate-950"
                    : val.dealScoreRating === "fair_deal"
                    ? "bg-amber-400 text-slate-950"
                    : "bg-slate-700 text-white"
                }`}
              >
                {val.dealScorePoints}
              </span>
              <div>
                <span className="text-xs font-bold text-white flex items-center gap-1">
                  {val.dealScoreRating === "strong_buy" && "🔥 Strong Buy"}
                  {val.dealScoreRating === "fair_deal" && "Fair Value Deal"}
                  {val.dealScoreRating === "premium_lot" && "⚠️ Premium Lot"}
                  <span className="text-[10px] font-normal text-slate-400">
                    ({val.variancePercent >= 0 ? `+${val.variancePercent}%` : `${val.variancePercent}%`} vs median)
                  </span>
                </span>
                <span className="block text-[10px] text-slate-400">
                  +${Math.round(val.projectedFinishedEquity / 1000)}k Projected Finished Equity ({val.marginOnCompletionPercent}%)
                </span>
              </div>
            </div>

            <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1 hover:text-white">
              <Scale className="h-3 w-3 text-brand-gold" />
              <span>Comps</span>
            </span>
          </div>
        </div>

        {/* Site Feasibility Strip */}
        <div className="mt-3 flex items-center gap-1.5 flex-wrap text-[10px]">
          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700">
            Fall: {parcel.feasibility.fallEstimateM}m ({parcel.feasibility.slopeCategory})
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700">
            {parcel.feasibility.balRating}
          </span>
          {parcel.feasibility.isBtbPermissible && (
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
              BTB Allowed
            </span>
          )}
          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
            {parcel.feasibility.soilProfileSummary.slice(0, 28)}…
          </span>
        </div>

        {/* Hudson Home Pairing Box */}
        {topDesign && (
          <div className="mt-3 p-2.5 rounded-xl bg-slate-900 border border-slate-700/80 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 text-[11px]">Recommended Hudson Design:</span>
              <span className="font-bold text-amber-300">{topDesign.designName}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400">
                {topDesign.beds} Bed · {topDesign.baths} Bath · {topDesign.cars} Car ({topDesign.floorplanM2}m²)
              </span>
              <span className="font-bold text-white">
                Turnkey H&amp;L: ${topDesign.estimatedPackagePrice.toLocaleString()}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 italic">
              {topDesign.sitingFitNote}
            </p>
          </div>
        )}

        {/* Agent Info Row */}
        <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 truncate">
            <User className="h-3 w-3 text-slate-400 flex-none" />
            <span className="truncate">
              <strong className="text-slate-200">{parcel.agentName}</strong> ({parcel.agentAgency})
            </span>
          </div>
          <a
            href={parcel.listingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-cyan-300 hover:underline flex-none ml-2 font-medium"
          >
            <span>Listing</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Card Action Buttons */}
      <div className="p-4 pt-2 border-t border-slate-800 bg-slate-900 grid grid-cols-3 gap-2">
        {/* Action 1: Contact Agent AI Outreach */}
        <button
          type="button"
          data-testid="outreach-btn"
          onClick={() => onContactAgent(parcel)}
          className="px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-100 text-xs font-semibold hover:bg-slate-700 flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
          title="Send AI inquiry to agent"
        >
          <Send className="h-3.5 w-3.5 text-amber-400" />
          <span>Outreach</span>
        </button>

        {/* Action 2: Add to Hudson Database */}
        <button
          type="button"
          data-testid="save-lot-btn"
          onClick={() => onAddToDatabase(parcel)}
          className="px-2.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-100 text-xs font-semibold hover:bg-slate-700 flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
          title="Save to Hudson land database"
        >
          <Database className="h-3.5 w-3.5 text-cyan-400" />
          <span>Save Lot</span>
        </button>

        {/* Action 3: 1-Click Package in Flyer Builder */}
        <button
          type="button"
          data-testid="package-btn"
          onClick={() => onPackageInFlyer(parcel)}
          className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-brand-gold text-slate-950 text-xs font-bold hover:from-amber-400 hover:to-amber-300 shadow-sm flex items-center justify-center gap-1 transition-all cursor-pointer"
          title="Create House & Land package in Flyer Builder"
        >
          <FileText className="h-3.5 w-3.5" />
          <span>Package</span>
        </button>
      </div>
    </div>
  );
}
