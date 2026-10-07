/**
 * AS 3959 Bushfire Attack Level (BAL) Architectural Costing Engine
 * 
 * Computes exact, design-tailored costs for Bushfire Protection requirements under AS 3959:
 * - Reads exact window and door schedules from Hudson Master Architectural Plans (93+ master plans).
 * - Costs aluminium ember screens for each individual window based on dimensions (height & width).
 * - Costs aluminium sliding door screens, hinged external door draft seals, and garage door perimeter seals.
 * - Costs envelope requirements: Stainless steel weep hole spark arrestors, non-combustible roof sarking,
 *   metal gutter leaf guards, and Form 15/16 compliance certification.
 * - Handles modified plans dynamically by scaling schedules and incorporating custom openings.
 * - Calibrated so an average 200m² Single Storey home is approximately $6,000 at BAL-12.5.
 */

import {
  MASTER_WINDOW_DOOR_CATALOG,
  type MasterWindowItem,
  type MasterDoorItem,
} from "./masterWindowDoorSchedules.data";
export type { MasterWindowItem, MasterDoorItem };
import type { QuoteDesignSelection } from "./quoteTypes";

export type BushfireBalLevel = "None" | "BAL-12.5" | "BAL-19" | "BAL-29" | "BAL-40";

export interface BushfireItemCost {
  id: string;
  category: "windows" | "doors" | "envelope" | "certification";
  title: string;
  description: string;
  quantity: number;
  unit: string;
  unitRate: number;
  subtotal: number;
  details?: string;
}

export interface TailoredWindowItem extends MasterWindowItem {
  displayCode: string;
  screenCost: number;
  glassAreaM2: number;
  description: string;
}

export interface TailoredDoorItem extends MasterDoorItem {
  displayCode: string;
  isSliding: boolean;
  protectionCost: number;
  description: string;
}

export interface BushfireCostBreakdown {
  bal: BushfireBalLevel;
  designName: string;
  housingType: string;
  isDoubleStorey: boolean;
  isModifiedPlan: boolean;
  gfaM2: number;
  windowCount: number;
  totalWindowAreaM2: number;
  doorCount: number;
  slidingDoorCount: number;
  windowsCost: number;
  doorsCost: number;
  roofSarkingCost: number;
  gutterGuardsCost: number;
  weepHolesCost: number;
  certificationCost: number;
  totalCost: number;
  items: BushfireItemCost[];
  windowItems: TailoredWindowItem[];
  doorItems: TailoredDoorItem[];
  statutorySummary: string[];
}

/**
 * Standard synthetic schedule generator for designs without an explicit master PDF
 */
function generateSyntheticSchedule(
  gfaM2: number,
  beds: number,
  baths: number,
  isDouble: boolean
): { windows: MasterWindowItem[]; doors: MasterDoorItem[] } {
  const windows: MasterWindowItem[] = [];
  let winIdx = 1;

  // Master bedroom: large window
  windows.push({ no: `W${winIdx++}`, code: "AST 1818", heightMm: 1800, widthMm: 1810 });

  // Other bedrooms: standard 1218 windows
  const extraBeds = Math.max(1, beds - 1);
  for (let i = 0; i < extraBeds; i++) {
    windows.push({ no: `W${winIdx++}`, code: "AS 1218", heightMm: 1200, widthMm: 1810 });
  }

  // Bathrooms / Ensuite: obscure windows
  const totalBaths = Math.max(1, baths);
  for (let i = 0; i < totalBaths; i++) {
    windows.push({ no: `W${winIdx++}`, code: "AS 0906", heightMm: 860, widthMm: 610 });
  }

  // Kitchen: splashback or sliding window
  windows.push({ no: `W${winIdx++}`, code: "AS 1218", heightMm: 1200, widthMm: 1810 });

  // Living / Meals / Dining based on size
  const livingWindows = Math.max(2, Math.round(gfaM2 / 65));
  for (let i = 0; i < livingWindows; i++) {
    const isLarge = i % 2 === 0;
    windows.push({
      no: `W${winIdx++}`,
      code: isLarge ? "AST 1818" : "AS 1218",
      heightMm: isLarge ? 1800 : 1200,
      widthMm: 1810,
    });
  }

  // Upper floor extra windows for double storey
  if (isDouble) {
    windows.push({ no: `W${winIdx++}`, code: "AS 1218", heightMm: 1200, widthMm: 1810 });
    windows.push({ no: `W${winIdx++}`, code: "AS 1218", heightMm: 1200, widthMm: 1810 });
  }

  const doors: MasterDoorItem[] = [
    { no: "D1", code: "Front Entry Door", heightMm: 2040, widthMm: 820 },
    { no: "D2", code: "Laundry / Garage External", heightMm: 2040, widthMm: 820 },
    { no: "D3", code: "ASDI 2124 Sliding Door", heightMm: 2100, widthMm: 2410 },
  ];

  if (gfaM2 > 240) {
    doors.push({ no: "D4", code: "ASDI 2121 Secondary Sliding Door", heightMm: 2100, widthMm: 2170 });
  }

  return { windows, doors };
}

