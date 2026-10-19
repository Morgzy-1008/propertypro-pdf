import type { Division } from "@/lib/divisionContext";
import { logSystemAlert } from "@/lib/adminAlerts";
import {
  loadCustomFacades,
  saveCustomFacades,
  saveFacadeUplift,
  type FacadeItem,
} from "@/components/flyer/facadeLibrary";
import { isNarrowDoubleStorey, isSingleGarageDesign } from "@/lib/quoting/facadeLookup";
import type {
  CustomFacadeRecord,
  FacadeGarageConfig,
  FacadeHousingCategory,
} from "./facadeGeneratorTypes";

const STORAGE_CUSTOM_FACADES = "hudson_custom_facade_generator_records_v1";

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {}
  });
}

export function onCustomFacadesChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const INITIAL_SEEDED_CUSTOM_FACADES: CustomFacadeRecord[] = [
  {
    id: "custom-noosa-coastal-ss-dg",
    name: "Noosa Coastal",
    housingCategory: "Single Storey",
    garageConfig: "Double Garage",
    minLotWidthM: 12.5,
    style: "Modern Coastal",
    roofStyle: "Coastal Mixed Gable & Skillion",
    materials: {
      roofColorName: "Colorbond Surfmist®",
      roofColorHex: "#E4E2DC",
      roofMaterial: "Colorbond Corrugated",
      wallRenderName: "Dulux Lexicon® Quarter",
      wallRenderHex: "#F3F4F4",
      brickworkName: "Austral Whitsunday Coastal Chalk",
      brickworkHex: "#DCD7CE",
      claddingType: "Scyon Linea 180mm Weatherboard",
      claddingColorName: "Dulux Whisper White",
      claddingColorHex: "#EFECE6",
      featurePierMaterial: "Limestone Ashlar",
      battenAccentName: "Knotwood Coastal Spotted Gum",
      battenAccentHex: "#B5835A",
      garageDoorStyle: "Sectional Timber-Look Slats",
      garageDoorColorName: "Spotted Gum Timber-Look",
      garageDoorHex: "#A6754D",
      windowFrameColorName: "Pearl White Powdercoat",
      windowFrameHex: "#F1F1EF",
      drivewayFinish: "Honed Coastal Salt & Pepper",
      lightingMood: "Crisp Australian Daylight (11am)",
    },
    compatibleFamilies: ["Amber", "Banksia", "Bayside", "Charcoal", "Jasper", "Oasis", "Sanctuary"],
    targetDesignName: "Amber 23",
    qldUplift: 18900,
    nswUplift: 18400,
    promptHistory: [
      "Create a Single Storey Double Garage Modern Coastal facade with Surfmist Colorbond roof, Whisper White Scyon Linea weatherboard gable, Byron limestone portico pier, and Spotted Gum timber-look garage door",
    ],
    description:
      "Breezy Queensland & Northern NSW coastal elevation combining Scyon Linea 180mm weatherboards, a natural Byron limestone entry pier, and warm Spotted Gum batten screening.",
    imageUrl: "/facades/coastal-single-storey.png",
    baseReferenceUrl: "/facades/coastal-single-storey.png",
    status: "pending_review",
    createdBy: {
      id: "darryl-duggan",
      name: "Darryl Duggan",
      role: "sales",
      division: "QLD",
    },
    createdAt: "2026-10-19T04:15:00.000Z",
    submittedAt: "2026-10-19T04:22:00.000Z",
  },
  {
    id: "custom-manhattan-box-narrow-ds-sg",
    name: "Manhattan Box (Narrow SG)",
    housingCategory: "Narrow Double Storey",
    garageConfig: "Single Garage",
    minLotWidthM: 10.0,
    style: "Contemporary Box",
    roofStyle: "Flat Parapet / Box",
    materials: {
      roofColorName: "Colorbond Night Sky®",
      roofColorHex: "#222426",
      roofMaterial: "Colorbond Matt Standing Seam",
      wallRenderName: "Dulux Tranquil Retreat",
      wallRenderHex: "#C9C8C3",
      brickworkName: "Austral Metallix Bronze Charcoal",
      brickworkHex: "#3A3C3F",
      claddingType: "Cemintel Territory Cladding",
      claddingColorName: "Monument Matte",
      claddingColorHex: "#323639",
      featurePierMaterial: "Off-Form Concrete",
      battenAccentName: "Anodised Blackbutt Vertical Battens",
      battenAccentHex: "#8C6239",
      garageDoorStyle: "Architectural Negative Detail",
      garageDoorColorName: "Colorbond Monument®",
      garageDoorHex: "#323639",
      windowFrameColorName: "Matt Black Commercial Frame",
      windowFrameHex: "#1E2022",
      drivewayFinish: "Exposed Aggregate Charcoal",
      lightingMood: "Golden Hour Twilight",
    },
    compatibleFamilies: ["Ruby", "Cerise", "Orchid", "Mint", "Lime", "Terracotta"],
    targetDesignName: "Ruby 21",
    qldUplift: 29500,
    nswUplift: 28900,
    promptHistory: [
      "Build a Narrow Double Storey Single Garage architectural box facade for 10m lots like Ruby 21 with a cantilevered Monument parapet, off-form concrete pier, vertical timber battens, and twilight LED strip lighting",
    ],
    description:
      "Architectural cantilevered box elevation tailored specifically for 10m narrow-lot double storey single-garage designs (Ruby, Cerise, Orchid).",
    imageUrl: "/facades/contemporary-narrow-dg.png",
    baseReferenceUrl: "/facades/contemporary-narrow-dg.png",
    status: "pending_review",
    createdBy: {
      id: "sarah-jenkins",
      name: "Sarah Jenkins",
      role: "sales",
      division: "NSW",
    },
    createdAt: "2026-10-19T06:40:00.000Z",
    submittedAt: "2026-10-19T06:48:00.000Z",
  },
];

