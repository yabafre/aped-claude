# Step 4: Phase 2 — Technology Decisions (5 categories)

## MANDATORY EXECUTION RULES (READ FIRST):

- 🛑 EVERY decision cites the PRD FR/NFR IDs it satisfies — no vibes
- 🛑 Record each decision in place IMMEDIATELY (do not buffer until end of phase)
- 🛑 For major decisions (DB, auth, API style, FE framework, infra), branch to step 05 (Council)

## CONTEXT BOUNDARIES

- Phase 1 validated and written.
- Brownfield context (if any) is the default for each category.

## YOUR TASK

Walk through the 5 technology categories collaboratively. Present options with trade-offs. Record each decision with FR/NFR citations as it's made.

## CATEGORIES

### Data Layer
- Database type and choice (SQL, NoSQL, graph, …).
- ORM/query builder.
- Caching strategy.
- Data validation approach.

### Authentication & Security
- Auth strategy (session, JWT, OAuth, passkeys, …).
- Authorization model (RBAC, ABAC, …).
- Secrets management.
- CORS / rate limiting.

### API Design
- Architecture style (REST, GraphQL, tRPC, gRPC, …).
- API versioning strategy.
- Error handling conventions.
- Pagination pattern.

### Frontend
- Framework and rendering strategy (SSR, SPA, hybrid).
- State management.
- Component library / design system.
- Form handling and validation.

### Infrastructure
- Hosting and deployment (serverless, containers, PaaS, …).
- CI/CD pipeline.
- Monitoring and logging.
- Environment strategy (dev, staging, prod).

## PER-CATEGORY LOOP

For each category:

1. **Present 2–3 options** with pros/cons.
2. **Make a recommendation** with rationale **citing the specific PRD FR/NFR IDs** the choice satisfies. Example:
   > Postgres recommended — satisfies NFR-3 (ACID), NFR-7 (relational analytics), FR-12 (audit log integrity).

   Decisions without FR/NFR citations are vibes, not architecture; surface that gap to the user instead of inventing one.
3. **User decides**.
4. **Record in place** — append the decision to its `### {Category}` subsection inside `## Phase 2 — Technology Decisions` of `architecture.md` IMMEDIATELY, before moving on. Do not buffer.
5. **Bump `last_updated` in frontmatter** (no subphase advance until full Phase 2 gate clears).

## MAJOR-DECISION ROUTING

For decisions flagged as **high-stakes** (kind that would cost weeks to reverse — primary database, auth model, API paradigm, frontend framework, infra platform):

→ **Branch to step 05 (Architecture Council)** before recording the decision.

The Council dispatches specialist subagents in parallel for divergent perspectives. Skip for low-stakes choices (e.g., a logging library).

## PHASE 2 GATE

⏸ **GATE: User validates ALL technology decisions.**

After validation, run the Incremental Tracking Contract writes:
- Confirm all 5 `### {Category}` subsections are populated.
- Advance `current_subphase` → `council-dispatches` (or directly → `implementation-patterns` if no Council needed).
- Push `technology-decisions` onto `completed_subphases`.
- Mirror in `state.yaml`.

## SUCCESS METRICS

✅ Each of the 5 categories has a decision with FR/NFR citations.
✅ Major decisions routed through step 05 before being recorded.
✅ All 5 subsections populated in architecture.md before the gate clears.

## FAILURE MODES

❌ Recommending a database without citing NFRs — that's a vibe.
❌ Buffering all 5 categories until the end and writing in bulk — defeats incremental tracking.
❌ Routing a low-stakes decision through Council — wastes specialist budget.

## NEXT STEP

If any major decisions are pending: load `{{APED_DIR}}/aped-arch/steps/step-05-council-dispatch.md`.
Else load `{{APED_DIR}}/aped-arch/steps/step-06-implementation-patterns.md`.
