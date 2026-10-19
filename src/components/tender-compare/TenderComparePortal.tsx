import React, { useState, useEffect, useRef } from "react";
import {
  Scale,
  Sparkles,
  Upload,
  FileText,
  FileCheck2,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Award,
  Download,
  Star,
  Clock,
  DollarSign,
  Layers,
  Info,
  Check,
  X,
  FileSpreadsheet,
  Home,
  Globe,
  Eye,
  Building2,
  BedDouble,
  Bath,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTheme } from "@/lib/theme";
import { getActiveDivision, onDivisionChanged, setActiveDivision } from "@/lib/divisionContext";
import { pdfDocumentToPagesAndText } from "@/lib/pdfPages";
import {
  type BuilderQuoteInput,
  type TenderComparisonSession,
} from "@/lib/tender-compare/tenderCompareTypes";
import {
  loadActiveTenderCompareSession,
  saveTenderCompareSession,
  createInitialEmptySession,
  createInitialSampleSession,
  clearActiveTenderCompareSession,
} from "@/lib/tender-compare/tenderCompareStorage";
import { analyzeBuilderTendersWithAi } from "@/lib/tender-compare/tenderCompareAiEngine";
import {
  exportTenderComparisonPdf,
  generateTenderComparisonPdfDataUrl,
} from "@/lib/tender-compare/tenderComparePdfExporter";

