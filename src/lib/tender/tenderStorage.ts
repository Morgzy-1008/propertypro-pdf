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

import { HUDSON_FACADES } from "@/components/flyer/facades.data";

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

export function findFacadeRenderUrl(facadeName: string, housingType?: string): string {
  if (!facadeName) return HUDSON_FACADES[0]?.url || "";
  const clean = facadeName.replace(/\(.*?\)/g, "").trim().toLowerCase();

  const isDouble = (housingType || "").toLowerCase().includes("double");
  const match = HUDSON_FACADES.find((f) => {
    const fName = f.name.toLowerCase();
    const matchesName = fName.includes(clean) || clean.includes(fName);
    if (!matchesName) return false;
    if (isDouble) {
      return f.range.toLowerCase().includes("double") || f.tags.includes("double");
    }
    return true;
  });

  if (match?.url) return match.url;

  // fallback by name
  const fallback = HUDSON_FACADES.find((f) => f.name.toLowerCase().includes(clean) || clean.includes(f.name.toLowerCase()));
  return fallback?.url || HUDSON_FACADES[0]?.url || "";
}

import { landscapingPriceFor } from "../landscaping";

export function calculateLandscapePackageCost(lotSizeM2: number | "", housingType?: string, designName?: string): number {
  const m2 = typeof lotSizeM2 === "number" && lotSizeM2 > 0 ? lotSizeM2 : 450;
  return landscapingPriceFor(m2, housingType || "single-storey", designName || "");
}

const STORAGE_KEY_TENDERS = "hudson_tender_submissions_v1";
const IDB_TENDER_DB = "PropertyProTendersDB";
const IDB_TENDER_STORE = "tenders";

export const STANDARD_DOCUMENT_SLOTS: Omit<TenderDocumentSlot, "fileDataUrl" | "fileName" | "fileSize" | "fileType">[] = [
  // 1. PRIMARY REQUIRED DOCUMENTS (Pinned to Top)
  { id: "final_floorplan", label: "Final Floorplan — HD Architectural Markup with Numbered Pins", category: "land_siting", required: false },
  { id: "draftsmen_variations", label: "Draftsmen Variations — Floorplan, Facade & Working Drawings Checklist", category: "land_siting", required: false },
  { id: "license_c1_front", label: "Driver Licence — Client 1 (Front)", category: "identity", required: true },
  { id: "license_c1_back", label: "Driver Licence — Client 1 (Back)", category: "identity", required: true },
  { id: "license_c2_front", label: "Driver Licence — Client 2 (Front)", category: "identity", required: false },
  { id: "license_c2_back", label: "Driver Licence — Client 2 (Back)", category: "identity", required: false },
  { id: "proof_of_ownership", label: "Proof of Ownership / Land Contract", category: "contract_quote", required: true },
  { id: "disclosure_plan", label: "Disclosure Plan", category: "land_siting", required: true },
  { id: "siting_plan", label: "1:200 Scale Siting / House Position Plan", category: "land_siting", required: true },
  { id: "deposit_receipt", label: "Tender Fee Transfer / Deposit Receipt", category: "payment", required: true },

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

/**
 * Standardizes document file names across the entire job folder with Client 1 Surname first!
 * Example: Hales_Drivers License_Front.pdf, Hales_Final Floorplan.png
 */
export function getStandardizedDocumentFileName(
  surname?: string,
  slotId: string = "document",
  originalFileName?: string,
  atpFeeAmount?: number
): string {
  const cleanSurname = (surname || "Client").trim().replace(/[^a-zA-Z0-9_-]/g, "_") || "Client";
  let ext = "pdf";
  if (originalFileName && originalFileName.includes(".")) {
    ext = originalFileName.split(".").pop() || "pdf";
  }

  switch (slotId) {
    case "final_floorplan":
      return `${cleanSurname}_Final Floorplan.${ext}`;
    case "draftsmen_variations":
      return `${cleanSurname}_Draftsmen Variations.${ext}`;
    case "license_c1_front":
      return `${cleanSurname}_Drivers License_Front.${ext}`;
    case "license_c1_back":
      return `${cleanSurname}_Drivers License_Back.${ext}`;
    case "license_c2_front":
      return `${cleanSurname}_Client 2 Drivers License_Front.${ext}`;
    case "license_c2_back":
      return `${cleanSurname}_Client 2 Drivers License_Back.${ext}`;
    case "proof_of_ownership":
      return `${cleanSurname}_Proof of Ownership_Land Contract.${ext}`;
    case "disclosure_plan":
      return `${cleanSurname}_Disclosure Plan.${ext}`;
    case "siting_plan":
      return `${cleanSurname}_1-200 Scale Siting Plan.${ext}`;
    case "deposit_receipt":
      return `${cleanSurname}_Deposit Receipt_Transfer of $${atpFeeAmount || 1650}.${ext}`;
    case "contour_survey":
      return `${cleanSurname}_Contour Survey.${ext}`;
    case "plan_of_subdivision":
      return `${cleanSurname}_Plan of Subdivision.${ext}`;
    case "covenant_guidelines":
      return `${cleanSurname}_Covenant Guidelines.${ext}`;
    case "bushfire_report":
      return `${cleanSurname}_Bushfire Hazard Assessment BAL Report.${ext}`;
    case "compaction_report":
      return `${cleanSurname}_Compaction Certificate.${ext}`;
    case "soil_wind_rating":
      return `${cleanSurname}_Soil Test and Wind Rating Report.${ext}`;
    case "sewer_drainage_plan":
      return `${cleanSurname}_Sewer and Drainage Diagram.${ext}`;
    case "discount_approval_pdf":
      return `${cleanSurname}_Discount Approval Form.${ext}`;
    default: {
      const cleanSlot = slotId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\s+/g, "_");
      return `${cleanSurname}_${cleanSlot}.${ext}`;
    }
  }
}

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

