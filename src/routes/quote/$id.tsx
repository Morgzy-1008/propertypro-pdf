import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ClientQuoteReview } from "@/components/quoting/ClientQuoteReview";
import { getQuoteById, saveQuote, saveQuoteToIdb } from "@/lib/quoting/quoteStorage";
import { decodeQuoteFromClientLink } from "@/lib/quoting/quoteLinkEncoder";
import type { FullQuote } from "@/lib/quoting/quoteTypes";
import { Logo } from "@/components/flyer/FlyerTemplates";
import { ShieldAlert, Phone, Mail, Building2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuoteSearchParams {
  d?: string;
  data?: string;
}

export const Route = createFileRoute("/quote/$id")({
  validateSearch: (search: Record<string, unknown>): QuoteSearchParams => ({
    d: typeof search.d === "string" ? search.d : undefined,
    data: typeof search.data === "string" ? search.data : undefined,
  }),
  head: () => ({
    meta: [
      {
        title: "Building Tender Quote | Hudson Homes",
      },
      {
        name: "description",
        content: "Review and customise your fixed-price building tender quotation from Hudson Homes Queensland.",
      },
    ],
  }),
  component: ClientQuoteRoutePage,
});

function ClientQuoteRoutePage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const [quote, setQuote] = useState<FullQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFoundState, setNotFoundState] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadQuote() {
      setLoading(true);
      setNotFoundState(false);

      // 1. Check URL query string param ?d=... or ?data=...
      const encodedPayload = search.d || search.data;
      if (encodedPayload) {
        const decoded = await decodeQuoteFromClientLink(encodedPayload);
        if (decoded && !isCancelled) {
          setQuote(decoded);
          saveQuote(decoded);
          saveQuoteToIdb(decoded).catch(() => {});
          setLoading(false);
          return;
        }
      }

      // 2. Check URL hash fragment (#d=... or #data=...)
      if (typeof window !== "undefined" && window.location.hash) {
        try {
          const hash = window.location.hash.replace(/^#/, "");
          const hashParams = new URLSearchParams(hash);
          const hashPayload = hashParams.get("d") || hashParams.get("data") || (hash.startsWith("data=") ? hash.replace("data=", "") : "");
          if (hashPayload) {
            const decoded = await decodeQuoteFromClientLink(hashPayload);
            if (decoded && !isCancelled) {
              setQuote(decoded);
              saveQuote(decoded);
              saveQuoteToIdb(decoded).catch(() => {});
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.warn("Could not decode hash fragment payload:", err);
        }
      }

      // 3. Check local storage / IndexedDB by ID or quote number
      const local = getQuoteById(id);
      if (local && !isCancelled) {
        setQuote(local);
        setLoading(false);
        return;
      }

      if (!isCancelled) {
        setQuote(null);
        setNotFoundState(true);
        setLoading(false);
      }
    }

    loadQuote();

    return () => {
      isCancelled = true;
    };
  }, [id, search.d, search.data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <Logo light size={12} />
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm mt-4">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading your personalized building estimate...</span>
          </div>
          <p className="text-xs text-slate-500">
            Securely decrypting quotation specifications and verified Hudson pricing.
          </p>
        </div>
      </div>
    );
  }

  if (notFoundState || !quote) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 p-8 rounded-2xl shadow-2xl text-center space-y-6">
          <div className="flex justify-center">
            <Logo light size={12} />
          </div>

          <div className="h-14 w-14 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Quotation Not Found or Link Incomplete</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              We were unable to load quotation #{id}. This can happen if the link was copied incompletely or if your quotation session expired.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 text-left space-y-2.5 text-xs text-slate-300">
            <div className="font-semibold text-white flex items-center gap-1.5 text-xs">
              <Building2 className="h-3.5 w-3.5 text-emerald-400" />
              Hudson Homes Queensland
            </div>
            <p className="text-[11px] text-slate-400">
              Please reach out to your New Home Consultant to receive a fresh interactive review link or an updated Builders Estimate PDF.
            </p>
            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
              <span className="text-slate-400">Direct Support:</span>
              <a href="tel:0417571864" className="font-mono text-emerald-400 font-bold hover:underline">
                0417 571 864
              </a>
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={() => window.location.reload()}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry Loading
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <ClientQuoteReview initialQuote={quote} />;
}
