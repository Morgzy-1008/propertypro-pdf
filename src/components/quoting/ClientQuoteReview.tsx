import React, { useState, useMemo } from "react";
import {
  Sparkles,
  CheckCircle2,
  Phone,
  Mail,
  Send,
  Building,
  Home,
  DollarSign,
  ShieldCheck,
  FileCheck2,
  Layers,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  Tag,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatAud } from "@/lib/pricing";
import { Logo } from "@/components/flyer/FlyerTemplates";
import { calculateQuotePricing } from "@/lib/quoting/quoteEngine";
import { saveQuote } from "@/lib/quoting/quoteStorage";
import type { FullQuote, InclusionTier } from "@/lib/quoting/quoteTypes";
import {
  DOUBLE_STOREY_PRICES,
  DUAL_OC_PRICES,
  SINGLE_STOREY_PRICES,
  SPLIT_LEVEL_PRICES,
  type PriceRow,
} from "@/lib/pricelist.data";
import { plansForDesign } from "@/components/flyer/floorplans";
import { PaymentQrCode } from "./PaymentQrCode";
import { HUDSON_FACADES } from "@/components/flyer/facades.data";
import { PRE_RENDERED_FACADES } from "@/components/flyer/preRenderedFacades.data";
import { prepareFacade } from "@/components/flyer/facadeEngine";
import { getIdbEnhanced } from "@/components/flyer/idbFacadeCache";
import { HOUSING_FACADES } from "@/components/quoting/QuoteDesignStep";

function ClientFacadeViewer({ design }: { design: FullQuote["design"] }) {
  const [src, setSrc] = React.useState<string>("");

  React.useEffect(() => {
    const facadeName = design.facadeName || "Classic";
    const housingType = design.housingType || "Single Storey";
    const isDouble =
      design.mode === "custom_floorplan"
        ? design.customSpec?.storeys === "double"
        : housingType === "Double Storey" || housingType === "double";

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
  }, [design.facadeName, design.housingType, design.mode, design.customSpec]);

  if (!src) return null;

  return (
    <div className="w-full relative rounded-xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950 flex items-center justify-center max-h-80 mb-4">
      <img
        src={src}
        alt={design.facadeName || "Architectural Facade Render"}
        className="w-full h-full max-h-80 object-cover object-center"
      />
      <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold text-white uppercase tracking-wider border border-white/20 shadow-md flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-amber-400" />
        <span>Selected Facade: {design.facadeName || "Classic"}</span>
      </div>
    </div>
  );
}

interface ClientQuoteReviewProps {
  initialQuote: FullQuote;
}

const ALL_PRICE_MODELS: PriceRow[] = [
  ...SINGLE_STOREY_PRICES,
  ...DOUBLE_STOREY_PRICES,
  ...SPLIT_LEVEL_PRICES,
  ...DUAL_OC_PRICES,
];

const INCLUSION_TIERS: {
  id: InclusionTier;
  label: string;
  badge: string;
  brochureUrl: string;
  highlights: string[];
}[] = [
  {
    id: "H1 Inclusions (2025)",
    label: "H1 Standard Inclusions (2025)",
    badge: "Essential Value",
    brochureUrl: "https://www.hudsonhomes.com.au/wp-content/uploads/2025/01/Digital-H1-Brochure-Hudson-Homes-Jan-25.pdf",
    highlights: [
      "2,440mm ceiling height throughout",
      "Haier 600mm stainless steel appliances",
      "Reverse cycle split-system air conditioning",
      "Laminated rolled-edge benchtops",
      "Complete floor tiles & premium carpet",
    ],
  },
  {
    id: "H2 Inclusions (2025)",
    label: "H2 Premium Inclusions (2025)",
    badge: "Most Popular",
    brochureUrl: "https://www.hudsonhomes.com.au/wp-content/uploads/2025/01/Digital-H2-Brochure-Hudson-Homes-Jan-25.pdf",
    highlights: [
      "2,590mm raised ceiling height",
      "Fisher & Paykel 900mm luxury appliances",
      "Day/Night ducted air conditioning",
      "20mm stone benchtops throughout",
      "Semi-frameless pivot glass shower screens",
    ],
  },
  {
    id: "H3 Inclusions (2025)",
    label: "H3 Luxury Inclusions (2025)",
    badge: "Ultimate Luxury",
    brochureUrl: "https://www.hudsonhomes.com.au/wp-content/uploads/2025/01/Digital-H3-Brochure-Hudson-Homes-Jan-25.pdf",
    highlights: [
      "2,740mm high ground floor ceilings",
      "Fisher & Paykel 900mm luxury appliances",
      "Fully zoned MyAir5 touchscreen ducted A/C",
      "40mm mitred kitchen stone benchtops",
      "10mm frameless glass showers & 1.5kW Solar PV",
    ],
  },
];

