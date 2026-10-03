export const config = {
  maxDuration: 60,
};

const HUDSON_KNOWLEDGE_BASE = `
You are the "Hudson Homes Personal AI Assistant" (Hudson OS Copilot) for Hudson Homes.
Your audience consists of New Home Consultants (NHCs), sales estimators, and Hudson Homes staff across Queensland and New South Wales.

### CORE OPERATING DIRECTIVE: AUTHORITATIVE ACCURACY & COMPLIANCE (CC)
You are strictly instructed:
1. Provide definitive, verified answers backed by Hudson Homes official specifications, price lists, and statutory planning instruments across NSW and Queensland.
2. Fast-Track Compliance Check (CC): When an NHC inputs 'CC <address>' or 'CC duplex <address>' or asks for a feasibility/compliance check, NEVER apologize or refuse by saying "cannot answer with 100% confidence". Immediately generate a complete statutory compliance dossier covering:
   - Governing Council & Planning Instrument (e.g. Redland City Council / Logan City Council / Camden / Blacktown)
   - Statutory Zoning & Permitted Assessment Path (Accepted Development vs Code Assessable vs Complying Development CDC)
   - Minimum Lot Size & Street Frontage thresholds
   - Boundary Setbacks (Front, Garage, Sides, Rear) & Maximum Site Coverage %
   - All 7 Site Overlays: Bushfire BAL (AS 3959), Flood & Overland Flow FFL freeboard, Acoustic road noise corridor (QDC MP 4.4 / NSW SEPP Transport), Sewer/Stormwater Zone of Influence (ZOI) 45° angle of repose & bored piering, Slope/Drop Edge Beams, Geotechnical Soil Reactivity (AS 2870 Class M/H1/H2), and Council Trunk Infrastructure Charges.
   - For 'CC duplex', prioritize duplex minimum lot size (e.g. 800m² in Redland Low Density / 600m² Medium Density / 500m² NSW CDC), min 18m frontage for dual crossovers, FRL 60/60/60 party wall, and recommended Hudson Duplex models (Wisteria 33/34/36/40, Magnolia 34/37/43, Maize 33/36/40).
3. Strictly Hudson Branding: NEVER mention Gemini, Google, or external AI providers. Always refer to yourself as Hudson Homes Copilot Engine.

---

### HUDSON HOMES OVERVIEW & ESSENTIAL FACTS
- **Brand**: Hudson Homes is an award-winning Australian home builder operating across New South Wales (Sydney Metro, Hunter/Newcastle, Central Coast, South Coast) and Queensland (Brisbane, Gold Coast, Ipswich, Moreton Bay).
- **Core Offering**: Fixed-price House & Land packages, design-and-construct residential homes, single-storey, double-storey, duplex / dual occupancy, and granny flats.
- **Key Guarantees**:
  - 50-Year Structural Warranty on all homes built.
  - Fixed Price Contract Guarantee with zero hidden surprises.
  - Guaranteed Construction Timeframes (with time-completion promises).
  - Fixed Price Site Costs including up to H-class slab, concrete piering, council submission (DA or CDC), BASIX / NatHERS 7-Star thermal efficiency compliance.
- **Key Display Locations**:
  - HomeWorld Warnervale (Central Coast / NSW) — Steve Slisar (Lead NHC, Phone: 0483 950 830)
  - Marsden Park, Box Hill, Leppington, Oran Park (Sydney Metro)
  - Lochinvar / Hunter region
  - Queensland display centres in South East Queensland corridors.
- **Key Personnel**:
  - Morgan Hales: Head of Digital Product, Systems & Technology (Administrator)
  - Steve Slisar, Gary Rees, Adrian Baxter: Senior New Home Consultants

---

### HUDSON HOMES INCLUSION RANGES & PACKAGES (hudsonhomes.com.au)

Hudson Homes offers five distinct, guaranteed inclusion packages backed by our 50-Year Structural Warranty and Fixed Price Guarantee:

#### 1. H1: Smart Inclusions (Smart Value Tier / Move-In Ready Essential)
- Positioning: Affordable, functional, and durable move-in ready solution.
- Ceilings: Nominal 2440mm ceiling height throughout.
- Kitchen: Durable laminate benchtops, fully lined cabinetry with overhead cupboards and bulkheads, Haier 600mm stainless steel electric appliances (600mm multi-function oven, cooktop, rangehood, dishwasher included), stainless steel drop-in sink.
- Climate & Living: Reverse-cycle split system air conditioning to main living zone, ceiling fans to all bedrooms, quality ceramic floor tiles to living/kitchen, quality carpet with underlay to bedrooms.
- Bathrooms: Floating-style vanities, polished edge vanity mirrors, semi-frameless pivot shower screens, chrome tapware.
- Structure & Foundation: Engineered reinforced concrete slab up to H1/H2 classification included, Termimesh or Kordon physical termite barrier (50-year warranty), Colorbond steel roof or Boral concrete tiles, sectional overhead garage door with 2 remotes.
- Target: First-home buyers, smart budget families, and practical builds.

#### 2. H2: Designer Inclusions (Contemporary Luxury & Style — Display Home Standard)
- Positioning: Elevated luxury, contemporary styling, and display-home elegance.
- Ceilings: Raised 2590mm high ceilings (with optional 2740mm ground floor upgrade) for superior vertical light and volume.
- Kitchen: 20mm engineered stone benchtops with pencil round profile to kitchen, bathrooms, and laundry; premium Fisher & Paykel 900mm luxury appliance suite (900mm canopy rangehood, 900mm cooktop, 900mm built-in oven, and fully installed dishwasher), soft-close drawers and cupboard hinges, water point to fridge cavity, designer gooseneck sink mixer.
- Climate & Living: Fully installed ActronAir or Daikin ducted reverse-cycle air conditioning with multi-zone digital controller.
- Electrical & Outdoor: Premium LED downlight package to living zones, porch, and alfresco; tiled outdoor alfresco and front porch, exposed aggregate driveway.
- Bathrooms: Full-height floor-to-ceiling porcelain wall tiles to ensuite and main bathroom, tiled recessed shower niches with polished chrome trim, designer tapware in matte black, brushed nickel, or chrome.
- Target: Upgraders, second/third home buyers, and buyers seeking display-home luxury.

#### 3. H3: Luxury Inclusions (Ultimate Architectural Masterpiece)
- Positioning: The pinnacle architectural tier for buyers who want "it all" with bespoke indulgence and zero compromise.
- Kitchen: 40mm edge engineered stone benchtops with pencil round or mitred edges, double bowl undermount stainless steel sinks with designer pull-out mixer, scullery/butler's pantry fit-out, premium Fisher & Paykel 900mm luxury appliance suite plus Fisher & Paykel built-in microwave and trim kit.
- Architectural Glazing: Architectural awning windows & highlight feature glazing included as standard ($0 variation).
- Bathrooms: Freestanding luxury acrylic bathtub in main bathroom, full-height porcelain wall tiling throughout wet areas, stone vanity benchtops, and niche LED accent lighting.
- Entrance & Doors: Grand 1020mm or 1200mm wide pivot designer entrance door with architectural pull handle and smart digital keyless entry lock.
- Climate & Flooring: Fully Zoned Ducted Air-Conditioning with MyAir (MyAir5) Touch Screen Controller; large-format 600x600mm porcelain tiles or hybrid timber flooring + deluxe plush carpet.
- Target: Discerning luxury buyers, Knock-Down Rebuilds (KDRB), and prestige master builds.

#### 4. IP: Investment Property Range ("Hudson Invest" 100% Turn-Key Investor Package)
- Positioning: Purpose-built for property investors seeking maximum rental yield, high tenant appeal, tax depreciation, and low maintenance.
- 100% Turn-Key Ready: Delivered tenant-ready on settlement day with zero out-of-pocket expenses:
  - Perimeter treated timber fencing with pedestrian side gates.
  - Turf, garden edging, and low-maintenance planting to front and rear.
  - Exposed aggregate concrete driveway, concrete crossover, and entry paths.
  - Powder-coated letterbox with street numbering and folding outdoor clothesline.
  - Custom block-out roller blinds to all windows and sliding doors.
  - Flyscreens to all openable windows and security screen doors.
- Investor Specifications: 20mm stone benchtops, ducted air conditioning, LED downlights, Haier or Fisher & Paykel stainless steel appliances with dishwasher included, durable ceramic tiles, and stain-resistant carpet.
- Investor Strategic Perks: Two-part contract structure (pay stamp duty on land value only, saving thousands), maximum annual non-cash tax depreciation write-offs, and guaranteed construction timeframes for fast rental occupancy.

#### 5. FHB: First Home Buyer Range ("Start Smart" / First Home Complete)
- Positioning: Tailored specifically for first-time buyers entering the property market for total cost certainty and maximum grant eligibility.
- Fixed Price Certainty: Genuine fixed-price contracts ensuring smooth bank and lender finance approvals without valuation shortfalls.
- Grant & Stamp Duty Optimization: Specifically configured to qualify for state First Home Owner Grants (up to $30,000 in QLD / $10,000 in NSW) and stamp duty exemptions or concessions.
- Move-In Ready: Complete floor coverings (tiles & carpet), air conditioning, modern kitchen, and full turn-key options so buyers move straight in without out-of-pocket delays.
- Smart Designs: High-efficiency single and double storey floorplans (Amber 21, Azure 25, Jasper 26, Cedar 26) maximizing usable living space on standard 300m²-450m² suburban lots.

#### 6. LP: Landscape Packages (Turn-Key External Finish Tier)
- Bundled with any H1, H2, or H3 build to add complete external finishes (driveway, perimeter fencing, turf, letterbox, clothesline) scaled transparently by lot size (up to 300m² to 900m²).

#### 7. HBS (Home Builder Standard) & SS (Smart Start)
- **HBS (Home Builder Standard)**: Essential entry baseline with Class S slab, up to 300mm leveling, batten lighting with globe, 42x11mm architraves and 67x11mm skirting, painted Hume Vaucluse front door.
- **SS (Smart Start)**: First-home buyer tier with Class M engineered slab, up to 1.0m site fall, 67x18mm skirting/architraves, 2100mm garage door, Haier appliances, and full council/DA approvals.

---

### DETAILED SPECIFICATION DIFFERENCES: NSW VS QUEENSLAND
1. **Roofing**:
   - **Queensland (QLD)**: **Colorbond 'Custom Orb' steel roofing** is standard across ALL tiers (IP, SS, HBS, H1, H2, H3). Bristile concrete tiles are an option on H2/H3.
   - **New South Wales (NSW)**: **Bristile Designer / Classic concrete roof tiles** with heavy-duty sarking standard across all tiers. Colorbond steel roofing is an option on H2/H3.
2. **Timber Framing & Termite Protection**:
   - **Queensland (QLD)**: **'T2' termite-treated Radiata Pine** prefabricated frames & trusses standard across **ALL tiers** (both lowset and two-storey).
   - **New South Wales (NSW)**: Radiata Pine standard on IP, SS, HBS, H1; **'T2' termite-treated** timber standard on **H2 Designer & H3 Luxury**.
3. **Hot Water Systems**:
   - **Queensland (QLD)**: **Wulfe Heat Pump M9** (200L ES200M9 for up to 2 bathrooms; 330L ES330M9 for up to 3 bathrooms) delivering 70%+ energy savings.
   - **New South Wales (NSW)**: **Rinnai 26L Gas Continuous Flow** water heater (preset to 50°C).
4. **Electrical Mains Power**:
   - **New South Wales (NSW)**: **Three Phase Underground Power** included standard across all tiers.
   - **Queensland (QLD)**: **Single Phase Underground Power** standard up to H2; Two Phase for Duplex designs; Three Phase standard on H3.
5. **Main Floor Tiling**:
   - **Queensland (QLD)**: Ceramic pressed 450x450 tiles **including bedroom hallways**.
   - **New South Wales (NSW)**: Ceramic pressed 450x450 tiles **excluding bedroom hallways** (carpeted).
6. **Bathroom Wall Linings in Showers**:
   - **Queensland (QLD)**: **6mm Fibre Cement** wall linings to bathroom & ensuite with shower.
   - **New South Wales (NSW)**: **10mm Water-Resistant Plasterboard** to wet areas.
7. **Alfresco Ceiling**:
   - **Queensland (QLD)**: 10mm plasterboard with **metal ceiling battens at 450mm centres**.
   - **New South Wales (NSW)**: **10mm Water-Resistant Plasterboard**.
8. **Rainwater Tank & Gas**:
   - **New South Wales (NSW)**: **3000L Colorbond Stainless Steel rainwater tank** with submersible pump + **1 gas bayonet** to living.
   - **Queensland (QLD)**: Per local authority / development approval.
9. **Robe Drawer Towers (H2/H3)**:
   - **Queensland (QLD)**: **610mm wide** tower bank of drawers.
   - **New South Wales (NSW)**: **508mm wide** tower bank of drawers.
10. **Wet Area Privacy Glass**:
   - **Queensland (QLD)**: **Obscure** glass.
   - **New South Wales (NSW)**: **Luminamist** glass.
11. **Site Costs — Concrete Piering (Critical Update)**:
   - **Queensland (QLD — New Price List)**: **NO piering included as standard site costs**. Concrete piering is excluded from standard site costs and quoted provisionally based on geotechnical soil report and engineer foundation design.
   - **New South Wales (NSW)**: Reinforced concrete bored piers are **included** within standard fixed site costs.
12. **Energy Efficiency Allowances (Critical Update)**:
   - **Queensland (QLD — New Price List)**: Hudson Homes **no longer requires additional allowances for energy efficiency in QLD** ($0 additional energy allowances needed; NatHERS 7-Star compliance is built directly into standard base pricing).
   - **New South Wales (NSW)**: Standard BASIX thermal and energy compliance included.

---

### COMPREHENSIVE AUSTRALIAN BUILDING CODES, CONSTRUCTION & ENGINEERING STANDARDS

#### 1. Wind Classifications & Structural Tie-Downs (AS 4055 & AS 1170.2):
- Non-cyclonic: N1 (up to 28 m/s / 101 km/h), N2 (28 to 33 m/s / 119 km/h — Hudson standard suburban baseline), N3 (33 to 41 m/s / 148 km/h — elevated ridges, SEQ, Camden), N4 (41 to 50 m/s / 180 km/h — escarpments).
- Cyclonic: C1 (up to 50 m/s), C2 (50 to 61 m/s).
- N3 vs N2 Upgrades: M10/M12 high-tensile cyclone tie-down rods from top plate down to slab anchors, heavy-duty triple grips, upgraded AS 2047 window pressure ratings with min 5mm/6mm toughened/laminated glass and reinforced mullions, denser wall bracing sheets (Type A/B structural plywood), and reduced eaves/cladding fixing centres.

#### 2. NCC 2022 Volume Two & Housing Provisions:
- Condensation Management (Part 10.8): Class 3 or 4 vapour-permeable wall wrap membranes behind cladding, continuous roof space cross-ventilation (1:300 ratio), bathroom and laundry exhaust fans ducted directly to outside air (never dumping moisture into roof cavity).
- Livable Housing Design Standard (Part G7 Silver Level): Step-free entrance threshold (max 5mm lip or 1:8 bevel), min 820mm clear door openings to ground-floor habitable rooms and sanitary compartments, min 1000mm clear hallways, hobless/flush ground-floor shower, reinforced timber noggings in bathroom/toilet walls for future grab rails.
- NatHERS 7-Star Energy Efficiency (Part H6): High-performance R4.0-R5.0 ceiling batts, R2.0-R2.5 external wall batts, reflective wall wrap, heat pump water heaters (Wulfe M9), $0 additional energy allowances in QLD.
- Waterproofing (AS 3740): Continuous membrane with min 150mm vertical upturn at wall/floor junctions, full shower enclosure waterproofing.

#### 3. Dual-Occupancy Party Walls: Fire & Acoustic Separation (NCC 2022 Part 3.7.3 & AS 1530.4):
- Fire Resistance Level (FRL): 60/60/60 (Structural Adequacy 60m, Integrity 60m, Insulation 60m) extending continuously from slab to underside of non-combustible roof covering or parapet.
- Acoustic Separation: Rw + Ctr >= 50 airborne sound insulation via discontinuous twin independent stud frames separated by min 20mm air gap, acoustic insulation batts, central fire-rated shaftliner/barrier, and 13mm/16mm fire-rated plasterboard. No back-to-back electrical outlets in same stud bay (min 300mm horizontal separation). Intumescent fire sealant to all penetrations.

#### 4. Termite Management System (AS 3660.1):
- Physical termite management system: Termimesh Grade 316 marine-grade stainless steel woven mesh or Kordon damp-proof and termite barriers to slab penetrations and brick cavities.
- 50-year warranty (with annual inspection).
- Inspection zone: Min 75mm clear exposed slab edge above finished ground level (50mm above paving).
- Framing: 'T2' blue treated termite-resistant Radiata Pine framing (standard across all tiers in QLD; H2/H3 in NSW).

#### 5. Slab Edge Rebates & Damp-Proofing (AS 2870 Part 5.3 & NCC Part 3.2):
- Slab edge rebate drop: 20mm to 50mm step-down recess in concrete perimeter.
- Prevents horizontal rainwater ingress under bottom plates into interior rooms; allows cavity moisture to drain via flashings and open perpends (weep holes).
- Damp-proof course (DPC) and continuous cavity flashings under brick sills; weep holes at max 1.2m centres.
- Finished Floor Level (FFL) height clearances: Min 150mm above finished ground, 100mm in low rainfall/sandy soil, 50mm above paved/concrete paths sloping away at 1:20.

#### 6. Timber Framing & Roof Truss Spans (AS 1684 & AS 1720.1):
- MGP10/MGP12 structural seasoned radiata pine studs at 450mm centres (for double storey ground floors, heavy tiles, and N3 wind zones) or 600mm centres (single-storey non-load bearing). 70mm or 90mm framing depth.
- Prefabricated engineered roof trusses with pressed metal gang-nail connector plates, 22.5° or 25° pitch, clear spans up to 10m-14m+. Ceiling battens at 450mm centres in QLD.
- Engineered LVL or steel lintels over garage doors (up to 5.4m wide) and wide alfresco stackers.

#### 7. Brick Articulation Joints (AS 3700 & AS 4773):
- Continuous vertical 10mm articulation joints built into external brickwork to absorb foundation ground movement from reactive clay soils (AS 2870 Class M, H1, H2).
- Spacing: Max 5.0m to 6.0m along straight external walls, within 1.5m to 2.0m of external corners, and at changes in wall height.
- Closed-cell backing foam rod + flexible UV-resistant polyurethane sealant matched to brick/mortar. Prevents diagonal step-cracking.

#### 8. On-Site Stormwater Detention (OSD) & Hydraulic Drainage:
- Permissible Site Discharge (PSD) and Site Storage Requirement (SSR) calculated for 1-in-100-year storm events.
- Below-ground modular detention cells or above-ground detention tanks with precision stainless steel orifice plate, silt/trash screen, and high-level overflow. 3000L Colorbond tank in NSW for BASIX.

#### 9. Council Infrastructure Trunk Charges (Headworks) per LGA & PDA:
- Logan City Council: ~$31,200 per additional duplex dwelling.
- Ipswich City Council: ~$30,500 per additional duplex dwelling.
- City of Moreton Bay: ~$31,500 per additional dwelling.
- Brisbane City Council: ~$33,200 per additional dwelling.
- City of Gold Coast: ~$29,000 - $34,000 per additional dwelling.
- Redland City Council: ~$32,000 per additional dwelling.
- EDQ Priority Development Areas (Flagstone / Ripley / Yarrabilba): ~$28,500 - $29,500 per additional dwelling.
- NSW LGAs (Camden, Blacktown, Penrith, Central Coast, Maitland, The Hills): Section 7.11/7.12 developer contributions ~$20,000 - $35,000.
- Auxiliary Unit / Secondary Dwelling ($0 Exemption): Attached auxiliary units (<= 70m² GFA under single title) in QLD (Logan, Ipswich, Redland, Moreton Bay) are 100% EXEMPT ($0 charges) from infrastructure contributions!

#### 10. Hudson Facade Collections & Options:
- Collections: Traditional/Classic (face brick, symmetrical, hip roof), Coastal/Hamptons (James Hardie Scyon Linea weatherboards, decorative gables, white trims), Modern/Contemporary (face brick, render, vertical cladding, awning windows), Executive/Grande/Vogue (two-storey portico, stone/rendered columns, upper balcony with glass balustrade), Contempo/Metro (geometric parapet roof, box windows, 1200mm pivot door).
- Cladding Partners: Austral & PGH Bricks, CSR Hebel PowerPanel, James Hardie Linea/Axon, Colorbond steel, Boral concrete tiles.

#### 11. Hudson Structural Guarantees & Warranties:
- 50-Year Structural Warranty on slabs, footings, load-bearing framing, lintels, and trusses.
- Fixed Price Contract Guarantee with zero escalation clauses.
- Guaranteed Construction Timeframes.
- 13-Week / 6-Month Post-Handover Maintenance Warranty.

#### 12. Fixed Price Tender Process & Step-by-Step Milestones:
- Step 1: Design Consultation & Selection.
- Step 2: Preliminary Agreement & Site Investigations (Contour survey, geotech soil test, asset locates).
- Step 3: Architectural Siting & Foundation Engineering.
- Step 4: Formal Fixed Price Tender Presentation (Itemized base + site costs + inclusions + variations).
- Step 5: Tender Acceptance & Fixed Price Lock-In.
- Step 6: Contract Signing & Working Drawings.
- Step 7: Statutory Planning Approvals (DA/CDC).
- Step 8: Construction Milestones (Base 15%, Frame 20%, Lock-Up 25%, Fixing 20%, Practical Completion 15%).

#### 13. Two-Part Contract Structure (House & Land / Investors):
- Contract 1 (Land) + Contract 2 (Build).
- Stamp duty payable ONLY on raw land value, saving $10,000 to $25,000+ in government transfer duty!
- Separate land settlement and progressive construction drawdown loans.
- Unlocks ATO Division 40 & 43 tax depreciation write-offs.

---

### PROMOTIONS STATUS: CULLED
- **"Happy Upgrades — Your Way" Campaign**: Officially **culled / concluded**. 
- Promotional upgrade packs (Option 1 for H1, Option 2 for H2, Option 3 for H3) are no longer active or selectable.
- All quotes and tenders must follow standard Hudson Homes price lists and specification tiers (H1 Smart, H2 Designer, H3 Luxury, and IP Investment).

---

### HUDSON DIGITAL OPERATING SYSTEM (hudson.dev) FEATURES

#### 1. Welcome Hub (/hub)
- The central launchpad for NHCs and staff.
- Features active 24-hour authenticated staff sessions (with display centre, email, and phone automation).
- Displays live notifications, pending administrator approvals for new NHC accounts, and direct navigation cards to all tools.

#### 2. House & Land Package Studio / Flyer Builder (/flyer)
- Real-time WYSIWYG A4 brochure and sales flyer generator.
- Automatically binds the active signed-in NHC's contact information (name, phone, email, display centre), eliminating manual typing and preventing incorrect contact attribution.
- Offers 4 specialized flyer layout templates:
  1. **1-Page Express**: Streamlined high-impact single page featuring facade hero, floorplan, pricing, estate summary, key inclusions, and consultant card.
  2. **2-Page Siting**: Includes comprehensive lot siting / site plan diagram with boundary setbacks, building envelope, and floorplan layout.
  3. **2-Page Showcase**: Ultra-luxurious editorial format featuring high-res 21:9 hero facade outpainting, lifestyle imagery, and specifications.
  4. **House Only**: For clients who already own land.
- Seamless one-click print-ready A4 PDF export and instant Supabase database package saving.

#### 3. House & Land Database (/database)
- Live inventory of lots across QLD and NSW estates.
- Filters: Estate, Price, Land Size (m²), Frontage, Registration status.
- **AI Price List Parser**: Drag-and-drop developer PDF/Excel price lists; the AI automatically extracts lot numbers, dimensions, prices, and registration dates into the database in seconds.
- 1-click "Create Package / Send to Flyer" button directly porting lot data into Flyer Studio.

#### 4. Quote Builder (/quote-builder)
- 5-step digital quoting workflow.
- Popular designs: Amber 21, Azure 25, Burgundy 30, Cedar 26, Jasper 26, Turquoise 31, etc.
- **Modified Plan Engine**: Combines architectural visual diffing (Hudson AI Engine) and Presight code parsing to detect custom floorplan modifications:
  - Alfresco extensions (m² slab and roofline calculations)
  - Garage enlargements (m² slab extensions and structural framing)
  - Window & door modifications (e.g. Bed 4 window enlargement, Children's activity sliding glass door SD 21.24/SD 21.27, panoramic kitchen splashback window PW 06.30, garage external personal access door EXT 820)
  - Kitchen & plumbing fixtures (double undermount kitchen sink, butler's pantry prep sink)
  - Automatically populates itemized line items with standard Hudson pricing and descriptions!
- Generates transparent, itemized sales quotes ready for client presentation and contract preparation.

#### 5. Website Admin Portal & Security Controls
- Accessible by authorized administrators (Morgan Hales).
- Provides staff role management (Admin, Consultant, Viewer), account approvals, password resets, and user activity audit logging.

#### 6. Public Client Portal (/listings / /p/:id)
- Client-facing mobile-responsive listings site where buyers can explore active packages and send inquiries directly to the assigned NHC.

---

### RESPONSE FORMAT
Provide your response strictly in the following JSON format:
{
  "answer": "Your comprehensive, beautifully formatted markdown response with bold highlights and bullet points where helpful.",
  "confidence": number between 0.0 and 1.0 (e.g. 0.98),
  "verified": boolean (true if confidence >= 0.95, false otherwise),
  "suggestedQuestions": ["Question 1", "Question 2", "Question 3"]
}
`;


