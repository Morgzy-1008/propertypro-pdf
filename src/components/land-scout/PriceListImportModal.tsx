import { useState } from "react";
import { FileText, Upload, Sparkles, X, CheckCircle2, AlertCircle } from "lucide-react";
import { importDeveloperPriceList } from "@/lib/land-scout/landScoutWebSearch";
import { type LandParcel } from "@/lib/land-scout/landScoutTypes";
import { toast } from "sonner";

interface PriceListImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (importedParcels: LandParcel[]) => void;
}

export function PriceListImportModal({
  isOpen,
  onClose,
  onImportComplete,
}: PriceListImportModalProps) {
  const [filename, setFilename] = useState("Flagstone - Central Release - Stage 4.txt");
  const [rawText, setRawText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleImport = () => {
    if (!rawText.trim()) {
      toast.error("Please paste the developer price list or release sheet text.");
      return;
    }

    setIsProcessing(true);
    try {
      const { parcels, count } = importDeveloperPriceList(rawText, filename);
      if (count === 0) {
        toast.warning("Could not detect any valid lot rows in the text.", {
          description: "Ensure the text includes columns like 'Lot', 'Size (m²)', and 'Price ($)'.",
        });
        return;
      }

      toast.success(`Imported ${count} active lots!`, {
        description: "Auto-matched Hudson designs and valuations computed.",
      });
      onImportComplete(parcels);
      onClose();
    } catch (e: any) {
      toast.error("Error importing price list: " + (e?.message || String(e)));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSamplePaste = () => {
    setFilename("Lilywood - Stage 2 Price List.txt");
    setRawText(`Lot\tStreet\tSize (m2)\tFrontage (m)\tPrice ($)\tStatus\tRegistration
101\tIronbark Way\t450\t15.0\t$330,000\tAvailable\tRegistered
102\tIronbark Way\t400\t14.0\t$315,000\tAvailable\tRegistered
103\tIronbark Way\t510\t16.5\t$365,000\tAvailable\tQ3 2026
104\tGrevillea St\t375\t12.5\t$299,000\tAvailable\tRegistered
105\tGrevillea St\t480\t15.0\t$345,000\tAvailable\tQ4 2026`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl p-6 space-y-5 text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-brand-gold">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Import Developer Price List</h2>
              <p className="text-xs text-slate-400">
                Paste raw table text or developer release sheets (Stockland, Peet, Lendlease, etc.)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Release / File Name (Helps auto-detect estate &amp; stage)
              </label>
              <input
                type="text"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                placeholder="e.g. Flagstone - Stage 12 Release.pdf"
                className="w-full h-9 px-3 rounded-xl border border-slate-700 bg-slate-950 text-xs text-white placeholder:text-slate-600 focus:outline-hidden focus:border-brand-gold"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleSamplePaste}
                className="h-9 px-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Load Sample Price List Text
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
              Raw Text / Table Data (Copy &amp; Paste directly from PDF, Excel, or Email)
            </label>
            <textarea
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste table columns here (e.g. Lot 101  450m²  15m  $320,000  Registered)..."
              className="w-full p-3 rounded-xl border border-slate-700 bg-slate-950 font-mono text-xs text-white placeholder:text-slate-600 focus:outline-hidden focus:border-brand-gold focus:ring-1 focus:ring-brand-gold leading-relaxed"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <span className="text-[11px] text-slate-500">
            Automatically matches Hudson house designs and computes deal score.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={isProcessing}
              className="px-5 py-2 rounded-xl bg-brand-gold text-slate-950 text-xs font-bold hover:bg-amber-400 transition-colors flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              Parse &amp; Ingest Lots
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
