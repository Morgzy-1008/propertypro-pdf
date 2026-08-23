import React, { useState } from "react";
import {
  PackageCheck,
  Plus,
  Trash2,
  DollarSign,
  Layers,
  Search,
  CheckCircle2,
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
import type {
  CatalogueCategory,
  QuoteSelectedLineItem,
  UnitType,
} from "@/lib/quoting/quoteTypes";

interface QuoteInclusionsStepProps {
  lineItems: QuoteSelectedLineItem[];
  onChange: (items: QuoteSelectedLineItem[]) => void;
}

const CATEGORY_TABS: { id: CatalogueCategory | "all"; label: string }[] = [
  { id: "all", label: "All Items" },
  { id: "structural", label: "Structural" },
  { id: "doors_windows", label: "Doors & Windows" },
  { id: "external", label: "Floorplan & External" },
  { id: "internal_kitchen", label: "Kitchen" },
  { id: "internal_bathroom", label: "Bathroom" },
  { id: "internal_bedrooms", label: "Bedrooms & Storage" },
  { id: "internal_laundry", label: "Laundry" },
  { id: "colour_upgrades", label: "Electrical, HVAC & Finishes" },
  { id: "site_earthworks", label: "Site & Engineering Reports" },
  { id: "council_statutory", label: "Council & Statutory" },
];

export function QuoteInclusionsStep({ lineItems, onChange }: QuoteInclusionsStepProps) {
  const [activeTab, setActiveTab] = useState<CatalogueCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);

  // New custom item draft
  const [customName, setCustomName] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [customCat, setCustomCat] = useState<CatalogueCategory>("structural");
  const [customUnit, setCustomUnit] = useState<UnitType>("fixed");
  const [customRate, setCustomRate] = useState<number | "">("");
  const [customQty, setCustomQty] = useState(1);

  const toggleItemIncluded = (id: string) => {
    onChange(
      lineItems.map((item) =>
        item.id === id
          ? {
              ...item,
              isIncluded: !item.isIncluded,
              clientSelected: !item.isIncluded,
            }
          : item,
      ),
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
              isIncluded: validRate > 0,
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

  const filteredItems = lineItems.filter((item) => {
    const matchesTab = activeTab === "all" || item.category === activeTab;
    const matchesSearch =
      searchQuery === "" ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

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
            Add or price floorplan variations across structural, kitchen, bathrooms, bedrooms, and finishes.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setIsAddCustomOpen(true)}
          className="bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 text-xs gap-1.5 self-start"
        >
          <Plus className="h-3.5 w-3.5" /> Add Custom Variation
        </Button>
      </div>

      {/* Category Tabs & Search Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-md"
                  : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
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
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
            No variation items found in this section. Click &ldquo;Add Custom Variation&rdquo; above to add a line item.
          </div>
        ) : (
          filteredItems.map((item) => {
            const isPriced = item.unitRate > 0;
            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-all ${
                  item.isIncluded && isPriced
                    ? "border-slate-700 bg-slate-900/90 shadow-sm"
                    : "border-slate-800/80 bg-slate-950/50 opacity-80 hover:opacity-100"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <input
                      type="checkbox"
                      checked={item.isIncluded}
                      onChange={() => toggleItemIncluded(item.id)}
                      className="mt-1 h-4 w-4 accent-emerald-500 rounded cursor-pointer flex-none"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-100 truncate">
                          {item.name}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {CATEGORY_LABELS[item.category] || item.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Quantity & Unit Rate Editor */}
                  <div className="flex items-center gap-3 self-end sm:self-center flex-none">
                    {item.unitType !== "fixed" && (
                      <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-xs">
                        <span className="text-[10px] text-slate-500 uppercase font-mono">
                          {item.unitType.replace(/_/g, " ")}:
                        </span>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity || 1}
                          onChange={(e) => handleQtyChange(item.id, Number(e.target.value))}
                          className="w-12 bg-transparent text-right font-mono font-bold text-slate-200 outline-none"
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
                    <SelectItem value="per_lm">Per Linear Metre ($/lm)</SelectItem>
                    <SelectItem value="per_m2">Per Square Metre ($/m²)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Estimated Cost ($)</Label>
                <Input
                  type="number"
                  value={customRate}
                  onChange={(e) => setCustomRate(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="e.g. 1450"
                  className="h-9 text-xs border-slate-800 bg-slate-900 text-emerald-400 font-bold font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-300">Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={customQty}
                  onChange={(e) => setCustomQty(Math.max(1, Number(e.target.value)))}
                  className="h-9 text-xs border-slate-800 bg-slate-900 text-slate-100 font-bold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Client Specification Brief</Label>
              <Input
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
                placeholder="Brief description for quotation document…"
                className="h-9 text-xs border-slate-800 bg-slate-900 text-slate-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
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
                className="bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 text-xs gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add Variation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