function getTierPrice(model: PriceRow, tier: InclusionTier): number {
  if (tier === "H3 Inclusions (2025)") return model.h3 || model.hbs || 0;
  if (tier === "H2 Inclusions (2025)") return model.h2 || model.hbs || 0;
  if (tier === "H1 Inclusions (2025)") return model.h1 || model.hbs || 0;
  return model.hbs || 0;
}

export function ClientQuoteReview({ initialQuote }: ClientQuoteReviewProps) {
  const [quote, setQuote] = useState<FullQuote>(initialQuote);
  const [clientNotes, setClientNotes] = useState(quote.clientNotes || "");
  const [submitted, setSubmitted] = useState(quote.status === "client_reviewed");

  // Extract design family models (e.g. all sizes of Mulberry, Amber, Jasper, etc.)
  const familyModels = useMemo(() => {
    if (quote.design.mode === "custom_floorplan") return [];
    const baseName = quote.design.designName.split(" ")[0].trim().toLowerCase();
    const matches = ALL_PRICE_MODELS.filter((m) =>
      m.name.toLowerCase().startsWith(baseName),
    );
    return matches.length > 0 ? matches : [
      ALL_PRICE_MODELS.find((m) => m.name === quote.design.designName) || {
        name: quote.design.designName,
        m2: quote.design.designM2,
        h1: quote.design.basePrice,
        h2: quote.design.basePrice,
        h3: quote.design.basePrice,
      } as PriceRow,
    ];
  }, [quote.design.designName, quote.design.mode]);

  // Current active PriceRow
  const currentModel = useMemo(() => {
    return (
      ALL_PRICE_MODELS.find((m) => m.name === quote.design.designName) ||
      familyModels[0]
    );
  }, [quote.design.designName, familyModels]);

  // Available facades for housing type
  const availableFacades = useMemo(() => {
    const housingType = quote.design.housingType || "Single Storey";
    return HOUSING_FACADES[housingType as keyof typeof HOUSING_FACADES] || HOUSING_FACADES["Single Storey"];
  }, [quote.design.housingType]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label}: ${text}`);
  };

  // Handler for Client selecting a different size of the same design
  const handleSelectSize = (model: PriceRow) => {
    const plans = plansForDesign(model.name);
    const floorplanUrl = plans[0]?.url || quote.design.floorplanUrl;
    const basePrice = getTierPrice(model, quote.design.specTier);

    const updatedDesign = {
      ...quote.design,
      designName: model.name,
      designM2: model.m2,
      basePrice,
      floorplanUrl,
      beds: plans[0]?.beds || quote.design.beds,
      baths: plans[0]?.baths || quote.design.baths,
      cars: plans[0]?.cars || quote.design.cars,
      widthM: plans[0]?.width || quote.design.widthM,
      lengthM: plans[0]?.depth || quote.design.lengthM,
    };

    const updatedPricing = calculateQuotePricing(
      updatedDesign,
      quote.siteConditions,
      quote.lineItems,
      quote.client.depositAmount,
    );

    const updated: FullQuote = {
      ...quote,
      design: updatedDesign,
      pricing: updatedPricing,
      updatedAt: new Date().toISOString(),
    };

    setQuote(updated);
    saveQuote(updated);
    toast.success(`Updated house design size to ${model.name} (${model.m2} m²)`);
  };

  // Handler for Client toggling between H1, H2, and H3 inclusion ranges
  const handleSelectInclusionTier = (tier: InclusionTier) => {
    if (!currentModel) return;
    const basePrice = getTierPrice(currentModel, tier);

    const updatedDesign = {
      ...quote.design,
      specTier: tier,
      basePrice,
    };

    const updatedPricing = calculateQuotePricing(
      updatedDesign,
      quote.siteConditions,
      quote.lineItems,
      quote.client.depositAmount,
    );

    const updated: FullQuote = {
      ...quote,
      design: updatedDesign,
      pricing: updatedPricing,
      updatedAt: new Date().toISOString(),
    };

    setQuote(updated);
    saveQuote(updated);
    toast.success(`Updated inclusion range to ${tier}`);
  };

  // Handler for selecting facade option
  const handleSelectFacade = (facadeName: string, uplift: number) => {
    const updatedDesign = {
      ...quote.design,
      facadeName,
      facadePrice: uplift,
    };

    const updatedPricing = calculateQuotePricing(
      updatedDesign,
      quote.siteConditions,
      quote.lineItems,
      quote.client.depositAmount,
    );

    const updated: FullQuote = {
      ...quote,
      design: updatedDesign,
      pricing: updatedPricing,
      updatedAt: new Date().toISOString(),
    };

    setQuote(updated);
    saveQuote(updated);
    toast.success(`Selected architectural facade: ${facadeName} (${uplift === 0 ? "Standard $0" : `+${formatAud(uplift)}`})`);
  };

  // Handler for Client toggling optional variation checkboxes
  const toggleUpgrade = (itemId: string) => {
    const updatedLineItems = quote.lineItems.map((item) => {
      if (item.id === itemId && item.isClientSelectable) {
        const nextState = item.clientSelected === false ? true : false;
        return {
          ...item,
          clientSelected: nextState,
          isIncluded: nextState,
        };
      }
      return item;
    });

    const updatedPricing = calculateQuotePricing(
      quote.design,
      quote.siteConditions,
      updatedLineItems,
      quote.client.depositAmount,
    );

    const updated: FullQuote = {
      ...quote,
      lineItems: updatedLineItems,
      pricing: updatedPricing,
      updatedAt: new Date().toISOString(),
    };

    setQuote(updated);
    saveQuote(updated);
  };

  const handleSubmitSelections = () => {
    const updated: FullQuote = {
      ...quote,
      clientNotes,
      status: "client_reviewed",
      updatedAt: new Date().toISOString(),
    };
    setQuote(updated);
    saveQuote(updated);
    setSubmitted(true);
    toast.success("Your selections have been submitted to your Hudson Homes Sales Consultant!");
  };

  const clientSelectableItems = quote.lineItems.filter((i) => (i.isIncluded || i.clientSelected) && i.unitRate > 0);

  const clientCombinedNames = [quote.client.clientName, quote.client.hasClient2 && quote.client.client2Name]
    .filter(Boolean)
    .join(" & ");

  const paymentReference = `${quote.client.estimateNumber || quote.quoteNumber} ${quote.client.clientName.split(" ").pop()}`;

  // Site items for display
  const site = quote.siteConditions;
  const gfaM2 = quote.design.designM2 || 192;
  const concrete32Cost = site.concrete32MpaRequired ? (site.concrete32MpaCost ?? Math.round(gfaM2 * 14)) : 0;
  const flexibleConnectionsCost = site.flexibleConnectionsRequired ? (site.flexibleConnectionsCost ?? 1800) : 0;
  const bushfireReportCost = site.bushfireReportRequired ? (site.bushfireReportCost ?? 850) : 0;
  const floodReportCost = site.floodReportRequired ? (site.floodReportCost ?? 7600) : 0;
  const hydraulicReportCost = site.hydraulicReportRequired ? (site.hydraulicReportCost ?? 2200) : 0;
  const landslideReportCost = site.landslideReportRequired ? (site.landslideReportCost ?? 1850) : 0;
  const acousticReportCost = site.acousticReportRequired ? (site.acousticReportCost ?? 1200) : 0;
  const arboristReportCost = site.arboristReportRequired ? (site.arboristReportCost ?? 1100) : 0;
  const cctvSewerReportCost = site.cctvSewerReportRequired ? (site.cctvSewerReportCost ?? 850) : 0;

  const slabHeight = site.slabElevationMeters ?? 0.3;
  const calculatedSlabCost = Math.round(slabHeight * 270 * gfaM2);
  const floodCost = site.floodOverlayRequired
    ? (site.floodOverlayCost !== undefined && site.floodOverlayCost !== null && site.floodOverlayCost > 0
        ? site.floodOverlayCost
        : calculatedSlabCost)
    : 0;

  const councilDaCost = site.councilDaRequired ? (site.councilDaCost ?? 8000) : 0;
  const trafficCost = site.trafficControlRequired ? (site.trafficControlCost ?? 10000) : 0;
  const dualLivingCost = site.dualLivingInfrastructureRequired ? (site.dualLivingInfrastructureCost ?? 23000) : 0;
  const screwPieringCost = site.screwPieringRequired ? (site.screwPieringCost ?? Math.round(gfaM2 * 90)) : 0;
  const rockCost = Number(site.rockExcavationAllowance) || 0;
  const retainingCost = Number(site.retainingWallAllowance) || 0;
  const sedimentCost = Number(site.sedimentAssetProtectionCost) || 0;

  const variationsTotal = quote.pricing.categorySubtotals.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-brand-gold/30 relative overflow-hidden flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo light size={11} />
          <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/60 px-3 py-1.5 rounded-full border border-slate-700/60">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Interactive Client Review Portal</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-6 py-10 w-full flex-1 space-y-8 relative z-10">
        {/* Welcome Card */}
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" /> Builders Estimate #{quote.client.estimateNumber || quote.quoteNumber} (14-Day Validity)
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Version {quote.client.estimateVersion || 1}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Welcome, {clientCombinedNames || "Valued Client"}
          </h1>
          <p className="mt-2 text-sm text-slate-400 max-w-2xl leading-relaxed">
            Review and personalize your new home quotation for{" "}
            <span className="text-slate-200 font-semibold">
              {[quote.client.lotNumber, quote.client.siteAddress, quote.client.suburb].filter(Boolean).join(", ") || "your proposed Queensland building site"}
            </span>
            . You can explore different floorplan sizes, switch facades, and customize inclusion tiers below with instant pricing updates.
          </p>

          <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px]">Selected Model:</span>
              <span className="font-bold text-white text-sm">
                {quote.design.mode === "standard" ? quote.design.designName : "Custom Plan"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Floor Area:</span>
              <span className="font-bold text-white text-sm font-mono">
                {quote.design.designM2} m² ({(quote.design.designM2 * 0.107639).toFixed(1)} sq)
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Facade Style:</span>
              <span className="font-bold text-white text-sm">{quote.design.facadeName || "Classic"}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Total Estimated Cost:</span>
              <span className="font-bold text-emerald-400 text-sm font-mono">
                {formatAud(quote.pricing.grossEstimatedInvestment)}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 1: DESIGN SIZE SELECTOR (Same Design Family) */}
        {familyModels.length > 1 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Home className="h-4 w-4 text-emerald-400" />
                  Available Sizes in the {quote.design.designName.split(" ")[0]} Range
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Compare different floorplan sizes of this design family. Switching sizes automatically recalculates your base price and site engineering.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {familyModels.map((m) => {
                const isSelected = m.name === quote.design.designName;
                const tierPrice = getTierPrice(m, quote.design.specTier);
                return (
                  <div
                    key={m.name}
                    onClick={() => handleSelectSize(m)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-950/30 ring-1 ring-emerald-500/50 shadow-lg"
                        : "border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">{m.name}</span>
                      {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-none" />}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-1">
                      {m.m2} m² ({(m.m2 * 0.107639).toFixed(1)} sq)
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">Base:</span>
                      <span className="font-bold text-xs text-emerald-400 font-mono">
                        {formatAud(tierPrice)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 2: INCLUSION RANGE SELECTOR (H1, H2, H3 2025) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Select Inclusions Range (H1 · H2 · H3 2025)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Toggle between our official inclusion tiers to tailor the finish and inclusions level to your lifestyle.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {INCLUSION_TIERS.map((tier) => {
              const isSelected = quote.design.specTier === tier.id;
              const tierBasePrice = currentModel ? getTierPrice(currentModel, tier.id) : quote.design.basePrice;
              return (
                <div
                  key={tier.id}
                  onClick={() => handleSelectInclusionTier(tier.id)}
                  className={`rounded-2xl border p-5 cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-950/25 ring-1 ring-emerald-500/50 shadow-xl"
                      : "border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="font-bold text-sm text-white block">{tier.label}</span>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                          {tier.badge}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 font-bold shadow-md">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>

                    <ul className="space-y-1.5 text-xs text-slate-300 my-4">
                      {tier.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="h-3.5 w-3.5 text-emerald-400 mt-0.5 flex-none" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Base House Price:</span>
                    <span className="font-bold text-emerald-400 font-mono text-sm">
                      {formatAud(tierBasePrice)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Digital Brochure Links beneath inclusion range boxes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <a
              href="https://www.hudsonhomes.com.au/wp-content/uploads/2025/01/Digital-H1-Brochure-Hudson-Homes-Jan-25.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 hover:border-emerald-500/50 text-xs text-slate-300 hover:text-white transition-all group"
            >
              <span className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-emerald-400" />
                <span>View the entire H1 range here</span>
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-400" />
            </a>

            <a
              href="https://www.hudsonhomes.com.au/wp-content/uploads/2025/01/Digital-H2-Brochure-Hudson-Homes-Jan-25.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 hover:border-emerald-500/50 text-xs text-slate-300 hover:text-white transition-all group"
            >
              <span className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-emerald-400" />
                <span>View the entire H2 range here</span>
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-emerald-400 group-hover:text-emerald-400" />
            </a>

            <a
              href="https://www.hudsonhomes.com.au/wp-content/uploads/2025/01/Digital-H3-Brochure-Hudson-Homes-Jan-25.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 hover:border-emerald-500/50 text-xs text-slate-300 hover:text-white transition-all group"
            >
              <span className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-emerald-400" />
                <span>View the entire H3 range here</span>
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-emerald-400 group-hover:text-emerald-400" />
            </a>
          </div>
        </div>

        {/* SECTION 2.5: FACADE SELECTOR */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Palette className="h-4 w-4 text-cyan-400" />
                Select Facade Design
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Browse official facades available for this home design. Selecting a facade updates your high-res render and live quote investment.
              </p>
            </div>
            <span className="text-xs text-slate-400">
              Current: <strong className="text-cyan-400">{quote.design.facadeName || "Classic"}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-64 overflow-y-auto p-1 rounded-xl border border-slate-800 bg-slate-900/40">
            {availableFacades.map((f) => {
              const isSelected = (quote.design.facadeName || "Classic").toLowerCase() === f.name.toLowerCase();
              return (
                <div
                  key={f.name}
                  onClick={() => handleSelectFacade(f.name, f.uplift)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? "border-cyan-400 bg-cyan-950/40 ring-1 ring-cyan-400/50 shadow-md"
                      : "border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-white truncate">{f.name}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-cyan-400 flex-none" />}
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-slate-300 block">
                    {f.uplift === 0 ? "Standard ($0)" : `+${formatAud(f.uplift)}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: FACADE & MAXIMIZED FLOORPLAN PREVIEW */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-cyan-400" />
                Selected Facade &amp; Floorplan Layout — {quote.design.designName}
              </h3>
              <span className="text-xs text-slate-400">
                Selected Facade: <strong className="text-slate-200">{quote.design.facadeName || "Classic"}</strong> · {quote.design.beds || 4} Beds · {quote.design.baths || 2} Baths · {quote.design.cars || 2} Cars · Total Area: {quote.design.designM2} m²
              </span>
            </div>
          </div>

          {/* High-Resolution Facade Render */}
          <ClientFacadeViewer design={quote.design} />

          {/* Floorplan Layout Drawing (Maximized Size) */}
          {quote.design.floorplanUrl && (
            <div className="rounded-xl border border-slate-800 bg-white p-4 flex items-center justify-center min-h-[500px] max-h-[560px] overflow-hidden shadow-inner">
              <img
                src={quote.design.floorplanUrl}
                alt={quote.design.designName}
                className="max-h-[520px] w-full h-auto object-contain mix-blend-multiply drop-shadow-sm"
              />
            </div>
          )}
        </div>

        {/* SECTION 4: OPTIONAL UPGRADES CHECKLIST */}
        {clientSelectableItems.length > 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Customise Optional Variations &amp; Upgrades
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Select or deselect packages to tailor your home specification to your budget.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clientSelectableItems.map((item) => {
                const isSelected = item.clientSelected !== false && item.isIncluded;
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleUpgrade(item.id)}
                    className={`rounded-xl border p-4 cursor-pointer transition-all ${
                      isSelected
                        ? "border-emerald-500/80 bg-slate-900/90 ring-1 ring-emerald-500/40 shadow-lg shadow-emerald-950/30"
                        : "border-slate-800 bg-slate-900/40 opacity-70 hover:opacity-100 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="h-4 w-4 accent-emerald-500 rounded cursor-pointer"
                          />
                          <span className="font-bold text-sm text-white truncate">{item.name}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      <div className="text-right flex-none">
                        <span className="text-sm font-bold text-emerald-400 font-mono">
                          {item.unitRate === 0 ? "Included" : `+${formatAud(item.quantity * item.unitRate)}`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 4.5: SITE SPECIFIC EARTHWORKS & STATUTORY INCLUSIONS */}
        <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="h-4 w-4 text-cyan-400" />
                Site Specific Earthworks, Engineering &amp; Statutory Requirements
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Included site preparation, engineered soil foundations, and local authority approvals for your lot.
              </p>
            </div>
            <span className="font-extrabold text-cyan-400 font-mono text-sm">
              +{formatAud(quote.pricing.siteCostsSubtotal + quote.pricing.councilStatutorySubtotal)} Total
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 text-xs">
            {/* Soil Class */}
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">Engineered Soil Class</span>
                <span className="text-slate-400 text-[11px]">{site.soilClass} Foundation</span>
              </div>
              <span className="font-mono font-bold text-slate-200">
                {site.soilTotalCost === 0 ? "Standard ($0)" : `+${formatAud(site.soilTotalCost)}`}
              </span>
            </div>

            {/* 32MPa Concrete */}
            {site.concrete32MpaRequired && (
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">32 MPa Concrete Upgrade</span>
                  <span className="text-slate-400 text-[11px]">Saline / Marine Protection</span>
                </div>
                <span className="font-mono font-bold text-emerald-400">
                  +{formatAud(concrete32Cost)}
                </span>
              </div>
            )}

            {/* Flexible Connections */}
            {site.flexibleConnectionsRequired && (
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Flexible Service Connections</span>
                  <span className="text-slate-400 text-[11px]">Plumbing &amp; Stormwater Articulation</span>
                </div>
                <span className="font-mono font-bold text-emerald-400">
                  +{formatAud(flexibleConnectionsCost)}
                </span>
              </div>
            )}

            {/* Topography Fall */}
            {site.fallMeters > 0 && (
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Topography Fall</span>
                  <span className="text-slate-400 text-[11px]">{site.fallMeters}m Envelope Fall</span>
                </div>
                <span className="font-mono font-bold text-slate-200">
                  {site.fallTotalCost === 0 ? "Included ($0)" : `+${formatAud(site.fallTotalCost)}`}
                </span>
              </div>
            )}

            {/* Bushfire Report */}
            {site.bushfireReportRequired && (
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Bushfire Assessment Report</span>
                  <span className="text-slate-400 text-[11px]">Site BAL Certificate</span>
                </div>
                <span className="font-mono font-bold text-amber-400">
                  +{formatAud(bushfireReportCost)}
                </span>
              </div>
            )}

            {/* Bushfire BAL */}
            {site.bushfireCost > 0 && (
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Bushfire Attack Level</span>
                  <span className="text-slate-400 text-[11px]">{site.bushfireBal} Protection</span>
                </div>
                <span className="font-mono font-bold text-amber-400">
                  +{formatAud(site.bushfireCost)}
                </span>
              </div>
            )}

            {/* Flood Report */}
            {site.floodReportRequired && (
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Flood Code Assessment Report</span>
                  <span className="text-slate-400 text-[11px]">Hydraulic Modeling</span>
                </div>
                <span className="font-mono font-bold text-cyan-400">
                  +{formatAud(floodReportCost)}
                </span>
              </div>
            )}

            {/* Hydraulic Engineering Report */}
            {site.hydraulicReportRequired && (
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Hydraulic Engineering Report</span>
                  <span className="text-slate-400 text-[11px]">Stormwater Catchment Design</span>
                </div>
                <span className="font-mono font-bold text-cyan-400">
                  +{formatAud(hydraulicReportCost)}
                </span>
              </div>
            )}

            {/* Landslide Report */}
            {site.landslideReportRequired && (
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Landslide Overlay Report</span>
                  <span className="text-slate-400 text-[11px]">Slope Stability Assessment</span>
                </div>
                <span className="font-mono font-bold text-amber-400">
                  +{formatAud(landslideReportCost)}
                </span>
              </div>
            )}

            {/* Flood Overlay Works */}
            {site.floodOverlayRequired && (
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Slab Elevation Works</span>
                  <span className="text-slate-400 text-[11px]">{slabHeight}m Elevated Pad ($270/m × GFA)</span>
                </div>
                <span className="font-mono font-bold text-cyan-400">
                  +{formatAud(floodCost)}
                </span>
              </div>
            )}

            {/* Acoustic Report */}
            {site.acousticReportRequired && (
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Acoustic Noise Report</span>
                  <span className="text-slate-400 text-[11px]">QDC MP 4.4 Assessment</span>
                </div>
                <span className="font-mono font-bold text-indigo-400">
                  +{formatAud(acousticReportCost)}
                </span>
              </div>
            )}

            {/* Acoustic Attenuation */}
            {site.acousticCost > 0 && (
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Acoustic Attenuation Package</span>
                  <span className="text-slate-400 text-[11px]">{site.acousticTier} Glazing &amp; Batts</span>
                </div>
                <span className="font-mono font-bold text-indigo-400">
                  +{formatAud(site.acousticCost)}
                </span>
              </div>
            )}

            {/* Arborist Report */}
            {site.arboristReportRequired && (
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Arborist Tree Report</span>
                  <span className="text-slate-400 text-[11px]">TPZ Vegetation Assessment</span>
                </div>
                <span className="font-mono font-bold text-emerald-400">
                  +{formatAud(arboristReportCost)}
                </span>
              </div>
            )}

            {/* CCTV Sewer Inspection */}
            {site.cctvSewerReportRequired && (
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">CCTV Sewer Pipe Camera Inspection</span>
                  <span className="text-slate-400 text-[11px]">Drainage Depth Verification</span>
                </div>
                <span className="font-mono font-bold text-teal-400">
                  +{formatAud(cctvSewerReportCost)}
                </span>
              </div>
            )}

            {/* Council Jurisdiction */}
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">Council Statutory Fees</span>
                <span className="text-slate-400 text-[11px]">{site.councilRegion}</span>
              </div>
              <span className="font-mono font-bold text-slate-200">
                +{formatAud(site.councilFee)}
              </span>
            </div>

            {/* Council DA */}
            {site.councilDaRequired && (
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Development Application (DA)</span>
                  <span className="text-slate-400 text-[11px]">Town Planning &amp; Lodgement</span>
                </div>
                <span className="font-mono font-bold text-emerald-400">
                  +{formatAud(councilDaCost)}
                </span>
              </div>
            )}

            {/* Traffic Control */}
            {site.trafficControlRequired && (
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Traffic Management Plan</span>
                  <span className="text-slate-400 text-[11px]">TGS &amp; Safety Signage</span>
                </div>
                <span className="font-mono font-bold text-emerald-400">
                  +{formatAud(trafficCost)}
                </span>
              </div>
            )}

            {/* Dual Living Infrastructure */}
            {site.dualLivingInfrastructureRequired && (
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Dual Living Infrastructure Charge</span>
                  <span className="text-slate-400 text-[11px]">Council Headworks &amp; Sewer Contribution</span>
                </div>
                <span className="font-mono font-bold text-emerald-400">
                  +{formatAud(dualLivingCost)}
                </span>
              </div>
            )}

            {/* Screw Piering */}
            {site.screwPieringRequired && (
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Screw Piering Allowance</span>
                  <span className="text-slate-400 text-[11px]">KDRB / Disturbed Fill Foundation</span>
                </div>
                <span className="font-mono font-bold text-emerald-400">
                  +{formatAud(screwPieringCost)}
                </span>
              </div>
            )}

            {/* Rock */}
            {rockCost > 0 && (
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Rock Excavation Allowance</span>
                  <span className="text-slate-400 text-[11px]">Sub-surface Excavator</span>
                </div>
                <span className="font-mono font-bold text-emerald-400">
                  +{formatAud(rockCost)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 5: COMPLETE ITEMISED QUOTE COST SUMMARY (MOVED UP) */}
        <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-slate-900 via-emerald-950/20 to-slate-950 p-6 shadow-2xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">
                Total Estimated Builders Investment:
              </span>
              <div className="text-3xl font-extrabold text-white mt-1 bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent font-mono">
                {formatAud(quote.pricing.grossEstimatedInvestment)}
              </div>
              <span className="text-xs text-slate-400">
                Preliminary Builders Estimate (14-day validity) · Inclusive of 10% GST
              </span>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-400 block">Assigned New Home Consultant:</span>
              <span className="font-bold text-white text-sm">{quote.client.consultantName}</span>
              <span className="text-xs text-slate-400 block font-mono">{quote.client.consultantPhone}</span>
            </div>
          </div>

          {/* Complete Itemized Cost Summary List */}
          <div className="space-y-2 text-xs">
            <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px] block mb-2">
              Complete Itemised Investment Breakdown:
            </span>

            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2.5 divide-y divide-slate-800/60">
              {/* Base House Price */}
              <div className="flex items-center justify-between text-slate-300">
                <span>
                  Base House Price ({quote.design.designName} with {quote.design.specTier})
                </span>
                <span className="font-mono font-bold text-white">
                  {formatAud(quote.pricing.baseHousePrice)}
                </span>
              </div>

              {/* Facade */}
              {quote.pricing.facadePrice > 0 && (
                <div className="pt-2 flex items-center justify-between text-slate-300">
                  <span>Architectural Facade ({quote.design.facadeName})</span>
                  <span className="font-mono text-slate-200">
                    +{formatAud(quote.pricing.facadePrice)}
                  </span>
                </div>
              )}

              {/* Promotion */}
              {quote.pricing.promotionsDiscount > 0 && (
                <div className="pt-2 flex items-center justify-between text-emerald-400 font-semibold">
                  <span>{quote.pricing.promotionName} (Special Savings)</span>
                  <span className="font-mono">
                    -{formatAud(quote.pricing.promotionsDiscount)}
                  </span>
                </div>
              )}

              {/* Site Earthworks & Engineering */}
              <div className="pt-2 flex items-center justify-between text-slate-300">
                <span>Site Specific Earthworks, Foundations &amp; Overlays</span>
                <span className="font-mono text-slate-200">
                  +{formatAud(quote.pricing.siteCostsSubtotal)}
                </span>
              </div>

              {/* Council Statutory */}
              <div className="pt-2 flex items-center justify-between text-slate-300">
                <span>Council Statutory Lodgement &amp; Approvals ({quote.siteConditions.councilRegion})</span>
                <span className="font-mono text-slate-200">
                  +{formatAud(quote.pricing.councilStatutorySubtotal)}
                </span>
              </div>

              {/* Variations */}
              {variationsTotal > 0 && (
                <div className="pt-2 flex items-center justify-between text-slate-300">
                  <span>Selected Optional Variations &amp; Upgrades</span>
                  <span className="font-mono text-slate-200">
                    +{formatAud(variationsTotal)}
                  </span>
                </div>
              )}

              {/* Net + GST + Total */}
              <div className="pt-3 border-t border-slate-700/80 flex items-center justify-between text-slate-200 font-extrabold text-sm">
                <span>TOTAL ESTIMATED BUILDERS INVESTMENT (INC. GST)</span>
                <span className="font-mono text-emerald-400 text-base">
                  {formatAud(quote.pricing.grossEstimatedInvestment)}
                </span>
              </div>
            </div>
          </div>

          {/* Consultant Alteration Notes & Submit Button */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Have questions or custom alteration requests for your consultant?
              </label>
              <Textarea
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                placeholder="Type any questions, layout modifications, or custom requests here..."
                rows={3}
                className="border-slate-800 bg-slate-950/80 text-xs text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-400">
                {submitted
                  ? "✓ Your selections have been saved and registered with your consultant."
                  : "Click below to confirm your chosen design size, inclusions, and upgrades."}
              </div>

              <Button
                onClick={handleSubmitSelections}
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold hover:from-emerald-400 text-xs gap-2 shadow-md shadow-emerald-500/20"
              >
                <Send className="h-3.5 w-3.5" />
                {submitted ? "Update My Selections" : "Submit My Selected Preferences"}
              </Button>
            </div>
          </div>
        </div>

        {/* SECTION 6: INITIAL DEPOSIT & OFFICIAL NAB DIRECT TRANSFER DETAILS (MOVED TO BOTTOM) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <FileCheck2 className="h-4 w-4" />
                Initial Deposit to Proceed
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">
                {quote.client.depositType === "brownfield" ? "Brownfield Site Deposit Allocation" : "Greenfield Site Deposit Allocation"}
              </h3>
            </div>
            <div className="text-left sm:text-right flex items-center gap-3">
              <div>
                <span className="text-xs text-slate-400 block">Initial Deposit Required:</span>
                <span className="text-2xl font-extrabold text-emerald-400 font-mono">
                  {formatAud(quote.client.depositAmount || 1650)}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(String(quote.client.depositAmount || 1650), "Deposit Amount")}
                className="border-slate-800 bg-slate-950 text-slate-300 hover:text-white text-xs gap-1 h-8"
              >
                <Copy className="h-3 w-3" /> Copy
              </Button>
            </div>
          </div>

          {/* 7 Preliminary Works Included */}
          <div className="text-xs text-slate-300">
            <span className="font-bold text-white block mb-2">
              Preliminary Works Commenced upon Receipt of Initial Deposit:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-slate-400">
              <div className="flex items-center gap-1.5">✓ On-site Investigation Report</div>
              <div className="flex items-center gap-1.5">✓ Geotechnical Soil Test</div>
              <div className="flex items-center gap-1.5">✓ Wind Classification Report</div>
              <div className="flex items-center gap-1.5">✓ Registered Contour Survey</div>
              <div className="flex items-center gap-1.5">✓ Developer Covenant Compliance Check</div>
              <div className="flex items-center gap-1.5">✓ In-house Architectural Drafting (Plans &amp; Elevations)</div>
              <div className="flex items-center gap-1.5 sm:col-span-2">✓ Formal Fixed Tender Pricing by Senior Estimator</div>
            </div>
          </div>

          {/* Official NAB Bank Account Details with 1-Tap Copy Buttons */}
          <div className="border border-slate-800 rounded-xl p-5 bg-slate-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-3 text-xs flex-1">
              <div className="font-bold text-amber-400 uppercase tracking-wider text-[11px] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5" />
                  HUDSON HOMES QLD BANK DETAILS
                </span>
                <span className="text-slate-400 font-mono text-[10px]">National Australia Bank</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Account Name */}
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Account Name:</span>
                    <span className="font-semibold text-white">Hudson Homes (QLD) Pty Ltd</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard("Hudson Homes (QLD) Pty Ltd", "Account Name")}
                    className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
                    title="Copy Account Name"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Bank */}
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">Bank Institution:</span>
                  <span className="font-semibold text-white">National Australia Bank (NAB)</span>
                </div>

                {/* BSB Number */}
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 text-[10px] block">BSB Number:</span>
                    <span className="font-bold font-mono text-base text-emerald-400 tracking-wider">082 778</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard("082-778", "BSB Number")}
                    className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
                    title="Copy BSB"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Account Number */}
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Account Number:</span>
                    <span className="font-bold font-mono text-base text-white tracking-wider">74-586-5607</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard("745865607", "Account Number")}
                    className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
                    title="Copy Account Number"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* EFT Reference */}
                <div className="col-span-1 sm:col-span-2 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 text-[10px] block">EFT Payment Remittance Reference:</span>
                    <span className="font-bold font-mono text-emerald-400 text-sm">
                      {paymentReference}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(paymentReference, "Payment Reference")}
                    className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800"
                    title="Copy Reference"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Real Dynamic Payment QR Code */}
            <div className="flex flex-col items-center justify-center p-3 bg-slate-900 border border-slate-800 rounded-xl text-center flex-none">
              <PaymentQrCode
                accountName="Hudson Homes (QLD) Pty Ltd"
                bsb="082 778"
                accountNumber="74-586-5607"
                amount={quote.client.depositAmount || 1650}
                reference={paymentReference}
                size={100}
              />
              <span className="text-[10px] font-bold text-slate-300 mt-2 uppercase font-mono tracking-wider">
                Scan with Banking App
              </span>
              <span className="text-[9px] text-slate-500 mt-0.5">
                Pre-fills BSB, Acc &amp; Ref
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
