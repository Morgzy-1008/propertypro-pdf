/**
 * 3D Studio & Architectural Elevations Data Models
 * Supports parametric 3D building generation, Australian hip roofs,
 * interior fixtures, and 2D architectural CAD elevation projections.
 */

export type CeilingHeightPreset = 2440 | 2590 | 2740 | 2900;

export type FloorFinish = "timber" | "carpet" | "tiles" | "concrete" | "decking";

export type RoomCategory =
  | "Living"
  | "Family"
  | "Dining"
  | "Kitchen"
  | "Master Bed"
  | "Bed 2"
  | "Bed 3"
  | "Bed 4"
  | "Bed 5"
  | "Bath"
  | "Ensuite"
  | "WC"
  | "Powder"
  | "Laundry"
  | "Cinema"
  | "Media"
  | "Lounge"
  | "Study"
  | "Mud Nook"
  | "Study/WIL"
  | "Butler Pantry"
  | "Scullery"
  | "Gallery"
  | "Balcony"
  | "Stairs"
  | "Void"
  | "Robe"
  | "Store"
  | "WIR"
  | "Alfresco"
  | "Porch"
  | "Garage"
  | "Hallway"
  | "Entry";

export interface LevelConfig3D {
  level: number; // 0 = Ground Floor (Front Entry), 1 = Split / Lower-Upper Ground Level, 2 = First Floor (Upper Storey)
  name: string;
  shortName: string;
  elevationOffsetM: number; // Vertical offset in metres above base FFL (0.30m)
  ceilingHeightMm: CeilingHeightPreset;
  areaM2?: number;
  floorplanCrop?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  worldBounds?: {
    x: number;
    z: number;
    widthM: number;
    depthM: number;
  };
}

export interface Point2D {
  x: number;
  y: number; // in meters (architectural floorplan coordinates)
}

export interface WallSegment {
  id: string;
  start: [number, number]; // [x, y] in meters
  end: [number, number];   // [x, y] in meters
  thickness: number;       // in meters, e.g. 0.25m for exterior, 0.09m for interior
  height?: number;         // defaults to room ceiling height
  isExterior: boolean;
  material?: string;       // e.g. 'brick_austral', 'render_monument', 'plaster_white'
  level?: number;          // 0 = Ground, 1 = Split Level, 2 = First Floor
  elevationOffsetM?: number; // metres above base FFL
}

export type OpeningType =
  | "window"
  | "door"
  | "sliding_door"
  | "stacker_door"
  | "barn_door"
  | "cavity_slider"
  | "garage_door"
  | "archway"
  | "open_hamper";

export interface OpenHamperSegment {
  id: string;
  start: [number, number]; // [x, z] in meters
  end: [number, number];   // [x, z] in meters
  thickness: number;       // 0.09m (90mm dashed line: 70mm frame + 10mm plaster each side)
  bulkheadHeightM?: number; // clear walk-through height to underside of hamper (default 2.10m)
  label: string;
  level?: number;
  elevationOffsetM?: number;
}

export interface Opening3D {
  id: string;
  wallId?: string;         // Hosted parent WallSegment ID
  positionAlongWallRatio?: number; // 0.0 to 1.0 offset along parent wall segment
  swingDirection?: "left" | "right";
  type: OpeningType;
  code: string;            // e.g. 'W01', 'SW 12.21', 'EXT 1020', 'STACKER 21.30', 'BARN 1200'
  label: string;
  position: [number, number]; // [x, y] in meters on floorplan
  wallOrientation: "horizontal" | "vertical"; // wall direction
  width: number;           // in meters
  height: number;          // in meters
  sillHeight: number;      // in meters from FFL (headHeight - height)
  headHeight: number;      // in meters from FFL (standard 2.10m)
  hingeSide?: "left" | "right";
  hingePoint?: [number, number];  // exact [x, z] hinge pivot in meters
  closedPoint?: [number, number]; // exact [x, z] latch jamb in meters
  openPoint?: [number, number];   // exact [x, z] open door leaf tip in meters
  bifoldPeak?: [number, number];  // exact [x, z] bifold fold vertex in meters
  isExterior?: boolean;
  elevationFacing?: "north" | "south" | "east" | "west";
  level?: number;
  elevationOffsetM?: number;
}

