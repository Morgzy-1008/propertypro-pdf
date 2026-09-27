/**
 * Official Hudson Homes Detailed Inclusions Master Registry
 * Sourced directly from official Hudson Homes Designer Inclusions Schedules:
 * - NSW: Designer Inclusions Schedule (22/7/2026)
 * - QLD: Designer Inclusions Schedule (7/5/2026)
 * Covers: IP (New) Investment, SS (Smart Start), HBS (Home Builder Standard),
 * H1 Smart (Retail), H2 Designer (Retail), H3 Luxury (Retail), and Happy Upgrades Promotions.
 */

export type InclusionState = "NSW" | "QLD";
export type InclusionTier = "IP (New)" | "SS" | "HBS" | "H1" | "H2" | "H3";

export interface InclusionItem {
  category: string;
  item: string;
  nsw: Record<InclusionTier, string | boolean>;
  qld: Record<InclusionTier, string | boolean>;
  notes?: string;
}

export const HUDSON_DETAILED_INCLUSIONS_MASTER: InclusionItem[] = [
  // 1. CERTIFICATION AND APPROVALS
  {
    category: "Certification and Approvals",
    item: "Contour Survey by registered surveyor",
    nsw: { "IP (New)": true, SS: true, HBS: false, H1: true, H2: true, H3: true },
    qld: { "IP (New)": true, SS: true, HBS: false, H1: true, H2: true, H3: true },
  },
  {
    category: "Certification and Approvals",
    item: "Soil Test - Geo Tech Report",
    nsw: { "IP (New)": true, SS: true, HBS: false, H1: true, H2: true, H3: true },
    qld: { "IP (New)": true, SS: true, HBS: false, H1: true, H2: true, H3: true },
  },
  {
    category: "Certification and Approvals",
    item: "Preparation and lodgement of Development Application (DA), architectural plans & fees",
    nsw: { "IP (New)": true, SS: true, HBS: true, H1: true, H2: true, H3: true },
    qld: { "IP (New)": true, SS: true, HBS: true, H1: true, H2: true, H3: true },
  },
  {
    category: "Certification and Approvals",
    item: "Preparation and lodgement of Construction Certificate (CC), construction drawings & fees",
    nsw: { "IP (New)": true, SS: true, HBS: true, H1: true, H2: true, H3: true },
    qld: { "IP (New)": true, SS: true, HBS: true, H1: true, H2: true, H3: true },
  },
  {
    category: "Certification and Approvals",
    item: "BASIX Energy Assessment Report (NSW) / Energy Efficiency Report (QLD)",
    nsw: { "IP (New)": true, SS: true, HBS: true, H1: true, H2: true, H3: true },
    qld: { "IP (New)": true, SS: true, HBS: true, H1: true, H2: true, H3: true },
  },
  {
    category: "Certification and Approvals",
    item: "Statement of Environmental Effects (NSW only)",
    nsw: { "IP (New)": true, SS: true, HBS: true, H1: true, H2: true, H3: true },
    qld: { "IP (New)": false, SS: false, HBS: false, H1: false, H2: false, H3: false },
    notes: "Mandatory in NSW for DA submissions; not applicable under QLD planning scheme.",
  },
  {
    category: "Certification and Approvals",
    item: "Home Owners Warranty Insurance & Long Service Levy",
    nsw: { "IP (New)": true, SS: true, HBS: false, H1: true, H2: true, H3: true },
    qld: { "IP (New)": true, SS: true, HBS: false, H1: true, H2: true, H3: true },
  },
  {
    category: "Certification and Approvals",
    item: "Water Authority Application Fees (NSW only)",
    nsw: { "IP (New)": true, SS: true, HBS: true, H1: true, H2: true, H3: true },
    qld: { "IP (New)": false, SS: false, HBS: false, H1: false, H2: false, H3: false },
  },
  {
    category: "Certification and Approvals",
    item: "Structural Engineers Certification for foundations and concrete slab",
    nsw: { "IP (New)": true, SS: true, HBS: true, H1: true, H2: true, H3: true },
    qld: { "IP (New)": true, SS: true, HBS: true, H1: true, H2: true, H3: true },
  },
  {
    category: "Certification and Approvals",
    item: "Preparation and lodgement for Occupation Certificate (NSW) / Form 21 (QLD)",
    nsw: { "IP (New)": true, SS: true, HBS: true, H1: true, H2: true, H3: true },
    qld: { "IP (New)": true, SS: true, HBS: true, H1: true, H2: true, H3: true },
  },
  {
    category: "Certification and Approvals",
    item: "12 Month Maintenance & Defects Warranty Period",
    nsw: { "IP (New)": true, SS: true, HBS: true, H1: true, H2: true, H3: true },
    qld: { "IP (New)": true, SS: true, HBS: true, H1: true, H2: true, H3: true },
  },
  {
    category: "Certification and Approvals",
    item: "Structural Guarantee / Warranty",
    nsw: { "IP (New)": "6-year statutory + 50-year Hudson guarantee", SS: "6-year + 50-year", HBS: "6-year statutory", H1: "50-year structural warranty", H2: "50-year structural warranty", H3: "50-year structural warranty" },
    qld: { "IP (New)": "6-year statutory + 50-year Hudson guarantee", SS: "6-year + 50-year", HBS: "6-year statutory", H1: "50-year structural warranty", H2: "50-year structural warranty", H3: "50-year structural warranty" },
  },

  // 2. SITE COSTS: PREPARATION AND SAFETY
  {
    category: "Site Costs & Earthworks",
    item: "Bulk Earthworks for Site Leveling",
    nsw: { "IP (New)": "Up to 1.0m site fall", SS: "Up to 1.0m site fall", HBS: "Up to 300mm", H1: "Up to 1.0m site fall", H2: "Up to 1.0m site fall", H3: "Up to 1.0m site fall" },
    qld: { "IP (New)": "Up to 1.0m site fall", SS: "Up to 1.0m site fall", HBS: "Up to 300mm", H1: "Up to 1.0m site fall", H2: "Up to 1.0m site fall", H3: "Up to 1.0m site fall" },
  },
  {
    category: "Site Costs & Earthworks",
    item: "Sediment Control, Temporary Fencing & Access Crossover",
    nsw: { "IP (New)": true, SS: true, HBS: false, H1: true, H2: true, H3: true },
    qld: { "IP (New)": true, SS: true, HBS: false, H1: true, H2: true, H3: true },
  },
  {
    category: "Site Costs & Earthworks",
    item: "Roof Edge Safety Rail & Scaffolding to WHS Regulations",
    nsw: { "IP (New)": true, SS: true, HBS: true, H1: true, H2: true, H3: true },
    qld: { "IP (New)": true, SS: true, HBS: true, H1: true, H2: true, H3: true },
  },
  {
    category: "Site Costs & Earthworks",
    item: "Service Connections (Sewer, water, power, gas to mains)",
    nsw: { "IP (New)": true, SS: true, HBS: true, H1: true, H2: true, H3: true },
    qld: { "IP (New)": true, SS: true, HBS: true, H1: true, H2: true, H3: true },
  },

  // 3. FOUNDATIONS & TERMITE
  {
    category: "Foundations & Termite",
    item: "Concrete Slab on Ground Engineering Classification",
    nsw: { "IP (New)": "Class M (Alfresco & Porch included)", SS: "Class M (Alfresco & Porch included)", HBS: "Class S (Alfresco & Porch excluded)", H1: "Class M (Alfresco & Porch included)", H2: "Class M (Alfresco & Porch included)", H3: "Class M (Alfresco & Porch included)" },
    qld: { "IP (New)": "Class M (Alfresco included)", SS: "Class M (Alfresco included)", HBS: "Class S (Alfresco excluded)", H1: "Class M (Alfresco included)", H2: "Class M (Alfresco included)", H3: "Class M (Alfresco included)" },
    notes: "Covers moderately reactive soil sites. H-class upgrade available.",
  },
  {
    category: "Foundations & Termite",
    item: "Bored Concrete Piering as required by structural engineer",
    nsw: { "IP (New)": true, SS: true, HBS: false, H1: true, H2: true, H3: true },
    qld: { "IP (New)": false, SS: false, HBS: false, H1: false, H2: false, H3: false },
    notes: "Under the new Queensland price list, NO piering is included as standard site costs. Concrete piering is quoted separately/provisionally based on the geotechnical soil report. In NSW, bored concrete piering is included in fixed site costs.",
  },
  {
    category: "Foundations & Termite",
    item: "Energy Efficiency Additional Allowances (NatHERS 7-Star)",
    nsw: { "IP (New)": "$0 (Included in BASIX fixed site costs)", SS: "$0", HBS: "$0", H1: "$0", H2: "$0", H3: "$0" },
    qld: { "IP (New)": "$0 (No additional allowances required in QLD under new price list)", SS: "$0", HBS: "$0", H1: "$0", H2: "$0", H3: "$0" },
    notes: "Under the new Queensland price list, Hudson Homes NO LONGER requires additional allowances for energy efficiency in QLD; 7-Star thermal efficiency is integrated into standard base pricing.",
  },
  {
    category: "Foundations & Termite",
    item: "Physical Termite Barrier System (Part A slab penetrations & Part B slab perimeter)",
    nsw: { "IP (New)": "Termimesh or Kordon (50-yr warranty)", SS: "Termimesh or Kordon", HBS: "Standard physical barrier", H1: "Termimesh or Kordon", H2: "Termimesh or Kordon", H3: "Termimesh or Kordon" },
    qld: { "IP (New)": "Termimesh or Kordon (50-yr warranty)", SS: "Termimesh or Kordon", HBS: "Standard physical barrier", H1: "Termimesh or Kordon", H2: "Termimesh or Kordon", H3: "Termimesh or Kordon" },
  },

  // 4. FLOOR FINISHES
  {
    category: "Floor Finishes",
    item: "Main Floor Tiles (Entry, hallway, family, kitchen, meals)",
    nsw: { "IP (New)": "Ceramic up to 450x450 (Excl. Bed Hallway)", SS: false, HBS: "Ceramic up to 450x450 (Excl. Bed Hallway)", H1: "Ceramic up to 450x450 (Excl. Bed Hallway)", H2: "Ceramic up to 450x450 (Excl. Bed Hallway)", H3: "Option: 600x600 Gold Range Rectified Edge" },
    qld: { "IP (New)": "Ceramic up to 450x450 (Incl. Bed Hallway)", SS: false, HBS: "Ceramic up to 450x450 (Incl. Bed Hallway)", H1: "Ceramic up to 450x450 (Incl. Bed Hallway)", H2: "Ceramic up to 450x450 (Incl. Bed Hallway)", H3: "Option: 600x600 Gold Range Rectified Edge" },
    notes: "QLD includes bedroom hallways in main floor tiling; NSW excludes bedroom hallways.",
  },
  {
    category: "Floor Finishes",
    item: "Carpet to internal areas & stairs",
    nsw: { "IP (New)": "Bronze Range Carpet", SS: false, HBS: "Bronze Range Carpet", H1: "Bronze Range Carpet", H2: "Bronze Range Carpet", H3: "Gold Range Luxury Carpet" },
    qld: { "IP (New)": "Bronze Range Carpet", SS: false, HBS: "Bronze Range Carpet", H1: "Bronze Range Carpet", H2: "Bronze Range Carpet", H3: "Gold Range Luxury Carpet" },
  },
  {
    category: "Floor Finishes",
    item: "Hybrid Timber / Vinyl Flooring",
    nsw: { "IP (New)": false, SS: false, HBS: false, H1: false, H2: false, H3: "Option: 6mm Stainmaster Pet Protect or 6.5mm NFD Highland (No Scotia)" },
    qld: { "IP (New)": false, SS: false, HBS: false, H1: false, H2: false, H3: "Option: Gold Range Wood Effects Plus Hybrid Timber (No Scotia)" },
  },

  // 5. EXTERNAL FEATURES & BRICKS
  {
    category: "External Features",
    item: "Facade Specification",
    nsw: { "IP (New)": "Classic Facade", SS: "Classic Facade", HBS: "Classic Facade", H1: "Classic Facade", H2: "Classic Facade", H3: "Classic Facade (Designer Upgrades Available)" },
    qld: { "IP (New)": "Classic Facade", SS: "Classic Facade", HBS: "Classic Facade", H1: "Classic Facade", H2: "Classic Facade", H3: "Classic Facade (Designer Upgrades Available)" },
  },
  {
    category: "External Features",
    item: "Garage Door Specification",
    nsw: { "IP (New)": "2100mm Colorbond sectional door (auto opener with 2 hand + 1 wall remote)", SS: "2100mm Colorbond roller door manual", HBS: "2100mm Colorbond roller door manual", H1: "2100mm Colorbond sectional door (auto opener)", H2: "2100mm Colorbond sectional door (auto opener)", H3: "2400mm Colorbond sectional door (auto opener)" },
    qld: { "IP (New)": "2100mm Colorbond sectional door (auto opener with 2 hand + 1 wall remote)", SS: "2100mm Colorbond sectional door manual", HBS: "2100mm Colorbond sectional door manual", H1: "2100mm Colorbond sectional door (auto opener)", H2: "2100mm Colorbond sectional door (auto opener)", H3: "2400mm Colorbond sectional door (auto opener)" },
  },
  {
    category: "External Features",
    item: "Face Brick Selection",
    nsw: { "IP (New)": "Austral Everyday Life (flush, raked, or ironed joints)", SS: "Austral Everyday Life (ironed joints)", HBS: "Austral Everyday Life (ironed joints)", H1: "Austral Everyday Life (flush, raked, or ironed)", H2: "Austral Everyday Life (flush, raked, or ironed)", H3: "Austral Everyday Life (flush, raked, or ironed)" },
    qld: { "IP (New)": "Austral Everyday Life, Wilderness, Coastal (Limestone/Buff), Urban One (Seasalt)", SS: "Austral Everyday Life, Wilderness, Coastal, Urban One", HBS: "Austral Everyday Life, Wilderness, Coastal, Urban One", H1: "Austral Everyday Life, Wilderness, Coastal, Urban One", H2: "Austral Everyday Life, Wilderness, Coastal, Urban One", H3: "Austral Everyday Life, Wilderness, Coastal, Urban One" },
    notes: "Both NSW & QLD include off-white mortar as standard across all tiers.",
  },
  {
    category: "External Features",
    item: "Infill over Garage Door",
    nsw: { "IP (New)": "Painted fibre cement", SS: "Painted fibre cement", HBS: "Painted fibre cement", H1: "Face brick infill", H2: "Face brick infill", H3: "Face brick infill" },
    qld: { "IP (New)": "Painted fibre cement", SS: "Painted fibre cement", HBS: "Painted fibre cement", H1: "Painted fibre cement", H2: "Painted fibre cement", H3: "Face brick infill (Design Specific)" },
  },

  // 6. STRUCTURAL & CEILING HEIGHTS
  {
    category: "Structural Features",
    item: "Framing & Timber Treatment",
    nsw: { "IP (New)": "Radiata Pine prefabricated frames & trusses", SS: "Radiata Pine", HBS: "Radiata Pine", H1: "Radiata Pine", H2: "T2 Treated Radiata Pine prefabricated frames & trusses", H3: "T2 Treated Radiata Pine prefabricated frames & trusses" },
    qld: { "IP (New)": "T2 Treated Radiata Pine prefabricated frames & trusses", SS: "T2 Treated Radiata Pine", HBS: "T2 Treated Radiata Pine", H1: "T2 Treated Radiata Pine", H2: "T2 Treated Radiata Pine", H3: "T2 Treated Radiata Pine" },
    notes: "Queensland has T2 termite-treated frames standard across all tiers; NSW introduces T2 on H2 & H3.",
  },
  {
    category: "Structural Features",
    item: "Single Storey Ceiling Heights",
    nsw: { "IP (New)": "2440mm", SS: "2440mm", HBS: "2440mm", H1: "2440mm", H2: "2590mm", H3: "2740mm (2400mm joinery height)" },
    qld: { "IP (New)": "2440mm", SS: "2440mm", HBS: "2440mm", H1: "2440mm", H2: "2590mm", H3: "2740mm (2400mm joinery height)" },
  },
  {
    category: "Structural Features",
    item: "Two Storey Ceiling Heights",
    nsw: { "IP (New)": "2590mm Ground / 2440mm First Floor", SS: "2590mm Ground / 2440mm First Floor", HBS: "2440mm Ground / 2440mm First Floor", H1: "2590mm Ground / 2440mm First Floor", H2: "2590mm Ground / 2590mm First Floor", H3: "2740mm Ground / 2590mm First Floor" },
    qld: { "IP (New)": "2590mm Ground / 2440mm First Floor", SS: "2590mm Ground / 2440mm First Floor", HBS: "2440mm Ground / 2440mm First Floor", H1: "2590mm Ground / 2440mm First Floor", H2: "2590mm Ground / 2590mm First Floor", H3: "2740mm Ground / 2590mm First Floor" },
  },

  // 7. WINDOWS & SLIDING DOORS
  {
    category: "Windows & Sliding Doors",
    item: "Family Room Sliding Door Type",
    nsw: { "IP (New)": "Standard SF / FSF sliding door", SS: "SF / FSF sliding door", HBS: "SF / FSF sliding door", H1: "SF / FSF sliding door", H2: "SF / FSF sliding door", H3: "Architectural Stacker Door" },
    qld: { "IP (New)": "Standard SF / FSF sliding door", SS: "SF / FSF sliding door", HBS: "SF / FSF sliding door", H1: "SF / FSF sliding door", H2: "SF / FSF sliding door", H3: "Architectural Stacker Door" },
  },
  {
    category: "Windows & Sliding Doors",
    item: "Wet Area Privacy Glazing",
    nsw: { "IP (New)": "Luminamist privacy glass", SS: "Luminamist privacy glass", HBS: "Luminamist privacy glass", H1: "Luminamist privacy glass", H2: "Luminamist privacy glass", H3: "Luminamist privacy glass" },
    qld: { "IP (New)": "Obscure privacy glass", SS: "Obscure privacy glass", HBS: "Obscure privacy glass", H1: "Obscure privacy glass", H2: "Obscure privacy glass", H3: "Obscure privacy glass" },
  },
  {
    category: "Windows & Sliding Doors",
    item: "Flyscreens & Security Screens",
    nsw: { "IP (New)": "Flyscreens to windows + Diamond grill barrier doors (sliding & hinged)", SS: false, HBS: false, H1: "Flyscreens to windows & rear sliding door", H2: "Flyscreens to windows & rear sliding door", H3: "Flyscreens to windows & rear sliding door" },
    qld: { "IP (New)": "Flyscreens to windows + Diamond grill barrier doors (sliding & hinged)", SS: false, HBS: false, H1: "Flyscreens to windows & rear sliding door", H2: "Flyscreens to windows & rear sliding door", H3: "Flyscreens to windows & rear sliding door" },
  },

  // 8. ROOFING
  {
    category: "Roofing",
    item: "Standard Roof Covering Material",
    nsw: { "IP (New)": "Bristile Designer or Classic concrete roof tiles + heavy duty sarking", SS: "Bristile concrete tiles + sarking", HBS: "Bristile concrete tiles + sarking", H1: "Bristile concrete tiles + sarking", H2: "Bristile concrete tiles (Option: Colorbond Custom Orb)", H3: "Bristile concrete tiles (Option: Colorbond Custom Orb)" },
    qld: { "IP (New)": "Colorbond Custom Orb steel roofing + reflective foil insulation", SS: "Colorbond Custom Orb steel roofing", HBS: "Colorbond Custom Orb steel roofing", H1: "Colorbond Custom Orb steel roofing", H2: "Colorbond Custom Orb (Option: Bristile concrete tiles)", H3: "Colorbond Custom Orb (Option: Bristile concrete tiles)" },
    notes: "In NSW, Bristile concrete tiles are standard and Colorbond is an option; In QLD, Colorbond Custom Orb steel roofing is standard and Bristile tiles are an option.",
  },

  // 9. INSULATION & WALL LININGS
  {
    category: "Insulation & Wall Linings",
    item: "Ceiling Insulation Batts",
    nsw: { "IP (New)": "R4.0 glasswool ceiling batts (excl. garage)", SS: "R4.0 batts", HBS: false, H1: "R4.0 batts", H2: "R4.0 batts", H3: "R4.0 batts" },
    qld: { "IP (New)": "R3.5 Bradford Gold lowset / R4.1 upper roof 2-storey", SS: "R3.5 / R4.1 Bradford Gold", HBS: false, H1: "R3.5 / R4.1 Bradford Gold", H2: "R3.5 / R4.1 Bradford Gold", H3: "R3.5 / R4.1 Bradford Gold" },
  },
  {
    category: "Insulation & Wall Linings",
    item: "Wet Area Wall Linings",
    nsw: { "IP (New)": "10mm water-resistant plasterboard to wet areas", SS: "10mm WR plasterboard", HBS: "10mm WR plasterboard", H1: "10mm WR plasterboard", H2: "10mm WR plasterboard", H3: "10mm WR plasterboard" },
    qld: { "IP (New)": "6mm fibre cement wall linings to bathroom & ensuite with shower", SS: "6mm fibre cement", HBS: "6mm fibre cement", H1: "6mm fibre cement", H2: "6mm fibre cement", H3: "6mm fibre cement" },
    notes: "QLD uses 6mm fibre cement in shower rooms; NSW uses 10mm water-resistant plasterboard.",
  },
  {
    category: "Insulation & Wall Linings",
    item: "Cornice & Junctions",
    nsw: { "IP (New)": "90mm cove cornice throughout", SS: "90mm cove throughout", HBS: "90mm cove throughout", H1: "90mm cove (square set to wet areas excl. laundry)", H2: "90mm cove (square set to wet areas)", H3: "90mm cove (square set to wet areas)" },
    qld: { "IP (New)": "90mm cove cornice throughout", SS: "90mm cove throughout", HBS: "90mm cove throughout", H1: "90mm cove (square set to wet areas excl. laundry)", H2: "90mm cove (square set to wet areas)", H3: "90mm cove (square set to wet areas)" },
  },

  // 10. DOORS & TIMBER
  {
    category: "Doors & Timber",
    item: "Front Entry Door Model",
    nsw: { "IP (New)": "2040x820 Hume Newington painted (XN1, XN2, XN5, etc.)", SS: "2040x820 Hume Vaucluse painted (XV1, XV4, etc.)", HBS: "2040x820 Hume Vaucluse painted", H1: "2040x820 Hume Newington painted with glazing", H2: "2040x820 Hume Linear stain grade (XLR150, XLR160, XLR500, XLR600)", H3: "2340x up to 1200mm wide Hume Linear stain grade" },
    qld: { "IP (New)": "2040x820 Hume Newington painted (XN1, XN2, XN5, etc.)", SS: "2040x820 Hume Vaucluse painted (XV1, XV4, etc.)", HBS: "2040x820 Hume Vaucluse painted", H1: "2040x820 Hume Newington painted with glazing", H2: "2040x820 Hume Linear stain grade (XLR150, XLR160, XLR500, XLR600)", H3: "2340x up to 1200mm wide Hume Linear stain grade" },
  },
  {
    category: "Doors & Timber",
    item: "Internal Doors Single Storey",
    nsw: { "IP (New)": "2040mm Hume flush panel painted", SS: "2040mm Hume flush panel", HBS: "2040mm Hume flush panel", H1: "2040mm Hume flush panel", H2: "2040mm Hume Linear painted (HLR230, HLR240, HLR270)", H3: "2340mm Hume Linear painted (HLR230, HLR240, HLR270)" },
    qld: { "IP (New)": "2040mm Hume flush panel painted", SS: "2040mm Hume flush panel", HBS: "2040mm Hume flush panel", H1: "2040mm Hume flush panel", H2: "2040mm Hume Linear painted (HLR230, HLR240, HLR270)", H3: "2340mm Hume Linear painted (HLR230, HLR240, HLR270)" },
  },
  {
    category: "Doors & Timber",
    item: "Robe Drawer Towers (Walk-in & Bedroom Robes)",
    nsw: { "IP (New)": false, SS: false, HBS: false, H1: false, H2: "508mm wide tower bank of 3 drawers + 2 open shelves (1 per room)", H3: "508mm wide tower bank of 4 Titus soft-close drawers (1 per room)" },
    qld: { "IP (New)": false, SS: false, HBS: false, H1: false, H2: "610mm wide tower bank of 3 drawers + 2 open shelves (1 per room)", H3: "610mm wide tower bank of 4 drawers with premium soft closers (1 per room)" },
    notes: "QLD specifies 610mm wide towers; NSW specifies 508mm wide towers.",
  },

  // 11. STAIRCASES
  {
    category: "Staircases",
    item: "Two Storey Staircase Finish",
    nsw: { "IP (New)": "Paint grade carpet closed treads/risers, pine handrail, 12x12mm black balusters", SS: "Paint grade", HBS: "Paint grade", H1: "Paint grade", H2: "Paint grade", H3: "Stain grade Maple or equivalent closed treads, risers, stringers, handrail, 12x12mm black square balusters" },
    qld: { "IP (New)": "Paint grade carpet closed treads/risers, pine handrail, 12x12mm black balusters", SS: "Paint grade", HBS: "Paint grade", H1: "Paint grade", H2: "Paint grade", H3: "Stain grade Tasmanian Oak (clear) or Victoria Ash (Dulux stain) closed treads, risers, stringers, handrail, 12x12mm black balusters" },
  },

  // 12. PAINTING
  {
    category: "Painting",
    item: "Interior Wall Painting System",
    nsw: { "IP (New)": "Dulux 2-coat paint system", SS: "Dulux 2-coat", HBS: "Dulux 2-coat", H1: "Dulux 2-coat paint system", H2: "Dulux 3-coat paint system", H3: "Dulux 3-coat paint system" },
    qld: { "IP (New)": "Dulux 2-coat paint system", SS: "Dulux 2-coat", HBS: "Dulux 2-coat", H1: "Dulux 2-coat paint system", H2: "Dulux 3-coat paint system", H3: "Dulux 3-coat paint system" },
    notes: "Dulux full gloss paint to all timber work standard across all tiers.",
  },

  // 13. ELECTRICAL & LIGHTING
  {
    category: "Electrical & Lighting",
    item: "Underground Power Mains",
    nsw: { "IP (New)": "Three Phase Underground Power", SS: "Three Phase Underground Power", HBS: "Three Phase Underground Power", H1: "Three Phase Underground Power", H2: "Three Phase Underground Power", H3: "Three Phase Underground Power" },
    qld: { "IP (New)": "Single Phase Underground Power", SS: "Single Phase Underground Power", HBS: "Single Phase Underground Power", H1: "Single Phase Underground Power", H2: "Single Phase Underground Power", H3: "Three Phase Underground Power (Duplex: Two Phase)" },
    notes: "NSW includes 3-phase underground power standard across all tiers; QLD is single-phase up to H2, and 3-phase on H3.",
  },
  {
    category: "Electrical & Lighting",
    item: "Lighting Specification",
    nsw: { "IP (New)": "LED Downlights throughout dwelling (excluding garage)", SS: "Fixed batten with globe", HBS: "Fixed batten with globe", H1: "30cm Oyster Mercator MA2418 throughout & alfresco", H2: "HPM LDL90TRIWE Tri-colour LED Downlights (1 per 2 squares) + 40cm Gem LED Oysters to balance", H3: "HPM LDL90TRIWE Tri-colour LED Downlights (1 per 1 square) + 40cm Gem LED Oysters + 2 Facade Up/Down lights" },
    qld: { "IP (New)": "LED Downlights throughout dwelling (excluding garage)", SS: "Fixed batten with globe", HBS: "Fixed batten with globe", H1: "40cm Gem LED Oyster Tri-colour (Sunny Lighting SO3701/40L/TC)", H2: "HPM LDL90TRIWE Tri-colour LED Downlights (1 per 2 squares) + modern oysters to balance", H3: "HPM LDL90TRIWE Tri-colour LED Downlights (1 per 1 square) + modern oysters to balance + 2 Facade Up/Down lights" },
  },
  {
    category: "Electrical & Lighting",
    item: "Ceiling Fans & Heaters",
    nsw: { "IP (New)": "1200mm 4-blade metal fan to alfresco + HPM 2-bulb heater/fan/light to bath & ensuite", SS: "HPM 2-bulb heater/fan/light", HBS: false, H1: "HPM 2-bulb heater/fan/light to bath & ensuite", H2: "HPM 2-bulb heater/fan/light to bath & ensuite", H3: "HPM 2-bulb heater/fan/light to bath & ensuite" },
    qld: { "IP (New)": "1400mm 4-blade plastic fan/lights to alfresco, bedrooms & living + HPM 2-bulb heater/fan/light", SS: "1400mm fan/lights", HBS: false, H1: "1400mm 4-blade fan/lights to alfresco, bedrooms & living + HPM 2-bulb heater/fan/light", H2: "1400mm fan/lights + HPM 2-bulb heater/fan/light", H3: "1400mm fan/lights + HPM 2-bulb heater/fan/light" },
  },

  // 14. AIR CONDITIONING & SOLAR
  {
    category: "Air Conditioning & Solar",
    item: "Standard Air Conditioning System",
    nsw: { "IP (New)": "Ducted Reverse Cycle AC", SS: false, HBS: false, H1: "7.0kW Reverse Cycle Split System to Family", H2: "Day & Night Ducted AC (2 Zones: Living & Bedrooms, cools 1 zone at a time)", H3: "Fully Zoned Ducted Air-Conditioning with MyAir (MyAir5) Touch Screen Controller" },
    qld: { "IP (New)": "Ducted Reverse Cycle AC", SS: false, HBS: false, H1: "6.0kW Reverse Cycle Split System to Family", H2: "Day & Night Ducted AC (2 Zones: Living & Bedrooms, cools 1 zone at a time)", H3: "Fully Zoned Ducted Air-Conditioning with MyAir (MyAir5) Touch Screen Controller" },
    notes: "Dual living: Unit A Ducted; Unit B (<=2 Bed) Split; Unit B (>=3 Bed) Ducted; Mirrored Duplex: Ducted to both units.",
  },
  {
    category: "Air Conditioning & Solar",
    item: "Solar PV Power System",
    nsw: { "IP (New)": false, SS: false, HBS: false, H1: false, H2: false, H3: "1.5kW PV Solar System (Single Phase)" },
    qld: { "IP (New)": false, SS: false, HBS: false, H1: false, H2: false, H3: "1.5kW PV Solar System (Single Phase)" },
  },

  // 15. HOT WATER & PLUMBING
  {
    category: "Hot Water & Plumbing",
    item: "Hot Water System",
    nsw: { "IP (New)": "Rinnai 26L Gas Continuous Flow (preset to 50°C)", SS: "Rinnai 26L Gas", HBS: "Rinnai 26L Gas", H1: "Rinnai 26L Gas Continuous Flow", H2: "Rinnai 26L Gas Continuous Flow", H3: "Rinnai 26L Gas Continuous Flow" },
    qld: { "IP (New)": "Wulfe Heat Pump M9 (200L up to 2 bath / 330L up to 3 bath)", SS: "Wulfe Heat Pump M9", HBS: "Wulfe Heat Pump M9", H1: "Wulfe Heat Pump M9 (200L/330L)", H2: "Wulfe Heat Pump M9 (200L/330L)", H3: "Wulfe Heat Pump M9 (200L/330L)" },
    notes: "NSW utilizes Rinnai continuous gas hot water; QLD utilizes energy-efficient Wulfe Heat Pumps.",
  },
  {
    category: "Hot Water & Plumbing",
    item: "Water Tank / Recycled Water",
    nsw: { "IP (New)": "3000L Colorbond Stainless Steel tank with submersible pump or recycled water", SS: "3000L tank / recycled", HBS: "3000L tank / recycled", H1: "3000L tank / recycled", H2: "3000L tank / recycled", H3: "3000L tank / recycled" },
    qld: { "IP (New)": "To suit local authority / site approval", SS: "Per approval", HBS: "Per approval", H1: "Per approval", H2: "Per approval", H3: "Per approval" },
  },

  // 16. KITCHEN CABINETRY & BENCHTOPS
  {
    category: "Kitchen Specifications",
    item: "Kitchen Benchtops",
    nsw: { "IP (New)": "20mm Engineered Stone", SS: "Laminate single colour", HBS: "Laminate single colour", H1: "Laminate coloured benchtop (square edge)", H2: "20mm Engineered Stone (dual colour cabinets up to 2 colours)", H3: "40mm Engineered Stone with Mitred Edge (dual colour cabinets)" },
    qld: { "IP (New)": "20mm Engineered Stone", SS: "Laminate single colour", HBS: "Laminate single colour", H1: "Laminate coloured benchtop (square edge)", H2: "20mm Engineered Stone (dual colour cabinets up to 2 colours)", H3: "40mm Engineered Stone with Mitred Edge (dual colour cabinets)" },
    notes: "Fisher & Paykel cooktops require floor cabinetry to be widened to 650mm.",
  },
  {
    category: "Kitchen Specifications",
    item: "Kitchen Sinks",
    nsw: { "IP (New)": "Oliveri 1080mm 1 & 3/4 Double Bowl (PS112 / PS111)", SS: "Oliveri 1080mm Double Bowl", HBS: "Oliveri 1080mm Double Bowl", H1: "Stylus Radiant 1100mm 1 & 3/4 Bowl SS Sink (R150.1R-W / R150.1L-W)", H2: "Clark Polar Overmount Drop-In Double Sink (PPL20B.1)", H3: "Clark Polar Double Bowl Undermount Sink (PPL20BU)" },
    qld: { "IP (New)": "Base MK3 Double Bowl 1 & 3/4 (9502731/2)", SS: "Base MK3 Double Bowl", HBS: "Base MK3 Double Bowl", H1: "Stylus Radiant 1100mm 1 & 3/4 Bowl SS Sink (R150.1R-W / R150.1L-W)", H2: "Clark Polar Overmount Drop-In Double Sink (PPL20B.1)", H3: "Clark Polar Double Bowl Undermount Sink (PPL20BU)" },
  },
  {
    category: "Kitchen Specifications",
    item: "Cabinetry Features & Pot Drawers",
    nsw: { "IP (New)": "Bank of 4 drawers + cutlery tray", SS: "Bank of 4 drawers", HBS: "Bank of 4 drawers", H1: "Bank of 4 drawers + cutlery tray", H2: "Soft-close to all kitchen drawers & cabinets", H3: "Soft-close + 1 Bank of 3 Pot Drawers beside oven" },
    qld: { "IP (New)": "Bank of 4 drawers + cutlery tray", SS: "Bank of 4 drawers", HBS: "Bank of 4 drawers", H1: "Bank of 4 drawers + cutlery tray", H2: "Soft-close to all kitchen drawers & cabinets", H3: "Soft-close + 1 Bank of 3 Pot Drawers beside oven" },
  },

  // 17. KITCHEN APPLIANCES
  {
    category: "Kitchen Appliances",
    item: "Ovens",
    nsw: { "IP (New)": "Haier 600mm Black Electric Oven (HWO60S4LMB3)", SS: "Haier 600mm Black (HWO60S4LMB3)", HBS: "Haier 600mm Black (HWO60S4LMB3)", H1: "Haier 600mm Stainless Steel Electric Oven (HWO60S7MX6)", H2: "Fisher & Paykel 900mm SS Electric Oven (OB90S9LEX2) or Dual Fuel Freestanding Cooker (OR90SCG1X1)", H3: "Fisher & Paykel 900mm SS Electric Oven (OB90S9MEX4) or Dual Fuel Black Freestanding Cooker (OR90SCG4B1)" },
    qld: { "IP (New)": "Haier 600mm Black Electric Oven (HWO60S4LMB3)", SS: "Haier 600mm Black (HWO60S4LMB3)", HBS: "Haier 600mm Black (HWO60S4LMB3)", H1: "Haier 600mm Stainless Steel Electric Oven (HWO60S7MX6)", H2: "Fisher & Paykel 900mm SS Electric Oven (OB90S9LEX2) or Dual Fuel Freestanding Cooker (OR90SCG1X1)", H3: "Fisher & Paykel 900mm SS Electric Oven (OB90S9MEX4) or Dual Fuel Black Freestanding Cooker (OR90SCG4B1)" },
    notes: "In Dual Living designs where 900mm cannot fit, Fisher & Paykel 600mm black/SS oven (OB60SC5LB1) is utilized in H2 & H3.",
  },
  {
    category: "Kitchen Appliances",
    item: "Cooktops",
    nsw: { "IP (New)": "Haier 600mm SS Gas (HCG604WFCX3)", SS: "Haier 600mm SS Gas", HBS: "Haier 600mm SS Gas", H1: "Haier 600mm Black Glass Electric (HCE604TB3) or SS Gas (HCG604WFCX3)", H2: "Fisher & Paykel 900mm SS Gas (CG905CNGX2) or Black Glass Electric (CE905CBX2)", H3: "Fisher & Paykel 900mm SS Gas (CG905CNGX2) or Black Glass Induction (CI905CTB2)" },
    qld: { "IP (New)": "Haier 600mm Black Glass Electric (HCE604TB3)", SS: "Haier 600mm Electric", HBS: "Haier 600mm Electric", H1: "Haier 600mm Black Glass Electric (HCE604TB3)", H2: "Fisher & Paykel 900mm SS Gas (CG905CNGX2) or Black Glass Electric (CE905CBX2)", H3: "Fisher & Paykel 900mm SS Gas (CG905CNGX2) or Black Glass Induction (CI905CTB2)" },
    notes: "H3 includes Fisher & Paykel 900mm Induction cooktop (CI905CTB2) as a standard electric option.",
  },
  {
    category: "Kitchen Appliances",
    item: "Rangehoods",
    nsw: { "IP (New)": "Haier 600mm SS Slideout (HSH60RSX1)", SS: "Haier 600mm Slideout", HBS: "Haier 600mm Slideout", H1: "Haier 600mm SS Slideout (HSH60RSX1)", H2: "Fisher & Paykel 900mm Integrated Insert (HP90ICSX4) or Canopy (HC90PLX4) ducted to outside", H3: "Fisher & Paykel 900mm Integrated Insert (HP90ICSX4) or Canopy (HC90PLX4) ducted to outside" },
    qld: { "IP (New)": "Haier 600mm SS Slideout (HSH60RSX1)", SS: "Haier 600mm Slideout", HBS: "Haier 600mm Slideout", H1: "Haier 600mm SS Slideout (HSH60RSX1)", H2: "Fisher & Paykel 900mm Integrated Insert (HP90ICSX4) or Canopy (HC90PLX4) ducted to outside", H3: "Fisher & Paykel 900mm Integrated Insert (HP90ICSX4) or Canopy (HC90PLX4) ducted to outside" },
  },
  {
    category: "Kitchen Appliances",
    item: "Dishwashers",
    nsw: { "IP (New)": "Haier Stainless Steel Dishwasher (HDW13F0PS1)", SS: false, HBS: false, H1: "Haier Stainless Steel Dishwasher (HDW13F0PS1)", H2: "Fisher & Paykel SS Dishwasher (DW60FC1X2)", H3: "Fisher & Paykel Premium SS Dishwasher (DW60FC4X2)" },
    qld: { "IP (New)": "Haier Stainless Steel Dishwasher (HDW13F0PS1)", SS: false, HBS: false, H1: "Haier Stainless Steel Dishwasher (HDW13F0PS1)", H2: "Fisher & Paykel SS Dishwasher (DW60FC1X2)", H3: "Fisher & Paykel Premium SS Dishwasher (DW60FC4X2)" },
  },
  {
    category: "Kitchen Appliances",
    item: "Microwaves",
    nsw: { "IP (New)": false, SS: false, HBS: false, H1: false, H2: "Fisher & Paykel SS Microwave with Trim Kit (OM25BLSX1)", H3: "Fisher & Paykel Black Microwave with Trim Kit (OM25BLSB1)" },
    qld: { "IP (New)": false, SS: false, HBS: false, H1: false, H2: "Fisher & Paykel SS Microwave with Trim Kit (OM25BLSX1)", H3: "Fisher & Paykel Black Microwave with Trim Kit (OM25BLSB1)" },
  },

  // 18. LAUNDRY
  {
    category: "Laundry",
    item: "Laundry Tub & Cabinet",
    nsw: { "IP (New)": "Clark 42L tub with white metal cabinet (F6001)", SS: "Clark 42L", HBS: "Clark 42L", H1: "Clark 42L tub with white metal cabinet (F6001)", H2: "Contemporary 1200mm built-in cabinet, Clark Radiant 45L drop-in tub, 33mm laminated benchtop", H3: "Contemporary 1200mm built-in cabinet, Clark Radiant 45L drop-in tub, 20mm Stone benchtop, overhead cupboards & bulkhead" },
    qld: { "IP (New)": "Base laundry trough & cabinet (9504719)", SS: "Base laundry trough", HBS: "Base laundry trough", H1: "Base laundry trough & cabinet (9504719)", H2: "Contemporary 1200mm built-in cabinet, Clark Radiant 45L drop-in tub, 20mm Stone benchtop", H3: "Contemporary 1200mm built-in cabinet, Clark Radiant 45L drop-in tub, 20mm Stone benchtop, overhead cupboards & bulkhead" },
  },

  // 19. BATHROOM, ENSUITE & TOILETS
  {
    category: "Bathroom, Ensuite & WC",
    item: "Vanity Benchtops",
    nsw: { "IP (New)": "Floating vanity with 20mm Engineered Stone", SS: "Floating vanity laminate", HBS: "Floating vanity laminate", H1: "Floating vanity laminate", H2: "Floating vanity with 20mm Engineered Stone", H3: "Floating vanity with 40mm Engineered Stone (Mitred Edge)" },
    qld: { "IP (New)": "Floating vanity with 20mm Engineered Stone", SS: "Floating vanity laminate", HBS: "Floating vanity laminate", H1: "Floating vanity laminate", H2: "Floating vanity with 20mm Engineered Stone", H3: "Floating vanity with 40mm Engineered Stone (Mitred Edge)" },
  },
  {
    category: "Bathroom, Ensuite & WC",
    item: "Basins",
    nsw: { "IP (New)": "Stylus Venecia semi-recessed (W40101CW) or inset (W40001CW)", SS: "Stylus Venecia", HBS: "Stylus Venecia", H1: "Stylus Venecia semi-recessed or inset", H2: "Caroma Luna semi-recessed (873615W) or inset (899215W)", H3: "Caroma Urbane II semi-recessed (878910W) or inset (878310W)" },
    qld: { "IP (New)": "Stylus Venecia semi-recessed (W40101CW) or inset (W40001CW)", SS: "Stylus Venecia", HBS: "Stylus Venecia", H1: "Stylus Venecia semi-recessed or inset", H2: "Caroma Luna semi-recessed (873615W) or inset (899215W)", H3: "Caroma Urbane II semi-recessed (878910W) or inset (878310W)" },
  },
  {
    category: "Bathroom, Ensuite & WC",
    item: "Bathtubs",
    nsw: { "IP (New)": "Decina Prezzo 1650mm rectangular bath", SS: "Decina Prezzo 1650mm", HBS: "Decina Prezzo 1650mm", H1: "Stylus Basis 1675mm acrylic white bath (BB7W-W)", H2: "Caroma Urbane II 1775mm freestanding bath (AU8W) or 1580mm (AU6W) to 1st bath", H3: "Caroma Urbane II 1775mm freestanding bath (AU8W) or 1580mm (AU6W) to 1st bath" },
    qld: { "IP (New)": "Base Acrylic 1650mm rectangular bath", SS: "Base Acrylic 1650mm", HBS: "Base Acrylic 1650mm", H1: "Stylus Basis 1675mm acrylic white bath (BB7W-W)", H2: "Caroma Urbane II 1775mm freestanding bath (AU8W) or 1580mm (AU6W) to 1st bath", H3: "Caroma Urbane II 1775mm freestanding bath (AU8W) or 1580mm (AU6W) to 1st bath" },
  },
  {
    category: "Bathroom, Ensuite & WC",
    item: "Toilet Suites",
    nsw: { "IP (New)": "Everhard Virtue close coupled bottom inlet", SS: "Everhard Virtue", HBS: "Everhard Virtue", H1: "Stylus Venecia close coupled bottom inlet (W45004SSC)", H2: "Caroma Luna CleanFlush wall-faced back inlet (844820W)", H3: "Caroma Luna CleanFlush wall-faced back inlet (844820W) (Option: Urbane II in-wall cistern)" },
    qld: { "IP (New)": "Posh Solus close coupled soft-close (9502264)", SS: "Posh Solus", HBS: "Posh Solus", H1: "Stylus Venecia close coupled bottom inlet (W45004SSC)", H2: "Caroma Luna CleanFlush wall-faced back inlet (844820W)", H3: "Caroma Luna CleanFlush wall-faced back inlet (844820W) (Option: Urbane II in-wall cistern)" },
  },
  {
    category: "Bathroom, Ensuite & WC",
    item: "Shower Screens",
    nsw: { "IP (New)": "White aluminium framed pivot door (1975mm)", SS: "White framed", HBS: "White framed", H1: "Silver aluminium framed pivot screen (1975mm)", H2: "Silver aluminium semi-frameless pivot screen (NSW Carpris 1975mm)", H3: "10mm Frameless glass shower screens with pivot doors (NSW Ultimate 2000mm)" },
    qld: { "IP (New)": "Silver semi-frameless pivot screen (Core S3 2000mm)", SS: "Silver semi-frameless (2000mm)", HBS: "Silver semi-frameless (2000mm)", H1: "Silver semi-frameless pivot screen (Core S3 2000mm)", H2: "Silver semi-frameless pivot screen (Sleek S3 2000mm)", H3: "10mm Frameless glass shower screens with pivot doors (up to 2100mm)" },
  },
  {
    category: "Bathroom, Ensuite & WC",
    item: "Tiled Shower Niche",
    nsw: { "IP (New)": false, SS: false, HBS: false, H1: false, H2: "600x400mm Tiled Shower Niche to wet areas with showers", H3: "600x400mm Tiled Shower Niche to wet areas with showers" },
    qld: { "IP (New)": false, SS: false, HBS: false, H1: false, H2: "600x400mm Tiled Shower Niche to wet areas with showers", H3: "600x400mm Tiled Shower Niche to wet areas with showers" },
  },

  // 20. TAPWARE
  {
    category: "Tapware",
    item: "Kitchen Sink Mixer",
    nsw: { "IP (New)": "Phoenix Ivy MKII Sink Mixer Chrome (154730000)", SS: "Phoenix Ivy MKII", HBS: "Phoenix Ivy MKII", H1: "Stylus Venecia Sink Mixer Chrome (631001C4AF)", H2: "Caroma Liano II Sink Mixer Chrome (96379C56AF)", H3: "Caroma Liano II Pull-Out Sink Mixer Chrome (96380C56AF)" },
    qld: { "IP (New)": "Phoenix Ivy MKII Sink Mixer Chrome (154730000)", SS: "Phoenix Ivy MKII", HBS: "Phoenix Ivy MKII", H1: "Stylus Venecia Sink Mixer Chrome (631001C4AF)", H2: "Caroma Liano II Sink Mixer Chrome (96379C56AF)", H3: "Caroma Liano II Pull-Out Sink Mixer Chrome (96380C56AF)" },
  },
  {
    category: "Tapware",
    item: "Bathroom, Ensuite & Basin Tapware",
    nsw: { "IP (New)": "Phoenix Ivy Slimline basin & shower mixers + Vivid hand shower on rail", SS: "Phoenix Ivy", HBS: "Phoenix Ivy", H1: "Stylus Venecia basin mixers (631000CSA), wall mixers (631002C), Elegance spout (631176C), Caroma Tasman II rail shower (992545C3A)", H2: "Caroma Luna basin mixer (68181C6AF), wall mixer (68184C), wall bath mixer w/ 210mm spout (68186C6AF), Luna multi-function rail shower (90384C4F)", H3: "Caroma Urbane II basin mixer (98608C6AF), wall mixer (99648C), 220mm wall bath mixer (99641C6AF), Urbane II rail shower with 300mm overhead (99630C3A)" },
    qld: { "IP (New)": "Ivy MK2 basin mixer, shower/bath wall mixer, Posh Bristol rail shower, Posh Solus 210mm fixed spout", SS: "Ivy MK2 & Posh Bristol", HBS: "Ivy MK2 & Posh Bristol", H1: "Stylus Venecia basin mixers (631000CSA), wall mixers (631002C), Elegance spout (631176C), Caroma Tasman II rail shower (992545C3A)", H2: "Caroma Luna basin mixer (68181C6AF), wall mixer (68184C), wall bath mixer w/ 210mm spout (68186C6AF), Luna multi-function rail shower (90384C4F)", H3: "Caroma Urbane II basin mixer (98608C6AF), wall mixer (99648C), 220mm wall bath mixer (99641C6AF), Urbane II rail shower with 300mm overhead (99630C3A)" },
  },

  // 21. CERAMIC TILING & WALL HEIGHTS
  {
    category: "Ceramic Tiling",
    item: "Wall Tiling Height in Bathroom & Ensuite",
    nsw: { "IP (New)": "2100mm to showers, 500mm bath hob, 200mm vanity splashback", SS: "2100mm shower", HBS: "2100mm shower", H1: "2100mm to showers, 500mm bath hob & riser, 400mm bath splashback, 200mm vanity splashback", H2: "2100mm to showers, 500mm bath hob & riser, 400mm bath splashback, 200mm vanity splashback + Smart Tile waste", H3: "FULL HEIGHT TILING to bathroom & ensuite / wet areas with showers + Smart Tile waste + tiled window reveal with metal angle" },
    qld: { "IP (New)": "2100mm to showers, 500mm bath hob, 200mm vanity splashback", SS: "2100mm shower", HBS: "2100mm shower", H1: "2100mm to showers, 500mm bath hob & riser, 400mm bath splashback, 200mm vanity splashback", H2: "2100mm to showers, 500mm bath hob & riser, 400mm bath splashback, 200mm vanity splashback + Smart Tile waste", H3: "FULL HEIGHT TILING to bathroom & ensuite / wet areas with showers + Smart Tile waste + tiled window reveal with metal angle" },
  },

  // 22. TURNKEY EXTERNAL WORKS (IP New Only)
  {
    category: "Turnkey External Works (IP New)",
    item: "Concrete Driveway & Crossover",
    nsw: { "IP (New)": "100mm Colour through concrete driveway & path + 150mm plain concrete crossover", SS: false, HBS: false, H1: false, H2: false, H3: false },
    qld: { "IP (New)": "100mm Exposed concrete driveway & path, 100mm exposed porch, 120mm exposed crossover", SS: false, HBS: false, H1: false, H2: false, H3: false },
  },
  {
    category: "Turnkey External Works (IP New)",
    item: "Fencing & Turf",
    nsw: { "IP (New)": "1800mm treated pine lapped & capped timber fencing + gate; Kikuyu turf to block & crossover", SS: false, HBS: false, H1: false, H2: false, H3: false },
    qld: { "IP (New)": "1800mm treated pine lapped & capped timber fencing + gate; Wintergreen couch turf to block & crossover", SS: false, HBS: false, H1: false, H2: false, H3: false },
  },
  {
    category: "Turnkey External Works (IP New)",
    item: "Clothesline & Letterbox",
    nsw: { "IP (New)": "Austral FSTD standard wall mounted folding clothesline + Sandleford Ripple letterbox & post", SS: false, HBS: false, H1: false, H2: false, H3: false },
    qld: { "IP (New)": "Austral FSTD standard wall mounted folding clothesline + Tradeline LBBU34 letterbox", SS: false, HBS: false, H1: false, H2: false, H3: false },
  },
];

