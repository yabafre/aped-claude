---
name: aped-story
keep-coding-instructions: true
description: 'Use when user says "create story", "prepare next story", "aped story", or invokes aped-story.'
allowed-paths:
  write: ["{{OUTPUT_DIR}}/**", "{{APED_DIR}}/**"]
  read-only: ["src/**", "tests/**", "package.json"]
argument-hint: "[story-key]"
license: MIT
metadata:
  author: yabafre
  version: {{CLI_VERSION}}
---

# APED Story — Detailed Story Preparation

Create a single, implementation-ready story file with all the context needed for `aped-dev`.

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

- Create ONE story at a time — the next one to implement
- The story file must be self-contained — everything the dev agent needs to implement
- Discuss the story with the user before finalizing — this is a collaborative process
- Quality of story definition determines quality of implementation
- **Branch-per-story is inviolable.** In parallel-sprint mode (worktree present), aped-story runs **inside the worktree on the feature branch** and commits the story file there — never in main. The `story-ready` check-in is posted by this skill, not by aped-sprint.
- **State.yaml authority lives in main.** In worktree mode, aped-story writes the worktree's local state.yaml (status flip to `ready-for-dev`) and commits it on the feature branch. This local copy is intentionally divergent from main: aped-lead is the only writer of main's state.yaml, and aped-ship resolves merge conflicts on state.yaml with `--ours`. Don't treat the divergence as a bug — it's the design (see aped-dev.md § State.yaml authority).

### Iron Law

**NO STORY WITHOUT EXACT FILE PATHS, FULL CODE BLOCKS, EXACT TEST COMMANDS.** The persona reading this story is the enthusiastic junior with poor taste (see `## Reader persona`). If the story leaves room for interpretation, that junior will pick the wrong path. Verbosity in the story is cheaper by an order of magnitude than ambiguity in the implementation.

> **Setup pointer.** Integrates with `ticket_system` in `{{APED_DIR}}/config.yaml` — fetches the ticket as source of truth before drafting and syncs refined ACs back via comment. With `ticket_system: none`, story is internal-markdown only. Run `npx aped-method` to (re)configure. Hard-dep matrix: `docs/skills-classification.md`.

### Red Flags

Phrases that mean you are writing a story the junior will misread. If you catch yourself thinking any of these, stop.

| Phrase | Why it's wrong |
|--------|----------------|
| "Implement the validation logic similar to story X" | "Similar to" loses the differences that matter. Write what *this* story needs. |
| "Add appropriate error handling" | "Appropriate" is the agent's escape hatch. Specify the error cases. |
| "Follow the existing pattern" | If the pattern is load-bearing, name it and link to one example. |
| "The dev will figure it out from the architecture doc" | The dev has fresh context per task — assume zero memory. |
| "I'll list the files affected, the dev will know which functions" | List the functions. List the line numbers if they exist. |

### Rationalizations

| Excuse | Reality |
|--------|---------|
| "This would be too verbose if I wrote it all out" | The cost of verbosity is bytes. The cost of ambiguity is rework. |
| "The dev agent has the project context" | Fresh subagents per task. No inherited context. None. |
| "Tests are obvious from the AC" | If they are, write them. If they aren't, write them anyway. |
| "I'll add the missing details when the dev asks" | The dev won't ask — it'll guess and ship. |

## Reader persona

> Stories must be readable by an **enthusiastic junior engineer with poor taste, no judgement, no project context, and an aversion to testing**. If the story leaves room for interpretation, that junior will pick the wrong path. Granularity, exactness of file paths, and explicit test commands are non-negotiable.

This persona is the canonical reader of every story you produce. It is the testable target of granularity:

- **No file path?** The junior will create a new file in the wrong directory.
- **Snippet instead of full code?** The junior will fill in the gap from training-data templates and miss the project's conventions.
- **No test command?** The junior will skip testing.
- **"Similar to story X"?** The junior will copy the wrong differences.
- **"Add appropriate error handling"?** The junior will catch every exception and `console.log` it.

Every Red Flag in the previous section maps back to "the junior would misread this." When in doubt about whether a detail is necessary, ask: **would the junior produce the right code from this without it?** If no, write it.

## Step 0: Quote current symbols (read before designing)

For any task that modifies existing code, **read the file(s) being modified first** and **quote the current state** of every symbol you intend to change. Drop the quoted block into the story's Dev Notes verbatim — function signature, type definition, exported constant, current return shape, current error path. Pocock superpowers issue #1234 (lessons absorbed by Jesse but not by APED until 4.11.0): "the most common plan-vs-reality mismatch is the writer's mental model of the code differing from the actual code at write time." The verbatim quote is the only mechanism that catches this *before* the dev agent burns three RED cycles.