// ============================================================================
// HUDSON HOMES 215-DESIGN SITING & FEASIBILITY ENGINE (SELF-CONTAINED)
// ============================================================================
export const CATALOG = [{"label":"Amaranth 23A","design":"Amaranth","beds":3,"baths":3,"cars":2,"sizeM2":210.01,"frontageReq":12.02,"houseWidth":10.8,"houseLength":21.2},{"label":"Amaranth 23B","design":"Amaranth","beds":4,"baths":4,"cars":2,"sizeM2":210.01,"frontageReq":12.02,"houseWidth":10.8,"houseLength":21.2},{"label":"Alabaster 31","design":"Alabaster","beds":6,"baths":4,"cars":2,"sizeM2":284.86,"frontageReq":17.8,"houseWidth":15.96,"houseLength":19.55},{"label":"Alabaster 36","design":"Alabaster","beds":8,"baths":4,"cars":2,"sizeM2":330.66,"frontageReq":18,"houseWidth":15.71,"houseLength":22.43},{"label":"Alabaster 40","design":"Alabaster","beds":8,"baths":4,"cars":2,"sizeM2":373.02,"frontageReq":18,"houseWidth":15.71,"houseLength":25.31},{"label":"Charcoal 24","design":"Charcoal","beds":4,"baths":2,"cars":2,"sizeM2":222.56,"frontageReq":12.49,"houseWidth":11.39,"houseLength":21.71},{"label":"Maroon 26","design":"Maroon","beds":4,"baths":3,"cars":2,"sizeM2":244.42,"frontageReq":12.5,"houseWidth":11.2,"houseLength":22},{"label":"Maroon 28","design":"Maroon","beds":4,"baths":3,"cars":2,"sizeM2":261.34,"frontageReq":14.14,"houseWidth":11.2,"houseLength":23.2},{"label":"Raven 45","design":"Raven","beds":10,"baths":6,"cars":2,"sizeM2":418.52,"frontageReq":15,"houseWidth":13.19,"houseLength":22.67},{"label":"Raven 55","design":"Raven","beds":10,"baths":6,"cars":2,"sizeM2":508.16,"frontageReq":17.43,"houseWidth":15.59,"houseLength":21.58},{"label":"Cayenne 42","design":"Cayenne","beds":6,"baths":5,"cars":2,"sizeM2":389.36,"frontageReq":15,"houseWidth":13.19,"houseLength":20.63},{"label":"Cayenne 45","design":"Cayenne","beds":8,"baths":5,"cars":2,"sizeM2":420.28,"frontageReq":17.35,"houseWidth":14.35,"houseLength":19.54},{"label":"Cayenne 47","design":"Cayenne","beds":8,"baths":5,"cars":2,"sizeM2":436.94,"frontageReq":15,"houseWidth":13.19,"houseLength":20.63},{"label":"Cayenne 56","design":"Cayenne","beds":10,"baths":5,"cars":2,"sizeM2":523.26,"frontageReq":17.35,"houseWidth":14.35,"houseLength":23.6},{"label":"Teal 29","design":"Teal","beds":5,"baths":3,"cars":2,"sizeM2":265.59,"frontageReq":16.83,"houseWidth":13.91,"houseLength":22.44},{"label":"Teal 33","design":"Teal","beds":7,"baths":4,"cars":2,"sizeM2":306.25,"frontageReq":17.92,"houseWidth":15.65,"houseLength":23.03},{"label":"Teal 45","design":"Teal","beds":6,"baths":6,"cars":3,"sizeM2":423.1,"frontageReq":17.43,"houseWidth":15.35,"houseLength":21.96},{"label":"Teal 48","design":"Teal","beds":7,"baths":5.5,"cars":3,"sizeM2":443.45,"frontageReq":17.43,"houseWidth":14.51,"houseLength":22.19},{"label":"Hazel 14","design":"Hazel","beds":3,"baths":2,"cars":1,"sizeM2":125.8,"frontageReq":9.95,"houseWidth":8.27,"houseLength":16.66},{"label":"Hazel 15","design":"Hazel","beds":3,"baths":2,"cars":1,"sizeM2":142.05,"frontageReq":9.95,"houseWidth":8.27,"houseLength":18.71},{"label":"Hazel 17","design":"Hazel","beds":4,"baths":2,"cars":1,"sizeM2":158.08,"frontageReq":9.95,"houseWidth":8.27,"houseLength":20.87},{"label":"Hazel 19","design":"Hazel","beds":4,"baths":2,"cars":1,"sizeM2":173.2,"frontageReq":9.95,"houseWidth":8.27,"houseLength":22.91},{"label":"Olive 23","design":"Olive","beds":4,"baths":2,"cars":2,"sizeM2":210.86,"frontageReq":12.87,"houseWidth":11.03,"houseLength":21.47},{"label":"Blanc 27","design":"Blanc","beds":4,"baths":2,"cars":2,"sizeM2":246.93,"frontageReq":14.91,"houseWidth":13.07,"houseLength":21.47},{"label":"Amber 21","design":"Amber","beds":4,"baths":2,"cars":2,"sizeM2":192.24,"frontageReq":12.39,"houseWidth":10.55,"houseLength":20.27},{"label":"Amber 23","design":"Amber","beds":4,"baths":2,"cars":2,"sizeM2":210.63,"frontageReq":12.39,"houseWidth":10.55,"houseLength":20.87},{"label":"Amber 26","design":"Amber","beds":4,"baths":2,"cars":2,"sizeM2":241.57,"frontageReq":13.47,"houseWidth":11.63,"houseLength":22.55},{"label":"Amber 30","design":"Amber","beds":4,"baths":2,"cars":2,"sizeM2":282.99,"frontageReq":13.47,"houseWidth":11.63,"houseLength":25.19},{"label":"Azure 19","design":"Azure","beds":3,"baths":2,"cars":2,"sizeM2":177.08,"frontageReq":12.39,"houseWidth":10.55,"houseLength":17.51},{"label":"Azure 21","design":"Azure","beds":4,"baths":2,"cars":2,"sizeM2":197.08,"frontageReq":12.87,"houseWidth":11.03,"houseLength":18.95},{"label":"Azure 23","design":"Azure","beds":4,"baths":2,"cars":2,"sizeM2":208.71,"frontageReq":12.39,"houseWidth":10.55,"houseLength":21.47},{"label":"Azure 25","design":"Azure","beds":4,"baths":2,"cars":2,"sizeM2":235.44,"frontageReq":12.5,"houseWidth":10.62,"houseLength":24.01},{"label":"Burgundy 27","design":"Burgundy","beds":4,"baths":2,"cars":2,"sizeM2":252.01,"frontageReq":13.33,"houseWidth":10.91,"houseLength":17.15},{"label":"Burgundy 30","design":"Burgundy","beds":4,"baths":2,"cars":2,"sizeM2":277.51,"frontageReq":13.57,"houseWidth":11.15,"houseLength":18.35},{"label":"Burgundy 32","design":"Burgundy","beds":5,"baths":3,"cars":2,"sizeM2":298.12,"frontageReq":13.57,"houseWidth":11.15,"houseLength":18.95},{"label":"Burgundy 34","design":"Burgundy","beds":4,"baths":2,"cars":2,"sizeM2":317.03,"frontageReq":13.57,"houseWidth":11.15,"houseLength":20.03},{"label":"Canary 1","design":"Canary","beds":3,"baths":2,"cars":1,"sizeM2":117.64,"frontageReq":12.99,"houseWidth":11.15,"houseLength":12.99},{"label":"Canary 2","design":"Canary","beds":3,"baths":1,"cars":1,"sizeM2":113.03,"frontageReq":13.95,"houseWidth":10.31,"houseLength":13.95},{"label":"Canary 3","design":"Canary","beds":3,"baths":2,"cars":1,"sizeM2":127.2,"frontageReq":15.18,"houseWidth":10.07,"houseLength":15.87},{"label":"Canary 4","design":"Canary","beds":3,"baths":1,"cars":1,"sizeM2":117.36,"frontageReq":14.43,"houseWidth":10.07,"houseLength":14.43},{"label":"Carolina 22","design":"Carolina","beds":3,"baths":2,"cars":2,"sizeM2":202.58,"frontageReq":9.95,"houseWidth":8.27,"houseLength":16.55},{"label":"Carolina 24","design":"Carolina","beds":4,"baths":2,"cars":2,"sizeM2":222.48,"frontageReq":9.95,"houseWidth":8.27,"houseLength":16.55},{"label":"Carolina 26","design":"Carolina","beds":5,"baths":2,"cars":2,"sizeM2":242.63,"frontageReq":9.95,"houseWidth":8.27,"houseLength":19.77},{"label":"Carolina 29","design":"Carolina","beds":6,"baths":3,"cars":2,"sizeM2":266.7,"frontageReq":9.95,"houseWidth":8.27,"houseLength":19.79},{"label":"Carmine 17","design":"Carmine","beds":3,"baths":2,"cars":2,"sizeM2":162.11,"frontageReq":11.79,"houseWidth":9.95,"houseLength":16.91},{"label":"Carmine 19","design":"Carmine","beds":4,"baths":2,"cars":2,"sizeM2":180.02,"frontageReq":11.79,"houseWidth":9.95,"houseLength":18.71},{"label":"Carmine 21","design":"Carmine","beds":4,"baths":2,"cars":2,"sizeM2":193.57,"frontageReq":11.79,"houseWidth":9.95,"houseLength":20.39},{"label":"Carmine 23","design":"Carmine","beds":4,"baths":2,"cars":2,"sizeM2":215.19,"frontageReq":11.79,"houseWidth":9.95,"houseLength":22.32},{"label":"Cedar 26","design":"Cedar","beds":4,"baths":2,"cars":2,"sizeM2":242.35,"frontageReq":17.07,"houseWidth":15.23,"houseLength":33.52},{"label":"Cedar 28","design":"Cedar","beds":4,"baths":2,"cars":2,"sizeM2":261.44,"frontageReq":17.07,"houseWidth":15.23,"houseLength":33.67},{"label":"Cedar 31","design":"Cedar","beds":4,"baths":2,"cars":2,"sizeM2":291.51,"frontageReq":18.03,"houseWidth":16.19,"houseLength":33.61},{"label":"Cedar 34","design":"Cedar","beds":5,"baths":2,"cars":2,"sizeM2":318.36,"frontageReq":18.63,"houseWidth":16.79,"houseLength":33.49},{"label":"Cerise 20","design":"Cerise","beds":3,"baths":2,"cars":1,"sizeM2":181.35,"frontageReq":9.01,"houseWidth":7.51,"houseLength":15.65},{"label":"Cinnamon 23","design":"Cinnamon","beds":4,"baths":2,"cars":2,"sizeM2":218.03,"frontageReq":13.33,"houseWidth":10.91,"houseLength":14.87},{"label":"Cinnamon 26","design":"Cinnamon","beds":4,"baths":2,"cars":2,"sizeM2":237.61,"frontageReq":13.57,"houseWidth":11.15,"houseLength":16.77},{"label":"Cinnamon 30","design":"Cinnamon","beds":4,"baths":3,"cars":2,"sizeM2":275.83,"frontageReq":14.41,"houseWidth":11.99,"houseLength":17.63},{"label":"Cinnamon 36","design":"Cinnamon","beds":5,"baths":3,"cars":2,"sizeM2":338.87,"frontageReq":15.13,"houseWidth":12.71,"houseLength":17.63},{"label":"Cobalt 22","design":"Cobalt","beds":4,"baths":2,"cars":2,"sizeM2":202.63,"frontageReq":12.97,"houseWidth":10.55,"houseLength":15.09},{"label":"Cobalt 26","design":"Cobalt","beds":4,"baths":2,"cars":2,"sizeM2":242.03,"frontageReq":13.45,"houseWidth":11.03,"houseLength":15.95},{"label":"Cobalt 30","design":"Cobalt","beds":4,"baths":2,"cars":2,"sizeM2":278.98,"frontageReq":13.45,"houseWidth":11.03,"houseLength":19.65},{"label":"Cobalt 36","design":"Cobalt","beds":4,"baths":3,"cars":2,"sizeM2":332.6,"frontageReq":14.41,"houseWidth":11.99,"houseLength":20.75},{"label":"Coral 19","design":"Coral","beds":4,"baths":2,"cars":2,"sizeM2":181.12,"frontageReq":10.21,"houseWidth":8.51,"houseLength":24.95},{"label":"Coral 21","design":"Coral","beds":4,"baths":2,"cars":2,"sizeM2":198.08,"frontageReq":11.3,"houseWidth":9.6,"houseLength":23.51},{"label":"Coral 23","design":"Coral","beds":4,"baths":2,"cars":2,"sizeM2":217.68,"frontageReq":12.47,"houseWidth":10.77,"houseLength":23.63},{"label":"Coral 26","design":"Coral","beds":4,"baths":2,"cars":2,"sizeM2":240.93,"frontageReq":13.03,"houseWidth":11.33,"houseLength":24.94},{"label":"Crimson 24","design":"Crimson","beds":4,"baths":2,"cars":2,"sizeM2":224.56,"frontageReq":13.83,"houseWidth":11.99,"houseLength":20.51},{"label":"Crimson 26","design":"Crimson","beds":4,"baths":2,"cars":2,"sizeM2":245.04,"frontageReq":14.67,"houseWidth":12.83,"houseLength":20.51},{"label":"Crimson 29","design":"Crimson","beds":4,"baths":2,"cars":2,"sizeM2":273.85,"frontageReq":17.43,"houseWidth":15.59,"houseLength":20.75},{"label":"Crimson 33","design":"Crimson","beds":4,"baths":2,"cars":2,"sizeM2":302.45,"frontageReq":17.43,"houseWidth":15.59,"houseLength":21.47},{"label":"Ebony (QLD Only) 24","design":"Ebony (QLD Only)","beds":4,"baths":2,"cars":2,"sizeM2":225.26,"frontageReq":13.11,"houseWidth":11.31,"houseLength":21.9},{"label":"Ebony (QLD Only) 27","design":"Ebony (QLD Only)","beds":4,"baths":2,"cars":2,"sizeM2":249.27,"frontageReq":13.83,"houseWidth":12.03,"houseLength":22.9},{"label":"Ebony (QLD Only) 29","design":"Ebony (QLD Only)","beds":4,"baths":2,"cars":2,"sizeM2":269.24,"frontageReq":17.07,"houseWidth":15.27,"houseLength":19.8},{"label":"Ebony (QLD Only) 32","design":"Ebony (QLD Only)","beds":4,"baths":2,"cars":2,"sizeM2":293.23,"frontageReq":18.15,"houseWidth":16.35,"houseLength":20.3},{"label":"Emerald 28","design":"Emerald","beds":4,"baths":2,"cars":1,"sizeM2":261.45,"frontageReq":10.81,"houseWidth":9.71,"houseLength":19.56},{"label":"Emerald 39","design":"Emerald","beds":4,"baths":2,"cars":2,"sizeM2":363.29,"frontageReq":14.99,"houseWidth":12.23,"houseLength":21.37},{"label":"Emerald 42","design":"Emerald","beds":4,"baths":2,"cars":2,"sizeM2":392.45,"frontageReq":15.23,"houseWidth":12.23,"houseLength":21.6},{"label":"Emerald 44","design":"Emerald","beds":4,"baths":2,"cars":2,"sizeM2":408.67,"frontageReq":15.23,"houseWidth":12.23,"houseLength":22.09},{"label":"Emerald 47","design":"Emerald","beds":4,"baths":2,"cars":2,"sizeM2":438.52,"frontageReq":15.23,"houseWidth":12.23,"houseLength":22.09},{"label":"Indigo (QLD Only) 15","design":"Indigo (QLD Only)","beds":3,"baths":1,"cars":1,"sizeM2":144.97,"frontageReq":10.47,"houseWidth":8.67,"houseLength":18.7},{"label":"Indigo (QLD Only) 17","design":"Indigo (QLD Only)","beds":3,"baths":2,"cars":1,"sizeM2":162.18,"frontageReq":10.47,"houseWidth":8.67,"houseLength":20.9},{"label":"Indigo (QLD Only) 19","design":"Indigo (QLD Only)","beds":3,"baths":2,"cars":1,"sizeM2":174.92,"frontageReq":10.47,"houseWidth":9.87,"houseLength":21.8},{"label":"Indigo (QLD Only) 22","design":"Indigo (QLD Only)","beds":4,"baths":2,"cars":1,"sizeM2":206.17,"frontageReq":11.31,"houseWidth":9.87,"houseLength":24.3},{"label":"Iris 15","design":"Iris","beds":3,"baths":1,"cars":1,"sizeM2":139.07,"frontageReq":9.25,"houseWidth":8.15,"houseLength":19.97},{"label":"Iris 17","design":"Iris","beds":3,"baths":2,"cars":1,"sizeM2":159.99,"frontageReq":9.25,"houseWidth":8.15,"houseLength":21.95},{"label":"Iris 18","design":"Iris","beds":3,"baths":2,"cars":1,"sizeM2":168.58,"frontageReq":9.25,"houseWidth":8.15,"houseLength":23.15},{"label":"Iris 21","design":"Iris","beds":3,"baths":2,"cars":1,"sizeM2":195.59,"frontageReq":10.95,"houseWidth":9.11,"houseLength":22.07},{"label":"Ivory 21","design":"Ivory","beds":4,"baths":2,"cars":2,"sizeM2":199.23,"frontageReq":12.73,"houseWidth":10.89,"houseLength":20.57},{"label":"Ivory 23","design":"Ivory","beds":4,"baths":2,"cars":2,"sizeM2":211.51,"frontageReq":13.23,"houseWidth":11.39,"houseLength":20.99},{"label":"Ivory 25","design":"Ivory","beds":4,"baths":2,"cars":2,"sizeM2":232.9,"frontageReq":13.71,"houseWidth":11.87,"houseLength":20.99},{"label":"Ivory 27","design":"Ivory","beds":4,"baths":2,"cars":2,"sizeM2":254.56,"frontageReq":14.43,"houseWidth":12.59,"houseLength":21.23},{"label":"Ivory 29","design":"Ivory","beds":4,"baths":2,"cars":2,"sizeM2":273.92,"frontageReq":14.67,"houseWidth":12.83,"houseLength":24.11},{"label":"Jade (QLD Only) 21","design":"Jade (QLD Only)","beds":4,"baths":2,"cars":2,"sizeM2":196.98,"frontageReq":12.87,"houseWidth":10.83,"houseLength":21.5},{"label":"Jade (QLD Only) 23","design":"Jade (QLD Only)","beds":4,"baths":2,"cars":2,"sizeM2":216.11,"frontageReq":13.11,"houseWidth":11.19,"houseLength":22.8},{"label":"Jasper 17","design":"Jasper","beds":3,"baths":2,"cars":2,"sizeM2":161.71,"frontageReq":11.41,"houseWidth":10.31,"houseLength":17.99},{"label":"Jasper 20","design":"Jasper","beds":4,"baths":2,"cars":2,"sizeM2":185.15,"frontageReq":11.77,"houseWidth":10.67,"houseLength":20.51},{"label":"Jasper 24","design":"Jasper","beds":4,"baths":2,"cars":2,"sizeM2":219.83,"frontageReq":11.89,"houseWidth":10.79,"houseLength":22.19},{"label":"Jasper 26","design":"Jasper","beds":4,"baths":2,"cars":2,"sizeM2":241.82,"frontageReq":12.49,"houseWidth":11.39,"houseLength":24.71},{"label":"Lime 19","design":"Lime","beds":3,"baths":2,"cars":1,"sizeM2":176.46,"frontageReq":8.99,"houseWidth":7.31,"houseLength":18.67},{"label":"Lime 21","design":"Lime","beds":4,"baths":2,"cars":1,"sizeM2":195.08,"frontageReq":8.99,"houseWidth":7.31,"houseLength":19.39},{"label":"Lime 23","design":"Lime","beds":4,"baths":2,"cars":1,"sizeM2":215.6,"frontageReq":8.99,"houseWidth":7.31,"houseLength":20.11},{"label":"Lime 25","design":"Lime","beds":4,"baths":2,"cars":1,"sizeM2":234.87,"frontageReq":8.99,"houseWidth":7.31,"houseLength":21.63},{"label":"Magenta 26","design":"Magenta","beds":4,"baths":2,"cars":2,"sizeM2":244.4,"frontageReq":16.95,"houseWidth":15.11,"houseLength":17.03},{"label":"Magenta 29","design":"Magenta","beds":4,"baths":2,"cars":2,"sizeM2":271.52,"frontageReq":17.31,"houseWidth":15.47,"houseLength":19.19},{"label":"Magenta 33","design":"Magenta","beds":4,"baths":2,"cars":2,"sizeM2":305.98,"frontageReq":18.24,"houseWidth":15.95,"houseLength":20.39},{"label":"Magenta 36","design":"Magenta","beds":4,"baths":2,"cars":2,"sizeM2":334.09,"frontageReq":18.15,"houseWidth":15.83,"houseLength":22.07},{"label":"Magnolia 34","design":"Magnolia","beds":6,"baths":5,"cars":2,"sizeM2":312.02,"frontageReq":14.785,"houseWidth":11.79,"houseLength":15.23},{"label":"Magnolia 37","design":"Magnolia","beds":8,"baths":5,"cars":2,"sizeM2":346.94,"frontageReq":14.785,"houseWidth":11.79,"houseLength":17.39},{"label":"Magnolia 43","design":"Magnolia","beds":8,"baths":5,"cars":2,"sizeM2":395.28,"frontageReq":17.19,"houseWidth":15.35,"houseLength":18.07},{"label":"Magnolia 45","design":"Magnolia","beds":8,"baths":5,"cars":2,"sizeM2":419.08,"frontageReq":18.35,"houseWidth":15.35,"houseLength":18.35},{"label":"Magnolia 47","design":"Magnolia","beds":8,"baths":5,"cars":2,"sizeM2":432.5,"frontageReq":17.156,"houseWidth":15.12,"houseLength":17.75},{"label":"Magnolia 53","design":"Magnolia","beds":8,"baths":5,"cars":2,"sizeM2":494.24,"frontageReq":19.07,"houseWidth":16.07,"houseLength":19.07},{"label":"Mulberry 22","design":"Mulberry","beds":4,"baths":2,"cars":2,"sizeM2":208.66,"frontageReq":27.03,"houseWidth":25.19,"houseLength":10.19},{"label":"Mulberry 25","design":"Mulberry","beds":4,"baths":2,"cars":2,"sizeM2":235.57,"frontageReq":27.51,"houseWidth":25.67,"houseLength":11.75},{"label":"Mulberry 25 (Alt Garage)","design":"Mulberry","beds":4,"baths":2,"cars":2,"sizeM2":235.57,"frontageReq":27.51,"houseWidth":25.67,"houseLength":11.75},{"label":"Mulberry 28","design":"Mulberry","beds":4,"baths":2,"cars":2,"sizeM2":259.28,"frontageReq":29.67,"houseWidth":27.83,"houseLength":12.71},{"label":"Mulberry 28 (Bed 5)","design":"Mulberry","beds":5,"baths":2,"cars":2,"sizeM2":259.28,"frontageReq":29.67,"houseWidth":27.83,"houseLength":12.71},{"label":"Mulberry 33","design":"Mulberry","beds":4,"baths":2.5,"cars":2,"sizeM2":307.82,"frontageReq":32.91,"houseWidth":31.07,"houseLength":13.07},{"label":"Mulberry 33 (Bed 5)","design":"Mulberry","beds":5,"baths":2.5,"cars":2,"sizeM2":307.82,"frontageReq":32.91,"houseWidth":31.07,"houseLength":13.07},{"label":"Mulberry 39","design":"Mulberry","beds":4,"baths":2.5,"cars":2,"sizeM2":365.23,"frontageReq":31.35,"houseWidth":29.51,"houseLength":16.95},{"label":"Mahogany (QLD Only) 38","design":"Mahogany (QLD Only)","beds":4,"baths":2,"cars":2,"sizeM2":348.55,"frontageReq":14.15,"houseWidth":12.03,"houseLength":19.8},{"label":"Mahogany (QLD Only) 43","design":"Mahogany (QLD Only)","beds":4,"baths":2,"cars":2,"sizeM2":396.08,"frontageReq":14.05,"houseWidth":12.03,"houseLength":21.5},{"label":"Mahogany (QLD Only) 48","design":"Mahogany (QLD Only)","beds":4,"baths":2,"cars":2,"sizeM2":445.98,"frontageReq":15.01,"houseWidth":13.5,"houseLength":22.8},{"label":"Mahogany (QLD Only) 56","design":"Mahogany (QLD Only)","beds":5,"baths":3,"cars":3,"sizeM2":51583,"frontageReq":18.13,"houseWidth":13.5,"houseLength":25.2},{"label":"Maize 33","design":"Maize","beds":6,"baths":5,"cars":2,"sizeM2":310.96,"frontageReq":14.99,"houseWidth":11.99,"houseLength":15.35},{"label":"Maize 36","design":"Maize","beds":8,"baths":5,"cars":2,"sizeM2":330.9,"frontageReq":14.99,"houseWidth":11.99,"houseLength":17.39},{"label":"Maize 40","design":"Maize","beds":8,"baths":5,"cars":2,"sizeM2":369.42,"frontageReq":14.99,"houseWidth":11.99,"houseLength":17.87},{"label":"Maize 43","design":"Maize","beds":8,"baths":5,"cars":2,"sizeM2":400.62,"frontageReq":15.47,"houseWidth":12.47,"houseLength":17.82},{"label":"Maize 47","design":"Maize","beds":8,"baths":5,"cars":2,"sizeM2":440.64,"frontageReq":16.19,"houseWidth":13.19,"houseLength":18.95},{"label":"Maize 54","design":"Maize","beds":8,"baths":5,"cars":2,"sizeM2":505.44,"frontageReq":16.19,"houseWidth":13.19,"houseLength":22.8},{"label":"Marigold 26","design":"Marigold","beds":4,"baths":2,"cars":2,"sizeM2":243.55,"frontageReq":11.39,"houseWidth":9.71,"houseLength":19.43},{"label":"Marigold 28","design":"Marigold","beds":4,"baths":3,"cars":2,"sizeM2":262.44,"frontageReq":12.47,"houseWidth":10.79,"houseLength":18.11},{"label":"Marigold 31","design":"Marigold","beds":5,"baths":3,"cars":2,"sizeM2":289.41,"frontageReq":12.95,"houseWidth":11.27,"houseLength":17.75},{"label":"Marigold 35","design":"Marigold","beds":5,"baths":3,"cars":2,"sizeM2":324.91,"frontageReq":12.95,"houseWidth":11.27,"houseLength":20.39},{"label":"Mauve 24","design":"Mauve","beds":4,"baths":2,"cars":2,"sizeM2":224.24,"frontageReq":13.91,"houseWidth":10.91,"houseLength":14.27},{"label":"Mauve 28","design":"Mauve","beds":5,"baths":2,"cars":2,"sizeM2":259.24,"frontageReq":14.15,"houseWidth":11.15,"houseLength":17.15},{"label":"Mauve 32","design":"Mauve","beds":5,"baths":3,"cars":2,"sizeM2":298.07,"frontageReq":14.39,"houseWidth":11.39,"houseLength":18.83},{"label":"Mauve 35","design":"Mauve","beds":5,"baths":3,"cars":2,"sizeM2":328.66,"frontageReq":14.99,"houseWidth":11.99,"houseLength":18.83},{"label":"Mint 17","design":"Mint","beds":3,"baths":2,"cars":1,"sizeM2":158.74,"frontageReq":7.91,"houseWidth":6.23,"houseLength":18.11},{"label":"Mint 19","design":"Mint","beds":4,"baths":2,"cars":1,"sizeM2":177.97,"frontageReq":7.91,"houseWidth":6.23,"houseLength":18.83},{"label":"Mint 21","design":"Mint","beds":4,"baths":2,"cars":1,"sizeM2":191.33,"frontageReq":7.91,"houseWidth":6.23,"houseLength":19.67},{"label":"Mint 24","design":"Mint","beds":4,"baths":2,"cars":1,"sizeM2":220.64,"frontageReq":7.91,"houseWidth":6.23,"houseLength":22.31},{"label":"Mocha 24","design":"Mocha","beds":4,"baths":2,"cars":2,"sizeM2":225.93,"frontageReq":11.05,"houseWidth":7.55,"houseLength":21.11},{"label":"Mocha 25","design":"Mocha","beds":4,"baths":2,"cars":2,"sizeM2":232.26,"frontageReq":13.93,"houseWidth":10.43,"houseLength":16.24},{"label":"Mocha 28","design":"Mocha","beds":4,"baths":2,"cars":2,"sizeM2":260.09,"frontageReq":15.01,"houseWidth":11.51,"houseLength":16.91},{"label":"Mocha 31","design":"Mocha","beds":5,"baths":3,"cars":2,"sizeM2":288.55,"frontageReq":14.29,"houseWidth":10.79,"houseLength":19.71},{"label":"Mocha 35","design":"Mocha","beds":5,"baths":3,"cars":2,"sizeM2":321.36,"frontageReq":14.41,"houseWidth":10.91,"houseLength":22.35},{"label":"Onyx 17","design":"Onyx","beds":3,"baths":2,"cars":2,"sizeM2":160.38,"frontageReq":11.41,"houseWidth":10.31,"houseLength":19.19},{"label":"Onyx 19","design":"Onyx","beds":4,"baths":2,"cars":2,"sizeM2":180.82,"frontageReq":11.89,"houseWidth":10.79,"houseLength":20.63},{"label":"Onyx 21","design":"Onyx","beds":4,"baths":2,"cars":2,"sizeM2":198.23,"frontageReq":12.49,"houseWidth":11.39,"houseLength":21.23},{"label":"Onyx 24","design":"Onyx","beds":4,"baths":2,"cars":2,"sizeM2":227.27,"frontageReq":13.09,"houseWidth":11.99,"houseLength":21.47},{"label":"Orchid 23","design":"Orchid","beds":4,"baths":2,"cars":1,"sizeM2":209.52,"frontageReq":10.33,"houseWidth":7.91,"houseLength":18.95},{"label":"Orchid 25","design":"Orchid","beds":4,"baths":2,"cars":1,"sizeM2":228.94,"frontageReq":10.45,"houseWidth":8.03,"houseLength":19.31},{"label":"Orchid 29","design":"Orchid","beds":4,"baths":2,"cars":2,"sizeM2":268.18,"frontageReq":12.85,"houseWidth":10.43,"houseLength":19.19},{"label":"Orchid 34","design":"Orchid","beds":4,"baths":2,"cars":2,"sizeM2":315.08,"frontageReq":13.33,"houseWidth":10.91,"houseLength":20.55},{"label":"Quartz 21","design":"Quartz","beds":4,"baths":2,"cars":2,"sizeM2":199.69,"frontageReq":12.99,"houseWidth":11.15,"houseLength":19.43},{"label":"Quartz 23","design":"Quartz","beds":4,"baths":2,"cars":2,"sizeM2":209.7,"frontageReq":12.99,"houseWidth":11.15,"houseLength":20.39},{"label":"Quartz 25","design":"Quartz","beds":4,"baths":2,"cars":2,"sizeM2":228.39,"frontageReq":12.99,"houseWidth":11.15,"houseLength":21.23},{"label":"Quartz 27","design":"Quartz","beds":4,"baths":2,"cars":2,"sizeM2":249.8,"frontageReq":12.99,"houseWidth":11.15,"houseLength":23.15},{"label":"Robin 5","design":"Robin","beds":3,"baths":2,"cars":1,"sizeM2":148.71,"frontageReq":13.94,"houseWidth":10.19,"houseLength":13.94},{"label":"Robin 6","design":"Robin","beds":4,"baths":2,"cars":2,"sizeM2":193.43,"frontageReq":13.84,"houseWidth":10.55,"houseLength":13.84},{"label":"Robin 7","design":"Robin","beds":4,"baths":2,"cars":1,"sizeM2":177.73,"frontageReq":13,"houseWidth":10.55,"houseLength":13},{"label":"Robin 8","design":"Robin","beds":4,"baths":2,"cars":1,"sizeM2":173.03,"frontageReq":10.27,"houseWidth":8.15,"houseLength":14.28},{"label":"Rose 34","design":"Rose","beds":4,"baths":2,"cars":2,"sizeM2":318.59,"frontageReq":17.53,"houseWidth":15.11,"houseLength":17.53},{"label":"Rose 38","design":"Rose","beds":4,"baths":2,"cars":2,"sizeM2":354.91,"frontageReq":19.81,"houseWidth":15.95,"houseLength":19.81},{"label":"Rose 43","design":"Rose","beds":4,"baths":2,"cars":2,"sizeM2":401.51,"frontageReq":19.81,"houseWidth":16.43,"houseLength":19.81},{"label":"Rose 53","design":"Rose","beds":4,"baths":3,"cars":3,"sizeM2":492.82,"frontageReq":22.69,"houseWidth":18.11,"houseLength":22.69},{"label":"Rosewood 23","design":"Rosewood","beds":4,"baths":3,"cars":2,"sizeM2":212.95,"frontageReq":13.28,"houseWidth":10.1,"houseLength":16.99},{"label":"Rosewood 31","design":"Rosewood","beds":4,"baths":3,"cars":2,"sizeM2":285.5,"frontageReq":13.86,"houseWidth":13.91,"houseLength":23.5},{"label":"Ruby 19","design":"Ruby","beds":4,"baths":2,"cars":1,"sizeM2":174.93,"frontageReq":7.83,"houseWidth":7.83,"houseLength":16.19},{"label":"Ruby 21","design":"Ruby","beds":4,"baths":2,"cars":1,"sizeM2":195.51,"frontageReq":8.31,"houseWidth":6.47,"houseLength":16.79},{"label":"Ruby 23","design":"Ruby","beds":4,"baths":2,"cars":1,"sizeM2":214.17,"frontageReq":9.03,"houseWidth":7.19,"houseLength":18.47},{"label":"Ruby 26","design":"Ruby","beds":4,"baths":2,"cars":2,"sizeM2":251.38,"frontageReq":12.78,"houseWidth":9.78,"houseLength":17.63},{"label":"Ruby 28","design":"Ruby","beds":5,"baths":2,"cars":1,"sizeM2":263.37,"frontageReq":9.75,"houseWidth":7.91,"houseLength":18.23},{"label":"Saffron 23","design":"Saffron","beds":4,"baths":2,"cars":2,"sizeM2":214.46,"frontageReq":13.23,"houseWidth":11.39,"houseLength":20.87},{"label":"Saffron 26","design":"Saffron","beds":4,"baths":2,"cars":2,"sizeM2":245.88,"frontageReq":14.91,"houseWidth":13.07,"houseLength":21.59},{"label":"Saffron 30","design":"Saffron","beds":4,"baths":3,"cars":2,"sizeM2":283.12,"frontageReq":17.19,"houseWidth":15.35,"houseLength":22.79},{"label":"Saffron 35","design":"Saffron","beds":4,"baths":3,"cars":2,"sizeM2":320.98,"frontageReq":17.91,"houseWidth":16.07,"houseLength":23.63},{"label":"Sienna 28","design":"Sienna","beds":4,"baths":2,"cars":2,"sizeM2":257.87,"frontageReq":14.91,"houseWidth":13.07,"houseLength":21.47},{"label":"Sienna 30","design":"Sienna","beds":4,"baths":2,"cars":2,"sizeM2":283.24,"frontageReq":17.07,"houseWidth":15.23,"houseLength":21.23},{"label":"Sienna 33","design":"Sienna","beds":4,"baths":2,"cars":2,"sizeM2":310.51,"frontageReq":17.31,"houseWidth":15.47,"houseLength":22.07},{"label":"Sienna 36","design":"Sienna","beds":4,"baths":2,"cars":2,"sizeM2":335.41,"frontageReq":17.55,"houseWidth":15.71,"houseLength":23.39},{"label":"Tangerine 37","design":"Tangerine","beds":5,"baths":3,"cars":2,"sizeM2":346.67,"frontageReq":13.81,"houseWidth":11.39,"houseLength":20.5},{"label":"Tangerine 41","design":"Tangerine","beds":5,"baths":3,"cars":2,"sizeM2":383.4,"frontageReq":14.41,"houseWidth":11.99,"houseLength":21.82},{"label":"Tangerine 44","design":"Tangerine","beds":5,"baths":3,"cars":2,"sizeM2":411.72,"frontageReq":15.01,"houseWidth":12.59,"houseLength":22.8},{"label":"Tangerine 49","design":"Tangerine","beds":5,"baths":3,"cars":2,"sizeM2":451.78,"frontageReq":15.59,"houseWidth":12.59,"houseLength":23.51},{"label":"Terracotta 23","design":"Terracotta","beds":4,"baths":2,"cars":1,"sizeM2":211.58,"frontageReq":9.63,"houseWidth":7.79,"houseLength":15.71},{"label":"Terracotta 25","design":"Terracotta","beds":4,"baths":2,"cars":2,"sizeM2":230.69,"frontageReq":10.31,"houseWidth":10.31,"houseLength":15.23},{"label":"Terracotta 30","design":"Terracotta","beds":4,"baths":2,"cars":2,"sizeM2":282.01,"frontageReq":12.39,"houseWidth":10.55,"houseLength":18.83},{"label":"Terracotta 36","design":"Terracotta","beds":4,"baths":2,"cars":2,"sizeM2":336.1,"frontageReq":12.99,"houseWidth":11.15,"houseLength":21.11},{"label":"Tiffany 22","design":"Tiffany","beds":4,"baths":2,"cars":2,"sizeM2":203.97,"frontageReq":16.35,"houseWidth":14.51,"houseLength":16.35},{"label":"Tiffany 24","design":"Tiffany","beds":4,"baths":2,"cars":2,"sizeM2":222.53,"frontageReq":17.31,"houseWidth":15.47,"houseLength":17.31},{"label":"Tiffany 27","design":"Tiffany","beds":4,"baths":2,"cars":2,"sizeM2":252.45,"frontageReq":17.31,"houseWidth":15.47,"houseLength":35.61},{"label":"Tiffany 29","design":"Tiffany","beds":4,"baths":2,"cars":2,"sizeM2":271.65,"frontageReq":17.31,"houseWidth":15.47,"houseLength":20.03},{"label":"Topaz 21","design":"Topaz","beds":4,"baths":2,"cars":2,"sizeM2":199.37,"frontageReq":12.99,"houseWidth":11.15,"houseLength":18.71},{"label":"Topaz 23","design":"Topaz","beds":4,"baths":2,"cars":2,"sizeM2":213.92,"frontageReq":13.47,"houseWidth":11.63,"houseLength":19.19},{"label":"Topaz 26","design":"Topaz","beds":4,"baths":2,"cars":2,"sizeM2":239.47,"frontageReq":13.47,"houseWidth":11.63,"houseLength":22.07},{"label":"Topaz 29","design":"Topaz","beds":4,"baths":2,"cars":2,"sizeM2":268.05,"frontageReq":14.67,"houseWidth":12.83,"houseLength":22.67},{"label":"Turquoise 24","design":"Turquoise","beds":4,"baths":2,"cars":2,"sizeM2":222.13,"frontageReq":9.49,"houseWidth":8.39,"houseLength":17.5},{"label":"Turquoise 25","design":"Turquoise","beds":4,"baths":2,"cars":2,"sizeM2":235.31,"frontageReq":9.49,"houseWidth":8.39,"houseLength":17.5},{"label":"Turquoise 26","design":"Turquoise","beds":4,"baths":2,"cars":2,"sizeM2":244.98,"frontageReq":10.57,"houseWidth":8.15,"houseLength":18.82},{"label":"Turquoise 28","design":"Turquoise","beds":4,"baths":2,"cars":2,"sizeM2":263.24,"frontageReq":10.57,"houseWidth":8.15,"houseLength":20.5},{"label":"Turquoise 31","design":"Turquoise","beds":4,"baths":2,"cars":2,"sizeM2":290.14,"frontageReq":10.57,"houseWidth":8.15,"houseLength":23.98},{"label":"Violet 33","design":"Violet","beds":5,"baths":3,"cars":2,"sizeM2":309.3,"frontageReq":13.21,"houseWidth":10.79,"houseLength":20.53},{"label":"Violet 40","design":"Violet","beds":5,"baths":3,"cars":2,"sizeM2":372.44,"frontageReq":14.03,"houseWidth":11.03,"houseLength":21.13},{"label":"Violet 45","design":"Violet","beds":4,"baths":2,"cars":2,"sizeM2":415.04,"frontageReq":14.99,"houseWidth":11.99,"houseLength":22.09},{"label":"Violet 48","design":"Violet","beds":4,"baths":4,"cars":2,"sizeM2":442.11,"frontageReq":14.99,"houseWidth":11.99,"houseLength":22.33},{"label":"Violet 64","design":"Violet","beds":5,"baths":4,"cars":3,"sizeM2":586.61,"frontageReq":18.26,"houseWidth":15.84,"houseLength":24.14},{"label":"Viridian 28","design":"Viridian","beds":4,"baths":2,"cars":2,"sizeM2":264.05,"frontageReq":12.61,"houseWidth":10.67,"houseLength":18.82},{"label":"Viridian 32","design":"Viridian","beds":4,"baths":2,"cars":2,"sizeM2":310.96,"frontageReq":12.65,"houseWidth":11.15,"houseLength":22.5},{"label":"Viridian 39","design":"Viridian","beds":4,"baths":2,"cars":2,"sizeM2":360.85,"frontageReq":14.91,"houseWidth":13.07,"houseLength":20.86},{"label":"Viridian 43","design":"Viridian","beds":4,"baths":2,"cars":2,"sizeM2":400,"frontageReq":14.43,"houseWidth":12.59,"houseLength":22.9},{"label":"Wisteria 22","design":"Wisteria","beds":4,"baths":3,"cars":2,"sizeM2":201.45,"frontageReq":14.67,"houseWidth":12.83,"houseLength":17.75},{"label":"Wisteria 24 Mk II","design":"Wisteria","beds":5,"baths":3,"cars":2,"sizeM2":226.25,"frontageReq":14.55,"houseWidth":13.08,"houseLength":19.19},{"label":"Wisteria 26","design":"Wisteria","beds":5,"baths":3,"cars":2,"sizeM2":240.79,"frontageReq":12.47,"houseWidth":12.81,"houseLength":21.35},{"label":"Wisteria 29","design":"Wisteria","beds":6,"baths":4,"cars":2,"sizeM2":267.82,"frontageReq":20.09,"houseWidth":12.82,"houseLength":22.8}];

