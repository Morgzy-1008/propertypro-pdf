import { DEFAULT_CATALOGUE } from "./quoteCatalogue";
import {
  calculateDesignGFA,
  calculateModifiedFloorplanPricing,
  calculateQuotePricing,
  generateQuoteNumber,
  getStandardAreaBreakdown,
  MODIFIED_SQM_RATES,
  resolveItemCategory,
} from "./quoteEngine";
import { createNewBlankQuote, loadCatalogue, loadCustomRates } from "./quoteStorage";
import {
  DOUBLE_STOREY_PRICES,
  DUAL_OC_PRICES,
  SINGLE_STOREY_PRICES,
  SPLIT_LEVEL_PRICES,
} from "@/lib/pricelist.data";
import type {
  CatalogueCategory,
  DepositType,
  FloorplanAreaBreakdown,
  FullQuote,
  InclusionTier,
  QuoteDesignSelection,
  QuoteSelectedLineItem,
  SiteConditions,
  SoilClass,
} from "./quoteTypes";

const ALL_DESIGNS = [
  ...SINGLE_STOREY_PRICES.map((d) => ({ ...d, type: "Single Storey" as const })),
  ...DOUBLE_STOREY_PRICES.map((d) => ({ ...d, type: "Double Storey" as const })),
  ...SPLIT_LEVEL_PRICES.map((d) => ({ ...d, type: "Split Level" as const })),
  ...DUAL_OC_PRICES.map((d) => ({ ...d, type: "Duplex / Dual Living" as const })),
];

/**
 * Extracts and reconstructs a FullQuote object from the text of a Hudson Homes Builders Estimate PDF.
 */
