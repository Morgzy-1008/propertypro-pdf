# PropertyPro PDF Flyer & Database App
## Project Overview

**PropertyPro** is a modern web application designed specifically for Hudson Homes New Home Consultants (NHCs) in QLD. Its primary purpose is to serve as a comprehensive CRM for tracking House & Land (H&L) opportunities and an automated, high-quality PDF flyer generator.

### Overall Goal
To provide a flawless, effortless experience for consultants to create H&L packages and seamlessly track available opportunities in the database. The system aims to automate manual tasks wherever possible. Crucially, the generated PDF flyers must always look perfect, high-quality, and professional. 

*Anti-gravity (AI Assistant) Directive:* Always proactively recommend changes and add ideas to make the website better and more automated, while keeping operational costs and API usage in mind.

---

## Screens & Routing
The app utilizes TanStack Router for fast client-side navigation.

1. **`/auth`** & **`/reset-password`**: 
   - Handles user authentication (Login, Signup, Password Recovery) via Supabase Auth.
2. **`/` (Home/Index)**: 
   - The landing dashboard for authenticated consultants.
3. **`/_authenticated/database`**: 
   - The main House & Land CRM interface. 
   - Displays a live, interactive data grid of available land lots and H&L packages. 
   - Used to track lot statuses (Available, On Hold, Sold, NHC Exclusive), developer details, pricing, and deadlines.
4. **`/_authenticated/flyer`**: 
   - The Flyer Builder interface. 
   - Allows consultants to select a house design, upload a floorplan, set pricing, and customize package details.
   - Outputs a print-ready, high-resolution PDF flyer for clients.
5. **`/_authenticated/browse`** & **`/_authenticated/package`**:
   - Interfaces for browsing available packages visually and editing individual package details.

---

## Major Features & Buttons

- **Add Lot / Add Package (Database)**: Quickly ingest new land opportunities or construct new H&L packages directly into the Supabase database.
- **Status Pills (Database)**: Visual indicators for the state of a lot/package (e.g., Green for Available, Red for Sold).
- **AI Facade Outpainting (Flyer Builder)**: Uses the Google Gemini API to automatically expand standard 3:2 or 4:3 house facade renders into ultra-wide 2.69:1 widescreen banners. It intelligently generates seamless landscaping, sky, and driveways without altering the architecture of the house.
- **Smart Floorplan Cropping (Flyer Builder)**: Automatically processes uploaded floorplan PDFs or images using HTML5 Canvas to trim white space, remove borders, and sharpen line art for perfect printing.
- **Generate PDF (Flyer Builder)**: Compiles all the data (facade, floorplan, pricing, inclusions) into a polished, branded PDF document.
- **Developer Tracking**: Manages developer contacts and automatically remembers them for future lot entries.

---

## Data Flow & State Management

1. **Backend (Supabase)**:
   - Acts as the single source of truth for Lots, Packages, Users, and globally cached AI renders.
   - Provides real-time synchronization and Row Level Security (RLS) for data protection.
2. **Image Processing (Client-Side)**:
   - Heavy image manipulations (resizing, cropping, unsharp masking, compositing) are done *entirely* in the browser using the HTML5 Canvas API. This architectural choice eliminates the need for expensive backend image processing servers.
3. **AI Generation (Gemini API)**:
   - Base64 encoded images are sent to the Gemini API (`gemini-flash-latest` or `gemini-pro-latest`) with strict bounding box calculations to ensure the house structure is 100% preserved while the background is synthesized.
4. **Caching Strategy**:
   - **IndexedDB & localStorage**: AI-generated widescreen facades are permanently saved to the user's local browser to eliminate redundant API calls and speed up flyer generation.
   - **Supabase Global Cache**: Once an AI facade is generated, it is saved to the `facade_renders` table (`_v3` marker) so that other consultants (or new devices) can instantly load the completed render without paying the API cost again.

---

## Key Architectural Decisions

- **Vite + React + TailwindCSS + Shadcn UI**: Chosen for rapid UI development, optimal performance, and a highly polished, modern aesthetic.
- **Client-Side Heavy Architecture**: Offloading PDF generation (`jspdf` or similar) and Image/Canvas processing to the client's device saves massive amounts of server compute and bandwidth.
- **Aggressive Caching**: To mitigate the latency and cost of generative AI, the system aggressively caches the expensive AI outpainting results both locally (IndexedDB) and globally (Supabase).
- **Strict Modality Enforcements**: The Gemini API is strictly configured to only output the `IMAGE` modality (`responseModalities: ["IMAGE"]`) to prevent textual hallucinations from breaking the image pipeline.

# AI Facade Cache & Generation

**CRITICAL RULE: DO NOT MODIFY THE FACADE AI GENERATION LOGIC OR PROMPT.**
The AI outpainting logic in `src/components/flyer/fileToImage.ts` is perfectly tuned and must remain untouched in future iterations. 

- **Model Required**: It strictly uses `gemini-3.1-flash-image` because it is the only supported model that correctly handles the `responseModalities: ["IMAGE"]` configuration. Do not attempt to use `gemini-2.0-flash` or `gemini-pro-latest` for outpainting as they will throw 400 Bad Request errors.
- **Caching**: Facades are dynamically outpainted to widen them for the flyer landscape aspect ratio. The resulting base64 image is heavily cached in both local IndexedDB (browser) and Supabase (`facade_renders` table).
- **Cache Tag**: The cache is globally tagged with the `::AI_OUTPAINT_V3::` marker and includes length validation to avoid blank or corrupted strings breaking the flyer render.
- **Re-do AI**: A 'Re-do AI' feature allows forcing a cache-bust and regeneration.

### LOCKED AI Prompt for Facade Generation:
```text
I have provided an image of a house placed on a white widescreen canvas. Your job is to outpaint the white space to create ONE seamless, ultra-high-resolution, and photorealistic environment across the ENTIRE widescreen image.

CRITICAL INSTRUCTION: Master Lighting and Atmosphere. The entire scene must be rendered with an expansive, bright, and soft natural daylight. Imagine a perfectly clear day with soft, non-directional light that makes the colors vibrant and clean. The new extended sky must be a soft, luminous, light blue.

You must make the new landscaping, sky, driveway, and environment look exactly like a natural extension of the original facade, but with increased overall brightness and luminosity. The original facade itself should remain consistent, but the new lighting should make the textures (brickwork, glass, concrete) look exceptionally clean, crisp, and high-detail.

CRITICAL: Symmetry and Balance. The new landscaping MUST be visually balanced and consistent on BOTH the left and right sides of the house. Lawns should stretch symmetrically, and pathways should flow naturally into the driveway.

NEW REQUIREMENT: Texture Superiority. The landscaping must show individual blades of lush green grass and detailed, clean garden plants. The extended driveway should have ultra-sharp concrete or aggregate texture.

Preserve the architecture, proportions, size, and colors of the house itself EXACTLY as provided. Do not alter the building.

Do NOT add fences, walls, or large trees that block the house.

CRITICAL: Sharp Focus. Do NOT apply any background blur, depth-of-field blur, or vignetting. The entire image MUST BE 100% SHARP, CRISP, AND IN PERFECT FOCUS THROUGHOUT.

QUALITY DIRECTIVES: Render with high-resolution textures, clean lines, and an aesthetic that emphasizes a high-end, professionally photographed real estate listing. Avoid flat lighting. keep everything hyper realistic.
```