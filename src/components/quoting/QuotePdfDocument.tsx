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
  Zap,
  Droplets,
} from "lucide-react";
import { PaymentQrCode } from "./PaymentQrCode";
import { QrCode } from "@/components/flyer/QrCode";

function getCategoryIcon(label: string) {
  const l = label.toLowerCase();
  if (l.includes("earthwork") || l.includes("soil") || l.includes("foundation")) {
    return <Layers className="h-3.5 w-3.5 text-sky-700 flex-none" />;
  }
  if (l.includes("report") || l.includes("overlay")) {
    return <FileText className="h-3.5 w-3.5 text-indigo-700 flex-none" />;
  }
  if (l.includes("council") || l.includes("statutory") || l.includes("approval")) {
    return <Building2 className="h-3.5 w-3.5 text-blue-700 flex-none" />;
  }
  if (l.includes("geotechnical") || l.includes("allowance")) {
    return <Mountain className="h-3.5 w-3.5 text-teal-700 flex-none" />;
  }
  if (l.includes("kitchen")) {
    return <Sparkles className="h-3.5 w-3.5 text-orange-700 flex-none" />;
  }
  if (l.includes("bathroom") || l.includes("ensuite")) {
    return <Droplets className="h-3.5 w-3.5 text-cyan-700 flex-none" />;
  }
  if (l.includes("floorplan") || l.includes("extension")) {
    return <Maximize2 className="h-3.5 w-3.5 text-violet-700 flex-none" />;
  }
  if (l.includes("ceiling") || l.includes("structural")) {
    return <Layers className="h-3.5 w-3.5 text-slate-700 flex-none" />;
  }
  if (l.includes("electrical") || l.includes("air conditioning")) {
    return <Zap className="h-3.5 w-3.5 text-amber-700 flex-none" />;
  }
  if (l.includes("flooring")) {
    return <Layers className="h-3.5 w-3.5 text-stone-700 flex-none" />;
  }
  if (l.includes("landscape") || l.includes("turnkey") || l.includes("driveway") || l.includes("external")) {
    return <Home className="h-3.5 w-3.5 text-emerald-700 flex-none" />;
  }
  return <PackageCheck className="h-3.5 w-3.5 text-[#0099d8] flex-none" />;
}

function getCategoryTheme(label: string) {
  const l = label.toLowerCase();
  if (l.includes("earthwork") || l.includes("soil") || l.includes("foundation") || l.includes("inclusion / selection")) {
    return {
      barBg: "bg-gradient-to-r from-sky-50/90 via-sky-50/50 to-white",
      borderColor: "border-sky-500",
      textColor: "text-sky-950",
      iconColor: "text-sky-600",
      pillBg: "bg-sky-100 text-sky-900 border-sky-300",
      icon: Layers,
    };
  }
  if (l.includes("report") || l.includes("overlay")) {
    return {
      barBg: "bg-gradient-to-r from-indigo-50/90 via-indigo-50/50 to-white",
      borderColor: "border-indigo-500",
      textColor: "text-indigo-950",
      iconColor: "text-indigo-600",
      pillBg: "bg-indigo-100 text-indigo-900 border-indigo-300",
      icon: FileText,
    };
  }
  if (l.includes("council") || l.includes("statutory") || l.includes("approval")) {
    return {
      barBg: "bg-gradient-to-r from-blue-50/90 via-blue-50/50 to-white",
      borderColor: "border-blue-600",
      textColor: "text-blue-950",
      iconColor: "text-blue-600",
      pillBg: "bg-blue-100 text-blue-900 border-blue-300",
      icon: Building2,
    };
  }
  if (l.includes("geotechnical") || l.includes("allowance")) {
    return {
      barBg: "bg-gradient-to-r from-teal-50/90 via-teal-50/50 to-white",
      borderColor: "border-teal-500",
      textColor: "text-teal-950",
      iconColor: "text-teal-600",
      pillBg: "bg-teal-100 text-teal-900 border-teal-300",
      icon: Mountain,
    };
  }
  if (l.includes("plan modification") || l.includes("floorplan customisation") || l.includes("extension")) {
    return {
      barBg: "bg-gradient-to-r from-violet-50/90 via-violet-50/50 to-white",
      borderColor: "border-violet-500",
      textColor: "text-violet-950",
      iconColor: "text-violet-600",
      pillBg: "bg-violet-100 text-violet-900 border-violet-300",
      icon: Maximize2,
    };
  }
  if (l.includes("landscape") || l.includes("turnkey") || l.includes("driveway") || l.includes("paving") || l.includes("external")) {
    return {
      barBg: "bg-gradient-to-r from-emerald-50/90 via-emerald-50/50 to-white",
      borderColor: "border-emerald-500",
      textColor: "text-emerald-950",
      iconColor: "text-emerald-600",
      pillBg: "bg-emerald-100 text-emerald-900 border-emerald-300",
      icon: Home,
    };
  }
  if (l.includes("ceiling") || l.includes("structural")) {
    return {
      barBg: "bg-gradient-to-r from-slate-100/90 via-slate-50/50 to-white",
      borderColor: "border-slate-500",
      textColor: "text-slate-950",
      iconColor: "text-slate-700",
      pillBg: "bg-slate-200 text-slate-900 border-slate-300",
      icon: Layers,
    };
  }
  if (l.includes("electrical") || l.includes("air conditioning")) {
    return {
      barBg: "bg-gradient-to-r from-amber-50/90 via-amber-50/50 to-white",
      borderColor: "border-amber-500",
      textColor: "text-amber-950",
      iconColor: "text-amber-600",
      pillBg: "bg-amber-100 text-amber-900 border-amber-300",
      icon: Zap,
    };
  }
  if (l.includes("kitchen")) {
    return {
      barBg: "bg-gradient-to-r from-orange-50/90 via-orange-50/50 to-white",
      borderColor: "border-orange-500",
      textColor: "text-orange-950",
      iconColor: "text-orange-600",
      pillBg: "bg-orange-100 text-orange-900 border-orange-300",
      icon: Sparkles,
    };
  }
  if (l.includes("bathroom") || l.includes("ensuite")) {
    return {
      barBg: "bg-gradient-to-r from-cyan-50/90 via-cyan-50/50 to-white",
      borderColor: "border-cyan-500",
      textColor: "text-cyan-950",
      iconColor: "text-cyan-600",
      pillBg: "bg-cyan-100 text-cyan-900 border-cyan-300",
      icon: Droplets,
    };
  }
  if (l.includes("flooring")) {
    return {
      barBg: "bg-gradient-to-r from-stone-100/90 via-stone-50/50 to-white",
      borderColor: "border-stone-500",
      textColor: "text-stone-950",
      iconColor: "text-stone-700",
      pillBg: "bg-stone-200 text-stone-900 border-stone-300",
      icon: Layers,
    };
  }
  return {
    barBg: "bg-gradient-to-r from-amber-50/90 via-amber-50/50 to-white",
    borderColor: "border-amber-500",
    textColor: "text-amber-950",
    iconColor: "text-amber-600",
    pillBg: "bg-amber-100 text-amber-900 border-amber-300",
    icon: Sparkles,
  };
}
import type { FullQuote, SecondDwellingSelection } from "@/lib/quoting/quoteTypes";
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
  const t = tier.trim();
  const upper = t.toUpperCase();
  if (upper.includes("IP") || upper.includes("INVEST")) {
    return "IP Investor Pack Inclusions (Turnkey Ready)";
  }
  if (upper.includes("FHB") || upper.includes("START SMART") || upper.includes("FIRST HOME")) {
    return "FHB Start Smart Inclusions (First Home Buyer)";
  }
  if (upper.includes("H1") || upper.includes("SMART")) {
    return "H1 Smart Inclusions (2025)";
  }
  if (upper.includes("H3") || upper.includes("LUXURY")) {
    return "H3 Luxury Inclusions (2025)";
  }
  if (upper.includes("H2") || upper.includes("DESIGN")) {
    return "H2 Design Inclusions (2025)";
  }
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
    <div className="w-full relative overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center h-[270px] max-h-[270px] mb-2 flex-none">
      <img
        src={src}
        alt={design.facadeName || "Architectural Facade Render"}
        loading="eager"
        crossOrigin="anonymous"
        className="w-full h-full object-contain object-center"
        style={{
          imageRendering: "auto",
        }}
      />
      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-3.5 py-1.5 text-[11px] font-extrabold text-slate-950 shadow-sm border border-slate-200/80 z-20">
        <span>Selected Facade: {design.facadeName || "Classic"}</span>
      </div>
    </div>
  );
}

function getInitialFacadeSrc(design: FullQuote["design"]): string {
  if (design.isCustomFacade && design.facadeImageUrl) {
    return design.facadeImageUrl;
  }
  const facadeName = design.facadeName || "Classic";
  const housingType = getHousingTypeForDesign(design.designName, design.housingType);
  const isDouble = isDoubleStoreyDesign(
    design.designName,
    housingType,
    design.customSpec?.storeys,
  );
  const matched = findFacadeForDesign(facadeName, isDouble, housingType, design.designName || design.modelName);
  if (matched) {
    if (PRE_RENDERED_FACADES[matched.id]) {
      return PRE_RENDERED_FACADES[matched.id];
    }
    return matched.url;
  }
  return "/facades/classic-facade-single-stry.jpg";
}

function QuoteCoverFacadeHero({ design }: { design: FullQuote["design"] }) {
  const [src, setSrc] = React.useState<string>(() => getInitialFacadeSrc(design));

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
    <div className="relative w-full h-[250px] max-h-[250px] rounded-2xl overflow-hidden shadow-md border border-slate-200 bg-slate-100 flex items-center justify-center my-3 group p-2">
      <img
        src={displaySrc}
        alt={design.facadeName || "Architectural Facade Render"}
        loading="eager"
        crossOrigin="anonymous"
        className="w-full h-full object-contain object-center drop-shadow-md"
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
    <div className="w-full relative overflow-hidden bg-slate-100 flex items-center justify-center h-[215px] max-h-[215px] mb-2 flex-none">
      <img
        src={src}
        alt={secondDwelling?.facadeName || "Secondary Residence Architectural Facade"}
        loading="eager"
        crossOrigin="anonymous"
        className="w-full h-full object-cover object-center"
        style={{
          imageRendering: "auto",
        }}
      />
      <div className="absolute top-3 left-3 bg-white/95 px-2.5 py-1 text-[9.5px] font-bold text-slate-900 uppercase tracking-wider shadow-xs z-20">
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
        onError={() => setSrc("")}
        className="max-h-full max-w-full w-full h-full object-contain block mx-auto my-auto drop-shadow-sm transition-all"
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
  const rawDesc = (item.description || "").trim();
  const desc =
    rawDesc === "Custom client variation request" || rawDesc === "Client Custom Variation"
      ? ""
      : rawDesc;
  const nameLen = (item.name || "").length;
  // Extra allowance if title wraps onto 2 lines (> 48 chars)
  const nameExtra = nameLen > 48 ? 17 : 0;

  // Base row height with py-2.5 (20px) + 16.5px line-height + 1px border = 38px
  if (!desc) {
    return 38 + nameExtra;
  }
  const descLen = desc.length;
  if (descLen <= 65) return 55 + nameExtra;
  if (descLen <= 130) return 70 + nameExtra;
  if (descLen <= 195) return 85 + nameExtra;
  return 102 + nameExtra;
}