export function getAllCustomFacadeRecords(): CustomFacadeRecord[] {
  if (typeof window === "undefined") return INITIAL_SEEDED_CUSTOM_FACADES;
  try {
    const raw = window.localStorage.getItem(STORAGE_CUSTOM_FACADES);
    if (!raw) {
      window.localStorage.setItem(
        STORAGE_CUSTOM_FACADES,
        JSON.stringify(INITIAL_SEEDED_CUSTOM_FACADES)
      );
      return INITIAL_SEEDED_CUSTOM_FACADES;
    }
    const parsed = JSON.parse(raw) as CustomFacadeRecord[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_SEEDED_CUSTOM_FACADES;
  } catch {
    return INITIAL_SEEDED_CUSTOM_FACADES;
  }
}

function persistCustomFacadeRecords(records: CustomFacadeRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_CUSTOM_FACADES, JSON.stringify(records));
  } catch {
    // If localStorage hits quota due to large data URLs, keep last 12 full records
    try {
      const trimmed = records.slice(0, 12);
      window.localStorage.setItem(STORAGE_CUSTOM_FACADES, JSON.stringify(trimmed));
    } catch {}
  }
  notifyListeners();
}

export function saveCustomFacadeRecord(record: CustomFacadeRecord): CustomFacadeRecord {
  const existing = getAllCustomFacadeRecords();
  const idx = existing.findIndex((r) => r.id === record.id);
  const next =
    idx >= 0
      ? existing.map((r, i) => (i === idx ? record : r))
      : [record, ...existing];
  persistCustomFacadeRecords(next);
  if (record.status === "approved") {
    syncApprovedFacadesToGlobalLibrary(next);
  }
  return record;
}

export function submitCustomFacadeForReview(record: CustomFacadeRecord): CustomFacadeRecord {
  const submitted: CustomFacadeRecord = {
    ...record,
    status: "pending_review",
    submittedAt: new Date().toISOString(),
  };
  saveCustomFacadeRecord(submitted);

  logSystemAlert(
    "info" as any,
    `Facade Submitted for Admin Review: ${submitted.name}`,
    `${submitted.createdBy.name} submitted "${submitted.name}" (${submitted.housingCategory} • ${submitted.garageConfig}) for permanent Facade Library approval.`,
    "warning",
    {
      facadeId: submitted.id,
      housingCategory: submitted.housingCategory,
      garageConfig: submitted.garageConfig,
    }
  );

  return submitted;
}

