# Architor — Architecture Agent for Claude Code

Turn Claude Code into a rigorous, phase-gated architecture design assistant.

## Quick Start

```bash
npx arch-agent init --name "My Project"
```

Then:
1. Add your PRD to `.arch/prd.md`
2. Optionally fill in `.arch/org-context.md` (or the agent will interview you)
3. Run `claude` and type `/help`

## What It Does

Architor scaffolds a complete architecture workflow into your project. When you open Claude Code, it becomes an opinionated senior architect that:

- **Evaluates** your PRD (Phase 1) — finds gaps, rates quality, asks hard questions
- **Decides** architecture pattern + components + cross-cutting concerns (Phase 2A/2B/2C)
- **Designs** each component in detail, one at a time (Phase 3)
- **Validates & documents** everything into a comprehensive architecture document (Phase 4)

Every decision requires explicit human acceptance. Every decision is logged with rationale. No auto-acceptance. No phase skipping.

## Install

```bash
# Scaffold into current directory
npx arch-agent init

# With project name
npx arch-agent init --name "Payment Platform"

# Check prerequisites
npx arch-agent verify

# Reset state (preserves your PRD and org-context)
npx arch-agent reset
```

**Requirements:** Node.js 18+, Claude Code, Python 3, git

## Import Existing Architecture

Have an existing architecture document? Import it for review and iteration:

```bash
npx arch-agent import path/to/architecture.md --name "My Project"
```

Then in Claude Code:
```
/import-architecture
```

The agent parses your document and walks through each phase, extracting and reviewing requirements, pattern, components, and cross-cutting decisions. Quickly `/accept` phases that look good, or `/refine` those that need updates. Imported projects get 5 reopens (vs 2) for more iteration room.

## The Four Phases

```
Phase 1: Evaluate    → Analyze PRD, find gaps, assess risks
Phase 2A: Pattern    → Choose architecture pattern with rationale
Phase 2B: Components → Map all system components + dependencies
Phase 2C: Cross-Cut  → Lock auth, observability, deployment, error handling strategies
Phase 3: Design      → Detail each component (one at a time, auto-advancing)
Phase 4: Validate    → End-to-end validation + final document generation
```

Each phase has a gate. You must explicitly ACCEPT before proceeding.

## Commands

| Command | Description |
|---------|-------------|
| `/analyze-prd` | Phase 1: Evaluate PRD (includes discovery interview if org-context is empty) |
| `/propose-methodology` | Phase 2: Architecture pattern (2A), components (2B), cross-cutting (2C) |
| `/design-component [name]` | Phase 3: Detailed component design |
| `/generate-docs` | Phase 4: Validate and generate architecture document |
| `/import-architecture` | Import and review existing architecture document |
| `/accept` | Accept current proposal |
| `/refine [feedback]` | Request changes |
| `/alternative [request]` | Request different approach |
| `/reopen [target] [reason]` | Reopen accepted phase/component (max 2 per project) |
| `/status` | Show project progress |
| `/decision-log` | Show all decisions |
| `/review-component [name]` | Adversarial design review |
| `/help` | Command reference |

## Key Features

### Discovery Interview
If you don't fill in `.arch/org-context.md`, the agent interviews you: 15 questions across 3 blocks (Scale, Team Reality, Constraints). Derives a complexity tier that influences all recommendations.

### Controlled Reopen
Architecture is iterative. `/reopen` lets you go back to fix decisions — with guardrails:
- Max 2 reopens per project (prevents thrashing)
- Cascading: reopening Phase 2A un-accepts 2B, 2C, and marks Phase 3 components as "needs-review"
- Fully logged with justification

### Cross-Cutting Decisions (Phase 2C)
Auth, observability, deployment, and error handling are designed as system-wide decisions BEFORE component design. Every component in Phase 3 must comply with these constraints.

### Hard Enforcement
Python validation hooks block illegal state transitions at the file system level. No prompt can bypass them:
- Phase skipping blocked
- Backward transitions blocked (unless via /reopen)
- Component injection as "accepted" blocked
- Accepted component deletion blocked

## What Gets Created

```
your-project/
├── CLAUDE.md                    # Agent identity + phase rules
├── .arch/
│   ├── state.json              # State machine (single source of truth)
│   ├── prd.md                  # Your PRD goes here
│   ├── org-context.md          # Team, tech stack, constraints
│   ├── decisions.md            # Auto-generated decision log
│   ├── scripts/
│   │   ├── validate-transition.py  # Hard enforcement hook
│   │   └── log-decision.py         # Auto-logging hook
│   ├── components/             # Phase 3 outputs
│   └── reviews/                # Adversarial review findings
├── .claude/
│   ├── settings.json           # Hook configuration
│   ├── commands/               # 13 slash commands
│   └── skills/                 # 4 auto-activating skills
└── output/
    └── architecture-document.md  # Phase 4 final deliverable
```

## Documentation

| Document | Description |
|----------|-------------|
| [USER-GUIDE.md](docs/USER-GUIDE.md) | Step-by-step walkthrough for first-time users |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design — enforcement layers, state management |
| [METHODOLOGY.md](docs/METHODOLOGY.md) | Four-phase methodology guide |
| [CONTRIBUTING.md](docs/CONTRIBUTING.md) | How to contribute |
| [CHANGELOG.md](CHANGELOG.md) | Version history |

## License

MIT
