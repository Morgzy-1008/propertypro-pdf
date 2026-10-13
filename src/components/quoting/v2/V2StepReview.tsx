import React, { useState } from "react";
import {
  FileText,
  Download,
  Copy,
  Check,
  ArrowLeft,
  ShieldCheck,
  RotateCcw,
  Send,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getEffectiveDesignName } from "@/lib/quoting/quoteEngine";
import type { FullQuote } from "@/lib/quoting/quoteTypes";
import { toast } from "sonner";
import { QuotePdfDocument } from "../QuotePdfDocument";

interface V2StepReviewProps {
  quote: FullQuote;
  onPrev: () => void;
  onSaveQuote: () => Promise<void>;
  onDownloadPdf: () => Promise<void>;
  onOpenShare: () => void;
  onNewQuote: () => void;
  saving: boolean;
  downloading: boolean;
  isLight: boolean;
}

export function V2StepReview({
  quote,
  onPrev,
  onSaveQuote,
  onDownloadPdf,
  onOpenShare,
  onNewQuote,
  saving,
  downloading,
  isLight,
}: V2StepReviewProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const designName = getEffectiveDesignName(quote.design) || "Home Design";

  const clientShareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/quote/${quote.id}`
      : `/quote/${quote.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(clientShareUrl);
    setCopiedLink(true);
    toast.success("Interactive client estimate link copied!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl 2xl:max-w-[1550px] mx-auto px-2 sm:px-4">
      {/* FULL ESTIMATE PDF DOCUMENT PREVIEW */}
      <div
        className={`rounded-2xl sm:rounded-3xl border overflow-hidden shadow-2xl transition-all ${
          isLight ? "bg-white border-slate-200" : "bg-slate-900/60 border-slate-800 backdrop-blur-md"
        }`}
      >
        {/* Top PDF Action Toolbar */}
        <div
          className={`p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b ${
            isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/80 border-slate-800"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-none">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className={`text-base sm:text-lg font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                  Official Builders Estimate PDF Document
                </h3>
                <Badge variant="outline" className="text-xs px-2.5 py-0.5 text-emerald-500 border-emerald-500/40 font-bold">
                  Live Preview
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Estimate #{quote.quoteNumber || "MH"} • {quote.client.clientName || "Client"} • {designName}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className={`h-11 px-4 text-xs font-bold rounded-xl gap-1.5 cursor-pointer ${
                isLight
                  ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-100 shadow-xs"
                  : "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-cyan-500" />}
              {copiedLink ? "Link Copied!" : "Copy Client Link"}
            </Button>

            <Link to="/tender-request">
              <Button
                type="button"
                size="sm"
                className="h-11 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 gap-1.5 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                Submit Tender (ATP)
              </Button>
            </Link>

            <Button
              type="button"
              size="sm"
              onClick={onDownloadPdf}
              disabled={downloading}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm gap-2 h-11 px-6 rounded-xl shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>{downloading ? "Creating PDF…" : "Download Estimate PDF"}</span>
            </Button>
          </div>
        </div>

        {/* Live Multi-Page PDF Stage */}
        <div
          className="pdf-preview-stage p-4 sm:p-10 overflow-x-auto flex justify-center bg-slate-950/80 light normal-mode"
          style={{ colorScheme: "light" }}
        >
          <div className="shadow-2xl rounded-2xl overflow-hidden bg-white max-w-full">
            <QuotePdfDocument quote={quote} coverVersion="v1" />
          </div>
        </div>
      </div>

      {/* Bottom Navigation & Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-700/50">
        <Button
          type="button"
          variant="outline"
          onClick={onPrev}
          className={`w-full sm:w-auto h-14 px-8 rounded-xl text-sm font-bold gap-2 cursor-pointer ${
            isLight
              ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Variations
        </Button>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onSaveQuote}
            disabled={saving}
            className={`h-14 px-6 rounded-xl text-sm font-bold gap-2 cursor-pointer ${
              isLight
                ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            {saving ? "Saving..." : "Save to CRM"}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onNewQuote}
            className={`h-14 px-6 rounded-xl text-sm font-bold gap-2 cursor-pointer ${
              isLight
                ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
            }`}
          >
            <RotateCcw className="h-4 w-4" />
            New Estimate
          </Button>

          <Link to="/tender-request">
            <Button
              type="button"
              className="h-14 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-base shadow-lg shadow-amber-500/20 gap-2 cursor-pointer"
            >
              <Send className="h-5 w-5" />
              Submit Tender (ATP)
            </Button>
          </Link>

          <Button
            type="button"
            onClick={onDownloadPdf}
            disabled={downloading}
            className="h-14 px-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-base shadow-lg shadow-emerald-500/20 gap-2.5 cursor-pointer"
          >
            <Download className="h-5 w-5" />
            {downloading ? "Creating PDF…" : "Download PDF"}
          </Button>
        </div>
      </div>
    </div>
  );
}
