
---
tags: [aped, workflow, phases, reference]
---

# APED — Phases

Detail of every phase in the pipeline: **command**, **persona(s) involved**, **expected input**, **produced output**, **validation gate**. APED ships **34 skills** as of v6.0.0. Since v6.0.0, every phase skill is a directory (`aped-X/SKILL.md` + `workflow.md` + `steps/step-NN-*.md`) — Claude only loads the slice relevant to the active step.

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
- **Oracle**: `oracle-prd.sh` — automated validation of PRD structure and FR/NFR completeness
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
- **Output**: `docs/aped/architecture.md` (rolling decisions + patterns + structure) + `docs/aped/adr/000N-{slug}.md` (sharded ADRs since 6.0.0 — Pocock pattern: short, citable, written when a decision passes hard-to-reverse + surprising + real-trade-off)
- **Oracle**: `oracle-arch.sh` — validates architecture decisions against PRD constraints, checks ADR consistency
- **Gate** ⏸: architecture validated before `aped-epics`

## 5. Epics — `aped-epics`

- **Purpose**: break the PRD into epics + story list, **without creating story files** (that's `aped-story`'s job)
- **Input**: PRD + architecture
- **Output**:
  - `docs/aped/epics.md` (map + stories with sizes S/M/L + `depends_on:`)
  - Seeded tickets in Linear/Jira/GitHub/GitLab with labels 🆕 / 🔄 / 🔁
- **Oracle**: `oracle-epics.sh` — validates FR coverage, detects `depends_on` cycles, checks story granularity
- **MCP**: `aped_ticket` — programmatic ticket creation and sync with the configured provider
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
- **Oracle**: `oracle-dev.sh` — validates TDD cycle completion, test coverage thresholds, and commit hygiene
- **MCP**: `aped_state.advance` — programmatic state transition on story completion
- **Completion-gate checklist** (since 5.0.0): structured checklist that must be satisfied before a story can leave dev — covers test evidence, AC coverage, no forbidden phrases, no skipped tasks
- **Commit-gate hook** (since 5.0.0): pre-commit hook that rejects commits missing test evidence or containing TODO/FIXME markers in production code
- **RED witness enforcement** (since 5.2.0): `tdd-red-marker` hook — every GREEN pass must have a preceding RED on record; commits without a witnessed RED phase are rejected. Prevents "write code first, backfill test later" shortcuts
- **Verbatim AC spec-quote rule** (since 5.3.0): each AC must be quoted verbatim from the story spec in the test file (as a comment or describe block); paraphrased ACs are flagged at review
- **Output**: code + tests + execution notes updated in the story
- **Gate** ⏸: tests GREEN + visual check OK → `aped-review`

## 8. Review — `aped-review [story-key]`

- **Always-on specialists**: **Eva** (AC Validator/QA), **Marcus** (Code Quality/Staff Eng), **Rex** (Git Auditor)
- **Conditional specialists**: **Diego** (backend), **Lucas** (frontend), **Aria** (visual/design), **Kai** (platform/DevOps), **Sam** (fullstack tech lead if ≥ 2 layers)
- **Minimum 3 findings** — the review **hunts** for problems, it does not blindly validate
- **Binary outcomes**: `review → done` (all resolved/dismissed) or stay `review` (you fix and re-run)
- 🔍 **Input Discovery** (since 3.10.2): loads story + PRD + arch + UX + `project-context.md` + `lessons.md` (`Scope: aped-review | all`) at entry. Each specialist's prompt is augmented with their scoped lessons so checks are explicit, not advisory. Architecture is now strongly recommended (degraded mode if missing) instead of required — projects that legitimately skip `aped-arch` can still run review.
- **Stage 1.5** (since 4.7.0): intermediate review layer between Eva (Stage 1) and the full parallel dispatch (Stage 2). Three specialists — **Hannah** (dependency auditor), **Eli** (error-path coverage), **Aaron** (API contract consistency) — run synchronously after Eva PASS. Stage 1.5 NACK halts before full dispatch, saving token budget on structurally flawed code. Stage 1.5 PASS unlocks Stage 2.
- **`merge-findings.mjs`** (since 4.7.0): deduplicates and merges findings from all review stages into a single consolidated report. Handles cross-specialist overlap (e.g., Marcus and Diego both flag the same missing error handler) — keeps the most specific finding, discards duplicates, and produces a ranked severity list.
- **`config.review.parallel_reviewers`** (since 5.0.0): configurable cap on Stage 2 parallel reviewer count (default: 4). Useful for projects with limited token budgets or where fewer specialist perspectives suffice. Set in `.aped/config.yaml` under `review.parallel_reviewers`.
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
- **MCP**: `aped_state.advance` (marks sprint as shipped), `aped_ticket` (bulk-closes tickets on ship)
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
- **Oracle**: `oracle-qa.sh` — validates test coverage against ACs, checks for missing edge-case scenarios

