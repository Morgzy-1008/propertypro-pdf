import React from "react";
import { formatAud } from "@/lib/pricing";
import { Logo } from "@/components/flyer/FlyerTemplates";
import {
  calculateCustomTotalM2,
  calculateModifiedFloorplanPricing,
  getEffectiveDesignM2,
  getEffectiveDesignName,
} from "@/lib/quoting/quoteEngine";
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

interface QuotePdfDocumentProps {
  quote: FullQuote;
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
    const facadeName = design.facadeName || "Classic";
    const housingType = design.housingType || "Single Storey";
    const isDouble =
      design.mode === "custom_floorplan"
        ? design.customSpec?.storeys === "double"
        : housingType === "Double Storey" || housingType === "double";

    const normName = facadeName.toLowerCase().replace(/[\s\-_]/g, "");

    // Search HUDSON_FACADES
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
      // 1. Check pre-rendered high-res static catalogue first
      if (PRE_RENDERED_FACADES[matched.id]) {
        setSrc(PRE_RENDERED_FACADES[matched.id]);
        return;
      }

      // 2. Check IndexedDB cache for AI-enhanced render
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
    <div className="w-full relative rounded-xl overflow-hidden border border-slate-200 shadow-xs bg-slate-950 flex items-center justify-center h-[215px] max-h-[215px] mb-2.5 flex-none">
      <img
        src={src}
        alt={design.facadeName || "Architectural Facade Render"}
        className="w-full h-full object-cover object-center"
        style={{ imageRendering: "auto" }}
      />
      <div className="absolute top-2 left-2 bg-slate-900/85 backdrop-blur-md px-2.5 py-1 rounded-md text-[9px] font-bold text-white uppercase tracking-wider border border-white/20 shadow-sm flex items-center gap-1.5">
        <Sparkles className="h-3 w-3 text-amber-400" />
        <span>Selected Facade: {design.facadeName || "Classic"}</span>
      </div>
    </div>
  );
}

