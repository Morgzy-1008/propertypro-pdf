import JSZip from "jszip";
import type { FullQuote } from "../quoting/quoteTypes";
import { formatAud } from "../pricing";
import { plansForDesign } from "@/components/flyer/floorplans";
import { HUDSON_FLOORPLANS } from "@/components/flyer/floorplans.data";
import type {
  TenderSubmission,
  TenderDocumentSlot,
  TenderChecklistItem,
  TenderNumberedVariation,
  BuildType,
  TenderInclusionType,
  TenderFloorplanPin,
} from "./tenderTypes";

export function findFloorplanUrl(designName: string): string {
  if (!designName) return "";
  const direct = plansForDesign(designName);
  if (direct.length > 0 && direct[0].url) return direct[0].url;

  // Clean design name e.g. "Amber 21 (192.24 m²)" -> "amber 21"
  const clean = designName.replace(/\(.*?\)/g, "").trim().toLowerCase();
  const tokens = clean.split(/\s+/).filter(Boolean);

  const found = HUDSON_FLOORPLANS.find((p) => {
    const label = p.label.toLowerCase();
    const design = p.design.toLowerCase();
    return tokens.every((t) => label.includes(t) || design.includes(t));
  });

  if (found?.url) return found.url;
  return HUDSON_FLOORPLANS[0]?.url || "";
}

const STORAGE_KEY_TENDERS = "hudson_tender_submissions_v1";
const IDB_TENDER_DB = "PropertyProTendersDB";
const IDB_TENDER_STORE = "tenders";

export const STANDARD_DOCUMENT_SLOTS: Omit<TenderDocumentSlot, "fileDataUrl" | "fileName" | "fileSize" | "fileType">[] = [
  // 1. PRIMARY REQUIRED DOCUMENTS (Pinned to Top)
  { id: "license_c1_front", label: "Driver's Licence (Client 1 - Front)", category: "identity", required: true },
  { id: "license_c1_back", label: "Driver's Licence (Client 1 - Back)", category: "identity", required: true },
  { id: "proof_of_ownership", label: "Proof of Ownership / Land Contract", category: "contract_quote", required: true },
  { id: "disclosure_plan", label: "Disclosure Plan", category: "land_siting", required: true },
  { id: "siting_plan", label: "1:200 Scale Siting / House Position Plan", category: "land_siting", required: true },
  { id: "deposit_receipt", label: "Tender Fee Transfer / Deposit Receipt", category: "payment", required: true },
  { id: "license_c2_front", label: "Driver's Licence (Client 2 - Front)", category: "identity", required: false },
  { id: "license_c2_back", label: "Driver's Licence (Client 2 - Back)", category: "identity", required: false },

  // 2. SITE & ENGINEERING REPORTS (Optional / When Available)
  { id: "contour_survey", label: "Contour Survey / Site Level Plan", category: "land_siting", required: false },
  { id: "plan_of_subdivision", label: "Plan of Subdivision (POD) / Street Plan", category: "land_siting", required: false },
  { id: "covenant_guidelines", label: "Estate Covenant Guidelines", category: "land_siting", required: false },
  { id: "bushfire_report", label: "Bushfire Hazard Assessment Report (BAL)", category: "engineering_reports", required: false },
  { id: "compaction_report", label: "Compaction / Fill Certificate", category: "engineering_reports", required: false },
  { id: "soil_wind_rating", label: "Soil Test & Wind Rating Report", category: "engineering_reports", required: false },
  { id: "sewer_drainage_plan", label: "Sewer & Drainage Diagram", category: "engineering_reports", required: false },
  { id: "discount_approval_pdf", label: "Discount Approval Form (If Applicable)", category: "contract_quote", required: false },
];

