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
---

# APED Analyze — Parallel Research to Product Brief

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

## Parallel Research

Read \`${a}/aped-a/references/research-prompts.md\` for detailed agent prompts.

Launch **3 Agent tool calls in parallel** with \`run_in_background: true\`:

### Agent 1: Market Research
- Customer behavior and pain points in the target segment
- Competitive landscape: direct and indirect competitors
- Market size and growth trajectory
- Pricing models in the space
- Use WebSearch for current data

### Agent 2: Domain Research
- Industry analysis and key trends
- Regulatory requirements and compliance needs
- Technical trends shaping the domain
- Standards and certifications required
- Use WebSearch for current data

### Agent 3: Technical Research
- Technology stack overview and options
- Integration patterns and APIs available
- Architecture patterns for similar products
- Open-source tools and frameworks relevant
- Use WebSearch for current data

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
`,
    },
    // ── aped-p ──────────────────────────────────────────────
    {
      path: `${a}/aped-p/SKILL.md`,
      content: `---
name: aped-p
description: 'Generates PRD autonomously from product brief. Use when user says "create PRD", "generate PRD", "aped prd", or invokes /aped-p.'
---

# APED PRD — Autonomous PRD Generation

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

Invoke Skill tool with \`skill: "aped-e"\` to proceed to Epics phase.
`,
    },
    // ── aped-e ──────────────────────────────────────────────
    {
      path: `${a}/aped-e/SKILL.md`,
      content: `---
name: aped-e
description: 'Creates epics and stories from PRD with full FR coverage. Use when user says "create epics", "break into stories", "aped epics", or invokes /aped-e.'
---

# APED Epics & Stories — Requirements Decomposition

## Setup

1. Read \`${a}/config.yaml\` — extract config including \`ticket_system\`
2. Read \`${o}/state.yaml\` — check pipeline state
   - If \`pipeline.phases.epics.status\` is \`done\`: ask user — redo or skip?
   - If user skips: invoke Skill tool with \`skill: "aped-d"\` and stop

## Load PRD

- Read PRD from path in \`pipeline.phases.prd.output\`
- If no prd phase in state: ask user for PRD path
- Extract ALL FRs and NFRs by number

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

Read \`ticket_system\` from config. If not \`none\`:
- Add ticket reference in each story header: \`**Ticket:** {{ticket_id}}\`
- If \`jira\`: format as \`PROJ-###\` placeholder
- If \`linear\`: format as \`TEAM-###\` placeholder
- If \`github-issues\`: format as \`#issue_number\` placeholder
- If \`gitlab-issues\`: format as \`#issue_number\` placeholder
- Note: actual ticket creation is manual — these are reference placeholders

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
---

# APED Dev Sprint — TDD Story Implementation

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

## Context Gathering

- Read story Dev Notes for architecture, file paths, dependencies
- Use MCP context7 for library docs mentioned in Dev Notes
- Read existing code files mentioned in story

## TDD Implementation

Read \`${a}/aped-d/references/tdd-engine.md\` for detailed rules.

For each task:

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

## Git Commit Convention

Read \`git_provider\` and \`ticket_system\` from config:
- Commit message format: \`type(scope): description\`
- If ticket system configured, append ticket ref: \`type(scope): description [TICKET-ID]\`

## Completion

1. Update story: mark tasks \`[x]\`, fill Dev Agent Record
2. Update \`${o}/state.yaml\`: story — \`review\`
3. Invoke Skill tool with \`skill: "aped-r"\` to proceed to Review phase
`,
    },
    // ── aped-r ──────────────────────────────────────────────
    {
      path: `${a}/aped-r/SKILL.md`,
      content: `---
name: aped-r
description: 'Reviews completed stories adversarially with minimum 3 findings. Use when user says "review code", "run review", "aped review", or invokes /aped-r.'
disable-model-invocation: true
---

# APED Review — Adversarial Code Review

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

## Adversarial Review

Read \`${a}/aped-r/references/review-criteria.md\` for detailed criteria.

### 1. AC Validation
For each AC: search code for evidence (file:line). Rate: IMPLEMENTED / PARTIAL / MISSING.

### 2. Task Audit
For each \`[x]\` task: find proof in code. No evidence = **CRITICAL**.

### 3. Code Quality
Security, Performance, Reliability, Test Quality.

### 4. Minimum 3 findings enforced.

## Report

Severity: CRITICAL > HIGH > MEDIUM > LOW. Format: \`[Severity] Description [file:line]\`

## Decision

- MEDIUM/LOW only: fix automatically, story — \`done\`
- HIGH+: fix or add \`[AI-Review]\` items, story — \`in-progress\`

## State Update

Update \`${o}/state.yaml\`. If more stories remain: invoke Skill tool with \`skill: "aped-d"\`. If all stories done: report pipeline completion.
`,
    },
    // ── aped-s ──────────────────────────────────────────────
    {
      path: `${a}/aped-s/SKILL.md`,
      content: `---
name: aped-s
description: 'Shows sprint status dashboard with progress, blockers, and next actions. Use when user says "sprint status", "show progress", "aped status", or invokes /aped-s.'
allowed-tools: Read, Grep, Glob, Bash
---

# APED Status — Sprint Dashboard

## Setup

1. Read \`${a}/config.yaml\` — extract \`communication_language\`, \`ticket_system\`
2. Read \`${o}/state.yaml\` — load full pipeline and sprint state

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

## Ticket System Integration

If \`ticket_system\` is not \`none\`:
- Show ticket references alongside story statuses
- Note any stories without ticket references

## Output

Display only — no file writes, no state changes. Pure read-only dashboard.
`,
    },
    // ── aped-c ──────────────────────────────────────────────
    {
      path: `${a}/aped-c/SKILL.md`,
      content: `---
name: aped-c
description: 'Manages scope changes and pivots during development with impact analysis. Use when user says "correct course", "change scope", "pivot", "aped correct", or invokes /aped-c.'
disable-model-invocation: true
---

# APED Correct Course — Managed Pivot

Use when requirements change, priorities shift, or the current approach needs rethinking mid-pipeline.

## Setup

1. Read \`${a}/config.yaml\` — extract config
2. Read \`${o}/state.yaml\` — understand current pipeline state
3. Read existing artifacts: brief, PRD, epics, stories

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
`,
    },
    // ── aped-ctx ────────────────────────────────────────────
    {
      path: `${a}/aped-ctx/SKILL.md`,
      content: `---
name: aped-ctx
description: 'Analyzes existing codebase to generate project context for brownfield development. Use when user says "document codebase", "project context", "existing project", "aped context", or invokes /aped-ctx. Not for new project ideation — use aped-a for greenfield.'
allowed-tools: Read, Grep, Glob, Bash
---

# APED Context — Brownfield Project Analysis

Use on existing codebases to generate project context before running the APED pipeline. Essential for brownfield projects where you're adding features to existing code.

## Setup

1. Read \`${a}/config.yaml\` — extract config
2. Verify this is a brownfield project (existing code, not greenfield)

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
`,
    },
    // ── aped-qa ─────────────────────────────────────────────
    {
      path: `${a}/aped-qa/SKILL.md`,
      content: `---
name: aped-qa
description: 'Generates E2E and integration tests from acceptance criteria for completed features. Use when user says "generate tests", "E2E tests", "integration tests", "aped qa", or invokes /aped-qa.'
---

# APED QA — E2E & Integration Test Generation

Generate comprehensive end-to-end and integration tests for completed stories or epics. Complements the unit tests written during /aped-d TDD.

## Setup

1. Read \`${a}/config.yaml\` — extract config
2. Read \`${o}/state.yaml\` — find completed stories/epics

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

## Test Generation

### E2E Tests (User Journeys)

For each user journey that spans one or more stories:

1. Map the full flow: entry → steps → expected outcome
2. Generate test using the project's test framework
3. Each AC's Given/When/Then becomes a test step
4. Include:
   - Happy path (main flow)
   - Error paths (invalid input, unauthorized, not found)
   - Edge cases (empty data, concurrent access, timeouts)

### Integration Tests (API/Service)

For each integration point:

1. Test request/response contracts
2. Test error handling (service down, timeout, malformed response)
3. Test data consistency (DB state before/after)
4. Test authentication/authorization boundaries

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
`,
    },
    // ── aped-quick ────────────────────────────────────────────
    {
      path: `${a}/aped-quick/SKILL.md`,
      content: `---
name: aped-quick
description: 'Implements quick fixes and small features bypassing the full pipeline. Use when user says "quick fix", "quick feature", "hotfix", "aped quick", or invokes /aped-quick.'
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

## Git Commit

Read \`ticket_system\` and \`git_provider\` from config.
- Format: \`type(scope): description\`
- Append ticket ref if configured
- If \`git_provider\` is \`github\`: suggest PR creation with \`gh pr create\`
- If \`git_provider\` is \`gitlab\`: suggest MR creation with \`glab mr create\`

## Output

1. Write quick spec to \`${o}/quick-specs/\` (create dir if needed)
2. No state.yaml update — quick specs don't affect pipeline phase
3. Report: files changed, tests added, quick spec path
`,
    },
    // ── aped-all ─────────────────────────────────────────────
    {
      path: `${a}/aped-all/SKILL.md`,
      content: `---
name: aped-all
description: 'Runs the full APED pipeline from Analyze through Review with auto-resume. Use when user says "run full pipeline", "aped all", or invokes /aped-all.'
disable-model-invocation: true
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
| prd \`done\`, epics missing | Invoke \`/aped-e\` |
| epics \`done\` | Loop: \`/aped-d\` — \`/aped-r\` until all stories \`done\` |
| All stories \`done\` | Report pipeline complete |

## Execution

Use the Skill tool to invoke each phase: aped-a, aped-p, aped-e, aped-d, aped-r.
Each phase updates \`${o}/state.yaml\` and chains automatically.

## Interruption Handling

State persists in \`${o}/state.yaml\`. Next \`/aped-all\` resumes from last incomplete phase.

## Completion Report

Total phases, epics, stories, review iterations. Pipeline status: COMPLETE.
`,
    },
  ];
}
