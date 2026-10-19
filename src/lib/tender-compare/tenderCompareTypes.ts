export type HousingStoreyType = "Single Storey" | "Double Storey" | "Split Level" | "Dual Living";

export type InclusionStatus = "included" | "upgrade_required" | "provisional_sum" | "excluded";

export type SiteCostCertainty = "fixed" | "semi_fixed" | "provisional_allowance";

export type RiskLevel = "low" | "medium" | "high";

export interface InclusionComparisonItem {
  id: string;
  category: "kitchen" | "bathroom" | "ceilings_doors" | "electrical" | "hvac" | "flooring" | "structural" | "turnkey";
  categoryLabel: string;
  featureName: string;
  specification: string;
  status: InclusionStatus;
  estimatedOmissionCost: number; // Cost to add this item if missing or inferior
  notes?: string;
}

export interface ContractClauseAnalysis {
  priceLockMonths: number;
  priceLockNotes: string;
  escalationClauseRisk: RiskLevel;
  escalationClauseNotes: string;
  rockExcavationCoverage: string;
  pieringAllowanceMeters: number;
  siteCostVarianceRisk: RiskLevel;
  liquidatedDamagesPerWeek: number;
  defectsPeriodMonths: number;
  structuralWarrantyYears: number;
  finePrintWarnings: string[];
  overallRisk: RiskLevel;
}

export interface ReputationAnalysis {
  rating: number; // e.g. 4.8
  reviewCount: number;
  source: string; // e.g. "ProductReview.com.au & Google Reviews"
  sentimentSummary: string;
  averageBuildTimeMonths: number;
  topStrengths: string[];
  topComplaints: string[];
}

export interface BuilderExtractedData {
  id: string;
  builderName: string;
  isHudson: boolean;
  modelName: string;
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
  normalizedTruePrice: number; // Stated Price + Omissions Cost + Contingency
  normalizedPricePerM2: number;

  // Inclusions Breakdown
  inclusions: InclusionComparisonItem[];

  // Contract Fine Print & Legal Terms
  contractClauses: ContractClauseAnalysis;

  // Market Standing & Customer Feedback
  reputation: ReputationAnalysis;

  // Scoring
  inclusionsScore: number; // 0 - 100
  financialValueScore: number; // 0 - 100
  contractSafetyScore: number; // 0 - 100
  reputationScore: number; // 0 - 100
  overallScore: number; // 0 - 100

  // Verdict
  isBestValue: boolean;
  valueVerdictTitle: string;
  executiveSummary: string;
  keyAdvantages: string[];
  keyDisadvantages: string[];
}

export interface BuilderQuoteInput {
  id: string;
  builderName: string;
  modelName?: string;
  statedPrice?: number;
  tenderFile?: {
    name: string;
    size: number;
    rawText?: string;
    dataUrl?: string;
  } | null;
  inclusionsFile?: {
    name: string;
    size: number;
    rawText?: string;
    dataUrl?: string;
  } | null;
  manualNotes?: string;
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
  keyDifferencesSummary: string[];
}
