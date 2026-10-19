/**
 * Phase 2: Reactive PBR Material State Store, Preset Catalog & Procedural PBR Map Synthesizer
 * Maps every architectural `surfaceId` (Exterior & Interior) to a rich Physically Based
 * Rendering (PBR) configuration with Albedo, Tangent-Space Normal, and Roughness maps.
 */

import { useSyncExternalStore } from "react";

export type MaterialCategory =
  | "render"
  | "brick"
  | "cladding"
  | "roofing"
  | "timber"
  | "tiles"
  | "stone"
  | "paint"
  | "metal"
  | "glass";

export type ProceduralPatternType =
  | "brick_stretcher"
  | "cladding_horizontal"
  | "batten_vertical"
  | "roof_corrugated"
  | "roof_tile"
  | "timber_plank"
  | "herringbone_parquet"
  | "porcelain_tile"
  | "subway_tile"
  | "kitkat_mosaic"
  | "marble_vein"
  | "travertine"
  | "terrazzo"
  | "render_stucco"
  | "exposed_aggregate"
  | "plush_carpet"
  | "sectional_panel"
  | "smooth_solid";

export type SemanticSurfaceId =
  // Exterior Surfaces (9)
  | "exterior_wall_main"
  | "exterior_cladding_feature"
  | "portico_facade"
  | "roof_main"
  | "roof_fascia_gutter"
  | "garage_door"
  | "window_frames"
  | "front_entry_door"
  | "driveway_paving"
  // Interior Surfaces (11)
  | "interior_walls_main"
  | "interior_feature_wall"
  | "interior_floor_living"
  | "interior_floor_bedrooms"
  | "interior_floor_wet_areas"
  | "interior_ceiling"
  | "interior_skirting_architraves"
  | "kitchen_cabinetry_lower"
  | "kitchen_cabinetry_upper"
  | "kitchen_benchtop"
  | "kitchen_splashback";

export interface SurfaceMaterialConfig {
  surfaceId: string;
  name: string;
  category: MaterialCategory;
  baseColorHex: string;
  roughness: number;
  metalness: number;
  textureScaleMeters: number; // Physical repeat size in meters (e.g. 1.5m)
  albedoMapUrl?: string;
  normalMapUrl?: string;
  roughnessMapUrl?: string;
  bumpScale?: number;
  patternType?: ProceduralPatternType;
  secondaryColorHex?: string;
}

export interface SurfaceDescriptor {
  surfaceId: SemanticSurfaceId;
  label: string;
  zone: "exterior" | "interior";
  description: string;
  recommendedCategories: MaterialCategory[];
}

export const ALL_SEMANTIC_SURFACES: SurfaceDescriptor[] = [
  // Exterior (9)
  {
    surfaceId: "exterior_wall_main",
    label: "Exterior Main Walls (250mm)",
    zone: "exterior",
    description: "Primary external masonry / brickwork / rendered facade walls",
    recommendedCategories: ["brick", "render", "stone", "cladding"],
  },
  {
    surfaceId: "exterior_cladding_feature",
    label: "Exterior Feature Cladding",
    zone: "exterior",
    description: "Upper floor cladding, front gable peaks & feature blade walls",
    recommendedCategories: ["cladding", "timber", "render", "brick", "stone"],
  },
  {
    surfaceId: "portico_facade",
    label: "Entry Portico & Facade Piers",
    zone: "exterior",
    description: "Front portico piers, cantilever beams, canopies & parapets",
    recommendedCategories: ["render", "stone", "brick", "timber", "metal"],
  },
  {
    surfaceId: "roof_main",
    label: "Main Roof Cover",
    zone: "exterior",
    description: "Primary pitched roof sheeting or designer roof tiles",
    recommendedCategories: ["roofing", "metal", "tiles"],
  },
  {
    surfaceId: "roof_fascia_gutter",
    label: "Fascia Boards & Quad Gutters",
    zone: "exterior",
    description: "Perimeter eaves fascia boards and Colorbond gutters",
    recommendedCategories: ["metal", "paint", "roofing"],
  },
  {
    surfaceId: "garage_door",
    label: "Sectional Garage Door",
    zone: "exterior",
    description: "Overhead sectional garage door panels",
    recommendedCategories: ["metal", "timber", "cladding", "paint"],
  },
  {
    surfaceId: "window_frames",
    label: "Window & Sliding Door Frames",
    zone: "exterior",
    description: "Powder-coated aluminium window & stacker door frames",
    recommendedCategories: ["metal", "paint", "timber"],
  },
  {
    surfaceId: "front_entry_door",
    label: "Front Entry Door",
    zone: "exterior",
    description: "Main 1200mm pivot or hinged architectural entrance door",
    recommendedCategories: ["timber", "paint", "metal", "glass"],
  },
  {
    surfaceId: "driveway_paving",
    label: "Driveway & Entry Paving",
    zone: "exterior",
    description: "Front driveway slab, crossover & porch entry pathway",
    recommendedCategories: ["stone", "tiles", "render", "brick"],
  },
  // Interior (11)
  {
    surfaceId: "interior_walls_main",
    label: "Interior Main Walls",
    zone: "interior",
    description: "10mm Gyprock plasterboard walls across rooms and hallways",
    recommendedCategories: ["paint", "render", "timber"],
  },
  {
    surfaceId: "interior_feature_wall",
    label: "Interior Feature Wall",
    zone: "interior",
    description: "Architectural accent wall in Master Suite / Living / Media",
    recommendedCategories: ["paint", "timber", "cladding", "stone", "brick", "render"],
  },
  {
    surfaceId: "interior_floor_living",
    label: "Living, Dining & Kitchen Floor",
    zone: "interior",
    description: "Main open-plan living, kitchen, dining & hallway flooring",
    recommendedCategories: ["timber", "tiles", "stone"],
  },
  {
    surfaceId: "interior_floor_bedrooms",
    label: "Bedrooms & Media Floor",
    zone: "interior",
    description: "Master suite, bedrooms, WIR & media lounge floor finish",
    recommendedCategories: ["paint", "timber", "tiles"],
  },
  {
    surfaceId: "interior_floor_wet_areas",
    label: "Bathroom, Ensuite & Laundry Floor",
    zone: "interior",
    description: "Wet area floor tiling in Bathroom, Ensuite, Powder & Laundry",
    recommendedCategories: ["tiles", "stone"],
  },
  {
    surfaceId: "interior_ceiling",
    label: "Interior Ceilings & Bulkheads",
    zone: "interior",
    description: "Flat ceiling linings, soffits & architectural bulkheads",
    recommendedCategories: ["paint", "timber"],
  },
  {
    surfaceId: "interior_skirting_architraves",
    label: "Skirting Boards & Architraves",
    zone: "interior",
    description: "67×18mm bevelled skirting boards, door jambs & architraves",
    recommendedCategories: ["paint", "timber"],
  },
  {
    surfaceId: "kitchen_cabinetry_lower",
    label: "Kitchen & Vanity Base Cabinetry",
    zone: "interior",
    description: "Island carcass, base cupboards, drawers & bathroom vanities",
    recommendedCategories: ["timber", "paint", "metal"],
  },
  {
    surfaceId: "kitchen_cabinetry_upper",
    label: "Kitchen Overhead Cupboards",
    zone: "interior",
    description: "Upper kitchen wall cabinetry, pantry & fridge tower joinery",
    recommendedCategories: ["timber", "paint", "glass"],
  },
  {
    surfaceId: "kitchen_benchtop",
    label: "Kitchen & Vanity Stone Benchtops",
    zone: "interior",
    description: "Island benchtop, waterfall ends, rear bench & vanity tops",
    recommendedCategories: ["stone", "timber", "metal"],
  },
  {
    surfaceId: "kitchen_splashback",
    label: "Kitchen Splashback",
    zone: "interior",
    description: "Rear kitchen wall splashback between benchtop & overheads",
    recommendedCategories: ["tiles", "stone", "glass", "brick"],
  },
];

