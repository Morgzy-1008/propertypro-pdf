import { recalculateRecipe, type CostRecipe, type RecipeComponent } from "./quoteRecipes";

export interface DatabuildPriceItem {
  itemCode: string;
  description: string;
  costCentre: string;
  unit: string;
  unitCost: number;
  supplier?: string;
  lastModified?: string;
}

export interface DatabuildComponentDiff {
  componentId: string;
  componentName: string;
  recipeId: string;
  recipeName: string;
  databuildCode: string;
  oldCost: number;
  newCost: number;
  costDifference: number;
  costPercentChange: number;
}

export interface DatabuildRecipeDiff {
  recipeId: string;
  recipeName: string;
  oldUnitRate: number;
  newUnitRate: number;
  rateDifference: number;
  ratePercentChange: number;
  affectedComponentsCount: number;
}

export interface DatabuildSyncReport {
  totalIncomingItems: number;
  matchedComponentsCount: number;
  unmatchedIncomingCount: number;
  affectedRecipesCount: number;
  recipeDiffs: DatabuildRecipeDiff[];
  componentDiffs: DatabuildComponentDiff[];
  updatedRecipes: CostRecipe[];
}

/**
 * Detects delimiter (comma, tab, semicolon) from header line.
 */
function detectDelimiter(line: string): string {
  const tabs = (line.match(/\t/g) || []).length;
  const commas = (line.match(/,/g) || []).length;
  const semis = (line.match(/;/g) || []).length;
  if (tabs > commas && tabs > semis) return "\t";
  if (semis > commas) return ";";
  return ",";
}

/**
 * Parses raw CSV line handling quoted entries containing delimiters.
 */
function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Normalizes header strings for flexible column matching.
 */
function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Parses Databuild Price Book CSV or TSV text into structured items.
 */
export function parseDatabuildCsv(csvText: string): {
  items: DatabuildPriceItem[];
  errors: string[];
  detectedDelimiter: string;
} {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const errors: string[] = [];
  if (lines.length < 2) {
    return { items: [], errors: ["File must contain at least a header row and one data row."], detectedDelimiter: "," };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseCsvLine(lines[0], delimiter).map(normalizeHeader);

  // Column index finders
  const codeIdx = headers.findIndex((h) =>
    h === "itemcode" || h === "code" || h === "item" || h === "codeitem" || h === "databuildcode"
  );
  const descIdx = headers.findIndex((h) =>
    h === "description" || h === "itemdescription" || h === "name" || h === "desc"
  );
  const costCentreIdx = headers.findIndex((h) =>
    h === "costcentre" || h === "costcentrecode" || h === "category" || h === "trade" || h === "tradecentre"
  );
  const unitIdx = headers.findIndex((h) =>
    h === "unit" || h === "uom" || h === "unitofmeasure" || h === "unittype"
  );
  const costIdx = headers.findIndex((h) =>
    h === "currentcost" || h === "cost" || h === "unitcost" || h === "rate" || h === "basecost" || h === "price"
  );
  const supplierIdx = headers.findIndex((h) =>
    h === "supplier" || h === "subcontractor" || h === "vendor"
  );

  if (codeIdx === -1 || costIdx === -1) {
    return {
      items: [],
      errors: [
        `Could not detect required columns. Header must include at least 'Item Code' and 'Cost/Rate'. Detected headers: ${headers.join(", ")}`,
      ],
      detectedDelimiter: delimiter,
    };
  }

  const items: DatabuildPriceItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawCols = parseCsvLine(lines[i], delimiter);
    if (rawCols.length <= Math.max(codeIdx, costIdx)) continue;

    const itemCode = (rawCols[codeIdx] || "").trim().toUpperCase();
    if (!itemCode) continue;

    const rawCostStr = (rawCols[costIdx] || "").replace(/[^0-9.-]+/g, "");
    const unitCost = parseFloat(rawCostStr);
    if (isNaN(unitCost) || unitCost < 0) {
      errors.push(`Row ${i + 1} (${itemCode}): Invalid numeric cost "${rawCols[costIdx]}"`);
      continue;
    }

    const description = descIdx !== -1 && rawCols[descIdx] ? rawCols[descIdx].trim() : itemCode;
    const costCentre = costCentreIdx !== -1 && rawCols[costCentreIdx] ? rawCols[costCentreIdx].trim() : "General Trade";
    const unit = unitIdx !== -1 && rawCols[unitIdx] ? rawCols[unitIdx].trim() : "$/m²";
    const supplier = supplierIdx !== -1 && rawCols[supplierIdx] ? rawCols[supplierIdx].trim() : undefined;

    items.push({
      itemCode,
      description,
      costCentre,
      unit,
      unitCost: Math.round(unitCost * 100) / 100,
      supplier,
    });
  }

  return { items, errors, detectedDelimiter: delimiter };
}

