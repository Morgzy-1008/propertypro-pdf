import type { FullQuote, SoilClass } from "@/lib/quoting/quoteTypes";

export type V2StepId = "client" | "floorplan" | "site_costs" | "variations" | "review";

export interface V2StepConfig {
  id: V2StepId;
  number: number;
  label: string;
  shortLabel: string;
  description: string;
}

export const V2_STEPS: V2StepConfig[] = [
  {
    id: "client",
    number: 1,
    label: "Client Details",
    shortLabel: "Client",
    description: "Who is this estimate for?",
  },
  {
    id: "floorplan",
    number: 2,
    label: "Floor Plan & Inclusions",
    shortLabel: "Design & Façade",
    description: "House type, floor plan, inclusions & façade",
  },
  {
    id: "site_costs",
    number: 3,
    label: "Site Costs",
    shortLabel: "Site Costs",
    description: "Site type, slope fall, soil, allowances & council",
  },
  {
    id: "variations",
    number: 4,
    label: "House Variations",
    shortLabel: "Variations",
    description: "Popular upgrades, sqm rates & client requests",
  },
  {
    id: "review",
    number: 5,
    label: "Review & Export",
    shortLabel: "Review",
    description: "Turnkey investment hero & instant PDF",
  },
];

export interface SiteCostPreset {
  id: string;
  title: string;
  tagline: string;
  soilClass: SoilClass;
  fallMeters: number;
  piering: boolean;
  sediment: boolean;
  demo: boolean;
  description: string;
}

export const SITE_COST_PRESETS: SiteCostPreset[] = [
  {
    id: "flat_greenfield",
    title: "Standard Flat Greenfield",
    tagline: "Standard new estate flat block",
    soilClass: "Class M",
    fallMeters: 0,
    piering: false,
    sediment: true,
    demo: false,
    description: "Moderately reactive Class M soil with zero fall. Standard foundation allowance with council certifications.",
  },
  {
    id: "typical_suburban",
    title: "Typical Suburban Estate",
    tagline: "Standard reactive clay & piering",
    soilClass: "Class H1",
    fallMeters: 0.5,
    piering: true,
    sediment: true,
    demo: false,
    description: "Class H1 reactive soil, 0.5m contour fall, concrete screw piering allowance and sediment asset protection.",
  },
  {
    id: "sloping_reactive",
    title: "Sloping & Heavy Clay Lot",
    tagline: "Moderate fall, severe soil & rock risk",
    soilClass: "Class H2",
    fallMeters: 1.2,
    piering: true,
    sediment: true,
    demo: false,
    description: "Class H2 severe clay, 1.2m cross-fall earthworks, retaining wall allowance, rock excavation allowance.",
  },
  {
    id: "knockdown_rebuild",
    title: "Knockdown Rebuild / Brownfield",
    tagline: "Infill site with existing dwelling",
    soilClass: "Class H1",
    fallMeters: 0.8,
    piering: true,
    sediment: true,
    demo: true,
    description: "Demolition allowance, council traffic control, asbestos removal buffer, post-demo contour & soil survey.",
  },
];

/**
 * Dynamically calculates the estimated site works cost for a preset based on the actual house GFA.
 */
export function calculatePresetCost(preset: SiteCostPreset, gfaM2: number, isSplit: boolean = false): number {
  if (preset.id === "flat_greenfield") return 0;
  const effectiveGfa = Math.max(100, gfaM2 || 192);

  const soilRate = preset.soilClass === "Class H1" ? 30 : preset.soilClass === "Class H2" ? 55 : preset.soilClass === "Class E" ? 80 : 0;
  const soilTotal = Math.round(soilRate * effectiveGfa);

  let fallTotal = 0;
  if (preset.fallMeters > 1.0) {
    const excess = preset.fallMeters - 1.0;
    const rate = isSplit ? 12.5 : 15.0;
    fallTotal = Math.round(excess * 10 * rate * effectiveGfa);
  }

  const pieringCost = preset.piering ? Math.round(effectiveGfa * 90) : 0;
  const sedimentCost = preset.sediment ? 1950 : 0;

  let extra = 0;
  if (preset.id === "sloping_reactive") {
    extra = 7500 + 5000; // retaining wall + rock excavation
  } else if (preset.id === "knockdown_rebuild") {
    extra = 34500 + 6500; // demolition buffer + traffic control
  }

  return soilTotal + fallTotal + pieringCost + sedimentCost + extra;
}

