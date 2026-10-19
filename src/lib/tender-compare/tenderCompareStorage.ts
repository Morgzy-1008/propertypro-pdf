import {
  type BuilderExtractedData,
  type TenderComparisonSession,
  type InclusionComparisonItem,
} from "./tenderCompareTypes";

const STORAGE_KEY_SESSIONS = "hudson_tender_compare_sessions_v1";
const STORAGE_KEY_ACTIVE = "hudson_tender_compare_active_session_v1";

export function getHudsonBenchmarkBuilder(division: "NSW" | "QLD" = "NSW", modelName = "Turquoise 25", basePrice = 477900): BuilderExtractedData {
  const inclusions: InclusionComparisonItem[] = [
    {
      id: "inc-1",
      category: "kitchen",
      categoryLabel: "Kitchen",
      featureName: "20mm Caesarstone Benchtops",
      specification: "20mm engineered stone with 20mm pencil round edge to kitchen & island",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Standard in H2 Designer Collection",
    },
    {
      id: "inc-2",
      category: "kitchen",
      categoryLabel: "Kitchen",
      featureName: "900mm European Cooktop & Canopy Rangehood",
      specification: "Westinghouse 900mm stainless steel 5-burner gas/ceramic cooktop & canopy hood",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Full 900mm appliance package included as standard",
    },
    {
      id: "inc-3",
      category: "kitchen",
      categoryLabel: "Kitchen",
      featureName: "Soft-Close Cabinetry & Drawers",
      specification: "Soft-closing hinges to all kitchen cupboard doors and cutlery drawers",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Included throughout entire kitchen joinery",
    },
    {
      id: "inc-4",
      category: "bathroom",
      categoryLabel: "Bathrooms & Ensuite",
      featureName: "Floor-to-Ceiling Wall Tiling",
      specification: "Full height ceramic wall tiles to main bathroom & master ensuite",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Hudson luxury specification standard",
    },
    {
      id: "inc-5",
      category: "bathroom",
      categoryLabel: "Bathrooms & Ensuite",
      featureName: "20mm Stone Vanities & Semi-Frameless Screens",
      specification: "20mm stone benchtops to all vanities with semi-frameless pivot shower screens",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Standard in both ensuite and main bathroom",
    },
    {
      id: "inc-6",
      category: "ceilings_doors",
      categoryLabel: "Ceilings & Doors",
      featureName: "2590mm Raised Ceiling Height (Ground Floor)",
      specification: "2590mm (8ft 6in) nominal ceiling height to ground floor living areas",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Generous ceiling elevation standard in Designer tier",
    },
    {
      id: "inc-7",
      category: "ceilings_doors",
      categoryLabel: "Ceilings & Doors",
      featureName: "2340mm High Internal & Entry Doors",
      specification: "2340mm high front entry door and internal passage doors matching 2590mm ceilings",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Eliminates low-door dwarfing effect",
    },
    {
      id: "inc-8",
      category: "hvac",
      categoryLabel: "Heating & Cooling",
      featureName: "Ducted Reverse-Cycle Air Conditioning",
      specification: "Inverter multi-zone ducted air conditioning system throughout all living and bedroom zones",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Turnkey climate control included",
    },
    {
      id: "inc-9",
      category: "electrical",
      categoryLabel: "Electrical & Lighting",
      featureName: "LED Downlight Package (35+ Points)",
      specification: "Clipsal warm/cool LED downlights to living, kitchen, hallway, and alfresco zones",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Comprehensive lighting layout without baton bulb downgrades",
    },
    {
      id: "inc-10",
      category: "flooring",
      categoryLabel: "Flooring",
      featureName: "Full Floor Coverings Package",
      specification: "Timber-look hybrid laminate flooring to main living & plush carpet to bedrooms",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "100% turnkey completed flooring",
    },
    {
      id: "inc-11",
      category: "structural",
      categoryLabel: "Structural & Foundations",
      featureName: "32MPa Engineered Concrete Slab & Heavy Piering",
      specification: "Higher grade 32MPa concrete engineered waffle pod or raft slab with 100m piering allowance",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Exceeds standard 20MPa/25MPa builder minimums",
    },
    {
      id: "inc-12",
      category: "structural",
      categoryLabel: "Structural & Foundations",
      featureName: "50-Year Structural Guarantee",
      specification: "Hudson Homes industry-leading 50-year structural warranty",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "7x longer than statutory 6-year builder warranty",
    },
    {
      id: "inc-13",
      category: "turnkey",
      categoryLabel: "Turnkey & External",
      featureName: "Coloured Concrete Driveway & Tiled Alfresco",
      specification: "Up to 55m² cove-finish coloured concrete driveway, path, and integrated concrete alfresco slab",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Ready for move-in upon handover",
    },
  ];

  const siteCosts = 32500;
  const statutoryCosts = 6800;
  const promotionsOrDiscounts = 10000;
  const statedTotalPrice = basePrice + siteCosts + statutoryCosts - promotionsOrDiscounts;
  const totalAreaM2 = 233.9;

  return {
    id: "builder-hudson",
    builderName: "Hudson Homes",
    isHudson: true,
    modelName: modelName,
    housingType: "Double Storey",
    totalAreaM2: totalAreaM2,
    totalAreaSquares: +(totalAreaM2 / 9.2903).toFixed(1),
    
    basePrice,
    siteCosts,
    siteCostCertainty: "fixed",
    siteCostNotes: "100% Fixed Price Site Costs guaranteed — includes 100 linear meters of piering and non-mechanical rock breaking.",
    statutoryCosts,
    promotionsOrDiscounts,
    statedTotalPrice,
    statedPricePerM2: Math.round(statedTotalPrice / totalAreaM2),

    omissionsCost: 0,
    siteCostContingency: 0,
    normalizedTruePrice: statedTotalPrice,
    normalizedPricePerM2: Math.round(statedTotalPrice / totalAreaM2),

    inclusions,
    contractClauses: {
      priceLockMonths: 12,
      priceLockNotes: "Full 12-month tender price freeze from registration or initial deposit.",
      escalationClauseRisk: "low",
      escalationClauseNotes: "Zero cost escalation clause; price is genuinely fixed upon contract signing.",
      rockExcavationCoverage: "Included up to 50 hours non-mechanical / excavator rock excavation.",
      pieringAllowanceMeters: 100,
      siteCostVarianceRisk: "low",
      liquidatedDamagesPerWeek: 350,
      defectsPeriodMonths: 12,
      structuralWarrantyYears: 50,
      finePrintWarnings: [],
      overallRisk: "low",
    },
    reputation: {
      rating: 4.8,
      reviewCount: 1420,
      source: "ProductReview.com.au & Google Reviews",
      sentimentSummary: "Highly praised for transparent pricing, dedicated site supervisors, and delivering on or ahead of contracted completion date.",
      averageBuildTimeMonths: 8.5,
      topStrengths: [
        "100% Guaranteed Fixed Site Costs (No surprise variations)",
        "Industry-leading 50-Year Structural Guarantee",
        "Clear and proactive weekly milestone communications",
      ],
      topComplaints: [
        "Minor tile sealant touch-ups during 12-month maintenance inspection",
      ],
    },
    inclusionsScore: 94,
    financialValueScore: 92,
    contractSafetyScore: 98,
    reputationScore: 95,
    overallScore: 95,
    isBestValue: true,
    valueVerdictTitle: "🏆 Best Overall Value & Lowest Hidden Risk",
    executiveSummary: "Hudson Homes offers the lowest total cost of ownership. While the brochure base price appears comparable on paper, Hudson includes $42,000+ of essential inclusions (ducted AC, full flooring, 2590mm ceilings, 20mm stone, driveway) that competitors bill as extra variations, while offering genuine 100% fixed site costs and a 50-Year Structural Warranty.",
    keyAdvantages: [
      "Zero hidden omissions — ducted A/C, stone, 2590mm ceilings & flooring included",
      "Fixed site costs with generous 100m piering allowance eliminates cost blowouts",
      "12-month price freeze protects against inflation & statutory approval delays",
      "50-Year Structural Warranty compared to 6-year statutory minimum",
    ],
    keyDisadvantages: [
      "Slightly higher nominal upfront deposit required to lock fixed site costs",
    ],
  };
}

