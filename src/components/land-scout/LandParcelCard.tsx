import {
  MapPin,
  ExternalLink,
  User,
  Phone,
  Mail,
} from "lucide-react";
import { type LandParcel, type AvailabilityStatus } from "@/lib/land-scout/landScoutTypes";

interface LandParcelCardProps {
  parcel: LandParcel;
  isLight?: boolean;
}

export function LandParcelCard({
  parcel,
  isLight = false,
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
            <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
              {parcel.sourcePortal || "Hudson DB"}
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

        {/* Agent & Agency Contact Info */}
        <div className="pt-2.5 border-t border-slate-800/80 text-xs space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 truncate">
              <User className="h-3.5 w-3.5 text-slate-400 flex-none" />
              <span className="truncate text-slate-200 font-medium">
                {parcel.agentName}
                {parcel.agentAgency && (
                  <span className="text-slate-400"> ({parcel.agentAgency})</span>
                )}
              </span>
            </div>
            {parcel.listingUrl && (
              <a
                href={parcel.listingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-cyan-300 hover:text-cyan-200 hover:underline flex-none font-semibold ml-2"
              >
                <span>View Listing</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400 flex-wrap">
            {parcel.agentPhone && (
              <a
                href={`tel:${parcel.agentPhone.replace(/\s+/g, "")}`}
                className="flex items-center gap-1 hover:text-amber-300 transition-colors"
              >
                <Phone className="h-3 w-3 text-brand-gold flex-none" />
                <span>{parcel.agentPhone}</span>
              </a>
            )}
            {parcel.agentEmail && (
              <a
                href={`mailto:${parcel.agentEmail}`}
                className="flex items-center gap-1 hover:text-amber-300 transition-colors truncate max-w-[220px]"
              >
                <Mail className="h-3 w-3 text-brand-gold flex-none" />
                <span className="truncate">{parcel.agentEmail}</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