export function approveCustomFacadeByAdmin(
  id: string,
  patch: Partial<CustomFacadeRecord>,
  reviewerName = "Morgan Hales"
): CustomFacadeRecord | null {
  const existing = getAllCustomFacadeRecords();
  const found = existing.find((r) => r.id === id);
  if (!found) return null;

  const approved: CustomFacadeRecord = {
    ...found,
    ...patch,
    status: "approved",
    reviewedBy: reviewerName,
    reviewedAt: new Date().toISOString(),
  };

  const next = existing.map((r) => (r.id === id ? approved : r));
  persistCustomFacadeRecords(next);
  syncApprovedFacadesToGlobalLibrary(next);

  // Persist to public/facades via API when running in dev/node server
  try {
    if (approved.imageUrl && approved.imageUrl.startsWith("data:image/")) {
      const safeSlug = approved.id.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      void fetch("/api/save-facade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facadeId: approved.id,
          filename: `${safeSlug}.jpg`,
          imageBase64: approved.imageUrl,
          facadeName: approved.name,
        }),
      }).catch(() => {});
    }
  } catch {}

  logSystemAlert(
    "security_event",
    `Custom Facade Approved & Published: ${approved.name}`,
    `${reviewerName} approved "${approved.name}" (${approved.housingCategory} • ${approved.garageConfig}) into the Permanent Facade Library.`,
    "info",
    { facadeId: approved.id }
  );

  return approved;
}

export function rejectCustomFacadeByAdmin(
  id: string,
  adminNotes: string,
  reviewerName = "Morgan Hales"
): CustomFacadeRecord | null {
  const existing = getAllCustomFacadeRecords();
  const found = existing.find((r) => r.id === id);
  if (!found) return null;

  const rejected: CustomFacadeRecord = {
    ...found,
    status: "rejected",
    adminNotes,
    reviewedBy: reviewerName,
    reviewedAt: new Date().toISOString(),
  };

  const next = existing.map((r) => (r.id === id ? rejected : r));
  persistCustomFacadeRecords(next);
  syncApprovedFacadesToGlobalLibrary(next);
  return rejected;
}

export function deleteCustomFacadeRecord(id: string): void {
  const existing = getAllCustomFacadeRecords();
  const next = existing.filter((r) => r.id !== id);
  persistCustomFacadeRecords(next);
  syncApprovedFacadesToGlobalLibrary(next);
}

/**
 * Synchronizes all Admin-Approved custom facades into the global `hudson-facade-library`
 * used by Flyer Studio and `hudson-facade-uplifts`.
 */
export function syncApprovedFacadesToGlobalLibrary(allRecords?: CustomFacadeRecord[]): void {
  if (typeof window === "undefined") return;
  const records = allRecords || getAllCustomFacadeRecords();
  const approved = records.filter((r) => r.status === "approved");

  const existingCustom = loadCustomFacades().filter(
    (f) => !f.id.startsWith("custom-") && !f.tags?.includes("facade-generator")
  );

  const mappedApproved: FacadeItem[] = approved.map((r) => {
    const tags: string[] = [
      "facade-generator",
      "approved-custom",
      r.style.toLowerCase().replace(/\s+/g, "-"),
    ];
    if (r.housingCategory.includes("Double")) tags.push("double");
    if (r.housingCategory.includes("Narrow Double")) tags.push("narrow-double");
    if (r.housingCategory.includes("Single")) tags.push("single");
    if (r.housingCategory === "Split Level") tags.push("split");
    if (r.housingCategory === "Acreage") tags.push("acreage");
    if (r.housingCategory === "Dual Living") tags.push("duplex", "dual");
    if (r.garageConfig === "Single Garage") tags.push("single-garage");
    if (r.garageConfig === "Double Garage") tags.push("double-garage");

    saveFacadeUplift(r.id, r.qldUplift);

    return {
      id: r.id,
      name: r.name,
      range: r.housingCategory,
      tags,
      url: r.imageUrl,
      originalUrl: r.baseReferenceUrl || r.imageUrl,
    };
  });

  saveCustomFacades([...mappedApproved, ...existingCustom]);
}

/**
 * Evaluates whether an Admin-Approved custom facade matches a target design & housing type
 * based on its back-end filters (`housingCategory`, `garageConfig`, `compatibleFamilies`).
 */
