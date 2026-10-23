import React, { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  Mic,
  MicOff,
  Send,
  Camera,
  Palette,
  Sliders,
  RotateCcw,
  Download,
  X,
  CheckCircle2,
  Layers,
  Wand2,
  Eye,
} from "lucide-react";
import {
  ALL_SEMANTIC_SURFACES,
  MATERIAL_PRESET_CATALOG,
  SemanticSurfaceId,
  WHOLE_HOUSE_DESIGNER_SCHEMES,
  useHouseMaterialStore,
} from "@/lib/studio3d/houseMaterialStore";
import {
  ActiveSceneContext,
  ConversationalArchitectTurn,
  QUICK_ARCHITECT_PROMPTS,
  processHouseMaterialCommand,
  startVoiceArchitectRecognition,
} from "@/lib/studio3d/conversationalMaterialAi";
import { SceneAction } from "@/lib/studio3d/studio3dTypes";
import {
  ArchitecturalLightingMood,
  FalRenderPipeline,
  LIGHTING_MOOD_DESCRIPTIONS,
  PhotorealRenderResult,
  buildPhotorealPromptFromStore,
  renderPhotorealisticHouseView,
} from "@/lib/studio3d/falPhotorealRenderer";
import { CameraMode } from "@/lib/studio3d/threeSceneManager";

interface RealismAiAndPhotorealBarProps {
  isLight: boolean;
  hasDesign: boolean;
  designName?: string;
  cameraMode: CameraMode;
  currentRoomName?: string;
  activeSceneContext?: ActiveSceneContext;
  externalDrawerOpen?: boolean;
  onOpenPanel?: () => void;
  onExecuteSceneActions?: (actions: SceneAction[]) => void;
  onCaptureViewport: () => {
    colorDataUrl: string;
    depthDataUrl: string;
    width: number;
    height: number;
    cameraMode: CameraMode;
  } | null;
}

