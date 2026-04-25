---
name: aped-story
description: 'Creates a detailed story file for the next story to implement, commits it on the feature branch, and posts the story-ready check-in. Use when user says "create story", "prepare next story", "aped story", or invokes /aped-story.'
argument-hint: "[story-key]"
license: MIT
metadata:
  author: yabafre
  version: {{CLI_VERSION}}
---

# APED Story — Detailed Story Preparation

Create a single, implementation-ready story file with all the context needed for `/aped-dev`.

## Critical Rules

- Create ONE story at a time — the next one to implement
- The story file must be self-contained — everything the dev agent needs to implement
- Discuss the story with the user before finalizing — this is a collaborative process
- Quality of story definition determines quality of implementation
- **Branch-per-story is inviolable.** In parallel-sprint mode (worktree present), /aped-story runs **inside the worktree on the feature branch** and commits the story file there — never in main. The `story-ready` check-in is posted by this skill, not by /aped-sprint.
- **State.yaml authority lives in main.** In worktree mode, /aped-story writes the worktree's local state.yaml (status flip to `ready-for-dev`) and commits it on the feature branch. This local copy is intentionally divergent from main: /aped-lead is the only writer of main's state.yaml, and /aped-ship resolves merge conflicts on state.yaml with `--ours`. Don't treat the divergence as a bug — it's the design (see aped-dev.md § State.yaml authority).

## Mode Detection

Before anything else, decide whether we are in **solo mode** (main project, no parallel sprint) or **worktree mode** (dispatched by /aped-sprint):

- `ls {{APED_DIR}}/WORKTREE` succeeds → **worktree mode** (expected when invoked from a /aped-sprint dispatch). Read the marker to recover `story_key`, `ticket`, `branch`.
- `ls {{APED_DIR}}/WORKTREE` fails → **solo mode** (user running /aped-story directly to prep the next story in main).

In worktree mode, the story-key argument is optional — the marker tells us. If the user passed one and it mismatches, HALT and ask the user which is authoritative. If the current branch is `main` (not the feature branch), HALT: "Run `/aped-story` in the worktree's feature branch, not main. Branch-per-story rule."

## Input Discovery

Before story selection, discover and load upstream APED artefacts. The story file must be self-contained for `/aped-dev`, so it embeds context drawn from these documents.

### 1. Glob discovery

Search these locations in order:
- `{{OUTPUT_DIR}}/**`
- `{{APED_DIR}}/**`
- `docs/**` (project root)

Look for these artefacts (✱ = required):
- Epics — `epics.md` ✱
- PRD — `*prd*.md` or `prd.md`
- UX Spec — `ux/*.md` (sharded: design-spec, screen-inventory, components, flows)
- Architecture — `*architecture*.md` or `architecture.md`
- Product Brief — `*brief*.md` or `product-brief.md`
- Project Context — `*context*.md` or `project-context.md`
- Lessons — `{{OUTPUT_DIR}}/lessons.md` (filter entries with `Scope: /aped-story` or `Scope: all` — produced by `/aped-retro` after each epic)
- Previous stories — `{{OUTPUT_DIR}}/stories/*.md` from completed stories of the current epic (continuity, decisions made earlier)

### 2. Required-input validation (hard-stop)

For ✱ Epics:
- If found: continue
- If missing: HALT with this message:
  > "Story preparation requires `epics.md` (the story plan). Run `/aped-epics` first."

### 3. Load + report

- Load every discovered file completely (no offset/limit).
- Brownfield/greenfield is detected via `project-context.md` presence.

Present a discovery report (adapt to `communication_language`):

