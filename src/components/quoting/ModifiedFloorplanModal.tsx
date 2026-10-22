import React, { useState, useRef, useEffect, useCallback } from "react";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
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
  AlertTriangle,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { pdfDocumentToPagesAndText } from "@/lib/pdfPages";
import { parseAreaScheduleFromText as parseAreaScheduleShared } from "@/lib/floorplan/areaScheduleParser";

if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
  try {
    const workerUrl = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).href;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  } catch (e) {
    console.warn("Could not set pdf worker:", e);
  }
}

export interface ExtractedAreaSchedule {
  lowerLivingM2?: number;
  livingM2?: number;
  groundLivingM2?: number;
  firstLivingM2?: number;
  garageM2?: number;
  alfrescoM2?: number;
  porchM2?: number;
  balconyM2?: number;
  totalM2?: number;
  matchedLines?: string[];
  unassignedItems?: { label: string; sqm: number; originalLine: string }[];
}

export function parseAreaScheduleFromText(text: string): ExtractedAreaSchedule | null {
  return parseAreaScheduleShared(text);
}

function legacyParseAreaScheduleFromText(text: string): ExtractedAreaSchedule | null {
  if (!text) return null;

  // 1. Locate dedicated AREAS table block if present
  let scheduleText = text;
  const areasIndex = text.search(
    /(?:FLOOR\s*AREAS|SCHEDULE\s*OF\s*AREAS|AREA\s*SCHEDULE|AREAS\s*[:(\n\r]|AREAS\b|Floor\s+Living\s+Area|Living\s+Area\s+Garage)/i
  );
  if (areasIndex !== -1) {
    // Find the end of this schedule block (marked by TOTAL ... m² or next major section)
    const afterAreas = text.slice(areasIndex);
    const totalMatch = afterAreas.search(
      /(?:TOTAL\s*(?:AREA)?\s*[\d.]+\s*m²|TOTAL\s*[:\s]*[\d.]+|[\d.]+\s*m²\s*TOTAL)/i
    );
    if (totalMatch !== -1) {
      // End right after the TOTAL line
      const endOfTotal = afterAreas.indexOf('\n', totalMatch + 20);
      scheduleText = afterAreas.slice(0, endOfTotal !== -1 ? endOfTotal : totalMatch + 40);
    } else {
      scheduleText = afterAreas.slice(0, 1800);
    }
  }

  const lines = scheduleText.split(/\r?\n/);
  const result: ExtractedAreaSchedule = { matchedLines: [], unassignedItems: [] };
  const seenZones = new Set<string>();

  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;

    // Check if line contains tab characters from coordinate column sorting
    const rawCells = cleanLine.includes("\t")
      ? cleanLine.split("\t").map((c) => c.trim()).filter(Boolean)
      : [cleanLine];
    const cells = rawCells.map((c) => c.replace(/^\s*\d+(?:[\.\)]\s*|\s+)(?=[a-zA-Z])/g, "").trim());

    for (let c = 0; c < cells.length; c++) {
      const cell = cells[c];
      const prevCell = cells[c - 1] || "";

      // Extract numbers
      const numMatches = [...cell.matchAll(/\b\d+(?:\.\d{1,3})?\b/g)];
      for (const m of numMatches) {
        const val = Number(m[0]);
        if (val >= 1.5 && val < 800 && val !== 2024 && val !== 2025 && val !== 2026 && val !== 2440 && val !== 2590 && val !== 2740) {
          // Label is from this cell or previous cell
          let label = cell.replace(/\b\d+(?:\.\d{1,3})?\b/g, "").replace(/m²|sqm|m2/gi, "").trim();
          if (label.length < 3 && prevCell && !prevCell.match(/^\d+$/)) {
            label = prevCell;
          }

          if (label) {
            const lower = label.toLowerCase();
            // Discard drawing title block noise
            if (lower.includes("scale") || lower.includes("sheet") || lower.includes("date") || lower.includes("rev") || lower.includes("drawing title")) {
              continue;
            }

            if (lower.includes("lower ground") || lower.includes("lower floor") || lower.includes("lower living")) {
              if (!seenZones.has("lower_ground")) {
                seenZones.add("lower_ground");
                result.lowerLivingM2 = val;
                result.matchedLines?.push(`${label} -> ${val}`);
              }
            } else if (lower.includes("ground floor living") || lower.includes("ground living") || (lower.includes("ground floor") && lower.includes("living"))) {
              if (!seenZones.has("ground_living")) {
                seenZones.add("ground_living");
                result.groundLivingM2 = val;
                result.matchedLines?.push(`${label} -> ${val}`);
              }
            } else if (lower.includes("first floor living") || lower.includes("first living") || lower.includes("upper living")) {
              if (!seenZones.has("first_living")) {
                seenZones.add("first_living");
                result.firstLivingM2 = val;
                result.matchedLines?.push(`${label} -> ${val}`);
              }
            } else if (lower.includes("living area") || lower.includes("internal living") || (lower.includes("living") && !lower.includes("outdoor") && !lower.includes("alfresco"))) {
              if (!seenZones.has("living")) {
                seenZones.add("living");
                result.livingM2 = val;
                result.matchedLines?.push(`${label} -> ${val}`);
              }
            } else if (lower.includes("garage") || lower.includes("carport")) {
              if (!seenZones.has("garage")) {
                seenZones.add("garage");
                result.garageM2 = val;
                result.matchedLines?.push(`${label} -> ${val}`);
              }
            } else if (lower.includes("alfresco") || lower.includes("patio") || lower.includes("outdoor")) {
              if (!seenZones.has("alfresco")) {
                seenZones.add("alfresco");
                result.alfrescoM2 = val;
                result.matchedLines?.push(`${label} -> ${val}`);
              }
            } else if (lower.includes("porch") || lower.includes("portico")) {
              if (!seenZones.has("porch")) {
                seenZones.add("porch");
                result.porchM2 = val;
                result.matchedLines?.push(`${label} -> ${val}`);
              }
            } else if (lower.includes("balcony") || lower.includes("upper balcony")) {
              if (!seenZones.has("balcony")) {
                seenZones.add("balcony");
                result.balconyM2 = val;
                result.matchedLines?.push(`${label} -> ${val}`);
              }
            } else if (lower.includes("total") || lower.includes("gfa") || lower.includes("gross")) {
              if (!seenZones.has("total")) {
                seenZones.add("total");
                result.totalM2 = val;
                result.matchedLines?.push(`${label} -> ${val}`);
              }
            } else {
              const isLikelyAreaRow =
                lower.includes("m²") ||
                lower.includes("sqm") ||
                lower.includes("m2") ||
                lower.includes("dwelling") ||
                lower.includes("unit") ||
                lower.includes("suite") ||
                lower.includes("studio") ||
                lower.includes("flat") ||
                lower.includes("room") ||
                lower.includes("annex") ||
                lower.includes("generation") ||
                lower.includes("mezzanine") ||
                lower.includes("workshop");

              if (isLikelyAreaRow && val > 2 && val < 500) {
                result.unassignedItems?.push({
                  label,
                  sqm: val,
                  originalLine: cleanLine,
                });
              }
            }
          }
        }
      }
    }
  }

  // Column Alignment Reconciliation: If Balcony > 40 and First Living < 25 on multi-storey, swap
  if (result.balconyM2 && result.balconyM2 > 40) {
    if (!result.firstLivingM2 || result.firstLivingM2 < 25) {
      const wrongLiving = result.firstLivingM2 || 0;
      result.firstLivingM2 = result.balconyM2;
      result.balconyM2 = wrongLiving > 0 ? wrongLiving : undefined;
    }
  }

  // Mathematical Identity Solver: Total = Living (or Ground + First) + Garage + Alfresco + Porch + Balcony
  if (result.totalM2 && result.totalM2 > 50) {
    const tot = result.totalM2;
    const liv = result.livingM2 || ((result.groundLivingM2 || 0) + (result.firstLivingM2 || 0)) || undefined;
    const gar = result.garageM2;
    const alf = result.alfrescoM2;
    const por = result.porchM2;
    const bal = result.balconyM2 || 0;

    if (!alf && liv && gar && por) {
      const derivedAlf = Math.round((tot - (liv + gar + por + bal)) * 100) / 100;
      if (derivedAlf > 2 && derivedAlf < 80) {
        result.alfrescoM2 = derivedAlf;
      }
    } else if (!por && liv && gar && alf) {
      const derivedPor = Math.round((tot - (liv + gar + alf + bal)) * 100) / 100;
      if (derivedPor > 0.5 && derivedPor < 30) {
        result.porchM2 = derivedPor;
      }
    } else if (!gar && liv && alf && por) {
      const derivedGar = Math.round((tot - (liv + alf + por + bal)) * 100) / 100;
      if (derivedGar > 10 && derivedGar < 120) {
        result.garageM2 = derivedGar;
      }
    } else if (!liv && gar && alf && por) {
      const derivedLiv = Math.round((tot - (gar + alf + por + bal)) * 100) / 100;
      if (derivedLiv > 50 && derivedLiv < 500) {
        result.livingM2 = derivedLiv;
      }
    }
  }

  const compSum =
    (result.livingM2 || (result.groundLivingM2 || 0) + (result.firstLivingM2 || 0)) +
    (result.garageM2 || 0) +
    (result.alfrescoM2 || 0) +
    (result.porchM2 || 0) +
    (result.balconyM2 || 0);

  if (compSum > 0 || (result.totalM2 && result.totalM2 > 0)) {
    if (!result.totalM2) {
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
  initialFile?: File | null;
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
  initialFile,
  onSave,
  onExtractedAreas,
}: ModifiedFloorplanModalProps) {
  const [fileLoading, setFileLoading] = useState(false);
  const [docLoaded, setDocLoaded] = useState(false);
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [detectedAreas, setDetectedAreas] = useState<ExtractedAreaSchedule | null>(null);

  // Multi-step double storey / multi-level workflow
  const [stage, setStage] = useState<"upload" | "crop_gf" | "crop_ff" | "crop_single">("upload");
  const [isMultiLevelPlan, setIsMultiLevelPlan] = useState<boolean>(isDoubleStorey);
  const [multiLevelAutoDetected, setMultiLevelAutoDetected] = useState<boolean>(false);
  const [gfCroppedUrl, setGfCroppedUrl] = useState<string | null>(null);
  const [ffCroppedUrl, setFfCroppedUrl] = useState<string | null>(null);

  // Canvas refs
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const viewportContainerRef = useRef<HTMLDivElement>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);
  const pendingVisualLevelCheckRef = useRef<boolean>(false);

  // Polygon cropping state (normalized coordinates 0 to 1)
  const [activePoints, setActivePoints] = useState<Point[]>([]);
  const [isClosed, setIsClosed] = useState(false);
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [isNearStart, setIsNearStart] = useState(false);
  const [draggingPointIdx, setDraggingPointIdx] = useState<number | null>(null);
  const [hoveredPointIdx, setHoveredPointIdx] = useState<number | null>(null);
  const didDragRef = useRef<boolean>(false);

  // Base rendered image dimensions & fitted display dimensions
  const [imageSize, setImageSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [baseDisplaySize, setBaseDisplaySize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    setIsMultiLevelPlan(isDoubleStorey);
  }, [isDoubleStorey]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setDocLoaded(false);
      setPdfPages([]);
      setSelectedPageIndex(0);
      setZoom(1.0);
      setDetectedAreas(null);
      setStage("upload");
      setIsMultiLevelPlan(isDoubleStorey);
      setMultiLevelAutoDetected(false);
      setGfCroppedUrl(null);
      setFfCroppedUrl(null);
      setActivePoints([]);
      setIsClosed(false);
      setDraggingPointIdx(null);
      setHoveredPointIdx(null);
      setImageSize({ w: 0, h: 0 });
      setBaseDisplaySize({ w: 0, h: 0 });
      loadedImageRef.current = null;
      pendingVisualLevelCheckRef.current = false;
    }
  }, [isOpen, isDoubleStorey]);

  useEffect(() => {
    if (isOpen && initialFile && !docLoaded && pdfPages.length === 0) {
      handleFileUpload(initialFile);
    } else if (isOpen && initialImageUrl && !docLoaded && pdfPages.length === 0) {
      pendingVisualLevelCheckRef.current = true;
      setPdfPages([initialImageUrl]);
      setSelectedPageIndex(0);
      setDocLoaded(true);
      if (isDoubleStorey) {
        setIsMultiLevelPlan(true);
        setStage("crop_gf");
      } else {
        setStage("crop_single");
      }
    }
  }, [isOpen, initialFile, initialImageUrl, docLoaded, pdfPages.length, isDoubleStorey]);

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

      // Draw vertex nodes (draggable handles)
      for (let i = 0; i < activePoints.length; i++) {
        const p = activePoints[i];
        const isActiveHandle = draggingPointIdx === i || hoveredPointIdx === i;
        const r = isActiveHandle ? Math.round(nodeRadius * 1.45) : Math.round(nodeRadius * 1.15);
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, r, 0, Math.PI * 2);
        ctx.fillStyle = isActiveHandle ? "#f59e0b" : "#10b981";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = Math.max(2.5, strokeWidth * 0.75);
        ctx.stroke();
      }

      // Subtle instruction label near top-center of polygon
      const minY = Math.min(...activePoints.map((p) => p.y)) * h;
      const cx = (activePoints.reduce((s, p) => s + p.x, 0) / activePoints.length) * w;
      const labelY = Math.max(28, minY - 12);
      ctx.font = `bold ${Math.max(13, Math.round(w / 75))}px sans-serif`;
      ctx.fillStyle = "#10b981";
      ctx.textAlign = "center";
      ctx.fillText("✓ Boundary Closed (Drag any corner point to adjust)", cx, labelY);

      return;
    }

    // 2. In-progress drawing
    ctx.beginPath();
    ctx.moveTo(activePoints[0].x * w, activePoints[0].y * h);
    for (let i = 1; i < activePoints.length; i++) {
      ctx.lineTo(activePoints[i].x * w, activePoints[i].y * h);
    }

    // Rubber-band line to current mouse position
    if (mousePos && !isClosed && draggingPointIdx === null) {
      ctx.lineTo(mousePos.x * w, mousePos.y * h);
    }

    ctx.strokeStyle = "#06b6d4"; // Cyan-500
    ctx.lineWidth = strokeWidth;
    ctx.setLineDash([8, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Semi-transparent polygon preview
    if (activePoints.length >= 2 && mousePos && !isClosed && draggingPointIdx === null) {
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
      const isActiveHandle = draggingPointIdx === i || hoveredPointIdx === i;
      const baseR = isStart ? startNodeRadius : nodeRadius;
      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, isActiveHandle ? Math.round(baseR * 1.35) : baseR, 0, Math.PI * 2);
      ctx.fillStyle = isStart ? "#f59e0b" : isActiveHandle ? "#22d3ee" : "#06b6d4"; // Start is amber
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
  }, [activePoints, isClosed, mousePos, isNearStart, draggingPointIdx, hoveredPointIdx]);

  // Shared helper to detect architectural building wall footprint clusters on the rendered canvas
  const analyzeFloorplanClusters = useCallback((baseCanvas: HTMLCanvasElement) => {
    const w = baseCanvas.width;
    const h = baseCanvas.height;
    if (w < 40 || h < 40) return { clusters: [], cellW: 1, cellH: 1, gridX: 80, gridY: 80 };
    const ctx = baseCanvas.getContext("2d");
    if (!ctx) return { clusters: [], cellW: 1, cellH: 1, gridX: 80, gridY: 80 };

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const GRID_X = 80;
    const GRID_Y = 80;
    const cellW = w / GRID_X;
    const cellH = h / GRID_Y;

    const wallScore: number[][] = Array.from({ length: GRID_Y }, () => Array(GRID_X).fill(0));
    const rawInk: number[][] = Array.from({ length: GRID_Y }, () => Array(GRID_X).fill(0));

    const marginX = Math.round(w * 0.055);
    const marginY = Math.round(h * 0.055);
    const step = Math.max(2, Math.round(Math.min(w, h) / 600));

    const isDarkPixel = (px: number, py: number): boolean => {
      if (px < 0 || py < 0 || px >= w || py >= h) return false;
      const idx = (py * w + px) * 4;
      if (data[idx + 3] < 90) return false;
      const lum = (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
      return lum < 195;
    };

    for (let y = marginY; y < h - marginY; y += step) {
      const gy = Math.min(GRID_Y - 1, Math.floor(y / cellH));
      for (let x = marginX; x < w - marginX; x += step) {
        if (!isDarkPixel(x, y)) continue;
        const gx = Math.min(GRID_X - 1, Math.floor(x / cellW));
        rawInk[gy][gx]++;

        const hasHorizRun = isDarkPixel(x + step, y) && isDarkPixel(x - step, y);
        const hasVertRun = isDarkPixel(x, y + step) && isDarkPixel(x, y - step);
        const hasThickStroke =
          (isDarkPixel(x + 1, y) && isDarkPixel(x, y + 1)) ||
          (hasHorizRun && (isDarkPixel(x, y + 1) || isDarkPixel(x, y - 1))) ||
          (hasVertRun && (isDarkPixel(x + 1, y) || isDarkPixel(x - 1, y)));

        if (hasThickStroke) {
          wallScore[gy][gx] += 3;
        } else if (hasHorizRun || hasVertRun) {
          wallScore[gy][gx] += 1;
        }
      }
    }

    for (let gy = 0; gy < GRID_Y; gy++) {
      if (gy < 7 || gy > GRID_Y - 8) {
        let activeCols = 0;
        for (let gx = 0; gx < GRID_X; gx++) {
          if (rawInk[gy][gx] > 2) activeCols++;
        }
        if (activeCols > GRID_X * 0.52) {
          for (let gx = 0; gx < GRID_X; gx++) wallScore[gy][gx] = 0;
        }
      }
    }
    for (let gx = 0; gx < GRID_X; gx++) {
      if (gx < 7 || gx > GRID_X - 18) {
        let activeRows = 0;
        for (let gy = 0; gy < GRID_Y; gy++) {
          if (rawInk[gy][gx] > 2) activeRows++;
        }
        if (activeRows > GRID_Y * 0.52) {
          for (let gy = 0; gy < GRID_Y; gy++) wallScore[gy][gx] = 0;
        }
      }
    }

    for (let gy = 0; gy < GRID_Y; gy++) {
      for (let gx = 0; gx < GRID_X; gx++) {
        const isBottomRightSchedule = gx >= Math.floor(GRID_X * 0.78) && gy >= Math.floor(GRID_Y * 0.80);
        const isTopRightNotes = gx >= Math.floor(GRID_X * 0.84) && gy <= Math.floor(GRID_Y * 0.18);
        const isRightTitleStrip = gx >= Math.floor(GRID_X * 0.92);
        const isBottomTitleStrip = gy >= Math.floor(GRID_Y * 0.90);
        const isTopHeaderStrip = gy <= Math.floor(GRID_Y * 0.05);
        if (
          isBottomRightSchedule ||
          isTopRightNotes ||
          isRightTitleStrip ||
          isBottomTitleStrip ||
          isTopHeaderStrip
        ) {
          wallScore[gy][gx] = 0;
        }
      }
    }

    const nonZeroScores: number[] = [];
    for (let gy = 4; gy < GRID_Y - 4; gy++) {
      for (let gx = 4; gx < GRID_X - 4; gx++) {
        if (wallScore[gy][gx] > 0) nonZeroScores.push(wallScore[gy][gx]);
      }
    }
    nonZeroScores.sort((a, b) => a - b);
    const adaptiveThresh =
      nonZeroScores.length > 20 ? Math.max(2, nonZeroScores[Math.floor(nonZeroScores.length * 0.35)]) : 2;

    const activeMask: boolean[][] = Array.from({ length: GRID_Y }, (_, gy) =>
      Array.from({ length: GRID_X }, (_, gx) => wallScore[gy][gx] >= adaptiveThresh)
    );

    const bridgedMask: boolean[][] = Array.from({ length: GRID_Y }, () => Array(GRID_X).fill(false));
    for (let gy = 3; gy < GRID_Y - 3; gy++) {
      for (let gx = 3; gx < GRID_X - 3; gx++) {
        if (activeMask[gy][gx]) {
          bridgedMask[gy][gx] = true;
          continue;
        }
        let neighborCount = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (activeMask[gy + dy]?.[gx + dx]) neighborCount++;
          }
        }
        if (neighborCount >= 2) {
          bridgedMask[gy][gx] = true;
        }
      }
    }

    interface FootprintCluster {
      cells: Array<{ gx: number; gy: number; weight: number }>;
      totalWeight: number;
      minGX: number;
      maxGX: number;
      minGY: number;
      maxGY: number;
      centroidX: number;
      centroidY: number;
      score: number;
    }

    const visited: boolean[][] = Array.from({ length: GRID_Y }, () => Array(GRID_X).fill(false));
    const clusters: FootprintCluster[] = [];

    for (let gy = 3; gy < GRID_Y - 3; gy++) {
      for (let gx = 3; gx < GRID_X - 3; gx++) {
        if (!bridgedMask[gy][gx] || visited[gy][gx]) continue;
        const queue: Array<{ gx: number; gy: number }> = [{ gx, gy }];
        visited[gy][gx] = true;
        const cells: Array<{ gx: number; gy: number; weight: number }> = [];
        let totalWeight = 0;
        let minGX = gx,
          maxGX = gx,
          minGY = gy,
          maxGY = gy;
        let sumX = 0,
          sumY = 0;

        while (queue.length > 0) {
          const curr = queue.pop()!;
          const wt = Math.max(1, wallScore[curr.gy][curr.gx]);
          if (activeMask[curr.gy][curr.gx]) {
            cells.push({ gx: curr.gx, gy: curr.gy, weight: wt });
            totalWeight += wt;
            if (curr.gx < minGX) minGX = curr.gx;
            if (curr.gx > maxGX) maxGX = curr.gx;
            if (curr.gy < minGY) minGY = curr.gy;
            if (curr.gy > maxGY) maxGY = curr.gy;
            sumX += curr.gx * wt;
            sumY += curr.gy * wt;
          }
          for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
              const nx = curr.gx + dx;
              const ny = curr.gy + dy;
              if (
                nx >= 3 &&
                nx < GRID_X - 3 &&
                ny >= 3 &&
                ny < GRID_Y - 3 &&
                !visited[ny][nx] &&
                bridgedMask[ny][nx]
              ) {
                visited[ny][nx] = true;
                queue.push({ gx: nx, gy: ny });
              }
            }
          }
        }

        const spanW = maxGX - minGX + 1;
        const spanH = maxGY - minGY + 1;
        const aspect = Math.max(spanW / Math.max(1, spanH), spanH / Math.max(1, spanW));
        const fillDensity = cells.length / Math.max(1, spanW * spanH);

        if (cells.length >= 8 && spanW >= 5 && spanH >= 5 && aspect < 6.0 && fillDensity > 0.03) {
          const centralityBonus =
            1.0 -
            0.25 *
              Math.hypot(sumX / totalWeight / GRID_X - 0.45, sumY / totalWeight / GRID_Y - 0.48);
          clusters.push({
            cells,
            totalWeight,
            minGX,
            maxGX,
            minGY,
            maxGY,
            centroidX: sumX / totalWeight,
            centroidY: sumY / totalWeight,
            score: totalWeight * Math.max(0.5, centralityBonus),
          });
        }
      }
    }

    clusters.sort((a, b) => b.score - a.score);
    return { clusters, cellW, cellH, gridX: GRID_X, gridY: GRID_Y };
  }, []);

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

      // Check if sheet visually displays 2+ floorplan sections (e.g. Ground Floor + First Floor / Lower Ground)
      if (pendingVisualLevelCheckRef.current) {
        pendingVisualLevelCheckRef.current = false;
        const { clusters } = analyzeFloorplanClusters(baseCanvas);
        if (
          clusters.length >= 2 &&
          clusters[1].score >= clusters[0].score * 0.28 &&
          clusters[1].cells.length >= 16
        ) {
          setIsMultiLevelPlan(true);
          setMultiLevelAutoDetected(true);
          setStage((prev) => (prev === "crop_single" ? "crop_gf" : prev));
        }
      }

      setDocLoaded(true);
      drawOverlay();
    };
    img.src = pageUrl;
  }, [pdfPages, selectedPageIndex, stage, drawOverlay, analyzeFloorplanClusters]);

  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  const handleFileUpload = async (file: File) => {
    setFileLoading(true);
    setDocLoaded(false);
    setActivePoints([]);
    setIsClosed(false);
    setDraggingPointIdx(null);
    setHoveredPointIdx(null);
    try {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (!isPdf && typeof FileReader !== "undefined") {
        const fastDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
        setPdfPages([fastDataUrl]);
        setSelectedPageIndex(0);
        setIsMultiLevelPlan(isDoubleStorey);
        setMultiLevelAutoDetected(false);
        pendingVisualLevelCheckRef.current = !isDoubleStorey;
        setStage(isDoubleStorey ? "crop_gf" : "crop_single");
        setFileLoading(false);

        // Run OCR / area schedule extraction non-blockingly in the background
        pdfDocumentToPagesAndText(file, 1)
          .then((result) => {
            const extracted = parseAreaScheduleFromText(result.rawText);
            if (extracted) {
              setDetectedAreas(extracted);
              onExtractedAreas?.(extracted);
            }
            const hasMultiLevelFromText = Boolean(
              (extracted?.firstLivingM2 && extracted.firstLivingM2 > 0) ||
                (extracted?.lowerLivingM2 && extracted.lowerLivingM2 > 0) ||
                (extracted?.balconyM2 && extracted.balconyM2 > 0) ||
                /\b(?:FIRST\s+FLOOR|UPPER\s+FLOOR|UPPER\s+LEVEL|LOWER\s+GROUND|SECOND\s+FLOOR|LEVEL\s+2)\b/i.test(
                  result.rawText || ""
                )
            );
            if (hasMultiLevelFromText) {
              setIsMultiLevelPlan(true);
              setMultiLevelAutoDetected(true);
              setStage((prev) => (prev === "crop_single" ? "crop_gf" : prev));
            }
          })
          .catch(() => {});
        return;
      }

      const result = await pdfDocumentToPagesAndText(file, 16);
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
      }

      // Detect whether the plan has more than 1 level (from extracted areas or PDF text)
      const hasMultiLevelFromText = Boolean(
        (extracted?.firstLivingM2 && extracted.firstLivingM2 > 0) ||
          (extracted?.lowerLivingM2 && extracted.lowerLivingM2 > 0) ||
          (extracted?.balconyM2 && extracted.balconyM2 > 0) ||
          /\b(?:FIRST\s+FLOOR|UPPER\s+FLOOR|UPPER\s+LEVEL|LOWER\s+GROUND|SECOND\s+FLOOR|LEVEL\s+2)\b/i.test(
            result.rawText || ""
          )
      );

      const shouldUseMultiLevel = isDoubleStorey || hasMultiLevelFromText;
      setIsMultiLevelPlan(shouldUseMultiLevel);
      setMultiLevelAutoDetected(hasMultiLevelFromText);
      pendingVisualLevelCheckRef.current = !shouldUseMultiLevel;

      if (shouldUseMultiLevel) {
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

  // Find index of an existing vertex near the cursor (within 16px on screen)
  const findVertexNearPoint = (pt: Point): number | null => {
    const overlay = overlayCanvasRef.current;
    if (!overlay || activePoints.length === 0) return null;
    const rect = overlay.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    let bestIdx: number | null = null;
    let bestDist = 16; // 16px hit radius
    for (let i = 0; i < activePoints.length; i++) {
      const dx = (pt.x - activePoints[i].x) * w;
      const dy = (pt.y - activePoints[i].y) * h;
      const dist = Math.hypot(dx, dy);
      if (dist <= bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    return bestIdx;
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return; // left click only
    const pt = getNormalizedCoords(e);
    const hitIdx = findVertexNearPoint(pt);
    // If polygon is closed, or if clicking any existing vertex (except clicking point 0 to close when >= 3 points and !isClosed)
    if (hitIdx !== null) {
      if (!isClosed && hitIdx === 0 && activePoints.length >= 3) {
        // Let handleCanvasClick close the polygon on point 0 click
        return;
      }
      e.preventDefault();
      setDraggingPointIdx(hitIdx);
      didDragRef.current = false;
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pt = getNormalizedCoords(e);

    // If actively dragging a vertex, update its position in real time
    if (draggingPointIdx !== null) {
      didDragRef.current = true;
      setActivePoints((prev) =>
        prev.map((p, idx) => (idx === draggingPointIdx ? pt : p))
      );
      return;
    }

    const nearIdx = findVertexNearPoint(pt);
    setHoveredPointIdx(nearIdx);

    if (isClosed) return;
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

  const handleCanvasMouseUp = () => {
    if (draggingPointIdx !== null) {
      setDraggingPointIdx(null);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (didDragRef.current) {
      didDragRef.current = false;
      return;
    }

    const pt = getNormalizedCoords(e);
    const overlay = overlayCanvasRef.current;
    if (!overlay) return;

    const rect = overlay.getBoundingClientRect();

    // If polygon is already closed, allow clicking near an edge segment to insert a new adjustable vertex!
    if (isClosed) {
      const hitIdx = findVertexNearPoint(pt);
      if (hitIdx !== null) return; // clicked an existing vertex without dragging

      const w = rect.width;
      const h = rect.height;
      let bestEdgeIdx: number | null = null;
      let bestEdgeDist = 12; // within 12px of an edge segment
      for (let i = 0; i < activePoints.length; i++) {
        const p1 = activePoints[i];
        const p2 = activePoints[(i + 1) % activePoints.length];
        const x1 = p1.x * w,
          y1 = p1.y * h;
        const x2 = p2.x * w,
          y2 = p2.y * h;
        const px = pt.x * w,
          py = pt.y * h;
        const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
        if (l2 === 0) continue;
        const t = Math.max(0, Math.min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2));
        const projX = x1 + t * (x2 - x1);
        const projY = y1 + t * (y2 - y1);
        const dist = Math.hypot(px - projX, py - projY);
        if (dist <= bestEdgeDist) {
          bestEdgeDist = dist;
          bestEdgeIdx = i + 1;
        }
      }
      if (bestEdgeIdx !== null) {
        setActivePoints((prev) => [
          ...prev.slice(0, bestEdgeIdx!),
          pt,
          ...prev.slice(bestEdgeIdx!),
        ]);
      }
      return;
    }

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
        return;
      }
    }

    // Add new point
    setActivePoints((prev) => [...prev, pt]);
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

  const runSmartExteriorWallAutoCrop = React.useCallback(
    (silent = false) => {
      const baseCanvas = baseCanvasRef.current;
      if (!baseCanvas) return;

      const w = baseCanvas.width;
      const h = baseCanvas.height;
      if (w < 40 || h < 40) return;

      const { clusters, cellW, cellH, gridX: GRID_X, gridY: GRID_Y } = analyzeFloorplanClusters(baseCanvas);

      let targetCluster = clusters[0] || null;

      // Double Storey / Multi-Level Ground Floor vs First Floor Smart Cluster Selection:
      if (clusters.length >= 2 && (stage === "crop_gf" || stage === "crop_ff")) {
        const c1 = clusters[0];
        const c2 = clusters[1];
        if (c2.score >= c1.score * 0.26) {
          const horizSeparated = Math.abs(c1.centroidX - c2.centroidX) >= Math.abs(c1.centroidY - c2.centroidY);
          const sortedByOrder = horizSeparated
            ? [c1, c2].sort((a, b) => a.centroidX - b.centroidX)
            : [c1, c2].sort((a, b) => a.centroidY - b.centroidY);
          targetCluster = stage === "crop_gf" ? sortedByOrder[0] : sortedByOrder[1];
        }
      }

      if (!targetCluster) {
        const defaultPoints: Point[] =
          stage === "crop_ff"
            ? [
                { x: 0.52, y: 0.14 },
                { x: 0.88, y: 0.14 },
                { x: 0.88, y: 0.78 },
                { x: 0.52, y: 0.78 },
              ]
            : stage === "crop_gf"
              ? [
                  { x: 0.08, y: 0.14 },
                  { x: 0.48, y: 0.14 },
                  { x: 0.48, y: 0.78 },
                  { x: 0.08, y: 0.78 },
                ]
              : [
                  { x: 0.12, y: 0.14 },
                  { x: 0.84, y: 0.14 },
                  { x: 0.84, y: 0.82 },
                  { x: 0.12, y: 0.82 },
                ];
        setActivePoints(defaultPoints);
        setIsClosed(true);
        return;
      }

      const colWeights = new Array(GRID_X).fill(0);
      const rowWeights = new Array(GRID_Y).fill(0);
      for (const c of targetCluster.cells) {
        colWeights[c.gx] += c.weight;
        rowWeights[c.gy] += c.weight;
      }

      const trimPercentile = (
        weights: number[],
        minIdx: number,
        maxIdx: number,
        cutRatio: number
      ): [number, number] => {
        const sliceTotal = weights.slice(minIdx, maxIdx + 1).reduce((s, v) => s + v, 0);
        const cutAmt = sliceTotal * cutRatio;
        let accLeft = 0;
        let tightMin = minIdx;
        for (let i = minIdx; i <= maxIdx; i++) {
          accLeft += weights[i];
          if (accLeft >= cutAmt) {
            tightMin = i;
            break;
          }
        }
        let accRight = 0;
        let tightMax = maxIdx;
        for (let i = maxIdx; i >= tightMin; i--) {
          accRight += weights[i];
          if (accRight >= cutAmt) {
            tightMax = i;
            break;
          }
        }
        return [tightMin, tightMax];
      };

      const [coreMinGX, coreMaxGX] = trimPercentile(colWeights, targetCluster.minGX, targetCluster.maxGX, 0.02);
      const [coreMinGY, coreMaxGY] = trimPercentile(rowWeights, targetCluster.minGY, targetCluster.maxGY, 0.02);

      const footprintNormW = ((coreMaxGX - coreMinGX + 1) * cellW) / w;
      const footprintNormH = ((coreMaxGY - coreMinGY + 1) * cellH) / h;
      const buffer500mmX = Math.max(0.015, Math.min(0.035, footprintNormW * 0.032));
      const buffer500mmY = Math.max(0.015, Math.min(0.035, footprintNormH * 0.032));

      const pMinX = Math.max(0.02, (coreMinGX * cellW) / w - buffer500mmX);
      const pMaxX = Math.min(0.98, ((coreMaxGX + 1) * cellW) / w + buffer500mmX);
      const pMinY = Math.max(0.02, (coreMinGY * cellH) / h - buffer500mmY);
      const pMaxY = Math.min(0.98, ((coreMaxGY + 1) * cellH) / h + buffer500mmY);

      const autoPoints: Point[] = [
        { x: pMinX, y: pMinY },
        { x: pMaxX, y: pMinY },
        { x: pMaxX, y: pMaxY },
        { x: pMinX, y: pMaxY },
      ];

      setActivePoints(autoPoints);
      setIsClosed(true);
    },
    [stage, analyzeFloorplanClusters]
  );

  // Only trigger Auto-Crop when the user explicitly clicks the Auto-Crop button
  const handleAutoCrop = () => {
    runSmartExteriorWallAutoCrop(false);
  };

  const handleResetPoints = () => {
    setActivePoints([]);
    setIsClosed(false);
    setIsNearStart(false);
    setDraggingPointIdx(null);
    setHoveredPointIdx(null);
  };

  const handleToggleMultiLevel = (multi: boolean) => {
    setIsMultiLevelPlan(multi);
    if (multi) {
      if (stage === "crop_single") {
        setStage("crop_gf");
      }
    } else {
      setStage("crop_single");
      setGfCroppedUrl(null);
      setFfCroppedUrl(null);
    }
  };

  const handleAssignCategory = (
    idx: number,
    category: "groundLivingM2" | "firstLivingM2" | "garageM2" | "alfrescoM2" | "balconyM2" | "exclude"
  ) => {
    if (!detectedAreas || !detectedAreas.unassignedItems) return;
    const targetItem = detectedAreas.unassignedItems[idx];
    if (!targetItem) return;

    const remaining = detectedAreas.unassignedItems.filter((_, i) => i !== idx);
    const updated: ExtractedAreaSchedule = { ...detectedAreas, unassignedItems: remaining };

    if (category !== "exclude") {
      updated[category] = Number(((updated[category] || 0) + targetItem.sqm).toFixed(2));
    }

    const livingSum = (updated.livingM2 || 0) + (updated.groundLivingM2 || 0) + (updated.firstLivingM2 || 0);
    const compSum =
      livingSum +
      (updated.garageM2 || 0) +
      (updated.alfrescoM2 || 0) +
      (updated.porchM2 || 0) +
      (updated.balconyM2 || 0);
    updated.totalM2 = Number(compSum.toFixed(2));

    setDetectedAreas(updated);
    onExtractedAreas?.(updated);
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
      onClose();
    } else if (stage === "crop_gf") {
      setGfCroppedUrl(cropped);
      setStage("crop_ff");
      setActivePoints([]);
      setIsClosed(false);
      setDraggingPointIdx(null);
      setHoveredPointIdx(null);
    } else if (stage === "crop_ff") {
      setFfCroppedUrl(cropped);
      if (gfCroppedUrl) {
        const combined = await combineDoubleStoreyPlans(gfCroppedUrl, cropped);
        onSave(combined);
        onClose();
      } else {
        onSave(cropped);
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Crop className="h-5 w-5 text-emerald-400" />
                Update with Modified Design &mdash; Precision Polygon Cropper
              </DialogTitle>
              <p className="text-xs text-slate-400 mt-1">
                {designName ? `Target Home Design: ${designName}` : "Custom Architectural Plan"} &middot;{" "}
                {isMultiLevelPlan ? "Two Level / Multi-Section Plan (2 Crops)" : "Single Level Configuration (1 Crop)"}
              </p>
            </div>

            {stage !== "upload" && (
              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => handleToggleMultiLevel(false)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    !isMultiLevelPlan
                      ? "bg-emerald-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  1 Level (Single Crop)
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleMultiLevel(true)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                    isMultiLevelPlan
                      ? "bg-emerald-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  2+ Levels (Crop GF + FF)
                </button>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Step Indicator for Multi-Level / Double Storey */}
        {isMultiLevelPlan && stage !== "upload" && (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 p-2.5 rounded-xl border border-emerald-500/30 text-xs flex-none mt-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              {multiLevelAutoDetected && (
                <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[10.5px] font-bold flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-cyan-400" />
                  Multi-Level Plan Detected
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  if (stage === "crop_ff") {
                    setStage("crop_gf");
                    setActivePoints([]);
                    setIsClosed(false);
                  }
                }}
                className={`px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5 transition-all ${
                  stage === "crop_gf"
                    ? "bg-emerald-500 text-slate-950 shadow-sm"
                    : "bg-emerald-950 text-emerald-300 border border-emerald-700 hover:bg-emerald-900"
                }`}
              >
                {stage === "crop_ff" && <Check className="h-3.5 w-3.5" />} 1. Crop Ground Floor (GF)
              </button>
              <ArrowRight className="h-4 w-4 text-slate-500" />
              <span
                className={`px-2.5 py-1 rounded-md font-bold ${
                  stage === "crop_ff"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                2. Crop First Floor / Level 2 (FF)
              </span>
            </div>
            <span className="text-[11px] text-amber-300 font-semibold">
              {stage === "crop_gf"
                ? "Step 1 of 2: Place or Auto-Crop boundary around Ground Floor, then click Proceed to Step 2"
                : "Step 2 of 2: Now place or Auto-Crop boundary around First Floor / Level 2"}
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

        {/* Requirement 1.c: Prompt User for Ambiguous / Custom Area Types */}
        {detectedAreas?.unassignedItems && detectedAreas.unassignedItems.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-500/50 text-xs text-amber-200 space-y-2 flex-none mt-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 flex-none" />
              <span className="font-bold text-white text-xs">
                Custom / Uncategorized Area Detected in Plan Schedule
              </span>
              <span className="text-[10px] text-amber-300 font-bold bg-amber-900/80 px-2 py-0.5 rounded border border-amber-600">
                Action Required
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              We identified custom area rows in your floorplan size chart. Select which pricing category each area should be calculated under (e.g. multi-generation dwelling or lower ground level living is calculated at ground floor living rate):
            </p>
            <div className="space-y-2 pt-1">
              {detectedAreas.unassignedItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-900 border border-amber-500/30"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-300 font-mono text-xs">{item.label}:</span>
                    <span className="text-white font-mono font-bold bg-slate-800 px-2 py-0.5 rounded">{item.sqm} m²</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => handleAssignCategory(idx, "groundLivingM2")}
                      className="h-6 text-[10.5px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 shadow-xs"
                    >
                      Ground Living
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => handleAssignCategory(idx, "firstLivingM2")}
                      className="h-6 text-[10.5px] bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-2.5 shadow-xs"
                    >
                      First Living
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => handleAssignCategory(idx, "garageM2")}
                      className="h-6 text-[10.5px] bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-2 border border-slate-700"
                    >
                      Garage
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => handleAssignCategory(idx, "alfrescoM2")}
                      className="h-6 text-[10.5px] bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-2 border border-slate-700"
                    >
                      Alfresco / Porch
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => handleAssignCategory(idx, "balconyM2")}
                      className="h-6 text-[10.5px] bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-2 border border-slate-700"
                    >
                      Balcony
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      variant="ghost"
                      onClick={() => handleAssignCategory(idx, "exclude")}
                      className="h-6 text-[10px] text-slate-400 hover:text-white px-2"
                    >
                      Exclude
                    </Button>
                  </div>
                </div>
              ))}
            </div>
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
              Click boundary points manually around the floorplan (or click <strong>Auto Crop</strong>). Drag any point to adjust, or click <strong>Reset</strong> to start over.
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 font-mono">
            <MousePointer className="h-3 w-3 text-cyan-400" />
            <span>Drag Corner Points to Adjust &bull; Wheel to Zoom</span>
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

                {/* Interactive Polygon Click & Vertex Drag Overlay Canvas */}
                <canvas
                  ref={overlayCanvasRef}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  onClick={handleCanvasClick}
                  onContextMenu={handleRightClick}
                  className={`absolute top-0 left-0 w-full h-full z-10 ${
                    draggingPointIdx !== null
                      ? "cursor-grabbing"
                      : hoveredPointIdx !== null
                      ? "cursor-grab"
                      : "cursor-crosshair"
                  }`}
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
