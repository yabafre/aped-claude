---
name: aped-epics
keep-coding-instructions: true
description: 'Use when user says "create epics", "break into stories", "aped epics", or invokes aped-epics. Does NOT create story files — that''s aped-story.'
license: MIT
metadata:
  author: yabafre
  version: {{CLI_VERSION}}
---

# APED Epics — Requirements Decomposition

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

- EVERY FR must map to exactly one epic — no orphans, no phantoms
- Epics describe USER VALUE, not technical layers — "User Authentication" not "Database Setup"
- This skill creates the PLAN, not the story files — `aped-story` creates one story file at a time
- Quality is more important than speed — do not skip coverage validation

> **Setup pointer.** Integrates with `ticket_system` in `{{APED_DIR}}/config.yaml` — writes tickets to the configured tracker (linear / jira / github-issues / gitlab-issues). With `ticket_system: none`, emits the internal markdown plan only. Run `npx aped-method` to (re)configure. Hard-dep matrix: `docs/skills-classification.md`.

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

For the UX spec folder, load every file (`design-spec.md`, `screen-inventory.md`, `components.md`, `flows.md`).

### 2. Required-input validation (hard-stop)

For the ✱ PRD:
- If found: extract ALL FRs and NFRs by number
- If missing: HALT with this message:
  > "Epic decomposition requires a PRD. Every epic and story maps back to FRs/NFRs. Run `aped-prd` first, or provide the PRD file path."

For Architecture (conditional ✱ — required when state declares it `done`):
- Read `pipeline.phases.architecture.status` from `{{OUTPUT_DIR}}/state.yaml`. If the field is absent, treat architecture as deliberately skipped — continue without HALT.
- If `done` AND no architecture file was found in the glob: HALT with this message:
  > "state.yaml records `pipeline.phases.architecture.status: done`, but no architecture file was found in the discovery globs. Re-run `aped-arch` to regenerate it, or set `pipeline.phases.architecture.status: skipped` in state.yaml if architecture was deliberately skipped for this project."
- If `done` AND architecture is found: continue. Architecture is loaded and informs story splitting in section 4.

### 3. Load + report

- Load every discovered file completely (no offset/limit).
- Brownfield/greenfield is detected via `project-context.md` presence.

Present a discovery report (adapt to `communication_language`):

> Welcome {user_name}! Setting up `aped-epics` for {project_name}.
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

1. Read `{{OUTPUT_DIR}}/state.yaml` — check pipeline state
   - If `pipeline.phases.epics.status` is `done`: ask user — redo or skip?
   - If user skips: stop here (user will invoke next phase manually)

## Task Tracking

```
TaskCreate: "Extract FRs and NFRs from PRD"
TaskCreate: "Design epics (user-value grouping)"
TaskCreate: "Define story list per epic"
TaskCreate: "FR coverage validation"
```

## File structure design (upfront)

Before breaking epics into stories, sketch the file boundaries the epic will touch **across stories**. Story-level file design (in `aped-story`) keeps each story's files coherent; epic-level file design ensures stories within the same epic don't fight over the same modules and that files-that-change-together stay in the same story.

Apply the same rule as story-level decomposition: **split by responsibility, not by technical layer.** An epic delivering "user auth" is not "story 1 = backend, story 2 = frontend, story 3 = tests" — that's the layer trap, and it produces three stories that all need each other to ship anything user-visible. The right split is by user-value slice (registration, sessions, password reset), where each slice cuts vertically through layers and ships independently.

For each epic, write a 3-bullet decision per major file area:

- **File area + path prefix** — the directory or module each story owns (e.g. `src/auth/` for the auth epic, `apps/web/src/payments/` for payments).
- **Single responsibility** — one sentence stating what this area is for, in user-value terms.
- **Inputs + outputs** — what this area depends on (other modules, contracts) and what it exposes to the rest of the codebase (public APIs, types).

Two stories of the same epic should NOT both create the same file from scratch (race in the parallel sprint). Two stories MAY both modify the same file, provided the second one's `depends_on:` lists the first.

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
- **FRs covered** — list explicit FR IDs from the PRD (e.g. `FR-1, FR-3, FR-7`), never vague descriptions like "auth-related FRs". Every listed ID must exist in the loaded PRD; surface drift to the user instead of inventing one.
- **Acceptance Criteria** — high-level Given/When/Then (will be refined in aped-story)
- **Estimated complexity** — S / M / L
- **Depends on** — comma-separated list of story keys this one blocks on, or `none`. Required for parallel sprint (`aped-sprint`).

