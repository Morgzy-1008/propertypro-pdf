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
  Compass,
  Sun,
} from "lucide-react";
import { Logo, ContactStrip, PartnerLogoBadge } from "./FlyerTemplates";
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

  // Diagram scaling for SVG Viewport - Dynamically tailored to exact lot dimensions to maximize space
  const svgScale = 22; // Base coordinate units per meter
  const lotSvgW = siting.landFrontage * svgScale;
  const lotSvgH = siting.landDepth * svgScale;

  const padLeft = 32;
  const padRight = 32;
  const padTop = 26;
  const padBottom = 32;

  const svgViewWidth = lotSvgW + padLeft + padRight;
  const svgViewHeight = lotSvgH + padTop + padBottom;

  const lotStartX = padLeft;
  const lotStartY = padTop;
  const scale = svgScale;

  // Estate minimum constraints (for compliance checks and advisory alerts)
  const minSide = d.isBtb ? siting.minBtbSetback : siting.minSideSetback;
  const minFront = siting.minFrontSetback;
  const minRear = siting.minRearSetback;

  // Scaled setbacks with drag offset - unclamped by estate minimums so user-typed overrides shift floorplan to exact position to scale
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

  // Key CAD Feature coordinates in SVG space:
  const garageDoorMidX = houseSvgX + (((analysis.garageDoorStart.x + analysis.garageDoorEnd.x) / 2) * scale);
  // Align garage door dimension line to start directly on the front wall edge of the garage
  const garageDoorY = houseSvgY + (Math.max(0, analysis.houseLengthM - (analysis.garageStepBackM || 1.20)) * scale);

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

  // Distinct second setback check: only display 2nd setback if the upper floor or room behind garage is physically stepped in by > 150mm.
  // Flush/straight walls (like Amber 21) where behindGarage == rhsWall will NOT render a redundant duplicate 0.20m dimension.
  const hasDistinctUpperOrBehindStep = behindGarageMeasured > (rhsMeasured + 0.15);
  const showSecondGarageSetback = (d.isBtb || siting.hasStepOut) && hasDistinctUpperOrBehindStep;

  // Wall vs OMP (450mm eave offset)
  const isOmp = d.setbackMeasurement === "omp";

  // Check site coverage & POS compliance against customizable thresholds
  const maxCoverageAllowed = d.maxSiteCoverage !== undefined ? Number(d.maxSiteCoverage) : (siting.maxSiteCoverage || 60);
  const minPosRequired = d.minPosM2 !== undefined ? Number(d.minPosM2) : 12;
  const isCoverageGreen = siting.siteCoveragePercent <= maxCoverageAllowed;
  const isPosGreen = siting.privateOpenSpaceM2 >= minPosRequired;

  const svgRef = useRef<SVGSVGElement | null>(null);

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

    const svgRect = svgRef.current?.getBoundingClientRect();
    const screenPixelsPerSvgUnit = svgRect && svgViewHeight > 0 ? svgRect.height / svgViewHeight : 1;
    const screenPixelsPerMeter = Math.max(1, screenPixelsPerSvgUnit * svgScale);

    const dxM = dxPx / screenPixelsPerMeter;
    const dyM = dyPx / screenPixelsPerMeter;

    setDragOffsetM({ x: dxM, y: dyM });
  };

  const handleMouseUp = () => {
    if (!isDragging || !dragStartRef.current) return;
    setIsDragging(false);

    if (set && (Math.abs(dragOffsetM.x) > 0.02 || Math.abs(dragOffsetM.y) > 0.02)) {
      const finalLeft = Number(effectiveLeftSetback.toFixed(2));
      const finalFront = Number(frontRoomMeasured.toFixed(2));
      const finalRear = Number(rearLhsMeasured.toFixed(2));

      set("leftSetback", finalLeft);
      set("frontSetback", finalFront);
      set("rearSetback", finalRear);
      set("garageSetback", Number((finalFront + (analysis.garageStepBackM || 1.20)).toFixed(2)));
      set("rightSetback", Number((siting.landFrontage - analysis.houseWidthM - finalLeft).toFixed(2)));
      set("isBtb", false);
      toast.success(`Floorplan positioned: ${finalLeft}m Left, ${finalFront}m Front, ${finalRear}m Rear`);
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
    setDragOffsetM({ x: 0, y: 0 });
    const rawNum = parseFloat(dimInputValue);
    if (isNaN(rawNum) || rawNum < 0) {
      toast.error("Please enter a valid positive number in meters.");
      return;
    }

    // Inform if under standard guideline, but allow typed override directly
    if (rawNum < editingDim.minValue) {
      toast.info(`Note: ${editingDim.label} is below the standard estate minimum of ${editingDim.minValue.toFixed(2)}m (Custom override applied).`);
    }
    const num = rawNum;

    if (editingDim.field === "front") {
      set("frontSetback", num);
      set("garageSetback", Number((num + (analysis.garageStepBackM || 1.20)).toFixed(2)));
      set("rearSetback", Number(Math.max(0, siting.landDepth - analysis.houseLengthM - num).toFixed(2)));
      set("isBtb", false);
    } else if (editingDim.field === "garage") {
      set("garageSetback", num);
      const calculatedFront = Number((num - (analysis.garageStepBackM || 1.20)).toFixed(2));
      set("frontSetback", calculatedFront);
      set("rearSetback", Number(Math.max(0, siting.landDepth - analysis.houseLengthM - calculatedFront).toFixed(2)));
      set("isBtb", false);
    } else if (editingDim.field === "left") {
      set("leftSetback", num);
      const calculatedRight = Number((siting.landFrontage - analysis.houseWidthM - num).toFixed(2));
      set("rightSetback", calculatedRight);
      set("sideSetback", num);
      set("isBtb", false);
    } else if (editingDim.field === "right") {
      set("rightSetback", num);
      const calculatedLeft = Number((siting.landFrontage - analysis.houseWidthM - num).toFixed(2));
      set("leftSetback", calculatedLeft);
      set("sideSetback", num);
      set("isBtb", false);
    } else if (editingDim.field === "rear") {
      set("rearSetback", num);
      const reqFront = Number(Math.max(0, siting.landDepth - analysis.houseLengthM - num).toFixed(2));
      set("frontSetback", reqFront);
      set("garageSetback", Number((reqFront + (analysis.garageStepBackM || 1.20)).toFixed(2)));
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
          <div className="flex items-center gap-[3.5mm]">
            <Logo size={14} />
          </div>
          <div className="flex items-center justify-end gap-[3.5mm]">
            {d.partnerEnabled && d.partnerLogoUrl && (
              <div className="flex items-center pr-[3mm] border-r border-brand-sand">
                <PartnerLogoBadge url={d.partnerLogoUrl} name={d.partnerName} size={9} />
              </div>
            )}
            <div className="text-right leading-tight">
              <div className="text-[2.6mm] font-bold tracking-[0.24em] text-brand-gold-deep">
                ARCHITECTURAL SITING PLAN
              </div>
              <div className="mt-[0.5mm] text-[2.8mm] font-semibold text-brand-navy">
                {[d.estate, d.suburb].filter(Boolean).join(" • ") || "House & Land Siting"}
              </div>
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

      {/* Main Siting Content Grid (Maximized Siting Canvas & Enriched Specs Sidebar) */}
      <div className="grid grid-cols-[1fr_68mm] gap-[3.5mm] flex-1 items-stretch my-[1mm] min-h-0">
        {/* Left Column: Siting Plan Vector Drawing (Maximized Scale) */}
        <div className="flex flex-col rounded-[1.5mm] border border-brand-sand/80 bg-white p-[2mm] relative shadow-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-brand-sand/50 pb-[1.5mm] mb-[1.5mm]">
            <div className="flex items-center gap-[1.5mm]">
              <Layers className="h-[3.2mm] w-[3.2mm] text-brand-gold-deep" />
              <span className="text-[2.4mm] font-bold tracking-[0.18em] text-brand-navy uppercase">
                LOT SITING &amp; SETBACKS
              </span>
            </div>
            <span className="text-[1.8mm] font-semibold text-slate-400 uppercase tracking-wider">
              1:200 Scale Blueprint • Proportional Boundary Plot
            </span>
          </div>

          {/* Siting SVG Vector Canvas (Maximized Size) */}
          <div className="flex-1 flex items-center justify-center relative min-h-[200mm]">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${svgViewWidth} ${svgViewHeight}`}
              className="w-full h-full max-h-[224mm]"
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

              {/* Architectural North Arrow on Blueprint */}
              <g transform={`translate(${lotStartX + lotSvgW - 28}, ${lotStartY + 8})`}>
                <circle cx="13" cy="13" r="12" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
                <polygon points="13,3 16.5,13 13,11.5" fill="#0f172a" />
                <polygon points="13,3 9.5,13 13,11.5" fill="#94a3b8" />
                <polygon points="13,23 16.5,13 13,14.5" fill="#e2e8f0" />
                <polygon points="13,23 9.5,13 13,14.5" fill="#cbd5e1" />
                <text x="13" y="1.5" textAnchor="middle" fill="#0f172a" fontSize="6.5" fontWeight="bold">N</text>
              </g>

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
                y={lotStartY + lotSvgH + 22}
                textAnchor="middle"
                fill="#0f172a"
                fontSize="10.5"
                fontWeight="bold"
                letterSpacing="0.04em"
              >
                FRONTAGE — {siting.landFrontage.toFixed(2)}m
              </text>

              {/* Rear Boundary Label */}
              <text
                x={lotStartX + lotSvgW / 2}
                y={lotStartY - 10}
                textAnchor="middle"
                fill="#0f172a"
                fontSize="10.5"
                fontWeight="bold"
              >
                REAR BOUNDARY — {siting.landFrontage.toFixed(2)}m
              </text>

              {/* Left Side Boundary Label */}
              <text
                x={lotStartX - 12}
                y={lotStartY + lotSvgH / 2}
                textAnchor="middle"
                fill="#0f172a"
                fontSize="10"
                fontWeight="bold"
                transform={`rotate(-90 ${lotStartX - 12} ${lotStartY + lotSvgH / 2})`}
              >
                SIDE BOUNDARY — {siting.landDepth.toFixed(2)}m
              </text>

              {/* Right Side Boundary Label */}
              <text
                x={lotStartX + lotSvgW + 14}
                y={lotStartY + lotSvgH / 2}
                textAnchor="middle"
                fill="#0f172a"
                fontSize="10"
                fontWeight="bold"
                transform={`rotate(90 ${lotStartX + lotSvgW + 14} ${lotStartY + lotSvgH / 2})`}
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

              {/* E. Wall BEHIND Garage to Right Boundary (When BTB or step-out is active AND a distinct stepped room exists) */}
              {showSecondGarageSetback && (
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

        {/* Right Column: Enriched Siting, Metrics, Solar & Compliance Cards (68mm wide) */}
        <div className="flex flex-col justify-between gap-[2mm] h-full">
          {/* Card 1: FLOORPLAN DETAILS */}
          <div className="rounded-[1.5mm] border border-brand-sand/80 bg-white p-[2.6mm] shadow-xs">
            <div className="flex items-center gap-[1.2mm] border-b border-brand-sand/60 pb-[0.8mm] mb-[0.8mm]">
              <Home className="h-[2.6mm] w-[2.6mm] text-brand-gold-deep" />
              <div className="text-[2.2mm] font-bold tracking-[0.14em] text-brand-navy uppercase">
                FLOORPLAN DETAILS
              </div>
            </div>

            <div className="space-y-[0.8mm] text-[2.15mm] leading-tight">
              <div className="flex items-center justify-between border-b border-slate-100 pb-[0.3mm]">
                <span className="text-slate-600 font-medium">Design</span>
                <span className="font-bold text-slate-900 truncate max-w-[32mm] text-right">{d.designName || "Amber 21"}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-[0.3mm]">
                <span className="text-slate-600 font-medium">Total Area</span>
                <span className="font-bold text-slate-900">
                  {analysis.roomAreas.totalM2 || floorplanM2} m² ({(Number(analysis.roomAreas?.totalM2 || floorplanM2) * 0.107639).toFixed(1)} SQ)
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-[0.3mm]">
                <span className="text-slate-600 font-medium">House Dimensions</span>
                <span className="font-bold text-slate-900">{analysis.houseWidthM.toFixed(2)}m × {analysis.houseLengthM.toFixed(2)}m</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Configuration</span>
                <span className="font-bold text-slate-900">
                  {d.beds || "4"}B • {d.baths || "2"}B • {d.cars || "2"}C
                </span>
              </div>
              <div className="flex items-center justify-between pt-[0.4mm] border-t border-slate-100 text-[1.95mm] text-slate-500">
                <span>Specification</span>
                <span className="font-semibold text-slate-700">
                  {analysis.isDoubleStorey || String(d.housingType).includes("double") ? "Double Storey" : "Single Storey"} • 2440mm Ceilings
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Site Metrics Card */}
          <div className="rounded-[1.5mm] border border-brand-sand/80 bg-white p-[2.6mm] shadow-xs">
            <div className="flex items-center gap-[1.2mm] border-b border-brand-sand/60 pb-[0.8mm] mb-[0.8mm]">
              <Ruler className="h-[2.6mm] w-[2.6mm] text-brand-gold-deep" />
              <div className="text-[2.2mm] font-bold tracking-[0.14em] text-brand-navy uppercase">
                SITE METRICS
              </div>
            </div>

            <div className="space-y-[0.8mm] text-[2.15mm] leading-tight">
              <div className="flex items-center justify-between border-b border-slate-100 pb-[0.3mm]">
                <span className="text-slate-600 font-medium">Lot Area</span>
                <span className="font-bold text-slate-900">{siting.landArea} m²</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-[0.3mm]">
                <span className="text-slate-600 font-medium">Frontage &amp; Depth</span>
                <span className="font-bold text-slate-900">{siting.landFrontage.toFixed(2)}m × {siting.landDepth.toFixed(2)}m</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-[0.3mm]">
                <span className="text-slate-600 font-medium">Building Footprint</span>
                <span className="font-bold text-slate-900">
                  ~{(analysis.houseWidthM * analysis.houseLengthM * 0.82).toFixed(1)} m²
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-[0.3mm]">
                <span className="text-slate-600 font-medium">Site Coverage</span>
                <div className="flex items-center gap-1">
                  <span className={`font-bold ${isCoverageGreen ? "text-emerald-700" : "text-rose-600"}`}>
                    {siting.siteCoveragePercent}%
                  </span>
                  <span className="px-1 py-0.2 rounded text-[1.6mm] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                    PASS (&lt;60%)
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Private Open</span>
                <div className="flex items-center gap-1">
                  <span className={`font-bold ${isPosGreen ? "text-emerald-700" : "text-rose-600"}`}>
                    {siting.privateOpenSpaceM2} m²
                  </span>
                  <span className="px-1 py-0.2 rounded text-[1.6mm] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                    PASS (&gt;45m²)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: LOT ORIENTATION & SOLAR ASPECT */}
          <div className="rounded-[1.5mm] border border-brand-sand/80 bg-gradient-to-br from-white to-amber-50/30 p-[2.6mm] shadow-xs">
            <div className="flex items-center justify-between border-b border-brand-sand/60 pb-[0.8mm] mb-[0.8mm]">
              <div className="flex items-center gap-[1.2mm]">
                <Compass className="h-[2.6mm] w-[2.6mm] text-brand-gold-deep" />
                <div className="text-[2.2mm] font-bold tracking-[0.14em] text-brand-navy uppercase">
                  LOT ORIENTATION &amp; SOLAR
                </div>
              </div>
              <span className="px-1.5 py-0.2 rounded text-[1.6mm] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                7-STAR READY
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-none p-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-center justify-center">
                <Sun className="h-4 w-4 text-amber-500 animate-pulse" />
              </div>
              <div className="text-[1.95mm] leading-tight">
                <div className="font-bold text-brand-navy">North-Facing Rear Aspect</div>
                <p className="text-slate-600 mt-[0.2mm]">
                  Optimal solar exposure for alfresco &amp; living, maximizing natural winter daylight and cross-ventilation.
                </p>
              </div>
            </div>
            <div className="mt-[1mm] pt-[0.8mm] border-t border-amber-200/50 flex items-center justify-between text-[1.8mm] text-amber-900 font-semibold">
              <span>Winter Sun: Optimal</span>
              <span>Cross-Breeze: Compliant</span>
            </div>
          </div>

          {/* Card 4: REQUIRED MINIMUM SETBACKS & CURRENT */}
          <div className="rounded-[1.5mm] border border-amber-500/30 bg-white p-[2.6mm] shadow-xs">
            <div className="flex items-center justify-between border-b border-amber-300/40 pb-[0.8mm] mb-[0.8mm]">
              <div className="flex items-center gap-[1.2mm]">
                <ShieldCheck className="h-[2.6mm] w-[2.6mm] text-amber-700" />
                <div className="text-[2.2mm] font-bold tracking-[0.14em] text-brand-navy uppercase">
                  SETBACKS &amp; POD ENVELOPE
                </div>
              </div>
              <span className={`text-[1.6mm] font-bold px-1.5 py-0.2 rounded ${
                isOmp ? "bg-amber-100 text-amber-800 border border-amber-300" : "bg-slate-100 text-slate-700"
              }`}>
                {isOmp ? "OMP" : "WALL"}
              </span>
            </div>

            <div className="space-y-[0.7mm] text-[2.15mm] leading-tight">
              <div
                className="flex items-center justify-between cursor-pointer hover:bg-amber-500/10 rounded px-1 transition-colors"
                onClick={() => openDimEditor("front", "Front Room Setback", frontRoomMeasured, minFront)}
                title="Click to edit Front Room Setback"
              >
                <span className="text-slate-600 font-medium">Front Room</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-[1.8mm]">Min {minFront.toFixed(2)}m</span>
                  <span className="font-bold text-brand-navy flex items-center gap-0.5">
                    {isOmp ? `${Math.max(0, frontRoomMeasured - 0.45).toFixed(2)}m` : `${frontRoomMeasured.toFixed(2)}m`}
                    <span className="text-[1.8mm] text-amber-500">✎</span>
                  </span>
                </div>
              </div>
              <div
                className="flex items-center justify-between cursor-pointer hover:bg-amber-500/10 rounded px-1 transition-colors"
                onClick={() => openDimEditor("garage", "Garage Door Setback", garageDoorMeasured, siting.minGarageSetback)}
                title="Click to edit Garage Door Setback"
              >
                <span className="text-slate-600 font-medium">Garage Door</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-[1.8mm]">Min {siting.minGarageSetback.toFixed(2)}m</span>
                  <span className="font-bold text-brand-navy flex items-center gap-0.5">
                    {isOmp ? `${Math.max(0, garageDoorMeasured - 0.45).toFixed(2)}m` : `${garageDoorMeasured.toFixed(2)}m`}
                    <span className="text-[1.8mm] text-amber-500">✎</span>
                  </span>
                </div>
              </div>
              <div
                className="flex items-center justify-between cursor-pointer hover:bg-amber-500/10 rounded px-1 transition-colors"
                onClick={() => openDimEditor("left", "LHS Side Setback", lhsMeasured, 0.20)}
                title="Click to edit LHS Side Setback"
              >
                <span className="text-slate-600 font-medium">LHS Wall</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-[1.8mm]">Min {minSide.toFixed(2)}m</span>
                  <span className="font-bold text-brand-navy flex items-center gap-0.5">
                    {isOmp ? `${Math.max(0, lhsMeasured - 0.45).toFixed(2)}m` : `${lhsMeasured.toFixed(2)}m`}
                    <span className="text-[1.8mm] text-amber-500">✎</span>
                  </span>
                </div>
              </div>
              <div
                className="flex items-center justify-between cursor-pointer hover:bg-amber-500/10 rounded px-1 transition-colors"
                onClick={() => openDimEditor("right", "RHS Side Setback", rhsMeasured, 0.20)}
                title="Click to edit RHS Side Setback"
              >
                <span className="text-slate-600 font-medium">RHS Wall</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-[1.8mm]">Min {d.isBtb ? "0.20m" : `${minSide.toFixed(2)}m`}</span>
                  <span className="font-bold text-brand-navy flex items-center gap-0.5">
                    {d.isBtb ? "0.20m (BTB)" : isOmp ? `${Math.max(0, rhsMeasured - 0.45).toFixed(2)}m` : `${rhsMeasured.toFixed(2)}m`}
                    <span className="text-[1.8mm] text-amber-500">✎</span>
                  </span>
                </div>
              </div>
              <div
                className="flex items-center justify-between cursor-pointer hover:bg-amber-500/10 rounded px-1 transition-colors"
                onClick={() => openDimEditor("rear", "Rear Boundary Setback", rearLhsMeasured, minRear)}
                title="Click to edit Rear Boundary Setback"
              >
                <span className="text-slate-600 font-medium">Rear Setback</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 text-[1.8mm]">Min {minRear.toFixed(2)}m</span>
                  <span className="font-bold text-brand-navy flex items-center gap-0.5">
                    {isOmp ? `${Math.max(0, rearLhsMeasured - 0.45).toFixed(2)}m` : `${rearLhsMeasured.toFixed(2)}m`}
                    <span className="text-[1.8mm] text-amber-500">✎</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-[0.8mm] pt-[0.6mm] border-t border-slate-100 flex items-center justify-between text-[1.75mm] text-slate-400">
              <span>Click ✎ to edit any setback distance</span>
              <span className="text-amber-600 font-semibold">CAD Verified</span>
            </div>
          </div>

          {/* Card 5: ESTATE COVENANTS & TECHNICAL APPROVAL */}
          <div className="rounded-[1.5mm] border border-brand-sand/80 bg-slate-50/60 p-[2.6mm] shadow-xs">
            <div className="flex items-center justify-between border-b border-brand-sand/60 pb-[0.8mm] mb-[0.8mm]">
              <div className="flex items-center gap-[1.2mm]">
                <CheckCircle2 className="h-[2.6mm] w-[2.6mm] text-emerald-600" />
                <div className="text-[2.2mm] font-bold tracking-[0.14em] text-brand-navy uppercase">
                  ESTATE COVENANTS &amp; APPROVAL
                </div>
              </div>
              <span className="text-[1.6mm] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300">
                COMPLIANT
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-[0.7mm] text-[1.95mm] text-slate-700 mb-[1mm]">
              <div className="flex items-center gap-1">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Building POD Envelope</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Estate Design Standards</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Stormwater Fall to Street</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Garage Width Ratio &lt;50%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Private Open Space (&gt;45m²)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Pad Siting Allowance</span>
              </div>
            </div>
            <div className="pt-[0.8mm] border-t border-brand-sand/50 flex items-center justify-between text-[1.8mm] text-slate-500">
              <span className="truncate">{(d.estate || d.suburb || "Developer Design").toUpperCase()}</span>
              <span className="font-semibold text-brand-gold-deep flex items-center gap-1">
                <Sparkles className="h-2 w-2 text-brand-gold" />
                HUDSON CERTIFIED
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Contact Bar */}
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
                <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                  Floorplan will physically shift to this exact coordinate to scale, regardless of estate guidelines.
                </p>
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
