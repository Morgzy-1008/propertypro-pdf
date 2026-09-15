import {
  type LandParcel,
  type AvailabilityStatus,
  type OutreachEntry,
} from "./landScoutTypes";
import {
  findMatchingHudsonDesigns,
  calculateLandValuationMetrics,
} from "./landScoutAiMatching";
import { upsertLocalLot, type Lot } from "@/lib/databaseStorage";

const STORAGE_KEY_LAND_SCOUT = "hudson_land_scout_parcels_v1";

/**
 * High-Fidelity Active Vacant Land Seed Database.
 * Spans QLD (Logan, Ipswich, Gold Coast, Moreton Bay) and NSW (Western Sydney, North West, South West, Illawarra, Central Coast).
 */
const SEED_PARCELS_RAW = [
  // 1. QLD - Flagstone (Logan Growth Corridor)
  {
    id: "scout-qld-001",
    lotNumber: "142",
    streetAddress: "12 Trailblazer Drive",
    suburb: "Flagstone",
    estate: "Flagstone Central",
    state: "QLD" as const,
    postcode: "4280",
    council: "Logan City Council",
    landSizeM2: 450,
    frontageM: 15.0,
    depthM: 30.0,
    price: 319000,
    isRegistered: true,
    expectedRegistrationDate: "Registered (Immediate Settlement)",
    zoning: "Low Density Residential",
    availabilityStatus: "verified_available" as AvailabilityStatus,
    lastVerifiedAt: "2026-09-15T09:30:00Z",
    sourcePortal: "OpenLot" as const,
    listingUrl: "https://www.openlot.com.au/estates/flagstone/lot-142",
    agentName: "Cameron Scott",
    agentAgency: "Peet Flagstone Land Sales",
    agentPhone: "0412 890 123",
    agentEmail: "cameron.scott@peet.com.au",
    lat: -27.8184,
    lng: 152.9621,
    feasibility: {
      fallEstimateM: 0.6,
      slopeCategory: "flat" as const,
      balRating: "BAL-LOW" as const,
      floodRisk: "none" as const,
      easementNotes: "Clear lot, no rear easements registered on survey plan.",
      isBtbPermissible: true,
      soilProfileSummary: "M Class Reactive Clay (typical Flagstone profile). Minimal piering required.",
      councilLga: "Logan City Council",
    },
    comparables: [
      { id: "c1", address: "8 Trailblazer Dr, Flagstone", landSizeM2: 450, salePrice: 335000, saleDate: "Aug 2026", frontageM: 15.0, pricePerM2: 744 },
      { id: "c2", address: "24 Frontier St, Flagstone", landSizeM2: 420, salePrice: 320000, saleDate: "Jul 2026", frontageM: 14.0, pricePerM2: 761 },
    ],
  },
  // 2. QLD - Ripley (Ipswich Growth Corridor)
  {
    id: "scout-qld-002",
    lotNumber: "804",
    streetAddress: "35 Harmony Crescent",
    suburb: "Ripley",
    estate: "Providence Ripley",
    state: "QLD" as const,
    postcode: "4306",
    council: "Ipswich City Council",
    landSizeM2: 400,
    frontageM: 14.0,
    depthM: 28.57,
    price: 335000,
    isRegistered: true,
    expectedRegistrationDate: "Registered Now",
    zoning: "Residential Medium",
    availabilityStatus: "verified_available" as AvailabilityStatus,
    lastVerifiedAt: "2026-09-14T15:10:00Z",
    sourcePortal: "Stockland" as const,
    listingUrl: "https://www.stockland.com.au/residential/qld/providence/lot-804",
    agentName: "Sarah Jenkins",
    agentAgency: "Stockland Providence Sales Centre",
    agentPhone: "0428 991 450",
    agentEmail: "sarah.jenkins@stockland.com.au",
    lat: -27.6781,
    lng: 152.7915,
    feasibility: {
      fallEstimateM: 0.8,
      slopeCategory: "flat" as const,
      balRating: "BAL-LOW" as const,
      floodRisk: "none" as const,
      easementNotes: "1.5m rear stormwater easement; house footprint unaffected.",
      isBtbPermissible: true,
      soilProfileSummary: "H1 High Reactivity; standard Hudson engineering allowance applies.",
      councilLga: "Ipswich City Council",
    },
    comparables: [
      { id: "c3", address: "19 Harmony Cres, Ripley", landSizeM2: 400, salePrice: 349000, saleDate: "Aug 2026", frontageM: 14.0, pricePerM2: 872 },
      { id: "c4", address: "11 Valley Way, Ripley", landSizeM2: 448, salePrice: 375000, saleDate: "Jun 2026", frontageM: 16.0, pricePerM2: 837 },
    ],
  },
  // 3. QLD - Bahrs Scrub (Windaroo / Beenleigh Corridor)
  {
    id: "scout-qld-003",
    lotNumber: "219",
    streetAddress: "8 Havenwood Circuit",
    suburb: "Bahrs Scrub",
    estate: "Windaroo Haven",
    state: "QLD" as const,
    postcode: "4207",
    council: "Logan City Council",
    landSizeM2: 504,
    frontageM: 16.0,
    depthM: 31.5,
    price: 369000,
    isRegistered: false,
    expectedRegistrationDate: "Q4 2026 (November 2026)",
    zoning: "Low Density Residential",
    availabilityStatus: "pending_outreach" as AvailabilityStatus,
    lastVerifiedAt: "2026-09-12T11:00:00Z",
    sourcePortal: "Domain" as const,
    listingUrl: "https://www.domain.com.au/8-havenwood-circuit-bahrs-scrub-qld-4207",
    agentName: "Mitchell Ryan",
    agentAgency: "Ray White Beenleigh",
    agentPhone: "0439 123 456",
    agentEmail: "mitchell.ryan@raywhite.com",
    lat: -27.7421,
    lng: 153.1895,
    feasibility: {
      fallEstimateM: 1.4,
      slopeCategory: "moderate" as const,
      balRating: "BAL-12.5" as const,
      floodRisk: "none" as const,
      easementNotes: "Zero easements. Clean rectangular block with elevated views.",
      isBtbPermissible: false,
      soilProfileSummary: "M Class stable clay. Minor cut & fill required (approx 0.7m cut).",
      councilLga: "Logan City Council",
    },
    comparables: [
      { id: "c5", address: "14 Havenwood Cct, Bahrs Scrub", landSizeM2: 500, salePrice: 385000, saleDate: "Jul 2026", frontageM: 16.0, pricePerM2: 770 },
      { id: "c6", address: "3 Prangley Rd, Bahrs Scrub", landSizeM2: 480, salePrice: 379000, saleDate: "May 2026", frontageM: 15.0, pricePerM2: 789 },
    ],
  },
  // 4. QLD - Coomera (Northern Gold Coast Corridor)
  {
    id: "scout-qld-004",
    lotNumber: "512",
    streetAddress: "18 Saltwater Way",
    suburb: "Coomera",
    estate: "Foreshore Coomera",
    state: "QLD" as const,
    postcode: "4209",
    council: "City of Gold Coast",
    landSizeM2: 375,
    frontageM: 12.5,
    depthM: 30.0,
    price: 435000,
    isRegistered: true,
    expectedRegistrationDate: "Registered Now",
    zoning: "Low-Medium Density",
    availabilityStatus: "verified_available" as AvailabilityStatus,
    lastVerifiedAt: "2026-09-15T08:45:00Z",
    sourcePortal: "Stockland" as const,
    listingUrl: "https://www.stockland.com.au/residential/qld/foreshore-coomera/lot-512",
    agentName: "Jessica Lee",
    agentAgency: "Stockland Foreshore Discovery Centre",
    agentPhone: "0411 765 432",
    agentEmail: "jessica.lee@stockland.com.au",
    lat: -27.8812,
    lng: 153.3341,
    feasibility: {
      fallEstimateM: 0.3,
      slopeCategory: "flat" as const,
      balRating: "BAL-LOW" as const,
      floodRisk: "none" as const,
      easementNotes: "Clear lot. Flat building pad. Ready to pour slab immediately.",
      isBtbPermissible: true,
      soilProfileSummary: "S Class Sand/Clay blend. Low reactivity, minimal foundation cost.",
      councilLga: "City of Gold Coast",
    },
    comparables: [
      { id: "c7", address: "12 Saltwater Way, Coomera", landSizeM2: 375, salePrice: 450000, saleDate: "Aug 2026", frontageM: 12.5, pricePerM2: 1200 },
      { id: "c8", address: "4 Jetty Bvd, Coomera", landSizeM2: 400, salePrice: 480000, saleDate: "Jul 2026", frontageM: 14.0, pricePerM2: 1200 },
    ],
  },
  // 5. QLD - Lilywood Landings (Warrego / Ipswich West)
  {
    id: "scout-qld-005",
    lotNumber: "63",
    streetAddress: "7 Riverina Circuit",
    suburb: "Lilywood",
    estate: "Lilywood Landings",
    state: "QLD" as const,
    postcode: "4306",
    council: "Ipswich City Council",
    landSizeM2: 465,
    frontageM: 15.5,
    depthM: 30.0,
    price: 345000,
    isRegistered: true,
    expectedRegistrationDate: "Registered Now",
    zoning: "Low Density Residential",
    availabilityStatus: "verified_available" as AvailabilityStatus,
    lastVerifiedAt: "2026-09-14T17:00:00Z",
    sourcePortal: "OpenLot" as const,
    listingUrl: "https://www.openlot.com.au/estates/lilywood-landings/lot-63",
    agentName: "Jesse Jenkins",
    agentAgency: "Lilywood Landings Estate Sales",
    agentPhone: "0431 292 123",
    agentEmail: "jesse.jenkins@hudsonhomes.com.au",
    lat: -27.6521,
    lng: 152.7412,
    feasibility: {
      fallEstimateM: 0.5,
      slopeCategory: "flat" as const,
      balRating: "BAL-LOW" as const,
      floodRisk: "none" as const,
      easementNotes: "Clear lot with 15.5m frontage. Ideal for double garage design.",
      isBtbPermissible: true,
      soilProfileSummary: "M Class reactive clay. Standard Hudson slab specification.",
      councilLga: "Ipswich City Council",
    },
    comparables: [
      { id: "c9", address: "11 Riverina Cct, Lilywood", landSizeM2: 450, salePrice: 355000, saleDate: "Aug 2026", frontageM: 15.0, pricePerM2: 788 },
      { id: "c10", address: "3 Pioneer Way, Lilywood", landSizeM2: 500, salePrice: 380000, saleDate: "Jun 2026", frontageM: 16.0, pricePerM2: 760 },
    ],
  },
  // 6. QLD - Caboolture (Moreton Bay Growth Corridor)
  {
    id: "scout-qld-006",
    lotNumber: "308",
    streetAddress: "14 Riverbank Promenade",
    suburb: "Caboolture",
    estate: "Riverbank Estate",
    state: "QLD" as const,
    postcode: "4510",
    council: "Moreton Bay Regional Council",
    landSizeM2: 420,
    frontageM: 14.0,
    depthM: 30.0,
    price: 325000,
    isRegistered: false,
    expectedRegistrationDate: "Q4 2026",
    zoning: "General Residential",
    availabilityStatus: "pending_outreach" as AvailabilityStatus,
    lastVerifiedAt: "2026-09-13T10:15:00Z",
    sourcePortal: "realestate.com.au" as const,
    listingUrl: "https://www.realestate.com.au/property-residential+land-qld-caboolture-20389102",
    agentName: "David Miller",
    agentAgency: "Peet Riverbank Sales",
    agentPhone: "0418 332 211",
    agentEmail: "david.miller@peet.com.au",
    lat: -27.0815,
    lng: 152.9512,
    feasibility: {
      fallEstimateM: 0.4,
      slopeCategory: "flat" as const,
      balRating: "BAL-LOW" as const,
      floodRisk: "none" as const,
      easementNotes: "Clean boundary lines. 1.0m side setback standard.",
      isBtbPermissible: true,
      soilProfileSummary: "M Class sandy loam over medium clay. Favourable site costs.",
      councilLga: "Moreton Bay Regional Council",
    },
    comparables: [
      { id: "c11", address: "8 Riverbank Prom, Caboolture", landSizeM2: 420, salePrice: 339000, saleDate: "Jul 2026", frontageM: 14.0, pricePerM2: 807 },
    ],
  },
  // 7. NSW - Box Hill (North West Sydney Hub)
  {
    id: "scout-nsw-001",
    lotNumber: "419",
    streetAddress: "22 Gables Parkway",
    suburb: "Box Hill",
    estate: "The Gables",
    state: "NSW" as const,
    postcode: "2765",
    council: "The Hills Shire Council",
    landSizeM2: 450,
    frontageM: 15.0,
    depthM: 30.0,
    price: 685000,
    isRegistered: true,
    expectedRegistrationDate: "Registered Now",
    zoning: "R2 Low Density Residential",
    availabilityStatus: "verified_available" as AvailabilityStatus,
    lastVerifiedAt: "2026-09-15T09:00:00Z",
    sourcePortal: "Stockland" as const,
    listingUrl: "https://www.stockland.com.au/residential/nsw/the-gables/lot-419",
    agentName: "Marcus Vance",
    agentAgency: "Stockland The Gables Sales Suite",
    agentPhone: "0405 889 102",
    agentEmail: "marcus.vance@stockland.com.au",
    lat: -33.6421,
    lng: 150.8521,
    feasibility: {
      fallEstimateM: 0.9,
      slopeCategory: "flat" as const,
      balRating: "BAL-LOW" as const,
      floodRisk: "none" as const,
      easementNotes: "2.0m rear drainage easement. Complies with Hudson 3.0m rear master setback.",
      isBtbPermissible: true,
      soilProfileSummary: "M Class shale clay. Hills Shire standard site cost profile.",
      councilLga: "The Hills Shire Council",
    },
    comparables: [
      { id: "c12", address: "16 Gables Pkwy, Box Hill", landSizeM2: 450, salePrice: 715000, saleDate: "Aug 2026", frontageM: 15.0, pricePerM2: 1588 },
      { id: "c13", address: "3 Redbrick Way, Box Hill", landSizeM2: 420, salePrice: 670000, saleDate: "Jul 2026", frontageM: 14.0, pricePerM2: 1595 },
    ],
  },
  // 8. NSW - Oran Park (South West Sydney Growth Corridor)
  {
    id: "scout-nsw-002",
    lotNumber: "1105",
    streetAddress: "49 South Circuit",
    suburb: "Oran Park",
    estate: "Oran Park Town",
    state: "NSW" as const,
    postcode: "2570",
    council: "Camden Council",
    landSizeM2: 420,
    frontageM: 14.0,
    depthM: 30.0,
    price: 619000,
    isRegistered: true,
    expectedRegistrationDate: "Registered (Immediate Exchange)",
    zoning: "R2 Low Density Residential",
    availabilityStatus: "verified_available" as AvailabilityStatus,
    lastVerifiedAt: "2026-09-14T14:20:00Z",
    sourcePortal: "OpenLot" as const,
    listingUrl: "https://www.openlot.com.au/estates/oran-park-town/lot-1105",
    agentName: "Christine Hunt",
    agentAgency: "Greenfields Oran Park Sales Office",
    agentPhone: "0483 988 125",
    agentEmail: "christine.hunt@hudsonhomes.com.au",
    lat: -34.0041,
    lng: 150.7289,
    feasibility: {
      fallEstimateM: 0.5,
      slopeCategory: "flat" as const,
      balRating: "BAL-LOW" as const,
      floodRisk: "none" as const,
      easementNotes: "Clean title. Zero easements registered on title certificate.",
      isBtbPermissible: true,
      soilProfileSummary: "M Class Camden reactive clay. Highly stable site.",
      councilLga: "Camden Council",
    },
    comparables: [
      { id: "c14", address: "41 South Cct, Oran Park", landSizeM2: 420, salePrice: 635000, saleDate: "Aug 2026", frontageM: 14.0, pricePerM2: 1511 },
      { id: "c15", address: "18 Central Ave, Oran Park", landSizeM2: 450, salePrice: 679000, saleDate: "Jun 2026", frontageM: 15.0, pricePerM2: 1508 },
    ],
  },
  // 9. NSW - Marsden Park (Western Sydney Aerotropolis Corridor)
  {
    id: "scout-nsw-003",
    lotNumber: "732",
    streetAddress: "19 Abell Road",
    suburb: "Marsden Park",
    estate: "Elara",
    state: "NSW" as const,
    postcode: "2765",
    council: "Blacktown City Council",
    landSizeM2: 390,
    frontageM: 13.0,
    depthM: 30.0,
    price: 575000,
    isRegistered: false,
    expectedRegistrationDate: "Q4 2026",
    zoning: "R2 Low Density Residential",
    availabilityStatus: "pending_outreach" as AvailabilityStatus,
    lastVerifiedAt: "2026-09-13T16:00:00Z",
    sourcePortal: "Stockland" as const,
    listingUrl: "https://www.stockland.com.au/residential/nsw/elara/lot-732",
    agentName: "Steve Slisar",
    agentAgency: "Stockland Elara Sales Hub",
    agentPhone: "0483 950 830",
    agentEmail: "steve.slisar@hudsonhomes.com.au",
    lat: -33.7012,
    lng: 150.8312,
    feasibility: {
      fallEstimateM: 0.6,
      slopeCategory: "flat" as const,
      balRating: "BAL-LOW" as const,
      floodRisk: "none" as const,
      easementNotes: "1.5m rear easement. Complies with single storey Amber 21 / Amber 26.",
      isBtbPermissible: true,
      soilProfileSummary: "M Class. Standard site costs apply to 1m fall.",
      councilLga: "Blacktown City Council",
    },
    comparables: [
      { id: "c16", address: "11 Abell Rd, Marsden Park", landSizeM2: 390, salePrice: 595000, saleDate: "Jul 2026", frontageM: 13.0, pricePerM2: 1525 },
    ],
  },
  // 10. NSW - Calderwood (Illawarra Growth Hub)
  {
    id: "scout-nsw-004",
    lotNumber: "348",
    streetAddress: "15 Escarpment Drive",
    suburb: "Calderwood",
    estate: "Calderwood Valley",
    state: "NSW" as const,
    postcode: "2527",
    council: "Shellharbour City Council",
    landSizeM2: 450,
    frontageM: 15.0,
    depthM: 30.0,
    price: 495000,
    isRegistered: true,
    expectedRegistrationDate: "Registered Now",
    zoning: "R2 Low Density Residential",
    availabilityStatus: "verified_available" as AvailabilityStatus,
    lastVerifiedAt: "2026-09-15T09:15:00Z",
    sourcePortal: "Lendlease" as const,
    listingUrl: "https://www.lendlease.com/au/residential/nsw/calderwood-valley/lot-348",
    agentName: "Anthony Cole",
    agentAgency: "Lendlease Calderwood Valley Sales",
    agentPhone: "0414 556 789",
    agentEmail: "anthony.cole@lendlease.com",
    lat: -34.5712,
    lng: 150.7612,
    feasibility: {
      fallEstimateM: 1.2,
      slopeCategory: "moderate" as const,
      balRating: "BAL-12.5" as const,
      floodRisk: "none" as const,
      easementNotes: "Zero easements. Gently sloping building platform.",
      isBtbPermissible: false,
      soilProfileSummary: "M Class Illawarra coastal clay. Beautiful escarpment views.",
      councilLga: "Shellharbour City Council",
    },
    comparables: [
      { id: "c17", address: "21 Escarpment Dr, Calderwood", landSizeM2: 450, salePrice: 520000, saleDate: "Aug 2026", frontageM: 15.0, pricePerM2: 1155 },
      { id: "c18", address: "5 Brushbox Way, Calderwood", landSizeM2: 480, salePrice: 545000, saleDate: "Jun 2026", frontageM: 16.0, pricePerM2: 1135 },
    ],
  },
  // 11. NSW - Warnervale (Central Coast Growth Corridor)
  {
    id: "scout-nsw-005",
    lotNumber: "128",
    streetAddress: "6 Coastal Pine Circuit",
    suburb: "Warnervale",
    estate: "Warnervale Rise",
    state: "NSW" as const,
    postcode: "2259",
    council: "Central Coast Council",
    landSizeM2: 480,
    frontageM: 15.0,
    depthM: 32.0,
    price: 445000,
    isRegistered: true,
    expectedRegistrationDate: "Registered Now",
    zoning: "R2 Low Density Residential",
    availabilityStatus: "verified_available" as AvailabilityStatus,
    lastVerifiedAt: "2026-09-14T11:30:00Z",
    sourcePortal: "Domain" as const,
    listingUrl: "https://www.domain.com.au/6-coastal-pine-circuit-warnervale-nsw-2259",
    agentName: "Gary Rees",
    agentAgency: "Watagan Park Land Sales",
    agentPhone: "0429 850 465",
    agentEmail: "gary.rees@hudsonhomes.com.au",
    lat: -33.2412,
    lng: 151.4521,
    feasibility: {
      fallEstimateM: 0.7,
      slopeCategory: "flat" as const,
      balRating: "BAL-LOW" as const,
      floodRisk: "none" as const,
      easementNotes: "Clean title. No easements crossing building envelope.",
      isBtbPermissible: true,
      soilProfileSummary: "M Class sandy clay. Flat pad, minimal earthworks.",
      councilLga: "Central Coast Council",
    },
    comparables: [
      { id: "c19", address: "14 Coastal Pine Cct, Warnervale", landSizeM2: 480, salePrice: 469000, saleDate: "Jul 2026", frontageM: 15.0, pricePerM2: 977 },
    ],
  },
  // 12. NSW - Austral (South West Growth Core)
  {
    id: "scout-nsw-006",
    lotNumber: "55",
    streetAddress: "10 Tenth Avenue",
    suburb: "Austral",
    estate: "Austral Rise",
    state: "NSW" as const,
    postcode: "2179",
    council: "Liverpool City Council",
    landSizeM2: 360,
    frontageM: 12.5,
    depthM: 28.8,
    price: 549000,
    isRegistered: false,
    expectedRegistrationDate: "Q3 2026 (September 2026)",
    zoning: "R2 Low Density Residential",
    availabilityStatus: "under_offer" as AvailabilityStatus,
    lastVerifiedAt: "2026-09-11T12:00:00Z",
    sourcePortal: "OpenLot" as const,
    listingUrl: "https://www.openlot.com.au/estates/austral-rise/lot-55",
    agentName: "Aaron Martin",
    agentAgency: "Ray White Western Sydney",
    agentPhone: "0483 936 841",
    agentEmail: "aaron.martin@hudsonhomes.com.au",
    lat: -33.9182,
    lng: 150.8123,
    feasibility: {
      fallEstimateM: 0.5,
      slopeCategory: "flat" as const,
      balRating: "BAL-LOW" as const,
      floodRisk: "none" as const,
      easementNotes: "1.2m rear easement for inter-allotment drainage.",
      isBtbPermissible: true,
      soilProfileSummary: "M Class reactive clay. Standard Austral building envelope.",
      councilLga: "Liverpool City Council",
    },
    comparables: [
      { id: "c20", address: "18 Tenth Ave, Austral", landSizeM2: 360, salePrice: 565000, saleDate: "Aug 2026", frontageM: 12.5, pricePerM2: 1569 },
    ],
  },
];

