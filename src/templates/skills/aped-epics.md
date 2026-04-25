---
name: aped-epics
description: 'Creates epic structure and story list from PRD. Does NOT create story files — use /aped-story for that. Use when user says "create epics", "break into stories", "aped epics", or invokes /aped-epics.'
license: MIT
metadata:
  author: yabafre
  version: {{CLI_VERSION}}
---

# APED Epics — Requirements Decomposition

## Critical Rules

- EVERY FR must map to exactly one epic — no orphans, no phantoms
- Epics describe USER VALUE, not technical layers — "User Authentication" not "Database Setup"
- This skill creates the PLAN, not the story files — `/aped-story` creates one story file at a time
- Quality is more important than speed — do not skip coverage validation

## Input Discovery

Before any work, discover and load all upstream APED artefacts. Epics are derived from PRD requirements; UX and architecture, when present, refine story splitting.

### 1. Glob discovery

Search these locations in order:
- `{{OUTPUT_DIR}}/**`
- `{{APED_DIR}}/**`
- `docs/**` (project root)

Look for these artefacts (✱ = required):
- PRD — `*prd*.md` or `prd.md` ✱
- UX Spec — `ux/*.md` or `*ux-design*.md` (sharded folder with design-spec, screen-inventory, components, flows)
- Architecture — `*architecture*.md` or `architecture.md`
- Product Brief — `*brief*.md` or `product-brief.md`
- Project Context — `*context*.md` or `project-context.md`

For the UX spec folder, load all 4 files (`design-spec.md`, `screen-inventory.md`, `components.md`, `flows.md`).

### 2. Required-input validation (hard-stop)

For the ✱ PRD:
- If found: extract ALL FRs and NFRs by number
- If missing: HALT with this message:
  > "Epic decomposition requires a PRD. Every epic and story maps back to FRs/NFRs. Run `/aped-prd` first, or provide the PRD file path."

### 3. Load + report

- Load every discovered file completely (no offset/limit).
- Brownfield/greenfield is detected via `project-context.md` presence.

Present a discovery report (adapt to `communication_language`):

> Welcome {user_name}! Setting up `/aped-epics` for {project_name}.
>
> **Documents discovered:**
> - PRD: {N} files {✓ loaded — {M} FRs / {K} NFRs extracted | ✱ MISSING — HALT}
> - UX Spec: {N} files {✓ loaded — stories enriched with screens/components | (none)}
> - Architecture: {N} files {✓ loaded — tech decisions inform story splitting | (none)}
> - Product Brief: {N} files {✓ loaded | (none)}
> - Project Context: {N} files {✓ loaded (brownfield) | (none)}
>
> **Files loaded:** {comma-separated filenames}
>
> {if brownfield} 📋 Brownfield mode: existing system context loaded. Story splitting will favour additive work over rewriting existing code unless the PRD explicitly calls for replacement. {/if}
>
> [C] Continue with these documents
> [Other] Add a file path / paste content — I'll load it and redisplay

⏸ **HALT — wait for `[C]` or additional inputs.**

### 4. Bias the rest of the workflow

Loaded artefacts inform every phase of this skill:
- Epic grouping respects user-value domains from the PRD's user journeys.
- When UX is loaded, stories reference concrete screens (from `screen-inventory.md`), components (from `components.md`), and flows (from `flows.md`).
- When architecture is loaded, story 1 of an epic may be technical foundation (e.g., monorepo workspace, schema setup) when the architecture decisions imply it.
- In brownfield mode, the first epic typically integrates with existing modules listed in `project-context.md` rather than greenfield boilerplate.

## Setup

1. Read `{{APED_DIR}}/config.yaml` — extract config including `ticket_system`
2. Read `{{OUTPUT_DIR}}/state.yaml` — check pipeline state
   - If `pipeline.phases.epics.status` is `done`: ask user — redo or skip?
   - If user skips: stop here (user will invoke next phase manually)

## Task Tracking

```
TaskCreate: "Extract FRs and NFRs from PRD"
TaskCreate: "Design epics (user-value grouping)"
TaskCreate: "Define story list per epic"
TaskCreate: "FR coverage validation"
```

## Epic Design