export const DEFAULT_CHECKLIST_ITEMS: TenderChecklistItem[] = [
  { id: 1, label: "Quotation Completed & Checked", checked: true },
  { id: 2, label: "1:200 Scale Site Plan of Proposed Dwelling prepared", checked: false },
  { id: 3, label: "Front Page Contract of Sale of Land provided (Proof of Ownership)", checked: true },
  { id: 4, label: "s149 Certificate and 88b Certificate (if available)", checked: false },
  { id: 5, label: "Plan of Subdivision / POD attached", checked: false },
  { id: 6, label: "Estate Guidelines attached", checked: false },
  { id: 7, label: "Sewer / Drainage Diagram provided", checked: false },
  { id: 8, label: "Variations properly detailed and itemized with pricing", checked: true },
  { id: 9, label: "Standard floor plan layout confirmed", checked: true },
  { id: 10, label: "Floor plans appropriately marked-up indicating numbered variations", checked: false },
  { id: 11, label: "Special offers and builder promotions noted", checked: false },
  { id: 12, label: "Other supporting site reports / compaction certs provided", checked: false },
  { id: 13, label: "Tender Request Fee Paid and Receipt issued", checked: false },
  { id: 14, label: "Tender Presentation Date booked (min 21 days)", checked: false },
  { id: 15, label: "Copy of Driver's Licence (Client 1 & 2)", checked: true },
];

function openTenderDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = window.indexedDB.open(IDB_TENDER_DB, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IDB_TENDER_STORE)) {
        db.createObjectStore(IDB_TENDER_STORE, { keyPath: "id" });
      }
    };
  });
}

export async function saveTenderToIdb(submission: TenderSubmission): Promise<void> {
  try {
    const db = await openTenderDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_TENDER_STORE, "readwrite");
      const store = tx.objectStore(IDB_TENDER_STORE);
      const req = store.put(submission);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn("Tender IDB save fallback:", e);
  }
}

export async function loadAllTendersFromIdb(): Promise<TenderSubmission[]> {
  try {
    const db = await openTenderDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_TENDER_STORE, "readonly");
      const store = tx.objectStore(IDB_TENDER_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const results = (req.result as TenderSubmission[]) || [];
        results.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
        resolve(results);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function getTenderByIdAsync(id: string): Promise<TenderSubmission | null> {
  try {
    const db = await openTenderDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_TENDER_STORE, "readonly");
      const store = tx.objectStore(IDB_TENDER_STORE);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function deleteTenderFromIdb(id: string): Promise<void> {
  try {
    const db = await openTenderDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_TENDER_STORE, "readwrite");
      const store = tx.objectStore(IDB_TENDER_STORE);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  }
}

export function generateTenderNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TR-${year}-${rand}`;
}

export function createBlankTenderSubmission(): TenderSubmission {
  const now = new Date();
  const subNo = generateTenderNumber();
  const dateStr = now.toLocaleDateString("en-AU", { day: "numeric", month: "numeric", year: "numeric" });

  const initialDocs: Record<string, TenderDocumentSlot> = {};
  for (const slot of STANDARD_DOCUMENT_SLOTS) {
    initialDocs[slot.id] = { ...slot };
  }

  return {
    id: `tender_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    submissionNumber: subNo,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    status: "draft",

    tenderRequestDate: dateStr,
    priceListDate: "1st Dec 2024",
    displayOffice: "Flagstone Display Centre",
    newHomeConsultant: "Morgan Hales",
    consultantPhone: "0417 571 864",
    consultantEmail: "Morgan.hales@hudsonhomes.com.au",
    iquoteDate: dateStr,
    iquoteId: subNo.replace("TR-", "MH-"),
    source: "Referred by friend",

    buildType: "Vacant Land",
    purchaserType: "Owner Occupier",

    customer1: {
      title: "Mr",
      firstName: "",
      surname: "",
      mobile: "",
      email: "",
    },
    hasCustomer2: false,
    customer2: {
      title: "Mrs",
      firstName: "",
      surname: "",
      mobile: "",
      email: "",
    },

    currentHomeAddress: {
      streetNumber: "",
      streetName: "",
      suburb: "",
      state: "QLD",
      postcode: "",
    },

    land: {
      estate: "",
      stage: "",
      lotNo: "",
      lotSizeM2: "",
      frontageM: "",
      streetNumber: "",
      streetName: "",
      suburb: "",
      council: "Logan City Council",
      covenantsGuidelines: true,
      isRegistered: true,
      registeredDate: "",
      landStatus: "Exchanged",
      comments: "",
    },

    homeSpec: {
      housingType: "Single Storey",
      homeDesign: "Amber 21",
      facade: "Classic",
      inclusionsType: "H2 Designer",
      isDoubleStorey: false,
      garageLocation: "RHS",
      floorplanUrl: findFloorplanUrl("Amber 21"),
      isModifiedFloorplan: false,
      designM2: 195.4,
      floorplanPins: [],
      setbacks: {
        frontBoundary: "6.0m",
        rearBoundary: "1.5m",
        leftBoundary: "1.0m",
        rightBoundary: "1.0m",
      },
      specialOffers: "Hudson Special Builder Promotion",
      customerBudget: "",
      baseDesignCost: 0,
      facadeCost: 0,
      structuralVariationsCost: 0,
      internalUpgradesCost: 0,
      additionalSiteCost: 0,
      promotionDiscountCost: 0,
      totalBudgetEstimate: 0,
    },

    variations: [],

    atp: {
      feeType: "greenfield_1650",
      feeAmount: 1650,
      isCustomDesignAddon: false,
      customDesignAddonAmount: 800,
      tenderAcceptanceFee: 4400,
      client1Signed: false,
      client1Name: "",
      client1SignatureDate: dateStr,
      client2Signed: false,
      client2Name: "",
      client2SignatureDate: dateStr,
      consultantSigned: true,
      consultantName: "Morgan Hales",
      consultantSignatureDate: dateStr,
      paymentMethod: "eft",
      eftAccountName: "Hudson Homes Pty Ltd",
      eftBsb: "082-778",
      eftAccountNumber: "74586 5607",
      eftReference: subNo,
    },

    checklist: DEFAULT_CHECKLIST_ITEMS.map((it) => ({ ...it })),
    documents: initialDocs,

    workflowManager: {
      targetName: "Bernie",
      targetEmail: "workflow.qld@hudsonhomes.com.au",
      notesForBernie: "Please find attached the complete Tender Request submission package for OnSite job creation.",
    },
  };
}

