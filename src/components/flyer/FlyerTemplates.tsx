import { useState, useEffect, useMemo } from "react";
import { BedDouble, Bath, Car, Ruler, MapPin, Phone, Mail, Maximize2, Loader2 } from "lucide-react";
import { getRange, rangeItems, type FlyerData } from "./types";
import { consultantVCard } from "./consultants";
import { QrCode } from "./QrCode";

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

export function Logo({
  light = false,
  size = 15,
  className = "",
}: {
  light?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-[3mm] ${className}`}>
      {/* Authentic Hudson Homes house mark emblem */}
      <HudsonMark size={size} />
      {/* Brand text to the right of emblem */}
      <div
        className={`border-l pl-[3mm] flex flex-col justify-center leading-none ${
          light ? "border-brand-cream/30" : "border-brand-navy/20"
        }`}
      >
        <div
          className={`font-sans font-bold tracking-[0.16em] ${
            light ? "text-white" : "text-brand-navy"
          }`}
          style={{ fontSize: `${size * 0.42}mm` }}
        >
          HUDSON HOMES
        </div>
        <div
          className={`mt-[0.9mm] tracking-[0.28em] font-semibold ${
            light ? "text-brand-gold" : "text-brand-gold-deep"
          }`}
          style={{ fontSize: `${size * 0.17}mm` }}
        >
          ZERO SURPRISES
        </div>
      </div>
    </div>
  );
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
  const [imgSrc, setImgSrc] = useState(url || "");

  useEffect(() => {
    setImgSrc(url || "");
  }, [url]);

  const isDoubleStorey = Boolean(
    isDouble ||
    (url && (url.toLowerCase().includes("double") || url.toLowerCase().includes("2-storey") || url.toLowerCase().includes("-ds-") || url.toLowerCase().includes("2stry")))
  );

  if (busy && !url) {
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

  if (!url) {
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
          if (url && !imgSrc.includes("/api/proxy-image") && !url.startsWith("data:")) {
            setImgSrc(`/api/proxy-image?url=${encodeURIComponent(url)}`);
          } else if (url && !imgSrc.includes("weserv.nl") && !url.startsWith("data:")) {
            setImgSrc(`https://images.weserv.nl/?url=${encodeURIComponent(url)}&output=jpg`);
          }
        }}
        className={`h-full w-full object-cover ${
          isDoubleStorey ? "object-[center_42%]" : "object-center"
        } ${busy ? "opacity-75" : ""}`}
        style={{
          imageRendering: "auto",
          transform: isDoubleStorey ? "scale(0.88)" : undefined,
          transformOrigin: "center 42%",
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
    <div className="flex items-center gap-[1.8mm]">
      <Icon className="h-[3.8mm] w-[3.8mm] text-brand-gold-deep flex-none" strokeWidth={1.7} />
      <div className="leading-none">
        <div className="font-display text-[3.8mm] text-brand-navy">{value || "—"}</div>
        <div className="mt-[0.5mm] text-[1.9mm] font-medium tracking-[0.16em] text-brand-ink/60">{label}</div>
      </div>
    </div>
  );
}

