import { HUDSON_DIMENSIONS_REGISTRY, type HudsonDimensionRecord } from "@/lib/hudsonDimensions.data";
import { getGeminiApiKey } from "@/lib/land-scout/landScoutWebSearch";
import { isNarrowDoubleStorey, isSingleGarageDesign } from "@/lib/quoting/facadeLookup";
import { loadImage } from "@/components/flyer/fileToImage";
import { getDefaultCompatibleFamilies } from "./facadeGeneratorStorage";
import type {
  CustomFacadeRecord,
  FacadeArchitecturalStyle,
  FacadeGarageConfig,
  FacadeHousingCategory,
  FacadeLightingMood,
  FacadeMaterialSpec,
  FacadeRoofStyle,
  FacadeSpecPatch,
  FeaturePierMaterial,
} from "./facadeGeneratorTypes";

export interface ColorSwatchOption {
  name: string;
  hex: string;
  brand: string;
}

export const COLORBOND_ROOF_PALETTE: ColorSwatchOption[] = [
  { name: "Colorbond Monument®", hex: "#323639", brand: "Colorbond" },
  { name: "Colorbond Night Sky®", hex: "#222426", brand: "Colorbond" },
  { name: "Colorbond Basalt®", hex: "#6B6C6E", brand: "Colorbond" },
  { name: "Colorbond Woodland Grey®", hex: "#4D504B", brand: "Colorbond" },
  { name: "Colorbond Shale Grey™", hex: "#B8B9B6", brand: "Colorbond" },
  { name: "Colorbond Surfmist®", hex: "#E4E2DC", brand: "Colorbond" },
  { name: "Colorbond Dover White™", hex: "#F3F3EE", brand: "Colorbond" },
  { name: "Colorbond Windspray®", hex: "#888E90", brand: "Colorbond" },
  { name: "Colorbond Dune®", hex: "#B2ADA3", brand: "Colorbond" },
  { name: "Colorbond Jasper®", hex: "#6C5E53", brand: "Colorbond" },
];

export const RENDER_WALL_PALETTE: ColorSwatchOption[] = [
  { name: "Dulux Lexicon® Quarter", hex: "#F3F4F4", brand: "Dulux" },
  { name: "Dulux Natural White™", hex: "#F1EEE6", brand: "Dulux" },
  { name: "Dulux Whisper White", hex: "#EFECE6", brand: "Dulux" },
  { name: "Dulux Hog Bristle® Quarter", hex: "#E4DEC9", brand: "Dulux" },
  { name: "Dulux Tranquil Retreat", hex: "#C9C8C3", brand: "Dulux" },
  { name: "Dulux Dieskau", hex: "#A5A6A3", brand: "Dulux" },
  { name: "Dulux Domino", hex: "#37393B", brand: "Dulux" },
  { name: "Taubmans Warm Putty", hex: "#D6CFC2", brand: "Taubmans" },
];

export const BRICKWORK_PALETTE: ColorSwatchOption[] = [
  { name: "Austral Whitsunday Coastal Chalk", hex: "#DCD7CE", brand: "Austral Bricks" },
  { name: "Austral Bowral Chillingham White", hex: "#EAE6DF", brand: "Austral Bricks" },
  { name: "Austral San Selmo Recycled Hawthorn", hex: "#8E5743", brand: "Austral Bricks" },
  { name: "Austral Metallix Bronze Charcoal", hex: "#3A3C3F", brand: "Austral Bricks" },
  { name: "Austral Urban One Chiffon", hex: "#C4BAA8", brand: "Austral Bricks" },
  { name: "PGH Manhattan Dark Pewter", hex: "#46484B", brand: "PGH Bricks" },
  { name: "PGH Coastal Espresso", hex: "#5C4E44", brand: "PGH Bricks" },
];

export const BATTEN_TIMBER_PALETTE: ColorSwatchOption[] = [
  { name: "Knotwood Coastal Spotted Gum", hex: "#B5835A", brand: "Knotwood" },
  { name: "Knotwood Australian Blackbutt", hex: "#C89D6C", brand: "Knotwood" },
  { name: "Western Red Cedar Warm Walnut", hex: "#8B5434", brand: "Cedar" },
  { name: "Anodised Matte Monument Battens", hex: "#323639", brand: "Architectural" },
  { name: "Crisp Surfmist Aluminium Battens", hex: "#E4E2DC", brand: "Architectural" },
];

export const STYLE_PRESETS: Record<
  FacadeArchitecturalStyle,
  {
    roofStyle: FacadeRoofStyle;
    materials: FacadeMaterialSpec;
    baseQldUplift: number;
    baseNswUplift: number;
    summary: string;
  }
