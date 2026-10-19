# Global Rules — All Projects
These rules apply to every project opened in Antigravity, regardless of what the app does or what stack it uses. Project-specific detail (button behaviour, menu structure, feature specs) does NOT belong here — it belongs in each project's own .agents/rules/rules.md. Keep this file stack-agnostic.

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

## 1. Testing & Verification (STRICTLY ENFORCED)
CRITICAL REQUIREMENT: Before writing the words "complete," "done," "fixed," "working," or "verified" anywhere in a response involving a UI change, you must have called a Playwright browser_* tool at least once in that same turn, and you must state which tool call you used and what it showed.
If no browser_* tool call appears in your tool trace for this turn, you are not permitted to use those words. Say the change is unverified instead.
Loading a page and confirming it renders without crashing is NOT verification. The browser_* call must actively test the specific behaviour being claimed — e.g. if the change affects an item's size when placed on a canvas, the verification must actually place that item and check its resulting dimensions, not just confirm the surrounding page loaded. State explicitly what specific action you performed and what specific result you observed, tied directly to the claim being made.
A task is categorically incomplete until you have used Playwright to confirm the change visually. Do not assume a change is correct just because the code was updated.
This applies to EVERY UI change, including minor text and colour tweaks — no change is too small to verify.
If Playwright verification is genuinely impossible for a specific backend-only task, you must explicitly state the technical reason it was skipped. Silently omitting the check is a failure.
Verified commit. The moment a change passes verification under this section, make a local git commit immediately — no need to ask permission first, since a local commit is free, reversible, and stays on this machine only. Label it clearly as verified, e.g. "Verified: [what was confirmed working]". This is a local save point, separate and distinct from pushing to GitHub, which still requires my explicit permission each time per the GitHub section below.

## 2. Regression Prevention
Before making any change, read the project's project-overview.md in full — specifically the section(s) relevant to the area being changed, not just a skim of the whole file.
Mandatory Read-Diff-Then-Edit sequence. Before changing any working code, follow this exact three-step sequence:
- **Read** — read the specific section of project-overview.md relevant to the functionality being touched.
- **Identify** — explicitly state how the requested change differs from the currently documented behaviour.
- **Edit strictly** — make only the specific changes required to implement that difference, leaving everything else in that logic completely untouched. This is an explicit ban on rewriting or "cleaning up" surrounding code while executing a task.
- **Pre-refactor commits**. Before touching any file governing core working logic (e.g. dimension/sizing logic, tool mappings, state management, or any other system the project documents as functional and depended-upon), commit a snapshot of the current state first — even if the task isn't finished. This is a rollback point, not a confirmation that the code is correct — you have not verified it works, you have only preserved it as it stood before making further changes. Use a commit message that makes this explicit, e.g. "Pre-change snapshot (unverified): before [task]" — never describe it as "working" or "stable" unless it has actually just passed verification per Section 1. This is separate from the end-of-session GitHub rule below, and separate from any deliberate, verified baseline/milestone commit made after a feature is confirmed working.
- **Strict scope boundary**. Never rename, restructure, or refactor code in a file or function unrelated to the specific task you were asked to do. If completing a task requires touching something outside its immediate, isolated scope, STOP and flag it for explicit approval before proceeding — do not make the change unprompted.
- **Check for neighbouring or dependent features** that could be affected by the change before making it.
- **Match existing conventions before inventing new ones**. Before implementing any new item, tool, or feature, find how existing items of the same category are implemented — naming patterns, prefixes, file structure, data shape — and match them exactly. Do not invent a new naming or structural pattern when an established one already exists, even if the new pattern seems equally reasonable in isolation. If it's unclear whether a convention is a hard engine requirement or just a stylistic habit, search the codebase for how the engine/parser actually consumes existing items of that category before writing new code, and ask if still unclear.
- **If a requested change conflicts with an architectural decision** or intended behaviour already documented in project-overview.md, flag the conflict explicitly and ask before proceeding — do not silently override documented decisions.
- **Pre-mortem in every implementation plan**. Every implementation plan must include a section stating specifically how the proposed changes could break existing functionality — name the specific features, files, or flows genuinely at risk, or state explicitly "no existing functionality is at risk because [specific reason]." A generic reassurance ("we'll be careful not to break anything") does not satisfy this requirement.
- **Fix the root cause, not each symptom**. When a bug shows up in more than one place, or could plausibly recur elsewhere, find and fix the single underlying cause rather than patching each visible symptom individually. If you're not sure whether something is a root cause or a symptom, say so in the plan rather than assuming a local patch is sufficient.

