import React, { useMemo, useState } from "react";
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
  AlertTriangle,
  CheckCheck,
  Eye,
  Info,
  ArrowRightLeft,
  CheckCircle2,
  Calculator,
  Database,
  UploadCloud,
  FileSpreadsheet,
  RefreshCw,
  Sliders,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  DownloadCloud,
  FileDown,
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
import { formatAud } from "@/lib/pricing";
import { useTheme } from "@/lib/theme";
import {
  loadCatalogue,
  loadCustomRates,
  resetCatalogueToDefault,
  saveCatalogue,
  saveCustomRates,
} from "@/lib/quoting/quoteStorage";
import {
  CATEGORY_LABELS,
  findPotentialDuplicates,
  type DuplicatePair,
} from "@/lib/quoting/quoteCatalogue";
import type { CatalogueCategory, CatalogueItem, UnitType } from "@/lib/quoting/quoteTypes";
import {
  loadCostRecipes,
  saveCostRecipes,
  resetCostRecipesToDefault,
  recalculateRecipe,
  syncRecipesToCatalogue,
  type CostRecipe,
  type RecipeComponent,
} from "@/lib/quoting/quoteRecipes";
import {
  parseDatabuildCsv,
  calculateDatabuildSyncReport,
  generateSampleDatabuildCsv,
  type DatabuildPriceItem,
  type DatabuildSyncReport,
} from "@/lib/quoting/databuildSync";

interface QuoteAdminCatalogueProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCatalogueUpdated: () => void;
}

const ADMIN_CATEGORIES: { id: CatalogueCategory | "all" | "duplicates"; label: string }[] = [
  { id: "all", label: "All Items" },
  { id: "duplicates", label: "⚠️ Duplicate Pairs" },
  { id: "floorplan_extensions", label: "Floorplan Extensions" },
  { id: "ceiling_heights", label: "Ceiling Heights" },
  { id: "structural", label: "Structural Modifications" },
  { id: "doors_windows", label: "Doors & Windows" },
  { id: "external", label: "External & Facade Upgrades" },
  { id: "internal_kitchen", label: "Internal - Kitchen" },
  { id: "internal_bathroom", label: "Internal - Bathroom" },
  { id: "internal_bedrooms", label: "Internal - Bedrooms & Storage" },
  { id: "internal_laundry", label: "Internal - Laundry" },
  { id: "colour_upgrades", label: "Electrical, HVAC & Finishes" },
  { id: "site_earthworks", label: "Site & Engineering Reports" },
  { id: "council_statutory", label: "Council & Statutory" },
];

type AdminModalMode = "catalogue" | "recipes" | "databuild";

