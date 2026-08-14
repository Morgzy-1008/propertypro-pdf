import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { HUDSON_FLOORPLANS, FloorplanRecord } from "@/components/flyer/floorplans.data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Search, ZoomIn, ZoomOut, RotateCcw, Copy, Check, ChevronLeft, ChevronRight, Crop, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/cropper")({
  ssr: false,
  beforeLoad: async () => {
    // In local development or when logged in as Morgan
    if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
      return;
    }
    let user = null;
    try {
      const { data } = await supabase.auth.getUser();
      user = data?.user ?? null;
    } catch { /* ignore */ }
    if (!user || user.email !== "morgan.hales@hudsonhomes.com.au") {
      throw redirect({ to: "/" });
    }
  },
  component: CropperPage,
});

type Point = { x: number; y: number };
type PolyCrop = { page: number; points: Point[]; x?: number; y?: number; w?: number; h?: number };

const CLOSE_THRESHOLD = 16; // pixels — snap radius to first point to close polygon

function normalizeCrop(b: any): PolyCrop {
  if (b.points && Array.isArray(b.points) && b.points.length >= 3) {
    return { page: b.page || 1, points: b.points };
  }
  if (b.x != null && b.y != null && b.w != null && b.h != null) {
    return {
      page: b.page || 1,
      x: b.x,
      y: b.y,
      w: b.w,
      h: b.h,
      points: [
        { x: b.x, y: b.y },
        { x: b.x + b.w, y: b.y },
        { x: b.x + b.w, y: b.y + b.h },
        { x: b.x, y: b.y + b.h },
      ],
    };
  }
  return { page: b.page || 1, points: [] };
}

