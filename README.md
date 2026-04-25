# APED Method

[![npm version](https://img.shields.io/npm/v/aped-method.svg?style=flat-square)](https://www.npmjs.com/package/aped-method)
[![npm downloads](https://img.shields.io/npm/dm/aped-method.svg?style=flat-square)](https://www.npmjs.com/package/aped-method)
[![Node](https://img.shields.io/node/v/aped-method.svg?style=flat-square)](https://nodejs.org)
[![License](https://img.shields.io/npm/l/aped-method.svg?style=flat-square)](./LICENSE)

CLI that scaffolds a complete, user-driven dev pipeline into any [Claude Code](https://claude.ai/download) project — 22 slash commands, two hooks (coherence guardrail + upstream-lock), named agent personas, coordinated teams, **parallel sprint** mode via `git worktree` with a Lead Dev coordinator, and **cross-tool skill distribution** via symlinks so OpenCode, Codex CLI, and any `agents.md` reader see the same skills as Claude Code.

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
/aped-brainstorm   # (Optional) Diverge first — 100+ ideas before converging
/aped-prfaq        # (Optional) Working Backwards — press-release-first discipline
/aped-analyze      # Start with guided discovery
```

### Optional: parallel sprints

Once you reach the sprint phase (after `/aped-epics`), you can run several stories in parallel via `git worktree`:

```
/aped-sprint     # DAG resolver + capacity check + dispatch
```

For the best experience, install [workmux](https://github.com/raine/workmux) (`brew install raine/workmux/workmux`) — APED detects it and will auto-create a tmux window with Claude Code pre-launched per story. Without workmux, `/aped-sprint` prints the exact `cd` + `claude` + `/aped-dev` commands to run in new terminals.

### Maintenance & optional add-ons

```bash
aped-method doctor                # verify an installed scaffold
aped-method statusline            # install the APED status line
aped-method safe-bash             # install the optional Bash safety hook
aped-method symlink               # repair APED skill symlinks
aped-method post-edit-typescript  # install the optional TS quality hook
```

## Command catalog

APED ships 22 slash commands across the core pipeline, upstream ideation, critique, sprint operations, and maintenance flows. The detailed catalog is generated from the same `COMMAND_DEFS` source that produces the scaffolded slash commands, so it stays in sync as the product evolves.

See [`docs/COMMANDS.md`](./docs/COMMANDS.md) for the full generated catalog, including phase, arguments, purpose, and likely outputs.

## Operational commands

The CLI also includes a few maintenance subcommands for installed APED projects:

- `aped-method doctor` — verify the scaffold, hooks, state, commands, symlinks, and optional binaries
- `aped-method statusline` — install an APED-aware Claude Code status line (model · context-window progress bar · project · phase · epic · story · review queue · worktrees · git)
- `aped-method safe-bash` — install the optional Bash safety hook
- `aped-method symlink` — repair APED cross-tool skill symlinks
- `aped-method post-edit-typescript` — install the optional TypeScript post-edit quality hook

## Personas & teams

APED runs work through **named agent personas** (BMAD-inspired) so each agent stays in character and focuses on its scope. The type of coordination depends on whether specialists need to talk to each other.

### Research subagents — `/aped-analyze`
Independent parallel work, no coordination needed.

- **Mary** — Senior Market Analyst. *"Show me the data, not the hype."*
- **Derek** — Domain Expert. *"I know where the bodies are buried."*
- **Tom** — Staff Engineer. *"Every choice has a tax."*

### Review specialists — `/aped-review`
Plain subagents (no `TeamCreate`, no `SendMessage`), dispatched in parallel. Each specialist returns its findings to the Lead, who merges and cross-references manually. Keeps the workflow focused on validation, avoids tmux-pane rendering issues of the experimental agent-teams mode, and scales to N specialists without a parallelism cap.

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

### Architecture Council — `/aped-arch` (for high-stakes decisions)
Dispatched in parallel via `Agent` when a Phase-2 decision would cost weeks to reverse (primary database, auth model, API paradigm, frontend framework, infra platform). Each specialist thinks independently — no shared context, no convergence pressure — and returns a structured verdict (preferred option, rationale, top 2 risks, disqualifying conditions).

- **Winston** — Systems Architect (always included). *"Boring tech for MVP. Cleverness costs operationally."*
- **Lena** — Pragmatic Engineer. *"What ships fastest without regret?"*
- **Raj** — Security & Compliance Reviewer. *"Assume breach. Assume audit."*
- **Nina** — Cost & Ops Analyst. *"What does this cost at 10× scale? And when does it page us at 3am?"*
- **Maya** — Edge Case Hunter. *"Where does this break?"*

User picks the final option; the minority view gets documented as signal for future pivots. Escape hatch for MVP-scale decisions where the Council would be overkill.

### Retrospective specialists — `/aped-retro`
Three parallel subagents reading post-mortem data after an epic completes.

- **Mia** — Struggle Analyzer. Patterns across dev notes, review feedback, technical debt.
- **Leo** — Velocity & Quality Analyzer. Review rounds, complexity vs effort, quality signals.
- **Ava** — Previous-Retro Auditor. Continuity check — did the prior retro's action items actually ship?

### Tool surface used
`Agent` (all specialist dispatches), `TaskCreate`/`TaskUpdate`/`TaskList` (sprint task tracking), plus `TeamCreate` / `TeamDelete` / `SendMessage` in `/aped-dev` fullstack mode only — because Kenji, Amelia and Leo genuinely co-edit a shared contract. Review is pure validation, so it skips the team machinery entirely.

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

### Parallel sprint via worktrees — `/aped-sprint` + `/aped-lead`

When an epic has several stories ready to go, `/aped-sprint` resolves the story DAG (`depends_on:` in `epics.md` and `state.yaml`), then dispatches up to `parallel_limit` stories (default 3) — each in its own `git worktree` at `../{project}-{ticket}` on branch `feature/{ticket}-{story-key}`. Reviews are bounded too (`review_limit`, default 2) and spill to a `review-queued` status when the limit is reached. An `upstream-lock` PreToolUse hook denies any edit to `prd.md` / `architecture.md` / `ux/` while a story is in-progress; only `/aped-course` can temporarily unlock — and it notifies every active worktree ticket before and after the change.

**Two-tier architecture: Lead Dev ↔ Story Leaders**

Stories don't run on autopilot. Each Story Leader (the Claude session inside a worktree) posts a check-in at every transition and HALTs:

- `story-ready` — posted by `/aped-sprint` at dispatch
- `dev-done` — posted by `/aped-dev` when implementation + tests converge
- `review-done` — posted by `/aped-review` when the story flips to `done`

You run `/aped-lead` in the main project whenever you want to process the batch. The Lead Dev applies **hard programmatic criteria** (deps resolved, tests passing 100%, no HALT logs, git clean, no blocking labels) to auto-approve what's safe, and escalates anything borderline to you. Approvals `tmux send-keys` the next command into the right worktree window (fallback: print the command for you to run manually). The result is a real distributed team — every transition gets a second pair of eyes, but only when it's worth the cognitive load.

**Dispatch has two paths**, picked automatically:

- **With [workmux](https://github.com/raine/workmux)** (recommended) — APED detects `workmux` in `$PATH` and calls `workmux add -a claude` per story. The Claude session sits idle in its tmux window until `/aped-lead` approves the `story-ready` check-in and pushes `/aped-dev {story-key}` via `tmux send-keys`. Live TUI dashboard via `workmux dashboard`, one-command cleanup via `workmux merge`. A starter `.workmux.yaml` ships at `.aped/templates/workmux.yaml.example`.
- **Without workmux** (fallback) — `.aped/scripts/sprint-dispatch.sh` creates the worktree + branch + marker file. `/aped-lead` still gates transitions but prints the exact commands for you to run manually in each worktree.

**Check-in backend**: ticket system (Linear / GitHub / GitLab / Jira) with `aped-checkin-*` / `aped-approved-*` / `aped-blocked-*` labels + structured comments. If `ticket_system: none`, falls back to JSONL inboxes under `.aped/checkins/`. Concurrent-safe via a portable `mkdir`-based lock (macOS-compatible).

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
│   ├── sync-state.sh               # Atomic state.yaml mutations
│   └── checkin.sh                  # Lead/Leader coordination (post/poll/approve/push)
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
├── aped-lead/                      # Lead Dev hub — batch-approves check-ins
├── aped-ship/                      # End-of-sprint merge + pre-push composite review
├── aped-status/                    # Multi-worktree dashboard
├── aped-course/                    # Scope change (with worktree notification)
├── aped-context/                   # Brownfield analysis
├── aped-qa/                        # E2E + integration tests
├── aped-quick/                     # Quick fix (spec isolation)
├── aped-checkpoint/                # Human-in-the-loop review
├── aped-claude/                    # CLAUDE.md smart merge
├── aped-brainstorm/                # Divergent ideation (upstream of /aped-analyze)
├── aped-prfaq/                     # Working Backwards challenge (upstream)
├── aped-retro/                     # Post-epic retrospective (Mia/Leo/Ava specialists)
└── aped-elicit/                    # Horizontal critique toolkit (19 methods)

docs/aped/                          # Output (evolves during project)
├── state.yaml                      # Pipeline state machine
├── product-brief.md                # /aped-analyze
├── prd.md                          # /aped-prd
├── ux/                             # /aped-ux (spec + preview app)
├── architecture.md                 # /aped-arch
├── epics.md                        # /aped-epics
├── stories/                        # /aped-story (one file per story)
├── epic-{N}-context.md             # Compiled epic context (cached)
├── quick-specs/                    # /aped-quick
├── brainstorm/                     # /aped-brainstorm sessions
├── prfaq.md                        # /aped-prfaq (5-stage artefact)
├── retros/                         # /aped-retro (one file per epic)
└── lessons.md                      # /aped-retro distilled lessons (cross-epic continuity)

.claude/
├── commands/aped-*.md              # 22 slash commands with argument-hints
└── settings.local.json             # UserPromptSubmit + PreToolUse hooks + pre-approved Bash permissions

# Cross-tool symlinks (only created if the parent marker dir already exists):
.opencode/skills/aped-*             # → ../../.aped/aped-*  (symlinks, OpenCode)
.agents/skills/aped-*               # → ../../.aped/aped-*  (symlinks, Codex CLI / agents.md)
.codex/skills/aped-*                # → ../../.aped/aped-*  (symlinks, Codex native)
```

### Cross-tool skill distribution

On macOS/Linux the scaffolder creates **relative symlinks** that point back to the canonical `.aped/aped-*` directories, one edit in `.aped/` propagates to every tool instantly — no manual sync, no drift. Since v3.7.5 the three targets are **auto-detected**: a symlink tree is created under `.opencode/skills/`, `.agents/skills/`, and/or `.codex/skills/` **only when the corresponding `.opencode` / `.agents` / `.codex` marker directory already exists** in the project. A single-tool Claude Code project gets zero symlinks and zero slash-command duplication; multi-tool setups get symlinks only where they make sense.

Claude Code itself reaches APED via the real `.claude/commands/aped-*.md` files — `.claude/skills/` is intentionally **not** a default target (it would duplicate every slash command in the picker). Windows hosts are auto-skipped (symlinks require developer mode + `core.symlinks=true`). Fresh mode wipes stale `aped-*` entries in every location APED has ever written to (including legacy `.claude/skills/aped-*` from pre-3.7.5 installs); update mode fixes wrong-target symlinks and preserves regular files at the target path.

Re-run `aped-method symlink` at any time to repair or rebuild the symlink trees after creating a new `.opencode` / `.agents` / `.codex` marker.

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

Core APED installs two hooks into `.claude/settings.local.json`:

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

### Optional hooks

These are installed explicitly when you want them:

- `aped-method safe-bash` adds a focused `PreToolUse` Bash validator for obviously dangerous shell commands (`rm -rf /`, `rm -rf $HOME`, `curl | bash`, disk utilities, broad `chmod -R 777`, and `sudo` confirmation). **Best-effort UX safety net, not a security boundary** — crafted commands bypass it trivially. See [SECURITY.md](./SECURITY.md) for scope and limits.
- `aped-method post-edit-typescript` adds a `PostToolUse` hook for `Write|Edit|MultiEdit` that detects TypeScript files and runs local `prettier --write` / `eslint --fix` only when those binaries are already available in the project. Silent no-op when they are not installed.
- `aped-method statusline` installs a Claude Code status line that renders the current APED phase, active epic / story, review queue, worktree count, and git branch from `docs/aped/state.yaml`. If a `statusLine` is already configured, the install prompts before overwriting.

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
- Node.js ≥ 20
- **Unix-like shell** — APED's hooks and scripts target macOS and Linux (incl. WSL). Native Windows (cmd / PowerShell without WSL) is not supported: the bash scripts use POSIX tools (`stat -c`/`stat -f`, `mkdir`-based locking, `tmux`/`workmux`) that don't have native equivalents.

### Recommended companion tools

- **[workmux](https://github.com/raine/workmux)** — enables the parallel-sprint sweet spot: `/aped-sprint` auto-creates tmux windows with Claude Code pre-launched in each worktree. Install with `brew install raine/workmux/workmux` (macOS/Linux). Fully optional: APED falls back to manual worktree + terminal instructions if absent.
- **[yq](https://mikefarah.gitbook.io/yq)** (v4) — strongly recommended for `/aped-sprint`/`/aped-lead`/`/aped-ship`: state.yaml mutations and reads use yq when present, with a more fragile awk fallback otherwise. Install with `brew install yq` (macOS) or `snap install yq` (Linux).
- **[jq](https://jqlang.github.io/jq/)** — speeds up the guardrail hooks' JSON encoding and the audit log writer (`scripts/log.sh`). Optional; APED falls back to defensive shell quoting otherwise.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for the full version history.

## Troubleshooting

Common issues (symlinks not appearing, `--update` overwrote a file, guardrail blocking prompts, etc.) are covered in [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md).

## Security

Threat model, hardening already in place, and how to report a vulnerability: see [SECURITY.md](./SECURITY.md). Use GitHub Security Advisories for private reports; do not file public issues for security problems.

## License

MIT — see [LICENSE](./LICENSE).