function QuoteFloorplanViewer({ design }: { design: FullQuote["design"] }) {
  const [src, setSrc] = React.useState(design.floorplanUrl || "");

  React.useEffect(() => {
    if (design.floorplanUrl && design.floorplanUrl.startsWith("data:")) {
      setSrc(design.floorplanUrl);
      return;
    }
    if (design.designName) {
      const plans = plansForDesign(design.designName);
      if (plans[0]) {
        if (plans[0].url && !plans[0].url.startsWith("data:")) {
          setSrc(plans[0].url);
        }
        prepareFloorplan(plans[0]).then((enhanced) => {
          if (enhanced) setSrc(enhanced);
        }).catch(() => {});
      }
    }
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
    <div className="w-full h-full flex items-center justify-center p-2 bg-white">
      <img
        src={src}
        alt="Selected Floorplan Drawing"
        className="max-h-[440px] max-w-[670px] w-auto h-auto object-contain block mx-auto my-auto drop-shadow-sm transition-all"
        style={{ imageRendering: "auto" }}
      />
    </div>
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

function paginateSpecGroups(groups: SpecGroup[]): SpecGroup[][] {
  const pages: SpecGroup[][] = [];
  let currentPage: SpecGroup[] = [];
  let currentUnits = 0;
  let isFirstPage = true;

  for (const group of groups) {
    if (!group.items || group.items.length === 0) continue;
    const maxUnits = isFirstPage ? 16 : 22;
    const groupUnits = 1.2 + group.items.length * 1.4;

    if (currentUnits + groupUnits <= maxUnits || currentPage.length === 0) {
      currentPage.push(group);
      currentUnits += groupUnits;
    } else {
      const remainingUnits = maxUnits - currentUnits;
      if (remainingUnits >= 4.0 && group.items.length >= 4) {
        const canFitCount = Math.floor((remainingUnits - 1.2) / 1.4);
        if (canFitCount >= 2 && group.items.length - canFitCount >= 1) {
          const part1 = group.items.slice(0, canFitCount);
          const part2 = group.items.slice(canFitCount);

          currentPage.push({
            label: group.label,
            total: part1.reduce((s, it) => s + it.amount, 0),
            items: part1,
          });
          pages.push(currentPage);

          isFirstPage = false;
          currentPage = [
            {
              label: `${group.label} (Continued)`,
              total: part2.reduce((s, it) => s + it.amount, 0),
              items: part2,
            },
          ];
          currentUnits = 1.2 + part2.length * 1.4;
          continue;
        }
      }

      pages.push(currentPage);
      isFirstPage = false;
      currentPage = [group];
      currentUnits = groupUnits;
    }
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages.length > 0 ? pages : [[]];
}

export function QuotePdfDocument({ quote }: QuotePdfDocumentProps) {
  const { client, design, siteConditions, lineItems, pricing } = quote;

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

  const siteAddressFull =
    [client.lotNumber, client.siteAddress, client.suburb, `QLD ${client.postcode || ""}`]
      .filter(Boolean)
      .join(", ") || "Proposed Site Address TBA, Queensland";

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

  // Geotechnical Allowances ($90 / m2)
  const screwPieringCost = siteConditions.screwPieringRequired ? (siteConditions.screwPieringCost ?? Math.round(gfaM2 * 90)) : 0;
  const rockCost = Number(siteConditions.rockExcavationAllowance) || 0;
  const retainingCost = Number(siteConditions.retainingWallAllowance) || 0;

  const totalSiteAndStatutorySubtotal = pricing.siteCostsSubtotal + pricing.councilStatutorySubtotal;

  // Active Site Categories formatted in the exact same table format as Page 5 (only active items)
  const earthworksItems = [
    {
      id: "soil_class",
      name: `Engineered Slab Footing & Foundation (Soil ${siteConditions.soilClass})`,
      description: `Engineered slab footing depth & steel mesh reinforcement (${pricing.gfaM2} m² GFA footprint).`,
      qtyLabel: `${pricing.gfaM2} m² footprint`,
      amount: siteConditions.soilTotalCost,
    },
    ...(siteConditions.concrete32MpaRequired
      ? [
          {
            id: "concrete_32mpa",
            name: "32 MPa Concrete Slab Upgrade",
            description: "High-strength concrete mix for marine, coastal saline proximity, or acid sulfate ground.",
            qtyLabel: `${pricing.gfaM2} m²`,
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
    ...(siteConditions.fallMeters > 0 || siteConditions.fallTotalCost > 0
      ? [
          {
            id: "fall_topography",
            name: `Topography Fall Allowance (${siteConditions.fallMeters}m Fall)`,
            description: `Standard cut & fill included up to 1.0m fall across building pad, with excess topography engineered fall surcharge.`,
            qtyLabel: `${siteConditions.fallMeters}m envelope`,
            amount: siteConditions.fallTotalCost,
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
            description: "AS 3959 ember protection mesh, toughened glazing, and fire-resistant perimeter seals.",
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
    ...(siteConditions.acousticCost > 0
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

  const activeSiteSchedule = [
    {
      label: "1. Site Specific Earthworks, Foundation & Soil Engineering",
      total: earthworksItems.reduce((s, it) => s + it.amount, 0),
      items: earthworksItems,
    },
    ...(overlayReportsAndAllowances.length > 0
      ? [
          {
            label: "2. Site Overlay Reports & Allowances",
            total: overlayReportsAndAllowances.reduce((s, it) => s + it.amount, 0),
            items: overlayReportsAndAllowances,
          },
        ]
      : []),
    {
      label: "3. Council Approvals & Statutory Applications",
      total: councilStatutoryItems.reduce((s, it) => s + it.amount, 0),
      items: councilStatutoryItems,
    },
    ...(geotechnicalSiteItems.length > 0
      ? [
          {
            label: "4. Geotechnical & Site Allowances",
            total: geotechnicalSiteItems.reduce((s, it) => s + it.amount, 0),
            items: geotechnicalSiteItems,
          },
        ]
      : []),
  ];

  const totalVariationsAmount = (pricing.categorySubtotals || []).reduce((s, c) => s + c.amount, 0);
  const totalSpecAndVariations = totalSiteAndStatutorySubtotal + totalVariationsAmount;

  const variationGroups: SpecGroup[] = (pricing.categorySubtotals || []).map((cat) => ({
    label: cat.label,
    total: cat.amount,
    items: cat.items.map((it) => ({
      id: it.id,
      name: it.name,
      description: it.description,
      qtyLabel: it.quantity > 1 ? `${it.quantity} × ${formatAud(it.unitRate)}` : "1 Item",
      amount: it.quantity * it.unitRate,
    })),
  }));

  const allSpecGroups: SpecGroup[] = [
    ...activeSiteSchedule,
    ...variationGroups,
  ];

  const specPages = paginateSpecGroups(allSpecGroups);
  const totalPages = 3 + specPages.length + 2;

  return (
    <div className="quote-pdf-root text-slate-900 font-sans space-y-12 max-w-[210mm] mx-auto print:space-y-0">
      {/* ========================================================================= */}
      {/* PAGE 1: OFFICIAL BUILDERS ESTIMATE COVER PAGE                             */}
      {/* ========================================================================= */}
      <div className="quote-page bg-white w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] p-10 flex flex-col justify-between relative overflow-hidden shadow-2xl box-border print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always">
        {/* Crisp Vector Top Poly Header Banner (Supported 100% in html2canvas) */}
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
            <Logo size={11} />
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
                {[client.lotNumber, client.suburb, "QLD", client.postcode].filter(Boolean).join(" ")}
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
            Hudson Homes Pty Ltd · ABN 49 163 189 071 · Licence 259372C
          </div>
          <div className="font-mono">
            Estimate #{quote.quoteNumber || "MH678"} · Issued {formattedCreatedDate}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 2: EXECUTIVE ESTIMATE & CONSTRUCTION COST SUMMARY                     */}
      {/* ========================================================================= */}
      <div className="quote-page bg-white min-h-[297mm] p-10 flex flex-col justify-between relative shadow-2xl print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-6">
            <Logo size={10} />
            <div className="text-right text-xs">
              <div className="font-bold text-slate-900">Date: {formattedCreatedDate}</div>
              <div className="text-slate-500 font-mono">Estimate No: {quote.quoteNumber || "MH678"}</div>
            </div>
          </div>

          {/* Owner & Job Meta Box */}
          <div className="mb-6">
            <div className="text-xs font-bold uppercase tracking-wider text-cyan-800 mb-2">
              OWNER &amp; ESTIMATE DETAILS
            </div>
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <div>
                  <span className="text-slate-500 text-[10px] block">Owner/s Details:</span>
                  <span className="font-bold text-slate-900">{clientCombinedNames || "Client Name"}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">New Home Consultant:</span>
                  <span className="font-bold text-slate-900">{client.consultantName || "Morgan Hales"}</span>
                  <span className="text-slate-500 text-[11px] block">{client.consultantOffice} · {client.consultantPhone}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Proposed Site Address:</span>
                  <span className="font-bold text-slate-900">{siteAddressFull}</span>
                </div>
              </div>

              <div className="space-y-1">
                <div>
                  <span className="text-slate-500 text-[10px] block">Estimate No / Version:</span>
                  <span className="font-bold text-slate-900 font-mono">{quote.quoteNumber || "MH678"} / Version {client.estimateVersion || 1}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Estimate Valid To:</span>
                  <span className="font-bold text-amber-700 font-mono">{formattedValidDate} (14-day validity)</span>
                </div>
                {client.notes && (
                  <div>
                    <span className="text-slate-500 text-[10px] block">Consultant Notes:</span>
                    <span className="text-slate-700 italic">{client.notes}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Itemized Construction Cost Table */}
          <div className="mb-6">
            <div className="text-xs font-bold uppercase tracking-wider text-cyan-800 mb-2">
              ESTIMATED CONSTRUCTION COST SUMMARY
            </div>

            <table className="w-full text-xs border-collapse border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 text-left">Description</th>
                  <th className="py-2.5 px-3 text-right w-36">Estimated Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr className="font-semibold">
                  <td className="py-2.5 px-3">
                    <div className="text-slate-900 font-bold">
                      {design.mode === "standard"
                        ? `${effectiveDesignName} with ${formatInclusionTierTitle(design.specTier)}`
                        : `Custom Architectural Floorplan (${design.customSpec.storeys === "double" ? "Two" : "Single"} Storey)`}
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal">
                      Living area {totalAreaM2} m² ({(totalAreaM2 * 0.107639).toFixed(1)} sq) · GFA Platform {pricing.gfaM2} m²
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                    {formatAud(pricing.baseHousePrice)}
                  </td>
                </tr>

                {pricing.facadePrice > 0 && (
                  <tr>
                    <td className="py-2 px-3 text-slate-700">
                      <span className="font-semibold text-slate-900">Selected Facade:</span> {design.facadeName}
                      {design.isCustomFacade && design.customFacadeDescription && (
                        <span className="block text-[10px] text-slate-500 italic mt-0.5">
                          {design.customFacadeDescription}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-800">
                      +{formatAud(pricing.facadePrice)}
                    </td>
                  </tr>
                )}

                {/* Builder Promotion on its own distinct emerald highlighted line */}
                {pricing.promotionsDiscount > 0 && (
                  <tr className="text-emerald-800 font-semibold bg-emerald-50/80 border-l-4 border-l-emerald-500">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-900">{pricing.promotionName}</span>
                        <span className="text-[9px] font-bold uppercase bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded">
                          Special Savings
                        </span>
                      </div>
                      <span className="block text-[10px] text-emerald-700">
                        Automated builder promotion applied to base house price
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">
                      -{formatAud(pricing.promotionsDiscount)}
                    </td>
                  </tr>
                )}

                {/* Turnkey Landscaping Package if selected */}
                {(pricing.landscapingCost > 0 || design.landscapingSelected) && (
                  <tr>
                    <td className="py-2 px-3 text-slate-700">
                      <span className="font-semibold text-slate-900">
                        Turnkey Landscaping Package ({design.landscapingLandSize || 450} m² Lot):
                      </span>
                      <span className="block text-[10px] text-slate-500">
                        Includes exposed aggregate driveway &amp; path, treated timber perimeter fencing &amp; gate, turf &amp; garden beds, clothesline, letterbox
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-800 font-semibold">
                      +{formatAud(pricing.landscapingCost)}
                    </td>
                  </tr>
                )}

                {/* Exposed Aggregate Concrete Driveway & Path if selected */}
                {(pricing.exposedDrivewayCost > 0 || design.exposedDrivewaySelected) && (
                  <tr>
                    <td className="py-2 px-3 text-slate-700">
                      <span className="font-semibold text-slate-900">
                        Exposed Aggregate Concrete Driveway &amp; Porch Path ({design.exposedDrivewayM2 || 55} m²):
                      </span>
                      <span className="block text-[10px] text-slate-500">
                        Exposed aggregate concrete paving from council crossover to double garage and front entry porch ($230/m²)
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-800 font-semibold">
                      +{formatAud(pricing.exposedDrivewayCost)}
                    </td>
                  </tr>
                )}

                {/* Site Specific Earthworks & Statutory Inclusions Subtotal */}
                {totalSiteAndStatutorySubtotal > 0 && (
                  <tr>
                    <td className="py-2 px-3 text-slate-700">
                      <span className="font-semibold text-slate-900">Site Specific Earthworks, Engineering &amp; Statutory Requirements:</span>
                      <span className="block text-[10px] text-slate-500">
                        Detailed in Advanced Estimate Specification on Page 4 ({siteConditions.soilClass}, {siteConditions.fallMeters}m Fall, {siteConditions.councilRegion})
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-800 font-semibold">
                      +{formatAud(totalSiteAndStatutorySubtotal)}
                    </td>
                  </tr>
                )}

                {/* Variations Subtotal if any */}
                {hasVariations && (
                  <tr>
                    <td className="py-2 px-3 text-slate-700">
                      <span className="font-semibold text-slate-900">Estimate Variations &amp; Custom Upgrades:</span>
                      <span className="block text-[10px] text-slate-500">
                        Detailed in Advanced Estimate Specification schedule starting on Page 4
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-800 font-semibold">
                      +{formatAud(totalVariationsAmount)}
                    </td>
                  </tr>
                )}

                {/* Total Cost Line */}
                <tr className="border-t-2 border-slate-900 bg-slate-900 text-white font-extrabold text-sm">
                  <td className="py-3 px-3 uppercase tracking-wider">
                    TOTAL ESTIMATED BUILDERS INVESTMENT (INC. GST)
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-base text-amber-400">
                    {formatAud(pricing.grossEstimatedInvestment)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Letter / Notes Summary */}
          <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50 text-[11px] text-slate-600 leading-relaxed space-y-1.5">
            <div className="font-bold text-slate-800">Executive Estimate Notice:</div>
            <p>
              Thank you for the opportunity to present this Builders Estimate for your new Hudson home. This quotation remains valid for 14 days from the date of issue.
            </p>
            <p className="text-[10px] text-slate-500 italic">
              *** This document represents a preliminary Builders Estimate and is subject to geotechnical soil classification, registered contour survey, and developer covenant approval. ***
            </p>
          </div>
        </div>

        {/* Page 2 Footer */}
        <div className="border-t border-slate-200 pt-4 flex items-center justify-between text-[10px] text-slate-500">
          <div>
            Hudson Homes Pty Ltd · ABN: 49 163 189 071 · Builder&apos;s Licence: 259372C
          </div>
          <div className="flex items-center gap-4">
            <div className="border border-slate-400 px-3 py-1 text-[9px] font-bold uppercase text-slate-600 rounded">
              CUSTOMER INITIAL
            </div>
            <div className="font-mono">Page 2 of {totalPages}</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 3: DEDICATED ARCHITECTURAL FACADE RENDER & MAXIMIZED FLOORPLAN       */}
      {/* ========================================================================= */}
      <div className="quote-page bg-white min-h-[297mm] p-10 flex flex-col justify-between relative shadow-2xl print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always">
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-2 mb-2 flex-none">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-700">
                ARCHITECTURAL ELEVATION &amp; FLOORPLAN SPECIFICATIONS
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 leading-tight mt-0.5">
                {design.mode === "standard"
                  ? `${effectiveDesignName} — ${design.specTier}`
                  : "Custom Architectural Floorplan"}
              </h2>
              <div className="text-[11px] text-slate-600 mt-0.5">
                Selected Facade: <span className="font-semibold text-slate-900">{design.facadeName || "Classic"}</span>
                {design.widthM && design.lengthM && (
                  <span> · Dimensions: {design.widthM}m wide × {design.lengthM}m deep</span>
                )}
              </div>
            </div>
            <div className="text-right flex-none">
              <span className="text-[9px] text-slate-500 block uppercase tracking-wider font-semibold">Total Area</span>
              <span className="text-sm font-extrabold text-cyan-700 font-mono">
                {totalAreaM2} m² ({(totalAreaM2 * 0.107639).toFixed(1)} sq)
              </span>
            </div>
          </div>

          {/* Area & Configuration Pill Bar */}
          <div className="grid grid-cols-4 gap-2 bg-slate-50 border border-slate-200 rounded-xl py-1 px-3 mb-1.5 text-center text-xs flex-none">
            <div>
              <span className="text-slate-500 text-[9px] block">Bedrooms:</span>
              <span className="font-bold text-slate-900 text-xs">{design.beds || 4} Beds</span>
            </div>
            <div>
              <span className="text-slate-500 text-[9px] block">Bathrooms:</span>
              <span className="font-bold text-slate-900 text-xs">{design.baths || 2} Baths</span>
            </div>
            <div>
              <span className="text-slate-500 text-[9px] block">Garage:</span>
              <span className="font-bold text-slate-900 text-xs">{design.cars || 2} Cars</span>
            </div>
            <div>
              <span className="text-slate-500 text-[9px] block">GFA Platform:</span>
              <span className="font-bold text-slate-900 text-xs">{pricing.gfaM2} m²</span>
            </div>
          </div>

          {/* Floorplan Room & Zone Sizing Breakdown Bar */}
          {(() => {
            const isMod = !!design.isModifiedFloorplan;
            const modCalc = calculateModifiedFloorplanPricing(design);
            return (
              <div
                className={`border rounded-xl py-1 px-3 mb-2 flex items-center justify-between text-[10px] flex-none ${
                  isMod
                    ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
                    : "bg-slate-50 border-slate-200 text-slate-700"
                }`}
              >
                <div className="font-bold flex items-center gap-1">
                  <span className={isMod ? "text-emerald-800 uppercase tracking-wide font-extrabold" : "text-slate-700 uppercase tracking-wide"}>
                    {isMod ? "Modified Area Schedule:" : "Area Schedule:"}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 font-mono text-[9.5px]">
                  {modCalc.zones.map((z) => (
                    <span key={z.key}>
                      <span className="font-sans text-slate-500 text-[8.5px]">{z.label.replace(" Area", "").replace(" (Optional)", "")}: </span>
                      <span className="font-bold text-slate-900">{z.modifiedM2.toFixed(1)} m²</span>
                    </span>
                  ))}
                  <span className="border-l border-slate-300 pl-2 font-extrabold text-cyan-800">
                    Total: {modCalc.modifiedTotalM2.toFixed(1)} m²
                  </span>
                </div>
              </div>
            );
          })()}

          {/* 1. Chosen Facade Render (Towards the top of the page, high quality & enhanced) */}
          <QuoteFacadeViewer design={design} />

          {/* 2. Architectural Floorplan Layout Drawing (Maximized to fill the lower page area) */}
          <div className="flex-1 w-full border border-slate-200 rounded-2xl p-1 bg-white flex items-center justify-center min-h-[500px] max-h-[550px] overflow-hidden shadow-inner">
            <QuoteFloorplanViewer design={design} />
          </div>
        </div>

        {/* Page 3 Footer */}
        <div className="border-t border-slate-200 pt-3 flex items-center justify-between text-[10px] text-slate-500 flex-none mt-2">
          <div>
            Hudson Homes Pty Ltd · ABN: 49 163 189 071 · Builder&apos;s Licence: 259372C
          </div>
          <div className="flex items-center gap-4">
            <div className="border border-slate-400 px-3 py-1 text-[9px] font-bold uppercase text-slate-600 rounded">
              CUSTOMER INITIAL
            </div>
            <div className="font-mono">Page 3 of {totalPages}</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ADVANCED ESTIMATE SPECIFICATION (COMBINED SITE, STATUTORY & VARIATIONS)   */}
      {/* ========================================================================= */}
      {specPages.map((pageGroups, pageIdx) => {
        const pageNumber = 4 + pageIdx;
        const isFirstSpecPage = pageIdx === 0;

        return (
          <div
            key={`spec-page-${pageIdx}`}
            className="quote-page bg-white min-h-[297mm] p-10 flex flex-col justify-between relative shadow-2xl print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always"
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
                  <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">
                    {isFirstSpecPage ? "Specification & Variations Total" : "Page Subtotal"}
                  </span>
                  <span className="text-sm font-extrabold text-cyan-800 font-mono">
                    +{formatAud(
                      isFirstSpecPage
                        ? totalSpecAndVariations
                        : pageGroups.reduce((s, g) => s + g.total, 0)
                    )}
                  </span>
                </div>
              </div>

              {/* Sub-header info bar on first spec page */}
              {isFirstSpecPage && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 mb-4 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">Council Jurisdiction:</span>
                    <span className="text-slate-700 font-medium">{siteConditions.councilRegion}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-bold text-slate-900">Soil:</span>
                    <span className="text-slate-700 font-medium">{siteConditions.soilClass}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-bold text-slate-900">Topography Fall:</span>
                    <span className="text-slate-700 font-medium">{siteConditions.fallMeters}m</span>
                  </div>
                  <div className="font-mono text-slate-600 text-[11px]">
                    Building Pad: <strong>{pricing.gfaM2} m² GFA</strong>
                  </div>
                </div>
              )}

              {/* Specification Tables */}
              <div className="space-y-3.5">
                {pageGroups.map((group) => (
                  <div
                    key={group.label}
                    className="border border-slate-200/90 rounded-xl overflow-hidden shadow-xs bg-white"
                  >
                    <div className="bg-gradient-to-r from-slate-100 via-slate-50 to-white px-3.5 py-2 border-b border-slate-200 flex justify-between items-center text-xs font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(group.label)}
                        <span className="uppercase tracking-wider text-[11px] font-extrabold text-slate-900">
                          {group.label}
                        </span>
                      </div>
                      <span className="font-mono text-cyan-900 font-extrabold text-xs bg-white px-2.5 py-0.5 rounded-full border border-slate-200/80 shadow-2xs">
                        {group.total === 0 ? "INCLUDED ($0)" : `+${formatAud(group.total)}`}
                      </span>
                    </div>
                    <table className="w-full text-[11px] border-collapse">
                      <tbody className="divide-y divide-slate-100">
                        {group.items.map((it) => (
                          <tr key={it.id} className="hover:bg-slate-50/50">
                            <td className="py-2 px-3.5">
                              <div className="font-bold text-slate-900 text-[11.5px] leading-snug flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-cyan-600 flex-none" />
                                {it.name}
                              </div>
                              {it.description && (
                                <div className="text-[10px] text-slate-500 mt-0.5 leading-snug pl-3">
                                  {it.description}
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center w-28 flex-none">
                              <span className="inline-block bg-slate-100 text-slate-700 font-mono text-[9.5px] px-2 py-0.5 rounded border border-slate-200">
                                {it.qtyLabel}
                              </span>
                            </td>
                            <td className="py-2 px-3.5 text-right font-mono font-bold w-28 text-xs flex-none">
                              {it.amount === 0 ? (
                                <span className="inline-block bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded font-bold text-[9px]">
                                  INCLUDED
                                </span>
                              ) : (
                                <span className="text-cyan-900 font-extrabold">
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
                Hudson Homes Pty Ltd · ABN: 49 163 189 071 · Builder&apos;s Licence: 259372C
              </div>
              <div className="flex items-center gap-4">
                <div className="border border-slate-400 px-3 py-1 text-[9px] font-bold uppercase text-slate-600 rounded">
                  CUSTOMER INITIAL
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
      <div className="quote-page bg-white min-h-[297mm] p-10 flex flex-col justify-between relative shadow-2xl print:shadow-none print:min-h-0 print:h-[297mm] print:page-break-after-always">
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
        </div>

        {/* Inclusions Page Footer */}
        <div className="border-t border-slate-200 pt-4 flex items-center justify-between text-[10px] text-slate-500">
          <div>
            Hudson Homes Pty Ltd · ABN: 49 163 189 071 · Builder&apos;s Licence: 259372C
          </div>
          <div className="flex items-center gap-4">
            <div className="border border-slate-400 px-3 py-1 text-[9px] font-bold uppercase text-slate-600 rounded">
              CUSTOMER INITIAL
            </div>
            <div className="font-mono">Page {3 + specPages.length + 1} of {totalPages}</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FINAL PAGE: LIFETIME GUARANTEE, DEPOSIT & OFFICIAL NAB BANK TRANSFER      */}
      {/* ========================================================================= */}
      <div className="quote-page bg-white min-h-[297mm] p-10 flex flex-col justify-between relative shadow-2xl print:shadow-none print:min-h-0 print:h-[297mm]">
        <div className="space-y-5">
          {/* Top Lifetime Structural Guarantee Banner */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md text-center space-y-2 border border-slate-800">
            <div className="text-[11px] font-bold tracking-widest text-amber-400 uppercase">
              HUDSON HOMES PEACE OF MIND
            </div>
            <h3 className="text-2xl font-serif italic text-white tracking-wide">
              Lifetime Structural Integrity Guarantee
            </h3>
            <p className="text-xs text-slate-300 max-w-xl mx-auto leading-relaxed">
              Every Hudson home is engineered and constructed to the highest standards of Australian building compliance.
              We proudly back our workmanship with a **Lifetime Structural Integrity Guarantee** for total peace of mind.
            </p>
            <div className="pt-2 flex items-center justify-center gap-6 text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
              <span>★ 100% Australian Owned</span>
              <span>★ Lifetime Structural Guarantee</span>
              <span>★ ISO 9001 Certified</span>
              <span>★ 12-Month Defect Period</span>
            </div>
          </div>

          {/* Initial Deposit Allocation Box */}
          <div className="border border-emerald-500/40 rounded-2xl p-5 bg-emerald-50/30 space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
              <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  INITIAL DEPOSIT TO PROCEED
                </span>
                <span className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  {client.depositType === "brownfield" ? "Brownfield Site Allocation" : "Greenfield Site Allocation"}
                  {client.custom3dTourSelected && (
                    <span className="text-xs font-bold text-cyan-800 bg-cyan-100 border border-cyan-300 px-2 py-0.5 rounded-full font-mono">
                      + Custom 3D Virtual Tour
                    </span>
                  )}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                  Deposit Amount
                </span>
                <span className="text-2xl font-black text-emerald-700 font-mono">
                  {formatAud(pricing.initialDepositAmount || (client.custom3dTourSelected ? (client.depositType === "brownfield" ? 4100 : 2450) : (client.depositType === "brownfield" ? 3300 : 1650)))}
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-700">
              <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                <FileCheck2 className="h-3.5 w-3.5 text-emerald-700" />
                Preliminary Work Completed as a result of the Initial Deposit:
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-600">
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
          <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 flex items-center justify-between gap-6 shadow-sm">
            <div className="space-y-2.5 text-xs flex-1">
              <div className="font-bold text-cyan-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Building className="h-4 w-4 text-cyan-700" />
                HUDSON HOMES QLD BANK DETAILS
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] block">Account Name:</span>
                  <span className="font-bold text-slate-900">Hudson Homes (QLD) Pty Ltd</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Bank:</span>
                  <span className="font-bold text-slate-900">National Australia Bank (NAB)</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">BSB Number:</span>
                  <span className="font-extrabold text-slate-900 font-mono text-sm tracking-wider">082 778</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Account Number:</span>
                  <span className="font-extrabold text-slate-900 font-mono text-sm tracking-wider">74-586-5607</span>
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-slate-500 text-[10px] block">EFT Payment Remittance Reference:</span>
                  <span className="font-extrabold text-cyan-800 font-mono text-sm">
                    {client.clientName ? `${client.clientName.split(" ").pop()}-${quote.quoteNumber || "MH678"}` : `Client-${quote.quoteNumber || "MH678"}`}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 uppercase font-mono font-bold">Currency: AUD</span>
              </div>
            </div>

            {/* Dynamic Payment QR Code Box */}
            <div className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-xl text-center flex-none shadow-xs">
              <PaymentQrCode
                accountName="Hudson Homes (QLD) Pty Ltd"
                bsb="082 778"
                accountNumber="74-586-5607"
                amount={pricing.initialDepositAmount || 1650}
                reference={client.clientName ? `${client.clientName.split(" ").pop()}-${quote.quoteNumber || "MH678"}` : `Client-${quote.quoteNumber || "MH678"}`}
                size={95}
              />
              <span className="text-[9px] font-bold text-slate-700 mt-1.5 uppercase font-mono tracking-wider">
                Scan with Banking App
              </span>
            </div>
          </div>

          {/* Customer & Consultant Authorization Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-2">
            <div className="space-y-4">
              <div className="text-[10px] font-bold uppercase text-slate-600 tracking-wider">
                CLIENT 1 SIGNATURE:
              </div>
              <div className="border-b-2 border-slate-900 h-10 flex items-end pb-1 text-slate-400 italic text-xs">
                {/* Space for physical or digital signing */}
              </div>
              <div className="text-xs">
                <span className="font-bold text-slate-900 block">{client.clientName || "Primary Applicant"}</span>
                <span className="text-[10px] text-slate-500">Date: ____ / _____ / 2026</span>
              </div>

              {client.hasClient2 && (
                <div className="pt-2 space-y-4">
                  <div className="text-[10px] font-bold uppercase text-slate-600 tracking-wider">
                    CLIENT 2 SIGNATURE:
                  </div>
                  <div className="border-b-2 border-slate-900 h-10 flex items-end pb-1 text-slate-400 italic text-xs">
                    {/* Space for Client 2 signature */}
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-slate-900 block">{client.client2Name || "Secondary Applicant"}</span>
                    <span className="text-[10px] text-slate-500">Date: ____ / _____ / 2026</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="text-[10px] font-bold uppercase text-slate-600 tracking-wider">
                AUTHORISED NEW HOME CONSULTANT:
              </div>
              <div className="border-b-2 border-slate-900 h-10 flex items-end pb-1 text-slate-400 italic text-xs">
                {/* Space for consultant signing */}
              </div>
              <div className="text-xs">
                <span className="font-bold text-slate-900 block">{client.consultantName || "Morgan Hales"}</span>
                <span className="text-[10px] text-slate-500">{client.consultantOffice} · {client.consultantPhone}</span>
                <span className="text-[10px] text-slate-500 block">Date: {formattedCreatedDate}</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[9px] text-slate-500 space-y-0.5">
                <div className="font-bold text-slate-700">Hudson Homes Pty Ltd</div>
                <div>Level 5, 106 City Road, Beenleigh QLD 4207</div>
                <div>Phone: 1300 246 200 · Fax: 1300 246 300 · www.hudsonhomes.com.au</div>
              </div>
            </div>
          </div>
        </div>

        {/* Final Page Footer */}
        <div className="border-t border-slate-200 pt-4 flex items-center justify-between text-[10px] text-slate-500">
          <div>
            Hudson Homes Pty Ltd · ABN: 49 163 189 071 · Builder&apos;s Licence: 259372C
          </div>
          <div className="flex items-center gap-4">
            <div className="border border-slate-400 px-3 py-1 text-[9px] font-bold uppercase text-slate-600 rounded">
              CUSTOMER INITIAL
            </div>
            <div className="font-mono">Page {totalPages} of {totalPages}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
