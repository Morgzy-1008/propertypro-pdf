import { useState, useEffect, useMemo } from "react";
import { BedDouble, Bath, Car, Ruler, MapPin, Phone, Mail, Maximize2, Loader2 } from "lucide-react";
import { getRange, rangeItems, getTermsText, type FlyerData } from "./types";
import { consultantVCard } from "./consultants";
import { QrCode } from "./QrCode";
import { formatPrice } from "@/lib/pricing";
import { PRE_RENDERED_FACADES } from "./preRenderedFacades.data";

/**
 * Authentic Hudson Homes house mark emblem.
 * Clean, sharp, exactly matching the top-left website brand logo without the words.
 */
export function HudsonMark({ size = 15, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src="/hudson-mark.png"
      alt="Hudson Homes"
      style={{ height: `${size}mm`, width: "auto" }}
      className={`flex-none object-contain ${className}`}
      loading="eager"
    />
  );
}

import { isLocalhost } from "@/lib/isLocalhost";

export function Logo({
  light = false,
  size = 15,
  className = "",
  modern: _modern,
}: {
  light?: boolean;
  size?: number;
  className?: string;
  modern?: boolean;
}) {
  return (
    <div className={`flex items-center gap-[3mm] ${className}`}>
      {/* Authentic Hudson Homes house mark emblem */}
      <HudsonMark size={size} />
      {/* Clean, bold HUDSON HOMES brand text */}
      <div
        className={`border-l pl-[3.5mm] flex items-center justify-center ${
          light ? "border-brand-cream/40" : "border-slate-300"
        }`}
        style={{ minHeight: `${size * 0.85}mm` }}
      >
        <div
          className={`font-sans font-extrabold tracking-[0.16em] uppercase leading-tight ${
            light ? "text-white" : "text-brand-navy"
          }`}
          style={{ fontSize: `${size * 0.52}mm` }}
        >
          HUDSON HOMES
        </div>
      </div>
    </div>
  );
}

/**
 * V2 Hudson Homes logo:
 * Clean, bold, larger HUDSON HOMES brand text.
 */
export function LogoV2({
  light = false,
  size = 15,
  className = "",
}: {
  light?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-[3.2mm] ${className}`}>
      {/* Authentic Hudson Homes house mark emblem */}
      <HudsonMark size={size} />
      <div
        className={`border-l pl-[3.5mm] flex items-center justify-center ${
          light ? "border-brand-cream/40" : "border-brand-navy/25"
        }`}
        style={{ minHeight: `${size * 0.85}mm` }}
      >
        <div
          className={`font-sans font-extrabold tracking-[0.18em] uppercase leading-none ${
            light ? "text-white" : "text-brand-navy"
          }`}
          style={{ fontSize: `${size * 0.58}mm` }}
        >
          HUDSON HOMES
        </div>
      </div>
    </div>
  );
}

/**
 * Partner developer logo badge with auto-scaling, image error fallback, and smooth blend
 */
export function PartnerLogoBadge({
  url,
  name,
  className = "",
  size = 8,
  light = false,
}: {
  url?: string;
  name?: string;
  className?: string;
  size?: number;
  light?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [url]);

  if (!url || failed) {
    if (!name) return null;
    return (
      <div
        className={`inline-flex items-center justify-center font-bold tracking-wider px-[2mm] rounded-[1mm] uppercase ${
          light
            ? "bg-white/15 text-white border border-white/20"
            : "bg-brand-navy/10 text-brand-navy border border-brand-navy/20"
        } ${className}`}
        style={{ height: `${size}mm`, fontSize: `${size * 0.36}mm` }}
      >
        {name}
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={name || "Developer Partner"}
      onError={() => setFailed(true)}
      style={{
        height: `${size}mm`,
        maxWidth: `${size * 3.6}mm`,
        mixBlendMode: light ? "normal" : "multiply",
      }}
      className={`object-contain flex-none rounded-[0.5mm] ${className}`}
      loading="eager"
    />
  );
}

/**
 * Intercepts any incoming facade image URL and upgrades legacy/2019 WordPress assets
 * or non-high-res JPGs to the pristine, modern 4K renders.
 */
export function resolveUpdatedFacadeRender(url?: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  // If already pointing to an updated pre-rendered PNG render, return directly
  if (lower.startsWith("/facades/") && lower.endsWith(".png")) {
    return trimmed;
  }

  // Intercept any Aspen URL (legacy wp-content 2019 JPG or old local assets)
  if (lower.includes("aspen")) {
    if (lower.includes("single-garage") || lower.includes("single_garage") || lower.includes("1-car") || lower.includes("1car")) {
      return PRE_RENDERED_FACADES["aspen-single-garage"] || "/facades/aspen-single-garage.png";
    }
    if (lower.includes("double") || lower.includes("2-storey") || lower.includes("2story") || lower.includes("ds")) {
      return PRE_RENDERED_FACADES["aspen-double"] || "/facades/aspen-double-storey.png";
    }
    return PRE_RENDERED_FACADES["aspen"] || "/facades/aspen-single-storey.png";
  }

  // Intercept any legacy 2019/2021 WordPress URL or old JPG
  for (const [key, modernUrl] of Object.entries(PRE_RENDERED_FACADES)) {
    const keyLower = key.toLowerCase();
    if (lower.includes(keyLower)) {
      if (
        lower.includes(`/${keyLower}.`) ||
        lower.includes(`${keyLower}-facade`) ||
        lower.includes(`${keyLower}_widescreen`) ||
        lower.includes(`facade-${keyLower}`)
      ) {
        return modernUrl;
      }
    }
  }

  const wpMatch = lower.match(/\/([a-z0-9_-]+)-facade/);
  if (wpMatch && wpMatch[1]) {
    const matchedKey = wpMatch[1];
    if (PRE_RENDERED_FACADES[matchedKey]) {
      return PRE_RENDERED_FACADES[matchedKey];
    }
  }

  return trimmed;
}

/** Facade framing: widescreen display with 100% roof protection, zero blur and zero black boxes */
function Facade({
  url,
  busy,
  className,
  isDouble,
}: {
  url?: string;
  busy?: boolean;
  className?: string;
  isDouble?: boolean;
}) {
  const resolvedUrl = useMemo(() => resolveUpdatedFacadeRender(url), [url]);
  const [imgSrc, setImgSrc] = useState(resolvedUrl || "");

  useEffect(() => {
    setImgSrc(resolvedUrl || "");
  }, [resolvedUrl]);

  const isDoubleOrSplit = Boolean(
    isDouble ||
    (resolvedUrl && (
      resolvedUrl.toLowerCase().includes("double") ||
      resolvedUrl.toLowerCase().includes("2-storey") ||
      resolvedUrl.toLowerCase().includes("-ds-") ||
      resolvedUrl.toLowerCase().includes("2stry") ||
      resolvedUrl.toLowerCase().includes("split") ||
      resolvedUrl.toLowerCase().includes("cobalt")
    ))
  );

  if (busy && !resolvedUrl) {
    return (
      <div className={`relative flex h-full w-full flex-col items-center justify-center bg-brand-navy-deep gap-3 p-4 text-white ${className ?? ""}`}>
        <Loader2 className="h-8 w-8 animate-spin text-brand-gold" />
        <span className="text-[3mm] font-semibold tracking-[0.18em] text-white uppercase drop-shadow">
          GENERATING AI FACADE RENDER…
        </span>
        <span className="text-[2.2mm] text-slate-300 drop-shadow">
          Designing landscaping &amp; widescreen architectural photography
        </span>
      </div>
    );
  }

  if (!resolvedUrl) {
    return (
      <div className={`flex h-full w-full flex-col items-center justify-center bg-slate-50/80 border border-dashed border-slate-300 rounded-[1.5mm] gap-1.5 p-4 ${className ?? ""}`}>
        <span className="text-[2.8mm] tracking-[0.2em] text-brand-navy/60 font-semibold uppercase">
          SELECT A FACADE TO VIEW RENDER
        </span>
        <span className="text-[2.1mm] text-brand-ink/40 font-normal">
          Choose a facade from the library on the left
        </span>
      </div>
    );
  }

  return (
    <div className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-transparent ${className ?? ""}`}>
      <img
        src={imgSrc}
        alt="Facade render"
        loading="eager"
        crossOrigin="anonymous"
        onError={() => {
          // If direct image fails to load, try first-party proxy
          if (resolvedUrl && !imgSrc.includes("/api/proxy-image") && !resolvedUrl.startsWith("data:")) {
            setImgSrc(`/api/proxy-image?url=${encodeURIComponent(resolvedUrl)}`);
          } else if (resolvedUrl && !imgSrc.includes("weserv.nl") && !resolvedUrl.startsWith("data:")) {
            setImgSrc(`https://images.weserv.nl/?url=${encodeURIComponent(resolvedUrl)}&output=jpg`);
          }
        }}
        className={`h-full w-full object-cover ${
          isDoubleOrSplit ? "object-[center_42%]" : "object-center"
        } ${busy ? "opacity-75" : ""}`}
        style={{
          imageRendering: "auto",
        }}
      />
      {busy && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs">
          <Loader2 className="h-8 w-8 animate-spin text-brand-gold shadow-sm mb-2" />
          <span className="text-[2.5mm] font-bold tracking-[0.2em] text-white uppercase drop-shadow-md">
            PREPARING RENDER…
          </span>
        </div>
      )}
    </div>
  );
}

