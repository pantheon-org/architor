# Contributing to Architecture Agent

Thank you for considering contributing to the Architecture Agent. This document explains how the project is structured and how to contribute effectively.

## Project Philosophy

Before contributing, understand the design principles this project follows:

1. **Methodology before technology.** The process is the product. Changes should improve the quality of architectural decisions, not add features for their own sake.
2. **Hard gates over soft suggestions.** If something must be enforced, enforce it with code (hooks, scripts), not with instructions (CLAUDE.md, skills) alone.
3. **File state over conversation state.** All persistent state lives on disk. Conversation is ephemeral.
4. **Adversarial by design.** The AI should challenge, not agree. Contributions that make the agent more agreeable reduce its value.

## Repository Structure

```
arch-agent/
├── CLAUDE.md                    # Agent identity and rules
├── .claude/
│   ├── settings.json            # Hooks and permissions
│   ├── commands/*.md            # Slash commands
│   └── skills/*/SKILL.md       # Auto-activating skills
├── .arch/
│   ├── state.json               # State machine template
│   ├── scripts/*.py             # Hook scripts (hard enforcement)
│   ├── prd.md                   # PRD template
│   └── org-context.md           # Org context template
├── docs/
│   ├── ARCHITECTURE.md          # System design document
│   ├── METHODOLOGY.md           # Process methodology
│   └── diagrams/*.svg           # Architecture diagrams
└── output/                      # Generated deliverables
```

## Types of Contributions

### Bug Fixes

If a hook script fails to catch an illegal transition, or a command doesn't validate state correctly, that's a bug. These are high-priority fixes.

### Prompt Improvements

Skills and commands contain prompt text that shapes Claude's behavior. Improvements that make the agent more rigorous, better at catching anti-patterns, or more effective at challenging assumptions are welcome.

When submitting prompt changes, explain:
- What behavior was wrong or missing
- What the new prompt achieves
- How you tested it (describe the scenario)

### New Commands

New slash commands should follow the existing pattern:
- Read `state.json` before executing
- Validate that the command is appropriate for the current phase
- Update state after execution
- Include clear instructions for Claude

### New Skills

New skills should:
- Have a clear activation context (when should this skill fire?)
- Not conflict with existing skills
- Include YAML frontmatter with `name` and `description`

### Hook Scripts

New validation scripts should:
- Be deterministic — same input always produces same output
- Exit 0 to allow, exit 1 to block
- Print clear error messages to both stdout and stderr
- Be testable independently (`cat test-input.json | python3 script.py`)

### Documentation

Documentation improvements are always welcome. This includes:
- Fixing inaccuracies
- Adding examples
- Improving diagrams
- Translating to other languages

## Development Guidelines

### Testing Hook Scripts

Hook scripts can be tested independently:

```bash
# Test valid transition
echo '{"current_phase": "methodology", "phases": {"evaluation": {"accepted": true}, "methodology": {"accepted": false, "pattern_accepted": false, "components_overview_accepted": false}, "components": {"components": {}}}}' | python3 .arch/scripts/validate-transition.py
echo "Exit code: $?"

# Test invalid transition (should exit 1)
echo '{"current_phase": "components", "phases": {"evaluation": {"accepted": false}, "methodology": {"accepted": false, "pattern_accepted": false, "components_overview_accepted": false}, "components": {"components": {}}}}' | python3 .arch/scripts/validate-transition.py
echo "Exit code: $?"
```

### Testing Commands and Skills

Commands and skills are harder to test deterministically because they rely on Claude's interpretation. To test:

1. Set up a fresh `arch-agent/` directory
2. Add a test PRD to `.arch/prd.md`
3. Run through the full four-phase workflow
4. Verify that phase gates block illegal transitions
5. Verify that the adversarial personality challenges proposals

### Editing Diagrams

SVG diagrams in `docs/diagrams/` are hand-crafted. When editing:
- Maintain the existing color scheme (navy `#1B5E8A`, dark navy `#0F3652`, green `#27AE60`, amber `#F4D03F`, red `#E74C3C`)
- Use the `Segoe UI, Arial, sans-serif` font stack
- Keep diagrams readable at both full size and GitHub preview size
- Test rendering in a browser before submitting

## Tessl Integration

The skills bundled with arch-agent are packaged as [Tessl](https://tessl.io) tiles — versioned, distributable skill units for Claude Code. Each tile lives under `.claude/skills/<name>/` alongside its evaluation scenarios.

| Tile | Purpose |
|------|---------|
| `ahmed-habiba/architecture-methodology` | Enforces the 4-phase workflow; activates on any system design or architecture discussion |
| `ahmed-habiba/state-manager` | Reads and writes `.arch/state.json` and `.arch/decisions.md`; tracks phase and component acceptance |
| `ahmed-habiba/challenge-assumptions` | Adversarial reviewer that questions technology choices, scalability assumptions, and single points of failure |
| `ahmed-habiba/architecture-patterns` | Knowledge base for pattern selection (microservices, monolith, serverless, event-driven, CQRS) with trade-off comparison |

The root `tessl.json` configures the project in `vendored` mode and pins the `tessl-labs/tessl-skill-eval-scenarios` dependency used by the eval runner. Tiles are currently `private: true`.

Eval scenarios live alongside each skill at `.claude/skills/<name>/evals/`. Each `task.md` describes one scenario. When adding or changing skill behaviour, add or update the relevant scenarios before submitting a PR.

#### Inline file scaffolding convention

Scenarios that require input files on disk embed them directly in `task.md` using the following delimiter format, which the Tessl eval runner parses to create files before the agent runs:

```
=============== FILE: .arch/state.json ===============
{
  "current_phase": "evaluation",
  ...
}
```

Each `=============== FILE: <path> ===============` block is written to the specified path relative to the sandbox working directory before the agent receives the task prompt. Use this pattern whenever a scenario depends on pre-existing files (state.json, decisions.md, PRDs, etc.).

### Setup (opt-in)

The Tessl MCP server is **not auto-configured** — `.mcp.json` and `.claude/settings.local.json` are gitignored. Only set this up if you need to run or publish evals.

**1. Install and authenticate:**

```bash
bun add -g tessl
tessl login
```

**2. Create `.mcp.json` at the repository root:**

```json
{
  "mcpServers": {
    "tessl": {
      "type": "stdio",
      "command": "tessl",
      "args": ["mcp", "start"]
    }
  }
}
```

**3. Create `.claude/settings.local.json` to activate it in Claude Code:**

```json
{
  "enabledMcpjsonServers": ["tessl"]
}
```

Restart Claude Code. The `mcp__tessl__*` tools will be available.

### Running evals

```bash
# Check tile status and version info
tessl status

# Run evals for a specific tile
tessl eval .claude/skills/architecture-methodology

# Run all tiles
tessl eval .claude/skills/

# Search the Tessl library
tessl search architecture
```

### Publishing

Tiles are currently `private: true`. To publish a tile to the Tessl registry, set `"private": false` in the relevant `tile.json` and run:

```bash
tessl publish
```

### For agent contributors

Check whether the `mcp__tessl__*` tools are already loaded before attempting eval workflows. If they are not present, instruct the human to follow the setup above — do not attempt to install or configure Tessl autonomously.

## Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-change`
3. Make your changes
4. Test the full workflow if changing hooks, commands, or skills
5. Update documentation if behavior changes
6. Submit a pull request with a clear description of what changed and why

## Code of Conduct

Be respectful. Be constructive. Focus on improving the quality of architectural decisions that this tool enables.