/**
 * Compares incoming Databuild price items against existing Cost Recipes.
 * Computes component cost variances and cascading recipe rate impacts.
 */
export function calculateDatabuildSyncReport(
  incomingItems: DatabuildPriceItem[],
  existingRecipes: CostRecipe[],
): DatabuildSyncReport {
  const codeMap = new Map<string, DatabuildPriceItem>();
  for (const item of incomingItems) {
    codeMap.set(item.itemCode.toUpperCase(), item);
    // Also index without punctuation (e.g. 0500TIL01 matching 0500-TIL-01)
    const stripped = item.itemCode.replace(/[^A-Z0-9]/gi, "").toUpperCase();
    if (!codeMap.has(stripped)) {
      codeMap.set(stripped, item);
    }
  }

  let matchedComponentsCount = 0;
  const componentDiffs: DatabuildComponentDiff[] = [];
  const recipeDiffs: DatabuildRecipeDiff[] = [];

  const updatedRecipes = existingRecipes.map((recipe) => {
    let recipeHasChanges = false;
    let recipeAffectedCount = 0;

    const updatedComponents = recipe.components.map((comp) => {
      if (!comp.databuildCode) return comp;

      const compCode = comp.databuildCode.toUpperCase();
      const compStripped = compCode.replace(/[^A-Z0-9]/gi, "");
      const matched = codeMap.get(compCode) || codeMap.get(compStripped);

      if (matched) {
        matchedComponentsCount++;
        const oldCost = comp.unitCost;
        const newCost = matched.unitCost;

        if (Math.abs(oldCost - newCost) > 0.01) {
          recipeHasChanges = true;
          recipeAffectedCount++;
          const diff = Math.round((newCost - oldCost) * 100) / 100;
          const pct = oldCost > 0 ? Math.round((diff / oldCost) * 1000) / 10 : 0;

          componentDiffs.push({
            componentId: comp.id,
            componentName: comp.name,
            recipeId: recipe.id,
            recipeName: recipe.name,
            databuildCode: comp.databuildCode,
            oldCost,
            newCost,
            costDifference: diff,
            costPercentChange: pct,
          });

          return {
            ...comp,
            unitCost: newCost,
            name: matched.description || comp.name,
            tradeCostCentre: matched.costCentre || comp.tradeCostCentre,
          };
        }
      }
      return comp;
    });

    if (recipeHasChanges) {
      const recalculated = recalculateRecipe({
        ...recipe,
        components: updatedComponents,
        lastSyncedDate: new Date().toISOString(),
      });

      const oldRate = recipe.calculatedUnitRate;
      const newRate = recalculated.calculatedUnitRate;
      const rateDiff = newRate - oldRate;
      const ratePct = oldRate > 0 ? Math.round((rateDiff / oldRate) * 1000) / 10 : 0;

      recipeDiffs.push({
        recipeId: recipe.id,
        recipeName: recipe.name,
        oldUnitRate: oldRate,
        newUnitRate: newRate,
        rateDifference: rateDiff,
        ratePercentChange: ratePct,
        affectedComponentsCount: recipeAffectedCount,
      });

      return recalculated;
    }

    return recipe;
  });

  return {
    totalIncomingItems: incomingItems.length,
    matchedComponentsCount,
    unmatchedIncomingCount: Math.max(0, incomingItems.length - matchedComponentsCount),
    affectedRecipesCount: recipeDiffs.length,
    recipeDiffs,
    componentDiffs,
    updatedRecipes,
  };
}

/**
 * Generates an official Hudson Homes standard Databuild Price Book CSV template for testing or initial sync.
 */
