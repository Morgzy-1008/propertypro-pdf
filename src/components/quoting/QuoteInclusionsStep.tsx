import React, { useMemo, useState } from "react";
import {
  PackageCheck,
  Plus,
  Trash2,
  DollarSign,
  Layers,
  Search,
  CheckCircle2,
  Filter,
  Sparkles,
  Minus,
  Check,
  Building2,
  DoorClosed,
  Wind,
  Waves,
  Paintbrush,
  Home,
} from "lucide-react";
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
import { formatAud } from "@/lib/pricing";
import { CATEGORY_LABELS } from "@/lib/quoting/quoteCatalogue";
import { calculateDesignGFA, resolveItemCategory } from "@/lib/quoting/quoteEngine";
import type {
  CatalogueCategory,
  FullQuote,
  QuoteSelectedLineItem,
  UnitType,
} from "@/lib/quoting/quoteTypes";

interface QuoteInclusionsStepProps {
  quote: FullQuote;
  lineItems: QuoteSelectedLineItem[];
  onChange: (items: QuoteSelectedLineItem[]) => void;
}

const CATEGORY_TABS: { id: CatalogueCategory | "all" | "selected"; label: string }[] = [
  { id: "all", label: "All Items" },
  { id: "selected", label: "Selected Only" },
  { id: "floorplan_extensions", label: "Floorplan Extensions" },
  { id: "structural", label: "Structural & Ceilings" },
  { id: "doors_windows", label: "Doors & Windows" },
  { id: "external", label: "External Finishes" },
  { id: "internal_kitchen", label: "Kitchen" },
  { id: "internal_bathroom", label: "Bathroom" },
  { id: "internal_bedrooms", label: "Bedrooms & Storage" },
  { id: "internal_laundry", label: "Laundry" },
  { id: "colour_upgrades", label: "Electrical, HVAC & Finishes" },
  { id: "site_earthworks", label: "Site & Engineering Reports" },
  { id: "council_statutory", label: "Council & Statutory" },
];

/**
 * Filter items by storey relevance so NHCs only see items applicable to the active house design.
 */
function isItemApplicableToStorey(item: QuoteSelectedLineItem, isDouble: boolean): boolean {
  const name = item.name.toLowerCase();
  const id = (item.catalogueItemId || item.id).toLowerCase();

  const isDsSpecific =
    name.includes("double storey") ||
    name.includes("first floor") ||
    name.includes("upper floor") ||
    name.includes("upper living") ||
    name.includes("scaffolding") ||
    name.includes("balcony") ||
    id.endsWith("_ds") ||
    id === "str_custom_ds_h2_gf" ||
    id === "str_custom_ds_h2_ff" ||
    id === "str_custom_ds_h3_gf" ||
    id === "str_custom_ds_h3_ff" ||
    id === "str_add_gf_ds" ||
    id === "str_add_ff_ds" ||
    id === "str_balcony_uncovered" ||
    id === "str_balcony_covered";

  const isSsSpecific =
    name.includes("single storey") ||
    id.endsWith("_ss") ||
    id === "str_custom_ss_h2" ||
    id === "str_custom_ss_h3" ||
    id === "str_add_gf_ss";

  if (isDouble) {
    return !isSsSpecific;
  } else {
    return !isDsSpecific;
  }
}