Pick dependencies conservatively: if story B *needs* an artefact produced by story A (contract, schema, shared util), list A. If B only shares files with A but could technically be rebased after, no dep — parallel sprint wins. "Pure foundation" stories (1-1 auth scaffold, 1-1 schema base) usually have `depends_on: none` and unlock a fan-out.

### Running FR coverage matrix

After completing each epic's story list (not only at the end of all epics), update a running FR-coverage matrix and surface it to the user before moving to the next epic. The matrix has three columns:

| FR ID | Covered by | Status |
|-------|------------|--------|
| FR-1  | 1-1-init, 1-2-schema | ✓ covered |
| FR-2  | (none)               | ✗ uncovered |
| FR-3  | 1-1-init, 2-1-flow, 2-2-export, 3-1-bulk | ⚠ multi-cover (4) |

Surface the matrix at three trigger points:

1. **End of every epic's story list** — the running matrix shows which FRs are now covered, which are still uncovered, and which are multi-covered.
2. **Immediately when an FR is covered by ≥3 stories** — likely an over-fragmented requirement; flag for user review (split? merge? rename?).
3. **Immediately when ≥30% of FRs remain uncovered after 50% of estimated stories have been drafted** — sequencing risk; likely a missed epic. Pause the listing and surface to the user.

The end-of-skill `## FR Coverage Map` is the **final** coverage report; this running matrix is what the user sees during the design loop. Surfacing coverage early prevents the "Story 14 is the only place FR-7 lands" surprise that is painful to fix late in the pipeline.

Do NOT create the detailed story files here. The user will run `aped-story` to create each one individually before implementing it.

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
[A] Advanced elicitation — invoke aped-elicit on the decomposition
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

- `[A]` → invoke `aped-elicit` with the epic structure as target. When elicit returns enhanced content (e.g. "Story 3 should be split — too many ACs touching different layers"), apply the change and redisplay the menu.
- `[P]` → dispatch Sam + Eva + the PM persona in parallel via the `Agent` tool, each with the epic structure + PRD excerpt + their persona's brief. Merge findings, present as "Council says: …", ask "Apply any of these? (numbers / all / none)". On selection, integrate; redisplay the menu.
- `[C]` → mark the discussion task `completed`, proceed to FR Coverage Map + Validation + Output.
- Direct feedback → apply the user's edit, redisplay.

## FR Coverage Map

Every FR from PRD mapped to exactly one epic. No orphans, no phantoms.

## Validation

Run **both** validators — `validate-coverage.sh` for the legacy human-readable report, `oracle-epics.sh` (4.12.0+) for the C-compiler-convention deterministic verifier (E020 FR coverage, E021 every epic has ≥1 story).

```bash
# Legacy human-readable reporter (kept for backwards compat).
bash {{APED_DIR}}/aped-epics/scripts/validate-coverage.sh {{OUTPUT_DIR}}/epics.md {{OUTPUT_DIR}}/prd.md

# Deterministic oracle (canonical 4.12.0+ pre-merge gate).
bash {{APED_DIR}}/aped-epics/scripts/oracle-epics.sh {{OUTPUT_DIR}}/epics.md {{OUTPUT_DIR}}/prd.md
```

If `oracle-epics.sh` exits non-zero, surface the `ERROR Eddd: ...` lines verbatim and HALT. Do not ship the epics list with E020 (uncovered FR) or E021 (empty epic) violations — both block aped-story / aped-dev downstream.

### Spec self-review

After the coverage validation passes, look at the epic structure with fresh eyes — this is an inline checklist you run yourself, not a subagent dispatch. Fix any issues inline; no need to re-review.

