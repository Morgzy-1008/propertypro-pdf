# Workspace Rules — Hudson Homes | House & Land Package Flyer Builder
These rules apply strictly to this project and supplement the global rules in GEMINI.md. Do not duplicate generic documentation or basic testing setup here — keep this file strictly focused on project architecture and execution guardrails.

## App Identity & Core Stack
Hudson Homes Flyer Builder is an automated real estate marketing platform that tracks vacant land stock and dynamically generates print-ready House & Land package flyers. Key architectural conventions:
- **Framework**: React / Next.js single-page application.
- **Flyer Generation**: High-resolution dynamic flyer rendering and PDF compilation via client-side libraries (e.g., html2canvas, @react-pdf/renderer, or jsPDF).
- **State Management**: Centralized database-driven state for land lots, package pricing, floor plans, and facade options.
- **Data Sources**: Live vacant land tracker, dynamic price calculation engines, and master asset storage (facade renders, floor plans, inclusions).

## Critical Directive: project-overview.md Is a Spec, Not a Log
`project-overview.md` defines how every calculation, land-matching rule, and flyer template is intended to work, based strictly on confirmed business logic — not just what the code currently does.

**Drift Protocol**: If code behavior differs from the specification:
- Do NOT rewrite `project-overview.md` to match unexpected or broken code behavior.
- Flag the exact discrepancy immediately, state what the documentation requires vs. what the code produces, and ask for confirmation before modifying either.
- Only update intended business logic when explicitly directed.

## UI & Engine Coverage Requirements
`project-overview.md` must maintain dedicated, itemized sections for core business functions:
- **Land Tracker & Filter Engine**: Rules for lot availability, zoning filters, frontage/depth minimums, and pricing logic.
- **Flyer Customizer / Template Builder**: Exact dimensions, print bleeds, typography constraints, dynamic asset positioning, and disclaimer text requirements.
- **Export & Automation Pipeline**: PDF export resolution, batch generation limits, and print-ready formatting standards.
- **Naming Conventions & Asset Rules**: Hardcoded prefixes, asset directory paths (facades, floor plans, logos), and calculation formulas must adhere to the Hard Engine Requirements in `project-overview.md`.

## Verification & Tool Failure Protocol
Verify logic and visual exports using available test runners or browser tools where available.

If a headless browser or verification tool fails or is unavailable in the execution environment:
- State the limitation in one concise sentence at the start of your response.
- Proceed immediately with direct code implementation.
- Do not stall execution, attempt repetitive retry loops, or generate long multi-step troubleshooting guides unless explicitly requested.

## Execution Speed & Anti-Lag Guidelines
To prevent long prompt delays and execution stalls:
- **Short Timeouts**: Playwright and browser scripts must use strict 3-5 second timeouts (`timeout: 3000`), never 30-second default hangs.
- **Focused Verification**: Verify only the specific modified feature/facade rather than running redundant 10-stage test loops on every prompt.
- **No Lingering Background Tasks**: Always terminate background test processes after execution. Never leave orphan processes accumulating.
- **Modular Code**: Keep source files clean and under 800 lines to avoid slow file-editing operations and syntax re-tries.

## Facade Engine Code Freeze (CRITICAL GUARDRAIL)
- **STRICTLY LOCKED**: `src/components/flyer/facadeEngine.ts`, `src/components/flyer/preRenderedFacades.data.ts`, and `src/components/flyer/facadeLibrary.ts` are 100% frozen and locked.
- Under NO circumstances should any styling, refactoring, or website UI changes touch or modify the facade outpainting, bounding box detection, or scaling algorithms unless the user explicitly requests changes to that specific function.

## Terminology
Use internal Hudson Homes terminology consistently across all documentation and comments (e.g., "Lot Matrix", "Facade Tier", "Turnkey Inclusions", "Print-Ready PDF"). Do not substitute alternative naming conventions.
