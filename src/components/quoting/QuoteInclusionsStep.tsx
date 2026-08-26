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

  const effectiveDesignM2 =
    quote.design.isModifiedFloorplan && quote.design.modifiedDesignM2
      ? quote.design.modifiedDesignM2
      : quote.design.designM2 || 200;

  const isH1 = quote.design.specTier.includes("H1");
  const isH2 = quote.design.specTier.includes("H2");
  const isH3 = quote.design.specTier.includes("H3");

  const gfM2 =
    quote.design.standardAreas?.groundLivingM2 ||
    quote.design.modifiedAreas?.groundLivingM2 ||
    Math.round(effectiveDesignM2 * 0.55);

  const ffM2 =
    quote.design.standardAreas?.firstLivingM2 ||
    quote.design.modifiedAreas?.firstLivingM2 ||
    Math.round(effectiveDesignM2 * 0.45);

  const upsertPopularItem = (
    id: string,
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
              ...(patch.name ? { name: patch.name } : {}),
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
        name: patch.name || id,
        description: patch.description || "",
        unitType: patch.unitType || "fixed",
        unitRate: patch.unitRate || 0,
        quantity: patch.quantity || 1,
        subtotal: (patch.quantity || 1) * (patch.unitRate || 0),
        isIncluded: true,
        isClientSelectable: true,
        clientSelected: true,
      };
      onChange([newItem, ...lineItems]);
    }
  };

  // Popular items lookups
  const covenantItem = lineItems.find((i) => i.id === "pop_covenant_site");
  const ceiling2590H1Item = lineItems.find((i) => i.id === "pop_ceiling_2590_h1");
  const ceiling2740H1Item = lineItems.find((i) => i.id === "pop_ceiling_2740_h1");
  const ceiling2740H2Item = lineItems.find((i) => i.id === "pop_ceiling_2740_h2");
  const ceiling3000H2Item = lineItems.find((i) => i.id === "pop_ceiling_3000_h2");
  const ceilingGfDsItem = lineItems.find((i) => i.id === "pop_ceiling_gf_ds");
  const ceilingFfDsItem = lineItems.find((i) => i.id === "pop_ceiling_ff_ds");
  const laundryItem = lineItems.find((i) => i.id === "pop_laundry_fitout");
  const tilesItem = lineItems.find((i) => i.id === "pop_tiles_ftc");
  const door1020Item = lineItems.find((i) => i.id === "pop_door_1020");
  const door1200Item = lineItems.find((i) => i.id === "pop_door_1200");
  const rakedItem = lineItems.find((i) => i.id === "pop_raked_entertainment");
  const airtouchItem = lineItems.find((i) => i.id === "pop_airtouch_5");
  const spectrumItem = lineItems.find((i) => i.id === "pop_spectrum_colour");
  const stone40Item = lineItems.find((i) => i.id === "pop_stone_40mm");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <PackageCheck className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">
              Step 4: Variations &amp; Custom Upgrades Checklist
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Tailored for <strong className="text-slate-200">{quote.design.housingType}</strong> ({quote.design.designName}). Showing {filteredItems.length} applicable variations.
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

      {/* POPULAR UPGRADES SECTION */}
      <div className="bg-slate-950/80 p-5 rounded-2xl border border-amber-500/30 ring-1 ring-amber-500/10 shadow-lg space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-white">
              Popular Upgrades &amp; Enhancements
            </h4>
            <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
              Automated Dynamic Pricing
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Click any upgrade tab to instantly add to estimate
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* 1. Allowance for Covenant & Unknown Site Requirements */}
          <div
            onClick={() => {
              const cur = covenantItem?.isIncluded ? covenantItem.unitRate : 0;
              const next = cur > 0 ? 0 : 2500;
              upsertPopularItem("pop_covenant_site", {
                isIncluded: next > 0,
                quantity: 1,
                unitRate: next,
                name: "Allowance for Covenant & Unknown Site Requirements",
                description: "Provisional contingency allowance for estate developer design covenant compliance and unforeseen site conditions ($2,500 increments).",
                category: "council_statutory",
                unitType: "fixed",
              });
            }}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
              covenantItem?.isIncluded
                ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/40 shadow-sm"
                : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white">Covenant &amp; Unknown Site Allowance</span>
                {covenantItem?.isIncluded ? (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                    ✓
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500">Optional</span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Developer design covenants &amp; unknown site conditions ($2,500 increments).
              </p>
            </div>

            <div
              className="flex items-center justify-between gap-1.5 pt-2 mt-2 border-t border-slate-800"
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
                    description: "Provisional contingency allowance for estate developer design covenant compliance and unforeseen site conditions ($2,500 increments).",
                    category: "council_statutory",
                    unitType: "fixed",
                  });
                }}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className={`font-bold text-xs font-mono ${covenantItem?.isIncluded ? "text-emerald-400" : "text-slate-400"}`}>
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
                    description: "Provisional contingency allowance for estate developer design covenant compliance and unforeseen site conditions ($2,500 increments).",
                    category: "council_statutory",
                    unitType: "fixed",
                  });
                }}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* 2. Ceiling Height Upgrade 1 (H1: 2590mm / H2: 2740mm) */}
          {(!isDouble && !isH2 && !isH3) || isH1 ? (
            <div
              onClick={() => {
                const next = !ceiling2590H1Item?.isIncluded;
                upsertPopularItem("pop_ceiling_2590_h1", {
                  isIncluded: next,
                  quantity: effectiveDesignM2,
                  unitRate: 48,
                  name: "Upgrade to 2,590mm (8'6\") Ceiling Height (ilo 2,440mm)",
                  description: `Full house ceiling framing increase to 2,590mm ($48/m² × ${effectiveDesignM2} m² total area).`,
                  category: "structural",
                  unitType: "per_m2",
                });
              }}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                ceiling2590H1Item?.isIncluded
                  ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/40 shadow-sm"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">Upgrade to 2,590mm Ceilings</span>
                  {ceiling2590H1Item?.isIncluded ? (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                      ✓ Selected
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono">$48/m²</span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  2,590mm (8&apos;6&quot;) wall height framing ($48 × {effectiveDesignM2} m²).
                </p>
              </div>
              <span className="font-bold text-xs text-emerald-400 font-mono mt-2 block text-right">
                +{formatAud(effectiveDesignM2 * 48)}
              </span>
            </div>
          ) : (
            <div
              onClick={() => {
                const next = !ceiling2740H2Item?.isIncluded;
                upsertPopularItem("pop_ceiling_2740_h2", {
                  isIncluded: next,
                  quantity: effectiveDesignM2,
                  unitRate: 55,
                  name: "Upgrade to 2,740mm (9'0\") Ceiling Height (from 2,590mm)",
                  description: `Height increase to 2,740mm framing ($55/m² × ${effectiveDesignM2} m² total area).`,
                  category: "structural",
                  unitType: "per_m2",
                });
              }}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                ceiling2740H2Item?.isIncluded
                  ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/40 shadow-sm"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">Upgrade to 2,740mm Ceilings</span>
                  {ceiling2740H2Item?.isIncluded ? (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                      ✓ Selected
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono">$55/m²</span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  2,740mm (9&apos;0&quot;) luxury wall framing ($55 × {effectiveDesignM2} m²).
                </p>
              </div>
              <span className="font-bold text-xs text-emerald-400 font-mono mt-2 block text-right">
                +{formatAud(effectiveDesignM2 * 55)}
              </span>
            </div>
          )}

          {/* 3. Ceiling Height Upgrade 2 (H1: 2740mm / H2: 3000mm) */}
          {(!isDouble && !isH2 && !isH3) || isH1 ? (
            <div
              onClick={() => {
                const next = !ceiling2740H1Item?.isIncluded;
                upsertPopularItem("pop_ceiling_2740_h1", {
                  isIncluded: next,
                  quantity: effectiveDesignM2,
                  unitRate: 73,
                  name: "Upgrade to 2,740mm (9'0\") Ceiling Height (ilo 2,440mm)",
                  description: `Full height increase to 2,740mm framing ($73/m² × ${effectiveDesignM2} m² total area).`,
                  category: "structural",
                  unitType: "per_m2",
                });
              }}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                ceiling2740H1Item?.isIncluded
                  ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/40 shadow-sm"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">Upgrade to 2,740mm Ceilings</span>
                  {ceiling2740H1Item?.isIncluded ? (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                      ✓ Selected
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono">$73/m²</span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  2,740mm (9&apos;0&quot;) ceiling framing from standard 2,440mm ($73 × {effectiveDesignM2} m²).
                </p>
              </div>
              <span className="font-bold text-xs text-emerald-400 font-mono mt-2 block text-right">
                +{formatAud(effectiveDesignM2 * 73)}
              </span>
            </div>
          ) : (
            <div
              onClick={() => {
                const next = !ceiling3000H2Item?.isIncluded;
                upsertPopularItem("pop_ceiling_3000_h2", {
                  isIncluded: next,
                  quantity: effectiveDesignM2,
                  unitRate: 73,
                  name: "Upgrade to 3,000mm (10'0\") Ceiling Height (from 2,590mm)",
                  description: `Luxury 3,000mm ceiling framing upgrade ($73/m² × ${effectiveDesignM2} m² total area).`,
                  category: "structural",
                  unitType: "per_m2",
                });
              }}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                ceiling3000H2Item?.isIncluded
                  ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/40 shadow-sm"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">Upgrade to 3,000mm Ceilings</span>
                  {ceiling3000H2Item?.isIncluded ? (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                      ✓ Selected
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono">$73/m²</span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  10&apos;0&quot; ceiling framing throughout living ($73 × {effectiveDesignM2} m²).
                </p>
              </div>
              <span className="font-bold text-xs text-emerald-400 font-mono mt-2 block text-right">
                +{formatAud(effectiveDesignM2 * 73)}
              </span>
            </div>
          )}

          {/* Double Storey Specific Ceiling Options */}
          {isDouble && (
            <>
              <div
                onClick={() => {
                  const next = !ceilingGfDsItem?.isIncluded;
                  upsertPopularItem("pop_ceiling_gf_ds", {
                    isIncluded: next,
                    quantity: gfM2,
                    unitRate: 55,
                    name: "Ground Floor Ceiling Height Upgrade (to 2,740mm)",
                    description: `Ground floor ceiling height upgrade to 2,740mm ($55/m² × ${gfM2} m² ground area).`,
                    category: "structural",
                    unitType: "per_m2",
                  });
                }}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  ceilingGfDsItem?.isIncluded
                    ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/40 shadow-sm"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">Ground Floor Ceiling Upgrade</span>
                    {ceilingGfDsItem?.isIncluded ? (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                        ✓ Selected
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono">$55/m²</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Ground floor framing to 2,740mm ($55 × {gfM2} m² GF).
                  </p>
                </div>
                <span className="font-bold text-xs text-emerald-400 font-mono mt-2 block text-right">
                  +{formatAud(gfM2 * 55)}
                </span>
              </div>

              <div
                onClick={() => {
                  const next = !ceilingFfDsItem?.isIncluded;
                  upsertPopularItem("pop_ceiling_ff_ds", {
                    isIncluded: next,
                    quantity: ffM2,
                    unitRate: 48,
                    name: "First Floor Ceiling Height Upgrade (to 2,590mm)",
                    description: `First floor ceiling height upgrade to 2,590mm ($48/m² × ${ffM2} m² upper area).`,
                    category: "structural",
                    unitType: "per_m2",
                  });
                }}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  ceilingFfDsItem?.isIncluded
                    ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/40 shadow-sm"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">First Floor Ceiling Upgrade</span>
                    {ceilingFfDsItem?.isIncluded ? (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                        ✓ Selected
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-mono">$48/m²</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Upper floor framing to 2,590mm ($48 × {ffM2} m² FF).
                  </p>
                </div>
                <span className="font-bold text-xs text-emerald-400 font-mono mt-2 block text-right">
                  +{formatAud(ffM2 * 48)}
                </span>
              </div>
            </>
          )}

          {/* 4. Allowance for Laundry Fit-out */}
          <div
            onClick={() => {
              const cur = laundryItem?.isIncluded ? laundryItem.unitRate : 0;
              const next = cur > 0 ? 0 : 2500;
              upsertPopularItem("pop_laundry_fitout", {
                isIncluded: next > 0,
                quantity: 1,
                unitRate: next,
                name: "Allowance for Laundry Fit-out (Benchtop & O'head Cabinetry)",
                description: "Wall-to-wall benchtop with drop-in tub and overhead cupboards ($2,500 base with $500 increments).",
                category: "internal_laundry",
                unitType: "fixed",
              });
            }}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
              laundryItem?.isIncluded
                ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/40 shadow-sm"
                : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white">Laundry Custom Fit-out Allowance</span>
                {laundryItem?.isIncluded ? (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                    ✓
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500">Optional</span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Wall-to-wall benchtop &amp; overhead cabinetry ($2,500 base, $500 steps).
              </p>
            </div>

            <div
              className="flex items-center justify-between gap-1.5 pt-2 mt-2 border-t border-slate-800"
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
                    description: "Wall-to-wall benchtop with drop-in tub and overhead cupboards ($2,500 base with $500 increments).",
                    category: "internal_laundry",
                    unitType: "fixed",
                  });
                }}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className={`font-bold text-xs font-mono ${laundryItem?.isIncluded ? "text-emerald-400" : "text-slate-400"}`}>
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
                    description: "Wall-to-wall benchtop with drop-in tub and overhead cupboards ($2,500 base with $500 increments).",
                    category: "internal_laundry",
                    unitType: "fixed",
                  });
                }}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* 5. Floor to Ceiling Tiles in Bathroom/Ensuite ($3,000 ea) */}
          <div
            onClick={() => {
              const curQty = tilesItem?.isIncluded ? tilesItem.quantity : 0;
              const nextQty = curQty > 0 ? 0 : 1;
              upsertPopularItem("pop_tiles_ftc", {
                isIncluded: nextQty > 0,
                quantity: nextQty,
                unitRate: 3000,
                name: "Allowance for Floor to Ceiling Tiles in Bathroom/Ensuite",
                description: "Full height floor-to-ceiling tiling package ($3,000 per bathroom/ensuite room).",
                category: "internal_bathroom",
                unitType: "custom_qty",
              });
            }}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
              tilesItem?.isIncluded
                ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/40 shadow-sm"
                : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white">Floor to Ceiling Tiles Allowance</span>
                {tilesItem?.isIncluded ? (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                    ✓ {tilesItem.quantity} {tilesItem.quantity > 1 ? "Rooms" : "Room"}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-mono">$3,000 ea</span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Full height wall tiling to Bathroom &amp; Ensuite ($3,000 per room).
              </p>
            </div>

            <div
              className="flex items-center justify-between gap-1.5 pt-2 mt-2 border-t border-slate-800"
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
                    description: "Full height floor-to-ceiling tiling package ($3,000 per bathroom/ensuite room).",
                    category: "internal_bathroom",
                    unitType: "custom_qty",
                  });
                }}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className={`font-bold text-xs font-mono ${tilesItem?.isIncluded ? "text-emerald-400" : "text-slate-400"}`}>
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
                    description: "Full height floor-to-ceiling tiling package ($3,000 per bathroom/ensuite room).",
                    category: "internal_bathroom",
                    unitType: "custom_qty",
                  });
                }}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* 6. Front Entry Door Upgrades (1020mm $800 / 1200mm $1,500) */}
          <div
            onClick={() => {
              const next = !door1020Item?.isIncluded;
              upsertPopularItem("pop_door_1020", {
                isIncluded: next,
                quantity: 1,
                unitRate: 800,
                name: "Upgrade to 1020mm Wide Front Entry Door",
                description: "Corinthian/Hume 1020mm wide painted front entry door with clear glazing and heavy-duty pivot/hinges.",
                category: "doors_windows",
                unitType: "fixed",
              });
              if (next && door1200Item?.isIncluded) {
                upsertPopularItem("pop_door_1200", { isIncluded: false, unitRate: 1500 });
              }
            }}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
              door1020Item?.isIncluded
                ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/40 shadow-sm"
                : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white">Upgrade to 1020mm Entry Door</span>
                {door1020Item?.isIncluded ? (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                    ✓ Selected
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-mono">$800</span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Wide 1020mm architectural front entrance door.
              </p>
            </div>
            <span className="font-bold text-xs text-emerald-400 font-mono mt-2 block text-right">
              +$800
            </span>
          </div>

          <div
            onClick={() => {
              const next = !door1200Item?.isIncluded;
              upsertPopularItem("pop_door_1200", {
                isIncluded: next,
                quantity: 1,
                unitRate: 1500,
                name: "Upgrade to 1200mm Wide Front Entry Door",
                description: "Statement 1200mm wide front entry door with architectural pull handle and upgraded lockset.",
                category: "doors_windows",
                unitType: "fixed",
              });
              if (next && door1020Item?.isIncluded) {
                upsertPopularItem("pop_door_1020", { isIncluded: false, unitRate: 800 });
              }
            }}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
              door1200Item?.isIncluded
                ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/40 shadow-sm"
                : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white">Upgrade to 1200mm Entry Door</span>
                {door1200Item?.isIncluded ? (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                    ✓ Selected
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-mono">$1,500</span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Grand 1200mm wide statement front entry door.
              </p>
            </div>
            <span className="font-bold text-xs text-emerald-400 font-mono mt-2 block text-right">
              +$1,500
            </span>
          </div>

          {/* 7. Raked / Cathedral Ceilings to Entertainment Space */}
          <div
            onClick={() => {
              const next = !rakedItem?.isIncluded;
              const sqm = rakedItem?.quantity || 35;
              upsertPopularItem("pop_raked_entertainment", {
                isIncluded: next,
                quantity: sqm,
                unitRate: 310,
                name: "Raked / Cathedral Ceilings to Entertainment Space",
                description: `Architectural vaulted raked ceiling with scissor trusses to main living space ($310/m² × ${sqm} m²).`,
                category: "structural",
                unitType: "per_m2",
              });
            }}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
              rakedItem?.isIncluded
                ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/40 shadow-sm"
                : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white">Raked / Cathedral Living Ceiling</span>
                {rakedItem?.isIncluded ? (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                    ✓ {rakedItem.quantity} m²
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-mono">$310/m²</span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Vaulted scissor trusses over family/dining ($310 × {rakedItem?.quantity || 35} m²).
              </p>
            </div>

            <div
              className="flex items-center justify-between gap-1.5 pt-2 mt-2 border-t border-slate-800"
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
                    description: `Architectural vaulted raked ceiling with scissor trusses to main living space ($310/m² × ${next} m²).`,
                    category: "structural",
                    unitType: "per_m2",
                  });
                }}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className={`font-bold text-xs font-mono ${rakedItem?.isIncluded ? "text-emerald-400" : "text-slate-400"}`}>
                {formatAud((rakedItem?.quantity || 35) * 310)} ({rakedItem?.quantity || 35} m²)
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
                    description: `Architectural vaulted raked ceiling with scissor trusses to main living space ($310/m² × ${next} m²).`,
                    category: "structural",
                    unitType: "per_m2",
                  });
                }}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* 8. Polyair AirTouch 5 Smart Wi-Fi Controller ($1,200) */}
          <div
            onClick={() => {
              const next = !airtouchItem?.isIncluded;
              upsertPopularItem("pop_airtouch_5", {
                isIncluded: next,
                quantity: 1,
                unitRate: 1200,
                name: "Polyair AirTouch 5 Smart Wi-Fi Controller",
                description: "Smart touchscreen 8-zone air conditioning management system with individual room temperature sensors and mobile app control.",
                category: "colour_upgrades",
                unitType: "fixed",
              });
            }}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
              airtouchItem?.isIncluded
                ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/40 shadow-sm"
                : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white">Polyair AirTouch 5 Controller</span>
                {airtouchItem?.isIncluded ? (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                    ✓ Selected
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-mono">$1,200</span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Smart Wi-Fi zone temperature touchscreen tablet.
              </p>
            </div>
            <span className="font-bold text-xs text-emerald-400 font-mono mt-2 block text-right">
              +$1,200
            </span>
          </div>

          {/* 9. Spectrum Colour Studio & Electrical Upgrades */}
          <div
            onClick={() => {
              const cur = spectrumItem?.isIncluded ? spectrumItem.unitRate : 0;
              const next = cur > 0 ? 0 : 2500;
              upsertPopularItem("pop_spectrum_colour", {
                isIncluded: next > 0,
                quantity: 1,
                unitRate: next,
                name: "Allowance for Spectrum Colour Studio & Electrical Upgrades",
                description: "Provisional showroom allowance for feature downlights, ceiling fans, switches, and premium internal finishes ($2,500 increments).",
                category: "colour_upgrades",
                unitType: "fixed",
              });
            }}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
              spectrumItem?.isIncluded
                ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/40 shadow-sm"
                : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white">Spectrum Colour &amp; Electrical</span>
                {spectrumItem?.isIncluded ? (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                    ✓
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500">Optional</span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Showroom electrical, lighting &amp; colour upgrades ($2,500 increments).
              </p>
            </div>

            <div
              className="flex items-center justify-between gap-1.5 pt-2 mt-2 border-t border-slate-800"
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
                    description: "Provisional showroom allowance for feature downlights, ceiling fans, switches, and premium internal finishes ($2,500 increments).",
                    category: "colour_upgrades",
                    unitType: "fixed",
                  });
                }}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className={`font-bold text-xs font-mono ${spectrumItem?.isIncluded ? "text-emerald-400" : "text-slate-400"}`}>
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
                    description: "Provisional showroom allowance for feature downlights, ceiling fans, switches, and premium internal finishes ($2,500 increments).",
                    category: "colour_upgrades",
                    unitType: "fixed",
                  });
                }}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* 10. Upgrade Stone Benchtop Thickness to 40mm ($245 / lm) */}
          <div
            onClick={() => {
              const next = !stone40Item?.isIncluded;
              const lm = stone40Item?.quantity || 6;
              upsertPopularItem("pop_stone_40mm", {
                isIncluded: next,
                quantity: lm,
                unitRate: 245,
                name: "Upgrade Stone Benchtop Thickness to 40mm (ilo 20mm)",
                description: `40mm mitred edge profile 20mm engineered stone to kitchen island and cooktop benches ($245/lm × ${lm} lm).`,
                category: "internal_kitchen",
                unitType: "per_lm",
              });
            }}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
              stone40Item?.isIncluded
                ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/40 shadow-sm"
                : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white">40mm Stone Edge Upgrade</span>
                {stone40Item?.isIncluded ? (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                    ✓ {stone40Item.quantity} lm
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-mono">$245 / lm</span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                40mm mitred edge stone to kitchen island ($245 × {stone40Item?.quantity || 6} lm).
              </p>
            </div>

            <div
              className="flex items-center justify-between gap-1.5 pt-2 mt-2 border-t border-slate-800"
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
                    description: `40mm mitred edge profile 20mm engineered stone to kitchen island and cooktop benches ($245/lm × ${next} lm).`,
                    category: "internal_kitchen",
                    unitType: "per_lm",
                  });
                }}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className={`font-bold text-xs font-mono ${stone40Item?.isIncluded ? "text-emerald-400" : "text-slate-400"}`}>
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
                    description: `40mm mitred edge profile 20mm engineered stone to kitchen island and cooktop benches ($245/lm × ${next} lm).`,
                    category: "internal_kitchen",
                    unitType: "per_lm",
                  });
                }}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <Plus className="h-3 w-3" />
              </button>
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
                          {item.unitType.replace(/_/g, " ")}
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
                          Qty:
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