1. **Placeholder lint:** run `bash {{APED_DIR}}/scripts/lint-placeholders.sh {{OUTPUT_DIR}}/epics.md`. Exit 0 = pass.
2. **FR coverage matches PRD:** every PRD FR appears in at least one story's `Covered FRs:` list. No orphan FRs, no phantom FRs that are not in the PRD.
3. **Given/When/Then ACs:** every story's acceptance criteria follow the Given/When/Then format. No "should work" or "TBD" ACs.
4. **Acyclic depends_on graph:** the `depends_on:` chain across all stories is a DAG — no cycles, no story depending on itself transitively.
5. **Story granularity:** no story implements more than 5 FRs (likely needs splitting), and no story implements 0 FRs (likely a phantom or a foundation story that should be merged or labelled explicitly).

If you find issues, fix them inline. No need to re-review — just fix and move on.

### Spec-reviewer dispatch

After the inline self-review passes, dispatch a fresh subagent to review the epics breakdown **before** the user gate. The reviewer's job is to verify the structure is sound and ready for `aped-story` and `aped-dev` consumption.

Use the `Agent` tool (`subagent_type: "general-purpose"`) with this verbatim prompt (substitute `[ARTEFACT_FILE_PATH]` with the actual path of `epics.md` just written):

```
You are a spec document reviewer. Verify this epics breakdown is complete and ready for execution.

**Spec to review:** [ARTEFACT_FILE_PATH]

## What to Check

| Category | What to Look For |
|----------|------------------|
| Completeness | TODOs, placeholders, missing ACs, missing FR coverage list per story |
| Consistency | Cycles in `depends_on:`, duplicate story keys, FR coverage that doesn't match the PRD |
| Clarity | Stories whose scope cannot be understood without reading the PRD |
| Granularity | Stories owning multiple subsystems (need split) or stories that touch identical code (need merge) |
| YAGNI | Stories that don't map to any FR, foundation stories that aren't actually needed |

## Calibration

**Only flag issues that would cause real problems for `aped-story` and `aped-dev`.**
Story granularity that obviously needs to split (one story owning multiple
subsystems) or merge (two stories that touch identical code), orphan FRs not
covered by any story, or cycles in `depends_on` — those are issues. Naming
bikesheds and ordering preferences are not.

Approve unless there are serious gaps that would lead to a flawed sprint.

## Output Format

## Spec Review

**Status:** Approved | Issues Found

**Issues (if any):**
- [Section X]: [specific issue] - [why it matters for execution]

**Recommendations (advisory, do not block approval):**
- [suggestions for improvement]
```

When the reviewer returns:
- **Status: Approved** — proceed to the user gate. Surface the recommendations (advisory) but do not block on them.
- **Status: Issues Found** — fix the flagged issues inline (or `[O]verride` with a recorded reason if a flag is wrong), then re-dispatch the same reviewer once. If the second pass also returns issues, HALT and present the issues to the user for adjudication before handing off.

## Self-review (run before user gate)

Before presenting the epics breakdown to the user, walk this checklist. Each `[ ]` must flip to `[x]` or HALT. If the lint exits 1, present its output verbatim and ask `[F]ix` / `[O]verride (record reason)`.

- [ ] **Placeholder lint** — run `bash {{APED_DIR}}/scripts/lint-placeholders.sh {{OUTPUT_DIR}}/epics.md`.
- [ ] **FR coverage** — every PRD FR appears in at least one story's `Covered FRs:` list. No orphan FRs.
- [ ] **Given/When/Then ACs** — every story's ACs follow Given/When/Then.
- [ ] **Acyclic dependency graph** — `depends_on:` chains contain no cycles.
- [ ] **Unique story keys** — no two stories share a key.
- [ ] **Non-empty scope** — every story has a concrete user-facing description (not just a title).
- [ ] **Spec-reviewer dispatched** — reviewer returned Approved (or [O]verride recorded).
- [ ] **Sync log emitted** — `docs/sync-logs/<provider>-sync-<ISO>.json` exists AND `state.yaml` `ticket_sync` block populated (or `ticket_sync: skipped` recorded under `phases.epics` if config has no ticket system / auth check failed).

## Output

1. Write epics and story list to `{{OUTPUT_DIR}}/epics.md` with `**Depends on:**` on every story
2. Update `{{OUTPUT_DIR}}/state.yaml`:
   - Set `current_phase: "sprint"` — this marks the transition from planning to execution
   - Set `sprint.active_epic` to the epic the user wants to start with (usually `1`)
   - Add `phases.epics` with status `done` and output path
   - Add `sprint.stories` — one entry per story with `status: pending`, `depends_on: [array of story keys]`, `ticket: null` (filled by Ticket System Setup), `worktree: null`
   - `"sprint"` covers the entire story→dev→review cycle — no further phase changes needed
