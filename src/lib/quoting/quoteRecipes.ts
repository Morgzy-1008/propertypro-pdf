import type { CatalogueCategory, CatalogueItem, UnitType } from "./quoteTypes";

export interface RecipeComponent {
  id: string;
  databuildCode?: string; // e.g. "0500-TIL-01", "0450-WP-02"
  name: string;
  tradeCostCentre: string; // e.g. "Tiling", "Waterproofing", "Plumbing", "Carpentry", "Concrete", "Electrical"
  unit: string; // "$/m²", "lump_sum", "$/lm", "hrs"
  unitCost: number; // Subcontractor / supplier base cost
  quantityMultiplier: number; // Consumption factor per recipe unit (e.g. 3.2 m² of tile per 1 m² of bathroom floor)
  notes?: string;
}

export interface CostRecipe {
  id: string;
  name: string;
  category: CatalogueCategory;
  description: string; // Client-friendly description for estimate/PDF
  unitType: UnitType;
  components: RecipeComponent[];
  builderMarginPercent: number; // e.g. 22% gross margin
  contingencyPercent: number; // e.g. 3% buffer
  calculatedDirectCost: number; // Raw trade sum: Σ(unitCost * quantityMultiplier)
  calculatedUnitRate: number; // Client-facing rate: directCost * (1 + (margin + contingency)/100)
  syncedCatalogueItemId?: string; // ID of CatalogueItem in quoteCatalogue this recipe updates
  lastSyncedDate?: string;
  isSystemDefault?: boolean;
}

/**
 * Calculates raw direct trade cost for a recipe before margin.
 */
export function calculateRecipeDirectCost(components: RecipeComponent[]): number {
  return components.reduce((acc, c) => acc + (c.unitCost * c.quantityMultiplier), 0);
}

/**
 * Calculates final client-facing unit rate incorporating builder margin & contingency.
 */
export function calculateRecipeUnitRate(
  directCost: number,
  builderMarginPercent: number = 22,
  contingencyPercent: number = 3,
): number {
  const totalMarkup = (builderMarginPercent + contingencyPercent) / 100;
  const rawRate = directCost * (1 + totalMarkup);
  // Round to nearest $5 or $10 for professional client quoting
  if (rawRate > 200) {
    return Math.round(rawRate / 10) * 10;
  }
  return Math.round(rawRate);
}

/**
 * Recalculates direct cost and unit rate for a single recipe.
 */
export function recalculateRecipe(recipe: CostRecipe): CostRecipe {
  const calculatedDirectCost = Math.round(calculateRecipeDirectCost(recipe.components) * 100) / 100;
  const calculatedUnitRate = calculateRecipeUnitRate(
    calculatedDirectCost,
    recipe.builderMarginPercent,
    recipe.contingencyPercent,
  );
  return {
    ...recipe,
    calculatedDirectCost,
    calculatedUnitRate,
  };
}

/**
 * Master Hudson Homes Cost Recipes & Assemblies
 * Real-world Australian residential construction trade breakdowns.
 */
