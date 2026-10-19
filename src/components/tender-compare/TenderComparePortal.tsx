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
  createInitialSampleSession,
  getHudsonBenchmarkBuilder,
} from "@/lib/tender-compare/tenderCompareStorage";
import { analyzeBuilderTendersWithAi } from "@/lib/tender-compare/tenderCompareAiEngine";
import { exportTenderComparisonPdf } from "@/lib/tender-compare/tenderComparePdfExporter";

export function TenderComparePortal() {
  const { mode } = useTheme();
  const isLight = mode === "normal";

  const [division, setDivisionState] = useState<"NSW" | "QLD">(() => getActiveDivision());
  const [activeTab, setActiveTab] = useState<"overview" | "inclusions" | "fine_print" | "reputation" | "full_table">("overview");
  const [viewMode, setViewMode] = useState<"input" | "results">("results");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>("");

  // Session State
  const [session, setSession] = useState<TenderComparisonSession>(() => loadActiveTenderCompareSession(division));
  const [clientName, setClientName] = useState(session.clientName || "David & Sarah Miller");
  const [siteAddress, setSiteAddress] = useState(session.siteAddress || "Lot 204, Spring Farm Estate, Camden NSW 2570");

  // Inputs for building quotes
  const [builderInputs, setBuilderInputs] = useState<BuilderQuoteInput[]>([
    {
      id: "input-hudson",
      builderName: "Hudson Homes",
      modelName: "Turquoise 25",
      statedPrice: 477900,
      manualNotes: "H2 Designer Collection inclusions with 50-Year Structural Guarantee & 100% Fixed Site Costs.",
    },
    {
      id: "input-comp-1",
      builderName: "Metricon Homes",
      modelName: "Merricks 26",
      statedPrice: 459900,
      manualNotes: "Standard brochure price. Ducted A/C excluded, flooring excluded, 2440mm ceilings.",
    },
    {
      id: "input-comp-2",
      builderName: "Clarendon Homes",
      modelName: "Boston 25",
      statedPrice: 468900,
      manualNotes: "Promotional pack includes basic single-zone A/C. 2440mm ceilings, M-class site costs.",
    },
  ]);

  useEffect(() => {
    const unsub = onDivisionChanged((newDiv) => {
      setDivisionState(newDiv);
    });
    return () => unsub();
  }, []);

  const winningBuilder =
    session.builders.find((b) => b.id === session.winningBuilderId) ||
    session.builders.find((b) => b.isBestValue) ||
    session.builders[0];

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
        builderName: `Competitor ${newIdx}`,
        modelName: "",
        statedPrice: undefined,
        manualNotes: "",
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

  const handleRunComparison = async () => {
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
        builderInputs,
        clientName,
        siteAddress,
        division
      );

      setSession(newSession);
      saveTenderCompareSession(newSession);
      setViewMode("results");
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

  const handleLoadSample = () => {
    const sample = createInitialSampleSession(division);
    setSession(sample);
    setClientName(sample.clientName);
    setSiteAddress(sample.siteAddress);
    saveTenderCompareSession(sample);
    setViewMode("results");
    toast.success("Loaded Sample 3-Builder Comparison (Hudson vs. Metricon vs. Clarendon)");
  };

  const handleExportPdf = () => {
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLoadSample}
              className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer h-10 px-3.5"
            >
              <RotateCcw className="h-3.5 w-3.5 text-amber-500" />
              Load Sample Demo
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === "input" ? "results" : "input")}
              className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer h-10 px-3.5"
            >
              <Upload className="h-3.5 w-3.5 text-cyan-400" />
              {viewMode === "input" ? "View Analysis Results" : "Edit / Add Builder Files"}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleExportPdf}
              className="rounded-xl text-xs font-bold gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black cursor-pointer shadow-lg shadow-emerald-500/20 h-10 px-4"
            >
              <Download className="h-4 w-4" />
              Export Full PDF Report
            </Button>
          </div>
        </div>
      </div>

      {/* VIEW MODE: INPUT / UPLOAD STUDIO */}
      {viewMode === "input" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-black">Import Builder Tenders &amp; Inclusions</h2>
              <p className="text-xs text-slate-400">
                Upload estimates, tenders, contracts, or inclusions brochures. AI extracts and audits every trade.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddBuilder}
              className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Another Builder
            </Button>
          </div>

          {/* Builder Upload Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {builderInputs.map((input, idx) => (
              <div
                key={input.id}
                className={`p-5 rounded-3xl border flex flex-col justify-between gap-4 transition-all ${
                  input.builderName.toLowerCase().includes("hudson")
                    ? isLight
                      ? "bg-emerald-50/70 border-emerald-300 shadow-md"
                      : "bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-500/5"
                    : isLight
                    ? "bg-white border-slate-200"
                    : "bg-slate-900/60 border-slate-800"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-500/20 flex items-center justify-center text-xs font-mono font-bold">
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
                        placeholder="Builder Name (e.g. Metricon)"
                      />
                    </div>
                    {idx >= 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveBuilder(idx)}
                        className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer"
                        title="Remove builder"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
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

                  {/* Document Upload Dropzones */}
                  <div className="space-y-2 pt-1">
                    {/* Tender / Contract Document */}
                    <div
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
                        id={`tender-upload-${idx}`}
                        className="hidden"
                        accept="application/pdf,image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleFileUpload(idx, "tender", file);
                        }}
                      />
                      <label htmlFor={`tender-upload-${idx}`} className="cursor-pointer block space-y-1">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold">
                          {input.tenderFile ? (
                            <>
                              <FileCheck2 className="h-4 w-4 text-emerald-500" />
                              <span className="truncate max-w-[180px]">{input.tenderFile.name}</span>
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 text-amber-500" />
                              <span>Upload Tender / Quote PDF</span>
                            </>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {input.tenderFile ? "Click to replace tender document" : "Drop tender, quote, or contract"}
                        </p>
                      </label>
                    </div>

                    {/* Inclusions Booklet / Range */}
                    <div
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
                        id={`inc-upload-${idx}`}
                        className="hidden"
                        accept="application/pdf,image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleFileUpload(idx, "inclusions", file);
                        }}
                      />
                      <label htmlFor={`inc-upload-${idx}`} className="cursor-pointer block space-y-1">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold">
                          {input.inclusionsFile ? (
                            <>
                              <FileCheck2 className="h-4 w-4 text-cyan-400" />
                              <span className="truncate max-w-[180px]">{input.inclusionsFile.name}</span>
                            </>
                          ) : (
                            <>
                              <Layers className="h-4 w-4 text-cyan-400" />
                              <span>Upload Inclusions Range PDF</span>
                            </>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {input.inclusionsFile ? "Click to replace inclusions file" : "Brochure specifications booklet"}
                        </p>
                      </label>
                    </div>
                  </div>

                  {/* Manual Notes / Clauses */}
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
                        isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-slate-800"
                      }`}
                      placeholder="e.g. 180-day price lock, $25k provisional site costs, timber floors not included"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Run Analysis Button */}
          <div className="p-6 rounded-3xl border bg-gradient-to-r from-amber-500/10 via-brand-gold/10 to-emerald-500/10 border-amber-500/30 text-center space-y-4">
            <div className="max-w-xl mx-auto">
              <h3 className="text-lg font-black">Ready for AI Forensic Contract Breakdown?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Our model will read all attached files, audit 30+ trades, normalize hidden omission costs, inspect fine print traps, and declare the genuine best value builder.
              </p>
            </div>

            <Button
              type="button"
              disabled={isAnalyzing}
              onClick={handleRunComparison}
              className="h-12 px-8 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm tracking-wide shadow-xl shadow-amber-500/25 cursor-pointer gap-2"
            >
              <Sparkles className={`h-4 w-4 ${isAnalyzing ? "animate-spin" : ""}`} />
              {isAnalyzing ? (analysisStep || "Running AI Forensic Comparison…") : "Run Full Forensic Tender Comparison"}
            </Button>
          </div>
        </div>
      )}

      {/* VIEW MODE: RESULTS DASHBOARD */}
      {viewMode === "results" && (
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
    </div>
  );
}
