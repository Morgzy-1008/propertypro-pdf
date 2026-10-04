import { useMemo, useState, useEffect, useRef } from "react";
import {
  Ruler,
  Layers,
  CheckCircle2,
  X,
} from "lucide-react";
import { LogoV2, ContactStrip } from "./FlyerTemplates";
import { type FlyerData } from "./types";
import { computeSitingPlan } from "./sitingEngine";
import {
  scanAndVectorizeFloorplan,
  generateWallVectorAnalysis,
  type WallVectorAnalysis,
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

export function SitingPlanV2({ d, set }: { d: FlyerData; set?: Setter }) {
  const row = findDesign(d.designName);
  const floorplanM2 = Number(d.floorplanSize || row?.m2 || 192.24);
  const landAreaM2 = Number(d.landSize || 450);
  const frontageM = Number(d.landFrontage || 14.0);

  const [analysis, setAnalysis] = useState<WallVectorAnalysis>(() =>
    generateWallVectorAnalysis(d.designName, undefined, d.housingType, d.houseWidthM, d.houseLengthM)
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
      scanAndVectorizeFloorplan(d.floorplanUrl, d.designName, d.housingType, d.houseWidthM, d.houseLengthM).then((res) => {
        if (active) setAnalysis(res);
      });
    } else {
      setAnalysis(generateWallVectorAnalysis(d.designName, undefined, d.housingType, d.houseWidthM, d.houseLengthM));
    }
    return () => {
      active = false;
    };
  }, [d.floorplanUrl, d.designName, d.housingType, d.houseWidthM, d.houseLengthM]);

  const siting = useMemo(() => {
    return computeSitingPlan({
      landSizeM2: landAreaM2,
      landFrontageM: frontageM,
      landDepthM: d.landDepth !== undefined && String(d.landDepth).trim() !== "" ? Number(d.landDepth) : undefined,
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
      customRearSetback: d.rearSetback !== undefined && String(d.rearSetback).trim() !== "" ? Number(d.rearSetback) : undefined,
      customBtb: d.isBtb,
      customGarageSide: d.garageSide,
    });
  }, [
    landAreaM2,
    frontageM,
    d.landDepth,
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
    d.rearSetback,
    d.isBtb,
    d.garageSide,
    analysis.houseWidthM,
    analysis.houseLengthM,
  ]);

  // Diagram scaling for SVG Viewport - Maximized to fill the LHS card
  const svgViewWidth = 520;
  const svgViewHeight = 650;

  const marginX = 14;
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

  // Scaled setbacks with drag offset
  const effectiveLeftSetback = Math.max(
    0,
    Math.min(siting.landFrontage - analysis.houseWidthM, siting.lhsWallSetback + dragOffsetM.x)
  );
  const effectiveRearSetback = Math.max(
    0,
    Math.min(siting.landDepth - analysis.houseLengthM, siting.rearMasterSetback + dragOffsetM.y)
  );

  // House coordinates inside lot SVG
  const houseSvgW = analysis.houseWidthM * scale;
  const houseSvgH = analysis.houseLengthM * scale;
  const houseSvgX = lotStartX + (effectiveLeftSetback * scale);
  const houseSvgY = lotStartY + (effectiveRearSetback * scale);

  // Key CAD Feature coordinates in SVG space
  const garageDoorMidX = houseSvgX + (((analysis.garageDoorStart.x + analysis.garageDoorEnd.x) / 2) * scale);
  const garageDoorY = houseSvgY + (Math.max(0, analysis.houseLengthM - (analysis.garageStepBackM || 1.20)) * scale);
  const frontLivingWallX = houseSvgX + (analysis.frontLivingWallPoint.x * scale);
  const frontLivingWallY = houseSvgY + (analysis.houseLengthM * scale);

  // Measured setback values in real meters
  const frontRoomMeasured = Math.max(0, (lotStartY + lotSvgH - frontLivingWallY) / scale);
  const garageDoorMeasured = Math.max(0, (lotStartY + lotSvgH - garageDoorY) / scale);
  const lhsMeasured = Math.max(0, (houseSvgX - lotStartX) / scale);
  const rhsMeasured = Math.max(0, (lotStartX + lotSvgW - (houseSvgX + houseSvgW)) / scale);
  const rearLhsMeasured = Math.max(0, (houseSvgY - lotStartY) / scale);

  const isOmp = d.setbackMeasurement === "omp";

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initialLeft: dragOffsetM.x,
      initialFront: dragOffsetM.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const dxPx = e.clientX - dragStartRef.current.clientX;
    const dyPx = e.clientY - dragStartRef.current.clientY;
    const dxM = dxPx / (scale * 2.8);
    const dyM = dyPx / (scale * 2.8);

    setDragOffsetM({
      x: dragStartRef.current.initialLeft + dxM,
      y: dragStartRef.current.initialFront + dyM,
    });
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    dragStartRef.current = null;
    if (set) {
      set("leftSetback", lhsMeasured.toFixed(2));
      set("rightSetback", rhsMeasured.toFixed(2));
      set("frontSetback", frontRoomMeasured.toFixed(2));
      set("garageSetback", garageDoorMeasured.toFixed(2));
      set("rearSetback", rearLhsMeasured.toFixed(2));
    }
  };

  const openDimEditor = (
    field: "front" | "garage" | "left" | "right" | "rear",
    label: string,
    currentValue: number,
    minValue: number
  ) => {
    setEditingDim({ field, label, currentValue, minValue });
    setDimInputValue(currentValue.toFixed(2));
  };

  const applyDimEdit = () => {
    if (!editingDim || !set) return;
    const num = parseFloat(dimInputValue);
    if (isNaN(num) || num < 0) {
      toast.error("Please enter a valid positive measurement in meters.");
      return;
    }

    if (editingDim.field === "front") {
      set("frontSetback", num.toFixed(2));
    } else if (editingDim.field === "garage") {
      set("garageSetback", num.toFixed(2));
    } else if (editingDim.field === "left") {
      set("leftSetback", num.toFixed(2));
    } else if (editingDim.field === "right") {
      set("rightSetback", num.toFixed(2));
    } else if (editingDim.field === "rear") {
      set("rearSetback", num.toFixed(2));
    }

    toast.success(`Positioned house to ${num.toFixed(2)}m ${editingDim.label}`);
    setEditingDim(null);
  };

  const designDisplayName = d.designName || d.floorplanName || "AMBER 23";

  return (
    <div
      className="flyer-page font-sans flex flex-col justify-between select-none"
      data-palette={d.palette}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top Header Bar: Hudson Homes on LHS, Siting Plan on RHS */}
      <div>
        <div className="flex items-center justify-between px-[4mm] pt-[1mm] pb-[2mm]">
          <div>
            <LogoV2 size={16} />
          </div>
          <div className="text-right leading-none">
            <h1 className="font-sans font-black text-[7.5mm] tracking-[0.03em] text-brand-navy uppercase">
              SITING PLAN
            </h1>
          </div>
        </div>

        <div className="gold-bar h-[1.2mm] w-full rounded-full" />
      </div>

      {/* Main Siting Content Grid: Maximized Blueprint on LHS, Large Info Text on RHS */}
      <div className="grid grid-cols-[1fr_66mm] gap-[4mm] flex-1 items-stretch my-[1.5mm] min-h-0">
        {/* Left Column: Siting Plan Vector Drawing (Maximized Scale) */}
        <div className="flex flex-col rounded-[1.5mm] border border-brand-sand/80 bg-white p-[2.5mm] relative shadow-xs overflow-hidden">
          {/* Top Pill & Title above Blueprint */}
          <div className="flex items-center justify-between border-b border-brand-sand/60 pb-[1.8mm] mb-[1.5mm]">
            <div>
              <div className="inline-flex items-center px-[3mm] py-[0.8mm] rounded-[1mm] bg-amber-500 text-white font-bold text-[2.4mm] tracking-[0.08em] uppercase shadow-xs">
                {designDisplayName.toUpperCase()} FLOORPLAN
              </div>
              <div className="mt-[1.2mm]">
                <span className="text-[2.6mm] font-bold tracking-[0.16em] text-brand-navy uppercase block">
                  LOT SITING &amp; SETBACKS
                </span>
                <span className="text-[1.8mm] font-semibold text-slate-400 uppercase tracking-wider block mt-[0.2mm]">
                  1:200 Scale Blueprint
                </span>
              </div>
            </div>
            <div className="text-right text-[2.2mm] font-bold text-brand-navy/70">
              {d.estate ? `${d.estate.toUpperCase()}` : ""}
            </div>
          </div>

          {/* Siting SVG Vector Canvas (Maximized Size on LHS) */}
          <div className="flex-1 flex items-center justify-center relative min-h-[170mm]">
            <svg
              viewBox={`0 0 ${svgViewWidth} ${svgViewHeight}`}
              className="w-full h-full max-h-[180mm]"
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

              {/* 2. Boundary Labels */}
              {/* Rear Boundary Label */}
              <text
                x={lotStartX + lotSvgW / 2}
                y={lotStartY - 10}
                textAnchor="middle"
                fill="#0f172a"
                fontSize="11"
                fontWeight="bold"
                letterSpacing="0.04em"
              >
                REAR BOUNDARY — {siting.landFrontage.toFixed(2)}m
              </text>

              {/* Left Side Boundary Label */}
              <text
                x={lotStartX - 10}
                y={lotStartY + lotSvgH / 2}
                textAnchor="middle"
                fill="#0f172a"
                fontSize="10.5"
                fontWeight="bold"
                letterSpacing="0.04em"
                transform={`rotate(-90, ${lotStartX - 10}, ${lotStartY + lotSvgH / 2})`}
              >
                SIDE BOUNDARY — {siting.landDepth.toFixed(2)}m
              </text>

              {/* Right Side Boundary Label */}
              <text
                x={lotStartX + lotSvgW + 12}
                y={lotStartY + lotSvgH / 2}
                textAnchor="middle"
                fill="#0f172a"
                fontSize="10.5"
                fontWeight="bold"
                letterSpacing="0.04em"
                transform={`rotate(90, ${lotStartX + lotSvgW + 12}, ${lotStartY + lotSvgH / 2})`}
              >
                SIDE BOUNDARY — {siting.landDepth.toFixed(2)}m
              </text>

              {/* Frontage Label */}
              <text
                x={lotStartX + lotSvgW / 2}
                y={lotStartY + lotSvgH + 18}
                textAnchor="middle"
                fill="#0f172a"
                fontSize="11"
                fontWeight="bold"
                letterSpacing="0.04em"
              >
                FRONTAGE — {siting.landFrontage.toFixed(2)}m
              </text>

              {/* 3. Interactive Scaled Floorplan Drawing (Draggable) */}
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
                      fontSize="11"
                      fontWeight="bold"
                    >
                      {d.designName || "FLOORPLAN"}
                    </text>
                  </g>
                )}
              </g>

              {/* 4. Setback Dimension Lines (Red Dashed CAD Dimensioning) */}
              {/* Rear Setback Line */}
              <line
                x1={houseSvgX + 18}
                y1={lotStartY}
                x2={houseSvgX + 18}
                y2={houseSvgY}
                stroke="#dc2626"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <text
                x={houseSvgX + 22}
                y={lotStartY + (houseSvgY - lotStartY) / 2 + 3}
                fill="#dc2626"
                fontSize="9.5"
                fontWeight="bold"
              >
                {rearLhsMeasured.toFixed(2)}m
              </text>

              {/* LHS Wall Setback Line */}
              <line
                x1={lotStartX}
                y1={houseSvgY + houseSvgH * 0.52}
                x2={houseSvgX}
                y2={houseSvgY + houseSvgH * 0.52}
                stroke="#dc2626"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <text
                x={lotStartX + (houseSvgX - lotStartX) / 2}
                y={houseSvgY + houseSvgH * 0.52 - 4}
                textAnchor="middle"
                fill="#dc2626"
                fontSize="9.5"
                fontWeight="bold"
              >
                {lhsMeasured.toFixed(2)}m
              </text>

              {/* RHS Wall Setback Line */}
              <line
                x1={houseSvgX + houseSvgW}
                y1={houseSvgY + houseSvgH * 0.72}
                x2={lotStartX + lotSvgW}
                y2={houseSvgY + houseSvgH * 0.72}
                stroke="#dc2626"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <text
                x={houseSvgX + houseSvgW + (lotStartX + lotSvgW - (houseSvgX + houseSvgW)) / 2}
                y={houseSvgY + houseSvgH * 0.72 - 4}
                textAnchor="middle"
                fill="#dc2626"
                fontSize="9.5"
                fontWeight="bold"
              >
                {d.isBtb ? "0.20m" : `${rhsMeasured.toFixed(2)}m`}
              </text>

              {/* Front Room Setback Line */}
              <line
                x1={frontLivingWallX}
                y1={frontLivingWallY}
                x2={frontLivingWallX}
                y2={lotStartY + lotSvgH}
                stroke="#dc2626"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <text
                x={frontLivingWallX + 4}
                y={frontLivingWallY + (lotStartY + lotSvgH - frontLivingWallY) / 2}
                fill="#dc2626"
                fontSize="9.5"
                fontWeight="bold"
              >
                {frontRoomMeasured.toFixed(2)}m
              </text>

              {/* Garage Door Setback Line */}
              <line
                x1={garageDoorMidX}
                y1={garageDoorY}
                x2={garageDoorMidX}
                y2={lotStartY + lotSvgH}
                stroke="#dc2626"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <text
                x={garageDoorMidX + 4}
                y={garageDoorY + (lotStartY + lotSvgH - garageDoorY) / 2}
                fill="#dc2626"
                fontSize="9.5"
                fontWeight="bold"
              >
                {garageDoorMeasured.toFixed(2)}m
              </text>
            </svg>
          </div>
        </div>

        {/* Right Column: Large, Clear Siting & Floorplan Metrics (66mm wide) */}
        <div className="flex flex-col justify-between gap-[2.5mm] h-full">
          {/* Section 1: FLOORPLAN DETAILS */}
          <div className="rounded-[1.5mm] border border-brand-sand/80 bg-white p-[2.8mm] shadow-xs">
            <h3 className="text-[2.85mm] font-extrabold tracking-[0.12em] text-brand-navy uppercase border-b border-brand-sand/60 pb-[1.2mm] mb-[1.2mm]">
              FLOORPLAN DETAILS
            </h3>
            <div className="space-y-[1mm] text-[2.7mm] leading-tight">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Design</span>
                <span className="font-bold text-slate-900">{designDisplayName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Total Area</span>
                <span className="font-bold text-slate-900">
                  {Number(analysis.roomAreas?.totalM2 || floorplanM2).toFixed(2)} m² ({(Number(analysis.roomAreas?.totalM2 || floorplanM2) * 0.107639).toFixed(1)} SQ)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">House Width</span>
                <span className="font-bold text-slate-900">
                  {Number(analysis.houseWidthM || d.houseWidthM || 11.20).toFixed(2)} m
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">House Length</span>
                <span className="font-bold text-slate-900">
                  {Number(analysis.houseLengthM || d.houseLengthM || 21.00).toFixed(2)} m
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Layout</span>
                <span className="font-bold text-slate-900">
                  {d.beds || 4} Bed * {d.baths || 2} Bath * {d.cars || 2} Car
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: SITE METRICS */}
          <div className="rounded-[1.5mm] border border-brand-sand/80 bg-white p-[2.8mm] shadow-xs">
            <h3 className="text-[2.85mm] font-extrabold tracking-[0.12em] text-brand-navy uppercase border-b border-brand-sand/60 pb-[1.2mm] mb-[1.2mm]">
              SITE METRICS
            </h3>
            <div className="space-y-[1mm] text-[2.7mm] leading-tight">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Lot Area</span>
                <span className="font-bold text-slate-900">{landAreaM2} m²</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Frontage</span>
                <span className="font-bold text-slate-900">{Number(frontageM || 14).toFixed(2)} m</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Lot Depth</span>
                <span className="font-bold text-slate-900">{Number(siting.landDepth || 30).toFixed(2)} m</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Coverage</span>
                <span className="font-bold text-slate-900">{Number(siting.siteCoveragePercent || 0).toFixed(1)}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Private Open</span>
                <span className="font-bold text-slate-900">{Number(siting.privateOpenSpaceM2 || 0).toFixed(1)} m²</span>
              </div>
            </div>
          </div>

          {/* Section 3: REQUIRED MIN. SETBACKS */}
          <div className="rounded-[1.5mm] border border-amber-500/30 bg-amber-500/5 p-[2.8mm] shadow-xs">
            <div className="flex items-center justify-between border-b border-amber-300/40 pb-[1.2mm] mb-[1.2mm]">
              <h3 className="text-[2.85mm] font-extrabold tracking-[0.12em] text-brand-navy uppercase">
                REQUIRED MIN. SETBACKS
              </h3>
              <span className="px-1.5 py-0.5 rounded text-[1.9mm] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                ESTATE POD
              </span>
            </div>
            <div className="space-y-[1mm] text-[2.7mm] leading-tight">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Front Building Line</span>
                <span className="font-bold text-slate-900">{Number(siting.minFrontSetback || 3).toFixed(2)} m</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Garage Door Line</span>
                <span className="font-bold text-slate-900">{Number(siting.minGarageSetback || 5).toFixed(2)} m</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Side Setback</span>
                <span className="font-bold text-slate-900">{Number(siting.minSideSetback || 1).toFixed(2)} m</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">BTB Garage Wall</span>
                <span className="font-bold text-amber-900">{Number(siting.minBtbSetback || 0.2).toFixed(2)} m</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Rear Boundary</span>
                <span className="font-bold text-slate-900">{Number(siting.minRearSetback || 1).toFixed(2)} m</span>
              </div>
            </div>
          </div>

          {/* Section 4: CURRENT SETBACKS */}
          <div className="rounded-[1.5mm] border border-brand-sand/80 bg-white p-[2.8mm] shadow-xs">
            <div className="flex items-center justify-between border-b border-brand-sand/60 pb-[1.2mm] mb-[1.2mm]">
              <h3 className="text-[2.85mm] font-extrabold tracking-[0.12em] text-brand-navy uppercase">
                CURRENT SETBACKS
              </h3>
              <span className={`text-[1.8mm] font-bold px-1.5 py-0.5 rounded ${
                isOmp ? "bg-amber-100 text-amber-800 border border-amber-300" : "bg-slate-100 text-slate-700"
              }`}>
                {isOmp ? "OMP" : "WALL"}
              </span>
            </div>
            <div className="space-y-[1mm] text-[2.7mm] leading-tight">
              <div
                className="flex items-center justify-between cursor-pointer hover:bg-amber-500/10 rounded px-1 transition-colors"
                onClick={() => openDimEditor("front", "Front Room Setback", frontRoomMeasured, minFront)}
                title="Click to edit Front Room Setback"
              >
                <span className="text-slate-600 font-medium">Front Room</span>
                <span className="font-bold text-brand-navy flex items-center gap-1">
                  {isOmp ? `${Math.max(0, frontRoomMeasured - 0.45).toFixed(2)} m` : `${frontRoomMeasured.toFixed(2)} m`}
                  <span className="text-[1.8mm] text-amber-500 font-normal">✎</span>
                </span>
              </div>
              <div
                className="flex items-center justify-between cursor-pointer hover:bg-amber-500/10 rounded px-1 transition-colors"
                onClick={() => openDimEditor("garage", "Garage Door Setback", garageDoorMeasured, siting.minGarageSetback)}
                title="Click to edit Garage Door Setback"
              >
                <span className="text-slate-600 font-medium">Garage Door</span>
                <span className="font-bold text-brand-navy flex items-center gap-1">
                  {isOmp ? `${Math.max(0, garageDoorMeasured - 0.45).toFixed(2)} m` : `${garageDoorMeasured.toFixed(2)} m`}
                  <span className="text-[1.8mm] text-amber-500 font-normal">✎</span>
                </span>
              </div>
              <div
                className="flex items-center justify-between cursor-pointer hover:bg-amber-500/10 rounded px-1 transition-colors"
                onClick={() => openDimEditor("left", "LHS Side Setback", lhsMeasured, 0.20)}
                title="Click to edit LHS Side Setback"
              >
                <span className="text-slate-600 font-medium">LHS Wall</span>
                <span className="font-bold text-brand-navy flex items-center gap-1">
                  {isOmp ? `${Math.max(0, lhsMeasured - 0.45).toFixed(2)} m` : `${lhsMeasured.toFixed(2)} m`}
                  <span className="text-[1.8mm] text-amber-500 font-normal">✎</span>
                </span>
              </div>
              <div
                className="flex items-center justify-between cursor-pointer hover:bg-amber-500/10 rounded px-1 transition-colors"
                onClick={() => openDimEditor("right", "RHS Side Setback", rhsMeasured, 0.20)}
                title="Click to edit RHS Side Setback"
              >
                <span className="text-slate-600 font-medium">RHS Wall</span>
                <span className="font-bold text-brand-navy flex items-center gap-1">
                  {d.isBtb ? "0.20 m (BTB)" : isOmp ? `${Math.max(0, rhsMeasured - 0.45).toFixed(2)} m` : `${rhsMeasured.toFixed(2)} m`}
                  <span className="text-[1.8mm] text-amber-500 font-normal">✎</span>
                </span>
              </div>
              <div
                className="flex items-center justify-between cursor-pointer hover:bg-amber-500/10 rounded px-1 transition-colors"
                onClick={() => openDimEditor("rear", "Rear Boundary Setback", rearLhsMeasured, minRear)}
                title="Click to edit Rear Boundary Setback"
              >
                <span className="text-slate-600 font-medium">Rear Setback</span>
                <span className="font-bold text-brand-navy flex items-center gap-1">
                  {isOmp ? `${Math.max(0, rearLhsMeasured - 0.45).toFixed(2)} m` : `${rearLhsMeasured.toFixed(2)} m`}
                  <span className="text-[1.8mm] text-amber-500 font-normal">✎</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Contact Bar - Exact same footer, unchanged */}
      <div className="mt-auto pt-[1mm]">
        <ContactStrip d={d} />
      </div>

      {/* Dimension Quick Edit Floating Modal */}
      {editingDim && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingDim(null);
          }}
        >
          <div className="w-full max-w-sm rounded-xl border border-brand-gold/50 bg-slate-900 p-5 shadow-2xl text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
                  <Ruler className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">{editingDim.label}</h3>
                  <p className="text-[11px] text-slate-400">Position floorplan to exact measurement</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingDim(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Setback Distance (meters)
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const cur = parseFloat(dimInputValue) || 0;
                      setDimInputValue(Math.max(0, cur - 0.1).toFixed(2));
                    }}
                    className="h-9 px-3 rounded-lg border border-slate-700 bg-slate-800 text-sm font-bold text-slate-200 hover:bg-slate-700 active:scale-95"
                  >
                    -0.1m
                  </button>
                  <input
                    type="number"
                    step="0.05"
                    autoFocus
                    value={dimInputValue}
                    onChange={(e) => setDimInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyDimEdit();
                      } else if (e.key === "Escape") {
                        setEditingDim(null);
                      }
                    }}
                    className="flex-1 h-9 rounded-lg border border-brand-gold/60 bg-slate-950 px-3 text-center text-base font-bold text-amber-300 focus:outline-hidden focus:ring-2 focus:ring-brand-gold"
                    placeholder="e.g. 3.80"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const cur = parseFloat(dimInputValue) || 0;
                      setDimInputValue((cur + 0.1).toFixed(2));
                    }}
                    className="h-9 px-3 rounded-lg border border-slate-700 bg-slate-800 text-sm font-bold text-slate-200 hover:bg-slate-700 active:scale-95"
                  >
                    +0.1m
                  </button>
                </div>
              </div>

              <div className="rounded-lg bg-slate-800/60 p-2.5 text-[11px] text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Standard Estate Minimum:</span>
                  <span className="font-semibold text-slate-300">{editingDim.minValue.toFixed(2)}m</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Scaled Position:</span>
                  <span className="font-semibold text-amber-300">{editingDim.currentValue.toFixed(2)}m</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingDim(null)}
                className="flex-1 h-8.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyDimEdit}
                className="flex-1 h-8.5 rounded-lg bg-brand-gold hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm transition-all"
              >
                Apply &amp; Position
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