> Setting up `/aped-story` for {project_name}.
>
> **Documents discovered:**
> - Epics: {N} files {✓ loaded — {M} stories indexed | ✱ MISSING — HALT}
> - PRD: {N} files {✓ loaded — FRs cross-referenced for the story | (none)}
> - UX Spec: {N} files {✓ loaded — story will reference screens/components | (none)}
> - Architecture: {N} files {✓ loaded — story respects pattern decisions | (none)}
> - Project Context: {N} files {✓ loaded (brownfield) | (none)}
> - Lessons: {N} entries scoped to `/aped-story` or `all` {✓ applied to draft | (none — first epic)}
> - Previous stories: {N} completed stories in epic {epic#} {✓ loaded for continuity | (none — first story of epic)}
>
> **Files loaded:** {comma-separated filenames}
>
> [C] Continue to story selection
> [Other] Add a file path / paste content — I'll load it and redisplay

⏸ **HALT — wait for `[C]` or additional inputs.**

### 4. Bias the rest of the workflow

Loaded artefacts inform story-file content:
- Acceptance criteria reference PRD FRs by ID (e.g. "FR-12, FR-13").
- Implementation notes reference architecture decisions by section (e.g. "use the auth pattern from architecture.md §2.2").
- Frontend stories list concrete components/screens from the UX spec.
- In brownfield mode, story files include "files to modify" pulled from `project-context.md` rather than only "files to create".
- **Lessons are applied to the draft, not just acknowledged.** For each loaded lesson with scope `/aped-story` or `all`:
  - Apply its `Rule:` to the story being drafted (e.g. if Epic 1's lesson was "always split auth from authz", check whether the new story conflates them and propose splitting).
  - Cite the lesson in Discussion Points: "Per Epic {N}'s retro lesson on `{topic}`, I'd suggest {adjustment}. Override?"
  - This is the feedback loop the retro phase exists for — do not treat lessons as advisory.
- **Previous stories of the current epic** inform continuity:
  - Reuse decisions made in earlier stories rather than re-litigating them (e.g. if story 1-1 chose Zod for validation, story 1-2 doesn't re-evaluate validation library).
  - Surface implicit dependencies ("story 1-3 builds on the schema introduced in 1-1").
  - Avoid contradictions in technical approach across the same epic.

## Setup

1. Read `{{APED_DIR}}/config.yaml` — extract config including `ticket_system`
2. Read `{{OUTPUT_DIR}}/state.yaml` — find sprint stories
3. Epics already loaded in Input Discovery — confirm story list is available

## Story Selection

Scan `sprint.stories` for the first story with status `pending` (no story file yet).
- If user specifies a story key: use that one instead
- If all stories have files: "All stories are prepared. Run `/aped-dev` to implement."
- Show the selected story's summary from epics.md

## Ticket Fetch (source of truth)

If `ticket_system` is not `none` and the story has a ticket ID in `sprint.stories.{key}.ticket`:

1. Fetch the ticket from the system (it may have been edited by the team since `/aped-epics` ran):
   - `github-issues`: `gh issue view {id} --json title,body,labels,comments,assignees,state`
   - `gitlab-issues`: `glab issue view {id}`
   - `linear`: linear CLI or API
   - `jira`: curl to jira API

2. **The ticket is the source of truth.** If the team edited the description, ACs, or added comments:
   - Use the ticket's current body as the baseline
   - Review any new comments — they often contain clarifications or new requirements
   - If there are conflicts with `epics.md`, flag them to the user and ask which wins

3. Assign the ticket to the current user (optional, depends on provider):
   - `github-issues`: `gh issue edit {id} --add-assignee @me`
   - `gitlab-issues`: `glab issue assign {id} --assignee @me`

## Context Compilation

Most context (PRD FRs, UX screens, completed stories of the current epic, lessons, project-context) is already loaded by Input Discovery. The remaining live sources to gather before drafting:

1. **Ticket** — (above) the current state of the issue in the ticket system, including comments added since the last sprint-planning pass
2. **Codebase scan** — if code exists, scan for relevant patterns, existing models, APIs that the story will touch (in brownfield mode, ground this in the modules listed in `project-context.md` rather than blanket scanning)

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

Use template `{{APED_DIR}}/templates/story.md`. Fill every section:

### Required Sections
- **Header**: story key, epic, title, status (`ready-for-dev`)
- **User Story**: As a / I want / So that
- **Acceptance Criteria**: numbered, Given/When/Then format
- **Tasks**: checkboxes with AC references `- [ ] task description [AC: AC#]`
- **Dev Notes**: architecture guidance, file paths, dependencies, patterns to follow
- **File List**: expected files to create/modify

### Ticket Integration
If `ticket_system` is not `none`:
- Read `{{APED_DIR}}/aped-dev/references/ticket-git-workflow.md`
- Add `**Ticket:** {{ticket_id}}`
- Add `**Branch:** feature/{{ticket_id}}-{{story-slug}}`
- Add commit prefix in Dev Notes

## Output

1. Write story file to `{{OUTPUT_DIR}}/stories/{story-key}.md`
2. Update `{{OUTPUT_DIR}}/state.yaml`: story status → `ready-for-dev`
3. **Sync back to ticket system** (if `ticket_system` != `none`):
   - If the refined ACs differ from the ticket body: post a comment on the ticket summarizing the refinements
   - Don't overwrite the ticket body (it may have user edits) — use comments instead
   - `github-issues`: `gh issue comment {id} --body "..."`
   - `gitlab-issues`: `glab issue note create {id} --message "..."`

### Worktree mode only — commit + story-ready

In worktree mode, the story file and state.yaml edit must land on the feature branch, then a `story-ready` check-in is posted so `/aped-lead` can approve.

1. Verify branch: `git symbolic-ref --short HEAD` must match the marker's `branch`. If not, HALT.
2. Stage and commit on the feature branch:
   ```bash
   git add {{OUTPUT_DIR}}/stories/{story-key}.md {{OUTPUT_DIR}}/state.yaml
   git commit -m "docs({ticket}): draft story file for {story-key}"
   ```
3. Post the check-in:
   ```bash
   bash {{APED_DIR}}/scripts/checkin.sh post {story-key} story-ready
   ```
4. Report to the user: "`story-ready` posted. Back in the main project, run `/aped-lead` to approve. Once approved, the Lead will `tmux send-keys` `/aped-dev {story-key}` into this window (or print the command to run here manually)."

In solo mode, skip steps 1–3 and tell the user: "Story file ready. Run `/aped-dev {story-key}` to implement."

## Example

User runs `/aped-story`:
1. Next pending story: 1-2-inventory-crud
2. Reads FR2, FR3 from PRD + inventory screen from UX spec
3. Presents draft: "CRUD for inventory items — 4 ACs, 6 tasks"
4. User: "Add an AC for duplicate item names"
5. Updates draft, user validates
6. Writes `{{OUTPUT_DIR}}/stories/1-2-inventory-crud.md`
7. "Story ready. Run `/aped-dev` to implement."

## Common Issues

- **Story too large (>8 tasks)**: Split into two stories — discuss with user where to cut
- **Missing context from previous story**: Read the completed story file for decisions made
- **User wants to skip a story**: Mark as `skipped` in state.yaml, move to next
- **User wants to reorder stories**: Update state.yaml ordering, check for dependency issues

## Next Step

- **Solo mode**: "Story file is ready at `{{OUTPUT_DIR}}/stories/{story-key}.md`. Run `/aped-dev` to implement it."
- **Worktree mode**: "Story file committed on `{branch}`. `story-ready` check-in posted. Go to the main project and run `/aped-lead` — the Lead will approve and push `/aped-dev {story-key}` back into this window."

**Do NOT auto-chain.** The user decides when to proceed.
