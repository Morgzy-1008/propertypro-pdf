export type AvailabilityStatus =
  | "verified_available"
  | "pending_outreach"
  | "under_offer"
  | "sold";

export type SlopeCategory = "flat" | "moderate" | "steep";
export type BalRating = "BAL-LOW" | "BAL-12.5" | "BAL-19" | "BAL-29" | "BAL-40" | "BAL-FZ";
export type DealScoreRating = "strong_buy" | "fair_value" | "premium" | "speculative_buy";

export interface ComparableSale {
  id: string;
  address: string;
  landSizeM2: number;
  salePrice: number;
  saleDate: string;
  frontageM: number;
  pricePerM2: number;
}

export interface ValuationMetrics {
  medianSuburbLandPrice: number;
  medianSuburbPricePerM2: number;
  priceDeltaPercent: number; // e.g. -12.5% below median or +5%
  dealScoreRating: DealScoreRating;
  dealScorePoints: number; // 0 - 100
  dealSummary: string;
  estimatedBuildCost: number; // Turnkey Hudson single-storey estimate
  estimatedTurnkeyTotalCost: number; // Land + Build
  estimatedCompletedMarketValue: number; // Expected resale value of finished house & land
  projectedGrossEquityMargin: number; // Completed Market Value - (Land + Build)
  projectedEquityMarginPercent: number; // Margin %
  acquisitionRecommendation: "Hudson Spec Purchase" | "Client Packaging Only" | "Hold For Negotiation";
  comparableSales: ComparableSale[];
}

export interface FeasibilityRadar {
  fallEstimateM: number;
  slopeCategory: SlopeCategory;
  balRating: BalRating;
  floodRisk: "none" | "low_overland" | "high_flood";
  easementNotes: string;
  isBtbPermissible: boolean;
  soilProfileSummary: string;
  councilLga: string;
}

export interface MatchingHudsonDesign {
  designName: string;
  floorplanM2: number;
  houseWidthM: number;
  houseLengthM: number;
  beds: number;
  baths: number;
  cars: number;
  estimatedHousePrice: number;
  estimatedPackagePrice: number;
  minFrontageRequired: number;
  sitingFitNote: string;
}

export interface OutreachEntry {
  id: string;
  timestamp: string;
  consultantName: string;
  channel: "email" | "sms" | "phone";
  inquiryType: "availability_check" | "builder_hold" | "disclosure_plan_request" | "price_negotiation";
  notes: string;
  status: "sent" | "confirmed_available" | "under_offer" | "sold";
}

export interface LandParcel {
  id: string;
  lotNumber: string;
  streetAddress: string;
  suburb: string;
  estate: string;
  state: "QLD" | "NSW";
  postcode: string;
  council: string;

  // Dimensions & Financials
  landSizeM2: number;
  frontageM: number;
  depthM: number;
  price: number;
  pricePerM2: number;

  // Title / Registration
  isRegistered: boolean;
  expectedRegistrationDate: string; // e.g. "Registered Now", "Q3 2026", "October 2026"
  zoning: string;

  // Availability
  availabilityStatus: AvailabilityStatus;
  lastVerifiedAt: string;

  // Source & Agent Contacts
  sourcePortal: "OpenLot" | "Domain" | "realestate.com.au" | "Stockland" | "Lendlease" | "Landcom" | "Developer Direct";
  listingUrl: string;
  agentName: string;
  agentAgency: string;
  agentPhone: string;
  agentEmail: string;
  agentAvatarUrl?: string;

  // Site Intelligence
  feasibility: FeasibilityRadar;

  // Valuation & Investment Appraisal
  valuation: ValuationMetrics;

  // Hudson House & Land Pairing
  matchingDesigns: MatchingHudsonDesign[];
  suggestedDesign: string;

  // Outreach & Communication History
  outreachHistory: OutreachEntry[];

  // Coordinates for Map
  lat: number;
  lng: number;
}

export interface LandScoutFilterState {
  searchQuery: string;
  state: "ALL" | "QLD" | "NSW";
  suburbOrEstate: string;
  minPrice?: number;
  maxPrice?: number;
  minLandSize?: number;
  maxLandSize?: number;
  minFrontage?: number;
  isRegisteredOnly?: boolean;
  availabilityOnly?: boolean;
  strongBuysOnly?: boolean;
  sortBy: "deal_score" | "price_asc" | "price_desc" | "size_desc" | "frontage_desc" | "newest";
}