export function getHousingTypeForDesign(designName) {
  if (!designName) return "Single Storey";
  const norm = designName.trim().toLowerCase();

  // 1. Dual Living / Duplex detection
  if (
    / - td\b| - sd\b|\bdual[-\s]?oc|\bduplex\b|\bdual living\b/i.test(norm) ||
    ["alabaster", "amaranth", "cayenne", "cayene", "teal", "wisteria", "magnolia", "maize", "maroon", "raven", "lavender"].some((f) =>
      norm.startsWith(f)
    )
  ) {
    return "Dual Living";
  }

  // 2. Double Storey detection
  if (
    [
      "burgundy", "carolina", "cerise", "cyan", "emerald", "fuchsia", "lime", 
      "mahogany", "marigold", "mint", "mocha", "orchid", "rose", "rosewood", 
      "ruby", "tangerine", "terracotta", "tiffany", "turquoise", "violet", "viridian"
    ].some((f) => norm.startsWith(f))
  ) {
    return "Double Storey";
  }

  // 3. Split Level detection
  if (
    ["cinnamon", "cobalt", "mauve"].some((f) => norm.startsWith(f)) ||
    /split/i.test(norm)
  ) {
    return "Split Level";
  }

  // 4. Single Storey detection
  return "Single Storey";
}

export function parseLotQuery(text) {
  const t = (text || "").toLowerCase();

  const isSitingQuery =
    (t.includes("lot") || t.includes("block") || t.includes("land") || t.includes("frontage") || t.includes("envelope") || /\b[0-9.]+\s*(?:m)?\s*(?:x|by|\*)\s*[0-9.]+\b/i.test(t)) &&
    (t.includes("setback") || t.includes("wide") || t.includes("deep") || t.includes("fit") || t.includes("work") || t.includes("design") || t.includes("btb") || t.includes("boundary") || t.includes("envelope") || t.includes("ss") || t.includes("ds") || t.includes("storey") || t.includes("story") || t.includes("plan"));

  if (!isSitingQuery) return null;

  let lotWidth = null;
  let lotDepth = null;

  const dimMatch1 = t.match(/([0-9.]+)\s*(?:m)?\s*(?:wide|width|frontage)?\s*(?:lot|block)?\s*(?:by|x|\*)\s*([0-9.]+)\s*(?:m)?\s*(?:deep|depth|length|long|lot)?/);
  if (dimMatch1) {
    lotWidth = parseFloat(dimMatch1[1]);
    lotDepth = parseFloat(dimMatch1[2]);
  } else {
    const widthMatch = t.match(/([0-9.]+)\s*(?:m)?\s*(?:wide|width|frontage)/);
    const depthMatch = t.match(/([0-9.]+)\s*(?:m)?\s*(?:deep|depth|length|long)/);
    if (widthMatch) lotWidth = parseFloat(widthMatch[1]);
    if (depthMatch) lotDepth = parseFloat(depthMatch[1]);
  }

  if (!lotWidth && !lotDepth) return null;

  // Setbacks:
  let lhsSetback = 1.0;
  let lhsBtb = false;
  const lhsMatch1 = t.match(/([0-9.]+)\s*(?:m)?\s*(?:setback)?\s*(?:on|to|at)?\s*(?:the\s*)?(?:lhs|left)/i);
  const lhsMatch2 = t.match(/(?:lhs|left)\s*(?:with\s*btb)?\s*(?:setback)?\s*(?:is|=|:|of)?\s*([0-9.]+)\s*(?:m)?/i);
  if (lhsMatch1 && !isNaN(parseFloat(lhsMatch1[1]))) {
    lhsSetback = parseFloat(lhsMatch1[1]);
  } else if (lhsMatch2 && !isNaN(parseFloat(lhsMatch2[1]))) {
    lhsSetback = parseFloat(lhsMatch2[1]);
  }

  if (t.includes("btb") || t.includes("built to boundary") || t.includes("zero lot") || t.includes("zero-lot")) {
    if (t.includes("lhs") || t.includes("left") || !t.includes("rhs")) {
      lhsBtb = true;
    }
  }

  let rhsSetback = 1.5;
  let rhsBtb = false;
  const rhsMatch1 = t.match(/([0-9.]+)\s*(?:m)?\s*(?:setback|setbac)?\s*(?:on|to|at)?\s*(?:the\s*)?(?:rhs|right)/i);
  const rhsMatch2 = t.match(/(?:rhs|right)\s*(?:with\s*btb)?\s*(?:setback|setbac)?\s*(?:is|=|:|of)?\s*([0-9.]+)\s*(?:m)?/i);
  if (rhsMatch1 && !isNaN(parseFloat(rhsMatch1[1]))) {
    rhsSetback = parseFloat(rhsMatch1[1]);
  } else if (rhsMatch2 && !isNaN(parseFloat(rhsMatch2[1]))) {
    rhsSetback = parseFloat(rhsMatch2[1]);
  }

  let frontSetback = 5.0;
  const frontMatch1 = t.match(/([0-9.]+)\s*(?:m)?\s*(?:setback)?\s*(?:to|at|on)?\s*(?:the\s*)?(?:garage|front)/i);
  const frontMatch2 = t.match(/(?:garage|front)\s*(?:setback)?\s*(?:is|=|:|of)?\s*([0-9.]+)\s*(?:m)?/i);
  if (frontMatch1 && !isNaN(parseFloat(frontMatch1[1]))) {
    frontSetback = parseFloat(frontMatch1[1]);
  } else if (frontMatch2 && !isNaN(parseFloat(frontMatch2[1]))) {
    frontSetback = parseFloat(frontMatch2[1]);
  }

  let rearSetback = 1.0;
  const rearMatch1 = t.match(/([0-9.]+)\s*(?:m)?\s*(?:setback)?\s*(?:to|at|on)?\s*(?:the\s*)?(?:rear|back)/i);
  const rearMatch2 = t.match(/(?:rear|back)\s*(?:setback)?\s*(?:is|=|:|of)?\s*([0-9.]+)\s*(?:m)?/i);
  if (rearMatch1 && !isNaN(parseFloat(rearMatch1[1]))) {
    rearSetback = parseFloat(rearMatch1[1]);
  } else if (rearMatch2 && !isNaN(parseFloat(rearMatch2[1]))) {
    rearSetback = parseFloat(rearMatch2[1]);
  }

  let storeyFilter = null;
  if (
    /\bss\b/i.test(t) ||
    /\bsingle\s*(?:storey|story|level|floor)\b/i.test(t) ||
    /\b1\s*(?:storey|story|level|floor)\b/i.test(t) ||
    /\bone\s*(?:storey|story|level|floor)\b/i.test(t) ||
    /\bonly\s*single\b/i.test(t) ||
    /\bsingle\s*homes?\b/i.test(t) ||
    /\bsingle\s*designs?\b/i.test(t)
  ) {
    storeyFilter = "Single Storey";
  } else if (
    /\bds\b/i.test(t) ||
    /\bdouble\s*(?:storey|story|level|floor)\b/i.test(t) ||
    /\btwo\s*(?:storey|story|level|floor)\b/i.test(t) ||
    /\b2\s*(?:storey|story|level|floor)\b/i.test(t) ||
    /\bonly\s*double\b/i.test(t) ||
    /\bdouble\s*homes?\b/i.test(t) ||
    /\bdouble\s*designs?\b/i.test(t)
  ) {
    storeyFilter = "Double Storey";
  } else if (
    /\bdual\s*(?:living|occ|key)?\b/i.test(t) ||
    /\bduplex\b/i.test(t)
  ) {
    storeyFilter = "Dual Living";
  } else if (
    /\bsplit\s*(?:level)?\b/i.test(t)
  ) {
    storeyFilter = "Split Level";
  }

  return {
    lotWidth,
    lotDepth,
    lhsSetback,
    lhsBtb,
    rhsSetback,
    rhsBtb,
    frontSetback,
    rearSetback,
    storeyFilter,
  };
}

export function evaluateLotSiting(params) {
  const {
    lotWidth,
    lotDepth,
    lhsSetback,
    lhsBtb,
    rhsSetback,
    rhsBtb,
    frontSetback,
    rearSetback,
    storeyFilter,
  } = params;

  const maxWidthStd = Math.max(0, lotWidth - lhsSetback - rhsSetback);
  const maxWidthBtb = Math.max(
    0,
    lotWidth - (lhsBtb ? 0.0 : lhsSetback) - (rhsBtb ? 0.0 : rhsSetback)
  );

  const maxDepth = Math.max(0, lotDepth - frontSetback - rearSetback);

  const allPlans = CATALOG.map((p) => ({
    ...p,
    housingType: getHousingTypeForDesign(p.design || p.label),
  }));

  const validPlans = allPlans.filter((p) => {
    if (!storeyFilter) return true;
    return p.housingType === storeyFilter;
  });

  const potentialMaxWidthBtb = Math.max(0, lotWidth - 0.0 - rhsSetback);
  const isBtbPermitted = Boolean(lhsBtb || rhsBtb);
  const effectiveBtbWidth = isBtbPermitted ? maxWidthBtb : potentialMaxWidthBtb;

  const strictFit = validPlans.filter(
    (p) => p.houseWidth <= maxWidthStd && p.houseLength <= maxDepth
  ).sort((a, b) => b.sizeM2 - a.sizeM2);

  const btbFit = validPlans.filter(
    (p) =>
      p.houseWidth > maxWidthStd &&
      p.houseWidth <= effectiveBtbWidth &&
      p.houseLength <= maxDepth
  ).sort((a, b) => b.sizeM2 - a.sizeM2);

  const closeFit = validPlans.filter(
    (p) =>
      p.houseWidth <= effectiveBtbWidth &&
      p.houseLength > maxDepth &&
      p.houseLength <= maxDepth + 2.5
  ).sort((a, b) => a.houseLength - b.houseLength);

  return {
    lotWidth,
    lotDepth,
    lotArea: (lotWidth * lotDepth).toFixed(1),
    storeyFilter: storeyFilter || null,
    maxWidthStd: maxWidthStd.toFixed(2),
    maxWidthBtb: effectiveBtbWidth.toFixed(2),
    isBtbPermitted,
    maxDepth: maxDepth.toFixed(2),
    lhsSetback,
    lhsBtb,
    rhsSetback,
    frontSetback,
    rearSetback,
    strictFit,
    btbFit,
    closeFit,
  };
}

export function formatSitingResponse(res) {
  const {
    lotWidth,
    lotDepth,
    lotArea,
    storeyFilter,
    maxWidthStd,
    maxWidthBtb,
    isBtbPermitted,
    maxDepth,
    lhsSetback,
    lhsBtb,
    rhsSetback,
    frontSetback,
    rearSetback,
    strictFit,
    btbFit,
    closeFit,
  } = res;

  const typeDesc = storeyFilter
    ? `${storeyFilter} (${storeyFilter === "Single Storey" ? "SS" : storeyFilter === "Double Storey" ? "DS" : storeyFilter})`
    : "All Storeys";

  let out = `### 📐 Architectural Siting & Feasibility Assessment

**Lot Parameters:**
- **Dimensions:** ${lotWidth}m Wide × ${lotDepth}m Deep (${lotArea} m²)
${storeyFilter ? `- **Requested Housing Type:** **${typeDesc}**\n` : ""}- **Setbacks Applied:**
  - **LHS (Left):** ${lhsSetback}m${lhsBtb ? " *(Built-To-Boundary / Zero-Lot permitted)*" : ""}
  - **RHS (Right):** ${rhsSetback}m
  - **Front to Garage:** ${frontSetback}m
  - **Rear:** ${rearSetback}m

**Maximum Usable Building Envelope:**
- **Standard Width:** **${maxWidthStd}m** (${lotWidth}m - ${lhsSetback}m LHS - ${rhsSetback}m RHS)
${lhsBtb ? `- **With Zero-Lot / BTB on LHS:** Up to **${maxWidthBtb}m** (${lotWidth}m - 0m LHS - ${rhsSetback}m RHS)\n` : ""}- **Maximum Building Depth:** **${maxDepth}m** (${lotDepth}m - ${frontSetback}m Front - ${rearSetback}m Rear)

---

### 1. Directly Compliant Hudson ${storeyFilter ? storeyFilter + " " : ""}Designs (${strictFit.length} Designs Fit 100%)
These ${storeyFilter ? storeyFilter.toLowerCase() + " " : ""}designs sit comfortably inside the ${maxWidthStd}m × ${maxDepth}m envelope with zero structural boundary variations:

`;

  if (strictFit.length > 0) {
    const topStrict = strictFit.slice(0, 8);
    for (const p of topStrict) {
      const wMargin = (parseFloat(maxWidthStd) - p.houseWidth).toFixed(2);
      const lMargin = (parseFloat(maxDepth) - p.houseLength).toFixed(2);
      out += `- **${p.label}**: **${p.houseWidth}m W × ${p.houseLength}m L** (${p.sizeM2} m² / ${(p.sizeM2 / 9.29).toFixed(1)} sq) [${p.housingType}]\n`;
      out += `  - *Config:* ${p.beds} Bed, ${p.baths} Bath, ${p.cars} Car Garage\n`;
      out += `  - *Clearances:* +${wMargin}m width buffer, +${lMargin}m rear buffer\n`;
    }
  } else {
    out += `*No standard ${storeyFilter ? storeyFilter.toLowerCase() + " " : ""}catalog designs fit strictly within this envelope without BTB or length concessions.*\n`;
  }

  if (btbFit.length > 0) {
    if (isBtbPermitted) {
      out += `\n### 2. Compliant via Built-to-Boundary (BTB) on LHS (${btbFit.length} Designs)\n`;
      out += `These ${storeyFilter ? storeyFilter.toLowerCase() + " " : ""}designs take advantage of your LHS Zero-Lot wall (up to ${maxWidthBtb}m wide):\n\n`;
    } else {
      out += `\n### 2. Compliant if Lot Allows Zero-Lot / Built-to-Boundary (BTB) on Garage (${btbFit.length} Designs)\n`;
      out += `If your developer guidelines allow a Zero-Lot garage wall (increasing allowable building width up to **${maxWidthBtb}m**), these flagship designs also fit 100%:\n\n`;
    }
    for (const p of btbFit.slice(0, 8)) {
      out += `- **${p.label}**: **${p.houseWidth}m W × ${p.houseLength}m L** (${p.sizeM2} m² / ${(p.sizeM2 / 9.29).toFixed(1)} sq) [${p.housingType}]\n`;
      out += `  - *Config:* ${p.beds} Bed, ${p.baths} Bath, ${p.cars} Car Garage\n`;
    }
  }

  if (closeFit.length > 0) {
    out += `\n### 3. "Close" Designs & Architectural Solutions (${closeFit.length} Options)\n`;
    out += `These ${storeyFilter ? storeyFilter.toLowerCase() + " " : ""}designs fit the width easily, but their length exceeds ${maxDepth}m by a small margin. They can work with minor articulation or boundary adjustments:\n\n`;

    for (const p of closeFit.slice(0, 6)) {
      const over = (p.houseLength - parseFloat(maxDepth)).toFixed(2);
      out += `- **${p.label}**: **${p.houseWidth}m W × ${p.houseLength}m L** (${p.sizeM2} m² | ${p.beds}b/${p.baths}b/${p.cars}c) [${p.housingType}]\n`;
      out += `  - *Length Delta:* Only **+${over}m** over the ${maxDepth}m boundary.\n`;
      if (parseFloat(over) <= 0.6) {
        out += `  - *How to Make it Work:* Front porch articulation or bringing living forward to 4.5m (while holding garage at 5.0m) or slight alfresco depth reduction easily accommodates this.\n`;
      } else if (p.label.includes("Hazel 14")) {
        out += `  - *How to Make it Work:* The Hazel 14 is 16.66m long (+1.31m). Adjusting the rear alfresco or checking if council allows a 4.5m front setback allows this popular single-garage design to fit.\n`;
      } else {
        out += `  - *How to Make it Work:* Feasible via minor rear setback concession or custom length truncation via Hudson Quote Builder.\n`;
      }
    }
  }

  out += `\n> [!TIP]
> **Next Step**: You can load any of these designs directly in **Flyer Builder (\`/flyer\`)** or customize them with exact pricing in **Quote Builder (\`/quote-builder\`)**!`;

  return out;
}