export function QuoteInclusionsStep({ quote, lineItems, onChange }: QuoteInclusionsStepProps) {
  const [activeTab, setActiveTab] = useState<CatalogueCategory | "all" | "selected">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);

  const isDouble =
    quote.design.mode === "custom_floorplan"
      ? quote.design.customSpec.storeys === "double"
      : quote.design.housingType === "Double Storey";

  const gfaM2 = calculateDesignGFA(quote.design);

  // New custom item draft
  const [customName, setCustomName] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [customCat, setCustomCat] = useState<CatalogueCategory>("structural");
  const [customUnit, setCustomUnit] = useState<UnitType>("fixed");
  const [customRate, setCustomRate] = useState<number | "">("");
  const [customQty, setCustomQty] = useState(1);

  const selectedCount = useMemo(
    () => lineItems.filter((i) => i.isIncluded).length,
    [lineItems],
  );

  const toggleItemIncluded = (id: string) => {
    onChange(
      lineItems.map((item) => {
        if (item.id === id) {
          const nextIncluded = !item.isIncluded;
          let nextQty = item.quantity;

          // Only auto-fill whole-slab items (e.g. 32mpa concrete slab) with Ground Floor Area footprint.
          // Selective area items like Raked Ceilings (family/dining/kitchen) must NEVER pre-fill with whole-house area!
          const nameLower = item.name.toLowerCase();
          const isSelectiveAreaItem =
            nameLower.includes("raked") ||
            nameLower.includes("ceiling") ||
            nameLower.includes("selected") ||
            nameLower.includes("custom") ||
            nameLower.includes("porch") ||
            nameLower.includes("alfresco") ||
            nameLower.includes("tiling") ||
            nameLower.includes("carpet");

          const isWholeSlabFootprintItem =
            item.unitType === "per_m2" &&
            (nameLower.includes("concrete") || nameLower.includes("slab") || nameLower.includes("termite")) &&
            !isSelectiveAreaItem;

          if (nextIncluded && isWholeSlabFootprintItem && item.quantity <= 1 && gfaM2 > 0) {
            nextQty = Math.round(gfaM2);
          } else if (nextIncluded && isSelectiveAreaItem) {
            // Keep at 1 or preserved manual entry so NHC enters specific room sqm (family/dining/kitchen)
            nextQty = item.quantity > 1 && item.quantity === Math.round(gfaM2) ? 1 : Math.max(1, item.quantity);
          }

          return {
            ...item,
            isIncluded: nextIncluded,
            clientSelected: nextIncluded,
            quantity: nextQty,
            subtotal: nextQty * item.unitRate,
          };
        }
        return item;
      }),
    );
  };

  const handleQtyChange = (id: string, qty: number) => {
    const validQty = Math.max(1, qty);
    onChange(
      lineItems.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: validQty,
              subtotal: validQty * item.unitRate,
            }
          : item,
      ),
    );
  };

  const handleRateChange = (id: string, rate: number) => {
    const validRate = Math.max(0, rate);
    onChange(
      lineItems.map((item) =>
        item.id === id
          ? {
              ...item,
              unitRate: validRate,
              subtotal: (item.quantity || 1) * validRate,
            }
          : item,
      ),
    );
  };

  const handleDeleteItem = (id: string) => {
    onChange(lineItems.filter((i) => i.id !== id));
  };

  const handleAddCustomItem = () => {
    if (!customName.trim()) return;

    const rate = Number(customRate) || 0;
    const qty = Number(customQty) || 1;

    const newItem: QuoteSelectedLineItem = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      category: customCat,
      name: customName.trim(),
      description: customDesc.trim() || "Custom client variation.",
      unitType: customUnit,
      unitRate: rate,
      quantity: qty,
      subtotal: rate * qty,
      isIncluded: true,
      isClientSelectable: true,
      clientSelected: true,
    };

    onChange([newItem, ...lineItems]);
    setCustomName("");
    setCustomDesc("");
    setCustomRate("");
    setCustomQty(1);
    setIsAddCustomOpen(false);
  };

  const filteredItems = useMemo(() => {
    return lineItems.filter((item) => {
      // Filter 1: Storey relevance (Single vs Double storey)
      if (!isItemApplicableToStorey(item, isDouble)) {
        return false;
      }

      // Filter 2: Tab category filter
      if (activeTab === "selected") {
        if (!item.isIncluded) return false;
      } else if (activeTab !== "all") {
        const itemCat = resolveItemCategory(item);
        if (itemCat !== activeTab) return false;
      }

      // Filter 3: Search text
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q))
      );
    });
  }, [lineItems, isDouble, activeTab, searchQuery]);

  const [activeDwellingTab, setActiveDwellingTab] = useState<"dwelling1" | "dwelling2">("dwelling1");
  const hasSecondDwelling = Boolean(quote.design.hasSecondDwelling && quote.design.secondDwelling?.enabled);
  const secondDwelling = quote.design.secondDwelling;

  const effectiveDesignM2 =
    quote.design.isModifiedFloorplan && quote.design.modifiedDesignM2
      ? quote.design.modifiedDesignM2
      : quote.design.designM2 || 200;

  const activeTargetName =
    activeDwellingTab === "dwelling2"
      ? secondDwelling?.designName || "2nd Dwelling / Granny Flat"
      : quote.design.designName || "Primary Dwelling";

  const activeTargetM2 =
    activeDwellingTab === "dwelling2"
      ? secondDwelling?.designM2 || 60
      : effectiveDesignM2;

  const activeTargetStoreys =
    activeDwellingTab === "dwelling2"
      ? secondDwelling?.housingType === "Double Storey"
      : isDouble;

  const activeTargetTier =
    activeDwellingTab === "dwelling2"
      ? secondDwelling?.specTier || "H1 Smart Inclusions"
      : quote.design.specTier;

  const isTargetH1 = activeTargetTier.includes("H1");
  const isTargetH2 = activeTargetTier.includes("H2");
  const isTargetH3 = activeTargetTier.includes("H3");

  const gfM2 =
    activeDwellingTab === "dwelling2"
      ? Math.round(activeTargetM2 * 0.55)
      : quote.design.standardAreas?.groundLivingM2 ||
        quote.design.modifiedAreas?.groundLivingM2 ||
        Math.round(effectiveDesignM2 * 0.55);

  const ffM2 =
    activeDwellingTab === "dwelling2"
      ? Math.round(activeTargetM2 * 0.45)
      : quote.design.standardAreas?.firstLivingM2 ||
        quote.design.modifiedAreas?.firstLivingM2 ||
        Math.round(effectiveDesignM2 * 0.45);

  const upsertPopularItem = (
    idSuffix: string,
    patch: {
      isIncluded: boolean;
      quantity?: number;
      unitRate?: number;
      name?: string;
      description?: string;
      category?: CatalogueCategory;
      unitType?: UnitType;
    },
  ) => {
    // Prefix ID with dwelling if 2nd dwelling is selected to maintain distinct line items
    const id = hasSecondDwelling ? `${idSuffix}_${activeDwellingTab}` : idSuffix;
    const dwellingPrefix = hasSecondDwelling
      ? `[${activeDwellingTab === "dwelling2" ? "Dwelling 2" : "Dwelling 1"}] `
      : "";

    const existing = lineItems.find((i) => i.id === id || i.catalogueItemId === id);
    if (existing) {
      onChange(
        lineItems.map((item) => {
          if (item.id === id || item.catalogueItemId === id) {
            const nextIncluded = patch.isIncluded;
            const nextQty = patch.quantity !== undefined ? patch.quantity : item.quantity;
            const nextRate = patch.unitRate !== undefined ? patch.unitRate : item.unitRate;
            return {
              ...item,
              isIncluded: nextIncluded,
              clientSelected: nextIncluded,
              quantity: nextQty,
              unitRate: nextRate,
              subtotal: nextQty * nextRate,
              dwellingId: activeDwellingTab,
              dwellingName: activeTargetName,
              ...(patch.name ? { name: `${dwellingPrefix}${patch.name}` } : {}),
              ...(patch.description ? { description: patch.description } : {}),
              ...(patch.category ? { category: patch.category } : {}),
            };
          }
          return item;
        }),
      );
    } else if (patch.isIncluded) {
      const newItem: QuoteSelectedLineItem = {
        id,
        catalogueItemId: id,
        category: patch.category || "structural",
        name: `${dwellingPrefix}${patch.name || idSuffix}`,
        description: patch.description || "",
        unitType: patch.unitType || "fixed",
        unitRate: patch.unitRate || 0,
        quantity: patch.quantity || 1,
        subtotal: (patch.quantity || 1) * (patch.unitRate || 0),
        isIncluded: true,
        isClientSelectable: true,
        clientSelected: true,
        dwellingId: activeDwellingTab,
        dwellingName: activeTargetName,
      };
      onChange([newItem, ...lineItems]);
    }
  };

  // Popular items lookups for current active dwelling
  const pfx = hasSecondDwelling ? `_${activeDwellingTab}` : "";
  const covenantItem = lineItems.find((i) => i.id === `pop_covenant_site${pfx}`);
  const ceiling2590H1Item = lineItems.find((i) => i.id === `pop_ceiling_2590_h1${pfx}`);
  const ceiling2740H1Item = lineItems.find((i) => i.id === `pop_ceiling_2740_h1${pfx}`);
  const ceiling2740H2Item = lineItems.find((i) => i.id === `pop_ceiling_2740_h2${pfx}`);
  const ceiling3000H2Item = lineItems.find((i) => i.id === `pop_ceiling_3000_h2${pfx}`);
  const ceilingGfDsItem = lineItems.find((i) => i.id === `pop_ceiling_gf_ds${pfx}`);
  const ceilingFfDsItem = lineItems.find((i) => i.id === `pop_ceiling_ff_ds${pfx}`);
  const laundryItem = lineItems.find((i) => i.id === `pop_laundry_fitout${pfx}`);
  const tilesItem = lineItems.find((i) => i.id === `pop_tiles_ftc${pfx}`);
  const door1020Item = lineItems.find((i) => i.id === `pop_door_1020${pfx}`);
  const door1200Item = lineItems.find((i) => i.id === `pop_door_1200${pfx}`);
  const rakedItem = lineItems.find((i) => i.id === `pop_raked_entertainment${pfx}`);
  const airtouchItem = lineItems.find((i) => i.id === `pop_airtouch_5${pfx}`);
  const spectrumItem = lineItems.find((i) => i.id === `pop_spectrum_colour${pfx}`);
  const stone40Item = lineItems.find((i) => i.id === `pop_stone_40mm${pfx}`);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <PackageCheck className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">
              Step 4: Variations &amp; Custom Upgrades Checklist
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Showing {filteredItems.length} applicable variations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsAddCustomOpen(true)}
            className="bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 text-xs gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Add Custom Variation
          </Button>
        </div>
      </div>

      {/* 2nd Dwelling Selection Switcher Banner */}
      {hasSecondDwelling && (
        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-cyan-400 flex-none" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">
                Multi-Dwelling Scoping Active
              </span>
              <p className="text-xs font-semibold text-slate-200">
                Apply variations and popular upgrades individually to each dwelling:
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveDwellingTab("dwelling1")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeDwellingTab === "dwelling1"
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Home className="h-3.5 w-3.5" />
              <span>Dwelling 1 ({quote.design.designName || "Main"} &bull; {effectiveDesignM2} m²)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveDwellingTab("dwelling2")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeDwellingTab === "dwelling2"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Dwelling 2 ({secondDwelling?.designName || "Granny Flat"} &bull; {secondDwelling?.designM2 || 60} m²)</span>
            </button>
          </div>
        </div>
      )}

      {/* POPULAR UPGRADES SECTION - COMPACT & CATEGORIZED */}
      <div className="bg-slate-950/90 p-4 rounded-2xl border border-amber-500/30 ring-1 ring-amber-500/10 shadow-lg space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Popular Upgrades &amp; Enhancements
            </h4>
            <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
              Target: {activeTargetName} ({activeTargetM2} m²)
            </span>
          </div>
          <span className="text-[10px] text-slate-400 hidden sm:inline">
            Click any upgrade tab to select / adjust
          </span>
        </div>

        <div className="space-y-3">
          {/* CATEGORY 1: COUNCIL & SITE */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" /> Council &amp; Site Allowances
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {/* Covenant & Unknown Site Allowance */}
              <div
                onClick={() => {
                  const cur = covenantItem?.isIncluded ? covenantItem.unitRate : 0;
                  const next = cur > 0 ? 0 : 2500;
                  upsertPopularItem("pop_covenant_site", {
                    isIncluded: next > 0,
                    quantity: 1,
                    unitRate: next,
                    name: "Allowance for Covenant & Unknown Site Requirements",
                    category: "council_statutory",
                    unitType: "fixed",
                  });
                }}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                  covenantItem?.isIncluded
                    ? "border-emerald-500 bg-emerald-950/25 ring-1 ring-emerald-500/40"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-xs text-white block truncate">Covenant &amp; Unknown Site</span>
                  <span className="text-[10px] text-slate-400 font-mono">+$2,500 steps</span>
                </div>

                <div
                  className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 flex-none"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      const cur = covenantItem?.unitRate || 2500;
                      const next = Math.max(0, cur - 2500);
                      upsertPopularItem("pop_covenant_site", {
                        isIncluded: next > 0,
                        quantity: 1,
                        unitRate: next,
                        name: "Allowance for Covenant & Unknown Site Requirements",
                        category: "council_statutory",
                        unitType: "fixed",
                      });
                    }}
                    className="p-1 rounded hover:bg-slate-800 text-slate-300"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className={`font-bold text-xs font-mono px-1 ${covenantItem?.isIncluded ? "text-emerald-400" : "text-slate-500"}`}>
                    {formatAud(covenantItem?.isIncluded ? covenantItem.subtotal : 0)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = covenantItem?.unitRate || 0;
                      const next = cur + 2500;
                      upsertPopularItem("pop_covenant_site", {
                        isIncluded: true,
                        quantity: 1,
                        unitRate: next,
                        name: "Allowance for Covenant & Unknown Site Requirements",
                        category: "council_statutory",
                        unitType: "fixed",
                      });
                    }}
                    className="p-1 rounded hover:bg-slate-800 text-slate-300"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* CATEGORY 2: STRUCTURAL & CEILINGS (INC +$3 JOINERY) */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Structural &amp; Ceilings (Inc. +$3 Joinery)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {/* Single Storey H1 Options */}
              {(!activeTargetStoreys && !isTargetH2 && !isTargetH3) || isTargetH1 ? (
                <>
                  {/* H1 2590mm ($51/m2 = $48 + $3 joinery) */}
                  <div
                    onClick={() => {
                      const next = !ceiling2590H1Item?.isIncluded;
                      upsertPopularItem("pop_ceiling_2590_h1", {
                        isIncluded: next,
                        quantity: activeTargetM2,
                        unitRate: 51,
                        name: "Upgrade to 2,590mm (8'6\") Ceiling Height (ilo 2,440mm)",
                        category: "structural",
                        unitType: "per_m2",
                      });
                    }}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                      ceiling2590H1Item?.isIncluded
                        ? "border-emerald-500 bg-emerald-950/25 ring-1 ring-emerald-500/40"
                        : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-xs text-white block truncate">Upgrade to 2,590mm Ceilings</span>
                      <span className="text-[10px] text-slate-400 font-mono">$51 per sqm (inc joinery)</span>
                    </div>
                    <span className="font-bold text-xs text-emerald-400 font-mono flex-none">
                      {ceiling2590H1Item?.isIncluded ? "✓ " : ""}+{formatAud(activeTargetM2 * 51)}
                    </span>
                  </div>

                  {/* H1 2740mm ($76/m2 = $73 + $3 joinery) */}
                  <div
                    onClick={() => {
                      const next = !ceiling2740H1Item?.isIncluded;
                      upsertPopularItem("pop_ceiling_2740_h1", {
                        isIncluded: next,
                        quantity: activeTargetM2,
                        unitRate: 76,
                        name: "Upgrade to 2,740mm (9'0\") Ceiling Height (ilo 2,440mm)",
                        category: "structural",
                        unitType: "per_m2",
                      });
                    }}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                      ceiling2740H1Item?.isIncluded
                        ? "border-emerald-500 bg-emerald-950/25 ring-1 ring-emerald-500/40"
                        : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-xs text-white block truncate">Upgrade to 2,740mm Ceilings</span>
                      <span className="text-[10px] text-slate-400 font-mono">$76 per sqm (inc joinery)</span>
                    </div>
                    <span className="font-bold text-xs text-emerald-400 font-mono flex-none">
                      {ceiling2740H1Item?.isIncluded ? "✓ " : ""}+{formatAud(activeTargetM2 * 76)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  {/* H2 2740mm ($58/m2 = $55 + $3 joinery) */}
                  <div
                    onClick={() => {
                      const next = !ceiling2740H2Item?.isIncluded;
                      upsertPopularItem("pop_ceiling_2740_h2", {
                        isIncluded: next,
                        quantity: activeTargetM2,
                        unitRate: 58,
                        name: "Upgrade to 2,740mm (9'0\") Ceiling Height (from 2,590mm)",
                        category: "structural",
                        unitType: "per_m2",
                      });
                    }}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                      ceiling2740H2Item?.isIncluded
                        ? "border-emerald-500 bg-emerald-950/25 ring-1 ring-emerald-500/40"
                        : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-xs text-white block truncate">Upgrade to 2,740mm Ceilings</span>
                      <span className="text-[10px] text-slate-400 font-mono">$58 per sqm (inc joinery)</span>
                    </div>
                    <span className="font-bold text-xs text-emerald-400 font-mono flex-none">
                      {ceiling2740H2Item?.isIncluded ? "✓ " : ""}+{formatAud(activeTargetM2 * 58)}
                    </span>
                  </div>

                  {/* H2 3000mm ($76/m2 = $73 + $3 joinery) */}
                  <div
                    onClick={() => {
                      const next = !ceiling3000H2Item?.isIncluded;
                      upsertPopularItem("pop_ceiling_3000_h2", {
                        isIncluded: next,
                        quantity: activeTargetM2,
                        unitRate: 76,
                        name: "Upgrade to 3,000mm (10'0\") Ceiling Height (from 2,590mm)",
                        category: "structural",
                        unitType: "per_m2",
                      });
                    }}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                      ceiling3000H2Item?.isIncluded
                        ? "border-emerald-500 bg-emerald-950/25 ring-1 ring-emerald-500/40"
                        : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-xs text-white block truncate">Upgrade to 3,000mm Ceilings</span>
                      <span className="text-[10px] text-slate-400 font-mono">$76 per sqm (inc joinery)</span>
                    </div>
                    <span className="font-bold text-xs text-emerald-400 font-mono flex-none">
                      {ceiling3000H2Item?.isIncluded ? "✓ " : ""}+{formatAud(activeTargetM2 * 76)}
                    </span>
                  </div>
                </>
              )}

              {/* Double Storey Specific Options */}
              {activeTargetStoreys && (
                <>
                  <div
                    onClick={() => {
                      const next = !ceilingGfDsItem?.isIncluded;
                      upsertPopularItem("pop_ceiling_gf_ds", {
                        isIncluded: next,
                        quantity: gfM2,
                        unitRate: 58,
                        name: "Ground Floor Ceiling Height Upgrade (to 2,740mm)",
                        category: "structural",
                        unitType: "per_m2",
                      });
                    }}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                      ceilingGfDsItem?.isIncluded
                        ? "border-emerald-500 bg-emerald-950/25 ring-1 ring-emerald-500/40"
                        : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-xs text-white block truncate">GF Ceiling (to 2,740mm)</span>
                      <span className="text-[10px] text-slate-400 font-mono">$58 per sqm &bull; {gfM2} m² GF</span>
                    </div>
                    <span className="font-bold text-xs text-emerald-400 font-mono flex-none">
                      {ceilingGfDsItem?.isIncluded ? "✓ " : ""}+{formatAud(gfM2 * 58)}
                    </span>
                  </div>

                  <div
                    onClick={() => {
                      const next = !ceilingFfDsItem?.isIncluded;
                      upsertPopularItem("pop_ceiling_ff_ds", {
                        isIncluded: next,
                        quantity: ffM2,
                        unitRate: 51,
                        name: "First Floor Ceiling Height Upgrade (to 2,590mm)",
                        category: "structural",
                        unitType: "per_m2",
                      });
                    }}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                      ceilingFfDsItem?.isIncluded
                        ? "border-emerald-500 bg-emerald-950/25 ring-1 ring-emerald-500/40"
                        : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-xs text-white block truncate">FF Ceiling (to 2,590mm)</span>
                      <span className="text-[10px] text-slate-400 font-mono">$51 per sqm &bull; {ffM2} m² FF</span>
                    </div>
                    <span className="font-bold text-xs text-emerald-400 font-mono flex-none">
                      {ceilingFfDsItem?.isIncluded ? "✓ " : ""}+{formatAud(ffM2 * 51)}
                    </span>
                  </div>
                </>
              )}

              {/* Raked Ceilings */}
              <div
                onClick={() => {
                  const next = !rakedItem?.isIncluded;
                  const sqm = rakedItem?.quantity || 35;
                  upsertPopularItem("pop_raked_entertainment", {
                    isIncluded: next,
                    quantity: sqm,
                    unitRate: 310,
                    name: "Raked / Cathedral Ceilings to Entertainment Space",
                    category: "structural",
                    unitType: "per_m2",
                  });
                }}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                  rakedItem?.isIncluded
                    ? "border-emerald-500 bg-emerald-950/25 ring-1 ring-emerald-500/40"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-xs text-white block truncate">Raked / Cathedral Ceiling</span>
                  <span className="text-[10px] text-slate-400 font-mono">$310 per sqm</span>
                </div>

                <div
                  className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 flex-none"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      const cur = rakedItem?.quantity || 35;
                      const next = Math.max(5, cur - 5);
                      upsertPopularItem("pop_raked_entertainment", {
                        isIncluded: true,
                        quantity: next,
                        unitRate: 310,
                        name: "Raked / Cathedral Ceilings to Entertainment Space",
                        category: "structural",
                        unitType: "per_m2",
                      });
                    }}
                    className="p-1 rounded hover:bg-slate-800 text-slate-300"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className={`font-bold text-xs font-mono px-1 ${rakedItem?.isIncluded ? "text-emerald-400" : "text-slate-500"}`}>
                    {formatAud((rakedItem?.quantity || 35) * 310)} ({rakedItem?.quantity || 35} sqm)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = rakedItem?.quantity || 35;
                      const next = cur + 5;
                      upsertPopularItem("pop_raked_entertainment", {
                        isIncluded: true,
                        quantity: next,
                        unitRate: 310,
                        name: "Raked / Cathedral Ceilings to Entertainment Space",
                        category: "structural",
                        unitType: "per_m2",
                      });
                    }}
                    className="p-1 rounded hover:bg-slate-800 text-slate-300"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* CATEGORY 3: DOORS & WINDOWS */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Doors &amp; Windows
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {/* 1020mm Entry Door */}
              <div
                onClick={() => {
                  const next = !door1020Item?.isIncluded;
                  upsertPopularItem("pop_door_1020", {
                    isIncluded: next,
                    quantity: 1,
                    unitRate: 800,
                    name: "Upgrade to 1020mm Wide Front Entry Door",
                    category: "doors_windows",
                    unitType: "fixed",
                  });
                  if (next && door1200Item?.isIncluded) {
                    upsertPopularItem("pop_door_1200", { isIncluded: false, unitRate: 1500 });
                  }
                }}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                  door1020Item?.isIncluded
                    ? "border-emerald-500 bg-emerald-950/25 ring-1 ring-emerald-500/40"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-xs text-white block truncate">1020mm Front Entry Door</span>
                  <span className="text-[10px] text-slate-400 font-mono">Wide entrance door</span>
                </div>
                <span className="font-bold text-xs text-emerald-400 font-mono flex-none">
                  {door1020Item?.isIncluded ? "✓ " : ""}+$800
                </span>
              </div>

              {/* 1200mm Entry Door */}
              <div
                onClick={() => {
                  const next = !door1200Item?.isIncluded;
                  upsertPopularItem("pop_door_1200", {
                    isIncluded: next,
                    quantity: 1,
                    unitRate: 1500,
                    name: "Upgrade to 1200mm Wide Front Entry Door",
                    category: "doors_windows",
                    unitType: "fixed",
                  });
                  if (next && door1020Item?.isIncluded) {
                    upsertPopularItem("pop_door_1020", { isIncluded: false, unitRate: 800 });
                  }
                }}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                  door1200Item?.isIncluded
                    ? "border-emerald-500 bg-emerald-950/25 ring-1 ring-emerald-500/40"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-xs text-white block truncate">1200mm Front Entry Door</span>
                  <span className="text-[10px] text-slate-400 font-mono">Statement pivot entrance</span>
                </div>
                <span className="font-bold text-xs text-emerald-400 font-mono flex-none">
                  {door1200Item?.isIncluded ? "✓ " : ""}+$1,500
                </span>
              </div>
            </div>
          </div>

          {/* CATEGORY 4: KITCHEN & LAUNDRY */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Kitchen &amp; Laundry
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {/* 40mm Stone Edge Upgrade ($245 / lm) */}
              <div
                onClick={() => {
                  const next = !stone40Item?.isIncluded;
                  const lm = stone40Item?.quantity || 6;
                  upsertPopularItem("pop_stone_40mm", {
                    isIncluded: next,
                    quantity: lm,
                    unitRate: 245,
                    name: "Upgrade Stone Benchtop Thickness to 40mm (ilo 20mm)",
                    category: "internal_kitchen",
                    unitType: "per_lm",
                  });
                }}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                  stone40Item?.isIncluded
                    ? "border-emerald-500 bg-emerald-950/25 ring-1 ring-emerald-500/40"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-xs text-white block truncate">40mm Stone Edge Upgrade</span>
                  <span className="text-[10px] text-slate-400 font-mono">$245 per lm</span>
                </div>

                <div
                  className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 flex-none"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      const cur = stone40Item?.quantity || 6;
                      const next = Math.max(1, cur - 1);
                      upsertPopularItem("pop_stone_40mm", {
                        isIncluded: true,
                        quantity: next,
                        unitRate: 245,
                        name: "Upgrade Stone Benchtop Thickness to 40mm (ilo 20mm)",
                        category: "internal_kitchen",
                        unitType: "per_lm",
                      });
                    }}
                    className="p-1 rounded hover:bg-slate-800 text-slate-300"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className={`font-bold text-xs font-mono px-1 ${stone40Item?.isIncluded ? "text-emerald-400" : "text-slate-500"}`}>
                    {formatAud((stone40Item?.quantity || 6) * 245)} ({stone40Item?.quantity || 6} lm)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = stone40Item?.quantity || 6;
                      const next = cur + 1;
                      upsertPopularItem("pop_stone_40mm", {
                        isIncluded: true,
                        quantity: next,
                        unitRate: 245,
                        name: "Upgrade Stone Benchtop Thickness to 40mm (ilo 20mm)",
                        category: "internal_kitchen",
                        unitType: "per_lm",
                      });
                    }}
                    className="p-1 rounded hover:bg-slate-800 text-slate-300"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Laundry Custom Fit-out */}
              <div
                onClick={() => {
                  const cur = laundryItem?.isIncluded ? laundryItem.unitRate : 0;
                  const next = cur > 0 ? 0 : 2500;
                  upsertPopularItem("pop_laundry_fitout", {
                    isIncluded: next > 0,
                    quantity: 1,
                    unitRate: next,
                    name: "Allowance for Laundry Fit-out (Benchtop & O'head Cabinetry)",
                    category: "internal_laundry",
                    unitType: "fixed",
                  });
                }}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                  laundryItem?.isIncluded
                    ? "border-emerald-500 bg-emerald-950/25 ring-1 ring-emerald-500/40"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-xs text-white block truncate">Laundry Custom Fit-out</span>
                  <span className="text-[10px] text-slate-400 font-mono">Benchtop &amp; overheads ($500 steps)</span>
                </div>

                <div
                  className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 flex-none"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      const cur = laundryItem?.unitRate || 2500;
                      const next = Math.max(0, cur - 500);
                      upsertPopularItem("pop_laundry_fitout", {
                        isIncluded: next > 0,
                        quantity: 1,
                        unitRate: next,
                        name: "Allowance for Laundry Fit-out (Benchtop & O'head Cabinetry)",
                        category: "internal_laundry",
                        unitType: "fixed",
                      });
                    }}
                    className="p-1 rounded hover:bg-slate-800 text-slate-300"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className={`font-bold text-xs font-mono px-1 ${laundryItem?.isIncluded ? "text-emerald-400" : "text-slate-500"}`}>
                    {formatAud(laundryItem?.isIncluded ? laundryItem.subtotal : 0)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = laundryItem?.unitRate || 2000;
                      const next = cur + 500;
                      upsertPopularItem("pop_laundry_fitout", {
                        isIncluded: true,
                        quantity: 1,
                        unitRate: next,
                        name: "Allowance for Laundry Fit-out (Benchtop & O'head Cabinetry)",
                        category: "internal_laundry",
                        unitType: "fixed",
                      });
                    }}
                    className="p-1 rounded hover:bg-slate-800 text-slate-300"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* CATEGORY 5: BATHROOM & ENSUITE */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Bathroom &amp; Ensuite
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {/* Floor to Ceiling Tiles ($3,000 / room) */}
              <div
                onClick={() => {
                  const curQty = tilesItem?.isIncluded ? tilesItem.quantity : 0;
                  const nextQty = curQty > 0 ? 0 : 1;
                  upsertPopularItem("pop_tiles_ftc", {
                    isIncluded: nextQty > 0,
                    quantity: nextQty,
                    unitRate: 3000,
                    name: "Allowance for Floor to Ceiling Tiles in Bathroom/Ensuite",
                    category: "internal_bathroom",
                    unitType: "custom_qty",
                  });
                }}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                  tilesItem?.isIncluded
                    ? "border-emerald-500 bg-emerald-950/25 ring-1 ring-emerald-500/40"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-xs text-white block truncate">Floor to Ceiling Tiles</span>
                  <span className="text-[10px] text-slate-400 font-mono">$3,000 per room</span>
                </div>

                <div
                  className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 flex-none"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      const cur = tilesItem?.quantity || 1;
                      const next = Math.max(0, cur - 1);
                      upsertPopularItem("pop_tiles_ftc", {
                        isIncluded: next > 0,
                        quantity: next,
                        unitRate: 3000,
                        name: "Allowance for Floor to Ceiling Tiles in Bathroom/Ensuite",
                        category: "internal_bathroom",
                        unitType: "custom_qty",
                      });
                    }}
                    className="p-1 rounded hover:bg-slate-800 text-slate-300"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className={`font-bold text-xs font-mono px-1 ${tilesItem?.isIncluded ? "text-emerald-400" : "text-slate-500"}`}>
                    {formatAud(tilesItem?.isIncluded ? tilesItem.subtotal : 0)} ({tilesItem?.quantity || 0} rooms)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = tilesItem?.quantity || 0;
                      const next = cur + 1;
                      upsertPopularItem("pop_tiles_ftc", {
                        isIncluded: true,
                        quantity: next,
                        unitRate: 3000,
                        name: "Allowance for Floor to Ceiling Tiles in Bathroom/Ensuite",
                        category: "internal_bathroom",
                        unitType: "custom_qty",
                      });
                    }}
                    className="p-1 rounded hover:bg-slate-800 text-slate-300"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* CATEGORY 6: ELECTRICAL & AIR-CONDITIONING */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> Electrical &amp; Air-Conditioning
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {/* Polyair AirTouch 5 Smart Wi-Fi Controller ($1,200) */}
              <div
                onClick={() => {
                  const next = !airtouchItem?.isIncluded;
                  upsertPopularItem("pop_airtouch_5", {
                    isIncluded: next,
                    quantity: 1,
                    unitRate: 1200,
                    name: "Polyair AirTouch 5 Smart Wi-Fi Controller",
                    category: "colour_upgrades",
                    unitType: "fixed",
                  });
                }}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                  airtouchItem?.isIncluded
                    ? "border-emerald-500 bg-emerald-950/25 ring-1 ring-emerald-500/40"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-xs text-white block truncate">AirTouch 5 Controller</span>
                  <span className="text-[10px] text-slate-400 font-mono">Smart Wi-Fi 8-zone tablet</span>
                </div>
                <span className="font-bold text-xs text-emerald-400 font-mono flex-none">
                  {airtouchItem?.isIncluded ? "✓ " : ""}+$1,200
                </span>
              </div>

              {/* Spectrum Colour Studio & Electrical Upgrades */}
              <div
                onClick={() => {
                  const cur = spectrumItem?.isIncluded ? spectrumItem.unitRate : 0;
                  const next = cur > 0 ? 0 : 2500;
                  upsertPopularItem("pop_spectrum_colour", {
                    isIncluded: next > 0,
                    quantity: 1,
                    unitRate: next,
                    name: "Allowance for Spectrum Colour Studio & Electrical Upgrades",
                    category: "colour_upgrades",
                    unitType: "fixed",
                  });
                }}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                  spectrumItem?.isIncluded
                    ? "border-emerald-500 bg-emerald-950/25 ring-1 ring-emerald-500/40"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-xs text-white block truncate">Spectrum Colour &amp; Electrical</span>
                  <span className="text-[10px] text-slate-400 font-mono">+$2,500 showroom steps</span>
                </div>

                <div
                  className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 flex-none"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => {
                      const cur = spectrumItem?.unitRate || 2500;
                      const next = Math.max(0, cur - 2500);
                      upsertPopularItem("pop_spectrum_colour", {
                        isIncluded: next > 0,
                        quantity: 1,
                        unitRate: next,
                        name: "Allowance for Spectrum Colour Studio & Electrical Upgrades",
                        category: "colour_upgrades",
                        unitType: "fixed",
                      });
                    }}
                    className="p-1 rounded hover:bg-slate-800 text-slate-300"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className={`font-bold text-xs font-mono px-1 ${spectrumItem?.isIncluded ? "text-emerald-400" : "text-slate-500"}`}>
                    {formatAud(spectrumItem?.isIncluded ? spectrumItem.subtotal : 0)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = spectrumItem?.unitRate || 0;
                      const next = cur + 2500;
                      upsertPopularItem("pop_spectrum_colour", {
                        isIncluded: true,
                        quantity: 1,
                        unitRate: next,
                        name: "Allowance for Spectrum Colour Studio & Electrical Upgrades",
                        category: "colour_upgrades",
                        unitType: "fixed",
                      });
                    }}
                    className="p-1 rounded hover:bg-slate-800 text-slate-300"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Tabs & Search Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? tab.id === "selected"
                    ? "bg-amber-400 text-slate-950 font-bold shadow-md"
                    : "bg-emerald-500 text-slate-950 font-bold shadow-md"
                  : tab.id === "selected"
                    ? "bg-amber-950/40 text-amber-300 border border-amber-800/60 hover:bg-amber-900/50"
                    : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {tab.label}
              {tab.id === "selected" && selectedCount > 0 && (
                <span className="bg-amber-500 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                  {selectedCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64 flex-none">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search variations…"
            className="h-8 pl-8 text-xs border-slate-800 bg-slate-950 text-slate-200"
          />
        </div>
      </div>

      {/* Line Items List */}
      <div className="space-y-2.5">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
            {activeTab === "selected"
              ? "No variations currently selected. Check any item from the categories above to add it to the estimate."
              : "No variation items match your search filter."}
          </div>
        ) : (
          filteredItems.map((item) => {
            const isPriced = item.unitRate > 0;
            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  item.isIncluded
                    ? "border-emerald-500/60 bg-slate-900/95 shadow-md ring-1 ring-emerald-500/20"
                    : "border-slate-800/80 bg-slate-950/60 opacity-85 hover:opacity-100 hover:border-slate-700"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={item.isIncluded}
                      onChange={() => toggleItemIncluded(item.id)}
                      className="mt-0.5 h-4 w-4 accent-emerald-500 rounded cursor-pointer flex-none"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-100">
                          {item.name}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {CATEGORY_LABELS[resolveItemCategory(item)] || item.category}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-900 text-emerald-400 border border-slate-800">
                          {item.unitType === "per_m2"
                            ? "per sqm"
                            : item.unitType === "per_lm"
                            ? "per lm"
                            : item.unitType.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Quantity & Unit Rate Editor */}
                  <div className="flex items-center gap-2.5 self-end sm:self-center flex-none">
                    {item.unitType !== "fixed" && (
                      <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-xs">
                        <span className="text-[10px] text-slate-500 uppercase font-mono">
                          {item.unitType === "per_m2" ? "Sqm:" : item.unitType === "per_lm" ? "Lm:" : "Qty:"}
                        </span>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity || 1}
                          onChange={(e) => handleQtyChange(item.id, Number(e.target.value))}
                          className="w-12 bg-transparent text-right font-mono font-bold text-slate-100 outline-none"
                        />
                      </div>
                    )}

                    <div className="w-28">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono">
                          $
                        </span>
                        <Input
                          type="number"
                          value={item.unitRate || ""}
                          onChange={(e) => handleRateChange(item.id, Number(e.target.value))}
                          placeholder="0"
                          className="h-8 pl-6 text-xs text-right border-slate-800 bg-slate-950 text-emerald-400 font-bold font-mono"
                        />
                      </div>
                    </div>

                    <div className="w-24 text-right">
                      <span className="text-xs font-bold font-mono text-emerald-400">
                        {item.isIncluded ? formatAud(item.quantity * item.unitRate) : "$0"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded transition-colors"
                      title="Remove variation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Custom Variation Dialog */}
      <Dialog open={isAddCustomOpen} onOpenChange={setIsAddCustomOpen}>
        <DialogContent className="max-w-md border-slate-800 bg-slate-950/95 text-slate-100 backdrop-blur-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-white font-bold tracking-wide flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-400" />
              Add Custom Variation
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Item Name</Label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. 2,340mm Cavity Sliding Door to Ensuite"
                className="h-9 text-xs border-slate-800 bg-slate-900 text-slate-100"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Description / Specifications</Label>
              <Input
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
                placeholder="Brief client-friendly specification note"
                className="h-9 text-xs border-slate-800 bg-slate-900 text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Category</Label>
                <Select
                  value={customCat}
                  onValueChange={(v: any) => setCustomCat(v)}
                >
                  <SelectTrigger className="h-9 border-slate-800 bg-slate-900 text-xs text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                    <SelectItem value="structural">Structural</SelectItem>
                    <SelectItem value="doors_windows">Doors &amp; Windows</SelectItem>
                    <SelectItem value="external">External</SelectItem>
                    <SelectItem value="internal_kitchen">Internal - Kitchen</SelectItem>
                    <SelectItem value="internal_bathroom">Internal - Bathroom</SelectItem>
                    <SelectItem value="internal_bedrooms">Internal - Bedrooms</SelectItem>
                    <SelectItem value="internal_laundry">Internal - Laundry</SelectItem>
                    <SelectItem value="colour_upgrades">Colour Upgrades</SelectItem>
                    <SelectItem value="site_earthworks">Site &amp; Earthworks</SelectItem>
                    <SelectItem value="council_statutory">Council &amp; Statutory</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Unit Type</Label>
                <Select
                  value={customUnit}
                  onValueChange={(v: any) => setCustomUnit(v)}
                >
                  <SelectTrigger className="h-9 border-slate-800 bg-slate-900 text-xs text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                    <SelectItem value="fixed">Fixed Price ($)</SelectItem>
                    <SelectItem value="per_lm">Per LM ($/lm)</SelectItem>
                    <SelectItem value="per_m2">Per m² ($/m²)</SelectItem>
                    <SelectItem value="custom_qty">Custom Qty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={customQty}
                  onChange={(e) => setCustomQty(Number(e.target.value))}
                  className="h-9 text-xs border-slate-800 bg-slate-900 text-slate-100 font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Unit Rate ($)</Label>
                <Input
                  type="number"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0"
                  className="h-9 text-xs border-slate-800 bg-slate-900 text-emerald-400 font-bold font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddCustomOpen(false)}
                className="border-slate-800 bg-slate-900 text-slate-300 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddCustomItem}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
              >
                Add Line Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
