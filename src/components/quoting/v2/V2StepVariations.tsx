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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Prompt */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/50 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs">
              4
            </span>
            <span className="text-xs uppercase tracking-wider font-bold text-emerald-400">Step 4 of 5</span>
          </div>
          <h2 className={`text-2xl font-bold mt-1 ${isLight ? "text-slate-900" : "text-white"}`}>
            House Variations &amp; Upgrades
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Select popular client upgrades, review plan-detected variations, or type custom m² quantities.
          </p>
        </div>

        {/* Live Variations Total */}
        <div
          className={`py-2 px-4 rounded-xl border text-right self-start sm:self-center ${
            isLight
              ? "bg-slate-50 border-slate-200 shadow-xs"
              : "bg-slate-950/60 border-slate-800"
          }`}
        >
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
            Variations Total
          </span>
          <span className={`text-lg font-bold font-mono ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
            +{formatAud(variationsTotal)}
          </span>
        </div>
      </div>

      {/* SECTION 1: AUTO-DETECTED MODIFIED PLAN VARIATIONS (IF PRESENT) */}
      {autoDetectedItems.length > 0 && (
        <div
          className={`p-6 rounded-2xl border ${
            isLight
              ? "bg-amber-50/80 border-amber-300 shadow-xs"
              : "bg-amber-950/20 border-amber-500/40"
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <h3 className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-amber-950" : "text-amber-300"}`}>
              Auto-Detected Plan Variations ({autoDetectedItems.length})
            </h3>
          </div>
          <p className={`text-xs mb-4 ${isLight ? "text-amber-900/80" : "text-slate-400"}`}>
            These upgrades were identified by the modified floorplan engine based on your architectural drawing.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {autoDetectedItems.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
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
                  <span className={`text-xs font-bold block truncate ${isLight ? "text-slate-900" : "text-white"}`}>
                    {item.name}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">{item.description}</span>
                  <span className={`text-xs font-mono font-bold mt-1 block ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <Label className={`text-xs font-bold uppercase tracking-wider block ${isLight ? "text-slate-700" : "text-slate-300"}`}>
              ⭐ Popular Client Upgrades
            </Label>
            <span className="text-[11px] text-slate-400">
              For m² items, click the text box to automatically highlight the 0 and type your area.
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddEssentialsBundle}
            className={`text-xs gap-1.5 font-bold self-start sm:self-auto ${
              isLight
                ? "border-emerald-300 bg-emerald-50 text-emerald-950 hover:bg-emerald-100"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
            }`}
          >
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            + 1-Click Builder Essentials (Ceilings + Ducted AC + 40mm Stone)
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
          {POPULAR_VARIATIONS.map((preset) => {
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
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
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
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`text-xs font-bold truncate ${isLight ? "text-slate-900" : "text-white"}`}>
                          {preset.name}
                        </h4>
                        {preset.highlight && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 flex-none font-semibold">
                            {preset.highlight}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {preset.description}
                      </p>
                    </div>
                  </div>

                  {/* Quantity input: text box with auto-select on focus (no spinner arrows) */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-700/30">
                    <div className="flex items-center gap-2">
                      <Label className="text-[11px] text-slate-400 font-semibold">Area (m²):</Label>
                      <div className="relative">
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={currentQty > 0 ? currentQty : "0"}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleSqmChange(preset, e.target.value)}
                          className="w-20 h-9 text-center font-mono font-bold text-xs bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700"
                        />
                      </div>
                      <span className="text-[11px] text-slate-400 font-semibold">m²</span>
                    </div>

                    <div className="text-right">
                      <span className={`text-xs font-bold font-mono ${isIncluded ? (isLight ? "text-emerald-700" : "text-emerald-400") : "text-slate-400"}`}>
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
                className={`p-4 rounded-2xl border text-left cursor-pointer transition-all hover:scale-[1.01] flex items-start justify-between gap-3 ${
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
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`text-xs font-bold truncate ${isLight ? "text-slate-900" : "text-white"}`}>
                      {preset.name}
                    </h4>
                    {preset.highlight && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex-none font-semibold">
                        {preset.highlight}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {preset.description}
                  </p>
                  <span className={`text-xs font-bold font-mono mt-2 block ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
                    +{formatAud(preset.price)}
                  </span>
                </div>

                <div className="flex-none pt-1">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      isIncluded
                        ? "bg-emerald-500 text-slate-950 shadow-xs"
                        : isLight
                        ? "border border-slate-300 text-transparent"
                        : "border border-slate-700 text-transparent"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: QUICK SEARCH & ADD FROM FULL CATALOGUE */}
      <div
        className={`p-6 rounded-2xl border transition-all ${
          isLight
            ? "bg-white border-slate-200 shadow-sm"
            : "bg-slate-900/60 border-slate-800/80"
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          <Search className="h-4 w-4 text-cyan-400" />
          <h3 className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-200"}`}>
            Search Full Databuild Catalogue
          </h3>
        </div>

        <div className="relative">
          <Input
            placeholder="Search items by code, trade, or keyword (e.g. cavity slider, insulation, downlight, timber)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`text-sm h-11 pl-4 pr-10 ${
              isLight
                ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white"
                : "bg-slate-950/80 border-slate-800 text-white"
            }`}
          />
        </div>

        {searchResults.length > 0 && (
          <div className="mt-3 divide-y divide-slate-700/40 border border-slate-700/40 rounded-xl overflow-hidden">
            {searchResults.map((item) => (
              <div
                key={item.id}
                className={`p-3 flex items-center justify-between gap-3 text-xs ${
                  isLight ? "bg-white hover:bg-slate-50" : "bg-slate-950 hover:bg-slate-900"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold truncate">{item.name}</span>
                    <Badge variant="outline" className="text-[9px] uppercase px-1.5 py-0 font-mono">
                      {item.unitType}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-slate-400 block truncate">{item.description}</span>
                </div>

                <div className="flex items-center gap-3 flex-none">
                  <span className="font-mono font-bold text-emerald-400">
                    {formatAud(item.unitRate)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddCatalogueItem(item)}
                    className="h-8 text-xs gap-1 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 4: ADD CUSTOM CLIENT VARIATION */}
      <div
        className={`p-6 rounded-2xl border transition-all ${
          isLight
            ? "bg-white border-slate-200 shadow-sm"
            : "bg-slate-900/60 border-slate-800/80"
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          <Plus className="h-4 w-4 text-emerald-400" />
          <h3 className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-200"}`}>
            Add Custom Client Request / Variation
          </h3>
        </div>

        <form onSubmit={handleAddCustom} className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 space-y-1.5 w-full">
            <Label className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
              Item Description
            </Label>
            <Input
              placeholder="e.g. Supply and install 2x double GPO powerpoints to island bench"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className={`text-xs h-10 ${
                isLight
                  ? "bg-white border-slate-300 text-slate-900"
                  : "bg-slate-950/80 border-slate-800 text-white"
              }`}
            />
          </div>

          <div className="w-full sm:w-44 space-y-1.5">
            <Label className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
              Quoted Price ($)
            </Label>
            <Input
              type="number"
              step="10"
              placeholder="e.g. 450"
              value={customPrice}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setCustomPrice(e.target.value)}
              className={`text-xs h-10 font-mono ${
                isLight
                  ? "bg-white border-slate-300 text-slate-900"
                  : "bg-slate-950/80 border-slate-800 text-white"
              }`}
            />
          </div>

          <Button
            type="submit"
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs h-10 px-5 gap-1.5 flex-none cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Add Variation
          </Button>
        </form>
      </div>

      {/* SECTION 5: CURRENTLY INCLUDED VARIATIONS LIST */}
      {activeIncludedItems.length > 0 && (
        <div
          className={`p-6 rounded-2xl border transition-all ${
            isLight
              ? "bg-slate-50 border-slate-200"
              : "bg-slate-900/40 border-slate-800/60"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-emerald-400" />
              <h3 className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                Selected Upgrades Summary ({activeIncludedItems.length})
              </h3>
            </div>
            <span className={`text-xs font-mono font-bold ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
              Total: +{formatAud(variationsTotal)}
            </span>
          </div>

          <div className={`divide-y ${isLight ? "divide-slate-200" : "divide-slate-800/60"}`}>
            {activeIncludedItems.map((item) => {
              const isSqm = item.unitType === "sqm";
              return (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <span className={`font-semibold block truncate ${isLight ? "text-slate-900" : "text-slate-200"}`}>
                      {item.name}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">{item.description}</span>
                  </div>

                  {/* Quantity editor if sqm */}
                  {isSqm && (
                    <div className="flex items-center gap-1.5 flex-none">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={item.quantity || 0}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleItemQuantityChange(item.id, e.target.value)}
                        className="w-16 h-8 text-center font-mono font-bold text-xs"
                      />
                      <span className="text-[10px] text-slate-400 font-semibold">m²</span>
                    </div>
                  )}

                  <div className="flex items-center gap-3 flex-none">
                    <span className={`font-mono font-bold ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
                      +{formatAud(item.subtotal || item.unitRate)}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveItem(item.id)}
                      className="h-7 w-7 text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
        <Button
          type="button"
          variant="outline"
          onClick={onPrev}
          className={`text-xs gap-1.5 ${
            isLight
              ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
          }`}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Site Costs
        </Button>

        <Button
          type="button"
          onClick={onNext}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold px-8 shadow-lg shadow-emerald-500/20 gap-2 cursor-pointer h-11"
        >
          Review &amp; Export Estimate
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
