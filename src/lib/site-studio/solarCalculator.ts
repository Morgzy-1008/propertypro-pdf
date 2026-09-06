import { SolarAngles } from "@/components/site-studio/siteStudioTypes";

/**
 * Calculates solar orientation and winter sun angles for South East Queensland (Latitude ~27.5°S).
 * Winter morning sun (9:00 AM) and midday solar access are crucial for passive solar design under the NCC.
 */
export function calculateSolarOrientation(lotOrientationDeg = 0): SolarAngles {
  // Northern aspect analysis (0 deg = Due North)
  // Lot orientation: 0 deg = Street is South, Backyard is North (Ideal SEQ orientation)
  const relativeNorth = (360 - lotOrientationDeg) % 360;

  let notes = "Balanced orientation with good cross-ventilation.";
  if (relativeNorth >= 315 || relativeNorth <= 45) {
    notes = "Premium North-facing backyard: Captures optimal winter morning and midday sunlight into rear living and alfresco.";
  } else if (relativeNorth > 45 && relativeNorth <= 135) {
    notes = "East-facing rear yard: Enjoys crisp winter morning sun and cool shaded summer afternoons.";
  } else if (relativeNorth > 135 && relativeNorth <= 225) {
    notes = "South-facing rear yard: Living areas will benefit from front-facing windows or central courtyard skylights.";
  } else {
    notes = "West-facing rear yard: Recommend alfresco vertical privacy screening or tinting to mitigate low summer afternoon sun.";
  }

  return {
    morningWinterAzimuthDeg: 42,
    middayWinterAzimuthDeg: 0,
    afternoonWinterAzimuthDeg: 318,
    orientationNotes: notes,
  };
}
