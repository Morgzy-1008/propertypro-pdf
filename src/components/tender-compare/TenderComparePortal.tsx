import React, { useState, useEffect, useRef } from "react";
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

const SAMPLE_BUILDERS_DEMO: BuilderQuoteInput[] = [
  {
    id: "sample-hudson",
    builderName: "Hudson Homes",
    modelName: "Turquoise 25",
    statedPrice: 477900,
    manualNotes:
      "Hudson Designer Tier, 100% Fixed Site Costs, 50-year structural warranty, full turnkey with ducted A/C, stone benchtops, 2590mm raised ceilings, hybrid laminate flooring, and coloured concrete driveway.",
    tenderFile: null,
    inclusionsFile: null,
  },
  {
    id: "sample-metricon",
    builderName: "Metricon Homes",
    modelName: "Delta 28S",
    statedPrice: 498500,
    manualNotes:
      "Provisional site costs $32,000 allowance, 2440mm standard ceilings, split-system cooling only, standard laminate kitchen benchtops, full floor coverings and driveway excluded from base tender.",
    tenderFile: null,
    inclusionsFile: null,
  },
  {
    id: "sample-clarendon",
    builderName: "Clarendon Homes",
    modelName: "Boston 36",
    statedPrice: 535000,
    manualNotes:
      "Provisional site costs $38,000 allowance, price escalation clause present, 20mm stone to kitchen only, 2440mm ceilings, concrete slab only without floor coverings, 6-year statutory warranty minimum.",
    tenderFile: null,
    inclusionsFile: null,
  },
];

