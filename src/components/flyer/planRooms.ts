import { authHeaders } from "@/lib/api-auth";

export interface PlanRoomCounts {
  beds: string;
  baths: string;
}

const roomCache = new Map<string, PlanRoomCounts>();

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/**
 * Reads the room labels off a floorplan drawing and returns the true bed and
 * bath totals for the flyer:
 *  - a GUEST bedroom counts towards the bedroom total
 *  - BATH = 1, ENS (or a combined ENS/BATH room) = 1
 *  - PDR / PWDR powder room = 0.5, and a standalone WC / TOILET = 0.5
 * The published website figures are used as a floor, so a detection miss can
 * never advertise fewer rooms than Hudson already publishes.
 */
export async function resolvePlanRooms(
  cacheKey: string,
  planDataUrl: string,
  publishedBeds: string,
  publishedBaths: string,
): Promise<PlanRoomCounts> {
  const pubBeds = Number(publishedBeds) || 0;
  const pubBaths = Number(publishedBaths) || 0;
  const fallback = { beds: publishedBeds, baths: publishedBaths };

  const key = `v3:${cacheKey}`;
  const cached = roomCache.get(key);
  if (cached) return cached;
  if (!planDataUrl.startsWith("data:image/")) return fallback;

  try {
    const res = await fetch("/api/plan-rooms", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ dataUrl: planDataUrl }),
    });
    if (!res.ok) return fallback;
    const info = (await res.json()) as {
      bedrooms?: number;
      guest?: number;
      bathrooms?: number;
      ensuites?: number;
      powder?: number;
    };

    const bedrooms = Number(info.bedrooms) || 0;
    const guest = Number(info.guest) || 0;
    const bathrooms = Number(info.bathrooms) || 0;
    const ensuites = Number(info.ensuites) || 0;
    const powder = Number(info.powder) || 0;

    const detectedBeds = bedrooms + guest;
    const detectedBaths = bathrooms + ensuites + powder * 0.5;

    const result: PlanRoomCounts = {
      beds: fmt(Math.max(pubBeds, detectedBeds) || pubBeds),
      baths: fmt(Math.max(pubBaths, detectedBaths) || pubBaths),
    };
    roomCache.set(key, result);
    return result;
  } catch {
    return fallback;
  }
}
