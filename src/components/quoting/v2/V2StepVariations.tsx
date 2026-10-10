import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  PackageCheck,
  Sparkles,
  Search,
  Plus,
  Trash2,
  Check,
  ArrowRight,
  ArrowLeft,
  Zap,
  Minus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatAud } from "@/lib/pricing";
import {
  POPULAR_VARIATIONS,
  type PopularVariationPreset,
  type PopularVariationGroup,
} from "./V2Types";
import { DEFAULT_CATALOGUE } from "@/lib/quoting/quoteCatalogue";
import {
  isDoubleStoreyDesign,
  getStandardAreaBreakdown,
} from "@/lib/quoting/quoteEngine";
import { normalizeInclusionTier } from "@/lib/quoting/quoteCatalogue";
import type {
  FullQuote,
  QuoteSelectedLineItem,
} from "@/lib/quoting/quoteTypes";

export type VariationCategoryFilter =
  | "all"
  | "extensions"
  | "ceiling_height"
  | "electrical"
  | "kitchen"
  | "bathroom"
  | "flooring"
  | "external"
  | "custom";

export interface VariationSectionDef {
  id: PopularVariationGroup;
  label: string;
  icon: string;
  subtitle: string;
}

export const VARIATION_SECTIONS: VariationSectionDef[] = [
  {
    id: "extensions",
    label: "Floorplan & Footprint Extensions",
    icon: "📐",
    subtitle: "Living, alfresco, garage & porch footprint extensions",
  },
  {
    id: "ceiling_height",
    label: "Ceiling Height & Structural",
    icon: "🏛️",
    subtitle: "Ground & upper floor ceilings, raked roofs & architectural square set",
  },
  {
    id: "electrical",
    label: "Air Conditioning & Electrical",
    icon: "⚡",
    subtitle: "Multi-zone ducted air conditioning & 32A EV vehicle circuit",
  },
  {
    id: "kitchen",
    label: "Kitchen & Joinery",
    icon: "🍳",
    subtitle: "40mm stone waterfall ends, undermount sink & butler's pantry",
  },
  {
    id: "bathroom",
    label: "Bathrooms & Wet Areas",
    icon: "🚿",
    subtitle: "Floor to ceiling tiles, frameless screens & recessed soap niche",
  },
  {
    id: "flooring",
    label: "Flooring & Internal Finishes",
    icon: "🧱",
    subtitle: "600x600 porcelain tiling, hybrid timber planks & carpet underlay",
  },
  {
    id: "external",
    label: "External, Roof & Driveway",
    icon: "🌿",
    subtitle: "Exposed aggregate driveway, garage epoxy flake & barrier screens",
  },
];

