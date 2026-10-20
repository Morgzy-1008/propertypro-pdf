import { HUDSON_FLOORPLANS, type FloorplanRecord } from "./floorplans.data";

/** "Wisteria 24- MK2 - SD Single Story" / "Wisteria 24A" -> "wisteria 24" */
const DESIGN_ALIASES: Record<string, string> = {
  // The QLD price list spells the duplex range "Cayene"; the website uses "Cayenne".
  cayene: "cayenne",
};

export function planKey(name: string): string {
  const m = /^\s*([a-z]+)[^0-9]*(\d+)/i.exec(name.replace(/[^a-z0-9 ]+/gi, " "));
  if (!m) return name.trim().toLowerCase();
  const family = m[1].toLowerCase();
  return `${DESIGN_ALIASES[family] ?? family} ${m[2]}`;
}

export const SPECIAL_LOCAL_FLOORPLANS: Record<string, string> = {
  "alabaster 31": "/floorplans/ALABASTER 31_ CLASSIC_BROCHURE_19.09.2025.png",
  "alabaster 36": "/floorplans/ALABASTER 36_ CLASSIC_BROCHURE_19.09.2025.png",
  "alabaster 40": "/floorplans/ALABASTER 40_ CLASSIC_BROCHURE_19.09.2025.png",
  "burgundy 27": "/floorplans/BURGUNDY 27_CLASSIC_RH_01.06.2020.png",
  "burgundy 30": "/floorplans/BURGUNDY 30_CLASSIC_RH_01.06.2020.png",
  "burgundy 32": "/floorplans/BURGUNDY 32_CLASSIC_RH_01.06.2020.png",
  "burgundy 34": "/floorplans/BURGUNDY 34_CLASSIC_RH_01.06.2020.png",
  "carolina 22": "/floorplans/CAROLINA 22_CLASSIC_RH_02.03.2023.png",
  "carolina 24": "/floorplans/CAROLINA 24_CLASSIC_RH_02.03.2023.png",
  "carolina 26": "/floorplans/CAROLINA 26_CLASSIC_RH_15.05.2023.png",
  "carolina 29": "/floorplans/CAROLINA 29_CLASSIC_RH_15.05.2023.png",
  "cayenne 42": "/floorplans/CAYENNE 42_CLASSIC_BROCHURE_02.05.25.png",
  "cayenne 47": "/floorplans/CAYENNE 47_CLASSIC_BROCHURE_02.05.25.png",
    "eton 15": "/floorplans/ETON 15.png",
  "eton 17": "/floorplans/ETON 17.png",
  "ebony 29": "/floorplans/EBONY 29_CLASSIC_BROCHURE_RH_17.01.18.png",
  "lime 19": "/floorplans/LIME 19_CLASSIC_RH_02.05.2023.png",
  "lime 21": "/floorplans/LIME 21_CLASSIC_RH_02.05.2023.png",
  "lime 23": "/floorplans/LIME 23_CLASSIC_RH_02.05.2023.png",
  "lime 25": "/floorplans/LIME 25_CLASSIC_RH_02.05.2023.png",
  "magnolia 34": "/floorplans/MAGNOLIA 34_ CLASSIC_BROCHURE_17.04.2026.png",
  "magnolia 37": "/floorplans/MAGNOLIA 37_ CLASSIC_BROCHURE_05.05.2026.png",
  "magnolia 43": "/floorplans/MAGNOLIA 43_ CLASSIC_BROCHURE_20.12.24.png",
  "magnolia 45": "/floorplans/MAGNOLIA 45_ CLASSIC_BROCHURE_20.12.24.png",
  "mahogany 38": "/floorplans/MAHOGANY 38_CLASSIC_RH_12.04.18.png",
  "mahogany 43": "/floorplans/MAHOGANY 43_CLASSIC_RH_01.05.24.png",
  "mahogany 48": "/floorplans/MAHOGANY 48_CLASSIC_RH_11.02.20.png",
  "maize 33": "/floorplans/MAIZE 33_ CLASSIC_BROCHURE_10.11.25.png",
  "maize 36": "/floorplans/MAIZE 36_ CLASSIC_BROCHURE_10.11.25.png",
  "maize 40": "/floorplans/MAIZE 40_ CLASSIC_BROCHURE_10.11.25.png",
  "maize 43": "/floorplans/MAIZE 43_ CLASSIC_BROCHURE_10.11.25.png",
  "maize 47": "/floorplans/MAIZE 47_CLASSIC_BROCHURE_10.11.25.png",
  "marigold 26": "/floorplans/MARIGOLD 26_CLASSIC_LH_15.05.20.png",
  "marigold 28": "/floorplans/MARIGOLD 28_CLASSIC_LH_13.05.20.png",
  "marigold 31": "/floorplans/MARIGOLD 31_CLASSIC_LH_13.05.20.png",
  "marigold 35": "/floorplans/MARIGOLD 35_CLASSIC_LH_24.05.21.png",
  "mint 17": "/floorplans/MINT 17_CLASSIC_RH_02.05.2023.png",
  "mint 19": "/floorplans/MINT 19_CLASSIC_RH_02.05.2023.png",
  "mint 21": "/floorplans/MINT 21_CLASSIC_RH_02.05.2023.png",
  "mint 24": "/floorplans/MINT 24_CLASSIC_RH_02.05.2023.png",
  "mocha 24": "/floorplans/MOCHA 24_CLASSIC_DETACHED GARAGE.png",
  "mocha 25": "/floorplans/MOCHA 25_CLASSIC_13.09.19.png",
  "mocha 28": "/floorplans/MOCHA 28_CLASSIC_10.11.21.png",
  "mocha 31": "/floorplans/MOCHA 31_CLASSIC_13.12.19.png",
  "mocha 35": "/floorplans/MOCHA 35_CLASSIC_24.05.21.png",
  "mulberry 22": "/floorplans/MULBERRY 22_CLASSIC RH_BROCHURE_11.04.18.png",
  "mulberry 25": "/floorplans/MULBERRY 25_CLASSIC RH_BROCHURE_06.06.19.png",
  "mulberry 28": "/floorplans/MULBERRY 28_CLASSIC RH_BROCHURE_11.04.18.png",
  "mulberry 33": "/floorplans/MULBERRY 33_CLASSIC RH_BROCHURE_11.04.18.png",
  "mulberry 39": "/floorplans/MULBERRY 39_CLASSIC RH_BROCHURE_21.10.21.png",
  "orchid 23": "/floorplans/ORCHID 23_CLASSIC_RH_BROCHURE_07.11.2022.png",
  "orchid 25": "/floorplans/ORCHID 25_CLASSIC_RH_BROCHURE_13.05.2020.png",
  "orchid 29": "/floorplans/ORCHID 29_CLASSIC_RH_BROCHURE_13.05.2020.png",
  "orchid 34": "/floorplans/ORCHID 34_CLASSIC_RH_BROCHURE_13.05.2020.png",
  "quartz 21": "/floorplans/QUARTZ 21_CLASSIC RH_BROCHURE_26.07.19.png",
  "quartz 23": "/floorplans/QUARTZ 23_CLASSIC RH_BROCHURE_28.03.19.png",
  "quartz 25": "/floorplans/QUARTZ 25_CLASSIC RH_BROCHURE_28.03.19.png",
  "quartz 27": "/floorplans/QUARTZ 27_CLASSIC RH_BROCHURE_17.04.26.png",
  "raven 45": "/floorplans/RAVEN 45_CLASSIC_BROCHURE_27.05.25.png",
  "teal 29": "/floorplans/TEAL 29_ CLASSIC_BROCHURE_08.12.2025.png",
  "teal 33": "/floorplans/TEAL 33_ CLASSIC_BROCHURE_05.06.2026.png",
  "wisteria 22": "/floorplans/WISTERIA 22_CLASSIC_BROCHURE_RH_03.03.2022.png",
  "wisteria 32": "/floorplans/WISTERIA 32_CLASSIC_BROCHURE_31.07.2025.png",
};

