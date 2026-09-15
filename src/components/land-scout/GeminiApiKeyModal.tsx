import { useState, useEffect } from "react";
import { Key, ShieldCheck, ExternalLink, X, CheckCircle2, AlertCircle, Loader2, Trash2, RefreshCw } from "lucide-react";
import { getGeminiApiKey, saveGeminiApiKey, clearGeminiApiKey, validateGeminiApiKey } from "@/lib/land-scout/landScoutWebSearch";
import { toast } from "sonner";

interface GeminiApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved: (key: string) => void;
}

export function GeminiApiKeyModal({ isOpen, onClose, onKeySaved }: GeminiApiKeyModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; error?: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setApiKey(getGeminiApiKey());
      setValidationResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      toast.error("Please enter a Gemini API key to test.");
      return;
    }

    setIsValidating(true);
    setValidationResult(null);
    try {
      const res = await validateGeminiApiKey(trimmed);
      setValidationResult(res);
      if (res.valid) {
        toast.success("API key verified active with Google Gemini!");
      } else {
        toast.error("API key verification failed: " + (res.error || "Invalid key"));
      }
    } catch (e: any) {
      setValidationResult({ valid: false, error: e.message || "Connection test failed." });
      toast.error("Test failed: " + e.message);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async (bypassValidation = false) => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      toast.error("Please enter a valid Gemini API key.");
      return;
    }

    if (!bypassValidation) {
      setIsValidating(true);
      const testRes = await validateGeminiApiKey(trimmed);
      setIsValidating(false);
      setValidationResult(testRes);

      if (!testRes.valid) {
        toast.error("Cannot save invalid or disabled API key", {
          description: testRes.error || "Please check your key and try again.",
        });
        return;
      }
    }

    try {
      saveGeminiApiKey(trimmed);
      toast.success("Gemini API key saved to browser!", {
        description: "Live web search with Google Grounding is now enabled.",
      });
      onKeySaved(trimmed);
      onClose();
    } catch (e: any) {
      toast.error("Failed to save API key: " + (e?.message || String(e)));
    }
  };

  const handleClear = () => {
    clearGeminiApiKey();
    setApiKey("");
    setValidationResult(null);
    toast.info("Gemini API key cleared from browser storage.");
  };

  const isServiceAccountError =
    validationResult?.error?.toLowerCase().includes("service account") ||
    validationResult?.error?.toLowerCase().includes("account_state_invalid");

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

        <div className="space-y-3.5 text-xs text-slate-300 leading-relaxed">
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400 flex-none mt-0.5" />
              <p>
                <strong>Why is this needed?</strong> Major Australian property portals (realestate.com.au, domain.com.au, openlot.com.au) block direct browser scraping with bot protection.
              </p>
            </div>
            <p className="text-[11px] text-slate-400 pl-6">
              Hudson Land Scout uses Google Gemini with <strong>Google Search Grounding</strong> to discover active land releases online, auto-extract pricing/dimensions, and calculate turn-key home packages.
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300">
                Google Gemini API Key
              </label>
              {apiKey && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" /> Clear Key
                </button>
              )}
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setValidationResult(null);
              }}
              placeholder="AIzaSy..."
              className="w-full h-10 px-3.5 rounded-xl border border-slate-700 bg-slate-950 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-hidden focus:border-brand-gold focus:ring-1 focus:ring-brand-gold"
            />
            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-0.5">
              <span>Stored locally in browser storage only. Never committed to git.</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-brand-gold hover:underline inline-flex items-center gap-1 font-semibold"
              >
                Get free API key <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Validation Feedback */}
          {validationResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                validationResult.valid
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              }`}
            >
              <div className="flex items-start gap-2 font-semibold">
                {validationResult.valid ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-none mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-rose-400 flex-none mt-0.5" />
                )}
                <span>
                  {validationResult.valid
                    ? "API Key Verified & Active (Gemini 3.6 Flash Ready)"
                    : isServiceAccountError
                    ? "Service Account Deleted or Disabled"
                    : "API Key Test Failed"}
                </span>
              </div>
              <p className="text-[11px] pl-6 text-slate-300 leading-normal">
                {validationResult.error || "Your API key is active and ready to use."}
              </p>
              {isServiceAccountError && (
                <div className="pl-6 pt-1 text-[11px] text-amber-300 space-y-1">
                  <p>
                    <strong>How to fix:</strong>
                  </p>
                  <ol className="list-decimal pl-4 space-y-0.5 text-slate-300">
                    <li>Open <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-brand-gold underline font-medium">Google AI Studio</a>.</li>
                    <li>Click <strong>Create API Key</strong> in a new or personal project (not tied to an expired GCP service account).</li>
                    <li>Copy and paste your new key above.</li>
                  </ol>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={handleTestKey}
            disabled={isValidating || !apiKey.trim()}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {isValidating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Testing...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Test Key</span>
              </>
            )}
          </button>

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
              onClick={() => handleSave(false)}
              disabled={isValidating || !apiKey.trim()}
              className="px-5 py-2 rounded-xl bg-brand-gold text-slate-950 text-xs font-bold hover:bg-amber-400 transition-colors flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
            >
              {isValidating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Save &amp; Activate</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
