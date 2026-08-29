import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  MapPin,
  Download,
  Building,
  Layers,
  Upload,
  RotateCw,
  FlipHorizontal,
  Ruler,
  Send,
  Plus,
  RefreshCw,
  MousePointer,
  Image as ImageIcon,
  CheckCircle2,
  Sparkles,
  Sliders,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { jsPDF } from "jspdf";
import {
  QUEENSLAND_ESTATE_POD_PRESETS,
  type EstatePodRule,
} from "@/lib/siting/estatePodPresets";
import {
  type Point2D,
  type LotPolygon,
  type SitedHouseState,
  type LiveSetbacks,
  createStandardLotPolygon,
  calculatePolygonAreaM2,
  calculateLiveSetbacks,
  distanceBetween,
  getHouseCornerVertices,
} from "@/lib/siting/sitingGeometry";
import { pdfDocumentToPagesAndText } from "@/lib/pdfPages";
import { type DetectedFloorplan } from "@/lib/floorplan/floorplanDetector";
import { saveTenderToIdb, findFloorplanUrl } from "@/lib/tender/tenderStorage";
import { plansForDesign } from "@/components/flyer/floorplans";
import {
  scanAndVectorizeFloorplan,
  generateWallVectorAnalysis,
  type WallVectorAnalysis,
} from "@/components/flyer/floorplanVisionEngine";

interface AdvancedSitingStudioProps {
  detectedFloorplan?: DetectedFloorplan | null;
  onSendToQuoting?: (sitingData: any) => void;
  onSendToTender?: (sitingData: any) => void;
}

type LotMode = "rectangle" | "custom_polygon" | "disclosure_plan";

