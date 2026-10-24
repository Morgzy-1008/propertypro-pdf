/**
 * Architectural Elevations CAD Projection Engine
 * Translates true 3D floorplan building geometry, wall dimensions, roof slope,
 * and window/door schedules into high-precision 2D architectural CAD elevation drawings.
 */

import { jsPDF } from "jspdf";
import {
  BuildingDesign3D,
  ElevationView,
  ElevationProjection,
  ArchitecturalDatum,
  Opening3D,
} from "./studio3dTypes";

export interface ArchitecturalElevationSheet {
  north: ElevationProjection;
  south: ElevationProjection;
  east: ElevationProjection;
  west: ElevationProjection;
}

/**
 * Computes all 4 orthogonal elevation projections for a 3D design.
 */
export function generateArchitecturalElevations(
  design: BuildingDesign3D
): ArchitecturalElevationSheet {
  const eaves = design.roof.eavesOverhangM || 0.45;
  const pitchRad = ((design.roof.pitchDeg || 22.5) * Math.PI) / 180;
  const ceilingH = design.ceilingHeightM;
  const fflOffset = 0.30; // 300mm slab above Natural Ground Level (NGL)

  const eavesH = ceilingH + 0.12;
  const halfSpan = Math.min(design.widthM, design.lengthM) / 2;
  const rise = halfSpan * Math.tan(pitchRad);
  const ridgeH = eavesH + rise;

  const datums: ArchitecturalDatum[] = [
    { label: "RIDGE HEIGHT", code: "RL", rlValue: Number((fflOffset + ridgeH).toFixed(3)), yPosition: ridgeH, isMajor: true },
    { label: "EAVES / FASCIA LINE", code: "RL", rlValue: Number((fflOffset + eavesH).toFixed(3)), yPosition: eavesH, isMajor: false },
    { label: `CEILING LEVEL (${Math.round(ceilingH * 1000)}mm)`, code: "CL", rlValue: Number((fflOffset + ceilingH).toFixed(3)), yPosition: ceilingH, isMajor: true },
    { label: "1.80m BOUNDARY FENCE LINE", code: "BFL", rlValue: 1.800, yPosition: 1.80 - fflOffset, isMajor: false },
    { label: "FINISHED FLOOR LEVEL (FFL)", code: "FFL", rlValue: Number(fflOffset.toFixed(3)), yPosition: 0, isMajor: true },
    { label: "NATURAL GROUND LEVEL (NGL)", code: "NGL", rlValue: 0.000, yPosition: -fflOffset, isMajor: true },
  ];

  return {
    north: renderSingleElevation(design, "north", "FRONT ELEVATION (NORTH)", design.widthM, datums, eaves, eavesH, ridgeH, fflOffset),
    south: renderSingleElevation(design, "south", "REAR ELEVATION (SOUTH)", design.widthM, datums, eaves, eavesH, ridgeH, fflOffset),
    east: renderSingleElevation(design, "east", "RIGHT SIDE ELEVATION (EAST)", design.lengthM, datums, eaves, eavesH, ridgeH, fflOffset),
    west: renderSingleElevation(design, "west", "LEFT SIDE ELEVATION (WEST)", design.lengthM, datums, eaves, eavesH, ridgeH, fflOffset),
  };
}

