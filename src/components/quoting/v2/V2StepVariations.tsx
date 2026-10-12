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
  Trees,
  Car,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { DEFAULT_CATALOGUE, EXTENSION_RATES_BY_TIER } from "@/lib/quoting/quoteCatalogue";
import {
  isDoubleStoreyDesign,
  getStandardAreaBreakdown,
} from "@/lib/quoting/quoteEngine";
import { normalizeInclusionTier } from "@/lib/quoting/quoteCatalogue";
import { landscapingPriceFor } from "@/lib/landscaping";
import { getActiveDivision } from "@/lib/divisionContext";
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
  onDesignChange?: (patch: Partial<FullQuote["design"]>) => void;
  onNext: () => void;
  onPrev: () => void;
  isLight: boolean;
}

export function V2StepVariations({
  quote,
  lineItems,
  onChange,
  onDesignChange,
  onNext,
  onPrev,
  isLight,
}: V2StepVariationsProps) {
  const [selectedCategory, setSelectedCategory] = useState<PopularVariationGroup | "all">("extensions");
  const [searchQuery, setSearchQuery] = useState("");

  // Calculate live count and subtotal of selected items in each category
  const getCategoryStats = (groupId: PopularVariationGroup) => {
    const presets = POPULAR_VARIATIONS.filter((p) => p.group === groupId && isItemVisibleForDesign(p));
    let count = 0;
    let total = 0;
    for (const p of presets) {
      const existing = lineItems.find((it) => it.id === p.id || it.catalogueItemId === p.id);
      if (existing?.isIncluded) {
        const isSqm = p.unitType === "sqm";
        const isBath = p.unitType === "per_bath";
        const qty = existing.quantity || 0;
        if (isSqm || isBath ? qty > 0 : true) {
          count++;
          total += existing.subtotal ?? (isSqm || isBath ? qty * (p.unitRate || p.price) : p.price);
        }
      }
    }
    return { count, total };
  };

  // Custom Variation Input & Modal State
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [customCategory, setCustomCategory] = useState("internal_general");
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);

  // Top Search Dropdown State & Refs
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchDraftQuantities, setSearchDraftQuantities] = useState<Record<string, number>>({});
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
  const tierRates = EXTENSION_RATES_BY_TIER[tier] || EXTENSION_RATES_BY_TIER.H2;

  // Dynamic extension rate calibration function ensuring all extension presets reflect H1/H2/H3
  const getCalibratedPreset = (p: PopularVariationPreset): PopularVariationPreset => {
    if (p.id === "pop_alfresco_slab_sqm") {
      const r = tierRates.alfresco;
      return { ...p, price: r, unitRate: r, highlight: `${formatAud(r)}/m² rate` };
    }
    if (p.id === "pop_living_extension_sqm") {
      const r = tierRates.gf;
      return { ...p, price: r, unitRate: r, highlight: `${formatAud(r)}/m² rate` };
    }
    if (p.id === "pop_garage_extension_sqm") {
      const r = tierRates.garage;
      return { ...p, price: r, unitRate: r, highlight: `${formatAud(r)}/m² rate` };
    }
    if (p.id === "pop_porch_extension_sqm") {
      const r = tierRates.porch;
      return { ...p, price: r, unitRate: r, highlight: `${formatAud(r)}/m² rate` };
    }
    return p;
  };

  // Turnkey Landscaping & 55m² Driveway calculations
  const division = (quote.client?.state || getActiveDivision()) === "NSW" ? "NSW" : "QLD";
  const currentLandSize = quote.design.landscapingLandSize || 450;
  const currentLandscapingCost = landscapingPriceFor(
    currentLandSize,
    quote.design.housingType,
    quote.design.designName,
    division,
    quote.design.specTier
  );
  const isLandscapingActive = Boolean(quote.design.landscapingSelected);

  const currentDrivewayM2 = quote.design.exposedDrivewayM2 ?? 55;
  const currentDrivewayCost = Math.round(currentDrivewayM2 * 230);
  const isDrivewayActive = Boolean(quote.design.exposedDrivewaySelected && !quote.design.landscapingSelected);

  const handleToggleLandscaping = () => {
    if (!onDesignChange) return;
    const next = !isLandscapingActive;
    onDesignChange({
      landscapingSelected: next,
      landscapingLandSize: currentLandSize,
      landscapingCost: next ? currentLandscapingCost : 0,
      ...(next ? { exposedDrivewaySelected: false, exposedDrivewayCost: 0 } : {}),
    });
    if (next) {
      const sign = currentLandscapingCost >= 0 ? "+" : "";
      toast.success(`Added Turnkey Landscaping Package (${sign}${formatAud(currentLandscapingCost)})`);
    } else {
      toast.info("Removed Landscaping Package");
    }
  };

  const handleLandSizeChange = (valStr: string) => {
    if (!onDesignChange) return;
    const size = Number(valStr) || 450;
    const price = landscapingPriceFor(size, quote.design.housingType, quote.design.designName, division, quote.design.specTier);
    onDesignChange({
      landscapingSelected: true,
      landscapingLandSize: size,
      landscapingCost: price,
      exposedDrivewaySelected: false,
      exposedDrivewayCost: 0,
    });
    const sign = price >= 0 ? "+" : "";
    toast.success(`Updated Landscaping Package for ${size} m² lot (${sign}${formatAud(price)})`);
  };

  const handleToggleDriveway = () => {
    if (!onDesignChange) return;
    const next = !isDrivewayActive;
    onDesignChange({
      exposedDrivewaySelected: next,
      exposedDrivewayM2: currentDrivewayM2,
      exposedDrivewayCost: next ? currentDrivewayCost : 0,
      ...(next ? { landscapingSelected: false, landscapingCost: 0 } : {}),
    });
    if (next) {
      toast.success(
        `Added Exposed Aggregate Driveway (${currentDrivewayM2} m² @ $230/m² = +${formatAud(currentDrivewayCost)})`
      );
    } else {
      toast.info("Removed Exposed Aggregate Driveway");
    }
  };

  const handleDrivewayM2Change = (valStr: string) => {
    if (!onDesignChange) return;
    const m2 = parseFloat(valStr) || 0;
    const cost = Math.round(m2 * 230);
    onDesignChange({
      exposedDrivewaySelected: m2 > 0,
      exposedDrivewayM2: m2,
      exposedDrivewayCost: cost,
      landscapingSelected: false,
      landscapingCost: 0,
    });
  };

  // Auto-calibrate existing extension line items when inclusion tier changes
  useEffect(() => {
    const extensionIds = [
      "pop_alfresco_slab_sqm",
      "pop_living_extension_sqm",
      "pop_garage_extension_sqm",
      "pop_porch_extension_sqm",
    ];
    let hasChange = false;
    const updated = lineItems.map((it) => {
      if (extensionIds.includes(it.id)) {
        let expectedRate = it.unitRate;
        if (it.id === "pop_alfresco_slab_sqm") expectedRate = tierRates.alfresco;
        else if (it.id === "pop_living_extension_sqm") expectedRate = tierRates.gf;
        else if (it.id === "pop_garage_extension_sqm") expectedRate = tierRates.garage;
        else if (it.id === "pop_porch_extension_sqm") expectedRate = tierRates.porch;

        if (it.unitRate !== expectedRate) {
          hasChange = true;
          const qty = it.quantity || 1;
          return {
            ...it,
            unitRate: expectedRate,
            subtotal: Math.round(qty * expectedRate),
          };
        }
      }
      return it;
    });
    if (hasChange) {
      onChange(updated);
    }
  }, [tier, tierRates, lineItems, onChange]);

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
    // Hide 600x600 tiles, hybrid flooring, and ducted AC if H3 (already standard in H3!)
    if (preset.hideIfH3 && isH3) return false;
    // Ducted AC is already included as standard in H3 inclusions
    if ((preset.id === "pop_h1_ducted_ac" || preset.id === "hvac_ducted_aircon") && isH3) return false;
    return true;
  };

  // Auto-purge items that are already standard in H3 (e.g. Ducted AC, 600x600 porcelain tiles, hybrid flooring)
  useEffect(() => {
    if (isH3) {
      const invalidH3Ids = ["pop_h1_ducted_ac", "hvac_ducted_aircon"];
      const hasInvalidItem = lineItems.some(
        (it) => invalidH3Ids.some((id) => it.id.startsWith(id)) && it.isIncluded
      );
      if (hasInvalidItem) {
        onChange(
          lineItems.filter(
            (it) => !invalidH3Ids.some((id) => it.id.startsWith(id))
          )
        );
      }
    }
  }, [isH3, lineItems, onChange]);

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
  const handleTogglePopular = (rawPreset: PopularVariationPreset) => {
    const preset = getCalibratedPreset(rawPreset);
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
  const handleSqmChange = (rawPreset: PopularVariationPreset, valStr: string) => {
    const preset = getCalibratedPreset(rawPreset);
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
  const handleToggleSqm = (rawPreset: PopularVariationPreset) => {
    const preset = getCalibratedPreset(rawPreset);
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

  // Add Custom Variation - supports $0 items and discounts (negative prices), and only sets description if user provided one
  const handleAddCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customName.trim()) {
      toast.error("Please enter a variation description or title");
      return;
    }
    if (customPrice.trim() === "" || isNaN(Number(customPrice))) {
      toast.error("Please enter a valid price (can be $0 for included, or negative for discount)");
      return;
    }
    const price = Number(customPrice);

    const trimmedDesc = customDescription.trim();
    const newItem: QuoteSelectedLineItem = {
      id: `custom_${Date.now()}`,
      catalogueItemId: `custom_${Date.now()}`,
      category: (customCategory as any) || "internal_general",
      name: customName.trim(),
      description: trimmedDesc ? trimmedDesc : undefined, // Only set if user entered one
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
    setCustomDescription("");
    setIsCustomDialogOpen(false);
    setShowCustomForm(false);
    const priceDisplay =
      price < 0
        ? `-$${Math.abs(price).toLocaleString("en-AU")}`
        : price === 0
        ? "$0 (Included)"
        : `+$${price.toLocaleString("en-AU")}`;
    toast.success(`Added custom variation: ${newItem.name} (${priceDisplay})`);
  };

  // Remove Line Item
  const handleRemoveItem = (id: string) => {
    onChange(lineItems.filter((it) => it.id !== id));
  };

  // Search variations & catalogue filtered (instant 1-char search + pre-filled on focus)
  const searchResults = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    // 1. If empty query, pre-fill top catalogue/popular options for instant selection
    if (!query) {
      return POPULAR_VARIATIONS.filter(isItemVisibleForDesign).slice(0, 8).map((p) => {
        const cal = getCalibratedPreset(p);
        return {
          id: cal.id,
          name: cal.name,
          description: cal.description,
          category: cal.category,
          unitType: cal.unitType || "fixed",
          unitRate: cal.unitRate || cal.price,
          isPreset: true,
          preset: cal,
        };
      });
    }

    // 2. Matched popular variations (tailored to design and calibrated)
    const matchedPresets = POPULAR_VARIATIONS.filter(
      (p) =>
        isItemVisibleForDesign(p) &&
        (p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.group.toLowerCase().includes(query))
    ).map((p) => {
      const cal = getCalibratedPreset(p);
      return {
        id: cal.id,
        name: cal.name,
        description: cal.description,
        category: cal.category,
        unitType: cal.unitType || "fixed",
        unitRate: cal.unitRate || cal.price,
        isPreset: true,
        preset: cal,
      };
    });

    // 3. Matched Databuild catalogue items
    const matchedCatalogue = DEFAULT_CATALOGUE.filter((c) => {
      // Ducted AC is already included as standard in H3
      if (isH3 && (c.id === "hvac_ducted_aircon" || c.name.toLowerCase().includes("ilo h1 split system"))) {
        return false;
      }
      return (
        c.name.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        c.category.toLowerCase().includes(query)
      );
    }).map((c) => ({
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

    return combined.slice(0, 12);
  }, [searchQuery, isDouble, isH3, tierRates]);

  const getSearchDraftQty = (item: (typeof searchResults)[0]): number => {
    if (searchDraftQuantities[item.id] !== undefined) {
      return searchDraftQuantities[item.id];
    }
    const existing = lineItems.find((it) => it.id === item.id || it.catalogueItemId === item.id);
    if (existing && (existing.quantity || 0) > 0) {
      return existing.quantity!;
    }
    if (item.isPreset && item.preset) {
      const sug = getSuggestedQuantity(item.preset);
      if (sug > 0) return sug;
    }
    if (item.unitType === "sqm") return 55;
    if (item.unitType === "per_bath") return 2;
    return 1;
  };

  // Add or update item from search dropdown with specified inline quantity
  const handleAddOrUpdateFromSearch = (item: (typeof searchResults)[0], qty: number) => {
    const finalQty = Math.max(1, qty || 1);
    if (item.isPreset && item.preset) {
      const p = getCalibratedPreset(item.preset);
      if (p.unitType === "sqm") {
        handleSqmChange(p, String(finalQty));
      } else if (p.unitType === "per_bath") {
        handleBathChange(p, finalQty);
      } else {
        const existingIndex = lineItems.findIndex(
          (it) => it.id === p.id || it.catalogueItemId === p.id
        );
        if (existingIndex >= 0) {
          const updated = [...lineItems];
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: finalQty,
            subtotal: p.price * finalQty,
            isIncluded: true,
            clientSelected: true,
          };
          onChange(updated);
        } else {
          const newItem: QuoteSelectedLineItem = {
            id: p.id,
            catalogueItemId: p.id,
            category: p.category,
            name: p.name,
            description: p.description,
            unitType: "fixed",
            unitRate: p.price,
            quantity: finalQty,
            subtotal: p.price * finalQty,
            isIncluded: true,
            isClientSelectable: true,
            clientSelected: true,
          };
          onChange([...lineItems, newItem]);
        }
      }
    } else {
      const existingIndex = lineItems.findIndex(
        (it) => it.catalogueItemId === item.id || it.id === item.id
      );
      if (existingIndex >= 0) {
        const updated = lineItems.map((it, idx) =>
          idx === existingIndex
            ? {
                ...it,
                quantity: finalQty,
                subtotal: Math.round(it.unitRate * finalQty),
                isIncluded: true,
                clientSelected: true,
              }
            : it
        );
        onChange(updated);
      } else {
        const newItem: QuoteSelectedLineItem = {
          id: `cat_${item.id}_${Date.now()}`,
          catalogueItemId: item.id,
          category: item.category,
          name: item.name,
          description: item.description,
          unitType: item.unitType,
          unitRate: item.unitRate,
          quantity: finalQty,
          subtotal: Math.round(item.unitRate * finalQty),
          isIncluded: true,
          isClientSelectable: true,
          clientSelected: true,
        };
        onChange([...lineItems, newItem]);
      }
    }
    toast.success(`Added ${item.name} (${finalQty} ${item.unitType === "sqm" ? "m²" : ""})`);
    setIsSearchOpen(false);
    setSearchQuery("");
  };

  const handleAddCatalogueItem = (catItem: { id: string; category: any; name: string; description: string; unitType: any; unitRate: number }) => {
    handleAddOrUpdateFromSearch(
      {
        id: catItem.id,
        category: catItem.category,
        name: catItem.name,
        description: catItem.description,
        unitType: catItem.unitType,
        unitRate: catItem.unitRate,
        isPreset: false,
        preset: null as any,
      },
      1
    );
  };

  // Filter sections according to active category card selection
  const visibleSections = useMemo(() => {
    if (selectedCategory === "all") return VARIATION_SECTIONS;
    return VARIATION_SECTIONS.filter((s) => s.id === selectedCategory);
  }, [selectedCategory]);

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
              onKeyDown={(e) => {
                if (e.key === "Escape") setIsSearchOpen(false);
              }}
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
                className={`absolute left-0 right-0 top-full mt-2 z-50 max-h-96 overflow-y-auto rounded-2xl border shadow-2xl backdrop-blur-xl ${
                  isLight
                    ? "bg-white/98 border-slate-200 text-slate-900 divide-y divide-slate-100 shadow-slate-900/10"
                    : "bg-slate-950/98 border-slate-800 text-white divide-y divide-slate-800/80 shadow-black/50"
                }`}
              >
                {searchResults.map((item) => {
                  const isAlreadyAdded = lineItems.some(
                    (it) => (it.catalogueItemId === item.id || it.id === item.id) && it.isIncluded
                  );
                  const draftQty = getSearchDraftQty(item);
                  const calcTotal = Math.round(draftQty * item.unitRate);

                  return (
                    <div
                      key={item.id}
                      className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors ${
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

                      <div className="flex items-center gap-2 flex-none self-end sm:self-center">
                        {/* Inline quantity / sqm controls */}
                        {item.unitType === "sqm" ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="1"
                              value={draftQty}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setSearchDraftQuantities((prev) => ({ ...prev, [item.id]: val }));
                              }}
                              className="w-14 h-7 text-center font-mono font-bold text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-md px-1"
                            />
                            <span className="text-[10px] text-slate-400 font-semibold">m²</span>
                          </div>
                        ) : item.unitType === "per_bath" ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="1"
                              value={draftQty}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 0;
                                setSearchDraftQuantities((prev) => ({ ...prev, [item.id]: val }));
                              }}
                              className="w-12 h-7 text-center font-mono font-bold text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-md px-1"
                            />
                            <span className="text-[10px] text-slate-400 font-semibold">baths</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="1"
                              value={draftQty}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 0;
                                setSearchDraftQuantities((prev) => ({ ...prev, [item.id]: val }));
                              }}
                              className="w-12 h-7 text-center font-mono font-bold text-xs bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 rounded-md px-1"
                            />
                            <span className="text-[10px] text-slate-400 font-semibold">qty</span>
                          </div>
                        )}

                        <span className="font-mono font-bold text-xs text-emerald-500 w-16 text-right">
                          {calcTotal < 0
                            ? `-${formatAud(Math.abs(calcTotal))}`
                            : calcTotal === 0
                            ? "$0"
                            : `+${formatAud(calcTotal)}`}
                        </span>

                        <Button
                          type="button"
                          size="sm"
                          variant={isAlreadyAdded ? "secondary" : "default"}
                          onClick={() => handleAddOrUpdateFromSearch(item, draftQty)}
                          className={`h-7 px-2.5 text-xs font-bold rounded-lg gap-1 cursor-pointer ${
                            isAlreadyAdded
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
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

            {isSearchOpen && searchQuery.trim().length >= 1 && searchResults.length === 0 && (
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
            data-testid="add-custom-variation-btn"
            variant="outline"
            size="sm"
            onClick={() => {
              setIsSearchOpen(false);
              setIsCustomDialogOpen(true);
            }}
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
            <span className={`text-xl sm:text-2xl font-extrabold font-mono ${
              variationsTotal < 0
                ? "text-rose-600 dark:text-rose-400"
                : isLight
                ? "text-emerald-700"
                : "text-emerald-400"
            }`}>
              {variationsTotal > 0
                ? `+${formatAud(variationsTotal)}`
                : variationsTotal < 0
                ? `-${formatAud(Math.abs(variationsTotal))}`
                : "$0"}
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

      {/* SECTION: FEATURED POPULAR TURNKEY PACKAGES (LANDSCAPING & DRIVEWAY) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-700/30 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌿</span>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`text-sm sm:text-base font-extrabold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                Featured Popular Turnkey Upgrades
              </h3>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[10px] font-bold py-0.5">
                Top Client Selections
              </Badge>
            </div>
          </div>
          {(isLandscapingActive || isDrivewayActive) && (
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold">
              {isLandscapingActive ? "Landscaping Package Active" : "55m² Driveway Active"}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Card 1: Turnkey Complete Landscaping Package */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
              isLandscapingActive
                ? isLight
                  ? "bg-emerald-50/90 border-emerald-500 shadow-sm ring-1 ring-emerald-500/30"
                  : "bg-emerald-950/25 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/30"
                : isLight
                ? "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-sm sm:text-base font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                      Turnkey Landscaping Package
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold uppercase font-mono">
                      Includes Driveway
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Complete turnkey package: turf, 1.8m boundary fencing with gate, letterbox, folding clothesline, garden beds &amp; exposed aggregate driveway.
                  </p>
                </div>
              </div>

              {/* Lot size selector and dynamic price */}
              <div className="pt-3 border-t border-slate-700/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Label className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                    Lot / Land Size:
                  </Label>
                  <Select
                    value={String(currentLandSize)}
                    onValueChange={handleLandSizeChange}
                  >
                    <SelectTrigger className={`h-9 text-xs font-semibold w-40 rounded-xl ${
                      isLight ? "bg-white border-slate-300" : "bg-slate-950 border-slate-800"
                    }`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="300">Up to 300 m² Lot</SelectItem>
                      <SelectItem value="450">Up to 450 m² Lot</SelectItem>
                      <SelectItem value="600">Up to 600 m² Lot</SelectItem>
                      <SelectItem value="700">Up to 700 m² Lot</SelectItem>
                      <SelectItem value="800">Up to 800 m² Lot</SelectItem>
                      <SelectItem value="900">Up to 900 m² Lot</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-3 justify-between sm:justify-end">
                  <span className={`text-base font-extrabold font-mono ${
                    isLandscapingActive
                      ? isLight ? "text-emerald-700" : "text-emerald-400"
                      : "text-slate-400"
                  }`}>
                    {currentLandscapingCost < 0
                      ? `-${formatAud(Math.abs(currentLandscapingCost))}`
                      : currentLandscapingCost === 0
                      ? "Included ($0)"
                      : `+${formatAud(currentLandscapingCost)}`}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant={isLandscapingActive ? "secondary" : "outline"}
                    onClick={handleToggleLandscaping}
                    className={`h-8 px-3 text-xs font-bold rounded-xl cursor-pointer ${
                      isLandscapingActive
                        ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                        : ""
                    }`}
                  >
                    {isLandscapingActive ? "✓ Included" : "+ Add"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: 55m² Exposed Aggregate Driveway */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 ${
              isLandscapingActive
                ? isLight
                  ? "bg-slate-50/60 border-slate-200 opacity-80"
                  : "bg-slate-950/40 border-slate-800 opacity-80"
                : isDrivewayActive
                ? isLight
                  ? "bg-emerald-50/90 border-emerald-500 shadow-sm ring-1 ring-emerald-500/30"
                  : "bg-emerald-950/25 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/30"
                : isLight
                ? "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-sm sm:text-base font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                      Exposed Aggregate Concrete Driveway
                    </span>
                    {isLandscapingActive ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold uppercase font-mono">
                        ✓ Included in Landscaping
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold font-mono">
                        $230/m² rate
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Reinforced decorative exposed aggregate concrete driveway and front porch pedestrian lead walk path.
                  </p>
                </div>
              </div>

              {/* Driveway m2 input and dynamic price */}
              <div className="pt-3 border-t border-slate-700/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Label className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                    Driveway Area:
                  </Label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min="1"
                      max="300"
                      disabled={isLandscapingActive}
                      value={currentDrivewayM2}
                      onChange={(e) => handleDrivewayM2Change(e.target.value)}
                      className={`w-20 h-9 text-center font-mono font-bold text-xs rounded-xl ${
                        isLight ? "bg-white border-slate-300" : "bg-slate-950 border-slate-800"
                      } ${isLandscapingActive ? "cursor-not-allowed opacity-60" : ""}`}
                    />
                    <span className="text-xs text-slate-400 font-bold">m²</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 justify-between sm:justify-end">
                  <span className={`text-base font-extrabold font-mono ${
                    isLandscapingActive
                      ? "text-emerald-500"
                      : isDrivewayActive
                      ? isLight ? "text-emerald-700" : "text-emerald-400"
                      : "text-slate-400"
                  }`}>
                    {isLandscapingActive ? "$0 (In Landscaping)" : `+${formatAud(currentDrivewayCost)}`}
                  </span>
                  {!isLandscapingActive && (
                    <Button
                      type="button"
                      size="sm"
                      variant={isDrivewayActive ? "secondary" : "outline"}
                      onClick={handleToggleDriveway}
                      className={`h-8 px-3 text-xs font-bold rounded-xl cursor-pointer ${
                        isDrivewayActive
                          ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                          : ""
                      }`}
                    >
                      {isDrivewayActive ? "✓ Included" : "+ Add"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CATEGORY CARDS ACROSS THE PAGE WITH SELECTION COUNTS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageCheck className="h-4 w-4 text-emerald-400" />
            <h3 className={`text-xs sm:text-sm font-extrabold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-200"}`}>
              Browse Upgrades by Category
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory(selectedCategory === "all" ? "extensions" : "all")}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                selectedCategory === "all"
                  ? isLight
                    ? "bg-emerald-100 text-emerald-900 border-emerald-400"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : isLight
                  ? "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              {selectedCategory === "all" ? "Collapse to Single Category" : "View All Categories"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
          {VARIATION_SECTIONS.map((sec) => {
            const isSelected = selectedCategory === sec.id;
            const stats = getCategoryStats(sec.id);

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setSelectedCategory(sec.id)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                  isSelected
                    ? isLight
                      ? "bg-emerald-50/90 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20"
                      : "bg-emerald-950/40 border-emerald-400 shadow-md ring-2 ring-emerald-400/30"
                    : isLight
                    ? "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80"
                }`}
              >
                <div>
                  <span className="text-xl block mb-1">{sec.icon}</span>
                  <h4 className={`text-xs font-bold leading-tight truncate ${
                    isSelected
                      ? isLight ? "text-emerald-950 font-extrabold" : "text-white font-extrabold"
                      : isLight ? "text-slate-800" : "text-slate-200"
                  }`}>
                    {sec.label.split("&")[0].trim()}
                  </h4>
                </div>

                <div className="pt-2 border-t border-slate-700/20 flex items-center justify-between">
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    stats.count > 0
                      ? isLight
                        ? "bg-emerald-100 text-emerald-800 font-extrabold"
                        : "bg-emerald-500/20 text-emerald-300 font-extrabold"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  }`}>
                    {stats.count > 0 ? `${stats.count} sel (+${formatAud(stats.total)})` : "0 sel"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SELECTED CATEGORY UPGRADES SECTION */}
      <div className="space-y-6">
        {visibleSections.map((sec) => {
          const presets = POPULAR_VARIATIONS.filter((p) => p.group === sec.id && isItemVisibleForDesign(p)).map(getCalibratedPreset);

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
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`text-sm sm:text-base font-extrabold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                      {sec.label}
                    </h3>
                    {sec.id === "electrical" && isH3 && (
                      <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[10px] font-bold py-0.5">
                        ✓ Ducted AC Included in H3
                      </Badge>
                    )}
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
              <form onSubmit={handleAddCustom} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 space-y-1 w-full">
                    <Label className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                      Item Title / Scope of Work *
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
                      Quoted Price ($) *
                    </Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g. 450, 0, -500"
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
                    disabled={!customName.trim() || customPrice.trim() === ""}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs h-10 px-4 rounded-xl gap-1.5 flex-none cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Variation
                  </Button>
                </div>

                <div className="space-y-1">
                  <Label className={`text-[11px] font-bold uppercase tracking-wider text-slate-400`}>
                    Additional Description / Scope Notes (Optional)
                  </Label>
                  <Input
                    placeholder="Optional details or specification notes for client estimate and PDF..."
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    className={`text-xs h-9 rounded-xl ${
                      isLight
                        ? "bg-slate-50 border-slate-300 text-slate-900"
                        : "bg-slate-950/60 border-slate-800 text-white"
                    }`}
                  />
                </div>
              </form>
            </div>
          )}
        </div>

      {/* SECTION: SELECTED UPGRADES SUMMARY (COMPACT ROWS WITHOUT UNWANTED PLACEHOLDERS) */}
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
              Total: {variationsTotal < 0 ? `-${formatAud(Math.abs(variationsTotal))}` : variationsTotal === 0 ? "$0" : `+${formatAud(variationsTotal)}`}
            </span>
          </div>

          <div className={`divide-y ${isLight ? "divide-slate-200" : "divide-slate-800/60"}`}>
            {activeIncludedItems.map((item) => {
              const isSqm = item.unitType === "sqm";
              const subtotal = item.subtotal ?? (item.unitRate * (item.quantity || 1));
              const hasCustomDesc =
                item.description &&
                item.description.trim() &&
                item.description !== "Custom client variation request" &&
                item.description !== "Client Custom Variation";

              return (
                <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <span className={`font-bold text-xs sm:text-sm truncate block ${isLight ? "text-slate-900" : "text-slate-200"}`}>
                      {item.name}
                    </span>
                    {hasCustomDesc && (
                      <span className="text-[11px] text-slate-400 block truncate mt-0.5 max-w-lg">
                        {item.description}
                      </span>
                    )}
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
                        className="w-16 h-8 rounded-lg text-center font-mono font-bold text-xs"
                      />
                      <span className="text-[11px] text-slate-400 font-bold">m²</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2.5 flex-none">
                    <span
                      className={`font-mono font-extrabold text-xs sm:text-sm ${
                        subtotal < 0
                          ? "text-amber-500"
                          : subtotal === 0
                          ? "text-cyan-500"
                          : isLight
                          ? "text-emerald-700"
                          : "text-emerald-400"
                      }`}
                    >
                      {subtotal < 0
                        ? `-${formatAud(Math.abs(subtotal))}`
                        : subtotal === 0
                        ? "$0 Included"
                        : `+${formatAud(subtotal)}`}
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
              Specify a custom client request, builder variation allowance, or site upgrade. ($0 or negative values for discounts are permitted).
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

            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Additional Description / Scope Notes (Optional)
              </Label>
              <Input
                placeholder="Optional detailed scope description for estimate and PDF..."
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
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
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 450, 0, or -500"
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
                disabled={!customName.trim() || customPrice.trim() === ""}
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
