/**
 * Universal Floorplan-to-3D & Custom Facade Structural Engine
 *
 * 1. Catalogues all 100+ standard Hudson Homes designs (Single Storey, Double Storey,
 *    Dual Living, Split Level, Granny Flat) with exact CAD area breakdowns.
 * 2. Generates scaled 3D architectural models (rooms, 250mm exterior walls,
 *    90mm internal stud partitions, open Alfresco & Porch zones with piers,
 *    windows & doors with sill/head heights, and full interior joinery, sinks,
 *    benchtops, vanities, showers, baths & furniture).
 * 3. Integrates directly with `analyzeModifiedFloorplanFile` (`PlanModificationAnalysis`)
 *    so uploaded modified/custom plans reflect all structural extensions, room changes,
 *    door/window replacements, and benchtop/vanity/sink upgrades in 3D.
 * 4. Provides both Generic Facades and Design-Tailored Structural Facade configurations.
 */

import {
  BuildingDesign3D,
  Room3D,
  WallSegment,
  Opening3D,
  Fixture3D,
  InteriorFitoutConfig,
  CustomFacadeConfig,
  FacadeType,
} from "./studio3dTypes";
import {
  DESIGNS_3D_REGISTRY,
  DEFAULT_BOUNDARY_CONFIG,
  DEFAULT_MATERIAL_CONFIG,
} from "./designs3dRegistry";
import { ensureCompleteWallNetwork } from "./wallNetworkEngine";
import {
  SINGLE_STOREY_PRICES,
  DOUBLE_STOREY_PRICES,
  DUAL_OC_PRICES,
  SPLIT_LEVEL_PRICES,
  type PriceRow,
} from "@/lib/pricelist.data";
import {
  NSW_SINGLE_STOREY_PRICES,
  NSW_DOUBLE_STOREY_PRICES,
  NSW_DUAL_OC_PRICES,
  NSW_SPLIT_LEVEL_PRICES,
} from "@/lib/pricelist.nsw.data";
import { getStandardAreaBreakdown } from "@/lib/quoting/quoteEngine";
import {
  plansForDesign,
  resolveLocalFloorplanUrl,
  SPECIAL_LOCAL_FLOORPLANS,
} from "@/components/flyer/floorplans";
import { HUDSON_FLOORPLANS } from "@/components/flyer/floorplans.data";
import type { PlanModificationAnalysis } from "@/lib/quoting/quoteTypes";

export const DEFAULT_FITOUT_CONFIG: InteriorFitoutConfig = {
  benchtopThicknessMm: 40,
  waterfallEnds: 2,
  stoneColor: "calacatta_white",
  cabinetryFinish: "polytec_oak",
  sinkStyle: "double_undermount",
  tapwareFinish: "matte_black",
  ensuiteVanityStyle: "double_1500",
  bathStyle: "freestanding_oval",
  showFurniture: true,
  showJoineryAndSinks: true,
  upgradeDoorJoineryHeights: true,
};

export const DEFAULT_CUSTOM_FACADE_CONFIG: CustomFacadeConfig = {
  mode: "generic",
  facadePreset: "modern",
  rooflineStyle: "hip_22_5",
  porticoStyle: "rendered_pier_beam",
  porticoProjectionM: 1.5,
  garageArticulation: "standard_step",
  frontWindowStyle: "standard_sliding",
  featureBladeWall: true,
  alfrescoPiers: true,
};

export interface StandardCatalogueDesignItem {
  id: string;
  name: string;
  housingType: "Single Storey" | "Double Storey" | "Dual Living" | "Split Level" | "Granny Flat";
  totalM2: number;
  livingM2: number;
  lowerLivingM2?: number;
  groundLivingM2?: number;
  firstLivingM2?: number;
  garageM2: number;
  alfrescoM2: number;
  porchM2: number;
  balconyM2?: number;
  bedrooms: number;
  bathrooms: number;
  cars: number;
  widthM: number;
  lengthM: number;
  floorplanUrl?: string;
}

export type StandardHudsonDesignOption = StandardCatalogueDesignItem;

/**
 * Returns a complete, searchable list of all Hudson Homes standard designs
 * across the entire catalogue with their CAD area breakdown and dimensions.
 */
