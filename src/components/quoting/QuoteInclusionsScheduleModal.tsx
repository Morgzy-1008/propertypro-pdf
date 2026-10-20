import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Printer,
  FileDown,
  Check,
  X,
  Sparkles,
  ShieldCheck,
  Layers,
  ChefHat,
  Bath,
  Home,
  Zap,
  Hammer,
  TreePine,
  Download,
  ExternalLink,
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import { formatAud } from "@/lib/pricing";

export interface QuoteInclusionsScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTier?: string;
  clientName?: string;
  designName?: string;
  division?: "QLD" | "NSW";
}

interface InclusionCategory {
  title: string;
  icon: any;
  items: {
    specName: string;
    description?: string;
    h1: string;
    h2: string;
    h3: string;
    ip: string;
    fhb: string;
  }[];
}

const INCLUSIONS_MATRIX: InclusionCategory[] = [
  {
    title: "Kitchen & Premium Appliances",
    icon: ChefHat,
    items: [
      {
        specName: "Cooktop & Oven",
        description: "European engineered cooking appliances with manufacturer warranty",
        h1: "600mm European stainless steel electric oven & gas/ceramic cooktop",
        h2: "900mm Westinghouse stainless steel 5-burner gas cooktop & 900mm oven",
        h3: "900mm European luxury 5-burner gas wok cooktop & 900mm twin-fan oven",
        ip: "600mm Haier / European heavy-duty appliance suite (Tenant durable)",
        fhb: "600mm stainless steel oven & 4-zone cooktop (FHOG ready package)",
      },
      {
        specName: "Rangehood",
        h1: "600mm stainless steel slideout rangehood",
        h2: "900mm stainless steel canopy or concealed undermount rangehood",
        h3: "900mm designer glass canopy or high-extraction undermount rangehood",
        ip: "600mm stainless steel recirculating / ducted rangehood",
        fhb: "600mm stainless steel slideout rangehood",
      },
      {
        specName: "Kitchen Benchtops",
        description: "Engineered quartz stone with polished pencil round edges",
        h1: "20mm engineered quartz stone benchtop",
        h2: "20mm engineered quartz stone benchtop with shadowline feature",
        h3: "40mm engineered quartz stone benchtops with dual waterfall ends to island",
        ip: "20mm engineered quartz stone benchtop (scratch & heat resistant)",
        fhb: "20mm engineered quartz stone benchtop",
      },
      {
        specName: "Dishwasher",
        h1: "Under-bench microwave & dishwasher provision with power & plumbing",
        h2: "Freestanding stainless steel dishwasher included (energy & water efficient)",
        h3: "Fully integrated premium dishwasher with concealed touch controls",
        ip: "Stainless steel dishwasher included (100% turnkey ready)",
        fhb: "Stainless steel dishwasher included with turnkey completion",
      },
      {
        specName: "Cabinetry & Hardware",
        h1: "Polytec fine-embossed melamine cabinetry with ABS edging",
        h2: "Soft-close cabinet doors & drawers throughout kitchen & pantry",
        h3: "Blum premium soft-close runners, overhead lift cabinets & cutlery inserts",
        ip: "Heavy-duty impact-resistant cabinetry with soft-close hinges",
        fhb: "Modern melamine cabinetry with durable ABS edging & sleek handles",
      },
      {
        specName: "Sink & Tapware",
        h1: "Stainless steel double bowl sink with chrome gooseneck mixer",
        h2: "Stainless steel double bowl sink with pull-out designer mixer tap",
        h3: "Under-mount double bowl sink with designer pull-out vegetable spray mixer",
        ip: "Stainless steel double bowl sink with durable chrome mixer",
        fhb: "Stainless steel 1.75 bowl sink with chrome sink mixer",
      },
    ],
  },
  {
    title: "Bathrooms, Ensuite & Powder",
    icon: Bath,
    items: [
      {
        specName: "Vanity Benchtops",
        h1: "20mm engineered stone vanity benchtops to bathroom & ensuite",
        h2: "20mm engineered stone vanity benchtops with semi-inset designer basins",
        h3: "40mm engineered stone floating vanities with above-counter vessel basins",
        ip: "20mm engineered stone vanity tops with vitreous china basins",
        fhb: "20mm engineered stone or moisture-resistant laminate vanity benchtops",
      },
      {
        specName: "Shower Screens & Bases",
        h1: "Semi-frameless pivot door shower screens with chrome frame",
        h2: "Semi-frameless shower screens with slimline pivot door & polished chrome trim",
        h3: "Frameless 10mm toughened architectural glass shower screens throughout",
        ip: "Semi-frameless pivot door shower screens with heavy-duty seals",
        fhb: "Semi-frameless pivot door shower screens with chrome hardware",
      },
      {
        specName: "Wall & Floor Tiling",
        description: "Quality ceramic & porcelain tiles with matching grout",
        h1: "2.0m high ceramic tiling to showers, skirting tiles to remaining walls",
        h2: "2.1m high polished porcelain tiling to showers, splashbacks & wet areas",
        h3: "Floor-to-ceiling rectified porcelain tiling to bathroom, ensuite & powder",
        ip: "Full height tiling to shower enclosures, ceramic floor tiling",
        fhb: "2.0m high shower tiling, vanity splashbacks & ceramic floor tiling",
      },
      {
        specName: "Bathtub",
        h1: "White acrylic inset bathtub with tiled surround",
        h2: "White contemporary freestanding or semi-freestanding back-to-wall bath",
        h3: "Luxury 1700mm freestanding designer acrylic bath in ensuite & bathroom",
        ip: "Durable white acrylic inset bathtub with chrome waste",
        fhb: "1500mm-1675mm white acrylic bathtub with chrome plug and waste",
      },
      {
        specName: "Tapware & Accessories",
        h1: "Chrome lever tapware, double towel rails & toilet roll holders",
        h2: "Contemporary chrome or matte black tapware & matching bathroom accessories",
        h3: "Designer brushed nickel or matte black tapware suite & rain shower heads",
        ip: "Durable WELS-rated chrome tapware, double towel rails & heavy-duty fixtures",
        fhb: "WELS-rated chrome mixers & matching chrome bathroom accessory suite",
      },
    ],
  },
  {
    title: "Interior, Doors & Ceilings",
    icon: Home,
    items: [
      {
        specName: "Ceiling Height",
        h1: "2440mm (8ft) nominal ceiling height",
        h2: "2590mm (8.5ft) high ceilings to ground floor",
        h3: "2740mm (9ft) high ceilings to ground floor (2590mm upper if double)",
        ip: "2440mm (8ft) nominal ceiling height",
        fhb: "2440mm (8ft) nominal ceiling height",
      },
      {
        specName: "Living Area Flooring",
        h1: "Quality ceramic floor tiles (450x450mm) to entry, living, dining & kitchen",
        h2: "600x600mm glazed porcelain tiles or premium timber-look laminate flooring",
        h3: "Designer hybrid timber flooring or 600x1200mm rectified porcelain living tiles",
        ip: "Hardwearing ceramic tiles (450x450mm) to main living & circulation zones",
        fhb: "Ceramic floor tiles to entry, hallway, kitchen, dining and living zones",
      },
      {
        specName: "Bedroom Flooring",
        h1: "Quality polyester carpet with 8mm foam underlay to bedrooms & media",
        h2: "Premium heavy-duty nylon cut pile carpet with 10mm plush underlay",
        h3: "Luxury solution-dyed nylon plush carpet with 11mm executive acoustic underlay",
        ip: "Durable solution-dyed stain-resistant carpet with underlay to all bedrooms",
        fhb: "Quality carpet with comfort underlay to bedrooms, robes and linen",
      },
      {
        specName: "Internal Doors & Hardware",
        h1: "Flush panel honeycomb core doors with satin chrome leversets",
        h2: "Corinthian Deco internal doors with architectural designer lever handles",
        h3: "2340mm high architectural internal doors with premium magnetic latches",
        ip: "Flush panel doors with durable commercial lever handles & door stops",
        fhb: "Flush panel internal doors with modern chrome lever handles",
      },
      {
        specName: "Robes & Storage",
        h1: "Built-in robes with melamine top shelf & chrome hanging rail to all beds",
        h2: "Built-in robes with mirrored or vinyl sliding doors, shelf & hanging rail",
        h3: "Custom master walk-in wardrobe fitout with built-in drawer bank & shelving",
        ip: "Mirrored sliding doors to built-in robes for enhanced space perception",
        fhb: "Built-in wardrobes with top shelf & hanging rail to all bedrooms",
      },
      {
        specName: "Internal Paint",
        h1: "Taubmans / Dulux 2-coat washable low-sheen paint system",
        h2: "Taubmans / Dulux Endure 3-coat washable premium paint system (1 colour)",
        h3: "Taubmans / Dulux Endure 3-coat premium paint system with feature wall allowance",
        ip: "Durable washable 2-coat paint system with gloss enamel to trim & doors",
        fhb: "Quality 2-coat washable paint system to walls, flat white to ceilings",
      },
    ],
  },
  {
    title: "Electrical, Lighting & Climate Control",
    icon: Zap,
    items: [
      {
        specName: "Air Conditioning",
        description: "High-efficiency reverse cycle climate control",
        h1: "Split system reverse cycle air conditioning to main living room",
        h2: "Multi-zone ducted reverse cycle air conditioning system or dual split system",
        h3: "Premium Daikin / Actron multi-zone ducted reverse cycle with smart touchscreen",
        ip: "Split system reverse cycle air conditioning to living room (Turnkey)",
        fhb: "Split system reverse cycle air conditioning to main living room",
      },
      {
        specName: "Lighting Fixtures",
        h1: "Energy efficient LED batten holders & oyster lights throughout",
        h2: "LED downlights to entry, hallway, kitchen, meals & main living zones",
        h3: "Clipsal Iconic slimline LED downlights throughout entire residence",
        ip: "LED oyster / downlights for low maintenance & tenant longevity",
        fhb: "Energy saving LED lighting fixtures throughout living and bedrooms",
      },
      {
        specName: "Power Points & USBs",
        h1: "Double power points throughout, 1 TV point, 1 phone/data point",
        h2: "Double GPOs throughout with integrated dual USB charging to kitchen & master",
        h3: "Clipsal Iconic switches, USB-C rapid charging points & smart provisions",
        ip: "Double power points throughout with NBN enclosure & data cabling",
        fhb: "Double GPOs throughout with NBN provision & TV point",
      },
      {
        specName: "Hot Water System",
        h1: "Energy efficient continuous flow gas or electric heat pump hot water",
        h2: "Rheem / Rinnai 26L continuous flow gas hot water or 270L solar heat pump",
        h3: "Premium continuous flow gas hot water with digital recessed controllers",
        ip: "High-efficiency electric heat pump or continuous flow gas hot water unit",
        fhb: "Energy efficient heat pump or instantaneous gas hot water system",
      },
    ],
  },
  {
    title: "External, Structural & Turnkey Inclusions",
    icon: Hammer,
    items: [
      {
        specName: "Termite Protection",
        h1: "Termimesh physical termite barrier to penetrations with 25-yr warranty",
        h2: "Termimesh physical termite barrier system with certified warranty",
        h3: "Termimesh stainless steel physical barrier with perimeter protection warranty",
        ip: "Termimesh physical barrier with annual inspection compliance guarantee",
        fhb: "Termimesh certified physical termite protection system",
      },
      {
        specName: "Roofing & Rainwater",
        h1: "NSW: Concrete roof tiles / QLD: Colorbond® steel custom orb roof",
        h2: "Choice of Colorbond® steel roof or Boral designer terracotta/concrete tiles",
        h3: "Colorbond® Ultra or designer profile roof tiles with Colorbond® gutters/fascia",
        ip: "Colorbond® or concrete tile roofing with Colorbond® fascia and guttering",
        fhb: "Quality concrete roof tiles (NSW) or Colorbond® steel roof (QLD)",
      },
      {
        specName: "Driveway & Paving",
        h1: "Excavation & site preparation (Driveway via site cost allowance)",
        h2: "Up to 55m² exposed aggregate or coloured concrete driveway allowance",
        h3: "Exposed aggregate designer driveway, front porch & perimeter path included",
        ip: "Full exposed aggregate or stamped coloured concrete driveway & path (Included)",
        fhb: "Coloured concrete driveway and path to front entry (Included)",
      },
      {
        specName: "Fencing & Landscaping",
        h1: "Optional variation package available",
        h2: "Optional turnkey landscaping package available",
        h3: "Executive landscaping design consultation allowance",
        ip: "Colorbond® perimeter fencing, side returns, gate, turf & garden bed (Turnkey)",
        fhb: "Starter landscaping package: turf to front & rear, garden bed & side fencing",
      },
      {
        specName: "Window Furnishings",
        h1: "Flyscreens to all openable windows",
        h2: "Flyscreens to all openable windows & sliding glass doors",
        h3: "Barrier screens to openable windows & sliding doors with blockout roller blinds",
        ip: "Blockout roller blinds to all windows & flyscreens throughout (100% Turnkey)",
        fhb: "Flyscreens to openable windows and blockout roller blinds to living & beds",
      },
      {
        specName: "Clothesline & Letterbox",
        h1: "Optional variation package",
        h2: "Optional turnkey completion package",
        h3: "Designer brick letterbox & foldaway clothesline included",
        ip: "Foldaway clothesline, concrete pad & designer key-lock letterbox (Included)",
        fhb: "Folddown clothesline and pillar letterbox with street numbers (Included)",
      },
    ],
  },
];

