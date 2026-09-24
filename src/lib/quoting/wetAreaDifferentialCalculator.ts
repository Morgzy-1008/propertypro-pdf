/**
 * Wet Area vs Dry Area Differential Costing Engine
 * 
 * Rules:
 * 1. Internal dry-room shifts (e.g. Bed 2 expands into Bed 3 by 200mm with zero external change)
 *    are reported as $0.00 Internal Layout Variations.
 * 2. Wet-area expansions (Bathroom, Ensuite, Powder, Laundry extending into dry living/bedroom)
 *    are charged at the wet-area premium rate ($2,350/m²).
 * 3. External footprint expansions are charged at standard Databuild recipe rates.
 */

export const DATABUILD_RECIPE_RATES = {
  living_ss_m2: 1480,
  living_ds_ground_m2: 1520,
  living_ds_upper_m2: 1650,
  alfresco_m2: 920,
  garage_m2: 1150,
  wet_area_m2: 2350,
  porch_m2: 850,
  structural_beam_ds: 1850,
  ceiling_2590_living_m2: 24,
  ceiling_2740_living_m2: 46,
};
import type { DetectedAreaDelta } from "./quoteTypes";

export interface ZoneBoundaryShift {
  sourceZone: "bedroom" | "living" | "hallway" | "storage";
  targetZone: "bedroom" | "living" | "ensuite" | "bathroom" | "powder" | "laundry";
  deltaM2: number;
  linearShiftM?: number;
  reason: string;
}

export interface ZoneCostingResult {
  isBillable: boolean;
  unitRate: number;
  subtotal: number;
  itemTitle: string;
  category: "wet_area" | "internal_layout_zero_cost" | "footprint_extension";
  tenderDescription: string;
}

/**
 * Evaluates the cost impact of an internal or zone boundary shift.
 */
export function evaluateZoneBoundaryShift(shift: ZoneBoundaryShift): ZoneCostingResult {
  const isTargetWet = ["ensuite", "bathroom", "powder", "laundry"].includes(shift.targetZone);
  const isSourceWet = ["ensuite", "bathroom", "powder", "laundry"].includes(shift.sourceZone);

  // Case 1: Dry room into dry room (e.g. Bed 2 expands into Bed 3)
  if (!isTargetWet && !isSourceWet) {
    return {
      isBillable: false,
      unitRate: 0,
      subtotal: 0,
      category: "internal_layout_zero_cost",
      itemTitle: `Internal Layout Adjustment: ${capitalize(shift.targetZone)} enlarged from ${capitalize(shift.sourceZone)}`,
      tenderDescription: `Internal non-structural wall relocation between ${shift.targetZone} and ${shift.sourceZone} (${shift.deltaM2} m² shifted). Zero tender cost impact ($0.00).`,
    };
  }

  // Case 2: Wet area expands into dry area (e.g. Ensuite expands into Bedroom)
  if (isTargetWet && !isSourceWet) {
    // Wet area requires waterproofing membrane, screed bed, tiling, and extended plumbing rough-in.
    // Differential rate between wet area ($2,350) and dry living ($1,480) is $870/m² (or full wet rate if extending envelope).
    const differentialRate = Math.round(DATABUILD_RECIPE_RATES.wet_area_m2 - DATABUILD_RECIPE_RATES.living_ss_m2);
    const subtotal = Math.round(shift.deltaM2 * differentialRate);

    return {
      isBillable: true,
      unitRate: differentialRate,
      subtotal,
      category: "wet_area",
      itemTitle: `Wet Area Expansion: ${capitalize(shift.targetZone)} extended into ${capitalize(shift.sourceZone)}`,
      tenderDescription: `Extension of ${shift.targetZone} wet area footprint (+${shift.deltaM2} m²) into adjoining ${shift.sourceZone}. Incurring waterproofing, screed fall-to-waste, floor/wall tiling, and drainage rough-in at $${differentialRate}/m².`,
    };
  }

  // Case 3: Wet area reduces into dry area (e.g. Bathroom shrinks for larger bedroom)
  return {
    isBillable: false,
    unitRate: 0,
    subtotal: 0,
    category: "internal_layout_zero_cost",
    itemTitle: `Wet Area Layout Adjustment: ${capitalize(shift.targetZone)} modified`,
    tenderDescription: `Internal layout alteration involving ${shift.targetZone} with zero positive builder cost variation ($0.00).`,
  };
}

function capitalize(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
