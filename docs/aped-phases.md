
---
tags: [aped, workflow, phases, reference]
---

# APED — Phases

Detail of every phase in the pipeline: **command**, **persona(s) involved**, **expected input**, **produced output**, **validation gate**.

> 🔗 Overview: [APED — Workflow](.aped-workflow.md) · Personas: [APED — Personas & Teams](.aped-personas.md)

---

## 0. Upstream (optional)

### `aped-brainstorm [topic]`
- **Phase**: Upstream
- **Purpose**: generate 100+ ideas before convergence, diverge freely
- **Output**: session notes in `docs/aped/brainstorm/`
- **When**: idea is still fuzzy, you need to explore

### `aped-prfaq [--headless]`
- **Phase**: Upstream (Working Backwards, Amazon-style)
- **Purpose**: stress-test the concept via press release + customer FAQ + internal FAQ + verdict
- **Output**: `docs/aped/prfaq.md` (5-stage artifact)
- **When**: promising idea, you want to enforce "PR-first" discipline

---

## 1. Analyze — `aped-analyze`

- **Personas**: **Mary** (Market), **Derek** (Domain), **Tom** (Staff Eng) — parallel, no coordination
- **Input**: conversational idea (user describes the project)
- **Discovery**: 4 guided conversational rounds (not a questionnaire)
- **Output**: `docs/aped/product-brief.md` + seeded context for later phases
- **Gate** ⏸: brief validation before `aped-prd`
- 🔍 **Input Discovery** (since 3.10.2): the skill globs `docs/aped/**` at entry and loads every upstream artefact present (brief, context, research). Greenfield vs brownfield is detected from `project-context.md` presence, not declared — `aped-context` is no longer an exclusive alternative; both can run on the same project. In brownfield mode, Discovery rounds reframe as "what's *new* relative to the existing system".

## 2. PRD — `aped-prd [--headless]`

- **Purpose**: generate the PRD section by section with the **A/P/C menu** at every section gate (Foundation / Scope / Domain / Requirements). `--headless` skips the menus and produces the PRD straight-through, equivalent to the pre-3.9 autonomous behaviour, for CI / scripted workflows.
- **Input**: validated `product-brief.md`
- **Output**: `docs/aped/prd.md` with FRs, NFRs, validation-ready structure
- **Gate** ⏸: PRD review before `aped-ux`

## 3. UX — `aped-ux`

- **Framework**: **ANF** (Assemble design system → Normalize with React preview → Fill all screens)
- **Input**: validated PRD
- **Output**: `docs/aped/ux/` (spec + flows + React preview app)
- **Gate** ⏸: UX spec + prototype approved before `aped-arch`
- **Runs between** PRD and Epics

## 4. Architecture — `aped-arch`

- **Normal mode**: 5 collaborative phases, decisions consistent with the PRD
- **"Architecture Council" mode** (high-stakes decisions): **Winston, Lena, Raj, Nina, Maya** dispatched in parallel, each thinks independently and returns a structured verdict. Trigger for: primary DB, auth model, API paradigm, frontend framework, infra platform.
- **Output**: `docs/aped/architecture.md` (decisions + patterns + structure)
- **Gate** ⏸: architecture validated before `aped-epics`

## 5. Epics — `aped-epics`

- **Purpose**: break the PRD into epics + story list, **without creating story files** (that's `aped-story`'s job)
- **Input**: PRD + architecture
- **Output**:
  - `docs/aped/epics.md` (map + stories with sizes S/M/L + `depends_on:`)
  - Seeded tickets in Linear/Jira/GitHub/GitLab with labels 🆕 / 🔄 / 🔁
- **Gate** ⏸: FR coverage validated (`validate-coverage.sh`)

## 6. Story — `aped-story [story-key]`

- **Purpose**: produce a detailed story file **right before implementation**, with full context compilation
- **Input**: ticket from chosen system (Linear/Jira/GH/GL) — **the ticket wins** on divergence
- 🔍 **Input Discovery** (since 3.10.2): loads every upstream artefact present (PRD, UX, architecture, brief, project-context, lessons scoped `aped-story | all`, completed stories of the current epic). Lessons are applied to the draft (cited in Discussion Points, used to adjust scope per prior-epic rules); previous stories of the same epic are loaded for continuity (decisions reused, not re-litigated).
- **Cache**: checks `docs/aped/epic-{N}-context.md`; if missing/stale, a sub-agent compiles it once from PRD / arch / UX / `project-context.md` (brownfield only) / `lessons.md` (`Scope: aped-dev | all`) / completed stories / codebase patterns
- **Output**: `docs/aped/stories/{story-key}.md` (implementation-ready)
- **Gate** ⏸: story ready before `aped-dev`

