# Changelog

All notable changes to Architor are documented here.

## [2.1.1] — 2026-03-07

### Repository improvements

- Rewrote README for clarity: added problem statement, value proposition, use cases, output examples, and workflow diagram
- Added npm keywords for discoverability: system-design, ai-agent, architecture-decision-record, adr, developer-tools
- Added 19 GitHub repository topics covering AI, architecture, developer tools, and Claude Code
- Updated GitHub repository description
- Added article/ to .gitignore

---

## [2.1.0] — 2026-03-02

### Import Existing Architecture

New feature: import and iteratively review existing architecture documents.

**CLI**
- New `arch-agent import <source>` command — scaffolds project and imports existing architecture document
- Supports `--name` and `--force` options (same as `init`)
- Sets `reopens.max: 5` for imported projects (more iteration room)
- Adds `import_source` metadata field to state.json

**Slash Command**
- New `/import-architecture` — fast-track review flow for imported documents
- Parses existing document into phases (requirements, pattern, components, cross-cutting, component designs)
- Each phase gets adversarial review with standard acceptance gates
- Uses normal state machine transitions — zero validator changes needed

**Tests**
- 9 new import tests + 2 CLI tests (51 total)

---

## [2.0.2] — 2026-03-01

### Package metadata fix

- Renamed npm package from `architor` to `arch-agent` (npm typo-squatting policy)
- Updated repository URL to `AhmedHabiba/architor`

---

## [2.0.1] — 2026-02-28

### Security Hardening (9 zero-impact fixes)

All fixes block adversarial/malformed input only. Normal workflow is 100% identical.

**Critical**
- Closed Write+Execute chain: scripts are now read-only (`Write(.arch/scripts/*)` denied), direct script execution removed from allowedTools, `cat`/`ls` scoped to `.arch/` and `output/`

**High**
- Reopen limit bypass: `reopens.max` now read from trusted on-disk state, not proposed state
- Unknown phase bypass: phase name allowlist blocks unrecognized phases
- Dynamic `all_accepted`: finalization gate now computes all-components-accepted from actual component statuses instead of trusting a flag

**Medium**
- Schema type validation: `current_phase` must be string, `phases` must be object, `decision_count` must be number
- Log sanitization: markdown-active characters stripped from logged values

**Low**
- stdin limited to 1MB in validation hook
- Backup failures logged to stderr instead of silently swallowed

**Other**
- Added `Security Constraints` section to CLAUDE.md
- Symlink safety in CLI `walkDir` function
- 10 new security tests (40 total)

---

## [2.0.0] — 2026-02-27

### npm CLI Distribution

Architor is now an npm package. Install and scaffold with:
```bash
npx arch-agent init
npx arch-agent init --name "My Project"
```

New CLI commands:
- `arch-agent init` — Scaffold `.arch/` and `.claude/` into any project
- `arch-agent verify` — Check prerequisites (Claude Code, Python 3, git)
- `arch-agent reset` — Reset state.json to initial state (with backup)
- `arch-agent --version` — Show version

### Phase 2 Split (2A/2B/2C)

Phase 2 now has three independently-acceptable sub-phases:
- **Phase 2A**: Architecture Pattern — accept the pattern before component mapping
- **Phase 2B**: Component Map — accept component boundaries before cross-cutting decisions
- **Phase 2C**: Cross-Cutting Decisions — auth, observability, deployment, error handling as system-wide constraints for Phase 3

### Controlled Reopen

New `/reopen` command allows reopening accepted phases or components:
- Maximum 2 reopens per project (prevents thrashing, preserves forward-only pressure)
- Cascading: reopening Phase 2A un-accepts 2B, 2C, and marks all Phase 3 components as "needs-review"
- Fully logged with justification in the decision log

### Discovery Interview

When `.arch/org-context.md` is empty, `/analyze-prd` offers a structured interview:
- 3 blocks of 5 questions (Scale & Complexity, Team Reality, Constraints)
- Auto-generates org-context.md from answers
- Derives complexity tier (Startup/Growth/Enterprise/Specialized)
- Skip option with explicit assumptions marked `[ASSUMED CONTEXT]`

### Phase 4 Validation

`/generate-docs` now includes a validation step before document generation:
- End-to-end request simulation through all components
- Risk register with probability x impact scoring
- Expanded cross-component consistency check against Phase 2C decisions

### Bug Fixes

- Fixed: Empty stdin to validate-transition.py allowed writes (now blocks)
- Fixed: First write to state.json skipped all validation (now validates schema)
- Fixed: New components could be injected as "accepted" (must start as "pending")
- Fixed: Accepted components could be silently deleted (now blocked)
- Fixed: Gate logic errors in propose-methodology and generate-docs commands
- Fixed: /accept auto-advance duplicated /design-component logic (now references it)
- Fixed: Triple challenge before acceptance (unified to /accept flow only)

### Template Improvements

- `decisions.md` now includes an example DEC-001 entry
- `architecture-document.md` now has a 13-section skeleton structure
- `org-context.md` sections marked as REQUIRED/RECOMMENDED/OPTIONAL
- State.json schema updated with sub_phase, reopens, cross_cutting fields

---

## [1.0.0] — 2026-02-27

### Initial Release

**Core System**
- CLAUDE.md with adversarial reviewer identity and phase discipline rules
- File-based state management via `.arch/state.json`
- Four-phase methodology: Evaluate, Decide, Design, Document

**Slash Commands (11)**
- `/analyze-prd` — Phase 1: PRD evaluation
- `/propose-methodology` — Phase 2: Architecture pattern + component overview
- `/design-component` — Phase 3: Detailed component design
- `/generate-docs` — Phase 4: Final architecture document generation
- `/accept`, `/refine`, `/alternative` — Decision commands
- `/review-component` — Adversarial design review
- `/status`, `/decision-log`, `/help` — Status commands

**Auto-Activating Skills (4)**
- `architecture-methodology`, `architecture-patterns`, `challenge-assumptions`, `state-manager`

**Hard Enforcement (2 hooks)**
- `validate-transition.py` — PreToolUse hook blocks illegal phase transitions
- `log-decision.py` — PostToolUse hook auto-records state changes

**Documentation**
- README, Architecture, Methodology, Contributing guides
- SVG diagrams: system architecture, enforcement model, phase workflow, component lifecycle