async function parseTenderPdfsToBuilderInputs(
  files: File[],
  division: "NSW" | "QLD",
  onProgress?: (step: string) => void
): Promise<{
  builderInputs: BuilderQuoteInput[];
  detectedClientName?: string;
  detectedSiteAddress?: string;
}> {
  onProgress?.("Reading uploaded builder tenders & estimate files…");

  const builderMap = new Map<string, BuilderQuoteInput>();
  let detectedClientName: string | undefined;
  let detectedSiteAddress: string | undefined;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(`Reading document ${i + 1} of ${files.length}: ${file.name}…`);

    let rawText = "";
    try {
      const doc = await pdfDocumentToPagesAndText(file, 16);
      rawText = doc.rawText || "";
    } catch (e) {
      console.warn("Failed to extract text from PDF:", file.name, e);
    }

    const fileNameLower = file.name.toLowerCase();
    const textLower = rawText.toLowerCase();

    // Detect Client Name
    if (!detectedClientName) {
      const clientMatch =
        rawText.match(/(?:Client(?:'s)?\s*Name|Prepared\s*for|Customer|Owner|Client)[:\s]+([^\r\n,]{3,40})/i);
      if (clientMatch && clientMatch[1].trim().length > 2) {
        detectedClientName = clientMatch[1].trim();
      }
    }

    // Detect Site Address
    if (!detectedSiteAddress) {
      const siteMatch =
        rawText.match(/(?:Site\s*Address|Property\s*Address|Proposed\s*Site|Lot\s*Address)[:\s]+([^\r\n]{5,60})/i) ||
        rawText.match(/(?:Lot\s+\d+[^,\r\n]+,[^\r\n]+)/i);
      if (siteMatch && siteMatch[1]?.trim().length > 4) {
        detectedSiteAddress = siteMatch[1].trim();
      }
    }

    // Detect Builder Name
    let builderName = "";
    if (textLower.includes("hudson") || fileNameLower.includes("hudson")) builderName = "Hudson Homes";
    else if (textLower.includes("metricon") || fileNameLower.includes("metricon")) builderName = "Metricon Homes";
    else if (textLower.includes("clarendon") || fileNameLower.includes("clarendon")) builderName = "Clarendon Homes";
    else if (textLower.includes("rawson") || fileNameLower.includes("rawson")) builderName = "Rawson Homes";
    else if (textLower.includes("eden brae") || fileNameLower.includes("eden")) builderName = "Eden Brae Homes";
    else if (textLower.includes("coral") || fileNameLower.includes("coral")) builderName = "Coral Homes";
    else if (textLower.includes("wisdom") || fileNameLower.includes("wisdom")) builderName = "Wisdom Homes";
    else if (textLower.includes("mojo") || fileNameLower.includes("mojo")) builderName = "Mojo Homes";
    else if (textLower.includes("simonds") || fileNameLower.includes("simonds")) builderName = "Simonds Homes";
    else if (textLower.includes("carlisle") || fileNameLower.includes("carlisle")) builderName = "Carlisle Homes";
    else if (textLower.includes("mcdonald jones") || fileNameLower.includes("mcdonald")) builderName = "McDonald Jones Homes";
    else if (textLower.includes("beechwood") || fileNameLower.includes("beechwood")) builderName = "Beechwood Homes";
    else if (textLower.includes("masterton") || fileNameLower.includes("masterton")) builderName = "Masterton Homes";
    else if (textLower.includes("allworth") || fileNameLower.includes("allworth")) builderName = "Allworth Homes";
    else if (textLower.includes("fowler") || fileNameLower.includes("fowler")) builderName = "Fowler Homes";
    else if (textLower.includes("firstyle") || fileNameLower.includes("firstyle")) builderName = "Firstyle Homes";
    else {
      const bMatch = rawText.match(/(?:builder|contractor|tender\s+by|prepared\s+by)[:\s]+([A-Za-z0-9\s&]{3,28})/i);
      if (bMatch) {
        builderName = bMatch[1].trim();
      } else {
        builderName = file.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " ").slice(0, 24);
      }
    }

    // Detect Model / Floorplan Design Name
    let modelName = "";
    const modelMatch =
      rawText.match(/(?:home\s*design|house\s*design|dwelling|design|plan|model)[:\s]+([A-Za-z0-9\s-]{3,25})/i) ||
      rawText.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*(\d{2,3}(?:\s*(?:classic|rh|lh|facade|mk\s*\d|resort|vogue))?)\b/);
    if (modelMatch) {
      modelName = (modelMatch[1] + (modelMatch[2] ? ` ${modelMatch[2]}` : "")).trim();
    } else {
      const nameParts = file.name.replace(/\.pdf$/i, "").split(/[-_]/);
      if (nameParts.length >= 2) {
        modelName = nameParts[1].trim();
      } else {
        modelName = "Featured Design";
      }
    }

    // Detect Price
    let statedPrice: number | undefined;
    const priceMatches = [...rawText.matchAll(/\$(?:[4-9]\d{2}|\d{1,2},\d{3}),\d{3}|\$(?:[4-9]\d{5})/g)];
    if (priceMatches.length > 0) {
      const parsedPrices = priceMatches
        .map((m) => parseInt(m[0].replace(/[^0-9]/g, ""), 10))
        .filter((p) => p >= 180000 && p <= 2500000);
      if (parsedPrices.length > 0) {
        statedPrice = Math.max(...parsedPrices);
      }
    }

    const isInclusions =
      /inclusion|spec|brochure|range|standard/i.test(fileNameLower) ||
      /inclusions\s+schedule|specifications/i.test(textLower);

    const builderKey = builderName.toLowerCase();
    const existing = builderMap.get(builderKey);

    if (existing) {
      if (isInclusions) {
        existing.inclusionsFile = { name: file.name, size: file.size, rawText };
      } else {
        existing.tenderFile = { name: file.name, size: file.size, rawText };
        if (statedPrice && !existing.statedPrice) existing.statedPrice = statedPrice;
        if (modelName && (!existing.modelName || existing.modelName === "Featured Design")) existing.modelName = modelName;
      }
    } else {
      builderMap.set(builderKey, {
        id: `input-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        builderName,
        modelName,
        statedPrice,
        manualNotes: "",
        tenderFile: isInclusions ? null : { name: file.name, size: file.size, rawText },
        inclusionsFile: isInclusions ? { name: file.name, size: file.size, rawText } : null,
      });
    }
  }

  const resultInputs = Array.from(builderMap.values());

  // If only 1 builder was uploaded (e.g. competitor quote), benchmark against Hudson Homes
  if (resultInputs.length === 1) {
    const single = resultInputs[0];
    const isSingleHudson = /hudson/i.test(single.builderName);
    if (isSingleHudson) {
      resultInputs.push({
        id: `input-comp-benchmark`,
        builderName: "Metricon Homes",
        modelName: "Delta 28S",
        statedPrice: single.statedPrice ? single.statedPrice + 18000 : 495000,
        manualNotes: "Standard market competitor tender specification",
        tenderFile: null,
        inclusionsFile: null,
      });
    } else {
      resultInputs.unshift({
        id: `input-hudson-benchmark`,
        builderName: "Hudson Homes",
        modelName: "Turquoise 25",
        statedPrice: single.statedPrice ? Math.max(380000, single.statedPrice - 22000) : 477900,
        manualNotes: "Hudson Homes 100% Fixed Site Costs & Designer Inclusions Benchmark",
        tenderFile: null,
        inclusionsFile: null,
      });
    }
  }

  return {
    builderInputs: resultInputs,
    detectedClientName,
    detectedSiteAddress,
  };
}

export function TenderComparePortal() {
  const { mode } = useTheme();
  const isLight = mode === "normal";

  const [division, setDivisionState] = useState<"NSW" | "QLD">(() => getActiveDivision());
  const [activeTab, setActiveTab] = useState<"overview" | "inclusions" | "fine_print" | "reputation" | "full_table">("overview");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>("");
  const [isDraggingBatch, setIsDraggingBatch] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Session State (starts empty or with real user-imported results, no hallucinated mock data)
  const [session, setSession] = useState<TenderComparisonSession>(() => loadActiveTenderCompareSession(division));
  const hasResults = Boolean(session.builders && session.builders.length > 0);
  
  // Streamlined import popup dialog (starts closed, opens when user clicks "Import Tenders / Estimates")
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  const [clientName, setClientName] = useState(session.clientName || "");
  const [siteAddress, setSiteAddress] = useState(session.siteAddress || "");


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

  const handleClearAll = () => {
    clearActiveTenderCompareSession();
    const empty = createInitialEmptySession(division);
    setSession(empty);
    setSelectedFiles([]);
    setClientName("");
    setSiteAddress("");
    setIsImportModalOpen(false);
    toast.success("Tender comparison reset. Ready for fresh imports.");
  };

  const handleRunAutoComparison = async (filesToProcess?: File[]) => {
    const files = filesToProcess && filesToProcess.length > 0 ? filesToProcess : selectedFiles;

    if (files.length === 0) {
      fileInputRef.current?.click();
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStep("Reading uploaded tender & estimate documents…");

    try {
      const parsed = await parseTenderPdfsToBuilderInputs(files, division, (step) => {
        setAnalysisStep(step);
      });

      const effectiveClientName = parsed.detectedClientName || clientName || "Client Comparison";
      const effectiveSiteAddress = parsed.detectedSiteAddress || siteAddress || "Proposed Home Site";
      if (parsed.detectedClientName && !clientName) setClientName(parsed.detectedClientName);
      if (parsed.detectedSiteAddress && !siteAddress) setSiteAddress(parsed.detectedSiteAddress);

      setAnalysisStep("AI identifying builder identities, floorplan models & schedule areas…");
      await new Promise((r) => setTimeout(r, 600));
      setAnalysisStep("Extracting base pricing, fixed vs provisional site costs & statutory allowances…");
      await new Promise((r) => setTimeout(r, 700));
      setAnalysisStep("Auditing 8 core trade inclusions (Kitchen stone, 900mm appliances, ceilings, HVAC, flooring, driveway)…");
      await new Promise((r) => setTimeout(r, 700));
      setAnalysisStep("Scanning contract clauses, price lock terms & fine print risk exposure…");
      await new Promise((r) => setTimeout(r, 600));
      setAnalysisStep("Calculating normalized completion costs & generating executive report…");

      const newSession = await analyzeBuilderTendersWithAi(
        parsed.builderInputs,
        effectiveClientName,
        effectiveSiteAddress,
        division
      );

      setSession(newSession);
      saveTenderCompareSession(newSession);
      setSelectedFiles([]);
      setIsImportModalOpen(false);

      const winnerName = newSession.builders.find((b) => b.isBestValue)?.builderName || "Hudson Homes";
      toast.success("AI Forensic Comparison Completed!", {
        description: `Winner declared: ${winnerName}. Downloadable PDF report ready.`,
        action: {
          label: "Download PDF",
          onClick: () => exportTenderComparisonPdf(newSession),
        },
      });
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to run comparison: " + (err?.message || "Unknown error"));
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep("");
    }
  };

  const handleRunSampleDemo = async () => {
    setIsAnalyzing(true);
    setAnalysisStep("Loading sample builder tenders (Hudson Homes vs Metricon vs Clarendon)…");

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
        SAMPLE_BUILDERS_DEMO,
        clientName || "David & Sarah Miller",
        siteAddress || "Lot 204 Spring Farm Estate",
        division
      );

      setSession(newSession);
      saveTenderCompareSession(newSession);
      setIsImportModalOpen(false);

      const winnerName = newSession.builders.find((b) => b.isBestValue)?.builderName || "Hudson Homes";
      toast.success("AI Forensic Comparison Completed!", {
        description: `Winner declared: ${winnerName}. Downloadable PDF report ready.`,
        action: {
          label: "Download PDF",
          onClick: () => exportTenderComparisonPdf(newSession),
        },
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
              <span>Import Tenders / Estimates</span>
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
            <span>Import Tenders / Estimates</span>
          </Button>
        </div>
      )}

      {/* ============================================================ */}
      {/* RESULTS DASHBOARD: ONLY RENDERED WHEN REAL RESULTS EXIST    */}
      {/* ============================================================ */}
      {hasResults && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Prominent Downloadable Comparison PDF Banner */}
          <div
            className={`p-5 sm:p-6 rounded-3xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-xl relative overflow-hidden backdrop-blur-xl ${
              isLight
                ? "bg-gradient-to-r from-emerald-50 via-teal-50/50 to-amber-50/40 border-emerald-300 text-slate-900 shadow-emerald-500/5"
                : "bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-amber-950/20 border-emerald-500/40 text-white shadow-emerald-500/10"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/25 shrink-0">
                <FileCheck2 className="h-7 w-7 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-lg sm:text-xl font-black tracking-tight text-emerald-400">
                    Forensic Comparison Breakdown Ready
                  </h3>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold uppercase tracking-wider">
                    Audit Complete
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
                  The AI has audited all line items, normalized base pricing, filled hidden trade omissions, and scored contract clauses. Your executive 3-page comparison PDF is ready to download.
                </p>
              </div>
            </div>

            <Button
              type="button"
              size="lg"
              onClick={handleExportPdf}
              className="h-12 px-7 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm tracking-wide shadow-xl shadow-emerald-500/25 cursor-pointer gap-2.5 shrink-0 active:scale-95 transition-all"
            >
              <Download className="h-5 w-5 stroke-[2.5]" />
              <span>Download Full Comparison PDF</span>
            </Button>
          </div>

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
      {/* STREAMLINED IMPORT MODAL: ONE IMPORT BUTTON + AI BREAKDOWN    */}
      {/* ============================================================ */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div
            className={`relative w-full max-w-2xl my-auto rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
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
                      Import Tenders / Estimates
                    </h2>
                    <Badge className="bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider">
                      AI AUDITOR
                    </Badge>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Upload your tenders, estimates, or contracts. The AI automatically audits building details, floorplans, inclusions, and fine print.
                  </p>
                </div>
              </div>
              {!isAnalyzing && (
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
              )}
            </div>

            {/* Hidden native file input */}
            <input
              type="file"
              ref={fileInputRef}
              multiple
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const picked = Array.from(e.target.files || []).filter(
                  (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
                );
                if (picked.length > 0) {
                  setSelectedFiles((prev) => [...prev, ...picked]);
                }
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            />

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {isAnalyzing ? (
                /* Animated AI Scanning Screen */
                <div className="py-10 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-300">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500/20 via-brand-gold/15 to-transparent border border-amber-500/40 flex items-center justify-center shadow-xl shadow-amber-500/15 backdrop-blur-xl animate-pulse">
                      <Sparkles className="h-10 w-10 text-amber-400 animate-spin" />
                    </div>
                  </div>

                  <div className="space-y-2 max-w-md">
                    <h3 className="text-lg sm:text-xl font-black tracking-tight text-amber-400">
                      AI Forensic Breakdown in Progress
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 font-mono font-medium min-h-[40px] flex items-center justify-center">
                      {analysisStep || "Scanning documents and cross-referencing builder clauses…"}
                    </p>
                  </div>

                  <div className="w-full max-w-md h-2 rounded-full bg-slate-800 overflow-hidden relative">
                    <div className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 rounded-full animate-indeterminate" />
                  </div>

                  <p className="text-[11px] text-slate-500 italic">
                    Parsing floorplans, base prices, provisional site costs, 8 trade inclusions, and contract risk clauses…
                  </p>
                </div>
              ) : (
                /* Clean Upload & Import Screen */
                <div className="space-y-5">
                  {/* Dropzone Area */}
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
                        (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
                      );
                      if (files.length > 0) {
                        setSelectedFiles((prev) => [...prev, ...files]);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-8 sm:p-10 rounded-3xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center gap-3 cursor-pointer ${
                      isDraggingBatch
                        ? "border-amber-400 bg-amber-500/15 scale-[1.01]"
                        : isLight
                        ? "border-slate-300 bg-slate-50/70 hover:border-amber-400 hover:bg-amber-50/30"
                        : "border-slate-800 bg-slate-900/40 hover:border-amber-500/50 hover:bg-slate-900/70"
                    }`}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-md">
                      <Upload className="h-7 w-7" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm sm:text-base font-bold text-slate-200">
                        {selectedFiles.length > 0 ? "Add More Tenders or Estimates (PDF)" : "Click or Drag & Drop Tenders & Estimates (PDF)"}
                      </h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Drop any builder tender, estimate, contract schedule, or inclusions booklet. Single uploads are automatically benchmarked against Hudson Homes.
                      </p>
                    </div>
                  </div>

                  {/* Selected Files Badges */}
                  {selectedFiles.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-400">
                          Selected Documents ({selectedFiles.length}):
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFiles([]);
                          }}
                          className="text-slate-400 hover:text-rose-400 transition-colors cursor-pointer text-[11px]"
                        >
                          Remove all
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {selectedFiles.map((file, i) => (
                          <div
                            key={i}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                              isLight ? "bg-slate-100 border-slate-200" : "bg-slate-900 border-slate-800"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-4 w-4 text-amber-400 shrink-0" />
                              <span className="truncate font-medium">{file.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                ({Math.round(file.size / 1024)} KB)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFiles((prev) => prev.filter((_, idx) => idx !== i));
                              }}
                              className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer shrink-0"
                              title="Remove file"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* The ONE Import Button */}
                  <div className="pt-2 space-y-3">
                    <Button
                      type="button"
                      disabled={isAnalyzing}
                      onClick={() => {
                        if (selectedFiles.length === 0) {
                          fileInputRef.current?.click();
                        } else {
                          void handleRunAutoComparison(selectedFiles);
                        }
                      }}
                      className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm sm:text-base tracking-wide shadow-xl shadow-amber-500/25 cursor-pointer gap-2.5 active:scale-95 transition-all"
                    >
                      <Sparkles className="h-5 w-5" />
                      <span>
                        {selectedFiles.length > 0
                          ? `⚡ Run AI Forensic Breakdown & Comparison (${selectedFiles.length} ${selectedFiles.length === 1 ? "File" : "Files"})`
                          : "⚡ Import Tenders / Estimates (Select PDFs)"}
                      </span>
                    </Button>

                    {/* Sample Breakdown Link */}
                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={() => void handleRunSampleDemo()}
                        className="text-xs text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-4 cursor-pointer transition-colors"
                      >
                        Don't have a PDF ready? Try sample builder breakdown (Hudson vs Metricon vs Clarendon) →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
