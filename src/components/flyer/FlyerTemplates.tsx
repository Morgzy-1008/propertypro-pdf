import { useState } from "react";
import { BedDouble, Bath, Car, Ruler, MapPin, Phone, Mail, Maximize2, Loader2 } from "lucide-react";
const logoUrl = "/hudson-homes-logo.png";
import { getRange, rangeItems, type FlyerData } from "./types";
import { consultantVCard } from "./consultants";
import { QrCode } from "./QrCode";

function Logo({ light = false, size = 18 }: { light?: boolean; size?: number }) {
  return (
    <div className="flex items-center gap-[3.5mm]">
      <img
        src={logoUrl}
        alt="Hudson Homes"
        loading="eager"
        decoding="sync"
        style={{ height: `${size}mm`, imageRendering: "auto" }}
        className="w-auto object-contain [filter:saturate(1.08)_contrast(1.06)]"
      />
      <div
        className={`border-l pl-[3.5mm] leading-none ${
          light ? "border-brand-cream/30" : "border-brand-navy/20"
        }`}
      >
        <div
          className={`font-display tracking-[0.14em] ${
            light ? "text-brand-cream" : "text-brand-navy"
          }`}
          style={{ fontSize: `${size * 0.42}mm` }}
        >
          HUDSON HOMES
        </div>
        <div
          className={`mt-[1mm] tracking-[0.3em] ${
            light ? "text-brand-gold" : "text-brand-gold-deep"
          }`}
          style={{ fontSize: `${size * 0.16}mm` }}
        >
          ZERO SURPRISES
        </div>
      </div>
    </div>
  );
}

/** Facade framing: the render is re-composed into a wide frame with the whole
 *  house centred and generous clearance, so it can safely fill the section
 *  edge-to-edge without clipping the roofline or garage. */
