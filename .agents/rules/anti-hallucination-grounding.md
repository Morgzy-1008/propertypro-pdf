---
description: Strict anti-hallucination and empirical grounding guardrails for Hudson Homes quoting, CAD, pricing, and planning engines
---

# Anti-Hallucination & Empirical Grounding Guardrails

## 1. Architectural & Pricing Master Fidelity
All calculations, area schedules, and tender figures must derive from verified canonical sources:
- **Single/Double Storey Baselines**: Must match `HUDSON_STANDARD_AREAS`, `HUDSON_CAD_REGISTRY`, and official brochure schedules (`Azure 19` = 177.08 m² with 32.89 m² garage; `Carmine 23` = 215.19 m² with 32.89 m² garage).
- **Extension Rates**: Must strictly apply confirmed division price books (`H1`, `H2`, `H3` per spec tier). Never approximate square-meter rates.
- **Trade Credits**: Opening replacements (doors/windows) must enforce exact 80% trade credit calculations against standard allowances.

## 2. Dynamic State & Cache Reset Invariant
- Every execution of the modified floorplan recognition engine must start with clean state:
  - Invoke `clearLearnedFeatureMemory()`
  - Clear `pendingAnalysis` and `pendingCandidate`
  - Reset file input values
- Automated tests must prove that the engine computes variations dynamically from scratch for each file without relying on prior session artifacts.

## 3. Playwright Verification Standards
- Playwright scripts must inspect rendered component source text (e.g. `BaseDesignConfirmationModal.tsx`, `ModifiedPlanReviewModal.tsx`) to assert exact button and dialog labels.
- Automated tests must capture visual screenshots across all modal tabs (Structural Footprint, Internal Rooms, Openings, Inclusions) and verify net tender totals before certifying success.

## 4. In-App AI Knowledge Base Invariants
- The Hudson AI Copilot must never give apologetic refusals (*"I cannot answer with 100% confidence without registered plans..."*) when evaluated on properties or compliance checks.
- Ground all compliance, feasibility, and construction answers with NCC 2022 guidelines, Australian Standards (AS 2870, AS 3660.1, AS 3959, AS 1684), statutory planning schemes, and Hudson Homes inclusion specifications.
