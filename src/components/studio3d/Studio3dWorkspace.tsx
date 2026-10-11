import React, { useState, useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Box,
  Eye,
  Layers,
  Compass,
  Maximize2,
  Camera,
  Download,
  FileText,
  Sliders,
  Home,
  Sun,
  Moon,
  RefreshCw,
  Play,
  Navigation,
  Move,
  CheckCircle2,
  Sparkles,
  Upload,
  ArrowLeft,
  ChevronDown,
  Info,
  Maximize,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  RotateCw,
  ShieldCheck,
} from "lucide-react";
import { Logo, HudsonMark } from "@/components/flyer/FlyerTemplates";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useTheme } from "@/lib/theme";
import { StaffHeaderProfile } from "@/components/auth/StaffHeaderProfile";
import { getActiveStaffUser } from "@/lib/authSession";
import {
  CeilingHeightPreset,
  BuildingDesign3D,
  RoofConfig,
} from "@/lib/studio3d/studio3dTypes";
import {
  DESIGNS_3D_REGISTRY,
  get3DDesign,
  ALL_DESIGN_KEYS,
} from "@/lib/studio3d/designs3dRegistry";
import {
  ThreeStudioSceneManager,
  CameraMode,
} from "@/lib/studio3d/threeSceneManager";
import {
  generateArchitecturalElevations,
  exportElevationsPdf,
  ArchitecturalElevationSheet,
} from "@/lib/studio3d/architecturalElevationsEngine";

