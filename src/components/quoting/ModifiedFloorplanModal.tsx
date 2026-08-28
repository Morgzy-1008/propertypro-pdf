import React, { useState, useRef, useEffect, useCallback } from "react";
import * as pdfjs from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  Upload,
  Crop,
  RotateCcw,
  Check,
  ArrowRight,
  Info,
  FileText,
  Undo2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  MousePointer,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { pdfDocumentToPagesAndText } from "@/lib/pdfPages";

if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;
  } catch (e) {
    console.warn("Could not set pdf worker:", e);
  }
}

export interface ExtractedAreaSchedule {
  livingM2?: number;
  groundLivingM2?: number;
  firstLivingM2?: number;
  garageM2?: number;
  alfrescoM2?: number;
  porchM2?: number;
  balconyM2?: number;
  totalM2?: number;
  matchedLines?: string[];
}

export function parseAreaScheduleFromText(text: string): ExtractedAreaSchedule | null {
  if (!text) return null;

  const lines = text.split(/\r?\n/);
  const result: ExtractedAreaSchedule = { matchedLines: [] };

  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;

    const lower = cleanLine.toLowerCase();

    // Look for numbers like 146.40, 36.7, 11.9 in line
    const extractNum = (str: string): number | null => {
      const allNums = str.match(/\b\d+(?:\.\d{1,3})?\b/g);
      if (!allNums || allNums.length === 0) return null;
      const valid = allNums
        .map(Number)
        .filter((n) => n > 0.5 && n < 800 && n !== 2024 && n !== 2025 && n !== 2026 && n !== 2440 && n !== 2590 && n !== 2740);
      return valid.length > 0 ? valid[valid.length - 1] : null;
    };

    const val = extractNum(cleanLine);
    if (val === null) continue;

    if (
      lower.includes("ground living") ||
      lower.includes("ground floor living") ||
      lower.includes("lower living") ||
      lower.includes("ground floor area")
    ) {
      result.groundLivingM2 = val;
      result.matchedLines?.push(cleanLine);
    } else if (
      lower.includes("first living") ||
      lower.includes("first floor living") ||
      lower.includes("upper living") ||
      lower.includes("first floor area")
    ) {
      result.firstLivingM2 = val;
      result.matchedLines?.push(cleanLine);
    } else if (
      lower.includes("living area") ||
      lower.includes("living") ||
      lower.includes("meals") ||
      lower.includes("family") ||
      lower.includes("internal living")
    ) {
      if (!lower.includes("outdoor") && !lower.includes("alfresco") && !lower.includes("porch")) {
        result.livingM2 = val;
        result.matchedLines?.push(cleanLine);
      }
    } else if (
      lower.includes("garage") ||
      lower.includes("workshop") ||
      lower.includes("carport") ||
      lower.includes("garage/workshop") ||
      lower.includes("garage / workshop")
    ) {
      result.garageM2 = val;
      result.matchedLines?.push(cleanLine);
    } else if (
      lower.includes("alfresco") ||
      lower.includes("patio") ||
      lower.includes("outdoor living") ||
      lower.includes("outdoor") ||
      lower.includes("deck") ||
      lower.includes("verandah")
    ) {
      result.alfrescoM2 = val;
      result.matchedLines?.push(cleanLine);
    } else if (
      lower.includes("porch") ||
      lower.includes("portico") ||
      lower.includes("entry porch") ||
      lower.includes("front porch")
    ) {
      result.porchM2 = val;
      result.matchedLines?.push(cleanLine);
    } else if (lower.includes("balcony") || lower.includes("upper balcony")) {
      result.balconyM2 = val;
      result.matchedLines?.push(cleanLine);
    } else if (
      lower.includes("total") ||
      lower.includes("gfa") ||
      lower.includes("gross area") ||
      lower.includes("total area")
    ) {
      result.totalM2 = val;
      result.matchedLines?.push(cleanLine);
    }
  }

  const compSum =
    (result.livingM2 || (result.groundLivingM2 || 0) + (result.firstLivingM2 || 0)) +
    (result.garageM2 || 0) +
    (result.alfrescoM2 || 0) +
    (result.porchM2 || 0) +
    (result.balconyM2 || 0);

  if (compSum > 0 || (result.totalM2 && result.totalM2 > 0)) {
    if (!result.totalM2 || Math.abs(result.totalM2 - compSum) > 5) {
      result.totalM2 = Number(compSum.toFixed(2));
    }
    return result;
  }

  return null;
}

