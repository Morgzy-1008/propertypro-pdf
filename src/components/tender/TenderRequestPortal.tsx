import React, { useState, useEffect } from "react";
import {
  FileText,
  FolderOpen,
  Save,
  Download,
  Upload,
  Send,
  Plus,
  Trash2,
  CheckCircle2,
  User,
  MapPin,
  Home,
  Briefcase,
  PenTool,
  CheckSquare,
  Sparkles,
  Layers,
  Building2,
  ShieldCheck,
  RotateCcw,
  Copy,
  ExternalLink,
  ChevronRight,
  Folder,
  File,
  Check,
  ArrowRight,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { formatAud } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { loadAllQuotesAsync } from "@/lib/quoting/quoteStorage";
import type { FullQuote } from "@/lib/quoting/quoteTypes";
import type {
  TenderSubmission,
  TenderDocumentSlot,
  TenderNumberedVariation,
  BuildType,
  PurchaserType,
  LandStatus,
  TenderInclusionType,
} from "@/lib/tender/tenderTypes";
import {
  createBlankTenderSubmission,
  createTenderFromQuote,
  exportTenderZipPackage,
  loadAllTendersFromIdb,
  saveTenderToIdb,
  STANDARD_DOCUMENT_SLOTS,
} from "@/lib/tender/tenderStorage";
import { AuthorityToProceedPdf } from "./AuthorityToProceedPdf";
import { TenderRequestFormPdf } from "./TenderRequestFormPdf";
import { DigitalSignatureModal } from "./DigitalSignatureModal";

type SectionTab = "client_job" | "land_siting" | "home_spec" | "solicitor_finance" | "atp_sign" | "job_folder" | "pdf_preview";

export function TenderRequestPortal() {
  const [tender, setTender] = useState<TenderSubmission>(() => createBlankTenderSubmission());
  const [savedQuotes, setSavedQuotes] = useState<FullQuote[]>([]);
  const [savedTenders, setSavedTenders] = useState<TenderSubmission[]>([]);
  const [isImportQuoteOpen, setIsImportQuoteOpen] = useState(false);
  const [isSavedTendersOpen, setIsSavedTendersOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SectionTab>("client_job");
  const [saving, setSaving] = useState(false);
  const [exportingZip, setExportingZip] = useState(false);

  // Digital Signature Modal state
  const [sigModal, setSigModal] = useState<{
    open: boolean;
    type: "client1" | "client2" | "consultant";
    title: string;
    name: string;
  }>({
    open: false,
    type: "client1",
    title: "Client 1 Signature",
    name: "",
  });

  // Load saved quotes & tenders on mount
  useEffect(() => {
    loadAllQuotesAsync().then((quotes) => {
      if (quotes && quotes.length > 0) setSavedQuotes(quotes);
    });
    loadAllTendersFromIdb().then((tenders) => {
      if (tenders && tenders.length > 0) setSavedTenders(tenders);
    });
  }, []);

  const updateTender = (patch: Partial<TenderSubmission>) => {
    setTender((prev) => {
      const updated = {
        ...prev,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      saveTenderToIdb(updated).catch(() => {});
      return updated;
    });
  };

  const handleSaveTender = async () => {
    setSaving(true);
    try {
      await saveTenderToIdb(tender);
      const list = await loadAllTendersFromIdb();
      setSavedTenders(list);
      toast.success(`Tender Request ${tender.submissionNumber} saved successfully!`);
    } catch (e) {
      toast.error("Could not save tender submission");
    } finally {
      setSaving(false);
    }
  };

  const handleImportQuote = (quote: FullQuote) => {
    const populated = createTenderFromQuote(quote);
    setTender(populated);
    saveTenderToIdb(populated).catch(() => {});
    setIsImportQuoteOpen(false);
    toast.success(`Imported all client, land, design & variation details from Quote #${quote.quoteNumber}!`);
  };

  const handleFileUpload = (slotId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const updatedDocs = {
        ...tender.documents,
        [slotId]: {
          ...(tender.documents[slotId] || { id: slotId, label: slotId, category: "land_siting" }),
          fileName: file.name,
          fileDataUrl: dataUrl,
          fileType: file.type,
          fileSize: file.size,
        },
      };
      updateTender({ documents: updatedDocs });
      toast.success(`Attached "${file.name}" to ${tender.documents[slotId]?.label || "job folder"}`);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveFile = (slotId: string) => {
    const updatedDocs = {
      ...tender.documents,
      [slotId]: {
        ...tender.documents[slotId],
        fileName: undefined,
        fileDataUrl: undefined,
        fileSize: undefined,
        fileType: undefined,
      },
    };
    updateTender({ documents: updatedDocs });
    toast.info("Document removed from slot");
  };

  const handleOpenSigModal = (type: "client1" | "client2" | "consultant") => {
    if (type === "client1") {
      setSigModal({
        open: true,
        type: "client1",
        title: "Primary Applicant (Client 1) Digital Signature",
        name: tender.atp.client1Name || `${tender.customer1.firstName} ${tender.customer1.surname}`.trim(),
      });
    } else if (type === "client2") {
      setSigModal({
        open: true,
        type: "client2",
        title: "Secondary Applicant (Client 2) Digital Signature",
        name: tender.atp.client2Name || `${tender.customer2.firstName} ${tender.customer2.surname}`.trim(),
      });
    } else {
      setSigModal({
        open: true,
        type: "consultant",
        title: "New Home Consultant Digital Signature",
        name: tender.atp.consultantName || tender.newHomeConsultant,
      });
    }
  };

  const handleSaveSignature = (dataUrl: string, signerName: string) => {
    const today = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "numeric", year: "numeric" });
    if (sigModal.type === "client1") {
      updateTender({
        atp: {
          ...tender.atp,
          client1Signed: true,
          client1Name: signerName,
          client1SignatureDate: today,
          client1SignatureDataUrl: dataUrl,
        },
      });
    } else if (sigModal.type === "client2") {
      updateTender({
        atp: {
          ...tender.atp,
          client2Signed: true,
          client2Name: signerName,
          client2SignatureDate: today,
          client2SignatureDataUrl: dataUrl,
        },
      });
    } else {
      updateTender({
        atp: {
          ...tender.atp,
          consultantSigned: true,
          consultantName: signerName,
          consultantSignatureDate: today,
          consultantSignatureDataUrl: dataUrl,
        },
      });
    }
  };

  const handleAddVariation = () => {
    const nextNo = tender.variations.length + 1;
    const newVar: TenderNumberedVariation = {
      id: `var_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      itemNumber: nextNo,
      description: "Custom Client Variation / Addition",
      cost: 0,
      category: "custom",
    };
    const updatedVars = [...tender.variations, newVar];
    const totalAdditions = updatedVars.reduce((s, v) => s + (Number(v.cost) || 0), 0);
    updateTender({
      variations: updatedVars,
      homeSpec: {
        ...tender.homeSpec,
        additionsCost: totalAdditions,
        totalBudgetEstimate:
          tender.homeSpec.baseDesignCost +
          tender.homeSpec.facadeCost +
          totalAdditions +
          tender.homeSpec.additionalSiteCost -
          tender.homeSpec.promotionDiscountCost,
      },
    });
  };

  const handleUpdateVariation = (id: string, patch: Partial<TenderNumberedVariation>) => {
    const updatedVars = tender.variations.map((v) => (v.id === id ? { ...v, ...patch } : v));
    const totalAdditions = updatedVars.reduce((s, v) => s + (Number(v.cost) || 0), 0);
    updateTender({
      variations: updatedVars,
      homeSpec: {
        ...tender.homeSpec,
        additionsCost: totalAdditions,
        totalBudgetEstimate:
          tender.homeSpec.baseDesignCost +
          tender.homeSpec.facadeCost +
          totalAdditions +
          tender.homeSpec.additionalSiteCost -
          tender.homeSpec.promotionDiscountCost,
      },
    });
  };

  const handleDeleteVariation = (id: string) => {
    const filtered = tender.variations.filter((v) => v.id !== id);
    const renumbered = filtered.map((v, i) => ({ ...v, itemNumber: i + 1 }));
    const totalAdditions = renumbered.reduce((s, v) => s + (Number(v.cost) || 0), 0);
    updateTender({
      variations: renumbered,
      homeSpec: {
        ...tender.homeSpec,
        additionsCost: totalAdditions,
        totalBudgetEstimate:
          tender.homeSpec.baseDesignCost +
          tender.homeSpec.facadeCost +
          totalAdditions +
          tender.homeSpec.additionalSiteCost -
          tender.homeSpec.promotionDiscountCost,
      },
    });
  };

  const handleExportZip = async () => {
    setExportingZip(true);
    const toastId = toast.loading("Packaging complete Job Folder ZIP archive...");
    try {
      const zipBlob = await exportTenderZipPackage(tender);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      const surname = (tender.customer1.surname || "Client").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
      a.download = `${surname} - Job Folder (${tender.submissionNumber}).zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Job Folder ZIP downloaded successfully!", { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error("Could not generate ZIP archive", { id: toastId });
    } finally {
      setExportingZip(false);
    }
  };

  const handleCopyOnsiteSummary = () => {
    const summary = `HUDSON HOMES ONSITE JOB CREATION
Submission Ref: ${tender.submissionNumber}
Client 1: ${tender.customer1.firstName} ${tender.customer1.surname} (${tender.customer1.mobile}, ${tender.customer1.email})
${tender.hasCustomer2 ? `Client 2: ${tender.customer2.firstName} ${tender.customer2.surname} (${tender.customer2.mobile})` : ""}
Site Address: Lot ${tender.land.lotNo}, ${tender.land.streetName || ""} ${tender.land.suburb} (${tender.land.council})
Design: ${tender.homeSpec.homeDesign} (${tender.homeSpec.facade} Facade · ${tender.homeSpec.inclusionsType})
Total Build Investment: ${formatAud(tender.homeSpec.totalBudgetEstimate)}
Tender Fee Paid: ${formatAud(tender.atp.feeAmount)} (Ref: ${tender.atp.eftReference})`;
    navigator.clipboard.writeText(summary);
    toast.success("OnSite summary copied to clipboard for Bernie!");
  };

  // Document attachments counter
  const attachedDocsCount = Object.values(tender.documents).filter((d) => !!d.fileDataUrl).length;
  const totalSlotsCount = Object.keys(tender.documents).length;

  const tabs = [
    { id: "client_job", label: "1. Client Profile", icon: User },
    { id: "land_siting", label: "2. Land & Siting", icon: MapPin },
    { id: "home_spec", label: "3. Home Spec & Variations", icon: Home },
    { id: "solicitor_finance", label: "4. Solicitor & Finance", icon: Briefcase },
    { id: "atp_sign", label: "5. Authority to Proceed (ATP)", icon: PenTool },
    { id: "job_folder", label: `6. Job Folder (${attachedDocsCount}/${totalSlotsCount})`, icon: Folder },
    { id: "pdf_preview", label: "7. Forms & Bernie Handoff", icon: Send },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs px-2.5 py-1 rounded-md tracking-wider uppercase">
              Tender Portal
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Submit Your Tender Request
            </h1>
            <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-800/60">
              {tender.submissionNumber}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automated Tender Request Form generation, digital Authority to Proceed (ATP) e-signing, and standardized Job Folder packaging for Bernie &amp; OnSite.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsImportQuoteOpen(true)}
            className="border-cyan-500/50 bg-cyan-950/40 text-cyan-200 hover:bg-cyan-900/60 hover:text-white text-xs font-bold gap-1.5 shadow-xs"
          >
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            Import from Quote ({savedQuotes.length})
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSavedTendersOpen(true)}
            className="border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white text-xs gap-1.5"
          >
            <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
            Saved Tenders ({savedTenders.length})
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveTender}
            disabled={saving}
            className="border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white text-xs gap-1.5"
          >
            <Save className="h-3.5 w-3.5 text-amber-400" />
            {saving ? "Saving…" : "Save Progress"}
          </Button>

          <Button
            size="sm"
            onClick={handleExportZip}
            disabled={exportingZip}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs gap-1.5 shadow-md shadow-amber-500/20"
          >
            <Download className="h-3.5 w-3.5" />
            {exportingZip ? "Packaging ZIP…" : "Download Job Folder (.zip)"}
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800/80 scrollbar-thin">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as SectionTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-300 border border-amber-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? "text-amber-400" : "text-slate-400"}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Tab Content */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 backdrop-blur-xl p-6 shadow-2xl">
        {/* ========================================================================= */}
        {/* TAB 1: CLIENT PROFILE & CURRENT ADDRESS                                   */}
        {/* ========================================================================= */}
        {activeTab === "client_job" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                  <User className="h-4 w-4 text-amber-400" /> Customer / Purchaser Details
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enter legal purchaser names for the building contract and OnSite profile.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-slate-400">Two Purchasers?</Label>
                <input
                  type="checkbox"
                  checked={tender.hasCustomer2}
                  onChange={(e) => updateTender({ hasCustomer2: e.target.checked })}
                  className="h-4 w-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer 1 */}
              <div className="space-y-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                <span className="text-xs font-bold uppercase text-amber-400 block border-b border-slate-800 pb-1.5">
                  Primary Purchaser (Customer 1) *
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[11px] text-slate-300">Title</Label>
                    <Select
                      value={tender.customer1.title || "Mr"}
                      onValueChange={(v) =>
                        updateTender({ customer1: { ...tender.customer1, title: v } })
                      }
                    >
                      <SelectTrigger className="border-slate-800 bg-slate-900 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                        <SelectItem value="Mr">Mr</SelectItem>
                        <SelectItem value="Mrs">Mrs</SelectItem>
                        <SelectItem value="Ms">Ms</SelectItem>
                        <SelectItem value="Miss">Miss</SelectItem>
                        <SelectItem value="Dr">Dr</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[11px] text-slate-300">First Name *</Label>
                    <Input
                      value={tender.customer1.firstName}
                      onChange={(e) =>
                        updateTender({ customer1: { ...tender.customer1, firstName: e.target.value } })
                      }
                      placeholder="e.g. Jordan"
                      className="border-slate-800 bg-slate-900 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-slate-300">Surname *</Label>
                    <Input
                      value={tender.customer1.surname}
                      onChange={(e) =>
                        updateTender({ customer1: { ...tender.customer1, surname: e.target.value } })
                      }
                      placeholder="e.g. Mitchell"
                      className="border-slate-800 bg-slate-900 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] text-slate-300">Mobile Phone *</Label>
                    <Input
                      value={tender.customer1.mobile}
                      onChange={(e) =>
                        updateTender({ customer1: { ...tender.customer1, mobile: e.target.value } })
                      }
                      placeholder="e.g. 0417 555 123"
                      className="border-slate-800 bg-slate-900 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-slate-300">Work / Home Phone</Label>
                    <Input
                      value={tender.customer1.workPh || ""}
                      onChange={(e) =>
                        updateTender({ customer1: { ...tender.customer1, workPh: e.target.value } })
                      }
                      placeholder="e.g. 07 3800 0000"
                      className="border-slate-800 bg-slate-900 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[11px] text-slate-300">Email Address *</Label>
                  <Input
                    value={tender.customer1.email}
                    onChange={(e) =>
                      updateTender({ customer1: { ...tender.customer1, email: e.target.value } })
                    }
                    placeholder="e.g. jordan.mitchell@gmail.com"
                    className="border-slate-800 bg-slate-900 text-xs"
                  />
                </div>
              </div>

              {/* Customer 2 */}
              <div className="space-y-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                <span className="text-xs font-bold uppercase text-amber-400 block border-b border-slate-800 pb-1.5">
                  Secondary Purchaser (Customer 2)
                </span>
                {tender.hasCustomer2 ? (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-[11px] text-slate-300">Title</Label>
                        <Select
                          value={tender.customer2.title || "Mrs"}
                          onValueChange={(v) =>
                            updateTender({ customer2: { ...tender.customer2, title: v } })
                          }
                        >
                          <SelectTrigger className="border-slate-800 bg-slate-900 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                            <SelectItem value="Mr">Mr</SelectItem>
                            <SelectItem value="Mrs">Mrs</SelectItem>
                            <SelectItem value="Ms">Ms</SelectItem>
                            <SelectItem value="Miss">Miss</SelectItem>
                            <SelectItem value="Dr">Dr</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[11px] text-slate-300">First Name</Label>
                        <Input
                          value={tender.customer2.firstName}
                          onChange={(e) =>
                            updateTender({ customer2: { ...tender.customer2, firstName: e.target.value } })
                          }
                          placeholder="e.g. Sarah"
                          className="border-slate-800 bg-slate-900 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] text-slate-300">Surname</Label>
                        <Input
                          value={tender.customer2.surname}
                          onChange={(e) =>
                            updateTender({ customer2: { ...tender.customer2, surname: e.target.value } })
                          }
                          placeholder="e.g. Mitchell"
                          className="border-slate-800 bg-slate-900 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[11px] text-slate-300">Mobile Phone</Label>
                        <Input
                          value={tender.customer2.mobile}
                          onChange={(e) =>
                            updateTender({ customer2: { ...tender.customer2, mobile: e.target.value } })
                          }
                          placeholder="e.g. 0418 555 456"
                          className="border-slate-800 bg-slate-900 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] text-slate-300">Email Address</Label>
                        <Input
                          value={tender.customer2.email}
                          onChange={(e) =>
                            updateTender({ customer2: { ...tender.customer2, email: e.target.value } })
                          }
                          placeholder="e.g. sarah.mitchell@gmail.com"
                          className="border-slate-800 bg-slate-900 text-xs"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    Single purchaser job. Enable &ldquo;Two Purchasers?&rdquo; above if joint application.
                  </div>
                )}
              </div>
            </div>

            {/* Current Residential Address */}
            <div className="space-y-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <span className="text-xs font-bold uppercase text-amber-400 block border-b border-slate-800 pb-1.5">
                Current Residential Address (For Mailing / Contract)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-[11px] text-slate-300">Unit / Street No.</Label>
                  <Input
                    value={tender.currentHomeAddress.streetNumber}
                    onChange={(e) =>
                      updateTender({
                        currentHomeAddress: { ...tender.currentHomeAddress, streetNumber: e.target.value },
                      })
                    }
                    placeholder="e.g. 14"
                    className="border-slate-800 bg-slate-900 text-xs"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-[11px] text-slate-300">Street Name</Label>
                  <Input
                    value={tender.currentHomeAddress.streetName}
                    onChange={(e) =>
                      updateTender({
                        currentHomeAddress: { ...tender.currentHomeAddress, streetName: e.target.value },
                      })
                    }
                    placeholder="e.g. Sovereign Way"
                    className="border-slate-800 bg-slate-900 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-slate-300">Suburb</Label>
                  <Input
                    value={tender.currentHomeAddress.suburb}
                    onChange={(e) =>
                      updateTender({
                        currentHomeAddress: { ...tender.currentHomeAddress, suburb: e.target.value },
                      })
                    }
                    placeholder="e.g. Pelican Waters"
                    className="border-slate-800 bg-slate-900 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Next Button */}
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={() => setActiveTab("land_siting")}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5"
              >
                Proceed to Land &amp; Siting <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: LAND & SITING DETAILS                                              */}
        {/* ========================================================================= */}
        {activeTab === "land_siting" && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-cyan-400" /> Proposed Land, Estate &amp; Site Conditions
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure lot specifications, council jurisdiction, registration status, and site access.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <div>
                <Label className="text-[11px] text-slate-300">Estate Name</Label>
                <Input
                  value={tender.land.estate}
                  onChange={(e) => updateTender({ land: { ...tender.land, estate: e.target.value } })}
                  placeholder="e.g. Flagstone Rise"
                  className="border-slate-800 bg-slate-900 text-xs"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-300">Stage</Label>
                <Input
                  value={tender.land.stage}
                  onChange={(e) => updateTender({ land: { ...tender.land, stage: e.target.value } })}
                  placeholder="e.g. Stage 4A"
                  className="border-slate-800 bg-slate-900 text-xs"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-300">Lot Number *</Label>
                <Input
                  value={tender.land.lotNo}
                  onChange={(e) => updateTender({ land: { ...tender.land, lotNo: e.target.value } })}
                  placeholder="e.g. 412"
                  className="border-slate-800 bg-slate-900 text-xs font-mono font-bold text-cyan-400"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-300">Lot Area (m²)</Label>
                <Input
                  type="number"
                  value={tender.land.lotSizeM2}
                  onChange={(e) =>
                    updateTender({ land: { ...tender.land, lotSizeM2: Number(e.target.value) || "" } })
                  }
                  placeholder="e.g. 450"
                  className="border-slate-800 bg-slate-900 text-xs font-mono"
                />
              </div>

              <div>
                <Label className="text-[11px] text-slate-300">Frontage (m)</Label>
                <Input
                  type="number"
                  value={tender.land.frontageM}
                  onChange={(e) =>
                    updateTender({ land: { ...tender.land, frontageM: Number(e.target.value) || "" } })
                  }
                  placeholder="e.g. 15.0"
                  className="border-slate-800 bg-slate-900 text-xs font-mono"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-[11px] text-slate-300">Street Name</Label>
                <Input
                  value={tender.land.streetName}
                  onChange={(e) => updateTender({ land: { ...tender.land, streetName: e.target.value } })}
                  placeholder="e.g. Sovereign Way"
                  className="border-slate-800 bg-slate-900 text-xs"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-300">Local Council</Label>
                <Input
                  value={tender.land.council}
                  onChange={(e) => updateTender({ land: { ...tender.land, council: e.target.value } })}
                  placeholder="e.g. Logan City Council"
                  className="border-slate-800 bg-slate-900 text-xs"
                />
              </div>
            </div>

            {/* Registration & Covenants */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-800 bg-slate-900">
                <div>
                  <Label className="text-xs font-semibold text-slate-200">Registered Land?</Label>
                  <span className="text-[10px] text-slate-400 block">Is title registered with council?</span>
                </div>
                <input
                  type="checkbox"
                  checked={tender.land.isRegistered}
                  onChange={(e) => updateTender({ land: { ...tender.land, isRegistered: e.target.checked } })}
                  className="h-4 w-4 accent-cyan-500 rounded cursor-pointer"
                />
              </div>

              <div>
                <Label className="text-[11px] text-slate-300">Registration Date (if unregistered)</Label>
                <Input
                  value={tender.land.registeredDate}
                  onChange={(e) =>
                    updateTender({ land: { ...tender.land, registeredDate: e.target.value } })
                  }
                  placeholder="e.g. November 2026"
                  className="border-slate-800 bg-slate-900 text-xs"
                />
              </div>

              <div>
                <Label className="text-[11px] text-slate-300">Land Contract Status</Label>
                <Select
                  value={tender.land.landStatus}
                  onValueChange={(v: LandStatus) =>
                    updateTender({ land: { ...tender.land, landStatus: v } })
                  }
                >
                  <SelectTrigger className="border-slate-800 bg-slate-900 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                    <SelectItem value="Exclusive">Exclusive</SelectItem>
                    <SelectItem value="Expression of Interest">Expression of Interest</SelectItem>
                    <SelectItem value="Deposited">Deposited</SelectItem>
                    <SelectItem value="Exchanged">Exchanged</SelectItem>
                    <SelectItem value="Settled">Settled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setActiveTab("client_job")}
                className="text-xs text-slate-400"
              >
                Back to Client Details
              </Button>
              <Button
                type="button"
                onClick={() => setActiveTab("home_spec")}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5"
              >
                Proceed to Home Spec &amp; Variations <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: HOME SPEC & NUMBERED VARIATIONS                                    */}
        {/* ========================================================================= */}
        {activeTab === "home_spec" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                  <Home className="h-4 w-4 text-emerald-400" /> New Home Configuration &amp; Numbered Variations
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Numbered variations match the annotation callouts on the marked-up architectural floorplan.
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase block">Total Build Investment:</span>
                <strong className="text-base font-extrabold font-mono text-emerald-400">
                  {formatAud(tender.homeSpec.totalBudgetEstimate)}
                </strong>
              </div>
            </div>

            {/* Design & Inclusions Card */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <div>
                <Label className="text-[11px] text-slate-300">Home Design</Label>
                <Input
                  value={tender.homeSpec.homeDesign}
                  onChange={(e) =>
                    updateTender({ homeSpec: { ...tender.homeSpec, homeDesign: e.target.value } })
                  }
                  className="border-slate-800 bg-slate-900 text-xs font-bold text-slate-100"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-300">Facade</Label>
                <Input
                  value={tender.homeSpec.facade}
                  onChange={(e) =>
                    updateTender({ homeSpec: { ...tender.homeSpec, facade: e.target.value } })
                  }
                  className="border-slate-800 bg-slate-900 text-xs font-bold text-slate-100"
                />
              </div>
              <div>
                <Label className="text-[11px] text-slate-300">Inclusion Tier</Label>
                <Select
                  value={tender.homeSpec.inclusionsType}
                  onValueChange={(v: TenderInclusionType) =>
                    updateTender({ homeSpec: { ...tender.homeSpec, inclusionsType: v } })
                  }
                >
                  <SelectTrigger className="border-slate-800 bg-slate-900 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                    <SelectItem value="Standard">Standard Inclusions</SelectItem>
                    <SelectItem value="H1 Smart">H1 Smart Inclusions</SelectItem>
                    <SelectItem value="H2 Designer">H2 Designer Inclusions</SelectItem>
                    <SelectItem value="H3 Luxury">H3 Luxury Inclusions</SelectItem>
                    <SelectItem value="LP Landscape">LP Landscape Package</SelectItem>
                    <SelectItem value="IP Investment">IP Investment Package</SelectItem>
                    <SelectItem value="FHB First Home Buyer">First Home Buyer Spec</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] text-slate-300">Garage Location</Label>
                <Select
                  value={tender.homeSpec.garageLocation}
                  onValueChange={(v: any) =>
                    updateTender({ homeSpec: { ...tender.homeSpec, garageLocation: v } })
                  }
                >
                  <SelectTrigger className="border-slate-800 bg-slate-900 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                    <SelectItem value="RHS">Right Hand Side (RHS)</SelectItem>
                    <SelectItem value="LHS">Left Hand Side (LHS)</SelectItem>
                    <SelectItem value="Detached">Detached Garage</SelectItem>
                    <SelectItem value="Zero Lot">Zero Lot Boundary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Numbered Variations Table */}
            <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-emerald-400">
                  Itemized Numbered Variations ({tender.variations.length})
                </span>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddVariation}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Variation Row
                </Button>
              </div>

              {tender.variations.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                  No variations added yet. Click &ldquo;Add Variation Row&rdquo; or import from a saved estimate.
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {tender.variations.map((v) => (
                    <div
                      key={v.id}
                      className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/90 flex items-center gap-3"
                    >
                      <div className="h-6 w-6 rounded-full bg-emerald-950 border border-emerald-500/50 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center flex-none">
                        #{v.itemNumber}
                      </div>
                      <div className="flex-1">
                        <Input
                          value={v.description}
                          onChange={(e) => handleUpdateVariation(v.id, { description: e.target.value })}
                          placeholder="e.g. Upgrade to 40mm Smartstone Benchtop in lieu of 20mm"
                          className="h-8 border-slate-800 bg-slate-950 text-xs text-slate-100"
                        />
                      </div>
                      <div className="w-32 flex-none relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">$</span>
                        <Input
                          type="number"
                          value={v.cost || ""}
                          onChange={(e) => handleUpdateVariation(v.id, { cost: Number(e.target.value) || 0 })}
                          placeholder="0"
                          className="h-8 pl-6 border-slate-800 bg-slate-950 text-xs font-mono font-bold text-slate-100 text-right"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteVariation(v.id)}
                        className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors flex-none"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setActiveTab("land_siting")}
                className="text-xs text-slate-400"
              >
                Back to Land Details
              </Button>
              <Button
                type="button"
                onClick={() => setActiveTab("solicitor_finance")}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5"
              >
                Proceed to Solicitor &amp; Finance <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: SOLICITOR & FINANCIER DETAILS                                      */}
        {/* ========================================================================= */}
        {activeTab === "solicitor_finance" && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-purple-400" /> Purchaser&apos;s Solicitor &amp; Lending Financier
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Contact details for the conveyance solicitor and mortgage broker required for OnSite file setup.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Solicitor */}
              <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                <span className="text-xs font-bold uppercase text-purple-400 block border-b border-slate-800 pb-1.5">
                  Conveyance Solicitor / Legal Firm
                </span>
                <div>
                  <Label className="text-[11px] text-slate-300">Firm Name</Label>
                  <Input
                    value={tender.solicitor.firmOrCompany}
                    onChange={(e) =>
                      updateTender({ solicitor: { ...tender.solicitor, firmOrCompany: e.target.value } })
                    }
                    placeholder="e.g. Apex Conveyancing QLD"
                    className="border-slate-800 bg-slate-900 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-slate-300">Contact Person / Solicitor Name</Label>
                  <Input
                    value={tender.solicitor.contactPerson}
                    onChange={(e) =>
                      updateTender({ solicitor: { ...tender.solicitor, contactPerson: e.target.value } })
                    }
                    placeholder="e.g. Sarah Jenkins"
                    className="border-slate-800 bg-slate-900 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] text-slate-300">Phone</Label>
                    <Input
                      value={tender.solicitor.telephone}
                      onChange={(e) =>
                        updateTender({ solicitor: { ...tender.solicitor, telephone: e.target.value } })
                      }
                      placeholder="e.g. 07 3300 1234"
                      className="border-slate-800 bg-slate-900 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-slate-300">Email</Label>
                    <Input
                      value={tender.solicitor.email}
                      onChange={(e) =>
                        updateTender({ solicitor: { ...tender.solicitor, email: e.target.value } })
                      }
                      placeholder="e.g. s.jenkins@apexlegal.com.au"
                      className="border-slate-800 bg-slate-900 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Financier */}
              <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                <span className="text-xs font-bold uppercase text-purple-400 block border-b border-slate-800 pb-1.5">
                  Financier / Mortgage Broker
                </span>
                <div>
                  <Label className="text-[11px] text-slate-300">Lending Institution / Brokerage</Label>
                  <Input
                    value={tender.financier.firmOrCompany}
                    onChange={(e) =>
                      updateTender({ financier: { ...tender.financier, firmOrCompany: e.target.value } })
                    }
                    placeholder="e.g. Aussie Home Loans / NAB"
                    className="border-slate-800 bg-slate-900 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-slate-300">Mortgage Broker Contact Person</Label>
                  <Input
                    value={tender.financier.contactPerson}
                    onChange={(e) =>
                      updateTender({ financier: { ...tender.financier, contactPerson: e.target.value } })
                    }
                    placeholder="e.g. David Ross"
                    className="border-slate-800 bg-slate-900 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] text-slate-300">Phone</Label>
                    <Input
                      value={tender.financier.telephone}
                      onChange={(e) =>
                        updateTender({ financier: { ...tender.financier, telephone: e.target.value } })
                      }
                      placeholder="e.g. 0419 888 777"
                      className="border-slate-800 bg-slate-900 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-slate-300">Email</Label>
                    <Input
                      value={tender.financier.email}
                      onChange={(e) =>
                        updateTender({ financier: { ...tender.financier, email: e.target.value } })
                      }
                      placeholder="e.g. david.ross@aussie.com.au"
                      className="border-slate-800 bg-slate-900 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setActiveTab("home_spec")}
                className="text-xs text-slate-400"
              >
                Back to Home Spec
              </Button>
              <Button
                type="button"
                onClick={() => setActiveTab("atp_sign")}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5"
              >
                Proceed to Authority to Proceed <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: AUTHORITY TO PROCEED (ATP) & E-SIGNATURES                          */}
        {/* ========================================================================= */}
        {activeTab === "atp_sign" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                  <PenTool className="h-4 w-4 text-emerald-400" /> Digital Authority to Proceed (ATP) E-Sign
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sign electronically on-screen or attach pre-signed signatures. Replaces DocuSign!
                </p>
              </div>
              <div className="text-right font-mono">
                <span className="text-[10px] text-slate-500 uppercase block">Tender Fee Payable:</span>
                <strong className="text-base font-extrabold text-emerald-400">
                  {formatAud(tender.atp.feeAmount)}
                </strong>
              </div>
            </div>

            {/* Fee Tiers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div
                onClick={() =>
                  updateTender({
                    atp: { ...tender.atp, feeType: "greenfield_1650", feeAmount: 1650, tenderAcceptanceFee: 4400 },
                  })
                }
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  tender.atp.feeType === "greenfield_1650"
                    ? "border-emerald-500 bg-emerald-950/30 ring-1 ring-emerald-500"
                    : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">Greenfield Site</span>
                  <span className="font-mono font-bold text-xs text-emerald-400">$1,650</span>
                </div>
                <p className="text-[11px] text-slate-400">Standard vacant lot. Includes soil test &amp; contour survey.</p>
              </div>

              <div
                onClick={() =>
                  updateTender({
                    atp: { ...tender.atp, feeType: "kdr_duplex_3300", feeAmount: 3300, tenderAcceptanceFee: 6600 },
                  })
                }
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  tender.atp.feeType === "kdr_duplex_3300"
                    ? "border-emerald-500 bg-emerald-950/30 ring-1 ring-emerald-500"
                    : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">Knock-Down / Duplex</span>
                  <span className="font-mono font-bold text-xs text-emerald-400">$3,300</span>
                </div>
                <p className="text-[11px] text-slate-400">KDR, existing demolition, or duplex dual occupancy.</p>
              </div>

              <div
                onClick={() =>
                  updateTender({
                    atp: { ...tender.atp, feeType: "package_3000", feeAmount: 3000, tenderAcceptanceFee: 4400 },
                  })
                }
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  tender.atp.feeType === "package_3000"
                    ? "border-emerald-500 bg-emerald-950/30 ring-1 ring-emerald-500"
                    : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">House &amp; Land Package</span>
                  <span className="font-mono font-bold text-xs text-emerald-400">$3,000</span>
                </div>
                <p className="text-[11px] text-slate-400">Pre-packaged estate package allocation.</p>
              </div>
            </div>

            {/* Interactive Signature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Client 1 Sign */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">
                    Primary Applicant (Client 1): {tender.customer1.firstName} {tender.customer1.surname}
                  </span>
                  {tender.atp.client1Signed ? (
                    <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      Signed &bull; {tender.atp.client1SignatureDate}
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                      Signature Required
                    </span>
                  )}
                </div>

                <div className="h-24 border border-dashed border-slate-700 rounded-lg flex items-center justify-center bg-slate-900/60 overflow-hidden">
                  {tender.atp.client1SignatureDataUrl ? (
                    <img src={tender.atp.client1SignatureDataUrl} alt="Client 1 Signature" className="max-h-full max-w-full object-contain p-2" />
                  ) : (
                    <span className="text-slate-500 text-xs italic">No digital signature attached yet</span>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleOpenSigModal("client1")}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs gap-1"
                  >
                    <PenTool className="h-3.5 w-3.5" />
                    {tender.atp.client1Signed ? "Change Signature" : "Capture Client 1 Signature"}
                  </Button>
                </div>
              </div>

              {/* Client 2 Sign */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">
                    Secondary Applicant (Client 2): {tender.hasCustomer2 ? `${tender.customer2.firstName} ${tender.customer2.surname}` : "N/A"}
                  </span>
                  {tender.atp.client2Signed ? (
                    <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                      Signed &bull; {tender.atp.client2SignatureDate}
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {tender.hasCustomer2 ? "Signature Required" : "Optional"}
                    </span>
                  )}
                </div>

                <div className="h-24 border border-dashed border-slate-700 rounded-lg flex items-center justify-center bg-slate-900/60 overflow-hidden">
                  {tender.atp.client2SignatureDataUrl ? (
                    <img src={tender.atp.client2SignatureDataUrl} alt="Client 2 Signature" className="max-h-full max-w-full object-contain p-2" />
                  ) : (
                    <span className="text-slate-500 text-xs italic">
                      {tender.hasCustomer2 ? "No digital signature attached yet" : "Single applicant job"}
                    </span>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    disabled={!tender.hasCustomer2}
                    onClick={() => handleOpenSigModal("client2")}
                    className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs gap-1 disabled:opacity-40"
                  >
                    <PenTool className="h-3.5 w-3.5" />
                    {tender.atp.client2Signed ? "Change Signature" : "Capture Client 2 Signature"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setActiveTab("solicitor_finance")}
                className="text-xs text-slate-400"
              >
                Back to Solicitor &amp; Finance
              </Button>
              <Button
                type="button"
                onClick={() => setActiveTab("job_folder")}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5"
              >
                Proceed to Job Folder Repository <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: JOB FOLDER DOCUMENT REPOSITORY                                     */}
        {/* ========================================================================= */}
        {activeTab === "job_folder" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                  <Folder className="h-4 w-4 text-amber-400" /> Standard Job Folder Document Repository
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Attach all client IDs, land plans, marked-up floorplans, and survey reports into their standardized slots.
                </p>
              </div>
              <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono text-amber-400">
                Attached: {attachedDocsCount} of {totalSlotsCount} files
              </div>
            </div>

            {/* Document Upload Slots Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {STANDARD_DOCUMENT_SLOTS.map((slot) => {
                const doc = tender.documents[slot.id];
                const isAttached = !!doc?.fileDataUrl;
                const surname = tender.customer1.surname || "Client";

                return (
                  <div
                    key={slot.id}
                    className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                      isAttached
                        ? "border-emerald-500/60 bg-emerald-950/20 ring-1 ring-emerald-500/20 shadow-md"
                        : slot.required
                        ? "border-slate-800 bg-slate-950/80 hover:border-slate-700"
                        : "border-slate-800/60 bg-slate-950/40 opacity-85 hover:opacity-100"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-bold text-xs text-slate-100 truncate flex items-center gap-1.5">
                          {isAttached ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-none" />
                          ) : (
                            <File className="h-3.5 w-3.5 text-slate-500 flex-none" />
                          )}
                          {slot.label}
                        </span>
                        {slot.required && !isAttached && (
                          <span className="text-[9px] font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-800/40">
                            Required
                          </span>
                        )}
                      </div>

                      {isAttached ? (
                        <div className="text-[11px] text-slate-300 font-mono truncate mb-2">
                          {doc.fileName || `${surname} - ${slot.label}`}
                          {doc.fileSize && (
                            <span className="text-[10px] text-slate-500 ml-1">
                              ({(doc.fileSize / 1024).toFixed(0)} KB)
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-500 mb-2">Click upload to attach PDF / image</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                      <label className="cursor-pointer flex-1">
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.xlsx,.doc,.docx"
                          onChange={(e) => handleFileUpload(slot.id, e)}
                          className="hidden"
                        />
                        <span className="w-full inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-[11px] font-semibold text-slate-200 transition-colors">
                          <Upload className="h-3 w-3 text-slate-400" />
                          {isAttached ? "Replace File" : "Upload File"}
                        </span>
                      </label>

                      {isAttached && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(slot.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Live Windows Folder Tree Structure View */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Folder className="h-4 w-4 text-amber-400" /> Windows Job Folder Structure Preview:
              </span>
              <div className="font-mono text-[11px] text-slate-400 bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                <div className="text-amber-300 font-bold flex items-center gap-1.5">
                  <Folder className="h-3.5 w-3.5" /> 📁 {(tender.customer1.surname || "Client")} - Job Folder ({tender.submissionNumber})
                </div>
                <div className="pl-4 space-y-0.5">
                  <div>📄 {tender.customer1.surname || "Client"} - Authority to Proceed Signed.pdf</div>
                  <div>📄 {tender.customer1.surname || "Client"} - TR Form.pdf (4 Pages)</div>
                  <div>📄 {tender.customer1.surname || "Client"} - Building Quote.pdf</div>
                  {Object.values(tender.documents)
                    .filter((d) => !!d.fileDataUrl)
                    .map((d) => (
                      <div key={d.id} className="text-emerald-400 flex items-center gap-1">
                        <Check className="h-3 w-3" /> {d.fileName || `${tender.customer1.surname} - ${d.label}`}
                      </div>
                    ))}
                  <div>📄 {tender.customer1.surname || "Client"} - OnSite Summary.txt</div>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setActiveTab("atp_sign")}
                className="text-xs text-slate-400"
              >
                Back to ATP &amp; Signatures
              </Button>
              <Button
                type="button"
                onClick={() => setActiveTab("pdf_preview")}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5"
              >
                Proceed to Forms &amp; Bernie Handoff <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: FORMS REVIEW & BERNIE WORKFLOW MANAGER HANDOFF                     */}
        {/* ========================================================================= */}
        {activeTab === "pdf_preview" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                  <Send className="h-4 w-4 text-emerald-400" /> Forms Review &amp; Workflow Manager Handoff
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Package all documents and send to Bernie (Workflow Manager) for OnSite account creation.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleCopyOnsiteSummary}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold gap-1.5 border border-slate-700"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy OnSite Summary
                </Button>

                <Button
                  size="sm"
                  onClick={handleExportZip}
                  disabled={exportingZip}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <Download className="h-3.5 w-3.5" />
                  {exportingZip ? "Packaging ZIP…" : "Download Complete Job Folder (.ZIP)"}
                </Button>
              </div>
            </div>

            {/* Workflow Manager Email Composer Card */}
            <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5" /> Workflow Manager (Bernie) Submission Email:
                </span>
                <span className="text-[10px] text-slate-400 font-mono">workflow.qld@hudsonhomes.com.au</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 space-y-1.5">
                <div><strong>To:</strong> Bernie (Workflow Manager) &lt;workflow.qld@hudsonhomes.com.au&gt;</div>
                <div><strong>Subject:</strong> Tender Request Submission — {tender.customer1.surname} (Lot {tender.land.lotNo || "TBA"}, {tender.land.estate || tender.land.suburb}) — {tender.submissionNumber}</div>
                <div className="pt-2 border-t border-slate-800 text-[11.5px] leading-relaxed text-slate-300">
                  Hi Bernie,<br /><br />
                  Please find attached the complete Tender Request Job Folder for <strong>{tender.customer1.firstName} {tender.customer1.surname}</strong>.<br />
                  &bull; <strong>Job Address:</strong> Lot {tender.land.lotNo}, {tender.land.streetName || ""} {tender.land.suburb} ({tender.land.council})<br />
                  &bull; <strong>Home Design:</strong> {tender.homeSpec.homeDesign} with {tender.homeSpec.facade} facade ({tender.homeSpec.inclusionsType})<br />
                  &bull; <strong>Build Investment:</strong> {formatAud(tender.homeSpec.totalBudgetEstimate)} (Inc. {tender.variations.length} numbered variations)<br />
                  &bull; <strong>Authority to Proceed:</strong> {tender.atp.client1Signed ? "Signed Digitally by Client" : "Pending Signature"} &bull; Fee {formatAud(tender.atp.feeAmount)} paid via {tender.atp.paymentMethod.toUpperCase()}<br /><br />
                  All required documents (Photo IDs, Land Contract, Disclosure Plan, Siting, Marked-up Floorplan, and Reports) are packaged in the attached ZIP file for OnSite file setup.<br /><br />
                  Thank you,<br />
                  {tender.newHomeConsultant} &bull; {tender.displayOffice}
                </div>
              </div>
            </div>

            {/* Generated Forms Tabs */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Generated Documents Preview:
                </span>
              </div>

              {/* Authority to Proceed Preview */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950 p-4">
                <div className="text-xs font-bold text-slate-300 mb-3 flex items-center justify-between">
                  <span>1. Signed Authority to Proceed Form</span>
                  <span className="text-[10px] text-emerald-400 font-mono">1 Page &bull; Ready</span>
                </div>
                <AuthorityToProceedPdf tender={tender} />
              </div>

              {/* 4-Page Tender Request Form Preview */}
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950 p-4">
                <div className="text-xs font-bold text-slate-300 mb-3 flex items-center justify-between">
                  <span>2. Official 4-Page Tender Request (TR) Form</span>
                  <span className="text-[10px] text-cyan-400 font-mono">4 Pages &bull; Formatted</span>
                </div>
                <TenderRequestFormPdf tender={tender} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Import from Saved Estimate Dialog */}
      <Dialog open={isImportQuoteOpen} onOpenChange={setIsImportQuoteOpen}>
        <DialogContent className="max-w-2xl border-slate-800 bg-slate-950/98 text-slate-100 p-6 rounded-2xl shadow-2xl">
          <DialogHeader className="pb-3 border-b border-slate-800">
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              Import Details from Saved Quote ({savedQuotes.length})
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-400">
            Select an estimate from the Quoting System to auto-populate all client names, phone, email, site address, selected home design, facade, inclusions, and numbered variations.
          </p>

          <div className="max-h-80 overflow-y-auto space-y-2 py-2">
            {savedQuotes.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                No saved quotes found in your local repository.
              </div>
            ) : (
              savedQuotes.map((q) => (
                <div
                  key={q.id}
                  onClick={() => handleImportQuote(q)}
                  className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-cyan-500/60 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-xs text-white">{q.client.clientName || "Unnamed Client"}</strong>
                      <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-800">
                        #{q.quoteNumber || "MH"}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {q.design.designName || "Custom Design"} &bull; {q.client.siteAddress || "Site TBA"} &bull; {formatAud(q.pricing.grossEstimatedInvestment)}
                    </span>
                  </div>
                  <Button size="sm" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs gap-1">
                    Select &amp; Import <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Saved Tenders Dialog */}
      <Dialog open={isSavedTendersOpen} onOpenChange={setIsSavedTendersOpen}>
        <DialogContent className="max-w-2xl border-slate-800 bg-slate-950/98 text-slate-100 p-6 rounded-2xl shadow-2xl">
          <DialogHeader className="pb-3 border-b border-slate-800">
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-amber-400" />
              Saved Tender Submissions ({savedTenders.length})
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-80 overflow-y-auto space-y-2 py-2">
            {savedTenders.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                No saved tender submissions yet.
              </div>
            ) : (
              savedTenders.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    setTender(t);
                    setIsSavedTendersOpen(false);
                    toast.success(`Loaded tender ${t.submissionNumber} for ${t.customer1.surname}`);
                  }}
                  className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-amber-500/60 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-xs text-white">
                        {t.customer1.firstName} {t.customer1.surname}
                      </strong>
                      <span className="text-[10px] font-mono text-amber-400 bg-amber-950 px-1.5 py-0.2 rounded border border-amber-800">
                        {t.submissionNumber}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {t.homeSpec.homeDesign} &bull; Lot {t.land.lotNo}, {t.land.suburb} &bull; {formatAud(t.homeSpec.totalBudgetEstimate)}
                    </span>
                  </div>
                  <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1">
                    Load Tender <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Digital Signature Modal */}
      <DigitalSignatureModal
        open={sigModal.open}
        onOpenChange={(open) => setSigModal((prev) => ({ ...prev, open }))}
        title={sigModal.title}
        signerName={sigModal.name}
        onSaveSignature={handleSaveSignature}
      />
    </div>
  );
}
