import JSZip from "jszip";
import { jsPDF, AcroFormTextField, AcroFormCheckBox } from "jspdf";
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
import { getActiveStaffUser, KNOWN_STAFF_PROFILES } from "@/lib/authSession";

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

import { findFacadeForDesign } from "../quoting/facadeLookup";

export function findFacadeRenderUrl(facadeName: string, housingType?: string, designName?: string): string {
  if (!facadeName) return HUDSON_FACADES[0]?.url || "";
  const isDouble = (housingType || "").toLowerCase().includes("double");
  const found = findFacadeForDesign(facadeName, isDouble, housingType, designName);
  return found?.url || HUDSON_FACADES[0]?.url || "";
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

export async function deleteMultipleTendersFromIdb(ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  try {
    const db = await openTenderDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_TENDER_STORE, "readwrite");
      const store = tx.objectStore(IDB_TENDER_STORE);
      for (const id of ids) {
        store.delete(id);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  }

  try {
    for (const id of ids) {
      localStorage.removeItem(`hudson_tender_${id}`);
    }
  } catch {}
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

  const activeStaff = typeof window !== "undefined" ? getActiveStaffUser() : null;
  const defaultConsultant = activeStaff?.name || "Morgan Hales";
  const defaultDisplay = activeStaff?.displayCentre || "Flagstone Display Home";
  const defaultPhone = activeStaff?.phone || "0417 571 864";
  const defaultEmail = activeStaff?.email || "morgan.hales@hudsonhomes.com.au";

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
    displayOffice: defaultDisplay,
    newHomeConsultant: defaultConsultant,
    consultantPhone: defaultPhone,
    consultantEmail: defaultEmail,
    iquoteDate: "",
    iquoteId: "",
    source: "",

    buyerType: "Owner-Occupied",
    leadSource: "display home",
    draftsmanGeneralNotes: "",
    draftsmanReviewStatus: "pending",

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
      ifKdrOccupancy: "Vacant",
      kdrTenantDetails: {
        contactRole: "Tenant",
        agencyName: "",
        name: "",
        phone: "",
        email: "",
        accessNotes: "",
      },
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
      consultantName: defaultConsultant,
      consultantPhone: defaultPhone,
      consultantEmail: defaultEmail,
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
  const facadeRender = findFacadeRenderUrl(d.facadeName, d.housingType, d.designName);
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
    feasibility: quote.feasibility,
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
      estate: (buildType.includes("KDRB") || quote.feasibility?.mode === "brownfield_kdrb" || c.depositType === "brownfield")
        ? ""
        : ((quote.feasibility?.estateId && quote.feasibility.estateId !== "qdc_statutory")
            ? (c.estate || quote.feasibility.estateId)
            : (c.estate || "")),
      stage: (buildType.includes("KDRB") || quote.feasibility?.mode === "brownfield_kdrb" || c.depositType === "brownfield")
        ? ""
        : ((quote.feasibility?.stageId && quote.feasibility.stageId !== "qdc_statutory")
            ? quote.feasibility.stageId
            : (base.land.stage || "")),
      lotNo: quote.feasibility?.parcel?.lotNumber || c.lotNumber || "",
      lotSizeM2: quote.feasibility?.parcel?.areaM2 || base.land.lotSizeM2,
      frontageM: quote.feasibility?.parcel?.frontageM || base.land.frontageM,
      streetNumber: "",
      streetName: quote.feasibility?.parcel?.streetAddress || c.siteAddress || "",
      suburb: quote.feasibility?.parcel?.suburb || c.suburb || "",
      council: quote.feasibility?.parcel?.council || s.councilRegion || "Logan City Council",
      landStatus: c.depositType === "brownfield" ? "Settled" : "Exchanged",
      isRegistered: quote.feasibility?.parcel?.isRegistered ?? base.land.isRegistered,
      registeredDate: quote.feasibility?.parcel?.expectedRegistrationDate || base.land.registeredDate,
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
      setbacks: quote.feasibility?.activeSetbacks
        ? {
            frontBoundary: `${quote.feasibility.activeSetbacks.frontOmpM}m`,
            rearBoundary: `${quote.feasibility.activeSetbacks.rearM}m`,
            leftBoundary: `${quote.feasibility.activeSetbacks.sideStandardM}m`,
            rightBoundary: `${quote.feasibility.activeSetbacks.sideBtbM > 0 ? quote.feasibility.activeSetbacks.sideBtbM + "m (BTB)" : quote.feasibility.activeSetbacks.sideStandardM + "m"}`,
          }
        : {
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
    newHomeConsultant: (c.consultantName || (quote as any).salesConsultant || (typeof window !== "undefined" && getActiveStaffUser()?.name) || "Morgan Hales"),
    displayOffice: (c.consultantDisplayCentre || (quote as any).displayCentre || (typeof window !== "undefined" && getActiveStaffUser()?.displayCentre) || "Flagstone Display Home"),
    consultantPhone: (c.consultantPhone || (typeof window !== "undefined" && getActiveStaffUser()?.phone) || "0417 571 864"),
    consultantEmail: (c.consultantEmail || (typeof window !== "undefined" && getActiveStaffUser()?.email) || "morgan.hales@hudsonhomes.com.au"),
    atp: {
      ...base.atp,
      feeType,
      feeAmount: c.depositAmount || feeAmount,
      isCustomDesignAddon: isCustom || !!c.custom3dTourSelected,
      tenderAcceptanceFee: acceptanceFee,
      client1Name: `${c1First} ${c1Last}`.trim() || c.clientName || "",
      client2Name: has2 ? `${c2First} ${c2Last}`.trim() || c.client2Name || "" : "",
      consultantName: (c.consultantName || (quote as any).salesConsultant || (typeof window !== "undefined" && getActiveStaffUser()?.name) || "Morgan Hales"),
      consultantPhone: (c.consultantPhone || (typeof window !== "undefined" && getActiveStaffUser()?.phone) || "0417 571 864"),
      consultantEmail: (c.consultantEmail || (typeof window !== "undefined" && getActiveStaffUser()?.email) || "morgan.hales@hudsonhomes.com.au"),
      eftReference: `${(c1Last || "Client").replace(/\s+/g, "").toUpperCase()}-${quote.quoteNumber || "MH"}`,
    },
    documents: docs,
    feasibility: quote.feasibility,
  };
}

/**
 * Converts any raster image attachment (png, jpeg, webp) into a genuine, print-ready A4 PDF.
 */
export async function convertImageAttachmentToPdf(
  dataUrl: string,
  title: string,
  subtitle?: string
): Promise<Uint8Array> {
  const isLandscape = await new Promise<boolean>((resolve) => {
    if (typeof Image === "undefined") {
      resolve(false);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth > img.naturalHeight);
    img.onerror = () => resolve(false);
    img.src = dataUrl;
  });

  const pdf = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageW = isLandscape ? 841.89 : 595.28;
  const pageH = isLandscape ? 595.28 : 841.89;

  // Dark Navy Header Banner
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, pageW, 45, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.text(title.toUpperCase(), 25, 25);

  if (subtitle) {
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(56, 189, 248);
    pdf.text(subtitle, 25, 38);
  }

  // Draw image fitted inside margins
  const maxW = pageW - 50;
  const maxH = pageH - 75;
  try {
    pdf.addImage(dataUrl, "JPEG", 25, 55, maxW, maxH, undefined, "FAST");
  } catch {
    try {
      pdf.addImage(dataUrl, "PNG", 25, 55, maxW, maxH, undefined, "FAST");
    } catch {}
  }

  // Bottom footer
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text("Hudson Homes Pty Ltd · Job Document Archive", 25, pageH - 12);

  return new Uint8Array(pdf.output("arraybuffer"));
}

/**
 * Compiles all documents and forms in the submission into a ready-to-unzip Job Folder ZIP archive!
 * 100% PDF GUARANTEE: Every single document inside the folder is strictly in PDF format!
 */
export async function exportTenderZipPackage(
  submission: TenderSubmission,
  generatedPdfs?: {
    atpPdfBlob?: Blob;
    masterPdfBlob?: Blob;
    draftsmenPdfBlob?: Blob;
    trFormPdfBlob?: Blob;
    quotePdfBlob?: Blob;
  }
): Promise<Blob> {
  const zip = new JSZip();
  const surname = (submission.customer1.surname || "Client").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
  const folderName = `${surname} - Job Folder`;
  const folder = zip.folder(folderName) || zip;

  // 1. Add Unified Master PDF (Tender Request Specification)
  if (generatedPdfs?.masterPdfBlob) {
    folder.file(`${surname} - Master Tender Request Specification.pdf`, generatedPdfs.masterPdfBlob);
  }

  // 2. Add Authority to Proceed Signed PDF
  if (generatedPdfs?.atpPdfBlob) {
    folder.file(`${surname} - Authority to Proceed Signed.pdf`, generatedPdfs.atpPdfBlob);
  } else if (generatedPdfs?.trFormPdfBlob) {
    folder.file(`${surname} - Tender Request & Authority to Proceed.pdf`, generatedPdfs.trFormPdfBlob);
  }

  // 3. Add Draftsmen Variations & Working Drawing Directives PDF
  if (generatedPdfs?.draftsmenPdfBlob) {
    folder.file(`${surname} - Draftsmen Variations & Working Drawing Directives.pdf`, generatedPdfs.draftsmenPdfBlob);
  } else {
    try {
      const draftsmenBlob = await renderMultiPageDraftsmenVariationPdfBlob(submission);
      folder.file(`${surname} - Draftsmen Variations & Working Drawing Directives.pdf`, draftsmenBlob);
    } catch (e) {
      console.warn("Could not auto-render Draftsmen Variations PDF for zip:", e);
    }
  }

  // 4. Add Building Quote PDF if provided
  if (generatedPdfs?.quotePdfBlob) {
    folder.file(`${surname} - Building Quote.pdf`, generatedPdfs.quotePdfBlob);
  }

  // 5. Add Attached Documents from document slots (100% PDF GUARANTEE!)
  for (const [slotId, doc] of Object.entries(submission.documents)) {
    if (doc.fileDataUrl) {
      try {
        const isPdf =
          doc.fileDataUrl.startsWith("data:application/pdf") ||
          (doc.fileName && doc.fileName.toLowerCase().endsWith(".pdf"));
        const standardizedPdfName = getStandardizedDocumentFileName(
          surname,
          slotId,
          doc.fileName || `${doc.label}.pdf`,
          submission.atp.feeAmount
        ).replace(/\.[^.]+$/, ".pdf");

        if (isPdf) {
          const commaIdx = doc.fileDataUrl.indexOf(",");
          const base64Data = commaIdx >= 0 ? doc.fileDataUrl.slice(commaIdx + 1) : doc.fileDataUrl;
          folder.file(standardizedPdfName, base64Data, { base64: true });
        } else {
          // Raster Image -> Convert into an official A4 PDF!
          const pdfBytes = await convertImageAttachmentToPdf(
            doc.fileDataUrl,
            `HUDSON HOMES — ${doc.label}`,
            `${surname} · Ref: ${submission.submissionNumber} · Job Document`
          );
          folder.file(standardizedPdfName, pdfBytes);
        }
      } catch (e) {
        console.warn(`Could not add document ${slotId} to zip as PDF:`, e);
      }
    }
  }

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
 * Renders an HD standalone full-page Floorplan with numbered pins as a genuine PDF data URL ("Final Floorplan.pdf")
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
      const width = Math.max(1800, img.naturalWidth || 1800);
      const height = Math.max(2400, (img.naturalHeight || 1300) + 300);
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
      ctx.fillRect(0, 0, width, 140);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 34px sans-serif";
      ctx.fillText("HUDSON HOMES — FINAL ARCHITECTURAL MARKUP FLOORPLAN", 60, 60);

      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(`${designName} · Ref: ${submissionNumber} · Active Structural Pin Schedule (${pins.length} Pins)`, 60, 102);

      // Floorplan Image
      const topOffset = 170;
      const availableHeight = height - topOffset - 80;
      const imgRatio = img.naturalWidth / img.naturalHeight;
      let drawW = width - 140;
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
        const radius = 26;

        // Dark outer halo
        ctx.beginPath();
        ctx.arc(pinX, pinY, radius + 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
        ctx.fill();

        // Pin body
        ctx.beginPath();
        ctx.arc(pinX, pinY, radius, 0, Math.PI * 2);
        ctx.fillStyle = "#f59e0b";
        ctx.fill();

        // Pin number
        ctx.fillStyle = "#020617";
        ctx.font = "bold 24px monospace";
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
        60,
        height - 30
      );

      try {
        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        const pdf = new jsPDF({
          orientation: width > height ? "landscape" : "portrait",
          unit: "pt",
          format: [width * 0.75, height * 0.75],
        });
        pdf.addImage(imgData, "JPEG", 0, 0, width * 0.75, height * 0.75);
        resolve(pdf.output("datauristring"));
      } catch (err) {
        console.warn("Falling back to image data url for final floorplan:", err);
        resolve(canvas.toDataURL("image/png"));
      }
    };
    img.onerror = () => resolve("");
    img.src = floorplanUrl;
  });
}

