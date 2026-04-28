---
name: aped-arch
description: 'Use when user says "create architecture", "technical architecture", "solution design", or invokes /aped-arch. Runs between PRD and Epics.'
allowed-tools: Read Write Edit Glob Grep Bash Agent TaskCreate TaskUpdate
disable-model-invocation: true
license: MIT
metadata:
  author: yabafre
  version: {{CLI_VERSION}}
---

# APED Architecture — Collaborative Solution Design

Create architecture decisions through step-by-step discovery so that all downstream agents (dev, review, story) implement consistently. This is a **partnership** — you bring structured thinking, the user brings domain expertise and product vision.

## Critical Rules

- EVERY decision must have a rationale — no "just because" choices
- Architecture is NOT implementation — define WHAT and WHY, not the code
- Do NOT proceed to next section without user validation
- Decisions made here are LAW for /aped-dev and /aped-review
- For **major decisions** (Database, Auth, API style, Frontend framework, Infra platform) — dispatch an **Architecture Council** of specialist subagents to surface genuine divergent perspectives. Single-brain reasoning converges to groupthink; real subagents disagree.

## Input Discovery

Before any work, discover and load all upstream APED artefacts. Architecture decisions ground in PRD requirements, UX commitments, and existing-system constraints.

### 1. Glob discovery

Search these locations in order:
- `{{OUTPUT_DIR}}/**`
- `{{APED_DIR}}/**`
- `docs/**` (project root)

Look for these artefacts (✱ = required):
- PRD — `*prd*.md` or `prd.md` ✱
- UX Spec — `ux/*.md` or `*ux-design*.md`
- Product Brief — `*brief*.md` or `product-brief.md`
- Project Context — `*context*.md` or `project-context.md`
- Research — `*research*.md`

For sharded folders (UX spec is a folder with multiple files), load `index.md` first if present, then all files referenced.

### 2. Required-input validation (hard-stop)

For the ✱ PRD:
- If found: continue
- If missing: HALT with this message:
  > "Architecture requires a PRD to work from. FRs and NFRs drive every architectural decision. Run `/aped-prd` first, or provide the PRD file path."

Do NOT auto-generate a missing PRD.

### 3. Load + report

- Load every discovered file completely (no offset/limit).
- For the UX spec folder, load all 4 files (design-spec, screen-inventory, components, flows).
- Brownfield/greenfield is detected via `project-context.md` presence.

Present a discovery report (adapt to `communication_language`):

> Welcome {user_name}! Setting up `/aped-arch` for {project_name}.
>
> **Documents discovered:**
> - PRD: {N} files {✓ loaded | ✱ MISSING — HALT}
> - UX Spec: {N} files {✓ loaded — frontend constraints applied | (none)}
> - Product Brief: {N} files {✓ loaded — vision/scale context | (none)}
> - Project Context: {N} files {✓ loaded (brownfield) — existing stack constraints applied | (none)}
> - Research: {N} files {✓ loaded | (none)}
>
> **Files loaded:** {comma-separated filenames}
>
> {if brownfield} 📋 Brownfield mode: the existing technology stack documented in project-context.md is treated as a hard constraint. New decisions must integrate with it; reversing existing choices requires explicit user opt-in (and likely a separate /aped-course session). {/if}
>
> [C] Continue with these documents
> [Other] Add a file path / paste content — I'll load it and redisplay

⏸ **HALT — wait for `[C]` or additional inputs.**

### 4. Bias the rest of the workflow

Loaded artefacts inform every phase of this skill:
- **Phase 1 — Context Analysis**: extracted FRs/NFRs, scale, integration points, and compliance signals come from the PRD; UX commitments (UI library, framework, tokens) are reproduced as architectural givens, not re-debated.
- **Phase 2 — Technology Decisions**: in brownfield mode, the existing stack is the default for each category; the Council is dispatched only when overriding an existing choice or filling a gap, not for every decision.
- **Phase 2b — Council**: each specialist receives the full PRD/UX/context excerpts so their dissent is grounded, not generic.
- **Phase 4 — Structure & Mapping**: FR → File mapping uses PRD FR IDs verbatim. UX components from the spec are reflected in the directory tree.

