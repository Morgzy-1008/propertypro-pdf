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
import { getSubdivisionParcels, type DisplayHomeLocation } from "@/lib/site-studio/cadastreBoundaryService";
import { SiteStudioHdFloorplan } from "./SiteStudioHdFloorplan";
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
  MousePointerClick,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SiteStudioCanvasProps {
  parcel: CadastreParcel;
  setParcel: React.Dispatch<React.SetStateAction<CadastreParcel>>;
  sitedHouse: SitedHouse | null;
  setSitedHouse: React.Dispatch<React.SetStateAction<SitedHouse | null>>;
  rules: SetbackRules;
  compliance: ComplianceReport | null;
  basemapMode: BasemapMode;
  scale: DrawingScale;
  isLight: boolean;
  showContours: boolean;
  showSolar: boolean;
  displayHomeLocation?: DisplayHomeLocation;
}

export function SiteStudioCanvas({
  parcel,
  setParcel,
  sitedHouse,
  setSitedHouse,
  rules,
  compliance,
  basemapMode,
  scale,
  isLight,
  showContours,
  showSolar,
  displayHomeLocation,
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
  const basePixelsPerMetre = scale === "1:100" ? 40 : 22;
  const pixelsPerMetre = basePixelsPerMetre * zoom;

  const lotWidthPx = lotW * pixelsPerMetre;
  const lotLengthPx = lotL * pixelsPerMetre;

  // Surrounding street lots for Archistar-style neighborhood browsing
  const streetParcels = useMemo(() => {
    return getSubdivisionParcels(parcel);
  }, [parcel]);

  // Active Hudson design geometry
  const currentPreset = useMemo(() => {
    if (!sitedHouse) return null;
    return HUDSON_DESIGNS_CATALOG.find((d) => d.id === sitedHouse.designId) || HUDSON_DESIGNS_CATALOG[0];
  }, [sitedHouse?.designId]);

  const houseWidthPx = (sitedHouse?.widthM || 10.55) * pixelsPerMetre;
  const houseLengthPx = (sitedHouse?.lengthM || 20.15) * pixelsPerMetre;

  const housePosX = (sitedHouse?.posX || 1.25) * pixelsPerMetre;
  const housePosY = (sitedHouse?.posY || 4.5) * pixelsPerMetre;

  // 450mm Eaves offset in pixels
  const eavePx = (rules.eaveWidthM || 0.45) * pixelsPerMetre;

  // Reset View to center
  const handleResetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Mouse Wheel Zooming (Archistar smooth zoom)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom((prev) => Math.min(2.8, Math.max(0.35, prev + zoomDelta)));
  };

  // Mouse drag handlers for House Siting & Viewport Panning
  const handleMouseDownHouse = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!sitedHouse) return;
    setIsDraggingHouse(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initialX: sitedHouse.posX,
      initialY: sitedHouse.posY,
    };
  };

  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    setIsPanning(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initialX: pan.x,
      initialY: pan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragStartRef.current) return;

    if (isDraggingHouse && sitedHouse) {
      const deltaX = (e.clientX - dragStartRef.current.clientX) / pixelsPerMetre;
      const deltaY = (e.clientY - dragStartRef.current.clientY) / pixelsPerMetre;

      const newPosX = Math.max(0.1, Math.min(lotW - sitedHouse.widthM - 0.1, dragStartRef.current.initialX + deltaX));
      const newPosY = Math.max(0.1, Math.min(lotL - sitedHouse.lengthM - 0.1, dragStartRef.current.initialY + deltaY));

      setSitedHouse((prev) => (prev ? {
        ...prev,
        posX: Math.round(newPosX * 100) / 100,
        posY: Math.round(newPosY * 100) / 100,
      } : null));
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

  // Select a neighboring parcel clicked on the satellite map
  const handleSelectParcel = (p: CadastreParcel, e: React.MouseEvent) => {
    e.stopPropagation();
    setParcel(p);

    if (sitedHouse) {
      const centeredX = Math.max(0.2, Math.round(((p.frontageM - sitedHouse.widthM) / 2) * 100) / 100);
      setSitedHouse((prev) => prev ? {
        ...prev,
        posX: centeredX,
        posY: Math.max(3.0, rules.frontSetback),
      } : null);
    }
  };

  // Built to Boundary (BTB) Quick Snap
  const handleSnapBtb = () => {
    if (!sitedHouse) return;
    const isCurrentlyBtb = sitedHouse.isBtb;
    if (!isCurrentlyBtb) {
      const btbPosX = Math.round((lotW - sitedHouse.widthM - 0.20) * 100) / 100;
      setSitedHouse((prev) => prev ? {
        ...prev,
        isBtb: true,
        btbSide: "right",
        posX: btbPosX,
      } : null);
    } else {
      const centeredX = Math.round(((lotW - sitedHouse.widthM) / 2) * 100) / 100;
      setSitedHouse((prev) => prev ? {
        ...prev,
        isBtb: false,
        btbSide: "none",
        posX: centeredX,
      } : null);
    }
  };

  // Flip Garage (Mirror LH / RH)
  const handleFlipGarage = () => {
    setSitedHouse((prev) => prev ? {
      ...prev,
      isMirrored: !prev.isMirrored,
    } : null);
  };

  // Rotate 90 degrees
  const handleRotate90 = () => {
    setSitedHouse((prev) => prev ? {
      ...prev,
      rotationDeg: (prev.rotationDeg + 90) % 360,
    } : null);
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDownCanvas}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`relative w-full h-full min-h-[640px] flex items-center justify-center overflow-hidden select-none cursor-grab active:cursor-grabbing ${
        isLight ? "bg-slate-100" : "bg-[#090D14]"
      }`}
    >
      {/* 1. Archistar High-Resolution Satellite Basemap */}
      {basemapMode === "satellite-hybrid" && (
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-50 transition-opacity duration-300"
          style={{
            backgroundImage: `url('https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${parcel.longitude},${parcel.latitude},18.2,0/1600x1000?access_token=pk.eyJ1IjoibW9yZ2FuLWhhbGVzIiwiYSI6ImNsc3g0YmcyYTA4OXMya3BjaWdxYnVjYXAifQ.sample')`,
            backgroundBlendMode: "luminosity",
          }}
        />
      )}

      {basemapMode === "esri-aerial" && (
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-60"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(16,185,129,0.12) 0%, rgba(11,15,23,0.95) 100%)`,
          }}
        />
      )}

      {/* Blueprint Grid Lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: isLight
            ? "linear-gradient(to right, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.04) 1px, transparent 1px)"
            : "linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* 2. Interactive Subdivision Parcel Street Grid */}
      <div
        className="relative transition-transform duration-75 origin-center flex items-center justify-center"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px)`,
        }}
      >
        {/* Contiguous Street Lots Container */}
        <div className="flex items-center gap-2">
          {streetParcels.map((p, idx) => {
            const isTargetLot = p.lotNumber === parcel.lotNumber;
            const pWidthPx = p.frontageM * pixelsPerMetre;
            const pLengthPx = p.depthM * pixelsPerMetre;

            return (
              <div
                key={idx}
                data-testid={`street-lot-${p.lotNumber}`}
                data-lot-number={p.lotNumber}
                onClick={(e) => handleSelectParcel(p, e)}
                className={`relative rounded-sm transition-all cursor-pointer ${
                  isTargetLot
                    ? "z-10 shadow-2xl border-2"
                    : "opacity-40 hover:opacity-85 border border-dashed hover:border-amber-400 bg-slate-900/60 hover:bg-slate-900/90"
                }`}
                style={{
                  width: `${pWidthPx}px`,
                  height: `${pLengthPx}px`,
                  borderColor: isTargetLot ? "#f59e0b" : "rgba(148, 163, 184, 0.4)",
                  backgroundColor: isTargetLot
                    ? isLight
                      ? "rgba(255, 255, 255, 0.95)"
                      : "rgba(15, 23, 42, 0.96)"
                    : undefined,
                  boxShadow: isTargetLot ? "0 25px 50px -12px rgba(0, 0, 0, 0.7)" : undefined,
                }}
              >
                {/* Neighboring Lot Label */}
                {!isTargetLot && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-1 text-center select-none">
                    <span className="text-[11px] font-mono font-bold text-amber-400">
                      Lot {p.lotNumber}
                    </span>
                    <span className="text-[9px] text-slate-400">{p.areaM2}m²</span>
                    <span className="text-[8px] text-slate-500 mt-1">{p.frontageM}m Front</span>
                    <div className="mt-2 px-1.5 py-0.5 rounded-sm bg-slate-800 text-[8px] text-slate-300 font-semibold flex items-center gap-1">
                      <MousePointerClick className="h-2.5 w-2.5 text-amber-400" />
                      <span>Click to Site</span>
                    </div>
                  </div>
                )}

                {/* TARGET LOT ACTIVE CONTENT */}
                {isTargetLot && (
                  <>
                    {/* Natural Elevation Contours */}
                    {showContours && (
                      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
                        <path
                          d={`M 0 ${pLengthPx * 0.25} Q ${pWidthPx * 0.5} ${pLengthPx * 0.28} ${pWidthPx} ${pLengthPx * 0.25}`}
                          fill="none"
                          stroke="#06b6d4"
                          strokeWidth="1.5"
                          strokeDasharray="4 2"
                        />
                        <text x={pWidthPx * 0.05} y={pLengthPx * 0.24} fill="#06b6d4" fontSize="9" fontWeight="bold">
                          RL 48.0m (Natural Ground)
                        </text>
                        <path
                          d={`M 0 ${pLengthPx * 0.55} Q ${pWidthPx * 0.5} ${pLengthPx * 0.58} ${pWidthPx} ${pLengthPx * 0.55}`}
                          fill="none"
                          stroke="#06b6d4"
                          strokeWidth="1.5"
                          strokeDasharray="4 2"
                        />
                        <text x={pWidthPx * 0.05} y={pLengthPx * 0.54} fill="#06b6d4" fontSize="9" fontWeight="bold">
                          RL 47.4m (-0.6m Fall)
                        </text>
                        <path
                          d={`M 0 ${pLengthPx * 0.85} Q ${pWidthPx * 0.5} ${pLengthPx * 0.88} ${pWidthPx} ${pLengthPx * 0.85}`}
                          fill="none"
                          stroke="#06b6d4"
                          strokeWidth="1.5"
                          strokeDasharray="4 2"
                        />
                        <text x={pWidthPx * 0.05} y={pLengthPx * 0.84} fill="#06b6d4" fontSize="9" fontWeight="bold">
                          RL 46.8m (Rear Drainage)
                        </text>
                      </svg>
                    )}

                    {/* Statutory Building Envelope */}
                    <div
                      className="absolute border border-dashed rounded-xs pointer-events-none transition-all duration-200"
                      style={{
                        top: `${rules.frontSetback * pixelsPerMetre}px`,
                        bottom: `${rules.rearSetback * pixelsPerMetre}px`,
                        left: `${(sitedHouse?.isBtb && sitedHouse.btbSide === "left" ? rules.btbSideSetback : rules.leftSetback) * pixelsPerMetre}px`,
                        right: `${(sitedHouse?.isBtb && sitedHouse.btbSide === "right" ? rules.btbSideSetback : rules.rightSetback) * pixelsPerMetre}px`,
                        borderColor: "rgba(16, 185, 129, 0.7)",
                        backgroundColor: isLight ? "rgba(16, 185, 129, 0.04)" : "rgba(16, 185, 129, 0.06)",
                      }}
                    >
                      <span className="absolute top-1 right-2 text-[9px] font-mono font-bold text-emerald-500 uppercase tracking-wider">
                        Allowable Building Envelope (QDC {rules.lotCategory === "small-lot" ? "MP 1.1" : "MP 1.2"})
                      </span>
                    </div>

                    {/* Proposed Concrete Driveway Crossover */}
                    {sitedHouse && (
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
                          Driveway Crossover
                        </span>
                      </div>
                    )}

                    {/* SITED HOUSE FOOTPRINT (ULTRA-HIGH-DEFINITION ARCHITECTURAL CAD) */}
                    {sitedHouse && currentPreset ? (
                      <div
                        onMouseDown={handleMouseDownHouse}
                        className={`absolute cursor-move transition-shadow duration-150 rounded-xs select-none shadow-2xl ${
                          compliance?.allCompliant
                            ? "shadow-amber-500/20"
                            : "shadow-red-500/30 animate-pulse"
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

                        {/* High-Definition Architectural Floorplan Drawing */}
                        {sitedHouse.source === "custom-upload" && sitedHouse.customPlanUrl ? (
                          <img
                            src={sitedHouse.customPlanUrl}
                            alt="Custom Sited Plan"
                            className="w-full h-full object-contain pointer-events-none opacity-95"
                          />
                        ) : (
                          <SiteStudioHdFloorplan
                            design={currentPreset}
                            sitedHouse={sitedHouse}
                            widthPx={houseWidthPx}
                            lengthPx={houseLengthPx}
                            isCompliant={compliance?.allCompliant ?? true}
                          />
                        )}

                        {/* House Design Label Badge */}
                        <div
                          className={`absolute bottom-2 left-2 z-10 px-2.5 py-1 rounded-sm bg-brand-gold text-slate-950 text-[10px] font-black tracking-wider uppercase shadow-lg ${
                            sitedHouse.isMirrored ? "scaleX(-1)" : ""
                          }`}
                        >
                          {sitedHouse.designName} • {sitedHouse.totalM2}m²
                        </div>
                      </div>
                    ) : (
                      /* No House Placed: Welcoming Prompt */
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6 text-center">
                        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 max-w-xs shadow-2xl backdrop-blur-md">
                          <span className="text-xs font-bold text-amber-400 block mb-1">
                            {parcel.standardLotPlan} Ready
                          </span>
                          <p className="text-[11px] text-slate-300">
                            Select any Hudson Homes design from the left catalog to site onto this lot at 1:200 scale.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Dynamic Wall-to-Boundary Dimension Callouts */}
                    {sitedHouse && compliance && (
                      <>
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
                            width: `${pWidthPx - housePosX - houseWidthPx}px`,
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
                            height: `${pLengthPx - housePosY - houseLengthPx}px`,
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
                      </>
                    )}

                    {/* Boundary Dimensions */}
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-xs font-mono font-bold text-amber-500 whitespace-nowrap">
                      <span>STREET FRONTAGE: {p.frontageM}m (90°00'00")</span>
                    </div>
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-xs font-mono font-bold text-slate-400 whitespace-nowrap">
                      <span>REAR BOUNDARY: {p.rearWidthM || p.frontageM}m (270°00'00")</span>
                    </div>
                    <div className="absolute top-1/2 -left-12 -translate-y-1/2 -rotate-90 text-xs font-mono font-bold text-slate-400 whitespace-nowrap">
                      <span>LEFT: {p.depthM}m</span>
                    </div>
                    <div className="absolute top-1/2 -right-12 -translate-y-1/2 rotate-90 text-xs font-mono font-bold text-slate-400 whitespace-nowrap">
                      <span>RIGHT: {p.depthM}m</span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating HUD Overlays */}
      {/* Top Left: Active Display Village / Lot Info Pill */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 pointer-events-auto">
        {displayHomeLocation && (
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-brand-gold/30 text-slate-200 text-xs font-medium shadow-lg backdrop-blur-md flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-brand-gold animate-pulse" />
            <span className="font-bold text-brand-gold">{displayHomeLocation.name}</span>
            <span className="text-slate-500">&bull;</span>
            <span className="text-slate-300">{displayHomeLocation.suburb}</span>
          </div>
        )}

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

      {/* Top Right: True North & Winter Solar Ray Dial */}
      <div className="absolute top-4 right-4 z-20 pointer-events-auto flex items-center gap-2">
        <div className="p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-200 shadow-xl backdrop-blur-md flex flex-col items-center justify-center">
          <div className="relative w-10 h-10 flex items-center justify-center">
            <Compass className="h-9 w-9 text-brand-gold" />
            <span className="absolute -top-1 text-[9px] font-black text-amber-400">N</span>
          </div>
          <span className="text-[9px] font-mono text-slate-400 mt-1">True North</span>
        </div>

        {showSolar && (
          <div className="p-2.5 rounded-2xl bg-amber-950/60 border border-amber-500/40 text-amber-200 shadow-xl backdrop-blur-md flex flex-col items-center justify-center max-w-[140px] text-center">
            <Sun className="h-5 w-5 text-amber-400 animate-pulse" />
            <span className="text-[10px] font-bold text-amber-300 mt-0.5">Winter Sun 42°</span>
            <span className="text-[8px] text-amber-400/80 leading-tight">Morning Solar Access</span>
          </div>
        )}
      </div>

      {/* Bottom Floating Canvas Toolbar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-slate-200 shadow-2xl backdrop-blur-md">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setZoom((prev) => Math.min(2.8, prev + 0.15))}
          className="h-8 px-2.5 text-xs gap-1 hover:text-amber-400 hover:bg-slate-800"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setZoom((prev) => Math.max(0.35, prev - 0.15))}
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

        {sitedHouse && (
          <>
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
          </>
        )}

        {/* Current Drawing Scale Indicator */}
        <div className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[10px] font-mono font-bold text-amber-400">
          Scale {scale} @ A3
        </div>
      </div>
    </div>
  );
}