> = {
  "Modern Coastal": {
    roofStyle: "Coastal Mixed Gable & Skillion",
    materials: {
      roofColorName: "Colorbond Surfmist®",
      roofColorHex: "#E4E2DC",
      roofMaterial: "Colorbond Corrugated",
      wallRenderName: "Dulux Lexicon® Quarter",
      wallRenderHex: "#F3F4F4",
      brickworkName: "Austral Whitsunday Coastal Chalk",
      brickworkHex: "#DCD7CE",
      claddingType: "Scyon Linea 180mm Weatherboard",
      claddingColorName: "Dulux Whisper White",
      claddingColorHex: "#EFECE6",
      featurePierMaterial: "Limestone Ashlar",
      battenAccentName: "Knotwood Coastal Spotted Gum",
      battenAccentHex: "#B5835A",
      garageDoorStyle: "Sectional Timber-Look Slats",
      garageDoorColorName: "Spotted Gum Timber-Look",
      garageDoorHex: "#A6754D",
      windowFrameColorName: "Pearl White Powdercoat",
      windowFrameHex: "#F1F1EF",
      drivewayFinish: "Honed Coastal Salt & Pepper",
      lightingMood: "Crisp Australian Daylight (11am)",
    },
    baseQldUplift: 18900,
    baseNswUplift: 18400,
    summary:
      "Breezy coastal articulation with Scyon Linea 180mm weatherboards, natural Byron limestone feature pier, Spotted Gum batten screening, and Colorbond Surfmist roofing.",
  },
  Hamptons: {
    roofStyle: "Gable / Barn Pitch",
    materials: {
      roofColorName: "Colorbond Shale Grey™",
      roofColorHex: "#B8B9B6",
      roofMaterial: "Colorbond Corrugated",
      wallRenderName: "Dulux Natural White™",
      wallRenderHex: "#F1EEE6",
      brickworkName: "Austral Bowral Chillingham White",
      brickworkHex: "#EAE6DF",
      claddingType: "Scyon Linea 180mm Weatherboard",
      claddingColorName: "Dulux Tranquil Retreat",
      claddingColorHex: "#C9C8C3",
      featurePierMaterial: "Limestone Ashlar",
      battenAccentName: "Crisp Surfmist Aluminium Battens",
      battenAccentHex: "#E4E2DC",
      garageDoorStyle: "Hamptons Shaker Panel",
      garageDoorColorName: "Dulux Lexicon® Quarter",
      garageDoorHex: "#F3F4F4",
      windowFrameColorName: "Pearl White Mullions",
      windowFrameHex: "#F5F5F3",
      drivewayFinish: "Honed Coastal Salt & Pepper",
      lightingMood: "Crisp Australian Daylight (11am)",
    },
    baseQldUplift: 21500,
    baseNswUplift: 20900,
    summary:
      "Classic East-Coast Hamptons gable pediments, Tranquil Retreat Scyon Linea weatherboard cladding, white colonial window mullions, and Shaker garage door.",
  },
  "Contemporary Box": {
    roofStyle: "Flat Parapet / Box",
    materials: {
      roofColorName: "Colorbond Night Sky®",
      roofColorHex: "#222426",
      roofMaterial: "Colorbond Matt Standing Seam",
      wallRenderName: "Dulux Tranquil Retreat",
      wallRenderHex: "#C9C8C3",
      brickworkName: "Austral Metallix Bronze Charcoal",
      brickworkHex: "#3A3C3F",
      claddingType: "Cemintel Territory Cladding",
      claddingColorName: "Colorbond Monument®",
      claddingColorHex: "#323639",
      featurePierMaterial: "Off-Form Concrete",
      battenAccentName: "Knotwood Coastal Spotted Gum",
      battenAccentHex: "#B5835A",
      garageDoorStyle: "Architectural Negative Detail",
      garageDoorColorName: "Colorbond Monument®",
      garageDoorHex: "#323639",
      windowFrameColorName: "Matt Black Commercial Frame",
      windowFrameHex: "#1E2022",
      drivewayFinish: "Exposed Aggregate Charcoal",
      lightingMood: "Golden Hour Twilight",
    },
    baseQldUplift: 28500,
    baseNswUplift: 27900,
    summary:
      "Bold cantilevered architectural box parapet with Monument standing-seam cladding, off-form concrete pier, warm Spotted Gum soffit battens, and recessed LED strip lighting.",
  },
  "Modern Barn": {
    roofStyle: "Gable / Barn Pitch",
    materials: {
      roofColorName: "Colorbond Monument®",
      roofColorHex: "#323639",
      roofMaterial: "Colorbond Matt Standing Seam",
      wallRenderName: "Dulux Natural White™",
      wallRenderHex: "#F1EEE6",
      brickworkName: "Austral San Selmo Recycled Hawthorn",
      brickworkHex: "#8E5743",
      claddingType: "James Hardie Axon Vertical Grooved",
      claddingColorName: "Colorbond Monument®",
      claddingColorHex: "#323639",
      featurePierMaterial: "Recycled Hawthorn Brick",
      battenAccentName: "Western Red Cedar Warm Walnut",
      battenAccentHex: "#8B5434",
      garageDoorStyle: "Flush Mount Matte Panel",
      garageDoorColorName: "Colorbond Monument®",
      garageDoorHex: "#323639",
      windowFrameColorName: "Matt Black Commercial Frame",
      windowFrameHex: "#1E2022",
      drivewayFinish: "Exposed Aggregate Charcoal",
      lightingMood: "Warm Morning Sun",
    },
    baseQldUplift: 29500,
    baseNswUplift: 28900,
    summary:
      "High-pitched Nordic modern barn silhouette with standing-seam Colorbond Matt Monument, Axon vertical grooved cladding, and recycled Hawthorn brick feature work.",
  },
  "Classic Brick & Render": {
    roofStyle: "Hip Roof",
    materials: {
      roofColorName: "Colorbond Woodland Grey®",
      roofColorHex: "#4D504B",
      roofMaterial: "Monier Concrete Tile",
      wallRenderName: "Dulux Hog Bristle® Quarter",
      wallRenderHex: "#E4DEC9",
      brickworkName: "Austral Urban One Chiffon",
      brickworkHex: "#C4BAA8",
      claddingType: "Smooth Architectural Acrylic Render",
      claddingColorName: "Dulux Natural White™",
      claddingColorHex: "#F1EEE6",
      featurePierMaterial: "Smooth Render Pier",
      battenAccentName: "Anodised Matte Monument Battens",
      battenAccentHex: "#323639",
      garageDoorStyle: "Sectional Timber-Look Slats",
      garageDoorColorName: "Colorbond Woodland Grey®",
      garageDoorHex: "#4D504B",
      windowFrameColorName: "Colorbond Woodland Grey®",
      windowFrameHex: "#4D504B",
      drivewayFinish: "Exposed Aggregate Charcoal",
      lightingMood: "Crisp Australian Daylight (11am)",
    },
    baseQldUplift: 7200,
    baseNswUplift: 6800,
    summary:
      "Timeless Hudson Homes hip-roof streetscape with articulated brick piers, contrast acrylic render portico band, and low-maintenance Colorbond trims.",
  },
  "Palm Springs": {
    roofStyle: "Skillion / Mono-Pitch",
    materials: {
      roofColorName: "Colorbond Dover White™",
      roofColorHex: "#F3F3EE",
      roofMaterial: "Colorbond Corrugated",
      wallRenderName: "Dulux Lexicon® Quarter",
      wallRenderHex: "#F3F4F4",
      brickworkName: "Austral Bowral Chillingham White",
      brickworkHex: "#EAE6DF",
      claddingType: "Smooth Architectural Acrylic Render",
      claddingColorName: "Taubmans Warm Putty",
      claddingColorHex: "#D6CFC2",
      featurePierMaterial: "Stacked Sandstone",
      battenAccentName: "Knotwood Australian Blackbutt",
      battenAccentHex: "#C89D6C",
      garageDoorStyle: "Flush Mount Matte Panel",
      garageDoorColorName: "Dulux Lexicon® Quarter",
      garageDoorHex: "#F3F4F4",
      windowFrameColorName: "Pearl White Powdercoat",
      windowFrameHex: "#F1F1EF",
      drivewayFinish: "Travertine Cobble",
      lightingMood: "Warm Morning Sun",
    },
    baseQldUplift: 26100,
    baseNswUplift: 25400,
    summary:
      "Mid-century desert modern raked skillion roofline with breeze-block inspired articulation, stacked sandstone piers, and crisp Dover White palette.",
  },
  "Urban Industrial": {
    roofStyle: "Flat Parapet / Box",
    materials: {
      roofColorName: "Colorbond Night Sky®",
      roofColorHex: "#222426",
      roofMaterial: "Colorbond Matt Standing Seam",
      wallRenderName: "Dulux Domino",
      wallRenderHex: "#37393B",
      brickworkName: "PGH Manhattan Dark Pewter",
      brickworkHex: "#46484B",
      claddingType: "Colorbond Standing Seam Cladding",
      claddingColorName: "Colorbond Basalt®",
      claddingColorHex: "#6B6C6E",
      featurePierMaterial: "Recycled Hawthorn Brick",
      battenAccentName: "Western Red Cedar Warm Walnut",
      battenAccentHex: "#8B5434",
      garageDoorStyle: "Architectural Negative Detail",
      garageDoorColorName: "Colorbond Night Sky®",
      garageDoorHex: "#222426",
      windowFrameColorName: "Matt Black Commercial Frame",
      windowFrameHex: "#1E2022",
      drivewayFinish: "Exposed Aggregate Charcoal",
      lightingMood: "Golden Hour Twilight",
    },
    baseQldUplift: 33000,
    baseNswUplift: 32200,
    summary:
      "Architectural Soho/Industrial elevation featuring dark Manhattan brickwork, black steel portal framing, recycled brick pier accents, and warm walnut soffit linings.",
  },
  "French Provincial": {
    roofStyle: "Hip Roof",
    materials: {
      roofColorName: "Colorbond Basalt®",
      roofColorHex: "#6B6C6E",
      roofMaterial: "Monier Concrete Tile",
      wallRenderName: "Dulux Natural White™",
      wallRenderHex: "#F1EEE6",
      brickworkName: "Austral Whitsunday Coastal Chalk",
      brickworkHex: "#DCD7CE",
      claddingType: "Smooth Architectural Acrylic Render",
      claddingColorName: "Dulux Hog Bristle® Quarter",
      claddingColorHex: "#E4DEC9",
      featurePierMaterial: "Limestone Ashlar",
      battenAccentName: "Crisp Surfmist Aluminium Battens",
      battenAccentHex: "#E4E2DC",
      garageDoorStyle: "Hamptons Shaker Panel",
      garageDoorColorName: "Dulux Natural White™",
      garageDoorHex: "#F1EEE6",
      windowFrameColorName: "Matt Black Commercial Frame",
      windowFrameHex: "#1E2022",
      drivewayFinish: "Travertine Cobble",
      lightingMood: "Architectural Studio Overcast",
    },
    baseQldUplift: 31500,
    baseNswUplift: 30800,
    summary:
      "Grand Chateaux-inspired symmetry with moulded cornice bands, limestone ashlar piers, arched or mullioned black-framed windows, and fine acrylic render.",
  },
};

