# Discovery Pattern — APED skill input loading

**Audience:** APED skill authors editing files under `packages/create-aped/src/templates/skills/`.
**Status:** Canonical pattern. Copy-paste when creating or refactoring any pipeline-phase skill.
**Related decisions:** `project_aped_doc_consumption` memory (2026-04-25 — drop inter-phase gates, adopt BMAD-style consume-everything-found).
**Last updated:** v6.0.0.

> **v6.0.0 layout note.** Since v6.0.0, every skill is a directory (`aped-X/SKILL.md` + optional `workflow.md` + `steps/step-NN-*.md`). For phase skills with full BMAD decomposition, the discovery pattern lives in `aped-X/steps/step-NN-input-discovery.md` (typically step 02). For skills that ship `SKILL.md` only, it remains the first runtime section of `SKILL.md` as documented below. Either way, the pattern is identical — only the file location differs.

> **Typed alternative (v4.20.0+):** Skills can call the `aped_context.load(phase)` MCP tool instead of the manual Read chain described below. The MCP tool performs the same glob-discover-load sequence and returns typed results. The manual pattern remains the reference for understanding the logic and for skills that cannot use MCP tools.

## Why this pattern exists

Older APED skills loaded upstream artefacts via `state.yaml` paths (e.g. `pipeline.phases.analyze.output`). That coupling had three problems:

1. **Brittle** — if the user produced an artefact outside the state-tracked flow (e.g. ran `aped-context` standalone, or hand-edited `docs/aped/context.md`), downstream skills never saw it.
2. **Fork-prone** — `aped-analyze` and `aped-context` advertised themselves as mutually exclusive entry points ("not for greenfield — use X"), forcing users to pick a lane up front instead of letting tooling adapt.
3. **Latent bugs** — at least two skills (`aped-arch`, `aped-ux`) referenced upstream documents in their prose without ever loading them at runtime, relying on the model having the right artefacts in conversation context by accident.

The pattern below mirrors how BMAD handles input discovery in its `step-01-init.md` files: glob → confirm → load all → bias the rest of the workflow. Each downstream skill consumes whatever exists, hard-stops on missing required prereqs, and reports brownfield/greenfield mode based on what it found rather than what the user declared.

## Where this pattern goes inside a skill

Insert as the **first runtime section** of the skill, before the existing `## Setup` block (or fold the legacy Setup into it). Example skill order:

```
---
frontmatter
  allowed-paths:            <-- REQUIRED since v5.0.0 (see below)
    - docs/aped/**
    - ...
---
# Skill title

## Critical Rules
## Guiding Principles      <-- if any
## Input Discovery         <-- THIS PATTERN
## Setup                   <-- config.yaml, state.yaml status check
## Phase 1: ...
...
```

> **`allowed-paths` (v5.0.0+):** Every skill must declare an `allowed-paths` list in its frontmatter. List the directories the skill needs to read during discovery (e.g. `docs/aped/**`, `src/**`). The runtime rejects file access outside these paths. When adding a new skill, set `allowed-paths` to cover your glob list from Input Discovery plus any output directories the skill writes to.

The discovery step replaces the part of the legacy Setup that loaded upstream documents via `state.yaml` paths. State.yaml is still read in Setup for *pipeline status* (e.g. "this phase is already done — redo or skip?"), but **never for artefact paths** anymore — those come from the glob discovery below.

## The pattern (copy-paste, then customize)

When pasting into a skill file, fill in three things:

1. **Glob list** — only the artefacts that make architectural sense for this phase. Don't list everything.
2. **Required prereqs (✱)** — the artefacts whose absence is a hard-stop for this skill. Most pipeline skills have one upstream prereq; some have none (entry-point skills) or two.
3. **The discovery report** — the user-facing block. Phrase it for this specific skill.

