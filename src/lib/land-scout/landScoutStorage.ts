import {
  type LandParcel,
  type AvailabilityStatus,
  type OutreachEntry,
} from "./landScoutTypes";
import { upsertLocalLot, type Lot } from "@/lib/databaseStorage";

const STORAGE_KEY_LAND_SCOUT = "hudson_land_scout_parcels_v1";

/**
 * Checks if a parcel is an old synthetic test/seed record that should be purged.
 */
export function isTestParcel(id: string): boolean {
  if (!id) return true;
  return (
    id.startsWith("scout-qld-") ||
    id.startsWith("scout-nsw-") ||
    id.startsWith("scout-test-") ||
    id.startsWith("test-") ||
    id.startsWith("scout-")
  );
}

/**
 * Purges old test parcels from local storage.
 * Ensures zero dummy or synthetic test listings ever display.
 */
export function purgeOldTestParcels(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAND_SCOUT);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const realOnly = parsed.filter((p: LandParcel) => !isTestParcel(p.id));
      localStorage.setItem(STORAGE_KEY_LAND_SCOUT, JSON.stringify(realOnly));
    }
  } catch (e) {
    console.warn("Failed to purge old test parcels:", e);
  }
}

/**
 * Completely clears all land parcels in storage.
 */
export function clearAllLandParcels(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY_LAND_SCOUT);
  } catch (e) {
    console.warn("Failed to clear land scout store:", e);
  }
}

/**
 * Retrieves all real land parcels from store.
 * Always strips out any synthetic test parcels. Initial state is empty [] (no fake listings).
 */
export function getLandParcels(): LandParcel[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAND_SCOUT);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as LandParcel[];
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Filter out any leftover test items from earlier development
    const cleaned = parsed.filter((p) => !isTestParcel(p.id));
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY_LAND_SCOUT, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch (e) {
    console.warn("Error reading land scout store:", e);
    return [];
  }
}

/**
 * Bulk adds or updates parcels in the store (e.g. from web search or database sync).
 * Deduplicates by ID and by lotNumber + estate + suburb combination.
 */
export function bulkAddOrUpdateParcels(incoming: LandParcel[]): LandParcel[] {
  if (typeof window === "undefined" || !incoming.length) return getLandParcels();

  try {
    const existing = getLandParcels();
    const idMap = new Map<string, LandParcel>();
    const dedupToId = new Map<string, string>();

    // Key existing items
    for (const p of existing) {
      idMap.set(p.id, p);
      const dedupKey = `${(p.estate || p.suburb || "").toLowerCase()}__${(p.lotNumber || "").toLowerCase()}`;
      if (p.lotNumber) {
        dedupToId.set(dedupKey, p.id);
      }
    }

    // Merge incoming real items
    for (const item of incoming) {
      if (isTestParcel(item.id)) continue;
      const dedupKey = `${(item.estate || item.suburb || "").toLowerCase()}__${(item.lotNumber || "").toLowerCase()}`;
      const existingId = (item.lotNumber && dedupToId.get(dedupKey)) || (idMap.has(item.id) ? item.id : undefined);

      if (existingId && idMap.has(existingId)) {
        const prev = idMap.get(existingId)!;
        const merged: LandParcel = {
          ...prev,
          ...item,
          id: existingId,
          outreachHistory: prev.outreachHistory?.length ? prev.outreachHistory : item.outreachHistory,
        };
        idMap.set(existingId, merged);
      } else {
        idMap.set(item.id, item);
        if (item.lotNumber) {
          dedupToId.set(dedupKey, item.id);
        }
      }
    }

    const updatedList = Array.from(idMap.values());
    localStorage.setItem(STORAGE_KEY_LAND_SCOUT, JSON.stringify(updatedList));
    return updatedList;
  } catch (e) {
    console.warn("Error in bulkAddOrUpdateParcels:", e);
    return getLandParcels();
  }
}

/**
 * Saves or updates a single land parcel in the local store.
 */
export function saveLandParcel(updated: LandParcel): void {
  if (typeof window === "undefined") return;
  try {
    const all = getLandParcels();
    const idx = all.findIndex((p) => p.id === updated.id);
    if (idx >= 0) {
      all[idx] = updated;
    } else {
      all.unshift(updated);
    }
    localStorage.setItem(STORAGE_KEY_LAND_SCOUT, JSON.stringify(all));
  } catch (e) {
    console.warn("Error saving land parcel:", e);
  }
}

/**
 * Updates availability status of a parcel.
 */
