import type { CatalogueCategory, CatalogueItem } from "./quoteTypes";

export const DEFAULT_CUSTOM_RATES = {
  singleGroundLivingM2Rate: 1660,
  singleGroundLivingH3M2Rate: 1810,
  doubleGroundLivingM2Rate: 1500,
  doubleUpperLivingM2Rate: 1800,
  doubleGroundLivingH3M2Rate: 1650,
  doubleUpperLivingH3M2Rate: 1950,
  garageM2Rate: 1400,
  ancillaryM2Rate: 869, // Alfresco, Porch
  doubleScaffoldingAllowance: 8500,
};

export const CATEGORY_LABELS: Record<CatalogueCategory, string> = {
  floorplan_extensions: "Floorplan Extensions",
  ceiling_heights: "Ceiling Heights",
  structural: "Structural Modifications",
  doors_windows: "Doors and Windows",
  external: "External & Facade Upgrades",
  internal_kitchen: "Internal - Kitchen",
  internal_bathroom: "Internal - Bathroom",
  internal_bedrooms: "Internal - Bedrooms & Storage",
  internal_laundry: "Internal - Laundry",
  colour_upgrades: "Electrical, HVAC & Finishes",
  site_earthworks: "Site Specific & Engineering Reports",
  council_statutory: "Council & Statutory Requirements",
};

export interface DuplicatePair {
  id: string; // unique pair key e.g. "itemA::itemB"
  itemA: CatalogueItem;
  itemB: CatalogueItem;
  reason: string;
}

/**
 * Calculates bi-gram Dice coefficient string similarity between 0.0 and 1.0.
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, " ").trim().replace(/\s+/g, " ");
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, " ").trim().replace(/\s+/g, " ");
  if (s1 === s2) return 1.0;
  if (s1.length < 2 || s2.length < 2) return 0.0;

  const getBigrams = (s: string) => {
    const bigrams = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const gram = s.slice(i, i + 2);
      bigrams.set(gram, (bigrams.get(gram) || 0) + 1);
    }
    return bigrams;
  };

  const bg1 = getBigrams(s1);
  const bg2 = getBigrams(s2);
  let intersection = 0;

  for (const [gram, count1] of bg1.entries()) {
    if (bg2.has(gram)) {
      intersection += Math.min(count1, bg2.get(gram)!);
    }
  }

  const total = (s1.length - 1) + (s2.length - 1);
  return total > 0 ? (2.0 * intersection) / total : 0;
}

/**
 * Flags potential duplicate items in the catalogue requiring ~90% wording match.
 * Returns distinct pairs of matching items (Item A vs Item B).
 */
export function findPotentialDuplicates(
  items: CatalogueItem[],
  unflaggedPairKeys: Set<string> = new Set(),
): DuplicatePair[] {
  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]/g, " ")
      .trim()
      .replace(/\s+/g, " ");

  const pairs: DuplicatePair[] = [];
  const processedPairs = new Set<string>();

  for (let i = 0; i < items.length; i++) {
    const a = items[i];
    const nameA = clean(a.name);

    for (let j = i + 1; j < items.length; j++) {
      const b = items[j];
      const pairKey = [a.id, b.id].sort().join("::");
      if (processedPairs.has(pairKey) || unflaggedPairKeys.has(pairKey)) continue;

      const nameB = clean(b.name);

      // Check 1: Exact name match
      if (nameA === nameB) {
        pairs.push({
          id: pairKey,
          itemA: a,
          itemB: b,
          reason: "Identical item name (100% match)",
        });
        processedPairs.add(pairKey);
        continue;
      }

      // Check 2: Near identical wording match (~90% threshold in same category)
      if (a.category === b.category) {
        const similarity = calculateStringSimilarity(nameA, nameB);
        if (similarity >= 0.88) {
          pairs.push({
            id: pairKey,
            itemA: a,
            itemB: b,
            reason: `Near-identical wording (${Math.round(similarity * 100)}% match)`,
          });
          processedPairs.add(pairKey);
        }
      }
    }
  }

  return pairs;
}

