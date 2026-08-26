export type UnitType = "fixed" | "per_lm" | "per_m2" | "custom_qty";

export type HousingTypeFilter = "all" | "single" | "double" | "split" | "dual_living";

export type CatalogueCategory =
  | "floorplan_extensions"
  | "ceiling_heights"
  | "structural"
  | "doors_windows"
  | "external"
  | "internal_kitchen"
  | "internal_bathroom"
  | "internal_bedrooms"
  | "internal_laundry"
  | "colour_upgrades"
  | "site_earthworks"
  | "council_statutory";

export interface CatalogueItem {
  id: string;
  category: CatalogueCategory;
  name: string;
  description: string;
  unitType: UnitType;
  unitRate: number;
  defaultQty?: number;
  isIncludedByDefault?: boolean;
  isClientSelectable?: boolean;
  housingTypeFilter?: HousingTypeFilter;
  tag?: string;
}

export interface QuoteSelectedLineItem {
  id: string;
  catalogueItemId?: string;
  category: CatalogueCategory;
  name: string;
  description: string;
  unitType: UnitType;
  unitRate: number;
  quantity: number;
  subtotal: number;
  isIncluded: boolean;
  isClientSelectable: boolean;
  clientSelected?: boolean;
  notes?: string;
}

export interface CustomFloorplanSpec {
  groundLivingM2: number;
  firstLivingM2: number;
  garageM2: number;
  alfrescoM2: number;
  porchM2: number;
  balconyM2: number;
  storeys: "single" | "double" | "split";
  // Custom rate overrides ($/m2)
  groundRateM2: number;
  upperRateM2: number;
  ancillaryRateM2: number; // Garage, Alfresco, Porch
  scaffoldingAllowance: number;
  customPlanUrl?: string;
}

export type SoilClass =
  | "Class S"
  | "Class M"
  | "Class H1"
  | "Class H2"
  | "Class E1"
  | "Class E2"
  | "Class E"
  | "Class P";

export interface SiteConditions {
  // Soil & Foundation Earthworks
  soilClass: SoilClass;
  soilCostSqm: number;
  soilTotalCost: number;
  concrete32MpaRequired?: boolean;
  concrete32MpaCost?: number;
  flexibleConnectionsRequired?: boolean;
  flexibleConnectionsCost?: number; // default $1,800
  fallMeters: number;
  fallTotalCost: number;

  // Site Overlay Reports (LHS)
  bushfireReportRequired?: boolean;
  bushfireReportCost?: number; // default $850
  floodReportRequired?: boolean;
  floodReportCost?: number; // default $7,600
  hydraulicReportRequired?: boolean;
  hydraulicReportCost?: number; // default $2,200
  landslideReportRequired?: boolean;
  landslideReportCost?: number; // default $1,850
  acousticReportRequired?: boolean;
  acousticReportCost?: number; // default $1,200
  arboristReportRequired?: boolean;
  arboristReportCost?: number; // default $1,100
  cctvSewerReportRequired?: boolean;
  cctvSewerReportCost?: number; // default $850

  // Site Overlay Allowances & Physical Works (RHS)
  bushfireBal: "None" | "BAL-12.5" | "BAL-19" | "BAL-29" | "BAL-40";
  bushfireCost: number;
  floodOverlayRequired?: boolean;
  slabElevationMeters?: number; // Height in metres (e.g. 0.3m) -> calculated as height * $270 * GFA
  floodOverlayCost?: number;
  acousticTier: "None" | "Category 1" | "Category 2" | "Category 3";
  acousticCost: number;

  // Council & Statutory Applications
  councilRegion: string;
  councilFee: number;
  councilDaRequired?: boolean;
  councilDaCost?: number; // default $8,000
  trafficControlRequired?: boolean;
  trafficControlCost?: number; // default $10,000 (steps of $2,500)
  dualLivingInfrastructureRequired?: boolean;
  dualLivingInfrastructureCost?: number; // default $23,000
  sedimentAssetProtectionCost?: number;

  // Geotechnical & Site Allowances
  screwPieringRequired?: boolean;
  screwPieringCost?: number; // auto-calculated at $90 × GFA m²
  rockExcavationAllowance?: number; // default $2,500 (increments of $2,500)
  retainingWallAllowance?: number; // increments of $2,500
  materialHandlingRequired?: boolean;
  materialHandlingAllowance?: number; // increments of $2,500
  pieringAllowanceMeters?: number;
  pieringCost?: number;
}

