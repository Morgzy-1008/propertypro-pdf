import { useMemo, useState, useEffect, useRef } from "react";
import {
  Ruler,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Home,
  Check,
  X,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { Logo, ContactStrip } from "./FlyerTemplates";
import { type FlyerData } from "./types";
import { computeSitingPlan, ESTATE_PRESETS } from "./sitingEngine";
import {
  scanAndVectorizeFloorplan,
  generateWallVectorAnalysis,
  type WallVectorAnalysis,
  querySetbackToBoundary,
} from "./floorplanVisionEngine";
import { findDesign } from "@/lib/pricing";
import { toast } from "sonner";

type Setter = <K extends keyof FlyerData>(key: K, value: FlyerData[K]) => void;

interface EditModalState {
  field: "front" | "garage" | "left" | "right" | "rear";
  label: string;
  currentValue: number;
  minValue: number;
}

export function SitingPlanPage({ d, set }: { d: FlyerData; set?: Setter }) {
  const row = findDesign(d.designName);
  const floorplanM2 = Number(d.floorplanSize || row?.m2 || 192.24);
  const landAreaM2 = Number(d.landSize || 450);
  const frontageM = Number(d.landFrontage || 14.0);

  const [analysis, setAnalysis] = useState<WallVectorAnalysis>(() =>
    generateWallVectorAnalysis(d.designName)
  );

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; initialLeft: number; initialFront: number } | null>(null);
  const [dragOffsetM, setDragOffsetM] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Inline dimension editing modal
  const [editingDim, setEditingDim] = useState<EditModalState | null>(null);
  const [dimInputValue, setDimInputValue] = useState<string>("");

  useEffect(() => {
    let active = true;
    if (d.floorplanUrl) {
      scanAndVectorizeFloorplan(d.floorplanUrl, d.designName).then((res) => {
        if (active) setAnalysis(res);
      });
    } else {
      setAnalysis(generateWallVectorAnalysis(d.designName));
    }
    return () => {
      active = false;
    };
  }, [d.floorplanUrl, d.designName]);

  const siting = useMemo(() => {
    return computeSitingPlan({
      landSizeM2: landAreaM2,
      landFrontageM: frontageM,
      houseAreaM2: floorplanM2,
      designName: d.designName,
      estateName: d.estate,
      suburbName: d.suburb,
      housingType: d.housingType,
      estateId: d.estatePreset,
      houseWidthM: d.houseWidthM || analysis.houseWidthM,
      houseLengthM: d.houseLengthM || analysis.houseLengthM,
      customFrontSetback: d.frontSetback !== undefined && String(d.frontSetback).trim() !== "" ? Number(d.frontSetback) : undefined,
      customGarageSetback: d.garageSetback !== undefined && String(d.garageSetback).trim() !== "" ? Number(d.garageSetback) : undefined,
      customSideSetback: d.sideSetback !== undefined && String(d.sideSetback).trim() !== "" ? Number(d.sideSetback) : undefined,
      customLeftSetback: d.leftSetback !== undefined && String(d.leftSetback).trim() !== "" ? Number(d.leftSetback) : undefined,
      customRightSetback: d.rightSetback !== undefined && String(d.rightSetback).trim() !== "" ? Number(d.rightSetback) : undefined,
      customBtb: d.isBtb,
      customGarageSide: d.garageSide,
    });
  }, [
    landAreaM2,
    frontageM,
    floorplanM2,
    d.designName,
    d.estate,
    d.suburb,
    d.housingType,
    d.estatePreset,
    d.houseWidthM,
    d.houseLengthM,
    d.frontSetback,
    d.garageSetback,
    d.sideSetback,
    d.leftSetback,
    d.rightSetback,
    d.isBtb,
    d.garageSide,
    analysis.houseWidthM,
    analysis.houseLengthM,
  ]);

  // Diagram scaling for SVG Viewport - Maximized to fill the white card area
  const svgViewWidth = 470;
  const svgViewHeight = 630;

  // Tight margins to make lot boundary and floorplan as large as possible
  const marginX = 18;
  const marginY = 16;
  const availW = svgViewWidth - marginX * 2;
  const availH = svgViewHeight - marginY * 2;

  // Scale factor (pixels per meter)
  const scaleX = availW / siting.landFrontage;
  const scaleY = availH / siting.landDepth;
  const scale = Math.min(scaleX, scaleY);

  const lotSvgW = siting.landFrontage * scale;
  const lotSvgH = siting.landDepth * scale;

  const lotStartX = (svgViewWidth - lotSvgW) / 2;
  const lotStartY = (svgViewHeight - lotSvgH) / 2;

  // Estate minimum constraints
  const minSide = d.isBtb ? siting.minBtbSetback : siting.minSideSetback;
  const minFront = siting.minFrontSetback;
  const minRear = siting.minRearSetback;

  // Clamped Setbacks with drag offset (cannot violate estate minimums)
  const effectiveLeftSetback = Math.max(
    minSide,
    Math.min(siting.landFrontage - analysis.houseWidthM - minSide, siting.lhsWallSetback + dragOffsetM.x)
  );
  const effectiveRearSetback = Math.max(
    minRear,
    Math.min(siting.landDepth - analysis.houseLengthM - minFront, siting.rearMasterSetback + dragOffsetM.y)
  );

  // House coordinates inside lot SVG
  const houseSvgW = analysis.houseWidthM * scale;
  const houseSvgH = analysis.houseLengthM * scale;
  const houseSvgX = lotStartX + (effectiveLeftSetback * scale);
  const houseSvgY = lotStartY + (effectiveRearSetback * scale);

  // Key CAD Feature coordinates in SVG space:
  const garageDoorMidX = houseSvgX + (((analysis.garageDoorStart.x + analysis.garageDoorEnd.x) / 2) * scale);
  const garageDoorY = houseSvgY + (analysis.garageDoorThresholdY * scale);

  const frontLivingWallX = houseSvgX + (analysis.frontLivingWallPoint.x * scale);
  const frontLivingWallY = houseSvgY + (analysis.frontLivingWallPoint.y * scale);

  // Rear LHS wall point (strictly top perimeter line)
  const rearLhsX = houseSvgX + 12;
  const rearLhsY = houseSvgY; // Strictly top exterior wall edge (y=0)

  // Side Wall Points
  const lhsWallX = houseSvgX;
  const lhsWallY = houseSvgY + (analysis.lhsWallPoint.y * scale);

  const rhsWallX = houseSvgX + houseSvgW;
  const rhsWallY = houseSvgY + (analysis.rhsGarageSideWallPoint.y * scale);

  const behindGarageWallX = houseSvgX + (analysis.rhsBehindGaragePoint.x * scale);
  const behindGarageWallY = houseSvgY + (analysis.rhsBehindGaragePoint.y * scale);

  const streetFrontageY = lotStartY + lotSvgH;

  // Real measured distances in meters:
  const frontRoomMeasured = Math.max(0, (streetFrontageY - frontLivingWallY) / scale);
  const garageDoorMeasured = Math.max(0, (streetFrontageY - garageDoorY) / scale);
  const lhsMeasured = Math.max(0, (lhsWallX - lotStartX) / scale);
  const rhsMeasured = Math.max(0, (lotStartX + lotSvgW - rhsWallX) / scale);
  const behindGarageMeasured = Math.max(0, (lotStartX + lotSvgW - behindGarageWallX) / scale);
  const rearLhsMeasured = Math.max(0, (rearLhsY - lotStartY) / scale);

  // Check site coverage compliance
  const isCoverageGreen = siting.siteCoveragePercent <= siting.maxSiteCoverage;

  // 1. DRAGGING HANDLERS (Drag & Move with Estate Constraint Clamping)
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    if (set && d.isBtb) {
      set("isBtb", false); // Exit strict BTB lock on manual drag
    }
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initialLeft: effectiveLeftSetback,
      initialFront: frontRoomMeasured,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const dxPx = e.clientX - dragStartRef.current.clientX;
    const dyPx = e.clientY - dragStartRef.current.clientY;

    const dxM = dxPx / scale;
    const dyM = dyPx / scale;

    setDragOffsetM({ x: dxM, y: dyM });
  };

  const handleMouseUp = () => {
    if (!isDragging || !dragStartRef.current) return;
    setIsDragging(false);

    if (set && (Math.abs(dragOffsetM.x) > 0.02 || Math.abs(dragOffsetM.y) > 0.02)) {
      const finalLeft = Number(effectiveLeftSetback.toFixed(2));
      const finalFront = Number(frontRoomMeasured.toFixed(2));

      set("leftSetback", finalLeft);
      set("frontSetback", finalFront);
      set("isBtb", false);
      toast.success(`Floorplan positioned: ${finalLeft}m Left, ${finalFront}m Front`);
    }
    setDragOffsetM({ x: 0, y: 0 });
    dragStartRef.current = null;
  };

  // 2. DIMENSION CLICK-TO-EDIT HANDLER (Auto-Places House where Typed)
  const openDimEditor = (field: "front" | "garage" | "left" | "right" | "rear", label: string, currentVal: number, minVal: number) => {
    setEditingDim({ field, label, currentValue: currentVal, minValue: minVal });
    setDimInputValue(currentVal.toFixed(2));
  };

  const applyDimEdit = () => {
    if (!editingDim || !set) return;
    const rawNum = parseFloat(dimInputValue);
    if (isNaN(rawNum) || rawNum < 0) {
      toast.error("Please enter a valid positive number in meters.");
      return;
    }

    // Enforce Estate Minimum Setback
    if (rawNum < editingDim.minValue) {
      toast.warning(`${editingDim.label} cannot be less than the estate minimum of ${editingDim.minValue.toFixed(2)}m.`);
    }
    const num = Math.max(editingDim.minValue, rawNum);

    if (editingDim.field === "front") {
      set("frontSetback", num);
      set("garageSetback", Number((num + analysis.garageStepBackM).toFixed(2)));
      set("isBtb", false);
    } else if (editingDim.field === "garage") {
      const clampedGarage = Math.max(siting.minGarageSetback, num);
      set("garageSetback", clampedGarage);
      set("frontSetback", Number((clampedGarage - analysis.garageStepBackM).toFixed(2)));
      set("isBtb", false);
    } else if (editingDim.field === "left") {
      set("leftSetback", num);
      const calculatedRight = Math.max(0.20, Number((siting.landFrontage - analysis.houseWidthM - num).toFixed(2)));
      set("rightSetback", calculatedRight);
      set("isBtb", false);
    } else if (editingDim.field === "right") {
      set("rightSetback", num);
      const calculatedLeft = Math.max(0.20, Number((siting.landFrontage - analysis.houseWidthM - num).toFixed(2)));
      set("leftSetback", calculatedLeft);
      set("isBtb", false);
    } else if (editingDim.field === "rear") {
      const reqFront = Math.max(minFront, siting.landDepth - analysis.houseLengthM - num);
      set("frontSetback", Number(reqFront.toFixed(2)));
      set("garageSetback", Number((reqFront + analysis.garageStepBackM).toFixed(2)));
      set("isBtb", false);
    }

    toast.success(`Positioned house to ${num.toFixed(2)}m ${editingDim.label}`);
    setEditingDim(null);
  };

  return (
    <div
      className="flyer-page font-sans flex flex-col justify-between select-none"
      data-palette={d.palette}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top Header Bar */}
      <div>
        <div className="flex items-center justify-between px-[4mm] pt-[1mm] pb-[2mm]">
          <div>
            <Logo size={14} />
          </div>
          <div className="text-right leading-tight">
            <div className="text-[2.6mm] font-bold tracking-[0.24em] text-brand-gold-deep">
              ARCHITECTURAL SITING PLAN
            </div>
            <div className="mt-[0.5mm] text-[2.8mm] font-semibold text-brand-navy">
              {[d.estate, d.suburb].filter(Boolean).join(" • ") || "House & Land Siting"}
            </div>
          </div>
        </div>

        <div className="gold-bar h-[1.2mm] w-full rounded-full" />

        {/* Address / Design Info Ribbon */}
        <div className="navy-panel flex items-center justify-between gap-[2mm] px-[6mm] py-[1.8mm] text-brand-cream rounded-[1mm] my-[1.5mm]">
          <div className="flex items-center gap-[2mm] text-[2.7mm]">
            <span className="font-semibold text-brand-gold">LOT {d.lotId || "—"}</span>
            <span>•</span>
            <span>{d.address || "Street Address"}</span>
          </div>
          <div className="text-[2.7mm] font-bold tracking-[0.16em] text-brand-gold uppercase">
            {d.designName || "Selected Design"} ({analysis.roomAreas.totalM2 || floorplanM2} m²)
          </div>
        </div>
      </div>

      {/* Main Siting Content Grid */}
      <div className="grid grid-cols-[1fr_64mm] gap-[3.5mm] flex-1 items-stretch my-[1mm] min-h-0">
        {/* Left Column: Siting Plan Vector Drawing (Maximized Scale) */}
        <div className="flex flex-col rounded-[1.5mm] border border-brand-sand/80 bg-white p-[3mm] relative shadow-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-brand-sand/50 pb-[1.5mm] mb-[1.5mm]">
            <div className="flex items-center gap-[1.5mm]">
              <Layers className="h-[3.2mm] w-[3.2mm] text-brand-gold-deep" />
              <span className="text-[2.4mm] font-bold tracking-[0.18em] text-brand-navy uppercase">
                LOT SITING &amp; SETBACKS
              </span>
            </div>
            <span className="text-[1.8mm] font-semibold text-slate-400 uppercase tracking-wider">
              1:200 Scale Blueprint
            </span>
          </div>

          {/* Siting SVG Vector Canvas (Maximized Size) */}
          <div className="flex-1 flex items-center justify-center relative min-h-[152mm]">
            <svg
              viewBox={`0 0 ${svgViewWidth} ${svgViewHeight}`}
              className="w-full h-full max-h-[158mm]"
              style={{ overflow: "visible" }}
            >
              {/* 1. Lot Boundary Background (Clean Architectural White) */}
              <rect
                x={lotStartX}
                y={lotStartY}
                width={lotSvgW}
                height={lotSvgH}
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth="2.5"
              />

              {/* 2. Interactive Scaled Floorplan Drawing (Draggable) */}
              <g
                onMouseDown={handleMouseDown}
                className={`${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
              >
                {/* Drag Active Glow Outline */}
                {isDragging && (
                  <rect
                    x={houseSvgX - 2}
                    y={houseSvgY - 2}
                    width={houseSvgW + 4}
                    height={houseSvgH + 4}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                    strokeDasharray="4 4"
                    rx="3"
                  />
                )}

                {d.floorplanUrl ? (
                  <image
                    href={analysis.croppedUrl || d.floorplanUrl}
                    x={houseSvgX}
                    y={houseSvgY}
                    width={houseSvgW}
                    height={houseSvgH}
                    preserveAspectRatio="none"
                    className="mix-blend-multiply pointer-events-auto"
                    opacity="1.0"
                  />
                ) : (
                  <g>
                    <rect
                      x={houseSvgX}
                      y={houseSvgY}
                      width={houseSvgW}
                      height={houseSvgH}
                      fill="#f8fafc"
                      stroke="#334155"
                      strokeWidth="1.5"
                    />
                    <text
                      x={houseSvgX + houseSvgW / 2}
                      y={houseSvgY + houseSvgH * 0.4}
                      textAnchor="middle"
                      fill="#334155"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      {d.designName || "FLOORPLAN"}
                    </text>
                  </g>
                )}
              </g>

              {/* 3. Clean Boundary Labels (No 2nd Lines Outside) */}
              {/* Frontage Label */}
              <text
                x={lotStartX + lotSvgW / 2}
                y={lotStartY + lotSvgH + 15}
                textAnchor="middle"
                fill="#0f172a"
                fontSize="10"
                fontWeight="bold"
                letterSpacing="0.04em"
              >
                FRONTAGE — {siting.landFrontage.toFixed(2)}m
              </text>

              {/* Rear Boundary Label */}
              <text
                x={lotStartX + lotSvgW / 2}
                y={lotStartY - 8}
                textAnchor="middle"
                fill="#0f172a"
                fontSize="9.5"
                fontWeight="bold"
              >
                REAR BOUNDARY — {siting.landFrontage.toFixed(2)}m
              </text>

              {/* Left Side Boundary Label */}
              <text
                x={lotStartX - 9}
                y={lotStartY + lotSvgH / 2}
                textAnchor="middle"
                fill="#0f172a"
                fontSize="9"
                fontWeight="bold"
                transform={`rotate(-90 ${lotStartX - 9} ${lotStartY + lotSvgH / 2})`}
              >
                SIDE BOUNDARY — {siting.landDepth.toFixed(2)}m
              </text>

              {/* Right Side Boundary Label */}
              <text
                x={lotStartX + lotSvgW + 11}
                y={lotStartY + lotSvgH / 2}
                textAnchor="middle"
                fill="#0f172a"
                fontSize="9"
                fontWeight="bold"
                transform={`rotate(90 ${lotStartX + lotSvgW + 11} ${lotStartY + lotSvgH / 2})`}
              >
                SIDE BOUNDARY — {siting.landDepth.toFixed(2)}m
              </text>

              {/* 4. Architectural Red Dotted Dimensions (Zero Wall Penetration & Click-to-Edit) */}

              {/* A. Front Room Wall to Front Boundary */}
              <line
                x1={frontLivingWallX}
                y1={frontLivingWallY}
                x2={frontLivingWallX}
                y2={streetFrontageY}
                stroke="#dc2626"
                strokeWidth="1.3"
                strokeDasharray="3 3"
              />
              <g
                className="cursor-pointer group"
                onClick={() => openDimEditor("front", "Front Room Setback", frontRoomMeasured, minFront)}
              >
                <text
                  x={frontLivingWallX + 4}
                  y={frontLivingWallY + (streetFrontageY - frontLivingWallY) / 2 + 3}
                  fill="#dc2626"
                  fontSize="7.5"
                  fontWeight="bold"
                  stroke="#ffffff"
                  strokeWidth="2.5px"
                  paintOrder="stroke fill"
                  className="group-hover:fill-amber-600 transition-colors"
                >
                  {frontRoomMeasured.toFixed(2)}m
                </text>
              </g>

              {/* B. Garage Door to Front Boundary */}
              <line
                x1={garageDoorMidX}
                y1={garageDoorY}
                x2={garageDoorMidX}
                y2={streetFrontageY}
                stroke="#dc2626"
                strokeWidth="1.3"
                strokeDasharray="3 3"
              />
              <g
                className="cursor-pointer group"
                onClick={() => openDimEditor("garage", "Garage Door Setback", garageDoorMeasured, siting.minGarageSetback)}
              >
                <text
                  x={garageDoorMidX + 4}
                  y={garageDoorY + (streetFrontageY - garageDoorY) / 2 + 3}
                  fill="#dc2626"
                  fontSize="7.5"
                  fontWeight="bold"
                  stroke="#ffffff"
                  strokeWidth="2.5px"
                  paintOrder="stroke fill"
                  className="group-hover:fill-amber-600 transition-colors"
                >
                  {garageDoorMeasured.toFixed(2)}m
                </text>
              </g>

              {/* C. LHS Wall to Left Boundary */}
              <line
                x1={lotStartX}
                y1={lhsWallY}
                x2={lhsWallX}
                y2={lhsWallY}
                stroke="#dc2626"
                strokeWidth="1.3"
                strokeDasharray="3 3"
              />
              <g
                className="cursor-pointer group"
                onClick={() => openDimEditor("left", "LHS Side Setback", lhsMeasured, 0.20)}
              >
                <text
                  x={lotStartX + (lhsWallX - lotStartX) / 2}
                  y={lhsWallY - 3}
                  textAnchor="middle"
                  fill="#dc2626"
                  fontSize="7.5"
                  fontWeight="bold"
                  stroke="#ffffff"
                  strokeWidth="2.5px"
                  paintOrder="stroke fill"
                  className="group-hover:fill-amber-600 transition-colors"
                >
                  {lhsMeasured.toFixed(2)}m
                </text>
              </g>

              {/* D. RHS Wall / Garage Side Wall to Right Boundary */}
              <line
                x1={rhsWallX}
                y1={rhsWallY}
                x2={lotStartX + lotSvgW}
                y2={rhsWallY}
                stroke="#dc2626"
                strokeWidth="1.3"
                strokeDasharray="3 3"
              />
              <g
                className="cursor-pointer group"
                onClick={() => openDimEditor("right", "RHS Side Setback", rhsMeasured, 0.20)}
              >
                <text
                  x={rhsWallX + (lotStartX + lotSvgW - rhsWallX) / 2}
                  y={rhsWallY - 3}
                  textAnchor="middle"
                  fill="#dc2626"
                  fontSize="7.5"
                  fontWeight="bold"
                  stroke="#ffffff"
                  strokeWidth="2.5px"
                  paintOrder="stroke fill"
                  className="group-hover:fill-amber-600 transition-colors"
                >
                  {d.isBtb ? "0.20m" : `${rhsMeasured.toFixed(2)}m`}
                </text>
              </g>

              {/* E. Wall BEHIND Garage to Right Boundary (When BTB step-out is active) */}
              {d.isBtb && siting.hasStepOut && (
                <g>
                  <line
                    x1={behindGarageWallX}
                    y1={behindGarageWallY}
                    x2={lotStartX + lotSvgW}
                    y2={behindGarageWallY}
                    stroke="#dc2626"
                    strokeWidth="1.3"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={behindGarageWallX + (lotStartX + lotSvgW - behindGarageWallX) / 2}
                    y={behindGarageWallY - 3}
                    textAnchor="middle"
                    fill="#dc2626"
                    fontSize="7.5"
                    fontWeight="bold"
                    stroke="#ffffff"
                    strokeWidth="2.5px"
                    paintOrder="stroke fill"
                  >
                    {behindGarageMeasured.toFixed(2)}m
                  </text>
                </g>
              )}

              {/* F. Rear Setback Line: Starts strictly at top roof perimeter (y = houseSvgY) with ZERO wall penetration */}
              <line
                x1={rearLhsX}
                y1={lotStartY}
                x2={rearLhsX}
                y2={rearLhsY}
                stroke="#dc2626"
                strokeWidth="1.3"
                strokeDasharray="3 3"
              />
              <g
                className="cursor-pointer group"
                onClick={() => openDimEditor("rear", "Rear Boundary Setback", rearLhsMeasured, minRear)}
              >
                <text
                  x={rearLhsX + 4}
                  y={lotStartY + (rearLhsY - lotStartY) / 2 + 3}
                  fill="#dc2626"
                  fontSize="7.5"
                  fontWeight="bold"
                  stroke="#ffffff"
                  strokeWidth="2.5px"
                  paintOrder="stroke fill"
                  className="group-hover:fill-amber-600 transition-colors"
                >
                  {rearLhsMeasured.toFixed(2)}m
                </text>
              </g>
            </svg>

            {/* Inline Dimension Edit Modal Popup */}
            {editingDim && (
              <div
                className="absolute z-50 bg-white border-2 border-amber-500 shadow-2xl rounded-lg p-2.5 flex flex-col gap-2 min-w-[150px]"
                style={{
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div className="flex items-center justify-between text-[11px] font-bold text-amber-900 border-b border-amber-200 pb-1">
                  <span>{editingDim.label}</span>
                  <button onClick={() => setEditingDim(null)} className="text-slate-400 hover:text-slate-700">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="text-[9.5px] text-slate-500 font-medium">
                  Min. Required: <span className="text-amber-700 font-bold">{editingDim.minValue.toFixed(2)}m</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.05"
                    autoFocus
                    value={dimInputValue}
                    onChange={(e) => setDimInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applyDimEdit()}
                    className="w-full text-xs font-bold border border-slate-300 rounded px-2 py-1 text-slate-900 bg-slate-50 focus:bg-white focus:border-amber-500 focus:outline-none"
                    placeholder="e.g. 4.5"
                  />
                  <span className="text-xs text-slate-600 font-semibold">m</span>
                  <button
                    type="button"
                    onClick={applyDimEdit}
                    className="p-1.5 rounded bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold transition-colors"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Floorplan Details, Site Metrics, Required Minimum Setbacks & Current Setbacks */}
        <div className="flex flex-col justify-between gap-[2mm]">
          {/* Card 1: Floorplan Specifications Details Card */}
          <div className="rounded-[1.5mm] border border-brand-sand/80 bg-white p-[2.3mm] shadow-xs">
            <div className="flex items-center gap-[1.2mm] border-b border-brand-sand/60 pb-[0.8mm] mb-[1mm]">
              <Home className="h-[2.5mm] w-[2.5mm] text-brand-gold-deep" />
              <div className="text-[2mm] font-bold tracking-[0.14em] text-brand-navy uppercase">
                FLOORPLAN DETAILS
              </div>
            </div>

            <div className="space-y-[0.8mm] text-[1.95mm]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-[0.3mm]">
                <span className="text-brand-ink/60">Design:</span>
                <span className="font-bold text-brand-navy">{d.designName || "Amber 21"}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-[0.3mm]">
                <span className="text-brand-ink/60">Total Area:</span>
                <span className="font-bold text-brand-gold-deep font-display">
                  {analysis.roomAreas.totalM2 || floorplanM2} m² ({(Number(analysis.roomAreas.totalM2 || floorplanM2) / 9.29).toFixed(1)} sq)
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-[0.3mm]">
                <span className="text-brand-ink/60">House Width:</span>
                <span className="font-semibold text-brand-navy">{analysis.houseWidthM.toFixed(2)} m</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-[0.3mm]">
                <span className="text-brand-ink/60">House Length:</span>
                <span className="font-semibold text-brand-navy">{analysis.houseLengthM.toFixed(2)} m</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-brand-ink/60">Layout:</span>
                <span className="font-semibold text-slate-700">
                  {d.beds || "4"} Bed • {d.baths || "2"} Bath • {d.cars || "2"} Car
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Site Metrics Card */}
          <div className="rounded-[1.5mm] border border-brand-sand/80 bg-white p-[2.3mm] shadow-xs">
            <div className="flex items-center gap-[1.2mm] border-b border-brand-sand/60 pb-[0.8mm] mb-[1mm]">
              <Ruler className="h-[2.5mm] w-[2.5mm] text-brand-gold-deep" />
              <div className="text-[2mm] font-bold tracking-[0.14em] text-brand-navy uppercase">
                SITE METRICS
              </div>
            </div>

            <div className="space-y-[0.8mm] text-[1.95mm]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-[0.3mm]">
                <span className="text-brand-ink/60">Lot Area:</span>
                <span className="font-bold text-brand-navy">{siting.landArea} m²</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-[0.3mm]">
                <span className="text-brand-ink/60">Frontage:</span>
                <span className="font-bold text-brand-navy">{siting.landFrontage.toFixed(2)} m</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-[0.3mm]">
                <span className="text-brand-ink/60">Lot Depth:</span>
                <span className="font-bold text-brand-navy">{siting.landDepth.toFixed(2)} m</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-[0.3mm]">
                <span className="text-brand-ink/60">Coverage:</span>
                <span className={`font-display text-[2.4mm] font-bold ${isCoverageGreen ? "text-emerald-700" : "text-rose-600"}`}>
                  {siting.siteCoveragePercent}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-brand-ink/60">Private Open:</span>
                <span className="font-bold text-emerald-700 font-display text-[2.4mm]">
                  {siting.privateOpenSpaceM2} m²
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: REQUIRED MINIMUM SETBACKS (Replaces Area Breakdown Box) */}
          <div className="rounded-[1.5mm] border border-amber-500/30 bg-amber-50/40 p-[2.3mm] shadow-xs">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-[0.8mm] mb-[1mm]">
              <div className="flex items-center gap-[1.2mm]">
                <ShieldCheck className="h-[2.5mm] w-[2.5mm] text-amber-700" />
                <div className="text-[2mm] font-bold tracking-[0.14em] text-amber-900 uppercase">
                  REQUIRED MIN. SETBACKS
                </div>
              </div>
              <span className="text-[1.6mm] font-semibold text-amber-800 bg-amber-100 px-1 py-0.2 rounded">
                ESTATE POD
              </span>
            </div>

            <div className="space-y-[0.8mm] text-[1.95mm]">
              <div className="flex items-center justify-between border-b border-amber-200/50 pb-[0.3mm]">
                <span className="text-slate-600">Front Building Line:</span>
                <span className="font-bold text-slate-900">{siting.minFrontSetback.toFixed(2)} m</span>
              </div>
              <div className="flex items-center justify-between border-b border-amber-200/50 pb-[0.3mm]">
                <span className="text-slate-600">Garage Door Line:</span>
                <span className="font-bold text-slate-900">{siting.minGarageSetback.toFixed(2)} m</span>
              </div>
              <div className="flex items-center justify-between border-b border-amber-200/50 pb-[0.3mm]">
                <span className="text-slate-600">Side Setback:</span>
                <span className="font-bold text-slate-900">{siting.minSideSetback.toFixed(2)} m</span>
              </div>
              <div className="flex items-center justify-between border-b border-amber-200/50 pb-[0.3mm]">
                <span className="text-slate-600">BTB Garage Wall:</span>
                <span className="font-bold text-amber-800">{siting.minBtbSetback.toFixed(2)} m</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Rear Boundary:</span>
                <span className="font-bold text-slate-900">{siting.minRearSetback.toFixed(2)} m</span>
              </div>
            </div>
          </div>

          {/* Card 4: CURRENT SETBACKS (Title without "(POD)") */}
          <div className="rounded-[1.5mm] border border-brand-sand/80 bg-white p-[2.3mm] shadow-xs">
            <div className="flex items-center gap-[1.2mm] border-b border-brand-sand/60 pb-[0.8mm] mb-[1mm]">
              <Ruler className="h-[2.5mm] w-[2.5mm] text-brand-gold-deep" />
              <div className="text-[2mm] font-bold tracking-[0.14em] text-brand-navy uppercase">
                CURRENT SETBACKS
              </div>
            </div>

            <div className="space-y-[0.8mm] text-[1.95mm]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-[0.3mm]">
                <span className="text-brand-ink/60">Front Room:</span>
                <span className="font-bold text-brand-navy">{frontRoomMeasured.toFixed(2)} m</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-[0.3mm]">
                <span className="text-brand-ink/60">Garage Door:</span>
                <span className="font-semibold text-brand-navy">{garageDoorMeasured.toFixed(2)} m</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-[0.3mm]">
                <span className="text-brand-ink/60">LHS Wall:</span>
                <span className="font-semibold text-brand-navy">{lhsMeasured.toFixed(2)} m</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-[0.3mm]">
                <span className="text-brand-ink/60">RHS Wall:</span>
                <span className="font-semibold text-brand-navy">
                  {d.isBtb ? "0.20m (BTB)" : `${rhsMeasured.toFixed(2)}m`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-brand-ink/60">Rear Setback:</span>
                <span className="font-bold text-emerald-700">{rearLhsMeasured.toFixed(2)} m</span>
              </div>
            </div>
          </div>

          {/* Compliance & Estate Note Badge */}
          <div className="rounded-[1.5mm] bg-amber-500/10 border border-amber-500/30 p-[1.8mm]">
            <div className="flex items-center gap-[1.2mm] text-amber-900 font-bold text-[1.9mm] mb-[0.3mm]">
              <CheckCircle2 className="h-[2.3mm] w-[2.3mm] text-amber-700 flex-none" />
              <span className="truncate">{siting.estateName.toUpperCase()}</span>
            </div>
            <p className="text-[1.55mm] text-slate-600 leading-tight">
              Sited strictly within estate POD envelope guidelines. Subject to soil test &amp; developer approval.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Contact Bar */}
      <div className="mt-auto pt-[1mm]">
        <ContactStrip d={d} />
      </div>
    </div>
  );
}
