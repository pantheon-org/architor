# User Guide — Architor

A step-by-step guide to running your first architecture design session with Architor.

## Prerequisites

- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **Claude Code** — `npm install -g @anthropic-ai/claude-code`
- **Python 3** — Required for enforcement hooks
- **git** — Required for project tracking

Verify everything is installed:

```bash
npx arch-agent verify
```

## Setup (5 minutes)

### 1. Initialize your project

```bash
cd your-project
npx arch-agent init --name "My Project"
```

This creates three things:
- `.arch/` — State machine, scripts, and working files
- `.claude/` — Commands, skills, and hook configuration
- `CLAUDE.md` — Agent identity and rules

### 2. Add your PRD

Write or paste your Product Requirements Document into `.arch/prd.md`. This is the input the agent will analyze.

A good PRD includes:
- What the system does (functional requirements)
- How well it must do it (non-functional requirements: latency, uptime, throughput)
- Who uses it (user types, expected scale)
- What it integrates with (external systems, APIs, databases)

Don't worry if your PRD is incomplete — the agent will find the gaps.

### 3. Add organizational context (optional)

Fill in `.arch/org-context.md` with your team's reality:
- Team size and experience
- Existing tech stack
- Budget and timeline constraints
- Compliance requirements

If you skip this, the agent will interview you in Phase 1 (15 questions, takes ~10 minutes).

### 4. Start Claude Code

```bash
claude
```

Type `/help` to see all available commands.

## Importing an Existing Architecture

If you already have an architecture document and want to iterate on it rather than starting from scratch:

### 1. Import your document

```bash
cd your-project
npx arch-agent import path/to/your-architecture.md --name "My Project"
```

This scaffolds the project (same as `init`) and copies your document to `.arch/existing-architecture.md`. Imported projects get 5 reopens (vs 2) for more iteration room.

### 2. Start the review

```bash
claude
```

Type `/import-architecture`. The agent will:
- Parse your document into sections
- Present each section for adversarial review
- Progress through all 4 phases using the extracted content

### 3. Review each phase

The agent presents extracted content from your document. For each phase:
- **Accept** (`/accept`) phases that look correct
- **Refine** (`/refine [feedback]`) phases that need changes
- **Challenge** — push back on decisions that seem outdated

### Example

```
$ npx arch-agent import docs/architecture-v2.md --name "Payment Platform v3"
$ claude

You: /import-architecture
Agent: [parses document, presents Phase 1 evaluation of extracted requirements]
Agent: "Your document lists 12 functional requirements. I found 3 critical gaps: ..."
You: /accept
Agent: [presents Phase 2A — reviews extracted microservices pattern]
Agent: "Your document chose microservices for a 6-person team. Have you considered..."
You: /refine We've grown to 15 engineers since this was written
Agent: [updates pattern analysis with new team context]
You: /accept
[... continues through all phases ...]
```

---

## The Four Phases

### Phase 1: Evaluate Your PRD

```
/analyze-prd
```

**What happens:**
1. If `org-context.md` is empty, the agent offers a discovery interview (3 blocks of 5 questions about scale, team, and constraints)
2. The agent reads your PRD and produces a structured analysis:
   - Extracted functional requirements (FR-001, FR-002...)
   - Non-functional requirements (found or flagged as missing)
   - Gaps rated by severity (Critical / Important / Minor)
   - Risk assessment across 5 dimensions
   - Overall quality rating

**What you do:**
- Answer the agent's questions about gaps
- Push back if something is wrong or missing
- Use `/refine` to request changes to the analysis
- When satisfied: `/accept`

**Example interaction:**
```
You: /analyze-prd
Agent: [reads PRD, produces analysis, asks 5 pointed questions about gaps]
You: /refine The latency requirement is 200ms p99, not p50. Also add the HIPAA compliance constraint.
Agent: [updates analysis with corrections]
You: /accept
Agent: Phase 1 accepted. Run /propose-methodology to begin Phase 2.
```

### Phase 2A: Choose Architecture Pattern

```
/propose-methodology
```

**What happens:**
The agent proposes an architecture pattern (e.g., modular monolith, microservices, serverless) with:
- Rationale tied to your specific requirements and team
- Trade-offs — what this approach sacrifices
- At least 2 alternatives with pros/cons