Example block in Dev Notes:

```markdown
### Existing code at write time

`src/auth/jwt.ts:45-58` (current):
```ts
export function signToken(payload: Payload): string {
  // current implementation — see git@<sha> for canonical version
  ...
}
```

This story modifies the return shape from `string` to `{ token: string; expiresAt: number }`.
```

If the file does not exist yet (greenfield story), say so explicitly: `### Existing code: none — this is a new file.` Do not skip Step 0 silently — silent skip is the bug pattern this section closes.

## File structure design (upfront)

Before defining tasks, map out which files this story will create or modify and what each one is responsible for. **This is where decomposition decisions get locked in** — a story with eight tasks but no file map produces eight tasks that each end up touching three files apiece, and the dev agent loses track of what belongs where.

Design units with clear boundaries and well-defined interfaces. Each file should have **one clear responsibility**. Files that change together should live together — split by responsibility, **not by technical layer**. (A "controller / service / repository" trio that only ever changes together for a single feature is one responsibility split into three files; a single auth file that handles both registration and authorization is two responsibilities crammed into one.) Smaller, focused files are easier for both the dev agent and the future reader to hold in context — and the dev agent's edits are more reliable when each file is narrow.

In existing codebases, follow established patterns. If the codebase uses large files, do not unilaterally restructure as part of a story; but if the file you're touching has grown unwieldy, including a targeted split in this story's File List is reasonable.

For each file the story creates or modifies, write a 3-bullet decision template in the Dev Notes:

- **File name + path** — exact relative path from repo root (e.g. `src/auth/jwt.ts`).
- **Single responsibility** — one sentence stating what this file is for, in user-value terms (e.g. "Sign and validate JWT tokens for the auth module"). If the sentence needs an "and", split the file.
- **Inputs + outputs** — what this file imports / depends on, and what it exports / returns. (e.g. "Imports `jsonwebtoken`, env `JWT_SECRET`. Exports `signToken(payload)`, `validateToken(token)`.")

This file map is the input to the Task granularity contract below — every task references one of these files by exact path.

## Task granularity contract (Reader persona consumer)

This contract makes the granularity of a story task **testable** rather than judged by feel. Every task in the Execution list of a generated story MUST satisfy all five conditions below. The Self-review checklist verifies them before the user gate.

### Five must-haves per task

1. **Exact file path** — repository-relative or absolute. Not "the auth module", not "wherever the validation lives". The junior must not have to grep.
2. **Full code block** — the complete code to add or replace, not a snippet. If the surrounding context matters, include it; if a function changes, include the whole function. Snippets force the junior to fill gaps from training-data templates instead of project conventions.
3. **Exact test command** — the literal command to run (e.g. `pnpm vitest run tests/auth.test.ts`). Not "run the tests".
4. **Expected output** — at minimum, the pass line the test produces (`✓ should reject expired tokens`, `Tests: 4 passed`, exit 0). The junior compares this against the actual output instead of guessing whether it worked.
5. **Commit step** — the literal `git add <files> && git commit -m "<message>"` to run after the GREEN gate. Not "commit when done", not implicit.

### Estimated runtime: 2–5 minutes

Each task should take a focused junior between two and five minutes to execute. A task that takes longer is too coarse — split it. Ten tasks of three minutes are uniformly easier to verify than one task of thirty minutes.

### Forbidden patterns (audit during Self-review)

| Pattern | Why it fails | What to write instead |
|---------|--------------|----------------------|
| "see line X of file Y" | Line numbers drift; the junior won't open the file at the right time. | Inline the relevant code in the task. |
| "snippet only" / "..." inside code | Forces the junior to invent the missing parts. | Full code block, even if 30 lines. |
| "commit when done" | "Done" is the junior's judgment call — they always say yes. | Literal `git add ... && git commit -m "..."`. |
| "fill in error handling" | "Appropriate" is the agent's escape hatch. | Specify the error cases, the response codes, the retry policy. |
| "similar to task N" | Loses the differences that matter. | Write what *this* task needs in full. |

### Good task example

