import React, { useState } from "react";
import {
  FolderOpen,
  Search,
  Calendar,
  DollarSign,
  Download,
  Upload,
  Copy,
  Trash2,
  CheckCircle2,
  CheckSquare,
  Square,
  FileText,
  Home,
  User,
  Plus,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Users,
  UserCheck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { formatAud } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { calculateQuotePricing, generateQuoteNumber, resolveItemCategory } from "@/lib/quoting/quoteEngine";
import { createNewBlankQuote, recoverAllHistoricalQuotes, loadAllQuotesAsync } from "@/lib/quoting/quoteStorage";
import { pdfDocumentToPagesAndText } from "@/lib/pdfPages";
import { parseQuoteFromEstimatePdf } from "@/lib/quoting/parseQuotePdf";
import type { FullQuote } from "@/lib/quoting/quoteTypes";
import { getActiveStaffUser, type StaffProfile } from "@/lib/authSession";

interface QuoteEstimatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  savedQuotes: FullQuote[];
  activeQuoteId?: string;
  onLoadQuote: (quote: FullQuote) => void;
  onDeleteQuote: (id: string) => void;
  onDeleteQuotes?: (ids: string[]) => void | Promise<void>;
  onSaveCurrentQuote: () => void;
  onImportQuote: (quote: FullQuote) => void;
}

