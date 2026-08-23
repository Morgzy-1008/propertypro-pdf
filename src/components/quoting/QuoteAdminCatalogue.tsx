import React, { useState } from "react";
import {
  Settings,
  Plus,
  Trash2,
  RotateCcw,
  Save,
  Shield,
  Layers,
  Pencil,
  Search,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  loadCatalogue,
  loadCustomRates,
  resetCatalogueToDefault,
  saveCatalogue,
  saveCustomRates,
} from "@/lib/quoting/quoteStorage";
import { CATEGORY_LABELS } from "@/lib/quoting/quoteCatalogue";
import type { CatalogueCategory, CatalogueItem, UnitType } from "@/lib/quoting/quoteTypes";

interface QuoteAdminCatalogueProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCatalogueUpdated: () => void;
}

const ADMIN_CATEGORIES: { id: CatalogueCategory | "all"; label: string }[] = [
  { id: "all", label: "All Items" },
  { id: "structural", label: "Structural" },
  { id: "doors_windows", label: "Doors & Windows" },
  { id: "external", label: "Floorplan & External" },
  { id: "internal_kitchen", label: "Internal - Kitchen" },
  { id: "internal_bathroom", label: "Internal - Bathroom" },
  { id: "internal_bedrooms", label: "Internal - Bedrooms & Storage" },
  { id: "internal_laundry", label: "Internal - Laundry" },
  { id: "colour_upgrades", label: "Electrical, HVAC & Finishes" },
  { id: "site_earthworks", label: "Site & Engineering Reports" },
  { id: "council_statutory", label: "Council & Statutory" },
];

