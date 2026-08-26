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
  FileText,
  Home,
  User,
  Plus,
  ArrowRight,
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
import type { FullQuote } from "@/lib/quoting/quoteTypes";
import { generateQuoteNumber } from "@/lib/quoting/quoteEngine";

interface QuoteEstimatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  savedQuotes: FullQuote[];
  activeQuoteId?: string;
  onLoadQuote: (quote: FullQuote) => void;
  onDeleteQuote: (id: string) => void;
  onSaveCurrentQuote: () => void;
  onImportQuote: (quote: FullQuote) => void;
}

export function QuoteEstimatesDialog({
  open,
  onOpenChange,
  savedQuotes,
  activeQuoteId,
  onLoadQuote,
  onDeleteQuote,
  onSaveCurrentQuote,
  onImportQuote,
}: QuoteEstimatesDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredQuotes = savedQuotes.filter((q) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const name = (q.client?.clientName || "").toLowerCase();
    const est = (q.quoteNumber || q.client?.estimateNumber || "").toLowerCase();
    const addr = (q.client?.siteAddress || "").toLowerCase();
    const suburb = (q.client?.suburb || "").toLowerCase();
    const design = (q.design?.designName || "").toLowerCase();
    return (
      name.includes(query) ||
      est.includes(query) ||
      addr.includes(query) ||
      suburb.includes(query) ||
      design.includes(query)
    );
  });

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
        const parsed = JSON.parse(text) as FullQuote;
        if (!parsed.pricing || !parsed.client || !parsed.design) {
          throw new Error("Invalid quote JSON structure");
        }
        onImportQuote(parsed);
        toast.success(`Imported estimate #${parsed.quoteNumber || "MH"} for ${parsed.client.clientName || "Client"}`);
      } catch (err) {
        toast.error("Invalid estimate JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
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

            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJsonFile}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-colors">
                  <Upload className="h-3.5 w-3.5 text-cyan-400" />
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
        </DialogHeader>

        {/* Scrollable Estimates List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
          {filteredQuotes.length === 0 ? (
            <div className="text-center py-16 px-4 border border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
              <FolderOpen className="h-10 w-10 text-slate-600 mx-auto mb-3" />
              <div className="text-sm font-bold text-slate-300">
                {searchQuery ? "No matching saved estimates" : "No saved estimates yet"}
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                {searchQuery
                  ? "Try searching for a different client name or estimate number."
                  : "Click 'Save Active Estimate' or the Save button in the sidebar anytime to keep your work permanently stored."}
              </p>
            </div>
          ) : (
            filteredQuotes.map((q) => {
              const isActive = q.id === activeQuoteId;
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
                    isActive
                      ? "border-cyan-500/80 bg-slate-900/95 ring-1 ring-cyan-500/30 shadow-lg"
                      : "border-slate-800/90 bg-slate-900/50 hover:bg-slate-900 hover:border-slate-700"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-100 flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-cyan-400" />
                          {q.client?.clientName || "Unnamed Client"}
                        </span>
                        <span className="text-[10.5px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                          #{q.quoteNumber || q.client?.estimateNumber || "MH"}
                        </span>
                        {isActive && (
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            Currently Active
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
                          onClick={() => {
                            if (confirm(`Delete estimate #${q.quoteNumber} for ${q.client?.clientName || "Client"}?`)) {
                              onDeleteQuote(q.id);
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
