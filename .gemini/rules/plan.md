# /plan Command Directive

Whenever the user's prompt begins with or includes `/plan`, enforce the following mandatory execution rules:

## 1. Zero Action Phase (Do NOT Modify Code)
- **DO NOT** make any source code modifications, file edits, git commits, or live deployments.
- Perform thorough research and codebase inspection using read-only search and view tools to understand all technical dependencies, schemas, and architectural implications.

## 2. Exhaustive Implementation Plan Creation
- Create or update the `implementation_plan.md` artifact in the active conversation brain folder.
- **Evaluate Every Possible Outcome & Technical Option**: Compare alternative architectural approaches, tradeoffs, edge cases, visual impact, performance, and long-term maintainability.
- **MANDATE**: **NEVER choose the easiest, simplest, or quickest option**. Always select and design the **BEST, highest-quality, state-of-the-art production solution**.

## 3. Mandatory Clarification (Zero Ambiguity)
- If you are even **1% unsure** about any requirement, user preference, visual design, layout boundary, edge case, or intent:
  - Include clear, direct questions under the `## Open Questions` section of the implementation plan.
  - Present explicit options or ask for clarification before proceeding to any code changes.

## 4. Formal Review & User Approval
- Set `request_feedback = true` and `user_facing = true` in the `implementation_plan.md` artifact metadata so the interactive review modal is presented to the user.
- **STOP and WAIT** for the user's explicit approval before taking any action.