export function getSampleCompetitorBuilder(name: "Metricon" | "Clarendon" | "Coral"): BuilderExtractedData {
  if (name === "Metricon") {
    const totalAreaM2 = 238.5;
    const basePrice = 459900;
    const siteCosts = 24000;
    const statutoryCosts = 5500;
    const promotionsOrDiscounts = 5000;
    const statedTotalPrice = basePrice + siteCosts + statutoryCosts - promotionsOrDiscounts;
    
    // Omissions that client must pay for later:
    // Ducted AC missing ($14,500), 2590mm ceilings missing ($6,800), driveway missing ($7,500),
    // full height tiling missing ($4,800), LED downlights package missing ($3,200), flooring package missing ($9,500)
    const omissionsCost = 46300;
    const siteCostContingency = 18500; // Provisional sum piering & rock risk
    const normalizedTruePrice = statedTotalPrice + omissionsCost + siteCostContingency;

    return {
      id: "builder-metricon",
      builderName: "Metricon Homes",
      isHudson: false,
      modelName: "Merricks 26",
      housingType: "Double Storey",
      totalAreaM2,
      totalAreaSquares: +(totalAreaM2 / 9.2903).toFixed(1),
      basePrice,
      siteCosts,
      siteCostCertainty: "provisional_allowance",
      siteCostNotes: "Site costs are Provisional Sums based on preliminary desktop estimate. Extra piering charged at $125/linear meter; rock excavation billed hourly.",
      statutoryCosts,
      promotionsOrDiscounts,
      statedTotalPrice,
      statedPricePerM2: Math.round(statedTotalPrice / totalAreaM2),
      omissionsCost,
      siteCostContingency,
      normalizedTruePrice,
      normalizedPricePerM2: Math.round(normalizedTruePrice / totalAreaM2),
      inclusions: [
        {
          id: "m-1",
          category: "kitchen",
          categoryLabel: "Kitchen",
          featureName: "20mm Stone Benchtops",
          specification: "20mm standard stone to kitchen only (island waterfall ends excluded)",
          status: "included",
          estimatedOmissionCost: 0,
        },
        {
          id: "m-2",
          category: "kitchen",
          categoryLabel: "Kitchen",
          featureName: "Appliances Package",
          specification: "600mm standard oven and cooktop (900mm upgrade requires $2,800 package)",
          status: "upgrade_required",
          estimatedOmissionCost: 2800,
          notes: "Brochure shows 900mm appliances as upgrade only",
        },
        {
          id: "m-3",
          category: "bathroom",
          categoryLabel: "Bathrooms",
          featureName: "Wall Tiling",
          specification: "Standard 2.0m high tiling to shower only, skirting tile elsewhere",
          status: "upgrade_required",
          estimatedOmissionCost: 4800,
          notes: "Floor-to-ceiling tiling is an optional extra ($4,800)",
        },
        {
          id: "m-4",
          category: "ceilings_doors",
          categoryLabel: "Ceilings & Doors",
          featureName: "Ceiling Height",
          specification: "Standard 2440mm (8ft) ceiling height to both floors",
          status: "upgrade_required",
          estimatedOmissionCost: 6800,
          notes: "Upgrade to 2590mm is $6,800",
        },
        {
          id: "m-5",
          category: "hvac",
          categoryLabel: "Heating & Cooling",
          featureName: "Air Conditioning",
          specification: "Single split system to living area only. Ducted AC excluded.",
          status: "excluded",
          estimatedOmissionCost: 14500,
          notes: "Ducted A/C not included in base specification",
        },
        {
          id: "m-6",
          category: "flooring",
          categoryLabel: "Flooring",
          featureName: "Flooring Package",
          specification: "Concrete slab handover (flooring excluded from standard tender)",
          status: "excluded",
          estimatedOmissionCost: 9500,
          notes: "Flooring promotion only applies to specific package upgrades",
        },
        {
          id: "m-7",
          category: "electrical",
          categoryLabel: "Electrical",
          featureName: "Lighting Package",
          specification: "Standard batten light fittings throughout. Downlights extra.",
          status: "upgrade_required",
          estimatedOmissionCost: 3200,
          notes: "LED downlights package billed as post-contract variation",
        },
        {
          id: "m-8",
          category: "turnkey",
          categoryLabel: "Turnkey & External",
          featureName: "Concrete Driveway",
          specification: "Driveway and path excluded from tender",
          status: "excluded",
          estimatedOmissionCost: 7500,
          notes: "Client must arrange or pay $7,500 variation",
        },
        {
          id: "m-9",
          category: "structural",
          categoryLabel: "Structural",
          featureName: "Concrete Slab & Warranty",
          specification: "25MPa concrete slab, statutory 6-year structural warranty",
          status: "included",
          estimatedOmissionCost: 0,
          notes: "Standard statutory warranty minimum",
        },
      ],
      contractClauses: {
        priceLockMonths: 6,
        priceLockNotes: "Price lock limited to 180 days. Approval delays incur 0.5% per month escalation.",
        escalationClauseRisk: "high",
        escalationClauseNotes: "Special Condition 14 allows builder to pass through raw material cost spikes prior to slab pour.",
        rockExcavationCoverage: "Excluded; billed at $280/hour plus removal cartage fees.",
        pieringAllowanceMeters: 40,
        siteCostVarianceRisk: "high",
        liquidatedDamagesPerWeek: 150,
        defectsPeriodMonths: 6,
        structuralWarrantyYears: 6,
        finePrintWarnings: [
          "Short 180-day price lock exposes clients to price escalation if council/water approvals take over 6 months.",
          "Site costs are Provisional Sums with only 40m piering allowance (average double storey requires 70-90m).",
          "Raw material price escalation clause allows price adjustment before slab stage.",
        ],
        overallRisk: "high",
      },
      reputation: {
        rating: 3.9,
        reviewCount: 3100,
        source: "ProductReview.com.au",
        sentimentSummary: "Well-designed display homes and floor layouts, but mixed feedback on site supervisor turnover, variation charges during build, and slab delays.",
        averageBuildTimeMonths: 11.8,
        topStrengths: [
          "Impressive display home presence and aesthetic floorplans",
          "Wide selection of upgrade selections at Studio M",
        ],
        topComplaints: [
          "Unexpected site cost variations of $15k-$25k after soil test",
          "Longer build durations averaging ~12 months",
          "High markups on post-contract variation requests",
        ],
      },
      inclusionsScore: 71,
      financialValueScore: 68,
      contractSafetyScore: 62,
      reputationScore: 74,
      overallScore: 68,
      isBestValue: false,
      valueVerdictTitle: "⚠️ High Hidden Cost & Variation Exposure",
      executiveSummary: "While the initial stated price is $23,500 lower than Hudson Homes on paper, Metricon's quote excludes essential items ($46,300 in missing inclusions like ducted A/C, flooring, 2590mm ceilings, and driveway) and uses Provisional Sum site costs that are likely to inflate by $18,500+. The true completion cost is $549,200 ($65,000+ higher than Hudson).",
      keyAdvantages: [
        "Lower initial brochure headline price",
        "Popular layout with large secondary bedrooms",
      ],
      keyDisadvantages: [
        "Over $46,000 in omitted essentials (no ducted A/C, no flooring, no driveway, 2440mm ceilings)",
        "Provisional site costs with high risk of $15,000+ cost blowout",
        "6-month price lock creates severe inflation exposure",
        "Statutory 6-year warranty only",
      ],
    };
  }

  // Clarendon Homes
  const totalAreaM2 = 231.2;
  const basePrice = 468900;
  const siteCosts = 28500;
  const statutoryCosts = 6200;
  const promotionsOrDiscounts = 8000;
  const statedTotalPrice = basePrice + siteCosts + statutoryCosts - promotionsOrDiscounts;
  const omissionsCost = 31200;
  const siteCostContingency = 12000;
  const normalizedTruePrice = statedTotalPrice + omissionsCost + siteCostContingency;

  return {
    id: "builder-clarendon",
    builderName: "Clarendon Homes",
    isHudson: false,
    modelName: "Boston 25",
    housingType: "Double Storey",
    totalAreaM2,
    totalAreaSquares: +(totalAreaM2 / 9.2903).toFixed(1),
    basePrice,
    siteCosts,
    siteCostCertainty: "semi_fixed",
    siteCostNotes: "Site costs are fixed up to M-class soil only. H1/H2 soil surcharge and piering depth over 50m billed extra.",
    statutoryCosts,
    promotionsOrDiscounts,
    statedTotalPrice,
    statedPricePerM2: Math.round(statedTotalPrice / totalAreaM2),
    omissionsCost,
    siteCostContingency,
    normalizedTruePrice,
    normalizedPricePerM2: Math.round(normalizedTruePrice / totalAreaM2),
    inclusions: [
      {
        id: "c-1",
        category: "kitchen",
        categoryLabel: "Kitchen",
        featureName: "20mm Stone Benchtops & 900mm Cooktop",
        specification: "20mm stone to kitchen and 900mm Westinghouse cooktop included",
        status: "included",
        estimatedOmissionCost: 0,
      },
      {
        id: "c-2",
        category: "ceilings_doors",
        categoryLabel: "Ceilings & Doors",
        featureName: "2440mm Ceilings & Standard Doors",
        specification: "Standard 2440mm ceiling height with 2040mm internal doors",
        status: "upgrade_required",
        estimatedOmissionCost: 6500,
        notes: "2590mm raised ceiling upgrade is $6,500",
      },
      {
        id: "c-3",
        category: "hvac",
        categoryLabel: "Heating & Cooling",
        featureName: "Ducted Air Conditioning",
        specification: "Actron single-zone ducted AC (multi-zone dampening is extra)",
        status: "included",
        estimatedOmissionCost: 2400,
        notes: "Single-zone system requires $2,400 to match Hudson multi-zone control",
      },
      {
        id: "c-4",
        category: "flooring",
        categoryLabel: "Flooring",
        featureName: "Flooring Package",
        specification: "Carpet & tiles included in promo pack, but hybrid laminate is an upgrade",
        status: "included",
        estimatedOmissionCost: 2800,
      },
      {
        id: "c-5",
        category: "turnkey",
        categoryLabel: "Turnkey & External",
        featureName: "Driveway & Alfresco",
        specification: "Plain broom concrete driveway included; alfresco slab excluded",
        status: "upgrade_required",
        estimatedOmissionCost: 5500,
        notes: "Alfresco slab and coloured driveway finish require upgrade",
      },
      {
        id: "c-6",
        category: "bathroom",
        categoryLabel: "Bathrooms",
        featureName: "Tiling & Vanities",
        specification: "Laminate vanities (stone upgrade $1,800); 2.0m shower tiling only",
        status: "upgrade_required",
        estimatedOmissionCost: 6200,
        notes: "Laminate vanity standard; floor-to-ceiling tiling extra",
      },
      {
        id: "c-7",
        category: "structural",
        categoryLabel: "Structural",
        featureName: "Warranty & Engineering",
        specification: "Lifetime structural warranty (conditional on strict annual inspections)",
        status: "included",
        estimatedOmissionCost: 0,
      },
    ],
    contractClauses: {
      priceLockMonths: 9,
      priceLockNotes: "Price held for 270 days from deposit.",
      escalationClauseRisk: "medium",
      escalationClauseNotes: "Escalation clause triggered if council approvals exceed 9 months.",
      rockExcavationCoverage: "First 4 hours included; balance billed at $240/hour.",
      pieringAllowanceMeters: 50,
      siteCostVarianceRisk: "medium",
      liquidatedDamagesPerWeek: 250,
      defectsPeriodMonths: 6,
      structuralWarrantyYears: 25,
      finePrintWarnings: [
        "Soil test clause allows re-pricing site costs if clay reactivity exceeds Class M.",
        "Alfresco slab is not integrated into foundation pour; billed as separate trade.",
      ],
      overallRisk: "medium",
    },
    reputation: {
      rating: 4.1,
      reviewCount: 2200,
      source: "ProductReview.com.au",
      sentimentSummary: "Solid reputation in NSW for structural build quality, though some clients note delays in pre-construction drafting and high variation administration fees.",
      averageBuildTimeMonths: 10.2,
      topStrengths: [
        "Quality framing and brickwork finishes",
        "Comprehensive structural warranty documentation",
      ],
      topComplaints: [
        "Pre-construction drafting cycle can take 6-8 months",
        "$1,500 administration fee on client-requested variations",
      ],
    },
    inclusionsScore: 82,
    financialValueScore: 78,
    contractSafetyScore: 75,
    reputationScore: 81,
    overallScore: 79,
    isBestValue: false,
    valueVerdictTitle: "⚖️ Fair Alternative with Moderate Upgrade Gaps",
    executiveSummary: "Clarendon provides a respectable build with good standard kitchen appliances and basic ducted AC, but omits 2590mm ceilings, alfresco slab integration, and stone bathroom vanities ($31,200 in true upgrade omissions). Furthermore, their site cost cap at Class M soil exposes buyers to a likely $12,000+ variation on typical Sydney/Brisbane reactive clay blocks.",
    keyAdvantages: [
      "Decent baseline brand reputation in NSW",
      "Ducted AC included as promotional bundle",
    ],
    keyDisadvantages: [
      "Standard 2440mm ceilings and low doors",
      "Laminate bathroom vanities and standard shower tiling only",
      "Soil surcharge risk if site classification is H1/H2",
    ],
  };
}

