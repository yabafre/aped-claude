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

Launch **3 Agent tool calls in a single message** (parallel execution) with \`run_in_background: true\`.

Each agent has a persona — include it in the prompt to keep them in character.

### Agent 1: Market Research — **Mary**, Strategic Business Analyst — "Show me the data, not opinions."
- \`subagent_type: "Explore"\`
- Customer behavior and pain points in the target segment
- Competitive landscape: direct and indirect competitors (names, pricing, strengths, weaknesses)
- Market size and growth trajectory
- Pricing models and monetization patterns in the space
- Use WebSearch for current data

### Agent 2: Domain Research — **Derek**, Domain Expert, industry veteran — "I know where the bodies are buried."
- \`subagent_type: "Explore"\`
- Industry analysis and key trends
- Regulatory requirements and compliance needs
- Technical trends shaping the domain
- Standards, certifications, and legal requirements
- Use WebSearch for current data

### Agent 3: Technical Research — **Tom**, Technical Architect, pragmatist — "Boring tech for MVP. Cleverness costs."
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

## Load Inputs

### PRD (required)
- Read PRD from path in \`pipeline.phases.prd.output\`
- If no prd phase in state: ask user for PRD path
- Extract ALL FRs and NFRs by number

### UX spec (if exists)
- Check if \`${o}/ux/\` exists
- If yes: read \`design-spec.md\`, \`screen-inventory.md\`, \`components.md\`, \`flows.md\`
- Use this to enrich story definitions with:
  - Concrete screens per story (from screen-inventory.md)
  - Components referenced per story (from components.md)
  - Navigation flow context (from flows.md)
  - Design tokens and responsive requirements (from design-spec.md)

### Architecture (if exists)
- Check if \`${o}/architecture.md\` exists
- If yes: extract tech decisions that impact story splitting (e.g., if monorepo → story 1 might be workspace setup)

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
- **Depends on** — comma-separated list of story keys this one blocks on, or \`none\`. Required for parallel sprint (\`/aped-sprint\`).

Pick dependencies conservatively: if story B *needs* an artefact produced by story A (contract, schema, shared util), list A. If B only shares files with A but could technically be rebased after, no dep — parallel sprint wins. "Pure foundation" stories (1-1 auth scaffold, 1-1 schema base) usually have \`depends_on: none\` and unlock a fan-out.

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

1. Write epics and story list to \`${o}/epics.md\` with \`**Depends on:**\` on every story
2. Update \`${o}/state.yaml\`:
   - Set \`current_phase: "sprint"\` — this marks the transition from planning to execution
   - Set \`sprint.active_epic\` to the epic the user wants to start with (usually \`1\`)
   - Add \`phases.epics\` with status \`done\` and output path
   - Add \`sprint.stories\` — one entry per story with \`status: pending\`, \`depends_on: [array of story keys]\`, \`ticket: null\` (filled by Ticket System Setup), \`worktree: null\`
   - \`"sprint"\` covers the entire story→dev→review cycle — no further phase changes needed
3. Do NOT create \`${o}/stories/\` files — that is \`/aped-story\`'s job

## Ticket System Setup

Read \`ticket_system\` from config. If \`none\`: skip this phase entirely.

Read \`${a}/aped-dev/references/ticket-git-workflow.md\` for provider-specific syntax.

### Step 1: Check Credentials

Verify the CLI/auth is configured:
- \`github-issues\`: \`gh auth status\`
- \`gitlab-issues\`: \`glab auth status\`
- \`linear\`: check for \`LINEAR_API_KEY\` env var or linear CLI
- \`jira\`: check for \`JIRA_BASE_URL\`, \`JIRA_EMAIL\`, \`JIRA_API_TOKEN\` env vars

If not configured: warn the user with setup instructions and continue **without** ticket sync. Mark \`ticket_sync: skipped\` in state.yaml.

### Step 2: Check Project

Verify the target project exists:
- \`github-issues\`: \`gh repo view\` — must be in a GitHub repo
- \`gitlab-issues\`: \`glab repo view\`
- \`linear\`: ask the user for the team key (e.g., \`TEAM\`) — store in config
- \`jira\`: ask the user for the project key — store in config

### Step 3: Preview to User

Show the user what will be created:
\`\`\`
Will create in {ticket_system}:
  📦 Milestone: Epic 1 — Users can manage inventory
     🆕 Issue: [S] 1-1-project-setup
     🆕 Issue: [M] 1-2-inventory-crud
     🆕 Issue: [M] 1-3-search-filter
     🆕 Issue: [L] 1-4-bulk-import
  📦 Milestone: Epic 2 — Managers can monitor stock levels
     🆕 Issue: ...
\`\`\`

⏸ **GATE: User confirms before creating anything in the ticket system.**

### Step 4: Create Milestones

One milestone per epic. Title: \`Epic {N}: {epic title}\`. Description: epic summary + FR coverage list.

**github-issues:**
\`\`\`bash
gh api repos/{owner}/{repo}/milestones -f title="Epic 1: ..." -f description="..."
\`\`\`

**gitlab-issues:**
\`\`\`bash
glab api projects/{id}/milestones -f title="Epic 1: ..." -f description="..."
\`\`\`

**linear:** Use project/cycle API via curl or linear CLI
**jira:** Use epic issue type (JIRA has native epics)

### Step 5: Create Issues

One issue per story. Format:

**Title:** \`[{size}] {story-key}: {story title}\` (e.g., \`[M] 1-2-inventory-crud: CRUD for inventory items\`)

**Description** (markdown body):
\`\`\`markdown
## User Story
As a {role}, I want {capability}, so that {benefit}.

## Acceptance Criteria
- [ ] AC1: Given ... When ... Then ...
- [ ] AC2: ...

## Covered FRs
- FR1: {FR title from PRD}
- FR2: ...

## UX References (if UX exists)
- Screen: {screen name} (from screen-inventory.md)
- Components: {component list}

## Estimated Size
{S | M | L}

---
Generated by APED Method v${c.cliVersion || '1.7.1'}
\`\`\`

**Labels:**
- Type label (based on story intent):
  - \`🆕 feature\` — new capability
  - \`🔄 refactor\` — restructure existing code
  - \`🔁 update\` — modify or enhance existing behavior
- Size label: \`size/S\`, \`size/M\`, \`size/L\`
- Epic label: \`epic/{N}\`
- Phase label: \`aped/story\`

**Milestone:** assign to the epic milestone created in Step 4.

**github-issues:**
\`\`\`bash
gh issue create --title "..." --body "..." --label "🆕 feature,size/M,epic/1" --milestone "Epic 1: ..."
\`\`\`

**gitlab-issues:**
\`\`\`bash
glab issue create --title "..." --description "..." --label "🆕 feature,size/M,epic/1" --milestone "Epic 1: ..."
\`\`\`

### Step 6: Store Ticket IDs

Update \`${o}/epics.md\` — add a \`**Ticket:** {ticket-id}\` line under each story.

Update \`${o}/state.yaml\`:
\`\`\`yaml
sprint:
  stories:
    1-1-project-setup:
      status: pending
      ticket: "#42"  # or TEAM-10, PROJ-5, etc.
    1-2-inventory-crud:
      status: pending
      ticket: "#43"
\`\`\`

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
description: 'Creates a detailed story file for the next story to implement, commits it on the feature branch, and posts the story-ready check-in. Use when user says "create story", "prepare next story", "aped story", or invokes /aped-story.'
argument-hint: "[story-key]"
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
- **Branch-per-story is inviolable.** In parallel-sprint mode (worktree present), /aped-story runs **inside the worktree on the feature branch** and commits the story file there — never in main. The \`story-ready\` check-in is posted by this skill, not by /aped-sprint.

## Mode Detection

Before anything else, decide whether we are in **solo mode** (main project, no parallel sprint) or **worktree mode** (dispatched by /aped-sprint):

- \`ls ${a}/WORKTREE\` succeeds → **worktree mode** (expected when invoked from a /aped-sprint dispatch). Read the marker to recover \`story_key\`, \`ticket\`, \`branch\`.
- \`ls ${a}/WORKTREE\` fails → **solo mode** (user running /aped-story directly to prep the next story in main).

In worktree mode, the story-key argument is optional — the marker tells us. If the user passed one and it mismatches, HALT and ask the user which is authoritative. If the current branch is \`main\` (not the feature branch), HALT: "Run \`/aped-story\` in the worktree's feature branch, not main. Branch-per-story rule."

## Setup

1. Read \`${a}/config.yaml\` — extract config including \`ticket_system\`
2. Read \`${o}/state.yaml\` — find sprint stories
3. Read \`${o}/epics.md\` — load epic structure and story list

## Story Selection

Scan \`sprint.stories\` for the first story with status \`pending\` (no story file yet).
- If user specifies a story key: use that one instead
- If all stories have files: "All stories are prepared. Run \`/aped-dev\` to implement."
- Show the selected story's summary from epics.md

## Ticket Fetch (source of truth)

If \`ticket_system\` is not \`none\` and the story has a ticket ID in \`sprint.stories.{key}.ticket\`:

1. Fetch the ticket from the system (it may have been edited by the team since \`/aped-epics\` ran):
   - \`github-issues\`: \`gh issue view {id} --json title,body,labels,comments,assignees,state\`
   - \`gitlab-issues\`: \`glab issue view {id}\`
   - \`linear\`: linear CLI or API
   - \`jira\`: curl to jira API

2. **The ticket is the source of truth.** If the team edited the description, ACs, or added comments:
   - Use the ticket's current body as the baseline
   - Review any new comments — they often contain clarifications or new requirements
   - If there are conflicts with \`epics.md\`, flag them to the user and ask which wins

3. Assign the ticket to the current user (optional, depends on provider):
   - \`github-issues\`: \`gh issue edit {id} --add-assignee @me\`
   - \`gitlab-issues\`: \`glab issue assign {id} --assignee @me\`

## Context Compilation

Before writing the story, gather context to make it rich and actionable:

1. **Ticket** — (above) the current state of the issue in the ticket system
2. **PRD** — read the relevant FRs for this story
3. **UX spec** — if exists, read relevant screens/components
4. **Previous stories** — read completed stories from the same epic for continuity
5. **Codebase** — if code exists, scan for relevant patterns, existing models, APIs

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
3. **Sync back to ticket system** (if \`ticket_system\` != \`none\`):
   - If the refined ACs differ from the ticket body: post a comment on the ticket summarizing the refinements
   - Don't overwrite the ticket body (it may have user edits) — use comments instead
   - \`github-issues\`: \`gh issue comment {id} --body "..."\`
   - \`gitlab-issues\`: \`glab issue note create {id} --message "..."\`

### Worktree mode only — commit + story-ready

In worktree mode, the story file and state.yaml edit must land on the feature branch, then a \`story-ready\` check-in is posted so \`/aped-lead\` can approve.

1. Verify branch: \`git symbolic-ref --short HEAD\` must match the marker's \`branch\`. If not, HALT.
2. Stage and commit on the feature branch:
   \`\`\`bash
   git add ${o}/stories/{story-key}.md ${o}/state.yaml
   git commit -m "docs({ticket}): draft story file for {story-key}"
   \`\`\`
3. Post the check-in:
   \`\`\`bash
   bash ${a}/scripts/checkin.sh post {story-key} story-ready
   \`\`\`
4. Report to the user: "\`story-ready\` posted. Back in the main project, run \`/aped-lead\` to approve. Once approved, the Lead will \`tmux send-keys\` \`/aped-dev {story-key}\` into this window (or print the command to run here manually)."

In solo mode, skip steps 1–3 and tell the user: "Story file ready. Run \`/aped-dev {story-key}\` to implement."

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

- **Solo mode**: "Story file is ready at \`${o}/stories/{story-key}.md\`. Run \`/aped-dev\` to implement it."
- **Worktree mode**: "Story file committed on \`{branch}\`. \`story-ready\` check-in posted. Go to the main project and run \`/aped-lead\` — the Lead will approve and push \`/aped-dev {story-key}\` back into this window."

**Do NOT auto-chain.** The user decides when to proceed.
`,
    },
    // ── aped-dev ──────────────────────────────────────────────
    {
      path: `${a}/aped-dev/SKILL.md`,
      content: `---
name: aped-dev
description: 'Implements next story with TDD red-green-refactor cycle. Use when user says "start dev", "implement story", "aped dev", or invokes /aped-dev.'
argument-hint: "[story-key]"
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

1. **Worktree Mode Detection** — three-step lookup, in order:
   1. If \`${a}/WORKTREE\` exists → read it (\`story_key\`, \`ticket\`, \`branch\`, \`project_root\`). Done.
   2. Else, run \`git rev-parse --git-common-dir\` — if its parent differs from \`git rev-parse --show-toplevel\`, we're inside a git worktree (not the main checkout). Infer:
      - \`branch\` from \`git symbolic-ref --short HEAD\`
      - If branch matches \`feature/{ticket}-{story-key}\` (the APED/workmux convention), extract \`ticket\` (first dash-delimited segment after \`feature/\`) and \`story_key\` (the remainder). Example: \`feature/KON-83-1-2-contract\` → ticket=\`KON-83\`, story_key=\`1-2-contract\`
      - \`project_root\` = \`dirname $(git rev-parse --git-common-dir)\`
      - Write the marker now to cache the inference for future invocations.
   3. Else, classic single-session mode (main project, no worktree). Proceed normally.

   In worktree mode (1 or 2), this session is **pinned** to the inferred story. Read the **canonical** state.yaml from \`project_root/${o}/state.yaml\` (not any local copy in the worktree). Verify the story exists there; if not, HALT with a clear error — the worktree doesn't map to a known story.

   In worktree mode, skip "Story Selection" and skip any git branch creation — the worktree already has the right branch.

2. Read \`${a}/config.yaml\` — extract config including \`ticket_system\`, \`git_provider\`.
3. Read state.yaml (canonical one in worktree mode, local one otherwise) — find the target story.

## Story Selection

**Worktree mode:** the story is already pinned by \`${a}/WORKTREE\`. Skip this section.

**Classic mode:** scan \`sprint.stories\` top-to-bottom for the first \`ready-for-dev\` story.
- If the user passed an argument (\`/aped-dev {story-key}\`), use that one instead
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

## Story Classification

Analyze the story's File List to determine the implementation mode.

Detect:
- **backend files** — server code (apps/api, services/, packages/*/src, .py/.go/.rs/.java, business logic)
- **frontend files** — \`.tsx/.jsx/.vue/.svelte\`, apps/web, src/pages, src/components
- **devops files** — .github/workflows, Dockerfile, terraform, k8s, cdk

### Single-layer mode (default)
If the story touches ONE layer only: you (main Claude) implement directly. No team spawning. Continue to **Frontend Detection** and **TDD Implementation** below.

### Fullstack team mode
If the story touches 2+ layers (backend + frontend is the typical case): spawn a **dev team** to align on the contract and implement in parallel. This prevents the classic "frontend and backend diverge, mismatch at integration" trap.

Fullstack mode:
\`\`\`
TeamCreate(name: "dev-{story-key}")
\`\`\`

Spawn 3 team members (in parallel, same message):

**api-designer** — **Kenji**, API Architect, contract-first — "The contract is law."
- \`subagent_type: "general-purpose"\`
- Goes FIRST (others wait for the contract)
- Reads the story, relevant FRs from PRD, architecture.md for conventions
- Writes the contract: types, endpoints/procedures, validation schemas, error codes
- Commits to the shared \`packages/contract\` (or equivalent)
- Posts contract summary in team: "Contract ready at {path}"

**backend-dev** — **Amelia**, Senior Backend Engineer — "Tests first, always."
- \`subagent_type: "general-purpose"\`
- Waits for Kenji's contract, then starts TDD on backend
- Implements endpoints/handlers against the contract
- If the contract needs adjustment: SendMessage(kenji) to negotiate; kenji updates contract; Amelia rebases
- Follows the full TDD cycle (RED → GREEN → REFACTOR → GATE)

**frontend-dev** — **Leo**, Senior Frontend Engineer — "The user never waits in silence."
- \`subagent_type: "general-purpose"\`
- Waits for Kenji's contract, then starts TDD on frontend
- Implements UI against the contract (types, validators)
- Uses React Grab at each GREEN (see Frontend Detection below)
- If UX needs backend support (e.g., a field not in contract): SendMessage(kenji) to request
- Follows the full TDD cycle

### Team Rules

1. **Kenji first** — backend and frontend block until contract is ready
2. **Contract changes are negotiations** — no teammate modifies the contract unilaterally. Always propose via SendMessage(kenji), kenji decides.
3. **Divergence detection** — if backend and frontend end up with conflicting assumptions, the team halts and escalates to the Lead (you)
4. **Shared tests** — contract-level integration tests live where both can reference them

### When all teammates are done
- Lead (you) verifies all team GATEs passed
- Lead merges the work, runs full test suite (including integration tests)
- Lead handles the completion workflow (git, ticket)
- Lead calls \`TeamDelete(name: "dev-{story-key}")\` to release the team threads early (they would otherwise linger until session end)

## Frontend Detection & Visual Dev Loop

(Applies to both single-layer frontend mode and Leo in fullstack mode.)

Detect if this is a frontend story:
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

**If React Grab MCP is unavailable** (connection error, not configured): log a WARNING to the user, proceed without the visual check, and mention in the Dev Agent Record that visual verification was deferred to review. Never block dev on MCP availability — \`/aped-review\` (Aria) will catch missed visual issues.

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
1. Read ticket ID from \`sprint.stories.{key}.ticket\` in state.yaml
2. **Fetch ticket** — get latest state (title, body, comments, labels). The ticket may have been updated by the team since /aped-story ran.
3. Compare ticket body with story file — if there are divergences (new ACs, clarifications in comments), **HALT and ask the user** which version is correct
4. Move ticket status to **In Progress**:
   - \`github-issues\`: \`gh issue edit {id} --remove-label "status/ready" --add-label "status/in-progress"\` (or use project board if configured)
   - \`gitlab-issues\`: similar with \`glab\`
   - \`linear\`: linear CLI \`issue state update\`
   - \`jira\`: curl transitions API
5. Create feature branch using ticket-provider suggested name
6. Add a comment on the ticket with implementation plan (tasks list, approach)

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
3. Post a completion comment on the ticket with:
   - Summary of what was implemented
   - List of files changed
   - PR/MR link
   - Any deviations from original plan (and why)
4. Link the PR to the ticket (auto via magic words in commits, or explicit PR body reference)

## Completion

1. Update story: mark tasks \`[x]\`, fill Dev Agent Record
2. Update \`${o}/state.yaml\`: story — \`review\`
3. Sync any new decisions/notes from the Dev Agent Record to the ticket (as a comment, never overwrite body)

## Checkin — parallel-sprint mode

If this session is a Story Leader (i.e. \`${a}/WORKTREE\` exists OR this worktree's path appears in sprint.stories.{key}.worktree), post a \`dev-done\` check-in and HALT awaiting Lead approval:

\`\`\`bash
bash \${project_root}/${a}/scripts/checkin.sh post {story-key} dev-done
\`\`\`

Then tell the user in the worktree session:

> "dev-done check-in posted. Waiting for the Lead Dev to approve in the main project (\`/aped-lead\`). This session will receive \`/aped-review {story-key}\` automatically via tmux send-keys once approved (or the user can run it manually)."

**STOP. Do not continue to /aped-review yourself.**

## Next Step — classic mode only

If this is NOT a parallel-sprint worktree session, tell the user: "Story implementation complete. Run \`/aped-review\` to review, or \`/aped-dev\` to start the next story."

**Do NOT auto-chain.** The user (or the Lead in parallel mode) decides when to proceed.

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
argument-hint: "[story-key]"
disable-model-invocation: true
license: MIT
metadata:
  author: yabafre
  version: ${c.cliVersion || '1.7.1'}
---

# APED Review — Adversarial Code Review

You are the **Lead Reviewer**. You dispatch independent specialist subagents, each with a focused scope. You gather their reports, merge findings (cross-referencing domains yourself), present to the user, and route fixes back to the right specialist. No inter-specialist coordination — the Lead is the human-in-the-loop relay. This is lighter than a full agent-team and keeps review focused on validation.

## Critical Rules

- MINIMUM 3 findings across the team — if you found fewer, specialists didn't look hard enough. Re-dispatch.
- NEVER skip the git audit — it catches undocumented file changes
- NEVER change story status without user approval
- Review is binary: \`review\` → \`done\` (or stays \`review\` until findings addressed)
- Do not rubber-stamp. The team's job is to find problems, not to validate.

## Step 1: Setup

1. **Worktree Mode Detection** — if \`${a}/WORKTREE\` exists, read the marker and:
   - Use its \`story_key\` instead of scanning state.yaml
   - Read the canonical state.yaml from the marker's \`project_root\`
2. Read \`${a}/config.yaml\` — extract config (\`git_provider\`, \`ticket_system\`)
3. Read \`${o}/state.yaml\` — resolve the target story:
   - If the user passed \`{story-key}\` as argument, use it
   - Else if in worktree mode, use the marker's story
   - Else find the first story with status \`review\`
   - If none found: report "No stories pending review" and stop

## Step 1b: Parallel Review Capacity

Before spinning up specialists, check \`sprint.review_limit\` (default 2) against current reviews:

\`\`\`
reviews_running = count(stories where status == "review" AND story_key != this one)
\`\`\`

If \`reviews_running >= review_limit\`:
- Update this story's status to \`review-queued\` in state.yaml
- Post a comment on the ticket (if applicable): "Review capacity reached — queued."
- Tell the user: "Review queue is full (\`{running}\`/\`{limit}\`). This story is \`review-queued\`. Re-run \`/aped-review {story-key}\` when a slot frees (see \`/aped-status\`)."
- STOP — do not dispatch specialists.

Otherwise, continue to Step 2. (Do NOT change status yet; it stays \`review\` until either \`done\` or queued again.)

## Step 2: Load Context

Load everything the team will need:

1. **Story file** — \`${o}/stories/{story-key}.md\`
2. **Ticket** (if \`ticket_system\` != \`none\`) — fetch via CLI
   - Read title, body, labels, **all comments** (comments may contain clarifications or decisions made during dev)
   - If ticket body diverges from story ACs: flag it to the user before proceeding
3. **Epic context** — \`${o}/epic-{N}-context.md\` if exists (the cache from \`/aped-dev\`)
4. **Architecture** — \`${o}/architecture.md\` if exists (for pattern compliance checks)
5. **UX spec** — \`${o}/ux/\` if exists (for frontend stories)

## Step 3: Task Tracking

\`\`\`
TaskCreate: "Setup + context load"
TaskCreate: "Story classification"
TaskCreate: "Dispatch specialist team"
TaskCreate: "Merge findings"
TaskCreate: "Present to user + gate"
TaskCreate: "Apply fixes"
TaskCreate: "Re-verify"
TaskCreate: "Update ticket + state"
\`\`\`

## Step 4: Story Classification

As the Lead, analyze the story's File List to determine which specialists to dispatch.

Detect categories:
- **backend** — \`apps/api/\`, \`apps/server/\`, \`services/\`, \`packages/*/src/\`, \`.py\`, \`.go\`, \`.rs\`, \`.java\`, business logic files
- **frontend** — \`.tsx\`, \`.jsx\`, \`.vue\`, \`.svelte\`, \`apps/web/\`, \`src/pages/\`, \`src/components/\`
- **devops** — \`.github/workflows/\`, \`Dockerfile\`, \`docker-compose\`, \`terraform/\`, \`k8s/\`, \`cdk/\`, infra code
- **fullstack** — story spans 2+ layers (e.g., an API + its consumer UI). Dispatch a fullstack agent to check integration.

A story can trigger multiple specialists. Example:
- Backend-only story: \`AC-validator\` + \`code-quality\` + \`backend-specialist\` + \`git-auditor\`
- Frontend-only story: \`AC-validator\` + \`code-quality\` + \`frontend-specialist\` + \`visual-reviewer\` + \`git-auditor\`
- Fullstack story: add \`fullstack-specialist\` on top of backend + frontend

## Step 5: Dispatch Specialists (subagents, no team)

Review is a set of **independent validations**: each specialist audits its scope, reports to the Lead. There is no real-time cross-specialist negotiation — the Lead merges findings and does the cross-referencing. This keeps the workflow simple and scalable, and avoids Claude Code's experimental agent-teams mode (which puts each teammate in a tmux pane — unreadable beyond ~3 agents).

### Dispatch pattern — parallel subagents

All selected specialists are spawned in a **single message, in parallel**, via the \`Agent\` tool. **No** \`team_name\`, **no** \`TeamCreate\`, **no** \`SendMessage\`. Their findings return to the Lead as tool results; the Lead handles cross-cutting concerns in Step 6 (Merge Findings).

### Who to dispatch

Always:
- **Eva** (ac-validator)
- **Marcus** (code-quality)
- **Rex** (git-auditor)

Plus conditionals by file surface:
- If backend files: **Diego**
- If frontend files: **Lucas** (and **Aria** if a preview app is present)
- If infra files: **Kai**
- If the story spans ≥ 2 layers: **Sam**

Dispatch them all in one message. No parallelism cap — subagents don't render in tmux panes, Claude Code streams their progress inline.

### Specialist personas

Each specialist has a **persona** (name + defining trait). Include the persona in the agent's prompt — it keeps them focused and in character.

### Core Specialists (always dispatched)

**ac-validator** — **Eva**, QA Lead — "I trust nothing without proof in the code."
- \`subagent_type: "feature-dev:code-explorer"\`
- For each AC: search code for evidence. Rate IMPLEMENTED / PARTIAL / MISSING with file:line
- For each \`[x]\` task: find proof. No evidence = **CRITICAL**

**code-quality** — **Marcus**, Staff Engineer, 15 years experience — "Security and performance are non-negotiable."
- \`subagent_type: "feature-dev:code-reviewer"\`
- Focus: security (injection, auth, secrets), performance (N+1, memory), reliability (errors, edge cases), test quality

**git-auditor** — **Rex**, Code Archaeologist — "Every commit tells a story."
- \`subagent_type: "general-purpose"\`
- Runs \`bash ${a}/aped-review/scripts/git-audit.sh\`
- Reports out-of-scope changes and missing expected changes

### Conditional Specialists (by file surface)

**backend** — **Diego**, Senior Backend Engineer, distributed systems — "Data integrity is sacred." (if backend files)
- \`subagent_type: "feature-dev:code-reviewer"\`
- API contracts, validation at boundaries, transaction integrity, DB schema, auth middleware
- Compliance with architecture.md

**frontend** — **Lucas**, Senior Frontend Engineer, a11y advocate — "Consistency is kindness." (if frontend files)
- \`subagent_type: "feature-dev:code-reviewer"\`
- Component hierarchy, state management, accessibility, forms, loading/error/empty states
- Compliance with UX spec

**visual** — **Aria**, Design Engineer — "Pixel-perfect or nothing. I live in the devtools." (if frontend + preview app)
- \`subagent_type: "general-purpose"\`
- **Ownership**: dev already ran React Grab at each GREEN (see \`aped-dev\` § Frontend Detection). Aria's job is to **validate** that work, not redo it from scratch.
- **Validate**: design-spec compliance (tokens, spacing, typography), cross-screen consistency, edge cases dev may have skipped (loading / empty / error / disabled states), responsive behaviour
- **Re-inspect with React Grab only when**: dev flagged an unresolved visual issue, a design-spec violation is suspected, or a cross-component consistency check is needed
- **If React Grab MCP is unavailable**: fall back to static screenshots + code review; explicitly note in the report that a deep visual audit wasn't possible (do not silently pass)

**devops** — **Kai**, Platform Engineer, on-call veteran — "If it's not automated, it's not done." (if infra files)
- \`subagent_type: "feature-dev:code-reviewer"\`
- CI/CD security, IaC least privilege, container hardening, deployment safety

**fullstack** — **Sam**, Tech Lead, system thinker — "I see the pipeline, not the layers." (if story spans 2+ layers)
- \`subagent_type: "feature-dev:code-explorer"\`
- End-to-end data flow, contract alignment, auth propagation across layers

### Specialist report contract

Each specialist returns its findings in this shape — no coordination tax, just a clean report:

\`\`\`markdown
## {specialist-name} Report

### Findings
- [SEVERITY] Description [file:line]
  - Evidence: {what was inspected / what's missing}
  - Suggested fix: {how}

### Summary
- Checked: {scope}
- Verdict: APPROVED | CHANGES_REQUESTED
- Confidence: HIGH | MEDIUM | LOW
- Open questions for Lead: {if any, e.g. "Should validation also run on admin endpoints? See Diego's finding #2."}
\`\`\`

### Lead's role

You (the Lead) receive all specialist reports as tool results. Your job in Step 6:
- Merge duplicate findings (same issue flagged by multiple specialists → one entry with combined evidence)
- **Cross-reference** domains manually — if Diego flagged a typing gap and Lucas flagged a contract mismatch, they're likely the same issue. You're the human-in-the-loop relay, not SendMessage.
- Pull "Open questions" forward — answer them with user input when needed, or redispatch a specialist with sharper instructions.

## Step 6: Merge Findings

As the Lead, collect all specialist reports and merge:

1. **Deduplicate** — same issue flagged by multiple specialists = one finding (mention all perspectives in evidence)
2. **Cross-reference** — if backend says "API returns unknown" and frontend says "no type for delete response", they're the same issue
3. **Prioritize** — CRITICAL > HIGH > MEDIUM > LOW
4. **Verify minimum 3** — if total findings across team < 3, **re-dispatch** the most relevant specialist with stricter instructions ("look harder at edge cases, error handling, security surface")
5. **Check ticket comments** — if a team member commented on the ticket about a known limitation, don't re-flag it as a finding; note it as "acknowledged"

## Step 7: Present Report to User

Format the final report:

\`\`\`markdown
## Review Report — {story-key}

**Ticket:** {ticket-id}
**Specialists dispatched:** {list}
**Total findings:** {N} ({critical}/{high}/{medium}/{low})
**Verdict:** APPROVED | CHANGES_REQUESTED

### Findings

#### Critical / High
- [SEVERITY] Description [file:line]
  - Evidence: {summary}
  - Suggested fix: {approach}
  - Source: {specialist name}

#### Medium / Low
- ...

### Ticket sync
- {summary of ticket comments referenced or new info added}
\`\`\`

⏸ **GATE: User decides per finding — fix now / dismiss.** Do NOT change status.

## Step 8: Apply Fixes

For findings the user wants fixed:

- **Simple fix** (< 20 lines, single file, ownership clear): Lead applies directly.
- **Cross-specialist fix** (finding touches another domain, or ownership ambiguous): Lead redispatches the affected specialist as a subagent asking "Does this approach break anything you own? Confirm or propose a fix." Apply only after the specialist's answer arrives.
- **Complex fix** (multi-file, architectural): Lead re-dispatches the relevant specialist as a fix agent with the finding + suggested approach. Specialist applies the fix and reports back.

Rule of thumb: if a specialist raised the finding, the Lead either applies the fix alone (if clearly scoped) or loops that specialist back in as a one-shot subagent for a sanity check.

After each fix: run tests. Commit: \`fix({ticket-id}): description of fix\`

## Step 9: Re-Verify

After all fixes applied:
- Re-dispatch the specialists that flagged the fixed findings — they verify the fix is correct and no new issues introduced
- If any specialist reports the fix is incomplete or introduces a regression: loop back to Step 8

## Step 10: Status Decision

Binary transition:
- All findings resolved (fixed or dismissed) → story \`done\`
- Unresolved findings remain → story stays \`review\`

## Step 11: Update Remote (ticket + PR)

Do this BEFORE local state — remote failures are recoverable, but state.yaml getting ahead of reality is not.

If \`ticket_system\` != \`none\`: post the review report as a comment on the ticket.

If story → \`done\`:
1. Approve/merge the PR (adapt to \`git_provider\`)
2. Move ticket to **Done**
3. Delete the feature branch (see "Worktree cleanup" below — different commands in parallel-sprint mode vs classic)

If story stays \`review\`:
1. Post each finding as a PR comment with line anchor
2. Ticket stays **In Review**

### Worktree cleanup (\`done\` only, parallel sprint)

If this review ran inside a worktree (marker \`${a}/WORKTREE\` exists), bundle the cleanup:

- **workmux detected** (\`command -v workmux\`) → one-shot: \`workmux merge\` merges the branch, removes the worktree, closes its tmux window, and deletes the local branch in a single command. Recommend it to the user rather than running the three steps yourself.
- **workmux absent** → call the fallback: \`bash \${project_root}/${a}/scripts/worktree-cleanup.sh \${worktree_path} --delete-branch\` (run from the main project, not the worktree).

In classic (non-parallel) mode, just delete the feature branch as usual.

## Step 12: Update Local State

1. Update story file: Dev Agent Record → Review Record (findings, outcome, specialists)
2. Update \`${o}/state.yaml\`: story → \`done\` or stays \`review\`

## Step 13: Next Step

Specialists were dispatched as plain subagents — no team to tear down.

### Parallel-sprint checkin (only when story → done inside a worktree)

If this session is a Story Leader (\`${a}/WORKTREE\` exists OR the worktree path is registered in sprint.stories.{key}) AND the story just flipped to \`done\`, post a \`review-done\` check-in so the Lead can verify and recommend cleanup:

\`\`\`bash
bash \${project_root}/${a}/scripts/checkin.sh post {story-key} review-done
\`\`\`

No HALT — the story is finished. The Lead picks up the check-in and tells the user what to do next (typically \`workmux merge\` inside this window, or the scripted fallback).

If the story stayed \`review\`, do NOT post a check-in — the user stays in control and will re-invoke /aped-review after fixing.

### Next Step messaging

If story → \`done\`:
- In parallel mode: "review-done check-in posted. Wait for \`/aped-lead\` to confirm cleanup instructions."
- Classic mode: "Run \`/aped-story\` to prepare the next story."
- Sprint complete: report completion.

If story stays \`review\`:
- "Fix the remaining findings, then re-run \`/aped-review\`."

**Do NOT auto-chain.** The user decides when to proceed.

## Example

Story: \`1-2-contract-package-scaffold\` (backend + shared packages)

Classification: backend files only
Dispatched: \`ac-validator\`, \`code-quality\`, \`backend-specialist\`, \`git-auditor\` (4 agents in parallel)

Reports return:
- ac-validator: 6 ACs, 5 IMPLEMENTED + 1 PARTIAL (build hang unrelated)
- code-quality: 2 HIGH (DoS via unbounded password, missing .output())
- backend-specialist: 1 HIGH (path traversal in filename), 1 MEDIUM (phantom deps)
- git-auditor: clean

Lead merges: 3 HIGH + 1 MEDIUM. Minimum met.

User: "Fix all HIGH, dismiss the MEDIUM."
→ Lead applies 2 simple fixes, re-dispatches backend-specialist for the path traversal fix
→ All specialists re-verify → clean → story \`done\`
→ Ticket comment posted, PR merged, state updated
→ "Run /aped-story for the next."

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

The preview app (\`${o}/ux-preview/\`) IS the source of truth for downstream skills. Use React Grab to inspect it rather than static screenshots.

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

The epics phase reads \`${o}/ux/\` (all 4 spec files) and inspects the live preview app via React Grab to enrich stories with:
- Component references (which component to use, which props)
- Screen references from the live preview app
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

Live dashboard for the pipeline and parallel sprint. Read-only — never writes, never changes status.

## Setup

1. Read \`${a}/config.yaml\` — extract \`communication_language\`, \`ticket_system\`, \`git_provider\`
2. Read \`${o}/state.yaml\` — pipeline + sprint state (active_epic, parallel_limit, review_limit, stories with their \`status\`, \`worktree\`, \`depends_on\`, \`ticket\`)
3. Read \`${a}/aped-status/references/status-format.md\` for display conventions
4. Probe optional tooling once: \`command -v workmux >/dev/null\` — if available, surface a "Live agents: \`workmux dashboard\`" hint in the header so the user knows where the fuller TUI view is.

## 1. Pipeline Overview

\`\`\`
Pipeline: A[✓] → P[✓] → UX[✓] → Arch[✓] → E[✓] → Sprint[▶]
\`\`\`

Show the output path of each completed phase.

## 2. Sprint Header

\`\`\`
Active epic:  1 — Foundation & Validators
Parallel:     2/3 in-progress      (limit: parallel_limit)
Reviews:      1/2 running          (limit: review_limit)
Queued:       1 story in review-queued
Scope change: locked | active      (scope_change_active flag)
Live agents:  workmux dashboard    (only shown if workmux is installed)
\`\`\`

## 3. Active Worktrees

For each story with \`status in {in-progress, review-queued, review}\` AND a non-null \`worktree\`:

\`\`\`
../cloudvault-KON-82  [1-1-zod-validators]   in-progress
  Branch: feature/KON-82-zod-validators
  Ticket: KON-82 · In Progress
  Last commit: 18m ago — "feat(zod): add user schema"
  Tests: ✓ 24/24 passing
  Started: 2h 12m ago
\`\`\`

Gather this by:
- \`git -C {worktree} log -1 --format='%ar — %s'\` for last commit
- \`git -C {worktree} status --porcelain | wc -l\` for dirty count
- If a \`package.json\` with a \`test\` script is present and the last test log is fresh (< 10 min old), report cached test status; otherwise mark \`tests: unknown\` (don't re-run tests from /aped-status)
- Ticket status via \`gh\`/\`glab\`/linear as per \`ticket_system\`

For stories in \`review\`, also show:
\`\`\`
  Review: 5 findings (HIGH×2, MEDIUM×2, LOW×1) · specialists: Eva, Marcus, Rex, Diego
\`\`\`

Read these from the story file's Review Record (no live specialist spawning here).

## 4. Review Queue

\`\`\`
Queue (waiting for a slot):
  1-3-rpc-package    queued 8m  · KON-84
\`\`\`

Sorted by time in queue.

## 4b. Lead Check-ins Pending

Run \`bash ${a}/scripts/checkin.sh poll --format json\` and show any pending entries:

\`\`\`
Check-ins awaiting Lead Dev approval (2):
  1-2-contract      dev-done     posted 4m
  1-4-handlers      story-ready  posted 1m
\`\`\`

If non-empty, add a hint: "Run \`/aped-lead\` to batch-process these."

## 5. Ready to Dispatch

Stories with \`status == pending | ready-for-dev\` whose \`depends_on\` are all \`done\`:

\`\`\`
Ready to dispatch (DAG resolved):
  1-4-handlers        [M]  no deps remaining
  1-5-client-hooks    [S]  no deps remaining

Blocked:
  1-6-e2e-tests       waiting on 1-4, 1-5
\`\`\`

## 6. Done This Sprint

\`\`\`
Done (epic 1):
  ✓ 1-1-zod-validators  · merged 1d ago
\`\`\`

## 7. Ticket Sync Check (if ticket_system != none)

For each story with a ticket, compare local status to remote:

| Local | Remote expected |
|-------|-----------------|
| pending / ready-for-dev | Backlog / Todo |
| in-progress | In Progress |
| review-queued / review | In Review |
| done | Done |

If divergent, surface: \`⚠ 1-2 local=in-progress, ticket=Done — investigate\`. Do not fix automatically.

## 8. Suggested Next Actions

Pick the most useful next step:

- If \`parallel < parallel_limit\` AND \`ready_to_dispatch\` non-empty → "Run \`/aped-sprint\` to dispatch \`{N}\` more stories."
- If stories in \`review\` AND \`reviews < review_limit\` → "Run \`/aped-review {key}\` in its worktree."
- If stories queued AND capacity available → "A slot is free. Re-run \`/aped-review\` on the queued story."
- If everything done in active epic → "Epic \`{N}\` complete. Set \`sprint.active_epic\` to the next epic and re-run \`/aped-sprint\`."
- If pipeline not yet at sprint phase → show the phase-appropriate suggestion (\`/aped-analyze\`, \`/aped-prd\`, ...).

## Output

Display only — no writes, no state changes. Suggest commands but never run them.

## Classic Mode (no parallel sprint)

If \`sprint.active_epic\` is \`null\` or no story has a \`worktree\` field set, fall back to the simpler pre-parallel display:

\`\`\`
Epic 1: User Auth        [████████░░] 80% (4/5)
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
argument-hint: "[description of the change]"
disable-model-invocation: true
license: MIT
metadata:
  author: yabafre
  version: ${c.cliVersion || '1.7.1'}
---

# APED Correct Course — Managed Pivot

Use when requirements change, priorities shift, or the current approach needs rethinking mid-pipeline. During a parallel sprint this is the **only** way to modify upstream docs (PRD, architecture, UX) — the \`upstream-lock\` hook blocks all other attempts.

## Setup

1. Read \`${a}/config.yaml\` — extract config (incl. \`ticket_system\`, \`git_provider\`)
2. Read \`${o}/state.yaml\` — understand current pipeline state
3. Read existing artifacts: brief, PRD, epics, stories
4. Read \`${a}/aped-course/references/scope-change-guide.md\` for impact matrix and process

## Active-Worktree Check (parallel sprint awareness)

Before touching any artifact, identify stories whose \`status\` is in \`{in-progress, review-queued, review}\` AND that have a non-null \`worktree\` — these are the sessions that will be impacted.

Source of truth: \`state.yaml\`. Cross-check: if \`command -v workmux\` succeeds, also run \`workmux list --format json\` (or the plain \`workmux list\` if json isn't supported) to confirm each state.yaml worktree is actually open. If a worktree is in state.yaml but workmux doesn't know about it, the session was likely closed without marking the story \`done\` — flag it to the user as a stale entry and ask whether to drop the \`worktree\` field.

If any exist:
1. List them to the user with their branches + tickets.
2. ⏸ **GATE:** "Continuing will invalidate epic context caches used by those worktrees. Proceed?"
3. On confirmation, post a notification comment on each active ticket (via \`gh\`/\`glab\`/linear per \`ticket_system\`):
   > "APED scope change in progress. Please pause your next commit until the update lands. A follow-up comment will confirm when it's safe to refresh your epic context and continue."
4. Write \`sprint.scope_change_active: true\` in state.yaml (atomic — use \`${a}/scripts/sync-state.sh set-scope-change true\` if present, else direct edit under flock).

If no active worktrees: skip this section entirely.

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

## Release the Upstream Lock (parallel sprint only)

If you set \`scope_change_active: true\` at the start, you MUST clear it before handing control back:

1. Invalidate any now-stale epic-context caches — delete \`${o}/epic-*-context.md\` for the affected epic(s) so \`/aped-dev\` recompiles on the next story.
2. Set \`sprint.scope_change_active: false\` in state.yaml (atomic).
3. Post a follow-up comment on each previously notified ticket:
   > "Scope change applied. If you're in an active worktree, pull the latest \`${o}/\` artefacts and restart your story loop — the epic-context cache has been invalidated."

If you skip step 2, upstream writes remain unlocked — a real security issue, not a cosmetic one. Do not exit the skill with the lock still open.

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
argument-hint: "[story-key]"
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
argument-hint: "<title> [fix|feature|refactor]"
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
allowed-tools: "Read Grep Glob Bash"
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
    // ── aped-claude ──────────────────────────────────────────
    {
      path: `${a}/aped-claude/SKILL.md`,
      content: `---
name: aped-claude
description: 'Updates CLAUDE.md with APED working rules, project config, and session patterns. Merges with existing content — never overwrites user customizations. Use when user says "update CLAUDE.md", "sync claude rules", "aped claude", or invokes /aped-claude.'
license: MIT
metadata:
  author: yabafre
  version: ${c.cliVersion || '1.7.1'}
---

# APED Claude — CLAUDE.md Sync

Inject and maintain APED working rules in the project's \`CLAUDE.md\`. Smart merge — never overwrites user customizations.

## Critical Rules

- NEVER overwrite the entire CLAUDE.md — always merge
- Use marker comments to delimit APED-managed sections: \`<!-- APED:START -->\` and \`<!-- APED:END -->\`
- User content outside markers is sacred — never touch it
- Discuss with the user before applying changes if CLAUDE.md is non-trivial

## Setup

1. Read \`${a}/config.yaml\` — extract \`project_name\`, \`user_name\`, \`communication_language\`
2. Check if \`CLAUDE.md\` exists at the project root

## Mode Detection

### Case A: No CLAUDE.md exists
- Create one from scratch with the full APED block (see Template below)
- Wrap the entire APED content in \`<!-- APED:START -->\` ... \`<!-- APED:END -->\` markers
- Add a header line and brief project description above the markers

### Case B: CLAUDE.md exists with APED markers
- Locate the \`<!-- APED:START -->\` and \`<!-- APED:END -->\` block
- Replace ONLY the content between markers with the latest APED block
- Leave everything else untouched

### Case C: CLAUDE.md exists WITHOUT APED markers
- Show the user the current CLAUDE.md content
- Ask: "Where should I inject the APED section? Options:"
  - **Top** — before existing content
  - **Bottom** — after existing content
  - **Custom** — point to a specific heading to insert before/after
- ⏸ GATE: Wait for user choice
- Insert the APED block (wrapped in markers) at the chosen location

## APED Block Template

The block to inject (between \`<!-- APED:START -->\` and \`<!-- APED:END -->\`) contains:

### Section 1: Project Header
- Project name from config
- One-line description: "Uses the APED Method — disciplined user-driven dev pipeline"
- Pipeline diagram: \`Analyze → PRD → UX → Architecture → Epics → Story → Dev → Review\`

### Section 2: Working Rules

**1. Plan Mode Default**
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

**2. Subagent Strategy**
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

**3. Self-Improvement Loop**
- After ANY correction from the user: update \`${o}/lessons.md\` with the pattern
- Write rules for yourself that prevent the same mistake
- Review lessons at session start

**4. Verification Before Done**
- Never mark a task complete without proving it works
- Run tests, check logs, demonstrate correctness
- Ask: "Would a staff engineer approve this?"

**5. Demand Elegance (Balanced)**
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: implement the elegant solution
- Skip for simple, obvious fixes — don't over-engineer

**6. Autonomous Bug Fixing**
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them

### Section 3: APED-Specific Rules

**7. Never Auto-Chain Phases** — Each APED skill ends with "Run /aped-X when ready". STOP. Wait for user.

**8. Validate Before Persisting** — Never write artifacts to \`${o}/\` until the user has explicitly validated.

**9. Story-Driven Dev** — Never code without a story file. Use \`/aped-story\` first. Use the epic context cache.

**10. Frontend = Visual Verification** — Detect frontend stories. Use \`mcp__react-grab-mcp__get_element_context\` at every GREEN pass.

### Section 4: Task Management
1. **Plan First** — TaskCreate with checkable items
2. **Verify Plan** — Check in with user before implementation
3. **Track Progress** — TaskUpdate as you complete items
4. **Document Results** — Update story file's Dev Agent Record
5. **Capture Lessons** — Update \`${o}/lessons.md\` after corrections

### Section 5: Core Principles
- **Simplicity First** — minimal code impact
- **No Laziness** — root causes, no temporary fixes
- **User Controls Pace** — collaborative, not automated
- **Quality > Speed** — validation gates exist for a reason

### Section 6: Project State
- Engine: \`${a}/\` (immutable after install)
- Artifacts: \`${o}/\` (evolves during project)
- State machine: \`${o}/state.yaml\`
- Lessons: \`${o}/lessons.md\`
- Project: {{project_name}} ({{user_name}}, {{communication_language}})

### Section 7: Slash Commands Cheat Sheet

| Pipeline | Utility |
|----------|---------|
| /aped-analyze | /aped-status |
| /aped-prd | /aped-course |
| /aped-ux | /aped-context |
| /aped-arch | /aped-qa |
| /aped-epics | /aped-quick |
| /aped-story | /aped-check |
| /aped-dev | /aped-claude |
| /aped-review | |

## Lessons File

Also ensure \`${o}/lessons.md\` exists. If missing, create it with the template:

\`\`\`markdown
# Lessons Learned

Patterns from user corrections — so the same mistake isn't made twice.

## Format
- **Date:** YYYY-MM-DD
- **Mistake:** What I did wrong
- **Correction:** What the user told me
- **Rule:** The pattern to apply going forward

## Entries

<!-- Add new entries at the top -->
\`\`\`

## Discussion with User

Before writing, present a summary:
- "Will create CLAUDE.md from scratch" (Case A)
- "Will update existing APED block (lines X-Y)" (Case B)
- "Will inject APED block at the {location}" (Case C)

⏸ **GATE: User confirms before any write.**

## Output

1. Write/update \`CLAUDE.md\` with the APED block in markers
2. Ensure \`${o}/lessons.md\` exists
3. Report what changed (lines added/updated)

## Common Issues

- **CLAUDE.md has conflicting rules**: Discuss with user — APED rules vs existing rules. User decides which wins.
- **CLAUDE.md is huge (>500 lines)**: Show only the diff, not the full file. Confirm before write.
- **User wants to remove APED block**: Just delete the markers and content between them. The skill won't re-add unless explicitly invoked.

## Next Step

Tell the user: "CLAUDE.md updated. APED block is now at lines X-Y. Re-run \`/aped-claude\` anytime to refresh after APED updates."
`,
    },
    // ── aped-lead ────────────────────────────────────────────────
    {
      path: `${a}/aped-lead/SKILL.md`,
      content: `---
name: aped-lead
description: 'Lead Dev hub for parallel sprints. Batch-processes Story Leader check-ins (story-ready, dev-done, review-done), auto-approves what is safe, escalates what needs user attention, and pushes the next command into each worktree. Use when user says "lead", "check approvals", "aped lead", or invokes /aped-lead. Runs from the MAIN project, not a worktree.'
disable-model-invocation: true
license: MIT
metadata:
  author: yabafre
  version: ${c.cliVersion || '3.4.4'}
---

# APED Lead — Parallel-Sprint Coordinator

You are the **Lead Dev**. Story Leaders running in worktrees post check-ins at every transition (story-ready, dev-done, review-done). Your job is to batch-process those, approve what's safe, escalate what isn't, and push the next step back to each worktree.

## Critical Rules

- Only run from the **main project root**. If \`${a}/WORKTREE\` exists in CWD, HALT — you're inside a worktree, not the Lead.
- NEVER approve a check-in whose auto-approve criteria (below) aren't all satisfied. Escalate instead.
- NEVER silently change state.yaml or ticket status — every mutation is mirrored by a \`${a}/scripts/checkin.sh\` call so the audit trail stays in one place.
- Auto-approve is **programmatic**, not vibes. Run the checks, compute the verdict, don't hallucinate.
- When in doubt: escalate.

## Setup

1. Verify you are in the main project root: \`ls ${a}/WORKTREE\` must fail. If it succeeds, HALT.
2. Read \`${a}/config.yaml\` — extract \`ticket_system\`, \`git_provider\`.
3. Read \`${o}/state.yaml\` — load \`sprint.stories\` (DAG, worktrees, statuses).
4. Run \`bash ${a}/scripts/checkin.sh poll --format json\` — this is the list of pending check-ins.
5. If empty: report "No pending check-ins." and STOP.

## Auto-Approve Criteria (hard, programmatic)

For each pending check-in, classify as **AUTO** or **ESCALATE** using these rules only.

### story-ready  (posted by /aped-story)
Resolve the story's worktree first: \`WT = sprint.stories.{key}.worktree\` in state.yaml. The story file lives on the feature branch inside \`$WT\`, not in main.

AUTO iff all of:
- \`$WT/${o}/stories/{story-key}.md\` exists (read via \`git -C $WT show HEAD:${o}/stories/{story-key}.md\` or directly from the worktree path).
- Story file has a numbered Acceptance Criteria section with ≥ 1 GIVEN/WHEN/THEN.
- The feature branch has the story file committed: \`git -C $WT log --oneline -- ${o}/stories/{story-key}.md\` returns at least one commit.
- Every key in \`depends_on\` has \`status: done\` in state.yaml.
- If \`ticket_system != none\`: fetch the ticket; title + body are present; no comment posted after the checkin mentions an unresolved question (regex: \`\`\`?\`\`\`, \`TBD\`, \`need clarification\`).

ESCALATE otherwise. Typical reasons: worktree missing from state.yaml (sprint bypassed), story file absent (user skipped /aped-story or is still drafting), file exists but uncommitted, deps not done, ACs malformed, ticket/story divergence.

### dev-done  (posted by /aped-dev)
AUTO iff all of:
- Latest commit on the story's branch has a successful \`run-tests.sh\` exit (check \`.aped/.last-test-exit\` in the worktree, or run tests if stale: \`bash \${worktree}/${a}/aped-dev/scripts/run-tests.sh --silent\`).
- Every task in \`${o}/stories/{story-key}.md\` under "Tasks" is checked (\`[x]\`).
- No HALT logs in the Dev Agent Record (\`grep -i 'HALT' \${worktree}/${o}/stories/{story-key}.md\` returns nothing).
- \`git -C {worktree} status --porcelain\` is empty (clean working tree).
- File list in the story matches the changes: \`bash ${a}/aped-review/scripts/git-audit.sh \${worktree}/${o}/stories/{story-key}.md --silent\` exits 0.

ESCALATE otherwise. Typical reasons: test failures, HALT logs, unchecked tasks, file-list mismatch.

### review-done  (posted by /aped-review when story → done)
AUTO iff all of:
- Story status in state.yaml is \`done\` (the review skill only posts this check-in after converging).
- No \`aped-blocked-*\` label on the ticket (if applicable).
- PR is mergeable (\`gh pr view --json mergeable | jq -r .mergeable\` == "MERGEABLE", or equivalent).

ESCALATE otherwise.

## Batch Processing

For each pending check-in, compute a verdict.

Present a compact dashboard:

\`\`\`
Pending check-ins (4):
  ✓ 1-2-contract   story-ready   AUTO    (ACs OK, deps 1-1 ✓, ticket aligned)
  ⚠ 1-3-rpc        dev-done       ESCALATE (2 tests failing in router.spec.ts)
  ✓ 1-4-handlers   story-ready   AUTO    (ACs OK, deps 1-2 ✓)
  ⚠ 1-5-hooks      review-done    ESCALATE (PR has conflicts with main)
\`\`\`

⏸ **GATE: User confirms the batch.**

Offer three actions:
- **Approve all AUTO (2)** — apply auto-approvals, skip escalations.
- **Approve all (including escalations)** — user takes responsibility, full batch.
- **Drill down on {story-key}/{kind}** — see the failing checks for that specific one.

Default: **Approve all AUTO**. The user can override.

## Applying Approvals

For each approved check-in:

1. \`bash ${a}/scripts/checkin.sh approve {story-key} {kind}\`
2. Determine the follow-up command for the worktree:
   - \`story-ready\` → \`/aped-dev {story-key}\`
   - \`dev-done\`    → \`/aped-review {story-key}\`
   - \`review-done\` → no follow-up; recommend the user run \`workmux merge\` in the worktree's window (or \`bash ${a}/scripts/worktree-cleanup.sh {worktree-path} --delete-branch\` if workmux is absent).
3. Push it to the worktree's tmux window: \`bash ${a}/scripts/checkin.sh push {story-key} "{follow-up-command}"\`
4. If \`push\` reports tmux absent: tell the user "Story Leader for {story-key} is waiting — re-invoke in its terminal: \`{follow-up-command}\`."

## Applying Blocks (escalations user wants to reject)

For escalations the user rejects, invoke:

\`\`\`bash
bash ${a}/scripts/checkin.sh block {story-key} {kind} "{reason}"
\`\`\`

This labels the ticket \`aped-blocked-{kind}\` and posts a comment. The Story Leader polling will see the block and know to fix before re-posting the check-in.

## Teardown — Done Stories

For every \`review-done\` check-in approved, if story just flipped to \`done\` in state.yaml:
- If a worktree is still listed for the story, recommend cleanup to the user (workmux merge / worktree-cleanup.sh).
- The skill does NOT delete worktrees autonomously — user keeps control of merge order.

## Dispatch Follow-up

After approvals, compute new capacity: how many stories flipped out of \`in-progress\` or \`review\`? If any, remind the user that \`/aped-sprint\` can now dispatch the unblocked stories.

## Edge Cases

- **No pending check-ins**: report and STOP; no side effects.
- **Check-in without a matching state.yaml story**: report a stale inbox entry, ask the user whether to clear it (call \`checkin.sh block\` with reason "stale — story missing").
- **Worktree deleted but check-in pending**: same as above; likely the user merged without approving. Suggest \`block\`.
- **Conflicting responses on the same story/kind**: \`latest_status\` wins — the script is append-only JSONL with "last write wins" semantics.

## Next Step

Tell the user:
> "{N} approved, {M} escalated, {K} blocked. Review any remaining escalations or re-run \`/aped-lead\` after new check-ins land. Use \`/aped-status\` for the sprint dashboard."

**Do NOT auto-chain.** The user decides when to re-run.
`,
    },
    // ── aped-sprint ──────────────────────────────────────────────
    {
      path: `${a}/aped-sprint/SKILL.md`,
      content: `---
name: aped-sprint
description: 'Dispatches multiple stories in parallel via git worktrees. Creates worktrees only — does NOT post story-ready nor flip state.yaml to in-progress. That is /aped-story owning its feature branch. Use when user says "parallel sprint", "dispatch stories", "aped sprint", or invokes /aped-sprint. Only runs inside the main project (not inside an APED worktree).'
disable-model-invocation: true
license: MIT
metadata:
  author: yabafre
  version: ${c.cliVersion || '3.4.4'}
---

# APED Sprint — Parallel Story Dispatch

## Critical Rules

- Only run from the **main project root**. If \`${a}/WORKTREE\` exists in the current dir, HALT (you're inside a worktree, not the Lead).
- Exactly **one active epic** at a time. Refuse if \`sprint.active_epic\` is set to a different epic and that epic still has stories not \`done\`.
- Respect \`sprint.parallel_limit\` and \`sprint.review_limit\` in state.yaml.
- NEVER dispatch a story whose \`depends_on\` list contains a story not yet \`done\`.
- NEVER auto-launch \`/aped-dev\`. The Story Leader's first action in its worktree is always \`/aped-story <story-key>\` — story files belong to the feature branch, never to main.
- NEVER post the \`story-ready\` check-in from this skill. That is \`/aped-story\`'s responsibility once the file is committed on the feature branch.
- NEVER flip \`sprint.stories.{key}.status\` to \`in-progress\` from this skill. Record the worktree path only; status changes are owned by \`/aped-story\` (→ \`ready-for-dev\`) and \`/aped-dev\` (→ \`in-progress\`).

## Setup

1. Verify you are in the main project root: \`ls ${a}/WORKTREE\` must fail. If it exists, tell the user "You're inside a worktree. Switch to the main project to dispatch."
2. Read \`${a}/config.yaml\` — extract \`ticket_system\`, \`git_provider\`, paths.
3. Read \`${o}/state.yaml\` — must have \`current_phase: "sprint"\` and \`sprint.stories\` populated by \`/aped-epics\`.
4. Read \`${o}/epics.md\` — for the DAG and story metadata.
5. If \`sprint.active_epic\` is \`null\`: ask the user which epic to start. Write it to state.yaml.
6. **Detect workmux** (preferred path):
   - \`command -v workmux >/dev/null\` → workmux binary present.
   - \`command -v tmux >/dev/null || command -v wezterm >/dev/null\` → a multiplexer exists. If \`wezterm\` binary is missing from \`$PATH\` but \`$WEZTERM_EXECUTABLE_DIR\` is set, export \`PATH="$WEZTERM_EXECUTABLE_DIR:$PATH"\` for the current shell — workmux shells out to the CLI. Mention this to the user once so they can persist it in \`~/.zshrc\`.
   - If both present → use Path A. Else fall back to Path B.
   - Do NOT reject Path A for cosmetic reasons (flag renames, missing \`.workmux.yaml\`). If syntax differs from what you expect, run \`workmux add --help\` to adapt. The current 0.1.x signature is \`workmux add [OPTIONS] [BRANCH_NAME]\` (positional, no \`--branch\`).

## DAG Resolution

For the active epic, compute the three buckets:

- **done** — status \`done\`
- **running** — status in {\`in-progress\`, \`review-queued\`, \`review\`}
- **ready** — status \`pending\` or \`ready-for-dev\` AND every key in \`depends_on\` is in **done**
- **blocked** — not in the above; surface why (which dep is missing)

Sanity check the graph: no cycles, no references to unknown story keys. If broken, tell the user exactly which edge is the problem and HALT.

## Capacity Check

\`\`\`
slots_available = parallel_limit - len(running)
reviews_running = count(status == "review")
reviews_available = review_limit - reviews_running
\`\`\`

If \`slots_available == 0\`: tell the user "At parallel capacity. Wait for a story to finish review or merge, then re-run \`/aped-sprint\`."

## Story Proposal

Take up to \`slots_available\` stories from **ready**, preferring:
1. Smaller complexity first (S before M before L) — unlocks deps faster
2. Stories that unblock the most other stories (reverse-topological tiebreaker)
3. User override: if the user asked for specific keys, dispatch those (still respecting deps)

Present the proposal:

\`\`\`
Epic: 1 — Foundation & Validators
Active worktrees: 1/3 — will dispatch 2 more.

Proposed dispatch:
  1-2-contract         [S]  no deps          -> new worktree
  1-3-rpc-package      [M]  deps: 1-1 ✓     -> new worktree

Blocked (waiting):
  1-4-handlers         deps: 1-2 (pending)
  1-5-client-hooks     deps: 1-2 (pending)
\`\`\`

⏸ **GATE: User validates the proposal.** If the user wants to swap, reduce, or reorder, adjust and re-present.

## Ticket System Sync (if ticket_system != none)

Read \`${a}/aped-dev/references/ticket-git-workflow.md\` for provider syntax.

For each story to dispatch:
1. Fetch the ticket — verify it exists and no one else is assigned
2. Assign it to the current user
3. Move status to \`In Progress\` (adapt label/status to provider)
4. Post a comment: "APED parallel sprint started — worktree: \`../{project}-{ticket}\`."

## Dispatch

Two paths, picked by the Setup detection. **Neither path posts \`story-ready\` nor flips story \`status\` to \`in-progress\`** — /aped-story (running inside the worktree on the feature branch) owns both transitions.

### Path A — workmux available (preferred)

\`workmux\` creates the worktree, opens a terminal/tmux window, and launches Claude Code idle. The Story Leader's first command will be \`/aped-story <story-key>\`, NOT \`/aped-dev\`.

If \`.workmux.yaml\` is missing at the repo root, bootstrap a minimal one from \`${a}/templates/workmux.yaml.example\` before dispatching. A functional default includes the \`claude\` agent pane, \`.env\` copy, \`node_modules\` symlink, and a \`pnpm install --frozen-lockfile\` post_create — otherwise Story Leaders land in worktrees without deps and fail on \`/aped-story\` ticket fetches or \`/aped-dev\` tests.

For each approved story:

\`\`\`bash
BRANCH="feature/{ticket-id}-{story-key}"
workmux add "$BRANCH" -a claude
\`\`\`

If \`workmux add\` rejects the invocation (API drift), fall back within Path A:

\`\`\`bash
# Create worktree via git, then attach workmux to the existing one
WORKTREE=$(bash ${a}/scripts/sprint-dispatch.sh <story-key> <ticket-id>)
workmux open "$(basename "$WORKTREE")"
\`\`\`

Verify the windows exist before moving on:

\`\`\`bash
workmux list
\`\`\`

Capture the worktree path for the state.yaml write (below): \`git worktree list --porcelain\` filtered by the branch we just created (no \`jq\` dependency).

### Path B — fallback without workmux

For each approved story, call the built-in helper and capture the worktree path:

\`\`\`bash
WORKTREE=$(bash ${a}/scripts/sprint-dispatch.sh <story-key> <ticket-id>)
\`\`\`

The helper creates the worktree, the branch, and the \`${a}/WORKTREE\` marker. The user will open a terminal per worktree manually.

### Shared post-dispatch

If any command exits non-zero, halt the whole dispatch — do not create a half-populated state. Report the error.

After success, update state.yaml **atomically** (one write at the end, not per story) with the **worktree path only**:
- story \`worktree\` → the captured path

Do NOT set \`status: in-progress\` and do NOT set \`started_at\` here. \`/aped-story\` will flip the story to \`ready-for-dev\` when the story file is committed on the feature branch; \`/aped-dev\` will flip it to \`in-progress\` when it starts the TDD loop.

## User Instructions

**Path A (workmux)** — claude sessions are running idle in each window. Tell the user:

\`\`\`
▶ Dispatched 2 stories via workmux. Claude Code is idle in each window.
    1-2-contract   window: feature/KON-83-1-2-contract   ../cloudvault-KON-83
    1-3-rpc        window: feature/KON-84-1-3-rpc        ../cloudvault-KON-84

  Next — in each window, run:
    /aped-story <story-key>

  /aped-story drafts the story file on the feature branch, commits it, and posts
  the story-ready check-in. Then run /aped-lead from this main session to
  approve — the Lead will push /aped-dev into each window via tmux send-keys.

  Monitor: workmux list  ·  workmux dashboard  ·  workmux send <name> "<msg>"
\`\`\`

**Path B (fallback)** — print one block per worktree:

\`\`\`
▶ Story 1-2-contract — KON-83
  Worktree: ../cloudvault-KON-83
  Branch:   feature/KON-83-1-2-contract

  In a new terminal:
    cd ../cloudvault-KON-83
    claude
    /aped-story 1-2-contract      # NOT /aped-dev — story file must live on
                                  # the feature branch, not main
\`\`\`

**In both paths, never suggest running \`/aped-story\` in main.** Branch-per-story is non-negotiable — the story file is committed on the feature branch.

## Edge Cases

- **No active epic**: ask which epic to start; set \`sprint.active_epic\`.
- **All stories blocked by one foundation story**: propose only that foundation story (fan-in).
- **User wants multi-epic**: refuse politely — "APED parallel sprint runs one epic at a time. Finish the current one first, or mark its leftover stories as skipped."
- **A worktree already exists for a proposed story**: skip it (don't overwrite), surface it as "already dispatched".
- **State.yaml lock**: if \`.aped/.state.lock\` exists and is newer than 30s, another skill is writing — wait or warn the user.

## Next Step

After dispatch, tell the user:
> "Worktrees created. **In each worktree's claude session, run \`/aped-story <story-key>\`** — that drafts the story file on the feature branch, commits it, and posts \`story-ready\`. Then come back to this main session and run \`/aped-lead\` to approve the batch — the Lead will push \`/aped-dev\` into each worktree. As stories progress, each Story Leader will post \`dev-done\` and \`review-done\` check-ins; re-run \`/aped-lead\` when \`/aped-status\` shows new pending ones. Come back to \`/aped-sprint\` to dispatch more when capacity frees up."

**Do NOT auto-chain.** The user decides when to proceed.
`,
    },
  ];
}
