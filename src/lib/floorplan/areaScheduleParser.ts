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

  interface ScheduleCandidate extends ExtractedAreaSchedule {
    confidence: number;
    source: string;
  }

  const cleanNum = (raw: string, maxNormal = 800): number => {
    const cleaned = raw.replace(/[·•]/g, ".").replace(/,/g, "").trim();
    let val = parseFloat(cleaned);
    if (isNaN(val) || val <= 0) return 0;
    if (val > maxNormal && val < 100000) val = Math.round((val / 100) * 100) / 100;
    return val;
  };

  const evaluateCandidate = (c: ScheduleCandidate): number => {
    const living = c.livingM2 || ((c.groundLivingM2 || 0) + (c.firstLivingM2 || 0)) || 0;
    const compSum = living + (c.garageM2 || 0) + (c.alfrescoM2 || 0) + (c.porchM2 || 0) + (c.balconyM2 || 0);

    // Reject obvious noise
    if (living > 0 && living < 30) return 0;
    if (c.garageM2 && (c.garageM2 < 10 || c.garageM2 > 120)) return 0;
    if (c.porchM2 && c.porchM2 > 40) return 0;
    if (c.alfrescoM2 && c.alfrescoM2 > 100) return 0;

    let score = 0;
    if (living >= 40 && living <= 600) score += 30;
    if (c.garageM2 && c.garageM2 >= 14 && c.garageM2 <= 90) score += 20;
    if (c.alfrescoM2 && c.alfrescoM2 >= 2 && c.alfrescoM2 <= 80) score += 20;
    if (c.porchM2 && c.porchM2 >= 0.5 && c.porchM2 <= 30) score += 15;
    if (c.totalM2 && c.totalM2 >= 50 && c.totalM2 <= 1000) score += 20;

    if (c.totalM2 && compSum > 0) {
      const diff = Math.abs(compSum - c.totalM2);
      if (diff < 0.15) {
        score += 150; // Exact mathematical identity verified!
      } else if (diff < 1.0) {
        score += 50;
      }
    }
    return score;
  };

  const candidates: ScheduleCandidate[] = [];

  // =========================================================================
  // Pass 1: Localized Schedule of Areas Block Parsing
  // Searches for explicit schedule headers
  // =========================================================================
  const blockHeaderRegex = /(?:SCHEDULE\s*OF\s*AREAS|AREA\s*SCHEDULE|FLOOR\s*AREAS|AREAS\s*[:(]|AREAS\b)/gi;
  let bMatch: RegExpExecArray | null;

  while ((bMatch = blockHeaderRegex.exec(text)) !== null) {
    const startIdx = bMatch.index;
    const chunk = text.slice(startIdx, startIdx + 1200);
    const chunkLines = chunk.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    // 1A. Columnar list extraction (Sequence of zone labels followed by sequence of numbers)
    const zoneLabels: Array<{ zone: string; label: string; lineIdx: number }> = [];
    const numbersList: Array<{ val: number; line: string }> = [];

    for (let i = 0; i < chunkLines.length; i++) {
      const l = chunkLines[i];
      // Zone labels typically start with optional numbered prefixes (e.g. "1. GROUND FLOOR LIVING AREA")
      if (/(?:^|[\d+\.\)]\s*)(?:GROUND\s*FLOOR\s*LIVING(?:\s*AREA)?|GROUND\s*LIVING(?:\s*AREA)?|LOWER\s*LIVING|LOWER\s*GROUND)/i.test(l)) {
        zoneLabels.push({ zone: "groundLiving", label: l, lineIdx: i });
      } else if (/(?:^|[\d+\.\)]\s*)(?:FIRST\s*FLOOR\s*LIVING(?:\s*AREA)?|FIRST\s*LIVING(?:\s*AREA)?|UPPER\s*LIVING)/i.test(l)) {
        zoneLabels.push({ zone: "firstLiving", label: l, lineIdx: i });
      } else if (/(?:^|[\d+\.\)]\s*)(?:FLOOR\s*LIVING\s*AREA|LIVING\s*AREA|INTERNAL\s*LIVING|RESIDENCE)/i.test(l)) {
        zoneLabels.push({ zone: "living", label: l, lineIdx: i });
      } else if (/(?:^|[\d+\.\)]\s*)(?:DOUBLE\s*GARAGE|GARAGE)/i.test(l) && !/door|panel\s*lift|entry/i.test(l)) {
        zoneLabels.push({ zone: "garage", label: l, lineIdx: i });
      } else if (/(?:^|[\d+\.\)]\s*)(?:COVERED\s*ALFRESCO|ALFRESCO|OUTDOOR\s*LIVING|PATIO|VERANDAH?)/i.test(l) && !/door|stacker/i.test(l)) {
        zoneLabels.push({ zone: "alfresco", label: l, lineIdx: i });
      } else if (/(?:^|[\d+\.\)]\s*)(?:ENTRY\s*PORCH|PORCH|PORTICO)/i.test(l) && !/door|d1|entry\s*max/i.test(l)) {
        zoneLabels.push({ zone: "porch", label: l, lineIdx: i });
      } else if (/(?:^|[\d+\.\)]\s*)(?:BALCONY)/i.test(l)) {
        zoneLabels.push({ zone: "balcony", label: l, lineIdx: i });
      }

      // Check if line is a standalone area number: e.g. "172.33", "227.27 m²"
      const numMatch = l.match(/^(\d+(?:\.\d{1,3})?)\s*(?:m[²2]|sqm)?$/i);
      if (numMatch) {
        const v = cleanNum(numMatch[1]);
        if (v >= 0.5 && v <= 800) {
          numbersList.push({ val: v, line: l });
        }
      }
    }

    if (zoneLabels.length >= 3 && numbersList.length >= zoneLabels.length) {
      const cand: ScheduleCandidate = { matchedLines: [], confidence: 0, source: "block_columnar" };
      for (let k = 0; k < zoneLabels.length; k++) {
        const z = zoneLabels[k].zone;
        const val = numbersList[k].val;
        if (z === "groundLiving") cand.groundLivingM2 = val;
        else if (z === "firstLiving") cand.firstLivingM2 = val;
        else if (z === "living") cand.livingM2 = val;
        else if (z === "garage") cand.garageM2 = val;
        else if (z === "alfresco") cand.alfrescoM2 = val;
        else if (z === "porch") cand.porchM2 = val;
        else if (z === "balcony") cand.balconyM2 = val;
        cand.matchedLines?.push(`${zoneLabels[k].label} -> ${val}`);
      }
      if (numbersList.length > zoneLabels.length) {
        cand.totalM2 = numbersList[zoneLabels.length].val;
        cand.matchedLines?.push(`Total -> ${cand.totalM2}`);
      }
      cand.confidence = evaluateCandidate(cand);
      if (cand.confidence > 50) candidates.push(cand);
    }

    // 1B. Same-line / Tabular extraction within this schedule block
    const blockCand: ScheduleCandidate = { matchedLines: [], confidence: 0, source: "block_tabular" };
    for (const l of chunkLines) {
      const matchGround = l.match(/(?:^|[ \t])(?:(?:\d+[\.\)]\s*)?(?:GROUND\s*FLOOR\s*LIVING(?:\s*AREA)?|GROUND\s*LIVING(?:\s*AREA)?|LOWER\s*LIVING))[ \t:\-]+(\d+(?:\.\d{1,3})?)/i);
      if (matchGround && !blockCand.groundLivingM2) {
        blockCand.groundLivingM2 = cleanNum(matchGround[1]);
        blockCand.matchedLines?.push(`Ground Living -> ${blockCand.groundLivingM2}`);
      }

      const matchFirst = l.match(/(?:^|[ \t])(?:(?:\d+[\.\)]\s*)?(?:FIRST\s*FLOOR\s*LIVING(?:\s*AREA)?|UPPER\s*LIVING(?:\s*AREA)?|FIRST\s*LIVING))[ \t:\-]+(\d+(?:\.\d{1,3})?)/i);
      if (matchFirst && !blockCand.firstLivingM2) {
        blockCand.firstLivingM2 = cleanNum(matchFirst[1]);
        blockCand.matchedLines?.push(`First Living -> ${blockCand.firstLivingM2}`);
      }

      const matchLiving = l.match(/(?:^|[ \t])(?:(?:\d+[\.\)]\s*)?(?:FLOOR\s*LIVING(?:\s*AREA)?|INTERNAL\s*LIVING|LIVING\s*AREA|RESIDENCE))[ \t:\-]+(\d+(?:\.\d{1,3})?)/i);
      if (matchLiving && !blockCand.livingM2 && !blockCand.groundLivingM2) {
        blockCand.livingM2 = cleanNum(matchLiving[1]);
        blockCand.matchedLines?.push(`Living -> ${blockCand.livingM2}`);
      }

      const matchGarage = l.match(/(?:^|[ \t])(?:(?:\d+[\.\)]\s*)?(?:DOUBLE\s*GARAGE|GARAGE(?:\s*[\+\/]\s*WORKSHOP)?|DLUG))[ \t:\-]+(\d+(?:\.\d{1,3})?)/i);
      if (matchGarage && !blockCand.garageM2 && !/panel\s*lift|door|lip/i.test(l)) {
        blockCand.garageM2 = cleanNum(matchGarage[1]);
        blockCand.matchedLines?.push(`Garage -> ${blockCand.garageM2}`);
      }

      const matchAlf = l.match(/(?:^|[ \t])(?:(?:\d+[\.\)]\s*)?(?:COVERED\s*ALFRESCO|ALFRESCO(?:\s*AREA)?|OUTDOOR\s*LIVING|PATIO|VERANDAH?))[ \t:\-]+(\d+(?:\.\d{1,3})?)/i);
      if (matchAlf && !blockCand.alfrescoM2 && !/stacker|door|window/i.test(l)) {
        blockCand.alfrescoM2 = cleanNum(matchAlf[1]);
        blockCand.matchedLines?.push(`Alfresco -> ${blockCand.alfrescoM2}`);
      }

      const matchPorch = l.match(/(?:^|[ \t])(?:(?:\d+[\.\)]\s*)?(?:ENTRY\s*PORCH|FRONT\s*PORCH|PORCH(?:\s*AREA)?|PORTICO))[ \t:\-]+(\d+(?:\.\d{1,3})?)/i);
      if (matchPorch && !blockCand.porchM2 && !/door|d1|entry\s*max/i.test(l)) {
        blockCand.porchM2 = cleanNum(matchPorch[1]);
        blockCand.matchedLines?.push(`Porch -> ${blockCand.porchM2}`);
      }

      const matchTotal = l.match(/(?:^|[ \t])(?:(?:\d+[\.\)]\s*)?(?:TOTAL\s*(?:HOUSE|COVERED|SLAB|AREA|GBA|GFA)?|GROSS\s*(?:BUILDING\s*)?AREA))[ \t:\-]+(\d+(?:\.\d{1,3})?)/i);
      if (matchTotal && !blockCand.totalM2) {
        blockCand.totalM2 = cleanNum(matchTotal[1]);
        blockCand.matchedLines?.push(`Total -> ${blockCand.totalM2}`);
      }
    }

    blockCand.confidence = evaluateCandidate(blockCand);
    if (blockCand.confidence > 50) candidates.push(blockCand);
  }

  // =========================================================================
  // Pass 2: Global Line-by-Line Fallback (Only if no schedule block matched)
  // =========================================================================
  if (candidates.length === 0) {
    const globalCand: ScheduleCandidate = { matchedLines: [], confidence: 0, source: "global_fallback" };
    const allLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    for (const l of allLines) {
      if (/r\.?l\.?|pad|contour|boundary|setback|eng\.\s*details/i.test(l)) continue;

      const matchGround = l.match(/(?:^|[ \t])(?:(?:\d+[\.\)]\s*)?(?:GROUND\s*FLOOR\s*LIVING(?:\s*AREA)?|GROUND\s*LIVING(?:\s*AREA)?|LOWER\s*LIVING))[ \t:\-]+(\d+(?:\.\d{1,3})?)/i);
      if (matchGround && !globalCand.groundLivingM2) {
        const v = cleanNum(matchGround[1]);
        if (v >= 30 && v <= 500) {
          globalCand.groundLivingM2 = v;
          globalCand.matchedLines?.push(`Ground Living -> ${v}`);
        }
      }

      const matchFirst = l.match(/(?:^|[ \t])(?:(?:\d+[\.\)]\s*)?(?:FIRST\s*FLOOR\s*LIVING(?:\s*AREA)?|UPPER\s*LIVING(?:\s*AREA)?|FIRST\s*LIVING))[ \t:\-]+(\d+(?:\.\d{1,3})?)/i);
      if (matchFirst && !globalCand.firstLivingM2) {
        const v = cleanNum(matchFirst[1]);
        if (v >= 20 && v <= 500) {
          globalCand.firstLivingM2 = v;
          globalCand.matchedLines?.push(`First Living -> ${v}`);
        }
      }

      const matchLiving = l.match(/(?:^|[ \t])(?:(?:\d+[\.\)]\s*)?(?:FLOOR\s*LIVING(?:\s*AREA)?|INTERNAL\s*LIVING|LIVING\s*AREA|RESIDENCE))[ \t:\-]+(\d+(?:\.\d{1,3})?)/i);
      if (matchLiving && !globalCand.livingM2 && !globalCand.groundLivingM2) {
        const v = cleanNum(matchLiving[1]);
        if (v >= 40 && v <= 600) {
          globalCand.livingM2 = v;
          globalCand.matchedLines?.push(`Living -> ${v}`);
        }
      }

      const matchGarage = l.match(/(?:^|[ \t])(?:(?:\d+[\.\)]\s*)?(?:DOUBLE\s*GARAGE|GARAGE(?:\s*[\+\/]\s*WORKSHOP)?|DLUG))[ \t:\-]+(\d+(?:\.\d{1,3})?)/i);
      if (matchGarage && !globalCand.garageM2 && !/panel\s*lift|door|opening|step\s*free|lip/i.test(l)) {
        const v = cleanNum(matchGarage[1]);
        if (v >= 14 && v <= 100) {
          globalCand.garageM2 = v;
          globalCand.matchedLines?.push(`Garage -> ${v}`);
        }
      }

      const matchAlf = l.match(/(?:^|[ \t])(?:(?:\d+[\.\)]\s*)?(?:COVERED\s*ALFRESCO|ALFRESCO(?:\s*AREA)?|OUTDOOR\s*LIVING|PATIO|VERANDAH?))[ \t:\-]+(\d+(?:\.\d{1,3})?)/i);
      if (matchAlf && !globalCand.alfrescoM2 && !/stacker|door|window|opening|bbq|kitchen/i.test(l)) {
        const v = cleanNum(matchAlf[1]);
        if (v >= 2 && v <= 80) {
          globalCand.alfrescoM2 = v;
          globalCand.matchedLines?.push(`Alfresco -> ${v}`);
        }
      }

      const matchPorch = l.match(/(?:^|[ \t])(?:(?:\d+[\.\)]\s*)?(?:ENTRY\s*PORCH|FRONT\s*PORCH|PORCH(?:\s*AREA)?|PORTICO))[ \t:\-]+(\d+(?:\.\d{1,3})?)/i);
      if (matchPorch && !globalCand.porchM2 && !/door|d1|entry\s*max|step|opening/i.test(l)) {
        const v = cleanNum(matchPorch[1]);
        if (v >= 0.5 && v <= 30) {
          globalCand.porchM2 = v;
          globalCand.matchedLines?.push(`Porch -> ${v}`);
        }
      }

      const matchTotal = l.match(/(?:^|[ \t])(?:(?:\d+[\.\)]\s*)?(?:TOTAL\s*(?:HOUSE|COVERED|SLAB|AREA|GBA|GFA)?|GROSS\s*(?:BUILDING\s*)?AREA))[ \t:\-]+(\d+(?:\.\d{1,3})?)/i);
      if (matchTotal && !globalCand.totalM2) {
        const v = cleanNum(matchTotal[1]);
        if (v >= 50 && v <= 1000) {
          globalCand.totalM2 = v;
          globalCand.matchedLines?.push(`Total -> ${v}`);
        }
      }
    }

    globalCand.confidence = evaluateCandidate(globalCand);
    if (globalCand.confidence > 40) candidates.push(globalCand);
  }

  // Select best candidate
  candidates.sort((a, b) => b.confidence - a.confidence);
  if (candidates.length === 0) return null;

  const best = candidates[0];

  // Cross-Zone Normalization
  if (best.groundLivingM2 && !best.firstLivingM2 && !best.livingM2) {
    best.livingM2 = best.groundLivingM2;
  } else if (best.livingM2 && !best.groundLivingM2 && !best.firstLivingM2) {
    best.groundLivingM2 = best.livingM2;
  } else if (best.groundLivingM2 && best.firstLivingM2 && !best.livingM2) {
    best.livingM2 = Math.round((best.groundLivingM2 + best.firstLivingM2) * 100) / 100;
  }

  // Dimensions
  const wMatch = text.match(/(?:^|[ \t])(?:OVERALL\s*WIDTH|HOUSE\s*WIDTH)[ \t:\-]+(\d+(?:\.\d+)?)/i);
  if (wMatch) {
    const rawW = parseFloat(wMatch[1]);
    best.widthM = rawW > 40 ? Math.round((rawW / 1000) * 100) / 100 : rawW;
  }
  const lMatch = text.match(/(?:^|[ \t])(?:OVERALL\s*LENGTH|HOUSE\s*LENGTH|DEPTH)[ \t:\-]+(\d+(?:\.\d+)?)/i);
  if (lMatch) {
    const rawL = parseFloat(lMatch[1]);
    best.lengthM = rawL > 60 ? Math.round((rawL / 1000) * 100) / 100 : rawL;
  }

  // Mathematical Identity Solver for missing 4th zone
  if (best.totalM2 && best.totalM2 > 50) {
    const tot = best.totalM2;
    const liv = best.livingM2 || best.groundLivingM2 || 0;
    const gar = best.garageM2 || 0;
    const alf = best.alfrescoM2 || 0;
    const por = best.porchM2 || 0;
    const bal = best.balconyM2 || 0;

    if (!best.alfrescoM2 && liv && gar && por) {
      const solved = Math.round((tot - (liv + gar + por + bal)) * 100) / 100;
      if (solved >= 2 && solved <= 80) best.alfrescoM2 = solved;
    } else if (!best.porchM2 && liv && gar && alf) {
      const solved = Math.round((tot - (liv + gar + alf + bal)) * 100) / 100;
      if (solved >= 0.5 && solved <= 30) best.porchM2 = solved;
    } else if (!best.garageM2 && liv && alf && por) {
      const solved = Math.round((tot - (liv + alf + por + bal)) * 100) / 100;
      if (solved >= 14 && solved <= 100) best.garageM2 = solved;
    } else if (!best.livingM2 && gar && alf && por) {
      const solved = Math.round((tot - (gar + alf + por + bal)) * 100) / 100;
      if (solved >= 40 && solved <= 600) {
        best.livingM2 = solved;
        if (!best.groundLivingM2) best.groundLivingM2 = solved;
      }
    }
  }

  const compSum =
    (best.livingM2 || (best.groundLivingM2 || 0) + (best.firstLivingM2 || 0)) +
    (best.garageM2 || 0) +
    (best.alfrescoM2 || 0) +
    (best.porchM2 || 0) +
    (best.balconyM2 || 0);

  if (compSum > 0 || (best.totalM2 && best.totalM2 > 0)) {
    if (!best.totalM2) {
      best.totalM2 = Number(compSum.toFixed(2));
    }
    return {
      livingM2: best.livingM2,
      groundLivingM2: best.groundLivingM2,
      firstLivingM2: best.firstLivingM2,
      garageM2: best.garageM2,
      alfrescoM2: best.alfrescoM2,
      porchM2: best.porchM2,
      balconyM2: best.balconyM2,
      totalM2: best.totalM2,
      widthM: best.widthM,
      lengthM: best.lengthM,
      matchedLines: best.matchedLines || [],
      unassignedItems: [],
    };
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
