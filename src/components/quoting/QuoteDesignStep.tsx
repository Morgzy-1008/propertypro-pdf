import React, { useState, useRef } from "react";
import {
  Home,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Upload,
  CheckCircle2,
  Tag,
  PenTool,
  Trees,
  Car,
  ExternalLink,
  Check,
  RotateCcw,
  Building2,
  PlusCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ModifiedFloorplanModal } from "./ModifiedFloorplanModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatAud } from "@/lib/pricing";
import { landscapingPriceFor } from "@/lib/landscaping";
import {
  DOUBLE_STOREY_PRICES,
  DUAL_OC_PRICES,
  SINGLE_STOREY_PRICES,
  SPLIT_LEVEL_PRICES,
  type PriceRow,
} from "@/lib/pricelist.data";
import { plansForDesign } from "@/components/flyer/floorplans";
import {
  calculateCustomFloorplanPrice,
  calculateCustomTotalM2,
  calculateModifiedFloorplanPricing,
  getStandardAreaBreakdown,
  getAutomatedPromotionDiscount,
} from "@/lib/quoting/quoteEngine";
import type { InclusionTier, QuoteDesignSelection, SecondDwellingSelection } from "@/lib/quoting/quoteTypes";

interface QuoteDesignStepProps {
  design: QuoteDesignSelection;
  onChange: (patch: Partial<QuoteDesignSelection>) => void;
}

const HOUSING_TYPE_PRICES: Record<string, PriceRow[]> = {
  "Single Storey": SINGLE_STOREY_PRICES,
  "Double Storey": DOUBLE_STOREY_PRICES,
  "Split Level": SPLIT_LEVEL_PRICES,
  "Dual Living": DUAL_OC_PRICES,
  "Granny Flat": [
    { name: "Acacia 60", m2: 60, h1: 154000, h2: 159000, h3: 167000, hbs: 154000 },
    { name: "Banksia 60", m2: 60, h1: 156000, h2: 161000, h3: 169000, hbs: 156000 },
    { name: "Coral 65", m2: 65, h1: 168000, h2: 174000, h3: 182000, hbs: 168000 },
    { name: "Myrtle 70", m2: 70, h1: 178000, h2: 184000, h3: 193000, hbs: 178000 },
    ...DUAL_OC_PRICES,
  ],
};

// Clean titles for Inclusions without paragraph descriptions to save space
export const INCLUSION_TIERS: { id: InclusionTier; label: string; tag: string }[] = [
  {
    id: "H1 Smart Inclusions",
    label: "H1 Smart Inclusions",
    tag: "Essential Value",
  },
  {
    id: "H2 Design Inclusions",
    label: "H2 Design Inclusions",
    tag: "Most Popular",
  },
  {
    id: "H3 Luxury Inclusions",
    label: "H3 Luxury Inclusions",
    tag: "Ultimate Luxury",
  },
];

// Exact facade lists and pricing from official Hudson Homes Price Lists (Single, Double, Split, Dual)
export const HOUSING_FACADES: Record<string, { name: string; uplift: number }[]> = {
  "Single Storey": [
    { name: "Classic", uplift: 0 },
    { name: "Classic Plus", uplift: 4700 },
    { name: "Avoca", uplift: 7200 },
    { name: "Bayside", uplift: 7200 },
    { name: "Breeze", uplift: 7200 },
    { name: "Crest", uplift: 7200 },
    { name: "Executive", uplift: 7200 },
    { name: "Harmony", uplift: 7200 },
    { name: "Banksia", uplift: 9900 },
    { name: "Contemporary", uplift: 9900 },
    { name: "Eden", uplift: 9900 },
    { name: "Infinity", uplift: 9900 },
    { name: "Majestic", uplift: 9900 },
    { name: "Serenity", uplift: 9900 },
    { name: "Elite", uplift: 15300 },
    { name: "Hamptons", uplift: 15300 },
    { name: "Modern Coastal", uplift: 15300 },
    { name: "Riviera", uplift: 15300 },
    { name: "Savoy", uplift: 15300 },
    { name: "Aspen", uplift: 21300 },
    { name: "Chateaux", uplift: 21300 },
    { name: "Coastal", uplift: 21300 },
    { name: "Hillsdale", uplift: 21300 },
    { name: "Pavillion", uplift: 21300 },
    { name: "Sovereign", uplift: 21300 },
    { name: "Statesman", uplift: 21300 },
    { name: "Avalon", uplift: 25900 },
    { name: "Havanna", uplift: 25900 },
    { name: "Newport", uplift: 25900 },
    { name: "Imperial", uplift: 28400 },
    { name: "Merlot", uplift: 28400 },
    { name: "Modern Barn", uplift: 28400 },
    { name: "Modern Box", uplift: 28400 },
    { name: "Modern Farmhouse Option B", uplift: 28400 },
    { name: "Nuvo", uplift: 28400 },
    { name: "Regal", uplift: 28400 },
    { name: "Veinna", uplift: 28400 },
    { name: "Vogue", uplift: 28400 },
    { name: "Vibe", uplift: 37700 },
    { name: "Visage", uplift: 37700 },
  ],
  "Double Storey": [
    { name: "Classic", uplift: 0 },
    { name: "Classic Plus", uplift: 5900 },
    { name: "Breeze", uplift: 12300 },
    { name: "Deco", uplift: 12300 },
    { name: "Oxford", uplift: 12300 },
    { name: "Windsor", uplift: 12300 },
    { name: "Allure", uplift: 14000 },
    { name: "Novare", uplift: 14000 },
    { name: "Contemporary", uplift: 16300 },
    { name: "Majestic", uplift: 16300 },
    { name: "Mantra", uplift: 16300 },
    { name: "Marina", uplift: 16300 },
    { name: "Ashton", uplift: 24700 },
    { name: "Mondo", uplift: 24700 },
    { name: "Vista", uplift: 24700 },
    { name: "Cambridge", uplift: 24800 },
    { name: "Chateaux", uplift: 24800 },
    { name: "Monash", uplift: 24800 },
    { name: "Hamptons", uplift: 27400 },
    { name: "Aspen", uplift: 32700 },
    { name: "Madison", uplift: 32700 },
    { name: "Mocha Hamptons", uplift: 32700 },
    { name: "Modern Box", uplift: 32700 },
    { name: "Modern Coastal", uplift: 32700 },
    { name: "Statesman", uplift: 32700 },
    { name: "Modern Barn", uplift: 34900 },
    { name: "Chateaux (with Balcony)", uplift: 38900 },
    { name: "Delta", uplift: 38900 },
    { name: "Hamptons (with Balcony)", uplift: 38900 },
    { name: "Riviera", uplift: 38900 },
    { name: "Sierra", uplift: 38900 },
    { name: "Deluxe", uplift: 39000 },
    { name: "Grande", uplift: 39000 },
    { name: "Royale", uplift: 39000 },
    { name: "Saville", uplift: 39000 },
    { name: "Modern Farmhouse Option B", uplift: 41900 },
    { name: "Mocha Hamptons (with Balcony)", uplift: 44400 },
    { name: "Modern Classical", uplift: 50900 },
    { name: "Ascot", uplift: 53400 },
    { name: "Centro", uplift: 53400 },
    { name: "Como", uplift: 53400 },
    { name: "Flair", uplift: 53400 },
    { name: "Meridian", uplift: 53400 },
    { name: "Soho", uplift: 53400 },
    { name: "Vista (with Balcony)", uplift: 53400 },
    { name: "Metro", uplift: 53500 },
    { name: "Nuvo", uplift: 53500 },
    { name: "Regal", uplift: 53500 },
    { name: "Tempo", uplift: 53500 },
    { name: "Vogue", uplift: 53500 },
    { name: "Reed", uplift: 86100 },
    { name: "Clarence", uplift: 89200 },
  ],
  "Split Level": [
    { name: "Classic", uplift: 0 },
    { name: "Classic Plus", uplift: 5200 },
    { name: "Contemporary", uplift: 14500 },
    { name: "Hamptons", uplift: 22800 },
    { name: "Modern Coastal", uplift: 22800 },
    { name: "Modern Barn", uplift: 29500 },
    { name: "Vogue", uplift: 38900 },
  ],
  "Dual Living": [
    { name: "Classic", uplift: 0 },
    { name: "Classic Plus", uplift: 6500 },
    { name: "Madison", uplift: 18500 },
    { name: "Marina", uplift: 22000 },
    { name: "Vista", uplift: 29500 },
    { name: "Brixton", uplift: 80900 },
    { name: "Modena", uplift: 86100 },
    { name: "Cranbrook", uplift: 96400 },
    { name: "Bronte", uplift: 105600 },
    { name: "Woodlands", uplift: 105600 },
    { name: "Mayfield", uplift: 113800 },
  ],
};

