# APED Glossary

Single source for the terms APED uses across skills, hooks, scripts, and docs. Each entry: one-line definition + a pointer to the canonical doc when one exists. Cross-links favoured over duplication.

Last updated: v6.11.0.

## Pipeline structure

**Phase** — one of the 8 canonical pipeline stages (`Analyze → PRD → UX → Arch → Epics → Story → Dev → Review`). Each phase produces an artefact and ends with an explicit user gate. See [`docs/aped-phases.md`](./aped-phases.md).

**Subphase** — a named slice of work inside a phase, tracked in `state.yaml` as `pipeline.phases.<phase>.current_subphase` and pushed onto `completed_subphases` after each gate. The phase skeleton (e.g. `aped-arch/step-01-init.md`) lists the canonical subphases in the frontmatter `phases_planned`.

**Skill** — a directory under `.claude/skills/aped-*/` (symlinked from `.aped/aped-*/`). Three layouts: inline `SKILL.md` only, `SKILL.md` + `workflow.md`, or `SKILL.md` + `workflow.md` + `steps/step-NN-*.md` (full BMAD decomposition). See [`docs/skills-classification.md`](./skills-classification.md).

**BMAD micro-file** — a single `steps/step-NN-*.md` file inside a phase skill. Loaded lazily by Claude so only the slice relevant to the current operation is in context. See [`docs/dev/discovery-pattern.md`](./dev/discovery-pattern.md).

**Discovery pattern** — the BMAD-style scan a skill runs at entry to consume every relevant artefact it can find under `outputDir/`. Replaces inter-phase gates and `/aped-context` forking. See [`docs/dev/discovery-pattern.md`](./dev/discovery-pattern.md).

## Artefacts

**Artefact** — a Markdown file produced by a phase skill under `outputDir/` (default `docs/aped/`). Examples: `prd.md`, `architecture.md`, `epics.md`, `epics-context/epic-N-context.md`, `stories/N-M-slug.md`.

**Skeleton** — the empty-section template a phase skill writes at Phase 0 (e.g. `aped-arch/step-01-init.md` writes 9 Phase L2 headings). Subsequent gates fill the sections incrementally.

**Council dispatch** — an optional Phase 2b sub-section under `architecture.md` recording an adversarial multi-specialist verdict for a high-stakes decision (DB, auth model, API paradigm, etc.). One L3 per dispatch.

**ADR** — Architecture Decision Record, written as `## ADR-N: <title>` at L2 in `architecture.md` (since 6.11.0 the schema accepts these via `top_level_patterns`). Fields: Status / Context / Decision / Consequences (enforced by `oracle-arch.sh`).

**FR / NFR** — Functional / Non-Functional Requirement, bullets under `## Functional Requirements` / `## Non-Functional Requirements` in `prd.md`. Cohort-3 schema accepts `FR1:`, `FR-1:`, and `**FR-1:**` forms.

**E0.x story** — Epic Zero story: foundation work surfaced by the arch process and tracked under `## Phase 8 — Epic Zero` in `architecture.md`. Counted into `state.yaml.pipeline.phases.architecture.epic_zero_stories`.

**W-item / G-item** — Watch item (W) and Residual gap (G), recorded under `## Phase 6 — Watch Items` and `## Phase 7 — Residual Gaps` in `architecture.md` (since 6.11.0). Counted into the matching state.yaml arrays.

## Validation

**Cohort** — a generation of the markdown-schema DSL. Cohort-1 (6.3.0) added structural contracts for `story.md` / `epics.md` / `epic-context.md`. Cohort-2 (6.9.0) added recursive `sub_sections` for Review Record + Dev Agent Record. Cohort-3a (6.10.0) added `prd.md`. Cohort-3b (6.11.0) added `architecture.md` + the `top_level_patterns` and `sub_sections_heading_pattern` DSL fields. Coverage now 5/5. See [`src/templates/data/markdown-schema.dsl.md`](../src/templates/data/markdown-schema.dsl.md).

**Oracle** — a HALT-bearing deterministic script (`oracle-arch.sh`, `oracle-prd.sh`, etc.) that checks semantic invariants (FR coverage, ADR field completeness, Component metadata) and exits non-zero on a violation. Skills surface oracle errors verbatim and stop.

