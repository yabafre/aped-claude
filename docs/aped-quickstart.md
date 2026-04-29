
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

**23 slash commands** cover it all: ideation, critique, parallel sprint, external ticket intake, retrospective, maintenance.

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
aped-sprint             # from main project: dispatches DAG + worktrees
aped-lead               # batch-approve check-ins (periodic return)
aped-ship               # end-of-sprint: merge + pre-push checks
```

- Up to **3 stories** in parallel by default (`parallel_limit`), **2 reviews** max (`review_limit`)
- Each story runs in `../{project}-{ticket}` on branch `feature/{ticket}-{slug}`
- With **workmux**: auto-tmux + Claude pre-launched. Without: commands printed for you to run manually.
- Story Leaders HALT at every transition (`story-ready`, `dev-done`, `review-done`) and wait for the Lead Dev

**Golden rule**: you are the Lead Dev. `aped-lead` auto-approves what is clearly safe (tests 100%, git clean, no blockers) and **escalates everything else to you**. No story on autopilot.

---

## 6. Quick troubleshooting

```bash
aped-method doctor          # verifies scaffold, hooks, state, commands, symlinks
aped-method symlink         # repairs cross-tool symlinks if needed
aped-status                # sprint dashboard (inside Claude Code)
```

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

### state.yaml schema (v1 since 3.12.0; v2 since 4.1.0)

`validate-state.sh` accepts both `schema_version: 1` and `schema_version: 2`. **Migration is automatic** — `aped-method --update` runs `migrate-state.sh` 1 → 2, idempotent on v2, with a backup at `docs/state.yaml.pre-v2-migration.bak` before any mutation. Existing scaffolds without `schema_version` are treated as implicit 1.

Top-level slots:

- **`ticket_sync`** (v1+) — provider-agnostic sync metadata after `aped-epics` Ticket System Setup. Replaces project-specific `linear_sync` / `github_sync` / etc. patterns. Re-syncs append to `modified_tickets`.
- **`backlog_future_scope`** (v1+) — explicitly-punted tickets with category buckets. Written by `aped-epics` and `aped-course`.
- **`corrections_pointer` + `corrections_count`** (v2; in v1 was a top-level `corrections:` array) — append-only log of artefact revisions (PRD edit, FR descope, etc.) split into `docs/state-corrections.yaml` (overridable via `state.corrections_path`). state.yaml carries the pointer + count cache. Writer: `bash {{APED_DIR}}/scripts/sync-state.sh <<< 'append-correction <json>'`. Distinct from `lessons.md` and CHANGELOG.

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

### Read next

If you want the full per-phase delta, see [APED — Phases](.aped-phases.md) §"What changed in 3.11.0 → 3.12.0".  
If you want to understand which discipline ships with which persona, see [APED — Personas & Teams](.aped-personas.md) §"What changed in 3.11.0 → 3.12.0".


---