export function getApprovedCustomFacadesForDesign(
  designName?: string,
  housingType: string = "Single Storey",
  division: Division = "QLD"
): { name: string; uplift: number; note?: string; range?: string; url?: string; id?: string }[] {
  const approved = getAllCustomFacadeRecords().filter((r) => r.status === "approved");
  if (approved.length === 0) return [];

  const isNsw = division === "NSW";
  const isNarrowDouble = isNarrowDoubleStorey(designName);
  const isSingleGarage = isSingleGarageDesign(designName, housingType);
  const isDouble =
    housingType === "Double Storey" ||
    housingType === "double" ||
    Boolean(designName && /cinnamon|mauve|maroon/i.test(designName));
  const isDuplex =
    housingType === "Dual Living" ||
    housingType === "dual-oc" ||
    Boolean(designName && /duplex|dual|cayenne|maize|magnolia|raven|teal|wisteria|alabaster/i.test(designName));
  const isSplit = housingType === "Split Level" && !isDouble;
  const isAcreage =
    housingType === "Acreage" ||
    Boolean(designName && /^mulberry\b/i.test(designName));
  const isGranny =
    housingType === "Granny Flat" ||
    Boolean(designName && /^aqua\b/i.test(designName));

  return approved
    .filter((r) => {
      // 1. Check garage configuration match
      if (isGranny) {
        return r.housingCategory === "Granny Flat" || r.garageConfig === "No Garage";
      }
      if (isSingleGarage && r.garageConfig !== "Single Garage") {
        return false;
      }
      if (!isSingleGarage && r.garageConfig === "Single Garage") {
        return false;
      }

      // 2. Check storey / housing category match
      if (isDuplex) return r.housingCategory === "Dual Living";
      if (isAcreage) return r.housingCategory === "Acreage";
      if (isSplit) return r.housingCategory === "Split Level";

      if (isDouble) {
        if (isNarrowDouble) {
          return r.housingCategory === "Narrow Double Storey";
        }
        return r.housingCategory === "Double Storey";
      }

      // Single Storey
      return (
        r.housingCategory === "Single Storey" ||
        r.housingCategory === "Single Storey (Narrow Lot)"
      );
    })
    .map((r) => ({
      id: r.id,
      name: r.name,
      uplift: isNsw ? r.nswUplift : r.qldUplift,
      range: `${r.housingCategory} • ${r.garageConfig}`,
      note: `${r.style} (${r.materials.roofColorName})`,
      url: r.imageUrl,
    }));
}

/**
 * Resolves an Admin-Approved custom facade by name or ID for `findFacadeForDesign`.
 */
export function findApprovedCustomFacade(
  facadeNameOrId: string
): FacadeItem | undefined {
  if (!facadeNameOrId) return undefined;
  const norm = facadeNameOrId.trim().toLowerCase();
  const approved = getAllCustomFacadeRecords().filter((r) => r.status === "approved");
  const match = approved.find(
    (r) =>
      r.id.toLowerCase() === norm ||
      r.name.toLowerCase() === norm ||
      r.name.toLowerCase().replace(/[^a-z0-9]/g, "") === norm.replace(/[^a-z0-9]/g, "")
  );
  if (!match) return undefined;
  return {
    id: match.id,
    name: match.name,
    range: match.housingCategory,
    tags: [
      "approved-custom",
      match.housingCategory.toLowerCase(),
      match.garageConfig.toLowerCase(),
    ],
    url: match.imageUrl,
    originalUrl: match.baseReferenceUrl || match.imageUrl,
  };
}

export function getDefaultCompatibleFamilies(
  housingCategory: FacadeHousingCategory,
  garageConfig: FacadeGarageConfig
): string[] {
  if (housingCategory === "Narrow Double Storey") {
    if (garageConfig === "Single Garage") {
      return ["Ruby 19–28", "Cerise 20", "Orchid 23–25", "Mint", "Lime", "Terracotta 23"];
    }
    return ["Carolina 24–32", "Turquoise 25–33", "Sabel 25–28"];
  }
  if (housingCategory === "Double Storey") {
    if (garageConfig === "Single Garage") {
      return ["Ruby 19–28", "Cerise 20", "Emerald 28 (SG)", "Orchid 23–25", "Robin 5–8"];
    }
    return ["Burgundy", "Jasper", "Sapphire", "Emerald", "Diamond", "Onyx", "Aston", "Opal", "Topaz"];
  }
  if (housingCategory === "Single Storey" || housingCategory === "Single Storey (Narrow Lot)") {
    if (garageConfig === "Single Garage") {
      return ["Hazel 14–16", "Canary", "Indigo", "Iris"];
    }
    return ["Amber", "Amaranth", "Banksia", "Charcoal", "Oasis", "Sanctuary", "Sienna"];
  }
  if (housingCategory === "Dual Living") {
    return ["Cayenne", "Maize", "Magnolia", "Raven", "Teal", "Wisteria", "Alabaster"];
  }
  if (housingCategory === "Split Level") {
    return ["Cobalt", "Cinnamon", "Mauve", "Maroon"];
  }
  if (housingCategory === "Acreage") {
    return ["Mulberry 22–39"];
  }
  if (housingCategory === "Granny Flat") {
    return ["Aqua 1–5"];
  }
  return ["All Compatible Designs"];
}
