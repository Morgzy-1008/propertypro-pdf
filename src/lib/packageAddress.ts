import { type Lot, type Pkg, getLotState, getLocalLots } from "@/lib/databaseStorage";
import { defaultFlyer, type FlyerData } from "@/components/flyer/types";
import { resolveUpdatedFacadeRender } from "@/components/flyer/FlyerTemplates";
import { plansForDesign } from "@/components/flyer/floorplans";
import { findFacadeForDesign, isNarrowDoubleStorey } from "@/lib/quoting/facadeLookup";
import { getHudsonDimensions } from "@/lib/hudsonDimensions.data";
import { normalizeHousingType, parseAud, findDesign } from "@/lib/pricing";
import { defaultCosts, costsTotal } from "@/lib/additionalCosts";

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

  // Strip accidental trailing dots, ellipses, or trailing punctuation from saved flyers
  rawAddr = rawAddr.replace(/\s*(\.{2,}|…)+/g, "").replace(/[,\s•·–-]+$/, "").trim();

  // If rawAddr already starts with "Lot {X}":
  if (/^lot\s+[a-z0-9\-\/]+/i.test(rawAddr)) {
    // If rawLot was provided and differs from what's in rawAddr, update the lot number prefix cleanly
    if (rawLot && !new RegExp(`^lot\\s+${rawLot}\\b`, "i").test(rawAddr)) {
      rawAddr = rawAddr.replace(/^lot\s+[a-z0-9\-\/]+\s*,?\s*/i, `${lotPrefix}, `);
    }

    // Check if rawAddr is ONLY the lot number (e.g. "Lot 216")
    const isOnlyLot = /^lot\s+[a-z0-9\-\/]+[,\s]*$/i.test(rawAddr);
    if (!isOnlyLot) {
      // Check if it already has suburb/locality
      const locality = [
        params.suburb?.trim(),
        params.state?.trim(),
        params.postcode?.trim(),
      ].filter(Boolean).join(" ");

      if (locality && params.suburb && !rawAddr.toLowerCase().includes(params.suburb.toLowerCase().trim())) {
        return `${rawAddr}, ${locality}`;
      }
      return rawAddr;
    }
    // If only lot number, let it fall through to combine with estate and locality below
    rawAddr = "";
  }

  // If rawAddr starts with a bare number that equals rawLot (e.g. "101, ...")
  if (rawLot && new RegExp(`^${rawLot}\\b`, "i").test(rawAddr)) {
    rawAddr = rawAddr.replace(new RegExp(`^${rawLot}\\s*,?\\s*`, "i"), "");
  }

  // If rawAddr exists now (e.g. "14 Waratah St, Bahrs Scrub QLD 4207")
  if (rawAddr) {
    let combined = lotPrefix ? `${lotPrefix}, ${rawAddr}` : rawAddr;
    const locality = [
      params.suburb?.trim(),
      params.state?.trim(),
      params.postcode?.trim(),
    ].filter(Boolean).join(" ");

    if (locality && params.suburb && !combined.toLowerCase().includes(params.suburb.toLowerCase().trim())) {
      combined = `${combined}, ${locality}`;
    }
    return combined;
  }

  // Fallback: build from lot + estate + suburb / state / postcode
  const parts: string[] = [];
  if (lotPrefix) parts.push(lotPrefix);
  if (params.estate && !parts.some((p) => p.toLowerCase() === params.estate!.trim().toLowerCase())) {
    parts.push(params.estate.trim());
  }

  const locality = [
    params.suburb?.trim(),
    params.state?.trim(),
    params.postcode?.trim(),
  ].filter(Boolean).join(" ");

  if (locality && !parts.some((p) => p.toLowerCase().includes(locality.toLowerCase()))) {
    parts.push(locality);
  }

  return parts.filter(Boolean).join(", ");
}

/**
 * Synthesizes a 100% complete FlyerData object by merging the package,
 * its associated lot, and any existing flyer_data / flyer_json.
 * Auto-resolves missing floorplans and facades so the flyer is never blank.
 */
