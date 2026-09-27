/**
 * Hudson Homes Retail - QLD Options Price List (2026)
 * Issued: 13/06/2026
 * Covers Single Storey, Two Storey, Dual Living, and Split Level designs
 * with exact pricing across H1 Spec (Smart), H2 Spec (Designer), and H3 Spec (Luxury).
 */

export interface HudsonPlanOption {
  design: string;
  category: "single_storey" | "two_storey" | "dual_living" | "split_level";
  option: string;
  h1Price: number | null; // null for TBA
  h2Price: number | null;
  h3Price: number | null;
  notes?: string;
}

export const HUDSON_OPTIONS_PRICE_LIST_2026: HudsonPlanOption[] = [
  // ==========================================
  // SINGLE STOREY DESIGNS
  // ==========================================
  { design: "Auburn 22", category: "single_storey", option: "Living Room to Front", h1Price: 0, h2Price: 0, h3Price: 0 },
  { design: "Azure 19", category: "single_storey", option: "Bed 4", h1Price: 2900, h2Price: 3300, h3Price: 3300 },
  { design: "Azure 25", category: "single_storey", option: "Bed 5", h1Price: 2900, h2Price: 3300, h3Price: 3300 },
  { design: "Cedar 26", category: "single_storey", option: "Living / Media - (With Skylight)", h1Price: null, h2Price: null, h3Price: null, notes: "TBA" },
  { design: "Cedar 28", category: "single_storey", option: "Living / Media - (With Skylight)", h1Price: null, h2Price: null, h3Price: null, notes: "TBA" },
  { design: "Cedar 31", category: "single_storey", option: "Living / Media - (With Skylight)", h1Price: null, h2Price: null, h3Price: null, notes: "TBA" },
  { design: "Cedar 34", category: "single_storey", option: "Living / Media - (With Skylight)", h1Price: null, h2Price: null, h3Price: null, notes: "TBA" },
  { design: "Indigo 19", category: "single_storey", option: "Bed 4", h1Price: 1500, h2Price: 1800, h3Price: 1900 },
  { design: "Iris 18", category: "single_storey", option: "Living Room to Front", h1Price: 1900, h2Price: 1900, h3Price: 1900 },
  { design: "Iris 18", category: "single_storey", option: "Bed 4", h1Price: 2400, h2Price: 2700, h3Price: 2800 },
  { design: "Iris 21", category: "single_storey", option: "Living Room to Front", h1Price: 0, h2Price: 0, h3Price: 0 },
  { design: "Iris 21", category: "single_storey", option: "Bed 4", h1Price: 2300, h2Price: 2500, h3Price: 2500 },
  { design: "Ivory 23", category: "single_storey", option: "Study Nook & Linen", h1Price: 3100, h2Price: 3700, h3Price: 3900 },
  { design: "Ivory 27", category: "single_storey", option: "Living / Media - (With Skylight)", h1Price: null, h2Price: null, h3Price: null, notes: "TBA" },
  { design: "Jade 23", category: "single_storey", option: "Living / Media Room to Front", h1Price: 0, h2Price: 0, h3Price: 0 },
  { design: "Jasper 26", category: "single_storey", option: "Rename - Childrens / Activity Room - (With Skylight & Study nook)", h1Price: 2750, h2Price: 2750, h3Price: 2750 },
  { design: "Kobi 16", category: "single_storey", option: "Separate WC", h1Price: 2700, h2Price: 2700, h3Price: 1900 },
  { design: "Kobi 19", category: "single_storey", option: "Bed 4", h1Price: 1200, h2Price: 1300, h3Price: 1400 },
  { design: "Magenta 26", category: "single_storey", option: "Living / Media - (With Skylight)", h1Price: null, h2Price: null, h3Price: null, notes: "TBA" },
  { design: "Magenta 29", category: "single_storey", option: "Living / Media - (With Skylight)", h1Price: null, h2Price: null, h3Price: null, notes: "TBA" },
  { design: "Magenta 33", category: "single_storey", option: "Living / Media - (With Skylight)", h1Price: null, h2Price: null, h3Price: null, notes: "TBA" },
  { design: "Magenta 36", category: "single_storey", option: "Living / Media - (With Skylight)", h1Price: null, h2Price: null, h3Price: null, notes: "TBA" },
  { design: "Mulberry 22", category: "single_storey", option: "Workshop / Storage - (No Roller Door)", h1Price: 8000, h2Price: 8000, h3Price: 8000 },
  { design: "Mulberry 25", category: "single_storey", option: "Mulberry 25A Garage with Workshop / Storage Option (Brushed Concrete Finish)", h1Price: 10000, h2Price: 10000, h3Price: 10000 },
  { design: "Mulberry 25", category: "single_storey", option: "Workshop / Storage with Roller Door", h1Price: 12600, h2Price: 12600, h3Price: 12600 },
  { design: "Mulberry 28", category: "single_storey", option: "Bed 5", h1Price: 2300, h2Price: 2700, h3Price: 2700 },
  { design: "Mulberry 28", category: "single_storey", option: "Workshop / Storage with Roller Door", h1Price: 14100, h2Price: 14100, h3Price: 14100 },
  { design: "Mulberry 28", category: "single_storey", option: "Additional Alfresco to Rear", h1Price: 28000, h2Price: 28300, h3Price: 28300 },
  { design: "Mulberry 33", category: "single_storey", option: "Bed 5", h1Price: 2300, h2Price: 2700, h3Price: 2700 },
  { design: "Mulberry 33", category: "single_storey", option: "Workshop / Storage with Roller Door", h1Price: 14100, h2Price: 14100, h3Price: 14100 },
  { design: "Mulberry 33", category: "single_storey", option: "Additional Alfresco to Rear", h1Price: 24200, h2Price: 24500, h3Price: 24500 },
  { design: "Mulberry 39", category: "single_storey", option: "Alfresco Extension (Laundry)", h1Price: 7000, h2Price: 8000, h3Price: 8000 },
  { design: "Mulberry 39", category: "single_storey", option: "Alfresco Extension (Family)", h1Price: 13700, h2Price: 14500, h3Price: 14500 },
  { design: "Mulberry 39", category: "single_storey", option: "Workshop / Storage with Roller Door", h1Price: 18100, h2Price: 18200, h3Price: 18200 },
  { design: "Mulberry 39", category: "single_storey", option: "Alfresco Extension (Laundry & Family)", h1Price: 19800, h2Price: 20400, h3Price: 20400 },
  { design: "Onyx 17", category: "single_storey", option: "Living to Rear", h1Price: 14900, h2Price: 15000, h3Price: 15000 },
  { design: "Onyx 19", category: "single_storey", option: "Living to Rear", h1Price: 14900, h2Price: 15000, h3Price: 15000 },
  { design: "Onyx 19", category: "single_storey", option: "Bathroom Option", h1Price: 2000, h2Price: 2200, h3Price: 2700 },
  { design: "Onyx 21", category: "single_storey", option: "Living to Rear", h1Price: 14900, h2Price: 15000, h3Price: 15000 },
  { design: "Quartz 23", category: "single_storey", option: "Bed 1", h1Price: 0, h2Price: 0, h3Price: 0 },
  { design: "Saffron 23", category: "single_storey", option: "Living / Media to Front", h1Price: 0, h2Price: 0, h3Price: 0 },
  { design: "Saffron 30", category: "single_storey", option: "Bed 5 & Ensuite", h1Price: -685, h2Price: -740, h3Price: -806 },
  { design: "Saffron 35", category: "single_storey", option: "Bed 5 & Ensuite", h1Price: -685, h2Price: -740, h3Price: -806 },
  { design: "Topaz 21", category: "single_storey", option: "Living Room to Front", h1Price: 0, h2Price: 0, h3Price: 0 },
  { design: "Topaz 23", category: "single_storey", option: "Living Room to Front", h1Price: 0, h2Price: 0, h3Price: 0 },
  { design: "Topaz 29", category: "single_storey", option: "Bed 5", h1Price: 1700, h2Price: 2100, h3Price: 2100 },

  // ==========================================
  // TWO STOREY DESIGNS
  // ==========================================
  { design: "Burgundy 27", category: "two_storey", option: "Lounge/Theatre to Front", h1Price: -675, h2Price: -985, h3Price: -2986 },
  { design: "Burgundy 30", category: "two_storey", option: "Lounge/Theatre to Front", h1Price: -1340, h2Price: -1525, h3Price: -3635 },
  { design: "Burgundy 34", category: "two_storey", option: "Lounge/Theatre to Front", h1Price: -1485, h2Price: -2177, h3Price: -4307 },
  { design: "Carolina 29", category: "two_storey", option: "Home Theatre in lieu of Guest room", h1Price: -1277, h2Price: -2041, h3Price: -2560 },
  { design: "Cyan 41", category: "two_storey", option: "Bed 6 in lieu of Study", h1Price: -195, h2Price: -205, h3Price: -243 },
  { design: "Emerald 39", category: "two_storey", option: "Bed 5 to First Floor", h1Price: 6600, h2Price: 7200, h3Price: 7200 },
  { design: "Emerald 39", category: "two_storey", option: "Bed 1 WIR to First Floor", h1Price: 7900, h2Price: 8400, h3Price: 8400 },
  { design: "Emerald 39", category: "two_storey", option: "Alfresco Option 2 with Servery Bi-fold Window", h1Price: 9200, h2Price: 9200, h3Price: 9200 },
  { design: "Emerald 39", category: "two_storey", option: "Guest Room", h1Price: 10000, h2Price: 11300, h3Price: 15000 },
  { design: "Emerald 39", category: "two_storey", option: "Alfresco Option 3", h1Price: 24700, h2Price: 24800, h3Price: 24800 },
  { design: "Emerald 42", category: "two_storey", option: "Bed 5 to First Floor", h1Price: 6900, h2Price: 7400, h3Price: 7500 },
  { design: "Emerald 42", category: "two_storey", option: "Bed 1 WIR to First Floor", h1Price: 8300, h2Price: 8900, h3Price: 8900 },
  { design: "Emerald 42", category: "two_storey", option: "Alfresco Option 2 with Servery Bi-fold Window", h1Price: 8900, h2Price: 9000, h3Price: 9000 },
  { design: "Emerald 42", category: "two_storey", option: "Guest Room", h1Price: 10000, h2Price: 11300, h3Price: 15000 },
  { design: "Emerald 42", category: "two_storey", option: "Alfresco Option 3", h1Price: 25300, h2Price: 25400, h3Price: 25400 },
  { design: "Emerald 44", category: "two_storey", option: "Bed 5 to First Floor", h1Price: 6400, h2Price: 6900, h3Price: 6900 },
  { design: "Emerald 44", category: "two_storey", option: "Bed 1 WIR to First Floor", h1Price: 8400, h2Price: 9000, h3Price: 9000 },
  { design: "Emerald 44", category: "two_storey", option: "Alfresco Option 2 with Servery Bi-fold Window", h1Price: 8900, h2Price: 8900, h3Price: 8900 },
  { design: "Emerald 44", category: "two_storey", option: "Guest Room", h1Price: 10000, h2Price: 11300, h3Price: 15000 },
  { design: "Emerald 44", category: "two_storey", option: "Alfresco Option 3", h1Price: 26400, h2Price: 26500, h3Price: 26500 },
  { design: "Emerald 47", category: "two_storey", option: "Alfresco to Rear of Kitchen Option with Servery Bi-fold Window", h1Price: 3700, h2Price: 3700, h3Price: 3700 },
  { design: "Emerald 47", category: "two_storey", option: "Bed 5 to First Floor", h1Price: 6400, h2Price: 6900, h3Price: 6900 },
  { design: "Emerald 47", category: "two_storey", option: "Bed 1 WIR to First Floor", h1Price: 7500, h2Price: 8000, h3Price: 8000 },
  { design: "Emerald 47", category: "two_storey", option: "Guest Room", h1Price: 10000, h2Price: 11300, h3Price: 15000 },
  { design: "Fuchsia 37", category: "two_storey", option: "Guest Room", h1Price: 2100, h2Price: 2400, h3Price: 2500 },
  { design: "Fuchsia 37", category: "two_storey", option: "Bed 5", h1Price: 2500, h2Price: 2800, h3Price: 2900 },
  { design: "Fuchsia 42", category: "two_storey", option: "Guest Room", h1Price: 2000, h2Price: 2300, h3Price: 2400 },
  { design: "Fuchsia 42", category: "two_storey", option: "Bed 5", h1Price: 3500, h2Price: 4100, h3Price: 4100 },
  { design: "Fuchsia 44", category: "two_storey", option: "Bed 5", h1Price: 3500, h2Price: 4100, h3Price: 4100 },
  { design: "Fuchsia 47", category: "two_storey", option: "Bed 5", h1Price: 3500, h2Price: 4100, h3Price: 4100 },
  { design: "Lime 25", category: "two_storey", option: "Guest Room", h1Price: 4400, h2Price: 5700, h3Price: 10100 },
  { design: "Marigold 26", category: "two_storey", option: "Additional Master Bedroom", h1Price: 41200, h2Price: 42400, h3Price: 47400 },
  { design: "Marigold 28", category: "two_storey", option: "Additional Bedroom 4", h1Price: 11900, h2Price: 12200, h3Price: 12300 },
  { design: "Marigold 35", category: "two_storey", option: "Alternative Scullery & Laundry Option", h1Price: 7700, h2Price: 8100, h3Price: 8500 },
  { design: "Marigold 35", category: "two_storey", option: "WIR/Ensuite to Bedroom 1", h1Price: -550, h2Price: -650, h3Price: -750 },
  { design: "Orchid 23", category: "two_storey", option: "Double Garage", h1Price: 11600, h2Price: 11600, h3Price: 11600 },
  { design: "Orchid 25", category: "two_storey", option: "Double Garage", h1Price: 11600, h2Price: 11600, h3Price: 11600 },
  { design: "Rose 34", category: "two_storey", option: "Alfresco Option 2 with Servery Bi-fold Window", h1Price: 9500, h2Price: 10800, h3Price: 10800 },
  { design: "Rose 38", category: "two_storey", option: "Alfresco Option 2 with Servery Bi-fold Window", h1Price: 9500, h2Price: 10800, h3Price: 10800 },
  { design: "Rose 38", category: "two_storey", option: "Office to Front", h1Price: -1875, h2Price: -2240, h3Price: -3887 },
  { design: "Rose 43", category: "two_storey", option: "Alfresco Option 2 with Servery Bi-fold Window", h1Price: 9500, h2Price: 10800, h3Price: 10800 },
  { design: "Rose 43", category: "two_storey", option: "Office to Front", h1Price: -1875, h2Price: -2240, h3Price: -3887 },
  { design: "Rose 53", category: "two_storey", option: "Office to Front", h1Price: -1875, h2Price: -2240, h3Price: -3887 },
  { design: "Ruby 18", category: "two_storey", option: "Double Garage", h1Price: 16900, h2Price: 17200, h3Price: 17200 },
  { design: "Ruby 20", category: "two_storey", option: "Double Garage", h1Price: 16900, h2Price: 17200, h3Price: 17200 },
  { design: "Ruby 23", category: "two_storey", option: "Double Garage", h1Price: 16900, h2Price: 17200, h3Price: 17200 },
  { design: "Ruby 29", category: "two_storey", option: "Bed 5 & WIL to First Floor", h1Price: 8000, h2Price: 8000, h3Price: 8000 },
  { design: "Ruby 29", category: "two_storey", option: "Double Garage", h1Price: 16900, h2Price: 17200, h3Price: 17200 },
  { design: "Violet 40", category: "two_storey", option: "Bed 5 & Gallery", h1Price: 6700, h2Price: 7300, h3Price: 7300 },
  { design: "Violet 40", category: "two_storey", option: "Bed 5 to First Floor in lieu of void", h1Price: 7500, h2Price: 8000, h3Price: 8000 },
  { design: "Violet 45", category: "two_storey", option: "Bed 5 & Gallery", h1Price: 7300, h2Price: 7700, h3Price: 7700 },
  { design: "Violet 45", category: "two_storey", option: "Bed 5 to First Floor in lieu of void", h1Price: 8000, h2Price: 8500, h3Price: 8500 },
  { design: "Violet 45", category: "two_storey", option: "Home Theatre in lieu of Guest room & ensuite", h1Price: -6120, h2Price: -6730, h3Price: -8775 },
  { design: "Voilet 48", category: "two_storey", option: "Home Theatre in lieu of Guest room & ensuite", h1Price: -6120, h2Price: -6730, h3Price: -8775 },
  { design: "Voilet 48", category: "two_storey", option: "Bed 5 to First Floor in lieu of void", h1Price: 8000, h2Price: 8500, h3Price: 8500 },
  { design: "Voilet 48", category: "two_storey", option: "Bed 5 & Gallery", h1Price: 7300, h2Price: 7700, h3Price: 7700 },
  { design: "Voilet 64", category: "two_storey", option: "Home Theatre in lieu of Guest room & ensuite", h1Price: -6120, h2Price: -6730, h3Price: -8775 },
  { design: "Viridian 28", category: "two_storey", option: "Alternate Staircase", h1Price: 1800, h2Price: 2000, h3Price: 2300 },
  { design: "Viridian 33", category: "two_storey", option: "Bed 5 to First Floor", h1Price: 5600, h2Price: 6200, h3Price: 6200 },
  { design: "Viridian 39", category: "two_storey", option: "Bed 5 to First Floor", h1Price: 6300, h2Price: 6500, h3Price: 6600 },

  // ==========================================
  // DUAL LIVING DESIGNS
  // ==========================================
  { design: "Magnolia 34", category: "dual_living", option: "Rename Gallery - (With Skylight)", h1Price: 2750, h2Price: 2750, h3Price: 2750 },
  { design: "Magnolia 37", category: "dual_living", option: "Rename Gallery - (With Skylight)", h1Price: 2750, h2Price: 2750, h3Price: 2750 },
  { design: "Magnolia 45", category: "dual_living", option: "Option Bed 5 (Per Unit)", h1Price: 3100, h2Price: 4200, h3Price: 8200 },
  { design: "Magnolia 45", category: "dual_living", option: "Option Alfresco Extension (Per Unit)", h1Price: 12300, h2Price: 12300, h3Price: 12300 },
  { design: "Magnolia 47 Mk2", category: "dual_living", option: "Option Gallery (Per Unit)", h1Price: 18400, h2Price: 20500, h3Price: 20500 },
  { design: "Magnolia 47 Mk2", category: "dual_living", option: "Option Bed 5 / Bathroom (Per Unit)", h1Price: 4200, h2Price: 5100, h3Price: 9100 },
  { design: "Magnolia 53 Mk2", category: "dual_living", option: "Option Bed 5 / Bathroom (Per Unit)", h1Price: 4100, h2Price: 5100, h3Price: 9100 },
  { design: "Maize 33", category: "dual_living", option: "Balcony with Std Range Face Brick Balustrades", h1Price: 36300, h2Price: 36300, h3Price: 36300 },
  { design: "Maize 36", category: "dual_living", option: "Balcony with Std Range Face Brick Balustrades", h1Price: 36300, h2Price: 36300, h3Price: 36300 },
  { design: "Maize 38", category: "dual_living", option: "Balcony with Std Range Face Brick Balustrades", h1Price: 36300, h2Price: 36300, h3Price: 36300 },
  { design: "Maize 43", category: "dual_living", option: "Balcony with Std Range Face Brick Balustrades", h1Price: 37800, h2Price: 37800, h3Price: 37800 },
  { design: "Maize 47", category: "dual_living", option: "Balcony with Std Range Face Brick Balustrades", h1Price: 39000, h2Price: 39000, h3Price: 39000 },

  // ==========================================
  // SPLIT LEVEL DESIGNS
  // ==========================================
  { design: "Cinnamon 23", category: "split_level", option: "Ensuite to Guest / Bed 4", h1Price: 4100, h2Price: 4300, h3Price: 6600 },
  { design: "Cobalt 30", category: "split_level", option: "Additional Guest Suite", h1Price: 12600, h2Price: 13200, h3Price: 17200 },
  { design: "Cobalt 30", category: "split_level", option: "Retreat", h1Price: 18100, h2Price: 20700, h3Price: 25800 },
  { design: "Cobalt 36", category: "split_level", option: "Option Bed 5", h1Price: 3000, h2Price: 4000, h3Price: 4300 },
  { design: "Mauve 28", category: "split_level", option: "Ensuite & WIR to Guest Room & Additional WC", h1Price: 2700, h2Price: 3800, h3Price: 6100 },
  { design: "Mauve 32", category: "split_level", option: "Ensuite & WIR in lieu of Office", h1Price: 10000, h2Price: 11500, h3Price: 15800 },
  { design: "Mauve 35", category: "split_level", option: "Bedroom 6 in lieu of Gallery", h1Price: null, h2Price: null, h3Price: null, notes: "TBA" },
  { design: "Mauve 35", category: "split_level", option: "Ensuite & WIR in lieu of Office", h1Price: null, h2Price: null, h3Price: null, notes: "TBA" },
];

/**
 * Finds pre-approved plan options for a specific Hudson Homes design model.
 */
export function getOptionsForDesign(designName: string): HudsonPlanOption[] {
  if (!designName) return [];
  const clean = designName.toLowerCase().replace(/[^a-z0-9]/g, "");
  return HUDSON_OPTIONS_PRICE_LIST_2026.filter((opt) => {
    const optClean = opt.design.toLowerCase().replace(/[^a-z0-9]/g, "");
    return clean.includes(optClean) || optClean.includes(clean);
  });
}
