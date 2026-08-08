# Hudson Homes Package Studio Agent Guidelines

This repository hosts the Hudson Homes House & Land Package Studio and Flyer Builder.

## Production Domain
- **Live URL**: https://www.hudsonhomeshouselandflyer.dev/flyer

## Architecture & Code Standards
- Framework: Vite + React + TanStack Start.
- Styling: TailwindCSS v4 with Hudson Homes brand tokens.
- Permanent Lifetime Caching: Native IndexedDB store (`PropertyProFacadeCacheDB`) for instant 0ms reload of outpainted facades across browser restarts.
- AI Outpainting: Google Gemini API integration for generating widescreen 2.69:1 facade renders with preserved architectural details.

# Global Rules
## Testing & Verification
- Whenever you implement or modify any UI feature, you must use the Playwright tool to open a browser, navigate to the relevant page, and take a screenshot before considering the task complete.
- Compare the visual result against the requirements. If something looks broken or incorrect, fix it and test again before reporting success.
- Never mark a UI task as finished without this visual verification step.

## Regression Prevention
- Before starting any new task, read the project-overview.md file located in the current project's own working directory (the folder this specific project is being built and saved in) to understand existing functionality.
- Before modifying any feature, read the specific relevant section(s) of project-overview.md (not just skim the whole file) - particularly the Features, Data Flow, and Architectural Decisions sections - to understand how the current code is intended to work before changing it.
- When making changes, identify what existing features might be affected by the change - not just the new feature being added.
- Use Playwright to explicitly verify that existing/neighboring features still work correctly after your change, in addition to testing the new one.
- If a planned change would contradict a documented architectural decision, flag this explicitly to the user before proceeding, rather than silently overriding it.

## Project Documentation
- After completing any feature or significant change, update the project-overview.md file located in the current project's own working directory with: what was built, how it works, and any important decisions made.
- When updating project-overview.md, also check whether any existing content is now outdated or inaccurate as a result of your change, and correct it - not just append new information.
- If a change affects data flow, state management, or a documented architectural decision, update those specific sections precisely, not just the feature list.
- Keep project-overview.md current at all times - treat it as the source of truth for what this specific project actually does.
- Always save and update project-overview.md in the same folder where this project's own files are being saved - never in a different project's folder or a shared location.

Why this matters: without it, the agent defaults to whatever's fastest, which usually means skipping testing and forgetting what it already built as the conversation gets long.
