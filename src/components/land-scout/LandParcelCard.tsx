import {
  MapPin,
  ExternalLink,
  Phone,
  Mail,
  Compass,
  TrendingUp,
  Send,
  FileText,
  Calendar,
  UserCheck,
  CheckCircle2,
  Clock,
  Layers,
} from "lucide-react";
import { type LandParcel, type AvailabilityStatus, formatLotDisplay } from "@/lib/land-scout/landScoutTypes";

interface LandParcelCardProps {
  parcel: LandParcel;
  isLight?: boolean;
  onViewValuation?: (parcel: LandParcel) => void;
  onContactAgent?: (parcel: LandParcel) => void;
  onSiteLot?: (parcel: LandParcel) => void;
  onPackageInFlyer?: (parcel: LandParcel) => void;
}

export function formatUploadDate(dateStr?: string): string {
  if (!dateStr) return "Recently Listed";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export function getSourceBadgeStyle(source?: string, isLight = false): string {
  const s = (source || "").toLowerCase();
  if (s.includes("realestate") || s.includes("rea")) {
    return isLight ? "bg-rose-50 border-rose-200 text-rose-700 font-bold" : "bg-rose-500/15 border-rose-500/40 text-rose-300";
  }
  if (s.includes("openlot")) {
    return isLight ? "bg-blue-50 border-blue-200 text-blue-700 font-bold" : "bg-blue-500/15 border-blue-500/40 text-blue-300";
  }
  if (s.includes("domain")) {
    return isLight ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-bold" : "bg-emerald-500/15 border-emerald-500/40 text-emerald-300";
  }
  if (s.includes("peet") || s.includes("lendlease") || s.includes("frasers")) {
    return isLight ? "bg-amber-50 border-amber-200 text-amber-800 font-bold" : "bg-amber-500/15 border-amber-500/40 text-amber-300";
  }
  if (s.includes("stockland") || s.includes("mirvac") || s.includes("avid") || s.includes("sekisui")) {
    return isLight ? "bg-purple-50 border-purple-200 text-purple-700 font-bold" : "bg-purple-500/15 border-purple-500/40 text-purple-300";
  }
  if (s.includes("cadastre") || s.includes("spatial")) {
    return isLight ? "bg-cyan-50 border-cyan-200 text-cyan-700 font-bold" : "bg-cyan-500/15 border-cyan-500/40 text-cyan-300";
  }
  return isLight ? "bg-slate-100 border-slate-300 text-slate-700" : "bg-slate-800 border-slate-700 text-slate-300";
}

export function LandParcelCard({
  parcel,
  isLight = false,
  onViewValuation,
  onContactAgent,
  onSiteLot,
  onPackageInFlyer,
}: LandParcelCardProps) {
  const getStatusBadge = (status: AvailabilityStatus) => {
    switch (status) {
      case "verified_available":
        return {
          bg: isLight ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-emerald-500/15 border-emerald-500/40 text-emerald-400",
          dot: "bg-emerald-500",
          label: "Available",
        };
      case "pending_outreach":
        return {
          bg: isLight ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-amber-500/15 border-amber-500/40 text-amber-300",
          dot: "bg-amber-500",
          label: "Inquiry Pending",
        };
      case "under_offer":
        return {
          bg: isLight ? "bg-orange-50 border-orange-200 text-orange-700" : "bg-orange-500/15 border-orange-500/40 text-orange-300",
          dot: "bg-orange-500",
          label: "Under Offer",
        };
      case "sold":
        return {
          bg: isLight ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-rose-500/15 border-rose-500/40 text-rose-400",
          dot: "bg-rose-500",
          label: "Sold",
        };
      default:
        return {
          bg: isLight ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-emerald-500/15 border-emerald-500/40 text-emerald-400",
          dot: "bg-emerald-500",
          label: "Available",
        };
    }
  };

  const statusBadge = getStatusBadge(parcel.availabilityStatus);
  const fallM = parcel.feasibility?.fallEstimateM ?? 0.6;
  const slopeCat = parcel.feasibility?.slopeCategory || (fallM > 1.8 ? "steep" : fallM > 0.9 ? "moderate" : "flat");

  const getSlopeBadge = () => {
    if (slopeCat === "flat") {
      return {
        label: `Flat (${fallM}m fall)`,
        style: isLight ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
      };
    }
    if (slopeCat === "moderate") {
      return {
        label: `Moderate (${fallM}m fall)`,
        style: isLight ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-amber-500/15 border-amber-500/30 text-amber-300",
      };
    }
    return {
      label: `Steep (${fallM}m fall)`,
      style: isLight ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-rose-500/15 border-rose-500/30 text-rose-300",
    };
  };

  const slopeBadge = getSlopeBadge();

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
        isLight
          ? "border-slate-200 bg-white shadow-sm hover:border-amber-500/60 hover:shadow-xl hover:translate-y-[-2px]"
          : "border-slate-800/90 bg-gradient-to-b from-slate-900/95 to-slate-950/90 hover:border-amber-500/50 hover:shadow-2xl hover:shadow-amber-500/5 hover:translate-y-[-2px]"
      }`}
    >
      {/* Subtle Ambient Glow */}
      <div className="absolute top-0 right-0 h-32 w-32 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all duration-500 pointer-events-none" />

      {/* Card Body */}
      <div className="p-4 sm:p-5 space-y-3.5">
        {/* Top Badges Row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full border ${getSourceBadgeStyle(parcel.sourcePortal, isLight)}`}>
              {parcel.sourcePortal || "RealEstate"}
            </span>

            {/* Registration status */}
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                parcel.isRegistered
                  ? isLight
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : isLight
                    ? "bg-cyan-50 border-cyan-200 text-cyan-700"
                    : "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
              }`}
            >
              {parcel.isRegistered ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
              <span>{parcel.expectedRegistrationDate || (parcel.isRegistered ? "Registered Now" : "Pending Registration")}</span>
            </span>

            {/* State Badge */}
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isLight ? "bg-slate-100 border-slate-200 text-amber-700" : "bg-slate-800/80 border-slate-700/80 text-amber-300"}`}>
              {parcel.state}
            </span>
          </div>

          {/* Availability Status */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${statusBadge.bg}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dot}`} />
            <span>{statusBadge.label}</span>
          </div>
        </div>

        {/* Address & Estate Title & Pricing */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className={`text-base font-bold leading-tight truncate ${isLight ? "text-slate-900" : "text-white"}`}>
                {formatLotDisplay(parcel.lotNumber)} · {parcel.streetAddress || `${parcel.suburb}`}
              </h3>
              <p className={`text-xs flex items-center gap-1 mt-1 truncate ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                <MapPin className="h-3 w-3 text-amber-500 flex-none" />
                <span className="truncate">
                  {parcel.estate ? `${parcel.estate}, ` : ""}{parcel.suburb} {parcel.postcode}
                  {parcel.council && ` (${parcel.council})`}
                </span>
              </p>
            </div>
            <div className="text-right flex-none">
              <span className={`text-lg font-extrabold block leading-tight ${isLight ? "text-amber-600" : "text-amber-400"}`}>
                ${parcel.price.toLocaleString()}
              </span>
              <span className={`text-[10px] font-mono ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                ${parcel.pricePerM2}/m²
              </span>
            </div>
          </div>
        </div>

        {/* Dimensions Ribbon - 4 Columns */}
        <div className={`grid grid-cols-4 gap-1.5 py-2 px-2.5 rounded-xl border text-center text-xs ${
          isLight ? "bg-slate-50/90 border-slate-200 text-slate-800" : "bg-slate-950/70 border-slate-800/80 text-slate-200"
        }`}>
          <div>
            <span className="text-[10px] text-slate-500 block font-medium">Land Area</span>
            <span className={`font-bold text-xs sm:text-sm ${isLight ? "text-slate-900" : "text-slate-100"}`}>{parcel.landSizeM2} m²</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block font-medium">Frontage</span>
            <span className={`font-bold text-xs sm:text-sm ${isLight ? "text-slate-900" : "text-slate-100"}`}>{parcel.frontageM} m</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block font-medium">Lot Depth</span>
            <span className={`font-bold text-xs sm:text-sm ${isLight ? "text-slate-900" : "text-slate-100"}`}>{parcel.depthM} m</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block font-medium">Topography</span>
            <span className={`font-bold text-[11px] block truncate capitalize ${
              slopeCat === "flat" ? "text-emerald-500" : slopeCat === "moderate" ? "text-amber-500" : "text-rose-500"
            }`}>
              {slopeCat} ({fallM}m)
            </span>
          </div>
        </div>

        {/* Appointed Contact / Developer Information */}
        <div className={`p-3 rounded-xl border space-y-2 ${
          isLight ? "bg-slate-50/70 border-slate-200/90" : "bg-slate-950/70 border-slate-800/80"
        }`}>
          <div className="flex items-center justify-between text-[11px] gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <UserCheck className="h-3 w-3 text-amber-500" />
              Appointed Contact
            </span>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Calendar className="h-3 w-3 text-slate-500" />
              {formatUploadDate(parcel.uploadDate || parcel.lastVerifiedAt)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className={`text-xs font-bold block truncate ${isLight ? "text-slate-900" : "text-white"}`}>
                {parcel.agentName}
              </span>
              <span className="text-[11px] text-slate-400 block truncate">
                {parcel.agentAgency || "Land Specialist"}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-none">
              {parcel.agentPhone && (
                <a
                  href={`tel:${parcel.agentPhone.replace(/\s+/g, "")}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 text-xs font-bold transition-all shadow-xs"
                  title={`Call ${parcel.agentName} on ${parcel.agentPhone}`}
                >
                  <Phone className="h-3 w-3" />
                  <span>Call {parcel.agentPhone}</span>
                </a>
              )}
              {parcel.agentEmail && (
                <a
                  href={`mailto:${parcel.agentEmail}`}
                  className={`inline-flex items-center justify-center h-7 w-7 rounded-lg border transition-all ${
                    isLight ? "bg-white border-slate-200 text-slate-600 hover:text-slate-900" : "bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
                  }`}
                  title={`Email ${parcel.agentName} (${parcel.agentEmail})`}
                >
                  <Mail className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Source Portal & Multi-Portal Verification Links (REA, Domain, OpenLot) */}
        {(() => {
          const cleanSuburb = (parcel.suburb || (parcel.state === "NSW" ? "Box Hill" : "Flagstone"))
            .replace(/\b(nsw|qld|queensland|new south wales|\d{4})\b/gi, "")
            .trim();
          const slug = cleanSuburb.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          const stLower = parcel.state === "NSW" ? "nsw" : "qld";
          const pc = (parcel.postcode || (parcel.state === "NSW" ? "2765" : "4280")).trim();
          const reaUrl = parcel.portalLinks?.reaUrl || `https://www.realestate.com.au/buy/property-land-in-${slug},+${stLower}+${pc}/list-1?activeSort=list-date`;
          const domainUrl = parcel.portalLinks?.domainUrl || `https://www.domain.com.au/sale/${slug}-${stLower}-${pc}/vacant-land/?ssubs=0&sort=dateupdated-desc`;
          const openlotUrl = parcel.portalLinks?.openlotUrl || `https://www.openlot.com.au/land-for-sale/${stLower}?q=${encodeURIComponent(cleanSuburb)}`;
          const primaryUrl = parcel.listingUrl || openlotUrl;

          return (
            <div className={`flex flex-col gap-2 pt-2 border-t ${isLight ? "border-slate-200" : "border-slate-800/80"}`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span>Source:</span>
                  <span className={`font-semibold ${isLight ? "text-slate-700" : "text-slate-200"}`}>{parcel.sourcePortal || "RealEstate"}</span>
                </div>

                <a
                  href={primaryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-500/40 text-sky-400 hover:bg-sky-500 hover:text-slate-950 text-[11px] font-semibold transition-all group/link"
                  title="Open primary listing or suburb release on portal website"
                >
                  <span>View Listing</span>
                  <ExternalLink className="h-3 w-3 transition-transform group-hover/link:translate-x-0.5" />
                </a>
              </div>

              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500">Verify Portals:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <a
                    href={reaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold transition-all ${
                      isLight
                        ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-600 hover:text-white"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500 hover:text-white"
                    }`}
                    title={`Check ${cleanSuburb} vacant land on realestate.com.au (REA)`}
                  >
                    <span>REA</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                  <a
                    href={domainUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold transition-all ${
                      isLight
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white"
                        : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950"
                    }`}
                    title={`Check ${cleanSuburb} vacant land on domain.com.au`}
                  >
                    <span>Domain</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                  <a
                    href={openlotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold transition-all ${
                      isLight
                        ? "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white"
                        : "bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500 hover:text-white"
                    }`}
                    title={`Check ${cleanSuburb} master-planned estates on openlot.com.au`}
                  >
                    <span>OpenLot</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Action Buttons Toolbar */}
        <div className={`pt-2.5 border-t grid grid-cols-3 gap-2 ${isLight ? "border-slate-200" : "border-slate-800/80"}`}>
          {onSiteLot && (
            <button
              type="button"
              onClick={() => onSiteLot(parcel)}
              className="py-1.5 px-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-500 hover:bg-amber-500 hover:text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Site Hudson House Designs on this Lot"
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Site Lot</span>
            </button>
          )}

          {onViewValuation && (
            <button
              type="button"
              onClick={() => onViewValuation(parcel)}
              className={`py-1.5 px-2 rounded-lg border font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isLight
                  ? "bg-slate-100 border-slate-200 text-slate-700 hover:border-emerald-500 hover:text-emerald-700"
                  : "bg-slate-800/80 border-slate-700/80 text-slate-200 hover:border-emerald-500/50 hover:text-emerald-300"
              }`}
              title="Appraise land valuation & equity"
            >
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              <span>Appraise</span>
            </button>
          )}

          {onPackageInFlyer ? (
            <button
              type="button"
              onClick={() => onPackageInFlyer(parcel)}
              className={`py-1.5 px-2 rounded-lg border font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isLight
                  ? "bg-slate-100 border-slate-200 text-slate-700 hover:border-amber-500 hover:text-amber-700"
                  : "bg-slate-800/80 border-slate-700/80 text-slate-200 hover:border-amber-500/60 hover:text-amber-400"
              }`}
              title="Package this lot into a marketing flyer"
            >
              <FileText className="h-3.5 w-3.5 text-amber-500" />
              <span>Package</span>
            </button>
          ) : (
            onContactAgent && (
              <button
                type="button"
                onClick={() => onContactAgent(parcel)}
                className={`py-1.5 px-2 rounded-lg border font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isLight
                    ? "bg-slate-100 border-slate-200 text-slate-700 hover:border-cyan-500 hover:text-cyan-700"
                    : "bg-slate-800/80 border-slate-700/80 text-slate-200 hover:border-cyan-500/50 hover:text-cyan-300"
                }`}
                title="Draft contact message"
              >
                <Send className="h-3.5 w-3.5 text-cyan-400" />
                <span>Contact</span>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