```markdown
- [ ] **Add `validateToken` to `src/auth/jwt.ts`**
  Add the function below to `src/auth/jwt.ts` (alongside `signToken`):
  ```ts
  export function validateToken(token: string): { sub: string; exp: number } {
    const { sub, exp } = jwt.verify(token, JWT_SECRET) as { sub: string; exp: number };
    if (Date.now() / 1000 > exp) throw new TokenExpiredError();
    return { sub, exp };
  }
  ```
  Run: `pnpm vitest run tests/auth/jwt.test.ts`
  Expected: `Tests: 4 passed`, exit 0.
  Commit: `git add src/auth/jwt.ts tests/auth/jwt.test.ts && git commit -m "feat(auth): add validateToken (FR-12)"`
```

### Bad task counter-example (what fails the contract)

```markdown
- [ ] Add token validation similar to story 2-1 with appropriate error handling. See the auth module. Test it and commit when done.
```

Five failures: no path (`auth module`), snippet-or-less ("similar to story 2-1"), no test command, no expected output, vague commit step. The junior would invent five different implementations on five different runs — and ship one of them.

## Mode Detection

Before anything else, decide whether we are in **solo mode** (main project, no parallel sprint) or **worktree mode** (dispatched by aped-sprint):

- `ls {{APED_DIR}}/WORKTREE` succeeds → **worktree mode** (expected when invoked from a aped-sprint dispatch). Read the marker to recover `story_key`, `ticket`, `branch`.
- `ls {{APED_DIR}}/WORKTREE` fails → **solo mode** (user running aped-story directly to prep the next story in main).

In worktree mode, the story-key argument is optional — the marker tells us. If the user passed one and it mismatches, HALT and ask the user which is authoritative. If the current branch is `main` (not the feature branch), HALT: "Run `aped-story` in the worktree's feature branch, not main. Branch-per-story rule."

## Input Discovery

Before story selection, discover and load upstream APED artefacts. The story file must be self-contained for `aped-dev`, so it embeds context drawn from these documents.

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
- Lessons — `{{OUTPUT_DIR}}/lessons.md` (filter entries with `Scope: aped-story` or `Scope: all` — produced by `aped-retro` after each epic)
- Previous stories — `{{OUTPUT_DIR}}/stories/*.md` from completed stories of the current epic (continuity, decisions made earlier)

### 2. Required-input validation (hard-stop)

For ✱ Epics:
- If found: continue
- If missing: HALT with this message:
  > "Story preparation requires `epics.md` (the story plan). Run `aped-epics` first."

### 3. Load + report

- Load every discovered file completely (no offset/limit).
- Brownfield/greenfield is detected via `project-context.md` presence.

Present a discovery report (adapt to `communication_language`):

