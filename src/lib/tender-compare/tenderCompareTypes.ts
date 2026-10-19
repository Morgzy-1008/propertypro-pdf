export type HousingStoreyType = "Single Storey" | "Double Storey" | "Split Level" | "Dual Living";

export type InclusionStatus = "included" | "upgrade_required" | "provisional_sum" | "excluded";

export type SiteCostCertainty = "fixed" | "semi_fixed" | "provisional_allowance";

export type RiskLevel = "low" | "medium" | "high";

export type InclusionCategoryKey =
  | "site_slab"
  | "structural_envelope"
  | "ceilings_doors_windows"
  | "kitchen_scullery"
  | "bathrooms_wet_areas"
  | "hvac_electrical"
  | "flooring_finishes"
  | "facade_external"
  | "turnkey_external"
  | "kitchen"
  | "bathroom"
  | "ceilings_doors"
  | "electrical"
  | "hvac"
  | "flooring"
  | "structural"
  | "turnkey";

export interface InclusionComparisonItem {
  id: string;
  category: InclusionCategoryKey;
  categoryLabel: string;
  featureName: string;
  specification: string;
  status: InclusionStatus;
  estimatedOmissionCost: number; // Cost to add this item if missing or inferior
  notes?: string;
  sourceEvidence?: string; // e.g. "Tender p.4 / Builder Standard Inclusions Brochure"
}

export interface DesignArchitectureBreakdown {
  totalAreaM2: number;
  totalAreaSquares: number;
  groundFloorLivingM2: number;
  upperFloorLivingM2: number;
  garageM2: number;
  alfrescoM2: number;
  porchAndBalconyM2: number;
  overallWidthM: number;
  overallLengthM: number;
  minimumLotWidthM: number;
  sizeDifferenceVsBenchmarkM2: number; // e.g. -14.5 m² smaller or +8.2 m² larger
  sizeValueAdjustmentAud: number; // Dollar adjustment for floorplan size difference
  bedroomsCount: number;
  masterBedroomDimensions: string; // e.g. "4.2m × 3.9m + WIR + Ensuite"
  secondaryBedroomsDimensions: string; // e.g. "Bed 2–4: 3.1m × 3.0m with built-in robes"
  bathroomsCount: number; // e.g. 2 or 2.5
  ensuitesCount: number;
  powderRoomsCount: number;
  kitchenCount: number;
  kitchenDimensionsAndLayout: string; // e.g. "2700mm × 900mm Island + Walk-In Pantry"
  butlersPantryOrWip: string; // e.g. "Walk-In Pantry (Shelving only)" or "Full Butler's Pantry with Sink & Stone"
  livingZonesCount: number;
  livingZonesList: string[]; // e.g. ["Open Family/Dining", "Separate Media Room", "Children's Activity Retreat", "Study Nook"]
  specialDesignFeatures: string[]; // e.g. ["Mudroom drop-zone", "Under-roof Alfresco", "Double Lock-Up Garage"]
}

export interface PromotionAndMarketingAudit {
  promotionName: string; // e.g. "Live More Designer Pack" or "Fixed Price Turnkey Value"
  inclusionTierName: string; // e.g. "Freedom by Metricon" / "Aspire Inclusion Range" / "Hudson H2 Design Collection"
  advertisedPromoValueAud: number; // What the builder claims the promo is worth (e.g. $65,000)
  trueTradePromoValueAud: number; // Real trade value after stripping inflated RRP markups
  websiteUrlChecked: string;
  whatIsActuallyIncludedInPromo: string[];
  promotionFinePrintAndCatches: string[]; // Conditions, expiry hooks, excluded items in the promo fine writing
  marketingVsRealityVerdict: string;
}

export interface ContractClauseAnalysis {
  contractFormType: string; // e.g. "HIA QLD/NSW Fixed Price Lump Sum" vs "Builder Custom Cost-Plus / Provisional Tender"
  priceLockMonths: number;
  priceLockNotes: string;
  escalationClauseRisk: RiskLevel;
  escalationClauseNotes: string;
  provisionalVariationMarginPercent: number; // e.g. 20% - 25% builder margin on variations
  rockExcavationCoverage: string;
  pieringAllowanceMeters: number;
  siteCostVarianceRisk: RiskLevel;
  balAndAcousticAllowanceNote: string;
  liquidatedDamagesPerWeek: number;
  defectsPeriodMonths: number;
  structuralWarrantyYears: number;
  structuralWarrantyFinePrint: string;
  finePrintWarnings: string[];
  generalBuilderConcerns: string[]; // Broader flags & concerns about the builder's tender or practices
  overallRisk: RiskLevel;
}