/**
 * Selects the exact matching 4K Hudson Homes base reference elevation image
 * for a given `(housingCategory, garageConfig, style)` combination.
 */
export function selectBaseReferenceElevation(
  housingCategory: FacadeHousingCategory,
  garageConfig: FacadeGarageConfig,
  style: FacadeArchitecturalStyle
): string {
  const isSingleGarage = garageConfig === "Single Garage";

  if (housingCategory === "Dual Living") {
    if (style === "Modern Coastal" || style === "Hamptons") {
      return "/facades/bronte-garage-outside.png";
    }
    return "/facades/bronte-garage-inside.png";
  }

  if (housingCategory === "Split Level") {
    if (style === "Hamptons" || style === "French Provincial") return "/facades/hamptons-cobalt.png";
    if (style === "Contemporary Box" || style === "Urban Industrial") return "/facades/vogue-cobalt.png";
    if (style === "Modern Coastal" || style === "Palm Springs") return "/facades/infinity-cobalt.png";
    return "/facades/classic-cobalt.png";
  }

  if (housingCategory === "Acreage") {
    if (style === "Hamptons" || style === "French Provincial") return "/facades/hampton-ranch.png";
    if (style === "Modern Barn") return "/facades/statesman-ranch.png";
    if (style === "Contemporary Box") return "/facades/vogue-ranch.png";
    if (style === "Urban Industrial") return "/facades/urban-ranch.png";
    if (style === "Modern Coastal") return "/facades/eden-ranch.png";
    return "/facades/classic-ranch.png";
  }

  if (housingCategory === "Narrow Double Storey") {
    if (isSingleGarage) {
      return "/facades/classic-single-garage-double-storey.png";
    }
    switch (style) {
      case "Modern Coastal":
        return "/facades/marina-narrow-dg.png";
      case "Hamptons":
      case "French Provincial":
        return "/facades/chateaux-narrow-dg.png";
      case "Contemporary Box":
        return "/facades/meridian-narrow-dg.png";
      case "Modern Barn":
        return "/facades/sierra-narrow-dg.png";
      case "Palm Springs":
        return "/facades/deco-narrow-dg.png";
      case "Urban Industrial":
        return "/facades/vista-narrow-dg.png";
      default:
        return "/facades/contemporary-narrow-dg.png";
    }
  }

  if (housingCategory === "Double Storey") {
    if (isSingleGarage) {
      return "/facades/classic-single-garage-double-storey.png";
    }
    switch (style) {
      case "Modern Coastal":
        return "/facades/riviera-double-storey.png";
      case "Hamptons":
        return "/facades/hamptons-double-storey.png";
      case "Contemporary Box":
        return "/facades/metro-double-storey.png";
      case "Modern Barn":
        return "/facades/statesman-double-storey.png";
      case "Palm Springs":
        return "/facades/breeze-double-storey.png";
      case "Urban Industrial":
        return "/facades/soho-double-storey.png";
      case "French Provincial":
        return "/facades/chateaux-double-storey.png";
      default:
        return "/facades/contemporary-double-storey.png";
    }
  }

  // Single Storey / Single Storey (Narrow Lot) / Granny Flat
  if (isSingleGarage || housingCategory === "Single Storey (Narrow Lot)" || housingCategory === "Granny Flat") {
    switch (style) {
      case "Modern Coastal":
        return "/facades/coastal-single-garage.png";
      case "Hamptons":
        return "/facades/hamptons-single-garage.jpg";
      case "Contemporary Box":
        return "/facades/contemporary-single-garage.png";
      case "Modern Barn":
        return "/facades/statesman-single-garage.png";
      case "Palm Springs":
        return "/facades/breeze-single-garage.png";
      case "Urban Industrial":
        return "/facades/infinity-single-garage.png";
      case "French Provincial":
        return "/facades/chateaux-single-garage.png";
      default:
        return "/facades/riviera-single-garage.png";
    }
  }

  switch (style) {
    case "Modern Coastal":
      return "/facades/coastal-single-storey.png";
    case "Hamptons":
      return "/facades/hamptons-single-storey.png";
    case "Contemporary Box":
      return "/facades/vibe-single-storey.png";
    case "Modern Barn":
      return "/facades/statesman-single-storey.png";
    case "Palm Springs":
      return "/facades/breeze-single-storey.png";
    case "Urban Industrial":
      return "/facades/nuvo-single-storey.png";
    case "French Provincial":
      return "/facades/chateaux-single-storey.png";
    default:
      return "/facades/riviera-single-storey.png";
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = (hex || "#cccccc").replace("#", "").trim();
  const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, "$1$1") : clean, 16);
  if (isNaN(num)) return { r: 200, g: 200, b: 200 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Renders a high-resolution 2400×937 widescreen custom architectural facade onto an HTML5 Canvas,
 * blending our authentic 4K Hudson Homes architectural elevation geometry with zone-aware
 * Colorbond/Dulux/Austral material re-toning, batten & stone pier detailing, and photometric lighting.
 */
export async function renderCustomFacadeCanvas(
  spec: CustomFacadeRecord
): Promise<string> {
  if (typeof document === "undefined") {
    return spec.baseReferenceUrl || "/facades/coastal-single-storey.png";
  }

  const baseSrc =
    spec.baseReferenceUrl ||
    selectBaseReferenceElevation(spec.housingCategory, spec.garageConfig, spec.style);

  try {
    const img = await loadImage(baseSrc);
    const outW = 2400;
    const outH = 937;

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return baseSrc;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Draw base architectural elevation scaled cleanly to 2400x937
    const scale = Math.max(outW / img.width, outH / img.height);
    const drawW = Math.round(img.width * scale);
    const drawH = Math.round(img.height * scale);
    const drawX = Math.round((outW - drawW) / 2);
    const drawY = Math.round((outH - drawH) / 2);
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    // Extract pixel buffer for smooth, artifact-free material & photometric grading
    const imgData = ctx.getImageData(0, 0, outW, outH);
    const data = imgData.data;

    const roofRgb = hexToRgb(spec.materials.roofColorHex);
    const wallRgb = hexToRgb(spec.materials.wallRenderHex);
    const brickRgb = hexToRgb(spec.materials.brickworkHex);
    const claddingRgb = hexToRgb(spec.materials.claddingColorHex);
    const garageRgb = hexToRgb(spec.materials.garageDoorHex);

    const isTwilight = spec.materials.lightingMood === "Golden Hour Twilight";
    const isMorning = spec.materials.lightingMood === "Warm Morning Sun";
    const isOvercast = spec.materials.lightingMood === "Architectural Studio Overcast";

    // Smooth vertical feathering helper (0..1)
    const smoothStep = (edge0: number, edge1: number, val: number) => {
      const t = Math.max(0, Math.min(1, (val - edge0) / (edge1 - edge0)));
      return t * t * (3 - 2 * t);
    };

    for (let y = 0; y < outH; y++) {
      const yNorm = y / outH;
      // Smooth roof weight (peaks in upper-mid elevation 0.14..0.38, feathers smoothly to 0)
      const roofWeight =
        smoothStep(0.08, 0.16, yNorm) * (1 - smoothStep(0.34, 0.45, yNorm));
      // Smooth facade structure weight (0.24..0.78)
      const structureWeight =
        smoothStep(0.20, 0.30, yNorm) * (1 - smoothStep(0.72, 0.82, yNorm));

      for (let x = 0; x < outW; x++) {
        const xNorm = x / outW;
        // Feather horizontal edges smoothly so trees/fences at left/right edges never have a hard seam
        const horizWeight =
          smoothStep(0.06, 0.18, xNorm) * (1 - smoothStep(0.82, 0.94, xNorm));

        const idx = (y * outW + x) * 4;
        let r = data[idx];
        let g = data[idx + 1];
        let b = data[idx + 2];

        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const chroma = maxC - minC;
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        // Smooth sky detection (upper frame with cool blue sky or bright horizon)
        const skyBlueWeight =
          yNorm < 0.54
            ? Math.max(
                0,
                Math.min(
                  1,
                  ((b - r - 6) / 36) * (1 - smoothStep(0.42, 0.54, yNorm))
                )
              )
            : 0;
        const isFoliage = g > r + 10 && g > b + 8;

        if (skyBlueWeight > 0.05 && !isFoliage) {
          if (isTwilight) {
            const skyT = Math.min(1, yNorm / 0.5);
            const targetR = 46 * (1 - skyT) + 236 * skyT;
            const targetG = 62 * (1 - skyT) + 152 * skyT;
            const targetB = 118 * (1 - skyT) + 134 * skyT;
            const blend = 0.56 * skyBlueWeight;
            r = Math.round(r * (1 - blend) + targetR * blend);
            g = Math.round(g * (1 - blend) + targetG * blend);
            b = Math.round(b * (1 - blend) + targetB * blend);
          } else if (isMorning) {
            const blend = skyBlueWeight;
            r = Math.min(255, Math.round(r + 10 * blend));
            g = Math.min(255, Math.round(g + 4 * blend));
            b = Math.max(0, Math.round(b - 6 * blend));
          } else if (isOvercast) {
            const avg = (r + g + b) / 3;
            const blend = 0.35 * skyBlueWeight;
            r = Math.round(r * (1 - blend) + (avg + 10) * blend);
            g = Math.round(g * (1 - blend) + (avg + 10) * blend);
            b = Math.round(b * (1 - blend) + (avg + 12) * blend);
          }
        } else if (!isFoliage && horizWeight > 0.01) {
          // Subtle, natural architectural material toning classified by pixel luminance & chroma (zero box edges)
          const isNeutralArchitectural = chroma < 42;
          if (roofWeight > 0.05 && isNeutralArchitectural && lum > 0.22 && lum < 0.74) {
            const shade = Math.max(0.4, Math.min(1.22, lum * 1.38));
            const blend = 0.24 * roofWeight * horizWeight;
            r = Math.round(r * (1 - blend) + Math.min(255, roofRgb.r * shade) * blend);
            g = Math.round(g * (1 - blend) + Math.min(255, roofRgb.g * shade) * blend);
            b = Math.round(b * (1 - blend) + Math.min(255, roofRgb.b * shade) * blend);
          } else if (structureWeight > 0.05 && isNeutralArchitectural) {
            if (lum >= 0.62 && lum <= 0.94) {
              // High-luminance render & cladding surfaces
              const shade = Math.max(0.55, Math.min(1.12, lum * 1.15));
              const mixR = wallRgb.r * 0.65 + claddingRgb.r * 0.35;
              const mixG = wallRgb.g * 0.65 + claddingRgb.g * 0.35;
              const mixB = wallRgb.b * 0.65 + claddingRgb.b * 0.35;
              const blend = 0.18 * structureWeight * horizWeight;
              r = Math.round(r * (1 - blend) + Math.min(255, mixR * shade) * blend);
              g = Math.round(g * (1 - blend) + Math.min(255, mixG * shade) * blend);
              b = Math.round(b * (1 - blend) + Math.min(255, mixB * shade) * blend);
            } else if (lum >= 0.32 && lum < 0.62) {
              // Mid-luminance brickwork & garage planes
              const shade = Math.max(0.45, Math.min(1.18, lum * 1.28));
              const mixR = brickRgb.r * 0.6 + garageRgb.r * 0.4;
              const mixG = brickRgb.g * 0.6 + garageRgb.g * 0.4;
              const mixB = brickRgb.b * 0.6 + garageRgb.b * 0.4;
              const blend = 0.16 * structureWeight * horizWeight;
              r = Math.round(r * (1 - blend) + Math.min(255, mixR * shade) * blend);
              g = Math.round(g * (1 - blend) + Math.min(255, mixG * shade) * blend);
              b = Math.round(b * (1 - blend) + Math.min(255, mixB * shade) * blend);
            }
          }
        }

        // Global photometric lighting polish
        if (isTwilight && skyBlueWeight < 0.2) {
          r = Math.min(255, Math.round(r * 0.97 + 5));
          g = Math.round(g * 0.94);
          b = Math.min(255, Math.round(b * 0.98 + 3));
        } else if (isMorning && skyBlueWeight < 0.2) {
          r = Math.min(255, Math.round(r * 1.03 + 3));
          g = Math.min(255, Math.round(g * 1.01 + 1));
        } else if (!isOvercast && yNorm < 0.85) {
          // Crisp Australian Daylight micro-contrast boost
          r = Math.min(255, Math.max(0, Math.round((r - 128) * 1.03 + 128)));
          g = Math.min(255, Math.max(0, Math.round((g - 128) * 1.03 + 128)));
          b = Math.min(255, Math.max(0, Math.round((b - 128) * 1.03 + 128)));
        }

        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Subtle architectural portico downlight blooms when Golden Hour Twilight is active
    if (isTwilight) {
      const glowPositions = [
        { x: outW * 0.38, y: outH * 0.56, r: 110 },
        { x: outW * 0.48, y: outH * 0.56, r: 120 },
        { x: outW * 0.64, y: outH * 0.58, r: 105 },
      ];
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      for (const pos of glowPositions) {
        const grad = ctx.createRadialGradient(pos.x, pos.y, 4, pos.x, pos.y, pos.r);
        grad.addColorStop(0, "rgba(255, 214, 140, 0.46)");
        grad.addColorStop(0.45, "rgba(255, 184, 95, 0.18)");
        grad.addColorStop(1, "rgba(255, 165, 70, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, pos.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    return canvas.toDataURL("image/jpeg", 0.94);
  } catch (err) {
    console.warn("[renderCustomFacadeCanvas fallback]", err);
    return baseSrc;
  }
}

/**
 * Looks up any Hudson Homes floorplan mentioned in the user's prompt or returns matching plans
 * for a requested lot width / storey / garage filter.
 */
export function lookupHudsonDesignsFromText(text: string): {
  matchedDesign?: HudsonDimensionRecord;
  matchingCategoryPlans: HudsonDimensionRecord[];
  inferredCategory?: FacadeHousingCategory;
  inferredGarage?: FacadeGarageConfig;
  inferredLotWidthM?: number;
} {
  const lower = text.toLowerCase();
  const allRecords = Object.values(HUDSON_DIMENSIONS_REGISTRY);

  // 1. Check if a specific Hudson design name is mentioned (e.g., "Ruby 21", "Carolina 28", "Amber 23", "Hazel 15")
  let matchedDesign: HudsonDimensionRecord | undefined;
  for (const rec of allRecords) {
    const labelLower = rec.label.toLowerCase();
    if (lower.includes(labelLower)) {
      if (!matchedDesign || labelLower.length > matchedDesign.label.length) {
        matchedDesign = rec;
      }
    }
  }

  if (!matchedDesign) {
    // Check family name match (e.g. "carolina", "turquoise", "ruby", "hazel", "mulberry", "cayenne", "wisteria", "cobalt", "amber", "jasper")
    for (const rec of allRecords) {
      const famLower = rec.design.toLowerCase();
      if (famLower.length >= 4 && new RegExp(`\\b${famLower}\\b`, "i").test(lower)) {
        matchedDesign = rec;
        break;
      }
    }
  }

  let inferredCategory: FacadeHousingCategory | undefined;
  let inferredGarage: FacadeGarageConfig | undefined;
  let inferredLotWidthM: number | undefined;

  if (/\bsingle\s*garage\b|\bs\/g\b|\b1\s*car\b|\bsg\b/i.test(lower)) {
    inferredGarage = "Single Garage";
  } else if (/\bdouble\s*garage\b|\bd\/g\b|\b2\s*car\b|\bdg\b/i.test(lower)) {
    inferredGarage = "Double Garage";
  } else if (/\btriple\s*garage\b|\b3\s*car\b/i.test(lower)) {
    inferredGarage = "Triple Garage";
  }

  if (/\bnarrow\s*double\s*storey\b|\bnarrow\s*2\s*storey\b|\bnarrow\s*two\s*storey\b/i.test(lower)) {
    inferredCategory = "Narrow Double Storey";
  } else if (/\bdouble\s*storey\b|\btwo\s*storey\b|\b2\s*storey\b/i.test(lower)) {
    inferredCategory = "Double Storey";
  } else if (/\bnarrow\s*single\s*storey\b|\bsingle\s*storey\s*narrow\b/i.test(lower)) {
    inferredCategory = "Single Storey (Narrow Lot)";
  } else if (/\bsingle\s*storey\b|\bone\s*storey\b|\b1\s*storey\b|\blowset\b/i.test(lower)) {
    inferredCategory = "Single Storey";
  } else if (/\bdual\s*living\b|\bduplex\b|\bdual\s*occupancy\b/i.test(lower)) {
    inferredCategory = "Dual Living";
  } else if (/\bsplit\s*level\b|\bcobalt\b/i.test(lower)) {
    inferredCategory = "Split Level";
  } else if (/\bacreage\b|\branch\b|\bmulberry\b/i.test(lower)) {
    inferredCategory = "Acreage";
  } else if (/\bgranny\s*flat\b|\baqua\b/i.test(lower)) {
    inferredCategory = "Granny Flat";
  }

  const widthMatch = lower.match(/\b(8\.5|10|10\.5|11|12|12\.5|13|14|15|16|18|20)\s*m\b/);
  if (widthMatch) {
    inferredLotWidthM = parseFloat(widthMatch[1]);
  }

  if (matchedDesign) {
    if (!inferredGarage) {
      inferredGarage =
        matchedDesign.cars === 1
          ? "Single Garage"
          : matchedDesign.cars === 0
          ? "No Garage"
          : "Double Garage";
    }
    if (!inferredLotWidthM && matchedDesign.minLotWidth) {
      inferredLotWidthM = matchedDesign.minLotWidth;
    }
    if (!inferredCategory) {
      if (isNarrowDoubleStorey(matchedDesign.label)) {
        inferredCategory = "Narrow Double Storey";
      } else if (/^mulberry\b/i.test(matchedDesign.label)) {
        inferredCategory = "Acreage";
      } else if (/^cobalt\b|cinnamon|mauve|maroon/i.test(matchedDesign.label)) {
        inferredCategory = "Split Level";
      } else if (/cayenne|maize|magnolia|raven|teal|wisteria|alabaster/i.test(matchedDesign.label)) {
        inferredCategory = "Dual Living";
      } else if (/^aqua\b/i.test(matchedDesign.label)) {
        inferredCategory = "Granny Flat";
      } else if (
        /burgundy|jasper|sapphire|emerald|diamond|onyx|ruby|aston|opal|topaz|cerise|orchid|mint|lime|terracotta/i.test(
          matchedDesign.label
        )
      ) {
        inferredCategory =
          matchedDesign.cars === 1 || (matchedDesign.minLotWidth && matchedDesign.minLotWidth <= 11.5)
            ? "Narrow Double Storey"
            : "Double Storey";
      } else {
        inferredCategory =
          matchedDesign.cars === 1 ? "Single Storey (Narrow Lot)" : "Single Storey";
      }
    }
  }

  const matchingCategoryPlans = allRecords
    .filter((r) => {
      if (inferredGarage === "Single Garage" && r.cars !== 1) return false;
      if (inferredGarage === "Double Garage" && r.cars !== 2) return false;
      if (inferredLotWidthM && r.minLotWidth && r.minLotWidth > inferredLotWidthM + 0.6) {
        return false;
      }
      return true;
    })
    .slice(0, 8);

  return {
    matchedDesign,
    matchingCategoryPlans,
    inferredCategory,
    inferredGarage,
    inferredLotWidthM,
  };
}

/**
 * Parses a user's natural language or voice prompt to extract style, material, lighting,
 * and back-end filter updates, and generates an expert architectural AI response.
 */
export async function processFacadeAiPrompt(
  prompt: string,
  currentRecord: CustomFacadeRecord
): Promise<{
  updatedRecord: CustomFacadeRecord;
  appliedChanges: string[];
  assistantReply: string;
  matchedDesignsSummary?: string;
  suggestedPrompts: string[];
}> {
  const lower = prompt.trim().toLowerCase();
  const appliedChanges: string[] = [];

  const designLookup = lookupHudsonDesignsFromText(prompt);

  let nextCategory: FacadeHousingCategory =
    designLookup.inferredCategory || currentRecord.housingCategory;
  let nextGarage: FacadeGarageConfig =
    designLookup.inferredGarage || currentRecord.garageConfig;
  let nextLotWidthM: number =
    designLookup.inferredLotWidthM || currentRecord.minLotWidthM;
  let nextStyle: FacadeArchitecturalStyle = currentRecord.style;
  let nextRoofStyle: FacadeRoofStyle = currentRecord.roofStyle;
  let nextMaterials: FacadeMaterialSpec = { ...currentRecord.materials };
  let nextName = currentRecord.name;
  let nextQldUplift = currentRecord.qldUplift;
  let nextNswUplift = currentRecord.nswUplift;
  let nextTargetDesign = designLookup.matchedDesign?.label || currentRecord.targetDesignName;

  if (designLookup.inferredCategory && designLookup.inferredCategory !== currentRecord.housingCategory) {
    appliedChanges.push(`Back-End Filter Category → ${designLookup.inferredCategory}`);
  }
  if (designLookup.inferredGarage && designLookup.inferredGarage !== currentRecord.garageConfig) {
    appliedChanges.push(`Garage Filter → ${designLookup.inferredGarage}`);
  }
  if (designLookup.inferredLotWidthM && designLookup.inferredLotWidthM !== currentRecord.minLotWidthM) {
    appliedChanges.push(`Min Lot Frontage → ${designLookup.inferredLotWidthM}m+`);
  }

  // Detect Architectural Style
  const styleTriggers: { style: FacadeArchitecturalStyle; regex: RegExp }[] = [
    { style: "Modern Coastal", regex: /\b(coastal|breeze|riviera|bayside|beach|byron|noosa)\b/i },
    { style: "Hamptons", regex: /\b(hampton|hamptons|shaker|weatherboard|newport|classic\s*coastal)\b/i },
    { style: "Contemporary Box", regex: /\b(contemporary|box|cube|cantilever|parapet|modern\s*box|meridian|metro|monza)\b/i },
    { style: "Modern Barn", regex: /\b(barn|farmhouse|nordic|statesman|high\s*gable|standing\s*seam)\b/i },
    { style: "Palm Springs", regex: /\b(palm\s*springs|mid[-\s]?century|desert|breeze\s*block|skillion|mono[-\s]?pitch)\b/i },
    { style: "Urban Industrial", regex: /\b(industrial|urban|soho|manhattan|dark\s*brick|corten|moody)\b/i },
    { style: "French Provincial", regex: /\b(french|provincial|chateaux|mansard|symmetrical|limestone\s*classic)\b/i },
    { style: "Classic Brick & Render", regex: /\b(classic|traditional|standard\s*brick|hip\s*roof\s*brick)\b/i },
  ];

  for (const trigger of styleTriggers) {
    if (trigger.regex.test(lower)) {
      nextStyle = trigger.style;
      const preset = STYLE_PRESETS[trigger.style];
      nextRoofStyle = preset.roofStyle;
      nextMaterials = { ...preset.materials, lightingMood: currentRecord.materials.lightingMood };
      nextQldUplift = preset.baseQldUplift + (nextCategory.includes("Double") ? 9500 : 0);
      nextNswUplift = preset.baseNswUplift + (nextCategory.includes("Double") ? 9200 : 0);
      appliedChanges.push(`Architectural Style → ${trigger.style}`);
      break;
    }
  }

  // Detect specific Roof Style override
  if (/\b(flat\s*roof|parapet|box\s*roof|cube\s*parapet)\b/i.test(lower)) {
    nextRoofStyle = "Flat Parapet / Box";
    appliedChanges.push("Roof Geometry → Flat Parapet / Box");
  } else if (/\b(skillion|raked\s*roof|mono[-\s]?pitch)\b/i.test(lower)) {
    nextRoofStyle = "Skillion / Mono-Pitch";
    appliedChanges.push("Roof Geometry → Skillion / Mono-Pitch");
  } else if (/\b(gable|pitched\s*gable|barn\s*roof|a[-\s]?frame)\b/i.test(lower)) {
    nextRoofStyle = "Gable / Barn Pitch";
    appliedChanges.push("Roof Geometry → Gable / Barn Pitch");
  } else if (/\b(hip\s*roof|standard\s*hip)\b/i.test(lower)) {
    nextRoofStyle = "Hip Roof";
    appliedChanges.push("Roof Geometry → Hip Roof");
  }

  // Detect specific Colorbond Roof colors
  for (const swatch of COLORBOND_ROOF_PALETTE) {
    const cleanKey = swatch.name
      .replace(/Colorbond\s*/i, "")
      .replace(/[®™]/g, "")
      .trim()
      .toLowerCase();
    if (lower.includes(cleanKey) && /\b(roof|colorbond|parapet|standing\s*seam|tile|overall)\b/i.test(lower)) {
      nextMaterials.roofColorName = swatch.name;
      nextMaterials.roofColorHex = swatch.hex;
      appliedChanges.push(`Roof Colour → ${swatch.name}`);
      break;
    }
  }
  if (/\bdark\s*roof|charcoal\s*roof|black\s*roof|monument\s*roof\b/i.test(lower)) {
    nextMaterials.roofColorName = "Colorbond Monument®";
    nextMaterials.roofColorHex = "#323639";
    appliedChanges.push("Roof Colour → Colorbond Monument®");
  } else if (/\bwhite\s*roof|light\s*roof|surfmist\s*roof\b/i.test(lower)) {
    nextMaterials.roofColorName = "Colorbond Surfmist®";
    nextMaterials.roofColorHex = "#E4E2DC";
    appliedChanges.push("Roof Colour → Colorbond Surfmist®");
  }

  // Detect Wall Render / Cladding colors
  if (/\b(white\s*render|crisp\s*white|lexicon|dover\s*white|alabaster\s*wall)\b/i.test(lower)) {
    nextMaterials.wallRenderName = "Dulux Lexicon® Quarter";
    nextMaterials.wallRenderHex = "#F3F4F4";
    nextMaterials.claddingColorName = "Dulux Whisper White";
    nextMaterials.claddingColorHex = "#EFECE6";
    appliedChanges.push("Main Wall Render → Dulux Lexicon® Quarter");
  } else if (/\b(warm\s*grey|tranquil\s*retreat|greige|soft\s*grey\s*render|shale\s*render)\b/i.test(lower)) {
    nextMaterials.wallRenderName = "Dulux Tranquil Retreat";
    nextMaterials.wallRenderHex = "#C9C8C3";
    appliedChanges.push("Main Wall Render → Dulux Tranquil Retreat");
  } else if (/\b(dark\s*cladding|charcoal\s*cladding|monument\s*cladding|black\s*cladding|dark\s*render)\b/i.test(lower)) {
    nextMaterials.claddingColorName = "Colorbond Monument®";
    nextMaterials.claddingColorHex = "#323639";
    appliedChanges.push("Upper Cladding → Colorbond Monument®");
  }

  // Detect Brickwork
  if (/\b(white\s*brick|chalk\s*brick|chillingham|whitsunday|light\s*brick|coastal\s*brick)\b/i.test(lower)) {
    nextMaterials.brickworkName = "Austral Bowral Chillingham White";
    nextMaterials.brickworkHex = "#EAE6DF";
    appliedChanges.push("Brickwork → Austral Bowral Chillingham White");
  } else if (/\b(recycled\s*brick|hawthorn|red\s*brick|san\s*selmo|rustic\s*brick)\b/i.test(lower)) {
    nextMaterials.brickworkName = "Austral San Selmo Recycled Hawthorn";
    nextMaterials.brickworkHex = "#8E5743";
    appliedChanges.push("Brickwork → Austral San Selmo Recycled Hawthorn");
  } else if (/\b(dark\s*brick|charcoal\s*brick|manhattan\s*brick|pewter\s*brick|black\s*brick)\b/i.test(lower)) {
    nextMaterials.brickworkName = "Austral Metallix Bronze Charcoal";
    nextMaterials.brickworkHex = "#3A3C3F";
    appliedChanges.push("Brickwork → Austral Metallix Bronze Charcoal");
  }

  // Detect Feature Pier Material
  if (/\b(limestone|byron\s*stone|ashlar\s*stone|white\s*stone\s*pier)\b/i.test(lower)) {
    nextMaterials.featurePierMaterial = "Limestone Ashlar";
    appliedChanges.push("Portico Feature Pier → Limestone Ashlar");
  } else if (/\b(sandstone|stacked\s*stone|warm\s*stone\s*pier|travertine\s*pier)\b/i.test(lower)) {
    nextMaterials.featurePierMaterial = "Stacked Sandstone";
    appliedChanges.push("Portico Feature Pier → Stacked Sandstone");
  } else if (/\b(off[-\s]?form\s*concrete|raw\s*concrete|concrete\s*pier)\b/i.test(lower)) {
    nextMaterials.featurePierMaterial = "Off-Form Concrete";
    appliedChanges.push("Portico Feature Pier → Off-Form Concrete");
  }

  // Detect Timber / Batten accents
  if (/\b(spotted\s*gum|timber\s*batten|wood\s*batten|oak\s*batten|blackbutt)\b/i.test(lower)) {
    nextMaterials.battenAccentName = "Knotwood Coastal Spotted Gum";
    nextMaterials.battenAccentHex = "#B5835A";
    appliedChanges.push("Feature Screening → Knotwood Coastal Spotted Gum Battens");
  } else if (/\b(cedar|walnut\s*batten|dark\s*timber)\b/i.test(lower)) {
    nextMaterials.battenAccentName = "Western Red Cedar Warm Walnut";
    nextMaterials.battenAccentHex = "#8B5434";
    appliedChanges.push("Feature Screening → Western Red Cedar Warm Walnut");
  } else if (/\b(black\s*batten|monument\s*batten|charcoal\s*batten)\b/i.test(lower)) {
    nextMaterials.battenAccentName = "Anodised Matte Monument Battens";
    nextMaterials.battenAccentHex = "#323639";
    appliedChanges.push("Feature Screening → Anodised Matte Monument Battens");
  }

  // Detect Garage Door
  if (/\b(timber\s*garage|wood\s*garage|cedar\s*garage|spotted\s*gum\s*garage)\b/i.test(lower)) {
    nextMaterials.garageDoorStyle = "Sectional Timber-Look Slats";
    nextMaterials.garageDoorColorName = "Spotted Gum Timber-Look";
    nextMaterials.garageDoorHex = "#A6754D";
    appliedChanges.push("Garage Door → Spotted Gum Timber-Look Sectional");
  } else if (/\b(shaker\s*garage|white\s*garage|hamptons\s*garage)\b/i.test(lower)) {
    nextMaterials.garageDoorStyle = "Hamptons Shaker Panel";
    nextMaterials.garageDoorColorName = "Dulux Lexicon® Quarter";
    nextMaterials.garageDoorHex = "#F3F4F4";
    appliedChanges.push("Garage Door → Hamptons White Shaker Panel");
  } else if (/\b(dark\s*garage|monument\s*garage|black\s*garage|flush\s*garage)\b/i.test(lower)) {
    nextMaterials.garageDoorStyle = "Architectural Negative Detail";
    nextMaterials.garageDoorColorName = "Colorbond Monument®";
    nextMaterials.garageDoorHex = "#323639";
    appliedChanges.push("Garage Door → Flush Monument Negative Detail");
  }

  // Detect Lighting Mood
  if (/\b(twilight|golden\s*hour|dusk|sunset|evening|warm\s*lights|night)\b/i.test(lower)) {
    nextMaterials.lightingMood = "Golden Hour Twilight";
    appliedChanges.push("Photometric Lighting → Golden Hour Twilight (2700K Interior & Soffit Glow)");
  } else if (/\b(morning|sunrise|dawn|east\s*sun)\b/i.test(lower)) {
    nextMaterials.lightingMood = "Warm Morning Sun";
    appliedChanges.push("Photometric Lighting → Warm Morning Sun");
  } else if (/\b(overcast|cloudy|diffused|soft\s*studio)\b/i.test(lower)) {
    nextMaterials.lightingMood = "Architectural Studio Overcast";
    appliedChanges.push("Photometric Lighting → Architectural Studio Overcast");
  } else if (/\b(daylight|sunny|midday|11am|bright\s*sun|daytime)\b/i.test(lower)) {
    nextMaterials.lightingMood = "Crisp Australian Daylight (11am)";
    appliedChanges.push("Photometric Lighting → Crisp Australian Daylight (11am)");
  }

  // Detect explicit custom name if user says "name it ..." or "call it ..."
  const nameMatch = prompt.match(/(?:name\s+it|call\s+it|title\s+it)\s+["']?([A-Za-z0-9\s()-]{3,32})["']?/i);
  if (nameMatch?.[1]) {
    nextName = nameMatch[1].trim();
    appliedChanges.push(`Facade Title → "${nextName}"`);
  } else if (appliedChanges.some((c) => c.startsWith("Architectural Style")) && currentRecord.name.startsWith("Custom ")) {
    const sgSuffix = nextGarage === "Single Garage" ? " (SG)" : "";
    nextName = `${nextStyle} ${nextCategory.includes("Double") ? "Series II" : "Edition"}${sgSuffix}`;
  }

  const nextBaseRef = selectBaseReferenceElevation(nextCategory, nextGarage, nextStyle);
  const nextCompatible = getDefaultCompatibleFamilies(nextCategory, nextGarage);

  const draftRecord: CustomFacadeRecord = {
    ...currentRecord,
    name: nextName,
    housingCategory: nextCategory,
    garageConfig: nextGarage,
    minLotWidthM: nextLotWidthM,
    style: nextStyle,
    roofStyle: nextRoofStyle,
    materials: nextMaterials,
    compatibleFamilies: nextCompatible,
    targetDesignName: nextTargetDesign,
    qldUplift: nextQldUplift,
    nswUplift: nextNswUplift,
    baseReferenceUrl: nextBaseRef,
    promptHistory: [...currentRecord.promptHistory, prompt],
    description: `${nextStyle} elevation configured for ${nextCategory} (${nextGarage}, ${nextLotWidthM}m+ lot frontage). Features ${nextMaterials.roofColorName} ${nextMaterials.roofMaterial}, ${nextMaterials.wallRenderName} render, ${nextMaterials.brickworkName} masonry, and ${nextMaterials.featurePierMaterial} detailing.`,
  };

  // Render the high-resolution 2400x937 composite studio image
  const renderedDataUrl = await renderCustomFacadeCanvas(draftRecord);
  draftRecord.imageUrl = renderedDataUrl;

  let matchedDesignsSummary: string | undefined;
  if (designLookup.matchedDesign) {
    const d = designLookup.matchedDesign;
    matchedDesignsSummary = `Matched Hudson Design **${d.label}**: House Width **${d.width}m** × Length **${d.length}m** (${d.totalM2} m² • ${
      d.cars === 1 ? "Single Garage" : d.cars === 2 ? "Double Garage" : "No Garage"
    } • Min Lot Width **${d.minLotWidth ?? 12.5}m**).`;
  } else if (designLookup.matchingCategoryPlans.length > 0) {
    const sampleNames = designLookup.matchingCategoryPlans.map((p) => `${p.label} (${p.width}m W)`).slice(0, 5).join(", ");
    matchedDesignsSummary = `Compatible Hudson Floorplans (${nextCategory} • ${nextGarage}): ${sampleNames}.`;
  }

  // Build authoritative Facade Architect AI Agent response
  let assistantReply = "";
  const apiKey = getGeminiApiKey();
  if (apiKey) {
    try {
      const llmReply = await queryGeminiFacadeArchitect(prompt, draftRecord, appliedChanges, matchedDesignsSummary, apiKey);
      if (llmReply) {
        assistantReply = llmReply;
      }
    } catch {}
  }

  if (!assistantReply) {
    const changeBullets =
      appliedChanges.length > 0
        ? appliedChanges.map((c) => `• **${c}**`).join("\n")
        : `• **Refined ${draftRecord.style} Elevation** (${draftRecord.housingCategory} • ${draftRecord.garageConfig})`;

    assistantReply = [
      `I have tailored the **${draftRecord.name}** high-resolution 2400×937 widescreen facade render to your specifications:`,
      "",
      changeBullets,
      "",
      `**Architectural & Material Schedule:**`,
      `- **Back-End Filter**: \`${draftRecord.housingCategory}\` • \`${draftRecord.garageConfig}\` (Min **${draftRecord.minLotWidthM}m** lot width)`,
      `- **Roofing & Massing**: ${draftRecord.roofStyle} in **${draftRecord.materials.roofColorName}** (${draftRecord.materials.roofMaterial})`,
      `- **Wall & Cladding Palette**: **${draftRecord.materials.wallRenderName}** acrylic render paired with **${draftRecord.materials.claddingColorName}** (${draftRecord.materials.claddingType}) & **${draftRecord.materials.brickworkName}**`,
      `- **Feature Portico & Joinery**: **${draftRecord.materials.featurePierMaterial}**, **${draftRecord.materials.battenAccentName}**, and **${draftRecord.materials.garageDoorColorName}** (${draftRecord.materials.garageDoorStyle})`,
      `- **Lighting & Retail Tier**: ${draftRecord.materials.lightingMood} • Est. Upgrade **+$${draftRecord.qldUplift.toLocaleString()} (QLD)** / **+$${draftRecord.nswUplift.toLocaleString()} (NSW)**`,
      matchedDesignsSummary ? `\n📐 ${matchedDesignsSummary}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  const suggestedPrompts = [
    "Switch lighting to Golden Hour Twilight with warm interior & soffit glow",
    "Change roof to Colorbond Monument with Limestone Ashlar portico pier",
    "Configure for Narrow Double Storey Single Garage (10m lot like Ruby 21)",
    "Restyle as Modern Coastal with Surfmist roof & Spotted Gum battens",
  ];

  return {
    updatedRecord: draftRecord,
    appliedChanges,
    assistantReply,
    matchedDesignsSummary,
    suggestedPrompts,
  };
}

async function queryGeminiFacadeArchitect(
  userPrompt: string,
  record: CustomFacadeRecord,
  appliedChanges: string[],
  matchedDesignsSummary: string | undefined,
  apiKey: string
): Promise<string | null> {
  const systemPrompt = `You are the Hudson Homes AI Facade Architect & Render Specialist.
You help staff design custom photorealistic widescreen (2400x937) house facades across all Hudson Homes design categories (Single Storey, Single Storey Narrow Lot, Double Storey, Narrow Double Storey, Dual Living/Duplex, Split Level, Acreage/Ranch, and Granny Flat) and garage configurations (Single Garage, Double Garage).
Current Facade State after applying user's prompt:
- Name: ${record.name}
- Back-End Filter: ${record.housingCategory} | ${record.garageConfig} | Min Lot Width: ${record.minLotWidthM}m
- Style: ${record.style} (${record.roofStyle})
- Roof: ${record.materials.roofColorName} (${record.materials.roofMaterial})
- Walls & Cladding: ${record.materials.wallRenderName}, ${record.materials.claddingType} (${record.materials.claddingColorName}), Brick: ${record.materials.brickworkName}
- Accents: ${record.materials.featurePierMaterial} pier, ${record.materials.battenAccentName}, Garage: ${record.materials.garageDoorColorName} (${record.materials.garageDoorStyle})
- Lighting: ${record.materials.lightingMood}
- Compatible Hudson Families: ${record.compatibleFamilies.join(", ")}
${matchedDesignsSummary ? `- Matched Design Info: ${matchedDesignsSummary}` : ""}
Applied Updates: ${appliedChanges.join("; ") || "Updated studio render"}

Respond concisely in 3-5 sentences plus a short bulleted material & design-fit summary confirming the visual changes applied to the live 2400x937 facade render.`;

  const models = ["gemini-2.5-flash"];
  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            generationConfig: { temperature: 0.25, maxOutputTokens: 450 },
          }),
          signal: AbortSignal.timeout(1200),
        }
      );
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim().length > 20) return text.trim();
      }
    } catch {}
  }
  return null;
}