## Setup

1. Read `{{APED_DIR}}/config.yaml` — extract config
2. Read `{{OUTPUT_DIR}}/state.yaml` — check pipeline state
   - If `pipeline.phases.architecture.status` is `done`: ask user — redo or skip?
   - If user skips: stop here
   - If `pipeline.phases.architecture.status` is `in-progress` and `current_subphase` is set: announce resume point ("Resuming Arch at `{current_subphase}` — `{N}` subphase(s) already completed.") and skip ahead to that subphase's gate.

## Incremental Tracking Contract

Architecture is built **incrementally**, not regenerated at the end. The artefact and state are updated after every validated subphase so an interrupted session always leaves a usable, resumable trail.

### Subphase enum

In order: `context-analysis` → `technology-decisions` → `council-dispatches` → `implementation-patterns` → `structure-mapping` → `validation` → `done`.

(`council-dispatches` is optional and only listed once per major decision; if no major decisions trigger Council, it is appended to `completed_subphases` without writing a section.)

### After every `⏸ GATE` in this skill

Do these three writes **atomically**, in this order, before presenting the next phase:

1. **Append to `{{OUTPUT_DIR}}/architecture.md`** — write the validated content under the matching section header. Use Edit to append; never regenerate the whole file. Section headers come from the Phase 0 skeleton — fill them in place.
2. **Update the architecture frontmatter** — set `current_subphase` to the *next* subphase, push the just-finished subphase onto `completed_subphases` (if not already present), bump `last_updated` to current ISO 8601 timestamp.
3. **Update `{{OUTPUT_DIR}}/state.yaml`** — mirror `pipeline.phases.architecture.current_subphase` and `pipeline.phases.architecture.completed_subphases` and bump `last_updated`. Keep `status: "in-progress"` until Phase 5 finalisation.

If any of the three writes fails, HALT and surface the error. Do not advance frontmatter or state if the architecture write itself failed — partial progress is better than divergent state.

## Phase 0: Initialise tracked artefact

Run this **once**, immediately after the Input Discovery `[C] Continue` confirmation and before Phase 1 work begins.

### Resume guard — skip Phase 0 entirely

Before doing any of the steps below, check resume conditions in this order:

- If `state.yaml` shows `pipeline.phases.architecture.status == "in-progress"` AND `current_subphase` is set AND `architecture.md` exists with a parseable frontmatter: **skip Phase 0 entirely**. Announce the resume point (handled by the Setup section above) and jump to the gate matching `current_subphase`.
- If state shows `in-progress` but `architecture.md` is missing OR its frontmatter is unreadable: **HALT** and ask the user — the artefact and state diverged (likely manual deletion or a crashed write). Do not silently re-initialise; offer "[R]estart Phase 0 (loses recorded subphases)" or "[A]bort and let the user restore architecture.md from VCS". Wait for explicit choice.
- If state has no `architecture` entry yet: proceed with steps 1–3 below.

### Steps (only when no `in-progress` state exists)

1. If `{{OUTPUT_DIR}}/architecture.md` does **not** already exist, write the skeleton below to it (Write tool).
2. Initialise `pipeline.phases.architecture` in `{{OUTPUT_DIR}}/state.yaml`:
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
3. Confirm to the user: "Architecture tracking initialised — `architecture.md` skeleton written, state advanced to `current_subphase: context-analysis`."

### `architecture.md` skeleton

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
---

# Architecture — {{project_name}}

> Built incrementally by `/aped-arch`. Sections fill as each subphase is validated.

## Phase 1 — Context Analysis

<!-- Populated after Phase 1 gate: extracted FRs/NFRs, scale, integration points, compliance signals, requirement tensions. -->

