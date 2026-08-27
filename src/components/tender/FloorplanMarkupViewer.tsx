import React, { useRef, useState } from "react";
import {
  Upload,
  Plus,
  Trash2,
  Move,
  Check,
  Sparkles,
  Layers,
  Home,
  RotateCcw,
  ArrowRight,
  Eye,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { TenderFloorplanPin, TenderNumberedVariation } from "@/lib/tender/tenderTypes";

interface FloorplanMarkupViewerProps {
  floorplanUrl?: string;
  originalFloorplanUrl?: string;
  isModifiedPlan?: boolean;
  designName: string;
  pins: TenderFloorplanPin[];
  variations: TenderNumberedVariation[];
  onUpdatePins: (pins: TenderFloorplanPin[]) => void;
  onUploadCustomPlan: (dataUrl: string) => void;
  onAddStructuralVariation: (pin: TenderFloorplanPin) => void;
  onRemoveStructuralVariation: (pinId: string) => void;
}

export function FloorplanMarkupViewer({
  floorplanUrl,
  originalFloorplanUrl,
  isModifiedPlan,
  designName,
  pins,
  variations,
  onUpdatePins,
  onUploadCustomPlan,
  onAddStructuralVariation,
  onRemoveStructuralVariation,
}: FloorplanMarkupViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null);

  // Click on floorplan canvas to place a new pin
  const handlePlanClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingPinId) return; // ignore click if ended a drag
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const percentX = Math.max(3, Math.min(97, Math.round((clickX / rect.width) * 100)));
    const percentY = Math.max(3, Math.min(97, Math.round((clickY / rect.height) * 100)));

    const nextNumber = pins.length + 1;
    const newPin: TenderFloorplanPin = {
      id: `pin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      number: nextNumber,
      x: percentX,
      y: percentY,
      title: `Structural Modification #${nextNumber}`,
    };

    const updated = [...pins, newPin];
    onUpdatePins(updated);
    onAddStructuralVariation(newPin);
    setSelectedPinId(newPin.id);
    toast.success(`Placed Structural Pin #${nextNumber} on floorplan! Drag to reposition.`);
  };

  // Dragging pin handler
  const handlePinPointerDown = (pinId: string, e: React.PointerEvent) => {
    e.stopPropagation();
    setDraggingPinId(pinId);
    setSelectedPinId(pinId);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingPinId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const curX = e.clientX - rect.left;
    const curY = e.clientY - rect.top;

    const percentX = Math.max(3, Math.min(97, Math.round((curX / rect.width) * 100)));
    const percentY = Math.max(3, Math.min(97, Math.round((curY / rect.height) * 100)));

    const updated = pins.map((p) => (p.id === draggingPinId ? { ...p, x: percentX, y: percentY } : p));
    onUpdatePins(updated);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingPinId) {
      setDraggingPinId(null);
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    }
  };

  const handleCustomPlanFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onUploadCustomPlan(reader.result as string);
      toast.success(`Imported modified floorplan "${file.name}"!`);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemovePin = (pinId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = pins.filter((p) => p.id !== pinId);
    const renumbered = filtered.map((p, idx) => ({ ...p, number: idx + 1 }));
    onUpdatePins(renumbered);
    onRemoveStructuralVariation(pinId);
    if (selectedPinId === pinId) setSelectedPinId(null);
    toast.info("Removed floorplan pin");
  };

  const showSideBySide = isModifiedPlan && originalFloorplanUrl && originalFloorplanUrl !== floorplanUrl;

  return (
    <div className="space-y-4">
      {/* Floorplan Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Home className="h-3.5 w-3.5 text-amber-400" />
            {designName} Floorplan Drawing
          </span>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800/60">
            {pins.length} Structural Pins Active
          </span>
          {showSideBySide && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1">
              <Eye className="h-3 w-3" /> Side-by-Side Comparison
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.pdf"
              onChange={handleCustomPlanFile}
              className="hidden"
            />
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/50 bg-cyan-950/50 hover:bg-cyan-900 text-xs font-bold text-cyan-200 transition-colors shadow-xs">
              <Upload className="h-3.5 w-3.5 text-cyan-400" />
              Upload / Replace Modified Floorplan
            </span>
          </label>
        </div>
      </div>

      {/* Main Floorplans Display Container */}
      <div
        className={`grid gap-4 ${
          showSideBySide ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {/* Left: Original Floorplan (when modified plan is present) */}
        {showSideBySide && (
          <div className="border-2 border-slate-800 rounded-2xl bg-white p-4 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Home className="h-3.5 w-3.5 text-slate-600" /> Original {designName} Floorplan
              </span>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Standard Catalog Drawing
              </span>
            </div>
            <div className="flex-1 flex items-center justify-center p-2">
              <img
                src={originalFloorplanUrl}
                alt={`Original ${designName}`}
                className="w-full h-auto max-h-[480px] object-contain mx-auto block"
              />
            </div>
          </div>
        )}

        {/* Right (or full): Interactive Modified / Current Floorplan with Draggable Pins */}
        <div className="border-2 border-slate-800 rounded-2xl bg-white p-4 shadow-xl flex flex-col justify-between relative overflow-hidden min-h-[380px]">
          {showSideBySide && (
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Modified Floorplan (With Numbered Structural Pins)
              </span>
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                Active Client Layout
              </span>
            </div>
          )}

          {floorplanUrl ? (
            <div className="relative w-full flex items-center justify-center py-2">
              <div
                ref={containerRef}
                onClick={handlePlanClick}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="relative inline-block max-w-full cursor-crosshair select-none"
              >
                <img
                  src={floorplanUrl}
                  alt={designName}
                  className="w-full h-auto max-h-[520px] object-contain mx-auto block pointer-events-none rounded-lg"
                />

                {/* Overlaid Draggable Numbered Structural Pins */}
                {pins.map((pin) => {
                  const isSelected = pin.id === selectedPinId;
                  const isDragging = pin.id === draggingPinId;

                  return (
                    <div
                      key={pin.id}
                      style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                      onPointerDown={(e) => handlePinPointerDown(pin.id, e)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPinId(pin.id);
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing transition-transform z-30 group/pin ${
                        isDragging ? "scale-125 z-40" : "hover:scale-125"
                      }`}
                    >
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center font-mono font-black text-xs shadow-2xl border-2 transition-all ${
                          isSelected || isDragging
                            ? "bg-amber-400 text-slate-950 border-white ring-4 ring-amber-400/60"
                            : "bg-amber-500 text-slate-950 border-slate-950 shadow-md hover:bg-amber-300 ring-2 ring-amber-400/40"
                        }`}
                      >
                        {pin.number}
                      </div>

                      {/* Tooltip */}
                      <div className="hidden group-hover/pin:flex absolute top-8 left-1/2 -translate-x-1/2 bg-slate-950 text-white text-[10px] font-sans px-2.5 py-1 rounded-md border border-slate-700 shadow-2xl whitespace-nowrap items-center gap-1.5 z-40">
                        <span className="font-bold text-amber-400">#{pin.number}</span>
                        <span className="truncate max-w-[200px]">{pin.title}</span>
                        <button
                          type="button"
                          onClick={(e) => handleRemovePin(pin.id, e)}
                          className="text-slate-400 hover:text-rose-400 ml-1"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Drag instruction helper banner */}
              <div className="absolute top-2 right-2 bg-slate-950/85 text-white text-[10px] font-medium px-3 py-1 rounded-full border border-slate-700 pointer-events-none backdrop-blur-xs flex items-center gap-1.5 shadow-md z-20">
                <Move className="h-3 w-3 text-amber-400" /> Click to place &bull; Drag pins to position
              </div>
            </div>
          ) : (
            <div className="text-center py-16 px-4">
              <Home className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <span className="text-xs font-bold text-slate-600 block">No floorplan drawing available</span>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                Click &ldquo;Upload / Replace Modified Floorplan&rdquo; above to attach the client&apos;s architectural drawing.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
