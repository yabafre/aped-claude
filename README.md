# APED Method

[![npm version](https://img.shields.io/npm/v/aped-method.svg?style=flat-square)](https://www.npmjs.com/package/aped-method)
[![npm downloads](https://img.shields.io/npm/dm/aped-method.svg?style=flat-square)](https://www.npmjs.com/package/aped-method)
[![Node](https://img.shields.io/node/v/aped-method.svg?style=flat-square)](https://nodejs.org)
[![License](https://img.shields.io/npm/l/aped-method.svg?style=flat-square)](./LICENSE)

CLI that scaffolds a complete, user-driven dev pipeline into any [Claude Code](https://claude.ai/download) project — 16 slash commands, two hooks (coherence guardrail + upstream-lock), named agent personas, coordinated teams, and **parallel sprint** mode via `git worktree`.

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

APED turns Claude Code into a disciplined, user-driven dev pipeline. Every phase produces an artifact, requires explicit user validation, and hands off via a guardrail hook that warns on skipped steps. Named agent personas run research, implementation, and review in parallel — with agent teams for anything that needs cross-specialist coordination.

## Quick start

```bash
cd your-project
npx aped-method
```

Interactive prompts (powered by [@clack/prompts](https://github.com/bombshell-dev/clack)) ask for project name, author, languages, ticket system, and git provider. Or go non-interactive:

```bash
npx aped-method --yes \
  --project=my-app --author=Jane \
  --lang=french --tickets=linear --git=github
```

Then open Claude Code:

```
/aped-analyze    # Start with guided discovery
```

### Optional: parallel sprints

Once you reach the sprint phase (after `/aped-epics`), you can run several stories in parallel via `git worktree`:

```
/aped-sprint     # DAG resolver + capacity check + dispatch
```

For the best experience, install [workmux](https://github.com/raine/workmux) (`brew install raine/workmux/workmux`) — APED detects it and will auto-create a tmux window with Claude Code pre-launched per story. Without workmux, `/aped-sprint` prints the exact `cd` + `claude` + `/aped-dev` commands to run in new terminals.

## Pipeline commands (8)

| Command | Phase | What it produces |
|---------|-------|-----------------|
| `/aped-analyze` | Analyze | Product brief from 4-round guided discovery + 3 parallel research agents (Mary, Derek, Tom) |
| `/aped-prd` | PRD | PRD with numbered FRs/NFRs, validated by script, with domain-complexity detection |
| `/aped-ux` | UX | Live React prototype (Vite), design spec, component catalog — the **ANF framework** |
| `/aped-arch` | Architecture | Technology decisions, implementation patterns, project structure (collaborative, 5 phases) |
| `/aped-epics` | Epics | Epic structure + story list with FR coverage map + ticket-system seed (milestones, issues) |
| `/aped-story` | Story | One detailed story file at a time, fetching the ticket as source of truth |
| `/aped-dev` | Dev | TDD red-green-refactor with a 5-condition GATE (+ 6th visual GATE for frontend), optional fullstack team mode |
| `/aped-review` | Review | Adversarial review by a coordinated agent team (Eva, Marcus, Rex + domain specialists), binary outcome: `review → done` |

## Utility commands (8)

| Command | What it does |
|---------|-------------|
| `/aped-sprint` | **Parallel sprint** — resolves story DAG, creates worktrees, prints the commands to open N sessions in parallel |
| `/aped-status` | Multi-worktree dashboard — capacity, active worktrees, review queue, ready-to-dispatch |
| `/aped-course` | Correct course — scope change management with impact analysis (unlocks upstream docs while active) |
| `/aped-context` | Brownfield analysis — generate project context from existing code |
| `/aped-qa` | Generate E2E + integration tests from acceptance criteria |
| `/aped-quick` | Quick fix / feature bypassing the full pipeline (with spec isolation) |
| `/aped-check` | Checkpoint — review recent changes, highlight concerns, halt for approval |
| `/aped-claude` | Sync APED rules into `CLAUDE.md` (smart merge — preserves your content) |

## Personas & teams

APED runs work through **named agent personas** (BMAD-inspired) so each agent stays in character and focuses on its scope. The type of coordination depends on whether specialists need to talk to each other.

### Research subagents — `/aped-analyze`
Independent parallel work, no coordination needed.

- **Mary** — Senior Market Analyst. *"Show me the data, not the hype."*
- **Derek** — Domain Expert. *"I know where the bodies are buried."*
- **Tom** — Staff Engineer. *"Every choice has a tax."*

### Review team — `/aped-review`
Agent team using `TeamCreate` + `SendMessage` between specialists. Core 3 always dispatched, conditionals triggered by file scope.

- **Eva** — AC Validator / QA Lead (always) — *"I trust nothing without proof in the code."*
- **Marcus** — Code Quality / Staff Engineer (always) — *"Security and performance are non-negotiable."*
- **Rex** — Git Auditor (always) — *"Every commit tells a story. Most lie."*
- **Diego** — Backend (if backend files touched)
- **Lucas** — Frontend (if frontend files touched)
- **Aria** — Visual / Design Engineer (frontend + preview app)
- **Kai** — Platform / DevOps (if infra files)
- **Sam** — Fullstack Tech Lead (if story spans ≥ 2 layers)

### Fullstack dev team — `/aped-dev` (optional mode)
Triggered when a story touches ≥ 2 layers. Contract-first coordination via `SendMessage`.

- **Kenji** — API Designer. Owns the oRPC/OpenAPI contract.
- **Amelia** — Senior Backend. Implements against Kenji's contract.
- **Leo** — Senior Frontend. UI against the contract + visual verification via React Grab.

### Tool surface used
`Agent`, `SendMessage`, `TeamCreate`, `TeamDelete`, `TaskCreate`, `TaskUpdate`, `TaskList` — the Lead explicitly tears down teams on completion, and teammates self-serve pending tasks via `TaskList` instead of waiting for dispatch.

## Design principles

### User controls the pace
No auto-chaining between phases. Every skill ends with "Run `/aped-X` when ready." The user decides when to proceed, review, or backtrack. GATE blocks (⏸) mark every write / state change that requires approval.

### Binary review outcomes
`/aped-review` only transitions `review → done` (all findings resolved or dismissed) or stays `review` (user fixes and re-runs). No `in-progress`, no `[AI-Review]` purgatory.

### Visual verification as a first-class step
Frontend tasks get a visual check at **every GREEN pass**, not just at review time. `mcp__react-grab-mcp__get_element_context` inspects the live preview app; `/aped-review`'s Aria validates rather than re-running from scratch. Fallback: if MCP is unavailable, warn and defer to review — never block dev.

### Ticket system as source of truth
The Linear / Jira / GitHub / GitLab ticket is the shared artifact between the AI and the human team. `/aped-story`, `/aped-dev`, and `/aped-review` fetch the ticket at the start of each phase; any divergence with the local story halts the flow until the user resolves it.

### Guided discovery over questionnaires
`/aped-analyze` uses 4 rounds of conversational discovery — Claude probes deeper on vague answers and helps the user think through their project, instead of a flat list of questions.

### Stories created one at a time
`/aped-epics` writes the plan (titles / ACs / scope) without creating per-story files. `/aped-story` produces one detailed story file right before implementation, with full context compilation.

### Epic context cache
Before implementing each story, `/aped-dev` checks `docs/aped/epic-{N}-context.md`. If missing or stale, a sub-agent compiles it once from the PRD / architecture / UX / completed stories. Reused across every story in the epic — one compile, many reads.

### Spec isolation — `/aped-quick`
Quick specs are independent files with a status field (`draft → in-progress → done`). Multiple can run in parallel. Resuming an in-progress spec is automatic.

### Parallel sprint via worktrees — `/aped-sprint`
When an epic has several stories ready to go, `/aped-sprint` resolves the story DAG (`depends_on:` in `epics.md` and `state.yaml`), then dispatches up to `parallel_limit` stories (default 3) — each in its own `git worktree` at `../{project}-{ticket}` on branch `feature/{ticket}-{story-key}`. Reviews are also bounded (`review_limit`, default 2) and spill to a `review-queued` status when the limit is reached. An `upstream-lock` PreToolUse hook denies any edit to `prd.md` / `architecture.md` / `ux/` while a story is in-progress; only `/aped-course` can temporarily unlock — and it notifies every active worktree ticket before and after the change.

**Dispatch has two paths**, picked automatically:

- **With [workmux](https://github.com/raine/workmux)** (recommended) — APED detects `workmux` in `$PATH` and calls `workmux add -a claude -p "/aped-dev <story-key>"` per story. This auto-creates the tmux window, launches Claude Code with the initial prompt already injected, and gives you a live TUI dashboard via `workmux dashboard`. No manual terminal opening. A starter `.workmux.yaml` ships at `.aped/templates/workmux.yaml.example` — copy it to your repo root and customise pane layout, file copy/symlink, and post-create hooks.
- **Without workmux** (fallback) — `.aped/scripts/sprint-dispatch.sh` creates the worktree + branch + marker file and prints the exact `cd` + `claude` + `/aped-dev` commands you run in a new terminal per worktree.

## What gets scaffolded

```
.aped/                              # Engine (update-safe)
├── config.yaml                     # Project settings, integrations
├── hooks/
│   ├── guardrail.sh                # UserPromptSubmit coherence hook
│   └── upstream-lock.sh            # PreToolUse hook (deny upstream writes during sprint)
├── scripts/
│   ├── sprint-dispatch.sh          # Creates worktree + branch + marker
│   ├── worktree-cleanup.sh         # Removes worktree, optionally deletes branch
│   └── sync-state.sh               # Atomic state.yaml mutations (flock)
├── templates/                      # Document templates (brief, PRD, epics, story, quick-spec)
├── aped-analyze/                   # Research personas (Mary/Derek/Tom)
│   ├── SKILL.md
│   ├── scripts/validate-brief.sh
│   └── references/research-prompts.md
├── aped-prd/                       # PRD generation
│   ├── SKILL.md
│   ├── scripts/validate-prd.sh
│   └── references/fr-rules.md, *.csv
├── aped-ux/                        # ANF framework + React prototype
│   ├── SKILL.md
│   ├── scripts/validate-ux.sh
│   └── references/ux-patterns.md
├── aped-arch/                      # Collaborative architecture (5 phases)
│   └── SKILL.md
├── aped-epics/                     # Epic structure + ticket seed
│   ├── SKILL.md
│   ├── scripts/validate-coverage.sh
│   └── references/epic-rules.md
├── aped-story/                     # Story preparation (one at a time)
│   └── SKILL.md
├── aped-dev/                       # TDD + fullstack team (Kenji/Amelia/Leo)
│   ├── SKILL.md
│   ├── scripts/run-tests.sh
│   └── references/tdd-engine.md, ticket-git-workflow.md
├── aped-review/                    # Review team (Eva/Marcus/Rex + specialists)
│   ├── SKILL.md
│   ├── scripts/git-audit.sh
│   └── references/review-criteria.md
├── aped-sprint/                    # Parallel dispatch via worktrees
├── aped-status/                    # Multi-worktree dashboard
├── aped-course/                    # Scope change (with worktree notification)
├── aped-context/                   # Brownfield analysis
├── aped-qa/                        # E2E + integration tests
├── aped-quick/                     # Quick fix (spec isolation)
├── aped-checkpoint/                # Human-in-the-loop review
└── aped-claude/                    # CLAUDE.md smart merge

docs/aped/                          # Output (evolves during project)
├── state.yaml                      # Pipeline state machine
├── product-brief.md                # /aped-analyze
├── prd.md                          # /aped-prd
├── ux/                             # /aped-ux (spec + preview app)
├── architecture.md                 # /aped-arch
├── epics.md                        # /aped-epics
├── stories/                        # /aped-story (one file per story)
├── epic-{N}-context.md             # Compiled epic context (cached)
└── quick-specs/                    # /aped-quick

.claude/
├── commands/aped-*.md              # 16 slash commands with argument-hints
└── settings.local.json             # UserPromptSubmit + PreToolUse hooks + pre-approved Bash permissions
```

## Integrations

### Ticket systems

| Provider | Fetch | Commit format | Auto-link |
|----------|-------|--------------|-----------|
| `linear` | linear-cli / API | `feat(TEAM-XX): …` | `Part of TEAM-XX` / `Fixes TEAM-XX` |
| `jira` | curl to Jira API | `feat(PROJ-XX): …` | Smart commits |
| `github-issues` | `gh issue view` | `feat(#XX): …` | `Closes #XX` / `Fixes #XX` |
| `gitlab-issues` | `glab issue view` | `feat(#XX): …` | `Closes #XX` |
| `none` | — | `feat: …` | — |

Flow: `/aped-epics` seeds milestones + issues with labels (🆕 / 🔄 / 🔁) and sizes (S/M/L). `/aped-story` fetches the ticket (the team may have edited it — the ticket wins). `/aped-dev` fetches again before implementation; any divergence HALTs until resolved. `/aped-review` posts the review report as a comment and updates status.

### Git providers

| Provider | PR/MR creation | Branch strategy |
|----------|---------------|-----------------|
| `github` | `gh pr create` | `feature/{ticket}-{slug}` |
| `gitlab` | `glab mr create` | `feature/{ticket}-{slug}` |
| `bitbucket` | Web UI | `feature/{ticket}-{slug}` |

### MCP tools

- **`react-grab-mcp`** — live component inspection for UX design, visual verification in `/aped-dev` (at every GREEN pass on frontend tasks) and validation in `/aped-review` (Aria specialist).

## Hooks

APED installs two hooks into `.claude/settings.local.json`:

### `guardrail.sh` — UserPromptSubmit (advisory)

Every prompt is intercepted. The hook checks pipeline coherence against `state.yaml` and actual story statuses, injects advisory context, and never blocks. It honours `$CLAUDE_PROJECT_DIR` and validates `current_phase` against a whitelist (`none` / `analyze` / `prd` / `ux` / `architecture` / `sprint`) to reject any garbage.

| Situation | Reaction |
|-----------|----------|
| Coding without epics | Warns: run Analyze → PRD → Epics first |
| PRD without brief | Warns: run `/aped-analyze` first |
| Epics without PRD | Warns: run `/aped-prd` first |
| Review without a story in review status | Warns: run `/aped-dev` first |
| Modifying PRD during sprint | Warns: use `/aped-course` for scope changes |
| Quick fix request | Bypasses (that's what `/aped-quick` is for) |

Timeout 5s; JSON encoding prefers `jq` → `node` (no regex fallback, no context injection risk).

### `upstream-lock.sh` — PreToolUse (enforcement)

Matches `Write | Edit | NotebookEdit`. Denies any write into `prd.md` / `architecture.md` / `product-brief.md` / `ux/*` while any story in `state.yaml` has status `in-progress`. Only `/aped-course` can set `sprint.scope_change_active: true` to temporarily unlock; the skill is responsible for clearing the flag and invalidating epic-context caches before exit.

This is what makes parallel sprint safe: several worktrees can implement on the upstream contract without risk of mid-sprint rug-pulls.

## Install / Update / Fresh

```bash
# First install
npx aped-method

# Re-run on an existing project — auto-detects and offers:
#   1. Update engine    (upgrade skills/scripts/hooks, preserve state + artifacts)
#   2. Fresh install    (wipe everything, start over — creates a tar.gz backup first)
#   3. Cancel

# Non-interactive
npx aped-method --yes                      # Auto-update if exists, else install
npx aped-method --yes --update             # Explicit update
npx aped-method --yes --fresh              # Nuke and redo (with backup)

# Version / help
npx aped-method --version
npx aped-method --help
```

Flags honour `NO_COLOR` / `FORCE_COLOR`. Exit codes are meaningful: `0` success, `1` user error, `2` internal error, `130` user cancellation.

## Requirements

- [Claude Code](https://claude.ai/download)
- Node.js ≥ 18

### Recommended companion tools

- **[workmux](https://github.com/raine/workmux)** — enables the parallel-sprint sweet spot: `/aped-sprint` auto-creates tmux windows with Claude Code pre-launched in each worktree. Install with `brew install raine/workmux/workmux` (macOS/Linux). Fully optional: APED falls back to manual worktree + terminal instructions if absent.
- **[jq](https://jqlang.github.io/jq/)** — speeds up the guardrail hooks' JSON encoding. Also optional; APED falls back to `node -e` when `jq` is not installed.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for the full version history.

## License

MIT — see [LICENSE](./LICENSE).
