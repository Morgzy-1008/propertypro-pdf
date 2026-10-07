/**
 * AS/NZS 2107 & QDC MP 4.4 / NSW SEPP Transport Noise Corridor Acoustic Costing Engine
 * 
 * Computes exact, design-tailored costs for Acoustic Attenuation requirements under Australian Standards:
 * - Reads exact window and door schedules from Hudson Master Architectural Plans (93+ master plans).
 * - Costs acoustic laminated glazing and acoustic double-glazing based on individual window aperture dimensions (height & width).
 * - Incorporates upper-storey scaffolding / working-at-height surcharges for double storeys.
 * - Costs perimeter acoustic seals and automatic drop-down door seals (Raven RP series or equivalent).
 * - Costs high-density acoustic insulation (ceilings, external walls, and double-storey mid-floor acoustic underlays).
 * - Costs sound-attenuated trickle fresh-air ventilation and mechanical ventilation systems under transport noise rules.
 * - Costs Form 15/16 / NSW Acoustic Engineering compliance certification.
 * - Handles modified floorplans dynamically as window schedules expand or custom openings are added.
 */

import {
  resolveDesignSchedule,
  getReadableWindowCode,
  getReadableDoorInfo,
  type MasterWindowItem,
  type MasterDoorItem,
} from "./bushfireEngine";
import type { QuoteDesignSelection } from "./quoteTypes";

export type AcousticTierLevel = "None" | "Category 1" | "Category 2" | "Category 3";

export interface AcousticItemCost {
  id: string;
  category: "glazing" | "doors" | "insulation" | "ventilation" | "certification";
  title: string;
  description: string;
  quantity: number;
  unit: string;
  unitRate: number;
  subtotal: number;
  details?: string;
}

export interface TailoredAcousticWindowItem extends MasterWindowItem {
  displayCode: string;
  glazingCost: number;
  glassAreaM2: number;
  description: string;
  isUpperStorey: boolean;
}

export interface TailoredAcousticDoorItem extends MasterDoorItem {
  displayCode: string;
  isSliding: boolean;
  sealCost: number;
  description: string;
}

export interface AcousticCostBreakdown {
  tier: AcousticTierLevel;
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
  insulationCost: number;
  ventilationCost: number;
  certificationCost: number;
  totalCost: number;
  items: AcousticItemCost[];
  windowItems: TailoredAcousticWindowItem[];
  doorItems: TailoredAcousticDoorItem[];
  statutorySummary: string[];
}

/**
 * Calculates the exact tailored cost of acoustic compliance for a specific design.
 */