/**
 * Automatically converts a saved Quote into a pre-filled Tender Submission
 */
export function createTenderFromQuote(quote: FullQuote): TenderSubmission {
  const base = createBlankTenderSubmission();
  const c = quote.client;
  const d = quote.design;
  const s = quote.siteConditions;
  const p = quote.pricing;

  // Split client name if combined
  let c1First = c.clientName || "";
  let c1Last = "";
  if (c1First.includes("&")) {
    const parts = c1First.split("&");
    c1First = parts[0].trim();
    c1Last = parts[1].trim();
  } else if (c1First.includes(" ")) {
    const parts = c1First.split(" ");
    c1Last = parts.pop() || "";
    c1First = parts.join(" ");
  }

  let c2First = c.client2Name || "";
  let c2Last = "";
  if (c2First.includes(" ")) {
    const parts = c2First.split(" ");
    c2Last = parts.pop() || "";
    c2First = parts.join(" ");
  } else if (!c2First && c1Last) {
    c2Last = c1Last;
  }

  // Determine Build Type & Deposit
  let buildType: BuildType = "Vacant Land";
  let feeType: "greenfield_1650" | "kdr_duplex_3300" | "package_3000" | "custom_design_800" = "greenfield_1650";
  let feeAmount = 1650;
  let acceptanceFee: 4400 | 6600 = 4400;

  if (c.depositType === "brownfield" || s.demolitionAsbestosRequired) {
    buildType = "Knock-Down, Rebuild";
    feeType = "kdr_duplex_3300";
    feeAmount = 3300;
    acceptanceFee = 6600;
  } else if (d.hasSecondDwelling && d.secondDwelling?.enabled) {
    feeType = "kdr_duplex_3300";
    feeAmount = 3300;
    acceptanceFee = 4400;
  }

  const isCustom = d.mode === "custom_floorplan";

  // Map Inclusion Tier
  let incType: TenderInclusionType = "H2 Designer";
  if (d.specTier.includes("H1")) incType = "H1 Smart";
  else if (d.specTier.includes("H3")) incType = "H3 Luxury";
  else if (d.specTier.includes("Standard")) incType = "Standard";

  // Retrieve Floorplan drawing URL
  let planUrl = d.floorplanUrl || "";
  if (!planUrl && d.designName) {
    const found = plansForDesign(d.designName);
    if (found.length > 0) planUrl = found[0].url;
  }

  // Separate line items: Structural variations vs Internal upgrades
  const allIncluded = (quote.lineItems || []).filter((it) => it.isIncluded && it.subtotal > 0);
  
  let structuralCount = 0;
  const processedVariations: TenderNumberedVariation[] = [];
  const initialPins: TenderFloorplanPin[] = [];

  for (const it of allIncluded) {
    const nameLower = (it.name || "").toLowerCase();
    const isStruct =
      it.category === "structural" ||
      nameLower.includes("alfresco") ||
      nameLower.includes("garage") ||
      nameLower.includes("room") ||
      nameLower.includes("extension") ||
      nameLower.includes("ceiling height") ||
      nameLower.includes("wall") ||
      nameLower.includes("ensuite") ||
      nameLower.includes("sliding door") ||
      nameLower.includes("stacker");

    if (isStruct) {
      structuralCount++;
      const vId = it.id;
      processedVariations.push({
        id: vId,
        itemNumber: structuralCount,
        description: it.name, // Clean title only
        cost: it.subtotal,
        category: it.category,
        isStructural: true,
      });

      // Place default spread pin coordinates
      const angle = (structuralCount * 65) % 360;
      const rad = (angle * Math.PI) / 180;
      const x = Math.min(85, Math.max(15, Math.round(50 + 30 * Math.cos(rad))));
      const y = Math.min(85, Math.max(15, Math.round(50 + 30 * Math.sin(rad))));

      initialPins.push({
        id: `pin_${structuralCount}`,
        number: structuralCount,
        x,
        y,
        title: it.name,
        variationId: vId,
      });
    } else {
      processedVariations.push({
        id: it.id,
        description: it.name, // Clean title only
        cost: it.subtotal,
        category: it.category,
        isStructural: false,
      });
    }
  }

  const structCost = processedVariations.filter((v) => v.isStructural).reduce((s, v) => s + v.cost, 0);
  const internalCost = processedVariations.filter((v) => !v.isStructural).reduce((s, v) => s + v.cost, 0);

  // Pre-fill documents
  const docs = { ...base.documents };

  return {
    ...base,
    sourceQuoteId: quote.id,
    iquoteId: quote.quoteNumber || base.iquoteId,
    buildType,
    customer1: {
      title: "Mr",
      firstName: c1First,
      surname: c1Last || c.clientName,
      mobile: c.clientPhone || "",
      email: c.clientEmail || "",
    },
    hasCustomer2: !!c.hasClient2 || !!c.client2Name,
    customer2: {
      title: "Mrs",
      firstName: c2First,
      surname: c2Last || c1Last || "",
      mobile: c.client2Phone || "",
      email: c.client2Email || "",
    },
    currentHomeAddress: {
      streetNumber: "",
      streetName: c.siteAddress || "",
      suburb: c.suburb || "",
      state: "QLD",
      postcode: c.postcode || "",
    },
    land: {
      ...base.land,
      estate: c.estate || "",
      lotNo: c.lotNumber || "",
      streetNumber: "",
      streetName: c.siteAddress || "",
      suburb: c.suburb || "",
      council: s.councilRegion || "Logan City Council",
      landStatus: c.depositType === "brownfield" ? "Settled" : "Exchanged",
    },
    homeSpec: {
      housingType: (d.housingType as any) || "Single Storey",
      homeDesign: d.designName || "Amber 21",
      facade: d.facadeName || "Classic",
      inclusionsType: incType,
      isDoubleStorey: d.housingType === "Double Storey" || (d.mode === "custom_floorplan" && d.customSpec.storeys === "double"),
      garageLocation: "RHS",
      floorplanUrl: planUrl,
      isModifiedFloorplan: !!d.isModifiedFloorplan,
      designM2: d.designM2 || 195.4,
      floorplanPins: initialPins,
      setbacks: {
        frontBoundary: "6.0m",
        rearBoundary: "1.5m",
        leftBoundary: "1.0m",
        rightBoundary: "1.0m",
      },
      specialOffers: d.specialPromotionTitle || "Hudson Special Builder Promotion",
      customerBudget: p.grossEstimatedInvestment || "",
      baseDesignCost: p.baseHousePrice || 0,
      facadeCost: p.facadePrice || 0,
      structuralVariationsCost: structCost,
      internalUpgradesCost: internalCost,
      additionalSiteCost: p.totalSiteAndStatutory || 0,
      promotionDiscountCost: p.promotionalDiscount || 0,
      totalBudgetEstimate: p.grossEstimatedInvestment || 0,
    },
    variations: processedVariations,
    atp: {
      ...base.atp,
      feeType,
      feeAmount: c.depositAmount || feeAmount,
      isCustomDesignAddon: isCustom || !!c.custom3dTourSelected,
      tenderAcceptanceFee: acceptanceFee,
      client1Name: c.clientName || "",
      client2Name: c.client2Name || "",
      consultantName: c.consultantName || "Morgan Hales",
      eftReference: `${(c1Last || c.clientName || "Client").replace(/\s+/g, "").toUpperCase()}-${quote.quoteNumber || "MH"}`,
    },
    documents: docs,
  };
}

