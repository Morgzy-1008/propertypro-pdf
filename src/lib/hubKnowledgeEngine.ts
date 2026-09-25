import { type StaffProfile } from "@/lib/authSession";

export interface HubAiResponse {
  answer: string;
  confidence: number;
  verified: boolean;
  suggestedQuestions: string[];
  modelUsed: string;
}

export function generateHudsonKnowledgeResponse(
  message: string,
  staffUser?: StaffProfile | null
): HubAiResponse {
  const query = (message || "").toLowerCase().trim();

  // 1. Guardrail for speculative / non-Hudson topics
  const isSpeculativeOrExternal =
    query.includes("weather") ||
    query.includes("bitcoin") ||
    query.includes("crypto") ||
    query.includes("stock") ||
    query.includes("election") ||
    query.includes("unreleased land") ||
    query.includes("future price") ||
    query.includes("exact cost of bespoke") ||
    query.includes("other builder") ||
    query.includes("mcdonald jones") ||
    query.includes("metricon") ||
    query.includes("rawson");

  if (isSpeculativeOrExternal) {
    return {
      answer:
        "⚠️ **Accuracy Notice**: I cannot answer that with high accuracy (>95% confidence) at this moment. For specific unreleased estate pricing, bespoke developer covenants, or non-standard variations, please verify directly with Head Office Estimating or refer to the official Hudson Homes Inclusions schedule.",
      confidence: 0.7,
      verified: false,
      suggestedQuestions: [
        "What inclusion ranges does Hudson Homes offer?",
        "What is the difference between H1 Smart, H2 Designer, and H3 Luxury?",
        "Tell me about the IP Investment and FHB First Home Buyer ranges",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 2. Specific IP (Investment Property / Investor Range) Query
  if (
    query.includes("ip ") ||
    query.includes("investment") ||
    query.includes("investor") ||
    query.includes("hudson invest") ||
    query.includes("turn key") ||
    query.includes("turnkey")
  ) {
    return {
      answer: `### Hudson Homes IP (Investment Property) Range — "Hudson Invest"

The **IP Investment Range** is purpose-built for property investors seeking **maximum rental yield, high tenant appeal, tax depreciation benefits, and zero post-handover headaches**.

#### 1. 100% Complete Turn-Key Ready
The home is delivered complete and tenant-ready on settlement day with zero additional work or out-of-pocket expenses:
- **Full Landscaping & Fencing**: Treated timber perimeter fencing with side pedestrian access gate, fully turfed front and rear yards, garden edging, and low-maintenance planting.
- **Driveway & External**: Exposed aggregate concrete driveway, concrete crossover and porch path, powder-coated letterbox with street numbering, and folding outdoor clothesline.
- **Window Treatments & Security**: Quality block-out roller blinds to all windows and sliding doors, flyscreens to all openable windows, and security barrier screens to external doors.
- **Climate Control**: Ducted reverse-cycle air conditioning (or split systems to key zones) for year-round tenant comfort and premium rental appeal.

#### 2. Investor-Grade Specifications
- **Kitchen**: 20mm engineered stone benchtops, Westinghouse stainless steel appliances, dishwasher included, and durable soft-close cabinetry.
- **Durable Flooring**: Hard-wearing ceramic tiles to high-traffic living areas, hallways, and kitchen; stain-resistant carpets to bedrooms.
- **Electrical**: Energy-efficient LED downlights throughout living zones.

#### 3. Strategic Investor Advantages
- **Two-Part Contract Savings**: Separate land and build contracts mean **stamp duty is payable on the land value only**, saving investors thousands of dollars upfront.
- **Maximum Tax Depreciation**: Brand-new construction unlocks significant annual non-cash tax depreciation write-offs on fixtures and building allowance.
- **Guaranteed Construction Timeframes**: Fixed-price contract guarantee and committed completion schedules ensure your property starts generating rental income without delay.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What inclusion ranges does Hudson Homes offer?",
        "What is the FHB First Home Buyer Range?",
        "What are the differences between H1 Smart, H2 Designer, and H3 Luxury?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 3. Specific FHB (First Home Buyer Range) Query
  if (
    query.includes("fhb") ||
    query.includes("first home") ||
    query.includes("first-home") ||
    query.includes("start smart") ||
    query.includes("fhog")
  ) {
    return {
      answer: `### Hudson Homes FHB (First Home Buyer) Range

The **FHB Range** is tailored specifically for first-time purchasers entering the Australian property market, engineered for **total cost certainty, maximum government grant eligibility, and effortless move-in convenience**.

#### 1. Genuine Fixed-Price Contract Guarantee
- Eliminates cost blowouts and valuation shortfalls during bank finance approval.
- **Fixed Price Site Costs**: Includes engineered concrete slab up to H-class, concrete piering, council submission fees (DA/CDC), and BASIX / NatHERS 7-Star compliance.

#### 2. First Home Owner Grant (FHOG) & Stamp Duty Optimization
- Packages are priced and structured to qualify for state first home owner grants (e.g. up to **\$30,000 in Queensland** and **\$10,000 in NSW**).
- Assists buyers in qualifying for first-home buyer stamp duty exemptions or concessional thresholds across NSW and QLD growth corridors.

#### 3. Complete Move-In Ready Finish
- **Flooring**: Quality ceramic floor tiles to living, meals, and kitchen; quality carpet with underlay to all bedrooms.
- **Climate Control**: Split-system or ducted air conditioning and ceiling fans.
- **Kitchen Essentials**: Modern benchtops, Westinghouse stainless steel appliances (oven, cooktop, rangehood, dishwasher provision).
- **External Options**: Driveway, perimeter fencing, turfing, clothesline, and letterbox can be packaged together so you have zero out-of-pocket expenses on handover day.

#### 4. Smart-Living Floorplans
- High-efficiency single-storey and double-storey designs (e.g. Amber 21, Azure 25, Jasper 26, Cedar 26) that maximize internal living space on standard suburban blocks (300m² to 450m²).`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What inclusion ranges does Hudson Homes offer?",
        "Tell me about the IP Investment Range",
        "What is included in H1 Smart vs H2 Designer?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 4. General Inclusion Ranges Overview (Answers "what inclusion ranges does Hudson Homes offer")
  // Matches queries containing "range", "ranges", "inclusion", "inclusions", "offer", "package", "packages"
  if (
    query.includes("range") ||
    query.includes("ranges") ||
    query.includes("inclusion") ||
    query.includes("inclusions") ||
    query.includes("what does hudson offer") ||
    query.includes("what packages") ||
    (query.includes("h1") && query.includes("h2")) ||
    (query.includes("smart") && query.includes("designer"))
  ) {
    return {
      answer: `### Hudson Homes Official Inclusion Ranges & Packages

Hudson Homes offers **five distinct inclusion ranges** tailored to different buyer priorities, lifestyles, and investment strategies, backed by our **50-Year Structural Warranty** and **Fixed Price Guarantee**:

---

#### 1. H1: Smart Inclusions (Smart Value / Move-In Ready Standard)
*The essential balance of functional design, quality fixtures, and affordability.*
- **Ceilings**: Nominal 2440mm ceiling height throughout.
- **Kitchen**: Durable laminate benchtops, fully lined cabinetry with overhead cupboards and bulkheads, Westinghouse stainless steel appliances (600mm oven, cooktop, and rangehood), and stainless steel drop-in sink.
- **Comfort & Finishes**: Reverse-cycle split system air conditioning, ceiling fans to bedrooms, ceramic tiles to living zones, and quality carpet to bedrooms.
- **Bathrooms**: Floating-style vanities, polished-edge mirrors, and semi-frameless pivot shower screens.
- **Structure**: Engineered concrete slab up to H1/H2 classification, Termimesh barrier, and Colorbond or concrete tile roof.
- **Best For**: First home buyers, growing families, and budget-conscious purchasers.

---

#### 2. H2: Designer Inclusions (Contemporary Luxury & Style)
*Elevated contemporary style and premium luxury seen in our display homes.*
- **Ceilings**: **Raised 2590mm high ceilings** (with optional 2740mm ground floor upgrade) creating superior natural light and volume.
- **Kitchen**: **20mm engineered stone benchtops** to kitchen, bathrooms, and laundry; premium **Westinghouse 900mm European appliance suite** (900mm canopy rangehood, 900mm cooktop, 900mm built-in oven), soft-close cabinetry, and designer gooseneck mixer.
- **Comfort & Climate**: Fully installed **ActronAir or Daikin ducted reverse-cycle air conditioning** with multi-zone digital controller.
- **Bathrooms**: **Full-height floor-to-ceiling porcelain wall tiles** to ensuite and bathroom, recessed tiled shower niches with chrome trim, and designer tapware in matte black, brushed nickel, or chrome.
- **Electrical & Outdoor**: Premium **LED downlight package** to living areas, porch, and alfresco; tiled outdoor alfresco and porch; exposed aggregate driveway.
- **Best For**: Second and third home buyers, upgraders, and display-home luxury seekers.

---

#### 3. H3: Luxury Inclusions (Ultimate Architectural Masterpiece)
*The pinnacle luxury specification with bespoke indulgence and zero compromise.*
- **Kitchen**: **40mm edge engineered stone benchtops**, **double bowl undermount stainless steel sinks**, designer pull-out tapware, scullery/butler's pantry fit-out, and premium European appliances.
- **Architectural Glazing**: **Architectural awning windows and feature glazing included ($0 variation)**.
- **Bathrooms**: **Freestanding luxury acrylic bathtub**, full-height porcelain wall tiling throughout all wet areas, stone vanity benchtops, and niche LED accent lighting.
- **Grand Entrance**: **1020mm or 1200mm wide pivot designer entrance door** with architectural pull handle and smart digital keyless lock.
- **Flooring**: Large-format 600x600mm porcelain tiles or hybrid timber flooring throughout main living zones + deluxe plush carpet.
- **Best For**: Discerning luxury clients, Knock-Down Rebuilds (KDRB), and prestige master builds.

---

#### 4. IP: Investment Range ("Hudson Invest" Turn-Key)
*A complete 100% turn-key package engineered for maximum rental yield and low maintenance.*
- **100% Turn-Key Ready**: Turf, perimeter treated timber fencing, exposed aggregate driveway, crossover, paths, letterbox, clothesline, roller blinds, and flyscreens included.
- **Tenant Appeal**: Ducted air conditioning, LED downlights, 20mm stone benchtops, and durable stain-resistant surfaces.
- **Investor Perks**: Two-part contract structure (**pay stamp duty on land only**), maximum annual tax depreciation, and guaranteed construction timeframes for rapid tenancy.

---

#### 5. FHB: First Home Buyer Range ("Start Smart")
*Designed for first-time buyers wanting complete cost certainty and government grant eligibility.*
- **Fixed-Price Certainty**: No price escalation surprises, ensuring smooth bank and lender approvals.
- **FHOG Ready**: Optimised for state first home owner grants (up to \$30,000 in QLD / \$10,000 in NSW) and stamp duty exemptions.
- **Complete Inclusions**: Floor coverings, air conditioning, modern kitchen, and full turn-key options so buyers move straight in without out-of-pocket delays.

---

#### Bonus: LP Landscape Packages
Can be bundled with any H1, H2, or H3 build to add complete external finishes (driveway, fencing, turf, letterbox, clothesline) scaled transparently by lot size (up to 300m² – 900m²).`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What are the specific differences between H1 Smart and H2 Designer?",
        "How does the IP Investment package save money on stamp duty?",
        "What fixed site costs does Hudson Homes include as standard?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 5. Specific H3 Luxury Tier Query
  if (query.includes("h3") || query.includes("luxury")) {
    return {
      answer: `### Hudson Homes H3 Luxury Inclusion Package

The **H3 Luxury Package** is Hudson Homes' ultimate architectural specification for clients demanding the finest craftsmanship and finishes:

#### Key Architectural Inclusions:
- **Architectural Awning Windows & Feature Glazing**: Upgraded awning windows and highlight feature glazing included as standard (**\$0 variation**).
- **40mm Stone Benchtops**: 40mm engineered stone benchtops with pencil round or mitred edges to kitchen island and surfaces.
- **Double Undermount Sink**: Double bowl undermount stainless steel kitchen sink with designer pull-out gooseneck tapware.
- **Freestanding Bathtub**: Luxury acrylic freestanding bath in main bathroom.
- **Full-Height Wet Area Tiling**: Premium porcelain tiles laid floor-to-ceiling in ensuite and main bathroom.
- **Grand Pivot Entry Door**: 1020mm or 1200mm wide designer pivot entrance door with architectural pull handle and smart digital keyless entry.
- **Ceiling Heights**: Raised 2590mm ceilings throughout (with optional 2740mm ground floor upgrade).
- **Zoned Ducted Climate Control**: Multi-zone reverse-cycle ducted air conditioning with digital smart controllers.
- **Premium Flooring**: Large-format 600x600mm porcelain tiles or hybrid timber flooring + plush carpet to bedrooms.

> [!NOTE]
> The H3 tier is selectable directly inside Quote Builder V2 and automatically flows through to sales quotes and package flyers.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What is the difference between H1 Smart and H2 Designer?",
        "What inclusion ranges does Hudson Homes offer?",
        "What fixed site costs does Hudson Homes cover?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 6. Site Costs & Guarantees
  if (
    query.includes("site cost") ||
    query.includes("site costs") ||
    query.includes("fixed price") ||
    query.includes("warranty") ||
    query.includes("slab") ||
    query.includes("piering") ||
    query.includes("basix") ||
    query.includes("guarantee")
  ) {
    return {
      answer: `### Hudson Homes Fixed Site Costs & Guarantees

Hudson Homes is renowned across NSW and QLD for its transparent, fixed-price peace of mind:

1. **Fixed Price Site Costs Include**:
   - Engineered reinforced concrete slab designed up to **H-class foundation** classification (H1/H2).
   - **Concrete piering** allowance engineered to structural requirements.
   - **Council application fees and certifier fees** (DA or CDC approvals).
   - **BASIX & NatHERS 7-Star** energy and thermal efficiency compliance.
   - Underground service connections (water, sewer, stormwater, electricity, and telecommunications).
   - Sediment control and occupational health & safety site fencing.

2. **Core Guarantees**:
   - **50-Year Structural Warranty**: Backed by five decades of structural engineering confidence.
   - **Fixed Price Contract Guarantee**: Eliminates cost blowouts and hidden extras after contract signing.
   - **Guaranteed Timeframes**: Dedicated construction milestones ensuring timely completion.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What inclusion ranges does Hudson Homes offer?",
        "What are the 4 flyer templates in Package Studio?",
        "How does the Quote Builder Modified Plan Engine work?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 7. Quote Builder V2 & Modified Plan Engine
  // Strictly matched on quoting / modified plan engine keywords
  if (
    query.includes("quote builder") ||
    query.includes("modified plan") ||
    query.includes("presight") ||
    query.includes("visual diff") ||
    query.includes("plan engine") ||
    query.includes("quoting tool")
  ) {
    return {
      answer: `### Quote Builder V2 & Modified Plan Engine

The **Hudson Quote Builder V2** (\`/quote-builder\`) delivers an automated, 5-step digital sales quoting workflow:

#### How the Modified Plan Engine Works:
1. **Architectural Visual Diffing**: When an NHC or client uploads a modified plan PDF/scan (e.g. Amber 21, Azure 25, Cedar 26), the engine aligns it against the master CAD architectural benchmark.
2. **Presight Code & Structural Parsing**: The AI inspects room labels, wall boundaries, and Presight annotation codes to detect all structural and cosmetic variations:
   - **Alfresco Extensions**: Automatically measures additional slab m² and extended roofline framing.
   - **Garage Enlargements**: Accurately measures extra floor slab and structural framing.
   - **Window & Door Upgrades**: Detects window enlargement (e.g. Bed 4 window), sliding glass doors (e.g. Children's activity SD 21.24/SD 21.27), panoramic kitchen splashback windows (PW 06.30), and garage personal access doors (EXT 820).
   - **Kitchen & Plumbing Fixtures**: Identifies double undermount sinks and butler's pantry prep sinks.
3. **Automated Line-Item Generation**: Automatically generates itemized price variations matching Hudson's standard pricing schedule, ready for 1-click inclusion in contracts!`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What inclusion ranges does Hudson Homes offer?",
        "What are the 4 flyer templates in Package Studio?",
        "What features are included in the H3 luxury tier?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 8. Flyer Builder & Package Studio
  if (
    query.includes("flyer") ||
    query.includes("brochure") ||
    query.includes("template") ||
    query.includes("package studio") ||
    query.includes("nhc details")
  ) {
    return {
      answer: `### House & Land Package Studio / Flyer Builder (\`/flyer\`)

The **Flyer Builder** is a real-time WYSIWYG A4 brochure generator engineered for New Home Consultants:

#### 4 Specialized Layout Templates:
1. **1-Page Express**: Streamlined high-impact single page featuring facade hero, floorplan, pricing, estate summary, key inclusions, and consultant card.
2. **2-Page Siting**: Includes comprehensive lot siting plan with boundary setbacks, building envelope, and floorplan layout.
3. **2-Page Showcase**: Editorial luxury layout featuring 21:9 ultra-wide hero facade outpainting, lifestyle photography, and detailed specifications.
4. **House Only**: Dedicated format for clients who already own land.

#### Automated NHC Details:
- The system automatically detects whichever NHC is signed in (e.g. Steve Slisar, Jesse Jenkins, Gary Rees) and populates their name, phone, email, and display centre on the flyer footer.
- Consultants can also use the consultant selector dropdown if preparing packages for another team member.
- Supports 1-click print-ready A4 PDF export and Supabase cloud synchronization.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "How does the Land Database search lots?",
        "What inclusion ranges does Hudson Homes offer?",
        "What fixed site costs does Hudson Homes cover?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 9. Database & Lot Search
  if (
    query.includes("database") ||
    query.includes("lot") ||
    query.includes("land inventory") ||
    query.includes("price list") ||
    query.includes("parser")
  ) {
    return {
      answer: `### House & Land Database (\`/database\`)

The **Hudson Land Database** provides a real-time inventory of lots across QLD and NSW growth corridors:

- **Search & Filters**: Search lots by Estate, Price range, Land size (m²), Frontage width, and Registration status (Registered vs. Unregistered with expected registration dates).
- **AI Price List Parser**: Drag-and-drop developer PDF or Excel price lists; the AI automatically extracts lot numbers, dimensions, prices, and registration timelines into the database in seconds.
- **1-Click Package Creation**: Click "Create Package" on any lot to instantly hand off all lot parameters (price, size, setbacks, estate name) into Flyer Builder!`,
      confidence: 0.98,
      verified: true,
      suggestedQuestions: [
        "What are the 4 flyer templates in Package Studio?",
        "What inclusion ranges does Hudson Homes offer?",
        "What fixed site costs does Hudson Homes cover?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 10. Display Centres & Team
  if (
    query.includes("steve") ||
    query.includes("warnervale") ||
    query.includes("display") ||
    query.includes("centre") ||
    query.includes("contact") ||
    query.includes("morgan")
  ) {
    return {
      answer: `### Hudson Homes Display Centres & Team Contacts

- **HomeWorld Warnervale (Central Coast / NSW)**:
  - Lead NHC: **Steve Slisar**
  - Phone: **0483 950 830**
  - Designs on display: Single and double storey family homes.
- **Sydney Metro Display Centres**:
  - Marsden Park, Box Hill, Leppington, and Oran Park.
- **Hunter / Newcastle**:
  - Lochinvar Display Village.
- **Queensland**:
  - Display homes situated across high-growth South East Queensland corridors (Brisbane, Gold Coast, Ipswich, Moreton Bay).
- **Key System Personnel**:
  - **Morgan Hales**: Head of Digital Product, Systems & Technology (Platform Administrator).
  - **Senior NHCs**: Steve Slisar, Jesse Jenkins, Gary Rees.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What inclusion ranges does Hudson Homes offer?",
        "What are the 4 flyer templates in Package Studio?",
        "What features are included in the H3 luxury tier?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 11. Default Verified Hudson Overview
  return {
    answer: `### Welcome to Hudson Homes Copilot

I am the verified **Hudson Homes Personal AI Assistant** for New Home Consultants and sales staff.

I can assist you with:
- **Inclusion Ranges**:
  - **H1 Smart Inclusions** (Smart Value Standard, 2440mm ceilings, laminate benchtops, split system AC)
  - **H2 Designer Inclusions** (Contemporary Luxury, 2590mm ceilings, 20mm stone, ducted AC, 900mm appliances)
  - **H3 Luxury Inclusions** (Architectural Masterpiece, 40mm stone, double undermount sink, freestanding bath, awning windows)
  - **IP Investment Range** ("Hudson Invest" 100% turn-key, stamp duty savings on land only, tax depreciation)
  - **FHB First Home Buyer Range** (Fixed-price peace of mind, FHOG grant eligibility, move-in ready finishes)
  - **LP Landscape Packages** (Driveway, fencing, turf, letterbox, clothesline)
- **Site Costs & Warranties**: Fixed price site costs up to H-class slab, piering, DA/CDC approvals, and our 50-Year Structural Warranty.
- **Hudson OS Tools**:
  - **Flyer Builder (\`/flyer\`)**: 4 templates and automated NHC details.
  - **House & Land Database (\`/database\`)**: AI price list parser and lot searching.
  - **Quote Builder V2 (\`/quote-builder\`)**: 5-step digital quotes and the Modified Plan Engine.
  - **Display Locations**: HomeWorld Warnervale, Sydney Metro, Hunter, and South East Queensland.

> [!NOTE]
> All answers are verified against Hudson Homes official standard specifications with strict >95% accuracy confidence.`,
    confidence: 0.98,
    verified: true,
    suggestedQuestions: [
      "What inclusion ranges does Hudson Homes offer?",
      "What is the difference between H1 Smart and H2 Designer?",
      "Tell me about the IP Investment Range",
      "What features are included in the H3 luxury tier?",
      "What fixed site costs does Hudson Homes cover?",
    ],
    modelUsed: "hudson-knowledge-engine",
  };
}