/**
 * Helper to convert an image URL or source into a base64 Data URL with natural dimensions
 */
export async function loadImgWithDimensions(
  url: string
): Promise<{ dataUrl: string; width: number; height: number }> {
  if (!url) return { dataUrl: "", width: 0, height: 0 };
  if (typeof document === "undefined") return { dataUrl: "", width: 0, height: 0 };

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width || 1200;
        const height = img.naturalHeight || img.height || 800;
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve({
            dataUrl: canvas.toDataURL("image/jpeg", 0.9),
            width,
            height,
          });
          return;
        }
      } catch (e) {
        console.warn("Could not convert image to dataUrl:", e);
      }
      resolve({ dataUrl: "", width: 0, height: 0 });
    };
    img.onerror = () => resolve({ dataUrl: "", width: 0, height: 0 });
    img.src = url;
  });
}

async function loadImgToDataUrl(url: string): Promise<string> {
  const res = await loadImgWithDimensions(url);
  return res.dataUrl;
}

/**
 * Helper to render floorplan with numbered pins onto a canvas and return an image data URL with dimensions
 */
async function renderFloorplanWithPinsResult(
  floorplanUrl: string,
  pins: TenderFloorplanPin[]
): Promise<{ dataUrl: string; width: number; height: number }> {
  if (typeof document === "undefined" || !floorplanUrl) return { dataUrl: "", width: 0, height: 0 };

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const width = Math.max(1600, img.naturalWidth || 1600);
        const height = Math.max(1200, img.naturalHeight || 1200);
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({ dataUrl: "", width: 0, height: 0 });
          return;
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Draw numbered pins
        pins.forEach((pin) => {
          const pinX = (pin.x / 100) * width;
          const pinY = (pin.y / 100) * height;
          const radius = 24;

          // Dark halo
          ctx.beginPath();
          ctx.arc(pinX, pinY, radius + 4, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
          ctx.fill();

          // Body
          ctx.beginPath();
          ctx.arc(pinX, pinY, radius, 0, Math.PI * 2);
          ctx.fillStyle = "#f59e0b";
          ctx.fill();

          // Text
          ctx.fillStyle = "#020617";
          ctx.font = "bold 22px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(pin.number), pinX, pinY + 1);
        });

        resolve({
          dataUrl: canvas.toDataURL("image/jpeg", 0.92),
          width,
          height,
        });
      } catch (err) {
        console.warn("Could not render floorplan with pins:", err);
        resolve({ dataUrl: "", width: 0, height: 0 });
      }
    };
    img.onerror = () => resolve({ dataUrl: "", width: 0, height: 0 });
    img.src = floorplanUrl;
  });
}