```markdown
## Input Discovery

Before any work, discover and load all upstream APED artefacts that exist.
This skill is consume-everything-found: don't ask the user to declare
greenfield/brownfield, sniff for it.

### 1. Glob discovery

Search these locations in order:
- `{{OUTPUT_DIR}}/**`
- `{{APED_DIR}}/**`
- `docs/**` (project root)

Look for these artefacts (✱ = required for this skill, others = optional):

<!-- CUSTOMIZE: list only what makes sense for THIS phase -->
- Product Brief — `*brief*.md` or `product-brief.md`
- Project Context — `*context*.md` or `project-context.md`
- Research — `*research*.md`
- PRD — `*prd*.md` or `prd.md`
- UX Spec — `ux/*.md` or `*ux-design*.md`
- Architecture — `*architecture*.md` or `architecture.md`
- Epic Context Cache — `epic-{N}-context.md`

For sharded folders (folder with `index.md` + multiple files), load the
index first, then all files referenced.

### 2. Required-input validation (hard-stop)

<!-- CUSTOMIZE: only the ✱ items above -->
For each ✱ artefact:
- If found: continue
- If missing: HALT with a clear message naming the missing prereq and
  the upstream skill that produces it. Example:
  > "Architecture requires a PRD to work from. Run `aped-prd` first,
  > or provide the PRD file path."

Do NOT auto-generate a missing prereq. Hard-stop is intentional.

### 3. Load + report

- Load every discovered file completely (no offset/limit).
- For sharded folders, load all files using the index as a guide.
- Track each loaded file in this skill's working memory.

Brownfield/greenfield is detected, not declared:
- `project-context.md` found → brownfield
- otherwise → greenfield

Present a discovery report to the user (adapt to `communication_language`):

> Welcome {user_name}! Setting up `{this-skill}` for {project_name}.
>
> **Documents discovered:**
> - Product Brief: {N} files {✓ loaded | (none — greenfield)}
> - Project Context: {N} files {✓ loaded (brownfield mode) | (none)}
> - PRD: {N} files {✓ loaded | ✱ MISSING — see above}
> - Research: {N} files {✓ loaded | (none)}
> - UX Spec: {N} files {✓ loaded | (none)}
> - Architecture: {N} files {✓ loaded | (none)}
>
> **Files loaded:** {comma-separated filenames or "none beyond required"}
>
> {if brownfield} 📋 Brownfield mode: existing project context loaded.
> Subsequent questions will assume an existing system to extend. {/if}
>
> Anything else to include before we proceed?
>
> [C] Continue with these documents
> [Other] Add a file path / paste content — I'll load it and redisplay

⏸ **HALT — wait for `[C]` or additional inputs. This is a light
confirmation, not a heavy gate. Don't auto-proceed.**

### 4. Bias the rest of the workflow

Loaded artefacts inform every subsequent phase of this skill:
- When generating content, ground in the artefacts (no hallucinated
  FRs, no invented user types, no lorem ipsum).
- When asking the user questions, skip what's already answered in the
  artefacts. If the brief says the target user is "kitchen managers",
  don't re-ask.
- When making recommendations, cite the artefact line: "Per PRD §3.2…",
  "Brief states the MVP scope is X, so…".
```

## Customization checklist per Tier-1 skill

For the nine pipeline-phase skills that need this pattern, the customization is:

| Skill            | Globs to keep                              | Required (✱)    | Notes                                              |
|------------------|--------------------------------------------|-----------------|----------------------------------------------------|
| `aped-analyze`   | brief, context, research                   | none            | Greenfield is fine with nothing; sniff context.md  |
| `aped-context`   | none — it's the producer                   | none            | Skip the discovery section. Only fix description.  |
| `aped-prd`       | brief, context, research                   | brief ✱         | Or none if a more permissive policy is preferred   |
| `aped-ux`        | brief, context, prd, research              | **prd ✱**       | Fixes the long-standing PRD-not-loaded bug         |
| `aped-arch`      | brief, context, prd, ux, research          | **prd ✱**       | Adds the missing context.md load                   |
| `aped-epics`     | brief, context, prd, ux, arch              | prd ✱           | Already partial — harmonise it                     |
| `aped-story`     | brief, context, prd, ux, arch, epics       | epics ✱         | Story-level, lighter discovery                     |
| `aped-dev`       | all of the above + epic-context cache      | story file ✱    | The cache stays; discovery enriches it             |
| `aped-review`    | all of the above + epic-context cache      | story + arch ✱  | Same shape as `aped-dev`                           |

## What stays the same

- **Intra-skill A/P/C menus and ⏸ HALTs** — these are BMAD-style and remain. The pattern adds a single light `[C]` confirmation at the end of discovery; it does not remove the existing per-section gates inside each skill.
- **Personas in parallel** (Mary / Derek / Tom in `aped-analyze`; Council in `aped-arch`) — unchanged. The pattern only changes input loading at skill entry, not how phases dispatch agents.
- **`state.yaml` for pipeline status** — still read in `## Setup` to detect "this phase is already done" and offer redo/skip. Just no longer used for artefact path lookup. Since v5.2.0, `state-schema.mjs` is the single source of truth for the `state.yaml` shape — skill authors must not invent new state keys without adding them to the schema first.

## What this pattern does NOT do

- It does not introduce a shared runtime include. Each skill duplicates the customised pattern. This matches how BMAD ships `step-01-init.md` per skill and avoids cross-skill coupling.
- It does not auto-generate missing prereqs. Hard-stop is intentional — generating a placeholder PRD inside `aped-arch` would hide a real gap and produce architecture grounded in fiction.
- It does not remove `aped-context` as a command. `aped-context` stays a first-class artefact producer (like `aped-research`); other skills consume its output via discovery.

## Completion-gate checklists (v5.5.0+)

Every skill longer than 250 lines must include a `## Completion Gate` section with a markdown checklist before its final output. The checklist enumerates the concrete deliverables the skill commits to (files written, validations passed, state.yaml updates). The runtime surfaces incomplete items to the user before marking the phase done.

When creating a new skill, add a completion gate if the skill body exceeds 250 lines. For shorter skills the gate is optional but encouraged.

## Reference implementation already in tree

`aped-from-ticket.md` lines 87–89 already implements a lightweight version of this pattern:

```
1. PRD — read if it exists. Identify FRs/NFRs that semantically overlap…
2. Architecture — read if it exists. Note any constraint that affects…
3. UX spec — read if it exists. Surface any screen/component the ticket touches.
```

When in doubt about wording or scope, look there first — it's the closest pre-existing analogue in the codebase.