/**
 * Normalizes or generates a standard architectural window code (e.g. "AST 1818", "AS 1218", "AS 0906")
 */
export function getReadableWindowCode(rawCode?: string, heightMm?: number, widthMm?: number): string {
  const hMm = heightMm || 1200;
  const wMm = widthMm || 1810;
  const hCode = Math.round(hMm / 100).toString().padStart(2, "0");
  const wCode = Math.round(wMm / 100).toString().padStart(2, "0");
  const stdCode = `${hCode}${wCode}`;

  const clean = (rawCode || "").trim().toUpperCase();
  if (clean && clean !== "N/A" && clean !== "WINDOW") {
    if (/\d{4}/.test(clean)) {
      return clean.startsWith("AS") ? clean : `AS ${clean}`;
    }
    if (clean === "AST" || clean === "AS" || clean === "OB") {
      return `${clean} ${stdCode}`;
    }
    return `${clean} (${stdCode})`;
  }

  const prefix = hMm >= 1800 ? "AST" : "AS";
  return `${prefix} ${stdCode}`;
}

/**
 * Normalizes or generates a standard door description and architectural callout
 */
export function getReadableDoorInfo(rawCode?: string, heightMm?: number, widthMm?: number): {
  isSliding: boolean;
  displayCode: string;
  displayType: string;
} {
  const hMm = heightMm || 2100;
  const wMm = widthMm || 1800;
  const clean = (rawCode || "").trim().toUpperCase();
  const isSliding = /SD|ASDI|SLIDING|STACKER|PATIO/i.test(clean) || wMm > 1500;

  const hCode = Math.round(hMm / 100).toString().padStart(2, "0");
  const wCode = Math.round(wMm / 100).toString().padStart(2, "0");
  const sizeTag = `${hMm}h × ${wMm}w`;

  if (isSliding) {
    const code = clean.startsWith("SD") ? clean : `SD ${hCode}${wCode}`;
    return {
      isSliding: true,
      displayCode: code,
      displayType: `Aluminium Security Sliding Screen Door (${sizeTag})`,
    };
  }

  const code = clean && clean !== "N/A" && !clean.includes("UNKNOWN") ? clean : `D ${hCode}${wCode}`;
  return {
    isSliding: false,
    displayCode: code,
    displayType: `Hinged External Door Perimeter Draught Seals (${sizeTag})`,
  };
}

/**
 * Resolves the master window & door schedule for a given design, with modified plan scaling.
 */