export function QuoteAdminCatalogue({
  open,
  onOpenChange,
  onCatalogueUpdated,
}: QuoteAdminCatalogueProps) {
  const { mode } = useTheme();
  const isLight = mode === "normal";

  const [adminMode, setAdminMode] = useState<AdminModalMode>("catalogue");
  const [items, setItems] = useState<CatalogueItem[]>(() => loadCatalogue());
  const [customRates, setCustomRates] = useState(() => loadCustomRates());
  const [recipes, setRecipes] = useState<CostRecipe[]>(() => loadCostRecipes());
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(() => recipes[0]?.id || "");

  // Databuild sync states
  const [databuildItems, setDatabuildItems] = useState<DatabuildPriceItem[]>([]);
  const [syncReport, setSyncReport] = useState<DatabuildSyncReport | null>(null);
  const [isParsingCsv, setIsParsingCsv] = useState(false);

  // Filter & Search states
  const [activeCategory, setActiveCategory] = useState<CatalogueCategory | "all" | "duplicates">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [unflaggedPairKeys, setUnflaggedPairKeys] = useState<Set<string>>(new Set());

  // New item form
  const [newItemName, setNewItemName] = useState("");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemCategory, setNewItemCategory] = useState<CatalogueCategory>("structural");
  const [newItemType, setNewItemType] = useState<UnitType>("fixed");
  const [newItemRate, setNewItemRate] = useState<number | "">("");

  // Edit item modal state
  const [editingItem, setEditingItem] = useState<CatalogueItem | null>(null);

  // Duplicate pairs detection
  const duplicatePairs = useMemo(
    () => findPotentialDuplicates(items, unflaggedPairKeys),
    [items, unflaggedPairKeys],
  );

  const activeRecipe = useMemo(
    () => recipes.find((r) => r.id === selectedRecipeId) || recipes[0],
    [recipes, selectedRecipeId],
  );

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

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || newItemRate === "") {
      toast.error("Please provide both an item name and unit rate");
      return;
    }

    const newItem: CatalogueItem = {
      id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: newItemName.trim(),
      description: newItemDesc.trim() || newItemName.trim(),
      category: newItemCategory,
      unitType: newItemType,
      unitRate: Number(newItemRate),
      isClientSelectable: true,
    };

    setItems((prev) => [newItem, ...prev]);
    setNewItemName("");
    setNewItemDesc("");
    setNewItemRate("");
    toast.success(`Added "${newItem.name}" to catalogue`);
  };

  const handleSaveEditingItem = () => {
    if (!editingItem) return;
    setItems((prev) =>
      prev.map((it) => (it.id === editingItem.id ? editingItem : it)),
    );
    toast.success(`Updated "${editingItem.name}"`);
    setEditingItem(null);
  };

  // Recipe updating logic
  const handleUpdateRecipe = (updated: CostRecipe) => {
    const recalculated = recalculateRecipe(updated);
    setRecipes((prev) => prev.map((r) => (r.id === recalculated.id ? recalculated : r)));
  };

  const handleUpdateRecipeComponent = (
    recipeId: string,
    compId: string,
    patch: Partial<RecipeComponent>,
  ) => {
    setRecipes((prev) =>
      prev.map((r) => {
        if (r.id !== recipeId) return r;
        const nextComps = r.components.map((c) => (c.id === compId ? { ...c, ...patch } : c));
        return recalculateRecipe({ ...r, components: nextComps });
      }),
    );
  };

  const handleAddRecipeComponent = (recipeId: string) => {
    const newComp: RecipeComponent = {
      id: `comp_${Date.now()}`,
      databuildCode: "NEW-01",
      name: "New Trade Subcontractor Item",
      tradeCostCentre: "General Trade",
      unit: "$/m²",
      unitCost: 50,
      quantityMultiplier: 1.0,
      notes: "Allowance per unit",
    };
    setRecipes((prev) =>
      prev.map((r) => {
        if (r.id !== recipeId) return r;
        return recalculateRecipe({ ...r, components: [...r.components, newComp] });
      }),
    );
    toast.success("Added new trade component to recipe");
  };

  const handleDeleteRecipeComponent = (recipeId: string, compId: string) => {
    setRecipes((prev) =>
      prev.map((r) => {
        if (r.id !== recipeId) return r;
        return recalculateRecipe({ ...r, components: r.components.filter((c) => c.id !== compId) });
      }),
    );
    toast.success("Component removed from recipe");
  };

  // Push recipe rates into master catalogue
  const handleSyncRecipesToCatalogue = () => {
    const { updatedCatalogue, updatedCount, updatedNames } = syncRecipesToCatalogue(recipes, items);
    setItems(updatedCatalogue);
    saveCatalogue(updatedCatalogue);
    saveCostRecipes(recipes);
    if (updatedCount > 0) {
      toast.success(
        `Synced ${updatedCount} recipe rate(s) into sales catalogue:\n${updatedNames.slice(0, 3).join(", ")}${updatedNames.length > 3 ? "..." : ""}`,
      );
    } else {
      toast.info("All sales catalogue rates are already perfectly synchronized with recipes!");
    }
  };

  // Databuild CSV processing
  const handleProcessCsvContent = (csvText: string, filename?: string) => {
    setIsParsingCsv(true);
    try {
      const { items: parsedItems, errors } = parseDatabuildCsv(csvText);
      if (errors.length > 0 && parsedItems.length === 0) {
        toast.error(errors[0]);
        setIsParsingCsv(false);
        return;
      }
      setDatabuildItems(parsedItems);
      const report = calculateDatabuildSyncReport(parsedItems, recipes);
      setSyncReport(report);
      toast.success(
        `Parsed ${parsedItems.length} Databuild items from ${filename || "file"}. Found ${report.affectedRecipesCount} recipe(s) with rate updates.`,
      );
    } catch (err: any) {
      toast.error("Failed to parse Databuild file: " + (err.message || String(err)));
    } finally {
      setIsParsingCsv(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        handleProcessCsvContent(text, file.name);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleLoadSampleDatabuild = () => {
    const sample = generateSampleDatabuildCsv();
    handleProcessCsvContent(sample, "Hudson_Databuild_Master_PriceBook_2026.csv");
  };

  const handleDownloadSampleCsv = () => {
    const sample = generateSampleDatabuildCsv();
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Hudson_Databuild_Sample_PriceBook.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Downloaded official Databuild sample CSV template");
  };

  const handleApplyDatabuildReport = () => {
    if (!syncReport) return;
    const updatedRecs = syncReport.updatedRecipes;
    setRecipes(updatedRecs);
    saveCostRecipes(updatedRecs);

    // Also auto-sync new calculated rates into master catalogue
    const { updatedCatalogue, updatedCount } = syncRecipesToCatalogue(updatedRecs, items);
    setItems(updatedCatalogue);
    saveCatalogue(updatedCatalogue);

    toast.success(
      `Successfully applied Databuild rates! Updated ${syncReport.affectedRecipesCount} recipe(s) and ${updatedCount} sales catalogue item(s).`,
    );
  };

  const handleSaveAll = () => {
    saveCatalogue(items);
    saveCustomRates(customRates);
    saveCostRecipes(recipes);
    toast.success("Catalogue, custom rates & recipes saved successfully");
    onCatalogueUpdated();
    onOpenChange(false);
  };

  const handleResetDefaults = () => {
    if (confirm("Reset to default catalogue items, recipes, and custom rates? This will restore the full Hudson Homes master list.")) {
      const defCatalogue = resetCatalogueToDefault();
      const defRecipes = resetCostRecipesToDefault();
      setItems(defCatalogue);
      setRecipes(defRecipes);
      setUnflaggedPairKeys(new Set());
      setSyncReport(null);
      toast.success("Catalogue and recipes reset to default templates");
      onCatalogueUpdated();
    }
  };

  const filtered = items.filter((it) => {
    if (activeCategory === "duplicates") {
      return true;
    }
    if (activeCategory !== "all") {
      if (it.category !== activeCategory) return false;
    }

    if (!searchQuery.trim()) return true;
    return (
      it.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      it.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={`max-w-6xl w-[95vw] max-h-[94vh] h-[92vh] flex flex-col backdrop-blur-3xl shadow-2xl p-6 ${
            isLight
              ? "border-slate-200 bg-white/98 text-slate-900 shadow-slate-900/10"
              : "border-slate-800 bg-slate-950/98 text-slate-100"
          }`}
        >
          {/* Header */}
          <DialogHeader className={`border-b ${isLight ? "border-slate-200" : "border-slate-800/80"} pb-3 flex-none`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <DialogTitle className={`text-lg font-bold tracking-wide flex items-center gap-2 ${isLight ? "text-slate-900" : "text-white"}`}>
                  <Shield className="h-5 w-5 text-emerald-600" />
                  Admin Quoting Catalogue &amp; Databuild Rate Engine
                </DialogTitle>
                <p className={`text-xs ${isLight ? "text-slate-600" : "text-slate-400"} mt-0.5`}>
                  Manage sales pricing, parametric cost recipes (assemblies), and sync directly with Databuild.
                </p>
              </div>

              {/* Mode Switcher Tabs */}
              <div className={`flex items-center gap-1 p-1 rounded-xl border ${
                isLight ? "bg-slate-100 border-slate-200" : "bg-slate-900 border-slate-800"
              }`}>
                <button
                  type="button"
                  onClick={() => setAdminMode("catalogue")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    adminMode === "catalogue"
                      ? isLight
                        ? "bg-white text-emerald-900 shadow-xs border border-emerald-300"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : isLight
                      ? "text-slate-600 hover:text-slate-900"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Settings className="h-3.5 w-3.5" />
                  Master Catalogue ({items.length})
                </button>

                <button
                  type="button"
                  onClick={() => setAdminMode("recipes")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    adminMode === "recipes"
                      ? isLight
                        ? "bg-white text-cyan-900 shadow-xs border border-cyan-300"
                        : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                      : isLight
                      ? "text-slate-600 hover:text-slate-900"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Calculator className="h-3.5 w-3.5" />
                  Cost Recipes ({recipes.length})
                </button>

                <button
                  type="button"
                  onClick={() => setAdminMode("databuild")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    adminMode === "databuild"
                      ? isLight
                        ? "bg-white text-amber-900 shadow-xs border border-amber-300"
                        : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : isLight
                      ? "text-slate-600 hover:text-slate-900"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Database className="h-3.5 w-3.5" />
                  Databuild Sync
                  {syncReport && syncReport.affectedRecipesCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </button>
              </div>
            </div>
          </DialogHeader>

          {/* Body Container */}
          <div className="flex-1 overflow-y-auto space-y-6 pr-1 pt-3">
            {/* ========================================================= */}
            {/* MODE 1: MASTER CATALOGUE & RATE ENGINE */}
            {/* ========================================================= */}
            {adminMode === "catalogue" && (
              <div className="space-y-6">
                {/* Duplicate Notice Banner */}
                {duplicatePairs.length > 0 && activeCategory !== "duplicates" && (
                  <div className={`flex items-center justify-between p-3.5 rounded-xl border text-xs ${
                    isLight
                      ? "bg-amber-50 border-amber-300 text-amber-950"
                      : "bg-amber-950/40 border-amber-500/30 text-amber-200"
                  }`}>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 flex-none" />
                      <span>
                        <strong>Duplicate Review:</strong> We flagged {duplicatePairs.length} pair{duplicatePairs.length > 1 ? "s" : ""} of similar items. Review them side-by-side to delete duplicates or unflag to keep both.
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveCategory("duplicates")}
                      className={`h-7 text-xs ${
                        isLight
                          ? "border-amber-400 bg-amber-100 text-amber-900 hover:bg-amber-200"
                          : "border-amber-500/50 bg-amber-900/40 text-amber-200 hover:bg-amber-800/60"
                      }`}
                    >
                      Review {duplicatePairs.length} Pairs
                    </Button>
                  </div>
                )}

                {/* Custom Rates Grid */}
                <div className={`rounded-2xl border p-5 space-y-3 ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-slate-800"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${
                      isLight ? "text-slate-800" : "text-slate-200"
                    }`}>
                      <Layers className={`h-4 w-4 ${isLight ? "text-cyan-700" : "text-cyan-400"}`} />
                      Custom Floorplan Pricing Engine ($/m²)
                    </div>
                    <span className={`text-[11px] ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                      Formula base rates for non-standard custom floorplan calculations
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
                    <div className={`space-y-1 p-2.5 rounded-xl border ${
                      isLight ? "bg-white border-slate-200" : "bg-slate-950/80 border-slate-800/80"
                    }`}>
                      <Label className={`text-[10px] ${isLight ? "text-slate-600" : "text-slate-400"}`}>Single Living (H2)</Label>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-500 font-mono">$</span>
                        <Input
                          type="number"
                          value={customRates.singleGroundLivingM2Rate}
                          onChange={(e) =>
                            handleRateChange("singleGroundLivingM2Rate", Number(e.target.value))
                          }
                          className={`h-8 text-xs font-bold ${
                            isLight ? "border-slate-300 bg-white text-slate-900" : "border-slate-800 bg-slate-900 text-slate-100"
                          }`}
                        />
                        <span className="text-[10px] text-slate-500">/m²</span>
                      </div>
                    </div>

                    <div className={`space-y-1 p-2.5 rounded-xl border ${
                      isLight ? "bg-white border-slate-200" : "bg-slate-950/80 border-slate-800/80"
                    }`}>
                      <Label className={`text-[10px] ${isLight ? "text-slate-600" : "text-slate-400"}`}>Single Living (H3)</Label>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-500 font-mono">$</span>
                        <Input
                          type="number"
                          value={customRates.singleGroundLivingH3M2Rate}
                          onChange={(e) =>
                            handleRateChange("singleGroundLivingH3M2Rate", Number(e.target.value))
                          }
                          className={`h-8 text-xs font-bold ${
                            isLight ? "border-slate-300 bg-white text-slate-900" : "border-slate-800 bg-slate-900 text-slate-100"
                          }`}
                        />
                        <span className="text-[10px] text-slate-500">/m²</span>
                      </div>
                    </div>

                    <div className={`space-y-1 p-2.5 rounded-xl border ${
                      isLight ? "bg-white border-slate-200" : "bg-slate-950/80 border-slate-800/80"
                    }`}>
                      <Label className={`text-[10px] ${isLight ? "text-slate-600" : "text-slate-400"}`}>DS Ground (H2)</Label>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-500 font-mono">$</span>
                        <Input
                          type="number"
                          value={customRates.doubleGroundLivingM2Rate}
                          onChange={(e) =>
                            handleRateChange("doubleGroundLivingM2Rate", Number(e.target.value))
                          }
                          className={`h-8 text-xs font-bold ${
                            isLight ? "border-slate-300 bg-white text-slate-900" : "border-slate-800 bg-slate-900 text-slate-100"
                          }`}
                        />
                        <span className="text-[10px] text-slate-500">/m²</span>
                      </div>
                    </div>

                    <div className={`space-y-1 p-2.5 rounded-xl border ${
                      isLight ? "bg-white border-slate-200" : "bg-slate-950/80 border-slate-800/80"
                    }`}>
                      <Label className={`text-[10px] ${isLight ? "text-slate-600" : "text-slate-400"}`}>DS First Floor (H2)</Label>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-500 font-mono">$</span>
                        <Input
                          type="number"
                          value={customRates.doubleUpperLivingM2Rate}
                          onChange={(e) =>
                            handleRateChange("doubleUpperLivingM2Rate", Number(e.target.value))
                          }
                          className={`h-8 text-xs font-bold ${
                            isLight ? "border-slate-300 bg-white text-slate-900" : "border-slate-800 bg-slate-900 text-slate-100"
                          }`}
                        />
                        <span className="text-[10px] text-slate-500">/m²</span>
                      </div>
                    </div>

                    <div className={`space-y-1 p-2.5 rounded-xl border ${
                      isLight ? "bg-white border-slate-200" : "bg-slate-950/80 border-slate-800/80"
                    }`}>
                      <Label className={`text-[10px] ${isLight ? "text-slate-600" : "text-slate-400"}`}>Garage Footprint</Label>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-500 font-mono">$</span>
                        <Input
                          type="number"
                          value={customRates.garageM2Rate ?? 1400}
                          onChange={(e) =>
                            handleRateChange("garageM2Rate" as any, Number(e.target.value))
                          }
                          className={`h-8 text-xs font-bold ${
                            isLight ? "border-slate-300 bg-white text-slate-900" : "border-slate-800 bg-slate-900 text-slate-100"
                          }`}
                        />
                        <span className="text-[10px] text-slate-500">/m²</span>
                      </div>
                    </div>

                    <div className={`space-y-1 p-2.5 rounded-xl border ${
                      isLight ? "bg-white border-slate-200" : "bg-slate-950/80 border-slate-800/80"
                    }`}>
                      <Label className={`text-[10px] ${isLight ? "text-slate-600" : "text-slate-400"}`}>Porch / Alfresco</Label>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-500 font-mono">$</span>
                        <Input
                          type="number"
                          value={customRates.ancillaryM2Rate}
                          onChange={(e) =>
                            handleRateChange("ancillaryM2Rate", Number(e.target.value))
                          }
                          className={`h-8 text-xs font-bold ${
                            isLight ? "border-slate-300 bg-white text-slate-900" : "border-slate-800 bg-slate-900 text-slate-100"
                          }`}
                        />
                        <span className="text-[10px] text-slate-500">/m²</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Master Catalogue Items Creator & Table */}
                <div className={`rounded-2xl border p-5 space-y-4 ${
                  isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-slate-800"
                }`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${
                      isLight ? "text-slate-800" : "text-slate-200"
                    }`}>
                      <Settings className={`h-4 w-4 ${isLight ? "text-emerald-700" : "text-emerald-400"}`} />
                      Master Variation Items &amp; Allowances ({items.length})
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-full md:w-64">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        type="text"
                        placeholder="Search items or codes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`h-8 pl-8 text-xs ${
                          isLight ? "border-slate-300 bg-white text-slate-900" : "border-slate-800 bg-slate-950 text-slate-100"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    {ADMIN_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategory(cat.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          activeCategory === cat.id
                            ? isLight
                              ? "bg-slate-900 text-white font-bold"
                              : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : isLight
                            ? "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                            : "bg-slate-950/60 border border-slate-800/80 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Add New Item Row */}
                  <form onSubmit={handleAddItem} className={`grid grid-cols-1 md:grid-cols-5 gap-2.5 p-3 rounded-xl border ${
                    isLight ? "bg-white border-slate-200" : "bg-slate-950/60 border-slate-800/80"
                  }`}>
                    <div className="md:col-span-2">
                      <Input
                        placeholder="Item name e.g. Custom Raked Ceiling Extension"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        className={`h-8 text-xs ${
                          isLight ? "border-slate-300 bg-white text-slate-900" : "border-slate-800 bg-slate-900 text-slate-100"
                        }`}
                      />
                    </div>

                    <div>
                      <Select
                        value={newItemCategory}
                        onValueChange={(v: any) => setNewItemCategory(v)}
                      >
                        <SelectTrigger className={`h-8 text-xs ${
                          isLight ? "border-slate-300 bg-white text-slate-900" : "border-slate-800 bg-slate-900 text-slate-200"
                        }`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={isLight ? "bg-white border-slate-200 text-slate-900" : "bg-slate-900 border-slate-800 text-slate-200"}>
                          <SelectItem value="floorplan_extensions">Floorplan Extensions</SelectItem>
                          <SelectItem value="ceiling_heights">Ceiling Heights</SelectItem>
                          <SelectItem value="structural">Structural Modifications</SelectItem>
                          <SelectItem value="doors_windows">Doors &amp; Windows</SelectItem>
                          <SelectItem value="external">External &amp; Facade</SelectItem>
                          <SelectItem value="internal_kitchen">Internal - Kitchen</SelectItem>
                          <SelectItem value="internal_bathroom">Internal - Bathroom</SelectItem>
                          <SelectItem value="internal_bedrooms">Internal - Bedrooms</SelectItem>
                          <SelectItem value="internal_laundry">Internal - Laundry</SelectItem>
                          <SelectItem value="colour_upgrades">Electrical &amp; Finishes</SelectItem>
                          <SelectItem value="site_earthworks">Site &amp; Engineering</SelectItem>
                          <SelectItem value="council_statutory">Council &amp; Statutory</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Select
                        value={newItemType}
                        onValueChange={(v: any) => setNewItemType(v)}
                      >
                        <SelectTrigger className={`h-8 text-xs w-28 ${
                          isLight ? "border-slate-300 bg-white text-slate-900" : "border-slate-800 bg-slate-900 text-slate-200"
                        }`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={isLight ? "bg-white border-slate-200 text-slate-900" : "bg-slate-900 border-slate-800 text-slate-200"}>
                          <SelectItem value="fixed">Fixed</SelectItem>
                          <SelectItem value="per_lm">$/lm</SelectItem>
                          <SelectItem value="per_m2">$/m²</SelectItem>
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        placeholder="Rate $"
                        value={newItemRate}
                        onChange={(e) => setNewItemRate(e.target.value === "" ? "" : Number(e.target.value))}
                        className={`h-8 text-xs ${
                          isLight ? "border-slate-300 bg-white text-slate-900" : "border-slate-800 bg-slate-900 text-emerald-400 font-bold"
                        }`}
                      />
                    </div>

                    <div>
                      <Button
                        type="submit"
                        size="sm"
                        className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Item
                      </Button>
                    </div>
                  </form>

                  {/* Items List Table */}
                  <div className={`rounded-xl border overflow-hidden max-h-[420px] overflow-y-auto ${
                    isLight ? "bg-white border-slate-200" : "bg-slate-950/80 border-slate-800"
                  }`}>
                    <table className="w-full text-xs text-left">
                      <thead className={`sticky top-0 z-10 border-b font-bold uppercase tracking-wider text-[10px] ${
                        isLight ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-slate-900 border-slate-800 text-slate-400"
                      }`}>
                        <tr>
                          <th className="py-2.5 px-3">Item Name &amp; Description</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3 text-right">Unit Rate</th>
                          <th className="py-2.5 px-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {filtered.map((item) => (
                          <tr
                            key={item.id}
                            className={`transition-colors ${
                              isLight ? "hover:bg-slate-50" : "hover:bg-slate-900/40"
                            }`}
                          >
                            <td className="py-2 px-3">
                              <div className={`font-bold ${isLight ? "text-slate-900" : "text-white"}`}>{item.name}</div>
                              <div className={`text-[11px] truncate max-w-md ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                                {item.description}
                              </div>
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                                isLight
                                  ? "bg-slate-100 text-slate-800 border-slate-200"
                                  : "bg-slate-900 text-slate-300 border-slate-800"
                              }`}>
                                {CATEGORY_LABELS[item.category] || item.category}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                              {item.unitType === "per_m2" ? "$/m²" : item.unitType === "per_lm" ? "$/lm" : "Fixed"}
                            </td>
                            <td className="py-2 px-3 text-right whitespace-nowrap font-mono font-bold text-emerald-600">
                              <Input
                                type="number"
                                value={item.unitRate}
                                onChange={(e) => handleItemRateChange(item.id, Number(e.target.value))}
                                className={`h-7 w-24 text-right inline-block text-xs font-bold ${
                                  isLight
                                    ? "border-slate-300 bg-white text-emerald-800"
                                    : "border-slate-800 bg-slate-900 text-emerald-400"
                                }`}
                              />
                            </td>
                            <td className="py-2 px-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setEditingItem(item)}
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-cyan-600"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* MODE 2: COST RECIPES & ASSEMBLIES */}
            {/* ========================================================= */}
            {adminMode === "recipes" && (
              <div className="space-y-6">
                <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isLight ? "bg-cyan-50 border-cyan-200 text-cyan-950" : "bg-cyan-950/40 border-cyan-500/30 text-cyan-200"
                }`}>
                  <div className="flex items-center gap-2.5">
                    <Calculator className={`h-5 w-5 ${isLight ? "text-cyan-700" : "text-cyan-400"} flex-none`} />
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider">
                        Parametric Cost Recipes (Assemblies)
                      </h3>
                      <p className={`text-xs ${isLight ? "text-cyan-900" : "text-cyan-300"}`}>
                        Build composite client rates from trade components (tiling, framing, waterproofing) plus builder margin.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={handleSyncRecipesToCatalogue}
                      className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 shadow-sm"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Sync All Rates to Sales Catalogue
                    </Button>
                  </div>
                </div>

                {/* Master Recipe Selector Pills */}
                <div className="flex flex-wrap gap-2">
                  {recipes.map((r) => {
                    const isSelected = r.id === activeRecipe.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedRecipeId(r.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                          isSelected
                            ? isLight
                              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                              : "bg-cyan-500/20 text-cyan-200 border-cyan-500/50 shadow-sm"
                            : isLight
                            ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <span>{r.name}</span>
                        <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded-full ${
                          isSelected
                            ? "bg-emerald-500 text-slate-950 font-bold"
                            : isLight
                            ? "bg-slate-100 text-slate-700"
                            : "bg-slate-900 text-slate-300"
                        }`}>
                          {formatAud(r.calculatedUnitRate)}
                          {r.unitType === "per_m2" ? "/m²" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Active Recipe Detailed Editor */}
                {activeRecipe && (
                  <div className={`rounded-2xl border p-5 space-y-5 ${
                    isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-slate-800"
                  }`}>
                    {/* Top Recipe Information */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/40 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-cyan-800" : "text-cyan-400"}`}>
                            Assembly Details
                          </span>
                          <span className={isLight ? "text-slate-400" : "text-slate-600"}>·</span>
                          <span className={`text-xs font-mono ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                            Linked Catalogue ID: <code className="font-bold">{activeRecipe.syncedCatalogueItemId || "none"}</code>
                          </span>
                        </div>
                        <h2 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-white"} mt-0.5`}>
                          {activeRecipe.name}
                        </h2>
                      </div>

                      {/* Live Calculated Output Badge */}
                      <div className={`flex items-center gap-4 p-3 rounded-xl border ${
                        isLight ? "bg-white border-slate-200 shadow-sm" : "bg-slate-950 border-slate-800"
                      }`}>
                        <div className="text-right">
                          <div className={`text-[10px] uppercase font-bold tracking-wider ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                            Direct Trade Cost
                          </div>
                          <div className={`text-xs font-mono font-bold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                            {formatAud(activeRecipe.calculatedDirectCost)}
                            {activeRecipe.unitType === "per_m2" ? "/m²" : ""}
                          </div>
                        </div>

                        <ArrowRight className="h-4 w-4 text-slate-400" />

                        <div>
                          <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-600">
                            Client Quoting Rate
                          </div>
                          <div className="text-base font-mono font-bold text-emerald-600">
                            {formatAud(activeRecipe.calculatedUnitRate)}
                            {activeRecipe.unitType === "per_m2" ? " / m²" : " Fixed"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Client-Facing Description */}
                    <div className="space-y-1.5">
                      <Label className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                        Client-Facing Description (Appears on Customer Estimate &amp; PDF)
                      </Label>
                      <Textarea
                        value={activeRecipe.description}
                        onChange={(e) => handleUpdateRecipe({ ...activeRecipe, description: e.target.value })}
                        rows={2}
                        className={`text-xs ${
                          isLight ? "border-slate-300 bg-white text-slate-900" : "border-slate-800 bg-slate-950 text-slate-100"
                        }`}
                      />
                    </div>

                    {/* Trade Components Table */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                          isLight ? "text-slate-800" : "text-slate-200"
                        }`}>
                          <Layers className={`h-3.5 w-3.5 ${isLight ? "text-cyan-700" : "text-cyan-400"}`} />
                          Subcontractor &amp; Trade Components ({activeRecipe.components.length})
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddRecipeComponent(activeRecipe.id)}
                          className={`h-7 text-xs font-bold gap-1 ${
                            isLight
                              ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
                              : "border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800"
                          }`}
                        >
                          <Plus className="h-3 w-3" /> Add Component
                        </Button>
                      </div>

                      <div className={`rounded-xl border overflow-hidden ${
                        isLight ? "bg-white border-slate-200" : "bg-slate-950 border-slate-800"
                      }`}>
                        <table className="w-full text-xs text-left">
                          <thead className={`border-b font-bold uppercase tracking-wider text-[10px] ${
                            isLight ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-slate-900 border-slate-800 text-slate-400"
                          }`}>
                            <tr>
                              <th className="py-2 px-3">Databuild Code</th>
                              <th className="py-2 px-3">Trade / Component</th>
                              <th className="py-2 px-3">Cost Centre</th>
                              <th className="py-2 px-3 text-right">Base Cost ($)</th>
                              <th className="py-2 px-3 text-center">Consumption Mult.</th>
                              <th className="py-2 px-3 text-right">Subtotal</th>
                              <th className="py-2 px-3 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/40">
                            {activeRecipe.components.map((comp) => {
                              const subtotal = Math.round(comp.unitCost * comp.quantityMultiplier * 100) / 100;
                              return (
                                <tr key={comp.id} className={isLight ? "hover:bg-slate-50" : "hover:bg-slate-900/40"}>
                                  <td className="py-2 px-3 font-mono font-bold text-cyan-600">
                                    <Input
                                      value={comp.databuildCode || ""}
                                      onChange={(e) =>
                                        handleUpdateRecipeComponent(activeRecipe.id, comp.id, {
                                          databuildCode: e.target.value.toUpperCase(),
                                        })
                                      }
                                      className={`h-7 w-28 text-xs font-mono font-bold ${
                                        isLight
                                          ? "border-slate-300 bg-white text-cyan-900"
                                          : "border-slate-800 bg-slate-900 text-cyan-300"
                                      }`}
                                    />
                                  </td>
                                  <td className="py-2 px-3">
                                    <Input
                                      value={comp.name}
                                      onChange={(e) =>
                                        handleUpdateRecipeComponent(activeRecipe.id, comp.id, {
                                          name: e.target.value,
                                        })
                                      }
                                      className={`h-7 text-xs ${
                                        isLight
                                          ? "border-slate-300 bg-white text-slate-900"
                                          : "border-slate-800 bg-slate-900 text-slate-100"
                                      }`}
                                    />
                                  </td>
                                  <td className="py-2 px-3">
                                    <Input
                                      value={comp.tradeCostCentre}
                                      onChange={(e) =>
                                        handleUpdateRecipeComponent(activeRecipe.id, comp.id, {
                                          tradeCostCentre: e.target.value,
                                        })
                                      }
                                      className={`h-7 w-32 text-xs ${
                                        isLight
                                          ? "border-slate-300 bg-white text-slate-900"
                                          : "border-slate-800 bg-slate-900 text-slate-300"
                                      }`}
                                    />
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    <Input
                                      type="number"
                                      value={comp.unitCost}
                                      onChange={(e) =>
                                        handleUpdateRecipeComponent(activeRecipe.id, comp.id, {
                                          unitCost: Number(e.target.value),
                                        })
                                      }
                                      className={`h-7 w-20 text-right inline-block text-xs font-mono font-bold ${
                                        isLight
                                          ? "border-slate-300 bg-white text-slate-900"
                                          : "border-slate-800 bg-slate-900 text-slate-100"
                                      }`}
                                    />
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={comp.quantityMultiplier}
                                      onChange={(e) =>
                                        handleUpdateRecipeComponent(activeRecipe.id, comp.id, {
                                          quantityMultiplier: Number(e.target.value),
                                        })
                                      }
                                      className={`h-7 w-20 text-center inline-block text-xs font-mono ${
                                        isLight
                                          ? "border-slate-300 bg-white text-slate-900"
                                          : "border-slate-800 bg-slate-900 text-slate-300"
                                      }`}
                                    />
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono font-bold">
                                    {formatAud(subtotal)}
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteRecipeComponent(activeRecipe.id, comp.id)}
                                      className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Margin & Contingency Sliders */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className={`p-3.5 rounded-xl border space-y-2 ${
                        isLight ? "bg-white border-slate-200" : "bg-slate-950 border-slate-800"
                      }`}>
                        <div className="flex items-center justify-between">
                          <Label className={`text-xs font-bold ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                            Builder Gross Margin %
                          </Label>
                          <span className="font-mono text-xs font-bold text-emerald-600">
                            {activeRecipe.builderMarginPercent}% (+{formatAud(activeRecipe.calculatedDirectCost * (activeRecipe.builderMarginPercent / 100))})
                          </span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="35"
                          step="1"
                          value={activeRecipe.builderMarginPercent}
                          onChange={(e) =>
                            handleUpdateRecipe({ ...activeRecipe, builderMarginPercent: Number(e.target.value) })
                          }
                          className="w-full accent-emerald-600 cursor-pointer"
                        />
                      </div>

                      <div className={`p-3.5 rounded-xl border space-y-2 ${
                        isLight ? "bg-white border-slate-200" : "bg-slate-950 border-slate-800"
                      }`}>
                        <div className="flex items-center justify-between">
                          <Label className={`text-xs font-bold ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                            Site &amp; Waste Contingency %
                          </Label>
                          <span className="font-mono text-xs font-bold text-amber-600">
                            {activeRecipe.contingencyPercent}% (+{formatAud(activeRecipe.calculatedDirectCost * (activeRecipe.contingencyPercent / 100))})
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="0.5"
                          value={activeRecipe.contingencyPercent}
                          onChange={(e) =>
                            handleUpdateRecipe({ ...activeRecipe, contingencyPercent: Number(e.target.value) })
                          }
                          className="w-full accent-amber-600 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* MODE 3: DATABUILD SYNC & INGESTION */}
            {/* ========================================================= */}
            {adminMode === "databuild" && (
              <div className="space-y-6">
                {/* Information Header */}
                <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isLight ? "bg-amber-50 border-amber-200 text-amber-950" : "bg-amber-950/40 border-amber-500/30 text-amber-200"
                }`}>
                  <div className="flex items-center gap-2.5">
                    <Database className={`h-5 w-5 ${isLight ? "text-amber-700" : "text-amber-400"} flex-none`} />
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider">
                        Databuild Price Book Synchronization
                      </h3>
                      <p className={`text-xs ${isLight ? "text-amber-900" : "text-amber-300"}`}>
                        Import trade subcontractor rates directly from Databuild to recalculate your sales recipes automatically.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDownloadSampleCsv}
                      className={`h-8 text-xs font-bold gap-1.5 ${
                        isLight
                          ? "border-amber-400 bg-white text-amber-900 hover:bg-amber-100"
                          : "border-amber-500/50 bg-amber-900/40 text-amber-200 hover:bg-amber-800/60"
                      }`}
                    >
                      <FileDown className="h-3.5 w-3.5" />
                      Download Databuild Sample CSV
                    </Button>

                    <Button
                      size="sm"
                      onClick={handleLoadSampleDatabuild}
                      className="h-8 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white gap-1.5 shadow-sm"
                    >
                      <UploadCloud className="h-3.5 w-3.5" />
                      Load Hudson 2026 Test Export
                    </Button>
                  </div>
                </div>

                {/* Upload Zone */}
                <div className={`rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
                  isLight
                    ? "border-slate-300 bg-slate-50 hover:bg-slate-100"
                    : "border-slate-800 bg-slate-950/60 hover:bg-slate-900/60"
                }`}>
                  <label className="cursor-pointer block space-y-2">
                    <input
                      type="file"
                      accept=".csv,.tsv,.txt"
                      onChange={handleFileUpload}
                      disabled={isParsingCsv}
                      className="hidden"
                    />
                    <FileSpreadsheet className={`h-10 w-10 mx-auto ${isLight ? "text-slate-500" : "text-slate-400"}`} />
                    <div className={`text-sm font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                      {isParsingCsv ? "Processing Databuild file..." : "Drop your Databuild Price Book CSV here or click to browse"}
                    </div>
                    <div className={`text-xs ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                      Supports standard Databuild Price Book exports (.csv or .tsv) with auto-column detection.
                    </div>
                  </label>
                </div>

                {/* Sync Report & Diff */}
                {syncReport && (
                  <div className={`rounded-2xl border p-5 space-y-4 ${
                    isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-slate-800"
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-emerald-800" : "text-emerald-400"}`}>
                          Sync Analysis &amp; Variance Report
                        </span>
                        <h4 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                          {syncReport.affectedRecipesCount} Recipe{syncReport.affectedRecipesCount === 1 ? "" : "s"} Updated by Databuild
                        </h4>
                      </div>

                      <Button
                        size="sm"
                        onClick={handleApplyDatabuildReport}
                        className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5 shadow-sm"
                      >
                        <CheckCheck className="h-4 w-4" />
                        Apply Databuild Rates to Sales Catalogue
                      </Button>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className={`p-3 rounded-xl border ${
                        isLight ? "bg-white border-slate-200" : "bg-slate-950 border-slate-800"
                      }`}>
                        <div className={`text-[10px] uppercase font-bold ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                          Databuild Items
                        </div>
                        <div className="text-base font-mono font-bold text-cyan-600">
                          {syncReport.totalIncomingItems}
                        </div>
                      </div>

                      <div className={`p-3 rounded-xl border ${
                        isLight ? "bg-white border-slate-200" : "bg-slate-950 border-slate-800"
                      }`}>
                        <div className={`text-[10px] uppercase font-bold ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                          Trade Codes Matched
                        </div>
                        <div className="text-base font-mono font-bold text-emerald-600">
                          {syncReport.matchedComponentsCount}
                        </div>
                      </div>

                      <div className={`p-3 rounded-xl border ${
                        isLight ? "bg-white border-slate-200" : "bg-slate-950 border-slate-800"
                      }`}>
                        <div className={`text-[10px] uppercase font-bold ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                          Affected Recipes
                        </div>
                        <div className="text-base font-mono font-bold text-amber-600">
                          {syncReport.affectedRecipesCount}
                        </div>
                      </div>

                      <div className={`p-3 rounded-xl border ${
                        isLight ? "bg-white border-slate-200" : "bg-slate-950 border-slate-800"
                      }`}>
                        <div className={`text-[10px] uppercase font-bold ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                          Trade Variances
                        </div>
                        <div className="text-base font-mono font-bold text-purple-600">
                          {syncReport.componentDiffs.length} trade line(s)
                        </div>
                      </div>
                    </div>

                    {/* Variance Table */}
                    <div className={`rounded-xl border overflow-hidden ${
                      isLight ? "bg-white border-slate-200" : "bg-slate-950 border-slate-800"
                    }`}>
                      <table className="w-full text-xs text-left">
                        <thead className={`border-b font-bold uppercase tracking-wider text-[10px] ${
                          isLight ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-slate-900 border-slate-800 text-slate-400"
                        }`}>
                          <tr>
                            <th className="py-2.5 px-3">Recipe Name</th>
                            <th className="py-2.5 px-3 text-right">Current Sales Rate</th>
                            <th className="py-2.5 px-3 text-right">New Databuild Rate</th>
                            <th className="py-2.5 px-3 text-right">Variance</th>
                            <th className="py-2.5 px-3 text-center">Affected Trades</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {syncReport.recipeDiffs.map((diff) => (
                            <tr key={diff.recipeId} className={isLight ? "hover:bg-slate-50" : "hover:bg-slate-900/40"}>
                              <td className={`py-2 px-3 font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                                {diff.recipeName}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-500">
                                {formatAud(diff.oldUnitRate)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">
                                {formatAud(diff.newUnitRate)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1 font-bold ${
                                  diff.rateDifference >= 0 ? "text-amber-600" : "text-emerald-600"
                                }`}>
                                  {diff.rateDifference >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                  {diff.rateDifference >= 0 ? "+" : ""}{formatAud(diff.rateDifference)} ({diff.ratePercentChange}%)
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center font-mono text-[11px] text-slate-500">
                                {diff.affectedComponentsCount} component(s)
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <DialogFooter className={`border-t ${isLight ? "border-slate-200" : "border-slate-800"} pt-3 flex-none gap-2 flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetDefaults}
                className={`text-xs gap-1.5 ${
                  isLight
                    ? "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100"
                    : "border-rose-500/30 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60"
                }`}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Restore Hudson Master Defaults
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className={`text-xs ${
                  isLight
                    ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
                    : "border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveAll}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 shadow-md shadow-emerald-500/20"
              >
                <Save className="h-3.5 w-3.5" /> Save &amp; Apply All Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single Item Edit Sub-Dialog */}
      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
          <DialogContent className={`max-w-md ${
            isLight ? "border-slate-200 bg-white text-slate-900" : "border-slate-800 bg-slate-950 text-slate-100"
          }`}>
            <DialogHeader>
              <DialogTitle className={`text-sm font-bold flex items-center gap-2 ${isLight ? "text-slate-900" : "text-white"}`}>
                <Pencil className="h-4 w-4 text-cyan-600" />
                Edit Catalogue Item: {editingItem.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label className={`text-xs ${isLight ? "text-slate-600" : "text-slate-400"}`}>Item Name</Label>
                <Input
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className={`text-xs ${isLight ? "border-slate-300 bg-white text-slate-900" : "border-slate-800 bg-slate-900 text-slate-100"}`}
                />
              </div>

              <div className="space-y-1">
                <Label className={`text-xs ${isLight ? "text-slate-600" : "text-slate-400"}`}>Client-Facing Description</Label>
                <Textarea
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  rows={3}
                  className={`text-xs ${isLight ? "border-slate-300 bg-white text-slate-900" : "border-slate-800 bg-slate-900 text-slate-100"}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className={`text-xs ${isLight ? "text-slate-600" : "text-slate-400"}`}>Category</Label>
                  <Select
                    value={editingItem.category}
                    onValueChange={(v: any) => setEditingItem({ ...editingItem, category: v })}
                  >
                    <SelectTrigger className={`text-xs ${isLight ? "border-slate-300 bg-white text-slate-900" : "border-slate-800 bg-slate-900 text-slate-200"}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={isLight ? "bg-white border-slate-200 text-slate-900" : "bg-slate-900 border-slate-800 text-slate-200"}>
                      <SelectItem value="floorplan_extensions">Floorplan Extensions</SelectItem>
                      <SelectItem value="ceiling_heights">Ceiling Heights</SelectItem>
                      <SelectItem value="structural">Structural Modifications</SelectItem>
                      <SelectItem value="doors_windows">Doors &amp; Windows</SelectItem>
                      <SelectItem value="external">External &amp; Facade</SelectItem>
                      <SelectItem value="internal_kitchen">Internal - Kitchen</SelectItem>
                      <SelectItem value="internal_bathroom">Internal - Bathroom</SelectItem>
                      <SelectItem value="internal_bedrooms">Internal - Bedrooms</SelectItem>
                      <SelectItem value="internal_laundry">Internal - Laundry</SelectItem>
                      <SelectItem value="colour_upgrades">Electrical &amp; Finishes</SelectItem>
                      <SelectItem value="site_earthworks">Site &amp; Engineering</SelectItem>
                      <SelectItem value="council_statutory">Council &amp; Statutory</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className={`text-xs ${isLight ? "text-slate-600" : "text-slate-400"}`}>Unit Type</Label>
                  <Select
                    value={editingItem.unitType}
                    onValueChange={(v: any) => setEditingItem({ ...editingItem, unitType: v })}
                  >
                    <SelectTrigger className={`text-xs ${isLight ? "border-slate-300 bg-white text-slate-900" : "border-slate-800 bg-slate-900 text-slate-200"}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className={isLight ? "bg-white border-slate-200 text-slate-900" : "bg-slate-900 border-slate-800 text-slate-200"}>
                      <SelectItem value="fixed">Lump Sum ($)</SelectItem>
                      <SelectItem value="per_lm">Per LM ($/lm)</SelectItem>
                      <SelectItem value="per_m2">Per M2 ($/m²)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className={`text-xs ${isLight ? "text-slate-600" : "text-slate-400"}`}>Unit Rate ($)</Label>
                <Input
                  type="number"
                  value={editingItem.unitRate}
                  onChange={(e) => setEditingItem({ ...editingItem, unitRate: Number(e.target.value) })}
                  className={`text-xs font-bold ${isLight ? "border-slate-300 bg-white text-emerald-800" : "border-slate-800 bg-slate-900 text-emerald-400"}`}
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingItem(null)}
                className={`text-xs ${isLight ? "border-slate-300 bg-white text-slate-800" : "border-slate-800 bg-slate-900 text-slate-300"}`}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEditingItem}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5"
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