// PROMOTIONAL UPGRADES: HAPPY UPGRADES - "YOUR WAY" (OFFICIALLY CULLED / INACTIVE)
export const HUDSON_HAPPY_UPGRADES_PROMOS = {
  status: "CULLED",
  culledNotice: "The 'Happy Upgrades - Your Way' promotion has officially been culled / discontinued. All standard quotes and sales estimates must be calculated from official price lists.",
  option1_h1_smart: {
    title: "Option One (1) - H1 Smart Inclusions (CULLED)",
    description: "Choose Ducted Air Conditioning PLUS Five (5) Additional Upgrades",
    baseUpgrade: {
      item: "Day & Night Ducted Air Conditioning (1 Only)",
      brands: { nsw: "Rinnai Brand (NSW)", qld: "Daikin Brand (QLD)" },
      note: "Consists of Day Zone (Living) and Night Zone (Bedrooms). Single-phase unit standard; 3-phase surcharge applies if required.",
    },
    selectableUpgradesCount: 5,
    selectableUpgrades: [
      "2590mm Ceilings (Single-storey designs or upper floor of two-storey designs)",
      "20mm Stone Benchtops to Kitchen (AC Stone STD range in NSW / Quantum Zero Stone Builders range in QLD)",
      "LED Downlights (1 per 2m² - White Only)",
      "Freestanding Bath (Caroma Urbane II 1580mm AU6W or 1775mm AU8W with chrome plug & waste)",
      "Stone Benchtops to Bathroom & Ensuite (AC Stone STD in NSW / Quantum Zero Builders in QLD)",
      "900mm Appliances Suite (Fisher & Paykel 900mm electric oven OB90S9LEX2, 900mm gas/electric cooktop, integrated rangehood HP90ICSX4)",
      "1200mm Laminated Laundry Cabinet with drop-in tub (Polytec STD range colours)",
    ],
  },
  option2_h2_designer: {
    title: "Option Two (2) - H2 Designer Inclusions",
    description: "Choose Any Four (4) Upgrades",
    selectableUpgradesCount: 4,
    selectableUpgrades: [
      "Stain Grade Timber Staircase (Upgraded to Stain Grade treads, risers, and balustrade with stained timber rails/posts and STD metal balusters)",
      "1200mm Wide Entry Door - Stain Grade (2040x1200mm Hume Linear range: XLR150, XLR160, XLR500, XLR600)",
      "Full Zoned Ducted A/C in lieu of Day/Night (Rinnai in NSW / Daikin in QLD)",
      "2740mm Ceilings to Ground Floor of Two-Storey designs",
      "Complete Home Filtration Water System (CHF 6000 15\")",
      "Tapware Upgrade to Matte Black or Brushed Brass (Caroma Liano II sink mixer + Luna basin, shower & bath wall mixers)",
      "Full Height Tiling to Bath & Ensuite (Up to 2590mm high for two wet areas with showers)",
      "Main Floor 600x600 Internal Floor Tiles (Selected from Hudson Homes Gold Range for common areas)",
    ],
  },
  option3_h3_luxury: {
    title: "Option Three (3) - H3 Luxury Inclusions",
    description: "Choose Any Three (3) Upgrades",
    selectableUpgradesCount: 3,
    selectableUpgrades: [
      "Concrete Driveway up to 6m setback (Coloured through in NSW / Exposed aggregate in QLD)",
      "6.5kW Solar PV Power System in lieu of 1.5kW",
      "$10,000 Spectrum Studio Design Allowance",
      "Outdoor Kitchenette up to 3m Long (Polytec cabinets up to 650mm wide, double skin brickwork up to 1200mm high, 20mm stone benchtop, Clark Polar single bowl undermount sink PPL10BU, Stylus Venecia mixer, and Beefeater 4-burner BBQ BBG1640SA)",
      "10mm Rebated Glass Balustrade to Staircase (Two-storey design specific)",
      "$10,000 Winnings Electrical Appliance Allowance",
    ],
  },
};

