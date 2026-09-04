export type BuildType =
  | "Greenfield Site"
  | "Exclusive Lot"
  | "Knock-Down, Rebuild (KDRB)"
  | "House & Land Package"
  | "Custom";
export type PurchaserType = "Owner Occupier" | "Property Investor" | "First-Home Buyer" | "Repeat Purchaser";
export type LandStatus = "Exclusive" | "Expression of Interest" | "Deposited" | "Exchanged" | "Settled";
export type KdrOccupancy = "Owner Occupied" | "Vacant" | "Tenanted";
export type GarageLocation = "LHS" | "RHS" | "Detached" | "Zero Lot";
export type TenderInclusionType = "Standard" | "H1 Smart" | "H2 Designer" | "H3 Luxury" | "LP Landscape" | "IP Investment" | "FHB First Home Buyer";

export interface TenderFloorplanPin {
  id: string;
  number: number;
  x: number; // 0 to 100 percentage
  y: number; // 0 to 100 percentage
  title: string;
  variationId?: string;
}

export interface TenderNumberedVariation {
  id: string;
  itemNumber?: number; // assigned only for structural changes (1, 2, 3...)
  description: string;
  cost: number;
  category?: "structural" | "all_variations" | string;
  isStructural: boolean; // True = shown on floorplan with #, False = unnumbered general variation
  draftsmanNotes?: string;
  draftsmanStatus?: "approved" | "rfi" | "pending";
  draftsmanSheetRef?: string;
}

export interface TenderCustomer {
  title?: string;
  firstName: string;
  surname: string;
  homePh?: string;
  workPh?: string;
  mobile: string;
  email: string;
}

export interface TenderDocumentSlot {
  id: string;
  label: string;
  category: "identity" | "contract_quote" | "land_siting" | "plans_variations" | "engineering_reports" | "payment";
  fileName?: string;
  fileDataUrl?: string;
  fileType?: string;
  fileSize?: number;
  required?: boolean;
  notes?: string;
}

export interface TenderChecklistItem {
  id: number;
  label: string;
  checked: boolean;
  notes?: string;
}

export interface AuthorityToProceedData {
  feeType: "greenfield_1650" | "kdr_duplex_3300" | "package_3000" | "custom_design_800";
  feeAmount: number;
  isCustomDesignAddon: boolean;
  customDesignAddonAmount: number;
  tenderAcceptanceFee: 4400 | 6600;
  
  // Signatures
  client1Signed: boolean;
  client1Name: string;
  client1SignatureDate: string;
  client1SignatureDataUrl?: string;
  client1SignatureStyle?: "draw" | "cursive";

  client2Signed: boolean;
  client2Name: string;
  client2SignatureDate: string;
  client2SignatureDataUrl?: string;
  client2SignatureStyle?: "draw" | "cursive";

  consultantSigned: boolean;
  consultantName: string;
  consultantSignatureDate: string;
  consultantSignatureDataUrl?: string;

  // Remote Signing
  isRemoteSigned?: boolean;
  remoteSignToken?: string;
  remoteSignedAt?: string;

  // Payment
  paymentMethod: "eft" | "credit_card" | "cheque" | "cash";
  eftAccountName: string;
  eftBsb: string;
  eftAccountNumber: string;
  eftReference: string;
  
  creditCardHolder?: string;
  creditCardNumberMasked?: string;
  creditCardExpiry?: string;
  creditCardSignatureDataUrl?: string;
}

export interface TenderSubmission {
  id: string;
  submissionNumber: string;
  sourceQuoteId?: string;
  createdAt: string;
  updatedAt: string;
  status: "draft" | "submitted" | "approved" | "client_signed" | "rejected";
  iquoteId: string;
  tenderRequestDate: string;
  tenderTargetDate: string;

  // Sales Consultant Profile
  newHomeConsultant: string;
  consultantPhone: string;
  consultantEmail: string;
  displayOffice: string;
  