/**
 * Initializes full seed database with computed valuations, matching designs, and outreach logs.
 */
function buildFullSeedParcels(): LandParcel[] {
  return SEED_PARCELS_RAW.map((raw) => {
    const matchingDesigns = findMatchingHudsonDesigns(
      raw.frontageM,
      raw.depthM,
      raw.price,
      raw.feasibility.isBtbPermissible
    );
    const suggestedDesign = matchingDesigns[0]?.designName || "Amber 26";
    const valuation = calculateLandValuationMetrics({
      price: raw.price,
      landSizeM2: raw.landSizeM2,
      frontageM: raw.frontageM,
      suburb: raw.suburb,
      state: raw.state,
      isRegistered: raw.isRegistered,
      comparables: raw.comparables,
    });

    const initialOutreach: OutreachEntry[] = [
      {
        id: `outreach-${raw.id}-1`,
        timestamp: raw.lastVerifiedAt,
        consultantName: "Morgan Hales",
        channel: "email",
        inquiryType: "availability_check",
        notes: `Initial scraper verification against ${raw.sourcePortal} API. Availability confirmed.`,
        status: raw.availabilityStatus === "verified_available" ? "confirmed_available" : "sent",
      },
    ];

    return {
      ...raw,
      pricePerM2: Math.round(raw.price / raw.landSizeM2),
      matchingDesigns,
      suggestedDesign,
      valuation,
      outreachHistory: initialOutreach,
    };
  });
}