export function QuoteDesignStep({ design, onChange }: QuoteDesignStepProps) {
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [isSecondCropperOpen, setIsSecondCropperOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const models = HOUSING_TYPE_PRICES[design.housingType] || SINGLE_STOREY_PRICES;
  const currentModel = models.find((m) => m.name === design.designName);

  const customSpec = design.customSpec || {
    groundLivingM2: 0,
    firstLivingM2: 0,
    garageM2: 0,
    alfrescoM2: 0,
    porchM2: 0,
    balconyM2: 0,
    storeys: "single" as const,
    groundRateM2: 1580,
    upperRateM2: 2050,
    ancillaryRateM2: 1050,
    scaffoldingAllowance: 8500,
  };

  const isDouble =
    design.mode === "custom_floorplan"
      ? customSpec.storeys === "double"
      : design.housingType === "Double Storey" || design.housingType === "double";

  const standardPlans = design.designName ? plansForDesign(design.designName) : [];
  const standardFloorplanUrl = standardPlans[0]?.url || "";
  const activeFloorplanUrl = design.floorplanUrl || standardFloorplanUrl;

  const suitableFacades = HOUSING_FACADES[design.housingType] || HOUSING_FACADES["Single Storey"];

  // 2nd Dwelling or Granny Flat Helpers
  const secondDwelling: SecondDwellingSelection = design.secondDwelling || {
    enabled: false,
    housingType: "Granny Flat",
    designName: "Acacia 60",
    designM2: 60,
    facadeName: "Classic",
    facadePrice: 0,
    specTier: "H1 Smart Inclusions",
    basePrice: 154000,
    beds: "2",
    baths: "1",
    cars: "0",
    widthM: "8.5m",
    lengthM: "8.5m",
    standardAreas: { livingM2: 52, porchM2: 4, alfrescoM2: 4, totalM2: 60 },
    modifiedAreas: { livingM2: 52, porchM2: 4, alfrescoM2: 4, totalM2: 60 },
  };

  const secondModels = HOUSING_TYPE_PRICES[secondDwelling.housingType] || HOUSING_TYPE_PRICES["Granny Flat"] || SINGLE_STOREY_PRICES;
  const currentSecondModel = secondModels.find((m) => m.name === secondDwelling.designName) || secondModels[0];
  const secondSuitableFacades = HOUSING_FACADES[secondDwelling.housingType] || HOUSING_FACADES["Single Storey"];
  const secondStandardPlans = secondDwelling.designName ? plansForDesign(secondDwelling.designName) : [];
  const secondStandardFloorplanUrl = secondStandardPlans[0]?.url || "";
  const activeSecondFloorplanUrl = secondDwelling.floorplanUrl || secondStandardFloorplanUrl;

  const handleToggleSecondDwelling = (enabled: boolean) => {
    if (enabled && (!design.secondDwelling || !design.secondDwelling.designName)) {
      const defaultModel = HOUSING_TYPE_PRICES["Granny Flat"][0] || { name: "Acacia 60", m2: 60, h1: 154000 };
      const defaultTier: InclusionTier = "H1 Smart Inclusions";
      const defaultPrice = defaultModel.h1 || 154000;
      const defaultStdAreas = { livingM2: 52, porchM2: 4, alfrescoM2: 4, totalM2: 60 };
      onChange({
        hasSecondDwelling: true,
        secondDwelling: {
          enabled: true,
          housingType: "Granny Flat",
          designName: defaultModel.name,
          designM2: defaultModel.m2,
          standardDesignM2: defaultModel.m2,
          standardBasePrice: defaultPrice,
          basePrice: defaultPrice,
          facadeName: "Classic",
          facadePrice: 0,
          specTier: defaultTier,
          standardAreas: defaultStdAreas,
          modifiedAreas: defaultStdAreas,
          isModifiedFloorplan: false,
          beds: "2",
          baths: "1",
          cars: "0",
          widthM: "8.5m",
          lengthM: "8.5m",
        },
      });
    } else {
      onChange({
        hasSecondDwelling: enabled,
        secondDwelling: {
          ...secondDwelling,
          enabled,
        },
      });
    }
  };

  const handleSecondDwellingHousingTypeChange = (type: SecondDwellingSelection["housingType"]) => {
    const typeModels = HOUSING_TYPE_PRICES[type] || HOUSING_TYPE_PRICES["Granny Flat"];
    const firstModel = typeModels[0];
    const stdPrice = firstModel.h1 || firstModel.hbs || 154000;
    const stdAreas = getStandardAreaBreakdown(firstModel.name, type === "Double Storey" ? "Double Storey" : "Single Storey", firstModel.m2);
    const plans = plansForDesign(firstModel.name);

    onChange({
      secondDwelling: {
        ...secondDwelling,
        housingType: type,
        designName: firstModel.name,
        designM2: firstModel.m2,
        standardDesignM2: firstModel.m2,
        standardBasePrice: stdPrice,
        basePrice: stdPrice,
        standardAreas: stdAreas,
        modifiedAreas: stdAreas,
        isModifiedFloorplan: false,
        floorplanUrl: plans[0]?.url || "",
        beds: plans[0]?.beds || "2",
        baths: plans[0]?.baths || "1",
        cars: plans[0]?.cars || "0",
        widthM: plans[0]?.width || "8.5m",
        lengthM: plans[0]?.depth || "8.5m",
      },
    });
  };

  const handleSecondDwellingModelChange = (modelName: string) => {
    const m = secondModels.find((x) => x.name === modelName);
    if (!m) return;

    const plans = plansForDesign(m.name);
    const floorplanUrl = plans[0]?.url || "";
    let basePrice = m.h1 || m.hbs || 154000;
    if (secondDwelling.specTier === "H2 Design Inclusions") basePrice = m.h2 || basePrice;
    if (secondDwelling.specTier === "H3 Luxury Inclusions") basePrice = m.h3 || basePrice;
    const stdAreas = getStandardAreaBreakdown(m.name, secondDwelling.housingType === "Double Storey" ? "Double Storey" : "Single Storey", m.m2);

    onChange({
      secondDwelling: {
        ...secondDwelling,
        designName: m.name,
        designM2: m.m2,
        standardDesignM2: m.m2,
        standardBasePrice: basePrice,
        basePrice,
        standardAreas: stdAreas,
        modifiedAreas: stdAreas,
        isModifiedFloorplan: false,
        floorplanUrl,
        beds: plans[0]?.beds || "2",
        baths: plans[0]?.baths || "1",
        cars: plans[0]?.cars || "0",
        widthM: plans[0]?.width || "8.5m",
        lengthM: plans[0]?.depth || "8.5m",
      },
    });
  };

  const handleSecondDwellingTierChange = (tier: InclusionTier) => {
    let basePrice = currentSecondModel?.h1 || currentSecondModel?.hbs || 154000;
    if (tier === "H2 Design Inclusions") basePrice = currentSecondModel?.h2 || basePrice;
    if (tier === "H3 Luxury Inclusions") basePrice = currentSecondModel?.h3 || basePrice;
    onChange({
      secondDwelling: {
        ...secondDwelling,
        specTier: tier,
        standardBasePrice: basePrice,
        basePrice,
      },
    });
  };

  const getTierPrice = (
    model: PriceRow | undefined,
    tier: InclusionTier,
    housingType: string = design.housingType,
  ): number => {
    if (!model) return 0;
    let raw = 0;
    if (tier === "H3 Luxury Inclusions" || tier === "H3 Inclusions (2025)") {
      raw = model.h3 || model.hbs || 0;
    } else if (tier === "H2 Design Inclusions" || tier === "H2 Inclusions (2025)") {
      raw = model.h2 || model.hbs || 0;
    } else if (tier === "H1 Smart Inclusions" || tier === "H1 Inclusions (2025)") {
      raw = model.h1 || model.hbs || 0;
    } else {
      raw = model.hbs || 0;
    }

    // For Duplex and Dual Occ plans:
    // They are already priced with the discount in the base price, so increase the base price
    // by that discount amount + $5,000 extra buffer (so every design has a $5k buffer).
    if (housingType === "Dual Living" || model.name.includes(" - TD") || model.name.includes(" - SD")) {
      const discount = getAutomatedPromotionDiscount(model.m2);
      return raw + discount + 5000;
    }

    return raw;
  };

  const handleHousingTypeChange = (type: QuoteDesignSelection["housingType"]) => {
    onChange({
      housingType: type,
      designName: "",
      designM2: 0,
      basePrice: 0,
      standardDesignM2: 0,
      standardBasePrice: 0,
      modifiedDesignM2: 0,
      standardAreas: undefined,
      modifiedAreas: undefined,
      isModifiedFloorplan: false,
      facadeName: "",
      facadePrice: 0,
      isCustomFacade: false,
      promotionsDiscount: 0,
      floorplanUrl: "",
      beds: "",
      baths: "",
      cars: "",
      widthM: "",
      lengthM: "",
    });
  };

  const handleDesignModelChange = (modelName: string) => {
    const m = models.find((x) => x.name === modelName);
    if (!m) return;

    const plans = plansForDesign(m.name);
    const floorplanUrl = plans[0]?.url || "";
    const basePrice = getTierPrice(m, design.specTier, design.housingType);
    const defaultFacade = suitableFacades[0] || { name: "Classic", uplift: 0 };
    const stdAreas = getStandardAreaBreakdown(m.name, design.housingType, m.m2);

    let effectiveM2 = m.m2;
    let effectiveBasePrice = basePrice;
    let updatedModifiedAreas = design.isModifiedFloorplan ? { ...stdAreas } : undefined;

    if (design.isModifiedFloorplan) {
      const tempDesign: QuoteDesignSelection = {
        ...design,
        designName: m.name,
        designM2: m.m2,
        standardDesignM2: m.m2,
        standardBasePrice: basePrice,
        standardAreas: stdAreas,
        modifiedAreas: updatedModifiedAreas,
      };
      const pricing = calculateModifiedFloorplanPricing(tempDesign);
      effectiveM2 = pricing.modifiedTotalM2;
      effectiveBasePrice = pricing.modifiedBasePrice;
    }
    const autoDiscount = getAutomatedPromotionDiscount(effectiveM2);

    onChange({
      designName: m.name,
      designM2: m.m2,
      standardDesignM2: m.m2,
      standardBasePrice: basePrice,
      standardAreas: stdAreas,
      modifiedAreas: updatedModifiedAreas,
      modifiedDesignM2: effectiveM2,
      basePrice: effectiveBasePrice,
      facadeName: design.facadeName || defaultFacade.name,
      facadePrice: design.facadeName ? design.facadePrice : defaultFacade.uplift,
      promotionsDiscount: autoDiscount,
      promotionName: design.promotionName || "Hudson Special Builder Promotion",
      floorplanUrl,
      beds: plans[0]?.beds || "4",
      baths: plans[0]?.baths || "2",
      cars: plans[0]?.cars || "2",
      widthM: plans[0]?.width || "14.0m",
      lengthM: plans[0]?.depth || "22.0m",
    });
  };

  const handleTierChange = (tier: InclusionTier) => {
    const stdPrice = currentModel ? getTierPrice(currentModel, tier, design.housingType) : 0;
    let effectiveBasePrice = stdPrice;
    if (design.isModifiedFloorplan && currentModel) {
      const tempDesign: QuoteDesignSelection = {
        ...design,
        specTier: tier,
        standardBasePrice: stdPrice,
      };
      effectiveBasePrice = calculateModifiedFloorplanPricing(tempDesign).modifiedBasePrice;
    }
    onChange({ specTier: tier, standardBasePrice: stdPrice, basePrice: effectiveBasePrice });
  };

  const handleToggleModifiedFloorplan = (enabled: boolean) => {
    if (!currentModel) {
      toast.error("Please select a home design model first.");
      return;
    }
    if (enabled) {
      const stdM2 = design.standardDesignM2 || currentModel.m2;
      const stdPrice = design.standardBasePrice || getTierPrice(currentModel, design.specTier, design.housingType);
      const stdAreas = getStandardAreaBreakdown(currentModel.name, design.housingType, stdM2);
      const initialModifiedAreas = { ...stdAreas, ...(design.modifiedAreas || {}) };

      const tempDesign: QuoteDesignSelection = {
        ...design,
        isModifiedFloorplan: true,
        standardDesignM2: stdM2,
        standardBasePrice: stdPrice,
        standardAreas: stdAreas,
        modifiedAreas: initialModifiedAreas,
      };

      const pricing = calculateModifiedFloorplanPricing(tempDesign);
      const autoDiscount = getAutomatedPromotionDiscount(pricing.modifiedTotalM2);

      onChange({
        isModifiedFloorplan: true,
        standardDesignM2: stdM2,
        standardBasePrice: stdPrice,
        standardAreas: stdAreas,
        modifiedAreas: initialModifiedAreas,
        modifiedDesignM2: pricing.modifiedTotalM2,
        basePrice: pricing.modifiedBasePrice,
        promotionsDiscount: autoDiscount,
      });
      toast.success(`Modified floorplan enabled for ${currentModel.name}! You can adjust individual room & zone SQMs.`);
    } else {
      const stdM2 = design.standardDesignM2 || currentModel.m2;
      const stdPrice = design.standardBasePrice || getTierPrice(currentModel, design.specTier, design.housingType);
      const autoDiscount = getAutomatedPromotionDiscount(stdM2);

      onChange({
        isModifiedFloorplan: false,
        designM2: stdM2,
        modifiedDesignM2: 0,
        basePrice: stdPrice,
        promotionsDiscount: autoDiscount,
        modifiedAreas: undefined,
      });
      toast.info(`Reverted to standard ${currentModel.name} floorplan sizing.`);
    }
  };

  const handleZoneAreaChange = (zoneKey: string, val: string) => {
    const numVal = parseFloat(val);
    const stdM2 = design.standardDesignM2 || (currentModel ? currentModel.m2 : design.designM2) || 198.08;
    const currentStd = getStandardAreaBreakdown(design.designName, design.housingType, stdM2);

    const updatedModifiedAreas = {
      ...currentStd,
      ...(design.modifiedAreas || {}),
      [zoneKey]: isNaN(numVal) ? 0 : Math.max(0, numVal),
    };

    const tempDesign: QuoteDesignSelection = {
      ...design,
      isModifiedFloorplan: true,
      standardDesignM2: stdM2,
      standardAreas: currentStd,
      modifiedAreas: updatedModifiedAreas,
    };

    const pricing = calculateModifiedFloorplanPricing(tempDesign);
    const autoDiscount = getAutomatedPromotionDiscount(pricing.modifiedTotalM2);

    onChange({
      isModifiedFloorplan: true,
      standardDesignM2: stdM2,
      standardAreas: currentStd,
      modifiedAreas: updatedModifiedAreas,
      modifiedDesignM2: pricing.modifiedTotalM2,
      basePrice: pricing.modifiedBasePrice,
      promotionsDiscount: autoDiscount,
    });
  };

  const handleResetModifiedAreas = () => {
    const stdM2 = design.standardDesignM2 || (currentModel ? currentModel.m2 : design.designM2) || 198.08;
    const stdAreas = getStandardAreaBreakdown(design.designName, design.housingType, stdM2);
    const tempDesign: QuoteDesignSelection = {
      ...design,
      isModifiedFloorplan: true,
      standardAreas: stdAreas,
      modifiedAreas: { ...stdAreas },
    };
    const pricing = calculateModifiedFloorplanPricing(tempDesign);
    onChange({
      modifiedAreas: { ...stdAreas },
      modifiedDesignM2: pricing.modifiedTotalM2,
      basePrice: pricing.modifiedBasePrice,
    });
    toast.info("Room dimensions reset to standard design baseline.");
  };

  const handleFacadeSelect = (facadeName: string) => {
    if (facadeName === "CUSTOM_FACADE") {
      onChange({
        isCustomFacade: true,
        facadeName: "Custom Architectural Facade",
        facadePrice: design.facadePrice || 5000,
      });
    } else {
      const match = suitableFacades.find((f) => f.name === facadeName);
      onChange({
        isCustomFacade: false,
        facadeName,
        facadePrice: match ? match.uplift : 0,
      });
    }
  };

  const handleCustomFloorplanUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onChange({ floorplanUrl: url });
    }
  };

  const handleCustomSpecChange = (field: keyof typeof customSpec, val: any) => {
    const updated = { ...customSpec, [field]: val };
    const calculatedBase = calculateCustomFloorplanPrice(updated);
    const totalM2 = calculateCustomTotalM2(updated);
    const autoDiscount = getAutomatedPromotionDiscount(totalM2);
    onChange({
      customSpec: updated,
      basePrice: calculatedBase,
      designM2: totalM2,
      promotionsDiscount: autoDiscount,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Home className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">
              Step 2: House Design &amp; Architectural Specifications
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Select a Hudson home design and tailored inclusions, or calculate custom floorplan dimensions.
          </p>
        </div>

        {/* 2 Design Mode Tabs */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start">
          {[
            { id: "standard", label: "Standard Design" },
            { id: "custom_floorplan", label: "Custom Floorplan (m²)" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange({ mode: tab.id as any })}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                design.mode === tab.id
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-md font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* MODE 1: STANDARD HUDSON DESIGN */}
      {design.mode === "standard" && (
        <div className="space-y-6">
          {/* Housing Type & Model Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Housing Type</Label>
              <Select
                value={design.housingType}
                onValueChange={(v: any) => handleHousingTypeChange(v)}
              >
                <SelectTrigger className="border-slate-800 bg-slate-950/70 text-xs text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                  <SelectItem value="Single Storey">Single Storey</SelectItem>
                  <SelectItem value="Double Storey">Double Storey</SelectItem>
                  <SelectItem value="Split Level">Split Level</SelectItem>
                  <SelectItem value="Dual Living">Dual Living / Duplex</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Home Design Model</Label>
              <Select
                value={design.designName || "UNSELECTED"}
                onValueChange={(v) => v !== "UNSELECTED" && handleDesignModelChange(v)}
              >
                <SelectTrigger className={`border-slate-800 text-xs ${!design.designName ? "bg-slate-950/90 text-amber-400 border-amber-500/40 font-semibold" : "bg-slate-950/70 text-slate-200"}`}>
                  <SelectValue placeholder="Select a Home Design..." />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-900 text-slate-200 max-h-64">
                  <SelectItem value="UNSELECTED" disabled>
                    -- Select a Home Design Model --
                  </SelectItem>
                  {models.map((m) => (
                    <SelectItem key={m.name} value={m.name}>
                      {m.name} — {m.m2} m² ({formatAud(getTierPrice(m, design.specTier))})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">
                {design.isModifiedFloorplan ? "Total Floor Area (Modified)" : "Total Floor Area"}
              </Label>
              <Input
                readOnly
                value={
                  (design.isModifiedFloorplan && design.modifiedDesignM2 ? design.modifiedDesignM2 : design.designM2) > 0
                    ? `${design.isModifiedFloorplan && design.modifiedDesignM2 ? design.modifiedDesignM2 : design.designM2} m² (${(((design.isModifiedFloorplan && design.modifiedDesignM2 ? design.modifiedDesignM2 : design.designM2)) * 0.107639).toFixed(1)} sq)`
                    : "— Select design model —"
                }
                className={`border-slate-800 text-xs font-medium cursor-not-allowed ${
                  design.isModifiedFloorplan
                    ? "bg-emerald-950/30 text-emerald-300 border-emerald-500/40 font-bold"
                    : "bg-slate-950/50 text-slate-400"
                }`}
              />
            </div>
          </div>

          {/* Modified Design / Floorplan SQM Adjustment Control */}
          {design.designName && currentModel && (
            <div
              className={`rounded-2xl border p-4 transition-all ${
                design.isModifiedFloorplan
                  ? "border-emerald-500/80 bg-gradient-to-r from-emerald-950/40 via-slate-900/90 to-slate-950 ring-1 ring-emerald-500/40 shadow-xl"
                  : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    onClick={() => handleToggleModifiedFloorplan(!design.isModifiedFloorplan)}
                    className={`cursor-pointer p-2.5 rounded-xl border transition-all mt-0.5 ${
                      design.isModifiedFloorplan
                        ? "bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-lg shadow-emerald-500/20"
                        : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    <PenTool className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">
                        {design.isModifiedFloorplan ? "✓ Modified Floorplan Active" : "Modified Floorplan / Custom Area Sizing"}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          design.isModifiedFloorplan
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {design.isModifiedFloorplan ? `${design.designName} Modified` : "Personalized Area Sizing"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Personalize individual room, garage, alfresco, and porch dimensions. Rates automate per Hudson schedule with 80% credit on reductions.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleToggleModifiedFloorplan(!design.isModifiedFloorplan)}
                  className={`text-xs font-bold gap-1.5 shrink-0 ${
                    design.isModifiedFloorplan
                      ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                  }`}
                >
                  {design.isModifiedFloorplan ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> Modified Active
                    </>
                  ) : (
                    <>
                      <PenTool className="h-3.5 w-3.5" /> Modify Floorplan Areas
                    </>
                  )}
                </Button>
              </div>

              {/* Expanded Adjusted Floorplan Room by Room Breakdown & Visual Graph */}
              {design.isModifiedFloorplan && (() => {
                const modCalc = calculateModifiedFloorplanPricing(design);
                const maxZoneM2 = Math.max(...modCalc.zones.map((z) => Math.max(z.standardM2, z.modifiedM2)), 1);

                return (
                  <div className="mt-4 pt-4 border-t border-slate-800/90 space-y-4">
                    {/* Header & Subtitle */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-emerald-400" />
                          Room &amp; Zone Area Sizing Schedule
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Adjust individual areas below. Base rates calculate per Hudson schedule (reductions credited at 80%).
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleResetModifiedAreas}
                        className="h-7 text-[10px] border-slate-700 bg-slate-900 text-slate-300 hover:text-white gap-1 self-start sm:self-auto"
                      >
                        <RotateCcw className="h-3 w-3" /> Reset to Standard Areas
                      </Button>
                    </div>

                    {/* Interactive Table of Room Zones */}
                    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-900/90 text-[10px] uppercase font-bold text-slate-400">
                            <th className="py-2.5 px-3">Area / Zone</th>
                            <th className="py-2.5 px-3 text-center">Standard Size</th>
                            <th className="py-2.5 px-3 text-center min-w-[130px]">Modified Size (m²)</th>
                            <th className="py-2.5 px-3 text-center">Variance (Δ)</th>
                            <th className="py-2.5 px-3 text-right">Schedule Rate</th>
                            <th className="py-2.5 px-3 text-right">Cost Adjustment</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                          {modCalc.zones.map((z) => {
                            return (
                              <tr key={z.key} className="hover:bg-slate-900/40 transition-colors">
                                {/* Zone Name & Visual Bar */}
                                <td className="py-2.5 px-3 font-sans">
                                  <div className="font-bold text-slate-200 text-xs">{z.label}</div>
                                  {/* Mini proportional comparison bar */}
                                  <div className="w-28 bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5 flex">
                                    <div
                                      className="bg-emerald-500/80 h-full transition-all"
                                      style={{ width: `${Math.min(100, (z.modifiedM2 / maxZoneM2) * 100)}%` }}
                                      title={`Modified: ${z.modifiedM2} m² (Standard: ${z.standardM2} m²)`}
                                    />
                                  </div>
                                </td>

                                {/* Standard Brochure Size */}
                                <td className="py-2.5 px-3 text-center text-slate-400">
                                  <span className="bg-slate-900 px-2 py-1 rounded border border-slate-800 text-[11px]">
                                    {z.standardM2.toFixed(2)} m²
                                  </span>
                                </td>

                                {/* Interactive Modified Size Input */}
                                <td className="py-2 px-3 text-center">
                                  <div className="relative inline-flex items-center">
                                    <Input
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      max="500"
                                      value={z.modifiedM2}
                                      onChange={(e) => handleZoneAreaChange(z.key, e.target.value)}
                                      className={`h-8 w-28 text-center text-xs font-mono font-bold bg-slate-900 transition-all ${
                                        z.deltaM2 !== 0
                                          ? "border-emerald-500/70 text-emerald-300 ring-1 ring-emerald-500/30"
                                          : "border-slate-700 text-white"
                                      }`}
                                    />
                                    <span className="absolute right-2 text-[10px] text-slate-500 font-sans pointer-events-none">
                                      m²
                                    </span>
                                  </div>
                                </td>

                                {/* Variance (Δ m²) */}
                                <td className="py-2.5 px-3 text-center">
                                  {z.deltaM2 > 0 ? (
                                    <span className="inline-flex items-center gap-0.5 text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded text-[11px]">
                                      +{z.deltaM2.toFixed(2)} m²
                                    </span>
                                  ) : z.deltaM2 < 0 ? (
                                    <span
                                      className="inline-flex items-center gap-0.5 text-amber-400 font-bold bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded text-[11px]"
                                      title="Reduction credited at 80%"
                                    >
                                      {z.deltaM2.toFixed(2)} m²
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 text-[11px]">0.00 m²</span>
                                  )}
                                </td>

                                {/* Rate ($/m²) */}
                                <td className="py-2.5 px-3 text-right text-slate-300 font-sans text-xs">
                                  <div>{formatAud(z.ratePerM2)}/m²</div>
                                  {z.deltaM2 < 0 && (
                                    <span className="text-[9px] text-amber-400/90 block font-mono">
                                      (80% credit = {formatAud(Math.round(z.ratePerM2 * 0.8))}/m²)
                                    </span>
                                  )}
                                </td>

                                {/* Cost Adjustment */}
                                <td className="py-2.5 px-3 text-right font-bold">
                                  {z.costAdjustment > 0 ? (
                                    <span className="text-emerald-400 font-mono">+{formatAud(z.costAdjustment)}</span>
                                  ) : z.costAdjustment < 0 ? (
                                    <span className="text-amber-400 font-mono">-{formatAud(Math.abs(z.costAdjustment))}</span>
                                  ) : (
                                    <span className="text-slate-500 font-mono">$0</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>

                        {/* Table Footer Total Row */}
                        <tfoot>
                          <tr className="border-t-2 border-slate-700 bg-slate-900/95 font-bold text-xs">
                            <td className="py-3 px-3 text-white font-sans flex items-center gap-1.5">
                              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                              <span>Total Floor Area (All Zones)</span>
                            </td>
                            <td className="py-3 px-3 text-center text-slate-400 font-mono">
                              {modCalc.standardTotalM2.toFixed(2)} m²
                            </td>
                            <td className="py-3 px-3 text-center text-emerald-300 font-mono font-extrabold text-sm">
                              {modCalc.modifiedTotalM2.toFixed(2)} m²
                              <span className="block text-[10px] text-slate-400 font-sans font-normal">
                                ({(modCalc.modifiedTotalM2 * 0.107639).toFixed(1)} sq)
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center font-mono">
                              {modCalc.netDeltaM2 > 0 ? (
                                <span className="text-emerald-400 font-extrabold">+{modCalc.netDeltaM2.toFixed(2)} m²</span>
                              ) : modCalc.netDeltaM2 < 0 ? (
                                <span className="text-amber-400 font-extrabold">{modCalc.netDeltaM2.toFixed(2)} m²</span>
                              ) : (
                                <span className="text-slate-400">0.00 m²</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right font-sans text-slate-400 text-[11px]">
                              Net Adjustment:
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-sm font-extrabold">
                              {modCalc.totalCostAdjustment > 0 ? (
                                <span className="text-emerald-400">+{formatAud(modCalc.totalCostAdjustment)}</span>
                              ) : modCalc.totalCostAdjustment < 0 ? (
                                <span className="text-amber-400">-{formatAud(Math.abs(modCalc.totalCostAdjustment))}</span>
                              ) : (
                                <span className="text-slate-400">$0</span>
                              )}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Summary KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/90">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Standard House Baseline
                        </span>
                        <div className="text-xs font-mono text-slate-300 mt-1 flex items-baseline justify-between">
                          <span>{currentModel.name} ({modCalc.standardTotalM2} m²)</span>
                          <span className="font-bold text-white">{formatAud(modCalc.standardBasePrice)}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl border border-emerald-500/50 bg-emerald-950/30">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider flex items-center justify-between">
                          <span>Automated Modified Base Price</span>
                          <span className="font-mono text-[9px] bg-emerald-500/20 px-1.5 py-0.5 rounded text-emerald-300">
                            {modCalc.totalCostAdjustment >= 0 ? "+" : ""}{formatAud(modCalc.totalCostAdjustment)}
                          </span>
                        </span>
                        <div className="text-base font-mono font-extrabold text-emerald-300 mt-0.5 flex items-baseline justify-between">
                          <span>{formatAud(modCalc.modifiedBasePrice)}</span>
                          <span className="text-[11px] font-sans font-bold text-slate-300">
                            {modCalc.modifiedTotalM2} m² ({(modCalc.modifiedTotalM2 * 0.107639).toFixed(1)} sq)
                          </span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/90">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Active Estimate Floorplan Name
                        </span>
                        <div className="text-sm font-bold text-amber-400 mt-1 flex items-center gap-1.5">
                          <PenTool className="h-3.5 w-3.5 text-amber-400" />
                          <span>{design.designName} Modified</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Inclusion Tier Range: Simplified Clean Titles */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Inclusion Range (H1, H2, H3 Set Pricing)
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {INCLUSION_TIERS.map((tier) => {
                const isSelected =
                  design.specTier === tier.id ||
                  (tier.id === "H1 Smart Inclusions" && design.specTier === "H1 Inclusions (2025)") ||
                  (tier.id === "H2 Design Inclusions" && design.specTier === "H2 Inclusions (2025)") ||
                  (tier.id === "H3 Luxury Inclusions" && design.specTier === "H3 Inclusions (2025)");
                
                const tierStdPrice = currentModel ? getTierPrice(currentModel, tier.id, design.housingType) : 0;
                let tierDisplayPrice = tierStdPrice;
                if (design.isModifiedFloorplan && currentModel) {
                  const tempDesign: QuoteDesignSelection = {
                    ...design,
                    specTier: tier.id,
                    standardBasePrice: tierStdPrice,
                  };
                  tierDisplayPrice = calculateModifiedFloorplanPricing(tempDesign).modifiedBasePrice;
                }

                return (
                  <div
                    key={tier.id}
                    onClick={() => handleTierChange(tier.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/40 shadow-lg"
                        : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-xs text-white">{tier.label}</span>
                        <span className="ml-2 text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {tier.tag}
                        </span>
                      </div>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-slate-400">
                        {design.isModifiedFloorplan ? "Modified Base Price:" : "Base House Price:"}
                      </span>
                      <span className="font-bold text-emerald-400 font-mono">
                        {currentModel ? formatAud(tierDisplayPrice) : "—"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 2nd Dwelling or Granny Flat Option Toggle & Specification */}
            <div
              className={`rounded-2xl border p-4 transition-all ${
                design.hasSecondDwelling && secondDwelling.enabled
                  ? "border-cyan-500/80 bg-gradient-to-r from-cyan-950/40 via-slate-900/90 to-slate-950 ring-1 ring-cyan-500/40 shadow-xl"
                  : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    onClick={() => handleToggleSecondDwelling(!design.hasSecondDwelling || !secondDwelling.enabled)}
                    className={`cursor-pointer p-2.5 rounded-xl border transition-all mt-0.5 ${
                      design.hasSecondDwelling && secondDwelling.enabled
                        ? "bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-lg shadow-cyan-500/20"
                        : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">
                        {design.hasSecondDwelling && secondDwelling.enabled
                          ? "✓ 2nd Dwelling / Granny Flat Included"
                          : "2nd Dwelling or Grannyflat Option"}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          design.hasSecondDwelling && secondDwelling.enabled
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {design.hasSecondDwelling && secondDwelling.enabled ? `${secondDwelling.designName} (${secondDwelling.designM2} m²)` : "Secondary Residence"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Add a secondary auxiliary dwelling, granny flat, or duplex second home. Configure separate design, inclusions, facade, and architectural floorplan.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleToggleSecondDwelling(!design.hasSecondDwelling || !secondDwelling.enabled)}
                  className={`text-xs font-bold gap-1.5 shrink-0 ${
                    design.hasSecondDwelling && secondDwelling.enabled
                      ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                  }`}
                >
                  {design.hasSecondDwelling && secondDwelling.enabled ? (
                    <>
                      <Check className="h-3.5 w-3.5" /> 2nd Dwelling Active
                    </>
                  ) : (
                    <>
                      <PlusCircle className="h-3.5 w-3.5" /> Add 2nd Dwelling / Grannyflat
                    </>
                  )}
                </Button>
              </div>

              {/* 2nd Dwelling Expanded Configuration Box */}
              {design.hasSecondDwelling && secondDwelling.enabled && (
                <div className="mt-4 pt-4 border-t border-slate-800 space-y-5">
                  {/* Row 1: Housing Type, Design Model & Inclusion Tier */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300 font-semibold">2nd Dwelling Type</Label>
                      <Select
                        value={secondDwelling.housingType}
                        onValueChange={(v: any) => handleSecondDwellingHousingTypeChange(v)}
                      >
                        <SelectTrigger className="border-slate-800 bg-slate-950 text-xs text-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                          <SelectItem value="Granny Flat">Granny Flat / Auxiliary Unit</SelectItem>
                          <SelectItem value="Single Storey">Single Storey Home</SelectItem>
                          <SelectItem value="Dual Living">Dual Living / Duplex Design</SelectItem>
                          <SelectItem value="Double Storey">Double Storey Secondary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300 font-semibold">2nd Dwelling Model</Label>
                      <Select
                        value={secondDwelling.designName || secondModels[0]?.name}
                        onValueChange={(v) => handleSecondDwellingModelChange(v)}
                      >
                        <SelectTrigger className="border-slate-800 bg-slate-950 text-xs text-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-slate-800 bg-slate-900 text-slate-200 max-h-60">
                          {secondModels.map((m) => (
                            <SelectItem key={m.name} value={m.name}>
                              {m.name} — {m.m2} m² ({formatAud(m.h1 || m.hbs || 154000)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300 font-semibold">2nd Dwelling Inclusions</Label>
                      <Select
                        value={secondDwelling.specTier}
                        onValueChange={(v: any) => handleSecondDwellingTierChange(v)}
                      >
                        <SelectTrigger className="border-slate-800 bg-slate-950 text-xs text-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                          <SelectItem value="H1 Smart Inclusions">H1 Smart Inclusions (Standard)</SelectItem>
                          <SelectItem value="H2 Design Inclusions">H2 Design Inclusions (Premium)</SelectItem>
                          <SelectItem value="H3 Luxury Inclusions">H3 Luxury Inclusions (Ultimate)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Row 2: Facade, Facade Price & Base Price Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300 font-semibold">2nd Dwelling Facade</Label>
                      <Select
                        value={secondDwelling.facadeName || "Classic"}
                        onValueChange={(val) => {
                          const f = secondSuitableFacades.find((x) => x.name === val) || { name: val, uplift: 0 };
                          onChange({
                            secondDwelling: {
                              ...secondDwelling,
                              facadeName: f.name,
                              facadePrice: f.uplift,
                            },
                          });
                        }}
                      >
                        <SelectTrigger className="border-slate-800 bg-slate-950 text-xs text-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-slate-800 bg-slate-900 text-slate-200 max-h-60">
                          {secondSuitableFacades.map((f) => (
                            <SelectItem key={f.name} value={f.name}>
                              {f.name} {f.uplift === 0 ? "(Standard $0)" : `(+${formatAud(f.uplift)})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300 font-semibold">Facade Uplift ($)</Label>
                      <Input
                        type="number"
                        value={secondDwelling.facadePrice || 0}
                        onChange={(e) => {
                          onChange({
                            secondDwelling: {
                              ...secondDwelling,
                              facadePrice: Number(e.target.value) || 0,
                            },
                          });
                        }}
                        className="h-9 text-xs border-slate-800 bg-slate-950 text-cyan-300 font-mono font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-300 font-semibold">2nd Dwelling Investment Subtotal</Label>
                      <div className="h-9 px-3 rounded-md border border-cyan-500/40 bg-cyan-950/40 flex items-center justify-between font-mono">
                        <span className="text-[11px] text-cyan-200 font-sans">{secondDwelling.designM2} m² Total:</span>
                        <span className="text-sm font-extrabold text-cyan-300">
                          {formatAud((Number(secondDwelling.basePrice) || 0) + (Number(secondDwelling.facadePrice) || 0))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 2nd Architectural Floorplan Drawing Canvas & Cropper Box */}
                  <div className="space-y-3 bg-slate-950/90 p-4 rounded-xl border border-cyan-900/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <ImageIcon className="h-4 w-4 text-cyan-400" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100">
                            2nd Dwelling Architectural Floorplan Specification
                          </h4>
                          {secondDwelling.isModifiedFloorplan && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                              Custom Plan Attached
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Attached floorplan for the 2nd dwelling will be generated as a dedicated architectural page in the Builders Estimate PDF.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {secondDwelling.isModifiedFloorplan && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              onChange({
                                secondDwelling: {
                                  ...secondDwelling,
                                  floorplanUrl: secondStandardFloorplanUrl,
                                  isModifiedFloorplan: false,
                                },
                              });
                              toast.info("Reverted 2nd dwelling to standard floorplan.");
                            }}
                            className="h-8 text-xs border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
                          >
                            Revert to Standard
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => setIsSecondCropperOpen(true)}
                          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs gap-1.5 h-8 shadow-md"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          {secondDwelling.isModifiedFloorplan ? "Re-crop / Update 2nd Plan" : "Upload / Crop 2nd Floorplan"}
                        </Button>
                      </div>
                    </div>

                    {/* Floorplan Preview Canvas for 2nd Dwelling */}
                    <div className="w-full bg-white rounded-xl p-3 border border-slate-800 min-h-[200px] max-h-[320px] flex items-center justify-center overflow-hidden relative shadow-inner">
                      {activeSecondFloorplanUrl ? (
                        <img
                          src={activeSecondFloorplanUrl}
                          alt="2nd Dwelling Floorplan"
                          className="max-h-[280px] w-auto max-w-full object-contain mx-auto"
                        />
                      ) : (
                        <div className="text-center text-slate-400 py-8 space-y-1">
                          <Building2 className="h-8 w-8 mx-auto text-slate-300 opacity-60" />
                          <p className="text-xs text-slate-500">
                            Click &quot;Upload / Crop 2nd Floorplan&quot; to attach the architectural layout drawing for this secondary dwelling.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* External Site Packages: Turnkey Landscaping & Exposed Agg Driveway (Mutually Exclusive) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Option 1: Complete Turnkey Landscaping Package */}
              <div
                onClick={() => {
                  const next = !design.landscapingSelected;
                  const size = design.landscapingLandSize || 450;
                  const price = next ? landscapingPriceFor(size, design.housingType, design.designName) : 0;
                  onChange({
                    landscapingSelected: next,
                    landscapingLandSize: size,
                    landscapingCost: price,
                    // Deselect driveway if landscaping is chosen
                    ...(next ? { exposedDrivewaySelected: false, exposedDrivewayCost: 0 } : {}),
                  });
                }}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                  design.landscapingSelected
                    ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/40 shadow-md"
                    : "border-slate-800 bg-slate-950/70 hover:border-slate-700"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white flex items-center gap-1.5">
                      <Trees className="h-4 w-4 text-emerald-400" />
                      Complete Turnkey Landscaping Package
                    </span>
                    {design.landscapingSelected ? (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                        <Check className="h-3 w-3" /> Selected
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        Optional
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Includes Turf &amp; Garden Beds, Treated Timber Perimeter Fencing &amp; Return Gate, Exposed Aggregate Concrete Driveway &amp; Path, Clothesline, and Rendered Letterbox.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3">
                  <div
                    className="space-y-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Label className="text-[10px] text-slate-400 block">Lot / Land Size:</Label>
                    <Select
                      value={String(design.landscapingLandSize || 450)}
                      onValueChange={(val) => {
                        const size = Number(val);
                        const price = landscapingPriceFor(size, design.housingType, design.designName);
                        onChange({
                          landscapingSelected: true,
                          landscapingLandSize: size,
                          landscapingCost: price,
                          exposedDrivewaySelected: false,
                          exposedDrivewayCost: 0,
                        });
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs border-slate-800 bg-slate-900 text-slate-200 w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                        <SelectItem value="300">Up to 300 m² Lot</SelectItem>
                        <SelectItem value="450">Up to 450 m² Lot</SelectItem>
                        <SelectItem value="600">Up to 600 m² Lot</SelectItem>
                        <SelectItem value="700">Up to 700 m² Lot</SelectItem>
                        <SelectItem value="800">Up to 800 m² Lot</SelectItem>
                        <SelectItem value="900">Up to 900 m² Lot</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="text-right pl-2">
                    <span className="text-[10px] text-slate-400 block">Package Total:</span>
                    <span className="font-extrabold text-emerald-400 font-mono text-sm block">
                      +{formatAud(landscapingPriceFor(design.landscapingLandSize || 450, design.housingType, design.designName))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Option 2: Exposed Agg Driveway Only */}
              <div
                onClick={() => {
                  const next = !design.exposedDrivewaySelected;
                  const m2 = design.exposedDrivewayM2 || 55;
                  const price = next ? Math.round(m2 * 230) : 0;
                  onChange({
                    exposedDrivewaySelected: next,
                    exposedDrivewayM2: m2,
                    exposedDrivewayCost: price,
                    // Deselect landscaping if driveway is chosen
                    ...(next ? { landscapingSelected: false, landscapingCost: 0 } : {}),
                  });
                }}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                  design.exposedDrivewaySelected
                    ? "border-cyan-500 bg-cyan-950/20 ring-1 ring-cyan-500/40 shadow-md"
                    : "border-slate-800 bg-slate-950/70 hover:border-slate-700"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white flex items-center gap-1.5">
                      <Car className="h-4 w-4 text-cyan-400" />
                      Exposed Agg Driveway Only ($230/m²)
                    </span>
                    {design.exposedDrivewaySelected ? (
                      <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                        <Check className="h-3 w-3" /> Selected
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        Optional
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Exposed aggregate concrete paving from road crossover to double garage and front entry porch ($230/m² × {design.exposedDrivewayM2 || 55} m²).
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3">
                  <div
                    className="space-y-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Label className="text-[10px] text-slate-400 block">Driveway Area (m²):</Label>
                    <div className="flex items-center gap-1.5 w-28">
                      <Input
                        type="number"
                        min="1"
                        max="300"
                        value={design.exposedDrivewayM2 ?? 55}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 55;
                          onChange({
                            exposedDrivewaySelected: true,
                            exposedDrivewayM2: val,
                            exposedDrivewayCost: Math.round(val * 230),
                            landscapingSelected: false,
                            landscapingCost: 0,
                          });
                        }}
                        className="h-8 text-xs text-right border-slate-800 bg-slate-900 text-cyan-300 font-mono font-bold"
                      />
                      <span className="text-xs text-slate-400 font-mono">m²</span>
                    </div>
                  </div>

                  <div className="text-right pl-2">
                    <span className="text-[10px] text-slate-400 block">Driveway Total:</span>
                    <span className="font-extrabold text-cyan-400 font-mono text-sm block">
                      +{formatAud((design.exposedDrivewayM2 || 55) * 230)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Facade Dropdown & Custom Facade Options */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Facade Dropdown for this specific Housing Type */}
            <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                  <PenTool className="h-3.5 w-3.5 text-cyan-400" />
                  Architectural Facade ({design.housingType} Range)
                </Label>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {design.facadePrice === 0 ? "Standard Included ($0)" : `+${formatAud(design.facadePrice)}`}
                </span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] text-slate-400">Select Facade from Price List ({suitableFacades.length} available)</Label>
                <Select
                  value={design.isCustomFacade ? "CUSTOM_FACADE" : design.facadeName || suitableFacades[0]?.name}
                  onValueChange={handleFacadeSelect}
                >
                  <SelectTrigger className="border-slate-800 bg-slate-900 text-xs text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-800 bg-slate-900 text-slate-200 max-h-72">
                    {suitableFacades.map((f) => (
                      <SelectItem key={f.name} value={f.name}>
                        {f.name} {f.uplift === 0 ? "(Standard Included)" : `(+${formatAud(f.uplift)})`}
                      </SelectItem>
                    ))}
                    <SelectItem value="CUSTOM_FACADE" className="text-cyan-400 font-bold border-t border-slate-800 mt-1">
                      + Custom Architectural Facade (Specify Details &amp; Price)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Facade Detailed Editor */}
              {design.isCustomFacade && (
                <div className="space-y-3 pt-3 border-t border-slate-800 bg-slate-900/50 p-3 rounded-lg">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                    <PenTool className="h-3.5 w-3.5" />
                    Custom Facade Specification
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-400">Custom Facade Title</Label>
                      <Input
                        value={design.facadeName}
                        onChange={(e) => onChange({ facadeName: e.target.value })}
                        placeholder="e.g. Bespoke Hamptons with Feature Gable"
                        className="h-8.5 text-xs border-slate-800 bg-slate-950 text-slate-100"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] text-slate-400">Custom Facade Price ($)</Label>
                      <Input
                        type="number"
                        value={design.facadePrice || ""}
                        onChange={(e) => onChange({ facadePrice: Number(e.target.value) || 0 })}
                        placeholder="e.g. 8500"
                        className="h-8.5 text-xs border-slate-800 bg-slate-950 text-emerald-400 font-bold font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-400">Brief Architectural Scope / Description</Label>
                    <Input
                      value={design.customFacadeDescription || ""}
                      onChange={(e) => onChange({ customFacadeDescription: e.target.value })}
                      placeholder="e.g. Feature timber cladding, upgraded piers and custom portico roofing..."
                      className="h-8.5 text-xs border-slate-800 bg-slate-950 text-slate-100"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Builder Promotion / Discount Allowance */}
            <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-emerald-400" />
                  Builder Promotion / Special Discount
                </Label>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {design.promotionsDiscount > 0 ? `-${formatAud(design.promotionsDiscount)}` : "No Promotion"}
                </span>
              </div>

              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-400">Promotion Campaign Title</Label>
                  <Input
                    value={design.promotionName || ""}
                    onChange={(e) => onChange({ promotionName: e.target.value })}
                    placeholder="e.g. Summer Gold Coast Builder Promotion"
                    className="h-8.5 text-xs border-slate-800 bg-slate-900 text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-400">Promotional Discount Amount ($)</Label>
                  <Input
                    type="number"
                    value={design.promotionsDiscount || ""}
                    onChange={(e) => onChange({ promotionsDiscount: Number(e.target.value) || 0 })}
                    placeholder="0"
                    className="h-8.5 text-xs border-slate-800 bg-slate-900 text-emerald-400 font-bold font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: CUSTOM ARCHITECTURAL FLOORPLAN */}
      {design.mode === "custom_floorplan" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/40 text-xs text-cyan-200">
            <strong>Custom Floorplan Calculator:</strong> Enter individual floor area dimensions below. The base price calculates automatically using the Hudson custom formula rates.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Storey Configuration</Label>
              <Select
                value={customSpec.storeys}
                onValueChange={(v: any) => handleCustomSpecChange("storeys", v)}
              >
                <SelectTrigger className="border-slate-800 bg-slate-950 text-xs text-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-900 text-slate-200">
                  <SelectItem value="single">Single Storey</SelectItem>
                  <SelectItem value="double">Two Storey / Double</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Ground Living Area (m²)</Label>
              <Input
                type="number"
                value={customSpec.groundLivingM2 || ""}
                onChange={(e) => handleCustomSpecChange("groundLivingM2", Number(e.target.value))}
                placeholder="0"
                className="h-9 text-xs border-slate-800 bg-slate-950 text-slate-100 font-bold font-mono"
              />
            </div>

            {customSpec.storeys === "double" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">First Floor Living Area (m²)</Label>
                <Input
                  type="number"
                  value={customSpec.firstLivingM2 || ""}
                  onChange={(e) => handleCustomSpecChange("firstLivingM2", Number(e.target.value))}
                  placeholder="0"
                  className="h-9 text-xs border-slate-800 bg-slate-950 text-slate-100 font-bold font-mono"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Garage Area (m²)</Label>
              <Input
                type="number"
                value={customSpec.garageM2 || ""}
                onChange={(e) => handleCustomSpecChange("garageM2", Number(e.target.value))}
                placeholder="0"
                className="h-9 text-xs border-slate-800 bg-slate-950 text-slate-100 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Alfresco Area (m²)</Label>
              <Input
                type="number"
                value={customSpec.alfrescoM2 || ""}
                onChange={(e) => handleCustomSpecChange("alfrescoM2", Number(e.target.value))}
                placeholder="0"
                className="h-9 text-xs border-slate-800 bg-slate-950 text-slate-100 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Porch Area (m²)</Label>
              <Input
                type="number"
                value={customSpec.porchM2 || ""}
                onChange={(e) => handleCustomSpecChange("porchM2", Number(e.target.value))}
                placeholder="0"
                className="h-9 text-xs border-slate-800 bg-slate-950 text-slate-100 font-mono"
              />
            </div>

            {customSpec.storeys === "double" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-300">Balcony Area (m²)</Label>
                <Input
                  type="number"
                  value={customSpec.balconyM2 || ""}
                  onChange={(e) => handleCustomSpecChange("balconyM2", Number(e.target.value))}
                  placeholder="0"
                  className="h-9 text-xs border-slate-800 bg-slate-950 text-slate-100 font-mono"
                />
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 block">Total Calculated Area</span>
              <span className="text-base font-bold text-slate-100 font-mono">
                {calculateCustomTotalM2(customSpec)} m²
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Calculated Custom Base Price</span>
              <span className="text-lg font-bold text-emerald-400 font-mono">
                {formatAud(design.basePrice)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Architectural Floorplan Display & Modified Design Section */}
      <div className="space-y-3 bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <ImageIcon className="h-4 w-4 text-emerald-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100">
                Architectural Floorplan Specification
              </h4>
              {design.isModifiedFloorplan && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Modified Design Attached (Client Estimate Only)
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {design.isModifiedFloorplan
                ? "A custom/modified floorplan has been uploaded and cropped for this estimate. It will only be saved with this client's quote."
                : "Standard Hudson architectural floorplan layout. If you have made custom revisions, click 'Update with Modified Design' to crop and attach."}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {design.isModifiedFloorplan && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onChange({
                    floorplanUrl: standardFloorplanUrl,
                    isModifiedFloorplan: false,
                  });
                  toast.info("Reverted to standard Hudson floorplan.");
                }}
                className="h-8 text-xs border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
              >
                Revert to Standard Plan
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setIsCropperOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs gap-1.5 h-8 shadow-md"
            >
              <Upload className="h-3.5 w-3.5" />
              {design.isModifiedFloorplan ? "Re-crop / Update Modified Plan" : "Update with Modified Design"}
            </Button>
          </div>
        </div>

        {/* Floorplan Preview Canvas */}
        <div className="w-full bg-white rounded-xl p-4 border border-slate-800 min-h-[260px] max-h-[420px] flex items-center justify-center overflow-hidden shadow-inner relative group">
          {activeFloorplanUrl ? (
            <img
              src={activeFloorplanUrl}
              alt="Architectural Floorplan"
              className="max-h-[380px] w-auto max-w-full object-contain mx-auto transition-transform"
            />
          ) : (
            <div className="text-center text-slate-400 py-10 space-y-2">
              <Home className="h-10 w-10 mx-auto text-slate-300 opacity-60" />
              <p className="text-xs text-slate-500">
                {design.mode === "standard"
                  ? "Select a Home Design model above to display the standard floorplan layout, or upload a modified design."
                  : "Click 'Update with Modified Design' above to upload and crop your custom floorplan."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modified Floorplan Cropper Dialog */}
      <ModifiedFloorplanModal
        isOpen={isCropperOpen}
        onClose={() => setIsCropperOpen(false)}
        isDoubleStorey={isDouble}
        designName={design.designName || (design.mode === "custom_floorplan" ? "Custom Floorplan" : undefined)}
        onSave={(croppedDataUrl) => {
          onChange({
            floorplanUrl: croppedDataUrl,
            isModifiedFloorplan: true,
          });
        }}
      />

      {/* 2nd Dwelling Floorplan Cropper Dialog */}
      <ModifiedFloorplanModal
        isOpen={isSecondCropperOpen}
        onClose={() => setIsSecondCropperOpen(false)}
        isDoubleStorey={secondDwelling.housingType === "Double Storey"}
        designName={secondDwelling.designName || "2nd Dwelling Floorplan"}
        onSave={(croppedDataUrl) => {
          onChange({
            secondDwelling: {
              ...secondDwelling,
              floorplanUrl: croppedDataUrl,
              isModifiedFloorplan: true,
            },
          });
        }}
      />
    </div>
  );
}
