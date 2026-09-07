import { defaultCosts, type AdditionalCosts } from "@/lib/additionalCosts";
import { LANDSCAPE_INCLUSIONS } from "@/lib/landscaping";

export type TemplateId = "express" | "showcase" | "house-only" | "siting";

export type RangeId = "value" | "designer" | "luxury";

/** Perks offered across every inclusion range. */
const COMMON_INCLUSIONS = ["$0 Fee Customisation", "Other Plans Available"];

export const INCLUSION_RANGES: { id: RangeId; label: string; items: string[] }[] = [
  {
    id: "value",
    label: "Value Range",
    items: [
      "Laminate Benchtops",
      "2440mm Ceilings",
      "Split System AC",
      "Ceramic Tiles + Carpet to Bedrooms",
      "Ceiling Fans",
      "Site Costs",
      "7 Star Energy",
      "Exposed Agg Driveway",
      "Lifetime Guarantee",
      ...COMMON_INCLUSIONS,
    ],
  },
  {
    id: "designer",
    label: "Designer Range",
    items: [
      "Stone Benchtops",
      "2590mm Ceilings",
      "Ducted AC",
      "Ceramic Tiles + Carpet to Bedrooms",
      "Ceiling Fans",
      "Site Costs",
      "7 Star Energy",
      "Exposed Agg Driveway",
      "Lifetime Guarantee",
      ...COMMON_INCLUSIONS,
    ],
  },
  {
    id: "luxury",
    label: "Luxury Range",
    items: [
      "40mm Stone Benchtops",
      "Zoned Ducted AC",
      "600mm Tiles or Hybrid + Carpet to Bedrooms",
      "Ceiling Fans",
      "Site Costs",
      "7 Star Energy",
      "Exposed Agg Driveway",
      "Lifetime Guarantee",
      ...COMMON_INCLUSIONS,
    ],
  },
];


export function baseRangeItems(d: { range: RangeId; inclusions?: Inclusions }) {
  return d.inclusions?.[d.range] ?? getRange(d.range).items;
}

/** Inclusions printed on the flyer — the landscaping package adds its own
 *  lines and replaces the standalone driveway line. */
export function rangeItems(d: { range: RangeId; inclusions?: Inclusions; landscaping?: boolean }) {
  const items = baseRangeItems(d);
  if (!d.landscaping) return items;
  const isCommon = (i: string) => COMMON_INCLUSIONS.some((c) => c.toLowerCase() === i.toLowerCase());
  const kept = items.filter((i) => !/exposed agg driveway/i.test(i) && !isCommon(i));
  const tail = items.filter(isCommon);
  // The perks always finish the list, so the landscaping lines slot in above them.
  return [...kept, ...LANDSCAPE_INCLUSIONS, ...tail];
}

export function getRange(id: RangeId) {
  return INCLUSION_RANGES.find((r) => r.id === id) ?? INCLUSION_RANGES[0];
}

export type Inclusions = Record<RangeId, string[]>;

export const defaultInclusions = (): Inclusions =>
  INCLUSION_RANGES.reduce((acc, r) => {
    acc[r.id] = [...r.items];
    return acc;
  }, {} as Inclusions);

export interface OtherSize {
  label: string;
  size: string;
}

export interface FlyerData {
  id?: string;
  packageId?: string;
  lotId: string;
  suburb: string;
  estate: string;
  address: string;

  costs: AdditionalCosts;
  landscaping: boolean;
  price: string;

  housePrice: string;
  landPrice: string;
  housingType: string;
  designName: string;
  floorplanName: string;
  floorplanSize: string;
  landSize: string;
  landFrontage: string;
  beds: string;
  baths: string;
  cars: string;
  headline: string;
  range: RangeId;
  inclusions: Inclusions;
  otherSizes: OtherSize[];
  showOtherSizes: boolean;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  contactOffice: string;
  facadeUrl: string;
  rawFacadeUrl?: string;
  floorplanUrl: string;
  facadeId: string;
  facadeName: string;
  facadeBusy?: boolean;
  palette: PaletteId;
  consultantId: string;
  houseWidthM?: number;
  houseLengthM?: number;
  estatePreset?: string;
  frontSetback?: string | number;
  garageSetback?: string | number;
  sideSetback?: string | number;
  isBtb?: boolean;
  garageSide?: "left" | "right";
  houseRotation?: number;
  leftSetback?: string | number;
  rightSetback?: string | number;
  termsType?: TermsType;
  customTerms?: string;
  rearSetback?: string | number;
}

