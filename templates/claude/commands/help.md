Read `.arch/state.json` to determine current phase.

Display available commands and contextual guidance:

```
ARCHITECTURE AGENT — COMMAND REFERENCE

WORKFLOW COMMANDS:
  /analyze-prd            Phase 1: Evaluate the PRD
  /propose-methodology    Phase 2: Architecture pattern (2A), components (2B), cross-cutting (2C)
  /design-component [n]   Phase 3: Design a specific component in detail
  /generate-docs          Phase 4: Validate and generate final architecture document
  /import-architecture    Import and review existing architecture document

DECISION COMMANDS:
  /accept                 Accept current proposal (phase, sub-phase, or component)
  /refine [feedback]      Request changes to current proposal
  /alternative [request]  Request a completely different approach
  /reopen [target] [why]  Reopen accepted phase/component (max 2 per project)

REVIEW COMMANDS:
  /review-component [n]   Launch adversarial review of a component
  /decision-log [filter]  Show all decisions (optional: filter by topic)
  /status                 Show current project state and progress

SETUP:
  /help                   Show this reference
```

Then based on current phase, show contextual guidance:

**If not_started:** "Start by placing your PRD in `.arch/prd.md` and optionally filling out `.arch/org-context.md`. Then run `/analyze-prd`. If org-context is empty, the agent will interview you. If you have an existing architecture document, run `arch-agent import <file>` from CLI first, then use `/import-architecture`."

**If evaluation:** "You're in Phase 1. Review the PRD analysis and either `/accept`, `/refine`, or provide answers to gap questions."

**If methodology:** Check sub-phase state:
- If pattern not accepted: "You're in Phase 2A (Pattern). Review the architecture pattern. `/accept` to proceed to 2B, or `/refine` / `/alternative`."
- If pattern accepted but components_overview not accepted: "You're in Phase 2B (Component Map). Review the component overview. `/accept` to proceed to 2C, or `/refine`."
- If components_overview accepted but cross_cutting not accepted: "You're in Phase 2C (Cross-Cutting). Review the cross-cutting decisions. `/accept` to proceed to Phase 3, or `/refine`."

**If components:** "You're in Phase 3, designing components one at a time. Use `/design-component`, `/review-component`, `/accept`, or `/refine`. Use `/reopen` if a late discovery requires changing an accepted component."

**If finalization:** "You're in Phase 4. Review the generated document. `/accept` to complete, or request revisions."

$ARGUMENTS