**What you do:**
- Evaluate the pattern against your team's reality
- Use `/alternative` to see a different approach
- Use `/refine` to adjust the proposal
- When satisfied: `/accept`

### Phase 2B: Map Components

```
/propose-methodology
```

(The command auto-routes to the next sub-phase.)

**What happens:**
The agent maps all system components:
- Component names and responsibilities
- Dependencies between components
- Integration points
- High-level technology suggestions

**What you do:**
- Check for missing components or unnecessary ones
- Validate that all integrations are accounted for
- `/refine` or `/accept`

### Phase 2C: Lock Cross-Cutting Decisions

```
/propose-methodology
```

**What happens:**
The agent proposes system-wide decisions in 5 areas:

| Area | Example Decisions |
|------|-------------------|
| Auth | JWT with RS256, Keycloak as IdP, RBAC model |
| Observability | Structured JSON logs, OpenTelemetry traces, Prometheus metrics |
| Deployment | Docker containers, Kubernetes, GitLab CI/CD |
| Error Handling | Retry with exponential backoff, circuit breakers on external calls |
| Data Management | Each service owns its data, eventual consistency between services |

**Why this matters:** These decisions constrain every component in Phase 3. Without them, each component would make different choices, leading to inconsistency.

**What you do:**
- Review each area for feasibility
- Ensure your team can actually operate these choices
- `/refine` or `/accept`

### Phase 3: Design Each Component

```
/design-component api-gateway
```

(After accepting one component, the agent auto-advances to the next.)

**What happens (per component):**
- Detailed design with specific technology + version
- Integration points: inputs, outputs, protocols, data formats
- API contracts
- Failure modes and recovery strategies
- Operational concerns: monitoring, alerting, scaling
- Compliance check against Phase 2C cross-cutting decisions

**What you do:**
- Validate the technology choice against your team's skills
- Check that integration points match adjacent components
- Ensure failure modes are realistic, not just happy-path
- For critical components, run `/review-component [name]` for an adversarial review
- `/accept` each component

**Example interaction:**
```
You: /design-component auth-service
Agent: [detailed design with Keycloak, OAuth2 flows, token management, failure modes]
You: /refine We need to support SAML for enterprise SSO, not just OAuth2
Agent: [updates design to include SAML alongside OAuth2]
You: /accept
Agent: auth-service accepted (3/8 components). Starting api-gateway...
```

### Phase 4: Validate and Generate Document

```
/generate-docs
```

**What happens:**
1. **Validation** — The agent traces critical user journeys through all components, checking integration points and cross-cutting compliance
2. **Risk register** — Probability x impact scoring for all identified risks
3. **Document generation** — Comprehensive architecture document consolidating all decisions

**What you do:**
- Review the validation findings (fix critical issues with `/reopen` if needed)
- Review the generated document in `output/architecture-document.md`
- `/accept` to complete the process

## Commands Reference

### Phase Commands

| Command | When to Use |
|---------|-------------|
| `/analyze-prd` | Start Phase 1 — evaluate your PRD |
| `/propose-methodology` | Start/continue Phase 2 — auto-routes to 2A, 2B, or 2C |
| `/design-component [name]` | Phase 3 — design a specific component |
| `/generate-docs` | Phase 4 — validate and generate final document |

### Decision Commands

| Command | When to Use |
|---------|-------------|
| `/accept` | Accept the current proposal and advance |
| `/refine [feedback]` | Request specific changes to current proposal |
| `/alternative [request]` | Request a completely different approach |
| `/reopen [target] [reason]` | Go back to fix a previous decision (max 2 per project) |

### Utility Commands

| Command | When to Use |
|---------|-------------|
| `/status` | See current progress across all phases |
| `/decision-log` | View all recorded decisions |
| `/review-component [name]` | Launch adversarial review of a component |
| `/help` | See available commands for current phase |

## Using /reopen

Sometimes you realize a Phase 2 decision was wrong after seeing its effects in Phase 3. The `/reopen` command lets you go back:

```
/reopen phase 2c "After designing the auth-service, we need to switch from session-based to token-based auth"
```