export const DEFAULT_COST_RECIPES: CostRecipe[] = [
  {
    id: "recipe_bath_ext_m2",
    name: "Custom Bathroom / Wet Area Extension ($/m²)",
    category: "floorplan_extensions",
    description: "Full structural bathroom footprint extension including concrete slab prep, screed bed, Class III liquid membrane waterproofing, floor and full-height wall tiling, framing, and rough-in plumbing & electrical allowances.",
    unitType: "per_m2",
    builderMarginPercent: 22,
    contingencyPercent: 3,
    calculatedDirectCost: 1024,
    calculatedUnitRate: 1280,
    syncedCatalogueItemId: "str_custom_bathroom_ext_m2",
    isSystemDefault: true,
    components: [
      {
        id: "c_scr_01",
        databuildCode: "0200-SCR-01",
        name: "Floor Screed & Graded Bedding",
        tradeCostCentre: "Concreting & Screed",
        unit: "$/m²",
        unitCost: 65,
        quantityMultiplier: 1.0,
        notes: "Sand/cement graded screed to floor wastes",
      },
      {
        id: "c_wp_01",
        databuildCode: "0450-WP-01",
        name: "Class III Membrane Waterproofing",
        tradeCostCentre: "Waterproofing",
        unit: "$/m²",
        unitCost: 45,
        quantityMultiplier: 2.8,
        notes: "1m² floor + 1.8m² shower & splashback perimeters",
      },
      {
        id: "c_frm_01",
        databuildCode: "0100-FRM-02",
        name: "90mm Wall Framing & Villaboard Sheeting",
        tradeCostCentre: "Carpentry",
        unit: "$/m²",
        unitCost: 95,
        quantityMultiplier: 2.5,
        notes: "Wall studs and water-resistant lining boards",
      },
      {
        id: "c_til_01",
        databuildCode: "0500-TIL-01",
        name: "Ceramic / Porcelain Tiling (Supply & Lay)",
        tradeCostCentre: "Tiling",
        unit: "$/m²",
        unitCost: 85,
        quantityMultiplier: 3.2,
        notes: "Wall and floor tiles with grout and expansion joints",
      },
      {
        id: "c_plm_01",
        databuildCode: "0300-PLM-01",
        name: "Plumbing Rough-in & Puddle Flanges",
        tradeCostCentre: "Plumbing",
        unit: "lump_sum",
        unitCost: 1200,
        quantityMultiplier: 0.167, // Distributed over average 6m² bathroom ($200/m²)
        notes: "Water and drainage pipework allowance",
      },
      {
        id: "c_elec_01",
        databuildCode: "0600-ELE-01",
        name: "Electrical Exhaust Fan / 3-in-1 Heatlamp",
        tradeCostCentre: "Electrical",
        unit: "lump_sum",
        unitCost: 650,
        quantityMultiplier: 0.167, // Distributed over average 6m² bathroom ($108.55/m²)
        notes: "Ducting and dedicated circuit",
      },
      {
        id: "c_pnt_01",
        databuildCode: "0700-PNT-01",
        name: "Ceiling Lining, Cornice & Moisture Paint",
        tradeCostCentre: "Plaster & Paint",
        unit: "$/m²",
        unitCost: 40,
        quantityMultiplier: 1.0,
        notes: "Aquachek ceiling board with anti-mould paint",
      },
    ],
  },
  {
    id: "recipe_ensuite_luxury_kit",
    name: "Luxury Ensuite Addition Package (Complete Suite)",
    category: "internal_bathroom",
    description: "Complete luxury ensuite room addition including 1200mm vanity rough-in & supply, dual shower rose station, semi-frameless glass screen, back-to-wall toilet suite, full-height wall tiling, and chrome/matte black tapware.",
    unitType: "fixed",
    builderMarginPercent: 22,
    contingencyPercent: 3,
    calculatedDirectCost: 6350,
    calculatedUnitRate: 7940,
    syncedCatalogueItemId: "str_ensuite_luxury_kit",
    isSystemDefault: true,
    components: [
      {
        id: "c_ens_van",
        databuildCode: "0300-VAN-01",
        name: "1200mm Wall-Hung Poly Vanity & Basin",
        tradeCostCentre: "Plumbing & Fixtures",
        unit: "fixed",
        unitCost: 1450,
        quantityMultiplier: 1.0,
        notes: "Soft close drawers and stone top basin",
      },
      {
        id: "c_ens_shw",
        databuildCode: "0300-SHW-02",
        name: "Dual Shower Head & Thermostatic Mixer",
        tradeCostCentre: "Plumbing & Fixtures",
        unit: "fixed",
        unitCost: 850,
        quantityMultiplier: 1.0,
        notes: "Overhead rain head + hand shower attachment",
      },
      {
        id: "c_ens_scr",
        databuildCode: "0800-GLS-01",
        name: "Semi-Frameless 10mm Toughened Glass Screen",
        tradeCostCentre: "Glazing",
        unit: "fixed",
        unitCost: 980,
        quantityMultiplier: 1.0,
        notes: "Custom made polished edge shower enclosure",
      },
      {
        id: "c_ens_wc",
        databuildCode: "0300-SAN-01",
        name: "Vitreous China Back-To-Wall Toilet Suite",
        tradeCostCentre: "Plumbing & Fixtures",
        unit: "fixed",
        unitCost: 620,
        quantityMultiplier: 1.0,
        notes: "Soft close seat with dual flush cistern",
      },
      {
        id: "c_ens_til",
        databuildCode: "0500-TIL-02",
        name: "Full Height Porcelain Wall Tiling",
        tradeCostCentre: "Tiling",
        unit: "fixed",
        unitCost: 1650,
        quantityMultiplier: 1.0,
        notes: "Upgraded tiling to 2400mm ceiling height",
      },
      {
        id: "c_ens_ele",
        databuildCode: "0600-ELE-02",
        name: "LED Backlit Mirror & Twin LED Downlights",
        tradeCostCentre: "Electrical",
        unit: "fixed",
        unitCost: 800,
        quantityMultiplier: 1.0,
        notes: "Wiring and vanity accent lighting",
      },
    ],
  },
  {
    id: "recipe_living_ss_m2",
    name: "Custom Single Storey Living Footprint ($/m²)",
    category: "floorplan_extensions",
    description: "Custom ground floor enclosed living area extension based on H2 Builder specification, including 25MPa concrete slab, 90mm timber framing, R2.5 insulation batts, plasterboard, paint, standard wiring, and roofline extension.",
    unitType: "per_m2",
    builderMarginPercent: 20,
    contingencyPercent: 2,
    calculatedDirectCost: 1360,
    calculatedUnitRate: 1660,
    syncedCatalogueItemId: "str_custom_ss_h2",
    isSystemDefault: true,
    components: [
      {
        id: "c_ss_slb",
        databuildCode: "0200-CON-01",
        name: "25MPa Reinforced Engineered Concrete Slab",
        tradeCostCentre: "Concreting",
        unit: "$/m²",
        unitCost: 260,
        quantityMultiplier: 1.0,
        notes: "Thickened perimeter edge beam and SL82 mesh",
      },
      {
        id: "c_ss_frm",
        databuildCode: "0100-FRM-01",
        name: "Timber Wall Framing & Roof Trusses",
        tradeCostCentre: "Carpentry",
        unit: "$/m²",
        unitCost: 480,
        quantityMultiplier: 1.0,
        notes: "90mm MGP10 studs and engineered roof trusses",
      },
      {
        id: "c_ss_ins",
        databuildCode: "0150-INS-01",
        name: "Thermal & Acoustic Wall/Ceiling Insulation",
        tradeCostCentre: "Insulation",
        unit: "$/m²",
        unitCost: 85,
        quantityMultiplier: 1.0,
        notes: "R2.5 wall batts and R4.0 ceiling batts",
      },
      {
        id: "c_ss_pls",
        databuildCode: "0700-PLS-01",
        name: "Plasterboard Linings, Cornice & Painting",
        tradeCostCentre: "Plaster & Paint",
        unit: "$/m²",
        unitCost: 215,
        quantityMultiplier: 1.0,
        notes: "10mm Gyprock walls and ceilings, 3-coat paint",
      },
      {
        id: "c_ss_rf",
        databuildCode: "0250-ROF-01",
        name: "Roof Tiles / Colorbond & Gutters",
        tradeCostCentre: "Roofing",
        unit: "$/m²",
        unitCost: 180,
        quantityMultiplier: 1.0,
        notes: "Profile tiles, sarking, and Colorbond fascia/gutters",
      },
      {
        id: "c_ss_ele",
        databuildCode: "0600-ELE-03",
        name: "Standard Electrical & LED Downlights",
        tradeCostCentre: "Electrical",
        unit: "$/m²",
        unitCost: 140,
        quantityMultiplier: 1.0,
        notes: "Double GPO points and LED downlights per 10m²",
      },
    ],
  },
  {
    id: "recipe_living_ds_upper_m2",
    name: "Custom First Floor Living Footprint ($/m²)",
    category: "floorplan_extensions",
    description: "Upper floor structural living area framing, acoustic particleboard floor sheeting, external lightweight cladding/brickwork, insulation, ceiling linings, and roofline based on H2 Builder specification.",
    unitType: "per_m2",
    builderMarginPercent: 20,
    contingencyPercent: 2,
    calculatedDirectCost: 1475,
    calculatedUnitRate: 1800,
    syncedCatalogueItemId: "str_custom_ds_h2_ff",
    isSystemDefault: true,
    components: [
      {
        id: "c_ds_jst",
        databuildCode: "0100-JST-01",
        name: "Engineered I-Joist Floor System & Sheeting",
        tradeCostCentre: "Carpentry",
        unit: "$/m²",
        unitCost: 320,
        quantityMultiplier: 1.0,
        notes: "Silent floor joists and high density tongue & groove flooring",
      },
      {
        id: "c_ds_frm",
        databuildCode: "0100-FRM-02",
        name: "Upper Timber Wall Framing & Trusses",
        tradeCostCentre: "Carpentry",
        unit: "$/m²",
        unitCost: 490,
        quantityMultiplier: 1.0,
        notes: "90mm MGP10 wall framing and roof trusses",
      },
      {
        id: "c_ds_cld",
        databuildCode: "0120-CLD-01",
        name: "External Cladding & Weatherproof Membrane",
        tradeCostCentre: "Cladding & Facade",
        unit: "$/m²",
        unitCost: 260,
        quantityMultiplier: 1.0,
        notes: "Hardie Fine Texture or weatherboard cladding",
      },
      {
        id: "c_ds_pls",
        databuildCode: "0700-PLS-02",
        name: "Plasterboard, Acoustic Insulation & Paint",
        tradeCostCentre: "Plaster & Paint",
        unit: "$/m²",
        unitCost: 245,
        quantityMultiplier: 1.0,
        notes: "Acoustic floor insulation batts, wall linings, 3 coats paint",
      },
      {
        id: "c_ds_scf",
        databuildCode: "0900-SCF-01",
        name: "Upper Level Perimeter Scaffolding Allowance",
        tradeCostCentre: "Scaffolding & Safety",
        unit: "$/m²",
        unitCost: 160,
        quantityMultiplier: 1.0,
        notes: "WorkCover compliant safety rail and scaffold erection",
      },
    ],
  },
  {
    id: "recipe_alfresco_m2",
    name: "Custom Alfresco / Outdoor Entertaining ($/m²)",
    category: "floorplan_extensions",
    description: "Integrated reinforced concrete slab, structural brick piers or timber posts, roofline framing extension, external ceiling lining, and LED downlight for outdoor entertaining.",
    unitType: "per_m2",
    builderMarginPercent: 20,
    contingencyPercent: 2,
    calculatedDirectCost: 712,
    calculatedUnitRate: 869,
    syncedCatalogueItemId: "str_custom_porch_alfresco",
    isSystemDefault: true,
    components: [
      {
        id: "c_alf_slb",
        databuildCode: "0200-CON-02",
        name: "Integrated 25MPa Concrete Slab (Cored/Trowelled)",
        tradeCostCentre: "Concreting",
        unit: "$/m²",
        unitCost: 240,
        quantityMultiplier: 1.0,
        notes: "Rebate drop for external door sills",
      },
      {
        id: "c_alf_prs",
        databuildCode: "0140-BRK-01",
        name: "Structural Face Brick Piers / Steel Posts",
        tradeCostCentre: "Brickwork",
        unit: "$/m²",
        unitCost: 155,
        quantityMultiplier: 1.0,
        notes: "Tied to foundation with core filled reinforcing",
      },
      {
        id: "c_alf_rof",
        databuildCode: "0250-ROF-02",
        name: "Under-Roof Framing Extension & Tiles",
        tradeCostCentre: "Roofing",
        unit: "$/m²",
        unitCost: 195,
        quantityMultiplier: 1.0,
        notes: "Continuous roofline pitch matching house main body",
      },
      {
        id: "c_alf_clg",
        databuildCode: "0700-PLS-03",
        name: "External Grade Plaster Ceiling & LED Lighting",
        tradeCostCentre: "Plaster & Electrical",
        unit: "$/m²",
        unitCost: 122,
        quantityMultiplier: 1.0,
        notes: "Weather-resistant ceiling board with IP-rated downlight",
      },
    ],
  },
  {
    id: "recipe_ceiling_lift_m2",
    name: "2700mm Ground Floor Ceiling Height Lift ($/m² GFA)",
    category: "structural",
    description: "Upgrade from standard 2440mm to 2700mm (9ft) ground floor ceiling height throughout living areas, including taller wall studs, additional plasterboard height, extra brick courses, and structural engineering.",
    unitType: "per_m2",
    builderMarginPercent: 20,
    contingencyPercent: 2,
    calculatedDirectCost: 31,
    calculatedUnitRate: 38,
    syncedCatalogueItemId: "str_ceiling_2700_gf",
    isSystemDefault: true,
    components: [
      {
        id: "c_clg_std",
        databuildCode: "0100-FRM-03",
        name: "2700mm MGP10 Stud Framing Timber",
        tradeCostCentre: "Carpentry",
        unit: "$/m²",
        unitCost: 12.5,
        quantityMultiplier: 1.0,
        notes: "Extended stud heights and noggings throughout",
      },
      {
        id: "c_clg_brk",
        databuildCode: "0140-BRK-02",
        name: "3 Additional Brick Courses & Mortar",
        tradeCostCentre: "Brickwork",
        unit: "$/m²",
        unitCost: 9.5,
        quantityMultiplier: 1.0,
        notes: "Extra exterior brickwork perimeter courses",
      },
      {
        id: "c_clg_pls",
        databuildCode: "0700-PLS-04",
        name: "Extra Plasterboard Area & Taller Linings",
        tradeCostCentre: "Plaster & Paint",
        unit: "$/m²",
        unitCost: 9.0,
        quantityMultiplier: 1.0,
        notes: "Wide sheets and additional painting surface",
      },
    ],
  },
];

