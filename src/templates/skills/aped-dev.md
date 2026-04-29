---
name: aped-dev
description: 'Use when user says "start dev", "implement story", "aped dev", or invokes aped-dev.'
argument-hint: "[story-key]"
disable-model-invocation: true
license: MIT
metadata:
  author: yabafre
  version: {{CLI_VERSION}}
---

# APED Dev Sprint — TDD Story Implementation

## Critical Rules

- NEVER mark a task `[x]` without passing all 5 gate conditions
- ALWAYS write the failing test FIRST — no implementation without a RED test
- Take your time — quality is more important than speed
- Do not skip validation steps or test runs

### Iron Law

**NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.** Code written before its test must be deleted, not adapted — sunk cost is the strongest force pulling toward "tests after". Watching the test fail is irreplaceable: if you didn't see RED, you don't know the test exercises the right path.

### Red Flags

Phrases that mean you are about to ship code without TDD discipline. If you catch yourself thinking any of these, stop.

| Phrase | Why it's wrong |
|--------|----------------|
| "Test framework unavailable, I'll add tests after" | Tests-after is a different skill from TDD. The 5-gate is non-negotiable. |
| "This change is too small to need a test" | Small changes are where untested regressions hide. |
| "The existing code has no tests so it's fine" | The deficit is the bug. Add tests for what you touch. |
| "I'll just add a `// TODO: test this`" | TODO is a banned placeholder, not a plan. |
| "I already manually tested it" | Manual testing is not regression coverage. |

### Rationalizations

| Excuse | Reality |
|--------|---------|
| "Tests after achieve the same goal" | Tests-after rarely fail on the right path the first time — you can't trust they exercise the bug they were meant to catch. |
| "I'll fix the test in the next task" | You won't. Next-task you is busy with next-task work. |
| "The dev agent reported tests passing" | If you didn't capture the output in this message, it's not evidence. Re-run and paste. |
| "Just this once, I'll skip the RED step" | "Just this once" is the rationalization Superpowers explicitly fights — it appears every time and erodes the discipline. |

## Blocker-halt gate

Some failures are not "try harder" failures — they are "stop and surface" failures. Continuing past them produces broken plans, silent dependency drift, or work on the wrong branch. Apply this gate before every RED→GREEN→REFACTOR cycle and at every step boundary.

**STOP executing immediately when:**
- Hit a blocker (missing dependency, test fails, instruction unclear)
- Plan has critical gaps preventing starting
- You don't understand an instruction
- Verification fails repeatedly

**Ask for clarification rather than guessing.**

In addition: **never start implementation on `main` / `master` branch without explicit user consent.** APED's branch-per-story rule (one feature branch per story) is non-negotiable; if the current branch is `main` (classic mode without a worktree), HALT and ask the user to create a feature branch first or to confirm a one-off exception in writing.

When this gate fires inside a worktree session, post a `dev-blocked` check-in (see `## HALT Conditions` § parallel-sprint mode) before halting — the user is in `aped-lead` in the main project, not watching this terminal. A silent HALT is invisible to them.

**Don't force through blockers** — stop and ask.

## Guiding Principles

### 1. Understand Before You Code
Read the story, its ACs, and the existing code BEFORE writing anything. If the story references files, read them. If it mentions a pattern, find an existing example in the codebase. The most expensive mistake is building the wrong thing correctly.

### 2. Small Increments, Verified Progress
Each task is one RED→GREEN→REFACTOR cycle. Do not batch multiple tasks into one implementation pass. A task that touches more than 3 files is suspicious — it may need splitting. Commit after each GREEN gate, not at the end.

### 3. The Test Proves the Behavior, Not the Implementation
Write tests that assert WHAT the code does, not HOW it does it. `expect(result).toBe(42)` is good. `expect(mockDb.query).toHaveBeenCalledWith("SELECT...")` is fragile. Test the contract, not the wiring.

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

## Input Discovery

Before any work, discover and load all upstream APED artefacts. Implementation must align with the PRD's FRs, the architecture's patterns, the UX spec's components, and (in brownfield mode) existing-system constraints.

In worktree mode, glob from the worktree's checkout — discovery sees the feature branch's view of the docs, which is what the story implementation should ground in.

### 1. Glob discovery

