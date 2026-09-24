/**
 * NHC Feature Learning Registry & Persistent Memory System
 * 
 * Never guesses new features or NHC slang. Prompts the estimator to confirm
 * uncatalogued items, then remembers the definition and price for all future estimates.
 */

import type { CatalogueCategory } from "./quoteTypes";

export interface LearnedFeatureDefinition {
  id: string;
  triggerPhrase: string; // e.g. "OPT NICHE", "DROP CEILING", "SW18.24 OBP"
  canonicalName: string;
  category: CatalogueCategory;
  defaultUnitPrice: number;
  description: string;
  learnedAt: string;
  confirmedBy?: string;
  timesUsed: number;
}

export interface UnconfirmedFeatureCandidate {
  rawSnippet: string;
  triggerPhrase: string;
  locationHint?: string;
  suggestedCategory?: CatalogueCategory;
  suggestedPrice?: number;
}

const STORAGE_KEY = "hudson_nhc_feature_memory";

/**
 * Baseline pre-learned NHC tags and abbreviations.
 */
const SEED_LEARNED_FEATURES: LearnedFeatureDefinition[] = [
  {
    id: "seed_shower_niche",
    triggerPhrase: "opt niche",
    canonicalName: "Tiled Shower Wall Niche (300mm × 600mm)",
    category: "internal_bathroom",
    defaultUnitPrice: 380,
    description: "Recessed tiled shampoo shelf niche built into shower stud wall framing.",
    learnedAt: "2026-09-01T00:00:00.000Z",
    timesUsed: 12,
  },
  {
    id: "seed_drop_ceiling",
    triggerPhrase: "drop ceiling",
    canonicalName: "Bulkhead / Dropped Ceiling over Kitchen Island",
    category: "internal_kitchen",
    defaultUnitPrice: 650,
    description: "Architectural plasterboard bulkhead drop ceiling feature above kitchen island.",
    learnedAt: "2026-09-01T00:00:00.000Z",
    timesUsed: 8,
  },
  {
    id: "seed_gas_strut_servery",
    triggerPhrase: "gas strut",
    canonicalName: "Gas-Strut Awning Servery Window to Alfresco",
    category: "doors_windows",
    defaultUnitPrice: 1450,
    description: "Top-hinged hydraulic gas-strut awning servery window opening directly onto the alfresco bar.",
    learnedAt: "2026-09-01T00:00:00.000Z",
    timesUsed: 5,
  },
  {
    id: "seed_solar_skylight",
    triggerPhrase: "solar skylight",
    canonicalName: "Solar Operable Roof Skylight Package",
    category: "internal_general",
    defaultUnitPrice: 1850,
    description: "Velux or equivalent solar-powered opening roof skylight with rain sensor.",
    learnedAt: "2026-09-01T00:00:00.000Z",
    timesUsed: 4,
  },
];

let inMemoryFeatures: LearnedFeatureDefinition[] = [...SEED_LEARNED_FEATURES];

/**
 * Retrieves all learned features from persistent memory.
 */
export function getLearnedFeatures(): LearnedFeatureDefinition[] {
  if (typeof window === "undefined") {
    return inMemoryFeatures;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return inMemoryFeatures;
    const parsed: LearnedFeatureDefinition[] = JSON.parse(raw);
    
    // Merge seed features with user-learned features
    const map = new Map<string, LearnedFeatureDefinition>();
    for (const s of inMemoryFeatures) map.set(s.triggerPhrase.toLowerCase(), s);
    for (const p of parsed) map.set(p.triggerPhrase.toLowerCase(), p);
    inMemoryFeatures = Array.from(map.values());
    return inMemoryFeatures;
  } catch (err) {
    console.warn("[featureMemoryRegistry] Error loading features from storage:", err);
    return inMemoryFeatures;
  }
}

/**
 * Saves a newly confirmed feature into persistent memory so it is remembered forever.
 */
export function saveLearnedFeature(
  triggerPhrase: string,
  canonicalName: string,
  category: CatalogueCategory,
  defaultUnitPrice: number,
  description = "",
  confirmedBy = "Estimator"
): LearnedFeatureDefinition {
  const current = getLearnedFeatures();
  const cleanTrigger = triggerPhrase.toLowerCase().trim();

  const newDef: LearnedFeatureDefinition = {
    id: `learned_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    triggerPhrase: cleanTrigger,
    canonicalName: canonicalName.trim() || triggerPhrase,
    category,
    defaultUnitPrice: Math.max(0, defaultUnitPrice),
    description: description.trim() || `NHC custom markup '${triggerPhrase}' confirmed by ${confirmedBy}`,
    learnedAt: new Date().toISOString(),
    confirmedBy,
    timesUsed: 1,
  };

  const updated = current.filter((f) => f.triggerPhrase.toLowerCase() !== cleanTrigger);
  updated.push(newDef);
  inMemoryFeatures = updated;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.warn("[featureMemoryRegistry] Could not save to localStorage:", err);
    }
  }

  return newDef;
}

/**
 * Checks if a text snippet matches any previously learned feature.
 */
export function matchLearnedFeature(textSnippet: string): LearnedFeatureDefinition | null {
  if (!textSnippet) return null;
  const lower = textSnippet.toLowerCase();
  const features = getLearnedFeatures();

  for (const feat of features) {
    if (lower.includes(feat.triggerPhrase.toLowerCase())) {
      feat.timesUsed++;
      return feat;
    }
  }

  return null;
}

/**
 * Scans text for uncatalogued NHC annotations, slang, or 'OPT ...' tags
 * that need user confirmation rather than guessing.
 */
export function detectUnconfirmedFeatures(
  rawText: string,
  knownTriggerKeywords: string[] = []
): UnconfirmedFeatureCandidate[] {
  if (!rawText) return [];
  const candidates: UnconfirmedFeatureCandidate[] = [];
  const learned = getLearnedFeatures();
  const allKnownTriggers = [
    ...knownTriggerKeywords.map((k) => k.toLowerCase()),
    ...learned.map((l) => l.triggerPhrase.toLowerCase()),
    "stacker",
    "wir",
    "ensuite",
    "roller door",
    "ext 1020",
    "ext 1200",
    "double vanity",
    "2740",
    "waterfall",
  ];

  // Look for "OPT [PHRASE]" or "ADDITIONAL [PHRASE]" or "PROVIDE [PHRASE]"
  const pattern = /\b(?:OPT|OPTION|OPTIONAL|ADDITIONAL|EXTRA|PROVIDE)\s+([A-Z0-9\/\s\-]{3,25})\b/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(rawText)) !== null) {
    const phrase = match[0].trim();
    const specificTerm = match[1].toLowerCase().trim();

    // Check if already covered by known system rules
    const isKnown = allKnownTriggers.some(
      (k) => specificTerm.includes(k) || k.includes(specificTerm)
    );

    if (!isKnown && specificTerm.length > 2) {
      // Avoid duplicate candidates
      if (!candidates.some((c) => c.triggerPhrase.toLowerCase() === phrase.toLowerCase())) {
        candidates.push({
          rawSnippet: match[0],
          triggerPhrase: phrase,
          suggestedCategory: /bath|shower|vanity|ens|wc|toilet/i.test(specificTerm)
            ? "internal_bathroom"
            : /kitchen|island|cooktop|pantry/i.test(specificTerm)
            ? "internal_kitchen"
            : /door|window|slider|glazing/i.test(specificTerm)
            ? "doors_windows"
            : "internal_general",
          suggestedPrice: 450,
        });
      }
    }
  }

  return candidates;
}