export interface ReputationAnalysis {
  rating: number; // e.g. 4.8
  reviewCount: number;
  source: string; // e.g. "ProductReview.com.au, Google Reviews & QBCC/Fair Trading Records"
  sentimentSummary: string;
  preConstructionAdminMonths: number; // Deposit to Slab Pour
  constructionDurationMonths: number; // Slab Pour to Keys Handover
  averageBuildTimeMonths: number; // Total End-to-End or Build Time
  buildTimeReliabilityNote: string;
  licensingAndFinancialNote: string;
  recentReviewHighlights: string[];
  topStrengths: string[];
  topComplaints: string[];
}

export interface BuilderExtractedData {
  id: string;
  builderName: string;
  isHudson: boolean;
  modelName: string;
  facadeName?: string;
  housingType: HousingStoreyType;
  totalAreaM2: number;
  totalAreaSquares: number;

  // Financials
  basePrice: number;
  siteCosts: number;
  siteCostCertainty: SiteCostCertainty;
  siteCostNotes: string;
  statutoryCosts: number;
  promotionsOrDiscounts: number;
  statedTotalPrice: number;
  statedPricePerM2: number;

  // Normalization (True Apples-to-Apples Value)
  omissionsCost: number; // Total value of missing or inferior inclusions
  siteCostContingency: number; // Expected unbudgeted cost from provisional sums
  sizeParityAdjustmentCost: number; // Dollar adjustment if plan is smaller/larger than benchmark
  normalizedTruePrice: number; // Stated Price + Omissions Cost + Site Contingency + Size Parity Adjustment
  normalizedPricePerM2: number;

  // Detailed Design & Spatial Architecture Breakdown
  designArchitecture: DesignArchitectureBreakdown;

  // Promotions, Inclusions Tier & Website Fine Print Audit
  promotionAudit: PromotionAndMarketingAudit;

  // 32-Point Trade-by-Trade Inclusions Breakdown
  inclusions: InclusionComparisonItem[];

  // Contract Fine Print, Clauses & General Concerns
  contractClauses: ContractClauseAnalysis;

  // Market Standing, Customer Reviews & Build Time Intelligence
  reputation: ReputationAnalysis;

  // Scoring
  inclusionsScore: number; // 0 - 100
  financialValueScore: number; // 0 - 100
  contractSafetyScore: number; // 0 - 100
  reputationScore: number; // 0 - 100
  designSpaceScore: number; // 0 - 100
  overallScore: number; // 0 - 100

  // Verdict
  isBestValue: boolean;
  valueVerdictTitle: string;
  executiveSummary: string;
  whyThisBuilderSummary: string[];
  keyAdvantages: string[];
  keyDisadvantages: string[];
}

export interface BuilderQuoteInput {
  id: string;
  builderName: string;
  modelName?: string;
  statedPrice?: number;
  websiteUrl?: string;
  tenderFile?: {
    name: string;
    size: number;
    rawText?: string;
    pageCount?: number;
    dataUrl?: string;
  } | null;
  inclusionsFile?: {
    name: string;
    size: number;
    rawText?: string;
    pageCount?: number;
    dataUrl?: string;
  } | null;
  manualNotes?: string;
}

export interface WhyWinnerBreakdownSection {
  title: string;
  category: "financial" | "design_size" | "inclusions" | "promotions_fine_print" | "contract_risk" | "reputation_build_time";
  winnerPosition: string;
  competitorComparison: string;
  dollarOrRiskImpact: string;
}

export interface TenderComparisonSession {
  id: string;
  createdAt: string;
  clientName: string;
  siteAddress: string;
  division: "NSW" | "QLD";
  builders: BuilderExtractedData[];
  winningBuilderId: string;
  executiveSummary: string;
  briefValueVerdict: string;
  whyWinnerDetailedBreakdown: WhyWinnerBreakdownSection[];
  keyDifferencesSummary: string[];
  researchSourcesChecked: string[];
}