const SPEC_GROUP_HEADER_HEIGHT = 50;
// Page 1 budget: calibrated to actual DOM heights so pages stay strictly <= 1123px
const SPEC_PAGE_1_MAX_HEIGHT = 815;
// Continuation page budget
const SPEC_PAGE_CONT_MAX_HEIGHT = 830;

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
  const flexibleConnectionsCost = siteConditions.flexibleConnectionsRequired ? (siteConditions.flexibleConnectionsCost ?? 2500) : 0;

  // Site Overlay Reports (LHS)
  const bushfireReportCost = siteConditions.bushfireReportRequired ? (siteConditions.bushfireReportCost ?? 850) : 0;
  const floodReportCost = siteConditions.floodReportRequired ? (siteConditions.floodReportCost ?? 7600) : 0;
  const hydraulicReportCost = siteConditions.hydraulicReportRequired ? (siteConditions.hydraulicReportCost ?? 2600) : 0;
  const landslideReportCost = siteConditions.landslideReportRequired ? (siteConditions.landslideReportCost ?? 7000) : 0;
  const acousticReportCost = siteConditions.acousticReportRequired ? (siteConditions.acousticReportCost ?? 1200) : 0;
  const arboristReportCost = siteConditions.arboristReportRequired ? (siteConditions.arboristReportCost ?? 1100) : 0;
  // Sewer Main Running Through Block costs (Image 1)
  const sewerBosCost = siteConditions.sewerBosCouncilAppRequired
    ? (siteConditions.sewerBosCouncilAppCost !== undefined ? Number(siteConditions.sewerBosCouncilAppCost) : 1700)
    : 0;
  const sewerBridgingPiersCost = siteConditions.sewerBridgingPiersRequired
    ? (siteConditions.sewerBridgingPiersCost !== undefined ? Number(siteConditions.sewerBridgingPiersCost) : (Number(siteConditions.sewerBridgingPiersLm) || 1) * 1500)
    : 0;
  const sewerPotholingCost = siteConditions.sewerPotholingRequired
    ? (siteConditions.sewerPotholingCost !== undefined ? Number(siteConditions.sewerPotholingCost) : 4500)
    : 0;
  const isCctvActive = Boolean(siteConditions.sewerCctvInspectionRequired || siteConditions.cctvSewerReportRequired);
  const sewerCctvCost = isCctvActive
    ? (siteConditions.sewerCctvInspectionCost !== undefined ? Number(siteConditions.sewerCctvInspectionCost) : (siteConditions.cctvSewerReportCost !== undefined ? Number(siteConditions.cctvSewerReportCost) : 2500))
    : 0;

  // Site Overlay Allowances (RHS)
  const slabHeight = siteConditions.slabElevationMeters ?? 0.3;
  const calculatedSlabCost = Math.round(slabHeight * 270 * gfaM2);
  const floodCost = siteConditions.floodOverlayRequired
    ? (siteConditions.floodOverlayCost !== undefined && siteConditions.floodOverlayCost !== null && !isNaN(Number(siteConditions.floodOverlayCost))
        ? Math.max(0, Number(siteConditions.floodOverlayCost))
        : calculatedSlabCost)
    : 0;

  // Council & Statutory
  const councilDaCost = siteConditions.councilDaRequired ? (siteConditions.councilDaCost ?? 11000) : 0;
  const dualLivingCost = siteConditions.dualLivingInfrastructureRequired ? (siteConditions.dualLivingInfrastructureCost ?? 23000) : 0;
  const sedimentCost = Number(siteConditions.sedimentAssetProtectionCost) || 0;

  // Geotechnical Allowances (lump sum allowance, user editable)
  const trafficCost = (siteConditions.trafficControlRequired || (Number(siteConditions.trafficControlCost) > 0))
    ? (siteConditions.trafficControlCost !== undefined ? Number(siteConditions.trafficControlCost) : 6500)
    : 0;
  const pieringRate = siteConditions.siteType === "kdrb" ? 50 : siteConditions.siteType === "brownfield" ? 30 : 25;
  const pieringCost = (siteConditions.pieringCost !== undefined && !isNaN(Number(siteConditions.pieringCost)) && Number(siteConditions.pieringCost) > 0)
    ? Number(siteConditions.pieringCost)
    : (siteConditions.screwPieringRequired
        ? (siteConditions.screwPieringCost !== undefined && !isNaN(Number(siteConditions.screwPieringCost))
            ? Number(siteConditions.screwPieringCost)
            : Math.round(gfaM2 * pieringRate))
        : 0);
  const rockCost = Number(siteConditions.rockExcavationAllowance) || 0;
  const retainingCost = Number(siteConditions.retainingWallAllowance) || 0;

  const totalSiteAndStatutorySubtotal = pricing.siteCostsSubtotal + pricing.councilStatutorySubtotal;

  const isSplit = design.housingType === "Split Level" || (design.customSpec && design.customSpec.storeys === "split");
  const isDoubleStorey = isDoubleStoreyDesign(design.designName, design.housingType, design.customSpec?.storeys);
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
    ...(siteConditions.windRating && siteConditions.windRating !== "N1" && siteConditions.windRating !== "N2" || Number(siteConditions.windRatingCost) > 0
      ? [
          {
            id: "wind_rating",
            name: `Site Wind Rating Engineering Upgrade (${siteConditions.windRating || "N3"})`,
            description: `AS 4055 structural wind classification upgrade (${siteConditions.windRating || "N3"}) including upgraded tie-down rods, roof battens, bracing, and window wind load specification.`,
            qtyLabel: `1 House (${siteConditions.windRating || "N3"})`,
            amount:
              siteConditions.windRatingCost !== undefined && !isNaN(Number(siteConditions.windRatingCost))
                ? Number(siteConditions.windRatingCost)
                : siteConditions.windRating === "N3"
                ? 4000
                : siteConditions.windRating === "N4"
                ? 7500
                : siteConditions.windRating === "C1"
                ? 11000
                : siteConditions.windRating === "C2"
                ? 15500
                : 0,
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
    ...(siteConditions.floodOverlayRequired && floodCost > 0
      ? [
          {
            id: "flood_overlay",
            name: `Slab Elevation & Flood Pad Works (${slabHeight}m Elevation)`,
            description: `Engineered building pad elevation for minimum floor level compliance ($270 × ${slabHeight}m × ${gfaM2} m² GFA). (provisional allowance, subject to initial site reports)`,
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
    ...(isCctvActive
      ? [
          {
            id: "sewer_cctv_inspection",
            name: "CCTV - Checks sewer line for existing damage",
            description: "Robotic CCTV drainage camera inspection, connection depth verification & council asset check.",
            qtyLabel: "1 Inspection",
            amount: sewerCctvCost,
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
    ...(siteConditions.demolitionAsbestosRequired && siteConditions.kdrbDemolitionOption === "owner"
      ? [
          {
            id: "demolition_owner",
            name: "Existing House Demolition & Asbestos Removal",
            description: "Demolition and site clearing to be completed by owner prior to builder site start.",
            qtyLabel: "By Owner",
            amount: 0,
          },
        ]
      : siteConditions.demolitionAsbestosRequired && siteConditions.kdrbDemolitionOption !== "none"
      ? [
          {
            id: "demolition_asbestos",
            name: "House Demolition & Asbestos Removal Allowance",
            description: "Complete existing home demolition, licensed asbestos removal & site clearing.",
            qtyLabel: "1 Allowance",
            amount: Number(siteConditions.demolitionAsbestosCost ?? (isDoubleStorey ? 40000 : 32500)),
          },
        ]
      : []),
    ...(pieringCost > 0
      ? [
          {
            id: "piering_allowance",
            name: siteConditions.siteType === "kdrb"
              ? "Allowance for Screw Piering (KDRB Site)"
              : "Foundation Piering Allowance",
            description: "Allowance for piering if required, and subject to geotech report.",
            qtyLabel: "1 Allowance",
            amount: pieringCost,
          },
        ]
      : []),
    ...(rockCost > 0
      ? [
          {
            id: "rock_excavation",
            name: "Rock Excavation Allowance",
            description: "Hydraulic rock breaker allowance for sub-surface trenching (provisional allowance, subject to initial site reports).",
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
            description: "Concrete sleeper or masonry retaining wall structure allowance (provisional allowance, subject to initial site reports).",
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
            description: "Specialized material handling, crane truck offloading, spotters, or restricted access (provisional allowance, subject to initial site reports).",
            qtyLabel: "1 Allowance",
            amount: Number(siteConditions.materialHandlingAllowance),
          },
        ]
      : []),
    ...(Number(siteConditions.outOfZoneSurcharge) > 0
      ? [
          {
            id: "out_of_zone",
            name: "Out of Zone Surcharge",
            description: "Builder delivery and contractor travel allowance beyond standard operating zone (provisional allowance, subject to initial site reports).",
            qtyLabel: "1 Allowance",
            amount: Number(siteConditions.outOfZoneSurcharge),
          },
        ]
      : []),
    ...(Number(siteConditions.unknownSiteConditionsAllowance) > 0
      ? [
          {
            id: "unknown_site_conditions",
            name: "Unknown Site Conditions Allowance",
            description: "Provisional contingency allowance for unforeseen sub-surface or site conditions (provisional allowance, subject to initial site reports).",
            qtyLabel: "1 Allowance",
            amount: Number(siteConditions.unknownSiteConditionsAllowance),
          },
        ]
      : []),
    ...(trafficCost > 0
      ? [
          {
            id: "traffic_control",
            name: "Traffic Management Plan & Control Allowance",
            description: "Certified Traffic Guidance Scheme (TGS), spotters, safety barriers & signage allowance (provisional allowance, subject to initial site reports).",
            qtyLabel: "1 Allowance",
            amount: trafficCost,
          },
        ]
      : []),
    ...(siteConditions.sewerBosCouncilAppRequired
      ? [
          {
            id: "sewer_bos_council_app",
            name: "BOS Council Application",
            description: "Statutory Building Over Sewer (BOS) council application & engineering approvals.",
            qtyLabel: "1 Application",
            amount: sewerBosCost,
          },
        ]
      : []),
    ...(siteConditions.sewerBridgingPiersRequired
      ? [
          {
            id: "sewer_bridging_piers",
            name: "Bridging Piers Required for Building Over Underground Sewer",
            description: `Engineered concrete bridging piers spanning sewer line zone of influence (${siteConditions.sewerBridgingPiersLm || 1} lm @ $1,500/lm).`,
            qtyLabel: `${siteConditions.sewerBridgingPiersLm || 1} lm`,
            amount: sewerBridgingPiersCost,
          },
        ]
      : []),
    ...(siteConditions.sewerPotholingRequired
      ? [
          {
            id: "sewer_potholing",
            name: "Potholing - Mark out existing sewer or stormwater line",
            description: "Potholing to verify exact location, depth, and alignment of underground sewer infrastructure.",
            qtyLabel: "1 Service",
            amount: sewerPotholingCost,
          },
        ]
      : []),
    ...(!siteConditions.sewerBridgingPiersRequired && siteConditions.sewerBridgingRequired
      ? [
          {
            id: "sewer_bridging",
            name: "Sewer Line Bridging / Concrete Encasement Allowance",
            description: "Concrete encasement and footings bridging sewer zone of influence near/under proposed building pad.",
            qtyLabel: "1 Allowance",
            amount: Number(siteConditions.sewerBridgingCost || 4500),
          },
        ]
      : []),
  ];

  const activeSiteSchedule = [
    {
      label: "1. Inclusion / Selection Specification for Drafting",
      total: earthworksItems.reduce((s, it) => s + (Number(it.amount) || 0), 0),
      items: earthworksItems,
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
    ...(geotechnicalSiteItems.length > 0
      ? [
          {
            label: "4. Geotechnical & Site Allowances",
            total: geotechnicalSiteItems.reduce((s, it) => s + (Number(it.amount) || 0), 0),
            items: geotechnicalSiteItems,
          },
        ]
      : []),
  ];

  const isModPlan = !!design.isModifiedFloorplan || design.mode === "modified";
  const modPricingCalc = isModPlan ? calculateModifiedFloorplanPricing(design) : null;
  const modCostAdjustment = modPricingCalc ? modPricingCalc.totalCostAdjustment : 0;

  const variationGroups: SpecGroup[] = [];
  for (const cat of (pricing.categorySubtotals || [])) {
    const nonModAreaItems = (cat.items || []).filter(
      (it) => !it.id.startsWith("mod_area_")
    );
    if (nonModAreaItems.length === 0) continue;
    const catSubtotal = nonModAreaItems.reduce((sum, it) => {
      const amt =
        typeof it.subtotal === "number" && !isNaN(it.subtotal)
          ? it.subtotal
          : (Number(it.quantity) || 1) * (Number(it.unitRate) || 0);
      return sum + amt;
    }, 0);
    variationGroups.push({
      label: cat.label,
      total: catSubtotal,
      items: nonModAreaItems.map((it) => ({
        id: it.id,
        name: it.name,
        description: it.description || "",
        qtyLabel:
          (it.unitType as string) === "sqm" && it.quantity > 0
            ? `${it.quantity} m²`
            : it.unitType === "allowance"
            ? "Allowance"
            : it.unitRate === 0
            ? "$0.00 Variation"
            : it.quantity > 1
            ? `${it.quantity} × ${formatAud(it.unitRate)}`
            : "1 Item",
        amount:
          typeof it.subtotal === "number" && !isNaN(it.subtotal)
            ? it.subtotal
            : (Number(it.quantity) || 1) * (Number(it.unitRate) || 0),
      })),
    });
  }

  const totalVariationsAmount = variationGroups.reduce((s, c) => s + c.total, 0);
  const turnkeyPackagesCost = (pricing.landscapingCost || 0) + (!design.landscapingSelected ? (pricing.exposedDrivewayCost || 0) : 0);
  const totalVariationsAndPackagesAmount = totalVariationsAmount + turnkeyPackagesCost;
  const totalSpecAndVariations = totalSiteAndStatutorySubtotal + totalVariationsAndPackagesAmount + modCostAdjustment;

  const landscapingSpecGroup: SpecGroup | null = (pricing.landscapingCost !== 0 || design.landscapingSelected) ? {
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

  const planModificationsSpecGroup: SpecGroup | null =
    isModPlan && modPricingCalc && modPricingCalc.zones.some((z) => z.deltaM2 !== 0)
      ? {
          label: "Architectural Plan Modifications & Floorplan Customisations",
          total: modCostAdjustment,
          items: modPricingCalc.zones
            .filter((z) => z.deltaM2 !== 0)
            .map((z) => ({
              id: `mod_spec_${z.key}`,
              name: `${z.label} ${z.deltaM2 > 0 ? "Extension" : "Reduction"} (${z.deltaM2 > 0 ? `+${z.deltaM2.toFixed(2)}` : z.deltaM2.toFixed(2)} m²)`,
              description:
                z.key === "garageM2" && z.costAdjustment === 0 && z.deltaM2 > 0
                  ? `Structural floorplan alteration from standard brochure layout (${z.standardM2.toFixed(2)} m² standard baseline) to modified layout (${z.modifiedM2.toFixed(2)} m² — covered within standard 5.7m × 6.0m / 34.20 m² garage allowance).`
                  : `Structural floorplan alteration from standard brochure layout (${z.standardM2.toFixed(2)} m² standard baseline) to modified layout (${z.modifiedM2.toFixed(2)} m²).`,
              qtyLabel: `${z.deltaM2 > 0 ? "+" : ""}${z.deltaM2.toFixed(2)} m²`,
              amount: z.costAdjustment,
            })),
        }
      : null;

  const allSpecGroups: SpecGroup[] = [
    ...activeSiteSchedule,
    ...(landscapingSpecGroup ? [landscapingSpecGroup] : []),
    ...(standaloneDrivewayGroup ? [standaloneDrivewayGroup] : []),
    ...(planModificationsSpecGroup ? [planModificationsSpecGroup] : []),
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
    ? "Hudson Homes Pty Ltd. ABN: 49 163 189 071 • Builder’s Licence: 259372C"
    : "Hudson Homes (QLD) Pty Ltd. ABN: 92 623 431 685 • QBCC Licence: 15078318";

  const formattedSoilClass = (() => {
    const raw = (siteConditions.soilClass || "Class M").trim();
    return raw.toLowerCase().startsWith("class") ? raw : `Class ${raw}`;
  })();

  const shortInclusionLabel = (() => {
    const t = (design.specTier || "H2 Design").trim();
    const u = t.toUpperCase();
    if (u.includes("IP") || u.includes("INVEST")) return "IP Investor Pack";
    if (u.includes("FHB") || u.includes("START SMART") || u.includes("FIRST HOME")) return "FHB Start Smart";
    if (u.includes("H1") || u.includes("SMART")) return "H1 Smart";
    if (u.includes("H3") || u.includes("LUXURY")) return "H3 Luxury";
    if (u.includes("H2") || u.includes("DESIGN")) return "H2 Design";
    return t;
  })();

  return (
    <div
      className="quote-pdf-root light normal-mode text-slate-900 font-sans space-y-12 max-w-[210mm] mx-auto print:space-y-0"
      style={{ colorScheme: "light" }}
    >
      {/* ========================================================================= */}
      {/* PAGE 1: OFFICIAL MARKETING BUILDERS ESTIMATE COVER PAGE (NO FACADE IMAGE) */}
      {/* ========================================================================= */}
      <div
        data-testid="pdf-page-cover"
        className="quote-page bg-white w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] flex flex-col justify-between relative overflow-hidden shadow-2xl box-border print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always"
      >
        {/* Top-to-Middle Official Marketing Low-Poly Canopy, Stacked Logo & Script Hero Artwork */}
        <div className="relative w-full flex-none select-none">
          <img
            src="/brand/marketing-cover-hero.jpg"
            alt="Hudson Homes — Your New Home Builders Estimate"
            loading="eager"
            crossOrigin="anonymous"
            className="w-full h-auto block object-contain"
          />
          {/* Semantic / Screen-Reader & Automated Test Accessible Title Text */}
          <div className="sr-only">
            <h1>YOUR NEW HOME — Builders Estimate</h1>
            <p>COMPREHENSIVE ARCHITECTURAL TENDER &amp; SITE INVESTMENT BREAKDOWN</p>
            <span>Builders Estimate #{quote.quoteNumber || "MH678"}</span>
          </div>
        </div>

        {/* Lower Presentation & Architectural Metadata Section (Marketing First Page Layout) */}
        <div className="px-14 pb-12 pt-4 flex-1 flex flex-col justify-end">
          {/* Presented To & Site Address Columns — Clean Architectural Typography Without Big Boxes */}
          <div className="grid grid-cols-2 gap-12 mb-12">
            <div>
              <span
                className="text-[14px] font-black uppercase tracking-wider block mb-2"
                style={{ color: "#0099d8" }}
              >
                PRESENTED TO
              </span>
              <div className="text-xl font-black text-slate-950 leading-snug">
                {clientCombinedNames || "Valued Client"}
              </div>
              {(client.clientEmail || client.clientPhone) && (
                <div className="text-xs font-semibold text-slate-600 mt-1">
                  {[client.clientEmail, client.clientPhone].filter(Boolean).join(" · ")}
                </div>
              )}
            </div>

            <div>
              <span
                className="text-[14px] font-black uppercase tracking-wider block mb-2"
                style={{ color: "#0099d8" }}
              >
                SITE ADDRESS
              </span>
              <div className="text-base font-black text-slate-950 leading-snug">
                {client.siteAddress || "Site Address TBA"}
              </div>
              <div className="text-xs font-semibold text-slate-600 mt-1">
                {[client.lotNumber, cleanSuburb, quoteState, client.postcode].filter(Boolean).join(" ") || quoteStateFull}
              </div>
            </div>
          </div>

          {/* 3-Column Bottom Underlined Specification Strip — Evenly Spread Without Truncating Design Name */}
          <div className="grid grid-cols-12 gap-7 text-xs mb-10 items-end">
            <div className="col-span-5 border-b-[1.5px] border-slate-700 pb-2 flex items-baseline justify-between gap-2 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap shrink-0">
                Selected Design
              </span>
              <span className="font-black text-slate-950 text-[13px] leading-tight text-right">
                {effectiveDesignName}
              </span>
            </div>

            <div className="col-span-3 border-b-[1.5px] border-slate-700 pb-2 flex items-baseline justify-between gap-2 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap shrink-0">
                Facade Style
              </span>
              <span className="font-black text-slate-950 text-[13px] leading-tight text-right">
                {(design.facadeName || "Classic").replace(/\s*\(Standard Included\)/i, "")}
              </span>
            </div>

            <div className="col-span-4 border-b-[1.5px] border-slate-700 pb-2 flex items-baseline justify-between gap-2 min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap shrink-0">
                Inclusion Tier
              </span>
              <span
                className="font-black text-slate-950 text-[13px] leading-tight text-right"
                title={formatInclusionTierTitle(design.specTier)}
              >
                {shortInclusionLabel}
              </span>
            </div>
          </div>

          {/* Subtle Cover Footer */}
          <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-[9.5px] text-slate-500">
            <div>{footerLicenceLine}</div>
            <div className="font-mono font-semibold text-slate-600">
              Estimate #{quote.quoteNumber || "MH678"} · Issued {formattedCreatedDate}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 2: EXECUTIVE ESTIMATE & CONSTRUCTION COST SUMMARY                     */}
      {/* ========================================================================= */}
      <div className="quote-page bg-white w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] px-12 py-10 flex flex-col justify-between relative overflow-hidden shadow-2xl box-border print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always">
        <div>
          {/* Top-Right Stacked Hudson Homes Logo (Marketing Page 2 Header) */}
          <div className="flex items-start justify-end mb-2">
            <img
              src="/brand/hudson-stacked-logo.png"
              alt="Hudson Homes"
              loading="eager"
              crossOrigin="anonymous"
              className="h-20 w-auto object-contain"
            />
          </div>

          {/* Owner & Estimate Details (Marketing Underlined Architectural Form Layout) */}
          <div className="mb-8">
            <div
              className="text-[17px] font-black uppercase tracking-wide mb-3 flex items-center gap-2"
              style={{ color: "#0099d8" }}
            >
              <FileText className="h-4.5 w-4.5 text-[#0099d8] shrink-0" />
              <span>OWNER &amp; ESTIMATE DETAILS</span>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Row 1: Owner/s Details & New Home Consultant */}
              <div className="grid grid-cols-2 gap-10">
                <div className="border-b border-slate-300 pb-1.5 flex items-baseline justify-between gap-3">
                  <span className="text-slate-500 font-bold uppercase text-[11px] tracking-wider whitespace-nowrap flex-none">Owner/s Details</span>
                  <span className="font-black text-slate-950 text-xs sm:text-[13px] text-right break-words max-w-[65%] leading-snug">
                    {clientCombinedNames || "Client Name"}
                  </span>
                </div>
                <div className="border-b border-slate-300 pb-1.5 flex items-baseline justify-between gap-3">
                  <span className="text-slate-500 font-bold uppercase text-[11px] tracking-wider whitespace-nowrap flex-none">New Home Consultant</span>
                  <span className="font-black text-slate-950 text-xs sm:text-[13px] text-right break-words max-w-[65%] leading-snug">
                    {client.consultantName || "Morgan Hales"}
                    {client.consultantPhone ? ` · ${client.consultantPhone}` : ""}
                  </span>
                </div>
              </div>

              {/* Row 2: Proposed Site Address */}
              <div className="border-b border-slate-300 pb-1.5 flex items-baseline justify-between gap-4">
                <span className="text-slate-500 font-bold uppercase text-[11px] tracking-wider whitespace-nowrap flex-none">Proposed Site Address</span>
                <span className="font-black text-slate-950 text-xs sm:text-[13px] text-right break-words max-w-[75%] leading-snug">
                  {siteAddressFull}
                </span>
              </div>

              {/* Row 3: Estimate No/ Version & Estimate Valid To */}
              <div className="grid grid-cols-2 gap-10 pt-0.5">
                <div className="border-b border-slate-300 pb-1.5 flex items-baseline justify-between gap-3">
                  <span className="text-slate-500 font-bold uppercase text-[11px] tracking-wider whitespace-nowrap flex-none">Estimate No/ Version</span>
                  <span className="font-black text-slate-950 font-mono text-xs sm:text-[13px] text-right">
                    {quote.quoteNumber || "MH678"} / Version {client.estimateVersion || 1}
                  </span>
                </div>
                <div className="border-b border-slate-300 pb-1.5 flex items-baseline justify-between gap-3">
                  <span className="text-slate-500 font-bold uppercase text-[11px] tracking-wider whitespace-nowrap flex-none">Estimate Valid To</span>
                  <span className="font-black text-slate-950 font-mono text-xs sm:text-[13px] text-right">
                    {formattedValidDate} (14-Day Validity)
                  </span>
                </div>
              </div>

              {/* Row 4: Consultant Notes */}
              <div className="border-b border-slate-300 pb-1.5 flex items-baseline justify-between gap-4">
                <span className="text-slate-500 font-bold uppercase text-[11px] tracking-wider whitespace-nowrap flex-none">Consultant Notes</span>
                <span className="font-semibold text-slate-800 text-right break-words max-w-[75%] leading-snug">
                  {client.notes || `${client.consultantOffice || "Display Centre"} · Issued ${formattedCreatedDate}`}
                </span>
              </div>
            </div>
          </div>

          {/* Itemized Construction Cost Summary Table (Marketing Page 2 Table Design) */}
          <div className="mb-7">
            <div
              className="text-[17px] font-black uppercase tracking-wide mb-3 flex items-center gap-2"
              style={{ color: "#0099d8" }}
            >
              <Layers className="h-4.5 w-4.5 text-[#0099d8] shrink-0" />
              <span>ESTIMATED CONSTRUCTION COST SUMMARY</span>
            </div>

            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-white uppercase text-[11.5px] font-black tracking-wider bg-slate-900 border-b-2 border-[#0099d8]">
                  <th className="py-2.5 px-4 text-left text-white">DESCRIPTION</th>
                  <th className="py-2.5 px-4 text-right w-44 text-white">AMOUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 border-b border-slate-300">
                {/* Base House / Architectural Floorplan */}
                {(() => {
                  const isMod = !!design.isModifiedFloorplan || design.mode === "modified";
                  const modCalc = isMod ? calculateModifiedFloorplanPricing(design) : null;
                  const stdBaselinePrice = isMod
                    ? (modCalc ? modCalc.standardBasePrice : Number(design.standardBasePrice) || Number(pricing.baseHousePrice) || 0)
                    : (Number(pricing.baseHousePrice) || Number(design.basePrice) || Number(design.standardBasePrice) || 0);

                  return (
                    <tr className="bg-white">
                      <td className="py-3 px-4">
                        <div className="text-slate-950 font-black text-[13.5px] sm:text-sm">
                          {design.mode === "standard" || isMod
                            ? `${effectiveDesignName} with ${formatInclusionTierTitle(design.specTier)}`
                            : `Custom Architectural Floorplan (${design.customSpec?.storeys === "double" ? "Two" : "Single"} Storey)`}
                        </div>
                        <div className="text-[11.5px] text-slate-600 mt-0.5">
                          {isMod && modCalc
                            ? `Standard brochure baseline ${modCalc.standardTotalM2.toFixed(2)} m2 (${(modCalc.standardTotalM2 * 0.107639).toFixed(1)} sq) · Modified Total Area ${modCalc.modifiedTotalM2.toFixed(2)} m2`
                            : `Living area ${totalAreaM2} m2 (${(totalAreaM2 * 0.107639).toFixed(1)} sq) · GFA Platform ${pricing.gfaM2} m2`}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-950 text-sm">
                        {formatAud(stdBaselinePrice)}
                      </td>
                    </tr>
                  );
                })()}

                {/* Facade Surcharge if > 0 */}
                {pricing.facadePrice > 0 && (
                  <tr className="bg-white">
                    <td className="py-2.5 px-4">
                      <div className="font-black text-slate-950 text-[13.5px] sm:text-sm">
                        Selected Facade Upgrade: {design.facadeName}
                      </div>
                      {design.isCustomFacade && design.customFacadeDescription && (
                        <div className="text-[11.5px] text-slate-600 mt-0.5">
                          {design.customFacadeDescription}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-black text-slate-950 text-sm">
                      +{formatAud(pricing.facadePrice)}
                    </td>
                  </tr>
                )}

                {/* Builder Promotion in Marketing's Sage Green Highlight */}
                {pricing.promotionsDiscount > 0 && (
                  <tr className="bg-emerald-50/80 border-l-4 border-emerald-500">
                    <td className="py-3 px-4">
                      <div className="font-black text-emerald-950 text-[13.5px] sm:text-sm">
                        {pricing.promotionName || "Hudson Special Builder Promotion"}
                      </div>
                      <div className="text-[11.5px] text-emerald-800 mt-0.5">
                        Automated builder promotion applied to base house price
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-700 text-sm">
                      -{formatAud(pricing.promotionsDiscount)}
                    </td>
                  </tr>
                )}

                {/* Plan Modifications & Architectural Area Adjustments */}
                {isModPlan && modPricingCalc && modCostAdjustment !== 0 && (
                  <tr className="bg-violet-50/70 border-l-4 border-violet-500">
                    <td className="py-3 px-4">
                      <div className="font-black text-slate-950 text-[13.5px] sm:text-sm">
                        Plan Modifications &amp; Architectural Area Adjustments (Altered: {modPricingCalc.modifiedTotalM2.toFixed(2)} m2):
                      </div>
                      <div className="text-[11.5px] text-slate-600 mt-0.5">
                        Structural floorplan alterations to standard brochure baseline layout ({modPricingCalc.zones.filter((z) => z.deltaM2 !== 0).length} modified zone{modPricingCalc.zones.filter((z) => z.deltaM2 !== 0).length === 1 ? "" : "s"} — see Specification Schedule)
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-950 text-sm">
                      {modCostAdjustment >= 0
                        ? `+${formatAud(modCostAdjustment)}`
                        : `-${formatAud(Math.abs(modCostAdjustment))}`}
                    </td>
                  </tr>
                )}

                {/* 2nd Dwelling / Auxiliary Unit if selected */}
                {design.hasSecondDwelling && design.secondDwelling?.enabled && (
                  <tr className="bg-cyan-50/70 border-l-4 border-cyan-500">
                    <td className="py-3 px-4">
                      <div className="font-black text-slate-950 text-[13.5px] sm:text-sm">
                        2nd Dwelling / Auxiliary Home ({design.secondDwelling.designName} · {design.secondDwelling.designM2} m2):
                      </div>
                      <div className="text-[11.5px] text-slate-600 mt-0.5">
                        {design.secondDwelling.specTier} • {design.secondDwelling.facadeName} Facade • Architectural layout on Page 4
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-950 text-sm">
                      +{formatAud((Number(design.secondDwelling.basePrice) || 0) + (Number(design.secondDwelling.facadePrice) || 0))}
                    </td>
                  </tr>
                )}

                {/* Standalone Driveway Row (Matching Marketing Page 2) */}
                {pricing.exposedDrivewayCost > 0 && !design.landscapingSelected && (
                  <tr className="bg-white">
                    <td className="py-3 px-4">
                      <div className="font-black text-slate-950 text-[13.5px] sm:text-sm">
                        Exposed Aggregate Concrete Driveway &amp; Porch Path ({design.exposedDrivewayM2 || 55} m2):
                      </div>
                      <div className="text-[11.5px] text-slate-600 mt-0.5">
                        Exposed aggregate concrete paving from council crossover to double garage and front entry porch
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-950 text-sm">
                      +{formatAud(pricing.exposedDrivewayCost)}
                    </td>
                  </tr>
                )}

                {/* Turnkey Landscaping Package Row */}
                {(pricing.landscapingCost !== 0 || design.landscapingSelected) && (
                  <tr className="bg-emerald-50/40 border-l-4 border-emerald-500">
                    <td className="py-3 px-4">
                      <div className="font-black text-slate-950 text-[13.5px] sm:text-sm">
                        Turnkey Landscaping &amp; Paving Package ({design.landscapingLandSize || 450} m2 Lot):
                      </div>
                      <div className="text-[11.5px] text-slate-600 mt-0.5">
                        Detailed in Advanced Estimate Specification schedule
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-950 text-sm">
                      {pricing.landscapingCost < 0
                        ? `-${formatAud(Math.abs(pricing.landscapingCost))}`
                        : pricing.landscapingCost === 0
                        ? "INCLUDED"
                        : `+${formatAud(pricing.landscapingCost)}`}
                    </td>
                  </tr>
                )}

                {/* Site Specific Earthworks, Engineering & Statutory Requirements */}
                {totalSiteAndStatutorySubtotal > 0 && (
                  <tr className="bg-sky-50/30">
                    <td className="py-3 px-4">
                      <div className="font-black text-slate-950 text-[13.5px] sm:text-sm">
                        Site Specific Earthworks, Engineering &amp; Statutory Requirements:
                      </div>
                      <div className="text-[11.5px] text-slate-600 mt-0.5">
                        Detailed in Advanced Estimate Specification schedule ({formattedSoilClass}, {siteConditions.fallMeters || 0} m Fall, {siteConditions.councilRegion || "Local Council"})
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-950 text-sm">
                      +{formatAud(totalSiteAndStatutorySubtotal)}
                    </td>
                  </tr>
                )}

                {/* Estimate Variations & Custom Upgrades */}
                {(totalVariationsAmount !== 0 || variationGroups.some((g) => g.items.length > 0)) && (
                  <tr className="bg-amber-50/30">
                    <td className="py-3 px-4">
                      <div className="font-black text-slate-950 text-[13.5px] sm:text-sm">
                        Estimate Variations &amp; Custom Upgrades:
                      </div>
                      <div className="text-[11.5px] text-slate-600 mt-0.5">
                        Detailed in Advanced Estimate Specification schedule
                        {variationGroups.flatMap((g) => g.items).length <= 4 &&
                          variationGroups.flatMap((g) => g.items).length > 0 && (
                            <span className="block text-[10.5px] text-slate-500 mt-0.5">
                              {variationGroups
                                .flatMap((g) => g.items)
                                .map((it) => it.name)
                                .join(" · ")}
                            </span>
                          )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-950 text-sm">
                      {totalVariationsAmount > 0
                        ? `+${formatAud(totalVariationsAmount)}`
                        : totalVariationsAmount < 0
                        ? `-${formatAud(Math.abs(totalVariationsAmount))}`
                        : "$0"}
                    </td>
                  </tr>
                )}

                {/* Total Cost Line (Executive Midnight Gradient Bar with Gold Accent) */}
                <tr className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white border-t-2 border-amber-400">
                  <td className="py-3.5 px-4 uppercase tracking-wider font-black text-xs sm:text-[13px] text-white">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                      <span>TOTAL ESTIMATED BUILDERS INVESTMENT (INC. GST)</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right text-lg sm:text-xl font-black text-amber-300 font-mono tracking-tight">
                    {formatAud(pricing.grossEstimatedInvestment)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Executive Estimate Notice (Clean Unboxed Marketing Typography) */}
          <div className="text-xs text-slate-700 leading-relaxed space-y-2 pt-1">
            <div className="font-extrabold text-slate-900 text-xs">Executive Estimate Notice:</div>
            <p className="text-[11.5px] text-slate-700">
              Thank you for the opportunity to present this Builders Estimate for your new Hudson home. This quotation remains valid for 14 days from the date of issue.
            </p>
            <p className="text-[10.5px] text-slate-600 italic">
              *** This document represents a preliminary Builders Estimate and is subject to geotechnical soil classification, registered contour survey, and developer covenant approval. ***
            </p>
          </div>
        </div>

        {/* Page 2 Marketing Footer with Customer Initial Box */}
        <div className="pt-4 flex items-center justify-between text-[9.5px] text-slate-600">
          <div>{footerLicenceLine}</div>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1.5 rounded-xs flex items-center gap-2.5 bg-slate-100 border border-slate-300">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Customer Initial</span>
              <div className="bg-white w-20 h-5 border border-slate-200" />
            </div>
            <div className="font-mono text-[9px] text-slate-400">Page 2 of {totalPages}</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 3: DEDICATED ARCHITECTURAL FACADE RENDER & MAXIMIZED FLOORPLAN       */}
      {/* ========================================================================= */}
      <div className="quote-page bg-white w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] px-12 py-10 flex flex-col justify-between relative overflow-hidden shadow-2xl box-border print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always">
        <div className="flex-1 flex flex-col min-h-0">
          {/* Page 3 Header — Clean without duplicate Selected Facade blue pill */}
          <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2 mb-1.5 flex-none">
            <div>
              <div
                className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
                style={{ color: "#0099d8" }}
              >
                <Home className="h-3.5 w-3.5 text-[#0099d8] shrink-0" />
                <span>ARCHITECTURAL ELEVATION &amp; FLOORPLAN SPECIFICATIONS</span>
              </div>
              <h2 className="text-2xl sm:text-[24px] font-black text-slate-950 tracking-tight uppercase mt-0.5 leading-tight">
                {effectiveDesignName || (design.mode === "standard" ? "HUDSON HOMES ARCHITECTURAL PLAN" : "CUSTOM ARCHITECTURAL FLOORPLAN")}
                {design.specTier ? ` - ${formatInclusionTierTitle(design.specTier).replace(/\s*\(\d{4}\)/, "").toUpperCase()}` : ""}
              </h2>
              {design.widthM && design.lengthM && (
                <div className="text-[11px] text-slate-600 font-semibold mt-0.5">
                  Dimensions: {String(design.widthM).replace(/m+$/i, "")}m wide × {String(design.lengthM).replace(/m+$/i, "")}m deep
                </div>
              )}
            </div>
            <div className="text-right flex-none bg-slate-50 border border-slate-200/90 rounded-sm px-3 py-1">
              <span className="text-[9.5px] font-bold text-slate-500 block uppercase tracking-wider">TOTAL AREA</span>
              <span className="text-sm sm:text-[15px] font-black text-slate-950 block">
                {totalAreaM2} M² ({(totalAreaM2 * 0.107639).toFixed(1)} SQ)
              </span>
            </div>
          </div>

          {/* Ultra-Compact Single-Line Area Schedule Strip Directly Above Facade Image */}
          {(() => {
            const modCalc = calculateModifiedFloorplanPricing(design);
            const activeZones = modCalc.zones.filter((z) => z.modifiedM2 > 0 || z.deltaM2 !== 0);
            const shortZoneLabel = (label: string) => {
              const l = label.replace(" Area", "").replace(" (Optional)", "").trim();
              if (/lower ground/i.test(l)) return "Lower";
              if (/ground floor/i.test(l)) return "Ground";
              if (/upper level|first floor/i.test(l)) return "Upper";
              return l;
            };
            return (
              <div className="flex items-center justify-between gap-2 text-[9.5px] py-1 mb-1.5 px-2.5 bg-slate-50/90 border border-slate-200 rounded-xs flex-none leading-tight">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                  <span className="text-slate-500 font-extrabold uppercase text-[9px] tracking-wider shrink-0">
                    Areas:
                  </span>
                  {activeZones.map((z, idx) => (
                    <span key={z.key} className="inline-flex items-baseline gap-0.5 whitespace-nowrap">
                      {idx > 0 && <span className="text-slate-300 mr-0.5">·</span>}
                      <span className="text-slate-600 font-medium">{shortZoneLabel(z.label)}</span>
                      <strong className="font-black text-slate-950 ml-0.5">{z.modifiedM2.toFixed(1)}m²</strong>
                      {z.deltaM2 !== 0 && (
                        <span className="text-[8px] font-bold text-amber-700">
                          ({z.deltaM2 > 0 ? `+${z.deltaM2.toFixed(1)}` : z.deltaM2.toFixed(1)})
                        </span>
                      )}
                    </span>
                  ))}
                </div>
                <span className="inline-flex items-baseline gap-1 whitespace-nowrap bg-white px-1.5 py-0.5 rounded-xs border border-slate-200 shrink-0">
                  <span className="text-slate-500 uppercase text-[8.5px] font-bold">Total</span>
                  <strong className="font-black text-slate-950 text-[10px]">{totalAreaM2.toFixed(1)}m²</strong>
                </span>
              </div>
            );
          })()}

          {/* 1. Chosen Facade Render */}
          <QuoteFacadeViewer design={design} />

          {/* 2. 4-Column Key Specs Strip (Clean, Crisp Cards with Subtle Top Accent) */}
          <div className="grid grid-cols-4 gap-3 py-1.5 mb-1.5 flex-none">
            <div className="bg-slate-50 border border-slate-200/90 border-t-2 border-t-[#0099d8] rounded-sm py-1.5 px-2 text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Bedrooms</span>
              <span className="text-sm sm:text-base font-black text-slate-950 block">
                {design.beds || (design as any).bedrooms || 4} Beds
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200/90 border-t-2 border-t-cyan-600 rounded-sm py-1.5 px-2 text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Bathrooms</span>
              <span className="text-sm sm:text-base font-black text-slate-950 block">
                {design.baths || (design as any).bathrooms || 2} Baths
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200/90 border-t-2 border-t-indigo-600 rounded-sm py-1.5 px-2 text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Garage</span>
              <span className="text-sm sm:text-base font-black text-slate-950 block">
                {design.cars || (design as any).garage || 2} Cars
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200/90 border-t-2 border-t-emerald-600 rounded-sm py-1.5 px-2 text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">GFA Platform</span>
              <span className="text-sm sm:text-base font-black text-slate-950 block">
                {pricing.gfaM2} m²
              </span>
            </div>
          </div>

          {/* 3. Architectural Floorplan Layout Drawing (Maximized in Crisp Bordered Frame) */}
          <div className="flex-1 w-full border border-slate-300 rounded-sm shadow-xs p-2 bg-white flex items-center justify-center overflow-hidden mt-auto">
            <QuoteFloorplanViewer design={design} />
          </div>
        </div>

        {/* Page 3 Footer */}
        <div className="pt-3 flex items-center justify-between text-[9.5px] text-slate-600 flex-none mt-2 border-t border-slate-200">
          <div>{footerLicenceLine}</div>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1.5 rounded-xs flex items-center gap-2.5 bg-slate-100 border border-slate-300">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Customer Initial</span>
              <div className="bg-white w-20 h-5 border border-slate-200" />
            </div>
            <div className="font-mono text-[9px] text-slate-400">Page 3 of {totalPages}</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 4 (OPTIONAL): 2ND DWELLING / GRANNY FLAT ARCHITECTURAL FLOORPLAN      */}
      {/* ========================================================================= */}
      {hasSecondDwelling && secondDwelling && (
        <div className="quote-page bg-white w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] px-12 py-10 flex flex-col justify-between relative overflow-hidden shadow-2xl box-border print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always">
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2 mb-1.5 flex-none">
              <div>
                <div
                  className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
                  style={{ color: "#0099d8" }}
                >
                  <Building2 className="h-3.5 w-3.5 text-[#0099d8] shrink-0" />
                  <span>2ND DWELLING / AUXILIARY RESIDENCE ARCHITECTURAL SPECIFICATION</span>
                </div>
                <h2 className="text-2xl sm:text-[24px] font-black text-slate-950 uppercase mt-0.5 leading-tight">
                  {secondDwelling.designName} - {secondDwelling.specTier}
                </h2>
                {secondDwelling.widthM && secondDwelling.lengthM && (
                  <div className="text-[11px] text-slate-600 font-semibold mt-0.5">
                    Dimensions: {String(secondDwelling.widthM).replace(/m+$/i, "")}m wide × {String(secondDwelling.lengthM).replace(/m+$/i, "")}m deep
                  </div>
                )}
              </div>
              <div className="text-right flex-none bg-slate-50 border border-slate-200/90 rounded-sm px-3 py-1">
                <span className="text-[9.5px] font-bold text-slate-500 block uppercase tracking-wider">2ND DWELLING AREA</span>
                <span className="text-sm sm:text-[15px] font-black text-slate-950 block">
                  {secondDwelling.designM2} M² ({(secondDwelling.designM2 * 0.107639).toFixed(1)} SQ)
                </span>
              </div>
            </div>

            {/* Ultra-Compact Single-Line Area Schedule Row */}
            <div className="flex items-center justify-between gap-2 text-[10px] py-1 mb-1.5 px-2.5 bg-slate-50/90 border border-slate-200 rounded-xs flex-none">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span className="text-slate-500 font-extrabold uppercase text-[9.5px] tracking-wider">Areas:</span>
                <span>
                  <span className="text-slate-600 font-medium">Living </span>
                  <strong className="font-black text-slate-950">
                    {(secondDwelling.modifiedAreas?.livingM2 || secondDwelling.standardAreas?.livingM2 || Math.round(secondDwelling.designM2 * 0.85)).toFixed(1)}m²
                  </strong>
                </span>
                <span className="text-slate-300">·</span>
                <span>
                  <span className="text-slate-600 font-medium">Porch / Outdoor </span>
                  <strong className="font-black text-slate-950">
                    {(secondDwelling.modifiedAreas?.porchM2 || secondDwelling.standardAreas?.porchM2 || Math.round(secondDwelling.designM2 * 0.15)).toFixed(1)}m²
                  </strong>
                </span>
              </div>
              <span className="inline-flex items-baseline gap-1 whitespace-nowrap bg-white px-1.5 py-0.5 rounded-xs border border-slate-200">
                <span className="text-slate-500 uppercase text-[9px] font-bold">Total </span>
                <strong className="font-black text-slate-950 text-[10.5px]">{secondDwelling.designM2.toFixed(1)}m²</strong>
              </span>
            </div>

            {/* 1. Chosen Facade Render for Secondary Dwelling */}
            <QuoteSecondFacadeViewer secondDwelling={secondDwelling} />

            {/* 2. 4-Column Key Configuration */}
            <div className="grid grid-cols-4 gap-3 py-1.5 mb-1.5 flex-none">
              <div className="bg-slate-50 border border-slate-200/90 border-t-2 border-t-[#0099d8] rounded-sm py-1.5 px-2 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Bedrooms</span>
                <span className="text-sm sm:text-base font-black text-slate-950 block">{secondDwelling.beds || 2} Beds</span>
              </div>
              <div className="bg-slate-50 border border-slate-200/90 border-t-2 border-t-cyan-600 rounded-sm py-1.5 px-2 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Bathrooms</span>
                <span className="text-sm sm:text-base font-black text-slate-950 block">{secondDwelling.baths || 1} Bath</span>
              </div>
              <div className="bg-slate-50 border border-slate-200/90 border-t-2 border-t-indigo-600 rounded-sm py-1.5 px-2 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Garage</span>
                <span className="text-sm sm:text-base font-black text-slate-950 block">{secondDwelling.cars || 0} Cars</span>
              </div>
              <div className="bg-slate-50 border border-slate-200/90 border-t-2 border-t-emerald-600 rounded-sm py-1.5 px-2 text-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Dwelling Type</span>
                <span className="text-sm sm:text-base font-black text-slate-950 block break-words leading-tight">{secondDwelling.housingType}</span>
              </div>
            </div>

            {/* 3. Floorplan Layout Drawing (Maximized in Crisp Bordered Frame) */}
            <div className="flex-1 w-full border border-slate-300 rounded-sm shadow-xs p-2 bg-white flex items-center justify-center overflow-hidden mt-auto">
              <QuoteSecondFloorplanViewer secondDwelling={secondDwelling} />
            </div>
          </div>

          {/* Page 4 Footer */}
          <div className="pt-3 flex items-center justify-between text-[9.5px] text-slate-600 flex-none mt-2 border-t border-slate-200">
            <div>{footerLicenceLine}</div>
            <div className="flex items-center gap-4">
              <div className="px-3 py-1.5 rounded-xs flex items-center gap-2.5 bg-slate-100 border border-slate-300">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Customer Initial</span>
                <div className="bg-white w-20 h-5 border border-slate-200" />
              </div>
              <div className="font-mono text-[9px] text-slate-400">Page 4 of {totalPages}</div>
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
            className="quote-page bg-white w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] px-12 py-10 flex flex-col justify-between relative overflow-hidden shadow-2xl box-border print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always"
          >
            <div>
              {/* Spec Page Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-800 pb-3 mb-2.5">
                <div>
                  <div
                    className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
                    style={{ color: "#0099d8" }}
                  >
                    <PackageCheck className="h-3.5 w-3.5 text-[#0099d8] shrink-0" />
                    <span>
                      {isFirstSpecPage
                        ? "SITE ENGINEERING, STATUTORY & VARIATIONS SCHEDULE"
                        : "SPECIFICATION VARIATIONS & UPGRADES (CONTINUED)"}
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-[25px] font-black text-slate-950 uppercase tracking-tight mt-0.5">
                    {isFirstSpecPage
                      ? "ADVANCED ESTIMATE SPECIFICATION"
                      : `ADVANCED ESTIMATE SPECIFICATION (PAGE ${pageIdx + 1})`}
                  </h2>
                </div>
                <div className="text-right bg-slate-50 border border-slate-200/90 rounded-sm px-3.5 py-1.5 flex-none">
                  <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-bold">
                    {isFirstSpecPage && specPages.length === 1
                      ? "SPECIFICATION & VARIATIONS TOTAL"
                      : isFirstSpecPage
                      ? "SPECIFICATION & VARIATIONS TOTAL"
                      : "PAGE SUBTOTAL"}
                  </span>
                  <span className="text-lg font-black text-slate-950 block mt-0.5 font-mono">
                    {(() => {
                      const displayTotal = isFirstSpecPage
                        ? totalSpecAndVariations
                        : pageGroups.reduce((s, g) => s + g.total, 0);
                      return displayTotal > 0
                        ? `+${formatAud(displayTotal)}`
                        : displayTotal < 0
                        ? `-${formatAud(Math.abs(displayTotal))}`
                        : "$0";
                    })()}
                  </span>
                </div>
              </div>

              {/* Single-Line Site Metadata Strip */}
              <div className="flex items-center justify-between text-xs py-2 px-4 mb-3.5 bg-slate-50 border border-slate-200/90 rounded-sm text-slate-800">
                <div>
                  <span className="font-bold text-slate-500 uppercase text-[10.5px]">Council: </span>
                  <span className="font-black text-slate-950">{siteConditions.councilRegion || "Standard Jurisdiction"}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase text-[10.5px]">Soil: </span>
                  <span className="font-black text-slate-950">{formattedSoilClass}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase text-[10.5px]">Topography Fall: </span>
                  <span className="font-black text-slate-950">{siteConditions.fallMeters ?? 0}m</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 uppercase text-[10.5px]">Building Pad: </span>
                  <span className="font-black text-slate-950">{pricing.gfaM2} m² GFA</span>
                </div>
              </div>

              {/* Specification Tables (Dynamic Category Brand Themes & Enlarged Item Titles) */}
              <div className="space-y-4">
                {pageGroups.map((group) => {
                  const theme = getCategoryTheme(group.label);
                  const IconComponent = theme.icon;
                  return (
                    <div key={group.label} className="bg-white">
                      <div
                        className={`px-3.5 py-2 flex justify-between items-center text-[12px] font-black uppercase tracking-wider border-l-[5px] ${theme.borderColor} ${theme.barBg} border-y border-r border-slate-200/80 rounded-r-xs`}
                      >
                        <div className="flex items-center gap-2">
                          <IconComponent className={`h-4 w-4 ${theme.iconColor} shrink-0`} />
                          <span className={theme.textColor}>{group.label}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-black border ${theme.pillBg}`}>
                          {group.total === 0
                            ? "INCLUDED"
                            : group.total < 0
                            ? `-${formatAud(Math.abs(group.total))}`
                            : `+${formatAud(group.total)}`}
                        </span>
                      </div>
                      <table className="w-full text-xs border-collapse">
                        <tbody className="divide-y divide-slate-200 border-b border-slate-200">
                          {group.items.map((it) => (
                            <tr key={it.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-4">
                                <div className="font-black text-slate-950 text-[13.5px] leading-snug tracking-tight">
                                  {it.name}
                                </div>
                                {it.description &&
                                  it.description.trim() &&
                                  it.description !== "Custom client variation request" &&
                                  it.description !== "Client Custom Variation" && (
                                    <div className="text-[11.5px] text-slate-600 mt-0.5 leading-snug">
                                      {it.description}
                                    </div>
                                  )}
                              </td>
                              <td className="py-2.5 px-3 text-center w-36 flex-none text-[11.5px] text-slate-700 font-semibold font-mono">
                                {it.qtyLabel}
                              </td>
                              <td className="py-2.5 px-4 text-right font-black w-32 text-xs flex-none text-slate-950 font-mono">
                                {it.amount === 0
                                  ? "INCLUDED"
                                  : it.amount < 0
                                  ? `-${formatAud(Math.abs(it.amount))}`
                                  : `+${formatAud(it.amount)}`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Spec Page Footer */}
            <div className="pt-3 flex items-center justify-between text-[9.5px] text-slate-600 border-t border-slate-200">
              <div>{footerLicenceLine}</div>
              <div className="flex items-center gap-4">
                <div className="px-3 py-1.5 rounded-xs flex items-center gap-2.5 bg-slate-100 border border-slate-300">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Customer Initial</span>
                  <div className="bg-white w-20 h-5 border border-slate-200" />
                </div>
                <div className="font-mono text-[9px] text-slate-400">
                  Page {pageNumber} of {totalPages}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* ========================================================================= */}
      {/* PAGE 6: STANDARD INCLUSIONS SPECIFICATION SCHEDULE (FULL-PAGE READABLE)    */}
      {/* ========================================================================= */}
      <div
        data-testid="pdf-page-inclusions"
        className="quote-page bg-white w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] px-12 py-7 flex flex-col justify-between relative overflow-hidden shadow-2xl box-border print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always"
      >
        <div className="flex-1 flex flex-col justify-between min-h-0">
          {(() => {
            const isNswInclusions = quoteState === "NSW";
            const tierNormUpper = (design.specTier || "H2").toUpperCase();
            const isIPInclusions = tierNormUpper.includes("IP") || tierNormUpper.includes("INVEST");
            const isFHBInclusions =
              tierNormUpper.includes("FHB") ||
              tierNormUpper.includes("START SMART") ||
              tierNormUpper.includes("FIRST HOME") ||
              tierNormUpper.includes("SS");
            const isH3Inclusions =
              !isIPInclusions && !isFHBInclusions && (tierNormUpper.includes("H3") || tierNormUpper.includes("LUXURY"));
            const isH1Inclusions =
              !isIPInclusions && !isFHBInclusions && (tierNormUpper.includes("H1") || tierNormUpper.includes("SMART"));
            const isH2Inclusions = !isIPInclusions && !isFHBInclusions && !isH3Inclusions && !isH1Inclusions;

            const categories = [
              {
                title: `CERTIFICATION AND APPROVALS (${isNswInclusions ? "NSW STATUTORY" : "QLD STATUTORY"})`,
                items: [
                  "Registered surveyor contour survey & physical set out",
                  isNswInclusions
                    ? "DA / CDC preparation, architectural plans & council fees"
                    : "Building Application (BA) preparation, lodgement & fees",
                  "Structural engineering design for concrete slab & footing",
                  isNswInclusions
                    ? "Construction Certificate (CC) & engineer certification"
                    : "Form 15 Pre-nail frame/truss & Form 16 Structural certs",
                  isNswInclusions
                    ? "BASIX Energy Assessment Report & thermal efficiency cert"
                    : "Glazing acoustics Form 15 & 7-Star NatHERS assessment",
                  isNswInclusions
                    ? "Principal Certifying Authority (PCA) inspections & Final OC"
                    : "Final Occupation Certificate (Form 21) upon completion",
                ],
              },
              {
                title: "SITE COSTS, PREPARATION & FOUNDATION",
                items: [
                  "Bulk earthworks & levelling up to 1.0m fall across pad",
                  "Engineered waffle pod concrete slab including alfresco",
                  isNswInclusions
                    ? "Reinforced concrete bored piering allowance included"
                    : "Roof edge safety rail & scaffolding to WHS compliance",
                  "Connect sewer, water, power & storm water to mains",
                  isNswInclusions
                    ? "Termimesh / Kordon stainless steel termite barrier (50-yr)"
                    : "Part A & Part B Termite Management System with warranty",
                  "Smooth power-trowelled finish to garage & living areas",
                ],
              },
              {
                title: "EXTERNAL FEATURES, ROOF & GLAZING",
                items: [
                  isNswInclusions
                    ? isH3Inclusions
                      ? "Bristile flat designer concrete tiles or Colorbond® steel roof"
                      : isH2Inclusions
                      ? "Bristile designer concrete roof tiles + sarking (or Colorbond®)"
                      : "Bristile / Monier classic concrete roof tiles + foil sarking"
                    : isH3Inclusions
                    ? "Colorbond® steel roofing or Bristile designer flat tiles"
                    : "Colorbond® corrugated steel roofing with reflective foil",
                  "Colorbond® fascia and gutters with painted UPVC downpipes",
                  "Engineered T2 treated timber roof trusses and wall framing",
                  isH3Inclusions
                    ? "Hume 1200mm wide designer entrance pivot door with Trilock"
                    : isH2Inclusions
                    ? "Hume Newington 2040mm solid core front door with double lock"
                    : isIPInclusions
                    ? "Hume solid core front entry door with deadlock & weather seal"
                    : "Hume Newington 2040mm solid core front door with lockset",
                  isH3Inclusions
                    ? "Powder coated aluminium windows with awning & flyscreens"
                    : isIPInclusions
                    ? "Powder coated aluminium windows with barrier screens & locks"
                    : "Powder coated aluminium windows & fibreglass mesh screens",
                  "2 external garden taps & energy-efficient heat pump HWS",
                ],
              },
              {
                title: "INTERNAL CEILINGS, WALLS & DOORS",
                items: [
                  isH3Inclusions
                    ? "2,740mm (9ft) raised ceiling height to ground floor"
                    : isH2Inclusions
                    ? "2,590mm ceiling height throughout"
                    : "2,440mm standard ceiling height throughout",
                  isH3Inclusions
                    ? "Hume Linear HLR270 2340mm internal doors in gloss enamel"
                    : isH2Inclusions
                    ? "Hume Linear 2040mm internal doors with Dulux gloss enamel"
                    : "Hume 2040mm internal doors with Gainsborough passage sets",
                  "Dulux multi-coat paint system to internal walls & ceilings",
                  isH3Inclusions
                    ? "2400mm high frameless mirror sliding robe doors & shelving"
                    : isH2Inclusions
                    ? "Frameless mirror or vinyl sliding wardrobe doors"
                    : "Built-in wardrobes with vinyl sliding doors, shelf & rail",
                  "67x18mm skirting & architraves in Dulux full gloss enamel",
                  isNswInclusions
                    ? "R4.0 ceiling batts (excl garage) & R2.0 external wall batts"
                    : "Glass wool insulation batts to external walls & ceilings",
                ],
              },
              {
                title: "GOURMET KITCHEN & APPLIANCES",
                items: [
                  isH3Inclusions
                    ? "40mm mitred stone benchtops with waterfall edge feature"
                    : isH2Inclusions || isIPInclusions
                    ? "20mm engineered stone kitchen benchtops"
                    : isFHBInclusions
                    ? "Modern 20mm stone or durable laminate kitchen benchtops"
                    : "Durable laminate kitchen benchtops (20mm stone optional)",
                  isH3Inclusions || isH2Inclusions
                    ? "Fully lined overhead cupboards with plaster bulkhead"
                    : "Fully lined melamine cabinetry with overhead cupboards",
                  "Bank of 4 soft-close cutlery drawers & matching pot drawers",
                  isH3Inclusions
                    ? "Fisher & Paykel 900mm luxury oven, cooktop & canopy hood"
                    : isH2Inclusions
                    ? "Fisher & Paykel 900mm stainless steel oven & 900mm cooktop"
                    : "Haier / Westinghouse 600mm stainless steel oven & cooktop",
                  "Fisher & Paykel stainless dishwasher & built-in microwave",
                  isH3Inclusions || isH2Inclusions
                    ? "Clark Polar sink with Liano I designer pull-out mixer"
                    : "Clark double bowl stainless sink with chrome mixer tapware",
                ],
              },
              {
                title: "BATHROOM, ENSUITE & POWDER ROOM",
                items: [
                  isH3Inclusions
                    ? "Wall-hung floating vanities with 20mm stone & counter basins"
                    : isH2Inclusions || isIPInclusions
                    ? "Contemporary floating vanities with 20mm stone benchtops"
                    : "Contemporary laminate vanity units with vitreous basins",
                  isH3Inclusions
                    ? "10mm frameless glass shower screen with pivot door"
                    : "Semi-frameless shower screens with clear safety glass",
                  isH3Inclusions || isH2Inclusions
                    ? "Caroma Aura 1,775mm freestanding white bath & tapware"
                    : "Quality acrylic inset or freestanding bathtub with chrome waste",
                  "Wall-faced closed coupled toilet suites with soft-close seats",
                  isH3Inclusions
                    ? "FULL HEIGHT ceramic wall tiling to ensuite & bathroom"
                    : "Ceramic wall tiles to 2,100mm height in shower recess",
                  "Smart tile floor wastes & tiled shower recess niche",
                ],
              },
              {
                title: "LAUNDRY & INTERNAL FLOOR COVERINGS",
                items: [
                  isH3Inclusions || isH2Inclusions
                    ? "1,200mm laundry cabinet with 20mm stone top & Clark 45L tub"
                    : "45L stainless steel laundry tub with powder-coated cabinet",
                  isH3Inclusions
                    ? "Choice of 8.5mm Hybrid Timber or 600x600mm porcelain tiles"
                    : "Main floor tiles to entry, hallway, kitchen, family & meals",
                  "Quality carpet with underlay to all bedrooms & media rooms",
                  "Main floor outdoor ceramic tiling to under-roof alfresco",
                ],
              },
              {
                title: `AIR-CONDITIONING & ELECTRICAL${isIPInclusions || isFHBInclusions ? " (TURNKEY)" : ""}`,
                items: [
                  isH3Inclusions
                    ? "Fully Zoned Multi-Head Ducted Reverse Cycle A/C (MyAir5)"
                    : isH2Inclusions
                    ? "Day/Night Ducted Air-Conditioning (Living & Bedroom Zones)"
                    : isIPInclusions
                    ? "Reverse Cycle Air Conditioning (Ducted or Split System)"
                    : "Reverse Cycle Split-System A/C to Main Living + fans",
                  "LED downlights throughout plus ceiling fans to all bedrooms",
                  isIPInclusions
                    ? "100% Turnkey: Exposed aggregate / colour concrete driveway"
                    : isFHBInclusions
                    ? "First Home Buyer: Concrete driveway, path, turf & letterbox"
                    : "Energy-efficient electrical fitout with double power points",
                  "Interconnected hardwired photoelectric smoke detectors",
                  isIPInclusions
                    ? "1.8m treated pine fencing with side gate, clothesline & turf"
                    : isFHBInclusions
                    ? "Optimised for First Home Owner Grant ($30k QLD / $10k NSW)"
                    : "NBN pre-wiring with telephone & data points to living",
                  isIPInclusions
                    ? "Block-out roller blinds to all openable windows & doors"
                    : "External weatherproof double power point to alfresco",
                ],
              },
            ];

            return (
              <div className="flex-1 flex flex-col justify-between min-h-0">
                {/* Page 6 Header */}
                <div className="flex items-start justify-between border-b-2 border-slate-800 pb-2 mb-1.5 flex-none">
                  <div>
                    <div
                      className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
                      style={{ color: "#0099d8" }}
                    >
                      <Award className="h-3.5 w-3.5 text-[#0099d8] shrink-0" />
                      <span>
                        STANDARD INCLUSIONS SPECIFICATION SCHEDULE • {isNswInclusions ? "NEW SOUTH WALES" : "QUEENSLAND"}
                      </span>
                    </div>
                    <h2 className="text-2xl sm:text-[23px] font-black text-slate-950 uppercase tracking-tight mt-0.5 leading-tight">
                      {formatInclusionTierTitle(design.specTier).toUpperCase()}
                    </h2>
                  </div>
                  <div className="text-right text-[9.5px] uppercase tracking-wider text-slate-800 bg-slate-100 border border-slate-300 px-3 py-1 rounded-sm font-black leading-snug">
                    <div>FULLY INCLUDED IN BASE</div>
                    <div>BUILDERS ESTIMATE</div>
                  </div>
                </div>

                {/* 8 Inclusions Categories — Full-Page Spread, Unified Clean Monochrome/Cyan Styling & Larger Readable Text */}
                <div className="flex-1 flex flex-col justify-between py-0.5">
                  {categories.map((cat) => (
                    <div key={cat.title} className="border-b border-slate-200/80 pb-1.5 last:border-b-0">
                      <div className="px-2.5 py-0.5 flex items-center justify-between mb-1 bg-slate-100 border-l-[4px] border-[#0099d8] rounded-r-xs">
                        <span className="font-black uppercase tracking-wider text-slate-950 text-[11px]">
                          {cat.title}
                        </span>
                        <span className="font-bold uppercase tracking-wider text-[9px] text-slate-500">
                          INCLUDED
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-5 gap-y-1 px-1.5">
                        {cat.items.map((itemText, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-[10px] leading-tight text-slate-800 font-medium">
                            <Check
                              className="h-3 w-3 flex-none text-[#0099d8] stroke-[2.5] mt-0.5"
                            />
                            <span className="break-words leading-tight">{itemText}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Compact Official Brochure QR Strip */}
          <div className="mt-1.5 bg-slate-50 border border-slate-300/90 rounded-sm px-3.5 py-1.5 flex items-center justify-between gap-4 flex-none">
            <div className="space-y-0.5 flex-1">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-950">
                VIEW FULL STANDARD INCLUSIONS BROCHURE ONLINE
              </div>
              <p className="text-[9.5px] text-slate-600">
                Scan the QR code to explore room-by-room specifications and finishes at{" "}
                <span className="font-mono font-bold text-slate-900">hudsonhomes.com.au/inclusions-packages/</span>
              </p>
            </div>
            <div className="bg-white p-1 border border-slate-200 rounded-xs flex-none shadow-xs">
              <QrCode value="https://www.hudsonhomes.com.au/inclusions-packages/" size={11} />
            </div>
          </div>
        </div>

        {/* Page 6 Footer */}
        <div className="pt-2 flex items-center justify-between text-[9.5px] text-slate-600 flex-none border-t border-slate-200 mt-1.5">
          <div>{footerLicenceLine}</div>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1 rounded-xs flex items-center gap-2.5 bg-slate-100 border border-slate-300">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Customer Initial</span>
              <div className="bg-white w-20 h-4 border border-slate-200" />
            </div>
            <div className="font-mono text-[9px] text-slate-400">
              Page {(hasSecondDwelling ? 4 : 3) + specPages.length + 1} of {totalPages}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FINAL PAGE: LIFETIME GUARANTEE, DEPOSIT & OFFICIAL NAB BANK TRANSFER      */}
      {/* ========================================================================= */}
      <div className="quote-page bg-white w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] flex flex-col justify-between relative overflow-hidden shadow-2xl box-border print:shadow-none print:min-h-0 print:h-[297mm]">
        <div>
          {/* Top Full-Bleed Marketing Lifetime Structural Integrity Guarantee Banner */}
          <div className="w-full relative flex-none mb-5">
            <img
              src="/brand/marketing-guarantee-banner.jpg"
              alt="Hudson Homes — Lifetime Structural Integrity Guarantee"
              loading="eager"
              crossOrigin="anonymous"
              className="w-full h-auto block object-cover"
            />
            <div className="sr-only">
              <h3>LIFETIME STRUCTURAL INTEGRITY GUARANTEE</h3>
              <p>
                Every Hudson home is engineered and constructed to the highest standards of Australian building compliance.
                We proudly back our workmanship with a Lifetime Structural Integrity Guarantee for total peace of mind.
              </p>
              <span>100% AUSTRALIAN OWNED - LIFETIME STRUCTURAL GUARANTEE - ISO 9001 CERTIFIED - 12-MONTH DEFECT PERIOD</span>
            </div>
          </div>

          <div className="px-12 space-y-5">
            {/* Initial Deposit Allocation Box (Executive Emerald Accent Container) */}
            <div>
              <div className="px-5 py-3.5 flex items-center justify-between mb-3 bg-gradient-to-r from-emerald-50/90 via-emerald-50/40 to-white border border-emerald-200 border-l-[5px] border-l-emerald-600 rounded-r-sm shadow-xs">
                <div>
                  <span className="text-[10px] font-black text-emerald-900 uppercase tracking-wider block">
                    INITIAL DEPOSIT TO PROCEED
                  </span>
                  <span className="text-base font-black text-slate-950 flex items-center gap-2 mt-0.5">
                    {client.depositType === "kdrb"
                      ? "Knock-Down Rebuild (KDRB) Site Allocation"
                      : client.depositType === "brownfield"
                      ? "Brownfield Site Allocation"
                      : "Greenfield Site Allocation"}
                    {client.custom3dTourSelected && (
                      <span className="text-[10.5px] font-black text-cyan-900 bg-white px-2 py-0.5 rounded-xs border border-cyan-300">
                        + Custom 3D Virtual Tour
                      </span>
                    )}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-emerald-900 uppercase tracking-wider block">
                    DEPOSIT AMOUNT
                  </span>
                  <span className="text-2xl sm:text-[28px] font-black block leading-none mt-0.5 text-emerald-700 font-mono tracking-tight">
                    {formatAud(
                      pricing.initialDepositAmount ||
                        (client.custom3dTourSelected
                          ? client.depositType === "kdrb" || client.depositType === "brownfield"
                            ? 4100
                            : 2450
                          : client.depositType === "kdrb" || client.depositType === "brownfield"
                          ? 3300
                          : 1650)
                    )}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-900 px-1">
                <div className="font-black text-slate-950 mb-2">
                  Preliminary Work Completed as a result of the Initial Deposit
                </div>
                <div className="grid grid-cols-2 gap-x-10 text-[11px] text-slate-800">
                  <div className="border-b border-slate-200 py-1.5 flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>On-site Investigation Report</span>
                  </div>
                  <div className="border-b border-slate-200 py-1.5 flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Geotechnical Soil Test</span>
                  </div>
                  <div className="border-b border-slate-200 py-1.5 flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Wind Classification Report</span>
                  </div>
                  <div className="border-b border-slate-200 py-1.5 flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Registered Contour Survey</span>
                  </div>
                  <div className="border-b border-slate-200 py-1.5 flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Developer Covenant Compliance Check</span>
                  </div>
                  <div className="border-b border-slate-200 py-1.5 flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Drafted Plans &amp; Elevations by in-house draftsmen</span>
                  </div>
                  <div className="border-b border-slate-200 py-1.5 flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>Completed Formal Tender Pricing by in-house estimator</span>
                  </div>
                  {client.custom3dTourSelected && (
                    <div className="border-b border-slate-200 py-1.5 flex items-center gap-1.5 font-bold text-cyan-900">
                      <Check className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
                      <span>3D Interactive Virtual Tour of Customized Design ($800 Included)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* NAB Direct Transfer Banking Box with Dynamic QR Code */}
            <div className="border-2 border-slate-900 rounded-sm p-5 flex items-center justify-between gap-6 bg-white shadow-xs">
              <div className="flex-1">
                <div className="font-black text-slate-950 uppercase tracking-wider text-xs mb-3 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#0099d8] shrink-0" />
                  <span>{bankHeaderTitle}</span>
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-8 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10.5px] font-bold uppercase tracking-wider block">Account Name</span>
                    <span className="font-black text-slate-950 text-sm">{bankAccountName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10.5px] font-bold uppercase tracking-wider block">Bank</span>
                    <span className="font-black text-slate-950 text-sm">National Australia Bank (NAB)</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10.5px] font-bold uppercase tracking-wider block">BSB Number</span>
                    <span className="font-black text-slate-950 font-mono text-sm">{bankBsb}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10.5px] font-bold uppercase tracking-wider block">Account Number:</span>
                    <span className="font-black text-slate-950 font-mono text-sm">{bankAccountNumber}</span>
                  </div>
                </div>

                <div className="border-t border-slate-300 my-3.5" />

                <div className="grid grid-cols-2 gap-x-8 text-xs">
                  <div>
                    <span className="text-slate-500 text-[10.5px] font-bold uppercase tracking-wider block">EFT Payment Remittance Reference</span>
                    <span className="font-black text-slate-950 font-mono text-sm">
                      {client.clientName
                        ? `${client.clientName.split(" ").pop()}-${quote.quoteNumber || "MH678"}`
                        : `Client-${quote.quoteNumber || "MH678"}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10.5px] font-bold uppercase tracking-wider block">Currency</span>
                    <span className="font-black text-slate-950 font-mono text-sm">AUD</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Payment QR Code Box */}
              <div className="flex flex-col items-center justify-center p-3 w-36 h-36 text-center flex-none bg-slate-50 border border-slate-200 rounded-sm shadow-xs">
                <PaymentQrCode
                  accountName={bankAccountName}
                  bsb={bankBsb}
                  accountNumber={bankAccountNumber}
                  amount={pricing.initialDepositAmount || 1650}
                  reference={
                    client.clientName
                      ? `${client.clientName.split(" ").pop()}-${quote.quoteNumber || "MH678"}`
                      : `Client-${quote.quoteNumber || "MH678"}`
                  }
                  size={96}
                />
                <span className="text-[8.5px] font-black text-slate-700 mt-1 uppercase tracking-wider">
                  QR Payment
                </span>
              </div>
            </div>

            {/* Customer & Consultant Authorization Signatures */}
            <div className="grid grid-cols-2 gap-12 pt-1 text-xs">
              <div className="space-y-5">
                {/* Client 1 Signature */}
                <div>
                  <div className="font-black uppercase text-slate-950 tracking-wider text-xs mb-2">
                    CLIENT 1 SIGNATURE
                  </div>
                  <div className="border-b border-slate-400 py-1.5 text-[11px] text-slate-400">
                    Signed
                  </div>
                  <div className="border-b border-slate-400 py-1.5 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Print Name</span>
                    <span className="font-semibold text-slate-900">{client.clientName || ""}</span>
                  </div>
                  <div className="border-b border-slate-400 py-1.5 text-[11px] text-slate-400">
                    Date
                  </div>
                </div>

                {/* Client 2 Signature */}
                <div>
                  <div className="font-black uppercase text-slate-950 tracking-wider text-xs mb-2">
                    CLIENT 2 SIGNATURE
                  </div>
                  <div className="border-b border-slate-400 py-1.5 text-[11px] text-slate-400">
                    Signed
                  </div>
                  <div className="border-b border-slate-400 py-1.5 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Print Name</span>
                    <span className="font-semibold text-slate-900">
                      {client.hasClient2 ? client.client2Name : ""}
                    </span>
                  </div>
                  <div className="border-b border-slate-400 py-1.5 text-[11px] text-slate-400">
                    Date
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between">
                <div>
                  <div className="font-black uppercase text-slate-950 tracking-wider text-xs mb-2">
                    AUTHORISED NEW HOME CONSULTANT
                  </div>
                  <div className="border-b border-slate-400 py-1.5 text-[11px] text-slate-400">
                    Signed
                  </div>
                  <div className="border-b border-slate-400 py-1.5 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Print Name</span>
                    <span className="font-semibold text-slate-900">
                      {client.consultantName || "Morgan Hales"}
                    </span>
                  </div>
                  <div className="pt-2 text-[11px] text-slate-600 space-y-0.5">
                    <div>
                      {[client.consultantOffice || "Flagstone Display Home", client.consultantPhone || "0417 571 864", client.consultantEmail]
                        .filter(Boolean)
                        .join(" • ")}
                    </div>
                    <div>Date: {formattedCreatedDate}</div>
                  </div>
                </div>

                <div className="p-3.5 text-[10.5px] text-slate-600 space-y-0.5 mt-4 bg-slate-50 border border-slate-200 rounded-sm">
                  <div className="font-black text-slate-950 uppercase">{bankAccountName}</div>
                  <div>{headOfficeAddress}</div>
                  <div>Phone: 1300 246 200 · Fax: 1300 246 300 · www.hudsonhomes.com.au</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Final Page Footer */}
        <div className="px-12 pb-8 pt-3 flex items-center justify-between text-[9.5px] text-slate-600 border-t border-slate-200">
          <div>{footerLicenceLine}</div>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1.5 rounded-xs flex items-center gap-2.5 bg-slate-100 border border-slate-300">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Customer Initial</span>
              <div className="bg-white w-20 h-5 border border-slate-200" />
            </div>
            <div className="font-mono text-[9px] text-slate-400">
              Page {totalPages} of {totalPages}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
