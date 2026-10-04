import { type Lot, type Pkg, getLotState } from "@/lib/databaseStorage";
import { defaultFlyer, type FlyerData } from "@/components/flyer/types";
import { resolveUpdatedFacadeRender } from "@/components/flyer/FlyerTemplates";

/**
 * Builds a clean, canonical address string:
 * - Guarantees "Lot {N}" prefix if lot number exists
 * - Prevents duplicate lot numbers (e.g. "Lot 101, 101, ...")
 * - Handles addresses that already contain "Lot {N}"
 * - Falls back cleanly to estate, suburb, state, postcode
 */
export function buildCanonicalAddress(params: {
  lotNumber?: string | number | null;
  address?: string | null;
  estate?: string | null;
  suburb?: string | null;
  state?: string | null;
  postcode?: string | null;
}): string {
  const rawLot = params.lotNumber != null ? String(params.lotNumber).trim() : "";
  const lotPrefix = rawLot
    ? (/^lot\b/i.test(rawLot) ? rawLot : `Lot ${rawLot}`)
    : "";

  let rawAddr = (params.address || "").trim();

  // If rawAddr is already complete with "Lot X":
  if (/^lot\s+\d+/i.test(rawAddr)) {
    return rawAddr;
  }

  // If rawAddr starts with a bare number that equals rawLot (e.g. "101, ...")
  if (rawLot && new RegExp(`^${rawLot}\\b`, "i").test(rawAddr)) {
    rawAddr = rawAddr.replace(new RegExp(`^${rawLot}\\s*,?\\s*`, "i"), "");
  }

  // If rawAddr exists now
  if (rawAddr) {
    if (lotPrefix) {
      return `${lotPrefix}, ${rawAddr}`;
    }
    return rawAddr;
  }

  // Fallback: build from estate / suburb / state / postcode
  const parts: string[] = [];
  if (lotPrefix) parts.push(lotPrefix);
  if (params.estate && !parts.includes(params.estate.trim())) parts.push(params.estate.trim());

  const locality = [
    params.suburb?.trim(),
    params.state?.trim(),
    params.postcode?.trim(),
  ].filter(Boolean).join(" ");

  if (locality && !parts.some((p) => p.includes(locality))) {
    parts.push(locality);
  }

  return parts.filter(Boolean).join(", ");
}

/**
 * Synthesizes a 100% complete FlyerData object by merging the package,
 * its associated lot, and any existing flyer_data / flyer_json.
 */
export function buildFlyerDataFromPackage(p: Pkg, lot?: Lot | null): FlyerData {
  const existingFlyer = ((p.flyer_data || p.flyer_json) && typeof (p.flyer_data || p.flyer_json) === "object"
    ? (p.flyer_data || p.flyer_json)
    : {}) as Partial<FlyerData>;

  const lotNum =
    lot?.lot_number ||
    (existingFlyer as any)?.lot_number ||
    (existingFlyer as any)?.lotNumber ||
    "";

  const canonicalAddress = buildCanonicalAddress({
    lotNumber: lotNum,
    address: existingFlyer.address || lot?.address,
    estate: (p as any).estate || lot?.estate || existingFlyer.estate,
    suburb: (p as any).suburb || lot?.suburb || existingFlyer.suburb,
    state: p.state || (lot ? getLotState(lot) : existingFlyer.state),
    postcode: lot?.postcode,
  });

  const stateVal = (p.state || (lot ? getLotState(lot) : existingFlyer.state) || "QLD") as "QLD" | "NSW";

  const rawFacadeUrl = existingFlyer.facadeUrl || (p as any).facade_url || "";
  const facadeUrl = resolveUpdatedFacadeRender(rawFacadeUrl);

  const priceVal =
    p.total_price != null
      ? `$${Number(p.total_price).toLocaleString()}`
      : existingFlyer.price || "$0";

  const housePriceVal =
    p.house_price != null
      ? `$${Number(p.house_price).toLocaleString()}`
      : existingFlyer.housePrice || "$0";

  const landPriceVal =
    p.land_price != null
      ? `$${Number(p.land_price).toLocaleString()}`
      : lot?.land_price != null
        ? `$${Number(lot.land_price).toLocaleString()}`
        : existingFlyer.landPrice || "$0";

  const designName = p.name || p.design || existingFlyer.designName || "Design";
  const floorplanName =
    (existingFlyer as any)?.floorplanName ||
    (p as any).floorplan_name ||
    p.design ||
    p.name ||
    "Floorplan";

  return {
    ...defaultFlyer,
    ...existingFlyer,
    id: p.id,
    packageId: p.id,
    lotId: p.lot_id || existingFlyer.lotId || lot?.id || "",
    suburb: existingFlyer.suburb || (p as any).suburb || lot?.suburb || "",
    estate: existingFlyer.estate || (p as any).estate || lot?.estate || "",
    address: canonicalAddress,
    state: stateVal,
    price: priceVal,
    housePrice: housePriceVal,
    landPrice: landPriceVal,
    housingType: p.housing_type || existingFlyer.housingType || "House & Land",
    designName,
    floorplanName,
    floorplanSize: p.floorplan_size
      ? String(p.floorplan_size).replace(/[^\d.]/g, "")
      : existingFlyer.floorplanSize || "",
    landSize: lot?.land_size ? String(lot.land_size) : existingFlyer.landSize || "",
    landFrontage: lot?.frontage ? String(lot.frontage) : existingFlyer.landFrontage || "",
    beds: p.beds ? String(p.beds) : existingFlyer.beds || "4",
    baths: p.baths ? String(p.baths) : existingFlyer.baths || "2",
    cars: p.cars ? String(p.cars) : existingFlyer.cars || "2",
    facadeName: p.facade_name || existingFlyer.facadeName || "Modern",
    facadeUrl: facadeUrl || existingFlyer.facadeUrl || "",
    rawFacadeUrl: facadeUrl || existingFlyer.rawFacadeUrl || "",
    floorplanUrl: (p as any).floorplan_url || existingFlyer.floorplanUrl || "",
    range: (p.range_id || existingFlyer.range || "designer") as any,
    headline: existingFlyer.headline || "FIXED PRICE HOME & LAND PACKAGE",
    inclusions: existingFlyer.inclusions || defaultFlyer.inclusions,
  };
}
