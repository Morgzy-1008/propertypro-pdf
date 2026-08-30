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
  PenTool,
  Sparkles,
  Layers,
  ShieldCheck,
  RotateCcw,
  Copy,
  Folder,
  File,
  Check,
  ArrowRight,
  Share2,
  ExternalLink,
  MessageSquare,
  Mail,
  HardHat,
  Trees,
  Cloud,
} from "lucide-react";
import { toast } from "sonner";
import { formatAud } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  SINGLE_STOREY_PRICES,
  DOUBLE_STOREY_PRICES,
  SPLIT_LEVEL_PRICES,
  DUAL_OC_PRICES,
} from "@/lib/pricelist.data";
import { HOUSING_FACADES, INCLUSION_TIERS } from "@/components/quoting/QuoteDesignStep";
import type {
  TenderSubmission,
  TenderDocumentSlot,
  TenderNumberedVariation,
  BuildType,
  PurchaserType,
  LandStatus,
  KdrOccupancy,
  TenderInclusionType,
  TenderFloorplanPin,
} from "@/lib/tender/tenderTypes";
import {
  createBlankTenderSubmission,
  createTenderFromQuote,
  exportTenderZipPackage,
  loadAllTendersFromIdb,
  saveTenderToIdb,
  findFloorplanUrl,
  findFacadeRenderUrl,
  calculateLandscapePackageCost,
  STANDARD_DOCUMENT_SLOTS,
  encodeTenderForRemoteLink,
  renderHdFinalFloorplanDataUrl,
  renderDraftsmenVariationsDataUrl,
  getStandardizedDocumentFileName,
} from "@/lib/tender/tenderStorage";
import { supabase } from "@/integrations/supabase/client";
import { pdfDocumentToPagesAndText } from "@/lib/pdfPages";
import { FloorplanMarkupViewer } from "./FloorplanMarkupViewer";
import { TenderMasterPdfDocument } from "./TenderMasterPdfDocument";
import { DigitalSignatureModal } from "./DigitalSignatureModal";

type SectionTab = "client_job" | "land_siting" | "home_spec" | "atp_sign" | "job_folder" | "pdf_preview";

