# Global Rules — All Projects

These rules apply to every project opened in Antigravity, regardless of what the app does or what stack it uses. Project-specific detail (button behaviour, menu structure, feature specs) does NOT belong here — it belongs in each project's own .agents/rules/rules.md. Keep this file stack-agnostic.

## 1. Testing & Verification (STRICTLY ENFORCED)
CRITICAL REQUIREMENT: Before writing the words "complete," "done," "fixed," "working," or "verified" anywhere in a response involving a UI change, you must have called a Playwright browser_* tool at least once in that same turn, and you must state which tool call you used and what it showed.
If no browser_* tool call appears in your tool trace for this turn, you are not permitted to use those words. Say the change is unverified instead.
Loading a page and confirming it renders without crashing is NOT verification. The browser_* call must actively test the specific behaviour being claimed — e.g. if the change affects an item's size when placed on a canvas, the verification must actually place that item and check its resulting dimensions, not just confirm the surrounding page loaded. State explicitly what specific action you performed and what specific result you observed, tied directly to the claim being made.
A task is categorically incomplete until you have used Playwright to confirm the change visually. Do not assume a change is correct just because the code was updated.
This applies to EVERY UI change, including minor text and colour tweaks — no change is too small to verify.
If Playwright verification is genuinely impossible for a specific backend-only task, you must explicitly state the technical reason it was skipped. Silently omitting the check is a failure.
Missing Tools & Verification Failure Protocol (STRICTLY PROACTIVE): If a required verification tool (e.g. Playwright browser MCP, test runner, or emulator) is NOT installed, NOT configured in the environment, or fails to execute:
1. Flag Upfront: You MUST state this explicitly at the very beginning of your response. Never bury or omit tool failures.
2. Unverified Status: Clearly mark the changes as [UNVERIFIED - Tool Unavailable/Failed] and describe the exact technical barrier (e.g., missing MCP server, subprocess timeout, missing binary).
3. Actionable Improvement: Proactively offer the exact steps or configuration to install/enable the missing capability so the user can continually improve Antigravity's setup.
Verified commit. The moment a change passes verification under this section, make a local git commit immediately — no need to ask permission first, since a local commit is free, reversible, and stays on this machine only. Label it clearly as verified, e.g. "Verified: [what was confirmed working]". This is a local save point, separate and distinct from pushing to GitHub, which still requires my explicit permission each time per the GitHub section below.

## 2. Regression Prevention
Before making any change, read the project's project-overview.md in full — specifically the section(s) relevant to the area being changed, not just a skim of the whole file.
Mandatory Read-Diff-Then-Edit sequence. Before changing any working code, follow this exact three-step sequence:
Read — read the specific section of project-overview.md relevant to the functionality being touched.
Identify — explicitly state how the requested change differs from the currently documented behaviour.
Edit strictly — make only the specific changes required to implement that difference, leaving everything else in that logic completely untouched. This is an explicit ban on rewriting or "cleaning up" surrounding code while executing a task.
Pre-refactor commits. Before touching any file governing core working logic (e.g. dimension/sizing logic, tool mappings, state management, or any other system the project documents as functional and depended-upon), commit a snapshot of the current state first — even if the task isn't finished. This is a rollback point, not a confirmation that the code is correct — you have not verified it works, you have only preserved it as it stood before making further changes. Use a commit message that makes this explicit, e.g. "Pre-change snapshot (unverified): before [task]" — never describe it as "working" or "stable" unless it has actually just passed verification per Section 1. This is separate from the end-of-session GitHub rule below, and separate from any deliberate, verified baseline/milestone commit made after a feature is confirmed working.
Strict scope boundary. Never rename, restructure, or refactor code in a file or function unrelated to the specific task you were asked to do. If completing a task requires touching something outside its immediate, isolated scope, STOP and flag it for explicit approval before proceeding — do not make the change unprompted.
Check for neighbouring or dependent features that could be affected by the change before making it.
Match existing conventions before inventing new ones. Before implementing any new item, tool, or feature, find how existing items of the same category are implemented — naming patterns, prefixes, file structure, data shape — and match them exactly. Do not invent a new naming or structural pattern when an established one already exists, even if the new pattern seems equally reasonable in isolation. If it's unclear whether a convention is a hard engine requirement or just a stylistic habit, search the codebase for how the engine/parser actually consumes existing items of that category before writing new code, and ask if still unclear.
If a requested change conflicts with an architectural decision or intended behaviour already documented in project-overview.md, flag the conflict explicitly and ask before proceeding — do not silently override documented decisions.
Pre-mortem in every implementation plan. Every implementation plan must include a section stating specifically how the proposed changes could break existing functionality — name the specific features, files, or flows genuinely at risk, or state explicitly "no existing functionality is at risk because [specific reason]." A generic reassurance ("we'll be careful not to break anything") does not satisfy this requirement.
Fix the root cause, not each symptom. When a bug shows up in more than one place, or could plausibly recur elsewhere, find and fix the single underlying cause rather than patching each visible symptom individually. If you're not sure whether something is a root cause or a symptom, say so in the plan rather than assuming a local patch is sufficient.

## 3. Documentation Discipline
project-overview.md records confirmed intent only. Never infer intent from code.
Follow this sequence whenever project-overview.md needs updating:
Source-check. Every behaviour described in project-overview.md must trace back to something I explicitly requested or confirmed. If you cannot point to a specific request for a given behaviour, do not write it as confirmed — mark it [Unconfirmed — inferred from code] instead of presenting a guess as fact.
Mismatch protocol. If the code doesn't match what's documented, do NOT edit the documentation to match the code. Instead, stop and flag it to me using exactly this format, then wait for my answer before changing either one:
⚠️ DISCREPANCY: Docs say [X]. Code currently does [Y]. Which is correct?
Update discipline. When you do update the document, correct outdated or now-inaccurate text directly — do not just append new notes on top of stale ones.
Housekeeping: project-overview.md always lives inside the project's own working directory, never in a shared or global location, and gets updated as part of finishing a task, not as an afterthought.

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
