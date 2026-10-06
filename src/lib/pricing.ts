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

/** HBS = Base, SS = Smart Start, H1 = Value, H2 = Designer, H3 = Luxury */
const RANGE_COLUMN: Record<RangeId, "hbs" | "ss" | "h1" | "h2" | "h3"> = {
  hbs: "hbs",
  ss: "ss",
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

export function normalizeHousingType(type?: string | null): HousingType {
  if (!type) return "single-storey";
  const s = String(type).trim().toLowerCase().replace(/[\s_]+/g, "-");
  if (s.includes("double") || s.includes("2-storey") || s.includes("two-storey")) return "double-storey";
  if (s.includes("split")) return "split-level";
  if (s.includes("dual") || s.includes("duplex")) return "dual-oc";
  if (s.includes("acreage") || s.includes("mulberry")) return "acreage";
  return "single-storey";
}

export function designsFor(type: string, division?: Division): PriceRow[] {
  const lists = getPriceLists(division);
  const normalized = normalizeHousingType(type);
  return lists[normalized] ?? [];
}

export function normalizeDesignLookup(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s*\((?:single|two)\s*stor(?:y|ey)[^)]*\)/gi, "")
    .replace(/\s*\((?:new|old)\s*design\)/gi, "")
    .replace(/\s*-\s*\((?:new|old)\s*design\)/gi, "")
    .replace(/\b(?:new|old)\s*design\b/gi, "")
    .replace(/\s*corner\s*lot\b/gi, "")
    .replace(/\s*-\s*(?:td|sd)\b/gi, "")
    .replace(/\b(?:td|sd)\b/gi, "")
    .replace(/\s*-\s*\((?:attached|dettached|detached)\s*garage\)/gi, "")
    .replace(/\s*\((?:attached|detached)\)/gi, "")
    .replace(/\b(?:attached|detached)\b/gi, "")
    .replace(/\s*\([sSdD]\/[gG]\)/gi, "")
    .replace(/\s*\((?:qld|nsw)\)/gi, "")
    .replace(/\bmk\s*ii\b|\bmkii\b/gi, "mk2")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findDesign(name: string, division?: Division): PriceRow | undefined {
  const lists = getPriceLists(division);
  const rawNorm = name.trim().toLowerCase();
  for (const list of Object.values(lists)) {
    const exact = list.find((r) => r.name.trim().toLowerCase() === rawNorm);
    if (exact) return exact;
  }
  const cleanNorm = normalizeDesignLookup(name);
  for (const list of Object.values(lists)) {
    const loose = list.find((r) => normalizeDesignLookup(r.name) === cleanNorm);
    if (loose) return loose;
  }
  // Try prefix matching on model name + number (e.g. "magnolia 34")
  for (const list of Object.values(lists)) {
    const prefix = list.find((r) => {
      const rowNorm = normalizeDesignLookup(r.name);
      return rowNorm.startsWith(cleanNorm) || cleanNorm.startsWith(rowNorm);
    });
    if (prefix) return prefix;
  }
  return undefined;
}

/** Promotion discount: base prices are now directly discounted in master pricelists with a $10,000 safety net. */
export const PROMO_DISCOUNT = 0;

export function housePriceFor(name: string, range: RangeId, division?: Division): number | null {
  const row = findDesign(name, division);
  if (!row) return null;
  const lists = getPriceLists(division);
  const isDualLiving = lists["dual-oc"].some((r) => r.name.trim().toLowerCase() === name.trim().toLowerCase());
  const discount = isDualLiving ? 0 : PROMO_DISCOUNT;
  const col = RANGE_COLUMN[range] || "h2";
  const rawPrice = (row as any)[col] ?? row.h2 ?? row.h1 ?? 0;
  return Math.max(0, rawPrice - discount);
}

export function formatAud(value: number): string {
  const rounded = Math.round(value);
  if (rounded < 0) {
    return `-$${Math.abs(rounded).toLocaleString("en-AU")}`;
  }
  return `$${rounded.toLocaleString("en-AU")}`;
}

export function parseAud(value: string | number | undefined | null): number {
  if (value == null) return 0;
  const n = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function formatPrice(val: string | number | undefined | null): string {
  if (val == null) return "$—";
  const str = String(val).trim();
  if (!str || str === "$—" || str === "—") return "$—";
  const num = parseAud(str);
  if (num > 0) return formatAud(num);
  return str.startsWith("$") ? str : `$${str}`;
}
