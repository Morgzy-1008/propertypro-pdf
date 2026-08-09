import {
  SINGLE_STOREY_PRICES,
  DOUBLE_STOREY_PRICES,
  SPLIT_LEVEL_PRICES,
  DUAL_OC_PRICES,
  type PriceRow,
} from "./pricelist.data";
import type { RangeId } from "@/components/flyer/types";

export type HousingType = "single-storey" | "double-storey" | "split-level" | "acreage" | "dual-oc";

export const HOUSING_TYPES: { id: HousingType; label: string }[] = [
  { id: "single-storey", label: "Single Storey" },
  { id: "double-storey", label: "Double Storey" },
  { id: "split-level", label: "Split-Level" },
  { id: "acreage", label: "Acreage" },
  { id: "dual-oc", label: "Dual-Oc" },
];

/** H1 = Value, H2 = Designer, H3 = Luxury */
const RANGE_COLUMN: Record<RangeId, "h1" | "h2" | "h3"> = {
  value: "h1",
  designer: "h2",
  luxury: "h3",
};

/** The Mulberry family is Hudson's acreage / ranch range, not a suburban single storey. */
const isAcreage = (row: PriceRow) => /^mulberry\b/i.test(row.name);

const PRICE_LISTS: Record<HousingType, PriceRow[]> = {
  "single-storey": SINGLE_STOREY_PRICES.filter((r) => !isAcreage(r)),
  "double-storey": DOUBLE_STOREY_PRICES,
  "split-level": SPLIT_LEVEL_PRICES,
  "dual-oc": DUAL_OC_PRICES,
  acreage: SINGLE_STOREY_PRICES.filter(isAcreage),
};

export function designsFor(type: HousingType): PriceRow[] {
  return [...(PRICE_LISTS[type] ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true }),
  );
}

export function findDesign(name: string): PriceRow | undefined {
  return Object.values(PRICE_LISTS)
    .flat()
    .find((r) => r.name === name);
}

/** Current promotion: every listed house price is reduced by $30,000. */
export const PROMO_DISCOUNT = 30000;

export function housePriceFor(name: string, range: RangeId): number | null {
  const row = findDesign(name);
  if (!row) return null;
  const isDualLiving = PRICE_LISTS["dual-oc"].some((r) => r.name === name);
  const discount = isDualLiving ? 0 : PROMO_DISCOUNT;
  return Math.max(0, row[RANGE_COLUMN[range]] - discount);
}


export function formatAud(value: number): string {
  return `$${Math.round(value).toLocaleString("en-AU")}`;
}

export function parseAud(value: string): number {
  const n = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