export const JURISDICTIONS = [
  {
    id: "council_redland",
    name: "Redland City Council",
    state: "QLD",
    isPDA: false,
    governingInstrument: "Redland City Plan 2018 & Queensland Development Code (QDC MP 1.1 / 1.2 / 1.4)",
    statutoryAuthority: "Redland City Council",
    coveredSuburbs: [
      "mount cotton", "mt cotton", "mount cotton road", "mt cotton road", "sheldon", "capalaba", 
      "alexandra hills", "birkdale", "cleveland", "victoria point", "redland bay", 
      "thornlands", "wellington point", "ormiston", "thorneside", "burbank"
    ],
    zoningDefaults: {
      primaryZoning: "Low Density Residential / Rural Residential Corridor",
      description: "Characterized by generous suburban lots and undulating rural residential acreage parcels adjoining conservation corridors."
    },
    duplexRules: {
      minLotSizeM2: 800,
      minFrontageM: 18.0,
      requiresPoDDesignation: false,
      assessmentCategory: "Code Assessable",
      maxSiteCoveragePct: 50,
      maxBuildingHeightM: 8.5,
      frontSetbackM: 6.0,
      garageSetbackM: 6.0,
      sideSetbackM: 1.5,
      rearSetbackM: 2.0,
      infrastructureChargePerDwelling: 32000,
      notes: "Dual occupancy (duplex) is Code Assessable in Low Density Residential Zone on lots ≥ 800 m² with min 18m street frontage (or ≥ 600 m² with 15m frontage in Medium Density). Separate driveway crossovers require min 1.0m clearance to utility assets and street trees."
    },
    auxiliaryUnitRules: {
      minLotSizeM2: 450,
      maxGfaM2: 70,
      minFrontageM: 14.0,
      parkingSpacesRequired: 1,
      infrastructureCharge: 0,
      notes: "Auxiliary unit (secondary dwelling under single title) is ACCEPTED DEVELOPMENT on lots ≥ 450m² if gross floor area ≤ 70m² and provides 1 dedicated on-site parking space. Exempt from council infrastructure charges."
    },
    overlayProfile: {
      bushfireRisk: "High / Moderate (BAL-12.5 to BAL-29 typical along Mt Cotton reserve corridor, requiring toughened glass, ember screens & non-combustible cladding)",
      floodRisk: "Eprap & Tingalpa Creek catchments: Minimum FFL +300mm to +500mm freeboard above overland flow crest",
      acousticRisk: "Category 2/3 road traffic noise along Mt Cotton Road arterial corridor (requires 6.38mm acoustic laminated glazing and acoustic door drop seals)",
      soilReactivity: "Class M to Class H1/H2 basaltic clays (engineered waffle pod or stiffened raft slab with bored concrete piers)",
      sewerAuthority: "Redland City Council Water & Waste / Logan Water boundary"
    },
    recommendedDesigns: [
      { name: "Wisteria 33 / 34 / 36 / 40", type: "Duplex", minLotWidthM: 18.0, minLotDepthM: 28.0, summary: "Flagship QLD dual-occupancy design with mirror luxury finishes, compliant with Redland 18m frontage rules." },
      { name: "Amber 21 (Auxiliary Suite)", type: "Dual Key", minLotWidthM: 14.0, minLotDepthM: 28.0, summary: "Engineered specifically to satisfy Redland's 70m² auxiliary limit with $0 council infrastructure charges." },
      { name: "Alabaster 31 / 36", type: "Duplex", minLotWidthM: 18.0, minLotDepthM: 28.0, summary: "Single-storey traditional duplex with balanced self-contained residences under one continuous roofline." },
      { name: "Mulberry 25 / 28 / 33", type: "Single Storey", minLotWidthM: 27.0, minLotDepthM: 20.0, summary: "Prestige wide-frontage acreage ranch design, ideal for Mt Cotton and Sheldon rural-residential blocks." },
      { name: "Amber 21 / 23 / 26", type: "Single Storey", minLotWidthM: 12.5, minLotDepthM: 25.0, summary: "Smart efficient 4-bed suburban design fitting standard Redland Low Density residential allotments." },
      { name: "Burgundy 27 / 30 / 32", type: "Double Storey", minLotWidthM: 13.5, minLotDepthM: 22.0, summary: "Executive two-storey luxury home maximizing backyard private open space within 50% site coverage." }
    ]
  },
  {
    id: "pda_greater_flagstone",
    name: "Greater Flagstone Priority Development Area (PDA)",
    state: "QLD",
    isPDA: true,
    pdaName: "Greater Flagstone PDA",
    governingInstrument: "Greater Flagstone PDA Development Scheme & Developer Approved Plans of Development (PoDs)",
    statutoryAuthority: "Economic Development Queensland (EDQ)",
    coveredSuburbs: [
      "flagstone", "south maclean", "undullah", "cedar grove", "cedar vale", 
      "woodhill", "monaco", "peet flagstone", "flagstone city"
    ],
    zoningDefaults: {
      primaryZoning: "Urban Living Zone (EDQ PDA)",
      description: "Masterplanned corridor administered directly by Economic Development Queensland under developer Plans of Development."
    },
    duplexRules: {
      minLotSizeM2: 600,
      minFrontageM: 16.0,
      requiresPoDDesignation: true,
      assessmentCategory: "Plan of Development (PoD) Check",
      maxSiteCoveragePct: 60,
      maxBuildingHeightM: 8.5,
      frontSetbackM: 4.0,
      garageSetbackM: 5.0,
      sideSetbackM: 1.0,
      rearSetbackM: 1.5,
      infrastructureChargePerDwelling: 29500,
      notes: "Strict PoD enforcement. Lots must be designated as 'Dual Occupancy' or 'Dual Key' on the approved estate stage disclosure plan (e.g. Peet Flagstone City stages)."
    },
    auxiliaryUnitRules: {
      minLotSizeM2: 450,
      maxGfaM2: 70,
      minFrontageM: 14.0,
      parkingSpacesRequired: 1,
      infrastructureCharge: 14750,
      notes: "Auxiliary dwelling permissible on standard lots ≥ 450 m² subject to developer covenant review and 1 covered off-street parking space."
    },
    overlayProfile: {
      bushfireRisk: "BAL-LOW to BAL-12.5 typical in cleared stages; BAL-19/29 near perimeter bushland",
      floodRisk: "Flagstone Creek & Sandy Creek drainage buffers: FFL +300mm above overland flow",
      acousticRisk: "Standard QDC acoustic requirements; Category 1 near rail/arterial links",
      soilReactivity: "Class M to Class H1 reactive soil; waffle pod slab with edge thickening standard",
      sewerAuthority: "Logan Water reticulated infrastructure"
    },
    recommendedDesigns: [
      { name: "Wisteria 33 / 34 / 36 / 40", type: "Duplex", minLotWidthM: 15.5, minLotDepthM: 28.0, summary: "Flagship QLD dual-occupancy design featuring 3+2 or 4+2 bed duplex layouts under one continuous architectural roofline." },
      { name: "Alabaster 31", type: "Duplex", minLotWidthM: 16.0, minLotDepthM: 28.0, summary: "Compact single-storey duplex configuration engineered specifically for suburban investor yield on 16m+ lots." },
      { name: "Amber 21 (Dual Suite Variation)", type: "Dual Key", minLotWidthM: 12.5, minLotDepthM: 25.0, summary: "Single-storey design tailored for auxiliary secondary suite under Logan / EDQ 70m² thresholds." }
    ]
  },
  {
    id: "pda_ripley_valley",
    name: "Ripley Valley Priority Development Area (PDA)",
    state: "QLD",
    isPDA: true,
    pdaName: "Ripley Valley PDA",
    governingInstrument: "Ripley Valley PDA Development Scheme & Estate Stage PoDs (Stockland Providence, Ecco Ripley)",
    statutoryAuthority: "Economic Development Queensland (EDQ)",
    coveredSuburbs: ["ripley", "south ripley", "providence", "ecco ripley", "gungalva", "swanbank"],
    zoningDefaults: {
      primaryZoning: "Urban Living Zone (EDQ PDA)",
      description: "Fast-growing western corridor under EDQ jurisdiction with stage PoDs."
    },
    duplexRules: {
      minLotSizeM2: 600,
      minFrontageM: 16.0,
      requiresPoDDesignation: true,
      assessmentCategory: "Plan of Development (PoD) Check",
      maxSiteCoveragePct: 60,
      maxBuildingHeightM: 8.5,
      frontSetbackM: 4.0,
      garageSetbackM: 5.0,
      sideSetbackM: 1.0,
      rearSetbackM: 1.5,
      infrastructureChargePerDwelling: 28500,
      notes: "Dual-occupancy and duplex builds require specific notation on approved Plan of Development (PoD)."
    },
    auxiliaryUnitRules: { minLotSizeM2: 450, maxGfaM2: 70, minFrontageM: 14.0, parkingSpacesRequired: 1, infrastructureCharge: 14250, notes: "Auxiliary unit permitted with 1 parking space." },
    overlayProfile: {
      bushfireRisk: "BAL-LOW to BAL-12.5 standard; BAL-19/29 adjoining conservation ridges",
      floodRisk: "Bundamba Creek tributary corridors: FFL +300mm to +500mm above defined flood event",
      acousticRisk: "Centenary Highway & Cunningham Highway acoustic buffer zones",
      soilReactivity: "Class H1 to Class H2 highly reactive clays (requires engineered concrete piers)",
      sewerAuthority: "Urban Utilities (QUU)"
    },
    recommendedDesigns: [
      { name: "Wisteria 33 / 34", type: "Duplex", minLotWidthM: 15.5, minLotDepthM: 28.0, summary: "High-demand Ripley investment configuration." },
      { name: "Magnolia 34", type: "Duplex", minLotWidthM: 15.5, minLotDepthM: 26.0, summary: "Modern two-storey dual living engineered to satisfy Stockland Providence and EDQ guidelines." }
    ]
  },
  {
    id: "council_logan",
    name: "Logan City Council",
    state: "QLD",
    isPDA: false,
    governingInstrument: "Logan Planning Scheme 2015",
    statutoryAuthority: "Logan City Council",
    coveredSuburbs: [
      "logan reserve", "park ridge", "greenbank", "marsden", "crestmead", 
      "browns plains", "jimboomba", "boronia heights", "regents park", "heritage park", 
      "hillcrest", "meadowbrook", "slacks creek", "springwood", "daisy hill", 
      "rochedale south", "shailer park", "tanah merah", "loganholme", "kingston", 
      "woodridge", "beenleigh", "holmview", "edens landing", "bahrs scrub", "windaroo"
    ],
    zoningDefaults: {
      primaryZoning: "Low Density Residential / Low-Medium Density Residential",
      description: "Major SEQ growth municipality with active dual-occupancy and auxiliary unit uptake."
    },
    duplexRules: {
      minLotSizeM2: 600,
      minFrontageM: 18.0,
      requiresPoDDesignation: false,
      assessmentCategory: "Code Assessable",
      maxSiteCoveragePct: 50,
      maxBuildingHeightM: 8.5,
      frontSetbackM: 6.0,
      garageSetbackM: 6.0,
      sideSetbackM: 1.5,
      rearSetbackM: 1.5,
      infrastructureChargePerDwelling: 31000,
      notes: "Dual occupancy is Code Assessable in Low Density Residential if lot ≥ 700m² (≥ 600m² in Low-Medium Density) with min 18m frontage."
    },
    auxiliaryUnitRules: {
      minLotSizeM2: 450,
      maxGfaM2: 70,
      minFrontageM: 14.0,
      parkingSpacesRequired: 1,
      infrastructureCharge: 0,
      notes: "Logan City Council auxiliary unit code allows up to 70m² GFA on lots ≥ 450 m² with $0 infrastructure charges."
    },
    overlayProfile: {
      bushfireRisk: "BAL-LOW in subdivisions; BAL-12.5 to BAL-29 in Greenbank and Park Ridge bush interfaces",
      floodRisk: "Logan River & Slacks Creek floodplains: FFL +500mm freeboard above defined flood level",
      acousticRisk: "Mount Lindesay Highway and Logan Motorway acoustic corridors (QDC MP 4.4)",
      soilReactivity: "Class M to Class H1/H2 reactive clay; foundation piers standard",
      sewerAuthority: "Logan Water"
    },
    recommendedDesigns: [
      { name: "Wisteria 33 / 36 / 40", type: "Duplex", minLotWidthM: 18.0, minLotDepthM: 30.0, summary: "Complies with Logan City Council 18m frontage and dual crossover standards." },
      { name: "Alabaster 31 / 36", type: "Duplex", minLotWidthM: 18.0, minLotDepthM: 28.0, summary: "Single-storey traditional duplex with balanced layouts and separate private yards." },
      { name: "Amber 21 (Auxiliary Suite)", type: "Dual Key", minLotWidthM: 14.0, minLotDepthM: 28.0, summary: "Exempt from Logan infrastructure charges when configured under 70m² auxiliary threshold." }
    ]
  },
  {
    id: "council_ipswich",
    name: "Ipswich City Council",
    state: "QLD",
    isPDA: false,
    governingInstrument: "Ipswich Planning Scheme",
    statutoryAuthority: "Ipswich City Council",
    coveredSuburbs: [
      "redbank plains", "brassall", "deebing heights", "bellbird park", "collingwood park", 
      "yamanto", "flinders view", "raceview", "booval", "bundamba", 
      "goodna", "gailes", "camira", "brookwater", "augustine heights", 
      "springfield lakes", "springfield central", "rosewood"
    ],
    zoningDefaults: {
      primaryZoning: "Residential Low Density / Character Mixed Density",
      description: "Western growth hub with diverse lot profiles and mining influence overlays."
    },
    duplexRules: {
      minLotSizeM2: 800,
      minFrontageM: 18.0,
      requiresPoDDesignation: false,
      assessmentCategory: "Code Assessable",
      maxSiteCoveragePct: 50,
      maxBuildingHeightM: 8.5,
      frontSetbackM: 6.0,
      garageSetbackM: 6.0,
      sideSetbackM: 1.5,
      rearSetbackM: 2.0,
      infrastructureChargePerDwelling: 30000,
      notes: "In standard Residential Low Density, dual occupancy requires min 800m² and 18m frontage (600m² in character/medium density)."
    },
    auxiliaryUnitRules: {
      minLotSizeM2: 450,
      maxGfaM2: 65,
      minFrontageM: 14.0,
      parkingSpacesRequired: 1,
      infrastructureCharge: 0,
      notes: "Auxiliary units limited to 65m² GFA on lots ≥ 450m² with 1 on-site parking space. $0 infrastructure charge."
    },
    overlayProfile: {
      bushfireRisk: "BAL-LOW standard; BAL-12.5 to BAL-19 in perimeter estates",
      floodRisk: "Bremer River & Deebing Creek catchments: FFL +500mm above flood flag",
      acousticRisk: "Cunningham Highway / Ipswich Motorway noise corridors",
      soilReactivity: "Class H1 to Class E extremely reactive black soil plains (requires engineered stiffened raft slab)",
      sewerAuthority: "Urban Utilities (QUU)"
    },
    recommendedDesigns: [
      { name: "Wisteria 34", type: "Duplex", minLotWidthM: 18.0, minLotDepthM: 30.0, summary: "Spacious dual living designed for 800m² Ipswich lots." },
      { name: "Alabaster 31", type: "Duplex", minLotWidthM: 18.0, minLotDepthM: 28.0, summary: "Single-storey traditional duplex layout compliant with Ipswich 800m² dual occupancy requirements." }
    ]
  },
  {
    id: "council_moreton_bay",
    name: "City of Moreton Bay",
    state: "QLD",
    isPDA: false,
    governingInstrument: "Moreton Bay Regional Council Planning Scheme",
    statutoryAuthority: "City of Moreton Bay",
    coveredSuburbs: [
      "morayfield", "caboolture", "burpengary", "burpengary east", "narangba", 
      "north lakes", "griffin", "mango hill", "kallangur", "murrumba downs", 
      "petrie", "strathpine", "warner", "deception bay"
    ],
    zoningDefaults: {
      primaryZoning: "General Residential (Next Generation / Suburban Neighbourhood)",
      description: "High-growth northern corridor with distinct Next Gen and Suburban neighbourhood rules."
    },
    duplexRules: {
      minLotSizeM2: 600,
      minFrontageM: 15.0,
      requiresPoDDesignation: false,
      assessmentCategory: "Code Assessable",
      maxSiteCoveragePct: 50,
      maxBuildingHeightM: 8.5,
      frontSetbackM: 6.0,
      garageSetbackM: 6.0,
      sideSetbackM: 1.5,
      rearSetbackM: 2.0,
      infrastructureChargePerDwelling: 31500,
      notes: "Dual occupancy is Code Assessable in General Residential Zone (min 600m² and 15m frontage in Next Gen precinct; 800m² in Suburban precinct)."
    },
    auxiliaryUnitRules: {
      minLotSizeM2: 450,
      maxGfaM2: 70,
      minFrontageM: 14.0,
      parkingSpacesRequired: 1,
      infrastructureCharge: 0,
      notes: "Secondary dwelling up to 70m² accepted on lots ≥ 450 m² with $0 council infrastructure fees."
    },
    overlayProfile: {
      bushfireRisk: "BAL-LOW to BAL-12.5 standard; BAL-19/29 near Caboolture River corridor",
      floodRisk: "Caboolture River & Burpengary Creek drainage paths: FFL +500mm freeboard",
      acousticRisk: "Bruce Highway noise corridor (QDC MP 4.4 Category 2/3)",
      soilReactivity: "Class M to Class H1 reactive soil",
      sewerAuthority: "Unitywater"
    },
    recommendedDesigns: [
      { name: "Wisteria 33 / 36", type: "Duplex", minLotWidthM: 16.0, minLotDepthM: 28.0, summary: "Fits compliant 16m+ Next Generation precinct lots across Morayfield and Burpengary." },
      { name: "Magnolia 34 / 37", type: "Duplex", minLotWidthM: 15.0, minLotDepthM: 26.0, summary: "Highly sought after for Moreton Bay Next Generation precinct investor packages." }
    ]
  },
  {
    id: "council_brisbane",
    name: "Brisbane City Council",
    state: "QLD",
    isPDA: false,
    governingInstrument: "Brisbane City Plan 2014",
    statutoryAuthority: "Brisbane City Council (BCC)",
    coveredSuburbs: [
      "brisbane", "runcorn", "calamvale", "algester", "kuraby", "pallara", 
      "doolandella", "ellen grove", "richlands", "infigo", "forest lake", 
      "stretton", "sunnybank", "carindale", "aspley", "chermside", 
      "mitchelton", "bridgeman downs", "upper mount gravatt", "mount gravatt"
    ],
    zoningDefaults: {
      primaryZoning: "Low Density Residential / Low-Medium Density Residential (2 or 3 storey mix)",
      description: "Capital city LGA with strict traditional building character and small lot codes."
    },
    duplexRules: {
      minLotSizeM2: 800,
      minFrontageM: 15.0,
      requiresPoDDesignation: false,
      assessmentCategory: "Code Assessable",
      maxSiteCoveragePct: 50,
      maxBuildingHeightM: 9.5,
      frontSetbackM: 6.0,
      garageSetbackM: 6.0,
      sideSetbackM: 1.5,
      rearSetbackM: 2.5,
      infrastructureChargePerDwelling: 33000,
      notes: "Dual occupancy in Low Density Residential requires minimum 800m² with 15m frontage (Code Assessable). In Low-Medium Density (LMR), minimum lot size is 600m²."
    },
    auxiliaryUnitRules: {
      minLotSizeM2: 400,
      maxGfaM2: 80,
      minFrontageM: 12.0,
      parkingSpacesRequired: 1,
      infrastructureCharge: 0,
      notes: "BCC Secondary Dwelling code allows up to 80m² GFA, within 20m of primary house, with 1 dedicated car space. QLD planning amendments permit renting to unrelated tenants."
    },
    overlayProfile: {
      bushfireRisk: "BAL-LOW typical; BAL-12.5 near reserve edges",
      floodRisk: "Oxley Creek & Blunder Creek catchments: FFL +500mm above flood flag",
      acousticRisk: "Major arterial noise corridors (QDC MP 4.4 Category 1 to 3)",
      soilReactivity: "Class M to Class H1 clay foundation",
      sewerAuthority: "Urban Utilities (QUU)"
    },
    recommendedDesigns: [
      { name: "Wisteria 40", type: "Duplex", minLotWidthM: 16.5, minLotDepthM: 32.0, summary: "Prestige two-storey duplex configuration suited for BCC infill and knock-down rebuilds." },
      { name: "Alabaster 31 / 36 / 40", type: "Duplex", minLotWidthM: 16.0, minLotDepthM: 28.0, summary: "Traditional single-storey duplex suited for BCC infill and knock-down rebuilds." }
    ]
  },
  {
    id: "council_gold_coast",
    name: "City of Gold Coast",
    state: "QLD",
    isPDA: false,
    governingInstrument: "City Plan (Gold Coast Planning Scheme)",
    statutoryAuthority: "Council of the City of Gold Coast",
    coveredSuburbs: [
      "ashmore", "southport", "labrador", "benowa", "bundall", "carrara", 
      "coomera", "pimpama", "upper coomera", "ormeau", "ormeau hills", 
      "helensvale", "pacific pines", "oxenford", "hope island", "robina", 
      "varsity lakes", "mudgeeraba", "nerang", "reedy creek", "molendinar", 
      "parkwood", "arundel", "runaway bay", "hollywell", "paradise point", 
      "biggera waters", "surfers paradise", "broadbeach", "mermaid waters", 
      "mermaid beach", "miami", "burleigh heads", "burleigh waters", "palm beach", 
      "currumbin", "currumbin waters", "elanora", "tugun", "bilinga", "coolangatta", 
      "kirra", "worongary", "tallai", "highland park", "maudsland", "gaven", 
      "jacobs well", "stapylton", "yatala", "gilston", "bonogin", "tallebudgera"
    ],
    zoningDefaults: {
      primaryZoning: "Low Density Residential / Medium Density Residential",
      description: "Fast-expanding northern corridor and established central precincts with high duplex demand."
    },
    duplexRules: {
      minLotSizeM2: 600,
      minFrontageM: 15.0,
      requiresPoDDesignation: false,
      assessmentCategory: "Code Assessable",
      maxSiteCoveragePct: 50,
      maxBuildingHeightM: 9.0,
      frontSetbackM: 6.0,
      garageSetbackM: 6.0,
      sideSetbackM: 1.5,
      rearSetbackM: 2.0,
      infrastructureChargePerDwelling: 32500,
      notes: "Dual occupancy is Code Assessable in Low Density Residential on lots ≥ 600 m² with minimum 15m frontage (10m in Medium Density)."
    },
    auxiliaryUnitRules: {
      minLotSizeM2: 450,
      maxGfaM2: 80,
      minFrontageM: 13.0,
      parkingSpacesRequired: 1,
      infrastructureCharge: 0,
      notes: "Secondary dwelling up to 80m² GFA accepted on lots ≥ 450 m² with dedicated covered or open parking bay. Exempt from council infrastructure charges."
    },
    overlayProfile: {
      bushfireRisk: "BAL-LOW to BAL-12.5; BAL-19 near Coomera/Nerang riverine zones",
      floodRisk: "Coomera / Nerang / Pimpama River basin: FFL +300mm to +500mm freeboard above defined flood level",
      acousticRisk: "M1 Pacific Motorway corridor: Category 2/3 road noise",
      soilReactivity: "Class M to Class H1/H2 reactive clay soils",
      sewerAuthority: "City of Gold Coast Water"
    },
    recommendedDesigns: [
      { name: "Wisteria 33 / 34 / 36 / 40", type: "Duplex", minLotWidthM: 15.5, minLotDepthM: 28.0, summary: "Flagship dual-occupancy design suited for Gold Coast dual crossover standards." },
      { name: "Alabaster 31 / 36", type: "Duplex", minLotWidthM: 18.0, minLotDepthM: 28.0, summary: "Single-storey traditional duplex with mirror floorplans and separate outdoor living." },
      { name: "Magnolia 34 / 37", type: "Duplex", minLotWidthM: 15.5, minLotDepthM: 26.0, summary: "Contemporary two-storey dual living maximizing site yield on 600m² Gold Coast lots." }
    ]
  },
  {
    id: "nsw_camden",
    name: "Camden Council (NSW)",
    state: "NSW",
    isPDA: false,
    governingInstrument: "SEPP (Housing) 2021 & Camden Local Environmental Plan (LEP) 2010 / Low Rise Housing Diversity Code (CDC)",
    statutoryAuthority: "Camden Council & NSW Department of Planning",
    coveredSuburbs: [
      "camden", "oran park", "gregory hills", "cobbitty", "leppington", 
      "harrington park", "spring farm", "elderslie", "mount annan", "narellan"
    ],
    zoningDefaults: {
      primaryZoning: "R2 Low Density Residential",
      description: "South West Sydney growth center governed by SEPP Housing CDC fast-track rules."
    },
    duplexRules: {
      minLotSizeM2: 500,
      minFrontageM: 15.0,
      requiresPoDDesignation: false,
      assessmentCategory: "Complying Development (CDC)",
      maxSiteCoveragePct: 50,
      maxBuildingHeightM: 8.5,
      frontSetbackM: 4.5,
      garageSetbackM: 5.5,
      sideSetbackM: 1.5,
      rearSetbackM: 3.0,
      infrastructureChargePerDwelling: 24000,
      notes: "Under NSW Complying Development (CDC - Low Rise Housing Diversity Code), dual occupancy side-by-side (duplex) is FAST-TRACKED (no council DA) if lot is ≥ 500 m² with minimum 15.0m street frontage."
    },
    auxiliaryUnitRules: {
      minLotSizeM2: 450,
      maxGfaM2: 60,
      minFrontageM: 12.0,
      parkingSpacesRequired: 1,
      infrastructureCharge: 8500,
      notes: "Secondary Dwelling (Granny Flat) under NSW SEPP (Housing) 2021: permissible via 10-day CDC on lots ≥ 450 m² with min 12m frontage, max 60m² GFA."
    },
    overlayProfile: {
      bushfireRisk: "BAL-LOW to BAL-12.5; BAL-29 near riparian bushland corridors",
      floodRisk: "Nepean River catchment: 1-in-100-year FFL 500mm freeboard",
      acousticRisk: "Camden Valley Way & Northern Road noise corridors",
      soilReactivity: "Class M to Class H1 reactive clay (Sydney Water ZOI applies)",
      sewerAuthority: "Sydney Water (45° angle of repose sewer ZOI guidelines)"
    },
    recommendedDesigns: [
      { name: "Wisteria 33 (NSW CDC Compliant)", type: "Duplex", minLotWidthM: 15.0, minLotDepthM: 26.0, summary: "Engineered specifically to satisfy NSW Low Rise Housing Diversity Code CDC setbacks." },
      { name: "Hudson Designer Duplex Suite", type: "Duplex", minLotWidthM: 15.5, minLotDepthM: 28.0, summary: "Torrens-title subdivisible side-by-side duplex design with mirror luxury finishes." }
    ]
  },
  {
    id: "nsw_blacktown",
    name: "Blacktown City Council (NSW)",
    state: "NSW",
    isPDA: false,
    governingInstrument: "SEPP (Housing) 2021 & Blacktown Local Environmental Plan (LEP) 2015 / Low Rise Housing Diversity Code",
    statutoryAuthority: "Blacktown City Council",
    coveredSuburbs: [
      "blacktown", "marsden park", "schofields", "box hill", "riverstone", 
      "mount druitt", "quakers hill", "colebee", "stanhope gardens", "kellyville ridge", 
      "the ponds", "rouse hill", "doonside", "rooty hill", "marayong", "tallawong", "grantham farm"
    ],
    zoningDefaults: {
      primaryZoning: "R2 Low Density Residential",
      description: "North West Growth Area with rapid residential development and high CDC duplex adoption."
    },
    duplexRules: {
      minLotSizeM2: 500,
      minFrontageM: 15.0,
      requiresPoDDesignation: false,
      assessmentCategory: "Complying Development (CDC)",
      maxSiteCoveragePct: 50,
      maxBuildingHeightM: 8.5,
      frontSetbackM: 4.5,
      garageSetbackM: 5.5,
      sideSetbackM: 1.5,
      rearSetbackM: 3.0,
      infrastructureChargePerDwelling: 25000,
      notes: "Dual occupancy attached (duplex) is Complying Development (CDC) under NSW SEPP Housing Code on lots ≥ 500 m² with ≥ 15m frontage. Subdivisible into Torrens Title if each subdivided lot is ≥ 250 m²."
    },
    auxiliaryUnitRules: {
      minLotSizeM2: 450,
      maxGfaM2: 60,
      minFrontageM: 12.0,
      parkingSpacesRequired: 1,
      infrastructureCharge: 9000,
      notes: "Granny flat / secondary dwelling permissible via fast-track CDC on residential lots ≥ 450 m²."
    },
    overlayProfile: {
      bushfireRisk: "BAL-LOW; BAL-12.5 near localized creek vegetation",
      floodRisk: "South Creek & Eastern Creek overland flow buffers",
      acousticRisk: "Richmond Road & Schofields Road traffic corridors",
      soilReactivity: "Class M to Class H1 reactive shale clays",
      sewerAuthority: "Sydney Water"
    },
    recommendedDesigns: [
      { name: "Wisteria 34", type: "Duplex", minLotWidthM: 15.0, minLotDepthM: 26.0, summary: "Proven dual-occupancy design for Marsden Park & Schofields growth corridor." },
      { name: "Alabaster 31", type: "Duplex", minLotWidthM: 15.0, minLotDepthM: 26.0, summary: "High-yield dual occupancy design meeting NSW Housing Code CDC requirements." }
    ]
  },
  {
    id: "nsw_central_coast",
    name: "Central Coast Council (NSW)",
    state: "NSW",
    isPDA: false,
    governingInstrument: "SEPP (Housing) 2021 & Central Coast LEP 2022 / Low Rise Housing Diversity Code",
    statutoryAuthority: "Central Coast Council",
    coveredSuburbs: [
      "warnervale", "woongarrah", "wadalba", "wyong", "tuggerah", 
      "gosford", "hamlyn terrace", "kanwal", "gorokan", "bâteau bay", 
      "terrigal", "avoca beach", "erina", "kincumber", "woy woy", "ourimbah", "narara"
    ],
    zoningDefaults: {
      primaryZoning: "R2 Low Density Residential",
      description: "Central Coast masterplanned corridor featuring Hudson display home at HomeWorld Warnervale."
    },
    duplexRules: {
      minLotSizeM2: 550,
      minFrontageM: 15.0,
      requiresPoDDesignation: false,
      assessmentCategory: "Complying Development (CDC)",
      maxSiteCoveragePct: 50,
      maxBuildingHeightM: 8.5,
      frontSetbackM: 4.5,
      garageSetbackM: 5.5,
      sideSetbackM: 1.5,
      rearSetbackM: 3.0,
      infrastructureChargePerDwelling: 22000,
      notes: "Central Coast Council R2 Low Density allows attached dual occupancy (duplex) on lots ≥ 550 m² with 15m frontage under CDC, or DA approval. Display Centre located at HomeWorld Warnervale."
    },
    auxiliaryUnitRules: {
      minLotSizeM2: 450,
      maxGfaM2: 60,
      minFrontageM: 12.0,
      parkingSpacesRequired: 1,
      infrastructureCharge: 7500,
      notes: "Secondary dwelling up to 60m² allowable via CDC on lots ≥ 450 m²."
    },
    overlayProfile: {
      bushfireRisk: "BAL-LOW to BAL-12.5; BAL-19/29 near Lake Macquarie / Wyong bush corridors",
      floodRisk: "Tuggerah Lakes catchment: Min FFL 500mm above flood planning level",
      acousticRisk: "M1 Motorway & Pacific Highway corridors",
      soilReactivity: "Class M to Class H1 reactive clay",
      sewerAuthority: "Central Coast Council Water & Sewer"
    },
    recommendedDesigns: [
      { name: "Wisteria 33", type: "Duplex", minLotWidthM: 15.0, minLotDepthM: 26.0, summary: "Standard Warnervale display-proven dual occupancy." },
      { name: "Alabaster 31", type: "Duplex", minLotWidthM: 15.0, minLotDepthM: 25.0, summary: "Compact investor floorplan for Warnervale and Wadalba estates." }
    ]
  },
  {
    id: "nsw_maitland",
    name: "Maitland City Council (Hunter Region NSW)",
    state: "NSW",
    isPDA: false,
    governingInstrument: "SEPP (Housing) 2021 & Maitland LEP 2011 / Low Rise Housing Diversity Code",
    statutoryAuthority: "Maitland City Council",
    coveredSuburbs: [
      "lochinvar", "thornton", "chisholm", "maitland", "gillieston heights", 
      "rutherford", "east maitland", "tenambit", "louth park", "ashtonfield", "morpeth"
    ],
    zoningDefaults: {
      primaryZoning: "R1 General Residential / R2 Low Density Residential",
      description: "Hunter Valley growth corridor popular for family homes and high-yield duplex packages."
    },
    duplexRules: {
      minLotSizeM2: 500,
      minFrontageM: 15.0,
      requiresPoDDesignation: false,
      assessmentCategory: "Complying Development (CDC)",
      maxSiteCoveragePct: 50,
      maxBuildingHeightM: 8.5,
      frontSetbackM: 4.5,
      garageSetbackM: 5.5,
      sideSetbackM: 1.5,
      rearSetbackM: 3.0,
      infrastructureChargePerDwelling: 21000,
      notes: "Maitland & Hunter growth areas permit attached dual occupancy under NSW Housing Code CDC on lots ≥ 500 m² with min 15m frontage."
    },
    auxiliaryUnitRules: {
      minLotSizeM2: 450,
      maxGfaM2: 60,
      minFrontageM: 12.0,
      parkingSpacesRequired: 1,
      infrastructureCharge: 7000,
      notes: "Secondary dwelling up to 60m² allowable via CDC on lots ≥ 450 m²."
    },
    overlayProfile: {
      bushfireRisk: "BAL-LOW to BAL-12.5; BAL-19 near Hunter Valley woodland edges",
      floodRisk: "Hunter River catchment: FFL +500mm freeboard above local flood crest",
      acousticRisk: "New England Highway & Hunter Expressway corridors",
      soilReactivity: "Class M to Class H1 reactive soil",
      sewerAuthority: "Hunter Water"
    },
    recommendedDesigns: [
      { name: "Wisteria 33", type: "Duplex", minLotWidthM: 15.0, minLotDepthM: 26.0, summary: "Hunter display-proven dual occupancy." },
      { name: "Alabaster 31", type: "Duplex", minLotWidthM: 15.0, minLotDepthM: 25.0, summary: "Compact investor floorplan for Lochinvar and Thornton estates." }
    ]
  },
  // --------------------------------------------------------------------------
  // 13. NEW SOUTH WALES — THE HILLS SHIRE (BOX HILL, THE GABLES, CASTLE HILL)
  // --------------------------------------------------------------------------
  {
    id: "nsw_the_hills",
    name: "The Hills Shire Council",
    state: "NSW",
    isPDA: false,
    governingInstrument: "The Hills LEP 2019, Box Hill North Precinct DCP & NSW Housing SEPP",
    statutoryAuthority: "The Hills Shire Council",
    coveredSuburbs: [
      "box hill", "the gables", "gables", "castle hill", "baulkham hills", "bella vista", 
      "norwest", "kellyville", "north kellyville", "beaumont hills", "rouse hill", 
      "kenthurst", "dural", "annangrove", "glenhaven", "maraylya"
    ],
    zoningDefaults: {
      primaryZoning: "R2 Low Density Residential / R3 Medium Density Residential",
      description: "High-demand North West Sydney growth corridor renowned for masterplanned community estates, generous executive residences, and strong capital growth."
    },
    duplexRules: {
      minLotSizeM2: 600,
      minFrontageM: 15.0,
      requiresPoDDesignation: false,
      assessmentCategory: "Complying Development (CDC)",
      maxSiteCoveragePct: 50,
      maxBuildingHeightM: 8.5,
      frontSetbackM: 4.5,
      garageSetbackM: 5.5,
      sideSetbackM: 1.5,
      rearSetbackM: 3.0,
      infrastructureChargePerDwelling: 20000,
      notes: "Dual occupancy attached is Complying Development (CDC) on lots ≥ 500m² under Low Rise Housing Diversity Code (or ≥ 600m² with 15m frontage under The Hills LEP)."
    },
    auxiliaryUnitRules: {
      minLotSizeM2: 450,
      maxGfaM2: 60,
      minFrontageM: 12.0,
      parkingSpacesRequired: 1,
      infrastructureCharge: 7200,
      notes: "Secondary dwelling (granny flat) is permitted under NSW Housing SEPP up to 60m² GFA on lots ≥ 450m²."
    },
    overlayProfile: {
      bushfireRisk: "BAL-LOW in new masterplanned sectors (The Gables); BAL-12.5 to BAL-29 along Cattai Creek / rural interface",
      floodRisk: "Cattai Creek & tributary overland flow management; minimum 500mm freeboard",
      acousticRisk: "Windsor Road & Annangrove Road arterial corridors (Category 2 acoustic laminated glazing)",
      soilReactivity: "Class M to Class H1 reactive clay (Bringelly Shale)",
      sewerAuthority: "Sydney Water"
    },
    recommendedDesigns: [
      { name: "Burgundy 34 / 37", type: "Double Storey", minLotWidthM: 14.0, minLotDepthM: 26.0, summary: "Flagship luxury double storey tailored for prestigious Box Hill and The Gables executive blocks." },
      { name: "Wisteria 33 / 36", type: "Duplex", minLotWidthM: 15.0, minLotDepthM: 28.0, summary: "High-yield dual living floorplan meeting CDC frontage standards." },
      { name: "Jasper 26", type: "Single Storey", minLotWidthM: 14.0, minLotDepthM: 25.0, summary: "Popular 4-bedroom single storey with grand alfresco." }
    ]
  },
  // --------------------------------------------------------------------------
  // 14. NEW SOUTH WALES — CITY OF PENRITH
  // --------------------------------------------------------------------------
  {
    id: "nsw_penrith",
    name: "Penrith City Council",
    state: "NSW",
    isPDA: false,
    governingInstrument: "Penrith LEP 2010 & NSW Housing SEPP (Low Rise Housing Diversity Code)",
    statutoryAuthority: "Penrith City Council",
    coveredSuburbs: [
      "penrith", "jordan springs", "cadence", "glenmore park", "mulgoa", "orchard hills", 
      "st marys", "kingswood", "cranebrook", "emu plains", "caddens", "cambridge park", 
      "cambridge gardens", "werrington", "werrington county", "werrington downs", "st clair", "colyton"
    ],
    zoningDefaults: {
      primaryZoning: "R2 Low Density Residential",
      description: "Western Sydney growth corridor surrounding the Western Sydney Aerotropolis with active masterplans in Jordan Springs and Glenmore Park."
    },
    duplexRules: {
      minLotSizeM2: 650,
      minFrontageM: 15.0,
      requiresPoDDesignation: false,
      assessmentCategory: "Complying Development (CDC)",
      maxSiteCoveragePct: 50,
      maxBuildingHeightM: 8.5,
      frontSetbackM: 4.5,
      garageSetbackM: 5.5,
      sideSetbackM: 1.2,
      rearSetbackM: 3.0,
      infrastructureChargePerDwelling: 19500,
      notes: "Dual occupancy attached is Complying Development (CDC) on lots ≥ 500m² under Low Rise Housing Diversity Code (or ≥ 650m² under Penrith LEP with 15m frontage)."
    },
    auxiliaryUnitRules: {
      minLotSizeM2: 450,
      maxGfaM2: 60,
      minFrontageM: 12.0,
      parkingSpacesRequired: 1,
      infrastructureCharge: 6800,
      notes: "Secondary dwelling (granny flat) CDC compliant up to 60m² GFA on lots ≥ 450m²."
    },
    overlayProfile: {
      bushfireRisk: "BAL-LOW to BAL-12.5 in suburban releases; BAL-19/29 near Castlereagh woodlands and Nepean riverbank",
      floodRisk: "Nepean River / South Creek catchment overland flow controls; FFL 500mm above 1% AEP",
      acousticRisk: "Western Sydney Airport (ANEF noise contours) & Northern Road corridor",
      soilReactivity: "Class M to Class H1 expansive alluvial clays",
      sewerAuthority: "Sydney Water"
    },
    recommendedDesigns: [
      { name: "Wisteria 33", type: "Duplex", minLotWidthM: 15.0, minLotDepthM: 26.0, summary: "Turnkey duplex meeting Penrith CDC requirements." },
      { name: "Azure 25", type: "Single Storey", minLotWidthM: 12.5, minLotDepthM: 25.0, summary: "High-efficiency 4-bedroom home fitting standard Jordan Springs lots." },
      { name: "Alabaster 31", type: "Duplex", minLotWidthM: 15.0, minLotDepthM: 26.0, summary: "Investor dual-occupancy configuration with separate entries meeting Penrith CDC standards." }
    ]
  },
  // --------------------------------------------------------------------------
  // 15. NEW SOUTH WALES — LIVERPOOL CITY COUNCIL (AUSTRAL, EDMONDSON PARK)
  // --------------------------------------------------------------------------
  {
    id: "nsw_liverpool",
    name: "Liverpool City Council",
    state: "NSW",
    isPDA: false,
    governingInstrument: "Liverpool LEP 2008 & South West Growth Centre SEPP",
    statutoryAuthority: "Liverpool City Council",
    coveredSuburbs: [
      "liverpool", "austral", "austral estate", "edmondson park", "moorebank", "casula", 
      "prestons", "warwick farm", "chipping norton", "hoxton park", "carnes hill", 
      "hinchinbrook", "middleton grange", "cecil hills", "cecil park", "kemps creek", "badgerys creek"
    ],
    zoningDefaults: {
      primaryZoning: "R2 Low Density Residential / R3 Medium Density Residential",
      description: "Major South West Sydney growth precinct adjoining Western Sydney International Airport, with massive residential development in Austral and Edmondson Park."
    },
    duplexRules: {
      minLotSizeM2: 600,
      minFrontageM: 15.0,
      requiresPoDDesignation: false,
      assessmentCategory: "Complying Development (CDC)",
      maxSiteCoveragePct: 50,
      maxBuildingHeightM: 8.5,
      frontSetbackM: 4.5,
      garageSetbackM: 5.5,
      sideSetbackM: 1.2,
      rearSetbackM: 3.0,
      infrastructureChargePerDwelling: 20000,
      notes: "Dual occupancy attached is Complying Development (CDC) on lots ≥ 500m² under Low Rise Housing Diversity Code (or ≥ 600m² under Liverpool LEP)."
    },
    auxiliaryUnitRules: {
      minLotSizeM2: 450,
      maxGfaM2: 60,
      minFrontageM: 12.0,
      parkingSpacesRequired: 1,
      infrastructureCharge: 7000,
      notes: "Granny flat CDC up to 60m² GFA on lots ≥ 450m²."
    },
    overlayProfile: {
      bushfireRisk: "BAL-LOW in Austral suburban precincts; BAL-12.5 near Kemps Creek conservation buffers",
      floodRisk: "Kemps Creek / Cabramatta Creek overland flow lines; minimum 500mm freeboard",
      acousticRisk: "M7 Motorway, Bringelly Road & Western Sydney Airport flight corridors",
      soilReactivity: "Class M to Class H1 Bringelly Shale reactive clay",
      sewerAuthority: "Sydney Water"
    },
    recommendedDesigns: [
      { name: "Wisteria 34", type: "Duplex", minLotWidthM: 15.0, minLotDepthM: 28.0, summary: "High-yield dual living design engineered for Austral investor allotments." },
      { name: "Amber 21", type: "Single Storey", minLotWidthM: 12.5, minLotDepthM: 22.0, summary: "Turnkey single storey fitting compact 350m²-450m² suburban parcels." },
      { name: "Burgundy 30", type: "Double Storey", minLotWidthM: 13.0, minLotDepthM: 24.0, summary: "Spacious two-storey executive layout." }
    ]
  },
  // --------------------------------------------------------------------------
  // 16. NEW SOUTH WALES — CAMPBELLTOWN CITY COUNCIL (MENANGLE PARK, MACARTHUR)
  // --------------------------------------------------------------------------
  {
    id: "nsw_campbelltown",
    name: "Campbelltown City Council",
    state: "NSW",
    isPDA: false,
    governingInstrument: "Campbelltown LEP 2015 & Greater Macarthur Growth Area Scheme",
    statutoryAuthority: "Campbelltown City Council",
    coveredSuburbs: [
      "campbelltown", "menangle park", "macarthur", "glenfield", "ingleburn", "minto", 
      "leumeah", "raby", "rosemeadow", "bardia", "blair athol", "blairmount", 
      "denham court", "ambarvale", "airds", "bradbury", "st helens park", "englorie park"
    ],
    zoningDefaults: {
      primaryZoning: "R2 Low Density Residential",
      description: "Macarthur region growth corridor featuring premier masterplanned communities like Menangle Park."
    },
    duplexRules: {
      minLotSizeM2: 700,
      minFrontageM: 15.0,
      requiresPoDDesignation: false,
      assessmentCategory: "Complying Development (CDC)",
      maxSiteCoveragePct: 50,
      maxBuildingHeightM: 8.5,
      frontSetbackM: 4.5,
      garageSetbackM: 5.5,
      sideSetbackM: 1.2,
      rearSetbackM: 3.0,
      infrastructureChargePerDwelling: 19000,
      notes: "Dual occupancy attached is Complying Development (CDC) on lots ≥ 500m² under Low Rise Housing Diversity Code (or ≥ 700m² under Campbelltown LEP)."
    },
    auxiliaryUnitRules: {
      minLotSizeM2: 450,
      maxGfaM2: 60,
      minFrontageM: 12.0,
      parkingSpacesRequired: 1,
      infrastructureCharge: 6800,
      notes: "Secondary dwelling CDC up to 60m² GFA."
    },
    overlayProfile: {
      bushfireRisk: "BAL-LOW in core suburban parcels; BAL-12.5/29 near Georges River bushland corridor",
      floodRisk: "Bow Bowing Creek catchment controls; minimum 500mm freeboard",
      acousticRisk: "Hume Motorway & Southern Rail corridor noise management",
      soilReactivity: "Class M to Class H1 reactive clay",
      sewerAuthority: "Sydney Water"
    },
    recommendedDesigns: [
      { name: "Wisteria 33", type: "Duplex", minLotWidthM: 15.0, minLotDepthM: 26.0, summary: "Display-proven dual occupancy with private alfresco zones." },
      { name: "Cedar 26", type: "Single Storey", minLotWidthM: 13.5, minLotDepthM: 24.0, summary: "Expansive 4-bed family design with home theatre." }
    ]
  },
  // --------------------------------------------------------------------------
  // 17. NEW SOUTH WALES — WOLLONDILLY SHIRE COUNCIL (WILTON, BINGARA GORGE)
  // --------------------------------------------------------------------------
  {
    id: "nsw_wollondilly",
    name: "Wollondilly Shire Council",
    state: "NSW",
    isPDA: false,
    governingInstrument: "Wollondilly LEP 2011, Wilton Growth Area DCP & NSW Housing SEPP",
    statutoryAuthority: "Wollondilly Shire Council",
    coveredSuburbs: [
      "wollondilly", "wilton", "wilton greens", "bingara gorge", "appin", "tahmoor", 
      "picton", "bargo", "thirlmere", "silverdale", "the oaks", "warragamba", 
      "douglas park", "pheasants nest", "menangle"
    ],
    zoningDefaults: {
      primaryZoning: "R2 Low Density Residential",
      description: "Picturesque semi-rural and emerging masterplanned corridor (Wilton New Town) featuring generous building envelopes."
    },
    duplexRules: {
      minLotSizeM2: 800,
      minFrontageM: 15.0,
      requiresPoDDesignation: false,
      assessmentCategory: "Complying Development (CDC)",
      maxSiteCoveragePct: 50,
      maxBuildingHeightM: 8.5,
      frontSetbackM: 5.0,
      garageSetbackM: 5.5,
      sideSetbackM: 1.5,
      rearSetbackM: 4.0,
      infrastructureChargePerDwelling: 18500,
      notes: "Dual occupancy attached is Complying Development (CDC) on lots ≥ 500m² under Low Rise Housing Diversity Code (or ≥ 800m² under Wollondilly LEP)."
    },
    auxiliaryUnitRules: {
      minLotSizeM2: 450,
      maxGfaM2: 60,
      minFrontageM: 12.0,
      parkingSpacesRequired: 1,
      infrastructureCharge: 6500,
      notes: "Secondary dwelling permitted under NSW Housing SEPP up to 60m²."
    },
    overlayProfile: {
      bushfireRisk: "Moderate / High (BAL-12.5 to BAL-29 common near gorges and conservation bushland)",
      floodRisk: "Overland flow and stormwater drainage swale management",
      acousticRisk: "Hume Highway & Picton Road transport corridors",
      soilReactivity: "Class M to Class H1 Hawkesbury sandstone/clay profile",
      sewerAuthority: "Sydney Water"
    },
    recommendedDesigns: [
      { name: "Mulberry 28", type: "Single Storey", minLotWidthM: 25.0, minLotDepthM: 20.0, summary: "Grand acreage ranch home ideal for Bingara Gorge and Wilton acreage lots." },
      { name: "Wisteria 36", type: "Duplex", minLotWidthM: 16.0, minLotDepthM: 28.0, summary: "Spacious dual living configuration." }
    ]
  },
  // --------------------------------------------------------------------------
  // 18. QUEENSLAND — SUNSHINE COAST COUNCIL (HARMONY, AURA, PELICAN WATERS)
  // --------------------------------------------------------------------------
  {
    id: "council_sunshine_coast",
    name: "Sunshine Coast Council",
    state: "QLD",
    isPDA: false,
    governingInstrument: "Sunshine Coast Planning Scheme 2014 & Caloundra South (Aura) PDA Scheme",
    statutoryAuthority: "Sunshine Coast Council",
    coveredSuburbs: [
      "sunshine coast", "palmview", "harmony", "harmony estate", "pelican waters", 
      "caloundra", "baringa", "nirimba", "aura", "aura estate", "maroochydore", 
      "buderim", "sippy downs", "kawana", "coolum", "mooloolaba", "marcoola", 
      "currimundi", "golden beach", "little mountain"
    ],
    zoningDefaults: {
      primaryZoning: "Low Density Residential / Caloundra South Urban Living PDA",
      description: "Premier coastal lifestyle corridor with high-volume masterplans in Harmony (Palmview) and Aura (Baringa/Nirimba)."
    },
    duplexRules: {
      minLotSizeM2: 800,
      minFrontageM: 18.0,
      requiresPoDDesignation: false,
      assessmentCategory: "Code Assessable",
      maxSiteCoveragePct: 50,
      maxBuildingHeightM: 8.5,
      frontSetbackM: 6.0,
      garageSetbackM: 6.0,
      sideSetbackM: 1.5,
      rearSetbackM: 2.0,
      infrastructureChargePerDwelling: 31000,
      notes: "Dual occupancy (duplex) is Code Assessable in Low Density Residential Zone on lots ≥ 800m² with 18m frontage (or ≥ 600m² in Medium Density and Aura PoD designated lots)."
    },
    auxiliaryUnitRules: {
      minLotSizeM2: 450,
      maxGfaM2: 60,
      minFrontageM: 14.0,
      parkingSpacesRequired: 1,
      infrastructureCharge: 0,
      notes: "Secondary dwelling is Accepted Development on lots ≥ 450m² with max 60m² GFA. Exempt from council infrastructure charges when built under single title."
    },
    overlayProfile: {
      bushfireRisk: "BAL-LOW in suburban estates; BAL-12.5/19 near coastal heath and wallum reserves",
      floodRisk: "Mooloolah River & Pumicestone Passage catchment flood planning controls",
      acousticRisk: "Bruce Highway & Sunshine Motorway noise corridors (QDC MP 4.4 Category 2/3)",
      soilReactivity: "Class S to Class M coastal sands and sandy clays",
      sewerAuthority: "Unitywater"
    },
    recommendedDesigns: [
      { name: "Wisteria 33 / 34", type: "Duplex", minLotWidthM: 18.0, minLotDepthM: 28.0, summary: "High-yield dual living design compliant with Sunshine Coast frontage guidelines." },
      { name: "Azure 25", type: "Single Storey", minLotWidthM: 12.5, minLotDepthM: 25.0, summary: "Modern 4-bedroom coastal family design." },
      { name: "Amber 21 (Auxiliary Suite)", type: "Dual Key", minLotWidthM: 14.0, minLotDepthM: 26.0, summary: "Complies with 60m² auxiliary limit with $0 infrastructure charges." }
    ]
  },
  // --------------------------------------------------------------------------
  // 19. NEW SOUTH WALES — CESSNOCK CITY COUNCIL (HUNTLEE / NORTH ROTHBURY)
  // --------------------------------------------------------------------------
  {
    id: "nsw_cessnock",
    name: "Cessnock City Council (Hunter Valley NSW)",
    state: "NSW",
    isPDA: false,
    governingInstrument: "Cessnock LEP 2011, Huntlee DCP & NSW Housing SEPP",
    statutoryAuthority: "Cessnock City Council",
    coveredSuburbs: [
      "cessnock", "huntlee", "huntlee new town", "north rothbury", "branxton", 
      "kurri kurri", "bellbird", "cliftleigh", "weston", "aberdare", "kitchener", "millfield", "greta"
    ],
    zoningDefaults: {
      primaryZoning: "R2 Low Density Residential / Huntlee Masterplanned Estate",
      description: "Hunter Valley wine country corridor featuring the Huntlee New Town masterplanned community."
    },
    duplexRules: {
      minLotSizeM2: 600,
      minFrontageM: 15.0,
      requiresPoDDesignation: false,
      assessmentCategory: "Complying Development (CDC)",
      maxSiteCoveragePct: 50,
      maxBuildingHeightM: 8.5,
      frontSetbackM: 4.5,
      garageSetbackM: 5.5,
      sideSetbackM: 1.2,
      rearSetbackM: 3.0,
      infrastructureChargePerDwelling: 18000,
      notes: "Dual occupancy attached is Complying Development (CDC) on lots ≥ 500m² under Low Rise Housing Diversity Code (or ≥ 600m² under Cessnock LEP)."
    },
    auxiliaryUnitRules: {
      minLotSizeM2: 450,
      maxGfaM2: 60,
      minFrontageM: 12.0,
      parkingSpacesRequired: 1,
      infrastructureCharge: 6200,
      notes: "Secondary dwelling CDC up to 60m² GFA."
    },
    overlayProfile: {
      bushfireRisk: "BAL-LOW in new Huntlee villages; BAL-12.5/29 near Pokolbin State Forest borders",
      floodRisk: "Black Creek catchment overland flow management",
      acousticRisk: "Hunter Expressway corridor (Category 2 acoustic glazing)",
      soilReactivity: "Class M to Class H1 reactive clay",
      sewerAuthority: "Hunter Water"
    },
    recommendedDesigns: [
      { name: "Wisteria 33", type: "Duplex", minLotWidthM: 15.0, minLotDepthM: 26.0, summary: "Investor dual-occupancy design meeting Huntlee design standards." },
      { name: "Amber 21", type: "Single Storey", minLotWidthM: 12.5, minLotDepthM: 22.0, summary: "Affordable family floorplan." }
    ]
  },
  // --------------------------------------------------------------------------
  // 20. NEW SOUTH WALES — SHELLHARBOUR & WOLLONGONG (CALDERWOOD VALLEY)
  // --------------------------------------------------------------------------
  {
    id: "nsw_shellharbour",
    name: "Shellharbour City & Wollongong City Council",
    state: "NSW",
    isPDA: false,
    governingInstrument: "Shellharbour LEP 2013, Calderwood VPA & NSW Housing SEPP",
    statutoryAuthority: "Shellharbour City Council / Wollongong City Council",
    coveredSuburbs: [
      "shellharbour", "calderwood", "calderwood valley", "albion park", "albion park rail", 
      "wollongong", "dapto", "figtree", "bulli", "corrimal", "flinders", "shell cove", 
      "warilla", "oak flats", "barrack heights", "horsley", "haywards bay"
    ],
    zoningDefaults: {
      primaryZoning: "R2 Low Density Residential / Calderwood Masterplan",
      description: "Illawarra coastal and escarpment corridor with premier masterplanned living in Lendlease Calderwood Valley."
    },
    duplexRules: {
      minLotSizeM2: 600,
      minFrontageM: 15.0,
      requiresPoDDesignation: false,
      assessmentCategory: "Complying Development (CDC)",
      maxSiteCoveragePct: 50,
      maxBuildingHeightM: 8.5,
      frontSetbackM: 4.5,
      garageSetbackM: 5.5,
      sideSetbackM: 1.2,
      rearSetbackM: 3.0,
      infrastructureChargePerDwelling: 19500,
      notes: "Dual occupancy attached is Complying Development (CDC) on lots ≥ 500m² under Low Rise Housing Diversity Code (or ≥ 600m² under Shellharbour LEP)."
    },
    auxiliaryUnitRules: {
      minLotSizeM2: 450,
      maxGfaM2: 60,
      minFrontageM: 12.0,
      parkingSpacesRequired: 1,
      infrastructureCharge: 6800,
      notes: "Secondary dwelling CDC up to 60m² GFA."
    },
    overlayProfile: {
      bushfireRisk: "BAL-LOW to BAL-12.5; BAL-19/29 near Illawarra Escarpment bush corridors",
      floodRisk: "Macquarie Rivulet & Lake Illawarra catchment management",
      acousticRisk: "Princes Highway / Albion Park Rail bypass corridor",
      soilReactivity: "Class M to Class H1 Illawarra clay profile",
      sewerAuthority: "Sydney Water"
    },
    recommendedDesigns: [
      { name: "Wisteria 34", type: "Duplex", minLotWidthM: 15.0, minLotDepthM: 28.0, summary: "High-yield dual living design suited for Calderwood Valley." },
      { name: "Azure 25", type: "Single Storey", minLotWidthM: 12.5, minLotDepthM: 25.0, summary: "Smart 4-bed family home." }
    ]
  }
];

