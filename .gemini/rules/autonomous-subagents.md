# Autonomous Subagent Delegation Policy

## 1. Operating Context & Directive
The user has upgraded to the **Google AI Ultra plan (5x Quota)**. To maximize execution speed, quality, and prevent quota waste, Antigravity is authorized and instructed to **autonomously deploy background subagents** using `Model: "pro"` or `Model: "inherit"`.

## 2. Trigger Criteria for Autonomous Subagent Invocation
Antigravity should automatically invoke subagents when:
1. **Broad Architectural & Regulatory Research**:
   - Tasks requiring indexing, scanning, or synthesizing extensive council planning schemes (LEPs, DCPs, Priority Development Area schemes like EDQ Greater Flagstone, Ripley Valley, Yarrabilba), building codes (NCC 2022 / BCA), or developer design guidelines.
2. **Parallel Workstreams**:
   - When a task has multiple independent facets (e.g., frontend UI improvements + backend planning engine + test suite generation), launch specialized subagents to tackle each in parallel.
3. **Comprehensive Codebase & Performance Audits**:
   - Auditing complex subsystems, searching for memory leaks, checking accessibility (a11y), or analyzing large datasets.
4. **Context Preservation**:
   - Any exploration or investigation that would require reading more than 5 large files or generate heavy intermediate output should be delegated to a `research` or `self` subagent, returning a concise synthesis to the parent agent.

## 3. Subagent Execution Standards
- **Model Selection**: Always default to `pro` (or `inherit`) to ensure deep reasoning, exhaustive planning, and flawless syntax.
- **Structured Communication**: Subagent prompts must specify exact deliverables, schema types, and target files.
- **Asynchronous Flow**: When subagents are running in the background, Antigravity continues other active tasks or stops tool calls to wait for automatic notification.
- **Clean Artifacts**: Ensure all findings are saved to appropriate files or brain artifacts.