/**
 * High-performance search and comparison helpers
 */
export function lookupInclusionItem(searchTerm: string, state: InclusionState = "QLD"): InclusionItem[] {
  const term = searchTerm.toLowerCase().trim();
  return HUDSON_DETAILED_INCLUSIONS_MASTER.filter(
    (row) =>
      row.item.toLowerCase().includes(term) ||
      row.category.toLowerCase().includes(term) ||
      (row.notes && row.notes.toLowerCase().includes(term))
  );
}

export function compareStateInclusions(searchTerm: string): Array<{
  category: string;
  item: string;
  nswSummary: string;
  qldSummary: string;
  notes?: string;
}> {
  const matches = lookupInclusionItem(searchTerm);
  return matches.map((m) => ({
    category: m.category,
    item: m.item,
    nswSummary: formatTierSummary(m.nsw),
    qldSummary: formatTierSummary(m.qld),
    notes: m.notes,
  }));
}

function formatTierSummary(tiers: Record<InclusionTier, string | boolean>): string {
  const parts: string[] = [];
  (["H1", "H2", "H3", "IP (New)", "SS", "HBS"] as InclusionTier[]).forEach((t) => {
    const val = tiers[t];
    if (val === true) parts.push(`${t}: Included`);
    else if (val === false) parts.push(`${t}: Excluded`);
    else if (typeof val === "string") parts.push(`${t}: ${val}`);
  });
  return parts.join(" | ");
}