export interface MaterialPresetOption extends Omit<SurfaceMaterialConfig, "surfaceId"> {
  presetId: string;
  brand?: string;
  targetSurfaces?: SemanticSurfaceId[];
}

export const MATERIAL_PRESET_CATALOG: MaterialPresetOption[] = [
  // ================= BRICK =================
  {
    presetId: "austral_urban_one_silver",
    name: "Austral Urban One Silver",
    brand: "Austral Bricks",
    category: "brick",
    baseColorHex: "#6b7280",
    secondaryColorHex: "#cbd5e1",
    roughness: 0.78,
    metalness: 0.04,
    textureScaleMeters: 1.2,
    bumpScale: 0.035,
    patternType: "brick_stretcher",
  },
  {
    presetId: "austral_everyday_terracotta",
    name: "Austral Everyday Life Terracotta",
    brand: "Austral Bricks",
    category: "brick",
    baseColorHex: "#9a3412",
    secondaryColorHex: "#e2e8f0",
    roughness: 0.8,
    metalness: 0.03,
    textureScaleMeters: 1.2,
    bumpScale: 0.038,
    patternType: "brick_stretcher",
  },
  {
    presetId: "austral_whitsunday_chalk",
    name: "Austral Whitsunday Coastal White",
    brand: "Austral Bricks",
    category: "brick",
    baseColorHex: "#e7e5e4",
    secondaryColorHex: "#f8fafc",
    roughness: 0.74,
    metalness: 0.02,
    textureScaleMeters: 1.2,
    bumpScale: 0.032,
    patternType: "brick_stretcher",
  },
  {
    presetId: "austral_industrial_monument",
    name: "Austral Industrial Ironstone",
    brand: "Austral Bricks",
    category: "brick",
    baseColorHex: "#27272a",
    secondaryColorHex: "#18181b",
    roughness: 0.76,
    metalness: 0.08,
    textureScaleMeters: 1.2,
    bumpScale: 0.036,
    patternType: "brick_stretcher",
  },
  {
    presetId: "pg_san_selmo_reclaimed",
    name: "San Selmo Reclaimed Corso Brick",
    brand: "PGH Bricks",
    category: "brick",
    baseColorHex: "#b45309",
    secondaryColorHex: "#d6d3d1",
    roughness: 0.84,
    metalness: 0.02,
    textureScaleMeters: 1.15,
    bumpScale: 0.042,
    patternType: "brick_stretcher",
  },

  // ================= CLADDING =================
  {
    presetId: "scyon_linea_crisp_white",
    name: "Scyon Linea 180mm Weatherboard (White)",
    brand: "James Hardie",
    category: "cladding",
    baseColorHex: "#f8fafc",
    secondaryColorHex: "#cbd5e1",
    roughness: 0.45,
    metalness: 0.03,
    textureScaleMeters: 1.4,
    bumpScale: 0.03,
    patternType: "cladding_horizontal",
  },
  {
    presetId: "scyon_axon_shale_grey",
    name: "Hardie Axon Vertical Groove (Shale Grey)",
    brand: "James Hardie",
    category: "cladding",
    baseColorHex: "#94a3b8",
    secondaryColorHex: "#64748b",
    roughness: 0.48,
    metalness: 0.04,
    textureScaleMeters: 1.2,
    bumpScale: 0.028,
    patternType: "batten_vertical",
  },
  {
    presetId: "western_red_cedar_batten",
    name: "Western Red Cedar Vertical Battens",
    brand: "Architectural Timber",
    category: "cladding",
    baseColorHex: "#b45309",
    secondaryColorHex: "#78350f",
    roughness: 0.42,
    metalness: 0.04,
    textureScaleMeters: 1.0,
    bumpScale: 0.04,
    patternType: "batten_vertical",
  },
  {
    presetId: "shou_sugi_ban_charred",
    name: "Charred Shou Sugi Ban Timber Battens",
    brand: "Architectural Bespoke",
    category: "cladding",
    baseColorHex: "#1c1917",
    secondaryColorHex: "#0c0a09",
    roughness: 0.55,
    metalness: 0.08,
    textureScaleMeters: 1.0,
    bumpScale: 0.045,
    patternType: "batten_vertical",
  },

  // ================= RENDER =================
  {
    presetId: "render_monument_charcoal",
    name: "Acrylic Texture Render — Monument",
    brand: "Dulux AcraTex",
    category: "render",
    baseColorHex: "#272b33",
    secondaryColorHex: "#1e293b",
    roughness: 0.68,
    metalness: 0.03,
    textureScaleMeters: 1.6,
    bumpScale: 0.02,
    patternType: "render_stucco",
  },
  {
    presetId: "render_lexicon_white",
    name: "Acrylic Fine Render — Lexicon Quarter",
    brand: "Dulux AcraTex",
    category: "render",
    baseColorHex: "#f8fafc",
    secondaryColorHex: "#e2e8f0",
    roughness: 0.62,
    metalness: 0.02,
    textureScaleMeters: 1.6,
    bumpScale: 0.018,
    patternType: "render_stucco",
  },
  {
    presetId: "render_travertine_warm",
    name: "Venetian Microcement — Warm Travertine",
    brand: "Dulux Venetian",
    category: "render",
    baseColorHex: "#e7e0d6",
    secondaryColorHex: "#d6cec2",
    roughness: 0.54,
    metalness: 0.04,
    textureScaleMeters: 1.8,
    bumpScale: 0.016,
    patternType: "travertine",
  },

  // ================= ROOFING =================
  {
    presetId: "colorbond_monument",
    name: "Colorbond Custom Orb — Monument",
    brand: "Colorbond Steel",
    category: "roofing",
    baseColorHex: "#2b2e35",
    secondaryColorHex: "#1e2026",
    roughness: 0.34,
    metalness: 0.48,
    textureScaleMeters: 1.2,
    bumpScale: 0.042,
    patternType: "roof_corrugated",
  },
  {
    presetId: "colorbond_surfmist",
    name: "Colorbond Custom Orb — Surfmist",
    brand: "Colorbond Steel",
    category: "roofing",
    baseColorHex: "#e4e6e1",
    secondaryColorHex: "#cbd5e1",
    roughness: 0.36,
    metalness: 0.42,
    textureScaleMeters: 1.2,
    bumpScale: 0.04,
    patternType: "roof_corrugated",
  },
  {
    presetId: "colorbond_basalt",
    name: "Colorbond Custom Orb — Basalt",
    brand: "Colorbond Steel",
    category: "roofing",
    baseColorHex: "#52565e",
    secondaryColorHex: "#3f434a",
    roughness: 0.35,
    metalness: 0.46,
    textureScaleMeters: 1.2,
    bumpScale: 0.04,
    patternType: "roof_corrugated",
  },
  {
    presetId: "colorbond_shale_grey",
    name: "Colorbond Custom Orb — Shale Grey",
    brand: "Colorbond Steel",
    category: "roofing",
    baseColorHex: "#9ca3af",
    secondaryColorHex: "#6b7280",
    roughness: 0.35,
    metalness: 0.45,
    textureScaleMeters: 1.2,
    bumpScale: 0.04,
    patternType: "roof_corrugated",
  },
  {
    presetId: "bristile_terracotta_tile",
    name: "Bristile Prestige Terracotta Roof Tiles",
    brand: "Bristile Roofing",
    category: "roofing",
    baseColorHex: "#b45309",
    secondaryColorHex: "#7c2d12",
    roughness: 0.58,
    metalness: 0.06,
    textureScaleMeters: 0.9,
    bumpScale: 0.048,
    patternType: "roof_tile",
  },

  // ================= TIMBER (FLOORS & JOINERY) =================
  {
    presetId: "european_oak_wide_plank",
    name: "European Natural Oak Wide-Plank Timber",
    brand: "Quick-Step / Polytec",
    category: "timber",
    baseColorHex: "#c08b5c",
    secondaryColorHex: "#8c5828",
    roughness: 0.28,
    metalness: 0.05,
    textureScaleMeters: 1.8,
    bumpScale: 0.02,
    patternType: "timber_plank",
  },
  {
    presetId: "australian_spotted_gum",
    name: "Australian Spotted Gum Hardwood Flooring",
    brand: "Boral Timber",
    category: "timber",
    baseColorHex: "#9a5226",
    secondaryColorHex: "#5c2b0e",
    roughness: 0.24,
    metalness: 0.06,
    textureScaleMeters: 1.8,
    bumpScale: 0.022,
    patternType: "timber_plank",
  },
  {
    presetId: "coastal_blackbutt_blonde",
    name: "Coastal Blonde Blackbutt Timber",
    brand: "Havwoods",
    category: "timber",
    baseColorHex: "#dfbe99",
    secondaryColorHex: "#b8926a",
    roughness: 0.3,
    metalness: 0.04,
    textureScaleMeters: 1.8,
    bumpScale: 0.018,
    patternType: "timber_plank",
  },
  {
    presetId: "smoked_walnut_herringbone",
    name: "Smoked Florentine Walnut Herringbone",
    brand: "Havwoods Luxury",
    category: "timber",
    baseColorHex: "#5c3a21",
    secondaryColorHex: "#3b2313",
    roughness: 0.26,
    metalness: 0.06,
    textureScaleMeters: 1.4,
    bumpScale: 0.024,
    patternType: "herringbone_parquet",
  },

  // ================= STONE (BENCHTOPS, SPLASHBACKS, PAVING) =================
  {
    presetId: "caesarstone_calacatta_nuvo",
    name: "Caesarstone Calacatta Nuvo (White Marble Vein)",
    brand: "Caesarstone",
    category: "stone",
    baseColorHex: "#f8fafc",
    secondaryColorHex: "#94a3b8",
    roughness: 0.12,
    metalness: 0.08,
    textureScaleMeters: 1.6,
    bumpScale: 0.008,
    patternType: "marble_vein",
  },
  {
    presetId: "caesarstone_empira_black",
    name: "Caesarstone Empira Black (Dark Obsidian Marble)",
    brand: "Caesarstone",
    category: "stone",
    baseColorHex: "#1e293b",
    secondaryColorHex: "#e2e8f0",
    roughness: 0.14,
    metalness: 0.12,
    textureScaleMeters: 1.6,
    bumpScale: 0.01,
    patternType: "marble_vein",
  },
  {
    presetId: "caesarstone_sleek_concrete",
    name: "Caesarstone Sleek Concrete (Architectural Grey)",
    brand: "Caesarstone",
    category: "stone",
    baseColorHex: "#94a3b8",
    secondaryColorHex: "#64748b",
    roughness: 0.32,
    metalness: 0.06,
    textureScaleMeters: 1.6,
    bumpScale: 0.014,
    patternType: "travertine",
  },
  {
    presetId: "emerald_green_quartzite",
    name: "Verde Alpi Emerald Quartzite Stone",
    brand: "Artedomus",
    category: "stone",
    baseColorHex: "#14532d",
    secondaryColorHex: "#dcfce7",
    roughness: 0.15,
    metalness: 0.1,
    textureScaleMeters: 1.5,
    bumpScale: 0.01,
    patternType: "marble_vein",
  },
  {
    presetId: "exposed_aggregate_charcoal",
    name: "Exposed Aggregate Concrete Paving (Salt & Pepper)",
    brand: "Boral Decorative Concrete",
    category: "stone",
    baseColorHex: "#64748b",
    secondaryColorHex: "#1e293b",
    roughness: 0.72,
    metalness: 0.04,
    textureScaleMeters: 1.5,
    bumpScale: 0.035,
    patternType: "exposed_aggregate",
  },

  // ================= TILES (WET AREAS & SPLASHBACKS) =================
  {
    presetId: "rectified_porcelain_600",
    name: "600×600mm Rectified Carrara Porcelain Tile",
    brand: "Beaumont Tiles",
    category: "tiles",
    baseColorHex: "#e8edf3",
    secondaryColorHex: "#94a3b8",
    roughness: 0.16,
    metalness: 0.1,
    textureScaleMeters: 1.2,
    bumpScale: 0.016,
    patternType: "porcelain_tile",
  },
  {
    presetId: "venetian_terrazzo_stone",
    name: "Venetian Aggregate Terrazzo Floor Tile",
    brand: "Fibonacci Stone",
    category: "tiles",
    baseColorHex: "#e2e8f0",
    secondaryColorHex: "#475569",
    roughness: 0.22,
    metalness: 0.08,
    textureScaleMeters: 1.2,
    bumpScale: 0.018,
    patternType: "terrazzo",
  },
  {
    presetId: "kitkat_sage_finger_mosaic",
    name: "Japanese Kit-Kat Finger Mosaic Tile (Botanic Sage)",
    brand: "Academy Tiles",
    category: "tiles",
    baseColorHex: "#4d7c6f",
    secondaryColorHex: "#e2e8f0",
    roughness: 0.18,
    metalness: 0.08,
    textureScaleMeters: 0.6,
    bumpScale: 0.025,
    patternType: "kitkat_mosaic",
  },
  {
    presetId: "moroccan_zellige_subway",
    name: "Artisan Glazed Subway Tile (Warm Alabaster)",
    brand: "Beaumont Designer",
    category: "tiles",
    baseColorHex: "#f5f5f4",
    secondaryColorHex: "#cbd5e1",
    roughness: 0.14,
    metalness: 0.12,
    textureScaleMeters: 0.8,
    bumpScale: 0.022,
    patternType: "subway_tile",
  },

  // ================= PAINT & CARPET =================
  {
    presetId: "dulux_natural_white",
    name: "Dulux Natural White (Low-Sheen Acrylic)",
    brand: "Dulux Wash&Wear",
    category: "paint",
    baseColorHex: "#f8fafc",
    secondaryColorHex: "#f1f5f9",
    roughness: 0.46,
    metalness: 0.01,
    textureScaleMeters: 2.0,
    bumpScale: 0.006,
    patternType: "smooth_solid",
  },
  {
    presetId: "dulux_hog_bristle_quarter",
    name: "Dulux Hog Bristle Quarter (Warm Linen)",
    brand: "Dulux Wash&Wear",
    category: "paint",
    baseColorHex: "#f3efe6",
    secondaryColorHex: "#e6dfd1",
    roughness: 0.48,
    metalness: 0.01,
    textureScaleMeters: 2.0,
    bumpScale: 0.006,
    patternType: "smooth_solid",
  },
  {
    presetId: "dulux_tranquil_retreat",
    name: "Dulux Tranquil Retreat (Eucalyptus Sage)",
    brand: "Dulux Feature Wall",
    category: "paint",
    baseColorHex: "#8c9c90",
    secondaryColorHex: "#6f7f73",
    roughness: 0.45,
    metalness: 0.02,
    textureScaleMeters: 2.0,
    bumpScale: 0.008,
    patternType: "smooth_solid",
  },
  {
    presetId: "dulux_domino_charcoal",
    name: "Dulux Domino (Deep Architectural Charcoal)",
    brand: "Dulux Feature Wall",
    category: "paint",
    baseColorHex: "#2d3138",
    secondaryColorHex: "#1e2228",
    roughness: 0.44,
    metalness: 0.03,
    textureScaleMeters: 2.0,
    bumpScale: 0.008,
    patternType: "smooth_solid",
  },
  {
    presetId: "plush_wool_carpet_silver",
    name: "100% NZ Wool Loop-Pile Carpet (Silver Ash)",
    brand: "Godfrey Hirst",
    category: "paint",
    baseColorHex: "#949aa3",
    secondaryColorHex: "#64748b",
    roughness: 0.88,
    metalness: 0.0,
    textureScaleMeters: 1.0,
    bumpScale: 0.03,
    patternType: "plush_carpet",
  },
  {
    presetId: "plush_wool_carpet_oatmeal",
    name: "Chunky Loop Wool Carpet (Warm Oatmeal)",
    brand: "Victoria Carpets",
    category: "paint",
    baseColorHex: "#d6cec2",
    secondaryColorHex: "#a8a29e",
    roughness: 0.86,
    metalness: 0.0,
    textureScaleMeters: 1.0,
    bumpScale: 0.03,
    patternType: "plush_carpet",
  },

  // ================= METAL & GLASS =================
  {
    presetId: "powdercoat_monument_frame",
    name: "Powder-Coated Aluminium — Monument Matte",
    brand: "Stegbar / Bradnam's",
    category: "metal",
    baseColorHex: "#1e293b",
    secondaryColorHex: "#0f172a",
    roughness: 0.35,
    metalness: 0.55,
    textureScaleMeters: 1.5,
    bumpScale: 0.01,
    patternType: "smooth_solid",
  },
  {
    presetId: "powdercoat_pearl_white_frame",
    name: "Powder-Coated Aluminium — Pearl White",
    brand: "Stegbar / Bradnam's",
    category: "metal",
    baseColorHex: "#f8fafc",
    secondaryColorHex: "#cbd5e1",
    roughness: 0.3,
    metalness: 0.45,
    textureScaleMeters: 1.5,
    bumpScale: 0.01,
    patternType: "smooth_solid",
  },
  {
    presetId: "brushed_brass_gold_metal",
    name: "Brushed Living Brass / Champagne Gold",
    brand: "ABI Interiors",
    category: "metal",
    baseColorHex: "#d97706",
    secondaryColorHex: "#b45309",
    roughness: 0.22,
    metalness: 0.85,
    textureScaleMeters: 1.0,
    bumpScale: 0.008,
    patternType: "smooth_solid",
  },
  {
    presetId: "sectional_garage_monument",
    name: "B&D Panelift Sectional Door — Monument",
    brand: "B&D Doors",
    category: "metal",
    baseColorHex: "#1e293b",
    secondaryColorHex: "#0f172a",
    roughness: 0.36,
    metalness: 0.45,
    textureScaleMeters: 2.2,
    bumpScale: 0.025,
    patternType: "sectional_panel",
  },
  {
    presetId: "sectional_garage_timberlook",
    name: "B&D Knotwood Timber-Look Sectional Door (Cedar)",
    brand: "B&D Doors",
    category: "timber",
    baseColorHex: "#9a4816",
    secondaryColorHex: "#451a03",
    roughness: 0.38,
    metalness: 0.15,
    textureScaleMeters: 2.2,
    bumpScale: 0.025,
    patternType: "sectional_panel",
  },
  {
    presetId: "smoked_mirror_splashback",
    name: "Smoked Grey Toughened Mirror Splashback",
    brand: "Viridian Glass",
    category: "glass",
    baseColorHex: "#475569",
    secondaryColorHex: "#94a3b8",
    roughness: 0.06,
    metalness: 0.75,
    textureScaleMeters: 2.0,
    bumpScale: 0.002,
    patternType: "smooth_solid",
  },
];