export function TenderRequestPortal() {
  const [tender, setTender] = useState<TenderSubmission>(() => {
    try {
      const draft = localStorage.getItem("hudson_current_tender_draft");
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed && parsed.submissionNumber) return parsed;
      }
    } catch {}
    return createBlankTenderSubmission();
  });
  const [savedQuotes, setSavedQuotes] = useState<FullQuote[]>([]);
  const [savedTenders, setSavedTenders] = useState<TenderSubmission[]>([]);
  const [isImportQuoteOpen, setIsImportQuoteOpen] = useState(false);
  const [isSavedTendersOpen, setIsSavedTendersOpen] = useState(false);
  const [isShareRemoteOpen, setIsShareRemoteOpen] = useState(false);
  const [isCustomFacadeOpen, setIsCustomFacadeOpen] = useState(false);
  const [customFacadeNameInput, setCustomFacadeNameInput] = useState("");
  const [customFacadePriceInput, setCustomFacadePriceInput] = useState<number | "">("");
  const [customFacadePreviewUrl, setCustomFacadePreviewUrl] = useState<string>("");
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

  // Save current active draft to localStorage immediately so remote sign route can find it
  useEffect(() => {
    try {
      localStorage.setItem(`hudson_tender_${tender.id}`, JSON.stringify(tender));
      localStorage.setItem("hudson_current_tender_draft", JSON.stringify(tender));
    } catch {}
  }, [tender]);

  // Load saved quotes & tenders on mount & set up multi-channel live sync
  useEffect(() => {
    loadAllQuotesAsync().then((quotes) => {
      if (quotes && quotes.length > 0) setSavedQuotes(quotes);
    });
    loadAllTendersFromIdb().then((tenders) => {
      if (tenders && tenders.length > 0) setSavedTenders(tenders);
    });

    // 1. Supabase Realtime channel for global multi-device cross-network live sync
    const liveChannel = supabase.channel(`tender_sync_${tender.submissionNumber}`);
    liveChannel
      .on("broadcast", { event: "atp_signed" }, (msg) => {
        if (msg.payload && msg.payload.atp) {
          setTender((prev) => {
            const updated: TenderSubmission = {
              ...prev,
              status: "client_signed",
              atp: {
                ...prev.atp,
                ...msg.payload.atp,
              },
            };
            saveTenderToIdb(updated).catch(() => {});
            try {
              localStorage.setItem(`hudson_tender_${updated.id}`, JSON.stringify(updated));
              localStorage.setItem(`hudson_tender_${updated.submissionNumber}`, JSON.stringify(updated));
              localStorage.setItem("hudson_current_tender_draft", JSON.stringify(updated));
            } catch {}
            return updated;
          });
          toast.success(
            `Client ${msg.payload.atp.client1Name || "Purchaser"} signed Authority to Proceed! Signatures synced live into portal & Master PDF.`
          );
        }
      })
      .subscribe();

    // 2. BroadcastChannel for instant cross-tab live sync
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("hudson_tender_sync");
      bc.onmessage = (event) => {
        if (event.data?.type === "ATP_SIGNED" && event.data.tender) {
          const incoming = event.data.tender as TenderSubmission;
          setTender(incoming);
          toast.success("Client signed Authority to Proceed! Signatures synced live into the portal and Master PDF.");
        }
      };
    } catch {}

    // 3. Storage event listener for cross-window sync
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "hudson_latest_remote_signature" && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          const raw = localStorage.getItem(`hudson_tender_${parsed.id}`) || localStorage.getItem("hudson_current_tender_draft");
          if (raw) {
            const updatedT = JSON.parse(raw) as TenderSubmission;
            setTender(updatedT);
            toast.success("Client signed Authority to Proceed! Signatures updated live.");
          }
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);

    // 4. Fast polling backup
    const interval = setInterval(() => {
      try {
        const rawSig = localStorage.getItem("hudson_latest_remote_signature");
        if (rawSig) {
          const parsed = JSON.parse(rawSig);
          if (parsed.atp?.client1Signed && !tender.atp.client1Signed) {
            const rawDraft = localStorage.getItem(`hudson_tender_${tender.id}`) || localStorage.getItem("hudson_current_tender_draft");
            if (rawDraft) {
              const parsedDraft = JSON.parse(rawDraft) as TenderSubmission;
              setTender(parsedDraft);
              toast.success("Authority to Proceed signed by client!");
            }
          }
        }
      } catch {}
    }, 1200);

    return () => {
      liveChannel.unsubscribe();
      if (bc) bc.close();
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, [tender.id, tender.atp.client1Signed]);

  // Check for bridged floorplan or siting imports from Foresight Studio
  useEffect(() => {
    try {
      const rawPlanBridge = localStorage.getItem("hudson_imported_floorplan_tender_bridge");
      if (rawPlanBridge) {
        const bridge = JSON.parse(rawPlanBridge);
        if (bridge && bridge.homeSpec) {
          setTender((prev) => {
            const updated = {
              ...prev,
              customer1: {
                ...prev.customer1,
                ...(bridge.customer1 || {}),
              },
              homeSpec: {
                ...prev.homeSpec,
                ...bridge.homeSpec,
                isModifiedFloorplan: true,
              },
            };
            saveTenderToIdb(updated).catch(() => {});
            return updated;
          });
          setActiveTab("home_spec");
          toast.success(`Imported concept plan: ${bridge.homeSpec.homeDesign}!`);
          localStorage.removeItem("hudson_imported_floorplan_tender_bridge");
        }
      }

      const rawSitingBridge = localStorage.getItem("hudson_siting_to_tender_bridge");
      if (rawSitingBridge) {
        const siting = JSON.parse(rawSitingBridge);
        if (siting && siting.land) {
          setTender((prev) => {
            const updated = {
              ...prev,
              land: {
                ...prev.land,
                ...siting.land,
              },
              homeSpec: {
                ...prev.homeSpec,
                ...(siting.homeSpec || {}),
              },
              documents: {
                ...prev.documents,
                ...(siting.documents || {}),
              },
            };
            saveTenderToIdb(updated).catch(() => {});
            return updated;
          });
          setActiveTab("land_siting");
          toast.success("Imported 1:200 Siting Plan and setbacks into Tender Request!");
          localStorage.removeItem("hudson_siting_to_tender_bridge");
        }
      }
    } catch (e) {
      console.warn("Error receiving tender bridge:", e);
    }
  }, []);

  const updateTender = (patch: Partial<TenderSubmission>) => {
    setTender((prev) => {
      const updated = {
        ...prev,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      saveTenderToIdb(updated).catch(() => {});
      try {
        localStorage.setItem(`hudson_tender_${updated.id}`, JSON.stringify(updated));
        localStorage.setItem("hudson_current_tender_draft", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleSaveTender = async () => {
    setSaving(true);
    try {
      await saveTenderToIdb(tender);
      const list = await loadAllTendersFromIdb();
      setSavedTenders(list);
      toast.success(`Tender Request ${tender.submissionNumber} saved to website/cloud!`);
    } catch (e) {
      toast.error("Could not save tender submission");
    } finally {
      setSaving(false);
    }
  };

  const handleImportQuote = async (quote: FullQuote) => {
    const populated = createTenderFromQuote(quote);
    setTender(populated);
    saveTenderToIdb(populated).catch(() => {});
    setIsImportQuoteOpen(false);
    toast.success(`Auto-filled all details from Quote #${quote.quoteNumber}!`);

    try {
      const [hdFloorplanDataUrl, draftsmenVariationsDataUrl] = await Promise.all([
        renderHdFinalFloorplanDataUrl(
          populated.homeSpec.floorplanUrl || "",
          populated.homeSpec.floorplanPins,
          populated.homeSpec.homeDesign,
          populated.submissionNumber
        ),
        renderDraftsmenVariationsDataUrl(populated),
      ]);

      const newDocs = { ...populated.documents };
      const surname = populated.customer1.surname || "Client";
      if (hdFloorplanDataUrl) {
        newDocs.final_floorplan = {
          id: "final_floorplan",
          label: "Final Floorplan — HD Architectural Markup with Numbered Pins",
          fileName: getStandardizedDocumentFileName(surname, "final_floorplan", "Final_Floorplan.png", populated.atp.feeAmount),
          fileDataUrl: hdFloorplanDataUrl,
          fileType: "image/png",
          category: "land_siting",
          required: false,
        };
      }
      if (draftsmenVariationsDataUrl) {
        newDocs.draftsmen_variations = {
          id: "draftsmen_variations",
          label: "Draftsmen Variations — Floorplan, Facade & Working Drawings Checklist",
          fileName: getStandardizedDocumentFileName(surname, "draftsmen_variations", "Draftsmen_Variations.png", populated.atp.feeAmount),
          fileDataUrl: draftsmenVariationsDataUrl,
          fileType: "image/png",
          category: "land_siting",
          required: false,
        };
      }
      setTender((prev) => ({ ...prev, documents: newDocs }));
      saveTenderToIdb({ ...populated, documents: newDocs }).catch(() => {});
    } catch (e) {
      console.warn("Auto-generating documents on import:", e);
    }
  };

  const handleDesignChange = (designName: string) => {
    const originalUrl = findFloorplanUrl(designName);
    const planUrl = tender.homeSpec.isModifiedFloorplan ? tender.homeSpec.floorplanUrl || originalUrl : originalUrl;

    // Find base price
    let basePrice = tender.homeSpec.baseDesignCost;
    const allRows = [
      ...SINGLE_STOREY_PRICES,
      ...DOUBLE_STOREY_PRICES,
      ...SPLIT_LEVEL_PRICES,
      ...DUAL_OC_PRICES,
    ];
    const match = allRows.find((r) => r.name.toLowerCase() === designName.toLowerCase());
    if (match) {
      basePrice = match.h2 || match.h1 || match.hbs || basePrice;
    }

    updateTender({
      homeSpec: {
        ...tender.homeSpec,
        homeDesign: designName,
        floorplanUrl: planUrl,
        originalFloorplanUrl: originalUrl,
        baseDesignCost: basePrice,
        totalBudgetEstimate:
          basePrice +
          tender.homeSpec.facadeCost +
          tender.homeSpec.structuralVariationsCost +
          tender.homeSpec.internalUpgradesCost +
          tender.homeSpec.additionalSiteCost +
          (tender.homeSpec.includeLandscapePackage ? tender.homeSpec.landscapePackageCost || 0 : 0) -
          tender.homeSpec.promotionDiscountCost,
      },
    });
  };

  const handleFacadeChange = (facadeName: string) => {
    const facadesList = HOUSING_FACADES[tender.homeSpec.housingType] || HOUSING_FACADES["Single Storey"];
    const match = facadesList.find((f) => f.name === facadeName);
    const facadeUplift = match?.uplift || 0;
    const facadeRender = findFacadeRenderUrl(facadeName, tender.homeSpec.housingType);

    updateTender({
      homeSpec: {
        ...tender.homeSpec,
        facade: facadeName,
        facadeCost: facadeUplift,
        facadeRenderUrl: facadeRender,
        totalBudgetEstimate:
          tender.homeSpec.baseDesignCost +
          facadeUplift +
          tender.homeSpec.structuralVariationsCost +
          tender.homeSpec.internalUpgradesCost +
          tender.homeSpec.additionalSiteCost +
          (tender.homeSpec.includeLandscapePackage ? tender.homeSpec.landscapePackageCost || 0 : 0) -
          tender.homeSpec.promotionDiscountCost,
      },
    });
  };

  const handleToggleLandscape = (checked: boolean) => {
    const cost = calculateLandscapePackageCost(tender.land.lotSizeM2, tender.homeSpec.housingType, tender.homeSpec.homeDesign);
    updateTender({
      homeSpec: {
        ...tender.homeSpec,
        includeLandscapePackage: checked,
        landscapePackageCost: cost,
        totalBudgetEstimate:
          tender.homeSpec.baseDesignCost +
          tender.homeSpec.facadeCost +
          tender.homeSpec.structuralVariationsCost +
          tender.homeSpec.internalUpgradesCost +
          tender.homeSpec.additionalSiteCost +
          (checked ? cost : 0) -
          tender.homeSpec.promotionDiscountCost,
      },
    });
    if (checked) {
      toast.success(`Added Turnkey Landscape Package (${formatAud(cost)}) based on ${tender.land.lotSizeM2 || 450} m² lot!`);
    } else {
      toast.info("Removed Landscape Package");
    }
  };

  const autoGenerateFinalFloorplan = async (
    floorplanUrl?: string,
    pins: TenderFloorplanPin[] = [],
    designName?: string
  ) => {
    const urlToRender = floorplanUrl || tender.homeSpec.floorplanUrl;
    if (!urlToRender) return;

    try {
      const [hdFloorplanDataUrl, draftsmenVariationsDataUrl] = await Promise.all([
        renderHdFinalFloorplanDataUrl(
          urlToRender,
          pins,
          designName || tender.homeSpec.homeDesign || "Home Design",
          tender.submissionNumber
        ),
        renderDraftsmenVariationsDataUrl({
          ...tender,
          homeSpec: {
            ...tender.homeSpec,
            floorplanPins: pins,
            floorplanUrl: urlToRender,
            homeDesign: designName || tender.homeSpec.homeDesign || "Home Design",
          },
        }),
      ]);

      const newDocs = { ...tender.documents };
      const surname = tender.customer1.surname || "Client";

      if (hdFloorplanDataUrl) {
        newDocs.final_floorplan = {
          id: "final_floorplan",
          label: "Final Floorplan — HD Architectural Markup with Numbered Pins (PDF)",
          fileName: getStandardizedDocumentFileName(surname, "final_floorplan", "Final_Floorplan.pdf", tender.atp.feeAmount),
          fileDataUrl: hdFloorplanDataUrl,
          fileType: "application/pdf",
          category: "land_siting",
          required: false,
        };
      }

      if (draftsmenVariationsDataUrl) {
        newDocs.draftsmen_variations = {
          id: "draftsmen_variations",
          label: "Draftsmen Variations Directive & Working Drawings (PDF)",
          fileName: getStandardizedDocumentFileName(surname, "draftsmen_variations", "Draftsmen_Variations_Directive.pdf", tender.atp.feeAmount),
          fileDataUrl: draftsmenVariationsDataUrl,
          fileType: "application/pdf",
          category: "land_siting",
          required: false,
        };
      }

      updateTender({ documents: newDocs });
    } catch (e) {
      console.warn("Auto-generating HD Documents:", e);
    }
  };

  const handleCustomFacadeFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (isPdf) {
        const extracted = await pdfDocumentToPagesAndText(file, 1);
        if (extracted.pages && extracted.pages[0]) {
          setCustomFacadePreviewUrl(extracted.pages[0]);
          toast.success("Extracted custom facade drawing from PDF!");
          return;
        }
      }
      const reader = new FileReader();
      reader.onload = () => {
        setCustomFacadePreviewUrl(reader.result as string);
        toast.success("Loaded custom facade render!");
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load custom facade render");
    }
    e.target.value = "";
  };

  const handleCustomFacadeSave = () => {
    if (!customFacadeNameInput.trim()) {
      toast.error("Please enter a custom facade name / title");
      return;
    }
    const cost = typeof customFacadePriceInput === "number" ? customFacadePriceInput : 0;
    const renderUrl = customFacadePreviewUrl || tender.homeSpec.facadeRenderUrl;

    updateTender({
      homeSpec: {
        ...tender.homeSpec,
        facade: customFacadeNameInput.trim(),
        facadeCost: cost,
        facadeRenderUrl: renderUrl,
        isCustomFacade: true,
        customFacadeName: customFacadeNameInput.trim(),
        customFacadeRenderUrl: renderUrl,
        totalBudgetEstimate:
          tender.homeSpec.baseDesignCost +
          cost +
          tender.homeSpec.structuralVariationsCost +
          tender.homeSpec.internalUpgradesCost +
          tender.homeSpec.additionalSiteCost +
          (tender.homeSpec.includeLandscapePackage ? tender.homeSpec.landscapePackageCost || 0 : 0) -
          tender.homeSpec.promotionDiscountCost,
      },
    });

    setIsCustomFacadeOpen(false);
    toast.success(`Applied Custom Architectural Facade: "${customFacadeNameInput.trim()}"!`);
  };

  const handleAddStructuralVariation = (pin: TenderFloorplanPin, customTitle?: string, customCost?: number) => {
    const newVar: TenderNumberedVariation = {
      id: pin.id,
      itemNumber: pin.number,
      description: customTitle || pin.title,
      cost: customCost || 0,
      category: "structural",
      isStructural: true,
    };
    const updated = [...tender.variations, newVar];
    const newPins = [...tender.homeSpec.floorplanPins, pin];
    recalculateTenderPricing(updated, newPins);
    autoGenerateFinalFloorplan(tender.homeSpec.floorplanUrl, newPins, tender.homeSpec.homeDesign);
  };

  const handleAssignExistingVariationToPin = (varId: string, pinCoord: { x: number; y: number }) => {
    const nextStructNumber = tender.variations.filter((v) => v.isStructural).length + 1;
    const targetItem = tender.variations.find((v) => v.id === varId);
    const itemTitle = targetItem ? targetItem.description : `Structural Modification #${nextStructNumber}`;

    const newPin: TenderFloorplanPin = {
      id: varId,
      number: nextStructNumber,
      x: pinCoord.x,
      y: pinCoord.y,
      title: itemTitle,
      variationId: varId,
    };

    const updatedVariations = tender.variations.map((v) => {
      if (v.id === varId) {
        return {
          ...v,
          category: "structural" as const,
          isStructural: true,
          itemNumber: nextStructNumber,
        };
      }
      return v;
    });

    const updatedPins = [...tender.homeSpec.floorplanPins, newPin];
    recalculateTenderPricing(updatedVariations, updatedPins);
  };

  const handleRemoveStructuralVariation = (pinId: string) => {
    const filtered = tender.variations.filter((v) => v.id !== pinId);
    let structIdx = 0;
    const renumbered = filtered.map((v) => {
      if (v.isStructural) {
        structIdx++;
        return { ...v, itemNumber: structIdx };
      }
      return v;
    });

    const updatedPins = tender.homeSpec.floorplanPins.filter((p) => p.id !== pinId);
    const renumberedPins = updatedPins.map((p, idx) => ({ ...p, number: idx + 1 }));

    recalculateTenderPricing(renumbered, renumberedPins);
  };

  const handleMoveVariationCategory = (varId: string, toStructural: boolean) => {
    let updatedPins = [...tender.homeSpec.floorplanPins];
    let nextStructNumber = tender.variations.filter((v) => v.isStructural).length + 1;

    const updated = tender.variations.map((v) => {
      if (v.id === varId) {
        if (toStructural) {
          if (!updatedPins.some((p) => p.id === varId)) {
            updatedPins.push({
              id: varId,
              number: nextStructNumber,
              x: 50,
              y: 50,
              title: v.description,
              variationId: varId,
            });
          }
          return {
            ...v,
            category: "structural" as const,
            isStructural: true,
            itemNumber: nextStructNumber,
          };
        } else {
          updatedPins = updatedPins.filter((p) => p.id !== varId);
          return {
            ...v,
            category: "all_variations" as const,
            isStructural: false,
            itemNumber: undefined,
          };
        }
      }
      return v;
    });

    let sIdx = 0;
    const renumberedVariations = updated.map((v) => {
      if (v.isStructural) {
        sIdx++;
        return { ...v, itemNumber: sIdx };
      }
      return v;
    });
    const renumberedPins = updatedPins.map((p, idx) => ({ ...p, number: idx + 1 }));

    recalculateTenderPricing(renumberedVariations, renumberedPins);
    toast.success(`Moved item to ${toStructural ? "A. Numbered Structural Variations (Badge on Plan)" : "B. All Variations (Unnumbered)"}`);
  };

  const handleAddNewItem = (isStructural: boolean) => {
    const id = `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    let structNum: number | undefined = undefined;
    let updatedPins = [...tender.homeSpec.floorplanPins];

    if (isStructural) {
      structNum = tender.variations.filter((v) => v.isStructural).length + 1;
      updatedPins.push({
        id,
        number: structNum,
        x: 50,
        y: 50,
        title: `Structural Modification #${structNum}`,
        variationId: id,
      });
    }

    const newItem: TenderNumberedVariation = {
      id,
      description: isStructural ? `Structural Modification #${structNum}` : "Selection Variation / Site Allowance",
      cost: 0,
      category: isStructural ? "structural" : "all_variations",
      isStructural,
      itemNumber: structNum,
    };

    const updated = [...tender.variations, newItem];
    recalculateTenderPricing(updated, updatedPins);
  };

  const handleUpdateVariation = (id: string, patch: Partial<TenderNumberedVariation>) => {
    const updated = tender.variations.map((v) => (v.id === id ? { ...v, ...patch } : v));
    recalculateTenderPricing(updated, tender.homeSpec.floorplanPins);
  };

  const handleDeleteVariation = (id: string) => {
    const filtered = tender.variations.filter((v) => v.id !== id);
    let structIdx = 0;
    const renumbered = filtered.map((v) => {
      if (v.isStructural) {
        structIdx++;
        return { ...v, itemNumber: structIdx };
      }
      return v;
    });

    const updatedPins = tender.homeSpec.floorplanPins.filter((p) => p.id !== id);
    const renumberedPins = updatedPins.map((p, idx) => ({ ...p, number: idx + 1 }));

    recalculateTenderPricing(renumbered, renumberedPins);
  };

  const recalculateTenderPricing = (
    variationsList: TenderNumberedVariation[],
    pinsList: TenderFloorplanPin[]
  ) => {
    const structCost = variationsList
      .filter((v) => v.isStructural)
      .reduce((s, v) => s + (Number(v.cost) || 0), 0);

    const allVarCost = variationsList
      .filter((v) => !v.isStructural)
      .reduce((s, v) => s + (Number(v.cost) || 0), 0);

    const landscape = tender.homeSpec.includeLandscapePackage ? tender.homeSpec.landscapePackageCost || 0 : 0;

    updateTender({
      variations: variationsList,
      homeSpec: {
        ...tender.homeSpec,
        floorplanPins: pinsList,
        structuralVariationsCost: structCost,
        internalUpgradesCost: allVarCost,
        totalBudgetEstimate:
          tender.homeSpec.baseDesignCost +
          tender.homeSpec.facadeCost +
          structCost +
          allVarCost +
          tender.homeSpec.additionalSiteCost +
          landscape -
          tender.homeSpec.promotionDiscountCost,
      },
    });
  };

  const handleFileUpload = async (slotId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const standardizedFileName = getStandardizedDocumentFileName(
          tender.customer1.surname,
          slotId,
          file.name,
          tender.atp.feeAmount
        );
        const updatedDocs = {
          ...tender.documents,
          [slotId]: {
            ...(tender.documents[slotId] || { id: slotId, label: slotId, category: "land_siting" }),
            fileName: standardizedFileName,
            fileDataUrl: dataUrl,
            fileType: file.type,
            fileSize: file.size,
          },
        };

        if (slotId === "siting_plan") {
          let renderedImg = dataUrl;
          if (isPdf) {
            try {
              const extracted = await pdfDocumentToPagesAndText(file, 1);
              if (extracted.pages && extracted.pages.length > 0) {
                renderedImg = extracted.pages[0];
              }
            } catch (err) {
              console.warn("Could not extract PDF page for siting plan preview:", err);
            }
          }
          updateTender({
            documents: updatedDocs,
            homeSpec: { ...tender.homeSpec, sitingPlanDataUrl: renderedImg },
          });
        } else {
          updateTender({ documents: updatedDocs });
        }

        toast.success(`Attached "${file.name}" to ${tender.documents[slotId]?.label || "job folder"}`);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      toast.error("Failed to process file attachment");
    }
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
    if (slotId === "siting_plan") {
      updateTender({
        documents: updatedDocs,
        homeSpec: { ...tender.homeSpec, sitingPlanDataUrl: undefined },
      });
    } else {
      updateTender({ documents: updatedDocs });
    }
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

  // Auto-save tender whenever clicking onto Page 4 (ATP sign) or any tab
  useEffect(() => {
    saveTenderToIdb(tender).catch(() => {});
    try {
      localStorage.setItem(`hudson_tender_${tender.id}`, JSON.stringify(tender));
      localStorage.setItem("hudson_current_tender_draft", JSON.stringify(tender));
    } catch {}
  }, [activeTab]);

  const compactCode = encodeTenderForRemoteLink(tender);
  const remoteSigningUrl = typeof window !== "undefined"
    ? `${window.location.origin}/tender-sign/${tender.submissionNumber || tender.id}${compactCode ? `?d=${compactCode}` : ""}`
    : "";

  const handleCopyRemoteLink = () => {
    navigator.clipboard.writeText(remoteSigningUrl);
    toast.success("Remote Client Signing Link copied to clipboard!");
  };

  const handleCopyAtpSms = () => {
    const clientNames = tender.hasCustomer2 && tender.customer2.firstName
      ? `${tender.customer1.firstName} & ${tender.customer2.firstName}`
      : (tender.customer1.firstName || "there");

    const atpSmsText = `Hey ${clientNames}

Please see below link to sign our Authority to Proceed form:
${remoteSigningUrl}

Let me know if you have issues`;

    navigator.clipboard.writeText(atpSmsText);
    toast.success("Copied ATP SMS text to clipboard! Feel free to customise this message as you see fit.");
  };

  const handleCopyOnsiteSummary = () => {
    const summary = `HUDSON HOMES ONSITE JOB CREATION
Submission Ref: ${tender.submissionNumber}
Build Type: ${tender.buildType}${tender.buildType.includes("KDRB") ? ` (Occupancy: ${tender.land.ifKdrOccupancy || "Vacant"})` : ""}
Client 1: ${tender.customer1.firstName} ${tender.customer1.surname} (${tender.customer1.mobile}, ${tender.customer1.email})
${tender.hasCustomer2 ? `Client 2: ${tender.customer2.firstName} ${tender.customer2.surname} (${tender.customer2.mobile}, ${tender.customer2.email})` : ""}
Site Address: Lot ${tender.land.lotNo || "TBA"}, ${tender.land.streetName || ""} ${tender.land.suburb || ""} (${tender.land.council})
Design: ${tender.homeSpec.homeDesign} (${tender.homeSpec.facade} Facade · ${tender.homeSpec.inclusionsType})
Total Build Investment: ${formatAud(tender.homeSpec.totalBudgetEstimate)}
Tender Fee Paid: ${formatAud(tender.atp.feeAmount)} (Ref: ${tender.atp.eftReference})`;
    navigator.clipboard.writeText(summary);
    toast.success("OnSite summary copied to clipboard for Bernie!");
  };

  // Grouped variations into 2 columns
  const structuralItems = tender.variations.filter((v) => v.isStructural);
  const allOtherItems = tender.variations.filter((v) => !v.isStructural);

  // Document attachments counter
  const attachedDocsCount = Object.values(tender.documents).filter((d) => !!d.fileDataUrl).length;
  const totalSlotsCount = Object.keys(tender.documents).length;

  const requiredSlots = STANDARD_DOCUMENT_SLOTS.filter((s) => s.required);
  const optionalSlots = STANDARD_DOCUMENT_SLOTS.filter((s) => !s.required);

  const tabs = [
    { id: "client_job", label: "1. Client Profile", icon: User },
    { id: "land_siting", label: "2. Land & Siting", icon: MapPin },
    { id: "home_spec", label: "3. Home Spec & Floorplan Markups", icon: Home },
    { id: "atp_sign", label: "4. Authority to Proceed (ATP) & E-Sign", icon: PenTool },
    { id: "job_folder", label: `5. Job Folder (${attachedDocsCount}/${totalSlotsCount})`, icon: Folder },
    { id: "pdf_preview", label: "6. Master PDF & Bernie Handoff", icon: Send },
  ];

  const availableDesigns =
    tender.homeSpec.housingType === "Double Storey"
      ? DOUBLE_STOREY_PRICES
      : tender.homeSpec.housingType === "Split Level"
      ? SPLIT_LEVEL_PRICES
      : tender.homeSpec.housingType === "Dual Living"
      ? DUAL_OC_PRICES
      : SINGLE_STOREY_PRICES;

  const availableFacades = HOUSING_FACADES[tender.homeSpec.housingType] || HOUSING_FACADES["Single Storey"];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 2xl:p-12 w-full max-w-[1920px] 2xl:max-w-[2560px] mx-auto space-y-6 font-sans">
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
            Automated Master PDF generation, digital Authority to Proceed (ATP) e-signing, and standardized Job Folder packaging for Bernie &amp; OnSite.
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
            Auto-Fill from Quote ({savedQuotes.length})
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
            className="border-cyan-500/50 bg-cyan-950/40 text-cyan-200 hover:bg-cyan-900/60 hover:text-white text-xs gap-1.5"
          >
            <Cloud className="h-3.5 w-3.5 text-cyan-400" />
            {saving ? "Saving…" : "Save Tender to Website"}
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

      {/* Navigation Tabs (6 Steps) */}
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

      {/* Main Tab Content Container */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/80 backdrop-blur-xl p-6 shadow-2xl">
        {/* ========================================================================= */}
        {/* TAB 1: CLIENT PROFILE (IDENTICAL 1ST & 2ND CUSTOMER LAYOUT)               */}
        {/* ========================================================================= */}
        {activeTab === "client_job" && (
          <div className="space-y-6">
            {/* Auto Fill Banner on Page 1 */}
            <div className="p-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/60 via-slate-900 to-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 flex-none">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Auto-Fill from Existing Estimate
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Instantly load client details, address, chosen design, facade, and itemized variations from your Quoting Tool.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => setIsImportQuoteOpen(true)}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs gap-1.5 flex-none shadow-md shadow-cyan-500/20"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Auto-Fill from Quote ({savedQuotes.length})
              </Button>
            </div>

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
              {/* Customer 1 (Identical layout to Customer 2) */}
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
                      className="border-slate-800 bg-slate-900 text-xs font-semibold text-white"
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
                      className="border-slate-800 bg-slate-900 text-xs font-semibold text-white"
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
              </div>

              {/* Customer 2 (Identical layout) */}
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
                          className="border-slate-800 bg-slate-900 text-xs font-semibold text-white"
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
                          className="border-slate-800 bg-slate-900 text-xs font-semibold text-white"
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
                    Single purchaser application. Enable &ldquo;Two Purchasers?&rdquo; above if joint contract.
                  </div>
                )}
              </div>
            </div>

            {/* Current Residential Address */}
            <div className="space-y-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <span className="text-xs font-bold uppercase text-amber-400 block border-b border-slate-800 pb-1.5">
                Current Residential Address (For Contract &amp; Mailing)
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
        {/* TAB 2: LAND & SITING WITH BUILD TYPE & KDRB TENANT DETAILS                */}
        {/* ========================================================================= */}
        {activeTab === "land_siting" && (
          <div className="space-y-6">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-cyan-400" /> Proposed Land, Estate &amp; Site Conditions
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure build type, lot specifications, council jurisdiction, and KDRB tenant access if applicable.
              </p>
            </div>

            {/* Build Type & Deposit Tier */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <div>
                <Label className="text-[11px] text-slate-300">Type of Build *</Label>
                <Select
                  value={tender.buildType}
                  onValueChange={(v: BuildType) => {
                    const isKdr = v.includes("KDRB");
                    updateTender({
                      buildType: v,
                      atp: {
                        ...tender.atp,
                        feeType: isKdr ? "kdr_duplex_3300" : v.includes("Package") ? "package_3000" : "greenfield_1650",
                        feeAmount: isKdr ? 3300 : v.includes("Package") ? 3000 : 1650,
                        tenderAcceptanceFee: isKdr ? 6600 : 4400,
                      },
                    });
                  }}
                >
                  <SelectTrigger className="border-slate-800 bg-slate-900 text-xs font-bold text-cyan-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                    <SelectItem value="Greenfield Site">Greenfield Site (Vacant Land)</SelectItem>
                    <SelectItem value="Exclusive Lot">Exclusive Lot Allocation</SelectItem>
                    <SelectItem value="Knock-Down, Rebuild (KDRB)">Knock-Down, Rebuild (KDRB)</SelectItem>
                    <SelectItem value="House & Land Package">House &amp; Land Package</SelectItem>
                    <SelectItem value="Custom">Custom Architectural Build</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
            </div>

            {/* KDRB Specific Occupancy & Tenant Contact Panel */}
            {tender.buildType.includes("KDRB") && (
              <div className="space-y-4 bg-amber-950/20 p-4 rounded-xl border border-amber-500/40">
                <span className="text-xs font-bold uppercase text-amber-400 block border-b border-amber-800/60 pb-1.5">
                  Knock-Down Rebuild (KDRB) Occupancy &amp; Site Access
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[11px] text-slate-300">Property Occupancy Status *</Label>
                    <Select
                      value={tender.land.ifKdrOccupancy || "Owner Occupied"}
                      onValueChange={(v: KdrOccupancy) =>
                        updateTender({ land: { ...tender.land, ifKdrOccupancy: v } })
                      }
                    >
                      <SelectTrigger className="border-slate-800 bg-slate-900 text-xs font-bold text-amber-400">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                        <SelectItem value="Owner Occupied">Owner Occupied</SelectItem>
                        <SelectItem value="Vacant">Vacant / Unoccupied</SelectItem>
                        <SelectItem value="Tenanted">Tenanted Property</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[11px] text-slate-300 flex items-center justify-between">
                      <span>Site Access / Demolition Issues *</span>
                      <span className="text-[10px] text-amber-400">Power poles, slope, overhead wires, fences</span>
                    </Label>
                    <Input
                      value={tender.land.comments || ""}
                      onChange={(e) => updateTender({ land: { ...tender.land, comments: e.target.value } })}
                      placeholder="e.g. Narrow side access, power pole near driveway, overhead wires, steep slope, demolition by client"
                      className="border-slate-800 bg-slate-900 text-xs font-medium text-amber-300"
                    />
                  </div>
                </div>

                {tender.land.ifKdrOccupancy === "Tenanted" && (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-950/70 p-3 rounded-lg border border-slate-800">
                    <div>
                      <Label className="text-[11px] text-slate-300">Tenant Name *</Label>
                      <Input
                        value={tender.land.kdrTenantDetails?.name || ""}
                        onChange={(e) =>
                          updateTender({
                            land: {
                              ...tender.land,
                              kdrTenantDetails: {
                                ...(tender.land.kdrTenantDetails || { name: "", phone: "", email: "", accessNotes: "" }),
                                name: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="e.g. John Doe"
                        className="border-slate-800 bg-slate-900 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-slate-300">Tenant Phone *</Label>
                      <Input
                        value={tender.land.kdrTenantDetails?.phone || ""}
                        onChange={(e) =>
                          updateTender({
                            land: {
                              ...tender.land,
                              kdrTenantDetails: {
                                ...(tender.land.kdrTenantDetails || { name: "", phone: "", email: "", accessNotes: "" }),
                                phone: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="e.g. 0400 123 456"
                        className="border-slate-800 bg-slate-900 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-slate-300">Tenant Email</Label>
                      <Input
                        value={tender.land.kdrTenantDetails?.email || ""}
                        onChange={(e) =>
                          updateTender({
                            land: {
                              ...tender.land,
                              kdrTenantDetails: {
                                ...(tender.land.kdrTenantDetails || { name: "", phone: "", email: "", accessNotes: "" }),
                                email: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="e.g. tenant@gmail.com"
                        className="border-slate-800 bg-slate-900 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-slate-300">Access / Inspection Instructions</Label>
                      <Input
                        value={tender.land.kdrTenantDetails?.accessNotes || ""}
                        onChange={(e) =>
                          updateTender({
                            land: {
                              ...tender.land,
                              kdrTenantDetails: {
                                ...(tender.land.kdrTenantDetails || { name: "", phone: "", email: "", accessNotes: "" }),
                                accessNotes: e.target.value,
                              },
                            },
                          })
                        }
                        placeholder="e.g. Call 24h prior, beware of dog"
                        className="border-slate-800 bg-slate-900 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Lot Area, Frontage & Council */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
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
                <Label className="text-[11px] text-slate-300">Lot Area (m²) *</Label>
                <Input
                  type="number"
                  value={tender.land.lotSizeM2}
                  onChange={(e) => {
                    const m2 = Number(e.target.value) || "";
                    const landscapeCost = calculateLandscapePackageCost(m2, tender.homeSpec.housingType, tender.homeSpec.homeDesign);
                    updateTender({
                      land: { ...tender.land, lotSizeM2: m2 },
                      homeSpec: {
                        ...tender.homeSpec,
                        landscapePackageCost: landscapeCost,
                      },
                    });
                  }}
                  placeholder="e.g. 450"
                  className="border-slate-800 bg-slate-900 text-xs font-mono font-bold text-emerald-400"
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
              <div>
                <Label className="text-[11px] text-slate-300">Local Council</Label>
                <Input
                  value={tender.land.council}
                  onChange={(e) => updateTender({ land: { ...tender.land, council: e.target.value } })}
                  placeholder="e.g. Logan City Council"
                  className="border-slate-800 bg-slate-900 text-xs"
                />
              </div>

              <div className="md:col-span-2">
                <Label className="text-[11px] text-slate-300">Site Street Address</Label>
                <Input
                  value={tender.land.streetName}
                  onChange={(e) => updateTender({ land: { ...tender.land, streetName: e.target.value } })}
                  placeholder="e.g. Sovereign Way, Pelican Waters"
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
            </div>

            <div className="flex justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setActiveTab("client_job")}
                className="text-xs text-slate-400"
              >
                Back to Client Profile
              </Button>
              <Button
                type="button"
                onClick={() => setActiveTab("home_spec")}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5"
              >
                Proceed to Home Spec &amp; Floorplan <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: HOME SPEC, LANDSCAPE NEAR INCLUSIONS, & 2 VARIATION COLUMNS        */}
        {/* ========================================================================= */}
        {activeTab === "home_spec" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                  <Home className="h-4 w-4 text-amber-400" /> New Home Configuration &amp; 2-Column Variations
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Manage structural modifications with floorplan pins in Column A, and all other inclusions and site allowances in Column B.
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase block">Total Build Investment:</span>
                <strong className="text-base font-extrabold font-mono text-emerald-400">
                  {formatAud(tender.homeSpec.totalBudgetEstimate)}
                </strong>
              </div>
            </div>

            {/* Design, Facade & Inclusions Dropdowns */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
                <div>
                  <Label className="text-[11px] text-slate-300">Storeys / Category</Label>
                  <Select
                    value={tender.homeSpec.housingType}
                    onValueChange={(v: any) =>
                      updateTender({ homeSpec: { ...tender.homeSpec, housingType: v } })
                    }
                  >
                    <SelectTrigger className="border-slate-800 bg-slate-900 text-xs font-bold text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                      <SelectItem value="Single Storey">Single Storey</SelectItem>
                      <SelectItem value="Double Storey">Double Storey</SelectItem>
                      <SelectItem value="Split Level">Split Level</SelectItem>
                      <SelectItem value="Dual Living">Dual Living</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-[11px] text-slate-300">Select Home Design</Label>
                  <Select
                    value={tender.homeSpec.homeDesign}
                    onValueChange={handleDesignChange}
                  >
                    <SelectTrigger className="border-slate-800 bg-slate-900 text-xs font-bold text-amber-400">
                      <SelectValue placeholder="Choose Design" />
                    </SelectTrigger>
                    <SelectContent className="border-slate-800 bg-slate-900 text-slate-200 max-h-64">
                      {availableDesigns.map((d) => (
                        <SelectItem key={d.name} value={d.name}>
                          {d.name} ({d.m2} m²)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] text-slate-300">Architectural Facade</Label>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomFacadeNameInput(tender.homeSpec.customFacadeName || tender.homeSpec.facade || "");
                        setCustomFacadePriceInput(tender.homeSpec.facadeCost || "");
                        setCustomFacadePreviewUrl(tender.homeSpec.facadeRenderUrl || "");
                        setIsCustomFacadeOpen(true);
                      }}
                      className="text-[10px] text-amber-400 hover:text-amber-300 font-bold underline flex items-center gap-0.5"
                    >
                      <Upload className="h-2.5 w-2.5" /> Upload Custom / Inspo
                    </button>
                  </div>
                  <Select
                    value={tender.homeSpec.isCustomFacade ? "custom_facade_active" : tender.homeSpec.facade}
                    onValueChange={(val) => {
                      if (val === "custom_facade_active") {
                        setIsCustomFacadeOpen(true);
                      } else {
                        handleFacadeChange(val);
                      }
                    }}
                  >
                    <SelectTrigger className="border-slate-800 bg-slate-900 text-xs font-bold text-slate-100">
                      <SelectValue placeholder="Choose Facade" />
                    </SelectTrigger>
                    <SelectContent className="border-slate-800 bg-slate-900 text-slate-200 max-h-64">
                      {tender.homeSpec.isCustomFacade && (
                        <SelectItem value="custom_facade_active" className="text-amber-300 font-bold">
                          ★ {tender.homeSpec.facade} (Custom Inspo Upload)
                        </SelectItem>
                      )}
                      {availableFacades.map((f) => (
                        <SelectItem key={f.name} value={f.name}>
                          {f.name} {f.uplift > 0 ? `(+${formatAud(f.uplift)})` : "(Standard)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-[11px] text-slate-300">Inclusions Tier</Label>
                  <Select
                    value={tender.homeSpec.inclusionsType}
                    onValueChange={(v: TenderInclusionType) =>
                      updateTender({ homeSpec: { ...tender.homeSpec, inclusionsType: v } })
                    }
                  >
                    <SelectTrigger className="border-slate-800 bg-slate-900 text-xs font-bold text-emerald-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                      <SelectItem value="H1 Smart">H1 Smart Inclusions</SelectItem>
                      <SelectItem value="H2 Designer">H2 Designer Inclusions</SelectItem>
                      <SelectItem value="H3 Luxury">H3 Luxury Inclusions</SelectItem>
                      <SelectItem value="Standard">Standard Inclusions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Turnkey Landscape Package (Full Interactive Box Toggle) */}
              <div
                onClick={() => handleToggleLandscape(!tender.homeSpec.includeLandscapePackage)}
                className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md ${
                  tender.homeSpec.includeLandscapePackage
                    ? "border-emerald-500 bg-emerald-950/30 ring-1 ring-emerald-500/50 shadow-emerald-950/20"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/80"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-xl flex-none border transition-colors ${
                      tender.homeSpec.includeLandscapePackage
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    <Trees className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Turnkey Landscape Package
                      </span>
                      <span className="font-mono font-bold text-xs text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                        +{formatAud(calculateLandscapePackageCost(tender.land.lotSizeM2, tender.homeSpec.housingType, tender.homeSpec.homeDesign))}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Full turf, concrete driveway, garden beds, perimeter fencing, clothesline &amp; letterbox based on <strong>{tender.land.lotSizeM2 || 450} m²</strong> lot area.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-none">
                  {tender.homeSpec.includeLandscapePackage ? (
                    <span className="text-xs font-bold bg-emerald-500 text-slate-950 px-3 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                      <Check className="h-3.5 w-3.5 stroke-[3]" /> Included in Build
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-400 bg-slate-800/80 hover:text-white px-3 py-1 rounded-lg border border-slate-700">
                      + Click to Include
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Interactive Floorplan Canvas (Side-by-Side if modified) */}
            <FloorplanMarkupViewer
              floorplanUrl={tender.homeSpec.floorplanUrl}
              originalFloorplanUrl={tender.homeSpec.originalFloorplanUrl}
              isModifiedPlan={tender.homeSpec.isModifiedFloorplan}
              designName={tender.homeSpec.homeDesign}
              pins={tender.homeSpec.floorplanPins}
              variations={tender.variations}
              onUpdatePins={(pins) => {
                updateTender({ homeSpec: { ...tender.homeSpec, floorplanPins: pins } });
                autoGenerateFinalFloorplan(tender.homeSpec.floorplanUrl, pins, tender.homeSpec.homeDesign);
              }}
              onUploadCustomPlan={(dataUrl) => {
                updateTender({
                  homeSpec: {
                    ...tender.homeSpec,
                    floorplanUrl: dataUrl,
                    isModifiedFloorplan: true,
                  },
                });
                autoGenerateFinalFloorplan(dataUrl, tender.homeSpec.floorplanPins, tender.homeSpec.homeDesign);
              }}
              onAddStructuralVariation={handleAddStructuralVariation}
              onAssignExistingVariationToPin={handleAssignExistingVariationToPin}
              onRemoveStructuralVariation={handleRemoveStructuralVariation}
            />

            {/* 2 VARIATION COLUMNS (DRAFTING SPECIFICATIONS - NO PRICE CLUTTER) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* COLUMN A: NUMBERED STRUCTURAL VARIATIONS */}
              <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-amber-500/40">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div>
                    <span className="text-xs font-bold uppercase text-amber-400 flex items-center gap-1.5">
                      <Layers className="h-4 w-4" /> A. Numbered Structural Variations ({structuralItems.length})
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Assigned # &bull; Pinned onto the architectural floorplan above (Drafting Instructions)
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleAddNewItem(true)}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10.5px] font-bold h-7 gap-1 shadow-xs"
                  >
                    <Plus className="h-3 w-3" /> Add Structural
                  </Button>
                </div>

                <div className="space-y-3">
                  {structuralItems.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                      No structural modifications. Click directly on the floorplan drawing above or click &ldquo;Add Structural&rdquo;.
                    </div>
                  ) : (
                    structuralItems.map((v) => (
                      <div
                        key={v.id}
                        className="p-3 rounded-lg border border-slate-800 bg-slate-900 space-y-2 shadow-sm"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="h-7 w-7 rounded-full bg-amber-500 text-slate-950 font-mono font-black text-xs flex items-center justify-center flex-none mt-0.5">
                            #{v.itemNumber}
                          </span>
                          <div className="flex-1 space-y-1">
                            <Textarea
                              rows={2}
                              value={v.description}
                              onChange={(e) => handleUpdateVariation(v.id, { description: e.target.value })}
                              placeholder="Full structural modification instructions for drafting team (e.g. Extend Outdoor Living Alfresco by 1200mm with concrete slab)"
                              className="w-full border-slate-800 bg-slate-950 text-xs font-medium text-slate-100 resize-y min-h-[44px]"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteVariation(v.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 mt-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Mover Badge to Column B */}
                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60 text-[10.5px]">
                          <span className="text-[10px] text-amber-400/80 font-mono">
                            Drafting Pin #{v.itemNumber} Active
                          </span>
                          <button
                            type="button"
                            onClick={() => handleMoveVariationCategory(v.id, false)}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-cyan-950 hover:text-cyan-300 text-slate-300 border border-slate-700 font-medium transition-colors"
                          >
                            &rarr; Move to All Variations (Unnumbered)
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* COLUMN B: ALL OTHER VARIATIONS (INCLUSIONS, SITE COSTS, ETC.) */}
              <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-cyan-500/40">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div>
                    <span className="text-xs font-bold uppercase text-cyan-400 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4" /> B. All Other Variations &amp; Allowances ({allOtherItems.length})
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Unnumbered &bull; Inclusions, upgrades, site &amp; statutory specifications for drafting
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleAddNewItem(false)}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white text-[10.5px] font-bold h-7 gap-1 shadow-xs"
                  >
                    <Plus className="h-3 w-3" /> Add Variation
                  </Button>
                </div>

                <div className="space-y-3">
                  {allOtherItems.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                      No general variations. Click &ldquo;Add Variation&rdquo; to add specification notes for draftsmen.
                    </div>
                  ) : (
                    allOtherItems.map((v) => (
                      <div
                        key={v.id}
                        className="p-3 rounded-lg border border-slate-800 bg-slate-900 space-y-2 shadow-sm"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="flex-1 space-y-1">
                            <Textarea
                              rows={2}
                              value={v.description}
                              onChange={(e) => handleUpdateVariation(v.id, { description: e.target.value })}
                              placeholder="Full variation specification for drafting (e.g. Provide 20mm Smartstone vanity to Ensuite)"
                              className="w-full border-slate-800 bg-slate-950 text-xs text-slate-100 resize-y min-h-[44px]"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteVariation(v.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 mt-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Mover Badge to Column A */}
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800/60 text-[10.5px]">
                          <button
                            type="button"
                            onClick={() => handleMoveVariationCategory(v.id, true)}
                            className="px-2.5 py-1 rounded bg-amber-950/90 hover:bg-amber-900 text-amber-300 border border-amber-800/60 font-bold transition-colors"
                          >
                            &uarr; Make Structural (Assign # &amp; Pin on Plan)
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
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
                onClick={() => setActiveTab("atp_sign")}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5"
              >
                Proceed to Authority to Proceed <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: AUTHORITY TO PROCEED (ATP) & REMOTE SIGNING                        */}
        {/* ========================================================================= */}
        {activeTab === "atp_sign" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                  <PenTool className="h-4 w-4 text-emerald-400" /> Digital Authority to Proceed (ATP) &amp; Remote Signing
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sign in-person or send the remote signing link with cursive templates to your client via WhatsApp or Email!
                </p>
              </div>
              <div className="text-right font-mono">
                <span className="text-[10px] text-slate-500 uppercase block">Tender Fee Payable:</span>
                <strong className="text-base font-extrabold text-emerald-400">
                  {formatAud(tender.atp.feeAmount)}
                </strong>
              </div>
            </div>

            {/* Remote Signing Banner */}
            <div className="p-4 rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex-none">
                  <Share2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Remote Client Signing Link (Cursive Signature Template &amp; Draw Pad)
                  </h4>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Send this interactive signing page directly to your client so they can sign from their phone or laptop.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 flex-none">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCopyRemoteLink}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-sm"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy Remote Link
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleCopyAtpSms}
                  className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs gap-1.5 shadow-sm"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Copy ATP SMS to Client
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsShareRemoteOpen(true)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs gap-1.5 border border-slate-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Share Options
                </Button>
              </div>
            </div>

            {/* In-Person Interactive Signature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Client 1 Sign */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">
                    Primary Applicant (Client 1): {tender.customer1.firstName} {tender.customer1.surname}
                  </span>
                  {tender.atp.client1Signed ? (
                    <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Signed &bull; {tender.atp.client1SignatureDate}
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800">
                      Signature Pending
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
                    <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Signed &bull; {tender.atp.client2SignatureDate}
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
                onClick={() => setActiveTab("home_spec")}
                className="text-xs text-slate-400"
              >
                Back to Home Spec &amp; Floorplan
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
        {/* TAB 5: JOB FOLDER DOCUMENT REPOSITORY (REQUIRED ON TOP)                   */}
        {/* ========================================================================= */}
        {activeTab === "job_folder" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                  <Folder className="h-4 w-4 text-amber-400" /> Standard Job Folder Document Vault
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Attach all client IDs, 1:200 Siting Plan PDF, land disclosure plans, and deposit receipts into their standardized slots.
                </p>
              </div>
              <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono text-amber-400">
                Attached: {attachedDocsCount} of {totalSlotsCount} files
              </div>
            </div>

            {/* SECTION 1: REQUIRED DOCUMENTS (TOP OF PAGE) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Primary Required Job Documents (Mandatory for Bernie):
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {requiredSlots.map((slot) => {
                  const doc = tender.documents[slot.id];
                  const isAttached = !!doc?.fileDataUrl;
                  const surname = tender.customer1.surname || "Client";

                  return (
                    <div
                      key={slot.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                        isAttached
                          ? "border-emerald-500/70 bg-emerald-950/25 ring-1 ring-emerald-500/30 shadow-md"
                          : "border-amber-500/40 bg-slate-950/90 shadow-sm"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-bold text-xs text-slate-100 truncate flex items-center gap-1.5">
                            {isAttached ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-none" />
                            ) : (
                              <File className="h-4 w-4 text-amber-400 flex-none" />
                            )}
                            {slot.label}
                          </span>
                          {!isAttached && (
                            <span className="text-[9px] font-black text-amber-400 bg-amber-950/90 px-2 py-0.5 rounded border border-amber-500/60 uppercase">
                              Required
                            </span>
                          )}
                        </div>

                        {isAttached ? (
                          <div className="text-[11px] text-slate-200 font-mono truncate mb-2">
                            {doc.fileName || `${surname} - ${slot.label}`}
                            {doc.fileSize && (
                              <span className="text-[10px] text-slate-400 ml-1">
                                ({(doc.fileSize / 1024).toFixed(0)} KB)
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400 mb-2">
                            {slot.id === "siting_plan" ? "Upload 1:200 Siting Plan PDF" : "Click upload to attach file"}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                        <label className="cursor-pointer flex-1">
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.xlsx,.doc,.docx"
                            onChange={(e) => handleFileUpload(slot.id, e)}
                            className="hidden"
                          />
                          <span className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-[11px] font-bold text-slate-200 transition-colors">
                            <Upload className="h-3.5 w-3.5 text-slate-400" />
                            {isAttached ? "Replace File" : slot.id === "siting_plan" ? "Upload Siting Plan (PDF)" : "Upload File"}
                          </span>
                        </label>

                        {isAttached && (
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(slot.id)}
                            className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 2: OPTIONAL SITE & ENGINEERING REPORTS */}
            <div className="space-y-3 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Site, Engineering &amp; Overlay Reports (Optional / When Available):
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {optionalSlots.map((slot) => {
                  const doc = tender.documents[slot.id];
                  const isAttached = !!doc?.fileDataUrl;
                  const surname = tender.customer1.surname || "Client";

                  return (
                    <div
                      key={slot.id}
                      className={`p-3 rounded-xl border transition-all flex flex-col justify-between ${
                        isAttached
                          ? "border-emerald-500/60 bg-emerald-950/20 shadow-md"
                          : "border-slate-800/60 bg-slate-950/40 opacity-80 hover:opacity-100"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-semibold text-xs text-slate-200 truncate flex items-center gap-1.5">
                            {isAttached ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-none" />
                            ) : (
                              <File className="h-3.5 w-3.5 text-slate-500 flex-none" />
                            )}
                            {slot.label}
                          </span>
                        </div>

                        {isAttached ? (
                          <div className="text-[11px] text-slate-300 font-mono truncate mb-2">
                            {doc.fileName || `${surname} - ${slot.label}`}
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-500 mb-2">Optional report attachment</p>
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
                          <span className="w-full inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-[11px] font-semibold text-slate-300 transition-colors">
                            <Upload className="h-3 w-3 text-slate-400" />
                            {isAttached ? "Replace" : "Attach"}
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
            </div>

            <div className="flex justify-between pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setActiveTab("atp_sign")}
                className="text-xs text-slate-400"
              >
                Back to Authority to Proceed
              </Button>
              <Button
                type="button"
                onClick={() => setActiveTab("pdf_preview")}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5"
              >
                Proceed to Master PDF &amp; Bernie Handoff <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: MASTER PDF REVIEW & BERNIE WORKFLOW MANAGER HANDOFF                 */}
        {/* ========================================================================= */}
        {activeTab === "pdf_preview" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                  <Send className="h-4 w-4 text-emerald-400" /> Master PDF Review &amp; Workflow Manager Handoff
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Unified multi-page Master PDF with dedicated Facade, Original &amp; Modified Floorplans, Siting Plan, Variations, and ATP.
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
                <div><strong>Subject:</strong> Tender Request Submission — {tender.customer1.surname || "Client"} (Lot {tender.land.lotNo || "TBA"}, {tender.land.estate || tender.land.suburb || "Site"}) — {tender.submissionNumber}</div>
                <div className="pt-2 border-t border-slate-800 text-[11.5px] leading-relaxed text-slate-300">
                  Hi Bernie,<br /><br />
                  Please find attached the complete Tender Request Job Folder for <strong>{tender.customer1.firstName} {tender.customer1.surname}</strong>.<br />
                  &bull; <strong>Job Address:</strong> Lot {tender.land.lotNo || "TBA"}, {tender.land.streetName || ""} {tender.land.suburb || ""} ({tender.land.council})<br />
                  &bull; <strong>Build Type:</strong> {tender.buildType}{tender.buildType.includes("KDRB") ? ` (${tender.land.ifKdrOccupancy || "Vacant"})` : ""}<br />
                  &bull; <strong>Home Design:</strong> {tender.homeSpec.homeDesign || "TBA"} with {tender.homeSpec.facade || "Standard"} facade ({tender.homeSpec.inclusionsType})<br />
                  &bull; <strong>Build Investment:</strong> {formatAud(tender.homeSpec.totalBudgetEstimate)} (Inc. {structuralItems.length} structural marked variations, {allOtherItems.length} general selections, &amp; {tender.homeSpec.includeLandscapePackage ? `Landscape Package ${formatAud(tender.homeSpec.landscapePackageCost || 0)}` : "No Landscape"})<br />
                  &bull; <strong>Authority to Proceed:</strong> {tender.atp.client1Signed ? "Signed Digitally by Client" : "Pending Signature"} &bull; Fee {formatAud(tender.atp.feeAmount)} paid via {tender.atp.paymentMethod.toUpperCase()}<br /><br />
                  All required documents (Photo IDs, Land Contract, Disclosure Plan, Siting Plan, and Marked-up Floorplan) are packaged in the attached ZIP file for OnSite file setup.<br /><br />
                  Thank you,<br />
                  {tender.newHomeConsultant || "Hudson Homes"} &bull; {tender.displayOffice || "Display Office"}
                </div>
              </div>
            </div>

            {/* Generated Master PDF Preview */}
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950 p-4">
              <div className="text-xs font-bold text-slate-300 mb-3 flex items-center justify-between">
                <span>Unified Multi-Page Tender Request &amp; Authority to Proceed Master PDF</span>
                <span className="text-[10px] text-cyan-400 font-mono">High-Res Layout &bull; Ready for Bernie</span>
              </div>
              <TenderMasterPdfDocument tender={tender} />
            </div>
          </div>
        )}
      </div>

      {/* Auto-Fill from Saved Estimate Dialog */}
      <Dialog open={isImportQuoteOpen} onOpenChange={setIsImportQuoteOpen}>
        <DialogContent className="max-w-2xl border-slate-800 bg-slate-950/98 text-slate-100 p-6 rounded-2xl shadow-2xl">
          <DialogHeader className="pb-3 border-b border-slate-800">
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              Auto-Fill from Saved Estimate ({savedQuotes.length})
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-400">
            Select an estimate from your Quoting Tool. This will auto-fill all client names, contact details, site address, chosen design, facade, floorplan, and itemized variations without auto-placing pins on the plan.
          </p>

          <div className="max-h-80 overflow-y-auto space-y-2 py-2">
            {savedQuotes.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                No saved estimates found in your local repository.
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
                    Select &amp; Auto-Fill <ArrowRight className="h-3 w-3" />
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
                    toast.success(`Loaded tender ${t.submissionNumber} for ${t.customer1.surname || "Client"}`);
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

      {/* Share Remote Signing Link Dialog */}
      <Dialog open={isShareRemoteOpen} onOpenChange={setIsShareRemoteOpen}>
        <DialogContent className="max-w-md border-slate-800 bg-slate-950 text-slate-100 p-6 rounded-2xl shadow-2xl">
          <DialogHeader className="pb-2 border-b border-slate-800">
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Share2 className="h-4 w-4 text-emerald-400" />
              Remote Client Signing Link
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your client can open this link on their mobile or desktop browser to review their Authority to Proceed terms and sign with their finger, mouse, or cursive template.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex gap-2">
              <Input
                readOnly
                value={remoteSigningUrl}
                className="text-xs border-slate-800 bg-slate-900 text-slate-200"
              />
              <Button
                size="sm"
                onClick={handleCopyRemoteLink}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs gap-1 flex-none"
              >
                <Copy className="h-3 w-3" /> Copy
              </Button>
            </div>

            {/* Automated SMS Section */}
            <div className="p-3 rounded-xl bg-slate-900 border border-sky-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-sky-400 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" /> Automated Client SMS
                </span>
                <Button
                  size="sm"
                  onClick={handleCopyAtpSms}
                  className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs h-7 px-2.5 gap-1"
                >
                  <Copy className="h-3 w-3" /> Copy SMS Text
                </Button>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-slate-300 font-sans text-xs whitespace-pre-line leading-relaxed">
                {`Hey ${tender.hasCustomer2 && tender.customer2.firstName ? `${tender.customer1.firstName} & ${tender.customer2.firstName}` : (tender.customer1.firstName || "there")}\n\nPlease see below link to sign our Authority to Proceed form:\n${remoteSigningUrl}\n\nLet me know if you have issues`}
              </div>
              <p className="text-[10.5px] text-slate-400 italic">
                Feel free to customise this message as you see fit.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Hi ${tender.customer1.firstName || "there"}, here is your Hudson Homes Authority to Proceed signing link for Lot ${tender.land.lotNo || "TBA"}, ${tender.land.suburb || ""}: ${remoteSigningUrl}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
              >
                <MessageSquare className="h-3.5 w-3.5" /> WhatsApp Invite
              </a>

              <a
                href={`mailto:${tender.customer1.email || ""}?subject=${encodeURIComponent(
                  `Hudson Homes — Authority to Proceed for Lot ${tender.land.lotNo || "TBA"}`
                )}&body=${encodeURIComponent(
                  `Hi ${tender.customer1.firstName || ""},\n\nPlease review and electronically sign your Authority to Proceed here:\n${remoteSigningUrl}\n\nThank you,\n${tender.newHomeConsultant || "Hudson Homes"}`
                )}`}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors border border-slate-700"
              >
                <Mail className="h-3.5 w-3.5" /> Email Client
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Facade Render / Inspo Upload Dialog */}
      <Dialog open={isCustomFacadeOpen} onOpenChange={setIsCustomFacadeOpen}>
        <DialogContent className="max-w-lg border-slate-800 bg-slate-950 text-slate-100 p-6 rounded-2xl shadow-2xl space-y-4">
          <DialogHeader className="pb-2 border-b border-slate-800">
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <Upload className="h-4 w-4 text-amber-400" />
              Upload Custom Architectural Facade / Inspo
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-slate-400">
            Upload custom client facade render, elevation drawing or architectural inspiration image with custom pricing.
          </p>

          <div className="space-y-4 pt-1">
            {/* File Upload input */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Custom Facade Render / Drawing (Image or PDF) *</Label>
              <div className="border-2 border-dashed border-slate-800 hover:border-amber-500/50 rounded-xl p-4 bg-slate-900/60 text-center space-y-2">
                {customFacadePreviewUrl ? (
                  <div className="space-y-2">
                    <img
                      src={customFacadePreviewUrl}
                      alt="Custom Facade Preview"
                      className="max-h-40 mx-auto rounded-lg border border-slate-800 object-contain"
                    />
                    <label className="inline-block px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg cursor-pointer font-semibold">
                      Change File
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleCustomFacadeFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <label className="block cursor-pointer py-4 space-y-2">
                    <Upload className="h-8 w-8 text-amber-400 mx-auto" />
                    <span className="text-xs text-slate-300 block font-medium">Click to upload Render Image (PNG/JPG) or PDF Elevation</span>
                    <span className="text-[10.5px] text-slate-500 block">Renders directly on Master PDF Page 2</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleCustomFacadeFileUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Facade Title Input */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Custom Facade Title *</Label>
              <Input
                value={customFacadeNameInput}
                onChange={(e) => setCustomFacadeNameInput(e.target.value)}
                placeholder="e.g. Modern Hampton Coastal Custom Facade"
                className="border-slate-800 bg-slate-900 text-xs text-slate-100 font-semibold"
              />
            </div>

            {/* Custom Facade Uplift / Price */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Custom Facade Uplift / Price ($ Inc. GST)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">$</span>
                <Input
                  type="number"
                  value={customFacadePriceInput}
                  onChange={(e) => setCustomFacadePriceInput(Number(e.target.value) || "")}
                  placeholder="0 (or as specified in estimate)"
                  className="pl-7 border-slate-800 bg-slate-900 text-xs font-mono font-bold text-amber-400"
                />
              </div>
              <p className="text-[10px] text-slate-500">
                Pre-filled from estimate if uploaded, or enter custom builder pricing.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsCustomFacadeOpen(false)}
              className="text-xs text-slate-400"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCustomFacadeSave}
              className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs gap-1.5 shadow-md shadow-amber-500/20"
            >
              <Check className="h-3.5 w-3.5" /> Apply Custom Facade
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* In-Person Digital Signature Modal */}
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
