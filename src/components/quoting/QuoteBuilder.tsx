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
  FolderOpen,
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
import { calculateQuotePricing, getEffectiveDesignName } from "@/lib/quoting/quoteEngine";
import { upsertLeadFromQuote } from "@/lib/crm/crmStorage";
import {
  createNewBlankQuote,
  loadAllQuotes,
  loadAllQuotesAsync,
  loadActiveDraftQuote,
  saveQuote,
  saveQuoteAsync,
  deleteQuote,
  deleteQuoteAsync,
  recoverAllHistoricalQuotes,
} from "@/lib/quoting/quoteStorage";
import { pdfDocumentToPagesAndText } from "@/lib/pdfPages";
import { parseQuoteFromEstimatePdf } from "@/lib/quoting/parseQuotePdf";
import type { FullQuote } from "@/lib/quoting/quoteTypes";
import { QuoteSummarySidebar } from "./QuoteSummarySidebar";
import { QuoteClientDetails } from "./QuoteClientDetails";
import { QuoteDesignStep } from "./QuoteDesignStep";
import { QuoteSiteCostsStep } from "./QuoteSiteCostsStep";
import { QuoteInclusionsStep } from "./QuoteInclusionsStep";
import { QuoteAdminCatalogue } from "./QuoteAdminCatalogue";
import { QuotePdfDocument } from "./QuotePdfDocument";
import { QuoteEstimatesDialog } from "./QuoteEstimatesDialog";

type TabId = "client" | "design" | "site" | "inclusions" | "pdf_preview";

