import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Sparkles,
  Mic,
  MicOff,
  Send,
  Download,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  Home,
  Sliders,
  Check,
  X,
  RotateCcw,
  Eye,
  Trash2,
  Building2,
  Sun,
  Sunset,
  CloudSun,
  Palette,
  Car,
  Ruler,
  FileText,
  LayoutGrid,
  Plus,
  BookmarkCheck,
} from "lucide-react";
import { Logo, HudsonMark } from "@/components/flyer/FlyerTemplates";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { StaffHeaderProfile } from "@/components/auth/StaffHeaderProfile";
import { useTheme } from "@/lib/theme";
import { getActiveStaffUser, onStaffUserChanged, type StaffProfile } from "@/lib/authSession";
import { isMorganHales } from "@/lib/access";
import { getActiveDivision, setActiveDivision, onDivisionChanged, type Division } from "@/lib/divisionContext";
import { HUDSON_DIMENSIONS_REGISTRY } from "@/lib/hudsonDimensions.data";
import type {
  CustomFacadeRecord,
  FacadeArchitecturalStyle,
  FacadeChatMessage,
  FacadeGarageConfig,
  FacadeHousingCategory,
  FacadeLightingMood,
  FacadeRoofStyle,
  FeaturePierMaterial,
} from "@/lib/facade-generator/facadeGeneratorTypes";
import {
  getAllCustomFacadeRecords,
  saveCustomFacadeRecord,
  submitCustomFacadeForReview,
  approveCustomFacadeByAdmin,
  rejectCustomFacadeByAdmin,
  deleteCustomFacadeRecord,
  onCustomFacadesChanged,
  getDefaultCompatibleFamilies,
} from "@/lib/facade-generator/facadeGeneratorStorage";
import {
  STYLE_PRESETS,
  COLORBOND_ROOF_PALETTE,
  RENDER_WALL_PALETTE,
  BRICKWORK_PALETTE,
  BATTEN_TIMBER_PALETTE,
  selectBaseReferenceElevation,
  renderCustomFacadeCanvas,
  processFacadeAiPrompt,
} from "@/lib/facade-generator/facadeGeneratorAiEngine";

const HOUSING_CATEGORIES: FacadeHousingCategory[] = [
  "Single Storey",
  "Single Storey (Narrow Lot)",
  "Double Storey",
  "Narrow Double Storey",
  "Dual Living",
  "Split Level",
  "Acreage",
  "Granny Flat",
];

const GARAGE_CONFIGS: FacadeGarageConfig[] = [
  "Double Garage",
  "Single Garage",
  "Triple Garage",
  "No Garage",
];

const ARCHITECTURAL_STYLES: FacadeArchitecturalStyle[] = [
  "Modern Coastal",
  "Hamptons",
  "Contemporary Box",
  "Modern Barn",
  "Classic Brick & Render",
  "Palm Springs",
  "Urban Industrial",
  "French Provincial",
];

const ROOF_STYLES: FacadeRoofStyle[] = [
  "Coastal Mixed Gable & Skillion",
  "Gable / Barn Pitch",
  "Flat Parapet / Box",
  "Hip Roof",
  "Skillion / Mono-Pitch",
];

const LIGHTING_MOODS: FacadeLightingMood[] = [
  "Crisp Australian Daylight (11am)",
  "Golden Hour Twilight",
  "Warm Morning Sun",
  "Architectural Studio Overcast",
];

const FEATURE_PIER_OPTIONS: FeaturePierMaterial[] = [
  "Limestone Ashlar",
  "Stacked Sandstone",
  "Recycled Hawthorn Brick",
  "Off-Form Concrete",
  "Smooth Render Pier",
  "None",
];

const QUICK_FILTER_COMBOS: {
  label: string;
  housingCategory: FacadeHousingCategory;
  garageConfig: FacadeGarageConfig;
  minLotWidthM: number;
  targetDesignName: string;
}[] = [
  {
    label: "Single Storey • Double Garage",
    housingCategory: "Single Storey",
    garageConfig: "Double Garage",
    minLotWidthM: 12.5,
    targetDesignName: "Amber 23",
  },
  {
    label: "Single Storey • Single Garage",
    housingCategory: "Single Storey (Narrow Lot)",
    garageConfig: "Single Garage",
    minLotWidthM: 10.0,
    targetDesignName: "Hazel 15",
  },
  {
    label: "Narrow Double Storey • Single Garage",
    housingCategory: "Narrow Double Storey",
    garageConfig: "Single Garage",
    minLotWidthM: 10.0,
    targetDesignName: "Ruby 21",
  },
  {
    label: "Narrow Double Storey • Double Garage",
    housingCategory: "Narrow Double Storey",
    garageConfig: "Double Garage",
    minLotWidthM: 12.5,
    targetDesignName: "Carolina 28",
  },
  {
    label: "Double Storey • Double Garage",
    housingCategory: "Double Storey",
    garageConfig: "Double Garage",
    minLotWidthM: 14.0,
    targetDesignName: "Jasper 28",
  },
  {
    label: "Dual Living / Duplex",
    housingCategory: "Dual Living",
    garageConfig: "Double Garage",
    minLotWidthM: 15.0,
    targetDesignName: "Cayenne 42",
  },
];