## 3. Documentation Discipline
project-overview.md records confirmed intent only. Never infer intent from code.
Follow this sequence whenever project-overview.md needs updating:
- **Source-check**. Every behaviour described in project-overview.md must trace back to something I explicitly requested or confirmed. If you cannot point to a specific request for a given behaviour, do not write it as confirmed — mark it [Unconfirmed — inferred from code] instead of presenting a guess as fact.
- **Mismatch protocol**. If the code doesn't match what's documented, do NOT edit the documentation to match the code. Instead, stop and flag it to me using exactly this format, then wait for my answer before changing either one:
  ⚠️ DISCREPANCY: Docs say [X]. Code currently does [Y]. Which is correct?
- **Update discipline**. When you do update the document, correct outdated or now-inaccurate text directly — do not just append new notes on top of stale ones.
- **Housekeeping**: project-overview.md always lives inside the project's own working directory, never in a shared or global location, and gets updated as part of finishing a task, not as an afterthought.

## 4. General Working Standards
All deliverables should be presented as finished work — no draft language, placeholders, or "TODO" markers left in final output unless explicitly asked for.
When uncertain about intended behaviour or requirements, ask rather than guess — especially before making changes to existing, working features.

## 5. GitHub
At the end of any major feature implementation or when wrapping up a coding session, ask me if I would like you to commit and push the latest updates to GitHub.
This is in addition to, not a replacement for, the pre-refactor commit requirement in Section 2 above.
Ask before every individual commit/push, not just once per session or feature. One "yes" does not carry forward as blanket permission for subsequent commits/pushes — confirm each one separately.

## 6. File Size & Refactor Discipline
If a file you're working in exceeds roughly 800–1000 lines, or is clearly doing several distinct jobs at once (e.g. state, rendering, interaction handling, and UI overlays all mixed into one file), flag this to me proactively as a refactor candidate — don't wait until it becomes a token-usage problem before mentioning it.
When a refactor is approved, relocate existing code as-is — cut and paste into new files, updating only imports/exports as needed. Do not regenerate, rewrite, or reimplement logic from scratch during a refactor, even if you believe your version would be cleaner. If you believe part of the code genuinely needs to be rewritten rather than just moved, stop and flag it specifically before doing so — do not fold a rewrite into a move without being asked.
Large refactors must be done in sequenced, individually-verified steps — lowest-risk pieces first — not as a single big-bang change. Verify and commit after each step before starting the next.

## 7. No Idle Polling Loops
Once a task is genuinely complete, end your turn. Do not use scheduling, task-management, or recurring-check tools (e.g. schedule, manage_task) to keep yourself "standing by" or checking in at intervals while waiting for my reply.
A finished turn with no further action needed costs nothing while it sits idle. A loop that re-runs a command and generates a new "still standing by" message every cycle costs real tokens for zero added value, every single cycle, indefinitely, until manually stopped.
If you are unsure whether a task is fully finished, say so explicitly and end your turn — do not create a recurring task to "keep checking" as a substitute for either finishing the verification now or asking me a direct question.

## 8. Anti-Hallucination & Empirical Grounding Invariant
CRITICAL REQUIREMENT: You must NEVER invent, assume, or guess facts, data, specs, or UI states. All development must be strictly grounded in empirical evidence and canonical sources.

1. **Canonical Data Sources Only**:
   - Never hardcode or assume architectural specs, dimensions, areas, pricing rates, or business rules from memory.
   - Always read and ground directly in the codebase's canonical master files (`pricelist.data.ts`, `quoteCatalogue.ts`, CAD registries, official brochures, and statutory planning schemes).
   - If an official spec or baseline is missing or contradictory, STOP and check the brochure/CAD registry or flag the exact discrepancy to the user.

2. **Clean-Slate & Dynamic Memory Isolation**:
   - When developing or testing dynamic recognition tools, parsers, or quoting engines, NEVER allow residual cache or previous run memory to carry over.
   - Always ensure state is dynamically cleared/isolated (`clearLearnedFeatureMemory()`, fresh browser sessions, wiped localStorage) so features are proven to work dynamically on arbitrary new inputs, not just pre-cached test cases.