async function parseTenderPdfsToBuilderInputs(
  files: File[],
  division: "NSW" | "QLD",
  onProgress?: (step: string, pct?: number) => void
): Promise<{
  builderInputs: BuilderQuoteInput[];
  detectedClientName?: string;
  detectedSiteAddress?: string;
}> {
  onProgress?.("Opening uploaded tender/estimate PDFs for full-document scan...", 8);

  const builderMap = new Map<string, BuilderQuoteInput>();
  let detectedClientName: string | undefined;
  let detectedSiteAddress: string | undefined;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(
      `Scanning all pages of document ${i + 1} of ${files.length}: ${file.name}...`,
      12 + Math.round(((i + 1) / files.length) * 18)
    );

    let rawText = "";
    try {
      // Scan up to 80 pages so the entire estimate, inclusions schedule, and fine print clauses are captured
      const doc = await pdfDocumentToPagesAndText(file, 80);
      rawText = doc.rawText || "";
    } catch (e) {
      console.warn("Failed to extract text from PDF:", file.name, e);
    }

    const fileNameLower = file.name.toLowerCase();
    const textLower = rawText.toLowerCase();

    // Detect Client Name
    if (!detectedClientName) {
      const clientMatch = rawText.match(
        /(?:Client(?:'s)?\s*Name|Prepared\s*for|Customer|Owner|Client)[:\s]+([^\r\n,]{3,40})/i
      );
      if (clientMatch && clientMatch[1].trim().length > 2) {
        detectedClientName = clientMatch[1].trim();
      }
    }

    // Detect Site Address
    if (!detectedSiteAddress) {
      const siteMatch =
        rawText.match(/(?:Site\s*Address|Property\s*Address|Proposed\s*Site|Lot\s*Address)[:\s]+([^\r\n]{5,65})/i) ||
        rawText.match(/(?:Lot\s+\d+[^,\r\n]+,[^\r\n]+)/i);
      if (siteMatch && siteMatch[1]?.trim().length > 4) {
        detectedSiteAddress = siteMatch[1].trim();
      }
    }

    // Detect Builder Name across 20+ Australian residential builders
    let builderName = "";
    if (textLower.includes("hudson") || fileNameLower.includes("hudson")) builderName = "Hudson Homes";
    else if (textLower.includes("metricon") || fileNameLower.includes("metricon")) builderName = "Metricon Homes";
    else if (textLower.includes("clarendon") || fileNameLower.includes("clarendon")) builderName = "Clarendon Homes";
    else if (textLower.includes("plantation") || fileNameLower.includes("plantation")) builderName = "Plantation Homes";
    else if (textLower.includes("brighton") || fileNameLower.includes("brighton")) builderName = "Brighton Homes";
    else if (textLower.includes("rawson") || fileNameLower.includes("rawson")) builderName = "Rawson Homes";
    else if (textLower.includes("eden brae") || fileNameLower.includes("eden")) builderName = "Eden Brae Homes";
    else if (textLower.includes("coral") || fileNameLower.includes("coral")) builderName = "Coral Homes";
    else if (textLower.includes("wisdom") || fileNameLower.includes("wisdom")) builderName = "Wisdom Homes";
    else if (textLower.includes("mojo") || fileNameLower.includes("mojo")) builderName = "Mojo Homes";
    else if (textLower.includes("simonds") || fileNameLower.includes("simonds")) builderName = "Simonds Homes";
    else if (textLower.includes("carlisle") || fileNameLower.includes("carlisle")) builderName = "Carlisle Homes";
    else if (textLower.includes("mcdonald jones") || fileNameLower.includes("mcdonald"))
      builderName = "McDonald Jones Homes";
    else if (textLower.includes("hallmark") || fileNameLower.includes("hallmark")) builderName = "Hallmark Homes";
    else if (textLower.includes("bold living") || fileNameLower.includes("bold")) builderName = "Bold Living";
    else if (textLower.includes("masterton") || fileNameLower.includes("masterton")) builderName = "Masterton Homes";
    else if (textLower.includes("allworth") || fileNameLower.includes("allworth")) builderName = "Allworth Homes";
    else if (textLower.includes("fowler") || fileNameLower.includes("fowler")) builderName = "Fowler Homes";
    else if (textLower.includes("firstyle") || fileNameLower.includes("firstyle")) builderName = "Firstyle Homes";
    else {
      const bMatch = rawText.match(/(?:builder|contractor|tender\s+by|prepared\s+by)[:\s]+([A-Za-z0-9\s&]{3,28})/i);
      if (bMatch) {
        builderName = bMatch[1].trim();
      } else {
        builderName = file.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " ").slice(0, 26);
      }
    }

    // Detect Model / Floorplan Design Name
    let modelName = "";
    const modelMatch =
      rawText.match(/(?:home\s*design|house\s*design|dwelling|design|plan|model)[:\s]+([A-Za-z0-9\s-]{3,28})/i) ||
      rawText.match(
        /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*(\d{2,3}(?:\s*(?:classic|rh|lh|facade|mk\s*\d|resort|vogue))?)\b/
      );
    if (modelMatch) {
      modelName = (modelMatch[1] + (modelMatch[2] ? ` ${modelMatch[2]}` : "")).trim();
    } else {
      const nameParts = file.name.replace(/\.pdf$/i, "").split(/[-_]/);
      if (nameParts.length >= 2) {
        modelName = nameParts[1].trim();
      } else {
        modelName = "Submitted Plan";
      }
    }

    // Detect Price
    let statedPrice: number | undefined;
    const priceMatches = [...rawText.matchAll(/\$(?:[3-9]\d{2}|\d{1,2},\d{3}),\d{3}|\$(?:[3-9]\d{5})/g)];
    if (priceMatches.length > 0) {
      const parsedPrices = priceMatches
        .map((m) => parseInt(m[0].replace(/[^0-9]/g, ""), 10))
        .filter((p) => p >= 220000 && p <= 2500000);
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
        if (modelName && (!existing.modelName || existing.modelName === "Submitted Plan"))
          existing.modelName = modelName;
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

  // If only 1 builder was uploaded (e.g. a competitor estimate), automatically benchmark against Hudson Homes
  if (resultInputs.length === 1) {
    const single = resultInputs[0];
    const isSingleHudson = /hudson/i.test(single.builderName);
    if (isSingleHudson) {
      resultInputs.push({
        id: "input-comp-benchmark",
        builderName: "Metricon Homes",
        modelName: "Merricks 26",
        statedPrice: single.statedPrice ? single.statedPrice - 12000 : 484400,
        manualNotes: "Standard market competitor tender specification",
        tenderFile: null,
        inclusionsFile: null,
      });
    } else {
      resultInputs.unshift({
        id: "input-hudson-benchmark",
        builderName: "Hudson Homes",
        modelName: "Turquoise 25",
        statedPrice: single.statedPrice ? Math.max(395000, single.statedPrice + 12800) : 497200,
        manualNotes: "Hudson Homes H2 Designer 100% Fixed Site Costs & Turnkey Benchmark",
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
  const [activeTab, setActiveTab] = useState<
    "overview" | "design_rooms" | "promotions" | "inclusions" | "fine_print" | "reputation" | "full_table"
  >("overview");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>("");
  const [analysisProgress, setAnalysisProgress] = useState<number>(0);
  const [isDraggingOverPage, setIsDraggingOverPage] = useState(false);
  const [pdfPreviewDataUrl, setPdfPreviewDataUrl] = useState<string | null>(null);

  // Native OS folder/file picker ref — always mounted so clicking "Import Tenders / Estimates" opens the OS folder dialog directly!
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [session, setSession] = useState<TenderComparisonSession>(() => loadActiveTenderCompareSession(division));
  const hasResults = Boolean(session.builders && session.builders.length > 0);

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

  /**
   * Triggers the OS file/folder document picker directly (no 2nd modal tab).
   */
  const handleTriggerDirectFolderImport = () => {
    fileInputRef.current?.click();
  };

  const handleClearAll = () => {
    clearActiveTenderCompareSession();
    const empty = createInitialEmptySession(division);
    setSession(empty);
    setClientName("");
    setSiteAddress("");
    setPdfPreviewDataUrl(null);
    toast.success("Tender comparison cleared. Click 'Import Tenders / Estimates' to select new PDFs.");
  };

  const handleRunAutoComparison = async (filesToProcess: File[]) => {
    if (!filesToProcess || filesToProcess.length === 0) {
      fileInputRef.current?.click();
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(5);
    setAnalysisStep("Opening uploaded tender/estimate PDFs for full-document scan...");

    try {
      const parsed = await parseTenderPdfsToBuilderInputs(filesToProcess, division, (step, pct) => {
        setAnalysisStep(step);
        if (pct) setAnalysisProgress(pct);
      });

      const effectiveClientName = parsed.detectedClientName || clientName || "Client Comparison";
      const effectiveSiteAddress = parsed.detectedSiteAddress || siteAddress || "Proposed Building Site";
      if (parsed.detectedClientName && !clientName) setClientName(parsed.detectedClientName);
      if (parsed.detectedSiteAddress && !siteAddress) setSiteAddress(parsed.detectedSiteAddress);

      const newSession = await analyzeBuilderTendersWithAi(
        parsed.builderInputs,
        effectiveClientName,
        effectiveSiteAddress,
        division,
        (step, pct) => {
          setAnalysisStep(step);
          setAnalysisProgress(pct);
        }
      );

      setSession(newSession);
      saveTenderCompareSession(newSession);
      setActiveTab("overview");

      const winnerName = newSession.builders.find((b) => b.isBestValue)?.builderName || "Hudson Homes";
      toast.success("Forensic Tender & Website Comparison Complete!", {
        description: `Best Value Winner: ${winnerName}. Full breakdown and client PDF report ready.`,
        action: {
          label: "Download PDF",
          onClick: () => exportTenderComparisonPdf(newSession),
        },
      });
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to run forensic comparison: " + (err?.message || "Unknown error"));
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep("");
      setAnalysisProgress(0);
    }
  };

  const handleLoadFullForensicSample = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(15);
    setAnalysisStep("Scanning Hudson Homes (Turquoise 25), Metricon (Merricks 26) & Clarendon (Boston 25) tenders...");

    try {
      await new Promise((r) => setTimeout(r, 350));
      setAnalysisProgress(45);
      setAnalysisStep("Auditing builder websites, active promotions, inclusion tiers & fine print traps...");
      await new Promise((r) => setTimeout(r, 350));
      setAnalysisProgress(75);
      setAnalysisStep("Comparing floorplan room dimensions, 32 trade inclusions, contract clauses & build times...");
      await new Promise((r) => setTimeout(r, 350));
      setAnalysisProgress(100);

      const sampleSession = createInitialSampleSession(division);
      if (clientName) sampleSession.clientName = clientName;
      else setClientName(sampleSession.clientName);

      if (siteAddress) sampleSession.siteAddress = siteAddress;
      else setSiteAddress(sampleSession.siteAddress);

      setSession(sampleSession);
      saveTenderCompareSession(sampleSession);
      setActiveTab("overview");

      toast.success("3-Builder Deep Forensic Comparison Loaded!", {
        description: "Inspect the Why Winner Wins breakdown, Room Dimensions, Promo Fine Print, and 32-Point Audit.",
      });
    } finally {
      setIsAnalyzing(false);
      setAnalysisStep("");
      setAnalysisProgress(0);
    }
  };

  const handleExportPdf = () => {
    if (!hasResults) return;
    const syncedSession: TenderComparisonSession = {
      ...session,
      clientName: clientName || session.clientName || "Valued Client",
      siteAddress: siteAddress || session.siteAddress || "Proposed Building Site",
      division,
    };
    exportTenderComparisonPdf(syncedSession);
    toast.success("Clean Executive Comparison PDF downloaded!");
  };

  const handlePreviewPdf = () => {
    if (!hasResults) return;
    const syncedSession: TenderComparisonSession = {
      ...session,
      clientName: clientName || session.clientName || "Valued Client",
      siteAddress: siteAddress || session.siteAddress || "Proposed Building Site",
      division,
    };
    const url = generateTenderComparisonPdfDataUrl(syncedSession);
    setPdfPreviewDataUrl(url);
  };

  const categoryOptions = [
    { id: "all", label: "All 32 Specifications" },
    { id: "site_slab", label: "Site Works & Slab" },
    { id: "structural", label: "Structural & Framing" },
    { id: "ceilings_doors", label: "Ceilings, Doors & Glazing" },
    { id: "kitchen", label: "Kitchen & Pantry" },
    { id: "bathroom", label: "Bathrooms & Laundry" },
    { id: "hvac", label: "Heating & Cooling" },
    { id: "electrical", label: "Electrical & NBN" },
    { id: "flooring", label: "Flooring" },
    { id: "turnkey", label: "Facade & Turnkey External" },
  ];

  const referenceInclusions = (session.builders[0]?.inclusions || []).filter((item) => {
    if (selectedCategoryFilter === "all") return true;
    if (selectedCategoryFilter === "turnkey") {
      return item.category === "turnkey" || item.category === "facade_external";
    }
    return item.category === selectedCategoryFilter;
  });

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOverPage(true);
      }}
      onDragLeave={() => setIsDraggingOverPage(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingOverPage(false);
        const dropped = Array.from(e.dataTransfer.files).filter(
          (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
        );
        if (dropped.length > 0) {
          void handleRunAutoComparison(dropped);
        }
      }}
      className="w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 space-y-6 pb-16"
    >
      {/* Always-mounted native file input so clicking "Import Tenders / Estimates" opens the OS folder dialog directly */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const picked = Array.from(e.target.files || []).filter(
            (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
          );
          if (fileInputRef.current) fileInputRef.current.value = "";
          if (picked.length > 0) {
            void handleRunAutoComparison(picked);
          }
        }}
      />

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
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Tender Compare</h1>
                  <Badge className="bg-amber-500/15 text-amber-500 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider">
                    Deep Forensic Tender, Website &amp; Design Auditor
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  Scans full estimates, floorplan room sizes, builder website promotions &amp; fine print, 32 trade inclusions, contract clauses, online reviews &amp; build times.
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
              onClick={handleTriggerDirectFolderImport}
              disabled={isAnalyzing}
              className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer h-10 px-4 border-amber-500/40 text-amber-400 hover:bg-amber-500/10 shadow-sm"
            >
              <Upload className="h-4 w-4 text-amber-400" />
              <span>Import Tenders / Estimates</span>
            </Button>

            {hasResults && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePreviewPdf}
                  className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer h-10 px-3.5 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10"
                >
                  <Eye className="h-4 w-4" />
                  Preview Client PDF
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleExportPdf}
                  className="rounded-xl text-xs font-bold gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black cursor-pointer shadow-lg shadow-emerald-500/20 h-10 px-4"
                >
                  <Download className="h-4 w-4" />
                  Download Clean PDF Report
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ACTIVE DEEP FORENSIC SCAN PROGRESS BANNER                    */}
      {/* ============================================================ */}
      {isAnalyzing && (
        <div
          className={`p-8 rounded-3xl border shadow-2xl text-center space-y-5 animate-in fade-in duration-200 ${
            isLight ? "bg-white border-amber-300 text-slate-900" : "bg-slate-950/90 border-amber-500/40 text-white"
          }`}
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-amber-400 animate-spin" />
          </div>
          <div className="space-y-1.5 max-w-xl mx-auto">
            <h3 className="text-xl font-black text-amber-400">
              Deep Forensic Tender, Website &amp; Floorplan Audit in Progress...
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 font-mono">{analysisStep}</p>
          </div>
          <div className="w-full max-w-lg mx-auto h-2.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 transition-all duration-300"
              style={{ width: `${Math.max(12, analysisProgress)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            Auditing all estimate pages, builder website promotions &amp; fine print, room dimensions, 32 trade inclusions, contract clauses &amp; build times...
          </p>
        </div>
      )}

      {/* ============================================================ */}
      {/* EMPTY STATE: DIRECT FOLDER IMPORT OR DRAG-AND-DROP           */}
      {/* ============================================================ */}
      {!hasResults && !isAnalyzing && (
        <div
          className={`p-10 sm:p-14 rounded-3xl border-2 border-dashed text-center max-w-4xl mx-auto flex flex-col items-center justify-center space-y-6 shadow-xl backdrop-blur-xl transition-all ${
            isDraggingOverPage
              ? "border-amber-400 bg-amber-500/10 scale-[1.01]"
              : isLight
                ? "bg-white/85 border-slate-300 text-slate-900"
                : "bg-slate-950/70 border-slate-800 text-white"
          }`}
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500/20 via-brand-gold/15 to-transparent border border-amber-500/30 flex items-center justify-center shadow-xl shadow-amber-500/10">
            <Scale className="h-10 w-10 text-amber-400 stroke-[2.2]" />
          </div>

          <div className="space-y-2 max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Deep Forensic Builder Tender &amp; Design Comparison
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Click <strong>Import Tenders / Estimates</strong> below to open your folder and select builder PDFs directly (or drag and drop files anywhere on this card). We scan the entire estimate, cross-check the builder's website promotions &amp; standard inclusions, compare floorplan sizes (m²) &amp; bedroom/living dimensions, audit 32 trade inclusions &amp; contract clauses, and review online reputation &amp; build times.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
            <Button
              type="button"
              size="lg"
              onClick={handleTriggerDirectFolderImport}
              className="h-13 px-8 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-sm tracking-wide shadow-xl shadow-amber-500/25 cursor-pointer gap-2.5 active:scale-95 transition-all"
            >
              <Upload className="h-5 w-5" />
              <span>Import Tenders / Estimates (Open Folder)</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => void handleLoadFullForensicSample()}
              className="h-13 px-6 rounded-2xl border-slate-700 text-xs sm:text-sm font-bold cursor-pointer gap-2 hover:border-amber-500/50 hover:text-amber-400"
            >
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>Load 3-Builder Forensic Audit Demo (Hudson vs Metricon vs Clarendon)</span>
            </Button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* RESULTS DASHBOARD                                            */}
      {/* ============================================================ */}
      {hasResults && !isAnalyzing && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Top Executive Value Verdict & Client PDF Download Banner */}
          <div
            className={`p-6 sm:p-8 rounded-3xl border shadow-2xl relative overflow-hidden backdrop-blur-xl ${
              isLight
                ? "bg-gradient-to-br from-emerald-50 via-white to-amber-50/50 border-emerald-300 text-slate-900"
                : "bg-gradient-to-br from-emerald-950/35 via-slate-950/90 to-amber-950/25 border-emerald-500/40 text-white"
            }`}
          >
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 relative z-10">
              <div className="space-y-3 max-w-4xl">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md">
                    <Award className="h-4 w-4" />
                    <span>EXECUTIVE VALUE VERDICT: BEST OVERALL VALUE WINNER</span>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-mono font-bold">
                    Forensic Score: {winningBuilder?.overallScore || 95}/100
                  </Badge>
                  <Badge className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-mono">
                    {winningBuilder?.inclusionTierName || "H2 Designer Turnkey"}
                  </Badge>
                </div>

                <div>
                  <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
                    {winningBuilder?.builderName}
                    <span className="text-amber-500 font-bold text-xl sm:text-3xl">
                      {" "}
                      — {winningBuilder?.modelName} ({winningBuilder?.totalAreaM2} m² / {winningBuilder?.totalAreaSquares} sq)
                    </span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 font-medium mt-2 leading-relaxed">
                    {session.executiveSummary || winningBuilder?.executiveSummary}
                  </p>
                </div>

                {/* Key Winner Advantages Pills */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  {(winningBuilder?.keyAdvantages || []).map((adv, i) => (
                    <div
                      key={i}
                      className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 flex-none text-emerald-400" />
                      <span>{adv}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Callout Card + PDF Actions */}
              <div
                className={`p-5 rounded-2xl border flex flex-col justify-between gap-4 xl:min-w-[330px] ${
                  isLight ? "bg-white/90 border-emerald-200 shadow-sm" : "bg-slate-900/90 border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      True Turnkey Completion Cost
                    </span>
                    <span className="text-3xl font-mono font-black text-emerald-400 block mt-0.5">
                      ${winningBuilder?.normalizedTruePrice.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      ${winningBuilder?.normalizedPricePerM2.toLocaleString()}/m² • Build Time:{" "}
                      {winningBuilder?.reputation.averageBuildTimeMonths}m
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Omissions</span>
                    <span className="text-sm font-mono font-black text-emerald-400">
                      {winningBuilder?.omissionsCost === 0
                        ? "$0 (Turnkey)"
                        : `+$${winningBuilder?.omissionsCost.toLocaleString()}`}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Warranty: {winningBuilder?.contractClauses.structuralWarrantyYears} Yrs
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePreviewPdf}
                    className="flex-1 h-10 rounded-xl text-xs font-bold gap-1.5 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 cursor-pointer"
                  >
                    <Eye className="h-4 w-4" />
                    Preview PDF
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleExportPdf}
                    className="flex-1 h-10 rounded-xl text-xs font-black gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 hover:from-emerald-400 hover:to-teal-300 cursor-pointer shadow-md"
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs Across All 7 Forensic Views */}
          <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-6">
            <TabsList className="bg-slate-900/70 border border-slate-800 p-1.5 rounded-2xl flex flex-wrap gap-1 h-auto">
              <TabsTrigger value="overview" className="rounded-xl text-xs font-bold gap-1.5 py-2 px-3">
                <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                1. Verdict &amp; Why Winner Wins
              </TabsTrigger>
              <TabsTrigger value="design_rooms" className="rounded-xl text-xs font-bold gap-1.5 py-2 px-3">
                <Home className="h-3.5 w-3.5 text-cyan-400" />
                2. Design, Size (m²) &amp; Room Sizes
              </TabsTrigger>
              <TabsTrigger value="promotions" className="rounded-xl text-xs font-bold gap-1.5 py-2 px-3">
                <Globe className="h-3.5 w-3.5 text-amber-400" />
                3. Website Promotions &amp; Fine Print
              </TabsTrigger>
              <TabsTrigger value="inclusions" className="rounded-xl text-xs font-bold gap-1.5 py-2 px-3">
                <Layers className="h-3.5 w-3.5 text-purple-400" />
                4. 32-Point Inclusions Matrix
              </TabsTrigger>
              <TabsTrigger value="fine_print" className="rounded-xl text-xs font-bold gap-1.5 py-2 px-3">
                <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                5. Contract Clauses &amp; Builder Concerns
              </TabsTrigger>
              <TabsTrigger value="reputation" className="rounded-xl text-xs font-bold gap-1.5 py-2 px-3">
                <Star className="h-3.5 w-3.5 text-yellow-400" />
                6. Reviews &amp; Build Times
              </TabsTrigger>
              <TabsTrigger value="full_table" className="rounded-xl text-xs font-bold gap-1.5 py-2 px-3">
                <FileSpreadsheet className="h-3.5 w-3.5 text-teal-400" />
                7. Master Sheet
              </TabsTrigger>
            </TabsList>

            {/* ============================================================ */}
            {/* TAB 1: VERDICT, FINANCIALS & FULL "WHY WINNER WINS" REPORT   */}
            {/* ============================================================ */}
            <TabsContent value="overview" className="space-y-6 mt-0">
              {/* Side-by-Side Builder Financial & Normalization Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {session.builders.map((builder) => {
                  const isWinner = builder.isBestValue;
                  const diffFromWinner = builder.normalizedTruePrice - (winningBuilder?.normalizedTruePrice || 0);
                  return (
                    <div
                      key={builder.id}
                      className={`p-6 rounded-3xl border flex flex-col justify-between gap-5 transition-all ${
                        isWinner
                          ? isLight
                            ? "bg-emerald-50/70 border-emerald-400 shadow-xl"
                            : "bg-emerald-950/25 border-emerald-500/50 shadow-2xl shadow-emerald-500/10"
                          : isLight
                            ? "bg-white border-slate-200"
                            : "bg-slate-900/75 border-slate-800"
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-xl font-black">{builder.builderName}</h3>
                              {isWinner ? (
                                <Badge className="bg-emerald-500 text-slate-950 font-black text-[10px]">
                                  BEST VALUE WINNER
                                </Badge>
                              ) : (
                                <Badge className="bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold text-[10px]">
                                  +${diffFromWinner.toLocaleString()} True Cost
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">
                              {builder.modelName} • {builder.totalAreaM2} m² ({builder.totalAreaSquares} sq)
                              {builder.areaDifferenceFromBenchmarkM2
                                ? ` (${builder.areaDifferenceFromBenchmarkM2 > 0 ? "+" : ""}${builder.areaDifferenceFromBenchmarkM2} m²)`
                                : ""}
                            </p>
                            <p className="text-[11px] text-amber-400 font-semibold mt-0.5">
                              Tier: {builder.inclusionTierName || "Standard Tier"}
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Audit Score
                            </span>
                            <span
                              className={`text-lg font-mono font-black ${
                                isWinner ? "text-emerald-400" : "text-slate-300"
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
                                {builder.siteCostCertainty === "fixed"
                                  ? "100% Fixed"
                                  : builder.siteCostCertainty === "semi_fixed"
                                    ? "Class M Cap"
                                    : "Provisional"}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Statutory &amp; Authority Fees:</span>
                            <span>${builder.statutoryCosts.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Promotions / Rebates:</span>
                            <span className="text-emerald-400">-${builder.promotionsOrDiscounts.toLocaleString()}</span>
                          </div>

                          <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-sm">
                            <span className="text-slate-300 font-sans font-semibold">Stated Tender Total:</span>
                            <span className="font-black">
                              ${builder.statedTotalPrice.toLocaleString()} (${builder.statedPricePerM2}/m²)
                            </span>
                          </div>

                          {/* Normalization Adjustments */}
                          <div className="pt-2.5 space-y-1.5 bg-slate-500/10 p-3 rounded-2xl">
                            <span className="text-[10px] text-amber-400 font-sans font-bold uppercase tracking-wider block">
                              Apples-to-Apples Turnkey Normalization:
                            </span>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">Omitted Inclusions (32-Pt Audit):</span>
                              <span
                                className={`font-bold ${
                                  builder.omissionsCost > 0 ? "text-rose-400" : "text-emerald-400"
                                }`}
                              >
                                {builder.omissionsCost > 0
                                  ? `+$${builder.omissionsCost.toLocaleString()}`
                                  : "$0 (All Included)"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">Site / Piering / Rock Risk:</span>
                              <span
                                className={`font-bold ${
                                  builder.siteCostContingency > 0 ? "text-rose-400" : "text-emerald-400"
                                }`}
                              >
                                {builder.siteCostContingency > 0
                                  ? `+$${builder.siteCostContingency.toLocaleString()}`
                                  : "$0 (100% Fixed)"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400">Floorplan Area Difference:</span>
                              <span className="font-bold text-cyan-400">
                                {builder.areaDifferenceFromBenchmarkM2 === 0
                                  ? "Benchmark (0 m² diff)"
                                  : `${builder.areaDifferenceFromBenchmarkM2 && builder.areaDifferenceFromBenchmarkM2 > 0 ? "+" : ""}${builder.areaDifferenceFromBenchmarkM2} m² vs Hudson`}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* General Builder Concerns Flagged */}
                        {(builder.contractClauses.generalBuilderConcerns || []).length > 0 && !builder.isHudson && (
                          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Key Builder Concerns Flagged:
                            </span>
                            {builder.contractClauses.generalBuilderConcerns!.slice(0, 2).map((concern, cIdx) => (
                              <p key={cIdx} className="text-[11px] text-rose-200/90 leading-snug">
                                • {concern}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card Bottom Total */}
                      <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">
                            True Turnkey Completion Cost
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            ${builder.normalizedPricePerM2.toLocaleString()}/m² • {builder.reputation.averageBuildTimeMonths}m build
                          </span>
                        </div>
                        <span
                          className={`text-2xl font-mono font-black ${
                            isWinner ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          ${builder.normalizedTruePrice.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* FULL 5-PILLAR BREAKDOWN ON EXACTLY WHY THE WINNER WINS */}
              <div
                className={`p-6 sm:p-8 rounded-3xl border space-y-5 ${
                  isLight ? "bg-white border-slate-200 text-slate-900" : "bg-slate-900/70 border-slate-800 text-white"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-amber-400" />
                      <h3 className="text-lg sm:text-xl font-black tracking-tight">
                        Full Forensic Breakdown: Exactly Why {winningBuilder?.builderName} Offers the Best Value
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Point-by-point justification across bottom-line turnkey price, floorplan &amp; room dimensions, website promotion fine print, contract safety, and build speed.
                    </p>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold self-start sm:self-center">
                    5-Pillar Forensic Proof
                  </Badge>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {(session.whyWinnerDetailedBreakdown || []).map((pillar, idx) => (
                    <div
                      key={idx}
                      className={`p-5 rounded-2xl border-l-4 border-l-amber-500 border ${
                        isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800/80"
                      } flex flex-col lg:flex-row lg:items-center justify-between gap-4`}
                    >
                      <div className="space-y-1.5 max-w-4xl">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h4 className="text-sm sm:text-base font-black text-amber-400">{pillar.pillarTitle}</h4>
                          <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                            {pillar.winnerHighlight}
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                          {pillar.detailedExplanation}
                        </p>
                      </div>
                      <div className="shrink-0 lg:text-right">
                        <span className="px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-black text-xs sm:text-sm inline-block">
                          {pillar.quantifiedDollarImpact}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* ============================================================ */}
            {/* TAB 2: HOME DESIGN, OVERALL SIZE (m²) & ROOM DIMENSIONS      */}
            {/* ============================================================ */}
            <TabsContent value="design_rooms" className="space-y-6 mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {session.builders.map((b) => {
                  const d = b.designArchitecture;
                  return (
                    <div
                      key={b.id}
                      className={`p-6 rounded-3xl border space-y-5 ${
                        b.isBestValue
                          ? isLight
                            ? "bg-emerald-50/50 border-emerald-300"
                            : "bg-emerald-950/20 border-emerald-500/40"
                          : isLight
                            ? "bg-white border-slate-200"
                            : "bg-slate-900/70 border-slate-800"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-4">
                        <div>
                          <h3 className="text-lg font-black">{b.builderName}</h3>
                          <p className="text-sm font-bold text-amber-400">
                            {b.modelName} ({b.housingType})
                          </p>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-xl font-black text-white block">{b.totalAreaM2} m²</span>
                          <span className="text-xs text-slate-400">{b.totalAreaSquares} Squares</span>
                        </div>
                      </div>

                      {/* Area Breakdown Grid */}
                      {d && (
                        <>
                          <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
                            <div className="p-2.5 rounded-xl bg-slate-500/10 border border-slate-500/20">
                              <span className="text-[10px] text-slate-400 block">Ground Floor Living</span>
                              <span className="font-bold text-sm">{d.groundFloorInternalM2} m²</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-500/10 border border-slate-500/20">
                              <span className="text-[10px] text-slate-400 block">First Floor Living</span>
                              <span className="font-bold text-sm">{d.firstFloorInternalM2} m²</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-500/10 border border-slate-500/20">
                              <span className="text-[10px] text-slate-400 block">Garage &amp; Porch</span>
                              <span className="font-bold text-sm">
                                {d.garageM2} m² + {d.porchM2} m²
                              </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-500/10 border border-slate-500/20">
                              <span className="text-[10px] text-slate-400 block">Alfresco Area</span>
                              <span className="font-bold text-sm">{d.alfrescoM2} m²</span>
                            </div>
                          </div>

                          {/* Size Difference Alert */}
                          <div
                            className={`p-3 rounded-2xl border text-xs flex items-center justify-between ${
                              b.areaDifferenceFromBenchmarkM2 === 0
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                                : (b.areaDifferenceFromBenchmarkM2 || 0) < 0
                                  ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                                  : "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
                            }`}
                          >
                            <span className="font-bold">Size Difference vs Benchmark:</span>
                            <span className="font-mono font-black">
                              {b.areaDifferenceFromBenchmarkM2 === 0
                                ? "Benchmark (238.4 m²)"
                                : `${(b.areaDifferenceFromBenchmarkM2 || 0) > 0 ? "+" : ""}${b.areaDifferenceFromBenchmarkM2} m²`}
                            </span>
                          </div>

                          {/* Room Counts & Dimensions */}
                          <div className="space-y-3 text-xs">
                            <div className="p-3 rounded-2xl bg-slate-500/5 border border-slate-500/15 space-y-1.5">
                              <div className="flex items-center gap-1.5 font-bold text-amber-400">
                                <BedDouble className="h-4 w-4" />
                                <span>{d.bedroomsCount} Bedrooms — Sizes &amp; Master Suite:</span>
                              </div>
                              <p className="text-slate-300 font-semibold">{d.secondaryBedroomsAverageSize}</p>
                              <div className="space-y-1 pt-1 text-[11px] font-mono text-slate-400">
                                {d.bedroomSizesDetail.map((bed, idx) => (
                                  <div key={idx}>• {bed}</div>
                                ))}
                              </div>
                            </div>

                            <div className="p-3 rounded-2xl bg-slate-500/5 border border-slate-500/15 space-y-1">
                              <div className="flex items-center gap-1.5 font-bold text-cyan-400">
                                <Utensils className="h-4 w-4" />
                                <span>Kitchen &amp; Butler's Pantry / WIP:</span>
                              </div>
                              <p className="text-slate-200 font-medium">{d.kitchenDimensionsAndLayout}</p>
                              <p className="text-[11px] text-slate-400">Pantry: {d.butlersPantryOrWip}</p>
                            </div>

                            <div className="p-3 rounded-2xl bg-slate-500/5 border border-slate-500/15 space-y-1">
                              <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                                <Bath className="h-4 w-4" />
                                <span>
                                  {d.bathroomsCount} Bathrooms ({d.ensuitesCount} Ensuite, {d.powderRoomsCount} Powder) &amp;{" "}
                                  {d.livingZonesCount} Living Zones:
                                </span>
                              </div>
                              <div className="space-y-0.5 text-[11px] text-slate-300">
                                {d.livingZonesList.map((zone, zIdx) => (
                                  <div key={zIdx}>• {zone}</div>
                                ))}
                                <div>
                                  • Study / Office:{" "}
                                  <strong className={d.studyOrOfficeIncluded ? "text-emerald-400" : "text-rose-400"}>
                                    {d.studyOrOfficeIncluded ? "Included" : "Not Included"}
                                  </strong>
                                </div>
                              </div>
                            </div>

                            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 leading-relaxed">
                              <strong>Design Auditor Note:</strong> {d.designVerdictNotes}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* ============================================================ */}
            {/* TAB 3: WEBSITE PROMOTIONS, INCLUSION RANGE & FINE PRINT      */}
            {/* ============================================================ */}
            <TabsContent value="promotions" className="space-y-6 mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {session.builders.map((b) => {
                  const p = b.promotionAudit;
                  return (
                    <div
                      key={b.id}
                      className={`p-6 rounded-3xl border space-y-4 ${
                        b.isBestValue
                          ? isLight
                            ? "bg-emerald-50/60 border-emerald-300"
                            : "bg-emerald-950/20 border-emerald-500/40"
                          : isLight
                            ? "bg-white border-slate-200"
                            : "bg-slate-900/70 border-slate-800"
                      }`}
                    >
                      <div className="space-y-1 border-b border-slate-800 pb-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-black">{b.builderName}</h3>
                          <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                            Website &amp; Promo Audit
                          </Badge>
                        </div>
                        <p className="text-xs font-bold text-cyan-400">{p?.inclusionRangeTier || b.inclusionTierName}</p>
                        <p className="text-[11px] text-slate-400 font-mono truncate">
                          Source: {p?.websiteUrlChecked || "Builder Website & Brochure"}
                        </p>
                      </div>

                      {p && (
                        <div className="space-y-3 text-xs">
                          <div className="p-3 rounded-2xl bg-slate-500/10 border border-slate-500/20 space-y-1">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">
                              Advertised Promotion Headline:
                            </span>
                            <p className="font-bold text-amber-400 text-sm">{p.advertisedValueClaim}</p>
                            <span className="text-[10px] font-bold uppercase text-slate-400 block pt-1">
                              Forensic Assessed Real Trade Value:
                            </span>
                            <p className="font-semibold text-emerald-400">{p.realAssessedValue}</p>
                          </div>

                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Active Promotions Detected:
                            </span>
                            {p.activePromotionsFound.map((promo, idx) => (
                              <div key={idx} className="flex items-start gap-1.5 text-slate-200 text-[11px]">
                                <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                                <span>{promo}</span>
                              </div>
                            ))}
                          </div>

                          <div className="space-y-1.5 pt-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">
                              Promotion Fine Print &amp; Exclusions Uncovered:
                            </span>
                            {p.promotionFinePrintTraps.map((trap, idx) => (
                              <div
                                key={idx}
                                className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-200 flex items-start gap-1.5 leading-snug"
                              >
                                <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                                <span>{trap}</span>
                              </div>
                            ))}
                          </div>

                          <div className="p-3 rounded-2xl bg-slate-500/5 border border-slate-500/15 space-y-1">
                            <span className="text-[10px] font-bold uppercase text-cyan-400 block">
                              Website Photography vs Submitted Estimate:
                            </span>
                            {p.websiteVsEstimateDiscrepancies.map((disc, idx) => (
                              <p key={idx} className="text-[11px] text-slate-300 leading-relaxed">
                                {disc}
                              </p>
                            ))}
                          </div>

                          <p className="text-[11px] text-slate-400 italic pt-1">{p.standardInclusionsSummary}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* ============================================================ */}
            {/* TAB 4: 32-POINT TRADE-BY-TRADE INCLUSIONS MATRIX             */}
            {/* ============================================================ */}
            <TabsContent value="inclusions" className="space-y-4 mt-0">
              {/* Category Filter Bar */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {categoryOptions.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedCategoryFilter === cat.id
                        ? "bg-amber-500 text-slate-950 shadow-md"
                        : "bg-slate-900/70 text-slate-400 border border-slate-800 hover:text-white"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div
                className={`p-5 rounded-3xl border overflow-x-auto ${
                  isLight ? "bg-white border-slate-200" : "bg-slate-900/60 border-slate-800"
                }`}
              >
                <table className="w-full text-left border-collapse min-w-[850px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-black uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-4 w-[26%]">Trade Specification Item ({referenceInclusions.length})</th>
                      {session.builders.map((b) => (
                        <th key={b.id} className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span>{b.builderName}</span>
                            {b.isBestValue && (
                              <Badge className="bg-amber-500 text-slate-950 font-black text-[9px]">BEST VALUE</Badge>
                            )}
                          </div>
                          <div className="text-[10px] font-normal text-slate-400 mt-0.5">
                            {b.inclusionTierName || b.modelName}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                    {referenceInclusions.map((refItem, rowIdx) => (
                      <tr
                        key={refItem.id}
                        className={`hover:bg-slate-500/5 transition-colors ${
                          rowIdx % 2 === 0 ? "bg-transparent" : "bg-slate-500/5"
                        }`}
                      >
                        <td className="py-3.5 px-4 align-top">
                          <div className="font-bold text-slate-100">{refItem.featureName}</div>
                          <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">
                            {refItem.categoryLabel}
                          </span>
                        </td>
                        {session.builders.map((b) => {
                          const item =
                            b.inclusions.find(
                              (inc) =>
                                inc.featureName.toLowerCase() === refItem.featureName.toLowerCase() ||
                                inc.id.endsWith(refItem.id.split("-").slice(-2).join("-"))
                            ) || refItem;

                          return (
                            <td key={b.id} className="py-3.5 px-4 align-top">
                              {item.status === "included" ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                                    <Check className="h-4 w-4 stroke-[3]" />
                                    <span>INCLUDED ($0 Extra)</span>
                                  </div>
                                  <p className="text-[11px] text-slate-300 leading-snug">{item.specification}</p>
                                </div>
                              ) : item.status === "provisional_sum" ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    <span>PROVISIONAL (+${item.estimatedOmissionCost.toLocaleString()} Risk)</span>
                                  </div>
                                  <p className="text-[11px] text-slate-300 leading-snug">{item.specification}</p>
                                </div>
                              ) : item.status === "upgrade_required" ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    <span>UPGRADE EXTRA (+${item.estimatedOmissionCost.toLocaleString()})</span>
                                  </div>
                                  <p className="text-[11px] text-slate-300 leading-snug">{item.specification}</p>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                                    <X className="h-4 w-4 stroke-[3]" />
                                    <span>EXCLUDED (+${item.estimatedOmissionCost.toLocaleString()})</span>
                                  </div>
                                  <p className="text-[11px] text-slate-300 leading-snug">{item.specification}</p>
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

            {/* ============================================================ */}
            {/* TAB 5: CONTRACT CLAUSES, FINE PRINT & BUILDER CONCERNS       */}
            {/* ============================================================ */}
            <TabsContent value="fine_print" className="space-y-5 mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
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
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="font-black text-lg">{b.builderName}</h3>
                        <p className="text-xs text-slate-400">Contract &amp; Clause Risk Profile</p>
                      </div>
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

                    <div className="space-y-2.5 text-xs divide-y divide-slate-200 dark:divide-slate-800/80">
                      <div className="pt-2 flex items-center justify-between gap-2">
                        <span className="text-slate-400 font-semibold">Price Lock Period:</span>
                        <span className="font-bold text-right">{b.contractClauses.priceLockMonths} Months Freeze</span>
                      </div>
                      <div className="pt-2 flex items-center justify-between gap-2">
                        <span className="text-slate-400 font-semibold">Cost Escalation Clause:</span>
                        <span
                          className={`font-bold text-right ${
                            b.contractClauses.escalationClauseRisk === "low" ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {b.contractClauses.escalationClauseRisk === "low" ? "Zero Escalation" : "Subject to Price Rises"}
                        </span>
                      </div>
                      <div className="pt-2 flex items-center justify-between gap-2">
                        <span className="text-slate-400 font-semibold">Post-Contract Variation Margin:</span>
                        <span className="font-bold font-mono">
                          {b.contractClauses.provisionalVariationMarginPercent || 20}% Markup
                        </span>
                      </div>
                      <div className="pt-2 flex items-center justify-between gap-2">
                        <span className="text-slate-400 font-semibold">Piering Allowance Included:</span>
                        <span className="font-bold font-mono">{b.contractClauses.pieringAllowanceMeters} Linear Meters</span>
                      </div>
                      <div className="pt-2 flex items-center justify-between gap-2">
                        <span className="text-slate-400 font-semibold">Rock Excavation Terms:</span>
                        <span className="font-bold text-right max-w-[190px]">{b.contractClauses.rockExcavationCoverage}</span>
                      </div>
                      <div className="pt-2 flex items-center justify-between gap-2">
                        <span className="text-slate-400 font-semibold">Liquidated Damages (Late Build):</span>
                        <span className="font-bold font-mono">${b.contractClauses.liquidatedDamagesPerWeek}/week</span>
                      </div>
                      <div className="pt-2 flex items-center justify-between gap-2">
                        <span className="text-slate-400 font-semibold">Structural Warranty:</span>
                        <span className="font-bold text-emerald-400">
                          {b.contractClauses.structuralWarrantyYears} Years
                        </span>
                      </div>
                    </div>

                    {b.contractClauses.structuralWarrantyFinePrint && (
                      <div className="p-3 rounded-2xl bg-slate-500/10 border border-slate-500/20 text-[11px] text-slate-300 leading-snug">
                        <strong className="text-amber-400 block mb-0.5">Warranty Fine Print:</strong>
                        {b.contractClauses.structuralWarrantyFinePrint}
                      </div>
                    )}

                    {/* Fine print warning flags */}
                    {b.contractClauses.finePrintWarnings.length > 0 && (
                      <div className="pt-1 space-y-1.5">
                        <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block">
                          Contract Fine Print Traps:
                        </span>
                        {b.contractClauses.finePrintWarnings.map((warn, wIdx) => (
                          <div
                            key={wIdx}
                            className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-200 leading-snug flex items-start gap-1.5"
                          >
                            <AlertTriangle className="h-3.5 w-3.5 flex-none mt-0.5 text-rose-400" />
                            <span>{warn}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* General Builder Concerns */}
                    {(b.contractClauses.generalBuilderConcerns || []).length > 0 && (
                      <div className="pt-1 space-y-1.5">
                        <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                          General Builder Concerns Flagged:
                        </span>
                        {b.contractClauses.generalBuilderConcerns!.map((concern, cIdx) => (
                          <div
                            key={cIdx}
                            className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 leading-snug flex items-start gap-1.5"
                          >
                            <Info className="h-3.5 w-3.5 flex-none mt-0.5 text-amber-400" />
                            <span>{concern}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* ============================================================ */}
            {/* TAB 6: ONLINE REPUTATION, RECENT REVIEWS & BUILD TIMES       */}
            {/* ============================================================ */}
            <TabsContent value="reputation" className="space-y-5 mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {session.builders.map((b) => (
                  <div
                    key={b.id}
                    className={`p-6 rounded-3xl border space-y-4 ${
                      isLight ? "bg-white border-slate-200" : "bg-slate-900/70 border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="font-black text-lg">{b.builderName}</h3>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {b.reputation.reviewCount.toLocaleString()} Verified Reviews • {b.reputation.source}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 font-black font-mono text-sm">
                        <Star className="h-4 w-4 fill-amber-400" />
                        <span>{b.reputation.rating} / 5.0</span>
                      </div>
                    </div>

                    {/* Build Time Breakdown Box */}
                    <div className="p-4 rounded-2xl bg-slate-500/10 border border-slate-500/20 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          Total End-to-End Build Time:
                        </span>
                        <span className="font-mono font-black text-base text-white">
                          {b.reputation.averageBuildTimeMonths} Months
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono">
                        <div className="p-2 rounded-lg bg-slate-950/60">
                          <span className="text-slate-400 block text-[10px]">Pre-Construction Admin</span>
                          <span className="font-bold text-amber-300">
                            {b.reputation.preConstructionAdminMonths || 3.5} Months
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-950/60">
                          <span className="text-slate-400 block text-[10px]">On-Site Construction</span>
                          <span className="font-bold text-emerald-300">
                            {b.reputation.constructionDurationMonths || 6.5} Months
                          </span>
                        </div>
                      </div>
                    </div>

                    {b.reputation.licensingAndFinancialNote && (
                      <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-200 leading-snug">
                        <strong className="block text-cyan-400 mb-0.5 flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          Licensing &amp; Corporate Standing:
                        </strong>
                        {b.reputation.licensingAndFinancialNote}
                      </div>
                    )}

                    <div className="p-3 rounded-2xl bg-slate-500/5 text-xs text-slate-300 leading-relaxed">
                      {b.reputation.sentimentSummary}
                    </div>

                    {/* Recent Customer Review Highlights */}
                    {(b.reputation.recentReviewHighlights || []).length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                          Recent Verified Homeowner Feedback:
                        </span>
                        {b.reputation.recentReviewHighlights!.map((quote, qIdx) => (
                          <div
                            key={qIdx}
                            className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-[11px] text-slate-300 italic leading-snug"
                          >
                            {quote}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2 text-xs pt-1">
                      <div className="space-y-1">
                        <span className="text-[10px] text-emerald-400 font-bold uppercase block">Top Strengths:</span>
                        {b.reputation.topStrengths.map((str, sIdx) => (
                          <div key={sIdx} className="text-[11px] text-emerald-300 flex items-start gap-1.5">
                            <Check className="h-3.5 w-3.5 flex-none mt-0.5 text-emerald-400" />
                            <span>{str}</span>
                          </div>
                        ))}
                      </div>

                      {b.reputation.topComplaints.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] text-rose-400 font-bold uppercase block">
                            Common Buyer Complaints:
                          </span>
                          {b.reputation.topComplaints.map((comp, cIdx) => (
                            <div key={cIdx} className="text-[11px] text-rose-300 flex items-start gap-1.5">
                              <X className="h-3.5 w-3.5 flex-none mt-0.5 text-rose-400" />
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

            {/* ============================================================ */}
            {/* TAB 7: MASTER COMPARISON TABLE                               */}
            {/* ============================================================ */}
            <TabsContent value="full_table" className="space-y-4 mt-0">
              <div
                className={`p-6 rounded-3xl border overflow-x-auto ${
                  isLight ? "bg-white border-slate-200" : "bg-slate-900/60 border-slate-800"
                }`}
              >
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
                  <div>
                    <h3 className="font-black text-base">Executive Master Comparison Matrix</h3>
                    <p className="text-xs text-slate-400">
                      Side-by-side summary across pricing, floorplan dimensions, promotions, contract clauses, and build times.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handlePreviewPdf}
                      className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Preview PDF
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleExportPdf}
                      className="rounded-xl text-xs font-bold gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download Clean PDF
                    </Button>
                  </div>
                </div>

                <table className="w-full text-left border-collapse text-xs min-w-[750px]">
                  <thead>
                    <tr className="border-b border-slate-700 text-slate-400 font-bold">
                      <th className="py-2.5 px-3 w-1/4">Forensic Audit Metric</th>
                      {session.builders.map((b) => (
                        <th key={b.id} className="py-2.5 px-3">
                          {b.builderName} ({b.modelName})
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    <tr>
                      <td className="py-2.5 px-3 text-slate-400 font-semibold">Inclusion Tier</td>
                      {session.builders.map((b) => (
                        <td key={b.id} className="py-2.5 px-3 font-bold text-amber-400">
                          {b.inclusionTierName || "Standard Tier"}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-400 font-semibold">Total Area &amp; Size Difference</td>
                      {session.builders.map((b) => (
                        <td key={b.id} className="py-2.5 px-3 font-mono">
                          {b.totalAreaM2} m² ({b.totalAreaSquares} sq){" "}
                          {b.areaDifferenceFromBenchmarkM2
                            ? `[${b.areaDifferenceFromBenchmarkM2 > 0 ? "+" : ""}${b.areaDifferenceFromBenchmarkM2} m²]`
                            : "[Benchmark]"}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-400 font-semibold">Bedrooms, Bathrooms &amp; Living Zones</td>
                      {session.builders.map((b) => (
                        <td key={b.id} className="py-2.5 px-3">
                          {b.designArchitecture?.bedroomsCount || 4} Bed • {b.designArchitecture?.bathroomsCount || 2.5} Bath •{" "}
                          {b.designArchitecture?.livingZonesCount || 2} Living Zones
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-400 font-semibold">Secondary Bedroom Dimensions</td>
                      {session.builders.map((b) => (
                        <td key={b.id} className="py-2.5 px-3">
                          {b.designArchitecture?.secondaryBedroomsAverageSize}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-400 font-semibold">Stated Tender Total Price</td>
                      {session.builders.map((b) => (
                        <td key={b.id} className="py-2.5 px-3 font-mono font-bold">
                          ${b.statedTotalPrice.toLocaleString()} (${b.statedPricePerM2}/m²)
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-400 font-semibold">Omitted Turnkey Inclusions Cost</td>
                      {session.builders.map((b) => (
                        <td
                          key={b.id}
                          className={`py-2.5 px-3 font-mono font-bold ${
                            b.omissionsCost > 0 ? "text-rose-400" : "text-emerald-400"
                          }`}
                        >
                          {b.omissionsCost === 0 ? "$0 (Included)" : `+$${b.omissionsCost.toLocaleString()}`}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-400 font-semibold">Site Cost &amp; Piering Risk</td>
                      {session.builders.map((b) => (
                        <td
                          key={b.id}
                          className={`py-2.5 px-3 font-mono font-bold ${
                            b.siteCostContingency > 0 ? "text-rose-400" : "text-emerald-400"
                          }`}
                        >
                          {b.siteCostContingency === 0
                            ? "$0 (100% Fixed, 100m Piers)"
                            : `+$${b.siteCostContingency.toLocaleString()} (${b.contractClauses.pieringAllowanceMeters}m Cap)`}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-slate-500/10 font-black text-sm">
                      <td className="py-3 px-3 text-amber-400">TRUE TURNKEY COMPLETION COST</td>
                      {session.builders.map((b) => (
                        <td
                          key={b.id}
                          className={`py-3 px-3 font-mono ${b.isBestValue ? "text-emerald-400" : "text-rose-400"}`}
                        >
                          ${b.normalizedTruePrice.toLocaleString()} (${b.normalizedPricePerM2}/m²)
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-400 font-semibold">Price Lock &amp; Warranty</td>
                      {session.builders.map((b) => (
                        <td key={b.id} className="py-2.5 px-3 font-mono">
                          {b.contractClauses.priceLockMonths}m Price Lock • {b.contractClauses.structuralWarrantyYears}-Yr Warranty
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-400 font-semibold">Total Build Time &amp; Review Score</td>
                      {session.builders.map((b) => (
                        <td key={b.id} className="py-2.5 px-3 font-mono">
                          {b.reputation.averageBuildTimeMonths} Months ({b.reputation.rating}★ / 5.0)
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* ============================================================ */}
      {/* CLIENT PDF PREVIEW MODAL                                     */}
      {/* ============================================================ */}
      {pdfPreviewDataUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-5xl h-[88vh] bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileCheck2 className="h-5 w-5 text-emerald-400" />
                <span className="font-black text-sm text-white">
                  Client-Ready Executive Tender Comparison PDF Preview
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleExportPdf}
                  className="rounded-xl text-xs font-black gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download PDF File
                </Button>
                <button
                  type="button"
                  onClick={() => setPdfPreviewDataUrl(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <iframe
              src={pdfPreviewDataUrl}
              title="Tender Comparison PDF Preview"
              className="w-full flex-1 bg-slate-900"
            />
          </div>
        </div>
      )}
    </div>
  );
}