// ============================================================================
// PROCEDURAL PBR TEXTURE SYNTHESIZER (ALBEDO + NORMAL + ROUGHNESS MAPS)
// ============================================================================

export interface GeneratedPbrMaps {
  albedoDataUrl: string;
  normalDataUrl: string;
  roughnessDataUrl: string;
}

const pbrMapCache = new Map<string, GeneratedPbrMaps>();

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = (hex || "#cccccc").replace("#", "").trim();
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean.padEnd(6, "0");
  const num = parseInt(full.slice(0, 6), 16) || 0;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

/**
 * Generates seamless 256x256 Albedo, Tangent-Space Normal, and Roughness PNG Data URLs
 * for any SurfaceMaterialConfig at runtime in the browser.
 */
export function getOrGeneratePbrMaps(config: SurfaceMaterialConfig): GeneratedPbrMaps | null {
  if (typeof document === "undefined") return null;

  const pattern: ProceduralPatternType =
    config.patternType || inferPatternFromCategory(config.category, config.surfaceId);
  const cacheKey = `${pattern}|${config.baseColorHex}|${config.secondaryColorHex || ""}|${config.roughness.toFixed(2)}`;

  const cached = pbrMapCache.get(cacheKey);
  if (cached) return cached;

  const size = 256;
  const albedoCanvas = document.createElement("canvas");
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const aCtx = albedoCanvas.getContext("2d");

  const heightBuffer = new Float32Array(size * size);
  const roughBuffer = new Float32Array(size * size);
  const baseRough = Math.max(0.04, Math.min(0.98, config.roughness));

  if (!aCtx) return null;

  const primary = hexToRgb(config.baseColorHex);
  const secondary = hexToRgb(config.secondaryColorHex || "#cbd5e1");

  // Fill defaults
  aCtx.fillStyle = config.baseColorHex;
  aCtx.fillRect(0, 0, size, size);
  heightBuffer.fill(0.5);
  roughBuffer.fill(baseRough);

  const setHeightAndRough = (
    x0: number,
    y0: number,
    w: number,
    h: number,
    heightVal: number,
    roughVal: number
  ) => {
    const ix0 = Math.max(0, Math.floor(x0));
    const iy0 = Math.max(0, Math.floor(y0));
    const ix1 = Math.min(size, Math.ceil(x0 + w));
    const iy1 = Math.min(size, Math.ceil(y0 + h));
    for (let y = iy0; y < iy1; y++) {
      const row = y * size;
      for (let x = ix0; x < ix1; x++) {
        heightBuffer[row + x] = heightVal;
        roughBuffer[row + x] = roughVal;
      }
    }
  };

  if (pattern === "brick_stretcher") {
    // Mortar bed background
    aCtx.fillStyle = config.secondaryColorHex || "#cbd5e1";
    aCtx.fillRect(0, 0, size, size);
    heightBuffer.fill(0.15); // Recessed mortar joints
    roughBuffer.fill(Math.min(0.95, baseRough + 0.15));

    const rowH = 32;
    const brickW = 64;
    const gap = 3;
    for (let row = 0; row < size / rowH; row++) {
      const y = row * rowH;
      const shift = row % 2 === 1 ? brickW / 2 : 0;
      for (let col = -1; col <= size / brickW; col++) {
        const x = col * brickW + shift;
        const jitter = ((row * 17 + col * 31) % 9) - 4;
        const r = clampByte(primary.r + jitter * 3);
        const g = clampByte(primary.g + jitter * 3);
        const b = clampByte(primary.b + jitter * 3);
        aCtx.fillStyle = `rgb(${r},${g},${b})`;
        aCtx.fillRect(x + gap, y + gap, brickW - gap * 2, rowH - gap * 2);
        setHeightAndRough(
          x + gap,
          y + gap,
          brickW - gap * 2,
          rowH - gap * 2,
          0.85 + jitter * 0.015,
          baseRough
        );
      }
    }
  } else if (pattern === "cladding_horizontal") {
    const boardH = 32;
    for (let y = 0; y < size; y += boardH) {
      const grad = aCtx.createLinearGradient(0, y, 0, y + boardH);
      grad.addColorStop(0, `rgb(${clampByte(primary.r + 10)},${clampByte(primary.g + 10)},${clampByte(primary.b + 10)})`);
      grad.addColorStop(0.88, config.baseColorHex);
      grad.addColorStop(1, `rgb(${clampByte(primary.r - 35)},${clampByte(primary.g - 35)},${clampByte(primary.b - 35)})`);
      aCtx.fillStyle = grad;
      aCtx.fillRect(0, y, size, boardH);

      for (let py = 0; py < boardH; py++) {
        const hVal = py >= boardH - 3 ? 0.15 : 0.35 + (py / boardH) * 0.55;
        setHeightAndRough(0, y + py, size, 1, hVal, baseRough);
      }
    }
  } else if (pattern === "batten_vertical" || pattern === "kitkat_mosaic") {
    const battenW = pattern === "kitkat_mosaic" ? 16 : 32;
    const gap = pattern === "kitkat_mosaic" ? 2 : 4;
    aCtx.fillStyle = config.secondaryColorHex || "#1e293b";
    aCtx.fillRect(0, 0, size, size);
    heightBuffer.fill(0.15);

    for (let x = 0; x < size; x += battenW) {
      const idx = Math.floor(x / battenW);
      const jitter = ((idx * 13) % 7) - 3;
      const r = clampByte(primary.r + jitter * 3);
      const g = clampByte(primary.g + jitter * 3);
      const b = clampByte(primary.b + jitter * 3);
      aCtx.fillStyle = `rgb(${r},${g},${b})`;
      aCtx.fillRect(x + gap, 0, battenW - gap * 2, size);
      setHeightAndRough(x + gap, 0, battenW - gap * 2, size, 0.88, baseRough);
    }
    if (pattern === "kitkat_mosaic") {
      // Horizontal grout joints at 128px
      aCtx.fillStyle = config.secondaryColorHex || "#e2e8f0";
      aCtx.fillRect(0, 0, size, 3);
      aCtx.fillRect(0, 127, size, 3);
      setHeightAndRough(0, 0, size, 3, 0.15, 0.85);
      setHeightAndRough(0, 127, size, 3, 0.15, 0.85);
    }
  } else if (pattern === "roof_corrugated") {
    const ribPitch = 32;
    for (let x = 0; x < size; x++) {
      const phase = ((x % ribPitch) / ribPitch) * Math.PI * 2;
      const wave = Math.sin(phase);
      const shade = wave * 24;
      const r = clampByte(primary.r + shade);
      const g = clampByte(primary.g + shade);
      const b = clampByte(primary.b + shade);
      aCtx.fillStyle = `rgb(${r},${g},${b})`;
      aCtx.fillRect(x, 0, 1, size);
      const hVal = (wave + 1) * 0.5;
      setHeightAndRough(x, 0, 1, size, hVal, baseRough);
    }
  } else if (pattern === "roof_tile") {
    const tileW = 32;
    const courseH = 64;
    for (let y = 0; y < size; y += courseH) {
      for (let x = 0; x < size; x++) {
        const phase = ((x % tileW) / tileW) * Math.PI * 2;
        const wave = Math.sin(phase);
        const shade = wave * 20;
        const r = clampByte(primary.r + shade);
        const g = clampByte(primary.g + shade);
        const b = clampByte(primary.b + shade);
        aCtx.fillStyle = `rgb(${r},${g},${b})`;
        aCtx.fillRect(x, y, 1, courseH - 3);
        setHeightAndRough(x, y, 1, courseH - 3, (wave + 1) * 0.45 + 0.1, baseRough);
      }
      aCtx.fillStyle = "rgba(0,0,0,0.35)";
      aCtx.fillRect(0, y + courseH - 3, size, 3);
      setHeightAndRough(0, y + courseH - 3, size, 3, 0.08, 0.8);
    }
  } else if (pattern === "timber_plank" || pattern === "herringbone_parquet") {
    const plankH = pattern === "herringbone_parquet" ? 32 : 64;
    for (let y = 0; y < size; y += plankH) {
      const idx = Math.floor(y / plankH);
      const jitter = ((idx * 19) % 9) - 4;
      const r = clampByte(primary.r + jitter * 3);
      const g = clampByte(primary.g + jitter * 3);
      const b = clampByte(primary.b + jitter * 3);
      aCtx.fillStyle = `rgb(${r},${g},${b})`;
      aCtx.fillRect(0, y, size, plankH - 2);
      setHeightAndRough(0, y, size, plankH - 2, 0.78, baseRough);

      // Subtle woodgrain fibers
      for (let gLine = 0; gLine < 10; gLine++) {
        const gy = y + ((gLine * 6) % (plankH - 3));
        aCtx.fillStyle = gLine % 2 === 0 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)";
        aCtx.fillRect(0, gy, size, 1.5);
        setHeightAndRough(0, gy, size, 1, 0.72, baseRough + 0.04);
      }

      // Plank bevel seam
      aCtx.fillStyle = config.secondaryColorHex || "rgba(0,0,0,0.35)";
      aCtx.fillRect(0, y + plankH - 2, size, 2);
      setHeightAndRough(0, y + plankH - 2, size, 2, 0.2, Math.min(0.9, baseRough + 0.2));

      const crossX = (idx * 96 + 48) % size;
      aCtx.fillRect(crossX, y, 2, plankH);
      setHeightAndRough(crossX, y, 2, plankH, 0.2, Math.min(0.9, baseRough + 0.2));
    }
  } else if (pattern === "porcelain_tile" || pattern === "subway_tile") {
    const cols = pattern === "subway_tile" ? 4 : 4;
    const rows = pattern === "subway_tile" ? 8 : 4;
    const cellW = size / cols;
    const cellH = size / rows;
    const grout = pattern === "subway_tile" ? 2.5 : 3;

    aCtx.fillStyle = config.secondaryColorHex || "#94a3b8";
    aCtx.fillRect(0, 0, size, size);
    heightBuffer.fill(0.18);
    roughBuffer.fill(0.78);

    for (let rIdx = 0; rIdx < rows; rIdx++) {
      const shift = pattern === "subway_tile" && rIdx % 2 === 1 ? cellW / 2 : 0;
      for (let cIdx = -1; cIdx <= cols; cIdx++) {
        const tx = cIdx * cellW + shift;
        const ty = rIdx * cellH;
        const jitter = (((rIdx * 7 + cIdx * 13) & 3) - 1.5) * 3;
        const tr = clampByte(primary.r + jitter);
        const tg = clampByte(primary.g + jitter);
        const tb = clampByte(primary.b + jitter);
        aCtx.fillStyle = `rgb(${tr},${tg},${tb})`;
        aCtx.fillRect(tx + grout, ty + grout, cellW - grout * 2, cellH - grout * 2);
        setHeightAndRough(tx + grout, ty + grout, cellW - grout * 2, cellH - grout * 2, 0.86, baseRough);
      }
    }
  } else if (pattern === "marble_vein" || pattern === "travertine") {
    aCtx.fillStyle = config.baseColorHex;
    aCtx.fillRect(0, 0, size, size);
    heightBuffer.fill(0.8);

    aCtx.strokeStyle = `rgba(${secondary.r},${secondary.g},${secondary.b},0.35)`;
    aCtx.lineWidth = 2.5;
    aCtx.beginPath();
    aCtx.moveTo(0, 40);
    aCtx.bezierCurveTo(85, 70, 150, 160, 256, 210);
    aCtx.moveTo(40, 0);
    aCtx.bezierCurveTo(110, 95, 190, 130, 256, 170);
    aCtx.stroke();

    aCtx.strokeStyle = `rgba(${secondary.r},${secondary.g},${secondary.b},0.16)`;
    aCtx.lineWidth = 6;
    aCtx.beginPath();
    aCtx.moveTo(0, 140);
    aCtx.bezierCurveTo(90, 120, 175, 195, 256, 80);
    aCtx.stroke();
  } else if (pattern === "terrazzo" || pattern === "exposed_aggregate") {
    aCtx.fillStyle = config.baseColorHex;
    aCtx.fillRect(0, 0, size, size);
    const chipColors = [
      config.secondaryColorHex || "#334155",
      "#ffffff",
      "#cbd5e1",
      "#d97706",
      "#475569",
    ];
    const count = pattern === "exposed_aggregate" ? 900 : 320;
    for (let i = 0; i < count; i++) {
      const cx = (i * 73 + 19) % size;
      const cy = (i * 137 + 43) % size;
      const rad = pattern === "exposed_aggregate" ? 2 : 3.5;
      aCtx.fillStyle = chipColors[i % chipColors.length];
      aCtx.beginPath();
      aCtx.arc(cx, cy, rad, 0, Math.PI * 2);
      aCtx.fill();
      setHeightAndRough(cx - 1, cy - 1, 3, 3, 0.85, baseRough * 0.85);
    }
  } else if (pattern === "sectional_panel") {
    const panelH = 64;
    for (let y = 0; y < size; y += panelH) {
      aCtx.fillStyle = config.baseColorHex;
      aCtx.fillRect(0, y, size, panelH - 4);
      setHeightAndRough(0, y, size, panelH - 4, 0.82, baseRough);

      aCtx.fillStyle = "rgba(0,0,0,0.5)";
      aCtx.fillRect(0, y + panelH - 4, size, 4);
      setHeightAndRough(0, y + panelH - 4, size, 4, 0.15, 0.7);
    }
  } else if (pattern === "plush_carpet") {
    aCtx.fillStyle = config.baseColorHex;
    aCtx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 4) {
      aCtx.fillStyle =
        (y / 4) % 2 === 0
          ? `rgba(${clampByte(primary.r + 10)},${clampByte(primary.g + 9)},${clampByte(primary.b + 7)},0.55)`
          : `rgba(${clampByte(primary.r - 12)},${clampByte(primary.g - 11)},${clampByte(primary.b - 9)},0.55)`;
      aCtx.fillRect(0, y, size, 2);
    }
    for (let i = 0; i < 2400; i++) {
      const px = (i * 67 + 11) % size;
      const py = (i * 131 + 29) % size;
      const delta = i % 2 === 0 ? 15 : -15;
      aCtx.fillStyle = `rgb(${clampByte(primary.r + delta)},${clampByte(primary.g + delta)},${clampByte(primary.b + delta)})`;
      aCtx.fillRect(px, py, 2, 2);
      setHeightAndRough(px, py, 2, 2, i % 2 === 0 ? 0.78 : 0.28, baseRough);
    }
  } else if (pattern === "render_stucco") {
    aCtx.fillStyle = config.baseColorHex;
    aCtx.fillRect(0, 0, size, size);
    for (let i = 0; i < 1600; i++) {
      const px = (i * 67 + 11) % size;
      const py = (i * 131 + 29) % size;
      const delta = i % 2 === 0 ? 12 : -12;
      aCtx.fillStyle = `rgb(${clampByte(primary.r + delta)},${clampByte(primary.g + delta)},${clampByte(primary.b + delta)})`;
      aCtx.fillRect(px, py, 2, 2);
      setHeightAndRough(px, py, 2, 2, i % 2 === 0 ? 0.72 : 0.32, baseRough);
    }
  }

  // Convert heightBuffer into a Tangent-Space Normal Map (RGB) & roughBuffer into Roughness Map
  const normalCanvas = document.createElement("canvas");
  normalCanvas.width = size;
  normalCanvas.height = size;
  const nCtx = normalCanvas.getContext("2d");

  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext("2d");

  if (nCtx && rCtx) {
    const nImg = nCtx.createImageData(size, size);
    const rImg = rCtx.createImageData(size, size);
    const strength = 3.2;

    for (let y = 0; y < size; y++) {
      const yPrev = (y - 1 + size) % size;
      const yNext = (y + 1) % size;
      for (let x = 0; x < size; x++) {
        const xPrev = (x - 1 + size) % size;
        const xNext = (x + 1) % size;

        const hL = heightBuffer[y * size + xPrev];
        const hR = heightBuffer[y * size + xNext];
        const hU = heightBuffer[yPrev * size + x];
        const hD = heightBuffer[yNext * size + x];

        const dx = (hL - hR) * strength;
        const dy = (hU - hD) * strength;
        const dz = 1.0;
        const invLen = 1.0 / Math.sqrt(dx * dx + dy * dy + dz * dz);

        const idx = (y * size + x) * 4;
        nImg.data[idx] = clampByte((dx * invLen * 0.5 + 0.5) * 255);
        nImg.data[idx + 1] = clampByte((dy * invLen * 0.5 + 0.5) * 255);
        nImg.data[idx + 2] = clampByte((dz * invLen * 0.5 + 0.5) * 255);
        nImg.data[idx + 3] = 255;

        const rByte = clampByte(roughBuffer[y * size + x] * 255);
        rImg.data[idx] = rByte;
        rImg.data[idx + 1] = rByte;
        rImg.data[idx + 2] = rByte;
        rImg.data[idx + 3] = 255;
      }
    }
    nCtx.putImageData(nImg, 0, 0);
    rCtx.putImageData(rImg, 0, 0);
  }

  const maps: GeneratedPbrMaps = {
    albedoDataUrl: albedoCanvas.toDataURL("image/png"),
    normalDataUrl: normalCanvas.toDataURL("image/png"),
    roughnessDataUrl: roughCanvas.toDataURL("image/png"),
  };
  pbrMapCache.set(cacheKey, maps);
  return maps;
}