const STORAGE_KEY_RECIPES = "hudson_builders_estimate_recipes_v2";

/**
 * Load recipes from storage or initialize with defaults.
 */
export function loadCostRecipes(): CostRecipe[] {
  if (typeof window === "undefined") {
    return DEFAULT_COST_RECIPES.map((r) => recalculateRecipe(r));
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECIPES);
    if (!raw) {
      return DEFAULT_COST_RECIPES.map((r) => recalculateRecipe(r));
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_COST_RECIPES.map((r) => recalculateRecipe(r));
    }
    return parsed.map((r: CostRecipe) => recalculateRecipe(r));
  } catch {
    return DEFAULT_COST_RECIPES.map((r) => recalculateRecipe(r));
  }
}

/**
 * Save recipes to localStorage.
 */
export function saveCostRecipes(recipes: CostRecipe[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY_RECIPES, JSON.stringify(recipes));
}

/**
 * Reset recipes to default Hudson Homes master templates.
 */
export function resetCostRecipesToDefault(): CostRecipe[] {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY_RECIPES);
  }
  return DEFAULT_COST_RECIPES.map((r) => recalculateRecipe(r));
}

/**
 * Synchronizes calculated unit rates from recipes into the master Quoting Catalogue.
 * Ensures the Quoting Tool automatically uses updated recipe rates without manual typing!
 */
export function syncRecipesToCatalogue(
  recipes: CostRecipe[],
  catalogue: CatalogueItem[],
): { updatedCatalogue: CatalogueItem[]; updatedCount: number; updatedNames: string[] } {
  const recipeMap = new Map<string, CostRecipe>();
  for (const r of recipes) {
    if (r.syncedCatalogueItemId) {
      recipeMap.set(r.syncedCatalogueItemId, r);
    }
  }

  let updatedCount = 0;
  const updatedNames: string[] = [];

  const updatedCatalogue = catalogue.map((item) => {
    const matchedRecipe = recipeMap.get(item.id);
    if (matchedRecipe && matchedRecipe.calculatedUnitRate > 0) {
      if (item.unitRate !== matchedRecipe.calculatedUnitRate) {
        updatedCount++;
        updatedNames.push(`${item.name} ($${item.unitRate} ➔ $${matchedRecipe.calculatedUnitRate})`);
        return {
          ...item,
          unitRate: matchedRecipe.calculatedUnitRate,
          description: matchedRecipe.description || item.description,
        };
      }
    }
    return item;
  });

  return { updatedCatalogue, updatedCount, updatedNames };
}
