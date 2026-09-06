import React, { useRef, useState, useEffect, useMemo } from "react";
import {
  CadastreParcel,
  SitedHouse,
  SetbackRules,
  ComplianceReport,
  BasemapMode,
  DrawingScale,
} from "./siteStudioTypes";
import { HUDSON_DESIGNS_CATALOG } from "@/lib/site-studio/hudsonDesignCatalog";
import {
  Compass,
  Sun,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  FlipHorizontal,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SiteStudioCanvasProps {
  parcel: CadastreParcel;
  sitedHouse: SitedHouse;
  setSitedHouse: React.Dispatch<React.SetStateAction<SitedHouse>>;
  rules: SetbackRules;
  compliance: ComplianceReport;
  basemapMode: BasemapMode;
  scale: DrawingScale;
  isLight: boolean;
  showContours: boolean;
  showSolar: boolean;
}

export function SiteStudioCanvas({
  parcel,
  sitedHouse,
  setSitedHouse,
  rules,
  compliance,
  basemapMode,
  scale,
  isLight,
  showContours,
  showSolar,
}: SiteStudioCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isDraggingHouse, setIsDraggingHouse] = useState(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; initialX: number; initialY: number } | null>(null);

  // Lot Dimensions in metres
  const lotW = parcel.frontageM || 14.0;
  const lotL = parcel.depthM || 32.0;

  // Screen scale: 1 metre = pixelsPerMetre
  // Standard 1:200 scale corresponds to ~22px per metre on a standard 1080p display
  // 1:100 scale corresponds to ~44px per metre
  const basePixelsPerMetre = scale === "1:100" ? 40 : 22;
  const pixelsPerMetre = basePixelsPerMetre * zoom;

  const lotWidthPx = lotW * pixelsPerMetre;
  const lotLengthPx = lotL * pixelsPerMetre;

  // Active Hudson design geometry
  const currentPreset = useMemo(() => {
    return HUDSON_DESIGNS_CATALOG.find((d) => d.id === sitedHouse.designId) || HUDSON_DESIGNS_CATALOG[0];
  }, [sitedHouse.designId]);

  const houseWidthPx = sitedHouse.widthM * pixelsPerMetre;
  const houseLengthPx = sitedHouse.lengthM * pixelsPerMetre;

  // House position in pixels on lot coordinate space
  const housePosX = sitedHouse.posX * pixelsPerMetre;
  const housePosY = sitedHouse.posY * pixelsPerMetre;

  // 450mm Eaves offset in pixels
  const eavePx = (rules.eaveWidthM || 0.45) * pixelsPerMetre;

  // Reset View to center
  const handleResetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Mouse drag handlers for House Siting
  const handleMouseDownHouse = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingHouse(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initialX: sitedHouse.posX,
      initialY: sitedHouse.posY,
    };
  };

  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === "svg") {
      setIsPanning(true);
      dragStartRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        initialX: pan.x,
        initialY: pan.y,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragStartRef.current) return;

    if (isDraggingHouse) {
      const deltaX = (e.clientX - dragStartRef.current.clientX) / pixelsPerMetre;
      const deltaY = (e.clientY - dragStartRef.current.clientY) / pixelsPerMetre;

      const newPosX = Math.max(0.1, Math.min(lotW - sitedHouse.widthM - 0.1, dragStartRef.current.initialX + deltaX));
      const newPosY = Math.max(0.1, Math.min(lotL - sitedHouse.lengthM - 0.1, dragStartRef.current.initialY + deltaY));

      setSitedHouse((prev) => ({
        ...prev,
        posX: Math.round(newPosX * 100) / 100,
        posY: Math.round(newPosY * 100) / 100,
      }));
    } else if (isPanning) {
      const deltaX = e.clientX - dragStartRef.current.clientX;
      const deltaY = e.clientY - dragStartRef.current.clientY;
      setPan({
        x: dragStartRef.current.initialX + deltaX,
        y: dragStartRef.current.initialY + deltaY,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDraggingHouse(false);
    setIsPanning(false);
    dragStartRef.current = null;
  };

  // Built to Boundary (BTB) Quick Snap
  const handleSnapBtb = () => {
    const isCurrentlyBtb = sitedHouse.isBtb;
    if (!isCurrentlyBtb) {
      // Snap to Right boundary: posX = lotW - houseWidth - 0.20
      const btbPosX = Math.round((lotW - sitedHouse.widthM - 0.20) * 100) / 100;
      setSitedHouse((prev) => ({
        ...prev,
        isBtb: true,
        btbSide: "right",
        posX: btbPosX,
      }));
    } else {
      // Re-center horizontally
      const centeredX = Math.round(((lotW - sitedHouse.widthM) / 2) * 100) / 100;
      setSitedHouse((prev) => ({
        ...prev,
        isBtb: false,
        btbSide: "none",
        posX: centeredX,
      }));
    }
  };

  // Flip Garage (Mirror LH / RH)
  const handleFlipGarage = () => {
    setSitedHouse((prev) => ({
      ...prev,
      isMirrored: !prev.isMirrored,
    }));
  };

  // Rotate 90 degrees
  const handleRotate90 = () => {
    setSitedHouse((prev) => ({
      ...prev,
      rotationDeg: (prev.rotationDeg + 90) % 360,
    }));
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDownCanvas}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`relative w-full h-full min-h-[640px] flex items-center justify-center overflow-hidden select-none cursor-grab active:cursor-grabbing ${
        isLight ? "bg-slate-100" : "bg-[#090D14]"
      }`}
    >
      {/* Basemap Background Layers */}
      {basemapMode === "satellite-hybrid" && (
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-40 transition-opacity duration-300"
          style={{
            backgroundImage: `url('https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${parcel.longitude},${parcel.latitude},18.5,0/1200x800?access_token=pk.eyJ1IjoibW9yZ2FuLWhhbGVzIiwiYSI6ImNsc3g0YmcyYTA4OXMya3BjaWdxYnVjYXAifQ.sample')`,
            backgroundBlendMode: "luminosity",
          }}
        />
      )}

      {basemapMode === "esri-aerial" && (
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-50"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(16,185,129,0.08) 0%, rgba(11,15,23,0.95) 100%)`,
          }}
        />
      )}

      {/* Blueprint Cadastre Grid lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: isLight
            ? "linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)"
            : "linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Viewport Canvas Container with Pan and Zoom */}
      <div
        className="relative transition-transform duration-75 origin-center"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px)`,
        }}
      >
        {/* Lot Boundary SVG */}
        <div
          className="relative rounded-sm shadow-2xl border-2 transition-all"
          style={{
            width: `${lotWidthPx}px`,
            height: `${lotLengthPx}px`,
            borderColor: isLight ? "#d97706" : "#f59e0b",
            backgroundColor: isLight ? "rgba(255, 255, 255, 0.95)" : "rgba(15, 23, 42, 0.95)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          }}
        >
          {/* Natural Elevation Contours (1m Intervals) */}
          {showContours && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
              <path
                d={`M 0 ${lotLengthPx * 0.25} Q ${lotWidthPx * 0.5} ${lotLengthPx * 0.28} ${lotWidthPx} ${lotLengthPx * 0.25}`}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
              <text x={lotWidthPx * 0.05} y={lotLengthPx * 0.24} fill="#06b6d4" fontSize="9" fontWeight="bold">
                RL 48.0m (Natural Ground)
              </text>
              <path
                d={`M 0 ${lotLengthPx * 0.55} Q ${lotWidthPx * 0.5} ${lotLengthPx * 0.58} ${lotWidthPx} ${lotLengthPx * 0.55}`}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
              <text x={lotWidthPx * 0.05} y={lotLengthPx * 0.54} fill="#06b6d4" fontSize="9" fontWeight="bold">
                RL 47.4m (-0.6m Fall)
              </text>
              <path
                d={`M 0 ${lotLengthPx * 0.85} Q ${lotWidthPx * 0.5} ${lotLengthPx * 0.88} ${lotWidthPx} ${lotLengthPx * 0.85}`}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1.5"
                strokeDasharray="4 2"
              />
              <text x={lotWidthPx * 0.05} y={lotLengthPx * 0.84} fill="#06b6d4" fontSize="9" fontWeight="bold">
                RL 46.8m (Rear Drainage)
              </text>
            </svg>
          )}

          {/* Statutory Building Envelope (Permitted Building Zone) */}
          <div
            className="absolute border border-dashed rounded-xs pointer-events-none transition-all duration-200"
            style={{
              top: `${rules.frontSetback * pixelsPerMetre}px`,
              bottom: `${rules.rearSetback * pixelsPerMetre}px`,
              left: `${(sitedHouse.isBtb && sitedHouse.btbSide === "left" ? rules.btbSideSetback : rules.leftSetback) * pixelsPerMetre}px`,
              right: `${(sitedHouse.isBtb && sitedHouse.btbSide === "right" ? rules.btbSideSetback : rules.rightSetback) * pixelsPerMetre}px`,
              borderColor: "rgba(16, 185, 129, 0.7)",
              backgroundColor: isLight ? "rgba(16, 185, 129, 0.04)" : "rgba(16, 185, 129, 0.06)",
            }}
          >
            <span className="absolute top-1 right-2 text-[9px] font-mono font-bold text-emerald-500 uppercase tracking-wider">
              Allowable Building Envelope (QDC {rules.lotCategory === "small-lot" ? "MP 1.1" : "MP 1.2"})
            </span>
          </div>

          {/* Concrete Driveway Crossover Alignment */}
          <div
            className="absolute top-0 pointer-events-none transition-all"
            style={{
              left: `${housePosX + (sitedHouse.isMirrored ? 0 : houseWidthPx * 0.48)}px`,
              width: `${houseWidthPx * 0.52}px`,
              height: `${housePosY}px`,
              background: isLight
                ? "repeating-linear-gradient(45deg, #e2e8f0, #e2e8f0 6px, #f1f5f9 6px, #f1f5f9 12px)"
                : "repeating-linear-gradient(45deg, #1e293b, #1e293b 6px, #334155 6px, #334155 12px)",
              borderLeft: "1px dashed rgba(245, 158, 11, 0.5)",
              borderRight: "1px dashed rgba(245, 158, 11, 0.5)",
            }}
          >
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              Proposed Driveway Crossover
            </span>
          </div>

          {/* Sited House Footprint */}
          <div
            onMouseDown={handleMouseDownHouse}
            className={`absolute cursor-move transition-shadow duration-150 border-2 rounded-xs select-none ${
              compliance.allCompliant
                ? "border-amber-400 bg-slate-900/95 text-slate-100 shadow-xl shadow-amber-500/10"
                : "border-red-500 bg-red-950/90 text-white shadow-xl shadow-red-500/20 animate-pulse"
            }`}
            style={{
              left: `${housePosX}px`,
              top: `${housePosY}px`,
              width: `${houseWidthPx}px`,
              height: `${houseLengthPx}px`,
              transform: `rotate(${sitedHouse.rotationDeg}deg) ${sitedHouse.isMirrored ? "scaleX(-1)" : ""}`,
              transformOrigin: "center center",
            }}
          >
            {/* Hudson Standard 450mm Eaves Line (Outer Most Projection / OMP) */}
            <div
              className="absolute pointer-events-none border border-dashed transition-all"
              style={{
                top: `-${eavePx}px`,
                bottom: `-${eavePx}px`,
                left: sitedHouse.isBtb && sitedHouse.btbSide === "left" ? "0px" : `-${eavePx}px`,
                right: sitedHouse.isBtb && sitedHouse.btbSide === "right" ? "0px" : `-${eavePx}px`,
                borderColor: "#d97706",
              }}
            >
              <span
                className={`absolute -top-3.5 left-1 text-[8px] font-mono font-bold text-amber-500 ${
                  sitedHouse.isMirrored ? "scaleX(-1)" : ""
                }`}
              >
                450mm Eaves (OMP)
              </span>
            </div>

            {/* Custom Uploaded Plan Render OR Hudson CAD Layout */}
            {sitedHouse.source === "custom-upload" && sitedHouse.customPlanUrl ? (
              <img
                src={sitedHouse.customPlanUrl}
                alt="Custom Sited Plan"
                className="w-full h-full object-contain pointer-events-none opacity-90"
              />
            ) : (
              <div className="relative w-full h-full p-1 overflow-hidden">
                {/* CAD Rooms Layout */}
                {currentPreset.rooms.map((room, idx) => (
                  <div
                    key={idx}
                    className="absolute border border-slate-700 bg-slate-800/80 flex items-center justify-center p-0.5"
                    style={{
                      left: `${room.xPct}%`,
                      top: `${room.yPct}%`,
                      width: `${room.wPct}%`,
                      height: `${room.hPct}%`,
                    }}
                  >
                    <span
                      className={`text-[8px] sm:text-[9px] font-bold text-amber-300 uppercase tracking-tighter truncate ${
                        sitedHouse.isMirrored ? "scaleX(-1)" : ""
                      }`}
                    >
                      {room.name}
                    </span>
                  </div>
                ))}

                {/* House Design Label Badge */}
                <div
                  className={`absolute bottom-2 left-2 z-10 px-2 py-0.5 rounded-sm bg-brand-gold text-slate-950 text-[10px] font-black tracking-wider uppercase shadow-md ${
                    sitedHouse.isMirrored ? "scaleX(-1)" : ""
                  }`}
                >
                  {sitedHouse.designName} • {sitedHouse.totalM2}m²
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Wall-to-Boundary Dimension Callouts */}
          {/* Front Wall Setback */}
          <div
            className="absolute pointer-events-none flex flex-col items-center justify-center"
            style={{
              top: 0,
              left: `${housePosX + houseWidthPx * 0.25}px`,
              height: `${housePosY}px`,
              width: "1px",
              borderLeft: "2px dashed #f59e0b",
            }}
          >
            <div
              className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold shadow-md whitespace-nowrap ${
                compliance.isFrontCompliant ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
              }`}
            >
              Front Wall: {compliance.liveSetbacks.frontWallSetback}m
            </div>
          </div>

          {/* Garage Wall Setback */}
          <div
            className="absolute pointer-events-none flex flex-col items-center justify-center"
            style={{
              top: 0,
              left: `${housePosX + (sitedHouse.isMirrored ? houseWidthPx * 0.2 : houseWidthPx * 0.75)}px`,
              height: `${housePosY + 1.2 * pixelsPerMetre}px`,
              width: "1px",
              borderLeft: "2px dashed #f59e0b",
            }}
          >
            <div
              className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold shadow-md whitespace-nowrap ${
                compliance.isGarageCompliant ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
              }`}
            >
              Garage: {compliance.liveSetbacks.garageWallSetback}m
            </div>
          </div>

          {/* Left Wall Setback */}
          <div
            className="absolute pointer-events-none flex items-center justify-center"
            style={{
              top: `${housePosY + houseLengthPx * 0.4}px`,
              left: 0,
              width: `${housePosX}px`,
              height: "1px",
              borderTop: "2px dashed #f59e0b",
            }}
          >
            <div
              className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold shadow-md whitespace-nowrap ${
                compliance.isLeftCompliant ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
              }`}
            >
              Left: {compliance.liveSetbacks.leftWallSetback}m
            </div>
          </div>

          {/* Right Wall Setback */}
          <div
            className="absolute pointer-events-none flex items-center justify-center"
            style={{
              top: `${housePosY + houseLengthPx * 0.4}px`,
              left: `${housePosX + houseWidthPx}px`,
              width: `${lotWidthPx - housePosX - houseWidthPx}px`,
              height: "1px",
              borderTop: "2px dashed #f59e0b",
            }}
          >
            <div
              className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold shadow-md whitespace-nowrap ${
                compliance.isRightCompliant ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
              }`}
            >
              Right: {compliance.liveSetbacks.rightWallSetback}m
            </div>
          </div>

          {/* Rear Wall Setback */}
          <div
            className="absolute pointer-events-none flex flex-col items-center justify-center"
            style={{
              top: `${housePosY + houseLengthPx}px`,
              left: `${housePosX + houseWidthPx * 0.5}px`,
              height: `${lotLengthPx - housePosY - houseLengthPx}px`,
              width: "1px",
              borderLeft: "2px dashed #f59e0b",
            }}
          >
            <div
              className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold shadow-md whitespace-nowrap ${
                compliance.isRearCompliant ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
              }`}
            >
              Rear Wall: {compliance.liveSetbacks.rearWallSetback}m
            </div>
          </div>

          {/* Boundary Dimension Markers */}
          {/* Top (Street Frontage) */}
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-xs font-mono font-bold text-amber-500 whitespace-nowrap">
            <span>STREET FRONTAGE: {parcel.frontageM}m (90°00'00")</span>
          </div>

          {/* Bottom (Rear Boundary) */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-xs font-mono font-bold text-slate-400 whitespace-nowrap">
            <span>REAR BOUNDARY: {parcel.rearWidthM || parcel.frontageM}m (270°00'00")</span>
          </div>

          {/* Left Boundary */}
          <div className="absolute top-1/2 -left-12 -translate-y-1/2 -rotate-90 text-xs font-mono font-bold text-slate-400 whitespace-nowrap">
            <span>LEFT BOUNDARY: {parcel.depthM}m</span>
          </div>

          {/* Right Boundary */}
          <div className="absolute top-1/2 -right-12 -translate-y-1/2 rotate-90 text-xs font-mono font-bold text-slate-400 whitespace-nowrap">
            <span>RIGHT BOUNDARY: {parcel.depthM}m</span>
          </div>
        </div>
      </div>

      {/* Floating HUD Overlays */}
      {/* Top Left: Lot Info Pill */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-1 pointer-events-auto">
        <div className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-200 text-xs font-medium shadow-lg backdrop-blur-md flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-amber-400">{parcel.standardLotPlan}</span>
          <span className="text-slate-500">&bull;</span>
          <span>{parcel.areaM2}m²</span>
          <span className="text-slate-500">&bull;</span>
          <span>{parcel.council}</span>
        </div>
        {parcel.statutoryLandValuation && (
          <div className="px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono flex items-center gap-1.5 shadow-md">
            <span>Valuer-General Land Value:</span>
            <span className="font-bold">${parcel.statutoryLandValuation.toLocaleString()} AUD</span>
            <span className="text-[10px] text-emerald-400">({parcel.valuationYear})</span>
          </div>
        )}
      </div>

      {/* Top Right: True North & Solar Ray Dial */}
      <div className="absolute top-4 right-4 z-20 pointer-events-auto flex items-center gap-2">
        <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-200 shadow-xl backdrop-blur-md flex flex-col items-center justify-center">
          <div className="relative w-10 h-10 flex items-center justify-center">
            <Compass className="h-9 w-9 text-brand-gold animate-spin-slow" />
            <span className="absolute -top-1 text-[9px] font-black text-amber-400">N</span>
          </div>
          <span className="text-[9px] font-mono text-slate-400 mt-1">True North</span>
        </div>

        {showSolar && (
          <div className="p-2.5 rounded-2xl bg-amber-950/60 border border-amber-500/40 text-amber-200 shadow-xl backdrop-blur-md flex flex-col items-center justify-center max-w-[140px] text-center">
            <Sun className="h-5 w-5 text-amber-400 animate-pulse" />
            <span className="text-[10px] font-bold text-amber-300 mt-0.5">Winter Sun 42°</span>
            <span className="text-[8px] text-amber-400/80 leading-tight">North-East Morning Solar Ingress</span>
          </div>
        )}
      </div>

      {/* Bottom Floating Canvas Toolbar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-200 shadow-2xl backdrop-blur-md">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setZoom((prev) => Math.min(2.5, prev + 0.15))}
          className="h-8 px-2.5 text-xs gap-1 hover:text-amber-400 hover:bg-slate-800"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setZoom((prev) => Math.max(0.4, prev - 0.15))}
          className="h-8 px-2.5 text-xs gap-1 hover:text-amber-400 hover:bg-slate-800"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleResetView}
          className="h-8 px-2.5 text-xs gap-1 hover:text-amber-400 hover:bg-slate-800"
          title="Reset View"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>

        <div className="h-4 w-[1px] bg-slate-700 mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={handleRotate90}
          className="h-8 px-2.5 text-xs gap-1 hover:text-amber-400 hover:bg-slate-800"
          title="Rotate 90°"
        >
          <RotateCw className="h-4 w-4" />
          <span>Rotate 90°</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleFlipGarage}
          className={`h-8 px-2.5 text-xs gap-1 hover:bg-slate-800 ${
            sitedHouse.isMirrored ? "text-amber-400 bg-amber-500/10 font-bold" : "hover:text-amber-400"
          }`}
          title="Mirror / Flip Garage LH or RH"
        >
          <FlipHorizontal className="h-4 w-4" />
          <span>Flip LH/RH</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleSnapBtb}
          className={`h-8 px-2.5 text-xs gap-1 hover:bg-slate-800 ${
            sitedHouse.isBtb ? "text-emerald-400 bg-emerald-500/15 font-bold" : "hover:text-amber-400"
          }`}
          title="Snap to Built-to-Boundary (200mm)"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>{sitedHouse.isBtb ? "BTB Active (0.2m)" : "Snap BTB"}</span>
        </Button>

        <div className="h-4 w-[1px] bg-slate-700 mx-1" />

        {/* Current Drawing Scale Indicator */}
        <div className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[10px] font-mono font-bold text-amber-400">
          Scale {scale} @ A3
        </div>
      </div>
    </div>
  );
}