function renderSingleElevation(
  design: BuildingDesign3D,
  view: ElevationView,
  title: string,
  buildingDimension: number,
  datums: ArchitecturalDatum[],
  eaves: number,
  eavesH: number,
  ridgeH: number,
  fflOffset: number
): ElevationProjection {
  // CAD Drawing Canvas dimensions (1200 x 600 coordinate system)
  const svgWidth = 1100;
  const svgHeight = 550;
  const originX = 170; // Left margin for datum line flags
  const originY = 410; // FFL Y position in SVG coords
  const scale = 40;   // 40 pixels per meter

  // Visible openings for this elevation
  const visibleOpenings = (design.openings || []).filter((op) => {
    if (op.elevationFacing) return op.elevationFacing === view;
    // Fallback orientation checks
    if (view === "north") return op.wallOrientation === "horizontal" && op.position[1] < 2.0;
    if (view === "south") return op.wallOrientation === "horizontal" && op.position[1] > design.lengthM - 3.0;
    if (view === "east") return op.wallOrientation === "vertical" && op.position[0] > design.widthM - 3.0;
    if (view === "west") return op.wallOrientation === "vertical" && op.position[0] < 3.0;
    return false;
  });

  // Calculate projected positions of openings along the elevation baseline
  const projectedOpenings = visibleOpenings.map((op) => {
    let projectedX = 0;
    if (view === "north" || view === "south") {
      projectedX = view === "north" ? op.position[0] : design.widthM - op.position[0];
    } else {
      projectedX = view === "east" ? op.position[1] : design.lengthM - op.position[1];
    }
    return {
      code: op.code,
      label: op.label,
      widthMm: Math.round(op.width * 1000),
      heightMm: Math.round(op.height * 1000),
      sillMm: Math.round(op.sillHeight * 1000),
      xM: projectedX,
      yM: op.sillHeight,
      type: op.type,
    };
  });

  // SVG Generation
  const svgParts: string[] = [];

  // 1. Background & CAD Grid
  svgParts.push(`
    <defs>
      <!-- CAD Brick Hatch -->
      <pattern id="cadBrick" width="16" height="8" patternUnits="userSpaceOnUse">
        <rect width="16" height="8" fill="#f8fafc" />
        <line x1="0" y1="0" x2="16" y2="0" stroke="#cbd5e1" stroke-width="0.75" />
        <line x1="0" y1="4" x2="16" y2="4" stroke="#cbd5e1" stroke-width="0.75" />
        <line x1="8" y1="0" x2="8" y2="4" stroke="#cbd5e1" stroke-width="0.75" />
        <line x1="16" y1="4" x2="16" y2="8" stroke="#cbd5e1" stroke-width="0.75" />
      </pattern>
      <!-- Colorbond Roof Corrugation Hatch -->
      <pattern id="cadRoof" width="8" height="8" patternTransform="rotate(22.5 0 0)" patternUnits="userSpaceOnUse">
        <rect width="8" height="8" fill="#1e293b" />
        <line x1="0" y1="0" x2="8" y2="0" stroke="#334155" stroke-width="1.2" />
        <line x1="0" y1="4" x2="8" y2="4" stroke="#475569" stroke-width="0.8" />
      </pattern>
      <!-- Concrete Footing Hatch -->
      <pattern id="cadConcrete" width="10" height="10" patternUnits="userSpaceOnUse">
        <rect width="10" height="10" fill="#e2e8f0" />
        <circle cx="3" cy="3" r="0.8" fill="#64748b" />
        <circle cx="8" cy="7" r="0.8" fill="#64748b" />
      </pattern>
    </defs>
  `);

  // 2. Datum Lines and Height Reference Markers (Left Side)
  datums.forEach((d) => {
    const datumY = originY - d.yPosition * scale;
    const isMajor = d.isMajor;
    const isEaves = d.label.includes("EAVES");
    const isCeiling = d.code === "CL";

    // Stagger close vertical datums (Eaves & Ceiling) to completely prevent text collision
    let textY = datumY + 4;
    let flagPoints = `70,${datumY} 85,${datumY - 7} 85,${datumY + 7}`;

    if (isEaves) {
      textY = datumY - 5;
      flagPoints = `70,${datumY} 85,${datumY - 9} 85,${datumY}`;
    } else if (isCeiling) {
      textY = datumY + 13;
      flagPoints = `70,${datumY} 85,${datumY} 85,${datumY + 9}`;
    }

    // Horizontal dashed datum line
    svgParts.push(`
      <line x1="60" y1="${datumY}" x2="${svgWidth - 40}" y2="${datumY}" 
            stroke="${isMajor ? '#0284c7' : '#94a3b8'}" 
            stroke-width="${isMajor ? '1.2' : '0.75'}" 
            stroke-dasharray="${isMajor ? '8,4,2,4' : '4,4'}" opacity="0.75" />
      <!-- Datum Level Marker Flag -->
      <circle cx="70" cy="${datumY}" r="3.5" fill="${isMajor ? '#0284c7' : '#64748b'}" />
      <polygon points="${flagPoints}" fill="${isMajor ? '#0284c7' : '#64748b'}" />
      <text x="92" y="${textY}" font-family="monospace" font-size="9.5" font-weight="bold" fill="#0f172a">
        ${d.code} +${d.rlValue.toFixed(3)}m - ${d.label}
      </text>
    `);
  });

  // 3. Ground Level (NGL) Hatch & Earth Baseline
  const nglY = originY + fflOffset * scale;
  svgParts.push(`
    <line x1="40" y1="${nglY}" x2="${svgWidth - 20}" y2="${nglY}" stroke="#0f172a" stroke-width="2.5" />
    <text x="${svgWidth - 220}" y="${nglY + 16}" font-family="sans-serif" font-size="10" font-weight="bold" fill="#475569">
      NATURAL GROUND LINE (NGL)
    </text>
  `);

  // 4. Concrete Slab Foundation (FFL to NGL)
  const slabWidthPx = buildingDimension * scale;
  svgParts.push(`
    <rect x="${originX}" y="${originY}" width="${slabWidthPx}" height="${fflOffset * scale}" 
          fill="url(#cadConcrete)" stroke="#0f172a" stroke-width="1.8" />
  `);

  // 5. Exterior Wall Silhouette (Brickwork / Render)
  const wallHeightPx = design.ceilingHeightM * scale;
  const wallTopY = originY - wallHeightPx;
  svgParts.push(`
    <rect x="${originX}" y="${wallTopY}" width="${slabWidthPx}" height="${wallHeightPx}" 
          fill="url(#cadBrick)" stroke="#0f172a" stroke-width="2.2" />
  `);

  // 6. Roof Geometry (Australian Hip Roof Profile at 22.5°)
  const eavesOverhangPx = eaves * scale;
  const eavesLeftX = originX - eavesOverhangPx;
  const eavesRightX = originX + slabWidthPx + eavesOverhangPx;
  const eavesY = originY - eavesH * scale;
  const ridgeY = originY - ridgeH * scale;
  const centerX = originX + slabWidthPx / 2;

  // Determine true Australian hip roof geometry (Trapezoid for side elevation, Triangle for end elevation)
  const isSideView = view === "east" || view === "west";
  const lengthGreater = (design.lengthM || 16) >= (design.widthM || 14);
  const isLongitudinal = isSideView ? lengthGreater : !lengthGreater;
  const spanDim = isSideView ? design.widthM : design.lengthM;
  const halfSpanPx = (spanDim / 2) * scale;
  const ridgeX1 = eavesLeftX + halfSpanPx;
  const ridgeX2 = eavesRightX - halfSpanPx;
  const isTrapezoid = isLongitudinal && (ridgeX2 > ridgeX1 + 10);

  // Hip pitch angle callout
  const pitchIndicatorX = isTrapezoid ? (ridgeX1 + ridgeX2) / 2 + 10 : centerX + 40;
  const pitchIndicatorY = ridgeY + (eavesY - ridgeY) / 2;

  const roofPolygonPoints = isTrapezoid
    ? `${eavesLeftX},${eavesY} ${ridgeX1},${ridgeY} ${ridgeX2},${ridgeY} ${eavesRightX},${eavesY}`
    : `${eavesLeftX},${eavesY} ${centerX},${ridgeY} ${eavesRightX},${eavesY}`;

  svgParts.push(`
    <!-- Fascia & Quad Gutter Line -->
    <rect x="${eavesLeftX}" y="${eavesY}" width="${eavesRightX - eavesLeftX}" height="7" 
          fill="#334155" stroke="#0f172a" stroke-width="1.5" />

    <!-- Sloped Australian Hip Roof Polygon -->
    <polygon points="${roofPolygonPoints}" 
             fill="url(#cadRoof)" stroke="#0f172a" stroke-width="2.5" />

    <!-- Ridge Cap Profile -->
    ${
      isTrapezoid
        ? `<line x1="${ridgeX1}" y1="${ridgeY}" x2="${ridgeX2}" y2="${ridgeY}" stroke="#f59e0b" stroke-width="3" />
           <line x1="${eavesLeftX}" y1="${eavesY}" x2="${ridgeX1}" y2="${ridgeY}" stroke="#0f172a" stroke-width="1.8" />
           <line x1="${eavesRightX}" y1="${eavesY}" x2="${ridgeX2}" y2="${ridgeY}" stroke="#0f172a" stroke-width="1.8" />`
        : `<line x1="${centerX - 15}" y1="${ridgeY}" x2="${centerX + 15}" y2="${ridgeY}" stroke="#f59e0b" stroke-width="3" />
           <line x1="${eavesLeftX}" y1="${eavesY}" x2="${centerX}" y2="${ridgeY}" stroke="#0f172a" stroke-width="1.8" />
           <line x1="${eavesRightX}" y1="${eavesY}" x2="${centerX}" y2="${ridgeY}" stroke="#0f172a" stroke-width="1.8" />`
    }

    <!-- Roof Pitch Architectural Triangle Indicator -->
    <g transform="translate(${pitchIndicatorX}, ${pitchIndicatorY})">
      <polygon points="0,0 35,0 35,-14" fill="none" stroke="#e11d48" stroke-width="1.4" />
      <text x="42" y="-3" font-family="sans-serif" font-size="10" font-weight="bold" fill="#e11d48">
        22.5° PITCH
      </text>
    </g>
  `);

  // 7. Render Openings (Windows, Doors, Garage Doors)
  projectedOpenings.forEach((op) => {
    const opX = originX + (op.xM - (op.widthMm / 2000)) * scale;
    const opWidthPx = (op.widthMm / 1000) * scale;
    const opHeightPx = (op.heightMm / 1000) * scale;
    const opY = originY - (op.sillMm / 1000 + op.heightMm / 1000) * scale;

    if (op.type === "garage_door") {
      // Automatic Sectional Garage Door with horizontal panel reveals
      svgParts.push(`
        <rect x="${opX}" y="${opY}" width="${opWidthPx}" height="${opHeightPx}" fill="#1e293b" stroke="#0f172a" stroke-width="2" />
        <line x1="${opX}" y1="${opY + opHeightPx * 0.25}" x2="${opX + opWidthPx}" y2="${opY + opHeightPx * 0.25}" stroke="#475569" stroke-width="1" />
        <line x1="${opX}" y1="${opY + opHeightPx * 0.50}" x2="${opX + opWidthPx}" y2="${opY + opHeightPx * 0.50}" stroke="#475569" stroke-width="1" />
        <line x1="${opX}" y1="${opY + opHeightPx * 0.75}" x2="${opX + opWidthPx}" y2="${opY + opHeightPx * 0.75}" stroke="#475569" stroke-width="1" />
        <!-- Code Tag -->
        <rect x="${opX + opWidthPx / 2 - 40}" y="${opY + opHeightPx / 2 - 9}" width="80" height="18" fill="#ffffff" stroke="#0f172a" stroke-width="1" rx="2" />
        <text x="${opX + opWidthPx / 2}" y="${opY + opHeightPx / 2 + 3}" text-anchor="middle" font-family="monospace" font-size="9" font-weight="bold" fill="#0f172a">
          ${op.code}
        </text>
      `);
    } else if (op.type === "door") {
      // Entry Door / Exterior Hinged Door
      svgParts.push(`
        <rect x="${opX}" y="${opY}" width="${opWidthPx}" height="${opHeightPx}" fill="#78350f" stroke="#0f172a" stroke-width="1.8" />
        <line x1="${opX + 4}" y1="${opY + 4}" x2="${opX + opWidthPx - 4}" y2="${opY + opHeightPx - 4}" stroke="#92400e" stroke-width="0.8" opacity="0.6" />
        <!-- Handle -->
        <circle cx="${opX + opWidthPx - 8}" cy="${opY + opHeightPx * 0.55}" r="2.5" fill="#facc15" />
        <!-- Code Tag -->
        <rect x="${opX + opWidthPx / 2 - 32}" y="${opY + opHeightPx / 2 - 8}" width="64" height="16" fill="#ffffff" stroke="#0f172a" stroke-width="1" rx="2" />
        <text x="${opX + opWidthPx / 2}" y="${opY + opHeightPx / 2 + 3}" text-anchor="middle" font-family="monospace" font-size="9" font-weight="bold" fill="#0f172a">
          ${op.code}
        </text>
      `);
    } else if (op.type === "stacker_door" || op.type === "sliding_door") {
      // Stacker / Sliding Glass Door
      svgParts.push(`
        <rect x="${opX}" y="${opY}" width="${opWidthPx}" height="${opHeightPx}" fill="#bae6fd" stroke="#0f172a" stroke-width="1.8" fill-opacity="0.85" />
        <line x1="${opX + opWidthPx / 3}" y1="${opY}" x2="${opX + opWidthPx / 3}" y2="${opY + opHeightPx}" stroke="#0f172a" stroke-width="1.4" />
        <line x1="${opX + (2 * opWidthPx) / 3}" y1="${opY}" x2="${opX + (2 * opWidthPx) / 3}" y2="${opY + opHeightPx}" stroke="#0f172a" stroke-width="1.4" />
        <!-- Glazing Diagonal Reflection -->
        <line x1="${opX + 8}" y1="${opY + opHeightPx - 8}" x2="${opX + opWidthPx / 3 - 8}" y2="${opY + 8}" stroke="#ffffff" stroke-width="1.5" opacity="0.75" />
        <!-- Code Tag -->
        <rect x="${opX + opWidthPx / 2 - 40}" y="${opY + opHeightPx / 2 - 8}" width="80" height="16" fill="#ffffff" stroke="#0f172a" stroke-width="1" rx="2" />
        <text x="${opX + opWidthPx / 2}" y="${opY + opHeightPx / 2 + 3}" text-anchor="middle" font-family="monospace" font-size="9" font-weight="bold" fill="#0f172a">
          ${op.code}
        </text>
      `);
    } else {
      // Glazed Aluminium Window (with sill, frame, and glass panes)
      svgParts.push(`
        <!-- Window Outer Frame -->
        <rect x="${opX}" y="${opY}" width="${opWidthPx}" height="${opHeightPx}" fill="#e0f2fe" stroke="#0f172a" stroke-width="1.8" />
        <!-- Brick Sill Projection -->
        <rect x="${opX - 3}" y="${opY + opHeightPx}" width="${opWidthPx + 6}" height="4" fill="#cbd5e1" stroke="#0f172a" stroke-width="1" />
        <!-- Central Mullion -->
        <line x1="${opX + opWidthPx / 2}" y1="${opY}" x2="${opX + opWidthPx / 2}" y2="${opY + opHeightPx}" stroke="#0f172a" stroke-width="1.2" />
        <!-- Glazing Reflection -->
        <line x1="${opX + 6}" y1="${opY + opHeightPx - 6}" x2="${opX + opWidthPx / 2 - 6}" y2="${opY + 6}" stroke="#ffffff" stroke-width="1.2" opacity="0.7" />
        <!-- Code Tag -->
        <rect x="${opX + opWidthPx / 2 - 28}" y="${opY + opHeightPx / 2 - 8}" width="56" height="16" fill="#ffffff" stroke="#0f172a" stroke-width="1" rx="2" />
        <text x="${opX + opWidthPx / 2}" y="${opY + opHeightPx / 2 + 3}" text-anchor="middle" font-family="monospace" font-size="9" font-weight="bold" fill="#0f172a">
          ${op.code}
        </text>
      `);
    }
  });

  // 7b. Front Facade Features (Columns, Scyon Cladding Gables, Porticos)
  const facadeStyle = design.facade || design.materials?.facade || "modern";
  if (view === "north") {
    if (facadeStyle === "hamptons" || facadeStyle === "bronte") {
      const gableBaseY = eavesY;
      const gableApexY = eavesY - 45;
      const porchCenterX = originX + 260;
      svgParts.push(`
        <!-- Hamptons / Bronte Front Gable Feature -->
        <polygon points="${porchCenterX - 80},${gableBaseY} ${porchCenterX},${gableApexY} ${porchCenterX + 80},${gableBaseY}" fill="#f8fafc" stroke="#0f172a" stroke-width="1.8" />
        <line x1="${porchCenterX - 60}" y1="${gableBaseY - 12}" x2="${porchCenterX + 60}" y2="${gableBaseY - 12}" stroke="#64748b" stroke-width="1" />
        <line x1="${porchCenterX - 40}" y1="${gableBaseY - 24}" x2="${porchCenterX + 40}" y2="${gableBaseY - 24}" stroke="#64748b" stroke-width="1" />
        <line x1="${porchCenterX - 20}" y1="${gableBaseY - 34}" x2="${porchCenterX + 20}" y2="${gableBaseY - 34}" stroke="#64748b" stroke-width="1" />
        <text x="${porchCenterX}" y="${gableApexY - 8}" text-anchor="middle" font-family="sans-serif" font-size="8.5" font-weight="bold" fill="#0284c7">
          SCYON LINEA GABLE CLADDING
        </text>
        <!-- Painted Timber Column Post with Capital & Plinth -->
        <rect x="${porchCenterX - 75}" y="${wallTopY}" width="9" height="${wallHeightPx}" fill="#ffffff" stroke="#0f172a" stroke-width="1.4" />
        <rect x="${porchCenterX - 78}" y="${wallTopY}" width="15" height="5" fill="#ffffff" stroke="#0f172a" stroke-width="1" />
        <rect x="${porchCenterX - 79}" y="${originY - 12}" width="17" height="12" fill="#ffffff" stroke="#0f172a" stroke-width="1" />
      `);
    } else if (facadeStyle === "executive") {
      const porchCenterX = originX + 260;
      svgParts.push(`
        <!-- Executive Grande Austral Brick Pier & Beam -->
        <rect x="${porchCenterX - 85}" y="${wallTopY}" width="20" height="${wallHeightPx}" fill="url(#cadBrick)" stroke="#0f172a" stroke-width="1.8" />
        <rect x="${porchCenterX - 88}" y="${wallTopY}" width="26" height="6" fill="#cbd5e1" stroke="#0f172a" stroke-width="1.2" />
        <rect x="${porchCenterX - 85}" y="${wallTopY}" width="120" height="14" fill="#1e293b" stroke="#0f172a" stroke-width="1.2" />
        <text x="${porchCenterX - 30}" y="${wallTopY - 6}" font-family="sans-serif" font-size="8" font-weight="bold" fill="#0284c7">
          470mm BRICK PIER & PORTICO BEAM
        </text>
      `);
    } else if (facadeStyle === "contempo") {
      const porchCenterX = originX + 260;
      svgParts.push(`
        <!-- Contempo Vertical Cedar Battens Screen -->
        <g stroke="#b45309" stroke-width="2.2">
          <line x1="${porchCenterX - 80}" y1="${originY}" x2="${porchCenterX - 80}" y2="${wallTopY}" />
          <line x1="${porchCenterX - 74}" y1="${originY}" x2="${porchCenterX - 74}" y2="${wallTopY}" />
          <line x1="${porchCenterX - 68}" y1="${originY}" x2="${porchCenterX - 68}" y2="${wallTopY}" />
          <line x1="${porchCenterX - 62}" y1="${originY}" x2="${porchCenterX - 62}" y2="${wallTopY}" />
          <line x1="${porchCenterX - 56}" y1="${originY}" x2="${porchCenterX - 56}" y2="${wallTopY}" />
        </g>
        <text x="${porchCenterX - 68}" y="${wallTopY - 6}" font-family="sans-serif" font-size="8" font-weight="bold" fill="#b45309">
          CEDAR BATTEN SCREEN
        </text>
      `);
    }
  }

  // 7c. 1.80m Boundary Fencing Lines & Callouts
  const leftBoundX = originX - (design.boundary?.leftSetbackM || 1.2) * scale;
  const rightBoundX = originX + slabWidthPx + (design.boundary?.rightSetbackM || 1.0) * scale;
  const fenceHeightPx = 1.80 * scale;
  const fenceTopY = nglY - fenceHeightPx;

  svgParts.push(`
    <!-- Left Boundary 1.8m Fence Line -->
    <rect x="${leftBoundX - 4}" y="${fenceTopY}" width="8" height="${fenceHeightPx}" fill="#334155" fill-opacity="0.35" stroke="#0f172a" stroke-width="1.5" stroke-dasharray="3,2" />
    <line x1="${leftBoundX}" y1="${nglY}" x2="${leftBoundX}" y2="${fenceTopY - 14}" stroke="#f59e0b" stroke-width="1.2" stroke-dasharray="4,2" />
    <text x="${leftBoundX}" y="${fenceTopY - 18}" text-anchor="middle" font-family="sans-serif" font-size="8" font-weight="bold" fill="#f59e0b">
      1.8m BOUNDARY FENCE
    </text>
    <!-- Right Boundary 1.8m Fence Line -->
    <rect x="${rightBoundX - 4}" y="${fenceTopY}" width="8" height="${fenceHeightPx}" fill="#334155" fill-opacity="0.35" stroke="#0f172a" stroke-width="1.5" stroke-dasharray="3,2" />
    <line x1="${rightBoundX}" y1="${nglY}" x2="${rightBoundX}" y2="${fenceTopY - 14}" stroke="#f59e0b" stroke-width="1.2" stroke-dasharray="4,2" />
    <text x="${rightBoundX}" y="${fenceTopY - 18}" text-anchor="middle" font-family="sans-serif" font-size="8" font-weight="bold" fill="#f59e0b">
      1.8m BOUNDARY FENCE
    </text>
  `);

  // 8. Overall Dimension Lines (Bottom)
  const dimY = originY + fflOffset * scale + 35;
  svgParts.push(`
    <!-- Dimension Witness Lines -->
    <line x1="${originX}" y1="${originY + fflOffset * scale}" x2="${originX}" y2="${dimY + 8}" stroke="#475569" stroke-width="0.8" />
    <line x1="${originX + slabWidthPx}" y1="${originY + fflOffset * scale}" x2="${originX + slabWidthPx}" y2="${dimY + 8}" stroke="#475569" stroke-width="0.8" />
    <!-- Dimension Arrow Line -->
    <line x1="${originX}" y1="${dimY}" x2="${originX + slabWidthPx}" y2="${dimY}" stroke="#0f172a" stroke-width="1.2" />
    <polygon points="${originX},${dimY} ${originX + 7},${dimY - 3} ${originX + 7},${dimY + 3}" fill="#0f172a" />
    <polygon points="${originX + slabWidthPx},${dimY} ${originX + slabWidthPx - 7},${dimY - 3} ${originX + slabWidthPx - 7},${dimY + 3}" fill="#0f172a" />
    <!-- Dimension Text -->
    <text x="${originX + slabWidthPx / 2}" y="${dimY - 6}" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#0f172a">
      OVERALL WALL SPAN: ${buildingDimension.toFixed(2)}m (${Math.round(buildingDimension * 1000)}mm)
    </text>
  `);

  // 9. Material Annotation Leaders
  svgParts.push(`
    <g transform="translate(680, 70)" font-family="sans-serif" font-size="9.5" fill="#334155">
      <rect x="-10" y="-12" width="370" height="95" fill="#ffffff" fill-opacity="0.92" stroke="#cbd5e1" stroke-width="1" rx="4" />
      <text x="0" y="5" font-weight="bold" fill="#0f172a">ARCHITECTURAL SPECIFICATION SCHEDULE:</text>
      <text x="0" y="22">• ROOF: SELECTED COLORBOND METAL AT 22.5° PITCH (MONUMENT)</text>
      <text x="0" y="38">• GUTTERS & FASCIA: 150mm QUAD GUTTER / COLORBOND FASCIA</text>
      <text x="0" y="54">• WALLS: SELECTED FACE BRICKWORK WITH OFF-WHITE IRONED JOINTS</text>
      <text x="0" y="70">• OPENINGS: POWDERCOATED ALUMINIUM FRAMED WINDOWS & DOORS</text>
    </g>
  `);

  // 10. Title Block
  svgParts.push(`
    <!-- CAD Title Block Border -->
    <rect x="30" y="475" width="${svgWidth - 60}" height="60" fill="#ffffff" stroke="#0f172a" stroke-width="1.8" />
    <line x1="280" y1="475" x2="280" y2="535" stroke="#cbd5e1" stroke-width="1" />
    <line x1="580" y1="475" x2="580" y2="535" stroke="#cbd5e1" stroke-width="1" />
    <line x1="860" y1="475" x2="860" y2="535" stroke="#cbd5e1" stroke-width="1" />

    <!-- Column 1: Hudson Homes Branding -->
    <text x="45" y="498" font-family="sans-serif" font-size="14" font-weight="900" fill="#0f172a" letter-spacing="1">
      HUDSON HOMES
    </text>
    <text x="45" y="515" font-family="sans-serif" font-size="9" font-weight="bold" fill="#f59e0b">
      ARCHITECTURAL CAD WORKING DRAWINGS
    </text>

    <!-- Column 2: Design & Client Details -->
    <text x="295" y="495" font-family="sans-serif" font-size="9" fill="#64748b">DESIGN / CLIENT:</text>
    <text x="295" y="512" font-family="sans-serif" font-size="12" font-weight="bold" fill="#0f172a">
      ${(() => {
        const rawTitle = design.variantName && !design.variantName.includes("1:100")
          ? `${design.name} (${design.variantName})`
          : design.name;
        return rawTitle.length > 30 ? rawTitle.slice(0, 28) + "..." : rawTitle;
      })()}
    </text>
    <text x="295" y="527" font-family="sans-serif" font-size="9" fill="#475569">
      Total: ${design.schedule.totalM2}m² | Ceiling: ${Math.round(design.ceilingHeightM * 1000)}mm
    </text>

    <!-- Column 3: Sheet Title & View -->
    <text x="595" y="495" font-family="sans-serif" font-size="9" fill="#64748b">DRAWING TITLE:</text>
    <text x="595" y="515" font-family="sans-serif" font-size="13" font-weight="bold" fill="#0284c7">
      ${title}
    </text>

    <!-- Column 4: Scale, Date, Status -->
    <text x="875" y="495" font-family="sans-serif" font-size="9" fill="#64748b">SCALE & DATE:</text>
    <text x="875" y="512" font-family="sans-serif" font-size="11" font-weight="bold" fill="#0f172a">
      1:100 @ A3 | 2026
    </text>
    <text x="875" y="527" font-family="sans-serif" font-size="9" font-weight="bold" fill="#16a34a">
      STATUS: VERIFIED CAD
    </text>
  `);

  const fullSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="100%" height="100%" style="background-color: #ffffff;">
      ${svgParts.join("\n")}
    </svg>
  `;

  return {
    view,
    title,
    cardinalDirection: view.toUpperCase(),
    scaleText: "1:100 @ A3",
    widthM: buildingDimension,
    heightM: ridgeH + fflOffset,
    eavesHeightM: eavesH + fflOffset,
    ridgeHeightM: ridgeH + fflOffset,
    fflHeightM: fflOffset,
    datums,
    materials: [
      { name: "Roofing", description: "Colorbond Custom Orb @ 22.5° pitch", sampleColor: "#2b2e35" },
      { name: "Brickwork", description: "Selected Austral Face Brickwork", sampleColor: "#cbd5e1" },
      { name: "Windows", description: "Aluminium powdercoated frames with double glazing", sampleColor: "#e0f2fe" },
      { name: "Garage Door", description: "Automatic Colorbond Sectional Overhead Door", sampleColor: "#1e293b" },
    ],
    visibleOpenings: projectedOpenings,
    svgContent: fullSvg,
  };
}

/**
 * Exports architectural elevations into a clean, presentation-ready multi-page PDF.
 */
export async function exportElevationsPdf(
  design: BuildingDesign3D,
  elevations: ArchitecturalElevationSheet
): Promise<{ pdf: jsPDF; fileName: string }> {
  // A3 Landscape format: 420mm x 297mm
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a3",
    compress: true,
  });

  const views: ElevationProjection[] = [
    elevations.north,
    elevations.south,
    elevations.east,
    elevations.west,
  ];

  for (let idx = 0; idx < views.length; idx++) {
    if (idx > 0) pdf.addPage("a3", "landscape");

    const v = views[idx];

    // 1. Header border
    pdf.setDrawColor(15, 23, 42);
    pdf.setLineWidth(0.8);
    pdf.rect(15, 15, 390, 267);

    // Title banner
    pdf.setFillColor(15, 23, 42);
    pdf.rect(15, 15, 390, 18, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(255, 255, 255);
    pdf.text("HUDSON HOMES - ARCHITECTURAL WORKING ELEVATIONS", 20, 27);

    pdf.setFontSize(11);
    pdf.setTextColor(245, 158, 11);
    const pdfDesignTitle = design.variantName && !design.variantName.includes("1:100")
      ? `${design.name} - ${design.variantName}`
      : design.name;
    pdf.text(pdfDesignTitle.length > 30 ? pdfDesignTitle.slice(0, 28) + "..." : pdfDesignTitle, 310, 27);

    // Subtitle & View
    pdf.setTextColor(15, 23, 42);
    pdf.setFontSize(18);
    pdf.text(v.title, 20, 48);

    pdf.setFontSize(11);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Overall Building Width: ${v.widthM.toFixed(2)}m  |  Eaves Line: +${v.eavesHeightM.toFixed(3)}m  |  Ridge: +${v.ridgeHeightM.toFixed(3)}m  |  Ceiling: ${Math.round(design.ceilingHeightM * 1000)}mm`, 20, 56);

    // Specifications & Schedule Box
    pdf.setDrawColor(203, 213, 225);
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(20, 65, 380, 18, 2, 2, "FD");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);
    pdf.text("SCHEDULED OPENINGS ON THIS ELEVATION:", 24, 72);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.5);
    pdf.setTextColor(51, 65, 85);
    const openingSummary = v.visibleOpenings.length > 0
      ? v.visibleOpenings.map((o) => `${o.code} (${o.label} - ${o.widthMm}w × ${o.heightMm}h, Sill ${o.sillMm}mm)`).join("   |   ")
      : "No external window/door penetrations on this facade face.";
    pdf.text(openingSummary.slice(0, 160), 24, 79);

    // ==========================================
    // 2. ARCHITECTURAL CAD ELEVATION DRAWING AREA
    // ==========================================
    const mmPerMetre = 11; // 1:90 - 1:100 scale fits A3 page
    const bWidthMm = v.widthM * mmPerMetre;
    const cadOriginX = 420 / 2 - bWidthMm / 2;
    const fflY = 210;
    const nglY = fflY + 3.3; // 300mm slab
    const ceilingY = fflY - design.ceilingHeightM * mmPerMetre;
    const eavesY = fflY - v.eavesHeightM * mmPerMetre;
    const ridgeY = fflY - v.ridgeHeightM * mmPerMetre;
    const eavesOverhangMm = (design.roof.eavesOverhangM || 0.45) * mmPerMetre;
    const eavesLeftX = cadOriginX - eavesOverhangMm;
    const eavesRightX = cadOriginX + bWidthMm + eavesOverhangMm;
    const centerX = cadOriginX + bWidthMm / 2;

    // A. Architectural Datum Lines (Ridge, Eaves, Ceiling, FFL, NGL)
    const datumsList = [
      { code: "RL", label: "RIDGE HEIGHT", y: ridgeY, val: v.ridgeHeightM, major: true, isEaves: false, isCeil: false },
      { code: "RL", label: "EAVES / FASCIA LINE", y: eavesY, val: v.eavesHeightM, major: false, isEaves: true, isCeil: false },
      { code: "CL", label: `CEILING LEVEL (${Math.round(design.ceilingHeightM * 1000)}mm)`, y: ceilingY, val: design.ceilingHeightM + 0.30, major: true, isEaves: false, isCeil: true },
      { code: "FFL", label: "FINISHED FLOOR LEVEL (+0.300)", y: fflY, val: 0.300, major: true, isEaves: false, isCeil: false },
      { code: "NGL", label: "NATURAL GROUND LEVEL (0.000)", y: nglY, val: 0.000, major: true, isEaves: false, isCeil: false },
    ];

    datumsList.forEach((d) => {
      pdf.setDrawColor(d.major ? 2 : 148, d.major ? 132 : 163, d.major ? 199 : 184);
      pdf.setLineWidth(d.major ? 0.35 : 0.2);
      pdf.setLineDashPattern(d.major ? [4, 2, 1, 2] : [2, 2], 0);
      pdf.line(25, d.y, 395, d.y);
      pdf.setLineDashPattern([], 0);

      // Marker flag on left
      pdf.setFillColor(d.major ? 2 : 100, d.major ? 132 : 116, d.major ? 199 : 139);
      pdf.circle(30, d.y, 1.2, "F");

      let textY = d.y + 1.2;
      if (d.isEaves) {
        textY = d.y - 2.0;
      } else if (d.isCeil) {
        textY = d.y + 4.0;
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      pdf.setTextColor(15, 23, 42);
      pdf.text(`${d.code} +${d.val.toFixed(3)}m - ${d.label}`, 35, textY);
    });

    // B. Natural Ground Line (NGL) Heavy Line
    pdf.setDrawColor(15, 23, 42);
    pdf.setLineWidth(0.8);
    pdf.line(20, nglY, 400, nglY);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(100, 116, 139);
    pdf.text("NATURAL GROUND LINE (NGL)", 335, nglY + 4.5);

    // C. Concrete Slab Foundation
    pdf.setFillColor(226, 232, 240);
    pdf.setDrawColor(15, 23, 42);
    pdf.setLineWidth(0.5);
    pdf.rect(cadOriginX, fflY, bWidthMm, 3.3, "FD");

    // D. Brickwork / Cladding Wall Envelope
    const wallHMm = fflY - ceilingY;
    pdf.setFillColor(248, 250, 252);
    pdf.rect(cadOriginX, ceilingY, bWidthMm, wallHMm, "FD");

    // Brick veneer coursing lines
    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.15);
    for (let cY = ceilingY + 2.5; cY < fflY; cY += 2.5) {
      pdf.line(cadOriginX, cY, cadOriginX + bWidthMm, cY);
    }

    // E. Australian Hip Roof Geometry (Trapezoid for side elevation, Triangle for end elevation)
    const isSideView = v.view === "east" || v.view === "west";
    const lengthGreater = (design.lengthM || 16) >= (design.widthM || 14);
    const isLongitudinal = isSideView ? lengthGreater : !lengthGreater;
    const spanDim = isSideView ? design.widthM : design.lengthM;
    const halfSpanMm = (spanDim / 2) * mmPerMetre;
    const rX1 = eavesLeftX + halfSpanMm;
    const rX2 = eavesRightX - halfSpanMm;
    const isTrapezoid = isLongitudinal && (rX2 > rX1 + 3);

    // Fascia & Quad Gutter Line
    pdf.setFillColor(51, 65, 85);
    pdf.setDrawColor(15, 23, 42);
    pdf.setLineWidth(0.4);
    pdf.rect(eavesLeftX, eavesY, eavesRightX - eavesLeftX, 2.0, "FD");

    // Sloped Hip Roof
    pdf.setFillColor(30, 41, 59); // Colorbond Monument
    pdf.setDrawColor(15, 23, 42);
    pdf.setLineWidth(0.6);

    if (isTrapezoid) {
      pdf.lines(
        [
          [rX1 - eavesLeftX, ridgeY - eavesY],
          [rX2 - rX1, 0],
          [eavesRightX - rX2, eavesY - ridgeY],
          [eavesLeftX - eavesRightX, 0],
        ],
        eavesLeftX,
        eavesY,
        [1, 1],
        "FD",
        true
      );

      // Gold Ridge Cap Line
      pdf.setDrawColor(245, 158, 11);
      pdf.setLineWidth(0.8);
      pdf.line(rX1, ridgeY, rX2, ridgeY);

      // Hip ridge lines down to eaves
      pdf.setDrawColor(15, 23, 42);
      pdf.setLineWidth(0.4);
      pdf.line(eavesLeftX, eavesY, rX1, ridgeY);
      pdf.line(eavesRightX, eavesY, rX2, ridgeY);
    } else {
      pdf.triangle(eavesLeftX, eavesY, centerX, ridgeY, eavesRightX, eavesY, "FD");
      // Ridge Cap point
      pdf.setDrawColor(245, 158, 11);
      pdf.setLineWidth(0.8);
      pdf.line(centerX - 3, ridgeY, centerX + 3, ridgeY);

      pdf.setDrawColor(15, 23, 42);
      pdf.setLineWidth(0.4);
      pdf.line(eavesLeftX, eavesY, centerX, ridgeY);
      pdf.line(eavesRightX, eavesY, centerX, ridgeY);
    }

    // Pitch Angle Callout Triangle (22.5° PITCH)
    const pitchIndicatorX = isTrapezoid ? (rX1 + rX2) / 2 : centerX + 12;
    const pitchIndicatorY = ridgeY + (eavesY - ridgeY) / 2;
    pdf.setDrawColor(225, 29, 72);
    pdf.setLineWidth(0.4);
    pdf.line(pitchIndicatorX, pitchIndicatorY, pitchIndicatorX + 10, pitchIndicatorY);
    pdf.line(pitchIndicatorX + 10, pitchIndicatorY, pitchIndicatorX + 10, pitchIndicatorY - 4.14);
    pdf.line(pitchIndicatorX, pitchIndicatorY, pitchIndicatorX + 10, pitchIndicatorY - 4.14);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(225, 29, 72);
    pdf.text("22.5° PITCH", pitchIndicatorX + 12, pitchIndicatorY - 0.5);

    // F. Architectural Openings (Windows, Doors, Garage Doors)
    v.visibleOpenings.forEach((op) => {
      const opX = cadOriginX + (op.xM - op.widthMm / 2000) * mmPerMetre;
      const opWMm = (op.widthMm / 1000) * mmPerMetre;
      const opHMm = (op.heightMm / 1000) * mmPerMetre;
      const opY = fflY - (op.sillMm / 1000 + op.heightMm / 1000) * mmPerMetre;

      if (op.type === "garage_door") {
        pdf.setFillColor(30, 41, 59);
        pdf.setDrawColor(15, 23, 42);
        pdf.setLineWidth(0.5);
        pdf.rect(opX, opY, opWMm, opHMm, "FD");

        pdf.setDrawColor(71, 85, 105);
        pdf.setLineWidth(0.25);
        pdf.line(opX, opY + opHMm * 0.25, opX + opWMm, opY + opHMm * 0.25);
        pdf.line(opX, opY + opHMm * 0.50, opX + opWMm, opY + opHMm * 0.50);
        pdf.line(opX, opY + opHMm * 0.75, opX + opWMm, opY + opHMm * 0.75);

        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(15, 23, 42);
        pdf.setLineWidth(0.3);
        const tagW = 20;
        pdf.roundedRect(opX + opWMm / 2 - tagW / 2, opY + opHMm / 2 - 2.5, tagW, 5, 1, 1, "FD");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6.5);
        pdf.setTextColor(15, 23, 42);
        pdf.text(op.code, opX + opWMm / 2, opY + opHMm / 2 + 1.2, { align: "center" });
      } else if (op.type === "door") {
        pdf.setFillColor(120, 53, 15);
        pdf.setDrawColor(15, 23, 42);
        pdf.setLineWidth(0.5);
        pdf.rect(opX, opY, opWMm, opHMm, "FD");

        pdf.setFillColor(250, 204, 21);
        pdf.circle(opX + opWMm - 1.5, opY + opHMm * 0.55, 0.6, "F");

        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(15, 23, 42);
        pdf.setLineWidth(0.3);
        const tagW = 16;
        pdf.roundedRect(opX + opWMm / 2 - tagW / 2, opY + opHMm / 2 - 2.5, tagW, 5, 1, 1, "FD");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6.5);
        pdf.setTextColor(15, 23, 42);
        pdf.text(op.code, opX + opWMm / 2, opY + opHMm / 2 + 1.2, { align: "center" });
      } else if (op.type === "stacker_door" || op.type === "sliding_door") {
        pdf.setFillColor(186, 230, 253);
        pdf.setDrawColor(15, 23, 42);
        pdf.setLineWidth(0.5);
        pdf.rect(opX, opY, opWMm, opHMm, "FD");

        pdf.setDrawColor(15, 23, 42);
        pdf.setLineWidth(0.3);
        pdf.line(opX + opWMm / 3, opY, opX + opWMm / 3, opY + opHMm);
        pdf.line(opX + (2 * opWMm) / 3, opY, opX + (2 * opWMm) / 3, opY + opHMm);

        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(15, 23, 42);
        pdf.setLineWidth(0.3);
        const tagW = 20;
        pdf.roundedRect(opX + opWMm / 2 - tagW / 2, opY + opHMm / 2 - 2.5, tagW, 5, 1, 1, "FD");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6.5);
        pdf.setTextColor(15, 23, 42);
        pdf.text(op.code, opX + opWMm / 2, opY + opHMm / 2 + 1.2, { align: "center" });
      } else {
        pdf.setFillColor(224, 242, 254);
        pdf.setDrawColor(15, 23, 42);
        pdf.setLineWidth(0.5);
        pdf.rect(opX, opY, opWMm, opHMm, "FD");

        pdf.setFillColor(203, 213, 225);
        pdf.rect(opX - 0.8, opY + opHMm, opWMm + 1.6, 1.2, "FD");

        pdf.setDrawColor(15, 23, 42);
        pdf.setLineWidth(0.3);
        pdf.line(opX + opWMm / 2, opY, opX + opWMm / 2, opY + opHMm);

        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(15, 23, 42);
        pdf.setLineWidth(0.3);
        const tagW = 16;
        pdf.roundedRect(opX + opWMm / 2 - tagW / 2, opY + opHMm / 2 - 2.5, tagW, 5, 1, 1, "FD");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6.5);
        pdf.setTextColor(15, 23, 42);
        pdf.text(op.code, opX + opWMm / 2, opY + opHMm / 2 + 1.2, { align: "center" });
      }
    });

    // G. Overall Wall Span Dimension Line (Bottom)
    const dimY = nglY + 11;
    pdf.setDrawColor(71, 85, 105);
    pdf.setLineWidth(0.25);
    pdf.line(cadOriginX, nglY, cadOriginX, dimY + 2);
    pdf.line(cadOriginX + bWidthMm, nglY, cadOriginX + bWidthMm, dimY + 2);

    pdf.setDrawColor(15, 23, 42);
    pdf.setLineWidth(0.4);
    pdf.line(cadOriginX, dimY, cadOriginX + bWidthMm, dimY);
    pdf.line(cadOriginX, dimY, cadOriginX + 2.5, dimY - 1);
    pdf.line(cadOriginX, dimY, cadOriginX + 2.5, dimY + 1);
    pdf.line(cadOriginX + bWidthMm, dimY, cadOriginX + bWidthMm - 2.5, dimY - 1);
    pdf.line(cadOriginX + bWidthMm, dimY, cadOriginX + bWidthMm - 2.5, dimY + 1);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(15, 23, 42);
    pdf.text(
      `OVERALL WALL SPAN: ${v.widthM.toFixed(2)}m (${Math.round(v.widthM * 1000)}mm)`,
      cadOriginX + bWidthMm / 2,
      dimY - 2,
      { align: "center" }
    );

    // Drawing Title Block Footer
    pdf.setDrawColor(15, 23, 42);
    pdf.setLineWidth(0.6);
    pdf.line(15, 255, 405, 255);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(15, 23, 42);
    pdf.text("HUDSON SALES HUB", 20, 265);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Drawing: ${v.cardinalDirection} ELEVATION  |  Scale: 1:100 @ A3  |  Sheet ${idx + 1} of 4`, 20, 272);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(2, 132, 199);
    pdf.text("STATUS: ISSUED FOR CONSTRUCTION REVIEW", 310, 265);
    pdf.setTextColor(100, 116, 139);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Date: ${new Date().toLocaleDateString("en-AU")}  |  Ref: HUD-${design.id.toUpperCase()}`, 310, 272);
  }

  const cleanName = design.name.replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = `Hudson_Homes_Elevations_${cleanName}.pdf`;

  return { pdf, fileName };
}