async function renderFloorplanWithPinsImageDataUrl(
  floorplanUrl: string,
  pins: TenderFloorplanPin[]
): Promise<string> {
  const res = await renderFloorplanWithPinsResult(floorplanUrl, pins);
  return res.dataUrl;
}

/**
 * Generates an official multi-page A4 landscape working drawing directive package for draftsmen.
 * Page 1: Siting & Boundary Setbacks, Inclusions Tier & Drawing Directives Overview
 * Page 2: Original Catalog Architectural Floorplan (centered & aspect-preserved)
 * Page 3: Modified Construction Floorplan with Numbered Pins (centered & aspect-preserved)
 * Page 4+: Itemised Numbered Variations Schedule with Form-fillable AcroForm Checkboxes & Text Fields
 * 100% genuine interactive PDF format for Bluebeam / Adobe Acrobat.
 */
export async function renderMultiPageDraftsmenVariationPdfBlob(
  submission: TenderSubmission
): Promise<Blob> {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  const pageW = 841.89;
  const pageH = 595.28;

  const variations = submission.variations || [];
  const itemsPerPage = 8;
  const varChunks: TenderNumberedVariation[][] = [];
  if (variations.length === 0) {
    varChunks.push([]);
  } else {
    for (let i = 0; i < variations.length; i += itemsPerPage) {
      varChunks.push(variations.slice(i, i + itemsPerPage));
    }
  }

  const totalPages = 3 + varChunks.length;
  const inclusionTier = submission.homeSpec.inclusionsType || "H2 Designer";

  const drawHeader = (title: string, subtitle: string, pageNum: number) => {
    doc.setFillColor(15, 23, 42); // #0f172a
    doc.rect(0, 0, pageW, 46, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12.5);
    doc.setFont("helvetica", "bold");
    doc.text(title, 28, 21);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(56, 189, 248); // sky-400
    doc.text(subtitle, 28, 35);

    doc.setFontSize(8.5);
    doc.setTextColor(245, 158, 11); // amber-500
    doc.text(`Job Ref: ${submission.submissionNumber} · Page ${pageNum} of ${totalPages}`, pageW - 28, 21, { align: "right" });
    doc.setTextColor(148, 163, 184);
    doc.text(`${submission.customer1.surname || "Client"} Residence`, pageW - 28, 35, { align: "right" });
  };

  const drawFooter = (pageNum: number) => {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.75);
    doc.line(28, pageH - 22, pageW - 28, pageH - 22);

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Hudson Homes Pty Ltd · Working Drawing Directives · Interactive Bluebeam / Acrobat AcroForm Edition · Page ${pageNum} of ${totalPages}`,
      28,
      pageH - 10
    );
    doc.text(
      `Consultant: ${submission.newHomeConsultant || "Morgan Hales"} (${submission.atp.consultantPhone || "0417 571 864"})`,
      pageW - 28,
      pageH - 10,
      { align: "right" }
    );
  };

  // =========================================================================
  // PAGE 1: SITING DIRECTIVES, SETBACKS & INCLUSION TIER (POINTS 2, 3, 4 REMOVED)
  // =========================================================================
  drawHeader(
    "HUDSON HOMES — DRAFTSMEN WORKING DRAWINGS & SITING DIRECTIVES",
    `Prepared for Bernie & OnSite Drafting Team · Inclusions: ${inclusionTier} · Siting Clearances & Directives`,
    1
  );

  // Project Info Metadata Strip — 5 Dedicated Columns including INCLUSION TYPE
  const stripY = 54;
  const stripH = 46;
  const gap = 8;
  const totalStripW = pageW - 56;
  const colW = (totalStripW - 4 * gap) / 5; // ~150.78 pt each

  const drawMetaCard = (
    x: number,
    title: string,
    val1: string,
    val2: string,
    isSpecial = false
  ) => {
    if (isSpecial) {
      doc.setFillColor(240, 249, 255); // sky-50
      doc.setDrawColor(56, 189, 248); // sky-400
    } else {
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(203, 213, 225); // slate-300
    }
    doc.roundedRect(x, stripY, colW, stripH, 3, 3, "FD");

    doc.setFontSize(6.8);
    doc.setFont("helvetica", "bold");
    if (isSpecial) {
      doc.setTextColor(3, 105, 161); // sky-700
    } else {
      doc.setTextColor(71, 85, 105);
    }
    doc.text(title, x + 8, stripY + 12);

    doc.setFontSize(9.5);
    doc.setFont("helvetica", "bold");
    if (isSpecial) {
      doc.setTextColor(2, 132, 199); // sky-600
    } else {
      doc.setTextColor(15, 23, 42);
    }
    const val1Clean = doc.splitTextToSize(val1, colW - 16)[0] || "";
    doc.text(val1Clean, x + 8, stripY + 26);

    doc.setFontSize(7.2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    const val2Clean = doc.splitTextToSize(val2, colW - 16)[0] || "";
    doc.text(val2Clean, x + 8, stripY + 38);
  };

  // Card 1: Purchaser / Client
  drawMetaCard(
    28,
    "PURCHASER / CLIENT",
    `${submission.customer1.firstName} ${submission.customer1.surname}`,
    `Ph: ${submission.customer1.mobile || "N/A"}`
  );

  // Card 2: Building Site Location
  drawMetaCard(
    28 + (colW + gap) * 1,
    "BUILDING SITE LOCATION",
    `Lot ${submission.land.lotNo || "TBA"}, ${submission.land.estate || submission.land.suburb || "QLD"}`,
    `${submission.land.streetName || "Street TBA"}`
  );

  // Card 3: Home Design & Facade
  drawMetaCard(
    28 + (colW + gap) * 2,
    "HOME DESIGN & FACADE",
    `${submission.homeSpec.homeDesign} · ${submission.homeSpec.facade}`,
    `Garage: ${submission.homeSpec.garageLocation || "RHS"} · ${(submission.homeSpec.standardDesignM2 || submission.homeSpec.designM2 || 195.4).toFixed(1)} m²`
  );

  // Card 4: INCLUSION TYPE (PROMINENT ACCENT CARD)
  drawMetaCard(
    28 + (colW + gap) * 3,
    "INCLUSION TYPE",
    inclusionTier,
    "Specification Range Tier",
    true
  );

  // Card 5: Consultant & Target
  drawMetaCard(
    28 + (colW + gap) * 4,
    "CONSULTANT & TARGET",
    `${submission.newHomeConsultant || "Morgan Hales"}`,
    "Target: Bernie & OnSite Drafting"
  );

  // Main Body of Page 1: Balanced Two-Column Architectural Directive (Points 2, 3, 4 completely removed)
  const bodyY = 108;
  const bodyH = 435;
  const colGap = 16;
  const bodyColW = (pageW - 56 - colGap) / 2; // ~384.94 pt each
  const leftX = 28;
  const rightX = leftX + bodyColW + colGap;

  // ---------------------------------------------------------------------------
  // LEFT COLUMN: 1. SITING & BOUNDARY CLEARANCES (SETBACK VERIFICATION)
  // ---------------------------------------------------------------------------
  doc.setFillColor(15, 23, 42);
  doc.rect(leftX, bodyY, bodyColW, 24, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("1. SITING & BOUNDARY CLEARANCES (SETBACK VERIFICATION)", leftX + 10, bodyY + 16);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(leftX, bodyY + 24, bodyColW, bodyH - 24, "FD");

  const sb = submission.homeSpec.setbacks || {
    frontBoundary: "6.0m",
    rearBoundary: "1.5m",
    leftBoundary: "1.0m",
    rightBoundary: "1.0m",
  };

  let ly = bodyY + 44;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("COUNCIL PLANNING & BOUNDARY SETBACK CONTROLS", leftX + 12, ly);

  ly += 16;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text(`• Front Boundary Setback:  ${sb.frontBoundary} (Min required per Council code)`, leftX + 14, ly);
  ly += 18;
  doc.text(`• Rear Boundary Setback:   ${sb.rearBoundary} (Min clearance to eaves & outdoor living)`, leftX + 14, ly);
  ly += 18;
  doc.text(`• Left Boundary Setback:   ${sb.leftBoundary} · Right Boundary Setback: ${sb.rightBoundary}`, leftX + 14, ly);
  ly += 18;
  doc.text(`• Garage Orientation:     ${submission.homeSpec.garageLocation || "RHS"} (Verify driveway crossover alignment)`, leftX + 14, ly);

  // Subtle separator line
  ly += 16;
  doc.setDrawColor(226, 232, 240);
  doc.line(leftX + 12, ly, leftX + bodyColW - 12, ly);

  ly += 20;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("SITE ATTRIBUTES & CODE COMPLIANCE SPECIFICATIONS", leftX + 12, ly);

  ly += 16;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text(`• Planning Authority:     ${submission.land.council || "Logan City Council"}`, leftX + 14, ly);
  ly += 18;
  doc.text(`• Building Site Location:  Lot ${submission.land.lotNo || "TBA"}, ${submission.land.streetName || "Street TBA"}`, leftX + 14, ly);
  ly += 18;
  doc.text(`• Land Registration:      ${submission.land.registeredDate?.trim() ? `Unregistered (Expected: ${submission.land.registeredDate})` : "Already Registered"}`, leftX + 14, ly);
  ly += 18;
  doc.text(`• Building Code Standard:  NCC 2022 Livable Housing Standard (Stepless threshold)`, leftX + 14, ly);
  ly += 18;
  doc.text(`• Foundation / Piering:    Engineered Waffle Pod Slab / Piering Allowance`, leftX + 14, ly);

  // Siting Approval Section (Vector styled checkboxes + AcroForm overlay)
  ly += 26;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(leftX + 12, ly, bodyColW - 24, 75, 4, 4, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("SITING REVIEW & DRAFTING VERIFICATION CHECK", leftX + 22, ly + 18);

  // Checkbox 1: Siting Approved
  const cb1Y = ly + 28;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(leftX + 22, cb1Y, 14, 14, 2, 2, "FD");
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text("Siting Approved (Complies with Council setbacks & code)", leftX + 44, cb1Y + 11);

  // Checkbox 2: RFI / Setback Variance
  const cb2Y = ly + 48;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(leftX + 22, cb2Y, 14, 14, 2, 2, "FD");
  doc.setTextColor(15, 23, 42);
  doc.text("RFI / Boundary Setback Relaxation / Variance Required", leftX + 44, cb2Y + 11);

  // ---------------------------------------------------------------------------
  // RIGHT COLUMN: PROJECT SPECIFICATIONS & WORKING DRAWINGS SCHEDULE
  // ---------------------------------------------------------------------------
  doc.setFillColor(15, 23, 42);
  doc.rect(rightX, bodyY, bodyColW, 24, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("PROJECT SPECIFICATIONS & WORKING DRAWINGS SCHEDULE", rightX + 10, bodyY + 16);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(rightX, bodyY + 24, bodyColW, bodyH - 24, "FD");

  let ry = bodyY + 44;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("ARCHITECTURAL SPECIFICATIONS & INCLUSIONS TIER", rightX + 12, ry);

  ry += 16;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text(`• Inclusions Range:        ${inclusionTier} (Hudson Homes Specifications)`, rightX + 14, ry);
  ry += 18;
  doc.text(`• Ceiling Height Standard: ${inclusionTier.includes("H3") ? "2,740mm (9'0\") Ground Floor High Ceilings" : "2,590mm (8'6\") Standard Ceilings"}`, rightX + 14, ry);
  ry += 18;
  doc.text(`• Architectural Facade:    ${submission.homeSpec.facade} (Verify window heads & eaves detail)`, rightX + 14, ry);
  ry += 18;
  doc.text(`• Total House Area:        ${(submission.homeSpec.standardDesignM2 || submission.homeSpec.designM2 || 195.4).toFixed(1)} m² Standard Catalog Footprint`, rightX + 14, ry);

  // Highlighted Active Variations Summary Card
  ry += 24;
  doc.setFillColor(254, 243, 199); // amber-100
  doc.setDrawColor(251, 191, 36); // amber-400
  doc.roundedRect(rightX + 12, ry, bodyColW - 24, 75, 4, 4, "FD");

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(146, 64, 14);
  doc.text(`ACTIVE VARIATIONS PINNED: ${variations.length} ITEMS TOTAL`, rightX + 22, ry + 20);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text(`• Structural Modifications: ${variations.filter(v => v.isStructural).length} items (Refer to Construction Floorplan on Page 3)`, rightX + 22, ry + 36);
  doc.text(`• Inclusions & Selections:   ${variations.filter(v => !v.isStructural).length} items (Refer to Itemised Schedule on Pages 4+)`, rightX + 22, ry + 50);
  doc.text(`• Floorplan Physical Pins:   ${(submission.homeSpec.floorplanPins || []).length} numbered pins placed`, rightX + 22, ry + 64);

  // Drawing Package Index for Bernie & Drafting Team
  ry += 95;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("WORKING DRAWINGS PACKAGE DIRECTORY", rightX + 12, ry);

  ry += 16;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text(`• Page 1: Siting Clearances, Setback Specifications & Inclusions Tier`, rightX + 14, ry);
  ry += 18;
  doc.text(`• Page 2: Original Architectural Catalog Reference Floorplan`, rightX + 14, ry);
  ry += 18;
  doc.text(`• Page 3: Final Architectural Floorplan Markup with Numbered Variation Pins`, rightX + 14, ry);
  ry += 18;
  doc.text(`• Pages 4+: Itemised Numbered Variations Schedule & Draftsman Review`, rightX + 14, ry);

  ry += 24;
  doc.setFontSize(7.2);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 116, 139);
  doc.text("Directives prepared for Bernie and OnSite drafting team. Cross-reference marked pins.", rightX + 14, ry);

  drawFooter(1);

  // =========================================================================
  // PAGE 2: ORIGINAL CATALOG ARCHITECTURAL FLOORPLAN (ASPECT-PRESERVED & CENTERED)
  // =========================================================================
  doc.addPage("a4", "landscape");
  drawHeader(
    `ORIGINAL ARCHITECTURAL CATALOG FLOORPLAN — ${submission.homeSpec.homeDesign || "Standard Design"}`,
    `Standard Catalog Reference Drawing · Facade: ${submission.homeSpec.facade || "Classic"} · Inclusions: ${inclusionTier} · Area: ${(submission.homeSpec.standardDesignM2 || submission.homeSpec.designM2 || 195.4).toFixed(1)} m²`,
    2
  );

  const origFloorplanUrl = submission.homeSpec.originalFloorplanUrl || submission.homeSpec.floorplanUrl || "";
  let origPlan = { dataUrl: "", width: 0, height: 0 };
  if (origFloorplanUrl) {
    try {
      origPlan = await loadImgWithDimensions(origFloorplanUrl);
    } catch (e) {
      console.warn("Could not load original floorplan data url:", e);
    }
  }

  const maxCanvasW = pageW - 56;
  const maxCanvasH = pageH - 95;

  if (origPlan.dataUrl) {
    try {
      const aspect = (origPlan.width && origPlan.height) ? origPlan.width / origPlan.height : 1.4;
      let drawW = maxCanvasW;
      let drawH = maxCanvasW / aspect;
      if (drawH > maxCanvasH) {
        drawH = maxCanvasH;
        drawW = maxCanvasH * aspect;
      }
      const drawX = 28 + (maxCanvasW - drawW) / 2;
      const drawY = 54 + (maxCanvasH - drawH) / 2;
      doc.addImage(origPlan.dataUrl, "JPEG", drawX, drawY, drawW, drawH, undefined, "FAST");
    } catch (err) {
      console.warn("Error drawing original floorplan into pdf:", err);
    }
  } else {
    // Placeholder Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.rect(28, 54, maxCanvasW, maxCanvasH, "FD");
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`Catalog Plan: ${submission.homeSpec.homeDesign}`, pageW / 2, pageH / 2 - 10, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Standard architectural layout plan on record.", pageW / 2, pageH / 2 + 12, { align: "center" });
  }

  drawFooter(2);

  // =========================================================================
  // PAGE 3: MODIFIED CONSTRUCTION FLOORPLAN WITH NUMBERED PINS (CENTERED)
  // =========================================================================
  doc.addPage("a4", "landscape");
  const pinCount = (submission.homeSpec.floorplanPins || []).length;
  drawHeader(
    `FINAL ARCHITECTURAL FLOORPLAN MARKUP WITH NUMBERED VARIATION PINS`,
    `Construction Markups & Numbered Pin Schedule (${pinCount} Pinned Locations) · Inclusions: ${inclusionTier} · Job Ref: ${submission.submissionNumber}`,
    3
  );

  let markupPlan = { dataUrl: "", width: 0, height: 0 };
  if (submission.homeSpec.floorplanUrl) {
    try {
      markupPlan = await renderFloorplanWithPinsResult(
        submission.homeSpec.floorplanUrl,
        submission.homeSpec.floorplanPins || []
      );
    } catch (e) {
      console.warn("Could not render markup floorplan with pins:", e);
    }
  }

  const maxMarkupH = pageH - 125;
  if (markupPlan.dataUrl) {
    try {
      const aspect = (markupPlan.width && markupPlan.height) ? markupPlan.width / markupPlan.height : 1.4;
      let drawW = maxCanvasW;
      let drawH = maxCanvasW / aspect;
      if (drawH > maxMarkupH) {
        drawH = maxMarkupH;
        drawW = maxMarkupH * aspect;
      }
      const drawX = 28 + (maxCanvasW - drawW) / 2;
      const drawY = 54 + (maxMarkupH - drawH) / 2;
      doc.addImage(markupPlan.dataUrl, "JPEG", drawX, drawY, drawW, drawH, undefined, "FAST");
    } catch (err) {
      console.warn("Error drawing markup floorplan into pdf:", err);
    }
  } else {
    // Placeholder
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.rect(28, 54, maxCanvasW, maxMarkupH, "FD");
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`Construction Floorplan: ${submission.homeSpec.homeDesign}`, pageW / 2, pageH / 2 - 10, { align: "center" });
  }

  // Legend bar at the bottom of Page 3
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(28, pageH - 58, pageW - 56, 32, 4, 4, "FD");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("PIN LEGEND:", 38, pageH - 42);

  const pins = submission.homeSpec.floorplanPins || [];
  let legendText = pins.slice(0, 7).map(p => `[#${p.number}] ${p.label || "Mod"}`).join("   ·   ");
  if (pins.length > 7) legendText += `  (+${pins.length - 7} more)`;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text(legendText || "No physical pins placed on standard plan.", 105, pageH - 42);

  drawFooter(3);

  // =========================================================================
  // PAGE 4+: ITEMISED NUMBERED VARIATIONS SCHEDULE (NO CLIPPING / VECTOR CHECKBOXES)
  // =========================================================================
  varChunks.forEach((chunk, chunkIdx) => {
    const pageNum = 4 + chunkIdx;
    doc.addPage("a4", "landscape");

    drawHeader(
      `ITEMISED NUMBERED VARIATIONS SCHEDULE & WORKING DRAWINGS DIRECTIVES`,
      `Form-fillable Bluebeam / Acrobat Review Sheet · Page ${chunkIdx + 1} of ${varChunks.length} · Inclusions Tier: ${inclusionTier} · ${variations.length} Items Total`,
      pageNum
    );

    // Exact Column Geometry (Guaranteed inside margins: Total W = 785.89 pt, ends at X = 813.89 pt)
    const tableTopY = 56;
    const colX_Item = 28;
    const colW_Item = 46;

    const colX_Desc = 74;
    const colW_Desc = 320;

    const colX_Cat = 394;
    const colW_Cat = 72;

    const colX_App = 466;
    const colW_App = 56;

    const colX_Rfi = 522;
    const colW_Rfi = 54;

    const colX_Sheet = 576;
    const colW_Sheet = 74;

    const colX_Notes = 650;
    const colW_Notes = 813.89 - colX_Notes; // 163.89 pt

    // Table Header Bar
    doc.setFillColor(15, 23, 42);
    doc.rect(28, tableTopY, pageW - 56, 26, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("#", colX_Item + colW_Item / 2, tableTopY + 17, { align: "center" });
    doc.text("VARIATION / SPECIFICATION DIRECTIVE", colX_Desc + 8, tableTopY + 17);
    doc.text("CATEGORY", colX_Cat + colW_Cat / 2, tableTopY + 17, { align: "center" });
    doc.text("APPROVE", colX_App + colW_App / 2, tableTopY + 17, { align: "center" });
    doc.text("RFI", colX_Rfi + colW_Rfi / 2, tableTopY + 17, { align: "center" });
    doc.text("SHEET REF", colX_Sheet + colW_Sheet / 2, tableTopY + 17, { align: "center" });
    doc.text("DRAFTSMAN REMARKS", colX_Notes + 8, tableTopY + 17);

    let rowY = tableTopY + 26;
    const rowH = 54;

    if (chunk.length === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(28, rowY, pageW - 56, 80, "F");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.setFont("helvetica", "normal");
      doc.text("No custom variations entered for this tender. Build conforms to standard specifications.", pageW / 2, rowY + 45, { align: "center" });
    } else {
      chunk.forEach((v, vIdx) => {
        const isAlt = vIdx % 2 === 1;
        doc.setFillColor(isAlt ? 248 : 255, isAlt ? 250 : 255, isAlt ? 252 : 255);
        doc.setDrawColor(226, 232, 240);
        doc.rect(28, rowY, pageW - 56, rowH, "FD");

        const schedIdx = chunkIdx * itemsPerPage + vIdx + 1;
        const linkedPinNum = v.pinNumber || (v.isStructural ? v.itemNumber : undefined);

        // Col 1: Pin / Item Badge
        if (v.isStructural) {
          doc.setFillColor(245, 158, 11); // amber-500
          doc.circle(colX_Item + colW_Item / 2, rowY + 22, 10, "F");
          doc.setTextColor(15, 23, 42);
          doc.setFontSize(8);
          doc.setFont("helvetica", "bold");
          doc.text(String(schedIdx), colX_Item + colW_Item / 2, rowY + 25, { align: "center" });
          doc.setFontSize(6);
          doc.setTextColor(180, 83, 9);
          doc.text(linkedPinNum ? `Pin #${linkedPinNum}` : "Structural", colX_Item + colW_Item / 2, rowY + 40, { align: "center" });
        } else {
          doc.setFillColor(224, 242, 254); // sky-100
          doc.setDrawColor(186, 230, 253);
          doc.circle(colX_Item + colW_Item / 2, rowY + 22, 10, "FD");
          doc.setTextColor(3, 105, 161);
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "bold");
          doc.text(String(schedIdx), colX_Item + colW_Item / 2, rowY + 25, { align: "center" });
          doc.setFontSize(6);
          doc.setTextColor(100, 116, 139);
          doc.text("Item", colX_Item + colW_Item / 2, rowY + 40, { align: "center" });
        }

        // Col 2: Description (split multi-line within colW_Desc - 16)
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        const lines = doc.splitTextToSize(v.description || "", colW_Desc - 16);
        doc.text(lines.slice(0, 3), colX_Desc + 8, rowY + 18);

        // Col 3: Category Badge
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        if (v.isStructural) {
          doc.setFillColor(254, 243, 199);
          doc.setDrawColor(251, 191, 36);
          doc.roundedRect(colX_Cat + 6, rowY + 18, colW_Cat - 12, 16, 3, 3, "FD");
          doc.setTextColor(180, 83, 9);
          doc.text("Structural", colX_Cat + colW_Cat / 2, rowY + 29, { align: "center" });
        } else {
          doc.setFillColor(241, 245, 249);
          doc.setDrawColor(203, 213, 225);
          doc.roundedRect(colX_Cat + 6, rowY + 18, colW_Cat - 12, 16, 3, 3, "FD");
          doc.setTextColor(71, 85, 105);
          doc.text("Inclusion", colX_Cat + colW_Cat / 2, rowY + 29, { align: "center" });
        }

        // Col 4: Clean Vector Checkbox: Approved
        const appBoxX = colX_App + (colW_App - 14) / 2;
        const appBoxY = rowY + (rowH - 14) / 2;
        const isApproved = v.draftsmanStatus === "approved";

        doc.setFillColor(isApproved ? 16 : 255, isApproved ? 185 : 255, isApproved ? 129 : 255);
        doc.setDrawColor(isApproved ? 16 : 203, isApproved ? 185 : 213, isApproved ? 129 : 225);
        doc.roundedRect(appBoxX, appBoxY, 14, 14, 2, 2, "FD");
        if (isApproved) {
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(1.5);
          doc.line(appBoxX + 3.5, appBoxY + 7, appBoxX + 6, appBoxY + 10.5);
          doc.line(appBoxX + 6, appBoxY + 10.5, appBoxX + 10.5, appBoxY + 4);
          doc.setLineWidth(0.75);
        }

        // Col 5: Clean Vector Checkbox: RFI
        const rfiBoxX = colX_Rfi + (colW_Rfi - 14) / 2;
        const rfiBoxY = rowY + (rowH - 14) / 2;
        const isRfi = v.draftsmanStatus === "rfi";

        doc.setFillColor(isRfi ? 245 : 255, isRfi ? 158 : 255, isRfi ? 11 : 255);
        doc.setDrawColor(isRfi ? 217 : 203, isRfi ? 119 : 213, isRfi ? 6 : 225);
        doc.roundedRect(rfiBoxX, rfiBoxY, 14, 14, 2, 2, "FD");
        if (isRfi) {
          doc.setFontSize(9);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(255, 255, 255);
          doc.text("!", rfiBoxX + 7, rfiBoxY + 10.5, { align: "center" });
        }

        // Col 6: Sheet Ref
        const sheetBoxX = colX_Sheet + 4;
        const sheetBoxW = colW_Sheet - 8;
        const sheetBoxY = rowY + 16;
        const sheetBoxH = 22;

        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(sheetBoxX, sheetBoxY, sheetBoxW, sheetBoxH, 2, 2, "FD");
        if (v.draftsmanSheetRef) {
          doc.setFontSize(7.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(15, 23, 42);
          doc.text(v.draftsmanSheetRef, sheetBoxX + 4, sheetBoxY + 14);
        }

        const tfSheet = new AcroFormTextField();
        tfSheet.Rect = [sheetBoxX, sheetBoxY, sheetBoxW, sheetBoxH];
        tfSheet.fieldName = `var_${v.id}_sheet`;
        tfSheet.value = v.draftsmanSheetRef || "";
        tfSheet.fontSize = 8;
        doc.addField(tfSheet);

        // Col 7: Draftsman Remarks (Strictly within colW_Notes - 8 pt, never outside page margin!)
        const notesBoxX = colX_Notes + 4;
        const notesBoxW = colW_Notes - 8;
        const notesBoxY = rowY + 12;
        const notesBoxH = 30;

        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(notesBoxX, notesBoxY, notesBoxW, notesBoxH, 2, 2, "FD");
        if (v.draftsmanNotes) {
          doc.setFontSize(7);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(15, 23, 42);
          const noteLines = doc.splitTextToSize(v.draftsmanNotes, notesBoxW - 8);
          doc.text(noteLines.slice(0, 2), notesBoxX + 4, notesBoxY + 12);
        }

        const tfNotes = new AcroFormTextField();
        tfNotes.Rect = [notesBoxX, notesBoxY, notesBoxW, notesBoxH];
        tfNotes.multiline = true;
        tfNotes.fieldName = `var_${v.id}_remarks`;
        tfNotes.value = v.draftsmanNotes || "";
        tfNotes.fontSize = 8;
        doc.addField(tfNotes);

        rowY += rowH;
      });
    }

    drawFooter(pageNum);
  });

  return new Blob([doc.output("arraybuffer")], { type: "application/pdf" });
}

/**
 * Renders an HD standalone working drawings specification directive for Bernie and the OnSite drafting team.
 * Formatted with side-by-side variations table and fillable drafting notes & checklist,
 * exported as a clean genuine PDF data URI.
 */
export async function renderDraftsmenVariationsDataUrl(
  submission: TenderSubmission
): Promise<string> {
  if (typeof document === "undefined") return "";

  try {
    const blob = await renderMultiPageDraftsmenVariationPdfBlob(submission);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("Could not generate multi-page draftsmen variation pdf data url:", err);
    return "";
  }
}

