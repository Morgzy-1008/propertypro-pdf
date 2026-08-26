export type BuildType = "Vacant Land" | "Knock-Down, Rebuild" | "Home & Land Package" | "Custom";
export type PurchaserType = "Owner Occupier" | "Property Investor" | "First-Home Buyer" | "Repeat Purchaser";
export type LandStatus = "Exclusive" | "Expression of Interest" | "Deposited" | "Exchanged" | "Settled";
export type KdrOccupancy = "Owner Occupied" | "Vacant" | "Tenanted";
export type GarageLocation = "LHS" | "RHS" | "Detached" | "Zero Lot";
export type TenderInclusionType = "Standard" | "H1 Smart" | "H2 Designer" | "H3 Luxury" | "LP Landscape" | "IP Investment" | "FHB First Home Buyer";

export interface TenderNumberedVariation {
  id: string;
  itemNumber: number;
  description: string;
  cost: number;
  category?: string;
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

export interface TenderSolicitorFinancier {
  firmOrCompany: string;
  address: string;
  telephone: string;
  facsimile?: string;
  email: string;
  contactPerson: string;
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

  client2Signed: boolean;
  client2Name: string;
  client2SignatureDate: string;
  client2SignatureDataUrl?: string;

  consultantSigned: boolean;
  consultantName: string;
  consultantSignatureDate: string;
  consultantSignatureDataUrl?: string;

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
  status: "draft" | "ready_for_signing" | "client_signed" | "ready_for_onsite" | "submitted_to_onsite";
  
  // Header Meta
  tenderRequestDate: string;
  priceListDate: string;
  displayOffice: string;
  newHomeConsultant: string;
  consultantPhone: string;
  consultantEmail: string;
  iquoteDate: string;
  iquoteId: string;
  source: string;

  // Build & Purchaser Type
  buildType: BuildType;
  purchaserType: PurchaserType;

  // Customers
  customer1: TenderCustomer;
  hasCustomer2: boolean;
  customer2: TenderCustomer;

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
    accessRestrictions?: {
      securityFence: boolean;
      dogs: boolean;
      pool: boolean;
      other: boolean;
      otherDetails?: string;
    };
    comments: string;
  };

  // New Home Details
  homeSpec: {
    homeDesign: string;
    facade: string;
    inclusionsType: TenderInclusionType;
    isDoubleStorey: boolean;
    garageLocation: GarageLocation;
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
    additionsCost: number;
    additionalSiteCost: number;
    promotionDiscountCost: number;
    totalBudgetEstimate: number;
  };

  // Numbered Variations Table (matching plan markup numbers 1, 2, 3...)
  variations: TenderNumberedVariation[];

  // Solicitor & Financier
  solicitor: TenderSolicitorFinancier;
  financier: TenderSolicitorFinancier;
  consultantNotes: string;

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