3. Do NOT create `{{OUTPUT_DIR}}/stories/` files — that is `aped-story`'s job

## Ticket System Setup

Read `ticket_system` from config. If `none`: skip this phase entirely and write `ticket_sync: skipped` under `phases.epics` in state.yaml.

Read `{{APED_DIR}}/aped-dev/references/ticket-git-workflow.md` for provider-specific syntax.

### Step 0: Open the sync log

Before any provider call, capture an audit-log path. The provider name is the value of `ticket_system` from config (`linear` | `github-issues` | `gitlab-issues` | `jira`); pass it verbatim:

```bash
LOG=$(bash {{APED_DIR}}/scripts/sync-log.sh start <provider>)
```

Capture `$LOG` once and reuse it for every subsequent `phase` / `record` / `end` call. Surface the path to the user at the end. If `sync_logs.enabled: false` in `config.yaml`, the helper exits 0 silently with empty stdout — `$LOG` will be empty and downstream calls will be silent no-ops; that's expected.

### Step 1: Check Credentials

Verify the CLI/auth is configured:
- `github-issues`: `gh auth status`
- `gitlab-issues`: `glab auth status`
- `linear`: check for `LINEAR_API_KEY` env var or linear CLI
- `jira`: check for `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` env vars

If not configured: warn the user with setup instructions and continue **without** ticket sync. Mark `ticket_sync: skipped` in state.yaml.

After the auth check completes, append the phase to the sync log:

```bash
bash {{APED_DIR}}/scripts/sync-log.sh phase $LOG auth_check complete
bash {{APED_DIR}}/scripts/sync-log.sh record $LOG api_calls_total 1
```

### Step 2: Check Project

Verify the target project exists:
- `github-issues`: `gh repo view` — must be in a GitHub repo
- `gitlab-issues`: `glab repo view`
- `linear`: ask the user for the team key (e.g., `TEAM`) — store in config
- `jira`: ask the user for the project key — store in config

After the project resolution completes, append a phase entry capturing the project list (provider-specific shape — Linear: `{name, id, lead, target_date}`; GitHub: project URL; etc.):

```bash
bash {{APED_DIR}}/scripts/sync-log.sh phase $LOG projects complete '{"calls":N,"created":[...]}'
bash {{APED_DIR}}/scripts/sync-log.sh record $LOG api_calls_total N
```

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

After the milestone batch completes:

```bash
bash {{APED_DIR}}/scripts/sync-log.sh phase $LOG milestones complete '{"calls":M,"created":{...}}'
bash {{APED_DIR}}/scripts/sync-log.sh record $LOG api_calls_total M
```

### Step 5: Create Issues

One issue per story. Format:

**Title:** `[{size}] {story-key}: {story title}` (e.g., `[M] 1-2-inventory-crud: CRUD for inventory items`)

**Description** (markdown body):
```markdown
## User Story
As a {role}, I want {capability}, so that {benefit}.

## Acceptance Criteria
- [ ] AC-1: Given ... When ... Then ...
- [ ] AC-2: ...

## Covered FRs
- FR-1: {FR title from PRD}
- FR-2: ...

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

After the issue creation batch completes (one `record` per provider call to keep `api_calls_total` accurate):

```bash
bash {{APED_DIR}}/scripts/sync-log.sh phase $LOG labels complete '{"calls":L,"created":{...}}'
bash {{APED_DIR}}/scripts/sync-log.sh record $LOG api_calls_total L
bash {{APED_DIR}}/scripts/sync-log.sh phase $LOG issues_created complete '{"calls":I,"issues":[...]}'
bash {{APED_DIR}}/scripts/sync-log.sh record $LOG api_calls_total I
```

If any tickets were modified mid-sync (re-titled, re-described, project moved), record them under a `modified_tickets` phase:

```bash
bash {{APED_DIR}}/scripts/sync-log.sh phase $LOG modified_tickets complete '{"calls":K,"modifications":[...]}'
bash {{APED_DIR}}/scripts/sync-log.sh record $LOG api_calls_total K
```

If any tickets were moved to the future-scope bucket (M2):

```bash
bash {{APED_DIR}}/scripts/sync-log.sh phase $LOG out_of_scope_moves complete '{"calls":F,"tickets":[...]}'
bash {{APED_DIR}}/scripts/sync-log.sh record $LOG api_calls_total F
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

