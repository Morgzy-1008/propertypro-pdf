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
import { plansForDesign } from "@/components/flyer/floorplans";
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
  garageM2: number;
  alfrescoM2: number;
  porchM2: number;
  bedrooms: number;
  bathrooms: number;
  cars: number;
  widthM: number;
  lengthM: number;
}

export type StandardHudsonDesignOption = StandardCatalogueDesignItem;

/**
 * Returns a complete, searchable list of all Hudson Homes standard designs
 * across the entire catalogue with their CAD area breakdown and dimensions.
 */
export function getAllHudsonStandardDesigns(): StandardCatalogueDesignItem[] {
  const map = new Map<string, StandardCatalogueDesignItem>();

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

      const parsedW = parseFloat(String(planMeta?.houseWidth || planMeta?.width || ""));
      const parsedL = parseFloat(String(planMeta?.houseLength || planMeta?.depth || ""));

      const footprintM2 =
        housingType === "Double Storey"
          ? (areas.groundLivingM2 || livingM2 * 0.55) + garageM2 + alfrescoM2 + porchM2
          : totalM2;

      const widthM =
        !isNaN(parsedW) && parsedW >= 6
          ? parsedW
          : isGranny
          ? 7.2
          : footprintM2 > 220
          ? 14.2
          : footprintM2 > 185
          ? 12.1
          : 10.8;
      const lengthM =
        !isNaN(parsedL) && parsedL >= 8
          ? parsedL
          : Math.round(Math.max(11.5, (footprintM2 / widthM) * 1.06) * 100) / 100;

      map.set(key, {
        id: key.replace(/[^a-z0-9]+/g, "-"),
        name: r.name,
        housingType,
        totalM2: Math.round(totalM2 * 100) / 100,
        livingM2: Math.round(livingM2 * 100) / 100,
        garageM2: Math.round(garageM2 * 100) / 100,
        alfrescoM2: Math.round(alfrescoM2 * 100) / 100,
        porchM2: Math.round(porchM2 * 100) / 100,
        bedrooms: beds,
        bathrooms: baths,
        cars,
        widthM: Math.round(widthM * 100) / 100,
        lengthM: Math.round(lengthM * 100) / 100,
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
    } else if (room.name === "Master Bed" && room.customLabel !== "W.I.R" && !hasFixtureInRoom("Master Bed", "bed_queen")) {
      fixtures.push({
        id: `auto_mbed_${room.id}`,
        type: "bed_queen",
        roomName: "Master Bed",
        position: [cx, 0.35, cz],
        rotationY: 0,
        width: 1.8,
        depth: 2.1,
        height: 0.7,
        label: "King/Queen Master Bed with Upholstered Headboard & Side Tables",
      });
    } else if (
      (room.name === "Bed 2" || room.name === "Bed 3" || room.name === "Bed 4") &&
      !hasFixtureInRoom(room.name, "bed_double")
    ) {
      fixtures.push({
        id: `auto_bed_${room.id}`,
        type: "bed_double",
        roomName: room.name,
        position: [cx, 0.32, cz],
        rotationY: 0,
        width: 1.45,
        depth: 1.95,
        height: 0.62,
        label: `${room.name} Double Bed & Sliding Built-in Robe`,
      });
    } else if (room.name === "Living") {
      if (!hasFixtureInRoom("Living", "sofa_sectional")) {
        fixtures.push({
          id: `auto_sofa_${room.id}`,
          type: "sofa_sectional",
          roomName: "Living",
          position: [cx, 0.42, cz],
          rotationY: 0,
          width: Math.min(3.1, Math.max(2.2, rw * 0.52)),
          depth: Math.min(2.2, Math.max(1.6, rl * 0.45)),
          height: 0.85,
          label: "Modular L-Shape Living Lounge & Coffee Table",
        });
      }
      if (!hasFixtureInRoom("Living", "tv_console")) {
        fixtures.push({
          id: `auto_tv_${room.id}`,
          type: "tv_console",
          roomName: "Living",
          position: [cx, 1.0, rb.maxY - 0.32],
          rotationY: 0,
          width: 2.1,
          depth: 0.4,
          height: 1.2,
          label: "Floating Timber Entertainment Joinery & 75\" Wall TV",
        });
      }
    } else if (room.name === "Dining" && !hasFixtureInRoom("Dining", "dining_table")) {
      fixtures.push({
        id: `auto_dining_${room.id}`,
        type: "dining_table",
        roomName: "Dining",
        position: [cx, 0.38, cz],
        rotationY: 0,
        width: Math.min(2.2, Math.max(1.6, rw * 0.55)),
        depth: 1.0,
        height: 0.76,
        label: "8-Seater Solid Oak Dining Table & Chairs",
      });
    } else if (room.name === "Cinema" && !hasFixtureInRoom(room.customLabel || "Cinema", "cinema_seating")) {
      fixtures.push({
        id: `auto_cinema_${room.id}`,
        type: "cinema_seating",
        roomName: room.customLabel || "Cinema",
        position: [cx, 0.45, cz],
        rotationY: 0,
        width: Math.min(2.6, Math.max(1.8, rw * 0.6)),
        depth: 1.1,
        height: 0.88,
        label: "Home Theatre Recliner Lounge Suite",
      });
    }
  }

  const complete = ensureCompleteWallNetwork({
    ...design,
    walls: snappedWalls,
    openings: updatedOpenings,
    fixtures,
  });

  return complete;
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

  // Check if matches one of the 5 curated blueprints first
  if (clean.includes("juliana")) {
    return ensureOutdoorZonesOpenAndFurnished(DESIGNS_3D_REGISTRY["tiffany-22-custom-juliana"]);
  }
  if (clean.startsWith("tiffany")) {
    return ensureOutdoorZonesOpenAndFurnished(DESIGNS_3D_REGISTRY["tiffany-22"]);
  }
  if (clean.startsWith("jasper")) {
    return ensureOutdoorZonesOpenAndFurnished(DESIGNS_3D_REGISTRY["jasper-26"]);
  }
  if (clean.startsWith("amber")) {
    return ensureOutdoorZonesOpenAndFurnished(DESIGNS_3D_REGISTRY["amber-21"]);
  }
  if (clean.startsWith("azure")) {
    return ensureOutdoorZonesOpenAndFurnished(DESIGNS_3D_REGISTRY["azure-25"]);
  }

  // Look up exact specifications from full Hudson Homes catalogue
  const allCatalogue = getAllHudsonStandardDesigns();
  const matched =
    allCatalogue.find((d) => d.name.toLowerCase() === clean) ||
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

  // Scale our architectural template proportionally to `spec.widthM` and `spec.lengthM`
  // Choose template topology based on width & size
  const baseTemplate =
    spec.widthM >= 13.5
      ? DESIGNS_3D_REGISTRY["tiffany-22"]
      : spec.totalM2 >= 235
      ? DESIGNS_3D_REGISTRY["jasper-26"]
      : spec.totalM2 >= 215
      ? DESIGNS_3D_REGISTRY["azure-25"]
      : DESIGNS_3D_REGISTRY["amber-21"];

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
  }));

  const generated: BuildingDesign3D = {
    ...baseTemplate,
    id: spec.id,
    name: spec.name,
    variantName: `${spec.housingType} (${spec.totalM2} m²)`,
    housingType: spec.housingType === "Double Storey" ? "Double Storey" : "Single Storey",
    isCustomPlan: false,
    widthM: spec.widthM,
    lengthM: spec.lengthM,
    ceilingHeightM: spec.totalM2 >= 220 ? 2.59 : 2.44,
    schedule: {
      livingM2: spec.livingM2,
      garageM2: spec.garageM2,
      alfrescoM2: spec.alfrescoM2,
      porchM2: spec.porchM2,
      totalM2: spec.totalM2,
      bedrooms: spec.bedrooms,
      bathrooms: spec.bathrooms,
      cars: spec.cars,
    },
    rooms: scaledRooms,
    walls: scaledWalls,
    openings: scaledOpenings,
    fixtures: [], // Populated to exact scaled room bounds by ensureOutdoorZonesOpenAndFurnished
    boundary: {
      ...DEFAULT_BOUNDARY_CONFIG,
      lotWidthM: Math.max(14.0, Math.ceil(spec.widthM + 2.4)),
      lotLengthM: Math.max(28.0, Math.ceil(spec.lengthM + 8.0)),
    },
    materials: { ...DEFAULT_MATERIAL_CONFIG },
    fitout: { ...DEFAULT_FITOUT_CONFIG },
    customFacade: { ...DEFAULT_CUSTOM_FACADE_CONFIG },
    notes: [
      `Standard Hudson Homes ${spec.housingType} design: ${spec.name}`,
      `CAD Area Schedule: Total ${spec.totalM2} m² (Living ${spec.livingM2} m², Garage ${spec.garageM2} m², Alfresco ${spec.alfrescoM2} m², Porch ${spec.porchM2} m²)`,
      `Overall Footprint: ${spec.widthM}m Width × ${spec.lengthM}m Depth`,
      "Recognised internal 90mm stud partition walls, 250mm external brick veneer, open Porch & Alfresco with corner piers, and full interior joinery fitout",
    ],
  };

  return ensureOutdoorZonesOpenAndFurnished(generated);
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
  modified.variantName = `Modified ${analysis.baseDesignName}`;
  modified.id = `modified-${baseDesign.id}-${Date.now()}`;

  // 1. Apply Area Deltas to Schedule & Room Polygons
  for (const delta of analysis.areaDeltas || []) {
    if (!delta.accepted || Math.abs(delta.deltaM2) < 0.05) continue;
    if (delta.zoneKey === "livingM2" || delta.zoneKey === "groundLivingM2") {
      modified.schedule.livingM2 = delta.modifiedM2;
    } else if (delta.zoneKey === "garageM2") {
      modified.schedule.garageM2 = delta.modifiedM2;
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
    }
  }
  if (analysis.modifiedTotalM2 > 0) {
    modified.schedule.totalM2 = analysis.modifiedTotalM2;
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
    if (lower.includes("2740") || lower.includes("2700")) modified.ceilingHeightM = 2.74;
    if (lower.includes("2900")) modified.ceilingHeightM = 2.9;
  }
  modified.fitout = fitout;

  modified.notes = [
    `Uploaded Modified Plan: ${fileName || analysis.fileName || "Client Plan"}`,
    `Compared against Standard ${analysis.baseDesignName} (${analysis.standardTotalM2} m² → ${modified.schedule.totalM2} m²)`,
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