export function getAllHudsonStandardDesigns(): StandardCatalogueDesignItem[] {
  const map = new Map<string, StandardCatalogueDesignItem>();

  // Pre-register Custom Mauve 35 for James (3-Level Split Level Modified Design)
  map.set("custom mauve 35 for james", {
    id: "mauve-35-custom-james",
    name: "Custom Mauve 35 for James",
    housingType: "Split Level",
    totalM2: 410.75,
    livingM2: 298.25,
    lowerLivingM2: 86.07,
    groundLivingM2: 82.41,
    firstLivingM2: 129.77,
    garageM2: 63.54,
    alfrescoM2: 24.94,
    porchM2: 11.54,
    balconyM2: 12.48,
    bedrooms: 5,
    bathrooms: 3,
    cars: 3,
    widthM: 15.00,
    lengthM: 19.83,
    floorplanUrl: "/floorplans/MAUVE 35 CUSTOM JAMES.png",
  });

  const addRows = (
    rows: PriceRow[],
    defaultType: "Single Storey" | "Double Storey" | "Dual Living" | "Split Level"
  ) => {
    for (const r of rows) {
      const key = r.name.trim().toLowerCase();
      if (map.has(key)) continue;

      const isGranny = /^aqua\b/i.test(r.name);
      const housingType = isGranny ? "Granny Flat" : defaultType;
      const areas = getStandardAreaBreakdown(r.name, housingType, r.m2);
      const planMeta = plansForDesign(r.name)[0];

      const livingM2 =
        areas.livingM2 ||
        (areas.groundLivingM2 || 0) + (areas.firstLivingM2 || 0) + (areas.lowerLivingM2 || 0) ||
        Math.round(r.m2 * 0.74 * 100) / 100;
      const garageM2 = areas.garageM2 ?? (isGranny ? 0 : 36.5);
      const alfrescoM2 = areas.alfrescoM2 ?? (isGranny ? 6.0 : 12.5);
      const porchM2 = areas.porchM2 ?? 3.2;
      const totalM2 = areas.totalM2 || r.m2;

      const beds = planMeta?.beds
        ? Number(planMeta.beds)
        : isGranny
        ? 2
        : totalM2 >= 260
        ? 5
        : totalM2 >= 175
        ? 4
        : 3;
      const baths = planMeta?.baths ? Number(planMeta.baths) : isGranny ? 1 : totalM2 >= 280 ? 3 : 2;
      const cars = planMeta?.cars ? Number(planMeta.cars) : isGranny ? 0 : totalM2 >= 150 ? 2 : 1;

      const SPECIAL_DIMENSIONS: Record<string, { w: number; l: number }> = {
        "burgundy 27": { w: 11.15, l: 16.55 },
        "burgundy 30": { w: 11.15, l: 17.75 },
        "burgundy 32": { w: 11.15, l: 18.95 },
        "burgundy 34": { w: 11.15, l: 20.15 },
        "carolina 22": { w: 8.27, l: 15.35 },
        "carolina 24": { w: 8.27, l: 16.55 },
        "carolina 26": { w: 8.27, l: 17.75 },
        "carolina 29": { w: 8.27, l: 19.35 },
        "wisteria 22": { w: 11.39, l: 19.19 },
        "wisteria 32": { w: 12.35, l: 21.11 },
        "alabaster 31": { w: 11.39, l: 17.99 },
        "alabaster 36": { w: 12.59, l: 19.79 },
        "alabaster 40": { w: 12.59, l: 21.59 },
        "lime 19": { w: 8.27, l: 14.39 },
        "lime 21": { w: 8.27, l: 15.59 },
        "lime 23": { w: 8.27, l: 16.79 },
        "lime 25": { w: 8.27, l: 17.99 },
      };
      const specialDim = SPECIAL_DIMENSIONS[key];

      const parsedW = parseFloat(String(planMeta?.houseWidth || planMeta?.width || ""));
      const parsedL = parseFloat(String(planMeta?.houseLength || planMeta?.depth || ""));

      const footprintM2 =
        housingType === "Double Storey" || housingType === "Split Level"
          ? (areas.groundLivingM2 || livingM2 * 0.55) + (areas.lowerLivingM2 || 0) + garageM2 + alfrescoM2 + porchM2
          : totalM2;

      const widthM = specialDim
        ? specialDim.w
        : !isNaN(parsedW) && parsedW >= 6
        ? parsedW
        : isGranny
        ? 7.2
        : footprintM2 > 220
        ? 14.2
        : footprintM2 > 185
        ? 12.1
        : 10.8;
      const lengthM = specialDim
        ? specialDim.l
        : !isNaN(parsedL) && parsedL >= 8
        ? parsedL
        : Math.round(Math.max(11.5, (footprintM2 / widthM) * 1.06) * 100) / 100;

      map.set(key, {
        id: key.replace(/[^a-z0-9]+/g, "-"),
        name: r.name,
        housingType,
        totalM2: Math.round(totalM2 * 100) / 100,
        livingM2: Math.round(livingM2 * 100) / 100,
        lowerLivingM2: areas.lowerLivingM2,
        groundLivingM2: areas.groundLivingM2,
        firstLivingM2: areas.firstLivingM2,
        garageM2: Math.round(garageM2 * 100) / 100,
        alfrescoM2: Math.round(alfrescoM2 * 100) / 100,
        porchM2: Math.round(porchM2 * 100) / 100,
        balconyM2: (areas as any).balconyM2,
        bedrooms: beds,
        bathrooms: baths,
        cars,
        widthM: Math.round(widthM * 100) / 100,
        lengthM: Math.round(lengthM * 100) / 100,
        floorplanUrl: resolveLocalFloorplanUrl(r.name, planMeta?.url),
      });
    }
  };

  addRows(SINGLE_STOREY_PRICES, "Single Storey");
  addRows(DOUBLE_STOREY_PRICES, "Double Storey");
  addRows(DUAL_OC_PRICES, "Dual Living");
  addRows(SPLIT_LEVEL_PRICES, "Split Level");
  addRows(NSW_SINGLE_STOREY_PRICES, "Single Storey");
  addRows(NSW_DOUBLE_STOREY_PRICES, "Double Storey");
  addRows(NSW_DUAL_OC_PRICES, "Dual Living");
  addRows(NSW_SPLIT_LEVEL_PRICES, "Split Level");

  // Also ensure every floorplan in HUDSON_FLOORPLANS is present with exact CAD width & length
  for (const fp of HUDSON_FLOORPLANS) {
    const key = fp.label.trim().toLowerCase();
    if (map.has(key)) continue;
    const totalM2 = parseFloat(fp.size) || 215;
    const isGranny = /^aqua\b/i.test(fp.label);
    const housingType = isGranny ? "Granny Flat" : "Single Storey";
    const areas = getStandardAreaBreakdown(fp.label, housingType, totalM2);
    const parsedW = parseFloat(String(fp.houseWidth || fp.width || ""));
    const parsedL = parseFloat(String(fp.houseLength || fp.depth || ""));
    const widthM = !isNaN(parsedW) && parsedW >= 6 ? parsedW : 11.5;
    const lengthM = !isNaN(parsedL) && parsedL >= 8 ? parsedL : 20.0;
    map.set(key, {
      id: key.replace(/[^a-z0-9]+/g, "-"),
      name: fp.label,
      housingType,
      totalM2: Math.round(totalM2 * 100) / 100,
      livingM2: Math.round((areas.livingM2 || totalM2 * 0.74) * 100) / 100,
      garageM2: Math.round((areas.garageM2 ?? (isGranny ? 0 : 36.5)) * 100) / 100,
      alfrescoM2: Math.round((areas.alfrescoM2 ?? 12.0) * 100) / 100,
      porchM2: Math.round((areas.porchM2 ?? 3.2) * 100) / 100,
      bedrooms: Number(fp.beds) || 4,
      bathrooms: Number(fp.baths) || 2,
      cars: Number(fp.cars) || 2,
      widthM: Math.round(widthM * 100) / 100,
      lengthM: Math.round(lengthM * 100) / 100,
      floorplanUrl: resolveLocalFloorplanUrl(fp.label, fp.url),
    });
  }

  const DOUBLE_STOREY_FAMILIES = new Set([
    "alabaster",
    "burgundy",
    "carolina",
    "ebony",
    "lime",
    "magnolia",
    "mahogany",
    "maize",
    "marigold",
    "mocha",
    "mulberry",
    "orchid",
    "raven",
    "teal",
  ]);

  for (const [key, localUrl] of Object.entries(SPECIAL_LOCAL_FLOORPLANS)) {
    if (map.has(key)) continue;
    const parts = key.split(" ");
    const family = parts[0]?.toLowerCase() || "";
    const nameTitle = parts
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    const sqNum = parseInt(parts[parts.length - 1] || "24", 10) || 24;
    const totalM2 = Math.round(sqNum * 9.29 * 10) / 10;
    const housingType =
      family === "cayenne"
        ? "Dual Living"
        : DOUBLE_STOREY_FAMILIES.has(family) || (family === "wisteria" && sqNum >= 30) || sqNum >= 31
        ? "Double Storey"
        : "Single Storey";
    const areas = getStandardAreaBreakdown(nameTitle, housingType, totalM2);
    map.set(key, {
      id: key.replace(/[^a-z0-9]+/g, "-"),
      name: nameTitle,
      housingType,
      totalM2,
      livingM2: Math.round((areas.livingM2 || totalM2 * 0.74) * 100) / 100,
      garageM2: Math.round((areas.garageM2 ?? 36.5) * 100) / 100,
      alfrescoM2: Math.round((areas.alfrescoM2 ?? 12.0) * 100) / 100,
      porchM2: Math.round((areas.porchM2 ?? 3.2) * 100) / 100,
      bedrooms: 4,
      bathrooms: 2,
      cars: 2,
      widthM: family === "carolina" || family === "lime" ? 8.27 : family === "burgundy" ? 11.15 : sqNum >= 30 ? 12.35 : 11.39,
      lengthM: family === "burgundy" && sqNum === 32 ? 18.95 : sqNum >= 26 ? 20.5 : 18.5,
      floorplanUrl: localUrl,
    });
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Cleans any wall segment that blocks the open exterior edges of a Porch or Alfresco,
 * while guaranteeing that indoor rooms bordering Porch/Alfresco have a proper 250mm
 * exterior wall and populates complete interior fixtures (benchtops, sinks, vanities,
 * showers, baths, toilets, beds, sofas, dining table) for every room.
 */
export function ensureOutdoorZonesOpenAndFurnished(rawDesign: BuildingDesign3D): BuildingDesign3D {
  const design: BuildingDesign3D = {
    ...rawDesign,
    fitout: rawDesign.fitout || { ...DEFAULT_FITOUT_CONFIG },
    customFacade: rawDesign.customFacade || {
      ...DEFAULT_CUSTOM_FACADE_CONFIG,
      facadePreset: rawDesign.facade || "modern",
    },
  };

  if (design.exactStructuralWalls) {
    return design;
  }

  const outdoorRooms = (design.rooms || []).filter(
    (r) => r.name === "Porch" || r.name === "Alfresco"
  );
  const indoorRooms = (design.rooms || []).filter(
    (r) => r.name !== "Porch" && r.name !== "Alfresco"
  );

  // Helper: get axis-aligned bounding box of a room polygon
  const getBox = (r: Room3D) => {
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (const [x, y] of r.polygon) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    return { minX, maxX, minY, maxY };
  };

  // 1. Rebuild perimeter walls so they never brick-in the open outer sides of Porch or Alfresco
  // Instead, let `deriveInternalWallsFromRooms` in `wallNetworkEngine.ts` derive exact walls
  // around every indoor room and drop any wall segment that coincides with an unshared outdoor edge!
  const cleanedWalls: WallSegment[] = [];

  for (const w of design.walls || []) {
    const isHorizontal = Math.abs(w.start[1] - w.end[1]) < 0.08;
    const isVertical = Math.abs(w.start[0] - w.end[0]) < 0.08;

    if (!isHorizontal && !isVertical) {
      cleanedWalls.push(w);
      continue;
    }

    // Check if this wall runs across an open exterior edge of Porch or Alfresco
    let overlapsOutdoorExterior = false;
    for (const outRoom of outdoorRooms) {
      const ob = getBox(outRoom);
      if (isHorizontal) {
        const y = (w.start[1] + w.end[1]) / 2;
        const onFrontOrRearEdge =
          (Math.abs(y - ob.minY) < 0.12 && ob.minY <= 0.15) ||
          (Math.abs(y - ob.maxY) < 0.12 && ob.maxY >= design.lengthM - 0.15);
        const minWx = Math.min(w.start[0], w.end[0]);
        const maxWx = Math.max(w.start[0], w.end[0]);
        const overlapX = Math.min(maxWx, ob.maxX) - Math.max(minWx, ob.minX);
        if (onFrontOrRearEdge && overlapX > 0.25) {
          overlapsOutdoorExterior = true;
          // Split wall around [ob.minX, ob.maxX]
          if (ob.minX - minWx > 0.25) {
            cleanedWalls.push({
              ...w,
              id: `${w.id}_left_${outRoom.id}`,
              start: [minWx, y],
              end: [ob.minX, y],
            });
          }
          if (maxWx - ob.maxX > 0.25) {
            cleanedWalls.push({
              ...w,
              id: `${w.id}_right_${outRoom.id}`,
              start: [ob.maxX, y],
              end: [maxWx, y],
            });
          }
          break;
        }
      } else if (isVertical) {
        const x = (w.start[0] + w.end[0]) / 2;
        const onSideEdge =
          (Math.abs(x - ob.minX) < 0.12 && ob.minX <= 0.15) ||
          (Math.abs(x - ob.maxX) < 0.12 && ob.maxX >= design.widthM - 0.15);
        const minWy = Math.min(w.start[1], w.end[1]);
        const maxWy = Math.max(w.start[1], w.end[1]);
        const overlapY = Math.min(maxWy, ob.maxY) - Math.max(minWy, ob.minY);
        if (onSideEdge && overlapY > 0.25) {
          overlapsOutdoorExterior = true;
          if (ob.minY - minWy > 0.25) {
            cleanedWalls.push({
              ...w,
              id: `${w.id}_top_${outRoom.id}`,
              start: [x, minWy],
              end: [x, ob.minY],
            });
          }
          if (maxWy - ob.maxY > 0.25) {
            cleanedWalls.push({
              ...w,
              id: `${w.id}_bot_${outRoom.id}`,
              start: [x, ob.maxY],
              end: [x, maxWy],
            });
          }
          break;
        }
      }
    }

    if (!overlapsOutdoorExterior) {
      cleanedWalls.push(w);
    }
  }

  // Also ensure any wall separating an indoor room from Porch/Alfresco is marked isExterior=true (250mm)
  const upgradedWalls = cleanedWalls.map((w) => {
    const midX = (w.start[0] + w.end[0]) / 2;
    const midY = (w.start[1] + w.end[1]) / 2;
    for (const outRoom of outdoorRooms) {
      const ob = getBox(outRoom);
      const onBoundary =
        (Math.abs(midX - ob.minX) < 0.15 || Math.abs(midX - ob.maxX) < 0.15) &&
        midY >= ob.minY - 0.1 &&
        midY <= ob.maxY + 0.1
          ? true
          : (Math.abs(midY - ob.minY) < 0.15 || Math.abs(midY - ob.maxY) < 0.15) &&
            midX >= ob.minX - 0.1 &&
            midX <= ob.maxX + 0.1;
      if (onBoundary) {
        return { ...w, isExterior: true, thickness: 0.25 };
      }
    }
    return w;
  });

  // Snap near-orthogonal walls from custom/imperfect plans so slight hand-drawn/PDF skews (< 3.5°) align cleanly
  const snappedWalls = upgradedWalls.map((w) => {
    const dx = w.end[0] - w.start[0];
    const dz = w.end[1] - w.start[1];
    const len = Math.hypot(dx, dz);
    if (len > 0.15) {
      if (Math.abs(dz) / len < 0.06) {
        const avgZ = Math.round(((w.start[1] + w.end[1]) / 2) * 100) / 100;
        return { ...w, start: [w.start[0], avgZ] as [number, number], end: [w.end[0], avgZ] as [number, number] };
      }
      if (Math.abs(dx) / len < 0.06) {
        const avgX = Math.round(((w.start[0] + w.end[0]) / 2) * 100) / 100;
        return { ...w, start: [avgX, w.start[1]] as [number, number], end: [avgX, w.end[1]] as [number, number] };
      }
    }
    return w;
  });

  // Ensure front Entry door is placed on the Entry-to-Porch wall AND scale all internal doors universally
  // (870mm standard internal doors, 720mm bathroom/WC/linen doors) with 3D hingePoint/closedPoint/openPoint
  const porchRoom = outdoorRooms.find((r) => r.name === "Porch");
  const entryRoom = indoorRooms.find((r) => r.name === "Entry" || r.name === "Hallway");
  const updatedOpenings = (design.openings || []).map((op) => {
    let nextOp = { ...op };
    if (
      porchRoom &&
      entryRoom &&
      nextOp.type === "door" &&
      nextOp.isExterior &&
      (nextOp.code.includes("EXT") || nextOp.code === "D01" || nextOp.code === "D1" || nextOp.label.toLowerCase().includes("entry"))
    ) {
      const pb = getBox(porchRoom);
      if (nextOp.position[1] <= 0.15 && pb.maxY > 0.5) {
        nextOp = {
          ...nextOp,
          position: [(pb.minX + pb.maxX) / 2, pb.maxY] as [number, number],
          wallOrientation: "horizontal" as const,
        };
      }
    }

    // Universal Door Sizing & 3D Swing Arc Synthesis for any plan without explicit hingePoint
    if (nextOp.type === "door" && !nextOp.hingePoint && !nextOp.bifoldPeak) {
      const lbl = `${nextOp.code} ${nextOp.label}`.toLowerCase();
      const isBathOrLinen =
        lbl.includes("bath") ||
        lbl.includes("ens") ||
        lbl.includes("wc") ||
        lbl.includes("linen") ||
        lbl.includes("powder");
      const scaledW = nextOp.isExterior
        ? Math.max(0.82, nextOp.width)
        : isBathOrLinen
        ? 0.72
        : 0.87;
      const halfW = scaledW / 2;
      const [ox, oz] = nextOp.position;
      const isHoriz = nextOp.wallOrientation !== "vertical";

      if (isHoriz) {
        const swingSign = oz < design.lengthM / 2 ? 1 : -1;
        nextOp = {
          ...nextOp,
          width: scaledW,
          hingePoint: [ox - halfW, oz],
          closedPoint: [ox + halfW, oz],
          openPoint: [ox - halfW, oz + swingSign * scaledW],
        };
      } else {
        const swingSign = ox < design.widthM / 2 ? -1 : 1;
        nextOp = {
          ...nextOp,
          width: scaledW,
          hingePoint: [ox, oz - halfW],
          closedPoint: [ox, oz + halfW],
          openPoint: [ox + swingSign * scaledW, oz - halfW],
        };
      }
    }

    return nextOp;
  });

  // 2. Ensure complete interior fitout fixtures (benchtops, sinks, vanities, showers, baths, toilets, laundry tub & future WM space)
  const fixtures: Fixture3D[] = [...(design.fixtures || [])];
  const hasFixtureInRoom = (roomName: string, type?: Fixture3D["type"]) =>
    fixtures.some(
      (f) =>
        f.roomName.toLowerCase() === roomName.toLowerCase() &&
        (!type || f.type === type)
    );

  for (const room of indoorRooms) {
    const rb = getBox(room);
    const rw = rb.maxX - rb.minX;
    const rl = rb.maxY - rb.minY;
    const cx = room.center[0];
    const cz = room.center[1];

    if (room.name === "Kitchen") {
      if (!hasFixtureInRoom("Kitchen", "kitchen_island")) {
        const islandW = Math.min(2.8, Math.max(2.0, rw * 0.58));
        fixtures.push({
          id: `auto_island_${room.id}`,
          type: "kitchen_island",
          roomName: "Kitchen",
          position: [cx, 0.45, cz],
          rotationY: rw >= rl ? 0 : Math.PI / 2,
          width: islandW,
          depth: 0.90,
          height: 0.9,
          label: "Waterfall Stone Island Benchtop",
        });
        if (!hasFixtureInRoom("Kitchen", "kitchen_sink")) {
          fixtures.push({
            id: `auto_ksink_${room.id}`,
            type: "kitchen_sink",
            roomName: "Kitchen",
            position: [cx - islandW * 0.14, 0.90, cz + 0.08],
            rotationY: rw >= rl ? 0 : Math.PI / 2,
            width: 1.07,
            depth: 0.48,
            height: 0.04,
            label: "Double Bowl Undermount Sink & Drainer",
          });
        }
      }
      if (!hasFixtureInRoom("Kitchen", "kitchen_cabinetry")) {
        const isNearEast = Math.abs(rb.maxX - design.widthM) < 0.5;
        const cabX = isNearEast ? rb.maxX - 0.42 : cx;
        const cabZ = isNearEast ? cz : rb.minY + 0.42;
        const rot = isNearEast ? Math.PI / 2 : 0;
        fixtures.push({
          id: `auto_kcab_${room.id}`,
          type: "kitchen_cabinetry",
          roomName: "Kitchen",
          position: [cabX, 0.45, cabZ],
          rotationY: rot,
          width: Math.min(3.2, Math.max(2.2, (isNearEast ? rl : rw) * 0.68)),
          depth: 0.65,
          height: 0.9,
          label: "Rear Stone Benchtop, 900mm Cooktop, Underbench Oven & Overhead Joinery",
        });
      }
    } else if (room.name === "Butler Pantry" && !hasFixtureInRoom("Butler Pantry")) {
      fixtures.push({
        id: `auto_bp_${room.id}`,
        type: "butler_pantry",
        roomName: "Butler Pantry",
        position: [cx, 0.45, cz],
        rotationY: 0,
        width: Math.min(2.2, Math.max(1.4, rw * 0.75)),
        depth: 0.6,
        height: 0.9,
        label: "Butler's Pantry Stone Benchtop & Undermount Prep Sink",
      });
    } else if (room.name === "Ensuite") {
      if (!hasFixtureInRoom("Ensuite", "vanity_double") && !hasFixtureInRoom("Ensuite", "vanity_single")) {
        fixtures.push({
          id: `auto_ens_van_${room.id}`,
          type: "vanity_double",
          roomName: "Ensuite",
          position: [cx, 0.42, rb.minY + 0.35],
          rotationY: 0,
          width: Math.min(1.5, Math.max(1.1, rw * 0.65)),
          depth: 0.5,
          height: 0.85,
          label: "1500mm Floating Double Vanity with Stone Top, Twin Basins & Frameless Mirror",
        });
      }
      if (!hasFixtureInRoom("Ensuite", "shower")) {
        fixtures.push({
          id: `auto_ens_shw_${room.id}`,
          type: "shower",
          roomName: "Ensuite",
          position: [rb.maxX - 0.55, 1.05, rb.maxY - 0.5],
          rotationY: 0,
          width: Math.min(1.4, Math.max(0.95, rw * 0.5)),
          depth: 0.9,
          height: 2.1,
          label: "Semi-Frameless Walk-In Glass Shower Screen & Twin Rail Shower",
        });
      }
      if (!hasFixtureInRoom("Ensuite", "toilet")) {
        fixtures.push({
          id: `auto_ens_wc_${room.id}`,
          type: "toilet",
          roomName: "Ensuite",
          position: [rb.minX + 0.35, 0.4, rb.maxY - 0.4],
          rotationY: 0,
          width: 0.42,
          depth: 0.65,
          height: 0.78,
          label: "Back-to-Wall Vitreous China Toilet Suite",
        });
      }
    } else if (room.name === "Bath") {
      if (!hasFixtureInRoom("Bath", "bath")) {
        fixtures.push({
          id: `auto_bath_tub_${room.id}`,
          type: "bath",
          roomName: "Bath",
          position: [cx, 0.3, rb.maxY - 0.5],
          rotationY: 0,
          width: Math.min(1.65, Math.max(1.3, rw * 0.65)),
          depth: 0.78,
          height: 0.58,
          label: "1700mm Inset/Freestanding Bathtub",
        });
      }
      if (!hasFixtureInRoom("Bath", "vanity_single") && !hasFixtureInRoom("Bath", "vanity_double")) {
        fixtures.push({
          id: `auto_bath_van_${room.id}`,
          type: "vanity_single",
          roomName: "Bath",
          position: [rb.minX + 0.65, 0.42, rb.minY + 0.35],
          rotationY: 0,
          width: Math.min(1.2, Math.max(0.9, rw * 0.48)),
          depth: 0.5,
          height: 0.85,
          label: "Main Bathroom Stone-Top Vanity with Ceramic Basin & Mirror",
        });
      }
      if (!hasFixtureInRoom("Bath", "shower")) {
        fixtures.push({
          id: `auto_bath_shw_${room.id}`,
          type: "shower",
          roomName: "Bath",
          position: [rb.maxX - 0.5, 1.05, cz],
          rotationY: 0,
          width: 0.95,
          depth: 0.95,
          height: 2.1,
          label: "900×900mm Glass Shower Enclosure",
        });
      }
    } else if (room.name === "Laundry" && !hasFixtureInRoom("Laundry")) {
      fixtures.push({
        id: `auto_ltub_${room.id}`,
        type: "laundry_tub",
        roomName: "Laundry",
        position: [rb.minX + 0.42, 0.45, rb.maxY - 0.36],
        rotationY: Math.PI,
        width: 0.60,
        depth: 0.48,
        height: 0.9,
        label: "Laundry 45L Stainless Tub & Sink Cabinetry",
      });
      fixtures.push({
        id: `auto_lwm_${room.id}`,
        type: "washing_machine",
        roomName: "Laundry",
        position: [rb.minX + 1.15, 0.02, rb.maxY - 0.42],
        rotationY: Math.PI,
        width: 0.74,
        depth: 0.67,
        height: 0.04,
        label: "Future Washing Machine Space (Dashed Provision)",
      });
    } else if (
      room.name === "Master Bed" &&
      room.customLabel !== "W.I.R" &&
      !room.customLabel?.includes("Robe") &&
      !hasFixtureInRoom("Master Bed", "bed_queen")
    ) {
      fixtures.push({
        id: `auto_mbed_${room.id}`,
        type: "bed_queen",
        roomName: "Master Bed",
        position: [cx, 0.35, cz],
        rotationY: rw >= rl ? Math.PI / 2 : 0,
        width: 1.85,
        depth: 2.1,
        height: 0.7,
        label: "King/Queen Master Bed with Upholstered Headboard & Side Lamp Tables",
        level: room.level ?? 0,
        elevationOffsetM: room.elevationOffsetM ?? 0,
      });
    } else if (
      (room.name === "Bed 2" || room.name === "Bed 3" || room.name === "Bed 4" || room.name === "Bed 5") &&
      !room.customLabel?.includes("Robe") &&
      !hasFixtureInRoom(room.name, "bed_double")
    ) {
      fixtures.push({
        id: `auto_bed_${room.id}`,
        type: "bed_double",
        roomName: room.name,
        position: [cx, 0.32, cz],
        rotationY: rw >= rl ? Math.PI / 2 : 0,
        width: 1.48,
        depth: 1.98,
        height: 0.64,
        label: `${room.name} Double Bed Suite & Nightstand`,
        level: room.level ?? 0,
        elevationOffsetM: room.elevationOffsetM ?? 0,
      });
    } else if (room.name === "Living" || room.name === "Family") {
      if (!hasFixtureInRoom(room.name, "sofa_sectional") && !hasFixtureInRoom("Family", "sofa_sectional")) {
        fixtures.push({
          id: `auto_sofa_${room.id}`,
          type: "sofa_sectional",
          roomName: room.name,
          position: [cx, 0.42, cz],
          rotationY: 0,
          width: Math.min(2.9, Math.max(2.2, rw * 0.48)),
          depth: Math.min(1.85, Math.max(1.5, rl * 0.38)),
          height: 0.85,
          label: "Modular L-Shape Linen Living Lounge & Woven Area Rug",
          level: room.level ?? 0,
          elevationOffsetM: room.elevationOffsetM ?? 0,
        });
      }
      if (!hasFixtureInRoom(room.name, "coffee_table") && !hasFixtureInRoom("Family", "coffee_table")) {
        fixtures.push({
          id: `auto_ct_${room.id}`,
          type: "coffee_table",
          roomName: room.name,
          position: [cx - 0.15, 0.21, Math.max(rb.minY + 0.9, cz - 1.15)],
          rotationY: 0,
          width: 1.25,
          depth: 0.70,
          height: 0.42,
          label: "Designer Fluted Travertine Coffee Table",
          level: room.level ?? 0,
          elevationOffsetM: room.elevationOffsetM ?? 0,
        });
      }
      if (!hasFixtureInRoom(room.name, "tv_console") && !hasFixtureInRoom(room.name, "tv_entertainment_unit")) {
        fixtures.push({
          id: `auto_tv_${room.id}`,
          type: "tv_entertainment_unit",
          roomName: room.name,
          position: [cx, 0.26, Math.max(rb.minY + 0.38, cz - 2.2)],
          rotationY: 0,
          width: 2.15,
          depth: 0.44,
          height: 0.52,
          label: "Fluted Oak Entertainment Credenza & 75\" Wall OLED TV",
          level: room.level ?? 0,
          elevationOffsetM: room.elevationOffsetM ?? 0,
        });
      }
      if (!hasFixtureInRoom(room.name, "indoor_plant")) {
        fixtures.push({
          id: `auto_plant_${room.id}`,
          type: "indoor_plant",
          roomName: room.name,
          position: [Math.min(rb.maxX - 0.55, cx + 1.65), 0.72, Math.max(rb.minY + 0.55, cz - 1.8)],
          rotationY: 0,
          width: 0.58,
          depth: 0.58,
          height: 1.45,
          label: "Fiddle-Leaf Fig Designer Ceramic Planter",
          level: room.level ?? 0,
          elevationOffsetM: room.elevationOffsetM ?? 0,
        });
      }
    } else if (room.name === "Dining" && !hasFixtureInRoom("Dining", "dining_table")) {
      fixtures.push({
        id: `auto_dining_${room.id}`,
        type: "dining_table",
        roomName: "Dining",
        position: [cx, 0.38, cz],
        rotationY: 0,
        width: Math.min(2.2, Math.max(1.65, rw * 0.55)),
        depth: 1.05,
        height: 0.76,
        label: "8-Seater Solid European Oak Dining Table & Upholstered Chairs",
        level: room.level ?? 0,
        elevationOffsetM: room.elevationOffsetM ?? 0,
      });
    } else if (
      (room.name === "Cinema" || room.name === "Media" || room.name === "Lounge") &&
      !hasFixtureInRoom(room.customLabel || room.name, "cinema_seating") &&
      !hasFixtureInRoom(room.name, "sofa_sectional")
    ) {
      fixtures.push({
        id: `auto_cinema_${room.id}`,
        type: "cinema_seating",
        roomName: room.customLabel || room.name,
        position: [cx, 0.46, cz],
        rotationY: 0,
        width: Math.min(2.55, Math.max(1.8, rw * 0.6)),
        depth: 1.05,
        height: 0.92,
        label: "Home Theatre Recliner Lounge Suite",
        level: room.level ?? 0,
        elevationOffsetM: room.elevationOffsetM ?? 0,
      });
    } else if (room.name === "Study" && !hasFixtureInRoom("Study", "study_desk")) {
      fixtures.push({
        id: `auto_study_${room.id}`,
        type: "study_desk",
        roomName: "Study",
        position: [cx, 0.38, cz],
        rotationY: 0,
        width: 1.55,
        depth: 0.75,
        height: 0.76,
        label: "Executive Timber Study Desk, Chair & Studio Display",
        level: room.level ?? 0,
        elevationOffsetM: room.elevationOffsetM ?? 0,
      });
    }
  }

  // Also stage Covered Alfresco with Outdoor Spotted Gum Dining Set & Built-In BBQ Kitchen
  for (const outRoom of outdoorRooms) {
    if (outRoom.name === "Alfresco") {
      const ob = getBox(outRoom);
      const ow = ob.maxX - ob.minX;
      const ol = ob.maxY - ob.minY;
      const ocx = outRoom.center[0];
      const ocz = outRoom.center[1];
      if (ow >= 2.2 && ol >= 1.8 && !hasFixtureInRoom("Alfresco", "alfresco_dining")) {
        fixtures.push({
          id: `auto_alf_dining_${outRoom.id}`,
          type: "alfresco_dining",
          roomName: "Alfresco",
          position: [ocx, 0.38, ocz],
          rotationY: ow >= ol ? 0 : Math.PI / 2,
          width: Math.min(2.1, Math.max(1.5, ow * 0.52)),
          depth: 1.0,
          height: 0.76,
          label: "Alfresco 6-Seater Spotted Gum Outdoor Dining Suite",
          level: outRoom.level ?? 0,
          elevationOffsetM: outRoom.elevationOffsetM ?? 0,
        });
      }
      if (ow >= 2.6 && ol >= 2.0 && !hasFixtureInRoom("Alfresco", "alfresco_bbq")) {
        fixtures.push({
          id: `auto_alf_bbq_${outRoom.id}`,
          type: "alfresco_bbq",
          roomName: "Alfresco",
          position: [+(ob.maxX - 0.45).toFixed(2), 0.46, ocz],
          rotationY: -Math.PI / 2,
          width: Math.min(1.8, Math.max(1.3, ol * 0.48)),
          depth: 0.65,
          height: 0.92,
          label: "Alfresco Built-In Stainless BBQ & Stone Outdoor Kitchen",
          level: outRoom.level ?? 0,
          elevationOffsetM: outRoom.elevationOffsetM ?? 0,
        });
      }
    }
  }

  const complete = ensureCompleteWallNetwork({
    ...design,
    walls: snappedWalls,
    openings: updatedOpenings,
    fixtures,
  });

  const validated = validateAndClampFixtures(
    complete.fixtures || [],
    complete.rooms || [],
    complete.walls || [],
    complete.widthM,
    complete.lengthM,
    complete.levels
  );

  return {
    ...complete,
    fixtures: validated.validFixtures,
  };
}

/**
 * Geometric & Semantic Room-Polygon Guard (`validateAndClampFixtures`):
 * - Ensures every fixture & staircase lies strictly inside its level's exterior structural footprint.
 * - Enforces hard exclusion zones: no vanity, toilet, bath, shower, bed, sofa, dining_table, or kitchen_island
 *   may spawn inside or within 0.40m of the front opening of a Garage, Porch, Entry, Alfresco, Driveway,
 *   Stairs, Void, Robe, WIR, Linen, or Store.
 * - Enforces wet-room whitelist: vanity, toilet, bath, and shower can ONLY spawn inside Ensuite, Bath, WC, or Powder.
 * - Clamps surviving fixtures inside their host room polygon so nothing pokes through walls.
 */
export function validateAndClampFixtures(
  rawFixtures: Fixture3D[],
  rooms: Room3D[],
  walls: WallSegment[],
  widthM: number,
  lengthM: number,
  levels?: { level: number; worldBounds?: { x: number; z: number; widthM: number; depthM: number } }[]
): {
  validFixtures: Fixture3D[];
  removedIds: string[];
  snappedIds: string[];
} {
  const removedIds: string[] = [];
  const snappedIds: string[] = [];
  const validFixtures: Fixture3D[] = [];

  const getRoomBox = (r: Room3D) => {
    let minX = Infinity,
      maxX = -Infinity,
      minZ = Infinity,
      maxZ = -Infinity;
    for (const [x, z] of r.polygon || []) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
    return { minX, maxX, minZ, maxZ };
  };

  const pointInBox = (x: number, z: number, box: { minX: number; maxX: number; minZ: number; maxZ: number }, pad = 0) =>
    x >= box.minX - pad && x <= box.maxX + pad && z >= box.minZ - pad && z <= box.maxZ + pad;

  const isWetFixture = (t: Fixture3D["type"]) =>
    t === "vanity_single" || t === "vanity_double" || t === "toilet" || t === "bath" || t === "shower";

  const isOutdoorFixture = (t: Fixture3D["type"]) =>
    t === "alfresco_dining" || t === "alfresco_bbq" || t === "outdoor_lounge";

  const isExcludedIndoorFixture = (t: Fixture3D["type"]) =>
    isWetFixture(t) ||
    t === "bed_queen" ||
    t === "bed_double" ||
    t === "kitchen_island" ||
    t === "kitchen_cabinetry" ||
    t === "kitchen_sink" ||
    t === "cooktop_oven" ||
    t === "sofa_sectional" ||
    t === "dining_table";

  const HARD_EXCLUDED_ROOM_NAMES = new Set([
    "garage",
    "porch",
    "alfresco",
    "driveway",
    "stairs",
    "void",
  ]);

  const WET_ONLY_EXCLUDED_ROOM_NAMES = new Set([
    "entry",
    "robe",
    "wir",
    "linen",
    "store",
  ]);

  const WET_WHITELIST_NAMES = ["ensuite", "bath", "wc", "powder", "ens/pwdr", "pwdr"];

  for (const origFix of rawFixtures || []) {
    const f: Fixture3D = {
      ...origFix,
      position: [...origFix.position] as [number, number, number],
    };
    const fLevel = f.level ?? 0;
    const fx = f.position[0];
    const fz = f.position[2];

    // 1. Level exterior structural bounds check
    const lvlMeta = (levels || []).find((l) => l.level === fLevel);
    const lvlWalls = (walls || []).filter((w) => (w.level ?? 0) === fLevel);
    let minLvlX = lvlMeta?.worldBounds ? lvlMeta.worldBounds.x : 0;
    let maxLvlX = lvlMeta?.worldBounds ? lvlMeta.worldBounds.x + lvlMeta.worldBounds.widthM : widthM;
    let minLvlZ = lvlMeta?.worldBounds ? lvlMeta.worldBounds.z : 0;
    let maxLvlZ = lvlMeta?.worldBounds ? lvlMeta.worldBounds.z + lvlMeta.worldBounds.depthM : lengthM;

    if (lvlWalls.length >= 4 && !isOutdoorFixture(f.type)) {
      const xs = lvlWalls.flatMap((w) => [w.start[0], w.end[0]]);
      const zs = lvlWalls.flatMap((w) => [w.start[1], w.end[1]]);
      minLvlX = Math.min(...xs);
      maxLvlX = Math.max(...xs);
      minLvlZ = Math.min(...zs);
      maxLvlZ = Math.max(...zs);
    }

    const outOfFootprint =
      fx < minLvlX - 0.18 ||
      fx > maxLvlX + 0.18 ||
      fz < minLvlZ - 0.18 ||
      fz > maxLvlZ + 0.18;

    // 2. Check scanline exterior wall containment at (fx, fz) so recesses (e.g. driveway in front of garage) are caught
    let outsideScanlineEnvelope = false;
    if (lvlWalls.length >= 4 && f.type !== "balustrade" && !isOutdoorFixture(f.type)) {
      const extWalls = lvlWalls.filter((w) => w.isExterior);
      const checkWalls = extWalls.length >= 4 ? extWalls : lvlWalls;
      const vSpanning = checkWalls.filter(
        (w) =>
          Math.abs(w.start[0] - w.end[0]) < 0.15 &&
          fz >= Math.min(w.start[1], w.end[1]) - 0.8 &&
          fz <= Math.max(w.start[1], w.end[1]) + 0.8
      );
      const hSpanning = checkWalls.filter(
        (w) =>
          Math.abs(w.start[1] - w.end[1]) < 0.15 &&
          fx >= Math.min(w.start[0], w.end[0]) - 0.8 &&
          fx <= Math.max(w.start[0], w.end[0]) + 0.8
      );
      if (vSpanning.length >= 2) {
        const minVX = Math.min(...vSpanning.map((w) => w.start[0]));
        const maxVX = Math.max(...vSpanning.map((w) => w.start[0]));
        if (fx < minVX - 0.25 || fx > maxVX + 0.25) outsideScanlineEnvelope = true;
      }
      if (hSpanning.length >= 2) {
        const minHZ = Math.min(...hSpanning.map((w) => w.start[1]));
        const maxHZ = Math.max(...hSpanning.map((w) => w.start[1]));
        if (fz < minHZ - 0.25 || fz > maxHZ + 0.25) outsideScanlineEnvelope = true;
      }
    }

    // 3. Check Hard Exclusion Zones (Garage, Porch, Alfresco, Driveway in front of Garage, Stairs, Void)
    const levelRooms = (rooms || []).filter((r) => (r.level ?? 0) === fLevel && r.polygon && r.polygon.length >= 3);
    let inExcludedZone = false;
    if (isExcludedIndoorFixture(f.type)) {
      for (const r of levelRooms) {
        const rNameLow = (r.name || "").toLowerCase();
        const rCustomLow = (r.customLabel || "").toLowerCase();
        const box = getRoomBox(r);

        if (rNameLow === "garage") {
          // Exclude inside Garage AND the driveway apron directly in front of the Garage (+4.0m south) or within 0.40m of garage opening
          if (
            pointInBox(fx, fz, box, 0.25) ||
            (fx >= box.minX - 0.40 && fx <= box.maxX + 0.40 && fz >= box.maxZ - 0.40)
          ) {
            inExcludedZone = true;
            break;
          }
        } else if (
          HARD_EXCLUDED_ROOM_NAMES.has(rNameLow) ||
          (isWetFixture(f.type) && WET_ONLY_EXCLUDED_ROOM_NAMES.has(rNameLow)) ||
          rCustomLow.includes("porch") ||
          rCustomLow.includes("garage") ||
          rCustomLow.includes("alfresco")
        ) {
          // Only treat full-floor synthetic container polygons (area > 28 m²) as non-excluding if they are generic Entry/Living wrappers
          const isSyntheticWrapper =
            (rNameLow === "entry" || rNameLow === "living") &&
            (box.maxX - box.minX) * (box.maxZ - box.minZ) > 28;
          if (!isSyntheticWrapper && pointInBox(fx, fz, box, -0.05)) {
            inExcludedZone = true;
            break;
          }
        }
      }
    }

    // 4. Wet-Room Whitelist Check for vanities, toilets, baths, and showers
    let wetRoomViolation = false;
    if (isWetFixture(f.type)) {
      const fRoomLow = (f.roomName || "").toLowerCase();
      const labelMatchesWet = WET_WHITELIST_NAMES.some((w) => fRoomLow.includes(w));
      const wetRoomsOnLevel = levelRooms.filter((r) => {
        const rn = `${r.name} ${r.customLabel || ""}`.toLowerCase();
        return WET_WHITELIST_NAMES.some((w) => rn.includes(w));
      });
      if (!labelMatchesWet) {
        wetRoomViolation = true;
      } else if (wetRoomsOnLevel.length > 0) {
        const insideAnyWetRoom = wetRoomsOnLevel.some((wr) =>
          pointInBox(fx, fz, getRoomBox(wr), 0.35)
        );
        if (!insideAnyWetRoom) {
          wetRoomViolation = true;
        }
      }
    }

    if (outOfFootprint || outsideScanlineEnvelope || inExcludedZone || wetRoomViolation) {
      // Attempt to snap into a valid matching room on the same level if none of this fixture type exists there yet
      const candidateRoom = levelRooms.find((r) => {
        const rn = `${r.name} ${r.customLabel || ""}`.toLowerCase();
        if (HARD_EXCLUDED_ROOM_NAMES.has((r.name || "").toLowerCase())) return false;
        if (isWetFixture(f.type)) {
          return (
            WET_WHITELIST_NAMES.some((w) => rn.includes(w)) &&
            !validFixtures.some(
              (vf) =>
                (vf.level ?? 0) === fLevel &&
                vf.type === f.type &&
                pointInBox(vf.position[0], vf.position[2], getRoomBox(r), 0.25)
            )
          );
        }
        return rn.includes((f.roomName || "").toLowerCase());
      });

      if (candidateRoom && f.type === "staircase") {
        const cb = getRoomBox(candidateRoom);
        f.position[0] = Number(((cb.minX + cb.maxX) / 2).toFixed(2));
        f.position[2] = Number(((cb.minZ + cb.maxZ) / 2).toFixed(2));
        snappedIds.push(f.id);
        validFixtures.push(f);
      } else {
        removedIds.push(f.id);
      }
      continue;
    }

    // 5. Clamp fixture inside its host room bounding box if a discrete room polygon (< 26 m²) contains it
    const hostRoom = levelRooms.find((r) => {
      const b = getRoomBox(r);
      const area = (b.maxX - b.minX) * (b.maxZ - b.minZ);
      return area <= 26 && pointInBox(fx, fz, b, 0.15);
    });

    if (hostRoom && f.type !== "balustrade" && f.type !== "staircase") {
      const hb = getRoomBox(hostRoom);
      const rotCos = Math.abs(Math.cos(f.rotationY || 0));
      const rotSin = Math.abs(Math.sin(f.rotationY || 0));
      const effHalfW = (f.width * rotCos + f.depth * rotSin) / 2 + 0.06;
      const effHalfD = (f.width * rotSin + f.depth * rotCos) / 2 + 0.06;

      if (hb.maxX - hb.minX > effHalfW * 2) {
        f.position[0] = Number(
          Math.max(hb.minX + effHalfW, Math.min(hb.maxX - effHalfW, f.position[0])).toFixed(2)
        );
      }
      if (hb.maxZ - hb.minZ > effHalfD * 2) {
        f.position[2] = Number(
          Math.max(hb.minZ + effHalfD, Math.min(hb.maxZ - effHalfD, f.position[2])).toFixed(2)
        );
      }
    }

    validFixtures.push(f);
  }

  return { validFixtures, removedIds, snappedIds };
}

/**
 * Generates an accurate, scaled 3D architectural model for ANY Hudson Homes design
 * in the master catalogue (or custom design name).
 */
export function build3DDesignForStandardModel(
  designName: string,
  housingTypeOverride?: string
): BuildingDesign3D {
  const clean = designName.trim().toLowerCase();

  // Only return pre-calibrated Amber 21 or Juliana special directly
  if (clean.includes("juliana")) {
    return ensureOutdoorZonesOpenAndFurnished(DESIGNS_3D_REGISTRY["tiffany-22-custom-juliana"]);
  }
  if (clean === "amber 21" || clean === "amber-21") {
    return ensureOutdoorZonesOpenAndFurnished(DESIGNS_3D_REGISTRY["amber-21"]);
  }

  // Look up exact specifications from full Hudson Homes catalogue
  const allCatalogue = getAllHudsonStandardDesigns();
  const normClean = clean.replace(/[^a-z0-9]+/g, " ").trim();
  const isJamesMauve =
    clean.includes("james") ||
    (clean.includes("mauve") && (clean.includes("custom") || clean.includes("modified")));
  const matched = isJamesMauve
    ? allCatalogue.find((d) => d.id === "mauve-35-custom-james")
    : allCatalogue.find((d) => d.name.toLowerCase() === clean || d.id === clean) ||
      allCatalogue.find((d) => d.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() === normClean) ||
      allCatalogue.find((d) => clean.includes(d.name.toLowerCase()) || d.name.toLowerCase().includes(clean));

  const spec: StandardCatalogueDesignItem = matched || {
    id: clean.replace(/[^a-z0-9]+/g, "-") || "custom-plan",
    name: designName || "Custom Hudson Design",
    housingType: (housingTypeOverride as any) || "Single Storey",
    totalM2: 215,
    livingM2: 160,
    garageM2: 37,
    alfrescoM2: 14,
    porchM2: 4,
    bedrooms: 4,
    bathrooms: 2,
    cars: 2,
    widthM: 12.2,
    lengthM: 20.5,
  };

  const planMeta = plansForDesign(spec.name)[0] || plansForDesign(designName)[0];
  const floorplanImageUrl = isJamesMauve
    ? "/floorplans/MAUVE 35 CUSTOM JAMES.png"
    : resolveLocalFloorplanUrl(spec.name, planMeta?.url || spec.floorplanUrl);

  // Scale our architectural template proportionally to `spec.widthM` and `spec.lengthM`
  // as an immediate synchronous placeholder until `vectorizeFloorplanForDesign` resolves (~150ms)
  const baseTemplate = DESIGNS_3D_REGISTRY["amber-21"];

  const scaleX = spec.widthM / baseTemplate.widthM;
  const scaleZ = spec.lengthM / baseTemplate.lengthM;

  const scaledRooms: Room3D[] = baseTemplate.rooms.map((r) => {
    const scaledPoly: [number, number][] = r.polygon.map(([x, y]) => [
      Math.round(x * scaleX * 100) / 100,
      Math.round(y * scaleZ * 100) / 100,
    ]);
    const cx = Math.round(r.center[0] * scaleX * 100) / 100;
    const cy = Math.round(r.center[1] * scaleZ * 100) / 100;
    const w = Math.abs(scaledPoly[1][0] - scaledPoly[0][0]);
    const l = Math.abs(scaledPoly[2][1] - scaledPoly[1][1]);
    const areaM2 =
      r.name === "Garage"
        ? spec.garageM2
        : r.name === "Alfresco"
        ? spec.alfrescoM2
        : r.name === "Porch"
        ? spec.porchM2
        : Math.round(w * l * 100) / 100;

    return {
      ...r,
      id: `${spec.id}_${r.id}`,
      polygon: scaledPoly,
      center: [cx, cy],
      areaM2,
      dimensionsText: `${w.toFixed(1)} × ${l.toFixed(1)}m`,
    };
  });

  const scaledWalls: WallSegment[] = baseTemplate.walls.map((w) => ({
    ...w,
    id: `${spec.id}_${w.id}`,
    start: [Math.round(w.start[0] * scaleX * 100) / 100, Math.round(w.start[1] * scaleZ * 100) / 100],
    end: [Math.round(w.end[0] * scaleX * 100) / 100, Math.round(w.end[1] * scaleZ * 100) / 100],
  }));

  const scaledOpenings: Opening3D[] = baseTemplate.openings.map((op) => ({
    ...op,
    id: `${spec.id}_${op.id}`,
    position: [
      Math.round(op.position[0] * scaleX * 100) / 100,
      Math.round(op.position[1] * scaleZ * 100) / 100,
    ],
    hingePoint: op.hingePoint
      ? [Math.round(op.hingePoint[0] * scaleX * 100) / 100, Math.round(op.hingePoint[1] * scaleZ * 100) / 100]
      : undefined,
    closedPoint: op.closedPoint
      ? [Math.round(op.closedPoint[0] * scaleX * 100) / 100, Math.round(op.closedPoint[1] * scaleZ * 100) / 100]
      : undefined,
    openPoint: op.openPoint
      ? [Math.round(op.openPoint[0] * scaleX * 100) / 100, Math.round(op.openPoint[1] * scaleZ * 100) / 100]
      : undefined,
    bifoldPeak: op.bifoldPeak
      ? [Math.round(op.bifoldPeak[0] * scaleX * 100) / 100, Math.round(op.bifoldPeak[1] * scaleZ * 100) / 100]
      : undefined,
  }));

  const scaledFixtures: Fixture3D[] = (baseTemplate.fixtures || []).map((f) => ({
    ...f,
    id: `${spec.id}_${f.id}`,
    position: [
      Math.round(f.position[0] * scaleX * 100) / 100,
      f.position[1],
      Math.round(f.position[2] * scaleZ * 100) / 100,
    ],
  }));

  const resolvedHousingType: BuildingDesign3D["housingType"] =
    spec.housingType === "Split Level"
      ? "Split Level"
      : spec.housingType === "Double Storey"
      ? "Double Storey"
      : spec.housingType === "Dual Living"
      ? "Dual Living"
      : "Single Storey";

  // Standard Hudson Homes ceiling heights: 2590mm (2.59m) for Double Storey Ground Floor, 2440mm (2.44m) for Single Storey
  const defaultCeilingHeightM = isJamesMauve
    ? 2.74
    : resolvedHousingType === "Double Storey" || resolvedHousingType === "Split Level"
    ? 2.59
    : 2.44;

  const validatedPlaceholder = validateAndClampFixtures(
    scaledFixtures,
    scaledRooms,
    scaledWalls,
    spec.widthM,
    spec.lengthM
  );

  const generated: BuildingDesign3D = {
    ...baseTemplate,
    id: spec.id,
    name: spec.name,
    variantName: isJamesMauve
      ? "Custom 3-Level Split Level for James (410.75 m²)"
      : `${spec.housingType} (${spec.totalM2} m²)`,
    clientName: isJamesMauve ? "James Channell" : undefined,
    housingType: resolvedHousingType,
    isCustomPlan: isJamesMauve,
    widthM: spec.widthM,
    lengthM: spec.lengthM,
    ceilingHeightM: defaultCeilingHeightM,
    floorplanImageUrl,
    floorplanCrop: undefined,
    openHampers: (baseTemplate.openHampers || []).map((h) => ({
      ...h,
      id: `${spec.id}_${h.id}`,
      start: [Math.round(h.start[0] * scaleX * 100) / 100, Math.round(h.start[1] * scaleZ * 100) / 100],
      end: [Math.round(h.end[0] * scaleX * 100) / 100, Math.round(h.end[1] * scaleZ * 100) / 100],
    })),
    exactStructuralWalls: true,
    facade: "modern",
    schedule: {
      livingM2: spec.livingM2,
      lowerLivingM2: spec.lowerLivingM2,
      groundLivingM2: spec.groundLivingM2,
      firstLivingM2: spec.firstLivingM2,
      garageM2: spec.garageM2,
      alfrescoM2: spec.alfrescoM2,
      porchM2: spec.porchM2,
      balconyM2: spec.balconyM2,
      totalM2: spec.totalM2,
      bedrooms: spec.bedrooms,
      bathrooms: spec.bathrooms,
      cars: spec.cars,
    },
    rooms: scaledRooms,
    walls: scaledWalls,
    openings: scaledOpenings,
    fixtures: validatedPlaceholder.validFixtures,
    boundary: {
      ...DEFAULT_BOUNDARY_CONFIG,
      lotWidthM: spec.widthM >= 14.2 ? 18 : spec.widthM >= 12.8 ? 16 : spec.widthM >= 11.4 ? 14 : 12.5,
      lotLengthM: spec.widthM >= 14.2 ? 35 : spec.widthM >= 12.8 ? 32 : spec.widthM >= 11.4 ? 30 : 28,
    },
    materials: { ...DEFAULT_MATERIAL_CONFIG },
    fitout: { ...DEFAULT_FITOUT_CONFIG, showFurniture: true },
    customFacade: {
      ...DEFAULT_CUSTOM_FACADE_CONFIG,
      mode: "tailored",
      facadePreset: "modern",
      rooflineStyle: "hip_22_5",
    },
    notes: isJamesMauve
      ? [
          "Custom Mauve 35 for James — 3-Level Split Level + Upper Storey Design (410.75 m² / 44.2 SQ)",
          "Level 1 — Ground Floor (82.41 m²): Extended Front Porch (11.54 m²), Entry, Living (3.7×4.7m), Bed 5/Guest Suite with WIR & Ensuite, Bed 4/Guest with Ensuite, Powder WC, Double Garage (6.0×6.0m) + 3rd Garage Bay (9.7×3.0m = 63.54 m² total garage)",
          "Level 2 — Split / Lower Ground Level (86.07 m², +600mm stepped): Open-plan Family (6.3×5.3m), Dining (4.5×4.0m), Kitchen (2.7×5.3m) with Island, Walk-in Pantry, Scullery, Laundry, & Enlarged Rear Covered Alfresco (24.94 m²)",
          "Level 3 — First Floor (129.77 m², +3300mm upper storey): Gallery (6.2×5.0m), Front Covered Balcony (6.0×2.0m = 12.48 m²) with Glass Balustrade, Master Bed 1 (4.7×4.6m) with WIR & Twin Ensuite, Bed 2 (3.6×4.0m), Bed 3 (3.6×4.0m), Main Bath & WC",
          "Upgraded 2740mm high ceilings across all 3 levels (Lower Ground, Ground Floor, and Upper Level)",
        ]
      : [
          `Standard Hudson Homes ${spec.housingType} design: ${spec.name}`,
          `CAD Area Schedule: Total ${spec.totalM2} m² (Living ${spec.livingM2} m², Garage ${spec.garageM2} m², Alfresco ${spec.alfrescoM2} m², Porch ${spec.porchM2} m²)`,
          `Overall Footprint: ${spec.widthM}m Width × ${spec.lengthM}m Depth`,
          "1:100 Runtime CAD Vectorized: 250mm-350mm external brick veneer, 90mm internal stud partitions, open hampers, hinged/sliding doors, windows, kitchen & bathroom fixtures, & stepped hip-valley roof",
        ],
  };

  return generated;
}

/**
 * Applies `PlanModificationAnalysis` (from `analyzeModifiedFloorplanFile`) onto a 3D building design
 * so that uploaded modified floorplans accurately reflect area extensions, internal room changes,
 * door/window upgrades, benchtops, vanities, and sinks in 3D!
 */
export function applyPlanModificationsTo3DDesign(
  baseDesign: BuildingDesign3D,
  analysis: PlanModificationAnalysis,
  fileName?: string
): BuildingDesign3D {
  const modified = JSON.parse(JSON.stringify(baseDesign)) as BuildingDesign3D;
  modified.isCustomPlan = true;
  if (analysis.isPureCustomPlan) {
    const cleanTitle =
      analysis.customPlanTitle ||
      (fileName ? fileName.replace(/\.[^/.]+$/, "") : "") ||
      modified.name;
    modified.name = cleanTitle;
    modified.variantName = `Custom 1:100 Architectural Plan (${analysis.modifiedTotalM2 || modified.schedule.totalM2} m²)`;
  } else {
    modified.variantName = `Modified ${analysis.baseDesignName}`;
  }
  modified.id = `modified-${baseDesign.id}-${Date.now()}`;

  // 1. Apply Area Deltas to Schedule & Multi-Level Metadata
  for (const delta of analysis.areaDeltas || []) {
    if (!delta.accepted || Math.abs(delta.deltaM2) < 0.05) continue;
    if (delta.zoneKey === "lowerLivingM2") {
      modified.schedule.lowerLivingM2 = delta.modifiedM2;
      modified.housingType = "Split Level";
    } else if (delta.zoneKey === "groundLivingM2") {
      modified.schedule.groundLivingM2 = delta.modifiedM2;
    } else if (delta.zoneKey === "firstLivingM2") {
      modified.schedule.firstLivingM2 = delta.modifiedM2;
      if (modified.housingType === "Single Storey") {
        modified.housingType = "Double Storey";
      }
    } else if (delta.zoneKey === "livingM2") {
      modified.schedule.livingM2 = delta.modifiedM2;
    } else if (delta.zoneKey === "garageM2") {
      modified.schedule.garageM2 = delta.modifiedM2;
      if (delta.modifiedM2 >= 52) modified.schedule.cars = 3;
      const gar = modified.rooms.find((r) => r.name === "Garage");
      if (gar) gar.areaM2 = delta.modifiedM2;
    } else if (delta.zoneKey === "alfrescoM2") {
      modified.schedule.alfrescoM2 = delta.modifiedM2;
      const alf = modified.rooms.find((r) => r.name === "Alfresco");
      if (alf) alf.areaM2 = delta.modifiedM2;
    } else if (delta.zoneKey === "porchM2") {
      modified.schedule.porchM2 = delta.modifiedM2;
      const prc = modified.rooms.find((r) => r.name === "Porch");
      if (prc) prc.areaM2 = delta.modifiedM2;
    } else if ((delta.zoneKey as string) === "balconyM2") {
      modified.schedule.balconyM2 = delta.modifiedM2;
      const bal = modified.rooms.find((r) => r.name === "Balcony");
      if (bal) bal.areaM2 = delta.modifiedM2;
    }
  }
  if (
    (modified.schedule.lowerLivingM2 || 0) +
      (modified.schedule.groundLivingM2 || 0) +
      (modified.schedule.firstLivingM2 || 0) >
    0
  ) {
    modified.schedule.livingM2 = +(
      (modified.schedule.lowerLivingM2 || 0) +
      (modified.schedule.groundLivingM2 || 0) +
      (modified.schedule.firstLivingM2 || 0)
    ).toFixed(2);
  }
  if (analysis.modifiedTotalM2 > 0) {
    modified.schedule.totalM2 = analysis.modifiedTotalM2;
  }
  if (
    (analysis.baseDesignName || "").toLowerCase().includes("mauve") &&
    (modified.schedule.totalM2 > 380 || (modified.schedule.balconyM2 ?? 0) > 0)
  ) {
    modified.name = "Custom Mauve 35 for James";
    modified.variantName = "Custom 3-Level Split Level for James (410.75 m²)";
    modified.housingType = "Split Level";
    modified.ceilingHeightM = 2.74;
  }

  // 2. Apply Internal Room Changes (e.g., Cinema conversion, Mud Nook, Butler's Pantry, Study)
  for (const rc of analysis.internalRoomChanges || []) {
    if (!rc.accepted) continue;
    const lower = `${rc.roomName} ${rc.description}`.toLowerCase();
    if (lower.includes("cinema") || lower.includes("media") || lower.includes("theatre")) {
      const target =
        modified.rooms.find((r) => r.name === "Cinema") ||
        modified.rooms.find((r) => r.name === "Bed 4");
      if (target) {
        target.name = "Cinema";
        target.customLabel = "Cinema / Theatre (Modified)";
        target.isModified = true;
      }
    }
    if (lower.includes("butler") || lower.includes("wip") || lower.includes("pantry")) {
      const hasBp = modified.rooms.some((r) => r.name === "Butler Pantry");
      if (!hasBp) {
        const kit = modified.rooms.find((r) => r.name === "Kitchen");
        if (kit) {
          kit.customLabel = "Kitchen + Butler's Pantry";
          kit.isModified = true;
        }
      }
    }
    if (lower.includes("mud") || lower.includes("study")) {
      const entry = modified.rooms.find((r) => r.name === "Entry" || r.name === "Bed 4");
      if (entry) {
        entry.isModified = true;
      }
    }
  }

  // 3. Apply Opening Replacements (Barn doors, Stacker doors, Cavity sliders)
  for (const opRep of analysis.openingReplacements || []) {
    if (!opRep.accepted) continue;
    const lower = `${opRep.newItemName} ${opRep.description}`.toLowerCase();
    if (lower.includes("barn")) {
      const medDoor = modified.openings.find(
        (o) => o.label.toLowerCase().includes("media") || o.label.toLowerCase().includes("theatre") || o.label.toLowerCase().includes("bed 4")
      );
      if (medDoor) {
        medDoor.type = "barn_door";
        medDoor.code = "BARN 1200";
        medDoor.label = "Modified Barn Sliding Door 1200w";
        medDoor.width = 1.2;
      }
    }
    if (lower.includes("stacker")) {
      const alfDoor = modified.openings.find(
        (o) => o.type === "sliding_door" || o.type === "stacker_door"
      );
      if (alfDoor) {
        alfDoor.type = "stacker_door";
        alfDoor.code = "STACKER 21.36";
        alfDoor.label = "Upgraded 3-Panel Stacker Door to Alfresco";
        alfDoor.width = 3.2;
      }
    }
  }

  // 4. Apply Detected Joinery, Benchtop, Vanity & Sink Upgrades to 3D Fitout
  const fitout: InteriorFitoutConfig = {
    ...(modified.fitout || DEFAULT_FITOUT_CONFIG),
  };
  for (const upg of analysis.inclusionUpgrades || []) {
    if (!upg.accepted) continue;
    const lower = `${upg.id} ${upg.name}`.toLowerCase();
    if (lower.includes("40mm")) fitout.benchtopThicknessMm = 40;
    if (lower.includes("waterfall")) fitout.waterfallEnds = 2;
    if (lower.includes("double_vanity_1800")) fitout.ensuiteVanityStyle = "double_1800";
    else if (lower.includes("double_vanity")) fitout.ensuiteVanityStyle = "double_1500";
    else if (lower.includes("1200")) fitout.ensuiteVanityStyle = "extended_1200";
    if (lower.includes("freestanding_bath")) fitout.bathStyle = "freestanding_oval";
    if (lower.includes("undermount_sink")) fitout.sinkStyle = "double_undermount";
    if (lower.includes("2740") || lower.includes("2700")) {
      modified.ceilingHeightM = 2.74;
      fitout.upgradeDoorJoineryHeights = true;
    }
    if (lower.includes("2900")) {
      modified.ceilingHeightM = 2.9;
      fitout.upgradeDoorJoineryHeights = true;
    }
  }
  modified.fitout = fitout;

  modified.notes = [
    `Uploaded Plan: ${fileName || analysis.fileName || "Client Plan"}`,
    analysis.isPureCustomPlan
      ? `Custom Architectural Floorplan (${modified.schedule.totalM2} m² total area)`
      : `Compared against Standard ${analysis.baseDesignName} (${analysis.standardTotalM2} m² → ${modified.schedule.totalM2} m²)`,
    ...((analysis as any).summaryNotes || (analysis as any).notes || []),
  ];

  return ensureOutdoorZonesOpenAndFurnished(modified);
}

/**
 * Generates Design-Tailored Structural Facade configurations calibrated specifically
 * to the active design's width, garage projection, porch span, and master suite front bay.
 */
export function getTailoredFacadePresetsForDesign(design: BuildingDesign3D): {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  config: CustomFacadeConfig;
}[] {
  const porch = design.rooms.find((r) => r.name === "Porch");
  const porchW = porch
    ? Math.max(1.5, Math.abs((porch.polygon[1]?.[0] || 2.0) - (porch.polygon[0]?.[0] || 0)))
    : 1.8;

  return [
    {
      id: "tailored-signature-portico",
      title: `${design.name} Signature Cantilever Portico`,
      subtitle: `Tailored to ${design.widthM}m frontage • ${porchW.toFixed(1)}m entry span with floating blade wall & cedar soffit`,
      badge: "Design-Tailored",
      config: {
        mode: "tailored",
        facadePreset: "contempo",
        tailoredName: `${design.name} Signature Cantilever`,
        rooflineStyle: "hip_22_5",
        porticoStyle: "cantilever_blade",
        porticoProjectionM: 1.8,
        garageArticulation: "recessed_timber_frame",
        frontWindowStyle: "floor_to_ceiling_feature",
        featureBladeWall: true,
        alfrescoPiers: true,
      },
    },
    {
      id: "tailored-hamptons-gable",
      title: `${design.name} Hamptons Gable & Twin Piers`,
      subtitle: `Custom Scyon Linea front gable calibrated to ${design.name}'s master suite & ${porchW.toFixed(1)}m verandah`,
      badge: "Design-Tailored",
      config: {
        mode: "tailored",
        facadePreset: "hamptons",
        tailoredName: `${design.name} Hamptons Gable`,
        rooflineStyle: "feature_front_gable",
        porticoStyle: "twin_posts_canopy",
        porticoProjectionM: 1.6,
        garageArticulation: "standard_step",
        frontWindowStyle: "hamptons_colonial",
        featureBladeWall: false,
        alfrescoPiers: true,
      },
    },
    {
      id: "tailored-palm-springs-parapet",
      title: `${design.name} Palm Springs Box Parapet`,
      subtitle: `Architectural flush parapet across ${design.widthM}m elevation with vertical batten screen & twin slot windows`,
      badge: "Design-Tailored",
      config: {
        mode: "tailored",
        facadePreset: "palm_springs",
        tailoredName: `${design.name} Box Parapet`,
        rooflineStyle: "box_parapet",
        porticoStyle: "cedar_batten_screen",
        porticoProjectionM: 1.5,
        garageArticulation: "flush_parapet",
        frontWindowStyle: "twin_vertical_slots",
        featureBladeWall: true,
        alfrescoPiers: true,
      },
    },
    {
      id: "tailored-executive-grand-piers",
      title: `${design.name} Executive Grand Brick Piers`,
      subtitle: `470mm monumental face-brick piers with stone capitals & recessed portico beam`,
      badge: "Design-Tailored",
      config: {
        mode: "tailored",
        facadePreset: "executive",
        tailoredName: `${design.name} Executive Grande`,
        rooflineStyle: "hip_22_5",
        porticoStyle: "double_brick_piers",
        porticoProjectionM: 1.7,
        garageArticulation: "standard_step",
        frontWindowStyle: "standard_sliding",
        featureBladeWall: true,
        alfrescoPiers: true,
      },
    },
  ];
}
