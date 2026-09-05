export type FeasibilityMode = "greenfield" | "brownfield_kdrb";
export type HouseStoreyType = "single" | "double";

export interface CadastralParcel {
  lotNumber: string;
  planNumber: string;
  standardLotPlan: string; // e.g. "Lot 243 on SP312456"
  streetAddress: string;
  suburb: string;
  postcode: string;
  council: string;
  areaM2: number;
  frontageM: number;
  depthM: number;
  rearWidthM?: number;
  shape: "rectangular" | "corner" | "irregular" | "battleaxe";
  latitude: number;
  longitude: number;
  boundaryCoordinates?: Array<[number, number]>;
  isRegistered: boolean;
  expectedRegistrationDate?: string;
}

export interface SurroundingConstraints {
  hasBusStopWithin50m: boolean;
  busStopDistanceM?: number;
  busStopDetails?: string;
  hasSchoolWithin100m: boolean;
  schoolDistanceM?: number;
  schoolDetails?: string;
  trafficControlRequired: boolean;
  trafficControlCost: number; // default $10,000 (editable)
  hasOverheadPowerLines: boolean;
  hasPowerPoleOnFrontage: boolean;
  treeCount: number;
  significantTreesPresent: boolean;
  onStreetParkingRestricted: boolean;
  siteAccessRating: "Good" | "Constrained" | "Narrow / Flagged";
}

export interface OverlaysAnalysis {
  bushfireBal: "None" | "BAL-12.5" | "BAL-19" | "BAL-29" | "BAL-40";
  bushfireBufferM?: number;
  bushfireReportRequired: boolean;
  bushfireCost: number;
  floodHazard: "None" | "Low" | "Medium" | "High" | "Planning Flood Level";
  floodReportRequired: boolean;
  floodCost: number;
  recommendedSlabElevationM?: number;
  contoursFallM: number; // fall across building envelope in metres
  slopeDirection: "Front to Back" | "Back to Front" | "Cross Fall LHS to RHS" | "Cross Fall RHS to LHS" | "Relatively Flat";
  fallCost: number;
  acousticCategory: "None" | "Category 1" | "Category 2" | "Category 3";
  acousticReportRequired: boolean;
  acousticCost: number;
  hasSewerEasement: boolean;
  easementWidthM?: number;
  easementLocation?: "Rear" | "Side LHS" | "Side RHS" | "None";
  cctvSewerRequired: boolean;
  cctvSewerCost: number;
}

export interface SetbackRules {
  frontOmpM: number;
  frontGarageM: number;
  sideStandardM: number;
  sideBtbM: number;
  sideUpperM: number;
  rearM: number;
  secondaryStreetM: number;
  maxSiteCoveragePct: number;
  maxBuildingHeightM: number;
  sourceDocument: string;
}

export interface CovenantRuleItem {
  id: string;
  name: string;
  description: string;
  category: "facade" | "materials" | "roof" | "driveway" | "fencing" | "siting";
  mandatory: boolean;
  recommendedAllowanceCost: number;
}

export interface EditableAllowanceItem {
  id: string;
  title: string;
  category: "Surrounding / Traffic" | "Hazard & Overlays" | "Site Earthworks" | "Estate Covenants" | "Statutory & Reports";
  description: string;
  recommendedAmount: number;
  currentAmount: number;
  isApplied: boolean;
  isRequired: boolean;
  rationale: string;
}

export interface EstateStagePoD {
  id: string;
  estateId: string;
  estateName: string;
  stageName: string;
  developer: string;
  council: string;
  suburb: string;
  singleStoreySetbacks: SetbackRules;
  doubleStoreySetbacks: SetbackRules;
  covenants: CovenantRuleItem[];
  notes: string;
  confirmedByHuman: boolean;
  verificationQuestions?: string[];
}

export interface SiteFeasibilityDossier {
  id: string;
  createdAt: string;
  addressOrLotQuery: string;
  mode: FeasibilityMode;
  houseStorey: HouseStoreyType;
  houseDesignName?: string;
  estateId?: string;
  stageId?: string;
  parcel: CadastralParcel;
  activeSetbacks: SetbackRules;
  surrounding: SurroundingConstraints;
  overlays: OverlaysAnalysis;
  allowances: EditableAllowanceItem[];
  totalAllowancesCost: number;
  confidenceScore: number; // 0-100%
  humanClarifications: Array<{
    question: string;
    answer?: string;
    resolved: boolean;
  }>;
  notes: string;
}