function CropperPage() {
  const [selectedPlan, setSelectedPlan] = useState<FloorplanRecord | null>(null);
  const [docLoaded, setDocLoaded] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [isImageMode, setIsImageMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(2.0);
  const [filterMode, setFilterMode] = useState<"all" | "missing" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);

  // Polygon crop state
  const [activePoints, setActivePoints] = useState<Point[]>([]); // in-progress polygon (normalized 0–1)
  const [crops, setCrops] = useState<PolyCrop[]>([]);
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [jsonOutput, setJsonOutput] = useState("");
  const [isNearStart, setIsNearStart] = useState(false);

  // Filtered floorplans list
  const filteredPlans = useMemo(() => {
    return HUDSON_FLOORPLANS.filter((p) => {
      const matchesSearch =
        p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.design.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      const hasCrops = Boolean(p.cropBoxes && p.cropBoxes.length > 0);
      if (filterMode === "missing") return !hasCrops;
      if (filterMode === "completed") return hasCrops;
      return true;
    });
  }, [searchQuery, filterMode]);

  const stats = useMemo(() => {
    const total = HUDSON_FLOORPLANS.length;
    const completed = HUDSON_FLOORPLANS.filter((p) => p.cropBoxes && p.cropBoxes.length > 0).length;
    const missing = total - completed;
    return { total, completed, missing };
  }, []);

  // ─── PDF / Image loading ───
  const loadPdf = async (plan: FloorplanRecord) => {
    setSelectedPlan(plan);
    setDocLoaded(false);
    setPdfDoc(null);
    setIsImageMode(false);
    setErrorMessage(null);
    const existing = (plan.cropBoxes || []).map(normalizeCrop);
    setCrops(existing);
    setActivePoints([]);
    setJsonOutput("");
    setIsNearStart(false);

    let pdfUrl = plan.pdfUrl;
    if (!pdfUrl) pdfUrl = `/floorplans_pdf/${plan.label.toUpperCase()}.pdf`;

    try {
      const res = await fetch(pdfUrl);
      if (!res.ok) throw new Error(`PDF HTTP ${res.status}`);
      const buffer = await res.arrayBuffer();
      const data = new Uint8Array(buffer);

      const pdfjs = await import("pdfjs-dist");
      const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

      const doc = await pdfjs.getDocument({ data }).promise;
      setPdfDoc(doc);
      setNumPages(doc.numPages);
      setCurrentPage(1);
      setDocLoaded(true);
      await renderPage(doc, 1);
    } catch (err) {
      console.warn("Could not load PDF, loading plan.url as fallback:", plan.url);
      // Fallback: render image
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        }
        setIsImageMode(true);
        setNumPages(1);
        setCurrentPage(1);
        setDocLoaded(true);
      };
      img.onerror = () => {
        const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(plan.url)}&output=png`;
        const fallbackImg = new Image();
        fallbackImg.crossOrigin = "anonymous";
        fallbackImg.onload = () => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          canvas.width = fallbackImg.naturalWidth;
          canvas.height = fallbackImg.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(fallbackImg, 0, 0);
          }
          setIsImageMode(true);
          setNumPages(1);
          setCurrentPage(1);
          setDocLoaded(true);
        };
        fallbackImg.onerror = () => {
          setErrorMessage(`Could not load PDF or image for ${plan.label}`);
        };
        fallbackImg.src = proxyUrl;
      };
      img.src = plan.url;
    }
  };

  const renderPage = async (doc: any, pageNum: number) => {
    if (!doc || isImageMode) return;
    try {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: context, viewport }).promise;
    } catch (err) {
      console.error("renderPage error:", err);
    }
  };

  useEffect(() => {
    if (pdfDoc && !isImageMode) renderPage(pdfDoc, currentPage);
  }, [currentPage, scale, pdfDoc, isImageMode]);

  // ─── Overlay drawing ───
  const drawOverlay = useCallback(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;

    overlay.width = canvas.width;
    overlay.height = canvas.height;
    const ctx = overlay.getContext("2d")!;
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    const w = overlay.width;
    const h = overlay.height;

    // Draw completed crops for this page
    for (let ci = 0; ci < crops.length; ci++) {
      const crop = crops[ci];
      if (crop.page !== currentPage) continue;
      const pts = crop.points;
      if (pts.length < 3) continue;

      ctx.beginPath();
      ctx.moveTo(pts[0].x * w, pts[0].y * h);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x * w, pts[i].y * h);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(34, 197, 94, 0.18)"; // green fill
      ctx.fill();
      ctx.strokeStyle = "#16a34a";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Center label
      const cx = (pts.reduce((s, p) => s + p.x, 0) / pts.length) * w;
      const cy = (pts.reduce((s, p) => s + p.y, 0) / pts.length) * h;
      ctx.font = "bold 14px Inter, sans-serif";
      ctx.fillStyle = "#15803d";
      ctx.textAlign = "center";
      ctx.fillText(`Crop ${ci + 1} ✓`, cx, cy);

      // Draw vertex dots
      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#16a34a";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Draw in-progress polygon
    if (activePoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(activePoints[0].x * w, activePoints[0].y * h);
      for (let i = 1; i < activePoints.length; i++) {
        ctx.lineTo(activePoints[i].x * w, activePoints[i].y * h);
      }

      // Rubber band line to mouse
      if (mousePos) {
        ctx.lineTo(mousePos.x * w, mousePos.y * h);
      }

      ctx.strokeStyle = "#ef4444"; // red while drawing
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Semi-transparent fill preview
      if (activePoints.length >= 2 && mousePos) {
        ctx.beginPath();
        ctx.moveTo(activePoints[0].x * w, activePoints[0].y * h);
        for (let i = 1; i < activePoints.length; i++) {
          ctx.lineTo(activePoints[i].x * w, activePoints[i].y * h);
        }
        ctx.lineTo(mousePos.x * w, mousePos.y * h);
        ctx.closePath();
        ctx.fillStyle = "rgba(239, 68, 68, 0.1)";
        ctx.fill();
      }

      // Draw placed vertex dots
      for (let i = 0; i < activePoints.length; i++) {
        const p = activePoints[i];
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, i === 0 ? 8 : 5, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? "#f59e0b" : "#ef4444"; // 1st point is amber target
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Highlight first point when snapping to close
      if (activePoints.length >= 3 && isNearStart) {
        ctx.beginPath();
        ctx.arc(activePoints[0].x * w, activePoints[0].y * h, 14, 0, Math.PI * 2);
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.font = "bold 12px Inter, sans-serif";
        ctx.fillStyle = "#15803d";
        ctx.textAlign = "center";
        ctx.fillText("Click to Close", activePoints[0].x * w, activePoints[0].y * h - 18);
      }
    }
  }, [crops, activePoints, mousePos, currentPage, isNearStart]);

  useEffect(() => {
    drawOverlay();
  }, [drawOverlay]);

  // ─── Click to place points ───
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;

    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    // Check if we should close the polygon (click near first point)
    if (activePoints.length >= 3) {
      const w = rect.width;
      const h = rect.height;
      const dx = (px - activePoints[0].x) * w;
      const dy = (py - activePoints[0].y) * h;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CLOSE_THRESHOLD) {
        // Close polygon!
        setCrops([...crops, { page: currentPage, points: [...activePoints] }]);
        setActivePoints([]);
        setIsNearStart(false);
        return;
      }
    }

    // Otherwise add a new point
    setActivePoints([...activePoints, { x: px, y: py }]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = (e.clientX - rect.left) / rect.width;
    const my = (e.clientY - rect.top) / rect.height;
    setMousePos({ x: mx, y: my });

    if (activePoints.length >= 3) {
      const w = rect.width;
      const h = rect.height;
      const dx = (mx - activePoints[0].x) * w;
      const dy = (my - activePoints[0].y) * h;
      const dist = Math.sqrt(dx * dx + dy * dy);
      setIsNearStart(dist < CLOSE_THRESHOLD);
    } else {
      setIsNearStart(false);
    }
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Right-click: undo last point
    if (activePoints.length > 0) {
      setActivePoints(activePoints.slice(0, -1));
    }
  };

  const undoLastCrop = () => {
    if (crops.length > 0) {
      setCrops(crops.slice(0, -1));
    }
  };

  const generateJson = () => {
    if (!selectedPlan) return;
    const updatedPlan = {
      ...selectedPlan,
      cropBoxes: crops.map(c => ({
        page: c.page,
        points: c.points,
      })),
    };
    setJsonOutput(JSON.stringify(updatedPlan, null, 2) + ",");
  };

  const copyJson = () => {
    if (jsonOutput) {
      navigator.clipboard.writeText(jsonOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-900 text-slate-100 font-sans">
      {/* Sidebar */}
      <div className="w-80 bg-slate-950 border-r border-slate-800 flex flex-col h-full">
        <div className="p-4 border-b border-slate-800 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold flex items-center gap-2 text-white">
              <Crop className="w-5 h-5 text-indigo-400" />
              Floorplan Cropper
            </h2>
            <span className="text-xs bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-800 font-medium">
              {stats.completed} / {stats.total} Done
            </span>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search design or label..."
              className="pl-8 bg-slate-900 border-slate-700 text-xs h-9 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setFilterMode("all")}
              className={`flex-1 py-1 px-2 rounded font-medium transition-colors ${
                filterMode === "all" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All ({stats.total})
            </button>
            <button
              onClick={() => setFilterMode("missing")}
              className={`flex-1 py-1 px-2 rounded font-medium transition-colors ${
                filterMode === "missing" ? "bg-amber-600 text-white" : "text-amber-400/80 hover:text-amber-300"
              }`}
            >
              Missing ({stats.missing})
            </button>
            <button
              onClick={() => setFilterMode("completed")}
              className={`flex-1 py-1 px-2 rounded font-medium transition-colors ${
                filterMode === "completed" ? "bg-emerald-600 text-white" : "text-emerald-400/80 hover:text-emerald-300"
              }`}
            >
              Done ({stats.completed})
            </button>
          </div>
        </div>

        {/* List of plans */}
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
          {filteredPlans.map((plan) => {
            const isSelected = selectedPlan?.label === plan.label;
            const hasCrops = Boolean(plan.cropBoxes && plan.cropBoxes.length > 0);
            return (
              <button
                key={plan.label}
                onClick={() => loadPdf(plan)}
                className={`w-full text-left px-3 py-2 rounded-md text-xs flex items-center justify-between transition-all ${
                  isSelected
                    ? "bg-indigo-600 text-white font-semibold shadow-sm"
                    : "hover:bg-slate-900 text-slate-300"
                }`}
              >
                <div className="truncate pr-2">
                  <span className="block font-medium truncate">{plan.label}</span>
                  <span className={`text-[10px] ${isSelected ? "text-indigo-200" : "text-slate-500"}`}>
                    {plan.beds} bed • {plan.baths} bath • {plan.size} m²
                  </span>
                </div>
                {hasCrops ? (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 font-medium">
                    ✓ {plan.cropBoxes?.length}
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded shrink-0 font-medium">
                    Needs Crop
                  </span>
                )}
              </button>
            );
          })}
          {filteredPlans.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-500">
              No floorplans matching "{searchQuery}"
            </div>
          )}
        </div>
      </div>

      {/* Main Cropping Work Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-950">
        {/* Top Control Toolbar */}
        <div className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 shadow-md">
          {/* Left: Page Navigation & Zoom */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded border border-slate-700">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-slate-200 hover:text-white hover:bg-slate-700"
                disabled={currentPage <= 1 || !docLoaded || isImageMode}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs font-medium px-2 text-slate-300">
                Page {currentPage} of {numPages || 1}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-slate-200 hover:text-white hover:bg-slate-700"
                disabled={currentPage >= numPages || !docLoaded || isImageMode}
                onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded border border-slate-700">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-slate-300 hover:text-white hover:bg-slate-700"
                onClick={() => setScale((s) => Math.max(1.0, +(s - 0.5).toFixed(1)))}
                disabled={!docLoaded || scale <= 1.0}
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs font-mono px-1 text-slate-300">{scale.toFixed(1)}x</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-slate-300 hover:text-white hover:bg-slate-700"
                onClick={() => setScale((s) => Math.min(4.0, +(s + 0.5).toFixed(1)))}
                disabled={!docLoaded || scale >= 4.0}
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
            </div>

            {selectedPlan && (
              <span className="text-xs font-semibold text-indigo-300 border-l border-slate-700 pl-3">
                {selectedPlan.label}
              </span>
            )}
          </div>

          {/* Center: Live Drawing Status */}
          <div className="flex items-center gap-2">
            {activePoints.length > 0 ? (
              <span className="text-xs bg-red-950/80 text-red-300 border border-red-800 px-3 py-1 rounded-full font-medium flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                Placing Points ({activePoints.length}) — Click Amber Start Point to Close
              </span>
            ) : crops.length > 0 ? (
              <span className="text-xs bg-emerald-950/80 text-emerald-300 border border-emerald-800 px-3 py-1 rounded-full font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                {crops.length} polygon crop{crops.length > 1 ? "s" : ""} active
              </span>
            ) : null}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700"
              onClick={undoLastCrop}
              disabled={crops.length === 0}
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Undo Crop
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setCrops([]);
                setActivePoints([]);
              }}
              disabled={crops.length === 0 && activePoints.length === 0}
            >
              Clear All
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
              onClick={generateJson}
              disabled={!selectedPlan}
            >
              Generate JSON
            </Button>
          </div>
        </div>

        {/* Error notification banner */}
        {errorMessage && (
          <div className="bg-red-950/90 border-b border-red-800 px-4 py-2 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Guidance Prompt */}
        {docLoaded && crops.length === 0 && activePoints.length === 0 && (
          <div className="bg-indigo-950/70 border-b border-indigo-900/60 px-4 py-2 text-indigo-200 text-xs flex items-center justify-between">
            <span>
              💡 <strong>Polygon Cropping:</strong> Click anywhere on the drawing to drop corner points around the floorplan perimeter. Click the <strong className="text-amber-400">Amber 1st Point</strong> to close and complete the crop. Right-click to undo a vertex.
            </span>
          </div>
        )}

        {/* JSON Output Drawer */}
        {jsonOutput && (
          <div className="bg-slate-900 border-b border-slate-800 p-3 max-h-48 overflow-auto font-mono text-xs text-emerald-400 relative shadow-2xl shrink-0">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
              <span className="text-xs text-slate-300 font-sans font-semibold">Generated Crop JSON</span>
              <Button
                size="sm"
                onClick={copyJson}
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy JSON"}
              </Button>
            </div>
            <pre className="text-[11px] leading-tight select-all">{jsonOutput}</pre>
          </div>
        )}

        {/* Canvas Display Area */}
        <div
          className="flex-1 overflow-auto bg-slate-900/50 p-6 flex items-center justify-center relative"
          style={{ cursor: docLoaded ? "crosshair" : "default" }}
        >
          {docLoaded ? (
            <div className="relative inline-block shadow-2xl rounded-sm border border-slate-700 bg-white">
              <canvas ref={canvasRef} className="block" />
              <canvas
                ref={overlayRef}
                className="absolute top-0 left-0"
                style={{ width: "100%", height: "100%" }}
                onClick={handleClick}
                onMouseMove={handleMouseMove}
                onContextMenu={handleRightClick}
              />
            </div>
          ) : (
            <div className="text-center p-8 text-slate-500">
              <Crop className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-400" />
              <p className="text-sm font-medium text-slate-400">Select a floorplan from the sidebar</p>
              <p className="text-xs text-slate-600 mt-1">
                Filter by "Missing" to quickly find and crop uncropped floorplans
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
