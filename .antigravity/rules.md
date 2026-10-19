# Workspace Rules — Hudson Homes | House & Land Package Flyer Builder

## DEFAULT OPERATING MODE: ALWAYS-ON AUTO-SHIP & SELF-HEALING PIPELINE

Every normal plain-English message from the user automatically executes this 5-stage pipeline as the standard default behavior (no slash commands required):

### Stage 1 — Automatic Prompt Expansion (Always Active by Default)
- Treat every casual, short, or 1-sentence plain-English message from the user (e.g., "fix this button", "update the header", "add a quote download") as a high-level goal that must be internally expanded into a complete Senior Full-Stack Engineering Specification before editing any files.
- Automatically scan the repository to locate all related components, hooks, state stores (`localStorage` / database), styles, and API routes so the implementation matches existing patterns and covers desktop/tablet/mobile responsiveness, loading states, empty states, and error fallbacks.

### Stage 2 — Direct Execution (Zero Unnecessary Mid-Task Review Briefs)
- Do NOT pause after auditing the codebase to output an "Engineering Review Brief" or ask for permission to proceed unless a destructive data deletion or paid external billing change requires confirmation.
- Move straight from Internal Spec Expansion → Codebase Audit → Code Implementation.

### Stage 3 — Internal 5-Pillar Lead Architect Critic Pass
Before finishing any turn where code was modified, run an internal Critic audit across these five pillars:
1. **UI, Layout & Typography Integrity**: Confirm zero text or descender clipping, zero overlapping elements or buttons, clean alignment axes, proper scroll containers, and high-contrast readable typography across desktop and mobile viewports.
2. **State, Data & API Resilience**: Verify that all async calls, AI endpoints, and form submissions validate schemas, handle errors gracefully, and persist state without breaking existing user data.
3. **Project Domain & Business Rules**: Preserve all established domain logic in the repo (such as quoting/estimating calculations, PDF/flyer print baselines, brand palettes, and architectural or 3D/2D rules).
4. **Pre-Deploy Build & Storage Hygiene Gate**: Run `npx tsc --noEmit` and `npm run build` automatically, verify zero TypeScript, import, SSR, or bundler errors, and avoid unreferenced asset bloat so every push to `main` deploys cleanly on Vercel.
5. **Live Browser & Console Verification**: Open the affected route in the local preview browser, test the interactive controls, and confirm zero runtime console errors or broken network requests.

### Stage 4 — Autonomous Self-Re-Prompting & Repair Loop (Up to 3 Cycles)
- If the Critic pass, `npx tsc --noEmit`, `npm run build`, or live browser verification detects any bug, visual defect, or build failure, do NOT stop and hand the error back to the user.
- Automatically feed the error trace or visual flaw back into the implementation loop, fix the root cause, and re-run the verification gates (up to 3 autonomous repair cycles) until 100% of checks pass.

### Stage 5 — Clean Final Summary
- Only report back to the user once the code is written, critiqued, compiled cleanly via `npm run build`, and verified in the browser.