### `aped-quick <title> [fix|feature|refactor]`
- Quick fix / small feature — bypasses the full pipeline
- **Spec isolation**: each quick spec is an independent file with a status (`draft → in-progress → done`). Multiple can run in parallel. Auto-resume.

### `aped-from-ticket <ticket-id-or-url>`
- **External ticket intake** — single-shot bridge for tickets that bypass `aped-epics` planning (production bugs, partner asks, mid-sprint requests).
- Reads `ticket_system` from `.aped/config.yaml`; refuses early if `none`. Provider parity is mandatory: `gh` / `glab` CLI for github / gitlab; Linear MCP for Linear; Jira/Atlassian MCP for Jira.
- **Flow**: parse argument (bare ID or full URL — host must match `ticket_system`) → fetch ticket → compile project context (PRD overlap, architecture constraints, related stories, codebase patterns) → draft story collaboratively with ⏸ GATE → persist under `external-tickets` bucket or auto-matched epic → register in `state.yaml` with `source: from_ticket` (out-of-sprint by default — explicit promotion required) → 3-option handoff prompt (`[D]` run aped-dev / `[P]` promote to active sprint / `[S]` stop).
- **Optional comment-back** to the source ticket (opt-in via `from_ticket.ticket_comment.enabled`).
- **All knobs** under `from_ticket:` in `.aped/config.yaml`: `story_placement.{mode, bucket_epic}`, `ticket_comment.{enabled, template}`, `sprint_integration.auto_add`, `handoff.after_story`. Sensible defaults — works out-of-the-box without config edits.

### `aped-triage [ticket-id | description]`
- **Purpose**: rapid severity/priority assessment of an incoming issue before it enters the pipeline
- Routes to the appropriate entry point: `aped-quick` (trivial), `aped-from-ticket` (external), or full pipeline (`aped-analyze`) based on complexity score
- Produces a one-page triage card with severity, blast radius, recommended path, and estimated effort

### `aped-pre-mortem [artifact-path]`
- **Purpose**: prospective failure analysis on any APED artifact (PRD, architecture, epic plan, story spec) before it reaches the next gate
- Enumerates the top failure modes ("how could this go wrong?"), assigns likelihood and impact, and produces mitigations
- Complements `aped-elicit` (which is broader) — `aped-pre-mortem` is specifically structured around risk registers

### `aped-design-twice [topic]`
- **Purpose**: generates two competing designs for the same problem, then evaluates trade-offs
- Forces genuine alternatives (not strawman vs. real) — each design must be independently viable
- Produces a comparison matrix and a recommendation with dissenting-opinion section

### `aped-grill [artifact-path | story-key]`
- **Purpose**: adversarial stress-test of a completed artifact or implementation
- Goes beyond review — actively tries to break assumptions, find contradictions, and expose implicit dependencies
- Produces a findings report with severity tiers (structural / significant / cosmetic)

### `aped-glossary` (since 6.0.0)
- **Purpose**: maintains a project-wide canonical domain glossary at `docs/aped/glossary.md` so PRD / architecture / stories / code use the same vocabulary
- **Iron Law**: ONE WORD, ONE MEANING, ONE PLACE — synonyms live under `_Avoid:_` so future skill checks can flag drift
- **Workflow**: discover candidate terms from upstream artefacts (PRD, architecture, stories) → bucket as NEW / DRIFT / STALE → per-term loop with one-question-at-a-time confirmation → write/revise (append + revise, never rewrite)
- Pocock CONTEXT.md analog. Triggers: "build glossary", "update glossary", "domain dictionary", "shared language"

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
- 📊 **Sync-logs** (since 3.12.0; retention since 4.1.0) — Ticket System Setup wraps every step (`auth_check`, `projects`, `labels`, `milestones`, `modified_tickets`, `out_of_scope_moves`) with `aped/scripts/sync-log.sh phase $LOG <name> <status>`. `record api_calls_total` per provider call. Final path emitted to user + recorded in state.yaml. **Opt-in retention** via `sync_logs.retention.{mode, keep_last_n}` in `config.yaml` prunes the oldest provider-scoped logs on every successful `end`; `aped-method sync-logs prune [--apply] [--provider=NAME]` runs a one-shot manual sweep (default dry-run). The `meta` subcommand (4.1.0) is the helper-blessed way to write top-level extension keys (`trigger`, `scope`, `source_pr`, etc.) without hand-rolling JSON.
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
- 📜 **`corrections` log** (since 3.12.0; split out of state.yaml in 4.1.0 / schema v2) — `aped-course` appends an entry `{date, type, reason, artifacts_updated, affected_stories}` whenever a scope change touches an upstream artefact mid-sprint. Distinct from `lessons.md` (post-epic retros) and CHANGELOG (product-level). Append-only. **Schema v2** (4.1.0+): the array lives in the file at `corrections_pointer` (default tracks `output_path` from config.yaml — `docs/aped/state-corrections.yaml` for the standard scaffold; overridable via `state.corrections_path`). state.yaml carries `corrections_pointer` (runtime source of truth) + `corrections_count` (length cache so readers don't open the sister file just to know whether anything's logged). Writer: `bash {{APED_DIR}}/scripts/sync-state.sh <<< 'append-correction <json>'` — validates required keys, locks the file, updates the count atomically. **Schema v1 fallback**: unmigrated 3.x scaffolds keep using top-level `corrections:` in state.yaml until `aped-method --update` runs `migrate-state.sh`.
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

