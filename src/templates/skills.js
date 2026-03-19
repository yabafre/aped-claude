export function skills(c) {
  const a = c.apedDir;   // .aped  (engine: skills, config, templates)
  const o = c.outputDir; // docs/aped (output: generated artifacts + state)
  return [
    // ── aped-a ──────────────────────────────────────────────
    {
      path: `${a}/aped-a/SKILL.md`,
      content: `---
name: aped-a
description: 'Analyzes a new project idea through parallel market, domain, and technical research. Use when user says "research idea", "aped analyze", or invokes /aped-a. Not for existing codebases — use aped-ctx for brownfield projects.'
license: MIT
metadata:
  author: yabafre
  version: ${c.cliVersion || '1.7.1'}
---

# APED Analyze — Parallel Research to Product Brief

## Critical Rules

- NEVER skip Discovery questions — research quality depends on clear inputs
- ALL 3 agents must complete before synthesis — do not proceed with partial results
- Take your time with synthesis — quality is more important than speed
- Do not skip validation steps

## Setup

1. Read \`${a}/config.yaml\` — extract \`user_name\`, \`communication_language\`, \`ticket_system\`, \`git_provider\`
2. Read \`${o}/state.yaml\` — check \`pipeline.phases.analyze\`
   - If status is \`done\`: ask user — redo analysis or skip to next phase?
   - If user skips: invoke Skill tool with \`skill: "aped-p"\` and stop

## Discovery (2-3 questions max)

Ask the user these questions (adapt to \`communication_language\`):

1. **What are we building?** — Core idea, the product/service in one paragraph
2. **For whom?** — Target users, their pain points, current alternatives
3. **Why now?** — Market timing, technology enabler, competitive gap

Wait for answers before proceeding.

## Task Tracking

Create tasks to track this phase:
\`\`\`
TaskCreate: "Parallel research — Market, Domain, Technical"
TaskCreate: "Synthesize research into product brief"
TaskCreate: "Validate brief"
\`\`\`

## Parallel Research

Read \`${a}/aped-a/references/research-prompts.md\` for detailed agent prompts.

Launch **3 Agent tool calls in a single message** (parallel execution) with \`run_in_background: true\`:

### Agent 1: Market Research
- \`subagent_type: "Explore"\`
- Customer behavior and pain points in the target segment
- Competitive landscape: direct and indirect competitors
- Market size and growth trajectory
- Pricing models in the space
- Use WebSearch for current data

### Agent 2: Domain Research
- \`subagent_type: "Explore"\`
- Industry analysis and key trends
- Regulatory requirements and compliance needs
- Technical trends shaping the domain
- Standards and certifications required
- Use WebSearch for current data

### Agent 3: Technical Research
- \`subagent_type: "Explore"\`
- Technology stack overview and options
- Integration patterns and APIs available
- Architecture patterns for similar products
- Open-source tools and frameworks relevant
- Use WebSearch for current data

Once all 3 agents return, update task: \`TaskUpdate: "Parallel research" → completed\`

## Synthesis

Ensure output directory exists:
\`\`\`bash
mkdir -p ${o}
\`\`\`

Once all 3 agents complete:

1. Fuse research results into a product brief
2. Use template from \`${a}/templates/product-brief.md\`
3. Fill all 5 sections: Executive Summary, Core Vision, Target Users, Success Metrics, MVP Scope
4. Write output to \`${o}/product-brief.md\`

## Validation

\`\`\`bash
bash ${a}/aped-a/scripts/validate-brief.sh ${o}/product-brief.md
\`\`\`

If validation fails: fix missing sections and re-validate.

Update tasks:
\`\`\`
TaskUpdate: "Synthesize research" → completed
TaskUpdate: "Validate brief" → completed
\`\`\`

## State Update

Update \`${o}/state.yaml\`:
\`\`\`yaml
pipeline:
  current_phase: "analyze"
  phases:
    analyze:
      status: "done"
      output: "${o}/product-brief.md"
\`\`\`

## Chain

Invoke Skill tool with \`skill: "aped-p"\` to proceed to PRD phase.

## Example

User says: "I want to build a SaaS for restaurant inventory management"
1. Discovery: ask what, for whom, why now
2. Launch 3 agents: market (restaurant tech), domain (food service regulations), technical (inventory systems)
3. Synthesize into product brief with 5 sections
4. Validate → write to \`${o}/product-brief.md\`

## Common Issues

- **Agent returns empty results**: WebSearch may fail — retry with different keywords, broaden search terms
- **Brief validation fails**: Check which section is missing, fill it from agent results, re-validate
- **User gives vague answers**: Ask follow-up questions before launching research — garbage in = garbage out
`,
    },
    // ── aped-p ──────────────────────────────────────────────
    {
      path: `${a}/aped-p/SKILL.md`,
      content: `---
name: aped-p
description: 'Generates PRD autonomously from product brief. Use when user says "create PRD", "generate PRD", "aped prd", or invokes /aped-p.'
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
   - If user skips: invoke Skill tool with \`skill: "aped-e"\` and stop

## Load Product Brief

- Read brief from path in \`pipeline.phases.analyze.output\`
- If no analyze phase in state: ask user for product brief path or content

## Domain & Project Type Detection

1. Read \`${a}/aped-p/references/domain-complexity.csv\`
   - Match brief content against \`signals\` column
   - If match found: note \`complexity\`, \`key_concerns\`, \`special_sections\`
   - High-complexity domains (healthcare, fintech, govtech, etc.) — mandatory Domain Requirements section
2. Read \`${a}/aped-p/references/project-types.csv\`
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
  - Read \`${a}/aped-p/references/fr-rules.md\` — validate quality
- Non-Functional Requirements (relevant categories only)
  - Format: \`The system shall [metric] [condition] [measurement method]\`

## Validation

\`\`\`bash
bash ${a}/aped-p/scripts/validate-prd.sh ${o}/prd.md
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

## Chain

Ask the user: "Do you want to design the UX before creating epics?"
- If yes: invoke Skill tool with \`skill: "aped-ux"\`
- If no: invoke Skill tool with \`skill: "aped-e"\` to skip directly to Epics

## Example

From a restaurant inventory brief → PRD generates:
- FR1: Manager can add inventory items with name, quantity, and unit
- FR2: Manager can set low-stock thresholds per item
- FR3: System can send alerts when stock falls below threshold
- NFR: The system shall respond to inventory queries within 200ms at p95

## Common Issues

- **FR count too low (<10)**: Brief may lack detail — re-read brief, extract implicit capabilities
- **Anti-pattern words detected**: Replace "easy" with step count, "fast" with time threshold
- **Validation script fails**: Run \`bash ${a}/aped-p/scripts/validate-prd.sh ${o}/prd.md\` — fix reported issues one by one
`,
    },
    // ── aped-e ──────────────────────────────────────────────
    {
      path: `${a}/aped-e/SKILL.md`,
      content: `---
name: aped-e
description: 'Creates epics and stories from PRD with full FR coverage. Use when user says "create epics", "break into stories", "aped epics", or invokes /aped-e.'
license: MIT
metadata:
  author: yabafre
  version: ${c.cliVersion || '1.7.1'}
---

# APED Epics & Stories — Requirements Decomposition

## Critical Rules

- EVERY FR must map to exactly one epic — no orphans, no phantoms
- Epics describe USER VALUE, not technical layers — "User Authentication" not "Database Setup"
- Each story must be completable in 1 dev session — split if >8 tasks
- Quality is more important than speed — do not skip coverage validation

## Setup

1. Read \`${a}/config.yaml\` — extract config including \`ticket_system\`
2. Read \`${o}/state.yaml\` — check pipeline state
   - If \`pipeline.phases.epics.status\` is \`done\`: ask user — redo or skip?
   - If user skips: invoke Skill tool with \`skill: "aped-d"\` and stop

## Load PRD

- Read PRD from path in \`pipeline.phases.prd.output\`
- If no prd phase in state: ask user for PRD path
- Extract ALL FRs and NFRs by number

## Task Tracking

\`\`\`
TaskCreate: "Extract FRs and NFRs from PRD"
TaskCreate: "Design epics (user-value grouping)"
TaskCreate: "Create stories with ACs and tasks"
TaskCreate: "FR coverage validation"
TaskCreate: "Write story files"
\`\`\`

Update each to \`completed\` as you progress.

## Epic Design

Read \`${a}/aped-e/references/epic-rules.md\` for design principles.

### Core Rules

1. **User value first** — each epic delivers COMPLETE functionality for its domain
2. **Independent epics** — each stands alone, no forward dependencies
3. **User-outcome naming** — epic names describe what users can do
4. **Starter template rule** — if project needs scaffolding, Epic 1 Story 1 = project setup

### Story Slug Convention

Story keys: \`{epic#}-{story#}-{slug}\` — slug from title, lowercase, hyphens, max 30 chars.
Story files: \`${o}/stories/{story-key}.md\`

### Story Design

- Format: **As a** [role], **I want** [capability], **so that** [benefit]
- Each story completable in 1 dev session
- No forward dependencies within an epic
- DB tables created ONLY when the story needs them
- ACs in **Given/When/Then** format
- Tasks as checkboxes: \`- [ ] task [AC: AC#]\`

## Ticket System Integration

Read \`ticket_system\` from config. Read \`${a}/aped-d/references/ticket-git-workflow.md\` for full guide.

If \`ticket_system\` is not \`none\`:
- Add ticket reference in each story header: \`**Ticket:** {{ticket_id}}\`
- Add suggested branch name: \`**Branch:** feature/{{ticket_id}}-{{story-slug}}\`
- Format ticket ID per provider:
  - \`linear\`: \`TEAM-###\` (e.g., \`KON-10\`)
  - \`jira\`: \`PROJ-###\` (e.g., \`PROJ-42\`)
  - \`github-issues\`: \`#issue_number\` (e.g., \`#10\`)
  - \`gitlab-issues\`: \`#issue_number\` (e.g., \`#10\`)
- Note: actual ticket creation is manual — these are reference placeholders
- In Dev Notes, add: "Commit prefix: \`feat({{ticket_id}})\`"

## FR Coverage Map

Every FR from PRD mapped to exactly one epic. No orphans, no phantoms.

## Validation

\`\`\`bash
bash ${a}/aped-e/scripts/validate-coverage.sh ${o}/epics.md ${o}/prd.md
\`\`\`

## Output

\`\`\`bash
mkdir -p ${o}/stories
\`\`\`

1. Write epics to \`${o}/epics.md\`
2. Create story files in \`${o}/stories/\` using \`${a}/templates/story.md\`
3. Update \`${o}/state.yaml\` with sprint section and pipeline phase

## Example

PRD with 25 FRs → 3 epics:
- Epic 1: "Users can manage inventory" (FR1-FR8, 4 stories)
- Epic 2: "Managers can monitor stock levels" (FR9-FR16, 3 stories)
- Epic 3: "System sends automated alerts" (FR17-FR25, 3 stories)

## Common Issues

- **Coverage validation fails**: Run \`validate-coverage.sh\` — lists orphan FRs
- **Epic too large**: Split by sub-domain — e.g., "User Auth" → "Registration" + "Sessions"
- **Forward dependencies**: If story B needs A, merge them or restructure

## Chain

Invoke Skill tool with \`skill: "aped-d"\` to proceed to Dev Sprint.
`,
    },
    // ── aped-d ──────────────────────────────────────────────
    {
      path: `${a}/aped-d/SKILL.md`,
      content: `---
name: aped-d
description: 'Implements next story with TDD red-green-refactor cycle. Use when user says "start dev", "implement story", "aped dev", or invokes /aped-d.'
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

## Setup

1. Read \`${a}/config.yaml\` — extract config including \`ticket_system\`, \`git_provider\`
2. Read \`${o}/state.yaml\` — find next story

## Story Selection

Scan \`sprint.stories\` top-to-bottom for first \`ready-for-dev\` story.
- If none found: report "All stories implemented or in review" and stop
- Read story file from \`${o}/stories/{story-key}.md\`
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

## Context Gathering

Launch **2 Agent tool calls in parallel** for context:

### Agent 1: Code Context
- \`subagent_type: "Explore"\`
- Read story Dev Notes for architecture, file paths, dependencies
- Read existing code files mentioned in story
- Map the current state of files to modify

### Agent 2: Library Docs (if dependencies listed)
- \`subagent_type: "general-purpose"\`
- Use MCP context7 (\`resolve-library-id\` then \`query-docs\`) for libraries in Dev Notes
- Extract relevant API patterns and usage examples

## TDD Implementation

Read \`${a}/aped-d/references/tdd-engine.md\` for detailed rules.

For each task (update TaskUpdate to \`in_progress\` when starting):

### RED
Write failing tests first. Run: \`bash ${a}/aped-d/scripts/run-tests.sh\`

### GREEN
Write minimal code to pass. Run: \`bash ${a}/aped-d/scripts/run-tests.sh\`

### REFACTOR
Improve structure while green. Run tests again.

### GATE
Mark \`[x]\` ONLY when: tests exist, pass 100%, implementation matches, ACs satisfied, no regressions.

## HALT Conditions

**STOP and ask user if:** new dependency, 3 consecutive failures, missing config, ambiguity.

## Git & Ticket Workflow

Read \`${a}/aped-d/references/ticket-git-workflow.md\` for full integration guide.

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
3. Invoke Skill tool with \`skill: "aped-r"\` to proceed to Review phase

## Example

Story "1-2-user-registration":
1. RED: write test \`expect(register({email, password})).resolves.toHaveProperty('id')\` → fails
2. GREEN: implement \`register()\` → test passes
3. REFACTOR: extract validation → tests still pass
4. GATE: tests exist ✓, pass ✓, matches spec ✓, ACs met ✓, no regressions ✓ → mark \`[x]\`

## Common Issues

- **Test framework not detected**: Ensure package.json has vitest/jest dependency, or use \`run-tests.sh\` manually
- **3 consecutive failures**: HALT — ask user. Do not brute-force; the approach may be wrong
- **Missing dependency**: HALT — ask user before installing. Do not add deps silently
- **Tests pass before writing code**: The test is wrong — it doesn't test new behavior. Rewrite it
`,
    },
    // ── aped-r ──────────────────────────────────────────────
    {
      path: `${a}/aped-r/SKILL.md`,
      content: `---
name: aped-r
description: 'Reviews completed stories adversarially with minimum 3 findings. Use when user says "review code", "run review", "aped review", or invokes /aped-r.'
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
bash ${a}/aped-r/scripts/git-audit.sh ${o}/stories/{story-key}.md
\`\`\`

## Task Tracking

\`\`\`
TaskCreate: "Git audit"
TaskCreate: "AC validation"
TaskCreate: "Task audit"
TaskCreate: "Code quality review"
TaskCreate: "Generate review report"
\`\`\`

## Adversarial Review

Read \`${a}/aped-r/references/review-criteria.md\` for detailed criteria.

Launch **2 Agent tool calls in parallel** for the review:

### Agent 1: AC & Task Validation (\`subagent_type: "feature-dev:code-explorer"\`)
- For each AC: search code for evidence (file:line). Rate: IMPLEMENTED / PARTIAL / MISSING
- For each \`[x]\` task: find proof in code. No evidence = **CRITICAL**

### Agent 2: Code Quality (\`subagent_type: "feature-dev:code-reviewer"\`)
- Security, Performance, Reliability, Test Quality
- Focus on files listed in the story's File List section

Once both agents return, merge findings. Update tasks to \`completed\`.

### Minimum 3 findings enforced.

## Report

Severity: CRITICAL > HIGH > MEDIUM > LOW. Format: \`[Severity] Description [file:line]\`

## Decision

- MEDIUM/LOW only: fix automatically, story — \`done\`
- HIGH+: fix or add \`[AI-Review]\` items, story — \`in-progress\`

## Ticket & Git Update

Read \`ticket_system\` and \`git_provider\` from \`${a}/config.yaml\`.
Read \`${a}/aped-d/references/ticket-git-workflow.md\` for details.

If story → \`done\`:
1. If PR exists: approve/merge (adapt to \`git_provider\`)
2. If \`ticket_system\` is not \`none\`: move ticket to **Done**
3. Cleanup: delete feature branch after merge

If story → \`in-progress\` (review found HIGH+ issues):
1. Add [AI-Review] items as comments on the PR
2. Ticket stays in **In Review**

## State Update

Update \`${o}/state.yaml\`. If more stories remain: invoke Skill tool with \`skill: "aped-d"\`. If all stories done: report pipeline completion.

## Example

Review of story "1-2-user-registration":
- [HIGH] No input validation on email field [src/auth/register.ts:42]
- [MEDIUM] Password stored without hashing [src/auth/register.ts:58]
- [LOW] Missing error message i18n [src/auth/register.ts:71]
Result: 3 findings → story back to \`in-progress\` with [AI-Review] items.

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

Produces a validated, interactive React prototype from the PRD. The prototype becomes the UX spec that \`/aped-e\` consumes as the visual source of truth.

**ANF = Assemble → Normalize → Fill**

\`\`\`
A: Design DNA        N: React Preview        F: Complete + Validate
   (inputs)             (live prototype)         (user-approved spec)

Inspirations         Vite + React app        All screens built
+ UI library         with REAL content       + interaction states
+ color/typo         from PRD context        + responsive behavior
+ components         (no lorem ipsum)        + user review cycles
                                             = UX spec for /aped-e
\`\`\`

## Setup

1. Read \`${a}/config.yaml\` — extract config
2. Read \`${o}/state.yaml\` — check pipeline state
   - If \`pipeline.phases.ux.status\` is \`done\`: ask user — redo or skip?
   - If user skips: invoke Skill tool with \`skill: "aped-e"\` and stop
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
2. Present the pre-delivery checklist results
3. Ask: "Review each screen. What needs to change?"
4. Categories of feedback:
   - **Layout** — move, resize, reorder sections
   - **Content** — missing info, wrong hierarchy, unclear labels
   - **Style** — colors, spacing, typography adjustments
   - **Flow** — navigation changes, missing screens, wrong order
   - **Components** — wrong component type, missing states, wrong behavior
   - **Dark mode** — contrast issues, token problems, scrim opacity

5. **Iterate** until user says "approved" or "good enough"
6. Each iteration: apply feedback → run checklist again → present → ask again

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

## Chain

Invoke Skill tool with \`skill: "aped-e"\` to proceed to Epics phase.
\`/aped-e\` reads \`${o}/ux/design-spec.md\` and the preview app to enrich stories with:
- Component references (which component to use, which props)
- Screen references (wireframe screenshots)
- Design tokens to respect
- Responsive requirements per screen

## Common Issues

- **npm create vite fails**: Ensure Node.js 18+ is installed. Try \`node --version\` first.
- **UI library install fails**: Check network. For shadcn, ensure the project has a tsconfig.json.
- **User gives no design inspiration**: Use the product domain to suggest a style — "SaaS dashboard" → clean/minimal, "e-commerce" → card-heavy/visual
- **Prototype looks wrong on mobile**: Check responsive breakpoints — sidebar must collapse, touch targets ≥ 44px
- **Dark mode contrast fails**: Use semantic tokens, not hardcoded colors. Check with browser devtools contrast checker.
`,
    },
    // ── aped-s ──────────────────────────────────────────────
    {
      path: `${a}/aped-s/SKILL.md`,
      content: `---
name: aped-s
description: 'Shows sprint status dashboard with progress, blockers, and next actions. Use when user says "sprint status", "show progress", "aped status", or invokes /aped-s.'
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
3. Read \`${a}/aped-s/references/status-format.md\` for display conventions

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
- If stories \`ready-for-dev\`: suggest \`/aped-d\`
- If stories in \`review\`: suggest \`/aped-r\`
- If all stories \`done\`: suggest pipeline complete
- If blockers found: describe resolution path

## Ticket System Sync

Read \`${a}/aped-d/references/ticket-git-workflow.md\` for status mapping.

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
Next: /aped-d (story 1-5-session-mgmt is ready-for-dev)
\`\`\`

## Common Issues

- **State file not found**: Ensure \`${o}/state.yaml\` exists — run /aped-a first
- **Stories show wrong status**: State.yaml may be stale — re-run the last phase to update it
`,
    },
    // ── aped-c ──────────────────────────────────────────────
    {
      path: `${a}/aped-c/SKILL.md`,
      content: `---
name: aped-c
description: 'Manages scope changes and pivots during development with impact analysis. Use when user says "correct course", "change scope", "pivot", "aped correct", or invokes /aped-c.'
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
4. Read \`${a}/aped-c/references/scope-change-guide.md\` for impact matrix and process

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
| Complete pivot | Everything | Reset to /aped-a |

## Change Execution

### Minor change (new/removed feature)
1. Update PRD: add/remove FRs, update scope
2. Re-run validation: \`bash ${a}/aped-p/scripts/validate-prd.sh ${o}/prd.md\`
3. Update epics: add/archive affected stories
4. Re-run coverage: \`bash ${a}/aped-e/scripts/validate-coverage.sh ${o}/epics.md ${o}/prd.md\`
5. Update \`${o}/state.yaml\`: mark affected stories as \`backlog\`

### Major change (architecture/pivot)
1. Confirm with user: "This invalidates in-progress work. Proceed?"
2. Archive current artifacts to \`${o}/archive/{date}/\`
3. Update PRD or restart from \`/aped-a\`
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
    // ── aped-ctx ────────────────────────────────────────────
    {
      path: `${a}/aped-ctx/SKILL.md`,
      content: `---
name: aped-ctx
description: 'Analyzes existing codebase to generate project context for brownfield development. Use when user says "document codebase", "project context", "existing project", "aped context", or invokes /aped-ctx. Not for new project ideation — use aped-a for greenfield.'
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
3. Read \`${a}/aped-ctx/references/analysis-checklist.md\` for the full analysis checklist

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
- If no brief exists: run \`/aped-a\` with project context loaded
- If brief exists: context will inform \`/aped-p\` and \`/aped-d\` decisions

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

Generate comprehensive end-to-end and integration tests for completed stories or epics. Complements the unit tests written during /aped-d TDD.

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

Use \`bash ${a}/aped-d/scripts/run-tests.sh\` to verify tests pass.

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

Suggest running \`/aped-s\` to view updated sprint status with QA coverage noted.

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
- Write to \`${o}/quick-specs/{date}-{slug}.md\`

## Implementation (TDD)

Same TDD cycle as aped-d but compressed:

1. **RED** — Write test for the expected behavior
2. **GREEN** — Minimal implementation to pass
3. **REFACTOR** — Clean up while green

Run tests: \`bash ${a}/aped-d/scripts/run-tests.sh\`

## Self-Review (30 seconds)

Quick checklist — no full adversarial review:
- [ ] Tests pass
- [ ] No security issues introduced
- [ ] No regressions in existing tests
- [ ] AC from quick spec satisfied

## Git & Ticket Workflow

Read \`ticket_system\` and \`git_provider\` from config.
Read \`${a}/aped-d/references/ticket-git-workflow.md\` for full guide.

1. **Branch**: create \`fix/{ticket-id}-{slug}\` or \`feature/{ticket-id}-{slug}\`
2. **Commits**: \`type({ticket-id}): description\` — include magic words per ticket provider
3. **PR/MR**:
   - \`github\`: \`gh pr create --title "fix({ticket-id}): description" --body "Fixes {ticket-id}"\`
   - \`gitlab\`: \`glab mr create --title "fix({ticket-id}): description" --description "Closes {ticket-id}"\`
   - \`bitbucket\`: push branch, create PR via web
4. **Ticket**: move to Done after merge

## Output

1. Write quick spec to \`${o}/quick-specs/\` (create dir if needed)
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
    // ── aped-all ─────────────────────────────────────────────
    {
      path: `${a}/aped-all/SKILL.md`,
      content: `---
name: aped-all
description: 'Runs the full APED pipeline from Analyze through Review with auto-resume. Use when user says "run full pipeline", "aped all", or invokes /aped-all.'
disable-model-invocation: true
license: MIT
metadata:
  author: yabafre
  version: ${c.cliVersion || '1.7.1'}
---

# APED Pipeline — Full Orchestrator

## Resume Logic

1. Read \`${o}/state.yaml\`
2. Determine resume point:

| State | Action |
|-------|--------|
| No state / \`current_phase: "none"\` | Start from \`/aped-a\` |
| Any phase \`in-progress\` | Re-invoke that phase (ask user: resume or restart?) |
| analyze \`done\`, prd missing | Invoke \`/aped-p\` |
| prd \`done\`, ux missing | Invoke \`/aped-ux\` (optional — ask user: design UX or skip to epics?) |
| ux \`done\` or skipped, epics missing | Invoke \`/aped-e\` |
| epics \`done\` | Loop: \`/aped-d\` — \`/aped-r\` until all stories \`done\` |
| All stories \`done\` | Report pipeline complete |

## Task Tracking

Create a task per pipeline phase:
\`\`\`
TaskCreate: "Phase A — Analyze"
TaskCreate: "Phase P — PRD"
TaskCreate: "Phase UX — UX Design (optional)"
TaskCreate: "Phase E — Epics"
TaskCreate: "Phase D — Dev Sprint"
TaskCreate: "Phase R — Review"
\`\`\`

Update each to \`in_progress\` when invoking, \`completed\` when phase returns done.

## Execution

Use the Skill tool to invoke each phase: aped-a, aped-p, aped-ux (optional), aped-e, aped-d, aped-r.
Each phase updates \`${o}/state.yaml\` and chains automatically.

## Interruption Handling

State persists in \`${o}/state.yaml\`. Next \`/aped-all\` resumes from last incomplete phase.

## Completion Report

Total phases, epics, stories, review iterations. Pipeline status: COMPLETE.

## Example

Fresh start → full pipeline run:
1. A: 3 parallel agents → product brief (5 min)
2. P: PRD with 20 FRs generated + validated (3 min)
3. UX: user says "skip" → proceed to epics
4. E: 3 epics, 8 stories created (3 min)
5. D→R loop: 8 stories × (dev + review) cycles
6. All done → pipeline COMPLETE

## Common Issues

- **Phase fails and can't recover**: Check state.yaml — reset the failed phase to \`in-progress\` and re-run /aped-all
- **Context window limit during long pipeline**: Normal — /aped-all chains via Skill tool which starts fresh context per phase
- **User wants to skip a phase**: Supported — each phase asks "redo or skip?" if already done
`,
    },
  ];
}