3. **Zero Test Selector Hallucination**:
   - Never guess button text, modal titles, or DOM selectors in automated Playwright or unit test scripts.
   - Always inspect the actual component JSX/TSX first to match exact strings, attributes, and element hierarchies before writing or running tests.

4. **Empirical Visual Verification**:
   - Code changes to layout, modals, colors, or workflows are categorically unverified until an actual browser test executes, navigates, interacts, and captures screenshots confirming the intended result.
   - Never report a feature as "working," "fixed," or "complete" without inspecting the captured screenshot or test output.

5. **In-App AI Grounding**:
   - Any AI assistant or generative feature built into the app must be strictly grounded with deterministic registries, master specifications, and authoritative statutory data.
   - In-app agents must never provide fabricated estimates, hallucinations, or apologetic refusals ("cannot answer with 100% confidence")—they must provide authoritative, grounded answers or transparently cite statutory authority constraints.

## 9. Proactive Progress Updates, Subagent Monitoring & Queue Flushing
1. **10-Minute Heartbeat Updates & Turn-Yielding**:
   - Whenever working on a task that requires multi-step implementation, long-running background tasks, or subagent delegation, proactively provide a concise progress update every 10 minutes.
   - Use the `schedule` tool with `DurationSeconds=600` (10 minutes) during extended executions so status notifications fire reliably.
   - **CRITICAL Turn-Yielding Rule**: When the 10-minute timer notification fires, you MUST NOT simply call another tool and continue silently. You MUST:
     1. Post a visible, user-facing markdown progress update in chat detailing:
        - ⏱️ **Elapsed Time & Milestones**: What was completed in the last 10 minutes.
        - 🔨 **Current Focus**: What file, component, or test is actively being worked on.
        - 📋 **Next Step**: What the immediate next action is.
     2. Set a 5-second self-continuation timer using `schedule(DurationSeconds=5, Prompt="Resume task: [next step]", TimerCondition="any")`.
     3. **Immediately END your turn with NO further tools called in that step.**
   - **Why Turn-Yielding is Mandatory**: In Antigravity, user messages typed while tools are running are held in a queue. Queued messages are ONLY released and delivered into context when an agent yields its turn. Yielding every 10 minutes guarantees that:
     a) The user visibly receives their 10-minute progress update in the chat window.
     b) Any queued messages from the user are immediately dequeued and processed without delay.
     c) If no user message was queued, the 5-second timer fires, and you resume execution smoothly on the subsequent turn (re-arming the 10-minute heartbeat with `schedule(DurationSeconds=600)`).
2. **Subagent Supervision**: Actively check on running subagents (using `manage_subagents` and inspecting transcripts/tasks) to ensure they remain on track, adhere strictly to user constraints, and make tangible progress without stalling.

## 10. Automated High-Reasoning Validation Cadence (Every 5 Prompts)
MANDATORY CADENCE: On every 5 prompts received from the user, the agent MUST automatically trigger a comprehensive validation audit using a high-reasoning subagent (`Model: 'pro'`).
1. **Prompt Counting & Persistence**:
   - Maintain and inspect `<appDataDir>/brain/<conversation-id>/scratch/prompt_audit_tracker.json` on each prompt.
   - Increment `total_prompts` and `prompts_since_last_audit`.
2. **Automated Audit Trigger (Cadence = 5 Prompts)**:
   - When `prompts_since_last_audit >= 5`:
     - Automatically invoke `high_reasoning_validator` using `invoke_subagent` with `Model: 'pro'`.
     - The validator subagent thoroughly audits:
       a) All git commits and changes made over the last 5 prompts via `git log -n 5 --stat` and `git diff`.
       b) Build integrity: runs `npm run build` to verify 0 compiler errors.
       c) Empirical visual verification: runs Playwright browser scripts to inspect modified UI and captured screenshots.
       d) Zero hallucinations or regressions in business logic, pricing, or catalog rules.
     - Reset `prompts_since_last_audit` to 0 and record the audit timestamp and scorecard.
3. **Validation Scorecard Presentation**:
   - Present the validator subagent's structured scorecard in the user-facing response with full transparency.