export interface Room3D {
  id: string;
  name: RoomCategory;
  category?: string;
  customLabel?: string;
  polygon: [number, number][]; // 2D vertices in meters
  center: [number, number];    // centroid [x, y] in meters
  floorFinish: FloorFinish;
  areaM2: number;
  dimensionsText?: string;    // e.g. '3.9 x 3.5'
  ceilingHeight?: number;     // e.g. 2.44, 2.59, 2.74, 2.90
  isModified?: boolean;       // custom addition/modification flag
  level?: number;             // 0 = Ground, 1 = Split Level, 2 = First Floor
  elevationOffsetM?: number;  // metres above base FFL
}

export type FixtureType =
  | "kitchen_island"
  | "kitchen_cabinetry"
  | "kitchen_sink"
  | "dishwasher"
  | "cooktop_oven"
  | "fridge_space"
  | "pantry_shelving"
  | "butler_pantry"
  | "study_desk"
  | "vanity_single"
  | "vanity_double"
  | "shower"
  | "bath"
  | "toilet"
  | "laundry_tub"
  | "washing_machine"
  | "linen_joinery"
  | "robe_joinery"
  | "bed_queen"
  | "bed_double"
  | "sofa_sectional"
  | "coffee_table"
  | "dining_table"
  | "cinema_seating"
  | "mud_nook_bench"
  | "tv_console"
  | "tv_entertainment_unit"
  | "wardrobe"
  | "accent_armchair"
  | "indoor_plant"
  | "alfresco_dining"
  | "alfresco_bbq"
  | "outdoor_lounge"
  | "buffet_sideboard"
  | "staircase"
  | "balustrade";

export interface FurnitureCatalogItem {
  id: string;
  type: FixtureType;
  name: string;
  category: "Living & Lounge" | "Dining & Kitchen" | "Bedrooms" | "Media & Study" | "Alfresco & Outdoor" | "Plants & Decor";
  defaultRoom: RoomCategory;
  width: number;
  depth: number;
  height: number;
  elevationY: number;
  description: string;
}