export function resolveDesignSchedule(
  designName: string,
  gfaM2: number,
  isDouble: boolean,
  isModified: boolean = false,
  modifiedM2?: number
): { windows: MasterWindowItem[]; doors: MasterDoorItem[]; isFromMasterCatalog: boolean } {
  // 1. Attempt exact or normalized lookup in master catalog
  const clean = (designName || "")
    .replace(/\s*(?:SS|DS|MK\s*\d+|MKII|MK2|Classic|LH|RH|Custom).*$/i, "")
    .trim();

  let masterEntry = MASTER_WINDOW_DOOR_CATALOG[clean] || MASTER_WINDOW_DOOR_CATALOG[designName];

  if (!masterEntry) {
    // Try case-insensitive matching
    const lower = clean.toLowerCase();
    for (const [key, val] of Object.entries(MASTER_WINDOW_DOOR_CATALOG)) {
      if (key.toLowerCase() === lower || key.toLowerCase().startsWith(lower) || lower.startsWith(key.toLowerCase())) {
        masterEntry = val;
        break;
      }
    }
  }

  let windows: MasterWindowItem[] = [];
  let doors: MasterDoorItem[] = [];
  let isFromMasterCatalog = false;

  if (masterEntry && masterEntry.windows && masterEntry.windows.length > 0) {
    windows = masterEntry.windows.map((w) => ({ ...w }));
    doors = (masterEntry.doors && masterEntry.doors.length > 0)
      ? masterEntry.doors.map((d) => ({ ...d }))
      : [
          { no: "D1", code: "Front Door", heightMm: 2040, widthMm: 820 },
          { no: "D2", code: "Laundry Door", heightMm: 2040, widthMm: 820 },
          { no: "D3", code: "ASDI 2124", heightMm: 2100, widthMm: 2410 },
        ];
    isFromMasterCatalog = true;
  } else {
    // Fallback to intelligent schedule generator
    const gen = generateSyntheticSchedule(gfaM2, isDouble ? 5 : 4, isDouble ? 3 : 2, isDouble);
    windows = gen.windows;
    doors = gen.doors;
  }

  // 2. Adjust for modified plans: if modified sqm is significantly different, scale schedule
  if (isModified && modifiedM2 && modifiedM2 > 0 && Math.abs(modifiedM2 - gfaM2) > 15) {
    const scaleRatio = modifiedM2 / gfaM2;
    if (scaleRatio > 1.15) {
      // Extended home: add extra standard window
      const extraCount = Math.round((modifiedM2 - gfaM2) / 35);
      for (let i = 0; i < extraCount; i++) {
        windows.push({
          no: `W${windows.length + 1} (Mod)`,
          code: "AS 1218 (Extension)",
          heightMm: 1200,
          widthMm: 1810,
        });
      }
    }
  }

  return { windows, doors, isFromMasterCatalog };
}

/**
 * Calculates the exact tailored cost of bushfire compliance for a specific design under AS 3959.
 */