export function calculateTailoredAcousticCost(options: {
  tier: AcousticTierLevel;
  designName?: string;
  housingType?: string;
  gfaM2?: number;
  isDoubleStorey?: boolean;
  isModifiedPlan?: boolean;
  modifiedM2?: number;
}): AcousticCostBreakdown {
  const {
    tier,
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

  // Return $0 for None, unselected, or legacy tiers
  const validTiers = ["Category 1", "Category 2", "Category 3"];
  if (!tier || tier === "None" || !validTiers.includes(tier)) {
    return {
      tier: "None",
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
      insulationCost: 0,
      ventilationCost: 0,
      certificationCost: 0,
      totalCost: 0,
      items: [],
      windowItems: [],
      doorItems: [],
      statutorySummary: [
        "Category None: Standard NCC/BCA acoustic insulation applies.",
        "No designated transport noise corridor overlay requirements.",
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

  const items: AcousticItemCost[] = [];

  // 2. COST WINDOW GLAZING UNDER AS/NZS 2107 & QDC MP 4.4
  let totalWinCost = 0;
  let totalWinAreaM2 = 0;

  // Base per-window acoustic glazing rates by Category
  // Cat 1: 6.38mm VLam / ComfortPlus acoustic laminated glass with perimeter acoustic silicone seals (Rw ~33)
  // Cat 2: 10.38mm Heavy Acoustic laminated or acoustic IGU (Rw ~36-38)
  // Cat 3: High-performance Acoustic Double Glazing 10.38Lam / 12Ar / 6.38Lam (Rw >= 41)
  const windowBaseRate = tier === "Category 3" ? 220 : tier === "Category 2" ? 140 : 90;
  const glassM2Rate = tier === "Category 3" ? 550 : tier === "Category 2" ? 280 : 140;
  const scaffoldPerUpperWindow = tier === "Category 3" ? 65 : tier === "Category 2" ? 45 : 35;

  const detailedWindows: TailoredAcousticWindowItem[] = windows.map((w, idx) => {
    const wM = (w.widthMm || 1810) / 1000;
    const hM = (w.heightMm || 1200) / 1000;
    const area = Math.round(wM * hM * 100) / 100;
    totalWinAreaM2 += area;

    const isUpper = isDoubleStorey && idx >= Math.floor(windows.length / 2);
    const upperSurcharge = isUpper ? scaffoldPerUpperWindow : 0;

    const unitTotal = Math.round(windowBaseRate + area * glassM2Rate + upperSurcharge);
    totalWinCost += unitTotal;

    const displayCode = getReadableWindowCode(w.code, w.heightMm, w.widthMm);
    const desc = `${displayCode} (${w.heightMm}h × ${w.widthMm}w, ${area}m²) — ${
      tier === "Category 3"
        ? "Rw 42+ Acoustic Double Glazed Unit (10.38Lam/12/6.38Lam) & Heavy Frames"
        : tier === "Category 2"
        ? "10.38mm Acoustic Laminated Glazing (Rw 36) & High-Density Seals"
        : "6.38mm Acoustic Laminated Safety Glass (Rw 33) & Perimeter Bedding"
    }${isUpper ? " (Upper Storey)" : ""}`;

    return {
      ...w,
      displayCode,
      glazingCost: unitTotal,
      glassAreaM2: area,
      description: desc,
      isUpperStorey: isUpper,
    };
  });

  items.push({
    id: "ac_glazing_package",
    category: "glazing",
    title: `${tier} Acoustic Glazing Package (${windows.length} Windows, ${totalWinAreaM2.toFixed(1)}m² Glass)`,
    description:
      tier === "Category 3"
        ? "Acoustic Double Glazed assemblies (10.38mm laminated / 12mm argon / 6.38mm toughened) achieving Rw + Ctr ≥ 40 dB with heavy architectural acoustic sub-frames."
        : tier === "Category 2"
        ? "Thickened 10.38mm acoustic laminated glass (Rw ≥ 36 dB) with heavy aluminium frames, acoustic mohair pile, and perimeter acoustic wet-sealing."
        : "Upgraded 6.38mm acoustic laminated safety glazing (Rw ≥ 33 dB) with continuous acoustic bedding seals across all openable and fixed sashes.",
    quantity: windows.length,
    unit: "windows",
    unitRate: Math.round(totalWinCost / Math.max(1, windows.length)),
    subtotal: totalWinCost,
    details: `${windows.length} glazed apertures with ${totalWinAreaM2.toFixed(1)}m² certified acoustic glass${
      isDoubleStorey ? " (including upper storey installation access)" : ""
    }.`,
  });

  // 3. COST EXTERIOR DOORS & SLIDING SEALS
  let totalDoorCost = 0;
  let slidingDoorCount = 0;

  const doorSealRate = tier === "Category 3" ? 520 : tier === "Category 2" ? 260 : 120;
  const slidingMultiplier = tier === "Category 3" ? 1.6 : tier === "Category 2" ? 1.4 : 1.25;

  const detailedDoors: TailoredAcousticDoorItem[] = doors.map((d) => {
    const info = getReadableDoorInfo(d.code, d.heightMm, d.widthMm);
    if (info.isSliding) slidingDoorCount++;

    const unitCost = Math.round(doorSealRate * (info.isSliding ? slidingMultiplier : 1.0));
    totalDoorCost += unitCost;

    const desc = `${info.displayCode} (${info.displayType}) — ${
      tier === "Category 3"
        ? info.isSliding
          ? "Heavy acoustic sliding door with multi-point interlock & acoustic wool-pile seals"
          : "Solid-core 40mm acoustic door with automatic bottom drop seal (Raven RP38) & perimeter compression seals"
        : tier === "Category 2"
        ? info.isSliding
          ? "Acoustic sliding door interlock seals & bottom baffle brush"
          : "Solid-core door upgrade with Raven automatic bottom drop seal & acoustic perimeter bulb seals"
        : info.isSliding
        ? "Perimeter acoustic weather-strips and interlocking brush seals"
        : "Acoustic perimeter bulb seals and heavy bottom draft-stop excluder"
    }`;

    return {
      ...d,
      displayCode: info.displayCode,
      isSliding: info.isSliding,
      sealCost: unitCost,
      description: desc,
    };
  });

  items.push({
    id: "ac_doors_package",
    category: "doors",
    title: `Acoustic Door Seals & Sound-Rated Entries (${doors.length} External Openings)`,
    description:
      tier === "Category 3"
        ? "Solid-core 40mm doors with perimeter compression seals, heavy multi-point locks, and automatic drop seals (Rw ≥ 35 dB) + heavy sliding seals."
        : tier === "Category 2"
        ? "Heavy solid-core doors with automatic bottom drop seals (Raven RP series) & acoustic perimeter draft seals."
        : "High-density silicone bulb seals and heavy bottom threshold seals to all external hinged and sliding doors.",
    quantity: doors.length,
    unit: "doors",
    unitRate: Math.round(totalDoorCost / Math.max(1, doors.length)),
    subtotal: totalDoorCost,
    details: `${doors.length - slidingDoorCount} hinged external doors + ${slidingDoorCount} sliding door suites sealed.`,
  });

  // 4. CEILING & WALL ACOUSTIC INSULATION
  // Envelope insulation scaled to GFA & double-storey midfloor
  let insulationRatePerM2 = 4.5;
  if (tier === "Category 2") insulationRatePerM2 = 9.5;
  if (tier === "Category 3") insulationRatePerM2 = 18.0;

  let baseInsulationCost = Math.round(effectiveGfa * insulationRatePerM2);
  const midFloorAcousticCost = isDoubleStorey
    ? tier === "Category 3"
      ? 4200
      : tier === "Category 2"
      ? 2400
      : 1600
    : 0;

  const totalInsulationCost = baseInsulationCost + midFloorAcousticCost;

  items.push({
    id: "ac_insulation_package",
    category: "insulation",
    title: `Acoustic Insulation Batts & Envelope Soundproofing (${Math.round(effectiveGfa)}m²)`,
    description:
      tier === "Category 3"
        ? "High-density acoustic sound batts (R2.7 HD external walls, R3.5 HD ceilings) with resilient acoustic furring mounts and high-density plasterboard dampening."
        : tier === "Category 2"
        ? "High-density sound insulation (R2.5 HD walls, R3.0 HD ceilings) minimizing external road noise ingress."
        : "Upgraded R2.5 High-Density acoustic ceiling insulation batts across the roof envelope.",
    quantity: Math.round(effectiveGfa),
    unit: "m²",
    unitRate: Math.round((totalInsulationCost / Math.max(1, effectiveGfa)) * 10) / 10,
    subtotal: totalInsulationCost,
    details: `${Math.round(effectiveGfa)}m² envelope insulation${
      isDoubleStorey ? " + upper storey acoustic particleboard underlay & mid-floor sound batts" : ""
    }.`,
  });

  // 5. MECHANICAL VENTILATION / ACOUSTIC FRESH AIR ATTENUATION
  // In noise corridors, windows cannot be opened for natural cooling at night (AS/NZS 2107)
  const approxBeds = isDoubleStorey ? 5 : 4;
  let ventilationCost = 0;

  if (tier === "Category 1") {
    ventilationCost = 0; // Standard NCC natural trickle
  } else if (tier === "Category 2") {
    // Sound-attenuated trickle fresh-air vents to bedrooms ($220/bedroom)
    ventilationCost = approxBeds * 220;
    items.push({
      id: "ac_ventilation_package",
      category: "ventilation",
      title: `Sound-Attenuated Trickle Fresh-Air Vents (${approxBeds} Bedrooms)`,
      description: "Acoustically baffled trickle wall vents allowing code-required fresh air changes without compromising sound isolation.",
      quantity: approxBeds,
      unit: "vents",
      unitRate: 220,
      subtotal: ventilationCost,
      details: `Supplied and installed to ${approxBeds} habitable bedrooms.`,
    });
  } else if (tier === "Category 3") {
    // Mechanical fresh air supply system with inline acoustic silencers & sound-dampened ducting
    ventilationCost = 3200 + approxBeds * 300;
    items.push({
      id: "ac_ventilation_package",
      category: "ventilation",
      title: `Acoustic Mechanical Fresh Air System (${approxBeds} Habitable Zones)`,
      description: "Ducted mechanical fresh air ventilation system with inline acoustic attenuator silencers, high-density insulated ductwork, and ultra-quiet centrifugal fan.",
      quantity: 1,
      unit: "system",
      unitRate: ventilationCost,
      subtotal: ventilationCost,
      details: `Complete sound-isolated ventilation serving ${approxBeds} bedrooms and living areas.`,
    });
  }

  // 6. STATUTORY ACOUSTIC ENGINEERING COMPLIANCE CERTIFICATION
  const certificationCost = tier === "Category 3" ? 750 : tier === "Category 2" ? 500 : 350;

  items.push({
    id: "ac_certification",
    category: "certification",
    title: `Statutory Acoustic Engineering Certification (Form 15/16)`,
    description: "Inspection, acoustic glazing compliance verification, and statutory Form 15/16 sign-off by an accredited acoustic consultant.",
    quantity: 1,
    unit: "cert",
    unitRate: certificationCost,
    subtotal: certificationCost,
    details: "Certified for local council planning approval & building certifier sign-off.",
  });

  const totalCalculated =
    totalWinCost +
    totalDoorCost +
    totalInsulationCost +
    ventilationCost +
    certificationCost;

  // Round to nearest $50 for neat professional quotation
  const roundedTotal = Math.round(totalCalculated / 50) * 50;

  const statutorySummary = [
    `AS/NZS 2107 & QDC MP 4.4 ${tier} Requirements for "${designName}" (${Math.round(effectiveGfa)}m²):`,
    `• Windows: ${windows.length} certified acoustic windows (${totalWinAreaM2.toFixed(1)}m² glass) with acoustic seals & glazing upgrade.`,
    `• Doors: ${doors.length} external openings sealed with automatic bottom drop seals and perimeter acoustic gaskets.`,
    `• Envelope: ${Math.round(effectiveGfa)}m² high-density acoustic insulation${isDoubleStorey ? " + double-storey acoustic floor underlay" : ""}.`,
    ...(ventilationCost > 0
      ? [`• Ventilation: Sound-attenuated fresh air ventilation system for ${approxBeds} bedrooms.`]
      : []),
    `• Statutory Form 15/16 Acoustic Engineering Certification included.`,
  ];

  return {
    tier,
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
    insulationCost: totalInsulationCost,
    ventilationCost,
    certificationCost,
    totalCost: roundedTotal,
    items,
    windowItems: detailedWindows,
    doorItems: detailedDoors,
    statutorySummary,
  };
}

/**
 * Drop-in replacement for getAcousticCost backward compatibility:
 * Accepts (tier, isDouble, design, gfaM2)
 */
export function getAcousticCost(
  tier: AcousticTierLevel,
  isDoubleStorey: boolean = false,
  designOrName?: QuoteDesignSelection | string,
  gfaM2?: number
): number {
  const validTiers = ["Category 1", "Category 2", "Category 3"];
  if (!tier || tier === "None" || !validTiers.includes(tier)) return 0;

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

  const breakdown = calculateTailoredAcousticCost({
    tier,
    designName,
    housingType,
    gfaM2: effectiveGfa,
    isDoubleStorey: isDbl,
    isModifiedPlan: isModified,
    modifiedM2,
  });

  return breakdown.totalCost;
}
