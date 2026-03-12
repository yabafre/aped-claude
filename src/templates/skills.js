export function skills(c) {
  const a = c.apedDir;   // .aped  (engine: skills, config, templates)
  const o = c.outputDir; // docs/aped (output: generated artifacts)
  return [
    // ── aped-a ──────────────────────────────────────────────
    {
      path: `${a}/aped-a/SKILL.md`,
      content: `---
name: aped-a
description: 'Analyze project idea through parallel market, domain, and technical research. Use when user says "analyze project", "research idea", "aped analyze", or invokes /aped-a.'
---

# APED Analyze — Parallel Research to Product Brief

## Setup

1. Read \`${a}/config.yaml\` — extract \`user_name\`, \`communication_language\`
2. Read \`${a}/state.yaml\` — check \`pipeline.phases.analyze\`
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

Update \`${a}/state.yaml\`:
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
description: 'Generate PRD autonomously from product brief. Use when user says "create PRD", "generate PRD", "aped prd", or invokes /aped-p.'
---

# APED PRD — Autonomous PRD Generation

## Setup

1. Read \`${a}/config.yaml\` — extract \`user_name\`, \`communication_language\`, \`document_output_language\`
2. Read \`${a}/state.yaml\` — check pipeline state
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
2. Update \`${a}/state.yaml\`:
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
description: 'Create epics and stories from PRD with full FR coverage. Use when user says "create epics", "break into stories", "aped epics", or invokes /aped-e.'
---

# APED Epics & Stories — Requirements Decomposition

## Setup

1. Read \`${a}/config.yaml\` — extract config
2. Read \`${a}/state.yaml\` — check pipeline state
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
3. Update \`${a}/state.yaml\` with sprint section and pipeline phase

## Chain

Invoke Skill tool with \`skill: "aped-d"\` to proceed to Dev Sprint.
`,
    },
    // ── aped-d ──────────────────────────────────────────────
    {
      path: `${a}/aped-d/SKILL.md`,
      content: `---
name: aped-d
description: 'Dev sprint - implement next story with TDD red-green-refactor. Use when user says "start dev", "implement story", "aped dev", or invokes /aped-d.'
---

# APED Dev Sprint — TDD Story Implementation

## Setup

1. Read \`${a}/config.yaml\` — extract config
2. Read \`${a}/state.yaml\` — find next story

## Story Selection

Scan \`sprint.stories\` top-to-bottom for first \`ready-for-dev\` story.
- If none found: report "All stories implemented or in review" and stop
- Read story file from \`${o}/stories/{story-key}.md\`
- Story key format: \`{epic#}-{story#}-{slug}\`

## Review Continuation Check

If story has \`[AI-Review]\` items: address them BEFORE regular tasks.

## State Update (start)

Update \`${a}/state.yaml\`: story — \`in-progress\`, epic — \`in-progress\` if first story.

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

## Completion

1. Update story: mark tasks \`[x]\`, fill Dev Agent Record
2. Update \`${a}/state.yaml\`: story — \`review\`
3. Chain to \`/aped-r\`
`,
    },
    // ── aped-r ──────────────────────────────────────────────
    {
      path: `${a}/aped-r/SKILL.md`,
      content: `---
name: aped-r
description: 'Adversarial code review for completed stories. Use when user says "review code", "run review", "aped review", or invokes /aped-r.'
---

# APED Review — Adversarial Code Review

## Setup

1. Read \`${a}/config.yaml\` — extract config
2. Read \`${a}/state.yaml\` — find first story with status \`review\`
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

Update \`${a}/state.yaml\`. If more stories — chain to \`/aped-d\`. If all done — report completion.
`,
    },
    // ── aped-all ─────────────────────────────────────────────
    {
      path: `${a}/aped-all/SKILL.md`,
      content: `---
name: aped-all
description: 'Run full APED pipeline from Analyze through Review. Use when user says "run full pipeline", "aped all", "start from scratch", or invokes /aped-all.'
---

# APED Pipeline — Full Orchestrator

## Resume Logic

1. Read \`${a}/state.yaml\`
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
Each phase updates \`${a}/state.yaml\` and chains automatically.

## Interruption Handling

State persists in \`${a}/state.yaml\`. Next \`/aped-all\` resumes from last incomplete phase.

## Completion Report

Total phases, epics, stories, review iterations. Pipeline status: COMPLETE.
`,
    },
  ];
}
