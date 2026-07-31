/** Landscaping package pricing — taken from the "Landscape Packages" table at
 *  the bottom of each QLD price list.
 *
 *  The package INCLUDES the exposed aggregate driveway, so whenever it is added
 *  the separately itemised driveway cost is removed.
 */

export const LANDSCAPE_INCLUSIONS = [
  "Landscaping & Fencing",
  "Exposed Agg Driveway",
  "Letter Box & Clothesline",
];

type Tier = { upTo: number; price: number };

/** Single storey, double storey and acreage all share the standard table. */
const STANDARD: Tier[] = [
  { upTo: 300, price: 23900 },
  { upTo: 450, price: 28900 },
  { upTo: 600, price: 32900 },
  { upTo: 700, price: 36900 },
  { upTo: 800, price: 40900 },
  { upTo: 900, price: 44900 },
];

/** Dual living is priced per design family. */
const DUAL_OC: Record<string, Tier[]> = {
  magnolia: [
    { upTo: 300, price: 20900 },
    { upTo: 450, price: 27900 },
    { upTo: 600, price: 33900 },
    { upTo: 700, price: 36900 },
    { upTo: 800, price: 40900 },
    { upTo: 900, price: 44900 },
  ],
  maize: [
    { upTo: 300, price: 18900 },
    { upTo: 450, price: 27900 },
    { upTo: 600, price: 31900 },
    { upTo: 700, price: 33900 },
    { upTo: 800, price: 39900 },
    { upTo: 900, price: 42900 },
  ],
  wisteria: [
    { upTo: 300, price: 18900 },
    { upTo: 450, price: 27900 },
    { upTo: 600, price: 31900 },
    { upTo: 700, price: 35900 },
    { upTo: 800, price: 39900 },
    { upTo: 900, price: 43900 },
  ],
};

/** Cayenne is the price-list spelling of the Maize duplex family. */
const DUAL_OC_ALIAS: Record<string, string> = { cayene: "maize", cayenne: "maize" };

function tiersFor(housingType: string, designName: string): Tier[] | null {
  if (housingType === "split-level") return null; // quoted after a design consultation
  if (housingType !== "dual-oc") return STANDARD;
  const family = designName.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  const key = DUAL_OC_ALIAS[family] ?? family;
  return DUAL_OC[key] ?? DUAL_OC.maize;
}

/** Blocks larger than the published 900m² tier are quoted individually. */
export function landscapingPriceFor(
  landSize: string | number,
  housingType = "single-storey",
  designName = "",
): number {
  const size = Number(String(landSize).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(size) || size <= 0) return 0;
  const tiers = tiersFor(housingType, designName);
  if (!tiers) return 0;
  return (tiers.find((t) => size <= t.upTo) ?? tiers[tiers.length - 1]).price;
}
