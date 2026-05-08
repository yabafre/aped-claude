# APED Method

[![npm version](https://img.shields.io/npm/v/aped-method.svg?style=flat-square)](https://www.npmjs.com/package/aped-method)
[![npm downloads](https://img.shields.io/npm/dm/aped-method.svg?style=flat-square)](https://www.npmjs.com/package/aped-method)
[![Node](https://img.shields.io/node/v/aped-method.svg?style=flat-square)](https://nodejs.org)
[![License](https://img.shields.io/npm/l/aped-method.svg?style=flat-square)](./LICENSE)

CLI that scaffolds a complete, user-driven dev pipeline into any [Claude Code](https://claude.ai/download) project — **35 skills** invoked via the Skill tool or natural-language triggers, two hooks (coherence guardrail + upstream-lock), named agent personas, coordinated teams, **parallel sprint** mode via `git worktree` with a Lead Dev coordinator, sprint **umbrella branch convention** so parallel sprints integrate via one reviewable PR per sprint, an **external ticket intake** for tickets that bypass the planning flow, a **post-ship router** (`aped-iterate`) that classifies new deltas into the right downstream skill, an **architecture audit** (`aped-arch-audit`) that surfaces deepening candidates in the existing codebase, and **cross-tool skill distribution** via symlinks so OpenCode, Codex CLI, and any `agents.md` reader see the same skills as Claude Code.

> **Upgrading from 5.x?** v6.0.0 restructured every skill into a BMAD-style directory (`aped-X/SKILL.md` + `workflow.md` + `steps/*`). The Claude Code skill loader has handled both layouts since 4.4.0, so existing scaffolds keep working — `aped-method --update` migrates in place. See [Migrating from 5.x](#migrating-from-5x).
>
> **Upgrading from 3.x?** The slash-command surface was retired in 4.0.0 — see [Migrating from 3.x](#migrating-from-3x) before running `--update`.

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

## Requirements

- **Node.js ≥ 18** — APED ships as a Node CLI; the bundled scripts also fall back to `node -e` when JSON CLI tools are missing.
- **bash** (any POSIX-compatible shell with `bash` available) — every APED helper is a `.sh` script.
- **`jq`** *(soft dep, recommended)* — preferred JSON manipulator for `sync-log.sh`. Falls back to `node -e` when absent.
- **`yq`** *(hard-required for two paths, soft dep elsewhere)* — preferred YAML manipulator for `sync-state.sh`. **Hard-required** for `migrate-state.sh` (the v1 → v2 schema migration runs on `aped-method --update`), `sync-state.sh mark-story-done` (atomic flip + runtime-fields trim — refuses without yq since 4.1.2), and `sync-state.sh append-correction` (validates required keys + writes to the corrections sister file). Other commands (`set-story-status`, `set-sprint-field`, etc.) keep an awk fallback when yq is absent. Install with `brew install yq` (macOS) or `npm i -g yq`.
- **`gh`** *(soft dep)* — needed for GitHub PR creation, label management, and the `aped-ship` workflow when `git_provider: github`.
- **`workmux`** *(opt-in)* — unlocks parallel-sprint dispatch via tmux windows. See [github.com/raine/workmux](https://github.com/raine/workmux).

Run `aped-method doctor` after install to surface any missing dependencies — non-blocking warnings tell you exactly which feature is degraded by each absence.

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
aped-brainstorm   # (Optional) Diverge first — 100+ ideas before converging
aped-prfaq        # (Optional) Working Backwards — press-release-first discipline
aped-analyze      # Start with guided discovery
```

### Optional: parallel sprints

Once you reach the sprint phase (after `aped-epics`), you can run several stories in parallel via `git worktree`:

```
aped-sprint     # DAG resolver + capacity check + dispatch
```

For the best experience, install [workmux](https://github.com/raine/workmux) (`brew install raine/workmux/workmux`) — APED detects it and will auto-create a tmux window with Claude Code pre-launched per story. Without workmux, `aped-sprint` prints the exact `cd` + `claude` + `aped-dev` commands to run in new terminals.

### Maintenance & optional add-ons

```bash
aped-method doctor                # verify an installed scaffold
aped-method statusline            # install the APED status line
aped-method safe-bash             # install the optional Bash safety hook
aped-method symlink               # repair APED skill symlinks
aped-method post-edit-typescript  # install the optional TS quality hook
aped-method verify-claims         # install the verification-gate advisory hook
aped-method worktree-scope        # install the worktree-scope advisory hook
aped-method tdd-red-marker        # install the TDD RED-witness advisory hook
aped-method enable-mcp            # install aped-state MCP server (typed state.yaml ops)
aped-method session-start         # install the SessionStart skill-index hook
aped-method visual-companion      # install the brainstorm browser companion
aped-method sync-logs prune       # one-shot retention sweep (4.1.0+; default
                                  # dry-run, --apply to delete, --provider=NAME
                                  # to scope; opt-in via sync_logs.retention)
aped-method disable               # suppress all APED skills from natural-
                                  # language routing (6.2.0+, reversible)
aped-method enable                # restore APED skill routing
aped-method status                # report enabled/disabled + last toggle
```

Each opt-in subcommand also accepts `--uninstall` to remove its installed bits.

**4.1.0 lifecycle hygiene** (opt-in unless noted): `sync_logs.retention.{mode, keep_last_n}` config block prunes old audit logs after every sync; `sync-state.sh mark-story-done <key>` is the new atomic helper for the review-done flip (clears runtime fields); `state.yaml` schema bumps to `2` and corrections are split into a sister file at `<output_path>/state-corrections.yaml` (default `docs/aped/state-corrections.yaml`, configurable via `state.corrections_path` — auto-migration on `--update`, idempotent + backed-up). **4.1.2** patches the 4.1.0 schema-v2 helpers: dedup on migration retry, self-heal for legacy wrong pointers, hard-yq for `mark-story-done` and `append-correction`, JSON-safe argument parsing.

## Skill catalog

APED ships **35 skills**. Invoke them by name via Claude Code's Skill tool, or — recommended — let the runtime route automatically by using a phrase that matches the skill's `description:` (e.g. "create the prd", "run an architecture review", "kick off dev"). The phases of the pipeline (Analyze → PRD → UX → Arch → Epics → Story → Dev → Review) plus the utility, ideation, post-ship-routing, and architecture-audit skills are listed inline throughout this README; their full descriptions live in `src/templates/skills/aped-*/SKILL.md` (BMAD directory layout, v6.0.0+) in this repo.

### BMAD micro-file architecture (v6.0.0+)

Every skill is a directory with at least a `SKILL.md` (entry point — the file Claude Code reads first), and optionally a `workflow.md` (high-level phases) plus `steps/step-NN-*.md` (one micro-step per file). The 10 phase skills (`aped-story`, `aped-dev`, `aped-review`, `aped-epics`, `aped-arch`, `aped-ux`, `aped-prd`, `aped-debug`, `aped-brainstorm`, `aped-analyze`) are fully decomposed into 6–12 steps each; the other 24 skills carry their content inline in `SKILL.md` (with `workflow.md` for the medium ones).

Why: keeping each step file under ~250 lines means Claude only loads the slice relevant to the current operation, instead of paging through a 600-line monolith. Validates the same thesis as Anthropic's [code-execution-with-MCP](https://www.anthropic.com/engineering/code-execution-with-mcp) (progressive disclosure of typed tools) and [building a C compiler](https://www.anthropic.com/engineering/building-c-compiler) (decomposition for the model, not the human).

**Typed step I/O contracts (v6.0.0+).** Every step file carries a YAML frontmatter declaring `reads:` / `writes:` / `mutates_state:` against a documented prefix vocabulary (`{{OUTPUT_DIR}}/...`, `state.yaml#...`, `git/...`, `subagent/...`, `mcp/...`, `ticket/...`). The contract is lint-enforced (`tests/step-io-contract-lint.test.js`); it documents what each step touches and serves as the foundation for a future `aped-step.execute(name, inputs)` MCP server.

**ADR sharding (v6.0.0+, in `aped-arch`).** Architectural decisions can persist as separate `docs/aped/adr/000N-{slug}.md` files (Pocock pattern: short, citable, written when a decision is hard-to-reverse + surprising-without-context + a real trade-off). Council-dispatched decisions always qualify. The directory ships with `.gitkeep`; the first ADR creates lazily.

**Domain glossary (v6.0.0+, `aped-glossary`).** New skill maintaining `docs/aped/glossary.md` (canonical project-wide term dictionary). Iron Law: ONE WORD, ONE MEANING, ONE PLACE. Synonyms live under `_Avoid:_` so future skill checks can flag drift. Pocock CONTEXT.md analog.

**Doc hygiene + INDEX (v6.2.0+, `aped-purge`).** Walks `docs/aped/`, classifies each entry as canonical / archived / allowlisted / unknown, regenerates `INDEX.md` as the single entry point. Per-file triage menu for orphan docs the agent might have written outside the APED canon: `[A]rchive` / `[I]nline into a canonical artefact` / `[K]eep+allowlist` / `[D]elete` / `[S]kip`. Read-only by default — moves and deletes only on explicit user choice.

**Artefact contracts (v6.3.0+, WARN-only).** Markdown structural-schema validators ship for `story.md`, `epics.md`, and `epics-context/epic-{N}-context.md`. Each producing skill (`aped-story`, `aped-epics`) invokes the validator after writing the artefact and surfaces drift (invented sections, malformed AC bullets, missing required headings) without blocking state advance. Per-project escape via `--update --yes` and `.aped/.update-allowlist`. Schemas live at `.aped/data/{artefact}.schema.json`; the DSL spec is at `.aped/data/markdown-schema.dsl.md`. Manual run: `bash .aped/scripts/validate-{artefact}.sh <file>`. Escalates to ERROR in 7.0.0 — same playbook as the chantier S `state.yaml` schema in 6.2.0.

**`--update` orphan cleanup (v6.3.0+).** `aped-method --update` now diffs the new templates against the on-disk `{{APED_DIR}}/` and surfaces engine files that no longer have a producer (e.g. step files renamed between releases). Interactive prompt (`[D]elete all` / `[K]eep + allowlist` / `[C]ancel`); `--yes` auto-confirms `Delete`. The `outputDir/` (artefacts), `config.yaml`, `.disable-snapshot.json`, `.DISABLED`, `.archive/`, `checkins/`, `logs/`, and `WORKTREE` are never in scope. An audit log is written to `{{APED_DIR}}/.update-orphans-{ISO}.log` before deletion.

### Migrating from 5.x

The 5.x flat-file scaffolds (`.aped/aped-X.md`) still work — the loader handles both layouts. To pick up the v6.0.0 directory structure on an existing install:

```bash
npx aped-method --update            # rewrites every skill into directory layout, preserves state.yaml + artefacts
```

The branch-creation responsibility also moved in v6.0.0: `aped-story` is now the canonical place that creates `feature/{ticket}-{slug}` and refuses to operate on `main`/`master`/`prod`/`production`/`develop`/`release/*`/detached HEAD. `aped-dev` only verifies the branch — never creates it. Existing `lessons.md` rules referring to `aped-dev` branch creation should be re-scoped to `aped-story`.

### Migrating from 3.x

The 3.x slash-command surface (`/aped-X`, scaffolded as `.claude/commands/aped-*.md`) was retired in **4.0.0**. To upgrade an existing 3.12 install:

```bash
npx aped-method --update         # rewrites the engine; legacy stubs are left in place
rm -rf .claude/commands/aped-*.md   # remove the now-obsolete shells
sed -i '' '/^commands_path:/d' .aped/config.yaml   # drop the dead key (macOS; use `sed -i` on Linux)
```

`aped-method doctor` reports both leftovers as warn-level diagnostics (non-blocking — exitCode stays 0) until they are cleaned up. Existing `lessons.md` entries that filter by `Scope: /aped-X` should be rewritten to `Scope: aped-X` so 4.0 skills load them.

## Operational commands

The CLI also includes a few maintenance subcommands for installed APED projects:

- `aped-method doctor` — verify the scaffold, hooks, state, skills, symlinks, and optional binaries (also flags 3.x slash-command leftovers as info-level diagnostics until the user cleans them up)
- `aped-method statusline` — install an APED-aware Claude Code status line (model · context-window progress bar · project · phase · epic · story · review queue · worktrees · git)
- `aped-method safe-bash` — install the optional Bash safety hook
- `aped-method symlink` — repair APED cross-tool skill symlinks
- `aped-method post-edit-typescript` — install the optional TypeScript post-edit quality hook
- `aped-method verify-claims` — install the verification-gate PostToolUse advisory hook (scans Bash output for forbidden completion phrases without evidence)
- `aped-method worktree-scope` — install the worktree-scope PreToolUse advisory hook (warns when Write/Edit/MultiEdit targets resolve outside the active worktree root in parallel-sprint mode; advisory only — never blocks)
- `aped-method tdd-red-marker` — install the TDD RED-witness PostToolUse advisory hook (warns when production-code Write/Edit/MultiEdit follows a recent test-file edit but no `Confirmed RED:` token appeared in the transcript; Pocock workshop discipline; advisory only — never blocks)
- `aped-method enable-mcp` — install the **aped-state MCP companion server** (4.13.0+; opt-in). Exposes typed atomic ops on `state.yaml` to Claude Code: `aped_state.get(path)` for surgical reads, `aped_state.update(path, value, expect_sha?)` for atomic mutations with optimistic-concurrency, `aped_validate.phase(name)` for the canonical oracle gate. Top-level key allowlist rejects schema typos. Eliminates the entire state.yaml hallucination class. Requires `yq`.
- `aped-method session-start` — install the SessionStart hook that injects `aped/skills/SKILL-INDEX.md` as `additionalContext` at session boot
- `aped-method visual-companion` — install the bash + python3 HTTP server (default port 3737) that powers `aped-brainstorm`'s browser-based mockup/diagram rendering
- `aped-method disable` — (6.2.0+) suppress all APED skills from natural-language routing in this project. Flips `disable-model-invocation: true` on every `.aped/aped-*/SKILL.md`, snapshots the originally-unflagged skills to `.aped/.disable-snapshot.json`, writes a `.aped/.DISABLED` marker. Reversible — see `aped-method enable`. Pass `--local` (6.3.2+) for a per-developer disable: marker only, no frontmatter flips, auto-gitignored — the rest of the team is unaffected on commit.
- `aped-method enable` — (6.2.0+) restore APED routing. Reads the marker mode and either consumes the snapshot (full) or just removes the marker (local, 6.3.2+).
- `aped-method status` — (6.2.0+) report whether APED is currently enabled / disabled / disabled-local (6.3.2+) / disabled-stale (legacy marker) plus the last-toggle timestamp and skill counts.

### Disable APED in a project (6.2.0+)

Want Claude Code without APED auto-routing? `aped-method disable` is a reversible kill-switch.

```bash
cd <project>
npx aped-method disable
# → Disabled APED — 20 newly suppressed, 14 already opt-out.

npx aped-method status
# → APED is disabled — 35 skills (20 newly suppressed, 14 already opt-out).
#   Last toggle: 2026-05-07T...

# Change your mind any time:
npx aped-method enable
# → Enabled APED — restored 20 skills, 14 kept opt-out.
```

**What disable does:**
1. Sets `disable-model-invocation: true` on every `.aped/aped-*/SKILL.md` frontmatter (idempotent — already-flagged skills are left alone).
2. Snapshots the names of the 20 originally-unflagged skills to `.aped/.disable-snapshot.json`.
3. Writes a `.aped/.DISABLED` marker file.

**Defense in depth.** Every skill body now starts with an activation guard that runs `bash {{APED_DIR}}/scripts/check-enabled.sh`. Even if a user types `/aped-X` explicitly to bypass routing, the guard reads the marker / `aped.enabled: false` in `config.yaml` and HALTs the skill silently with a one-liner. No skill work happens while APED is disabled.

**Enable consumes the snapshot.** Only the originally-unflagged skills lose the `disable-model-invocation` line; the 14 always-opt-out skills (`aped-arch`, `aped-grill`, `aped-zoom-out`, etc.) stay opt-out. If the snapshot is missing, `enable` falls back to a best-effort restore (strips the flag from all 34) and warns.

**Local-only disable (6.3.2+; extended in 6.3.3).** When you want APED off in your working copy without committing the change to your team's branch:

```bash
npx aped-method disable --local
# → Disabled APED locally — marker + gitignored config.local.yaml override, no team-wide changes.
#   Added 2 entries to .gitignore: `.aped/.DISABLED`, `.aped/config.local.yaml`.

npx aped-method status
# → APED is disabled (local) — marker only, 35 skills unchanged.

npx aped-method enable
# → Enabled APED — local marker + override removed.
```

Footprint: 2 gitignored files. No `SKILL.md` modifications, no snapshot, nothing to commit. The activation guard `check-enabled.sh` reads `.aped/config.local.yaml` (with `aped.enabled: false`) **with precedence over `.aped/config.yaml`**, so the team-shared config can stay `enabled: true` while the per-developer override halts the runtime check. The `.DISABLED` marker is the binary signal for scripts that don't parse YAML; `config.local.yaml` is the human-grep-able signal that surfaces in any config dump. Mode-conflict (running `--local` against a full-disabled install or vice-versa) exits with a clear "run `aped-method enable` first" message; no hybrid states.

## Personas & teams

APED runs work through **named agent personas** (BMAD-inspired) so each agent stays in character and focuses on its scope. The type of coordination depends on whether specialists need to talk to each other.

### Research subagents — `aped-analyze`
Independent parallel work, no coordination needed.

- **Mary** — Senior Market Analyst. *"Show me the data, not the hype."*
- **Derek** — Domain Expert. *"I know where the bodies are buried."*
- **Tom** — Staff Engineer. *"Every choice has a tax."*

### Review auditors — `aped-review` (slim model since 6.2.0)
Three method-driven auditors dispatched in a single parallel `Agent` message + Aria conditional. The Lead runs `git-audit.sh` inline.

- **Spec auditor** (always) — *"Show me the AC in the test, verbatim."* Every AC has at least one test asserting it; every `[x]` task has code evidence at file:line.
- **Code auditor** (always) — *"Security and performance are non-negotiable."* File-surface aware: backend / frontend / infra / cross-layer lenses adapt to what the story touched. Includes the 5 testing anti-patterns audit.
- **Edge & hallucination auditor** (always) — *"What happens at the boundary? And does this identifier even exist?"* Boundary conditions + production identifiers absent from the diff context.
- **Aria** — Visual / Design Engineer (frontend + preview app only) — validates dev's React Grab pass via MCP, doesn't redo it.

The 11-specialist roster (Eva / Marcus / Rex / Diego / Lucas / Kai / Sam / Hannah / Eli / Aaron) is superseded — see `docs/aped-personas.md` for the lineage.

### Fullstack dev team — `aped-dev` (optional mode)
Triggered when a story touches ≥ 2 layers. Contract-first coordination via `SendMessage`.

- **Kenji** — API Designer. Owns the oRPC/OpenAPI contract.
- **Amelia** — Senior Backend. Implements against Kenji's contract.
- **Leo** — Senior Frontend. UI against the contract + visual verification via React Grab.

### Architecture Council — `aped-arch` (for high-stakes decisions)
Dispatched in parallel via `Agent` when a Phase-2 decision would cost weeks to reverse (primary database, auth model, API paradigm, frontend framework, infra platform). Each specialist thinks independently — no shared context, no convergence pressure — and returns a structured verdict (preferred option, rationale, top 2 risks, disqualifying conditions).

- **Winston** — Systems Architect (always included). *"Boring tech for MVP. Cleverness costs operationally."*
- **Lena** — Pragmatic Engineer. *"What ships fastest without regret?"*
- **Raj** — Security & Compliance Reviewer. *"Assume breach. Assume audit."*
- **Nina** — Cost & Ops Analyst. *"What does this cost at 10× scale? And when does it page us at 3am?"*
- **Maya** — Edge Case Hunter. *"Where does this break?"*

User picks the final option; the minority view gets documented as signal for future pivots. Escape hatch for MVP-scale decisions where the Council would be overkill.

### Retrospective specialists — `aped-retro`
Three parallel subagents reading post-mortem data after an epic completes.

- **Mia** — Struggle Analyzer. Patterns across dev notes, review feedback, technical debt.
- **Leo** — Velocity & Quality Analyzer. Review rounds, complexity vs effort, quality signals.
- **Ava** — Previous-Retro Auditor. Continuity check — did the prior retro's action items actually ship?

### Tool surface used
`Agent` (all specialist dispatches), `TaskCreate`/`TaskUpdate`/`TaskList` (sprint task tracking), plus `TeamCreate` / `TeamDelete` / `SendMessage` in `aped-dev` fullstack mode only — because Kenji, Amelia and Leo genuinely co-edit a shared contract. Review is pure validation, so it skips the team machinery entirely.

## Design principles

### User controls the pace
No auto-chaining between phases. Every skill ends with "Run `aped-X` when ready." The user decides when to proceed, review, or backtrack. GATE blocks (⏸) mark every write / state change that requires approval.

### A/P/C menu at every gate
Where a skill is about to commit a load-bearing artefact (PRD section, epic structure, architecture decision, retro action items, UX prototype, PRFAQ press release / internal FAQ), it presents the same menu and HALTs. `[A]` invokes `aped-elicit` (advanced critique toolkit — socratic, pre-mortem, red team, tree of thoughts, etc.). `[P]` (where it appears) dispatches a multi-specialist sub-team via `Agent` (e.g., Sam + Eva + a PM persona to challenge the epic structure). `[C]` continues. Direct user feedback is always accepted as a fallback. Same vocabulary across the seven gated skills — mental model stays consistent.

### Conversational coaching, not silent generation
`aped-brainstorm` Phase 3 generates ideas one element at a time with explicit HALT for the user's response, then reacts via three coaching patterns (basic answer → dig; detailed answer → build; stuck → seed). Energy checkpoint every 4-5 exchanges with [K]eep / [S]witch / [P]ivot / [D]one. End-of-technique menu with [K]eep / [T]ry new / [A]dvanced elicit / [B]reak / [C]onverge. Anti-bias domain pivot every 10 ideas. The "NEVER generate ideas in silent batches" rule is in Critical Rules.

### Headless mode for autonomous workflows
`aped-prd --headless` and `aped-prfaq --headless` skip every menu and produce the artefact straight-through, equivalent to the pre-3.9 behaviour, for CI / scripted workflows. Default mode is interactive with the A/P/C menus. `--plan-only` on `aped-sprint` and `aped-ship` is the symmetric flag on the sprint side: dry-run, prints the commands that would have run, no mutation.

### Binary review outcomes
`aped-review` only transitions `review → done` (all findings resolved or dismissed) or stays `review` (user fixes and re-runs). No `in-progress`, no `[AI-Review]` purgatory.

### Visual verification as a first-class step
Frontend tasks get a visual check at **every GREEN pass**, not just at review time. `mcp__react-grab-mcp__get_element_context` inspects the live preview app; `aped-review`'s Aria validates rather than re-running from scratch. Fallback: if MCP is unavailable, warn and defer to review — never block dev.

### Ticket system as source of truth
The Linear / Jira / GitHub / GitLab ticket is the shared artifact between the AI and the human team. `aped-story`, `aped-dev`, and `aped-review` fetch the ticket at the start of each phase; any divergence with the local story halts the flow until the user resolves it.

### Input discovery — consume-everything-found
Every pipeline-phase skill starts with a glob-based discovery step that loads every upstream APED artefact present (`product-brief.md`, `prd.md`, `architecture.md`, `ux/`, `project-context.md`, `lessons.md`, completed `stories/`, etc.) before any work. Greenfield versus brownfield is **detected** from `project-context.md` presence, not declared via a separate command — `aped-context` and `aped-analyze` are not mutually exclusive entry points. Required prereqs hard-stop with a clear remediation message (e.g. architecture without a PRD), optional artefacts bias the workflow when present. The pattern is documented in `docs/dev/discovery-pattern.md`.

### Lessons feedback loop
`aped-retro` writes scoped rules to `docs/aped/lessons.md` after each epic (`Scope: aped-story | aped-dev | aped-review | all`). Those scopes are now the routing system the field always promised: `aped-story`, `aped-dev`, and `aped-review` discover and apply lessons matching their scope at entry. A lesson scoped `aped-review` becomes an explicit specialist check, not advisory text — if the relevant specialist can't confirm the rule was applied, that's a finding. The loop closes: each new epic carries the lessons of every prior epic, automatically.

### Guided discovery over questionnaires
`aped-analyze` uses 4 rounds of conversational discovery — Claude probes deeper on vague answers and helps the user think through their project, instead of a flat list of questions. In brownfield mode (when `project-context.md` exists), the rounds reframe as "what's *new* relative to the existing system" rather than from-scratch ideation.

### Stories created one at a time
`aped-epics` writes the plan (titles / ACs / scope) without creating per-story files. `aped-story` produces one detailed story file right before implementation, grounded in upstream artefacts loaded by Input Discovery (PRD FRs, UX components, architecture patterns, project context, lessons, prior stories of the same epic).

### Epic context cache
Before implementing each story, `aped-dev` checks `docs/aped/epic-{N}-context.md`. If missing or stale, a sub-agent compiles it once from PRD / architecture / UX / `project-context.md` (brownfield only) / `lessons.md` (scoped to `aped-dev`) / completed stories / codebase patterns. Reused across every story in the epic — one compile, many reads.

### Spec isolation — `aped-quick`
Quick specs are independent files with a status field (`draft → in-progress → done`). Multiple can run in parallel. Resuming an in-progress spec is automatic.

### External ticket intake — `aped-from-ticket`
For tickets that bypass the planning flow — production bugs, partner asks, mid-sprint requests — `aped-from-ticket <ticket-id-or-url>` is a single-shot bridge. It reads `ticket_system` from config (Linear / Jira / GitHub Issues / GitLab Issues — provider parity is mandatory; `none` is refused early), verifies the right toolchain is available (`gh`/`glab` CLI for github/gitlab, Linear MCP for Linear, Jira/Atlassian MCP for Jira), fetches the ticket, compiles project context (PRD overlap, architecture constraints, related stories, codebase patterns), drafts a project-conformant story collaboratively with a ⏸ GATE before writing, persists it under either an `external-tickets` bucket or an auto-matched epic, registers it in `state.yaml` with `source: from_ticket` (out-of-sprint by default — explicit promotion required), and ends with a 3-option handoff prompt (`[D]` run aped-dev / `[P]` promote to active sprint / `[S]` stop). All knobs live under `from_ticket:` in `.aped/config.yaml` with sensible defaults; comment-back to the source ticket is opt-in.

### Out-of-scope knowledge base

When a scope decision says "no" — a feature rejected for design / strategy / capacity reasons — APED can persist that decision in `.aped/.out-of-scope/<concept>.md`. Each entry has frontmatter (`concept`, `rejected_at`, `decided_by`), a `## Why this is out of scope` paragraph linking to the PRD section / FR ID / design doc that establishes the boundary, and a `## Prior requests` append-only list of times the request resurfaced. `aped-from-ticket` and `aped-quick` scan the directory before drafting, surfacing matches as a `[K] Keep refusal / [O] Override + log this request / [U] Update entry — rejection is stale` menu. Resolved entries are renamed (`<concept>-resolved-YYYY-MM-DD.md`), never deleted, so the audit trail survives. The directory ships empty (only a README explaining the format) at `npx aped-method` time; populate it when scope decisions warrant it. Pattern inspired by Pocock skills' `.out-of-scope/` convention.

### Parallel sprint via worktrees — `aped-sprint` + `aped-lead` + `aped-ship`

When an epic has several stories ready to go, `aped-sprint` resolves the story DAG (`depends_on:` in `epics.md` and `state.yaml`), then dispatches up to `parallel_limit` stories (default 3) — each in its own `git worktree` at `../{project}-{ticket}` on a story branch. Reviews are bounded too (`review_limit`, default 2) and spill to a `review-queued` status when the limit is reached. An `upstream-lock` PreToolUse hook denies any edit to `prd.md` / `architecture.md` / `ux/` while a story is in-progress; only `aped-course` can temporarily unlock — and it notifies every active worktree ticket before and after the change.

**Sprint umbrella branch convention.** `aped-sprint` creates `sprint/epic-{N}` from `origin/<base>`, pushes it, and records it in `state.yaml` at `sprint.umbrella_branch`. Story feature branches are cut from the umbrella (not from base). `aped-review` opens story PRs with `--base $UMBRELLA`. As `aped-lead` approves `review-done`, story PRs are merged into the umbrella au-fil-de-l'eau (one merge per approval). `aped-ship` opens the final `gh pr create --base <base> --head sprint/epic-{N}` — base only ever sees commits via that one PR. Compatible with branch protection on main out of the box.

**Two-tier architecture: Lead Dev ↔ Story Leaders.** Stories don't run on autopilot. Each Story Leader (the Claude session inside a worktree) posts a check-in at every transition and HALTs:

- `story-ready` — posted by `aped-story` at dispatch (worktree mode)
- `dev-done` — posted by `aped-dev` when implementation + tests converge
- `dev-blocked` — posted by `aped-dev` before HALT (new dep, repeat failure, ambiguity, missing config) — `aped-lead` always escalates this one
- `review-done` — posted by `aped-review` when the story flips to `done`

You run `aped-lead` in the main project whenever you want to process the batch. The Lead Dev calls `.aped/scripts/check-auto-approve.sh` for **deterministic verdicts** (no LLM judgement on the auto-path): `story-ready` verifies the story file is committed + ACs use Given/When/Then + all `depends_on` are done; `dev-done` checks `.aped/.last-test-exit == 0` + tasks all `[x]` + clean tree + file list matches `git-audit.sh`; `review-done` verifies status `done` + no `aped-blocked-*` label + PR `MERGEABLE` + PR `baseRefName == umbrella`. Exit `0` = AUTO, exit `1` = ESCALATE with reasons. Approvals `tmux send-keys` the next command into the right worktree window (fallback: print the command for you to run manually).

**State.yaml authority is in main, divergence in worktrees is normal.** Each worktree writes its local state.yaml on its feature branch; main's copy is the authoritative one written by `aped-lead`. `aped-ship` resolves state.yaml conflicts at merge with `--ours` **by design**, not as a workaround. State.yaml carries `schema_version: 1` (validated by `validate-state.sh`; unknown versions exit 4 to force an explicit migration).

**`aped-ship` flow.** Loads `sprint.umbrella_branch` → Integration Check (every done story merged into the umbrella, both `git branch --merged` and the `merged_into_umbrella` flag agree) → Composite Review on `origin/<base>..$UMBRELLA` (secrets scan, debug-marker scan, typecheck, lint, db:generate, state.yaml consistency, leftover worktrees) → push umbrella + print `gh pr create --base <base> --head $UMBRELLA` with the composite summary as the PR body. The skill never pushes to base, never mutates the umbrella content. Inboxes are archived to `.aped/checkins/archive/{date}/` so the next sprint starts fresh.

**Drift detection.** `.aped/scripts/check-active-worktrees.sh` reconciles `state.yaml` ↔ disk: for every story marked `in-progress | review-queued | review` with a non-null `worktree`, it verifies the path exists. `aped-sprint` calls it before computing capacity (so a `rm -rf`'d worktree no longer holds a dispatch slot); `aped-lead` and `aped-status` surface the drift as a `✗ MISSING` row.

**Audit log.** `.aped/scripts/log.sh` appends JSONL events to `.aped/logs/sprint-{YYYY-MM-DD}.jsonl` — `checkin.sh` emits `post / approve / block / push` automatically; `sprint-dispatch.sh` emits `worktree_created`; skills emit `dispatch_started`, `merge_done`, `pr_recommended`. Best-effort, never fails the caller. Useful for postmortems on a botched sprint.

**`--plan-only`.** `aped-sprint` and `aped-ship` accept `--plan-only`: runs through Setup → Discovery / Capacity → Proposal / Findings, then STOPS before any mutation. Prints the commands that would have run. Use it for pre-flight inspection on a sensitive sprint.

**Dispatch has two paths**, picked automatically:

- **With [workmux](https://github.com/raine/workmux)** (recommended) — APED detects `workmux` in `$PATH` and calls `workmux add -a claude` per story. The Claude session sits idle in its tmux window until `aped-lead` approves the `story-ready` check-in and pushes `aped-dev {story-key}` via `tmux send-keys`. Live TUI dashboard via `workmux dashboard`, one-command cleanup via `workmux merge`. A starter `.workmux.yaml` ships at `.aped/templates/workmux.yaml.example`.
- **Without workmux** (fallback) — `.aped/scripts/sprint-dispatch.sh` creates the worktree + branch + marker file. `aped-lead` still gates transitions but prints the exact commands for you to run manually in each worktree.

**Check-in backend.** Ticket system (Linear / GitHub / GitLab / Jira) with `aped-checkin-*` / `aped-approved-*` / `aped-blocked-*` labels + structured comments. If `ticket_system: none`, falls back to JSONL inboxes under `.aped/checkins/`. Concurrent-safe via a portable `mkdir`-based lock (macOS-compatible).

## What gets scaffolded

```
.aped/                              # Engine (update-safe)
├── config.yaml                     # Project settings, integrations
├── hooks/
│   ├── guardrail.sh                # UserPromptSubmit coherence hook
│   └── upstream-lock.sh            # PreToolUse hook (deny upstream writes during sprint)
├── scripts/
│   ├── sprint-dispatch.sh          # Creates worktree + branch + marker (branches from umbrella)
│   ├── worktree-cleanup.sh         # Removes worktree, optionally deletes branch
│   ├── sync-state.sh               # Atomic state.yaml mutations (yq-preferred, awk fallback)
│   ├── checkin.sh                  # Lead/Leader coordination (post/poll/approve/push/archive)
│   ├── check-auto-approve.sh       # Deterministic verdicts for aped-lead (story-ready/dev-done/review-done)
│   ├── check-active-worktrees.sh   # Reconciles state.yaml ↔ disk; surfaces drift
│   └── log.sh                      # JSONL audit log (.aped/logs/sprint-{date}.jsonl)
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
├── aped-review/                    # Slim review (Spec / Code / Edge auditors + Aria conditional)
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
├── aped-from-ticket/               # External ticket intake (Linear/Jira/GH/GL → story bridge)
├── aped-checkpoint/                # Human-in-the-loop review
├── aped-claude/                    # CLAUDE.md smart merge
├── aped-brainstorm/                # Divergent ideation (upstream of aped-analyze)
├── aped-prfaq/                     # Working Backwards challenge (upstream)
├── aped-retro/                     # Post-epic retrospective (Mia/Leo/Ava specialists)
├── aped-elicit/                    # Horizontal critique toolkit (19 methods)
└── aped-glossary/                  # Project-wide domain dictionary (Pocock CONTEXT.md analog)

docs/aped/                          # Output (evolves during project)
├── state.yaml                      # Pipeline state machine
├── product-brief.md                # aped-analyze
├── prd.md                          # aped-prd
├── ux/                             # aped-ux (spec + preview app)
├── architecture.md                 # aped-arch (rolling structure)
├── adr/                            # aped-arch — sharded ADRs (000N-{slug}.md, Pocock pattern)
├── epics.md                        # aped-epics
├── stories/                        # aped-story (one file per story)
├── epic-{N}-context.md             # Compiled epic context (cached)
├── quick-specs/                    # aped-quick
├── brainstorm/                     # aped-brainstorm sessions
├── prfaq.md                        # aped-prfaq (5-stage artefact)
├── retros/                         # aped-retro (one file per epic)
├── glossary.md                     # aped-glossary (canonical domain terms)
└── lessons.md                      # aped-retro distilled lessons (cross-epic continuity)

.claude/
├── skills/aped-*                   # → ../../.aped/aped-*  (symlinks, Claude Code)
└── settings.local.json             # UserPromptSubmit + PreToolUse hooks + pre-approved Bash permissions

# Cross-tool symlinks (only created if the parent marker dir already exists):
.opencode/skills/aped-*             # → ../../.aped/aped-*  (symlinks, OpenCode)
.agents/skills/aped-*               # → ../../.aped/aped-*  (symlinks, Codex CLI / agents.md)
.codex/skills/aped-*                # → ../../.aped/aped-*  (symlinks, Codex native)
```

### Cross-tool skill distribution

On macOS/Linux the scaffolder creates **relative symlinks** that point back to the canonical `.aped/aped-*` directories, one edit in `.aped/` propagates to every tool instantly — no manual sync, no drift. Since v4.0.0 four targets are **auto-detected**: a symlink tree is created under `.claude/skills/`, `.opencode/skills/`, `.agents/skills/`, and/or `.codex/skills/` **only when the corresponding `.claude` / `.opencode` / `.agents` / `.codex` marker directory already exists** in the project. A single-tool Claude Code project still gets `.claude/skills/aped-*` symlinks (the scaffold pre-creates `.claude/` on a greenfield install so the auto-detect picks Claude Code up); multi-tool setups get the rest only where their marker exists.

Windows hosts are auto-skipped (symlinks require developer mode + `core.symlinks=true`). Fresh mode wipes stale `aped-*` entries in every location APED has ever written to (including any leftover `.claude/commands/aped-*.md` stubs from 3.x); update mode fixes wrong-target symlinks and preserves regular files at the target path.

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

Flow: `aped-epics` seeds milestones + issues with labels (🆕 / 🔄 / 🔁) and sizes (S/M/L). `aped-story` fetches the ticket (the team may have edited it — the ticket wins). `aped-dev` fetches again before implementation; any divergence HALTs until resolved. `aped-review` posts the review report as a comment and updates status.

### Git providers

| Provider | PR/MR creation | Branch strategy |
|----------|---------------|-----------------|
| `github` | `gh pr create` | `feature/{ticket}-{slug}` |
| `gitlab` | `glab mr create` | `feature/{ticket}-{slug}` |
| `bitbucket` | Web UI | `feature/{ticket}-{slug}` |

### MCP tools

- **`react-grab-mcp`** — live component inspection for UX design, visual verification in `aped-dev` (at every GREEN pass on frontend tasks) and validation in `aped-review` (Aria specialist).

## Hooks

Core APED installs two hooks into `.claude/settings.local.json`:

### `guardrail.sh` — UserPromptSubmit (advisory)

Every prompt is intercepted. The hook checks pipeline coherence against `state.yaml` and actual story statuses, injects advisory context, and never blocks. It honours `$CLAUDE_PROJECT_DIR` and validates `current_phase` against a whitelist (`none` / `analyze` / `prd` / `ux` / `architecture` / `sprint`) to reject any garbage.

| Situation | Reaction |
|-----------|----------|
| Coding without epics | Warns: run Analyze → PRD → Epics first |
| PRD without brief | Warns: run `aped-analyze` first |
| Epics without PRD | Warns: run `aped-prd` first |
| Review without a story in review status | Warns: run `aped-dev` first |
| Modifying PRD during sprint | Warns: use `aped-course` for scope changes |
| Quick fix request | Bypasses (that's what `aped-quick` is for) |

Timeout 5s; JSON encoding prefers `jq` → `node` (no regex fallback, no context injection risk).

### `upstream-lock.sh` — PreToolUse (enforcement)

Matches `Write | Edit | NotebookEdit`. Denies any write into `prd.md` / `architecture.md` / `product-brief.md` / `ux/*` while any story in `state.yaml` has status `in-progress`. Only `aped-course` can set `sprint.scope_change_active: true` to temporarily unlock; the skill is responsible for clearing the flag and invalidating epic-context caches before exit.

This is what makes parallel sprint safe: several worktrees can implement on the upstream contract without risk of mid-sprint rug-pulls.

### Optional hooks

These are installed explicitly when you want them:

- `aped-method safe-bash` adds a focused `PreToolUse` Bash validator for obviously dangerous shell commands (`rm -rf /`, `rm -rf $HOME`, `curl | bash`, disk utilities, broad `chmod -R 777`, and `sudo` confirmation). **Best-effort UX safety net, not a security boundary** — crafted commands bypass it trivially. See [SECURITY.md](./SECURITY.md) for scope and limits.
- `aped-method post-edit-typescript` adds a `PostToolUse` hook for `Write|Edit|MultiEdit` that detects TypeScript files and runs local `prettier --write` / `eslint --fix` only when those binaries are already available in the project. Silent no-op when they are not installed.
- `aped-method statusline` installs a Claude Code status line that renders the current APED phase, active epic / story, review queue, worktree count, and git branch from `docs/aped/state.yaml`. If a `statusLine` is already configured, the install prompts before overwriting.
- `aped-method verify-claims` adds a `PostToolUse` Bash advisory hook that scans tool output for the 9 forbidden completion phrases (`should work`, `looks good`, `Done!`, `Perfect!`, etc.) when no evidence pattern (test output, exit 0, `✓`, `PASS`) is found within `verify_claims.evidence_window` lines. Never blocks; advisory only. Configurable via `verify_claims.enabled` in `config.yaml`.
- `aped-method session-start` adds a `SessionStart` hook (matchers `startup|clear|compact`) that reads `aped/skills/SKILL-INDEX.md` and emits its content as `additionalContext`. The skill index is generated deterministically at scaffold time. Disable via `skill_invocation_discipline.enabled: false` in `config.yaml`.
- `aped-method visual-companion` ships a bash + python3 HTTP server (`aped/visual-companion/start-server.sh`) that serves `frame-template.html` with the CSS classes (`.options`, `.cards`, `.mockup`, `.mock-*`) used by `aped-brainstorm` for browser-based mockup/diagram rendering. Port from `config.yaml visual_companion.port` (default 3737). Localhost-only. No auto-launch in default scaffold.
- `aped-method worktree-scope` adds a `PreToolUse` advisory hook that warns when `Write`/`Edit`/`MultiEdit` targets resolve outside the active worktree root in parallel-sprint mode. Advisory only — never blocks.
- `aped-method tdd-red-marker` adds a `PostToolUse` advisory hook that warns when production-code edits follow a test-file edit without a `Confirmed RED:` token in the transcript. Pocock workshop discipline. Advisory only.
- `aped-method enable-mcp` installs the **aped-state MCP companion server** (4.13.0+). Typed atomic ops on `state.yaml`: `aped_state.get`, `update`, `advance`, `lock`/`unlock`, `describe`, `aped_context.load`, `aped_validate.phase`. Plus `aped-ticket` provider-routed adapter (GitHub/Linear/Jira/GitLab).
- `aped-method allowed-paths-scope` adds a `PreToolUse` advisory hook (5.1.0+) that reads the active skill's `allowed-paths` frontmatter and warns when Write/Edit targets a file outside scope.
- `aped-method commit-gate` adds a `PostToolUse` advisory hook (5.5.0+) that warns after 5+ uncommitted file changes. Structural enforcement of the "one commit per GREEN gate" discipline. Advisory only.

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

- **[workmux](https://github.com/raine/workmux)** — enables the parallel-sprint sweet spot: `aped-sprint` auto-creates tmux windows with Claude Code pre-launched in each worktree. Install with `brew install raine/workmux/workmux` (macOS/Linux). Fully optional: APED falls back to manual worktree + terminal instructions if absent.
- **[yq](https://mikefarah.gitbook.io/yq)** (v4) — strongly recommended for `aped-sprint`/`aped-lead`/`aped-ship`: state.yaml mutations and reads use yq when present, with a more fragile awk fallback otherwise. Install with `brew install yq` (macOS) or `snap install yq` (Linux).
- **[jq](https://jqlang.github.io/jq/)** — speeds up the guardrail hooks' JSON encoding and the audit log writer (`scripts/log.sh`). Optional; APED falls back to defensive shell quoting otherwise.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for the full version history.

## Troubleshooting

Common issues (symlinks not appearing, `--update` overwrote a file, guardrail blocking prompts, etc.) are covered in [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md).

## Security

Threat model, hardening already in place, and how to report a vulnerability: see [SECURITY.md](./SECURITY.md). Use GitHub Security Advisories for private reports; do not file public issues for security problems.

## License

MIT — see [LICENSE](./LICENSE).
