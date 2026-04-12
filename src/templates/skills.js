export function skills(c) {
  const a = c.apedDir;   // .aped  (engine: skills, config, templates)
  const o = c.outputDir; // docs/aped (output: generated artifacts + state)
  return [
    // ── aped-analyze ──────────────────────────────────────────────
    {
      path: `${a}/aped-analyze/SKILL.md`,
      content: `---
name: aped-analyze
description: 'Analyzes a new project idea through parallel market, domain, and technical research. Use when user says "research idea", "aped analyze", or invokes /aped-analyze. Not for existing codebases — use aped-context for brownfield projects.'
license: MIT
metadata:
  author: yabafre
  version: ${c.cliVersion || '1.7.1'}
---

# APED Analyze — Parallel Research to Product Brief

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

## Setup

1. Read \`${a}/config.yaml\` — extract \`user_name\`, \`communication_language\`, \`ticket_system\`, \`git_provider\`
2. Read \`${o}/state.yaml\` — check \`pipeline.phases.analyze\`
   - If status is \`done\`: ask user — redo analysis or skip to next phase?
   - If user skips: stop here (user will invoke next phase manually)

## Phase 1: Guided Discovery

This is a **conversation**, not a questionnaire. Adapt to \`communication_language\`. Ask one category at a time, wait for the answer, then ask follow-ups based on what the user said. Do NOT dump all questions at once.

### Round 1 — The Vision
Start with the big picture. Ask:
- **What are we building?** — The product/service in the user's own words
- **What problem does it solve?** — The specific pain point, not a generic category
- **What exists today?** — How do people currently solve this problem (even imperfectly)?

Listen to the answers. If they're vague ("a platform for X"), probe:
- "Can you walk me through a specific scenario where a user would use this?"
- "What's the most frustrating thing about the current alternatives?"

### Round 2 — The Users
Once the vision is clear, dig into the audience:
- **Who is the primary user?** — Role, context, technical level
- **Who pays?** — Sometimes the user and the buyer are different
- **What does success look like for them?** — What outcome makes them come back?

Probe deeper if needed:
- "Is this for individuals or teams? Small businesses or enterprise?"
- "What's their budget sensitivity? Is this a must-have or a nice-to-have?"

### Round 3 — The Constraints
Now understand the boundaries:
- **Why now?** — Market timing, technology enabler, competitive gap
- **What's the MVP scope?** — If you had to launch in 2 weeks, what's the one thing it MUST do?
- **Any technical constraints?** — Platform preferences, existing systems to integrate with, compliance needs

### Round 4 — Validation
Summarize what you understood back to the user in a structured format:
- **Product:** one-line description
- **Problem:** the pain point
- **Users:** primary audience
- **MVP core:** the one essential feature
- **Constraints:** platform, integrations, compliance

**Ask the user to confirm or correct this summary before proceeding.**

⏸ **GATE: Do NOT proceed to research until the user explicitly validates the discovery summary.**

## Phase 2: Parallel Research

### Task Tracking

\`\`\`
TaskCreate: "Parallel research — Market, Domain, Technical"
TaskCreate: "Present research findings to user"
TaskCreate: "Synthesize into product brief"
TaskCreate: "Validate brief with user"
\`\`\`

Read \`${a}/aped-analyze/references/research-prompts.md\` for detailed agent prompts.

Launch **3 Agent tool calls in a single message** (parallel execution) with \`run_in_background: true\`:

### Agent 1: Market Research
- \`subagent_type: "Explore"\`
- Customer behavior and pain points in the target segment
- Competitive landscape: direct and indirect competitors (names, pricing, strengths, weaknesses)
- Market size and growth trajectory
- Pricing models and monetization patterns in the space
- Use WebSearch for current data

### Agent 2: Domain Research
- \`subagent_type: "Explore"\`
- Industry analysis and key trends
- Regulatory requirements and compliance needs
- Technical trends shaping the domain
- Standards, certifications, and legal requirements
- Use WebSearch for current data

### Agent 3: Technical Research
- \`subagent_type: "Explore"\`
- Technology stack options with trade-offs
- Integration patterns and APIs available
- Architecture patterns for similar products
- Open-source tools and frameworks relevant
- Use WebSearch for current data

Once all 3 agents return, update task: \`TaskUpdate: "Parallel research" → completed\`

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
\`\`\`bash
mkdir -p ${o}
\`\`\`

1. Fuse discovery answers + research results into a product brief
2. Use template from \`${a}/templates/product-brief.md\`
3. Fill all 5 sections: Executive Summary, Core Vision, Target Users, Success Metrics, MVP Scope
4. Write output to \`${o}/product-brief.md\`

## Phase 5: Validation

\`\`\`bash
bash ${a}/aped-analyze/scripts/validate-brief.sh ${o}/product-brief.md
\`\`\`

If validation fails: fix missing sections and re-validate.

**Present the completed brief to the user.** Summarize the 5 sections and ask:
- "Does this accurately capture your project?"
- "Anything to add, remove, or change?"

⏸ **GATE: Do NOT update state until the user explicitly approves the brief.**

If user requests changes: apply them, re-validate, re-present.

## State Update

Only after user approval:

Update \`${o}/state.yaml\`:
\`\`\`yaml
pipeline:
  current_phase: "analyze"
  phases:
    analyze:
      status: "done"
      output: "${o}/product-brief.md"
\`\`\`

## Next Step

Tell the user: "Product brief is ready. When you're ready, run \`/aped-prd\` to generate the PRD."

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
10. "Run /aped-prd when ready."

## Common Issues

- **User gives vague answers**: Don't accept "a platform for X." Probe with scenarios: "Walk me through a Tuesday morning for your target user."
- **Agent returns empty results**: WebSearch may fail — retry with different keywords, broaden search terms
- **Brief validation fails**: Check which section is missing, fill it from agent results, re-validate
- **User changes direction after research**: This is normal and expected. Update the discovery summary, re-run research if needed, re-synthesize.
`,
    },
    // ── aped-prd ──────────────────────────────────────────────
    {
      path: `${a}/aped-prd/SKILL.md`,
      content: `---
name: aped-prd
description: 'Generates PRD autonomously from product brief. Use when user says "create PRD", "generate PRD", "aped prd", or invokes /aped-prd.'
license: MIT
metadata:
  author: yabafre
  version: ${c.cliVersion || '1.7.1'}
---

# APED PRD — Autonomous PRD Generation

## Critical Rules

- EVERY FR must follow format: \`FR#: [Actor] can [capability]\` — no exceptions
- Take your time to generate quality FRs — 10-80 range, each independently testable
- Do not skip domain detection — it determines mandatory sections
- Quality is more important than speed — validate before writing

## Setup

1. Read \`${a}/config.yaml\` — extract \`user_name\`, \`communication_language\`, \`document_output_language\`
2. Read \`${o}/state.yaml\` — check pipeline state
   - If \`pipeline.phases.prd.status\` is \`done\`: ask user — redo PRD or skip?
   - If user skips: stop here (user will invoke next phase manually)

## Load Product Brief

- Read brief from path in \`pipeline.phases.analyze.output\`
- If no analyze phase in state: ask user for product brief path or content

## Domain & Project Type Detection

1. Read \`${a}/aped-prd/references/domain-complexity.csv\`
   - Match brief content against \`signals\` column
   - If match found: note \`complexity\`, \`key_concerns\`, \`special_sections\`
   - High-complexity domains (healthcare, fintech, govtech, etc.) — mandatory Domain Requirements section
2. Read \`${a}/aped-prd/references/project-types.csv\`
   - Match against \`detection_signals\`
   - Note \`required_sections\`, \`skip_sections\`, \`key_questions\`

## Task Tracking

Create tasks for each generation phase:
\`\`\`
TaskCreate: "P1: Foundation — Executive Summary & Vision"
TaskCreate: "P2: Scope & Journeys"
TaskCreate: "P3: Domain Requirements (conditional)"
TaskCreate: "P4: Functional & Non-Functional Requirements"
TaskCreate: "Validate PRD"
\`\`\`

Update each task to \`completed\` as you finish each phase.

## PRD Generation (4 compressed phases)

Generate the PRD autonomously using \`${a}/templates/prd.md\` as structure.

### P1: Foundation
- Executive Summary from brief's Core Vision
- Product vision and purpose statement

### P2: Scope & Journeys
- Success Criteria: User/Business/Technical/Measurable Outcomes
- Product Scope: MVP — Growth — Vision phases
- User Journeys: key end-to-end workflows

### P3: Domain Requirements (conditional)
- Only if domain-complexity detection flagged medium/high
- Include mandatory compliance, regulations, certifications from \`key_concerns\`
- Skip this section entirely for low-complexity/general domains

### P4: Requirements
- Functional Requirements (target 10-80 FRs)
  - Format: \`FR#: [Actor] can [capability] [context/constraint]\`
  - Group by capability area
  - Read \`${a}/aped-prd/references/fr-rules.md\` — validate quality
- Non-Functional Requirements (relevant categories only)
  - Format: \`The system shall [metric] [condition] [measurement method]\`

## Validation

\`\`\`bash
bash ${a}/aped-prd/scripts/validate-prd.sh ${o}/prd.md
\`\`\`

## Output & State

1. Write PRD to \`${o}/prd.md\`
2. Update \`${o}/state.yaml\`:
\`\`\`yaml
pipeline:
  current_phase: "prd"
  phases:
    prd:
      status: "done"
      output: "${o}/prd.md"
\`\`\`

## Next Step

Tell the user: "PRD is ready. Next options:"
- \`/aped-ux\` — Design UX (recommended for UI-heavy projects)
- \`/aped-arch\` — Define architecture decisions (recommended before epics)
- \`/aped-epics\` — Go straight to epics (if arch/UX not needed)

**Do NOT auto-chain.** The user decides when to proceed.

## Example

From a restaurant inventory brief → PRD generates:
- FR1: Manager can add inventory items with name, quantity, and unit
- FR2: Manager can set low-stock thresholds per item
- FR3: System can send alerts when stock falls below threshold
- NFR: The system shall respond to inventory queries within 200ms at p95

## Common Issues

- **FR count too low (<10)**: Brief may lack detail — re-read brief, extract implicit capabilities
- **Anti-pattern words detected**: Replace "easy" with step count, "fast" with time threshold
- **Validation script fails**: Run \`bash ${a}/aped-prd/scripts/validate-prd.sh ${o}/prd.md\` — fix reported issues one by one
`,
    },
    // ── aped-arch ───────────────────────────────────────────────
    {
      path: `${a}/aped-arch/SKILL.md`,
      content: `---
name: aped-arch
description: 'Collaborative architecture decisions for consistent AI implementation. Use when user says "create architecture", "technical architecture", "solution design", or invokes /aped-arch. Runs between PRD and Epics.'
license: MIT
metadata:
  author: yabafre
  version: ${c.cliVersion || '1.7.1'}
---

# APED Architecture — Collaborative Solution Design

Create architecture decisions through step-by-step discovery so that all downstream agents (dev, review, story) implement consistently. This is a **partnership** — you bring structured thinking, the user brings domain expertise and product vision.

## Critical Rules

- EVERY decision must have a rationale — no "just because" choices
- Architecture is NOT implementation — define WHAT and WHY, not the code
- Do NOT proceed to next section without user validation
- Decisions made here are LAW for /aped-dev and /aped-review

## Setup

1. Read \`${a}/config.yaml\` — extract config
2. Read \`${o}/state.yaml\` — check pipeline state
   - If \`pipeline.phases.architecture.status\` is \`done\`: ask user — redo or skip?
   - If user skips: stop here
3. Load input documents:
   - PRD from \`${o}/prd.md\` (required)
   - UX spec from \`${o}/ux/\` (if exists)
   - Product brief from \`${o}/product-brief.md\`

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
4. Record the decision

⏸ **GATE: User validates all technology decisions.**

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

Present each category. Discuss with user. Record decisions.

⏸ **GATE: User validates patterns.**

## Phase 4: Structure & Mapping

Create the concrete project structure:

1. **Directory tree** — full project layout with annotations
2. **FR → File mapping** — which FRs are implemented where
3. **Integration boundaries** — where external systems connect
4. **Shared code inventory** — utilities, types, constants that multiple features share

Present to user for review.

⏸ **GATE: User validates structure.**

## Phase 5: Validation

Check coherence:
- [ ] All technology decisions work together (no conflicts)
- [ ] Every FR/NFR from PRD has a clear implementation path
- [ ] Security requirements are addressed
- [ ] Scale requirements are supported by chosen stack
- [ ] No orphan decisions (every choice connects to a requirement)

Present validation results. Flag any gaps.

⏸ **GATE: User approves the architecture document.**

## Output

Write architecture document to \`${o}/architecture.md\`:
- Project Context Analysis
- Technology Decisions (with rationale for each)
- Implementation Patterns & Conventions
- Project Structure & FR Mapping
- Validation Results

Update \`${o}/state.yaml\`:
\`\`\`yaml
pipeline:
  current_phase: "architecture"
  phases:
    architecture:
      status: "done"
      output: "${o}/architecture.md"
\`\`\`

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

## Next Step

Tell the user: "Architecture is ready. Run \`/aped-epics\` to create the epic structure."

**Do NOT auto-chain.** The user decides when to proceed.
`,
    },
    // ── aped-epics ──────────────────────────────────────────────
    {
      path: `${a}/aped-epics/SKILL.md`,
      content: `---
name: aped-epics
description: 'Creates epic structure and story list from PRD. Does NOT create story files — use /aped-story for that. Use when user says "create epics", "break into stories", "aped epics", or invokes /aped-epics.'
license: MIT
metadata:
  author: yabafre
  version: ${c.cliVersion || '1.7.1'}
---

# APED Epics — Requirements Decomposition

## Critical Rules

- EVERY FR must map to exactly one epic — no orphans, no phantoms
- Epics describe USER VALUE, not technical layers — "User Authentication" not "Database Setup"
- This skill creates the PLAN, not the story files — \`/aped-story\` creates one story file at a time
- Quality is more important than speed — do not skip coverage validation

## Setup

1. Read \`${a}/config.yaml\` — extract config including \`ticket_system\`
2. Read \`${o}/state.yaml\` — check pipeline state
   - If \`pipeline.phases.epics.status\` is \`done\`: ask user — redo or skip?
   - If user skips: stop here (user will invoke next phase manually)

## Load PRD

- Read PRD from path in \`pipeline.phases.prd.output\`
- If no prd phase in state: ask user for PRD path
- Extract ALL FRs and NFRs by number

## Task Tracking

\`\`\`
TaskCreate: "Extract FRs and NFRs from PRD"
TaskCreate: "Design epics (user-value grouping)"
TaskCreate: "Define story list per epic"
TaskCreate: "FR coverage validation"
\`\`\`

## Epic Design

Read \`${a}/aped-epics/references/epic-rules.md\` for design principles.

### Core Rules

1. **User value first** — each epic delivers COMPLETE functionality for its domain
2. **Independent epics** — each stands alone, no forward dependencies
3. **User-outcome naming** — epic names describe what users can do
4. **Starter template rule** — if project needs scaffolding, Epic 1 Story 1 = project setup

### Story Listing (NOT story files)

For each epic, list the stories with:
- **Title** — what the story achieves (user-facing outcome)
- **Story key** — \`{epic#}-{story#}-{slug}\` (slug from title, lowercase, hyphens, max 30 chars)
- **Summary** — 1-2 sentences of scope
- **FRs covered** — which FR numbers this story addresses
- **Acceptance Criteria** — high-level Given/When/Then (will be refined in /aped-story)
- **Estimated complexity** — S / M / L

Do NOT create the detailed story files here. The user will run \`/aped-story\` to create each one individually before implementing it.

## Discussion with User

After designing the epics and story list, present them to the user:
- Show the epic structure with story titles
- Show the FR coverage map
- Discuss the ordering — does the user agree with the implementation sequence?
- Are any stories too large? Too granular?

⏸ **GATE: User must validate the epic structure and story list before proceeding.**

If user requests changes: adjust, re-validate, re-present.

## FR Coverage Map

Every FR from PRD mapped to exactly one epic. No orphans, no phantoms.

## Validation

\`\`\`bash
bash ${a}/aped-epics/scripts/validate-coverage.sh ${o}/epics.md ${o}/prd.md
\`\`\`

## Output

1. Write epics and story list to \`${o}/epics.md\`
2. Update \`${o}/state.yaml\` with sprint section (stories listed as \`pending\`) and pipeline phase
3. Do NOT create \`${o}/stories/\` files — that is \`/aped-story\`'s job

## Example

PRD with 25 FRs → 3 epics:
- Epic 1: "Users can manage inventory" (FR1-FR8)
  - 1-1-project-setup (S) — scaffold, deps, CI
  - 1-2-inventory-crud (M) — create/read/update/delete items
  - 1-3-search-filter (M) — search and filter inventory
  - 1-4-bulk-import (L) — CSV bulk import
- Epic 2: "Managers can monitor stock levels" (FR9-FR16, 3 stories)
- Epic 3: "System sends automated alerts" (FR17-FR25, 3 stories)

FR Coverage: FR1→1-1, FR2→1-2, FR3→1-2, ... (all mapped)

## Common Issues

- **Coverage validation fails**: Run \`validate-coverage.sh\` — lists orphan FRs
- **Epic too large**: Split by sub-domain — e.g., "User Auth" → "Registration" + "Sessions"
- **Forward dependencies**: If story B needs A, merge them or restructure

## Next Step

Tell the user: "Epics structure is ready. Run \`/aped-story\` to create the first story file, then \`/aped-dev\` to implement it."

**Do NOT auto-chain.** The user decides when to proceed.
`,
    },
    // ── aped-story ────────────────────────────────────────────
    {
      path: `${a}/aped-story/SKILL.md`,
      content: `---
name: aped-story
description: 'Creates a detailed story file for the next story to implement. Use when user says "create story", "prepare next story", "aped story", or invokes /aped-story.'
license: MIT
metadata:
  author: yabafre
  version: ${c.cliVersion || '1.7.1'}
---

# APED Story — Detailed Story Preparation

Create a single, implementation-ready story file with all the context needed for \`/aped-dev\`.

## Critical Rules

- Create ONE story at a time — the next one to implement
- The story file must be self-contained — everything the dev agent needs to implement
- Discuss the story with the user before finalizing — this is a collaborative process
- Quality of story definition determines quality of implementation

## Setup

1. Read \`${a}/config.yaml\` — extract config including \`ticket_system\`
2. Read \`${o}/state.yaml\` — find sprint stories
3. Read \`${o}/epics.md\` — load epic structure and story list

## Story Selection

Scan \`sprint.stories\` for the first story with status \`pending\` (no story file yet).
- If user specifies a story key: use that one instead
- If all stories have files: "All stories are prepared. Run \`/aped-dev\` to implement."
- Show the selected story's summary from epics.md

## Context Compilation

Before writing the story, gather context to make it rich and actionable:

1. **PRD** — read the relevant FRs for this story
2. **UX spec** — if exists, read relevant screens/components
3. **Previous stories** — read completed stories from the same epic for continuity
4. **Codebase** — if code exists, scan for relevant patterns, existing models, APIs

## Collaborative Story Design

Present a draft story to the user and discuss:

### Story Structure
- **Title** — user-facing outcome
- **As a** [role], **I want** [capability], **so that** [benefit]
- **Acceptance Criteria** — detailed Given/When/Then (refine from epics.md high-level ACs)

### Discussion Points (ask the user)
- "Does this scope feel right for one dev session?"
- "Any technical constraints I should know about?"
- "Should we split this differently?"
- "Any edge cases you're thinking about?"

⏸ **GATE: User must validate the story scope and ACs before the file is written.**

## Story File Creation

Use template \`${a}/templates/story.md\`. Fill every section:

### Required Sections
- **Header**: story key, epic, title, status (\`ready-for-dev\`)
- **User Story**: As a / I want / So that
- **Acceptance Criteria**: numbered, Given/When/Then format
- **Tasks**: checkboxes with AC references \`- [ ] task description [AC: AC#]\`
- **Dev Notes**: architecture guidance, file paths, dependencies, patterns to follow
- **File List**: expected files to create/modify

### Ticket Integration
If \`ticket_system\` is not \`none\`:
- Read \`${a}/aped-dev/references/ticket-git-workflow.md\`
- Add \`**Ticket:** {{ticket_id}}\`
- Add \`**Branch:** feature/{{ticket_id}}-{{story-slug}}\`
- Add commit prefix in Dev Notes

## Output

1. Write story file to \`${o}/stories/{story-key}.md\`
2. Update \`${o}/state.yaml\`: story status → \`ready-for-dev\`

## Example

User runs \`/aped-story\`:
1. Next pending story: 1-2-inventory-crud
2. Reads FR2, FR3 from PRD + inventory screen from UX spec
3. Presents draft: "CRUD for inventory items — 4 ACs, 6 tasks"
4. User: "Add an AC for duplicate item names"
5. Updates draft, user validates
6. Writes \`${o}/stories/1-2-inventory-crud.md\`
7. "Story ready. Run \`/aped-dev\` to implement."

## Common Issues

- **Story too large (>8 tasks)**: Split into two stories — discuss with user where to cut
- **Missing context from previous story**: Read the completed story file for decisions made
- **User wants to skip a story**: Mark as \`skipped\` in state.yaml, move to next
- **User wants to reorder stories**: Update state.yaml ordering, check for dependency issues

## Next Step

Tell the user: "Story file is ready at \`${o}/stories/{story-key}.md\`. Run \`/aped-dev\` to implement it."

**Do NOT auto-chain.** The user decides when to proceed.
`,
    },
    // ── aped-dev ──────────────────────────────────────────────
    {
      path: `${a}/aped-dev/SKILL.md`,
      content: `---
name: aped-dev
description: 'Implements next story with TDD red-green-refactor cycle. Use when user says "start dev", "implement story", "aped dev", or invokes /aped-dev.'
disable-model-invocation: true
license: MIT
metadata:
  author: yabafre
  version: ${c.cliVersion || '1.7.1'}
---

# APED Dev Sprint — TDD Story Implementation

## Critical Rules

- NEVER mark a task \`[x]\` without passing all 5 gate conditions
- ALWAYS write the failing test FIRST — no implementation without a RED test
- Take your time — quality is more important than speed
- Do not skip validation steps or test runs

## Guiding Principles

### 1. Understand Before You Code
Read the story, its ACs, and the existing code BEFORE writing anything. If the story references files, read them. If it mentions a pattern, find an existing example in the codebase. The most expensive mistake is building the wrong thing correctly.

### 2. Small Increments, Verified Progress
Each task is one RED→GREEN→REFACTOR cycle. Do not batch multiple tasks into one implementation pass. A task that touches more than 3 files is suspicious — it may need splitting. Commit after each GREEN gate, not at the end.

### 3. The Test Proves the Behavior, Not the Implementation
Write tests that assert WHAT the code does, not HOW it does it. \`expect(result).toBe(42)\` is good. \`expect(mockDb.query).toHaveBeenCalledWith("SELECT...")\` is fragile. Test the contract, not the wiring.

### 4. Existing Patterns Are Law
If the codebase uses a specific pattern (repository pattern, service layer, naming convention), follow it exactly — even if you know a "better" way. Consistency across the codebase matters more than local perfection. Deviate only if the story explicitly requires it.

### 5. Fail Fast, Ask Early
Three consecutive test failures on the same task means your approach is wrong, not that you need to try harder. HALT and ask the user. A 2-minute conversation saves 30 minutes of brute-forcing.

## Pre-Implementation Checklist

Before writing ANY code for a story, verify you can check every box. If you can't, go back and gather more context.

- [ ] Story file read — all ACs, tasks, and Dev Notes understood
- [ ] Existing code explored — files listed in Dev Notes are read and understood
- [ ] Dependencies identified — libraries needed are installed and documented
- [ ] Test strategy clear — you know WHERE to put tests and WHAT to assert for each AC
- [ ] No ambiguity — if anything is unclear, HALT and ask before proceeding
- [ ] Branch created — feature branch exists, clean working tree confirmed

## Setup

1. Read \`${a}/config.yaml\` — extract config including \`ticket_system\`, \`git_provider\`
2. Read \`${o}/state.yaml\` — find next story

## Story Selection

Scan \`sprint.stories\` top-to-bottom for first \`ready-for-dev\` story.
- If none found: report "All stories implemented or in review" and stop
- Check if story file exists at \`${o}/stories/{story-key}.md\`
  - If file missing: tell user "Story file not found. Run \`/aped-story\` first to prepare it." and stop
- Read story file
- Story key format: \`{epic#}-{story#}-{slug}\`

## Review Continuation Check

If story has \`[AI-Review]\` items: address them BEFORE regular tasks.

## State Update (start)

Update \`${o}/state.yaml\`: story — \`in-progress\`, epic — \`in-progress\` if first story.

## Task Tracking

Create a task for each story task checkbox:
\`\`\`
For each "- [ ] task description [AC: AC#]" in story:
  TaskCreate: "task description" (status: todo)
\`\`\`
Update each to \`in_progress\` when starting RED, \`completed\` when GATE passes.

## Epic Context Compilation

Before diving into the story, check if a cached context file exists for this epic:

**Cache path:** \`${o}/epic-{N}-context.md\` (where N = epic number from story key)

### If cache exists and is fresh
- Read it — skip compilation
- A cache is "fresh" if no stories in this epic have been completed since the cache was written
- Check: compare cache file mtime with the latest story completion timestamp in state.yaml

### If cache is missing or stale
Launch an Agent to compile the epic context:
- \`subagent_type: "Explore"\`
- \`run_in_background: false\` (need the result before proceeding)

The agent reads and compiles into a single \`epic-{N}-context.md\`:
1. **PRD excerpts** — FRs mapped to this epic (from \`${o}/prd.md\`)
2. **Architecture decisions** — relevant patterns and conventions (from \`${o}/architecture.md\` if exists)
3. **UX references** — screens and components for this epic (from \`${o}/ux/\` if exists)
4. **Completed stories** — implementation details and decisions from already-done stories in this epic (from \`${o}/stories/\`)
5. **Key code patterns** — scan the codebase for established patterns relevant to this epic

Write the compiled context to \`${o}/epic-{N}-context.md\`.

This compilation runs **once per epic** and is reused across all stories in the epic.

## Story Context Gathering

With epic context loaded, launch **2 Agent tool calls in parallel** for story-specific context:

### Agent 1: Code Context
- \`subagent_type: "Explore"\`
- Read story Dev Notes for architecture, file paths, dependencies
- Read existing code files mentioned in story
- Map the current state of files to modify

### Agent 2: Library Docs (if dependencies listed)
- \`subagent_type: "general-purpose"\`
- Use MCP context7 (\`resolve-library-id\` then \`query-docs\`) for libraries in Dev Notes
- Extract relevant API patterns and usage examples

## Frontend Detection & Visual Dev Loop

Before starting TDD, detect if this is a frontend story:
- Check if the story's File List contains \`.tsx\`, \`.jsx\`, \`.vue\`, \`.svelte\` files
- Check if \`${o}/ux/\` exists

**If frontend story:**
1. Ensure the dev server is running (\`npm run dev\` or equivalent)
2. Before writing any component, use \`mcp__react-grab-mcp__get_element_context\` to inspect the **root layout** — understand the existing component tree, props, and styles as baseline
3. After each GREEN pass on a UI task, use React Grab to inspect the implemented component:
   - Verify it renders correctly in the component tree
   - Compare with UX spec (\`${o}/ux/design-spec.md\`) — correct tokens, spacing, typography?
   - Check the component is properly nested in the layout hierarchy
4. If visual issues are found: fix before moving to REFACTOR

This is systematic — every frontend task gets a visual check at GREEN, not just at review time.

## TDD Implementation

Read \`${a}/aped-dev/references/tdd-engine.md\` for detailed rules.

For each task (update TaskUpdate to \`in_progress\` when starting):

### RED
Write failing tests first. Run: \`bash ${a}/aped-dev/scripts/run-tests.sh\`

### GREEN
Write minimal code to pass. Run: \`bash ${a}/aped-dev/scripts/run-tests.sh\`
**Frontend tasks:** after tests pass, use React Grab to verify the component renders correctly in the layout.

### REFACTOR
Improve structure while green. Run tests again.

### GATE
Mark \`[x]\` ONLY when: tests exist, pass 100%, implementation matches, ACs satisfied, no regressions.
**Frontend tasks:** add a 6th condition — React Grab visual check confirms component matches UX spec.

## HALT Conditions

**STOP and ask user if:** new dependency, 3 consecutive failures, missing config, ambiguity.

## Git & Ticket Workflow

Read \`${a}/aped-dev/references/ticket-git-workflow.md\` for full integration guide.

Read \`ticket_system\` and \`git_provider\` from \`${a}/config.yaml\`.

### Before Implementation
If \`ticket_system\` is not \`none\`:
1. Find the corresponding ticket/issue for this story
2. Move ticket status to **In Progress**
3. Create feature branch using ticket system's suggested name
4. Add a comment on the ticket: implementation plan

If \`ticket_system\` is \`none\`:
1. Create branch: \`feature/{story-key}\`

### During Implementation
- Include ticket ID in EVERY commit: \`type({ticket-id}): description\`
- Use magic words for auto-linking (see reference doc)
- NEVER use \`git add .\` — stage specific files only

### After Implementation
1. Push branch and create PR/MR (adapt to \`git_provider\`):
   - \`github\`: \`gh pr create --title "feat({ticket-id}): Story X.Y" --body "Fixes {ticket-id}"\`
   - \`gitlab\`: \`glab mr create --title "feat({ticket-id}): Story X.Y" --description "Closes {ticket-id}"\`
2. Move ticket to **In Review**

## Completion

1. Update story: mark tasks \`[x]\`, fill Dev Agent Record
2. Update \`${o}/state.yaml\`: story — \`review\`

## Next Step

Tell the user: "Story implementation complete. Run \`/aped-review\` to review, or \`/aped-dev\` to start the next story."

**Do NOT auto-chain.** The user decides when to proceed.

## Example

Story "1-2-user-registration":
1. RED: write test \`expect(register({email, password})).resolves.toHaveProperty('id')\` → fails
2. GREEN: implement \`register()\` → test passes
3. REFACTOR: extract validation → tests still pass
4. GATE: tests exist ✓, pass ✓, matches spec ✓, ACs met ✓, no regressions ✓ → mark \`[x]\`

## What NOT to Do

- **Don't implement without reading existing code first.** If the story says "add validation to UserService", read UserService top to bottom before touching it. Building on assumptions about code you haven't read produces conflicts and regressions.
- **Don't write tests after the implementation.** Tests written after are confirmation bias — they test what you built, not what you should have built. RED comes first, always.
- **Don't batch multiple tasks into one commit.** Each task = one RED→GREEN→REFACTOR cycle = one commit. Batching makes it impossible to bisect regressions and defeats the purpose of incremental progress.
- **Don't add dependencies silently.** Every new package is a HALT condition. The user decides, not you. Even "obvious" ones like a validation library.
- **Don't fight the test framework.** If tests are hard to write, your code is hard to test. Refactor the code, don't add complexity to the tests.
- **Don't \`git add .\`** — ever. Stage specific files. Accidental commits of \`.env\`, lockfile diffs, or debug files waste everyone's time.
- **Don't skip the GATE.** "Tests pass, good enough" is not a gate. All 5 conditions: tests exist, pass 100%, implementation matches spec, ACs satisfied, no regressions.
- **Don't brute-force failures.** 3 consecutive failures = wrong approach, not insufficient effort. HALT.

## Common Issues

- **Test framework not detected**: Ensure package.json has vitest/jest dependency, or use \`run-tests.sh\` manually
- **3 consecutive failures**: HALT — ask user. Do not brute-force; the approach may be wrong
- **Missing dependency**: HALT — ask user before installing. Do not add deps silently
- **Tests pass before writing code**: The test is wrong — it doesn't test new behavior. Rewrite it
`,
    },
    // ── aped-review ──────────────────────────────────────────────
    {
      path: `${a}/aped-review/SKILL.md`,
      content: `---
name: aped-review
description: 'Reviews completed stories adversarially with minimum 3 findings. Use when user says "review code", "run review", "aped review", or invokes /aped-review.'
disable-model-invocation: true
license: MIT
metadata:
  author: yabafre
  version: ${c.cliVersion || '1.7.1'}
---

# APED Review — Adversarial Code Review

## Critical Rules

- MINIMUM 3 findings — if you found fewer, you didn't look hard enough. Re-examine.
- NEVER skip the git audit — it catches undocumented file changes
- Take your time — thoroughness is more important than speed
- Do not rubber-stamp. Your job is to find problems, not to validate.

## Setup

1. Read \`${a}/config.yaml\` — extract config including \`git_provider\`
2. Read \`${o}/state.yaml\` — find first story with status \`review\`
   - If none: report "No stories pending review" and stop

## Load Story

Read story from \`${o}/stories/{story-key}.md\`

## Git Audit

\`\`\`bash
bash ${a}/aped-review/scripts/git-audit.sh ${o}/stories/{story-key}.md
\`\`\`

## Task Tracking

\`\`\`
TaskCreate: "Git audit"
TaskCreate: "AC validation"
TaskCreate: "Task audit"
TaskCreate: "Code quality review"
TaskCreate: "Generate review report"
\`\`\`

## Frontend Detection

Before starting the review, detect if this is a frontend story:
- Check if the story's File List contains \`.tsx\`, \`.jsx\`, \`.vue\`, \`.svelte\` files
- Check if the story references UI components, screens, or visual elements
- Check if \`${o}/ux/\` exists (UX phase was run)

**If frontend story detected:**
1. Ensure the dev server is running (\`npm run dev\` or equivalent)
2. Use \`mcp__react-grab-mcp__get_element_context\` to inspect implemented UI elements
3. Compare the rendered output with the UX spec (\`${o}/ux/design-spec.md\`) and screenshots
4. Add a **Visual Review** section to the review report with visual findings

This is automatic — do not ask the user whether to do visual review. If it's frontend code, review it visually.

## Adversarial Review

Read \`${a}/aped-review/references/review-criteria.md\` for detailed criteria.

Launch **3 Agent tool calls in parallel** for the review:

### Agent 1: AC & Task Validation (\`subagent_type: "feature-dev:code-explorer"\`)
- For each AC: search code for evidence (file:line). Rate: IMPLEMENTED / PARTIAL / MISSING
- For each \`[x]\` task: find proof in code. No evidence = **CRITICAL**

### Agent 2: Code Quality (\`subagent_type: "feature-dev:code-reviewer"\`)
- Security, Performance, Reliability, Test Quality
- Focus on files listed in the story's File List section

### Agent 3: Visual Review (frontend only — skip if no frontend files)
- \`subagent_type: "general-purpose"\`
- Start dev server if not running
- Use \`mcp__react-grab-mcp__get_element_context\` to inspect each implemented component
- Compare with UX spec: correct tokens, spacing, typography, responsive behavior?
- Check: correct component hierarchy, proper prop usage, accessibility attributes
- Report visual discrepancies as findings

Once all agents return, merge findings. Update tasks to \`completed\`.

### Minimum 3 findings enforced.

## Report

Severity: CRITICAL > HIGH > MEDIUM > LOW. Format: \`[Severity] Description [file:line]\`

## Decision

- MEDIUM/LOW only: fix automatically, story — \`done\`
- HIGH+: fix or add \`[AI-Review]\` items, story — \`in-progress\`

## Ticket & Git Update

Read \`ticket_system\` and \`git_provider\` from \`${a}/config.yaml\`.
Read \`${a}/aped-dev/references/ticket-git-workflow.md\` for details.

If story → \`done\`:
1. If PR exists: approve/merge (adapt to \`git_provider\`)
2. If \`ticket_system\` is not \`none\`: move ticket to **Done**
3. Cleanup: delete feature branch after merge

If story → \`in-progress\` (review found HIGH+ issues):
1. Add [AI-Review] items as comments on the PR
2. Ticket stays in **In Review**

## State Update

Update \`${o}/state.yaml\`.

## Next Step

If all stories are done: report pipeline completion.
If more stories remain: tell the user "Run \`/aped-dev\` for the next story, or \`/aped-status\` to check sprint status."

**Do NOT auto-chain.** The user decides when to proceed.

## Example

Review of story "1-2-user-registration":
- [HIGH] No input validation on email field [src/auth/register.ts:42]
- [MEDIUM] Password stored without hashing [src/auth/register.ts:58]
- [LOW] Missing error message i18n [src/auth/register.ts:71]
Result: 3 findings → story back to \`in-progress\` with [AI-Review] items.

## What NOT to Do

- **Don't rubber-stamp.** "Code looks clean" is not a review. Your job is to find problems. If you found 0-2 issues, you didn't look hard enough — re-examine error handling, edge cases, missing tests, and security surface.
- **Don't review only the happy path.** What happens when the input is null? Empty string? 10MB payload? Concurrent requests? The bugs live in the edges, not the golden path.
- **Don't skip the git audit.** Files modified outside the story scope are the #1 source of silent regressions. The script catches what your eyes miss.
- **Don't conflate style with substance.** Naming nitpicks and formatting preferences are LOW at best. Focus on logic errors, missing validation, security gaps, and test coverage holes.
- **Don't auto-fix HIGH+ findings without understanding them.** A HIGH finding means something is structurally wrong. Slapping a fix on it without understanding why it happened will introduce a new bug. Send it back to dev with a clear explanation.
- **Don't validate tests by reading them — run them.** A test that "looks correct" but hasn't been executed is decoration. Verify with \`run-tests.sh\`.

## Common Issues

- **Git audit fails (no git repo)**: Script handles this — skips audit with WARNING, proceeds to code review
- **Fewer than 3 findings**: Re-examine edge cases, error handling, test gaps, security surface
- **Story file not found**: Check \`sprint.stories\` in state.yaml — story key may have changed
`,
    },
    // ── aped-ux ─────────────────────────────────────────────
    {
      path: `${a}/aped-ux/SKILL.md`,
      content: `---
name: aped-ux
description: 'Designs UX via the ANF framework (Assemble design system, Normalize with React preview, Fill all screens). Use when user says "design UX", "UX spec", "aped ux", or invokes /aped-ux. Runs between PRD and Epics phases.'
license: MIT
compatibility: 'Requires Node.js 18+ and npm for Vite+React preview scaffold'
metadata:
  author: yabafre
  version: ${c.cliVersion || '1.7.1'}
---

# APED UX — ANF Framework

## Critical Rules

- NEVER use lorem ipsum — every text element must reflect the actual product from the PRD
- ALWAYS run the pre-delivery checklist before presenting to user
- Take your time with each screen — quality is more important than speed
- Do not skip the user review cycle — the prototype MUST be approved before proceeding

Produces a validated, interactive React prototype from the PRD. The prototype becomes the UX spec that \`/aped-epics\` consumes as the visual source of truth.

**ANF = Assemble → Normalize → Fill**

\`\`\`
A: Design DNA        N: React Preview        F: Complete + Validate
   (inputs)             (live prototype)         (user-approved spec)

Inspirations         Vite + React app        All screens built
+ UI library         with REAL content       + interaction states
+ color/typo         from PRD context        + responsive behavior
+ components         (no lorem ipsum)        + user review cycles
                                             = UX spec for /aped-epics
\`\`\`

## Setup

1. Read \`${a}/config.yaml\` — extract config
2. Read \`${o}/state.yaml\` — check pipeline state
   - If \`pipeline.phases.ux.status\` is \`done\`: ask user — redo or skip?
   - If user skips: stop here (user will invoke next phase manually)
3. Read \`${a}/aped-ux/references/ux-patterns.md\` for design patterns catalog

## Task Tracking

\`\`\`
TaskCreate: "A — Assemble: collect design DNA"
TaskCreate: "A — Assemble: scaffold Vite + React preview app"
TaskCreate: "N — Normalize: build layout + navigation + design tokens"
TaskCreate: "N — Normalize: implement screens with real PRD content"
TaskCreate: "F — Fill: complete all states (loading, error, empty)"
TaskCreate: "F — Fill: responsive + accessibility pass"
TaskCreate: "F — Fill: user review + validation"
\`\`\`

---

## A — ASSEMBLE (Design DNA)

### A1: Collect Design Inputs

Ask the user (adapt to \`communication_language\`):

1. **Inspirations** — "Share screenshots, URLs, or describe the visual direction you want"
   - Accept: image files (Read tool), URLs (WebFetch), or verbal description
   - If images: analyze layout, density, color palette, typography, component style
   - If URLs: fetch and analyze visual patterns

2. **UI Library** — "Which component library? Or none (custom)?"
   - Options: shadcn/ui, Radix UI, MUI, Ant Design, Chakra UI, Mantine, none
   - If specified: use MCP context7 (\`resolve-library-id\` then \`query-docs\`) to load component API
   - If none: will create custom components styled to match inspirations

3. **Design Tokens** — Extract or ask:
   - **Colors**: primary, secondary, accent, neutral scale, semantic (success/warning/error/info)
   - **Typography**: font family, size scale (xs to 2xl), weight scale, line heights
   - **Spacing**: base unit (4px/8px), scale (1-12)
   - **Radius**: none/sm/md/lg/full
   - **Shadows**: sm/md/lg/xl

4. **Branding** — Logo, brand colors, tone (playful/serious/minimal/bold)

### A2: Scaffold Preview App

\`\`\`bash
mkdir -p ${o}/ux-preview
cd ${o}/ux-preview
npm create vite@latest . -- --template react-ts
npm install
\`\`\`

If UI library chosen:
\`\`\`bash
# Example for shadcn/ui:
npx shadcn@latest init
# Example for MUI:
npm install @mui/material @emotion/react @emotion/styled
\`\`\`

Create design token files:
- \`src/tokens/colors.ts\` — color palette as CSS custom properties or theme object
- \`src/tokens/typography.ts\` — font config
- \`src/tokens/spacing.ts\` — spacing scale
- \`src/theme.ts\` — unified theme export

Create \`src/data/mock.ts\` — **real content from PRD**, not lorem ipsum:
- Extract product name, user types, feature names, sample data from PRD
- Generate realistic mock data that matches the product domain
- Example: if building a project manager, mock projects have real-sounding names and dates

\`TaskUpdate: "A — Assemble: scaffold" → completed\`

---

## N — NORMALIZE (React Preview with Real Content)

### N1: Layout + Navigation

Read PRD user journeys and screen inventory (from \`${a}/aped-ux/references/ux-patterns.md\`).

1. **Map screens** from PRD user journeys:
   - Each journey → concrete screens
   - Name: \`{area}-{action}\` slug (e.g., \`auth-login\`, \`dashboard-overview\`)
   - Classify: form, list, detail, dashboard, wizard, modal

2. **Build layout shell** — \`src/layouts/\`:
   - App layout (header, sidebar/nav, content, footer)
   - Auth layout (centered card)
   - Apply design tokens throughout

3. **Set up routing** — React Router with all screens as routes:
   - \`src/App.tsx\` — router config
   - \`src/pages/{ScreenSlug}.tsx\` — one page per screen (initially placeholder)

4. **Navigation** — read rules P9 (Navigation) from \`${a}/aped-ux/references/ux-patterns.md\`:
   - Sidebar or top nav matching design inspiration
   - Active state indicators on current route
   - Mobile: bottom nav ≤5 items (icon + label) or hamburger/drawer
   - Desktop ≥1024px: sidebar; smaller: bottom/top nav
   - Predictable back behavior, preserve scroll/state
   - Same navigation placement across all pages

Run: \`npm run dev\` — verify app runs with working navigation.

### N2: Screen Implementation

For each screen, in priority order (core journey first):

1. **Read relevant FRs** for this screen
2. **Build with UI library components** (or custom styled components)
3. **Use real mock data** from \`src/data/mock.ts\` — product names, user names, realistic dates and numbers
4. **Implement the primary content** — forms, tables, cards, etc.
5. **Wire interactions** — form submits, button clicks, navigation (can be no-op handlers)

**CRITICAL: No lorem ipsum.** Every text element must reflect the actual product:
- If it's a SaaS dashboard, show realistic metric names and values
- If it's an e-commerce, show real-looking product names and prices
- If it's a project tool, show plausible project names and statuses

\`TaskUpdate: "N — Normalize: implement screens" → completed\`

---

## F — FILL (Complete + Validate)

### F1: Interaction States

Read rules P7 (Animation) and P8 (Forms & Feedback) from \`${a}/aped-ux/references/ux-patterns.md\`.

For each screen, add:

1. **Loading states** — skeleton/shimmer for operations >300ms, spinner for buttons
2. **Empty states** — first-use experience with helpful message + CTA, "no results" views
3. **Error states** — inline validation on blur, error below field, error summary at top for long forms
4. **Success feedback** — toast auto-dismiss 3-5s, confirmation messages
5. **Disabled states** — opacity 0.38-0.5, cursor change, non-interactive
6. **Press feedback** — visual response within 80-150ms (ripple, opacity, scale 0.95-1.05)
7. **Animations** — 150-300ms micro-interactions, transform/opacity only, ease-out enter, ease-in exit

### F2: Responsive + Dark Mode

Read rules P5 (Layout) and P6 (Typography & Color) from \`${a}/aped-ux/references/ux-patterns.md\`.

1. **Responsive** — test and fix at 3 breakpoints:
   - Mobile (375px): single column, hamburger nav, touch targets ≥44px, safe areas
   - Tablet (768px): adapted layout, sidebar may collapse, adjusted gutters
   - Desktop (1440px): full layout, max-width container, sidebar visible

2. **Dark mode** — if applicable:
   - Semantic color tokens mapped per theme (not hardcoded hex)
   - Desaturated/lighter variants, NOT inverted colors
   - Primary text ≥ 4.5:1, secondary ≥ 3:1 in both modes
   - Borders/dividers distinguishable in both modes
   - Modal scrim: 40-60% black, foreground legible
   - Test both themes independently

### F3: Accessibility Pass

Read rules P1 (Accessibility) and P2 (Touch) from \`${a}/aped-ux/references/ux-patterns.md\`.

- Contrast: 4.5:1 normal text, 3:1 large text (test with browser devtools)
- Focus rings: 2-4px, visible on all interactive elements
- Tab order: matches visual order
- Form labels: visible, associated, not placeholder-only
- Icon buttons: aria-label
- Skip-to-main link
- Heading hierarchy: h1→h2→h3, no skipping
- Touch targets: ≥44x44pt with ≥8px spacing
- No information conveyed by color alone

### F4: Pre-Delivery Checklist

Read the full Pre-Delivery Checklist from \`${a}/aped-ux/references/ux-patterns.md\`.

Run through ALL checks before presenting to user:

**Visual Quality** — SVG icons, consistent family, no press jitter, semantic tokens, brand assets
**Interaction** — press feedback, touch targets, micro-interaction timing, disabled states, focus order
**Light/Dark Mode** — contrast ratios in both, dividers visible, scrim legibility
**Layout** — safe areas, fixed bars, tested 3 devices, spacing rhythm, text readability
**Accessibility** — labels, hints, errors, color independence, reduced motion, ARIA

If any check fails: fix before showing to user.

### F5: User Review Cycle

**This is the most important step.** The prototype must be validated by the user.

1. Run \`npm run dev\` and give the user the local URL
2. **Use React Grab for visual review** — call \`mcp__react-grab-mcp__get_element_context\` to inspect specific UI elements the user selects. This gives you the component tree, props, and styles of any element the user points to, making review precise instead of guessing from screenshots.
3. Present the pre-delivery checklist results
4. Ask: "Review each screen. What needs to change?"
5. Categories of feedback:
   - **Layout** — move, resize, reorder sections
   - **Content** — missing info, wrong hierarchy, unclear labels
   - **Style** — colors, spacing, typography adjustments
   - **Flow** — navigation changes, missing screens, wrong order
   - **Components** — wrong component type, missing states, wrong behavior
   - **Dark mode** — contrast issues, token problems, scrim opacity

6. **Iterate** until user says "approved" or "good enough"
7. Each iteration: apply feedback → use React Grab to inspect the changed elements → run checklist again → present → ask again

\`TaskUpdate: "F — Fill: user review" → completed\`

---

## Output

Once user approves the prototype:

\`\`\`bash
mkdir -p ${o}/ux
\`\`\`

1. **Preview app stays** at \`${o}/ux-preview/\` — living reference
2. Write \`${o}/ux/design-spec.md\`:
   - Design tokens (colors, typo, spacing, radius)
   - UI library + version
   - Screen inventory with routes
   - Component tree with props
   - Layout specifications
   - Responsive breakpoints
3. Write \`${o}/ux/screen-inventory.md\` — all screens with FR mapping
4. Write \`${o}/ux/components.md\` — component catalog from the preview app
5. Write \`${o}/ux/flows.md\` — navigation flow diagrams
6. Take **screenshots** of each screen at desktop resolution → \`${o}/ux/screenshots/\`

## Validation

\`\`\`bash
bash ${a}/aped-ux/scripts/validate-ux.sh ${o}/ux
\`\`\`

If validation fails: fix missing files or content and re-validate.

## State Update

Update \`${o}/state.yaml\`:
\`\`\`yaml
pipeline:
  current_phase: "ux"
  phases:
    ux:
      status: "done"
      output: "${o}/ux/"
      preview: "${o}/ux-preview/"
      design_system:
        ui_library: "{library}"
        tokens: "${o}/ux-preview/src/tokens/"
\`\`\`

## Next Step

Tell the user: "UX design is ready. Run \`/aped-epics\` to create epics and stories."

The epics phase reads \`${o}/ux/design-spec.md\` and the preview app to enrich stories with:
- Component references (which component to use, which props)
- Screen references (wireframe screenshots)
- Design tokens to respect
- Responsive requirements per screen

**Do NOT auto-chain.** The user decides when to proceed.

## Common Issues

- **npm create vite fails**: Ensure Node.js 18+ is installed. Try \`node --version\` first.
- **UI library install fails**: Check network. For shadcn, ensure the project has a tsconfig.json.
- **User gives no design inspiration**: Use the product domain to suggest a style — "SaaS dashboard" → clean/minimal, "e-commerce" → card-heavy/visual
- **Prototype looks wrong on mobile**: Check responsive breakpoints — sidebar must collapse, touch targets ≥ 44px
- **Dark mode contrast fails**: Use semantic tokens, not hardcoded colors. Check with browser devtools contrast checker.
`,
    },
    // ── aped-status ──────────────────────────────────────────────
    {
      path: `${a}/aped-status/SKILL.md`,
      content: `---
name: aped-status
description: 'Shows sprint status dashboard with progress, blockers, and next actions. Use when user says "sprint status", "show progress", "aped status", or invokes /aped-status.'
allowed-tools: "Read Grep Glob Bash"
license: MIT
metadata:
  author: yabafre
  version: ${c.cliVersion || '1.7.1'}
---

# APED Status — Sprint Dashboard

## Setup

1. Read \`${a}/config.yaml\` — extract \`communication_language\`, \`ticket_system\`
2. Read \`${o}/state.yaml\` — load full pipeline and sprint state
3. Read \`${a}/aped-status/references/status-format.md\` for display conventions

## Pipeline Overview

Display current pipeline phase and completion status:

\`\`\`
Pipeline: A[✓] → P[✓] → E[✓] → D[▶] → R[ ]
\`\`\`

For each completed phase, show the output artifact path.

## Sprint Progress

For each epic in \`sprint.stories\`:

1. Count stories by status: \`done\`, \`in-progress\`, \`review\`, \`ready-for-dev\`, \`backlog\`
2. Calculate completion percentage
3. Display as progress bar:

\`\`\`
Epic 1: User Authentication     [████████░░] 80% (4/5 stories)
  ✓ 1-1-project-setup           done
  ✓ 1-2-user-registration       done
  ✓ 1-3-login-flow              done
  ✓ 1-4-password-reset          done
  ▶ 1-5-session-management      in-progress
\`\`\`

## Blockers Detection

Scan for:
- Stories with \`[AI-Review]\` items → **Review blockers**
- Stories \`in-progress\` for more than 1 session → **Stuck stories**
- Missing dependencies between stories → **Dependency blockers**
- HALT conditions logged in Dev Agent Record → **Dev halts**

## Next Actions

Based on current state, suggest the next logical command:
- If stories \`ready-for-dev\`: suggest \`/aped-dev\`
- If stories in \`review\`: suggest \`/aped-review\`
- If all stories \`done\`: suggest pipeline complete
- If blockers found: describe resolution path

## Ticket System Sync

Read \`${a}/aped-dev/references/ticket-git-workflow.md\` for status mapping.

If \`ticket_system\` is not \`none\`:
- Show ticket ID alongside each story status
- Flag any stories without ticket references
- Check sync: compare state.yaml statuses with expected ticket statuses
- If divergence detected: warn user — "state.yaml says X, ticket system should be Y"
- Display mapping table:
  - \`backlog\` → Backlog/Todo
  - \`in-progress\` → In Progress
  - \`review\` → In Review
  - \`done\` → Done

## Output

Display only — no file writes, no state changes. Pure read-only dashboard.

## Example

\`\`\`
Pipeline: A[✓] → P[✓] → UX[✓] → E[✓] → D[▶] → R[ ]
Epic 1: User Auth        [████████░░] 80% (4/5)
Epic 2: Dashboard         [██░░░░░░░░] 20% (1/5)
Next: /aped-dev (story 1-5-session-mgmt is ready-for-dev)
\`\`\`

## Common Issues

- **State file not found**: Ensure \`${o}/state.yaml\` exists — run /aped-analyze first
- **Stories show wrong status**: State.yaml may be stale — re-run the last phase to update it
`,
    },
    // ── aped-course ──────────────────────────────────────────────
    {
      path: `${a}/aped-course/SKILL.md`,
      content: `---
name: aped-course
description: 'Manages scope changes and pivots during development with impact analysis. Use when user says "correct course", "change scope", "pivot", "aped correct", or invokes /aped-course.'
disable-model-invocation: true
license: MIT
metadata:
  author: yabafre
  version: ${c.cliVersion || '1.7.1'}
---

# APED Correct Course — Managed Pivot

Use when requirements change, priorities shift, or the current approach needs rethinking mid-pipeline.

## Setup

1. Read \`${a}/config.yaml\` — extract config
2. Read \`${o}/state.yaml\` — understand current pipeline state
3. Read existing artifacts: brief, PRD, epics, stories
4. Read \`${a}/aped-course/references/scope-change-guide.md\` for impact matrix and process

## Impact Assessment

Ask the user:
1. **What changed?** — New requirement, removed feature, architectural pivot, priority shift
2. **Why?** — User feedback, market shift, technical limitation, stakeholder decision

Then analyze impact:

### Scope Change Matrix

| What changed | Artifacts affected | Action required |
|---|---|---|
| New feature added | PRD, Epics | Add FRs → create new stories |
| Feature removed | PRD, Epics | Remove FRs → archive stories |
| Architecture change | PRD NFRs, All stories | Update NFRs → review all Dev Notes |
| Priority reorder | Epics, Sprint | Reorder stories → update sprint |
| Complete pivot | Everything | Reset to /aped-analyze |

## Change Execution

### Minor change (new/removed feature)
1. Update PRD: add/remove FRs, update scope
2. Re-run validation: \`bash ${a}/aped-prd/scripts/validate-prd.sh ${o}/prd.md\`
3. Update epics: add/archive affected stories
4. Re-run coverage: \`bash ${a}/aped-epics/scripts/validate-coverage.sh ${o}/epics.md ${o}/prd.md\`
5. Update \`${o}/state.yaml\`: mark affected stories as \`backlog\`

### Major change (architecture/pivot)
1. Confirm with user: "This invalidates in-progress work. Proceed?"
2. Archive current artifacts to \`${o}/archive/{date}/\`
3. Update PRD or restart from \`/aped-analyze\`
4. Regenerate affected downstream artifacts

## Story Impact Report

For each in-progress or completed story:
- **Safe**: story not affected by change
- **Needs update**: story Dev Notes or ACs need modification
- **Invalidated**: story no longer relevant — archive it

## State Update

Update \`${o}/state.yaml\`:
- Reset affected stories to \`backlog\` or \`ready-for-dev\`
- If major change: reset \`current_phase\` to appropriate earlier phase
- Log the correction in pipeline phases:
\`\`\`yaml
corrections:
  - date: "{date}"
    type: "{minor|major}"
    reason: "{user's reason}"
    affected_stories: [...]
\`\`\`

## Guard Against Scope Creep

After applying changes, verify:
- Total FR count still within 10-80 range
- No epic became too large (>8 stories)
- No story became too large (>8 tasks)
- Changed stories still fit single-session size

## Example

User says "We need to add OAuth — the client changed requirements":
1. Impact: minor change — add FRs to PRD, create new stories
2. Update PRD: add FR26-FR28 for OAuth
3. Re-validate PRD
4. Add stories to Epic 1 for OAuth support
5. Re-validate coverage
6. Reset new stories to \`ready-for-dev\`

## Common Issues

- **User wants to change everything**: Confirm scope — "Is this a pivot or an addition?"
- **Invalidated stories have committed code**: Archive the code changes, don't delete — user may want to reference them
- **FR count exceeds 80 after change**: Some features may need to move to a Growth phase scope
`,
    },
    // ── aped-context ────────────────────────────────────────────
    {
      path: `${a}/aped-context/SKILL.md`,
      content: `---
name: aped-context
description: 'Analyzes existing codebase to generate project context for brownfield development. Use when user says "document codebase", "project context", "existing project", "aped context", or invokes /aped-context. Not for new project ideation — use aped-analyze for greenfield.'
allowed-tools: "Read Grep Glob Bash"
license: MIT
metadata:
  author: yabafre
  version: ${c.cliVersion || '1.7.1'}
---

# APED Context — Brownfield Project Analysis

Use on existing codebases to generate project context before running the APED pipeline. Essential for brownfield projects where you're adding features to existing code.

## Setup

1. Read \`${a}/config.yaml\` — extract config
2. Verify this is a brownfield project (existing code, not greenfield)
3. Read \`${a}/aped-context/references/analysis-checklist.md\` for the full analysis checklist

## Codebase Analysis

### Phase 1: Structure Discovery

Scan the project root:
- Detect language/framework from config files (package.json, Cargo.toml, go.mod, pyproject.toml, etc.)
- Map directory structure (max 3 levels deep)
- Identify entry points, main modules, config files
- Count: files, LOC, languages used

### Phase 2: Architecture Mapping

- Identify architectural pattern (MVC, hexagonal, microservices, monolith, etc.)
- Map data flow: entry point → processing → storage → response
- List external dependencies and integrations (APIs, databases, queues, caches)
- Identify test framework and coverage approach

### Phase 3: Convention Extraction

- Naming conventions (files, functions, variables, classes)
- Code organization patterns (feature-based, layer-based, domain-based)
- Error handling patterns
- Logging approach
- Config management (env vars, config files, secrets)

### Phase 4: Dependency Audit

- List production dependencies with versions
- Flag outdated or deprecated packages
- Identify security advisories (if available)
- Note lock file type (package-lock, yarn.lock, pnpm-lock, etc.)

## Output

Write project context to \`${o}/project-context.md\`:

\`\`\`markdown
# Project Context: {project_name}

## Tech Stack
- Language: {lang} {version}
- Framework: {framework} {version}
- Database: {db}
- Test Framework: {test_framework}

## Architecture
- Pattern: {pattern}
- Entry Point: {entry}
- Key Modules: {modules}

## Conventions
- File naming: {convention}
- Code style: {style}
- Error handling: {pattern}

## Dependencies
| Package | Version | Purpose |
|---------|---------|---------|

## Integration Points
- {service}: {purpose}

## Notes for Development
- {important context for new feature development}
\`\`\`

## State Update

Update \`${o}/state.yaml\`:
\`\`\`yaml
project_context:
  generated: true
  path: "${o}/project-context.md"
  type: "brownfield"
\`\`\`

## Next Steps

Suggest:
- If no brief exists: run \`/aped-analyze\` with project context loaded
- If brief exists: context will inform \`/aped-prd\` and \`/aped-dev\` decisions

## Example

Scanning a Next.js SaaS project → project-context.md:
- Stack: TypeScript, Next.js 14, Prisma, PostgreSQL
- Pattern: App Router, server components, feature-based folders
- Conventions: camelCase files, Zod validation, Tailwind CSS
- 45 dependencies, 3 outdated, 0 security advisories

## Common Issues

- **No package.json/Cargo.toml found**: Project may be multi-language or unconventional — scan for entry points manually
- **Very large codebase (>1000 files)**: Focus on src/ and key config files, don't scan node_modules or build output
- **Monorepo detected**: Document each package/app separately in the context file
`,
    },
    // ── aped-qa ─────────────────────────────────────────────
    {
      path: `${a}/aped-qa/SKILL.md`,
      content: `---
name: aped-qa
description: 'Generates E2E and integration tests from acceptance criteria for completed features. Use when user says "generate tests", "E2E tests", "integration tests", "aped qa", or invokes /aped-qa.'
license: MIT
metadata:
  author: yabafre
  version: ${c.cliVersion || '1.7.1'}
---

# APED QA — E2E & Integration Test Generation

Generate comprehensive end-to-end and integration tests for completed stories or epics. Complements the unit tests written during /aped-dev TDD.

## Setup

1. Read \`${a}/config.yaml\` — extract config
2. Read \`${o}/state.yaml\` — find completed stories/epics
3. Read \`${a}/aped-qa/references/test-patterns.md\` for framework selection and test templates

## Scope Selection

Ask the user:
1. **What to test?** — specific story, full epic, or all completed work
2. **Test type?** — E2E (user journeys), Integration (API/service), or Both

## Story/Epic Analysis

For the selected scope:
1. Read story files from \`${o}/stories/\`
2. Extract all Acceptance Criteria (Given/When/Then)
3. Map user journeys across stories (multi-step flows)
4. Identify integration points (APIs, databases, external services)

## Task Tracking

\`\`\`
TaskCreate: "Analyze stories and extract ACs"
TaskCreate: "Generate E2E tests"
TaskCreate: "Generate integration tests"
TaskCreate: "Run and verify all tests"
TaskCreate: "Write QA report"
\`\`\`

## Test Generation

Launch **2 Agent tool calls in parallel**:

### Agent 1: E2E Tests (\`subagent_type: "general-purpose"\`)

For each user journey that spans one or more stories:

1. Map the full flow: entry → steps → expected outcome
2. Generate test using the project's test framework
3. Each AC's Given/When/Then becomes a test step
4. Include:
   - Happy path (main flow)
   - Error paths (invalid input, unauthorized, not found)
   - Edge cases (empty data, concurrent access, timeouts)

### Agent 2: Integration Tests (\`subagent_type: "general-purpose"\`)

For each integration point:

1. Test request/response contracts
2. Test error handling (service down, timeout, malformed response)
3. Test data consistency (DB state before/after)
4. Test authentication/authorization boundaries

Once both agents return, update tasks to \`completed\`.

### Test Naming Convention

\`\`\`
{test-type}/{epic-slug}/{story-slug}.test.{ext}
\`\`\`

## Framework Detection

Read project config to auto-detect:
- **Node.js**: Playwright, Cypress, or Puppeteer for E2E; Supertest for API
- **Python**: Pytest + httpx for API; Playwright for E2E
- **Go**: Go test + httptest for API
- **Rust**: reqwest for API tests

Use \`bash ${a}/aped-dev/scripts/run-tests.sh\` to verify tests pass.

## Test Coverage Report

After generation:
- List ACs covered vs uncovered
- List user journeys tested
- List integration points tested
- Flag any untestable ACs (and why)

## Output

1. Write tests to project test directory (detect convention)
2. Write QA report to \`${o}/qa-report.md\`:
   - Stories tested
   - Tests generated (count by type)
   - Coverage gaps
   - Manual test suggestions (for things that can't be automated)

## No State Change

QA doesn't affect pipeline state — it's an additive quality layer.

## Next Steps

Suggest running \`/aped-status\` to view updated sprint status with QA coverage noted.

## Example

Epic 1 completed (3 stories) → generate QA:
- E2E: 5 tests covering registration → login → dashboard journey
- Integration: 3 API tests for auth endpoints
- Report: 8/8 ACs covered, 0 gaps, 1 manual test suggested (email verification)

## Common Issues

- **Test framework not detected**: Check project config — ensure test runner is in dependencies
- **ACs not testable**: Some ACs describe UX behavior — flag as "manual test required" in report
- **Tests fail on generated code**: Review the test — it may assume a specific API shape. Adapt to actual implementation
`,
    },
    // ── aped-quick ────────────────────────────────────────────
    {
      path: `${a}/aped-quick/SKILL.md`,
      content: `---
name: aped-quick
description: 'Implements quick fixes and small features bypassing the full pipeline. Use when user says "quick fix", "quick feature", "hotfix", "aped quick", or invokes /aped-quick.'
license: MIT
metadata:
  author: yabafre
  version: ${c.cliVersion || '1.7.1'}
---

# APED Quick — Fast Track for Small Changes

Use this for isolated fixes, small features, or refactors that don't warrant the full A→P→E→D→R pipeline.

## Setup

1. Read \`${a}/config.yaml\` — extract config
2. Read \`${o}/state.yaml\` — note current phase for context
3. Scan \`${o}/quick-specs/\` for any specs with \`**Status:** in-progress\`
   - If found: ask user — "Resume spec \`{slug}\` or start a new one?"
   - If resume: load that spec and skip to Implementation

## Spec Isolation

Each quick spec is an independent file: \`${o}/quick-specs/{date}-{slug}.md\`
- Multiple specs can exist in parallel (different sessions, different developers)
- Status field tracks lifecycle: \`draft\` → \`in-progress\` → \`done\` or \`abandoned\`
- Never overwrite an existing spec — always create a new file with a unique slug

## Scope Check

This mode is for changes that:
- Touch **5 files or fewer**
- Can be completed in **1 session**
- Don't introduce **new architectural patterns**
- Don't require **new dependencies**

If any of these are violated, recommend the full pipeline instead.

## Quick Spec (2 minutes)

Ask the user:
1. **What?** — What needs to change (1-2 sentences)
2. **Why?** — Why now, what breaks without it
3. **Type?** — fix | feature | refactor

Generate a quick spec using \`${a}/templates/quick-spec.md\`:
- Fill: title, type, what, why, acceptance criteria, files to change, test plan
- Set \`**Status:** draft\`
- Write to \`${o}/quick-specs/{date}-{slug}.md\`
- Present spec to user for validation before implementing

⏸ **GATE: User must approve the spec before implementation starts.**

Once approved, update \`**Status:** in-progress\`

## Implementation (TDD)

Same TDD cycle as aped-dev but compressed:

1. **RED** — Write test for the expected behavior
2. **GREEN** — Minimal implementation to pass
3. **REFACTOR** — Clean up while green

Run tests: \`bash ${a}/aped-dev/scripts/run-tests.sh\`

## Self-Review (30 seconds)

Quick checklist — no full adversarial review:
- [ ] Tests pass
- [ ] No security issues introduced
- [ ] No regressions in existing tests
- [ ] AC from quick spec satisfied

## Git & Ticket Workflow

Read \`ticket_system\` and \`git_provider\` from config.
Read \`${a}/aped-dev/references/ticket-git-workflow.md\` for full guide.

1. **Branch**: create \`fix/{ticket-id}-{slug}\` or \`feature/{ticket-id}-{slug}\`
2. **Commits**: \`type({ticket-id}): description\` — include magic words per ticket provider
3. **PR/MR**:
   - \`github\`: \`gh pr create --title "fix({ticket-id}): description" --body "Fixes {ticket-id}"\`
   - \`gitlab\`: \`glab mr create --title "fix({ticket-id}): description" --description "Closes {ticket-id}"\`
   - \`bitbucket\`: push branch, create PR via web
4. **Ticket**: move to Done after merge

## Output

1. Update spec: set \`**Status:** done\`, fill the \`## Result\` section
2. No state.yaml update — quick specs don't affect pipeline phase
3. Report: files changed, tests added, quick spec path

## Example

User: "quick fix the login button not submitting"
1. Quick spec: fix, "login form submit handler not wired"
2. RED: test that clicking submit calls auth API
3. GREEN: wire onClick → submitForm()
4. Self-review: tests pass, no security issues
5. Commit: \`fix(auth): wire login form submit handler\`

## Common Issues

- **Change touches >5 files**: This is too big for quick — recommend full pipeline
- **New dependency needed**: HALT — ask user, this may need architectural discussion
`,
    },
    // ── aped-checkpoint ──────────────────────────────────────
    {
      path: `${a}/aped-checkpoint/SKILL.md`,
      content: `---
name: aped-checkpoint
description: 'Human-in-the-loop review of recent changes. Summarizes what changed, highlights concerns, and halts for user approval. Use when user says "checkpoint", "review changes", "walk me through this", or invokes /aped-check.'
license: MIT
metadata:
  author: yabafre
  version: ${c.cliVersion || '1.7.1'}
---

# APED Checkpoint — Human-in-the-Loop Review

Pause, summarize recent changes, and wait for the user to confirm before proceeding. Use at any point in the pipeline when the user wants to review what's been done.

## When to Use

- After a complex implementation before moving to the next story
- After multiple quick-specs in a row
- When you are unsure a decision was correct
- When the user asks "what just happened?" or "walk me through this"
- Before any irreversible action (merge, deploy, major refactor)

## Step 1: Gather Changes

Analyze what has changed since the last checkpoint (or since session start):

1. **Git diff**: Run \`git diff --stat\` and \`git diff --stat HEAD~N\` to see files changed
2. **Recent commits**: Run \`git log --oneline -10\` for commit history
3. **State changes**: Read \`${o}/state.yaml\` — what phase/story moved?
4. **New artifacts**: Check for new files in \`${o}/\` (specs, stories, reports)

## Step 2: Concern-Ordered Summary

Present changes to the user ordered by **concern level** (highest first):

### Concern Types (priority order)
1. **RISK** — Security, data loss, breaking change potential
2. **ASSUMPTION** — Decision made without explicit user input
3. **DEVIATION** — Diverged from spec, story, or established pattern
4. **INFO** — Notable but not concerning

### Format

**Needs Attention** (if any):
- [RISK] Description [file:line]
- [ASSUMPTION] Description [file:line]

**Changes Made:**
- [type] Description [files affected]

**Artifacts Created/Updated:**
- Path and what it contains

**Decisions Made:**
- What was decided and why

### Rules
- Lead with concerns, not with a changelog
- If there are no concerns, say so explicitly — do not manufacture them
- Be specific: "Added user input to SQL query without parameterization" not "potential security issue"
- Include file:line references for every concern
- Keep it scannable — bullet points, not paragraphs

## Step 3: HALT

After presenting the summary, **stop and wait**.

Do NOT:
- Suggest next steps unprompted
- Continue to the next story/phase
- Ask "shall I proceed?" — just present and stop

The user will respond with one of:
- **Approve**: "looks good" / "proceed" / "ok"
- **Request changes**: "fix the SQL injection" / "revert that file"
- **Ask questions**: "why did you choose X over Y?"
- **Abort**: "undo everything since last commit"

If you make further changes based on user feedback, present a new mini-checkpoint and halt again.

## No State Change

Checkpoint is read-only — it does not modify state.yaml or advance the pipeline. It is purely an observation and communication tool.
`,
    },
  ];
}
