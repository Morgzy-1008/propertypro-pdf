import React, { useState, useMemo } from "react";
import {
  PackageCheck,
  Sparkles,
  Search,
  Plus,
  Trash2,
  Check,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Tag,
  Wand2,
  Layers,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { formatAud } from "@/lib/pricing";
import { POPULAR_VARIATIONS, type PopularVariationPreset } from "./V2Types";
import { DEFAULT_CATALOGUE } from "@/lib/quoting/quoteCatalogue";
import type {
  FullQuote,
  QuoteSelectedLineItem,
  CatalogueCategory,
} from "@/lib/quoting/quoteTypes";

export type VariationCategoryFilter =
  | "all"
  | "flooring"
  | "kitchen"
  | "structural"
  | "outdoor"
  | "electrical";

export const CATEGORY_TABS: { id: VariationCategoryFilter; label: string; icon: string }[] = [
  { id: "all", label: "All Upgrades", icon: "⭐" },
  { id: "flooring", label: "Flooring & Tiling", icon: "🧱" },
  { id: "kitchen", label: "Kitchen & Bathrooms", icon: "🍳" },
  { id: "structural", label: "Ceilings & Structural", icon: "🏛️" },
  { id: "outdoor", label: "Alfresco & Outdoor", icon: "🌿" },
  { id: "electrical", label: "Air Con & Electrical", icon: "⚡" },
];

export function matchesVariationCategory(preset: PopularVariationPreset, filter: VariationCategoryFilter): boolean {
  if (filter === "all") return true;
  if (filter === "flooring") {
    return (
      preset.id === "pop_porcelain_sqm" ||
      preset.id === "pop_hybrid_flooring_sqm" ||
      preset.id === "pop_tiles_ceiling_bath"
    );
  }
  if (filter === "kitchen") {
    return (
      preset.id === "pop_waterfall_40mm" ||
      preset.id === "pop_cooker_900" ||
      preset.category === "internal_kitchen" ||
      preset.category === "internal_bathroom"
    );
  }
  if (filter === "structural") {
    return (
      preset.id === "pop_ceiling_2740" ||
      preset.id === "pop_alfresco_rake" ||
      preset.category === "structural"
    );
  }
  if (filter === "outdoor") {
    return (
      preset.id === "pop_driveway_sqm" ||
      preset.id === "pop_alfresco_slab_sqm" ||
      preset.id === "pop_alfresco_extension_12m" ||
      preset.id === "pop_colourbond_roof" ||
      preset.id === "pop_epoxy_garage" ||
      preset.category === "external" ||
      preset.category === "floorplan_extensions"
    );
  }
  if (filter === "electrical") {
    return preset.id === "pop_h1_ducted_ac" || preset.id === "pop_ev_charger_32a";
  }
  return true;
}

interface V2StepVariationsProps {
  quote: FullQuote;
  lineItems: QuoteSelectedLineItem[];
  onChange: (items: QuoteSelectedLineItem[]) => void;
  onNext: () => void;
  onPrev: () => void;
  isLight: boolean;
}

export function V2StepVariations({
  quote,
  lineItems,
  onChange,
  onNext,
  onPrev,
  isLight,
}: V2StepVariationsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<VariationCategoryFilter>("all");

  // Custom Variation Input State
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  // Auto-detected modified plan line items (those starting with "mod_")
  const autoDetectedItems = useMemo(() => {
    return lineItems.filter((it) => it.id.startsWith("mod_") || it.name.toLowerCase().includes("modified"));
  }, [lineItems]);

  // Standard line items
  const activeIncludedItems = useMemo(() => {
    return lineItems.filter((it) => it.isIncluded);
  }, [lineItems]);

  // Calculate live variations total
  const variationsTotal = useMemo(() => {
    return activeIncludedItems.reduce((acc, it) => acc + (it.subtotal || 0), 0);
  }, [activeIncludedItems]);

  // Toggle a popular fixed-price preset
  const handleTogglePopular = (preset: PopularVariationPreset) => {
    const existingIndex = lineItems.findIndex(
      (it) => it.id === preset.id || (it.catalogueItemId === preset.id)
    );

    if (existingIndex >= 0) {
      const current = lineItems[existingIndex];
      const updated = [...lineItems];
      updated[existingIndex] = {
        ...current,
        isIncluded: !current.isIncluded,
        clientSelected: !current.isIncluded,
        subtotal: !current.isIncluded ? current.unitRate * (current.quantity || 1) : 0,
      };
      onChange(updated);
      toast.info(`${preset.name} ${!current.isIncluded ? "added" : "removed"}`);
    } else {
      const newItem: QuoteSelectedLineItem = {
        id: preset.id,
        catalogueItemId: preset.id,
        category: preset.category,
        name: preset.name,
        description: preset.description,
        unitType: "fixed",
        unitRate: preset.price,
        quantity: 1,
        subtotal: preset.price,
        isIncluded: true,
        isClientSelectable: true,
        clientSelected: true,
      };
      onChange([...lineItems, newItem]);
      toast.success(`Added ${preset.name} (+${formatAud(preset.price)})`);
    }
  };

  // Change quantity for sqm-based popular variation
  const handleSqmChange = (preset: PopularVariationPreset, valStr: string) => {
    const qty = parseFloat(valStr) || 0;
    const rate = preset.unitRate || preset.price;
    const existingIndex = lineItems.findIndex(
      (it) => it.id === preset.id || it.catalogueItemId === preset.id
    );

    if (existingIndex >= 0) {
      const updated = [...lineItems];
      if (qty > 0) {
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: qty,
          unitRate: rate,
          subtotal: Math.round(qty * rate),
          isIncluded: true,
          clientSelected: true,
        };
      } else {
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: 0,
          subtotal: 0,
          isIncluded: false,
          clientSelected: false,
        };
      }
      onChange(updated);
    } else if (qty > 0) {
      const newItem: QuoteSelectedLineItem = {
        id: preset.id,
        catalogueItemId: preset.id,
        category: preset.category,
        name: preset.name,
        description: preset.description,
        unitType: "sqm",
        unitRate: rate,
        quantity: qty,
        subtotal: Math.round(qty * rate),
        isIncluded: true,
        isClientSelectable: true,
        clientSelected: true,
      };
      onChange([...lineItems, newItem]);
    }
  };

  // Update quantity on an existing line item directly
  const handleItemQuantityChange = (itemId: string, valStr: string) => {
    const qty = parseFloat(valStr) || 0;
    const updated = lineItems.map((it) => {
      if (it.id === itemId) {
        return {
          ...it,
          quantity: qty,
          subtotal: Math.round(qty * it.unitRate),
          isIncluded: qty > 0,
        };
      }
      return it;
    });
    onChange(updated);
  };

  // Add 1-Click Builder Essentials Bundle
  const handleAddEssentialsBundle = () => {
    const targetIds = ["pop_ceiling_2740", "pop_h1_ducted_ac", "pop_waterfall_40mm"];
    const targets = POPULAR_VARIATIONS.filter((p) => targetIds.includes(p.id));

    let updated = [...lineItems];
    for (const preset of targets) {
      const existingIdx = updated.findIndex((it) => it.id === preset.id || it.catalogueItemId === preset.id);
      if (existingIdx >= 0) {
        updated[existingIdx] = {
          ...updated[existingIdx],
          isIncluded: true,
          clientSelected: true,
          subtotal: updated[existingIdx].unitRate * (updated[existingIdx].quantity || 1),
        };
      } else {
        updated.push({
          id: preset.id,
          catalogueItemId: preset.id,
          category: preset.category,
          name: preset.name,
          description: preset.description,
          unitType: "fixed",
          unitRate: preset.price,
          quantity: 1,
          subtotal: preset.price,
          isIncluded: true,
          isClientSelectable: true,
          clientSelected: true,
        });
      }
    }
    onChange(updated);
    toast.success("Applied Builder Essentials Pack (+Ceilings, +AC, +40mm Waterfall)");
  };

  // Add Custom Variation
  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) {
      toast.error("Please enter a variation description");
      return;
    }
    const price = parseFloat(customPrice) || 0;

    const newItem: QuoteSelectedLineItem = {
      id: `custom_${Date.now()}`,
      catalogueItemId: `custom_${Date.now()}`,
      category: "internal_general",
      name: customName.trim(),
      description: "Custom client variation request",
      unitType: "fixed",
      unitRate: price,
      quantity: 1,
      subtotal: price,
      isIncluded: true,
      isClientSelectable: true,
      clientSelected: true,
    };

    onChange([...lineItems, newItem]);
    setCustomName("");
    setCustomPrice("");
    toast.success(`Added custom variation: ${newItem.name}`);
  };

  // Remove Line Item
  const handleRemoveItem = (id: string) => {
    onChange(lineItems.filter((it) => it.id !== id));
  };

  // Search catalogue filtered
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return [];
    const query = searchQuery.toLowerCase().trim();
    return DEFAULT_CATALOGUE.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
    ).slice(0, 8);
  }, [searchQuery]);

  const handleAddCatalogueItem = (catItem: (typeof DEFAULT_CATALOGUE)[0]) => {
    const existing = lineItems.find((it) => it.catalogueItemId === catItem.id);
    if (existing) {
      const updated = lineItems.map((it) =>
        it.id === existing.id
          ? { ...it, isIncluded: true, clientSelected: true, subtotal: it.unitRate * (it.quantity || 1) }
          : it
      );
      onChange(updated);
    } else {
      const newItem: QuoteSelectedLineItem = {
        id: `cat_${catItem.id}_${Date.now()}`,
        catalogueItemId: catItem.id,
        category: catItem.category,
        name: catItem.name,
        description: catItem.description,
        unitType: catItem.unitType,
        unitRate: catItem.unitRate,
        quantity: 1,
        subtotal: catItem.unitRate,
        isIncluded: true,
        isClientSelectable: true,
        clientSelected: true,
      };
      onChange([...lineItems, newItem]);
    }
    toast.success(`Added ${catItem.name}`);
    setSearchQuery("");
  };

  return (
    <div className="space-y-8 max-w-7xl 2xl:max-w-[1550px] mx-auto px-2 sm:px-4">
      {/* Header Prompt */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/50 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-xs">
              4
            </span>
            <span className="text-xs uppercase tracking-wider font-extrabold text-emerald-400">Step 4 of 5</span>
          </div>
          <h2 className={`text-3xl sm:text-4xl font-extrabold tracking-tight mt-1.5 ${isLight ? "text-slate-900" : "text-white"}`}>
            House Variations &amp; Upgrades
          </h2>
          <p className="text-sm sm:text-base text-slate-400 mt-1 max-w-3xl">
            Select popular client upgrades, review plan-detected variations, or type custom m² quantities.
          </p>
        </div>

        {/* Live Variations Total */}
        <div
          className={`py-2.5 px-5 rounded-2xl border text-right self-start sm:self-center ${
            isLight
              ? "bg-slate-50 border-slate-200 shadow-xs"
              : "bg-slate-950/60 border-slate-800"
          }`}
        >
          <span className="text-xs uppercase tracking-wider text-slate-400 block font-bold">
            Variations Total
          </span>
          <span className={`text-2xl sm:text-3xl font-extrabold font-mono ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
            +{formatAud(variationsTotal)}
          </span>
        </div>
      </div>

      {/* SECTION 1: AUTO-DETECTED MODIFIED PLAN VARIATIONS (IF PRESENT) */}
      {autoDetectedItems.length > 0 && (
        <div
          className={`p-6 sm:p-8 rounded-2xl sm:rounded-3xl border ${
            isLight
              ? "bg-amber-50/80 border-amber-300 shadow-xs"
              : "bg-amber-950/20 border-amber-500/40"
          }`}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h3 className={`text-base sm:text-lg font-bold uppercase tracking-wider ${isLight ? "text-amber-950" : "text-amber-300"}`}>
              Auto-Detected Plan Variations ({autoDetectedItems.length})
            </h3>
          </div>
          <p className={`text-xs sm:text-sm mb-5 ${isLight ? "text-amber-900/80" : "text-slate-400"}`}>
            These upgrades were identified by the modified floorplan engine based on your architectural drawing.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {autoDetectedItems.map((item) => (
              <div
                key={item.id}
                className={`p-4 sm:p-5 rounded-2xl border flex items-center justify-between gap-4 ${
                  item.isIncluded
                    ? isLight
                      ? "bg-white border-emerald-400 shadow-xs"
                      : "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                    : isLight
                    ? "bg-white/60 border-slate-200 text-slate-500"
                    : "bg-slate-900/60 border-slate-800 text-slate-400"
                }`}
              >
                <div className="min-w-0">
                  <span className={`text-sm sm:text-base font-bold block truncate ${isLight ? "text-slate-900" : "text-white"}`}>
                    {item.name}
                  </span>
                  <span className="text-xs text-slate-400 block truncate mt-0.5">{item.description}</span>
                  <span className={`text-sm sm:text-base font-mono font-bold mt-1.5 block ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
                    {formatAud(item.subtotal || item.unitRate)}
                  </span>
                </div>

                <Switch
                  checked={Boolean(item.isIncluded)}
                  onCheckedChange={(checked) => {
                    const updated = lineItems.map((it) =>
                      it.id === item.id
                        ? { ...it, isIncluded: checked, clientSelected: checked, subtotal: checked ? it.unitRate : 0 }
                        : it
                    );
                    onChange(updated);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: POPULAR UPGRADES (WITH SQM TEXT BOX AUTO-HIGHLIGHTING) */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <Label className={`text-base sm:text-lg font-bold uppercase tracking-wider block ${isLight ? "text-slate-800" : "text-slate-200"}`}>
              ⭐ Popular Client Upgrades
            </Label>
            <span className="text-xs sm:text-sm text-slate-400">
              For m² items, click the text box to automatically highlight the 0 and type your area.
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddEssentialsBundle}
            className={`text-xs sm:text-sm gap-2 font-bold h-10 px-4 rounded-xl self-start sm:self-auto cursor-pointer ${
              isLight
                ? "border-emerald-300 bg-emerald-50 text-emerald-950 hover:bg-emerald-100"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
            }`}
          >
            <Zap className="h-4 w-4 text-amber-500" />
            + 1-Click Builder Essentials (Ceilings + Ducted AC + 40mm Stone)
          </Button>
        </div>

        {/* Category Filter Tabs Bar */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {CATEGORY_TABS.map((tab) => {
            const count = POPULAR_VARIATIONS.filter((p) => matchesVariationCategory(p, tab.id)).length;
            const isSelected = categoryFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={`variation-tab-${tab.id}`}
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? isLight
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                      : "bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm"
                    : isLight
                    ? "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                    : "bg-slate-900/60 text-slate-300 border-slate-800 hover:text-white hover:border-slate-700"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                    isSelected
                      ? isLight ? "bg-slate-800 text-slate-200" : "bg-emerald-600 text-slate-950"
                      : isLight ? "bg-slate-100 text-slate-600" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 sm:gap-5">
          {POPULAR_VARIATIONS.filter((p) => matchesVariationCategory(p, categoryFilter)).map((preset) => {
            const existing = lineItems.find(
              (it) => it.id === preset.id || it.catalogueItemId === preset.id
            );
            const isSqm = preset.unitType === "sqm";
            const currentQty = existing?.quantity ?? 0;
            const isIncluded = Boolean(existing?.isIncluded && (isSqm ? currentQty > 0 : true));
            const subtotal = existing?.subtotal ?? (isSqm ? currentQty * (preset.unitRate || preset.price) : preset.price);

            // RENDER SQM-BASED POPULAR UPGRADE
            if (isSqm) {
              return (
                <div
                  key={preset.id}
                  className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
                    isIncluded
                      ? isLight
                        ? "bg-emerald-50/90 border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
                        : "bg-emerald-950/30 border-emerald-400 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-400"
                      : isLight
                      ? "bg-white border-slate-200 shadow-xs"
                      : "bg-slate-900/60 border-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h4 className={`text-sm sm:text-base font-bold truncate ${isLight ? "text-slate-900" : "text-white"}`}>
                          {preset.name}
                        </h4>
                        {preset.highlight && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 flex-none font-bold">
                            {preset.highlight}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>
                  </div>

                  {/* Quantity input: text box with auto-select on focus (no spinner arrows) */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-700/30">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-slate-400 font-bold">Area (m²):</Label>
                      <div className="relative">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={currentQty > 0 ? currentQty : "0"}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleSqmChange(preset, e.target.value)}
                          className="w-24 h-10 text-center font-mono font-bold text-sm bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-xl"
                        />
                      </div>
                      <span className="text-xs text-slate-400 font-semibold">m²</span>
                    </div>

                    <div className="text-right">
                      <span className={`text-sm font-bold font-mono ${isIncluded ? (isLight ? "text-emerald-700" : "text-emerald-400") : "text-slate-400"}`}>
                        {subtotal > 0 ? `+${formatAud(subtotal)}` : `$${preset.unitRate || preset.price}/m²`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }

            // RENDER FIXED-PRICE POPULAR UPGRADE
            return (
              <div
                key={preset.id}
                onClick={() => handleTogglePopular(preset)}
                className={`p-5 rounded-2xl border text-left cursor-pointer transition-all hover:scale-[1.01] flex items-start justify-between gap-4 ${
                  isIncluded
                    ? isLight
                      ? "bg-emerald-50/90 border-emerald-500 shadow-md ring-2 ring-emerald-500/20"
                      : "bg-emerald-950/30 border-emerald-400 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-400"
                    : isLight
                    ? "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h4 className={`text-sm sm:text-base font-bold truncate ${isLight ? "text-slate-900" : "text-white"}`}>
                      {preset.name}
                    </h4>
                    {preset.highlight && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex-none font-bold">
                        {preset.highlight}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {preset.description}
                  </p>
                  <span className={`text-sm sm:text-base font-bold font-mono mt-2.5 block ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
                    +{formatAud(preset.price)}
                  </span>
                </div>

                <div className="flex-none pt-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                      isIncluded
                        ? "bg-emerald-500 text-slate-950 shadow-xs"
                        : isLight
                        ? "border-2 border-slate-300 text-transparent"
                        : "border-2 border-slate-700 text-transparent"
                    }`}
                  >
                    <Check className="h-4 w-4 stroke-[3]" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: QUICK SEARCH & ADD FROM FULL CATALOGUE */}
      <div
        className={`p-6 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all ${
          isLight
            ? "bg-white border-slate-200 shadow-sm"
            : "bg-slate-900/60 border-slate-800/80"
        }`}
      >
        <div className="flex items-center gap-2.5 mb-4">
          <Search className="h-5 w-5 text-cyan-400" />
          <h3 className={`text-base sm:text-lg font-bold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-200"}`}>
            Search Full Databuild Catalogue
          </h3>
        </div>

        <div className="relative">
          <Input
            placeholder="Search items by code, trade, or keyword (e.g. cavity slider, insulation, downlight, timber)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`text-base h-12 rounded-xl pl-4 pr-10 ${
              isLight
                ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                : "bg-slate-950/80 border-slate-800 text-white"
            }`}
          />
        </div>

        {searchResults.length > 0 && (
          <div className="mt-4 divide-y divide-slate-700/40 border border-slate-700/40 rounded-xl overflow-hidden">
            {searchResults.map((item) => (
              <div
                key={item.id}
                className={`p-4 flex items-center justify-between gap-4 text-sm ${
                  isLight ? "bg-white hover:bg-slate-50" : "bg-slate-950 hover:bg-slate-900"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base truncate">{item.name}</span>
                    <Badge variant="outline" className="text-xs uppercase px-2 py-0.5 font-mono">
                      {item.unitType}
                    </Badge>
                  </div>
                  <span className="text-xs text-slate-400 block truncate mt-0.5">{item.description}</span>
                </div>

                <div className="flex items-center gap-3.5 flex-none">
                  <span className="font-mono font-bold text-base text-emerald-400">
                    {formatAud(item.unitRate)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddCatalogueItem(item)}
                    className="h-9 px-3.5 text-xs font-bold rounded-xl gap-1.5 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 4: ADD CUSTOM CLIENT VARIATION */}
      <div
        className={`p-6 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all ${
          isLight
            ? "bg-white border-slate-200 shadow-sm"
            : "bg-slate-900/60 border-slate-800/80"
        }`}
      >
        <div className="flex items-center gap-2.5 mb-4">
          <Plus className="h-5 w-5 text-emerald-400" />
          <h3 className={`text-base sm:text-lg font-bold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-200"}`}>
            Add Custom Client Request / Variation
          </h3>
        </div>

        <form onSubmit={handleAddCustom} className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2 w-full">
            <Label className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-300"}`}>
              Item Description
            </Label>
            <Input
              placeholder="e.g. Supply and install 2x double GPO powerpoints to island bench"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className={`text-base h-12 rounded-xl ${
                isLight
                  ? "bg-white border-slate-300 text-slate-900"
                  : "bg-slate-950/80 border-slate-800 text-white"
              }`}
            />
          </div>

          <div className="w-full sm:w-52 space-y-2">
            <Label className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-300"}`}>
              Quoted Price ($)
            </Label>
            <Input
              type="number"
              step="10"
              placeholder="e.g. 450"
              value={customPrice}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setCustomPrice(e.target.value)}
              className={`text-base h-12 rounded-xl font-mono ${
                isLight
                  ? "bg-white border-slate-300 text-slate-900"
                  : "bg-slate-950/80 border-slate-800 text-white"
              }`}
            />
          </div>

          <Button
            type="submit"
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm h-12 px-6 rounded-xl gap-2 flex-none cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Variation
          </Button>
        </form>
      </div>

      {/* SECTION 5: CURRENTLY INCLUDED VARIATIONS LIST */}
      {activeIncludedItems.length > 0 && (
        <div
          className={`p-6 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all ${
            isLight
              ? "bg-slate-50 border-slate-200"
              : "bg-slate-900/40 border-slate-800/60"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <PackageCheck className="h-5 w-5 text-emerald-400" />
              <h3 className={`text-base sm:text-lg font-bold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                Selected Upgrades Summary ({activeIncludedItems.length})
              </h3>
            </div>
            <span className={`text-sm sm:text-base font-mono font-extrabold ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
              Total: +{formatAud(variationsTotal)}
            </span>
          </div>

          <div className={`divide-y ${isLight ? "divide-slate-200" : "divide-slate-800/60"}`}>
            {activeIncludedItems.map((item) => {
              const isSqm = item.unitType === "sqm";
              return (
                <div key={item.id} className="py-3.5 flex items-center justify-between gap-4 text-sm">
                  <div className="min-w-0 flex-1">
                    <span className={`font-bold text-base block truncate ${isLight ? "text-slate-900" : "text-slate-200"}`}>
                      {item.name}
                    </span>
                    <span className="text-xs text-slate-400 block truncate mt-0.5">{item.description}</span>
                  </div>

                  {/* Quantity editor if sqm */}
                  {isSqm && (
                    <div className="flex items-center gap-2 flex-none">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={item.quantity || 0}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleItemQuantityChange(item.id, e.target.value)}
                        className="w-20 h-10 rounded-xl text-center font-mono font-bold text-sm"
                      />
                      <span className="text-xs text-slate-400 font-bold">m²</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3.5 flex-none">
                    <span className={`font-mono font-extrabold text-base ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
                      +{formatAud(item.subtotal || item.unitRate)}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveItem(item.id)}
                      className="h-8 w-8 text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-700/50">
        <Button
          type="button"
          variant="outline"
          onClick={onPrev}
          className={`h-14 px-8 rounded-xl text-sm font-bold gap-2 ${
            isLight
              ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Site Costs
        </Button>

        <Button
          type="button"
          onClick={onNext}
          className="h-14 px-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-base shadow-lg shadow-emerald-500/20 gap-2.5 cursor-pointer"
        >
          Review &amp; Export Estimate
          <ArrowRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