export function QuoteAdminCatalogue({
  open,
  onOpenChange,
  onCatalogueUpdated,
}: QuoteAdminCatalogueProps) {
  const [items, setItems] = useState<CatalogueItem[]>(() => loadCatalogue());
  const [customRates, setCustomRates] = useState(() => loadCustomRates());
  const [activeCategory, setActiveCategory] = useState<CatalogueCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // New item form
  const [newItemName, setNewItemName] = useState("");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemCategory, setNewItemCategory] = useState<CatalogueCategory>("structural");
  const [newItemType, setNewItemType] = useState<UnitType>("fixed");
  const [newItemRate, setNewItemRate] = useState<number | "">("");

  // Edit item modal state
  const [editingItem, setEditingItem] = useState<CatalogueItem | null>(null);

  const handleRateChange = (field: keyof typeof customRates, val: number) => {
    setCustomRates((prev) => ({ ...prev, [field]: val }));
  };

  const handleItemRateChange = (id: string, rate: number) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, unitRate: rate } : it)),
    );
  };

  const handleDeleteItem = (id: string) => {
    if (confirm("Are you sure you want to delete this catalogue item?")) {
      setItems((prev) => prev.filter((it) => it.id !== id));
      toast.success("Item removed from catalogue");
    }
  };

  const handleAddNewItem = () => {
    if (!newItemName.trim()) {
      toast.error("Please enter an item name");
      return;
    }
    const newItem: CatalogueItem = {
      id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      category: newItemCategory,
      name: newItemName.trim(),
      description: newItemDesc.trim() || "Item specifications.",
      unitType: newItemType,
      unitRate: Number(newItemRate) || 0,
      defaultQty: 1,
      isIncludedByDefault: false,
      isClientSelectable: true,
    };
    setItems((prev) => [newItem, ...prev]);
    setNewItemName("");
    setNewItemDesc("");
    setNewItemRate("");
    toast.success(`"${newItem.name}" added to master catalogue`);
  };

  const handleSaveEditingItem = () => {
    if (!editingItem) return;
    if (!editingItem.name.trim()) {
      toast.error("Item name cannot be blank");
      return;
    }
    setItems((prev) =>
      prev.map((it) => (it.id === editingItem.id ? editingItem : it)),
    );
    toast.success(`Updated "${editingItem.name}"`);
    setEditingItem(null);
  };

  const handleSaveAll = () => {
    saveCatalogue(items);
    saveCustomRates(customRates);
    toast.success("Catalogue & rates saved successfully");
    onCatalogueUpdated();
    onOpenChange(false);
  };

  const handleResetDefaults = () => {
    if (confirm("Reset to default catalogue items and rates? This will restore the full 80+ item Hudson Homes master list.")) {
      const def = resetCatalogueToDefault();
      setItems(def);
      toast.success("Catalogue reset to default master templates");
      onCatalogueUpdated();
    }
  };

  const filtered = items.filter((it) => {
    const matchesCat = activeCategory === "all" || it.category === activeCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      it.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      it.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl w-[95vw] max-h-[94vh] h-[92vh] flex flex-col border-slate-800 bg-slate-950/98 text-slate-100 backdrop-blur-3xl shadow-2xl p-6">
          <DialogHeader className="border-b border-slate-800/80 pb-3 flex-none">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-bold tracking-wide flex items-center gap-2 text-white">
                <Shield className="h-5 w-5 text-emerald-400" />
                Admin Quoting Catalogue &amp; Rate Engine
              </DialogTitle>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-emerald-400 font-mono font-bold">
                  {items.length} Active Items
                </span>
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable Container */}
          <div className="flex-1 overflow-y-auto space-y-6 pr-2 pt-3">
            {/* Panel 1: Formula Rates for Custom Floorplans */}
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                  <Layers className="h-4 w-4 text-cyan-400" />
                  Custom Floorplan Pricing Engine ($/m²)
                </div>
                <span className="text-[11px] text-slate-400">
                  Formula base rates for non-standard custom floorplan calculations
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
                <div className="space-y-1 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
                  <Label className="text-[10px] text-slate-400">Single Living (H2)</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500 font-mono">$</span>
                    <Input
                      type="number"
                      value={customRates.singleGroundLivingM2Rate}
                      onChange={(e) =>
                        handleRateChange("singleGroundLivingM2Rate", Number(e.target.value))
                      }
                      className="h-8 text-xs border-slate-800 bg-slate-900 text-slate-100 font-bold"
                    />
                    <span className="text-[10px] text-slate-500">/m²</span>
                  </div>
                </div>

                <div className="space-y-1 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
                  <Label className="text-[10px] text-slate-400">Single Living (H3)</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500 font-mono">$</span>
                    <Input
                      type="number"
                      value={customRates.singleGroundLivingH3M2Rate ?? 1810}
                      onChange={(e) =>
                        handleRateChange("singleGroundLivingH3M2Rate" as any, Number(e.target.value))
                      }
                      className="h-8 text-xs border-slate-800 bg-slate-900 text-slate-100 font-bold"
                    />
                    <span className="text-[10px] text-slate-500">/m²</span>
                  </div>
                </div>

                <div className="space-y-1 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
                  <Label className="text-[10px] text-slate-400">DS Ground (H2)</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500 font-mono">$</span>
                    <Input
                      type="number"
                      value={customRates.doubleGroundLivingM2Rate}
                      onChange={(e) =>
                        handleRateChange("doubleGroundLivingM2Rate", Number(e.target.value))
                      }
                      className="h-8 text-xs border-slate-800 bg-slate-900 text-slate-100 font-bold"
                    />
                    <span className="text-[10px] text-slate-500">/m²</span>
                  </div>
                </div>

                <div className="space-y-1 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
                  <Label className="text-[10px] text-slate-400">DS First Floor (H2)</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500 font-mono">$</span>
                    <Input
                      type="number"
                      value={customRates.doubleUpperLivingM2Rate}
                      onChange={(e) =>
                        handleRateChange("doubleUpperLivingM2Rate", Number(e.target.value))
                      }
                      className="h-8 text-xs border-slate-800 bg-slate-900 text-slate-100 font-bold"
                    />
                    <span className="text-[10px] text-slate-500">/m²</span>
                  </div>
                </div>

                <div className="space-y-1 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
                  <Label className="text-[10px] text-slate-400">Garage Footprint</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500 font-mono">$</span>
                    <Input
                      type="number"
                      value={customRates.garageM2Rate ?? 1400}
                      onChange={(e) =>
                        handleRateChange("garageM2Rate" as any, Number(e.target.value))
                      }
                      className="h-8 text-xs border-slate-800 bg-slate-900 text-slate-100 font-bold"
                    />
                    <span className="text-[10px] text-slate-500">/m²</span>
                  </div>
                </div>

                <div className="space-y-1 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
                  <Label className="text-[10px] text-slate-400">Porch / Alfresco</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-500 font-mono">$</span>
                    <Input
                      type="number"
                      value={customRates.ancillaryM2Rate}
                      onChange={(e) =>
                        handleRateChange("ancillaryM2Rate", Number(e.target.value))
                      }
                      className="h-8 text-xs border-slate-800 bg-slate-900 text-slate-100 font-bold"
                    />
                    <span className="text-[10px] text-slate-500">/m²</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel 2: Master Catalogue Items Creator & Table */}
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                  <Settings className="h-4 w-4 text-emerald-400" />
                  Master Variation Items &amp; Allowances ({filtered.length})
                </div>

                {/* Search Bar */}
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search catalogue items..."
                    className="h-8 pl-8 text-xs border-slate-800 bg-slate-950 text-slate-200"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-2 text-slate-500 hover:text-slate-300"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {ADMIN_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      activeCategory === cat.id
                        ? "bg-emerald-500 text-slate-950 font-bold shadow"
                        : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Quick Add Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                <div className="sm:col-span-4 space-y-1">
                  <Label className="text-[10px] text-slate-400">New Item Name</Label>
                  <Input
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="e.g. 2,340mm Internal Hume Linear Doors"
                    className="h-9 text-xs border-slate-800 bg-slate-900 text-slate-100"
                  />
                </div>

                <div className="sm:col-span-3 space-y-1">
                  <Label className="text-[10px] text-slate-400">Category</Label>
                  <Select
                    value={newItemCategory}
                    onValueChange={(v: any) => setNewItemCategory(v)}
                  >
                    <SelectTrigger className="h-9 border-slate-800 bg-slate-900 text-xs text-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                      <SelectItem value="structural">Structural Modifications</SelectItem>
                      <SelectItem value="doors_windows">Doors &amp; Windows</SelectItem>
                      <SelectItem value="external">Floorplan &amp; External</SelectItem>
                      <SelectItem value="internal_kitchen">Internal - Kitchen</SelectItem>
                      <SelectItem value="internal_bathroom">Internal - Bathroom</SelectItem>
                      <SelectItem value="internal_bedrooms">Internal - Bedrooms &amp; Storage</SelectItem>
                      <SelectItem value="internal_laundry">Internal - Laundry</SelectItem>
                      <SelectItem value="colour_upgrades">Electrical, HVAC &amp; Finishes</SelectItem>
                      <SelectItem value="site_earthworks">Site &amp; Engineering Reports</SelectItem>
                      <SelectItem value="council_statutory">Council &amp; Statutory</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-[10px] text-slate-400">Unit Type</Label>
                  <Select
                    value={newItemType}
                    onValueChange={(v: any) => setNewItemType(v)}
                  >
                    <SelectTrigger className="h-9 border-slate-800 bg-slate-900 text-xs text-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                      <SelectItem value="fixed">Fixed Price ($)</SelectItem>
                      <SelectItem value="per_lm">Per Linear Metre ($/lm)</SelectItem>
                      <SelectItem value="per_m2">Per Square Metre ($/m²)</SelectItem>
                      <SelectItem value="custom_qty">Custom Qty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-[10px] text-slate-400">Unit Rate ($)</Label>
                  <Input
                    type="number"
                    value={newItemRate}
                    onChange={(e) => setNewItemRate(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="0"
                    className="h-9 text-xs border-slate-800 bg-slate-900 text-emerald-400 font-bold"
                  />
                </div>

                <div className="sm:col-span-1 flex items-end">
                  <Button
                    size="sm"
                    onClick={handleAddNewItem}
                    className="w-full h-9 bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 text-xs gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                </div>
              </div>

              {/* Items List Table */}
              <div className="space-y-2 max-h-[42vh] overflow-y-auto pr-1">
                {filtered.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                    No items match your search. Use the form above to add catalogue items.
                  </div>
                ) : (
                  filtered.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 p-3 rounded-xl border border-slate-800 bg-slate-950/70 text-xs hover:border-slate-700 transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200 text-xs">{item.name}</span>
                          <button
                            type="button"
                            onClick={() => setEditingItem({ ...item })}
                            className="text-slate-500 hover:text-cyan-400 p-1 rounded hover:bg-slate-900 transition-colors opacity-80 group-hover:opacity-100"
                            title="Edit wording, description or category"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                          {item.description}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 flex-none">
                        <span className="text-[10px] uppercase font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          {CATEGORY_LABELS[item.category] || item.category}
                        </span>
                        <span className="text-[10px] uppercase text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40 font-mono">
                          {item.unitType.replace(/_/g, " ")}
                        </span>
                        <div className="w-24">
                          <Input
                            type="number"
                            value={item.unitRate}
                            onChange={(e) => handleItemRateChange(item.id, Number(e.target.value))}
                            placeholder="0"
                            className="h-8 text-xs text-right border-slate-800 bg-slate-900 text-emerald-400 font-bold"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingItem({ ...item })}
                          className="text-slate-400 hover:text-cyan-300 p-1.5 rounded hover:bg-cyan-950/30 transition-colors"
                          title="Edit complete details"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-slate-400 hover:text-rose-400 p-1.5 rounded hover:bg-rose-950/30 transition-colors"
                          title="Delete item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800 flex-none">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetDefaults}
              className="text-xs text-slate-400 hover:text-rose-300 gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Restore Full Master Catalogue
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveAll}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold hover:from-emerald-400 text-xs gap-1.5 shadow-md"
              >
                <Save className="h-3.5 w-3.5" /> Save All Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Item Modal */}
      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={(o) => !o && setEditingItem(null)}>
          <DialogContent className="max-w-xl border-slate-800 bg-slate-950 text-slate-100 p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <Pencil className="h-4 w-4 text-emerald-400" />
                Edit Catalogue Item &amp; Client Wording
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Item Name</Label>
                <Input
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="border-slate-800 bg-slate-900 text-xs text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-400">
                  Client-Facing Description &amp; Specifications (Generic Construction Terms)
                </Label>
                <Textarea
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  rows={3}
                  className="border-slate-800 bg-slate-900 text-xs text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Category</Label>
                  <Select
                    value={editingItem.category}
                    onValueChange={(v: any) => setEditingItem({ ...editingItem, category: v })}
                  >
                    <SelectTrigger className="border-slate-800 bg-slate-900 text-xs text-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                      <SelectItem value="structural">Structural Modifications</SelectItem>
                      <SelectItem value="doors_windows">Doors &amp; Windows</SelectItem>
                      <SelectItem value="external">Floorplan &amp; External</SelectItem>
                      <SelectItem value="internal_kitchen">Internal - Kitchen</SelectItem>
                      <SelectItem value="internal_bathroom">Internal - Bathroom</SelectItem>
                      <SelectItem value="internal_bedrooms">Internal - Bedrooms &amp; Storage</SelectItem>
                      <SelectItem value="internal_laundry">Internal - Laundry</SelectItem>
                      <SelectItem value="colour_upgrades">Electrical, HVAC &amp; Finishes</SelectItem>
                      <SelectItem value="site_earthworks">Site &amp; Engineering Reports</SelectItem>
                      <SelectItem value="council_statutory">Council &amp; Statutory</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-400">Unit Type</Label>
                  <Select
                    value={editingItem.unitType}
                    onValueChange={(v: any) => setEditingItem({ ...editingItem, unitType: v })}
                  >
                    <SelectTrigger className="border-slate-800 bg-slate-900 text-xs text-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                      <SelectItem value="fixed">Fixed Price ($)</SelectItem>
                      <SelectItem value="per_lm">Per Linear Metre ($/lm)</SelectItem>
                      <SelectItem value="per_m2">Per Square Metre ($/m²)</SelectItem>
                      <SelectItem value="custom_qty">Custom Qty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Unit Rate ($)</Label>
                <Input
                  type="number"
                  value={editingItem.unitRate}
                  onChange={(e) => setEditingItem({ ...editingItem, unitRate: Number(e.target.value) })}
                  className="border-slate-800 bg-slate-900 text-xs text-emerald-400 font-bold"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingItem(null)}
                className="border-slate-800 bg-slate-900 text-slate-300 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEditingItem}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs gap-1.5"
              >
                <Check className="h-3.5 w-3.5" /> Apply Edits
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