export function ContactStrip({ d }: { d: FlyerData }) {
  const name = d.contactName || "Morgan Hales";
  const phone = d.contactPhone || "0417 571 864";
  const email = d.contactEmail || "Morgan.hales@hudsonhomes.com.au";
  const office = d.contactOffice || "Hudson Homes Queensland";

  const targetPackageId = d.packageId || d.id;
  const packagesUrl =
    typeof window !== "undefined"
      ? (targetPackageId
          ? `${window.location.origin}/package/${targetPackageId}`
          : `${window.location.origin}/browse/packages`)
      : "https://www.hudsonhomeshouselandflyer.dev/browse/packages";

  const consultantSlug =
    d.consultantId ||
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
    "morgan-hales";

  const contactUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/c/${consultantSlug}`
      : `https://www.hudsonhomeshouselandflyer.dev/c/${consultantSlug}`;

  return (
    <div className="navy-panel w-full flex items-center justify-between gap-[3mm] px-[5mm] py-[2.2mm] rounded-[1.5mm] mt-auto">
      {/* Left Side: Contact QR Code, NHC Name & Location, plus Phone & Email shifted left next to NHC name */}
      <div className="flex items-center gap-[3mm] min-w-0">
        <div className="flex items-center gap-[2mm] flex-none">
          <QrCode value={contactUrl} size={12} />
          <div className="flex flex-col justify-center min-w-0">
            <div className="text-[1.5mm] font-semibold leading-tight tracking-[0.1em] text-brand-gold uppercase whitespace-nowrap">
              SCAN TO SAVE CONTACT
            </div>
            <div className="font-sans font-bold text-[3.2mm] leading-[1.1] text-brand-cream tracking-[0.01em] mt-[0.3mm] whitespace-nowrap">
              {name}
            </div>
            {office && (
              <div className="mt-[0.3mm] text-[2mm] leading-[1.15] text-brand-cream/80 whitespace-nowrap font-normal">
                {office}
              </div>
            )}
          </div>
        </div>

        {/* NHC Mobile & Email shifted to the left right next to NHC name */}
        <div className="flex flex-col justify-center gap-[0.6mm] text-[2.7mm] text-brand-cream/90 border-l border-white/20 pl-[3mm] flex-none">
          <span className="flex items-center gap-[1.2mm] whitespace-nowrap">
            <Phone className="h-[2.7mm] w-[2.7mm] text-brand-gold flex-none" strokeWidth={1.8} />
            {phone}
          </span>
          <span className="flex items-center gap-[1.2mm] whitespace-nowrap">
            <Mail className="h-[2.7mm] w-[2.7mm] text-brand-gold flex-none" strokeWidth={1.8} />
            {email}
          </span>
        </div>
      </div>

      {/* Right Side: Scan to View Customer Package PDF Webpage */}
      <div className="flex flex-none items-center gap-[1.5mm] pl-[1mm]">
        <div className="text-right text-[1.5mm] font-semibold leading-[1.2] tracking-[0.1em] text-brand-cream/80 uppercase whitespace-nowrap">
          {targetPackageId ? (
            <>
              SCAN TO VIEW
              <br />
              PACKAGE FLYER
            </>
          ) : (
            <>
              SCAN TO VIEW
              <br />
              OTHER PACKAGES
            </>
          )}
        </div>
        <QrCode value={packagesUrl} size={12} />
      </div>
    </div>
  );
}