  // Buyer Classification & Acquisition Channel
  buyerType?: "FHB" | "Investor" | "Owner-Occupied";
  leadSource?: "online lead" | "display home" | "referral";

  // Draftsman Collaborative Workflow
  draftsmanGeneralNotes?: string;
  draftsmanReviewStatus?: "pending" | "rfi_raised" | "approved";
  draftsmanReviewedAt?: string;

  // Project Type & Client
  buildType: BuildType;
  purchaserType: PurchaserType;
  customer1: TenderCustomer;
  customer2: TenderCustomer;
  hasCustomer2: boolean;

  // Current Residence
  currentHomeAddress: {
    streetNumber: string;
    streetName: string;
    suburb: string;
    state: string;
    postcode: string;
  };

  // Land Details
  land: {
    estate: string;
    stage: string;
    lotNo: string;
    lotSizeM2: number | "";
    frontageM: number | "";
    streetNumber: string;
    streetName: string;
    suburb: string;
    council: string;
    covenantsGuidelines: boolean;
    isRegistered: boolean;
    registeredDate: string;
    landStatus: LandStatus;
    
    // If Knock-Down Rebuild
    ifKdrOccupancy?: KdrOccupancy;
    kdrAccessName?: string;
    kdrAccessPhone?: string;
    kdrTenantDetails?: {
      name: string;
      phone: string;
      email: string;
      accessNotes: string;
    };
    accessRestrictions?: {
      securityFence: boolean;
      dogs: boolean;
      pool: boolean;
      other: boolean;
      otherDetails?: string;
    };
    comments: string;
  };

  // New Home Details & Floorplan
  homeSpec: {
    housingType: "Single Storey" | "Double Storey" | "Split Level" | "Dual Living";
    homeDesign: string;
    facade: string;
    inclusionsType: TenderInclusionType;
    isDoubleStorey: boolean;
    garageLocation: GarageLocation;
    floorplanUrl?: string;
    originalFloorplanUrl?: string;
    facadeRenderUrl?: string;
    isCustomFacade?: boolean;
    customFacadeName?: string;
    customFacadeRenderUrl?: string;
    sitingPlanDataUrl?: string;
    isModifiedFloorplan?: boolean;
    designM2?: number;
    standardDesignM2?: number;
    modifiedDesignM2?: number;
    standardBasePrice?: number;
    sqmRate?: number;
    standardAreas?: Record<string, number>;
    modifiedAreas?: Record<string, number>;
    areaAdjustmentsBreakdown?: Array<{
      label: string;
      standardM2: number;
      modifiedM2: number;
      diffM2: number;
      ratePerM2?: number;
      cost: number;
    }>;
    floorplanPins: TenderFloorplanPin[];
    includeLandscapePackage?: boolean;
    landscapePackageCost?: number;
    setbacks: {
      frontBoundary: string;
      rearBoundary: string;
      leftBoundary: string;
      rightBoundary: string;
    };
    specialOffers: string;
    customerBudget: number | "";
    
    // Cost Breakdown
    baseDesignCost: number;
    facadeCost: number;
    structuralVariationsCost: number;
    internalUpgradesCost: number;
    additionalSiteCost: number;
    promotionDiscountCost: number;
    totalBudgetEstimate: number;
  };

  // Variations List (Structural with #, and non-structural without #)
  variations: TenderNumberedVariation[];

  // Authority to Proceed (ATP)
  atp: AuthorityToProceedData;

  // 15-Point Submission Checklist
  checklist: TenderChecklistItem[];

  // Uploaded / Attached Documents
  documents: Record<string, TenderDocumentSlot>;

  // Workflow Manager / OnSite Transfer Meta
  workflowManager: {
    targetName: string;
    targetEmail: string;
    onsiteJobNumber?: string;
    submittedAt?: string;
    notesForBernie?: string;
  };
}