/**
 * Compiles all documents and forms in the submission into a ready-to-unzip Job Folder ZIP archive!
 */
export async function exportTenderZipPackage(
  submission: TenderSubmission,
  generatedPdfs?: { atpPdfBlob?: Blob; trFormPdfBlob?: Blob; quotePdfBlob?: Blob }
): Promise<Blob> {
  const zip = new JSZip();
  const surname = (submission.customer1.surname || "Client").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
  const folderName = `${surname} - Job Folder`;
  const folder = zip.folder(folderName) || zip;

  // 1. Add Unified Tender Request & ATP Master PDF
  if (generatedPdfs?.trFormPdfBlob) {
    folder.file(`${surname} - Tender Request & Authority to Proceed.pdf`, generatedPdfs.trFormPdfBlob);
  } else if (generatedPdfs?.atpPdfBlob) {
    folder.file(`${surname} - Authority to Proceed Signed.pdf`, generatedPdfs.atpPdfBlob);
  }

  if (generatedPdfs?.quotePdfBlob) {
    folder.file(`${surname} - Building Quote.pdf`, generatedPdfs.quotePdfBlob);
  }

  // 2. Add Attached Documents from document slots
  for (const [slotId, doc] of Object.entries(submission.documents)) {
    if (doc.fileDataUrl) {
      try {
        const commaIdx = doc.fileDataUrl.indexOf(",");
        if (commaIdx >= 0) {
          const base64Data = doc.fileDataUrl.slice(commaIdx + 1);
          const ext = doc.fileName ? doc.fileName.split(".").pop() : "pdf";
          
          let standardizedFileName = `${surname} - ${doc.label}.${ext}`;
          if (slotId === "license_c1_front") {
            standardizedFileName = `Drivers License - ${submission.customer1.firstName || "Client1"} - Front.${ext}`;
          } else if (slotId === "license_c1_back") {
            standardizedFileName = `Drivers License - ${submission.customer1.firstName || "Client1"} - Back.${ext}`;
          } else if (slotId === "license_c2_front") {
            standardizedFileName = `Drivers License - ${submission.customer2.firstName || "Client2"} - Front.${ext}`;
          } else if (slotId === "license_c2_back") {
            standardizedFileName = `Drivers License - ${submission.customer2.firstName || "Client2"} - Back.${ext}`;
          } else if (slotId === "proof_of_ownership") {
            standardizedFileName = `${surname} - proof of ownership - land contract.${ext}`;
          } else if (slotId === "disclosure_plan") {
            standardizedFileName = `${surname} - Disclosure Plan.${ext}`;
          } else if (slotId === "contour_survey") {
            standardizedFileName = `${surname} - Contour Survey.${ext}`;
          } else if (slotId === "siting_plan") {
            standardizedFileName = `${surname} - Siting Plan.${ext}`;
          } else if (slotId === "plan_of_subdivision") {
            standardizedFileName = `${surname} - POD.${ext}`;
          } else if (slotId === "covenant_guidelines") {
            standardizedFileName = `${surname} - Covenant Guidelines.${ext}`;
          } else if (slotId === "deposit_receipt") {
            standardizedFileName = `Transfer of $${submission.atp.feeAmount}.${ext}`;
          }

          folder.file(standardizedFileName, base64Data, { base64: true });
        }
      } catch (e) {
        console.warn(`Could not add document ${slotId} to zip:`, e);
      }
    }
  }

  // 3. Add OnSite Client Summary JSON & Text file
  const onsiteSummary = `=====================================================
HUDSON HOMES - TENDER REQUEST ONSITE SUMMARY
=====================================================
Submission Ref: ${submission.submissionNumber}
Date: ${submission.tenderRequestDate}
Consultant: ${submission.newHomeConsultant} (${submission.consultantPhone})
Office: ${submission.displayOffice}

CUSTOMER 1:
Name: ${submission.customer1.title || ""} ${submission.customer1.firstName} ${submission.customer1.surname}
Mobile: ${submission.customer1.mobile}
Email: ${submission.customer1.email}

CUSTOMER 2:
${submission.hasCustomer2 ? `Name: ${submission.customer2.title || ""} ${submission.customer2.firstName} ${submission.customer2.surname}\nMobile: ${submission.customer2.mobile}\nEmail: ${submission.customer2.email}` : "None"}

PROPOSED SITE ADDRESS:
Lot ${submission.land.lotNo}, ${submission.land.streetName || submission.land.estate || ""}
Suburb: ${submission.land.suburb} (${submission.land.council})
Estate / Stage: ${submission.land.estate} ${submission.land.stage ? `· Stage ${submission.land.stage}` : ""}
Lot Size: ${submission.land.lotSizeM2} m² · Frontage: ${submission.land.frontageM} m
Registration: ${submission.land.isRegistered ? "Registered" : `Unregistered (${submission.land.registeredDate || "TBA"})`}

BUILD SPECIFICATION:
Build Type: ${submission.buildType}
Design: ${submission.homeSpec.homeDesign} (${submission.homeSpec.isDoubleStorey ? "Double Storey" : "Single Storey"})
Facade: ${submission.homeSpec.facade}
Inclusion Range: ${submission.homeSpec.inclusionsType}
Garage: ${submission.homeSpec.garageLocation}

ESTIMATED PRICING BREAKDOWN:
Base House Price: ${formatAud(submission.homeSpec.baseDesignCost)}
Facade Uplift: ${formatAud(submission.homeSpec.facadeCost)}
Structural Variations: ${formatAud(submission.homeSpec.structuralVariationsCost)}
Internal Selections: ${formatAud(submission.homeSpec.internalUpgradesCost)}
Site & Statutory Costs: ${formatAud(submission.homeSpec.additionalSiteCost)}
Builder Promotion Discount: -${formatAud(submission.homeSpec.promotionDiscountCost)}
-----------------------------------------------------
TOTAL ESTIMATED BUILD INVESTMENT: ${formatAud(submission.homeSpec.totalBudgetEstimate)}

AUTHORITY TO PROCEED & TENDER FEE:
Tender Fee: ${formatAud(submission.atp.feeAmount)} via ${submission.atp.paymentMethod.toUpperCase()}
Reference: ${submission.atp.eftReference}
Client 1 Signed: ${submission.atp.client1Signed ? `YES (${submission.atp.client1SignatureDate})` : "Pending"}
Client 2 Signed: ${submission.atp.client2Signed ? `YES (${submission.atp.client2SignatureDate})` : "N/A"}
=====================================================`;

  folder.file(`${surname} - OnSite Summary.txt`, onsiteSummary);

  return await zip.generateAsync({ type: "blob" });
}