export type TermsType = "concise" | "full" | "custom";

export const DEFAULT_TERMS_CONCISE =
  "Terms & conditions apply. Package price excludes stamp duty, registration and legal fees. Standard site costs apply to a cleared residential site up to 450m² with 1m fall, M-class slab and services to boundary. Facade renders, floorplans and landscaping are indicative only and subject to developer and statutory approvals. Pricing subject to change without notice. © Hudson Homes Pty Ltd ABN 92 623 431 685. Builders Lic: 15078318.";

export const DEFAULT_TERMS_FULL =
  "Terms and conditions apply. Images are indicative only. Floor plans based on Classic facade and will adjust for alternatives. Standard included site costs are for a cleared residential site up to 450m2, with up to 1 metre fall across the building platform, M class slab and with all services available at site boundaries (excludes battle-axe and rural sites). Home and Land packages are subject to developer design and statutory authorities' approval. Additional allowances may be required for an individual lots or housing estates. Package pricing does not include stamp duty, legal fees or other costs that may be incurred with the purchase of land. Photographs and other images used within marketing material may show fixtures, fittings or finishes which are not supplied by Hudson Homes, or which are only available in some designs or when selected as additional upgrades. Please speak to a Hudson Homes New Home Consultant who is able to provide a building contract that specifically outlines the fixtures, finishes and features that you will receive, and selections from the builder's standard range. Hudson Homes agrees to complete construction of the home on time as specified in the signed HIA agreement (subject to any inclement weather, holiday period closure or other permissible time extensions that are beyond our control). Hudson Homes reserves the right to alter any advertised price without notice. Other promotional offers by Hudson Homes are not applicable unless specified. All plans and images are copyright of Hudson Homes Pty Ltd ABN 92 623 431 685. Builders Lic: 15078318.";

export function getTermsText(d: FlyerData): string {
  if (d.termsType === "full") return DEFAULT_TERMS_FULL;
  if (d.termsType === "custom" && d.customTerms?.trim()) return d.customTerms.trim();
  return DEFAULT_TERMS_CONCISE;
}

export type PaletteId = "heritage" | "coastal" | "forest" | "slate";

export const PALETTES: { id: PaletteId; label: string; hint: string }[] = [
  { id: "heritage", label: "Heritage Navy & Gold", hint: "Deep navy, warm gold, cream" },
  { id: "coastal", label: "Coastal Teal & Copper", hint: "Teal ink, copper accent, ivory" },
  { id: "forest", label: "Forest & Brass", hint: "Deep eucalypt green, brass, linen" },
  { id: "slate", label: "Slate & Terracotta", hint: "Charcoal slate, terracotta, chalk" },
];

export const defaultFlyer: FlyerData = {
  lotId: "",
  suburb: "",
  estate: "",
  address: "",

  costs: defaultCosts("single-storey"),
  landscaping: false,

  price: "",
  housePrice: "",
  landPrice: "",
  housingType: "single-storey",
  designName: "",
  floorplanName: "",
  floorplanSize: "",
  landSize: "",
  landFrontage: "",
  beds: "",
  baths: "",
  cars: "",
  headline: "House & Land Package",
  range: "designer",
  inclusions: defaultInclusions(),
  otherSizes: [],
  showOtherSizes: true,
  contactName: "Morgan Hales",
  contactPhone: "0417 571 864",
  contactEmail: "Morgan.hales@hudsonhomes.com.au",
  contactOffice: "Hudson Homes Queensland",
  facadeUrl: "",
  rawFacadeUrl: "",
  floorplanUrl: "",
  facadeId: "",
  facadeName: "",
  palette: "heritage",
  consultantId: "morgan",
  termsType: "concise",
  customTerms: "",
};

