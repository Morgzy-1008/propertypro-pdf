import React, { useRef, useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PenTool, RotateCcw, Check, Type, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { generateCursiveSignatureDataUrl } from "@/lib/tender/tenderStorage";

interface DigitalSignatureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  signerName: string;
  onSaveSignature: (signatureDataUrl: string, signerName: string) => void;
}

export function DigitalSignatureModal({
  open,
  onOpenChange,
  title,
  signerName: initialSignerName,
  onSaveSignature,
}: DigitalSignatureModalProps) {
  const [signerName, setSignerName] = useState(initialSignerName || "");
  const [mode, setMode] = useState<"fancy_styles" | "draw">("fancy_styles");
  const [selectedStyle, setSelectedStyle] = useState<1 | 2 | 3 | 4>(1);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    setSignerName(initialSignerName || "");
    setHasDrawn(false);
  }, [open, initialSignerName]);

  useEffect(() => {
    if (open && canvasRef.current && mode === "draw") {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#0284c7"; // Cyan/blue ink
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  }, [open, mode]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.beginPath();
    ctx.moveTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.lineTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const nameParts = (signerName.trim() || "Hudson Client").split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";
  const initialForm = nameParts.length > 1 ? `${firstName[0]}. ${lastName}` : firstName;

  const handleSave = () => {
    if (!signerName.trim()) {
      toast.error("Please enter the printed name of the signer");
      return;
    }

    if (mode === "draw") {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) {
        toast.error("Please draw a signature on the pad");
        return;
      }
      const dataUrl = canvas.toDataURL("image/png");
      onSaveSignature(dataUrl, signerName);
    } else {
      const dataUrl = generateCursiveSignatureDataUrl(signerName, selectedStyle);
      onSaveSignature(dataUrl, signerName);
    }

    toast.success("Signature captured & attached to Authority to Proceed!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-slate-800 bg-slate-950 text-slate-100 p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="pb-2 border-b border-slate-800">
          <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
            <PenTool className="h-4 w-4 text-cyan-400" />
            {title || "Digital Signature Capture"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Signer Full Legal Name *</label>
            <Input
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="e.g. Jordan Samuel Mitchell"
              className="border-slate-800 bg-slate-900 text-xs text-slate-100"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Signature Method:</span>
            <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setMode("fancy_styles")}
                className={`px-3 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-all ${
                  mode === "fancy_styles" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                <Sparkles className="h-3 w-3" /> 4 Fancy Cursive Options
              </button>
              <button
                type="button"
                onClick={() => setMode("draw")}
                className={`px-3 py-1 rounded-md font-semibold flex items-center gap-1.5 transition-all ${
                  mode === "draw" ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                <PenTool className="h-3 w-3" /> Draw Signature
              </button>
            </div>
          </div>

          {mode === "draw" ? (
            <div className="space-y-2">
              <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl bg-white p-1 relative overflow-hidden transition-colors shadow-inner">
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={180}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-36 cursor-crosshair touch-none block"
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs italic">
                    Sign with finger, stylus, or mouse here
                  </div>
                )}
                <div className="absolute bottom-2 left-4 right-4 border-b border-slate-200 pointer-events-none" />
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearCanvas}
                  className="text-xs text-slate-400 hover:text-rose-300 gap-1"
                >
                  <RotateCcw className="h-3 w-3" /> Clear Pad
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Choose one of the 4 signature styles below:</span>
                <span className="text-[10px] text-cyan-400 font-mono">Option #{selectedStyle} Selected</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Style 1: Full Name - Elegant Script */}
                <button
                  type="button"
                  onClick={() => setSelectedStyle(1)}
                  className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between h-28 ${
                    selectedStyle === 1
                      ? "bg-slate-900 border-cyan-400 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Option 1 · Full Name Formal
                    </span>
                    {selectedStyle === 1 && (
                      <span className="h-4 w-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center text-[10px] font-black">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-serif italic text-cyan-300 py-1 select-none font-normal" style={{ fontFamily: "'Brush Script MT', 'Dancing Script', 'Great Vibes', cursive, serif" }}>
                    {signerName || "Jordan Mitchell"}
                  </div>
                  <span className="text-[9px] text-slate-500">Classic calligraphy script</span>
                </button>

                {/* Style 2: Full Name - Flourish Script */}
                <button
                  type="button"
                  onClick={() => setSelectedStyle(2)}
                  className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between h-28 ${
                    selectedStyle === 2
                      ? "bg-slate-900 border-cyan-400 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Option 2 · Full Name Flourish
                    </span>
                    {selectedStyle === 2 && (
                      <span className="h-4 w-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center text-[10px] font-black">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-serif italic text-cyan-300 py-1 select-none font-normal" style={{ fontFamily: "'Segoe Script', 'Parisienne', 'Alex Brush', cursive, sans-serif" }}>
                    {signerName || "Jordan Mitchell"}
                  </div>
                  <span className="text-[9px] text-slate-500">Flowing signature flourish</span>
                </button>

                {/* Style 3: Initial + Last Name - Executive Script */}
                <button
                  type="button"
                  onClick={() => setSelectedStyle(3)}
                  className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between h-28 ${
                    selectedStyle === 3
                      ? "bg-slate-900 border-cyan-400 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                      Option 3 · Initial &amp; Last Name
                    </span>
                    {selectedStyle === 3 && (
                      <span className="h-4 w-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center text-[10px] font-black">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-serif italic text-amber-300 py-1 select-none font-bold" style={{ fontFamily: "'Snell Roundhand', 'Brush Script MT', 'Dancing Script', cursive, serif" }}>
                    {initialForm || "J. Mitchell"}
                  </div>
                  <span className="text-[9px] text-slate-500">Executive initial calligraphy</span>
                </button>

                {/* Style 4: Initial + Last Name - Fluid Pen */}
                <button
                  type="button"
                  onClick={() => setSelectedStyle(4)}
                  className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between h-28 ${
                    selectedStyle === 4
                      ? "bg-slate-900 border-cyan-400 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                      Option 4 · Initial &amp; Last Name Fluid
                    </span>
                    {selectedStyle === 4 && (
                      <span className="h-4 w-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center text-[10px] font-black">
                        ✓
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-serif italic text-amber-300 py-1 select-none font-normal" style={{ fontFamily: "'Lucida Handwriting', 'Segoe Script', 'Great Vibes', cursive, sans-serif" }}>
                    {initialForm || "J. Mitchell"}
                  </div>
                  <span className="text-[9px] text-slate-500">Modern quick-pen script</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-3 border-t border-slate-800 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs text-slate-400"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs gap-1.5 shadow-md shadow-cyan-500/20"
          >
            <Check className="h-3.5 w-3.5" /> Accept &amp; Apply Signature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
