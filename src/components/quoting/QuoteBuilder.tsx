import React, { useEffect, useState } from "react";
import {
  User,
  Home,
  Compass,
  PackageCheck,
  FileText,
  Save,
  Download,
  Share2,
  Copy,
  Check,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { findConsultantByEmail } from "@/components/flyer/consultants";
import { downloadA4Pdf } from "@/lib/downloadPdf";
import { calculateQuotePricing } from "@/lib/quoting/quoteEngine";
import {
  createNewBlankQuote,
  loadAllQuotes,
  saveQuote,
} from "@/lib/quoting/quoteStorage";
import type { FullQuote } from "@/lib/quoting/quoteTypes";
import { QuoteSummarySidebar } from "./QuoteSummarySidebar";
import { QuoteClientDetails } from "./QuoteClientDetails";
import { QuoteDesignStep } from "./QuoteDesignStep";
import { QuoteSiteCostsStep } from "./QuoteSiteCostsStep";
import { QuoteInclusionsStep } from "./QuoteInclusionsStep";
import { QuoteAdminCatalogue } from "./QuoteAdminCatalogue";
import { QuotePdfDocument } from "./QuotePdfDocument";

type TabId = "client" | "design" | "site" | "inclusions" | "pdf_preview";

export function QuoteBuilder() {
  const [quote, setQuote] = useState<FullQuote>(() => createNewBlankQuote());

  const [activeTab, setActiveTab] = useState<TabId>("design");
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Auto-assign consultant if signed-in user matches one of the 3 consultants
  useEffect(() => {
    supabase.auth.getUser().then(({ data: auth }) => {
      if (auth.user?.email) {
        const c = findConsultantByEmail(auth.user.email);
        if (c && quote.client.consultantId !== c.id) {
          setQuote((prev) => ({
            ...prev,
            client: {
              ...prev.client,
              consultantId: c.id,
              consultantName: c.name,
              consultantPhone: c.phone,
              consultantEmail: c.email,
              consultantOffice: c.displayCentre,
            },
          }));
        }
      }
    });
  }, []);

  const updateQuote = (patch: Partial<FullQuote>) => {
    setQuote((prev) => {
      const merged: FullQuote = { ...prev, ...patch };
      const updatedPricing = calculateQuotePricing(
        merged.design,
        merged.siteConditions,
        merged.lineItems,
        merged.client.depositAmount,
      );
      return { ...merged, pricing: updatedPricing };
    });
  };

  const handleClientChange = (patch: Partial<FullQuote["client"]>) => {
    const updatedClient = { ...quote.client, ...patch };
    setQuote((prev) => {
      const updatedPricing = calculateQuotePricing(
        prev.design,
        prev.siteConditions,
        prev.lineItems,
        updatedClient.depositAmount,
      );
      return {
        ...prev,
        client: updatedClient,
        pricing: updatedPricing,
      };
    });
  };

  const handleDesignChange = (patch: Partial<FullQuote["design"]>) => {
    const updatedDesign = { ...quote.design, ...patch };
    updateQuote({ design: updatedDesign });
  };

  const handleSiteChange = (patch: Partial<FullQuote["siteConditions"]>) => {
    const updatedSite = { ...quote.siteConditions, ...patch };
    updateQuote({ siteConditions: updatedSite });
  };

  const handleLineItemsChange = (items: FullQuote["lineItems"]) => {
    updateQuote({ lineItems: items });
  };

  const handleSaveQuote = () => {
    setSaving(true);
    try {
      saveQuote(quote);
      toast.success("Builders Estimate saved successfully");
    } catch {
      toast.error("Could not save estimate");
    } finally {
      setSaving(false);
    }
  };

  const handleNewQuote = () => {
    if (confirm("Start a new blank Builders Estimate?")) {
      const blank = createNewBlankQuote();
      setQuote(blank);
      toast.success("New Builders Estimate created");
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      if (document.fonts) {
        await document.fonts.ready;
      }
      const exportHost =
        document.querySelector(".quote-pdf-root:not(#quote-pdf-export-container)") ||
        document.getElementById("quote-pdf-export-container") ||
        document.querySelector(".quote-pdf-root") ||
        document.body;

      const clientNameSafe = (quote.client.clientName || "HudsonEstimate").replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `Builders-Estimate-${quote.quoteNumber || "MH"}-${clientNameSafe}`;

      await downloadA4Pdf(exportHost, filename);
      toast.success("Builders Estimate PDF downloaded successfully");
    } catch (err) {
      console.error("PDF Export error:", err);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const clientShareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/quote/${quote.id}`
      : `/quote/${quote.id}`;

  const handleCopyShareLink = () => {
    saveQuote(quote);
    navigator.clipboard.writeText(clientShareUrl);
    setCopied(true);
    toast.success("Client collaboration link copied to clipboard");
    setTimeout(() => setCopied(false), 2500);
  };

  const tabs = [
    { id: "client", label: "1. Client & Job", icon: User },
    { id: "design", label: "2. House Design", icon: Home },
    { id: "site", label: "3. Site & Earthworks", icon: Compass },
    { id: "inclusions", label: "4. Variations & Upgrades", icon: PackageCheck },
    { id: "pdf_preview", label: "5. Builders Estimate PDF", icon: FileText },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Top Action & Navigation Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Hudson Quoting System
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-xs font-mono text-slate-400">Estimate #{quote.quoteNumber}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">
            {quote.client.clientName
              ? `${quote.client.clientName} — ${quote.design.designName || "Custom Design"}`
              : "Technical Builders Estimate & Quoting"}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewQuote}
            className="border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white text-xs gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" /> New Estimate
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsShareOpen(true)}
            className="border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white text-xs gap-1.5"
          >
            <Share2 className="h-3.5 w-3.5 text-cyan-400" /> Share Client Link
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveQuote}
            disabled={saving}
            className="border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white text-xs gap-1.5"
          >
            <Save className="h-3.5 w-3.5 text-amber-400" />
            {saving ? "Saving…" : "Save Estimate"}
          </Button>

          <Button
            size="sm"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold hover:from-emerald-400 text-xs gap-1.5 shadow-md shadow-emerald-500/20"
          >
            <Download className="h-3.5 w-3.5" />
            {downloading ? "Creating PDF…" : "Download PDF"}
          </Button>
        </div>
      </div>

      {/* Main Grid: Steps Container (Left) + Summary Sidebar (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_360px] gap-6 items-start">
        {/* Left Column: Multi-Step Navigation & Tab Content */}
        <div className="space-y-6 min-w-0">
          {/* Step Selector Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800/80 scrollbar-thin">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as TabId)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Active Tab Step Content */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 backdrop-blur-xl p-6 shadow-2xl">
            {activeTab === "client" && (
              <QuoteClientDetails
                client={quote.client}
                site={quote.siteConditions}
                onChange={handleClientChange}
                onSiteChange={handleSiteChange}
                onLoadEntireQuote={(loaded) => setQuote(loaded)}
              />
            )}

            {activeTab === "design" && (
              <QuoteDesignStep design={quote.design} onChange={handleDesignChange} />
            )}

            {activeTab === "site" && (
              <QuoteSiteCostsStep
                quote={quote}
                site={quote.siteConditions}
                onSiteChange={handleSiteChange}
              />
            )}

            {activeTab === "inclusions" && (
              <QuoteInclusionsStep
                quote={quote}
                lineItems={quote.lineItems}
                onChange={handleLineItemsChange}
              />
            )}

            {activeTab === "pdf_preview" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs text-slate-400">
                    Live 5-Page Architectural Builders Estimate Preview
                  </span>
                  <Button
                    size="sm"
                    onClick={handleDownloadPdf}
                    disabled={downloading}
                    className="bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 text-xs gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {downloading ? "Creating PDF…" : "Export Builders Estimate PDF"}
                  </Button>
                </div>
                <div className="rounded-xl overflow-hidden border border-slate-700/50 bg-slate-950 p-4">
                  <QuotePdfDocument quote={quote} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sticky Real-Time Financial Summary */}
        <div className="lg:sticky lg:top-20">
          <QuoteSummarySidebar
            quote={quote}
            onSave={handleSaveQuote}
            onDownloadPdf={handleDownloadPdf}
            onOpenClientShare={() => setIsShareOpen(true)}
            onOpenAdminCatalogue={() => setIsAdminOpen(true)}
            saving={saving}
            downloading={downloading}
          />
        </div>
      </div>

      {/* Admin Catalogue & Rate Engine Modal */}
      <QuoteAdminCatalogue
        open={isAdminOpen}
        onOpenChange={setIsAdminOpen}
        onCatalogueUpdated={() => {
          updateQuote({});
        }}
      />

      {/* Share Client Link Dialog */}
      <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
        <DialogContent className="max-w-md border-slate-800 bg-slate-950/95 text-slate-100 backdrop-blur-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-white font-bold tracking-wide flex items-center gap-2">
              <Share2 className="h-4 w-4 text-cyan-400" />
              Client Collaboration Link
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-400 leading-relaxed">
            Send this interactive link to your client. They can review their Builders Estimate specifications, toggle optional upgrade variations, and submit their preferences directly back to you.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex gap-2">
              <Input
                readOnly
                value={clientShareUrl}
                className="text-xs border-slate-800 bg-slate-900/90 text-slate-200"
              />
              <Button
                size="sm"
                onClick={handleCopyShareLink}
                className="bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 text-xs gap-1.5 flex-none"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-[11px] text-slate-400 space-y-1">
              <div>• Real-time price updates for client upgrade toggles.</div>
              <div>• 14-day validity holding for the Builders Estimate.</div>
              <div>• Direct submission back to sales consultant ({quote.client.consultantName}).</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden background render host for 1-click PDF download from non-preview tabs */}
      {activeTab !== "pdf_preview" && (
        <div
          id="quote-pdf-export-container"
          style={{
            position: "fixed",
            left: "-9999px",
            top: "0",
            width: "794px",
            opacity: 0,
            pointerEvents: "none",
            zIndex: -9999,
          }}
          aria-hidden="true"
        >
          <QuotePdfDocument quote={quote} />
        </div>
      )}
    </div>
  );
}
