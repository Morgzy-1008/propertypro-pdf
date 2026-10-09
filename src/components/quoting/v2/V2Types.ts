import type { FullQuote, SoilClass } from "@/lib/quoting/quoteTypes";

export type V2StepId = "client" | "floorplan" | "inclusions" | "site_costs" | "variations" | "review";

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
    label: "Floor Plan",
    shortLabel: "Design",
    description: "Select design or upload modified plan",
  },
  {
    id: "inclusions",
    number: 3,
    label: "Inclusions",
    shortLabel: "Inclusions",
    description: "Choose specification level",
  },
  {
    id: "site_costs",
    number: 4,
    label: "Site Costs",
    shortLabel: "Site Costs",
    description: "Select site preset or adjust land conditions",
  },
  {
    id: "variations",
    number: 5,
    label: "Floor Plan Inclusions & Variations",
    shortLabel: "Variations",
    description: "Popular upgrades and plan modifications",
  },
  {
    id: "review",
    number: 6,
    label: "Review & Export",
    shortLabel: "Review",
    description: "Final estimate summary and export",
  },
];

export interface SiteCostPreset {
  id: string;
  title: string;
  tagline: string;
  estimatedCostLabel: string;
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
    estimatedCostLabel: "$0 Included in Base",
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
    tagline: "Minor slope & standard reactive clay",
    estimatedCostLabel: "~$12,500 Allowance",
    soilClass: "Class H1",
    fallMeters: 0.5,
    piering: true,
    sediment: true,
    demo: false,
    description: "Highly reactive Class H1 soil, 0.5m contour fall, concrete screw piering allowance and asset protection.",
  },
  {
    id: "sloping_reactive",
    title: "Sloping & Heavy Clay Lot",
    tagline: "Moderate fall, severe soil & rock risk",
    estimatedCostLabel: "~$28,500 Allowance",
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
    estimatedCostLabel: "~$48,000 Allowance",
    soilClass: "Class H1",
    fallMeters: 0.8,
    piering: true,
    sediment: true,
    demo: true,
    description: "Demolition allowance, council traffic control, asbestos removal buffer, post-demo contour & soil survey.",
  },
];

export interface PopularVariationPreset {
  id: string;
  name: string;
  category: "internal_kitchen" | "internal_bathroom" | "structural" | "colour_upgrades" | "floorplan_extensions" | "external";
  description: string;
  price: number;
  highlight?: string;
}

export const POPULAR_VARIATIONS: PopularVariationPreset[] = [
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