export interface PopularVariationPreset {
  id: string;
  name: string;
  category: "internal_kitchen" | "internal_bathroom" | "structural" | "colour_upgrades" | "floorplan_extensions" | "external";
  description: string;
  price: number;
  highlight?: string;
  unitType?: "fixed" | "sqm";
  unitRate?: number;
}

export const POPULAR_VARIATIONS: PopularVariationPreset[] = [
  {
    id: "pop_driveway_sqm",
    name: "Exposed Aggregate Concrete Driveway & Path",
    category: "external",
    description: "Architectural decorative exposed aggregate driveway and pedestrian porch lead walk path.",
    price: 125,
    unitType: "sqm",
    unitRate: 125,
    highlight: "$125/m² rate",
  },
  {
    id: "pop_porcelain_sqm",
    name: "600x600 Rectified Porcelain Floor Tiling Upgrade",
    category: "colour_upgrades",
    description: "Premium large-format porcelain vitrified tiles to entry, hallway, kitchen, meals, and family living areas.",
    price: 85,
    unitType: "sqm",
    unitRate: 85,
    highlight: "$85/m² rate",
  },
  {
    id: "pop_hybrid_flooring_sqm",
    name: "Hybrid Timber-Look Waterproof Flooring",
    category: "colour_upgrades",
    description: "Commercial-grade 8.5mm hybrid acoustic timber plank flooring with acoustic underlay throughout living zones.",
    price: 95,
    unitType: "sqm",
    unitRate: 95,
    highlight: "$95/m² rate",
  },
  {
    id: "pop_alfresco_slab_sqm",
    name: "Under-Roof Extended Alfresco Footprint",
    category: "floorplan_extensions",
    description: "Structural extension to the concrete slab, roofline, soffit lining, and perimeter columns of the outdoor Alfresco.",
    price: 490,
    unitType: "sqm",
    unitRate: 490,
    highlight: "$490/m² rate",
  },
  {
    id: "pop_ceiling_2740",
    name: "2740mm Ground Floor Ceiling Height Upgrade",
    category: "structural",
    description: "Upgrade from standard 2440mm ceiling height to 2740mm (9ft) throughout ground floor living zones, increasing natural light and volume.",
    price: 6850,
    highlight: "Popular for luxury feel",
  },
  {
    id: "pop_h1_ducted_ac",
    name: "Ducted Inverter Air Conditioning System",
    category: "colour_upgrades",
    description: "Multi-zone reverse-cycle ducted air conditioning system with digital touchpad controller.",
    price: 9450,
    highlight: "Essential QLD comfort",
  },
  {
    id: "pop_waterfall_40mm",
    name: "40mm Engineered Stone Island Waterfall Ends",
    category: "internal_kitchen",
    description: "40mm engineered stone mitred waterfall ends to both sides of the central kitchen island bench.",
    price: 2450,
    highlight: "Designer kitchen feature",
  },
  {
    id: "pop_alfresco_rake",
    name: "High Rake Rafter Ceiling to Alfresco",
    category: "structural",
    description: "Vaulted rake ceiling with James Hardie lining and outdoor ceiling fan pre-wire to outdoor living.",
    price: 3200,
    highlight: "Great outdoor entertaining",
  },
  {
    id: "pop_tiles_ceiling_bath",
    name: "Floor-to-Ceiling Bathroom & Ensuite Wall Tiles",
    category: "internal_bathroom",
    description: "Rectified porcelain wall tiles laid floor-to-ceiling across Main Bathroom and Master Ensuite.",
    price: 3850,
    highlight: "Sleek hotel finish",
  },
  {
    id: "pop_cooker_900",
    name: "900mm Freestanding European Cooker & Canopy",
    category: "internal_kitchen",
    description: "Upgrade to 900mm stainless steel freestanding gas/electric range cooker and ducted canopy rangehood.",
    price: 1850,
    highlight: "Chef's kitchen",
  },
  {
    id: "pop_alfresco_extension_12m",
    name: "Under-Roof Alfresco Footprint Extension (+12m²)",
    category: "floorplan_extensions",
    description: "Structural extension to the concrete slab, roofline, soffit lining, and perimeter columns of the outdoor Alfresco.",
    price: 5880,
    highlight: "Extra outdoor space",
  },
  {
    id: "pop_colourbond_roof",
    name: "Colorbond® Steel Roof Upgrade",
    category: "external",
    description: "Upgrade from standard concrete roof tiles to Bluescope Colorbond® custom orb steel sheeting with Thermatech® technology.",
    price: 4950,
    highlight: "Modern street appeal",
  },
  {
    id: "pop_epoxy_garage",
    name: "Seamless Epoxy Coating to Garage Floor",
    category: "external",
    description: "Two-coat commercial-grade epoxy coating with decorative flake finish to double garage concrete slab.",
    price: 1950,
    highlight: "Clean & durable",
  },
  {
    id: "pop_ev_charger_32a",
    name: "32A Electric Vehicle (EV) Dedicated Circuit",
    category: "colour_upgrades",
    description: "Dedicated 32A single-phase power supply to garage with isolator switch, ready for EV wallbox charger installation.",
    price: 1250,
    highlight: "Future proofing",
  },
];

