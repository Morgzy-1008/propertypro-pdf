import React from "react";
import { HudsonDesignPreset, SitedHouse } from "./siteStudioTypes";

interface SiteStudioHdFloorplanProps {
  design: HudsonDesignPreset;
  sitedHouse: SitedHouse;
  widthPx: number;
  lengthPx: number;
  isCompliant: boolean;
}

/**
 * Ultra-High-Definition Architectural CAD Floorplan Rendering Component.
 * Displays crisp double-wall linework, 90° door swings, window glazing,
 * sanitary fixtures, kitchen island joinery, and architectural room labels.
 */
export function SiteStudioHdFloorplan({
  design,
  sitedHouse,
  widthPx,
  lengthPx,
  isCompliant,
}: SiteStudioHdFloorplanProps) {
  // Determine if garage is on left or right (taking mirroring into account)
  const isLeftGarage = (design.garageSide === "left" && !sitedHouse.isMirrored) ||
    (design.garageSide === "right" && sitedHouse.isMirrored);

  return (
    <svg
      viewBox="0 0 1000 1800"
      className="w-full h-full pointer-events-none select-none"
      preserveAspectRatio="none"
    >
      <defs>
        {/* Wall Hatch Pattern */}
        <pattern id="brickHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#475569" strokeWidth="1" />
        </pattern>
        {/* Alfresco / Porch Tile Pattern */}
        <pattern id="tilePattern" width="30" height="30" patternUnits="userSpaceOnUse">
          <rect width="30" height="30" fill="none" stroke="#334155" strokeWidth="0.8" strokeDasharray="2 1" />
        </pattern>
        {/* Garage Concrete Floor Pattern */}
        <pattern id="concretePattern" width="60" height="60" patternUnits="userSpaceOnUse">
          <rect width="60" height="60" fill="none" stroke="#1e293b" strokeWidth="0.5" />
          <circle cx="15" cy="15" r="0.8" fill="#475569" />
          <circle cx="45" cy="45" r="0.8" fill="#475569" />
        </pattern>
      </defs>

      {/* 1. Floor Slabs & Rooms Base */}
      {/* Main Residence Slab */}
      <rect
        x="10"
        y="10"
        width="980"
        height="1780"
        fill="#0f172a"
        stroke="#334155"
        strokeWidth="2"
      />

      {/* Porch Slab (Tiled) */}
      <rect
        x={isLeftGarage ? "550" : "30"}
        y="10"
        width="420"
        height="140"
        fill="url(#tilePattern)"
        stroke="#475569"
        strokeWidth="1.5"
      />

      {/* Double Garage Slab */}
      <rect
        x={isLeftGarage ? "30" : "480"}
        y="10"
        width="490"
        height="500"
        fill="url(#concretePattern)"
        stroke="#475569"
        strokeWidth="1.5"
      />

      {/* Alfresco Slab (Rear Tiled) */}
      <rect
        x={isLeftGarage ? "30" : "500"}
        y="1480"
        width="470"
        height="300"
        fill="url(#tilePattern)"
        stroke="#475569"
        strokeWidth="1.5"
      />

      {/* 2. Room Partitions & Internal Walls */}
      {/* Master Bedroom Wing */}
      <rect
        x={isLeftGarage ? "530" : "30"}
        y="150"
        width="440"
        height="380"
        fill="#1e293b"
        stroke="#334155"
        strokeWidth="1.5"
      />

      {/* Ensuite & WIR */}
      <rect
        x={isLeftGarage ? "530" : "30"}
        y="530"
        width="440"
        height="260"
        fill="#1e293b"
        stroke="#334155"
        strokeWidth="1.5"
      />

      {/* Bedroom 2 */}
      <rect
        x={isLeftGarage ? "30" : "530"}
        y="510"
        width="440"
        height="280"
        fill="#1e293b"
        stroke="#334155"
        strokeWidth="1.5"
      />

      {/* Main Bathroom & Laundry */}
      <rect
        x={isLeftGarage ? "30" : "530"}
        y="790"
        width="440"
        height="320"
        fill="#1e293b"
        stroke="#334155"
        strokeWidth="1.5"
      />

      {/* Bedroom 3 */}
      <rect
        x={isLeftGarage ? "530" : "30"}
        y="790"
        width="440"
        height="270"
        fill="#1e293b"
        stroke="#334155"
        strokeWidth="1.5"
      />

      {/* Bedroom 4 */}
      <rect
        x={isLeftGarage ? "530" : "30"}
        y="1060"
        width="440"
        height="270"
        fill="#1e293b"
        stroke="#334155"
        strokeWidth="1.5"
      />

      {/* Central Kitchen & Walk-in Pantry (WIP) */}
      <rect
        x={isLeftGarage ? "30" : "510"}
        y="1110"
        width="460"
        height="370"
        fill="#1e293b"
        stroke="#334155"
        strokeWidth="1.5"
      />

      {/* Open Plan Family Living Room */}
      <rect
        x={isLeftGarage ? "510" : "30"}
        y="1330"
        width="460"
        height="450"
        fill="#1e293b"
        stroke="#334155"
        strokeWidth="1.5"
      />

      {/* 3. High-Definition Fixtures & Joinery */}
      {/* Kitchen Island Bench with Double Undermount Sink */}
      <g>
        <rect
          x={isLeftGarage ? "100" : "580"}
          y="1200"
          width="320"
          height="90"
          rx="4"
          fill="#334155"
          stroke="#94a3b8"
          strokeWidth="1.8"
        />
        {/* Double Sink Bowls */}
        <rect
          x={isLeftGarage ? "180" : "660"}
          y="1220"
          width="70"
          height="50"
          rx="3"
          fill="#1e293b"
          stroke="#64748b"
          strokeWidth="1.2"
        />
        <rect
          x={isLeftGarage ? "260" : "740"}
          y="1220"
          width="70"
          height="50"
          rx="3"
          fill="#1e293b"
          stroke="#64748b"
          strokeWidth="1.2"
        />
        {/* Cooktop & 4 Burners on Rear Bench */}
        <rect
          x={isLeftGarage ? "120" : "600"}
          y="1120"
          width="120"
          height="45"
          fill="#0f172a"
          stroke="#cbd5e1"
          strokeWidth="1"
        />
        <circle cx={isLeftGarage ? "145" : "625"} cy="1142" r="10" fill="none" stroke="#f59e0b" strokeWidth="1.2" />
        <circle cx={isLeftGarage ? "175" : "655"} cy="1142" r="8" fill="none" stroke="#f59e0b" strokeWidth="1.2" />
        <circle cx={isLeftGarage ? "215" : "695"} cy="1142" r="12" fill="none" stroke="#f59e0b" strokeWidth="1.2" />
      </g>

      {/* Bathroom: Freestanding Bathtub */}
      <g>
        <rect
          x={isLeftGarage ? "60" : "560"}
          y="820"
          width="150"
          height="80"
          rx="25"
          fill="#0f172a"
          stroke="#38bdf8"
          strokeWidth="1.8"
        />
        {/* Vanity with Basin */}
        <rect
          x={isLeftGarage ? "250" : "750"}
          y="820"
          width="180"
          height="60"
          fill="#334155"
          stroke="#64748b"
          strokeWidth="1.2"
        />
        <ellipse cx={isLeftGarage ? "340" : "840"} cy="850" rx="35" ry="20" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
        {/* Frameless Glass Shower Enclosure */}
        <rect
          x={isLeftGarage ? "60" : "560"}
          y="930"
          width="130"
          height="130"
          fill="#0f172a"
          stroke="#38bdf8"
          strokeWidth="1.5"
          strokeDasharray="4 2"
        />
        <circle cx={isLeftGarage ? "125" : "625"} cy="995" r="6" fill="#38bdf8" />
        {/* Toilet Suite */}
        <rect
          x={isLeftGarage ? "280" : "780"}
          y="950"
          width="60"
          height="30"
          fill="#0f172a"
          stroke="#64748b"
          strokeWidth="1.2"
        />
        <ellipse cx={isLeftGarage ? "310" : "810"} cy="1000" rx="22" ry="28" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
      </g>

      {/* Ensuite Double Vanity */}
      <g>
        <rect
          x={isLeftGarage ? "560" : "60"}
          y="560"
          width="240"
          height="60"
          fill="#334155"
          stroke="#64748b"
          strokeWidth="1.2"
        />
        <ellipse cx={isLeftGarage ? "610" : "110"} cy="590" rx="30" ry="18" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
        <ellipse cx={isLeftGarage ? "730" : "230"} cy="590" rx="30" ry="18" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
        {/* Large Walk-in Shower */}
        <rect
          x={isLeftGarage ? "820" : "320"}
          y="560"
          width="120"
          height="180"
          fill="#0f172a"
          stroke="#38bdf8"
          strokeWidth="1.5"
          strokeDasharray="4 2"
        />
        <circle cx={isLeftGarage ? "880" : "380"} cy="650" r="6" fill="#38bdf8" />
      </g>

      {/* Garage Sectional Overhead Roller Door */}
      <g>
        <line
          x1={isLeftGarage ? "60" : "510"}
          y1="10"
          x2={isLeftGarage ? "490" : "940"}
          y2="10"
          stroke="#f59e0b"
          strokeWidth="8"
        />
        {/* Overhead tracks inside garage */}
        <line
          x1={isLeftGarage ? "80" : "530"}
          y1="10"
          x2={isLeftGarage ? "80" : "530"}
          y2="420"
          stroke="#64748b"
          strokeWidth="1.5"
          strokeDasharray="6 3"
        />
        <line
          x1={isLeftGarage ? "470" : "920"}
          y1="10"
          x2={isLeftGarage ? "470" : "920"}
          y2="420"
          stroke="#64748b"
          strokeWidth="1.5"
          strokeDasharray="6 3"
        />
      </g>

      {/* 4. Architectural Door Swings (90° Arc) */}
      {/* Front Entry Door Swing */}
      <path
        d={
          isLeftGarage
            ? "M 550,150 L 550,230 A 80 80 0 0,1 630,150"
            : "M 450,150 L 450,230 A 80 80 0 0,0 370,150"
        }
        fill="none"
        stroke="#e2e8f0"
        strokeWidth="1.5"
      />
      {/* Master Bed Door Swing */}
      <path
        d={
          isLeftGarage
            ? "M 550,450 L 550,520 A 70 70 0 0,0 620,450"
            : "M 450,450 L 450,520 A 70 70 0 0,1 380,450"
        }
        fill="none"
        stroke="#e2e8f0"
        strokeWidth="1.2"
      />
      {/* Sliding Glass Stacker Door to Alfresco */}
      <line
        x1={isLeftGarage ? "200" : "540"}
        y1="1480"
        x2={isLeftGarage ? "420" : "880"}
        y2="1480"
        stroke="#38bdf8"
        strokeWidth="5"
      />

      {/* 5. Exterior Windows Glazing Symbols */}
      {/* Front Bedroom Window */}
      <line
        x1={isLeftGarage ? "650" : "120"}
        y1="150"
        x2={isLeftGarage ? "850" : "320"}
        y2="150"
        stroke="#38bdf8"
        strokeWidth="4"
      />
      {/* Side Wall Windows */}
      <line x1="10" y1="900" x2="10" y2="1050" stroke="#38bdf8" strokeWidth="4" />
      <line x1="990" y1="900" x2="990" y2="1050" stroke="#38bdf8" strokeWidth="4" />
      <line x1="10" y1="1450" x2="10" y2="1600" stroke="#38bdf8" strokeWidth="4" />

      {/* 6. Heavy Exterior Double Brick Wall Outline */}
      <rect
        x="10"
        y="10"
        width="980"
        height="1780"
        fill="none"
        stroke={isCompliant ? "#d97706" : "#ef4444"}
        strokeWidth="7"
      />

      {/* 7. Architectural Room Text Typography */}
      <g fill="#cbd5e1" fontFamily="sans-serif" textAnchor="middle" fontWeight="bold">
        {/* Porch */}
        <text x={isLeftGarage ? "760" : "240"} y="85" fontSize="26" fill="#f59e0b">
          PORCH
        </text>

        {/* Double Garage */}
        <text x={isLeftGarage ? "275" : "725"} y="240" fontSize="30" fill="#f1f5f9">
          DOUBLE GARAGE
        </text>
        <text x={isLeftGarage ? "275" : "725"} y="275" fontSize="18" fill="#94a3b8">
          5.8m × 5.5m (AUTO DOOR)
        </text>

        {/* Master Bedroom */}
        <text x={isLeftGarage ? "750" : "250"} y="330" fontSize="32" fill="#fbbf24">
          MASTER BEDROOM
        </text>
        <text x={isLeftGarage ? "750" : "250"} y="365" fontSize="19" fill="#94a3b8">
          4.2m × 3.8m
        </text>

        {/* Ensuite & WIR */}
        <text x={isLeftGarage ? "750" : "250"} y="660" fontSize="22" fill="#38bdf8">
          ENSUITE &amp; W.I.R
        </text>

        {/* Bedroom 2 */}
        <text x={isLeftGarage ? "250" : "750"} y="640" fontSize="26" fill="#f1f5f9">
          BEDROOM 2
        </text>
        <text x={isLeftGarage ? "250" : "750"} y="670" fontSize="18" fill="#94a3b8">
          3.2m × 3.0m (ROBE)
        </text>

        {/* Main Bathroom */}
        <text x={isLeftGarage ? "250" : "750"} y="920" fontSize="22" fill="#38bdf8">
          BATHROOM &amp; WC
        </text>

        {/* Bedroom 3 */}
        <text x={isLeftGarage ? "750" : "250"} y="930" fontSize="26" fill="#f1f5f9">
          BEDROOM 3
        </text>
        <text x={isLeftGarage ? "750" : "250"} y="960" fontSize="18" fill="#94a3b8">
          3.1m × 3.0m
        </text>

        {/* Bedroom 4 */}
        <text x={isLeftGarage ? "750" : "250"} y="1180" fontSize="26" fill="#f1f5f9">
          BEDROOM 4
        </text>
        <text x={isLeftGarage ? "750" : "250"} y="1210" fontSize="18" fill="#94a3b8">
          3.1m × 3.0m
        </text>

        {/* Kitchen & WIP */}
        <text x={isLeftGarage ? "260" : "740"} y="1330" fontSize="28" fill="#f59e0b">
          GOURMET KITCHEN
        </text>
        <text x={isLeftGarage ? "260" : "740"} y="1360" fontSize="18" fill="#94a3b8">
          ISLAND BENCH &amp; W.I.P
        </text>

        {/* Family Living & Dining */}
        <text x={isLeftGarage ? "740" : "260"} y="1520" fontSize="34" fill="#fbbf24">
          LIVING &amp; DINING
        </text>
        <text x={isLeftGarage ? "740" : "260"} y="1560" fontSize="20" fill="#94a3b8">
          5.6m × 4.8m OPEN PLAN
        </text>

        {/* Alfresco */}
        <text x={isLeftGarage ? "260" : "735"} y="1620" fontSize="28" fill="#f59e0b">
          ALFRESCO
        </text>
        <text x={isLeftGarage ? "260" : "735"} y="1655" fontSize="18" fill="#94a3b8">
          3.8m × 3.0m TILED
        </text>
      </g>
    </svg>
  );
}