## Phase 2 — Technology Decisions

<!-- One subsection per category; each filled after its own user validation. -->

### Data Layer

### Authentication & Security

### API Design

### Frontend

### Infrastructure

## Phase 2b — Council Dispatches

<!-- Optional. One subsection per major decision dispatched: framing, specialist verdicts table, areas of consensus / disagreement, final pick + rationale, minority view (kept as future-pivot signal). -->

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

<!-- Coherence checklist results + flagged gaps. -->
```

## Phase 1: Context Analysis

Analyze loaded documents for architectural implications:
- Extract FRs and NFRs that drive architectural choices
- Identify scale requirements (users, data volume, throughput)
- Note integration points (external APIs, services)
- Flag compliance/security constraints

Present findings to user:
- "Here's what the PRD implies architecturally..."
- Highlight any tensions between requirements

⏸ **GATE: User validates the context analysis.**

After validation, run the **Incremental Tracking Contract** writes: append the validated context analysis under `## Phase 1 — Context Analysis` in `architecture.md`, advance frontmatter `current_subphase` → `technology-decisions`, push `context-analysis` to `completed_subphases`, mirror in `state.yaml`.

## Phase 2: Technology Decisions

Work through each category collaboratively. For each, present options with trade-offs and let the user decide:

### Data Layer
- Database type and choice (SQL, NoSQL, graph...)
- ORM/query builder
- Caching strategy
- Data validation approach

### Authentication & Security
- Auth strategy (session, JWT, OAuth, passkeys...)
- Authorization model (RBAC, ABAC...)
- Secrets management
- CORS / rate limiting

### API Design
- Architecture style (REST, GraphQL, tRPC, gRPC...)
- API versioning strategy
- Error handling conventions
- Pagination pattern

### Frontend
- Framework and rendering strategy (SSR, SPA, hybrid...)
- State management
- Component library / design system
- Form handling and validation

### Infrastructure
- Hosting and deployment (serverless, containers, PaaS...)
- CI/CD pipeline
- Monitoring and logging
- Environment strategy (dev, staging, prod)

For each category:
1. Present 2-3 options with pros/cons
2. Make a recommendation with rationale
3. User decides
4. **Record the decision in place** — append it to its `### {Category}` subsection inside `## Phase 2 — Technology Decisions` of `architecture.md` immediately, before moving on. Do not buffer.
5. Bump `last_updated` in the frontmatter (no subphase advance until the full Phase 2 gate clears).

⏸ **GATE: User validates all technology decisions.**

After validation, run the **Incremental Tracking Contract** writes: confirm all five `### {Category}` subsections are populated, advance frontmatter `current_subphase` → `council-dispatches` (or directly → `implementation-patterns` if no Council needed), push `technology-decisions` to `completed_subphases`, mirror in `state.yaml`.

## Phase 2b: Architecture Council (for major decisions)

**When to invoke:** For any decision in Phase 2 flagged as **high stakes** — the kind that would cost weeks to reverse later (primary database choice, auth model, API paradigm, frontend framework, infra platform). Skip for low-stakes choices (e.g., a logging library).

The Council is a parallel subagent dispatch via the `Agent` tool. Each specialist thinks independently — no shared context, no convergence pressure — and produces a genuine divergent perspective. You orchestrate, the user decides.

### Council Roster (pick 3-4 for each major decision)

**Winston — Systems Architect** (always include)
> `subagent_type: Explore`. Persona: "Boring tech for MVP. Cleverness costs operationally." Focus: scalability, reliability, operational burden, known failure modes.

**Lena — Pragmatic Engineer**
> `subagent_type: Explore`. Persona: "What ships fastest without regret?" Focus: developer ergonomics, iteration speed, ecosystem maturity, hiring pool.