export function calculateTailoredBushfireCost(options: {
  bal: BushfireBalLevel;
  designName?: string;
  housingType?: string;
  gfaM2?: number;
  isDoubleStorey?: boolean;
  isModifiedPlan?: boolean;
  modifiedM2?: number;
}): BushfireCostBreakdown {
  const {
    bal,
    designName = "Hudson Design",
    housingType = "Single Storey",
    gfaM2 = 200,
    isDoubleStorey = false,
    isModifiedPlan = false,
    modifiedM2,
  } = options;

  const effectiveGfa =
    gfaM2 && gfaM2 > 0
      ? Math.max(80, gfaM2)
      : isModifiedPlan && modifiedM2 && modifiedM2 > 0
      ? isDoubleStorey
        ? Math.round(modifiedM2 * 0.55)
        : modifiedM2
      : isDoubleStorey
      ? 280
      : 200;

  // Return $0 for BAL-LOW or None
  if (!bal || bal === "None" || bal === "BAL-LOW" || (bal as string) === "BAL-Low") {
    return {
      bal: bal || "None",
      designName,
      housingType,
      isDoubleStorey,
      isModifiedPlan,
      gfaM2: effectiveGfa,
      windowCount: 0,
      totalWindowAreaM2: 0,
      doorCount: 0,
      slidingDoorCount: 0,
      windowsCost: 0,
      doorsCost: 0,
      roofSarkingCost: 0,
      gutterGuardsCost: 0,
      weepHolesCost: 0,
      certificationCost: 0,
      totalCost: 0,
      items: [],
      windowItems: [],
      doorItems: [],
      statutorySummary: [
        "BAL-LOW: Standard NCC/BCA building construction applies.",
        "No specific bushfire protection measures required under AS 3959.",
      ],
    };
  }

  // 1. Resolve exact window and door schedules
  const { windows, doors } = resolveDesignSchedule(
    designName,
    effectiveGfa,
    isDoubleStorey,
    isModifiedPlan,
    modifiedM2
  );

  const items: BushfireItemCost[] = [];

  // 2. COST WINDOW SCREENS & GLAZING UNDER AS 3959
  let totalWinCost = 0;
  let totalWinAreaM2 = 0;

  const detailedWindows = windows.map((w, idx) => {
    const wM = (w.widthMm || 1810) / 1000;
    const hM = (w.heightMm || 1200) / 1000;
    const area = Math.round(wM * hM * 100) / 100;
    totalWinAreaM2 += area;

    // Unit rate for aluminium mesh screen based on aperture / area
    let screenRate = 160; // standard medium window (1.0 to 2.3 m2)
    if (area < 1.0) {
      screenRate = 115; // small window (e.g. 0906, 0606)
    } else if (area >= 2.3) {
      screenRate = 220; // large window (e.g. 1818, 1822)
    }

    // BAL-19 / BAL-29 / BAL-40 tier surcharges
    let tierUpgrade = 0;
    if (bal === "BAL-19") {
      tierUpgrade = 45 + Math.round(area * 55); // 304 stainless mesh + 5mm Grade A toughened safety glass
    } else if (bal === "BAL-29") {
      tierUpgrade = 95 + Math.round(area * 75); // 316 marine stainless mesh + 6mm toughened glazing tested to AS 1530.8.1
    } else if (bal === "BAL-40") {
      tierUpgrade = 750 + Math.round(area * 180); // Certified BAL-40 fire window assembly or fire shutter
    }

    // Scaffold access surcharge for upper floor in double storey
    const isUpper = isDoubleStorey && idx >= Math.floor(windows.length / 2);
    const upperSurcharge = isUpper ? 35 : 0;

    const unitTotal = screenRate + tierUpgrade + upperSurcharge;
    totalWinCost += unitTotal;

    const displayCode = getReadableWindowCode(w.code, w.heightMm, w.widthMm);
    const desc = `${displayCode} (${w.heightMm}h × ${w.widthMm}w, ${area}m²) — ${
      bal === "BAL-40"
        ? "BAL-40 Fire Window / Shutter System"
        : bal === "BAL-29"
        ? "316 Stainless Mesh & 6mm Toughened Glass"
        : bal === "BAL-19"
        ? "304 Stainless Mesh & 5mm Toughened Glass"
        : "Corrosion-resistant aluminium ember screen"
    }${isUpper ? " (Upper Storey)" : ""}`;

    return {
      ...w,
      displayCode,
      screenCost: unitTotal,
      glassAreaM2: area,
      description: desc,
    };
  });

  items.push({
    id: "bf_window_screens",
    category: "windows",
    title: `Aluminium / Metal Ember Screens to Windows (${windows.length} Openings)`,
    description: `Corrosion-resistant metal mesh screens (≤2mm aperture) fitted to all openable window sashes under AS 3959 ${bal}.`,
    quantity: windows.length,
    unit: "windows",
    unitRate: Math.round(totalWinCost / Math.max(1, windows.length)),
    subtotal: totalWinCost,
    details: `${windows.length} windows scheduled (${totalWinAreaM2.toFixed(1)}m² total glazing area).`,
  });

  // 3. COST EXTERNAL DOORS & SLIDING DOORS
  let totalDoorCost = 0;
  let slidingDoorCount = 0;

  const detailedDoors = doors.map((d) => {
    const doorInfo = getReadableDoorInfo(d.code, d.heightMm, d.widthMm);
    const isSliding = doorInfo.isSliding;
    let cost = 0;
    let desc = "";

    if (isSliding) {
      slidingDoorCount++;
      const isWide = (d.widthMm || 2400) > 2500;
      cost = isWide ? 680 : 490;

      if (bal === "BAL-19") cost += 140; // upgraded interlock seals & 5mm safety glass
      if (bal === "BAL-29") cost += 310; // AS 1530.8.1 tested screen assembly
      if (bal === "BAL-40") cost += 1850; // motorized certified BAL-40 fire shutter

      desc = `${doorInfo.displayCode} (${d.heightMm}h × ${d.widthMm}w) — Aluminium security sliding ember screen door`;
    } else {
      // Hinged external door (front entry, laundry external)
      cost = 145; // perimeter weather/ember draft seals
      if (bal === "BAL-19" || bal === "BAL-29") cost = 265; // solid core door upgrade + Raven intumescent seals
      if (bal === "BAL-40") cost = 1250; // certified FRL 30/--/-- fire door assembly

      desc = `${doorInfo.displayCode} (${d.heightMm}h × ${d.widthMm}w) — Perimeter draught & ember compression seals (≤2mm gap)`;
    }

    totalDoorCost += cost;
    return {
      ...d,
      displayCode: doorInfo.displayCode,
      isSliding,
      protectionCost: cost,
      description: desc,
    };
  });

  // Garage door perimeter flame/ember seal
  const garageDoorCost = bal === "BAL-40" ? 850 : 340;
  totalDoorCost += garageDoorCost;

  items.push({
    id: "bf_door_protection",
    category: "doors",
    title: `External Doors & Sliding Screen Protection (${doors.length} Doors + Garage)`,
    description: `Aluminium sliding ember screen doors, perimeter draught seals (≤2mm gap), and garage door bottom compression/brush seals.`,
    quantity: doors.length + 1,
    unit: "doors",
    unitRate: Math.round(totalDoorCost / (doors.length + 1)),
    subtotal: totalDoorCost,
    details: `${slidingDoorCount} sliding door screens, ${doors.length - slidingDoorCount} hinged door seals, plus sectional garage door ember seals.`,
  });

  // 4. WEEP HOLE SPARK ARRESTORS & SUBFLOOR MESH
  // Perimeter approximated as 4.5 * sqrt(GFA) for typical rectangular/articulated footprints
  const perimeterLm = Math.round(4.4 * Math.sqrt(effectiveGfa));
  const weepHoleCount = Math.max(20, Math.round(perimeterLm / 1.5));
  const weepRate = bal === "BAL-40" ? 14 : 8.5;
  const weepHolesCost = Math.round(weepHoleCount * weepRate);

  items.push({
    id: "bf_weep_holes",
    category: "envelope",
    title: `Weep Hole Spark Arrestors & Subfloor Mesh (${weepHoleCount} Units)`,
    description: `Stainless steel ember guards fitted to all perimeter brick weep holes and subfloor ventilation apertures.`,
    quantity: weepHoleCount,
    unit: "points",
    unitRate: weepRate,
    subtotal: weepHolesCost,
    details: `Covers ${perimeterLm}m building perimeter at 1.5m centres.`,
  });

  // 5. NON-COMBUSTIBLE ROOF SARKING & RIDGE/VALLEY EMBER SEALING
  // Roof area includes 15% roof pitch factor over GFA
  const roofAreaM2 = Math.round(effectiveGfa * 1.15);
  let sarkingRatePerM2 = 8.5; // BAL-12.5 baseline
  if (bal === "BAL-19") sarkingRatePerM2 = 10.5;
  if (bal === "BAL-29") sarkingRatePerM2 = 13.5;
  if (bal === "BAL-40") sarkingRatePerM2 = 24.0;

  const roofSarkingCost = Math.round(roofAreaM2 * sarkingRatePerM2);

  items.push({
    id: "bf_roof_sarking",
    category: "envelope",
    title: `Non-Combustible Heavy Duty Roof Sarking (${roofAreaM2}m²)`,
    description: `Reflective foil non-combustible roof sarking under all roof tiles or sheet metal, sealed continuously at fascia, hips, and valleys.`,
    quantity: roofAreaM2,
    unit: "m²",
    unitRate: sarkingRatePerM2,
    subtotal: roofSarkingCost,
    details: `Sarking across ${roofAreaM2}m² roof footprint with ember-stop ridge sealing.`,
  });

  // 6. METAL GUTTER LEAF GUARDS
  const gutterLm = Math.round(perimeterLm * 0.9);
  let gutterRate = 18; // Aluminium woven mesh gutter guard
  if (bal === "BAL-19") gutterRate = 22;
  if (bal === "BAL-29" || bal === "BAL-40") gutterRate = 28; // AS 3959 certified Flammability Index ≤ 5 metal mesh

  const gutterGuardsCost = Math.round(gutterLm * gutterRate);

  items.push({
    id: "bf_gutter_guards",
    category: "envelope",
    title: `Metal Gutter & Valley Ember Leaf Guards (${gutterLm}lm)`,
    description: `Aluminium / metal gutter guards (Flammability Index ≤ 5) preventing dry leaf build-up in roof eaves and valleys.`,
    quantity: gutterLm,
    unit: "lm",
    unitRate: gutterRate,
    subtotal: gutterGuardsCost,
    details: `Continuous metal ember guard protection along ${gutterLm}m of eaves gutters.`,
  });

  // 7. STATUTORY FORM 15/16 BUSHFIRE COMPLIANCE CERTIFICATION
  const certificationCost = 350;

  items.push({
    id: "bf_certification",
    category: "certification",
    title: `Statutory AS 3959 Compliance Certification (Form 15/16)`,
    description: `On-site installation audit and statutory engineering certification for bushfire-resistant construction.`,
    quantity: 1,
    unit: "cert",
    unitRate: certificationCost,
    subtotal: certificationCost,
    details: `Accredited bushfire consultant sign-off for statutory private certifier / council approval.`,
  });

  const totalCalculated =
    totalWinCost +
    totalDoorCost +
    weepHolesCost +
    roofSarkingCost +
    gutterGuardsCost +
    certificationCost;

  // Round to nearest $50 for neat professional quotation
  const roundedTotal = Math.round(totalCalculated / 50) * 50;

  const statutorySummary = [
    `AS 3959 ${bal} Construction Requirements for "${designName}" (${effectiveGfa}m²):`,
    `• Windows: ${windows.length} aluminium ember screens with ≤2mm aperture (Total glass: ${totalWinAreaM2.toFixed(1)}m²).`,
    `• Doors: ${slidingDoorCount} aluminium security sliding screens + ${doors.length - slidingDoorCount} external doors sealed with fire draft strips.`,
    `• Envelope: ${weepHoleCount} stainless steel weep hole spark arrestors along ${perimeterLm}m perimeter.`,
    `• Roof: ${roofAreaM2}m² heavy-duty non-combustible sarking sealed at eaves and valleys.`,
    `• Gutters: ${gutterLm}lm metal gutter leaf guards (Flammability Index ≤ 5).`,
    `• Form 15/16 Bushfire Compliance Certification included.`,
  ];

  return {
    bal,
    designName,
    housingType,
    isDoubleStorey,
    isModifiedPlan,
    gfaM2: effectiveGfa,
    windowCount: windows.length,
    totalWindowAreaM2: Math.round(totalWinAreaM2 * 10) / 10,
    doorCount: doors.length,
    slidingDoorCount,
    windowsCost: totalWinCost,
    doorsCost: totalDoorCost,
    roofSarkingCost,
    gutterGuardsCost,
    weepHolesCost,
    certificationCost,
    totalCost: roundedTotal,
    items,
    windowItems: detailedWindows,
    doorItems: detailedDoors,
    statutorySummary,
  };
}