**Structural validator** — a WARN-only script (`validate-architecture.sh`, `validate-prd.sh`, etc.) wrapping the shared Node walker (`scripts/lib/markdown-schema-walk.mjs`) over a JSON schema. Checks structural invariants (heading shape, required sections, line patterns) and surfaces drift without stopping. Oracle and structural validator are complementary, not redundant.

**`lines_match`** — schema field, regex applied to every non-blank, non-heading, bullet-prefixed line under a section. Used to enforce FR / NFR bullet shapes in `prd.schema.json`.

**`sub_sections`** — schema field (6.9.0+), recursive list of nested children with the same shape as `sections[]`. Walker validates required-missing, invented children, and `lines_match` at every depth.

**`top_level_patterns`** — schema field (6.11.0+), regex allowlist for L2 names alongside fixed `top_level`. Pattern-matched headings are accepted in any position, any count, and skip the order cursor.

**`sub_sections_heading_pattern`** — schema field (6.11.0+), per-section regex allowlist for direct children. Coexists with fixed `sub_sections[]`: a child is OK if it matches a declared name OR matches the pattern.

## Process

**Gate** — an explicit user-facing pause at the end of a phase or subphase. The skill HALTs until the user picks `[C]ontinue` / `[A]dvanced elicitation` / `[Other]` direct correction. Coherence hook warns when an agent skips a gate.

**NACK** — Negative ACKnowledgement: a user gate response that returns control to the skill with a correction. Distinct from `[A]dvanced elicitation` (loops to `aped-elicit`) and `[C]ontinue` (proceeds).

**Chantier** — an internal worktrack inside a release cycle (e.g. "chantier U" in 6.3.0 was the artefact-contract worktrack). Surfaces in spec docs at `docs/implementation-artifacts/`.

**Slip-in** — a small scope expansion mid-implementation when (a) a bug blocks the user today, (b) architectural surface is small, (c) test coverage grows accordingly. Documented in the spec's `Spec Change Log`.

**Ticket sync** — the `state.yaml.ticket_sync` block mirroring per-story ticket state (id / status / url) for the configured `ticket_system` (Linear / Jira / GitHub Issues / GitLab Issues / ClickUp). Updated by `aped-epics`, `aped-from-ticket`, `aped-ship`, and `aped-course` via `sync-state.sh`.

## Modes & topology

**Sprint mode** — parallel or sequential execution of multiple stories under one Lead Dev coordinator. `parallel` uses `git worktree` per story; `sequential` uses `git-spice` stacked branches. See [`docs/aped-workflow.md`](./aped-workflow.md).

**Worktree** — a per-story `git worktree` for parallel sprint mode. Registered in `state.yaml.sprint.worktrees[]`. Cleaned up after merge.

**Brownfield / greenfield / hybrid** — project topology recorded in `state.yaml.pipeline.phases.context.type`. Brownfield = existing codebase (entry: `aped-context`). Greenfield = new project (entry: `aped-analyze`). Hybrid = new feature in legacy system (both apply).

**Sequential mode** — sprint mode variant using `git-spice` stacked branches instead of worktrees. Schema v4 of state.yaml. See [`docs/TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) §37.

## Discipline

**ETHOS.md** — the per-skill Iron Laws file, hoisted into the skill directory in 6.5.0. Each skill declares 2–4 non-negotiable rules its agent must honor. Read by every step.

**Iron Law** — a non-negotiable rule in ETHOS.md (e.g. "RED before GREEN in `aped-dev`"). Distinct from a stylistic preference.

**Completion-gate checklist** — a `gates/<name>.md` file referenced by a phase skill at gate time. Each `[ ]` becomes `[x]` or the gate HALTs. Lived experience: 5.5.0 introduced 16 such files to stop agents from auto-advancing past partial work.

**`allowed-paths` frontmatter** — declared on every skill, lists which paths the skill may `write:` and `read-only:`. The opt-in `allowed-paths-scope.sh` PreToolUse hook enforces them.

**Hook** — a Claude Code lifecycle script invoked at well-defined points (PreToolUse, PostToolUse, SessionStart, Stop, etc.). APED ships two core (`guardrail.sh`, `upstream-lock.sh`) and 10+ opt-in (`commit-gate`, `prompt-injection`, `context-monitor`, etc.). See README "Optional hooks" table.