function normalizeRawQuote(raw: any): FullQuote | null {
  if (!raw || typeof raw !== "object") return null;

  // If wrapped in { quote: ... } or { data: ... }
  if (raw.quote && typeof raw.quote === "object") {
    return normalizeRawQuote(raw.quote);
  }
  if (raw.data && typeof raw.data === "object") {
    return normalizeRawQuote(raw.data);
  }

  const defaultBlank = createNewBlankQuote();

  const client = {
    ...defaultBlank.client,
    ...(raw.client || {}),
  };

  const design = {
    ...defaultBlank.design,
    ...(raw.design || {}),
  };

  const siteConditions = {
    ...defaultBlank.siteConditions,
    ...(raw.siteConditions || {}),
  };

  const lineItems = Array.isArray(raw.lineItems)
    ? raw.lineItems.map((it: any) => ({
        ...it,
        category: resolveItemCategory(it),
      }))
    : defaultBlank.lineItems;

  const depositAmount = client.depositAmount || 1650;
  const pricing =
    raw.pricing && raw.pricing.grossEstimatedInvestment
      ? raw.pricing
      : calculateQuotePricing(design, siteConditions, lineItems, depositAmount);

  return {
    id: raw.id || `quote_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    quoteNumber: raw.quoteNumber || client.estimateNumber || generateQuoteNumber(),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: raw.status || "draft",
    client,
    design,
    siteConditions,
    lineItems,
    pricing,
  };
}

function extractQuotesFromFile(text: string): FullQuote[] {
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return [];
  }

  const results: FullQuote[] = [];

  // 1. Direct array of quotes
  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      const q = normalizeRawQuote(item);
      if (q) results.push(q);
    }
    if (results.length > 0) return results;
  }

  // 2. Direct single quote object or localStorage dump
  if (parsed && typeof parsed === "object") {
    // If it's a localStorage dump
    for (const [key, val] of Object.entries(parsed)) {
      if (typeof val === "string" && (key.includes("quote") || key.includes("hudson") || key.includes("draft"))) {
        try {
          const inner = JSON.parse(val);
          const innerQuotes = extractQuotesFromFile(JSON.stringify(inner));
          if (innerQuotes.length > 0) {
            results.push(...innerQuotes);
          }
        } catch {
          // ignore
        }
      }
    }
    if (results.length > 0) return results;

    // Direct object
    const single = normalizeRawQuote(parsed);
    if (single) {
      results.push(single);
      return results;
    }
  }

  return results;
}

export function QuoteEstimatesDialog({
  open,
  onOpenChange,
  savedQuotes,
  activeQuoteId,
  onLoadQuote,
  onDeleteQuote,
  onDeleteQuotes,
  onSaveCurrentQuote,
  onImportQuote,
}: QuoteEstimatesDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStaff, setActiveStaff] = useState<StaffProfile | null>(() => getActiveStaffUser());
  const [scopeFilter, setScopeFilter] = useState<"mine" | "all">("mine");
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<Set<string>>(new Set());

  const isMyQuote = (q: FullQuote) => {
    if (!activeStaff) return true;
    const cEmail = (q.client?.consultantEmail || "").toLowerCase().trim();
    const cName = (q.client?.consultantName || "").toLowerCase().trim();
    const myEmail = activeStaff.email.toLowerCase().trim();
    const myName = activeStaff.name.toLowerCase().trim();
    return (
      cEmail === myEmail ||
      (cName.length > 0 && (cName.includes(myName) || myName.includes(cName))) ||
      q.client?.consultantId === activeStaff.id
    );
  };

  const myQuotesCount = savedQuotes.filter(isMyQuote).length;
  const allQuotesCount = savedQuotes.length;

  const scopedQuotes =
    scopeFilter === "mine" && activeStaff ? savedQuotes.filter(isMyQuote) : savedQuotes;

  const filteredQuotes = scopedQuotes.filter((q) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const name = (q.client?.clientName || "").toLowerCase();
    const est = (q.quoteNumber || q.client?.estimateNumber || "").toLowerCase();
    const addr = (q.client?.siteAddress || "").toLowerCase();
    const suburb = (q.client?.suburb || "").toLowerCase();
    const design = (q.design?.designName || "").toLowerCase();
    const consultant = (q.client?.consultantName || "").toLowerCase();
    return (
      name.includes(query) ||
      est.includes(query) ||
      addr.includes(query) ||
      suburb.includes(query) ||
      design.includes(query) ||
      consultant.includes(query)
    );
  });

  const isAllFilteredSelected =
    filteredQuotes.length > 0 && filteredQuotes.every((q) => selectedQuoteIds.has(q.id));

  const handleToggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      setSelectedQuoteIds((prev) => {
        const next = new Set(prev);
        for (const q of filteredQuotes) {
          next.delete(q.id);
        }
        return next;
      });
    } else {
      setSelectedQuoteIds((prev) => {
        const next = new Set(prev);
        for (const q of filteredQuotes) {
          next.add(q.id);
        }
        return next;
      });
    }
  };

  const handleToggleSelectQuote = (id: string) => {
    setSelectedQuoteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    const idsToDelete = Array.from(selectedQuoteIds);
    if (idsToDelete.length === 0) return;

    const count = idsToDelete.length;
    const confirmMsg = `Are you sure you want to permanently delete ${count} selected estimate${count > 1 ? "s" : ""}? This action cannot be undone.`;

    if (confirm(confirmMsg)) {
      if (onDeleteQuotes) {
        await onDeleteQuotes(idsToDelete);
      } else {
        for (const id of idsToDelete) {
          await onDeleteQuote(id);
        }
      }
      setSelectedQuoteIds(new Set());
      toast.success(`Successfully deleted ${count} estimate${count > 1 ? "s" : ""} in bulk`);
    }
  };

  const handleBulkExportJson = () => {
    const selectedList = savedQuotes.filter((q) => selectedQuoteIds.has(q.id));
    if (selectedList.length === 0) return;
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selectedList, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `Hudson_Estimates_Backup_${selectedList.length}_quotes_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success(`Exported ${selectedList.length} estimate(s) as JSON backup`);
    } catch {
      toast.error("Could not export backup JSON");
    }
  };

  const handleDuplicate = (quote: FullQuote) => {
    const newEstNo = generateQuoteNumber();
    const clone: FullQuote = {
      ...quote,
      id: `quote_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      quoteNumber: newEstNo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      client: {
        ...quote.client,
        estimateNumber: newEstNo,
        clientName: `${quote.client.clientName || "Client"} (Copy)`,
      },
    };
    onImportQuote(clone);
    toast.success(`Created duplicate copy #${newEstNo}`);
  };

  const handleExportJson = (quote: FullQuote) => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(quote, null, 2));
      const downloadAnchor = document.createElement("a");
      const safeName = (quote.client.clientName || "Estimate").replace(/[^a-zA-Z0-9_-]/g, "_");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `Hudson_Estimate_${quote.quoteNumber || "MH"}_${safeName}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("Estimate JSON exported for backup");
    } catch {
      toast.error("Could not export JSON");
    }
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const quotes = extractQuotesFromFile(text);
        if (quotes.length === 0) {
          throw new Error("Could not parse any valid quote data from file");
        }

        // Import all found quotes
        for (const q of quotes) {
          onImportQuote(q);
        }

        // Automatically load the latest imported quote into the active workspace
        const mainQuote = quotes[0];
        onLoadQuote(mainQuote);
        onOpenChange(false);

        const clientTitle = mainQuote.client.clientName ? ` for ${mainQuote.client.clientName}` : "";
        toast.success(`Successfully imported & loaded estimate #${mainQuote.quoteNumber || "MH"}${clientTitle}!`);
      } catch (err: any) {
        console.error("Import error:", err);
        toast.error("Could not read estimate JSON file. Please check the file contents.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const [importingPdf, setImportingPdf] = useState(false);

  const handleImportPdfFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingPdf(true);
    const toastId = toast.loading(`Reading & parsing "${file.name}"...`);
    try {
      const { rawText } = await pdfDocumentToPagesAndText(file, 10);
      if (!rawText || rawText.trim().length === 0) {
        throw new Error("Could not extract readable text from PDF");
      }
      const parsedQuote = parseQuoteFromEstimatePdf(rawText, file.name);
      onImportQuote(parsedQuote);
      onLoadQuote(parsedQuote);
      onOpenChange(false);
      toast.success(
        `Successfully restored estimate #${parsedQuote.quoteNumber || "MH"} for ${parsedQuote.client.clientName || "Client"} from PDF!`,
        { id: toastId }
      );
    } catch (err: any) {
      console.error("PDF Import error:", err);
      toast.error("Could not parse estimate from PDF. Please make sure it is a Hudson Homes estimate PDF.", { id: toastId });
    } finally {
      setImportingPdf(false);
      e.target.value = "";
    }
  };

  const [recovering, setRecovering] = useState(false);

  const handleDeepRecover = async () => {
    setRecovering(true);
    const toastId = toast.loading("Scanning IndexedDB and browser storage for unsaved estimates...");
    try {
      const recovered = await recoverAllHistoricalQuotes();
      if (recovered.length === 0) {
        toast.info("No unsaved estimate drafts found in browser storage.", { id: toastId });
      } else {
        for (const r of recovered) {
          onImportQuote(r);
        }
        const freshest = recovered[0];
        if (freshest) {
          onLoadQuote(freshest);
        }
        toast.success(
          `Recovered ${recovered.length} estimate(s)! Restored #${freshest?.quoteNumber || "MH"} for ${freshest?.client.clientName || "Client"}.`,
          { id: toastId }
        );
      }
    } catch (e) {
      toast.error("Recovery scan failed", { id: toastId });
    } finally {
      setRecovering(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col border-slate-800 bg-slate-950/98 text-slate-100 backdrop-blur-2xl shadow-2xl p-6">
        <DialogHeader className="flex-none pb-3 border-b border-slate-800/80">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-extrabold text-white tracking-wide flex items-center gap-2.5">
              <FolderOpen className="h-5 w-5 text-amber-400" />
              Saved Builders Estimates ({savedQuotes.length})
            </DialogTitle>

            <div className="flex flex-wrap items-center gap-2">
              {/* Auto Recover Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeepRecover}
                disabled={recovering}
                className="border-emerald-500/50 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-200 text-xs font-bold gap-1.5 shadow-xs"
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                {recovering ? "Scanning…" : "Scan & Auto-Recover"}
              </Button>

              {/* Import PDF Button */}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleImportPdfFile}
                  disabled={importingPdf}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/50 bg-cyan-950/60 hover:bg-cyan-900 text-xs font-bold text-cyan-200 transition-colors shadow-xs">
                  <FileText className="h-3.5 w-3.5 text-cyan-400" />
                  {importingPdf ? "Parsing PDF…" : "Import Estimate PDF"}
                </span>
              </label>

              {/* Import JSON Button */}
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJsonFile}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-colors">
                  <Upload className="h-3.5 w-3.5 text-slate-400" />
                  Import JSON
                </span>
              </label>

              <Button
                size="sm"
                onClick={onSaveCurrentQuote}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Save Active Estimate
              </Button>
            </div>
          </div>

          <div className="relative mt-3">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by client name, estimate #, address, suburb, or house design…"
              className="h-9 pl-9 text-xs border-slate-800 bg-slate-900/90 text-slate-200"
            />
          </div>

          {/* Scope Tabs & Select All Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5">
            <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setScopeFilter("mine");
                  setSelectedQuoteIds(new Set());
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  scopeFilter === "mine"
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <UserCheck className="h-3.5 w-3.5" />
                <span>
                  {activeStaff
                    ? `My Estimates (${activeStaff.name.split(" ")[0]}: ${myQuotesCount})`
                    : `My Estimates (${myQuotesCount})`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setScopeFilter("all");
                  setSelectedQuoteIds(new Set());
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  scopeFilter === "all"
                    ? "bg-cyan-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>All Team Estimates ({allQuotesCount})</span>
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              {filteredQuotes.length > 0 && (
                <label className="flex items-center gap-1.5 cursor-pointer select-none px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={isAllFilteredSelected}
                    onChange={handleToggleSelectAllFiltered}
                    className="rounded accent-amber-500 w-3.5 h-3.5 cursor-pointer"
                  />
                  <span>{isAllFilteredSelected ? "Deselect All" : `Select All (${filteredQuotes.length})`}</span>
                </label>
              )}

              <span className="text-[11px] text-slate-500">
                Showing {filteredQuotes.length} estimate{filteredQuotes.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Bulk Action Toolbar when 1+ estimates are selected */}
        {selectedQuoteIds.size > 0 && (
          <div className="flex-none my-2 p-3 rounded-xl border border-amber-500/50 bg-gradient-to-r from-amber-950/50 via-slate-900/95 to-slate-900/80 flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-amber-500/20 text-amber-400">
                <CheckSquare className="h-4 w-4" />
              </span>
              <span className="font-extrabold text-amber-300 text-sm">
                {selectedQuoteIds.size} estimate{selectedQuoteIds.size === 1 ? "" : "s"} selected
              </span>
              <span className="text-slate-400 text-[11px] hidden sm:inline">
                ({Math.round((selectedQuoteIds.size / Math.max(1, filteredQuotes.length)) * 100)}% of visible)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setSelectedQuoteIds(new Set())}
                className="text-xs text-slate-400 hover:text-white h-8 px-2.5 gap-1"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>

              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleBulkExportJson}
                className="text-xs border-emerald-500/40 bg-emerald-950/40 text-emerald-200 hover:bg-emerald-900/60 font-bold h-8 gap-1.5"
              >
                <Download className="h-3.5 w-3.5 text-emerald-400" />
                Export JSON ({selectedQuoteIds.size})
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleBulkDelete}
                className="text-xs bg-rose-600 hover:bg-rose-500 text-white font-extrabold h-8 gap-1.5 shadow-md"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Selected ({selectedQuoteIds.size})
              </Button>
            </div>
          </div>
        )}

        {/* Restore from PDF Banner (collapsed if selecting) */}
        {selectedQuoteIds.size === 0 && (
          <div className="flex-none my-2 p-3 rounded-xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-slate-900/40 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex-none">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-white block">Restore from Previous Estimate PDF</span>
                <span className="text-[11px] text-slate-400">
                  Upload any Hudson estimate PDF to automatically recover all client details, design selections, modified room sizes, and site items.
                </span>
              </div>
            </div>
            <label className="cursor-pointer flex-none">
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleImportPdfFile}
                disabled={importingPdf}
                className="hidden"
              />
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-400/60 bg-cyan-500 text-slate-950 hover:bg-cyan-400 text-xs font-extrabold transition-all shadow-sm">
                <Upload className="h-3.5 w-3.5" />
                Upload PDF
              </span>
            </label>
          </div>
        )}

        {/* Scrollable Estimates List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
          {filteredQuotes.length === 0 ? (
            <div className="text-center py-16 px-4 border border-dashed border-slate-800 rounded-2xl bg-slate-900/30 space-y-3">
              <FolderOpen className="h-10 w-10 text-slate-600 mx-auto" />
              <div>
                <div className="text-sm font-bold text-slate-300">
                  {searchQuery
                    ? "No matching saved estimates"
                    : scopeFilter === "mine"
                    ? `No estimates found created by ${activeStaff?.name || "you"}`
                    : "No saved estimates yet"}
                </div>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  {scopeFilter === "mine" && allQuotesCount > 0
                    ? `There are ${allQuotesCount} estimate(s) saved across the Queensland team.`
                    : "Click 'Save Active Estimate' or the Save button in the sidebar anytime to keep your work permanently stored."}
                </p>
              </div>
              {scopeFilter === "mine" && allQuotesCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setScopeFilter("all")}
                  className="text-xs border-cyan-500/40 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-900/50 font-bold"
                >
                  <Users className="h-3.5 w-3.5 mr-1.5" />
                  View All Team Estimates ({allQuotesCount})
                </Button>
              )}
            </div>
          ) : (
            filteredQuotes.map((q) => {
              const isActive = q.id === activeQuoteId;
              const isSelected = selectedQuoteIds.has(q.id);
              const dateFormatted = q.updatedAt
                ? new Date(q.updatedAt).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Recently";

              const designTitle = q.design?.designName
                ? `${q.design.designName}${q.design.isModifiedFloorplan ? " Modified" : ""}`
                : "Custom Floorplan";

              const m2Label = q.design?.designM2 ? `${q.design.designM2.toFixed(1)} m²` : "";
              const totalAmount = q.pricing?.grossEstimatedInvestment || q.pricing?.baseHousePrice || 0;

              return (
                <div
                  key={q.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isSelected
                      ? "border-amber-500/90 bg-amber-950/20 ring-1 ring-amber-500/40 shadow-md"
                      : isActive
                      ? "border-cyan-500/80 bg-slate-900/95 ring-1 ring-cyan-500/30 shadow-lg"
                      : "border-slate-800/90 bg-slate-900/50 hover:bg-slate-900 hover:border-slate-700"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Checkbox for selection */}
                      <div className="pt-0.5 flex-none" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectQuote(q.id)}
                          className="rounded accent-amber-500 w-4 h-4 cursor-pointer"
                          title="Select estimate for bulk action"
                        />
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-slate-100 flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-cyan-400" />
                            {q.client?.clientName || "Unnamed Client"}
                          </span>
                          <span className="text-[10.5px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                            #{q.quoteNumber || q.client?.estimateNumber || "MH"}
                          </span>
                          {q.client?.consultantName && (
                            <span className="text-[10px] font-semibold text-amber-400 bg-amber-950/70 border border-amber-800/60 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              👤 {q.client.consultantName}
                            </span>
                          )}
                          {isActive && (
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              Currently Active
                            </span>
                          )}
                          {isSelected && (
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              Selected
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Home className="h-3 w-3 text-slate-500" />
                            <strong className="text-slate-300 font-semibold">{designTitle}</strong>
                            {m2Label && ` (${m2Label})`}
                          </span>
                          {q.client?.siteAddress && (
                            <span>
                              · {[q.client.lotNumber, q.client.siteAddress, q.client.suburb].filter(Boolean).join(" ")}
                            </span>
                          )}
                          <span className="text-slate-500 text-[11px]">
                            · Updated {dateFormatted}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Price & Actions */}
                    <div className="flex items-center gap-3 self-end sm:self-center flex-none">
                      <div className="text-right pr-2">
                        <span className="text-[10px] text-slate-500 block uppercase font-medium">Total Estimate</span>
                        <span className="text-base font-extrabold font-mono text-emerald-400">
                          {formatAud(totalAmount)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          onClick={() => {
                            onLoadQuote(q);
                            onOpenChange(false);
                            toast.success(`Loaded estimate #${q.quoteNumber} for ${q.client?.clientName || "Client"}`);
                          }}
                          className={`text-xs font-bold gap-1 ${
                            isActive
                              ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                              : "bg-cyan-500 hover:bg-cyan-400 text-slate-950"
                          }`}
                        >
                          {isActive ? "Reload Active" : "Load Estimate"}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>

                        <button
                          type="button"
                          onClick={() => handleDuplicate(q)}
                          title="Duplicate Estimate"
                          className="p-2 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleExportJson(q)}
                          title="Export JSON Backup"
                          className="p-2 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm(`Delete estimate #${q.quoteNumber} for ${q.client?.clientName || "Client"}?`)) {
                              await onDeleteQuote(q.id);
                              setSelectedQuoteIds((prev) => {
                                const next = new Set(prev);
                                next.delete(q.id);
                                return next;
                              });
                              toast.success("Estimate deleted");
                            }
                          }}
                          title="Delete Estimate"
                          className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
