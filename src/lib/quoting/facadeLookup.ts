import { HUDSON_FACADES } from "../../components/flyer/facades.data";
import { PRE_RENDERED_FACADES } from "../../components/flyer/preRenderedFacades.data";
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

function resolveWithPreRendered(item: FacadeItem | undefined): FacadeItem | undefined {
  if (!item) return undefined;
  const pre = PRE_RENDERED_FACADES[item.id];
  if (pre) {
    return { ...item, url: pre };
  }
  return item;
}

/**
 * Finds the exact matching facade item for a given design and housing type.
 * Strictly differentiates Double Storey from Single Storey / Split Level / Dual Living.
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

  // DOUBLE STOREY RESOLUTION
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
      aspen: "aspen",
      breeze: "breeze",
      centro: "centro",
      como: "como",
      delta: "delta",
      deluxe: "deluxe",
      flair: "flair",
      grande: "grande",
      hamptons: "hamptons",
      madison: "madison",
      marina: "marina",
      meridian: "meridian",
      monash: "monash",
      mondo: "mondo",
      novare: "novare",
      nuvo: "nuvo",
      regal: "regal",
      royale: "royale",
      saville: "saville",
      sierra: "sierra",
      soho: "soho",
      statesman: "statesman",
      tempo: "tempo",
      vista: "vista",
      vogue: "vogue",
    };

    if (doubleIdMap[baseKey]) {
      const found = HUDSON_FACADES.find((f) => f.id === doubleIdMap[baseKey]);
      if (found) return resolveWithPreRendered(found);
    }

    // Exact ID check for double storey range
    const exactIdMatch = HUDSON_FACADES.find(
      (f) => f.id.toLowerCase() === rawKey && (f.range === "Double Storey" || f.tags.includes("double"))
    );
    if (exactIdMatch) return resolveWithPreRendered(exactIdMatch);

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

    if (match) return resolveWithPreRendered(match);
  } else {
    // SINGLE STOREY / SPLIT LEVEL / DUAL LIVING RESOLUTION
    const singleIdMap: Record<string, string> = {
      classic: "classic",
      classicplus: "classic-plus",
      deco: "deco-single-garage",
      mantra: "mantra-single-garage",
      contemporary: "contemporary-single-garage",
      majestic: "majestic-single-garage",
      riviera: "riviera-single-garage",
      chateaux: "chateaux",
      aspen: "aspen-single-garage",
      avalon: "avalon",
      avoca: "avoca",
      banksia: "banksia",
      bayside: "bayside",
      breeze: "breeze-single-garage",
      coastal: "coastal",
      crest: "crest",
      eden: "eden",
      elite: "elite",
      executive: "executive",
      flair: "flair",
      harmony: "harmony",
      havana: "havana",
      imperial: "imperial",
      pavillion: "pavillion",
      savoy: "savoy",
      serenity: "serenity",
      sovereign: "sovereign",
      statesman: "statesman-single-garage",
      hamptons: housingType.toLowerCase().includes("split") ? "hamptons-split" : "hamptons-single",
    };

    if (singleIdMap[baseKey]) {
      const found = HUDSON_FACADES.find((f) => f.id === singleIdMap[baseKey]);
      if (found) return resolveWithPreRendered(found);
    }

    // Exact ID check for single storey range
    const exactIdMatch = HUDSON_FACADES.find(
      (f) => f.id.toLowerCase() === rawKey && f.range !== "Double Storey"
    );
    if (exactIdMatch) return resolveWithPreRendered(exactIdMatch);

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

    if (match) return resolveWithPreRendered(match);
  }

  // Fallback to any matching name
  const fallback = HUDSON_FACADES.find(
    (f) => normalizeFacadeKey(f.name) === baseKey || normalizeFacadeKey(f.id) === baseKey
  ) || HUDSON_FACADES[0];

  return resolveWithPreRendered(fallback);
}
