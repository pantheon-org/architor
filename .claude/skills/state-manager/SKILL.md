---
name: state-manager
description: Manages architecture project state in .arch/state.json and .arch/decisions.md. Use when reading or updating project phase state, checking architecture status or project progress, asking "what phase are we in", tracking component acceptance, recording or logging decisions, or validating phase transitions.
---

# State Manager

## State File: `.arch/state.json`

This file is the single source of truth for project progress. ALWAYS read it before responding to any architecture query. NEVER rely on conversation memory for phase state. ALWAYS update it after every state change.

### Reading State
- Parse the JSON file
- Check `current_phase` to know where we are
- Check phase-specific status fields for detail
- For Phase 2, check `sub_phase` and individual acceptance flags (pattern_accepted, components_overview_accepted, cross_cutting_accepted)
- For Phase 3, check `components` object for per-component status
- Check `reopens.count` and `reopens.max` for reopen availability

**Example – read state (pseudocode; use the Read tool, not code execution):**
```
state = Read(".arch/state.json") → parse JSON
current_phase = state["current_phase"]
```

### Valid Phase Transitions
```
not_started → evaluation     (when /analyze-prd runs)
evaluation → methodology     (when Phase 1 is accepted)
methodology → components     (when Phase 2 is fully accepted: pattern + components + cross-cutting)
components → finalization    (when ALL components accepted)
```

Backward transitions are only allowed via /reopen (max 2 per project).

### Phase 2 Sub-Phases
```
pattern → components_overview → cross_cutting
```
Each sub-phase is accepted independently via /accept. All three must be accepted for Phase 2 to be complete.

### Component Status Values
```
pending → in_progress        (when /design-component starts)
in_progress → awaiting_acceptance  (when design is presented)
awaiting_acceptance → accepted     (when user accepts)
awaiting_acceptance → in_progress  (when user refines)
needs-review → in_progress         (after a reopen cascades)
```

### Updating State
When updating state.json:
1. Read current state
2. Validate the transition is legal
3. Write the updated state
4. Increment `decision_count` if a decision was made

**Example – validate and write state (pseudocode; use Read/Write tools, not code execution):**
```
VALID_TRANSITIONS = {
  "not_started" → ["evaluation"],
  "evaluation"  → ["methodology"],
  "methodology" → ["components"],
  "components"  → ["finalization"],
}

state = Read(".arch/state.json") → parse JSON
current = state["current_phase"]

if new_phase not in VALID_TRANSITIONS[current]:
  # Invalid transition: do NOT write state.
  # Report the error to the user and stop.
  raise error: "Invalid transition: '{current}' → '{new_phase}'"

state["current_phase"] = new_phase
state["decision_count"] += 1
Write(".arch/state.json", JSON.stringify(state, indent=2))
```

**If validation fails:**
- Do not write any changes to `state.json`.
- Inform the user of the current phase and the valid next transitions.
- If a backward transition is needed, direct the user to use `/reopen` (subject to `reopens.count < reopens.max`).
- Log a warning entry in `decisions.md` under category `Process` if the invalid attempt was user-initiated.

## Decision Log: `.arch/decisions.md`

Append-only file. Never edit previous entries. Format:

```markdown
### [DEC-NNN] Phase X | Category
- **Decision:** [What was decided]
- **Rationale:** [Why this choice]
- **Alternatives:** [What else was considered]
- **Trade-offs:** [What was sacrificed]
- **Risk:** [Any residual risk]
- **Date:** [ISO timestamp]
```

Categories: Requirements | Pattern | Technology | Integration | Security | Infrastructure | Process | Reopen

**Example – append a decision entry (pseudocode; use the Edit/Write tool to append, not code execution):**
```
entry = """
### [DEC-001] Phase 1 | Pattern
- **Decision:** Adopt hexagonal architecture
- **Rationale:** Decouples domain from infrastructure
- **Alternatives:** Layered monolith
- **Trade-offs:** Higher initial complexity
- **Risk:** Team familiarity required
- **Date:** 2024-06-01T10:00:00Z
"""
Append entry to ".arch/decisions.md" using Write tool
```

### Automatic Logging Events
Log a decision entry for:
- Phase acceptance
- Phase transition
- Sub-phase acceptance (2A, 2B, 2C)
- Technology selection (per component)
- Refinement requests (what changed and why)
- Alternative requests (what was replaced)
- Review findings (significant concerns raised)
- Reopen operations (with cascade details)