export function QuoteInclusionsScheduleModal({
  isOpen,
  onClose,
  activeTier = "all",
  clientName,
  designName,
  division = "NSW",
}: QuoteInclusionsScheduleModalProps) {
  const { mode } = useTheme();
  const isLight = mode === "normal";
  const [selectedView, setSelectedView] = useState<string>(activeTier || "all");

  const handlePrint = () => {
    window.print();
  };

  const tiers = [
    { code: "all", label: "Full Matrix", badge: "Side-by-Side" },
    { code: "H1", label: "H1 Smart Living", badge: "Essential Value" },
    { code: "H2", label: "H2 Design Collection", badge: "Most Popular" },
    { code: "H3", label: "H3 Luxury Living", badge: "Executive" },
    { code: "IP", label: "IP Investor Pack", badge: "100% Turnkey" },
    { code: "FHB", label: "FHB Start Smart", badge: "FHOG Ready" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`max-w-7xl max-h-[92vh] overflow-y-auto p-0 rounded-3xl border shadow-2xl ${
          isLight
            ? "bg-slate-50 border-slate-200 text-slate-900"
            : "bg-slate-950 border-slate-800 text-white"
        }`}
      >
        {/* Print-specific style tag injected for clean client printout */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .printable-inclusions-modal, .printable-inclusions-modal * {
              visibility: visible;
            }
            .printable-inclusions-modal {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 20px;
              background: white !important;
              color: black !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>

        <div className="printable-inclusions-modal">
          {/* Header Banner */}
          <div
            className={`p-6 sm:p-8 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-20 backdrop-blur-xl ${
              isLight
                ? "bg-white/95 border-slate-200 shadow-xs"
                : "bg-slate-950/95 border-slate-800"
            }`}
          >
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <Badge className="bg-emerald-500 text-slate-950 font-bold px-2.5 py-0.5 text-xs">
                  Hudson Homes
                </Badge>
                <Badge variant="outline" className="font-mono text-xs font-bold py-0.5 px-2">
                  {division === "NSW" ? "NSW Division Standards" : "QLD Division Standards"}
                </Badge>
                {designName && (
                  <Badge variant="outline" className="font-semibold text-xs py-0.5 px-2">
                    Design: {designName}
                  </Badge>
                )}
                {clientName && (
                  <span className="text-xs text-slate-400 font-medium">
                    Prepared for: <strong className="text-slate-200">{clientName}</strong>
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Master Inclusions Specification Schedule
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
                Compare finish standards across our 5 signature construction tiers. All materials meet or exceed National Construction Code (NCC) 2022 7-Star energy efficiency standards.
              </p>
            </div>

            {/* Actions: View switcher & Print Button */}
            <div className="flex items-center gap-2 flex-wrap self-start md:self-auto no-print">
              <Button
                type="button"
                onClick={handlePrint}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold px-4 h-10 rounded-xl gap-2 shadow-sm cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Print / Save PDF</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="h-10 px-4 rounded-xl font-bold cursor-pointer"
              >
                Close
              </Button>
            </div>
          </div>

          {/* Tier Filter Tabs (No-Print) */}
          <div className="p-4 sm:px-8 border-b bg-slate-900/30 dark:bg-slate-900/50 flex items-center gap-2 overflow-x-auto scrollbar-none no-print">
            <span className="text-xs uppercase font-extrabold text-slate-400 tracking-wider mr-2 flex-none">
              Filter View:
            </span>
            {tiers.map((t) => {
              const isActive = selectedView === t.code;
              return (
                <button
                  key={t.code}
                  type="button"
                  onClick={() => setSelectedView(t.code)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 border ${
                    isActive
                      ? isLight
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                        : "bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm"
                      : isLight
                      ? "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      : "bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700"
                  }`}
                >
                  <span>{t.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded font-normal ${
                    isActive
                      ? isLight ? "bg-slate-800 text-slate-200" : "bg-emerald-950/80 text-emerald-200"
                      : "bg-slate-800/40 text-slate-400"
                  }`}>
                    {t.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Content Body: Inclusions Matrix */}
          <div className="p-6 sm:p-8 space-y-8">
            {INCLUSIONS_MATRIX.map((cat, catIdx) => {
              const IconComp = cat.icon;
              return (
                <div
                  key={catIdx}
                  className={`rounded-2xl border overflow-hidden ${
                    isLight ? "bg-white border-slate-200 shadow-xs" : "bg-slate-900/70 border-slate-800"
                  }`}
                >
                  {/* Category Header */}
                  <div
                    className={`p-4 sm:px-6 flex items-center gap-3 border-b ${
                      isLight ? "bg-slate-100/70 border-slate-200" : "bg-slate-950/60 border-slate-800"
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                      <IconComp className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-extrabold tracking-tight">
                        {cat.title}
                      </h3>
                      <span className="text-xs text-slate-400">
                        {cat.items.length} verified trade specifications
                      </span>
                    </div>
                  </div>

                  {/* Specification Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm border-collapse">
                      <thead>
                        <tr className={`border-b text-xs uppercase font-extrabold tracking-wider ${
                          isLight ? "bg-slate-50 text-slate-600 border-slate-200" : "bg-slate-950/40 text-slate-400 border-slate-800"
                        }`}>
                          <th className="py-3 px-4 sm:px-6 w-1/4 min-w-[200px]">Specification</th>
                          {(selectedView === "all" || selectedView === "H1") && (
                            <th className={`py-3 px-4 min-w-[190px] ${selectedView === "H1" ? "bg-blue-500/10 text-blue-400" : ""}`}>
                              <div className="flex items-center gap-1.5">
                                <span>H1 Smart Living</span>
                                <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono">H1</Badge>
                              </div>
                            </th>
                          )}
                          {(selectedView === "all" || selectedView === "H2") && (
                            <th className={`py-3 px-4 min-w-[210px] ${selectedView === "H2" || selectedView === "all" ? "bg-emerald-500/10 text-emerald-400" : ""}`}>
                              <div className="flex items-center gap-1.5">
                                <span>H2 Design Collection</span>
                                <Badge className="bg-emerald-500 text-slate-950 text-[10px] py-0 px-1 font-bold">Standard</Badge>
                              </div>
                            </th>
                          )}
                          {(selectedView === "all" || selectedView === "H3") && (
                            <th className={`py-3 px-4 min-w-[210px] ${selectedView === "H3" ? "bg-amber-500/10 text-amber-400" : ""}`}>
                              <div className="flex items-center gap-1.5">
                                <span>H3 Luxury Living</span>
                                <Badge className="bg-amber-500 text-slate-950 text-[10px] py-0 px-1 font-bold">Executive</Badge>
                              </div>
                            </th>
                          )}
                          {(selectedView === "all" || selectedView === "IP") && (
                            <th className={`py-3 px-4 min-w-[210px] ${selectedView === "IP" ? "bg-cyan-500/10 text-cyan-400" : ""}`}>
                              <div className="flex items-center gap-1.5">
                                <span>IP Investor Pack</span>
                                <Badge className="bg-cyan-500 text-slate-950 text-[10px] py-0 px-1 font-bold">100% Turnkey</Badge>
                              </div>
                            </th>
                          )}
                          {(selectedView === "all" || selectedView === "FHB") && (
                            <th className={`py-3 px-4 min-w-[210px] ${selectedView === "FHB" ? "bg-purple-500/10 text-purple-400" : ""}`}>
                              <div className="flex items-center gap-1.5">
                                <span>FHB Start Smart</span>
                                <Badge className="bg-purple-500 text-white text-[10px] py-0 px-1 font-bold">FHOG Ready</Badge>
                              </div>
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                        {cat.items.map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            className={`transition-colors ${
                              isLight ? "hover:bg-slate-50/80" : "hover:bg-slate-800/30"
                            }`}
                          >
                            <td className="py-3.5 px-4 sm:px-6 align-top">
                              <span className="font-bold text-slate-900 dark:text-white block">
                                {row.specName}
                              </span>
                              {row.description && (
                                <span className="text-xs text-slate-400 block mt-0.5">
                                  {row.description}
                                </span>
                              )}
                            </td>

                            {(selectedView === "all" || selectedView === "H1") && (
                              <td className="py-3.5 px-4 align-top text-slate-600 dark:text-slate-300">
                                <div className="flex items-start gap-2">
                                  <Check className="h-4 w-4 text-blue-500 flex-none mt-0.5" />
                                  <span className="leading-snug">{row.h1}</span>
                                </div>
                              </td>
                            )}

                            {(selectedView === "all" || selectedView === "H2") && (
                              <td className="py-3.5 px-4 align-top font-medium text-slate-900 dark:text-slate-100 bg-emerald-500/5">
                                <div className="flex items-start gap-2">
                                  <Check className="h-4 w-4 text-emerald-500 flex-none mt-0.5 stroke-[2.5]" />
                                  <span className="leading-snug">{row.h2}</span>
                                </div>
                              </td>
                            )}

                            {(selectedView === "all" || selectedView === "H3") && (
                              <td className="py-3.5 px-4 align-top text-slate-700 dark:text-slate-200">
                                <div className="flex items-start gap-2">
                                  <Check className="h-4 w-4 text-amber-500 flex-none mt-0.5 stroke-[2.5]" />
                                  <span className="leading-snug">{row.h3}</span>
                                </div>
                              </td>
                            )}

                            {(selectedView === "all" || selectedView === "IP") && (
                              <td className="py-3.5 px-4 align-top text-slate-700 dark:text-slate-200">
                                <div className="flex items-start gap-2">
                                  <Check className="h-4 w-4 text-cyan-500 flex-none mt-0.5 stroke-[2.5]" />
                                  <span className="leading-snug">{row.ip}</span>
                                </div>
                              </td>
                            )}

                            {(selectedView === "all" || selectedView === "FHB") && (
                              <td className="py-3.5 px-4 align-top text-slate-700 dark:text-slate-200">
                                <div className="flex items-start gap-2">
                                  <Check className="h-4 w-4 text-purple-500 flex-none mt-0.5 stroke-[2.5]" />
                                  <span className="leading-snug">{row.fhb}</span>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* Legal Footnote */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border text-xs leading-relaxed ${
                isLight ? "bg-slate-100 border-slate-200 text-slate-600" : "bg-slate-900/60 border-slate-800 text-slate-400"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500 flex-none mt-0.5" />
                <div>
                  <strong className="text-slate-900 dark:text-white block mb-0.5">
                    Hudson Homes Construction & Guarantee Standards
                  </strong>
                  All materials, fittings and inclusions listed above are covered by standard statutory building warranties, 6-year structural defect warranty, and 90-day maintenance liability period. Specifications are subject to continuous design enhancement; Hudson Homes reserves the right to substitute items with equivalent or superior quality equivalents where supply chain dictates.
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
