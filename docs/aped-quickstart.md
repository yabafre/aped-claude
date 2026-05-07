
---
tags:
  - aped
  - onboarding
  - quickstart
  - en
---

# APED — Team Quickstart

**5 minutes to get started with APED.** For the detail: [APED — Workflow](.aped-workflow.md), [APED — Phases](.aped-phases.md), [APED — Personas & Teams](.aped-personas.md).

---

## 1. What is APED?

A disciplined dev pipeline for [Claude Code](https://claude.ai/download), scaffolded by `npx aped-method`. It turns Claude Code into a **user-driven process**: each phase produces an artifact, asks for your validation, and blocks skipped steps via a hook.

**The flow**: `Analyze → PRD → UX → Arch → Epics → Story → Dev → Review`

**35 skills** cover it all: ideation, critique, parallel sprint, external ticket intake, retrospective, pre-mortem, design exploration, issue triage, and maintenance. Invoked via natural-language triggers or the Skill tool. Since v6.0.0, every skill is a directory with at least a `SKILL.md` (the entry the loader reads) — the 10 phase skills also carry `workflow.md` + `steps/step-NN-*.md` files so Claude only loads the slice relevant to the current operation.

---

## 2. Install APED in a project

Prereqs: **Claude Code** + **Node 18+** + `git`.

```bash
cd your-project
npx aped-method
```

Answer the interactive prompts (project name, author, languages, ticket system, git provider).

Or non-interactive:

```bash
npx aped-method --yes \
  --project=my-app --author=Jane \
  --lang=english --tickets=linear --git=github
```

**Optional but recommended**:

```bash
brew install raine/workmux/workmux  # for parallel sprint mode
```

---

## 3. First commands in Claude Code

Open Claude Code in the project, then (in order, **no auto-chaining**):

```
aped-brainstorm     # (optional) diverge if the idea is fuzzy
aped-prfaq          # (optional) Working Backwards
aped-analyze        # guided discovery — 4 conversational rounds
aped-prd            # generates the PRD
aped-ux             # ANF framework + React preview
aped-arch           # architecture (Council mode for high-stakes decisions)
aped-epics          # break into epics + seed tickets
aped-story          # one story at a time
aped-dev            # TDD red-green-refactor
aped-review         # adversarial, min 3 findings
```

**On existing codebase** (since 3.10.2): run `aped-context` first to produce `project-context.md`, then `aped-analyze` (it auto-detects brownfield mode from the context file and reframes Discovery accordingly). They are no longer exclusive — both can run on the same project, and every downstream skill auto-consumes `project-context.md` when present.

**Quick fix / hotfix**: `aped-quick <title> [fix|feature|refactor]` — bypasses the whole pipeline.

**Mid-sprint ticket** (production bug, partner ask, anything not planned via `aped-epics`): `aped-from-ticket <ticket-id-or-url>` — fetches the ticket from your configured `ticket_system`, drafts a project-conformant story, registers it in `state.yaml` (out-of-sprint by default — explicit promotion required), and ends with a 3-option handoff (`[D]` run aped-dev / `[P]` promote to sprint / `[S]` stop). Refuses early if `ticket_system: none`.

---

## 4. The 5 golden rules

### 🚪 Gates (⏸) are mandatory
Every phase ends with "Run `aped-X` when ready". **Never skip a step** — the guardrail hook blocks and warns you. If you must skip (edge case), do it knowingly.

### 🎯 The ticket is the source of truth
Linear / Jira / GitHub / GitLab — whatever the provider, **the ticket wins** on divergence with the local story. `aped-story`, `aped-dev` and `aped-review` re-fetch the ticket and HALT on divergence. Consequence: if the human team edited the ticket, the AI must align — not the other way around.

### 🔒 No upstream edits during a sprint
The `upstream-lock` hook **denies** any edit on `prd.md` / `architecture.md` / `ux/` while a story is `in-progress`. To fix scope: `aped-course <description>` — it's the only way, and it notifies every active worktree.

### 👁️ Binary review outcomes
`aped-review` has two outcomes: **`done`** (all resolved/dismissed) or stay in **`review`** (you fix and re-run). No `[AI-Review]` limbo. Minimum 3 findings — if the reviewer finds nothing, they're looking wrong.

### ⚡ One story at a time (nominal)
`aped-epics` plans the big picture. `aped-story` creates **one** detailed story file, right before implementation. This prevents drift between plan and reality. For parallelization → switch to sprint mode.

---

## 5. Parallel sprint mode (once an epic is ready)

Useful when several stories are **independent** (no cross-dependencies).

```
aped-sprint             # from main project: creates the umbrella + dispatches DAG + worktrees
aped-lead               # batch-approve check-ins (periodic return); merges story PRs into umbrella au-fil-de-l'eau
aped-ship               # end-of-sprint: composite review + umbrella → base PR
```

- Up to **3 stories** in parallel by default (`sprint.parallel_limit`), **2 reviews** max (`sprint.review_limit`) — both read from `{{APED_DIR}}/config.yaml` since 6.1.0 (state.yaml fallback for v2 scaffolds)
- Each story runs in `../{project}-{ticket}-{story-key}` on branch `feature/{ticket}-{story-key}` (path includes the story key since 6.1.0 to prevent collisions when multiple stories share a parent ticket)
- With **workmux**: auto-tmux + Claude pre-launched. Without: commands printed for you to run manually.
- Story Leaders HALT at every transition (`story-ready`, `dev-done`, `review-done`) and wait for the Lead Dev
- A **sprint umbrella branch** (`sprint/epic-{N}`) parents every story branch and is the only thing that ships to base. `aped-lead` merges each story PR into the umbrella the moment it approves the `review-done` check-in (au-fil-de-l'eau, with merge-completion polling); `aped-ship` opens the umbrella → base PR with a composite review.

**Golden rule**: you are the Lead Dev. `aped-lead` auto-approves what is clearly safe (tests 100%, git clean, no blockers) and **escalates everything else to you**. No story on autopilot.

### Sprint config knobs (config.yaml)

```yaml
base_branch: main                # umbrella is cut from this ref; aped-ship targets it
sprint:
  parallel_limit: 3              # max stories dispatched concurrently
  review_limit: 2                # max parallel reviews (specialists are token-heavy)
  push_umbrella_on_create: true  # set false on offline / branch-protected workflows
  merge_poll_timeout_seconds: 120 # aped-lead polls gh pr view until MERGED
review:
  parallel_reviewers: false      # deprecated in 6.2.0 — slim model folds Edge & hallucination
                                  # into the always-on auditor set, so this flag is now inert
```

---

## 6. Quick troubleshooting

```bash
aped-method doctor          # verifies scaffold, hooks, state, commands, symlinks
aped-method symlink         # repairs cross-tool symlinks if needed
aped-status                # sprint dashboard (inside Claude Code)
aped-method status          # (6.2.0+) check whether APED routing is enabled
aped-method disable         # (6.2.0+) suppress APED routing in this project
aped-method enable          # (6.2.0+) restore APED routing
```

### 6.1 Strict state.yaml schema (6.2.0+, WARN-only — ERROR in 7.0.0)

v6.2.0 ships a draft 2020-12 JSON Schema for `state.yaml v3` at `.aped/data/state.yaml.schema.v3.json`. `validate-state.sh` runs it via `npx -y ajv-cli@^5` and surfaces drift as stderr `WARN` lines:

- Invented sub-blocks under `pipeline.phases.<phase>` (e.g. `design_system`, `councils_retired`).
- Free-form story fields (e.g. `verdict`, `review_notes`, `dev_completed_at`) — those belong in the story file's Review Record, not state.yaml.
- Out-of-taxonomy phase statuses.
- `sprint.parallel_limit` / `sprint.review_limit` (moved to `config.yaml.sprint.*` in v3 — run `migrate-state.sh` to relocate).

**Rollout.** 6.2.0 is **WARN-only** — your skills keep working. **7.0.0 escalates to ERROR**: validate-state.sh exits non-zero on drift, blocking the skills that call it at Setup. The 6.x cycle is the grace window to clean drift.

**Skip.** If `yq` / `npx` / network is unavailable, the schema check skips gracefully with a single `WARN: schema check skipped (...)` and exits 0. No CI break in air-gapped pipelines.

See `docs/TROUBLESHOOTING.md` §27 for fix patterns.

### 6.2 Artefact contracts (6.3.0+, WARN-only — ERROR in 7.0.0)

v6.3.0 extends the structural-validation pattern from `state.yaml` (chantier S, 6.2.0) to three pipeline-critical markdown artefacts: `story.md`, `epics.md`, and `epics-context/epic-{N}-context.md`. JSON schemas ship at `.aped/data/{artefact}.schema.json`; the DSL spec is at `.aped/data/markdown-schema.dsl.md`.

**Producer-side gates run automatically:**

- `aped-story` step-06 invokes `validate-story.sh` after the file write — drift surfaces as stderr WARN, state stays at `pending`.
- `aped-story` step-02 invokes `validate-epic-context.sh` after the cache is written or refreshed — drift surfaces, the cache is engine-owned (re-run aped-story to fix).
- `aped-epics` step-07 invokes `validate-epics.sh` between the file write and the state.yaml advance — drift blocks the state advance until fixed.

**What gets caught.** Invented sections (`### Verdict` outside the contract), missing required headings, malformed AC bullets (no `Given/When/Then`), missing `## FR Coverage Map` in `epics.md`, missing `## Previous stories — outcomes` in the cache (which would silently break `aped-review`'s append).

**Manual run:**

```bash
bash .aped/scripts/validate-story.sh docs/aped/stories/1-1-foo.md
bash .aped/scripts/validate-epics.sh docs/aped/epics.md
bash .aped/scripts/validate-epic-context.sh docs/aped/epics-context/epic-1-context.md
```

Exit `0` = conformant. Exit `1` = drift (stderr names file:line and class). Exit `2` = unreadable schema/target.

**Rollout.** 6.3.0 is **WARN-only** — drift surfaces but doesn't block state advance (except for `aped-epics` step-07, which holds before the state.yaml mutation since the FR Coverage Map is consumed downstream). **7.0.0 escalates to ERROR.** See `docs/TROUBLESHOOTING.md` §29-31 for fix patterns per validator.

### 6.3 `--update` orphan cleanup (6.3.0+)

`aped-method --update` previously left engine files behind when templates were renamed/removed between releases (concretely: 6.1→6.2 left 12 stale `aped-review/steps/step-*.md` files). v6.3.0 surfaces these orphans during `--update`:

```bash
npx aped-method --update              # interactive: [D]elete all / [K]eep+allowlist / [C]ancel
npx aped-method --update --yes        # non-interactive: auto-Delete
```

Per-project escape hatch: `.aped/.update-allowlist` (one path per line, `#` comments allowed). `[K]eep + allowlist` appends paths so future `--update` runs respect them. Engine paths only — `outputDir/` artefacts, `config.yaml`, `.disable-snapshot.json`, `.DISABLED`, `.archive/`, `checkins/`, `logs/`, `WORKTREE` are never in scope. Audit log at `.aped/.update-orphans-{ISO}.log`. See `docs/TROUBLESHOOTING.md` §32.

### 6.4 Disabling APED (6.2.0+)

If you want Claude Code without APED auto-routing in a project:

```bash
npx aped-method disable
```

Flips `disable-model-invocation: true` on every `.aped/aped-*/SKILL.md`, snapshots the originally-unflagged skill names to `.aped/.disable-snapshot.json`, writes a `.aped/.DISABLED` marker. Reversible — `aped-method enable` consumes the snapshot and restores routing exactly. Even if you type `/aped-X` explicitly, the activation guard at the top of every skill body reads the marker / `aped.enabled` config knob and HALTs silently when disabled.

**Common symptoms**
- *The hook blocks a phase I thought I'd completed* → check `docs/aped/state.yaml` (pipeline state source of truth)
- *The ticket diverges from my local story* → normal if the team edited the ticket. Sync to the story, resolve the HALT.
- *A worktree stays `in-progress` with no activity* → `aped-lead` to see the latest check-in; `aped-course` if scope has changed.

Full resource: [`docs/TROUBLESHOOTING.md`](https://github.com/yabafre/aped-claude/blob/main/packages/create-aped/docs/TROUBLESHOOTING.md) in the repo.

---

## 7. Read next

1. [APED — Workflow](.aped-workflow.md) — overview + Mermaid diagrams (pipeline + parallel sprint)
2. [APED — Phases](.aped-phases.md) — phase-by-phase detail (command, persona, input, output, gate)
3. [APED — Personas & Teams](.aped-personas.md) — who does what, and why some teams coordinate and others don't

---

## 8. Useful links

- 📦 [npm: aped-method](https://www.npmjs.com/package/aped-method)
- 💻 [github.com/yabafre/aped-claude](https://github.com/yabafre/aped-claude)
- 🧰 [workmux](https://github.com/raine/workmux) — recommended tmux orchestrator for sprints

---

## What changed in 3.11.0 → 3.12.0

If you scaffolded APED before 3.11.0, the quickstart above still works — nothing breaking. But you now have a few new tools, a new invocation surface, and richer state.yaml tracking. Highlights:

### 25 skills, slash commands removed in 4.0.0

What was "**23 slash commands**" in 3.10.x is now **25 skills**. The slash-command shells (`/aped-X`, scaffolded as `.claude/commands/aped-*.md`) were retired in **4.0.0**; skills are the only invocation surface. The two skills added in 3.11 (still present and stable):

- **`aped-debug`** — systematic debugging skill: 4 phases (Reproduce → Root-cause-trace → Fix-with-test → Verify) with the **3-failed-fixes rule** (after 3 attempts that didn't move the failure forward, STOP and question the architecture, not try fix #4). Sub-disciplines: backward call-stack tracing + `find-polluter.sh` bisection, `waitFor()` replacing arbitrary timeouts, 4-layer defense-in-depth.
- **`aped-receive-review`** — discipline for **receiving** code review (the asymmetry to `aped-review`). Iron Law: "NO PERFORMATIVE AGREEMENT — TECHNICAL VERIFICATION FIRST." 6-step Response Pattern, YAGNI grep gate, multi-item clarification gate. Forbids "you're absolutely right!" capitulation; requires technical verification before implementing.

**Skill-first invocation** — primary entry point is the **Skill tool** or **natural language** matching the skill `description:` triggers (say *"create the prd"*, *"run an architecture review"*, *"address the review feedback"*). The CLAUDE.md template ships a "Skill Invocation Discipline" section with the **1% rule** (*"if there's even a 1% chance a skill applies, invoke it"*) + a 12-row rationalization table that makes invocation reflexive.

### Spec-reviewer dispatch on every artefact-producing skill (since 3.12.0)

`aped-prd`, `aped-ux`, `aped-epics`, `aped-analyze`, `aped-brainstorm` now dispatch an **adversarial subagent** before the user gate that validates the produced artefact for completeness / consistency / clarity / scope / YAGNI. Calibrated per artefact type. NACK behaviour: HALT → `[F]ix + redispatch once` / `[O]verride with reason recorded`. Catches FR/NFR contradictions, ambiguous metrics, screen/flow inconsistency, orphan FRs, depends_on cycles — before downstream skills burn cycles on flawed inputs.

### Sync-logs natifs (since 3.12.0; retention since 4.1.0)

Every ticket-system operation in `aped-epics`, `aped-from-ticket`, `aped-ship`, `aped-course` emits a structured JSON audit log at `docs/sync-logs/<provider>-sync-<ISO>.json` via `aped/scripts/sync-log.sh`. Fields: `sync_id`, `started_at`, `ended_at`, `operator` (git config user.email), `directive_version` (env override), `phases.<name>` (auth_check, projects, labels, milestones, etc.), `totals` (api_calls_total, issues_created, etc.). Atomic writes; concurrent calls protected by mkdir-lock with stale-recovery. Configurable via `sync_logs.{enabled, dir, retention}` in `config.yaml`.

**Retention** (4.1.0, opt-in) — set `sync_logs.retention.mode: keep_last_n` + `keep_last_n: 50` in `config.yaml` and the helper prunes the oldest provider-scoped logs after every successful `end`. Provider isolation is enforced via filename pattern matching, so a Linear sync never touches GitHub logs. For one-shot manual sweeps: `aped-method sync-logs prune [--apply] [--provider=NAME]` (default dry-run). The new `meta` subcommand (4.1.0) is the helper-blessed way to write top-level extension keys (`trigger`, `scope`, `source_pr`, etc.) without hand-rolling JSON in skill bodies.

Useful for: forensic audit when a sync goes wrong, postmortem analysis, cross-machine reproducibility, compliance trails.

### state.yaml schema (v1 since 3.12.0; v2 since 4.1.0; v3 since 6.1.0)

`validate-state.sh` accepts `schema_version` 1, 2, or 3. **Migration is automatic** — `aped-method --update` runs `migrate-state.sh` which chains v1 → v2 → v3 in a single pass, idempotent on the head version, with per-step backups (`state.yaml.pre-v2-migration.bak`, `state.yaml.pre-v3-migration.bak`) before any mutation. Existing scaffolds without `schema_version` are treated as implicit 1.

Top-level slots:

- **`ticket_sync`** (v1+) — provider-agnostic sync metadata after `aped-epics` Ticket System Setup. Replaces project-specific `linear_sync` / `github_sync` / etc. patterns. Re-syncs append to `modified_tickets`.
- **`backlog_future_scope`** (v1+) — explicitly-punted tickets with category buckets. Written by `aped-epics` and `aped-course`.
- **`corrections_pointer` + `corrections_count`** (v2; in v1 was a top-level `corrections:` array) — append-only log of artefact revisions (PRD edit, FR descope, etc.) split into a sister file at the path tracked by `output_path` (default `docs/aped/state-corrections.yaml`; overridable via `state.corrections_path` in config.yaml). state.yaml carries the pointer + count cache. Writer: `bash {{APED_DIR}}/scripts/sync-state.sh <<< 'append-correction <json>'`. Distinct from `lessons.md` and CHANGELOG.

Plus richer per-phase records under `pipeline.phases.<phase>` (PRD `fr_count` / `mode`, architecture `councils_dispatched` / `adrs` / `watch_items` / `residual_gaps`, epics `epic_count` / `story_count` / `fr_coverage`, context `type` ∈ {brownfield, greenfield, hybrid}, etc.).

`mark-story-done <key>` (4.1.0) is the new atomic helper for the review-done flip — sets status to done + completed_at, deletes runtime fields (`worktree`, `started_at`, `dispatched_at`, `ticket_sync_status`), preserves permanent fields (`merged_into_umbrella`, `ticket`, `depends_on`, custom user fields). **Since 4.1.2, hard-requires `yq`** — refuses loudly on absence (the previous awk fallback claimed to land status + completed_at but silently dropped the latter, since `set_story_field`'s awk path can only rewrite existing fields, not insert).

### `aped-skills/` reference directory (since 3.11.0)

Three reference docs callable on demand from any skill: `anthropic-best-practices.md` (CSO description principle, gerund naming, no-placeholders), `persuasion-principles.md` (Meincke 2025 attribution, why Iron Laws work — research showing 33%→72% compliance lift under Authority + Commitment + Scarcity), `testing-skills-with-subagents.md` (RED-GREEN-REFACTOR runner methodology for skills).

### Three new opt-in subcommands

```bash
aped-method verify-claims         # PostToolUse advisory hook (since 3.11.0) — scans Bash output for forbidden completion phrases without evidence
aped-method session-start         # SessionStart skill-index hook (since 3.11.0) — injects aped/skills/SKILL-INDEX.md as additionalContext at session boot
aped-method visual-companion      # bash + python3 HTTP server (since 3.11.0) for aped-brainstorm browser-based mockup/diagram rendering
```

Each accepts `--uninstall` to remove its installed bits. Default scaffold doesn't install any of them — they're explicit opt-ins.

### Updated Iron Laws / Verification gates (since 3.11.0)

- **`aped-dev`** Iron Law: "NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST — code-before-test must be deleted, not adapted."
- **`aped-review`** Iron Law: "NO PASS WITHOUT FRESH EVIDENCE IN THIS MESSAGE — `should work` / `looks good` / `probably fine` are not evidence."
- **`aped-debug`** Iron Law: "NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST."
- **`aped-receive-review`** Iron Law: "NO PERFORMATIVE AGREEMENT — TECHNICAL VERIFICATION FIRST."
- **`aped-story`** Iron Law: "NO STORY WITHOUT EXACT FILE PATHS, FULL CODE BLOCKS, EXACT TEST COMMANDS — the persona reading this story is the enthusiastic junior with poor taste."

`aped-dev` and `aped-review` enforce the **Verification gate** with 9 forbidden phrases (`should work`, `looks good`, `probably fine`, `tests should pass`, `Done!`, `Great!`, `Perfect!`, `All set`, `should be ok`) and 3 accepted evidence forms (captured command output, diff with test output, screenshot reference). Optional `verify-claims.js` PostToolUse hook scans Bash output for the same phrases.

### Two-stage review (since 3.11.0)

`aped-review` no longer fan-outs all specialists in parallel. **Eva runs first as a synchronous blocking gate.** On Eva PASS, Marcus + Rex + conditionals dispatch in parallel. On Eva NACK, HALT → `[F]ix → return story to dev` / `[O]verride → proceed with reason recorded`. Spec-compliance precedes quality.

### Subagent status protocol (since 3.11.0)

`checkin.sh post --status DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED`. Only `DONE` runs auto-approve in `aped-lead`; the other three escalate with priority hints (BLOCKED = always escalates, DONE_WITH_CONCERNS = surface concern with `[A]pprove despite / [R]eturn-to-dev` choices, NEEDS_CONTEXT = priority HIGH + question surfaced).

### File structure design upfront in `aped-story` and `aped-epics` (since 3.11.0)

New section before tasks: maps files with single-responsibility rule (split by responsibility, not layer), 3-bullet decision template per file (file-name / single-responsibility / inputs+outputs). Better task decomposition; coherent file boundaries across stories.

## What changed in 6.2.0

> Released 2026-05-07. Five fixes shipped together: external-attribution purge (R), `aped-method disable / enable / status` (D), strict JSON Schema for state.yaml v3 (S), epic-context cache becomes canonical (C), `aped-review` slim redesign + writing discipline + `aped-purge` (35th skill).

### `aped-review` slim — 11 specialists → 3 auditors

The previous review surface was 1456 lines, 12 sequential steps, 11 specialists with overlapping scopes (Eva/Aaron on AC, Marcus/Diego/Lucas/Kai/Sam on code quality, Hannah/Eli on adversarial). Replaced with **Spec / Code / Edge & hallucination** — three method-driven auditors dispatched in a single parallel `Agent` message. Aria stays for visual review (frontend + preview app only). `git-audit.sh` runs inline by the Lead.

Spec NACK gate replaces Eva-NACK gate (same `[F]ix / [O]verride` UX). Minimum-3-findings floor dropped — padding produces false positives under pressure. `review.parallel_reviewers` config flag is now inert (kept for backwards-compat). 1456 → 602 lines (−59%).

### `aped-method disable / enable / status` — kill switch with memory

```bash
npx aped-method disable      # 20 newly suppressed, 14 already opt-out
npx aped-method status       # APED is disabled — last toggle: 2026-05-07T...
npx aped-method enable       # restored 20 skills, 14 kept opt-out
```

`disable` snapshots which skills were originally opt-out (`.aped/.disable-snapshot.json`) so `enable` restores the exact pre-disable state. Defense-in-depth activation guard at the top of every skill body catches the explicit `/aped-X` path even when natural-language routing is off.

### Epic-context cache becomes canonical, moves to `epics-context/`

`aped-dev` and `aped-review` no longer load raw PRD + UX + project-context. The cache (compiled by `aped-story`, appended-to by `aped-review` on `done`) is the consumer-side source for cross-cutting epic knowledge. Cache moves from `docs/aped/epic-{N}-context.md` to `docs/aped/epics-context/epic-{N}-context.md`.

Architecture stays primordial (full load — patterns are LAW for dev). Only PRD / UX / project-context move into the cache.

### Strict JSON Schema for state.yaml v3 (WARN-only)

`{{APED_DIR}}/data/state.yaml.schema.v3.json` ships with the scaffold. `validate-state.sh` invokes `npx -y ajv-cli@^5` against it, surfacing drift (invented sub-blocks, free-form story fields, out-of-taxonomy phase shapes) as stderr WARN lines. **WARN-only in 6.2.0; ERROR in 7.0.0.** Skips silently when yq/npx/network is missing.

### `aped-purge` (35th skill) — doc hygiene + INDEX

Walks `{{OUTPUT_DIR}}/`, classifies each entry canonical / archived / allowlisted / unknown, regenerates `INDEX.md` as the single entry point. Per-file triage menu for unknowns: `[A]rchive` / `[I]nline into a canonical artefact` / `[K]eep+allowlist` (with rationale) / `[D]elete` (typed confirmation) / `[S]kip`. Read-only by default — moves and deletes only on explicit user choice.

### External attribution purge

Skill bodies cited Pocock / BMAD / Anthropic context-engineering / Adapted from / Translation of / Lifted from Superpowers / superpowers issue / verbatim Superpowers / BMAD pattern. Those sources don't ship with user projects — Claude wasted context looking them up. 17+ citations purged across 16 skills; `tests/no-external-attributions.test.js` blocks regressions.

### Writing discipline

New `aped-skills/writing-discipline.md` codifies the rule for commits, PRs, code comments, review reports, ticket comments: short, sharp, slightly human — diff proves the work, prose adds the *why*. Pointers added at every producing surface (`aped-dev`, `aped-debug`, `aped-ship`, `aped-review`, `aped-receive-review`, `aped-quick`, `aped-course`, `aped-from-ticket`).

PRDs / stories / architecture / retros stay out of scope — those are structured specs by design.

## What changed in 6.1.0 (sprint mode hardening)

> Released 2026-05-05. Schema bump v2 → v3; migration is automatic (`aped-method --update` runs `migrate-state.sh` 2 → 3 idempotently, with a backup at `docs/aped/state.yaml.pre-v3-migration.bak`).

### config.yaml gains four blocks (B5/B4 + new sprint knobs)

- `base_branch: main` — single source of truth for the ref the umbrella is cut from and the ref `aped-ship` PRs against. Previously documented but never seeded; readers always silently fell back to `main`. Override per project for `develop` / `master` / `trunk` workflows.
- `sprint.parallel_limit` / `sprint.review_limit` — moved from `state.yaml.sprint.*` (where they conflated preferences with runtime state) to `config.yaml.sprint.*`. Readers: config wins, state is the v2 fallback for unmigrated scaffolds.
- `sprint.push_umbrella_on_create: true` — gate for the auto-push of the freshly-created umbrella to origin. Set false on offline / branch-protected / solo workflows.
- `sprint.merge_poll_timeout_seconds: 120` — `aped-lead` polls `gh pr view --json state` until MERGED before tearing down the worktree.
- `review.parallel_reviewers: false` — activates Hannah (Blind Hunter) / Eli (Edge Case Hunter) / Aaron (Acceptance Auditor) Stage 1.5 reviewers. Referenced by `aped-review/steps/step-03` since 4.x but never seeded; the trio silently never ran. 6.1.0 closes the gap.

### Sprint mode bug fixes

- **B1 ordering** — `aped-lead`'s `review-done` handler used to flip `mark-story-done` (status: done + delete worktree field) BEFORE merging the PR. On merge failure, state was left inconsistent (`status: done`, `merged_into_umbrella: false`, worktree on disk but field gone). New order: capture worktree+PR → merge → poll until MERGED → set `merged_into_umbrella: true` → mark-story-done → teardown.
- **B2 polling** — `gh pr merge --auto` returns success after enqueueing, not after merging. Lead now uses `gh pr merge --squash` and polls `gh pr view --json state` for `MERGED` (with the configurable timeout). On timeout / `CLOSED` / failure: state stays `review`, worktree stays on disk for recovery.
- **B3 idempotent PR open** — `aped-review` step-11 now probes `gh pr view` first; on hit, it `gh pr edit`s the existing PR (and silently corrects the base if it points elsewhere). Re-review of a story no longer crashes on "PR already exists".
- **B6 trap-protected git checkout** — `aped-ship`'s composite review (typecheck + lint + db-regen) now wraps the `git checkout "$UMBRELLA"` in a trap that returns to the base branch on any exit/interrupt. No more "stranded on the umbrella" after an interrupted run.
- **B7 worktree path collision** — `sprint-dispatch.sh` now keys `WORKTREE_PATH` on `<project>-<ticket>-<story-key>` instead of `<project>-<ticket>`. Stories sharing a parent ticket no longer collide on disk.
- **B8 structural validation** — `validate-state.sh` (v3) refuses state.yaml that has `sprint.parallel_limit`/`sprint.review_limit` (incomplete migration) or has `sprint.active_epic` set without a `sprint.umbrella_branch`. Surfaces broken state before downstream skills crash on it.

### Audit script overhaul

`scripts/check-pre-merge.sh` now validates:
- `[Unreleased]` non-empty when there are non-doc commits since the last tag.
- `/aped-` self-references walk SKILL.md + workflow.md + every `steps/*.md`.
- All 7 `docs/*.md` files are present + skills-classification skill count matches code + quickstart cites a version >= current minor.
- README counter regex tolerates more wording variants (was bold-only).
- SECURITY.md grep tolerates whitespace variations (was single-space).

`scripts/lint-bash-discipline.sh` now also lints the **~25 scaffolded scripts embedded as strings in `src/templates/scripts.js`** by materializing them to a tmp dir via the exported `scripts()` function. Previously these were uncovered — exactly the surface where production regressions in 4.7.5 / 4.10.0 / 4.11.0 / 4.13.0 originated.

## What changed in 6.0.0 (BREAKING)

> Released 2026-05-01. Five structural changes; the loader keeps backwards compat — existing 5.x scaffolds continue to work without re-running `--update`.

### BMAD-style skill decomposition

Every one of the (now 34) skills moved from flat `aped-X.md` to a directory: `aped-X/SKILL.md` (always) + `aped-X/workflow.md` (medium and large skills) + `aped-X/steps/step-NN-*.md` (the 10 phase skills, fully decomposed). Step files average <120 lines each, vs. the previous 600+ lines monoliths. Inspired by Anthropic's [code-execution-with-MCP](https://www.anthropic.com/engineering/code-execution-with-mcp) progressive disclosure pattern and [Carlini's C compiler experiment](https://www.anthropic.com/engineering/building-c-compiler) (decomposition for the model, not the human).

The 10 fully decomposed skills: `aped-story` (8 steps), `aped-dev` (8), `aped-review` (12), `aped-epics` (9), `aped-arch` (10), `aped-ux` (7), `aped-prd` (6), `aped-debug` (9), `aped-brainstorm` (7), `aped-analyze` (6).

### Branch creation moved from `aped-dev` to `aped-story`

`aped-story/steps/step-01-init.md` is now the canonical place that refuses to operate on `main` / `master` / `prod` / `production` / `develop` / `release/*` / detached HEAD. Step 03 creates the feature branch following `feature/{ticket}-{slug}`. `aped-dev/steps/step-01-init.md` only verifies the branch — never creates it. The fix closes the `superpowers#1246` style issue (skill commits before creating dev branch). Existing `lessons.md` rules referencing `aped-dev` branch creation should be re-scoped to `aped-story`.

### Typed step I/O contracts

Every step file under `aped-X/steps/` ships a YAML frontmatter declaring `reads:` / `writes:` / `mutates_state:` with a documented prefix vocabulary (`{{OUTPUT_DIR}}/...`, `state.yaml#...`, `git/...`, `subagent/...`, `mcp/...`, `ticket/...`). Lint enforced (`tests/step-io-contract-lint.test.js`). Future tooling can verify cross-step contracts and route step execution through MCP.

### ADR sharding in `aped-arch`

Architectural decisions can persist as separate `docs/aped/adr/000N-{slug}.md` files (Pocock pattern: short, citable, survive `architecture.md` rewrites). Triggers when a decision is hard-to-reverse + surprising-without-context + a real trade-off. Council-dispatched decisions always qualify. Template at `.aped/templates/adr.md`; directory ships with `.gitkeep`.

### `aped-glossary` — 34th skill

New soft-dep skill maintaining `docs/aped/glossary.md` (canonical domain dictionary). Iron Law: ONE WORD, ONE MEANING, ONE PLACE. Synonyms live under `_Avoid:_` so future skill checks can flag drift. Pocock CONTEXT.md analog. Discovers candidate terms from upstream artefacts (PRD, architecture, stories) — never invents.

### Migration

`aped-method --update` migrates in place. No state.yaml change. Story files preserved. ADR directory + glossary.md created lazily (only when the skills actually fire).

## What changed in 4.7 → 5.5

Major evolution across 30+ releases. Highlights:

### MCP companion servers (4.13.0+)

APED now ships **two MCP servers** (opt-in via `aped-method enable-mcp`):
- **aped-state** — 8 typed tools for state.yaml: `get`, `update`, `advance` (state-machine validated transitions), `lock`/`unlock` (cross-call mutex), `describe` (schema introspection), `context.load` (phase artefact bundle), `validate.phase` (oracle gate).
- **aped-ticket** — 4 provider-routed tools: `create_issue`, `get_status`, `list_open`, `link_pr`. Reads `ticket_system` from config.yaml and dispatches to GitHub/Linear/Jira/GitLab. Closes the "agent invents CLI flags for the wrong provider" class.

### 6 oracle scripts (4.12.0+, 4.16.0+)

Deterministic bash verifiers with `ERROR <code>: <reason>` output:
- **oracle-prd.sh** (E001-E007), **oracle-arch.sh** (E010-E013), **oracle-epics.sh** (E020-E021) — shipped 4.12.0
- **oracle-dev.sh** (E030-E036), **oracle-qa.sh** (E042-E044), **oracle-state.sh** (E050-E055) — shipped 4.16.0+

### Anti-rationalization (5.5.0)

Informed by BMAD, Superpowers, Pocock, and Anthropic engineering:
- **16 completion-gate checklists** — separate files at `aped-skills/checklist-<name>.md`. Each skill's final section forces a `Read` of its checklist before DONE, re-injecting completion criteria into context when attention is lowest.
- **commit-gate hook** — PostToolUse advisory after 5+ uncommitted changes. Structural enforcement: compliance detectable by artifact, not honor system.
- **session-start CLAUDE.md check** — warns when `CLAUDE.md` is missing the `<!-- APED:START -->` block (catches worktree visibility issue with gitignored `CLAUDE.local.md`).

### 35 skills (was 25 at 3.12)

New since 3.12: `aped-grill` (4.8.0, Pocock-style alignment), `aped-write-skill` (4.6.0, meta), `aped-triage` (4.19.0, issue triage state machine), `aped-pre-mortem` (5.4.0), `aped-design-twice` (5.4.0), `aped-arch-audit` (4.5.0), `aped-iterate` (4.4.0), `aped-zoom-out` (4.6.0). v6.0.0 keeps the count at 33 — the change is structural (BMAD layout), not additive.

### Pipeline hardening (4.14.0)

- `scripts/cut-release.sh` — validates 8 preconditions, bumps version, rewrites CHANGELOG, prints 5 manual steps
- `scripts/check-pre-merge.sh` — automates the 4-file pre-merge checklist
- `scripts/lint-bash-discipline.sh` — flags `grep -c` and unwrapped grep under pipefail
- `.github/workflows/smoke.yml` — full tarball scaffold on every PR + daily cron
- `.github/workflows/nightly-npm.yml` — daily npm@latest probe

### v5.0.0 MAJOR — allowed-paths

All 35 skills now declare `allowed-paths` frontmatter with `write` and `read-only` scopes. v5.1.0 added the advisory PreToolUse hook (`aped-method allowed-paths-scope`).

### 813 tests (was ~100 at 4.0)

51 test files covering: skill frontmatter lint, routing rubric, bash discipline, oracle scripts, MCP protocol, review output schema, allowed-paths, FR-ID format, error-swallow discipline, and more.

### Read next

If you want the full per-phase delta, see [APED — Phases](aped-phases.md).  
If you want to understand which discipline ships with which persona, see [APED — Personas & Teams](aped-personas.md).

---


