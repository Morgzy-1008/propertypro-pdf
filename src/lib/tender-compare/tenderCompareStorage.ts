import {
  type BuilderExtractedData,
  type TenderComparisonSession,
  type InclusionComparisonItem,
} from "./tenderCompareTypes";

const STORAGE_KEY_SESSIONS = "hudson_tender_compare_sessions_v1";
const STORAGE_KEY_ACTIVE = "hudson_tender_compare_active_session_v1";

export function getHudsonBenchmarkBuilder(
  division: "NSW" | "QLD" = "NSW",
  modelName = "Turquoise 25",
  basePrice = 467900
): BuilderExtractedData {
  const inclusions: InclusionComparisonItem[] = [
    {
      id: "inc-site-1",
      category: "site_slab",
      categoryLabel: "Site Works & Slab",
      featureName: "Site Earthworks, Cut & Fill",
      specification: "100% Fixed Price site scrape, cut & fill up to 1.0m fall across building platform",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Guaranteed fixed upfront — no post-soil-test re-measure shock",
    },
    {
      id: "inc-site-2",
      category: "site_slab",
      categoryLabel: "Site Works & Slab",
      featureName: "Engineered Concrete Slab (M / H1 / H2)",
      specification: "32MPa engineered waffle/raft concrete slab engineered for reactive clay sites",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Higher 32MPa strength concrete vs standard 20-25MPa",
    },
    {
      id: "inc-site-3",
      category: "site_slab",
      categoryLabel: "Site Works & Slab",
      featureName: "Concrete Piering Allowance",
      specification: "Up to 100 linear meters of bored concrete piers included in fixed site cost",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Double storey homes typically require 70-95m of piers",
    },
    {
      id: "inc-site-4",
      category: "site_slab",
      categoryLabel: "Site Works & Slab",
      featureName: "Rock Excavation & Spoil Removal",
      specification: "Non-mechanical & excavator rock removal included within fixed site pack",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Protects buyer against $250-$350/hr rock breaking variations",
    },
    {
      id: "inc-struct-1",
      category: "structural",
      categoryLabel: "Structural & Framing",
      featureName: "Structural Timber / Termite Framing",
      specification: "T2 Blue termite-treated structural pine framing & engineered floor joists with Kordon barrier",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Full perimeter and penetration termite protection system",
    },
    {
      id: "inc-struct-2",
      category: "structural",
      categoryLabel: "Structural & Framing",
      featureName: "Colorbond or Designer Concrete Roof + Sarking",
      specification: "Colorbond steel roof or Bristile designer profile roof tiles with heavy-duty foil sarking",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Heavy-duty roof sarking included as standard",
    },
    {
      id: "inc-struct-3",
      category: "structural",
      categoryLabel: "Structural & Framing",
      featureName: "Thermal & Acoustic Insulation",
      specification: "R4.0 ceiling batts, R2.5 external wall batts + internal acoustic batts to master/wet walls",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "7-Star NatHERS & BASIX thermal compliance included",
    },
    {
      id: "inc-struct-4",
      category: "structural",
      categoryLabel: "Structural & Framing",
      featureName: "50-Year Structural Guarantee",
      specification: "Hudson Homes 50-Year Structural Warranty backed by comprehensive quality QA inspections",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Over 8x longer than 6-year statutory builder minimum",
    },
    {
      id: "inc-ceil-1",
      category: "ceilings_doors",
      categoryLabel: "Ceilings, Doors & Glazing",
      featureName: "2590mm Raised Ceiling Height",
      specification: "2590mm (8ft 6in) high ceilings to ground floor living rooms",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Standard in H2 Designer Collection",
    },
    {
      id: "inc-ceil-2",
      category: "ceilings_doors",
      categoryLabel: "Ceilings, Doors & Glazing",
      featureName: "2340mm High Entry & Internal Doors",
      specification: "1200mm wide × 2340mm high feature stained timber entry door & 2340mm internal doors",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Matches high ceilings for architectural proportion",
    },
    {
      id: "inc-ceil-3",
      category: "ceilings_doors",
      categoryLabel: "Ceilings, Doors & Glazing",
      featureName: "Keyed Window Locks & Fibreglass Flyscreens",
      specification: "Powdercoated aluminium windows with keyed vent locks and flyscreens to all openable windows",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Flyscreens included to all sliding doors and windows",
    },
    {
      id: "inc-ceil-4",
      category: "ceilings_doors",
      categoryLabel: "Ceilings, Doors & Glazing",
      featureName: "Sectional Garage Door with Auto Opener",
      specification: "Colorbond sectional overhead garage door with automated motor & 3 remote handsets",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Full automation included",
    },
    {
      id: "inc-kit-1",
      category: "kitchen",
      categoryLabel: "Kitchen & Scullery",
      featureName: "20mm Silica-Free Stone Benchtops",
      specification: "20mm engineered stone benchtops to kitchen, island bar & walk-in pantry counter",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Includes island bench breakfast bar overhang",
    },
    {
      id: "inc-kit-2",
      category: "kitchen",
      categoryLabel: "Kitchen & Scullery",
      featureName: "900mm European Cooktop & Built-In Oven",
      specification: "Westinghouse 900mm 5-burner gas or induction cooktop & 900mm multi-function oven",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Full 900mm wide family appliance package",
    },
    {
      id: "inc-kit-3",
      category: "kitchen",
      categoryLabel: "Kitchen & Scullery",
      featureName: "900mm Externally Ducted Canopy Rangehood",
      specification: "900mm concealed/canopy stainless rangehood externally ducted through roof/eave",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Externally ducted (not recirculating into ceiling cavity)",
    },
    {
      id: "inc-kit-4",
      category: "kitchen",
      categoryLabel: "Kitchen & Scullery",
      featureName: "Stainless Steel Dishwasher & Microwave Trim",
      specification: "Freestanding stainless steel dishwasher installed + dedicated microwave recess with GPO",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Dishwasher supplied and plumbed",
    },
    {
      id: "inc-kit-5",
      category: "kitchen",
      categoryLabel: "Kitchen & Scullery",
      featureName: "Soft-Close Joinery & Overhead Bulkheads",
      specification: "Soft-close hinges & drawer runners throughout, overhead cupboards with plasterboard bulkhead",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "No dust-trap gap above kitchen overheads",
    },
    {
      id: "inc-bath-1",
      category: "bathroom",
      categoryLabel: "Bathrooms & Wet Areas",
      featureName: "Floor-to-Ceiling Bathroom & Ensuite Tiling",
      specification: "Full height 2590mm ceramic wall tiling to Master Ensuite and Main Bathroom",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Full-height wet area tiling included",
    },
    {
      id: "inc-bath-2",
      category: "bathroom",
      categoryLabel: "Bathrooms & Wet Areas",
      featureName: "20mm Stone Vanities & Soft-Close Cabinets",
      specification: "20mm stone vanity tops with designer vitreous china basins to all bathrooms",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Stone tops to all wet area vanities",
    },
    {
      id: "inc-bath-3",
      category: "bathroom",
      categoryLabel: "Bathrooms & Wet Areas",
      featureName: "Semi-Frameless Shower Screens & Tiled Niches",
      specification: "2000mm high semi-frameless safety glass screens + recessed tiled shower niches",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Tiled niches included in both showers",
    },
    {
      id: "inc-bath-4",
      category: "bathroom",
      categoryLabel: "Bathrooms & Wet Areas",
      featureName: "Freestanding Designer Bath & Mixer Tapware",
      specification: "1700mm freestanding contoured acrylic bath with chrome/matte black mixer & rail showers",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Freestanding bath standard",
    },
    {
      id: "inc-bath-5",
      category: "bathroom",
      categoryLabel: "Bathrooms & Wet Areas",
      featureName: "Fitted Laundry Joinery & Stone Bench",
      specification: "Laminate base cabinet with 20mm stone benchtop, drop-in stainless tub & tiled splashback",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Full cabinet joinery (not a bare metal tub)",
    },
    {
      id: "inc-hvac-1",
      category: "hvac",
      categoryLabel: "Heating & Cooling",
      featureName: "Multi-Zone Reverse-Cycle Ducted Air Conditioning",
      specification: "14kW+ Daikin/Actron reverse-cycle inverter ducted A/C with 4-zone digital controller",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Sized for whole-home cooling and heating",
    },
    {
      id: "inc-hvac-2",
      category: "hvac",
      categoryLabel: "Heating & Cooling",
      featureName: "Instantaneous Gas or Heat Pump Hot Water",
      specification: "26L/min 6-Star continuous flow gas hot water or energy-efficient heat pump system",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Recessed wall box included",
    },
    {
      id: "inc-elec-1",
      category: "electrical",
      categoryLabel: "Electrical & Lighting",
      featureName: "35+ LED Downlights Package Throughout",
      specification: "Tri-colour 9W LED recessed downlights across living, kitchen, hallways, bedrooms & alfresco",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "No unsightly bare plastic batten holders",
    },
    {
      id: "inc-elec-2",
      category: "electrical",
      categoryLabel: "Electrical & Lighting",
      featureName: "3-Phase Underground Power & Generous GPOs",
      specification: "3-phase mains power connection, Clipsal Iconic switches & double power points to every room",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "3-phase power required for ducted AC & induction cooking",
    },
    {
      id: "inc-elec-3",
      category: "electrical",
      categoryLabel: "Electrical & Lighting",
      featureName: "NBN Conduit, Data Points & Interconnected Alarms",
      specification: "NBN lead-in conduit, Cat6 data points, 2 TV points & hardwired photoelectric smoke alarms",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Full smart-home readiness",
    },
    {
      id: "inc-floor-1",
      category: "flooring",
      categoryLabel: "Flooring & Finishes",
      featureName: "Main Floor Timber-Look Hybrid or 600×600 Porcelain",
      specification: "Waterproof hybrid timber planks or 600×600mm rectified porcelain tiles to ground floor living",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "100% turnkey main floor finish",
    },
    {
      id: "inc-floor-2",
      category: "flooring",
      categoryLabel: "Flooring & Finishes",
      featureName: "Plush Solution-Dyed Carpet & 10mm Underlay",
      specification: "Heavy-duty twist pile carpet on 10mm foam underlay to all bedrooms, robes, media & stairs",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Upgraded underlay included",
    },
    {
      id: "inc-ext-1",
      category: "facade_external",
      categoryLabel: "Facade & External",
      featureName: "Architectural Facade & Render Articulation",
      specification: "Austral/PGH face brickwork with acrylic render piers, feature cladding & architectural entry",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Complies with developer estate covenant guidelines",
    },
    {
      id: "inc-turn-1",
      category: "turnkey",
      categoryLabel: "Turnkey External",
      featureName: "Integrated Under-Roof Tiled Alfresco",
      specification: "Monolithic concrete alfresco slab poured with main house, lined ceiling & outdoor LEDs",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "Poured continuously with main slab",
    },
    {
      id: "inc-turn-2",
      category: "turnkey",
      categoryLabel: "Turnkey External",
      featureName: "55m² Coloured Concrete Driveway, Letterbox & Line",
      specification: "Coloured concrete driveway & crossover, rendered letterbox, fold-down clothesline & turf to front",
      status: "included",
      estimatedOmissionCost: 0,
      notes: "True turnkey move-in specification",
    },
  ];

  const siteCosts = 32500;
  const statutoryCosts = 6800;
  const promotionsOrDiscounts = 10000;
  const statedTotalPrice = basePrice + siteCosts + statutoryCosts - promotionsOrDiscounts;
  const totalAreaM2 = 238.4;

  return {
    id: "builder-hudson",
    builderName: "Hudson Homes",
    isHudson: true,
    modelName,
    facadeName: "Classic / Modernist Facade",
    inclusionTierName: "H2 Designer Turnkey Collection",
    housingType: "Double Storey",
    totalAreaM2,
    totalAreaSquares: +(totalAreaM2 / 9.2903).toFixed(1),
    areaDifferenceFromBenchmarkM2: 0,
    sizeParityAdjustmentValue: 0,

    basePrice,
    siteCosts,
    siteCostCertainty: "fixed",
    siteCostNotes:
      "100% Guaranteed Fixed Price Site Costs — includes up to 100 linear meters of bored concrete piering, H1/H2 reactive slab engineering, and non-mechanical rock excavation.",
    statutoryCosts,
    promotionsOrDiscounts,
    statedTotalPrice,
    statedPricePerM2: Math.round(statedTotalPrice / totalAreaM2),

    omissionsCost: 0,
    siteCostContingency: 0,
    normalizedTruePrice: statedTotalPrice,
    normalizedPricePerM2: Math.round(statedTotalPrice / totalAreaM2),

    designArchitecture: {
      groundFloorInternalM2: 96.8,
      firstFloorInternalM2: 88.2,
      garageM2: 35.8,
      alfrescoM2: 13.4,
      porchM2: 4.2,
      totalAreaM2,
      totalSquares: +(totalAreaM2 / 9.2903).toFixed(1),
      minLotWidthMeters: 12.5,
      houseWidthMeters: 10.7,
      houseDepthMeters: 18.2,
      bedroomsCount: 4,
      masterSuiteDimensions: "4.3m × 3.9m + His/Hers Walk-In Robe + Double Vanity Ensuite",
      secondaryBedroomsAverageSize: "Beds 2, 3 & 4 average 3.3m × 3.2m with built-in sliding robes",
      bedroomSizesDetail: [
        "Master Suite: 4.3m × 3.9m + large WIR & Twin Ensuite",
        "Bedroom 2: 3.4m × 3.2m + Mirrored Robe",
        "Bedroom 3: 3.3m × 3.1m + Mirrored Robe",
        "Bedroom 4: 3.2m × 3.1m + Mirrored Robe",
      ],
      bathroomsCount: 2.5,
      ensuitesCount: 1,
      powderRoomsCount: 1,
      kitchensCount: 1,
      kitchenDimensionsAndLayout: "3.8m × 2.9m Galley Kitchen with 2.7m × 1.0m Waterfall Island Breakfast Bar",
      butlersPantryOrWip: "Full Walk-In Pantry (2.4m × 1.6m) with 20mm stone counter & appliance power points",
      livingZonesCount: 3,
      livingZonesList: [
        "Open-Plan Family & Dining (6.8m × 5.4m)",
        "Dedicated Ground Floor Media / Theatre Room (4.1m × 3.6m)",
        "Upstairs Kids Activity / Rumpus Retreat (4.0m × 3.5m)",
        "Front Study / Home Office Nook",
      ],
      studyOrOfficeIncluded: true,
      alfrescoIncluded: true,
      garageSpaces: 2,
      designFeaturesIncluded: [
        "Dedicated enclosed Media Room + Upstairs Retreat + Front Study Nook (3.5 living zones)",
        "Full Walk-In Pantry with stone benchtop and power provisions",
        "Generous 3.3m × 3.2m secondary bedrooms that fit Queen beds comfortably",
        "Integrated concrete alfresco under main roof line",
        "Ground floor guest Powder Room with stone vanity",
      ],
      designVerdictNotes:
        "Balanced family floorplan that does not shrink secondary bedrooms to artificially inflate living room dimensions. Includes 3 distinct living zones plus study.",
    },

    promotionAudit: {
      websiteUrlChecked: "https://www.hudsonhomes.com.au",
      inclusionRangeTier: "H2 Designer Turnkey Collection",
      activePromotionsFound: [
        "$10,000 Fixed-Price Turnkey Cash Rebate (applied directly off base contract price)",
        "Free 2590mm High Ceilings & 2340mm Doors Upgrade included in H2 Tier",
        "100% Fixed Site Costs Guarantee (includes 100m piering & H-class slab)",
      ],
      advertisedValueClaim: "$35,000+ of Designer & Turnkey Upgrades Included at No Extra Cost",
      realAssessedValue: "$35,000 genuine trade value — items are built directly into the base contract specification",
      promotionFinePrintTraps: [
        "Requires land registration within 12 months to retain the locked base tender rate.",
      ],
      websiteVsEstimateDiscrepancies: [
        "None — all advertised website H2 Designer inclusions are itemised line-by-line inside the tender schedule.",
      ],
      standardInclusionsSummary:
        "Unlike volume builders that advertise stripped 'base' shells requiring $45k-$65k at the colour studio, Hudson's H2 Designer tier includes ducted AC, 2590mm ceilings, 20mm stone throughout, floor-to-ceiling bathroom tiling, full flooring, and coloured concrete driveway as standard.",
    },

    inclusions,
    contractClauses: {
      priceLockMonths: 12,
      priceLockNotes: "Full 12-month (365-day) tender price freeze from initial deposit.",
      escalationClauseRisk: "low",
      escalationClauseNotes:
        "Zero cost escalation or rise-and-fall clause within the 12-month price lock window.",
      provisionalVariationMarginPercent: 15,
      rockExcavationCoverage: "Included up to 50 hours non-mechanical / excavator rock excavation.",
      pieringAllowanceMeters: 100,
      bushfireBalAllowance: "BAL-12.5 compliance included in standard site package",
      acousticAllowance: "Acoustic glazing & wall insulation package included where required by estate DP",
      siteCostVarianceRisk: "low",
      liquidatedDamagesPerWeek: 350,
      defectsPeriodMonths: 12,
      structuralWarrantyYears: 50,
      structuralWarrantyFinePrint:
        "50-year structural guarantee covers foundation slab and structural framing without mandatory paid annual builder inspections.",
      finePrintWarnings: [],
      generalBuilderConcerns: [
        "Standard requirement that unregistered land must register within 12 months for price lock retention.",
      ],
      overallRisk: "low",
    },
    reputation: {
      rating: 4.8,
      reviewCount: 1420,
      source: "ProductReview.com.au & Google Verified Homeowner Reviews",
      sentimentSummary:
        "Consistently rated in the top tier of Australian residential builders for fixed-price contract integrity, fast pre-construction approvals, and dedicated weekly site supervisor updates.",
      preConstructionAdminMonths: 2.5,
      constructionDurationMonths: 6.0,
      averageBuildTimeMonths: 8.5,
      licensingAndFinancialNote:
        "Active NSW Fair Trading & QBCC Low-Rise/Medium-Rise Builder Licences; clean HBCF & QBCC insurance standing with zero statutory disciplinary actions.",
      recentReviewHighlights: [
        "\"Zero surprise site variations even after hitting shale rock and H2 clay — saved us at least $22k compared to our neighbour's build.\"",
        "\"Handed over keys in 26 weeks from slab pour with all flooring, driveway, and ducted AC finished ready to move in.\"",
      ],
      topStrengths: [
        "100% Guaranteed Fixed Site Costs (eliminates post-contract variation shock)",
        "Fast 2.5-month pre-construction drafting & council approval turnaround",
        "True turnkey handover (driveway, flooring, ducted AC, stone, 2590mm ceilings all done)",
      ],
      topComplaints: [
        "Colour selection studio appointments book out 2-3 weeks in advance during peak periods",
      ],
    },
    inclusionsScore: 95,
    financialValueScore: 94,
    contractSafetyScore: 98,
    reputationScore: 95,
    overallScore: 95,
    isBestValue: true,
    valueVerdictTitle: "BEST OVERALL VALUE & LOWEST CONTRACT RISK",
    executiveSummary:
      "Hudson Homes delivers the lowest true completion cost ($497,200 all-inclusive turnkey) and highest specification score (95/100). While competitor headline prices appear $12k-$22k lower on brochure paper, those quotes omit $38,000 to $54,000 of essential finishes and expose the buyer to $15,000-$24,000 in provisional site cost variations.",
    keyAdvantages: [
      "Zero hidden omissions — ducted A/C, 20mm stone throughout, 2590mm ceilings, full flooring & driveway included",
      "100% Fixed Site Costs with 100m piering allowance eliminates post-soil-test variations",
      "Full 12-month price lock protects against land registration & council delays",
      "8.5-month total delivery timeline (2.5m pre-admin + 6.0m build) vs 11-13 months industry average",
    ],
    keyDisadvantages: [
      "Fewer bespoke structural wall relocation options once fixed-price engineering is locked",
    ],
  };
}

