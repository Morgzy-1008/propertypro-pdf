# Hudson Homes PropertyPro — Comprehensive Session Handover & Context

**Generated**: 2026-08-31
**Active Repository**: `C:/Users/morga/.gemini/antigravity/scratch/propertypro-pdf`
**Primary Branch**: `main` (`https://github.com/Morgzy-1008/propertypro-pdf.git`)
**Active User Profile**: Morgan Hales (Senior New Home Consultant & System Admin, Flagstone Display Home, Hudson Homes Queensland)

---

## 1. Core Operating Rules & Principles (MANDATORY)

1. **Deployment & GitHub**:
   - Always commit and push directly to GitHub `main` and ensure Vercel deployments succeed.
   - **NEVER HARDCODE OR COMMIT API KEYS OR SECRETS** (GitHub Push Protection is enabled and will block pushes).
2. **Visual Verification via Playwright**:
   - Always verify UI, layout, pricing, or visual changes by running a fast, targeted Playwright script to capture screenshots before reporting back.
3. **Background Process Hygiene**:
   - Never leave hanging background tasks, loops, or long timers running. All scripts must set explicit timeouts, terminate cleanly, and call `process.exit(0)`.
4. **Efficiency & Fast Turns**:
   - Keep actions focused and execute within 5–10 minutes turnaround.

---

## 2. Facade Rendering & Storey Engine Architecture

### Exact Geometry & Framing Specifications:
- **Canvas Resolution**: `2400 × 937 px` (matches 210mm × 82mm flyer banner ratio = 2.56:1, `pxPerMm = 11.4268`).
- **Single Storey Framing (100% UNTOUCHED)**:
  - Roof Headroom: Strictly 5.0mm from top border (`~57px`).
  - House Grounding: Base of house sits ~20.0mm from bottom border (`~228px`).
  - Full-Bleed Scaling: `scale = Math.max(outW / srcW, targetHouseH / houseH)` ensures 100% natural, pristine full-bleed master render across the 2400px width.
- **Double Storey Framing (CALIBRATED TO SIT IN FRAME AESTHETICALLY)**:
  - Roof Headroom: Calibrated to ~4.5mm–6.0mm from top border (`~51px–68px`).
  - House Grounding: Base of house sits ~7.0mm–10.0mm from bottom border (`~80px–114px`).
  - House Scaling: `scale = Math.min(outW / srcW, targetHouseH / houseH)` scales the house back slightly so that both the roof apex and ground line sit inside the frame without crossing borders.
  - Natural Landscape Wings: Safe outer landscape columns (`[0, 10%]` and `[90%, 100%]`) fill the outer wings with soft 35px edge feathered blending, completely eliminating ghosted pillars or blurred boxes.
