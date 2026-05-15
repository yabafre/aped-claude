---
step: 1
reads:
  - "{{OUTPUT_DIR}}/state.yaml"
  - "{{OUTPUT_DIR}}/architecture.md"
writes:
  - "{{OUTPUT_DIR}}/architecture.md"
  - "state.yaml#pipeline.phases.architecture"
  - "mcp/aped_state.advance"
mutates_state: true
---

# Step 1: Initialization, Resume Guard, Phase 0 Skeleton

## MANDATORY EXECUTION RULES (READ FIRST):

- 🛑 If `pipeline.phases.architecture.status: in-progress` AND `current_subphase` is set, RESUME — skip Phase 0 setup
- 🛑 NEVER silently re-initialise after a crashed write — HALT and ask the user `[R]estart` / `[A]bort`
- 📖 ALWAYS read the complete step file before acting

## CONTEXT BOUNDARIES

- This is the first step of `aped-arch`.
- The PRD already exists (verified in step 02).

## YOUR TASK

Check pipeline state, handle resume, and (if fresh) initialise `architecture.md` with the skeleton + advance state.

## STATE CHECK

Read `{{OUTPUT_DIR}}/state.yaml`:

- `pipeline.phases.architecture.status` is `done` → ask user *"Architecture exists. Redo or skip?"* If skip, STOP.
- `pipeline.phases.architecture.status` is `in-progress` AND `current_subphase` set AND `architecture.md` exists with parseable frontmatter → **RESUME**. Announce: *"Resuming Arch at `{current_subphase}` — `{N}` subphase(s) already completed."* Skip ahead to the matching step (e.g. `technology-decisions` → step 04).
- `in-progress` but `architecture.md` missing OR frontmatter unreadable → **HALT** and ask: *"State and artefact diverged. `[R]estart Phase 0 (loses recorded subphases)` or `[A]bort and restore architecture.md from VCS`?"*
- No `architecture` entry yet → continue to Phase 0 below.

## PHASE 0 — INITIALISE TRACKED ARTEFACT (only on fresh state)

### 1. Write `architecture.md` skeleton

If `{{OUTPUT_DIR}}/architecture.md` does NOT already exist, write the skeleton:

```markdown
---
artefact: architecture
project: {{project_name}}
created: <ISO 8601 now>
last_updated: <ISO 8601 now>
current_subphase: context-analysis
completed_subphases: []
phases_planned:
  - context-analysis
  - technology-decisions
  - council-dispatches
  - implementation-patterns
  - structure-mapping
  - validation
  - watch-items
  - residual-gaps
  - epic-zero
---

# Architecture — {{project_name}}

> Built incrementally by `aped-arch`. Sections fill as each subphase is validated.

## Phase 1 — Context Analysis

<!-- Populated after Phase 1 gate: extracted FRs/NFRs, scale, integration points, compliance signals, requirement tensions. -->

## Phase 2 — Technology Decisions

### Data Layer

### Authentication & Security

### API Design

### Frontend

### Infrastructure

## Phase 2b — Council Dispatches

<!-- Optional. One subsection per major decision dispatched. -->

## Phase 3 — Implementation Patterns

### Naming Conventions

### Code Structure

### Communication Patterns

### Process Rules

## Phase 4 — Structure & Mapping

### Directory Tree

### FR → File Mapping

### Integration Boundaries

### Shared Code Inventory

## Phase 5 — Validation

## Phase 6 — Watch Items

<!-- W-items: assumptions, risks, monitoring obligations surfaced during arch. Counted into state.yaml `watch_items` by step-09. -->

## Phase 7 — Residual Gaps

<!-- G-items: open questions blocking nothing but needing follow-up. Counted into state.yaml `residual_gaps` by step-09. -->

## Phase 8 — Epic Zero

<!-- E0.x stories: foundation work surfaced by the arch process. Counted into state.yaml `epic_zero_stories` by step-09. -->
```

### 2. Advance state

**Prefer MCP**: `aped_state.advance(phase: "arch", status: "in-progress")`.

**Fallback**: edit `{{OUTPUT_DIR}}/state.yaml`:

```yaml
pipeline:
  current_phase: "architecture"
  phases:
    architecture:
      status: "in-progress"
      current_subphase: "context-analysis"
      completed_subphases: []
      output: "{{OUTPUT_DIR}}/architecture.md"
      started_at: "<ISO 8601 now>"
```

### 3. Confirm

> Architecture tracking initialised — `architecture.md` skeleton written, state advanced to `current_subphase: context-analysis`.

## INCREMENTAL TRACKING CONTRACT (referenced by every gate downstream)

After every `⏸ GATE` in this skill, do these three writes **atomically**, in this order:

1. **Append to `{{OUTPUT_DIR}}/architecture.md`** — write validated content under the matching section header. Use Edit; never regenerate the whole file.
2. **Update the architecture frontmatter** — set `current_subphase` to the *next* subphase, push the just-finished subphase onto `completed_subphases`, bump `last_updated`.
3. **Update `{{OUTPUT_DIR}}/state.yaml`** — mirror `pipeline.phases.architecture.current_subphase` and `completed_subphases`, bump `last_updated`. Keep `status: "in-progress"` until step 09 finalisation.

If any write fails, HALT — partial progress is better than divergent state.

## SUCCESS METRICS

✅ State checked; resume / fresh path chosen correctly.
✅ Fresh path: skeleton written, state advanced.
✅ Incremental tracking contract understood for downstream gates.

## FAILURE MODES

❌ Silently re-initialising over a crashed `architecture.md` — destroys recorded subphases.
❌ Skipping the resume check — duplicates Phase 0 work.
❌ Treating frontmatter divergence as a soft warning — it's a HALT.

## NEXT STEP

Load `{{APED_DIR}}/aped-arch/steps/step-02-input-discovery.md`.
