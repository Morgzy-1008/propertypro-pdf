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
  MousePointerClick,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { pdfDocumentToPagesAndText } from "@/lib/pdfPages";
import { formatAud } from "@/lib/pricing";
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
  onAddStructuralVariation: (pin: TenderFloorplanPin, customTitle?: string, customCost?: number) => void;
  onAssignExistingVariationToPin: (varId: string, pinCoord: { x: number; y: number }) => void;
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
  onAssignExistingVariationToPin,
  onRemoveStructuralVariation,
}: FloorplanMarkupViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null);

  // Pin assignment modal state
  const [pendingCoord, setPendingCoord] = useState<{ x: number; y: number } | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customCost, setCustomCost] = useState<number | "">("");

  const unassignedColumnBItems = variations.filter((v) => !v.isStructural);

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
    setPendingCoord({ x: percentX, y: percentY });
    setCustomTitle(`Structural Modification #${nextNumber}`);
    setCustomCost("");
    setIsAssignModalOpen(true);
  };

  const handleConfirmNewVariation = () => {
    if (!pendingCoord) return;
    const nextNumber = pins.length + 1;
    const title = customTitle.trim() || `Structural Modification #${nextNumber}`;
    const cost = typeof customCost === "number" ? customCost : 0;

    const newPin: TenderFloorplanPin = {
      id: `pin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      number: nextNumber,
      x: pendingCoord.x,
      y: pendingCoord.y,
      title,
    };

    const updated = [...pins, newPin];
    onUpdatePins(updated);
    onAddStructuralVariation(newPin, title, cost);
    setSelectedPinId(newPin.id);
    setIsAssignModalOpen(false);
    setPendingCoord(null);
    toast.success(`Placed Pin #${nextNumber}: "${title}"!`);
  };

  const handlePickColumnBItem = (varItem: TenderNumberedVariation) => {
    if (!pendingCoord) return;
    onAssignExistingVariationToPin(varItem.id, pendingCoord);
    setIsAssignModalOpen(false);
    setPendingCoord(null);
    toast.success(`Assigned "${varItem.description}" as Structural Pin #${pins.length + 1}!`);
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

  const handleCustomPlanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (isPdf) {
        const toastId = toast.loading(`Converting architectural PDF floorplan "${file.name}"...`);
        const extracted = await pdfDocumentToPagesAndText(file, 1);
        if (extracted.pages && extracted.pages.length > 0) {
          onUploadCustomPlan(extracted.pages[0]);
          toast.success(`Imported modified floorplan from "${file.name}"!`, { id: toastId });
        } else {
          toast.error("Could not render page from PDF", { id: toastId });
        }
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          onUploadCustomPlan(reader.result as string);
          toast.success(`Imported modified floorplan "${file.name}"!`);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not load floorplan file");
    }
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
            {designName ? `${designName} Floorplan Drawing` : "Architectural Floorplan Drawing"}
          </span>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800/60">
            {pins.length} Structural Badges Active
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
              accept=".png,.jpg,.jpeg,.pdf,.webp"
              onChange={handleCustomPlanFile}
              className="hidden"
            />
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/50 bg-cyan-950/50 hover:bg-cyan-900 text-xs font-bold text-cyan-200 transition-colors shadow-xs">
              <Upload className="h-3.5 w-3.5 text-cyan-400" />
              Upload / Replace Modified Floorplan (PDF or Image)
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
                  className="w-full h-auto max-h-[520px] object-contain mx-auto block rounded-lg"
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
                        className={`h-8 w-8 rounded-full flex items-center justify-center font-mono font-black text-sm shadow-2xl border-2 transition-all ${
                          isSelected || isDragging
                            ? "bg-amber-400 text-slate-950 border-white ring-4 ring-amber-400/80"
                            : "bg-amber-500 text-slate-950 border-slate-950 shadow-lg hover:bg-amber-300 ring-2 ring-amber-400/50"
                        }`}
                      >
                        {pin.number}
                      </div>

                      {/* Tooltip */}
                      <div className="hidden group-hover/pin:flex absolute top-9 left-1/2 -translate-x-1/2 bg-slate-950 text-white text-[11px] font-sans px-2.5 py-1 rounded-md border border-slate-700 shadow-2xl whitespace-nowrap items-center gap-1.5 z-40">
                        <span className="font-bold text-amber-400">#{pin.number}</span>
                        <span className="truncate max-w-[200px]">{pin.title}</span>
                        <button
                          type="button"
                          onClick={(e) => handleRemovePin(pin.id, e)}
                          className="text-slate-400 hover:text-rose-400 ml-1 p-0.5"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Click instruction helper badge */}
              <div className="absolute top-2 right-2 bg-slate-950/90 text-white text-[10.5px] font-semibold px-3 py-1.5 rounded-full border border-slate-700 pointer-events-none backdrop-blur-xs flex items-center gap-1.5 shadow-md z-20">
                <MousePointerClick className="h-3.5 w-3.5 text-amber-400" /> Click plan to assign pin &bull; Drag to position
              </div>
            </div>
          ) : (
            <div className="text-center py-16 px-4">
              <Home className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <span className="text-xs font-bold text-slate-600 block">No floorplan drawing loaded</span>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
                Select a home design above, or click &ldquo;Upload / Replace Modified Floorplan&rdquo; to attach the client&apos;s architectural drawing.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Pin Assignment Dialog */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="max-w-lg border-slate-800 bg-slate-950 text-slate-100 p-6 rounded-2xl shadow-2xl space-y-4">
          <DialogHeader className="border-b border-slate-800 pb-3">
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-amber-500 text-slate-950 font-mono font-black text-xs flex items-center justify-center">
                #{pins.length + 1}
              </span>
              Assign Structural Pin #{pins.length + 1}
            </DialogTitle>
          </DialogHeader>

          {/* Option A: Move from Column B */}
          {unassignedColumnBItems.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase text-cyan-400 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" /> Option 1: Pick an Existing Variation from Column B
              </span>
              <div className="max-h-48 overflow-y-auto space-y-1.5 p-1">
                {unassignedColumnBItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-850 hover:border-amber-500/50 flex items-center justify-between gap-2 text-xs transition-colors"
                  >
                    <div className="flex-1 truncate">
                      <span className="font-medium text-slate-200 block truncate">{item.description}</span>
                      <span className="text-[10px] font-mono text-slate-400">{formatAud(item.cost)}</span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handlePickColumnBItem(item)}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] h-7 px-2.5 gap-1 flex-none"
                    >
                      Assign as Pin #{pins.length + 1}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Option B: Enter New Title & Cost */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <span className="text-xs font-bold uppercase text-amber-400 flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> {unassignedColumnBItems.length > 0 ? "Option 2: Or Type New Structural Variation" : "Type Structural Variation Details"}
            </span>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Structural Change Description *</label>
              <Textarea
                rows={2}
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g. Extend Alfresco by 1200mm with concrete slab"
                className="border-slate-800 bg-slate-900 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Cost Allowance ($)</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">$</span>
                <Input
                  type="number"
                  value={customCost}
                  onChange={(e) => setCustomCost(e.target.value ? Number(e.target.value) : "")}
                  placeholder="0"
                  className="pl-6 border-slate-800 bg-slate-900 text-xs font-mono font-bold text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsAssignModalOpen(false)}
                className="text-xs text-slate-400"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmNewVariation}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1"
              >
                <Check className="h-3.5 w-3.5" /> Create &amp; Place Pin #{pins.length + 1}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