## 7. Dev — `aped-dev [story-key]`

- **Cycle**: TDD red → green → refactor
- **Fullstack mode** (optional): story spanning ≥ 2 layers → team of **Kenji** (API contract) / **Amelia** (backend) / **Leo** (frontend) coordinated via `SendMessage`
- **Visual check**: every frontend GREEN pass → `mcp__react-grab-mcp__get_element_context`
- **Re-fetch the ticket** before implementation; divergence = HALT
- 🔍 **Input Discovery** (since 3.10.2): loads PRD + arch + UX + `project-context.md` + `lessons.md` (`Scope: aped-dev | all`) at entry. Lessons are added to the Pre-Implementation Checklist and interpolated into the `epic-{N}-context.md` cache so they're surfaced inline during TDD cycles.
- **Output**: code + tests + execution notes updated in the story
- **Gate** ⏸: tests GREEN + visual check OK → `aped-review`

## 8. Review — `aped-review [story-key]`

- **Always-on specialists**: **Eva** (AC Validator/QA), **Marcus** (Code Quality/Staff Eng), **Rex** (Git Auditor)
- **Conditional specialists**: **Diego** (backend), **Lucas** (frontend), **Aria** (visual/design), **Kai** (platform/DevOps), **Sam** (fullstack tech lead if ≥ 2 layers)
- **Minimum 3 findings** — the review **hunts** for problems, it does not blindly validate
- **Binary outcomes**: `review → done` (all resolved/dismissed) or stay `review` (you fix and re-run)
- 🔍 **Input Discovery** (since 3.10.2): loads story + PRD + arch + UX + `project-context.md` + `lessons.md` (`Scope: aped-review | all`) at entry. Each specialist's prompt is augmented with their scoped lessons so checks are explicit, not advisory. Architecture is now strongly recommended (degraded mode if missing) instead of required — projects that legitimately skip `aped-arch` can still run review.
- **Output**: report posted as ticket comment + status updated
- **Ticket**: source of truth, git audit via `git-audit.sh`

---

## Sprint (optional, after epics)


