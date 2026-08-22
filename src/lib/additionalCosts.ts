import type { HousingType } from "./pricing";

export type CostId = "council" | "covenant" | "site" | "driveway" | "landscaping" | "other";

export type AdditionalCosts = Record<CostId, number>;

export const COST_FIELDS: { id: CostId; label: string }[] = [
  { id: "council", label: "Council fees" },
  { id: "covenant", label: "Covenant / contingency" },
  { id: "site", label: "Site costs" },
  { id: "driveway", label: "Driveway" },
  { id: "landscaping", label: "Landscaping package" },
  { id: "other", label: "Other" },
];

/** Split-level values apply to split-level designs; acreage/dual-oc follow single storey. */
function byStorey(type: string, single: number, double: number, split: number): number {
  if (type === "double-storey") return double;
  if (type === "split-level") return split;
  return single;
}

export function defaultCosts(housingType: string = "single-storey"): AdditionalCosts {
  return {
    council: 2500,
    covenant: 5000,
    site: byStorey(housingType, 15000, 25000, 60000),
    driveway: 12000,
    landscaping: 0,
    other: 0,
  };
}

export function costsTotal(costs: AdditionalCosts): number {
  return COST_FIELDS.reduce((sum, f) => sum + (Number(costs[f.id]) || 0), 0);
}

export type { HousingType };