function Spec({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof BedDouble;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-[2mm]">
      <Icon className="h-[4.2mm] w-[4.2mm] text-brand-gold-deep flex-none" strokeWidth={1.8} />
      <div className="leading-none">
        <div className="font-display text-[4.2mm] text-brand-navy font-semibold">{value || "—"}</div>
        <div className="mt-[0.6mm] text-[2.35mm] font-bold tracking-[0.14em] text-brand-ink/65">{label}</div>
      </div>
    </div>
  );
}

export function ContactStrip({ d, showTerms = true }: { d: FlyerData; showTerms?: boolean }) {
  const name = d.contactName || "Morgan Hales";
  const phone = d.contactPhone || "0417 571 864";
  const email = d.contactEmail || "Morgan.hales@hudsonhomes.com.au";
  const office = d.contactOffice || "Hudson Homes Queensland";

  const isNsw = Boolean(
    d.state === "NSW" ||
    (d.suburb && /sydney|parramatta|oran park|box hill|marsden park|austral|leppington|calderwood|menangle|the gables|blacktown|penrith|liverpool|hunter|newcastle|central coast|wollongong|nsw/i.test(d.suburb)) ||
    (d.address && /\bnsw\b/i.test(d.address)) ||
    (d.estate && /nsw|marsden|parramatta|box hill/i.test(d.estate)) ||
    (d.contactOffice && /nsw|parramatta|marsden|sydney/i.test(d.contactOffice)) ||
    (typeof window !== "undefined" && localStorage.getItem("hudson_active_division") === "NSW")
  );
  const flyerState = isNsw ? "NSW" : "QLD";

  const packagesUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/browse/packages?state=${flyerState}`
      : `https://www.hudsonhomeshouselandflyer.dev/browse/packages?state=${flyerState}`;

  const consultantSlug =
    d.consultantId ||
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
    "morgan-hales";

  const contactUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/c/${consultantSlug}`
      : `https://www.hudsonhomeshouselandflyer.dev/c/${consultantSlug}`;

  const termsText = getTermsText(d);

  return (
    <div className="w-full mt-auto flex flex-col gap-[1mm] pt-[1mm]">
      <div className="navy-panel w-full flex items-center justify-between gap-[3mm] px-[5mm] py-[2.2mm] rounded-[1.5mm]">
        {/* Left Side: Contact QR Code, NHC Name & Location, plus Phone & Email shifted left next to NHC name */}
        <div className="flex items-center gap-[3mm] min-w-0">
          <div className="flex items-center gap-[2mm] flex-none">
            <QrCode value={contactUrl} size={12} />
            <div className="flex flex-col justify-center min-w-0">
              <div className="text-[1.75mm] font-semibold leading-tight tracking-[0.1em] text-brand-gold uppercase whitespace-nowrap">
                SCAN TO SAVE CONTACT
              </div>
              <div className="font-sans font-bold text-[3.8mm] leading-[1.1] text-brand-cream tracking-[0.01em] mt-[0.3mm] whitespace-nowrap">
                {name}
              </div>
              {office && (
                <div className="mt-[0.3mm] text-[2.35mm] leading-[1.15] text-brand-cream/80 whitespace-nowrap font-normal">
                  {office}
                </div>
              )}
            </div>
          </div>

          {/* NHC Mobile & Email shifted to the left right next to NHC name */}
          <div className="flex flex-col justify-center gap-[0.7mm] text-[3.1mm] font-medium text-brand-cream/90 border-l border-white/20 pl-[3mm] flex-none">
            <span className="flex items-center gap-[1.3mm] whitespace-nowrap">
              <Phone className="h-[3.1mm] w-[3.1mm] text-brand-gold flex-none" strokeWidth={1.8} />
              {phone}
            </span>
            <span className="flex items-center gap-[1.3mm] whitespace-nowrap">
              <Mail className="h-[3.1mm] w-[3.1mm] text-brand-gold flex-none" strokeWidth={1.8} />
              {email}
            </span>
          </div>
        </div>

        {/* Right Side: Scan to View All Available Packages in this State */}
        <div className="flex flex-none items-center gap-[1.5mm] pl-[1mm]">
          <div className="text-right text-[1.75mm] font-semibold leading-[1.2] tracking-[0.1em] text-brand-cream/80 uppercase whitespace-nowrap">
            SCAN TO VIEW
            <br />
            {flyerState} PACKAGES
          </div>
          <QrCode value={packagesUrl} size={12} />
        </div>
      </div>

      {showTerms && termsText && (
        <div className="text-[1.6mm] leading-[1.25] text-brand-ink/60 text-justify tracking-[0.005em] px-[0.5mm] pt-[0.2mm]">
          {termsText}
        </div>
      )}
    </div>
  );
}

