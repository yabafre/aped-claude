# APED Method

CLI that scaffolds a complete dev pipeline into any [Claude Code](https://claude.ai/download) project.

```
npx aped-method
```

```
     █████╗ ██████╗ ███████╗██████╗
    ██╔══██╗██╔══██╗██╔════╝██╔══██╗
    ███████║██████╔╝█████╗  ██║  ██║
    ██╔══██║██╔═══╝ ██╔══╝  ██║  ██║
    ██║  ██║██║     ███████╗██████╔╝
    ╚═╝  ╚═╝╚═╝     ╚══════╝╚═════╝
          M  E  T  H  O  D

    Analyze → PRD → UX → Arch → Epics → Story → Dev → Review
```

## What it does

APED turns Claude Code into a disciplined, user-driven dev pipeline. Every step requires explicit user validation before proceeding.

1. **Analyze** — 4-round guided discovery + 3 parallel research agents (market, domain, technical) produce a product brief
2. **PRD** — Autonomous generation with numbered FRs, validation scripts, domain detection
3. **UX** — ANF framework: Assemble design DNA, Normalize with a live React prototype, Fill all screens
4. **Architecture** — Collaborative solution design: technology decisions, implementation patterns, project structure
5. **Epics** — Epic structure and story list with FR coverage validation
6. **Story** — Prepare one story at a time with full context, right before implementation
7. **Dev** — TDD red-green-refactor with 5-condition gate, epic context compilation
8. **Review** — Adversarial code review with minimum 3 findings

A guardrail hook warns you when skipping steps. A state machine tracks progress. The user controls the pace.

## Quick start

```bash
cd your-project
npx aped-method
```

Interactive prompts (powered by [@clack/prompts](https://github.com/bombshell-dev/clack)) ask for project name, author, languages, ticket system, and git provider. Or go non-interactive:

```bash
npx aped-method --yes --project=my-app --author=Jane --lang=french --tickets=linear --git=github
```

Then open Claude Code:

```
/aped-analyze    # Start with analysis
```

## Pipeline commands

| Command | Phase | What it produces |
|---------|-------|-----------------|
| `/aped-analyze` | Analyze | Product brief from guided discovery + 3 parallel research agents |
| `/aped-prd` | PRD | PRD with numbered FRs/NFRs, validated by script |
| `/aped-ux` | UX | Live React prototype (Vite), design spec, component catalog |
| `/aped-arch` | Architecture | Technology decisions, patterns, project structure |
| `/aped-epics` | Epics | Epic structure + story list with FR coverage map |
| `/aped-story` | Story | Detailed story file, prepared one at a time |
| `/aped-dev` | Dev | TDD implementation with 5-condition gate |
| `/aped-review` | Review | Adversarial review, minimum 3 findings |

## Utility commands

| Command | What it does |
|---------|-------------|
| `/aped-status` | Sprint status dashboard — progress, blockers, next actions |
| `/aped-course` | Correct course — manage scope changes with impact analysis |
| `/aped-context` | Brownfield analysis — generate project context from existing code |
| `/aped-qa` | Generate E2E and integration tests from acceptance criteria |
| `/aped-quick` | Quick fix/feature bypassing the full pipeline (with spec isolation) |
| `/aped-check` | Checkpoint — review recent changes, highlight concerns, halt for approval |

## What gets scaffolded

```
.aped/                              # Engine (immutable after install)
├── config.yaml                     # Project settings, integrations
├── hooks/guardrail.sh              # Pipeline coherence hook
├── templates/                      # Document templates (brief, PRD, epics, story, quick-spec)
├── aped-analyze/                   # Analyze skill
│   ├── SKILL.md
│   ├── scripts/validate-brief.sh
│   └── references/research-prompts.md
├── aped-prd/                       # PRD skill
│   ├── SKILL.md
│   ├── scripts/validate-prd.sh
│   └── references/fr-rules.md, *.csv
├── aped-ux/                        # UX skill (ANF framework)
│   ├── SKILL.md
│   ├── scripts/validate-ux.sh
│   └── references/ux-patterns.md
├── aped-arch/                      # Architecture skill
│   └── SKILL.md
├── aped-epics/                     # Epics skill
│   ├── SKILL.md
│   ├── scripts/validate-coverage.sh
│   └── references/epic-rules.md
├── aped-story/                     # Story preparation skill
│   └── SKILL.md
├── aped-dev/                       # Dev skill
│   ├── SKILL.md
│   ├── scripts/run-tests.sh
│   └── references/tdd-engine.md, ticket-git-workflow.md
├── aped-review/                    # Review skill
│   ├── SKILL.md
│   ├── scripts/git-audit.sh
│   └── references/review-criteria.md
├── aped-status/                    # Status dashboard
│   └── SKILL.md
├── aped-course/                    # Correct course
│   └── SKILL.md
├── aped-context/                   # Brownfield context
│   └── SKILL.md
├── aped-qa/                        # QA tests
│   └── SKILL.md
├── aped-quick/                     # Quick fix
│   └── SKILL.md
└── aped-checkpoint/                # Checkpoint review
    └── SKILL.md

docs/aped/                          # Output (evolves during project)
├── state.yaml                      # Pipeline state machine
├── product-brief.md                # From /aped-analyze
├── prd.md                          # From /aped-prd
├── architecture.md                 # From /aped-arch
├── ux/                             # From /aped-ux
├── epics.md                        # From /aped-epics
├── stories/                        # From /aped-story (one file per story)
├── epic-{N}-context.md             # Compiled epic context (cached)
└── quick-specs/                    # From /aped-quick (spec isolation)

.claude/
├── commands/aped-*.md              # 14 slash commands
└── settings.local.json             # Guardrail hook config
```

## Key design principles

### User controls the pace

No auto-chaining between phases. Every skill ends with "Run `/aped-X` when ready." The user decides when to proceed, review, or backtrack.

### Guided discovery over questionnaires

`/aped-analyze` uses 4 rounds of conversational discovery, not a list of questions. Claude probes deeper on vague answers and helps the user think through their project.

### Stories created one at a time

`/aped-epics` creates the structure and list. `/aped-story` prepares one detailed story file at a time, right before `/aped-dev` implements it. This keeps stories fresh and context-aware.

### Epic context compilation

Before implementing a story, `/aped-dev` compiles all relevant context (PRD, architecture, UX, completed stories) into a cached `epic-{N}-context.md`. This runs once per epic and is reused across stories.

### Spec isolation

`/aped-quick` specs are independent files with a status field (`draft → in-progress → done`). Multiple specs can exist in parallel. Resuming a spec in progress is automatic.

## Integrations

### Ticket systems

| Provider | Commit format | Auto-link |
|----------|--------------|-----------|
| `linear` | `feat(TEAM-XX): description` | `Part of TEAM-XX` / `Fixes TEAM-XX` |
| `jira` | `feat(PROJ-XX): description` | Smart commits |
| `github-issues` | `feat(#XX): description` | `Closes #XX` / `Fixes #XX` |
| `gitlab-issues` | `feat(#XX): description` | `Closes #XX` |
| `none` | `feat: description` | — |

### Git providers

| Provider | PR/MR creation | Branch strategy |
|----------|---------------|-----------------|
| `github` | `gh pr create` | `feature/{ticket}-{slug}` |
| `gitlab` | `glab mr create` | `feature/{ticket}-{slug}` |
| `bitbucket` | Web UI | `feature/{ticket}-{slug}` |

## Guardrail hook

Every prompt is intercepted by `guardrail.sh` which checks pipeline coherence:

| Situation | Reaction |
|-----------|----------|
| Coding without epics | Warns: run Analyze → PRD → Epics first |
| PRD without brief | Warns: run /aped-analyze first |
| Modifying PRD during dev | Warns: use /aped-course for scope changes |
| Quick fix request | Bypasses (that's what /aped-quick is for) |

The hook injects context — it doesn't block. Claude explains the issue and asks for confirmation.

## Install / Update / Fresh

```bash
# First install
npx aped-method

# Re-run on existing project → auto-detects, offers:
#   1. Update engine (preserve config + artifacts)
#   2. Fresh install (delete everything, start over)
#   3. Cancel

# Non-interactive
npx aped-method --yes              # Auto-update if exists
npx aped-method --yes --update     # Explicit update
npx aped-method --yes --fresh      # Nuke and redo

# Version check
npx aped-method --version
```

## Requirements

- [Claude Code](https://claude.ai/download)
- Node.js 18+

## License

MIT
