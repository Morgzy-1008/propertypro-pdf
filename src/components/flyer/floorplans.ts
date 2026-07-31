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

const BY_KEY = new Map<string, FloorplanRecord[]>();
const BY_DESIGN = new Map<string, FloorplanRecord[]>();
for (const plan of HUDSON_FLOORPLANS) {
  const key = planKey(plan.label);
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
    .map((p) => ({ label: p.label.replace(/[AB]$/, ""), size: `${p.size} m²` }));
}
