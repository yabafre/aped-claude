# APED Method

Zero-dependency CLI that scaffolds a complete dev pipeline into any [Claude Code](https://claude.ai/download) project.

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

    Analyze → PRD → UX → Epics → Dev → Review
```

## What it does

APED turns Claude Code into a disciplined dev pipeline. Instead of "code me an app", you get:

1. **Analyze** — 3 parallel research agents (market, domain, technical) produce a product brief
2. **PRD** — Autonomous generation with numbered FRs, validation scripts, domain detection
3. **UX** — ANF framework: Assemble design DNA, Normalize with a live React prototype, Fill all screens with user validation
4. **Epics** — Stories with ACs in Given/When/Then, FR coverage validation, ticket system integration
5. **Dev** — TDD red-green-refactor with 5-condition gate, parallel agents for context gathering
6. **Review** — Adversarial code review with minimum 3 findings, parallel agents (code-explorer + code-reviewer)

A guardrail hook blocks you from skipping steps. A state machine tracks progress. Everything chains automatically.

## Quick start

```bash
cd your-project
npx aped-method
```

Interactive prompts ask for project name, author, languages, ticket system, and git provider. Or go non-interactive:

```bash
npx aped-method --yes --project=my-app --author=Jane --lang=french --tickets=linear --git=github
```

Then open Claude Code:

```
/aped-a    # Start with analysis
/aped-all  # Or run the full pipeline
```

## Pipeline commands

| Command | Phase | What it produces |
|---------|-------|-----------------|
| `/aped-a` | Analyze | Product brief from 3 parallel research agents |
| `/aped-p` | PRD | PRD with numbered FRs/NFRs, validated by script |
| `/aped-ux` | UX | Live React prototype (Vite), design spec, component catalog |
| `/aped-e` | Epics | Stories with ACs, tasks, FR coverage map |
| `/aped-d` | Dev | TDD implementation with 5-condition gate |
| `/aped-r` | Review | Adversarial review, minimum 3 findings |

## Utility commands

| Command | What it does |
|---------|-------------|
| `/aped-s` | Sprint status dashboard — progress, blockers, next actions |
| `/aped-c` | Correct course — manage scope changes with impact analysis |
| `/aped-ctx` | Brownfield analysis — generate project context from existing code |
| `/aped-qa` | Generate E2E and integration tests from acceptance criteria |
| `/aped-quick` | Quick fix/feature bypassing the full pipeline |
| `/aped-all` | Run the full pipeline A→P→UX→E→D→R with auto-resume |

## What gets scaffolded

```
.aped/                              # Engine (immutable after install)
├── config.yaml                     # Project settings, integrations
├── hooks/guardrail.sh              # Pipeline coherence hook
├── templates/                      # Document templates (brief, PRD, epics, story, quick-spec)
├── aped-a/                         # Analyze skill
│   ├── SKILL.md
│   ├── scripts/validate-brief.sh
│   └── references/research-prompts.md
├── aped-p/                         # PRD skill
│   ├── SKILL.md
│   ├── scripts/validate-prd.sh
│   └── references/fr-rules.md, *.csv
├── aped-ux/                        # UX skill (ANF framework)
│   ├── SKILL.md
│   ├── scripts/validate-ux.sh
│   └── references/ux-patterns.md   # 99 priority-ranked UX rules
├── aped-e/                         # Epics skill
│   ├── SKILL.md
│   ├── scripts/validate-coverage.sh
│   └── references/epic-rules.md
├── aped-d/                         # Dev skill
│   ├── SKILL.md
│   ├── scripts/run-tests.sh
│   └── references/tdd-engine.md, ticket-git-workflow.md
├── aped-r/                         # Review skill
│   ├── SKILL.md
│   ├── scripts/git-audit.sh
│   └── references/review-criteria.md
├── aped-s/                         # Status dashboard
│   ├── SKILL.md
│   └── references/status-format.md
├── aped-c/                         # Correct course
│   ├── SKILL.md
│   └── references/scope-change-guide.md
├── aped-ctx/                       # Brownfield context
│   ├── SKILL.md
│   └── references/analysis-checklist.md
├── aped-qa/                        # QA tests
│   ├── SKILL.md
│   └── references/test-patterns.md
├── aped-quick/SKILL.md             # Quick fix
└── aped-all/SKILL.md               # Orchestrator

docs/aped/                          # Output (evolves during project)
├── state.yaml                      # Pipeline state machine
├── product-brief.md                # From /aped-a
├── prd.md                          # From /aped-p
├── ux/                             # From /aped-ux
│   ├── design-spec.md
│   ├── screen-inventory.md
│   ├── components.md
│   └── flows.md
├── epics.md                        # From /aped-e
├── stories/                        # One file per story
└── quick-specs/                    # From /aped-quick

.claude/
├── commands/aped-*.md              # 12 slash commands
└── settings.local.json             # Guardrail hook config
```

## Integrations

### Ticket systems

Configure during install or via `--tickets=`:

| Provider | Commit format | Auto-link |
|----------|--------------|-----------|
| `linear` | `feat(TEAM-XX): description` | `Part of TEAM-XX` / `Fixes TEAM-XX` |
| `jira` | `feat(PROJ-XX): description` | Smart commits |
| `github-issues` | `feat(#XX): description` | `Closes #XX` / `Fixes #XX` |
| `gitlab-issues` | `feat(#XX): description` | `Closes #XX` |
| `none` | `feat: description` | — |

### Git providers

Configure via `--git=`:

| Provider | PR/MR creation | Branch strategy |
|----------|---------------|-----------------|
| `github` | `gh pr create` | `feature/{ticket}-{slug}` |
| `gitlab` | `glab mr create` | `feature/{ticket}-{slug}` |
| `bitbucket` | Web UI | `feature/{ticket}-{slug}` |

## UX phase — ANF framework

The `/aped-ux` skill produces a live React prototype, not wireframes:

- **Assemble** — Collect design DNA: user inspirations, UI library (shadcn, MUI, Radix...), design tokens, branding
- **Normalize** — Scaffold Vite+React app with real PRD content (no lorem ipsum), working navigation, all screens
- **Fill** — Complete interaction states, responsive (3 breakpoints), dark mode, accessibility, then user review cycles until approved

The approved prototype becomes the UX spec that `/aped-e` consumes. Includes 99 priority-ranked UX rules and a pre-delivery checklist.

## Guardrail hook

Every prompt is intercepted by `guardrail.sh` which checks pipeline coherence:

| Situation | Reaction |
|-----------|----------|
| Coding without epics | Warns: run A→P→E first |
| PRD without brief | Warns: run /aped-a first |
| Modifying PRD during dev | Warns: use /aped-c for scope changes |
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
npx aped-method --version          # Shows current version
# If installed version < CLI version → "Upgrade available: v1.x → v2.x"
```

## Anthropic Skills Guide compliance

All 12 skills follow the [Complete Guide to Building Skills for Claude](https://www.anthropic.com/engineering/claude-skills-guide):

- YAML frontmatter with name, description (WHAT + WHEN + negative triggers), license, metadata
- Progressive disclosure: frontmatter → SKILL.md body → references/
- `disable-model-invocation: true` on side-effect skills (dev, review, correct, all)
- `allowed-tools` restrictions on read-only skills (status, context)
- Critical Rules section at top of pipeline skills
- Examples and Common Issues in every skill
- Validation scripts with clear exit codes
- Skill tool chaining (not slash notation)
- Third-person descriptions, <1024 chars, no XML tags

## Requirements

- [Claude Code](https://claude.ai/download)
- Node.js 18+

## License

MIT