export function resolveLocalFloorplanUrl(name: string, fallbackUrl?: string): string {
  const lower = (name || "").trim().toLowerCase();
  if (lower.includes("mauve") && (lower.includes("james") || lower.includes("custom") || lower.includes("modified"))) {
    return "/floorplans/MAUVE 35 CUSTOM JAMES.png";
  }
  const key = planKey(name);
  if (SPECIAL_LOCAL_FLOORPLANS[key]) return SPECIAL_LOCAL_FLOORPLANS[key];
  if (fallbackUrl && fallbackUrl.startsWith("/floorplans/")) return fallbackUrl;
  return `/floorplans/${key.toUpperCase()}.png`;
}

const BY_KEY = new Map<string, FloorplanRecord[]>();
const BY_DESIGN = new Map<string, FloorplanRecord[]>();
for (const rawPlan of HUDSON_FLOORPLANS) {
  const key = planKey(rawPlan.label);
  const localUrl = SPECIAL_LOCAL_FLOORPLANS[key] || (rawPlan.url.startsWith("/floorplans/") ? rawPlan.url : `/floorplans/${key.toUpperCase()}.png`);
  const plan: FloorplanRecord = { ...rawPlan, url: localUrl };
  if (!BY_KEY.has(key)) BY_KEY.set(key, []);
  if (!BY_KEY.get(key)!.some((p) => p.url === plan.url)) BY_KEY.get(key)!.push(plan);

  const design = plan.design.toLowerCase();
  if (!BY_DESIGN.has(design)) BY_DESIGN.set(design, []);
  if (!BY_DESIGN.get(design)!.some((p) => p.label === plan.label && p.url === plan.url))
    BY_DESIGN.get(design)!.push(plan);
}

/** Every drawing published for a price-list design (A / B variants included). */
export function plansForDesign(priceListName: string): FloorplanRecord[] {
  return BY_KEY.get(planKey(priceListName)) ?? [];
}

/** The other sizes offered in the same design family, e.g. Amber 21 / 23 / 26. */
export function otherSizesForDesign(priceListName: string) {
  const plans = plansForDesign(priceListName);
  if (!plans.length) return [];
  const family = BY_DESIGN.get(plans[0].design.toLowerCase()) ?? [];
  const seen = new Set<string>();
  return family
    .filter((p) => {
      const k = planKey(p.label);
      if (k === planKey(priceListName) || seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => Number(a.size) - Number(b.size))
    .map((p) => ({ label: p.label.replace(/\s*\([^)]*\)/g, "").replace(/[AB]$/, "").trim(), size: `${p.size} m²` }));
}