export const FURNITURE_CATALOG_ITEMS: FurnitureCatalogItem[] = [
  {
    id: "cat_sofa_sectional",
    type: "sofa_sectional",
    name: "Modular L-Shape Linen Sofa + Rug",
    category: "Living & Lounge",
    defaultRoom: "Living",
    width: 2.85,
    depth: 1.75,
    height: 0.85,
    elevationY: 0.42,
    description: "Plush 5-seater L-shape modular linen lounge with scatter cushions & woven wool rug",
  },
  {
    id: "cat_coffee_table",
    type: "coffee_table",
    name: "Travertine Plinth Coffee Table",
    category: "Living & Lounge",
    defaultRoom: "Living",
    width: 1.25,
    depth: 0.70,
    height: 0.42,
    elevationY: 0.21,
    description: "Designer fluted travertine coffee table with art book stack & ceramic vessel",
  },
  {
    id: "cat_tv_unit",
    type: "tv_entertainment_unit",
    name: "Fluted Oak Credenza & 75\" OLED TV",
    category: "Living & Lounge",
    defaultRoom: "Living",
    width: 2.20,
    depth: 0.44,
    height: 0.52,
    elevationY: 0.26,
    description: "Low-line timber entertainment credenza with soundbar & wall-mounted 75\" OLED display",
  },
  {
    id: "cat_accent_armchair",
    type: "accent_armchair",
    name: "Bouclé Accent Armchair & Side Table",
    category: "Living & Lounge",
    defaultRoom: "Living",
    width: 0.88,
    depth: 0.84,
    height: 0.78,
    elevationY: 0.39,
    description: "Curved ivory bouclé designer occasional chair with brass drink table",
  },
  {
    id: "cat_dining_table",
    type: "dining_table",
    name: "8-Seater Solid Oak Dining Suite",
    category: "Dining & Kitchen",
    defaultRoom: "Dining",
    width: 2.20,
    depth: 1.05,
    height: 0.76,
    elevationY: 0.38,
    description: "2200mm European Oak dining table with 8 upholstered chairs, rug & centerpiece",
  },
  {
    id: "cat_buffet_sideboard",
    type: "buffet_sideboard",
    name: "Fluted Timber Dining Sideboard & Art",
    category: "Dining & Kitchen",
    defaultRoom: "Dining",
    width: 1.80,
    depth: 0.46,
    height: 0.84,
    elevationY: 0.42,
    description: "Stone-topped timber buffet credenza with sculptural vase & framed gallery artwork",
  },
  {
    id: "cat_bed_queen",
    type: "bed_queen",
    name: "King/Queen Master Suite + Side Lamps",
    category: "Bedrooms",
    defaultRoom: "Master Bed",
    width: 1.85,
    depth: 2.10,
    height: 0.70,
    elevationY: 0.35,
    description: "Upholstered fluted headboard, layered Euro pillows, waffle throw, rug & twin lamp nightstands",
  },
  {
    id: "cat_bed_double",
    type: "bed_double",
    name: "Double Bedroom Suite + Nightstand",
    category: "Bedrooms",
    defaultRoom: "Bed 2",
    width: 1.48,
    depth: 1.98,
    height: 0.64,
    elevationY: 0.32,
    description: "Double timber bed frame with upholstered headboard, linen bedding, throw & bedside lamp",
  },
  {
    id: "cat_cinema_seating",
    type: "cinema_seating",
    name: "Home Theatre Recliner Lounge Suite",
    category: "Media & Study",
    defaultRoom: "Cinema",
    width: 2.55,
    depth: 1.05,
    height: 0.92,
    elevationY: 0.46,
    description: "3-seat charcoal leather cinema recliners with brass cupholders & plush headrests",
  },
  {
    id: "cat_study_desk",
    type: "study_desk",
    name: "Executive Timber Study Desk & Display",
    category: "Media & Study",
    defaultRoom: "Study",
    width: 1.55,
    depth: 0.75,
    height: 0.76,
    elevationY: 0.38,
    description: "Architectural timber home office desk with ergonomic chair & ultrawide studio monitor",
  },
  {
    id: "cat_alfresco_dining",
    type: "alfresco_dining",
    name: "Alfresco Spotted Gum Outdoor Dining",
    category: "Alfresco & Outdoor",
    defaultRoom: "Alfresco",
    width: 2.10,
    depth: 1.00,
    height: 0.76,
    elevationY: 0.38,
    description: "Slatted hardwood outdoor 6-seater dining table & weather-resistant woven chairs",
  },
  {
    id: "cat_alfresco_bbq",
    type: "alfresco_bbq",
    name: "Alfresco Built-In BBQ & Outdoor Kitchen",
    category: "Alfresco & Outdoor",
    defaultRoom: "Alfresco",
    width: 1.85,
    depth: 0.65,
    height: 0.92,
    elevationY: 0.46,
    description: "Stone-topped outdoor kitchen joinery with 6-burner hooded stainless BBQ & bar fridge",
  },
  {
    id: "cat_outdoor_lounge",
    type: "outdoor_lounge",
    name: "Coastal Teak Outdoor Daybed Lounge",
    category: "Alfresco & Outdoor",
    defaultRoom: "Alfresco",
    width: 2.15,
    depth: 1.45,
    height: 0.78,
    elevationY: 0.39,
    description: "Teak outdoor resort lounge with Sunbrella linen cushions & slatted coffee table",
  },
  {
    id: "cat_indoor_plant",
    type: "indoor_plant",
    name: "Fiddle-Leaf Fig Designer Planter",
    category: "Plants & Decor",
    defaultRoom: "Living",
    width: 0.58,
    depth: 0.58,
    height: 1.45,
    elevationY: 0.72,
    description: "Fluted ceramic planter pot with lush architectural Fiddle-Leaf Fig tree",
  },
];

export interface Fixture3D {
  id: string;
  type: FixtureType;
  roomName: string;
  position: [number, number, number]; // [x, y_elevation, z] in meters
  rotationY: number;                  // rotation around Y axis in radians
  rotationDeg?: number;
  dimensions?: [number, number, number];
  width: number;                      // in meters
  depth: number;                      // in meters
  height: number;                     // in meters
  label: string;
  level?: number;
  elevationOffsetM?: number;
}