### state.yaml schema (v1 since 3.12.0, v2 since 4.1.0)

- **Oracle**: `oracle-state.sh` — validates state.yaml integrity, checks for schema conformance, detects stale entries and orphaned references

Existing scaffolds keep working without changes (missing `schema_version` is treated as implicit 1). `validate-state.sh` accepts both `1` and `2`. Migration is **automatic and idempotent** — `aped-method --update` runs `migrate-state.sh` 1 → 2 as a Phase-3 task, writing a backup at `docs/state.yaml.pre-v2-migration.bak` before any mutation.

#### Schema v1 (3.12.0 → 4.0.x)

- `schema_version: 1` at top.
- Optional top-level slots populated by skills: `ticket_sync` (provider-agnostic, by `aped-epics`), `backlog_future_scope` (by `aped-epics` + `aped-course`), `corrections` (append-only, by `aped-course`).
- Phase-specific structured records under `pipeline.phases.<phase>` (see per-phase deltas above).
- `validate-state.sh` recognises the new top-level blocks; unknown blocks warn-only (forward-compat).
- `migrate-state.sh` was a stub reserving the call site for the next bump.

#### Schema v2 (4.1.0+)

- `schema_version: 2` at top. `migrate-state.sh` 1 → 2 implements the bump; idempotent on v2.
- **`corrections` is split out of state.yaml** into a sibling file at the path stored in `corrections_pointer`. The default tracks the project's `output_path` from config.yaml — for the standard scaffold (`output_path: docs/aped`) the pointer is `docs/aped/state-corrections.yaml`; for a custom `output_path: docs` it would be `docs/state-corrections.yaml`. Overridable via `state.corrections_path` in `config.yaml` (since 4.1.2 — the 4.1.0 / 4.1.1 scaffolds hardcoded the literal `docs/state-corrections.yaml`, which migrate-state.sh now self-heals on upgrade). state.yaml carries `corrections_count` as a length cache.
- All other top-level slots from v1 are unchanged: `ticket_sync`, `backlog_future_scope`, `pipeline`, `sprint`.
- `validate-state.sh` errors (exit 4) on schema v2 with a residual top-level `corrections:` — that's the unambiguous signal that migration didn't complete or was reverted manually. Hint points at `migrate-state.sh`.
- New `sync-state.sh` subcommands shipped with v2: `mark-story-done <key>` (atomic flip + runtime trim — clears `worktree`, `started_at`, `dispatched_at`, `ticket_sync_status`; preserves permanent fields) and `append-correction <json>` (writes to the corrections file + bumps the state.yaml count atomically). yq is hard-required for `migrate-state.sh` and recommended for full `mark-story-done` cleanup; without yq, `mark-story-done` falls back to setting status + completed_at and leaves runtime fields with a warn-stderr.

### Slash-commands removal (4.0.0)

The 3.x slash-command shells (`/aped-X`, scaffolded as `.claude/commands/aped-*.md`) were retired in 4.0.0. Skills are the only invocation surface — call them by name via Claude Code's Skill tool, or let the runtime route from a phrase that matches the skill's `description:`. `aped-method doctor` flags any leftover `.claude/commands/aped-*.md` stubs and a leftover `commands_path:` key in `aped/config.yaml` as warn-level diagnostics (non-blocking — exitCode stays 0) until the user removes them.

---

## What changed in 4.7.0 → 5.5.1

Cumulative changes from v4.7.0 through v5.5.1. Only deltas not already covered in per-phase sections above. Nothing breaking from 4.x — every existing scaffold continues to work without configuration changes.

### Oracle scripts (5.0.0+)

Six oracle scripts shipped as automated validation gates, each runnable standalone or invoked by its parent skill:

| Script | Phase | Purpose |
|---|---|---|
| `oracle-prd.sh` | PRD | FR/NFR structure, AC completeness, metric unambiguity |
| `oracle-arch.sh` | Architecture | ADR consistency, PRD constraint alignment, pattern conflicts |
| `oracle-epics.sh` | Epics | FR coverage, dependency cycle detection, story granularity |
| `oracle-dev.sh` | Dev | TDD cycle completeness, coverage thresholds, commit hygiene |
| `oracle-qa.sh` | QA | AC coverage in tests, edge-case scenario completeness |
| `oracle-state.sh` | State | Schema conformance, stale entries, orphaned references |

All oracles exit 0 (pass) / 1 (findings, non-blocking) / 2 (structural failure, blocking). Findings are appended to the skill's report output.

### Review Stage 1.5 (4.7.0)

- Three new specialists — **Hannah** (dependency audit), **Eli** (error-path coverage), **Aaron** (API contract consistency) — run synchronously between Eva (Stage 1) and the full parallel dispatch (Stage 2).
- `merge-findings.mjs` deduplicates cross-specialist overlap into a single ranked report.
- See the updated Review phase section (section 8) for details.

### MCP tool integration (5.0.0+)

- `aped_state.advance` — programmatic state machine transitions, used in Dev (story completion) and Ship (sprint closure).
- `aped_ticket` — programmatic ticket CRUD, used in Epics (ticket seeding) and Ship (bulk close).

### Dev phase hardening (5.0.0 → 5.3.0)

- **Completion-gate checklist** (5.0.0): structured exit criteria for dev phase.
- **Commit-gate hook** (5.0.0): pre-commit validation for test evidence and TODO markers.
- **RED witness enforcement** (5.2.0): `tdd-red-marker` hook rejects GREEN commits without a preceding RED on record.
- **Verbatim AC spec-quote rule** (5.3.0): ACs must be quoted verbatim from the story spec in test files.

### Review enhancements (4.7.0 → 5.0.0)

- **Stage 1.5** with Hannah/Eli/Aaron (4.7.0).
- **`merge-findings.mjs`** for cross-specialist deduplication (4.7.0).
- **`config.review.parallel_reviewers`** — configurable Stage 2 reviewer cap, default 4 (5.0.0).

### New utilities (5.1.0 → 5.4.0)

- **`aped-triage`** (5.1.0): rapid severity/priority assessment and pipeline routing.
- **`aped-pre-mortem`** (5.2.0): prospective failure analysis on any APED artifact.
- **`aped-design-twice`** (5.3.0): competing-designs generator with trade-off matrix.
- **`aped-grill`** (5.4.0): adversarial stress-test beyond standard review.

### Skill count

APED ships **34 skills** as of v6.0.0 (up from 25 in v3.12.0). v6.0.0 keeps the existing 33 unchanged structurally and adds one new — `aped-glossary` — bringing the count to 34.

---

## What changed in 6.0.0 (BREAKING)

> Released 2026-05-01.

### BMAD-style skill decomposition

Every skill moved from flat `aped-X.md` to a directory layout. Two tiers:

- **10 phase skills fully decomposed** into `SKILL.md` + `workflow.md` + 6–12 step files: `aped-story` (8 steps), `aped-dev` (8), `aped-review` (12), `aped-epics` (9), `aped-arch` (10), `aped-ux` (7), `aped-prd` (6), `aped-debug` (9), `aped-brainstorm` (7), `aped-analyze` (6).
- **23 utility skills converted to directory + workflow.md split** (no per-step decomposition; content preserved): `aped-arch-audit`, `aped-from-ticket`, `aped-sprint`, `aped-retro`, `aped-ship`, `aped-prfaq`, `aped-receive-review`, `aped-lead`, `aped-iterate`, plus 14 small skills (`aped-checkpoint`, `aped-claude`, `aped-context`, etc.) that ship as `aped-X/SKILL.md` only.

The Claude Code skill loader has supported both layouts since v4.4.0 — flat 5.x scaffolds keep working without re-running `--update`.

### Branch creation moved from `aped-dev` to `aped-story`

`aped-story/steps/step-01-init.md` is the canonical place that refuses `main`/`master`/`prod`/`production`/`develop`/`release/*`/detached HEAD. Step 03 creates `feature/{ticket}-{slug}`. `aped-dev/steps/step-01-init.md` only verifies — never creates. The ` story-must-not-run-on-main` gate is now structural, not advisory.

### `aped-review` Review Record location

Bug fix: `aped-review` no longer creates a separate `docs/reviews/{story-key}-review.md` file. The Review Record is appended to the story file at `docs/aped/stories/{story-key}.md` under a `## Review Record` section. Step 12's completion gate has a hard `[ ] **NO separate review file created** anywhere` item.

---