export type DepositType = "greenfield" | "brownfield" | "custom";

export interface ClientDetails {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  // Client 2 (Optional)
  hasClient2?: boolean;
  client2Name?: string;
  client2Email?: string;
  client2Phone?: string;
  // Site Address
  siteAddress: string;
  lotNumber: string;
  suburb: string;
  estate: string;
  postcode: string;
  estimateNumber: string;
  estimateVersion: number;
  // Initial Deposit Options
  depositType: DepositType;
  depositAmount: number; // Greenfield ($1,650), Brownfield ($3,300), or custom
  quoteValidityDays: number; // 14 days
  consultantId: string;
  consultantName: string;
  consultantPhone: string;
  consultantEmail: string;
  consultantOffice: string;
  notes: string;
}

export type InclusionTier =
  | "H1 Smart Inclusions"
  | "H2 Design Inclusions"
  | "H3 Luxury Inclusions"
  | "H1 Inclusions (2025)"
  | "H2 Inclusions (2025)"
  | "H3 Inclusions (2025)"
  | "Smart Style"
  | "Hudson Base";

export interface FloorplanAreaBreakdown {
  livingM2?: number; // Single Storey living area
  groundLivingM2?: number; // Double Storey / Split / Dual living ground floor
  firstLivingM2?: number; // Double Storey / Split / Dual living first floor
  garageM2: number;
  alfrescoM2: number;
  porchM2: number;
  balconyM2?: number;
  totalM2: number;
}

export interface QuoteDesignSelection {
  mode: "standard" | "custom_floorplan";
  housingType: "Single Storey" | "Double Storey" | "Split Level" | "Dual Living";
  designName: string;
  designM2: number;
  facadeName: string;
  facadePrice: number;
  isCustomFacade?: boolean;
  customFacadeDescription?: string;
  specTier: InclusionTier;
  basePrice: number;
  floorplanUrl?: string;
  isModifiedFloorplan?: boolean;
  modifiedDesignM2?: number; // Modified floorplan total sqm
  standardDesignM2?: number; // Original standard sqm for reference
  standardBasePrice?: number; // Original standard base price for reference
  standardAreas?: Partial<FloorplanAreaBreakdown>;
  modifiedAreas?: Partial<FloorplanAreaBreakdown>;
  beds?: string;
  baths?: string;
  cars?: string;
  widthM?: string;
  lengthM?: string;
  promotionName?: string;
  promotionsDiscount: number;
  // Landscaping & Driveway Packages
  landscapingSelected?: boolean;
  landscapingLandSize?: number; // e.g. 300, 450, 600, 700, 800, 900
  landscapingCost?: number;
  exposedDrivewaySelected?: boolean;
  exposedDrivewayM2?: number; // default 55 m2
  exposedDrivewayCost?: number;
  customSpec: CustomFloorplanSpec;
}

export interface CategorySubtotal {
  category: CatalogueCategory;
  label: string;
  amount: number;
  items: QuoteSelectedLineItem[];
}

export interface QuotePricingSummary {
  baseHousePrice: number;
  facadePrice: number;
  promotionName: string;
  promotionsDiscount: number;
  landscapingCost: number;
  exposedDrivewayCost: number;
  customFloorplanPrice: number;
  gfaM2: number; // Ground living + Porch + Garage + Alfresco
  siteCostsSubtotal: number;
  councilStatutorySubtotal: number;
  categorySubtotals: CategorySubtotal[];
  totalVariations: number;
  netContractPriceExGst: number;
  gstAmount: number;
  grossEstimatedInvestment: number;
  initialDepositAmount: number;
  balanceDueOnContract: number;
}

export interface FullQuote {
  id: string;
  quoteNumber: string;
  createdAt: string;
  updatedAt: string;
  status: "draft" | "presented" | "client_reviewed" | "approved" | "contract_signed";
  client: ClientDetails;
  design: QuoteDesignSelection;
  siteConditions: SiteConditions;
  lineItems: QuoteSelectedLineItem[];
  pricing: QuotePricingSummary;
  clientNotes?: string;
}