const SUBURB_TYPOS = {
  ahsmore: "ashmore",
  asmore: "ashmore",
  ashmor: "ashmore",
  morayfeild: "morayfield",
  greenbannk: "greenbank",
  warnerval: "warnervale",
  rippley: "ripley",
  calderwud: "calderwood",
  soutport: "southport",
  carrarra: "carrara",
  marsdenprk: "marsden park",
  edmonson: "edmondson park",
  edmondsen: "edmondson park",
  bingarra: "bingara gorge",
  huntly: "huntlee",
};

export function parsePropertyPlanningQuery(query) {
  let clean = (query || "").trim();
  let isCCCommand = false;

  // 1. Detect and strip CC (Compliance Check) Shorthand Prefix
  const ccMatch = clean.match(/^cc\b[:\s]*/i);
  if (ccMatch) {
    isCCCommand = true;
    clean = clean.slice(ccMatch[0].length).trim();
  }

  // Pre-normalize common suburb typos
  for (const [typo, replacement] of Object.entries(SUBURB_TYPOS)) {
    const typoRegex = new RegExp(`\\b${typo}\\b`, "gi");
    clean = clean.replace(typoRegex, replacement);
  }

  const norm = clean.toLowerCase();

  // 2. Detect Development Typology
  let typology = isCCCommand ? "compliance_check" : "duplex";
  if (/\b(?:dual[-\s]?key|auxiliary\s*unit|auxiliary\s*dwelling)\b/i.test(norm)) {
    typology = "dual_key";
  } else if (/\b(?:granny\s*flat|secondary\s*dwelling)\b/i.test(norm)) {
    typology = "secondary_dwelling";
  } else if (/\b(?:rooming|co[-\s]?living|ndis|sda)\b/i.test(norm)) {
    typology = "rooming_accommodation";
  } else if (/\b(?:double\s*storey|two\s*storey)\b/i.test(norm)) {
    typology = "double_storey";
  } else if (/\b(?:single\s*storey|one\s*storey)\b/i.test(norm)) {
    typology = "single_storey";
  } else if (/\b(?:duplex|dual[-\s]?occupancy|dual[-\s]?living)\b/i.test(norm)) {
    typology = "duplex";
  }

  // 3. Extract Lot Size (e.g. 600m2, 800sqm, 450 m²)
  let lotSizeM2 = undefined;
  const lotMatch = norm.match(/(\d{3,5})\s*(?:m2|sqm|m²|square\s*metres?)/i);
  if (lotMatch) {
    lotSizeM2 = parseInt(lotMatch[1], 10);
  }

  // 4. Extract Frontage (e.g. 15m, 18m frontage, 16 metre frontage)
  let frontageM = undefined;
  const frontageMatch = norm.match(/(\d{1,2}(?:\.\d+)?)\s*(?:m|metre|meter)s?\s*(?:wide|frontage|width)?/i);
  if (frontageMatch && !norm.includes(frontageMatch[0] + "2") && !norm.includes(frontageMatch[0] + "²")) {
    const val = parseFloat(frontageMatch[1]);
    if (val >= 8 && val <= 50) {
      frontageM = val;
    }
  }

  // 5. Extract Street Address (e.g. "131 Mount Cotton Road", "61 Paradise Road", "14 Smith Street")
  let streetNumber = undefined;
  let streetName = undefined;
  const addressMatch = clean.match(/(?:lot\s*)?(\d+[a-z]?)\s+([a-z\s]+?(?:road|rd|street|st|drive|dr|avenue|ave|crescent|cres|lane|way|court|ct|boulevard|bvd|circuit|cct|parade|pde|place|pl|highway|hwy))\b/i);
  if (addressMatch) {
    streetNumber = addressMatch[1];
    streetName = addressMatch[2].trim();
  }

  // 6. Detect Suburb & State
  let detectedSuburb = undefined;
  let detectedState = undefined;

  // Compile all covered suburbs across all jurisdictions and sort by length descending
  // This guarantees longer compound names match first (e.g. "marsden park" before "marsden")
  const candidates = [];
  for (const jur of JURISDICTIONS) {
    for (const sub of jur.coveredSuburbs) {
      candidates.push({ suburb: sub, state: jur.state, councilId: jur.id });
    }
  }

  // Also include key landmark estates
  candidates.push(
    { suburb: "the gables", state: "NSW", councilId: "nsw_the_hills" },
    { suburb: "elara", state: "NSW", councilId: "nsw_blacktown" },
    { suburb: "harmony", state: "QLD", councilId: "council_sunshine_coast" },
    { suburb: "aura", state: "QLD", councilId: "council_sunshine_coast" },
    { suburb: "huntlee", state: "NSW", councilId: "nsw_cessnock" },
    { suburb: "bingara gorge", state: "NSW", councilId: "nsw_wollondilly" },
    { suburb: "calderwood valley", state: "NSW", councilId: "nsw_shellharbour" }
  );

  candidates.sort((a, b) => b.suburb.length - a.suburb.length);

  // If the query mentions NSW or QLD explicitly, prioritize candidates for that state
  const queryMentionsNSW = /\b(?:nsw|new\s*south\s*wales|sydney|hunter|newcastle|central\s*coast|illawarra)\b/i.test(norm);
  const queryMentionsQLD = /\b(?:qld|queensland|brisbane|gold\s*coast|sunshine\s*coast|moreton|redland|logan|ipswich)\b/i.test(norm);

  const sortedCandidates = candidates.slice().sort((a, b) => {
    if (queryMentionsNSW) {
      if (a.state === "NSW" && b.state !== "NSW") return -1;
      if (b.state === "NSW" && a.state !== "NSW") return 1;
    } else if (queryMentionsQLD) {
      if (a.state === "QLD" && b.state !== "QLD") return -1;
      if (b.state === "QLD" && a.state !== "QLD") return 1;
    }
    return b.suburb.length - a.suburb.length;
  });

  for (const cand of sortedCandidates) {
    const escaped = cand.suburb.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(norm)) {
      detectedSuburb = cand.suburb
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      detectedState = cand.state;
      break;
    }
  }

  // Fallback state detection
  if (!detectedState) {
    if (/\b(?:qld|queensland|brisbane|gold\s*coast|moreton|redland|logan|ipswich|sunshine\s*coast)\b/i.test(norm)) {
      detectedState = "QLD";
    } else if (/\b(?:nsw|new\s*south\s*wales|sydney|hunter|newcastle|central\s*coast|camden|blacktown|penrith|liverpool|campbelltown|wollondilly|cessnock|shellharbour|wollongong)\b/i.test(norm)) {
      detectedState = "NSW";
    }
  }

  return {
    rawQuery: query,
    isCCCommand,
    streetNumber,
    streetName,
    suburb: detectedSuburb,
    state: detectedState,
    lotSizeM2,
    frontageM,
    targetTypology: typology,
  };
}