export const CATEGORY_TABS: { id: VariationCategoryFilter; label: string; icon: string }[] = [
  { id: "all", label: "All Upgrades", icon: "⭐" },
  { id: "extensions", label: "Extensions", icon: "📐" },
  { id: "ceiling_height", label: "Ceiling Height", icon: "🏛️" },
  { id: "electrical", label: "Electrical", icon: "⚡" },
  { id: "kitchen", label: "Kitchen", icon: "🍳" },
  { id: "bathroom", label: "Bathrooms", icon: "🚿" },
  { id: "flooring", label: "Flooring", icon: "🧱" },
  { id: "external", label: "External", icon: "🌿" },
  { id: "custom", label: "Custom / Search", icon: "➕" },
];

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
  const [categoryFilter, setCategoryFilter] = useState<VariationCategoryFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Custom Variation Input & Modal State
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customCategory, setCustomCategory] = useState("internal_general");
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);

  // Top Search Dropdown State & Refs
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Collapsible state for Custom/Catalogue section
  const [showCatalogueSearch, setShowCatalogueSearch] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);

  // 1. Resolve design specifications & areas
  const totalM2 = Number(quote.design.designM2) || Number(quote.design.standardDesignM2) || 200;
  const isDouble = isDoubleStoreyDesign(quote.design.designName, quote.design.housingType, quote.design.storeys);
  const tier = normalizeInclusionTier(quote.design.specTier);
  const isH3 = tier === "H3" || quote.design.specTier?.toLowerCase().includes("h3") || quote.design.specTier?.toLowerCase().includes("luxury");

  const stdAreas = useMemo(() => {
    return getStandardAreaBreakdown(quote.design.designName, quote.design.housingType, totalM2);
  }, [quote.design.designName, quote.design.housingType, totalM2]);

  const livingM2 = useMemo(() => {
    if (quote.design.isModifiedFloorplan && quote.design.modifiedAreas?.livingM2) {
      return Number(quote.design.modifiedAreas.livingM2);
    }
    return (
      stdAreas.livingM2 ||
      (stdAreas.groundLivingM2 ? (stdAreas.groundLivingM2 + (stdAreas.firstLivingM2 || 0)) : 0) ||
      Math.round(totalM2 * 0.75)
    );
  }, [quote.design, stdAreas, totalM2]);

  const garageM2 = useMemo(() => {
    if (quote.design.isModifiedFloorplan && quote.design.modifiedAreas?.garageM2) {
      return Number(quote.design.modifiedAreas.garageM2);
    }
    return stdAreas.garageM2 || 36;
  }, [quote.design, stdAreas]);

  // Automated flooring calculations based on Hudson Homes standard specifications:
  // Tiled areas (Entry, Hall, Kitchen, Meals, Family, Wet Areas) = ~58% of living space
  // Carpet areas (Bedrooms, Robes, Media) = ~42% of living space
  const automatedTiledM2 = useMemo(() => Math.round(livingM2 * 0.58), [livingM2]);
  const automatedCarpetM2 = useMemo(() => Math.round(livingM2 * 0.42), [livingM2]);

  // Default suggested quantity for each item when selected
  const getSuggestedQuantity = (preset: PopularVariationPreset): number => {
    if (preset.id === "pop_driveway_sqm") return 55; // Pre-filled at 55 sqm
    if (preset.id === "pop_epoxy_garage") return Math.round(garageM2); // Tailored to garage area
    if (preset.id === "pop_porcelain_sqm") return automatedTiledM2; // Tailored to tiled areas
    if (preset.id === "pop_hybrid_flooring_sqm") return automatedTiledM2; // Tailored to living/tiled areas
    if (preset.id === "pop_carpet_underlay_sqm") return automatedCarpetM2; // Tailored to bedroom carpet
    if (preset.id === "pop_raked_ceiling_sqm") return 35; // Default 35 sqm entertainment space
    if (preset.id === "pop_tiles_ceiling_bath") return 2; // Default 2 bathrooms
    return 0;
  };

  // Filter presets tailored to the specific design and tier
  const isItemVisibleForDesign = (preset: PopularVariationPreset): boolean => {
    // Hide upper floor items if design is single storey
    if (preset.doubleStoreyOnly && !isDouble) return false;
    // Hide 600x600 tiles and hybrid flooring if H3 (already standard in H3!)
    if (preset.hideIfH3 && isH3) return false;
    return true;
  };

  // Auto-detected modified plan line items
  const autoDetectedItems = useMemo(() => {
    return lineItems.filter((it) => it.id.startsWith("mod_") || it.name.toLowerCase().includes("modified"));
  }, [lineItems]);

  // Standard line items included in quote
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
      (it) => it.id === preset.id || it.catalogueItemId === preset.id
    );

    if (existingIndex >= 0) {
      const current = lineItems[existingIndex];
      const updated = [...lineItems];
      const nextIncluded = !current.isIncluded;
      updated[existingIndex] = {
        ...current,
        isIncluded: nextIncluded,
        clientSelected: nextIncluded,
        subtotal: nextIncluded ? current.unitRate * (current.quantity || 1) : 0,
      };
      onChange(updated);
      if (nextIncluded) {
        toast.success(`Added ${preset.name} (+${formatAud(preset.price)})`);
      } else {
        toast.info(`Removed ${preset.name}`);
      }
    } else {
      const newItem: QuoteSelectedLineItem = {
        id: preset.id,
        catalogueItemId: preset.id,
        category: preset.category,
        name: preset.name,
        description: preset.description, // Retain full description in quote & PDF
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

  // Toggle or change quantity for sqm-based popular variation
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

  // Toggle sqm item on/off using suggested default
  const handleToggleSqm = (preset: PopularVariationPreset) => {
    const existingIndex = lineItems.findIndex(
      (it) => it.id === preset.id || it.catalogueItemId === preset.id
    );
    const existing = lineItems[existingIndex];
    const isCurrentlyIncluded = Boolean(existing?.isIncluded && (existing.quantity || 0) > 0);

    if (isCurrentlyIncluded) {
      handleSqmChange(preset, "0");
      toast.info(`Removed ${preset.name}`);
    } else {
      const suggested = existing?.quantity && existing.quantity > 0 ? existing.quantity : getSuggestedQuantity(preset);
      handleSqmChange(preset, String(suggested));
      toast.success(`Added ${preset.name} (${suggested} m²)`);
    }
  };

  // Handle per-bathroom quantity (e.g. Floor-to-Ceiling tiles @ $3,000/bath)
  const handleBathChange = (preset: PopularVariationPreset, qty: number) => {
    const validQty = Math.max(0, qty);
    const rate = preset.unitRate || preset.price;
    const existingIndex = lineItems.findIndex(
      (it) => it.id === preset.id || it.catalogueItemId === preset.id
    );

    if (existingIndex >= 0) {
      const updated = [...lineItems];
      if (validQty > 0) {
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: validQty,
          unitRate: rate,
          subtotal: validQty * rate,
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
    } else if (validQty > 0) {
      const newItem: QuoteSelectedLineItem = {
        id: preset.id,
        catalogueItemId: preset.id,
        category: preset.category,
        name: preset.name,
        description: preset.description,
        unitType: "fixed",
        unitRate: rate,
        quantity: validQty,
        subtotal: validQty * rate,
        isIncluded: true,
        isClientSelectable: true,
        clientSelected: true,
      };
      onChange([...lineItems, newItem]);
    }
  };

  // Update quantity on an existing line item directly in summary
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

  // Add Custom Variation
  const handleAddCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customName.trim()) {
      toast.error("Please enter a variation description");
      return;
    }
    const price = parseFloat(customPrice) || 0;
    if (price <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    const newItem: QuoteSelectedLineItem = {
      id: `custom_${Date.now()}`,
      catalogueItemId: `custom_${Date.now()}`,
      category: (customCategory as any) || "internal_general",
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
    setIsCustomDialogOpen(false);
    setShowCustomForm(false);
    toast.success(`Added custom variation: ${newItem.name} (+${formatAud(price)})`);
  };

  // Remove Line Item
  const handleRemoveItem = (id: string) => {
    onChange(lineItems.filter((it) => it.id !== id));
  };

  // Search variations & catalogue filtered
  const searchResults = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return [];
    const query = searchQuery.toLowerCase().trim();

    // 1. Matched popular variations (tailored to design)
    const matchedPresets = POPULAR_VARIATIONS.filter(
      (p) =>
        isItemVisibleForDesign(p) &&
        (p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.group.toLowerCase().includes(query))
    ).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      unitType: p.unitType || "fixed",
      unitRate: p.unitRate || p.price,
      isPreset: true,
      preset: p,
    }));

    // 2. Matched Databuild catalogue items
    const matchedCatalogue = DEFAULT_CATALOGUE.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        c.category.toLowerCase().includes(query)
    ).map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      category: c.category,
      unitType: c.unitType,
      unitRate: c.unitRate,
      isPreset: false,
      preset: null as any,
    }));

    // Deduplicate by name/id
    const combined = [...matchedPresets];
    for (const cat of matchedCatalogue) {
      if (!combined.some((item) => item.name.toLowerCase() === cat.name.toLowerCase() || item.id === cat.id)) {
        combined.push(cat);
      }
    }

    return combined.slice(0, 10);
  }, [searchQuery, isDouble, isH3]);

  // Add Item from Search Dropdown
  const handleAddFromSearch = (item: (typeof searchResults)[0]) => {
    if (item.isPreset && item.preset) {
      if (item.preset.unitType === "sqm") {
        handleToggleSqm(item.preset);
      } else if (item.preset.unitType === "per_bath") {
        handleBathChange(item.preset, 2);
      } else {
        handleTogglePreset(item.preset);
      }
    } else {
      handleAddCatalogueItem(item);
    }
    setIsSearchOpen(false);
    setSearchQuery("");
  };

  const handleAddCatalogueItem = (catItem: { id: string; category: any; name: string; description: string; unitType: any; unitRate: number }) => {
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

  // Filter sections according to active category tab
  const visibleSections = useMemo(() => {
    if (categoryFilter === "all") return VARIATION_SECTIONS;
    if (categoryFilter === "custom") return [];
    return VARIATION_SECTIONS.filter((s) => s.id === categoryFilter);
  }, [categoryFilter]);

  return (
    <div className="space-y-6 max-w-7xl 2xl:max-w-[1550px] mx-auto px-2 sm:px-4">
      {/* Header Prompt */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/50 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold text-xs">
              4
            </span>
            <span className="text-xs uppercase tracking-wider font-extrabold text-emerald-400">Step 4 of 5</span>
          </div>
          <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 ${isLight ? "text-slate-900" : "text-white"}`}>
            House Variations &amp; Upgrades
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 max-w-3xl">
            Tailored to <span className="font-bold text-slate-300">{quote.design.designName || "Selected Design"}</span> ({quote.design.specTier || "H2 Design Inclusions"}).
            Ordered vertically from Extensions down to Finishes.
          </p>
        </div>

        {/* Header Controls: Variation Search Bar + Custom Variation Button + Live Variations Total */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 self-start sm:self-center">
          {/* Variation Search Bar */}
          <div className="relative w-64 sm:w-72 md:w-80" ref={searchContainerRef}>
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search variations & catalogue..."
              value={searchQuery}
              onFocus={() => setIsSearchOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              className={`h-11 pl-9.5 pr-8 text-xs sm:text-sm rounded-xl transition-all ${
                isLight
                  ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-emerald-500 shadow-xs"
                  : "bg-slate-950/70 border-slate-800 text-white focus:border-emerald-500"
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setIsSearchOpen(false);
                }}
                className="absolute right-2.5 top-3.5 text-slate-400 hover:text-slate-200 cursor-pointer p-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Floating Dropdown Results */}
            {isSearchOpen && searchResults.length > 0 && (
              <div
                className={`absolute left-0 right-0 top-full mt-2 z-50 max-h-80 overflow-y-auto rounded-2xl border shadow-2xl backdrop-blur-xl ${
                  isLight
                    ? "bg-white/98 border-slate-200 text-slate-900 divide-y divide-slate-100 shadow-slate-900/10"
                    : "bg-slate-950/98 border-slate-800 text-white divide-y divide-slate-800/80 shadow-black/50"
                }`}
              >
                {searchResults.map((item) => {
                  const isAlreadyAdded = lineItems.some(
                    (it) => (it.catalogueItemId === item.id || it.id === item.id) && it.isIncluded
                  );
                  return (
                    <div
                      key={item.id}
                      className={`p-3 flex items-center justify-between gap-3 text-xs transition-colors ${
                        isLight ? "hover:bg-slate-50" : "hover:bg-slate-900/80"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`font-bold text-xs sm:text-sm truncate ${isLight ? "text-slate-900" : "text-white"}`}>
                            {item.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-mono font-semibold uppercase">
                            {item.unitType}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-slate-400 truncate mt-0.5 max-w-xs">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-none">
                        <span className="font-mono font-bold text-xs text-emerald-500">
                          {formatAud(item.unitRate)}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant={isAlreadyAdded ? "secondary" : "outline"}
                          onClick={() => handleAddFromSearch(item)}
                          className={`h-7 px-2.5 text-xs font-bold rounded-lg gap-1 cursor-pointer ${
                            isAlreadyAdded
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : ""
                          }`}
                        >
                          {isAlreadyAdded ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" /> Added
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3" /> Add
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {isSearchOpen && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
              <div
                className={`absolute left-0 right-0 top-full mt-2 z-50 p-4 rounded-2xl border text-center text-xs shadow-2xl backdrop-blur-xl ${
                  isLight ? "bg-white border-slate-200 text-slate-500" : "bg-slate-950 border-slate-800 text-slate-400"
                }`}
              >
                No matching variations found for "{searchQuery}".
                <button
                  type="button"
                  onClick={() => {
                    setCustomName(searchQuery);
                    setIsCustomDialogOpen(true);
                    setIsSearchOpen(false);
                  }}
                  className="block mx-auto mt-2 text-emerald-500 font-bold hover:underline cursor-pointer"
                >
                  + Add "{searchQuery}" as Custom Variation
                </button>
              </div>
            )}
          </div>

          {/* + Custom Variation Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCustomDialogOpen(true)}
            className={`text-xs gap-1.5 font-bold h-11 px-3.5 rounded-xl cursor-pointer ${
              isLight
                ? "border-emerald-300 bg-emerald-50 text-emerald-950 hover:bg-emerald-100 shadow-xs"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
            }`}
          >
            <Plus className="h-3.5 w-3.5 text-emerald-500 stroke-[3]" />
            + Custom Variation
          </Button>

          {/* Live Variations Total */}
          <div
            className={`py-2 px-4 rounded-xl border text-right ${
              isLight
                ? "bg-slate-50 border-slate-200 shadow-xs"
                : "bg-slate-950/60 border-slate-800"
            }`}
          >
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">
              Variations Total
            </span>
            <span className={`text-xl sm:text-2xl font-extrabold font-mono ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
              +{formatAud(variationsTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 1: AUTO-DETECTED MODIFIED PLAN VARIATIONS (IF PRESENT) */}
      {autoDetectedItems.length > 0 && (
        <div
          className={`p-4 sm:p-5 rounded-2xl border ${
            isLight
              ? "bg-amber-50/80 border-amber-300 shadow-xs"
              : "bg-amber-950/20 border-amber-500/40"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <h3 className={`text-sm font-bold uppercase tracking-wider ${isLight ? "text-amber-950" : "text-amber-300"}`}>
              Auto-Detected Plan Variations ({autoDetectedItems.length})
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {autoDetectedItems.map((item) => (
              <div
                key={item.id}
                className={`px-3.5 py-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                  item.isIncluded
                    ? isLight
                      ? "bg-white border-emerald-400 shadow-xs"
                      : "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                    : isLight
                    ? "bg-white/60 border-slate-200 text-slate-500"
                    : "bg-slate-900/60 border-slate-800 text-slate-400"
                }`}
              >
                <span className={`text-sm font-bold truncate flex-1 ${isLight ? "text-slate-900" : "text-white"}`}>
                  {item.name}
                </span>

                <div className="flex items-center gap-3 flex-none">
                  <span className={`text-xs sm:text-sm font-mono font-bold ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
                    {formatAud(item.subtotal || item.unitRate)}
                  </span>
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
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CATEGORY FILTER TABS (ORDERED VERTICALLY IN LIST BELOW) */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {CATEGORY_TABS.map((tab) => {
          const isSelected = categoryFilter === tab.id;
          const availableCount =
            tab.id === "all"
              ? POPULAR_VARIATIONS.filter(isItemVisibleForDesign).length
              : tab.id === "custom"
              ? 0
              : POPULAR_VARIATIONS.filter((p) => p.group === tab.id && isItemVisibleForDesign(p)).length;

          // If a category has no applicable items for this design (e.g. empty), still allow viewing unless count 0
          if (availableCount === 0 && tab.id !== "custom" && tab.id !== "all") {
            return null;
          }

          return (
            <button
              key={tab.id}
              type="button"
              data-testid={`variation-tab-${tab.id}`}
              onClick={() => {
                setCategoryFilter(tab.id);
                if (tab.id === "custom") {
                  searchInputRef.current?.focus();
                  setIsSearchOpen(true);
                }
              }}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
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
              {availableCount > 0 && (
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isSelected
                      ? isLight ? "bg-slate-800 text-slate-200" : "bg-emerald-600 text-slate-950"
                      : isLight ? "bg-slate-100 text-slate-600" : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {availableCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* VERTICAL ORDERED SECTIONS (EXTENSIONS AT TOP -> CEILING HEIGHT -> ELECTRICAL -> KITCHEN -> BATHROOM -> FLOORING -> EXTERNAL) */}
      <div className="space-y-6">
        {visibleSections.map((sec) => {
          const presets = POPULAR_VARIATIONS.filter((p) => p.group === sec.id && isItemVisibleForDesign(p));

          if (presets.length === 0) return null;

          // Calculate how many items and subtotal are selected in this section
          const sectionActiveItems = presets.filter((p) => {
            const existing = lineItems.find((it) => it.id === p.id || it.catalogueItemId === p.id);
            const isSqm = p.unitType === "sqm";
            const isBath = p.unitType === "per_bath";
            return Boolean(existing?.isIncluded && (isSqm || isBath ? (existing.quantity || 0) > 0 : true));
          });

          const sectionTotal = sectionActiveItems.reduce((acc, p) => {
            const existing = lineItems.find((it) => it.id === p.id || it.catalogueItemId === p.id);
            const isSqm = p.unitType === "sqm";
            const isBath = p.unitType === "per_bath";
            const qty = existing?.quantity || 0;
            return acc + (existing?.subtotal ?? (isSqm || isBath ? qty * (p.unitRate || p.price) : p.price));
          }, 0);

          return (
            <div key={sec.id} className="space-y-3">
              {/* Section Header */}
              <div className="flex items-center justify-between border-b border-slate-700/30 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{sec.icon}</span>
                  <div>
                    <h3 className={`text-sm sm:text-base font-extrabold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                      {sec.label}
                    </h3>
                  </div>
                </div>

                {sectionActiveItems.length > 0 && (
                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold">
                    {sectionActiveItems.length} selected (+{formatAud(sectionTotal)})
                  </Badge>
                )}
              </div>

              {/* Grid of sleek compact items WITHOUT descriptions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {presets.map((preset) => {
                  const existing = lineItems.find(
                    (it) => it.id === preset.id || it.catalogueItemId === preset.id
                  );
                  const isSqm = preset.unitType === "sqm";
                  const isBath = preset.unitType === "per_bath";
                  const currentQty = existing?.quantity ?? 0;
                  const isIncluded = Boolean(existing?.isIncluded && (isSqm || isBath ? currentQty > 0 : true));
                  const subtotal = existing?.subtotal ?? (isSqm || isBath ? currentQty * (preset.unitRate || preset.price) : preset.price);

                  // 1. RENDER PER-BATHROOM UPGRADE (e.g. Floor-to-Ceiling Tiles)
                  if (isBath) {
                    return (
                      <div
                        key={preset.id}
                        className={`px-3.5 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          isIncluded
                            ? isLight
                              ? "bg-emerald-50/90 border-emerald-500 shadow-xs ring-1 ring-emerald-500/30"
                              : "bg-emerald-950/25 border-emerald-500/60 shadow-sm ring-1 ring-emerald-500/30"
                            : isLight
                            ? "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                            : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div
                          onClick={() => handleBathChange(preset, isIncluded ? 0 : 2)}
                          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                        >
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center flex-none transition-all ${
                              isIncluded
                                ? "bg-emerald-500 text-slate-950"
                                : isLight
                                ? "border border-slate-300 text-transparent"
                                : "border border-slate-700 text-transparent"
                            }`}
                          >
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-xs sm:text-sm font-bold truncate ${isLight ? "text-slate-900" : "text-white"}`}>
                                {preset.name}
                              </span>
                              {preset.highlight && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold flex-none">
                                  {preset.highlight}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Bathrooms counter & price */}
                        <div className="flex items-center gap-2 flex-none">
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => handleBathChange(preset, currentQty - 1)}
                              className="h-7 w-7 text-slate-400 hover:text-slate-100"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="font-mono font-bold text-xs px-1 min-w-[20px] text-center">
                              {currentQty}
                            </span>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => handleBathChange(preset, currentQty + 1)}
                              className="h-7 w-7 text-slate-400 hover:text-slate-100"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <span className="text-[11px] text-slate-400 font-semibold">baths</span>
                          </div>
                          <span className={`text-xs font-mono font-bold w-18 text-right ${isIncluded ? (isLight ? "text-emerald-700" : "text-emerald-400") : "text-slate-400"}`}>
                            {subtotal > 0 ? `+${formatAud(subtotal)}` : `$${preset.unitRate}/ea`}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  // 2. RENDER SQM-BASED COMPACT ITEM
                  if (isSqm) {
                    return (
                      <div
                        key={preset.id}
                        className={`px-3.5 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          isIncluded
                            ? isLight
                              ? "bg-emerald-50/90 border-emerald-500 shadow-xs ring-1 ring-emerald-500/30"
                              : "bg-emerald-950/25 border-emerald-500/60 shadow-sm ring-1 ring-emerald-500/30"
                            : isLight
                            ? "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                            : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div
                          onClick={() => handleToggleSqm(preset)}
                          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                        >
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center flex-none transition-all ${
                              isIncluded
                                ? "bg-emerald-500 text-slate-950"
                                : isLight
                                ? "border border-slate-300 text-transparent"
                                : "border border-slate-700 text-transparent"
                            }`}
                          >
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-xs sm:text-sm font-bold truncate ${isLight ? "text-slate-900" : "text-white"}`}>
                                {preset.name}
                              </span>
                              {preset.highlight && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-semibold flex-none">
                                  {preset.highlight}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* m² input and calculated price */}
                        <div className="flex items-center gap-2 flex-none">
                          <div className="flex items-center gap-1">
                            <Input
                              type="text"
                              inputMode="decimal"
                              value={currentQty > 0 ? currentQty : "0"}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => handleSqmChange(preset, e.target.value)}
                              className="w-14 sm:w-16 h-8 text-center font-mono font-bold text-xs bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 rounded-lg px-1"
                            />
                            <span className="text-[11px] text-slate-400 font-semibold">m²</span>
                          </div>
                          <span className={`text-xs font-mono font-bold w-18 text-right ${isIncluded ? (isLight ? "text-emerald-700" : "text-emerald-400") : "text-slate-400"}`}>
                            {subtotal > 0 ? `+${formatAud(subtotal)}` : `$${preset.unitRate || preset.price}/m²`}
                          </span>
                        </div>
                      </div>
                    );
                  }

                  // 3. RENDER FIXED-PRICE COMPACT ITEM
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleTogglePopular(preset)}
                      className={`px-3.5 py-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between gap-3 ${
                        isIncluded
                          ? isLight
                            ? "bg-emerald-50/90 border-emerald-500 shadow-xs ring-1 ring-emerald-500/30"
                            : "bg-emerald-950/25 border-emerald-500/60 shadow-sm ring-1 ring-emerald-500/30"
                          : isLight
                          ? "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 shadow-xs"
                          : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center flex-none transition-all ${
                            isIncluded
                              ? "bg-emerald-500 text-slate-950"
                              : isLight
                              ? "border border-slate-300 text-transparent"
                              : "border border-slate-700 text-transparent"
                          }`}
                        >
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-xs sm:text-sm font-bold truncate ${isLight ? "text-slate-900" : "text-white"}`}>
                              {preset.name}
                            </span>
                            {preset.highlight && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-semibold flex-none">
                                {preset.highlight}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-none">
                        <span className={`text-xs sm:text-sm font-mono font-bold ${isIncluded ? (isLight ? "text-emerald-700" : "text-emerald-400") : "text-slate-400"}`}>
                          +{formatAud(preset.price)}
                        </span>
                        <div
                          className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                            isIncluded
                              ? "bg-emerald-500 text-slate-950"
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
          );
        })}
      </div>

      {/* SECTION: CATALOGUE SEARCH & CUSTOM VARIATIONS (COMPACT COLLAPSIBLE) */}
      {(categoryFilter === "all" || categoryFilter === "custom") && (
        <div className="space-y-4 pt-2 border-t border-slate-700/30">
          <div className="flex items-center justify-between">
            <h3 className={`text-sm font-extrabold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-200"}`}>
              🔍 Additional Items &amp; Custom Requests
            </h3>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCatalogueSearch(!showCatalogueSearch)}
                className="text-xs h-8 gap-1 text-slate-400 hover:text-white"
              >
                <Search className="h-3.5 w-3.5" />
                {showCatalogueSearch ? "Hide Databuild Search" : "Search Databuild"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCustomForm(!showCustomForm)}
                className="text-xs h-8 gap-1 text-slate-400 hover:text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                {showCustomForm ? "Hide Custom Form" : "+ Add Custom Item"}
              </Button>
            </div>
          </div>

          {/* Collapsible Search */}
          {showCatalogueSearch && (
            <div
              className={`p-4 rounded-xl border transition-all ${
                isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/60 border-slate-800/80"
              }`}
            >
              <div className="relative">
                <Input
                  placeholder="Search catalogue items by keyword (e.g. cavity slider, downlight, timber)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`text-sm h-10 rounded-xl pl-3 pr-10 ${
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
                      className={`px-3 py-2 flex items-center justify-between gap-3 text-xs ${
                        isLight ? "bg-white hover:bg-slate-50" : "bg-slate-950 hover:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-bold text-sm truncate">{item.name}</span>
                        <Badge variant="outline" className="text-[10px] uppercase px-1.5 py-0 font-mono">
                          {item.unitType}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 flex-none">
                        <span className="font-mono font-bold text-xs text-emerald-400">
                          {formatAud(item.unitRate)}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddCatalogueItem(item)}
                          className="h-7 px-2.5 text-xs font-bold rounded-lg gap-1 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" /> Add
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Collapsible Custom Variation Form */}
          {showCustomForm && (
            <div
              className={`p-4 rounded-xl border transition-all ${
                isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-900/60 border-slate-800/80"
              }`}
            >
              <form onSubmit={handleAddCustom} className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 space-y-1 w-full">
                  <Label className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                    Item Title / Description
                  </Label>
                  <Input
                    placeholder="e.g. Supply and install 2x double GPO powerpoints to island bench"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className={`text-sm h-10 rounded-xl ${
                      isLight
                        ? "bg-white border-slate-300 text-slate-900"
                        : "bg-slate-950/80 border-slate-800 text-white"
                    }`}
                  />
                </div>

                <div className="w-full sm:w-44 space-y-1">
                  <Label className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                    Quoted Price ($)
                  </Label>
                  <Input
                    type="number"
                    step="10"
                    placeholder="e.g. 450"
                    value={customPrice}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    className={`text-sm h-10 rounded-xl font-mono ${
                      isLight
                        ? "bg-white border-slate-300 text-slate-900"
                        : "bg-slate-950/80 border-slate-800 text-white"
                    }`}
                  />
                </div>

                <Button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs h-10 px-4 rounded-xl gap-1.5 flex-none cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Variation
                </Button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* SECTION: SELECTED UPGRADES SUMMARY (COMPACT ROWS WITHOUT DESCRIPTIONS) */}
      {activeIncludedItems.length > 0 && (
        <div
          className={`p-4 sm:p-5 rounded-2xl border transition-all ${
            isLight
              ? "bg-slate-50 border-slate-200"
              : "bg-slate-900/40 border-slate-800/60"
          }`}
        >
          <div className="flex items-center justify-between mb-3 border-b border-slate-700/30 pb-2">
            <div className="flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-emerald-400" />
              <h3 className={`text-xs sm:text-sm font-bold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                Selected Upgrades Summary ({activeIncludedItems.length})
              </h3>
            </div>
            <span className={`text-xs sm:text-sm font-mono font-extrabold ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
              Total: +{formatAud(variationsTotal)}
            </span>
          </div>

          <div className={`divide-y ${isLight ? "divide-slate-200" : "divide-slate-800/60"}`}>
            {activeIncludedItems.map((item) => {
              const isSqm = item.unitType === "sqm";
              return (
                <div key={item.id} className="py-2 flex items-center justify-between gap-3 text-xs">
                  <span className={`font-bold text-xs sm:text-sm truncate flex-1 ${isLight ? "text-slate-900" : "text-slate-200"}`}>
                    {item.name}
                  </span>

                  {/* Quantity editor if sqm */}
                  {isSqm && (
                    <div className="flex items-center gap-1.5 flex-none">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={item.quantity || 0}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleItemQuantityChange(item.id, e.target.value)}
                        className="w-16 h-8 rounded-lg text-center font-mono font-bold text-xs"
                      />
                      <span className="text-[11px] text-slate-400 font-bold">m²</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2.5 flex-none">
                    <span className={`font-mono font-extrabold text-xs sm:text-sm ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
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
          className={`h-12 px-6 rounded-xl text-sm font-bold gap-2 ${
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
          className="h-12 px-8 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-500/20 gap-2 cursor-pointer"
        >
          Review &amp; Export Estimate
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Modal Dialog for + Custom Variation */}
      <Dialog open={isCustomDialogOpen} onOpenChange={setIsCustomDialogOpen}>
        <DialogContent
          className={`max-w-md ${
            isLight
              ? "bg-white text-slate-900 border-slate-200"
              : "bg-slate-950 text-white border-slate-800"
          }`}
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Plus className="h-5 w-5 text-emerald-500 stroke-[3]" />
              Add Custom Variation
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Specify a custom client request, builder variation allowance, or site upgrade.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddCustom(e);
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Item Title / Scope of Work *
              </Label>
              <Input
                autoFocus
                placeholder="e.g. Supply and install 2x double GPO to island bench"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className={`text-sm h-11 rounded-xl ${
                  isLight
                    ? "bg-slate-50 border-slate-300 text-slate-900"
                    : "bg-slate-900 border-slate-700 text-white"
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Quoted Price ($) *
                </Label>
                <Input
                  type="number"
                  step="10"
                  placeholder="e.g. 450"
                  value={customPrice}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className={`text-sm h-11 rounded-xl font-mono ${
                    isLight
                      ? "bg-slate-50 border-slate-300 text-slate-900"
                      : "bg-slate-900 border-slate-700 text-white"
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Category
                </Label>
                <select
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className={`w-full text-xs h-11 rounded-xl px-3 font-semibold border ${
                    isLight
                      ? "bg-slate-50 border-slate-300 text-slate-900"
                      : "bg-slate-900 border-slate-700 text-white"
                  }`}
                >
                  <option value="internal_general">General Variation</option>
                  <option value="colour_upgrades">Electrical / Lighting</option>
                  <option value="internal_kitchen">Kitchen &amp; Joinery</option>
                  <option value="internal_bathroom">Bathroom &amp; Wet Areas</option>
                  <option value="structural">Structural / Framing</option>
                  <option value="external">External / Concrete</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCustomDialogOpen(false)}
                className="text-xs h-10 px-4 rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!customName.trim() || !customPrice}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs h-10 px-5 rounded-xl gap-1.5 cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Add to Estimate
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
