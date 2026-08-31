import { HUDSON_FACADES } from "../../components/flyer/facades.data";
import { PRE_RENDERED_FACADES } from "../../components/flyer/preRenderedFacades.data";
import type { FacadeItem } from "../../components/flyer/facadeLibrary";

/**
 * Checks if a design model belongs to the Narrow Double Storey range:
 * - Carolinas (Carolina 24, 26, 28, 30, 32, etc.)
 * - Turquoise (Turquoise 27, 30, 33, etc.)
 * - Sabel / Sable (Sabel 25, 28, Sable 25, etc.)
 */
export function isNarrowDoubleStorey(designNameOrId?: string): boolean {
  if (!designNameOrId) return false;
  const lower = designNameOrId.toLowerCase();
  return (
    lower.includes("carolina") ||
    lower.includes("turquoise") ||
    lower.includes("sabel") ||
    lower.includes("sable")
  );
}

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
 * Strictly differentiates:
 * 1. Single Storey
 * 2. Narrow Double Storey (Carolinas, Turquoise, Sabel/Sable)
 * 3. Standard Double Storey (Burgundy, Jasper, Sapphire, Emerald, Diamond, Onyx, Ruby, Aston, Opal, Topaz, etc.)
 */
export function findFacadeForDesign(
  facadeNameOrId: string,
  isDouble: boolean,
  housingType: string = "Single Storey",
  designName?: string
): FacadeItem | undefined {
  if (!facadeNameOrId) {
    facadeNameOrId = "Classic";
  }

  const rawKey = facadeNameOrId.trim().toLowerCase();
  const baseKey = normalizeFacadeKey(facadeNameOrId);
  const isNarrowDouble = isDouble && isNarrowDoubleStorey(designName);

  // ACREAGE / RANCH / MULBERRY RESOLUTION
  const isMulberry = designName ? /^mulberry\b/i.test(designName) : false;
  const isAcreage = isMulberry || housingType === "Acreage" || housingType === "Acreage & Split Level" || housingType === "Ranch & Acreage" || /mulberry|ranch/i.test(rawKey);

  if (isAcreage) {
    const ranchIdMap: Record<string, string> = {
      classic: "classic-ranch",
      classicplus: "classic-plus-ranch",
      eden: "eden-ranch",
      hamptons: "hampton-ranch",
      hampton: "hampton-ranch",
      imperial: "imperial-ranch",
      metro: "metro-ranch",
      statesman: "statesman-ranch",
      urban: "urban-ranch",
      vogue: "vogue-ranch",
    };
    if (ranchIdMap[baseKey]) {
      const found = HUDSON_FACADES.find((f) => f.id === ranchIdMap[baseKey]);
      if (found) return resolveWithPreRendered(found);
    }
  }

  // SPLIT LEVEL RESOLUTION
  if (housingType === "Split Level" || housingType === "Split" || /cobalt|split/i.test(rawKey)) {
    const splitIdMap: Record<string, string> = {
      classic: "classic-cobalt",
      hamptons: "hamptons-cobalt",
      hampton: "hamptons-cobalt",
      infinity: "infinity-cobalt",
      vogue: "vogue-cobalt",
    };
    if (splitIdMap[baseKey]) {
      const found = HUDSON_FACADES.find((f) => f.id === splitIdMap[baseKey]);
      if (found) return resolveWithPreRendered(found);
    }
  }

  // DOUBLE STOREY RESOLUTION
  if (isDouble) {
    if (isNarrowDouble) {
      // === NARROW DOUBLE STOREY SPECIFIC (Carolinas, Turquoise, Sabel) ===
      const narrowDoubleIdMap: Record<string, string> = {
        classic: "classic-narrow-dg",
        classicplus: "classic-plus-double-garage",
        chateaux: "chateaux-narrow-dg",
        contemporary: "contemporary-narrow-dg",
        deco: "deco-narrow-dg",
        mantra: "mantra-double-garage",
        madison: "madison-narrow-dg",
        majestic: "majestic-narrow-dg",
        marina: "marina-narrow-dg",
        meridian: "meridian-narrow-dg",
        novare: "novare-narrow-dg",
        sierra: "sierra-narrow-dg",
        vista: "vista-narrow-dg",
      };

      if (narrowDoubleIdMap[baseKey]) {
        const found = HUDSON_FACADES.find((f) => f.id === narrowDoubleIdMap[baseKey]);
        if (found) return resolveWithPreRendered(found);
      }
    } else {
      // === STANDARD DOUBLE STOREY (Burgundy, Jasper, Sapphire, Emerald, Diamond, Onyx, Ruby, Aston, Opal, Topaz, etc.) ===
      const standardDoubleIdMap: Record<string, string> = {
        classic: "classic-double-garage",
        classicplus: "classic-plus-double-garage",
        deco: "deco-double-garage",
        mantra: "mantra-double-garage",
        madison: "madison",
        contemporary: "contemporary",
        majestic: "majestic",
        riviera: "riviera",
        chateaux: "chateaux",
        clarence: "clarence",
        cambridge: "cambridge",
        oxford: "oxford",
        reed: "reed",
        windsor: "windsor",
        allure: "allure",
        ascot: "ascot",
        ashton: "ashton",
        aspen: "aspen-double",
        breeze: "breeze-double",
        centro: "centro",
        como: "como",
        delta: "delta",
        deluxe: "deluxe",
        flair: "flair",
        grande: "grande",
        hamptons: "hamptons",
        marina: "marina",
        meridian: "meridian",
        metro: "metro",
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

      if (standardDoubleIdMap[baseKey]) {
        const found = HUDSON_FACADES.find((f) => f.id === standardDoubleIdMap[baseKey]);
        if (found) return resolveWithPreRendered(found);
      }
    }

    // Exact ID check for double storey range
    const exactIdMatch = HUDSON_FACADES.find(
      (f) => f.id.toLowerCase() === rawKey && (f.range === "Double Storey" || f.range === "Narrow Double Storey" || f.tags.includes("double"))
    );
    if (exactIdMatch) return resolveWithPreRendered(exactIdMatch);

    // Search Double Storey entries in HUDSON_FACADES
    const doubleCandidates = HUDSON_FACADES.filter(
      (f) => f.range === "Double Storey" || f.range === "Narrow Double Storey" || f.id.includes("double") || f.tags.includes("double")
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
      aspen: "aspen",
      avalon: "avalon",
      avoca: "avoca",
      banksia: "banksia",
      bayside: "bayside",
      breeze: "breeze",
      chateaux: "chateaux-single",
      coastal: "coastal",
      contemporary: "contemporary-single",
      crest: "crest",
      eden: "eden",
      elite: "elite-single",
      executive: "executive-single",
      hamptons: "hamptons-single",
      harmony: "harmony-single",
      havana: "havana-single",
      hillsdale: "hillsdale-single",
      imperial: "imperial-single",
      infinity: "infinity-single",
      majestic: "majestic-single",
      merlot: "merlot-single",
      newport: "newport-single",
      nuvo: "nuvo-single",
      pavillion: "pavillion-single",
      regal: "regal-single",
      riviera: "riviera-single",
      savoy: "savoy-single",
      serenity: "serenity-single",
      sovereign: "sovereign-single",
      statesman: "statesman-single",
      vibe: "vibe-single",
      vienna: "vienna-single",
      visage: "visage-single",
      vogue: "vogue-single",
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
      (f) => f.range !== "Double Storey" && !f.id.includes("double-garage") && !f.id.includes("narrow-dg")
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
  const fallback =
    HUDSON_FACADES.find(
      (f) => normalizeFacadeKey(f.name) === baseKey || normalizeFacadeKey(f.id) === baseKey
    ) || HUDSON_FACADES[0];

  return resolveWithPreRendered(fallback);
}