export function parseQuoteFromEstimatePdf(rawText: string, filename?: string): FullQuote {
  const blank = createNewBlankQuote();
  const text = rawText || "";

  // 1. Estimate Number
  let quoteNumber = "";
  const estMatch =
    text.match(/(?:BUILDERS ESTIMATE\s*#|Estimate\s*No(?:\s*\/|\s*:|\s*#)?)\s*([A-Z0-9_-]+)/i) ||
    text.match(/Estimate\s*#([A-Z0-9_-]+)/i) ||
    text.match(/EFT Payment Remittance Reference:\s*([A-Z0-9_-]+)/i) ||
    (filename ? filename.match(/Estimate-([A-Z0-9]+)/i) : null);

  if (estMatch && estMatch[1]) {
    quoteNumber = estMatch[1].trim();
    if (quoteNumber.startsWith("Client-")) {
      quoteNumber = quoteNumber.replace("Client-", "");
    }
  }
  if (!quoteNumber) {
    quoteNumber = generateQuoteNumber();
  }

  // 2. Client Details
  let clientName = "";
  let clientPhone = "";
  let clientEmail = "";
  let siteAddress = "";
  let lotNumber = "";
  let suburb = "";
  let postcode = "";

  // "PRESENTED TO \n John Doe" or "Owner/s Details: \n John Doe"
  const presentedMatch =
    text.match(/PRESENTED\s*TO[\s\t\r\n]+([^\r\n\t]+)/i) ||
    text.match(/Owner(?:\/s)?\s*Details:[\s\t\r\n]+([^\r\n\t]+)/i);
  if (presentedMatch && presentedMatch[1]) {
    const rawName = presentedMatch[1].trim();
    if (!rawName.toLowerCase().includes("valued client") && !rawName.toLowerCase().includes("client name")) {
      clientName = rawName;
    }
  }

  // Email & Phone
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch && !emailMatch[1].includes("hudsonhomes.com.au")) {
    clientEmail = emailMatch[1].trim();
  }

  const phoneMatch = text.match(/(?:04\d{2}\s*\d{3}\s*\d{3}|\b04\d{8}\b)/);
  if (phoneMatch && phoneMatch[0] !== "0417 571 864") {
    clientPhone = phoneMatch[0].trim();
  }

  // Proposed site address
  const addrMatch =
    text.match(/PROPOSED\s*SITE\s*ADDRESS[\s\t\r\n]+([^\r\n\t]+)/i) ||
    text.match(/Proposed\s*Site\s*Address:[\s\t\r\n]+([^\r\n\t]+)/i);
  if (addrMatch && addrMatch[1]) {
    const rawAddr = addrMatch[1].trim();
    if (!rawAddr.toLowerCase().includes("address tba") && rawAddr !== "QLD") {
      siteAddress = rawAddr;
      const lotM = siteAddress.match(/Lot\s*(\d+[A-Za-z]?)/i);
      if (lotM) {
        lotNumber = `Lot ${lotM[1]}`;
      }
    }
  }

  // Suburb & Postcode
  const suburbMatch = text.match(/(?:QLD|Queensland)[\s,]+([A-Za-z\s]+)\s*(\d{4})?/i) ||
    text.match(/([A-Za-z\s]+)\s+QLD\s*(\d{4})?/i);
  if (suburbMatch && suburbMatch[1]) {
    const candidate = suburbMatch[1].trim();
    if (candidate.length > 2 && candidate.length < 30 && !candidate.toLowerCase().includes("pty")) {
      suburb = candidate;
      if (suburbMatch[2]) postcode = suburbMatch[2].trim();
    }
  }

  // 3. Design Selection & Sizing
  let designName = "";
  let isModifiedFloorplan = false;
  let housingType: QuoteDesignSelection["housingType"] = "Single Storey";
  let specTier: InclusionTier = "H2 Design Inclusions";
  let facadeName = "Classic";
  let totalM2 = 0;

  // Search design name in text (e.g. Coral 21, Jasper 24, Sapphire 20, Burgundy 27, Amber 30)
  for (const d of ALL_DESIGNS) {
    const regex = new RegExp(`\\b${d.name}\\b`, "i");
    if (regex.test(text)) {
      designName = d.name;
      totalM2 = d.m2;
      housingType = d.type as any;
      break;
    }
  }

  if (text.includes("Modified") || text.includes("MODIFIED AREA SCHEDULE")) {
    isModifiedFloorplan = true;
  }

  // Inclusions tier
  if (text.includes("H3 Luxury") || text.includes("H3")) {
    specTier = "H3 Luxury Inclusions";
  } else if (text.includes("H1 Smart") || text.includes("H1")) {
    specTier = "H1 Smart Inclusions";
  } else {
    specTier = "H2 Design Inclusions";
  }

  // Facade
  const facadeMatch = text.match(/(?:FACADE\s*STYLE|Selected\s*Facade|FACADE):\s*([A-Za-z0-9\s]+)/i);
  if (facadeMatch && facadeMatch[1]) {
    facadeName = facadeMatch[1].replace(/Dimensions.*$/i, "").trim();
  }

  // Modified Area Schedule parsing (Page 3)
  const isDouble = housingType === "Double Storey";
  const stdAreas = getStandardAreaBreakdown(designName, housingType, totalM2 || 200);
  let modifiedAreas: FloorplanAreaBreakdown = { ...stdAreas };

  const livingM = text.match(/(?:Living|Living Area):\s*([\d.]+)\s*m²/i);
  const gfLivingM = text.match(/(?:Ground Floor Living|Ground Living):\s*([\d.]+)\s*m²/i);
  const ffLivingM = text.match(/(?:First Floor Living|First Living):\s*([\d.]+)\s*m²/i);
  const garageM = text.match(/(?:Garage|Garage Area):\s*([\d.]+)\s*m²/i);
  const alfrescoM = text.match(/(?:Alfresco|Alfresco Area):\s*([\d.]+)\s*m²/i);
  const porchM = text.match(/(?:Porch|Porch Area):\s*([\d.]+)\s*m²/i);
  const balconyM = text.match(/(?:Balcony):\s*([\d.]+)\s*m²/i);
  const totalM2M = text.match(/(?:Total|Total Floor Area|GFA Platform):\s*([\d.]+)\s*m²/i);

  if (livingM) modifiedAreas.livingM2 = parseFloat(livingM[1]);
  if (gfLivingM) modifiedAreas.groundLivingM2 = parseFloat(gfLivingM[1]);
  if (ffLivingM) modifiedAreas.firstLivingM2 = parseFloat(ffLivingM[1]);
  if (garageM) modifiedAreas.garageM2 = parseFloat(garageM[1]);
  if (alfrescoM) modifiedAreas.alfrescoM2 = parseFloat(alfrescoM[1]);
  if (porchM) modifiedAreas.porchM2 = parseFloat(porchM[1]);
  if (balconyM) modifiedAreas.balconyM2 = parseFloat(balconyM[1]);

  if (isDouble) {
    modifiedAreas.totalM2 =
      (modifiedAreas.groundLivingM2 || 0) +
      (modifiedAreas.firstLivingM2 || 0) +
      (modifiedAreas.garageM2 || 0) +
      (modifiedAreas.alfrescoM2 || 0) +
      (modifiedAreas.porchM2 || 0) +
      (modifiedAreas.balconyM2 || 0);
  } else {
    modifiedAreas.totalM2 =
      (modifiedAreas.livingM2 || 0) +
      (modifiedAreas.garageM2 || 0) +
      (modifiedAreas.alfrescoM2 || 0) +
      (modifiedAreas.porchM2 || 0);
  }

  // 4. Site Conditions
  let soilClass: SoilClass = "Class M";
  const soilMatch = text.match(/Soil:\s*(Class\s*[A-Z0-9]+)/i) || text.match(/Soil\s*(Class\s*[A-Z0-9]+)/i);
  if (soilMatch && soilMatch[1]) {
    soilClass = soilMatch[1].trim() as SoilClass;
  }

  let fallMeters = 0.5;
  const fallMatch = text.match(/(?:Topography\s*Fall|Fall):\s*([\d.]+)m/i);
  if (fallMatch && fallMatch[1]) {
    fallMeters = parseFloat(fallMatch[1]);
  }

  let councilRegion = "Logan City Council";
  const councilMatch = text.match(/Council\s*Jurisdiction:\s*([A-Za-z\s]+Council)/i) ||
    text.match(/Council\s*Statutory\s*Plumbing\s*&?\s*Lodgement\s*Fees\s*\(([^)]+)\)/i);
  if (councilMatch && councilMatch[1]) {
    councilRegion = councilMatch[1].trim();
  }

  const concrete32MpaRequired = text.includes("32 MPa Concrete Slab Upgrade");
  const flexibleConnectionsRequired = text.includes("Flexible Service Connections");
  const bushfireReportRequired = text.includes("Bushfire Hazard Assessment Report");
  const floodReportRequired = text.includes("Flood Information & Sieve Analysis Report");
  const hydraulicReportRequired = text.includes("Hydraulic Engineering Overland Flow Study");
  const landslideReportRequired = text.includes("Slope Stability & Landslide Hazard Report");
  const acousticReportRequired = text.includes("Acoustic Noise Assessment Report");
  const arboristReportRequired = text.includes("Arborist Tree Assessment Report");
  const cctvSewerReportRequired = text.includes("CCTV Sewer Pipe Camera Inspection");
  const councilDaRequired = text.includes("Council Development Application (DA)");
  const trafficControlRequired = text.includes("Traffic Management Plan & Safety Control");
  const dualLivingInfrastructureRequired = text.includes("Dual Living Infrastructure Charge");
  const screwPieringRequired = text.includes("Allowance for Screw Piering");

  // 5. Line Items & Variations
  const catalogue = loadCatalogue();
  const lineItems: QuoteSelectedLineItem[] = catalogue.map((cat) => {
    const resolvedCat = resolveItemCategory(cat);
    const isIncludedInPdf =
      text.includes(cat.name) ||
      (cat.name.toLowerCase().includes("living area") && text.includes("Custom Single Storey Living Area")) ||
      (cat.name.toLowerCase().includes("ceiling") && text.includes("2,590mm Ceiling Height"));

    return {
      id: `item_${cat.id}_${Math.random().toString(36).slice(2, 7)}`,
      catalogueItemId: cat.id,
      category: resolvedCat,
      name: cat.name,
      description: cat.description,
      unitType: cat.unitType,
      unitRate: cat.unitRate,
      quantity: cat.defaultQty ?? 1,
      subtotal: (cat.defaultQty ?? 1) * cat.unitRate,
      isIncluded: isIncludedInPdf,
      isClientSelectable: !!cat.isClientSelectable,
      clientSelected: false,
    };
  });

  // 6. Deposit
  let depositType: DepositType = "greenfield";
  let depositAmount = 1650;
  let custom3dTourSelected = false;

  if (text.includes("3D Virtual Tour") || text.includes("3D Interactive Virtual Tour") || text.includes("$2,450") || text.includes("$4,100")) {
    custom3dTourSelected = true;
  }

  if (text.includes("Brownfield") || text.includes("$3,300") || text.includes("$4,100")) {
    depositType = "brownfield";
    depositAmount = custom3dTourSelected ? 4100 : 3300;
  } else {
    depositAmount = custom3dTourSelected ? 2450 : 1650;
  }

  // Construct Design Object
  const design: QuoteDesignSelection = {
    mode: "standard",
    housingType,
    designName: designName || "Coral 21",
    designM2: modifiedAreas.totalM2 || totalM2 || 198.08,
    standardDesignM2: totalM2 || 198.08,
    standardBasePrice: blank.design.basePrice,
    basePrice: blank.design.basePrice,
    facadeName,
    facadePrice: 0,
    isCustomFacade: false,
    customFacadeDescription: "",
    specTier,
    floorplanUrl: "",
    beds: "4",
    baths: "2",
    cars: "2",
    widthM: "14.0m",
    lengthM: "22.0m",
    promotionName: "Hudson Special Builder Promotion",
    promotionsDiscount: 25000,
    isModifiedFloorplan,
    modifiedDesignM2: modifiedAreas.totalM2,
    standardAreas: stdAreas,
    modifiedAreas: isModifiedFloorplan ? modifiedAreas : undefined,
    landscapingSelected: text.includes("Turnkey Landscaping Package"),
    landscapingLandSize: 450,
    landscapingCost: 0,
    exposedDrivewaySelected: text.includes("Exposed Aggregate Concrete Driveway"),
    exposedDrivewayM2: 55,
    exposedDrivewayCost: 0,
    customSpec: blank.design.customSpec,
  };

  // Construct Site Conditions
  const siteConditions: SiteConditions = {
    ...blank.siteConditions,
    soilClass,
    fallMeters,
    councilRegion,
    councilFee: 2227.1,
    concrete32MpaRequired,
    flexibleConnectionsRequired,
    bushfireReportRequired,
    floodReportRequired,
    hydraulicReportRequired,
    landslideReportRequired,
    acousticReportRequired,
    arboristReportRequired,
    cctvSewerReportRequired,
    councilDaRequired,
    trafficControlRequired,
    dualLivingInfrastructureRequired,
    screwPieringRequired,
  };

  // Re-calculate all pricing with the engine
  const pricing = calculateQuotePricing(design, siteConditions, lineItems, depositAmount);

  return {
    id: `quote_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    quoteNumber,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: "draft",
    client: {
      clientName: clientName || "Valued Client",
      clientEmail,
      clientPhone,
      hasClient2: false,
      client2Name: "",
      client2Email: "",
      client2Phone: "",
      siteAddress,
      lotNumber,
      suburb,
      estate: "",
      postcode,
      estimateNumber: quoteNumber,
      estimateVersion: 1,
      depositType,
      depositAmount,
      custom3dTourSelected,
      quoteValidityDays: 14,
      consultantId: "morgan-hales",
      consultantName: "Morgan Hales",
      consultantPhone: "0417 571 864",
      consultantEmail: "Morgan.hales@hudsonhomes.com.au",
      consultantOffice: "Flagstone Display Home",
      notes: "",
    },
    design,
    siteConditions,
    lineItems,
    pricing,
  };
}
