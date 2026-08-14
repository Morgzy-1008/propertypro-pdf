import { useState, useMemo } from "react";
import { BedDouble, Bath, Car, Ruler, MapPin, Phone, Mail, Maximize2, Loader2 } from "lucide-react";
import { getRange, rangeItems, type FlyerData } from "./types";
import { consultantVCard } from "./consultants";
import { QrCode } from "./QrCode";

/**
 * Pure vector SVG emblem for Hudson Homes house mark.
 * Razor-sharp at any resolution with zero pixelation or compression artifacts.
 */
export function HudsonMark({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 352 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ height: `${size}mm`, width: "auto" }}
      className={`flex-none object-contain ${className}`}
    >
      {/* Yellow / Gold (Left Foundation & Roof Angle) */}
      <polygon points="12,142 54,100 78,124 78,215 48,215 48,178 12,142" fill="#ECA72C" />
      {/* Lime Green (Left Tower Wall) */}
      <polygon points="56,50 106,50 118,215 84,215" fill="#8CB82B" />
      {/* Terracotta / Dark Red (Upper Left Roof Beam) */}
      <polygon points="120,54 186,0 200,28 136,88" fill="#9E2A2B" />
      {/* Cyan Blue (Center Body & Main Roof Slope) */}
      <polygon points="148,96 210,38 272,98 226,215 124,215" fill="#00A3E0" />
      {/* Magenta Pink (Right Facet) */}
      <polygon points="278,106 312,156 288,215 234,215" fill="#D62578" />
      {/* Purple (Right Accent Arrow) */}
      <polygon points="318,148 350,175 318,205" fill="#6E2A8D" />
    </svg>
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
    <img
      src={light ? "/hudson-homes-logo-light.png" : "/hudson-homes-logo.png"}
      alt="Hudson Homes"
      style={{ height: `${size}mm`, width: "auto" }}
      className={`flex-none object-contain ${className}`}
    />
  );
}