> Setting up `aped-story` for {project_name}.
>
> **Documents discovered:**
> - Epics: {N} files {✓ loaded — {M} stories indexed | ✱ MISSING — HALT}
> - PRD: {N} files {✓ loaded — FRs cross-referenced for the story | (none)}
> - UX Spec: {N} files {✓ loaded — story will reference screens/components | (none)}
> - Architecture: {N} files {✓ loaded — story respects pattern decisions | (none)}
> - Project Context: {N} files {✓ loaded (brownfield) | (none)}
> - Lessons: {N} entries scoped to `aped-story` or `all` {✓ applied to draft | (none — first epic)}
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
- **Lessons are applied to the draft, not just acknowledged.** For each loaded lesson with scope `aped-story` or `all`:
  - Apply its `Rule:` to the story being drafted (e.g. if Epic 1's lesson was "always split auth from authz", check whether the new story conflates them and propose splitting).
  - Cite the lesson in Discussion Points: "Per Epic {N}'s retro lesson on `{topic}`, I'd suggest {adjustment}. Override?"
  - This is the feedback loop the retro phase exists for — do not treat lessons as advisory.
- **Previous stories of the current epic** inform continuity:
  - Reuse decisions made in earlier stories rather than re-litigating them (e.g. if story 1-1 chose Zod for validation, story 1-2 doesn't re-evaluate validation library).
  - Surface implicit dependencies ("story 1-3 builds on the schema introduced in 1-1").
  - Avoid contradictions in technical approach across the same epic.

## Setup

1. Read `{{OUTPUT_DIR}}/state.yaml` — find sprint stories
2. Epics already loaded in Input Discovery — confirm story list is available

## Story Selection

Scan `sprint.stories` for the first story with status `pending` (no story file yet).
- If user specifies a story key: use that one instead
- If all stories have files: "All stories are prepared. Run `aped-dev` to implement."
- Show the selected story's summary from epics.md

## Ticket Fetch (source of truth)

If `ticket_system` is not `none` and the story has a ticket ID in `sprint.stories.{key}.ticket`:

1. Fetch the ticket from the system (it may have been edited by the team since `aped-epics` ran):
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

## Self-review (run before user gate)

Before presenting the story file to the user, walk this checklist. Each `[ ]` must flip to `[x]` or HALT. If the lint step exits 1, present its output verbatim and ask `[F]ix` / `[O]verride (record reason)`.

- [ ] **Placeholder lint** — run `bash {{APED_DIR}}/scripts/lint-placeholders.sh <story-file>`.
- [ ] **Exact file paths** — every Execution task references a real file path (not "the auth module"). Persona check: the junior should not have to guess.
- [ ] **Test commands** — every task with verifiable behaviour has an exact test command and expected output (not "run the tests").
- [ ] **Given/When/Then ACs** — every Acceptance Criterion follows the Given/When/Then form. No bare "make it work" lines.
- [ ] **AC behavioural discipline** — Acceptance Criteria describe user-visible behaviour or interface contracts, not implementation paths. No file paths, no line numbers, no internal helper names in ACs. ("The system rejects expired tokens" — yes. "The validateToken function in src/auth/jwt.ts:42 throws TokenExpiredError" — no.) File paths and code blocks belong in Tasks, not ACs.
- [ ] **Dependencies done** — every entry in `depends_on:` is a story whose status is `done` in `state.yaml`.
- [ ] **Reader persona check** — re-read the story top-to-bottom asking "would the junior produce the right code from this?" If any answer is "probably not", fix.
- [ ] **Task granularity contract** — every Execution task has all five must-haves (exact path, full code, exact test command, expected output, literal commit step) and is estimated 2–5 min for the junior persona. Split anything bigger; rewrite anything that matches a Forbidden pattern from the contract.

## Output

1. Write story file to `{{OUTPUT_DIR}}/stories/{story-key}.md`
2. Run `aped_state.advance(phase: "stories", status: "in-progress")`. If MCP unavailable, fall back: update `{{OUTPUT_DIR}}/state.yaml` — story status → `ready-for-dev`.
3. **Sync back to ticket system** (if `ticket_system` != `none`) — use `aped_ticket.link_pr(ticket_id, pr_url)` or `aped_ticket.create_issue(...)` if MCP available. Fall back to `gh`/`linear` CLI:
   - If the refined ACs differ from the ticket body: post a comment on the ticket summarizing the refinements
   - Don't overwrite the ticket body (it may have user edits) — use comments instead
   - `github-issues`: `gh issue comment {id} --body "..."`
   - `gitlab-issues`: `glab issue note create {id} --message "..."`

### Worktree mode only — commit + story-ready

In worktree mode, the story file and state.yaml edit must land on the feature branch, then a `story-ready` check-in is posted so `aped-lead` can approve.

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
4. Report to the user: "`story-ready` posted. Back in the main project, run `aped-lead` to approve. Once approved, the Lead will `tmux send-keys` `aped-dev {story-key}` into this window (or print the command to run here manually)."

In solo mode, skip steps 1–3 and tell the user: "Story file ready. Run `aped-dev {story-key}` to implement."

## Example

User runs `aped-story`:
1. Next pending story: 1-2-inventory-crud
2. Reads FR-2, FR-3 from PRD + inventory screen from UX spec
3. Presents draft: "CRUD for inventory items — 4 ACs, 6 tasks"
4. User: "Add an AC for duplicate item names"
5. Updates draft, user validates
6. Writes `{{OUTPUT_DIR}}/stories/1-2-inventory-crud.md`
7. "Story ready. Run `aped-dev` to implement."

## Common Issues

- **Story too large (>8 tasks)**: Split into two stories — discuss with user where to cut
- **Missing context from previous story**: Read the completed story file for decisions made
- **User wants to skip a story**: Mark as `skipped` in state.yaml, move to next
- **User wants to reorder stories**: Update state.yaml ordering, check for dependency issues

## Next Step

- **Solo mode**: "Story file is ready at `{{OUTPUT_DIR}}/stories/{story-key}.md`. Run `aped-dev` to implement it."
- **Worktree mode**: "Story file committed on `{branch}`. `story-ready` check-in posted. Go to the main project and run `aped-lead` — the Lead will approve and push `aped-dev {story-key}` back into this window."

**Do NOT auto-chain.** The user decides when to proceed.

## Completion Gate

BEFORE declaring this skill complete, Read `{{APED_DIR}}/skills/aped-skills/checklist-story.md` and verify every item. Do NOT skip this step. If any item is unchecked, you are NOT done.
