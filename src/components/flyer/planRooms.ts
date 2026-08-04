export interface PlanRoomCounts {
  beds: string;
  baths: string;
}

export async function resolvePlanRooms(
  _cacheKey: string,
  _planDataUrl: string,
  publishedBeds: string,
  publishedBaths: string,
): Promise<PlanRoomCounts> {
  return { beds: publishedBeds, baths: publishedBaths };
}