export function getSampleCompetitorBuilder(name: "Metricon" | "Clarendon" | "Coral"): BuilderExtractedData {
  const hudsonBenchmark = getHudsonBenchmarkBuilder("NSW");

  if (name === "Metricon") {
    const totalAreaM2 = 242.8;
    const basePrice = 459900;
    const siteCosts = 24000;
    const statutoryCosts = 5500;
    const promotionsOrDiscounts = 5000;
    const statedTotalPrice = basePrice + siteCosts + statutoryCosts - promotionsOrDiscounts;

    const omissionsCost = 49600;
    const siteCostContingency = 19500;
    const areaDiff = +(totalAreaM2 - hudsonBenchmark.totalAreaM2).toFixed(1);
    const sizeParityAdjustmentValue = Math.round(-areaDiff * 1450); // slightly larger by 4.4m2 -> -$6,380 parity credit
    const normalizedTruePrice = statedTotalPrice + omissionsCost + siteCostContingency;

    return {
      id: "builder-metricon",
      builderName: "Metricon Homes",
      isHudson: false,
      modelName: "Merricks 26",
      facadeName: "Yale Standard Facade",
      inclusionTierName: "Freedom by Metricon (Standard Specification)",
      housingType: "Double Storey",
      totalAreaM2,
      totalAreaSquares: +(totalAreaM2 / 9.2903).toFixed(1),
      areaDifferenceFromBenchmarkM2: areaDiff,
      sizeParityAdjustmentValue,
      basePrice,
      siteCosts,
      siteCostCertainty: "provisional_allowance",
      siteCostNotes:
        "Site costs are Provisional Allowances only based on Class M soil and up to 500mm fall. H1/H2 soil upgrade ($6,800), piering beyond 35m ($135/m), and rock breaking ($290/hr) billed as post-contract variations.",
      statutoryCosts,
      promotionsOrDiscounts,
      statedTotalPrice,
      statedPricePerM2: Math.round(statedTotalPrice / totalAreaM2),
      omissionsCost,
      siteCostContingency,
      normalizedTruePrice,
      normalizedPricePerM2: Math.round(normalizedTruePrice / totalAreaM2),
      designArchitecture: {
        groundFloorInternalM2: 99.4,
        firstFloorInternalM2: 91.2,
        garageM2: 36.2,
        alfrescoM2: 12.2,
        porchM2: 3.8,
        totalAreaM2,
        totalSquares: +(totalAreaM2 / 9.2903).toFixed(1),
        minLotWidthMeters: 12.5,
        houseWidthMeters: 10.9,
        houseDepthMeters: 18.6,
        bedroomsCount: 4,
        masterSuiteDimensions: "4.4m × 3.8m + Walk-In Robe + Ensuite",
        secondaryBedroomsAverageSize: "Beds 3 & 4 measure 2.9m × 3.0m (tight for Queen beds + desk)",
        bedroomSizesDetail: [
          "Master Suite: 4.4m × 3.8m + WIR & Ensuite",
          "Bedroom 2: 3.2m × 3.0m + Robe",
          "Bedroom 3: 2.9m × 3.0m + Robe",
          "Bedroom 4: 2.9m × 2.9m + Robe",
        ],
        bathroomsCount: 2.5,
        ensuitesCount: 1,
        powderRoomsCount: 1,
        kitchensCount: 1,
        kitchenDimensionsAndLayout: "3.6m × 2.8m Island Kitchen with Walk-In Pantry (laminate shelving standard)",
        butlersPantryOrWip: "Walk-In Pantry with melamine shelves only (stone counter & sink require $4,800 upgrade)",
        livingZonesCount: 3,
        livingZonesList: [
          "Family & Dining Room (6.9m × 5.2m)",
          "Front Lounge / Sitting Room (3.8m × 3.5m)",
          "Upstairs Leisure Room (3.9m × 3.4m)",
        ],
        studyOrOfficeIncluded: false,
        alfrescoIncluded: true,
        garageSpaces: 2,
        designFeaturesIncluded: [
          "Large open-plan rear family & dining area",
          "3 living spaces (Family, Front Lounge, Upstairs Leisure), though no separate study nook",
          "Total footprint is 4.4m² larger than benchmark, primarily in garage and hallway circulation",
        ],
        designVerdictNotes:
          "4.4m² larger overall footprint than Hudson, but secondary Bedrooms 3 & 4 are narrower (2.9m wide) and the Walk-In Pantry only includes wire/melamine shelving unless upgraded at Studio M.",
      },
      promotionAudit: {
        websiteUrlChecked: "https://www.metricon.com.au/promotions",
        inclusionRangeTier: "Freedom by Metricon + 'Luxury Upgrade Pack' Promo",
        activePromotionsFound: [
          "Freedom 'All-In Luxury Pack' for $6,990 (advertised as up to $55,000 value)",
          "$5,000 Studio M Promotional Voucher",
        ],
        advertisedValueClaim: "\"Up to $55,000 of Luxury Upgrades for $6,990\"",
        realAssessedValue: "$16,500 actual trade value (significant exclusions remain in fine print)",
        promotionFinePrintTraps: [
          "Fine Print Clause 3: Advertised '$55,000 value' is calculated on inflated retail upgrade list rates, not standard trade cost.",
          "Fine Print Clause 7: 20mm stone applies to kitchen benchtop only — laundry and bathroom vanities remain laminate unless upgraded.",
          "Fine Print Clause 11: Promotion excludes full floor coverings (hybrid timber/carpet), concrete driveway, and multi-zone ducted air conditioning in base Freedom tier.",
          "Fine Print Clause 14: 2590mm ceiling height promotion applies to Ground Floor only; First Floor remains 2440mm.",
        ],
        websiteVsEstimateDiscrepancies: [
          "Website hero images display floor-to-ceiling bathroom tiles, 40mm waterfall island stone, and timber flooring — all 3 are excluded from the submitted tender estimate.",
        ],
        standardInclusionsSummary:
          "Freedom by Metricon is an entry-to-mid specification designed with a low headline base price that drives buyers into Studio M selection upgrades (averaging $45,000-$65,000 per build).",
      },
      inclusions: hudsonBenchmark.inclusions.map((item) => {
        if (item.id === "inc-site-1" || item.id === "inc-site-3" || item.id === "inc-site-4") {
          return {
            ...item,
            specification:
              item.id === "inc-site-3"
                ? "Provisional allowance of 35m piering only; extra piers billed at $135/m"
                : "Provisional sum allowance only — subject to soil test & survey re-pricing",
            status: "provisional_sum",
            estimatedOmissionCost: item.id === "inc-site-3" ? 6500 : 4500,
            notes: "High variation risk after contract signing",
          };
        }
        if (item.id === "inc-struct-4") {
          return {
            ...item,
            specification: "25-Year Structural Guarantee (subject to strict maintenance conditions; 6yr statutory baseline)",
            status: "included",
            estimatedOmissionCost: 0,
            notes: "Half the duration of Hudson's 50-Year Warranty",
          };
        }
        if (item.id === "inc-ceil-1") {
          return {
            ...item,
            specification: "2440mm (8ft) standard ceiling height to ground & first floor",
            status: "upgrade_required",
            estimatedOmissionCost: 6800,
            notes: "2590mm ceiling upgrade costs $6,800",
          };
        }
        if (item.id === "inc-ceil-2") {
          return {
            ...item,
            specification: "2040mm standard flush panel internal doors; 820mm front entry door",
            status: "upgrade_required",
            estimatedOmissionCost: 2900,
            notes: "2340mm high doors & 1200mm wide entry door require upgrade",
          };
        }
        if (item.id === "inc-ceil-3") {
          return {
            ...item,
            specification: "Aluminium windows included; flyscreens & keyed window locks excluded from base quote",
            status: "excluded",
            estimatedOmissionCost: 2400,
            notes: "Flyscreens billed as extra variation",
          };
        }
        if (item.id === "inc-kit-2") {
          return {
            ...item,
            specification: "600mm stainless steel oven & cooktop standard (900mm requires upgrade pack)",
            status: "upgrade_required",
            estimatedOmissionCost: 2800,
            notes: "900mm appliances require promotional pack upgrade",
          };
        }
        if (item.id === "inc-kit-4") {
          return {
            ...item,
            specification: "Dishwasher space only — dishwasher unit excluded from base tender",
            status: "excluded",
            estimatedOmissionCost: 1400,
            notes: "Dishwasher is an optional extra",
          };
        }
        if (item.id === "inc-bath-1") {
          return {
            ...item,
            specification: "2000mm tiling inside shower recess only; single row skirting tile to rest of walls",
            status: "upgrade_required",
            estimatedOmissionCost: 5400,
            notes: "Floor-to-ceiling tiling to Bathroom & Ensuite is $5,400 extra",
          };
        }
        if (item.id === "inc-bath-2") {
          return {
            ...item,
            specification: "Laminate vanity tops standard in Bathroom & Ensuite (20mm stone is an upgrade)",
            status: "upgrade_required",
            estimatedOmissionCost: 2200,
            notes: "Stone vanity tops excluded in base tier",
          };
        }
        if (item.id === "inc-bath-5") {
          return {
            ...item,
            specification: "Freestanding 45L metal laundry tub with exposed cabinet only",
            status: "upgrade_required",
            estimatedOmissionCost: 2100,
            notes: "Joinery benchtop & cabinetry excluded",
          };
        }
        if (item.id === "inc-hvac-1") {
          return {
            ...item,
            specification: "Ducted Reverse-Cycle Air Conditioning EXCLUDED from tender",
            status: "excluded",
            estimatedOmissionCost: 14500,
            notes: "Major $14,500 omission that must be added at Studio M",
          };
        }
        if (item.id === "inc-elec-1") {
          return {
            ...item,
            specification: "Standard plastic batten light holders throughout (LED downlights extra at $95/point)",
            status: "upgrade_required",
            estimatedOmissionCost: 3400,
            notes: "35 LED downlights cost ~$3,400 at electrical selection",
          };
        }
        if (item.id === "inc-floor-1" || item.id === "inc-floor-2") {
          return {
            ...item,
            specification: "Bare concrete slab & particleboard upper floor handover (Flooring EXCLUDED)",
            status: "excluded",
            estimatedOmissionCost: item.id === "inc-floor-1" ? 5800 : 4200,
            notes: "Whole-house flooring package costs $10,000+ extra",
          };
        }
        if (item.id === "inc-turn-2") {
          return {
            ...item,
            specification: "Concrete driveway, crossover, letterbox & clothesline EXCLUDED",
            status: "excluded",
            estimatedOmissionCost: 8200,
            notes: "Client must fund driveway & external turnkey items separately",
          };
        }
        return { ...item };
      }),
      contractClauses: {
        priceLockMonths: 6,
        priceLockNotes:
          "Base price held for 180 days (6 months) only. Thereafter increases by up to 0.75% per month until slab pour.",
        escalationClauseRisk: "high",
        escalationClauseNotes:
          "Special Condition 14 allows builder to re-price contract if land registration or council approval exceeds 180 days.",
        provisionalVariationMarginPercent: 25,
        rockExcavationCoverage: "Excluded; billed at $290/hr for rock breaker + tip fees + 25% builder margin.",
        pieringAllowanceMeters: 35,
        bushfireBalAllowance: "Excluded (BAL-12.5 costs $4,500-$7,500 extra if site is bushfire mapped)",
        acousticAllowance: "Excluded from base quote",
        siteCostVarianceRisk: "high",
        liquidatedDamagesPerWeek: 150,
        defectsPeriodMonths: 6,
        structuralWarrantyYears: 25,
        structuralWarrantyFinePrint:
          "25-Year Structural Guarantee is conditional on homeowner maintaining documented annual termite & drainage inspections; non-structural defects limited to 6 months.",
        finePrintWarnings: [
          "Short 6-month price lock exposes client to ~$3,400/month price escalation if land registration or council approval is delayed.",
          "Provisional site costs only include 35m of piering (a 242m² double-storey home typically requires 75-95m, leaving a $5,400-$8,100 shortfall).",
          "25% builder margin + $1,250 administration fee applies to post-contract client variations.",
        ],
        generalBuilderConcerns: [
          "High Studio M upsell dependency: base Freedom tenders routinely increase by $45,000-$68,000 during colour and electrical appointments.",
          "High volume per site supervisor (often 18-24 active homes per supervisor), leading to slower defect resolution.",
        ],
        overallRisk: "high",
      },
      reputation: {
        rating: 3.9,
        reviewCount: 3180,
        source: "ProductReview.com.au & Google Reviews",
        sentimentSummary:
          "Praised for attractive display homes and contemporary floorplans, but frequent buyer complaints regarding Studio M upgrade costs, site cost blowouts after soil testing, and long pre-construction admin waits.",
        preConstructionAdminMonths: 4.5,
        constructionDurationMonths: 7.5,
        averageBuildTimeMonths: 12.0,
        licensingAndFinancialNote:
          "Australia's largest volume builder by housing starts; underwent major capital restructuring in 2022-2023 (now majority owned by Sumitomo Forestry). Licences active across NSW/QLD/VIC.",
        recentReviewHighlights: [
          "\"Love our finished floorplan, but our quote jumped by $58,000 between tender signing, soil test piering, and Studio M electrical/flooring selections.\"",
          "\"Pre-construction took 5 months before we even got to site start.\"",
        ],
        topStrengths: [
          "Extensive display home network and modern facade aesthetics",
          "Large Studio M selection showroom for custom finishes",
        ],
        topComplaints: [
          "Post-soil-test site cost variations of $15,000-$25,000",
          "4.5+ month pre-construction admin cycle before slab pour",
          "Essential items (ducted AC, flooring, driveway, downlights) omitted from base tender",
        ],
      },
      inclusionsScore: 68,
      financialValueScore: 66,
      contractSafetyScore: 60,
      reputationScore: 74,
      overallScore: 67,
      isBestValue: false,
      valueVerdictTitle: "HIGH HIDDEN VARIATION & STUDIO UPSELL EXPOSURE",
      executiveSummary:
        "Although Metricon's initial headline price ($484,400) looks $12,800 cheaper than Hudson Homes on paper, it omits $49,600 of essential turnkey inclusions (ducted A/C, floor coverings, concrete driveway, 2590mm ceilings, LED downlights, stone vanities) and carries an estimated $19,500 provisional site cost risk. Normalized for identical turnkey completion, Metricon costs $553,500 — $56,300 MORE than Hudson.",
      keyAdvantages: [
        "Slightly larger total floorplan footprint (+4.4m², mostly in garage/circulation)",
        "Attractive lower initial brochure price prior to Studio M selections",
      ],
      keyDisadvantages: [
        "$49,600 in omitted essentials (no ducted AC, no flooring, no driveway, 2440mm ceilings, batten lights)",
        "Provisional site costs with only 35m piering allowance ($19,500 expected site variation risk)",
        "Short 6-month price lock with monthly escalation penalty",
        "12.0-month average total build time (3.5 months slower than Hudson)",
      ],
    };
  }

  // Clarendon Homes
  const totalAreaM2 = 232.0;
  const basePrice = 468900;
  const siteCosts = 28500;
  const statutoryCosts = 6200;
  const promotionsOrDiscounts = 8000;
  const statedTotalPrice = basePrice + siteCosts + statutoryCosts - promotionsOrDiscounts;
  const omissionsCost = 33400;
  const siteCostContingency = 12500;
  const areaDiff = +(totalAreaM2 - hudsonBenchmark.totalAreaM2).toFixed(1); // -6.4m2 smaller
  const sizeParityAdjustmentValue = Math.round(-areaDiff * 1450); // +$9,280 penalty because house is 6.4m2 smaller
  const normalizedTruePrice = statedTotalPrice + omissionsCost + siteCostContingency;

  return {
    id: "builder-clarendon",
    builderName: "Clarendon Homes",
    isHudson: false,
    modelName: "Boston 25",
    facadeName: "Suburban Traditional Facade",
    inclusionTierName: "Aspire Collection",
    housingType: "Double Storey",
    totalAreaM2,
    totalAreaSquares: +(totalAreaM2 / 9.2903).toFixed(1),
    areaDifferenceFromBenchmarkM2: areaDiff,
    sizeParityAdjustmentValue,
    basePrice,
    siteCosts,
    siteCostCertainty: "semi_fixed",
    siteCostNotes:
      "Site costs fixed up to Class M soil only. H1/H2 reactive clay surcharge ($5,900) and piering over 45m ($130/m) billed as contract variations.",
    statutoryCosts,
    promotionsOrDiscounts,
    statedTotalPrice,
    statedPricePerM2: Math.round(statedTotalPrice / totalAreaM2),
    omissionsCost,
    siteCostContingency,
    normalizedTruePrice,
    normalizedPricePerM2: Math.round(normalizedTruePrice / totalAreaM2),
    designArchitecture: {
      groundFloorInternalM2: 93.2,
      firstFloorInternalM2: 86.4,
      garageM2: 35.1,
      alfrescoM2: 13.5,
      porchM2: 3.8,
      totalAreaM2,
      totalSquares: +(totalAreaM2 / 9.2903).toFixed(1),
      minLotWidthMeters: 12.5,
      houseWidthMeters: 10.6,
      houseDepthMeters: 17.9,
      bedroomsCount: 4,
      masterSuiteDimensions: "4.1m × 3.7m + Walk-In Robe + Ensuite",
      secondaryBedroomsAverageSize: "Beds 2-4 average 3.1m × 3.0m",
      bedroomSizesDetail: [
        "Master Suite: 4.1m × 3.7m + WIR & Ensuite",
        "Bedroom 2: 3.2m × 3.0m + Robe",
        "Bedroom 3: 3.1m × 3.0m + Robe",
        "Bedroom 4: 3.0m × 3.0m + Robe",
      ],
      bathroomsCount: 2.5,
      ensuitesCount: 1,
      powderRoomsCount: 1,
      kitchensCount: 1,
      kitchenDimensionsAndLayout: "3.5m × 2.8m Kitchen with Island Bench & Walk-In Pantry",
      butlersPantryOrWip: "Walk-In Pantry with laminate shelves (stone top excluded)",
      livingZonesCount: 2,
      livingZonesList: [
        "Open-Plan Family / Meals (6.5m × 5.1m)",
        "Upstairs Activity / TV Room (3.8m × 3.4m)",
      ],
      studyOrOfficeIncluded: true,
      alfrescoIncluded: true,
      garageSpaces: 2,
      designFeaturesIncluded: [
        "Open-plan rear family & meals area",
        "Front study nook near entry",
        "6.4m² smaller overall than Hudson benchmark and omits a separate Ground Floor Media/Theatre room (only 2 living zones vs Hudson's 3)",
      ],
      designVerdictNotes:
        "6.4m² smaller than Hudson's design ($9,280 less built floor area value) and has only 2 living zones (missing the dedicated Ground Floor Media/Theatre room).",
    },
    promotionAudit: {
      websiteUrlChecked: "https://www.clarendon.com.au/nsw/promotions",
      inclusionRangeTier: "Aspire Collection + 'Complete Living' Promo",
      activePromotionsFound: [
        "$8,000 Promotional Tender Discount",
        "Promo Ducted Air Conditioning (Single-Zone System)",
      ],
      advertisedValueClaim: "\"Free Ducted Air & Designer Kitchen Upgrade\"",
      realAssessedValue: "$14,000 actual value (requires $2,600 upgrade for multi-zone bedroom control)",
      promotionFinePrintTraps: [
        "Promotional Ducted AC is configured as a single day/night zone — adding multi-zone damper control costs $2,600 extra.",
        "Alfresco concrete slab is only included if the optional 'Outdoor Entertaining Pack' ($5,900) is purchased.",
        "Bathroom vanities in Aspire tier are laminate; 20mm stone vanities are restricted to Luxe tier.",
      ],
      websiteVsEstimateDiscrepancies: [
        "Display home photography shows Luxe Collection specifications (2600mm ceilings, full height tiling, 40mm stone) whereas quote is based on Aspire tier.",
      ],
      standardInclusionsSummary:
        "Clarendon's Aspire Collection provides solid structural framing and 900mm kitchen appliances, but omits raised ceilings, stone bathroom vanities, full-height wet area tiling, and coloured driveway.",
    },
    inclusions: hudsonBenchmark.inclusions.map((item) => {
      if (item.id === "inc-site-1" || item.id === "inc-site-3") {
        return {
          ...item,
          specification: "Fixed to Class M soil & 45m piering only; H1/H2 soil & extra piers billed as variation",
          status: "provisional_sum",
          estimatedOmissionCost: 6250,
          notes: "Semi-fixed cap; high probability of H1/H2 soil surcharge",
        };
      }
      if (item.id === "inc-ceil-1" || item.id === "inc-ceil-2") {
        return {
          ...item,
          specification: item.id === "inc-ceil-1" ? "2440mm standard ceiling height" : "2040mm standard internal doors",
          status: "upgrade_required",
          estimatedOmissionCost: item.id === "inc-ceil-1" ? 6500 : 2600,
          notes: "2590mm ceilings & 2340mm doors are paid upgrades in Aspire tier",
        };
      }
      if (item.id === "inc-bath-1" || item.id === "inc-bath-2") {
        return {
          ...item,
          specification:
            item.id === "inc-bath-1"
              ? "2000mm high tiling in shower only, skirting tile elsewhere"
              : "Laminate vanity benchtops standard (stone extra)",
          status: "upgrade_required",
          estimatedOmissionCost: item.id === "inc-bath-1" ? 5200 : 2100,
          notes: "Requires Luxe upgrade pack",
        };
      }
      if (item.id === "inc-elec-1") {
        return {
          ...item,
          specification: "Batten holders standard; LED downlight package is an extra option",
          status: "upgrade_required",
          estimatedOmissionCost: 3100,
        };
      }
      if (item.id === "inc-turn-1" || item.id === "inc-turn-2") {
        return {
          ...item,
          specification:
            item.id === "inc-turn-1"
              ? "Alfresco concrete slab & plaster ceiling optional extra"
              : "Driveway, letterbox & clothesline excluded from Aspire tender",
          status: "excluded",
          estimatedOmissionCost: item.id === "inc-turn-1" ? 5500 : 7800,
        };
      }
      return { ...item };
    }),
    contractClauses: {
      priceLockMonths: 9,
      priceLockNotes: "Price held for 270 days (9 months) from initial deposit.",
      escalationClauseRisk: "medium",
      escalationClauseNotes: "Price escalation of $2,500/month applies if site start occurs after 270 days.",
      provisionalVariationMarginPercent: 20,
      rockExcavationCoverage: "First 4 hours included; excess rock billed at $250/hr.",
      pieringAllowanceMeters: 45,
      bushfireBalAllowance: "BAL-12.5 excluded ($4,200 upgrade)",
      acousticAllowance: "Excluded",
      siteCostVarianceRisk: "medium",
      liquidatedDamagesPerWeek: 250,
      defectsPeriodMonths: 6,
      structuralWarrantyYears: 25,
      structuralWarrantyFinePrint:
        "Advertised 'Lifetime Structural Guarantee' is non-transferable if the home is sold and requires strict adherence to Clarendon's annual pest/plumbing maintenance schedule.",
      finePrintWarnings: [
        "Soil classification cap at Class M means reactive clay blocks (H1/H2/E) trigger an automatic $5,900-$11,500 slab & piering variation.",
        "Lifetime Structural Warranty is non-transferable to future buyers and conditional on documented annual paid inspections.",
        "$1,500 administration fee charged per post-contract client variation.",
      ],
      generalBuilderConcerns: [
        "Extended pre-construction drafting & council lodgement queues (averaging 4-5 months before site start).",
        "Design is 6.4m² smaller than Hudson and has only 2 living zones instead of 3.",
      ],
      overallRisk: "medium",
    },
    reputation: {
      rating: 4.2,
      reviewCount: 2240,
      source: "ProductReview.com.au & Google Reviews",
      sentimentSummary:
        "Well-regarded Australian family-owned builder with good framing quality, though customers frequently report slow pre-construction administration and expensive colour studio upgrades.",
      preConstructionAdminMonths: 4.0,
      constructionDurationMonths: 6.8,
      averageBuildTimeMonths: 10.8,
      licensingAndFinancialNote:
        "Established 1978 (CPG Group); stable financial track record in NSW and SEQ with active builder licences.",
      recentReviewHighlights: [
        "\"Good site supervisor once construction started, but took 4.5 months in pre-construction and our Aspire quote needed $34k in upgrades.\"",
      ],
      topStrengths: [
        "Consistent carpentry and brickwork quality on site",
        "Established 45+ year operating history",
      ],
      topComplaints: [
        "Slow pre-construction administration and council submission cycle",
        "High cost to upgrade from Aspire to Luxe inclusions at colour studio",
      ],
    },
    inclusionsScore: 79,
    financialValueScore: 75,
    contractSafetyScore: 74,
    reputationScore: 82,
    overallScore: 77,
    isBestValue: false,
    valueVerdictTitle: "RESPECTABLE BUILDER BUT $44K+ HIGHER TRUE COST & SMALLER PLAN",
    executiveSummary:
      "Clarendon Homes (Boston 25) is a reputable alternative, but its home is 6.4m² smaller (with 1 fewer living room) and omits $33,400 in turnkey inclusions (2590mm ceilings, full height bathroom tiles, stone vanities, LED downlights, alfresco slab, and driveway) plus $12,500 in H1/H2 soil & piering risk. Its true turnkey cost is $541,500 ($44,300 more than Hudson).",
    keyAdvantages: [
      "Good structural build quality reputation",
      "900mm kitchen appliances and basic single-zone ducted AC included",
    ],
    keyDisadvantages: [
      "6.4m² smaller floorplan and missing a 3rd living/media room",
      "$33,400 in omitted turnkey inclusions (driveway, 2590mm ceilings, stone vanities, full bathroom tiling)",
      "Site costs only fixed to Class M soil (high variation exposure on H1/H2 clay sites)",
      "'Lifetime Warranty' is non-transferable if you sell the home",
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
    executiveSummary:
      "Forensic line-by-line audit comparing Hudson Homes (Turquoise 25 — H2 Designer), Metricon Homes (Merricks 26 — Freedom), and Clarendon Homes (Boston 25 — Aspire). After auditing all 32 trade specifications, floorplan room dimensions, website promotional fine print, contract escalation clauses, and online build-time reviews, Hudson Homes delivers the highest overall value score (95/100) and saves the client $44,300 to $56,300 in true turnkey completion cost.",
    whyWinnerDetailedBreakdown: [
      {
        pillarTitle: "1. True Turnkey Bottom-Line Savings ($44,300 to $56,300 Cheaper)",
        winnerHighlight: "Hudson Homes: $497,200 True Turnkey vs Metricon $553,500 & Clarendon $541,500",
        detailedExplanation:
          "Competitor tenders use stripped 'base' prices to appear cheaper upfront. Once you add the $33,400–$49,600 of omitted essentials (ducted A/C, whole-home flooring, 55m² coloured driveway, 2590mm ceilings, 2340mm doors, LED downlights, floor-to-ceiling bathroom tiles, and stone vanities) plus $12,500–$19,500 in provisional site cost blowouts, Hudson Homes is $44,300 to $56,300 lower in real out-of-pocket cost.",
        quantifiedDollarImpact: "Saves $44,300 – $56,300",
      },
      {
        pillarTitle: "2. Home Design, Overall Size (m²) & Room Dimension Superiority",
        winnerHighlight: "238.4 m² with 3 Full Living Zones + Study & 3.3m × 3.2m Secondary Bedrooms",
        detailedExplanation:
          "Hudson's design provides 3 full living rooms (Family/Dining, enclosed Home Theatre, Upstairs Retreat) plus a front Study Nook and a full Walk-In Pantry with stone benchtop. Clarendon is 6.4m² smaller ($9,280 less built floor area) and has only 2 living zones. Metricon shrinks Bedrooms 3 & 4 down to 2.9m wide and omits a study nook.",
        quantifiedDollarImpact: "+$9,280 Floor Area & Spatial Advantage",
      },
      {
        pillarTitle: "3. Website Promotion Fine Print vs Genuine Contract Inclusions",
        winnerHighlight: "100% of Hudson's H2 Designer Inclusions Are Built Into the Base Contract",
        detailedExplanation:
          "Audit of Metricon's website 'Luxury Upgrade Pack' and Clarendon's 'Aspire Promo' reveals strict fine print: stone is restricted to the kitchen only (leaving laminate in bathrooms/laundry), ceilings are 2440mm unless upgraded, and driveways/flooring are excluded. Hudson embeds all 32 turnkey inclusions directly in the tender schedule.",
        quantifiedDollarImpact: "Zero Colour Studio Upsell Shock",
      },
      {
        pillarTitle: "4. 100% Fixed Site Costs & Contract Clause Protection",
        winnerHighlight: "100m Piering + Rock Excavation Included + 12-Month Price Lock",
        detailedExplanation:
          "Metricon only allows 35m of piering (provisional) and locks price for just 6 months with a 0.75%/month escalation clause. Clarendon caps fixed site costs at Class M soil only. Hudson guarantees 100% fixed site costs (including H1/H2 clay, 100m piering, and rock breaking) and a full 12-month price freeze.",
        quantifiedDollarImpact: "Eliminates $12,500 – $19,500 Site Risk",
      },
      {
        pillarTitle: "5. Faster Build Times, Online Reputation & 50-Year Warranty",
        winnerHighlight: "8.5 Months Total Delivery & 4.8★ Rating vs 10.8–12.0 Months",
        detailedExplanation:
          "Hudson completes pre-construction in ~2.5 months and construction in ~6.0 months (8.5 months total), saving 2.5 to 3.5 months of rent/mortgage holding costs (~$8,500–$12,000) compared to Metricon (12.0 months) and Clarendon (10.8 months), backed by an unconditional 50-Year Structural Guarantee.",
        quantifiedDollarImpact: "Saves ~3.5 Months Rent ($10,500+)",
      },
    ],
    keyDifferencesSummary: [
      "Apples-to-Apples Value Gap: Metricon appears $12.8k cheaper on brochure price, but after adding $49,600 in missing turnkey inclusions and $19,500 in provisional site cost variances, it costs $56,300 MORE than Hudson.",
      "Design & Room Dimensions: Hudson includes 3 living rooms + study and 3.3m × 3.2m bedrooms; Clarendon is 6.4m² smaller with only 2 living zones, while Metricon narrows Bedrooms 3 & 4 to 2.9m.",
      "Promotion Fine Print: Competitor website promotions exclude bathroom/laundry stone, whole-home flooring, and driveways in the fine print.",
      "Build Speed & Warranty: Hudson averages 8.5 months total delivery with a 50-Year Structural Guarantee vs 10.8–12.0 months for competitors.",
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
    whyWinnerDetailedBreakdown: [],
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