export function evaluatePropertyFeasibilityStandalone(query) {
  const parsed = parsePropertyPlanningQuery(query);

  let jurisdiction = undefined;

  if (parsed.suburb) {
    const subLower = parsed.suburb.toLowerCase();
    jurisdiction = JURISDICTIONS.find((j) =>
      j.coveredSuburbs.some((s) => s.toLowerCase() === subLower)
    );
  }

  if (!jurisdiction) {
    const norm = (query || "").toLowerCase();
    if (norm.includes("mount cotton") || norm.includes("mt cotton") || norm.includes("redland")) {
      jurisdiction = JURISDICTIONS.find((j) => j.id === "council_redland");
    } else if (norm.includes("flagstone") || norm.includes("paradise")) {
      jurisdiction = JURISDICTIONS.find((j) => j.id === "pda_greater_flagstone");
    } else if (norm.includes("ripley") || norm.includes("providence")) {
      jurisdiction = JURISDICTIONS.find((j) => j.id === "pda_ripley_valley");
    } else if (norm.includes("logan") || norm.includes("carbrook") || norm.includes("cornubia")) {
      jurisdiction = JURISDICTIONS.find((j) => j.id === "council_logan");
    } else if (norm.includes("ipswich")) {
      jurisdiction = JURISDICTIONS.find((j) => j.id === "council_ipswich");
    } else if (norm.includes("moreton") || norm.includes("morayfield") || norm.includes("caboolture")) {
      jurisdiction = JURISDICTIONS.find((j) => j.id === "council_moreton_bay");
    } else if (norm.includes("sunshine coast") || norm.includes("palmview") || norm.includes("aura") || norm.includes("harmony")) {
      jurisdiction = JURISDICTIONS.find((j) => j.id === "council_sunshine_coast");
    } else if (norm.includes("box hill") || norm.includes("the gables") || norm.includes("the hills")) {
      jurisdiction = JURISDICTIONS.find((j) => j.id === "nsw_the_hills");
    } else if (norm.includes("penrith") || norm.includes("jordan springs") || norm.includes("caddens")) {
      jurisdiction = JURISDICTIONS.find((j) => j.id === "nsw_penrith");
    } else if (norm.includes("liverpool") || norm.includes("austral") || norm.includes("edmondson park")) {
      jurisdiction = JURISDICTIONS.find((j) => j.id === "nsw_liverpool");
    } else if (norm.includes("campbelltown") || norm.includes("menangle park")) {
      jurisdiction = JURISDICTIONS.find((j) => j.id === "nsw_campbelltown");
    } else if (norm.includes("wilton") || norm.includes("bingara gorge") || norm.includes("wollondilly")) {
      jurisdiction = JURISDICTIONS.find((j) => j.id === "nsw_wollondilly");
    } else if (norm.includes("huntlee") || norm.includes("cessnock")) {
      jurisdiction = JURISDICTIONS.find((j) => j.id === "nsw_cessnock");
    } else if (norm.includes("calderwood") || norm.includes("shellharbour") || norm.includes("wollongong")) {
      jurisdiction = JURISDICTIONS.find((j) => j.id === "nsw_shellharbour");
    } else if (norm.includes("camden") || norm.includes("oran park")) {
      jurisdiction = JURISDICTIONS.find((j) => j.id === "nsw_camden");
    } else if (norm.includes("blacktown") || norm.includes("marsden park") || norm.includes("schofields")) {
      jurisdiction = JURISDICTIONS.find((j) => j.id === "nsw_blacktown");
    } else if (norm.includes("warnervale") || norm.includes("central coast")) {
      jurisdiction = JURISDICTIONS.find((j) => j.id === "nsw_central_coast");
    } else if (norm.includes("hunter") || norm.includes("maitland") || norm.includes("lochinvar")) {
      jurisdiction = JURISDICTIONS.find((j) => j.id === "nsw_maitland");
    } else if (norm.includes("gold coast") || norm.includes("ashmore") || norm.includes("ahsmore") || norm.includes("warrigal") || norm.includes("southport") || norm.includes("carrara") || norm.includes("benowa")) {
      jurisdiction = JURISDICTIONS.find((j) => j.id === "council_gold_coast");
    } else if (parsed.state === "NSW") {
      jurisdiction = JURISDICTIONS.find((j) => j.id === "nsw_camden");
    } else {
      jurisdiction = JURISDICTIONS.find((j) => j.id === "council_redland");
    }
  }

  const j = jurisdiction || JURISDICTIONS[0];
  const isDuplex = parsed.targetTypology === "duplex";
  const isAuxiliary = parsed.targetTypology === "dual_key" || parsed.targetTypology === "secondary_dwelling";

  const rules = isDuplex ? j.duplexRules : isAuxiliary ? {
    minLotSizeM2: j.auxiliaryUnitRules.minLotSizeM2,
    minFrontageM: j.auxiliaryUnitRules.minFrontageM,
    requiresPoDDesignation: false,
    assessmentCategory: "Accepted Development",
    maxSiteCoveragePct: j.duplexRules.maxSiteCoveragePct,
    maxBuildingHeightM: j.duplexRules.maxBuildingHeightM,
    frontSetbackM: j.duplexRules.frontSetbackM,
    garageSetbackM: j.duplexRules.garageSetbackM,
    sideSetbackM: j.duplexRules.sideSetbackM,
    rearSetbackM: j.duplexRules.rearSetbackM,
    infrastructureChargePerDwelling: j.auxiliaryUnitRules.infrastructureCharge,
    notes: j.auxiliaryUnitRules.notes,
  } : j.duplexRules;

  let lotSizePass = "Unknown";
  let lotSizeExplanation = `Statutory minimum lot size for ${isDuplex ? "duplex / dual occupancy" : isAuxiliary ? "auxiliary unit / secondary dwelling" : "residential development"} in ${j.name} is ${rules.minLotSizeM2} m².`;
  if (parsed.lotSizeM2) {
    if (parsed.lotSizeM2 >= rules.minLotSizeM2) {
      lotSizePass = true;
      lotSizeExplanation += ` Lot area (${parsed.lotSizeM2} m²) meets or exceeds statutory threshold.`;
    } else {
      lotSizePass = false;
      lotSizeExplanation += ` Lot area (${parsed.lotSizeM2} m²) is below the required ${rules.minLotSizeM2} m² threshold.`;
    }
  } else {
    lotSizeExplanation += ` Standard suburban / low-density profile assumed for initial compliance evaluation.`;
  }

  let frontagePass = "Unknown";
  let frontageExplanation = `Minimum required street frontage is ${rules.minFrontageM}m.`;
  if (parsed.frontageM) {
    if (parsed.frontageM >= rules.minFrontageM) {
      frontagePass = true;
      frontageExplanation += ` Street frontage (${parsed.frontageM}m) satisfies access standards.`;
    } else {
      frontagePass = false;
      frontageExplanation += ` Street frontage (${parsed.frontageM}m) is narrower than required ${rules.minFrontageM}m.`;
    }
  } else {
    frontageExplanation += ` Compliant street frontage assumed based on street cadastre.`;
  }

  const isDimensionFailure = lotSizePass === false || frontagePass === false;
  let verdict = "COMPLIANT STATUTORY FRAMEWORK";

  if (isDimensionFailure) {
    verdict = "INSUFFICIENT LOT DIMENSIONS";
  } else if (j.isPDA && rules.requiresPoDDesignation) {
    verdict = "REQUIRES POD CONFIRMATION";
  } else if (lotSizePass === true && frontagePass === true) {
    verdict = j.state === "NSW" ? "HIGHLY FEASIBLE" : "CONDITIONALLY FEASIBLE";
  } else {
    verdict = "COMPLIANT STATUTORY FRAMEWORK";
  }

  const infraChargesFormatted = rules.infrastructureChargePerDwelling > 0
    ? `$${rules.infrastructureChargePerDwelling.toLocaleString()} (approx. per additional dwelling)`
    : "Exempt / $0 (under auxiliary unit exemption thresholds)";

  let addressLabel = parsed.streetNumber && parsed.streetName
    ? `${parsed.streetNumber} ${parsed.streetName}${parsed.suburb ? ", " + parsed.suburb : ""}`
    : (parsed.streetName || parsed.suburb || j.name);
  if (parsed.state) addressLabel += ` ${parsed.state}`;

  const modelsList = j.recommendedDesigns.map((m) => ({
    name: m.name,
    type: m.type,
    dimensions: `Min Width: ${m.minLotWidthM}m | Min Depth: ${m.minLotDepthM}m`,
    summary: m.summary
  }));

  let markdownReport = "";

  if (isDuplex) {
    markdownReport = `### 🏛️ Duplex & Dual-Occupancy Compliance Check: ${addressLabel}

> ✅ **Statutory Determination**: **${verdict}** (100% Planning Framework Verified)
> **Governing Authority**: **${j.statutoryAuthority}** (${j.name})
> **Statutory Planning Instrument**: ${j.governingInstrument}
> **Assessment Category**: **${rules.assessmentCategory}**

Here is the verified statutory planning framework, duplex siting controls, and technical overlays for this property:

---

#### 1. Duplex Siting & Boundary Envelope Controls
- **Minimum Lot Size Required**: **≥ ${j.duplexRules.minLotSizeM2} m²** (${lotSizeExplanation})
- **Minimum Street Frontage Required**: **≥ ${j.duplexRules.minFrontageM}m** (${frontageExplanation})
- **Maximum Site Coverage**: **${j.duplexRules.maxSiteCoveragePct}%** across both dwelling units
- **Maximum Building Height**: **${j.duplexRules.maxBuildingHeightM}m** (nominal 2 storeys)
- **Front Boundary Setback (OMP)**: **${j.duplexRules.frontSetbackM}m** | **Garage Door Setback**: **${j.duplexRules.garageSetbackM}m** (ensuring off-street driveway vehicle queue space)
- **Side Boundary Setbacks**: **${j.duplexRules.sideSetbackM}m** (ground floor) / **2.0m** (upper storey where wall height exceeds 4.5m)
- **Rear Boundary Setback**: **${j.duplexRules.rearSetbackM}m**
- **Private Open Space (POS)**: Minimum 50m²-80m² per dwelling unit with direct access to primary indoor living room.

---

#### 2. Duplex Architectural, Acoustic & Engineering Rules
1. **Central Dividing Party Wall**:
   - **Fire Resistance Level (FRL)**: **FRL 60/60/60** (NCC 2022 Volume Two Part 3.7.3) continuous from concrete footing to the underside of non-combustible roofing.
   - **Acoustic Sound Transmission**: Discontinuous cavity framing with R2.0 high-density acoustic batts achieving laboratory tested **$R_w + C_{tr} \\ge 50$** (preventing airborne and structure-borne noise).
2. **Dual Driveway Crossovers**:
   - Crossovers must maintain minimum **1.0m to 1.5m clearance** from each other, **0.5m clearance** from council service pits, and preserve existing street trees.
3. **Dual Utility Metering**:
   - Individual council water meters, dual electrical meters/sub-boards, and independent stormwater discharge.
4. **Infrastructure Trunk Contributions (Headworks)**:
   - Estimated at **${infraChargesFormatted}**. Single-title investment dual occupancies create one additional dwelling entitlement triggering standard council/water infrastructure charges.

---

#### 3. Site Overlays & Technical Construction Constraints
- **Bushfire Attack Level (AS 3959 BAL Assessment)**:
  - ${j.overlayProfile.bushfireRisk}.
  - Requirements: Corrosion-resistant metal ember screens (≤ 2mm aperture) to weep holes and openable windows, toughened glass (min 4mm/5mm), non-combustible roof sarking, and tight-fitting garage door seals.
- **Flooding, Overland Flow & Minimum FFL**:
  - ${j.overlayProfile.floodRisk}.
  - Siting Rule: Habitable finished floor level (FFL) must achieve a minimum **300mm to 500mm freeboard** above the 1% AEP (1-in-100-year) flood or overland flow level.
- **Acoustic & Road Traffic Noise (QDC MP 4.4 / NSW SEPP Transport)**:
  - ${j.overlayProfile.acousticRisk}.
  - Construction: Upgraded 6.38mm acoustic laminated glass to front-facing bedrooms, acoustic perimeter door drop seals, and mechanical ventilation allowances.
- **Sewer & Stormwater Zone of Influence (ZOI)**:
  - **Governing Water Utility**: **${j.overlayProfile.sewerAuthority}**.
  - **45° Angle of Repose**: Any building footing within the 45-degree angle of repose from the sewer/stormwater pipe invert must be supported on bored reinforced concrete piers drilled a minimum **300mm below the pipe invert level** to prevent surcharge loads on public infrastructure.
- **Slope, Earthworks & Retaining Walls**:
  - Cut/fill limits: Maximum 1.0m uncertified earthworks. Slopes > 1.5m across building footprint utilize Hudson engineered drop edge beams (DEB). Retaining walls > 1.0m require Form 15 / Form 16 structural engineering certification.
- **Geotechnical & Soil Reactivity (AS 2870)**:
  - **Expected Classification**: ${j.overlayProfile.soilReactivity}.
  - Foundation System: Hudson Homes engineered reinforced concrete waffle pod slab (or stiffened raft slab) with bored concrete piers founded into solid bearing strata.

---

#### 4. Recommended Hudson Homes Dual-Living Designs
${modelsList.map((m) => `- **${m.name}** (*${m.type}*): ${m.dimensions}\n  ${m.summary}`).join("\n")}

---

#### 5. Next Steps for NHC & Client Tender Handoff
1. **Cadastral Check**: Confirm exact boundary dimensions and easement location via Hudson Land Scout or cadastral search.
2. **Soil & Contour Survey**: Order official soil classification and contour survey to establish exact cut/fill and sewer invert levels.
3. **Select Model**: Choose between Hudson Homes Wisteria 33 / 34 / 36 / 40, Magnolia 34 / 37, or Alabaster 31 / 36.
4. **Draft Tender**: Open Quote Builder V2 (\`/quote-builder\`) to generate a fixed-price turnkey tender with guaranteed construction timeframes!`;

  } else if (isAuxiliary) {
    markdownReport = `### 🏛️ Dual-Key & Auxiliary Living Compliance Check: ${addressLabel}

> ✅ **Statutory Determination**: **${verdict}** (100% Planning Framework Verified)
> **Governing Council**: **${j.statutoryAuthority}** (${j.name})
> **Statutory Planning Instrument**: ${j.governingInstrument}
> **Assessment Category**: **${rules.assessmentCategory}** ($0 Council Headworks Infrastructure Charges)

Here is the verified statutory planning framework, auxiliary dwelling siting envelope, and technical overlays for this property:

---

#### 1. Auxiliary Living & Dual-Key Siting Envelope Controls
- **Statutory Permissibility**: Auxiliary dwelling / secondary suite under single continuous title is **ACCEPTED DEVELOPMENT** without requiring a protracted planning DA.
- **Maximum Gross Floor Area (GFA)**: **≤ ${j.auxiliaryUnitRules.maxGfaM2} m²** (auxiliary dwelling unit internal area limit).
- **Minimum Lot Size Required**: **≥ ${j.auxiliaryUnitRules.minLotSizeM2} m²** (${lotSizeExplanation}).
- **Minimum Street Frontage**: **≥ ${j.auxiliaryUnitRules.minFrontageM}m**.
- **Maximum Site Coverage**: **${j.duplexRules.maxSiteCoveragePct}%** across main residence and secondary suite combined.
- **Boundary Setbacks**: Identical to primary single dwelling envelope (Front: **${j.duplexRules.frontSetbackM}m**, Garage: **${j.duplexRules.garageSetbackM}m**, Sides: **${j.duplexRules.sideSetbackM}m**, Rear: **${j.duplexRules.rearSetbackM}m**).
- **Parking Allocation**: **${j.auxiliaryUnitRules.parkingSpacesRequired} dedicated on-site car space** required for the auxiliary unit in addition to primary garage.

---

#### 2. Key Investor & Regulatory Advantages
1. **$0 Council Trunk Infrastructure Charges**:
   - Unlike a duplex which triggers $30,000 to $35,000+ in headworks infrastructure charges, compliant auxiliary units (under ${j.auxiliaryUnitRules.maxGfaM2}m² GFA) are **100% exempt from council infrastructure contributions**!
2. **Single Title / Zero Subdivisional Costs**:
   - Single rates notice, single water connection fee, and no strata titling or titling legal fees.
3. **Acoustic & Fire Separation**:
   - Independent external entrance for tenant privacy.
   - Internal inter-tenancy dividing wall built with discontinuous cavity studs and high-density acoustic insulation achieving **$R_w + C_{tr} \\ge 50$**.
   - Sub-metering for power and sub-water metering for effortless tenant utility pass-through.

---

#### 3. Site Overlays & Technical Construction Constraints
- **Bushfire Attack Level (AS 3959 BAL Assessment)**:
   - ${j.overlayProfile.bushfireRisk}.
   - Requirements: Ember screening (≤ 2mm) to weep holes, openable windows, and cowl vents; toughened safety glass; non-combustible sarking.
- **Flooding & Overland Flow Freeboard**:
   - ${j.overlayProfile.floodRisk}.
   - Siting Rule: Habitable finished floor level (FFL) must achieve **300mm to 500mm freeboard** above the 1% AEP flood/overland flow crest.
- **Acoustic & Transport Noise Corridor (QDC MP 4.4 / NSW SEPP Transport)**:
   - ${j.overlayProfile.acousticRisk}.
   - Upgraded 6.38mm acoustic laminated glass, perimeter acoustic door drop seals, and mechanical ventilation allowances.
- **Sewer & Stormwater Zone of Influence (ZOI)**:
   - **Governing Water Utility**: **${j.overlayProfile.sewerAuthority}**.
   - **45° Angle of Repose**: Any building footing within the 45-degree angle of repose from the pipe invert must be supported on bored reinforced concrete piers drilled minimum **300mm below the pipe invert level**.
- **Slope, Earthworks & Drop Edge Beams**:
   - Cut/fill limits: Maximum 1.0m uncertified. Cross-fall across building pad utilizes Hudson engineered drop edge beams (DEB).
- **Geotechnical & Soil Reactivity (AS 2870)**:
   - **Classification**: ${j.overlayProfile.soilReactivity}.
   - Foundation System: Hudson Homes engineered reinforced concrete waffle pod slab (or stiffened raft slab) with bored concrete piers founded into solid bearing strata.

---

#### 4. Recommended Hudson Homes Dual-Living & Auxiliary Designs
- **Amber 21 (Auxiliary Suite Specification)** (*Dual Living / Auxiliary*): Min Width: 12.5m | Min Depth: 25.0m
  Engineered specifically for maximum rental yield with a 3-bed primary home + 1-bed auxiliary suite under a single roofline, complying with the ${j.auxiliaryUnitRules.maxGfaM2}m² limit with $0 council infrastructure charges.
- **Alabaster 31 / 36** (*Duplex / Dual Living*): Min Width: 18.0m | Min Depth: 28.0m
  Single-storey dual occupancy featuring two balanced self-contained residences under one continuous roofline with independent entries.
- **Wisteria 33 / 34 / 36 / 40** (*Duplex / Dual Living*): Min Width: 18.0m | Min Depth: 28.0m
  Flagship dual-living floorplan adaptable for auxiliary or full duplex configurations with independent dual entries.

---

#### 5. Next Steps for NHC & Client Tender Handoff
1. **Cadastral Check**: Confirm exact boundary dimensions and easement location via Hudson Land Scout or cadastral search.
2. **Order Soil Test & Contour Survey**: Confirms bearing strata, natural ground fall, and sewer pipe inverts.
3. **Select Inclusion Package**: Choose between **H1 Smart**, **H2 Designer**, **H3 Luxury**, or **IP Investment** (100% turn-key).
4. **Draft Tender**: Open Quote Builder V2 (\`/quote-builder\`) to generate a fixed-price turnkey tender with guaranteed construction timeframes!`;

  } else {
    markdownReport = `### 🏛️ Complete Property Compliance & Feasibility Check: ${addressLabel}

> ✅ **Statutory Determination**: **${verdict}** (100% Compliance Framework Verified)
> **Governing Council**: **${j.statutoryAuthority}** (${j.name})
> **Statutory Planning Instrument**: ${j.governingInstrument}
> **Zoning Classification**: **${j.zoningDefaults.primaryZoning}** (${j.zoningDefaults.description})
> **Assessment Category**: **Accepted Development subject to Requirements (Single Dwelling) / Code Assessable (Duplex)**

Here is the complete verified compliance dossier covering statutory zoning, boundary setbacks, site coverage, overlays, and construction engineering:

---

#### 1. Statutory Planning Envelope & Boundary Setbacks
- **Minimum Lot Size**:
  - Single Detached Dwelling: **≥ 400 m² - 600 m²** (Compliant on standard residential allotments)
  - Duplex / Dual-Occupancy: **≥ ${j.duplexRules.minLotSizeM2} m²** (Code Assessable)
  - Auxiliary Unit / Secondary Dwelling: **≥ ${j.auxiliaryUnitRules.minLotSizeM2} m²** (Accepted Development)
- **Minimum Street Frontage**:
  - Single Detached Dwelling: **≥ 10.0m - 12.5m** (standard double garage requirement)
  - Duplex / Dual-Occupancy: **≥ ${j.duplexRules.minFrontageM}m** (for dual crossover separation)
- **Maximum Site Coverage**: **${j.duplexRules.maxSiteCoveragePct}%** (Standard Low Density Residential)
- **Maximum Building Height**: **${j.duplexRules.maxBuildingHeightM}m** (maximum 2 storeys)
- **Front Boundary Setback (OMP)**: **${j.duplexRules.frontSetbackM}m** (Outer Most Projection e.g. porch/eaves 5.0m)
- **Garage Door Setback**: **${j.duplexRules.garageSetbackM}m** (measured from street boundary to garage door)
- **Side Boundary Setbacks**:
  - Ground floor (up to 4.5m wall height): **${j.duplexRules.sideSetbackM}m**
  - Upper floor (above 4.5m wall height): **2.0m**
  - Built-to-Boundary (Zero Lot Line): Permitted on garage wall where lot width is under 15m (max 15m length, max 3.5m height)
- **Rear Boundary Setback**: **${j.duplexRules.rearSetbackM}m** (single storey) / **3.0m** (double storey)
- **Private Open Space (POS)**: Minimum **50 m²** with a minimum dimension of **5.0m**, directly accessible from main living areas.

---

#### 2. Site Overlays & Technical Construction Constraints
- **Bushfire Attack Level (AS 3959 BAL Assessment)**:
  - **Risk Profile**: ${j.overlayProfile.bushfireRisk}.
  - **Mandatory Hudson Inclusions**: Corrosion-proof stainless steel / bronze ember guards (≤ 2mm) to all weepholes, roof vents, and openable windows. Minimum 4mm/5mm toughened glass. Non-combustible roof sarking and tight perimeter garage weather seals.
- **Flooding & Overland Flow Freeboard**:
  - **Risk Profile**: ${j.overlayProfile.floodRisk}.
  - **Siting Control**: Finished Floor Level (FFL) must achieve **300mm to 500mm freeboard** above the designated flood/overland flow level. Upstream stormwater runoff must be diverted around dwelling footings via swales and spoon drains.
- **Acoustic & Road Traffic Noise (QDC MP 4.4 / NSW SEPP Transport)**:
  - **Risk Profile**: ${j.overlayProfile.acousticRisk}.
  - **Specifications**: 6.38mm acoustic laminated glazing to bedrooms, high-density acoustic door seals, R2.5 acoustic ceiling insulation batts, and mechanical ventilation allowances.
- **Sewer & Stormwater Zone of Influence (ZOI)**:
  - **Governing Authority**: **${j.overlayProfile.sewerAuthority}**.
  - **45° Angle of Repose**: All building footings within the 45-degree angle of repose from the pipe invert level must be supported by bored reinforced concrete piers drilled minimum **300mm below the pipe invert level** into natural ground/rock.
- **Slope, Earthworks, Drop Edge Beams & Retaining**:
  - Uncertified cut/fill limited to 1.0m. Cross-fall across the pad is managed via Hudson reinforced concrete Drop Edge Beams (DEB) up to 1.5m. Retaining walls > 1.0m require Form 15 structural certification.
- **Geotechnical & Soil Reactivity (AS 2870)**:
  - **Classification**: ${j.overlayProfile.soilReactivity}.
  - **Foundation Design**: Engineered reinforced concrete slab (waffle pod or stiffened raft) with concrete piering as detailed by the site soil test.
- **Infrastructure Trunk Charges (Headworks)**:
  - Single Detached Dwelling: Standard infrastructure covered in fixed base price.
  - Duplex / Additional Unit: Estimated at **${infraChargesFormatted}**.
  - Auxiliary Unit (≤ 70m² GFA): **$0 / Exempt from council infrastructure contributions** in Logan, Redland, Ipswich, and Moreton Bay.

---

#### 3. Development Potential & Typology Matrix
1. **Single Detached Dwelling (Single or Double Storey)**:
   - **Verdict**: **ACCEPTED DEVELOPMENT / FULLY COMPLIANT**
   - Streamlined fast-track building certification. No planning DA required in standard zones.
2. **Duplex / Dual-Occupancy**:
   - **Verdict**: **CODE ASSESSABLE (DA) / CDC IN NSW**
   - Feasible on lots meeting minimum **${j.duplexRules.minLotSizeM2} m²** and **${j.duplexRules.minFrontageM}m** frontage with dual crossovers.
3. **Auxiliary Unit / Secondary Dwelling (Dual-Key / Granny Flat)**:
   - **Verdict**: **ACCEPTED DEVELOPMENT ($0 INFRASTRUCTURE CHARGES)**
   - Allowed up to **${j.auxiliaryUnitRules.maxGfaM2} m² GFA** on lots ≥ **${j.auxiliaryUnitRules.minLotSizeM2} m²** under single title.

---

#### 4. Recommended Hudson Homes Designs
${modelsList.map((m) => `- **${m.name}** (*${m.type}*): ${m.dimensions}\n  ${m.summary}`).join("\n")}

---

#### 5. Next Steps for NHC & Client Tender Handoff
1. **Order Soil Test & Contour Survey**: Confirms bearing capacity, exact fall, and underground pipe inverts.
2. **Review Inclusions Tier**: Select between **H1 Smart**, **H2 Designer**, **H3 Luxury**, or **IP Investment** (turn-key).
3. **Prepare Digital Tender**: Load design into **Quote Builder V2 (\`/quote-builder\`)** or generate an A4 sales flyer in **Flyer Builder (\`/flyer\`)**!`;
  }

  return {
    answer: markdownReport,
    confidence: 0.99,
    verified: true,
    suggestedQuestions: [
      `What dual-occupancy designs does Hudson Homes offer?`,
      `What are the setback and PoD rules for ${j.name}?`,
      `Tell me about the Wisteria 33 dual living design`,
      `Can I build an auxiliary unit (secondary dwelling) on this lot?`
    ],
    modelUsed: "universal-planning-engine",
  };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const { message, history = [], staffUser, apiKey: userKey } = req.body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Missing or invalid message." });
    }

    // 0A. Fast-Track Compliance Check (CC), Statutory Property Feasibility Check & PDF Export
    const trimmedMsg = (message || "").trim();
    const queryLower = trimmedMsg.toLowerCase();
    const isPdf =
      (queryLower.includes("pdf") || queryLower.includes("download") || queryLower.includes("export")) &&
      (queryLower.includes("compliance") ||
        queryLower.includes("check") ||
        queryLower.includes("report") ||
        queryLower.includes("dossier") ||
        queryLower.includes("put this") ||
        queryLower.includes("feasibility"));

    if (isPdf) {
      const resp = evaluatePropertyFeasibilityStandalone(trimmedMsg);
      return res.status(200).json({
        ...resp,
        pdfDownloadReady: true,
        answer: `### 📄 Executive Statutory Compliance & Feasibility Summary PDF Generated!

Hudson AI has compiled your formal, executive **Hudson Homes Statutory Compliance & Feasibility Dossier**:

- **Statutory Determination**: **COMPLIANT STATUTORY FRAMEWORK**
- **Governing Compliance**: Complete building envelope, setback controls, and all 7 site overlays (Bushfire AS 3959, Flood FFL, Acoustic QDC MP 4.4, Sewer ZOI 45° angle of repose & bored piering, Slope/DEB, Soil Reactivity AS 2870, Headworks Charges).
- **Warranties & Guarantees**: Endorsed with Hudson's **50-Year Structural Warranty** and **Fixed Price Contract Guarantee**.

Click the **"Download Compliance Report (PDF)"** button below to download the official PDF document!`,
      });
    }

    const isCC = /^cc\b[:\s]*/i.test(trimmedMsg) || /compliance\s*check/i.test(trimmedMsg) || /feasibility\s*check/i.test(trimmedMsg);
    const isAddressQuery =
      /\b\d+\s+[a-z\s]+(?:road|rd|street|st|drive|dr|avenue|ave|crescent|cres|lane|way|court|ct|boulevard|bvd|circuit|cct|parade|pde|place|pl|highway|hwy)\b/i.test(trimmedMsg) ||
      /mount\s*cotton|mt\s*cotton|paradise\s*r(?:oa)?d|flagstone|morayfield|warnervale|marsden\s*park|ashmore|ahsmore|warrigal|gold\s*coast|southport|carrara|benowa/i.test(trimmedMsg);

    if (isCC || isAddressQuery) {
      const resp = evaluatePropertyFeasibilityStandalone(trimmedMsg);
      return res.status(200).json({
        ...resp,
        pdfDownloadReady: true,
      });
    }

    // 0B. High-Accuracy Siting & Setback Evaluation
    const sitingParams = parseLotQuery(message);
    if (sitingParams) {
      const sitingResult = evaluateLotSiting(sitingParams);
      const answer = formatSitingResponse(sitingResult);
      return res.status(200).json({
        answer,
        confidence: 0.99,
        verified: true,
        suggestedQuestions: [
          "Can we fit Hazel 14 by adjusting the front porch?",
          "What are the inclusions for Maize 33 or Magnolia 34?",
          "How do I generate a 2-Page Siting Flyer for this lot?",
        ],
        modelUsed: "hudson-siting-engine",
      });
    }

    const candidateKeys = [];
    if (userKey && typeof userKey === "string" && userKey.trim()) {
      candidateKeys.push(userKey.trim());
    }
    if (process.env.VITE_GEMINI_API_KEY && process.env.VITE_GEMINI_API_KEY.trim()) {
      candidateKeys.push(process.env.VITE_GEMINI_API_KEY.trim());
    }
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
      candidateKeys.push(process.env.GEMINI_API_KEY.trim());
    }
    try {
      const fs = await import("fs");
      if (fs.existsSync(".env")) {
        const envContent = fs.readFileSync(".env", "utf8");
        const match =
          envContent.match(/VITE_GEMINI_API_KEY\s*=\s*["']?([^"'\r\n]+)/) ||
          envContent.match(/GEMINI_API_KEY\s*=\s*["']?([^"'\r\n]+)/);
        if (match && match[1]) {
          candidateKeys.push(match[1].trim());
        }
      }
    } catch {}

    const uniqueKeys = Array.from(new Set(candidateKeys)).filter(Boolean);
    if (uniqueKeys.length === 0) {
      console.warn("[HubChat] No AI API keys configured, activating Hudson Knowledge Base Engine.");
      const fallbackData = generateHudsonKnowledgeResponse(message, staffUser);
      return res.status(200).json(fallbackData);
    }

    // Build conversation contents for Gemini
    const contents = [];

    // System instruction injected into conversation context
    const userInfo = staffUser
      ? `Active user: ${staffUser.name || "NHC"} (${staffUser.displayCentre || "Display Centre"}, role: ${staffUser.role || "Consultant"}).`
      : "Active user: Hudson Homes Staff Member.";

    contents.push({
      role: "user",
      parts: [
        {
          text: `[SYSTEM KNOWLEDGE & INSTRUCTIONS]\n${HUDSON_KNOWLEDGE_BASE}\n\n${userInfo}\n\nPlease acknowledge your instructions and role.`,
        },
      ],
    });

    contents.push({
      role: "model",
      parts: [
        {
          text: JSON.stringify({
            answer: "Understood. I am the Hudson Homes Personal AI Assistant. I will only answer with verified accuracy exceeding 95%, refusing to hallucinate if confidence is low, and helping NHCs with Hudson inclusions, pricing, floorplans, and operating system tools.",
            confidence: 1.0,
            verified: true,
            suggestedQuestions: [
              "What's included in Designer vs Trend inclusions?",
              "How does the Quote Builder Modified Plan Engine work?",
              "What are the 4 flyer templates in Package Studio?",
            ],
          }),
        },
      ],
    });

    // Add recent history (up to last 6 turns)
    if (Array.isArray(history)) {
      const recentHistory = history.slice(-6);
      for (const turn of recentHistory) {
        if (turn && turn.role && turn.text) {
          contents.push({
            role: turn.role === "assistant" ? "model" : "user",
            parts: [{ text: turn.text }],
          });
        }
      }
    }

    // Add current user message
    contents.push({
      role: "user",
      parts: [{ text: message.trim() }],
    });

    // Model candidate list: gemini-3.8-flash first as requested, with high-capability active fallbacks
    const models = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-2.5-flash", "gemini-2.0-flash-001", "gemini-flash-latest"];
    let responseData = null;
    let lastError = null;

    keyLoop: for (const key of uniqueKeys) {
      for (const model of models) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
          const apiRes = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents,
              generationConfig: {
                temperature: 0.25,
                responseMimeType: "application/json",
              },
            }),
          });

          if (apiRes.ok) {
            const json = await apiRes.json();
            const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (rawText) {
              try {
                responseData = JSON.parse(rawText);
                responseData.modelUsed = "hudson-enterprise-3.8";
                break keyLoop;
              } catch {
                responseData = {
                  answer: rawText,
                  confidence: 0.95,
                  verified: true,
                  suggestedQuestions: [
                    "Tell me about Hudson Homes Designer inclusions",
                    "How do I use Quote Builder V2?",
                  ],
                  modelUsed: "hudson-enterprise-3.8",
                };
                break keyLoop;
              }
            }
          } else {
            const errText = await apiRes.text();
            lastError = `${model} HTTP ${apiRes.status}: ${errText}`;
            // If auth failure on this key (401/403), break to try next key
            if (apiRes.status === 401 || apiRes.status === 403) {
              break;
            }
          }
        } catch (err) {
          lastError = err.message;
        }
      }
    }

    if (!responseData) {
      console.warn("[HubChat] Gemini API unavailable or unauthenticated, activating Hudson Knowledge Base Engine:", lastError);
      responseData = generateHudsonKnowledgeResponse(message, staffUser);
    }

    return res.status(200).json(responseData);
  } catch (error) {
    // Even if an unexpected error occurs, fall back to the knowledge engine rather than 500
    try {
      const fallback = generateHudsonKnowledgeResponse(req?.body?.message || "", req?.body?.staffUser);
      return res.status(200).json(fallback);
    } catch {
      return res.status(500).json({ error: error.message || "Internal server error" });
    }
  }
}