/* ------------------------- 1-Page Express Flyer ------------------------- */
export function ExpressFlyer({ d }: { d: FlyerData }) {
  return (
    <div className="flyer-page font-sans" data-palette={d.palette}>
      {/* Top Header: 5mm safe margin inside */}
      <div className="flex items-center justify-between px-[4mm] pt-[1mm] pb-[2mm]">
        <div>
          <Logo size={14} />
        </div>
        <div className="text-right leading-tight">
          <div className="text-[2.6mm] font-bold tracking-[0.24em] text-brand-gold-deep">
            {d.headline.toUpperCase()}
          </div>
          <div className="mt-[0.5mm] flex items-baseline justify-end gap-[1.6mm]">
            <span className="text-[2.5mm] font-semibold tracking-[0.22em] text-brand-ink/50">FROM</span>
            <span className="font-display text-[9mm] leading-none text-brand-navy">
              {d.price || "$—"}
            </span>
          </div>
        </div>
      </div>

      <div className="gold-bar h-[1.2mm] w-full rounded-full" />

      {/* Facade Hero: Proportional 77mm widescreen perspective (210:82 aspect ratio) */}
      <div className="h-[77mm] w-full rounded-[1.5mm] overflow-hidden my-[1.2mm]">
        <Facade url={d.facadeUrl} busy={d.facadeBusy} />
      </div>

      {/* Address Bar */}
      <div className="navy-panel flex items-center gap-[2mm] px-[6mm] py-[1.8mm] text-[2.8mm] text-brand-cream rounded-[1mm]">
        <MapPin className="h-[3.2mm] w-[3.2mm] flex-none text-brand-gold" strokeWidth={1.8} />
        {[d.address, d.estate].filter(Boolean).join(" • ")}
      </div>

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
        <div className="text-[2.6mm] font-bold tracking-[0.28em] text-brand-gold-deep">
          FLOOR PLAN
        </div>
        <div className="text-[2.8mm] font-semibold tracking-[0.12em] text-brand-navy">{d.floorplanName}</div>
        {d.facadeName && (
          <>
            <div className="ml-[3mm] text-[2.6mm] font-bold tracking-[0.28em] text-brand-gold-deep">
              FACADE
            </div>
            <div className="text-[2.8mm] font-semibold tracking-[0.12em] text-brand-navy">{d.facadeName}</div>
          </>
        )}
      </div>

      {/* Floorplan & Inclusions Row */}
      <div className="grid grid-cols-[40mm_1fr] gap-[3mm] px-[2mm] pt-[0.8mm]">
        <div>
          <div className="text-[2.5mm] font-bold tracking-[0.22em] text-brand-gold-deep">
            {getRange(d.range).label.toUpperCase()}
          </div>
          <ul className="mt-[1.8mm] space-y-[1.2mm]">
            {rangeItems(d).map((line) => (
              <li key={line} className="flex gap-[1.5mm] text-[2.6mm] leading-[1.2]">
                <span className="mt-[1mm] h-[1mm] w-[1mm] flex-none rounded-full bg-brand-gold" />
                <span className="text-brand-ink/80">{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-[3mm] grid grid-cols-2 gap-[1.5mm]">
            <div className="rounded-[1.2mm] bg-brand-sand px-[2mm] py-[2mm]">
              <div className="text-[1.9mm] font-semibold tracking-[0.18em] text-brand-ink/50">LAND ONLY</div>
              <div className="font-display text-[4.8mm] leading-[1.1] text-brand-navy">
                {d.landPrice || "$—"}
              </div>
            </div>
            <div className="rounded-[1.2mm] bg-brand-sand px-[2mm] py-[2mm]">
              <div className="text-[1.9mm] font-semibold tracking-[0.18em] text-brand-ink/50">HOUSE ONLY</div>
              <div className="font-display text-[4.8mm] leading-[1.1] text-brand-navy">
                {d.housePrice || "$—"}
              </div>
            </div>
          </div>

          {d.showOtherSizes && d.otherSizes.length > 0 && (
            <div className="mt-[3mm]">
              <div className="text-[2.2mm] font-bold tracking-[0.22em] text-brand-gold-deep">
                OTHER SIZES AVAILABLE
              </div>
              <div className="mt-[1.2mm] divide-y divide-brand-sand border-t border-brand-sand">
                {d.otherSizes.slice(0, 5).map((o) => (
                  <div
                    key={o.label + o.size}
                    className="flex justify-between gap-[2mm] py-[1mm] text-[2.4mm]"
                  >
                    <span className="truncate text-brand-ink/70">{o.label}</span>
                    <span className="flex-none font-semibold text-brand-navy">{o.size}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Floorplan Frame: 136mm height */}
        <div className="flex h-[136mm] items-center justify-center overflow-hidden rounded-[1.5mm] border border-brand-sand bg-white p-[1.5mm]">
          {d.floorplanUrl ? (
            <img
              src={d.floorplanUrl}
              alt="Floorplan"
              className="block max-h-full max-w-full object-contain mix-blend-multiply"
              style={{ imageRendering: "auto" }}
            />
          ) : (
            <div className="text-center text-[3mm] text-brand-ink/40">
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
        <Logo light size={13} />
        <div className="rounded-[1mm] border border-brand-gold/30 bg-brand-gold/10 px-[2.5mm] py-[0.8mm] text-[2.2mm] font-bold tracking-[0.25em] text-brand-gold">
          PREMIUM SHOWCASE
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
          <div className="inline-flex rounded-[1mm] bg-brand-gold px-[2.8mm] py-[0.8mm] text-[2.3mm] font-bold tracking-[0.22em] text-brand-navy-deep">
            {d.headline.toUpperCase()}
          </div>
          {d.facadeName && (
            <div className="text-[2.6mm] font-bold tracking-[0.22em] text-brand-gold-deep">
              {d.facadeName.toUpperCase()} FACADE
            </div>
          )}
        </div>

        <div className="mt-[1.5mm] flex items-baseline justify-between">
          <div className="font-display text-[14mm] leading-[0.9] tracking-wide text-brand-navy">
            {d.floorplanName}
          </div>
          <div className="text-right">
            <div className="text-[2mm] font-bold tracking-[0.2em] text-brand-ink/50">TOTAL PACKAGE PRICE</div>
            <div className="font-display text-[9.5mm] leading-none text-brand-navy">
              {d.price || "$—"}
            </div>
          </div>
        </div>

        <div className="mt-[1.2mm] flex items-center gap-[2mm] text-[3mm] text-brand-ink/80">
          <MapPin className="h-[3.4mm] w-[3.4mm] text-brand-gold flex-none" strokeWidth={1.8} />
          {[d.address, d.estate].filter(Boolean).join(" • ")}
        </div>
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
        <div className="text-[2.4mm] font-bold tracking-[0.26em] text-brand-gold-deep uppercase mb-[2mm]">
          ARCHITECTURAL DESIGN HIGHLIGHTS
        </div>
        <div className="grid grid-cols-2 gap-[2.5mm]">
          {highlights.map((h) => (
            <div key={h.title} className="rounded-[1.2mm] border border-brand-sand bg-white px-[3.5mm] py-[2.2mm]">
              <div className="flex items-center gap-[1.5mm]">
                <span className="h-[1.4mm] w-[1.4mm] rounded-full bg-brand-gold flex-none" />
                <span className="font-bold text-[2.7mm] text-brand-navy">{h.title}</span>
              </div>
              <p className="mt-[0.8mm] text-[2.3mm] leading-[1.25] text-brand-ink/70">{h.desc}</p>
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
        <div className="font-display text-[5mm] tracking-[0.16em] text-brand-gold">
          FLOORPLAN &amp; SPECIFICATIONS
        </div>
      </div>

      <div className="gold-bar h-[1.2mm] w-full" />

      {/* Large Floorplan Showcase Frame */}
      <div className="px-[2mm] pt-[3mm]">
        <div className="flex h-[142mm] items-center justify-center overflow-hidden rounded-[1.5mm] border border-brand-sand bg-white p-[2.5mm]">
          {d.floorplanUrl ? (
            <img
              src={d.floorplanUrl}
              alt="Floorplan"
              className="max-h-full max-w-full object-contain mix-blend-multiply"
              style={{ imageRendering: "auto" }}
            />
          ) : (
            <div className="text-center text-[3mm] text-brand-ink/40">
              Select a design to load its floorplan
            </div>
          )}
        </div>
      </div>

      {/* Specifications & Inclusions Grid */}
      <div className="grid grid-cols-[1fr_1fr] gap-[5mm] px-[6mm] pt-[3mm]">
        <div>
          <div className="text-[2.5mm] font-bold tracking-[0.26em] text-brand-gold-deep">
            PACKAGE SPECIFICATION
          </div>
          <div className="mt-[1.8mm] divide-y divide-brand-sand">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-[2mm] py-[1.2mm] text-[2.6mm]">
                <span className="text-brand-ink/60">{k}</span>
                <span className="text-right font-semibold text-brand-navy">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[2.5mm] font-bold tracking-[0.26em] text-brand-gold-deep">
            {getRange(d.range).label.toUpperCase()} INCLUSIONS
          </div>
          <ul className="mt-[1.8mm] space-y-[1.2mm]">
            {rangeItems(d).slice(0, 5).map((line) => (
              <li key={line} className="flex gap-[1.5mm] text-[2.5mm] leading-[1.25]">
                <span className="mt-[1mm] h-[1mm] w-[1mm] flex-none rounded-full bg-brand-gold" />
                <span className="text-brand-ink/80">{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-[2.5mm] rounded-[1.2mm] bg-brand-sand px-[3mm] py-[2mm]">
            <div className="text-[2mm] font-bold tracking-[0.2em] text-brand-ink/50">TOTAL PACKAGE PRICE</div>
            <div className="font-display text-[7mm] leading-none text-brand-navy">
              {d.price || "$—"}
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
        <div>
          <Logo size={14} />
        </div>
        <div className="text-right leading-tight">
          <div className="text-[2.6mm] font-bold tracking-[0.24em] text-brand-gold-deep">
            NEW HOME DESIGN
          </div>
          <div className="mt-[0.5mm] flex items-baseline justify-end gap-[1.6mm]">
            <span className="text-[2.5mm] font-semibold tracking-[0.22em] text-brand-ink/50">FROM</span>
            <span className="font-display text-[9mm] leading-none text-brand-navy">
              {d.housePrice || "$—"}
            </span>
          </div>
        </div>
      </div>

      <div className="gold-bar h-[1.2mm] w-full rounded-full" />

      {/* Facade Hero: Proportional 77mm widescreen perspective (210:82 aspect ratio) */}
      <div className="h-[77mm] w-full rounded-[1.5mm] overflow-hidden my-[1.2mm]">
        <Facade url={d.facadeUrl} busy={d.facadeBusy} />
      </div>

      {/* Design Name Banner */}
      <div className="navy-panel flex items-center justify-between gap-[2mm] px-[6mm] py-[1.8mm] text-brand-cream rounded-[1mm]">
        <span className="font-sans font-bold text-[3.8mm] leading-tight tracking-[0.02em]">
          {d.designName || d.floorplanName}
        </span>
        {d.facadeName && (
          <span className="text-[2.6mm] font-semibold tracking-[0.18em] text-brand-gold">
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
        <div className="text-[2.6mm] font-bold tracking-[0.28em] text-brand-gold-deep">
          FLOOR PLAN
        </div>
        <div className="text-[2.8mm] font-semibold tracking-[0.12em] text-brand-navy">{d.floorplanName}</div>
        {d.facadeName && (
          <>
            <div className="ml-[3mm] text-[2.6mm] font-bold tracking-[0.28em] text-brand-gold-deep">
              FACADE
            </div>
            <div className="text-[2.8mm] font-semibold tracking-[0.12em] text-brand-navy">{d.facadeName}</div>
          </>
        )}
      </div>

      {/* Floorplan & Inclusions Row */}
      <div className="grid grid-cols-[40mm_1fr] gap-[3mm] px-[2mm] pt-[0.8mm]">
        <div>
          <div className="text-[2.5mm] font-bold tracking-[0.22em] text-brand-gold-deep">
            {getRange(d.range).label.toUpperCase()}
          </div>
          <ul className="mt-[1.8mm] space-y-[1.2mm]">
            {rangeItems(d).map((line) => (
              <li key={line} className="flex gap-[1.5mm] text-[2.6mm] leading-[1.2]">
                <span className="mt-[1mm] h-[1mm] w-[1mm] flex-none rounded-full bg-brand-gold" />
                <span className="text-brand-ink/80">{line}</span>
              </li>
            ))}
          </ul>

          <div className="mt-[3mm] rounded-[1.2mm] bg-brand-sand px-[2.2mm] py-[2mm]">
            <div className="text-[1.9mm] font-semibold tracking-[0.18em] text-brand-ink/50">BUILD PRICE FROM</div>
            <div className="font-display text-[5.5mm] leading-[1.1] text-brand-navy">
              {d.housePrice || "$—"}
            </div>
            <div className="mt-[0.5mm] text-[1.8mm] leading-[1.2] text-brand-ink/50">
              Fixed price build, inclusions as listed.
            </div>
          </div>

          {d.showOtherSizes && d.otherSizes.length > 0 && (
            <div className="mt-[3mm]">
              <div className="text-[2.2mm] font-bold tracking-[0.22em] text-brand-gold-deep">
                OTHER SIZES AVAILABLE
              </div>
              <div className="mt-[1.2mm] divide-y divide-brand-sand border-t border-brand-sand">
                {d.otherSizes.slice(0, 5).map((o) => (
                  <div
                    key={o.label + o.size}
                    className="flex justify-between gap-[2mm] py-[1mm] text-[2.4mm]"
                  >
                    <span className="truncate text-brand-ink/70">{o.label}</span>
                    <span className="flex-none font-semibold text-brand-navy">{o.size}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Floorplan Frame */}
        <div className="flex h-[136mm] items-center justify-center overflow-hidden rounded-[1.5mm] border border-brand-sand bg-white p-[1.5mm]">
          {d.floorplanUrl ? (
            <img
              src={d.floorplanUrl}
              alt="Floorplan"
              className="block max-h-full max-w-full object-contain mix-blend-multiply"
              style={{ imageRendering: "auto" }}
            />
          ) : (
            <div className="text-center text-[3mm] text-brand-ink/40">
              Select a design to load its floorplan
            </div>
          )}
        </div>
      </div>

      <ContactStrip d={d} />
    </div>
  );
}
