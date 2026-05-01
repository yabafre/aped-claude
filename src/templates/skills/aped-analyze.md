---
name: aped-analyze
keep-coding-instructions: true
description: 'Use when user says "research idea", "aped analyze", or invokes aped-analyze. Runs alongside aped-context — both can apply on hybrid projects (new feature in existing system).'
allowed-paths:
  write: ["{{OUTPUT_DIR}}/**", "{{APED_DIR}}/**"]
  read-only: ["src/**", "tests/**", "package.json"]
license: MIT
metadata:
  author: yabafre
  version: {{CLI_VERSION}}
---

# APED Analyze — Parallel Research to Product Brief

## On Activation

Before any other action, read `{{APED_DIR}}/config.yaml` and resolve:
- `{user_name}` — for greeting and direct address
- `{communication_language}` — for ALL conversation with the user
- `{document_output_language}` — for artefacts written under `{{OUTPUT_DIR}}/`
- `{ticket_system}` / `{git_provider}` — routing for ticket / PR I/O (skip if `none`)

✅ YOU MUST speak `{communication_language}` in every message to the user.
✅ YOU MUST write artefact content in `{document_output_language}`.
✅ If `{{APED_DIR}}/config.yaml` is missing or unreadable, HALT and tell the user to run `npx aped-method`.

## Critical Rules

- NEVER skip Discovery — research quality depends on clear, detailed inputs
- NEVER proceed to the next step without explicit user validation
- ALL 3 agents must complete before synthesis — do not proceed with partial results
- Take your time with synthesis — quality is more important than speed
- Do not skip validation steps

## Guiding Principles

### 1. Discovery Is the Foundation
The quality of the entire pipeline depends on how well the project is understood upfront. A vague brief produces a vague PRD, which produces vague stories. Invest time here — it pays for itself 10x downstream.

### 2. Help the User Think, Don't Just Ask
Many users know what they want but struggle to articulate it clearly. Your job is to guide them through structured thinking — probe deeper on vague answers, suggest angles they haven't considered, and reflect back what you understood so they can correct it.

### 3. Research Informs, User Decides
The 3 research agents bring data. The user brings vision and judgment. Present research findings clearly, highlight conflicts or surprises, and let the user make the final call on scope and direction.

## Input Discovery

Before any work, discover and load upstream APED artefacts that exist. This skill is consume-everything-found: don't ask the user to declare greenfield/brownfield, sniff for it.

### 1. Glob discovery

Search these locations in order:
- `{{OUTPUT_DIR}}/**`
- `{{APED_DIR}}/**`
- `docs/**` (project root)

