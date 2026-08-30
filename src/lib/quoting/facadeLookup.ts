import { HUDSON_FACADES } from "../../components/flyer/facades.data";
import type { FacadeItem } from "../../components/flyer/facadeLibrary";

/**
 * Normalizes facade names to match base variations.
 * E.g., "Classic (Double Garage)" -> "classic", "Classic Plus (Double Storey)" -> "classicplus", "Hamptons" -> "hamptons".
 */
export function normalizeFacadeKey(nameOrId: string): string {
  if (!nameOrId) return "";
  return nameOrId
    .toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, "") // Strip parenthetical like "(Double Garage)", "(Single Garage)", "(Standard Included)"
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Finds the exact matching facade item for a given design and housing type.
 * Specifically distinguishes Double Storey vs Single Storey / Split / Dual Living.
 */
export function findFacadeForDesign(
  facadeNameOrId: string,
  isDouble: boolean,
  housingType: string = "Single Storey"
): FacadeItem | undefined {
  if (!facadeNameOrId) {
    facadeNameOrId = "Classic";
  }

  const rawKey = facadeNameOrId.trim().toLowerCase();
  const baseKey = normalizeFacadeKey(facadeNameOrId);

  // Exact ID check first
  const exactIdMatch = HUDSON_FACADES.find((f) => f.id.toLowerCase() === rawKey);
  if (exactIdMatch) {
    if (isDouble && exactIdMatch.range === "Double Storey") return exactIdMatch;
    if (!isDouble && exactIdMatch.range !== "Double Storey") return exactIdMatch;
  }

  // DOUBLE STOREY SPECIFIC RESOLUTION
  if (isDouble) {
    const doubleIdMap: Record<string, string> = {
      classic: "classic-double-garage",
      classicplus: "classic-plus-double-garage",
      deco: "deco-double-garage",
      mantra: "mantra-double-garage",
      contemporary: "contemporary",
      majestic: "majestic",
      riviera: "riviera",
      chateaux: "chateaux",
      cambridge: "cambridge",
      oxford: "oxford",
      windsor: "windsor",
      allure: "allure",
      ascot: "ascot",
      ashton: "ashton",
      centro: "centro",
      como: "como",
      delta: "delta",
      deluxe: "deluxe",
      flair: "flair",
      grande: "grande",
      madison: "madison",
      marina: "marina",
      meridian: "meridian",
      monash: "monash",
      mondo: "mondo",
      novare: "novare",
      royale: "royale",
      saville: "saville",
      sierra: "sierra",
      soho: "soho",
      tempo: "tempo",
      vista: "vista",
    };

    if (doubleIdMap[baseKey]) {
      const found = HUDSON_FACADES.find((f) => f.id === doubleIdMap[baseKey]);
      if (found) return found;
    }

    // Search Double Storey entries in HUDSON_FACADES
    const doubleCandidates = HUDSON_FACADES.filter(
      (f) => f.range === "Double Storey" || f.id.includes("double")
    );

    const match = doubleCandidates.find((f) => {
      const fBase = normalizeFacadeKey(f.name);
      const fIdBase = normalizeFacadeKey(f.id);
      return (
        fBase === baseKey ||
        fIdBase === baseKey ||
        f.name.toLowerCase().includes(baseKey) ||
        f.id.toLowerCase().includes(baseKey)
      );
    });

    if (match) return match;
  } else {
    // SINGLE STOREY / SPLIT LEVEL / DUAL OCCUPANCY RESOLUTION
    const singleIdMap: Record<string, string> = {
      classic: "classic",
      classicplus: "classic-plus",
      deco: "deco-single-garage",
      mantra: "mantra-single-garage",
      contemporary: "contemporary-single-garage",
      majestic: "majestic-single-garage",
      riviera: "riviera-single-garage",
      chateaux: "chateaux",
      aspen: "aspen",
      avoca: "avoca",
      banksia: "banksia",
      bayside: "bayside",
      breeze: "breeze",
      crest: "crest",
      eden: "eden",
      elite: "elite",
      executive: "executive",
      harmony: "harmony",
      havana: "havana",
      imperial: "imperial",
      pavillion: "pavillion",
      savoy: "savoy",
      serenity: "serenity",
      sovereign: "sovereign",
      statesman: "statesman",
      hamptons: housingType.toLowerCase().includes("split") ? "hamptons-split" : "hamptons-single",
    };

    if (singleIdMap[baseKey]) {
      const found = HUDSON_FACADES.find((f) => f.id === singleIdMap[baseKey]);
      if (found) return found;
    }

    // Search Non-Double Storey entries in HUDSON_FACADES
    const singleCandidates = HUDSON_FACADES.filter(
      (f) => f.range !== "Double Storey" && !f.id.includes("double-garage")
    );

    const match = singleCandidates.find((f) => {
      const fBase = normalizeFacadeKey(f.name);
      const fIdBase = normalizeFacadeKey(f.id);
      return (
        fBase === baseKey ||
        fIdBase === baseKey ||
        f.name.toLowerCase().includes(baseKey) ||
        f.id.toLowerCase().includes(baseKey)
      );
    });

    if (match) return match;
  }

  // Fallback to any matching name
  return (
    HUDSON_FACADES.find(
      (f) => normalizeFacadeKey(f.name) === baseKey || normalizeFacadeKey(f.id) === baseKey
    ) || HUDSON_FACADES[0]
  );
}