/* ------------------------- 1-Page Express Flyer ------------------------- */
export function ExpressFlyer({ d }: { d: FlyerData }) {
  return (
    <div className="flyer-page font-sans" data-palette={d.palette}>
      {/* Top Header: 5mm safe margin inside */}
      <div className="flex items-center justify-between px-[4mm] pt-[1mm] pb-[2mm]">
        <div className="flex items-center gap-[3.5mm]">
          <Logo size={14} />
        </div>
        <div className="flex items-center justify-end gap-[3.5mm]">
          {d.partnerEnabled && d.partnerLogoUrl && (
            <div className="flex items-center pr-[3mm] border-r border-brand-sand">
              <PartnerLogoBadge url={d.partnerLogoUrl} name={d.partnerName} size={9} />
            </div>
          )}
          <div className="text-right leading-tight">
            <div className="text-[3.2mm] font-bold tracking-[0.2em] text-brand-gold-deep">
              {d.headline.toUpperCase()}
            </div>
            <div className="mt-[0.5mm] flex items-baseline justify-end gap-[1.6mm]">
              <span className="text-[2.9mm] font-semibold tracking-[0.2em] text-brand-ink/50">FROM</span>
              <span className="font-display text-[9mm] leading-none text-brand-navy">
                {formatPrice(d.price)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="gold-bar h-[1.2mm] w-full rounded-full" />

      {/* Facade Hero: Proportional 77mm widescreen perspective (210:82 aspect ratio) */}
      <div className="h-[77mm] w-full rounded-[1.5mm] overflow-hidden my-[1.2mm]">
        <Facade url={d.facadeUrl} busy={d.facadeBusy} />
      </div>

      {/* Address Bar */}
      {(() => {
        const addressText = d.address || "Street Address";
        const showEstateSuffix = Boolean(d.estate && !addressText.toLowerCase().includes(d.estate.toLowerCase().trim()));
        const displayLocation = showEstateSuffix ? `${addressText} • ${d.estate}` : addressText;
        return (
          <div className="navy-panel flex items-center justify-between px-[6mm] py-[2mm] text-[3.4mm] font-medium text-brand-cream rounded-[1mm]">
            <div className="flex items-center gap-[2.2mm] min-w-0">
              <MapPin className="h-[3.8mm] w-[3.8mm] flex-none text-brand-gold" strokeWidth={1.8} />
              <span className="truncate">{displayLocation}</span>
            </div>
          </div>
        );
      })()}

      {/* Specs Strip */}
      <div className="flex items-center justify-between border-b border-brand-sand px-[6mm] py-[2.2mm]">
        <Spec icon={BedDouble} value={d.beds} label="BEDS" />
        <Spec icon={Bath} value={d.baths} label="BATHS" />
        <Spec icon={Car} value={d.cars} label="CARS" />
        <Spec icon={Maximize2} value={`${d.floorplanSize} m²`} label="HOME" />
        <Spec icon={Ruler} value={`${d.landSize} m²`} label="LAND" />
        <Spec icon={Ruler} value={`${d.landFrontage} m`} label="FRONTAGE" />
      </div>

      {/* Floorplan & Facade Title Header */}
      <div className="flex items-baseline gap-[3mm] px-[6mm] pt-[1.5mm] pb-[0.8mm]">
        <div className="text-[3.0mm] font-bold tracking-[0.22em] text-brand-gold-deep">
          FLOOR PLAN
        </div>
        <div className="text-[3.4mm] font-bold tracking-[0.08em] text-brand-navy">{d.floorplanName}</div>
        {d.facadeName && (
          <>
            <div className="ml-[3mm] text-[3.0mm] font-bold tracking-[0.22em] text-brand-gold-deep">
              FACADE
            </div>
            <div className="text-[3.4mm] font-bold tracking-[0.08em] text-brand-navy">{d.facadeName}</div>
          </>
        )}
      </div>

      {/* Floorplan & Inclusions Row */}
      <div className="grid grid-cols-[48mm_1fr] gap-[3.5mm] px-[2mm] pt-[0.8mm]">
        <div>
          <div className="text-[2.9mm] font-bold tracking-[0.16em] text-brand-gold-deep">
            {getRange(d.range).label.toUpperCase()}
          </div>
          <ul className="mt-[1.8mm] space-y-[1.2mm]">
            {rangeItems(d).map((line) => (
              <li key={line} className="flex gap-[1.5mm] text-[2.85mm] leading-[1.25]">
                <span className="mt-[1.2mm] h-[1.2mm] w-[1.2mm] flex-none rounded-full bg-brand-gold" />
                <span className="text-brand-ink/80">{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-[3mm] grid grid-cols-2 gap-[1.5mm]">
            <div className="rounded-[1.2mm] bg-brand-sand px-[2mm] py-[2mm]">
              <div className="text-[2.3mm] font-bold tracking-[0.12em] text-brand-ink/60 whitespace-nowrap">LAND ONLY</div>
              <div className="font-display text-[5.2mm] leading-[1.1] text-brand-navy">
                {formatPrice(d.landPrice)}
              </div>
            </div>
            <div className="rounded-[1.2mm] bg-brand-sand px-[2mm] py-[2mm]">
              <div className="text-[2.3mm] font-bold tracking-[0.12em] text-brand-ink/60 whitespace-nowrap">HOUSE ONLY</div>
              <div className="font-display text-[5.2mm] leading-[1.1] text-brand-navy">
                {formatPrice(d.housePrice)}
              </div>
            </div>
          </div>

          {d.showOtherSizes && d.otherSizes.length > 0 && (
            <div className="mt-[3mm]">
              <div className="text-[2.5mm] font-bold tracking-[0.14em] text-brand-gold-deep whitespace-nowrap uppercase">
                OTHER SIZES AVAILABLE
              </div>
              <div className="mt-[1.2mm] divide-y divide-brand-sand border-t border-brand-sand">
                {d.otherSizes.slice(0, 5).map((o) => (
                  <div
                    key={o.label + o.size}
                    className="flex items-center justify-between gap-[2mm] py-[0.8mm] text-[2.6mm] leading-tight"
                  >
                    <span className="whitespace-nowrap font-medium text-brand-ink/80 flex-none" title={o.label}>
                      {o.label}
                    </span>
                    <span className="flex-none font-semibold text-brand-navy tabular-nums ml-auto whitespace-nowrap">
                      {o.size}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Floorplan Frame: 130mm height */}
        <div className="flex h-[130mm] items-center justify-center overflow-hidden rounded-[1.5mm] border border-brand-sand bg-white p-[1.5mm]">
          {d.floorplanUrl ? (
            <img
              src={d.floorplanUrl}
              alt="Floorplan"
              className="block max-h-full max-w-full object-contain mix-blend-multiply"
              style={{ imageRendering: "auto" }}
            />
          ) : (
            <div className="text-center text-[3.2mm] text-brand-ink/40">
              Select a design to load its floorplan
            </div>
          )}
        </div>
      </div>

      <ContactStrip d={d} />
    </div>
  );
}

/* ---------------------- 2-Page Showcase Booklet ------------------------- */
export function ShowcaseCover({ d }: { d: FlyerData }) {
  const highlights = [
    { title: "Master Suite Retreat", desc: "Private ensuite and spacious walk-in robe sanctuary" },
    { title: "Gourmet Designer Kitchen", desc: "Stone benchtops, premium appliances & walk-in pantry" },
    { title: "Open-Plan Living & Dining", desc: "Expansive light-filled spaces connecting to outdoors" },
    { title: "Covered Alfresco Entertaining", desc: "Seamless indoor-outdoor Queensland lifestyle flow" },
  ];

  return (
    <div className="flyer-page font-sans" data-palette={d.palette}>
      {/* Top Header Bar */}
      <div className="navy-panel flex items-center justify-between px-[6mm] py-[2.8mm] rounded-t-[1.5mm]">
        <div className="flex items-center gap-[3.5mm]">
          <Logo light size={13} />
        </div>
        <div className="flex items-center gap-[3mm]">
          {d.partnerEnabled && d.partnerLogoUrl && (
            <div className="flex items-center pr-[3mm] border-r border-white/20">
              <PartnerLogoBadge url={d.partnerLogoUrl} name={d.partnerName} size={8} light />
            </div>
          )}
          <div className="rounded-[1mm] border border-brand-gold/30 bg-brand-gold/10 px-[2.5mm] py-[0.8mm] text-[2.2mm] font-bold tracking-[0.25em] text-brand-gold">
            PREMIUM SHOWCASE
          </div>
        </div>
      </div>

      <div className="gold-bar h-[1.2mm] w-full" />

      {/* Majestic Facade Cover Image with Safe Roof Clearance */}
      <div className="relative h-[77mm] w-full rounded-[1.5mm] overflow-hidden my-[1.5mm]">
        <Facade url={d.facadeUrl} busy={d.facadeBusy} />
        <div className="absolute inset-x-0 bottom-0 h-[15mm] bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
      </div>

      {/* Property Title & Location */}
      <div className="px-[6mm] pt-[2.5mm] pb-[1.5mm]">
        <div className="flex items-center justify-between">
          <div className="inline-flex rounded-[1mm] bg-brand-gold px-[2.8mm] py-[0.8mm] text-[2.8mm] font-bold tracking-[0.2em] text-brand-navy-deep">
            {d.headline.toUpperCase()}
          </div>
          {d.facadeName && (
            <div className="text-[3.2mm] font-bold tracking-[0.2em] text-brand-gold-deep">
              {d.facadeName.toUpperCase()} FACADE
            </div>
          )}
        </div>

        <div className="mt-[1.5mm] flex items-baseline justify-between">
          <div className="font-display text-[14mm] leading-[0.9] tracking-wide text-brand-navy">
            {d.floorplanName}
          </div>
          <div className="text-right">
            <div className="text-[2.5mm] font-bold tracking-[0.18em] text-brand-ink/50">TOTAL PACKAGE PRICE</div>
            <div className="font-display text-[9.5mm] leading-none text-brand-navy">
              {formatPrice(d.price)}
            </div>
          </div>
        </div>

        {(() => {
          const addressText = d.address || "Street Address";
          const showEstateSuffix = Boolean(d.estate && !addressText.toLowerCase().includes(d.estate.toLowerCase().trim()));
          const displayLocation = showEstateSuffix ? `${addressText} • ${d.estate}` : addressText;
          return (
            <div className="mt-[1.2mm] flex items-center gap-[2mm] text-[3.5mm] font-medium text-brand-ink/85">
              <MapPin className="h-[3.8mm] w-[3.8mm] text-brand-gold flex-none" strokeWidth={1.8} />
              {displayLocation}
            </div>
          );
        })()}
      </div>

      {/* Specs Strip */}
      <div className="flex items-center justify-between border-y border-brand-sand px-[6mm] py-[2.2mm] bg-brand-sand/30 rounded-[1mm]">
        <Spec icon={BedDouble} value={d.beds} label="BEDS" />
        <Spec icon={Bath} value={d.baths} label="BATHS" />
        <Spec icon={Car} value={d.cars} label="CARS" />
        <Spec icon={Maximize2} value={`${d.floorplanSize} m²`} label="HOME" />
        <Spec icon={Ruler} value={`${d.landSize} m²`} label="LAND" />
        <Spec icon={Ruler} value={`${d.landFrontage} m`} label="FRONTAGE" />
      </div>

      {/* Architectural Highlights Grid */}
      <div className="px-[6mm] py-[2.5mm]">
        <div className="text-[2.9mm] font-bold tracking-[0.24em] text-brand-gold-deep uppercase mb-[2mm]">
          ARCHITECTURAL DESIGN HIGHLIGHTS
        </div>
        <div className="grid grid-cols-2 gap-[2.5mm]">
          {highlights.map((h) => (
            <div key={h.title} className="rounded-[1.2mm] border border-brand-sand bg-white px-[3.5mm] py-[2.2mm]">
              <div className="flex items-center gap-[1.5mm]">
                <span className="h-[1.4mm] w-[1.4mm] rounded-full bg-brand-gold flex-none" />
                <span className="font-bold text-[3.1mm] text-brand-navy">{h.title}</span>
              </div>
              <p className="mt-[0.8mm] text-[2.6mm] leading-[1.25] text-brand-ink/75">{h.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <ContactStrip d={d} />
    </div>
  );
}

export function ShowcaseDetails({ d }: { d: FlyerData }) {
  const rows: [string, string][] = [
    ["Design / Floorplan", d.floorplanName],
    ["Home Size", `${d.floorplanSize} m²`],
    ["Land Size", `${d.landSize} m²`],
    ["Land Frontage", `${d.landFrontage} m`],
    ["Estate", d.estate || "—"],
    ["Suburb", d.suburb || "—"],
    ["Address", d.address || "—"],
  ];

  return (
    <div className="flyer-page font-sans" data-palette={d.palette}>
      {/* Top Header Bar */}
      <div className="navy-panel flex items-center justify-between px-[6mm] py-[2.8mm] rounded-t-[1.5mm]">
        <Logo light size={13} />
        <div className="font-display text-[5.2mm] tracking-[0.16em] text-brand-gold">
          FLOORPLAN &amp; SPECIFICATIONS
        </div>
      </div>

      <div className="gold-bar h-[1.2mm] w-full" />

      {/* Large Floorplan Showcase Frame */}
      <div className="px-[2mm] pt-[3mm]">
        <div className="flex h-[138mm] items-center justify-center overflow-hidden rounded-[1.5mm] border border-brand-sand bg-white p-[2.5mm]">
          {d.floorplanUrl ? (
            <img
              src={d.floorplanUrl}
              alt="Floorplan"
              className="max-h-full max-w-full object-contain mix-blend-multiply"
              style={{ imageRendering: "auto" }}
            />
          ) : (
            <div className="text-center text-[3.2mm] text-brand-ink/40">
              Select a design to load its floorplan
            </div>
          )}
        </div>
      </div>

      {/* Specifications & Inclusions Grid */}
      <div className="grid grid-cols-[1fr_1fr] gap-[5mm] px-[6mm] pt-[3mm]">
        <div>
          <div className="text-[2.9mm] font-bold tracking-[0.24em] text-brand-gold-deep">
            PACKAGE SPECIFICATION
          </div>
          <div className="mt-[1.8mm] divide-y divide-brand-sand">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-[2mm] py-[1.2mm] text-[2.9mm]">
                <span className="text-brand-ink/65">{k}</span>
                <span className="text-right font-semibold text-brand-navy">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[2.9mm] font-bold tracking-[0.24em] text-brand-gold-deep">
            {getRange(d.range).label.toUpperCase()} INCLUSIONS
          </div>
          <ul className="mt-[1.8mm] space-y-[1.2mm]">
            {rangeItems(d).slice(0, 5).map((line) => (
              <li key={line} className="flex gap-[1.5mm] text-[2.85mm] leading-[1.25]">
                <span className="mt-[1.2mm] h-[1.2mm] w-[1.2mm] flex-none rounded-full bg-brand-gold" />
                <span className="text-brand-ink/80">{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-[2.5mm] rounded-[1.2mm] bg-brand-sand px-[3mm] py-[2mm]">
            <div className="text-[2.4mm] font-bold tracking-[0.18em] text-brand-ink/50">TOTAL PACKAGE PRICE</div>
            <div className="font-display text-[7.5mm] leading-none text-brand-navy">
              {formatPrice(d.price)}
            </div>
          </div>
        </div>
      </div>

      <ContactStrip d={d} />
    </div>
  );
}

/* --------------------- House Only (no land content) --------------------- */
export function HouseOnlyFlyer({ d }: { d: FlyerData }) {
  return (
    <div className="flyer-page font-sans" data-palette={d.palette}>
      {/* Top Header */}
      <div className="flex items-center justify-between px-[4mm] pt-[1mm] pb-[2mm]">
        <div className="flex items-center gap-[3.5mm]">
          <Logo size={14} />
        </div>
        <div className="flex items-center justify-end gap-[3.5mm]">
          {d.partnerEnabled && d.partnerLogoUrl && (
            <div className="flex items-center pr-[3mm] border-r border-brand-sand">
              <PartnerLogoBadge url={d.partnerLogoUrl} name={d.partnerName} size={9} />
            </div>
          )}
          <div className="text-right leading-tight">
            <div className="text-[3.2mm] font-bold tracking-[0.2em] text-brand-gold-deep">
              NEW HOME DESIGN
            </div>
            <div className="mt-[0.5mm] flex items-baseline justify-end gap-[1.6mm]">
              <span className="text-[2.9mm] font-semibold tracking-[0.2em] text-brand-ink/50">FROM</span>
              <span className="font-display text-[9mm] leading-none text-brand-navy">
                {formatPrice(d.housePrice)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="gold-bar h-[1.2mm] w-full rounded-full" />

      {/* Facade Hero: Proportional 77mm widescreen perspective (210:82 aspect ratio) */}
      <div className="h-[77mm] w-full rounded-[1.5mm] overflow-hidden my-[1.2mm]">
        <Facade url={d.facadeUrl} busy={d.facadeBusy} />
      </div>

      {/* Design Name Banner */}
      <div className="navy-panel flex items-center justify-between gap-[2mm] px-[6mm] py-[2mm] text-brand-cream rounded-[1mm]">
        <div className="flex items-center gap-[2.5mm]">
          <span className="font-sans font-bold text-[4.4mm] leading-tight tracking-[0.02em]">
            {d.designName || d.floorplanName}
          </span>
        </div>
        {d.facadeName && (
          <span className="text-[3.2mm] font-semibold tracking-[0.16em] text-brand-gold">
            {d.facadeName.toUpperCase()} FACADE
          </span>
        )}
      </div>

      {/* Specs Strip */}
      <div className="flex items-center justify-between border-b border-brand-sand px-[6mm] py-[2.2mm]">
        <Spec icon={BedDouble} value={d.beds} label="BEDS" />
        <Spec icon={Bath} value={d.baths} label="BATHS" />
        <Spec icon={Car} value={d.cars} label="CARS" />
        <Spec icon={Maximize2} value={`${d.floorplanSize} m²`} label="HOME SIZE" />
      </div>

      {/* Floorplan & Facade Title Header */}
      <div className="flex items-baseline gap-[3mm] px-[6mm] pt-[1.5mm] pb-[0.8mm]">
        <div className="text-[3.0mm] font-bold tracking-[0.22em] text-brand-gold-deep">
          FLOOR PLAN
        </div>
        <div className="text-[3.4mm] font-bold tracking-[0.08em] text-brand-navy">{d.floorplanName}</div>
        {d.facadeName && (
          <>
            <div className="ml-[3mm] text-[3.0mm] font-bold tracking-[0.22em] text-brand-gold-deep">
              FACADE
            </div>
            <div className="text-[3.4mm] font-bold tracking-[0.08em] text-brand-navy">{d.facadeName}</div>
          </>
        )}
      </div>

      {/* Floorplan & Inclusions Row */}
      <div className="grid grid-cols-[48mm_1fr] gap-[3.5mm] px-[2mm] pt-[0.8mm]">
        <div>
          <div className="text-[2.9mm] font-bold tracking-[0.16em] text-brand-gold-deep">
            {getRange(d.range).label.toUpperCase()}
          </div>
          <ul className="mt-[1.8mm] space-y-[1.2mm]">
            {rangeItems(d).map((line) => (
              <li key={line} className="flex gap-[1.5mm] text-[2.85mm] leading-[1.25]">
                <span className="mt-[1.2mm] h-[1.2mm] w-[1.2mm] flex-none rounded-full bg-brand-gold" />
                <span className="text-brand-ink/80">{line}</span>
              </li>
            ))}
          </ul>

          <div className="mt-[3mm] rounded-[1.2mm] bg-brand-sand px-[2.2mm] py-[2mm]">
            <div className="text-[2.3mm] font-bold tracking-[0.12em] text-brand-ink/60 whitespace-nowrap">BUILD PRICE FROM</div>
            <div className="font-display text-[6.2mm] leading-[1.1] text-brand-navy">
              {formatPrice(d.housePrice)}
            </div>
            <div className="mt-[0.5mm] text-[2.3mm] leading-[1.2] text-brand-ink/65">
              Complete turnkey build, inclusions as listed.
            </div>
          </div>

          {d.showOtherSizes && d.otherSizes.length > 0 && (
            <div className="mt-[3mm]">
              <div className="text-[2.5mm] font-bold tracking-[0.14em] text-brand-gold-deep whitespace-nowrap uppercase">
                OTHER SIZES AVAILABLE
              </div>
              <div className="mt-[1.2mm] divide-y divide-brand-sand border-t border-brand-sand">
                {d.otherSizes.slice(0, 5).map((o) => (
                  <div
                    key={o.label + o.size}
                    className="flex items-center justify-between gap-[2mm] py-[0.8mm] text-[2.6mm] leading-tight"
                  >
                    <span className="whitespace-nowrap font-medium text-brand-ink/80 flex-none" title={o.label}>
                      {o.label}
                    </span>
                    <span className="flex-none font-semibold text-brand-navy tabular-nums ml-auto whitespace-nowrap">
                      {o.size}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Floorplan Frame */}
        <div className="flex h-[130mm] items-center justify-center overflow-hidden rounded-[1.5mm] border border-brand-sand bg-white p-[1.5mm]">
          {d.floorplanUrl ? (
            <img
              src={d.floorplanUrl}
              alt="Floorplan"
              className="block max-h-full max-w-full object-contain mix-blend-multiply"
              style={{ imageRendering: "auto" }}
            />
          ) : (
            <div className="text-center text-[3.2mm] text-brand-ink/40">
              Select a design to load its floorplan
            </div>
          )}
        </div>
      </div>

      <ContactStrip d={d} />
    </div>
  );
}

/* ------------------- Express Flyer V2 (Larger Logo, Modern Layout) ------------------- */
export function ExpressFlyerV2({ d }: { d: FlyerData }) {
  return (
    <div className="flyer-page font-sans" data-palette={d.palette}>
      {/* Top Header: 5mm safe margin inside */}
      <div className="flex items-center justify-between px-[4mm] pt-[1mm] pb-[2mm]">
        <div className="flex items-center gap-[3.5mm]">
          <LogoV2 size={15} />
        </div>
        <div className="flex items-center justify-end gap-[3.5mm]">
          {d.partnerEnabled && d.partnerLogoUrl && (
            <div className="flex items-center pr-[3mm] border-r border-brand-sand">
              <PartnerLogoBadge url={d.partnerLogoUrl} name={d.partnerName} size={9} />
            </div>
          )}
          <div className="text-right leading-tight">
            <div className="text-[3.2mm] font-bold tracking-[0.2em] text-brand-gold-deep">
              {d.headline.toUpperCase()}
            </div>
            <div className="mt-[0.5mm] flex items-baseline justify-end gap-[1.6mm]">
              <span className="text-[2.9mm] font-semibold tracking-[0.2em] text-brand-ink/50">FROM</span>
              <span className="font-display text-[9mm] leading-none text-brand-navy">
                {formatPrice(d.price)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="gold-bar h-[1.2mm] w-full rounded-full" />

      {/* Facade Hero: Proportional 77mm widescreen perspective (210:82 aspect ratio) */}
      <div className="h-[77mm] w-full rounded-[1.5mm] overflow-hidden my-[1.2mm]">
        <Facade url={d.facadeUrl} busy={d.facadeBusy} />
      </div>

      {/* Address Bar */}
      {(() => {
        const addressText = d.address || "Street Address";
        const showEstateSuffix = Boolean(d.estate && !addressText.toLowerCase().includes(d.estate.toLowerCase().trim()));
        const displayLocation = showEstateSuffix ? `${addressText} • ${d.estate}` : addressText;
        return (
          <div className="navy-panel flex items-center justify-between px-[6mm] py-[2mm] text-[3.4mm] font-medium text-brand-cream rounded-[1mm]">
            <div className="flex items-center gap-[2.2mm] min-w-0">
              <MapPin className="h-[3.8mm] w-[3.8mm] flex-none text-brand-gold" strokeWidth={1.8} />
              <span className="truncate">{displayLocation}</span>
            </div>
          </div>
        );
      })()}

      {/* Specs Strip */}
      <div className="flex items-center justify-between border-b border-brand-sand px-[6mm] py-[2.2mm]">
        <Spec icon={BedDouble} value={d.beds} label="BEDS" />
        <Spec icon={Bath} value={d.baths} label="BATHS" />
        <Spec icon={Car} value={d.cars} label="CARS" />
        <Spec icon={Maximize2} value={`${d.floorplanSize} m²`} label="HOME" />
        <Spec icon={Ruler} value={`${d.landSize} m²`} label="LAND" />
        <Spec icon={Ruler} value={`${d.landFrontage} m`} label="FRONTAGE" />
      </div>

      {/* Floorplan & Facade Title Header */}
      <div className="flex items-baseline gap-[3mm] px-[6mm] pt-[1.5mm] pb-[0.8mm]">
        <div className="text-[3.0mm] font-bold tracking-[0.22em] text-brand-gold-deep">
          FLOOR PLAN
        </div>
        <div className="text-[3.4mm] font-bold tracking-[0.08em] text-brand-navy">{d.floorplanName}</div>
        {d.facadeName && (
          <>
            <div className="ml-[3mm] text-[3.0mm] font-bold tracking-[0.22em] text-brand-gold-deep">
              FACADE
            </div>
            <div className="text-[3.4mm] font-bold tracking-[0.08em] text-brand-navy">{d.facadeName}</div>
          </>
        )}
      </div>

      {/* Floorplan & Inclusions Row */}
      <div className="grid grid-cols-[48mm_1fr] gap-[3.5mm] px-[2mm] pt-[0.8mm]">
        <div>
          <div className="text-[2.9mm] font-bold tracking-[0.16em] text-brand-gold-deep">
            {getRange(d.range).label.toUpperCase()}
          </div>
          <ul className="mt-[1.8mm] space-y-[1.2mm]">
            {rangeItems(d).map((line) => (
              <li key={line} className="flex gap-[1.5mm] text-[2.85mm] leading-[1.25]">
                <span className="mt-[1.2mm] h-[1.2mm] w-[1.2mm] flex-none rounded-full bg-brand-gold" />
                <span className="text-brand-ink/80">{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-[3mm] grid grid-cols-2 gap-[1.5mm]">
            <div className="rounded-[1.2mm] bg-brand-sand px-[2mm] py-[2mm]">
              <div className="text-[2.3mm] font-bold tracking-[0.12em] text-brand-ink/60 whitespace-nowrap">LAND ONLY</div>
              <div className="font-display text-[5.2mm] leading-[1.1] text-brand-navy">
                {formatPrice(d.landPrice)}
              </div>
            </div>
            <div className="rounded-[1.2mm] bg-brand-sand px-[2mm] py-[2mm]">
              <div className="text-[2.3mm] font-bold tracking-[0.12em] text-brand-ink/60 whitespace-nowrap">HOUSE ONLY</div>
              <div className="font-display text-[5.2mm] leading-[1.1] text-brand-navy">
                {formatPrice(d.housePrice)}
              </div>
            </div>
          </div>

          {d.showOtherSizes && d.otherSizes.length > 0 && (
            <div className="mt-[3mm]">
              <div className="text-[2.5mm] font-bold tracking-[0.14em] text-brand-gold-deep whitespace-nowrap uppercase">
                OTHER SIZES AVAILABLE
              </div>
              <div className="mt-[1.2mm] divide-y divide-brand-sand border-t border-brand-sand">
                {d.otherSizes.slice(0, 5).map((o) => (
                  <div
                    key={o.label + o.size}
                    className="flex items-center justify-between gap-[2mm] py-[0.8mm] text-[2.6mm] leading-tight"
                  >
                    <span className="whitespace-nowrap font-medium text-brand-ink/80 flex-none" title={o.label}>
                      {o.label}
                    </span>
                    <span className="flex-none font-semibold text-brand-navy tabular-nums ml-auto whitespace-nowrap">
                      {o.size}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Floorplan Frame: 130mm height */}
        <div className="flex h-[130mm] items-center justify-center overflow-hidden rounded-[1.5mm] border border-brand-sand bg-white p-[1.5mm]">
          {d.floorplanUrl ? (
            <img
              src={d.floorplanUrl}
              alt="Floorplan"
              className="block max-h-full max-w-full object-contain mix-blend-multiply"
              style={{ imageRendering: "auto" }}
            />
          ) : (
            <div className="text-center text-[3.2mm] text-brand-ink/40">
              Select a design to load its floorplan
            </div>
          )}
        </div>
      </div>

      <ContactStrip d={d} />
    </div>
  );
}

/* ----------------- House Only Flyer V2 (Larger Logo, Modern Layout) ----------------- */
export function HouseOnlyFlyerV2({ d }: { d: FlyerData }) {
  return (
    <div className="flyer-page font-sans" data-palette={d.palette}>
      {/* Top Header */}
      <div className="flex items-center justify-between px-[4mm] pt-[1mm] pb-[2mm]">
        <div className="flex items-center gap-[3.5mm]">
          <LogoV2 size={15} />
        </div>
        <div className="flex items-center justify-end gap-[3.5mm]">
          {d.partnerEnabled && d.partnerLogoUrl && (
            <div className="flex items-center pr-[3mm] border-r border-brand-sand">
              <PartnerLogoBadge url={d.partnerLogoUrl} name={d.partnerName} size={9} />
            </div>
          )}
          <div className="text-right leading-tight">
            <div className="text-[3.2mm] font-bold tracking-[0.2em] text-brand-gold-deep">
              NEW HOME DESIGN
            </div>
            <div className="mt-[0.5mm] flex items-baseline justify-end gap-[1.6mm]">
              <span className="text-[2.9mm] font-semibold tracking-[0.2em] text-brand-ink/50">FROM</span>
              <span className="font-display text-[9mm] leading-none text-brand-navy">
                {formatPrice(d.housePrice)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="gold-bar h-[1.2mm] w-full rounded-full" />

      {/* Facade Hero: Proportional 77mm widescreen perspective (210:82 aspect ratio) */}
      <div className="h-[77mm] w-full rounded-[1.5mm] overflow-hidden my-[1.2mm]">
        <Facade url={d.facadeUrl} busy={d.facadeBusy} />
      </div>

      {/* Design Name Banner */}
      <div className="navy-panel flex items-center justify-between gap-[2mm] px-[6mm] py-[2mm] text-brand-cream rounded-[1mm]">
        <div className="flex items-center gap-[2.5mm]">
          <span className="font-sans font-bold text-[4.4mm] leading-tight tracking-[0.02em]">
            {d.designName || d.floorplanName}
          </span>
        </div>
        {d.facadeName && (
          <span className="text-[3.2mm] font-semibold tracking-[0.16em] text-brand-gold">
            {d.facadeName.toUpperCase()} FACADE
          </span>
        )}
      </div>

      {/* Specs Strip */}
      <div className="flex items-center justify-between border-b border-brand-sand px-[6mm] py-[2.2mm]">
        <Spec icon={BedDouble} value={d.beds} label="BEDS" />
        <Spec icon={Bath} value={d.baths} label="BATHS" />
        <Spec icon={Car} value={d.cars} label="CARS" />
        <Spec icon={Maximize2} value={`${d.floorplanSize} m²`} label="HOME SIZE" />
      </div>

      {/* Floorplan & Facade Title Header */}
      <div className="flex items-baseline gap-[3mm] px-[6mm] pt-[1.5mm] pb-[0.8mm]">
        <div className="text-[3.0mm] font-bold tracking-[0.22em] text-brand-gold-deep">
          FLOOR PLAN
        </div>
        <div className="text-[3.4mm] font-bold tracking-[0.08em] text-brand-navy">{d.floorplanName}</div>
        {d.facadeName && (
          <>
            <div className="ml-[3mm] text-[3.0mm] font-bold tracking-[0.22em] text-brand-gold-deep">
              FACADE
            </div>
            <div className="text-[3.4mm] font-bold tracking-[0.08em] text-brand-navy">{d.facadeName}</div>
          </>
        )}
      </div>

      {/* Floorplan & Inclusions Row */}
      <div className="grid grid-cols-[48mm_1fr] gap-[3.5mm] px-[2mm] pt-[0.8mm]">
        <div>
          <div className="text-[2.9mm] font-bold tracking-[0.16em] text-brand-gold-deep">
            {getRange(d.range).label.toUpperCase()}
          </div>
          <ul className="mt-[1.8mm] space-y-[1.2mm]">
            {rangeItems(d).map((line) => (
              <li key={line} className="flex gap-[1.5mm] text-[2.85mm] leading-[1.25]">
                <span className="mt-[1.2mm] h-[1.2mm] w-[1.2mm] flex-none rounded-full bg-brand-gold" />
                <span className="text-brand-ink/80">{line}</span>
              </li>
            ))}
          </ul>

          <div className="mt-[3mm] rounded-[1.2mm] bg-brand-sand px-[2.2mm] py-[2mm]">
            <div className="text-[2.3mm] font-bold tracking-[0.12em] text-brand-ink/60 whitespace-nowrap">BUILD PRICE FROM</div>
            <div className="font-display text-[6.2mm] leading-[1.1] text-brand-navy">
              {formatPrice(d.housePrice)}
            </div>
            <div className="mt-[0.5mm] text-[2.3mm] leading-[1.2] text-brand-ink/65">
              Complete turnkey build, inclusions as listed.
            </div>
          </div>

          {d.showOtherSizes && d.otherSizes.length > 0 && (
            <div className="mt-[3mm]">
              <div className="text-[2.5mm] font-bold tracking-[0.14em] text-brand-gold-deep whitespace-nowrap uppercase">
                OTHER SIZES AVAILABLE
              </div>
              <div className="mt-[1.2mm] divide-y divide-brand-sand border-t border-brand-sand">
                {d.otherSizes.slice(0, 5).map((o) => (
                  <div
                    key={o.label + o.size}
                    className="flex items-center justify-between gap-[2mm] py-[0.8mm] text-[2.6mm] leading-tight"
                  >
                    <span className="whitespace-nowrap font-medium text-brand-ink/80 flex-none" title={o.label}>
                      {o.label}
                    </span>
                    <span className="flex-none font-semibold text-brand-navy tabular-nums ml-auto whitespace-nowrap">
                      {o.size}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Floorplan Frame */}
        <div className="flex h-[130mm] items-center justify-center overflow-hidden rounded-[1.5mm] border border-brand-sand bg-white p-[1.5mm]">
          {d.floorplanUrl ? (
            <img
              src={d.floorplanUrl}
              alt="Floorplan"
              className="block max-h-full max-w-full object-contain mix-blend-multiply"
              style={{ imageRendering: "auto" }}
            />
          ) : (
            <div className="text-center text-[3.2mm] text-brand-ink/40">
              Select a design to load its floorplan
            </div>
          )}
        </div>
      </div>

      <ContactStrip d={d} />
    </div>
  );
}