export type RoofType = "hip" | "gable" | "skillion" | "flat";

export interface RoofConfig {
  type: RoofType;
  pitchDeg: number;         // Australian standard 22.5°
  eavesOverhangM: number;   // standard 0.45m (450mm)
  material: "colorbond" | "concrete_tile" | "terracotta";
  colorHex: string;         // e.g. '#2b2e35' (Monument), '#dfe3e6' (Surfmist)
  colorName: string;        // 'Monument', 'Surfmist', 'Basalt', etc.
  fasciaColorHex: string;
  gutterColorHex: string;
  ridgeHeightM: number;     // calculated peak
  showRoof: boolean;
  cutawayMode: boolean;     // Dollhouse open cutaway vs exterior enclosed
  transparency: number;     // 0 = solid, 0.5 = see-through x-ray
}

export interface BuildingSchedule {
  livingM2: number;
  lowerLivingM2?: number;
  groundLivingM2?: number;
  firstLivingM2?: number;
  garageM2: number;
  alfrescoM2: number;
  porchM2: number;
  balconyM2?: number;
  totalM2: number;
  bedrooms: number;
  bathrooms: number;
  cars: number;
}

export type FacadeType =
  | "modern"
  | "hamptons"
  | "executive"
  | "contempo"
  | "bronte"
  | "skillion"
  | "palm_springs"
  | "palm_springs_parapet"
  | "acreage"
  | "acreage_homestead";

export type FenceStyle =
  | "colorbond_monument"
  | "colorbond_woodland"
  | "treated_pine"
  | "rendered_brick";

export interface BoundaryConfig {
  showFencing: boolean;
  fenceStyle: FenceStyle;
  fenceHeightM: number;       // standard 1.80m Australian residential boundary fence
  lotWidthM: number;          // e.g. 15.0m
  lotLengthM: number;         // e.g. 30.0m
  frontSetbackM: number;      // standard 4.5m
  rearSetbackM: number;       // standard 3.5m
  leftSetbackM: number;       // standard 1.2m
  rightSetbackM: number;      // standard 1.0m (or 0m for zero lot line)
  hasSideGates: boolean;      // pedestrian access gates on side return fence
}

export interface MaterialPaletteConfig {
  facade: FacadeType;
  brickStyle: "austral_urban_one" | "austral_everyday_life" | "austral_whitsunday" | "monument_dark";
  renderColor: "crisp_white" | "monument" | "cashmere" | "warm_stone";
  claddingType: "scyon_linea_white" | "cedar_shiplap" | "vertical_groove" | "none";
  roofColor: "monument" | "surfmist" | "shale_grey" | "basalt" | "terracotta_tile";
  windowFrameColor: "monument" | "pearl_white" | "surfmist" | "anodised_silver";
  garageDoorColor: "monument" | "surfmist" | "timber_look" | "basalt";
  drivewayFinish: "exposed_aggregate" | "charcoal_stamped" | "plain_concrete";
}

export interface InteriorFitoutConfig {
  benchtopThicknessMm: 20 | 40;
  waterfallEnds: boolean | 0 | 1 | 2;
  stoneColor:
    | "calacatta_white"
    | "carrara_marble"
    | "concrete_grey"
    | "empirical_black"
    | "caesarstone_concrete"
    | "charcoal_soapstone"
    | "warm_travertine";
  cabinetryFinish:
    | "matte_white"
    | "polytec_oak"
    | "natural_oak"
    | "florentine_walnut"
    | "polytec_charcoal"
    | "botanic_sage"
    | "charcoal_satin"
    | "sage_shaker";
  sinkStyle:
    | "double_undermount"
    | "undermount_double"
    | "single_undermount"
    | "single_wide_bowl"
    | "topmount_stainless"
    | "black_granite"
    | "matte_black_granite";
  tapwareFinish:
    | "chrome"
    | "matte_black"
    | "brushed_nickel"
    | "brushed_gold"
    | "brushed_brass";
  ensuiteVanityStyle:
    | "single_900"
    | "single_1200"
    | "extended_1200"
    | "double_1500"
    | "double_1800";
  bathStyle:
    | "freestanding_oval"
    | "inset_acrylic"
    | "inset_tiled"
    | "back_to_wall";
  showFurniture: boolean;
  showJoineryAndSinks: boolean;
  upgradeDoorJoineryHeights?: boolean; // 2340mm doors & joinery + 2400mm garage door when 2740mm+ ceiling selected
}