export function RealismAiAndPhotorealBar({
  isLight,
  hasDesign,
  designName,
  cameraMode,
  currentRoomName,
  activeSceneContext,
  externalDrawerOpen,
  onOpenPanel,
  onExecuteSceneActions,
  onCaptureViewport,
}: RealismAiAndPhotorealBarProps) {
  const surfaces = useHouseMaterialStore((s) => s.surfaces);
  const selectedSurfaceId = useHouseMaterialStore((s) => s.selectedSurfaceId);
  const activeSchemeId = useHouseMaterialStore((s) => s.activeSchemeId);
  const setSelectedSurfaceId = useHouseMaterialStore((s) => s.setSelectedSurfaceId);
  const updateSurfaceMaterial = useHouseMaterialStore((s) => s.updateSurfaceMaterial);
  const applyPresetToSurface = useHouseMaterialStore((s) => s.applyPresetToSurface);
  const applyWholeHouseScheme = useHouseMaterialStore((s) => s.applyWholeHouseScheme);
  const resetAllMaterials = useHouseMaterialStore((s) => s.resetAllSurfaces);

  // Active panel: "none" | "pbr_store" | "talk_to_house" | "photoreal_render"
  const [activePanel, setActivePanel] = useState<
    "none" | "pbr_store" | "talk_to_house" | "photoreal_render"
  >("none");

  // PBR Store Inspector state
  const [surfaceGroupTab, setSurfaceGroupTab] = useState<"exterior" | "interior">(
    "exterior"
  );
  const activeSurfaceId: SemanticSurfaceId =
    selectedSurfaceId ||
    (surfaceGroupTab === "exterior" ? "exterior_wall_main" : "kitchen_benchtop");
  const activeSurfaceConfig = surfaces[activeSurfaceId];
  const activeSurfaceMeta = ALL_SEMANTIC_SURFACES.find(
    (s) => s.surfaceId === activeSurfaceId
  );

  // Auto-switch Exterior/Interior group tab when user clicks a 3D mesh in the viewport
  useEffect(() => {
    if (!selectedSurfaceId) return;
    const meta = ALL_SEMANTIC_SURFACES.find((s) => s.surfaceId === selectedSurfaceId);
    if (meta) {
      setSurfaceGroupTab(meta.zone);
    }
  }, [selectedSurfaceId]);

  // Close internal panel if an external drawer (Facade / Fitout) is opened
  useEffect(() => {
    if (externalDrawerOpen && activePanel !== "none") {
      setActivePanel("none");
    }
  }, [externalDrawerOpen]);

  // "Talk to the House" Conversational AI state
  const [chatInput, setChatInput] = useState("");
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [generateCustomAiTile, setGenerateCustomAiTile] = useState(true);
  const stopVoiceRef = useRef<(() => void) | null>(null);
  const [chatHistory, setChatHistory] = useState<ConversationalArchitectTurn[]>([
    {
      id: "welcome_turn",
      role: "assistant",
      text: "G'day! I'm your Conversational AI Architect ('Talk to the House'). Ask me by text or voice to change any of the 20 exterior or interior surfaces, or ask me to remove, move, rotate, or clean up 3D fixtures and geometry!",
      timestamp: Date.now(),
      modelUsed: "gemini-3.8-flash",
    },
  ]);

  // Structure-Locked Photorealistic AI Renderer (Fal.ai) state
  const [selectedPipeline, setSelectedPipeline] = useState<FalRenderPipeline>(
    "fal-ai/flux-control-lora-depth"
  );
  const [lightingMood, setLightingMood] =
    useState<ArchitecturalLightingMood>("golden_hour");
  const [controlStrength, setControlStrength] = useState<number>(0.88);
  const [customRenderNotes, setCustomRenderNotes] = useState<string>("");
  const [capturedPreview, setCapturedPreview] = useState<{
    colorDataUrl: string;
    depthDataUrl: string;
    width: number;
    height: number;
    cameraMode: CameraMode;
  } | null>(null);
  const [isRenderingPhotoreal, setIsRenderingPhotoreal] = useState(false);
  const [renderHistory, setRenderHistory] = useState<PhotorealRenderResult[]>([]);
  const [activeRenderResult, setActiveRenderResult] =
    useState<PhotorealRenderResult | null>(null);
  const [comparisonSliderPct, setComparisonSliderPct] = useState<number>(50);
  const [showDepthOverlay, setShowDepthOverlay] = useState<boolean>(false);

  const handleSendArchitectCommand = async (overrideText?: string) => {
    const promptText = (overrideText ?? chatInput).trim();
    if (!promptText || isAiProcessing) return;

    const userTurn: ConversationalArchitectTurn = {
      id: `user_${Date.now()}`,
      role: "user",
      text: promptText,
      timestamp: Date.now(),
    };
    setChatHistory((prev) => [...prev, userTurn]);
    if (!overrideText) setChatInput("");
    setIsAiProcessing(true);

    try {
      const assistantTurn = await processHouseMaterialCommand(promptText, {
        generateAiTextureTile: generateCustomAiTile,
        activeSceneContext,
      });
      setChatHistory((prev) => [...prev, assistantTurn]);
      if (
        assistantTurn.appliedSceneActions &&
        assistantTurn.appliedSceneActions.length > 0 &&
        onExecuteSceneActions
      ) {
        onExecuteSceneActions(assistantTurn.appliedSceneActions);
      }
      const count = assistantTurn.appliedUpdates?.length || 0;
      if (count > 0) {
        toast.success(
          `Updated ${count} architectural surface${count === 1 ? "" : "s"} on 3D model in real time`
        );
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to process AI architect command");
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleToggleVoice = () => {
    if (isListeningVoice) {
      if (stopVoiceRef.current) {
        stopVoiceRef.current();
        stopVoiceRef.current = null;
      }
      setIsListeningVoice(false);
      return;
    }

    setIsListeningVoice(true);
    const stop = startVoiceArchitectRecognition(
      (transcript, isFinal) => {
        setChatInput(transcript);
        if (isFinal && transcript.trim().length > 2) {
          setIsListeningVoice(false);
          handleSendArchitectCommand(transcript);
        }
      },
      (err) => {
        setIsListeningVoice(false);
        toast.error(`Voice input: ${err}`);
      },
      () => {
        setIsListeningVoice(false);
      }
    );
    stopVoiceRef.current = stop;
  };

  const handleOpenPhotorealModal = () => {
    if (!hasDesign) return;
    onOpenPanel?.();
    const snap = onCaptureViewport();
    if (snap) {
      setCapturedPreview(snap);
    }
    setActivePanel((prev) =>
      prev === "photoreal_render" ? "none" : "photoreal_render"
    );
  };

  const handleRunPhotorealRender = async () => {
    if (isRenderingPhotoreal) return;
    const freshSnap = onCaptureViewport() || capturedPreview;
    if (!freshSnap) {
      toast.error("Could not capture 3D viewport buffer");
      return;
    }
    setCapturedPreview(freshSnap);
    setIsRenderingPhotoreal(true);

    try {
      const res = await renderPhotorealisticHouseView({
        pipeline: selectedPipeline,
        lightingMood,
        colorDataUrl: freshSnap.colorDataUrl,
        depthDataUrl: freshSnap.depthDataUrl,
        cameraMode: freshSnap.cameraMode,
        activeRoomName: currentRoomName,
        designName,
        customPromptNotes: customRenderNotes,
        controlStrength,
      });
      setActiveRenderResult(res);
      setRenderHistory((prev) => [res, ...prev.slice(0, 7)]);
      setComparisonSliderPct(50);
      toast.success(
        `Photorealistic architectural view rendered via ${res.pipelineUsed}`
      );
    } catch (err: any) {
      toast.error(err?.message || "Failed to render photorealistic view");
    } finally {
      setIsRenderingPhotoreal(false);
    }
  };

  const recCats = activeSurfaceMeta?.recommendedCategories || [];
  const filteredPresets = MATERIAL_PRESET_CATALOG.filter(
    (p) =>
      recCats.includes(p.category) ||
      Boolean(p.targetSurfaces && p.targetSurfaces.includes(activeSurfaceId))
  );
  const allOtherPresets = MATERIAL_PRESET_CATALOG.filter(
    (p) =>
      !recCats.includes(p.category) &&
      !Boolean(p.targetSurfaces && p.targetSurfaces.includes(activeSurfaceId))
  );

  return (
    <>
      {/* TOOLBAR TRIGGER BUTTONS */}
      <div
        className={`flex items-center gap-2 flex-wrap ${
          !hasDesign ? "opacity-40 pointer-events-none" : ""
        }`}
      >
        {/* Phase 2 Trigger: Reactive PBR Material Store & World-Space UV Inspector */}
        <button
          type="button"
          disabled={!hasDesign}
          onClick={() => {
            onOpenPanel?.();
            setActivePanel((prev) =>
              prev === "pbr_store" ? "none" : "pbr_store"
            );
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
            activePanel === "pbr_store"
              ? "bg-amber-500 text-slate-950 border-amber-500 shadow-sm"
              : isLight
              ? "bg-white hover:bg-slate-100 text-slate-800 border-slate-300"
              : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
          }`}
          title="Inspect & customize all 20 semantic 3D surfaces with World-Space UV scaling & PBR textures"
        >
          <Palette className="h-3.5 w-3.5 text-amber-500" />
          <span>PBR Materials (20 Surfaces)</span>
        </button>

        {/* Phase 3 Trigger: Conversational AI Architect ("Talk to the House") */}
        <button
          type="button"
          disabled={!hasDesign}
          onClick={() => {
            onOpenPanel?.();
            setActivePanel((prev) =>
              prev === "talk_to_house" ? "none" : "talk_to_house"
            );
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
            activePanel === "talk_to_house"
              ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-violet-500 shadow-md"
              : isLight
              ? "bg-violet-50 hover:bg-violet-100 text-violet-900 border-violet-300"
              : "bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 border-violet-500/40"
          }`}
          title="Natural-language text & voice AI Architect powered by gemini-3.8-flash Structured Outputs"
        >
          <Sparkles className="h-3.5 w-3.5 text-violet-500" />
          <span>Talk to the House (AI)</span>
        </button>

        {/* Phase 4 Trigger: Render Photorealistic View (Fal.ai Flux Depth & Kontext) */}
        <button
          type="button"
          disabled={!hasDesign}
          onClick={handleOpenPhotorealModal}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
            activePanel === "photoreal_render"
              ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 border-emerald-400 shadow-md"
              : isLight
              ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300"
              : "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40"
          }`}
          title="Capture 3D viewport & render structure-locked photorealistic view with Fal.ai Flux Control LoRA Depth & Flux Pro Kontext"
        >
          <Camera className="h-3.5 w-3.5 text-emerald-500" />
          <span>Render Photorealistic View</span>
        </button>
      </div>

      {/* PANEL 1: REACTIVE PBR MATERIAL STORE & WORLD-SPACE UV INSPECTOR */}
      {hasDesign && activePanel === "pbr_store" && activeSurfaceConfig && (
        <div
          className={`fixed top-28 right-6 z-50 w-96 max-h-[80vh] overflow-y-auto rounded-2xl border shadow-2xl p-4 backdrop-blur-xl ${
            isLight
              ? "bg-white/95 border-slate-200 text-slate-900"
              : "bg-slate-950/95 border-slate-800 text-slate-100"
          }`}
        >
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-500/20">
            <div>
              <h3 className="text-sm font-extrabold flex items-center gap-2">
                <Palette className="h-4 w-4 text-amber-500" />
                PBR Surface & World-Space UV Store
              </h3>
              <p className="text-[11px] opacity-75">
                Click any surface on the 3D house or select below
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  resetAllMaterials();
                  toast.success("Reset all 20 surfaces to default PBR materials");
                }}
                className="p-1.5 rounded-lg border border-slate-500/30 hover:bg-slate-500/10 text-xs cursor-pointer"
                title="Reset all 20 surfaces to defaults"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setActivePanel("none")}
                className="p-1.5 rounded-lg border border-slate-500/30 hover:bg-slate-500/10 text-xs cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* 1-Click Whole-House Designer Material Schemes */}
          <div className="mb-3 pb-3 border-b border-slate-500/20">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-extrabold text-amber-500 uppercase tracking-wider">
                Whole-House Designer Schemes (All 20 Surfaces)
              </span>
              <span className="text-[10px] opacity-65">1-Click Apply</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {WHOLE_HOUSE_DESIGNER_SCHEMES.map((scheme) => (
                <button
                  key={scheme.id}
                  type="button"
                  onClick={() => {
                    applyWholeHouseScheme(scheme.id);
                    toast.success(`Applied "${scheme.name}" across all 20 exterior & interior surfaces`);
                  }}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                    activeSchemeId === scheme.id
                      ? "border-amber-500 bg-amber-500/15 shadow-sm"
                      : isLight
                      ? "border-slate-200 hover:bg-slate-100"
                      : "border-slate-800 hover:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-1 mb-1">
                    {scheme.swatches.map((hex, idx) => (
                      <span
                        key={idx}
                        className="w-3.5 h-3.5 rounded-full border border-black/20"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                  <div className="text-[10px] font-extrabold truncate">{scheme.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Group Switcher: Exterior (9) vs Interior (11) */}
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            <button
              type="button"
              onClick={() => {
                setSurfaceGroupTab("exterior");
                setSelectedSurfaceId("exterior_wall_main");
              }}
              className={`py-1.5 px-2.5 rounded-xl text-xs font-bold border cursor-pointer ${
                surfaceGroupTab === "exterior"
                  ? "bg-amber-500 text-slate-950 border-amber-500"
                  : "border-slate-500/30 opacity-80"
              }`}
            >
              Exterior Surfaces (9)
            </button>
            <button
              type="button"
              onClick={() => {
                setSurfaceGroupTab("interior");
                setSelectedSurfaceId("kitchen_benchtop");
              }}
              className={`py-1.5 px-2.5 rounded-xl text-xs font-bold border cursor-pointer ${
                surfaceGroupTab === "interior"
                  ? "bg-amber-500 text-slate-950 border-amber-500"
                  : "border-slate-500/30 opacity-80"
              }`}
            >
              Interior Surfaces (11)
            </button>
          </div>

          {/* Semantic Surface Selector Dropdown */}
          <div className="mb-3">
            <label className="block text-[11px] font-bold mb-1">
              Semantic Surface ID (userData.surfaceId)
            </label>
            <select
              aria-label="Semantic Surface Selector"
              value={activeSurfaceId}
              onChange={(e) =>
                setSelectedSurfaceId(e.target.value as SemanticSurfaceId)
              }
              className={`w-full py-2 px-2.5 rounded-xl border text-xs font-bold ${
                isLight
                  ? "bg-slate-50 border-slate-300 text-slate-900"
                  : "bg-slate-900 border-slate-700 text-white"
              }`}
            >
              {ALL_SEMANTIC_SURFACES.filter(
                (s) => s.zone === surfaceGroupTab
              ).map((s) => (
                <option key={s.surfaceId} value={s.surfaceId}>
                  {s.label} ({s.surfaceId})
                </option>
              ))}
            </select>
          </div>

          {/* Active Material Summary Card */}
          <div
            className={`p-3 rounded-xl border mb-3 flex items-center gap-3 ${
              isLight
                ? "bg-slate-50 border-slate-200"
                : "bg-slate-900/90 border-slate-800"
            }`}
          >
            <div
              className="w-12 h-12 rounded-xl border border-white/20 shadow-inner shrink-0 bg-cover bg-center"
              style={{
                backgroundColor: activeSurfaceConfig.baseColorHex,
                backgroundImage: activeSurfaceConfig.albedoMapUrl
                  ? `url(${activeSurfaceConfig.albedoMapUrl})`
                  : undefined,
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-extrabold truncate">
                {activeSurfaceConfig.name}
              </div>
              <div className="text-[10px] font-mono opacity-75">
                {activeSurfaceMeta?.surfaceId} • {activeSurfaceConfig.category.toUpperCase()}
              </div>
              <div className="text-[10px] font-mono text-amber-500 font-bold">
                UV Scale: {activeSurfaceConfig.textureScaleMeters.toFixed(2)}m • Roughness:{" "}
                {activeSurfaceConfig.roughness.toFixed(2)} • Metalness:{" "}
                {activeSurfaceConfig.metalness.toFixed(2)}
              </div>
            </div>
          </div>

          {/* PBR Sliders & Color Picker */}
          <div className="grid grid-cols-2 gap-2.5 mb-3 text-xs">
            <div>
              <label className="block text-[10px] font-bold mb-1">
                Base Color ({activeSurfaceConfig.baseColorHex})
              </label>
              <input
                type="color"
                value={activeSurfaceConfig.baseColorHex}
                onChange={(e) =>
                  updateSurfaceMaterial(activeSurfaceId, {
                    baseColorHex: e.target.value,
                  })
                }
                className="w-full h-8 rounded-lg cursor-pointer border border-slate-500/30"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold mb-1">
                World-Space UV Scale ({activeSurfaceConfig.textureScaleMeters.toFixed(2)}m)
              </label>
              <input
                type="range"
                min={0.4}
                max={3.5}
                step={0.1}
                value={activeSurfaceConfig.textureScaleMeters}
                onChange={(e) =>
                  updateSurfaceMaterial(activeSurfaceId, {
                    textureScaleMeters: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold mb-1">
                PBR Roughness ({activeSurfaceConfig.roughness.toFixed(2)})
              </label>
              <input
                type="range"
                min={0.04}
                max={0.98}
                step={0.02}
                value={activeSurfaceConfig.roughness}
                onChange={(e) =>
                  updateSurfaceMaterial(activeSurfaceId, {
                    roughness: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold mb-1">
                PBR Metalness ({activeSurfaceConfig.metalness.toFixed(2)})
              </label>
              <input
                type="range"
                min={0.0}
                max={0.95}
                step={0.02}
                value={activeSurfaceConfig.metalness}
                onChange={(e) =>
                  updateSurfaceMaterial(activeSurfaceId, {
                    metalness: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Recommended Presets Grid */}
          <div className="mb-2">
            <div className="text-[11px] font-bold mb-1.5 flex items-center justify-between">
              <span>Recommended Architectural Presets</span>
              <span className="text-[10px] opacity-60">
                {filteredPresets.length} presets
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {[...filteredPresets, ...allOtherPresets.slice(0, 6)].map(
                (preset) => (
                  <button
                    key={preset.presetId}
                    type="button"
                    onClick={() => {
                      applyPresetToSurface(activeSurfaceId, preset.presetId);
                      toast.success(
                        `Applied "${preset.name}" to ${activeSurfaceMeta?.label || activeSurfaceId}`
                      );
                    }}
                    className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                      activeSurfaceConfig.name === preset.name
                        ? "border-amber-500 bg-amber-500/15"
                        : isLight
                        ? "border-slate-200 hover:bg-slate-100"
                        : "border-slate-800 hover:bg-slate-900"
                    }`}
                  >
                    <span
                      className="w-5 h-5 rounded-md border border-black/20 shrink-0"
                      style={{ backgroundColor: preset.baseColorHex }}
                    />
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold truncate">
                        {preset.name}
                      </div>
                      <div className="text-[9px] opacity-70 uppercase">
                        {preset.category} • {preset.textureScaleMeters}m
                      </div>
                    </div>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* PANEL 2: CONVERSATIONAL AI ARCHITECT ("TALK TO THE HOUSE") */}
      {hasDesign && activePanel === "talk_to_house" && (
        <div
          className={`fixed bottom-6 right-6 z-50 w-[420px] max-w-[94vw] rounded-2xl border shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl ${
            isLight
              ? "bg-white/95 border-violet-300 text-slate-900"
              : "bg-slate-950/95 border-violet-500/40 text-slate-100"
          }`}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-amber-300" />
              <div>
                <div className="text-xs font-extrabold tracking-wide flex items-center gap-2">
                  <span>TALK TO THE HOUSE</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/20 font-mono">
                    gemini-3.8-flash
                  </span>
                </div>
                <div className="text-[10px] text-white/80">
                  Real-Time Conversational PBR Material & Custom Texture AI
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActivePanel("none")}
              className="p-1 rounded-lg hover:bg-white/20 text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-3 py-2 border-b border-slate-500/20 flex items-center gap-1.5 overflow-x-auto">
            {QUICK_ARCHITECT_PROMPTS.map((q) => (
              <button
                key={q.label}
                type="button"
                disabled={isAiProcessing}
                onClick={() => handleSendArchitectCommand(q.prompt)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap border transition-all cursor-pointer ${
                  isLight
                    ? "bg-violet-50 hover:bg-violet-100 text-violet-800 border-violet-200"
                    : "bg-violet-500/15 hover:bg-violet-500/30 text-violet-200 border-violet-500/30"
                }`}
              >
                ✨ {q.label}
              </button>
            ))}
          </div>

          {/* Conversation History */}
          <div className="p-3 space-y-2.5 max-h-72 overflow-y-auto text-xs">
            {chatHistory.map((turn) => (
              <div
                key={turn.id}
                className={`p-2.5 rounded-xl ${
                  turn.role === "user"
                    ? "bg-violet-600 text-white ml-8"
                    : isLight
                    ? "bg-slate-100 text-slate-800 mr-4 border border-slate-200"
                    : "bg-slate-900 text-slate-200 mr-4 border border-slate-800"
                }`}
              >
                <div className="leading-relaxed">{turn.text}</div>
                {turn.appliedSceneActions && turn.appliedSceneActions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-500/20 flex flex-wrap gap-1">
                    {turn.appliedSceneActions.map((act, idx) => (
                      <span
                        key={`${act.action}_${idx}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40"
                      >
                        🔧 {act.action.replace(/_/g, " ")}
                        {act.targetElementType ? `: ${act.targetElementType}` : ""}
                        {act.targetElementId ? ` (${act.targetElementId})` : ""}
                      </span>
                    ))}
                  </div>
                )}
                {turn.appliedUpdates && turn.appliedUpdates.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-500/20 flex flex-wrap gap-1">
                    {turn.appliedUpdates.map((u) => (
                      <span
                        key={u.surfaceId}
                        onClick={() => {
                          setSelectedSurfaceId(u.surfaceId);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 cursor-pointer"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-white/40"
                          style={{ backgroundColor: u.baseColorHex }}
                        />
                        {u.surfaceId}: {u.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isAiProcessing && (
              <div className="text-[11px] font-semibold text-violet-500 animate-pulse px-2">
                Synthesizing structured PBR material updates & world-space UVs...
              </div>
            )}
          </div>

          {/* Custom Seamless Texture Toggle */}
          <div className="px-3 py-1.5 border-t border-slate-500/20 flex items-center justify-between text-[10px]">
            <label className="flex items-center gap-1.5 cursor-pointer font-semibold opacity-85">
              <input
                type="checkbox"
                checked={generateCustomAiTile}
                onChange={(e) => setGenerateCustomAiTile(e.target.checked)}
                className="accent-violet-600"
              />
              <span>Auto-synthesize seamless tileable textures for bespoke materials</span>
            </label>
          </div>

          {/* Input Bar + Voice Mic */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendArchitectCommand();
            }}
            className="p-2.5 border-t border-slate-500/20 flex items-center gap-2"
          >
            <button
              type="button"
              onClick={handleToggleVoice}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isListeningVoice
                  ? "bg-red-500 text-white border-red-400 animate-pulse"
                  : isLight
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                  : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
              }`}
              title={
                isListeningVoice
                  ? "Stop voice listening"
                  : "Speak to the house (Voice Input)"
              }
            >
              {isListeningVoice ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="e.g. Make the exterior brick Chillingham White and roof Monument..."
              className={`flex-1 py-2 px-3 rounded-xl border text-xs focus:outline-none ${
                isLight
                  ? "bg-slate-50 border-slate-300 text-slate-900"
                  : "bg-slate-900 border-slate-700 text-white"
              }`}
            />
            <button
              type="submit"
              disabled={isAiProcessing || !chatInput.trim()}
              className="p-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40 cursor-pointer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* PANEL 3: STRUCTURE-LOCKED PHOTOREALISTIC AI RENDERER MODAL (FAL.AI) */}
      {hasDesign && activePanel === "photoreal_render" && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div
            className={`w-full max-w-5xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
              isLight
                ? "bg-white border-slate-200 text-slate-900"
                : "bg-slate-950 border-slate-800 text-slate-100"
            }`}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-500/20 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500 text-slate-950 font-black">
                  <Camera className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold flex items-center gap-2">
                    <span>Structure-Locked Photorealistic AI Renderer</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                      Fal.ai Flux Depth + Kontext
                    </span>
                  </h2>
                  <p className="text-xs opacity-75">
                    Locks exact 3D camera geometry & depth buffer to generate magazine-grade architectural photography
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivePanel("none")}
                className="p-2 rounded-xl border border-slate-500/30 hover:bg-slate-500/10 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 5 Columns: Pipeline & Lighting Controls */}
              <div className="lg:col-span-5 flex flex-col gap-4 text-xs">
                <div>
                  <label className="block font-bold mb-1.5">
                    1. Fal.ai Structure-Lock Pipeline
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedPipeline("fal-ai/flux-control-lora-depth")
                      }
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedPipeline === "fal-ai/flux-control-lora-depth"
                          ? "border-emerald-500 bg-emerald-500/15"
                          : "border-slate-500/30 opacity-80"
                      }`}
                    >
                      <div className="font-extrabold flex items-center justify-between">
                        <span>fal-ai/flux-control-lora-depth</span>
                        <span className="text-[10px] font-mono text-emerald-500">
                          Recommended
                        </span>
                      </div>
                      <div className="text-[11px] opacity-75 mt-0.5">
                        Uses the real-time 3D WebGL Depth Buffer + PBR material prompt to lock wall, roof, and window geometry.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedPipeline("fal-ai/flux-pro/kontext")
                      }
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedPipeline === "fal-ai/flux-pro/kontext"
                          ? "border-emerald-500 bg-emerald-500/15"
                          : "border-slate-500/30 opacity-80"
                      }`}
                    >
                      <div className="font-extrabold flex items-center justify-between">
                        <span>fal-ai/flux-pro/kontext</span>
                        <span className="text-[10px] font-mono text-teal-400">
                          Color + Context Lock
                        </span>
                      </div>
                      <div className="text-[11px] opacity-75 mt-0.5">
                        Transforms the exact 3D RGB viewport into a photorealistic architectural photograph while preserving exact material colors.
                      </div>
                    </button>
                  </div>
                </div>

                {/* Lighting Mood */}
                <div>
                  <label className="block font-bold mb-1.5">
                    2. Architectural Lighting & Atmosphere
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      Object.keys(
                        LIGHTING_MOOD_DESCRIPTIONS
                      ) as ArchitecturalLightingMood[]
                    ).map((moodKey) => (
                      <button
                        key={moodKey}
                        type="button"
                        onClick={() => setLightingMood(moodKey)}
                        className={`py-2 px-3 rounded-xl border font-bold text-left cursor-pointer ${
                          lightingMood === moodKey
                            ? "bg-emerald-500 text-slate-950 border-emerald-500"
                            : "border-slate-500/30 opacity-80"
                        }`}
                      >
                        {LIGHTING_MOOD_DESCRIPTIONS[moodKey].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Whole-House Material Palette Switcher inside Render Modal */}
                <div>
                  <label className="block font-bold mb-1.5">
                    2B. Active Whole-House Material Palette (Live 3D Sync)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {WHOLE_HOUSE_DESIGNER_SCHEMES.map((scheme) => (
                      <button
                        key={scheme.id}
                        type="button"
                        onClick={() => {
                          applyWholeHouseScheme(scheme.id);
                          setTimeout(() => {
                            const snap = onCaptureViewport();
                            if (snap) setCapturedPreview(snap);
                          }, 80);
                          toast.success(`Switched to "${scheme.name}" & recaptured 3D viewport`);
                        }}
                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                          activeSchemeId === scheme.id
                            ? "border-emerald-500 bg-emerald-500/15"
                            : "border-slate-500/30 opacity-85 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          {scheme.swatches.map((hex, idx) => (
                            <span
                              key={idx}
                              className="w-3 h-3 rounded-full border border-black/20"
                              style={{ backgroundColor: hex }}
                            />
                          ))}
                        </div>
                        <div className="text-[10px] font-bold truncate">{scheme.name}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Geometry Lock Strength */}
                <div>
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span>3. 3D Geometry Lock Strength</span>
                    <span className="font-mono text-emerald-500">
                      {Math.round(controlStrength * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.55}
                    max={1.0}
                    step={0.02}
                    value={controlStrength}
                    onChange={(e) =>
                      setControlStrength(parseFloat(e.target.value))
                    }
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Custom Prompt Notes */}
                <div>
                  <label className="block font-bold mb-1">
                    4. Additional Styling Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={customRenderNotes}
                    onChange={(e) => setCustomRenderNotes(e.target.value)}
                    placeholder="e.g. native banksia garden, wet driveway after rain..."
                    className={`w-full py-2 px-3 rounded-xl border text-xs ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900"
                        : "bg-slate-900 border-slate-700 text-white"
                    }`}
                  />
                </div>

                {/* Auto-Assembled Material Prompt Preview */}
                {capturedPreview && (
                  <div
                    className={`p-3 rounded-xl border text-[10px] font-mono leading-relaxed ${
                      isLight
                        ? "bg-slate-50 border-slate-200 text-slate-600"
                        : "bg-slate-900/90 border-slate-800 text-slate-400"
                    }`}
                  >
                    <div className="font-bold text-emerald-500 mb-1 uppercase">
                      Auto-Generated Material-Aware Prompt:
                    </div>
                    <div className="line-clamp-4">
                      {buildPhotorealPromptFromStore({
                        pipeline: selectedPipeline,
                        lightingMood,
                        colorDataUrl: capturedPreview.colorDataUrl,
                        depthDataUrl: capturedPreview.depthDataUrl,
                        cameraMode: capturedPreview.cameraMode,
                        activeRoomName: currentRoomName,
                        designName,
                        customPromptNotes: customRenderNotes,
                      })}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isRenderingPhotoreal}
                    onClick={() => {
                      const snap = onCaptureViewport();
                      if (snap) {
                        setCapturedPreview(snap);
                        toast.success("Refreshed 3D viewport & depth buffer");
                      }
                    }}
                    className="px-3 py-2.5 rounded-xl border border-slate-500/30 font-bold text-xs cursor-pointer hover:bg-slate-500/10"
                  >
                    Recapture 3D View
                  </button>
                  <button
                    type="button"
                    disabled={isRenderingPhotoreal}
                    onClick={handleRunPhotorealRender}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Wand2 className="h-4 w-4" />
                    {isRenderingPhotoreal
                      ? "Rendering Photorealistic View..."
                      : "Generate Photorealistic Render"}
                  </button>
                </div>
              </div>

              {/* Right 7 Columns: Interactive Before/After Viewport Comparison & Depth Map Preview */}
              <div className="lg:col-span-7 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="font-bold flex items-center gap-2">
                    <Eye className="h-4 w-4 text-emerald-500" />
                    <span>
                      {activeRenderResult
                        ? "Interactive Before (3D Viewport) vs After (Photorealistic AI)"
                        : "Captured 3D Camera Viewport & Depth Buffer"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowDepthOverlay((p) => !p)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer ${
                        showDepthOverlay
                          ? "bg-amber-500 text-slate-950 border-amber-500"
                          : "border-slate-500/30"
                      }`}
                    >
                      {showDepthOverlay ? "Showing Depth Map" : "View Depth Map"}
                    </button>
                    {activeRenderResult && (
                      <a
                        href={activeRenderResult.renderedDataUrl}
                        download={`${(designName || "house").replace(/\s+/g, "_")}_photoreal_render.jpg`}
                        className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-[11px] flex items-center gap-1"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download Render
                      </a>
                    )}
                  </div>
                </div>

                {/* Viewport Canvas / Comparison Slider */}
                <div className="relative w-full aspect-4/3 rounded-2xl overflow-hidden border border-slate-500/30 bg-slate-900 select-none">
                  {showDepthOverlay && capturedPreview ? (
                    <img
                      src={capturedPreview.depthDataUrl}
                      alt="3D Structure-Locked Depth Buffer"
                      className="w-full h-full object-cover"
                    />
                  ) : activeRenderResult ? (
                    <>
                      {/* Base Layer: Photorealistic Rendered Output */}
                      <img
                        src={activeRenderResult.renderedDataUrl}
                        alt="Photorealistic AI Render"
                        className="w-full h-full object-cover"
                      />
                      {/* Clipped Overlay: Source 3D WebGL Viewport */}
                      <div
                        className="absolute inset-0 overflow-hidden"
                        style={{
                          clipPath: `inset(0 ${100 - comparisonSliderPct}% 0 0)`,
                        }}
                      >
                        <img
                          src={activeRenderResult.sourceColorDataUrl}
                          alt="Source 3D Viewport"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {/* Vertical Divider Line */}
                      <div
                        className="absolute inset-y-0 w-0.5 bg-white shadow-lg pointer-events-none"
                        style={{ left: `${comparisonSliderPct}%` }}
                      >
                        <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded-full bg-slate-950/90 text-white border border-white/40 text-[10px] font-bold whitespace-nowrap">
                          ◀ 3D | AI ▶
                        </div>
                      </div>
                      {/* Range Input Overlaid for Smooth Dragging */}
                      <input
                        type="range"
                        aria-label="Before and After Comparison Slider"
                        min={0}
                        max={100}
                        value={comparisonSliderPct}
                        onChange={(e) =>
                          setComparisonSliderPct(Number(e.target.value))
                        }
                        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
                      />
                    </>
                  ) : capturedPreview ? (
                    <img
                      src={capturedPreview.colorDataUrl}
                      alt="Captured 3D Viewport"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs opacity-60">
                      Capturing 3D viewport...
                    </div>
                  )}
                </div>

                {/* Render Gallery Thumbnails */}
                {renderHistory.length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto pt-1">
                    {renderHistory.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveRenderResult(item)}
                        className={`relative w-20 h-14 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer ${
                          activeRenderResult?.id === item.id
                            ? "border-emerald-500"
                            : "border-transparent opacity-70 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={item.renderedDataUrl}
                          alt="Render thumbnail"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