### Step 7: Close the sync log + write structured state

Close the log and capture the final path:

```bash
bash {{APED_DIR}}/scripts/sync-log.sh end $LOG
```

Surface the log path to the user (e.g. "Sync complete — audit trail at `docs/sync-logs/<provider>-sync-<ISO>.json`").

Now write the **top-level `ticket_sync` block** to `{{OUTPUT_DIR}}/state.yaml`. The shape is provider-agnostic — fields below are mandatory; provider-specific detail goes inside `projects` and `milestones`:

```yaml
ticket_sync:
  provider: "<linear | github | gitlab | jira>"   # same as ticket_system in config
  sync_id: "<basename of $LOG with .json stripped>"
  synced_at: "<ISO 8601 now>"
  sync_log: "docs/sync-logs/<provider>-sync-<ISO>.json"  # relative to project root
  directive_version: "<from sync-log if available, else null>"
  projects:
    # Provider-specific shape. Linear example:
    foundation:
      id: "<linear-project-id>"
      name: "[M1] Foundation"
      lead: "<email>"
      target_date: "<ISO date | null>"
    # GitHub: project URL string. GitLab: project id. Jira: project key.
  milestones:
    # epic-key → provider milestone id
    "foundation/epic-0": "<milestone-id>"
  modified_tickets:
    # Append-only across re-syncs. Each entry:
    - id: "<ticket-id>"
      fields: ["title", "description", "project"]
      reason: "<one-liner>"
      original_description_sha256: "<sha256 of pre-sync body>"
      labels_added: ["<label1>", "<label2>"]
      project_moved: "<from> → <to>"
  totals:
    api_calls_total: <int>          # from sync-log totals
    # Optional, provider-specific: projects_created, milestones_created,
    # labels_created, issues_created, tickets_modified, tickets_moved_to_future_scope
```

If M2 / future-scope buckets exist, ALSO write a top-level `backlog_future_scope` block:

```yaml
backlog_future_scope:
  project_id: "<provider future-scope project id, or null>"
  tickets:
    - { id: "<ticket-id>", category: "<free-form bucket name>" }
```

Update `phases.epics` in state.yaml with the structured fields:

```yaml
pipeline:
  phases:
    epics:
      status: "done"
      output: "{{OUTPUT_DIR}}/epics.md"
      completed_at: "<ISO 8601 now>"
      epic_count: <int>
      story_count: <int>
      fr_coverage: "<M>/<N> [optional descope note]"   # e.g. "76/77 (FR-63 descoped M2)"
      ticket_sync: "synced"   # synced | skipped | failed
      synced_at: "<ISO 8601 now>"
```

If `ticket_system: none` (or auth check failed and we skipped sync), set `ticket_sync: skipped` and omit the top-level `ticket_sync` block entirely.

Re-syncs append to `modified_tickets` (never overwrite); other fields are replaced with the new run's values.

## Example

PRD with 25 FRs → 3 epics:
- Epic 1: "Users can manage inventory" (FR-1 to FR-8)
  - 1-1-project-setup (S) — scaffold, deps, CI
  - 1-2-inventory-crud (M) — create/read/update/delete items
  - 1-3-search-filter (M) — search and filter inventory
  - 1-4-bulk-import (L) — CSV bulk import
- Epic 2: "Managers can monitor stock levels" (FR-9 to FR-16, 3 stories)
- Epic 3: "System sends automated alerts" (FR-17 to FR-25, 3 stories)

FR Coverage: FR-1→1-1, FR-2→1-2, FR-3→1-2, ... (all mapped)

## Common Issues

- **Coverage validation fails**: Run `validate-coverage.sh` — lists orphan FRs
- **Epic too large**: Split by sub-domain — e.g., "User Auth" → "Registration" + "Sessions"
- **Forward dependencies**: If story B needs A, merge them or restructure

## Next Step

Tell the user: "Epics structure is ready. Run `aped-story` to create the first story file, then `aped-dev` to implement it."

**Do NOT auto-chain.** The user decides when to proceed.
