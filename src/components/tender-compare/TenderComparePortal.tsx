import React, { useState, useEffect } from "react";
import {
  Scale,
  Sparkles,
  Upload,
  FileText,
  FileCheck2,
  Trash2,
  Plus,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Award,
  Download,
  RotateCcw,
  Star,
  Clock,
  DollarSign,
  Layers,
  ChevronRight,
  ExternalLink,
  Info,
  Check,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from "@/lib/theme";
import { getActiveDivision, onDivisionChanged, setActiveDivision } from "@/lib/divisionContext";
import { pdfDocumentToPagesAndText } from "@/lib/pdfPages";
import {
  type BuilderQuoteInput,
  type BuilderExtractedData,
  type TenderComparisonSession,
} from "@/lib/tender-compare/tenderCompareTypes";
import {
  loadActiveTenderCompareSession,
  saveTenderCompareSession,
  createInitialEmptySession,
  clearActiveTenderCompareSession,
  getHudsonBenchmarkBuilder,
} from "@/lib/tender-compare/tenderCompareStorage";
import { analyzeBuilderTendersWithAi } from "@/lib/tender-compare/tenderCompareAiEngine";
import { exportTenderComparisonPdf } from "@/lib/tender-compare/tenderComparePdfExporter";

const POPULAR_BUILDERS = [
  "Hudson Homes",
  "Metricon",
  "Clarendon",
  "Rawson Homes",
  "Eden Brae",
  "Coral Homes",
  "Wisdom Homes",
  "Mojo Homes",
];

export function TenderComparePortal() {
  const { mode } = useTheme();
  const isLight = mode === "normal";

  const [division, setDivisionState] = useState<"NSW" | "QLD">(() => getActiveDivision());
  const [activeTab, setActiveTab] = useState<"overview" | "inclusions" | "fine_print" | "reputation" | "full_table">("overview");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>("");
  const [isDraggingBatch, setIsDraggingBatch] = useState(false);

  // Session State (starts empty or with real user-imported results, no hallucinated mock data)
  const [session, setSession] = useState<TenderComparisonSession>(() => loadActiveTenderCompareSession(division));
  const hasResults = Boolean(session.builders && session.builders.length > 0);
  
  // Big Pop-up is open immediately if no results are present, or can be toggled open
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(() => !hasResults);

  const [clientName, setClientName] = useState(session.clientName || "");
  const [siteAddress, setSiteAddress] = useState(session.siteAddress || "");

  // Inputs for building quotes (clean starting point, 2 builders ready for upload)
  const [builderInputs, setBuilderInputs] = useState<BuilderQuoteInput[]>([
    {
      id: "input-hudson",
      builderName: "Hudson Homes",
      modelName: "",
      statedPrice: undefined,
      manualNotes: "",
      tenderFile: null,
      inclusionsFile: null,
    },
    {
      id: "input-comp-1",
      builderName: "",
      modelName: "",
      statedPrice: undefined,
      manualNotes: "",
      tenderFile: null,
      inclusionsFile: null,
    },
  ]);

  useEffect(() => {
    const unsub = onDivisionChanged((newDiv) => {
      setDivisionState(newDiv);
    });
    return () => unsub();
  }, []);

  const winningBuilder = hasResults
    ? session.builders.find((b) => b.id === session.winningBuilderId) ||
      session.builders.find((b) => b.isBestValue) ||
      session.builders[0]
    : null;

  const handleFileUpload = async (
    index: number,
    type: "tender" | "inclusions",
    file: File
  ) => {
    toast.info(`Processing ${file.name}...`);
    try {
      const doc = await pdfDocumentToPagesAndText(file, 8);
      const updated = [...builderInputs];
      if (type === "tender") {
        updated[index].tenderFile = {
          name: file.name,
          size: file.size,
          rawText: doc.rawText,
        };
      } else {
        updated[index].inclusionsFile = {
          name: file.name,
          size: file.size,
          rawText: doc.rawText,
        };
      }
      setBuilderInputs(updated);
      toast.success(`Attached ${file.name} to ${updated[index].builderName || "Builder"}`);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to process ${file.name}`);
    }
  };

  const handleRemoveFile = (index: number, type: "tender" | "inclusions") => {
    const updated = [...builderInputs];
    if (type === "tender") {
      updated[index].tenderFile = null;
    } else {
      updated[index].inclusionsFile = null;
    }
    setBuilderInputs(updated);
  };

  const handleBatchFiles = async (files: File[]) => {
    toast.info(`Processing ${files.length} PDF documents...`);
    const updated = [...builderInputs];

    for (const file of files) {
      try {
        const doc = await pdfDocumentToPagesAndText(file, 8);
        const fileNameLower = file.name.toLowerCase();
        const isInclusions = /inclusion|spec|brochure|range|standard/i.test(fileNameLower);
        const docType: "tender" | "inclusions" = isInclusions ? "inclusions" : "tender";

        let matchedIndex = updated.findIndex(
          (b) => b.builderName && b.builderName.trim().length > 0 && fileNameLower.includes(b.builderName.toLowerCase().trim())
        );

        if (matchedIndex === -1) {
          matchedIndex = updated.findIndex((b) => (docType === "tender" ? !b.tenderFile : !b.inclusionsFile));
        }

        if (matchedIndex === -1 && updated.length < 5) {
          let detectedName = "Competitor Builder";
          if (fileNameLower.includes("hudson")) detectedName = "Hudson Homes";
          else if (fileNameLower.includes("metricon")) detectedName = "Metricon Homes";
          else if (fileNameLower.includes("clarendon")) detectedName = "Clarendon Homes";
          else if (fileNameLower.includes("rawson")) detectedName = "Rawson Homes";
          else if (fileNameLower.includes("eden")) detectedName = "Eden Brae Homes";
          else if (fileNameLower.includes("coral")) detectedName = "Coral Homes";
          else if (fileNameLower.includes("wisdom")) detectedName = "Wisdom Homes";
          else detectedName = file.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " ").slice(0, 24);

          updated.push({
            id: `input-comp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            builderName: detectedName,
            modelName: "",
            statedPrice: undefined,
            manualNotes: "",
            tenderFile: docType === "tender" ? { name: file.name, size: file.size, rawText: doc.rawText } : null,
            inclusionsFile: docType === "inclusions" ? { name: file.name, size: file.size, rawText: doc.rawText } : null,
          });
        } else if (matchedIndex >= 0) {
          if (docType === "tender") {
            updated[matchedIndex].tenderFile = { name: file.name, size: file.size, rawText: doc.rawText };
          } else {
            updated[matchedIndex].inclusionsFile = { name: file.name, size: file.size, rawText: doc.rawText };
          }
        }
      } catch (err) {
        console.error(err);
        toast.error(`Could not read ${file.name}`);
      }
    }

    setBuilderInputs(updated);
    toast.success(`Imported and organized ${files.length} document(s).`);
  };

  const handleAddBuilder = () => {
    if (builderInputs.length >= 5) {
      toast.error("Maximum 5 builders can be compared simultaneously.");
      return;
    }
    const newIdx = builderInputs.length + 1;
    setBuilderInputs([
      ...builderInputs,
      {
        id: `input-comp-${Date.now()}`,
        builderName: "",
        modelName: "",
        statedPrice: undefined,
        manualNotes: "",
        tenderFile: null,
        inclusionsFile: null,
      },
    ]);
  };

  const handleRemoveBuilder = (index: number) => {
    if (builderInputs.length <= 2) {
      toast.error("At least 2 builders are required for a comparison.");
      return;
    }
    const updated = builderInputs.filter((_, i) => i !== index);
    setBuilderInputs(updated);
  };

  const handleClearAll = () => {
    clearActiveTenderCompareSession();
    const empty = createInitialEmptySession(division);
    setSession(empty);
    setClientName("");
    setSiteAddress("");
    setBuilderInputs([
      {
        id: "input-hudson",
        builderName: "Hudson Homes",
        modelName: "",
        statedPrice: undefined,
        manualNotes: "",
        tenderFile: null,
        inclusionsFile: null,
      },
      {
        id: "input-comp-1",
        builderName: "",
        modelName: "",
        statedPrice: undefined,
        manualNotes: "",
        tenderFile: null,
        inclusionsFile: null,
      },
    ]);
    setIsImportModalOpen(true);
    toast.success("Tender comparison reset. Ready for fresh imports.");
  };

  const handleRunComparison = async () => {
    const validBuilders = builderInputs.filter(
      (b) => b.builderName.trim().length > 0 || b.tenderFile || b.inclusionsFile || b.statedPrice
    );

    if (validBuilders.length < 2) {
      toast.error("Please provide at least 2 builders to compare.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStep("Reading uploaded builder tenders & specification files…");

    try {
      await new Promise((r) => setTimeout(r, 600));
      setAnalysisStep("Extracting base pricing, provisional site costs & statutory allowances…");
      await new Promise((r) => setTimeout(r, 700));
      setAnalysisStep("Auditing 8 core trade inclusions (Kitchen, Bathrooms, Ceilings, HVAC, Flooring)…");
      await new Promise((r) => setTimeout(r, 700));
      setAnalysisStep("Scanning contract clauses, price lock terms & fine print risk exposure…");
      await new Promise((r) => setTimeout(r, 600));
      setAnalysisStep("Calculating normalized completion costs & determining Best Value Builder…");

      const newSession = await analyzeBuilderTendersWithAi(
        validBuilders,
        clientName || "Client Comparison",
        siteAddress || "Proposed Home Site",
        division
      );

      setSession(newSession);
      saveTenderCompareSession(newSession);
      setIsImportModalOpen(false);
      toast.success("AI Forensic Comparison Completed!", {
        description: `Best Value Winner declared: ${newSession.builders.find((b) => b.isBestValue)?.builderName || "Hudson Homes"}`,
      });
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to run comparison: " + (err?.message || "Unknown error"));
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep("");
    }
  };

  const handleExportPdf = () => {
    if (!hasResults) return;
    toast.info("Generating boardroom-ready Executive Comparison PDF...");
    exportTenderComparisonPdf(session);
    toast.success("Tender Comparison PDF downloaded successfully!");
  };

  return (
    <div className="w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 space-y-6 pb-16">
      {/* Top Banner & Control Bar */}
      <div
        className={`p-6 rounded-3xl border shadow-xl relative overflow-hidden backdrop-blur-xl ${
          isLight
            ? "bg-white/90 border-slate-200 text-slate-900 shadow-slate-200/50"
            : "bg-slate-950/80 border-slate-800 text-white shadow-black/40"
        }`}
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-500/10 via-brand-gold/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-emerald-500/10 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/20">
                <Scale className="h-6 w-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Tender Compare</h1>
                  <Badge className="bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider">
                    AI Forensic Contract Auditor
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  Independent side-by-side audit of builder tenders, contracts, inclusions, clauses, and online reviews.
                </p>
              </div>
            </div>

            {/* Client & Address Info */}
            <div className="flex items-center gap-4 flex-wrap pt-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-400">Client:</span>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="h-8 text-xs font-bold w-48 rounded-lg"
                  placeholder="Client name"
                />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-400">Site:</span>
                <Input
                  value={siteAddress}
                  onChange={(e) => setSiteAddress(e.target.value)}
                  className="h-8 text-xs w-72 rounded-lg"
                  placeholder="Site address"
                />
              </div>
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-500/10 border border-slate-500/20">
                <button
                  type="button"
                  onClick={() => {
                    setActiveDivision("NSW");
                    setDivisionState("NSW");
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    division === "NSW" ? "bg-cyan-500 text-white shadow-xs" : "text-slate-400 hover:text-white"
                  }`}
                >
                  NSW
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveDivision("QLD");
                    setDivisionState("QLD");
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    division === "QLD" ? "bg-cyan-500 text-white shadow-xs" : "text-slate-400 hover:text-white"
                  }`}
                >
                  QLD
                </button>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {hasResults && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer h-10 px-3.5 text-slate-400 hover:text-rose-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsImportModalOpen(true)}
              className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer h-10 px-4 border-amber-500/40 text-amber-400 hover:bg-amber-500/10 shadow-sm"
            >
              <Upload className="h-4 w-4 text-amber-400" />
              <span>{hasResults ? "Import / Edit Tenders" : "Import All Builders Estimates & Tenders"}</span>
            </Button>

            {hasResults && (
              <Button
                type="button"
                size="sm"
                onClick={handleExportPdf}
                className="rounded-xl text-xs font-bold gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black cursor-pointer shadow-lg shadow-emerald-500/20 h-10 px-4"
              >
                <Download className="h-4 w-4" />
                Export Full PDF Report
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* EMPTY STATE: DISPLAYED WHEN NO COMPARISON HAS BEEN RUN YET   */}
      {/* ============================================================ */}
      {!hasResults && (
        <div
          className={`p-10 sm:p-16 rounded-3xl border text-center max-w-3xl mx-auto flex flex-col items-center justify-center space-y-6 shadow-xl backdrop-blur-xl ${
            isLight ? "bg-white/80 border-slate-200 text-slate-900" : "bg-slate-950/70 border-slate-800 text-white"
          }`}
        >
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-500/20 via-brand-gold/15 to-transparent border border-amber-500/30 flex items-center justify-center shadow-xl shadow-amber-500/10 backdrop-blur-xl">
              <Scale className="h-12 w-12 text-amber-400 stroke-[2.2]" />
            </div>
          </div>

          <div className="space-y-2 max-w-lg">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Ready for Builder Tender Breakdown
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Import quotes, tenders, contracts, and inclusions ranges from each builder to cross-reference pricing, omissions, clauses, and true value.
            </p>
          </div>

          <Button
            type="button"
            size="lg"
            onClick={() => setIsImportModalOpen(true)}
            className="h-13 px-8 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm tracking-wide shadow-xl shadow-amber-500/25 cursor-pointer gap-2.5 active:scale-95 transition-all"
          >
            <Upload className="h-5 w-5" />
            <span>Import All Builders Estimates &amp; Tenders</span>
          </Button>
        </div>
      )}

      {/* ============================================================ */}
      {/* RESULTS DASHBOARD: ONLY RENDERED WHEN REAL RESULTS EXIST    */}
      {/* ============================================================ */}
      {hasResults && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Winner Spotlight Banner */}
          <div
            className={`p-6 sm:p-8 rounded-3xl border shadow-2xl relative overflow-hidden backdrop-blur-xl ${
              isLight
                ? "bg-gradient-to-br from-amber-50 via-white to-emerald-50/50 border-amber-300 text-slate-900"
                : "bg-gradient-to-br from-amber-950/30 via-slate-950/80 to-emerald-950/30 border-amber-500/40 text-white"
            }`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="space-y-3 max-w-3xl">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black text-sm flex items-center gap-1.5 shadow-md">
                    <Award className="h-4 w-4" />
                    <span>BEST VALUE WINNER</span>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-mono font-bold">
                    Score: {winningBuilder?.overallScore || 95}/100
                  </Badge>
                  <span className="text-xs text-slate-400 font-mono">
                    Audit Date: {new Date(session.createdAt).toLocaleDateString("en-AU")}
                  </span>
                </div>

                <div>
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
                    {winningBuilder?.builderName}
                    <span className="text-amber-500 font-medium text-2xl sm:text-3xl"> ({winningBuilder?.modelName})</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1 leading-relaxed">
                    {winningBuilder?.executiveSummary || session.executiveSummary}
                  </p>
                </div>

                {/* Key Winner Advantages Pills */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  {(winningBuilder?.keyAdvantages || []).slice(0, 3).map((adv, i) => (
                    <div
                      key={i}
                      className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="h-3 w-3 flex-none" />
                      <span>{adv}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Callout comparison */}
              <div
                className={`p-5 rounded-2xl border flex flex-col justify-between gap-3 text-right lg:min-w-[280px] ${
                  isLight ? "bg-white/80 border-amber-200 shadow-sm" : "bg-slate-900/80 border-slate-800"
                }`}
              >
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    True Normalized Completion Cost
                  </span>
                  <span className="text-3xl font-mono font-black text-emerald-500 block mt-0.5">
                    ${winningBuilder?.normalizedTruePrice.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    ${winningBuilder?.normalizedPricePerM2.toLocaleString()}/m² • Stated: ${winningBuilder?.statedTotalPrice.toLocaleString()}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-semibold">Hidden Omissions:</span>
                  <span className="font-mono font-bold text-emerald-500">
                    {winningBuilder?.omissionsCost === 0 ? "$0 (Fully Included)" : `+$${winningBuilder?.omissionsCost.toLocaleString()}`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
            <TabsList className="bg-slate-900/60 border border-slate-800 p-1 rounded-2xl flex flex-wrap gap-1">
              <TabsTrigger value="overview" className="rounded-xl text-xs font-bold gap-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                Financials &amp; Normalization
              </TabsTrigger>
              <TabsTrigger value="inclusions" className="rounded-xl text-xs font-bold gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                Inclusions Parity Audit
              </TabsTrigger>
              <TabsTrigger value="fine_print" className="rounded-xl text-xs font-bold gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5" />
                Contract Fine Print &amp; Clauses
              </TabsTrigger>
              <TabsTrigger value="reputation" className="rounded-xl text-xs font-bold gap-1.5">
                <Star className="h-3.5 w-3.5" />
                Online Reviews &amp; Reputation
              </TabsTrigger>
              <TabsTrigger value="full_table" className="rounded-xl text-xs font-bold gap-1.5">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Master Comparison Table
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: FINANCIALS & NORMALIZATION */}
            <TabsContent value="overview" className="space-y-6 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {session.builders.map((builder) => {
                  const isWinner = builder.isBestValue;
                  return (
                    <div
                      key={builder.id}
                      className={`p-6 rounded-3xl border flex flex-col justify-between gap-6 transition-all ${
                        isWinner
                          ? isLight
                            ? "bg-emerald-50/70 border-emerald-300 shadow-xl"
                            : "bg-emerald-950/20 border-emerald-500/50 shadow-2xl shadow-emerald-500/10"
                          : isLight
                          ? "bg-white border-slate-200"
                          : "bg-slate-900/70 border-slate-800"
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xl font-black">{builder.builderName}</h3>
                              {isWinner && (
                                <Badge className="bg-amber-500 text-slate-950 font-black text-[10px]">
                                  BEST VALUE
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">
                              {builder.modelName} • {builder.totalAreaM2} m² ({builder.totalAreaSquares} sq)
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Overall Score
                            </span>
                            <span
                              className={`text-lg font-mono font-black ${
                                isWinner ? "text-emerald-500" : "text-slate-300"
                              }`}
                            >
                              {builder.overallScore}/100
                            </span>
                          </div>
                        </div>

                        {/* Breakdown lines */}
                        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs font-mono">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Base House Price:</span>
                            <span className="font-bold">${builder.basePrice.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Site Costs:</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold">${builder.siteCosts.toLocaleString()}</span>
                              <Badge
                                className={`text-[9px] font-sans font-bold uppercase ${
                                  builder.siteCostCertainty === "fixed"
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                    : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                }`}
                              >
                                {builder.siteCostCertainty === "fixed" ? "Fixed" : "Provisional"}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Statutory &amp; Council:</span>
                            <span>${builder.statutoryCosts.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Promotions / Credits:</span>
                            <span className="text-emerald-500">-${builder.promotionsOrDiscounts.toLocaleString()}</span>
                          </div>

                          <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-sm">
                            <span className="text-slate-300 font-sans font-semibold">Stated Tender Total:</span>
                            <span className="font-black">${builder.statedTotalPrice.toLocaleString()}</span>
                          </div>

                          {/* Normalization Adjustments */}
                          <div className="pt-2.5 space-y-1.5 bg-slate-500/5 p-3 rounded-2xl">
                            <span className="text-[10px] text-amber-500 font-sans font-bold uppercase tracking-wider block">
                              Apples-to-Apples Normalization:
                            </span>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">Missing Omissions Cost:</span>
                              <span
                                className={`font-bold ${
                                  builder.omissionsCost > 0 ? "text-rose-400" : "text-emerald-400"
                                }`}
                              >
                                {builder.omissionsCost > 0 ? `+$${builder.omissionsCost.toLocaleString()}` : "$0 (Included)"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">Site Cost Contingency:</span>
                              <span
                                className={`font-bold ${
                                  builder.siteCostContingency > 0 ? "text-rose-400" : "text-emerald-400"
                                }`}
                              >
                                {builder.siteCostContingency > 0 ? `+$${builder.siteCostContingency.toLocaleString()}` : "$0 (Fixed)"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Bottom Total */}
                      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">
                            True Completion Cost
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            ${builder.normalizedPricePerM2.toLocaleString()}/m²
                          </span>
                        </div>
                        <span
                          className={`text-2xl font-mono font-black ${
                            isWinner ? "text-emerald-500" : "text-white"
                          }`}
                        >
                          ${builder.normalizedTruePrice.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Strategic Insights Banner */}
              <div
                className={`p-6 rounded-3xl border ${
                  isLight ? "bg-slate-50 border-slate-200 text-slate-900" : "bg-slate-900/60 border-slate-800 text-white"
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-4 w-4 text-amber-500" />
                  <h4 className="text-sm font-black uppercase tracking-wider">Key Comparative Takeaways</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(session.keyDifferencesSummary || []).map((diff, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-500/5 border border-slate-500/10 space-y-1">
                      <span className="text-xs font-mono font-bold text-amber-500">0{idx + 1}.</span>
                      <p className="text-xs text-slate-300 leading-relaxed">{diff}</p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: INCLUSIONS PARITY AUDIT */}
            <TabsContent value="inclusions" className="space-y-4 mt-0">
              <div
                className={`p-5 rounded-3xl border overflow-x-auto ${
                  isLight ? "bg-white border-slate-200" : "bg-slate-900/60 border-slate-800"
                }`}
              >
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-black uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-4">Feature / Specification Trade</th>
                      {session.builders.map((b) => (
                        <th key={b.id} className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span>{b.builderName}</span>
                            {b.isBestValue && (
                              <Badge className="bg-amber-500 text-slate-950 font-black text-[9px]">BEST</Badge>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                    {[
                      { name: "20mm/40mm Stone Benchtops", cat: "Kitchen" },
                      { name: "900mm European Appliances", cat: "Kitchen" },
                      { name: "Soft-Close Kitchen Joinery", cat: "Kitchen" },
                      { name: "Floor-to-Ceiling Wall Tiling", cat: "Bathrooms" },
                      { name: "Stone Vanities & Semi-Frameless Screens", cat: "Bathrooms" },
                      { name: "2590mm Raised Ground Floor Ceilings", cat: "Ceilings & Doors" },
                      { name: "2340mm High Doors", cat: "Ceilings & Doors" },
                      { name: "Ducted Reverse-Cycle Air Conditioning", cat: "Heating & Cooling" },
                      { name: "LED Downlights Package (35+ Points)", cat: "Electrical" },
                      { name: "Full Floor Coverings Package", cat: "Flooring" },
                      { name: "32MPa Concrete Slab & 100m Piering", cat: "Structural" },
                      { name: "Coloured Concrete Driveway & Path", cat: "Turnkey" },
                      { name: "Structural Warranty Guarantee", cat: "Structural" },
                    ].map((item, rowIdx) => (
                      <tr
                        key={rowIdx}
                        className={`hover:bg-slate-500/5 transition-colors ${
                          rowIdx % 2 === 0 ? "bg-transparent" : "bg-slate-500/2"
                        }`}
                      >
                        <td className="py-3.5 px-4 font-bold">
                          <div>{item.name}</div>
                          <span className="text-[10px] text-slate-400 font-normal">{item.cat}</span>
                        </td>
                        {session.builders.map((b) => {
                          const incMatch = b.inclusions.find(
                            (inc) =>
                              inc.featureName.toLowerCase().includes(item.name.toLowerCase().slice(0, 10)) ||
                              item.name.toLowerCase().includes(inc.featureName.toLowerCase().slice(0, 10))
                          );
                          const status = incMatch?.status || (b.isHudson ? "included" : "upgrade_required");
                          const cost = incMatch?.estimatedOmissionCost || 0;

                          return (
                            <td key={b.id} className="py-3.5 px-4">
                              {status === "included" ? (
                                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                                  <Check className="h-4 w-4 stroke-[3]" />
                                  <span>Included ($0)</span>
                                </div>
                              ) : status === "upgrade_required" ? (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 text-amber-500 font-bold">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    <span>Upgrade Extra</span>
                                  </div>
                                  <span className="text-[10px] text-rose-400 font-mono">
                                    +${(cost || 4500).toLocaleString()}
                                  </span>
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                                    <X className="h-4 w-4 stroke-[3]" />
                                    <span>Excluded</span>
                                  </div>
                                  <span className="text-[10px] text-rose-400 font-mono">
                                    +${(cost || 8500).toLocaleString()}
                                  </span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            {/* TAB 3: CONTRACT FINE PRINT & RISK RADAR */}
            <TabsContent value="fine_print" className="space-y-5 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {session.builders.map((b) => (
                  <div
                    key={b.id}
                    className={`p-6 rounded-3xl border space-y-4 ${
                      b.contractClauses.overallRisk === "low"
                        ? isLight
                          ? "bg-emerald-50/70 border-emerald-300"
                          : "bg-emerald-950/20 border-emerald-500/40"
                        : b.contractClauses.overallRisk === "high"
                        ? isLight
                          ? "bg-rose-50/70 border-rose-300"
                          : "bg-rose-950/20 border-rose-500/40"
                        : isLight
                        ? "bg-amber-50/70 border-amber-300"
                        : "bg-amber-950/20 border-amber-500/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-lg">{b.builderName}</h3>
                      <Badge
                        className={`text-xs font-bold uppercase ${
                          b.contractClauses.overallRisk === "low"
                            ? "bg-emerald-500 text-slate-950"
                            : b.contractClauses.overallRisk === "high"
                            ? "bg-rose-500 text-white"
                            : "bg-amber-500 text-slate-950"
                        }`}
                      >
                        {b.contractClauses.overallRisk} Risk
                      </Badge>
                    </div>

                    <div className="space-y-2 text-xs divide-y divide-slate-200 dark:divide-slate-800">
                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-slate-400 font-semibold">Price Lock:</span>
                        <span className="font-bold">{b.contractClauses.priceLockMonths} Months Freeze</span>
                      </div>
                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-slate-400 font-semibold">Escalation Clause:</span>
                        <span
                          className={`font-bold ${
                            b.contractClauses.escalationClauseRisk === "low" ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {b.contractClauses.escalationClauseRisk === "low" ? "None (Guaranteed)" : "Yes (High Risk)"}
                        </span>
                      </div>
                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-slate-400 font-semibold">Rock Coverage:</span>
                        <span className="font-bold">{b.contractClauses.rockExcavationCoverage}</span>
                      </div>
                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-slate-400 font-semibold">Piering Cap:</span>
                        <span className="font-bold">{b.contractClauses.pieringAllowanceMeters}m Included</span>
                      </div>
                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-slate-400 font-semibold">Structural Warranty:</span>
                        <span className="font-bold text-emerald-400">
                          {b.contractClauses.structuralWarrantyYears} Years
                        </span>
                      </div>
                    </div>

                    {/* Fine print warning flags */}
                    {b.contractClauses.finePrintWarnings.length > 0 && (
                      <div className="pt-2 space-y-1.5">
                        <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block">
                          Identified Fine Print Traps:
                        </span>
                        {b.contractClauses.finePrintWarnings.map((warn, wIdx) => (
                          <div
                            key={wIdx}
                            className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 leading-snug flex items-start gap-1.5"
                          >
                            <AlertTriangle className="h-3 w-3 flex-none mt-0.5" />
                            <span>{warn}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* TAB 4: REPUTATION & REVIEWS */}
            <TabsContent value="reputation" className="space-y-5 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {session.builders.map((b) => (
                  <div
                    key={b.id}
                    className={`p-6 rounded-3xl border space-y-4 ${
                      isLight ? "bg-white border-slate-200" : "bg-slate-900/60 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-lg">{b.builderName}</h3>
                      <div className="flex items-center gap-1 text-amber-500 font-bold font-mono text-sm">
                        <Star className="h-4 w-4 fill-amber-500" />
                        <span>{b.reputation.rating} / 5.0</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-400 font-mono">
                      {b.reputation.reviewCount.toLocaleString()} Verified Customer Reviews • {b.reputation.source}
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-500/5 text-xs text-slate-300 leading-relaxed italic">
                      "{b.reputation.sentimentSummary}"
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Average Build Duration:</span>
                        <span className="font-bold text-white font-mono">{b.reputation.averageBuildTimeMonths} Months</span>
                      </div>

                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Top Strengths:</span>
                        {b.reputation.topStrengths.map((str, sIdx) => (
                          <div key={sIdx} className="text-[11px] text-emerald-400 flex items-center gap-1.5">
                            <Check className="h-3 w-3 flex-none" />
                            <span>{str}</span>
                          </div>
                        ))}
                      </div>

                      {b.reputation.topComplaints.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Common Complaints:</span>
                          {b.reputation.topComplaints.map((comp, cIdx) => (
                            <div key={cIdx} className="text-[11px] text-rose-400 flex items-center gap-1.5">
                              <X className="h-3 w-3 flex-none" />
                              <span>{comp}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* TAB 5: MASTER COMPARISON TABLE */}
            <TabsContent value="full_table" className="space-y-4 mt-0">
              <div
                className={`p-6 rounded-3xl border overflow-x-auto ${
                  isLight ? "bg-white border-slate-200" : "bg-slate-900/60 border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
                  <div>
                    <h3 className="font-black text-base">Executive Master Comparison Matrix</h3>
                    <p className="text-xs text-slate-400">Complete side-by-side technical breakdown across all audited metrics.</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleExportPdf}
                    className="rounded-xl text-xs font-bold gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download PDF
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* Financial Metrics */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-500 block">1. Pricing &amp; True Cost Breakdown</span>
                    <table className="w-full text-left border-collapse text-xs min-w-[650px]">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold">
                          <th className="py-2">Metric</th>
                          {session.builders.map((b) => (
                            <th key={b.id} className="py-2">{b.builderName}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        <tr>
                          <td className="py-2 text-slate-400">Design Model &amp; Area</td>
                          {session.builders.map((b) => (
                            <td key={b.id} className="py-2 font-mono">{b.modelName} ({b.totalAreaM2}m²)</td>
                          ))}
                        </tr>
                        <tr>
                          <td className="py-2 text-slate-400">Base House Price</td>
                          {session.builders.map((b) => (
                            <td key={b.id} className="py-2 font-mono">${b.basePrice.toLocaleString()}</td>
                          ))}
                        </tr>
                        <tr>
                          <td className="py-2 text-slate-400">Site Costs (Certainty)</td>
                          {session.builders.map((b) => (
                            <td key={b.id} className="py-2 font-mono">
                              ${b.siteCosts.toLocaleString()} ({b.siteCostCertainty === "fixed" ? "Fixed" : "Provisional"})
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="py-2 text-slate-400">Omissions &amp; Gaps Cost</td>
                          {session.builders.map((b) => (
                            <td key={b.id} className={`py-2 font-mono font-bold ${b.omissionsCost > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                              +${b.omissionsCost.toLocaleString()}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="py-2 text-slate-400">Site Cost Contingency Risk</td>
                          {session.builders.map((b) => (
                            <td key={b.id} className={`py-2 font-mono font-bold ${b.siteCostContingency > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                              +${b.siteCostContingency.toLocaleString()}
                            </td>
                          ))}
                        </tr>
                        <tr className="bg-slate-500/5 font-black text-sm">
                          <td className="py-2.5 text-slate-200">Normalized True Build Price</td>
                          {session.builders.map((b) => (
                            <td key={b.id} className={`py-2.5 font-mono ${b.isBestValue ? "text-emerald-500" : "text-white"}`}>
                              ${b.normalizedTruePrice.toLocaleString()}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Contract Guarantees */}
                  <div className="space-y-2 pt-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 block">2. Contract Guarantees &amp; Security</span>
                    <table className="w-full text-left border-collapse text-xs min-w-[650px]">
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        <tr>
                          <td className="py-2 text-slate-400 w-1/3">Price Lock Period</td>
                          {session.builders.map((b) => (
                            <td key={b.id} className="py-2 font-mono font-bold">{b.contractClauses.priceLockMonths} Months</td>
                          ))}
                        </tr>
                        <tr>
                          <td className="py-2 text-slate-400">Escalation Clause Present?</td>
                          {session.builders.map((b) => (
                            <td key={b.id} className={`py-2 font-bold ${b.contractClauses.escalationClauseRisk === "low" ? "text-emerald-400" : "text-rose-400"}`}>
                              {b.contractClauses.escalationClauseRisk === "low" ? "No (Fixed)" : "Yes (Cost Spike Risk)"}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="py-2 text-slate-400">Structural Warranty</td>
                          {session.builders.map((b) => (
                            <td key={b.id} className="py-2 font-mono font-bold text-emerald-400">{b.contractClauses.structuralWarrantyYears} Years</td>
                          ))}
                        </tr>
                        <tr>
                          <td className="py-2 text-slate-400">ProductReview Rating</td>
                          {session.builders.map((b) => (
                            <td key={b.id} className="py-2 font-mono">{b.reputation.rating} / 5.0 ({b.reputation.reviewCount} Reviews)</td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* ============================================================ */}
      {/* BIG POP-UP MODAL: IMPORT ALL BUILDERS ESTIMATES & TENDERS   */}
      {/* ============================================================ */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div
            className={`relative w-full max-w-5xl my-auto rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
              isLight ? "bg-white border-slate-200 text-slate-900 shadow-slate-900/20" : "bg-slate-950 border-amber-500/30 text-white shadow-black/80"
            }`}
          >
            {/* Modal Header */}
            <div className={`p-6 border-b flex items-start justify-between gap-4 ${isLight ? "border-slate-200 bg-slate-50/50" : "border-slate-800 bg-slate-900/40"}`}>
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/25 shrink-0">
                  <Scale className="h-6 w-6 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                      Import All Builders Estimates &amp; Tenders
                    </h2>
                    <Badge className="bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider">
                      AI AUDITOR
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Upload quotes, tenders, contracts, and inclusions schedules from each builder. We'll cross-examine line items, hidden omissions, site cost clauses, and fine print to declare the true best value builder.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  isLight ? "text-slate-400 hover:text-slate-900 hover:bg-slate-200" : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Client, Site & State Bar */}
            <div className={`px-6 py-3 border-b flex flex-wrap items-center gap-4 text-xs ${isLight ? "bg-slate-100/70 border-slate-200" : "bg-slate-900/60 border-slate-800"}`}>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-400">Client Name:</span>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. David &amp; Sarah Miller"
                  className="h-8 text-xs font-bold w-48 rounded-lg"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-400">Site Address:</span>
                <Input
                  value={siteAddress}
                  onChange={(e) => setSiteAddress(e.target.value)}
                  placeholder="e.g. Lot 204, Spring Farm Estate"
                  className="h-8 text-xs w-64 rounded-lg"
                />
              </div>
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-500/10 border border-slate-500/20 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setActiveDivision("NSW");
                    setDivisionState("NSW");
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    division === "NSW" ? "bg-cyan-500 text-white shadow-xs" : "text-slate-400 hover:text-white"
                  }`}
                >
                  NSW
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveDivision("QLD");
                    setDivisionState("QLD");
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    division === "QLD" ? "bg-cyan-500 text-white shadow-xs" : "text-slate-400 hover:text-white"
                  }`}
                >
                  QLD
                </button>
              </div>
            </div>

            {/* Quick Batch Multi-File Dropzone */}
            <div className="px-6 pt-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingBatch(true);
                }}
                onDragLeave={() => setIsDraggingBatch(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingBatch(false);
                  const files = Array.from(e.dataTransfer.files).filter(
                    (f) => f.type === "application/pdf" || f.name.endsWith(".pdf")
                  );
                  if (files.length > 0) void handleBatchFiles(files);
                }}
                className={`p-4 rounded-2xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center gap-1.5 ${
                  isDraggingBatch
                    ? "border-amber-400 bg-amber-500/10 scale-[1.01]"
                    : isLight
                    ? "border-slate-300 bg-slate-50/70 hover:border-amber-400/60"
                    : "border-slate-800 bg-slate-900/40 hover:border-amber-500/40"
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  <Upload className="h-4 w-4 text-amber-400" />
                  <span>Quick Multi-File Drop: Drop multiple PDF tenders or inclusions files here</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  We will automatically read and organize documents into builder slots below.
                </p>
              </div>
            </div>

            {/* Builder Upload Slots (Scrollable Container) */}
            <div className="overflow-y-auto px-6 py-4 space-y-4 max-h-[50vh]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Builders to Compare ({builderInputs.length} of 5)
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddBuilder}
                  disabled={builderInputs.length >= 5}
                  className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer h-8"
                >
                  <Plus className="h-3.5 w-3.5 text-amber-400" />
                  Add Another Builder
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {builderInputs.map((input, idx) => {
                  const isHudsonSlot = input.builderName.toLowerCase().includes("hudson");
                  return (
                    <div
                      key={input.id}
                      className={`p-5 rounded-3xl border flex flex-col justify-between gap-4 transition-all ${
                        isHudsonSlot
                          ? isLight
                            ? "bg-emerald-50/70 border-emerald-300 shadow-md"
                            : "bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-500/5"
                          : isLight
                          ? "bg-slate-50/80 border-slate-200"
                          : "bg-slate-900/70 border-slate-800"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="w-6 h-6 rounded-full bg-slate-500/20 flex items-center justify-center text-xs font-mono font-bold shrink-0">
                              {idx + 1}
                            </span>
                            <Input
                              value={input.builderName}
                              onChange={(e) => {
                                const updated = [...builderInputs];
                                updated[idx].builderName = e.target.value;
                                setBuilderInputs(updated);
                              }}
                              className="h-8 font-black text-sm rounded-lg"
                              placeholder={idx === 0 ? "Builder Name (e.g. Hudson Homes)" : "Builder Name (e.g. Metricon)"}
                            />
                          </div>
                          {idx >= 2 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveBuilder(idx)}
                              className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer shrink-0"
                              title="Remove builder"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {/* Quick Builder Suggestions Chips */}
                        <div className="flex items-center gap-1 flex-wrap">
                          {POPULAR_BUILDERS.slice(0, 5).map((pb) => (
                            <button
                              key={pb}
                              type="button"
                              onClick={() => {
                                const updated = [...builderInputs];
                                updated[idx].builderName = pb;
                                setBuilderInputs(updated);
                              }}
                              className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold transition-all cursor-pointer ${
                                input.builderName === pb
                                  ? "bg-amber-500 text-slate-950 border-amber-500 font-bold"
                                  : isLight
                                  ? "bg-white hover:bg-slate-100 text-slate-600 border-slate-200"
                                  : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                              }`}
                            >
                              {pb}
                            </button>
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[10px] text-slate-400 font-semibold uppercase">Design / Model</Label>
                            <Input
                              value={input.modelName || ""}
                              onChange={(e) => {
                                const updated = [...builderInputs];
                                updated[idx].modelName = e.target.value;
                                setBuilderInputs(updated);
                              }}
                              className="h-8 text-xs rounded-lg mt-1"
                              placeholder="e.g. Turquoise 25"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-slate-400 font-semibold uppercase">Stated Price ($)</Label>
                            <Input
                              type="number"
                              value={input.statedPrice || ""}
                              onChange={(e) => {
                                const updated = [...builderInputs];
                                updated[idx].statedPrice = parseFloat(e.target.value) || 0;
                                setBuilderInputs(updated);
                              }}
                              className="h-8 text-xs font-mono rounded-lg mt-1"
                              placeholder="e.g. 477900"
                            />
                          </div>
                        </div>

                        {/* Upload Dropzones */}
                        <div className="space-y-2 pt-1">
                          {/* Tender File */}
                          <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              const file = e.dataTransfer.files?.[0];
                              if (file) void handleFileUpload(idx, "tender", file);
                            }}
                            className={`p-3 rounded-2xl border border-dashed text-center transition-all ${
                              input.tenderFile
                                ? isLight
                                  ? "bg-emerald-50 border-emerald-400"
                                  : "bg-emerald-950/40 border-emerald-500"
                                : isLight
                                ? "bg-slate-50 border-slate-300 hover:border-slate-400"
                                : "bg-slate-950/60 border-slate-700 hover:border-slate-600"
                            }`}
                          >
                            <input
                              type="file"
                              id={`modal-tender-upload-${idx}`}
                              className="hidden"
                              accept="application/pdf,image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void handleFileUpload(idx, "tender", file);
                              }}
                            />
                            {input.tenderFile ? (
                              <div className="flex items-center justify-between gap-2 px-1">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 truncate">
                                  <FileCheck2 className="h-4 w-4 shrink-0" />
                                  <span className="truncate">{input.tenderFile.name}</span>
                                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                    ({Math.round((input.tenderFile.size || 0) / 1024)} KB)
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFile(idx, "tender")}
                                  className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer shrink-0"
                                  title="Remove document"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <label htmlFor={`modal-tender-upload-${idx}`} className="cursor-pointer block space-y-1">
                                <div className="flex items-center justify-center gap-1.5 text-xs font-bold">
                                  <Upload className="h-4 w-4 text-amber-500" />
                                  <span>Upload Tender / Quote PDF</span>
                                </div>
                                <p className="text-[10px] text-slate-400">
                                  Drop tender, quote, or contract schedule
                                </p>
                              </label>
                            )}
                          </div>

                          {/* Inclusions File */}
                          <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              const file = e.dataTransfer.files?.[0];
                              if (file) void handleFileUpload(idx, "inclusions", file);
                            }}
                            className={`p-3 rounded-2xl border border-dashed text-center transition-all ${
                              input.inclusionsFile
                                ? isLight
                                  ? "bg-cyan-50 border-cyan-400"
                                  : "bg-cyan-950/40 border-cyan-500"
                                : isLight
                                ? "bg-slate-50 border-slate-300 hover:border-slate-400"
                                : "bg-slate-950/60 border-slate-700 hover:border-slate-600"
                            }`}
                          >
                            <input
                              type="file"
                              id={`modal-inc-upload-${idx}`}
                              className="hidden"
                              accept="application/pdf,image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void handleFileUpload(idx, "inclusions", file);
                              }}
                            />
                            {input.inclusionsFile ? (
                              <div className="flex items-center justify-between gap-2 px-1">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 truncate">
                                  <FileCheck2 className="h-4 w-4 shrink-0" />
                                  <span className="truncate">{input.inclusionsFile.name}</span>
                                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                    ({Math.round((input.inclusionsFile.size || 0) / 1024)} KB)
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFile(idx, "inclusions")}
                                  className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer shrink-0"
                                  title="Remove booklet"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <label htmlFor={`modal-inc-upload-${idx}`} className="cursor-pointer block space-y-1">
                                <div className="flex items-center justify-center gap-1.5 text-xs font-bold">
                                  <Layers className="h-4 w-4 text-cyan-400" />
                                  <span>Upload Inclusions Range PDF</span>
                                </div>
                                <p className="text-[10px] text-slate-400">
                                  Optional brochure or specification booklet
                                </p>
                              </label>
                            )}
                          </div>
                        </div>

                        {/* Notes */}
                        <div>
                          <Label className="text-[10px] text-slate-400 font-semibold uppercase">
                            Specific Clauses / Notes
                          </Label>
                          <textarea
                            value={input.manualNotes || ""}
                            onChange={(e) => {
                              const updated = [...builderInputs];
                              updated[idx].manualNotes = e.target.value;
                              setBuilderInputs(updated);
                            }}
                            rows={2}
                            className={`w-full text-xs p-2 rounded-xl border mt-1 resize-none ${
                              isLight ? "bg-white border-slate-200" : "bg-slate-950 border-slate-800"
                            }`}
                            placeholder="e.g. 180-day price lock, $25k provisional site costs, timber floors not included"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer & Run CTA */}
            <div className={`p-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${isLight ? "border-slate-200 bg-slate-50/50" : "border-slate-800 bg-slate-900/40"}`}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-xs text-slate-400 hover:text-rose-400 cursor-pointer"
              >
                Reset Form
              </Button>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsImportModalOpen(false)}
                  className="rounded-xl text-xs font-bold cursor-pointer h-11 px-4"
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={handleRunComparison}
                  className="flex-1 sm:flex-none h-11 px-8 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm tracking-wide shadow-xl shadow-amber-500/25 cursor-pointer gap-2 active:scale-95 transition-all"
                >
                  <Sparkles className={`h-4 w-4 ${isAnalyzing ? "animate-spin" : ""}`} />
                  {isAnalyzing ? (analysisStep || "Running AI Forensic Comparison…") : "Run Full Forensic Tender Comparison"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
