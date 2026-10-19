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
  totalAreaM2?: number;
  totalAreaSquares?: number;
  totalSquares?: number;
  groundFloorInternalM2?: number;
  firstFloorInternalM2?: number;
  groundFloorLivingM2?: number;
  upperFloorLivingM2?: number;
  garageM2: number;
  alfrescoM2: number;
  porchM2?: number;
  balconyM2?: number;
  porchAndBalconyM2?: number;
  houseWidthMeters?: number;
  houseDepthMeters?: number;
  minLotWidthMeters?: number;
  overallWidthM?: number;
  overallLengthM?: number;
  minimumLotWidthM?: number;
  sizeDifferenceVsBenchmarkM2?: number;
  sizeValueAdjustmentAud?: number;
  bedroomsCount: number;
  masterSuiteDimensions?: string;
  masterBedroomDimensions?: string;
  secondaryBedroomsAverageSize?: string;
  secondaryBedroomsDimensions?: string;
  bedroomSizesDetail?: string[];
  bathroomsCount: number;
  ensuitesCount: number;
  powderRoomsCount: number;
  kitchensCount?: number;
  kitchenCount?: number;
  kitchenDimensionsAndLayout: string;
  butlersPantryOrWip: string;
  livingZonesCount: number;
  livingZonesList: string[];
  studyOrOfficeIncluded?: boolean | string;
  alfrescoIncluded?: boolean;
  garageSpaces?: number;
  designFeaturesIncluded?: string[];
  specialDesignFeatures?: string[];
  designVerdictNotes?: string;
}

export interface PromotionAndMarketingAudit {
  promotionName?: string;
  inclusionRangeTier?: string;
  inclusionTierName?: string;
  advertisedValueClaim?: string;
  realAssessedValue?: number | string;
  advertisedPromoValueAud?: number;
  trueTradePromoValueAud?: number;
  websiteUrlChecked: string;
  activePromotionsFound?: string[];
  whatIsActuallyIncludedInPromo?: string[];
  promotionFinePrintTraps?: string[];
  promotionFinePrintAndCatches?: string[];
  websiteVsEstimateDiscrepancies?: string[];
  standardInclusionsSummary?: string;
  marketingVsRealityVerdict?: string;
}

export interface ContractClauseAnalysis {
  contractFormType?: string;
  priceLockMonths: number;
  priceLockNotes: string;
  escalationClauseRisk: RiskLevel;
  escalationClauseNotes: string;
  provisionalVariationMarginPercent: number;
  rockExcavationCoverage: string;
  pieringAllowanceMeters: number;
  siteCostVarianceRisk: RiskLevel;
  bushfireBalAllowance?: string;
  acousticAllowance?: string;
  balAndAcousticAllowanceNote?: string;
  liquidatedDamagesPerWeek: number;
  defectsPeriodMonths: number;
  structuralWarrantyYears: number;
  structuralWarrantyFinePrint: string;
  finePrintWarnings: string[];
  generalBuilderConcerns: string[];
  overallRisk: RiskLevel;
}

export interface ReputationAnalysis {
  rating: number;
  reviewCount: number;
  source: string;
  sentimentSummary: string;
  preConstructionAdminMonths: number;
  constructionDurationMonths: number;
  averageBuildTimeMonths: number;
  buildTimeReliabilityNote?: string;
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
  inclusionTierName?: string;
  housingType: HousingStoreyType | string;
  totalAreaM2: number;
  totalAreaSquares: number;
  areaDifferenceFromBenchmarkM2?: number;

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
  omissionsCost: number;
  siteCostContingency: number;
  sizeParityAdjustmentValue?: number;
  sizeParityAdjustmentCost?: number;
  normalizedTruePrice: number;
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
  inclusionsScore: number;
  financialValueScore: number;
  contractSafetyScore: number;
  reputationScore: number;
  designSpaceScore?: number;
  overallScore: number;

  // Verdict
  isBestValue: boolean;
  valueVerdictTitle: string;
  executiveSummary: string;
  whyThisBuilderSummary?: string[];
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
  pillarTitle: string;
  winnerHighlight: string;
  detailedExplanation: string;
  quantifiedDollarImpact: string;
  title?: string;
  category?: "financial" | "design_size" | "inclusions" | "promotions_fine_print" | "contract_risk" | "reputation_build_time";
  winnerPosition?: string;
  competitorComparison?: string;
  dollarOrRiskImpact?: string;
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
  briefValueVerdict?: string;
  whyWinnerDetailedBreakdown: WhyWinnerBreakdownSection[];
  keyDifferencesSummary: string[];
  researchSourcesChecked?: string[];
}