export interface QuickQuoteTemplate {
  id: string;
  name: string;
  badge: string;
  tagline: string;
  client: {
    clientName: string;
    clientPhone: string;
    clientEmail: string;
    siteAddress: string;
    suburb: string;
    estate: string;
    lotNumber: string;
    hasClient2?: boolean;
    client2Name?: string;
  };
  designName: string;
  housingType: string;
  specTier: "H1 Smart Living" | "H2 Design Collection" | "H3 Luxury Inclusions";
  sitePresetId: string;
  variationIds: string[];
}

export const QUICK_QUOTE_TEMPLATES: QuickQuoteTemplate[] = [
  {
    id: "family_amber21",
    name: "Popular Family Home",
    badge: "Most Popular",
    tagline: "Amber 21 • H2 Design • Ducted AC & 2740mm Ceilings",
    client: {
      clientName: "David & Sarah Miller",
      clientPhone: "0412 345 678",
      clientEmail: "david.miller@example.com.au",
      siteAddress: "42 Sanctuary Boulevard",
      suburb: "North Lakes",
      estate: "The Sanctuary",
      lotNumber: "Lot 108",
      hasClient2: true,
      client2Name: "Sarah Miller",
    },
    designName: "Amber 21",
    housingType: "Single Storey",
    specTier: "H2 Design Collection",
    sitePresetId: "typical_suburban",
    variationIds: ["pop_ceiling_2740", "pop_h1_ducted_ac"],
  },
  {
    id: "first_home_azure19",
    name: "First Home Buyer Package",
    badge: "Great Value",
    tagline: "Azure 19 • H1 Smart Living • Turnkey Greenfield",
    client: {
      clientName: "Alex & Jordan Taylor",
      clientPhone: "0433 112 233",
      clientEmail: "alex.taylor@example.com.au",
      siteAddress: "15 Peppercorn Way",
      suburb: "Ripley",
      estate: "Ripley Valley",
      lotNumber: "Lot 44",
    },
    designName: "Azure 19",
    housingType: "Single Storey",
    specTier: "H1 Smart Living",
    sitePresetId: "flat_greenfield",
    variationIds: ["pop_h1_ducted_ac"],
  },
  {
    id: "luxury_double",
    name: "Executive Knockdown Rebuild",
    badge: "Luxury Living",
    tagline: "Deco 30 • H3 Luxury Living • Knockdown Infill Package",
    client: {
      clientName: "Michael & Emma Watson",
      clientPhone: "0401 987 654",
      clientEmail: "michael.watson@example.com.au",
      siteAddress: "88 Stanley Terrace",
      suburb: "Indooroopilly",
      estate: "Established Metro",
      lotNumber: "Lot 12",
    },
    designName: "Deco 30",
    housingType: "Double Storey",
    specTier: "H3 Luxury Inclusions",
    sitePresetId: "knockdown_rebuild",
    variationIds: ["pop_waterfall_40mm", "pop_tiles_ceiling_bath", "pop_epoxy_garage"],
  },
];