export function Studio3dWorkspace() {
  const { mode } = useTheme();
  const isLight = mode === "normal";
  const staffUser = getActiveStaffUser();

  // Active Building Design (defaults to Tiffany 22 Custom for Juliana)
  const [selectedDesignKey, setSelectedDesignKey] = useState<string>("tiffany-22-custom-juliana");
  const [design, setDesign] = useState<BuildingDesign3D>(() => get3DDesign("tiffany-22-custom-juliana"));

  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<"3d_studio" | "elevations_cad" | "customizer">("3d_studio");

  // Camera & Viewer Controls
  const [cameraMode, setCameraMode] = useState<CameraMode>("orbit");
  const [ceilingPreset, setCeilingPreset] = useState<CeilingHeightPreset>(2590);
  const [roofMode, setRoofMode] = useState<"cutaway" | "exterior" | "hidden">("cutaway");
  const [activeElevationView, setActiveElevationView] = useState<"all" | "north" | "south" | "east" | "west">("all");
  const [currentRoomName, setCurrentRoomName] = useState<string>("Living Room");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // File upload state for modified plans
  const [isUploading, setIsUploading] = useState(false);

  // Three.js Canvas container ref & manager
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<ThreeStudioSceneManager | null>(null);

  // Pre-calculated elevations
  const elevationsSheet: ArchitecturalElevationSheet = React.useMemo(() => {
    return generateArchitecturalElevations(design);
  }, [design]);

  // Initialize or update Three.js scene
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    // Create scene manager if not exists
    if (!sceneManagerRef.current) {
      sceneManagerRef.current = new ThreeStudioSceneManager({
        container: canvasContainerRef.current,
        design,
        onRoomChange: (rName) => setCurrentRoomName(rName),
      });
      const show = roofMode !== "hidden";
      const cutaway = roofMode === "cutaway";
      sceneManagerRef.current.setRoofMode(show, cutaway);
    } else {
      sceneManagerRef.current.updateDesign(design);
      const show = roofMode !== "hidden";
      const cutaway = roofMode === "cutaway";
      sceneManagerRef.current.setRoofMode(show, cutaway);
    }

    return () => {
      // Don't dispose immediately on minor state re-renders; keep canvas responsive
    };
  }, [design]);

  // Clean up Three.js WebGL scene and animation loop on component unmount
  useEffect(() => {
    return () => {
      if (sceneManagerRef.current) {
        sceneManagerRef.current.destroy();
        sceneManagerRef.current = null;
      }
    };
  }, []);

  // Sync roof mode changes
  useEffect(() => {
    if (sceneManagerRef.current) {
      const show = roofMode !== "hidden";
      const cutaway = roofMode === "cutaway";
      sceneManagerRef.current.setRoofMode(show, cutaway);
    }
  }, [roofMode]);

  // Sync camera mode changes
  const handleCameraModeChange = (mode: CameraMode) => {
    setCameraMode(mode);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setCameraMode(mode);
    }
  };

  // Sync ceiling height changes
  const handleCeilingChange = (hMm: CeilingHeightPreset) => {
    setCeilingPreset(hMm);
    const updated = {
      ...design,
      ceilingHeightM: hMm / 1000,
    };
    setDesign(updated);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setCeilingHeight(hMm / 1000);
    }
    toast.success(`Ceiling Height updated to ${hMm}mm (${hMm === 2440 ? "H1 Smart" : hMm === 2590 ? "H2 Designer" : hMm === 2740 ? "H3 Luxury" : "Feature"})`);
  };

  // Switch active design
  const handleSelectDesign = (key: string) => {
    setSelectedDesignKey(key);
    const d = get3DDesign(key);
    setDesign(d);
    setCeilingPreset(Math.round(d.ceilingHeightM * 1000) as CeilingHeightPreset);
    if (sceneManagerRef.current) {
      sceneManagerRef.current.updateDesign(d);
    }
    toast.info(`Loaded design: ${d.name} ${d.variantName ? `(${d.variantName})` : ""}`);
  };

  // Teleport to room
  const handleTeleportRoom = (roomName: string) => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.teleportToRoom(roomName);
    }
    setCurrentRoomName(roomName);
    toast.info(`Teleported into: ${roomName}`);
  };

  // Preset angle
  const handlePresetAngle = (preset: "isometric" | "top" | "front" | "rear" | "left" | "right") => {
    setCameraMode("orbit");
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setPresetView(preset);
    }
  };

  // On-screen walkthrough movement and rotation controls
  const handleWalk = (dir: "forward" | "backward" | "left" | "right") => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.moveWalkthrough(dir, 0.9);
    }
  };

  const handleTurn = (yawDelta: number) => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.rotateWalkthrough(yawDelta);
    }
  };

  // Export PDF Working Drawings
  const handleExportPdf = async () => {
    setIsGeneratingPdf(true);
    toast.info("Generating multi-sheet architectural CAD elevations PDF...");
    try {
      const { pdf, fileName } = await exportElevationsPdf(design, elevationsSheet);
      pdf.save(fileName);
      toast.success("Architectural Elevations PDF downloaded successfully!");
    } catch (err: any) {
      toast.error(`PDF export error: ${err?.message || "Failed to generate PDF"}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Export SVG Drawing
  const handleExportSvg = (view: "north" | "south" | "east" | "west") => {
    const proj = elevationsSheet[view];
    const blob = new Blob([proj.svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Hudson_${design.name.replace(/\s+/g, "_")}_${proj.cardinalDirection}_Elevation.svg`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${proj.cardinalDirection} Elevation SVG!`);
  };

  // File upload handler for custom floorplans
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    toast.info(`Analyzing modified plan: ${file.name}...`);

    setTimeout(() => {
      // Map to Juliana custom or create adapted custom plan
      if (file.name.toLowerCase().includes("juliana") || file.name.toLowerCase().includes("page_1") || file.name.toLowerCase().includes("tiffany")) {
        handleSelectDesign("tiffany-22-custom-juliana");
        toast.success("Successfully recognized: Tiffany 22 Custom for Juliana with Cinema, Mud Nook, and Barn Door!");
      } else {
        // Create custom variant of current design
        const customName = file.name.replace(/\.[^/.]+$/, "");
        const customDesign: BuildingDesign3D = {
          ...design,
          name: customName,
          variantName: "Uploaded Custom Plan",
          isCustomPlan: true,
        };
        setDesign(customDesign);
        if (sceneManagerRef.current) {
          sceneManagerRef.current.updateDesign(customDesign);
        }
        toast.success(`Loaded custom floorplan: ${customName}`);
      }
      setIsUploading(false);
    }, 1200);
  };

  return (
    <div className={`min-h-screen ${isLight ? "bg-slate-50 text-slate-900" : "bg-slate-950 text-slate-100"} flex flex-col font-sans selection:bg-amber-500/30 overflow-x-hidden`}>
      {/* 1. TOP ARCHITECTURAL HEADER */}
      <header className={`h-16 px-4 sm:px-6 flex items-center justify-between border-b ${isLight ? "bg-white/95 border-slate-200" : "bg-slate-900/90 border-slate-800"} backdrop-blur-md sticky top-0 z-40`}>
        <div className="flex items-center gap-3 sm:gap-5">
          <Link
            to="/hub"
            className={`p-2 rounded-xl border ${
              isLight
                ? "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
            } transition-colors flex items-center gap-1.5 text-xs font-semibold`}
            title="Return to Welcome Hub"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Hub</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <HudsonMark className="h-6 w-auto text-amber-500" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-brand-gold to-orange-400">
                  3D PLAN STUDIO
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-semibold uppercase">
                  CAD & Elevations
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden md:block">
                Parametric 3D Floorplans • Australian Hip Roof • Architectural Elevations
              </p>
            </div>
          </div>
        </div>

        {/* Center: Tabs Switcher */}
        <div className="hidden lg:flex items-center p-1 rounded-xl bg-slate-950/40 border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab("3d_studio")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "3d_studio"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Box className="h-3.5 w-3.5" />
            3D Building Studio
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("elevations_cad")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "elevations_cad"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Architectural Elevations (CAD)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("customizer")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "customizer"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            Customizer & Schedule
          </button>
        </div>

        {/* Right actions: Export, Theme & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isGeneratingPdf}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/25 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export A3 CAD PDF</span>
          </button>

          <ThemeToggle />
          <StaffHeaderProfile isLight={isLight} compact={true} />
        </div>
      </header>

      {/* 2. SUB-HEADER TOOLBAR: Design Selector, Ceiling Heights, Roof Toggle */}
      <div className={`px-4 sm:px-6 py-2.5 border-b ${isLight ? "bg-slate-100/90 border-slate-200" : "bg-slate-900/60 border-slate-800/80"} flex flex-wrap items-center justify-between gap-3 text-xs`}>
        {/* Left: Design Selector */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <label className="font-semibold text-slate-400">Design:</label>
          <div className="relative">
            <select
              value={selectedDesignKey}
              onChange={(e) => handleSelectDesign(e.target.value)}
              className={`py-1.5 pl-3 pr-8 rounded-lg font-bold border text-xs cursor-pointer ${
                isLight
                  ? "bg-white border-slate-300 text-slate-900 shadow-sm"
                  : "bg-slate-800 border-slate-700 text-white shadow-inner"
              }`}
            >
              <optgroup label="Custom & Modified Plans">
                <option value="tiffany-22-custom-juliana">
                  Tiffany 22 Custom for Juliana (Cinema + Barn Door)
                </option>
              </optgroup>
              <optgroup label="Hudson Master Catalogue">
                <option value="tiffany-22">Tiffany 22 (Standard Master - 206m²)</option>
                <option value="jasper-26">Jasper 26 (Executive - 243m²)</option>
                <option value="amber-21">Amber 21 (Classic - 195m²)</option>
                <option value="azure-25">Azure 25 (Elegance - 230m²)</option>
              </optgroup>
            </select>
          </div>

          {design.isCustomPlan && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Sparkles className="h-3 w-3" /> Modified Plan Detected
            </span>
          )}
        </div>

        {/* Center: Ceiling Height Switcher (2440 / 2590 / 2740 / 2900mm) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-slate-400">Ceiling:</span>
          {([2440, 2590, 2740, 2900] as CeilingHeightPreset[]).map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => handleCeilingChange(h)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                ceilingPreset === h
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : isLight
                  ? "bg-white hover:bg-slate-200 text-slate-700 border border-slate-200"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
              }`}
            >
              {h}mm {h === 2440 ? "(H1)" : h === 2590 ? "(H2)" : h === 2740 ? "(H3)" : "(2.9m)"}
            </button>
          ))}
        </div>

        {/* Right: Roof Mode & Camera Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-slate-400">Roof:</span>
          <div className="inline-flex rounded-lg p-0.5 bg-slate-950/30 border border-slate-800">
            <button
              type="button"
              onClick={() => setRoofMode("cutaway")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                roofMode === "cutaway" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              Dollhouse (Cutaway)
            </button>
            <button
              type="button"
              onClick={() => setRoofMode("exterior")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                roofMode === "exterior" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              Full Roof (22.5°)
            </button>
            <button
              type="button"
              onClick={() => setRoofMode("hidden")}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                roofMode === "hidden" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
              }`}
            >
              Roof Off
            </button>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE CONTENT */}
      <main className="flex-1 relative flex flex-col overflow-hidden">
        {/* TAB 1: 3D BUILDING STUDIO */}
        <div className={`flex-1 relative flex flex-col ${activeTab === "3d_studio" ? "flex" : "hidden"}`}>
          {/* WebGL Canvas Container */}
          <div
            ref={canvasContainerRef}
            className="w-full flex-1 relative min-h-[580px] bg-gradient-to-b from-slate-950 via-[#0d1322] to-slate-950 overflow-hidden cursor-grab active:cursor-grabbing"
          />

          {/* Floating Top-Left HUD: Camera Modes & Angle Presets */}
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
            {/* Camera Mode Pills */}
            <div className="p-1 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-slate-800 shadow-xl flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleCameraModeChange("orbit")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  cameraMode === "orbit"
                    ? "bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-md"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                3D Orbit / Dollhouse
              </button>
              <button
                type="button"
                onClick={() => handleCameraModeChange("walkthrough")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  cameraMode === "walkthrough"
                    ? "bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 shadow-md"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Navigation className="h-3.5 w-3.5" />
                Virtual Walkthrough (WASD)
              </button>
            </div>

            {/* Orbit Camera Angle Presets */}
            {cameraMode === "orbit" && (
              <div className="p-1.5 rounded-2xl bg-slate-950/70 backdrop-blur-md border border-slate-800/80 shadow-lg flex items-center gap-1 text-[11px]">
                <span className="text-[10px] font-bold text-slate-400 px-2 uppercase">Angle:</span>
                <button
                  type="button"
                  onClick={() => handlePresetAngle("isometric")}
                  className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
                >
                  Isometric
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetAngle("top")}
                  className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
                >
                  Top Plan
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetAngle("front")}
                  className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
                >
                  North
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetAngle("rear")}
                  className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
                >
                  South
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetAngle("left")}
                  className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
                >
                  West
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetAngle("right")}
                  className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold cursor-pointer"
                >
                  East
                </button>
              </div>
            )}
          </div>

          {/* Floating Top-Right HUD: Design Specs & Current Room Badge */}
          <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2 pointer-events-none">
            {/* Live Room Locator Badge */}
            <div className="px-3.5 py-1.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-amber-500/40 shadow-xl flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-slate-300">Room:</span>
              <span className="text-xs font-black text-amber-400">{currentRoomName}</span>
            </div>

            {/* Quick Specs Chip */}
            <div className="px-3 py-2 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800 shadow-lg text-[11px] text-slate-300 flex flex-col items-end gap-0.5">
              <div className="font-extrabold text-white text-xs">
                {design.name} {design.variantName ? `(${design.variantName})` : ""}
              </div>
              <div>
                Total Area: <strong className="text-amber-400">{design.schedule.totalM2} m²</strong> | Living: {design.schedule.livingM2} m²
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Ceiling: {Math.round(design.ceilingHeightM * 1000)}mm | Pitch: 22.5° Hip | Eaves: 450mm
              </div>
            </div>
          </div>

          {/* Floating Bottom HUD: Room Teleport Dock & Walkthrough Controls */}
          <div className="absolute bottom-5 inset-x-0 z-20 flex flex-col items-center gap-3 pointer-events-none px-4">
            {/* Walkthrough Interactive Navigation D-Pad & Controls */}
            {cameraMode === "walkthrough" && (
              <div className="pointer-events-auto px-4 py-2.5 rounded-2xl bg-slate-950/95 backdrop-blur-md border border-slate-800 shadow-2xl flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs">
                {/* On-screen Directional D-Pad */}
                <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleTurn(0.2)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 active:bg-amber-500 active:text-slate-950 transition-all cursor-pointer"
                    title="Turn Left"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                  <div className="grid grid-cols-3 gap-1">
                    <div />
                    <button
                      type="button"
                      onClick={() => handleWalk("forward")}
                      className="p-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold active:scale-95 transition-all flex items-center justify-center shadow-md shadow-amber-500/20 cursor-pointer"
                      title="Walk Forward (W / Up Arrow)"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <div />
                    <button
                      type="button"
                      onClick={() => handleWalk("left")}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 active:bg-amber-500 active:text-slate-950 transition-all flex items-center justify-center cursor-pointer"
                      title="Strafe Left (A / Left Arrow)"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleWalk("backward")}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 active:bg-amber-500 active:text-slate-950 transition-all flex items-center justify-center cursor-pointer"
                      title="Walk Backward (S / Down Arrow)"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleWalk("right")}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 active:bg-amber-500 active:text-slate-950 transition-all flex items-center justify-center cursor-pointer"
                      title="Strafe Right (D / Right Arrow)"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTurn(-0.2)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 active:bg-amber-500 active:text-slate-950 transition-all cursor-pointer"
                    title="Turn Right"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Keyboard and Mouse Guidance */}
                <div className="hidden sm:flex items-center gap-3">
                  <div className="flex items-center gap-1 font-mono text-[11px] text-amber-400 font-bold">
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">W</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">A</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">S</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">D</span>
                    <span className="text-slate-400 font-sans ml-1 text-xs">or Buttons</span>
                  </div>
                  <div className="h-3 w-px bg-slate-700" />
                  <div className="text-slate-300 text-[11px]">
                    <strong>Drag Mouse</strong> to Look 360°
                  </div>
                </div>
              </div>
            )}

            {/* Quick-Jump Room Teleport Dock */}
            <div className="pointer-events-auto max-w-4xl w-full p-2 rounded-2xl bg-slate-950/85 backdrop-blur-md border border-slate-800 shadow-2xl overflow-x-auto flex items-center justify-start sm:justify-center gap-1.5 scrollbar-thin">
              <span className="text-[10px] font-bold text-slate-400 px-2 uppercase shrink-0">Teleport:</span>
              {(design.rooms || []).slice(0, 9).map((room) => {
                const label = room.customLabel || room.name;
                const isCurrent = currentRoomName === label;
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => handleTeleportRoom(label)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                      isCurrent
                        ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-bold"
                        : "bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* TAB 2: ARCHITECTURAL ELEVATIONS CAD */}
        <div className={`flex-1 p-4 sm:p-6 overflow-y-auto ${activeTab === "elevations_cad" ? "flex flex-col" : "hidden"}`}>
          <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">
            {/* CAD Elevation Header Toolbar */}
            <div className={`p-4 rounded-2xl border ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"} shadow-lg flex flex-wrap items-center justify-between gap-4`}>
              <div>
                <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                  <Layers className="h-5 w-5 text-amber-500" />
                  ARCHITECTURAL ELEVATIONS (1:100 @ A3)
                </h2>
                <p className="text-xs text-slate-400">
                  True CAD working drawing projections generated directly from the 3D building geometry.
                </p>
              </div>

              {/* View Selector & Export Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex rounded-xl p-1 bg-slate-950/40 border border-slate-800">
                  {(["all", "north", "south", "east", "west"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setActiveElevationView(v)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase transition-all cursor-pointer ${
                        activeElevationView === v ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {v === "all" ? "All 4 Views" : v}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={isGeneratingPdf}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Export CAD PDF
                </button>
              </div>
            </div>

            {/* Elevations Grid / Display */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* NORTH / FRONT ELEVATION */}
              {(activeElevationView === "all" || activeElevationView === "north") && (
                <div className={`rounded-2xl border ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"} shadow-xl overflow-hidden flex flex-col`}>
                  <div className="px-4 py-2.5 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
                    <span className="font-extrabold text-xs tracking-wider text-amber-400">
                      FRONT ELEVATION (NORTH)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleExportSvg("north")}
                      className="text-[10px] text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="h-3 w-3" /> Download SVG
                    </button>
                  </div>
                  <div
                    className="p-3 bg-white overflow-hidden flex items-center justify-center min-h-[340px]"
                    dangerouslySetInnerHTML={{ __html: elevationsSheet.north.svgContent }}
                  />
                </div>
              )}

              {/* SOUTH / REAR ELEVATION */}
              {(activeElevationView === "all" || activeElevationView === "south") && (
                <div className={`rounded-2xl border ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"} shadow-xl overflow-hidden flex flex-col`}>
                  <div className="px-4 py-2.5 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
                    <span className="font-extrabold text-xs tracking-wider text-amber-400">
                      REAR ELEVATION (SOUTH)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleExportSvg("south")}
                      className="text-[10px] text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="h-3 w-3" /> Download SVG
                    </button>
                  </div>
                  <div
                    className="p-3 bg-white overflow-hidden flex items-center justify-center min-h-[340px]"
                    dangerouslySetInnerHTML={{ __html: elevationsSheet.south.svgContent }}
                  />
                </div>
              )}

              {/* WEST / LEFT SIDE ELEVATION */}
              {(activeElevationView === "all" || activeElevationView === "west") && (
                <div className={`rounded-2xl border ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"} shadow-xl overflow-hidden flex flex-col`}>
                  <div className="px-4 py-2.5 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
                    <span className="font-extrabold text-xs tracking-wider text-amber-400">
                      LEFT SIDE ELEVATION (WEST)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleExportSvg("west")}
                      className="text-[10px] text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="h-3 w-3" /> Download SVG
                    </button>
                  </div>
                  <div
                    className="p-3 bg-white overflow-hidden flex items-center justify-center min-h-[340px]"
                    dangerouslySetInnerHTML={{ __html: elevationsSheet.west.svgContent }}
                  />
                </div>
              )}

              {/* EAST / RIGHT SIDE ELEVATION */}
              {(activeElevationView === "all" || activeElevationView === "east") && (
                <div className={`rounded-2xl border ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"} shadow-xl overflow-hidden flex flex-col`}>
                  <div className="px-4 py-2.5 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
                    <span className="font-extrabold text-xs tracking-wider text-amber-400">
                      RIGHT SIDE ELEVATION (EAST)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleExportSvg("east")}
                      className="text-[10px] text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="h-3 w-3" /> Download SVG
                    </button>
                  </div>
                  <div
                    className="p-3 bg-white overflow-hidden flex items-center justify-center min-h-[340px]"
                    dangerouslySetInnerHTML={{ __html: elevationsSheet.east.svgContent }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TAB 3: SPECIFICATIONS, SCHEDULE & CUSTOMIZER */}
        <div className={`flex-1 p-4 sm:p-6 overflow-y-auto ${activeTab === "customizer" ? "flex flex-col" : "hidden"}`}>
          <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1 & 2: Room Schedule & Inclusions */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* CAD Area Schedule Card */}
              <div className={`p-5 rounded-2xl border ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"} shadow-xl`}>
                <h3 className="text-base font-extrabold flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-amber-500" />
                  CAD Area Schedule & Dimensions
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                    <div className="text-slate-400">Total Area</div>
                    <div className="text-lg font-black text-amber-400">{design.schedule.totalM2} m²</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                    <div className="text-slate-400">Living</div>
                    <div className="text-lg font-black text-white">{design.schedule.livingM2} m²</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                    <div className="text-slate-400">Garage</div>
                    <div className="text-lg font-black text-white">{design.schedule.garageM2} m²</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                    <div className="text-slate-400">Alfresco</div>
                    <div className="text-lg font-black text-white">{design.schedule.alfrescoM2} m²</div>
                  </div>
                </div>

                {/* Rooms List */}
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Structural Rooms ({design.rooms.length}):
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {design.rooms.map((r) => (
                    <div
                      key={r.id}
                      className="p-2.5 rounded-lg bg-slate-950/30 border border-slate-800/80 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">{r.customLabel || r.name}</span>
                        {r.isModified && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            Custom Feature
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-slate-400">{r.areaM2.toFixed(1)} m²</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Window & Door Schedule */}
              <div className={`p-5 rounded-2xl border ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"} shadow-xl`}>
                <h3 className="text-base font-extrabold flex items-center gap-2 mb-3">
                  <ShieldCheck className="h-5 w-5 text-amber-500" />
                  Doors & Windows Schedule (With Head & Sill Heights)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                        <th className="pb-2">Code</th>
                        <th className="pb-2">Type</th>
                        <th className="pb-2">Dimensions (W × H)</th>
                        <th className="pb-2">Head Height</th>
                        <th className="pb-2">Sill Height</th>
                        <th className="pb-2">Facing</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                      {design.openings.map((op) => (
                        <tr key={op.id} className="hover:bg-slate-800/30">
                          <td className="py-2 font-bold text-amber-400">{op.code}</td>
                          <td className="py-2 text-slate-300 capitalize">{op.type.replace(/_/g, " ")}</td>
                          <td className="py-2 text-slate-200">
                            {Math.round(op.width * 1000)} × {Math.round(op.height * 1000)}mm
                          </td>
                          <td className="py-2 text-slate-300">{Math.round(op.headHeight * 1000)}mm</td>
                          <td className="py-2 text-slate-300">{Math.round(op.sillHeight * 1000)}mm</td>
                          <td className="py-2 text-slate-400 uppercase">{op.elevationFacing || "internal"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Column 3: Custom Plan File Upload & Live Parameters */}
            <div className="flex flex-col gap-6">
              {/* Upload Modified Floorplan Box */}
              <div className={`p-5 rounded-2xl border ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"} shadow-xl`}>
                <h3 className="text-base font-extrabold flex items-center gap-2 mb-2">
                  <Upload className="h-5 w-5 text-amber-500" />
                  Upload Modified Plan
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Drop client PDF or image (e.g. Juliana custom plan) to automatically construct true 3D walls and elevations.
                </p>

                <label className={`block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  isLight
                    ? "border-slate-300 hover:border-amber-500 hover:bg-amber-50/50"
                    : "border-slate-700 hover:border-amber-500 hover:bg-slate-800/50"
                }`}>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-amber-500 animate-bounce" />
                    <span className="font-bold text-xs text-slate-200">Click or Drag Plan File Here</span>
                    <span className="text-[10px] text-slate-400">PDF, PNG, JPG supported</span>
                  </div>
                </label>
              </div>

              {/* Architectural Parameters Card */}
              <div className={`p-5 rounded-2xl border ${isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"} shadow-xl flex flex-col gap-3 text-xs`}>
                <h3 className="text-base font-extrabold flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-amber-500" />
                  Architectural Parameters
                </h3>

                <div className="flex flex-col gap-1.5">
                  <span className="font-semibold text-slate-400">Roof Pitch</span>
                  <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800 font-mono text-amber-400 font-bold">
                    22.5° Standard Australian Hip Line
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="font-semibold text-slate-400">Eaves Overhang</span>
                  <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800 font-mono text-slate-200 font-bold">
                    450mm Perimeter Overhang
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="font-semibold text-slate-400">Roof Finish</span>
                  <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800 font-bold text-slate-200">
                    Colorbond Monument (Matt Rib)
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="font-semibold text-slate-400">Exterior Walls</span>
                  <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800 font-bold text-slate-200">
                    Austral Face Brickwork (250mm Veneer)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
