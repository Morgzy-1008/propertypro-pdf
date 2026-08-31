/* The Mulberry (acreage / ranch) facade gallery, taken from the Mulberry design
 * pages on hudsonhomes.com.au. The Mulberry range is the only acreage range we
 * sell, so these are the only facades offered when Acreage is selected. */
import type { FacadeItem } from "./facadeLibrary";

const RANGE = "Acreage / Ranch (Mulberry)";

function item(name: string, url: string): FacadeItem {
  return {
    id: `mulberry-${name.toLowerCase().replace(/\s+/g, "-")}`,
    name,
    range: RANGE,
    tags: ["acreage", "ranch", "mulberry", ...name.toLowerCase().split(/\s+/)],
    url,
  };
}

const U = "https://www.hudsonhomes.com.au/wp-content/uploads";

export const MULBERRY_FACADES: FacadeItem[] = [
  item("Classic", `/facades/classic-ranch.png`),
  item("Classic Plus", `/facades/classic-plus-ranch.png`),
  item("Eden", `/facades/eden-ranch.png`),
  item("Statesman", `/facades/statesman-ranch.png`),
  item("Metro", `/facades/metro-ranch.png`),
  item("Hamptons", `/facades/hampton-ranch.png`),
  item("Urban", `/facades/urban-ranch.png`),
  item("Imperial", `/facades/imperial-ranch.png`),
  item("Vogue", `/facades/vogue-ranch.png`),
];