Search these locations in order:
- `{{OUTPUT_DIR}}/**`
- `{{APED_DIR}}/**`
- `docs/**` (project root)

Look for these artefacts (✱ = required):
- Story file — `{{OUTPUT_DIR}}/stories/{story-key}.md` ✱ (resolved after Worktree Mode Detection in Setup)
- PRD — `*prd*.md` or `prd.md`
- Architecture — `*architecture*.md` or `architecture.md`
- UX Spec — `ux/*.md` (sharded: design-spec, screen-inventory, components, flows)
- Epic Context Cache — `{{OUTPUT_DIR}}/epic-{N}-context.md` (where N = epic number from story key)
- Project Context — `*context*.md` or `project-context.md`
- Product Brief — `*brief*.md` or `product-brief.md`
- Lessons — `{{OUTPUT_DIR}}/lessons.md` (filter entries with `Scope: aped-dev` or `Scope: all` — produced by `aped-retro` after each epic)

### 2. Required-input validation (hard-stop)

For the ✱ Story file:
- If found: continue
- If missing: HALT with this message:
  > "No story file found at `{{OUTPUT_DIR}}/stories/{story-key}.md`. Run `aped-story` first to prepare it."

(This validation is performed *after* Worktree Mode Detection in Setup, since `story_key` is resolved there.)

### 3. Load + report

- Load every discovered file completely (no offset/limit).
- Brownfield/greenfield is detected via `project-context.md` presence.

Present a short discovery report (full report in interactive sessions; in worktree mode where `aped-dev` was auto-launched, log a one-liner instead — the user is not at the keyboard for a `[C]` confirmation):

> Implementing story {story-key} in {project_name}.
> Loaded: PRD ({M} FRs), Architecture {✓|—}, UX Spec {✓|—}, Project Context {✓ brownfield|—}, Epic Context Cache {✓ fresh|recompiling|—}, Lessons ({K} dev-scoped rules to enforce).

In **classic (non-worktree)** mode, present the full discovery report and HALT for `[C]` confirmation. In **worktree mode**, skip the confirmation — the worktree was launched by `aped-sprint` with auto-injected prompt, no human at the keyboard.

### 4. Bias the rest of the workflow

