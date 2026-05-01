# Step 2: Input Discovery

## MANDATORY EXECUTION RULES (READ FIRST):

- 🛑 The PRD is required (✱) — HALT if missing
- 📖 Load every discovered file completely (no offset/limit)
- 🚫 In brownfield mode, the existing stack is a hard constraint

## CONTEXT BOUNDARIES

- Phase 0 done (or resume kicked us past this).
- Resume note: if you arrived here via resume, the prior session already loaded these — re-load fresh anyway.

## YOUR TASK

Discover and load upstream APED artefacts. Bias the rest of the workflow.

## DISCOVERY

### 1. Glob

Search in order:

- `{{OUTPUT_DIR}}/**`
- `{{APED_DIR}}/**`
- `docs/**` (project root)

Look for (✱ = required):

- PRD — `*prd*.md` or `prd.md` ✱
- UX Spec — `ux/*.md` or `*ux-design*.md`
- Product Brief — `*brief*.md` or `product-brief.md`
- Project Context — `*context*.md` or `project-context.md`
- Research — `*research*.md`

For sharded UX folders, load `index.md` first if present, then all referenced files.

### 2. Required-input validation

For ✱ PRD:
- Found → continue.
- Missing → HALT: *"Architecture requires a PRD to work from. FRs and NFRs drive every architectural decision. Run `aped-prd` first."*

Do NOT auto-generate a missing PRD.

### 3. Load + report

Brownfield is detected via `project-context.md` presence.

Discovery report:

> Welcome {user_name}! Setting up `aped-arch` for {project_name}.
>
> **Documents discovered:**
> - PRD: {N} files {✓ loaded | ✱ MISSING — HALT}
> - UX Spec: {N} files {✓ loaded — frontend constraints applied | (none)}
> - Product Brief: {N} files {✓ loaded — vision/scale context | (none)}
> - Project Context: {N} files {✓ loaded (brownfield) — existing stack constraints applied | (none)}
> - Research: {N} files {✓ loaded | (none)}
>
> {if brownfield} 📋 Brownfield mode: existing technology stack is a hard constraint. New decisions must integrate with it; reversing existing choices requires explicit user opt-in. {/if}
>
> [C] Continue with these documents
> [Other] Add a file path / paste content — I'll load it and redisplay

⏸ **HALT — wait for `[C]` or additional inputs.**

### 4. Bias the rest of the workflow

- **Step 03 (Context Analysis)**: extracted FRs/NFRs, scale, integration points, compliance signals from PRD; UX commitments (UI library, framework, tokens) reproduced as architectural givens, not re-debated.
- **Step 04 (Technology Decisions)**: in brownfield, existing stack is the default per category; Council (step 05) is dispatched only when overriding an existing choice or filling a gap.
- **Step 05 (Council)**: each specialist receives PRD/UX/context excerpts so dissent is grounded.
- **Step 07 (Structure & Mapping)**: FR → File mapping uses PRD FR IDs verbatim; UX components from spec reflected in directory tree.

## SUCCESS METRICS

✅ PRD loaded.
✅ Discovery report shown; user `[C]` confirmed.
✅ Brownfield framing applied if `project-context.md` was loaded.

## FAILURE MODES

❌ Skipping PRD load — there's nothing to ground decisions in.
❌ Treating UX as advisory in step 04 — it's an architectural given for the frontend category.

## NEXT STEP

Load `{{APED_DIR}}/aped-arch/steps/step-03-context-analysis.md`.
