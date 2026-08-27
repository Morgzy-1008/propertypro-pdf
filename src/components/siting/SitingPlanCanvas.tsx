import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  MapPin,
  Maximize2,
  Download,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Building,
  Car,
  Layers,
  Sparkles,
  Info,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  QUEENSLAND_ESTATE_POD_PRESETS,
  EstatePodRule,
} from "@/lib/siting/estatePodPresets";
import {
  calculateHouseSiting,
  SitingLotDimensions,
  SitingHouseDimensions,
} from "@/lib/siting/btbWallLogic";

interface SitingPlanCanvasProps {
  initialLot?: Partial<SitingLotDimensions>;
  initialHouse?: Partial<SitingHouseDimensions>;
  onSitingUpdate?: (result: any) => void;
  standalone?: boolean;
}

export function SitingPlanCanvas({
  initialLot,
  initialHouse,
  onSitingUpdate,
  standalone = true,
}: SitingPlanCanvasProps) {
  const [selectedEstateId, setSelectedEstateId] = useState<string>("flagstone");
  const [frontage, setFrontage] = useState<number>(initialLot?.frontageM || 14.0);
  const [depth, setDepth] = useState<number>(initialLot?.depthM || 30.0);
  const [totalLotArea, setTotalLotArea] = useState<number>(initialLot?.totalLotM2 || 420);

  const [houseDesignName, setHouseDesignName] = useState<string>(initialHouse?.designName || "Amber 21");
  const [houseWidth, setHouseWidth] = useState<number>(initialHouse?.totalWidthM || 11.2);
  const [houseDepth, setHouseDepth] = useState<number>(initialHouse?.totalDepthM || 19.5);
  const [houseFootprintM2, setHouseFootprintM2] = useState<number>(initialHouse?.totalBuildingFootprintM2 || 195.4);
  const [garageSide, setGarageSide] = useState<"RHS" | "LHS">(initialHouse?.garageSide || "RHS");
  const [hasBtbGarageWall, setHasBtbGarageWall] = useState<boolean>(initialHouse?.hasBtbGarageWall ?? true);
  const [includePorchPath, setIncludePorchPath] = useState<boolean>(true);
  const [lotDisclosureUrl, setLotDisclosureUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentPodRule = useMemo(() => {
    return (
      QUEENSLAND_ESTATE_POD_PRESETS.find((p) => p.id === selectedEstateId) ||
      QUEENSLAND_ESTATE_POD_PRESETS[0]
    );
  }, [selectedEstateId]);

  const sitingResult = useMemo(() => {
    const lot: SitingLotDimensions = {
      frontageM: Number(frontage) || 14.0,
      depthM: Number(depth) || 30.0,
      totalLotM2: Number(totalLotArea) || frontage * depth,
      estateName: currentPodRule.estateName,
    };
    const house: SitingHouseDimensions = {
      designName: houseDesignName,
      totalWidthM: Number(houseWidth) || 11.2,
      totalDepthM: Number(houseDepth) || 19.5,
      totalBuildingFootprintM2: Number(houseFootprintM2) || 195.4,
      garageSide: garageSide,
      hasBtbGarageWall: hasBtbGarageWall,
      btbStepoutM: 0.8,
    };
    return calculateHouseSiting({
      lot,
      house,
      podRule: currentPodRule,
      includePorchPath,
    });
  }, [
    frontage,
    depth,
    totalLotArea,
    houseDesignName,
    houseWidth,
    houseDepth,
    houseFootprintM2,
    garageSide,
    hasBtbGarageWall,
    includePorchPath,
    currentPodRule,
  ]);

  useEffect(() => {
    if (onSitingUpdate) {
      onSitingUpdate(sitingResult);
    }
  }, [sitingResult, onSitingUpdate]);

  // Render 1:200 Siting Diagram onto Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 900;
    const H = 1000;
    canvas.width = W;
    canvas.height = H;

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // Grid pattern
    ctx.strokeStyle = "#f1f5f9";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Header banner
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(40, 30, W - 80, 50);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px sans-serif";
    ctx.fillText(`HUDSON HOMES — 1:200 ARCHITECTURAL LOT SITING PLAN`, 60, 60);
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${currentPodRule.estateName} · POD Setback Verification`, W - 60, 60);
    ctx.textAlign = "left";

    // North Compass
    ctx.beginPath();
    ctx.arc(W - 80, 130, 24, 0, Math.PI * 2);
    ctx.fillStyle = "#f8fafc";
    ctx.fill();
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#dc2626";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("N", W - 80, 122);
    ctx.beginPath();
    ctx.moveTo(W - 80, 126);
    ctx.lineTo(W - 86, 142);
    ctx.lineTo(W - 74, 142);
    ctx.closePath();
    ctx.fillStyle = "#0f172a";
    ctx.fill();
    ctx.textAlign = "left";

    // Lot bounding box scaling
    const marginX = 140;
    const marginY = 120;
    const maxPlotW = W - marginX * 2;
    const maxPlotH = H - marginY - 140;

    const scaleX = maxPlotW / frontage;
    const scaleY = maxPlotH / depth;
    const scale = Math.min(scaleX, scaleY) * 0.92;

    const plotW = frontage * scale;
    const plotH = depth * scale;
    const plotX = (W - plotW) / 2;
    const plotY = marginY + 20 + (maxPlotH - plotH) / 2;

    // Draw Grass Yard
    ctx.fillStyle = "#ecfdf5";
    ctx.fillRect(plotX, plotY, plotW, plotH);
    ctx.strokeStyle = "#059669";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(plotX, plotY, plotW, plotH);

    // Street label at front (bottom of lot)
    ctx.fillStyle = "#64748b";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`PRIMARY ROAD / STREET FRONTAGE (${frontage}m)`, W / 2, plotY + plotH + 40);
    ctx.textAlign = "left";

    // Calculate House Placement within Lot
    const houseW = houseWidth * scale;
    const houseH = houseDepth * scale;
    const houseX = plotX + sitingResult.leftSideSetbackM * scale;
    const houseY = plotY + plotH - (sitingResult.frontSetbackOmpM * scale + houseH);

    // 1. Draw Driveway & Porch Path
    const drivewayW = sitingResult.drivewayWidthM * scale;
    const drivewayH = sitingResult.frontSetbackGarageM * scale;
    const drivewayX = garageSide === "RHS" ? houseX + houseW - drivewayW : houseX;
    const drivewayY = plotY + plotH - drivewayH;

    // Exposed aggregate driveway gradient
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(drivewayX, drivewayY, drivewayW, drivewayH);
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(drivewayX, drivewayY, drivewayW, drivewayH);

    // Driveway texture dots
    ctx.fillStyle = "#e2e8f0";
    for (let dx = drivewayX + 6; dx < drivewayX + drivewayW - 4; dx += 12) {
      for (let dy = drivewayY + 6; dy < drivewayY + drivewayH - 4; dy += 12) {
        ctx.fillRect(dx, dy, 2, 2);
      }
    }

    // Porch Path
    if (includePorchPath) {
      const pathW = sitingResult.porchPathWidthM * scale;
      const pathH = sitingResult.porchPathLengthM * scale;
      const pathX = garageSide === "RHS" ? drivewayX - pathW : drivewayX + drivewayW;
      const pathY = houseY + houseH - pathH;

      ctx.fillStyle = "#cbd5e1";
      ctx.fillRect(pathX, pathY, pathW, pathH);
      ctx.strokeStyle = "#475569";
      ctx.strokeRect(pathX, pathY, pathW, pathH);

      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 9px sans-serif";
      ctx.fillText("Path", pathX + 2, pathY + pathH / 2);
    }

    // 2. Draw House Footprint
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(houseX, houseY, houseW, houseH);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 3;
    ctx.strokeRect(houseX, houseY, houseW, houseH);

    // Highlight BTB Wall side in orange
    if (sitingResult.btbSide !== "none") {
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 4;
      ctx.beginPath();
      if (sitingResult.btbSide === "RHS") {
        ctx.moveTo(houseX + houseW, houseY + houseH - 6.0 * scale);
        ctx.lineTo(houseX + houseW, houseY + houseH);
      } else {
        ctx.moveTo(houseX, houseY + houseH - 6.0 * scale);
        ctx.lineTo(houseX, houseY + houseH);
      }
      ctx.stroke();
    }

    // House internal compartments & labels
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 15px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${houseDesignName.toUpperCase()}`, houseX + houseW / 2, houseY + houseH * 0.4);
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#475569";
    ctx.fillText(`Building Footprint: ${sitingResult.buildingFootprintM2} m²`, houseX + houseW / 2, houseY + houseH * 0.4 + 20);
    ctx.fillText(`(${houseWidth}m Wide × ${houseDepth}m Deep)`, houseX + houseW / 2, houseY + houseH * 0.4 + 38);

    // Garage compartment
    const garW = 5.8 * scale;
    const garH = 5.8 * scale;
    const garX = garageSide === "RHS" ? houseX + houseW - garW : houseX;
    const garY = houseY + houseH - garH;
    ctx.fillStyle = "#e2e8f0";
    ctx.fillRect(garX, garY, garW, garH);
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(garX, garY, garW, garH);
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("GARAGE", garX + garW / 2, garY + garH / 2);

    // Outdoor Alfresco compartment at rear
    const alfW = 4.5 * scale;
    const alfH = 3.5 * scale;
    const alfX = garageSide === "RHS" ? houseX : houseX + houseW - alfW;
    const alfY = houseY;
    ctx.fillStyle = "#fef3c7";
    ctx.fillRect(alfX, alfY, alfW, alfH);
    ctx.strokeStyle = "#d97706";
    ctx.strokeRect(alfX, alfY, alfW, alfH);
    ctx.fillStyle = "#92400e";
    ctx.font = "bold 10px sans-serif";
    ctx.fillText("ALFRESCO", alfX + alfW / 2, alfY + alfH / 2 + 3);

    // 3. Setback Dimension Lines & Text Callouts
    ctx.fillStyle = "#0284c7";
    ctx.font = "bold 12px sans-serif";

    // Front Setback Callout
    ctx.fillText(`Front: ${sitingResult.frontSetbackOmpM}m (Garage ${sitingResult.frontSetbackGarageM}m)`, W / 2, plotY + plotH - sitingResult.frontSetbackOmpM * scale / 2 + 4);

    // Rear Setback Callout
    ctx.fillText(`Rear Yard: ${sitingResult.rearSetbackM}m`, W / 2, plotY + sitingResult.rearSetbackM * scale / 2);

    // Left Side Setback Callout
    ctx.textAlign = "right";
    const leftText = sitingResult.btbSide === "LHS" ? `BTB 200mm` : `${sitingResult.leftSideSetbackM}m`;
    ctx.fillText(leftText, houseX - 8, houseY + houseH / 2);

    // Right Side Setback Callout
    ctx.textAlign = "left";
    const rightText = sitingResult.btbSide === "RHS" ? `BTB 200mm` : `${sitingResult.rightSideSetbackM}m`;
    ctx.fillText(rightText, houseX + houseW + 8, houseY + houseH / 2);

    // 4. Footer Legend Card
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(40, H - 75, W - 80, 50);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(`Site Coverage: ${sitingResult.siteCoveragePct}% (Max ${sitingResult.maxAllowableCoveragePct}%) · ${sitingResult.isCoverageCompliant ? "COMPLIANT" : "OVER LIMIT"}`, 60, H - 45);
    ctx.fillStyle = "#38bdf8";
    ctx.fillText(`POS (Backyard): ${sitingResult.privateOpenSpaceM2} m² | Driveway & Porch Path: ${sitingResult.totalExposedAggAreaM2} m²`, 60, H - 25);

    if (sitingResult.btbSide !== "none") {
      ctx.fillStyle = "#f59e0b";
      ctx.textAlign = "right";
      ctx.fillText(`★ Zero-Lot BTB Wall: 200mm Boundary Offset Active`, W - 60, H - 35);
      ctx.textAlign = "left";
    }
  }, [
    frontage,
    depth,
    houseDesignName,
    houseWidth,
    houseDepth,
    garageSide,
    hasBtbGarageWall,
    includePorchPath,
    sitingResult,
    currentPodRule,
  ]);

  const handleExportCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `Siting_Plan_${houseDesignName.replace(/\s+/g, "_")}_Lot_${frontage}x${depth}.png`;
    a.click();
    toast.success("Siting plan exported as high-resolution PNG!");
  };

  const handleTransferToTender = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");

    try {
      const rawTender = localStorage.getItem("hudson_current_tender_draft");
      let currentTender = rawTender ? JSON.parse(rawTender) : {};

      currentTender = {
        ...currentTender,
        land: {
          ...currentTender.land,
          frontageM: frontage,
          lotSizeM2: totalLotArea,
          estate: currentPodRule.estateName,
          council: currentPodRule.council,
        },
        homeSpec: {
          ...currentTender.homeSpec,
          homeDesign: houseDesignName,
          garageLocation: garageSide,
          setbacks: {
            frontBoundary: `${sitingResult.frontSetbackOmpM}m (Garage ${sitingResult.frontSetbackGarageM}m)`,
            rearBoundary: `${sitingResult.rearSetbackM}m`,
            leftBoundary: `${sitingResult.leftSideSetbackM}m`,
            rightBoundary: `${sitingResult.rightSideSetbackM}m`,
          },
        },
        documents: {
          ...currentTender.documents,
          siting_plan_1_200: {
            id: "siting_plan_1_200",
            label: "1:200 Scale Siting / House Position Plan",
            fileName: `Hales_Siting Plan_1-200.png`,
            fileDataUrl: url,
            fileType: "image/png",
            required: true,
          },
        },
      };

      localStorage.setItem("hudson_current_tender_draft", JSON.stringify(currentTender));
      toast.success("Siting plan & setbacks attached directly to Tender Request & Job Folder!");
    } catch {
      toast.error("Failed to bridge siting plan to Tender.");
    }
  };

  return (
    <div className={`space-y-6 ${standalone ? "bg-slate-950 text-slate-100 p-4 sm:p-6 rounded-2xl border border-slate-800" : ""}`}>
      {/* Controls Header */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl">
        {/* Estate Selector */}
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-xs text-amber-400 font-bold flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            Masterplanned Estate &amp; POD Presets
          </Label>
          <Select value={selectedEstateId} onValueChange={setSelectedEstateId}>
            <SelectTrigger className="border-slate-800 bg-slate-950 text-xs font-semibold text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-800 bg-slate-950 text-slate-100">
              {QUEENSLAND_ESTATE_POD_PRESETS.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  {p.estateName} ({p.suburb} &bull; {p.council})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-slate-400">{currentPodRule.notes}</p>
        </div>

        {/* Frontage & Depth */}
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-300">Lot Frontage (m)</Label>
          <Input
            type="number"
            step="0.5"
            value={frontage}
            onChange={(e) => setFrontage(parseFloat(e.target.value) || 14)}
            className="border-slate-800 bg-slate-950 text-xs font-bold text-cyan-400"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-300">Lot Depth (m)</Label>
          <Input
            type="number"
            step="0.5"
            value={depth}
            onChange={(e) => setDepth(parseFloat(e.target.value) || 30)}
            className="border-slate-800 bg-slate-950 text-xs font-bold text-cyan-400"
          />
        </div>
      </div>

      {/* House & BTB Wall Switches */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-2xl border border-slate-800 bg-slate-900/60 text-xs">
        <div>
          <Label className="text-[11px] text-slate-300">Design Name</Label>
          <Input
            value={houseDesignName}
            onChange={(e) => setHouseDesignName(e.target.value)}
            className="border-slate-800 bg-slate-950 text-xs font-semibold mt-1"
          />
        </div>

        <div>
          <Label className="text-[11px] text-slate-300">Garage Side</Label>
          <Select value={garageSide} onValueChange={(v: "RHS" | "LHS") => setGarageSide(v)}>
            <SelectTrigger className="border-slate-800 bg-slate-950 text-xs mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-800 bg-slate-950 text-slate-100">
              <SelectItem value="RHS">Right Hand Side (RHS)</SelectItem>
              <SelectItem value="LHS">Left Hand Side (LHS)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* BTB Wall Toggle */}
        <div className="flex items-center justify-between p-2.5 rounded-xl border border-amber-500/30 bg-amber-950/20">
          <div>
            <span className="font-bold text-amber-300 block">BTB Garage Wall</span>
            <span className="text-[10px] text-slate-400">200mm boundary offset</span>
          </div>
          <Switch checked={hasBtbGarageWall} onCheckedChange={setHasBtbGarageWall} />
        </div>

        {/* Porch Path Toggle */}
        <div className="flex items-center justify-between p-2.5 rounded-xl border border-cyan-500/30 bg-cyan-950/20">
          <div>
            <span className="font-bold text-cyan-300 block">Path to Porch</span>
            <span className="text-[10px] text-slate-400">+{sitingResult.porchPathAreaM2} m² exposed agg</span>
          </div>
          <Switch checked={includePorchPath} onCheckedChange={setIncludePorchPath} />
        </div>
      </div>

      {/* Siting Warnings Banner */}
      {sitingResult.warnings.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-300">
          <AlertTriangle className="h-4 w-4 text-amber-400 flex-none mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">Setback / Compliance Advisory:</span>
            <ul className="list-disc list-inside space-y-0.5 text-amber-200/90 text-[11px]">
              {sitingResult.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Interactive Siting Canvas Display */}
      <div className="relative rounded-2xl border border-slate-800 bg-white p-4 flex flex-col items-center justify-center shadow-2xl overflow-hidden min-h-[600px]">
        <canvas ref={canvasRef} className="max-w-full h-auto rounded-lg shadow-md" />

        {/* Bottom Floating Action Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between w-full max-w-2xl gap-3 bg-slate-900/95 p-3 rounded-xl border border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Site Coverage: {sitingResult.siteCoveragePct}% ({sitingResult.isCoverageCompliant ? "Compliant" : "Over Max"})</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCanvas}
              className="border-slate-800 bg-slate-950 text-slate-200 text-xs gap-1.5"
            >
              <Download className="h-3.5 w-3.5 text-cyan-400" />
              Download Siting Plan (.PNG)
            </Button>
            <Button
              size="sm"
              onClick={handleTransferToTender}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5 shadow-md shadow-amber-500/20"
            >
              <Building className="h-3.5 w-3.5" />
              Attach to Tender &amp; Job Folder
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