**Raj — Security & Compliance Reviewer**
> `subagent_type: Explore`. Persona: "Assume breach. Assume audit." Focus: threat model, data flows, compliance gaps (GDPR, HIPAA, SOC2 as applicable), supply chain risk.

**Nina — Cost & Ops Analyst**
> `subagent_type: Explore`. Persona: "What does this cost at 10× scale? And when does it page us at 3am?" Focus: unit economics, operational cadence, lock-in, migration cost.

**Maya — Edge Case Hunter**
> `subagent_type: Explore`. Persona: "Where does this break?" Focus: boundary conditions, failure modes, unusual use cases the PRD doesn't mention but will appear.

### Dispatch Pattern

1. Frame the decision in one paragraph with the candidate options (e.g., "Primary database: Postgres vs FoundationDB vs managed DynamoDB. PRD context: {summary}. NFR context: {summary}.")
2. Dispatch the selected specialists **in a single message, parallel**, via `Agent` tool calls. Each gets:
   - Their persona (as above)
   - The decision framing
   - The candidate options
   - The relevant PRD / NFR excerpts
3. Each specialist returns a structured verdict: **preferred option**, **one-line rationale**, **top 2 risks**, **disqualifying conditions**.
4. You (the orchestrator) merge the reports — present to the user:
   - Summary table: specialist × option × verdict
   - Areas of consensus
   - Areas of genuine disagreement (these are the important ones)
   - Your own synthesized recommendation with rationale

⏸ **GATE: User reviews the Council verdicts and picks the final option.**

After validation, run the **Incremental Tracking Contract** writes: append the council framing, the specialist verdicts table, consensus/disagreement areas, the final pick + rationale, and the minority view (signal for future pivots) under a new `### {Decision name}` subsection of `## Phase 2b — Council Dispatches`. Bump `last_updated`. Do **not** advance `current_subphase` until *all* major decisions have been dispatched; only then push `council-dispatches` to `completed_subphases` and advance to `implementation-patterns`. Mirror in `state.yaml`.

### When to Re-Dispatch

- All specialists agreed on the weakest option: something is wrong with the framing — re-dispatch with sharpened options
- Specialists split 50/50 with equally strong arguments: user must decide based on values, not technical merit — present both paths, let user pick
- A specialist returned a thin report (<3 sentences on rationale): that specialist didn't engage — re-dispatch with clarified framing

### Escape Hatch

For truly MVP-scale decisions where the Council would be overkill, skip Phase 2b and proceed directly to Phase 3. Document in the architecture that the decision was made without Council — this flags it for reconsideration in a later retrospective.

## Phase 3: Implementation Patterns

Define conventions that ensure consistency across agents and stories:

### Naming Conventions
- Files and directories (kebab-case, camelCase...)
- Components, functions, variables
- Database tables, columns
- API endpoints

### Code Structure
- Project directory tree (full layout)
- Module/layer boundaries (where does business logic live?)
- Import conventions
- Test file locations and naming

### Communication Patterns
- Error format (how errors flow from DB to API to UI)
- Logging format and levels
- Event/message patterns (if applicable)

### Process Rules
- Branch naming convention
- Commit message format
- PR/MR requirements
- Required test coverage level

Present each category. Discuss with user. **Record each decision in its `### {Pattern}` subsection of `## Phase 3 — Implementation Patterns` immediately**, not at the end.

⏸ **GATE: User validates patterns.**

After validation, run the **Incremental Tracking Contract** writes: confirm all four pattern subsections are populated, advance `current_subphase` → `structure-mapping`, push `implementation-patterns` to `completed_subphases`, mirror in `state.yaml`.

## Phase 4: Structure & Mapping

Create the concrete project structure:

1. **Directory tree** — full project layout with annotations
2. **FR → File mapping** — which FRs are implemented where
3. **Integration boundaries** — where external systems connect
4. **Shared code inventory** — utilities, types, constants that multiple features share

Present to user for review. Populate the four `## Phase 4 — Structure & Mapping` subsections of `architecture.md` as each is validated.

