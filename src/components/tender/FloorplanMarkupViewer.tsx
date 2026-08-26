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
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { TenderFloorplanPin, TenderNumberedVariation } from "@/lib/tender/tenderTypes";

interface FloorplanMarkupViewerProps {
  floorplanUrl?: string;
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
  const [isPlacingPin, setIsPlacingPin] = useState(true);

  const handlePlanClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const percentX = Math.max(2, Math.min(98, Math.round((clickX / rect.width) * 100)));
    const percentY = Math.max(2, Math.min(98, Math.round((clickY / rect.height) * 100)));

    // Calculate next structural number
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
    toast.success(`Placed Badge #${nextNumber} on floorplan!`);
  };

  const handleCustomPlanFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onUploadCustomPlan(reader.result as string);
      toast.success(`Imported modified floorplan drawing "${file.name}"!`);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemovePin = (pinId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = pins.filter((p) => p.id !== pinId);
    // Renumber pins sequentially 1..N
    const renumbered = filtered.map((p, idx) => ({ ...p, number: idx + 1 }));
    onUpdatePins(renumbered);
    onRemoveStructuralVariation(pinId);
    if (selectedPinId === pinId) setSelectedPinId(null);
    toast.info("Removed floorplan pin");
  };

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
            {pins.length} Structural Badges Placed
          </span>
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
              Upload / Replace Floorplan
            </span>
          </label>
        </div>
      </div>

      {/* Interactive Floorplan Markup Canvas */}
      <div className="relative border-2 border-slate-800 rounded-2xl bg-white p-4 shadow-xl overflow-hidden min-h-[380px] flex items-center justify-center select-none">
        {floorplanUrl ? (
          <div
            ref={containerRef}
            onClick={handlePlanClick}
            className="relative w-full max-w-2xl mx-auto cursor-crosshair group"
          >
            <img
              src={floorplanUrl}
              alt={designName}
              className="w-full h-auto max-h-[520px] object-contain mx-auto block pointer-events-none"
            />

            {/* Overlaid Numbered Structural Pins */}
            {pins.map((pin) => {
              const isSelected = pin.id === selectedPinId;
              return (
                <div
                  key={pin.id}
                  style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPinId(pin.id);
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-125 z-20 group/pin"
                >
                  <div
                    className={`h-7 w-7 rounded-full flex items-center justify-center font-mono font-black text-xs shadow-lg border-2 transition-all ${
                      isSelected
                        ? "bg-amber-400 text-slate-950 border-white ring-4 ring-amber-400/40"
                        : "bg-amber-500 text-slate-950 border-slate-950 hover:bg-amber-300"
                    }`}
                  >
                    {pin.number}
                  </div>

                  {/* Pin Tooltip */}
                  <div className="hidden group-hover/pin:flex absolute top-8 left-1/2 -translate-x-1/2 bg-slate-950 text-white text-[10px] font-sans px-2.5 py-1 rounded-md border border-slate-700 shadow-xl whitespace-nowrap items-center gap-1.5 z-30">
                    <span className="font-bold text-amber-400">#{pin.number}</span>
                    <span className="truncate max-w-[160px]">{pin.title}</span>
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

            {/* Click-to-add overlay guidance */}
            <div className="absolute top-2 right-2 bg-slate-950/80 text-white text-[10px] font-medium px-2.5 py-1 rounded-full border border-slate-700/60 pointer-events-none backdrop-blur-xs flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-400" /> Click anywhere on the plan to place structural callout badges
            </div>
          </div>
        ) : (
          <div className="text-center py-16 px-4">
            <Home className="h-10 w-10 text-slate-300 mx-auto mb-2" />
            <span className="text-xs font-bold text-slate-600 block">No standard floorplan available for this design</span>
            <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
              Click &ldquo;Upload / Replace Floorplan&rdquo; above to attach the client&apos;s architectural drawing or cropped plan.
            </p>
          </div>
        )}
      </div>

      {/* Numbered Pins Callout List */}
      {pins.length > 0 && (
        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
            Numbered Structural Changes on Plan ({pins.length}):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {pins.map((pin) => (
              <div
                key={pin.id}
                className="p-2 rounded-lg border border-slate-800 bg-slate-900 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="h-5 w-5 rounded-full bg-amber-500 text-slate-950 font-mono font-bold text-[10px] flex items-center justify-center flex-none">
                    {pin.number}
                  </span>
                  <span className="text-slate-200 text-[11px] truncate font-medium">{pin.title}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleRemovePin(pin.id, e)}
                  className="text-slate-500 hover:text-rose-400 p-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
