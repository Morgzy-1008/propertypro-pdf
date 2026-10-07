import React from "react";
import { formatAud } from "@/lib/pricing";
import { Logo } from "@/components/flyer/FlyerTemplates";
import {
  calculateCustomTotalM2,
  calculateModifiedFloorplanPricing,
  calculateTopographyFallCost,
  getEffectiveDesignM2,
  getEffectiveDesignName,
  getHousingTypeForDesign,
  getSoilRatePerM2,
  isDoubleStoreyDesign,
} from "@/lib/quoting/quoteEngine";
import { findFacadeForDesign } from "@/lib/quoting/facadeLookup";
import { isLocalhost } from "@/lib/isLocalhost";
import { getHudsonCompanyInfo } from "@/lib/divisionContext";
import {
  CheckCircle2,
  Award,
  Sparkles,
  Home,
  ShieldCheck,
  Building,
  Building2,
  FileCheck2,
  Check,
  Layers,
  ArrowDownUp,
  Shield,
  Waves,
  Hammer,
  Mountain,
  Flame,
  Volume2,
  Truck,
  CheckSquare,
  FileText,
  PackageCheck,
  MapPin,
  Maximize2,
} from "lucide-react";
import { PaymentQrCode } from "./PaymentQrCode";
import { QrCode } from "@/components/flyer/QrCode";

function getCategoryIcon(label: string) {
  const l = label.toLowerCase();
  if (l.includes("earthwork") || l.includes("soil") || l.includes("foundation")) {
    return <Layers className="h-3.5 w-3.5 text-cyan-700 flex-none" />;
  }
  if (l.includes("report") || l.includes("overlay")) {
    return <FileText className="h-3.5 w-3.5 text-cyan-700 flex-none" />;
  }
  if (l.includes("council") || l.includes("statutory") || l.includes("approval")) {
    return <Building2 className="h-3.5 w-3.5 text-cyan-700 flex-none" />;
  }
  if (l.includes("geotechnical") || l.includes("allowance")) {
    return <Mountain className="h-3.5 w-3.5 text-cyan-700 flex-none" />;
  }
  if (l.includes("kitchen")) {
    return <Sparkles className="h-3.5 w-3.5 text-cyan-700 flex-none" />;
  }
  if (l.includes("bathroom") || l.includes("ensuite")) {
    return <Waves className="h-3.5 w-3.5 text-cyan-700 flex-none" />;
  }
  if (l.includes("floorplan") || l.includes("extension")) {
    return <Maximize2 className="h-3.5 w-3.5 text-cyan-700 flex-none" />;
  }
  if (l.includes("door") || l.includes("window") || l.includes("ceiling")) {
    return <Home className="h-3.5 w-3.5 text-cyan-700 flex-none" />;
  }
  return <PackageCheck className="h-3.5 w-3.5 text-cyan-700 flex-none" />;
}

import { plansForDesign } from "@/components/flyer/floorplans";
import { prepareFloorplan } from "@/components/flyer/floorplanEngine";
import { HUDSON_FACADES } from "@/components/flyer/facades.data";
import { PRE_RENDERED_FACADES } from "@/components/flyer/preRenderedFacades.data";
import { prepareFacade } from "@/components/flyer/facadeEngine";
import { getIdbEnhanced } from "@/components/flyer/idbFacadeCache";
import { getHighResFloorplanForDesign } from "@/lib/quoting/quoteFloorplanResolver";

interface QuotePdfDocumentProps {
  quote: FullQuote;
  coverVersion?: "v1" | "v2" | "v3";
}

function formatInclusionTierTitle(tier: string): string {
  if (!tier) return "H2 Design Inclusions (2025)";
  if (tier.includes("H1")) return "H1 Smart Inclusions (2025)";
  if (tier.includes("H2")) return "H2 Design Inclusions (2025)";
  if (tier.includes("H3")) return "H3 Luxury Inclusions (2025)";
  return tier;
}

function QuoteFacadeViewer({ design }: { design: FullQuote["design"] }) {
  const [src, setSrc] = React.useState<string>("");

  React.useEffect(() => {
    if (design.isCustomFacade && design.facadeImageUrl) {
      setSrc(design.facadeImageUrl);
      return;
    }

    const facadeName = design.facadeName || (design.designName ? "Classic" : "");
    if (!facadeName) {
      setSrc("");
      return;
    }

    const housingType = getHousingTypeForDesign(design.designName, design.housingType);
    const isDouble = isDoubleStoreyDesign(
      design.designName,
      housingType,
      design.customSpec?.storeys,
    );

    // Find matching facade using the comprehensive lookup engine
    const matched = findFacadeForDesign(facadeName, isDouble, housingType, design.designName || design.modelName);

    if (matched) {
      // 1. Check pre-rendered high-res static catalogue first
      if (PRE_RENDERED_FACADES[matched.id]) {
        setSrc(PRE_RENDERED_FACADES[matched.id]);
        return;
      }

      // Set base render immediately for PDF generation
      setSrc(matched.url);

      // 2. Check IndexedDB cache for AI-enhanced render in background
      getIdbEnhanced(matched.id)
        .then((cached) => {
          if (cached) {
            const clean = cached.replace("::AI_OUTPAINT_V7_FRESH::", "");
            if (clean.startsWith("data:image/")) {
              setSrc(clean);
              return;
            }
          }
          // 3. Fallback to prepareFacade
          prepareFacade(matched!.url, matched!.originalUrl, matched!.id, housingType)
            .then((res) => {
              if (res) setSrc(res);
            })
            .catch(() => {});
        })
        .catch(() => {});
    }
  }, [design.facadeName, design.housingType, design.mode, design.customSpec, design.isCustomFacade, design.facadeImageUrl, design.designName]);

  if (!src) return null;

  const housingType = getHousingTypeForDesign(design.designName, design.housingType);
  const isDouble = isDoubleStoreyDesign(
    design.designName,
    housingType,
    design.customSpec?.storeys,
  );
  const isDoubleOrSplit = Boolean(
    isDouble ||
    housingType === "Split Level" ||
    (src && (
      src.toLowerCase().includes("double") ||
      src.toLowerCase().includes("2-storey") ||
      src.toLowerCase().includes("-ds-") ||
      src.toLowerCase().includes("2stry") ||
      src.toLowerCase().includes("split") ||
      src.toLowerCase().includes("cobalt")
    ))
  );

  const isSg = Boolean(
    design.garage === 1 ||
    /terracotta 23|\(s\/g\)|single garage/i.test(design.designName || "") ||
    /single garage/i.test(design.facadeName || "") ||
    (src && /single-garage|single_garage|narrow-single-garage|classic-single-garage|-sg-/i.test(src))
  );
  const isSingleGarageDouble = isDoubleOrSplit && isSg;

  return (
    <div className="w-full relative rounded-xl overflow-hidden border border-slate-200 shadow-xs bg-slate-100 flex items-center justify-center h-[300px] max-h-[300px] mb-2 flex-none">
      <img
        src={src}
        alt={design.facadeName || "Architectural Facade Render"}
        loading="eager"
        crossOrigin="anonymous"
        className={`w-full h-full object-cover ${
          isSingleGarageDouble ? "object-[center_4%]" : isDoubleOrSplit ? "object-[center_55%]" : "object-center"
        }`}
        style={{
          imageRendering: "auto",
        }}
      />
      <div className="absolute top-2 left-2 bg-slate-900/85 backdrop-blur-md px-2.5 py-1 rounded-md text-[9px] font-bold text-white uppercase tracking-wider border border-white/20 shadow-sm flex items-center gap-1.5 z-20">
        <Sparkles className="h-3 w-3 text-amber-400" />
        <span>Selected Facade: {design.facadeName || "Classic"}</span>
      </div>
    </div>
  );
}

function QuoteCoverFacadeHero({ design }: { design: FullQuote["design"] }) {
  const [src, setSrc] = React.useState<string>("");

  React.useEffect(() => {
    if (design.isCustomFacade && design.facadeImageUrl) {
      setSrc(design.facadeImageUrl);
      return;
    }

    const facadeName = design.facadeName || (design.designName ? "Classic" : "Classic");
    const housingType = getHousingTypeForDesign(design.designName, design.housingType);
    const isDouble = isDoubleStoreyDesign(
      design.designName,
      housingType,
      design.customSpec?.storeys,
    );

    const matched = findFacadeForDesign(facadeName, isDouble, housingType, design.designName || design.modelName);

    if (matched) {
      if (PRE_RENDERED_FACADES[matched.id]) {
        setSrc(PRE_RENDERED_FACADES[matched.id]);
        return;
      }
      setSrc(matched.url);
      getIdbEnhanced(matched.id)
        .then((cached) => {
          if (cached) {
            const clean = cached.replace("::AI_OUTPAINT_V7_FRESH::", "");
            if (clean.startsWith("data:image/")) {
              setSrc(clean);
              return;
            }
          }
          prepareFacade(matched!.url, matched!.originalUrl, matched!.id, housingType)
            .then((res) => {
              if (res) setSrc(res);
              else setSrc("/facades/classic-facade-single-stry.jpg");
            })
            .catch(() => {
              setSrc(matched?.url || "/facades/classic-facade-single-stry.jpg");
            });
        })
        .catch(() => {
          setSrc(matched?.url || "/facades/classic-facade-single-stry.jpg");
        });
    } else {
      setSrc("/facades/classic-facade-single-stry.jpg");
    }
  }, [design.facadeName, design.housingType, design.mode, design.customSpec, design.isCustomFacade, design.facadeImageUrl, design.designName]);

  const displaySrc = src || "/facades/classic-facade-single-stry.jpg";

  const housingType = getHousingTypeForDesign(design.designName, design.housingType);
  const isDouble = isDoubleStoreyDesign(
    design.designName,
    housingType,
    design.customSpec?.storeys,
  );
  const isDoubleOrSplit = Boolean(
    isDouble ||
    housingType === "Split Level" ||
    (displaySrc && (
      displaySrc.toLowerCase().includes("double") ||
      displaySrc.toLowerCase().includes("2-storey") ||
      displaySrc.toLowerCase().includes("-ds-") ||
      displaySrc.toLowerCase().includes("2stry") ||
      displaySrc.toLowerCase().includes("split") ||
      displaySrc.toLowerCase().includes("cobalt")
    ))
  );

  const isSg = Boolean(
    design.garage === 1 ||
    /terracotta 23|\(s\/g\)|single garage/i.test(design.designName || "") ||
    /single garage/i.test(design.facadeName || "") ||
    (displaySrc && /single-garage|single_garage|narrow-single-garage|classic-single-garage|-sg-/i.test(displaySrc))
  );
  const isSingleGarageDouble = isDoubleOrSplit && isSg;

  return (
    <div className="relative w-full h-[250px] max-h-[250px] rounded-2xl overflow-hidden shadow-md border border-slate-200 bg-slate-100 flex items-center justify-center my-3 group">
      <img
        src={displaySrc}
        alt={design.facadeName || "Architectural Facade Render"}
        loading="eager"
        crossOrigin="anonymous"
        className={`w-full h-full object-cover ${
          isSingleGarageDouble ? "object-[center_4%]" : isDoubleOrSplit ? "object-[center_42%]" : "object-center"
        }`}
        style={{
          imageRendering: "auto",
        }}
      />
      {/* Brand facet accent ribbon at top of imagery with Hudson Logo colors */}
      <div className="absolute top-0 inset-x-0 h-1.5 flex z-20">
        <div className="flex-1 bg-amber-500" />
        <div className="flex-1 bg-cyan-500" />
        <div className="flex-1 bg-rose-500" />
        <div className="flex-1 bg-emerald-500" />
        <div className="flex-1 bg-blue-600" />
      </div>

      {/* Floating elevation concept pill */}
      <div className="absolute bottom-3 left-4 bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/20 shadow-md flex items-center gap-2 z-20">
        <Sparkles className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-white">
          {design.designName ? `${design.designName} · ${design.facadeName || "Classic"} Facade` : "Hudson Master Collection · Architectural Facade"}
        </span>
      </div>
    </div>
  );
}