**Rules:**
- Maximum 2 reopens per project (prevents design thrashing)
- You must provide a justification (logged as a decision)
- Reopening cascades: downstream phases are un-accepted
  - Reopen 2A → un-accepts 2A, 2B, 2C, and all Phase 3 components become `needs-review`
  - Reopen 2C → un-accepts 2C only, Phase 3 components become `needs-review`
  - Reopen a component → that component goes back to `in_progress`, dependents become `needs-review`

Use reopens sparingly. The cascading cost is intentional — it makes you think carefully before going back.

## Tips

### Before you start
- **Write a real PRD**, not bullet points. The agent's analysis quality is proportional to your PRD quality.
- **Fill in org-context.md** if you know your constraints. The interview is useful for discovery, but direct input is faster if you already know the answers.
- **Use a capable model**. Architecture decisions require nuanced reasoning. Opus produces significantly better results than Haiku.

### During the session
- **Push back on the agent.** It's designed to be challenged. If a recommendation feels wrong, say so and explain why.
- **Use `/refine` liberally.** Iteration is cheap. Acceptance is permanent (unless you spend a reopen).
- **Run `/status` often.** It shows exactly where you are and what's next.
- **Use `/review-component` on critical components.** The adversarial review catches things the standard design flow misses.

### If something goes wrong
- **Agent seems confused about state**: Run `/status` to force a state re-read, or `/clear` to reset conversation context (file state is preserved).
- **Hook blocks a valid operation**: Check `.arch/state.json` to understand why. The error message from the hook explains the violation.
- **Need to start over**: `npx arch-agent reset` backs up your state and resets to a clean slate (preserves your PRD and org-context).

## Complete Walkthrough Example

Here's a realistic session from start to finish:

```
$ cd my-payment-platform
$ npx arch-agent init --name "Payment Platform"
$ claude

You: /analyze-prd
Agent: [reads PRD, notices org-context is empty, offers interview]
You: A (accept interview)
Agent: [15 questions across Scale, Team, Constraints]
You: [answers questions]
Agent: [derives complexity tier: Growth, generates org-context.md]
Agent: [produces PRD analysis with 3 critical gaps, 5 important gaps]
You: /refine Add that we also need PCI-DSS compliance for card data
Agent: [updates analysis]
You: /accept

You: /propose-methodology
Agent: [proposes modular monolith with rationale: 8-person team, PCI scope reduction]
You: /accept

You: /propose-methodology
Agent: [maps 6 components: API Gateway, Payment Engine, Card Vault, Notification Service, Admin Dashboard, Audit Logger]
You: /refine Split Audit Logger into Audit Service and Compliance Reporter
Agent: [updates to 7 components]
You: /accept

You: /propose-methodology
Agent: [cross-cutting: mTLS for service auth, structured JSON logging, Kubernetes deployment, retry with circuit breakers, PCI-compliant data isolation]
You: /accept

You: /design-component api-gateway
Agent: [detailed design: Kong Gateway 3.x, rate limiting, JWT validation]
You: /accept
Agent: Starting payment-engine...
[... continues through all 7 components ...]

You: /generate-docs
Agent: [validates end-to-end, builds risk register, generates 13-section document]
You: /accept

Done! Architecture document: output/architecture-document.md
```

## File Structure Reference

After initialization, your project contains:

```
your-project/
├── CLAUDE.md                          # Agent identity + phase rules
├── .arch/
│   ├── state.json                     # State machine (don't edit manually)
│   ├── prd.md                         # Your PRD (edit this)
│   ├── org-context.md                 # Your constraints (edit this)
│   ├── decisions.md                   # Auto-generated decision log
│   ├── scripts/
│   │   ├── validate-transition.py     # Hard enforcement hook
│   │   └── log-decision.py            # Auto-logging hook
│   ├── components/                    # Phase 3 component designs
│   └── reviews/                       # Adversarial review findings
├── .claude/
│   ├── settings.json                  # Hook configuration
│   ├── commands/                      # 14 slash commands
│   └── skills/                        # 4 auto-activating skills
└── output/
    └── architecture-document.md       # Phase 4 final deliverable
```

**Files you edit**: `prd.md`, `org-context.md`
**Files the agent generates**: everything in `components/`, `reviews/`, `decisions.md`, `output/`
**Files you never touch**: `state.json`, `scripts/`, `settings.json`
