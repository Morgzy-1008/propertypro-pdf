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
import { ModifiedPlanReviewModal } from "./ModifiedPlanReviewModal";
import { analyzeModifiedFloorplanFile } from "@/lib/quoting/floorplanModificationDetector";
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
import {
  NSW_SINGLE_STOREY_PRICES,
  NSW_DOUBLE_STOREY_PRICES,
  NSW_SPLIT_LEVEL_PRICES,
  NSW_DUAL_OC_PRICES,
} from "@/lib/pricelist.nsw.data";
import {
  NSW_SINGLE_STOREY_FACADES,
  NSW_DOUBLE_STOREY_FACADES,
  NSW_SPLIT_DESIGN_FACADES,
  NSW_MULBERRY_FACADES,
} from "@/lib/facadepricelist.nsw.data";
import { getActiveDivision, onDivisionChanged, setActiveDivision, type Division } from "@/lib/divisionContext";
import { plansForDesign } from "@/components/flyer/floorplans";
import {
  calculateCustomFloorplanPrice,
  calculateCustomTotalM2,
  calculateModifiedFloorplanPricing,
  getCustomAreaRates,
  getStandardAreaBreakdown,
  getAutomatedPromotionDiscount,
  getHousingTypeForDesign,
  cleanDesignName,
} from "@/lib/quoting/quoteEngine";
import { duplexFacadesForDesign } from "@/components/flyer/duplexFacades.data";
import { facadePriceForDesign, type FacadeStorey } from "@/components/flyer/facadePricing";
import { isSingleGarageDesign, findFacadeForDesign } from "@/lib/quoting/facadeLookup";
import { FacadeLibrary } from "@/components/flyer/FacadeLibraryDialog";
import { QuoteFacadeRenderPreview } from "./QuoteFacadeRenderPreview";
import type {
  InclusionTier,
  QuoteDesignSelection,
  SecondDwellingSelection,
  QuoteSelectedLineItem,
  PlanModificationAnalysis,
  DetectedAreaDelta,
  FloorplanAreaBreakdown,
} from "@/lib/quoting/quoteTypes";

interface QuoteDesignStepProps {
  design: QuoteDesignSelection;
  onChange: (patch: Partial<QuoteDesignSelection>) => void;
  onAddInclusionLineItems?: (items: QuoteSelectedLineItem[]) => void;
}

export function getHousingTypePrices(division: Division = getActiveDivision()): Record<string, PriceRow[]> {
  const isNsw = division === "NSW";
  const dual = isNsw ? NSW_DUAL_OC_PRICES : DUAL_OC_PRICES;
  return {
    "Single Storey": isNsw ? NSW_SINGLE_STOREY_PRICES : SINGLE_STOREY_PRICES,
    "Double Storey": isNsw ? NSW_DOUBLE_STOREY_PRICES : DOUBLE_STOREY_PRICES,
    "Split Level": isNsw ? NSW_SPLIT_LEVEL_PRICES : SPLIT_LEVEL_PRICES,
    "Dual Living": dual,
    "Granny Flat": [
      { name: "Acacia 60", m2: 60, h1: 154000, h2: 159000, h3: 167000, hbs: 154000 },
      { name: "Banksia 60", m2: 60, h1: 156000, h2: 161000, h3: 169000, hbs: 156000 },
      { name: "Coral 65", m2: 65, h1: 168000, h2: 174000, h3: 182000, hbs: 168000 },
      { name: "Myrtle 70", m2: 70, h1: 178000, h2: 184000, h3: 193000, hbs: 178000 },
      ...dual,
    ],
  };
}

const HOUSING_TYPE_PRICES = getHousingTypePrices("QLD");

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

export const CUSTOM_INCLUSION_TIERS: { id: InclusionTier; label: string; tag: string; desc: string }[] = [
  {
    id: "H3 Luxury Inclusions",
    label: "H3 Luxury",
    tag: "Ultimate Luxury",
    desc: "+$150/m² living • 600x600 alfresco tiles (+$30/m²)",
  },
  {
    id: "H2 Design Inclusions",
    label: "H2 Designer",
    tag: "Most Popular",
    desc: "Baseline Designer Specification • Ceiling lining to alfresco",
  },
  {
    id: "H1 Smart Inclusions",
    label: "H1 Smart",
    tag: "Essential Value",
    desc: "-$80/m² living • Quality Hudson turnkey standard",
  },
  {
    id: "Smart Series",
    label: "Smart Series",
    tag: "Smart Style",
    desc: "-$150/m² living • Value-engineered package",
  },
  {
    id: "Home Builders Series",
    label: "Home Builders",
    tag: "HBS Base",
    desc: "-$250/m² living • Maximum budget efficiency",
  },
];