import { supabase } from "@/integrations/supabase/client";

export async function syncTenderToSupabase(submission: TenderSubmission): Promise<void> {
  try {
    const payload = {
      name: `Tender Request: ${submission.submissionNumber} - ${submission.customer1.surname || "Client"}`,
      housing_type: submission.homeSpec.housingType || "Single Storey",
      design: submission.homeSpec.homeDesign || "Design",
      range_id: "designer",
      facade_uplift: submission.homeSpec.facadeCost || 0,
      notes: submission.submissionNumber,
      flyer_data: {
        type: "tender_submission",
        tender: submission,
      } as any,
    };

    const { data: existing } = await supabase
      .from("packages")
      .select("id")
      .eq("notes", submission.submissionNumber)
      .maybeSingle();

    if (existing?.id) {
      await supabase.from("packages").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("packages").insert(payload);
    }
  } catch (err) {
    console.warn("Supabase tender sync fallback:", err);
  }
}

export async function getTenderFromSupabase(idOrSubNo: string): Promise<TenderSubmission | null> {
  try {
    const { data: byNotes } = await supabase
      .from("packages")
      .select("flyer_data")
      .eq("notes", idOrSubNo)
      .maybeSingle();

    if (byNotes?.flyer_data && (byNotes.flyer_data as any).tender) {
      return (byNotes.flyer_data as any).tender as TenderSubmission;
    }

    const { data: byId } = await supabase
      .from("packages")
      .select("flyer_data")
      .eq("id", idOrSubNo)
      .maybeSingle();

    if (byId?.flyer_data && (byId.flyer_data as any).tender) {
      return (byId.flyer_data as any).tender as TenderSubmission;
    }
  } catch (err) {
    console.warn("Supabase tender lookup fallback:", err);
  }
  return null;
}

