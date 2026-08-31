import { LOCAL_FLOORPLAN_MAP } from "./localFloorplanMap.data";
import { plansForDesign } from "@/components/flyer/floorplans";
import { prepareFloorplan, cropPdfFloorplan } from "@/components/flyer/floorplanEngine";

/**
 * Finds the highest-resolution local or vector floorplan available for a design.
 * Always prioritizes:
 * 1. Custom/Uploaded floorplans (data: URLs or custom uploads).
 * 2. High-resolution local vector PDF crops (Scale 5.0).
 * 3. High-resolution local 2000px-4000px master PNG files from /floorplans/.
 * 4. Prepared/Enhanced online floorplans.
 */
export async function getHighResFloorplanForDesign(
  designName?: string,
  customFloorplanUrl?: string
): Promise<string | null> {
  if (customFloorplanUrl && customFloorplanUrl.startsWith("data:")) {
    return customFloorplanUrl;
  }

  if (!designName || !designName.trim()) {
    return customFloorplanUrl || null;
  }

  const cleanName = designName.trim();
  const normalizedKey = cleanName.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
  
  // Extract family and size e.g. "Amber 21" -> "amber 21"
  const m = cleanName.match(/^([a-zA-Z]+)\s*(\d+)/);
  const familySizeKey = m ? `${m[1].toLowerCase()} ${m[2]}` : normalizedKey;

  // 1. Check if vector PDF crop is available in HUDSON_FLOORPLANS
  const plans = plansForDesign(cleanName);
  if (plans && plans.length > 0) {
    const planWithCrops = plans.find((p) => p.cropBoxes && p.cropBoxes.length > 0);
    if (planWithCrops) {
      try {
        const vectorDataUrl = await cropPdfFloorplan(planWithCrops);
        if (vectorDataUrl) return vectorDataUrl;
      } catch (e) {
        console.warn("Vector PDF crop failed for design:", cleanName, e);
      }
    }
  }

  // 2. Check local high-res 2000px-4000px PNG map
  if (LOCAL_FLOORPLAN_MAP[familySizeKey]) {
    return LOCAL_FLOORPLAN_MAP[familySizeKey];
  }
  if (LOCAL_FLOORPLAN_MAP[normalizedKey]) {
    return LOCAL_FLOORPLAN_MAP[normalizedKey];
  }

  // Check fuzzy key matching in LOCAL_FLOORPLAN_MAP
  for (const [key, path] of Object.entries(LOCAL_FLOORPLAN_MAP)) {
    if (key.includes(familySizeKey) || familySizeKey.includes(key)) {
      return path;
    }
  }

  // 3. Fallback to prepareFloorplan with plans[0]
  if (plans && plans[0]) {
    try {
      const enhanced = await prepareFloorplan(plans[0]);
      if (enhanced) return enhanced;
      return plans[0].url;
    } catch {
      return plans[0].url;
    }
  }

  return customFloorplanUrl || null;
}
