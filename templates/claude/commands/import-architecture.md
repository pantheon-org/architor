Read `.arch/state.json` first.

**GATE CHECK:**
- If `current_phase` is not `not_started`, STOP: "Cannot import architecture. Current phase is [phase]. Import is only available at the start of a new project. Use /status to check progress."
- If `.arch/existing-architecture.md` does not exist, STOP: "No import document found. Run `arch-agent import <source-file>` from CLI first, then use this command."

Read `.arch/existing-architecture.md` — this is the existing architecture document to import.
Read `.arch/org-context.md` to check if organizational context is available.

## Import Mode — Fast-Track Review

You are importing an existing architecture document. Your job is to:
1. **Parse** the document into architecture sections
2. **Present** each section for review, applying your adversarial reviewer standards
3. **Progress** through all phases using the normal state machine
4. **Challenge** — flag gaps, outdated decisions, missing NFRs, and anti-patterns

The user can `/accept` phases they're happy with quickly, or `/refine` phases that need updates.

---

## Step 1: Parse the Document

Analyze the imported document and identify these sections (some may be missing):
- **Requirements / PRD content** — functional requirements, NFRs, constraints, assumptions
- **Architecture pattern** — monolith, microservices, event-driven, etc.
- **Component map** — system components and their boundaries
- **Cross-cutting decisions** — auth, observability, deployment, error handling, data management
- **Component designs** — detailed designs for individual components

If sections are missing, note them — you'll flag these as gaps in the appropriate phase.

## Step 2: Phase 1 — Evaluate as PRD Analysis

Present the extracted requirements as a Phase 1 evaluation:
- Extract functional requirements (FR-001, FR-002...) from the document
- Extract or infer non-functional requirements
- Identify gaps — what's missing from the existing design?
- Rate risks and overall design completeness
- **Be adversarial**: "Your existing document says [X], but doesn't address [Y]. What happens when [Z]?"

Write analysis to `.arch/phase1-evaluation.md`.
Also write extracted requirements to `.arch/prd.md` (overwrite the template).
Update `.arch/state.json`:
- `current_phase`: `"evaluation"`
- `phases.evaluation.status`: `"awaiting_acceptance"`
- `phases.evaluation.prd_loaded`: `true`
- `phases.evaluation.analysis_complete`: `true`

If org-context.md is not filled in, extract organizational context from the document (team size, tech stack, constraints) and write it to `.arch/org-context.md`. Note assumptions explicitly. Do NOT run the full discovery interview.

Present the evaluation and ask:
"I've extracted and evaluated the requirements from your existing architecture document. Review above. `/accept` to proceed to Phase 2A, or `/refine` with corrections."

**Wait for user response. Do not continue until user says /accept or /refine.**

## Step 3: Phase 2A — Review Architecture Pattern

After Phase 1 is accepted, present the extracted architecture pattern:
- Name the pattern identified in the document
- Evaluate whether the pattern still fits the requirements
- Flag any pattern/requirement mismatches
- Present alternatives if the pattern seems suboptimal
- **Be adversarial**: "This pattern was chosen [then]. Has anything changed? Is your team still [X]? Has scale changed?"

Write to `.arch/phase2-methodology.md`.
Update state: `current_phase` = `"methodology"`, `phases.methodology.status` = `"in_progress"`, `sub_phase` = `"pattern"`, `pattern_proposed` = `true`
Then set `phases.methodology.status` = `"awaiting_acceptance"`

Present and wait for `/accept` or `/refine`.

## Step 4: Phase 2B — Review Component Map

After Phase 2A is accepted, present the extracted component map:
- List all components from the document with responsibilities
- Challenge boundaries: "Is [X] doing too much? Should [Y] and [Z] be merged?"
- Flag missing components implied by requirements
- Validate dependencies between components
- Validate against the accepted pattern

Write to `.arch/phase2-components-overview.md`.
Update state: `sub_phase` = `"components_overview"`, `components_overview_proposed` = `true`, status = `"awaiting_acceptance"`

Present and wait for `/accept` or `/refine`.

## Step 5: Phase 2C — Review Cross-Cutting Decisions

After Phase 2B is accepted, present extracted cross-cutting decisions across 5 areas:

| Area | What to Extract |
|------|----------------|
| Auth | Authentication method, authorization model, token strategy |
| Observability | Logging format, metrics, tracing, alerting |
| Deployment | Infrastructure, CI/CD, environments |
| Error Handling | Retry strategy, circuit breakers, fallbacks |
| Data Management | Data ownership, consistency model, backup strategy |

For any area NOT covered in the imported document, propose decisions with rationale.
- **Be adversarial**: "Your document specifies [auth approach] but doesn't mention [service-to-service auth]. What's the plan?"

Write to `.arch/phase2-cross-cutting.md`.
Update state: `sub_phase` = `"cross_cutting"`, `cross_cutting_proposed` = `true`, status = `"awaiting_acceptance"`, populate `cross_cutting_decisions`

Present and wait for `/accept` or `/refine`.

## Step 6: Phase 3 — Review Component Designs

After Phase 2C is accepted (which transitions to Phase 3 via the `/accept` command):
- All components are initialized as `pending` in state.json (done by `/accept`)
- For each component in dependency order:
  1. Extract the existing design from the imported document
  2. Present it using the full 8-section design template:
     - Component Specification (name, role, bounded context)
     - Technology Recommendation (with version + alternatives)
     - Integration Specification (inputs, outputs, API contracts)
     - Scalability (approach, bottlenecks, data growth)
     - Security (auth, authz, sensitive data, attack surface)
     - Monitoring & Observability (metrics, alerting, logging, tracing)
     - Failure Modes (what happens when it fails, fallback, recovery)
     - Complexity Assessment (simple/moderate/complex)
  3. Fill in missing sections from context and cross-cutting decisions
  4. Check cross-cutting compliance (Phase 2C constraints)
  5. Check consistency with previously accepted components
  6. **Be adversarial**: flag gaps, outdated tech versions, missing failure modes
  7. Write to `.arch/components/[name].md`
  8. Wait for `/accept` or `/refine` before advancing to next component

After accepting each component, auto-advance to the next (same as normal Phase 3 flow).

## Import-Specific Guidance

Throughout the import review:
- Prefix observations from the imported document with **"From your existing document:"** so the user knows what was extracted vs. what you're adding
- When the document is silent on a topic: **"Your existing document doesn't address [topic]. Here's what I recommend:"**
- When the document contains something outdated: **"Your document specifies [tech v1.x]. Current stable is [v3.x]. Consider upgrading because [reason]."**
- When the document contradicts itself: flag explicitly with both references
- At the end of each phase, note extraction quality: how much was imported vs. newly proposed

$ARGUMENTS