export function QuoteBuilder() {
  const [quote, setQuote] = useState<FullQuote>(() => {
    const draft = loadActiveDraftQuote();
    return draft || createNewBlankQuote();
  });

  const [savedQuotes, setSavedQuotes] = useState<FullQuote[]>(() => loadAllQuotes());
  const [isEstimatesDialogOpen, setIsEstimatesDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("client");
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Sync with IndexedDB & localStorage on mount
  useEffect(() => {
    loadAllQuotesAsync().then((quotes) => {
      if (quotes && quotes.length > 0) {
        setSavedQuotes(quotes);
      }
    }).catch(() => {});
  }, []);

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

  // Check for bridged floorplan or siting imports from Foresight Studio
  useEffect(() => {
    try {
      const rawPlanBridge =
        localStorage.getItem("hudson_imported_floorplan_bridge") ||
        localStorage.getItem("hudson_draft_quote_from_concept");

      if (rawPlanBridge) {
        const bridge = JSON.parse(rawPlanBridge);
        if (bridge && (bridge.designName || bridge.design?.designName)) {
          const dName = bridge.designName || bridge.design?.designName;
          const totalM2 = Math.round((bridge.totalM2 || bridge.design?.designM2 || 195) * 100) / 100;
          const bPrice = bridge.basePrice || bridge.design?.basePrice || 0;
          const fUrl = bridge.floorplanUrl || bridge.design?.floorplanUrl || "";

          setQuote((prev) => {
            const updatedDesign = {
              ...prev.design,
              designName: dName,
              designM2: totalM2,
              basePrice: bPrice > 0 ? bPrice : prev.design.basePrice,
              isModifiedFloorplan: true,
              floorplanUrl: fUrl || prev.design.floorplanUrl,
              housingType: bridge.housingType || prev.design.housingType,
              customSpec: {
                ...prev.design.customSpec,
                groundLivingM2: bridge.roomAreas?.livingM2 || prev.design.customSpec?.groundLivingM2,
                garageM2: bridge.roomAreas?.garageM2 || prev.design.customSpec?.garageM2,
                alfrescoM2: bridge.roomAreas?.alfrescoM2 || prev.design.customSpec?.alfrescoM2,
                porchM2: bridge.roomAreas?.porchM2 || prev.design.customSpec?.porchM2,
              },
            };

            const updatedClient = {
              ...prev.client,
              clientName: bridge.clientName || bridge.client?.clientName || prev.client.clientName,
              notes: bridge.notes || bridge.client?.notes || prev.client.notes,
            };

            const updatedPricing = calculateQuotePricing(
              updatedDesign,
              prev.siteConditions,
              prev.lineItems,
              updatedClient.depositAmount
            );

            const result = {
              ...prev,
              design: updatedDesign,
              client: updatedClient,
              pricing: updatedPricing,
            };

            saveQuote(result);
            return result;
          });

          setActiveTab("design");
          toast.success(`Imported concept plan: ${dName} (${totalM2} m²)!`);
          localStorage.removeItem("hudson_imported_floorplan_bridge");
          localStorage.removeItem("hudson_draft_quote_from_concept");
        }
      }

      const rawSitingBridge = localStorage.getItem("hudson_siting_to_quote_bridge");
      if (rawSitingBridge) {
        const siting = JSON.parse(rawSitingBridge);
        if (siting && siting.estate) {
          setQuote((prev) => {
            const updatedClient = {
              ...prev.client,
              estate: siting.estate || prev.client.estate,
              lotNumber: siting.lotNumber || prev.client.lotNumber,
            };
            const updatedSite = {
              ...prev.siteConditions,
              councilRegion: siting.council || prev.siteConditions.councilRegion,
            };
            const result = {
              ...prev,
              client: updatedClient,
              siteConditions: updatedSite,
            };
            saveQuote(result);
            return result;
          });
          toast.success(`Applied siting dimensions for ${siting.estate}!`);
          localStorage.removeItem("hudson_siting_to_quote_bridge");
        }
      }
    } catch (e) {
      console.warn("Error receiving concept bridge:", e);
    }
  }, []);

  const refreshSavedQuotes = async () => {
    const list = await loadAllQuotesAsync();
    setSavedQuotes(list);
  };

  const updateQuote = (patch: Partial<FullQuote>) => {
    setQuote((prev) => {
      const merged: FullQuote = { ...prev, ...patch };
      const updatedPricing = calculateQuotePricing(
        merged.design,
        merged.siteConditions,
        merged.lineItems,
        merged.client.depositAmount,
      );
      const result = { ...merged, pricing: updatedPricing };
      // Keep background draft synced
      saveQuote(result);
      return result;
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
      const result = {
        ...prev,
        client: updatedClient,
        pricing: updatedPricing,
      };
      saveQuote(result);
      return result;
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

  const handleSaveQuote = async () => {
    setSaving(true);
    try {
      await saveQuoteAsync(quote);
      await refreshSavedQuotes();
      // Auto-sync client to CRM
      await upsertLeadFromQuote(quote).catch(() => {});
      const clientLabel = quote.client.clientName?.trim() ? ` for ${quote.client.clientName}` : "";
      toast.success(`Builders Estimate #${quote.quoteNumber || "MH"}${clientLabel} saved & synced to CRM!`);
    } catch (err) {
      console.error("Save quote error:", err);
      toast.error("Could not save estimate");
    } finally {
      setSaving(false);
    }
  };

  const handleNewQuote = async () => {
    if (confirm("Start a new blank Builders Estimate? Your current work will be preserved in Saved Estimates.")) {
      await saveQuoteAsync(quote);
      const blank = createNewBlankQuote();
      setQuote(blank);
      await saveQuoteAsync(blank);
      await refreshSavedQuotes();
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
    setSavedQuotes(loadAllQuotes());
    navigator.clipboard.writeText(clientShareUrl);
    setCopied(true);
    toast.success("Client collaboration link copied to clipboard");
    setTimeout(() => setCopied(false), 2500);
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
      setQuote(parsedQuote);
      saveQuote(parsedQuote);
      setSavedQuotes(loadAllQuotes());
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

  const tabs = [
    { id: "client", label: "1. Client & Job", icon: User },
    { id: "design", label: "2. House Design", icon: Home },
    { id: "site", label: "3. Site & Earthworks", icon: Compass },
    { id: "inclusions", label: "4. Variations & Upgrades", icon: PackageCheck },
    { id: "pdf_preview", label: "5. Builders Estimate PDF", icon: FileText },
  ];

  return (
    <div className="space-y-6 w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 pb-20">
      {/* Top Header Bar with Live Estimate ID, Status & Primary Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
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
              ? `${quote.client.clientName} — ${getEffectiveDesignName(quote.design)}`
              : "Technical Builders Estimate & Quoting"}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Import PDF Direct Button */}
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
              {importingPdf ? "Restoring PDF…" : "Import Estimate PDF"}
            </span>
          </label>

          {/* Saved Estimates Open Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await refreshSavedQuotes();
              setIsEstimatesDialogOpen(true);
            }}
            className="border-slate-800 bg-slate-900/90 text-slate-200 hover:bg-slate-800 hover:text-white text-xs gap-1.5 font-bold"
          >
            <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
            Saved Estimates
            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
              {savedQuotes.length}
            </span>
          </Button>

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
                onLoadEntireQuote={(loaded) => {
                  setQuote(loaded);
                  saveQuote(loaded);
                  setSavedQuotes(loadAllQuotes());
                }}
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
            onOpenSavedEstimates={async () => {
              await refreshSavedQuotes();
              setIsEstimatesDialogOpen(true);
            }}
            savedQuotesCount={savedQuotes.length}
            saving={saving}
            downloading={downloading}
          />
        </div>
      </div>

      {/* Saved Estimates Manager Modal */}
      <QuoteEstimatesDialog
        open={isEstimatesDialogOpen}
        onOpenChange={setIsEstimatesDialogOpen}
        savedQuotes={savedQuotes}
        activeQuoteId={quote.id}
        onLoadQuote={async (loaded) => {
          setQuote(loaded);
          await saveQuoteAsync(loaded);
          await refreshSavedQuotes();
        }}
        onDeleteQuote={async (id) => {
          await deleteQuoteAsync(id);
          await refreshSavedQuotes();
        }}
        onSaveCurrentQuote={handleSaveQuote}
        onImportQuote={async (imported) => {
          setQuote(imported);
          await saveQuoteAsync(imported);
          await refreshSavedQuotes();
        }}
      />

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