// Exact facade lists and pricing from official Hudson Homes Price Lists (Single Storey 23/7/26, Double Storey 23/7/26, Split Design 13/6/26, Duplex 13/6/26, Mulberry Acreage 13/6/26)
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
    { name: "Havana", uplift: 25900 },
    { name: "Newport", uplift: 25900 },
    { name: "Imperial", uplift: 28400 },
    { name: "Merlot", uplift: 28400 },
    { name: "Modern Barn", uplift: 28400 },
    { name: "Modern Box", uplift: 28400 },
    { name: "Modern Farmhouse Option B", uplift: 28400 },
    { name: "Nuvo", uplift: 28400 },
    { name: "Regal", uplift: 28400 },
    { name: "Vienna", uplift: 28400 },
    { name: "Vogue", uplift: 28400 },
    { name: "Vibe", uplift: 37700 },
    { name: "Visage", uplift: 37700 },
    { name: "Modern Classical Option A", uplift: 41900 },
    { name: "Modern Classical Option B", uplift: 41900 },
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
    { name: "Chateaux (No Balcony)", uplift: 24800 },
    { name: "Monash", uplift: 24800 },
    { name: "Hamptons (No Balcony)", uplift: 27400 },
    { name: "Aspen", uplift: 32700 },
    { name: "Madison", uplift: 32700 },
    { name: "Modern Box", uplift: 32700 },
    { name: "Modern Coastal", uplift: 32700 },
    { name: "Mocha Hamptons (No Balcony)", uplift: 32700 },
    { name: "Statesman", uplift: 32700 },
    { name: "Modern Barn", uplift: 34900 },
    { name: "Chateaux (With Balcony)", uplift: 38900 },
    { name: "Delta", uplift: 38900 },
    { name: "Deluxe", uplift: 39000 },
    { name: "Grande", uplift: 39000 },
    { name: "Hamptons (With Balcony)", uplift: 38900 },
    { name: "Riviera", uplift: 38900 },
    { name: "Royale", uplift: 39000 },
    { name: "Saville", uplift: 39000 },
    { name: "Sierra", uplift: 38900 },
    { name: "Modern Farmhouse Option B", uplift: 41900 },
    { name: "Mocha Hamptons (Balcony)", uplift: 44400 },
    { name: "Modern Classical", uplift: 50900 },
    { name: "Ascot", uplift: 53400 },
    { name: "Centro", uplift: 53400 },
    { name: "Como", uplift: 53400 },
    { name: "Flair", uplift: 53400 },
    { name: "Meridian", uplift: 53400 },
    { name: "Soho", uplift: 53400 },
    { name: "Metro", uplift: 53500 },
    { name: "Nuvo", uplift: 53500 },
    { name: "Regal", uplift: 53500 },
    { name: "Tempo", uplift: 53500 },
    { name: "Vista (With Balcony)", uplift: 53400 },
    { name: "Vogue", uplift: 53500 },
    { name: "Reed", uplift: 86100 },
    { name: "Clarence", uplift: 89200 },
  ],
  "Split Level": [
    { name: "Classic", uplift: 0 },
    { name: "Eden", uplift: 14400 },
    { name: "Harmony", uplift: 15400 },
    { name: "Hamptons", uplift: 21500 },
    { name: "Chateaux", uplift: 21600 },
    { name: "Elite", uplift: 21600 },
    { name: "Infinity", uplift: 27000 },
    { name: "Nuvo", uplift: 41000 },
    { name: "Vogue", uplift: 41400 },
  ],
  "Acreage": [
    { name: "Classic", uplift: 0 },
    { name: "Classic Plus", uplift: 4700 },
    { name: "Eden", uplift: 29400 },
    { name: "Hamptons", uplift: 57000 },
    { name: "Metro", uplift: 57000 },
    { name: "Statesman", uplift: 57000 },
    { name: "Imperial", uplift: 66500 },
    { name: "Urban", uplift: 66500 },
    { name: "Vogue", uplift: 158900 },
  ],
  "Acreage (Large)": [
    { name: "Classic", uplift: 0 },
    { name: "Classic Plus", uplift: 4700 },
    { name: "Eden", uplift: 33200 },
    { name: "Hamptons", uplift: 64400 },
    { name: "Metro", uplift: 64400 },
    { name: "Statesman", uplift: 64400 },
    { name: "Imperial", uplift: 75300 },
    { name: "Urban", uplift: 75300 },
    { name: "Vogue", uplift: 180200 },
  ],
  "Dual Living": [
    { name: "Classic", uplift: 0 },
    { name: "Classic Plus (Single)", uplift: 4700 },
    { name: "Classic Plus (Double)", uplift: 5800 },
    { name: "Madison", uplift: 12100 },
    { name: "Marina", uplift: 16100 },
    { name: "Vista", uplift: 24500 },
    { name: "Teal 45 (Corner)", uplift: 68900 },
    { name: "Brixton", uplift: 80900 },
    { name: "Modena", uplift: 86100 },
    { name: "Cranbrook", uplift: 96400 },
    { name: "Bronte", uplift: 105600 },
    { name: "Woodlands", uplift: 105600 },
    { name: "Mayfield", uplift: 113800 },
  ],
  "Granny Flat": [
    { name: "Classic", uplift: 0 },
    { name: "Classic Plus", uplift: 4700 },
    { name: "Contemporary", uplift: 9900 },
    { name: "Hamptons", uplift: 15300 },
    { name: "Modern Coastal", uplift: 15300 },
    { name: "Modern Barn", uplift: 28400 },
  ],
};

/**
 * Returns available facade options with exact upgrade prices for any given design and housing type.
 * Automatically handles division (NSW vs QLD), Mulberry acreage sizing (<33 vs >=33), and Split Level pricing.
 */
export function getFacadesForDesignAndHousingType(
  designName?: string,
  housingType: string = "Single Storey",
  division: Division = getActiveDivision()
): { name: string; uplift: number; note?: string; range?: string; url?: string; id?: string }[] {
  const isNsw = division === "NSW";
  const isMulberry = designName ? /^mulberry\b/i.test(designName) : false;
  const isAcreage = isMulberry || housingType === "Acreage" || housingType === "Acreage & Split Level" || housingType === "Ranch & Acreage";

  if (isAcreage) {
    const size = designName ? (Number(designName.match(/\d+/)?.[0]) || 0) : 0;
    if (isNsw) {
      return size >= 33 ? NSW_MULBERRY_FACADES["33-39"] : NSW_MULBERRY_FACADES["22-28"];
    }
    return size >= 33 ? HOUSING_FACADES["Acreage (Large)"] : HOUSING_FACADES["Acreage"];
  }

  // Check if duplex or dual living design
  const isDuplex =
    housingType === "Dual Living" ||
    housingType === "dual-oc" ||
    Boolean(
      designName &&
        (/ - TD| - SD|\bduplex\b|\bdual\b/i.test(designName) ||
          ["alabaster", "cayenne", "cayene", "teal", "wisteria", "magnolia", "maize", "raven", "lavender"].some((f) =>
            designName.toLowerCase().startsWith(f)
          ))
    );

  if (isDuplex && designName) {
    const duplexList = duplexFacadesForDesign(designName);
    if (duplexList.length > 0) {
      const isTwoStorey = /two\s*stor|double| - td/i.test(designName) || housingType === "Double Storey";
      const storey: FacadeStorey = isTwoStorey ? "double" : "single";
      return duplexList.map((f) => ({
        name: f.name,
        uplift: facadePriceForDesign(f.name, storey, designName) ?? 0,
        note: f.note,
        range: f.range,
        url: f.url,
        id: f.id,
      }));
    }
  }

  // Cinnamon is front-to-rear tri-level split with no dedicated facades yet - treat as standard double storey
  const isCinnamon = designName ? /cinnamon/i.test(designName) : false;
  if (isCinnamon) {
    return isNsw ? NSW_DOUBLE_STOREY_FACADES : HOUSING_FACADES["Double Storey"];
  }

  if (housingType === "Split Level") {
    return isNsw ? NSW_SPLIT_DESIGN_FACADES : HOUSING_FACADES["Split Level"];
  }

  if (housingType === "Double Storey" || housingType === "double") {
    return isNsw ? NSW_DOUBLE_STOREY_FACADES : HOUSING_FACADES["Double Storey"];
  }

  if (housingType === "Dual Living") {
    return HOUSING_FACADES["Dual Living"];
  }

  if (housingType === "Granny Flat") {
    return HOUSING_FACADES["Granny Flat"];
  }

  if (isSingleGarageDesign(designName, housingType)) {
    const baseList = isNsw ? NSW_SINGLE_STOREY_FACADES : HOUSING_FACADES["Single Storey"];
    return baseList.map((f, idx) => {
      const resolved = findFacadeForDesign(f.name, false, "Single Storey", designName);
      return {
        ...f,
        name: f.name.includes("Single Garage") ? f.name : `${f.name} (Single Garage)`,
        id: `${(resolved?.id || f.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}-${idx}`,
        url: resolved?.url || f.url,
      };
    });
  }

  return isNsw ? NSW_SINGLE_STOREY_FACADES : HOUSING_FACADES["Single Storey"];
}