export function inferPatternFromCategory(
  category: MaterialCategory,
  surfaceId?: string
): ProceduralPatternType {
  if (surfaceId === "garage_door") return "sectional_panel";
  if (surfaceId === "interior_floor_bedrooms" && category === "paint") return "plush_carpet";
  if (surfaceId === "driveway_paving") return "exposed_aggregate";
  switch (category) {
    case "brick":
      return "brick_stretcher";
    case "cladding":
      return "cladding_horizontal";
    case "roofing":
      return "roof_corrugated";
    case "timber":
      return "timber_plank";
    case "tiles":
      return surfaceId === "kitchen_splashback" ? "subway_tile" : "porcelain_tile";
    case "stone":
      return "marble_vein";
    case "render":
      return "render_stucco";
    default:
      return "smooth_solid";
  }
}

// ============================================================================
// DEFAULT SURFACE MATERIAL CONFIGURATIONS (ALL 20 SEMANTIC SURFACES)
// ============================================================================

export function createDefaultSurfaceConfigs(): Record<SemanticSurfaceId, SurfaceMaterialConfig> {
  return {
    // Exterior (9)
    exterior_wall_main: {
      surfaceId: "exterior_wall_main",
      name: "Austral Urban One Silver Brick",
      category: "brick",
      baseColorHex: "#6b7280",
      secondaryColorHex: "#cbd5e1",
      roughness: 0.78,
      metalness: 0.04,
      textureScaleMeters: 1.2,
      bumpScale: 0.035,
      patternType: "brick_stretcher",
    },
    exterior_cladding_feature: {
      surfaceId: "exterior_cladding_feature",
      name: "Scyon Linea 180mm Weatherboard (White)",
      category: "cladding",
      baseColorHex: "#f8fafc",
      secondaryColorHex: "#cbd5e1",
      roughness: 0.45,
      metalness: 0.03,
      textureScaleMeters: 1.4,
      bumpScale: 0.03,
      patternType: "cladding_horizontal",
    },
    portico_facade: {
      surfaceId: "portico_facade",
      name: "Acrylic Texture Render — Monument",
      category: "render",
      baseColorHex: "#272b33",
      secondaryColorHex: "#1e293b",
      roughness: 0.68,
      metalness: 0.03,
      textureScaleMeters: 1.6,
      bumpScale: 0.02,
      patternType: "render_stucco",
    },
    roof_main: {
      surfaceId: "roof_main",
      name: "Colorbond Custom Orb — Monument",
      category: "roofing",
      baseColorHex: "#2b2e35",
      secondaryColorHex: "#1e2026",
      roughness: 0.34,
      metalness: 0.48,
      textureScaleMeters: 1.2,
      bumpScale: 0.042,
      patternType: "roof_corrugated",
    },
    roof_fascia_gutter: {
      surfaceId: "roof_fascia_gutter",
      name: "Colorbond Monument Fascia & Quad Gutter",
      category: "metal",
      baseColorHex: "#2b2e35",
      secondaryColorHex: "#1e293b",
      roughness: 0.38,
      metalness: 0.45,
      textureScaleMeters: 1.5,
      bumpScale: 0.01,
      patternType: "smooth_solid",
    },
    garage_door: {
      surfaceId: "garage_door",
      name: "B&D Panelift Sectional Door — Monument",
      category: "metal",
      baseColorHex: "#1e293b",
      secondaryColorHex: "#0f172a",
      roughness: 0.36,
      metalness: 0.45,
      textureScaleMeters: 2.2,
      bumpScale: 0.025,
      patternType: "sectional_panel",
    },
    window_frames: {
      surfaceId: "window_frames",
      name: "Powder-Coated Aluminium — Monument Matte",
      category: "metal",
      baseColorHex: "#1e293b",
      secondaryColorHex: "#0f172a",
      roughness: 0.35,
      metalness: 0.55,
      textureScaleMeters: 1.5,
      bumpScale: 0.01,
      patternType: "smooth_solid",
    },
    front_entry_door: {
      surfaceId: "front_entry_door",
      name: "Western Red Cedar Pivot Entry Door",
      category: "timber",
      baseColorHex: "#9a4816",
      secondaryColorHex: "#5c2b0e",
      roughness: 0.32,
      metalness: 0.08,
      textureScaleMeters: 1.2,
      bumpScale: 0.02,
      patternType: "timber_plank",
    },
    driveway_paving: {
      surfaceId: "driveway_paving",
      name: "Exposed Aggregate Concrete Paving",
      category: "stone",
      baseColorHex: "#64748b",
      secondaryColorHex: "#1e293b",
      roughness: 0.72,
      metalness: 0.04,
      textureScaleMeters: 1.5,
      bumpScale: 0.035,
      patternType: "exposed_aggregate",
    },

    // Interior (11)
    interior_walls_main: {
      surfaceId: "interior_walls_main",
      name: "Dulux Natural White (Low-Sheen Acrylic)",
      category: "paint",
      baseColorHex: "#f8fafc",
      secondaryColorHex: "#f1f5f9",
      roughness: 0.46,
      metalness: 0.01,
      textureScaleMeters: 2.0,
      bumpScale: 0.006,
      patternType: "smooth_solid",
    },
    interior_feature_wall: {
      surfaceId: "interior_feature_wall",
      name: "Dulux Tranquil Retreat Feature Wall",
      category: "paint",
      baseColorHex: "#cbd5cb",
      secondaryColorHex: "#94a398",
      roughness: 0.45,
      metalness: 0.02,
      textureScaleMeters: 1.6,
      bumpScale: 0.01,
      patternType: "smooth_solid",
    },
    interior_floor_living: {
      surfaceId: "interior_floor_living",
      name: "600×600mm Rectified Porcelain Floor Tile (Warm Stone)",
      category: "tiles",
      baseColorHex: "#ede8df",
      secondaryColorHex: "#8c857b",
      roughness: 0.22,
      metalness: 0.08,
      textureScaleMeters: 2.4,
      bumpScale: 0.018,
      patternType: "porcelain_tile",
    },
    interior_floor_bedrooms: {
      surfaceId: "interior_floor_bedrooms",
      name: "100% NZ Wool Plush Loop-Pile Carpet (Warm Oatmeal Taupe)",
      category: "paint",
      baseColorHex: "#c4b5a3",
      secondaryColorHex: "#8f806f",
      roughness: 0.90,
      metalness: 0.0,
      textureScaleMeters: 1.2,
      bumpScale: 0.035,
      patternType: "plush_carpet",
    },
    interior_floor_wet_areas: {
      surfaceId: "interior_floor_wet_areas",
      name: "600×600mm Rectified Carrara Porcelain Tile",
      category: "tiles",
      baseColorHex: "#e4ebf1",
      secondaryColorHex: "#7b8898",
      roughness: 0.18,
      metalness: 0.08,
      textureScaleMeters: 2.4,
      bumpScale: 0.018,
      patternType: "porcelain_tile",
    },
    interior_ceiling: {
      surfaceId: "interior_ceiling",
      name: "Dulux Ceiling White Flat Acrylic",
      category: "paint",
      baseColorHex: "#ffffff",
      secondaryColorHex: "#f8fafc",
      roughness: 0.65,
      metalness: 0.0,
      textureScaleMeters: 2.5,
      bumpScale: 0.004,
      patternType: "smooth_solid",
    },
    interior_skirting_architraves: {
      surfaceId: "interior_skirting_architraves",
      name: "Dulux Lexicon Quarter Semi-Gloss Trim",
      category: "paint",
      baseColorHex: "#ffffff",
      secondaryColorHex: "#e2e8f0",
      roughness: 0.26,
      metalness: 0.04,
      textureScaleMeters: 1.5,
      bumpScale: 0.005,
      patternType: "smooth_solid",
    },
    kitchen_cabinetry_lower: {
      surfaceId: "kitchen_cabinetry_lower",
      name: "Polytec Ravine Natural Oak Base Joinery",
      category: "timber",
      baseColorHex: "#c79252",
      secondaryColorHex: "#8c5828",
      roughness: 0.32,
      metalness: 0.05,
      textureScaleMeters: 1.4,
      bumpScale: 0.015,
      patternType: "timber_plank",
    },
    kitchen_cabinetry_upper: {
      surfaceId: "kitchen_cabinetry_upper",
      name: "Polytec Polar White Matte Overheads",
      category: "paint",
      baseColorHex: "#f8fafc",
      secondaryColorHex: "#e2e8f0",
      roughness: 0.3,
      metalness: 0.04,
      textureScaleMeters: 1.4,
      bumpScale: 0.008,
      patternType: "smooth_solid",
    },
    kitchen_benchtop: {
      surfaceId: "kitchen_benchtop",
      name: "Caesarstone Calacatta Nuvo (40mm Stone)",
      category: "stone",
      baseColorHex: "#f8fafc",
      secondaryColorHex: "#94a3b8",
      roughness: 0.12,
      metalness: 0.08,
      textureScaleMeters: 1.6,
      bumpScale: 0.008,
      patternType: "marble_vein",
    },
    kitchen_splashback: {
      surfaceId: "kitchen_splashback",
      name: "Artisan Glazed Subway Tile Splashback",
      category: "tiles",
      baseColorHex: "#f1f5f9",
      secondaryColorHex: "#94a3b8",
      roughness: 0.14,
      metalness: 0.12,
      textureScaleMeters: 0.8,
      bumpScale: 0.022,
      patternType: "subway_tile",
    },
  };
}