- **Engine File**: [`src/components/flyer/facadeEngine.ts`](file:///C:/Users/morga/.gemini/antigravity/scratch/propertypro-pdf/src/components/flyer/facadeEngine.ts) (`preframeFacadeImage`, `prepareFacade`, `enhanceImageCrispness`).

### Facade Catalogue & Lookup Routing:
- **Single Storey Aspen Fix**: `aspen` in `facades.data.ts` and `preRenderedFacades.data.ts` strictly maps to `/facades/aspen-facade-single-storey.jpg`, while `aspen-double` maps to `/facades/aspen-double-storey.png` and `aspen-single-garage` maps to `/facades/aspen-single-garage.png`.
- **Catalogue Files**:
  - [`src/components/flyer/facades.data.ts`](file:///C:/Users/morga/.gemini/antigravity/scratch/propertypro-pdf/src/components/flyer/facades.data.ts): 126 curated items with clean tags and categories.
  - [`src/components/flyer/preRenderedFacades.data.ts`](file:///C:/Users/morga/.gemini/antigravity/scratch/propertypro-pdf/src/components/flyer/preRenderedFacades.data.ts): Pre-rendered 4K/HD static mappings.
  - [`src/lib/quoting/facadeLookup.ts`](file:///C:/Users/morga/.gemini/antigravity/scratch/propertypro-pdf/src/lib/quoting/facadeLookup.ts): `findFacadeForDesign` strictly distinguishes:
    1. **Single Storey** (Standard Double Garage & Narrow Lot Single Garage).
    2. **Narrow Double Storey** (Carolinas, Turquoise, Sabel/Sable) $\rightarrow$ routes to narrow double garage renders.
    3. **Standard Double Storey** (Burgundy, Jasper, Sapphire, Emerald, Diamond, Onyx, Ruby, Aston, Opal, Topaz, etc.) $\rightarrow$ routes to standard 2-storey double garage renders.
    4. **Ranch / Acreage** (Classic Ranch, Eden Ranch, Hampton Ranch, Imperial, Metro, Statesman, Urban, Vogue).
    5. **Split Level Cobalt** (Classic Cobalt, Hamptons Cobalt, Infinity Cobalt, Vogue Cobalt).
    6. **Duplex & Dual Living** (Inside/Outside garage variants).
- **Updated Color Assets**: 152 color-updated master renders are stored in `public/facades/`.

---

## 3. Quoting Engine & System Features

1. **Master Price Lists**:
   - [`src/lib/pricelist.data.ts`](file:///C:/Users/morga/.gemini/antigravity/scratch/propertypro-pdf/src/lib/pricelist.data.ts): Contains official QLD price lists for Single Storey, Double Storey, Split Level, and Dual Living across H1, H2, H3 tiers.
   - [`src/components/flyer/facadePricing.ts`](file:///C:/Users/morga/.gemini/antigravity/scratch/propertypro-pdf/src/components/flyer/facadePricing.ts): Official 2026 facade upgrade pricing:
     - **Single Storey 2026** (Issued 23/7/26): Classic $0, Classic Plus $4.7k, Avoca/Bayside/Breeze/Crest/Executive/Harmony $7.2k, Banksia/Contemporary/Eden/Infinity/Majestic/Serenity $9.9k, Elite/Hamptons/Modern Coastal/Riviera/Savoy $15.3k, Aspen/Chateaux/Coastal/Hillsdale/Pavillion/Sovereign/Statesman $21.3k, Avalon/Havana/Newport $25.9k, Imperial/Merlot/Modern Barn/Modern Box/Modern Farmhouse/Nuvo/Regal/Vienna/Vogue $28.4k, Vibe/Visage $37.7k, Modern Classical Option A/B $41.9k.
     - **Double Storey 2026** (Issued 23/7/26): Classic $0, Classic Plus $5.9k, Breeze/Deco/Oxford/Windsor $12.3k, Allure/Novare $14k, Contemporary/Mantra/Marina/Majestic $16.3k, Ashton/Mondo/Vista $24.7k, Cambridge/Chateaux No Balcony/Monash $24.8k, Hamptons No Balcony $27.4k, Aspen/Madison/Modern Box/Modern Coastal/Mocha Hamptons No Balcony/Statesman $32.7k, Modern Barn $34.9k, Chateaux Balcony/Delta/Hamptons Balcony/Riviera/Sierra $38.9k, Deluxe/Grande/Royale/Saville $39k, Modern Farmhouse Option B $41.9k, Mocha Hamptons Balcony $44.4k, Modern Classical $50.9k, Ascot/Centro/Como/Flair/Meridian/Soho/Mocha Hamptons Premium/Vista Balcony $53.4k, Metro/Nuvo/Regal/Tempo/Vogue $53.5k, Reed $86.1k, Clarence $89.2k.
     - **Split Level 2026** (Issued 13/6/26): Classic $0, Eden $14.4k, Harmony $15.4k, Hamptons $21.5k, Chateaux $21.6k, Elite $21.6k, Infinity $27k, Nuvo $41k, Vogue $41.4k.
     - **Acreage / Ranch (Mulberry)**:
       - *Small (< 33 sq: Mulberry 22, 25, 28)*: Classic $0, Classic Plus $4.7k, Eden $29.4k, Statesman/Metro/Hamptons $57k, Urban/Imperial $66.5k, Vogue $158.9k.
       - *Large (>= 33 sq: Mulberry 33, 39)*: Classic $0, Classic Plus $4.7k, Eden $33.2k, Statesman/Metro/Hamptons $64.4k, Urban/Imperial $75.3k, Vogue $180.2k.
       - Integrated dynamically across Flyer Builder, Quoting System, Client Quote Review, and Tender Portal.
2. **Saved Estimates Modal**:
   - Master **"Select All ({count})" / "Deselect All"** toggle.
   - Bulk Action Toolbar with **"Delete Selected"** and **"Export JSON"**.
   - Storage persistence via `deleteQuotesAsync` and `deleteQuotes` in [`src/lib/quoting/quoteStorage.ts`](file:///C:/Users/morga/.gemini/antigravity/scratch/propertypro-pdf/src/lib/quoting/quoteStorage.ts).
3. **Step 2 House Design & Options**:
   - Landscaping package: default $28,900 for up to 450m² lot.
   - Exposed Aggregate Driveway: default 55m² @ $230/m² = $12,650.
   - Promotion Discounts automatically calculated by house floor area.
   - Modified floorplan custom room sizing and live pricing adjustments.
4. **PDF Generator & Tender Workflow**:
   - [`src/components/quoting/QuotePdfDocument.tsx`](file:///C:/Users/morga/.gemini/antigravity/scratch/propertypro-pdf/src/components/quoting/QuotePdfDocument.tsx): Full 5-page formal Builder's Estimate document with Page 3 full-width architectural facade banner.
   - Tender ATP request workflow and client review link portal.

---

## 4. Local Dev & Authentication

- **Dev Server**: Running on `http://localhost:5173`.
- **Morgan Hales Auth Session**:
  ```json
  {
    "id": "morgan-hales",
    "name": "Morgan Hales",
    "email": "morgan.hales@hudsonhomes.com.au",
    "phone": "0417 571 864",
    "title": "Senior New Home Consultant & System Admin",
    "displayCentre": "Flagstone Display Home",
    "role": "admin"
  }
  ```
  Set in `localStorage` under `hudson_hub_auth_user`, `hudson_auth_user`, and `hudson_hub_unlocked: "true"`.

---

## 5. Build Verification

- Run `npm.cmd run build` before committing. Expected build time: ~6–11 seconds, 0 errors.