function QuoteFloorplanViewer({ design }: { design: FullQuote["design"] }) {
  const [src, setSrc] = React.useState(design.floorplanUrl || "");

  React.useEffect(() => {
    let isMounted = true;
    if (design.floorplanUrl && design.floorplanUrl.startsWith("data:")) {
      setSrc(design.floorplanUrl);
      return;
    }
    getHighResFloorplanForDesign(design.designName, design.floorplanUrl)
      .then((enhanced) => {
        if (isMounted && enhanced) setSrc(enhanced);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [design.designName, design.floorplanUrl]);

  if (!src) {
    return (
      <div className="text-center text-slate-400 text-xs py-20">
        <Home className="h-8 w-8 mx-auto mb-2 text-slate-300" />
        Architectural Floorplan Drawing — Standard Hudson Design Layout
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-1 bg-white">
      <img
        src={src}
        alt="Selected Floorplan Drawing"
        className="max-h-full max-w-full w-full h-full object-contain block mx-auto my-auto drop-shadow-sm transition-all"
        style={{ imageRendering: "-webkit-optimize-contrast" }}
      />
    </div>
  );
}

function QuoteSecondFacadeViewer({ secondDwelling }: { secondDwelling?: SecondDwellingSelection }) {
  const [src, setSrc] = React.useState<string | null>(secondDwelling?.facadeImageUrl || null);

  React.useEffect(() => {
    if (!secondDwelling) return;
    if (secondDwelling.facadeImageUrl) {
      setSrc(secondDwelling.facadeImageUrl);
      return;
    }

    const facadeName = secondDwelling.facadeName || "Classic";
    const housingType = secondDwelling.housingType || "Single Storey";
    const isDouble = isDoubleStoreyDesign(secondDwelling.designName, housingType);
    const normName = facadeName.toLowerCase().replace(/[\s\-_]/g, "");

    const matches = HUDSON_FACADES.filter((f) => {
      const fNorm = f.name.toLowerCase().replace(/[\s\-_]/g, "");
      const fIdNorm = f.id.toLowerCase().replace(/[\s\-_]/g, "");
      return fNorm === normName || fIdNorm === normName;
    });

    let matched = isDouble
      ? matches.find((f) => f.range.toLowerCase().includes("double")) || matches[0]
      : matches.find((f) => !f.range.toLowerCase().includes("double")) || matches[0];

    if (!matched) {
      matched = HUDSON_FACADES.find((f) => f.name.toLowerCase().includes(normName)) || HUDSON_FACADES[0];
    }

    if (matched) {
      if (PRE_RENDERED_FACADES[matched.id]) {
        setSrc(PRE_RENDERED_FACADES[matched.id]);
        return;
      }
      setSrc(matched.url);

      getIdbEnhanced(matched.id)
        .then((cached) => {
          if (cached) {
            const clean = cached.replace("::AI_OUTPAINT_V7_FRESH::", "");
            if (clean.startsWith("data:image/")) {
              setSrc(clean);
              return;
            }
          }
          prepareFacade(matched.url, matched.originalUrl, matched.id, housingType)
            .then((res) => {
              if (res) setSrc(res);
            })
            .catch(() => {
              setSrc(matched.url);
            });
        })
        .catch(() => {
          setSrc(matched.url);
        });
    }
  }, [secondDwelling?.facadeName, secondDwelling?.housingType, secondDwelling?.facadeImageUrl]);

  if (!src) return null;

  const housingType = secondDwelling?.housingType || "Granny Flat";
  const isDouble = isDoubleStoreyDesign(
    secondDwelling?.designName || "",
    housingType,
    secondDwelling?.customSpec?.storeys,
  );
  const isDoubleOrSplit = Boolean(
    isDouble ||
    housingType === "Split Level" ||
    (src && (
      src.toLowerCase().includes("double") ||
      src.toLowerCase().includes("2-storey") ||
      src.toLowerCase().includes("-ds-") ||
      src.toLowerCase().includes("2stry") ||
      src.toLowerCase().includes("split") ||
      src.toLowerCase().includes("cobalt")
    ))
  );

  const isSg = Boolean(
    secondDwelling?.garage === 1 ||
    (src && /single-garage|single_garage|narrow-single-garage|classic-single-garage|-sg-/i.test(src))
  );
  const isSingleGarageDouble = isDoubleOrSplit && isSg;

  return (
    <div className="w-full relative rounded-xl overflow-hidden border border-slate-200 shadow-xs bg-slate-100 flex items-center justify-center h-[195px] max-h-[195px] mb-2 flex-none">
      <img
        src={src}
        alt={secondDwelling?.facadeName || "Secondary Residence Architectural Facade"}
        loading="eager"
        crossOrigin="anonymous"
        className={`w-full h-full object-cover ${
          isSingleGarageDouble ? "object-[center_4%]" : isDoubleOrSplit ? "object-[center_42%]" : "object-center"
        }`}
        style={{
          imageRendering: "auto",
        }}
      />
      <div className="absolute top-2 left-2 bg-slate-900/85 backdrop-blur-md px-2.5 py-1 rounded-md text-[9px] font-bold text-white uppercase tracking-wider border border-white/20 shadow-sm flex items-center gap-1.5 z-20">
        <Sparkles className="h-3 w-3 text-amber-400" />
        <span>Selected Facade: {secondDwelling?.facadeName || "Classic"}</span>
      </div>
    </div>
  );
}

function QuoteSecondFloorplanViewer({ secondDwelling }: { secondDwelling?: SecondDwellingSelection }) {
  const [src, setSrc] = React.useState(secondDwelling?.floorplanUrl || "");

  React.useEffect(() => {
    let isMounted = true;
    if (secondDwelling?.floorplanUrl && secondDwelling.floorplanUrl.startsWith("data:")) {
      setSrc(secondDwelling.floorplanUrl);
      return;
    }
    if (secondDwelling?.designName || secondDwelling?.floorplanUrl) {
      getHighResFloorplanForDesign(secondDwelling.designName, secondDwelling.floorplanUrl)
        .then((enhanced) => {
          if (isMounted && enhanced) setSrc(enhanced);
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [secondDwelling?.designName, secondDwelling?.floorplanUrl]);

  if (!src) {
    return (
      <div className="text-center text-slate-400 text-xs py-20">
        <Building2 className="h-8 w-8 mx-auto mb-2 text-slate-300" />
        Secondary Dwelling Architectural Floorplan Layout
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-1 bg-white">
      <img
        src={src}
        alt="Secondary Dwelling Floorplan Drawing"
        className="max-h-[580px] max-w-[710px] w-full h-full object-contain block mx-auto my-auto drop-shadow-sm transition-all"
        style={{ imageRendering: "-webkit-optimize-contrast" }}
      />
    </div>
  );
}

/**
 * Authentic Low-Poly Geometric Faceted Crystal Canopy
 * Recreated from official Hudson Homes architectural collateral
 * Features intricate triangle tessellation across authentic brand spectrum:
 * Magentas & violets on top-left, sky & cyan in mid-left, emerald & lime in center, and warm yellow/amber toward top-right.
 */
function HudsonLowPolyCanopy({ className = "" }: { className?: string }) {
  const triangles = [
    // Top-Left Deep Magenta / Violet Cluster
    { pts: "0,0 60,0 35,45", fill: "#7e22ce" },
    { pts: "0,0 35,45 0,70", fill: "#6b21a8" },
    { pts: "0,70 35,45 25,100", fill: "#581c87" },
    { pts: "0,70 25,100 0,140", fill: "#4c1d95" },
    { pts: "0,140 25,100 15,180", fill: "#3b0764" },
    { pts: "0,140 15,180 0,220", fill: "#581c87", op: 0.85 },
    { pts: "0,220 15,180 0,260", fill: "#6b21a8", op: 0.6 },
    { pts: "60,0 120,0 85,35", fill: "#9333ea" },
    { pts: "60,0 85,35 35,45", fill: "#a855f7" },
    { pts: "35,45 85,35 70,80", fill: "#c026d3" },
    { pts: "35,45 70,80 25,100", fill: "#a21caf" },
    { pts: "25,100 70,80 65,130", fill: "#86198f" },
    { pts: "25,100 65,130 15,180", fill: "#701a75" },
    { pts: "15,180 65,130 50,210", fill: "#86198f", op: 0.7 },
    { pts: "15,180 50,210 0,260", fill: "#a21caf", op: 0.5 },

    // Rose / Crimson / Violet transition
    { pts: "120,0 180,0 145,40", fill: "#db2777" },
    { pts: "120,0 145,40 85,35", fill: "#c026d3" },
    { pts: "85,35 145,40 130,85", fill: "#e11d48" },
    { pts: "85,35 130,85 70,80", fill: "#d946ef" },
    { pts: "70,80 130,85 115,135", fill: "#ec4899" },
    { pts: "70,80 115,135 65,130", fill: "#be185d" },
    { pts: "65,130 115,135 95,190", fill: "#9d174d", op: 0.8 },
    { pts: "65,130 95,190 50,210", fill: "#be185d", op: 0.7 },
    { pts: "50,210 95,190 75,250", fill: "#e11d48", op: 0.5 },

    // Blue / Cyan / Indigo cluster (center-left)
    { pts: "180,0 240,0 210,40", fill: "#2563eb" },
    { pts: "180,0 210,40 145,40", fill: "#3b82f6" },
    { pts: "145,40 210,40 190,90", fill: "#1d4ed8" },
    { pts: "145,40 190,90 130,85", fill: "#4f46e5" },
    { pts: "130,85 190,90 170,140", fill: "#1e40af" },
    { pts: "130,85 170,140 115,135", fill: "#4338ca" },
    { pts: "115,135 170,140 150,195", fill: "#3730a3", op: 0.85 },
    { pts: "115,135 150,195 95,190", fill: "#312e81", op: 0.75 },
    { pts: "95,190 150,195 130,250", fill: "#1e3a8a", op: 0.55 },
    { pts: "95,190 130,250 75,250", fill: "#1d4ed8", op: 0.4 },

    // Brilliant Sky & Cyan cluster
    { pts: "240,0 300,0 270,35", fill: "#0284c7" },
    { pts: "240,0 270,35 210,40", fill: "#0ea5e9" },
    { pts: "210,40 270,35 250,85", fill: "#0369a1" },
    { pts: "210,40 250,85 190,90", fill: "#0284c7" },
    { pts: "190,90 250,85 230,135", fill: "#0891b2" },
    { pts: "190,90 230,135 170,140", fill: "#0e7490" },
    { pts: "170,140 230,135 210,190", fill: "#06b6d4", op: 0.85 },
    { pts: "170,140 210,190 150,195", fill: "#0891b2", op: 0.75 },
    { pts: "150,195 210,190 185,250", fill: "#0e7490", op: 0.55 },
    { pts: "150,195 185,250 130,250", fill: "#0284c7", op: 0.4 },

    // Turquoise & Emerald cluster (mid-top)
    { pts: "300,0 365,0 335,35", fill: "#0d9488" },
    { pts: "300,0 335,35 270,35", fill: "#14b8a6" },
    { pts: "270,35 335,35 315,80", fill: "#0f766e" },
    { pts: "270,35 315,80 250,85", fill: "#06b6d4" },
    { pts: "250,85 315,80 295,130", fill: "#14b8a6" },
    { pts: "250,85 295,130 230,135", fill: "#2dd4bf" },
    { pts: "230,135 295,130 275,185", fill: "#0d9488", op: 0.8 },
    { pts: "230,135 275,185 210,190", fill: "#0f766e", op: 0.7 },
    { pts: "210,190 275,185 245,240", fill: "#14b8a6", op: 0.5 },
    { pts: "210,190 245,240 185,250", fill: "#2dd4bf", op: 0.35 },

    // Fresh Green / Lime cluster
    { pts: "365,0 435,0 400,35", fill: "#059669" },
    { pts: "365,0 400,35 335,35", fill: "#10b981" },
    { pts: "335,35 400,35 380,80", fill: "#047857" },
    { pts: "335,35 380,80 315,80", fill: "#10b981" },
    { pts: "315,80 400,35 380,80", fill: "#34d399" },
    { pts: "315,80 380,80 355,130", fill: "#059669", op: 0.85 },
    { pts: "315,80 355,130 295,130", fill: "#10b981", op: 0.75 },
    { pts: "295,130 355,130 330,180", fill: "#34d399", op: 0.6 },
    { pts: "295,130 330,180 275,185", fill: "#059669", op: 0.5 },
    { pts: "275,185 330,180 300,230", fill: "#10b981", op: 0.35 },

    // Lime & Lemon Green
    { pts: "435,0 510,0 475,35", fill: "#16a34a" },
    { pts: "435,0 475,35 400,35", fill: "#22c55e" },
    { pts: "400,35 475,35 445,80", fill: "#65a30d" },
    { pts: "400,35 445,80 380,80", fill: "#84cc16" },
    { pts: "380,80 445,80 415,125", fill: "#4ade80", op: 0.85 },
    { pts: "380,80 415,125 355,130", fill: "#22c55e", op: 0.75 },
    { pts: "355,130 415,125 385,175", fill: "#84cc16", op: 0.55 },
    { pts: "355,130 385,175 330,180", fill: "#65a30d", op: 0.4 },

    // Yellow / Amber / Gold cluster (upper right)
    { pts: "510,0 590,0 550,35", fill: "#ca8a04" },
    { pts: "510,0 550,35 475,35", fill: "#eab308" },
    { pts: "475,35 550,35 515,75", fill: "#facc15" },
    { pts: "475,35 515,75 445,80", fill: "#fde047" },
    { pts: "445,80 515,75 480,120", fill: "#eab308", op: 0.8 },
    { pts: "445,80 480,120 415,125", fill: "#facc15", op: 0.7 },
    { pts: "415,125 480,120 445,165", fill: "#f59e0b", op: 0.5 },

    // Far Right Sunburst & Warm Amber
    { pts: "590,0 680,0 635,35", fill: "#d97706" },
    { pts: "590,0 635,35 550,35", fill: "#f59e0b" },
    { pts: "550,35 680,0 635,35", fill: "#fbbf24" },
    { pts: "550,35 635,35 595,75", fill: "#fb923c" },
    { pts: "550,35 595,75 515,75", fill: "#f59e0b", op: 0.85 },
    { pts: "515,75 595,75 555,115", fill: "#fbbf24", op: 0.7 },
    { pts: "515,75 555,115 480,120", fill: "#d97706", op: 0.5 },

    // Fading edge triangles into top-right
    { pts: "680,0 794,0 735,35", fill: "#ea580c" },
    { pts: "680,0 735,35 635,35", fill: "#f97316" },
    { pts: "635,35 735,35 685,75", fill: "#fb923c", op: 0.8 },
    { pts: "635,35 685,75 595,75", fill: "#f59e0b", op: 0.7 },
    { pts: "735,35 794,0 794,50", fill: "#fb923c", op: 0.85 },
    { pts: "735,35 794,50 745,80", fill: "#f59e0b", op: 0.65 },
  ];

  return (
    <svg
      viewBox="0 0 794 320"
      className={`w-full h-full ${className}`}
      preserveAspectRatio="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {triangles.map((t, i) => (
        <polygon
          key={i}
          points={t.pts}
          fill={t.fill}
          opacity={t.op ?? 0.95}
          stroke="#ffffff"
          strokeWidth="0.6"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

interface SpecItem {
  id: string;
  name: string;
  description?: string;
  qtyLabel: string;
  amount: number;
}

interface SpecGroup {
  label: string;
  total: number;
  items: SpecItem[];
}

function getSpecItemEstimatedHeight(item: SpecItem): number {
  const desc = (item.description || "").trim();
  const nameLen = (item.name || "").length;
  // Extra allowance if title is long and wraps onto 2 lines (> 55 chars)
  const nameExtra = nameLen > 55 ? 12 : 0;

  if (!desc) {
    return 28 + nameExtra;
  }
  const descLen = desc.length;
  if (descLen <= 60) return 40 + nameExtra;
  if (descLen <= 120) return 54 + nameExtra;
  if (descLen <= 180) return 68 + nameExtra;
  return 82 + nameExtra;
}

const SPEC_GROUP_HEADER_HEIGHT = 44;
// Page 1 budget: calibrated for comfortable packing without spilling into excess blank pages
const SPEC_PAGE_1_MAX_HEIGHT = 820;
// Continuation page budget
const SPEC_PAGE_CONT_MAX_HEIGHT = 860;

function paginateSpecGroups(groups: SpecGroup[]): SpecGroup[][] {
  const pages: SpecGroup[][] = [];
  let currentPage: SpecGroup[] = [];
  let currentHeight = 0;
  let isFirstPage = true;

  for (const group of groups) {
    if (!group.items || group.items.length === 0) continue;

    let remainingItems = [...group.items];
    let isContinued = false;

    while (remainingItems.length > 0) {
      const maxPageHeight = isFirstPage ? SPEC_PAGE_1_MAX_HEIGHT : SPEC_PAGE_CONT_MAX_HEIGHT;
      const spaceLeft = maxPageHeight - currentHeight;

      const headerCost = SPEC_GROUP_HEADER_HEIGHT;
      const firstItemHeight = getSpecItemEstimatedHeight(remainingItems[0]);

      if (spaceLeft >= headerCost + firstItemHeight || currentPage.length === 0) {
        let chunkHeight = headerCost;
        let takeCount = 0;

        for (let i = 0; i < remainingItems.length; i++) {
          const itemH = getSpecItemEstimatedHeight(remainingItems[i]);
          if (takeCount === 0 || currentHeight + chunkHeight + itemH <= maxPageHeight) {
            chunkHeight += itemH;
            takeCount++;
          } else {
            break;
          }
        }

        const chunk = remainingItems.slice(0, takeCount);
        remainingItems = remainingItems.slice(takeCount);

        currentPage.push({
          label: isContinued ? `${group.label} (Continued)` : group.label,
          total: chunk.reduce((s, it) => s + it.amount, 0) || (!isContinued ? group.total : 0),
          items: chunk,
        });

        currentHeight += chunkHeight;
        isContinued = true;

        if (remainingItems.length > 0) {
          pages.push(currentPage);
          currentPage = [];
          currentHeight = 0;
          isFirstPage = false;
        }
      } else {
        pages.push(currentPage);
        currentPage = [];
        currentHeight = 0;
        isFirstPage = false;
      }
    }
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages.length > 0 ? pages : [[]];
}

export function QuotePdfDocument({ quote, coverVersion = "v1" }: QuotePdfDocumentProps) {
  const { client, design, siteConditions, lineItems, pricing } = quote;
  const activeCoverVersion = "v1";

  const validUntilDate = new Date(quote.createdAt);
  validUntilDate.setDate(validUntilDate.getDate() + (client.quoteValidityDays || 14));

  const formattedCreatedDate = new Date(quote.createdAt).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });

  const formattedValidDate = validUntilDate.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });

  const totalAreaM2 = getEffectiveDesignM2(design);
  const effectiveDesignName = getEffectiveDesignName(design);

  const company = getHudsonCompanyInfo({
    state: client.state,
    postcode: client.postcode,
    suburb: client.suburb,
    siteAddress: client.siteAddress,
    council: siteConditions.councilRegion,
    consultantOffice: client.consultantOffice,
  });
  const isNswQuote = company.isNsw;
  const quoteState: "NSW" | "QLD" =
    client.state === "NSW" || client.state === "QLD"
      ? client.state
      : isNswQuote
        ? "NSW"
        : "QLD";
  const quoteStateFull = quoteState === "NSW" ? "New South Wales" : "Queensland";
  const cleanSuburb = (client.suburb || "").trim().replace(/\s+(?:QLD|NSW)$/i, "");

  const siteAddressFull =
    [
      client.lotNumber,
      client.siteAddress,
      cleanSuburb,
      client.postcode ? `${quoteState} ${client.postcode}` : quoteState,
    ]
      .filter(Boolean)
      .join(", ") || `Proposed Site Address TBA, ${quoteStateFull}`;

  const clientCombinedNames = [client.clientName, client.hasClient2 && client.client2Name]
    .filter(Boolean)
    .join(" & ");

  const hasVariations = pricing.categorySubtotals && pricing.categorySubtotals.length > 0;

  // Site items for Advanced Estimate Specification schedule
  const gfaM2 = pricing.gfaM2 || 192;
  // Dedicated Site & Soil items
  const concrete32Cost = siteConditions.concrete32MpaRequired
    ? (Number(siteConditions.concrete32MpaCost) > 0 ? Number(siteConditions.concrete32MpaCost) : Math.round(gfaM2 * 14))
    : 0;
  const flexibleConnectionsCost = siteConditions.flexibleConnectionsRequired ? (siteConditions.flexibleConnectionsCost ?? 1800) : 0;

  // Site Overlay Reports (LHS)
  const bushfireReportCost = siteConditions.bushfireReportRequired ? (siteConditions.bushfireReportCost ?? 850) : 0;
  const floodReportCost = siteConditions.floodReportRequired ? (siteConditions.floodReportCost ?? 7600) : 0;
  const hydraulicReportCost = siteConditions.hydraulicReportRequired ? (siteConditions.hydraulicReportCost ?? 2600) : 0;
  const landslideReportCost = siteConditions.landslideReportRequired ? (siteConditions.landslideReportCost ?? 7000) : 0;
  const acousticReportCost = siteConditions.acousticReportRequired ? (siteConditions.acousticReportCost ?? 1200) : 0;
  const arboristReportCost = siteConditions.arboristReportRequired ? (siteConditions.arboristReportCost ?? 1100) : 0;
  const cctvSewerReportCost = siteConditions.cctvSewerReportRequired ? (siteConditions.cctvSewerReportCost ?? 3300) : 0;

  // Site Overlay Allowances (RHS)
  const slabHeight = siteConditions.slabElevationMeters ?? 0.3;
  const calculatedSlabCost = Math.round(slabHeight * 270 * gfaM2);
  const floodCost = siteConditions.floodOverlayRequired
    ? (siteConditions.floodOverlayCost !== undefined && siteConditions.floodOverlayCost !== null && siteConditions.floodOverlayCost > 0
        ? siteConditions.floodOverlayCost
        : calculatedSlabCost)
    : 0;

  // Council & Statutory
  const councilDaCost = siteConditions.councilDaRequired ? (siteConditions.councilDaCost ?? 8000) : 0;
  const trafficCost = siteConditions.trafficControlRequired ? (siteConditions.trafficControlCost ?? 10000) : 0;
  const dualLivingCost = siteConditions.dualLivingInfrastructureRequired ? (siteConditions.dualLivingInfrastructureCost ?? 23000) : 0;
  const sedimentCost = Number(siteConditions.sedimentAssetProtectionCost) || 0;

  // Geotechnical Allowances ($90 / m2 default, user editable)
  const screwPieringCost = siteConditions.screwPieringRequired
    ? (siteConditions.screwPieringCost !== undefined && !isNaN(Number(siteConditions.screwPieringCost))
        ? Number(siteConditions.screwPieringCost)
        : Math.round(gfaM2 * 90))
    : 0;
  const rockCost = Number(siteConditions.rockExcavationAllowance) || 0;
  const retainingCost = Number(siteConditions.retainingWallAllowance) || 0;

  const totalSiteAndStatutorySubtotal = pricing.siteCostsSubtotal + pricing.councilStatutorySubtotal;

  const isSplit = design.housingType === "Split Level" || (design.customSpec && design.customSpec.storeys === "split");
  const soilRate = getSoilRatePerM2(siteConditions.soilClass);
  const calculatedSoilCost =
    typeof siteConditions.soilTotalCost === "number" && !isNaN(siteConditions.soilTotalCost)
      ? siteConditions.soilTotalCost
      : Math.round(soilRate * gfaM2) || 0;

  const calculatedFallCost =
    typeof siteConditions.fallTotalCost === "number" && !isNaN(siteConditions.fallTotalCost)
      ? siteConditions.fallTotalCost
      : calculateTopographyFallCost(Number(siteConditions.fallMeters) || 0, gfaM2, isSplit) || 0;

  // Active Site Categories formatted in the exact same table format as Page 5 (only active items)
  const earthworksItems = [
    {
      id: "soil_class",
      name: `Engineered Slab Footing & Foundation (Soil ${siteConditions.soilClass || "Class M"})`,
      description: `Engineered slab footing depth & steel mesh reinforcement (${gfaM2} m² GFA footprint).`,
      qtyLabel: `${gfaM2} m² footprint`,
      amount: calculatedSoilCost,
    },
    ...(siteConditions.concrete32MpaRequired
      ? [
          {
            id: "concrete_32mpa",
            name: "32 MPa Concrete Slab Upgrade",
            description: "High-strength concrete mix for marine, coastal saline proximity, or acid sulfate ground.",
            qtyLabel: `${gfaM2} m²`,
            amount: concrete32Cost,
          },
        ]
      : []),
    ...(siteConditions.flexibleConnectionsRequired
      ? [
          {
            id: "flexible_connections",
            name: "Flexible Service Connections (Plumbing & Drainage)",
            description: "Heavy-duty flexible articulation joints for plumbing and drainage in reactive clay soil.",
            qtyLabel: "1 House",
            amount: flexibleConnectionsCost,
          },
        ]
      : []),
    ...(Number(siteConditions.fallMeters) > 0 || calculatedFallCost > 0
      ? [
          {
            id: "fall_topography",
            name: `Topography Fall Allowance (${siteConditions.fallMeters || 0}m Fall)`,
            description: `Standard cut & fill included up to 1.0m fall across building pad, with excess topography engineered fall surcharge.`,
            qtyLabel: `${siteConditions.fallMeters || 0}m envelope`,
            amount: calculatedFallCost,
          },
        ]
      : []),
    {
      id: "geotech_survey",
      name: "Geotechnical Soil Borehole Test & Registered Contour Survey",
      description: "Comprehensive geotechnical borehole soil classification and precision laser contour survey.",
      qtyLabel: "1 Site",
      amount: 0,
    },
  ];

  const overlayReportsAndAllowances = [
    ...(siteConditions.bushfireReportRequired
      ? [
          {
            id: "bushfire_report",
            name: "Bushfire Hazard Assessment Report",
            description: "Site BAL assessment report, property vegetation categorization & fire management certificate.",
            qtyLabel: "1 Report",
            amount: bushfireReportCost,
          },
        ]
      : []),
    ...(siteConditions.bushfireCost > 0
      ? [
          {
            id: "bushfire_bal",
            name: `Bushfire Attack Level Protection (${siteConditions.bushfireBal})`,
            description: `AS 3959 ${siteConditions.bushfireBal} specification tailored to ${design.designName} (${design.designM2}m²), including aluminium ember screens to openable windows, perimeter door seals, heavy roof sarking, and compliance certification.`,
            qtyLabel: "1 House",
            amount: siteConditions.bushfireCost,
          },
        ]
      : []),
    ...(siteConditions.floodReportRequired
      ? [
          {
            id: "flood_report",
            name: "Flood Overlay Code Assessment Report",
            description: "Hydraulic engineering overland flow modeling, DFL certification & flood code statement.",
            qtyLabel: "1 Report",
            amount: floodReportCost,
          },
        ]
      : []),
    ...(siteConditions.floodOverlayRequired
      ? [
          {
            id: "flood_overlay",
            name: `Slab Elevation & Flood Pad Works (${slabHeight}m Elevation)`,
            description: `Engineered building pad elevation for minimum floor level compliance ($270 × ${slabHeight}m × ${gfaM2} m² GFA).`,
            qtyLabel: `${slabHeight}m elevation`,
            amount: floodCost,
          },
        ]
      : []),
    ...(siteConditions.hydraulicReportRequired
      ? [
          {
            id: "hydraulic_report",
            name: "Hydraulic Engineering Assessment Report",
            description: "Stormwater catchment modeling, civil detention sizing, and engineering discharge designs.",
            qtyLabel: "1 Report",
            amount: hydraulicReportCost,
          },
        ]
      : []),
    ...(siteConditions.landslideReportRequired
      ? [
          {
            id: "landslide_report",
            name: "Landslide Hazard Overlay Assessment Report",
            description: "Slope stability analysis, geotechnical risk categorization, and foundation retention statement.",
            qtyLabel: "1 Report",
            amount: landslideReportCost,
          },
        ]
      : []),
    ...(siteConditions.acousticReportRequired
      ? [
          {
            id: "acoustic_report",
            name: "Acoustic Noise Corridor Assessment Report",
            description: "QDC MP 4.4 transport noise corridor testing, decibel analysis & engineering glazing schedule.",
            qtyLabel: "1 Report",
            amount: acousticReportCost,
          },
        ]
      : []),
    ...(siteConditions.acousticCost > 0 &&
    siteConditions.acousticTier &&
    siteConditions.acousticTier !== "None" &&
    (siteConditions.acousticTier as string) !== "Tier 1"
      ? [
          {
            id: "acoustic_tier",
            name: `Acoustic Attenuation Package (${siteConditions.acousticTier})`,
            description: "QDC MP 4.4 acoustic laminated glazing and high-density perimeter wall insulation.",
            qtyLabel: "1 House",
            amount: siteConditions.acousticCost,
          },
        ]
      : []),
    ...(siteConditions.arboristReportRequired
      ? [
          {
            id: "arborist_report",
            name: "Arborist Tree Assessment Report",
            description: "Tree protection zone (TPZ) inspection, root mapping, and vegetation management plan.",
            qtyLabel: "1 Report",
            amount: arboristReportCost,
          },
        ]
      : []),
    ...(siteConditions.cctvSewerReportRequired
      ? [
          {
            id: "cctv_sewer_report",
            name: "CCTV Sewer Pipe Camera Inspection & Report",
            description: "Robotic CCTV drainage camera log, connection point depth verification & council asset check.",
            qtyLabel: "1 Inspection",
            amount: cctvSewerReportCost,
          },
        ]
      : []),
  ];

  const councilStatutoryItems = [
    {
      id: "council_statutory",
      name: `Council Statutory Plumbing & Lodgement Fees (${siteConditions.councilRegion || "Council"})`,
      description: `${siteConditions.councilRegion || "Council"} statutory plumbing, sewer connection & archiving fees.`,
      qtyLabel: "1 Lodgement",
      amount: Number(siteConditions.councilFee ?? (siteConditions as any).councilLodgementFee ?? 2227.1),
    },
    ...(siteConditions.councilDaRequired
      ? [
          {
            id: "council_da",
            name: "Council Development Application (DA)",
            description: "Town planning statement of reasons, overlay code triggers, and formal council lodgement.",
            qtyLabel: "1 Lodgement",
            amount: councilDaCost,
          },
        ]
      : []),
    ...(siteConditions.councilSetbackRelaxationRequired
      ? [
          {
            id: "council_setback",
            name: "Council Setback Relaxation Application",
            description: "Town planning setback variation application and relaxation lodgement.",
            qtyLabel: "1 Application",
            amount: Number(siteConditions.councilSetbackRelaxationCost ?? 2000),
          },
        ]
      : []),
    ...(siteConditions.trafficControlRequired
      ? [
          {
            id: "traffic_control",
            name: "Traffic Management Plan & Safety Control",
            description: "Certified Traffic Guidance Scheme (TGS) and pedestrian safety barriers during deliveries.",
            qtyLabel: "1 Setup",
            amount: trafficCost,
          },
        ]
      : []),
    ...(siteConditions.dualLivingInfrastructureRequired
      ? [
          {
            id: "dual_living_infra",
            name: "Dual Living Infrastructure Charge",
            description: "Council headworks, water & sewer network infrastructure contribution for dual living build.",
            qtyLabel: "1 Dwelling",
            amount: dualLivingCost,
          },
        ]
      : []),
    ...(sedimentCost > 0
      ? [
          {
            id: "sediment_asset",
            name: "Sediment & Council Asset Protection",
            description: "Silt fencing, stabilized crushed rock construction entry & council kerb protection.",
            qtyLabel: "1 Site",
            amount: sedimentCost,
          },
        ]
      : []),
  ];

  const geotechnicalSiteItems = [
    ...(siteConditions.demolitionAsbestosRequired
      ? [
          {
            id: "demolition_asbestos",
            name: "House Demolition & Asbestos Removal Allowance",
            description: "Complete existing home demolition, licensed asbestos removal & site clearing. (Note: Demolition to be organised by owner).",
            qtyLabel: "1 Allowance",
            amount: Number(siteConditions.demolitionAsbestosCost ?? (isDoubleStorey ? 40000 : 30000)),
          },
        ]
      : []),
    ...(siteConditions.screwPieringRequired
      ? [
          {
            id: "screw_piering",
            name: "Allowance for Screw Piering (KDRB / Fill Site)",
            description: `Helical screw piering driven to solid strata due to KDRB site or uncontrolled fill ($90 × ${pricing.gfaM2} m²).`,
            qtyLabel: `${pricing.gfaM2} m² GFA`,
            amount: screwPieringCost,
          },
        ]
      : []),
    ...(rockCost > 0
      ? [
          {
            id: "rock_excavation",
            name: "Rock Excavation Allowance",
            description: "Hydraulic rock breaker allowance for sub-surface trenching.",
            qtyLabel: "1 Allowance",
            amount: rockCost,
          },
        ]
      : []),
    ...(retainingCost > 0
      ? [
          {
            id: "retaining_wall",
            name: "Retaining Wall Allowance",
            description: "Concrete sleeper or masonry retaining wall structure allowance.",
            qtyLabel: "1 Allowance",
            amount: retainingCost,
          },
        ]
      : []),
    ...(Number(siteConditions.materialHandlingAllowance) > 0
      ? [
          {
            id: "material_handling",
            name: "Material Handling & Restricted Access Allowance",
            description: "Specialized material handling, crane truck offloading, spotters, or restricted access due to limited access, overhead powerlines, or narrow lot.",
            qtyLabel: "1 Allowance",
            amount: Number(siteConditions.materialHandlingAllowance),
          },
        ]
      : []),
  ];

  const combinedEarthworksAndGeotech = [...earthworksItems, ...geotechnicalSiteItems];

  const activeSiteSchedule = [
    {
      label: "1. Site Earthworks, Foundation & Geotechnical Allowances",
      total: combinedEarthworksAndGeotech.reduce((s, it) => s + (Number(it.amount) || 0), 0),
      items: combinedEarthworksAndGeotech,
    },
    ...(overlayReportsAndAllowances.length > 0
      ? [
          {
            label: "2. Site Overlay Reports & Allowances",
            total: overlayReportsAndAllowances.reduce((s, it) => s + (Number(it.amount) || 0), 0),
            items: overlayReportsAndAllowances,
          },
        ]
      : []),
    {
      label: "3. Council Approvals & Statutory Applications",
      total: councilStatutoryItems.reduce((s, it) => s + (Number(it.amount) || 0), 0),
      items: councilStatutoryItems,
    },
  ];

  const totalVariationsAmount = (pricing.categorySubtotals || []).reduce((s, c) => s + c.amount, 0);
  const turnkeyPackagesCost = (pricing.landscapingCost || 0) + (!design.landscapingSelected ? (pricing.exposedDrivewayCost || 0) : 0);
  const totalVariationsAndPackagesAmount = totalVariationsAmount + turnkeyPackagesCost;
  const totalSpecAndVariations = totalSiteAndStatutorySubtotal + totalVariationsAndPackagesAmount;

  const landscapingSpecGroup: SpecGroup | null = (pricing.landscapingCost > 0 || design.landscapingSelected) ? {
    label: `Turnkey Landscaping Package (${design.landscapingLandSize || 450} m² Lot)`,
    total: pricing.landscapingCost,
    items: [
      {
        id: "landscape_turf",
        name: "Premium Sir Walter / Couch Turf",
        description: "Supply and lay premium Sir Walter / Couch turf to front and rear yard, shaped to boundary fencing with finished soil levelling.",
        qtyLabel: "Front & Rear",
        amount: 0,
      },
      {
        id: "landscape_driveway",
        name: "Exposed Aggregate Concrete Driveway & Porch Path",
        description: "Exposed aggregate concrete paving from council kerb/crossover to double garage and front portico/porch path.",
        qtyLabel: `${design.exposedDrivewayM2 || 55} m²`,
        amount: 0,
      },
      {
        id: "landscape_fencing",
        name: "Treated Timber Perimeter Fencing & Return Gate",
        description: "1.8m high treated pine lap and cap / standard timber paling boundary fencing including single side pedestrian return gate.",
        qtyLabel: "Perimeter",
        amount: 0,
      },
      {
        id: "landscape_letterbox",
        name: "Designer Pillar Letterbox",
        description: "Freestanding masonry or architectural pillar letterbox with integrated street numbers and key lock.",
        qtyLabel: "1 Item",
        amount: 0,
      },
      {
        id: "landscape_clothesline",
        name: "Folding Clothesline",
        description: "Ground-mounted or external wall-mounted folding frame clothesline installed in functional service yard.",
        qtyLabel: "1 Item",
        amount: 0,
      },
      {
        id: "landscape_garden_beds",
        name: "Feature Garden Beds & Mulch",
        description: "Front garden bed preparation including organic planting soil, garden edging, hardwood mulch, and drought-tolerant shrubs.",
        qtyLabel: "Front Yard",
        amount: 0,
      },
    ],
  } : null;

  const standaloneDrivewayGroup: SpecGroup | null = ((pricing.exposedDrivewayCost > 0 || design.exposedDrivewaySelected) && !design.landscapingSelected) ? {
    label: `External Concrete Paving & Driveway`,
    total: pricing.exposedDrivewayCost,
    items: [
      {
        id: "driveway_paving",
        name: `Exposed Aggregate Concrete Driveway & Porch Path (${design.exposedDrivewayM2 || 55} m²)`,
        description: "Exposed aggregate concrete paving from council crossover to double garage and front entry porch.",
        qtyLabel: `${design.exposedDrivewayM2 || 55} m²`,
        amount: pricing.exposedDrivewayCost,
      },
    ],
  } : null;

  const variationGroups: SpecGroup[] = (pricing.categorySubtotals || []).map((cat) => ({
    label: cat.label,
    total: cat.amount,
    items: cat.items.map((it) => ({
      id: it.id,
      name: it.name,
      description: it.description,
      qtyLabel: it.unitRate === 0 ? "$0.00 Variation" : (it.quantity > 1 ? `${it.quantity} × ${formatAud(it.unitRate)}` : "1 Item"),
      amount: it.quantity * it.unitRate,
    })),
  }));

  const allSpecGroups: SpecGroup[] = [
    ...activeSiteSchedule,
    ...(landscapingSpecGroup ? [landscapingSpecGroup] : []),
    ...(standaloneDrivewayGroup ? [standaloneDrivewayGroup] : []),
    ...variationGroups,
  ];

  const hasSecondDwelling = !!(design.hasSecondDwelling && design.secondDwelling?.enabled);
  const secondDwelling = design.secondDwelling;

  const specPages = paginateSpecGroups(allSpecGroups);
  const totalPages = (hasSecondDwelling ? 4 : 3) + specPages.length + 2;

  const bankAccountName = company.bankName;
  const bankHeaderTitle = company.headerTitle;
  const bankBsb = company.bsb;
  const bankAccountNumber = company.accountNumber;
  const headOfficeAddress = company.headOfficeAddress;
  const footerLicenceLine = company.isNsw
    ? "Hudson Homes (NSW) Pty Ltd · ABN 49 163 189 071 · Licence 259372C"
    : "Hudson Homes (QLD) Pty Ltd · ABN 92 623 431 685 · QBCC Licence 15078318";

  return (
    <div
      className="quote-pdf-root light normal-mode text-slate-900 font-sans space-y-12 max-w-[210mm] mx-auto print:space-y-0"
      style={{ colorScheme: "light" }}
    >
      {/* ========================================================================= */}
      {/* PAGE 1: OFFICIAL BUILDERS ESTIMATE COVER PAGE                             */}
      {/* ========================================================================= */}
      <div className="quote-page bg-white w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] p-10 flex flex-col justify-between relative overflow-hidden shadow-2xl box-border print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always">
        {/* Crisp Vector Top Poly Header Banner */}
        <div className="absolute top-0 left-0 right-0 h-80 pointer-events-none overflow-hidden">
          <svg
            viewBox="0 0 794 320"
            className="w-full h-full"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="polyGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.95" />
                <stop offset="45%" stopColor="#06b6d4" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.95" />
              </linearGradient>
              <linearGradient id="polyGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ec4899" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="polyGrad3" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.6" />
              </linearGradient>
            </defs>
            <polygon points="0,0 794,0 794,220 480,290 0,160" fill="url(#polyGrad1)" />
            <polygon points="220,0 794,0 794,270 320,200" fill="url(#polyGrad2)" />
            <polygon points="0,0 450,0 300,180 0,140" fill="url(#polyGrad3)" />
          </svg>
        </div>

        {/* Top Header Row with Badges & Logo */}
        <div className="relative z-10 flex items-center justify-between pt-2">
          <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-white/60 flex items-center gap-3">
            <Logo size={11} modern={false} />
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-slate-900/90 text-white text-[11px] font-bold px-3.5 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-md border border-slate-700">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Builders Estimate #{quote.quoteNumber || "MH678"}</span>
            </div>
            <div className="bg-emerald-500 text-slate-950 text-[11px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-md">
              14-Day Price Hold
            </div>
          </div>
        </div>

        {/* Hero Title Section */}
        <div className="relative z-10 my-auto text-right pr-6 space-y-1">
          <div className="text-3xl font-extrabold uppercase tracking-widest text-slate-900">
            YOUR
          </div>
          <div className="text-4xl font-extrabold tracking-tight text-slate-900">
            NEW HOME
          </div>
          <div className="text-6xl font-serif italic text-cyan-700 tracking-tight leading-none pt-1">
            Builders Estimate
          </div>
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 pt-3">
            Comprehensive Architectural Tender &amp; Site Investment Breakdown
          </div>
        </div>

        {/* Bottom Presentation Metadata Box */}
        <div className="relative z-10 bg-slate-50/90 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="grid grid-cols-2 gap-6 pb-4 border-b border-slate-200">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-800 block">
                PRESENTED TO
              </span>
              <div className="text-base font-extrabold text-slate-900 mt-0.5">
                {clientCombinedNames || "Valued Client"}
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                {client.clientEmail || "client@email.com"}
                {client.clientPhone && ` · ${client.clientPhone}`}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-800 block">
                PROPOSED SITE ADDRESS
              </span>
              <div className="text-sm font-bold text-slate-900 mt-0.5">
                {client.siteAddress || "Site Address TBA"}
              </div>
              <div className="text-xs text-slate-600">
                {[client.lotNumber, cleanSuburb, quoteState, client.postcode].filter(Boolean).join(" ")}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-500 text-[10px] uppercase tracking-wider block">
                SELECTED DESIGN:
              </span>
              <span className="font-bold text-slate-900 text-sm">
                {effectiveDesignName}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase tracking-wider block">
                FACADE STYLE:
              </span>
              <span className="font-bold text-slate-900 text-sm">
                {design.facadeName || "Standard"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase tracking-wider block">
                INCLUSIONS TIER:
              </span>
              <span className="inline-block bg-emerald-100 text-emerald-900 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-300">
                {formatInclusionTierTitle(design.specTier)}
              </span>
            </div>
          </div>
        </div>

        {/* Cover Page Footer */}
        <div className="relative z-10 pt-4 flex items-center justify-between text-[10px] text-slate-500">
          <div>
            {footerLicenceLine}
          </div>
          <div className="font-mono">
            Estimate #{quote.quoteNumber || "MH678"} · Issued {formattedCreatedDate}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 2: EXECUTIVE ESTIMATE & CONSTRUCTION COST SUMMARY                     */}
      {/* ========================================================================= */}
      <div className="quote-page bg-white w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] p-10 flex flex-col justify-between relative overflow-hidden shadow-2xl box-border print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-6">
            <Logo size={10} modern={false} />
            <div className="text-right text-xs">
              <div className="font-extrabold text-slate-900 text-sm">Date: {formattedCreatedDate}</div>
              <div className="text-slate-600 font-mono font-semibold text-xs">Estimate No: {quote.quoteNumber || "MH678"}</div>
            </div>
          </div>

          {/* Owner & Job Meta Box */}
          <div className="mb-6">
            <div className="text-sm font-black uppercase tracking-wider text-cyan-900 mb-2.5">
              OWNER &amp; ESTIMATE DETAILS
            </div>
            <div className="border border-slate-200/90 rounded-2xl p-4 bg-slate-50/90 grid grid-cols-2 gap-5 text-xs shadow-xs">
              <div className="space-y-2">
                <div>
                  <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block">Owner/s Details:</span>
                  <span className="font-black text-slate-950 text-sm block mt-0.5">{clientCombinedNames || "Client Name"}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block">New Home Consultant:</span>
                  <span className="font-bold text-slate-950 text-sm block mt-0.5">{client.consultantName || "Morgan Hales"}</span>
                  <span className="text-slate-600 text-xs block font-medium mt-0.5">{client.consultantOffice} · {client.consultantPhone}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block">Proposed Site Address:</span>
                  <span className="font-bold text-slate-950 text-sm block mt-0.5">{siteAddressFull}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block">Estimate No / Version:</span>
                  <span className="font-black text-slate-950 font-mono text-sm block mt-0.5">{quote.quoteNumber || "MH678"} / Version {client.estimateVersion || 1}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block">Estimate Valid To:</span>
                  <span className="font-extrabold text-amber-800 font-mono text-sm block mt-0.5">{formattedValidDate} (14-day validity)</span>
                </div>
                {client.notes && (
                  <div>
                    <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider block">Consultant Notes:</span>
                    <span className="text-slate-800 text-xs italic block mt-0.5">{client.notes}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Itemized Construction Cost Table */}
          <div className="mb-6">
            <div className="text-sm font-black uppercase tracking-wider text-cyan-900 mb-2.5">
              ESTIMATED CONSTRUCTION COST SUMMARY
            </div>

            <table className="w-full text-xs border-collapse border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
              <thead className="bg-slate-100 text-slate-800 uppercase text-xs font-black tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-left">Description</th>
                  <th className="py-3 px-4 text-right w-40">Estimated Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {/* Base House / Architectural Floorplan - Strictly Standard Brochure Baseline */}
                {(() => {
                  const isMod = !!design.isModifiedFloorplan || design.mode === "modified";
                  const modCalc = isMod ? calculateModifiedFloorplanPricing(design) : null;
                  const stdBaselinePrice = Number(design.standardBasePrice) || (modCalc ? modCalc.standardBasePrice : Number(pricing.baseHousePrice)) || 0;

                  return (
                    <tr className="font-semibold bg-white">
                      <td className="py-3 px-4">
                        <div className="text-slate-950 font-black text-sm">
                          {design.mode === "standard" || isMod
                            ? `${effectiveDesignName} with ${formatInclusionTierTitle(design.specTier)}`
                            : `Custom Architectural Floorplan (${design.customSpec?.storeys === "double" ? "Two" : "Single"} Storey)`}
                        </div>
                        <div className="text-xs text-slate-600 font-medium mt-0.5">
                          {isMod && modCalc
                            ? `Standard brochure baseline ${modCalc.standardTotalM2.toFixed(2)} m² (${(modCalc.standardTotalM2 * 0.107639).toFixed(1)} sq) · Modified Total Area ${modCalc.modifiedTotalM2.toFixed(2)} m²`
                            : `Living area ${totalAreaM2} m² (${(totalAreaM2 * 0.107639).toFixed(1)} sq) · GFA Platform ${pricing.gfaM2} m²`}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-950 text-sm">
                        {formatAud(stdBaselinePrice)}
                      </td>
                    </tr>
                  );
                })()}

                {pricing.facadePrice > 0 && (
                  <tr className="bg-white">
                    <td className="py-2.5 px-4 text-slate-800">
                      <span className="font-bold text-slate-950 text-sm">Selected Facade:</span> <span className="text-sm font-semibold">{design.facadeName}</span>
                      {design.isCustomFacade && design.customFacadeDescription && (
                        <span className="block text-xs text-slate-500 italic mt-0.5">
                          {design.customFacadeDescription}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                      +{formatAud(pricing.facadePrice)}
                    </td>
                  </tr>
                )}

                {/* Builder Promotion on its own distinct emerald highlighted line */}
                {pricing.promotionsDiscount > 0 && (
                  <tr className="text-emerald-900 font-semibold bg-emerald-50/90 border-l-4 border-l-emerald-500">
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-emerald-950 text-sm">{pricing.promotionName || "Managers Discount"}</span>
                        <span className="text-[10px] font-black uppercase bg-emerald-200 text-emerald-950 px-2.5 py-0.5 rounded-full">
                          Special Savings
                        </span>
                      </div>
                      <span className="block text-xs text-emerald-800 font-medium mt-0.5">
                        Special manager discount allowance applied to contract
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-black text-emerald-800 text-sm">
                      -{formatAud(pricing.promotionsDiscount)}
                    </td>
                  </tr>
                )}

                {/* 2nd Dwelling / Auxiliary Unit if selected */}
                {design.hasSecondDwelling && design.secondDwelling?.enabled && (
                  <tr className="bg-cyan-50/80 border-l-4 border-l-cyan-600">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-cyan-950 text-sm">
                          2nd Dwelling / Auxiliary Home ({design.secondDwelling.designName})
                        </span>
                        <span className="text-[10px] font-black uppercase bg-cyan-200 text-cyan-950 px-2.5 py-0.5 rounded font-mono">
                          {design.secondDwelling.designM2} m²
                        </span>
                      </div>
                      <span className="block text-xs text-cyan-800 font-medium mt-0.5">
                        {design.secondDwelling.specTier} • {design.secondDwelling.facadeName} Facade • Architectural layout on Page 4
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-cyan-950 text-sm">
                      +{formatAud((Number(design.secondDwelling.basePrice) || 0) + (Number(design.secondDwelling.facadePrice) || 0))}
                    </td>
                  </tr>
                )}

                {/* Site Specific Earthworks & Statutory Inclusions Subtotal */}
                {totalSiteAndStatutorySubtotal > 0 && (
                  <tr className="bg-white">
                    <td className="py-2.5 px-4 text-slate-800">
                      <span className="font-bold text-slate-950 text-sm">Site Specific Earthworks, Engineering &amp; Statutory Requirements:</span>
                      <span className="block text-xs text-slate-600 mt-0.5">
                        Detailed in Advanced Estimate Specification schedule ({siteConditions.soilClass}, {siteConditions.fallMeters}m Fall, {siteConditions.councilRegion})
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-950 font-black text-sm">
                      +{formatAud(totalSiteAndStatutorySubtotal)}
                    </td>
                  </tr>
                )}

                {/* Variations & Turnkey Packages Subtotal if any */}
                {totalVariationsAndPackagesAmount > 0 && (
                  <tr className="bg-white">
                    <td className="py-2.5 px-4 text-slate-800">
                      <span className="font-bold text-slate-950 text-sm">Estimate Variations, Upgrades &amp; Turnkey Packages:</span>
                      <span className="block text-xs text-slate-600 mt-0.5">
                        Detailed in Advanced Estimate Specification schedule{pricing.landscapingCost > 0 ? " (includes Turnkey Landscaping Package)" : ""}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-950 font-black text-sm">
                      +{formatAud(totalVariationsAndPackagesAmount)}
                    </td>
                  </tr>
                )}

                {/* Total Cost Line */}
                <tr
                  className="border-t-2 border-slate-900 bg-slate-900 text-white font-extrabold text-sm"
                  style={{ backgroundColor: "#0f172a" }}
                >
                  <td
                    className="py-4 px-4 uppercase tracking-wider text-white font-black text-xs"
                    style={{ color: "#ffffff", backgroundColor: "#0f172a" }}
                  >
                    TOTAL ESTIMATED BUILDERS INVESTMENT (INC. GST)
                  </td>
                  <td
                    className="py-4 px-4 text-right font-mono text-lg font-black text-amber-400"
                    style={{ color: "#fbbf24", backgroundColor: "#0f172a" }}
                  >
                    {formatAud(pricing.grossEstimatedInvestment)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Letter / Notes Summary */}
          <div className="border border-slate-300 rounded-2xl p-4 bg-slate-50 text-xs text-slate-800 leading-relaxed space-y-1.5 shadow-xs">
            <div className="font-black text-slate-950 text-xs uppercase tracking-wide">Executive Estimate Notice:</div>
            <p className="font-medium text-slate-800">
              Thank you for the opportunity to present this Builders Estimate for your new Hudson home. This quotation remains valid for 14 days from the date of issue.
            </p>
            <p className="text-[11px] text-slate-700 italic font-semibold">
              *** This document represents a preliminary Builders Estimate and is subject to geotechnical soil classification, registered contour survey, and developer covenant approval. ***
            </p>
          </div>
        </div>

        {/* Page 2 Footer */}
        <div className="border-t border-slate-200 pt-4 flex items-center justify-between text-[10px] text-slate-500">
          <div>
            {footerLicenceLine}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-bold uppercase text-slate-400 tracking-wider">Initial:</span>
              <div className="border border-slate-400 w-12 h-6 rounded bg-white" />
            </div>
            <div className="font-mono">Page 2 of {totalPages}</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 3: DEDICATED ARCHITECTURAL FACADE RENDER & MAXIMIZED FLOORPLAN       */}
      {/* ========================================================================= */}
      <div className="quote-page bg-white w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] p-10 flex flex-col justify-between relative overflow-hidden shadow-2xl box-border print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always">
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-2 mb-2 flex-none">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-700">
                ARCHITECTURAL ELEVATION &amp; FLOORPLAN SPECIFICATIONS
              </div>
              <div className="mt-1">
                <h2 className="text-2xl font-black text-slate-950 tracking-tight leading-tight flex items-baseline gap-2.5 flex-wrap">
                  <span className="uppercase">
                    {effectiveDesignName || (design.mode === "standard" ? "HUDSON HOMES ARCHITECTURAL PLAN" : "CUSTOM ARCHITECTURAL FLOORPLAN")}
                  </span>
                  {design.specTier && (
                    <>
                      <span className="text-slate-300 font-light text-xl select-none">―</span>
                      <span className="text-2xl font-black text-cyan-700 tracking-tight uppercase">
                        {formatInclusionTierTitle(design.specTier)}
                      </span>
                    </>
                  )}
                </h2>
              </div>
            </div>
            <div className="text-right flex-none">
              <span className="text-[9px] text-slate-500 block uppercase tracking-wider font-semibold">Total Area</span>
              <span className="text-sm font-extrabold text-cyan-700 font-mono">
                {totalAreaM2} m² ({(totalAreaM2 * 0.107639).toFixed(1)} sq)
              </span>
            </div>
          </div>

          {/* 2-Row Unified Architectural Configuration & Room Sizing Schedule */}
          {(() => {
            const isMod = !!design.isModifiedFloorplan;
            const modCalc = calculateModifiedFloorplanPricing(design);
            return (
              <div
                className={`border rounded-xl px-3 py-1.5 mb-2 flex-none shadow-xs ${
                  isMod
                    ? "bg-emerald-50/80 border-emerald-300"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                {/* Row 1: Home Specifications & Key Dimensions */}
                <div className="grid grid-cols-4 gap-2 pb-1.5 border-b border-slate-200 text-center text-xs">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-slate-700 text-[10px] font-bold uppercase tracking-wide">Bedrooms:</span>
                    <span className="font-black text-slate-950 text-xs whitespace-nowrap">{design.beds || 4} Beds</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-slate-700 text-[10px] font-bold uppercase tracking-wide">Bathrooms:</span>
                    <span className="font-black text-slate-950 text-xs whitespace-nowrap">{design.baths || 2} Baths</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-slate-700 text-[10px] font-bold uppercase tracking-wide">Garage:</span>
                    <span className="font-black text-slate-950 text-xs whitespace-nowrap">{design.cars || 2} Cars</span>
                  </div>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="text-slate-700 text-[10px] font-bold uppercase tracking-wide">GFA Platform:</span>
                    <span className="font-black text-slate-950 text-xs whitespace-nowrap">{pricing.gfaM2}&nbsp;m²</span>
                  </div>
                </div>

                {/* Row 2: Room & Zone Area Breakdown */}
                <div className="pt-1.5 flex flex-wrap items-center justify-start gap-x-4 gap-y-1 text-xs">
                  {modCalc.zones.map((z) => (
                    <span key={z.key} className="inline-flex items-center gap-1 whitespace-nowrap font-mono text-[11px]">
                      <span className="font-sans text-slate-700 text-[10px] font-bold">{z.label.replace(" Area", "").replace(" (Optional)", "")}:</span>
                      <span className="font-black text-slate-950 whitespace-nowrap">{z.modifiedM2.toFixed(1)}&nbsp;m²</span>
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* 1. Chosen Facade Render (Towards the top of the page, high quality & enhanced) */}
          <QuoteFacadeViewer design={design} />

          {/* 2. Architectural Floorplan Layout Drawing (Maximized to fill the lower page area shifted all the way down) */}
          <div className="flex-1 w-full border border-slate-200 rounded-2xl p-1 bg-white flex items-center justify-center overflow-hidden shadow-inner mt-auto">
            <QuoteFloorplanViewer design={design} />
          </div>
        </div>

        {/* Page 3 Footer */}
        <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-500 flex-none mt-2">
          <div>
            {footerLicenceLine}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-bold uppercase text-slate-400 tracking-wider">Initial:</span>
              <div className="border border-slate-400 w-12 h-6 rounded bg-white" />
            </div>
            <div className="font-mono">Page 3 of {totalPages}</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 4 (OPTIONAL): 2ND DWELLING / GRANNY FLAT ARCHITECTURAL FLOORPLAN      */}
      {/* ========================================================================= */}
      {hasSecondDwelling && secondDwelling && (
        <div className="quote-page bg-white w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] p-10 flex flex-col justify-between relative overflow-hidden shadow-2xl box-border print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always">
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-2 mb-2 flex-none">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-700">
                  2ND DWELLING / AUXILIARY RESIDENCE ARCHITECTURAL SPECIFICATION
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 leading-tight mt-0.5">
                  {secondDwelling.designName} — {secondDwelling.specTier}
                </h2>
                <div className="text-[11px] text-slate-600 mt-0.5">
                  Selected Facade: <span className="font-semibold text-slate-900">{secondDwelling.facadeName || "Classic"}</span>
                  {secondDwelling.widthM && secondDwelling.lengthM && (
                    <span> · Dimensions: {secondDwelling.widthM} wide × {secondDwelling.lengthM} deep</span>
                  )}
                </div>
              </div>
              <div className="text-right flex-none">
                <span className="text-[9px] text-slate-500 block uppercase tracking-wider font-semibold">2nd Dwelling Area</span>
                <span className="text-sm font-extrabold text-cyan-700 font-mono">
                  {secondDwelling.designM2} m² ({(secondDwelling.designM2 * 0.107639).toFixed(1)} sq)
                </span>
              </div>
            </div>

            {/* 2-Row Unified Secondary Residence Specifications & Room Sizing Schedule */}
            <div className="border rounded-xl p-2.5 mb-2.5 flex-none shadow-xs bg-cyan-50/70 border-cyan-200 text-cyan-950">
              {/* Row 1: Key Configuration */}
              <div className="grid grid-cols-4 gap-2 pb-2 border-b border-cyan-200/80 text-center text-xs">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-cyan-900 text-[10px] font-medium uppercase tracking-wide">Bedrooms:</span>
                  <span className="font-extrabold text-slate-900 text-xs whitespace-nowrap">{secondDwelling.beds || 2} Beds</span>
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-cyan-900 text-[10px] font-medium uppercase tracking-wide">Bathrooms:</span>
                  <span className="font-extrabold text-slate-900 text-xs whitespace-nowrap">{secondDwelling.baths || 1} Bath</span>
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-cyan-900 text-[10px] font-medium uppercase tracking-wide">Parking:</span>
                  <span className="font-extrabold text-slate-900 text-xs whitespace-nowrap">{secondDwelling.cars || 0} Cars</span>
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-cyan-900 text-[10px] font-medium uppercase tracking-wide">Dwelling:</span>
                  <span className="font-extrabold text-slate-900 text-xs whitespace-nowrap">{secondDwelling.housingType}</span>
                </div>
              </div>

              {/* Row 2: Room & Zone Sizing Schedule */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-x-3.5 gap-y-1.5 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-cyan-900 uppercase font-black tracking-wider text-[10px]">
                    Secondary Residence Floor Schedule:
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px]">
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <span className="font-sans text-cyan-900 text-[10px] font-semibold">Living:</span>
                    <strong className="text-slate-900 font-bold whitespace-nowrap">{(secondDwelling.modifiedAreas?.livingM2 || secondDwelling.standardAreas?.livingM2 || Math.round(secondDwelling.designM2 * 0.85)).toFixed(1)}&nbsp;m²</strong>
                  </span>
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <span className="font-sans text-cyan-900 text-[10px] font-semibold">Porch / Outdoor:</span>
                    <strong className="text-slate-900 font-bold whitespace-nowrap">{(secondDwelling.modifiedAreas?.porchM2 || secondDwelling.standardAreas?.porchM2 || Math.round(secondDwelling.designM2 * 0.15)).toFixed(1)}&nbsp;m²</strong>
                  </span>
                  <span className="border-l border-cyan-300 pl-3 inline-flex items-center gap-1 whitespace-nowrap">
                    <span className="font-sans text-cyan-950 text-[10.5px] font-black">Total GFA:</span>
                    <span className="font-black text-cyan-900 whitespace-nowrap text-xs">{secondDwelling.designM2.toFixed(1)}&nbsp;m²</span>
                  </span>
                </div>
              </div>
            </div>

            {/* 1. Chosen Facade Render for Secondary Dwelling */}
            <QuoteSecondFacadeViewer secondDwelling={secondDwelling} />

            {/* 2. Floorplan Layout Drawing (Maximized) */}
            <div className="flex-1 w-full border border-slate-200 rounded-2xl p-1 bg-white flex items-center justify-center min-h-[520px] max-h-[580px] overflow-hidden shadow-inner">
              <QuoteSecondFloorplanViewer secondDwelling={secondDwelling} />
            </div>
          </div>

          {/* Page 4 Footer */}
          <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-500 flex-none mt-2">
            <div>
              {footerLicenceLine}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-bold uppercase text-slate-400 tracking-wider">Initial:</span>
                <div className="border border-slate-400 w-12 h-6 rounded bg-white" />
              </div>
              <div className="font-mono">Page 4 of {totalPages}</div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADVANCED ESTIMATE SPECIFICATION (COMBINED SITE, STATUTORY & VARIATIONS)   */}
      {/* ========================================================================= */}
      {specPages.map((pageGroups, pageIdx) => {
        const pageNumber = (hasSecondDwelling ? 5 : 4) + pageIdx;
        const isFirstSpecPage = pageIdx === 0;

        return (
          <div
            key={`spec-page-${pageIdx}`}
            className="quote-page bg-white w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] p-10 flex flex-col justify-between relative overflow-hidden shadow-2xl box-border print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always"
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-cyan-700">
                    {isFirstSpecPage
                      ? "SITE ENGINEERING, STATUTORY & VARIATIONS SCHEDULE"
                      : "SPECIFICATION VARIATIONS & UPGRADES (CONTINUED)"}
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
                    {isFirstSpecPage
                      ? "Advanced Estimate Specification"
                      : `Advanced Estimate Specification (Page ${pageIdx + 1})`}
                  </h2>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-bold">
                    PAGE SUB-TOTAL
                  </span>
                  <span className="text-base font-black text-cyan-800 font-mono">
                    +{formatAud(pageGroups.reduce((s, g) => s + g.total, 0))}
                  </span>
                </div>
              </div>

              {/* Sub-header info bar on first spec page */}
              {isFirstSpecPage && (
                <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 mb-4 flex items-center justify-between text-xs shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900">Council Jurisdiction:</span>
                    <span className="text-slate-800 font-semibold">{siteConditions.councilRegion}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-black text-slate-900">Soil:</span>
                    <span className="text-slate-800 font-semibold">{siteConditions.soilClass}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-black text-slate-900">Topography Fall:</span>
                    <span className="text-slate-800 font-semibold">{siteConditions.fallMeters}m</span>
                  </div>
                  <div className="font-mono text-slate-700 text-xs">
                    Building Pad: <strong className="text-slate-950 font-black">{pricing.gfaM2} m² GFA</strong>
                  </div>
                </div>
              )}

              {/* Specification Tables */}
              <div className="space-y-3.5">
                {pageGroups.map((group) => (
                  <div
                    key={group.label}
                    className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs bg-white"
                  >
                    <div className="bg-gradient-to-r from-slate-100 via-slate-50 to-white px-4 py-2.5 border-b border-slate-200 flex justify-between items-center text-xs font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(group.label)}
                        <span className="uppercase tracking-wider text-xs font-black text-slate-950">
                          {group.label}
                        </span>
                      </div>
                      <span className="font-mono text-cyan-900 font-black text-xs bg-white px-3 py-0.5 rounded-full border border-slate-200/80 shadow-2xs">
                        {group.total === 0 ? "INCLUDED ($0)" : `+${formatAud(group.total)}`}
                      </span>
                    </div>
                    <table className="w-full text-xs border-collapse">
                      <tbody className="divide-y divide-slate-100">
                        {group.items.map((it) => (
                          <tr key={it.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-4">
                              <div className="font-bold text-slate-950 text-xs leading-snug flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-cyan-600 flex-none" />
                                {it.name}
                              </div>
                              {it.description && (
                                <div className="text-[11px] text-slate-600 mt-0.5 leading-snug pl-3">
                                  {it.description}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center w-32 flex-none">
                              <span className="inline-block bg-slate-100 text-slate-800 font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">
                                {it.qtyLabel}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-black w-32 text-xs flex-none">
                              {it.amount === 0 ? (
                                <span className="inline-block bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded font-black text-[9.5px]">
                                  INCLUDED
                                </span>
                              ) : (
                                <span className="text-cyan-950 font-black">
                                  +{formatAud(it.amount)}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>

            {/* Spec Page Footer */}
            <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-500">
              <div>
                {footerLicenceLine}
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-bold uppercase text-slate-400 tracking-wider">Initial:</span>
                  <div className="border border-slate-400 w-12 h-6 rounded bg-white" />
                </div>
                <div className="font-mono">
                  Page {pageNumber} of {totalPages}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* ========================================================================= */}
      {/* PAGE 5+: EXPANDED FULL-PAGE STANDARD INCLUSIONS SCHEDULE (WEBSITE STYLED) */}
      {/* ========================================================================= */}
      <div className="quote-page bg-white w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] p-10 flex flex-col justify-between relative overflow-hidden shadow-2xl box-border print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-cyan-700">
                STANDARD INCLUSIONS SPECIFICATION SCHEDULE
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
                {formatInclusionTierTitle(design.specTier)}
              </h2>
            </div>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-3.5 py-1.5 rounded-full border border-emerald-300 shadow-sm flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-700" />
              Fully Included in Base Builders Estimate
            </span>
          </div>

          {/* Comprehensive 8-Category Inclusions Grid with Website Rich Aesthetic */}
          <div className="space-y-2.5 text-[9.5px] leading-snug">
            {/* Certification & Approvals */}
            <div className="border border-slate-200 rounded-xl p-2.5 bg-gradient-to-r from-slate-50 to-white shadow-xs">
              <div className="font-bold text-slate-900 flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                <span className="tracking-wide flex items-center gap-1 text-slate-900">
                  <FileCheck2 className="h-3.5 w-3.5 text-cyan-700" />
                  CERTIFICATION AND APPROVALS
                </span>
                <span className="text-emerald-700 font-bold text-[8.5px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">INCLUDED</span>
              </div>
              <div className="text-slate-700 grid grid-cols-2 gap-x-4 gap-y-0.5">
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>Site contour survey by registered surveyor &amp; physical set out</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>Building Application (BA) preparation, lodgement &amp; fees</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>Structural engineering design for concrete slab &amp; footing</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>Form 15 Pre-nail frame/truss layout &amp; Form 16 Structural certs</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>Glazing acoustics Form 15 &amp; energy efficiency assessment report</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>Final Occupation Certificate (Form 21) upon completion</span></div>
              </div>
            </div>

            {/* Site Costs, Preparation & Foundation */}
            <div className="border border-slate-200 rounded-xl p-2.5 bg-gradient-to-r from-slate-50 to-white shadow-xs">
              <div className="font-bold text-slate-900 flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                <span className="tracking-wide flex items-center gap-1 text-slate-900">
                  <Layers className="h-3.5 w-3.5 text-cyan-700" />
                  SITE COSTS, PREPARATION &amp; FOUNDATION
                </span>
                <span className="text-emerald-700 font-bold text-[8.5px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">INCLUDED</span>
              </div>
              <div className="text-slate-700 grid grid-cols-2 gap-x-4 gap-y-0.5">
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>Bulk earthworks &amp; levelling up to 1.0m fall across building pad</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>Engineered waffle pod concrete slab on ground including alfresco</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>Roof edge safety rail &amp; scaffolding to strict WHS compliance</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>Connect sewer, water, power &amp; storm water services to mains</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>Part A &amp; Part B Termite Management System with warranty</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>Smooth power-trowelled finish to garage and internal living areas</span></div>
              </div>
            </div>

            {/* External Features, Roof & Windows */}
            <div className="border border-slate-200 rounded-xl p-2.5 bg-gradient-to-r from-slate-50 to-white shadow-xs">
              <div className="font-bold text-slate-900 flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                <span className="tracking-wide flex items-center gap-1 text-slate-900">
                  <Building className="h-3.5 w-3.5 text-cyan-700" />
                  EXTERNAL FEATURES, ROOF &amp; GLAZING
                </span>
                <span className="text-emerald-700 font-bold text-[8.5px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">INCLUDED</span>
              </div>
              <div className="text-slate-700 grid grid-cols-2 gap-x-4 gap-y-0.5">
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>{design.specTier.includes("H3") ? "Colorbond® steel roof or flat profile concrete designer roof tiles" : "Colorbond® corrugated steel roofing with medium duty reflective foil"}</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>Colorbond® fascia and gutters with painted UPVC downpipes</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>Engineered T2 treated timber roof trusses and wall framing</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>{design.specTier.includes("H3") ? "Stain grade decorative solid core front door up to 1200mm wide" : "Hume Newington 2040mm solid core front entry door with double lock"}</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>Powder coated aluminium windows &amp; flyscreens with fibreglass mesh</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>2 external garden taps &amp; energy-efficient heat pump hot water system</span></div>
              </div>
            </div>

            {/* Internal Ceilings, Walls & Doors */}
            <div className="border border-slate-200 rounded-xl p-2.5 bg-gradient-to-r from-slate-50 to-white shadow-xs">
              <div className="font-bold text-slate-900 flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                <span className="tracking-wide flex items-center gap-1 text-slate-900">
                  <Home className="h-3.5 w-3.5 text-cyan-700" />
                  INTERNAL CEILINGS, WALLS &amp; DOORS
                </span>
                <span className="text-emerald-700 font-bold text-[8.5px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">INCLUDED</span>
              </div>
              <div className="text-slate-700 grid grid-cols-2 gap-x-4 gap-y-0.5">
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>{design.specTier.includes("H3") ? "2,740mm ceiling height to single storey / ground floor" : design.specTier.includes("H2") ? "2,590mm ceiling height throughout" : "2,440mm ceiling height throughout"}</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>{design.specTier.includes("H3") ? "Hume Linear HLR270 2340mm high internal doors" : "Hume Linear 2040mm internal doors"} with Dulux gloss enamel</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>Dulux multi-coat paint system to all internal walls and ceilings</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>{design.specTier.includes("H3") ? "2400mm high frameless mirror sliding doors to wardrobes" : "Frameless mirror or vinyl sliding wardrobe doors"}</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>67x18mm skirting &amp; architraves with Dulux painted full gloss enamel</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>Glass wool insulation batts to external walls &amp; ceilings</span></div>
              </div>
            </div>

            {/* Gourmet Kitchen & Luxury Appliances */}
            <div className="border border-slate-200 rounded-xl p-2.5 bg-gradient-to-r from-slate-50 to-white shadow-xs">
              <div className="font-bold text-slate-900 flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                <span className="tracking-wide flex items-center gap-1 text-slate-900">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-700" />
                  GOURMET KITCHEN &amp; APPLIANCES
                </span>
                <span className="text-emerald-700 font-bold text-[8.5px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">INCLUDED</span>
              </div>
              <div className="text-slate-700 grid grid-cols-2 gap-x-4 gap-y-0.5">
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>{design.specTier.includes("H3") ? "40mm mitred edge stone kitchen benchtops" : design.specTier.includes("H2") ? "20mm stone kitchen benchtops" : "Laminated benchtops with rolled edge"}</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>Fully lined overhead cupboards with plaster bulkhead feature</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>Bank of 4 soft-close cutlery drawers and matching pot drawers</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>{design.specTier.includes("H1") ? "Haier 600mm stainless steel electric oven, cooktop & dishwasher" : "Fisher & Paykel 900mm luxury stainless steel electric oven & 900mm cooktop"}</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>Fisher &amp; Paykel stainless steel dishwasher &amp; built-in microwave oven</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>Clark Polar undermount/drop-in sink with Liano II designer pull-out mixer</span></div>
              </div>
            </div>

            {/* Bathrooms, Ensuite & Powder Room */}
            <div className="border border-slate-200 rounded-xl p-2.5 bg-gradient-to-r from-slate-50 to-white shadow-xs">
              <div className="font-bold text-slate-900 flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                <span className="tracking-wide flex items-center gap-1 text-slate-900">
                  <Waves className="h-3.5 w-3.5 text-cyan-700" />
                  BATHROOM, ENSUITE &amp; POWDER ROOM
                </span>
                <span className="text-emerald-700 font-bold text-[8.5px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">INCLUDED</span>
              </div>
              <div className="text-slate-700 grid grid-cols-2 gap-x-4 gap-y-0.5">
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>Contemporary floating vanities with {design.specTier.includes("H1") ? "laminate" : "20mm stone"} benchtops</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>{design.specTier.includes("H3") ? "10mm frameless glass shower screen with pivot doors" : "Semi-frameless shower screens with clear safety glass"}</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>Caroma Aura 1,775mm freestanding white bathtub &amp; Caroma tapware</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>Wall-faced closed coupled toilet suites with soft-close seats</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>{design.specTier.includes("H3") ? "Ceramic full-height wall tiling to wet areas with shower" : "Ceramic wall tiles to 2,100mm in shower recess"}</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>Smart tile floor wastes &amp; tiled shower recess niche</span></div>
              </div>
            </div>

            {/* Laundry & Interior Floor Coverings */}
            <div className="border border-slate-200 rounded-xl p-2.5 bg-gradient-to-r from-slate-50 to-white shadow-xs">
              <div className="font-bold text-slate-900 flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                <span className="tracking-wide flex items-center gap-1 text-slate-900">
                  <Award className="h-3.5 w-3.5 text-cyan-700" />
                  LAUNDRY &amp; INTERNAL FLOOR COVERINGS
                </span>
                <span className="text-emerald-700 font-bold text-[8.5px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">INCLUDED</span>
              </div>
              <div className="text-slate-700 grid grid-cols-2 gap-x-4 gap-y-0.5">
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>Built-in laundry cabinet (up to 1,200mm) with {design.specTier.includes("H1") ? "metal tub" : "20mm stone top & Clark 45L drop-in tub"}</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>{design.specTier.includes("H3") ? "Choice of 8.5mm Hybrid Timber flooring or Gold Range floor tiles" : "Floor tiles to entry, hallway, kitchen, family & meals"}</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>Quality carpet with underlay to all bedrooms and media rooms</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>Main floor outdoor ceramic tiling to under-roof alfresco</span></div>
              </div>
            </div>

            {/* Air-Conditioning & Electrical */}
            <div className="border border-slate-200 rounded-xl p-2.5 bg-gradient-to-r from-slate-50 to-white shadow-xs">
              <div className="font-bold text-slate-900 flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                <span className="tracking-wide flex items-center gap-1 text-slate-900">
                  <Sparkles className="h-3.5 w-3.5 text-cyan-700" />
                  AIR-CONDITIONING &amp; ELECTRICAL
                </span>
                <span className="text-emerald-700 font-bold text-[8.5px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">INCLUDED</span>
              </div>
              <div className="text-slate-700 grid grid-cols-2 gap-x-4 gap-y-0.5">
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>{design.specTier.includes("H3") ? "Fully Zoned Ducted Air-Conditioning with MyAir5 Touch Screen Controller" : design.specTier.includes("H2") ? "Day/Night Ducted Air-Conditioning System (Living & Bedroom Zones)" : "Reverse Cycle Split System Air-Conditioner to Living Room"}</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>LED downlights throughout plus ceiling fan/lights to all bedrooms</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>{design.specTier.includes("H3") ? "1.5kW Solar PV Power System with single-phase inverter" : "Energy-efficient electrical fitout"}</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>Interconnected hardwired photoelectric smoke detectors</span></div>
                <div className="flex items-start gap-1.5"><Check className="h-3 w-3 text-emerald-600 flex-none mt-0.5" /><span>NBN pre-wiring with telephone &amp; data points to living</span></div>
              </div>
            </div>
          </div>

          {/* Interactive QR Code Card for Full Inclusions Brochure */}
          <div className="mt-3.5 bg-gradient-to-r from-slate-900 via-slate-950 to-cyan-950 text-white rounded-2xl p-3 px-4 flex items-center justify-between gap-4 shadow-md border border-cyan-800/80">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <span className="bg-amber-400 text-slate-950 font-black text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                  OFFICIAL BROCHURE
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-cyan-200">
                  VIEW FULL STANDARD INCLUSIONS BROCHURE
                </span>
              </div>
              <p className="text-[10px] text-slate-200 leading-snug">
                Scan the QR code to explore comprehensive room-by-room specifications, fixtures, designer finishes, and luxury upgrade packages directly on the official Hudson Homes portal.
              </p>
              <div className="text-[9.5px] font-mono text-cyan-300 font-bold">
                hudsonhomes.com.au/inclusions-packages/
              </div>
            </div>
            <div className="flex flex-col items-center justify-center bg-white p-2 rounded-xl flex-none shadow-sm text-center">
              <QrCode value="https://www.hudsonhomes.com.au/inclusions-packages/" size={17} />
              <span className="text-[7.5px] font-black uppercase text-slate-900 font-mono mt-1 tracking-wider">
                SCAN TO VIEW
              </span>
            </div>
          </div>
        </div>

        {/* Inclusions Page Footer */}
        <div className="border-t border-slate-200 pt-4 flex items-center justify-between text-[10px] text-slate-500">
          <div>
            {footerLicenceLine}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-bold uppercase text-slate-400 tracking-wider">Initial:</span>
              <div className="border border-slate-400 w-12 h-6 rounded bg-white" />
            </div>
            <div className="font-mono">Page {(hasSecondDwelling ? 4 : 3) + specPages.length + 1} of {totalPages}</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FINAL PAGE: LIFETIME GUARANTEE, DEPOSIT & OFFICIAL NAB BANK TRANSFER      */}
      {/* ========================================================================= */}
      <div className="quote-page bg-white w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] p-8 flex flex-col justify-between relative overflow-hidden shadow-2xl box-border print:shadow-none print:min-h-0 print:h-[297mm]">
        <div className="space-y-3.5">
          {/* Top Brand & License Row */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <Logo size={10} modern={false} />
            <div className="text-[10px] text-slate-500 font-medium">
              Hudson Homes Pty Ltd · ABN: 49 163 189 071 · Builder’s Licence: 259372C
            </div>
          </div>

          {/* Top Lifetime Structural Guarantee Banner - Matching Inspo Styling */}
          <div
            className="lifetime-guarantee-banner bg-slate-900 text-white rounded-2xl p-5 shadow-lg text-center space-y-2 border border-amber-500/30"
            style={{ backgroundColor: "#0f172a", color: "#ffffff", borderColor: "rgba(245, 158, 11, 0.4)" }}
          >
            <div
              className="text-xs font-black tracking-[0.35em] text-white uppercase"
              style={{ color: "#ffffff" }}
            >
              L I F E T I M E &nbsp; S T R U C T U R A L
            </div>
            <h3
              className="text-2xl font-black uppercase tracking-wider leading-tight"
              style={{ color: "#fbbf24" }}
            >
              INTEGRITY GUARANTEE
            </h3>
            <p className="text-xs text-slate-200 max-w-xl mx-auto leading-relaxed" style={{ color: "#e2e8f0" }}>
              Every Hudson home is engineered and constructed to the highest standards of Australian building compliance.
              We proudly back our workmanship with a{" "}
              <strong className="font-black text-amber-300" style={{ color: "#fde047" }}>
                Lifetime Structural Integrity Guarantee
              </strong>{" "}
              covering foundation slabs, footings, structural framing, and load-bearing masonry for total peace of mind.
            </p>
            <div
              className="pt-1.5 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[10.5px] font-bold uppercase tracking-wider border-t border-slate-800"
              style={{ color: "#fbbf24" }}
            >
              <span>★ 100% Australian Owned</span>
              <span>★ Lifetime Structural Guarantee</span>
              <span>★ ISO 9001 Certified</span>
              <span>★ 12-Month Defect Period</span>
            </div>
          </div>

          {/* Initial Deposit Allocation Box */}
          <div className="border border-emerald-500/40 rounded-2xl p-4 bg-emerald-50/40 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
              <div>
                <span className="text-xs font-black text-emerald-900 uppercase tracking-wider block">
                  INITIAL DEPOSIT TO PROCEED
                </span>
                <span className="text-base font-black text-slate-950 flex items-center gap-2 mt-0.5">
                  {client.depositType === "brownfield" ? "Brownfield Site Allocation" : "Greenfield Site Allocation"}
                  {client.custom3dTourSelected && (
                    <span className="text-xs font-bold text-cyan-800 bg-cyan-100 border border-cyan-300 px-2 py-0.5 rounded-full font-mono">
                      + Custom 3D Virtual Tour
                    </span>
                  )}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">
                  Deposit Amount
                </span>
                <span className="text-3xl font-black text-emerald-700 font-mono">
                  {formatAud(pricing.initialDepositAmount || (client.custom3dTourSelected ? (client.depositType === "brownfield" ? 4100 : 2450) : (client.depositType === "brownfield" ? 3300 : 1650)))}
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-900">
              <div className="font-black text-emerald-950 mb-1.5 flex items-center gap-1.5">
                <FileCheck2 className="h-4 w-4 text-emerald-700" />
                Preliminary Work Completed as a result of the Initial Deposit:
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-900 font-bold">
                <div>• On-site Investigation Report</div>
                <div>• Geotechnical Soil Test</div>
                <div>• Wind Classification Report</div>
                <div>• Registered Contour Survey</div>
                <div>• Developer Covenant Compliance Check</div>
                <div>• Drafted Plans &amp; Elevations by in-house draftsmen</div>
                {client.custom3dTourSelected && (
                  <div className="col-span-2 text-cyan-900 font-bold bg-cyan-50 border border-cyan-200 px-2 py-1 rounded mt-0.5">
                    • 3D Interactive Virtual Tour of Customized Design prior to Building Contract (Custom $800 Fee Included)
                  </div>
                )}
                <div className="col-span-2">• Completed Formal Tender Pricing by in-house estimator</div>
              </div>
              {client.custom3dTourSelected && (
                <div className="text-[10px] text-slate-500 pt-1 italic">
                  *Note: The $800 Custom 3D Virtual Tour fee forms part of your initial deposit and is credited in full toward your total contract investment.
                </div>
              )}
            </div>
          </div>

          {/* NAB Direct Transfer Banking Box with Real Dynamic QR Code */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex items-center justify-between gap-5 shadow-xs">
            <div className="space-y-2 text-xs flex-1">
              <div className="font-black text-cyan-950 uppercase tracking-wider text-xs flex items-center gap-1.5">
                <Building className="h-4 w-4 text-cyan-700" />
                {bankHeaderTitle}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] font-bold uppercase block">Account Name:</span>
                  <span className="font-extrabold text-slate-950 text-xs">{bankAccountName}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] font-bold uppercase block">Bank:</span>
                  <span className="font-extrabold text-slate-950 text-xs">National Australia Bank (NAB)</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] font-bold uppercase block">BSB Number:</span>
                  <span className="font-black text-slate-950 font-mono text-sm tracking-wider">{bankBsb}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] font-bold uppercase block">Account Number:</span>
                  <span className="font-black text-slate-950 font-mono text-sm tracking-wider">{bankAccountNumber}</span>
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 text-[10px] font-bold uppercase block">EFT Payment Remittance Reference:</span>
                  <span className="font-black text-cyan-900 font-mono text-sm">
                    {client.clientName ? `${client.clientName.split(" ").pop()}-${quote.quoteNumber || "MH678"}` : `Client-${quote.quoteNumber || "MH678"}`}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 uppercase font-mono font-bold">Currency: AUD</span>
              </div>
            </div>

            {/* Dynamic Payment QR Code Box */}
            <div className="flex flex-col items-center justify-center p-2.5 bg-white border border-slate-200 rounded-xl text-center flex-none shadow-xs">
              <PaymentQrCode
                accountName={bankAccountName}
                bsb={bankBsb}
                accountNumber={bankAccountNumber}
                amount={pricing.initialDepositAmount || 1650}
                reference={client.clientName ? `${client.clientName.split(" ").pop()}-${quote.quoteNumber || "MH678"}` : `Client-${quote.quoteNumber || "MH678"}`}
                size={90}
              />
              <span className="text-[9px] font-bold text-slate-700 mt-1 uppercase font-mono tracking-wider">
                Scan to view banking details
              </span>
            </div>
          </div>

          {/* Customer & Consultant Authorization Signatures */}
          <div className="grid grid-cols-2 gap-6 pt-1">
            <div className="space-y-3">
              <div className="text-xs font-black uppercase text-slate-700 tracking-wider">
                CLIENT 1 SIGNATURE:
              </div>
              <div className="border-b-2 border-slate-900 h-8 flex items-end pb-1 text-slate-400 italic text-xs">
                {/* Space for physical or digital signing */}
              </div>
              <div className="text-xs">
                <span className="font-black text-slate-950 block text-sm">{client.clientName || "Primary Applicant"}</span>
                <span className="text-xs text-slate-600 font-medium">Date: ____ / _____ / 2026</span>
              </div>

              {client.hasClient2 && (
                <div className="pt-1.5 space-y-3">
                  <div className="text-xs font-black uppercase text-slate-700 tracking-wider">
                    CLIENT 2 SIGNATURE:
                  </div>
                  <div className="border-b-2 border-slate-900 h-8 flex items-end pb-1 text-slate-400 italic text-xs">
                    {/* Space for Client 2 signature */}
                  </div>
                  <div className="text-xs">
                    <span className="font-black text-slate-950 block text-sm">{client.client2Name || "Secondary Applicant"}</span>
                    <span className="text-xs text-slate-600 font-medium">Date: ____ / _____ / 2026</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="text-xs font-black uppercase text-slate-700 tracking-wider">
                AUTHORISED NEW HOME CONSULTANT:
              </div>
              <div className="border-b-2 border-slate-900 h-8 flex items-end pb-1 text-slate-400 italic text-xs">
                {/* Space for consultant signing */}
              </div>
              <div className="text-xs">
                <span className="font-black text-slate-950 block text-sm">{client.consultantName || "Morgan Hales"}</span>
                <span className="text-xs text-slate-600 font-medium">{client.consultantOffice} · {client.consultantPhone}</span>
                <span className="text-xs text-slate-600 font-semibold block">Date: {formattedCreatedDate}</span>
              </div>

              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 text-[10px] text-slate-600 space-y-0.5">
                <div className="font-black text-slate-800">{bankAccountName}</div>
                <div>{headOfficeAddress}</div>
                <div>Phone: 1300 246 200 · Fax: 1300 246 300 · www.hudsonhomes.com.au</div>
              </div>
            </div>
          </div>
        </div>

        {/* Final Page Footer */}
        <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-500">
          <div>
            {footerLicenceLine}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-bold uppercase text-slate-400 tracking-wider">Initial:</span>
              <div className="border border-slate-400 w-12 h-6 rounded bg-white" />
            </div>
            <div className="font-mono">Page {totalPages} of {totalPages}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
