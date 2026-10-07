/**
 * Area Schedule & Zone Dimension Parser
 * Specialized for PDF floorplans exported from the site's Floorplan Editor
 * and architectural drawings.
 *
 * Implements Layer 1 (Tabular Area Schedule) and Layer 2 (Zone Room Dimensions).
 */

export interface ExtractedAreaSchedule {
  livingM2?: number;
  groundLivingM2?: number;
  firstLivingM2?: number;
  garageM2?: number;
  alfrescoM2?: number;
  porchM2?: number;
  balconyM2?: number;
  totalM2?: number;
  widthM?: number;
  lengthM?: number;
  matchedLines?: string[];
  unassignedItems?: { label: string; sqm: number; originalLine: string }[];
}

export interface ZoneDimension {
  roomName: string;
  widthM: number;
  lengthM: number;
  calculatedM2: number;
  rawString: string;
}

/**
 * Parses the tabular Schedule of Areas block with coordinate/row tolerance.
 * Handles split superscripts (e.g. "196.35 m\t2"), table delimiters, and abbreviations.
 */
export function parseAreaScheduleFromText(text: string): ExtractedAreaSchedule | null {
  if (!text) return null;

  // 1. Locate dedicated Schedule of Areas / Floor Areas table block if present
  let scheduleText = text;
  const areasIndex = text.search(
    /(?:FLOOR\s*AREAS|SCHEDULE\s*OF\s*AREAS|AREA\s*SCHEDULE|AREAS\s*[:(\n\r]|AREAS\b|Floor\s+Living\s+Area|Living\s+Area\s+Garage|Living\s+Area)/i
  );
  if (areasIndex !== -1) {
    const afterAreas = text.slice(areasIndex);
    const totalMatch = afterAreas.search(
      /(?:TOTAL\s*(?:AREA)?\s*[\d.]+\s*m²|TOTAL\s*[:\s]*[\d.]+|[\d.]+\s*m²\s*TOTAL|Total\s+Area)/i
    );
    if (totalMatch !== -1) {
      const endOfTotal = afterAreas.indexOf("\n", totalMatch + 20);
      scheduleText = afterAreas.slice(0, endOfTotal !== -1 ? endOfTotal : totalMatch + 120);
    } else {
      scheduleText = afterAreas.slice(0, 1800);
    }
  }

  // Support both newline-delimited and inline keyword-separated text streams
  let lines = scheduleText.split(/\r?\n/);
  if (lines.length <= 2 && scheduleText.length > 30) {
    // Split on schedule keywords so flat text streams become clean lines
    lines = scheduleText
      .split(/(?=(?:Living\s*Area|Floor\s*Living\s*Area|Garage|Alfresco|Porch|Balcony|Total\s*Area|Overall\s*Width|Overall\s*Length)\b)/i)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const result: ExtractedAreaSchedule = { matchedLines: [], unassignedItems: [] };
  const seenZones = new Set<string>();

  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;

    // Check if line contains tab characters from coordinate column sorting
    const rawCells = cleanLine.includes("\t")
      ? cleanLine.split("\t").map((c) => c.trim()).filter(Boolean)
      : [cleanLine];
    const cells = rawCells.map((c) => c.replace(/^\s*\d+(?:[\.\)]\s*|\s+)(?=[a-zA-Z])/g, "").trim());

    for (let c = 0; c < cells.length; c++) {
      const cell = cells[c];
      const prevCell = cells[c - 1] || "";

      // Extract numbers (ignoring numbers that are room dimension pairs like 5.7x 5.7 or 1.8 x 2.2)
      if (/[xX*×]\s*\d/i.test(cell)) {
        continue; // This is a dimension (width x length), NOT an area!
      }

      const numMatches = [...cell.matchAll(/\b\d+(?:\.\d{1,3})?\b/g)];
      for (const m of numMatches) {
        const val = Number(m[0]);
        // Filter out years and standard ceiling heights
        if (
          val >= 1.0 &&
          val < 800 &&
          val !== 2024 &&
          val !== 2025 &&
          val !== 2026 &&
          val !== 2027 &&
          val !== 2440 &&
          val !== 2590 &&
          val !== 2740
        ) {
          let label = cell.replace(/\b\d+(?:\.\d{1,3})?\b/g, "").replace(/m²|sqm|m2|\bm\b/gi, "").trim();
          if (label.length < 3 && prevCell && !prevCell.match(/^\d+$/)) {
            label = prevCell;
          }

          if (label) {
            const lower = label.toLowerCase();
            // Discard noise
            if (
              lower.includes("scale") ||
              lower.includes("sheet") ||
              lower.includes("date") ||
              lower.includes("rev") ||
              lower.includes("drawing title") ||
              lower.includes("lip") ||
              lower.includes("step")
            ) {
              continue;
            }

            if (lower.includes("lower ground") || lower.includes("lower floor") || lower.includes("lower living")) {
              if (!seenZones.has("lower_ground")) {
                seenZones.add("lower_ground");
                result.groundLivingM2 = (result.groundLivingM2 || 0) + val;
                result.matchedLines?.push(`${label} -> ${val}`);
              }
            } else if (
              lower.includes("ground floor living") ||
              lower.includes("ground living") ||
              (lower.includes("ground floor") && lower.includes("living"))
            ) {
              if (!seenZones.has("ground_living")) {
                seenZones.add("ground_living");
                result.groundLivingM2 = (result.groundLivingM2 || 0) + val;
                result.matchedLines?.push(`${label} -> ${val}`);
              }
            } else if (lower.includes("first floor living") || lower.includes("first living") || lower.includes("upper living")) {
              if (!seenZones.has("first_living")) {
                seenZones.add("first_living");
                result.firstLivingM2 = val;
                result.matchedLines?.push(`${label} -> ${val}`);
              }
            } else if (
              lower.includes("living area") ||
              lower.includes("floor living area") ||
              lower.includes("internal living") ||
              (lower.includes("living") && !lower.includes("outdoor") && !lower.includes("alfresco"))
            ) {
              if (!seenZones.has("living")) {
                seenZones.add("living");
                result.livingM2 = val;
                result.matchedLines?.push(`${label} -> ${val}`);
              }
            } else if (lower.includes("garage") || lower.includes("carport")) {
              if (!seenZones.has("garage")) {
                seenZones.add("garage");
                result.garageM2 = val;
                result.matchedLines?.push(`${label} -> ${val}`);
              }
            } else if (lower.includes("alfresco") || lower.includes("patio") || lower.includes("outdoor")) {
              if (!seenZones.has("alfresco")) {
                seenZones.add("alfresco");
                result.alfrescoM2 = val;
                result.matchedLines?.push(`${label} -> ${val}`);
              }
            } else if (lower.includes("porch") || lower.includes("portico") || lower.includes("entry porch")) {
              if (!seenZones.has("porch")) {
                seenZones.add("porch");
                result.porchM2 = val;
                result.matchedLines?.push(`${label} -> ${val}`);
              }
            } else if (lower.includes("balcony")) {
              if (!seenZones.has("balcony")) {
                seenZones.add("balcony");
                result.balconyM2 = val;
                result.matchedLines?.push(`${label} -> ${val}`);
              }
            } else if (lower.includes("overall width") || lower.includes("house width")) {
              if (!seenZones.has("width")) {
                seenZones.add("width");
                result.widthM = val;
              }
            } else if (lower.includes("overall length") || lower.includes("house length")) {
              if (!seenZones.has("length")) {
                seenZones.add("length");
                result.lengthM = val;
              }
            } else if (lower.includes("total") || lower.includes("gfa") || lower.includes("gross")) {
              if (!seenZones.has("total")) {
                seenZones.add("total");
                result.totalM2 = val;
                result.matchedLines?.push(`${label} -> ${val}`);
              }
            }
          }
        }
      }
    }
  }

  // Mathematical Identity Solver: Total = Living + Garage + Alfresco + Porch + Balcony
  if (result.totalM2 && result.totalM2 > 50) {
    const tot = result.totalM2;
    const liv = result.livingM2 || ((result.groundLivingM2 || 0) + (result.firstLivingM2 || 0)) || undefined;
    const gar = result.garageM2;
    const alf = result.alfrescoM2;
    const por = result.porchM2;
    const bal = result.balconyM2 || 0;

    if (!alf && liv && gar && por) {
      const derivedAlf = Math.round((tot - (liv + gar + por + bal)) * 100) / 100;
      if (derivedAlf > 2 && derivedAlf < 80) {
        result.alfrescoM2 = derivedAlf;
      }
    } else if (!por && liv && gar && alf) {
      const derivedPor = Math.round((tot - (liv + gar + alf + bal)) * 100) / 100;
      if (derivedPor > 0.5 && derivedPor < 30) {
        result.porchM2 = derivedPor;
      }
    } else if (!gar && liv && alf && por) {
      const derivedGar = Math.round((tot - (liv + alf + por + bal)) * 100) / 100;
      if (derivedGar > 10 && derivedGar < 120) {
        result.garageM2 = derivedGar;
      }
    } else if (!liv && gar && alf && por) {
      const derivedLiv = Math.round((tot - (gar + alf + por + bal)) * 100) / 100;
      if (derivedLiv > 50 && derivedLiv < 500) {
        result.livingM2 = derivedLiv;
      }
    }
  }

  const compSum =
    (result.livingM2 || (result.groundLivingM2 || 0) + (result.firstLivingM2 || 0)) +
    (result.garageM2 || 0) +
    (result.alfrescoM2 || 0) +
    (result.porchM2 || 0) +
    (result.balconyM2 || 0);

  if (compSum > 0 || (result.totalM2 && result.totalM2 > 0)) {
    if (!result.totalM2) {
      result.totalM2 = Number(compSum.toFixed(2));
    }
    return result;
  }

  return null;
}