export function AdvancedSitingStudio({
  detectedFloorplan,
  onSendToQuoting,
  onSendToTender,
}: AdvancedSitingStudioProps) {
  const navigate = useNavigate();

  // Mode Selection
  const [lotMode, setLotMode] = useState<LotMode>("rectangle");
  const [selectedEstateId, setSelectedEstateId] = useState<string>("flagstone");

  // Standard Lot Dimensions
  const [frontageM, setFrontageM] = useState<number>(14.0);
  const [depthM, setDepthM] = useState<number>(30.0);

  // Custom Polygon Vertices in meters relative to lot origin
  const [polygonPoints, setPolygonPoints] = useState<Point2D[]>([
    { x: 0, y: 0 }, // Rear Left
    { x: 14.0, y: 0 }, // Rear Right
    { x: 14.0, y: 30.0 }, // Front Right
    { x: 0, y: 30.0 }, // Front Left
  ]);

  // House Placement State
  const [houseState, setHouseState] = useState<SitedHouseState>(() => ({
    designName: detectedFloorplan?.matchedDesignName || "Amber 21",
    widthM: detectedFloorplan?.widthM || 10.55,
    lengthM: detectedFloorplan?.lengthM || 20.15,
    totalM2: detectedFloorplan?.totalM2 || 192.2,
    centerX: 7.0,
    centerY: 16.0,
    rotationDeg: 0,
    isFlipped: false,
    garageSide: "RHS",
    isBtbActive: true,
    hasDriveway: true,
    drivewayWidthM: 5.2,
  }));

  // Floorplan image state (Cropped with all internal layout)
  const [floorplanImageUrl, setFloorplanImageUrl] = useState<string>("");
  const [croppedFloorplanImage, setCroppedFloorplanImage] = useState<HTMLImageElement | null>(null);
  const [isCroppingFloorplan, setIsCroppingFloorplan] = useState<boolean>(false);
  const [wallAnalysis, setWallAnalysis] = useState<WallVectorAnalysis>(() =>
    generateWallVectorAnalysis(houseState.designName)
  );

  // Load and auto-crop floorplan when detectedFloorplan changes or initial mount
  useEffect(() => {
    let active = true;
    const targetDesign = detectedFloorplan?.matchedDesignName || houseState.designName;
    let url = detectedFloorplan?.floorplanUrl || "";

    if (!url) {
      const directPlans = plansForDesign(targetDesign);
      if (directPlans.length > 0 && directPlans[0].url) {
        url = directPlans[0].url;
      } else {
        url = findFloorplanUrl(targetDesign);
      }
    }

    setFloorplanImageUrl(url);

    if (url) {
      setIsCroppingFloorplan(true);
      scanAndVectorizeFloorplan(url, targetDesign)
        .then((analysis) => {
          if (!active) return;
          setWallAnalysis(analysis);
          const finalUrl = analysis.croppedUrl || url;
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            if (active) {
              setCroppedFloorplanImage(img);
              setIsCroppingFloorplan(false);
            }
          };
          img.onerror = () => {
            if (active) setIsCroppingFloorplan(false);
          };
          img.src = finalUrl;
        })
        .catch(() => {
          if (active) setIsCroppingFloorplan(false);
        });
    }

    if (detectedFloorplan) {
      setHouseState((prev) => ({
        ...prev,
        designName: detectedFloorplan.matchedDesignName,
        widthM: detectedFloorplan.widthM || 10.55,
        lengthM: detectedFloorplan.lengthM || 20.15,
        totalM2: detectedFloorplan.totalM2 || 192.2,
        centerX: frontageM / 2,
        centerY: depthM / 2 + 1.0,
      }));
    }

    return () => {
      active = false;
    };
  }, [detectedFloorplan]);

  // Disclosure Plan Underlay State
  const [disclosureImage, setDisclosureImage] = useState<HTMLImageElement | null>(null);
  const [disclosureFileName, setDisclosureFileName] = useState<string>("");
  const [disclosureOpacity, setDisclosureOpacity] = useState<number>(0.45);
  const [isCalibratingScale, setIsCalibratingScale] = useState<boolean>(false);
  const [calibrationPoints, setCalibrationPoints] = useState<Point2D[]>([]);
  const [scalePixelsPerMeter, setScalePixelsPerMeter] = useState<number>(20.0);
  const [isSettingBoundaryVertices, setIsSettingBoundaryVertices] = useState<boolean>(false);

  // Canvas & Interaction
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDraggingHouse, setIsDraggingHouse] = useState(false);
  const [isRotatingHouse, setIsRotatingHouse] = useState(false);
  const [dragVertexIndex, setDragVertexIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<Point2D>({ x: 0, y: 0 });

  // North Compass Angle
  const [northAngleDeg, setNorthAngleDeg] = useState<number>(0);

  const currentPodRule: EstatePodRule = useMemo(() => {
    return (
      QUEENSLAND_ESTATE_POD_PRESETS.find((p) => p.id === selectedEstateId) ||
      QUEENSLAND_ESTATE_POD_PRESETS[0]
    );
  }, [selectedEstateId]);

  // Construct active lot polygon
  const activeLot: LotPolygon = useMemo(() => {
    if (lotMode === "rectangle") {
      return createStandardLotPolygon(frontageM, depthM);
    }
    const area = calculatePolygonAreaM2(polygonPoints);
    const segs = polygonPoints.map((pt, i) => {
      const next = polygonPoints[(i + 1) % polygonPoints.length];
      const len = distanceBetween(pt, next);
      let type: "front" | "rear" | "left" | "right" | "custom" = "custom";
      if (i === 0) type = "rear";
      else if (i === 1) type = "right";
      else if (i === 2) type = "front";
      else if (i === 3) type = "left";
      return {
        id: `seg_${i}`,
        type,
        name: `Boundary ${i + 1} (${len.toFixed(1)}m)`,
        start: pt,
        end: next,
        lengthM: len,
      };
    });

    return {
      vertices: polygonPoints,
      frontageM: frontageM || 14.0,
      depthM: depthM || 30.0,
      totalAreaM2: area || frontageM * depthM,
      isCustomPolygon: true,
      segments: segs,
    };
  }, [lotMode, frontageM, depthM, polygonPoints]);

  // Calculate live setbacks & compliance
  const liveSetbacks: LiveSetbacks = useMemo(() => {
    const maxCov = currentPodRule.maxSiteCoveragePct || 60;
    return calculateLiveSetbacks(activeLot, houseState, maxCov);
  }, [activeLot, houseState, currentPodRule]);

  // Canvas coordinate converters
  const getCanvasTransform = useCallback(() => {
    const W = 1000;
    const H = 1020;
    const paddingX = 90;
    const paddingTop = 90;
    const paddingBottom = 90;

    let minX = 0, maxX = frontageM, minY = 0, maxY = depthM;
    if (lotMode !== "rectangle") {
      for (const p of polygonPoints) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
    }

    const lotSpanX = Math.max(10, maxX - minX);
    const lotSpanY = Math.max(15, maxY - minY);

    const scaleX = (W - paddingX * 2) / lotSpanX;
    const scaleY = (H - paddingTop - paddingBottom) / lotSpanY;
    const scale = Math.min(scaleX, scaleY) * 0.90;

    const originCanvasX = (W - lotSpanX * scale) / 2 - minX * scale;
    const originCanvasY = paddingTop + (H - paddingTop - paddingBottom - lotSpanY * scale) / 2 - minY * scale;

    return {
      W,
      H,
      scale,
      toCanvas: (p: Point2D): Point2D => ({
        x: originCanvasX + p.x * scale,
        y: originCanvasY + p.y * scale,
      }),
      toMeters: (canvasPt: Point2D): Point2D => ({
        x: (canvasPt.x - originCanvasX) / scale,
        y: (canvasPt.y - originCanvasY) / scale,
      }),
    };
  }, [frontageM, depthM, lotMode, polygonPoints]);

  // Main Canvas Render — Pure White Architectural Presentation with Black Boundaries
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { W, H, scale, toCanvas } = getCanvasTransform();
    canvas.width = W;
    canvas.height = H;

    // 1. Pure Architectural White Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // Subtle fine architectural grid lines
    ctx.strokeStyle = "#f1f5f9";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 35) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 35) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Draw Disclosure Plan Image Underlay if present
    if (disclosureImage && (lotMode === "disclosure_plan" || disclosureOpacity > 0)) {
      ctx.save();
      ctx.globalAlpha = disclosureOpacity;
      const imgCenter = toCanvas({ x: frontageM / 2, y: depthM / 2 });
      const imgW = disclosureImage.width * (scale / scalePixelsPerMeter);
      const imgH = disclosureImage.height * (scale / scalePixelsPerMeter);
      ctx.drawImage(disclosureImage, imgCenter.x - imgW / 2, imgCenter.y - imgH / 2, imgW, imgH);
      ctx.restore();
    }

    // 2. Draw Lot Polygon (Clean white/soft yard with solid black boundary lines)
    const lotCanvasPts = activeLot.vertices.map(toCanvas);
    if (lotCanvasPts.length >= 3) {
      ctx.beginPath();
      ctx.moveTo(lotCanvasPts[0].x, lotCanvasPts[0].y);
      for (let i = 1; i < lotCanvasPts.length; i++) {
        ctx.lineTo(lotCanvasPts[i].x, lotCanvasPts[i].y);
      }
      ctx.closePath();

      // Soft architectural white-slate fill
      ctx.fillStyle = "#fafbfd";
      ctx.fill();

      // Crisp Solid Black Boundary Line (2.5px width)
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Draw Boundary Dimension Labels in Crisp Black
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 11px sans-serif";
      for (let i = 0; i < lotCanvasPts.length; i++) {
        const p1 = lotCanvasPts[i];
        const p2 = lotCanvasPts[(i + 1) % lotCanvasPts.length];
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const realSeg = activeLot.segments[i];
        const lenText = realSeg ? `${realSeg.lengthM.toFixed(2)}m` : "";

        // Position label slightly outside the boundary
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const len = Math.hypot(dx, dy) || 1;
        const normX = -dy / len;
        const normY = dx / len;
        const labelX = midX + normX * 14;
        const labelY = midY + normY * 14;

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(lenText, labelX, labelY);
      }

      // Draw Interactive Golden Pins in Custom Mode
      if (lotMode === "custom_polygon" || isSettingBoundaryVertices) {
        for (let i = 0; i < lotCanvasPts.length; i++) {
          const pt = lotCanvasPts[i];
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
          ctx.fillStyle = "#f59e0b";
          ctx.fill();
          ctx.strokeStyle = "#0f172a";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }

    // Street Frontage Indicator at Bottom
    const frontStart = toCanvas(activeLot.vertices[activeLot.vertices.length - 2] || { x: frontageM, y: depthM });
    const frontEnd = toCanvas(activeLot.vertices[activeLot.vertices.length - 1] || { x: 0, y: depthM });
    const streetY = Math.max(frontStart.y, frontEnd.y);

    // Street Frontage Indicator at Bottom
    ctx.fillStyle = "#64748b";
    ctx.font = "bold 11.5px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`PRIMARY ROAD / STREET FRONTAGE (${activeLot.frontageM.toFixed(2)}m)`, (frontStart.x + frontEnd.x) / 2, streetY + 22);
    ctx.textAlign = "left";

    // 3. Draw Floorplan Footprint & Internal Layout (Clean Architectural Rendering)
    const houseCenterCanvas = toCanvas({ x: houseState.centerX, y: houseState.centerY });
    const houseW = houseState.widthM * scale;
    const houseL = houseState.lengthM * scale;

    ctx.save();
    ctx.translate(houseCenterCanvas.x, houseCenterCanvas.y);
    ctx.rotate((houseState.rotationDeg * Math.PI) / 180);

    // Active drag indicator outline (only visible while dragging)
    if (isDraggingHouse) {
      ctx.save();
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2.0;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(-houseW / 2 - 2, -houseL / 2 - 2, houseW + 4, houseL + 4);
      ctx.restore();
    }

    // Draw Real Cropped Floorplan with Internal Layout
    if (croppedFloorplanImage) {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      // Handle horizontal garage flip
      if (houseState.garageSide === "LHS") {
        ctx.scale(-1, 1);
      }
      ctx.drawImage(
        croppedFloorplanImage,
        -houseW / 2,
        -houseL / 2,
        houseW,
        houseL
      );
      ctx.restore();
    } else {
      // Fallback architectural schematic if image is still loading
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-houseW / 2, -houseL / 2, houseW, houseL);
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-houseW / 2, -houseL / 2, houseW, houseL);

      // Garage Box
      const garW = 5.8 * scale;
      const garL = 5.8 * scale;
      const isGarageLhs = houseState.garageSide === "LHS";
      const garX = isGarageLhs ? -houseW / 2 : houseW / 2 - garW;
      const garY = houseL / 2 - garL;
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(garX, garY, garW, garL);
      ctx.strokeStyle = "#cbd5e1";
      ctx.strokeRect(garX, garY, garW, garL);
    }

    // Built-To-Boundary (BTB) Highlight Edge
    if (houseState.isBtbActive) {
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 4;
      ctx.beginPath();
      if (houseState.garageSide === "RHS") {
        ctx.moveTo(houseW / 2, houseL / 2 - 6.0 * scale);
        ctx.lineTo(houseW / 2, houseL / 2);
      } else {
        ctx.moveTo(-houseW / 2, houseL / 2 - 6.0 * scale);
        ctx.lineTo(-houseW / 2, houseL / 2);
      }
      ctx.stroke();
    }

    ctx.restore(); // Restore context to draw unrotated overlays & dimensions

    // 5. Rotation Knob Handle (Visible above house)
    const rotHandleDist = houseState.lengthM * scale * 0.5 + 28;
    const rad = (houseState.rotationDeg * Math.PI) / 180;
    const rotHandleX = houseCenterCanvas.x - Math.sin(rad) * rotHandleDist;
    const rotHandleY = houseCenterCanvas.y - Math.cos(rad) * rotHandleDist;

    ctx.beginPath();
    ctx.moveTo(houseCenterCanvas.x, houseCenterCanvas.y - houseState.lengthM * scale * 0.5);
    ctx.lineTo(rotHandleX, rotHandleY);
    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(rotHandleX, rotHandleY, 9, 0, Math.PI * 2);
    ctx.fillStyle = "#0284c7";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 6. Architectural Dashed Setback Lines & Dimension Callout Badges
    const drawSetbackCallout = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      label: string,
      color = "#dc2626"
    ) => {
      // Dashed Line
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();

      // Dimension Pill Badge
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;

      ctx.font = "bold 10.5px sans-serif";
      const textW = ctx.measureText(label).width;
      const pillW = textW + 12;
      const pillH = 20;

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(midX - pillW / 2, midY - pillH / 2, pillW, pillH, 5);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, midX, midY);
    };

    // A. Front Setback (Front wall to street)
    const frontWallY = houseCenterCanvas.y + houseL / 2;
    drawSetbackCallout(
      houseCenterCanvas.x,
      frontWallY,
      houseCenterCanvas.x,
      streetY,
      `Front: ${liveSetbacks.frontSetbackM.toFixed(2)}m (Garage ${liveSetbacks.garageSetbackM.toFixed(2)}m)`,
      "#dc2626"
    );

    // B. Rear Setback (Rear wall to rear boundary)
    const rearWallY = houseCenterCanvas.y - houseL / 2;
    const rearBoundaryY = toCanvas({ x: frontageM / 2, y: 0 }).y;
    drawSetbackCallout(
      houseCenterCanvas.x,
      rearWallY,
      houseCenterCanvas.x,
      rearBoundaryY,
      `Rear: ${liveSetbacks.rearSetbackM.toFixed(2)}m`,
      "#dc2626"
    );

    // C. Left Setback (Left wall to left boundary)
    const leftWallX = houseCenterCanvas.x - houseW / 2;
    const leftBoundaryX = toCanvas({ x: 0, y: houseState.centerY }).x;
    const leftLabel = houseState.isBtbActive && houseState.garageSide === "LHS" ? "BTB 200mm" : `Left: ${liveSetbacks.leftSetbackM.toFixed(2)}m`;
    drawSetbackCallout(
      leftWallX,
      houseCenterCanvas.y,
      leftBoundaryX,
      houseCenterCanvas.y,
      leftLabel,
      houseState.isBtbActive && houseState.garageSide === "LHS" ? "#d97706" : "#0284c7"
    );

    // D. Right Setback (Right wall to right boundary)
    const rightWallX = houseCenterCanvas.x + houseW / 2;
    const rightBoundaryX = toCanvas({ x: frontageM, y: houseState.centerY }).x;
    const rightLabel = houseState.isBtbActive && houseState.garageSide === "RHS" ? "BTB 200mm" : `Right: ${liveSetbacks.rightSetbackM.toFixed(2)}m`;
    drawSetbackCallout(
      rightWallX,
      houseCenterCanvas.y,
      rightBoundaryX,
      houseCenterCanvas.y,
      rightLabel,
      houseState.isBtbActive && houseState.garageSide === "RHS" ? "#d97706" : "#0284c7"
    );

    // 7. House Design Label in Top-Left Blueprint Header
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText(`DESIGN: ${houseState.designName.toUpperCase()}`, 30, 25);
    ctx.fillStyle = "#0284c7";
    ctx.font = "bold 11.5px sans-serif";
    ctx.fillText(`${houseState.widthM.toFixed(2)}m Wide × ${houseState.lengthM.toFixed(2)}m Deep • Total: ${houseState.totalM2} m² • 1:200 Scale Blueprint`, 30, 44);

    // 8. North Compass Rose (Rotatable)
    const compassX = W - 70;
    const compassY = 70;
    ctx.save();
    ctx.translate(compassX, compassY);
    ctx.rotate((northAngleDeg * Math.PI) / 180);

    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // North arrow tip
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(-7, 2);
    ctx.lineTo(7, 2);
    ctx.closePath();
    ctx.fillStyle = "#dc2626";
    ctx.fill();

    // South arrow tip
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(-7, 2);
    ctx.lineTo(7, 2);
    ctx.closePath();
    ctx.fillStyle = "#0f172a";
    ctx.fill();

    ctx.fillStyle = "#dc2626";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText("N", 0, -28);
    ctx.restore();

    // 9. Calibration Lines if in calibration mode
    if (isCalibratingScale && calibrationPoints.length > 0) {
      ctx.fillStyle = "#f59e0b";
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2;
      for (const pt of calibrationPoints) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      if (calibrationPoints.length === 2) {
        ctx.beginPath();
        ctx.moveTo(calibrationPoints[0].x, calibrationPoints[0].y);
        ctx.lineTo(calibrationPoints[1].x, calibrationPoints[1].y);
        ctx.stroke();
      }
    }
  }, [
    activeLot,
    houseState,
    liveSetbacks,
    croppedFloorplanImage,
    disclosureImage,
    disclosureOpacity,
    scalePixelsPerMeter,
    isCalibratingScale,
    calibrationPoints,
    isSettingBoundaryVertices,
    lotMode,
    northAngleDeg,
    frontageM,
    depthM,
    getCanvasTransform,
  ]);

  // Mouse Handlers for Draggable House, Rotation Knob & Polygon Vertices
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const { scale, toCanvas, toMeters } = getCanvasTransform();

    // 1. Check if calibrating scale on disclosure plan
    if (isCalibratingScale) {
      const newPts = [...calibrationPoints, { x: clickX, y: clickY }];
      if (newPts.length >= 2) {
        const pixDist = distanceBetween(newPts[0], newPts[1]);
        const enteredMeters = prompt("Enter the real boundary distance in meters for this segment (e.g. 14.0 or 30.0):", "14.0");
        if (enteredMeters) {
          const meters = parseFloat(enteredMeters);
          if (meters > 0) {
            const ppm = pixDist / (meters * (scale / scalePixelsPerMeter));
            setScalePixelsPerMeter(ppm > 0 ? ppm : 20.0);
            toast.success(`Scale calibrated to ${meters}m accurately!`);
          }
        }
        setCalibrationPoints([]);
        setIsCalibratingScale(false);
      } else {
        setCalibrationPoints(newPts);
      }
      return;
    }

    // 2. Check if clicking on custom polygon vertices
    if (lotMode === "custom_polygon" || isSettingBoundaryVertices) {
      const lotCanvasPts = activeLot.vertices.map(toCanvas);
      for (let i = 0; i < lotCanvasPts.length; i++) {
        if (distanceBetween({ x: clickX, y: clickY }, lotCanvasPts[i]) < 14) {
          setDragVertexIndex(i);
          return;
        }
      }
    }

    // 3. Check if clicking on Rotation Knob Handle
    const houseCenterCanvas = toCanvas({ x: houseState.centerX, y: houseState.centerY });
    const rotHandleDist = houseState.lengthM * scale * 0.5 + 28;
    const rad = (houseState.rotationDeg * Math.PI) / 180;
    const rotHandleX = houseCenterCanvas.x - Math.sin(rad) * rotHandleDist;
    const rotHandleY = houseCenterCanvas.y - Math.cos(rad) * rotHandleDist;

    if (distanceBetween({ x: clickX, y: clickY }, { x: rotHandleX, y: rotHandleY }) < 18) {
      setIsRotatingHouse(true);
      return;
    }

    // 4. Check if clicking inside House Footprint to Drag
    const houseWCanvas = houseState.widthM * scale;
    const houseLCanvas = houseState.lengthM * scale;
    if (
      Math.abs(clickX - houseCenterCanvas.x) < houseWCanvas / 2 + 10 &&
      Math.abs(clickY - houseCenterCanvas.y) < houseLCanvas / 2 + 10
    ) {
      setIsDraggingHouse(true);
      const clickMeters = toMeters({ x: clickX, y: clickY });
      setDragOffset({
        x: clickMeters.x - houseState.centerX,
        y: clickMeters.y - houseState.centerY,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const { toCanvas, toMeters } = getCanvasTransform();

    // 1. Dragging Custom Boundary Vertex
    if (dragVertexIndex !== null) {
      const mouseMeters = toMeters({ x: mouseX, y: mouseY });
      setPolygonPoints((prev) => {
        const next = [...prev];
        next[dragVertexIndex] = {
          x: Math.round(mouseMeters.x * 10) / 10,
          y: Math.round(mouseMeters.y * 10) / 10,
        };
        return next;
      });
      return;
    }

    // 2. Rotating House with 1-Degree Precision
    if (isRotatingHouse) {
      const houseCenterCanvas = toCanvas({ x: houseState.centerX, y: houseState.centerY });
      const dx = mouseX - houseCenterCanvas.x;
      const dy = mouseY - houseCenterCanvas.y;
      let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
      if (angle < 0) angle += 360;
      setHouseState((prev) => ({
        ...prev,
        rotationDeg: Math.round(angle) % 360,
      }));
      return;
    }

    // 3. Dragging House Footprint
    if (isDraggingHouse) {
      const mouseMeters = toMeters({ x: mouseX, y: mouseY });
      const newCenterX = Math.round((mouseMeters.x - dragOffset.x) * 10) / 10;
      const newCenterY = Math.round((mouseMeters.y - dragOffset.y) * 10) / 10;
      setHouseState((prev) => ({
        ...prev,
        centerX: newCenterX,
        centerY: newCenterY,
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDraggingHouse(false);
    setIsRotatingHouse(false);
    setDragVertexIndex(null);
  };

  // Flip floorplan (LHS vs RHS garage) without reversing room text
  const handleFlipGarageSide = () => {
    setHouseState((prev) => {
      const nextSide = prev.garageSide === "RHS" ? "LHS" : "RHS";
      return {
        ...prev,
        garageSide: nextSide,
        isFlipped: !prev.isFlipped,
      };
    });
    toast.success(`Floorplan flipped: Garage switched to ${houseState.garageSide === "RHS" ? "LHS" : "RHS"}`);
  };

  // Direct Floorplan Image Upload Handler
  const handleDirectFloorplanUpload = async (file: File) => {
    try {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (isPdf) {
        const { pages } = await pdfDocumentToPagesAndText(file, 1);
        if (pages[0]) {
          setFloorplanImageUrl(pages[0]);
          setIsCroppingFloorplan(true);
          const analysis = await scanAndVectorizeFloorplan(pages[0], houseState.designName);
          setWallAnalysis(analysis);
          const img = new Image();
          img.onload = () => {
            setCroppedFloorplanImage(img);
            setIsCroppingFloorplan(false);
            toast.success("Floorplan PDF loaded and auto-cropped onto lot!");
          };
          img.src = analysis.croppedUrl || pages[0];
        }
      } else {
        const reader = new FileReader();
        reader.onload = async () => {
          const rawUrl = String(reader.result);
          setFloorplanImageUrl(rawUrl);
          setIsCroppingFloorplan(true);
          const analysis = await scanAndVectorizeFloorplan(rawUrl, houseState.designName);
          setWallAnalysis(analysis);
          const img = new Image();
          img.onload = () => {
            setCroppedFloorplanImage(img);
            setIsCroppingFloorplan(false);
            toast.success("Floorplan image loaded and auto-cropped onto lot!");
          };
          img.src = analysis.croppedUrl || rawUrl;
        };
        reader.readAsDataURL(file);
      }
    } catch {
      toast.error("Could not process floorplan file.");
      setIsCroppingFloorplan(false);
    }
  };

  // Upload Disclosure Plan Handler
  const handleUploadDisclosure = async (file: File) => {
    try {
      setDisclosureFileName(file.name);
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

      if (isPdf) {
        const { pages } = await pdfDocumentToPagesAndText(file, 1);
        if (pages[0]) {
          const img = new Image();
          img.onload = () => {
            setDisclosureImage(img);
            setLotMode("disclosure_plan");
            toast.success("Disclosure Plan PDF loaded as underlay! Click 'Calibrate Scale' to match boundary lengths.");
          };
          img.src = pages[0];
        }
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            setDisclosureImage(img);
            setLotMode("disclosure_plan");
            toast.success("Disclosure Plan image loaded as underlay! Click 'Calibrate Scale' to match boundary lengths.");
          };
          img.src = String(reader.result);
        };
        reader.readAsDataURL(file);
      }
    } catch {
      toast.error("Could not load disclosure plan file.");
    }
  };

  // Preset Lot Buttons
  const handleSelectPresetLot = (w: number, d: number) => {
    setFrontageM(w);
    setDepthM(d);
    setLotMode("rectangle");
    setPolygonPoints([
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: d },
      { x: 0, y: d },
    ]);
    setHouseState((prev) => ({
      ...prev,
      centerX: w / 2,
      centerY: d / 2 + 1.0,
    }));
    toast.info(`Applied preset lot: ${w}m × ${d}m (${w * d} m²)`);
  };

  // Export 1:200 Siting Plan PDF
  const handleExportPdf = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const imgData = canvas.toDataURL("image/png", 1.0);

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 297, 210, "F");

    // Title Banner
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("HUDSON HOMES — 1:200 ARCHITECTURAL LOT SITING PLAN", 15, 14);

    doc.setFontSize(10);
    doc.setTextColor(2, 132, 199);
    doc.text(`Estate: ${currentPodRule.estateName} | Lot: ${frontageM}m Frontage × ${depthM}m Depth (${activeLot.totalAreaM2} m²)`, 15, 20);

    // Siting Image
    doc.addImage(imgData, "PNG", 15, 24, 267, 155);

    // Compliance Footer
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9);
    doc.text(
      `Front Setback: ${liveSetbacks.frontSetbackM}m | Garage: ${liveSetbacks.garageSetbackM}m | Left: ${liveSetbacks.leftSetbackM}m | Right: ${liveSetbacks.rightSetbackM}m | Rear: ${liveSetbacks.rearSetbackM}m`,
      15,
      188
    );
    doc.setTextColor(2, 132, 199);
    doc.text(
      `Site Coverage: ${liveSetbacks.siteCoveragePct}% (Max ${currentPodRule.maxSiteCoveragePct || 60}%) · ${liveSetbacks.isCompliant ? "COMPLIANT" : "REVIEW REQUIRED"} | POS: ${liveSetbacks.privateOpenSpaceM2} m²`,
      15,
      194
    );

    doc.save(`${houseState.designName.replace(/\s+/g, "_")}_Siting_Plan_1-200.pdf`);
    toast.success("1:200 Scale Architectural Siting Plan exported as PDF!");
  };

  // Transfer Siting to Quoting Tool
  const handleBridgeToQuoting = () => {
    try {
      const sitingPayload = {
        estate: currentPodRule.estateName,
        council: currentPodRule.council,
        frontageM: activeLot.frontageM,
        depthM: activeLot.depthM,
        totalLotM2: activeLot.totalAreaM2,
        setbacks: liveSetbacks,
        designName: houseState.designName,
        widthM: houseState.widthM,
        lengthM: houseState.lengthM,
        totalM2: houseState.totalM2,
        floorplanUrl: floorplanImageUrl,
      };

      localStorage.setItem("hudson_siting_to_quote_bridge", JSON.stringify(sitingPayload));
      toast.success("Siting dimensions bridged to Quoting Tool!");
      if (onSendToQuoting) onSendToQuoting(sitingPayload);
      navigate({ to: "/quote-builder" });
    } catch {
      toast.error("Could not bridge siting to Quoting Tool.");
    }
  };

  // Transfer Siting to Tender Job Folder
  const handleBridgeToTender = async () => {
    try {
      let pdfDataUrl = "";
      const canvas = canvasRef.current;
      if (canvas) {
        const imgData = canvas.toDataURL("image/jpeg", 0.88);
        const doc = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: "a4",
        });
        doc.addImage(imgData, "JPEG", 10, 10, 277, 190);
        pdfDataUrl = doc.output("datauristring");
      }

      const rawTender = localStorage.getItem("hudson_current_tender_draft");
      let currentTender = rawTender ? JSON.parse(rawTender) : {};

      currentTender = {
        ...currentTender,
        land: {
          ...(currentTender.land || {}),
          frontageM: activeLot.frontageM,
          lotSizeM2: activeLot.totalAreaM2,
          estate: currentPodRule.estateName,
          council: currentPodRule.council,
        },
        homeSpec: {
          ...(currentTender.homeSpec || {}),
          homeDesign: houseState.designName,
          garageLocation: houseState.garageSide,
          floorplanUrl: floorplanImageUrl,
          setbacks: {
            frontBoundary: `${liveSetbacks.frontSetbackM}m (Garage ${liveSetbacks.garageSetbackM}m)`,
            rearBoundary: `${liveSetbacks.rearSetbackM}m`,
            leftBoundary: `${liveSetbacks.leftSetbackM}m`,
            rightBoundary: `${liveSetbacks.rightSetbackM}m`,
          },
        },
        documents: {
          ...(currentTender.documents || {}),
          ...(pdfDataUrl
            ? {
                siting_plan: {
                  id: "siting_plan",
                  label: "1:200 Scale Siting / House Position Plan (PDF)",
                  fileName: `${currentTender.customer1?.surname || "Client"}_1-200_Siting_Plan.pdf`,
                  fileDataUrl: pdfDataUrl,
                  fileType: "application/pdf",
                  required: true,
                },
              }
            : {}),
        },
      };

      await saveTenderToIdb(currentTender).catch(() => {});
      try {
        localStorage.setItem("hudson_siting_to_tender_bridge", JSON.stringify(currentTender));
        localStorage.setItem("hudson_current_tender_draft", JSON.stringify(currentTender));
      } catch (storageErr) {
        console.warn("Storage quota exceeded, persisted in IndexedDB instead.", storageErr);
      }

      toast.success("1:200 Siting Plan PDF saved to Tender Request Job Folder!");
      if (onSendToTender) onSendToTender(currentTender);
      navigate({ to: "/tender-request" });
    } catch (err) {
      console.error(err);
      toast.error("Could not bridge siting to Tender Portal.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls: Lot Mode, Presets & Estate Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl">
        {/* Estate POD Rules */}
        <div className="space-y-1.5 lg:col-span-2">
          <Label className="text-xs text-amber-400 font-bold flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            Queensland Estate &amp; Council POD Rule Presets
          </Label>
          <Select value={selectedEstateId} onValueChange={setSelectedEstateId}>
            <SelectTrigger className="border-slate-800 bg-slate-950 text-xs font-semibold text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-800 bg-slate-950 text-slate-100 max-h-72">
              {QUEENSLAND_ESTATE_POD_PRESETS.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  {p.estateName} ({p.suburb} &bull; {p.council})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-slate-400">{currentPodRule.notes}</p>
        </div>

        {/* Lot Mode Switcher */}
        <div className="space-y-1.5 lg:col-span-2">
          <Label className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-cyan-400" />
            Lot Siting Mode
          </Label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              size="sm"
              variant={lotMode === "rectangle" ? "default" : "outline"}
              onClick={() => setLotMode("rectangle")}
              className={lotMode === "rectangle" ? "bg-cyan-600 text-white font-bold text-xs" : "border-slate-800 bg-slate-950 text-slate-400 text-xs"}
            >
              Standard Rectangle
            </Button>
            <Button
              type="button"
              size="sm"
              variant={lotMode === "custom_polygon" ? "default" : "outline"}
              onClick={() => setLotMode("custom_polygon")}
              className={lotMode === "custom_polygon" ? "bg-cyan-600 text-white font-bold text-xs" : "border-slate-800 bg-slate-950 text-slate-400 text-xs"}
            >
              Custom Polygon
            </Button>
            <Button
              type="button"
              size="sm"
              variant={lotMode === "disclosure_plan" ? "default" : "outline"}
              onClick={() => setLotMode("disclosure_plan")}
              className={lotMode === "disclosure_plan" ? "bg-amber-600 text-white font-bold text-xs" : "border-slate-800 bg-slate-950 text-slate-400 text-xs"}
            >
              Upload Disclosure
            </Button>
          </div>
        </div>
      </div>

      {/* Mode-Specific Toolbar */}
      <div className="p-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md space-y-4">
        {/* Rectangle Mode Quick Presets */}
        {lotMode === "rectangle" && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-slate-300">Quick Lot Presets:</span>
            {[
              { w: 10, d: 30 },
              { w: 12.5, d: 30 },
              { w: 12.5, d: 32 },
              { w: 14, d: 30 },
              { w: 16, d: 28 },
              { w: 18, d: 35 },
              { w: 20, d: 40 },
            ].map((preset) => (
              <Button
                key={`${preset.w}x${preset.d}`}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleSelectPresetLot(preset.w, preset.d)}
                className="border-slate-800 bg-slate-950/80 text-slate-300 hover:text-white text-xs font-mono"
              >
                {preset.w}m × {preset.d}m ({preset.w * preset.d}m²)
              </Button>
            ))}

            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-slate-400">Frontage (m):</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={frontageM}
                  onChange={(e) => setFrontageM(parseFloat(e.target.value) || 14)}
                  className="w-20 h-8 border-slate-800 bg-slate-950 text-xs font-bold text-cyan-400"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-slate-400">Depth (m):</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={depthM}
                  onChange={(e) => setDepthM(parseFloat(e.target.value) || 30)}
                  className="w-20 h-8 border-slate-800 bg-slate-950 text-xs font-bold text-cyan-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* Disclosure Plan Upload & Scale Calibrator */}
        {lotMode === "disclosure_plan" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,image/*,application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadDisclosure(f);
                  }}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/50 bg-amber-950/60 hover:bg-amber-900 text-xs font-bold text-amber-200 transition-colors shadow-xs">
                  <Upload className="h-3.5 w-3.5 text-amber-400" />
                  {disclosureFileName ? `Loaded: ${disclosureFileName}` : "Upload Disclosure Plan (PDF or Image)"}
                </span>
              </label>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsCalibratingScale(true);
                    setCalibrationPoints([]);
                    toast.info("Click 2 points on a known boundary segment to calibrate scale!");
                  }}
                  className={isCalibratingScale ? "bg-amber-500 text-slate-950 font-bold text-xs" : "border-slate-800 bg-slate-950 text-slate-300 text-xs gap-1.5"}
                >
                  <Ruler className="h-3.5 w-3.5 text-amber-400" />
                  {isCalibratingScale ? "Click 2 Boundary Points on Canvas…" : "Calibrate Scale (Click 2 Points)"}
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsSettingBoundaryVertices(!isSettingBoundaryVertices)}
                  className={isSettingBoundaryVertices ? "bg-emerald-600 text-white font-bold text-xs" : "border-slate-800 bg-slate-950 text-slate-300 text-xs gap-1.5"}
                >
                  <MousePointer className="h-3.5 w-3.5 text-emerald-400" />
                  {isSettingBoundaryVertices ? "Done Adjusting Lot Pins" : "Adjust Lot Boundary Pins"}
                </Button>
              </div>
            </div>

            {/* Opacity Slider */}
            <div className="flex items-center gap-3 pt-1">
              <span className="text-xs text-slate-400 flex-none">Plan Underlay Opacity:</span>
              <Slider
                value={[disclosureOpacity * 100]}
                min={10}
                max={100}
                step={5}
                onValueChange={(val) => setDisclosureOpacity((val[0] || 45) / 100)}
                className="w-48"
              />
              <span className="text-xs font-mono text-cyan-400">{Math.round(disclosureOpacity * 100)}%</span>
            </div>
          </div>
        )}

        {/* Custom Polygon Boundary Editor */}
        {lotMode === "custom_polygon" && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-300">
              Drag the golden corner pins on the canvas to customize boundary angles, frontage, depth, and rear splays.
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setPolygonPoints((prev) => [
                    ...prev,
                    { x: prev[prev.length - 1].x + 2, y: prev[prev.length - 1].y },
                  ]);
                  toast.info("Added new boundary vertex!");
                }}
                className="border-slate-800 bg-slate-950 text-slate-300 text-xs gap-1"
              >
                <Plus className="h-3 w-3" /> Add Corner Vertex
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleSelectPresetLot(14, 30)}
                className="border-slate-800 bg-slate-950 text-slate-300 text-xs gap-1"
              >
                <RefreshCw className="h-3 w-3" /> Reset to Rectangle
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Architectural Canvas (Left) + Siting Controls & Compliance (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 items-start">
        {/* Left Column: Pure White Architectural Canvas with Black Boundaries */}
        <div className="relative rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl p-4 flex flex-col items-center">
          <div className="w-full flex items-center justify-between pb-3 text-xs border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-slate-200 font-bold flex items-center gap-1.5">
                <Building className="h-4 w-4 text-cyan-400" />
                1:200 Architectural Siting Canvas (White Blueprint)
              </span>
              {isCroppingFloorplan && (
                <span className="text-[10px] text-amber-400 bg-amber-950/80 border border-amber-800/60 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                  <Sparkles className="h-3 w-3" /> Auto-cropping layout…
                </span>
              )}
            </div>
            <span className="font-mono text-cyan-400 font-bold">
              Angle: {houseState.rotationDeg}° &bull; Lot: {activeLot.totalAreaM2.toFixed(1)} m²
            </span>
          </div>

          {/* White Blueprint Canvas Container */}
          <div className="relative w-full my-3 bg-white rounded-xl shadow-lg border border-slate-700/80 overflow-hidden flex items-center justify-center">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="cursor-move max-w-full h-auto"
              style={{ width: "100%", maxHeight: "860px", objectFit: "contain" }}
            />
          </div>

          {/* House Manipulation Action Bar */}
          <div className="w-full flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleFlipGarageSide}
                className="border-slate-800 bg-slate-900 text-cyan-300 hover:bg-slate-800 text-xs gap-1.5 font-bold"
              >
                <FlipHorizontal className="h-3.5 w-3.5 text-cyan-400" />
                Flip Plan (Garage: {houseState.garageSide})
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setHouseState((prev) => ({ ...prev, rotationDeg: (prev.rotationDeg + 90) % 360 }))}
                className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs gap-1.5"
              >
                <RotateCw className="h-3.5 w-3.5 text-amber-400" />
                Rotate 90°
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setHouseState((prev) => ({ ...prev, isBtbActive: !prev.isBtbActive }))}
                className={houseState.isBtbActive ? "bg-amber-950/80 border-amber-500/60 text-amber-300 text-xs font-bold" : "border-slate-800 bg-slate-900 text-slate-400 text-xs"}
              >
                BTB 200mm Wall: {houseState.isBtbActive ? "ON" : "OFF"}
              </Button>
            </div>

            {/* 1° Fine Angle Slider */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400">1° Fine Angle:</span>
              <Slider
                value={[houseState.rotationDeg]}
                min={0}
                max={359}
                step={1}
                onValueChange={(v) => setHouseState((prev) => ({ ...prev, rotationDeg: v[0] || 0 }))}
                className="w-28"
              />
              <Input
                type="number"
                value={houseState.rotationDeg}
                onChange={(e) => setHouseState((prev) => ({ ...prev, rotationDeg: (parseInt(e.target.value, 10) || 0) % 360 }))}
                className="w-16 h-7 border-slate-800 bg-slate-900 text-xs font-mono text-center font-bold text-cyan-400"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Live Setback Card & Export Actions */}
        <div className="space-y-4">
          {/* Live Setbacks Card */}
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <Ruler className="h-4 w-4 text-cyan-400" />
                Live Setback Dimensions
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${liveSetbacks.isCompliant ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-amber-500/20 text-amber-300 border-amber-500/40"}`}>
                {liveSetbacks.isCompliant ? "POD COMPLIANT" : "CHECK SETBACKS"}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Front Building Line:</span>
                <strong className="text-cyan-300 font-mono">{liveSetbacks.frontSetbackM.toFixed(2)}m (Min {currentPodRule.frontSetbackOmpM}m)</strong>
              </div>

              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Garage Door Setback:</span>
                <strong className="text-cyan-300 font-mono">{liveSetbacks.garageSetbackM.toFixed(2)}m (Min {currentPodRule.frontSetbackGarageM}m)</strong>
              </div>

              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Left Side Boundary:</span>
                <strong className="text-cyan-300 font-mono">{liveSetbacks.leftSetbackM.toFixed(2)}m</strong>
              </div>

              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Right Side Boundary:</span>
                <strong className="text-cyan-300 font-mono">{liveSetbacks.rightSetbackM.toFixed(2)}m</strong>
              </div>

              <div className="flex justify-between items-center p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Rear Boundary:</span>
                <strong className="text-cyan-300 font-mono">{liveSetbacks.rearSetbackM.toFixed(2)}m (Min {currentPodRule.rearSetbackM}m)</strong>
              </div>
            </div>

            {/* Site Coverage Gauge */}
            <div className="pt-2 border-t border-slate-800 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Site Coverage:</span>
                <span className="font-bold text-white">
                  {liveSetbacks.siteCoveragePct}% / Max {currentPodRule.maxSiteCoveragePct || 60}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full ${liveSetbacks.siteCoveragePct <= (currentPodRule.maxSiteCoveragePct || 60) ? "bg-emerald-500" : "bg-rose-500"}`}
                  style={{ width: `${Math.min(100, (liveSetbacks.siteCoveragePct / (currentPodRule.maxSiteCoveragePct || 60)) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10.5px] text-slate-400 pt-1">
                <span>POS Backyard: {liveSetbacks.privateOpenSpaceM2} m²</span>
                <span>Lot Area: {activeLot.totalAreaM2.toFixed(1)} m²</span>
              </div>
            </div>
          </div>

          {/* Action Transfer Buttons */}
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <Send className="h-4 w-4 text-emerald-400" />
              Transfer &amp; Export Siting Plan
            </h4>

            <Button
              type="button"
              onClick={handleExportPdf}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs gap-1.5"
            >
              <Download className="h-3.5 w-3.5 text-cyan-400" />
              Export 1:200 Siting PDF
            </Button>

            <Button
              type="button"
              onClick={handleBridgeToQuoting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-md shadow-emerald-500/20"
            >
              <Layers className="h-3.5 w-3.5" />
              Send Siting to Quoting Tool
            </Button>

            <Button
              type="button"
              onClick={handleBridgeToTender}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs gap-1.5 shadow-md shadow-amber-500/20"
            >
              <Send className="h-3.5 w-3.5" />
              Save to Tender Job Folder (PDF)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