export function updateParcelAvailability(
  id: string,
  newStatus: AvailabilityStatus,
  note?: string
): LandParcel | null {
  const all = getLandParcels();
  const parcel = all.find((p) => p.id === id);
  if (!parcel) return null;

  parcel.availabilityStatus = newStatus;
  parcel.lastVerifiedAt = new Date().toISOString();

  if (note) {
    if (!parcel.outreachHistory) parcel.outreachHistory = [];
    parcel.outreachHistory.unshift({
      id: `outreach-${Date.now()}`,
      timestamp: new Date().toISOString(),
      consultantName: "Morgan Hales",
      channel: "email",
      inquiryType: "availability_check",
      notes: note,
      status: newStatus === "verified_available" ? "confirmed_available" : "sent",
    });
  }

  saveLandParcel(parcel);
  return parcel;
}

/**
 * Logs a new outreach entry (email, SMS, or phone) on a parcel.
 */
export function logAgentOutreach(
  parcelId: string,
  entry: Omit<OutreachEntry, "id" | "timestamp">
): LandParcel | null {
  const all = getLandParcels();
  const parcel = all.find((p) => p.id === parcelId);
  if (!parcel) return null;

  const newEntry: OutreachEntry = {
    ...entry,
    id: `outreach-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };

  if (!parcel.outreachHistory) parcel.outreachHistory = [];
  parcel.outreachHistory.unshift(newEntry);
  if (entry.status === "confirmed_available") {
    parcel.availabilityStatus = "verified_available";
    parcel.lastVerifiedAt = newEntry.timestamp;
  } else if (entry.status === "under_offer") {
    parcel.availabilityStatus = "under_offer";
  } else if (entry.status === "sold") {
    parcel.availabilityStatus = "sold";
  }

  saveLandParcel(parcel);
  return parcel;
}

/**
 * 1-Click Handoff: Dispatches parcel into Package Studio (Flyer Builder) with auto-matched Hudson design.
 */
export function handoffLotToFlyer(parcel: LandParcel, selectedDesignName?: string): void {
  if (typeof window === "undefined") return;

  const topDesign = selectedDesignName || parcel.suggestedDesign || "Amber 26";
  const matched = parcel.matchingDesigns.find((d) => d.designName === topDesign) || parcel.matchingDesigns[0];

  const payload = {
    lotId: parcel.lotNumber || parcel.id,
    address: parcel.streetAddress || `${parcel.lotNumber} ${parcel.estate}`,
    suburb: parcel.suburb,
    estate: parcel.estate,
    state: parcel.state,
    postcode: parcel.postcode,
    landSize: String(parcel.landSizeM2),
    landFrontage: String(parcel.frontageM),
    landDepth: String(parcel.depthM),
    landPrice: `$${parcel.price.toLocaleString()}`,
    designName: topDesign,
    floorplanSize: matched ? String(matched.floorplanM2) : "241.56",
    price: matched ? `$${matched.estimatedPackagePrice.toLocaleString()}` : `$${(parcel.price + 430000).toLocaleString()}`,
    housePrice: matched ? `$${matched.estimatedHousePrice.toLocaleString()}` : "$430,000",
    beds: matched ? String(matched.beds) : "4",
    baths: matched ? String(matched.baths) : "2",
    cars: matched ? String(matched.cars) : "2",
    isBtb: parcel.feasibility.isBtbPermissible,
    frontSetback: "3.8",
    rearSetback: String(Number(Math.max(1.0, parcel.depthM - (matched?.houseLengthM || 20.15) - 3.8).toFixed(2))),
  };

  sessionStorage.setItem("hudson-flyer-handoff", JSON.stringify(payload));
  sessionStorage.setItem("hudson-landscout-handoff", JSON.stringify(payload));
}

/**
 * 1-Click Handoff: Syncs discovered parcel into Hudson's permanent land database.
 */
export function syncLotToDatabase(parcel: LandParcel): boolean {
  try {
    const lot: Lot = {
      id: parcel.id,
      estate: parcel.estate || parcel.suburb,
      suburb: parcel.suburb,
      lot_number: parcel.lotNumber,
      address: parcel.streetAddress || `Lot ${parcel.lotNumber} ${parcel.estate || parcel.suburb}`,
      land_size: parcel.landSizeM2,
      frontage: parcel.frontageM,
      land_price: parcel.price,
      titled: parcel.isRegistered,
      registration_date: parcel.expectedRegistrationDate || null,
      status: parcel.availabilityStatus === "verified_available" ? "available" : "on_hold",
      state: parcel.state,
      developer: parcel.agentAgency || "Hudson Development Partner",
      developer_contact_name: parcel.agentName || "Sales Office",
      developer_contact_phone: parcel.agentPhone || "1300 246 700",
      developer_contact_email: parcel.agentEmail || "sales@hudsonhomes.com.au",
      exclusive_consultants: null,
      deadline: null,
      notes: `Sourced via Hudson Land Scout (${parcel.sourcePortal}). Deal Score: ${parcel.valuation.dealScorePoints}/100. Contact: ${parcel.agentName} (${parcel.agentPhone}).`,
      updated_at: new Date().toISOString(),
    };

    upsertLocalLot(lot);
    return true;
  } catch (e) {
    console.error("Error syncing lot to database:", e);
    return false;
  }
}
