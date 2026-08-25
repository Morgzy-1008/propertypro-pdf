import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Upload,
  Crop,
  RotateCcw,
  Check,
  ArrowRight,
  Info,
  FileText,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { pdfDocumentToPagesAndText } from "@/lib/pdfPages";

interface ModifiedFloorplanModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDoubleStorey: boolean;
  designName?: string;
  onSave: (croppedDataUrl: string) => void;
}

interface CropBox {
  x: number; // 0..1 normalized
  y: number;
  w: number;
  h: number;
}

export function ModifiedFloorplanModal({
  isOpen,
  onClose,
  isDoubleStorey,
  designName,
  onSave,
}: ModifiedFloorplanModalProps) {
  const [fileLoading, setFileLoading] = useState(false);
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);

  // Multi-step double storey state
  const [stage, setStage] = useState<"upload" | "crop_gf" | "crop_ff" | "crop_single">("upload");
  const [gfCroppedUrl, setGfCroppedUrl] = useState<string | null>(null);
  const [ffCroppedUrl, setFfCroppedUrl] = useState<string | null>(null);

  // Canvas and interaction refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [currentImage, setCurrentImage] = useState<HTMLImageElement | null>(null);

  // Crop drag state (normalized coordinates 0 to 1)
  const [cropBox, setCropBox] = useState<CropBox | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  // Reset when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setPdfPages([]);
      setSelectedPageIndex(0);
      setStage("upload");
      setGfCroppedUrl(null);
      setFfCroppedUrl(null);
      setCropBox(null);
      setCurrentImage(null);
      setImageLoaded(false);
    }
  }, [isOpen]);

  // Load image when page changes or image is set
  useEffect(() => {
    if (pdfPages.length === 0) return;
    const pageUrl = pdfPages[selectedPageIndex] || pdfPages[0];
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setCurrentImage(img);
      setImageLoaded(true);
      // Default initial crop box covering center 80%
      setCropBox({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
    };
    img.src = pageUrl;
  }, [pdfPages, selectedPageIndex]);

  // Redraw canvas with crop overlay
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !currentImage || !imageLoaded) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = currentImage.naturalWidth || 800;
    const h = currentImage.naturalHeight || 600;

    canvas.width = w;
    canvas.height = h;

    // 1. Draw source image
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(currentImage, 0, 0, w, h);

    // 2. Dim background outside crop box
    if (cropBox) {
      const bx = cropBox.x * w;
      const by = cropBox.y * h;
      const bw = cropBox.w * w;
      const bh = cropBox.h * h;

      ctx.fillStyle = "rgba(15, 23, 42, 0.45)"; // slate dark scrim
      // Top
      ctx.fillRect(0, 0, w, by);
      // Bottom
      ctx.fillRect(0, by + bh, w, h - (by + bh));
      // Left
      ctx.fillRect(0, by, bx, bh);
      // Right
      ctx.fillRect(bx + bw, by, w - (bx + bw), bh);

      // 3. Highlight border
      ctx.strokeStyle = "#10b981"; // Emerald-500
      ctx.lineWidth = Math.max(3, Math.round(w / 400));
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.setLineDash([]);

      // Corner handles
      const handleSize = Math.max(12, Math.round(w / 80));
      ctx.fillStyle = "#10b981";
      ctx.fillRect(bx - handleSize / 2, by - handleSize / 2, handleSize, handleSize);
      ctx.fillRect(bx + bw - handleSize / 2, by - handleSize / 2, handleSize, handleSize);
      ctx.fillRect(bx - handleSize / 2, by + bh - handleSize / 2, handleSize, handleSize);
      ctx.fillRect(bx + bw - handleSize / 2, by + bh - handleSize / 2, handleSize, handleSize);
    }
  }, [currentImage, imageLoaded, cropBox]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Handle file upload (PDF or Image)
  const handleFileUpload = async (file: File) => {
    setFileLoading(true);
    try {
      const result = await pdfDocumentToPagesAndText(file, 6);
      if (result.pages.length === 0) {
        toast.error("Could not read pages from file. Please ensure it is a valid PDF or Image.");
        return;
      }
      setPdfPages(result.pages);
      setSelectedPageIndex(0);

      if (isDoubleStorey) {
        setStage("crop_gf");
      } else {
        setStage("crop_single");
      }
    } catch (err: any) {
      console.error("Error processing floorplan file:", err);
      toast.error("Failed to load file. Please try another PDF or Image.");
    } finally {
      setFileLoading(false);
    }
  };

  // Mouse drag handlers on overlay
  const getCanvasCoords = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const x = Math.max(0, Math.min(1, clientX / rect.width));
    const y = Math.max(0, Math.min(1, clientY / rect.top));
    return { x, y };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const pt = getCanvasCoords(e);
    setIsDragging(true);
    setDragStart(pt);
    setCropBox({ x: pt.x, y: pt.y, w: 0.01, h: 0.01 });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStart) return;
    const pt = getCanvasCoords(e);
    const minX = Math.min(dragStart.x, pt.x);
    const minY = Math.min(dragStart.y, pt.y);
    const w = Math.abs(pt.x - dragStart.x);
    const h = Math.abs(pt.y - dragStart.y);
    setCropBox({ x: minX, y: minY, w: Math.max(0.02, w), h: Math.max(0.02, h) });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  // Crop the selected region to a high-res white canvas data URL
  const cropCurrentRegion = (): string | null => {
    if (!currentImage || !cropBox) return null;
    const iw = currentImage.naturalWidth || 800;
    const ih = currentImage.naturalHeight || 600;

    const sx = Math.round(cropBox.x * iw);
    const sy = Math.round(cropBox.y * ih);
    const sw = Math.round(cropBox.w * iw);
    const sh = Math.round(cropBox.h * ih);

    if (sw <= 10 || sh <= 10) return null;

    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = sw;
    cropCanvas.height = sh;
    const ctx = cropCanvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, sw, sh);
    ctx.drawImage(currentImage, sx, sy, sw, sh, 0, 0, sw, sh);

    return cropCanvas.toDataURL("image/png", 0.95);
  };

  // Combine GF and FF into a clean composite canvas
  const combineDoubleStoreyPlans = (gfUrl: string, ffUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const imgGF = new Image();
      const imgFF = new Image();
      let loaded = 0;

      const checkBoth = () => {
        loaded++;
        if (loaded < 2) return;

        const maxH = Math.max(imgGF.naturalHeight, imgFF.naturalHeight);
        const scaleGF = maxH / imgGF.naturalHeight;
        const scaleFF = maxH / imgFF.naturalHeight;

        const wGF = imgGF.naturalWidth * scaleGF;
        const wFF = imgFF.naturalWidth * scaleFF;
        const gap = 80;
        const totalW = wGF + wFF + gap + 100;
        const totalH = maxH + 160;

        const compCanvas = document.createElement("canvas");
        compCanvas.width = totalW;
        compCanvas.height = totalH;
        const ctx = compCanvas.getContext("2d");
        if (!ctx) {
          resolve(gfUrl);
          return;
        }

        // Clean white background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, totalW, totalH);

        // Draw GF with label
        const xGF = 50;
        const yGF = 100;
        ctx.drawImage(imgGF, xGF, yGF, wGF, maxH);

        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 28px sans-serif";
        ctx.fillText("GROUND FLOOR", xGF, 60);

        // Draw FF with label
        const xFF = xGF + wGF + gap;
        const yFF = 100;
        ctx.drawImage(imgFF, xFF, yFF, wFF, maxH);

        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 28px sans-serif";
        ctx.fillText("FIRST FLOOR", xFF, 60);

        resolve(compCanvas.toDataURL("image/png", 0.95));
      };

      imgGF.onload = checkBoth;
      imgFF.onload = checkBoth;
      imgGF.src = gfUrl;
      imgFF.src = ffUrl;
    });
  };

  const handleNextOrFinish = async () => {
    const cropped = cropCurrentRegion();
    if (!cropped) {
      toast.error("Please drag a box around the floorplan area to crop.");
      return;
    }

    if (stage === "crop_single") {
      onSave(cropped);
      toast.success("Modified floorplan applied to estimate!");
      onClose();
    } else if (stage === "crop_gf") {
      setGfCroppedUrl(cropped);
      setStage("crop_ff");
      // Reset crop box for next floor
      setCropBox({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
      toast.info("Ground Floor saved. Now drag to crop the First Floor (FF).");
    } else if (stage === "crop_ff") {
      setFfCroppedUrl(cropped);
      if (gfCroppedUrl) {
        const combined = await combineDoubleStoreyPlans(gfCroppedUrl, cropped);
        onSave(combined);
        toast.success("Two-storey modified floorplan combined and applied to estimate!");
        onClose();
      } else {
        onSave(cropped);
        toast.success("Modified floorplan applied to estimate!");
        onClose();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-950 text-slate-100 border border-slate-800 shadow-2xl p-6">
        <DialogHeader className="border-b border-slate-800 pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Crop className="h-5 w-5 text-emerald-400" />
              Update with Modified Design &mdash; Precision Floorplan Cropper
            </DialogTitle>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {designName ? `Target Home Design: ${designName}` : "Custom Architectural Plan"} &middot;{" "}
            {isDoubleStorey ? "Two Storey Configuration" : "Single Storey Configuration"}
          </p>
        </DialogHeader>

        {/* Step Indicator for Double Storey */}
        {isDoubleStorey && stage !== "upload" && (
          <div className="flex items-center justify-between bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center gap-3">
              <span
                className={`px-2.5 py-1 rounded-md font-bold ${
                  stage === "crop_gf"
                    ? "bg-emerald-500 text-slate-950"
                    : "bg-emerald-950 text-emerald-300 border border-emerald-700"
                }`}
              >
                1. Ground Floor (GF)
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
            <span className="text-[11px] text-amber-400 font-medium">
              {stage === "crop_gf" ? "Crop Ground Floor Only" : "Crop First Floor Only"}
            </span>
          </div>
        )}

        {/* Instruction Alert */}
        <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-xs text-cyan-200 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-cyan-400 flex-none mt-0.5" />
          <div className="space-y-1">
            <strong className="block text-white font-semibold">Consultant Cropping Instructions:</strong>
            <p className="leading-relaxed">
              Drag your mouse across the preview below to box around the floorplan drawing.
              Exclude all title blocks, site notes, and outer borders.
              {isDoubleStorey && " For double storey plans, crop 1 level at a time (GF first, then FF)."}
            </p>
          </div>
        </div>

        {/* Upload State */}
        {stage === "upload" ? (
          <div className="py-10 px-6 border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-2xl bg-slate-900/40 text-center space-y-4 transition-all">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Upload className="h-7 w-7" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">Upload Modified Architectural Floorplan</h4>
              <p className="text-xs text-slate-400">
                Supports PDF brochures, architectural sheets, PNG, or JPG images.
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
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs gap-2 px-5 py-2.5 shadow-lg shadow-emerald-500/20"
              >
                <span>
                  <FileText className="h-4 w-4" />
                  {fileLoading ? "Processing Plan..." : "Browse & Upload Plan"}
                </span>
              </Button>
            </label>
          </div>
        ) : (
          /* Interactive Cropping Workspace */
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 text-xs">
              {/* PDF Page Selector (if multi-page PDF) */}
              {pdfPages.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px]">PDF Page:</span>
                  <div className="flex gap-1">
                    {pdfPages.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedPageIndex(idx);
                          setCropBox({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
                        }}
                        className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                          selectedPageIndex === idx
                            ? "bg-emerald-500 text-slate-950"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        Page {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCropBox({ x: 0.05, y: 0.05, w: 0.9, h: 0.9 })}
                  className="h-7 text-xs border-slate-700 bg-slate-800 text-slate-200 gap-1.5"
                >
                  <RotateCcw className="h-3 w-3" /> Reset Crop Box
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setStage("upload")}
                  className="h-7 text-xs border-slate-700 bg-slate-800 text-slate-200 gap-1.5"
                >
                  <Upload className="h-3 w-3" /> Upload Different File
                </Button>
              </div>
            </div>

            {/* Interactive Canvas Viewport */}
            <div
              ref={containerRef}
              className="relative w-full max-h-[500px] overflow-auto rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center p-3 cursor-crosshair select-none"
            >
              <div
                className="relative inline-block"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              >
                <canvas ref={canvasRef} className="max-w-full h-auto block rounded shadow-md" />
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between border-t border-slate-800 pt-3">
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </Button>

              <Button
                onClick={handleNextOrFinish}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs gap-2 px-5 py-2.5 shadow-lg shadow-emerald-500/20"
              >
                <Check className="h-4 w-4" />
                {stage === "crop_gf"
                  ? "Next: Crop First Floor (FF)"
                  : "Save & Apply to Estimate"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