export function generateSampleDatabuildCsv(): string {
  const rows = [
    ["Item Code", "Description", "Cost Centre", "Unit", "Current Cost", "Supplier / Subcontractor"],
    ["0100-FRM-01", "90mm MGP10 Timber Wall Framing & Roof Trusses", "0100 Carpentry", "$/m²", "495.00", "Hudson Framing Pre-Fab"],
    ["0100-FRM-02", "90mm Internal Partition Framing & Villaboard Sheeting", "0100 Carpentry", "$/m²", "98.50", "Hudson Framing Pre-Fab"],
    ["0100-FRM-03", "2700mm MGP10 Stud Timber Extension Pack", "0100 Carpentry", "$/m²", "13.20", "Hudson Framing Pre-Fab"],
    ["0100-JST-01", "Engineered I-Joist Silent Floor System & Sheeting", "0100 Carpentry", "$/m²", "330.00", "Dindas Australia"],
    ["0120-CLD-01", "James Hardie Fine Texture Cladding & Vapor Wrap", "0120 Cladding & Facade", "$/m²", "268.00", "James Hardie Building Products"],
    ["0140-BRK-01", "Structural Face Brick Piers / Steel Posts", "0140 Brickwork", "$/m²", "162.00", "Austral Bricks NSW"],
    ["0140-BRK-02", "3 Additional Brick Courses & Mortar Bed", "0140 Brickwork", "$/m²", "10.50", "Austral Bricks NSW"],
    ["0150-INS-01", "Bradford R2.5 Wall & R4.0 Ceiling Insulation Batts", "0150 Insulation", "$/m²", "89.00", "CSR Bradford"],
    ["0200-CON-01", "25MPa Reinforced Engineered Concrete Slab (Class M)", "0200 Concreting", "$/m²", "272.00", "Holcim / Boral Concrete"],
    ["0200-CON-02", "Integrated 25MPa Concrete Slab to Alfresco", "0200 Concreting", "$/m²", "248.00", "Holcim / Boral Concrete"],
    ["0200-SCR-01", "Floor Sand & Cement Graded Screed Bedding", "0200 Concreting & Screed", "$/m²", "68.00", "Pro-Screed Sydney"],
    ["0250-ROF-01", "Bristile Classic Roof Tiles & Sarking", "0250 Roofing", "$/m²", "185.00", "Brickworks Building Products"],
    ["0250-ROF-02", "Under-Roof Framing Extension & Roof Tiles", "0250 Roofing", "$/m²", "202.00", "Brickworks Building Products"],
    ["0300-PLM-01", "Plumbing Rough-in Pipework & Floor Puddle Flanges", "0300 Plumbing", "lump_sum", "1250.00", "Hudson Plumbing Contractors"],
    ["0300-VAN-01", "1200mm Wall-Hung Poly Vanity with Stone Top & Basin", "0300 Plumbing & Fixtures", "fixed", "1520.00", "Reece Plumbing"],
    ["0300-SHW-02", "Dual Shower Station (Overhead Rainhead + Handpiece)", "0300 Plumbing & Fixtures", "fixed", "890.00", "Reece Plumbing"],
    ["0300-SAN-01", "Back-To-Wall Rimless Vitreous China Toilet Suite", "0300 Plumbing & Fixtures", "fixed", "640.00", "Caroma Australia"],
    ["0450-WP-01", "Davco K10 Plus Class III Polyurethane Waterproofing", "0450 Waterproofing", "$/m²", "48.00", "Sika Davco Australia"],
    ["0500-TIL-01", "600x600 Porcelain Floor & Wall Tiling (Supply & Lay)", "0500 Tiling", "$/m²", "89.00", "Beaumont Tiles Trade"],
    ["0500-TIL-02", "Full Height Wall Tiling Upgrade (2400mm Ceiling Height)", "0500 Tiling", "fixed", "1720.00", "Beaumont Tiles Trade"],
    ["0600-ELE-01", "3-in-1 Bathroom Exhaust Fan / Heatlamp Unit & Ducting", "0600 Electrical", "lump_sum", "680.00", "Hudson Electrical Contractors"],
    ["0600-ELE-02", "LED Backlit Vanity Mirror & Dual Downlights", "0600 Electrical", "fixed", "840.00", "Hudson Electrical Contractors"],
    ["0600-ELE-03", "Standard Electrical Circuits & LED Downlights Pack", "0600 Electrical", "$/m²", "145.00", "Hudson Electrical Contractors"],
    ["0700-PLS-01", "10mm Gyprock Linings, 90mm Cornice & 3-Coat Paint", "0700 Plaster & Paint", "$/m²", "225.00", "Dulux Trade & CSR Gyprock"],
    ["0700-PLS-02", "Acoustic Floor Lining, Villaboard Linings & Paint", "0700 Plaster & Paint", "$/m²", "255.00", "Dulux Trade & CSR Gyprock"],
    ["0700-PLS-03", "External Grade Plasterboard Ceiling & Dulux Weathershield", "0700 Plaster & Paint", "$/m²", "128.00", "Dulux Trade & CSR Gyprock"],
    ["0700-PLS-04", "Extra Plasterboard Area & Taller Linings (2.7m Ceilings)", "0700 Plaster & Paint", "$/m²", "9.80", "CSR Gyprock"],
    ["0700-PNT-01", "Aquachek Ceiling Board with Mould-Resistant Enamel", "0700 Plaster & Paint", "$/m²", "43.00", "Dulux Trade Paint"],
    ["0800-GLS-01", "10mm Semi-Frameless Toughened Glass Shower Enclosure", "0800 Glazing", "fixed", "1020.00", "Sydney Glass & Aluminium"],
    ["0900-SCF-01", "Upper Level Perimeter Steel Scaffolding Allowance", "0900 Scaffolding & Safety", "$/m²", "168.00", "SafeScaff Australia"],
  ];

  return rows.map((r) => r.map((cell) => `"${cell}"`).join(",")).join("\r\n");
}
