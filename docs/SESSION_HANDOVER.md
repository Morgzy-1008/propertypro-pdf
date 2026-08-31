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
- **Roof Headroom**: Roof apex must sit **strictly 5.0mm from the top photo border** (`~57px`).
- **House Grounding**: Base of house structure sits **~20.0mm from bottom border** (`~228px` for Single Storey, `~137px` for Double Storey).
- **Full-Bleed Scaling**: `scale = Math.max(outW / srcW, targetHouseH / houseH)` ensures 100% full-bleed coverage across 2400px width with 0 empty wings, 0 blurred mirror reflections, and 0 duplicate slices.
- **Engine File**: [`src/components/flyer/facadeEngine.ts`](file:///C:/Users/morga/.gemini/antigravity/scratch/propertypro-pdf/src/components/flyer/facadeEngine.ts) (`preframeFacadeImage`, `prepareFacade`, `enhanceImageCrispness`).

### Facade Catalogue & Lookup Routing:
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
   - [`src/components/flyer/facadePricing.ts`](file:///C:/Users/morga/.gemini/antigravity/scratch/propertypro-pdf/src/components/flyer/facadePricing.ts): Official facade upgrade pricing.
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