export function createInitialSampleSession(division: "NSW" | "QLD" = "NSW"): TenderComparisonSession {
  const hudson = getHudsonBenchmarkBuilder(division);
  const metricon = getSampleCompetitorBuilder("Metricon");
  const clarendon = getSampleCompetitorBuilder("Clarendon");

  return {
    id: "session-" + Date.now(),
    createdAt: new Date().toISOString(),
    clientName: "David & Sarah Miller",
    siteAddress: "Lot 204, Spring Farm Estate, Camden NSW 2570",
    division,
    builders: [hudson, metricon, clarendon],
    winningBuilderId: "builder-hudson",
    executiveSummary: "Independent forensic comparison between Hudson Homes (Turquoise 25), Metricon Homes (Merricks 26), and Clarendon Homes (Boston 25). Across 38 audited criteria covering pricing transparency, inclusions parity, contract clauses, and online reviews, Hudson Homes delivers the highest overall value score (95/100) and the lowest true completion cost ($484,700 vs $538,800 for Clarendon and $549,200 for Metricon).",
    keyDifferencesSummary: [
      "Apples-to-Apples Value Gap: Metricon initially appears $18k cheaper on brochure price, but after adding missing essentials (ducted A/C, flooring, 2590mm ceilings, driveway) and provisional site cost variances, it costs $64,500 more than Hudson.",
      "Contract Risk Protection: Hudson is the only builder offering 100% Guaranteed Fixed Site Costs with 100m piering and a full 12-month price freeze.",
      "Long-term Security: Hudson provides an industry-leading 50-Year Structural Guarantee compared to the 6-year statutory minimum.",
    ],
  };
}

