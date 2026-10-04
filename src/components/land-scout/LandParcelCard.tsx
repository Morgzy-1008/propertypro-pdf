import {
  MapPin,
  ExternalLink,
  User,
  Phone,
  Mail,
  Compass,
  TrendingUp,
  Send,
  FileText,
  Calendar,
  UserCheck,
} from "lucide-react";
import { type LandParcel, type AvailabilityStatus } from "@/lib/land-scout/landScoutTypes";

interface LandParcelCardProps {
  parcel: LandParcel;
  isLight?: boolean;
  onViewValuation?: (parcel: LandParcel) => void;
  onContactAgent?: (parcel: LandParcel) => void;
  onSiteLot?: (parcel: LandParcel) => void;
  onPackageInFlyer?: (parcel: LandParcel) => void;
}

export function formatUploadDate(dateStr?: string): string {
  if (!dateStr) return "Recently Uploaded";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export function getSourceBadgeStyle(source?: string): string {
  const s = (source || "").toLowerCase();
  if (s.includes("realestate") || s.includes("rea")) {
    return "bg-rose-500/15 border-rose-500/40 text-rose-300";
  }
  if (s.includes("openlot")) {
    return "bg-blue-500/15 border-blue-500/40 text-blue-300";
  }
  if (s.includes("domain")) {
    return "bg-emerald-500/15 border-emerald-500/40 text-emerald-300";
  }
  if (s.includes("peet")) {
    return "bg-amber-500/15 border-amber-500/40 text-amber-300";
  }
  if (s.includes("stockland")) {
    return "bg-purple-500/15 border-purple-500/40 text-purple-300";
  }
  if (s.includes("cadastre") || s.includes("spatial")) {
    return "bg-cyan-500/15 border-cyan-500/40 text-cyan-300";
  }
  return "bg-slate-800 border-slate-700 text-slate-300";
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
          bg: "bg-emerald-500/15 border-emerald-500/40 text-emerald-400",
          dot: "bg-emerald-400",
          label: "Available",
        };
      case "pending_outreach":
        return {
          bg: "bg-amber-500/15 border-amber-500/40 text-amber-300",
          dot: "bg-amber-400",
          label: "Inquiry Pending",
        };
      case "under_offer":
        return {
          bg: "bg-orange-500/15 border-orange-500/40 text-orange-300",
          dot: "bg-orange-400",
          label: "Under Offer",
        };
      case "sold":
        return {
          bg: "bg-rose-500/15 border-rose-500/40 text-rose-400",
          dot: "bg-rose-400",
          label: "Sold",
        };
      default:
        return {
          bg: "bg-emerald-500/15 border-emerald-500/40 text-emerald-400",
          dot: "bg-emerald-400",
          label: "Available",
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
      {/* Subtle Glow */}
      <div className="absolute top-0 right-0 h-28 w-28 bg-brand-gold/5 rounded-full blur-2xl group-hover:bg-brand-gold/10 transition-all duration-500 pointer-events-none" />

      {/* Card Content */}
      <div className="p-4 sm:p-5 space-y-3.5">
        {/* Top Badges Row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full border ${getSourceBadgeStyle(parcel.sourcePortal)}`}>
              {parcel.sourcePortal || "RealEstate"}
            </span>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                parcel.isRegistered
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
              }`}
            >
              {parcel.expectedRegistrationDate || (parcel.isRegistered ? "Registered" : "Pending Registration")}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-amber-300">
              {parcel.state}
            </span>
          </div>

          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${statusBadge.bg}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${statusBadge.dot}`} />
            <span>{statusBadge.label}</span>
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
                  {parcel.estate ? `${parcel.estate}, ` : ""}{parcel.suburb} {parcel.postcode}
                  {parcel.council && ` (${parcel.council})`}
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
        <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center text-xs">
          <div>
            <span className="text-[10px] text-slate-500 block font-medium">Land Area</span>
            <span className="font-bold text-slate-200 text-sm">{parcel.landSizeM2} m²</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block font-medium">Frontage</span>
            <span className="font-bold text-slate-200 text-sm">{parcel.frontageM} m</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 block font-medium">Lot Depth</span>
            <span className="font-bold text-slate-200 text-sm">{parcel.depthM} m</span>
          </div>
        </div>

        {/* Appointed Contact to Call */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between text-[11px] gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <UserCheck className="h-3 w-3 text-brand-gold" />
              Appointed Contact
            </span>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Calendar className="h-3 w-3 text-slate-500" />
              Uploaded: {formatUploadDate(parcel.uploadDate || parcel.lastVerifiedAt)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-white block truncate">
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
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 text-xs font-bold transition-all shadow-xs"
                  title={`Call ${parcel.agentName} on ${parcel.agentPhone}`}
                >
                  <Phone className="h-3 w-3" />
                  <span>Call {parcel.agentPhone}</span>
                </a>
              )}
              {parcel.agentEmail && (
                <a
                  href={`mailto:${parcel.agentEmail}`}
                  className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 transition-all"
                  title={`Email ${parcel.agentName} (${parcel.agentEmail})`}
                >
                  <Mail className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Source Portal & Direct Website Link */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span>Portal:</span>
            <span className="font-semibold text-slate-200">{parcel.sourcePortal || "RealEstate"}</span>
          </div>

          {parcel.listingUrl ? (
            <a
              href={parcel.listingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-500/40 text-sky-300 hover:bg-sky-500 hover:text-slate-950 text-xs font-semibold transition-all group/link"
              title="Open listing on external portal website"
            >
              <span>View Website Listing</span>
              <ExternalLink className="h-3 w-3 transition-transform group-hover/link:translate-x-0.5" />
            </a>
          ) : (
            <span className="text-[11px] text-slate-500 italic">Direct Release</span>
          )}
        </div>

        {/* Action Buttons Toolbar */}
        <div className="pt-2.5 border-t border-slate-800/80 grid grid-cols-3 gap-2">
          {onSiteLot && (
            <button
              type="button"
              onClick={() => onSiteLot(parcel)}
              className="py-1.5 px-2 rounded-lg bg-amber-500/15 border border-brand-gold/40 text-brand-gold hover:bg-brand-gold hover:text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
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
              className="py-1.5 px-2 rounded-lg bg-slate-800/80 border border-slate-700/80 text-slate-200 hover:border-emerald-500/50 hover:text-emerald-300 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              title="Appraise land valuation & equity"
            >
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              <span>Appraise</span>
            </button>
          )}

          {onPackageInFlyer ? (
            <button
              type="button"
              onClick={() => onPackageInFlyer(parcel)}
              className="py-1.5 px-2 rounded-lg bg-slate-800/80 border border-slate-700/80 text-slate-200 hover:border-brand-gold/60 hover:text-brand-gold font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              title="Package this lot into a marketing flyer"
            >
              <FileText className="h-3.5 w-3.5 text-brand-gold" />
              <span>Package</span>
            </button>
          ) : (
            onContactAgent && (
              <button
                type="button"
                onClick={() => onContactAgent(parcel)}
                className="py-1.5 px-2 rounded-lg bg-slate-800/80 border border-slate-700/80 text-slate-200 hover:border-cyan-500/50 hover:text-cyan-300 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
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