Read `{{APED_DIR}}/aped-epics/references/epic-rules.md` for design principles.

### Core Rules

1. **User value first** — each epic delivers COMPLETE functionality for its domain
2. **Independent epics** — each stands alone, no forward dependencies
3. **User-outcome naming** — epic names describe what users can do
4. **Starter template rule** — if project needs scaffolding, Epic 1 Story 1 = project setup

### Story Listing (NOT story files)

For each epic, list the stories with:
- **Title** — what the story achieves (user-facing outcome)
- **Story key** — `{epic#}-{story#}-{slug}` (slug from title, lowercase, hyphens, max 30 chars)
- **Summary** — 1-2 sentences of scope
- **FRs covered** — which FR numbers this story addresses
- **Acceptance Criteria** — high-level Given/When/Then (will be refined in /aped-story)
- **Estimated complexity** — S / M / L
- **Depends on** — comma-separated list of story keys this one blocks on, or `none`. Required for parallel sprint (`/aped-sprint`).

Pick dependencies conservatively: if story B *needs* an artefact produced by story A (contract, schema, shared util), list A. If B only shares files with A but could technically be rebased after, no dep — parallel sprint wins. "Pure foundation" stories (1-1 auth scaffold, 1-1 schema base) usually have `depends_on: none` and unlock a fan-out.

Do NOT create the detailed story files here. The user will run `/aped-story` to create each one individually before implementing it.

## Discussion with User — A/P/C menu

After designing the epics and story list, present them to the user:
- Show the epic structure with story titles
- Show the FR coverage map
- Highlight the implementation sequence (DAG → ordered list)
- Flag stories that look too large (likely needs splitting) or too granular (likely merge candidates)

Then display the A/P/C menu:

```
Epic structure draft ready ({E} epics, {S} stories, {N} dependencies tracked).

Choose your next move:
[A] Advanced elicitation — invoke /aped-elicit on the decomposition
    (Tree of Thoughts to compare alternative groupings; Pre-mortem to find
    sequencing risks; Occam's Razor to spot over-engineering)
[P] Party / Council — convene a 3-specialist sub-team to challenge the structure:
      • Sam (Fullstack Tech Lead) — story sizing, hidden coupling, cross-layer touches
      • Eva (QA Lead) — testability per story, AC coverage, integration test seams
      • A Product Manager persona — user-value coherence per epic, MVP boundary
    Each returns 2-4 findings; merge and present to the user.
[C] Continue — accept the structure, write epics.md + run coverage validation
[Other] Direct feedback — split a story, merge two, reorder, rename; type the change,
        I apply it and redisplay this menu
```

⏸ **HALT — wait for the user's choice. Do NOT write epics.md or seed the ticket system before `[C]` is selected.**

### Behaviour by choice

- `[A]` → invoke `/aped-elicit` with the epic structure as target. When elicit returns enhanced content (e.g. "Story 3 should be split — too many ACs touching different layers"), apply the change and redisplay the menu.
- `[P]` → dispatch Sam + Eva + the PM persona in parallel via the `Agent` tool, each with the epic structure + PRD excerpt + their persona's brief. Merge findings, present as "Council says: …", ask "Apply any of these? (numbers / all / none)". On selection, integrate; redisplay the menu.
- `[C]` → mark the discussion task `completed`, proceed to FR Coverage Map + Validation + Output.
- Direct feedback → apply the user's edit, redisplay.

## FR Coverage Map

Every FR from PRD mapped to exactly one epic. No orphans, no phantoms.

## Validation

```bash
bash {{APED_DIR}}/aped-epics/scripts/validate-coverage.sh {{OUTPUT_DIR}}/epics.md {{OUTPUT_DIR}}/prd.md
```

## Output

1. Write epics and story list to `{{OUTPUT_DIR}}/epics.md` with `**Depends on:**` on every story
2. Update `{{OUTPUT_DIR}}/state.yaml`:
   - Set `current_phase: "sprint"` — this marks the transition from planning to execution
   - Set `sprint.active_epic` to the epic the user wants to start with (usually `1`)
   - Add `phases.epics` with status `done` and output path
   - Add `sprint.stories` — one entry per story with `status: pending`, `depends_on: [array of story keys]`, `ticket: null` (filled by Ticket System Setup), `worktree: null`
   - `"sprint"` covers the entire story→dev→review cycle — no further phase changes needed
