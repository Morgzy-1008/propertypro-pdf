import { EstateStagePoD, SetbackRules, CovenantRuleItem } from "./feasibilityTypes";

export const PRESEEDED_ESTATE_STAGES: EstateStagePoD[] = [
  // FLAGSTONE (PEET) - STAGE 8
  {
    id: "flagstone_stg8",
    estateId: "flagstone",
    estateName: "Flagstone Estate",
    stageName: "Stage 8 (Traditional Lots)",
    developer: "Peet",
    council: "Logan City Council",
    suburb: "Flagstone",
    singleStoreySetbacks: {
      frontOmpM: 4.0,
      frontGarageM: 5.0,
      sideStandardM: 1.0,
      sideBtbM: 0.2,
      sideUpperM: 1.0,
      rearM: 1.5,
      secondaryStreetM: 2.0,
      maxSiteCoveragePct: 60,
      maxBuildingHeightM: 8.5,
      sourceDocument: "Flagstone Stage 8 Plan of Development (PoD) Sheet 3",
    },
    doubleStoreySetbacks: {
      frontOmpM: 4.5,
      frontGarageM: 5.5,
      sideStandardM: 1.25,
      sideBtbM: 0.2,
      sideUpperM: 1.5,
      rearM: 2.5,
      secondaryStreetM: 2.5,
      maxSiteCoveragePct: 55,
      maxBuildingHeightM: 9.5,
      sourceDocument: "Flagstone Stage 8 Plan of Development (PoD) Sheet 3",
    },
    covenants: [
      {
        id: "cov_eaves_450",
        name: "450mm Eaves Throughout",
        description: "Peet design guidelines require 450mm eaves to all elevations visible from street.",
        category: "roof",
        mandatory: true,
        recommendedAllowanceCost: 2800,
      },
      {
        id: "cov_door_1200",
        name: "1200mm Wide Designer Front Entry Door",
        description: "Feature entrance door with translucent glazing or stain grade timber finish.",
        category: "facade",
        mandatory: true,
        recommendedAllowanceCost: 1450,
      },
      {
        id: "cov_driveway_agg",
        name: "Exposed Aggregate Concrete Driveway",
        description: "Covenant restricts plain concrete; exposed aggregate or sealed pavers required.",
        category: "driveway",
        mandatory: true,
        recommendedAllowanceCost: 5225,
      },
    ],
    notes: "Stage 8 has strict facade variety covenants. Cannot repeat exact facade within 4 lots.",
    confirmedByHuman: true,
  },

  // FLAGSTONE (PEET) - STAGE 10 (COMPACT / TERRACE)
  {
    id: "flagstone_stg10",
    estateId: "flagstone",
    estateName: "Flagstone Estate",
    stageName: "Stage 10 (Compact & Villa Lots)",
    developer: "Peet",
    council: "Logan City Council",
    suburb: "Flagstone",
    singleStoreySetbacks: {
      frontOmpM: 3.0,
      frontGarageM: 5.0,
      sideStandardM: 1.0,
      sideBtbM: 0.2,
      sideUpperM: 1.0,
      rearM: 1.0,
      secondaryStreetM: 1.5,
      maxSiteCoveragePct: 65,
      maxBuildingHeightM: 8.5,
      sourceDocument: "Flagstone Stage 10 PoD Specific Building Envelopes",
    },
    doubleStoreySetbacks: {
      frontOmpM: 3.5,
      frontGarageM: 5.0,
      sideStandardM: 1.25,
      sideBtbM: 0.2,
      sideUpperM: 1.5,
      rearM: 2.0,
      secondaryStreetM: 2.0,
      maxSiteCoveragePct: 60,
      maxBuildingHeightM: 9.5,
      sourceDocument: "Flagstone Stage 10 PoD Specific Building Envelopes",
    },
    covenants: [
      {
        id: "cov_btb_parapet",
        name: "Built to Boundary Parapet & Flashing Detail",
        description: "Capped parapet wall required along zero lot boundary.",
        category: "siting",
        mandatory: true,
        recommendedAllowanceCost: 2400,
      },
      {
        id: "cov_driveway_agg",
        name: "Exposed Aggregate Concrete Driveway",
        description: "Covenant mandates exposed aggregate finish.",
        category: "driveway",
        mandatory: true,
        recommendedAllowanceCost: 4500,
      },
    ],
    notes: "Zero lot line (BTB) mandatory on designated boundary. Siting must adhere to boundary envelope peg.",
    confirmedByHuman: true,
  },

  // FLAGSTONE (PEET) - STAGE 12 (PREMIER / PARKSIDE)
  {
    id: "flagstone_stg12",
    estateId: "flagstone",
    estateName: "Flagstone Estate",
    stageName: "Stage 12 (Parkside & Elevated Lots)",
    developer: "Peet",
    council: "Logan City Council",
    suburb: "Flagstone",
    singleStoreySetbacks: {
      frontOmpM: 4.5,
      frontGarageM: 5.5,
      sideStandardM: 1.25,
      sideBtbM: 0.2,
      sideUpperM: 1.25,
      rearM: 2.0,
      secondaryStreetM: 2.5,
      maxSiteCoveragePct: 50,
      maxBuildingHeightM: 8.5,
      sourceDocument: "Flagstone Stage 12 Master Covenant & PoD Map Ref 12B",
    },
    doubleStoreySetbacks: {
      frontOmpM: 5.0,
      frontGarageM: 5.5,
      sideStandardM: 1.5,
      sideBtbM: 0.2,
      sideUpperM: 1.75,
      rearM: 3.0,
      secondaryStreetM: 2.5,
      maxSiteCoveragePct: 50,
      maxBuildingHeightM: 9.5,
      sourceDocument: "Flagstone Stage 12 Master Covenant & PoD Map Ref 12B",
    },
    covenants: [
      {
        id: "cov_eaves_450",
        name: "450mm Eaves Throughout",
        description: "Full wrap-around eaves mandatory.",
        category: "roof",
        mandatory: true,
        recommendedAllowanceCost: 2800,
      },
      {
        id: "cov_render_60",
        name: "Minimum 60% Rendered Masonry / Feature Cladding",
        description: "Front facade must feature combination of render, timber look, or feature stone.",
        category: "facade",
        mandatory: true,
        recommendedAllowanceCost: 3500,
      },
      {
        id: "cov_driveway_agg",
        name: "Exposed Aggregate Concrete Driveway",
        description: "Exposed aggregate driveway with acid etch sealer.",
        category: "driveway",
        mandatory: true,
        recommendedAllowanceCost: 5500,
      },
    ],
    notes: "Stage 12 overlooks parkland. Front facade requires high articulation. Side fences setback 1m behind front wall.",
    confirmedByHuman: true,
  },

  // PROVIDENCE (STOCKLAND - SOUTH RIPLEY) - STAGE 1-4
  {
    id: "providence_stg1_4",
    estateId: "providence",
    estateName: "Providence Estate",
    stageName: "Stages 1 to 4",
    developer: "Stockland",
    council: "Ipswich City Council",
    suburb: "South Ripley",
    singleStoreySetbacks: {
      frontOmpM: 3.0,
      frontGarageM: 5.4,
      sideStandardM: 1.0,
      sideBtbM: 0.2,
      sideUpperM: 1.0,
      rearM: 1.5,
      secondaryStreetM: 2.0,
      maxSiteCoveragePct: 55,
      maxBuildingHeightM: 8.5,
      sourceDocument: "Stockland Providence Design Guidelines Book 1",
    },
    doubleStoreySetbacks: {
      frontOmpM: 4.0,
      frontGarageM: 5.4,
      sideStandardM: 1.25,
      sideBtbM: 0.2,
      sideUpperM: 1.5,
      rearM: 2.5,
      secondaryStreetM: 2.0,
      maxSiteCoveragePct: 50,
      maxBuildingHeightM: 9.0,
      sourceDocument: "Stockland Providence Design Guidelines Book 1",
    },
    covenants: [
      {
        id: "cov_prov_entry",
        name: "Stockland Feature Entry Portico",
        description: "Portico projection with minimum 1.5m depth required.",
        category: "facade",
        mandatory: true,
        recommendedAllowanceCost: 1800,
      },
      {
        id: "cov_prov_driveway",
        name: "Coloured / Aggregate Concrete Driveway",
        description: "Stockland approved color swatch.",
        category: "driveway",
        mandatory: true,
        recommendedAllowanceCost: 4800,
      },
    ],
    notes: "Stockland developer approval required prior to building certifier lodge.",
    confirmedByHuman: true,
  },

  // PROVIDENCE (STOCKLAND) - STAGE 5+ (THE HILLS & RIDGELINE)
  {
    id: "providence_stg5",
    estateId: "providence",
    estateName: "Providence Estate",
    stageName: "Stage 5+ (The Ridgeline & Valley)",
    developer: "Stockland",
    council: "Ipswich City Council",
    suburb: "South Ripley",
    singleStoreySetbacks: {
      frontOmpM: 4.0,
      frontGarageM: 5.5,
      sideStandardM: 1.25,
      sideBtbM: 0.2,
      sideUpperM: 1.25,
      rearM: 2.0,
      secondaryStreetM: 2.5,
      maxSiteCoveragePct: 50,
      maxBuildingHeightM: 8.5,
      sourceDocument: "Stockland Providence Ridgeline Design Addendum",
    },
    doubleStoreySetbacks: {
      frontOmpM: 4.5,
      frontGarageM: 5.5,
      sideStandardM: 1.5,
      sideBtbM: 0.2,
      sideUpperM: 2.0,
      rearM: 3.0,
      secondaryStreetM: 3.0,
      maxSiteCoveragePct: 45,
      maxBuildingHeightM: 9.5,
      sourceDocument: "Stockland Providence Ridgeline Design Addendum",
    },
    covenants: [
      {
        id: "cov_eaves_450",
        name: "450mm Eaves Throughout",
        description: "Mandatory eaves on all roof lines.",
        category: "roof",
        mandatory: true,
        recommendedAllowanceCost: 2800,
      },
    ],
    notes: "Elevated stages have moderate slope. Verify cut/fill and retaining bench.",
    confirmedByHuman: true,
  },

  // YARRABILBA (LENDLEASE)
  {
    id: "yarrabilba_std",
    estateId: "yarrabilba",
    estateName: "Yarrabilba",
    stageName: "Standard Residential Stages (Precinct 3 & 4)",
    developer: "Lendlease",
    council: "Logan City Council",
    suburb: "Yarrabilba",
    singleStoreySetbacks: {
      frontOmpM: 3.0,
      frontGarageM: 5.0,
      sideStandardM: 1.0,
      sideBtbM: 0.2,
      sideUpperM: 1.0,
      rearM: 1.5,
      secondaryStreetM: 2.0,
      maxSiteCoveragePct: 60,
      maxBuildingHeightM: 8.5,
      sourceDocument: "Lendlease Yarrabilba Siting & Design Guidelines",
    },
    doubleStoreySetbacks: {
      frontOmpM: 4.0,
      frontGarageM: 5.0,
      sideStandardM: 1.25,
      sideBtbM: 0.2,
      sideUpperM: 1.5,
      rearM: 2.0,
      secondaryStreetM: 2.0,
      maxSiteCoveragePct: 55,
      maxBuildingHeightM: 9.0,
      sourceDocument: "Lendlease Yarrabilba Siting & Design Guidelines",
    },
    covenants: [
      {
        id: "cov_yarr_driveway",
        name: "Exposed Aggregate Concrete Driveway",
        description: "Lendlease approved aggregate mix.",
        category: "driveway",
        mandatory: true,
        recommendedAllowanceCost: 5000,
      },
    ],
    notes: "Opticomm estate network. Rainwater tank connection requirements apply.",
    confirmedByHuman: true,
  },

  // NORTH HARBOUR (BURPENGARY EAST)
  {
    id: "north_harbour_all",
    estateId: "north_harbour",
    estateName: "North Harbour",
    stageName: "Residential Stages 1 to 14",
    developer: "North Harbour Holdings",
    council: "City of Moreton Bay",
    suburb: "Burpengary East",
    singleStoreySetbacks: {
      frontOmpM: 4.0,
      frontGarageM: 5.5,
      sideStandardM: 1.0,
      sideBtbM: 0.2,
      sideUpperM: 1.0,
      rearM: 1.5,
      secondaryStreetM: 2.0,
      maxSiteCoveragePct: 50,
      maxBuildingHeightM: 8.5,
      sourceDocument: "North Harbour Design Guidelines Rev 8",
    },
    doubleStoreySetbacks: {
      frontOmpM: 4.5,
      frontGarageM: 5.5,
      sideStandardM: 1.5,
      sideBtbM: 0.2,
      sideUpperM: 1.75,
      rearM: 2.5,
      secondaryStreetM: 2.5,
      maxSiteCoveragePct: 50,
      maxBuildingHeightM: 9.0,
      sourceDocument: "North Harbour Design Guidelines Rev 8",
    },
    covenants: [
      {
        id: "cov_driveway_agg",
        name: "Exposed Aggregate Concrete Driveway",
        description: "Exposed aggregate driveway with perimeter border.",
        category: "driveway",
        mandatory: true,
        recommendedAllowanceCost: 5200,
      },
    ],
    notes: "Mandatory Colorbond / approved tile. Dual living requires developer sign-off.",
    confirmedByHuman: true,
  },

  // BROWNFIELD / KDRB / GENERAL QLD STATUTORY (QDC MP 1.1 / 1.2)
  {
    id: "qdc_statutory",
    estateId: "qdc_statutory",
    estateName: "Established Suburb / KDRB (QDC MP 1.1 & 1.2)",
    stageName: "Standard Council Planning Scheme Rules",
    developer: "Queensland Development Code / Council Planning",
    council: "Brisbane / Logan / Moreton Bay / Gold Coast Councils",
    suburb: "Established Suburbs (KDRB & Private Infill)",
    singleStoreySetbacks: {
      frontOmpM: 6.0,
      frontGarageM: 6.0,
      sideStandardM: 1.0,
      sideBtbM: 0.0,
      sideUpperM: 1.5,
      rearM: 1.5,
      secondaryStreetM: 3.0,
      maxSiteCoveragePct: 50,
      maxBuildingHeightM: 8.5,
      sourceDocument: "QDC MP 1.1 (Single Storey) / Logan / Brisbane Planning Scheme",
    },
    doubleStoreySetbacks: {
      frontOmpM: 6.0,
      frontGarageM: 6.0,
      sideStandardM: 1.5,
      sideBtbM: 0.0,
      sideUpperM: 2.0,
      rearM: 2.5,
      secondaryStreetM: 3.0,
      maxSiteCoveragePct: 50,
      maxBuildingHeightM: 9.5,
      sourceDocument: "QDC MP 1.2 (Double Storey) / Logan / Brisbane Planning Scheme",
    },
    covenants: [],
    notes: "KDRB or infill site. Front setback is 6.0m or the average of adjoining existing dwellings. Check for overland flow and character overlays.",
    confirmedByHuman: true,
  },
];

const VAULT_STORAGE_KEY = "hudson_estate_vault_stages";

export function getCustomVaultStages(): EstateStagePoD[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getAllEstateStages(): EstateStagePoD[] {
  const custom = getCustomVaultStages();
  const map = new Map<string, EstateStagePoD>();
  PRESEEDED_ESTATE_STAGES.forEach((s) => map.set(s.id, s));
  custom.forEach((s) => map.set(s.id, s));
  return Array.from(map.values());
}

export function saveCustomEstateStage(stage: EstateStagePoD): void {
  if (typeof window === "undefined") return;
  const current = getCustomVaultStages();
  const filtered = current.filter((s) => s.id !== stage.id);
  filtered.push(stage);
  localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(filtered));
}

export function resolveSetbacksForStorey(pod: EstateStagePoD, storey: "single" | "double"): SetbackRules {
  return storey === "double" ? pod.doubleStoreySetbacks : pod.singleStoreySetbacks;
}