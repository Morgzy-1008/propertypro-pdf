import { useState } from "react";
import { Key, ShieldCheck, ExternalLink, X, CheckCircle2, AlertCircle } from "lucide-react";
import { getGeminiApiKey, saveGeminiApiKey } from "@/lib/land-scout/landScoutWebSearch";
import { toast } from "sonner";

interface GeminiApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved: (key: string) => void;
}

export function GeminiApiKeyModal({ isOpen, onClose, onKeySaved }: GeminiApiKeyModalProps) {
  const [apiKey, setApiKey] = useState(getGeminiApiKey());
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      toast.error("Please enter a valid Gemini API key.");
      return;
    }

    setIsSaving(true);
    try {
      saveGeminiApiKey(trimmed);
      toast.success("Gemini API key saved to browser!", {
        description: "Live web search with Google Grounding is now enabled.",
      });
      onKeySaved(trimmed);
      onClose();
    } catch (e: any) {
      toast.error("Failed to save API key: " + (e?.message || String(e)));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl p-6 space-y-5 text-slate-100">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-brand-gold">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Gemini Web Search Engine</h2>
              <p className="text-xs text-slate-400">Live AI Google Grounding for Australian Land Portals</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400 flex-none mt-0.5" />
              <p>
                <strong>Why is this needed?</strong> Major Australian portals (realestate.com.au, domain.com.au) block direct browser scraping with Akamai bot protection.
              </p>
            </div>
            <p className="text-[11px] text-slate-400 pl-6">
              Hudson Land Scout uses Google Gemini with <strong>Google Search Grounding</strong> to execute the live web searches server-side across REA, Domain, OpenLot, Peet, and Stockland, parsing listings directly into available land records.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Google Gemini API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full h-10 px-3.5 rounded-xl border border-slate-700 bg-slate-950 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-hidden focus:border-brand-gold focus:ring-1 focus:ring-brand-gold"
            />
            <p className="text-[11px] text-slate-500 flex items-center justify-between">
              <span>Saved locally in your browser storage only. Never committed to git.</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-brand-gold hover:underline inline-flex items-center gap-1"
              >
                Get API key <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-brand-gold text-slate-950 text-xs font-bold hover:bg-amber-400 transition-colors flex items-center gap-1.5 shadow-md"
          >
            <CheckCircle2 className="h-4 w-4" />
            Save &amp; Activate Live Search
          </button>
        </div>
      </div>
    </div>
  );
}
