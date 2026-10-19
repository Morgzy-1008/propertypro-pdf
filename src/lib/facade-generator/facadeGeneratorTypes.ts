import type { Division } from "@/lib/divisionContext";

export type FacadeHousingCategory =
  | "Single Storey"
  | "Single Storey (Narrow Lot)"
  | "Double Storey"
  | "Narrow Double Storey"
  | "Dual Living"
  | "Split Level"
  | "Acreage"
  | "Granny Flat";

export type FacadeGarageConfig =
  | "Double Garage"
  | "Single Garage"
  | "Triple Garage"
  | "No Garage";

export type FacadeArchitecturalStyle =
  | "Modern Coastal"
  | "Hamptons"
  | "Contemporary Box"
  | "Modern Barn"
  | "Classic Brick & Render"
  | "Palm Springs"
  | "Urban Industrial"
  | "French Provincial";

export type FacadeRoofStyle =
  | "Hip Roof"
  | "Gable / Barn Pitch"
  | "Flat Parapet / Box"
  | "Skillion / Mono-Pitch"
  | "Coastal Mixed Gable & Skillion";

export type FacadeLightingMood =
  | "Crisp Australian Daylight (11am)"
  | "Golden Hour Twilight"
  | "Warm Morning Sun"
  | "Architectural Studio Overcast";

export type FeaturePierMaterial =
  | "Limestone Ashlar"
  | "Stacked Sandstone"
  | "Recycled Hawthorn Brick"
  | "Off-Form Concrete"
  | "Smooth Render Pier"
  | "None";

export interface FacadeMaterialSpec {
  roofColorName: string;
  roofColorHex: string;
  roofMaterial: "Colorbond Corrugated" | "Colorbond Matt Standing Seam" | "Monier Concrete Tile";
  wallRenderName: string;
  wallRenderHex: string;
  brickworkName: string;
  brickworkHex: string;
  claddingType:
    | "Scyon Linea 180mm Weatherboard"
    | "James Hardie Axon Vertical Grooved"
    | "Cemintel Territory Cladding"
    | "Smooth Architectural Acrylic Render"
    | "Colorbond Standing Seam Cladding";
  claddingColorName: string;
  claddingColorHex: string;
  featurePierMaterial: FeaturePierMaterial;
  battenAccentName: string;
  battenAccentHex: string;
  garageDoorStyle:
    | "Sectional Timber-Look Slats"
    | "Flush Mount Matte Panel"
    | "Hamptons Shaker Panel"
    | "Architectural Negative Detail";
  garageDoorColorName: string;
  garageDoorHex: string;
  windowFrameColorName: string;
  windowFrameHex: string;
  drivewayFinish: "Exposed Aggregate Charcoal" | "Honed Coastal Salt & Pepper" | "Travertine Cobble";
  lightingMood: FacadeLightingMood;
}

export interface CustomFacadeRecord {
  id: string;
  name: string;
  housingCategory: FacadeHousingCategory;
  garageConfig: FacadeGarageConfig;
  minLotWidthM: number;
  style: FacadeArchitecturalStyle;
  roofStyle: FacadeRoofStyle;
  materials: FacadeMaterialSpec;
  compatibleFamilies: string[];
  targetDesignName?: string;
  qldUplift: number;
  nswUplift: number;
  promptHistory: string[];
  description: string;
  imageUrl: string;
  baseReferenceUrl: string;
  status: "draft" | "pending_review" | "approved" | "rejected";
  createdBy: {
    id: string;
    name: string;
    role: string;
    division: Division;
  };
  createdAt: string;
  submittedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  adminNotes?: string;
}

export interface FacadeChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  appliedChanges?: string[];
  matchedDesignsSummary?: string;
  suggestedPrompts?: string[];
  renderSnapshotUrl?: string;
}

export interface FacadeSpecPatch {
  name?: string;
  housingCategory?: FacadeHousingCategory;
  garageConfig?: FacadeGarageConfig;
  minLotWidthM?: number;
  style?: FacadeArchitecturalStyle;
  roofStyle?: FacadeRoofStyle;
  materials?: Partial<FacadeMaterialSpec>;
  compatibleFamilies?: string[];
  targetDesignName?: string;
  qldUplift?: number;
  nswUplift?: number;
  description?: string;
}