/**
 * Extracts room dimension annotations from the drawing stream (Layer 2).
 * Examples: "Double Garage 5.7x 5.7", "Alfresco 3.4 x 3.1", "Bed 4 3.0 x 2.8".
 */
export function extractZoneDimensionsFromText(rawText: string): ZoneDimension[] {
  const dimensions: ZoneDimension[] = [];
  if (!rawText) return dimensions;

  // Pattern: <Room Name> followed by <W> x <L> or numbers across adjacent lines
  const roomPattern = /(?:(double\s*garage|garage|alfresco|porch|living\s*\/?\s*media|living|family|dining|meals|kitchen|bed\s*\d+|master\s*bed|study\s*nook|activity\s*area|children'?s\s*activity\s*area))[\s\t\n:]*(\d+(?:\.\d+)?)\s*(?:[xX*×]|by)\s*(\d+(?:\.\d+)?)/gi;

  let match: RegExpExecArray | null;
  while ((match = roomPattern.exec(rawText)) !== null) {
    const roomName = match[1].trim();
    const w = parseFloat(match[2]);
    const l = parseFloat(match[3]);
    if (!isNaN(w) && !isNaN(l) && w > 0.5 && l > 0.5 && w < 30 && l < 30) {
      dimensions.push({
        roomName,
        widthM: w,
        lengthM: l,
        calculatedM2: Math.round(w * l * 100) / 100,
        rawString: match[0],
      });
    }
  }

  return dimensions;
}
