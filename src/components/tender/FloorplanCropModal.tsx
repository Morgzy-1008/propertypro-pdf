import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Crop,
  Check,
  RotateCcw,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cropToContent } from "@/components/flyer/fileToImage";

interface CropRect {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  w: number; // percentage 0-100
  h: number; // percentage 0-100
}

interface FloorplanCropModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rawImageSrc: string;
  onApplyCroppedImage: (croppedDataUrl: string) => void;
}

export function FloorplanCropModal({
  open,
  onOpenChange,
  rawImageSrc,
  onApplyCroppedImage,
}: FloorplanCropModalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Crop rectangle in percentages (0-100)
  const [crop, setCrop] = useState<CropRect>({ x: 5, y: 5, w: 90, h: 90 });
  const [dragAction, setDragAction] = useState<
    "move" | "nw" | "ne" | "sw" | "se" | "create" | null
  >(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [initialCrop, setInitialCrop] = useState<CropRect>(crop);

  useEffect(() => {
    if (open && rawImageSrc) {
      // Default crop: inset 5%
      setCrop({ x: 5, y: 5, w: 90, h: 90 });
    }
  }, [open, rawImageSrc]);

  const handlePointerDown = (
    e: React.PointerEvent,
    action: "move" | "nw" | "ne" | "sw" | "se" | "create"
  ) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const percentX = (clientX / rect.width) * 100;
    const percentY = (clientY / rect.height) * 100;

    setDragAction(action);
    setStartPos({ x: percentX, y: percentY });
    setInitialCrop({ ...crop });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    if (action === "create") {
      setCrop({ x: percentX, y: percentY, w: 1, h: 1 });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragAction || !startPos || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const currentX = Math.max(0, Math.min(100, (clientX / rect.width) * 100));
    const currentY = Math.max(0, Math.min(100, (clientY / rect.height) * 100));
    const dx = currentX - startPos.x;
    const dy = currentY - startPos.y;

    if (dragAction === "move") {
      const newX = Math.max(0, Math.min(100 - initialCrop.w, initialCrop.x + dx));
      const newY = Math.max(0, Math.min(100 - initialCrop.h, initialCrop.y + dy));
      setCrop({ ...initialCrop, x: newX, y: newY });
    } else if (dragAction === "create") {
      const minX = Math.min(startPos.x, currentX);
      const minY = Math.min(startPos.y, currentY);
      const w = Math.max(3, Math.abs(currentX - startPos.x));
      const h = Math.max(3, Math.abs(currentY - startPos.y));
      setCrop({ x: minX, y: minY, w, h });
    } else if (dragAction === "se") {
      const newW = Math.max(5, Math.min(100 - initialCrop.x, initialCrop.w + dx));
      const newH = Math.max(5, Math.min(100 - initialCrop.y, initialCrop.h + dy));
      setCrop({ ...initialCrop, w: newW, h: newH });
    } else if (dragAction === "sw") {
      const newX = Math.max(0, Math.min(initialCrop.x + initialCrop.w - 5, initialCrop.x + dx));
      const newW = initialCrop.w - (newX - initialCrop.x);
      const newH = Math.max(5, Math.min(100 - initialCrop.y, initialCrop.h + dy));
      setCrop({ ...initialCrop, x: newX, w: newW, h: newH });
    } else if (dragAction === "ne") {
      const newY = Math.max(0, Math.min(initialCrop.y + initialCrop.h - 5, initialCrop.y + dy));
      const newH = initialCrop.h - (newY - initialCrop.y);
      const newW = Math.max(5, Math.min(100 - initialCrop.x, initialCrop.w + dx));
      setCrop({ ...initialCrop, y: newY, h: newH, w: newW });
    } else if (dragAction === "nw") {
      const newX = Math.max(0, Math.min(initialCrop.x + initialCrop.w - 5, initialCrop.x + dx));
      const newY = Math.max(0, Math.min(initialCrop.y + initialCrop.h - 5, initialCrop.y + dy));
      const newW = initialCrop.w - (newX - initialCrop.x);
      const newH = initialCrop.h - (newY - initialCrop.y);
      setCrop({ x: newX, y: newY, w: newW, h: newH });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragAction) {
      setDragAction(null);
      setStartPos(null);
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    }
  };

  const handleAutoTrim = async () => {
    try {
      const trimmed = await cropToContent(rawImageSrc, 0.02);
      onApplyCroppedImage(trimmed);
      onOpenChange(false);
      toast.success("Auto-trimmed whitespace margins successfully!");
    } catch (e) {
      toast.error("Auto-trim failed");
    }
  };

  const handleApplyCrop = () => {
    if (!rawImageSrc) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const sourceX = (crop.x / 100) * img.naturalWidth;
      const sourceY = (crop.y / 100) * img.naturalHeight;
      const sourceW = (crop.w / 100) * img.naturalWidth;
      const sourceH = (crop.h / 100) * img.naturalHeight;

      canvas.width = Math.max(100, Math.round(sourceW));
      canvas.height = Math.max(100, Math.round(sourceH));

      // Fill white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.drawImage(
        img,
        sourceX,
        sourceY,
        sourceW,
        sourceH,
        0,
        0,
        canvas.width,
        canvas.height
      );

      const croppedDataUrl = canvas.toDataURL("image/png");
      onApplyCroppedImage(croppedDataUrl);
      onOpenChange(false);
      toast.success("Cropped floorplan applied successfully!");
    };
    img.src = rawImageSrc;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] border-slate-800 bg-slate-950 text-slate-100 p-6 rounded-3xl shadow-2xl flex flex-col justify-between space-y-4">
        <DialogHeader className="border-b border-slate-800 pb-3">
          <DialogTitle className="text-base font-black text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crop className="h-5 w-5 text-amber-400" />
              Crop Architectural Floorplan Drawing
            </div>
            <span className="text-xs font-normal text-slate-400">
              Drag the crop boundary to isolate just the floorplan
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAutoTrim}
              className="border-cyan-500/40 bg-cyan-950/40 text-cyan-200 hover:bg-cyan-900 text-xs font-bold gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" /> Auto-Trim White Margins
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCrop({ x: 5, y: 5, w: 90, h: 90 })}
              className="text-xs text-slate-400 hover:text-white gap-1"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset Box
            </Button>
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            Crop: {Math.round(crop.w)}% &times; {Math.round(crop.h)}%
          </div>
        </div>

        {/* Interactive Cropper Canvas */}
        <div
          ref={containerRef}
          onPointerDown={(e) => handlePointerDown(e, "create")}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative w-full max-h-[58vh] min-h-[340px] bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden flex items-center justify-center p-4 select-none touch-none cursor-crosshair"
        >
          {rawImageSrc ? (
            <div className="relative inline-block max-w-full max-h-[54vh]">
              <img
                ref={imgRef}
                src={rawImageSrc}
                alt="Source Plan"
                className="w-full h-auto max-h-[54vh] object-contain mx-auto block pointer-events-none"
              />

              {/* Shading overlay (outside crop box) */}
              <div
                style={{
                  left: `${crop.x}%`,
                  top: `${crop.y}%`,
                  width: `${crop.w}%`,
                  height: `${crop.h}%`,
                }}
                className="absolute border-2 border-amber-400 bg-amber-400/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] pointer-events-none"
              >
                {/* Rule of thirds grid lines */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 border border-amber-400/30 pointer-events-none" />

                {/* Move Handle (Center) */}
                <div
                  onPointerDown={(e) => handlePointerDown(e, "move")}
                  className="absolute inset-4 cursor-move pointer-events-auto"
                />

                {/* Resize Corners */}
                <div
                  onPointerDown={(e) => handlePointerDown(e, "nw")}
                  className="absolute -top-2 -left-2 h-4 w-4 rounded-full bg-amber-400 border-2 border-slate-950 cursor-nwse-resize pointer-events-auto hover:scale-125"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, "ne")}
                  className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-amber-400 border-2 border-slate-950 cursor-nesw-resize pointer-events-auto hover:scale-125"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, "sw")}
                  className="absolute -bottom-2 -left-2 h-4 w-4 rounded-full bg-amber-400 border-2 border-slate-950 cursor-nesw-resize pointer-events-auto hover:scale-125"
                />
                <div
                  onPointerDown={(e) => handlePointerDown(e, "se")}
                  className="absolute -bottom-2 -right-2 h-4 w-4 rounded-full bg-amber-400 border-2 border-slate-950 cursor-nwse-resize pointer-events-auto hover:scale-125"
                />
              </div>
            </div>
          ) : (
            <div className="text-slate-500 text-xs">No image loaded</div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs text-slate-400"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleApplyCrop}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5 px-6"
          >
            <Check className="h-4 w-4" /> Apply Cropped Floorplan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