export function QuoteDesignStep({
  design,
  onChange,
  onAddInclusionLineItems,
}: QuoteDesignStepProps) {
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [isSecondCropperOpen, setIsSecondCropperOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isAnalyzingModifiedFile, setIsAnalyzingModifiedFile] = useState(false);
  const [pendingAnalysis, setPendingAnalysis] = useState<PlanModificationAnalysis | null>(null);
  const [isDraggingDropzone, setIsDraggingDropzone] = useState(false);
  const [division, setDivision] = useState<Division>(() => getActiveDivision());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modifiedFileInputRef = useRef<HTMLInputElement>(null);

  const customSpec = design.customSpec || {
    groundLivingM2: 0,
    firstLivingM2: 0,
    garageM2: 0,
    alfrescoM2: 0,
    porchM2: 0,
    balconyM2: 0,
    storeys: "single" as const,
    groundRateM2: 0,
    upperRateM2: 0,
    ancillaryRateM2: 0,
    scaffoldingAllowance: 8500,
  };

  const housingTypePrices = getHousingTypePrices(division);
  const effectiveHousingType =
    design.mode === "custom_floorplan"
      ? (customSpec.storeys === "double" ? "Double Storey" : "Single Storey")
      : getHousingTypeForDesign(design.designName, design.housingType);
  const models = housingTypePrices[effectiveHousingType] || housingTypePrices["Single Storey"] || SINGLE_STOREY_PRICES;
  const currentModel = models.find((m) => m.name === design.designName);

  // Subscribe to division changes (e.g. from top-bar state switcher)
  React.useEffect(() => {
    return onDivisionChanged((newDiv) => {
      setDivision(newDiv);
      if (design.designName) {
        const detectedType = getHousingTypeForDesign(design.designName, design.housingType);
        const divPrices = getHousingTypePrices(newDiv);
        const typeModels = divPrices[detectedType] || divPrices["Single Storey"] || SINGLE_STOREY_PRICES;
        const m = typeModels.find((x) => x.name === design.designName);
        if (m) {
          const newBasePrice = getTierPrice(m, design.specTier, detectedType);
          const facades = getFacadesForDesignAndHousingType(design.designName, detectedType, newDiv);
          const matchedFacade = facades.find((f) => f.name.toLowerCase() === (design.facadeName || "").toLowerCase());
          const newFacadePrice = matchedFacade ? matchedFacade.uplift : (design.isCustomFacade ? design.facadePrice : 0);
          
          let effectiveBasePrice = newBasePrice;
          if (design.isModifiedFloorplan) {
            const tempDesign: QuoteDesignSelection = {
              ...design,
              standardBasePrice: newBasePrice,
            };
            effectiveBasePrice = calculateModifiedFloorplanPricing(tempDesign).modifiedBasePrice;
          }

          let newLandscapingCost = design.landscapingCost;
          if (design.landscapingSelected) {
            newLandscapingCost = landscapingPriceFor(
              design.landscapingLandSize || 450,
              detectedType,
              design.designName,
              newDiv
            );
          }

          onChange({
            standardBasePrice: newBasePrice,
            basePrice: effectiveBasePrice,
            facadePrice: newFacadePrice,
            ...(design.landscapingSelected ? { landscapingCost: newLandscapingCost } : {}),
          });
        }
      }
    });
  }, [design.designName, design.housingType, design.specTier, design.facadeName, design.isCustomFacade, design.isModifiedFloorplan, design.landscapingSelected, design.landscapingLandSize]);

  const isCinnamon = Boolean(design.designName && /cinnamon/i.test(design.designName));
  const isDouble =
    design.mode === "custom_floorplan"
      ? customSpec.storeys === "double"
      : effectiveHousingType === "Double Storey" || effectiveHousingType === "double" || isCinnamon;
  const isDuplex =
    effectiveHousingType === "Dual Living" ||
    effectiveHousingType === "dual-oc" ||
    Boolean(
      design.designName &&
        (/ - TD| - SD|\bduplex\b|\bdual\b/i.test(design.designName) ||
          ["alabaster", "cayenne", "cayene", "teal", "wisteria", "magnolia", "maize", "raven", "lavender"].some((f) =>
            design.designName.toLowerCase().startsWith(f)
          ))
    );

  const standardPlans = design.designName ? plansForDesign(design.designName) : [];
  const standardFloorplanUrl = standardPlans[0]?.url || "";
  const activeFloorplanUrl = design.floorplanUrl || standardFloorplanUrl;

  const suitableFacades = getFacadesForDesignAndHousingType(design.designName, effectiveHousingType, division);

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

  const secondModels = housingTypePrices[secondDwelling.housingType] || housingTypePrices["Granny Flat"] || SINGLE_STOREY_PRICES;
  const currentSecondModel = secondModels.find((m) => m.name === secondDwelling.designName) || secondModels[0];
  const secondSuitableFacades = getFacadesForDesignAndHousingType(secondDwelling.designName, secondDwelling.housingType, division);
  const secondStandardPlans = secondDwelling.designName ? plansForDesign(secondDwelling.designName) : [];
  const secondStandardFloorplanUrl = secondStandardPlans[0]?.url || "";
  const activeSecondFloorplanUrl = secondDwelling.floorplanUrl || secondStandardFloorplanUrl;

  const handleToggleSecondDwelling = (enabled: boolean) => {
    if (enabled && (!design.secondDwelling || !design.secondDwelling.designName)) {
      const defaultModel = housingTypePrices["Granny Flat"]?.[0] || { name: "Acacia 60", m2: 60, h1: 154000 };
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
    const typeModels = housingTypePrices[type] || housingTypePrices["Granny Flat"];
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

    return raw;
  };

  const handleHousingTypeChange = (type: QuoteDesignSelection["housingType"]) => {
    const facadesForType = getFacadesForDesignAndHousingType(undefined, type, division);
    const defaultFacade = facadesForType[0] || { name: "Classic", uplift: 0 };
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
      facadeName: defaultFacade.name,
      facadePrice: defaultFacade.uplift,
      facadeImageUrl: defaultFacade.url || "",
      isCustomFacade: false,
      promotionsDiscount: 0,
      promotionName: "Managers Discount",
      floorplanUrl: "",
      beds: "",
      baths: "",
      cars: "",
      widthM: "",
      lengthM: "",
    });
  };

  const handleDesignModelChange = (modelName: string) => {
    const detectedHousingType = getHousingTypeForDesign(modelName, design.housingType);
    const typeModels = housingTypePrices[detectedHousingType] || SINGLE_STOREY_PRICES;
    const m = typeModels.find((x) => x.name === modelName) || models.find((x) => x.name === modelName);
    if (!m) return;

    const facadesForType = getFacadesForDesignAndHousingType(modelName, detectedHousingType, division);
    const isCurrentFacadeValid = !design.isCustomFacade && design.facadeName && facadesForType.some((f) => f.name.toLowerCase() === design.facadeName.toLowerCase());
    const chosenFacade = isCurrentFacadeValid
      ? facadesForType.find((f) => f.name.toLowerCase() === design.facadeName.toLowerCase())!
      : (facadesForType[0] || { name: "Classic", uplift: 0 });

    const plans = plansForDesign(m.name);
    const floorplanUrl = plans[0]?.url || "";
    const basePrice = getTierPrice(m, design.specTier, detectedHousingType);
    const stdAreas = getStandardAreaBreakdown(m.name, detectedHousingType, m.m2);

    let effectiveM2 = m.m2;
    let effectiveBasePrice = basePrice;
    let updatedModifiedAreas = design.isModifiedFloorplan ? { ...stdAreas } : undefined;

    if (design.isModifiedFloorplan) {
      const tempDesign: QuoteDesignSelection = {
        ...design,
        housingType: detectedHousingType,
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

    onChange({
      housingType: detectedHousingType,
      designName: m.name,
      designM2: m.m2,
      standardDesignM2: m.m2,
      standardBasePrice: basePrice,
      standardAreas: stdAreas,
      modifiedAreas: updatedModifiedAreas,
      modifiedDesignM2: effectiveM2,
      basePrice: effectiveBasePrice,
      facadeName: design.isCustomFacade ? design.facadeName : chosenFacade.name,
      facadePrice: design.isCustomFacade ? design.facadePrice : chosenFacade.uplift,
      facadeImageUrl: design.isCustomFacade ? design.facadeImageUrl : (chosenFacade.url || ""),
      promotionsDiscount: 0,
      promotionName: design.promotionName || "Managers Discount",
      floorplanUrl,
      beds: plans[0]?.beds || "4",
      baths: plans[0]?.baths || "2",
      cars: plans[0]?.cars || "2",
      widthM: plans[0]?.width || "14.0m",
      lengthM: plans[0]?.depth || "22.0m",
    });
  };

  const handleTierChange = (tier: InclusionTier) => {
    if (design.mode === "custom_floorplan") {
      const effectiveBasePrice = calculateCustomFloorplanPrice(customSpec, tier);
      onChange({ specTier: tier, basePrice: effectiveBasePrice });
      return;
    }
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
        facadeImageUrl: "",
      });
    } else {
      const match = suitableFacades.find((f) => f.name === facadeName || f.id === facadeName);
      onChange({
        isCustomFacade: false,
        facadeName: match ? match.name : facadeName,
        facadePrice: match ? match.uplift : 0,
        facadeImageUrl: match?.url || "",
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
    const calculatedBase = calculateCustomFloorplanPrice(updated, design.specTier);
    const totalM2 = calculateCustomTotalM2(updated);
    onChange({
      customSpec: updated,
      basePrice: calculatedBase,
      designM2: totalM2,
      ...(field === "storeys"
        ? {
            housingType: val === "double" ? "Double Storey" : "Single Storey",
          }
        : {}),
    });
  };

  const handleProcessModifiedFile = async (file: File) => {
    setIsAnalyzingModifiedFile(true);
    try {
      const analysis = await analyzeModifiedFloorplanFile(
        file,
        design.designName,
        design.housingType,
        design.specTier
      );
      setPendingAnalysis(analysis);
      setIsReviewModalOpen(true);
      if (analysis.netDeltaM2 === 0 && analysis.inclusionUpgrades.length === 0) {
        toast.success(
          `✨ Scanned floorplan: verified standard ${analysis.baseDesignName} (0.0 m² delta, $0.00 adjustment).`
        );
      } else {
        toast.success(
          `✨ Scanned floorplan: matched ${analysis.baseDesignName} (${analysis.netDeltaM2 >= 0 ? `+${analysis.netDeltaM2}` : analysis.netDeltaM2} m² delta) with ${analysis.inclusionUpgrades.length} upgrades.`
        );
      }
    } catch (err: any) {
      console.error("Floorplan analysis failed:", err);
      const errMsg = err?.message || "Could not parse floorplan file. Please try a different PDF or image.";
      toast.error(errMsg.length > 160 ? errMsg.slice(0, 160) + "..." : errMsg);
    } finally {
      setIsAnalyzingModifiedFile(false);
    }
  };

  const handleOpenReviewModal = () => {
    if (pendingAnalysis) {
      setIsReviewModalOpen(true);
      return;
    }
    const stdM2 = design.standardDesignM2 || (currentModel ? currentModel.m2 : design.designM2) || 198.08;
    const modM2 = design.modifiedDesignM2 || design.designM2 || stdM2;
    const netDelta = Math.round((modM2 - stdM2) * 100) / 100;
    const modCalc = calculateModifiedFloorplanPricing(design);

    const syntheticDeltas: DetectedAreaDelta[] = modCalc.zones
      .filter((z) => z.deltaM2 !== 0)
      .map((z) => ({
        zoneKey: z.key,
        zoneLabel: z.label,
        standardM2: z.standardM2,
        modifiedM2: z.modifiedM2,
        deltaM2: z.deltaM2,
        recipeId: `recipe_${z.key}`,
        unitRate: z.ratePerM2,
        subtotal: z.costAdjustment,
        accepted: true,
      }));

    const synthetic: PlanModificationAnalysis = {
      baseDesignName: design.designName || "Selected Home Design",
      housingType: design.housingType,
      standardTotalM2: stdM2,
      modifiedTotalM2: modM2,
      netDeltaM2: netDelta,
      areaDeltas: syntheticDeltas,
      inclusionUpgrades: [],
      totalAreaCost: modCalc.totalCostAdjustment,
      totalInclusionsCost: 0,
      netTotalCost: modCalc.totalCostAdjustment,
      floorplanDataUrl: design.floorplanUrl,
      fileName: "Current Modified Design",
    };

    setPendingAnalysis(synthetic);
    setIsReviewModalOpen(true);
  };

  const handleApplyModifiedPlan = (approved: PlanModificationAnalysis) => {
    const stdM2 = approved.standardTotalM2;
    const stdAreas = getStandardAreaBreakdown(approved.baseDesignName, approved.housingType, stdM2);

    const updatedModifiedAreas: Partial<FloorplanAreaBreakdown> = {
      ...stdAreas,
      ...(design.modifiedAreas || {}),
    };

    for (const delta of approved.areaDeltas) {
      if (delta.accepted) {
        (updatedModifiedAreas as any)[delta.zoneKey] = delta.modifiedM2;
      }
    }

    const effectiveHousingType = approved.housingType;
    const modelName = approved.baseDesignName;
    const divModels = housingTypePrices[effectiveHousingType] || SINGLE_STOREY_PRICES;
    const matchedModel = divModels.find((m) => m.name === modelName) || currentModel;
    const stdPrice = matchedModel
      ? getTierPrice(matchedModel, design.specTier, effectiveHousingType)
      : design.standardBasePrice || design.basePrice;

    const tempDesign: QuoteDesignSelection = {
      ...design,
      mode: "modified",
      housingType: effectiveHousingType,
      designName: modelName,
      standardDesignM2: stdM2,
      standardBasePrice: stdPrice,
      isModifiedFloorplan: true,
      standardAreas: stdAreas,
      modifiedAreas: updatedModifiedAreas,
    };

    const modCalc = calculateModifiedFloorplanPricing(tempDesign);
    const autoDiscount = getAutomatedPromotionDiscount(approved.modifiedTotalM2);

    onChange({
      mode: "modified",
      housingType: effectiveHousingType,
      designName: modelName,
      designM2: matchedModel?.m2 || stdM2,
      standardDesignM2: stdM2,
      standardBasePrice: stdPrice,
      isModifiedFloorplan: true,
      standardAreas: stdAreas,
      modifiedAreas: updatedModifiedAreas,
      modifiedDesignM2: approved.modifiedTotalM2,
      basePrice: modCalc.modifiedBasePrice,
      promotionsDiscount: autoDiscount,
      ...(approved.floorplanDataUrl ? { floorplanUrl: approved.floorplanDataUrl } : {}),
    });

    if (onAddInclusionLineItems) {
      const acceptedUpgrades = approved.inclusionUpgrades.filter((u) => u.accepted);
      if (acceptedUpgrades.length > 0) {
        const lineItemsToAdd: QuoteSelectedLineItem[] = acceptedUpgrades.map((u) => ({
          id: `mod_${u.id}`,
          catalogueItemId: u.id,
          category: u.category,
          name: u.name,
          description: u.description,
          unitType: "item",
          unitRate: u.unitPrice,
          quantity: u.quantity,
          subtotal: u.subtotal,
          isIncluded: false,
          isClientSelectable: true,
          clientSelected: true,
          notes: `Detected from modified floorplan (${approved.fileName || "Plan"}): ${u.detected}`,
        }));
        onAddInclusionLineItems(lineItemsToAdd);
      }
    }

    setPendingAnalysis(approved);
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
            Select a Hudson home design, upload a modified floorplan, or calculate custom floorplan dimensions.
          </p>
        </div>

        {/* 3 Design Mode Tabs: Standard Design | Modified Design | Custom Design (m²) */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start">
          {[
            { id: "standard", label: "Standard Design" },
            { id: "modified", label: "Modified Design" },
            { id: "custom_floorplan", label: "Custom Design (m²)" },
          ].map((tab) => {
            const isActive =
              tab.id === "modified"
                ? design.mode === "modified" || (design.mode === "standard" && design.isModifiedFloorplan)
                : design.mode === tab.id && (!design.isModifiedFloorplan || tab.id !== "standard");
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (tab.id === "modified") {
                    onChange({ mode: "modified", isModifiedFloorplan: true });
                    if (!design.modifiedDesignM2 && design.designM2) {
                      handleToggleModifiedFloorplan(true);
                    }
                  } else if (tab.id === "standard") {
                    onChange({ mode: "standard", isModifiedFloorplan: false });
                    if (design.isModifiedFloorplan) {
                      handleToggleModifiedFloorplan(false);
                    }
                  } else {
                    onChange({ mode: "custom_floorplan", isModifiedFloorplan: false });
                  }
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-md font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* MODE 1 & 2: STANDARD OR MODIFIED HUDSON DESIGN */}
      {(design.mode === "standard" || design.mode === "modified") && (
        <div className="space-y-6">
          {/* Modified Design Floorplan Vision Ingestion Dropzone */}
          {(design.mode === "modified" || design.isModifiedFloorplan) && (
            <div className="rounded-2xl border-2 border-dashed border-cyan-500/50 bg-gradient-to-br from-cyan-950/30 via-slate-900/60 to-slate-950 p-5 transition-all hover:border-cyan-400/80 shadow-lg shadow-cyan-950/20">
              <input
                type="file"
                ref={modifiedFileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleProcessModifiedFile(file);
                }}
                accept=".pdf,image/png,image/jpeg,image/jpg"
                className="hidden"
                id="modified-floorplan-input"
              />

              {isAnalyzingModifiedFile ? (
                <div className="flex flex-col items-center justify-center py-6 space-y-3">
                  <div className="h-12 w-12 rounded-full border-4 border-cyan-500/30 border-t-cyan-400 animate-spin flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-cyan-300 animate-pulse" />
                  </div>
                  <div className="text-center">
                    <h4 className="text-sm font-bold text-cyan-300">Scanning &amp; Scaling Modified Floorplan...</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Aligning against Hudson master plans, calculating room push-outs, and identifying inclusion upgrades.
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => modifiedFileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingDropzone(true);
                  }}
                  onDragLeave={() => setIsDraggingDropzone(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingDropzone(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleProcessModifiedFile(file);
                  }}
                  className={`cursor-pointer flex flex-col items-center justify-center text-center py-4 px-2 rounded-xl transition-all ${
                    isDraggingDropzone ? "bg-cyan-500/15 ring-2 ring-cyan-400" : "hover:bg-cyan-500/5"
                  }`}
                >
                  <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-500/10 mb-2.5">
                    <Upload className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white flex items-center justify-center gap-2">
                    <span>Upload Modified Floorplan</span>
                    <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded font-mono font-medium">
                      PDF / PNG / JPG
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-lg">
                    Drop modified plan here or click to browse. The engine scales the plan and calculates internal dimensions <strong>without needing a printed dimensions graph</strong>.
                  </p>
                </div>
              )}

              {/* Active Recognition & Review Bar */}
              {(design.isModifiedFloorplan || pendingAnalysis) && !isAnalyzingModifiedFile && (
                <div className="mt-3 pt-3 border-t border-cyan-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 flex-wrap text-slate-200">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold text-[11px]">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      {design.designName ? `${design.designName} Modified` : "Modified Floorplan Active"}
                    </span>
                    <span className="text-slate-400">&bull;</span>
                    <span className="text-emerald-400 font-mono font-bold">
                      {design.modifiedDesignM2 || design.designM2} m²
                    </span>
                    {design.standardDesignM2 && design.standardDesignM2 > 0 && (
                      <span className="text-slate-400">
                        (Std: {design.standardDesignM2} m² &bull; Δ{" "}
                        {(((design.modifiedDesignM2 || design.designM2) - design.standardDesignM2)).toFixed(1)} m²)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleOpenReviewModal}
                      className="text-xs font-bold gap-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md shadow-cyan-600/20"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-cyan-200" />
                      Review Discrepancies &amp; Upgrades
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

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
                      {cleanDesignName(m.name)} — {m.m2} m² ({formatAud(getTierPrice(m, design.specTier))})
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
                    
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleToggleModifiedFloorplan(!design.isModifiedFloorplan)}
                    className={`text-xs font-bold gap-1.5 ${
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

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsCropperOpen(true)}
                    className="text-xs font-bold gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Import Modified Floorplan</span>
                  </Button>
                </div>
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
                  const price = next ? landscapingPriceFor(size, design.housingType, design.designName, division) : 0;
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
                      Landscaping Package
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
                        const price = landscapingPriceFor(size, design.housingType, design.designName, division);
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
                      +{formatAud(landscapingPriceFor(design.landscapingLandSize || 450, design.housingType, design.designName, division))}
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
                  Architectural Facade ({isCinnamon ? "Double Storey" : design.housingType} Range)
                </Label>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {design.facadePrice === 0 ? "Standard Included ($0)" : `+${formatAud(design.facadePrice)}`}
                </span>
              </div>

              {/* Duplex Elevation / Garage Position Badge */}
              {(() => {
                const match = suitableFacades.find(
                  (f) => f.name.toLowerCase() === (design.facadeName || "").toLowerCase()
                );
                if (!match?.note) return null;
                return (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                    <Building2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Duplex Elevation: <strong>{match.note}</strong></span>
                  </div>
                );
              })()}

              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <Label className="text-[11px] text-slate-400 font-medium">
                    Select Facade from Price List ({suitableFacades.length} available)
                  </Label>
                  <FacadeLibrary
                    value={design.facadeName || ""}
                    onSelect={(item) => {
                      const match = suitableFacades.find((f) => f.id === item.id || f.name.toLowerCase() === item.name.toLowerCase());
                      const uplift = match ? match.uplift : (facadePriceForDesign(item.name, isDouble ? "double" : "single", design.designName) ?? 0);
                      onChange({
                        isCustomFacade: false,
                        facadeName: item.name,
                        facadePrice: uplift,
                        facadeImageUrl: item.url,
                      });
                    }}
                    storey={isDouble ? "double" : "single"}
                    designName={design.designName}
                    garage={isSingleGarageDesign(design.designName, design.housingType) ? 1 : 2}
                    designFacades={isDuplex ? suitableFacades.filter((f) => f.url).map((f) => ({
                      id: f.id || f.name,
                      name: f.name,
                      range: f.range || f.note || design.housingType,
                      tags: [f.name.toLowerCase(), "duplex"],
                      url: f.url!,
                      originalUrl: f.url,
                    })) : undefined}
                  />
                </div>
                <Select
                  value={design.isCustomFacade ? "CUSTOM_FACADE" : design.facadeName || suitableFacades[0]?.name}
                  onValueChange={handleFacadeSelect}
                >
                  <SelectTrigger className="w-full border-slate-800 bg-slate-900 text-xs text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-800 bg-slate-900 text-slate-200 max-h-72">
                    {suitableFacades.map((f, idx) => (
                      <SelectItem key={f.id || `${f.name}-${idx}`} value={f.name}>
                        <div className="flex items-center justify-between gap-2 w-full">
                          <span>{f.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {f.note ? `${f.note} • ` : ""}
                            {f.uplift === 0 ? "(Standard Included $0)" : `(+${formatAud(f.uplift)})`}
                          </span>
                        </div>
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

            {/* Builder Promotion / Managers Discount Allowance */}
            <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Tag className="h-3.5 w-3.5 text-emerald-400" />
                  <Label className="text-xs text-slate-300 font-semibold">
                    Managers Discount / Promotional Allowance
                  </Label>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                    $10k Closer Safety Net
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {design.promotionsDiscount > 0 ? `-${formatAud(design.promotionsDiscount)}` : "$0 (Standard)"}
                </span>
              </div>

              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-400">Discount Title</Label>
                  <Input
                    value={design.promotionName ?? "Managers Discount"}
                    onChange={(e) => onChange({ promotionName: e.target.value })}
                    placeholder="Managers Discount"
                    className="h-8.5 text-xs border-slate-800 bg-slate-900 text-slate-100 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] text-slate-400">Managers Discretionary Discount ($)</Label>
                    <span className="text-[9px] text-slate-500 font-mono">Autofills $0 &bull; $10k buffer</span>
                  </div>
                  <Input
                    type="number"
                    value={design.promotionsDiscount ?? 0}
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
            <strong>Custom Architectural Quoting Engine:</strong> Select the target inclusion specification tier and enter individual floor area dimensions below. The dynamic rates and base price calculate automatically using the Hudson QLD price list gradient calibration.
          </div>

          {/* 1. Custom Inclusion Specification Tier Selector */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              Inclusion Specification Range (Drives Dynamic Area Rates)
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {CUSTOM_INCLUSION_TIERS.map((tier) => {
                const isSelected =
                  design.specTier === tier.id ||
                  (tier.id === "H1 Smart Inclusions" && design.specTier === "H1 Inclusions (2025)") ||
                  (tier.id === "H2 Design Inclusions" && design.specTier === "H2 Inclusions (2025)") ||
                  (tier.id === "H3 Luxury Inclusions" && design.specTier === "H3 Inclusions (2025)");
                const tierPrice = calculateCustomFloorplanPrice(customSpec, tier.id);
                return (
                  <div
                    key={tier.id}
                    onClick={() => {
                      onChange({
                        specTier: tier.id,
                        basePrice: tierPrice,
                      });
                      toast.success(`Inclusions set to ${tier.label}`);
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-950/30 ring-1 ring-emerald-500/50 shadow-md"
                        : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white block truncate">{tier.label}</span>
                      {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                    </div>
                    <span className="text-[9px] uppercase font-mono px-1 py-0.5 rounded bg-slate-800 text-slate-300 inline-block mt-1">
                      {tier.tag}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                      {tier.desc}
                    </p>
                    <div className="mt-2 pt-1.5 border-t border-slate-800 text-right">
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        {formatAud(tierPrice)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Storey Configuration & Area Dimensions */}
          <div className="space-y-4 bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-slate-200 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-cyan-400" />
                Floorplan Areas &amp; Architectural Dimensions
              </Label>
              <span className="text-[11px] text-slate-400 font-mono">
                Total: <strong className="text-white">{calculateCustomTotalM2(customSpec)} m²</strong>
              </span>
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
          </div>

          {/* 3. Dynamic Area Rates Breakdown Engine (QLD Price List Calibrated) */}
          {(() => {
            const rates = getCustomAreaRates(customSpec, design.specTier);
            return (
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-cyan-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Calculated Area Rates ({design.specTier})
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                      Seamless Gradient Engine
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Smooth decay calibrated to QLD Price Lists (+~$100/m² custom premium)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-center">
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 block font-medium">Ground Living</span>
                    <span className="text-xs font-bold text-slate-200 font-mono">{formatAud(rates.groundLivingRate)}/m²</span>
                    <span className="text-[9px] text-slate-500 block font-mono">{customSpec.groundLivingM2 || 0} m²</span>
                  </div>

                  {customSpec.storeys === "double" && (
                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block font-medium">First Floor Living</span>
                      <span className="text-xs font-bold text-slate-200 font-mono">{formatAud(rates.firstLivingRate)}/m²</span>
                      <span className="text-[9px] text-slate-500 block font-mono">{customSpec.firstLivingM2 || 0} m²</span>
                    </div>
                  )}

                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 block font-medium">Garage</span>
                    <span className="text-xs font-bold text-slate-200 font-mono">{formatAud(rates.garageRate)}/m²</span>
                    <span className="text-[9px] text-slate-500 block font-mono">{customSpec.garageM2 || 0} m²</span>
                  </div>

                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/60">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-[10px] text-slate-400 font-medium">Alfresco</span>
                      {design.specTier?.includes("H3") && (
                        <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1 rounded font-bold">+600x600</span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-slate-200 font-mono">{formatAud(rates.alfrescoRate)}/m²</span>
                    <span className="text-[9px] text-slate-500 block font-mono">{customSpec.alfrescoM2 || 0} m²</span>
                  </div>

                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/60">
                    <span className="text-[10px] text-slate-400 block font-medium">Porch</span>
                    <span className="text-xs font-bold text-slate-200 font-mono">{formatAud(rates.porchRate)}/m²</span>
                    <span className="text-[9px] text-slate-500 block font-mono">{customSpec.porchM2 || 0} m²</span>
                  </div>

                  {customSpec.storeys === "double" && (
                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block font-medium">Balcony</span>
                      <span className="text-xs font-bold text-slate-200 font-mono">{formatAud(rates.balconyRate)}/m²</span>
                      <span className="text-[9px] text-slate-500 block font-mono">{customSpec.balconyM2 || 0} m²</span>
                    </div>
                  )}

                  {customSpec.storeys === "double" && (
                    <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/60">
                      <span className="text-[10px] text-slate-400 block font-medium">Scaffolding</span>
                      <span className="text-xs font-bold text-emerald-400 font-mono">{formatAud(rates.scaffoldingAllowance)}</span>
                      <span className="text-[9px] text-slate-500 block font-mono">Allowance</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-slate-800">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="text-[11px] text-slate-400">Total House:</span>
                    <span className="text-sm font-bold text-white font-mono">
                      {rates.totalM2} m²
                    </span>
                    <span className="text-[11px] text-slate-400 ml-2">Blended Avg:</span>
                    <span className="text-sm font-bold text-cyan-400 font-mono">
                      {formatAud(rates.blendedRate)}/m²
                    </span>
                    {rates.totalM2 >= 500 && (
                      <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                        Guaranteed Minimum Floor Rate Applied (≥500 m²)
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 mr-2">Calculated Custom Base Price:</span>
                    <span className="text-lg font-bold text-emerald-400 font-mono">
                      {formatAud(design.basePrice)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 4. Facade Selection & Managers Discount for Custom Design */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Architectural Facade Selector */}
            <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                  <PenTool className="h-3.5 w-3.5 text-cyan-400" />
                  Architectural Facade ({isDouble ? "Double Storey" : "Single Storey"} Range)
                </Label>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {design.facadePrice === 0 ? "Standard Included ($0)" : `+${formatAud(design.facadePrice)}`}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <Label className="text-[11px] text-slate-400 font-medium">
                    Select Facade from Price List ({suitableFacades.length} available)
                  </Label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <FacadeLibrary
                      value={design.facadeName || ""}
                      onSelect={(item) => {
                        const match = suitableFacades.find((f) => f.id === item.id || f.name.toLowerCase() === item.name.toLowerCase());
                        const uplift = match ? match.uplift : (facadePriceForDesign(item.name, isDouble ? "double" : "single", design.designName) ?? 0);
                        onChange({
                          isCustomFacade: false,
                          facadeName: item.name,
                          facadePrice: uplift,
                          facadeImageUrl: item.url,
                        });
                      }}
                      storey={isDouble ? "double" : "single"}
                      designName={design.designName}
                      garage={
                        customSpec.garageM2 > 0 && customSpec.garageM2 <= 26
                          ? 1
                          : customSpec.garageM2 > 26
                          ? 2
                          : null
                      }
                    />

                    {/* Upload Custom Facade Photo Button */}
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-xs font-semibold shadow-sm transition-colors">
                      <Upload className="h-3.5 w-3.5" />
                      <span>Import Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = () => {
                              const dataUrl = reader.result as string;
                              onChange({
                                isCustomFacade: true,
                                facadeName: design.facadeName && design.isCustomFacade ? design.facadeName : file.name.replace(/\.[^/.]+$/, "") || "Custom Facade",
                                facadeImageUrl: dataUrl,
                              });
                              toast.success("Custom facade photo attached!");
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Attached Photo Preview Badge */}
                {design.facadeImageUrl && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-xs">
                    <div className="flex items-center gap-2">
                      <img src={design.facadeImageUrl} alt="Facade preview" className="h-7 w-12 object-cover rounded border border-emerald-500/40" />
                      <span className="text-emerald-300 text-[11px] font-medium">Custom Facade Photo Attached</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onChange({ facadeImageUrl: undefined })}
                      className="text-[10px] text-red-400 hover:text-red-300 font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                )}

                <Select
                  value={design.isCustomFacade ? "CUSTOM_FACADE" : design.facadeName || suitableFacades[0]?.name}
                  onValueChange={handleFacadeSelect}
                >
                  <SelectTrigger className="w-full border-slate-800 bg-slate-900 text-xs text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-800 bg-slate-900 text-slate-200 max-h-72">
                    {suitableFacades.map((f, idx) => (
                      <SelectItem key={f.id || `${f.name}-${idx}`} value={f.name}>
                        <div className="flex items-center justify-between gap-2 w-full">
                          <span>{f.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {f.note ? `${f.note} • ` : ""}
                            {f.uplift === 0 ? "(Standard Included $0)" : `(+${formatAud(f.uplift)})`}
                          </span>
                        </div>
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

            {/* Builder Promotion / Managers Discount Allowance */}
            <div className="space-y-3 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Tag className="h-3.5 w-3.5 text-emerald-400" />
                  <Label className="text-xs text-slate-300 font-semibold">
                    Managers Discount / Promotional Allowance
                  </Label>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                    $10k Closer Safety Net
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {design.promotionsDiscount > 0 ? `-${formatAud(design.promotionsDiscount)}` : "$0 (Standard)"}
                </span>
              </div>

              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-slate-400">Discount Title</Label>
                  <Input
                    value={design.promotionName ?? "Managers Discount"}
                    onChange={(e) => onChange({ promotionName: e.target.value })}
                    placeholder="Managers Discount"
                    className="h-8.5 text-xs border-slate-800 bg-slate-900 text-slate-100 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] text-slate-400">Managers Discretionary Discount ($)</Label>
                    <span className="text-[9px] text-slate-500 font-mono">Autofills $0 &bull; $10k buffer</span>
                  </div>
                  <Input
                    type="number"
                    value={design.promotionsDiscount ?? 0}
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

      {/* Architectural Facade & Floorplan Visual Specification */}
      <div className="space-y-4 bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
        {/* 1. Chosen Facade Render (Rendered on top in HD) */}
        <QuoteFacadeRenderPreview design={design} maxHeight="360px" />

        {/* 2. Floorplan Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800/80 pt-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <ImageIcon className="h-4 w-4 text-emerald-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-100">
                Architectural Floorplan Layout Drawing
              </h4>
              {design.isModifiedFloorplan && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Modified Design Attached (Client Estimate Only)
                </span>
              )}
            </div>
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
        initialImageUrl={activeFloorplanUrl || undefined}
        onSave={(croppedDataUrl) => {
          if (design.mode === "custom_floorplan") {
            onChange({
              floorplanUrl: croppedDataUrl,
              isModifiedFloorplan: false,
            });
          } else {
            onChange({
              floorplanUrl: croppedDataUrl,
              isModifiedFloorplan: true,
            });
          }
        }}
        onExtractedAreas={(extracted) => {
          if (design.mode === "custom_floorplan") {
            const updatedSpec: CustomFloorplanSpec = {
              ...customSpec,
              groundLivingM2: extracted.groundLivingM2 ?? extracted.livingM2 ?? customSpec.groundLivingM2,
              firstLivingM2: extracted.firstLivingM2 ?? customSpec.firstLivingM2,
              garageM2: extracted.garageM2 ?? customSpec.garageM2,
              alfrescoM2: extracted.alfrescoM2 ?? customSpec.alfrescoM2,
              porchM2: extracted.porchM2 ?? customSpec.porchM2,
              balconyM2: extracted.balconyM2 ?? customSpec.balconyM2,
            };
            const totalM2 = calculateCustomTotalM2(updatedSpec);
            const basePrice = calculateCustomFloorplanPrice(updatedSpec, design.specTier);
            onChange({
              customSpec: updatedSpec,
              designM2: totalM2,
              basePrice,
              isModifiedFloorplan: false,
              modifiedDesignM2: undefined,
              modifiedAreas: undefined,
            });
            toast.success(`Custom plan dimensions updated (${totalM2} m² total).`);
            return;
          }

          const currentAreas = design.modifiedAreas || (design.standardAreas as any) || {};
          const mergedAreas = {
            ...currentAreas,
            ...(extracted.livingM2 ? { livingM2: extracted.livingM2 } : {}),
            ...(extracted.groundLivingM2 ? { groundLivingM2: extracted.groundLivingM2 } : {}),
            ...(extracted.firstLivingM2 ? { firstLivingM2: extracted.firstLivingM2 } : {}),
            ...(extracted.garageM2 ? { garageM2: extracted.garageM2 } : {}),
            ...(extracted.alfrescoM2 ? { alfrescoM2: extracted.alfrescoM2 } : {}),
            ...(extracted.porchM2 ? { porchM2: extracted.porchM2 } : {}),
            ...(extracted.balconyM2 ? { balconyM2: extracted.balconyM2 } : {}),
            ...(extracted.totalM2 ? { totalM2: extracted.totalM2 } : {}),
          };
          const draftDesign: QuoteDesignSelection = {
            ...design,
            isModifiedFloorplan: true,
            modifiedAreas: mergedAreas,
          };
          const pricing = calculateModifiedFloorplanPricing(draftDesign);
          onChange({
            isModifiedFloorplan: true,
            modifiedAreas: mergedAreas,
            modifiedDesignM2: pricing.modifiedTotalM2,
            basePrice: pricing.modifiedBasePrice,
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
        onExtractedAreas={(extracted) => {
          const currentAreas = secondDwelling.modifiedAreas || secondDwelling.standardAreas || {};
          const mergedAreas = {
            ...currentAreas,
            ...(extracted.livingM2 ? { livingM2: extracted.livingM2 } : {}),
            ...(extracted.groundLivingM2 ? { groundLivingM2: extracted.groundLivingM2 } : {}),
            ...(extracted.firstLivingM2 ? { firstLivingM2: extracted.firstLivingM2 } : {}),
            ...(extracted.garageM2 ? { garageM2: extracted.garageM2 } : {}),
            ...(extracted.alfrescoM2 ? { alfrescoM2: extracted.alfrescoM2 } : {}),
            ...(extracted.porchM2 ? { porchM2: extracted.porchM2 } : {}),
            ...(extracted.balconyM2 ? { balconyM2: extracted.balconyM2 } : {}),
            ...(extracted.totalM2 ? { totalM2: extracted.totalM2 } : {}),
          };
          const draftDesign: QuoteDesignSelection = {
            ...design,
            designName: secondDwelling.designName,
            designM2: secondDwelling.designM2,
            basePrice: secondDwelling.standardBasePrice || secondDwelling.basePrice,
            isModifiedFloorplan: true,
            standardAreas: secondDwelling.standardAreas as any,
            modifiedAreas: mergedAreas,
          };
          const pricing = calculateModifiedFloorplanPricing(draftDesign);
          onChange({
            secondDwelling: {
              ...secondDwelling,
              isModifiedFloorplan: true,
              modifiedAreas: mergedAreas,
              designM2: pricing.modifiedTotalM2,
              basePrice: pricing.modifiedBasePrice,
            },
          });
        }}
      />

      {/* Automated Modified Floorplan Recognition & Discrepancies Review Modal */}
      <ModifiedPlanReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        analysis={pendingAnalysis}
        onApply={handleApplyModifiedPlan}
      />
    </div>
  );
}