function createInitialBlankFacade(staffUser: StaffProfile | null, division: Division): CustomFacadeRecord {
  const preset = STYLE_PRESETS["Modern Coastal"];
  return {
    id: `custom-facade-${Date.now()}`,
    name: "",
    housingCategory: "Single Storey",
    garageConfig: "Double Garage",
    minLotWidthM: 12.5,
    style: "Modern Coastal",
    roofStyle: preset.roofStyle,
    materials: { ...preset.materials },
    compatibleFamilies: getDefaultCompatibleFamilies("Single Storey", "Double Garage"),
    targetDesignName: "",
    qldUplift: preset.baseQldUplift,
    nswUplift: preset.baseNswUplift,
    promptHistory: [],
    description: "",
    imageUrl: "",
    baseReferenceUrl: "",
    status: "draft",
    createdBy: {
      id: staffUser?.id || "staff-user",
      name: staffUser?.name || "Hudson Consultant",
      role: staffUser?.role || "sales",
      division,
    },
    createdAt: new Date().toISOString(),
  };
}

export function FacadeGeneratorPortal() {
  const { mode } = useTheme();
  const isLight = mode === "normal";

  const [staffUser, setStaffUser] = useState<StaffProfile | null>(() => getActiveStaffUser());
  const [division, setDivision] = useState<Division>(() => getActiveDivision());
  const [activeTab, setActiveTab] = useState<"studio" | "admin_queue" | "library">("studio");
  const [allRecords, setAllRecords] = useState<CustomFacadeRecord[]>(() => getAllCustomFacadeRecords());
  const [libraryFilterCategory, setLibraryFilterCategory] = useState<string>("All");
  const [libraryFilterGarage, setLibraryFilterGarage] = useState<string>("All");

  const [activeFacade, setActiveFacade] = useState<CustomFacadeRecord>(() =>
    createInitialBlankFacade(getActiveStaffUser(), getActiveDivision())
  );
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [enlargedPreviewUrl, setEnlargedPreviewUrl] = useState<string | null>(null);

  // Chat state
  const [chatInput, setChatInput] = useState<string>("");
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [isListeningVoice, setIsListeningVoice] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<FacadeChatMessage[]>(() => [
    {
      id: "welcome-msg",
      role: "assistant",
      text: "Welcome to the **Hudson Homes AI Facade Generator**.\n\nDescribe the facade you would like to create—such as your lot frontage, single or double storey, style preference, and colour scheme—and I will generate a brand-new architectural render for you.",
      timestamp: new Date().toISOString(),
    },
  ]);

  const isAdmin = isMorganHales(staffUser) || staffUser?.role === "admin";

  useEffect(() => {
    const unsubUser = onStaffUserChanged((u) => setStaffUser(u));
    const unsubDiv = onDivisionChanged((d) => setDivision(d));
    const unsubFacades = onCustomFacadesChanged(() => {
      setAllRecords(getAllCustomFacadeRecords());
    });
    return () => {
      unsubUser();
      unsubDiv();
      unsubFacades();
    };
  }, []);

  const pendingReviewRecords = useMemo(
    () => allRecords.filter((r) => r.status === "pending_review"),
    [allRecords]
  );

  const approvedRecords = useMemo(
    () => allRecords.filter((r) => r.status === "approved"),
    [allRecords]
  );

  const handleSendChatPrompt = async (customText?: string) => {
    const promptText = (customText ?? chatInput).trim();
    if (!promptText || isAiThinking) return;

    if (!customText) setChatInput("");

    const userMsg: FacadeChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: promptText,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsAiThinking(true);
    setIsRendering(true);

    try {
      const result = await processFacadeAiPrompt(promptText, activeFacade);
      setActiveFacade(result.updatedRecord);

      const aiMsg: FacadeChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        text: result.assistantReply,
        timestamp: new Date().toISOString(),
        appliedChanges: result.appliedChanges,
        matchedDesignsSummary: result.matchedDesignsSummary,
        suggestedPrompts: result.suggestedPrompts,
        renderSnapshotUrl: result.updatedRecord.imageUrl,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("[FacadeGenerator AI error]", err);
      toast.error("Could not process facade prompt. Please try again.");
    } finally {
      setIsAiThinking(false);
      setIsRendering(false);
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);
    }
  };

  const handleToggleVoiceControl = () => {
    if (isListeningVoice) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListeningVoice(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.info(
        "Voice recognition is not supported in this browser window. Type your facade prompt directly in the chat box below."
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-AU";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListeningVoice(true);
        toast.info("Listening... Describe your facade style, colours, or design filter.");
      };

      recognition.onresult = (event: any) => {
        const transcript = event?.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setChatInput(transcript);
          void handleSendChatPrompt(transcript);
        }
      };

      recognition.onerror = () => {
        setIsListeningVoice(false);
      };

      recognition.onend = () => {
        setIsListeningVoice(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListeningVoice(false);
    }
  };

  const handleDownloadFacadeImage = (record: CustomFacadeRecord = activeFacade) => {
    const link = document.createElement("a");
    const safeName = (record.name || "hudson-custom-facade")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");
    const safeCat = record.housingCategory.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const safeGar = record.garageConfig.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    link.download = `${safeName}-${safeCat}-${safeGar}-2400x937.jpg`;
    link.href = record.imageUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloaded high-resolution facade render (${record.name})`);
  };

  const handleSaveDraft = () => {
    const saved = saveCustomFacadeRecord({
      ...activeFacade,
      status: activeFacade.status === "approved" ? "approved" : "draft",
    });
    setActiveFacade(saved);
    setAllRecords(getAllCustomFacadeRecords());
    toast.success(`Saved "${saved.name}" to your custom facade workspace.`);
  };

  const handleSubmitForAdminReview = () => {
    if (!activeFacade.name.trim()) {
      toast.error("Please give your custom facade a name before submitting for review.");
      return;
    }
    const submitted = submitCustomFacadeForReview({
      ...activeFacade,
      createdBy: {
        id: staffUser?.id || "staff-user",
        name: staffUser?.name || "Hudson Consultant",
        role: staffUser?.role || "sales",
        division,
      },
    });
    setActiveFacade(submitted);
    setAllRecords(getAllCustomFacadeRecords());
    toast.success(`Submitted "${submitted.name}" for Admin Review!`, {
      description: `Tagged as ${submitted.housingCategory} • ${submitted.garageConfig}. Morgan Hales will review and approve it for the permanent Facade Library.`,
    });
  };

  const handleAdminApprove = (record: CustomFacadeRecord) => {
    const approved = approveCustomFacadeByAdmin(
      record.id,
      {
        housingCategory: record.housingCategory,
        garageConfig: record.garageConfig,
        minLotWidthM: record.minLotWidthM,
        qldUplift: record.qldUplift,
        nswUplift: record.nswUplift,
        name: record.name,
      },
      staffUser?.name || "Morgan Hales"
    );
    if (approved) {
      if (activeFacade.id === approved.id) {
        setActiveFacade(approved);
      }
      setAllRecords(getAllCustomFacadeRecords());
      toast.success(`Approved & Published "${approved.name}" to Permanent Facade Library!`, {
        description: `Now live in Quoting Tool V2, Floorplan Library, and House & Land Flyer Studio under ${approved.housingCategory} (${approved.garageConfig}).`,
      });
    }
  };

  const handleAdminReject = (record: CustomFacadeRecord) => {
    const rejected = rejectCustomFacadeByAdmin(
      record.id,
      "Please refine roof/cladding contrast or verify garage width proportion before resubmitting.",
      staffUser?.name || "Morgan Hales"
    );
    if (rejected) {
      if (activeFacade.id === rejected.id) {
        setActiveFacade(rejected);
      }
      setAllRecords(getAllCustomFacadeRecords());
      toast.info(`Returned "${rejected.name}" to creator for revision.`);
    }
  };

  const filteredLibraryRecords = useMemo(() => {
    return allRecords.filter((r) => {
      if (libraryFilterCategory !== "All" && r.housingCategory !== libraryFilterCategory) {
        return false;
      }
      if (libraryFilterGarage !== "All" && r.garageConfig !== libraryFilterGarage) {
        return false;
      }
      return true;
    });
  }, [allRecords, libraryFilterCategory, libraryFilterGarage]);

  return (
    <div
      className={`min-h-screen flex flex-col font-sans ${
        isLight ? "bg-slate-50 text-slate-900" : "bg-slate-950 text-slate-100"
      }`}
    >
      {/* Top Navigation Bar */}
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-xl ${
          isLight
            ? "bg-white/90 border-slate-200 shadow-xs"
            : "bg-slate-950/85 border-slate-800"
        }`}
      >
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/hub" className="flex items-center gap-2">
              <HudsonMark size={9} className="sm:hidden" />
              <div className="hidden sm:block">
                <Logo light={!isLight} size={10} />
              </div>
            </Link>
            <div
              className={`hidden md:block border-l pl-3 ${
                isLight ? "border-slate-300" : "border-slate-800"
              }`}
            >
              <span className="text-xs font-black tracking-widest uppercase font-mono">
                Facade Generator
              </span>
              <span className="block text-[10px] tracking-widest text-amber-500 font-bold uppercase">
                AI Architectural Elevation &amp; Render Studio
              </span>
            </div>
          </div>

          {/* Center Quick Navigation Links */}
          <div className="hidden xl:flex items-center gap-1.5">
            <Link
              to="/hub"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                isLight
                  ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                  : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300"
              }`}
            >
              <Home className="h-3.5 w-3.5 text-amber-500" />
              <span>Hub</span>
            </Link>
            <Link
              to="/quote-builder"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                isLight
                  ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                  : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300"
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-emerald-500" />
              <span>Quoting Tool</span>
            </Link>
            <Link
              to="/floorplan-library"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                isLight
                  ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                  : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5 text-indigo-500" />
              <span>Floorplans</span>
            </Link>
            <Link
              to="/flyer"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                isLight
                  ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                  : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300"
              }`}
            >
              <FileText className="h-3.5 w-3.5 text-amber-500" />
              <span>Package Flyers</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {/* State Division Switcher */}
            <div
              className={`inline-flex rounded-full p-0.5 border text-xs font-bold ${
                isLight
                  ? "bg-slate-100 border-slate-200"
                  : "bg-slate-900 border-slate-800"
              }`}
            >
              {(["QLD", "NSW"] as Division[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setActiveDivision(d)}
                  className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                    division === d
                      ? "bg-amber-500 text-slate-950 font-black shadow-xs"
                      : isLight
                      ? "text-slate-600 hover:text-slate-900"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <ThemeToggle />
            <StaffHeaderProfile isLight={isLight} />
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1920px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Top Portal Banner & Mode Switcher Tabs */}
        <div
          className={`rounded-3xl p-5 sm:p-6 border mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
            isLight
              ? "bg-white border-slate-200 shadow-sm"
              : "bg-slate-900/90 border-slate-800 shadow-xl"
          }`}
        >
          <div className="flex items-start sm:items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 flex items-center justify-center shrink-0 shadow-lg">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                  Facade Generator Studio
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-500 border border-amber-500/30">
                  2400×937 Widescreen 4K Studio Engine
                </span>
              </div>
              <p
                className={`text-xs sm:text-sm mt-0.5 ${
                  isLight ? "text-slate-600" : "text-slate-400"
                }`}
              >
                Prompt the Facade Architect AI via text or voice, assign back-end design &amp; garage filters, download high-res renders, or submit for Admin approval into the permanent Facade Library.
              </p>
            </div>
          </div>

          {/* Portal Mode Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              data-testid="tab-facade-studio"
              onClick={() => setActiveTab("studio")}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 border transition-all cursor-pointer ${
                activeTab === "studio"
                  ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md"
                  : isLight
                  ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                  : "bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300"
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>1. Custom Facade Studio</span>
            </button>

            <button
              type="button"
              data-testid="tab-admin-review-queue"
              onClick={() => setActiveTab("admin_queue")}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 border transition-all cursor-pointer ${
                activeTab === "admin_queue"
                  ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-md"
                  : isLight
                  ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                  : "bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>2. Admin Review Queue</span>
              {pendingReviewRecords.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-amber-500 text-slate-950">
                  {pendingReviewRecords.length}
                </span>
              )}
            </button>

            <button
              type="button"
              data-testid="tab-permanent-facade-library"
              onClick={() => setActiveTab("library")}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 border transition-all cursor-pointer ${
                activeTab === "library"
                  ? "bg-indigo-500 text-white border-indigo-400 shadow-md"
                  : isLight
                  ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                  : "bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300"
              }`}
            >
              <BookmarkCheck className="h-4 w-4" />
              <span>3. Permanent &amp; Saved Library ({allRecords.length})</span>
            </button>
          </div>
        </div>

        {/* =====================================================================
            TAB 1: AI FACADE STUDIO & GENERATOR (CLEAN 2-COLUMN SPLIT)
           ===================================================================== */}
        {activeTab === "studio" && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* LEFT 7 COLUMNS: High-Res Render Viewport & Action Controls */}
            <div className="xl:col-span-7 flex flex-col gap-4">
              {/* HERO WIDESCREEN FACADE RENDER CARD */}
              <div
                className={`rounded-3xl border overflow-hidden shadow-xl ${
                  isLight
                    ? "bg-white border-slate-200"
                    : "bg-slate-900 border-slate-800"
                }`}
              >
                {/* Render Viewport (2400x937 / 210:82 Hudson Aspect Ratio) */}
                <div className="relative w-full aspect-[210/82] bg-slate-950 overflow-hidden group">
                  {activeFacade.imageUrl ? (
                    <img
                      src={activeFacade.imageUrl}
                      alt={`${activeFacade.name || "Custom Facade"} Render`}
                      fetchPriority="high"
                      width={2400}
                      height={937}
                      className={`w-full h-full object-cover object-center transition-all duration-300 ${
                        isRendering || isAiThinking ? "opacity-60 scale-[1.01] blur-[1px]" : "opacity-100 scale-100"
                      }`}
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
                      <div className="relative mb-3">
                        <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                          <Building2 className="h-8 w-8 sm:h-10 sm:w-10 opacity-80" />
                        </div>
                        <Sparkles className="h-5 w-5 text-amber-400 absolute -top-1 -right-1 animate-pulse" />
                      </div>
                      <h3 className="text-base sm:text-lg font-black tracking-tight text-white mb-1">
                        Facade Render Canvas Ready
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-400 max-w-md leading-relaxed px-4">
                        Describe the facade you'd like to create in the chat on the right. Your new custom render will be generated and deployed here.
                      </p>
                      <div className="mt-3 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-[10px] sm:text-[11px] font-mono text-amber-300/90">
                        AI &amp; API 4K Render Engine • Awaiting Prompt
                      </div>
                    </div>
                  )}

                  {(isRendering || isAiThinking) && (
                    <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-20">
                      <Sparkles className="h-9 w-9 text-amber-400 animate-spin" />
                      <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-white font-mono">
                        Creating New Facade Render...
                      </span>
                      <span className="text-[11px] text-amber-400/90 font-mono">
                        Synthesizing genuine architectural elevation via AI &amp; API
                      </span>
                    </div>
                  )}

                  {/* Top-Left Back-End Filter & Style Badges (only when image is rendered) */}
                  {activeFacade.imageUrl && (
                    <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-10">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-slate-950/85 text-amber-400 border border-amber-500/40 backdrop-blur-md font-mono">
                        {activeFacade.housingCategory} • {activeFacade.garageConfig}
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-950/80 text-white border border-slate-700 backdrop-blur-md">
                        {activeFacade.style}
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/90 text-slate-950">
                        Min {activeFacade.minLotWidthM}m Lot
                      </span>
                    </div>
                  )}

                  {/* Top-Right Status & Enlarge Button */}
                  {activeFacade.imageUrl && (
                    <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-black uppercase tracking-wider ${
                          activeFacade.status === "approved"
                            ? "bg-emerald-500 text-slate-950"
                            : activeFacade.status === "pending_review"
                            ? "bg-amber-500 text-slate-950"
                            : "bg-slate-900/85 text-slate-200 border border-slate-700"
                        }`}
                      >
                        {activeFacade.status === "approved"
                          ? "✓ Approved in Library"
                          : activeFacade.status === "pending_review"
                          ? "⏳ Pending Admin Review"
                          : "Draft Workspace"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEnlargedPreviewUrl(activeFacade.imageUrl)}
                        className="p-2 rounded-full bg-slate-950/80 hover:bg-slate-900 text-white border border-slate-700 cursor-pointer transition-all"
                        title="Inspect Fullscreen 2400×937 Render"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* Bottom Material & Lighting Overlay Strip (only when image is rendered) */}
                  {activeFacade.imageUrl && (
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950/95 via-slate-950/65 to-transparent px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1.5 font-semibold">
                          <span
                            className="h-3 w-3 rounded-full border border-white/40 inline-block"
                            style={{ backgroundColor: activeFacade.materials.roofColorHex }}
                          />
                          Roof: {activeFacade.materials.roofColorName}
                        </span>
                        <span className="opacity-40">•</span>
                        <span className="flex items-center gap-1.5 font-semibold">
                          <span
                            className="h-3 w-3 rounded-full border border-white/40 inline-block"
                            style={{ backgroundColor: activeFacade.materials.wallRenderHex }}
                          />
                          Wall: {activeFacade.materials.wallRenderName}
                        </span>
                        <span className="opacity-40">•</span>
                        <span className="flex items-center gap-1.5 font-semibold">
                          <span
                            className="h-3 w-3 rounded-full border border-white/40 inline-block"
                            style={{ backgroundColor: activeFacade.materials.brickworkHex }}
                          />
                          Brick: {activeFacade.materials.brickworkName}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-amber-300 font-bold">
                        {activeFacade.materials.lightingMood}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Bar: Name Input, Download Render, Save Draft, Add for Review by Admin */}
                <div
                  className={`p-4 sm:p-5 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isLight ? "bg-slate-50/70 border-slate-200" : "bg-slate-950/60 border-slate-800"
                  }`}
                >
                  <div className="flex-1 flex items-center gap-2.5">
                    <div className="flex-1">
                      <label className="block text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400 mb-1">
                        Custom Facade Name
                      </label>
                      <input
                        type="text"
                        data-testid="facade-name-input"
                        value={activeFacade.name}
                        onChange={(e) =>
                          setActiveFacade((prev) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="e.g. Modern Horizon 12.5"
                        className={`w-full px-3.5 py-2 rounded-xl border text-sm font-extrabold focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                          isLight
                            ? "bg-white border-slate-300 text-slate-900"
                            : "bg-slate-900 border-slate-700 text-white"
                        }`}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const fresh = createInitialBlankFacade(staffUser, division);
                        setActiveFacade(fresh);
                        toast.info("Started a fresh blank custom facade workspace.");
                      }}
                      className={`mt-5 px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                        isLight
                          ? "bg-white hover:bg-slate-100 border-slate-300 text-slate-700"
                          : "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300"
                      }`}
                      title="Start New Blank Custom Facade"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">New</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:mt-5">
                    <button
                      type="button"
                      data-testid="download-facade-render-btn"
                      disabled={!activeFacade.imageUrl}
                      onClick={() => handleDownloadFacadeImage(activeFacade)}
                      className={`px-3.5 py-2.5 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                        !activeFacade.imageUrl
                          ? "opacity-40 cursor-not-allowed border-slate-700 text-slate-500"
                          : isLight
                          ? "bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-xs cursor-pointer"
                          : "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-100 cursor-pointer"
                      }`}
                    >
                      <Download className="h-4 w-4 text-cyan-500" />
                      <span>Download Render</span>
                    </button>

                    <button
                      type="button"
                      disabled={!activeFacade.imageUrl}
                      onClick={handleSaveDraft}
                      className={`px-3.5 py-2.5 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                        !activeFacade.imageUrl
                          ? "opacity-40 cursor-not-allowed border-slate-700 text-slate-500"
                          : isLight
                          ? "bg-white hover:bg-slate-100 border-slate-300 text-slate-800 cursor-pointer"
                          : "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200 cursor-pointer"
                      }`}
                    >
                      <Check className="h-4 w-4 text-emerald-500" />
                      <span>Save Draft</span>
                    </button>

                    <button
                      type="button"
                      data-testid="submit-admin-review-btn"
                      disabled={!activeFacade.imageUrl}
                      onClick={handleSubmitForAdminReview}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all ${
                        !activeFacade.imageUrl
                          ? "opacity-40 cursor-not-allowed bg-slate-800 text-slate-500"
                          : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 cursor-pointer active:scale-95"
                      }`}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span>Add for Review by Admin</span>
                    </button>

                    {isAdmin && activeFacade.imageUrl && activeFacade.status !== "approved" && (
                      <button
                        type="button"
                        data-testid="instant-admin-approve-btn"
                        onClick={() => {
                          saveCustomFacadeRecord(activeFacade);
                          handleAdminApprove(activeFacade);
                        }}
                        className="px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                        title="Admin Direct Approve & Publish to Permanent Library"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Approve to Library</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT 5 COLUMNS: TAILORED FACADE ARCHITECT AI AGENT (TEXT & VOICE CHAT) */}
            <div className="xl:col-span-5 flex flex-col">
              <div
                data-testid="facade-ai-chat"
                className={`rounded-3xl border flex flex-col h-[780px] overflow-hidden shadow-xl ${
                  isLight
                    ? "bg-white border-slate-200"
                    : "bg-slate-900 border-slate-800"
                }`}
              >
                {/* AI Agent Header */}
                <div
                  className={`p-4 sm:p-5 border-b flex items-center justify-between gap-3 ${
                    isLight
                      ? "bg-gradient-to-r from-amber-50 to-orange-50/50 border-slate-200"
                      : "bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/30 border-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm sm:text-base font-black">
                          Hudson Facade Architect AI
                        </h2>
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Expert in Facade Styles, Colours, Realism &amp; All 62+ Hudson Designs/Widths
                      </p>
                    </div>
                  </div>

                  {/* Voice Control Button */}
                  <button
                    type="button"
                    data-testid="facade-voice-btn"
                    onClick={handleToggleVoiceControl}
                    className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      isListeningVoice
                        ? "bg-rose-500 text-white border-rose-400 animate-pulse shadow-lg"
                        : isLight
                        ? "bg-white hover:bg-slate-100 border-slate-300 text-slate-700"
                        : "bg-slate-950 hover:bg-slate-800 border-slate-700 text-amber-400"
                    }`}
                    title="Prompt the AI with your voice"
                  >
                    {isListeningVoice ? (
                      <>
                        <MicOff className="h-4 w-4" />
                        <span>Stop Voice</span>
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4" />
                        <span>Voice Control</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Chat Transcript Scroll Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        msg.role === "user" ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`max-w-[92%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                          msg.role === "user"
                            ? "bg-amber-500 text-slate-950 font-bold"
                            : isLight
                            ? "bg-slate-100 text-slate-800 border border-slate-200"
                            : "bg-slate-950/90 text-slate-200 border border-slate-800"
                        }`}
                      >
                        <div className="whitespace-pre-line">{msg.text}</div>

                        {/* Applied Changes Pills */}
                        {msg.appliedChanges && msg.appliedChanges.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-slate-700/30 flex flex-wrap gap-1.5">
                            {msg.appliedChanges.map((change, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              >
                                ✓ {change}
                              </span>
                            ))}
                          </div>
                        )}

                      </div>
                    </div>
                  ))}

                  {isAiThinking && (
                    <div className="flex items-center gap-2 text-xs text-amber-400 font-mono px-2">
                      <Sparkles className="h-4 w-4 animate-spin" />
                      <span>Facade Architect AI is tailoring your elevation &amp; rendering 2400×937 frame...</span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input Bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleSendChatPrompt();
                  }}
                  className={`p-3.5 border-t flex items-center gap-2 ${
                    isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-slate-800"
                  }`}
                >
                  <button
                    type="button"
                    onClick={handleToggleVoiceControl}
                    className={`p-2.5 rounded-xl border shrink-0 cursor-pointer transition-all ${
                      isListeningVoice
                        ? "bg-rose-500 text-white border-rose-400 animate-pulse"
                        : isLight
                        ? "bg-white hover:bg-slate-100 border-slate-300 text-slate-600"
                        : "bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300"
                    }`}
                    title="Voice Input"
                  >
                    <Mic className="h-4 w-4" />
                  </button>

                  <input
                    type="text"
                    data-testid="facade-chat-input"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="e.g. Create a new facade render for a 12.5m frontage lot, single storey, with light colours and modern style"
                    className={`flex-1 px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      isLight
                        ? "bg-white border-slate-300 text-slate-900"
                        : "bg-slate-900 border-slate-700 text-white"
                    }`}
                  />

                  <button
                    type="submit"
                    data-testid="facade-chat-send-btn"
                    disabled={!chatInput.trim() || isAiThinking}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
                  >
                    <Send className="h-4 w-4" />
                    <span>Generate</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 2: ADMIN REVIEW QUEUE (APPROVE & PUBLISH TO PERMANENT FACADE LIBRARY)
           ===================================================================== */}
        {activeTab === "admin_queue" && (
          <div className="space-y-6">
            <div
              className={`rounded-3xl p-6 border ${
                isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-700/20">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-400" />
                    <h2 className="text-lg sm:text-xl font-black">
                      Admin Facade Review &amp; Permanent Library Approval Queue
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Review high-resolution custom facades submitted by staff. Verify their back-end filters (e.g., Single Storey Double Garage, Narrow Double Storey Single Garage) and approve them to publish directly into the permanent Facade Library for Quoting &amp; Packages.
                  </p>
                </div>
                <span className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                  {pendingReviewRecords.length} Pending Submission{pendingReviewRecords.length === 1 ? "" : "s"}
                </span>
              </div>

              {pendingReviewRecords.length === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
                  <h3 className="text-base font-bold">All Submitted Facades Have Been Reviewed</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Use the Custom Facade Studio tab to design a new facade and click &ldquo;Add for Review by Admin&rdquo;.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                  {pendingReviewRecords.map((item) => (
                    <div
                      key={item.id}
                      data-testid={`admin-review-card-${item.id}`}
                      className={`rounded-2xl border overflow-hidden flex flex-col justify-between ${
                        isLight
                          ? "bg-slate-50 border-slate-200"
                          : "bg-slate-950 border-slate-800"
                      }`}
                    >
                      <div>
                        <div className="relative aspect-[210/82] bg-slate-950 overflow-hidden">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            loading="lazy"
                            className="w-full h-full object-cover object-center"
                          />
                          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-extrabold bg-slate-950/85 text-amber-400 border border-amber-500/40">
                              {item.housingCategory} • {item.garageConfig}
                            </span>
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500 text-slate-950">
                              Min {item.minLotWidthM}m Lot
                            </span>
                          </div>
                        </div>

                        <div className="p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-base sm:text-lg font-black">{item.name}</h3>
                              <p className="text-xs text-slate-400 mt-0.5">
                                Submitted by <strong>{item.createdBy.name}</strong> ({item.createdBy.division}) • Style: <strong>{item.style}</strong>
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDownloadFacadeImage(item)}
                              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                                isLight
                                  ? "bg-white border-slate-300 text-slate-700"
                                  : "bg-slate-900 border-slate-700 text-slate-200"
                              }`}
                            >
                              <Download className="h-3.5 w-3.5 text-cyan-400" />
                              <span>Download</span>
                            </button>
                          </div>

                          <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">
                            {item.description}
                          </p>

                          {/* Editable Back-End Filter & Pricing Controls for Admin before Approval */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-slate-700/20">
                            <div>
                              <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
                                Category Filter
                              </label>
                              <select
                                value={item.housingCategory}
                                onChange={(e) => {
                                  const updated: CustomFacadeRecord = {
                                    ...item,
                                    housingCategory: e.target.value as FacadeHousingCategory,
                                  };
                                  saveCustomFacadeRecord(updated);
                                  setAllRecords(getAllCustomFacadeRecords());
                                }}
                                className={`w-full px-2 py-1.5 rounded-lg border text-xs font-bold ${
                                  isLight
                                    ? "bg-white border-slate-300 text-slate-900"
                                    : "bg-slate-900 border-slate-700 text-white"
                                }`}
                              >
                                {HOUSING_CATEGORIES.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
                                Garage Filter
                              </label>
                              <select
                                value={item.garageConfig}
                                onChange={(e) => {
                                  const updated: CustomFacadeRecord = {
                                    ...item,
                                    garageConfig: e.target.value as FacadeGarageConfig,
                                  };
                                  saveCustomFacadeRecord(updated);
                                  setAllRecords(getAllCustomFacadeRecords());
                                }}
                                className={`w-full px-2 py-1.5 rounded-lg border text-xs font-bold ${
                                  isLight
                                    ? "bg-white border-slate-300 text-slate-900"
                                    : "bg-slate-900 border-slate-700 text-white"
                                }`}
                              >
                                {GARAGE_CONFIGS.map((g) => (
                                  <option key={g} value={g}>
                                    {g}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
                                QLD Uplift ($)
                              </label>
                              <input
                                type="number"
                                value={item.qldUplift}
                                onChange={(e) => {
                                  const updated: CustomFacadeRecord = {
                                    ...item,
                                    qldUplift: Number(e.target.value) || 0,
                                  };
                                  saveCustomFacadeRecord(updated);
                                  setAllRecords(getAllCustomFacadeRecords());
                                }}
                                className={`w-full px-2 py-1.5 rounded-lg border text-xs font-bold font-mono ${
                                  isLight
                                    ? "bg-white border-slate-300 text-slate-900"
                                    : "bg-slate-900 border-slate-700 text-white"
                                }`}
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-mono uppercase text-slate-400 font-bold mb-1">
                                NSW Uplift ($)
                              </label>
                              <input
                                type="number"
                                value={item.nswUplift}
                                onChange={(e) => {
                                  const updated: CustomFacadeRecord = {
                                    ...item,
                                    nswUplift: Number(e.target.value) || 0,
                                  };
                                  saveCustomFacadeRecord(updated);
                                  setAllRecords(getAllCustomFacadeRecords());
                                }}
                                className={`w-full px-2 py-1.5 rounded-lg border text-xs font-bold font-mono ${
                                  isLight
                                    ? "bg-white border-slate-300 text-slate-900"
                                    : "bg-slate-900 border-slate-700 text-white"
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Admin Approval Footer Actions */}
                      <div
                        className={`p-4 border-t flex items-center justify-between gap-2 ${
                          isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setActiveFacade(item);
                            setActiveTab("studio");
                          }}
                          className={`px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                            isLight
                              ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                              : "bg-slate-950 hover:bg-slate-800 border-slate-700 text-slate-300"
                          }`}
                        >
                          Open in Studio
                        </button>

                        {isAdmin ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleAdminReject(item)}
                              className="px-3.5 py-2 rounded-xl border border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold cursor-pointer"
                            >
                              Request Changes
                            </button>
                            <button
                              type="button"
                              data-testid={`approve-facade-btn-${item.id}`}
                              onClick={() => handleAdminApprove(item)}
                              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Approve &amp; Add to Facade Library</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-mono text-amber-500 font-bold">
                            ⏳ Awaiting Morgan Hales (Admin) Approval
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 3: PERMANENT APPROVED & SAVED CUSTOM FACADE LIBRARY
           ===================================================================== */}
        {activeTab === "library" && (
          <div className="space-y-6 heavy-section-deferred">
            <div
              className={`rounded-3xl p-6 border ${
                isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-700/20">
                <div>
                  <h2 className="text-lg sm:text-xl font-black">
                    Permanent Approved &amp; Custom Facade Library ({filteredLibraryRecords.length})
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                    Approved facades are automatically synced to the permanent Facade Library for Quoting Tool V2, Floorplan Library, and House &amp; Land Flyers. Any user can also download high-resolution renders directly.
                  </p>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={libraryFilterCategory}
                    onChange={(e) => setLibraryFilterCategory(e.target.value)}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900"
                        : "bg-slate-950 border-slate-700 text-white"
                    }`}
                  >
                    <option value="All">All Design Categories</option>
                    {HOUSING_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <select
                    value={libraryFilterGarage}
                    onChange={(e) => setLibraryFilterGarage(e.target.value)}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900"
                        : "bg-slate-950 border-slate-700 text-white"
                    }`}
                  >
                    <option value="All">All Garage Types</option>
                    {GARAGE_CONFIGS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-6">
                {filteredLibraryRecords.map((rec) => (
                  <div
                    key={rec.id}
                    className={`rounded-2xl border overflow-hidden flex flex-col justify-between ${
                      isLight
                        ? "bg-slate-50 border-slate-200"
                        : "bg-slate-950 border-slate-800"
                    }`}
                  >
                    <div>
                      <div className="relative aspect-[210/82] bg-slate-950 overflow-hidden">
                        <img
                          src={rec.imageUrl}
                          alt={rec.name}
                          loading="lazy"
                          className="w-full h-full object-cover object-center"
                        />
                        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-950/85 text-amber-400 border border-amber-500/40">
                            {rec.housingCategory} • {rec.garageConfig}
                          </span>
                        </div>
                        <div className="absolute top-2.5 right-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black uppercase ${
                              rec.status === "approved"
                                ? "bg-emerald-500 text-slate-950"
                                : rec.status === "pending_review"
                                ? "bg-amber-500 text-slate-950"
                                : "bg-slate-800 text-slate-300"
                            }`}
                          >
                            {rec.status === "approved"
                              ? "✓ Permanent Library"
                              : rec.status === "pending_review"
                              ? "Pending Admin"
                              : "Draft"}
                          </span>
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-base font-black">{rec.name}</h3>
                          <span className="text-xs font-mono font-bold text-emerald-500">
                            +${(division === "NSW" ? rec.nswUplift : rec.qldUplift).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {rec.description}
                        </p>
                        <div className="mt-2.5 flex flex-wrap gap-1">
                          {rec.compatibleFamilies.slice(0, 4).map((f) => (
                            <span
                              key={f}
                              className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`p-3.5 border-t flex items-center justify-between gap-2 ${
                        isLight ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveFacade(rec);
                          setActiveTab("studio");
                          toast.info(`Loaded "${rec.name}" into the Facade Generator Studio.`);
                        }}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer ${
                          isLight
                            ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800"
                            : "bg-slate-950 hover:bg-slate-800 border-slate-700 text-slate-200"
                        }`}
                      >
                        Edit in Studio
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDownloadFacadeImage(rec)}
                          className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Download</span>
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              deleteCustomFacadeRecord(rec.id);
                              setAllRecords(getAllCustomFacadeRecords());
                              toast.info(`Removed "${rec.name}"`);
                            }}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 cursor-pointer"
                            title="Delete Custom Facade"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Fullscreen Lightbox Modal for High-Res 2400x937 Render Inspection */}
      {enlargedPreviewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setEnlargedPreviewUrl(null)}
        >
          <div
            className="max-w-6xl w-full rounded-3xl overflow-hidden border border-slate-700 bg-slate-950 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between text-white">
              <div>
                <h3 className="text-sm font-black">{activeFacade.name} — 2400×937 Widescreen Studio Render</h3>
                <p className="text-xs text-slate-400">
                  {activeFacade.housingCategory} • {activeFacade.garageConfig} • {activeFacade.style}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadFacadeImage(activeFacade)}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download High-Res</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEnlargedPreviewUrl(null)}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <img
              src={enlargedPreviewUrl}
              alt="Enlarged High-Res Facade Render"
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
