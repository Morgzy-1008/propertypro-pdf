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
  Minus,
  RefreshCw,
  MousePointer,
  Sparkles,
  Sliders,
  CheckCircle2,
  X,
  Target,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Move,
  FileText,
  Import,
  Home,
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
} from "@/lib/siting/sitingGeometry";
import { pdfDocumentToPagesAndText } from "@/lib/pdfPages";
import { type DetectedFloorplan, detectFloorplanFromText } from "@/lib/floorplan/floorplanDetector";
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
type ScaleMode = "auto" | "1:100" | "1:200";

interface CalibrationModalState {
  isOpen: boolean;
  type: "floorplan" | "lot";
  pixelDistance: number;
  currentMeasuredM: number;
  inputMeters: string;
}

export function AdvancedSitingStudio({
  detectedFloorplan,
  onSendToQuoting,
  onSendToTender,
}: AdvancedSitingStudioProps) {
  const navigate = useNavigate();

  // Workspace Layout
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [scaleMode, setScaleMode] = useState<ScaleMode>("auto");

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
    hasDriveway: false,
    drivewayWidthM: 5.2,
  }));

  // Floorplan image state (Cropped with all internal layout and true aspect ratio)
  const [floorplanImageUrl, setFloorplanImageUrl] = useState<string>("");
  const [croppedFloorplanImage, setCroppedFloorplanImage] = useState<HTMLImageElement | null>(null);
  const [floorplanNaturalAspect, setFloorplanNaturalAspect] = useState<number>(10.55 / 20.15);
  const [isCroppingFloorplan, setIsCroppingFloorplan] = useState<boolean>(false);
  const [wallAnalysis, setWallAnalysis] = useState<WallVectorAnalysis>(() =>
    generateWallVectorAnalysis(houseState.designName)
  );

  // Zoom & Pan Engine State
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<Point2D>({ x: 0, y: 0 });
  const [isPanningMode, setIsPanningMode] = useState<boolean>(false);
  const [isCurrentlyPanning, setIsCurrentlyPanning] = useState<boolean>(false);
  const panStartRef = useRef<Point2D>({ x: 0, y: 0 });

  // 2-Point Calibration Tool States
  const [isCalibratingFloorplan, setIsCalibratingFloorplan] = useState<boolean>(false);
  const [floorplanCalibPoints, setFloorplanCalibPoints] = useState<Point2D[]>([]);

  const [isCalibratingLot, setIsCalibratingLot] = useState<boolean>(false);
  const [lotCalibPoints, setLotCalibPoints] = useState<Point2D[]>([]);

  const [calibrationModal, setCalibrationModal] = useState<CalibrationModalState>({
    isOpen: false,
    type: "floorplan",
    pixelDistance: 0,
    currentMeasuredM: 10.55,
    inputMeters: "10.55",
  });

  // Disclosure Plan Underlay State
  const [disclosureImage, setDisclosureImage] = useState<HTMLImageElement | null>(null);
  const [disclosureFileName, setDisclosureFileName] = useState<string>("");
  const [disclosureOpacity, setDisclosureOpacity] = useState<number>(0.45);
  const [scalePixelsPerMeter, setScalePixelsPerMeter] = useState<number>(20.0);
  const [isSettingBoundaryVertices, setIsSettingBoundaryVertices] = useState<boolean>(false);

  // Canvas & Interaction
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const [isDraggingHouse, setIsDraggingHouse] = useState(false);
  const [isRotatingHouse, setIsRotatingHouse] = useState(false);
  const [dragVertexIndex, setDragVertexIndex] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<Point2D>({ x: 0, y: 0 });
  const [cursorWorldPos, setCursorWorldPos] = useState<Point2D | null>(null);

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

  // Determine Architectural Scale (1:100 vs 1:200 on A3 Sheet)
  const effectiveScaleRatio = useMemo(() => {
    if (scaleMode === "1:100") return 100;
    if (scaleMode === "1:200") return 200;

    const maxDimension = Math.max(activeLot.frontageM, activeLot.depthM);
    const minDimension = Math.min(activeLot.frontageM, activeLot.depthM);

    if (maxDimension <= 23.5 || (maxDimension <= 35.0 && minDimension <= 21.0)) {
      return 100;
    }
    return 200;
  }, [scaleMode, activeLot.frontageM, activeLot.depthM]);

  // Helper to load and process any floorplan URL
  const loadFloorplanUrl = useCallback(
    async (url: string, targetDesign: string, isDoubleStorey = false) => {
      if (!url) return;
      setIsCroppingFloorplan(true);
      setFloorplanImageUrl(url);

      try {
        const housingType = isDoubleStorey ? "Double Storey" : "Single Storey";
        const analysis = await scanAndVectorizeFloorplan(url, targetDesign, housingType);
        setWallAnalysis(analysis);

        const finalUrl = analysis.croppedUrl || url;
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          setCroppedFloorplanImage(img);
          const aspect = (img.naturalWidth || 100) / (img.naturalHeight || 100);
          setFloorplanNaturalAspect(aspect);

          setHouseState((prev) => {
            const baseWidth = analysis.houseWidthM || prev.widthM || 10.55;
            const exactLength = baseWidth / aspect;
            return {
              ...prev,
              designName: targetDesign,
              widthM: Number(baseWidth.toFixed(2)),
              lengthM: Number(exactLength.toFixed(2)),
              totalM2: analysis.roomAreas.totalM2 || prev.totalM2 || 192.2,
            };
          });

          setIsCroppingFloorplan(false);
        };
        img.onerror = () => setIsCroppingFloorplan(false);
        img.src = finalUrl;
      } catch {
        setIsCroppingFloorplan(false);
      }
    },
    []
  );

  // Load initial floorplan from detectedFloorplan or design registry
  useEffect(() => {
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

    if (url) {
      loadFloorplanUrl(url, targetDesign, detectedFloorplan?.housingType === "Double Storey");
    }
  }, [detectedFloorplan, loadFloorplanUrl]);

  // Import Current Floorplan Directly from Floorplan Editor Tab (Ground Floor Isolation)
  const handleImportCurrentFloorplan = useCallback(async () => {
    try {
      setIsCroppingFloorplan(true);

      // Check localStorage bridge or detected plan
      const rawBridge = localStorage.getItem("hudson_imported_floorplan_bridge");
      const bridgeData = rawBridge ? JSON.parse(rawBridge) : null;

      const targetDesign = bridgeData?.designName || detectedFloorplan?.matchedDesignName || houseState.designName || "Amber 21";
      let url = bridgeData?.floorplanUrl || detectedFloorplan?.floorplanUrl || "";

      if (!url) {
        const directPlans = plansForDesign(targetDesign);
        if (directPlans.length > 0 && directPlans[0].url) {
          url = directPlans[0].url;
        } else {
          url = findFloorplanUrl(targetDesign);
        }
      }

      if (!url) {
        toast.error("No active floorplan found in editor. Please select or upload a floorplan.");
        setIsCroppingFloorplan(false);
        return;
      }

      // Isolate Ground Floor (with garage/carport)
      const isDouble = bridgeData?.isDoubleStorey || /double/i.test(targetDesign) || detectedFloorplan?.housingType === "Double Storey";
      await loadFloorplanUrl(url, targetDesign, isDouble);

      toast.success(
        isDouble
          ? `✨ Imported Ground Floor layout (${targetDesign}) with garage from Floorplan Editor!`
          : `✨ Imported floorplan (${targetDesign}) directly from Floorplan Editor!`
      );
    } catch {
      toast.error("Could not import floorplan from editor.");
      setIsCroppingFloorplan(false);
    }
  }, [detectedFloorplan, houseState.designName, loadFloorplanUrl]);

  // A3 Sheet Canvas Transform (A3 Landscape: 420mm x 297mm)
  const getCanvasTransform = useCallback(() => {
    const W = 1414;
    const H = 1000;
    const paddingX = 110;
    const paddingTop = 90;
    const paddingBottom = 110;

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

    const availW = W - paddingX * 2;
    const availH = H - paddingTop - paddingBottom;

    let scale = (availW / lotSpanX);
    if (effectiveScaleRatio === 100) {
      scale = Math.min(availW / lotSpanX, availH / lotSpanY, 30.0);
    } else {
      const scaleX = availW / lotSpanX;
      const scaleY = availH / lotSpanY;
      scale = Math.min(scaleX, scaleY) * 0.90;
    }

    const originCanvasX = (W - lotSpanX * scale) / 2 - minX * scale;
    const originCanvasY = paddingTop + (availH - lotSpanY * scale) / 2 - minY * scale;

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
      screenToWorld: (screenX: number, screenY: number): Point2D => {
        const cX = W / 2;
        const cY = H / 2;
        const wx = (screenX - (cX + panOffset.x)) / zoomLevel + cX;
        const wy = (screenY - (cY + panOffset.y)) / zoomLevel + cY;
        return { x: wx, y: wy };
      },
    };
  }, [frontageM, depthM, lotMode, polygonPoints, effectiveScaleRatio, zoomLevel, panOffset]);

  // Non-passive wheel event listener: Blocks page scroll & zooms directly to cursor location
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = container.getBoundingClientRect();
      const screenX = (e.clientX - rect.left) * (1414 / rect.width);
      const screenY = (e.clientY - rect.top) * (1000 / rect.height);

      const { W, H, screenToWorld } = getCanvasTransform();
      const worldBefore = screenToWorld(screenX, screenY);

      const zoomFactor = e.deltaY < 0 ? 1.18 : 0.85;
      const nextZoom = Math.max(0.75, Math.min(5.0, Math.round(zoomLevel * zoomFactor * 100) / 100));

      if (nextZoom !== zoomLevel) {
        const cX = W / 2;
        const cY = H / 2;
        const newPanX = screenX - cX - (worldBefore.x - cX) * nextZoom;
        const newPanY = screenY - cY - (worldBefore.y - cY) * nextZoom;

        setZoomLevel(nextZoom);
        setPanOffset({
          x: Math.round(newPanX * 10) / 10,
          y: Math.round(newPanY * 10) / 10,
        });
      }
    };

    container.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleNativeWheel);
    };
  }, [zoomLevel, panOffset, getCanvasTransform]);

  // Main Canvas Render — A3 Architectural Sheet Presentation (1:100 or 1:200)
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

    // Apply Zoom and Pan transform
    ctx.save();
    ctx.translate(W / 2 + panOffset.x, H / 2 + panOffset.y);
    ctx.scale(zoomLevel, zoomLevel);
    ctx.translate(-W / 2, -H / 2);

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

    // A3 Architectural Sheet Border (Outer 20mm Margin)
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.0;
    ctx.strokeRect(30, 30, W - 60, H - 60);

    // Inner fine border line
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 0.75;
    ctx.strokeRect(36, 36, W - 72, H - 72);

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

    // 2. Draw Lot Polygon (Clean white yard with solid black boundary lines)
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
      ctx.font = "bold 11.5px sans-serif";
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
        const labelX = midX + normX * 16;
        const labelY = midY + normY * 16;

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

    ctx.fillStyle = "#64748b";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`PRIMARY ROAD / STREET FRONTAGE (${activeLot.frontageM.toFixed(2)}m)`, (frontStart.x + frontEnd.x) / 2, streetY + 24);
    ctx.textAlign = "left";

    // 3. Draw Floorplan Footprint & Internal Layout (Clean Architectural Rendering with Natural Aspect Ratio)
    const houseCenterCanvas = toCanvas({ x: houseState.centerX, y: houseState.centerY });
    const houseW = houseState.widthM * scale;
    const houseL = (houseState.widthM / (floorplanNaturalAspect || 0.52)) * scale;

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

    // 4. Rotation Knob Handle (Visible above house)
    const rotHandleDist = houseL * 0.5 + 28;
    const rad = (houseState.rotationDeg * Math.PI) / 180;
    const rotHandleX = houseCenterCanvas.x - Math.sin(rad) * rotHandleDist;
    const rotHandleY = houseCenterCanvas.y - Math.cos(rad) * rotHandleDist;

    ctx.beginPath();
    ctx.moveTo(houseCenterCanvas.x, houseCenterCanvas.y - houseL * 0.5);
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

    // 5. Architectural Dashed Setback Lines & Dimension Callout Badges
    const drawSetbackCallout = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      label: string,
      color = "#dc2626"
    ) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();

      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;

      ctx.font = "bold 11px sans-serif";
      const textW = ctx.measureText(label).width;
      const pillW = textW + 14;
      const pillH = 22;

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

    // 6. Architectural A3 Title Block in Bottom-Right
    const tbW = 340;
    const tbH = 90;
    const tbX = W - 36 - tbW;
    const tbY = H - 36 - tbH;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(tbX, tbY, tbW, tbH);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(tbX, tbY, tbW, tbH);

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("HUDSON HOMES — SITING PLAN", tbX + 12, tbY + 22);

    ctx.fillStyle = "#0284c7";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText(`DESIGN: ${houseState.designName.toUpperCase()}`, tbX + 12, tbY + 42);

    ctx.fillStyle = "#475569";
    ctx.font = "10px sans-serif";
    ctx.fillText(`Lot: ${activeLot.frontageM}m × ${activeLot.depthM}m (${activeLot.totalAreaM2.toFixed(1)}m²) | ${currentPodRule.estateName}`, tbX + 12, tbY + 60);

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 11px monospace";
    ctx.fillText(`SCALE: 1:${effectiveScaleRatio} @ A3 SHEET`, tbX + 12, tbY + 78);

    const barScaleX = tbX + 220;
    const barScaleY = tbY + 74;
    const barMeterPx = (100 / effectiveScaleRatio) * (scale / 10);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.strokeRect(barScaleX, barScaleY - 6, barMeterPx * 5, 6);
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(barScaleX, barScaleY - 6, barMeterPx * 2.5, 6);
    ctx.font = "bold 8px sans-serif";
    ctx.fillText("0", barScaleX, barScaleY + 8);
    ctx.fillText("5m", barScaleX + barMeterPx * 5 - 8, barScaleY + 8);

    // 7. North Compass Rose (Rotatable)
    const compassX = W - 80;
    const compassY = 80;
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

    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(-7, 2);
    ctx.lineTo(7, 2);
    ctx.closePath();
    ctx.fillStyle = "#dc2626";
    ctx.fill();

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

    // 8. Calibration Overlay (Floorplan 2-Point Calibrator)
    if (isCalibratingFloorplan) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.94)";
      ctx.fillRect(W / 2 - 300, 45, 600, 40);
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 2.0;
      ctx.strokeRect(W / 2 - 300, 45, 600, 40);

      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const bannerText = floorplanCalibPoints.length === 0
        ? "🔍 CLICK POINT 1: Click start of any known wall (Zoom In for pixel precision)"
        : "🔍 CLICK POINT 2: Click opposite end of the wall to set scale";
      ctx.fillText(bannerText, W / 2, 65);

      for (let i = 0; i < floorplanCalibPoints.length; i++) {
        const pt = floorplanCalibPoints[i];
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = "#f59e0b";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pt.x - 14, pt.y);
        ctx.lineTo(pt.x + 14, pt.y);
        ctx.moveTo(pt.x, pt.y - 14);
        ctx.lineTo(pt.x, pt.y + 14);
        ctx.stroke();

        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 11px sans-serif";
        ctx.fillText(`Pt ${i + 1}`, pt.x + 14, pt.y - 12);
      }

      if (floorplanCalibPoints.length === 1 && cursorWorldPos) {
        ctx.save();
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(floorplanCalibPoints[0].x, floorplanCalibPoints[0].y);
        ctx.lineTo(cursorWorldPos.x, cursorWorldPos.y);
        ctx.stroke();
        ctx.restore();
      } else if (floorplanCalibPoints.length === 2) {
        ctx.save();
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(floorplanCalibPoints[0].x, floorplanCalibPoints[0].y);
        ctx.lineTo(floorplanCalibPoints[1].x, floorplanCalibPoints[1].y);
        ctx.stroke();
        ctx.restore();
      }
    }

    // 9. Lot Scale Calibration Overlay
    if (isCalibratingLot && lotCalibPoints.length > 0) {
      ctx.fillStyle = "#38bdf8";
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      for (const pt of lotCalibPoints) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      if (lotCalibPoints.length === 2) {
        ctx.beginPath();
        ctx.moveTo(lotCalibPoints[0].x, lotCalibPoints[0].y);
        ctx.lineTo(lotCalibPoints[1].x, lotCalibPoints[1].y);
        ctx.stroke();
      }
    }

    ctx.restore(); // Restore zoom/pan context
  }, [
    activeLot,
    houseState,
    liveSetbacks,
    croppedFloorplanImage,
    floorplanNaturalAspect,
    disclosureImage,
    disclosureOpacity,
    scalePixelsPerMeter,
    isCalibratingFloorplan,
    floorplanCalibPoints,
    isCalibratingLot,
    lotCalibPoints,
    cursorWorldPos,
    isSettingBoundaryVertices,
    lotMode,
    northAngleDeg,
    frontageM,
    depthM,
    effectiveScaleRatio,
    zoomLevel,
    panOffset,
    getCanvasTransform,
  ]);

  // Mouse Handlers for Draggable House, Rotation Knob, Panning & 2-Point Calibration
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = (e.clientX - rect.left) * (1414 / rect.width);
    const clientY = (e.clientY - rect.top) * (1000 / rect.height);

    const { scale, toCanvas, toMeters, screenToWorld } = getCanvasTransform();
    const worldPos = screenToWorld(clientX, clientY);

    // 0. Panning Mode (Middle Click, Pan Tool, or Spacebar)
    if (isPanningMode || e.button === 1 || e.altKey) {
      setIsCurrentlyPanning(true);
      panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
      return;
    }

    // 1. Check if calibrating Floorplan 2-Point Scale
    if (isCalibratingFloorplan) {
      const newPts = [...floorplanCalibPoints, worldPos];
      if (newPts.length >= 2) {
        setFloorplanCalibPoints(newPts);
        const pDist = distanceBetween(newPts[0], newPts[1]);
        const currentM = Number((pDist / scale).toFixed(2));
        setCalibrationModal({
          isOpen: true,
          type: "floorplan",
          pixelDistance: pDist,
          currentMeasuredM: currentM,
          inputMeters: String(houseState.widthM || currentM || 11.2),
        });
      } else {
        setFloorplanCalibPoints(newPts);
      }
      return;
    }

    // 2. Check if calibrating Disclosure Lot Scale
    if (isCalibratingLot) {
      const newPts = [...lotCalibPoints, worldPos];
      if (newPts.length >= 2) {
        setLotCalibPoints(newPts);
        const pDist = distanceBetween(newPts[0], newPts[1]);
        const currentM = Number((pDist / scale).toFixed(2));
        setCalibrationModal({
          isOpen: true,
          type: "lot",
          pixelDistance: pDist,
          currentMeasuredM: currentM,
          inputMeters: String(frontageM || 14.0),
        });
      } else {
        setLotCalibPoints(newPts);
      }
      return;
    }

    // 3. Check if clicking on custom polygon vertices
    if (lotMode === "custom_polygon" || isSettingBoundaryVertices) {
      const lotCanvasPts = activeLot.vertices.map(toCanvas);
      for (let i = 0; i < lotCanvasPts.length; i++) {
        if (distanceBetween(worldPos, lotCanvasPts[i]) < 18 / zoomLevel) {
          setDragVertexIndex(i);
          return;
        }
      }
    }

    // 4. Check if clicking on Rotation Knob Handle
    const houseCenterCanvas = toCanvas({ x: houseState.centerX, y: houseState.centerY });
    const houseL = (houseState.widthM / (floorplanNaturalAspect || 0.52)) * scale;
    const rotHandleDist = houseL * 0.5 + 28;
    const rad = (houseState.rotationDeg * Math.PI) / 180;
    const rotHandleX = houseCenterCanvas.x - Math.sin(rad) * rotHandleDist;
    const rotHandleY = houseCenterCanvas.y - Math.cos(rad) * rotHandleDist;

    if (distanceBetween(worldPos, { x: rotHandleX, y: rotHandleY }) < 22 / zoomLevel) {
      setIsRotatingHouse(true);
      return;
    }

    // 5. Check if clicking inside House Footprint to Drag
    const houseWCanvas = houseState.widthM * scale;
    const houseLCanvas = (houseState.widthM / (floorplanNaturalAspect || 0.52)) * scale;
    if (
      Math.abs(worldPos.x - houseCenterCanvas.x) < houseWCanvas / 2 + 10 &&
      Math.abs(worldPos.y - houseCenterCanvas.y) < houseLCanvas / 2 + 10
    ) {
      setIsDraggingHouse(true);
      const clickMeters = toMeters(worldPos);
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
    const screenX = (e.clientX - rect.left) * (1414 / rect.width);
    const screenY = (e.clientY - rect.top) * (1000 / rect.height);

    const { toCanvas, toMeters, screenToWorld } = getCanvasTransform();
    const worldPos = screenToWorld(screenX, screenY);
    setCursorWorldPos(worldPos);

    // 0. Handling Active Panning
    if (isCurrentlyPanning) {
      setPanOffset({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
      return;
    }

    // 1. Dragging Custom Boundary Vertex
    if (dragVertexIndex !== null) {
      const mouseMeters = toMeters(worldPos);
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
      const dx = worldPos.x - houseCenterCanvas.x;
      const dy = worldPos.y - houseCenterCanvas.y;
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
      const mouseMeters = toMeters(worldPos);
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
    setIsCurrentlyPanning(false);
    setDragVertexIndex(null);
  };

  // Zoom Controls with center-on-canvas
  const handleZoomIn = () => {
    setZoomLevel((z) => Math.min(5.0, Math.round((z + 0.3) * 10) / 10));
  };
  const handleZoomOut = () => {
    setZoomLevel((z) => Math.max(0.75, Math.round((z - 0.3) * 10) / 10));
  };
  const handleResetZoom = () => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
    toast.info("View reset to 100% (Sheet Fit)");
  };

  // Apply 2-Point Scale Calibration
  const handleApplyCalibration = () => {
    const rawVal = parseFloat(calibrationModal.inputMeters);
    if (isNaN(rawVal) || rawVal <= 0) {
      toast.error("Please enter a valid positive length in meters (e.g. 11.20).");
      return;
    }

    const { scale } = getCanvasTransform();

    if (calibrationModal.type === "floorplan") {
      const measuredM = calibrationModal.pixelDistance / scale;
      if (measuredM > 0) {
        const scaleFactor = rawVal / measuredM;
        const newWidth = Number((houseState.widthM * scaleFactor).toFixed(2));
        const newLength = Number((newWidth / (floorplanNaturalAspect || 0.52)).toFixed(2));
        const estimatedM2 = Number((newWidth * newLength * 0.88).toFixed(1));

        setHouseState((prev) => ({
          ...prev,
          widthM: newWidth,
          lengthM: newLength,
          totalM2: estimatedM2,
        }));

        toast.success(`✨ Calibrated Floorplan: ${newWidth}m Wide × ${newLength}m Deep (${estimatedM2} m²)! 1:1 Architectural Scale.`);
      }
      setIsCalibratingFloorplan(false);
      setFloorplanCalibPoints([]);
    } else {
      const ppm = calibrationModal.pixelDistance / rawVal;
      setScalePixelsPerMeter(ppm > 0 ? ppm : 20.0);
      toast.success(`✨ Calibrated Lot: Boundary scaled to ${rawVal}m accurately!`);
      setIsCalibratingLot(false);
      setLotCalibPoints([]);
    }

    setCalibrationModal((prev) => ({ ...prev, isOpen: false }));
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

  // Direct Floorplan Image/PDF Upload & Technical Page Analysis
  const handleDirectFloorplanUpload = async (file: File) => {
    try {
      setIsCroppingFloorplan(true);
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

      let rawImageUrl = "";
      let scannedText = "";

      if (isPdf) {
        const { pages, rawText } = await pdfDocumentToPagesAndText(file, 2);
        rawImageUrl = pages[0] || "";
        scannedText = rawText || "";
      } else {
        const reader = new FileReader();
        rawImageUrl = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(String(reader.result));
          reader.readAsDataURL(file);
        });
      }

      if (!rawImageUrl) {
        toast.error("Could not extract image from floorplan file.");
        setIsCroppingFloorplan(false);
        return;
      }

      // Technical floorplan matching
      const match = detectFloorplanFromText(scannedText, file.name);
      const targetDesign = match?.matchedDesignName || file.name.replace(/\.[^/.]+$/, "");
      const isDouble = match?.housingType === "Double Storey" || /double/i.test(targetDesign);

      await loadFloorplanUrl(rawImageUrl, targetDesign, isDouble);

      setIsCalibratingFloorplan(true);
      setFloorplanCalibPoints([]);
      setZoomLevel(1.6);
      toast.success(`✨ ${targetDesign} loaded in true A3 aspect ratio! Zoomed in for calibration.`);
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
            toast.success("Disclosure Plan PDF loaded as underlay! Click 'Calibrate Lot Scale' to match boundary lengths.");
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
            toast.success("Disclosure Plan image loaded as underlay! Click 'Calibrate Lot Scale' to match boundary lengths.");
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
    toast.info(`Applied preset lot: ${w}m × ${d}m (${w * d}m²)`);
  };

  // Export A3 Architectural 1:100 / 1:200 Siting Plan PDF
  const handleExportPdf = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prevZoom = zoomLevel;
    const prevPan = panOffset;
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });

    setTimeout(() => {
      const imgData = canvas.toDataURL("image/png", 1.0);

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a3",
      });

      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, 420, 297, "F");

      doc.addImage(imgData, "PNG", 0, 0, 420, 297);

      doc.save(`${houseState.designName.replace(/\s+/g, "_")}_A3_Siting_Plan_1-${effectiveScaleRatio}.pdf`);
      toast.success(`A3 Architectural Siting Plan (1:${effectiveScaleRatio} Scale) exported as PDF!`);

      setZoomLevel(prevZoom);
      setPanOffset(prevPan);
    }, 100);
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
        scaleRatio: effectiveScaleRatio,
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
        const imgData = canvas.toDataURL("image/jpeg", 0.90);
        const doc = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: "a3",
        });
        doc.addImage(imgData, "JPEG", 0, 0, 420, 297);
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
                  label: `A3 Architectural Siting Plan (1:${effectiveScaleRatio} Scale PDF)`,
                  fileName: `${currentTender.customer1?.surname || "Client"}_A3_Siting_Plan.pdf`,
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

      toast.success("A3 Siting Plan PDF saved to Tender Request Job Folder!");
      if (onSendToTender) onSendToTender(currentTender);
      navigate({ to: "/tender-request" });
    } catch (err) {
      console.error(err);
      toast.error("Could not bridge siting to Tender Portal.");
    }
  };

  return (
    <div className={`space-y-4 ${isMaximized ? "fixed inset-0 z-50 bg-slate-950 p-4 overflow-y-auto" : ""}`}>
      {/* 2-Point Scale Calibration Modal */}
      {calibrationModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Ruler className="h-5 w-5 text-amber-400" />
                {calibrationModal.type === "floorplan" ? "Calibrate Floorplan Dimensions" : "Calibrate Lot Scale"}
              </h3>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCalibrationModal((prev) => ({ ...prev, isOpen: false }));
                  setIsCalibratingFloorplan(false);
                  setIsCalibratingLot(false);
                  setFloorplanCalibPoints([]);
                  setLotCalibPoints([]);
                }}
                className="text-slate-400 hover:text-white h-7 w-7 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-xs text-slate-300">
              {calibrationModal.type === "floorplan"
                ? "Enter the exact real-world distance (in meters) between the two points you selected on the floorplan (e.g. wall length or overall house width)."
                : "Enter the real-world length (in meters) of the boundary segment you selected."}
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Exact Real-World Length (meters):</Label>
              <Input
                type="number"
                step="0.05"
                value={calibrationModal.inputMeters}
                onChange={(e) => setCalibrationModal((prev) => ({ ...prev, inputMeters: e.target.value }))}
                placeholder="e.g. 11.20"
                className="border-slate-700 bg-slate-950 text-base font-bold text-cyan-400"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCalibrationModal((prev) => ({ ...prev, isOpen: false }));
                  setIsCalibratingFloorplan(false);
                  setIsCalibratingLot(false);
                  setFloorplanCalibPoints([]);
                  setLotCalibPoints([]);
                }}
                className="border-slate-700 bg-slate-950 text-slate-300 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleApplyCalibration}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                Apply Exact Scale &amp; Setbacks
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Top Controls: Estate POD, Lot Mode, Scale Selector & Maximize Button */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 p-3.5 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl">
        {/* Estate POD Rules */}
        <div className="space-y-1 lg:col-span-4">
          <Label className="text-xs text-amber-400 font-bold flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            Queensland Estate POD Presets
          </Label>
          <Select value={selectedEstateId} onValueChange={setSelectedEstateId}>
            <SelectTrigger className="border-slate-800 bg-slate-950 text-xs font-semibold text-white h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-800 bg-slate-950 text-slate-100 max-h-72">
              {QUEENSLAND_ESTATE_POD_PRESETS.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  {p.estateName} ({p.suburb})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Lot Mode Switcher */}
        <div className="space-y-1 lg:col-span-4">
          <Label className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-cyan-400" />
            Lot Mode
          </Label>
          <div className="grid grid-cols-3 gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={lotMode === "rectangle" ? "default" : "outline"}
              onClick={() => setLotMode("rectangle")}
              className={lotMode === "rectangle" ? "bg-cyan-600 text-white font-bold text-xs h-8" : "border-slate-800 bg-slate-950 text-slate-400 text-xs h-8"}
            >
              Rectangle
            </Button>
            <Button
              type="button"
              size="sm"
              variant={lotMode === "custom_polygon" ? "default" : "outline"}
              onClick={() => setLotMode("custom_polygon")}
              className={lotMode === "custom_polygon" ? "bg-cyan-600 text-white font-bold text-xs h-8" : "border-slate-800 bg-slate-950 text-slate-400 text-xs h-8"}
            >
              Polygon
            </Button>
            <Button
              type="button"
              size="sm"
              variant={lotMode === "disclosure_plan" ? "default" : "outline"}
              onClick={() => setLotMode("disclosure_plan")}
              className={lotMode === "disclosure_plan" ? "bg-amber-600 text-white font-bold text-xs h-8" : "border-slate-800 bg-slate-950 text-slate-400 text-xs h-8"}
            >
              Disclosure
            </Button>
          </div>
        </div>

        {/* A3 Scale Selector (1:100 vs 1:200) */}
        <div className="space-y-1 lg:col-span-3">
          <Label className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-emerald-400" />
            A3 Sheet Scale
          </Label>
          <div className="grid grid-cols-3 gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={scaleMode === "auto" ? "default" : "outline"}
              onClick={() => setScaleMode("auto")}
              className={scaleMode === "auto" ? "bg-emerald-600 text-white font-bold text-xs h-8" : "border-slate-800 bg-slate-950 text-slate-400 text-xs h-8"}
            >
              Auto (1:{effectiveScaleRatio})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={scaleMode === "1:100" ? "default" : "outline"}
              onClick={() => setScaleMode("1:100")}
              className={scaleMode === "1:100" ? "bg-emerald-600 text-white font-bold text-xs h-8" : "border-slate-800 bg-slate-950 text-slate-400 text-xs h-8"}
            >
              1:100
            </Button>
            <Button
              type="button"
              size="sm"
              variant={scaleMode === "1:200" ? "default" : "outline"}
              onClick={() => setScaleMode("1:200")}
              className={scaleMode === "1:200" ? "bg-emerald-600 text-white font-bold text-xs h-8" : "border-slate-800 bg-slate-950 text-slate-400 text-xs h-8"}
            >
              1:200
            </Button>
          </div>
        </div>

        {/* Fullscreen / Maximize Toggle */}
        <div className="flex items-end justify-end lg:col-span-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsMaximized(!isMaximized)}
            className="w-full h-8 border-slate-800 bg-slate-950 text-slate-300 hover:text-white text-xs gap-1"
            title={isMaximized ? "Exit Fullscreen" : "Maximize Workspace"}
          >
            {isMaximized ? <Minimize2 className="h-3.5 w-3.5 text-cyan-400" /> : <Maximize2 className="h-3.5 w-3.5 text-cyan-400" />}
            {isMaximized ? "Exit" : "Expand"}
          </Button>
        </div>
      </div>

      {/* Mode-Specific Toolbar */}
      <div className="p-3 rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md space-y-3">
        {/* Rectangle Mode Quick Presets */}
        {lotMode === "rectangle" && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-300">Lot Presets:</span>
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
                className="border-slate-800 bg-slate-950/80 text-slate-300 hover:text-white text-xs font-mono h-7 px-2.5"
              >
                {preset.w}×{preset.d}m
              </Button>
            ))}

            <div className="flex items-center gap-2 ml-auto">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-slate-400">Frontage:</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={frontageM}
                  onChange={(e) => setFrontageM(parseFloat(e.target.value) || 14)}
                  className="w-16 h-7 border-slate-800 bg-slate-950 text-xs font-bold text-cyan-400"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-slate-400">Depth:</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={depthM}
                  onChange={(e) => setDepthM(parseFloat(e.target.value) || 30)}
                  className="w-16 h-7 border-slate-800 bg-slate-950 text-xs font-bold text-cyan-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* Disclosure Plan Upload & Scale Calibrator */}
        {lotMode === "disclosure_plan" && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
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
                    setIsCalibratingLot(true);
                    setLotCalibPoints([]);
                    toast.info("Click 2 points on a known boundary segment to calibrate scale!");
                  }}
                  className={isCalibratingLot ? "bg-amber-500 text-slate-950 font-bold text-xs h-7" : "border-slate-800 bg-slate-950 text-slate-300 text-xs h-7 gap-1.5"}
                >
                  <Ruler className="h-3.5 w-3.5 text-amber-400" />
                  {isCalibratingLot ? "Click 2 Boundary Points…" : "Calibrate Lot Scale"}
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsSettingBoundaryVertices(!isSettingBoundaryVertices)}
                  className={isSettingBoundaryVertices ? "bg-emerald-600 text-white font-bold text-xs h-7" : "border-slate-800 bg-slate-950 text-slate-300 text-xs h-7 gap-1.5"}
                >
                  <MousePointer className="h-3.5 w-3.5 text-emerald-400" />
                  {isSettingBoundaryVertices ? "Done Adjusting Pins" : "Adjust Boundary Pins"}
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
                className="border-slate-800 bg-slate-950 text-slate-300 text-xs h-7 gap-1"
              >
                <Plus className="h-3 w-3" /> Add Corner Vertex
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleSelectPresetLot(14, 30)}
                className="border-slate-800 bg-slate-950 text-slate-300 text-xs h-7 gap-1"
              >
                <RefreshCw className="h-3 w-3" /> Reset to Rectangle
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Architectural A3 Sheet Canvas (Left) + Siting Controls & Compliance (Right) */}
      <div className={`grid gap-5 items-start ${isMaximized ? "grid-cols-1 xl:grid-cols-[1fr_320px]" : "grid-cols-1 xl:grid-cols-[1fr_340px]"}`}>
        {/* Left Column: Pure White A3 Architectural Canvas with Black Boundaries */}
        <div className="relative rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl p-3.5 flex flex-col items-center">
          <div className="w-full flex flex-wrap items-center justify-between pb-2.5 text-xs border-b border-slate-800 gap-2">
            <div className="flex items-center gap-2">
              <span className="text-slate-200 font-bold flex items-center gap-1.5">
                <Building className="h-4 w-4 text-cyan-400" />
                A3 Siting Blueprint &bull; 1:{effectiveScaleRatio} Scale
              </span>
              {isCroppingFloorplan && (
                <span className="text-[10px] text-amber-400 bg-amber-950/80 border border-amber-800/60 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                  <Sparkles className="h-3 w-3" /> Reading &amp; auto-cropping layout…
                </span>
              )}
            </div>

            {/* Direct Floorplan Scale Calibration Trigger, Import from Editor & Upload */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Import from Floorplan Editor Tab Button */}
              <Button
                type="button"
                size="sm"
                onClick={handleImportCurrentFloorplan}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 h-7 shadow-xs"
                title="Automatically grab active floorplan design from the Floorplan Editor (Ground floor with garage for double-storey)"
              >
                <Import className="h-3.5 w-3.5" />
                Import Plan from Editor
              </Button>

              {/* Measure & Calibrate Button */}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsCalibratingFloorplan(!isCalibratingFloorplan);
                  setFloorplanCalibPoints([]);
                  if (!isCalibratingFloorplan) {
                    setZoomLevel(1.6);
                    toast.info("Zoom In & click 2 points on any known wall to calibrate scale!");
                  }
                }}
                className={isCalibratingFloorplan ? "bg-amber-500 text-slate-950 font-bold text-xs gap-1.5 h-7" : "border-slate-800 bg-slate-900 text-amber-300 hover:bg-slate-800 text-xs gap-1.5 font-bold h-7"}
              >
                <Ruler className="h-3.5 w-3.5 text-amber-400" />
                {isCalibratingFloorplan ? "Click 2 Points on Wall…" : "Measure & Calibrate Scale"}
              </Button>

              {/* Upload PDF / Plan */}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,image/*,application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleDirectFloorplanUpload(f);
                  }}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-200 transition-colors h-7">
                  <Upload className="h-3.5 w-3.5 text-cyan-400" />
                  Upload PDF / Plan
                </span>
              </label>
            </div>
          </div>

          {/* White Blueprint Canvas Container with Floating Zoom Toolbar */}
          <div
            ref={canvasContainerRef}
            className="relative w-full my-2 bg-white rounded-xl shadow-lg border border-slate-700/80 overflow-hidden flex items-center justify-center select-none"
            style={{ minHeight: isMaximized ? "780px" : "680px" }}
          >
            {/* Floating Glassmorphic Zoom Toolbar */}
            <div className="absolute top-3 left-3 z-30 flex items-center gap-1 bg-slate-900/90 border border-slate-700 rounded-lg p-1 shadow-lg backdrop-blur-md">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleZoomIn}
                className="h-7 w-7 p-0 text-slate-200 hover:text-white hover:bg-slate-800"
                title="Zoom In (+)"
              >
                <ZoomIn className="h-3.5 w-3.5 text-cyan-400" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleZoomOut}
                className="h-7 w-7 p-0 text-slate-200 hover:text-white hover:bg-slate-800"
                title="Zoom Out (-)"
              >
                <ZoomOut className="h-3.5 w-3.5 text-cyan-400" />
              </Button>
              <div className="px-1.5 text-[11px] font-mono font-bold text-cyan-300">
                {Math.round(zoomLevel * 100)}%
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleResetZoom}
                className="h-7 w-7 p-0 text-slate-200 hover:text-white hover:bg-slate-800"
                title="Fit to Sheet (100%)"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setIsPanningMode(!isPanningMode)}
                className={`h-7 w-7 p-0 ${isPanningMode ? "bg-cyan-600 text-white" : "text-slate-200 hover:text-white hover:bg-slate-800"}`}
                title="Pan Mode (or Middle-Click Drag)"
              >
                <Move className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* A3 Canvas */}
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className={`max-w-full h-auto ${isCalibratingFloorplan ? "cursor-crosshair" : isPanningMode ? "cursor-grab" : "cursor-move"}`}
              style={{ width: "100%", maxHeight: isMaximized ? "880px" : "780px", objectFit: "contain" }}
            />
          </div>

          {/* House Manipulation Action Bar */}
          <div className="w-full flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleFlipGarageSide}
                className="border-slate-800 bg-slate-900 text-cyan-300 hover:bg-slate-800 text-xs gap-1.5 font-bold h-7"
              >
                <FlipHorizontal className="h-3.5 w-3.5 text-cyan-400" />
                Flip Plan (Garage: {houseState.garageSide})
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setHouseState((prev) => ({ ...prev, rotationDeg: (prev.rotationDeg + 90) % 360 }))}
                className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs gap-1.5 h-7"
              >
                <RotateCw className="h-3.5 w-3.5 text-amber-400" />
                Rotate 90°
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setHouseState((prev) => ({ ...prev, isBtbActive: !prev.isBtbActive }))}
                className={houseState.isBtbActive ? "bg-amber-950/80 border-amber-500/60 text-amber-300 text-xs font-bold h-7" : "border-slate-800 bg-slate-900 text-slate-400 text-xs h-7"}
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
                className="w-14 h-7 border-slate-800 bg-slate-900 text-xs font-mono text-center font-bold text-cyan-400"
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
              Export A3 Siting PDF (1:{effectiveScaleRatio})
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
              Save to Tender Job Folder (A3 PDF)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