⏸ **GATE: User validates structure.**

After validation, run the **Incremental Tracking Contract** writes: advance `current_subphase` → `validation`, push `structure-mapping` to `completed_subphases`, mirror in `state.yaml`.

## Phase 5: Validation + final A/C gate

Check coherence:
- [ ] All technology decisions work together (no conflicts)
- [ ] Every FR/NFR from PRD has a clear implementation path
- [ ] Security requirements are addressed
- [ ] Scale requirements are supported by chosen stack
- [ ] No orphan decisions (every choice connects to a requirement)

Present validation results. Flag any gaps.

Then present the final A/C menu — this is the last chance to stress-test the architecture before downstream skills (`/aped-epics`, `/aped-dev`, `/aped-review`) treat it as LAW:

```
Architecture document ready ({K} decisions, {N} council dispatches, {V} validation gaps).

Choose your next move:
[A] Advanced elicitation — invoke /aped-elicit on the full architecture doc
    (Pre-mortem: "1 year from now this architecture is regretted, why?";
    Red Team vs Blue Team on security; Tree of Thoughts on the riskiest decision)
[C] Continue — accept the architecture, write architecture.md, update state.yaml
[Other] Direct correction — point at a specific decision; I revisit it (and re-dispatch
        the Council if it's a major one), then redisplay this menu
```

⏸ **HALT — wait for the user's choice. Council was for divergent specialist input on major decisions; this final `[A]` is for adversarial pressure on the doc as a whole. Both serve different purposes.**

## Self-review (run before finalisation)

Before flipping `architecture.md` to `done`, walk this checklist. Each `[ ]` must flip to `[x]` or HALT.

