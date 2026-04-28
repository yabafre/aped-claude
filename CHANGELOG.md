# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.11.0] - 2026-04-28

Tier 1 + Tier 2 + Tier 3 + Tier 4 of the Superpowers absorption (rhetorical + execution + process discipline + debug sub-disciplines + meta-skills) plus two lived-defect fixes.

### Added — Tier 4 — Superpowers second-pass absorption (debug sub-disciplines + meta-skills + dev-side discipline + brainstorm hardening + session-start)

A second cross-analysis of `obra/superpowers` against the Tier 1-3 absorption (four parallel research agents) found 11 disciplines the previous cycle missed. Biggest gaps: `/aped-debug` lifted only the 4-phase shell of `systematic-debugging` and ignored its three sibling sub-disciplines that carry the real diagnostic muscle; the entire `writing-skills` cluster (CSO description principle, persuasion principles, RED-GREEN-REFACTOR for skills) was absent; APED reviewed code but didn't teach receiving review; no agent-facing rule forced skill-invocation discipline at the CLAUDE.md level; `aped-brainstorm` had no spec-self-review gate before handoff to `/aped-prd`.

- **`/aped-debug` gains 3 sub-disciplines** — `### Sub-discipline: Root-cause tracing` in Phase 1 (instrument boundaries with `console.error`, trace backward, name the original trigger before exit), `### Sub-discipline: Condition-based waiting` in Phase 2 (replace `setTimeout` with `waitFor()` polling — 10ms, timeout-bounded, fresh getter inside loop; `condition-based-waiting-example.ts` reference impl shipped alongside), `### Sub-discipline: Defense-in-depth` in Phase 4 (4-layer validation pattern: entry / business logic / environment / debug — applied before declaring resolved). Iron Laws and forbidden patterns lifted verbatim from the corresponding Superpowers source files.
- **`/aped-receive-review` skill (NEW)** — closes the asymmetry: APED long had `/aped-review` (giving review) but no discipline for *receiving* it. Iron Law `NO PERFORMATIVE AGREEMENT — TECHNICAL VERIFICATION FIRST`. Forbidden-responses table (no "you're absolutely right!" capitulation), 6-step Response Pattern, YAGNI grep gate (don't implement on unused endpoints — grep first), multi-item clarification gate (HALT and ask before implementing if any item is unclear), acknowledgment templates that make pushback technical-not-stubborn.
- **`aped-skills/` reference directory (NEW)** — three reference docs callable on demand from any skill. `anthropic-best-practices.md` (CSO description principle, gerund naming, third-person, no-placeholders — foundation for future skill authoring). `persuasion-principles.md` (7-principle table verbatim, Meincke 2025 attribution, Authority/Commitment/Scarcity/Unity usage, ethical-use test — explains *why* Iron Laws work). `testing-skills-with-subagents.md` (RED-GREEN-REFACTOR mapping table, 7-pressure-type table, rationalization-table template, bulletproof checklist — the runner methodology for the Tier 3 harness).
- **`## Skill Invocation Discipline` block in CLAUDE.md template** — appends the 1%-rule (verbatim from `using-superpowers`: *"if there's even a 1% chance a skill is relevant, invoke it"*), 12-row rationalization table, instruction priority (user > skills > defaults), skill priority order (process first, implementation second). Ambient enforcement at session level — no longer purely opt-in via slash command.
- **`aped-brainstorm` Phase 4 hardening** — `### Spec self-review` checklist (placeholder scan + contradictions + scope + ambiguity + YAGNI) and `### Spec-reviewer dispatch` (Agent tool subagent dispatch with the verbatim reviewer prompt). Catches spec bugs before they burn `/aped-prd` cycles.
- **`aped-review` Marcus persona — Testing anti-patterns checklist** — 5 anti-patterns + their gate functions verbatim from `testing-anti-patterns.md`. Self-review item added: "Marcus checked for the 5 testing anti-patterns". Catches mock-as-test fraud during review.
- **`aped-dev` — Blocker-halt gate** — explicit STOP conditions (missing dependency, test fail, unclear instruction, repeated verification fail) + "never start on main without consent" rule. References `/aped-receive-review` from the post-review-feedback flow. Prevents wasted execution on broken plans.
- **`aped-story` and `aped-epics` — File structure design (upfront)** — new section before task / story breakdown. Maps files with single-responsibility rule (split by responsibility, not layer); 3-bullet decision template per file. Better task decomposition; coherent file boundaries across stories.
- **Skill-triggering harness — runner methodology** — `tests/skill-triggering/README.md` no longer placeholder. Lifts the RED-GREEN-REFACTOR-for-skills runner methodology, the TDD-mapping table, the 7-pressure-type table, and the Bulletproof Skill checklist verbatim from `testing-skills-with-subagents.md`. Three new pressure scenarios drop in: `aped-debug-time-pressure-emergency-fix.md` (production API down, $15k/min, manager pressure — adapted from Superpowers test-pressure-1), `aped-debug-sunk-cost-exhaustion.md` (4h debugging at 8pm, dinner waits — tests the 3-failed-fixes rule under exhaustion), `aped-receive-review-authority-pushback.md` (senior + tech-lead approve a quick fix without root cause — tests the new skill's pushback discipline). 4 scenario files total now.
- **Session-start hook (opt-in via `aped-method session-start`)** — reads `aped/skills/SKILL-INDEX.md` and emits its content as `additionalContext` on `SessionStart` (matchers `startup|clear|compact`). Silent on missing file. Default scaffold has no SessionStart entry — explicitly opt-in. Skill-index generator added to `scripts.js`: walks `templates/skills/` for `aped-*.md` files and emits one line per skill with its `description:` frontmatter, sorted deterministically. Locked by 3 cases in `tests/sprint-scripts.test.js`.
- **Visual companion (opt-in via `aped-method visual-companion`)** — bash HTTP server (port from `config.yaml`, default 3737) + `frame-template.html` with the CSS classes lifted from `visual-companion.md` (`.options`, `.cards`, `.mockup`, `.mock-nav`, etc.). No auto-launch in default scaffold.
- **`tests/lint-placeholders.test.js` — 3 cases for `aped-skills/` reference files** — verifies the lint passes despite legitimate reference content (illustrative `<placeholder>` mentions, "TBD" cited as banned, etc.). Pending-contract pattern: files materialise from the parallel skills agent in this same cycle.
- **`<!-- aped-lint-disable -->` / `<!-- aped-lint-enable -->` markers in `lint-placeholders.sh`** — reference docs that need to quote the banned tokens verbatim (e.g. `aped-skills/anthropic-best-practices.md` listing what the lint forbids) bracket those passages with these HTML-comment markers. The lint pre-pass blanks lines inside the bracket while preserving line count, so reported line numbers still match the source file. Locked by 1 regression case in `tests/lint-placeholders.test.js`. Keep the disabled span tight — never wrap a whole file.

### Added — process discipline (Tier 3, Superpowers absorption)
- **Two-stage review in `/aped-review`** — Eva (AC validator) now runs alone first as a synchronous blocking gate. On Eva PASS, the remaining specialists (Marcus, Rex, conditional domain specialists) dispatch in parallel as before. On Eva NACK, `/aped-review` HALTs and asks the user `[F]ix → return story to dev` / `[O]verride → proceed with remaining specialists despite the AC gap, with a recorded reason that prefixes the merged report`. Self-review checklist gains a Two-stage ordering item. Spec-compliance precedes quality — no more wasted dispatches on a story that's about to return to dev for an AC gap.
- **Subagent status protocol on `checkin.sh`** — `post` accepts an optional `--status <DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED>` flag. The status is the agent-confidence dimension, distinct from the existing kind (`story-ready | dev-done | review-done | dev-blocked`) and workflow status (`pending | approved | blocked`). Persisted in JSONL as `agent_status`. Default-status-for-kind: `story-ready/dev-done/review-done` → `DONE`, `dev-blocked` → `BLOCKED`. `DONE_WITH_CONCERNS` and `NEEDS_CONTEXT` require a non-empty reason; `--status BLOCKED` with kind `dev-done` is rejected (use kind `dev-blocked`); unknown statuses exit 1. `/aped-lead` reads `agent_status` first and routes accordingly: only `DONE` runs `check-auto-approve.sh`; `DONE_WITH_CONCERNS` surfaces the concern with `[A]pprove despite / [R]eturn-to-dev` choices; `NEEDS_CONTEXT` escalates priority HIGH and surfaces the question; `BLOCKED` flows through the existing dev-blocked path. Backward compatible — empty `agent_status` is treated as `DONE`. Locked by 7 cases in `tests/sprint-scripts.test.js`.
- **Skill-triggering harness placeholder** — `tests/skill-triggering/README.md` documents the pattern (control vs treatment subagents, pressure-axis prompts, behaviour assertions) lifted from Superpowers' "Writing skills" approach (TDD applied to process documentation). `tests/skill-triggering/scenarios/example-aped-debug-skip-investigation.md` is the canonical reference scenario shape, exercising `/aped-debug`'s Iron Law against a stacked sunk-cost + time-pressure + social-proof prompt. No runner shipped yet — the format is fixed so future cycles can drop in a vitest helper without re-litigating it.

### Added — execution discipline (Tier 2, Superpowers absorption)
- **`/aped-debug` skill** — new systematic debugging command. Iron Law: NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST. Four phases (Reproduce → Root-cause-trace → Fix-with-test → Verify) with explicit gates between each. Includes the **3-failed-fixes rule** lifted verbatim from Superpowers' `systematic-debugging`: after three attempts that didn't move the failure forward, the skill HALTs and questions the architecture/spec/test rather than letting the agent try fix #4. Self-review checklist + Invocation contexts (standalone / from `/aped-dev` on persistent test red / from `/aped-review` on root-cause findings). Registered in `COMMAND_DEFS`; `docs/COMMANDS.md` regenerated.
- **`## Verification gate` in `/aped-dev` and `/aped-review`** — operationalises the Iron Law "NO PASS WITHOUT FRESH EVIDENCE IN THIS MESSAGE". Lists the nine forbidden completion phrases (`should work`, `looks good`, `probably fine`, `tests should pass`, `should be ok`, `Done!`, `Great!`, `Perfect!`, `All set`) and the three accepted evidence forms (captured command output, diff with test output, screenshot reference). Same gate either side of the dev/review handoff.
- **`## Task granularity contract` in `/aped-story`** — five must-haves per task (exact file path, full code block, exact test command, expected output, literal commit step), 2–5 minute target runtime per task, forbidden-pattern table, and a concrete good/bad task example pair. Self-review checklist gains the granularity item.
- **`verify-claims.js` opt-in advisory hook** + `aped-method verify-claims` install command. PostToolUse on Bash. Scans tool output for the same nine forbidden phrases and emits an advisory when none of the evidence patterns (`PASS`, `Tests: N passed`, exit code 0, `✓`, etc.) appears within `verify_claims.evidence_window` lines (default 30) before the offending phrase, OR on the same line as the phrase. Phrase matching is word-boundary aware (rejects `doneness` matching `Done`). Falls back to `stderr` when `stdout` is empty. Hook timeout raised to 8s for cold-start tolerance. Never blocks. Off unless explicitly installed. Configurable via `verify_claims.enabled` (and `verify_claims.evidence_window: 0` to disable the window check entirely while keeping phrase scanning) in `config.yaml`. Locked by `tests/verify-claims.test.js` (regression cases include kill switch, evidence window, same-line evidence, word-boundary, stderr fallback, never-blocks, non-Bash skip, advisory cap). **Known limitations:** the hook scans Bash *tool output*, not agent prose — phrases that appear only in the agent's chat-side response are invisible to PostToolUse hooks. Use the in-skill Verification gate to catch those.
- **`/aped-debug` cross-references** — `/aped-dev` HALT Conditions add a "3-failed-fixes rule" pointer to `/aped-debug`; `/aped-review` Step 6 (Merge Findings) routes root-cause findings to `/aped-debug` rather than letting specialists guess. The 3-failed-fixes definition is unified across the three files: *three successive attempts that did not turn the original repro green* (a different test breaking does not count as "moved forward").

### Added — rhetorical discipline (Tier 1, Superpowers absorption)
- **`lint-placeholders.sh`** — reusable artefact lint script under `${APED_DIR}/scripts/`. Catches `TBD`, `TODO`, `FIXME`, `XXX`, `<placeholder>`, `<!-- placeholder -->`, `add appropriate error handling`, `similar to story N`, `similar to task N`, `implement later`, `to be defined`, `to be determined`, and lone-ellipsis lines. Mustache template tokens of the form `{{name}}` and `{name}` (where `name` is alphanumeric + underscore) are scrubbed before scanning so they never trip the lint; ellipsis mid-prose (`etc...`) is whitelisted. Exit 0 = clean, 1 = hits, 2 = file/config error. Disabled silently when `placeholder_lint.enabled: false` in `config.yaml`. Locked by `tests/lint-placeholders.test.js` (10 cases).
- **`placeholder_lint.enabled` flag** in `config.yaml` (default `true`). Lets projects with legitimate `TODO`/`TBD` use opt out without forking.
- **Iron Law / Red Flags / Rationalizations** sub-sections under `## Critical Rules` in `aped-{prd,dev,review,story}.md` — phase-specific named failure modes (e.g. `aped-dev`: "NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST" + Red Flags table for TDD shortcuts; `aped-review`: "NO PASS WITHOUT FRESH EVIDENCE IN THIS MESSAGE"). Modelled on Superpowers' Iron Law rhetorical pattern.
- **`## Self-review (run before user gate)` checklist** added to 11 artefact-producing skills (`aped-prd/arch/ux/epics/story/context/from-ticket/prfaq/brainstorm/retro/review`). Each ≤ 6 items: lint call, phase-specific consistency checks, ambiguity scan, required sections present. Skill HALTs if a check fails, presents `[F]ix` / `[O]verride (record reason)`.
- **`## Reader persona` section in `aped-story.md`** — verbatim "enthusiastic junior with poor taste, no judgement, no project context, and an aversion to testing". Canonical reader-target making granularity testable.

### Changed — frontmatter audit (Tier 1)
- **23 skill `description:` frontmatter values audited and tightened** to contain *only* triggering conditions (`Use when user says X` / `or invokes /aped-X` / discriminator caveats). Workflow-summary opening sentences (e.g. "Generates PRD section-by-section…", "Pulls a ticket from the configured ticket system, drafts a story…") were removed: agents that read description shortcuts and skip the body now get clean trigger signal instead of partial workflow narration. Real triggering phrases preserved verbatim; functional invocation cues unchanged.

### Fixed — lived defects (commit ccf0e28)
- **`/aped-arch` now writes `architecture.md` incrementally**, not as a single end-of-phase regeneration. Earlier behaviour deferred all writes until Phase 5, which made the final document fragile (one large generation, easy to drop sections), invisible to mid-phase status checks, and useless on session interruption — a partially-architected project left no trace. The skill now scaffolds a tracked `architecture.md` skeleton at Phase 0 (frontmatter `current_subphase`, `completed_subphases`, `last_updated`, `phases_planned`), appends each validated decision into its section in place after every gate, and mirrors progress into `pipeline.phases.architecture.{current_subphase,completed_subphases}` in `state.yaml`. The final Output step is a finalisation (status → done, last_updated bump), no longer a regeneration. Resuming an Arch session announces its `current_subphase` and skips ahead to the right gate. The `state.yaml` schema gains optional `current_subphase` / `completed_subphases` fields under any `pipeline.phases.<phase>` (additive, backward-compat — no required field, other phases may adopt the same pattern).
- **`guardrail.sh` no longer trips on conversational mentions of pipeline keywords.** The previous keyword-regex layer treated bare tokens (`review`, `prd`, `dev`, `epic`, `story`, `code`) as command intent, so prompts like _"bon petite review par rapport à ta proposition pour le prd"_ produced a `PREMATURE_REVIEW` warning even though the user was explicitly speaking *about* a proposal, not asking for a review. The intent layer is now semantic: a `WANTS_*` flag fires only when (a) the literal `/aped-<phase>` slash command appears, (b) the prompt is a single-word match (e.g. just `review`), or (c) the prompt is short (< 80 chars) and starts with an imperative tied to that phase. Conversational connectors anywhere in the prompt — FR (`par rapport à`, `concernant`, `à propos de`, `petite/petit`, `ta proposition`, `votre avis`) and EN (`about`, `regarding`, `your proposal`, `speaking of`, `with respect to`) — suppress bare-keyword matches; explicit slashes still fire. The hook stays advisory, keeps the 5-second timeout, and preserves rules 0–6 unchanged. Locked by `tests/guardrail-intent.test.js` (7 cases including the user-reported false positive).

## [3.10.2] - 2026-04-25

Cross-phase context flow. Pipeline-phase skills used to load upstream artefacts via `state.yaml` paths, which left brownfield context unread (`/aped-context`'s `project-context.md` was produced but never consumed by `/aped-analyze`, `/aped-prd`, `/aped-arch`, `/aped-epics`, `/aped-story`, `/aped-dev`, `/aped-review`); two skills referenced upstream documents in their prose without ever loading them at runtime; `/aped-retro` wrote `lessons.md` with a `Scope:` field that no skill consumed, so the post-epic feedback loop never closed. This release replaces state-path loading with a glob-based **Input Discovery** step at the entry of every pipeline-phase skill — modelled after BMAD's `step-01-init.md` and the existing `aped-from-ticket` precedent — and wires `lessons.md` into the three skills its `Scope:` field always targeted. Greenfield/brownfield is now detected, not declared: `/aped-context` and `/aped-analyze` are no longer mutually exclusive entry points.

### Added
- **Input Discovery section in every pipeline-phase skill** (`/aped-analyze`, `/aped-prd`, `/aped-ux`, `/aped-arch`, `/aped-epics`, `/aped-story`, `/aped-dev`, `/aped-review`). Each skill globs `{{OUTPUT_DIR}}/**`, `{{APED_DIR}}/**`, `docs/**` for the artefacts it consumes, hard-stops on missing required prereqs (e.g. architecture without a PRD), reports brownfield/greenfield inferred from `project-context.md` presence, and HALTs for a light `[C]` confirmation before proceeding (auto-skipped in worktree mode for `/aped-dev` and `/aped-review` where no human is at the keyboard).
- **Lessons feedback loop closed.** `/aped-story`, `/aped-dev`, and `/aped-review` now discover `{{OUTPUT_DIR}}/lessons.md`, filter entries by `Scope:` matching the skill (`/aped-story | /aped-dev | /aped-review | all`), and apply the rules at runtime: `/aped-story` cites lessons in Discussion Points and adjusts the draft; `/aped-dev` adds them to the Pre-Implementation Checklist and interpolates them into the `epic-{N}-context.md` cache; `/aped-review` augments each specialist's prompt with their scoped lessons so checks are explicit, not advisory.
- **Previous-stories continuity in `/aped-story`.** Discovery loads completed stories of the current epic so the new draft reuses earlier decisions (validation library, schema choices, naming) instead of re-litigating them, and surfaces implicit dependencies between stories of the same epic.
- **`docs/dev/discovery-pattern.md`** — canonical, dev-facing reference for the pattern. Future skill authors copy-paste from it and customise per skill (globs, required prereqs ✱, brownfield bias). Documents why duplicated-inline (no runtime include) was chosen and which Tier-1 skills the pattern applies to.

### Fixed
- **`/aped-arch` now loads `project-context.md`.** Previously it loaded brief + PRD + UX only, so brownfield architecture decisions ran with no awareness of the existing stack documented by `/aped-context`. The Council and pattern decisions now treat the existing tech stack as a hard constraint when present.
- **`/aped-ux` now loads the PRD, brief, and project context.** Prior versions referenced "PRD user journeys", "real content from PRD", "Read relevant FRs for this screen" in their prose without ever loading the PRD at runtime — the skill silently relied on the PRD being in conversation context from a prior turn, which broke as soon as the user resumed UX work in a new session. Result: hallucinated FRs, invented screens, lorem-ipsum-by-another-name. Discovery now loads the PRD as a required prereq (HALT if missing) and grounds every screen, mock data point, and FR reference in the actual document.

### Changed
- **`/aped-context` and `/aped-analyze` are no longer exclusive.** Both descriptions previously said "Not for X — use Y" and the surrounding tooling didn't cross-load. Now `/aped-analyze` discovers `project-context.md` if present and runs in brownfield mode (Discovery rounds reframe as "what's new relative to the existing system"); `/aped-context` is a producer like `/aped-research`, callable independently. Hybrid projects (new feature in a legacy system) benefit from running both.
- **`/aped-review` architecture handling** softened from required to "strongly recommended". Without `architecture.md`, the Pattern Compliance specialist runs in degraded mode (must infer conventions from the codebase) and the user is warned, but review still proceeds — projects that legitimately skip `/aped-arch` are no longer blocked from running review.
- **`epic-{N}-context.md` cache schema.** The compiled cache (re-used across every story in an epic) now includes `project-context.md` (brownfield only) and `Scope: /aped-dev | all` lessons as compilation inputs alongside the existing PRD / architecture / UX / completed-stories / code-patterns sources. Stale-cache detection still uses story-completion mtime — invalidate manually if you edit lessons mid-epic.
- **Setup blocks across pipeline-phase skills** no longer load upstream documents via `state.yaml` paths. `state.yaml` is still read for pipeline status (e.g. "this phase is already done — redo or skip?") but artefact loading is owned by Input Discovery.

### Why
The state-path-only approach worked when users ran every phase in sequence and the model kept everything in conversation context. The moment the user resumed work in a new session — or produced an artefact outside the state-tracked flow (e.g. ran `/aped-context` standalone, hand-edited `docs/aped/lessons.md` after a retro, or dropped a research file into `docs/aped/`) — those artefacts were invisible to downstream skills. The two latent bugs in `/aped-arch` and `/aped-ux` are symptoms of the same root cause: the loading contract was implicit, the prose assumed it had loaded what it referenced, and there was no glob-discovery to catch the gap. The new pattern mirrors how BMAD handles input loading in its `step-01-init.md` files and the precedent `aped-from-ticket` already implemented in the same codebase: discover everything, confirm with the user, load completely, bias the workflow. The `lessons.md` integration was the most extreme symptom — `/aped-retro`'s entire raison d'être (cross-epic learning) had no runtime consumer; this release closes that loop without changing the retro skill itself.

### Migration notes for existing installs
Run `aped-method --update` to pull in the refactored skills, the regenerated `docs/COMMANDS.md`, and the new `docs/dev/discovery-pattern.md`. **No state.yaml schema change. No config schema change. No breaking changes.** Existing projects continue to work — discovery globs find the same artefacts the previous skills loaded via state paths, plus the ones they previously missed (`project-context.md`, `lessons.md`, completed stories of the current epic). Brownfield projects that ran `/aped-context` previously will see their context.md picked up automatically by every subsequent skill from this release onward — no flag, no command change. Projects with an existing `lessons.md` from prior `/aped-retro` runs will start applying those lessons immediately on the next `/aped-story`, `/aped-dev`, or `/aped-review` invocation. If a `lessons.md` entry was written without a `Scope:` line (older retros), it is treated as `Scope: all` and applies to all three skills — review and re-tag if a tighter scope is desired.

## [3.10.1] - 2026-04-25

External-ticket intake. The pipeline assumes every story originates in `/aped-epics`, but real teams pick up tickets that were never planned through APED — production bugs, partner asks, mid-sprint requests. Until now the only on-ramp was `/aped-quick` (no ticket binding) or manual `/aped-story` after hand-editing `epics.md`. This release adds `/aped-from-ticket`, a single-shot bridge that fetches a ticket from the configured `ticket_system`, drafts a project-conformant story, registers it in `state.yaml` (out-of-sprint by default), and optionally comments back on the source ticket. No favourites: provider parity is mandatory — Linear and Jira go via their MCP, GitHub Issues and GitLab Issues via `gh`/`glab` CLIs. `ticket_system: none` is refused early with a clear remediation message.

### Added
- **`/aped-from-ticket <ticket-id-or-url>` — external ticket intake skill.** Reads `ticket_system` from config, verifies the matching toolchain is available (gh/glab CLI for github/gitlab; Linear or Jira/Atlassian MCP for linear/jira), parses bare IDs or full URLs, fetches the ticket, compiles project context (PRD overlap, architecture constraints, UX touchpoints, related existing stories, codebase patterns), drafts the story collaboratively with a ⏸ GATE before writing, persists it under either an `external-tickets` bucket or an auto-matched epic, registers it in `state.yaml` with `source: from_ticket`, and ends with a 3-option handoff prompt (run `/aped-dev` / promote to active sprint / stop). Refuses early on `ticket_system: none` and on host/provider mismatch (URL host doesn't match configured provider). New skill at `src/templates/skills/aped-from-ticket.md`.
- **`from_ticket:` config block** in the installed `.aped/config.yaml`, exposing four namespaces of knobs with documented defaults: `story_placement.{mode, bucket_epic}` (default `ask` + `external-tickets`), `ticket_comment.{enabled, template}` (default `false` — opt-in to avoid noisy notifications), `sprint_integration.auto_add` (default `false` — story registered but kept out of active sprint until explicit promotion), `handoff.after_story` (default `ask`). All keys are optional; the skill falls back to defaults when absent.
- **`/aped-from-ticket` command entry** in the catalog (`src/templates/commands.js`, category `utility`, phase `Intake`). `docs/COMMANDS.md` regenerated via `npm run generate:catalog`.
- **`tests/from-ticket-wiring.test.js` — 3 vitest cases** covering the wiring surface that breaks silently if a typo slips in: (1) `skills()` includes `aped-from-ticket` with placeholders substituted, (2) `commands()` emits a command file pointing at the matching SKILL.md with the right argument-hint, (3) `configFiles()` renders the `from_ticket:` block with all documented defaults at the right indentation.

### Why
The existing on-ramps to the dev flow assume planning happened first: `/aped-epics` produces the story list, `/aped-story` materialises one of them. A ticket dropped on the team mid-sprint had no first-class path — `/aped-quick` ignores ticket binding entirely (no provider sync, no story file in the sprint), and hand-editing `epics.md` to backfill the planning step is friction. `/aped-from-ticket` fills the gap without compromising the planned-flow's guarantees: the new story is registered but explicitly kept out of the active sprint by default, so prioritisation stays an explicit decision; comment-back to the ticket system is opt-in so first-time users aren't surprised by external side effects; provider parity is enforced so users who chose Jira at install don't silently get a "Linear-only" feature.

### Migration notes for existing installs
Run `aped-method --update` to pull in the new skill, command, and `from_ticket:` config block. Existing `.aped/config.yaml` files without the block continue to work — defaults kick in. No state.yaml schema change. No breaking changes. To enable the comment-back to tickets, set `from_ticket.ticket_comment.enabled: true`. Linear and Jira users must have the corresponding MCP configured in their Claude Code session before invoking the skill — it refuses with a remediation message otherwise.

## [3.10.0] - 2026-04-25

Production-readiness pass for parallel sprint mode. A 20-finding audit (P0/P1/P2) against the sprint-mode skills + scripts surfaced state.yaml corruption paths, workflow drift between state and disk, unsafe `--force` defaults, the absence of programmatic verdicts in `/aped-lead`, and — biggest of all — no branch convention for production: story feature branches lived under main, and `/aped-ship` batch-merged them straight into main at the end. Teams running branch protection on main couldn't ship without bypass. This release closes all 20 findings, introduces the **sprint umbrella branch convention** so parallel sprints integrate via one reviewable PR per sprint, and adds the first vitest coverage of the sprint shell scripts.

### Added
- **Sprint umbrella branch convention.** `/aped-sprint` creates `sprint/epic-{N}` from `origin/<base>`, pushes it, and records the name in `state.yaml` at `sprint.umbrella_branch`. Story feature branches are cut from the umbrella (not from base). `/aped-review` opens story PRs with `--base $UMBRELLA`. `/aped-lead`'s `review-done` approval merges the story PR into the umbrella au-fil-de-l'eau (one merge per approval). `/aped-ship` opens the final `gh pr create --base <base> --head sprint/epic-{N}`. Base only ever sees commits via that one PR — compatible with branch protection out of the box.
- **`.aped/scripts/check-auto-approve.sh` — deterministic verdicts for `/aped-lead`.** Subcommands `story-ready | dev-done | review-done`, exit `0` (AUTO) or `1` (ESCALATE + reasons on stderr). Replaces the previous LLM-judged checks. story-ready verifies the story file is committed, ACs follow Given/When/Then, all `depends_on` are done. dev-done checks `.aped/.last-test-exit == 0`, all tasks `[x]`, no HALT logs, clean tree, file list matches git changes via `git-audit.sh`. review-done verifies status `done`, no `aped-blocked-*` label, PR `MERGEABLE`, AND PR `baseRefName == umbrella` (catches PRs accidentally opened against base).
- **`.aped/scripts/check-active-worktrees.sh` — state.yaml ↔ disk reconciliation.** For every story marked `in-progress | review-queued | review` with a non-null `worktree`, verify the path exists. yq-preferred, awk fallback. Exit `1` if drift detected. `/aped-sprint` calls it before computing capacity (so a `rm -rf`'d worktree no longer blocks dispatch slots). `/aped-lead` and `/aped-status` surface the drift with a `✗ MISSING` row.
- **`.aped/scripts/log.sh` — structured audit log.** Appends JSONL events to `.aped/logs/sprint-{YYYY-MM-DD}.jsonl`. Events emitted automatically by `checkin.sh` (post / approve / block / push) and `sprint-dispatch.sh` (worktree_created); skill-driven events for `dispatch_started`, `merge_done`, `pr_recommended`. jq-preferred with defensive shell fallback. Best-effort: never fails the caller.
- **`set-sprint-field` and generic `set-story-field` commands** in `sync-state.sh`. Used for `umbrella_branch`, `ticket_sync_status`, `merged_into_umbrella` bookkeeping without specific commands per field.
- **`archive` action in `checkin.sh`.** Moves `*.jsonl` inboxes to `.aped/checkins/archive/{date}/` so the next sprint starts with empty inboxes (poll latency stays O(active)). Called by `/aped-ship` after a successful PR open.
- **`dev-blocked` checkin kind.** `/aped-dev` posts it before HALT in worktree mode (new dep, 3-failure repeat, ambiguity, missing config), so `/aped-lead` and `/aped-status` see the blocker instead of the worktree silently freezing. `/aped-lead` always ESCALATEs `dev-blocked` (no auto-approve path).
- **`schema_version: 1` in state.yaml** (top-level, mandatory going forward; legacy files missing the field are accepted as version 1 for back-compat). `validate-state.sh` exits 4 on unknown versions to force an explicit migration. `WORKTREE` markers also include `schema_version: 1`.
- **`--plan-only` on `/aped-sprint` and `/aped-ship`.** Runs through Setup → Discovery / Capacity → Proposal / Findings, then STOPS before any mutation. Prints the commands that would have run. Useful for pre-flight inspection on a sensitive sprint.
- **`tests/sprint-scripts.test.js` — 13 vitest cases** covering sync-state, validate-state, check-active-worktrees, check-auto-approve, log, worktree-cleanup. Caught one real bug at PR time (`${arr[@]}` under `set -u` with empty array fails on bash 4) — fixed in 3 spots via `${arr[@]+"${arr[@]}"}`.

### Changed
- **`/aped-ship` rewritten end-to-end.** No longer batch-merges story branches. New flow: load `sprint.umbrella_branch` → Integration Check (every done story merged into the umbrella, both `git branch --merged` and `merged_into_umbrella` flag agree) → Composite Review on `origin/<base>..$UMBRELLA` (secrets / debug / typecheck / lint / db:generate / state.yaml consistency / leftover worktrees) → push umbrella + print `gh pr create --base <base> --head $UMBRELLA` with the composite summary as the PR body. The skill never pushes to base, never mutates the umbrella content.
- **`/aped-lead` review-done handler merges au-fil-de-l'eau.** Per approved `review-done`: flip story status to `done`, `gh pr merge` (squash) into the umbrella, teardown worktree (`workmux merge` if available, else `worktree-cleanup.sh --delete-branch`), set `merged_into_umbrella: true`. On merge failure (conflicts, branch protection, missing approvals), ESCALATE — user resolves on the PR side then re-runs `/aped-lead`. No auto-retry.
- **`sync-state.sh` hardened.** `set -euo pipefail`, `write_atomic` gates the candidate file (non-empty + valid YAML via yq when present) before snapshotting the backup and `mv`-ing. `set_story_field` uses yq for the mutation when available — robust against regex metachars in story keys (`1-2-foo.bar`, `story[v2]`); awk fallback escapes the key via sed before interpolation. New exit code `5` = "candidate failed validation, refused to clobber". Catches the previous failure mode where a buggy awk produced corrupt YAML written "atomically".
- **`checkin.sh push` rewritten.** Accepts `--target <name>` for explicit override; otherwise builds a candidate list (workmux handle from worktree path basename, ticket id, story key) and tries workmux first, tmux as fallback. Refuses ambiguity with exit `3` and the candidate list — never silently picks the first match. Eliminates the class of "approval went to the wrong worktree" bugs.
- **`sprint-dispatch.sh` lock keyed on worktree path** (sanitized via `tr '/ ' '__'`) instead of story key — catches the case where two stories share a `TICKET_ID` and would race on `git worktree add`. Accepts optional `<base-ref>` as the 3rd argument so `/aped-sprint` can branch stories from the umbrella; defaults to `HEAD` for solo / non-sprint mode (back-compat).
- **`worktree-cleanup.sh` refuses `--force` without `--yes-destroy`.** When the clean `git worktree remove` fails, the script dumps `git status --porcelain` + `git stash list` to stderr, then exits `2` with two recovery options (commit/stash, or re-run with `--yes-destroy`). The previous version silently re-ran `--force` on the first failure, which is exactly how `.env` tweaks and unstaged migrations disappear.
- **State.yaml authority is in main, divergence in worktrees is normal.** Each worktree writes its local state.yaml on its feature branch; main's copy is the authoritative one written by `/aped-lead`. `/aped-ship` resolves state.yaml conflicts at merge with `--ours` **by design**, not as a workaround. `/aped-dev` no longer reads "canonical" state.yaml across the project boundary — each worktree owns its local copy. Documented as a Critical Rule across `aped-sprint`, `aped-story`, `aped-dev`, `aped-lead`, `aped-ship`.
- **`/aped-sprint` ticket-system mutations moved AFTER worktree creation.** Previously: assign + transition ticket → `git worktree add` → if worktree fails, ticket left stuck "in progress" with no work. Now: read-only ticket validation pre-dispatch, mutations post-dispatch. On ticket-sync failure the worktree stays healthy; story is marked `ticket_sync_status: failed` and `/aped-lead` offers a retry on its dashboard.
- **`/aped-status` ticket-sync cached 60s** in `.aped/.cache/tickets.json`. A 20-story sprint no longer fires 20 provider API calls on every dashboard render.
- **`/aped-ship` diff sizing uses `--numstat`** (machine-readable, locale-independent) instead of `--shortstat` (English-only, omits "deletions" when zero, broke the previous `awk '{print $4 + $6}'` parse).
- **`/aped-review` Aria visual fallback marks the story file when React Grab MCP is unavailable.** Appends `Visual Review: deferred — React Grab MCP unavailable at <ts>` to the Review Record so `/aped-status` and `/aped-ship` can surface that the visual gate is incomplete. In prod, persistent MCP unavailability is a BLOCKER until explicitly waived.
- **`run-tests.sh` writes `.aped/.last-test-exit`** with the test runner's exit code so `check-auto-approve.sh dev-done` can verify the most recent run passed without re-executing the suite. `set -e` removed from the script (kept `-u`/`pipefail`) so the cache write happens after a failed run too.
- **README requirements explicit:** unix-like shell required (macOS/Linux/WSL; native Windows unsupported). `yq` (mike farah, v4) promoted from "not mentioned" to "strongly recommended" — `sync-state.sh` and `check-active-worktrees.sh` use it as the primary path.

### Why
Sprint mode shipped in 3.8 worked end-to-end but didn't survive an adversarial audit against production usage. Two classes of issue dominated: (1) `state.yaml` writes had a soft "atomic" path that could still emit corrupt YAML if any of `cp`/`awk`/`sed` failed silently, and there was no validation gate before `mv`; the buggy awk would produce malformed YAML and `mv` it over the live file "atomically". (2) The merge story didn't model what production teams actually do — every team using branch protection on main needed a parent branch the story PRs could land in. The umbrella convention (`sprint/epic-{N}`) replaces the previous "merge stories straight into main at /aped-ship time" with the standard prod pattern: stories PR into the umbrella as they're approved by /aped-lead, /aped-ship opens one final PR umbrella → main. Everything else in this release is the audit's tail — programmatic verdicts replace LLM judgement so /aped-lead can't hallucinate a check, the audit log makes postmortems possible, schema versioning makes future bumps fail loud instead of silently breaking projects, and the test suite covers the riskiest scripts so the next refactor isn't roulette.

### Migration notes for existing installs
Run `aped-method --update` to pull in the new skills + scripts. Three behaviour changes show up end-to-end:

1. **In-flight parallel sprints have no `umbrella_branch` field.** Resume by re-running `/aped-sprint` once: the skill creates the umbrella from `origin/<base>` and records it before the next dispatch. No data loss, no manual edit. Stories already dispatched continue to work — they're branched from main, and the umbrella picks them up via the next `/aped-ship` Integration Check (which surfaces the inconsistency and asks you to merge them manually or via /aped-lead).
2. **Story PR target moves from `<base>` to umbrella** in `/aped-review`. Open PRs from earlier sprints can be merged into base directly with `gh pr merge` — leave them. New PRs from `/aped-review` will target the umbrella.
3. **`/aped-ship` no longer merges stories.** It expects `/aped-lead` to have merged them au-fil-de-l'eau into the umbrella. If you skipped `/aped-lead` approval for some done stories, `/aped-ship` will HALT with the list — re-run `/aped-lead` or merge manually before re-running `/aped-ship`.

`yq` (mike farah, v4) is now strongly recommended; the awk fallbacks work but are more fragile. `brew install yq` (macOS) or `snap install yq` (Linux). `jq` stays optional, now used by `log.sh` for safer JSON encoding. Native Windows (cmd / PowerShell without WSL) is explicitly unsupported — see README.

## [3.9.0] - 2026-04-25

Conversational mechanism alignment with BMAD. A user-driven audit of `/aped-brainstorm` exposed that several APED skills had inherited BMAD's structure (techniques, stages, specialist personas) but lost BMAD's actual *conversational mechanism* — the back-and-forth coaching loop that separates a partner from a generator. This release closes that gap across the eight content-generating skills, brings the A/P/C menu pattern (Advanced elicitation / Party / Continue) wherever BMAD uses it, and preserves every existing autonomous workflow via opt-in flags.

### Changed
- **`/aped-brainstorm` Phase 3 fully rewritten — one element at a time, not batches of 10.** The previous behaviour generated 10 ideas per technique batch and asked a rhetorical "any of these spark something?", which the model treated as a no-op and continued cranking through to the 50-100 idea quota. Phase 3 is now an interactive coaching loop: present ONE technique element, ⏸ HALT for the user's response, then react with one of three explicit coaching patterns (basic answer → dig; detailed answer → build with one AI extension on top; stuck → seed with a concrete starting angle). Energy checkpoint every 4-5 exchanges with a [K]eep / [S]witch / [P]ivot / [D]one menu. End of every technique: [K]eep / [T]ry new / [A]dvanced elicit / [B]reak / [C]onverge menu, with explicit HALT. Anti-bias domain pivot still fires automatically every 10 ideas, just inside the new flow. The "NEVER generate ideas in silent batches" rule is now in Critical Rules.
- **`/aped-prd` is interactive by default; `--headless` preserves the previous autonomous behaviour.** The previous skill generated all 4 sections in one shot with no user input, which gave a PRD but never asked the user whether each section reflected intent. New flow: generate Section N (Foundation / Scope / Domain / Requirements), present it, ⏸ HALT with the A/P/C menu — [A]dvanced elicitation invokes `/aped-elicit`; [P]arty/Council dispatches a section-specific sub-team via `Agent` (Mary+Derek for Foundation, a PM for Scope, Raj for Domain, Eva+Marcus for Requirements); [C]ontinue accepts and moves on; direct feedback applies inline. `--headless` skips every menu and produces the PRD straight-through, equivalent to the 3.8 behaviour, for CI/scripted workflows.
- **`/aped-analyze` discovery rounds gain catch-all prompts + final A/C menu.** Each of the 4 rounds (Vision / Users / Constraints / Validation) ends with "Anything else about {topic} you want to mention before we move on?" and a HALT — BMAD's "capture-don't-interrupt" pattern that catches stakeholder constraints and personal anecdotes the structured questions miss. Round 4 closes with an A/C menu: [A] invoke `/aped-elicit` on the discovery summary (Pre-mortem / Devil's Advocate to surface blind spots before research dispatches); [C] accept and dispatch parallel research (Mary / Derek / Tom).
- **`/aped-epics` binary GATE replaced with A/P/C menu.** Previously the user could only validate the epic structure or "request changes" with no structured way to stress-test. New menu: [A] `/aped-elicit` on the decomposition (Tree of Thoughts on alternative groupings; Pre-mortem on sequencing risks); [P] convene a 3-specialist sub-team in parallel — Sam (Fullstack Tech Lead) on story sizing and hidden coupling, Eva (QA Lead) on testability and AC coverage, a PM persona on user-value coherence; [C] accept and write `epics.md` + run coverage validation; direct feedback applies inline.
- **`/aped-arch` Phase 5 final approval gains an A/C menu.** The Architecture Council in Phase 2b already covers the "P" role for major decisions. The new Phase 5 menu provides [A] adversarial pressure on the doc as a whole — `/aped-elicit` with Pre-mortem ("1 year from now this architecture is regretted, why?"), Red Team vs Blue Team on security, Tree of Thoughts on the riskiest decision — before downstream skills (epics / dev / review) treat it as LAW. [C] commits.
- **`/aped-prfaq` Stage 2 Press Release and Stage 4 Internal FAQ gain A/C menus.** Stage 2: [A] `/aped-elicit` (Devil's Advocate on the leader quote; Feynman test for clarity; Mom-test on the customer quote); [C] accept and move to Stage 3. Stage 4 (last gate before Verdict synthesis): [A] `/aped-elicit` (Pre-mortem on 6-month death; Shark Tank Pitch with hostile investor questions; Red Team on the moat answer); [C] synthesise the Verdict.
- **`/aped-retro` Phase 4 action items gain an A/C menu.** Action items are the load-bearing output of the retro — the next epic's success depends on them being real, owned, and time-bound. [A] invokes `/aped-elicit` (Pre-mortem: "next retro hits and these weren't done — why?"; SMART audit; Devil's Advocate: "which 2 of these actually move the needle?"); [C] commits the list and proceeds to Significant Discovery Detection.
- **`/aped-ux` F5 user review cycle gains an A/C menu.** Previously the loop ran "until user says 'approved'", which gave no structured stress-test option. New menu: [A] `/aped-elicit` (Feynman test for clarity; Devil's Advocate on flows; Hindsight: "if a real user breaks this in 30 days, what did we miss?"); [C] commits the prototype, writes the UX spec, updates state.

### Added
- The full A/P/C menu vocabulary is now consistent across the seven gated skills. `[A]` always invokes `/aped-elicit` (the horizontal critique toolkit). `[P]` (where it appears) always dispatches a multi-specialist subagent team via `Agent`. `[C]` always continues. Direct user feedback is always accepted as a fallback. The pattern is paste-able from BMAD step files and matches the user's mental model across the pipeline.

### Why
A user running `/aped-brainstorm` reported that after the framing phase, the model generated technique batches with no real discussion. Reading BMAD's `step-03-technique-execution.md` revealed that BMAD's brainstorming is built around one-element-at-a-time coaching with explicit HALT keywords — the structural mechanism APED's port had silently dropped. Auditing the other content-generating skills against their BMAD originals showed the same pattern: APED kept the goal but lost the path. Where APED specialists existed (Architecture Council, retro Mia/Leo/Ava, review Eva/Marcus/...), they were ahead of BMAD; where APED was generative-only (`/aped-prd`) or used a binary "validate y/n" gate (`/aped-epics`, `/aped-arch`, `/aped-prfaq`, `/aped-retro`, `/aped-ux`), the conversation collapsed into output. This release restores the back-and-forth across the whole pipeline so users get a partner, not a generator.

### Migration notes for existing installs
Run `aped-method --update` to pull in the new skills. No artifacts are touched. All existing autonomous workflows continue to work: `/aped-prd --headless` reproduces the 3.8 behaviour exactly. Interactive runs now HALT at the new A/P/C menus — if a user wants to skip every menu and accept defaults, they can type `[C]` at each prompt; the same workflow as before, just with the option to stop and stress-test at every step. `/aped-brainstorm` behaviour changes most visibly: silent batches of 10 no longer happen — every technique element is now interactive. Tell users running CI/scripted PRD generation to add `--headless` to their `/aped-prd` invocation.

## [3.8.0] - 2026-04-22

Sprint-workflow robustness pass. An adversarial failure-mode audit surfaced seven paths that could leave `state.yaml` corrupted, locks wedged, or sessions out of sync with the pipeline. This release closes the five most impactful ones, adds a state-validation script the sprint skills call at Setup, and teaches `aped-method doctor` to detect and offer one-liner fixes for each of the new failure surfaces.

### Added
- **`.aped/scripts/validate-state.sh` — state.yaml integrity check.** A dependency-free script that verifies the file exists, parses as YAML (when `yq` is available), and that every `status:` value is in the canonical whitelist (`pending`, `ready-for-dev`, `in-progress`, `dev-done`, `review`, `review-queued`, `review-done`, `done`). Called from the Setup section of `/aped-sprint`, `/aped-lead`, `/aped-ship`, and `/aped-course` so a hand-edited or half-corrupted state file produces a clear actionable error instead of silent grep/awk failures downstream. Exits 0 on success, non-zero with a one-line message and a restore hint pointing at the new backup file.
- **`.aped/state.yaml.backup` — one-deep safety net.** Every mutation done through `sync-state.sh` snapshots the current `state.yaml` to this backup location before writing. `doctor` surfaces the backup's presence and offers the one-line `cp` command to restore when the current file becomes unreadable.
- **`doctor` now scans four new failure surfaces.** Orphan `.state.lock` directories older than 300s (previous `sync-state` likely crashed), stale `.sprint-locks/*` entries older than 900s (previous dispatch likely crashed), stuck `scope_change_active: true` with `state.yaml` mtime older than 2h (previous `/aped-course` likely crashed), and backup-vs-state availability when the primary is unreadable. Each check reports a concrete `rm -rf` or `cp` command the user can paste to recover.

### Changed
- **`sync-state.sh` rewritten for atomicity + self-healing locks.** (1) Replaced the Linux-only `flock` with the portable `mkdir` lock used elsewhere in APED; (2) lock timeout dropped from 10s to 5s and stale locks older than `APED_STALE_LOCK_SECONDS` (default 300s) are auto-reclaimed with a clear WARN before the new holder takes over; (3) every mutation goes through write_atomic: temp file → backup current → atomic rename, so a mid-write crash leaves either the old state intact or the new state complete, never a truncated file; (4) expanded the command surface from `set-scope-change` + two NOPs to four real atomic ops: `set-scope-change`, `set-story-status`, `set-story-worktree`, `clear-story-worktree` — skills can now stop hand-rolling sed patches in-skill. Tunable via `APED_STALE_LOCK_SECONDS` and `APED_LOCK_TIMEOUT_SECONDS` env vars.
- **`sprint-dispatch.sh` now acquires a per-story fleet-lock.** Previously, two `/aped-sprint` sessions (two terminals, two checkouts) could race on `git worktree add` for the same story key — the second failed with a cryptic git error and no recovery path. The new lock at `.aped/.sprint-locks/<story-key>` via atomic `mkdir` serialises dispatches per story, auto-reclaims entries older than 900s (worktree creation on large repos can legitimately take minutes), and exits with code 3 and a clear message if a live dispatch is already in progress. Tunable via `APED_SPRINT_LOCK_STALE_SECONDS` and `APED_SPRINT_LOCK_TIMEOUT_SECONDS`.
- **`/aped-course` now detects and auto-clears stuck `scope_change_active` flags.** Previously, if the skill crashed between setting the flag and clearing it at exit, all future scope-change attempts refused to proceed. New Setup step reads `state.yaml`'s mtime: if the flag is set and the file hasn't been touched in more than 2 hours, the skill auto-clears the flag with a clear warning ("Stale scope_change_active cleared from a previous crashed /aped-course run — verify no partial PRD/architecture/UX edits were left behind") and proceeds; if the flag is set and the file was touched within 2h, the skill HALTs and tells the user another session may be active.
- **`/aped-sprint`, `/aped-lead`, `/aped-ship`, `/aped-course` Setup sections now call `validate-state.sh` before reading state.yaml.** All four skills HALT on non-zero exit with the reported error — never auto-repair, always point the user at the backup file. `/aped-ship` in particular treats this as a non-negotiable gate: the last checkpoint before pushing to main must never operate on state of unknown structure.

### Why
APED's parallel-sprint workflow handles the happy path well but the failure audit found that a single crashed skill (OOM, `SIGKILL`, power loss, `Ctrl+C` at the wrong moment) could leave `state.yaml` corrupted with no backup, a lock held forever, or a scope-change flag stuck permanently. Recovery required users to hand-edit YAML in `.aped/`, which they shouldn't have to do. The atomic-write + backup pattern eliminates the corruption path entirely; the stale-lock timers turn "forever stuck" into "blip recoverable"; and `doctor` closes the loop by surfacing any residue after a crash and handing the user the exact shell command to resolve it. Net effect: a crashed skill is now a 2-second inconvenience instead of a sprint-ending data-loss event.

### Migration notes for existing installs
Run `aped-method --update` (or `npx aped-method@3.8.0 --update`) to pull in the new `.aped/scripts/sync-state.sh`, the new `.aped/scripts/validate-state.sh`, the updated `.aped/scripts/sprint-dispatch.sh`, and the refreshed `/aped-sprint`, `/aped-lead`, `/aped-ship`, `/aped-course` skills. No existing artifacts (`state.yaml`, `prd.md`, stories, epics) are touched by this upgrade. First mutation after the upgrade creates the `state.yaml.backup` file automatically. If your project has an existing stale `.aped/.state.lock` or `scope_change_active: true` from a pre-3.8.0 crash, run `aped-method doctor` — it will show the exact shell command to clear each condition. The `sync-state.sh` command surface is backwards-compatible: the previous `set-scope-change` command still works; the new commands (`set-story-status`, `set-story-worktree`, `clear-story-worktree`) are additive.

## [3.7.7] - 2026-04-22

### Added
- **Context-window progress bar in the APED statusline.** The optional statusline now renders `ctx:[█░░░░░░░░░] 126k/1M (13%)` right after the model segment. Reads the last assistant turn's usage from `$transcript_path` (`input_tokens + cache_read_input_tokens + cache_creation_input_tokens` = total context consumed at that turn) and renders a 10-block bar plus absolute + percentage readout. Auto-detects 1M-context models via `[1m]` in `model.id` or "1M context" in `display_name`, otherwise assumes a 200k window. Silent on any missing/malformed transcript — it's advisory, never blocks the line.

### Changed
- **Statusline color palette retuned.** No color is reused on the same line, and each segment's hue hints at its role: model → red (identity anchor), ctx → white (neutral data), project → bright blue, phase → yellow, epic → magenta, story → cyan, review → bright yellow (attention, not error), worktrees → bright magenta, git → green clean / bright red dirty. Brackets around the model name dropped; the red color carries the identity role on its own.

### Migration notes for existing installs
Re-run `aped-method statusline` (or `npx aped-method@3.7.7 statusline`) to refresh `.aped/scripts/statusline.js`. No other APED artifacts change.

## [3.7.6] - 2026-04-22

### Fixed
- **False `SCOPE_CHANGE` warning on fresh scaffolds.** Running `/aped-analyze` (or `/aped-prd`) in a brand-new project — no brief, no PRD, no epics, `current_phase: "none"` — surfaced a phantom "Sprint is active" warning and asked the user to confirm a scope change. The scaffolded `state.yaml` template included a comment documenting the story lifecycle (`# Per-story status: pending → ready-for-dev → in-progress → …`), and the guardrail's `grep 'status:.*\(in-progress\|review\|ready-for-dev\)'` matched that comment instead of real `status: "in-progress"` YAML. Every fresh scaffold tripped the sprint detector.

### Changed
- **Guardrail strips comment lines before scanning `state.yaml`.** `grep -v '^[[:space:]]*#'` is applied first, then the sprint-status match runs against YAML body only. Pattern also tightened from `status:.*<keyword>` to `status:[[:space:]]*"*<keyword>"*` so it only matches actual YAML values (`status: "in-progress"`), not prose that happens to mention the word "status".
- **`state.yaml` template comment reformulated** to `# Per-story status values (ordered): …` — defense in depth so existing installs without the new guardrail also stop tripping the old pattern.

### Migration notes for existing installs
No action required. The new guardrail ignores the old comment, so projects scaffolded with ≤ 3.7.5 stop emitting the phantom warning as soon as `.aped/hooks/guardrail.sh` is updated (via `aped-method --update` or a fresh install). If you prefer to also refresh the `state.yaml` comment, replace the `# Per-story status:` line in your project's `docs/aped/state.yaml` with the 3.7.6 version — cosmetic only.

## [3.7.5] - 2026-04-22

### Fixed
- **Duplicate slash commands in Claude Code** (3×–4× listings of every `/aped-*`). Previous versions unconditionally symlinked every skill into four discovery paths — `.claude/skills/`, `.opencode/skills/`, `.agents/skills/`, and `.codex/skills/` — on the assumption that Claude Code only scans `.claude/skills/`. That assumption was wrong: Claude Code discovers skills from `.claude/skills/` **and** from the cross-tool directories when they exist, and it also auto-registers the skill `name:` frontmatter as a slash on top of the explicit `.claude/commands/aped-*.md` entry. The combination produced 4× the registrations.

### Changed
- **`.claude/skills/` is no longer a default symlink target.** Claude Code reaches APED slash commands via `.claude/commands/aped-*.md` — symlinking into `.claude/skills/` was redundant and caused duplicates.
- **Cross-tool symlinks are now auto-detected.** The scaffolder now only creates symlinks under `.opencode/skills/`, `.agents/skills/`, and `.codex/skills/` when the corresponding `.opencode` / `.agents` / `.codex` marker directory exists in the project. A fresh single-tool Claude Code project gets zero skill symlinks, and zero duplication. Users with multi-tool setups get symlinks only where they make sense.
- **`--fresh` cleanup now uses `TARGET_CATALOG`** — the historical superset of every skill-symlink location APED has ever written to — so legacy `.claude/skills/aped-*` links from pre-3.7.5 installs get removed on a fresh reinstall.
- **`aped-method doctor`** aligns with the new behavior: symlink health is checked against whatever targets auto-detect resolves to, and reports `no cross-tool symlinks expected (single-tool install)` instead of "0/0/0/0" when nothing is expected.

### Migration notes for existing installs
If you are upgrading from 3.7.x with visible duplicates in Claude Code's slash menu, clean up the legacy `.claude/skills/aped-*` symlinks once and restart Claude Code:

```bash
rm -rf .claude/skills/aped-*
```

Nothing else is needed — the scaffolded `.claude/commands/aped-*.md` files continue to register the slash commands correctly. If you use OpenCode / Codex / agents.md-aware tools, keep the marker directories (`.opencode/` etc.) in your project root; auto-detect will recreate the relevant symlinks the next time you run `aped-method --update` or `aped-method symlink`.

## [3.7.4] - 2026-04-22

### Changed
- **`engines.node` bumped from `>=18` to `>=20`.** `@clack/core@1.2` — the transitive dep behind `@clack/prompts` — imports `styleText` from `node:util`, which only exists in Node 20+. Node 18 CLI startup fails with `SyntaxError: The requested module 'node:util' does not provide an export named 'styleText'`. Node 18 has been EOL since 2025-04 so the practical impact is small; users still on 18 should upgrade to 20 LTS or 22.
- **CI matrix narrowed to `[20, 22]`.** The Node 18 slot only ever "passed" because nothing in our own code broke on it — the CLI fails at the first `import` of `@clack/prompts`, which the existing smoke covers now that `smoke:pack` was added in 3.7.3.

### Why
3.7.3 added `smoke:pack` and re-ran CI for the first time on the refreshed workflow file. CI surfaced that Node 18 has been silently broken for a while because its job only ran `--version` / `--help` against the local checkout, which behaved differently from a real installed package. The fix is to acknowledge the reality instead of papering over it.

## [3.7.3] - 2026-04-22

### Fixed
- **Hotfix for `npx aped-method@3.7.2` ERR_MODULE_NOT_FOUND.** The `files` allowlist in 3.7.2 listed every new module from the subcommand split except `src/subcommands.js`, so the published tarball was missing that file and exploded on first `import` from `src/index.js`. 3.7.3 re-adds `src/subcommands.js` to the allowlist. All 3.7.2 users should upgrade.

### Added
- **`smoke:pack` safety net.** `npm run smoke` now also builds the tarball via `npm pack`, extracts it, symlinks the current `node_modules`, and runs `--version` / `--help` / `doctor` from the extracted tree — exactly the flow `npx` triggers. This would have caught the 3.7.2 regression before publish. Included in `prepublishOnly`.

## [3.7.2] - 2026-04-22

### Added
- **`aped-method doctor`** — verifies an installation (required files, hook executability, slash command count, installed skill dirs, symlink health, `settings.local.json` validity, optional binaries `jq`/`gh`/`workmux`). Exits non-zero only on required failures.
- **`aped-method statusline`** — installs an APED-aware Claude Code status line that renders `current_phase`, active epic, active story, review queue count, worktree count, and git branch from `docs/aped/state.yaml`. Prompts before overwriting a pre-existing non-APED `statusLine` (bypass with `--yes`).
- **`aped-method safe-bash`** — optional `PreToolUse` hook that intercepts obviously destructive shell commands (`rm -rf /`, `rm -rf $HOME`, `rm -rf ~`, `rm -rf /*`, `curl|bash` / `wget|sh` / `curl|zsh`, `dd`/`mkfs`/`fdisk` with trailing arg, `chmod -R 777`) and asks before `sudo`. **Explicitly labelled as a best-effort UX safety net, not a security boundary** (`SECURITY.md` documents the bypass surface).
- **`aped-method symlink`** — inspects and repairs cross-tool skill symlinks (`.claude/skills`, `.opencode/skills`, `.agents/skills`, `.codex/skills`). Recreates missing/broken APED links without touching real directories.
- **`aped-method post-edit-typescript`** — optional `PostToolUse` hook for `Write|Edit|MultiEdit` that runs local `prettier --write` and `eslint --fix` on `.ts`/`.tsx`/`.mts`/`.cts` files when the binaries are already installed. Silent no-op otherwise.
- **`docs/COMMANDS.md`** — generated command catalog. `npm run generate:catalog` rebuilds it from `COMMAND_DEFS`; CI enforces no drift via `git diff --exit-code`.
- **`commands_path` persisted in `config.yaml`** — survives `--update`, read back by `detectExisting`.
- **Scaffold e2e coverage extended** — 12 phases (was 8). New phases: `doctor` pass, symlink repair of a broken link, optional subcommand install (`statusline`/`safe-bash`/`post-edit-typescript`), doctor re-pass after optional installs.
- **Unit tests up to 63** — bash-safety bypass documentation (`eval`, base64, hex), symlink manager inspect/repair, doctor healthiness snapshot, parse-args / detect-existing / merge-settings additions.

### Changed
- **Opt-in hook scripts extracted to disk** — `src/templates/hooks/safe-bash.js`, `src/templates/hooks/post-edit-typescript.js`, and `src/templates/scripts/statusline.js` now live as standalone files with `{{APED_DIR}}` / `{{OUTPUT_DIR}}` placeholders (same pattern as skills in 3.7.1). `src/templates/optional-features.js` becomes a small loader — reviewable diffs, syntax highlighting, and `node --check` on every template.
- **`mergeSettings` now unions `permissions.allow`** — existing entries are preserved and deduplicated against incoming ones instead of being replaced.
- **Subcommand handlers extracted to `src/subcommands.js`** — 243 lines moved out of `src/index.js` (1048 → 846). Circular helper import (`DEFAULTS`, `CLI_VERSION`, `validateSafePath`, `UserError`, `mergeSettings`, `detectExisting`) is safe: all consumed only inside function bodies.
- **`package.json` `files` allowlist is now explicit** — replaced the `src/*.js` glob with the five named source files. Prevents accidental publication of future internal helpers.
- **`npm run check` covers the new template subdirectories** — `src/templates/hooks/*.js` and `src/templates/scripts/*.js` are now syntax-checked on every CI run.

### Notes
- This is the first release that actually uses `npm publish --provenance` — `NPM_TOKEN` is now configured in the release workflow.
- No change to the primary scaffolder contract. Existing installations upgrade via `--update` without migration. All new subcommands are opt-in; nothing runs unless installed.

## [3.7.1] - 2026-04-22

### Added
- **Security policy.** Added `SECURITY.md` with the disclosure policy, supported versions, hardening notes, and the current dev-only `esbuild` advisory context.
- **Troubleshooting guide.** Added `docs/TROUBLESHOOTING.md` covering the most common install, upgrade, hook, symlink, and color-output problems.
- **Automated test coverage.** Added 41 unit tests for argument parsing, path validation, semver comparison, settings merge behavior, and existing-install detection.
- **Scaffold end-to-end CI.** Added `.github/scripts/scaffold-e2e.sh` and wired it into CI, including a dedicated macOS scaffold job.

### Changed
- **Skill templates now live as Markdown files.** Extracted the scaffolded APED skills into `src/templates/skills/*.md` and replaced the giant inline JS blob with a small loader module.
- **Release workflow supports npm provenance.** The manual release workflow now publishes with `npm publish --provenance --access public` when `NPM_TOKEN` is configured, and otherwise skips publish cleanly.
- **Prepublish now runs tests.** `prepublishOnly` now runs syntax checks, smoke tests, and the Vitest suite before publish.
- **Package contents updated.** The npm package now explicitly includes the extracted skill templates and `SECURITY.md`.

## [3.7.0] - 2026-04-22

### Added
- **`/aped-brainstorm` — divergent ideation.** New upstream skill for generating 100+ ideas before convergence. Anti-bias protocol (shift domain every 10 ideas), quota enforcement (50 minimum, 100 target), 10-technique library (SCAMPER, What If, Pre-mortem, Reverse Engineering, First Principles, etc.). Output at `${outputDir}/brainstorm/session-{date}.md`. Does not update `state.yaml` — it's a creative tool usable at any time.
- **`/aped-prfaq` — Working Backwards challenge.** Amazon-style press-release-first discipline in 5 stages: Ignition → Press Release → Customer FAQ → Internal FAQ → Verdict. Parallel research subagents (artifact scanner + web researcher). Concept-type detection (commercial / internal / open-source / community) adapts FAQ framing. Verdict includes a PRD Distillate ready to seed `/aped-analyze`. `--headless` flag for autonomous first-draft mode.
- **`/aped-retro` — post-epic retrospective.** Systemic post-mortem with 3 parallel specialists (Mia Struggle Analyzer, Leo Velocity Analyzer, Ava Previous-Retro Auditor). Detects significant discoveries that trigger `/aped-course`, enforces SMART action items with owners, produces a readiness assessment for the next epic. Persists lessons to `${outputDir}/lessons.md` for cross-epic continuity.
- **`/aped-elicit` — horizontal critique toolkit.** 19 methods across 9 categories (core, risk, competitive, advanced, creative, research, retrospective, philosophical, learning). Invokable standalone or from inside any APED skill mid-workflow. Iterative loop with y/n-per-method consent. Smart menu selection based on target type (architectural, product, technical, etc.).

### Changed
- **`/aped-arch` — Architecture Council (Phase 2b).** For high-stakes decisions (DB, auth, API, frontend, infra), dispatches 3-4 specialist subagents in parallel: Winston (systems), Lena (pragmatic), Raj (security/compliance), Nina (cost/ops), Maya (edge cases). Each runs independently for genuine divergent perspectives. User picks final option, minority view is documented as signal for future pivots. Escape hatch for MVP-scale decisions.
- **Cross-tool skill distribution via symlinks.** On macOS/Linux the scaffolder now creates relative symlinks in `.claude/skills/`, `.opencode/skills/`, `.agents/skills/`, and `.codex/skills/` that point back to the canonical `${apedDir}/aped-*` directories. One edit in `.aped/` propagates to every tool — no manual sync, no drift. Claude Code still uses the real files under `${commandsDir}/aped-*.md` for slash command registration. Windows hosts are auto-skipped (symlinks require developer mode + `core.symlinks=true`). Fresh mode cleans stale `aped-*` entries in all four target directories before rebuilding.

### Why
Ideation and critique tooling was missing upstream of `/aped-analyze` and orthogonally across all phases. `/aped-brainstorm` and `/aped-prfaq` fill the "idea is still fuzzy" gap before committing to a PRD. `/aped-elicit` gives every phase access to structured critique methods without forcing them into the pipeline linearly. Post-epic review was ad-hoc — `/aped-retro` turns it into a repeatable discipline with specialist parallelism and continuity enforcement. Single-brain architecture decisions converge to groupthink — the Architecture Council surfaces genuine disagreement on decisions that cost weeks to reverse. Cross-tool distribution via symlinks replaces the "copy & hope" pattern with a single source of truth that every tool (Claude Code, OpenCode, Codex, agents.md readers) sees instantly.

## [3.6.0] - 2026-04-18

### Added
- **`/aped-ship` — end-of-sprint merge + pre-push composite review.** New skill that closes the loop on parallel sprints. Detects all `status: done` stories with unmerged feature branches, proposes a conflict-minimizing merge order (smaller diff first), executes the batch with `--ours` on `state.yaml` conflicts (main is authoritative — `/aped-lead` already flipped statuses there) and HALT on any other conflict, then runs a composite pre-push review on `origin/main..main`:
  - secret / credential scan (with noise filtering for type declarations, redact list keys, `.env.example` placeholders)
  - debug / TODO / FIXME scan
  - typecheck (detects `scripts.typecheck` or falls back to `tsc --noEmit`)
  - lint (if `scripts.lint` exists)
  - `db:generate` for Prisma projects (surfaces env-var coalesce bugs as BLOCKERS)
  - state.yaml consistency (merged stories have `status: done` + `worktree: null`)
  - leftover worktrees / unmerged branches
  - Findings triaged into BLOCKER / WARNING / INFO. GATE before push — skill PRINTS `git push origin main` but never executes it.

### Changed
- **`/aped-lead` no longer pushes `/merge` on `review-done` approvals.** Per-story merges from parallel worktrees race on main's state.yaml and produce avoidable conflicts. Instead, on `review-done` approval the Lead flips `sprint.stories.{key}.status` to `done` in main's state.yaml and stops. The feature branch and worktree stay live until `/aped-ship` batches the teardown. This is a contract change — existing `/aped-lead` flows will now surface an "X stories ready to ship — run `/aped-ship`" prompt instead of merging per-story.
- **`/aped-lead` dispatch follow-up** now surfaces both dimensions: free parallel-sprint slots AND done-but-unmerged ship candidates.
- **`/aped-lead` Next Step** recommends `/aped-ship` when there are done stories ready to merge.

### Why
Live testing of the parallel-sprint flow in CloudVault revealed two structural gaps:
1. No orchestrator for end-of-sprint batch merge. Users had to manually determine merge order, resolve state.yaml conflicts, and clean up worktree paths — exactly the kind of repetitive work a skill should automate.
2. No pre-push review on the composite main. Individual stories passed `/aped-review`, but the composite (after merges) could have typecheck errors, missing `db:generate`, or accidental secret exposure that no per-story review catches. The push step had no gate.

Together these two gaps meant the user had to ad-hoc-review before push every sprint. `/aped-ship` gives that workflow a home.

### Migration notes
- Existing `/aped-lead` flows using per-story `/merge` no longer receive that push. Run `/aped-ship` after `/aped-lead` to complete the merge + review phase.
- No file format changes — state.yaml schema is unchanged.
- Minor bump because this is additive (new skill + behavior shift on `/aped-lead` review-done) with no removed commands or renamed fields.

## [3.5.9] - 2026-04-18

### Added
- **`/aped-lead` sends `/clear` before each follow-up command.** Phase transitions (story → dev → review → merge) now reset the Story Leader's conversation context via Claude Code's built-in `/clear`, preventing cross-phase hallucinations (e.g., `/aped-dev` re-litigating scope from `/aped-story`, or `/aped-review` being anchored by `/aped-dev`'s rationale). Applied to all three push paths (`workmux send`, `checkin.sh push`, and the manual fallback instruction).
- **`/aped-sprint` detects tmux session state.** When `$TMUX` is empty, workmux auto-picks WezTerm native tabs as backend, which means `workmux sidebar` and the tmux-based `workmux dashboard` pane can't see the dispatched agents. SKILL now warns the user once and suggests `tmux new-session -As aped` → `claude --permission-mode bypassPermissions` → `/aped-sprint` if they want live status. Dispatch still works in the WezTerm-only path.
- **`/aped-sprint` checks for `workmux setup`.** If `~/.claude/skills/workmux` is missing, SKILL tells the user once: "Run `workmux setup` (one-time, user-level) to enable agent-status icons and install the `/merge` skill the Lead delegates to." Non-blocking — APED falls back to `worktree-cleanup.sh` if `/merge` is absent.
- **Template documents the `agents:` global alternative.** Users who want to centralize the claude flags across all workmux projects can define `agents: { claude-yolo: "claude --permission-mode bypassPermissions" }` in `~/.config/workmux/config.yaml` and reference it via `command: <claude-yolo>`. The project template keeps the hardcoded pane command for self-containment.

### Why these came in
Live testing surfaced (1) no way to see live worktree status because workmux was running WezTerm-backend (no tmux wrapping), and (2) the Story Leader's context would carry over between /aped-story → /aped-dev → /aped-review, risking phase bleed and scope creep. Fixes are additive — existing dispatches keep working.

## [3.5.8] - 2026-04-17

### Added
- **`/aped-sprint` auto-injects `/aped-story` into each Story Leader via `workmux add -p`.** Previously the skill told the user to manually type `/aped-story <key>` in each window. With the `-p` flag (inline prompt, supported since workmux 0.1.x), claude launches with the prompt already queued — zero manual step per worktree. This is not an auto-chain of approvals: `/aped-story` is the Leader's own first act on its own branch, nothing is approved or merged yet.
- **`/aped-lead` now delegates merge to the workmux `/merge` skill** when `review-done` is approved. `workmux setup` installs `/merge`, `/rebase`, `/coordinator`, `/worktree`, `/open-pr` as companion skills; `/merge` handles commit+rebase+merge+cleanup in one step. Lead pushes `/merge` via `workmux send` instead of recommending the raw `workmux merge` CLI. Fallback preserved for setups without `workmux setup`.
- **Handle convention documented.** Workmux slugifies branches into handles and places worktrees at `<project>__worktrees/<handle>`. SKILL explains how to recover handle/path via `workmux list` and `workmux path`.

### Changed
- **`.workmux.yaml.example` uses `claude --permission-mode bypassPermissions` as the pane command.** Parallel sprints launching N Story Leaders cannot stop at every tool-call prompt — the copied `.claude/settings.local.json` already captures allow/deny rules, so bypassPermissions trusts that inventory. Users who prefer interactive permissions can swap to `claude` or restore the `<agent>` placeholder.
- **`/aped-sprint` Path A drops `-a claude`.** The pane command now defines how claude launches (with flags), so the `-a` override is redundant. Workmux still auto-detects the built-in `claude` agent for prompt injection.
- **`/aped-lead` push step prefers `workmux send` over raw `tmux send-keys`** when workmux is available (handle resolves naturally, output lands in the right pane, plus agent-status hooks fire).
- User instructions after dispatch rewritten to reflect the new "no manual per-window step" reality.

## [3.5.7] - 2026-04-17

### Fixed
- **`workmux.yaml.example` now copies `.claude/` and `.aped/` in full.** 3.5.6 only copied `.claude/settings.local.json` under the assumption that `.aped/` and most of `.claude/` would be in the worktree via git. Live test surfaced that many APED users gitignore both directories entirely as user-local tooling (CloudVault's `.gitignore` excludes both). On those setups, a fresh worktree has NEITHER the APED machinery NOR the Claude settings — Claude Code fails on the very first prompt because its registered `UserPromptSubmit` hook points to `.aped/hooks/guardrail.sh` which isn't there.
  - New `copy` list: `.env*`, `.mcp.json`, `.claude/`, `.aped/`.
  - Template comments explain that copying is unconditional on purpose — harmless duplicate if the project tracks these paths, vital if it gitignores them.
  - `/aped-sprint` SKILL description aligned: "copy" is what makes the worktree functional, not just secret/env handling.

## [3.5.6] - 2026-04-17

### Changed
- **`workmux.yaml.example` copy list now covers the gitignored files APED actually needs.** Previous minimal default (`.env`, `.env.local`) left dispatched worktrees missing the project-scoped MCP config (`/.mcp.json`) and the local Claude settings (`.claude/settings.local.json`), which caused `/aped-story` to fail on Linear ticket fetches and broke any tool/permission customization inherited from main. New defaults:
  - `copy: [.env*, .mcp.json, .claude/settings.local.json]` (glob catches `.env`, `.env.local`, `.env.development`, `.env.production`)
  - `symlink: [node_modules]` (unchanged)
  - `post_create: pnpm install --frozen-lockfile || npm install` (unchanged)
- **Template comments explain the tracked-vs-gitignored distinction.** Users were tempted to list `.aped/` and `.claude/` in `files.copy` to "make it work" — those come in automatically via the git worktree because they're committed on the branch. Listing tracked paths is redundant and can conflict with branch divergence.
- `/aped-sprint` SKILL now describes the template accurately (MCP + settings.local.json callout) so the skill and template stay in sync.

## [3.5.5] - 2026-04-17

### Fixed
- **Recovery Path A in `/aped-sprint` no longer uses `workmux send` to launch claude.** Live test confirmed `workmux send` only talks to an already-running agent — it cannot launch one. `workmux run` also isn't right (it captures output as artifacts, blocks by default, not interactive). The canonical way to (re)start the configured agent pane in an existing worktree is a close+open cycle, because `workmux open` only executes pane `command:` entries when **creating** a window; on an existing window it just switches to it.
  - New recovery sequence: \`workmux close "$NAME" 2>/dev/null || true; workmux open "$NAME" --run-hooks --force-files\`.
  - SKILL explicitly documents why `send` and `run` don't work so the rationale survives future edits.

### Added
- **`workmux setup` recommendation.** The AGENT column in `workmux list` stays `-` unless the plugin hooks are installed into Claude Code's settings (via `workmux setup`). SKILL now tells the user once to run `workmux setup` in the main project to enable agent status tracking — optional but makes `workmux list` / `workmux dashboard` actually informative.
- Verification step after recovery open: `workmux capture "$NAME" | tail -5` should show the claude banner; if it shows a bare shell, the `.workmux.yaml` lacks an `<agent>` pane or the command didn't take — fallback to the user typing `claude` manually.

## [3.5.4] - 2026-04-17

### Fixed
- **`/aped-sprint` WezTerm PATH fix is now applied, not just mentioned.** When \`wezterm\` is missing from \`$PATH\` but \`$WEZTERM_EXECUTABLE_DIR\` is set, the skill now runs \`export PATH="$WEZTERM_EXECUTABLE_DIR:$PATH"\` in its own shell before any workmux call — otherwise \`workmux open\` / \`add\` fail with \`wezterm cli list: No such file or directory\`. The user is still told once to persist it in \`~/.zshrc\`.
- **Recovery Path A documents the agent-binding gap.** \`workmux open\` (used when a worktree already exists or \`workmux add\` drifts) does NOT bind an agent — the \`-a\` flag only exists on \`workmux add\`. The skill now instructs \`workmux send <name> "claude"\` after \`workmux open\`, and falls back to asking the user to type \`claude\` manually if \`workmux list\` still shows \`AGENT=-\`. The "User Instructions" section surfaces this to the user when the recovery path was used.

## [3.5.3] - 2026-04-17

### Changed
- **Branch-per-story contract enforced across `/aped-sprint`, `/aped-story`, `/aped-lead`.** The live test of 3.5.x surfaced a workflow bug: `/aped-sprint` was posting `story-ready` check-ins and flipping `sprint.stories.{key}.status` to `in-progress` **before** any story file existed, then `/aped-lead` escalated all three because the files were missing. Users were pushed toward running `/aped-story` in `main` (violating branch-per-story) as the recovery path.
  - `/aped-sprint` now creates worktrees only. It records the `worktree` path in state.yaml but no longer touches `status`/`started_at` and no longer posts `story-ready`. Explicit "NEVER" rules added up top.
  - `/aped-story` gains a mode detector (`${a}/WORKTREE` marker) and a **worktree mode**: commits the story file on the feature branch, then posts `story-ready` itself. Solo mode behavior unchanged. Refuses to run on `main` when the marker is present.
  - `/aped-lead`'s `story-ready` AUTO criterion reads the story file from `sprint.stories.{key}.worktree` (the feature branch), not from `main`. Also checks that the story file has at least one commit on the feature branch before auto-approving.
  - `/aped-sprint` "Next Step" rewritten: the user runs `/aped-story <key>` in each worktree first, **then** `/aped-lead` in main.
- **workmux syntax corrected.** The prior SKILL used `workmux add --branch …` — that flag was removed in workmux 0.1.x. Now uses positional `workmux add <BRANCH_NAME> -a claude`, with a documented fallback to `sprint-dispatch.sh` + `workmux open <worktree-name>` when `workmux add` rejects the invocation.
- **workmux + WezTerm CLI detection hardened.** `/aped-sprint` Setup now also probes for a multiplexer (tmux **or** wezterm) and, if the wezterm CLI is missing from `$PATH` but `$WEZTERM_EXECUTABLE_DIR` is set, exports it for the current shell before dispatching (workmux shells out to `wezterm cli`). Mentioned to the user so they can persist it in `~/.zshrc`.
- **`.workmux.yaml` bootstrap rule.** `/aped-sprint` now explicitly copies from `${a}/templates/workmux.yaml.example` when the config is missing, instead of writing a stripped-down inline version. The template already includes `.env` copy, `node_modules` symlink, and `pnpm install --frozen-lockfile` post_create.

### Fixed
- Recovery option A in the sprint flow was "run `/aped-story` in main then rebase into worktrees" — this is now explicitly called out as wrong in the skill instructions. The canonical recovery is: in each worktree, run `/aped-story <key>` on the feature branch, commit, let the skill post `story-ready`.

## [3.5.2] - 2026-04-17

### Changed
- **`/aped-review` reverts to plain subagents** — no more `TeamCreate` / `team_name` / `SendMessage` for the review specialists. Review is a set of independent validations; the Lead merges findings and cross-references domains manually (human-in-the-loop relay, not real-time negotiation). The agent-team machinery was too heavy for this use case and triggered Claude Code's experimental tmux-pane rendering, which becomes unreadable beyond ~3 agents.
- Removes the batching rules introduced in `3.5.1` — no parallelism cap is needed for subagents. All selected specialists (Eva + Marcus + Rex + conditionals by file surface) are dispatched in a single message.
- Step 8 (Apply Fixes): Lead either applies simple fixes directly or re-dispatches the relevant specialist as a one-shot subagent for cross-domain sanity checks — no `SendMessage` ACK loops.
- Step 13: no `TeamDelete` needed (no team exists).

### Kept
- `/aped-dev` fullstack team mode (Kenji / Amelia / Leo) — unchanged. Still uses `TeamCreate` + `SendMessage` because the three agents genuinely co-edit a shared API contract (Kenji is the owner, Amelia and Leo negotiate changes). That's where a team earns its complexity.

## [3.5.1] - 2026-04-17

### Fixed
- **`/aped-review` parallelism cap** — specialists are now dispatched in batches of at most 3 in parallel. Claude Code's experimental agent-teams renders each teammate in a separate tmux pane; a 2×2+ grid on a standard terminal produced unreadable 40-column panes where the `claude --agent-id …` bootstrap command wrapped 7–8 lines deep. The team (`TeamCreate` + `SendMessage`) stays fully functional — we just avoid over-saturating tmux.
  - Batch 1: Eva (ac-validator) + Marcus (code-quality) + one conditional specialist picked by the story's primary surface (Diego / Lucas / Kai / Sam).
  - Batch 2: Rex (git-auditor) + additional conditionals (Aria, cross-layer specialists) if the story spans extra layers. Batch 2 receives batch-1 findings in its initial prompt — richer context, better cross-referencing.
  - Team persists across batches; `SendMessage` works between batch-1 and batch-2 teammates.

## [3.5.0] - 2026-04-17

### Added
- **Lead Dev coordination layer** — new `/aped-lead` skill turns `/aped-sprint` from "N isolated worktrees" into a coordinated team. Story Leaders post `story-ready` / `dev-done` / `review-done` check-ins at every transition; the Lead batch-processes them from the main project, auto-approving what's safe on hard programmatic criteria (deps resolved, tests passing 100%, no HALT logs, git clean, no blocking labels) and escalating anything borderline to the user. Approvals `tmux send-keys` the next command into the right worktree window (fallback: print the command for manual invocation).
- **`checkin.sh` helper** at `.aped/scripts/` with six sub-commands (`post`, `poll`, `approve`, `block`, `status`, `push`). Backend routes to ticket-system labels + comments when `ticket_system != none`, falls back to JSONL inboxes under `.aped/checkins/` otherwise (both concurrent-safe via a portable `mkdir`-based lock — works on macOS where `flock` is absent).
- **`/aped-dev` in worktree mode** now posts `dev-done` and HALTs awaiting Lead approval — zero auto-chain preserved across session boundaries.
- **`/aped-review` in worktree mode** posts `review-done` only when the story flips to `done` — otherwise stays silent for the user to re-run.
- **`/aped-status`** new section "Check-ins awaiting Lead Dev approval" surfaces pending transitions and suggests `/aped-lead`.
- **`/aped-sprint`** now posts `story-ready` at dispatch and does NOT pre-inject `/aped-dev` via workmux `-p` — the Story Leader sits idle until the Lead pushes it.
- **Optional workmux integration** for `/aped-sprint` — when [workmux](https://github.com/raine/workmux) is detected in `$PATH`, APED delegates worktree + tmux window creation + Claude Code launch to `workmux add -a claude` (no `-p` — the Lead pushes `/aped-dev` via `tmux send-keys` once the story-ready check-in is approved). Users gain auto-launched tmux windows, live agent dashboard (`workmux dashboard`), and one-command cleanup (`workmux merge`). Without workmux, the existing fallback flow is preserved — zero breaking change.
- Sample `.workmux.yaml` shipped at `.aped/templates/workmux.yaml.example` with APED-friendly defaults (Claude agent in focus, `.env` copy, `node_modules` symlink, `pnpm install` post-create).
- `/aped-status` now probes `workmux` at startup; if present, the header surfaces "Live agents: `workmux dashboard`" as the authoritative live view.
- README: "Recommended companion tools" section listing workmux (and `jq` for guardrail performance).
- **Parallel sprint** — new `/aped-sprint` skill dispatches multiple stories at once via `git worktree`, one Claude Code session per story. Respects `parallel_limit` (default 3) and `review_limit` (default 2) from `state.yaml`, resolves a DAG from `depends_on:` on each story, and never auto-launches sessions (zero auto-chain preserved — prints the exact commands the user runs).
- **Upstream lock PreToolUse hook** (`.aped/hooks/upstream-lock.sh`) — denies `Write`/`Edit`/`NotebookEdit` on `prd.md`, `architecture.md`, `ux/`, `product-brief.md` while any story is `in-progress`. Only `/aped-course` can unlock by setting `sprint.scope_change_active: true`.
- **Sprint helper scripts** under `.aped/scripts/`:
  - `sprint-dispatch.sh` — creates worktree at `../{project}-{ticket}` with branch `feature/{ticket}-{story-key}` and a `.aped/WORKTREE` marker file
  - `worktree-cleanup.sh` — removes a worktree (force-capable) and optionally deletes the branch
  - `sync-state.sh` — atomic `state.yaml` mutations behind a `flock`
- **Worktree mode** in `/aped-dev` and `/aped-review` — detects the `.aped/WORKTREE` marker and pins the session to the story it records; reads the canonical `state.yaml` from the main project root.
- **Review queue** — `/aped-review` now checks `review_limit` first; if full, the story is parked as `review-queued` and the user is told to re-run when capacity frees.
- **Multi-worktree dashboard** — `/aped-status` refonte: sprint header (capacity used/limit), live list of active worktrees (branch, last commit, test status, ticket status), review queue, ready-to-dispatch list (DAG resolved), ticket sync check. Classic-mode fallback preserved.
- **Scope-change coordination** — `/aped-course` now lists active worktrees, posts notification ticket comments, sets `scope_change_active: true` before touching upstream docs, invalidates epic-context caches on completion, and clears the flag.
- `depends_on` field on each story in `state.yaml` and `**Depends on:**` notation in `epics.md` template — required for DAG resolution in `/aped-sprint`.
- `state.yaml` schema extended: `sprint.active_epic`, `sprint.parallel_limit`, `sprint.review_limit`, per-story `worktree`, `depends_on`, `started_at`. New status `review-queued`.

## [3.4.4] - 2026-04-17

### Added
- `/aped-dev` fullstack mode now calls `TeamDelete(name: "dev-{story-key}")` when the Lead finalises, freeing teammate threads early instead of leaking them until session end.
- `/aped-review` Step 13 renamed to "Tear Down + Next Step" and now calls `TeamDelete(name: "review-{story-key}")` unconditionally before returning to the user.
- Team coordination rule in `/aped-review` now documents `TaskList` + `TaskUpdate` (claim pattern with `owner`) so teammates can self-serve pending work instead of waiting for Lead dispatch.

## [3.4.3] - 2026-04-17

### Added
- `permissions.allow` block in scaffolded `.claude/settings.local.json` — pre-approves the Bash invocations APED skills need (`git`, `gh`, `glab`, `npm`, `pnpm`, `pnpx`, `npx`, `node`, `bash`, `python3`) so users are not prompted on every run.
- `timeout: 5` on the `UserPromptSubmit` hook entry so the guardrail is killed quickly on stall instead of hitting Claude Code's 600s default.
- `argument-hint` frontmatter on slash commands and skills that take an argument (`/aped-story`, `/aped-dev`, `/aped-review`, `/aped-qa`, `/aped-quick`, `/aped-course`) — surfaces autocomplete hints in the Claude Code UI.
- `allowed-tools` on `/aped-checkpoint` (read-only analysis) aligning with the existing `/aped-status` convention.

### Changed
- `${CLAUDE_PROJECT_DIR}` is now used consistently (with braces) in scaffolded `settings.local.json` and in every slash command body, replacing the non-standard `$PROJECT_ROOT` variable. Brings APED in line with Claude Code's official variable-substitution docs.
- `src/templates/commands.js` refactored to a declarative `COMMAND_DEFS` table + single `renderFrontmatter()` generator — removes 14 copies of the same boilerplate.

## [3.4.2] - 2026-04-17

### Fixed
- `publishConfig.provenance` removed — npm requires a recognised CI provider (GitHub Actions, GitLab CI) for automatic provenance, which blocked local publishes. Provenance can still be enabled per-publish from CI with `npm publish --provenance`.
- `bin/aped-method` path normalised (no leading `./`) to silence `npm publish` warning.

### Note
- Version `3.4.1` was tagged on GitHub but never published to npm because of the provenance issue above. `3.4.2` contains the same code plus this fix.

## [3.4.1] - 2026-04-17

### Added
- `--help` / `-h` flag with full usage documentation.
- `--debug` flag and `DEBUG=1` env var for stack traces.
- Automatic tar.gz backup before `--fresh` (written to `.aped-backups/`).
- Second explicit confirmation in interactive `--fresh` mode, listing what will be deleted.
- `NO_COLOR` / `FORCE_COLOR` support (via picocolors).
- `exports` map, `sideEffects: false`, `homepage`, `bugs`, `publishConfig` in `package.json`.
- `smoke` / `check` / `prepublishOnly` npm scripts.
- GitHub Actions workflows: `ci.yml` (check + smoke + real scaffold on Node 18/20/22) and `release.yml` (manual release builder).
- `LICENSE` and `CHANGELOG.md` files.

### Changed
- `config.yaml` parser now uses a whitelist of accepted keys and rejects absolute paths or `..` segments.
- CLI flag parser now warns on unknown flags instead of silently accepting them.
- `guardrail.sh` now uses `set -u` / `set -o pipefail`, validates `current_phase` against a whitelist, and prefers `jq` → `node` for JSON encoding (no more regex fallback).
- Exit codes are now meaningful: `0` success, `1` user error, `2` internal error, `130` user cancellation.
- `/aped-review` Aria (visual specialist): clarified ownership — dev owns React Grab at each GREEN, Aria validates rather than re-running from scratch.
- `/aped-review` Step 8: Lead direct-fix must now `SendMessage` an ACK to the specialist who raised the finding, preventing silent patches that bypass the team.
- `/aped-dev`: explicit fallback documented for when React Grab MCP is unavailable (warn + defer to review, never block dev).
- `files` field in `package.json` restricted to publishable assets, excluding auto-generated `CLAUDE.md` artefacts and the legacy `bin/create-aped.js` alias.

### Security
- Removed regex-based JSON escaping in `guardrail.sh` that could have allowed context injection via a crafted `state.yaml`.
- Path traversal protection on `aped_path`, `output_path`, and `--commands`/`--output`/`--aped` CLI flags (reject `..` segments and absolute paths).
- Whitelisted CLI flags, ticket systems, and git providers to reject unknown or malicious values early.

## [3.4.0] - 2026-04-17

### Added
- Agent-team orchestration for `/aped-review` with a Lead and specialist teammates that coordinate via `SendMessage`.
- Specialist personas: Eva (AC validator), Marcus (code quality), Rex (git auditor), Diego (backend), Lucas (frontend), Aria (visual), Kai (infra), Sam (fullstack).
- Optional fullstack team mode for `/aped-dev` (Kenji / Amelia / Leo) for stories spanning multiple layers.
- Research personas in `/aped-analyze`: Mary (market), Derek (domain), Tom (technical).

### Changed
- `/aped-review` status transitions are strictly binary: `review → done` or `review → review` (no intermediate states, no `[AI-Review]` items).
- Review skill now requires explicit user validation before any status change or write.

## [3.3.1] - 2026-04-16

### Fixed
- `guardrail.sh` now introduces an explicit `sprint` phase and simplifies phase-skip checks.
- Story-status fallback: if `current_phase` isn't updated, the guardrail still detects active sprint work from story statuses.

## [3.3.0] - 2026-04-16

### Added
- End-to-end ticket-system integration across `/aped-epics`, `/aped-story`, `/aped-dev`, `/aped-review`. Supports Linear, Jira, GitHub Issues, GitLab Issues.
- Ticket fetched as source of truth at the start of each phase; divergence with local story halts the flow.

## [3.2.1] - 2026-04-16

### Changed
- Version realigned to 3.2.1 after a premature 3.4.0 tag was rolled back. No functional changes.

## [3.2.0] - 2026-04-12

### Changed
- `CLAUDE.md` generation is now handled by the dedicated `/aped-claude` skill instead of static scaffolding.

## [3.1.0] - 2026-04-12

### Added
- `/aped-dev` integrates `react-grab-mcp` for live visual verification at each GREEN step of the TDD loop on frontend files.

## [3.0.2] - 2026-04-12

### Added
- `react-grab-mcp` integration for visual review (first use in `/aped-review`).

## [3.0.1] - 2026-04-12

### Fixed
- Removed `readStdinLines` that was consuming stdin and blocking `@clack/prompts` interactive prompts.

## [3.0.0] - 2026-04-12

### Added
- Complete pipeline overhaul with user-driven flow (`Analyze → PRD → UX → Arch → Epics → Story → Dev → Review`).
- Migration to `@clack/prompts` with animated logo, pipeline diagram, and responsive terminal output.
- Guardrail hook now emits the official Claude Code UserPromptSubmit JSON shape and honours `$CLAUDE_PROJECT_DIR`.

### Changed
- Zero auto-chaining between phases: every skill ends on "Run `/aped-X` when ready" — the user controls the pace.

[Unreleased]: https://github.com/yabafre/aped-claude/compare/v3.7.1...HEAD
[3.7.1]: https://github.com/yabafre/aped-claude/compare/v3.7.0...v3.7.1
[3.7.0]: https://github.com/yabafre/aped-claude/compare/v3.6.0...v3.7.0
[3.6.0]: https://github.com/yabafre/aped-claude/compare/v3.5.9...v3.6.0
[3.5.9]: https://github.com/yabafre/aped-claude/compare/v3.5.8...v3.5.9
[3.5.2]: https://github.com/yabafre/aped-claude/compare/v3.5.1...v3.5.2
[3.5.1]: https://github.com/yabafre/aped-claude/compare/v3.5.0...v3.5.1
[3.5.0]: https://github.com/yabafre/aped-claude/compare/v3.4.4...v3.5.0
[3.4.4]: https://github.com/yabafre/aped-claude/compare/v3.4.3...v3.4.4
[3.4.3]: https://github.com/yabafre/aped-claude/compare/v3.4.2...v3.4.3
[3.4.2]: https://github.com/yabafre/aped-claude/compare/v3.4.1...v3.4.2
[3.4.1]: https://github.com/yabafre/aped-claude/compare/v3.4.0...v3.4.1
[3.4.0]: https://github.com/yabafre/aped-claude/compare/v3.3.1...v3.4.0
[3.3.1]: https://github.com/yabafre/aped-claude/compare/v3.3.0...v3.3.1
[3.3.0]: https://github.com/yabafre/aped-claude/compare/v3.2.1...v3.3.0
[3.2.1]: https://github.com/yabafre/aped-claude/compare/v3.2.0...v3.2.1
[3.2.0]: https://github.com/yabafre/aped-claude/compare/v3.1.0...v3.2.0
[3.1.0]: https://github.com/yabafre/aped-claude/compare/v3.0.2...v3.1.0
[3.0.2]: https://github.com/yabafre/aped-claude/compare/v3.0.1...v3.0.2
[3.0.1]: https://github.com/yabafre/aped-claude/compare/v3.0.0...v3.0.1
[3.0.0]: https://github.com/yabafre/aped-claude/releases/tag/v3.0.0