export async function saveTenderToIdb(submission: TenderSubmission): Promise<void> {
  try {
    const db = await openTenderDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_TENDER_STORE, "readwrite");
      const store = tx.objectStore(IDB_TENDER_STORE);
      const req = store.put(submission);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn("Tender IDB save fallback:", e);
  }

  // Also silently sync to Supabase in the background
  syncTenderToSupabase(submission).catch(() => {});
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
    const directResult = await new Promise<TenderSubmission | null>((resolve) => {
      const tx = db.transaction(IDB_TENDER_STORE, "readonly");
      const store = tx.objectStore(IDB_TENDER_STORE);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });

    if (directResult) return directResult;

    // Search IDB by submissionNumber
    const all = await loadAllTendersFromIdb();
    const match = all.find((t) => t.id === id || t.submissionNumber === id);
    if (match) return match;

    // Fallback to Supabase database
    const fromSupabase = await getTenderFromSupabase(id);
    if (fromSupabase) {
      await saveTenderToIdb(fromSupabase);
      return fromSupabase;
    }

    return null;
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
    priceListDate: "",
    displayOffice: "",
    newHomeConsultant: "",
    consultantPhone: "",
    consultantEmail: "",
    iquoteDate: "",
    iquoteId: "",
    source: "",

    buildType: "Greenfield Site",
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
      state: "",
      postcode: "",
    },

    land: {
      estate: "",
      stage: "",
      lotNo: "",
      lotSizeM2: "" as any,
      frontageM: "" as any,
      streetNumber: "",
      streetName: "",
      suburb: "",
      council: "",
      covenantsGuidelines: false,
      isRegistered: false,
      registeredDate: "",
      landStatus: "Exchanged",
      ifKdrOccupancy: "Owner Occupied",
      comments: "",
    },

    homeSpec: {
      housingType: "Single Storey",
      homeDesign: "",
      facade: "",
      inclusionsType: "H2 Designer",
      isDoubleStorey: false,
      garageLocation: "RHS",
      floorplanUrl: "",
      originalFloorplanUrl: "",
      facadeRenderUrl: "",
      sitingPlanDataUrl: "",
      isModifiedFloorplan: false,
      designM2: 0,
      floorplanPins: [],
      includeLandscapePackage: false,
      landscapePackageCost: 0,
      setbacks: {
        frontBoundary: "",
        rearBoundary: "",
        leftBoundary: "",
        rightBoundary: "",
      },
      specialOffers: "",
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
      consultantSigned: false,
      consultantName: "",
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

export function parseClientNames(c1Raw: string, c2Raw?: string) {
  let c1First = "";
  let c1Last = "";
  let c2First = "";
  let c2Last = "";
  let has2 = false;

  const raw1 = (c1Raw || "").trim();
  const raw2 = (c2Raw || "").trim();

  if (raw1.includes("&") || raw1.toLowerCase().includes(" and ")) {
    const splitRegex = /\s+(?:&|and)\s+/i;
    const parts = raw1.split(splitRegex);
    const part1 = parts[0]?.trim() || "";
    const part2 = parts[1]?.trim() || "";

    const p1Tokens = part1.split(/\s+/).filter(Boolean);
    const p2Tokens = part2.split(/\s+/).filter(Boolean);

    if (p2Tokens.length >= 2) {
      c2Last = p2Tokens[p2Tokens.length - 1];
      c2First = p2Tokens.slice(0, -1).join(" ");
    } else if (p2Tokens.length === 1) {
      c2First = p2Tokens[0];
    }

    if (p1Tokens.length >= 2) {
      c1Last = p1Tokens[p1Tokens.length - 1];
      c1First = p1Tokens.slice(0, -1).join(" ");
    } else if (p1Tokens.length === 1) {
      c1First = p1Tokens[0];
      if (!c1Last && c2Last) c1Last = c2Last;
    }

    if (!c2Last && c1Last) {
      c2Last = c1Last;
    }

    has2 = !!c2First;
  } else {
    const tokens1 = raw1.split(/\s+/).filter(Boolean);
    if (tokens1.length >= 2) {
      c1Last = tokens1[tokens1.length - 1];
      c1First = tokens1.slice(0, -1).join(" ");
    } else {
      c1First = raw1;
      c1Last = "";
    }

    if (raw2) {
      const tokens2 = raw2.split(/\s+/).filter(Boolean);
      if (tokens2.length >= 2) {
        c2Last = tokens2[tokens2.length - 1];
        c2First = tokens2.slice(0, -1).join(" ");
      } else {
        c2First = raw2;
        c2Last = c1Last;
      }
      has2 = true;
    }
  }

  return { c1First, c1Last, c2First, c2Last, has2: has2 || !!raw2 };
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

  const { c1First, c1Last, c2First, c2Last, has2 } = parseClientNames(c.clientName || "", c.client2Name || "");

  // Determine Build Type & Deposit
  let buildType: BuildType = "Greenfield Site";
  let feeType: "greenfield_1650" | "kdr_duplex_3300" | "package_3000" | "custom_design_800" = "greenfield_1650";
  let feeAmount = 1650;
  let acceptanceFee: 4400 | 6600 = 4400;

  if (c.depositType === "brownfield" || s.demolitionAsbestosRequired) {
    buildType = "Knock-Down, Rebuild (KDRB)";
    feeType = "kdr_duplex_3300";
    feeAmount = 3300;
    acceptanceFee = 6600;
  } else if (d.hasSecondDwelling && d.secondDwelling?.enabled) {
    buildType = "Knock-Down, Rebuild (KDRB)";
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

  // Floorplans & Facades
  const originalUrl = findFloorplanUrl(d.designName || "");
  const currentPlanUrl = d.floorplanUrl || originalUrl;
  const isMod = !!d.isModifiedFloorplan || (!!d.floorplanUrl && d.floorplanUrl !== originalUrl);
  const facadeRender = findFacadeRenderUrl(d.facadeName, d.housingType);
  const isCustomFac = !!d.isCustomFacade || (d.facadePrice > 0 && !HUDSON_FACADES.some(f => f.name.toLowerCase() === (d.facadeName || "").toLowerCase()));

  // 1. Line items categorization into variations
  const allIncluded = (quote.lineItems || []).filter((it) => it.isIncluded && it.subtotal > 0);
  const processedVariations: TenderNumberedVariation[] = [];

  for (const it of allIncluded) {
    processedVariations.push({
      id: it.id,
      description: it.name, // Full title only
      cost: it.subtotal,
      category: "all_variations", // All start in Group B unnumbered until marked structural
      isStructural: false,
      itemNumber: undefined,
    });
  }

  // 2. Driveway Package Automatic Transfer
  if (d.exposedDrivewaySelected || (p.exposedDrivewayCost || 0) > 0) {
    const dwM2 = d.exposedDrivewayM2 || 55;
    const dwCost = p.exposedDrivewayCost || d.exposedDrivewayCost || 5225;
    processedVariations.push({
      id: `var_driveway_${Date.now()}`,
      description: `Exposed Aggregate Concrete Driveway (${dwM2} m²) with cove finish & acid wash`,
      cost: dwCost,
      category: "all_variations",
      isStructural: false,
    });
  }

  // 3. Site Earthworks & Allowances Automatic Transfer
  if (s.fallTotalCost && s.fallTotalCost > 0) {
    processedVariations.push({
      id: `var_site_fall_${Date.now()}`,
      description: `Site Earthworks & Cut/Fill Allowance (${s.fallMeters || 1}m site fall across building envelope)`,
      cost: s.fallTotalCost,
      category: "all_variations",
      isStructural: false,
    });
  }
  if (s.retainingWallAllowance && s.retainingWallAllowance > 0) {
    processedVariations.push({
      id: `var_retaining_wall_${Date.now()}`,
      description: "Concrete Sleeper Retaining Wall Allowance",
      cost: s.retainingWallAllowance,
      category: "all_variations",
      isStructural: false,
    });
  }
  if (s.rockExcavationAllowance && s.rockExcavationAllowance > 0) {
    processedVariations.push({
      id: `var_rock_${Date.now()}`,
      description: "Provisional Rock Excavation Allowance",
      cost: s.rockExcavationAllowance,
      category: "all_variations",
      isStructural: false,
    });
  }
  if (s.pieringCost && s.pieringCost > 0) {
    processedVariations.push({
      id: `var_piering_${Date.now()}`,
      description: `Concrete Foundation Piering Allowance (${s.pieringAllowanceMeters || 20} linear metres)`,
      cost: s.pieringCost,
      category: "all_variations",
      isStructural: false,
    });
  }
  if (s.screwPieringRequired && (s.screwPieringCost || 0) > 0) {
    processedVariations.push({
      id: `var_screw_pier_${Date.now()}`,
      description: "Geotechnical Screw Piering Foundation System",
      cost: s.screwPieringCost || 0,
      category: "all_variations",
      isStructural: false,
    });
  }
  if (s.bushfireBal && s.bushfireBal !== "None" && (s.bushfireCost || 0) > 0) {
    processedVariations.push({
      id: `var_bushfire_${Date.now()}`,
      description: `Bushfire Attack Level Protection Specification (${s.bushfireBal})`,
      cost: s.bushfireCost,
      category: "all_variations",
      isStructural: false,
    });
  }
  if (s.councilDaRequired && (s.councilDaCost || 0) > 0) {
    processedVariations.push({
      id: `var_council_da_${Date.now()}`,
      description: "Council Town Planning / Development Application (DA) Management",
      cost: s.councilDaCost || 11000,
      category: "all_variations",
      isStructural: false,
    });
  }
  if (s.councilSetbackRelaxationRequired && (s.councilSetbackRelaxationCost || 0) > 0) {
    processedVariations.push({
      id: `var_setback_${Date.now()}`,
      description: "Council Boundary Setback Relaxation Application",
      cost: s.councilSetbackRelaxationCost || 2000,
      category: "all_variations",
      isStructural: false,
    });
  }
  if (s.demolitionAsbestosRequired && (s.demolitionAsbestosCost || 0) > 0) {
    processedVariations.push({
      id: `var_demo_${Date.now()}`,
      description: "Demolition & Asbestos Removal Site Allowance",
      cost: s.demolitionAsbestosCost || 30000,
      category: "all_variations",
      isStructural: false,
    });
  }

  // 4. Floorplan Area Differences & Breakdown
  const stdDesignM2 = d.standardDesignM2 || (isMod ? 195.4 : (d.designM2 || 195.4));
  const modDesignM2 = d.modifiedDesignM2 || d.designM2 || stdDesignM2;
  const stdBasePrice = d.standardBasePrice || p.baseHousePrice || 0;
  const sqmRate = stdDesignM2 > 0 ? Math.round(stdBasePrice / stdDesignM2) : 1847;

  const areaAdjustmentsBreakdown: Array<{
    label: string;
    standardM2: number;
    modifiedM2: number;
    diffM2: number;
    ratePerM2?: number;
    cost: number;
  }> = [];

  if (d.standardAreas && d.modifiedAreas) {
    const stdA = d.standardAreas as Record<string, number>;
    const modA = d.modifiedAreas as Record<string, number>;
    const areaLabels: Record<string, { name: string; rate: number }> = {
      livingM2: { name: "Living / Family Areas", rate: sqmRate },
      groundLivingM2: { name: "Ground Floor Living", rate: sqmRate },
      firstLivingM2: { name: "Upper Floor Living", rate: sqmRate },
      alfrescoM2: { name: "Outdoor Living / Alfresco", rate: 1210 },
      garageM2: { name: "Garage Envelope", rate: 1350 },
      porchM2: { name: "Entry Porch", rate: 1210 },
      balconyM2: { name: "Upper Balcony", rate: 1450 },
    };

    for (const [key, meta] of Object.entries(areaLabels)) {
      const sM2 = Number(stdA[key]) || 0;
      const mM2 = Number(modA[key]) || 0;
      if (sM2 > 0 && mM2 > 0 && Math.abs(mM2 - sM2) > 0.05) {
        const diffM2 = Number((mM2 - sM2).toFixed(2));
        const cost = Math.round(diffM2 * meta.rate);
        areaAdjustmentsBreakdown.push({
          label: meta.name,
          standardM2: sM2,
          modifiedM2: mM2,
          diffM2,
          ratePerM2: meta.rate,
          cost,
        });
      }
    }
  }

  // Fallback to overall design area difference if room breakdown not populated
  if (areaAdjustmentsBreakdown.length === 0 && Math.abs(modDesignM2 - stdDesignM2) > 0.05) {
    const diffM2 = Number((modDesignM2 - stdDesignM2).toFixed(2));
    const cost = Math.round(diffM2 * sqmRate);
    areaAdjustmentsBreakdown.push({
      label: "Floorplan Area Extension / Modification",
      standardM2: stdDesignM2,
      modifiedM2: modDesignM2,
      diffM2,
      ratePerM2: sqmRate,
      cost,
    });
  }

  // 5. Landscaping Package Automatic Transfer
  const hasLandscaping = !!d.landscapingSelected || (p.landscapingCost || 0) > 0;
  const lpCost = p.landscapingCost || d.landscapingCost || calculateLandscapePackageCost(d.landscapingLandSize || base.land.lotSizeM2 || 450, d.housingType, d.designName);

  const structCost = 0;
  const allVarCost = processedVariations.reduce((sum, v) => sum + v.cost, 0);

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
      surname: c1Last,
      mobile: c.clientPhone || "",
      email: c.clientEmail || "",
    },
    hasCustomer2: has2 || !!c.hasClient2 || !!c.client2Name,
    customer2: {
      title: "Mrs",
      firstName: c2First,
      surname: c2Last || c1Last,
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
      floorplanUrl: currentPlanUrl,
      originalFloorplanUrl: originalUrl,
      facadeRenderUrl: facadeRender,
      isCustomFacade: isCustomFac,
      customFacadeName: isCustomFac ? d.facadeName : undefined,
      customFacadeRenderUrl: isCustomFac ? facadeRender : undefined,
      sitingPlanDataUrl: "",
      isModifiedFloorplan: isMod,
      designM2: d.designM2 || 195.4,
      standardDesignM2: stdDesignM2,
      modifiedDesignM2: modDesignM2,
      standardBasePrice: stdBasePrice,
      sqmRate,
      standardAreas: d.standardAreas as any,
      modifiedAreas: d.modifiedAreas as any,
      areaAdjustmentsBreakdown,
      floorplanPins: [], // No auto-pins on quote import!
      includeLandscapePackage: hasLandscaping,
      landscapePackageCost: lpCost,
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
      internalUpgradesCost: allVarCost,
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
      client1Name: `${c1First} ${c1Last}`.trim() || c.clientName || "",
      client2Name: has2 ? `${c2First} ${c2Last}`.trim() || c.client2Name || "" : "",
      consultantName: c.consultantName || "Morgan Hales",
      eftReference: `${(c1Last || "Client").replace(/\s+/g, "").toUpperCase()}-${quote.quoteNumber || "MH"}`,
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
          const standardizedFileName = getStandardizedDocumentFileName(
            surname,
            slotId,
            doc.fileName || `${doc.label}.${ext}`,
            submission.atp.feeAmount
          );

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

export interface CompactTenderPayload {
  i: string;
  s: string;
  c1f: string;
  c1l: string;
  c1m?: string;
  c1e?: string;
  c2?: boolean;
  c2f?: string;
  c2l?: string;
  lot?: string;
  st?: string;
  sub?: string;
  coun?: string;
  dsn?: string;
  fac?: string;
  inc?: string;
  fee?: number;
  atpFee?: number;
  tot?: number;
  con?: string;
  ref?: string;
}

export function encodeTenderForRemoteLink(tender: TenderSubmission): string {
  try {
    const compact: CompactTenderPayload = {
      i: tender.id,
      s: tender.submissionNumber,
      c1f: tender.customer1.firstName || "",
      c1l: tender.customer1.surname || "",
      c1m: tender.customer1.mobile || undefined,
      c1e: tender.customer1.email || undefined,
      c2: tender.hasCustomer2 || undefined,
      c2f: tender.hasCustomer2 ? tender.customer2.firstName : undefined,
      c2l: tender.hasCustomer2 ? tender.customer2.surname : undefined,
      lot: tender.land.lotNo || undefined,
      st: tender.land.streetName || undefined,
      sub: tender.land.suburb || undefined,
      coun: tender.land.council || undefined,
      dsn: tender.homeSpec.homeDesign || undefined,
      fac: tender.homeSpec.facade || undefined,
      inc: tender.homeSpec.inclusionsType || undefined,
      fee: tender.atp.feeAmount || undefined,
      atpFee: tender.atp.tenderAcceptanceFee || undefined,
      tot: tender.homeSpec.totalBudgetEstimate || undefined,
      con: tender.newHomeConsultant || undefined,
      ref: tender.atp.eftReference || undefined,
    };
    const json = JSON.stringify(compact);
    const utf8Bytes = new TextEncoder().encode(json);
    let binary = "";
    for (let i = 0; i < utf8Bytes.length; i++) {
      binary += String.fromCharCode(utf8Bytes[i]);
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch (e) {
    console.error("Failed to encode tender for remote link:", e);
    return "";
  }
}

export function decodeTenderFromRemoteLink(encoded: string): TenderSubmission | null {
  try {
    if (!encoded) return null;
    let b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const jsonStr = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(jsonStr);

    if (parsed && (parsed.s || parsed.c1f !== undefined)) {
      const base = createBlankTenderSubmission();
      if (parsed.i) base.id = parsed.i;
      if (parsed.s) base.submissionNumber = parsed.s;
      if (parsed.c1f) base.customer1.firstName = parsed.c1f;
      if (parsed.c1l) base.customer1.surname = parsed.c1l;
      if (parsed.c1m) base.customer1.mobile = parsed.c1m;
      if (parsed.c1e) base.customer1.email = parsed.c1e;
      base.hasCustomer2 = !!parsed.c2;
      if (parsed.c2f) base.customer2.firstName = parsed.c2f;
      if (parsed.c2l) base.customer2.surname = parsed.c2l;
      if (parsed.lot) base.land.lotNo = parsed.lot;
      if (parsed.st) base.land.streetName = parsed.st;
      if (parsed.sub) base.land.suburb = parsed.sub;
      if (parsed.coun) base.land.council = parsed.coun;
      if (parsed.dsn) {
        base.homeSpec.homeDesign = parsed.dsn;
        const fp = findFloorplanUrl(parsed.dsn);
        if (fp) {
          base.homeSpec.floorplanUrl = fp;
          base.homeSpec.originalFloorplanUrl = fp;
        }
      }
      if (parsed.fac) base.homeSpec.facade = parsed.fac;
      if (parsed.inc) base.homeSpec.inclusionsType = parsed.inc;
      if (parsed.fee) base.atp.feeAmount = parsed.fee;
      if (parsed.atpFee) base.atp.tenderAcceptanceFee = parsed.atpFee;
      if (parsed.tot) base.homeSpec.totalBudgetEstimate = parsed.tot;
      if (parsed.con) base.newHomeConsultant = parsed.con;
      if (parsed.ref) base.atp.eftReference = parsed.ref;

      base.atp.client1Name = `${base.customer1.firstName} ${base.customer1.surname}`.trim();
      if (base.hasCustomer2) {
        base.atp.client2Name = `${base.customer2.firstName} ${base.customer2.surname}`.trim();
      }
      return base;
    }

    return parsed as TenderSubmission;
  } catch (e) {
    console.error("Failed to decode tender from remote link:", e);
    return null;
  }
}

/**
 * 4 Fancy Cursive Signature Styles:
 * 1. Style 1: Full Name — Elegant Formal Script
 * 2. Style 2: Full Name — Modern Flourish Script
 * 3. Style 3: Initial + Surname — Executive Formal (e.g. J. Mitchell)
 * 4. Style 4: Initial + Surname — Modern Fluid Pen (e.g. J. Mitchell)
 */
export function generateCursiveSignatureDataUrl(
  fullName: string,
  styleIndex: 1 | 2 | 3 | 4 = 1,
  color: string = "#0284c7"
): string {
  if (typeof document === "undefined") return "";
  const offCanvas = document.createElement("canvas");
  offCanvas.width = 540;
  offCanvas.height = 180;
  const ctx = offCanvas.getContext("2d");
  if (!ctx) return "";

  const trimmed = fullName.trim() || "Hudson Client";
  const parts = trimmed.split(/\s+/);
  const first = parts[0] || "";
  const last = parts.slice(1).join(" ") || "";
  const initialName = parts.length > 1 ? `${first[0]}. ${last}` : first;

  let text = trimmed;
  let font = "italic 38px 'Brush Script MT', 'Dancing Script', 'Great Vibes', cursive, serif";

  switch (styleIndex) {
    case 1:
      text = trimmed;
      font = "italic 38px 'Brush Script MT', 'Dancing Script', 'Great Vibes', cursive, serif";
      break;
    case 2:
      text = trimmed;
      font = "italic 34px 'Segoe Script', 'Parisienne', 'Alex Brush', cursive, sans-serif";
      break;
    case 3:
      text = initialName;
      font = "italic 40px 'Snell Roundhand', 'Brush Script MT', 'Dancing Script', cursive, serif";
      break;
    case 4:
      text = initialName;
      font = "italic 36px 'Lucida Handwriting', 'Segoe Script', 'Great Vibes', cursive, sans-serif";
      break;
  }

  ctx.clearRect(0, 0, offCanvas.width, offCanvas.height);
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, offCanvas.width / 2, offCanvas.height / 2);

  return offCanvas.toDataURL("image/png");
}

/**
 * Renders an HD standalone full-page Floorplan with numbered pins for "Final Floorplan.pdf"
 */
export async function renderHdFinalFloorplanDataUrl(
  floorplanUrl: string,
  pins: TenderFloorplanPin[],
  designName: string,
  submissionNumber: string
): Promise<string> {
  if (typeof document === "undefined" || !floorplanUrl) return "";

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const width = Math.max(1600, img.naturalWidth || 1600);
      const height = Math.max(2200, (img.naturalHeight || 1200) + 260);
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve("");
        return;
      }

      // Background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      // Header Banner
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, width, 130);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 32px sans-serif";
      ctx.fillText("HUDSON HOMES — FINAL ARCHITECTURAL MARKUP FLOORPLAN", 50, 58);

      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(`${designName} · Ref: ${submissionNumber} · Active Structural Pin Schedule (${pins.length} Pins)`, 50, 96);

      // Floorplan Image
      const topOffset = 160;
      const availableHeight = height - topOffset - 70;
      const imgRatio = img.naturalWidth / img.naturalHeight;
      let drawW = width - 120;
      let drawH = drawW / imgRatio;

      if (drawH > availableHeight) {
        drawH = availableHeight;
        drawW = drawH * imgRatio;
      }

      const drawX = (width - drawW) / 2;
      const drawY = topOffset + (availableHeight - drawH) / 2;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      // Numbered Pins
      pins.forEach((pin) => {
        const pinX = drawX + (pin.x / 100) * drawW;
        const pinY = drawY + (pin.y / 100) * drawH;
        const radius = 24;

        // Dark outer halo
        ctx.beginPath();
        ctx.arc(pinX, pinY, radius + 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.fill();

        // Pin body
        ctx.beginPath();
        ctx.arc(pinX, pinY, radius, 0, Math.PI * 2);
        ctx.fillStyle = "#f59e0b";
        ctx.fill();

        // Pin number
        ctx.fillStyle = "#020617";
        ctx.font = "bold 22px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(pin.number), pinX, pinY + 1);
      });

      // Footer
      ctx.fillStyle = "#64748b";
      ctx.font = "16px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(
        `Hudson Homes Pty Ltd · Final Tender Plan for Drafting & OnSite Submission · Generated ${new Date().toLocaleDateString("en-AU")}`,
        50,
        height - 25
      );

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve("");
    img.src = floorplanUrl;
  });
}