interface ModifiedFloorplanModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDoubleStorey: boolean;
  designName?: string;
  initialImageUrl?: string;
  onSave: (croppedDataUrl: string) => void;
  onExtractedAreas?: (areas: ExtractedAreaSchedule) => void;
}

type Point = { x: number; y: number }; // normalized 0..1 coordinates

const CLOSE_THRESHOLD_PX = 18; // pixels snap threshold to first point on screen

export function ModifiedFloorplanModal({
  isOpen,
  onClose,
  isDoubleStorey,
  designName,
  initialImageUrl,
  onSave,
  onExtractedAreas,
}: ModifiedFloorplanModalProps) {
  const [fileLoading, setFileLoading] = useState(false);
  const [docLoaded, setDocLoaded] = useState(false);
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [detectedAreas, setDetectedAreas] = useState<ExtractedAreaSchedule | null>(null);

  // Multi-step double storey workflow
  const [stage, setStage] = useState<"upload" | "crop_gf" | "crop_ff" | "crop_single">("upload");
  const [gfCroppedUrl, setGfCroppedUrl] = useState<string | null>(null);
  const [ffCroppedUrl, setFfCroppedUrl] = useState<string | null>(null);

  // Canvas refs
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const viewportContainerRef = useRef<HTMLDivElement>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);

  // Polygon cropping state (normalized coordinates 0 to 1)
  const [activePoints, setActivePoints] = useState<Point[]>([]);
  const [isClosed, setIsClosed] = useState(false);
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [isNearStart, setIsNearStart] = useState(false);

  // Base rendered image dimensions & fitted display dimensions
  const [imageSize, setImageSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [baseDisplaySize, setBaseDisplaySize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setDocLoaded(false);
      setPdfPages([]);
      setSelectedPageIndex(0);
      setZoom(1.0);
      setDetectedAreas(null);
      setStage("upload");
      setGfCroppedUrl(null);
      setFfCroppedUrl(null);
      setActivePoints([]);
      setIsClosed(false);
      setImageSize({ w: 0, h: 0 });
      setBaseDisplaySize({ w: 0, h: 0 });
      loadedImageRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && initialImageUrl && !docLoaded && pdfPages.length === 0) {
      setPdfPages([initialImageUrl]);
      setSelectedPageIndex(0);
      setDocLoaded(true);
      if (isDoubleStorey) {
        setStage("crop_gf");
      } else {
        setStage("crop_single");
      }
    }
  }, [isOpen, initialImageUrl, docLoaded, pdfPages.length, isDoubleStorey]);

  // Current rendered dimensions
  const currentRenderW = baseDisplaySize.w > 0 ? Math.round(baseDisplaySize.w * zoom) : imageSize.w;
  const currentRenderH = baseDisplaySize.h > 0 ? Math.round(baseDisplaySize.h * zoom) : imageSize.h;

  // Advance scroll wheel zoom towards where the cursor is currently positioned
  useEffect(() => {
    const container = viewportContainerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const containerRect = container.getBoundingClientRect();
      const cursorX = e.clientX - containerRect.left;
      const cursorY = e.clientY - containerRect.top;

      // Current content point under cursor
      const contentScrollX = container.scrollLeft + cursorX;
      const contentScrollY = container.scrollTop + cursorY;

      const currentW = currentRenderW || 1;
      const currentH = currentRenderH || 1;

      // Fraction on image (0..1)
      const normX = contentScrollX / currentW;
      const normY = contentScrollY / currentH;

      const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
      const nextZoom = Math.max(0.4, Math.min(5.5, +(zoom * zoomFactor).toFixed(2)));
      if (nextZoom === zoom) return;

      const newW = baseDisplaySize.w > 0 ? Math.round(baseDisplaySize.w * nextZoom) : imageSize.w * nextZoom;
      const newH = baseDisplaySize.h > 0 ? Math.round(baseDisplaySize.h * nextZoom) : imageSize.h * nextZoom;

      setZoom(nextZoom);

      // Keep the point under cursor at the exact same viewport position
      requestAnimationFrame(() => {
        if (!container) return;
        container.scrollLeft = normX * newW - cursorX;
        container.scrollTop = normY * newH - cursorY;
      });
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", onWheel);
    };
  }, [zoom, currentRenderW, currentRenderH, baseDisplaySize, imageSize]);

  // Draw overlay polygon (points, guidelines, closed filled area)
  const drawOverlay = useCallback(() => {
    const overlay = overlayCanvasRef.current;
    const base = baseCanvasRef.current;
    if (!overlay || !base) return;

    const w = overlay.width;
    const h = overlay.height;
    const ctx = overlay.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, w, h);

    if (activePoints.length === 0) return;

    // Dynamic scale factors for line widths and circles
    const nodeRadius = Math.max(5, Math.round(w / 180));
    const startNodeRadius = Math.max(8, Math.round(w / 120));
    const strokeWidth = Math.max(3, Math.round(w / 350));

    // 1. Draw completed / closed polygon
    if (isClosed && activePoints.length >= 3) {
      // Darken outside area using evenodd clip
      ctx.save();
      ctx.fillStyle = "rgba(15, 23, 42, 0.45)";
      ctx.fillRect(0, 0, w, h);

      // Cut out the selected polygon
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.moveTo(activePoints[0].x * w, activePoints[0].y * h);
      for (let i = 1; i < activePoints.length; i++) {
        ctx.lineTo(activePoints[i].x * w, activePoints[i].y * h);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Highlight boundary
      ctx.beginPath();
      ctx.moveTo(activePoints[0].x * w, activePoints[0].y * h);
      for (let i = 1; i < activePoints.length; i++) {
        ctx.lineTo(activePoints[i].x * w, activePoints[i].y * h);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(16, 185, 129, 0.2)"; // Emerald tint
      ctx.fill();
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = strokeWidth;
      ctx.stroke();

      // Draw vertex nodes
      for (let i = 0; i < activePoints.length; i++) {
        const p = activePoints[i];
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, nodeRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#10b981";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = Math.max(2, strokeWidth * 0.6);
        ctx.stroke();
      }

      // Center confirmation badge
      const cx = (activePoints.reduce((s, p) => s + p.x, 0) / activePoints.length) * w;
      const cy = (activePoints.reduce((s, p) => s + p.y, 0) / activePoints.length) * h;
      ctx.font = `bold ${Math.max(18, Math.round(w / 50))}px sans-serif`;
      ctx.fillStyle = "#065f46";
      ctx.textAlign = "center";
      ctx.fillText("✓ Floorplan Boundary Closed", cx, cy);

      return;
    }

    // 2. In-progress drawing
    ctx.beginPath();
    ctx.moveTo(activePoints[0].x * w, activePoints[0].y * h);
    for (let i = 1; i < activePoints.length; i++) {
      ctx.lineTo(activePoints[i].x * w, activePoints[i].y * h);
    }

    // Rubber-band line to current mouse position
    if (mousePos && !isClosed) {
      ctx.lineTo(mousePos.x * w, mousePos.y * h);
    }

    ctx.strokeStyle = "#06b6d4"; // Cyan-500
    ctx.lineWidth = strokeWidth;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Semi-transparent polygon preview
    if (activePoints.length >= 2 && mousePos && !isClosed) {
      ctx.beginPath();
      ctx.moveTo(activePoints[0].x * w, activePoints[0].y * h);
      for (let i = 1; i < activePoints.length; i++) {
        ctx.lineTo(activePoints[i].x * w, activePoints[i].y * h);
      }
      ctx.lineTo(mousePos.x * w, mousePos.y * h);
      ctx.closePath();
      ctx.fillStyle = "rgba(6, 182, 212, 0.15)";
      ctx.fill();
    }

    // Draw vertex dots
    for (let i = 0; i < activePoints.length; i++) {
      const p = activePoints[i];
      const isStart = i === 0;
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, isStart ? startNodeRadius : nodeRadius, 0, Math.PI * 2);
      ctx.fillStyle = isStart ? "#f59e0b" : "#06b6d4"; // Start is amber
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(2, strokeWidth * 0.6);
      ctx.stroke();
    }

    // Highlight start point when hovering near to snap/close
    if (activePoints.length >= 3 && isNearStart && !isClosed) {
      const startP = activePoints[0];
      ctx.beginPath();
      ctx.arc(startP.x * w, startP.y * h, Math.max(16, startNodeRadius * 2), 0, Math.PI * 2);
      ctx.strokeStyle = "#10b981"; // Emerald green snap ring
      ctx.lineWidth = strokeWidth * 1.5;
      ctx.stroke();

      ctx.font = `bold ${Math.max(14, Math.round(w / 65))}px sans-serif`;
      ctx.fillStyle = "#10b981";
      ctx.textAlign = "center";
      ctx.fillText("Click to Close Polygon", startP.x * w, startP.y * h - 22);
    }
  }, [activePoints, isClosed, mousePos, isNearStart]);

  // Re-render when PDF page, stage, or window changes
  useEffect(() => {
    if (pdfPages.length === 0 || stage === "upload") return;
    const pageUrl = pdfPages[selectedPageIndex] || pdfPages[0];
    if (!pageUrl) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      loadedImageRef.current = img;
      const baseCanvas = baseCanvasRef.current;
      const overlayCanvas = overlayCanvasRef.current;
      if (!baseCanvas || !overlayCanvas) return;

      const nw = img.naturalWidth;
      const nh = img.naturalHeight;

      baseCanvas.width = nw;
      baseCanvas.height = nh;
      overlayCanvas.width = nw;
      overlayCanvas.height = nh;
      setImageSize({ w: nw, h: nh });

      // Calculate initial base display size to fit viewport container comfortably
      const container = viewportContainerRef.current;
      const containerW = container ? container.clientWidth - 40 : 1200;
      const containerH = container ? container.clientHeight - 40 : 750;

      const fitScale = Math.min(containerW / nw, containerH / nh, 1.0);
      const baseW = Math.round(nw * fitScale);
      const baseH = Math.round(nh * fitScale);
      setBaseDisplaySize({ w: baseW, h: baseH });

      const ctx = baseCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, nw, nh);
        ctx.drawImage(img, 0, 0, nw, nh);
      }
      setDocLoaded(true);
      drawOverlay();
    };
    img.src = pageUrl;
  }, [pdfPages, selectedPageIndex, stage, drawOverlay]);

  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  const handleFileUpload = async (file: File) => {
    setFileLoading(true);
    setDocLoaded(false);
    setActivePoints([]);
    setIsClosed(false);
    try {
      const result = await pdfDocumentToPagesAndText(file, 6);
      if (result.pages.length === 0) {
        toast.error("Could not read pages from file. Please ensure it is a valid PDF or Image.");
        return;
      }
      setPdfPages(result.pages);
      setSelectedPageIndex(0);

      // Auto-scan PDF text for Area Schedule Table
      const extracted = parseAreaScheduleFromText(result.rawText);
      if (extracted) {
        setDetectedAreas(extracted);
        onExtractedAreas?.(extracted);
        const livingPart =
          extracted.livingM2 ||
          ((extracted.groundLivingM2 || 0) + (extracted.firstLivingM2 || 0));
        toast.success(
          `Area Schedule detected & imported: Living ${livingPart ? livingPart + "m²" : ""}${
            extracted.garageM2 ? ", Garage " + extracted.garageM2 + "m²" : ""
          }${extracted.alfrescoM2 ? ", Alfresco " + extracted.alfrescoM2 + "m²" : ""}${
            extracted.porchM2 ? ", Porch " + extracted.porchM2 + "m²" : ""
          } (Total: ${extracted.totalM2}m²)`
        );
      }

      if (isDoubleStorey) {
        setStage("crop_gf");
      } else {
        setStage("crop_single");
      }
    } catch (err: any) {
      console.error("Error loading floorplan file:", err);
      toast.error("Failed to load file. Please try another PDF or Image.");
    } finally {
      setFileLoading(false);
    }
  };

  // Convert mouse event to normalized coordinates [0..1] with 100% precision
  const getNormalizedCoords = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const x = Math.max(0, Math.min(1, clientX / rect.width));
    const y = Math.max(0, Math.min(1, clientY / rect.height));
    return { x, y };
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isClosed) return;

    const pt = getNormalizedCoords(e);
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;

    const rect = overlay.getBoundingClientRect();

    // Check if clicking near start point to close polygon (when >= 3 points)
    if (activePoints.length >= 3) {
      const w = rect.width;
      const h = rect.height;
      const dx = (pt.x - activePoints[0].x) * w;
      const dy = (pt.y - activePoints[0].y) * h;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < CLOSE_THRESHOLD_PX) {
        setIsClosed(true);
        setIsNearStart(false);
        toast.success("Floorplan polygon closed! Ready to apply.");
        return;
      }
    }

    // Add new point
    setActivePoints((prev) => [...prev, pt]);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isClosed) return;
    const pt = getNormalizedCoords(e);
    setMousePos(pt);

    const overlay = overlayCanvasRef.current;
    if (!overlay || activePoints.length < 3) {
      setIsNearStart(false);
      return;
    }

    const rect = overlay.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const dx = (pt.x - activePoints[0].x) * w;
    const dy = (pt.y - activePoints[0].y) * h;
    const dist = Math.sqrt(dx * dx + dy * dy);

    setIsNearStart(dist < CLOSE_THRESHOLD_PX);
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isClosed) {
      setIsClosed(false);
      return;
    }
    if (activePoints.length > 0) {
      setActivePoints((prev) => prev.slice(0, -1));
    }
  };

  const handleClosePolygonExplicitly = () => {
    if (activePoints.length >= 3) {
      setIsClosed(true);
      setIsNearStart(false);
      toast.success("Floorplan polygon closed! Ready to apply.");
    } else {
      toast.error("Please place at least 3 points around the floorplan before closing.");
    }
  };

  const handleUndoPoint = () => {
    if (isClosed) {
      setIsClosed(false);
      return;
    }
    if (activePoints.length > 0) {
      setActivePoints((prev) => prev.slice(0, -1));
    }
  };


    const handleAutoCrop = () => {
    const baseCanvas = baseCanvasRef.current;
    if (!baseCanvas) return;

    const w = baseCanvas.width;
    const h = baseCanvas.height;
    const ctx = baseCanvas.getContext("2d");
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let minX = w, maxX = 0, minY = h, maxY = 0;
    const threshold = 230;

    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const idx = (y * w + x) * 4;
        const alpha = data[idx + 3];
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        if (alpha > 50 && (r < threshold || g < threshold || b < threshold)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (minX >= maxX || minY >= maxY) {
      toast.error("Could not auto-detect floorplan boundaries. Please click manually on the page.");
      return;
    }

    const pMinX = Math.max(0, (minX - 6) / w);
    const pMaxX = Math.min(1, (maxX + 6) / w);
    const pMinY = Math.max(0, (minY - 6) / h);
    const pMaxY = Math.min(1, (maxY + 6) / h);

    const autoPoints: Point[] = [
      { x: pMinX, y: pMinY },
      { x: pMaxX, y: pMinY },
      { x: pMaxX, y: pMaxY },
      { x: pMinX, y: pMaxY },
    ];

    setActivePoints(autoPoints);
    setIsClosed(true);
    toast.success("✨ Floorplan auto-cropped! Click 'Apply Cropped Floorplan' or adjust points.");
  };

  const handleResetPoints = () => {
    setActivePoints([]);
    setIsClosed(false);
    setIsNearStart(false);
    toast.info("Reverted to full image. Click anywhere to draw custom crop.");
  };

  const cropPolygonRegion = (): string | null => {
    const baseCanvas = baseCanvasRef.current;
    if (!baseCanvas || activePoints.length < 3 || !isClosed) return null;

    const iw = baseCanvas.width;
    const ih = baseCanvas.height;

    const pixelPoints = activePoints.map((p) => ({ x: p.x * iw, y: p.y * ih }));
    const minX = Math.max(0, Math.min(...pixelPoints.map((p) => p.x)));
    const maxX = Math.min(iw, Math.max(...pixelPoints.map((p) => p.x)));
    const minY = Math.max(0, Math.min(...pixelPoints.map((p) => p.y)));
    const maxY = Math.min(ih, Math.max(...pixelPoints.map((p) => p.y)));

    const padding = 20;
    const boundW = Math.max(50, Math.round(maxX - minX));
    const boundH = Math.max(50, Math.round(maxY - minY));

    const finalW = boundW + padding * 2;
    const finalH = boundH + padding * 2;

    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = finalW;
    cropCanvas.height = finalH;
    const ctx = cropCanvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, finalW, finalH);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pixelPoints[0].x - minX + padding, pixelPoints[0].y - minY + padding);
    for (let i = 1; i < pixelPoints.length; i++) {
      ctx.lineTo(pixelPoints[i].x - minX + padding, pixelPoints[i].y - minY + padding);
    }
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(baseCanvas, -minX + padding, -minY + padding, iw, ih);
    ctx.restore();

    return cropCanvas.toDataURL("image/png", 0.95);
  };

  const combineDoubleStoreyPlans = async (gfUrl: string, ffUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const imgGF = new Image();
      const imgFF = new Image();
      let loadedCount = 0;

      const checkBoth = () => {
        loadedCount += 1;
        if (loadedCount === 2) {
          const maxH = Math.max(imgGF.naturalHeight, imgFF.naturalHeight);
          const totalW = imgGF.naturalWidth + imgFF.naturalWidth + 60; // 60px gap

          const canvas = document.createElement("canvas");
          canvas.width = totalW;
          canvas.height = maxH + 70; // extra space for Ground/First header labels
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(gfUrl);
            return;
          }

          // White background
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Labels
          ctx.font = "bold 26px Inter, sans-serif";
          ctx.fillStyle = "#0f172a";
          ctx.textAlign = "center";
          ctx.fillText("GROUND FLOOR", imgGF.naturalWidth / 2, 40);
          ctx.fillText("FIRST FLOOR", imgGF.naturalWidth + 60 + imgFF.naturalWidth / 2, 40);

          // Draw GF & FF
          ctx.drawImage(imgGF, 0, 60);
          ctx.drawImage(imgFF, imgGF.naturalWidth + 60, 60);

          resolve(canvas.toDataURL("image/png", 0.95));
        }
      };

      imgGF.onload = checkBoth;
      imgFF.onload = checkBoth;
      imgGF.src = gfUrl;
      imgFF.src = ffUrl;
    });
  };

  const handleNextOrFinish = async () => {
    if (!isClosed || activePoints.length < 3) {
      toast.error("Please click around the floorplan perimeter and click the start point to close the polygon.");
      return;
    }

    const cropped = cropPolygonRegion();
    if (!cropped) {
      toast.error("Could not generate cropped floorplan. Please try redrawing the boundary.");
      return;
    }

    if (stage === "crop_single") {
      onSave(cropped);
      toast.success("Modified architectural floorplan applied to estimate!");
      onClose();
    } else if (stage === "crop_gf") {
      setGfCroppedUrl(cropped);
      setStage("crop_ff");
      setActivePoints([]);
      setIsClosed(false);
      toast.info("Ground Floor saved! Now click around the First Floor (FF) and close the polygon.");
    } else if (stage === "crop_ff") {
      setFfCroppedUrl(cropped);
      if (gfCroppedUrl) {
        const combined = await combineDoubleStoreyPlans(gfCroppedUrl, cropped);
        onSave(combined);
        toast.success("Two-storey modified floorplan combined and attached to estimate!");
        onClose();
      } else {
        onSave(cropped);
        toast.success("Modified architectural floorplan applied to estimate!");
        onClose();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="w-[98vw] max-w-[99vw] h-[96vh] max-h-[98vh] sm:max-w-[99vw] p-4 sm:p-5 flex flex-col bg-slate-950 text-slate-100 border border-slate-800 shadow-2xl overflow-hidden rounded-2xl"
      >
        {/* Header */}
        <DialogHeader className="border-b border-slate-800 pb-2.5 flex-none">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Crop className="h-5 w-5 text-emerald-400" />
              Update with Modified Design &mdash; Precision Polygon Cropper
            </DialogTitle>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {designName ? `Target Home Design: ${designName}` : "Custom Architectural Plan"} &middot;{" "}
            {isDoubleStorey ? "Two Storey Configuration" : "Single Storey Configuration"}
          </p>
        </DialogHeader>

        {/* Step Indicator for Double Storey */}
        {isDoubleStorey && stage !== "upload" && (
          <div className="flex items-center justify-between bg-slate-900/90 p-2 rounded-xl border border-slate-800 text-xs flex-none mt-2">
            <div className="flex items-center gap-3">
              <span
                className={`px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5 ${
                  stage === "crop_gf"
                    ? "bg-emerald-500 text-slate-950"
                    : "bg-emerald-950 text-emerald-300 border border-emerald-700"
                }`}
              >
                {stage === "crop_ff" && <Check className="h-3.5 w-3.5" />} 1. Ground Floor (GF)
              </span>
              <ArrowRight className="h-4 w-4 text-slate-500" />
              <span
                className={`px-2.5 py-1 rounded-md font-bold ${
                  stage === "crop_ff"
                    ? "bg-emerald-500 text-slate-950"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                2. First Floor (FF)
              </span>
            </div>
            <span className="text-[11px] text-amber-400 font-semibold">
              {stage === "crop_gf" ? "Click boundary points around Ground Floor" : "Click boundary points around First Floor"}
            </span>
          </div>
        )}

        {/* Detected Area Schedule Banner */}
        {detectedAreas && (
          <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200 flex items-center justify-between gap-2.5 flex-none mt-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Sparkles className="h-4 w-4 text-emerald-400 flex-none" />
              <span className="font-bold text-white text-[11px]">Area Table Detected &amp; Extracted:</span>
              <div className="flex items-center gap-2 font-mono text-[10.5px]">
                {detectedAreas.livingM2 ? (
                  <span>Living: <strong className="text-emerald-300">{detectedAreas.livingM2} m²</strong></span>
                ) : null}
                {detectedAreas.groundLivingM2 ? (
                  <span>GF: <strong className="text-emerald-300">{detectedAreas.groundLivingM2} m²</strong></span>
                ) : null}
                {detectedAreas.firstLivingM2 ? (
                  <span>FF: <strong className="text-emerald-300">{detectedAreas.firstLivingM2} m²</strong></span>
                ) : null}
                {detectedAreas.garageM2 ? (
                  <span>Garage: <strong className="text-emerald-300">{detectedAreas.garageM2} m²</strong></span>
                ) : null}
                {detectedAreas.alfrescoM2 ? (
                  <span>Alfresco: <strong className="text-emerald-300">{detectedAreas.alfrescoM2} m²</strong></span>
                ) : null}
                {detectedAreas.porchM2 ? (
                  <span>Porch: <strong className="text-emerald-300">{detectedAreas.porchM2} m²</strong></span>
                ) : null}
                {detectedAreas.balconyM2 ? (
                  <span>Balcony: <strong className="text-emerald-300">{detectedAreas.balconyM2} m²</strong></span>
                ) : null}
                {detectedAreas.totalM2 ? (
                  <span className="bg-emerald-900/80 text-white font-bold px-2 py-0.5 rounded border border-emerald-400/40">
                    Total: {detectedAreas.totalM2} m²
                  </span>
                ) : null}
              </div>
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700">
              Auto-Calculated
            </span>
          </div>
        )}

        {/* Instructions & Mouse Controls Bar */}
        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 flex flex-wrap items-center justify-between gap-2.5 flex-none mt-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              type="button"
              onClick={handleAutoCrop}
              className="h-7 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold gap-1 shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" /> ⚡ Auto Crop
            </Button>
            <span className="text-[11px] text-slate-300">
              Press <strong>Auto Crop</strong> to snap to floorplan bounds, or click boundary points manually.
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 font-mono">
            <MousePointer className="h-3 w-3 text-cyan-400" />
            <span>Wheel to Zoom &bull; Drag / Scroll to Pan</span>
          </div>
        </div>

        {/* Modal Body */}
        {stage === "upload" ? (
          /* Upload State */
          <div className="my-auto py-16 px-6 border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-2xl bg-slate-900/40 text-center space-y-4 transition-all">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Upload className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">Upload Modified Architectural Floorplan</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Upload a revised PDF brochure sheet or image. The entire sheet renders with full fidelity for polygon cropping.
              </p>
            </div>

            <label className="inline-flex cursor-pointer">
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp"
                disabled={fileLoading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className="hidden"
              />
              <Button
                asChild
                disabled={fileLoading}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs gap-2 px-6 py-3 shadow-lg shadow-emerald-500/20"
              >
                <span>
                  <FileText className="h-4 w-4" />
                  {fileLoading ? "Rendering Full PDF Sheet..." : "Browse & Upload Plan File"}
                </span>
              </Button>
            </label>
          </div>
        ) : (
          /* Interactive Polygon Workspace */
          <div className="flex-1 flex flex-col min-h-0 space-y-2 mt-2 overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-900/90 p-2 rounded-xl border border-slate-800 text-xs flex-none">
              {/* PDF Page Navigation */}
              {pdfPages.length > 1 && (
                <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-slate-300 hover:text-white"
                    disabled={selectedPageIndex <= 0}
                    onClick={() => setSelectedPageIndex((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <span className="text-[11px] font-mono px-1.5 text-slate-300">
                    Page {selectedPageIndex + 1} of {pdfPages.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-slate-300 hover:text-white"
                    disabled={selectedPageIndex >= pdfPages.length - 1}
                    onClick={() => setSelectedPageIndex((p) => Math.min(pdfPages.length - 1, p + 1))}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}

              {/* Point Status Badge & Actions */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  type="button"
                  onClick={handleAutoCrop}
                  className="h-7 text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold gap-1 shadow-md shadow-amber-500/20"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>⚡ Auto Crop Floorplan</span>
                </Button>

                <span className="text-[11px] bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-md text-slate-300 font-mono">
                  Points: <strong>{activePoints.length}</strong> {isClosed ? "(Closed ✓)" : "(In Progress)"}
                </span>

                {activePoints.length >= 3 && !isClosed && (
                  <Button
                    size="sm"
                    onClick={handleClosePolygonExplicitly}
                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1 shadow-sm"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Close
                  </Button>
                )}

                {activePoints.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleUndoPoint}
                    className="h-7 text-xs border-slate-700 bg-slate-800 text-slate-300 hover:text-white gap-1"
                  >
                    <Undo2 className="h-3 w-3" /> Undo
                  </Button>
                )}

                {activePoints.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleResetPoints}
                    className="h-7 text-xs border-slate-700 bg-slate-800 text-slate-300 hover:text-white gap-1"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset
                  </Button>
                )}
              </div>

              {/* Wheel Zoom Status Indicator & New File */}
              <div className="flex items-center gap-2 ml-auto">
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg">
                  <span className="text-[10px] font-mono text-slate-300">
                    Zoom: <strong>{Math.round(zoom * 100)}%</strong>
                  </span>
                  {zoom !== 1.0 && (
                    <button
                      type="button"
                      onClick={() => setZoom(1.0)}
                      className="text-[9px] text-cyan-400 hover:underline border-l border-slate-800 pl-1.5 ml-0.5 font-bold"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setStage("upload")}
                  className="h-7 text-xs border-slate-700 bg-slate-800 text-slate-300 hover:text-white gap-1"
                >
                  <Upload className="h-3 w-3" /> New File
                </Button>
              </div>
            </div>

            {/* Scrollable & Zoomable Fullscreen Viewport */}
            <div
              ref={viewportContainerRef}
              className="flex-1 w-full overflow-auto rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex items-center justify-center select-none relative"
            >
              <div
                className="relative shadow-2xl rounded-sm border border-slate-700 bg-white select-none transition-[width,height] duration-75 flex-none"
                style={{
                  width: `${currentRenderW}px`,
                  height: `${currentRenderH}px`,
                }}
              >
                {/* Base Rendered Image Canvas */}
                <canvas
                  ref={baseCanvasRef}
                  className="block w-full h-full bg-white pointer-events-none"
                />

                {/* Interactive Polygon Click Overlay Canvas */}
                <canvas
                  ref={overlayCanvasRef}
                  onClick={handleCanvasClick}
                  onMouseMove={handleCanvasMouseMove}
                  onContextMenu={handleRightClick}
                  className="absolute top-0 left-0 w-full h-full cursor-crosshair z-10"
                />
              </div>
            </div>

            {/* Bottom Action Footer */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-2.5 flex-none">
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </Button>

              <div className="flex items-center gap-2">
                {isClosed && (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" /> Polygon Closed &amp; Ready
                  </span>
                )}
                <Button
                  onClick={handleNextOrFinish}
                  disabled={!isClosed}
                  className={`font-bold text-xs gap-2 px-6 py-2.5 shadow-lg transition-all ${
                    isClosed
                      ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20"
                      : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                  }`}
                >
                  <Check className="h-4 w-4" />
                  {stage === "crop_gf"
                    ? "Proceed to Step 2: Crop First Floor (FF) →"
                    : "Save & Apply Modified Floorplan to Estimate"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