Look for these artefacts (none required for `aped-analyze` — it's an entry-point skill):
- Product Brief — `*brief*.md` or `product-brief.md`
- Project Context — `*context*.md` or `project-context.md`
- Research — `*research*.md`

For sharded folders (folder with `index.md` + multiple files), load the index first, then all files referenced.

### 2. Required-input validation

None — `aped-analyze` is an entry-point. It runs with or without prior artefacts.

### 3. Load + report

- Load every discovered file completely (no offset/limit).
- Brownfield/greenfield is detected, not declared:
  - `project-context.md` found → brownfield mode
  - otherwise → greenfield mode

Present a discovery report to the user (adapt to `communication_language`):

> Welcome {user_name}! Setting up `aped-analyze` for {project_name}.
>
> **Documents discovered:**
> - Product Brief: {N} files {✓ loaded — will refine | (none — fresh analysis)}
> - Project Context: {N} files {✓ loaded (brownfield mode) | (none — greenfield)}
> - Research: {N} files {✓ loaded — will inform agents | (none)}
>
> **Files loaded:** {comma-separated filenames or "none"}
>
> {if brownfield} 📋 Brownfield mode: existing project context loaded. Discovery questions will assume an existing system to extend, and the 3 research agents will receive the context as input. {/if}
>
> Anything else to include before we proceed?
>
> [C] Continue with these documents
> [Other] Add a file path / paste content — I'll load it and redisplay

⏸ **HALT — wait for `[C]` or additional inputs. This is a light confirmation, not a heavy gate.**

### 4. Bias the rest of the workflow

Loaded artefacts inform every subsequent phase of this skill:
- In Discovery rounds, skip questions already answered by loaded docs (e.g. if a brief states the target user, don't re-ask it — confirm and probe deeper).
- In brownfield mode, frame Discovery as "what's *new* relative to the existing system" rather than "what are we building from scratch".
- Pass loaded artefacts to the 3 research agents (Mary / Derek / Tom) as input context so their research builds on existing analysis instead of duplicating it.

## Setup

1. Read `{{OUTPUT_DIR}}/state.yaml` — check `pipeline.phases.analyze`
   - If status is `done`: ask user — redo analysis or skip to next phase?
   - If user skips: stop here (user will invoke next phase manually)

## Phase 1: Guided Discovery

This is a **conversation**, not a questionnaire. Adapt to `communication_language`. Ask one category at a time, wait for the answer, then ask follow-ups based on what the user said. Do NOT dump all questions at once.

Each round below ends with a **catch-all** prompt — *"Anything else about {topic} you want to mention before we move on?"* — and a ⏸ HALT. Don't auto-progress; wait for the user to either add detail or say they're done. This catches the side observations (an unstated must-have, a stakeholder constraint, a personal anecdote) that BMAD's "capture-don't-interrupt" pattern is built around.

### Round 1 — The Vision
Start with the big picture. Ask:
- **What are we building?** — The product/service in the user's own words
- **What problem does it solve?** — The specific pain point, not a generic category
- **What exists today?** — How do people currently solve this problem (even imperfectly)?

Listen to the answers. If they're vague ("a platform for X"), probe:
- "Can you walk me through a specific scenario where a user would use this?"
- "What's the most frustrating thing about the current alternatives?"

⏸ **Catch-all:** "Anything else about the vision or the problem space you want to mention before we move to users?" Wait for response. Capture; don't redirect.

### Round 2 — The Users
Once the vision is clear, dig into the audience:
- **Who is the primary user?** — Role, context, technical level
- **Who pays?** — Sometimes the user and the buyer are different
- **What does success look like for them?** — What outcome makes them come back?

Probe deeper if needed:
- "Is this for individuals or teams? Small businesses or enterprise?"
- "What's their budget sensitivity? Is this a must-have or a nice-to-have?"

⏸ **Catch-all:** "Any other detail about the users — secondary personas, anti-patterns, a specific person you're building this for — before we move to constraints?"

### Round 3 — The Constraints
Now understand the boundaries:
- **Why now?** — Market timing, technology enabler, competitive gap
- **What's the MVP scope?** — If you had to launch in 2 weeks, what's the one thing it MUST do?
- **Any technical constraints?** — Platform preferences, existing systems to integrate with, compliance needs

⏸ **Catch-all:** "Any other constraint — budget, deadline, team capacity, an existing tool you must integrate with — before we summarise?"

### Round 4 — Validation
Summarize what you understood back to the user in a structured format:
- **Product:** one-line description
- **Problem:** the pain point
- **Users:** primary audience
- **MVP core:** the one essential feature
- **Constraints:** platform, integrations, compliance

Then present the A/C menu:

```
Discovery summary ready. Choose:
[A] Advanced elicitation — invoke aped-elicit on the summary
    (Socratic / Pre-mortem / Devil's Advocate to surface blind spots before research)
[C] Continue — accept the summary, dispatch parallel research (Mary / Derek / Tom)
[Other] Direct correction — type changes; I'll apply and redisplay
```

⏸ **HALT — wait for the user's choice. Do NOT dispatch research before `[C]` is selected.**

## Phase 2: Parallel Research

### Task Tracking

```
TaskCreate: "Parallel research — Market, Domain, Technical"
TaskCreate: "Present research findings to user"
TaskCreate: "Synthesize into product brief"
TaskCreate: "Validate brief with user"
```

Read `{{APED_DIR}}/aped-analyze/references/research-prompts.md` for detailed agent prompts.

Launch **3 Agent tool calls in a single message** (parallel execution) with `run_in_background: true`.

Each agent has a persona — include it in the prompt to keep them in character.

### Agent 1: Market Research — **Mary**, Strategic Business Analyst — "Show me the data, not opinions."
- `subagent_type: "Explore"`
- Customer behavior and pain points in the target segment
- Competitive landscape: direct and indirect competitors (names, pricing, strengths, weaknesses)
- Market size and growth trajectory
- Pricing models and monetization patterns in the space
- Use WebSearch for current data

### Agent 2: Domain Research — **Derek**, Domain Expert, industry veteran — "I know where the bodies are buried."
- `subagent_type: "Explore"`
- Industry analysis and key trends
- Regulatory requirements and compliance needs
- Technical trends shaping the domain
- Standards, certifications, and legal requirements
- Use WebSearch for current data

### Agent 3: Technical Research — **Tom**, Technical Architect, pragmatist — "Boring tech for MVP. Cleverness costs."
- `subagent_type: "Explore"`
- Technology stack options with trade-offs
- Integration patterns and APIs available
- Architecture patterns for similar products
- Open-source tools and frameworks relevant
- Use WebSearch for current data

Once every parallel research agent (Mary, Derek, Tom) returns, update task: `TaskUpdate: "Parallel research" → completed`

## Phase 3: Research Review

**Present the research findings to the user** in a structured summary:
- Key competitors found and how they compare
- Market size and opportunity
- Regulatory or compliance concerns discovered
- Recommended technical approach and why
- Any surprises or conflicts between research areas

Highlight anything that might change the user's original vision:
- "Research shows the market is more crowded than expected — here are 3 direct competitors..."
- "There's a compliance requirement you may not have considered..."
- "The technical approach X is more mature than Y for this use case..."

⏸ **GATE: Ask the user if the research changes their vision. Wait for confirmation before synthesizing.**

## Phase 4: Synthesis

Ensure output directory exists:
```bash
mkdir -p {{OUTPUT_DIR}}
```

1. Fuse discovery answers + research results into a product brief
2. Use template from `{{APED_DIR}}/templates/product-brief.md`
3. Fill every section: Executive Summary, Core Vision, Target Users, Success Metrics, MVP Scope
4. Write output to `{{OUTPUT_DIR}}/product-brief.md`

### Spec self-review

After writing the brief, look at it with fresh eyes — this is an inline checklist you run yourself, not a subagent dispatch. Fix any issues inline; no need to re-review.

1. **Placeholder lint:** run `bash {{APED_DIR}}/scripts/lint-placeholders.sh {{OUTPUT_DIR}}/product-brief.md`. Exit 0 = pass.
2. **Market/domain/tech findings consistent:** the three subagent outputs do not contradict each other. "Low competition" from Mary alongside "saturated tooling" from Tom is a contradiction — surface it explicitly or reconcile.
3. **Evidence quality:** every claim is backed by at least one cited source from the research outputs, or is explicitly labelled "no evidence found — assumption to validate".
4. **Scope of product unambiguous:** one sentence in the Executive Summary answers "what is it?" without hedging. If the answer is two products, split or pick one.
5. **Non-falsifiable claims removed:** statements like "users will love it" or "scales effortlessly" are deleted or reframed as falsifiable hypotheses tied to a Success Metric.

If you find issues, fix them inline. No need to re-review — just fix and move on.

### Spec-reviewer dispatch

After the inline self-review passes, dispatch a fresh subagent to review the brief **before** the user gate. The reviewer's job is to verify the brief is complete, consistent, and ready for `aped-prd` planning.

Use the `Agent` tool (`subagent_type: "general-purpose"`) with this verbatim prompt (substitute `[ARTEFACT_FILE_PATH]` with the actual path of `product-brief.md` just written):

```
You are a spec document reviewer. Verify this product brief is complete and ready for planning.

**Spec to review:** [ARTEFACT_FILE_PATH]

## What to Check

| Category | What to Look For |
|----------|------------------|
| Completeness | TODOs, placeholders, "TBD", missing required sections, uncited key claims |
| Consistency | Contradictions between market, domain, and tech research findings |
| Clarity | Scope statements that could describe two different products |
| Evidence | Claims without cited sources or "no evidence found" disclaimers |
| YAGNI | Non-falsifiable assertions, marketing language, unbounded ambition |

## Calibration

**Only flag issues that would cause real problems for `aped-prd` planning.**
Inconsistencies between market and tech findings (e.g. "low competition" +
"saturated tooling"), weak evidence backing key claims, or non-falsifiable
assertions — those are issues. Subjective interpretations of market opportunity
are not.

Approve unless there are serious gaps that would lead to a flawed PRD.

## Output Format

## Spec Review

**Status:** Approved | Issues Found

**Issues (if any):**
- [Section X]: [specific issue] - [why it matters for planning]

**Recommendations (advisory, do not block approval):**
- [suggestions for improvement]
```

When the reviewer returns:
- **Status: Approved** — proceed to the user gate. Surface the recommendations (advisory) but do not block on them.
- **Status: Issues Found** — fix the flagged issues inline (or `[O]verride` with a recorded reason if a flag is wrong), then re-dispatch the same reviewer once. If the second pass also returns issues, HALT and present the issues to the user for adjudication before handing off.

## Phase 5: Validation

```bash
bash {{APED_DIR}}/aped-analyze/scripts/validate-brief.sh {{OUTPUT_DIR}}/product-brief.md
```

If validation fails: fix missing sections and re-validate.

**Present the completed brief to the user.** Summarize every section of the brief and ask:
- "Does this accurately capture your project?"
- "Anything to add, remove, or change?"

⏸ **GATE: Do NOT update state until the user explicitly approves the brief.**

If user requests changes: apply them, re-validate, re-present.

## Self-review (run before user gate)

Before presenting the brief to the user for approval, walk this checklist. Each `[ ]` must flip to `[x]` or HALT. If the lint exits 1, present its output verbatim and ask `[F]ix` / `[O]verride (record reason)`.

- [ ] **Placeholder lint** — run `bash {{APED_DIR}}/scripts/lint-placeholders.sh {{OUTPUT_DIR}}/product-brief.md`. Exit 0 = pass.
- [ ] **All 3 research outputs cited** — Mary (market), Derek (domain), and Tom (technical) findings each appear in the brief with attribution.
- [ ] **Required sections present** — Executive Summary, Core Vision (Goals), Target Users, Success Metrics, MVP Scope (Constraints) are all populated with real prose.
- [ ] **User-facing summary written** — the Executive Summary answers "what is it" in one sentence and "why now" in one sentence.
- [ ] **Spec-reviewer dispatched** — reviewer returned Approved (or [O]verride recorded).

## State Update

Only after user approval:

Update `{{OUTPUT_DIR}}/state.yaml` (create the file if it doesn't exist; this is the first phase that writes it):

```yaml
schema_version: 1
pipeline:
  current_phase: "analyze"
  phases:
    analyze:
      status: "done"
      output: "{{OUTPUT_DIR}}/product-brief.md"
```

**`schema_version`** is mandatory at the top level. Subsequent skills (sync-state.sh, validate-state.sh, sprint-dispatch.sh marker writer) read it and refuse to run on unknown versions — bumps require an explicit migration. Current version: 1.

## Next Step

Tell the user: "Product brief is ready. When you're ready, run `aped-prd` to generate the PRD."

**Do NOT auto-chain.** The user decides when to proceed.

## Example

User says: "I want to build a SaaS for restaurant inventory management"
1. Discovery Round 1: "What specific problem? Manual counting? Waste tracking? Supplier ordering?"
2. User clarifies: "Waste tracking — restaurants throw away too much and don't know why"
3. Discovery Round 2: "Who uses it? Kitchen manager? Owner? Both?" → user answers
4. Discovery Round 3: "Any POS system to integrate with? Compliance needs?" → user answers
5. Discovery Round 4: summary → user confirms
6. Launch 3 agents: market, domain, technical
7. Present findings: "Found 2 direct competitors (FoodWaste Pro, KitchenTrack)..."
8. User confirms direction
9. Synthesize → validate → present brief → user approves
10. "Run aped-prd when ready."

## Common Issues

- **User gives vague answers**: Don't accept "a platform for X." Probe with scenarios: "Walk me through a Tuesday morning for your target user."
- **Agent returns empty results**: WebSearch may fail — retry with different keywords, broaden search terms
- **Brief validation fails**: Check which section is missing, fill it from agent results, re-validate
- **User changes direction after research**: This is normal and expected. Update the discovery summary, re-run research if needed, re-synthesize.

## Completion Gate

BEFORE declaring this skill complete, Read `{{APED_DIR}}/skills/aped-skills/checklist-analyze.md` and verify every item. Do NOT skip this step. If any item is unchecked, you are NOT done.