/**
 * Renders an HD standalone working drawings specification directive for Bernie and the OnSite drafting team.
 * Includes side-by-side floorplan & facade renders, complete variation schedule, interactive/printable review checklists and notes.
 */
export async function renderDraftsmenVariationsDataUrl(
  submission: TenderSubmission
): Promise<string> {
  if (typeof document === "undefined") return "";

  const structuralItems = (submission.variations || []).filter((v) => v.isStructural);
  const otherItems = (submission.variations || []).filter((v) => !v.isStructural);
  const totalItemsCount = structuralItems.length + otherItems.length;

  const width = 1800;
  // Dynamic canvas height to ensure everything fits comfortably
  const baseHeight = 1450;
  const itemRowHeight = 90;
  const height = Math.max(2600, baseHeight + totalItemsCount * itemRowHeight + 250);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // 1. Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // 2. Dark Navy Top Header Banner
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, width, 160);

  // Logo / Title
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 34px sans-serif";
  ctx.fillText("HUDSON HOMES — DRAFTSMEN VARIATION DIRECTIVE & WORKING DRAWINGS CHECKLIST", 50, 65);

  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText(
    `Prepared for Bernie & OnSite Drafting Team · Job Ref: ${submission.submissionNumber} · Created ${submission.tenderRequestDate || new Date().toLocaleDateString("en-AU")}`,
    50,
    110
  );

  ctx.fillStyle = "#f59e0b";
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "right";
  ctx.fillText(`TOTAL VARIATIONS: ${totalItemsCount} ITEMS`, width - 50, 110);
  ctx.textAlign = "left";

  // 3. Project Information Metadata Card
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(50, 180, width - 100, 120);
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(50, 180, width - 100, 120);

  const colW = (width - 100) / 4;

  // Meta Col 1: Customer
  ctx.fillStyle = "#475569";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("CLIENT / PURCHASER", 70, 210);
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(`${submission.customer1.firstName} ${submission.customer1.surname}`, 70, 240);
  ctx.font = "14px monospace";
  ctx.fillStyle = "#64748b";
  ctx.fillText(`Ph: ${submission.customer1.mobile || "N/A"}`, 70, 268);

  // Meta Col 2: Site Location
  ctx.fillStyle = "#475569";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("BUILDING SITE LOCATION", 70 + colW, 210);
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(`Lot ${submission.land.lotNo || "TBA"}, ${submission.land.suburb || "QLD"}`, 70 + colW, 240);
  ctx.font = "14px sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText(`${submission.land.streetName || "Street TBA"} · ${submission.land.council || ""}`, 70 + colW, 268);

  // Meta Col 3: Design & Inclusions
  ctx.fillStyle = "#475569";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("HOME DESIGN & FACADE", 70 + colW * 2, 210);
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(`${submission.homeSpec.homeDesign} · ${submission.homeSpec.facade}`, 70 + colW * 2, 240);
  ctx.font = "14px sans-serif";
  ctx.fillStyle = "#0369a1";
  ctx.fillText(`Tier: ${submission.homeSpec.inclusionsType} · Garage: ${submission.homeSpec.garageLocation}`, 70 + colW * 2, 268);

  // Meta Col 4: Consultant & Workflow
  ctx.fillStyle = "#475569";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("CONSULTANT & TARGET", 70 + colW * 3, 210);
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(`${submission.newHomeConsultant || "Morgan Hales"}`, 70 + colW * 3, 240);
  ctx.font = "14px sans-serif";
  ctx.fillStyle = "#059669";
  ctx.fillText(`Target: Bernie & OnSite Drafting`, 70 + colW * 3, 268);

  // 4. Load Visual Reference Images (Floorplan & Facade)
  const floorplanUrl = submission.homeSpec.originalFloorplanUrl || submission.homeSpec.floorplanUrl;
  const facadeUrl = submission.homeSpec.facadeRenderUrl;

  const loadImg = (url?: string): Promise<HTMLImageElement | null> => {
    if (!url) return Promise.resolve(null);
    return new Promise((res) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = url;
    });
  };

  const [floorplanImg, facadeImg] = await Promise.all([loadImg(floorplanUrl), loadImg(facadeUrl)]);

  // Visual Reference Box (Y: 320 to 820)
  const visBoxY = 320;
  const visBoxH = 480;
  const visHalfW = (width - 120) / 2;

  // Left Visual Box: Floorplan
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(50, visBoxY, visHalfW, visBoxH);
  ctx.strokeStyle = "#e2e8f0";
  ctx.strokeRect(50, visBoxY, visHalfW, visBoxH);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("1. STANDARD / ACTIVE ARCHITECTURAL FLOORPLAN DRAWING", 65, visBoxY + 30);

  if (floorplanImg) {
    const availW = visHalfW - 30;
    const availH = visBoxH - 60;
    const r = floorplanImg.naturalWidth / floorplanImg.naturalHeight;
    let dW = availW;
    let dH = dW / r;
    if (dH > availH) {
      dH = availH;
      dW = dH * r;
    }
    const dX = 50 + (visHalfW - dW) / 2;
    const dY = visBoxY + 45 + (availH - dH) / 2;
    ctx.drawImage(floorplanImg, dX, dY, dW, dH);
  } else {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "15px sans-serif";
    ctx.fillText("Catalog floorplan drawing on file", 80, visBoxY + 120);
  }

  // Right Visual Box: Facade
  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(50 + visHalfW + 20, visBoxY, visHalfW, visBoxH);
  ctx.strokeStyle = "#e2e8f0";
  ctx.strokeRect(50 + visHalfW + 20, visBoxY, visHalfW, visBoxH);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText(`2. CHOSEN ARCHITECTURAL FACADE PERSPECTIVE (${submission.homeSpec.facade || "Standard"})`, 65 + visHalfW + 20, visBoxY + 30);

  if (facadeImg) {
    const availW = visHalfW - 30;
    const availH = visBoxH - 60;
    const r = facadeImg.naturalWidth / facadeImg.naturalHeight;
    let dW = availW;
    let dH = dW / r;
    if (dH > availH) {
      dH = availH;
      dW = dH * r;
    }
    const dX = 50 + visHalfW + 20 + (visHalfW - dW) / 2;
    const dY = visBoxY + 45 + (availH - dH) / 2;
    ctx.drawImage(facadeImg, dX, dY, dW, dH);
  } else {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "15px sans-serif";
    ctx.fillText("Architectural facade perspective render on file", 80 + visHalfW + 20, visBoxY + 120);
  }

  // 5. Variations Schedule & Draftsman Interactive Checklist
  let curY = visBoxY + visBoxH + 40;

  // Function to draw section header
  const drawSectionHeader = (title: string, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(50, curY, width - 100, 38);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(title, 65, curY + 25);
    curY += 45;

    // Table Column Headers
    ctx.fillStyle = "#f1f5f9";
    ctx.fillRect(50, curY, width - 100, 30);
    ctx.strokeStyle = "#cbd5e1";
    ctx.strokeRect(50, curY, width - 100, 30);

    ctx.fillStyle = "#475569";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("#", 65, curY + 20);
    ctx.fillText("VARIATION / DRAFTING DIRECTIVE SPECIFICATION", 120, curY + 20);
    ctx.fillText("DRAFTSMAN STATUS & SIGN-OFF", 1080, curY + 20);
    ctx.fillText("PLAN SHEET REF & DRAFTER NOTES", 1430, curY + 20);
    curY += 35;
  };

  // Helper to wrap text
  const wrapText = (text: string, maxWidth: number): string[] => {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = words[0] || "";

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const w = ctx.measureText(currentLine + " " + word).width;
      if (w < maxWidth) {
        currentLine += " " + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  // Section A: Numbered Structural Variations
  if (structuralItems.length > 0) {
    drawSectionHeader(`SECTION A: NUMBERED STRUCTURAL MODIFICATIONS (${structuralItems.length} ITEMS PINNED ON PLAN)`, "#b45309");

    structuralItems.forEach((item, idx) => {
      const isAlt = idx % 2 === 1;
      const rowH = 76;

      ctx.fillStyle = isAlt ? "#fffbeb" : "#ffffff";
      ctx.fillRect(50, curY, width - 100, rowH);
      ctx.strokeStyle = "#fde68a";
      ctx.strokeRect(50, curY, width - 100, rowH);

      // Badge
      ctx.beginPath();
      ctx.arc(80, curY + 38, 16, 0, Math.PI * 2);
      ctx.fillStyle = "#f59e0b";
      ctx.fill();
      ctx.fillStyle = "#020617";
      ctx.font = "bold 15px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(item.itemNumber || idx + 1), 80, curY + 39);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";

      // Description
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 15px sans-serif";
      const lines = wrapText(item.description, 920);
      lines.slice(0, 3).forEach((l, lIdx) => {
        ctx.fillText(l, 120, curY + 26 + lIdx * 20);
      });

      // Draftsman Checkboxes
      const boxY = curY + 28;
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 1.5;
      
      // [ ] Approved
      ctx.strokeRect(1080, boxY, 16, 16);
      ctx.fillStyle = "#0f172a";
      ctx.font = "12px sans-serif";
      ctx.fillText("Approved", 1104, boxY + 13);

      // [ ] Query / RFI
      ctx.strokeRect(1190, boxY, 16, 16);
      ctx.fillText("Query / RFI", 1214, boxY + 13);

      // [ ] N/A
      ctx.strokeRect(1320, boxY, 16, 16);
      ctx.fillText("N/A", 1344, boxY + 13);

      // Sheet Ref & Notes Box
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(1430, curY + 12, 300, 52);
      ctx.strokeStyle = "#cbd5e1";
      ctx.strokeRect(1430, curY + 12, 300, 52);

      ctx.fillStyle = "#64748b";
      ctx.font = "11px sans-serif";
      ctx.fillText("Sheet Ref: _________", 1440, curY + 30);
      ctx.fillText("Notes: ____________________", 1440, curY + 52);

      curY += rowH + 6;
    });

    curY += 20;
  }

  // Section B: All Other Variations & Inclusions
  if (otherItems.length > 0) {
    drawSectionHeader(`SECTION B: ALL OTHER VARIATIONS, INCLUSIONS & SITE SPECIFICATIONS (${otherItems.length} ITEMS)`, "#0e7490");

    otherItems.forEach((item, idx) => {
      const isAlt = idx % 2 === 1;
      const rowH = 72;

      ctx.fillStyle = isAlt ? "#f0fdfa" : "#ffffff";
      ctx.fillRect(50, curY, width - 100, rowH);
      ctx.strokeStyle = "#cffafe";
      ctx.strokeRect(50, curY, width - 100, rowH);

      // Bullet
      ctx.beginPath();
      ctx.arc(80, curY + 36, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#06b6d4";
      ctx.fill();

      // Description
      ctx.fillStyle = "#0f172a";
      ctx.font = "500 14px sans-serif";
      const lines = wrapText(item.description, 920);
      lines.slice(0, 3).forEach((l, lIdx) => {
        ctx.fillText(l, 120, curY + 25 + lIdx * 19);
      });

      // Draftsman Checkboxes
      const boxY = curY + 26;
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 1.5;

      // [ ] Approved
      ctx.strokeRect(1080, boxY, 16, 16);
      ctx.fillStyle = "#0f172a";
      ctx.font = "12px sans-serif";
      ctx.fillText("Approved", 1104, boxY + 13);

      // [ ] Query / RFI
      ctx.strokeRect(1190, boxY, 16, 16);
      ctx.fillText("Query / RFI", 1214, boxY + 13);

      // [ ] N/A
      ctx.strokeRect(1320, boxY, 16, 16);
      ctx.fillText("N/A", 1344, boxY + 13);

      // Sheet Ref & Notes Box
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(1430, curY + 10, 300, 52);
      ctx.strokeStyle = "#cbd5e1";
      ctx.strokeRect(1430, curY + 10, 300, 52);

      ctx.fillStyle = "#64748b";
      ctx.font = "11px sans-serif";
      ctx.fillText("Sheet Ref: _________", 1440, curY + 28);
      ctx.fillText("Notes: ____________________", 1440, curY + 50);

      curY += rowH + 6;
    });

    curY += 25;
  }

  // 6. Sign-off & Verification Footer Box
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(50, height - 140, width - 100, 100);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText("DRAFTING TEAM VERIFICATION & HANDOFF SIGN-OFF", 70, height - 105);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "13px sans-serif";
  ctx.fillText("Lead Draftsman: ________________________", 70, height - 65);
  ctx.fillText("Date Completed: ___ / ___ / 2026", 460, height - 65);
  ctx.fillText("Drawing Revision: Rev A (Tender Plans)", 820, height - 65);
  ctx.fillText("Bernie / Workflow Manager Sign-off: ________________________", 1220, height - 65);

  return canvas.toDataURL("image/png");
}