- [ ] **Placeholder lint** — run `bash {{APED_DIR}}/scripts/lint-placeholders.sh {{OUTPUT_DIR}}/architecture.md`.
- [ ] **FR implementation paths** — every PRD FR is mentioned somewhere in `architecture.md` with a clear implementation surface (file/module/component).
- [ ] **No conflicting decisions** — Phase 2 categories (data, auth, API, frontend, infra) work together; no contradictions (e.g. `tRPC` + `gRPC` simultaneously without justification).
- [ ] **Council minority views recorded** — every Council dispatch in Phase 2b includes the minority view in `architecture.md` (it's signal for future pivots).
- [ ] **Frontmatter coherent** — `current_subphase` is `validation` (about to flip to `done`); `completed_subphases` lists all five phases that actually ran.

## Output (finalisation only)

By the time you reach this step, `architecture.md` is **already** fully populated by the per-gate appends. This step is a **finalisation**, not a regeneration.

1. Populate `## Phase 5 — Validation` with the coherence checklist results from Phase 5.
2. Bump the architecture frontmatter:
   - `current_subphase: done`
   - push `validation` onto `completed_subphases`
   - `last_updated: <ISO 8601 now>`
3. Update `{{OUTPUT_DIR}}/state.yaml` under `pipeline.phases.architecture` with the structured fields below. The Council/ADR lists are populated **incrementally** across the phases (each new dispatch appends; each ADR write appends) — at finalisation, you only need to confirm they're present and accurate.
   ```yaml
   pipeline:
     current_phase: "architecture"
     phases:
       architecture:
         status: "done"
         current_subphase: "done"
         # completed_subphases reflects what actually ran. Include
         # `council-dispatches` only if at least one major decision was
         # routed through the Council. If Phase 2b was skipped wholesale,
         # this entry is omitted.
         completed_subphases: [context-analysis, technology-decisions, implementation-patterns, structure-mapping, validation]
         output: "{{OUTPUT_DIR}}/architecture.md"
         last_updated: "<ISO 8601 now>"
         mode: "interactive"            # interactive | headless
         councils_dispatched:
           # One entry per Phase 2b dispatch. Append as each Council runs.
           - id: "D1"                   # sequential per arch run
             subject: "<one-line decision name>"
             specialists: ["winston", "lena", "raj", ...]
             verdict: "<final pick + 1-line rationale>"
         adrs:
           # One entry per ADR written under docs/adr/ (or wherever the
           # arch decision-record convention puts them).
           - id: "ADR-001"
             subject: "<one-line subject>"
             path: "docs/adr/001-<slug>.md"
             author: "<persona/specialist or human>"
         watch_items: <int>             # count from architecture.md §6 (W1..Wn)
         residual_gaps: <int>           # count from architecture.md §7 (G1..Gn)
         epic_zero_stories: <int>       # count from architecture.md §8 (E0.1..E0.n)
   ```

### Field derivation

- **`mode`** — `interactive` if the user ran with the default A/P/C-style gating; `headless` if a `--headless` / `-H` flag was passed (autonomous straight-through). Downstream tooling reads this to know whether human gating actually happened.
- **`councils_dispatched`** — populated incrementally as each Phase 2b Council runs. Each entry: `id` (sequential, `D1`, `D2`, …), `subject` (the decision being arbitrated), `specialists` (lowercase persona names from the roster), `verdict` (final pick + 1-line rationale). Append on each Council; never rewrite past entries.
- **`adrs`** — populated as ADRs are written. Each entry: `id` (`ADR-001`, …), `subject`, `path` (relative to project root), `author` (specialist persona name or human). Append on each ADR.
- **`watch_items`** — count of W-items in `architecture.md` §6 (Watch Items / risks tracked across the lifecycle). Compute at finalisation.
- **`residual_gaps`** — count of G-items in `architecture.md` §7 (Residual Gaps the architecture knowingly leaves open). Compute at finalisation.
- **`epic_zero_stories`** — count of E0.x stories in `architecture.md` §8 (Epic Zero / foundation stories the architecture surfaces for the first epic). Compute at finalisation.

If `architecture.md` has no §6 / §7 / §8, set the corresponding field to `0` — the field is mandatory but the value can be zero.

**Do not regenerate the architecture body**: if a section reads as incomplete at this stage, that means a subphase was skipped — go back and fill it in place rather than rewriting the whole document. A "regenerate from scratch at the end" approach is what this skill explicitly avoids: it loses the incremental write trail and is fragile under interruption.

## Example

PRD says: SaaS for restaurant inventory, 500 concurrent users, POS integration, HACCP compliance.

Phase 2 discussion:
- Data: "PostgreSQL — relational fits inventory domain, JSONB for flexible item attributes"
- Auth: "Supabase Auth + RLS — multi-tenant per restaurant"
- API: "tRPC — type-safe, fast iteration for SaaS MVP"
- Frontend: "Next.js App Router + shadcn/ui — SSR for SEO, RSC for performance"
- Infra: "Vercel + Supabase — zero-ops for MVP stage"

## Common Issues

- **User unsure about a choice**: Present the simplest option as default — "start with X, migrate to Y if needed"
- **Requirements conflict**: Flag it explicitly — "FR-12 wants real-time but NFR-3 wants minimal infra. Pick one."
- **Over-engineering**: For MVP, prefer boring tech. Save the clever architecture for v2.
- **Council specialists converge on the same answer**: that's valid signal — note it as unusually high consensus in `{{OUTPUT_DIR}}/architecture.md`. If the consensus feels suspicious, re-dispatch with a persona explicitly asked to steel-man the minority option.
- **Council dispatch fails or subagents unavailable**: fallback to a single-brain comparison with explicit trade-off table. Flag in `{{OUTPUT_DIR}}/architecture.md`: "Decision made without Council — revisit in next retro."
- **User wants to skip Council for every decision**: respect it, but document that the architecture was made single-brain. Future retros should catch weak spots.

## Next Step

Tell the user: "Architecture is ready. Run `/aped-epics` to create the epic structure."

**Do NOT auto-chain.** The user decides when to proceed.
