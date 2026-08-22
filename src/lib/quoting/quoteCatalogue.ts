import type { CatalogueCategory, CatalogueItem } from "./quoteTypes";

export const DEFAULT_CUSTOM_RATES = {
  singleGroundLivingM2Rate: 1580,
  doubleGroundLivingM2Rate: 1720,
  doubleUpperLivingM2Rate: 2050,
  ancillaryM2Rate: 1050, // Garage, Alfresco, Porch
  doubleScaffoldingAllowance: 8500,
};

export const CATEGORY_LABELS: Record<CatalogueCategory, string> = {
  structural: "Structural Modifications",
  doors_windows: "Doors and Windows",
  external: "Floorplan Modifications - External",
  internal_kitchen: "Internal - Kitchen",
  internal_bathroom: "Internal - Bathroom",
  internal_bedrooms: "Internal - Bedrooms",
  internal_laundry: "Internal - Laundry",
  colour_upgrades: "Colour & Finish Upgrades",
  site_earthworks: "Site Specific Requirements",
  council_statutory: "Council / Statutory Requirements",
};

/**
 * Starter catalogue items pre-populated with $0 prices and concise client briefs.
 * Sales consultants & admins can set custom rates anytime in the Admin Catalogue.
 */
export const DEFAULT_CATALOGUE: CatalogueItem[] = [
  // Structural
  {
    id: "str_raked_ceiling",
    category: "structural",
    name: "Raked Ceiling with Scissor Trusses",
    description: "Provide architectural raked ceiling with engineered scissor trusses to main Living / Dining areas.",
    unitType: "fixed",
    unitRate: 0,
    isClientSelectable: true,
  },
  {
    id: "str_2740_ceilings",
    category: "structural",
    name: "2,740mm (9'0\") High Ceilings to Ground Floor",
    description: "Upgrade from standard ceiling height to 2,740mm ground floor framing and taller internal plasterboard.",
    unitType: "fixed",
    unitRate: 0,
    isClientSelectable: true,
  },
  {
    id: "str_hebel_powerpanel",
    category: "structural",
    name: "CSR Hebel Autoclaved Aerated Concrete Cladding",
    description: "High thermal & acoustic Hebel powerpanel system finished with Dulux textured acrylic render.",
    unitType: "fixed",
    unitRate: 0,
    isClientSelectable: true,
  },
  {
    id: "str_extended_garage",
    category: "structural",
    name: "Garage Width Extension (per m²)",
    description: "Extend garage floor footprint including additional slab, roof trusses and brickwork.",
    unitType: "per_m2",
    unitRate: 0,
    isClientSelectable: true,
  },

  // Doors & Windows
  {
    id: "dw_stacker_door",
    category: "doors_windows",
    name: "Aluminium Stacker Sliding Door to Alfresco",
    description: "Upgrade standard sliding door to 3-panel aluminium stacker door for seamless indoor-outdoor flow.",
    unitType: "fixed",
    unitRate: 0,
    isClientSelectable: true,
  },
  {
    id: "dw_2340_internal_doors",
    category: "doors_windows",
    name: "2,340mm High Internal Doors Throughout",
    description: "Upgrade standard internal doors to luxury 2,340mm high painted Hume Linear doors.",
    unitType: "fixed",
    unitRate: 0,
    isClientSelectable: true,
  },
  {
    id: "dw_double_glazed",
    category: "doors_windows",
    name: "Double Glazed Windows Upgrade (Whole of Home)",
    description: "Acoustic and thermal double glazed windows to reduce noise and lower energy bills.",
    unitType: "fixed",
    unitRate: 0,
    isClientSelectable: true,
  },
  {
    id: "dw_front_door_1200",
    category: "doors_windows",
    name: "1,200mm Wide Stain Grade Solid Timber Front Entry Door",
    description: "Wide architectural front entry door with translucent glazing, stain finish and pull handle.",
    unitType: "fixed",
    unitRate: 0,
    isClientSelectable: true,
  },

  // External
  {
    id: "ext_extended_alfresco",
    category: "external",
    name: "Under-Roof Alfresco Slab & Roofline Extension",
    description: "Extend concrete slab and roofline over alfresco for additional outdoor entertaining space.",
    unitType: "per_m2",
    unitRate: 0,
    isClientSelectable: true,
  },
  {
    id: "ext_acrylic_render_facade",
    category: "external",
    name: "Full Acrylic Render to Front Facade",
    description: "Apply multi-coat Dulux acrylic render finish to front elevation brickwork.",
    unitType: "fixed",
    unitRate: 0,
    isClientSelectable: true,
  },
  {
    id: "ext_external_gas_point",
    category: "external",
    name: "External BBQ Gas Point to Alfresco",
    description: "Run natural or LPG gas connection point with bayonet fitting to alfresco.",
    unitType: "fixed",
    unitRate: 0,
    isClientSelectable: true,
  },

  // Kitchen
  {
    id: "kit_waterfall_ends",
    category: "internal_kitchen",
    name: "40mm Stone Waterfall Benchtop Ends (Pair)",
    description: "Manufactured 40mm stone waterfall edges dropped down to floor on island bench.",
    unitType: "fixed",
    unitRate: 0,
    isClientSelectable: true,
  },
  {
    id: "kit_butlers_pantry",
    category: "internal_kitchen",
    name: "Butler's Pantry Fitout with Undermount Sink & Stone",
    description: "Base cabinets, stone benchtop, overhead shelving and undermount prep sink with mixer tap.",
    unitType: "fixed",
    unitRate: 0,
    isClientSelectable: true,
  },
  {
    id: "kit_induction_cooktop",
    category: "internal_kitchen",
    name: "Fisher & Paykel 900mm Induction Cooktop Upgrade",
    description: "Precision induction cooktop with smart zone controls in lieu of standard gas/electric.",
    unitType: "fixed",
    unitRate: 0,
    isClientSelectable: true,
  },
  {
    id: "kit_soft_close_drawers",
    category: "internal_kitchen",
    name: "Additional Bank of 3 Pot Drawers (Soft Close)",
    description: "Full extension soft-closing pot drawers with matching laminated fronts.",
    unitType: "fixed",
    unitRate: 0,
    isClientSelectable: true,
  },

  // Bathroom
  {
    id: "bath_freestanding_tub",
    category: "internal_bathroom",
    name: "Caroma Aura 1,775mm Freestanding Bathtub",
    description: "Luxury freestanding acrylic bath in lieu of standard inset hob bath.",
    unitType: "fixed",
    unitRate: 0,
    isClientSelectable: true,
  },
  {
    id: "bath_frameless_screen",
    category: "internal_bathroom",
    name: "10mm Frameless Glass Shower Screen (Ensuite)",
    description: "Architectural 10mm clear toughened frameless glass shower screen with chrome hinges.",
    unitType: "fixed",
    unitRate: 0,
    isClientSelectable: true,
  },
  {
    id: "bath_tiled_niche",
    category: "internal_bathroom",
    name: "Tiled Shower Recess Niche (300 x 600mm)",
    description: "Recessed wall niche finished with feature ceramic tiles and chrome edge trim.",
    unitType: "fixed",
    unitRate: 0,
    isClientSelectable: true,
  },
  {
    id: "bath_full_height_tiles",
    category: "internal_bathroom",
    name: "Full Height Wall Tiling to Ceiling (Ensuite)",
    description: "Ceramic wall tiles laid from floor to ceiling with chrome junction edge trims.",
    unitType: "fixed",
    unitRate: 0,
    isClientSelectable: true,
  },

  // Bedrooms
  {
    id: "bed_mirror_sliders",
    category: "internal_bedrooms",
    name: "Mirrored Sliding Robe Doors Upgrade (All Beds)",
    description: "Full-length mirrored frameless sliding wardrobe doors to all secondary bedrooms.",
    unitType: "fixed",
    unitRate: 0,
    isClientSelectable: true,
  },
  {
    id: "bed_custom_wir_drawers",
    category: "internal_bedrooms",
    name: "Custom Walk-In-Robe Drawer & Shelving Unit",
    description: "Built-in bank of 4 soft-close drawers and adjustable shelves for master walk-in wardrobe.",
    unitType: "fixed",
    unitRate: 0,
    isClientSelectable: true,
  },

  // Laundry
  {
    id: "lnd_drop_in_tub_stone",
    category: "internal_laundry",
    name: "Built-In Laundry Cabinet with 20mm Stone & Drop-in Tub",
    description: "Up to 1,200mm laminated base cabinet, 20mm stone benchtop and 45L stainless steel tub.",
    unitType: "fixed",
    unitRate: 0,
    isClientSelectable: true,
  },
  {
    id: "lnd_overhead_cabinets",
    category: "internal_laundry",
    name: "Laundry Overhead Cabinets with Bulkhead",
    description: "Overhead storage cupboards with plastered bulkhead to ceiling.",
    unitType: "fixed",
    unitRate: 0,
    isClientSelectable: true,
  },

  // Colour & Finishes
  {
    id: "clr_hybrid_flooring",
    category: "colour_upgrades",
    name: "8.5mm Acoustic SPC Hybrid Timber Flooring",
    description: "Commercial grade water-resistant hybrid timber planks to entry, living, dining & kitchen.",
    unitType: "per_m2",
    unitRate: 0,
    isClientSelectable: true,
  },
  {
    id: "clr_epoxy_garage",
    category: "colour_upgrades",
    name: "Epoxy Flake Floor Coating to Garage",
    description: "Durable seamless multi-coat epoxy floor coating with decorative colour flakes.",
    unitType: "fixed",
    unitRate: 0,
    isClientSelectable: true,
  },
  {
    id: "clr_matte_black_tapware",
    category: "colour_upgrades",
    name: "Matte Black Designer Tapware & Accessories Package",
    description: "Upgrade all mixers, showers, towel rails, and accessories to electroplated matte black.",
    unitType: "fixed",
    unitRate: 0,
    isClientSelectable: true,
  },
];
