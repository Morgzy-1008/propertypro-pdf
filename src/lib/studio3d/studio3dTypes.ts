/**
 * 3D Studio & Architectural Elevations Data Models
 * Supports parametric 3D building generation, Australian hip roofs,
 * interior fixtures, and 2D architectural CAD elevation projections.
 */

export type CeilingHeightPreset = 2440 | 2590 | 2740 | 2900;

export type FloorFinish = "timber" | "carpet" | "tiles" | "concrete" | "decking";

export type RoomCategory =
  | "Living"
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
  | "Laundry"
  | "Cinema"
  | "Mud Nook"
  | "Study/WIL"
  | "Butler Pantry"
  | "Alfresco"
  | "Porch"
  | "Garage"
  | "Hallway"
  | "Entry";

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
}

export type OpeningType =
  | "window"
  | "door"
  | "sliding_door"
  | "stacker_door"
  | "barn_door"
  | "cavity_slider"
  | "garage_door"
  | "archway";

export interface Opening3D {
  id: string;
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
  isExterior?: boolean;
  elevationFacing?: "north" | "south" | "east" | "west";
}

export interface Room3D {
  id: string;
  name: RoomCategory;
  customLabel?: string;
  polygon: [number, number][]; // 2D vertices in meters
  center: [number, number];    // centroid [x, y] in meters
  floorFinish: FloorFinish;
  areaM2: number;
  dimensionsText?: string;    // e.g. '3.9 x 3.5'
  ceilingHeight?: number;     // e.g. 2.44, 2.59, 2.74, 2.90
  isModified?: boolean;       // custom addition/modification flag
}

export type FixtureType =
  | "kitchen_island"
  | "kitchen_cabinetry"
  | "butler_pantry"
  | "vanity_single"
  | "vanity_double"
  | "shower"
  | "bath"
  | "toilet"
  | "bed_queen"
  | "bed_double"
  | "sofa_sectional"
  | "dining_table"
  | "cinema_seating"
  | "mud_nook_bench"
  | "tv_console"
  | "wardrobe";

export interface Fixture3D {
  id: string;
  type: FixtureType;
  roomName: string;
  position: [number, number, number]; // [x, y_elevation, z] in meters
  rotationY: number;                  // rotation around Y axis in radians
  width: number;                      // in meters
  depth: number;                      // in meters
  height: number;                     // in meters
  label: string;
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
  garageM2: number;
  alfrescoM2: number;
  porchM2: number;
  totalM2: number;
  bedrooms: number;
  bathrooms: number;
  cars: number;
}

export type FacadeType = "modern" | "hamptons" | "executive" | "contempo" | "bronte";

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

export interface BuildingDesign3D {
  id: string;
  name: string;
  variantName?: string;
  clientName?: string;
  housingType: "Single Storey" | "Double Storey";
  isCustomPlan: boolean;
  widthM: number;
  lengthM: number;
  ceilingHeightM: number;
  schedule: BuildingSchedule;
  rooms: Room3D[];
  walls: WallSegment[];
  openings: Opening3D[];
  fixtures: Fixture3D[];
  roof: RoofConfig;
  facade?: FacadeType;
  boundary?: BoundaryConfig;
  materials?: MaterialPaletteConfig;
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
