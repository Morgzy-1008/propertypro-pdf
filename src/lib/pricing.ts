import {
  SINGLE_STOREY_PRICES,
  DOUBLE_STOREY_PRICES,
  SPLIT_LEVEL_PRICES,
  DUAL_OC_PRICES,
  type PriceRow,
} from "./pricelist.data";
import {
  NSW_SINGLE_STOREY_PRICES,
  NSW_DOUBLE_STOREY_PRICES,
  NSW_SPLIT_LEVEL_PRICES,
  NSW_DUAL_OC_PRICES,
} from "./pricelist.nsw.data";
import { getActiveDivision, type Division } from "./divisionContext";
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

function buildPriceList(single: PriceRow[], double: PriceRow[], split: PriceRow[], dual: PriceRow[]) {
  return {
    "single-storey": single.filter((r) => !isAcreage(r)).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true }),
    ),
    "double-storey": [...double].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true }),
    ),
    "split-level": [...split].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true }),
    ),
    "dual-oc": [...dual].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true }),
    ),
    acreage: single.filter(isAcreage).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true }),
    ),
  };
}

const QLD_PRICE_LISTS = buildPriceList(
  SINGLE_STOREY_PRICES,
  DOUBLE_STOREY_PRICES,
  SPLIT_LEVEL_PRICES,
  DUAL_OC_PRICES,
);

const NSW_PRICE_LISTS = buildPriceList(
  NSW_SINGLE_STOREY_PRICES,
  NSW_DOUBLE_STOREY_PRICES,
  NSW_SPLIT_LEVEL_PRICES,
  NSW_DUAL_OC_PRICES,
);

export function getPriceLists(division?: Division): Record<HousingType, PriceRow[]> {
  const div = division || getActiveDivision();
  return div === "NSW" ? NSW_PRICE_LISTS : QLD_PRICE_LISTS;
}

export function designsFor(type: HousingType, division?: Division): PriceRow[] {
  const lists = getPriceLists(division);
  return lists[type] ?? [];
}

export function findDesign(name: string, division?: Division): PriceRow | undefined {
  const lists = getPriceLists(division);
  const norm = name.trim().toLowerCase();
  for (const list of Object.values(lists)) {
    const found = list.find((r) => r.name.trim().toLowerCase() === norm);
    if (found) return found;
  }
  return undefined;
}

/** Current promotion: every listed house price is reduced by $30,000. */
export const PROMO_DISCOUNT = 30000;

export function housePriceFor(name: string, range: RangeId, division?: Division): number | null {
  const row = findDesign(name, division);
  if (!row) return null;
  const lists = getPriceLists(division);
  const isDualLiving = lists["dual-oc"].some((r) => r.name.trim().toLowerCase() === name.trim().toLowerCase());
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
