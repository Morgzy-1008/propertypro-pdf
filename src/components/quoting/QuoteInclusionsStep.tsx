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
  { id: "ceiling_heights", label: "Ceiling Heights" },
  { id: "structural", label: "Structural" },
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