3. Do NOT create `{{OUTPUT_DIR}}/stories/` files — that is `/aped-story`'s job

## Ticket System Setup

Read `ticket_system` from config. If `none`: skip this phase entirely.

Read `{{APED_DIR}}/aped-dev/references/ticket-git-workflow.md` for provider-specific syntax.

### Step 1: Check Credentials

Verify the CLI/auth is configured:
- `github-issues`: `gh auth status`
- `gitlab-issues`: `glab auth status`
- `linear`: check for `LINEAR_API_KEY` env var or linear CLI
- `jira`: check for `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` env vars

If not configured: warn the user with setup instructions and continue **without** ticket sync. Mark `ticket_sync: skipped` in state.yaml.

### Step 2: Check Project

Verify the target project exists:
- `github-issues`: `gh repo view` — must be in a GitHub repo
- `gitlab-issues`: `glab repo view`
- `linear`: ask the user for the team key (e.g., `TEAM`) — store in config
- `jira`: ask the user for the project key — store in config

### Step 3: Preview to User

Show the user what will be created:
```
Will create in {ticket_system}:
  📦 Milestone: Epic 1 — Users can manage inventory
     🆕 Issue: [S] 1-1-project-setup
     🆕 Issue: [M] 1-2-inventory-crud
     🆕 Issue: [M] 1-3-search-filter
     🆕 Issue: [L] 1-4-bulk-import
  📦 Milestone: Epic 2 — Managers can monitor stock levels
     🆕 Issue: ...
```

⏸ **GATE: User confirms before creating anything in the ticket system.**

### Step 4: Create Milestones

One milestone per epic. Title: `Epic {N}: {epic title}`. Description: epic summary + FR coverage list.

**github-issues:**
```bash
gh api repos/{owner}/{repo}/milestones -f title="Epic 1: ..." -f description="..."
```

**gitlab-issues:**
```bash
glab api projects/{id}/milestones -f title="Epic 1: ..." -f description="..."
```

**linear:** Use project/cycle API via curl or linear CLI
**jira:** Use epic issue type (JIRA has native epics)

### Step 5: Create Issues

One issue per story. Format:

**Title:** `[{size}] {story-key}: {story title}` (e.g., `[M] 1-2-inventory-crud: CRUD for inventory items`)

**Description** (markdown body):
```markdown
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
Generated by APED Method v{{CLI_VERSION}}
```

**Labels:**
- Type label (based on story intent):
  - `🆕 feature` — new capability
  - `🔄 refactor` — restructure existing code
  - `🔁 update` — modify or enhance existing behavior
- Size label: `size/S`, `size/M`, `size/L`
- Epic label: `epic/{N}`
- Phase label: `aped/story`

**Milestone:** assign to the epic milestone created in Step 4.

**github-issues:**
```bash
gh issue create --title "..." --body "..." --label "🆕 feature,size/M,epic/1" --milestone "Epic 1: ..."
```

**gitlab-issues:**
```bash
glab issue create --title "..." --description "..." --label "🆕 feature,size/M,epic/1" --milestone "Epic 1: ..."
```

### Step 6: Store Ticket IDs

Update `{{OUTPUT_DIR}}/epics.md` — add a `**Ticket:** {ticket-id}` line under each story.

Update `{{OUTPUT_DIR}}/state.yaml`:
```yaml
sprint:
  stories:
    1-1-project-setup:
      status: pending
      ticket: "#42"  # or TEAM-10, PROJ-5, etc.
    1-2-inventory-crud:
      status: pending
      ticket: "#43"
```

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

- **Coverage validation fails**: Run `validate-coverage.sh` — lists orphan FRs
- **Epic too large**: Split by sub-domain — e.g., "User Auth" → "Registration" + "Sessions"
- **Forward dependencies**: If story B needs A, merge them or restructure

## Next Step

Tell the user: "Epics structure is ready. Run `/aped-story` to create the first story file, then `/aped-dev` to implement it."

**Do NOT auto-chain.** The user decides when to proceed.
