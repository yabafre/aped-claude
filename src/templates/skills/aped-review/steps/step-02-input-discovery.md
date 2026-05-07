---
step: 2
reads:
  - "{{OUTPUT_DIR}}/stories/{story-key}.md"
  - "{{OUTPUT_DIR}}/epic-{N}-context.md"
  - "{{OUTPUT_DIR}}/architecture.md"
  - "{{OUTPUT_DIR}}/lessons.md"
  - "ticket/{provider}"
writes: []
mutates_state: false
---

# Step 2: Input Discovery

## MANDATORY EXECUTION RULES (READ FIRST):

- 🛑 The story file AND the epic-context cache are required (✱) — HALT if either missing
- 📖 Load every required file completely (no offset/limit)
- 🚫 Do NOT load raw PRD / UX / Project Context — that's the cache's job (6.2.0+)
- 🚫 Lessons become explicit checks, not implicit advisory

## CONTEXT BOUNDARIES

- Mode known, story key resolved (step 01).
- Fresh-context guard passed.
- Epic N inferable from the story key.

## YOUR TASK

Discover and load every required APED artefact. Bias each specialist's review with the cache + architecture + lessons. **`aped-review` is a cache consumer** — the epic-context cache (produced by `aped-story`) carries the cross-cutting epic knowledge so the per-story token bill stays flat across the review surface.

## DISCOVERY

### 1. Inputs

Load each (✱ = required):

- ✱ Story file — `{{OUTPUT_DIR}}/stories/{story-key}.md`.
- ✱ Epic context cache — `{{OUTPUT_DIR}}/epic-{N}-context.md` (N = epic number from story key).
- Architecture — `{{OUTPUT_DIR}}/architecture.md` (full load; pattern compliance grades against it. Without it, Pattern Compliance specialist runs in degraded mode — WARN, not HALT).
- Lessons — `{{OUTPUT_DIR}}/lessons.md` (filter `Scope: aped-review` or `Scope: all`).
- Last done story of same epic — the most recent `{{OUTPUT_DIR}}/stories/{epic}-*.md` with status `done` (continuity for fine-grain contract / decision tracking; skip if first story of epic).

**Do NOT load** PRD, UX spec, project-context, or product brief raw. Their relevant excerpts already live in the epic-context cache. If you find yourself wanting one of them, the cache is incomplete — re-run `aped-story` to refresh it.

### 2. Required-input validation (hard-stop)

For ✱ Story file:
- Found → continue.
- Missing → HALT: *"No story file found at `{{OUTPUT_DIR}}/stories/{story-key}.md`. The story may not have been prepared, or the story key is wrong."*

For ✱ Epic context cache:
- Found → continue.
- Missing → HALT: *"No epic context cache found at `{{OUTPUT_DIR}}/epic-{N}-context.md`. Run `aped-story` first — it compiles the cache so `aped-review` can stay token-light. Do not work around this by loading PRD/UX/architecture raw — that's exactly the drift the cache exists to prevent."*

For Architecture (recommended, not required):
- Missing → WARN: *"No `architecture.md` found. Pattern Compliance review will operate in degraded mode (specialist must infer conventions from the codebase). Consider running `aped-arch` first if patterns matter for this review."*
- Continue without HALT.

### 3. Load + report

Load every required file completely. Brownfield context lives in the cache — if its "Project context (brownfield only)" section is non-empty, treat the story as brownfield.

In **classic** mode, present the full discovery report and HALT for `[C]` confirmation:

> Reviewing story {story-key} in {project_name}.
> Loaded: Story ✓, Epic Context Cache ✓, Architecture {✓|⚠ missing — degraded mode}, Lessons ({K} review-scoped rules), Last done story of epic {epic#} {✓ {key}|— first story}.
>
> [C] Continue to classification & dispatch
> [Other] Add a file path / paste content — I'll load it and redisplay

In **worktree** mode, log a one-liner — `aped-review` is auto-launched without a human at the keyboard:

> Reviewing story {story-key}. Loaded: Story ✓, Epic Context ✓, Architecture {✓|⚠ degraded}, Lessons ({K}).

### 4. Bias the rest of the workflow

Loaded artefacts inform every specialist's review:

- Pattern Compliance specialist checks code against `architecture.md` conventions (full file) and the cache's "Architecture references" section.
- AC Coverage specialist cross-references the story's ACs back to FR IDs in the cache's "Scope from PRD" section.
- Frontend specialist (when applicable) verifies the components/screens listed in the cache's "UX references" section are used as specified.
- Edge Case Hunter pulls scenarios from the cache's NFR list and the brownfield "Project context" section if present.
- **Lessons become explicit checks, not implicit advisory.** For each loaded lesson with scope `aped-review` or `all`:
  - The `Rule:` is added to the relevant specialist's checklist (e.g. if Epic 1's lesson was "always verify error states are reachable in the UI", the Frontend specialist gets that as a mandatory check).
  - The `Mistake:` from the lesson becomes a specific finding category — the team is explicitly asked *"did this story repeat the {Mistake} we identified after Epic {N}?"*.
  - A lesson never "passes review by default" — if the relevant specialist can't confirm the rule was applied, that's a finding, not a non-event.
  - When dispatching specialists in step 04 / 06, include the lesson set scoped to that specialist in their prompt so their criteria are augmented at runtime, not just gathered post-hoc.

## SUCCESS METRICS

✅ Story file loaded (or HALT).
✅ Architecture absence handled (warn + degraded mode, no HALT).
✅ Classic mode: discovery report shown, `[C]` confirmed.
✅ Worktree mode: one-line log emitted.
✅ Lessons mapped to specialist prompts.

## FAILURE MODES

❌ Proceeding without a story file — there's nothing to review.
❌ Treating architecture absence as a HALT — degrades but doesn't block.
❌ Treating lessons as advisory — re-introduces mistakes the retro caught.

## NEXT STEP

Load `{{APED_DIR}}/aped-review/steps/step-03-classify-and-prepare.md` to classify the story, check review capacity, and prepare specialist dispatch.