### `aped-sprint [story-keys...]`
- **Creates the sprint umbrella branch** `sprint/epic-{N}` from `origin/<base>` at sprint start (records it in `state.yaml` at `sprint.umbrella_branch`).
- Resolves the dependency DAG (`depends_on:` in `epics.md` and `state.yaml`).
- Reconciles state.yaml ↔ disk via `check-active-worktrees.sh` before computing capacity (a `rm -rf`'d worktree no longer blocks a slot).
- Dispatches up to `parallel_limit` stories (default 3), each in its worktree `../{project}-{ticket}` on branch `feature/{ticket}-{slug}` **cut from the umbrella** (not from base).
- Posts `story-ready` check-in per story (handled by `aped-story` inside each worktree).
- Ticket-side mutations happen **after** worktree creation (transactional). On ticket-sync failure → story marked `ticket_sync_status: failed`, retry via `aped-lead`.
- `--plan-only`: dry-run, no mutations.
- **Runs from the main project only**.

### `aped-lead`
- Lead Dev hub — batch-processes Story Leaders' check-ins (4 kinds: `story-ready`, `dev-done`, `review-done`, `dev-blocked`).
- **Programmatic verdicts**: calls `.aped/scripts/check-auto-approve.sh <kind> <story-key>` (exit 0 = AUTO, 1 = ESCALATE + reasons on stderr). No LLM judgement.
- On `review-done` approval → **merges the story PR into the umbrella au-fil-de-l'eau** (`gh pr merge`), tears down the worktree (`workmux merge` or `worktree-cleanup.sh --delete-branch`), sets `merged_into_umbrella: true` in state.yaml.
- `dev-blocked` always ESCALATEs (no auto-approve path) — surfaces the reason for user input.
- Pushes the next command via `workmux send` (preferred) or `tmux send-keys` (fallback). `checkin.sh push` accepts `--target` to disambiguate; refuses ambiguity (exit 3) instead of silently picking the first match.

### `aped-ship`
- **Sprint umbrella → base PR opener.** Does NOT batch-merge stories — those merges happen au-fil-de-l'eau in `aped-lead`.
- Verifies all done stories of the active epic are merged into the umbrella (both `git branch --merged $UMBRELLA` and `merged_into_umbrella: true` in state.yaml agree).
- Runs the composite review on `umbrella vs origin/<base>`: secret scan, debug/TODO scan, typecheck, lint, `db:generate`, `state.yaml` consistency on the umbrella tip, leftover worktrees/branches.
- Pushes the umbrella branch and prints `gh pr create --base <base> --head sprint/epic-{N}` (with the composite summary as PR body) for the user to run. **Base only ever sees commits via that one PR.**
- Archives `.aped/checkins/*.jsonl` to `archive/{date}/` after the PR is opened (`checkin.sh archive`).
- `--plan-only`: dry-run, no mutations.

### `aped-status`
- Dashboard: per-story progress, blockers, next actions.
- Surfaces `check-active-worktrees.sh` drift (`✗ MISSING` rows for stories whose worktree is gone).
- Surfaces `ticket_sync_status: failed` rows (retry via `aped-lead`).
- Surfaces pending check-ins from `checkin.sh poll`.
- Ticket-sync results cached 60s in `.aped/.cache/tickets.json` to avoid hammering provider APIs on every dashboard render.

### `aped-course [change description]`
- Manages scope changes / pivots during dev.
- **Only way to unlock the upstream-lock** (prd/arch/ux) during a sprint.
- Notifies every active worktree ticket before + after the change.
- Impact analysis + coordinated plan.

## Utilities

### `aped-context`
- Analyzes an existing codebase to produce `project-context.md`, which every downstream APED skill discovers automatically when present (since 3.10.2)
- Runs **alongside** `aped-analyze`, not exclusive of it — hybrid projects (new feature in legacy system) benefit from running both

### `aped-qa [story-key]`
- Generates E2E + integration tests from ACs of a completed feature

### `aped-quick <title> [fix|feature|refactor]`
- Quick fix / small feature — bypasses the full pipeline
- **Spec isolation**: each quick spec is an independent file with a status (`draft → in-progress → done`). Multiple can run in parallel. Auto-resume.

### `aped-from-ticket <ticket-id-or-url>`
- **External ticket intake** — single-shot bridge for tickets that bypass `aped-epics` planning (production bugs, partner asks, mid-sprint requests).
- Reads `ticket_system` from `.aped/config.yaml`; refuses early if `none`. Provider parity is mandatory: `gh` / `glab` CLI for github / gitlab; Linear MCP for Linear; Jira/Atlassian MCP for Jira.
- **Flow**: parse argument (bare ID or full URL — host must match `ticket_system`) → fetch ticket → compile project context (PRD overlap, architecture constraints, related stories, codebase patterns) → draft story collaboratively with ⏸ GATE → persist under `external-tickets` bucket or auto-matched epic → register in `state.yaml` with `source: from_ticket` (out-of-sprint by default — explicit promotion required) → 3-option handoff prompt (`[D]` run aped-dev / `[P]` promote to active sprint / `[S]` stop).
- **Optional comment-back** to the source ticket (opt-in via `from_ticket.ticket_comment.enabled`).
- **All knobs** under `from_ticket:` in `.aped/config.yaml`: `story_placement.{mode, bucket_epic}`, `ticket_comment.{enabled, template}`, `sprint_integration.auto_add`, `handoff.after_story`. Sensible defaults — works out-of-the-box without config edits.

### `aped-check`
- Human-in-the-loop checkpoint — summarizes recent changes, highlights concerns, HALTs for review

### `aped-retro [epic-number]`
- Post-epic retrospective with **Mia** (Struggle), **Leo** (Velocity/Quality), **Ava** (Previous-Retro Auditor)
- Output: `docs/aped/retros/epic-{N}.md` + `lessons.md` (cross-epic continuity, consumed by `aped-story` / `aped-dev` / `aped-review` since 3.10.2)

### `aped-elicit [method | target-file]`
- Horizontal critique toolkit (19 methods: socratic, first principles, pre-mortem, red team, tree of thoughts…)
- Invokable **at any phase**

### `aped-claude`
- Smart-merges `CLAUDE.md` with APED rules + project config — preserves user content

---

## Maintenance (outside Claude Code)

```bash
aped-method doctor                # verifies scaffold, hooks, state, commands, symlinks
aped-method statusline            # installs the APED-aware status line
aped-method safe-bash             # Bash safety hook (optional)
aped-method symlink               # repairs cross-tool symlinks
aped-method post-edit-typescript  # TS post-edit hook (optional)
```

---

## What changed in 3.11.0 → 3.12.0

Cumulative changes from Tier 4 (3.11.0) and Tier 5+6 (3.12.0). Only deltas from the per-phase sections above. Nothing breaking — every existing skill behaves identically without configuration changes.

### `aped-analyze`
- 🛡️ **Spec-reviewer dispatch** (since 3.12.0) — adversarial subagent reviews the produced `product-brief.md` for research consistency (no contradictions across market / domain / tech findings), evidence quality (claims have citations), scope-of-product clarity, non-falsifiable claims. NACK → `[F]ix + redispatch once` / `[O]verride`.
- 📊 **`## Self-review (run before user gate)`** added (since 3.12.0) — Tier 1 missed it for `aped-analyze`. Now in line with the other artefact-producing skills.

### `aped-prd [--headless]`
- 🛡️ **Spec-reviewer dispatch** (since 3.12.0) — calibration: FR/NFR contradictions, missing ACs, ambiguous metrics, scope creep.
- 📊 **State.yaml record** (since 3.12.0): writes `pipeline.phases.prd.{fr_count, mode}` — `fr_count` parsed from PRD's FR section, `mode: interactive | headless`.

### `aped-ux`
- 🛡️ **Spec-reviewer dispatch** (since 3.12.0) — calibration: screen/flow inconsistency, missing component inventory entries, accessibility gaps (focus order, aria-labels, contrast tokens, touch targets ≥44pt), viewport assumptions explicit.

### `aped-arch`
- 📊 **State.yaml structured records** (since 3.12.0): writes `pipeline.phases.architecture.{mode, councils_dispatched, adrs, watch_items, residual_gaps, epic_zero_stories}`. Council verdicts persisted as `[{id, subject, specialists, verdict}]`; ADRs as `[{id, subject, path, author}]`. Tooling can rely on these counts.

### `aped-epics`
- 🛡️ **Spec-reviewer dispatch** (since 3.12.0) — calibration: story granularity (split / merge), orphan FRs (no story covers them), `depends_on` cycles, FR-coverage gap vs PRD.
- 📊 **Sync-logs** (since 3.12.0) — Ticket System Setup wraps every step (`auth_check`, `projects`, `labels`, `milestones`, `modified_tickets`, `out_of_scope_moves`) with `aped/scripts/sync-log.sh phase $LOG <name> <status>`. `record api_calls_total` per provider call. Final path emitted to user + recorded in state.yaml.
- 📊 **State.yaml `ticket_sync` block** (since 3.12.0) — provider-agnostic record after sync: `{provider, sync_id, sync_log, projects, milestones, modified_tickets, totals}`. Re-syncs append to `modified_tickets`.
- 📊 **`backlog_future_scope` block** (since 3.12.0) — writes `{project_id, tickets: [{id, category}]}` when M2 buckets exist.
- 📊 **Phase record** (since 3.12.0): `pipeline.phases.epics.{epic_count, story_count, fr_coverage, ticket_sync, synced_at}`.

### `aped-story`
- 📂 **File structure design (upfront)** (since 3.11.0) — new section before tasks: maps files with single-responsibility rule (split by responsibility, not layer), 3-bullet decision template per file. Better task decomposition.
- 📐 **Task granularity contract** (since 3.11.0) — 5 must-haves per task: exact file path, full code block, exact test command, expected output, literal commit step. 2-5 minute target runtime per task. Reader persona: "enthusiastic junior with poor taste" — granularity testable against that lens.
- 🔥 **Iron Law / Red Flags / Rationalizations** triplet under `## Critical Rules` (since 3.11.0).

### `aped-dev`
- 🚧 **Blocker-halt gate** (since 3.11.0) — explicit STOP conditions: missing dep, test fail, unclear instruction, repeated verification fail, never start on main without consent.
- 🛡️ **Verification-before-completion gate** (since 3.11.0) — forbidden phrases (`should work`, `looks good`, `Done!`, `probably fine` …) + 3 accepted evidence forms (captured command output, diff with test output, screenshot reference).
- 🔥 **Iron Law**: "NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST — code-before-test must be deleted, not adapted." Red Flags + Rationalizations targeted at TDD shortcuts.
- 🐛 **Cross-ref to `aped-debug`** — on persistent test red (≥3 failed attempts), HALT and pivot to `aped-debug` rather than try fix #4.

### `aped-review`
- 🪜 **Two-stage review** (since 3.11.0) — Eva (AC validator) runs first as a synchronous blocking gate. On Eva PASS, dispatch Marcus + Rex + conditionals in parallel. On Eva NACK, HALT → `[F]ix → return story to dev` / `[O]verride → proceed with reason recorded`. No more wasted dispatches on doomed reviews.
- 🧪 **Marcus testing-anti-patterns checklist** (since 3.11.0) — 5 patterns + gate functions verbatim from Superpowers' `testing-anti-patterns.md` (test mock behavior, test-only methods in prod, mock without understanding, incomplete mocks, integration-test-as-afterthought). Catches mock-as-test fraud at review time.
- 🛡️ **Verification-before-completion gate** (Tier 2) — same forbidden-phrases set as `aped-dev`.

### `aped-debug` (NEW since 3.11.0)
- **Phase**: Debug (utility, invoked from `aped-dev` on persistent test red, from `aped-review` on root-cause findings, or standalone)
- **Iron Law**: "NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST."
- **4 phases**: Reproduce → Root-cause-trace → Fix-with-test → Verify
- **3-failed-fixes rule** (verbatim Superpowers): after 3 attempts that didn't move the failure forward, STOP and question the architecture/spec/test, not try fix #4.
- **Sub-disciplines** (since 3.11.0):
  - `root-cause-tracing` (Phase 1) — backward call-stack tracing + `console.error` instrumentation at component boundaries + `aped/scripts/find-polluter.sh` bisection script for "which test pollutes state".
  - `condition-based-waiting` (Phase 2) — replace arbitrary `setTimeout`/sleep with `waitFor()` polling (10ms, timeout-bounded, fresh getter inside loop). Reference TypeScript impl shipped with the skill.
  - `defense-in-depth` (Phase 4) — after fix lands, add validation at all 4 layers (entry / business logic / environment guards / debug instrumentation) so the bug becomes structurally impossible.

### `aped-receive-review` (NEW since 3.11.0)
- **Phase**: Review-discipline (utility, invoked from `aped-dev` after `aped-review` reports issues, or standalone when user pastes external review feedback)
- **Iron Law**: "NO PERFORMATIVE AGREEMENT — TECHNICAL VERIFICATION FIRST."
- **Forbidden responses**: "you're absolutely right!", "Great point!", "Excellent feedback!", "Let me implement that now" (before verification). Performative agreement = explicit CLAUDE.md violation.
- **6-step Response Pattern**: READ (complete feedback without reacting) → UNDERSTAND (restate requirement in own words) → VERIFY (check against codebase reality) → EVALUATE (technically sound for THIS codebase?) → RESPOND (technical acknowledgment or reasoned pushback) → IMPLEMENT (one item at a time, test each).
- **Multi-item clarification gate**: HALT before implementing partial feedback if any item is unclear. Items may be related; partial understanding = wrong implementation.
- **YAGNI gate**: if reviewer suggests "implementing properly" on an unused endpoint, `grep` codebase first; if unused, propose removal instead.
- **Acknowledgment templates**: ✅ "Fixed. [brief]." / "Good catch — [issue]. Fixed in [location]." / [just fix it and show in the code]. ❌ "Thanks for catching that!" / ANY gratitude expression.

### `aped-from-ticket`, `aped-ship`, `aped-course`
- 📊 **Sync-logs** (since 3.12.0) — every ticket-system operation now wraps with `aped/scripts/sync-log.sh`. Phase names per skill: `auth_check`, `ticket_fetch`, `story_drafted`, `state_registered`, `ticket_commented` (`aped-from-ticket`); `branch_close`, `tickets_closed`, `comments_posted` (`aped-ship`); `tickets_modified`, `tickets_moved`, `descope_recorded` (`aped-course`).
- 📜 **`corrections` log** (since 3.12.0) — `aped-course` appends an entry `{date, type, reason, artifacts_updated, affected_stories}` whenever a scope change touches an upstream artefact mid-sprint. Distinct from `lessons.md` (post-epic retros) and CHANGELOG (product-level). Append-only.
- 📦 **`backlog_future_scope`** (since 3.12.0) — `aped-course` appends descoped tickets here `{id, category}`.

### `aped-context`
- 📊 **State.yaml record** (since 3.12.0): writes `pipeline.phases.context.{generated, path, type, generated_at, refreshed_at}` — `type ∈ {brownfield, greenfield, hybrid}` derived from discovery. Re-runs preserve `generated_at`, update `refreshed_at`.

### `aped-brainstorm`
- 🛡️ **Spec-reviewer dispatch** (since 3.11.0) — Phase 4/5 dispatches an adversarial subagent on the brainstorm spec output before the user gate (the original Tier 4 implementation; replicated to PRD/UX/Epics/Analyze in 3.12.0).
- 📊 **Optional visual companion** (since 3.11.0) — opt-in `aped-method visual-companion` ships a bash + python3 HTTP server (default port 3737) for browser-based mockup/diagram rendering.

### `aped-claude`
- 📜 **Section 7 — Skill Invocation Discipline** (since 3.11.0) — the `## APED Block Template` injected into the project's CLAUDE.md contains the **1% rule** (verbatim from Superpowers' `using-superpowers`) + 12-row rationalization table + instruction priority (user > APED skills > defaults) + skill priority order (process first, implementation second). Section 8 cheat sheet uses bare skill names; the legacy slash-command subsection was replaced by a "Skill invocation (post-4.0.0)" note in 4.0.0.