/**
 * Master Hudson Homes Price Catalogue
 * Pre-populated with professional, client-friendly construction descriptions and standard rates.
 * All items and wording are fully editable in the Admin Catalogue modal.
 */
export const DEFAULT_CATALOGUE: CatalogueItem[] = [
  // ==========================================
  // 1. FLOORPLAN EXTENSIONS
  // ==========================================
  {
    id: "str_custom_ss_h2",
    category: "floorplan_extensions",
    name: "Custom Single Storey Living Area (H2 Inclusions)",
    description: "Custom ground floor enclosed living area framing, insulation, plasterboard, and finishes based on H2 Builder specification.",
    unitType: "per_m2",
    unitRate: 1660,
    isClientSelectable: true,
  },
  {
    id: "str_custom_ss_h3",
    category: "floorplan_extensions",
    name: "Custom Single Storey Living Area (H3 Inclusions)",
    description: "Custom ground floor enclosed living area framing, insulation, plasterboard, and finishes based on H3 Luxury specification.",
    unitType: "per_m2",
    unitRate: 1810,
    isClientSelectable: true,
  },
  {
    id: "str_custom_garage",
    category: "floorplan_extensions",
    name: "Custom Garage Floor Footprint Extension",
    description: "Reinforced concrete slab, timber/steel wall framing, exterior brickwork/cladding, and engineered roof trusses for garage.",
    unitType: "per_m2",
    unitRate: 1400,
    isClientSelectable: true,
  },
  {
    id: "str_custom_porch_alfresco",
    category: "floorplan_extensions",
    name: "Custom Porch / Alfresco Under-Roof Area",
    description: "Integrated concrete slab and roofline framing extension for outdoor porch or alfresco entertaining footprint.",
    unitType: "per_m2",
    unitRate: 869,
    isClientSelectable: true,
  },
  {
    id: "str_custom_ds_h2_gf",
    category: "floorplan_extensions",
    name: "Double Storey Ground Floor Living (H2 Inclusions)",
    description: "Ground floor structural living area construction with engineered floor joists above for double storey custom home.",
    unitType: "per_m2",
    unitRate: 1500,
    isClientSelectable: true,
  },
  {
    id: "str_custom_ds_h2_ff",
    category: "floorplan_extensions",
    name: "Double Storey First Floor Living (H2 Inclusions)",
    description: "Upper floor structural living area framing, floor sheeting, insulation, and roofline based on H2 Builder specification.",
    unitType: "per_m2",
    unitRate: 1800,
    isClientSelectable: true,
  },
  {
    id: "str_custom_ds_h3_gf",
    category: "floorplan_extensions",
    name: "Double Storey Ground Floor Living (H3 Inclusions)",
    description: "Ground floor structural living area construction with engineered upper joist framing for double storey custom home (H3 spec).",
    unitType: "per_m2",
    unitRate: 1650,
    isClientSelectable: true,
  },
  {
    id: "str_custom_ds_h3_ff",
    category: "floorplan_extensions",
    name: "Double Storey First Floor Living (H3 Inclusions)",
    description: "Upper floor structural living area framing, premium acoustic floor sheeting, and roofline based on H3 Luxury specification.",
    unitType: "per_m2",
    unitRate: 1950,
    isClientSelectable: true,
  },
  {
    id: "str_balcony_uncovered",
    category: "floorplan_extensions",
    name: "Uncovered Balcony Structure with H2 Range Tiles",
    description: "External cantilevered or post-supported balcony structure, waterproofed and finished with H2 range ceramic floor tiles.",
    unitType: "per_m2",
    unitRate: 2000,
    isClientSelectable: true,
  },
  {
    id: "str_balcony_covered",
    category: "floorplan_extensions",
    name: "Covered Balcony Structure with H2 Range Tiles",
    description: "Covered upper floor balcony structure with extended roofline, ceiling lining, waterproofing, and H2 range floor tiles.",
    unitType: "per_m2",
    unitRate: 2500,
    isClientSelectable: true,
  },
  {
    id: "str_add_gf_ss",
    category: "floorplan_extensions",
    name: "Additional Ground Floor Living Area (Single Storey)",
    description: "Extended ground floor enclosed living area with integrated roof trusses, insulation, and external cladding.",
    unitType: "per_m2",
    unitRate: 1420,
    isClientSelectable: true,
  },
  {
    id: "str_add_gf_ds",
    category: "floorplan_extensions",
    name: "Additional Ground Floor Living Area (Double Storey)",
    description: "Extended ground floor structural footprint with intermediate engineered floor joists and load-bearing framing.",
    unitType: "per_m2",
    unitRate: 1480,
    isClientSelectable: true,
  },
  {
    id: "str_add_ff_ds",
    category: "floorplan_extensions",
    name: "Additional First Floor Living Area (Double Storey)",
    description: "Extended upper floor structural living area including structural joists, wall framing, and roof structure.",
    unitType: "per_m2",
    unitRate: 1780,
    isClientSelectable: true,
  },
  {
    id: "str_add_alfresco",
    category: "floorplan_extensions",
    name: "Additional Alfresco Footprint Area",
    description: "Extended under-roof alfresco slab and roofline for enlarged outdoor entertaining space.",
    unitType: "per_m2",
    unitRate: 869,
    isClientSelectable: true,
  },
  {
    id: "str_add_wet_area_surcharge",
    category: "floorplan_extensions",
    name: "Additional Wet Area Surcharge (Bathroom/Ensuite/Laundry)",
    description: "Specialized waterproofing membrane, sub-floor plumbing rough-in, and sand-cement screed surcharge for enlarged wet areas.",
    unitType: "per_m2",
    unitRate: 242,
    isClientSelectable: true,
  },
  {
    id: "str_alfresco_integral_slab_tiled",
    category: "floorplan_extensions",
    name: "Integral Concrete Slab to Alfresco with Level 1 Floor Tiles",
    description: "Monolithic engineered slab poured integrally with main house foundation and tiled in Level 1 outdoor ceramic tiles.",
    unitType: "per_m2",
    unitRate: 228,
    isClientSelectable: true,
  },
  {
    id: "str_drop_edge_beam",
    category: "floorplan_extensions",
    name: "Reinforced Drop Edge Beam (DEB)",
    description: "Deepened vertical concrete perimeter footing beam to retain site fill and accommodate natural ground slope across building pad.",
    unitType: "per_lm",
    unitRate: 1050,
    isClientSelectable: true,
  },

  // ==========================================
  // 2. CEILING HEIGHTS & DETAILS
  // ==========================================
  {
    id: "str_raked_ceiling",
    category: "ceiling_heights",
    name: "Raked Ceiling with Engineered Trusses",
    description: "Architectural pitched raked ceiling structure with engineered scissor trusses to selected living areas in lieu of standard flat ceiling.",
    unitType: "per_m2",
    unitRate: 310,
    isClientSelectable: true,
  },
  {
    id: "str_ceiling_2590_from_2440",
    category: "ceiling_heights",
    name: "Upgrade to 2,590mm (8'6\") Ceiling Height (ilo 2,440mm)",
    description: "Height increase to 2,590mm wall framing throughout ($45/m² ceiling framing + $3/m² for 2,340mm internal door heights).",
    unitType: "per_m2",
    unitRate: 48,
    isClientSelectable: true,
  },
  {
    id: "str_ceiling_2740_from_2590",
    category: "ceiling_heights",
    name: "Upgrade to 2,740mm (9'0\") Ceiling Height (from 2,590mm)",
    description: "Height increase to 2,740mm framing including 2,400mm header heights to external doors and windows.",
    unitType: "per_m2",
    unitRate: 55,
    isClientSelectable: true,
  },
  {
    id: "str_ceiling_2740_from_2440",
    category: "ceiling_heights",
    name: "Upgrade to 2,740mm (9'0\") Ceiling Height (ilo 2,440mm)",
    description: "Full height increase from standard 2,440mm to 2,740mm framing including 2,400mm door/window header heights.",
    unitType: "per_m2",
    unitRate: 73,
    isClientSelectable: true,
  },
  {
    id: "str_ceiling_3000_from_2740",
    category: "ceiling_heights",
    name: "Upgrade to 3,000mm (10'0\") Ceiling Height (from 2,740mm)",
    description: "Luxury 3,000mm ceiling framing upgrade from 2,740mm height throughout living areas.",
    unitType: "per_m2",
    unitRate: 35,
    isClientSelectable: true,
  },
  {
    id: "str_ceiling_3000_from_2590",
    category: "ceiling_heights",
    name: "Upgrade to 3,000mm (10'0\") Ceiling Height (from 2,590mm)",
    description: "Luxury 3,000mm ceiling framing upgrade from 2,590mm including 2,340mm internal doors.",
    unitType: "per_m2",
    unitRate: 73,
    isClientSelectable: true,
  },
  {
    id: "str_ceiling_3000_from_2440",
    category: "ceiling_heights",
    name: "Upgrade to 3,000mm (10'0\") Ceiling Height (ilo 2,440mm)",
    description: "Full luxury 3,000mm ceiling framing upgrade from standard 2,440mm including 2,340mm internal doors.",
    unitType: "per_m2",
    unitRate: 83,
    isClientSelectable: true,
  },
  {
    id: "str_square_set_ceilings",
    category: "ceiling_heights",
    name: "Square Set Cornice Finish Throughout",
    description: "Modern architectural square-set plaster joint between walls and ceiling in lieu of standard cove cornice.",
    unitType: "per_m2",
    unitRate: 10,
    isClientSelectable: true,
  },

  // ==========================================
  // 3. STRUCTURAL MODIFICATIONS
  // ==========================================
  {
    id: "str_wall_70mm",
    category: "structural",
    name: "Additional 70mm Internal Plasterboard Wall",
    description: "70mm structural timber stud internal partition wall with 10mm plasterboard linings and 3-coat paint finish.",
    unitType: "per_lm",
    unitRate: 193,
    isClientSelectable: true,
  },
  {
    id: "str_wall_90mm",
    category: "structural",
    name: "Additional 90mm Internal Plasterboard Wall",
    description: "90mm heavy-duty timber stud partition wall framing with 10mm plasterboard linings and 3-coat paint finish.",
    unitType: "per_lm",
    unitRate: 240,
    isClientSelectable: true,
  },
  {
    id: "str_steel_beam_300pfc",
    category: "structural",
    name: "Structural Steel Beam (Up to 300 PFC)",
    description: "Heavy structural parallel flange channel (PFC) steel beam with engineering connections and crane installation ($483/lm + $1,100 base installation).",
    unitType: "per_lm",
    unitRate: 483,
    isClientSelectable: true,
  },
  {
    id: "str_raised_theatre_platform",
    category: "structural",
    name: "Raised Tiered Platform to Home Theatre",
    description: "Engineered stepped timber platform with acoustic isolation underlay for cinema-style multi-level seating.",
    unitType: "per_m2",
    unitRate: 280,
    isClientSelectable: true,
  },
  {
    id: "str_pool_provisions",
    category: "structural",
    name: "Provisions for Close-to-Dwelling Swimming Pool",
    description: "Deep concrete piering to zone of influence, hard safety cover, and structural engineering to allow future pool excavation adjacent to house.",
    unitType: "fixed",
    unitRate: 5000,
    isClientSelectable: true,
  },
  {
    id: "str_roof_gable",
    category: "structural",
    name: "Architectural Roof Gable Feature",
    description: "Pitched decorative gable infill with weatherboard or batten cladding and flashing in lieu of standard hip roofline.",
    unitType: "per_lm",
    unitRate: 200,
    isClientSelectable: true,
  },
  {
    id: "str_elevator_basic",
    category: "structural",
    name: "Provisions for Residential Elevator (Basic Fitout)",
    description: "Structural shaft construction, load-bearing concrete pit, and electrical rough-in for future residential lift installation.",
    unitType: "fixed",
    unitRate: 45000,
    isClientSelectable: true,
  },

  // ==========================================
  // 4. DOORS & WINDOWS
  // ==========================================
  {
    id: "dw_cornerless_stacker_ss",
    category: "doors_windows",
    name: "Cornerless Stacker Sliding Doors to Alfresco (Single Storey)",
    description: "Dual aluminium multi-panel stacker sliding doors opening to seamless 90° corner without fixed post, including engineered overhead lintel.",
    unitType: "fixed",
    unitRate: 4000,
    isClientSelectable: true,
  },
  {
    id: "dw_cornerless_stacker_ds",
    category: "doors_windows",
    name: "Cornerless Stacker Sliding Doors to Alfresco (Double Storey)",
    description: "Heavy-duty 90° zero-corner stacker doors with engineered structural steel overhead beam support for upper level loads.",
    unitType: "fixed",
    unitRate: 5000,
    isClientSelectable: true,
  },
  {
    id: "dw_sliding_door_2124",
    category: "doors_windows",
    name: "21-24 Aluminium Framed Sliding Door (2,100h x 2,400w)",
    description: "2,100mm high x 2,400mm wide powder-coated aluminium glass sliding door with key lock and safety glazing.",
    unitType: "fixed",
    unitRate: 1594,
    isClientSelectable: true,
  },
  {
    id: "dw_window_1809",
    category: "doors_windows",
    name: "18-09 Aluminium Framed Window (1,800h x 900w)",
    description: "1,800mm high x 900mm wide powder-coated aluminium opening window with key lock and insect screen.",
    unitType: "fixed",
    unitRate: 490,
    isClientSelectable: true,
  },
  {
    id: "dw_corner_window",
    category: "doors_windows",
    name: "Architectural Butt-Jointed Fixed Corner Window",
    description: "Feature 90-degree butt-jointed corner glass window providing unobstructed panoramic views.",
    unitType: "fixed",
    unitRate: 1800,
    isClientSelectable: true,
  },
  {
    id: "dw_cavity_sliding_door",
    category: "doors_windows",
    name: "Cavity Sliding Door Unit (2,340mm x 870mm)",
    description: "Flush-mounting internal timber door frame sliding smoothly into wall cavity with recessed flush pull hardware.",
    unitType: "fixed",
    unitRate: 880,
    isClientSelectable: true,
  },
  {
    id: "dw_entry_door_1020",
    category: "doors_windows",
    name: "1,020mm Wide Front Entry Door (ilo Standard)",
    description: "Upgraded 1,020mm wide solid core painted/stained front entry door with weather seal and quality lockset.",
    unitType: "fixed",
    unitRate: 793,
    isClientSelectable: true,
  },
  {
    id: "dw_entry_door_2340_1200",
    category: "doors_windows",
    name: "Grand 2,340mm x 1,200mm Architectural Entry Door",
    description: "Grand 2,340mm x 1,200mm wide architectural entrance door with translucent glass inserts and pull handle.",
    unitType: "fixed",
    unitRate: 1350,
    isClientSelectable: true,
  },
  {
    id: "dw_security_screen_door",
    category: "doors_windows",
    name: "Diamond Barrier Security Screen Door (Per Hinged Door)",
    description: "Heavy-duty extruded aluminium security grille screen door with 3-point deadbolt lock and insect mesh.",
    unitType: "fixed",
    unitRate: 998,
    isClientSelectable: true,
  },
  {
    id: "dw_security_screen_window",
    category: "doors_windows",
    name: "Diamond Barrier Security Screen (Per Window)",
    description: "Powder-coated aluminium security grille screen fitted securely to opening window.",
    unitType: "fixed",
    unitRate: 572,
    isClientSelectable: true,
  },

  // ==========================================
  // 5. INTERNAL - KITCHEN & APPLIANCES
  // ==========================================
  {
    id: "kit_fp_cooktop_600_electric",
    category: "internal_kitchen",
    name: "Fisher & Paykel 600mm Black Glass Electric Cooktop (CE604LBX2)",
    description: "Fisher & Paykel 600mm 4-zone black ceramic glass electric cooktop (CE604LBX2) with touch controls and flat easy-clean surface.",
    unitType: "fixed",
    unitRate: 1263,
    isClientSelectable: true,
  },
  {
    id: "kit_fp_rangehood_600_slideout",
    category: "internal_kitchen",
    name: "Fisher & Paykel 600mm Slide-Out Rangehood (HS60LRX4)",
    description: "Fisher & Paykel 600mm stainless steel slide-out rangehood (HS60LRX4) with dual multi-layer filters and ducted exhaust.",
    unitType: "fixed",
    unitRate: 713,
    isClientSelectable: true,
  },
  {
    id: "kit_900_appliances_h2",
    category: "internal_kitchen",
    name: "900mm H2 Kitchen Appliances Upgrade (ilo H1 600mm)",
    description: "Upgrade from 600mm to premium 900mm stainless steel gas/electric cooktop, canopy rangehood, and 900mm built-in oven.",
    unitType: "fixed",
    unitRate: 2787,
    isClientSelectable: true,
  },
  {
    id: "kit_extra_600_oven",
    category: "internal_kitchen",
    name: "Additional 600mm Stainless Steel Wall Oven",
    description: "Second built-in 600mm multi-function electric oven with dedicated power circuit and custom joinery tower installation.",
    unitType: "fixed",
    unitRate: 1500,
    isClientSelectable: true,
  },
  {
    id: "kit_integrated_fridge",
    category: "internal_kitchen",
    name: "Integrated Luxury Refrigerator Cabinetry Fitout",
    description: "Custom seamless joinery cabinetry housing and ventilation channels to integrate client's built-in refrigerator.",
    unitType: "fixed",
    unitRate: 10000,
    isClientSelectable: true,
  },
  {
    id: "kit_base_cupboards_20mm_stone",
    category: "internal_kitchen",
    name: "600mm Base Cupboards with 20mm Category 1 Stone Top",
    description: "600mm deep laminate base cabinetry with soft-close drawers and 20mm thick Category 1 engineered stone benchtop.",
    unitType: "per_lm",
    unitRate: 1188,
    isClientSelectable: true,
  },
  {
    id: "kit_overhead_cupboards",
    category: "internal_kitchen",
    name: "Overhead Kitchen / Laundry Cupboards",
    description: "Laminate overhead cabinets with concealed magnetic catches and adjustable interior shelving.",
    unitType: "per_lm",
    unitRate: 850,
    isClientSelectable: true,
  },
  {
    id: "kit_stone_upgrade_ilo_laminate",
    category: "internal_kitchen",
    name: "20mm Category 1 Stone Benchtop (ilo Laminate)",
    description: "Upgrade kitchen benchtops from standard laminate to 20mm polished Category 1 engineered stone.",
    unitType: "per_lm",
    unitRate: 400,
    isClientSelectable: true,
  },
  {
    id: "kit_stone_complete_20mm",
    category: "internal_kitchen",
    name: "20mm Category 1 Stone Benchtop Surface (Complete)",
    description: "Supply and installation of 20mm Category 1 engineered quartz stone benchtop with polished arrised edge profile.",
    unitType: "per_lm",
    unitRate: 780,
    isClientSelectable: true,
  },
  {
    id: "kit_stone_40mm_upgrade",
    category: "internal_kitchen",
    name: "Upgrade Stone Benchtop Thickness to 40mm (ilo 20mm)",
    description: "Enhanced 40mm laminated edge profile to all kitchen island and benchtop perimeters.",
    unitType: "per_lm",
    unitRate: 245,
    isClientSelectable: true,
  },
  {
    id: "kit_extend_island_bench",
    category: "internal_kitchen",
    name: "Extend H2 Kitchen Island Bench Footprint",
    description: "Additional length of island bench cabinetry with matching 20mm stone top and breakfast bar overhang.",
    unitType: "per_lm",
    unitRate: 1322,
    isClientSelectable: true,
  },
  {
    id: "kit_clark_polar_undermount_sink",
    category: "internal_kitchen",
    name: "Clark Polar Double Bowl Undermount Sink (PPL20BU)",
    description: "Premium 304-grade stainless steel undermount double bowl sink seamlessly fitted into stone island bench (ilo standard).",
    unitType: "fixed",
    unitRate: 421,
    isClientSelectable: true,
  },
  {
    id: "kit_fp_cooktop_900",
    category: "internal_kitchen",
    name: "Additional 900mm Fisher & Paykel Gas Cooktop (H2)",
    description: "Additional 900mm Fisher & Paykel 5-burner stainless steel gas cooktop for scullery or secondary kitchen.",
    unitType: "fixed",
    unitRate: 2350,
    isClientSelectable: true,
  },
  {
    id: "kit_fp_rangehood_900",
    category: "internal_kitchen",
    name: "Additional 900mm Fisher & Paykel Rangehood (H2)",
    description: "Additional 900mm Fisher & Paykel high-extraction ducted canopy rangehood.",
    unitType: "fixed",
    unitRate: 900,
    isClientSelectable: true,
  },

  // ==========================================
  // 6. INTERNAL - BATHROOM & ENSUITE
  // ==========================================
  {
    id: "bath_additional_ensuite",
    category: "internal_bathroom",
    name: "Complete Additional Ensuite Bathroom (H2 Builders Range)",
    description: "Fully tiled bathroom containing walk-in semi-frameless shower, single vanity with mixer tap, toilet suite, and exhaust fan.",
    unitType: "fixed",
    unitRate: 10000,
    isClientSelectable: true,
  },
  {
    id: "bath_ftc_tiles_main",
    category: "internal_bathroom",
    name: "Floor-to-Ceiling Wall Tiles — Main Bathroom",
    description: "Full-height ceramic wall tiling throughout main bathroom up to ceiling line with polished metal angle trim.",
    unitType: "fixed",
    unitRate: 2500,
    isClientSelectable: true,
  },
  {
    id: "bath_ftc_tiles_ensuite",
    category: "internal_bathroom",
    name: "Floor-to-Ceiling Wall Tiles — Master Ensuite",
    description: "Full-height luxury ceramic wall tiling throughout master ensuite up to ceiling line with polished metal trim.",
    unitType: "fixed",
    unitRate: 2500,
    isClientSelectable: true,
  },
  {
    id: "bath_heat_pump_extra_ensuite",
    category: "internal_bathroom",
    name: "Additional Heat Pump Hot Water System (Extra Ensuite)",
    description: "Energy-efficient 270L external heat pump hot water system to support additional wet area plumbing demand.",
    unitType: "fixed",
    unitRate: 3300,
    isClientSelectable: true,
  },

  // ==========================================
  // 7. INTERNAL - BEDROOMS & STORAGE
  // ==========================================
  {
    id: "bed_wir_melamine_shelf_rail",
    category: "internal_bedrooms",
    name: "Walk-In Robe (WIR) Melamine Shelving & Hanging Rail",
    description: "Additional 16mm white melamine open shelving module with full-width oval hanging rail for walk-in wardrobe.",
    unitType: "per_lm",
    unitRate: 100,
    isClientSelectable: true,
  },
  {
    id: "bed_robe_vinyl_sliding",
    category: "internal_bedrooms",
    name: "Built-In Wardrobe with Vinyl Sliding Doors",
    description: "Extended length wardrobe fitout with smooth-gliding vinyl sliding doors, top shelf, and chrome hanging rail.",
    unitType: "per_lm",
    unitRate: 430,
    isClientSelectable: true,
  },
  {
    id: "bed_robe_mirror_sliding",
    category: "internal_bedrooms",
    name: "Built-In Wardrobe with Mirrored Sliding Doors",
    description: "Extended length wardrobe fitout with full-height safety mirror sliding doors, top shelf, and chrome hanging rail.",
    unitType: "per_lm",
    unitRate: 530,
    isClientSelectable: true,
  },
  {
    id: "bed_melamine_shelving",
    category: "internal_bedrooms",
    name: "Additional White Melamine Storage Shelving",
    description: "Additional 16mm white moisture-resistant melamine shelf installed with support brackets to linen or pantry.",
    unitType: "per_lm",
    unitRate: 62,
    isClientSelectable: true,
  },

  // ==========================================
  // 8. ELECTRICAL, HVAC & SOLAR
  // ==========================================
  {
    id: "elec_3phase_power",
    category: "colour_upgrades",
    name: "Upgrade to 3-Phase Electrical Power Supply",
    description: "3-phase power lead-in and main switchboard upgrade for heavy electrical appliances and rapid EV charging capacity.",
    unitType: "fixed",
    unitRate: 1070,
    isClientSelectable: true,
  },
  {
    id: "elec_ev_charger_circuit",
    category: "colour_upgrades",
    name: "Dedicated 20-Amp EV Charger Circuit to Garage",
    description: "Dedicated high-capacity 20A GPO power circuit wired from main switchboard to garage for electric vehicle charger.",
    unitType: "fixed",
    unitRate: 588,
    isClientSelectable: true,
  },
  {
    id: "hvac_ducted_aircon",
    category: "colour_upgrades",
    name: "Ducted Reverse-Cycle Air Conditioning (ilo H1 Split System)",
    description: "Whole-home multi-zone ducted reverse cycle inverter air conditioning system with digital programmable wall controller.",
    unitType: "fixed",
    unitRate: 12500,
    isClientSelectable: true,
  },
  {
    id: "hvac_airtouch5_wifi",
    category: "colour_upgrades",
    name: "Polyair AirTouch 5 Smart Wi-Fi Controller",
    description: "Touchscreen wall tablet and smartphone app controller with individual zone temperature control sensors.",
    unitType: "fixed",
    unitRate: 1207,
    isClientSelectable: true,
  },
  {
    id: "solar_6_6kw_battery",
    category: "colour_upgrades",
    name: "6.6kW Solar PV System with 5kW Inverter & Home Battery",
    description: "15 Tier-1 monocrystalline solar panels (6.6kW), 5kW hybrid inverter, and integrated home energy battery storage unit.",
    unitType: "fixed",
    unitRate: 12000,
    isClientSelectable: true,
  },
  {
    id: "solar_delete_credit_h3",
    category: "colour_upgrades",
    name: "Credit: Delete Standard Solar System (from H3 Inclusions)",
    description: "Cost reduction credit for removing builder standard 3.3kW solar panel system.",
    unitType: "fixed",
    unitRate: -2300,
    isClientSelectable: true,
  },
  {
    id: "elec_spectrum_studio_allowance",
    category: "colour_upgrades",
    name: "Allowance for Spectrum Colour Studio & Electrical Upgrades",
    description: "Client selection budget allowance for custom electrical fittings, feature pendant lighting, and interior finishes ($2,500 intervals).",
    unitType: "fixed",
    unitRate: 2500,
    isClientSelectable: true,
  },

  // ==========================================
  // 9. EXTERNAL FINISHES & LANDSCAPING
  // ==========================================
  {
    id: "ext_epoxy_garage_floor",
    category: "external",
    name: "Epoxy Flake Floor Coating to Garage",
    description: "Heavy-duty industrial 2-part epoxy resin floor coating with decorative vinyl colour flakes and clear non-slip topcoat.",
    unitType: "per_m2",
    unitRate: 67,
    isClientSelectable: true,
  },
  {
    id: "ext_painted_acrylic_render",
    category: "external",
    name: "Dulux Painted Textured Acrylic Render",
    description: "Multi-coat exterior masonry render and tinted Dulux Weathershield paint application.",
    unitType: "per_m2",
    unitRate: 105,
    isClientSelectable: true,
  },
  {
    id: "ext_driveway_exposed_agg_6m",
    category: "external",
    name: "Exposed Aggregate Concrete Driveway (Up to 6m Setback)",
    description: "Steel mesh reinforced exposed aggregate decorative concrete driveway up to 6-meter building setback.",
    unitType: "fixed",
    unitRate: 11400,
    isClientSelectable: true,
  },
  {
    id: "ext_driveway_exposed_agg_sqm",
    category: "external",
    name: "Exposed Aggregate Concrete Paving (Per m²)",
    description: "Reinforced 100mm thick exposed aggregate decorative concrete slab including excavation, sub-base, and sealing.",
    unitType: "per_m2",
    unitRate: 186,
    isClientSelectable: true,
  },
  {
    id: "ext_turf_supply_install",
    category: "external",
    name: "Premium Turf Supply & Installation (Per m²)",
    description: "Soil preparation, topsoil leveling, and supply/laying of premium drought-tolerant turf (e.g. Wintergreen / Sir Walter).",
    unitType: "per_m2",
    unitRate: 56,
    isClientSelectable: true,
  },
];