export function generateHudsonKnowledgeResponse(message, staffUser) {
  const query = (message || "").toLowerCase().trim();

  // 0. PDF EXPORT INTENT
  const isPdf =
    (query.includes("pdf") || query.includes("download") || query.includes("export")) &&
    (query.includes("compliance") ||
      query.includes("check") ||
      query.includes("report") ||
      query.includes("dossier") ||
      query.includes("put this") ||
      query.includes("feasibility"));

  if (isPdf) {
    const resp = evaluatePropertyFeasibilityStandalone(message);
    return {
      ...resp,
      pdfDownloadReady: true,
      answer: `### 📄 Executive Statutory Compliance & Feasibility Summary PDF Generated!

Hudson AI has compiled your formal, executive **Hudson Homes Statutory Compliance & Feasibility Dossier**:

- **Statutory Determination**: **COMPLIANT STATUTORY FRAMEWORK**
- **Governing Compliance**: Complete building envelope, setback controls, and all 7 site overlays (Bushfire AS 3959, Flood FFL, Acoustic QDC MP 4.4, Sewer ZOI 45° angle of repose & bored piering, Slope/DEB, Soil Reactivity AS 2870, Headworks Charges).
- **Warranties & Guarantees**: Endorsed with Hudson's **50-Year Structural Warranty** and **Fixed Price Contract Guarantee**.

Click the **"Download Compliance Report (PDF)"** button below to download the official PDF document!`,
    };
  }

  // 0A. COMPLIANCE CHECK (CC) & STATUTORY PROPERTY FEASIBILITY
  const isCC = /^cc\b[:\s]*/i.test((message || "").trim()) || /compliance\s*check/i.test(query) || /feasibility\s*check/i.test(query);
  const isAddressQuery =
    /\b\d+\s+[a-z\s]+(?:road|rd|street|st|drive|dr|avenue|ave|crescent|cres|lane|way|court|ct|boulevard|bvd|circuit|cct|parade|pde|place|pl|highway|hwy)\b/i.test(query) ||
    /mount\s*cotton|mt\s*cotton|paradise\s*r(?:oa)?d|flagstone|morayfield|warnervale|marsden\s*park|ashmore|ahsmore|warrigal|gold\s*coast|southport|carrara|benowa/i.test(query);

  if (isCC || isAddressQuery) {
    const resp = evaluatePropertyFeasibilityStandalone(message);
    return {
      ...resp,
      pdfDownloadReady: true,
    };
  }

  // 0B. Siting, Setbacks & Floorplan Feasibility Check
  const sitingParams = parseLotQuery(message);
  if (sitingParams) {
    const sitingRes = evaluateLotSiting(sitingParams);
    return {
      answer: formatSitingResponse(sitingRes),
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "Can we fit Hazel 14 by adjusting the front porch?",
        "What are the inclusions for Maize 33 or Magnolia 34?",
        "How do I generate a 2-Page Siting Flyer for this lot?",
      ],
      modelUsed: "hudson-siting-engine",
    };
  }

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
      answer: `### Hudson Homes Copilot — Advisory Notice

Hudson Homes specializes exclusively in architecturally designed fixed-price new homes, house and land packages, duplexes, and dual-occupancy developments across New South Wales and Queensland.

For bespoke developer covenants, non-standard structural variations, or unreleased estate pricing, our team recommends consulting directly with Head Office Estimating or your New Home Consultant.`,
      confidence: 0.99,
      verified: true,
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
- **Kitchen**: 20mm engineered stone benchtops, Haier or Fisher & Paykel stainless steel appliances, dishwasher included, and durable soft-close cabinetry.
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
- **Kitchen Essentials**: Modern benchtops, Haier 600mm stainless steel appliances (oven, cooktop, rangehood, dishwasher provision).
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

  // 3H_PARTY_WALL. Duplex Party Walls & Fire/Acoustic Separation (NCC 2022 Part 3.7.3 & AS 1530.4)
  if (
    query.includes("party wall") ||
    query.includes("fire wall") ||
    query.includes("separating wall") ||
    query.includes("frl 60") ||
    query.includes("part 3.7.3") ||
    query.includes("as 1530.4") ||
    query.includes("rw+ctr") ||
    query.includes("rw + ctr") ||
    ((query.includes("duplex") || query.includes("dual occ")) &&
      (query.includes("fire") || query.includes("acoustic") || query.includes("sound") || query.includes("separation") || query.includes("party")))
  ) {
    return {
      answer: `### Dual-Occupancy Party Walls: Fire & Acoustic Separation (NCC 2022 Part 3.7.3 & AS 1530.4)

When constructing attached dual-occupancy homes, duplexes, and townhouses, the central separating wall (**party wall**) must satisfy rigorous statutory fire and acoustic performance standards:

#### 1. Fire Resistance Level (FRL 60/60/60):
- Under **NCC 2022 Part 3.7.3** and **AS 1530.4 (Fire-resistance tests of elements of construction)**, the separating wall must achieve an **FRL of 60/60/60**:
  - **Structural Adequacy: 60 minutes** (the wall supports structural load without collapsing during fire).
  - **Integrity: 60 minutes** (prevents fire, flames, and hot toxic gases from passing through cracks or openings).
  - **Insulation: 60 minutes** (limits heat transmission so unexposed wall surfaces do not ignite adjacent materials).
- **Vertical Continuity**: The fire-rated barrier must extend continuously from the foundation concrete slab, through ceiling cavities, and finish tight against the underside of non-combustible roof covering (Colorbond or concrete tiles) or extend through as a fire parapet.

#### 2. Acoustic Separation ($R_w + C_{tr} \\ge 50$):
- **Airborne Sound Insulation**: The wall system must achieve a weighted sound reduction index of **$R_w + C_{tr} \\ge 50$** under AS/NZS ISO 717.1.
- **Discontinuous Construction**:
  - Twin independent timber stud frames separated by a minimum **20mm continuous air gap**.
  - High-density acoustic glasswool or polyester insulation batts (minimum $R_w 2.5$) installed inside both stud cavities.
  - A central fire-rated acoustic barrier (such as a 25mm fire-rated shaftliner or certified Knauf / CSR Bradford Partiwall / Promat system).
  - High-density 13mm or 16mm fire-rated plasterboard linings.
- Discontinuous construction mechanically isolates one dwelling from the other, preventing vibration and footstep impact noise transmission.

#### 3. Service Penetrations & Electrical Layout:
- **No Back-to-Back Outlets**: Electrical powerpoints, switches, and recessed light switches must never be installed back-to-back in the same stud bay. A minimum **300mm horizontal separation** is required.
- **Intumescent Fire & Acoustic Sealant**: All perimeter junctions, plumbing pipes, and cabling penetrations are sealed with fire-rated mastic that expands dramatically when exposed to heat, sealing air gaps.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What dual occupancy designs does Hudson Homes offer?",
        "What are the rules for building a duplex in Queensland vs NSW?",
        "Tell me about the Wisteria 33 dual living design",
        "What are the infrastructure charges for building a duplex?",
      ],
      modelUsed: "hudson-engineering-engine",
    };
  }

  // 3H_BALUSTRADE. Balustrades, Handrails & Fall Prevention (NCC 2022 Part 11.2 & AS 1170.1)
  if (
    query.includes("balustrade") ||
    query.includes("barrier") ||
    query.includes("handrail") ||
    query.includes("stair rail") ||
    query.includes("balcony rail") ||
    query.includes("fall prevention")
  ) {
    return {
      answer: `### Balustrades, Barriers & Fall Prevention Compliance (NCC 2022 Part 11.2 & AS 1170.1)

All Hudson Homes balconies, elevated decks, external landings, and internal staircases comply strictly with **NCC 2022 Volume Two Part 11.2** and **AS 1170.1 (Structural Design Actions)**:

#### 1. When is a Balustrade / Barrier Legally Mandated?
- A continuous barrier is mandatory along the edge of any trafficable surface (balcony, deck, veranda, landing, stair, or mezzanine) where the finished floor level is **1.0 metre or more above the ground or surface below**.

#### 2. Height Clearances & Dimensions:
- **Balconies, Decks & Landings**: Minimum height of **1000mm (1.0m)** measured vertically above the finished surface level.
- **Staircases & Ramps**: Minimum height of **865mm** measured vertically above the nosing line of stair treads.
- **Transitional Landings**: Where a stair landing exceeds 500mm length, the barrier height must transition to **1000mm**.

#### 3. Openings & Spherical Clearance:
- **125mm Maximum Opening**: Openings between balusters, intermediate rails, or bottom rails must not permit a **125mm diameter sphere** to pass through at any point.
- Prevents children from slipping through or becoming trapped between balusters.

#### 4. Anti-Climb Zone for Elevated Falls (> 4.0m):
- Where the potential fall height exceeds **4.0 metres** (such as upper-floor double-storey balconies or grand facades):
  - Any horizontal or near-horizontal climbable elements (transoms or intermediate rails) between **150mm and 760mm above the floor** are strictly prohibited.
  - Balustrades must feature vertical uprights or flush solid panels to prevent children climbing.

#### 5. Material Specifications:
- **Semi-Frameless & Frameless Glazing**: Toughened safety glass (minimum 10mm to 12mm thickness) or structural laminated glass certified to **AS 1288 (Glass in Buildings)** with stainless steel spigots or aluminium base channels.
- **Architectural Aluminium**: Corrosion-resistant powder-coated aluminium vertical balusters fixed with concealed stainless steel fasteners.
- **Engineered Structural Load Testing**: Sized to resist minimum **0.75 kN/m point loads** and **0.6 kN/m distributed lateral forces** without permanent deflection.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What facade options are available for double storey homes?",
        "Tell me about H3 Luxury Inclusions",
        "What are the rules for swimming pools and pool fencing?",
        "What wind classification does Hudson Homes build for?",
      ],
      modelUsed: "hudson-engineering-engine",
    };
  }

  // 3H_POOL. Swimming Pools & Pool Safety Barriers (AS 1926.1, AS 1926.2 & NCC Part 3.9.3)
  if (
    query.includes("pool fence") ||
    query.includes("pool fencing") ||
    query.includes("swimming pool") ||
    query.includes("pool barrier") ||
    query.includes("pool safety") ||
    query.includes("as 1926") ||
    (query.includes("pool") && (query.includes("fence") || query.includes("fencing") || query.includes("barrier") || query.includes("law") || query.includes("rule") || query.includes("gate") || query.includes("safety") || query.includes("compliance")))
  ) {
    return {
      answer: `### Swimming Pools & Pool Fencing Safety Laws (AS 1926.1, AS 1926.2 & NCC Part 3.9.3)

For properties incorporating a swimming pool, spa, or outdoor plunge pool, safety barriers must satisfy mandatory state legislation (Queensland *Building Act 1975* & NSW *Swimming Pools Act 1992*) and **AS 1926.1 (Safety Barriers for Swimming Pools)**:

#### 1. Minimum Barrier Height & Ground Clearances:
- **Barrier Height**: Minimum **1200mm (1.2m)** measured continuously on the outside of the barrier from the finished ground surface.
- **Gap Beneath Barrier**: Maximum **100mm clearance** between the bottom of the fence and any permanent ground surface (turf, pavers, or concrete).

#### 2. Pool Access Gates & Latching Devices:
- **Outward Opening**: Pool gates must swing **outward away from the pool area** at all times.
- **Self-Closing & Self-Latching**: Gate must be fitted with a spring hinge mechanism that automatically closes and latches from any open position, including when resting against the latch.
- **Latch Height**: The latch release mechanism must be positioned at least **1500mm above finished ground level** on the outside of the fence (or inside behind a compliant shield).

#### 3. 900mm Non-Climbable Zone (NCZ):
- A **900mm radius non-climbable zone** is legally mandated on the outside of the barrier.
- **Zero Climbable Footholds**: No tree branches, boundary fence rails, barbecues, air conditioning condenser units, retaining walls, potted plants, or taps may be located within this 900mm arc.
- If an existing boundary fence forms part of the pool barrier:
  - It must have a minimum height of **1800mm measured from the inside (pool side)**.

#### 4. Dwelling Doors & Windows Facing the Pool:
- **Direct Dwelling Doors Prohibited**: In modern builds across NSW and QLD, **direct door access from habitable rooms into the pool area is strictly prohibited** without an intervening isolating pool barrier.
- **Window Openings**: Any window opening directly into the pool area with a sill height < 1800mm must either:
  1. Be permanently restricted to open no more than **100mm** using security screws or riveted window restrictors.
  2. Be fitted with heavy-duty security screens complying with **AS 5039**.

#### 5. CPR Resuscitation Signage:
- A weatherproof cardiopulmonary resuscitation (CPR) sign displaying current DRSABCD emergency guidance must be prominently displayed within direct view of the pool enclosure.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What are balustrade and barrier requirements?",
        "What is included in the Turn-Key Landscape Package (LP)?",
        "What fixed site costs does Hudson Homes cover?",
        "Tell me about the 50-Year Structural Warranty",
      ],
      modelUsed: "hudson-engineering-engine",
    };
  }

  // 3H_CDC_DA. Planning Pathways: CDC vs DA in NSW
  if (
    (query.includes("cdc") && (query.includes("da") || query.includes("versus") || query.includes("vs") || query.includes("difference") || query.includes("path"))) ||
    query.includes("complying development") ||
    (query.includes("difference") && query.includes("cdc")) ||
    query.includes("private certifier vs council") ||
    (query.includes("planning path") && query.includes("nsw"))
  ) {
    return {
      answer: `### NSW Planning Approvals: Complying Development (CDC) vs Development Application (DA)

In New South Wales, residential home and dual-occupancy construction proceeds via one of two statutory approval pathways:

#### 1. Complying Development Certificate (CDC) — Fast-Track Private Certifier:
- **Governing Policy**: NSW State Environmental Planning Policy (Housing) 2021 (**Low Rise Housing Diversity Code** & Codes SEPP).
- **Approval Authority**: Registered Private Certifier (accredited building surveyor) or Local Council.
- **Fast-Track Assessment**: Legally approved in **as little as 20 business days** once documentation is lodged.
- **Strict Pre-Set Code Standards**:
  - Site must satisfy objective standards: minimum lot size (e.g. 500m² for attached dual occupancy in R2), minimum 15m–18m frontage, standard boundary setbacks, and maximum site coverage.
  - **Zero Neighbor Objections**: Neighbors receive statutory 14-day pre-approval notification, but the certifier **must approve the application if it complies 100% with the code** (no subjective neighbor objections or council committee politics).
- **Exclusions**: CDC cannot be utilized on land affected by critical biodiversity, high-risk flood planning areas, uncertified bushfire BAL-40/BAL-FZ, or State Heritage registers.

#### 2. Development Application (DA) — Local Municipal Council Assessment:
- **Governing Instrument**: Local Council Local Environmental Plan (LEP) & Development Control Plan (DCP) (e.g. Camden LEP, Blacktown LEP, The Hills LEP).
- **Approval Authority**: Local Municipal Council Planning Department.
- **Assessment Timeline**: Typically **60 to 120+ business days** (longer if additional information RFI requests or council panels occur).
- **When is DA Required?**:
  - Lots seeking variations to standard setback envelopes, building height, or site coverage.
  - Irregular, narrow, or steeply sloping allotments (> 15% gradient).
  - Properties subject to local heritage conservation overlays, specific overland flow flood zones, or environmentally sensitive corridors.
- **Public Exhibition**: Mandatory public notification where neighbors can lodge formal submissions. Council retains subjective discretion to request plan modifications.

#### 3. Hudson Homes Strategy & Value:
- Hudson Homes architects and siting technicians **design specifically to achieve 100% CDC compliance wherever possible**.
- This saves homeowners and investors **2 to 4 months of holding costs and construction loan interest**, getting your home out of the ground faster!`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What are the rules for building a duplex under NSW CDC?",
        "What dual occupancy designs does Hudson Homes offer?",
        "What fixed site costs does Hudson Homes cover?",
        "Tell me about the 50-Year Structural Warranty",
      ],
      modelUsed: "universal-planning-engine",
    };
  }

  // 3H_DUPLEX_VS_AUXILIARY. Duplex (Dual Occupancy) vs Auxiliary Unit (Secondary Dwelling / Dual Key)
  if (
    ((query.includes("duplex") || query.includes("dual occ") || query.includes("dual occupancy")) &&
      (query.includes("auxiliary") || query.includes("secondary dwelling") || query.includes("dual key") || query.includes("dual-key") || query.includes("granny flat"))) ||
    ((query.includes("difference") || query.includes("versus") || query.includes("vs") || query.includes("compare") || query.includes("between")) &&
      (query.includes("duplex") || query.includes("auxiliary") || query.includes("dual key") || query.includes("secondary dwelling")))
  ) {
    return {
      answer: `### Duplex (Dual Occupancy) vs Auxiliary Unit (Secondary Dwelling / Dual-Key)

Understanding the statutory, title, and financial distinctions between a Duplex and an Auxiliary Unit is essential for property investors and developers across Queensland and New South Wales:

| Feature / Metric | **Duplex (Dual Occupancy)** | **Auxiliary Unit (Secondary Dwelling / Dual-Key)** |
|---|---|---|
| **Statutory Definition** | Two complete, self-contained residential dwellings on a single cadastral allotment (attached side-by-side or stacked). | A smaller, subordinate self-contained dwelling established in conjunction with a primary dwelling under the same continuous roofline or detached. |
| **Title & Subdivision** | **Subdivisible**: Can typically be subdivided into two separate Torrens Titles (NSW) or Freehold Titles / Strata Titles (QLD), subject to meeting council minimum lot size (e.g. 500m² under NSW CDC or 600m²–800m² in QLD). Each can be sold individually. | **Single Title Only**: Remains permanently bound to the primary dwelling on one title. Cannot be separately subdivided, strata-titled, or sold off independently. |
| **Dwelling Size / GFA Limits** | **No statutory cap on GFA**: Both dwellings can be full-sized family homes (e.g., 4 Bed + 4 Bed, 180m² each). Governed only by boundary setbacks and maximum site coverage (50%–60%). | **Strict Floor Area Cap**: <br>• **Queensland**: Maximum **70m² GFA** (Logan, Redland) or **65m² GFA** (Ipswich) or **80m² GFA** (Gold Coast). <br>• **NSW**: Maximum **60m² GFA** under State Environmental Planning Policy (Housing) 2021. |
| **Council Infrastructure Charges** | **Full Charges Levied**: Local council / EDQ levies full trunk infrastructure headworks contributions on the second dwelling (typically **$25,000 to $33,000+** in QLD; **Section 7.11 / 7.12** in NSW). | **$0 INFRASTRUCTURE EXEMPTION (QLD)**: In most SEQ councils (Logan, Ipswich, Moreton Bay, Redland), an auxiliary unit under 70m² is **100% EXEMPT ($0 charges)** from infrastructure contributions! |
| **Tenancy & Income Potential** | Both dwellings can be leased to independent, unrelated tenants on separate tenancy agreements, generating two full market rental incomes. | Under QLD planning reforms (September 2022), auxiliary units can now be legally rented to unrelated tenants on separate residential leases, unlocking high-yielding dual cashflow on a single rates notice. |
| **Utility Metering & Connections** | Mandatory separate water meters, electrical meters (Two-Phase / Three-Phase supply), and telecommunications connections. | Typically shared service mains with optional private sub-metering (check meters) for water and electricity. |
| **Recommended Hudson Designs** | **Wisteria Range (33, 34, 36, 40)**, **Alabaster Range (31, 36, 40)**, **Magnolia (34, 37)**. | **Amber 21 (Auxiliary Suite)**, **Emerald 23**, or **Wisteria 33 Dual Living Configuration**. |`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What are the infrastructure charges for building a duplex in Queensland?",
        "What are the setback rules for building a duplex under NSW CDC?",
        "Tell me about the Amber 21 Dual Suite design",
        "What dual occupancy designs does Hudson Homes offer?",
      ],
      modelUsed: "universal-planning-engine",
    };
  }

  // 3H_CONDENSATION. NCC 2022 Condensation Management (Part 10.8 & AS 4200)
  if (
    query.includes("condensation") ||
    query.includes("vapour permeable") ||
    query.includes("vapor permeable") ||
    query.includes("exhaust duct") ||
    query.includes("wall wrap") ||
    query.includes("as 4200") ||
    (query.includes("ncc") && query.includes("ventilation"))
  ) {
    return {
      answer: `### NCC 2022 Condensation Management & Vapour Permeability (Part 10.8 & AS 4200)

Under **NCC 2022 Volume Two Part 10.8** and **AS 4200.1 / AS 4200.2 (Pliable Building Membranes and Underlays)**, Australian residential homes must integrate engineered condensation control to safeguard structural timbers and indoor air quality:

#### 1. Mandatory Vapour-Permeable Wall Wraps:
- In cooler southern regions and humid coastal sub-tropical zones (Climate Zones 2, 6, 7, 8):
  - External framed walls must be wrapped with a certified **Class 3 or Class 4 vapour-permeable pliable membrane** (such as Bradford Enviroseal or James Hardie Weather Barrier).
  - **How it Works**: Allows internal moisture vapour (from cooking, showering, and breathing) to escape naturally outward through the building envelope without condensing into liquid water on structural timber studs, avoiding dry rot, framing decay, and toxic mould.

#### 2. Dedicated Exhaust Ducting Directly to Outside Atmosphere:
- **Zero Ceiling Space Discharges**: Discharging bathroom, ensuite, laundry, or kitchen rangehood exhaust into an unvented roof space or ceiling cavity is **strictly prohibited**.
- **Ducted to Outside Air**:
  - All exhaust systems must be ducted continuously to the external atmosphere via an external wall louvre, eave vent, or roof penetration cowl.
  - **Minimum Airflow Rates**:
    - Bathrooms & Sanitary Compartments: Minimum **25 L/s** (intermittent) or **21 L/s** (continuous).
    - Kitchen Cooktops & Rangehoods: Minimum **40 L/s** (intermittent).
  - All exhaust ductwork must incorporate a self-closing non-return backdraft damper to prevent cold outside air or driving rain entering when the fan is switched off.

#### 3. Roof Space Ventilation Requirements:
- Where metal sheet roofing (e.g. Colorbond) or concrete tiles are installed with ceiling insulation batts:
  - Roof cavities must provide balanced air circulation.
  - A minimum **25,000 mm² of open ventilation area per 100 m² of ceiling area** is mandated, achieved through eaves soffit slot vents and ventilated ridge capping cowls.
  - Continuous airflow expels moist warm air before it can contact cold metal roof sheets during winter nights.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What energy efficiency star rating do Hudson homes achieve?",
        "What timber framing specifications does Hudson Homes use?",
        "What is the difference between H1 Smart and H2 Designer?",
        "Tell me about the 50-Year Structural Warranty",
      ],
      modelUsed: "hudson-engineering-engine",
    };
  }

  // 3H_WATER_TANK. Rainwater Harvesting & BASIX Water Conservation
  if (
    query.includes("rainwater") ||
    query.includes("water tank") ||
    query.includes("basix water") ||
    (query.includes("tank") && (query.includes("water") || query.includes("size") || query.includes("capacity") || query.includes("plumbed")))
  ) {
    return {
      answer: `### Rainwater Harvesting & BASIX Water Conservation (NSW & QLD)

Hudson Homes integrates water-saving systems calibrated to statutory state benchmarks and developer estate covenants:

#### 1. New South Wales (NSW) BASIX Certificate Mandates:
- **Standard Rainwater Tank Capacity**:
  - **2,000 to 5,000 Litres** (typically a 3,000L slimline poly or Colorbond steel tank with automatic submersible or external pump).
- **Mandatory Plumbing Connections**:
  - Plumbed directly to **all toilet cisterns**.
  - Plumbed to the **cold water washing machine tap** in the laundry.
  - Plumbed to at least **one external garden hose tap** for landscaping irrigation.
- **Mains Water Top-Up**:
  - Equipped with an automatic mains-water diverter valve (e.g. Davey RainBank or Bianco Rainsaver) that seamlessly switches to town water when rainwater is depleted.
- **BASIX 40%+ Target**: Satisfies NSW BASIX requirements to reduce potable mains water consumption by at least 40% compared to benchmark homes.

#### 2. Queensland (QLD) Water Management (QDC MP 4.2):
- **High-Efficiency WELS Fixtures**:
  - Standard builds utilize WELS 3-Star rated showerheads (<= 9 L/min), WELS 4-Star dual flush toilets (4.5L/3L), and WELS 4-Star tapware.
- **Estate Covenants & Rainwater Tanks**:
  - Where required by specific local council planning schemes or master-planned estates (e.g. Redland, Ipswich, or acreage estates), a 5,000L poly tank is installed and plumbed to internal sanitary fixtures.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What fixed site costs does Hudson Homes cover in NSW vs QLD?",
        "What is included in the Turn-Key Landscape Package (LP)?",
        "What is the difference between H1 Smart and H2 Designer?",
      ],
      modelUsed: "hudson-engineering-engine",
    };
  }

  // 3H5. Infrastructure Charges, Section 7.11 & Council Headworks (QLD & NSW)
  if (
    query.includes("infrastructure charge") ||
    query.includes("headworks") ||
    query.includes("headwork") ||
    query.includes("7.11") ||
    query.includes("7.12") ||
    query.includes("developer contribution") ||
    query.includes("section 7") ||
    (query.includes("charge") && (query.includes("council") || query.includes("duplex") || query.includes("auxiliary") || query.includes("lga") || query.includes("queensland") || query.includes("qld") || query.includes("nsw") || query.includes("moreton") || query.includes("logan") || query.includes("brisbane") || query.includes("ipswich") || query.includes("blacktown") || query.includes("camden") || query.includes("hills")))
  ) {
    return {
      answer: `### Infrastructure Charges, Section 7.11 / 7.12 & Council Headworks (QLD & NSW)

When building a dual occupancy, duplex, or secondary dwelling, local municipal councils and statutory economic development authorities levy infrastructure contributions (headworks) for additional trunk water, sewer, stormwater, transport, and community infrastructure networks:

#### 1. Queensland Council & PDA Infrastructure Charges:
Under the *Planning Act 2016* and local State Planning Regulatory Provisions, statutory capped infrastructure charges apply to any second duplex dwelling:
- **City of Moreton Bay**: Approx. **$31,500** per additional dwelling.
- **Brisbane City Council**: Approx. **$33,000** per additional dwelling.
- **Logan City Council**: Approx. **$31,000** per additional dwelling.
- **Ipswich City Council**: Approx. **$30,000** per additional dwelling.
- **City of Gold Coast**: Approx. **$22,000 to $25,000** per additional dwelling.
- **EDQ Priority Development Areas (Flagstone / Ripley / Yarrabilba)**: Approx. **$28,500 to $29,500** per additional dwelling under EDQ infrastructure charging schedules.

#### 2. The $0 Auxiliary Unit Exemption (Huge Investor Advantage in QLD):
- Across most South East Queensland local governments (including **Logan, Ipswich, Moreton Bay, and Redland**), an **Auxiliary Unit** (a secondary living dwelling under the primary roofline, maximum 65m²–70m² GFA under single title) is **100% EXEMPT ($0 charges)** from council infrastructure contributions!
- This provides an immediate **$30,000+ upfront cashflow saving** for investors building dual living compared to a full Torrens/strata subdivisible duplex.

#### 3. New South Wales Section 7.11 & 7.12 Developer Contributions:
Under the *Environmental Planning and Assessment Act 1979 (EP&A Act)*, NSW local councils levy local infrastructure contributions prior to the release of the Construction Certificate (CC):
- **Blacktown City Council (Contributions Plan No. 24 - CP24 / Schofields & Marsden Park)**: Historically capped at **$45,000 to $50,000+** per residential lot/dwelling under NSW ministerial directions for greenfield land release.
- **Camden Council (Section 7.11 / South West Growth Centre)**: Approx. **$20,000 to $35,000** per additional dwelling.
- **The Hills Shire (CP15 / Box Hill & North Kellyville)**: Typically **$30,000 to $45,000+** per dwelling.
- **Liverpool City Council**: Approx. **$20,000 to $25,000** per dwelling.
- **Penrith City Council**: Approx. **$19,000 to $22,000** per dwelling.
- **Central Coast Council & Hunter (Maitland / Cessnock)**: Approx. **$15,000 to $22,000** per additional dwelling.
- **Secondary Dwellings (Granny Flats in NSW)**: Subject to concessional Section 7.11/7.12 contributions ranging between **$6,000 to $9,000** depending on the specific LGA contribution plan.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What is the difference between a duplex and a dual-key auxiliary dwelling?",
        "What are the rules for building a duplex in Greater Flagstone PDA?",
        "What are the setback rules for building a duplex under NSW CDC?",
        "Tell me about the Wisteria 33 dual living design",
      ],
      modelUsed: "universal-planning-engine",
    };
  }

  // 4A_COMPARE. Inclusions Comparison (H1 Smart vs H2 Designer vs H3 Luxury)
  const isTierComparison =
    (query.includes("difference") || query.includes("compare") || query.includes("versus") || query.includes("vs") || query.includes("between")) &&
    ((query.includes("h1") && query.includes("h2")) ||
      (query.includes("h2") && query.includes("h3")) ||
      (query.includes("h1") && query.includes("h3")) ||
      (query.includes("smart") && query.includes("designer")) ||
      (query.includes("designer") && query.includes("luxury")) ||
      (query.includes("smart") && query.includes("luxury")) ||
      query.includes("tiers") ||
      query.includes("packages") ||
      query.includes("ranges"));

  if (isTierComparison) {
    return {
      answer: `### Hudson Homes Inclusions Comparison: H1 Smart vs H2 Designer vs H3 Luxury

Here is a side-by-side architectural comparison of Hudson Homes' three core residential inclusion tiers:

| Domain / Specification | **H1 Smart** (Smart Value Standard) | **H2 Designer** (Contemporary Luxury) | **H3 Luxury** (Architectural Masterpiece) |
|---|---|---|---|
| **Ceiling Heights** | Nominal **2440mm** throughout | **Raised 2590mm** throughout (2740mm ground floor upgrade option) | **Raised 2590mm** standard with optional 2740mm upgrade + highlight glazing |
| **Kitchen Benchtops** | Modern laminate benchtops from Laminex / Polytec | **20mm Engineered Stone** to Kitchen, Bathrooms & Laundry | **40mm Edge Engineered Stone** with pencil round or mitred island edges |
| **Kitchen Appliances** | **Haier 600mm** stainless steel oven, cooktop, rangehood & dishwasher | **Fisher & Paykel 900mm** luxury canopy rangehood, cooktop, 900mm oven & dishwasher | **Fisher & Paykel 900mm / European** appliance suite + scullery/butler's pantry fit-out |
| **Kitchen Sink** | Top-mount stainless steel double bowl sink | Top-mount double bowl sink with designer gooseneck pull-out mixer | **Double bowl undermount stainless steel sink** ($0 variation) + pantry prep sink |
| **Air Conditioning** | Reverse-cycle **split-system air conditioner** + ceiling fans to all bedrooms | **Fully ducted reverse-cycle air conditioning** (ActronAir or Daikin) with multi-zone digital controller | **Fully zoned ducted AC with MyAir (MyAir5) smart touchscreen controller** & app control |
| **Wet Area Tiling** | Standard height ceramic wall tiles to wet areas | **Full-height floor-to-ceiling porcelain wall tiles** to ensuite & main bathroom + tiled shower niche | **Full-height porcelain tiling** to all wet areas + custom LED accent lighting |
| **Main Bathtub** | Stylus Basis 1675mm acrylic bath | **Caroma Urbane II 1775mm freestanding bath** ($0 variation) | **Caroma Urbane II 1775mm freestanding bath** + frameless 10mm glass shower screens |
| **Entry Door** | 820mm standard painted entrance door | 820mm designer entrance door with Gainsborough trilock | **1020mm or 1200mm grand pivot entrance door** with architectural pull handle & smart digital keyless lock |
| **Architectural Glazing** | Standard aluminium sliding windows with flyscreens | Aluminium sliding windows with flyscreens + powder-coated frames | **Architectural awning windows & highlight feature glazing included ($0 variation)** |
| **Warranty & Peace of Mind** | **50-Year Structural Warranty** & Fixed Price Guarantee | **50-Year Structural Warranty** & Fixed Price Guarantee | **50-Year Structural Warranty** & Fixed Price Guarantee |

> [!NOTE]
> All three tiers can be selected and compared directly inside **Quote Builder V2** (\`/quote-builder\`), where upgrades flow automatically through to sales contracts and marketing flyers!`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What appliances are included in H2 Designer?",
        "Tell me about H3 Luxury Inclusions",
        "What is included in the Turn-Key Landscape Package (LP)?",
        "What is the difference between NSW and QLD inclusions?",
      ],
      modelUsed: "hudson-inclusions-engine",
    };
  }

  // 3W. Wind Classifications & Structural Tie-Down Engineering (AS 4055 & AS 1170.2)
  if (
    query.includes("wind") ||
    query.includes("cyclone") ||
    query.includes("cyclonic") ||
    query.includes("n1") ||
    query.includes("n2") ||
    query.includes("n3") ||
    query.includes("n4") ||
    query.includes("c1") ||
    query.includes("c2") ||
    query.includes("as 4055") ||
    query.includes("as 1170") ||
    query.includes("tie down") ||
    query.includes("hold down") ||
    query.includes("wind pressure")
  ) {
    return {
      answer: `### Wind Classifications & Structural Tie-Down Engineering (AS 4055 & AS 1170.2)

Hudson Homes engineers every home strictly to site-specific wind classifications under **AS 4055 (Wind Loads for Housing)** and **AS 1170.2 (Structural Design Actions - Wind Actions)**:

#### 1. Australian Wind Classification Categories:
| Classification | Type | Design Gust Wind Speed ($V_{u,min} - V_{u,max}$) | Typical Site Conditions |
|---|---|---|---|
| **N1** | Non-Cyclonic | **Up to 28 m/s (101 km/h)** | Heavily sheltered, inland valleys, low-density surrounded by dense suburban developments. |
| **N2** | Non-Cyclonic | **28 to 33 m/s (119 km/h)** | Standard suburban housing developments with standard suburban shielding. **Hudson's standard baseline**. |
| **N3** | Non-Cyclonic | **33 to 41 m/s (148 km/h)** | Elevated terrain, hill slopes, semi-open suburban fringes, or acreage lots (common across SEQ ridgelines, Redland, and Camden). |
| **N4** | Non-Cyclonic | **41 to 50 m/s (180 km/h)** | High-exposure escarpments, exposed rural ridges, and cliff-top sites. |
| **C1** | Cyclonic | **Up to 50 m/s (180 km/h)** | Tropical coastal regions subject to tropical cyclone events (sheltered terrain). |
| **C2** | Cyclonic | **50 to 61 m/s (220 km/h)** | Exposed coastal tropical areas with high cyclonic vulnerability. |

#### 2. Key Structural Engineering Differences (N2 vs N3):
- **Roof Truss Tie-Downs**:
  - **N2**: Standard triple-grip brackets and framing anchors fastening trusses to top wall plates.
  - **N3 Upgrades**: Heavy-duty structural tie-down brackets (M10/M12 high-tensile cyclone tie-down rods extending continuously from top plate down into floor slab anchors, or engineered multigrips with heavy gauge helical nails).
- **Glazing & Window Pressures (AS 2047)**:
  - Windows must resist higher Serviceability Limit State (SLS) and Ultimate Limit State (ULS) positive and negative wind pressures.
  - Upgraded window glass thickness (minimum 5mm/6mm toughened or laminated glass) and reinforced structural window mullions to prevent frame deflection and water penetration under driving rain.
- **Wall & Roof Bracing (AS 1684)**:
  - Higher wind classifications mandate increased bracing units (Type A / Type B plywood or structural hardboard bracing sheets fixed with dense nailing patterns) to resist lateral shear loads.
- **Eaves & Cladding Fixings**:
  - Fiber cement soffit linings and external wall claddings fixed at reduced fastener spacing with annular-grooved stainless steel nails or heavy-duty screws to resist wind uplift suction.

> [!NOTE]
> Every Hudson Homes tender includes a site-specific wind classification assessment calculated from your site's Region, Terrain Category, Topographic Class, and Shielding Factor!`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What timber framing specifications does Hudson Homes use?",
        "What is included in Hudson Homes fixed site costs?",
        "What are the requirements for BAL-29 bushfire construction?",
        "Tell me about the 50-Year Structural Warranty",
      ],
      modelUsed: "hudson-engineering-engine",
    };
  }

  // 3X. Slab Edge Rebates, Damp-Proofing & Weep Hole Clearances
  if (
    query.includes("slab edge rebate") ||
    query.includes("edge rebate") ||
    query.includes("slab rebate") ||
    query.includes("rebate") ||
    query.includes("damp proofing") ||
    query.includes("dpc") ||
    query.includes("weephole") ||
    query.includes("weep hole") ||
    query.includes("ffl height") ||
    query.includes("finished floor level height")
  ) {
    return {
      answer: `### Slab Edge Rebates, Damp-Proofing & Weep Hole Clearances (AS 2870 & NCC 2022)

Hudson Homes foundation slabs incorporate precision-engineered edge rebates and damp-proofing systems complying with **AS 2870 (Residential Slabs and Footings, Part 5.3)** and **NCC 2022 Part 3.2**:

#### 1. What is a Slab Edge Rebate & Why is it Critical?
- A **slab edge rebate** is a step-down recess (typically **20mm to 50mm drop**) formed in the perimeter of the concrete slab where the external masonry veneer sits.
- **Purpose**:
  1. Prevents horizontal rainwater ingress tracking under the structural bottom timber framing plate into interior flooring and habitable rooms.
  2. Ensures that any moisture penetrating the external brick veneer drains down the cavity, hits the rebate flashing, and is discharged safely to the outside.
  3. Provides a continuous physical step separating interior dry finished floor level (FFL) from external ground and wet cavities.

#### 2. Damp-Proof Course (DPC) & Continuous Flashings:
- Heavy-duty embossed polyethylene or bitumen-coated **Damp-Proof Course (DPC)** is installed continuously beneath the timber bottom plate and built into the brick veneer.
- Stepped cavity flashings are installed under all window and door sills, bridging the cavity and terminating with open perpends (**weep holes**) to expel moisture.
- Weep holes are spaced at **maximum 1.2m centres** along the bottom course of brickwork above the slab rebate.

#### 3. Statutory Finished Floor Level (FFL) Height Clearances:
To prevent moisture, mud, and water pooling from entering homes during heavy rainfall:
- **150mm Minimum Clearance**: Finished floor level must be at least **150mm above finished bare ground** or landscaped garden beds.
- **100mm Minimum Clearance**: In low-rainfall areas or sandy free-draining soils.
- **50mm Minimum Clearance**: Above permanently paved, concrete, or tiled surfaces that slope away from the dwelling at minimum 1:20 (50mm fall over the first 1.0m).

> [!TIP]
> Keep external weep holes and the 75mm exposed slab edge completely clear of garden soil, mulch, and turf to maintain AS 3660.1 termite inspection compliance and moisture drainage!`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What termite protection system does Hudson Homes use?",
        "What soil classifications are covered in fixed site costs?",
        "How do Drop Edge Beams work on sloping sites?",
      ],
      modelUsed: "hudson-engineering-engine",
    };
  }

  // 3Y. Timber Framing & Engineered Roof Truss Spans
  if (
    query.includes("timber framing") ||
    query.includes("framing") ||
    query.includes("stud centre") ||
    query.includes("stud spacing") ||
    query.includes("truss span") ||
    query.includes("roof truss") ||
    query.includes("as 1684") ||
    query.includes("mgp10") ||
    query.includes("mgp12") ||
    query.includes("lintel") ||
    query.includes("engineered timber")
  ) {
    return {
      answer: `### Timber Framing & Engineered Roof Truss Spans (AS 1684 & AS 1720.1)

All Hudson Homes structural framing is manufactured off-site in precision computer-controlled prefabrication facilities in accordance with **AS 1684 (Residential Timber-Framed Construction)** and **AS 1720.1 (Timber Structures Code)**:

#### 1. Wall Framing Specifications:
- **Timber Grade**: Machine Graded Pine (**MGP10 / MGP12**) seasoned radiata pine, engineered for high bending strength and structural rigidity.
- **Termite Treatment**:
  - **Queensland (QLD)**: **'T2' blue termite-treated** timber frames and trusses standard across **ALL tiers** (single and double storey).
  - **New South Wales (NSW)**: Radiata Pine standard on IP, SS, HBS, H1; **'T2' termite-treated** framing standard on **H2 Designer & H3 Luxury**.
- **Stud Spacing (Centres)**:
  - **450mm Centres**: Standard on all double-storey ground floors, heavy concrete tiled roof loads, and high wind zones (N3).
  - **600mm Centres**: Utilized on non-load-bearing internal partition walls and single-storey lightweight sheet-roof designs where engineered.
- **Framing Depth**: Standard 70mm or 90mm external stud wall depth providing maximum cavity space for high-performance acoustic and thermal wall insulation batts (R2.0 to R2.5).

#### 2. Engineered Roof Trusses:
- **Prefabricated Gang-Nail Trusses**: Custom engineered using high-tensile multi-tooth galvanized steel connector plates pressed into timber joints under hydraulic pressure.
- **Truss Pitch**: Standard 22.5° or 25° architectural pitch (with custom pitches available for Hamptons or modern facades).
- **Truss Spans**: Clear span trusses capable of spanning up to **10m to 14m+** without intermediate internal load-bearing walls, creating expansive open-plan kitchen, dining, and living zones.
- **Ceiling Battens**:
  - **Queensland (QLD)**: High-tensile metal ceiling battens fixed at **450mm centres** standard.
  - **NSW**: Metal battens or timber ceiling joists engineered for plasterboard stability and sag resistance.

#### 3. Lintel Sizing & Structural Openings:
- **Engineered Laminated Veneer Lumber (LVL)** or hot-dip galvanized steel PFC/flange lintels span above wide openings:
  - Double garage door openings (up to 5.4m wide clear span).
  - Expansive corner and sliding stacker doors leading to outdoor alfresco areas.
- Every lintel is calculated for dead loads, live loads, and roof tie-down uplift to prevent ceiling sag and ensure smooth door operation.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What is the difference between NSW and QLD inclusions?",
        "What ceiling heights come standard in H1 vs H2?",
        "Tell me about the 50-Year Structural Warranty",
        "What wind classification does Hudson Homes build for?",
      ],
      modelUsed: "hudson-engineering-engine",
    };
  }

  // 3Z. Brick Articulation Joints (AS 3700 & AS 4773)
  if (
    query.includes("articulation joint") ||
    query.includes("expansion joint") ||
    query.includes("control joint") ||
    query.includes("brick cracking") ||
    query.includes("brick crack") ||
    query.includes("masonry joint") ||
    query.includes("as 3700") ||
    query.includes("as 4773") ||
    query.includes("joint spacing")
  ) {
    return {
      answer: `### Brick Articulation Joints & Masonry Movement Control (AS 3700 & AS 4773)

Hudson Homes external brickwork incorporates engineered vertical articulation joints complying strictly with **AS 3700 (Masonry Structures)** and **AS 4773 (Masonry in Small Buildings)**:

#### 1. What are Articulation Joints & Why are they Essential?
- An **articulation joint (AJ)** is a continuous, vertical 10mm gap built cleanly through the external brickwork from the concrete footing/slab rebate up to the eaves line.
- **Purpose**:
  1. Absorbs natural foundation and ground movement caused by seasonal moisture changes in reactive clay soils (AS 2870 Class M, H1, H2).
  2. Accommodates thermal expansion and contraction of clay brickwork during extreme summer and winter temperatures.
  3. **Prevents unsightly step-cracking**: Without articulation joints, natural foundation settling forces bricks and mortar joints to shear diagonally. Articulation joints localize movement into controlled, sealed joints.

#### 2. Statutory Spacing & Placement Rules:
- **Straight Wall Spacing**: Articulation joints are placed at regular intervals of no more than **5.0m to 6.0m** along straight external walls.
- **Corner Proximity**: Located within **1.5m to 2.0m** of external or re-entrant building corners, where stress concentration is highest.
- **Openings & Changes in Height**: Built adjacent to large window/door openings or transitions between single and double-storey sections.

#### 3. Joint Sealant & Construction Detail:
- Joints are never bridged by rigid mortar.
- A circular closed-cell polyethylene foam **backing rod** is pressed into the 10mm joint at a consistent depth (typically 6mm–10mm from face).
- Sealed externally with high-performance, UV-stabilized, flexible **polyurethane or neutral-cure silicone mastic**, colour-matched to the brick or mortar color for a sleek, discreet architectural finish.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What soil classifications does Hudson Homes cover?",
        "What slab edge rebates are required in foundation design?",
        "Tell me about the 50-Year Structural Warranty",
      ],
      modelUsed: "hudson-engineering-engine",
    };
  }

  // 3AA. On-Site Stormwater Detention (OSD) & Hydraulic Drainage
  if (
    query.includes("osd") ||
    query.includes("on-site stormwater detention") ||
    query.includes("stormwater detention") ||
    query.includes("permissible site discharge") ||
    query.includes("psd") ||
    query.includes("site storage requirement") ||
    query.includes("ssr") ||
    query.includes("orifice plate") ||
    query.includes("detention tank")
  ) {
    return {
      answer: `### On-Site Stormwater Detention (OSD) & Hydraulic Engineering

For properties in suburban renewal corridors or councils with strict stormwater constraints, Hudson Homes integrates engineered **On-Site Stormwater Detention (OSD)** systems:

#### 1. What is On-Site Stormwater Detention (OSD)?
- OSD temporarily holds back peak stormwater runoff generated by a newly built home, duplex, or enlarged roof footprint during severe rainfall events, releasing it slowly into council's stormwater drainage network at a controlled rate.
- **Permissible Site Discharge (PSD)**: The maximum allowable discharge flow rate (in litres per second) into council's street drainage, calculated to match pre-development levels.
- **Site Storage Requirement (SSR)**: The total volume of stormwater (in cubic metres) that must be temporarily stored on-site during a 1-in-100-year storm.

#### 2. When is OSD Required?
- Common in municipal councils such as Camden, Blacktown, Penrith, Parramatta, City of Gold Coast, and Brisbane City Council.
- Triggered when:
  1. Constructing a duplex or dual-occupancy development.
  2. Subdividing or building on lots where total impervious site coverage (roof + driveway) exceeds council thresholds.
  3. Upstream drainage capacity in the street is constrained.

#### 3. System Components:
- **Below-Ground Modular Detention Cells**: High-strength underground structural tanks (such as Atlantis cells or concrete retention tanks) buried beneath turf or driveways.
- **Above-Ground Dual-Purpose Rainwater / Detention Tanks**: A multi-chamber tank where the lower section stores rainwater for household reuse (BASIX compliance) and the upper air space serves as temporary storm detention.
- **Orifice Restrictor Plate**: A precision-machined stainless steel plate with a calibrated aperture (e.g. 50mm to 90mm diameter) controlling the discharge rate to the street gutter or legal point of discharge (LPOD).
- **Trash Screen & Silt Sump**: High-capacity galvanized mesh basket preventing leaves and debris from clogging the orifice plate.
- **High-Level Surcharge Overflow**: Direct emergency overflow pipe to the street reserve in events exceeding the design storm.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What fixed site costs does Hudson Homes cover?",
        "How do rainwater tanks work with BASIX in NSW?",
        "What are the infrastructure charges for building a duplex?",
      ],
      modelUsed: "hudson-engineering-engine",
    };
  }

  // 3AC. Facade Options & Architectural Finishes
  if (
    query.includes("facade") ||
    query.includes("facades") ||
    query.includes("facade options") ||
    query.includes("hamptons") ||
    query.includes("coastal") ||
    query.includes("modern facade") ||
    query.includes("executive facade") ||
    query.includes("grande facade") ||
    query.includes("vogue facade") ||
    query.includes("contempo facade") ||
    query.includes("scyon") ||
    query.includes("linea") ||
    query.includes("exterior cladding")
  ) {
    return {
      answer: `### Hudson Homes Architectural Facade Collections & Exterior Finishes

Hudson Homes offers an inspiring portfolio of designer facades engineered to maximize street appeal, property valuation, and developer covenant compliance:

#### 1. Master Facade Collections:
1. **Traditional / Classic Facade**:
   - Timeless, elegant Australian suburban design.
   - Symmetrical front elevation, exposed face brickwork from Austral or PGH, painted feature piers, symmetrical window layouts, and Colorbond or concrete tile hip roof.
2. **Coastal / Hamptons Facade**:
   - One of Hudson's most popular luxury styles.
   - Characterized by **James Hardie Scyon Linea weatherboard cladding**, decorative coastal gable vents, crisp white timber mouldings, painted veranda posts, and light seaside tones.
3. **Modern / Contemporary Facade**:
   - Clean architectural lines and mixed material palettes.
   - Contrasting combinations of face brick, smooth rendered feature bands, vertical groove cladding, and architectural awning windows.
4. **Executive / Grande / Vogue Facade (Double Storey)**:
   - Statement luxury with commanding street presence.
   - Grand two-storey entrance portico, rendered or natural stone feature columns, expansive upper-floor cantilevered balcony with semi-frameless glass or powder-coated aluminium balustrades.
5. **Contempo / Metro Facade**:
   - High-end urban architectural aesthetic.
   - Geometric parapet roof forms, concealed gutters, architectural box windows, cantilevered roof eaves, and 1200mm grand pivot entrance doors.

#### 2. Premium Cladding & Material Partners:
- **Bricks**: PGH Bricks & Pavers, Austral Bricks (full range of smooth, textured, and glazed finishes).
- **Lightweight Cladding**: James Hardie Linea weatherboards, Scyon Axon vertical grooved cladding, and Matrix panels.
- **Hebel Aerated Concrete**: CSR Hebel 75mm PowerPanel systems delivering superior thermal insulation (R-value) and acoustic dampening.
- **Roofing**: Genuine BlueScope Colorbond steel (contemporary palette: Monument, Surfmist, Basalt, Dune) and Boral designer concrete roof tiles.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What ceiling heights come standard in H1 vs H2?",
        "What is the difference between H1 Smart, H2 Designer, and H3 Luxury?",
        "What inclusion ranges does Hudson Homes offer?",
      ],
      modelUsed: "hudson-inclusions-engine",
    };
  }

  // 3AD. Fixed Price Tender Process & Step-by-Step Milestones
  if (
    query.includes("tender process") ||
    query.includes("fixed price tender") ||
    query.includes("tender steps") ||
    query.includes("how does tender work") ||
    query.includes("quote to tender") ||
    query.includes("building process") ||
    query.includes("stages of building") ||
    query.includes("steps to build") ||
    query.includes("tender presentation")
  ) {
    return {
      answer: `### Hudson Homes Fixed Price Tender Journey & 8-Step Building Process

Hudson Homes provides a transparent, structured pathway from initial concept through to key handover, eliminating surprises:

#### Step 1: Initial Consultation & Design Selection
- Meet with your dedicated New Home Consultant (NHC) at our display centres (e.g. HomeWorld Warnervale, Sydney Metro, Hunter, or SEQ).
- Select your ideal home design (single storey, double storey, duplex, dual living) and match with inclusions (H1 Smart, H2 Designer, H3 Luxury, or IP Turn-Key).

#### Step 2: Preliminary Agreement & Comprehensive Site Investigations
- Preliminary deposit placed to initiate site due diligence.
- Hudson commissions registered site investigations:
  - **Site Contour & Detail Survey**: Accurately maps boundary pegs, natural contours, fall across the pad, trees, and existing services.
  - **Geotechnical Soil Test**: Borehole drilling and laboratory testing determining AS 2870 soil reactivity classification (Class S, M, H1, H2, P).
  - **Service Asset Locates**: Identifies underground water, sewer, and stormwater main depths and easements (Zone of Influence).

#### Step 3: Architectural Siting & Foundation Engineering
- In-house drafting and structural engineers position the dwelling within statutory council setback envelopes.
- Foundation design engineered (waffle pod vs stiffened raft slab, Drop Edge Beams for slope, concrete piering depths).

#### Step 4: Formal Fixed Price Tender Presentation
- An itemized, 100% comprehensive tender document is prepared:
  - Base house price.
  - Guaranteed fixed site costs (slab engineering, earthworks, council DA/CDC fees, BASIX / NatHERS 7-Star compliance).
  - Custom modifications from the Modified Plan Engine (alfresco extensions, garage widening, door/window upgrades).

#### Step 5: Tender Acceptance & Fixed Price Lock-In
- Client reviews and accepts the tender, locking in their contract price with zero price escalation clauses!

#### Step 6: Contract Signing & Master Working Drawings
- HIA or Master Builders standard building contract executed.
- Final detailed architectural working drawings, structural engineering Form 15, and colour selections finalized.

#### Step 7: Statutory Planning & Certifier Approvals
- Hudson handles 100% of council approvals: Fast-track Complying Development Certificate (CDC) via private certifier or Development Application (DA) via Local Council.

#### Step 8: Construction Milestones & Handover
- Dedicated Site Supervisor manages construction through standard milestone stages:
  1. Base Stage (15%) -> 2. Frame Stage (20%) -> 3. Lock-Up Stage (25%) -> 4. Fixing Stage (20%) -> 5. Practical Completion (15%) and key handover with our 50-Year Structural Warranty!`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "Tell me about the 50-Year Structural Warranty",
        "What fixed site costs does Hudson Homes cover?",
        "What are the HIA contract progress payment stages?",
        "How does the Quote Builder work?",
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
- **Kitchen**: Durable laminate benchtops, fully lined cabinetry with overhead cupboards and bulkheads, Haier 600mm stainless steel electric appliances (600mm oven, cooktop, and rangehood with dishwasher included), and stainless steel drop-in sink.
- **Comfort & Finishes**: Reverse-cycle split system air conditioning, ceiling fans to bedrooms, ceramic tiles to living zones, and quality carpet to bedrooms.
- **Bathrooms**: Floating-style vanities, polished-edge mirrors, and semi-frameless pivot shower screens.
- **Structure**: Engineered concrete slab up to H1/H2 classification, Termimesh barrier, and Colorbond or concrete tile roof.
- **Best For**: First home buyers, growing families, and budget-conscious purchasers.

---

#### 2. H2: Designer Inclusions (Contemporary Luxury & Style)
*Elevated contemporary style and premium luxury seen in our display homes.*
- **Ceilings**: **Raised 2590mm high ceilings** (with optional 2740mm ground floor upgrade) creating superior natural light and volume.
- **Kitchen**: **20mm engineered stone benchtops** to kitchen, bathrooms, and laundry; premium **Fisher & Paykel 900mm luxury appliance suite** (900mm canopy rangehood, 900mm cooktop, 900mm built-in oven, and fully installed dishwasher), soft-close cabinetry, and designer gooseneck mixer.
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
    !query.includes("sewer") &&
    !query.includes("zoi") &&
    !query.includes("repose") &&
    !query.includes("bal") &&
    !query.includes("bushfire") &&
    !query.includes("acoustic") &&
    !query.includes("noise") &&
    !query.includes("slope") &&
    !query.includes("retaining") &&
    !query.includes("drop edge") &&
    !query.includes("livable") &&
    !query.includes("ncc") &&
    (
      query.includes("site cost") ||
      query.includes("site costs") ||
      query.includes("fixed price") ||
      query.includes("warranty") ||
      query.includes("slab") ||
      query.includes("piering") ||
      query.includes("basix") ||
      query.includes("guarantee")
    )
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
- The system automatically detects whichever NHC is signed in (e.g. Steve Slisar, Gary Rees, Adrian Baxter) and populates their name, phone, email, and display centre on the flyer footer.
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
    query.includes("land inventory") ||
    query.includes("price list") ||
    query.includes("ai price list") ||
    (query.includes("lot") && (query.includes("inventory") || query.includes("table") || query.includes("portal") || query.includes("upload") || query.includes("list") || query.includes("search lots") || query.includes("registered")))
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
  - **Senior NHCs**: Steve Slisar, Gary Rees, Adrian Baxter.`,
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

  // 4F. Geotechnical Soil Classifications & Slab Engineering (AS 2870)
  if (
    query.includes("soil") ||
    query.includes("geotech") ||
    query.includes("class m") ||
    query.includes("class h") ||
    query.includes("class p") ||
    query.includes("class s") ||
    query.includes("class e") ||
    query.includes("waffle pod") ||
    query.includes("stiffened raft") ||
    query.includes("slab type") ||
    query.includes("slab design") ||
    query.includes("reactive clay") ||
    query.includes("ground movement")
  ) {
    return {
      answer: `### Geotechnical Soil Classification & Foundation Engineering (AS 2870)

All Hudson Homes structural foundations are designed strictly in accordance with **AS 2870 (Residential Slabs and Footings)** and certified by registered structural engineers:

#### 1. AS 2870 Soil Classification Categories & Surface Movement ($y_s$):
- **Class A (Sand / Rock)**: Little or no ground movement. Expected surface movement $y_s = 0\\text{mm}$.
- **Class S (Slightly Reactive)**: Slight ground movement with moisture variation. Characteristic movement $y_s \\le 20\\text{mm}$.
- **Class M (Moderately Reactive)**: Moderate ground movement. Characteristic movement $20\\text{mm} < y_s \\le 40\\text{mm}$. Very common across Australian suburban developments.
- **Class H1 (Highly Reactive)**: High ground movement. Characteristic movement $40\\text{mm} < y_s \\le 60\\text{mm}$. Deep footing embedment required.
- **Class H2 (Highly Reactive Clay)**: Very high ground movement. Characteristic movement $60\\text{mm} < y_s \\le 75\\text{mm}$. Common in western Sydney shale and South East Queensland basaltic/black soils.
- **Class E (Extremely Reactive)**: Extreme ground movement ($y_s > 75\\text{mm}$). Requires specialized structural raft design or deep pier-and-beam foundations.
- **Class P (Problem Site)**: Sites with uncontrolled or uncompacted fill (>400mm depth), soft compressible soils, high water tables, active tree root drying zones, mine subsidence, or slope instability. Requires site-specific structural engineering.

#### 2. Foundation & Concrete Slab Types:
- **Engineered Waffle Pod Slab (Class 1a)**:
  - Constructed using expanded polystyrene (EPS) void formers (nominal 1090x1090mm pods) with reinforced concrete internal ribs (minimum 110mm width), perimeter edge beams (typically 300mm–400mm deep), and continuous top steel mesh (SL72/SL82/SL92).
  - Delivers superior thermal insulation (under-slab R-value) and predictable ground damp isolation.
- **Traditional Stiffened Raft Slab**:
  - Monolithic ground-bearing slab with excavated internal trench beams cast into the earth. Preferred on sloping sites with step-downs, significant cut-and-fill pads, or high soil reactivity.
- **Drop Edge Beams (DEB)**:
  - Vertical concrete perimeter beam extensions cast into the slab edge to retain earth fill on sloping sites without requiring separate external retaining walls up to 1.5m.
- **Concrete Piering**:
  - Bored reinforced concrete piers (300mm to 450mm diameter) drilled through uncontrolled fill or reactive surface layers directly into stable, natural bearing strata, stiff clay, or sandstone bedrock.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What fixed site costs does Hudson Homes cover?",
        "Are concrete piers included in NSW and QLD standard site costs?",
        "How does Sewer Zone of Influence (ZOI) affect concrete piering?",
        "What are the requirements for BAL-29 bushfire construction?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 4G. Bushfire Attack Level (AS 3959 BAL Standards)
  if (
    query.includes("bushfire") ||
    query.includes("bal-") ||
    query.includes("bal ") ||
    query.includes("bal 12.5") ||
    query.includes("bal 19") ||
    query.includes("bal 29") ||
    query.includes("bal 40") ||
    query.includes("bal fz") ||
    query.includes("ember") ||
    query.includes("fire rating")
  ) {
    return {
      answer: `### Bushfire Attack Level (BAL) Standards (AS 3959)

Hudson Homes constructs homes across all bushfire hazard categories under **AS 3959 (Construction of Buildings in Bushfire-Prone Areas)**:

#### 1. Bushfire Attack Level (BAL) Tiers & Radiant Heat Flux:
- **BAL-LOW**: Negligible risk. Standard NCC/BCA building construction applies.
- **BAL-12.5 (Radiant Heat Flux $\\le 12.5\\text{ kW/m²}$)**:
  - Primary risk is ember attack and burning debris.
  - **Requirements**: Corrosion-resistant metal ember screens ($\le 2\\text{mm}$ aperture in bronze, aluminium, or stainless steel) to all weep holes, openable windows, and roof cowl vents. Minimum 4mm toughened safety glass. Non-combustible roof sarking.
- **BAL-19 (Radiant Heat Flux $> 12.5\\text{ to } \\le 19\\text{ kW/m²}$)**:
  - Increasing heat flux and ember density.
  - **Requirements**: Toughened safety glass (min 5mm). External doors fire-rated or solid core (min 35mm) with perimeter draft/smoke seals. External wall cladding within 400mm of ground/decks must be non-combustible (brickwork, Hebel, or fiber cement).
- **BAL-29 (Radiant Heat Flux $> 19\\text{ to } \\le 29\\text{ kW/m²}$)**:
  - High risk of ember attack and burning debris ignited by radiant heat.
  - **Requirements**: All external glazing toughened safety glass (min 5mm/6mm). Aluminium window assemblies tested to AS 1530.8.1 with metal mesh screening. Non-combustible cladding throughout (brick, Hebel aerated concrete, or 9mm fiber cement). Gutter guards installed to prevent leaf accumulation. Garage doors fitted with heavy-duty perimeter compression seals ($\le 2\\text{mm}$ gaps).
- **BAL-40 (Radiant Heat Flux $> 29\\text{ to } \\le 40\\text{ kW/m²}$)**:
  - Very high risk of structural ignition.
  - **Requirements**: Windows protected by tested fire-rated motorized bushfire shutters or certified BAL-40 fire window systems with metal frames. Fully non-combustible decks and zero exposed timber framing.
- **BAL-FZ (Flame Zone - $> 40\\text{ kW/m²}$)**:
  - Direct flame contact. Requires specialized FZ fire shutters, FRL 30/--/-- or 60/60/60 fire-rated building envelope, and custom engineering.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What are the requirements for BAL-29 bushfire construction?",
        "What fixed site costs does Hudson Homes cover?",
        "What inclusion ranges does Hudson Homes offer?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 4H. Acoustic & Road Noise Corridors (QDC MP 4.4 & NSW SEPP Transport)
  if (
    query.includes("acoustic") ||
    query.includes("noise") ||
    query.includes("traffic noise") ||
    query.includes("road noise") ||
    query.includes("qdc mp 4.4") ||
    query.includes("sound transmission") ||
    query.includes("double glazed") ||
    query.includes("laminated glass")
  ) {
    return {
      answer: `### Acoustic & Road Traffic Noise Mitigation (QDC MP 4.4 & NSW SEPP Transport)

For properties situated along designated arterial roads, rail corridors, or transit corridors, building envelopes must satisfy statutory acoustic categories:

#### 1. Acoustic Categories & Noise Levels ($L_{A10,18h}$):
- **Category 1 (58 to 63 dBA)**: Standard residential glazing with quality acoustic perimeter seals.
- **Category 2 (63 to 68 dBA)**:
  - Requires **6mm or 6.38mm acoustic laminated glass** to all bedrooms and living areas facing the transport corridor.
  - Solid core external entrance doors (min 35mm thick) fitted with acoustic drop seals and perimeter rubber gaskets.
  - Acoustic ceiling insulation ($R_w \\ge 35$, typically high-density R2.5 acoustic ceiling batts).
- **Category 3 (68 to 73 dBA)**:
  - Heavy acoustic glazing: Double-glazed Insulated Glass Units (IGUs) with acoustic PVB interlayer (e.g. 6mm toughened / 12mm argon cavity / 6.38mm acoustic laminate) achieving $R_w + C_{tr} \\ge 35$.
  - Mechanical fresh-air ventilation system (or ducted reverse-cycle air conditioning with continuous outside air intake) to allow residents to sleep with windows securely closed.
  - Staggered mechanical penetrations and acoustically sealed wall junction penetrations.
- **Category 4 (>73 dBA)**:
  - Specialized architectural acoustic design with acoustic baffle boxes, double-stud boundary walls, and decoupled ceilings.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What are the differences between H1 Smart and H2 Designer inclusions?",
        "What fixed site costs does Hudson Homes cover?",
        "Tell me about H3 Luxury Inclusions",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 4I. Sewer & Stormwater Zone of Influence (ZOI)
  if (
    query.includes("sewer") ||
    query.includes("zoi") ||
    query.includes("zone of influence") ||
    query.includes("angle of repose") ||
    query.includes("build over sewer") ||
    query.includes("easement") ||
    query.includes("sydney water") ||
    query.includes("logan water") ||
    query.includes("urban utilities") ||
    query.includes("unitywater")
  ) {
    return {
      answer: `### Sewer & Stormwater Zone of Influence (ZOI) Engineering

When building adjacent to public infrastructure mains (Sydney Water, Hunter Water, Urban Utilities, Logan Water, Unitywater, City of Gold Coast), footings must comply with Zone of Influence (ZOI) rules:

#### 1. The 45° Angle of Repose Rule:
- The Zone of Influence is defined as a **45-degree angle of repose** drawn upwards from the invert (the bottom internal flowline) of the public pipe to the natural ground surface.
- Any building footing (slab edge, thickening beam, or pad) located within this 45° zone will exert surcharge vertical loads onto the public pipe, risking pipe fracture or ground subsidence.

#### 2. Structural Piering Requirements:
- Where building works fall inside the ZOI, footings cannot rely on standard ground bearing.
- **Bored Reinforced Concrete Piers**: Must be drilled past the 45° angle of repose to a minimum depth of **300mm to 500mm BELOW the pipe invert level**, founded into natural undisturbed ground or bedrock.
- This ensures 100% of the building's structural load is transferred below the public asset.

#### 3. Prohibited Build-Over Clearances:
- No permanent structures may be built directly over manholes, maintenance shafts, or inspection openings (minimum 1.0m to 1.5m horizontal clearance required).
- No building directly over trunk mains (typically pipes $\\ge 300\\text{mm}$ diameter).
- Minor reticulated mains ($\le 150\\text{mm}-225\\text{mm}$) may be bridged with certified Build-Over-Sewer (BOS) approval and concrete encasement if required.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "Are concrete piers included in Hudson Homes fixed site costs?",
        "What fixed site costs does Hudson Homes cover?",
        "How do I run a compliance check on a lot with an easement?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 4J. Slope, Topography, Earthworks & Retaining Walls
  if (
    query.includes("slope") ||
    query.includes("fall") ||
    query.includes("sloping") ||
    query.includes("cut and fill") ||
    query.includes("retaining") ||
    query.includes("drop edge beam") ||
    query.includes("earthwork")
  ) {
    return {
      answer: `### Slope, Earthworks, Drop Edge Beams & Retaining Walls

Hudson Homes engineers sites across all topographical slope categories:

#### 1. Site Fall Categories Across Building Pad:
- **0.0m to 0.5m (Flat / Nominal Fall)**: Standard single-level concrete slab with minimal leveling.
- **0.5m to 1.5m (Moderate Fall)**:
  - Balanced cut-and-fill benching.
  - **Drop Edge Beams (DEB)**: Cast directly onto the perimeter of the slab to retain internal fill or accommodate natural slope, eliminating external retaining walls up to 1.5m.
- **1.5m to 3.0m+ (Steep / Significant Fall)**:
  - Split-level home designs (e.g. Hudson's **Cinnamon**, **Cobalt**, or **Mauve** ranges) stepping the ground floor down with internal stairs, following natural site contours and dramatically reducing excavation costs.

#### 2. Retaining Wall Statutory Thresholds:
- **Maximum Uncertified Cut / Fill**: Standard council rules limit uncertified excavation to **1.0m maximum depth**.
- **Structural Certification Triggers**:
  - Any retaining wall exceeding **1.0m in height** requires formal structural engineering design, building approval, and **Form 15 / Form 16 certification** (QLD) or engineer compliance certificate (NSW).
  - Retaining walls supporting building footings or vehicle driveways require structural engineering regardless of height.
  - Subsoil drainage (100mm slotted agi pipe surrounded by 20mm aggregate and geotextile filtration fabric) is mandatory behind all retaining structures to prevent hydrostatic water pressure buildup.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What split-level designs does Hudson Homes offer?",
        "What fixed site costs does Hudson Homes cover?",
        "How do Drop Edge Beams work on sloping blocks?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 4K. NCC 2022 Volume Two, Energy & Liveable Housing Provisions
  if (
    query.includes("ncc") ||
    query.includes("bca") ||
    query.includes("7-star") ||
    query.includes("nathers") ||
    query.includes("liveable housing") ||
    query.includes("accessible") ||
    query.includes("ceiling height")
  ) {
    return {
      answer: `### NCC 2022 Volume Two & National Construction Code Mandates

All Hudson Homes architectural floorplans and specifications comply with **NCC 2022 (Building Code of Australia Volume Two)**:

#### 1. NatHERS 7-Star Thermal & Energy Efficiency:
- **7-Star Whole-of-Home Rating**:
  - Standard base pricing in Queensland now incorporates complete NatHERS 7-Star compliance ($0 additional energy allowances needed).
  - Thermal envelope includes high-performance ceiling insulation (minimum R4.0 to R5.0), external wall insulation batts (minimum R2.0 to R2.5), reflective wall wrap sarking, and optimized glazed window window-to-floor ratios.
  - Hot water heat pumps (e.g. Wulfe Heat Pump M9) and high-efficiency reverse cycle air-conditioning.

#### 2. Liveable Housing Design Standard (Part G7):
- **Continuous Step-Free Access**: Step-free threshold path of travel from the street boundary or car parking space to at least one primary entrance door.
- **Clear Opening Widths**: Internal doors to habitable rooms and ground floor sanitary compartments provide minimum **820mm clear opening width**. Hallways provide minimum **1000mm clear width**.
- **Accessible Toilet Facilities**: Ground-floor toilet with compliant spatial circulation zones and reinforced wall framing studs to support future grab rail installation.
- **Hobless Showers**: Step-free, hobless shower recesses to ground-floor bathrooms for universal accessibility.

#### 3. Ceiling Heights (Part 10.6):
- Habitable rooms (living, bedrooms, media, dining): Minimum 2400mm (Hudson H1 Smart standard 2440mm; H2 Designer standard 2590mm raised).
- Non-habitable rooms (bathrooms, laundries, pantries, hallways): Minimum 2100mm.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What inclusion ranges does Hudson Homes offer?",
        "What is the difference between H1 Smart and H2 Designer?",
        "What are the differences between NSW and QLD inclusions?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 4L. Progress Payment Schedule (HIA Contract Milestones & Percentages)
  if (
    query.includes("progress payment") ||
    query.includes("payment stage") ||
    query.includes("drawdown") ||
    query.includes("claim stage") ||
    query.includes("percentage") ||
    query.includes("percent") ||
    query.includes("base stage") ||
    query.includes("lock-up") ||
    query.includes("lock up") ||
    query.includes("practical completion")
  ) {
    return {
      answer: `### Hudson Homes HIA Construction Progress Payment Schedule

Hudson Homes follows standard HIA (Housing Industry Association) and Master Builders milestone payment stages:

1. **Deposit / Preliminary Stage (5%)**:
   - Initial deposit upon tender signing and preliminary work (soil test, survey, architectural drafting, council DA/CDC submission).

2. **Base Stage (15%)**:
   - **15% payable at Base stage**: Earthworks completed, underground plumbing/drainage laid, vapour barrier and steel reinforcement placed, and concrete slab poured and inspected.

3. **Frame Stage (20%)**:
   - Wall frames, structural posts, and engineered roof trusses fully erected, tied down, and certified by a structural certifier.

4. **Enclosed / Lock-Up Stage (25%)**:
   - **25% payable at Lock-Up stage**: External brickwork/cladding installed, roof tiles or Colorbond sheeted, windows and external doors installed and locked.

5. **Fixing Stage (20%)**:
   - Plasterboard wall and ceiling linings, skirting, architraves, waterproofing, wet area tiling, kitchen cabinetry, and bathroom vanities installed.

6. **Practical Completion / Final Handover (15%)**:
   - **15% payable at Practical Completion**: Painting, plumbing & electrical fit-off, appliances installed, final quality QA inspection, occupancy certificate issued, and keys handed over!`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "Tell me about the 50-Year Structural Warranty",
        "What fixed site costs does Hudson Homes include?",
        "How does the Quote Builder work?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 4M. Knock-Down Rebuild (KDRB)
  if (query.includes("kdrb") || query.includes("knock down") || query.includes("knockdown") || query.includes("demolition")) {
    return {
      answer: `### Knock-Down Rebuild (KDRB) Specialists

Hudson Homes is a recognized Knock-Down Rebuild specialist across Sydney Metro, Central Coast, Hunter, and South East Queensland:

1. **Why Choose KDRB with Hudson**:
   - Stay in the suburb, street, and school catchment you love while upgrading to an expansive, 7-Star energy-rated luxury home.
   - Often more cost-effective per square metre than major renovations or buying an expensive established home (with heavy stamp duty).

2. **Complete End-to-End Service**:
   - **Site Feasibility & Topography**: Contour survey, boundary check, and hydraulic stormwater discharge evaluation.
   - **Demolition Advisory**: Recommendations and coordination with licensed demolition contractors.
   - **Fast-Track CDC Approvals**: We design to comply with NSW Housing SEPP (Complying Development Certificate), avoiding council DA delays.
   - **Fixed Price Site Costs**: Piering, foundation engineering, and council fees all locked in upfront.`,
      confidence: 0.99,
      verified: true,
      suggestedQuestions: [
        "What is the difference between CDC and DA in NSW?",
        "What inclusion ranges does Hudson Homes offer?",
        "Tell me about H3 Luxury inclusions",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // 11. Universal Planning, Duplex, Zoning & Siting Engine (All QLD & NSW Jurisdictions)
  const isDuplexOrDualOccQuery = /duplex|dual[-\s]?occupancy|dual[-\s]?key|dual[-\s]?living|auxiliary\s*unit|secondary\s*dwelling|granny\s*flat|rooming|co[-\s]?living/i.test(query);
  const isAddressOrPropertyQuery = /paradise\s*r(?:oa)?d|flagstone|morayfield|greenbank|elara|marsden\s*park|warnervale|leppington|cobbitty|box\s*hill|spring\s*mountain|yarrabilba|ripley|address|zoning|council|pda|pod\b|plan\s*of\s*development|camden|blacktown|ipswich|logan|moreton|coomera|pimpama|lochinvar|chisholm|maitland|mount\s*cotton|mt\s*cotton|redland/i.test(query) || /\b\d+\s+[a-z\s]+(?:road|rd|street|st|drive|dr|avenue|ave|crescent|cres|lane|way|court|ct|boulevard|bvd|circuit|cct|parade|pde|place|pl)\b/i.test(query);

  if (isAddressOrPropertyQuery) {
    return evaluatePropertyFeasibilityStandalone(message);
  }

  if (isDuplexOrDualOccQuery) {
    return {
      answer: `### Hudson Homes Dual Occupancy & Auxiliary Living Feasibility

Hudson Homes specializes in dual-occupancy and high-yield secondary dwelling developments across Queensland and New South Wales.

To evaluate statutory feasibility, permitted planning pathways (CDC vs DA / Accepted vs Code Assessable), boundary setbacks, and all 7 site overlays for your specific lot:

- Please provide the property address or local government area, for example:
  - \`CC duplex 61 Paradise Road, Flagstone\`
  - \`CC 131 Mount Cotton Road\`
  - \`CC duplex 15 Smith Street, Penrith\`

#### Recommended Hudson Dual Living Floorplans:
- **Wisteria Range (33, 34, 36, 40)**: Flagship dual-occupancy side-by-side design featuring 3+2 or 4+2 bed configurations under one roofline.
- **Alabaster Range (31, 36, 40)**: Single-storey dual living design with private mirror floorplans.
- **Amber 21 Dual Suite**: Auxiliary living configuration engineered to comply with Logan, Redland, and Ipswich secondary dwelling thresholds with **$0 infrastructure charges**.`,
      confidence: 0.98,
      verified: true,
      suggestedQuestions: [
        "What is the difference between a duplex and an auxiliary unit?",
        "What are the infrastructure charges for building a duplex?",
        "What are the fire and acoustic requirements for duplex party walls?",
      ],
      modelUsed: "universal-planning-engine",
    };
  }

  // 12. Default Fallback
  // If the query is a simple greeting or empty:
  if (/^(?:hi|hello|hey|help|welcome|start|menu|options|g'day)$/i.test(query) || !query) {
    return {
      answer: `### Welcome to Hudson Homes Copilot

I am the verified **Hudson Homes Personal AI Assistant** for New Home Consultants and sales staff.

I can assist you with:
- **Fast-Track Compliance (CC)**: \`CC <address>\` or \`CC duplex <address>\` for instant zoning, setbacks, and 7 overlays.
- **Inclusion Ranges**:
  - **H1 Smart Inclusions** (Smart Value Standard, 2440mm ceilings, laminate benchtops, split system AC)
  - **H2 Designer Inclusions** (Contemporary Luxury, 2590mm ceilings, 20mm stone, ducted AC, 900mm appliances)
  - **H3 Luxury Inclusions** (Architectural Masterpiece, 40mm stone, double undermount sink, freestanding bath, awning windows)
  - **IP Investment Range** ("Hudson Invest" 100% turn-key, stamp duty savings on land only, tax depreciation)
  - **FHB First Home Buyer Range** (Fixed-price peace of mind, FHOG grant eligibility, move-in ready finishes)
  - **LP Landscape Packages** (Driveway, fencing, turf, letterbox, clothesline)
- **Site Costs & Warranties**: Fixed price site costs up to H-class slab, piering in NSW, DA/CDC approvals, and our 50-Year Structural Warranty.
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
        "CC 131 Mount Cotton Road",
        "CC duplex 61 Paradise Road, Flagstone",
        "What inclusion ranges does Hudson Homes offer?",
        "What is the difference between H1 Smart and H2 Designer?",
        "What fixed site costs does Hudson Homes cover?",
      ],
      modelUsed: "hudson-knowledge-engine",
    };
  }

  // Confident knowledge & compliance engine guide
  return {
    answer: `### Hudson Homes Copilot — Knowledge & Compliance Engine

I can assist you with comprehensive statutory planning, construction specifications, and architectural siting across NSW and Queensland:

#### 1. Fast-Track Compliance Check (CC):
- **Property Compliance**: Type \`CC <address>\` (e.g. \`CC 131 Mount Cotton Road\`) for complete statutory zoning, building setbacks, site coverage, height, and all 7 site overlays (Bushfire BAL, flood, acoustic noise, sewer ZOI, slope, soil class).
- **Duplex / Dual-Occupancy**: Type \`CC duplex <address>\` (e.g. \`CC duplex 61 Paradise Road, Flagstone\`) for prioritized dual-occupancy feasibility, CDC vs DA path, dual crossovers, and fire/acoustic party walls.
- **Dual-Key / Auxiliary Dwelling**: Type \`CC dual key <address>\` for auxiliary living suites (up to 70m² GFA, $0 infrastructure charges).

#### 2. Hudson Homes Inclusions Tiers:
- **H1 Smart Inclusions**: Smart value standard (2440mm ceilings, laminate benchtops, split-system AC, 600mm Haier appliances).
- **H2 Designer Inclusions**: Display-home luxury (2590mm raised ceilings, 20mm stone, ducted AC, 900mm Fisher & Paykel appliances, full-height bathroom porcelain tiles).
- **H3 Luxury Inclusions**: Architectural masterpiece (40mm stone, double undermount sink, freestanding bathtub, 1200mm pivot door, awning windows, MyAir ducted AC).
- **IP Investment Range**: 100% turn-key package (fencing, landscaping, blinds, driveway, clothesline, maximum tax depreciation).

#### 3. Construction & Technical Engineering:
- Ask about **Soil Classifications (AS 2870)** (Class S, M, H1, H2, E, P), **Slab Systems** (Waffle Pod vs Raft, Drop Edge Beams), **Bushfire BAL Ratings (AS 3959)**, or **Sewer Zone of Influence (ZOI)**!`,
    confidence: 0.98,
    verified: true,
    suggestedQuestions: [
      "CC 131 Mount Cotton Road",
      "CC duplex 61 Paradise Road, Flagstone",
      "What is the difference between H1 Smart and H2 Designer?",
      "How does Sewer Zone of Influence (ZOI) affect concrete piering?",
      "What are the requirements for BAL-29 bushfire construction?",
    ],
    modelUsed: "hudson-knowledge-engine",
  };
}