### Maintenance (outside Claude Code)

Three new opt-in subcommands shipped since 3.11.0–3.12.0:

```bash
aped-method verify-claims         # PostToolUse advisory hook (Tier 2/3.11.0) — scans Bash output for forbidden completion phrases without evidence
aped-method session-start         # SessionStart skill-index hook (Tier 4/3.11.0) — injects aped/skills/SKILL-INDEX.md as additionalContext at session boot
aped-method visual-companion      # bash + python3 HTTP server (Tier 4/3.11.0) for aped-brainstorm browser-based mockup/diagram rendering
```

Each subcommand also accepts `--uninstall` to remove its installed bits.

### `aped-skills/` reference directory (NEW since 3.11.0)

Three reference docs callable on demand from any skill:

- **`anthropic-best-practices.md`** — CSO description principle (description = triggers only, not workflow summary), gerund naming, third-person, no-placeholders rule, progressive disclosure.
- **`persuasion-principles.md`** — 7-principle table verbatim (Authority, Commitment, Scarcity, Social Proof, Unity, avoid Liking, avoid Reciprocity), Meincke et al. 2025 attribution (N=28k LLM conversations, compliance 33%→72% under research-grounded patterns), ethical-use test.
- **`testing-skills-with-subagents.md`** — RED-GREEN-REFACTOR runner methodology for skills (baseline pressure scenarios → write skill → close loopholes), 7-pressure-type table, rationalization-table template, bulletproof checklist. This methodology wakes up the Tier 3 skill-triggering harness placeholder.

### state.yaml schema normalization (since 3.12.0)

Existing scaffolds keep working without changes (missing `schema_version` is treated as implicit 1). New writes by skills now follow the canonical schema:

- `schema_version: 1` at top — bump reserved for 4.0.0.
- Optional top-level slots populated by skills: `ticket_sync` (provider-agnostic, by `aped-epics`), `backlog_future_scope` (by `aped-epics` + `aped-course`), `corrections` (append-only, by `aped-course`).
- Phase-specific structured records under `pipeline.phases.<phase>` (see per-phase deltas above).
- `validate-state.sh` recognises the new top-level blocks; unknown blocks warn-only (forward-compat).
- `migrate-state.sh` stub reserves the 4.0.0 migration call site.

### Slash-commands removal (4.0.0)

The 3.x slash-command shells (`/aped-X`, scaffolded as `.claude/commands/aped-*.md`) were retired in 4.0.0. Skills are the only invocation surface — call them by name via Claude Code's Skill tool, or let the runtime route from a phrase that matches the skill's `description:`. `aped-method doctor` flags any leftover `.claude/commands/aped-*.md` stubs and a leftover `commands_path:` key in `aped/config.yaml` as warn-level diagnostics (non-blocking — exitCode stays 0) until the user removes them.


---