/** Facade framing: widescreen 2.69:1 display with full-bleed cover mode */
function Facade({
  url,
  busy,
  className,
}: {
  url?: string;
  busy?: boolean;
  className?: string;
}) {
  const displayUrl = useMemo(() => {
    if (!url) return "";
    if (url.startsWith("data:")) return url;
    if (url.startsWith("http://") || url.startsWith("https://")) {
      if (url.includes("weserv.nl")) return url;
      return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&output=jpg`;
    }
    return url;
  }, [url]);

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
      <div className={`flex h-full w-full flex-col items-center justify-center bg-slate-50 gap-2 p-4 ${className ?? ""}`}>
        <span className="text-[3mm] tracking-[0.2em] text-brand-ink/30 font-medium uppercase">
          SELECT A FACADE FROM THE LIBRARY
        </span>
      </div>
    );
  }

  return (
    <div className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-slate-100 ${className ?? ""}`}>
      <img
        src={displayUrl}
        alt="Facade render"
        loading="eager"
        className={`h-full w-full object-cover object-center ${busy ? "opacity-50 blur-[2px] scale-[1.02]" : ""}`}
        style={{ imageRendering: "auto" }}
      />
      {busy && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-brand-navy-deep/40 backdrop-blur-[2px]">
          <Loader2 className="h-8 w-8 animate-spin text-brand-gold shadow-sm mb-2" />
          <span className="text-[2.5mm] font-bold tracking-[0.2em] text-white uppercase drop-shadow-md">
            RE-GENERATING AI RENDER…
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
      <Icon className="h-[4mm] w-[4mm] text-brand-gold-deep flex-none" strokeWidth={1.7} />
      <div className="leading-none">
        <div className="font-display text-[4mm] text-brand-navy">{value || "—"}</div>
        <div className="mt-[0.5mm] text-[2mm] font-medium tracking-[0.16em] text-brand-ink/60">{label}</div>
      </div>
    </div>
  );
}

function ContactStrip({ d }: { d: FlyerData }) {
  const vcard = consultantVCard({
    name: d.contactName,
    phone: d.contactPhone,
    email: d.contactEmail,
    office: d.contactOffice,
  });
  return (
    <div className="navy-panel absolute inset-x-0 bottom-0 flex items-center justify-between gap-[5mm] px-[12mm] py-[2.4mm]">
      <div className="min-w-0">
        <div className="font-sans font-bold text-[3.8mm] leading-[1.1] text-brand-cream tracking-[0.02em]">
          {d.contactName}
        </div>
        {d.contactOffice && (
          <div className="mt-[0.5mm] truncate text-[2.4mm] text-brand-cream/70">
            {d.contactOffice}
          </div>
        )}
      </div>
      <div className="flex flex-none items-center gap-[4.5mm] text-[3.2mm] text-brand-cream/90">
        <span className="flex items-center gap-[1.4mm]">
          <Phone className="h-[3.3mm] w-[3.3mm] text-brand-gold" strokeWidth={1.8} />
          {d.contactPhone}
        </span>
        <span className="flex items-center gap-[1.4mm]">
          <Mail className="h-[3.3mm] w-[3.3mm] text-brand-gold" strokeWidth={1.8} />
          {d.contactEmail}
        </span>
      </div>
      <div className="flex flex-none items-center gap-[1.8mm]">
        <div className="text-right text-[1.9mm] leading-[1.2] tracking-[0.12em] text-brand-cream/70">
          SCAN TO SAVE
          <br />
          MY DETAILS
        </div>
        <QrCode value={vcard} size={11.5} />
      </div>
    </div>
  );
}

/* ------------------------- 1-Page Express Flyer ------------------------- */
export function ExpressFlyer({ d }: { d: FlyerData }) {
  return (
    <div className="flyer-page font-sans" data-palette={d.palette}>
      {/* Top Header: Optimized compact vertical padding */}
      <div className="flex items-center justify-between px-[10mm] pt-[4.5mm] pb-[2.5mm]">
        <div>
          <Logo size={15} />
        </div>
        <div className="text-right leading-tight">
          <div className="text-[2.7mm] font-bold tracking-[0.24em] text-brand-gold-deep">
            {d.headline.toUpperCase()}
          </div>
          <div className="mt-[0.5mm] flex items-baseline justify-end gap-[1.8mm]">
            <span className="text-[2.6mm] font-semibold tracking-[0.22em] text-brand-ink/50">FROM</span>
            <span className="font-display text-[9.5mm] leading-none text-brand-navy">
              {d.price || "$—"}
            </span>
          </div>
        </div>
      </div>

      <div className="gold-bar h-[1.5mm] w-full" />

      {/* Facade Hero: Majestic 82mm panoramic perspective */}
      <div className="h-[82mm] w-full">
        <Facade url={d.facadeUrl} busy={d.facadeBusy} />
      </div>

      {/* Address Bar */}
      <div className="navy-panel flex items-center gap-[2mm] px-[12mm] py-[2mm] text-[2.9mm] text-brand-cream">
        <MapPin className="h-[3.4mm] w-[3.4mm] flex-none text-brand-gold" strokeWidth={1.8} />
        {[d.address, d.estate].filter(Boolean).join(" • ")}
      </div>

      {/* Specs Strip */}
      <div className="flex items-center justify-between border-b border-brand-sand px-[12mm] py-[2.6mm]">
        <Spec icon={BedDouble} value={d.beds} label="BEDS" />
        <Spec icon={Bath} value={d.baths} label="BATHS" />
        <Spec icon={Car} value={d.cars} label="CARS" />
        <Spec icon={Maximize2} value={`${d.floorplanSize} m²`} label="HOME" />
        <Spec icon={Ruler} value={`${d.landSize} m²`} label="LAND" />
        <Spec icon={Ruler} value={`${d.landFrontage} m`} label="FRONTAGE" />
      </div>

      {/* Floorplan & Facade Title Header */}
      <div className="flex items-baseline gap-[3mm] px-[12mm] pt-[2.5mm] pb-[1mm]">
        <div className="text-[2.8mm] font-bold tracking-[0.28em] text-brand-gold-deep">
          FLOOR PLAN
        </div>
        <div className="text-[2.9mm] font-semibold tracking-[0.12em] text-brand-navy">{d.floorplanName}</div>
        {d.facadeName && (
          <>
            <div className="ml-[3mm] text-[2.8mm] font-bold tracking-[0.28em] text-brand-gold-deep">
              FACADE
            </div>
            <div className="text-[2.9mm] font-semibold tracking-[0.12em] text-brand-navy">{d.facadeName}</div>
          </>
        )}
      </div>

      {/* Floorplan & Inclusions Row */}
      <div className="grid grid-cols-[42mm_1fr] gap-[3.5mm] px-[7mm] pt-[1mm]">
        <div>
          <div className="text-[2.6mm] font-bold tracking-[0.22em] text-brand-gold-deep">
            {getRange(d.range).label.toUpperCase()}
          </div>
          <ul className="mt-[2mm] space-y-[1.3mm]">
            {rangeItems(d).map((line) => (
              <li key={line} className="flex gap-[1.6mm] text-[2.7mm] leading-[1.25]">
                <span className="mt-[1mm] h-[1.1mm] w-[1.1mm] flex-none rounded-full bg-brand-gold" />
                <span className="text-brand-ink/80">{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-[3.5mm] grid grid-cols-2 gap-[1.8mm]">
            <div className="rounded-[1.5mm] bg-brand-sand px-[2.2mm] py-[2.2mm]">
              <div className="text-[2mm] font-semibold tracking-[0.18em] text-brand-ink/50">LAND ONLY</div>
              <div className="font-display text-[5mm] leading-[1.1] text-brand-navy">
                {d.landPrice || "$—"}
              </div>
            </div>
            <div className="rounded-[1.5mm] bg-brand-sand px-[2.2mm] py-[2.2mm]">
              <div className="text-[2mm] font-semibold tracking-[0.18em] text-brand-ink/50">HOUSE ONLY</div>
              <div className="font-display text-[5mm] leading-[1.1] text-brand-navy">
                {d.housePrice || "$—"}
              </div>
            </div>
          </div>

          {d.showOtherSizes && d.otherSizes.length > 0 && (
            <div className="mt-[3.5mm]">
              <div className="text-[2.3mm] font-bold tracking-[0.22em] text-brand-gold-deep">
                OTHER SIZES AVAILABLE
              </div>
              <div className="mt-[1.5mm] divide-y divide-brand-sand border-t border-brand-sand">
                {d.otherSizes.slice(0, 6).map((o) => (
                  <div
                    key={o.label + o.size}
                    className="flex justify-between gap-[2mm] py-[1.2mm] text-[2.5mm]"
                  >
                    <span className="truncate text-brand-ink/70">{o.label}</span>
                    <span className="flex-none font-semibold text-brand-navy">{o.size}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Floorplan Frame: Expanded 139mm height */}
        <div className="flex h-[139mm] items-center justify-center overflow-hidden rounded-[1.5mm] border border-brand-sand bg-white p-[1.5mm]">
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
  return (
    <div className="flyer-page font-sans" data-palette={d.palette}>
      {/* Top Header Bar */}
      <div className="navy-panel flex items-center justify-between px-[12mm] py-[3.5mm]">
        <Logo light size={14} />
        <div className="rounded-[1mm] border border-brand-gold/30 bg-brand-gold/10 px-[2.8mm] py-[1mm] text-[2.4mm] font-bold tracking-[0.25em] text-brand-gold">
          PREMIUM SHOWCASE
        </div>
      </div>

      <div className="gold-bar h-[1.5mm] w-full" />

      {/* Majestic Facade Cover Image */}
      <div className="relative h-[148mm] w-full overflow-hidden bg-slate-900">
        <Facade url={d.facadeUrl} busy={d.facadeBusy} />
        <div className="absolute inset-x-0 bottom-0 h-[30mm] bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      {/* Property Title & Specification Highlights */}
      <div className="px-[12mm] pt-[5mm] pb-[3mm]">
        <div className="flex items-center justify-between">
          <div className="inline-flex rounded-[1mm] bg-brand-gold px-[3mm] py-[1.2mm] text-[2.6mm] font-bold tracking-[0.22em] text-brand-navy-deep">
            {d.headline.toUpperCase()}
          </div>
          {d.facadeName && (
            <div className="text-[2.8mm] font-bold tracking-[0.22em] text-brand-gold-deep">
              {d.facadeName.toUpperCase()} FACADE
            </div>
          )}
        </div>

        <div className="mt-[2.5mm] font-display text-[15mm] leading-[0.95] tracking-wide text-brand-navy">
          {d.floorplanName}
        </div>

        <div className="mt-[2mm] flex items-center gap-[2mm] text-[3.4mm] text-brand-ink/80">
          <MapPin className="h-[3.8mm] w-[3.8mm] text-brand-gold flex-none" strokeWidth={1.8} />
          {[d.address, d.estate].filter(Boolean).join(" • ")}
        </div>
      </div>

      <div className="gold-bar h-[1.2mm] w-full" />

      {/* Bottom Summary Bar */}
      <div className="flex items-center justify-between px-[12mm] py-[4.5mm]">
        <div>
          <div className="text-[2.5mm] font-bold tracking-[0.26em] text-brand-ink/50">
            FIXED PRICE PACKAGE FROM
          </div>
          <div className="mt-[0.5mm] font-display text-[13mm] leading-none text-brand-navy">
            {d.price || "$—"}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-[5mm]">
          <Spec icon={BedDouble} value={d.beds} label="BEDS" />
          <Spec icon={Bath} value={d.baths} label="BATHS" />
          <Spec icon={Car} value={d.cars} label="CARS" />
          <Spec icon={Maximize2} value={`${d.floorplanSize} m²`} label="HOME" />
          <Spec icon={Ruler} value={`${d.landSize} m²`} label="LAND" />
          <Spec icon={Ruler} value={`${d.landFrontage} m`} label="FRONTAGE" />
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
      <div className="navy-panel flex items-center justify-between px-[12mm] py-[3.5mm]">
        <Logo light size={14} />
        <div className="font-display text-[5.5mm] tracking-[0.16em] text-brand-gold">
          FLOORPLAN &amp; SPECIFICATIONS
        </div>
      </div>

      <div className="gold-bar h-[1.5mm] w-full" />

      {/* Large Floorplan Showcase Frame: 148mm tall */}
      <div className="px-[12mm] pt-[5mm]">
        <div className="flex h-[148mm] items-center justify-center overflow-hidden rounded-[2mm] border border-brand-sand bg-white p-[3mm]">
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
      <div className="grid grid-cols-[1fr_1fr] gap-[6mm] px-[12mm] pt-[4.5mm]">
        <div>
          <div className="text-[2.6mm] font-bold tracking-[0.26em] text-brand-gold-deep">
            PACKAGE SPECIFICATION
          </div>
          <div className="mt-[2mm] divide-y divide-brand-sand">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-[3mm] py-[1.5mm] text-[2.8mm]">
                <span className="text-brand-ink/60">{k}</span>
                <span className="text-right font-semibold text-brand-navy">{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[2.6mm] font-bold tracking-[0.26em] text-brand-gold-deep">
            {getRange(d.range).label.toUpperCase()} INCLUSIONS
          </div>
          <ul className="mt-[2mm] space-y-[1.4mm]">
            {rangeItems(d).slice(0, 5).map((line) => (
              <li key={line} className="flex gap-[1.8mm] text-[2.7mm] leading-[1.3]">
                <span className="mt-[1mm] h-[1.2mm] w-[1.2mm] flex-none rounded-full bg-brand-gold" />
                <span className="text-brand-ink/80">{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-[3.5mm] rounded-[1.5mm] bg-brand-sand px-[3.5mm] py-[2.5mm]">
            <div className="text-[2.2mm] font-bold tracking-[0.2em] text-brand-ink/50">TOTAL PACKAGE PRICE</div>
            <div className="font-display text-[8mm] leading-none text-brand-navy">
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
      {/* Top Header: Optimized compact vertical padding */}
      <div className="flex items-center justify-between px-[10mm] pt-[4.5mm] pb-[2.5mm]">
        <div>
          <Logo size={15} />
        </div>
        <div className="text-right leading-tight">
          <div className="text-[2.7mm] font-bold tracking-[0.24em] text-brand-gold-deep">
            NEW HOME DESIGN
          </div>
          <div className="mt-[0.5mm] flex items-baseline justify-end gap-[1.8mm]">
            <span className="text-[2.6mm] font-semibold tracking-[0.22em] text-brand-ink/50">FROM</span>
            <span className="font-display text-[9.5mm] leading-none text-brand-navy">
              {d.housePrice || "$—"}
            </span>
          </div>
        </div>
      </div>

      <div className="gold-bar h-[1.5mm] w-full" />

      {/* Facade Hero */}
      <div className="h-[84mm] w-full">
        <Facade url={d.facadeUrl} busy={d.facadeBusy} />
      </div>

      {/* Design Name Banner */}
      <div className="navy-panel flex items-center justify-between gap-[2mm] px-[12mm] py-[2mm] text-brand-cream">
        <span className="font-sans font-bold text-[4.2mm] leading-tight tracking-[0.02em]">
          {d.designName || d.floorplanName}
        </span>
        {d.facadeName && (
          <span className="text-[2.8mm] font-semibold tracking-[0.18em] text-brand-gold">
            {d.facadeName.toUpperCase()} FACADE
          </span>
        )}
      </div>

      {/* Specs Strip */}
      <div className="flex items-center justify-between border-b border-brand-sand px-[12mm] py-[2.6mm]">
        <Spec icon={BedDouble} value={d.beds} label="BEDS" />
        <Spec icon={Bath} value={d.baths} label="BATHS" />
        <Spec icon={Car} value={d.cars} label="CARS" />
        <Spec icon={Maximize2} value={`${d.floorplanSize} m²`} label="HOME SIZE" />
      </div>

      {/* Floorplan & Facade Title Header */}
      <div className="flex items-baseline gap-[3mm] px-[12mm] pt-[2.5mm] pb-[1mm]">
        <div className="text-[2.8mm] font-bold tracking-[0.28em] text-brand-gold-deep">
          FLOOR PLAN
        </div>
        <div className="text-[2.9mm] font-semibold tracking-[0.12em] text-brand-navy">{d.floorplanName}</div>
        {d.facadeName && (
          <>
            <div className="ml-[3mm] text-[2.8mm] font-bold tracking-[0.28em] text-brand-gold-deep">
              FACADE
            </div>
            <div className="text-[2.9mm] font-semibold tracking-[0.12em] text-brand-navy">{d.facadeName}</div>
          </>
        )}
      </div>

      {/* Floorplan & Inclusions Row */}
      <div className="grid grid-cols-[42mm_1fr] gap-[3.5mm] px-[7mm] pt-[1mm]">
        <div>
          <div className="text-[2.6mm] font-bold tracking-[0.22em] text-brand-gold-deep">
            {getRange(d.range).label.toUpperCase()}
          </div>
          <ul className="mt-[2mm] space-y-[1.3mm]">
            {rangeItems(d).map((line) => (
              <li key={line} className="flex gap-[1.6mm] text-[2.7mm] leading-[1.25]">
                <span className="mt-[1mm] h-[1.1mm] w-[1.1mm] flex-none rounded-full bg-brand-gold" />
                <span className="text-brand-ink/80">{line}</span>
              </li>
            ))}
          </ul>

          <div className="mt-[3.5mm] rounded-[1.5mm] bg-brand-sand px-[2.5mm] py-[2.2mm]">
            <div className="text-[2mm] font-semibold tracking-[0.18em] text-brand-ink/50">BUILD PRICE FROM</div>
            <div className="font-display text-[6mm] leading-[1.1] text-brand-navy">
              {d.housePrice || "$—"}
            </div>
            <div className="mt-[0.5mm] text-[1.9mm] leading-[1.2] text-brand-ink/50">
              Fixed price build, inclusions as listed.
            </div>
          </div>

          {d.showOtherSizes && d.otherSizes.length > 0 && (
            <div className="mt-[3.5mm]">
              <div className="text-[2.3mm] font-bold tracking-[0.22em] text-brand-gold-deep">
                OTHER SIZES AVAILABLE
              </div>
              <div className="mt-[1.5mm] divide-y divide-brand-sand border-t border-brand-sand">
                {d.otherSizes.slice(0, 6).map((o) => (
                  <div
                    key={o.label + o.size}
                    className="flex justify-between gap-[2mm] py-[1.2mm] text-[2.5mm]"
                  >
                    <span className="truncate text-brand-ink/70">{o.label}</span>
                    <span className="flex-none font-semibold text-brand-navy">{o.size}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Floorplan Frame: Expanded 139mm height */}
        <div className="flex h-[139mm] items-center justify-center overflow-hidden rounded-[1.5mm] border border-brand-sand bg-white p-[1.5mm]">
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