/**
 * Retrieves all land parcels from store.
 */
export function getLandParcels(): LandParcel[] {
  if (typeof window === "undefined") return buildFullSeedParcels();

  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAND_SCOUT);
    if (!raw) {
      const initial = buildFullSeedParcels();
      localStorage.setItem(STORAGE_KEY_LAND_SCOUT, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as LandParcel[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : buildFullSeedParcels();
  } catch (e) {
    console.warn("Error reading land scout store:", e);
    return buildFullSeedParcels();
  }
}

/**
 * Saves or updates a land parcel in the local store.
 */
export function saveLandParcel(updated: LandParcel): void {
  if (typeof window === "undefined") return;
  try {
    const all = getLandParcels();
    const idx = all.findIndex((p) => p.id === updated.id);
    if (idx >= 0) {
      all[idx] = updated;
    } else {
      all.unshift(updated);
    }
    localStorage.setItem(STORAGE_KEY_LAND_SCOUT, JSON.stringify(all));
  } catch (e) {
    console.warn("Error saving land parcel:", e);
  }
}

/**
 * Updates availability status of a parcel.
 */
export function updateParcelAvailability(
  id: string,
  newStatus: AvailabilityStatus,
  note?: string
): LandParcel | null {
  const all = getLandParcels();
  const parcel = all.find((p) => p.id === id);
  if (!parcel) return null;

  parcel.availabilityStatus = newStatus;
  parcel.lastVerifiedAt = new Date().toISOString();

  if (note) {
    parcel.outreachHistory.unshift({
      id: `outreach-${Date.now()}`,
      timestamp: new Date().toISOString(),
      consultantName: "Morgan Hales",
      channel: "email",
      inquiryType: "availability_check",
      notes: note,
      status: newStatus === "verified_available" ? "confirmed_available" : "sent",
    });
  }

  saveLandParcel(parcel);
  return parcel;
}

/**
 * Logs a new outreach entry (email, SMS, or phone) on a parcel.
 */
export function logAgentOutreach(
  parcelId: string,
  entry: Omit<OutreachEntry, "id" | "timestamp">
): LandParcel | null {
  const all = getLandParcels();
  const parcel = all.find((p) => p.id === parcelId);
  if (!parcel) return null;

  const newEntry: OutreachEntry = {
    ...entry,
    id: `outreach-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };

  parcel.outreachHistory.unshift(newEntry);
  if (entry.status === "confirmed_available") {
    parcel.availabilityStatus = "verified_available";
    parcel.lastVerifiedAt = newEntry.timestamp;
  } else if (entry.status === "under_offer") {
    parcel.availabilityStatus = "under_offer";
  } else if (entry.status === "sold") {
    parcel.availabilityStatus = "sold";
  }

  saveLandParcel(parcel);
  return parcel;
}

/**
 * 1-Click Handoff: Dispatches parcel into Package Studio (Flyer Builder) with auto-matched Hudson design.
 */
export function handoffLotToFlyer(parcel: LandParcel, selectedDesignName?: string): void {
  if (typeof window === "undefined") return;

  const topDesign = selectedDesignName || parcel.suggestedDesign || "Amber 26";
  const matched = parcel.matchingDesigns.find((d) => d.designName === topDesign) || parcel.matchingDesigns[0];

  const payload = {
    lotId: parcel.lotNumber || parcel.id,
    address: parcel.streetAddress || `${parcel.lotNumber} ${parcel.estate}`,
    suburb: parcel.suburb,
    estate: parcel.estate,
    state: parcel.state,
    postcode: parcel.postcode,
    landSize: String(parcel.landSizeM2),
    landFrontage: String(parcel.frontageM),
    landDepth: String(parcel.depthM),
    landPrice: `$${parcel.price.toLocaleString()}`,
    designName: topDesign,
    floorplanSize: matched ? String(matched.floorplanM2) : "241.56",
    price: matched ? `$${matched.estimatedPackagePrice.toLocaleString()}` : `$${(parcel.price + 430000).toLocaleString()}`,
    housePrice: matched ? `$${matched.estimatedHousePrice.toLocaleString()}` : "$430,000",
    beds: matched ? String(matched.beds) : "4",
    baths: matched ? String(matched.baths) : "2",
    cars: matched ? String(matched.cars) : "2",
    isBtb: parcel.feasibility.isBtbPermissible,
    frontSetback: "3.8",
    rearSetback: String(Number(Math.max(1.0, parcel.depthM - (matched?.houseLengthM || 20.15) - 3.8).toFixed(2))),
  };

  sessionStorage.setItem("hudson-flyer-handoff", JSON.stringify(payload));
  sessionStorage.setItem("hudson-landscout-handoff", JSON.stringify(payload));
}

/**
 * 1-Click Handoff: Syncs discovered parcel into Hudson's permanent land database.
 */
export function syncLotToDatabase(parcel: LandParcel): boolean {
  try {
    const lot: Lot = {
      id: parcel.id,
      estate_name: parcel.estate || parcel.suburb,
      suburb: parcel.suburb,
      lot_number: parcel.lotNumber,
      street_name: parcel.streetAddress,
      size_m2: parcel.landSizeM2,
      frontage_m: parcel.frontageM,
      depth_m: parcel.depthM,
      price: parcel.price,
      registered: parcel.isRegistered,
      status: parcel.availabilityStatus === "verified_available" ? "available" : "pending",
      state: parcel.state,
      notes: `Sourced via Hudson Land Scout (${parcel.sourcePortal}). Deal Score: ${parcel.valuation.dealScorePoints}/100. Contact: ${parcel.agentName} (${parcel.agentPhone}).`,
    };

    upsertLocalLot(lot);
    return true;
  } catch (e) {
    console.error("Error syncing lot to database:", e);
    return false;
  }
}