// ============================================================================
// REACTIVE ZUSTAND-STYLE STORE FOR REACT + IMPERATIVE THREE.JS SCENE MANAGER
// ============================================================================

export interface HouseMaterialStoreState {
  surfaces: Record<SemanticSurfaceId, SurfaceMaterialConfig>;
  selectedSurfaceId: SemanticSurfaceId | null;
  customGeneratedPresets: MaterialPresetOption[];
  lastUpdatedSurfaceId: SemanticSurfaceId | null;
  lastUpdatedTimestamp: number;
  updateSurfaceMaterial: (
    surfaceId: SemanticSurfaceId,
    patch: Partial<SurfaceMaterialConfig>
  ) => void;
  applyPresetToSurface: (surfaceId: SemanticSurfaceId, presetId: string) => void;
  applyBatchUpdates: (
    updates: Array<{
      surfaceId: SemanticSurfaceId;
      config: Partial<SurfaceMaterialConfig>;
    }>
  ) => void;
  addCustomGeneratedPreset: (preset: MaterialPresetOption) => void;
  setSelectedSurfaceId: (surfaceId: SemanticSurfaceId | null) => void;
  resetSurface: (surfaceId: SemanticSurfaceId) => void;
  resetAllSurfaces: () => void;
}

type Listener = (state: HouseMaterialStoreState) => void;
const listeners = new Set<Listener>();