/**
 * Drop-in replacement for the old getBushfireCost in quoteEngine.ts
 * Backward compatible: accepts (bal, isDouble, design) or (bal, isDouble, designName, gfaM2)
 */
export function getBushfireCost(
  bal: BushfireBalLevel,
  isDoubleStorey: boolean = false,
  designOrName?: QuoteDesignSelection | string,
  gfaM2?: number
): number {
  if (!bal || bal === "None" || bal === "BAL-LOW" || (bal as string) === "BAL-Low") return 0;

  let designName = "Hudson Design";
  let housingType = isDoubleStorey ? "Double Storey" : "Single Storey";
  let isModified = false;
  let modifiedM2: number | undefined;

  if (designOrName && typeof designOrName === "object") {
    designName = designOrName.designName || designName;
    housingType = designOrName.housingType || housingType;
    isModified = Boolean(designOrName.isModifiedFloorplan);
    modifiedM2 = designOrName.modifiedDesignM2;
  } else if (typeof designOrName === "string") {
    designName = designOrName;
  }

  const isDbl =
    isDoubleStorey ||
    housingType === "Double Storey" ||
    housingType === "Split Level" ||
    (typeof designOrName === "object" && (designOrName as any).customSpec?.storeys === "double");

  // Determine effective GFA: ALWAYS prioritize passed gfaM2
  let effectiveGfa = gfaM2 && gfaM2 > 0 ? gfaM2 : undefined;
  if (!effectiveGfa) {
    if (designOrName && typeof designOrName === "object") {
      if (designOrName.designM2) {
        effectiveGfa = isDbl ? Math.round(designOrName.designM2 * 0.55) : designOrName.designM2;
      } else {
        effectiveGfa = isDbl ? 280 : 200;
      }
    } else {
      effectiveGfa = isDbl ? 280 : 200;
    }
  }

  const breakdown = calculateTailoredBushfireCost({
    bal,
    designName,
    housingType,
    gfaM2: effectiveGfa,
    isDoubleStorey: isDbl,
    isModifiedPlan: isModified,
    modifiedM2,
  });

  return breakdown.totalCost;
}
