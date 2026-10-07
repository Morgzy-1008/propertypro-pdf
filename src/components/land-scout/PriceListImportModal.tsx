import { useState } from "react";
import { FileText, Upload, Sparkles, X, Loader2, Image as ImageIcon } from "lucide-react";
import { type LandParcel } from "@/lib/land-scout/landScoutTypes";
import { pdfDocumentToPagesAndText } from "@/lib/pdfPages";
import { parseDeveloperPriceList, extractLotsFromText } from "@/lib/parseLotList";
import { convertLotToParcel } from "@/lib/land-scout/landScoutWebSearch";
import { bulkAddOrUpdateParcels } from "@/lib/land-scout/landScoutStorage";
import { type Lot } from "@/lib/databaseStorage";
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
  const [mode, setMode] = useState<"file" | "paste">("file");
  const [filename, setFilename] = useState("Flagstone - Central Release - Stage 4.txt");
  const [estate, setEstate] = useState("");
  const [suburb, setSuburb] = useState("");
  const [rawText, setRawText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [busyMessage, setBusyMessage] = useState("");

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFilename(file.name);
    setIsProcessing(true);
    setBusyMessage(`Scanning price list with Hudson AI Vision: ${file.name}…`);

    try {
      const isTextFile = /\.csv$/i.test(file.name) || /\.txt$/i.test(file.name) || /\.tsv$/i.test(file.name);
      let parsedLotsResult: { estate?: string; suburb?: string; stage?: string; developer?: string; lots: any[] };

      if (isTextFile) {
        const text = await file.text();
        parsedLotsResult = extractLotsFromText(text, file.name);
      } else {
        const docPages = await pdfDocumentToPagesAndText(file);
        parsedLotsResult = await parseDeveloperPriceList(docPages);
      }

      const activeEstate = estate.trim() || parsedLotsResult.estate || "Hudson Estate";
      const activeSuburb = suburb.trim() || parsedLotsResult.suburb || "Queensland";
      const activeDeveloper = parsedLotsResult.developer || "Developer Partner";

      if (parsedLotsResult.estate && !estate) setEstate(parsedLotsResult.estate);
      if (parsedLotsResult.suburb && !suburb) setSuburb(parsedLotsResult.suburb);

      if (!parsedLotsResult.lots || parsedLotsResult.lots.length === 0) {
        toast.warning("Could not detect any lot rows in this file.", {
          description: "Ensure the document shows columns for Lot #, Size (m²), Frontage, and Price.",
        });
        return;
      }

      const newLots: Lot[] = parsedLotsResult.lots.map((pl, idx) => ({
        id: `import-${Date.now()}-${idx}`,
        estate: activeEstate,
        suburb: activeSuburb,
        state: (activeSuburb.toLowerCase().includes("sydney") || activeSuburb.toLowerCase().includes("oran park") || pl.notes?.includes("NSW")) ? "NSW" : "QLD",
        developer: activeDeveloper,
        developer_contact_name: "Sales Office",
        developer_contact_phone: "1300 246 700",
        developer_contact_email: "sales@hudsonhomes.com.au",
        lot_number: pl.lot_number ? String(pl.lot_number).trim() : String(idx + 1),
        address: pl.address || `Lot ${pl.lot_number || idx + 1} ${activeEstate}, ${activeSuburb}`,
        land_size: pl.land_size ? Number(pl.land_size) : 450,
        frontage: pl.frontage ? Number(pl.frontage) : 14,
        land_price: pl.land_price ? Number(pl.land_price) : 350000,
        titled: Boolean(pl.titled),
        registration_date: pl.registration_date || null,
        status: (pl.status === "on_hold" || pl.status === "sold") ? pl.status : "available",
        exclusive_consultants: null,
        deadline: null,
        notes: [pl.stage ? `Stage ${pl.stage}` : "", pl.notes].filter(Boolean).join(" · ") || null,
        updated_at: new Date().toISOString(),
      }));

      const parcels = newLots.map((lot) => convertLotToParcel(lot));
      bulkAddOrUpdateParcels(parcels);

      toast.success(`Extracted & imported ${parcels.length} lots from ${file.name}!`, {
        description: `Lots added to ${activeEstate} with automated Hudson turnkey package siting.`,
      });
      onImportComplete(parcels);
      onClose();
    } catch (err: any) {
      console.error("[PriceListImportModal] Error parsing uploaded file:", err);
      toast.error(`Error parsing file: ${err.message || String(err)}`);
    } finally {
      setIsProcessing(false);
      setBusyMessage("");
    }
  };

  const handleImportText = () => {
    if (!rawText.trim()) {
      toast.error("Please paste developer price list or release sheet text.");
      return;
    }

    setIsProcessing(true);
    try {
      const parsedLotsResult = extractLotsFromText(rawText, filename);
      const activeEstate = estate.trim() || parsedLotsResult.estate || "Hudson Estate";
      const activeSuburb = suburb.trim() || parsedLotsResult.suburb || "Queensland";
      const activeDeveloper = parsedLotsResult.developer || "Developer Partner";

      if (!parsedLotsResult.lots || parsedLotsResult.lots.length === 0) {
        toast.warning("Could not detect any valid lot rows in the text.", {
          description: "Ensure the text includes columns like 'Lot', 'Size (m²)', and 'Price ($)'.",
        });
        return;
      }

      const newLots: Lot[] = parsedLotsResult.lots.map((pl, idx) => ({
        id: `import-${Date.now()}-${idx}`,
        estate: activeEstate,
        suburb: activeSuburb,
        state: (activeSuburb.toLowerCase().includes("sydney") || activeSuburb.toLowerCase().includes("oran park") || pl.notes?.includes("NSW")) ? "NSW" : "QLD",
        developer: activeDeveloper,
        developer_contact_name: "Sales Office",
        developer_contact_phone: "1300 246 700",
        developer_contact_email: "sales@hudsonhomes.com.au",
        lot_number: pl.lot_number ? String(pl.lot_number).trim() : String(idx + 1),
        address: pl.address || `Lot ${pl.lot_number || idx + 1} ${activeEstate}, ${activeSuburb}`,
        land_size: pl.land_size ? Number(pl.land_size) : 450,
        frontage: pl.frontage ? Number(pl.frontage) : 14,
        land_price: pl.land_price ? Number(pl.land_price) : 350000,
        titled: Boolean(pl.titled),
        registration_date: pl.registration_date || null,
        status: (pl.status === "on_hold" || pl.status === "sold") ? pl.status : "available",
        exclusive_consultants: null,
        deadline: null,
        notes: [pl.stage ? `Stage ${pl.stage}` : "", pl.notes].filter(Boolean).join(" · ") || null,
        updated_at: new Date().toISOString(),
      }));

      const parcels = newLots.map((lot) => convertLotToParcel(lot));
      bulkAddOrUpdateParcels(parcels);

      toast.success(`Imported ${parcels.length} active lots!`, {
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
                Upload screenshot images, PDF releases, or paste table text (Stockland, Peet, Lendlease, etc.)
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

        {/* Mode Selector */}
        <div className="flex gap-2 border-b border-slate-800/60 pb-2 text-xs">
          <button
            type="button"
            onClick={() => setMode("file")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              mode === "file"
                ? "bg-brand-gold/20 text-brand-gold border border-brand-gold/40 shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5" /> Upload File (Image / PDF / CSV)
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMode("paste")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              mode === "paste"
                ? "bg-brand-gold/20 text-brand-gold border border-brand-gold/40 shadow-xs"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Paste Table Text
            </span>
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Estate & Suburb Overrides */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Estate Name (Optional, auto-detected if in file)
              </label>
              <input
                type="text"
                value={estate}
                onChange={(e) => setEstate(e.target.value)}
                placeholder="e.g. Kinma Valley, Flagstone, Aurora"
                className="w-full h-9 px-3 rounded-xl border border-slate-700 bg-slate-950 text-xs text-white placeholder:text-slate-600 focus:outline-hidden focus:border-brand-gold"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Suburb / Location (Optional)
              </label>
              <input
                type="text"
                value={suburb}
                onChange={(e) => setSuburb(e.target.value)}
                placeholder="e.g. Morayfield, Flagstone, Box Hill"
                className="w-full h-9 px-3 rounded-xl border border-slate-700 bg-slate-950 text-xs text-white placeholder:text-slate-600 focus:outline-hidden focus:border-brand-gold"
              />
            </div>
          </div>

          {mode === "file" ? (
            <div className="space-y-3">
              <label className="block text-[11px] font-semibold text-slate-300">
                Upload Price List (Screenshot Image, PDF Release, CSV or TXT):
              </label>
              <div className="border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center hover:border-brand-gold/60 transition-colors bg-slate-950/60 relative">
                <input
                  type="file"
                  accept="image/*,application/pdf,.csv,.txt,.tsv"
                  disabled={isProcessing}
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-brand-gold">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-200">
                    Click to select or drag &amp; drop screenshot or PDF
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Supports PNG, JPG, WebP screenshots, developer PDFs, and CSV spreadsheets
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-semibold text-slate-300">
                  Raw Text / Table Data:
                </label>
                <button
                  type="button"
                  onClick={handleSamplePaste}
                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="h-3 w-3" /> Load sample
                </button>
              </div>
              <textarea
                rows={7}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste table columns here (e.g. Lot 101  450m²  14m  $320,000  Available)..."
                className="w-full p-3 rounded-xl border border-slate-700 bg-slate-950 font-mono text-xs text-white placeholder:text-slate-600 focus:outline-hidden focus:border-brand-gold focus:ring-1 focus:ring-brand-gold leading-relaxed"
              />
            </div>
          )}

          {isProcessing && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              <Loader2 className="h-4 w-4 animate-spin shrink-0 text-brand-gold" />
              <span>{busyMessage || "Analyzing document with Gemini Multimodal AI & extracting lots…"}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <span className="text-[11px] text-slate-500">
            Automatically computes turnkey package pricing and matches Hudson designs.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            {mode === "paste" && (
              <button
                type="button"
                onClick={handleImportText}
                disabled={isProcessing || !rawText.trim()}
                className="px-5 py-2 rounded-xl bg-brand-gold text-slate-950 text-xs font-bold hover:bg-amber-400 transition-colors flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                Parse &amp; Ingest Lots
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
