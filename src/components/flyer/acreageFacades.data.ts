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
  item("Classic", `${U}/2024/10/MULBERRY-Classic-Facade-SS-Statesman-scaled.jpg`),
  item(
    "Classic Plus",
    `${U}/2024/07/Hudson-Homes-Ranch-Acerage-Home-Design-Experts-MULBERRY-Classic-Plus-Facade-SS-Statesman-scaled.jpg`,
  ),
  item("Eden", `${U}/2019/02/MULBERRY-Eden-Facade-Single-Storey-Satesman.jpg`),
  item("Statesman", `${U}/2019/02/MULBERRY-Statesman-FacadeSingle-Storey-Statesman.jpg`),
  item("Metro", `${U}/2019/02/MULBERRY-Metro-Facade-Single-Storey-Statesman.jpg`),
  item("Hamptons", `${U}/2021/02/MULBERRY-Hamptons-Facade-Single-Storey-Statesman-scaled.jpg`),
  item("Urban", `${U}/2019/02/MULBERRY-Urban-Facade-Single-Storey-Statesman.jpg`),
  item("Imperial", `${U}/2019/02/MULBERRY-Imperial-Facade-Single-Storey-Statesman.jpg`),
  item("Vogue", `${U}/2019/02/MULBERRY-Vogue-Facade-Single-Storey-Statesman.jpg`),
];