export interface CustomFacadeConfig {
  mode: "generic" | "tailored" | "design_tailored";
  facadePreset?: FacadeType;
  tailoredName?: string;
  tailoredPresetName?: string;
  accentMaterial?: string;
  rooflineStyle:
    | "hip_22_5"
    | "standard_hip"
    | "feature_front_gable"
    | "skillion_mono"
    | "box_parapet";
  porticoStyle:
    | "rendered_pier_beam"
    | "double_brick_piers"
    | "twin_posts_canopy"
    | "cedar_batten_screen"
    | "cantilever_blade"
    | "pitched_gable";
  porticoProjectionM: number; // 0.6m to 2.2m
  garageArticulation:
    | "standard_step"
    | "stepped_setback"
    | "flush_parapet"
    | "recessed_timber_frame"
    | "cantilever_brow";
  frontWindowStyle?:
    | "standard_sliding"
    | "twin_vertical_slots"
    | "hamptons_colonial"
    | "floor_to_ceiling_feature";
  featureBladeWall: boolean;
  alfrescoPiers?: boolean;
}

export interface BuildingDesign3D {
  id: string;
  name: string;
  variantName?: string;
  clientName?: string;
  housingType: "Single Storey" | "Double Storey" | "Split Level" | "Dual Living";
  isCustomPlan: boolean;
  widthM: number;
  lengthM: number;
  ceilingHeightM: number;
  levels?: LevelConfig3D[];
  schedule: BuildingSchedule;
  rooms: Room3D[];
  walls: WallSegment[];
  openings: Opening3D[];
  openHampers?: OpenHamperSegment[]; // 90mm dashed lines (open hampers, not doors or full walls)
  exactStructuralWalls?: boolean;    // true when walls are 1:1 calibrated to the CAD floorplan
  floorplanImageUrl?: string;        // e.g. '/floorplans/AMBER 21.png'
  floorplanCrop?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  fixtures: Fixture3D[];
  roof: RoofConfig;
  facade?: FacadeType;
  boundary?: BoundaryConfig;
  materials?: MaterialPaletteConfig;
  fitout?: InteriorFitoutConfig;
  customFacade?: CustomFacadeConfig;
  notes?: string[];
  annotations?: string[];
}

export type ElevationView = "north" | "south" | "east" | "west";

export interface ArchitecturalDatum {
  label: string;
  code: string;
  rlValue: number;          // relative level in meters
  yPosition: number;        // CAD coordinate
  isMajor: boolean;
}

export interface ElevationProjection {
  view: ElevationView;
  title: string;
  cardinalDirection: string;
  scaleText: string;
  widthM: number;
  heightM: number;
  eavesHeightM: number;
  ridgeHeightM: number;
  fflHeightM: number;
  datums: ArchitecturalDatum[];
  materials: {
    name: string;
    description: string;
    sampleColor: string;
  }[];
  visibleOpenings: {
    code: string;
    label: string;
    widthMm: number;
    heightMm: number;
    sillMm: number;
    xM: number;
    yM: number;
    type: OpeningType;
  }[];
  svgContent: string;
}

export interface SceneSelectedElement {
  id: string;
  kind: "fixture" | "opening" | "wall";
  elementType: string;
  type?: string;
  wallId?: string;
  label: string;
  roomName?: string;
  level: number;
  position: [number, number] | [number, number, number];
  rotationDeg: number;
  screenX?: number;
  screenY?: number;
}

export type SceneActionType =
  | "remove_element"
  | "add_element"
  | "move_element"
  | "rotate_element"
  | "resize_element"
  | "toggle_visibility"
  | "auto_clean_fixtures";

export interface SceneAction {
  action: SceneActionType;
  targetElementType?: string;
  targetElementId?: string;
  locationFilter?: string;
  newPosition?: [number, number];
  newRotationDeg?: number;
  newWidth?: number;
  newDepth?: number;
}