Loaded artefacts inform every TDD cycle:
- Tests assert behaviour described in the story's ACs, which reference PRD FRs by ID.
- Implementation respects naming conventions, layering, and patterns from the architecture document.
- Frontend tasks render the components listed in the UX spec, not invented ones.
- In brownfield mode, "Existing Patterns Are Law" (Guiding Principle 4) means the patterns documented in `project-context.md` win even over architecture decisions if the architecture decision was made for greenfield work.
- **Lessons are enforced, not advisory.** For each loaded lesson with scope `aped-dev` or `all`:
  - The `Rule:` becomes a check in the Pre-Implementation Checklist (e.g. if Epic 1's lesson was "always include error states in TDD", the checklist gains a "Error states test exists?" line).
  - When the lesson's `Mistake:` matches a pattern detectable in the current task, surface it before writing code: "Per Epic {N}'s lesson, this kind of task historically forgot {X}. Including {X} now."
  - Lessons that contradict the story's ACs win — flag the conflict to the user rather than silently overriding.

### 4b. Update the epic-context cache to reflect lessons

The epic-context cache compiled below now has lessons as a 4th input source (see Epic Context Compilation). When recompiling, lessons scoped `aped-dev` or `all` are interpolated into the "Key code patterns" section so they're surfaced inline during implementation, not just at skill entry.

## Setup

1. **Worktree Mode Detection** — three-step lookup, in order:
   1. If `{{APED_DIR}}/WORKTREE` exists → read it (`story_key`, `ticket`, `branch`, `project_root`). Done.
   2. Else, run `git rev-parse --git-common-dir` — if its parent differs from `git rev-parse --show-toplevel`, we're inside a git worktree (not the main checkout). Infer:
      - `branch` from `git symbolic-ref --short HEAD`
      - If branch matches `feature/{ticket}-{story-key}` (the APED/workmux convention), extract `ticket` (first dash-delimited segment after `feature/`) and `story_key` (the remainder). Example: `feature/KON-83-1-2-contract` → ticket=`KON-83`, story_key=`1-2-contract`
      - `project_root` = `dirname $(git rev-parse --git-common-dir)`
      - Write the marker now to cache the inference for future invocations.
   3. Else, classic single-session mode (main project, no worktree). Proceed normally.

   In worktree mode (1 or 2), this session is **pinned** to the inferred story. Read state.yaml from the **worktree's own checkout** (`./{{OUTPUT_DIR}}/state.yaml`, i.e. the file on the feature branch) — NOT main's copy. See "State.yaml authority" below for why.

   Verify the story exists in the worktree's state.yaml; if not, HALT with a clear error — the worktree doesn't map to a known story (likely a branch checked out without aped-sprint, or a state.yaml that was never propagated by aped-story).

   In worktree mode, skip "Story Selection" and skip any git branch creation — the worktree already has the right branch.

2. Read `{{APED_DIR}}/config.yaml` — extract config (worktree-local copy is fine; config rarely changes mid-sprint).
3. Read state.yaml from the current checkout (worktree's local copy in worktree mode, main's in classic mode) — find the target story.

### State.yaml authority

**Each worktree owns its own copy of state.yaml on its feature branch.** aped-story writes it, aped-dev reads + writes it, aped-review reads + writes it — all locally. Worktrees never reach across to main's state.yaml at runtime.

Main's state.yaml is the **authoritative** copy. aped-lead writes there when it approves check-ins (status flips to `done`, etc.). At merge time, aped-ship resolves state.yaml conflicts with `--ours` — main wins, the feature branch's state.yaml is intentionally discarded. This is by design, not a workaround:

- It keeps each worktree autonomous (no cross-process state lookup, no cache invalidation, no race on a shared file).
- It makes aped-lead the single source of truth for sprint lifecycle transitions.
- It's safe because worktree-local state.yaml writes are scoped to the story being worked on; nothing else cares.

**Do not "fix" perceived inconsistencies between worktree state.yaml and main's** — they are expected and resolved at ship.

## Story Selection

**Worktree mode:** the story is already pinned by `{{APED_DIR}}/WORKTREE`. Skip this section.

**Classic mode:** scan `sprint.stories` top-to-bottom for the first `ready-for-dev` story.
- If the user passed an argument (`aped-dev {story-key}`), use that one instead
- If none found: report "All stories implemented or in review" and stop
- Check if story file exists at `{{OUTPUT_DIR}}/stories/{story-key}.md`
  - If file missing: tell user "Story file not found. Run `aped-story` first to prepare it." and stop
- Read story file
- Story key format: `{epic#}-{story#}-{slug}`

## Review Continuation Check

If story has `[AI-Review]` items: address them BEFORE regular tasks.

When `aped-review` has reported findings and handed control back to `aped-dev`, invoke `aped-receive-review` to process the feedback before touching code. The receive-review skill enforces the "no performative agreement, technical verification first" discipline (verify each item against the codebase, ask for clarification on any unclear item, push back on technically wrong feedback with evidence, run a YAGNI grep before "implementing properly" on possibly-unused features). Skipping this step typically produces partial fixes plus rework.

## State Update (start)

Update `{{OUTPUT_DIR}}/state.yaml`: story — `in-progress`, epic — `in-progress` if first story.

## Task Tracking

Create a task for each story task checkbox:
```
For each "- [ ] task description [AC: AC#]" in story:
  TaskCreate: "task description" (status: todo)
```
Update each to `in_progress` when starting RED, `completed` when GATE passes.

## Epic Context Compilation

Before diving into the story, check if a cached context file exists for this epic:

**Cache path:** `{{OUTPUT_DIR}}/epic-{N}-context.md` (where N = epic number from story key)

### If cache exists and is fresh
- Read it — skip compilation
- A cache is "fresh" if no stories in this epic have been completed since the cache was written
- Check: compare cache file mtime with the latest story completion timestamp in state.yaml

### If cache is missing or stale
Launch an Agent to compile the epic context:
- `subagent_type: "Explore"`
- `run_in_background: false` (need the result before proceeding)

The agent reads and compiles into a single `epic-{N}-context.md`:
1. **PRD excerpts** — FRs mapped to this epic (from `{{OUTPUT_DIR}}/prd.md`)
2. **Architecture decisions** — relevant patterns and conventions (from `{{OUTPUT_DIR}}/architecture.md` if exists)
3. **UX references** — screens and components for this epic (from `{{OUTPUT_DIR}}/ux/` if exists)
4. **Project context** — existing-system constraints and conventions (from `{{OUTPUT_DIR}}/project-context.md` if exists — brownfield only)
5. **Lessons** — entries from `{{OUTPUT_DIR}}/lessons.md` with `Scope: aped-dev` or `Scope: all` (rules to enforce during implementation; missing on the first epic of a project)
6. **Completed stories** — implementation details and decisions from already-done stories in this epic (from `{{OUTPUT_DIR}}/stories/`)
7. **Key code patterns** — scan the codebase for established patterns relevant to this epic

Write the compiled context to `{{OUTPUT_DIR}}/epic-{N}-context.md`.

This compilation runs **once per epic** and is reused across all stories in the epic.

## Story Context Gathering

With epic context loaded, launch **2 Agent tool calls in parallel** for story-specific context:

### Agent 1: Code Context
- `subagent_type: "Explore"`
- Read story Dev Notes for architecture, file paths, dependencies
- Read existing code files mentioned in story
- Map the current state of files to modify

### Agent 2: Library Docs (if dependencies listed)
- `subagent_type: "general-purpose"`
- Use MCP context7 (`resolve-library-id` then `query-docs`) for libraries in Dev Notes
- Extract relevant API patterns and usage examples

## Story Classification

Analyze the story's File List to determine the implementation mode.

Detect:
- **backend files** — server code (apps/api, services/, packages/*/src, .py/.go/.rs/.java, business logic)
- **frontend files** — `.tsx/.jsx/.vue/.svelte`, apps/web, src/pages, src/components
- **devops files** — .github/workflows, Dockerfile, terraform, k8s, cdk

### Single-layer mode (default)
If the story touches ONE layer only: you (main Claude) implement directly. No team spawning. Continue to **Frontend Detection** and **TDD Implementation** below.

### Fullstack team mode
If the story touches 2+ layers (backend + frontend is the typical case): spawn a **dev team** to align on the contract and implement in parallel. This prevents the classic "frontend and backend diverge, mismatch at integration" trap.

Fullstack mode:
```
TeamCreate(name: "dev-{story-key}")
```

Spawn 3 team members (in parallel, same message):

**api-designer** — **Kenji**, API Architect, contract-first — "The contract is law."
- `subagent_type: "general-purpose"`
- Goes FIRST (others wait for the contract)
- Reads the story, relevant FRs from PRD, architecture.md for conventions
- Writes the contract: types, endpoints/procedures, validation schemas, error codes
- Commits to the shared `packages/contract` (or equivalent)
- Posts contract summary in team: "Contract ready at {path}"

**backend-dev** — **Amelia**, Senior Backend Engineer — "Tests first, always."
- `subagent_type: "general-purpose"`
- Waits for Kenji's contract, then starts TDD on backend
- Implements endpoints/handlers against the contract
- If the contract needs adjustment: SendMessage(kenji) to negotiate; kenji updates contract; Amelia rebases
- Follows the full TDD cycle (RED → GREEN → REFACTOR → GATE)

**frontend-dev** — **Leo**, Senior Frontend Engineer — "The user never waits in silence."
- `subagent_type: "general-purpose"`
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
- Lead calls `TeamDelete(name: "dev-{story-key}")` to release the team threads early (they would otherwise linger until session end)

## Frontend Detection & Visual Dev Loop

(Applies to both single-layer frontend mode and Leo in fullstack mode.)

Detect if this is a frontend story:
- Check if the story's File List contains `.tsx`, `.jsx`, `.vue`, `.svelte` files
- Check if `{{OUTPUT_DIR}}/ux/` exists

**If frontend story:**
1. Ensure the dev server is running (`npm run dev` or equivalent)
2. Before writing any component, use `mcp__react-grab-mcp__get_element_context` to inspect the **root layout** — understand the existing component tree, props, and styles as baseline
3. After each GREEN pass on a UI task, use React Grab to inspect the implemented component:
   - Verify it renders correctly in the component tree
   - Compare with UX spec (`{{OUTPUT_DIR}}/ux/design-spec.md`) — correct tokens, spacing, typography?
   - Check the component is properly nested in the layout hierarchy
4. If visual issues are found: fix before moving to REFACTOR

This is systematic — every frontend task gets a visual check at GREEN, not just at review time.

**If React Grab MCP is unavailable** (connection error, not configured): log a WARNING to the user, proceed without the visual check, and mention in the Dev Agent Record that visual verification was deferred to review. Never block dev on MCP availability — `aped-review` (Aria) will catch missed visual issues.

## TDD Implementation

Read `{{APED_DIR}}aped-dev/references/tdd-engine.md` for detailed rules.

For each task (update TaskUpdate to `in_progress` when starting):

### RED
Write failing tests first. Run: `bash {{APED_DIR}}aped-dev/scripts/run-tests.sh`

### GREEN
Write minimal code to pass. Run: `bash {{APED_DIR}}aped-dev/scripts/run-tests.sh`
**Frontend tasks:** after tests pass, use React Grab to verify the component renders correctly in the layout.

### REFACTOR
Improve structure while green. Run tests again.

### GATE
Mark `[x]` ONLY when: tests exist, pass 100%, implementation matches, ACs satisfied, no regressions.
**Frontend tasks:** add a 6th condition — React Grab visual check confirms component matches UX spec.

## HALT Conditions

**STOP and ask user if:** new dependency, 3 consecutive failures, missing config, ambiguity.

**3-failed-fixes rule:** if a task's test has gone red 3 times in a row — **three attempts that did not turn the original failing repro green** — **do not try fix #4**. Invoke `aped-debug`. A "different test broke" counts as not turning the original repro green. The fourth attempt to patch a misunderstood cause costs more than the fifteen minutes of stepping back. `aped-debug` Phase 1 inherits the failing test as the repro and immediately HALTs to question the architecture/spec/test rather than the fix. See `aped-debug.md` § 3-failed-fixes rule.

### Parallel-sprint mode — post a `dev-blocked` check-in

In a worktree session (parallel sprint), the user is in `aped-lead` in main, not watching this terminal. A silent HALT is invisible to them. Before stopping, post a check-in so aped-status surfaces it and aped-lead can escalate:

```bash
bash ${project_root}/{{APED_DIR}}/scripts/checkin.sh post {story-key} dev-blocked "<one-line reason — e.g. 'new dep needed: foo@^2.0'>"
```

Then HALT and tell the user in this worktree: "Posted dev-blocked check-in — Lead will see it on next aped-lead or aped-status. Waiting for instruction."

In classic (non-parallel) mode, just HALT inline — the user is here.

## Git & Ticket Workflow

Read `{{APED_DIR}}aped-dev/references/ticket-git-workflow.md` for full integration guide.

Read `ticket_system` and `git_provider` from `{{APED_DIR}}/config.yaml`.

### Before Implementation
If `ticket_system` is not `none`:
1. Read ticket ID from `sprint.stories.{key}.ticket` in state.yaml
2. **Fetch ticket** — get latest state (title, body, comments, labels). The ticket may have been updated by the team since aped-story ran.
3. Compare ticket body with story file — if there are divergences (new ACs, clarifications in comments), **HALT and ask the user** which version is correct
4. Move ticket status to **In Progress**:
   - `github-issues`: `gh issue edit {id} --remove-label "status/ready" --add-label "status/in-progress"` (or use project board if configured)
   - `gitlab-issues`: similar with `glab`
   - `linear`: linear CLI `issue state update`
   - `jira`: curl transitions API
5. Create feature branch using ticket-provider suggested name
6. Add a comment on the ticket with implementation plan (tasks list, approach)

If `ticket_system` is `none`:
1. Create branch: `feature/{story-key}`

### During Implementation
- Include ticket ID in EVERY commit: `type({ticket-id}): description`
- Use magic words for auto-linking (see reference doc)
- NEVER use `git add .` — stage specific files only

### After Implementation
1. Push branch and create PR/MR (adapt to `git_provider`):
   - `github`: `gh pr create --title "feat({ticket-id}): Story X.Y" --body "Fixes {ticket-id}"`
   - `gitlab`: `glab mr create --title "feat({ticket-id}): Story X.Y" --description "Closes {ticket-id}"`
2. Move ticket to **In Review**
3. Post a completion comment on the ticket with:
   - Summary of what was implemented
   - List of files changed
   - PR/MR link
   - Any deviations from original plan (and why)
4. Link the PR to the ticket (auto via magic words in commits, or explicit PR body reference)

## Verification gate (run before Completion)

The Iron Law for `aped-dev` is *NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST*; the Iron Law for marking the story `review` is *no completion claim without fresh evidence in this message*. This gate operationalises that. Walk it before the steps under `## Completion`.

**Forbidden phrases** — these words alone are not evidence. If you wrote them in this message and the message contains no captured tool output below, you have NOT verified anything.

`should work` · `looks good` · `probably fine` · `tests should pass` · `should be ok` · `Done!` · `Great!` · `Perfect!` · `All set`

**Accepted evidence forms** — at least one must appear in this message before you mark the story `review`:

1. **Captured command output** — copy of the test runner's output ending with the pass line (`PASS`, `OK`, `✓`, `N tests passed`, exit code `0`).
2. **Diff with test output** — short diff of the change paired with the test output that exercises the change.
3. **Screenshot reference** — for frontend visual changes, an explicit reference to a React Grab visual check or screenshot path captured this session.

If none of the three is present, **HALT** and re-run the verification, capturing the output here. Do not mark the story `review` on confidence.

## Completion

1. Update story: mark tasks `[x]`, fill Dev Agent Record
2. Update `{{OUTPUT_DIR}}/state.yaml`: story — `review`
3. Sync any new decisions/notes from the Dev Agent Record to the ticket (as a comment, never overwrite body)

## Checkin — parallel-sprint mode

If this session is a Story Leader (i.e. `{{APED_DIR}}/WORKTREE` exists OR this worktree's path appears in sprint.stories.{key}.worktree), post a `dev-done` check-in and HALT awaiting Lead approval:

```bash
bash ${project_root}/{{APED_DIR}}/scripts/checkin.sh post {story-key} dev-done
```

Then tell the user in the worktree session:

> "dev-done check-in posted. Waiting for the Lead Dev to approve in the main project (`aped-lead`). This session will receive `aped-review {story-key}` automatically via tmux send-keys once approved (or the user can run it manually)."

**STOP. Do not continue to aped-review yourself.**

## Next Step — classic mode only

If this is NOT a parallel-sprint worktree session, tell the user: "Story implementation complete. Run `aped-review` to review, or `aped-dev` to start the next story."

**Do NOT auto-chain.** The user (or the Lead in parallel mode) decides when to proceed.

## Example

Story "1-2-user-registration":
1. RED: write test `expect(register({email, password})).resolves.toHaveProperty('id')` → fails
2. GREEN: implement `register()` → test passes
3. REFACTOR: extract validation → tests still pass
4. GATE: tests exist ✓, pass ✓, matches spec ✓, ACs met ✓, no regressions ✓ → mark `[x]`

## What NOT to Do

- **Don't implement without reading existing code first.** If the story says "add validation to UserService", read UserService top to bottom before touching it. Building on assumptions about code you haven't read produces conflicts and regressions.
- **Don't write tests after the implementation.** Tests written after are confirmation bias — they test what you built, not what you should have built. RED comes first, always.
- **Don't batch multiple tasks into one commit.** Each task = one RED→GREEN→REFACTOR cycle = one commit. Batching makes it impossible to bisect regressions and defeats the purpose of incremental progress.
- **Don't add dependencies silently.** Every new package is a HALT condition. The user decides, not you. Even "obvious" ones like a validation library.
- **Don't fight the test framework.** If tests are hard to write, your code is hard to test. Refactor the code, don't add complexity to the tests.
- **Don't `git add .`** — ever. Stage specific files. Accidental commits of `.env`, lockfile diffs, or debug files waste everyone's time.
- **Don't skip the GATE.** "Tests pass, good enough" is not a gate. All 5 conditions: tests exist, pass 100%, implementation matches spec, ACs satisfied, no regressions.
- **Don't brute-force failures.** 3 consecutive failures = wrong approach, not insufficient effort. HALT.

## Common Issues

- **Test framework not detected**: Ensure package.json has vitest/jest dependency, or use `run-tests.sh` manually
- **3 consecutive failures**: HALT — ask user. Do not brute-force; the approach may be wrong
- **Missing dependency**: HALT — ask user before installing. Do not add deps silently
- **Tests pass before writing code**: The test is wrong — it doesn't test new behavior. Rewrite it