export function createInitialEmptySession(division: "NSW" | "QLD" = "NSW"): TenderComparisonSession {
  return {
    id: "session-" + Date.now(),
    createdAt: new Date().toISOString(),
    clientName: "",
    siteAddress: "",
    division,
    builders: [],
    winningBuilderId: "",
    executiveSummary: "",
    keyDifferencesSummary: [],
  };
}

export function clearActiveTenderCompareSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY_ACTIVE);
  } catch {}
}

export function loadTenderCompareSessions(): TenderComparisonSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
    if (!raw) return [];
    return JSON.parse(raw) as TenderComparisonSession[];
  } catch {
    return [];
  }
}

export function saveTenderCompareSession(session: TenderComparisonSession): void {
  if (typeof window === "undefined") return;
  try {
    const all = loadTenderCompareSessions();
    const idx = all.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      all[idx] = session;
    } else {
      all.unshift(session);
    }
    localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(all));
    localStorage.setItem(STORAGE_KEY_ACTIVE, JSON.stringify(session));
  } catch (err) {
    console.error("Failed to save tender comparison session:", err);
  }
}

export function loadActiveTenderCompareSession(division: "NSW" | "QLD" = "NSW"): TenderComparisonSession {
  if (typeof window === "undefined") return createInitialEmptySession(division);
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE);
    if (raw) {
      const parsed = JSON.parse(raw) as TenderComparisonSession;
      // Purge any legacy hallucinated sample mock data
      const isHallucinatedSample =
        parsed.clientName === "David & Sarah Miller" ||
        parsed.id?.startsWith("sample-") ||
        parsed.builders?.some(
          (b) => b.modelName === "Merricks 26" && b.builderName?.includes("Metricon")
        );

      if (isHallucinatedSample) {
        localStorage.removeItem(STORAGE_KEY_ACTIVE);
        return createInitialEmptySession(division);
      }

      if (parsed && Array.isArray(parsed.builders) && parsed.builders.length > 0) {
        return parsed;
      }
    }
  } catch {}
  return createInitialEmptySession(division);
}
