import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Ruler, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface CustomPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanCalibrated: (planData: {
    name: string;
    imageUrl: string;
    widthM: number;
    lengthM: number;
    areaM2: number;
    scalePxPerM: number;
  }) => void;
  isLight: boolean;
}

export function SiteStudioCustomPlanModal({
  isOpen,
  onClose,
  onPlanCalibrated,
  isLight,
}: CustomPlanModalProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [point1, setPoint1] = useState<{ x: number; y: number } | null>(null);
  const [point2, setPoint2] = useState<{ x: number; y: number } | null>(null);
  const [calibrationLengthM, setCalibrationLengthM] = useState("21.00");
  const [customWidthM, setCustomWidthM] = useState("11.50");
  const [customLengthM, setCustomLengthM] = useState("21.00");
  const [customAreaM2, setCustomAreaM2] = useState("215.00");
  const [mode, setMode] = useState<"upload" | "calibrate">("upload");

  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name.replace(/\.[^/.]+$/, ""));
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        setFileUrl(event.target.result);
        setMode("calibrate");
        setPoint1(null);
        setPoint2(null);
        toast.info("Floorplan loaded! Click two points along a known wall to calibrate scale.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (!point1) {
      setPoint1({ x, y });
    } else if (!point2) {
      setPoint2({ x, y });
    } else {
      // Reset to first point
      setPoint1({ x, y });
      setPoint2(null);
    }
  };

  const handleApplyCalibration = () => {
    if (!fileUrl) {
      toast.error("Please upload an image first.");
      return;
    }

    const width = parseFloat(customWidthM) || 11.5;
    const length = parseFloat(customLengthM) || 21.0;
    const area = parseFloat(customAreaM2) || Math.round(width * length * 0.85);

    let scalePxPerM = 30; // default fallback
    if (point1 && point2 && calibrationLengthM) {
      const distPx = Math.hypot(point2.x - point1.x, point2.y - point1.y);
      const distM = parseFloat(calibrationLengthM) || 21.0;
      if (distM > 0) {
        scalePxPerM = Math.round((distPx / distM) * 100) / 100;
      }
    }

    onPlanCalibrated({
      name: fileName || "Custom Client Plan",
      imageUrl: fileUrl,
      widthM: width,
      lengthM: length,
      areaM2: area,
      scalePxPerM,
    });

    toast.success(`Custom plan calibrated! Scaled at ${width}m × ${length}m (${area}m²)`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`max-w-4xl max-h-[90vh] overflow-y-auto ${isLight ? "bg-white text-slate-900 border-slate-200" : "bg-slate-900 text-slate-100 border-slate-800"}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Upload className="h-5 w-5 text-brand-gold" />
            Custom Floorplan Upload &amp; 2-Point Scale Calibrator
          </DialogTitle>
          <p className="text-xs text-slate-400">
            Upload any client PDF or architectural floorplan image (PNG/JPG) to site onto the lot at exact 1:200 scale.
          </p>
        </DialogHeader>

        {mode === "upload" || !fileUrl ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
              isLight
                ? "border-slate-300 hover:border-brand-gold bg-slate-50 hover:bg-amber-50/20"
                : "border-slate-700 hover:border-brand-gold bg-slate-950/60 hover:bg-brand-gold/5"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleFileUpload}
            />
            <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-brand-gold/10 border border-brand-gold/30 flex items-center justify-center text-brand-gold">
              <Upload className="h-8 w-8" />
            </div>
            <h3 className="font-bold text-base mb-1">Click to Upload Client Floorplan</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              Supports high-resolution PNG, JPG, or PDF drawings. We'll calibrate the metric scale next.
            </p>
            <Button size="sm" className="bg-brand-gold hover:bg-brand-gold-deep text-slate-950 font-semibold text-xs">
              Choose File
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Calibration Instructions Banner */}
            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
              isLight ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-amber-950/30 border-amber-500/30 text-amber-300"
            }`}>
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-brand-gold shrink-0" />
                <span>
                  {!point1
                    ? "Step 1: Click the FIRST point of a known wall (e.g. Front Corner)."
                    : !point2
                    ? "Step 2: Click the SECOND point of that wall (e.g. Rear Corner)."
                    : "Points set! Verify the distance in metres below."}
                </span>
              </div>
              {(point1 || point2) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPoint1(null);
                    setPoint2(null);
                  }}
                  className="h-7 text-xs text-slate-400 hover:text-white"
                >
                  <RefreshCw className="h-3 w-3 mr-1" /> Reset Points
                </Button>
              )}
            </div>

            {/* Interactive Image Preview with Crosshairs */}
            <div
              onClick={handleImageClick}
              className="relative max-h-[420px] overflow-auto rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center cursor-crosshair select-none"
            >
              <img
                ref={imageRef}
                src={fileUrl}
                alt="Floorplan Calibration"
                className="max-w-full max-h-[400px] object-contain block mx-auto pointer-events-auto"
              />

              {/* Point 1 Marker */}
              {point1 && (
                <div
                  className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center pointer-events-none animate-pulse"
                  style={{ left: point1.x, top: point1.y }}
                >
                  <span className="text-[9px] font-bold text-white">1</span>
                </div>
              )}

              {/* Point 2 Marker */}
              {point2 && (
                <div
                  className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full bg-cyan-500 border-2 border-white shadow-lg flex items-center justify-center pointer-events-none animate-pulse"
                  style={{ left: point2.x, top: point2.y }}
                >
                  <span className="text-[9px] font-bold text-white">2</span>
                </div>
              )}

              {/* Connecting Calibration Line */}
              {point1 && point2 && (
                <svg className="absolute inset-0 pointer-events-none w-full h-full">
                  <line
                    x1={point1.x}
                    y1={point1.y}
                    x2={point2.x}
                    y2={point2.y}
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                </svg>
              )}
            </div>

            {/* Metric Dimensions Input Form */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
              <div>
                <Label className="text-xs font-semibold">Calibrated Distance (m)</Label>
                <Input
                  type="number"
                  step="0.05"
                  value={calibrationLengthM}
                  onChange={(e) => setCalibrationLengthM(e.target.value)}
                  placeholder="e.g. 21.00"
                  className="h-9 text-xs mt-1"
                />
                <span className="text-[10px] text-slate-400">Length between Point 1 &amp; 2</span>
              </div>

              <div>
                <Label className="text-xs font-semibold">Overall Width (m)</Label>
                <Input
                  type="number"
                  step="0.05"
                  value={customWidthM}
                  onChange={(e) => setCustomWidthM(e.target.value)}
                  placeholder="e.g. 11.50"
                  className="h-9 text-xs mt-1"
                />
                <span className="text-[10px] text-slate-400">Total building width</span>
              </div>

              <div>
                <Label className="text-xs font-semibold">Overall Length (m)</Label>
                <Input
                  type="number"
                  step="0.05"
                  value={customLengthM}
                  onChange={(e) => setCustomLengthM(e.target.value)}
                  placeholder="e.g. 21.00"
                  className="h-9 text-xs mt-1"
                />
                <span className="text-[10px] text-slate-400">Total building depth</span>
              </div>

              <div>
                <Label className="text-xs font-semibold">Living Area (m²)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={customAreaM2}
                  onChange={(e) => setCustomAreaM2(e.target.value)}
                  placeholder="e.g. 215.00"
                  className="h-9 text-xs mt-1"
                />
                <span className="text-[10px] text-slate-400">Footprint for site coverage %</span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 pt-4 border-t border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          {fileUrl && (
            <Button
              size="sm"
              onClick={handleApplyCalibration}
              className="bg-brand-gold hover:bg-brand-gold-deep text-slate-950 font-bold text-xs gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              Apply to Siting Studio
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
