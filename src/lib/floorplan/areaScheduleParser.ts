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
 * Handles numbered lists (e.g. "1. GROUND FLOOR LIVING AREA 172.33"),
 * tabular delimitations (tabs, colons, hyphens, spaces),
 * alternating multiline OCR (label on one line, value on the next),
 * columnar blocks, and flat inline text streams.
 */
export function parseAreaScheduleFromText(text: string): ExtractedAreaSchedule | null {
  if (!text) return null;

  const result: ExtractedAreaSchedule = { matchedLines: [], unassignedItems: [] };
  const seenZones = new Set<string>();

  // Helper to validate and assign zone values
  const assignZone = (label: string, val: number) => {
    if (isNaN(val) || val <= 0) return;
    // Auto-normalize if decimal dot dropped by PDF glyph encoding (e.g. 17233 -> 172.33)
    if (val > 800 && val < 100000) {
      val = Math.round((val / 100) * 100) / 100;
    }
    if (val < 0.5 || val > 1200) return;

    const lower = label.toLowerCase().trim();
    // Discard drawing title block noise
    if (
      lower.includes("scale") ||
      lower.includes("sheet") ||
      lower.includes("date") ||
      lower.includes("rev") ||
      lower.includes("drawing title") ||
      lower.includes("job no") ||
      lower.includes("lip") ||
      lower.includes("step") ||
      lower.includes("downpipe")
    ) {
      return;
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
      (lower.includes("ground") && lower.includes("living"))
    ) {
      if (!seenZones.has("ground_living")) {
        seenZones.add("ground_living");
        result.groundLivingM2 = (result.groundLivingM2 || 0) + val;
        result.matchedLines?.push(`${label} -> ${val}`);
      }
    } else if (
      lower.includes("first floor living") ||
      lower.includes("first living") ||
      lower.includes("upper living") ||
      (lower.includes("first floor") && lower.includes("living"))
    ) {
      if (!seenZones.has("first_living")) {
        seenZones.add("first_living");
        result.firstLivingM2 = val;
        result.matchedLines?.push(`${label} -> ${val}`);
      }
    } else if (
      lower.includes("living area") ||
      lower.includes("floor living area") ||
      lower.includes("floor living") ||
      lower.includes("internal living") ||
      lower.includes("residence") ||
      (lower.includes("living") && !lower.includes("outdoor") && !lower.includes("alfresco"))
    ) {
      if (!seenZones.has("living")) {
        seenZones.add("living");
        result.livingM2 = val;
        result.matchedLines?.push(`${label} -> ${val}`);
      }
    } else if (lower.includes("garage") || lower.includes("carport") || lower.includes("dlug")) {
      if (!seenZones.has("garage")) {
        seenZones.add("garage");
        result.garageM2 = val;
        result.matchedLines?.push(`${label} -> ${val}`);
      }
    } else if (
      lower.includes("alfresco") ||
      lower.includes("patio") ||
      lower.includes("outdoor living") ||
      lower.includes("verandah") ||
      lower.includes("terrace")
    ) {
      if (!seenZones.has("alfresco")) {
        seenZones.add("alfresco");
        result.alfrescoM2 = val;
        result.matchedLines?.push(`${label} -> ${val}`);
      }
    } else if (
      lower.includes("porch") ||
      lower.includes("portico") ||
      lower.includes("entry porch") ||
      lower.includes("covered entry")
    ) {
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
    } else if (lower.includes("width") || lower.includes("overall width") || lower.includes("house width")) {
      if (!seenZones.has("width")) {
        seenZones.add("width");
        result.widthM = val > 40 ? Math.round((val / 1000) * 100) / 100 : val;
      }
    } else if (lower.includes("length") || lower.includes("overall length") || lower.includes("house length") || lower.includes("depth")) {
      if (!seenZones.has("length")) {
        seenZones.add("length");
        result.lengthM = val > 60 ? Math.round((val / 1000) * 100) / 100 : val;
      }
    } else if (
      lower.includes("total") ||
      lower.includes("gross") ||
      lower.includes("gba") ||
      lower.includes("gfa") ||
      lower.includes("total area") ||
      lower.includes("total house") ||
      lower.includes("total covered") ||
      lower.includes("total slab")
    ) {
      if (!seenZones.has("total")) {
        seenZones.add("total");
        result.totalM2 = val;
        result.matchedLines?.push(`${label} -> ${val}`);
      }
    }
  };

  // Strategy 1: Targeted Key-Pattern Extraction across the entire text stream
  // Handles numbered prefixes: "1. GROUND FLOOR LIVING AREA 172.33", "2. GARAGE 37.58", etc.
  const targetedPatterns: Array<{ label: string; regex: RegExp }> = [
    {
      label: "Ground Floor Living Area",
      regex: /(?:^|[\r\n\s\t])(?:(?:\d+[\.\)]\s*)?(?:GROUND\s*FLOOR\s*LIVING(?:\s*AREA)?|GROUND\s*LIVING(?:\s*AREA)?|LOWER\s*GROUND\s*LIVING))\s*[:\t\-\s]*\s*(\d+(?:[.\u00B7\u2022]\d{1,3})?)/i,
    },
    {
      label: "First Floor Living Area",
      regex: /(?:^|[\r\n\s\t])(?:(?:\d+[\.\)]\s*)?(?:FIRST\s*FLOOR\s*LIVING(?:\s*AREA)?|UPPER\s*LIVING(?:\s*AREA)?|FIRST\s*LIVING))\s*[:\t\-\s]*\s*(\d+(?:[.\u00B7\u2022]\d{1,3})?)/i,
    },
    {
      label: "Floor Living Area",
      regex: /(?:^|[\r\n\s\t])(?:(?:\d+[\.\)]\s*)?(?:FLOOR\s*LIVING(?:\s*AREA)?|LIVING\s*AREA|INTERNAL\s*LIVING|RESIDENCE))\s*[:\t\-\s]*\s*(\d+(?:[.\u00B7\u2022]\d{1,3})?)/i,
    },
    {
      label: "Garage",
      regex: /(?:^|[\r\n\s\t])(?:(?:\d+[\.\)]\s*)?(?:DOUBLE\s*GARAGE|GARAGE(?:\s*[\+\/]\s*WORKSHOP)?|CARPORT|DLUG))\s*[:\t\-\s]*\s*(\d+(?:[.\u00B7\u2022]\d{1,3})?)/i,
    },
    {
      label: "Alfresco",
      regex: /(?:^|[\r\n\s\t])(?:(?:\d+[\.\)]\s*)?(?:COVERED\s*ALFRESCO|ALFRESCO(?:\s*AREA)?|OUTDOOR\s*LIVING|PATIO|VERANDAH?|TERRACE))\s*[:\t\-\s]*\s*(\d+(?:[.\u00B7\u2022]\d{1,3})?)/i,
    },
    {
      label: "Porch",
      regex: /(?:^|[\r\n\s\t])(?:(?:\d+[\.\)]\s*)?(?:ENTRY\s*PORCH|FRONT\s*PORCH|PORCH(?:\s*AREA)?|PORTICO|COVERED\s*ENTRY))\s*[:\t\-\s]*\s*(\d+(?:[.\u00B7\u2022]\d{1,3})?)/i,
    },
    {
      label: "Balcony",
      regex: /(?:^|[\r\n\s\t])(?:(?:\d+[\.\)]\s*)?(?:BALCONY(?:\s*AREA)?))\s*[:\t\-\s]*\s*(\d+(?:[.\u00B7\u2022]\d{1,3})?)/i,
    },
    {
      label: "Total Area",
      regex: /(?:^|[\r\n\s\t])(?:(?:\d+[\.\)]\s*)?(?:TOTAL\s*(?:HOUSE|COVERED|SLAB|AREA|GBA|GFA)?|GROSS\s*(?:BUILDING\s*)?AREA))\s*[:\t\-\s]*\s*(\d+(?:[.\u00B7\u2022]\d{1,3})?)/i,
    },
    {
      label: "Overall Width",
      regex: /(?:^|[\r\n\s\t])(?:(?:\d+[\.\)]\s*)?(?:OVERALL\s*WIDTH|HOUSE\s*WIDTH))\s*[:\t\-\s]*\s*(\d+(?:[.\u00B7\u2022]\d{1,3})?)/i,
    },
    {
      label: "Overall Length",
      regex: /(?:^|[\r\n\s\t])(?:(?:\d+[\.\)]\s*)?(?:OVERALL\s*LENGTH|HOUSE\s*LENGTH|DEPTH))\s*[:\t\-\s]*\s*(\d+(?:[.\u00B7\u2022]\d{1,3})?)/i,
    },
  ];

  for (const { label, regex } of targetedPatterns) {
    const match = text.match(regex);
    if (match && match[1]) {
      const val = parseFloat(match[1].replace(/[·•]/g, "."));
      if (!isNaN(val) && val > 0) {
        assignZone(label, val);
      }
    }
  }

  // Strategy 2: Line-by-Line Table Row Parser
  // Also tracks pendingLabel for alternating multiline OCR (label on line N, number on line N+1)
  let scheduleText = text;
  const areasIndex = text.search(
    /(?:FLOOR\s*AREAS|SCHEDULE\s*OF\s*AREAS|AREA\s*SCHEDULE|AREAS\s*[:(\n\r]|AREAS\b|Floor\s+Living\s+Area|Living\s+Area\s+Garage|Living\s+Area)/i
  );
  if (areasIndex !== -1) {
    scheduleText = text.slice(areasIndex);
  }

  const rawLines = scheduleText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let pendingLabel = "";

  for (const rawLine of rawLines) {
    // Numbered line format: "1. GROUND FLOOR LIVING AREA 172.33"
    const numberedRowMatch = rawLine.match(/^(?:(\d+)[\.\)]\s*)?([a-zA-Z\s\/\'\-]{3,40}?)\s*[:\t\-]*\s*(\d+(?:\.\d{1,3})?)\s*(?:m[²2]|sqm|\bm\b)?$/i);
    if (numberedRowMatch) {
      const label = numberedRowMatch[2].trim();
      const val = parseFloat(numberedRowMatch[3]);
      if (!isNaN(val) && val > 0) {
        assignZone(label, val);
        pendingLabel = "";
        continue;
      }
    }

    // Check if line contains tabs or separate cells
    const rawCells = rawLine.includes("\t")
      ? rawLine.split("\t").map((c) => c.trim()).filter(Boolean)
      : [rawLine];
    const cells = rawCells.map((c) => c.replace(/^\s*\d+(?:[\.\)]\s*|\s+)(?=[a-zA-Z])/g, "").trim());

    for (let c = 0; c < cells.length; c++) {
      const cell = cells[c];
      const prevCell = cells[c - 1] || "";

      if (/[xX*×]\s*\d/i.test(cell)) {
        continue; // Room dimension, not area
      }

      const numMatches = [...cell.matchAll(/\b\d+(?:\.\d{1,3})?\b/g)];
      if (numMatches.length > 0) {
        for (const m of numMatches) {
          const val = Number(m[0]);
          if (val >= 1.0 && val < 800 && val !== 2024 && val !== 2025 && val !== 2026 && val !== 2027 && val !== 2440 && val !== 2590 && val !== 2740) {
            let label = cell.replace(/\b\d+(?:\.\d{1,3})?\b/g, "").replace(/m²|sqm|m2|\bm\b/gi, "").trim();
            if (label.length < 3 && prevCell && !prevCell.match(/^\d+$/)) {
              label = prevCell;
            } else if (label.length < 3 && pendingLabel) {
              label = pendingLabel;
            }
            if (label) {
              assignZone(label, val);
              pendingLabel = "";
            }
          }
        }
      } else {
        // Line has text label but no number: store as pendingLabel for next line!
        const cleanText = cell.replace(/m²|sqm|m2|\bm\b/gi, "").trim();
        if (cleanText.length >= 3 && !cleanText.match(/^\d+$/)) {
          pendingLabel = cleanText;
        }
      }
    }
  }

  // Cross-Zone Normalization for Single Storey dwellings:
  // If groundLivingM2 was extracted and no firstLivingM2, livingM2 should equal groundLivingM2
  if (result.groundLivingM2 && !result.firstLivingM2 && !result.livingM2) {
    result.livingM2 = result.groundLivingM2;
  } else if (result.livingM2 && !result.groundLivingM2 && !result.firstLivingM2) {
    result.groundLivingM2 = result.livingM2;
  } else if (result.groundLivingM2 && result.firstLivingM2 && !result.livingM2) {
    result.livingM2 = Math.round((result.groundLivingM2 + result.firstLivingM2) * 100) / 100;
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
        if (!result.groundLivingM2) result.groundLivingM2 = derivedLiv;
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