export function buildFlyerDataFromPackage(p: Pkg, lot?: Lot | null): FlyerData {
  let existingFlyer = (p.flyer_data || p.flyer_json) as any;
  if (typeof existingFlyer === "string") {
    try {
      existingFlyer = JSON.parse(existingFlyer);
    } catch {
      existingFlyer = {};
    }
  }
  if (!existingFlyer || typeof existingFlyer !== "object") {
    existingFlyer = {};
  }

  // Attempt to recover lot from local storage if not provided
  let resolvedLot = lot;
  if (!resolvedLot && typeof window !== "undefined") {
    try {
      const localLots = getLocalLots();
      const candidateId = p.lot_id || existingFlyer.lotId || existingFlyer.lot_id;
      if (candidateId) {
        resolvedLot = localLots.find((l) => l.id === candidateId) || null;
      }
      if (!resolvedLot) {
        const est = ((p as any).estate || existingFlyer.estate || "").toLowerCase().trim();
        const rawLotNo = String(existingFlyer.lot_number || existingFlyer.lotNumber || "").toLowerCase().replace(/^lot\s*/i, "").trim();
        if (est && rawLotNo) {
          resolvedLot = localLots.find((l) => {
            const lNum = String(l.lot_number || "").toLowerCase().replace(/^lot\s*/i, "").trim();
            const lEst = String(l.estate || "").toLowerCase().trim();
            return lNum === rawLotNo && lEst === est;
          }) || null;
        }
      }
    } catch {
      /* ignore storage lookup errors */
    }
  }

  const lotNum =
    resolvedLot?.lot_number ||
    existingFlyer.lot_number ||
    existingFlyer.lotNumber ||
    "";

  // Prefer the file's actual street address if available, falling back to existingFlyer.address
  const baseAddress = resolvedLot?.address || existingFlyer.address || null;
  const canonicalAddress = buildCanonicalAddress({
    lotNumber: lotNum,
    address: baseAddress,
    estate: (p as any).estate || resolvedLot?.estate || existingFlyer.estate,
    suburb: (p as any).suburb || resolvedLot?.suburb || existingFlyer.suburb,
    state: p.state || (resolvedLot ? getLotState(resolvedLot) : existingFlyer.state),
    postcode: resolvedLot?.postcode,
  });

  const stateVal = (p.state || (resolvedLot ? getLotState(resolvedLot) : existingFlyer.state) || "QLD") as "QLD" | "NSW";

  // Resolve Design Name cleanly (strip off any estate or lot suffix like "Jasper 26 · Park Ridge" -> "Jasper 26")
  const rawDesign = existingFlyer.designName || p.design || p.name || "Jasper 26";
  let designName = rawDesign.split(/\s+[·•\-–]\s+/)[0].trim() || rawDesign;
  const matchedPriceRow = findDesign(designName, stateVal);
  if (matchedPriceRow) {
    designName = matchedPriceRow.name;
  }

  // Resolve Housing Type (normalize to single-storey, double-storey, split-level, etc.)
  const rawHousingType = existingFlyer.housingType || p.housing_type || "single-storey";
  const housingType = normalizeHousingType(rawHousingType);

  // 1. Auto-resolve Floorplan
  const plans = plansForDesign(designName);
  const defaultPlan = plans[0];

  let floorplanUrl = existingFlyer.floorplanUrl || (p as any).floorplan_url || "";
  let floorplanName =
    existingFlyer.floorplanName ||
    (p as any).floorplan_name ||
    defaultPlan?.label ||
    designName;
  let floorplanSize = existingFlyer.floorplanSize
    ? String(existingFlyer.floorplanSize).replace(/[^\d.]/g, "")
    : p.floorplan_size
      ? String(p.floorplan_size).replace(/[^\d.]/g, "")
      : defaultPlan?.size || "";

  if (plans.length > 0) {
    const matchedPlan = plans.find(
      (pl) => pl.label.toLowerCase() === floorplanName.toLowerCase() ||
              pl.url === floorplanUrl ||
              pl.label.toLowerCase().includes(floorplanName.toLowerCase()) ||
              floorplanName.toLowerCase().includes(pl.label.toLowerCase())
    ) || defaultPlan;

    if (!floorplanUrl) floorplanUrl = matchedPlan.url;
    if (!floorplanName || floorplanName === "Floorplan") floorplanName = matchedPlan.label;
    if (!floorplanSize) floorplanSize = matchedPlan.size;
  }

  const bedsVal = p.beds ? String(p.beds) : existingFlyer.beds || defaultPlan?.beds || "4";
  const bathsVal = p.baths ? String(p.baths) : existingFlyer.baths || defaultPlan?.baths || "2";
  const carsVal = p.cars ? String(p.cars) : existingFlyer.cars || defaultPlan?.cars || "2";

  // 2. Auto-resolve Facade
  const isDouble =
    housingType === "double-storey" ||
    isNarrowDoubleStorey(designName);

  let facadeName = existingFlyer.facadeName || p.facade_name || "Classic";
  let rawFacadeUrl = existingFlyer.rawFacadeUrl || existingFlyer.facadeUrl || (p as any).facade_url || "";
  let facadeId = existingFlyer.facadeId || (p as any).facade_id || "";
  let facadeUrl = resolveUpdatedFacadeRender(rawFacadeUrl);

  if (!facadeUrl) {
    const resolvedFacade = findFacadeForDesign(facadeName, isDouble, housingType, designName);
    if (resolvedFacade?.url) {
      facadeUrl = resolveUpdatedFacadeRender(resolvedFacade.url);
      rawFacadeUrl = resolvedFacade.originalUrl || resolvedFacade.url;
      facadeName = resolvedFacade.name || facadeName;
      facadeId = resolvedFacade.id || facadeId;
    }
  }

  // 3. House Dimensions
  const dim = getHudsonDimensions(floorplanName) || getHudsonDimensions(designName);
  const houseWidthM = dim ? dim.width : (existingFlyer.houseWidthM || (defaultPlan?.houseWidth ? parseFloat(defaultPlan.houseWidth) : undefined));
  const houseLengthM = dim ? dim.length : (existingFlyer.houseLengthM || (defaultPlan?.houseLength ? parseFloat(defaultPlan.houseLength) : undefined));

  const housePriceVal =
    p.house_price != null
      ? `$${Number(p.house_price).toLocaleString()}`
      : existingFlyer.housePrice || "$0";

  const landPriceVal =
    p.land_price != null
      ? `$${Number(p.land_price).toLocaleString()}`
      : resolvedLot?.land_price != null
        ? `$${Number(resolvedLot.land_price).toLocaleString()}`
        : existingFlyer.landPrice || "$0";

  const resolvedCosts = existingFlyer.costs || defaultCosts(housingType);
  const costsSum = costsTotal(resolvedCosts);

  const priceVal =
    p.total_price != null
      ? `$${Number(p.total_price).toLocaleString()}`
      : existingFlyer.price || (parseAud(housePriceVal) > 0 || parseAud(landPriceVal) > 0
          ? `$${(parseAud(housePriceVal) + parseAud(landPriceVal) + costsSum).toLocaleString()}`
          : "$0");

  return {
    ...defaultFlyer,
    ...existingFlyer,
    id: p.id,
    packageId: p.id,
    lotId: p.lot_id || existingFlyer.lotId || resolvedLot?.id || "",
    suburb: existingFlyer.suburb || (p as any).suburb || resolvedLot?.suburb || "",
    estate: existingFlyer.estate || (p as any).estate || resolvedLot?.estate || "",
    address: canonicalAddress,
    state: stateVal,
    price: priceVal,
    housePrice: housePriceVal,
    landPrice: landPriceVal,
    housingType,
    designName,
    floorplanName,
    floorplanSize,
    houseWidthM,
    houseLengthM,
    landSize: resolvedLot?.land_size ? String(resolvedLot.land_size) : existingFlyer.landSize || "",
    landFrontage: resolvedLot?.frontage ? String(resolvedLot.frontage) : existingFlyer.landFrontage || "",
    beds: bedsVal,
    baths: bathsVal,
    cars: carsVal,
    facadeName,
    facadeId,
    facadeUrl,
    rawFacadeUrl: rawFacadeUrl || facadeUrl,
    floorplanUrl,
    range: (p.range_id || existingFlyer.range || "designer") as any,
    headline: existingFlyer.headline || "FIXED PRICE HOME & LAND PACKAGE",
    inclusions: existingFlyer.inclusions || defaultFlyer.inclusions,
    costs: resolvedCosts,
    landscaping: existingFlyer.landscaping ?? false,
  };
}