function enrichWithProceduralMaps(config: SurfaceMaterialConfig): SurfaceMaterialConfig {
  const maps = getOrGeneratePbrMaps(config);
  if (!maps) return config;
  return {
    ...config,
    albedoMapUrl: config.albedoMapUrl || maps.albedoDataUrl,
    normalMapUrl: config.normalMapUrl || maps.normalDataUrl,
    roughnessMapUrl: config.roughnessMapUrl || maps.roughnessDataUrl,
  };
}

let storeState: HouseMaterialStoreState = {
  surfaces: createDefaultSurfaceConfigs(),
  selectedSurfaceId: "exterior_wall_main",
  customGeneratedPresets: [],
  lastUpdatedSurfaceId: null,
  lastUpdatedTimestamp: Date.now(),

  updateSurfaceMaterial: (surfaceId, patch) => {
    const existing = storeState.surfaces[surfaceId];
    if (!existing) return;
    const merged: SurfaceMaterialConfig = enrichWithProceduralMaps({
      ...existing,
      ...patch,
      surfaceId,
      // Clear cached procedural URLs if color or pattern changed without explicit URL override
      albedoMapUrl: patch.albedoMapUrl,
      normalMapUrl: patch.normalMapUrl,
      roughnessMapUrl: patch.roughnessMapUrl,
    });
    storeState = {
      ...storeState,
      surfaces: {
        ...storeState.surfaces,
        [surfaceId]: merged,
      },
      lastUpdatedSurfaceId: surfaceId,
      lastUpdatedTimestamp: Date.now(),
    };
    listeners.forEach((l) => l(storeState));
  },

  applyPresetToSurface: (surfaceId, presetId) => {
    const preset =
      MATERIAL_PRESET_CATALOG.find((p) => p.presetId === presetId) ||
      storeState.customGeneratedPresets.find((p) => p.presetId === presetId);
    if (!preset) return;
    storeState.updateSurfaceMaterial(surfaceId, {
      name: preset.name,
      category: preset.category,
      baseColorHex: preset.baseColorHex,
      secondaryColorHex: preset.secondaryColorHex,
      roughness: preset.roughness,
      metalness: preset.metalness,
      textureScaleMeters: preset.textureScaleMeters,
      bumpScale: preset.bumpScale,
      patternType: preset.patternType,
      albedoMapUrl: preset.albedoMapUrl,
      normalMapUrl: preset.normalMapUrl,
      roughnessMapUrl: preset.roughnessMapUrl,
    });
  },

  applyBatchUpdates: (updates) => {
    if (!updates || updates.length === 0) return;
    const nextSurfaces = { ...storeState.surfaces };
    let lastId: SemanticSurfaceId | null = storeState.lastUpdatedSurfaceId;
    for (const { surfaceId, config } of updates) {
      const existing = nextSurfaces[surfaceId];
      if (!existing) continue;
      nextSurfaces[surfaceId] = enrichWithProceduralMaps({
        ...existing,
        ...config,
        surfaceId,
        albedoMapUrl: config.albedoMapUrl,
        normalMapUrl: config.normalMapUrl,
        roughnessMapUrl: config.roughnessMapUrl,
      });
      lastId = surfaceId;
    }
    storeState = {
      ...storeState,
      surfaces: nextSurfaces,
      selectedSurfaceId: lastId || storeState.selectedSurfaceId,
      lastUpdatedSurfaceId: lastId,
      lastUpdatedTimestamp: Date.now(),
    };
    listeners.forEach((l) => l(storeState));
  },

  addCustomGeneratedPreset: (preset) => {
    storeState = {
      ...storeState,
      customGeneratedPresets: [
        preset,
        ...storeState.customGeneratedPresets.filter((p) => p.presetId !== preset.presetId),
      ],
    };
    listeners.forEach((l) => l(storeState));
  },

  setSelectedSurfaceId: (surfaceId) => {
    if (storeState.selectedSurfaceId === surfaceId) return;
    storeState = {
      ...storeState,
      selectedSurfaceId: surfaceId,
    };
    listeners.forEach((l) => l(storeState));
  },

  resetSurface: (surfaceId) => {
    const defaults = createDefaultSurfaceConfigs();
    const def = defaults[surfaceId];
    if (!def) return;
    storeState.updateSurfaceMaterial(surfaceId, def);
  },

  resetAllSurfaces: () => {
    const defaults = createDefaultSurfaceConfigs();
    storeState = {
      ...storeState,
      surfaces: defaults,
      lastUpdatedSurfaceId: null,
      lastUpdatedTimestamp: Date.now(),
    };
    listeners.forEach((l) => l(storeState));
  },
};

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getState(): HouseMaterialStoreState {
  return storeState;
}

export function useHouseMaterialStore(): HouseMaterialStoreState;
export function useHouseMaterialStore<T>(selector: (state: HouseMaterialStoreState) => T): T;
export function useHouseMaterialStore<T>(
  selector?: (state: HouseMaterialStoreState) => T
): T | HouseMaterialStoreState {
  const state = useSyncExternalStore(subscribe, getState, getState);
  return selector ? selector(state) : state;
}

useHouseMaterialStore.getState = getState;
useHouseMaterialStore.subscribe = subscribe;