function Facade({
  url,
  busy,
  className,
}: {
  url?: string;
  busy?: boolean;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);

  const displayUrl = useMemo(() => {
    if (!url) return "";
    if (url.startsWith("data:")) return url;
    if (url.startsWith("http://") || url.startsWith("https://")) {
      if (url.includes("weserv.nl")) return url;
      return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&output=jpg`;
    }
    return url;
  }, [url]);

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
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          setLoaded(true);
          console.warn("[FacadeFrame Load Error]", e);
        }}
        className="h-full w-full object-cover object-center scale-[1.04]"
        style={{
          objectPosition: "center top",
          imageRendering: "-webkit-optimize-contrast",
        }}
      />
      {busy && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-[2px] gap-2 p-4 text-white">
          <Loader2 className="h-6 w-6 animate-spin text-brand-gold" />
          <span className="text-[3mm] font-semibold tracking-[0.18em] text-white uppercase drop-shadow">
            GENERATING AI FACADE RENDER…
          </span>
          <span className="text-[2.2mm] tracking-wide text-slate-200 drop-shadow">
            Outpainting landscaping &amp; widescreen architectural photography
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
      <Icon className="h-[4.2mm] w-[4.2mm] text-brand-gold-deep" strokeWidth={1.6} />
      <div className="leading-none">
        <div className="font-display text-[4.2mm] text-brand-navy">{value || "—"}</div>
        <div className="mt-[0.6mm] text-[2.1mm] tracking-[0.18em] text-brand-ink/60">{label}</div>
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
    <div className="navy-panel absolute inset-x-0 bottom-0 flex items-center justify-between gap-[5mm] px-[14mm] py-[2.8mm]">
      <div className="min-w-0">
        <div className="font-display text-[4.2mm] leading-[1.1] tracking-wide text-brand-cream">
          {d.contactName}
        </div>
        {d.contactOffice && (
          <div className="mt-[0.6mm] truncate text-[2.5mm] text-brand-cream/70">
            {d.contactOffice}
          </div>
        )}
      </div>
      <div className="flex flex-none items-center gap-[4.5mm] text-[2.8mm] text-brand-cream/90">
        <span className="flex items-center gap-[1.4mm]">
          <Phone className="h-[2.8mm] w-[2.8mm] text-brand-gold" strokeWidth={1.8} />
          {d.contactPhone}
        </span>
        <span className="flex items-center gap-[1.4mm]">
          <Mail className="h-[2.8mm] w-[2.8mm] text-brand-gold" strokeWidth={1.8} />
          {d.contactEmail}
        </span>
      </div>
      <div className="flex flex-none items-center gap-[1.8mm]">
        <div className="text-right text-[2mm] leading-[1.25] tracking-[0.12em] text-brand-cream/70">
          SCAN TO SAVE
          <br />
          MY DETAILS
        </div>
        <QrCode value={vcard} size={13} />
      </div>
    </div>
  );
}

/* ------------------------- 1-Page Express Flyer ------------------------- */
export function ExpressFlyer({ d }: { d: FlyerData }) {
  return (
    <div className="flyer-page font-sans" data-palette={d.palette}>
      <div className="flex items-end justify-between px-[14mm] pt-[8mm] pb-[4mm]">
        <Logo size={17} />
        <div className="text-right">
          <div className="text-[3mm] font-semibold tracking-[0.26em] text-brand-gold-deep">
            {d.headline.toUpperCase()}
          </div>
          <div className="mt-[1mm] flex items-baseline justify-end gap-[2mm]">
            <span className="text-[3mm] tracking-[0.25em] text-brand-ink/50">FROM</span>
            <span className="font-display text-[11mm] leading-[1] text-brand-navy">
              {d.price || "$—"}
            </span>
          </div>
        </div>
      </div>

      <div className="gold-bar h-[1.6mm] w-full" />

      <div className="h-[78mm] w-full">
        <Facade url={d.facadeUrl} busy={d.facadeBusy} />
      </div>

      <div className="navy-panel flex items-center gap-[2mm] px-[14mm] py-[2.4mm] text-[3.1mm] text-brand-cream">
        <MapPin className="h-[3.6mm] w-[3.6mm] flex-none text-brand-gold" strokeWidth={1.8} />
        {[d.address, d.estate, d.suburb].filter(Boolean).join(" · ")}
      </div>

      <div className="flex items-center justify-between border-b border-brand-sand px-[14mm] py-[3mm]">
        <Spec icon={BedDouble} value={d.beds} label="BEDS" />
        <Spec icon={Bath} value={d.baths} label="BATHS" />
        <Spec icon={Car} value={d.cars} label="CARS" />
        <Spec icon={Maximize2} value={`${d.floorplanSize} m²`} label="HOME" />
        <Spec icon={Ruler} value={`${d.landSize} m²`} label="LAND" />
        <Spec icon={Ruler} value={`${d.landFrontage} m`} label="FRONTAGE" />
      </div>

      <div className="flex items-baseline gap-[3mm] px-[14mm] pt-[3mm]">
        <div className="text-[3mm] font-semibold tracking-[0.3em] text-brand-gold-deep">
          FLOOR PLAN
        </div>
        <div className="text-[3mm] tracking-[0.15em] text-brand-navy">{d.floorplanName}</div>
        {d.facadeName && (
          <>
            <div className="ml-[4mm] text-[3mm] font-semibold tracking-[0.3em] text-brand-gold-deep">
              FACADE
            </div>
            <div className="text-[3mm] tracking-[0.15em] text-brand-navy">{d.facadeName}</div>
          </>
        )}
      </div>


      <div className="grid grid-cols-[40mm_1fr] gap-[3mm] px-[7mm] pt-[2mm]">
        <div>
          <div className="text-[2.7mm] tracking-[0.25em] text-brand-gold-deep">
            {getRange(d.range).label.toUpperCase()}
          </div>
          <ul className="mt-[2.5mm] space-y-[1.5mm]">
            {rangeItems(d).map((line) => (
              <li key={line} className="flex gap-[1.8mm] text-[2.8mm] leading-[1.3]">
                <span className="mt-[1.1mm] h-[1.2mm] w-[1.2mm] flex-none rounded-full bg-brand-gold" />
                <span className="text-brand-ink/80">{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-[4mm] grid grid-cols-2 gap-[2mm]">
            <div className="rounded-[1.5mm] bg-brand-sand px-[2.5mm] py-[2.5mm]">
              <div className="text-[2.2mm] tracking-[0.2em] text-brand-ink/50">LAND ONLY</div>
              <div className="font-display text-[5.4mm] leading-[1.1] text-brand-navy">
                {d.landPrice || "$—"}
              </div>
            </div>
            <div className="rounded-[1.5mm] bg-brand-sand px-[2.5mm] py-[2.5mm]">
              <div className="text-[2.2mm] tracking-[0.2em] text-brand-ink/50">HOUSE ONLY</div>
              <div className="font-display text-[5.4mm] leading-[1.1] text-brand-navy">
                {d.housePrice || "$—"}
              </div>
            </div>
          </div>

          {d.showOtherSizes && d.otherSizes.length > 0 && (
            <div className="mt-[4mm]">
              <div className="text-[2.4mm] tracking-[0.25em] text-brand-gold-deep">
                OTHER SIZES AVAILABLE
              </div>
              <div className="mt-[2mm] divide-y divide-brand-sand border-t border-brand-sand">
                {d.otherSizes.slice(0, 6).map((o) => (
                  <div
                    key={o.label + o.size}
                    className="flex justify-between gap-[2mm] py-[1.4mm] text-[2.6mm]"
                  >
                    <span className="truncate text-brand-ink/70">{o.label}</span>
                    <span className="flex-none font-medium text-brand-navy">{o.size}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex h-[136mm] items-center justify-center overflow-hidden rounded-[1.5mm] border border-brand-sand bg-white">
          {d.floorplanUrl ? (
            <img
              src={d.floorplanUrl}
              alt="Floorplan"
              className="block h-full w-full object-contain mix-blend-multiply"
              style={{ imageRendering: "-webkit-optimize-contrast" }}
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
      <div className="relative h-[172mm] w-full">
        <Facade url={d.facadeUrl} busy={d.facadeBusy} />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-navy-deep/70 via-transparent to-brand-navy-deep/70" />
        <div className="absolute inset-x-[14mm] top-[12mm]">
          <Logo light />
        </div>
        <div className="absolute inset-x-[14mm] bottom-[12mm]">
          <div className="inline-flex rounded-[1mm] bg-brand-gold px-[3mm] py-[1.4mm] text-[2.8mm] font-semibold tracking-[0.25em] text-brand-navy-deep">
            {d.headline.toUpperCase()}
          </div>
          <div className="mt-[4mm] font-display text-[20mm] leading-[0.9] tracking-wide text-brand-cream">
            {d.floorplanName}
          </div>
          <div className="mt-[3mm] flex items-center gap-[2mm] text-[4mm] text-brand-cream/85">
            <MapPin className="h-[4.5mm] w-[4.5mm] text-brand-gold" strokeWidth={1.8} />
            {[d.address, d.estate, d.suburb].filter(Boolean).join(" · ")}
          </div>
        </div>
      </div>

      <div className="gold-bar h-[2mm] w-full" />

      <div className="flex items-end justify-between px-[14mm] pt-[9mm]">
        <div>
          <div className="text-[2.8mm] tracking-[0.3em] text-brand-ink/50">
            FIXED PRICE PACKAGE FROM
          </div>
          <div className="font-display text-[18mm] leading-[1] text-brand-navy">
            {d.price || "$—"}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-[7mm] pb-[3mm]">
          <Spec icon={BedDouble} value={d.beds} label="BEDS" />
          <Spec icon={Bath} value={d.baths} label="BATHS" />
          <Spec icon={Car} value={d.cars} label="CARS" />
        </div>
      </div>

      <ContactStrip d={d} />
    </div>
  );
}

export function ShowcaseDetails({ d }: { d: FlyerData }) {
  const rows: [string, string][] = [
    ["Floorplan", d.floorplanName],
    ["Home size", `${d.floorplanSize} m²`],
    ["Land size", `${d.landSize} m²`],
    ["Land frontage", `${d.landFrontage} m`],
    ["Estate", d.estate],
    ["Suburb", d.suburb],
    ["Address", d.address],
  ];

  return (
    <div className="flyer-page font-sans" data-palette={d.palette}>
      <div className="navy-panel flex items-center justify-between px-[14mm] py-[9mm]">
        <Logo light />
        <div className="font-display text-[7mm] tracking-[0.15em] text-brand-gold">
          FLOORPLAN &amp; DETAILS
        </div>
      </div>

      <div className="px-[14mm] pt-[9mm]">
        <div className="flex h-[132mm] items-center justify-center rounded-[2mm] border border-brand-sand bg-white p-[2mm]">
          {d.floorplanUrl ? (
            <img
              src={d.floorplanUrl}
              alt="Floorplan"
              className="h-full w-full object-contain mix-blend-multiply"
              style={{ imageRendering: "-webkit-optimize-contrast" }}
            />
          ) : (
            <div className="text-center text-[3.4mm] text-brand-ink/40">
              Select a design to load its floorplan
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1fr] gap-[9mm] px-[14mm] pt-[9mm]">
        <div>
          <div className="text-[2.8mm] tracking-[0.3em] text-brand-gold-deep">
            PACKAGE SPECIFICATION
          </div>
          <div className="mt-[3mm] divide-y divide-brand-sand">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-[4mm] py-[2mm] text-[3.1mm]">
                <span className="text-brand-ink/50">{k}</span>
                <span className="text-right font-medium text-brand-navy">{v || "—"}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[2.8mm] tracking-[0.3em] text-brand-gold-deep">
            {getRange(d.range).label.toUpperCase()} INCLUSIONS
          </div>
          <ul className="mt-[3mm] space-y-[1.8mm]">
            {rangeItems(d).map((line) => (
              <li key={line} className="flex gap-[2mm] text-[3.1mm] leading-[1.4]">
                <span className="mt-[1.4mm] h-[1.4mm] w-[1.4mm] flex-none rounded-full bg-brand-gold" />
                <span className="text-brand-ink/80">{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-[6mm] rounded-[2mm] bg-brand-sand px-[5mm] py-[4mm]">
            <div className="text-[2.6mm] tracking-[0.25em] text-brand-ink/50">FROM</div>
            <div className="font-display text-[10mm] leading-[1] text-brand-navy">
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
      <div className="flex items-end justify-between px-[14mm] pt-[8mm] pb-[4mm]">
        <Logo size={17} />
        <div className="text-right">
          <div className="text-[3mm] font-semibold tracking-[0.26em] text-brand-gold-deep">
            NEW HOME DESIGN
          </div>
          <div className="mt-[1mm] flex items-baseline justify-end gap-[2mm]">
            <span className="text-[3mm] tracking-[0.25em] text-brand-ink/50">FROM</span>
            <span className="font-display text-[11mm] leading-[1] text-brand-navy">
              {d.housePrice || "$—"}
            </span>
          </div>
        </div>
      </div>

      <div className="gold-bar h-[1.6mm] w-full" />

      <div className="h-[82mm] w-full">
        <Facade url={d.facadeUrl} busy={d.facadeBusy} />
      </div>

      <div className="navy-panel flex items-center justify-between gap-[2mm] px-[14mm] py-[2.4mm] text-brand-cream">
        <span className="font-display text-[4.6mm] leading-[1] tracking-wide">
          {d.designName || d.floorplanName}
        </span>
        {d.facadeName && (
          <span className="text-[3mm] tracking-[0.18em] text-brand-cream/75">
            {d.facadeName.toUpperCase()} FACADE
          </span>
        )}
      </div>

      <div className="flex items-center justify-between border-b border-brand-sand px-[14mm] py-[3mm]">
        <Spec icon={BedDouble} value={d.beds} label="BEDS" />
        <Spec icon={Bath} value={d.baths} label="BATHS" />
        <Spec icon={Car} value={d.cars} label="CARS" />
        <Spec icon={Maximize2} value={`${d.floorplanSize} m²`} label="HOME SIZE" />
      </div>

      <div className="flex items-baseline gap-[3mm] px-[14mm] pt-[3mm]">
        <div className="text-[3mm] font-semibold tracking-[0.3em] text-brand-gold-deep">
          FLOOR PLAN
        </div>
        <div className="text-[3mm] tracking-[0.15em] text-brand-navy">{d.floorplanName}</div>
        {d.facadeName && (
          <>
            <div className="ml-[4mm] text-[3mm] font-semibold tracking-[0.3em] text-brand-gold-deep">
              FACADE
            </div>
            <div className="text-[3mm] tracking-[0.15em] text-brand-navy">{d.facadeName}</div>
          </>
        )}
      </div>


      <div className="grid grid-cols-[40mm_1fr] gap-[3mm] px-[7mm] pt-[2mm]">
        <div>
          <div className="text-[2.7mm] tracking-[0.25em] text-brand-gold-deep">
            {getRange(d.range).label.toUpperCase()}
          </div>
          <ul className="mt-[2.5mm] space-y-[1.5mm]">
            {rangeItems(d).map((line) => (
              <li key={line} className="flex gap-[1.8mm] text-[2.8mm] leading-[1.3]">
                <span className="mt-[1.1mm] h-[1.2mm] w-[1.2mm] flex-none rounded-full bg-brand-gold" />
                <span className="text-brand-ink/80">{line}</span>
              </li>
            ))}
          </ul>

          <div className="mt-[4mm] rounded-[1.5mm] bg-brand-sand px-[2.5mm] py-[2.5mm]">
            <div className="text-[2.2mm] tracking-[0.2em] text-brand-ink/50">BUILD PRICE FROM</div>
            <div className="font-display text-[7mm] leading-[1.1] text-brand-navy">
              {d.housePrice || "$—"}
            </div>
            <div className="mt-[1mm] text-[2.1mm] leading-[1.3] text-brand-ink/50">
              Fixed price build, inclusions as listed.
            </div>
          </div>

          {d.showOtherSizes && d.otherSizes.length > 0 && (
            <div className="mt-[4mm]">
              <div className="text-[2.4mm] tracking-[0.25em] text-brand-gold-deep">
                OTHER SIZES AVAILABLE
              </div>
              <div className="mt-[2mm] divide-y divide-brand-sand border-t border-brand-sand">
                {d.otherSizes.slice(0, 6).map((o) => (
                  <div
                    key={o.label + o.size}
                    className="flex justify-between gap-[2mm] py-[1.4mm] text-[2.6mm]"
                  >
                    <span className="truncate text-brand-ink/70">{o.label}</span>
                    <span className="flex-none font-medium text-brand-navy">{o.size}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex h-[136mm] items-center justify-center overflow-hidden rounded-[1.5mm] border border-brand-sand bg-white">
          {d.floorplanUrl ? (
            <img
              src={d.floorplanUrl}
              alt="Floorplan"
              className="block h-full w-full object-contain mix-blend-multiply"
              style={{ imageRendering: "-webkit-optimize-contrast" }}
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
