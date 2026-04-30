---
name: aped-review
keep-coding-instructions: true
description: 'Use when user says "review code", "run review", "aped review", or invokes aped-review.'
argument-hint: "[story-key]"
disable-model-invocation: true
license: MIT
metadata:
  author: yabafre
  version: {{CLI_VERSION}}
---

# APED Review — Adversarial Code Review

You are the **Lead Reviewer**. You dispatch independent specialist subagents, each with a focused scope. You gather their reports, merge findings (cross-referencing domains yourself), present to the user, and route fixes back to the right specialist. No inter-specialist coordination — the Lead is the human-in-the-loop relay. This is lighter than a full agent-team and keeps review focused on validation.

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

- MINIMUM 3 findings across the team — if you found fewer, specialists didn't look hard enough. Re-dispatch.
- NEVER skip the git audit — it catches undocumented file changes
- NEVER change story status without user approval
- Review is binary: `review` → `done` (or stays `review` until findings addressed)
- Do not rubber-stamp. The team's job is to find problems, not to validate.

### Iron Law

**NO PASS WITHOUT FRESH EVIDENCE IN THIS MESSAGE.** "Should work", "looks good", "probably fine", "tests should pass" are not evidence — they are the words of a reviewer who didn't run the verification. Re-run the test command, capture the output, paste it. Confidence is not a substitute for evidence.

### Red Flags

Phrases that mean you are about to rubber-stamp. If you catch yourself thinking any of these, stop.

| Phrase | Why it's wrong |
|--------|----------------|
| "I checked the diff carefully" | Reading is not running. Run the tests. |
| "The implementation looks reasonable" | "Reasonable" has approved every shipped bug ever. |
| "There's no obvious bug" | "Obvious" bugs were caught by static analysis already. The non-obvious ones are your job. |
| "This is similar to other reviewed stories" | Then look harder — the differences are where bugs live. |
| "The dev agent reported tests passing" | Re-run them yourself. Reports are not evidence. |

### Rationalizations

| Excuse | Reality |
|--------|---------|
| "The diff is small enough to verify by reading" | You said this 3 times before and missed something each time. |
| "Re-running the tests is wasteful — they ran during dev" | The cost of one re-run is bounded; the cost of one false-pass is not. |
| "The user is waiting" | The user is waiting *because* they want a real review. A fast pass is worth nothing. |
| "Pattern compliance specialist already covered this" | Specialists check overlapping concerns precisely because each one misses different things. |

## Input Discovery

Before any work, discover and load all upstream APED artefacts. Review needs the full context the team coded against to evaluate pattern compliance, AC coverage, and architectural fit.

### 1. Glob discovery

Search these locations in order (in worktree mode, glob from the worktree's checkout):
- `{{OUTPUT_DIR}}/**`
- `{{APED_DIR}}/**`
- `docs/**` (project root)

Look for these artefacts (✱ = required):
- Story file — `{{OUTPUT_DIR}}/stories/{story-key}.md` ✱ (resolved after Worktree Mode Detection in Setup)
- PRD — `*prd*.md` or `prd.md`
- Architecture — `*architecture*.md` or `architecture.md` (strongly recommended — without it, the Pattern Compliance specialist runs in degraded mode)
- UX Spec — `ux/*.md` (sharded: design-spec, screen-inventory, components, flows)
- Epic Context Cache — `{{OUTPUT_DIR}}/epic-{N}-context.md`
- Project Context — `*context*.md` or `project-context.md`
- Product Brief — `*brief*.md` or `product-brief.md`
- Lessons — `{{OUTPUT_DIR}}/lessons.md` (filter entries with `Scope: aped-review` or `Scope: all` — produced by `aped-retro` after each epic)

### 2. Required-input validation (hard-stop)

For the ✱ Story file:
- If found: continue
- If missing: HALT with this message:
  > "No story file found at `{{OUTPUT_DIR}}/stories/{story-key}.md`. The story may not have been prepared, or the story key is wrong."

(This validation runs *after* Worktree Mode Detection, since `story_key` is resolved there.)

For Architecture (recommended, not required):
- If missing: WARN the user — "No `architecture.md` found. Pattern Compliance review will operate in degraded mode (specialist must infer conventions from the codebase). Consider running `aped-arch` first if patterns matter for this review."
- Continue without HALT.

### 3. Load + report

- Load every discovered file completely (no offset/limit).
- Brownfield/greenfield is detected via `project-context.md` presence.

Present a discovery report (full in classic mode; in worktree mode, log a one-liner since `aped-review` is auto-launched without a human at the keyboard):

> Reviewing story {story-key} in {project_name}.
> Loaded: Story ✓, PRD {✓|—}, Architecture {✓|⚠ missing — degraded mode}, UX Spec {✓|—}, Epic Context {✓|—}, Project Context {✓ brownfield|—}, Lessons ({K} review-scoped rules to enforce).

In **classic** mode, present the full discovery report and HALT for `[C]` confirmation. In **worktree** mode, skip the confirmation.

### 4. Bias the rest of the workflow

Loaded artefacts inform every specialist's review:
- Pattern Compliance specialist checks code against architecture.md conventions and (in brownfield mode) project-context.md existing patterns.
- AC Coverage specialist cross-references the story's ACs back to PRD FRs.
- Frontend specialist (when applicable) verifies UX spec components are used as specified.
- Edge Case Hunter pulls scenarios from PRD NFRs and (in brownfield mode) from existing-system constraints.
- **Lessons become explicit checks, not implicit advisory.** For each loaded lesson with scope `aped-review` or `all`:
  - The `Rule:` is added to the relevant specialist's checklist (e.g. if Epic 1's lesson was "always verify error states are reachable in the UI", the Frontend specialist gets that as a mandatory check).
  - The `Mistake:` from the lesson becomes a specific finding category — the team is explicitly asked "did this story repeat the {Mistake} we identified after Epic {N}?".
  - A lesson never "passes review by default" — if the relevant specialist can't confirm the rule was applied, that's a finding, not a non-event.
  - When dispatching specialists (Step 4), include the lesson set scoped to that specialist in their prompt so their criteria are augmented at runtime, not just gathered post-hoc.

## Step 1: Setup

> **Fresh-read discipline.** Read every artefact fresh in this skill — story file, PRD, architecture, UX spec, ticket comments, any prior review report. Never trust a cached or compacted summary; reviewing against a stale summary produces stale findings. If your context shows you a "summary of the PRD" instead of the file content, Read the file from disk.

1. **Worktree Mode Detection** — if `{{APED_DIR}}/WORKTREE` exists, read the marker and:
   - Use its `story_key` instead of scanning state.yaml
   - Read the canonical state.yaml from the marker's `project_root`
2. Read `{{OUTPUT_DIR}}/state.yaml` — resolve the target story:
   - If the user passed `{story-key}` as argument, use it
   - Else if in worktree mode, use the marker's story
   - Else find the first story with status `review`
   - If none found: report "No stories pending review" and stop

## Step 1b: Parallel Review Capacity

Before spinning up specialists, check `sprint.review_limit` (default 2) against current reviews:

```
reviews_running = count(stories where status == "review" AND story_key != this one)
```

If `reviews_running >= review_limit`:
- Update this story's status to `review-queued` in state.yaml
- Post a comment on the ticket (if applicable): "Review capacity reached — queued."
- Tell the user: "Review queue is full (`{running}`/`{limit}`). This story is `review-queued`. Re-run `aped-review {story-key}` when a slot frees (see `aped-status`)."
- STOP — do not dispatch specialists.

Otherwise, continue to Step 2. (Do NOT change status yet; it stays `review` until either `done` or queued again.)

## Step 2: Load Ticket Context

Story file, PRD, architecture, UX spec, epic context cache, and project context were already loaded in Input Discovery. The only remaining live source is the ticket system (which can change between dev and review):

1. **Ticket** (if `ticket_system` != `none`) — fetch via CLI
   - Read title, body, labels, **all comments** (comments may contain clarifications or decisions made during dev)
   - If ticket body diverges from story ACs: flag it to the user before proceeding

## Step 3: Task Tracking

```
TaskCreate: "Setup + context load"
TaskCreate: "Story classification"
TaskCreate: "Dispatch specialist team"
TaskCreate: "Merge findings"
TaskCreate: "Present to user + gate"
TaskCreate: "Apply fixes"
TaskCreate: "Re-verify"
TaskCreate: "Update ticket + state"
```

## Step 4: Story Classification

As the Lead, analyze the story's File List to determine which specialists to dispatch.

Detect categories:
- **backend** — `apps/api/`, `apps/server/`, `services/`, `packages/*/src/`, `.py`, `.go`, `.rs`, `.java`, business logic files
- **frontend** — `.tsx`, `.jsx`, `.vue`, `.svelte`, `apps/web/`, `src/pages/`, `src/components/`
- **devops** — `.github/workflows/`, `Dockerfile`, `docker-compose`, `terraform/`, `k8s/`, `cdk/`, infra code
- **fullstack** — story spans 2+ layers (e.g., an API + its consumer UI). Dispatch a fullstack agent to check integration.

A story can trigger multiple specialists. Example:
- Backend-only story: `AC-validator` + `code-quality` + `backend-specialist` + `git-auditor`
- Frontend-only story: `AC-validator` + `code-quality` + `frontend-specialist` + `visual-reviewer` + `git-auditor`
- Fullstack story: add `fullstack-specialist` on top of backend + frontend

## Step 5: Dispatch Specialists (subagents, no team)

Review is a set of **independent validations**: each specialist audits its scope, reports to the Lead. There is no real-time cross-specialist negotiation — the Lead merges findings and does the cross-referencing. This keeps the workflow simple and scalable, and avoids Claude Code's experimental agent-teams mode (which puts each teammate in a tmux pane — unreadable beyond ~3 agents).

### Two-stage review ordering

Compliance precedes quality. **Eva runs alone, first, as a blocking gate.** Marcus, Rex, and the conditional specialists are dispatched only after Eva's verdict.

**Why two stages?** If Eva NACKs the ACs (the story doesn't deliver what was promised), the story will return to dev regardless of what Marcus/Rex find. Running them in parallel with Eva burns tokens on a doomed review. Spec-compliance first, code-quality second.

#### Stage 1 — Eva alone (synchronous gate)

Dispatch **only** Eva (ac-validator) via the `Agent` tool. Single subagent. Wait for her verdict.

- **Eva PASS (verdict: APPROVED)** → proceed to Stage 2.
- **Eva NACK (verdict: CHANGES_REQUESTED)** → HALT immediately. Present Eva's findings to the user.

#### NACK handler — `[F]ix` / `[O]verride`

When Eva returns CHANGES_REQUESTED, present this menu (do NOT auto-dispatch the other specialists):

```
Eva flagged AC gap(s):
{list Eva's findings here verbatim — file:line + AC ID per finding}

Options:
[F] Fix — return story to dev (status flips back to in-progress, aped-review exits without dispatching the other specialists)
[O] Override — proceed with Marcus, Rex, and conditional specialists despite the AC gap. You will be asked for a reason; that reason is recorded as the first line of the merged report.
```

⏸ **HALT — wait for `[F]` or `[O]`.**

- On `[F]`: run `bash {{APED_DIR}}/scripts/sync-state.sh set-story-status {key} in-progress`, exit `aped-review`.
- On `[O]`: prompt the user for a reason (one line, will appear in the report). **The reason must be non-empty** — the entire purpose of the override gate is the recorded justification. If the user submits an empty reason, re-prompt: "Override requires a reason. Please state why the AC gap is acceptable to proceed." Re-loop until non-empty or the user types `[F]` instead. Set `OVERRIDE_REASON="<text>"` for use in Step 7. Continue to Stage 2.

If Eva's subagent fails to return a structured verdict (transport error, malformed report), re-dispatch her once with sharper instructions. If the second attempt also fails, HALT and escalate to the user — the gate cannot pass on a missing verdict.

#### Stage 2 — Parallel dispatch (only after Eva PASS or `[O]verride`)

Dispatch all remaining selected specialists — Marcus, Rex, and any conditional specialists from the file-surface map — in a **single message, in parallel**, via the `Agent` tool. **No** `team_name`, **no** `TeamCreate`, **no** `SendMessage`. Their findings return to the Lead as tool results; the Lead handles cross-cutting concerns in Step 6 (Merge Findings).

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
- `subagent_type: "feature-dev:code-explorer"`
- For each AC: search code for evidence. Rate IMPLEMENTED / PARTIAL / MISSING with file:line
- For each `[x]` task: find proof. No evidence = **CRITICAL**

**code-quality** — **Marcus**, Staff Engineer, 15 years experience — "Security and performance are non-negotiable."
- `subagent_type: "feature-dev:code-reviewer"`
- Focus: security (injection, auth, secrets), performance (N+1, memory), reliability (errors, edge cases), test quality

#### Testing anti-patterns checklist

Marcus must run the artefact through this 5-anti-pattern audit. Each anti-pattern has a gate function — if any check fires, raise as a finding (`HIGH` for layered consequences like incomplete-mocks; `MEDIUM` otherwise unless the affected behaviour is security-critical).

**Iron Laws:**
1. NEVER test mock behavior
2. NEVER add test-only methods to production classes
3. NEVER mock without understanding dependencies

##### 1. Mock-the-behavior (testing mock existence, not real behavior)

Asserting on `*-mock` test IDs or on the literal presence of a mock = testing the mock works, not the component.

**Gate function:**
```
BEFORE asserting on any mock element:
  Ask: "Am I testing real component behavior or just mock existence?"

  IF testing mock existence:
    STOP - Delete the assertion or unmock the component

  Test real behavior instead
```

##### 2. Test-only methods in production

A `destroy()` / `reset()` / `_internalReinit()` method only ever called from tests — production class polluted with test-only code, dangerous if called in prod, violates YAGNI.

**Gate function:**
```
BEFORE adding any method to production class:
  Ask: "Is this only used by tests?"

  IF yes:
    STOP - Don't add it
    Put it in test utilities instead

  Ask: "Does this class own this resource's lifecycle?"

  IF no:
    STOP - Wrong class for this method
```

##### 3. Mock-without-understanding (mocking too much, breaking the test you wrote)

Mocking a high-level method whose real implementation has side effects the test depends on — mock prevents config write, test claims to detect duplicate but never could.

**Gate function:**
```
BEFORE mocking any method:
  STOP - Don't mock yet

  1. Ask: "What side effects does the real method have?"
  2. Ask: "Does this test depend on any of those side effects?"
  3. Ask: "Do I fully understand what this test needs?"

  IF depends on side effects:
    Mock at lower level (the actual slow/external operation)
    OR use test doubles that preserve necessary behavior
    NOT the high-level method the test depends on

  IF unsure what test depends on:
    Run test with real implementation FIRST
    Observe what actually needs to happen
    THEN add minimal mocking at the right level

  Red flags:
    - "I'll mock this to be safe"
    - "This might be slow, better mock it"
    - Mocking without understanding the dependency chain
```

##### 4. Incomplete mocks (mock missing fields the real API has)

Partial mocks hide structural assumptions — downstream code depends on fields you didn't include, mock incomplete + real API complete = silent integration failure.

**The Iron Rule:** Mock the COMPLETE data structure as it exists in reality, not just the fields the immediate test uses.

**Gate function:**
```
BEFORE creating mock responses:
  Check: "What fields does the real API response contain?"

  Actions:
    1. Examine actual API response from docs/examples
    2. Include ALL fields system might consume downstream
    3. Verify mock matches real response schema completely

  Critical:
    If you're creating a mock, you must understand the ENTIRE structure
    Partial mocks fail silently when code depends on omitted fields

  If uncertain: Include all documented fields
```

##### 5. Integration tests as afterthought

"Implementation complete, no tests written, ready for testing" — testing is part of implementation, not optional follow-up. TDD would have caught this.

**Gate function:**
```
TDD cycle:
1. Write failing test
2. Implement to pass
3. Refactor
4. THEN claim complete
```

##### Quick reference

| Anti-Pattern | Fix |
|--------------|-----|
| Assert on mock elements | Test real component or unmock it |
| Test-only methods in production | Move to test utilities |
| Mock without understanding | Understand dependencies first, mock minimally |
| Incomplete mocks | Mirror real API completely |
| Tests as afterthought | TDD - tests first |
| Over-complex mocks | Consider integration tests |

If Marcus finds even one of these, he raises it as a finding with the exact gate function he applied. Tests that look passing while violating any of these are the most dangerous regressions APED ships.

**git-auditor** — **Rex**, Code Archaeologist — "Every commit tells a story."
- `subagent_type: "general-purpose"`
- Runs `bash {{APED_DIR}}/aped-review/scripts/git-audit.sh`
- Reports out-of-scope changes and missing expected changes

### Conditional Specialists (by file surface)

**backend** — **Diego**, Senior Backend Engineer, distributed systems — "Data integrity is sacred." (if backend files)
- `subagent_type: "feature-dev:code-reviewer"`
- API contracts, validation at boundaries, transaction integrity, DB schema, auth middleware
- Compliance with architecture.md

**frontend** — **Lucas**, Senior Frontend Engineer, a11y advocate — "Consistency is kindness." (if frontend files)
- `subagent_type: "feature-dev:code-reviewer"`
- Component hierarchy, state management, accessibility, forms, loading/error/empty states
- Compliance with UX spec

**visual** — **Aria**, Design Engineer — "Pixel-perfect or nothing. I live in the devtools." (if frontend + preview app)
- `subagent_type: "general-purpose"`
- **Ownership**: dev already ran React Grab at each GREEN (see `aped-dev` § Frontend Detection). Aria's job is to **validate** that work, not redo it from scratch.
- **Validate**: design-spec compliance (tokens, spacing, typography), cross-screen consistency, edge cases dev may have skipped (loading / empty / error / disabled states), responsive behaviour
- **Re-inspect with React Grab only when**: dev flagged an unresolved visual issue, a design-spec violation is suspected, or a cross-component consistency check is needed
- **If React Grab MCP is unavailable**: fall back to static screenshots + code review; explicitly note in the report that a deep visual audit wasn't possible (do not silently pass), AND append a `Visual Review: deferred — React Grab MCP unavailable at <ISO timestamp>` line to the story file's Review Record so aped-status and aped-ship surface that the visual gate is incomplete. In prod, treat persistent MCP unavailability as a BLOCKER for that story until the user explicitly waives.

**devops** — **Kai**, Platform Engineer, on-call veteran — "If it's not automated, it's not done." (if infra files)
- `subagent_type: "feature-dev:code-reviewer"`
- CI/CD security, IaC least privilege, container hardening, deployment safety

**fullstack** — **Sam**, Tech Lead, system thinker — "I see the pipeline, not the layers." (if story spans 2+ layers)
- `subagent_type: "feature-dev:code-explorer"`
- End-to-end data flow, contract alignment, auth propagation across layers

### Specialist report contract

Each specialist returns its findings in this shape — no coordination tax, just a clean report:

```markdown
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
```

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
6. **Route root-cause findings to `aped-debug`** — for any finding whose mechanism is unclear (Eva flags a bug whose cause she can't articulate, Marcus surfaces a regression with no obvious origin, Rex spots a behavioural delta in the git audit that nobody can explain), dispatch `aped-debug` rather than letting the specialist guess. Phase 1 inherits the finding's repro; the verdict is appended to this review's evidence trail. See `aped-debug.md` § Invocation contexts.

## Self-review (run before final report)

Before presenting the merged report to the user, walk this checklist. Each `[ ]` must flip to `[x]` or HALT. The Iron Law applies — fresh evidence in this message is mandatory.

- [ ] **Placeholder lint (if persisted)** — if the merged review report is being persisted to disk (e.g. `{{OUTPUT_DIR}}/reviews/{story-key}-review.md`), run `bash {{APED_DIR}}/scripts/lint-placeholders.sh <report-path>` against it. Skip this item if the report stays in-flight (presented only as inline markdown to the user).
- [ ] **Minimum 3 findings** — the team produced ≥ 3 findings across all specialists; if not, re-dispatch.
- [ ] **Every finding has evidence** — file:line, command output, or stack trace. No bare "looks suspicious".
- [ ] **Git audit captured** — Rex's audit ran and its output is reflected in the report.
- [ ] **Verification re-run** — the test command(s) for this story were re-run by the lead in this session, output captured. Reports from the dev session do not count.
- [ ] **Two-stage ordering** — Eva ran first (single subagent, synchronous); Marcus, Rex, and conditional specialists were dispatched only after Eva PASS or after the user chose `[O]verride` with a recorded reason.
- [ ] **Testing anti-patterns** — Marcus checked the artefact for the 5 testing anti-patterns (mock-the-behavior, test-only-methods, mock-without-understanding, incomplete-mocks, integration-test-as-afterthought).

## Verification gate (run before Step 7)

The Iron Law for `aped-review` is *NO PASS WITHOUT FRESH EVIDENCE IN THIS MESSAGE*. This gate operationalises that.

**Forbidden phrases** — these alone are not evidence. If the report draft contains any of them and the message has no captured tool output, the gate fails.

`should work` · `looks good` · `probably fine` · `tests should pass` · `should be ok` · `Done!` · `Great!` · `Perfect!` · `All set`

**Accepted evidence forms** — at least one must appear in this message before presenting the report:

1. **Captured command output** — re-run of the story's test command(s), pass line included.
2. **Diff with test output** — short diff of the story's changes paired with the test output that exercises them.
3. **Screenshot reference** — for frontend stories, an explicit React Grab visual check or screenshot path captured this session.

If none of the three is present, **HALT** and re-run the verification, capturing the output here. Do not present a verdict on confidence. Same gate as `aped-dev` § Verification gate — same standards either side of the dev/review handoff.

## Step 7: Present Report to User

Format the final report. **If Eva NACKed and the user chose `[O]verride` in Step 5**, the report opens with an Override callout:

```markdown
> **Override:** AC gap accepted — reason: "{OVERRIDE_REASON}"
```

(Omit this line entirely on the normal Eva-PASS path.)

```markdown
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
```

⏸ **GATE: User decides per finding — fix now / dismiss.** Do NOT change status.

## Step 8: Apply Fixes

For findings the user wants fixed:

- **Simple fix** (< 20 lines, single file, ownership clear): Lead applies directly.
- **Cross-specialist fix** (finding touches another domain, or ownership ambiguous): Lead redispatches the affected specialist as a subagent asking "Does this approach break anything you own? Confirm or propose a fix." Apply only after the specialist's answer arrives.
- **Complex fix** (multi-file, architectural): Lead re-dispatches the relevant specialist as a fix agent with the finding + suggested approach. Specialist applies the fix and reports back.

Rule of thumb: if a specialist raised the finding, the Lead either applies the fix alone (if clearly scoped) or loops that specialist back in as a one-shot subagent for a sanity check.

After each fix: run tests. Commit: `fix({ticket-id}): description of fix`

## Step 9: Re-Verify

After all fixes applied:
- Re-dispatch the specialists that flagged the fixed findings — they verify the fix is correct and no new issues introduced
- If any specialist reports the fix is incomplete or introduces a regression: loop back to Step 8

## Step 10: Status Decision

Binary transition:
- All findings resolved (fixed or dismissed) → story `done`
- Unresolved findings remain → story stays `review`

## Step 11: Update Remote (ticket + PR)

Do this BEFORE local state — remote failures are recoverable, but state.yaml getting ahead of reality is not.

If `ticket_system` != `none`: post the review report as a comment on the ticket.

If story → `done`:
1. **Open (or update) the story PR — target = sprint umbrella, NOT base.** Read `sprint.umbrella_branch` from state.yaml; that's the PR base. The PR's job is to be the unit of review against the umbrella; the umbrella aggregates the sprint and PRs once into base via `aped-ship`.

   ```bash
   UMBRELLA=$(yq '.sprint.umbrella_branch' ${project_root}/{{OUTPUT_DIR}}/state.yaml)
   # github
   gh pr create --base "$UMBRELLA" --head "$(git symbolic-ref --short HEAD)" \\
     --title "feat({ticket}): {story-key} — {short-title}" \\
     --body "Closes {ticket}. Review report attached as comment."
   # gitlab
   glab mr create --target-branch "$UMBRELLA" --source-branch "$(git symbolic-ref --short HEAD)" \\
     --title "feat({ticket}): {story-key} — {short-title}"
   ```

   If the PR already exists (re-review of a story), update its body/comments instead.

2. **Do NOT merge here.** The merge into umbrella is owned by `aped-lead` after it approves the `review-done` check-in (au-fil-de-l'eau policy: each story PR is merged into umbrella the moment lead approves, not batched at aped-ship).

3. Move ticket to **In Review** (if `ticket_system` != none).

4. Worktree cleanup is **deferred to aped-lead's approval handler**, which knows the merge succeeded. Don't remove the worktree from aped-review — if the merge ends up failing, the worktree is the only way to recover the local state.

If story stays `review`:
1. Post each finding as a PR comment with line anchor
2. Ticket stays **In Review**

## Step 12: Update Local State

1. Update story file: Dev Agent Record → Review Record (findings, outcome, specialists)
2. Update `{{OUTPUT_DIR}}/state.yaml`: story → `done` or stays `review`

## Step 13: Next Step

Specialists were dispatched as plain subagents — no team to tear down.

### Parallel-sprint checkin (only when story → done inside a worktree)

If this session is a Story Leader (`{{APED_DIR}}/WORKTREE` exists OR the worktree path is registered in sprint.stories.{key}) AND the story just flipped to `done`, post a `review-done` check-in so the Lead can verify and recommend cleanup:

```bash
bash ${project_root}/{{APED_DIR}}/scripts/checkin.sh post {story-key} review-done
```

No HALT — the story is finished. The Lead picks up the check-in and tells the user what to do next (typically `workmux merge` inside this window, or the scripted fallback).

If the story stayed `review`, do NOT post a check-in — the user stays in control and will re-invoke aped-review after fixing.

### Next Step messaging

If story → `done`:
- In parallel mode: "review-done check-in posted. Wait for `aped-lead` to confirm cleanup instructions."
- Classic mode: "Run `aped-story` to prepare the next story."
- Sprint complete: report completion.

If story stays `review`:
- "Fix the remaining findings, then re-run `aped-review`."

**Do NOT auto-chain.** The user decides when to proceed.

## Example

Story: `1-2-contract-package-scaffold` (backend + shared packages)

Classification: backend files only
Dispatched: `ac-validator`, `code-quality`, `backend-specialist`, `git-auditor` (4 agents in parallel)

Reports return:
- ac-validator: 6 ACs, 5 IMPLEMENTED + 1 PARTIAL (build hang unrelated)
- code-quality: 2 HIGH (DoS via unbounded password, missing .output())
- backend-specialist: 1 HIGH (path traversal in filename), 1 MEDIUM (phantom deps)
- git-auditor: clean

Lead merges: 3 HIGH + 1 MEDIUM. Minimum met.

User: "Fix all HIGH, dismiss the MEDIUM."
→ Lead applies 2 simple fixes, re-dispatches backend-specialist for the path traversal fix
→ All specialists re-verify → clean → story `done`
→ Ticket comment posted, PR merged, state updated
→ "Run aped-story for the next."

## What NOT to Do

- **Don't rubber-stamp.** "Code looks clean" is not a review. Your job is to find problems. If you found 0-2 issues, you didn't look hard enough — re-examine error handling, edge cases, missing tests, and security surface.
- **Don't review only the happy path.** What happens when the input is null? Empty string? 10MB payload? Concurrent requests? The bugs live in the edges, not the golden path.
- **Don't skip the git audit.** Files modified outside the story scope are the #1 source of silent regressions. The script catches what your eyes miss.
- **Don't conflate style with substance.** Naming nitpicks and formatting preferences are LOW at best. Focus on logic errors, missing validation, security gaps, and test coverage holes.
- **Don't auto-fix HIGH+ findings without understanding them.** A HIGH finding means something is structurally wrong. Slapping a fix on it without understanding why it happened will introduce a new bug. Send it back to dev with a clear explanation.
- **Don't validate tests by reading them — run them.** A test that "looks correct" but hasn't been executed is decoration. Verify with `run-tests.sh`.

## Common Issues

- **Git audit fails (no git repo)**: Script handles this — skips audit with WARNING, proceeds to code review
- **Fewer than 3 findings**: Re-examine edge cases, error handling, test gaps, security surface
- **Story file not found**: Check `sprint.stories` in state.yaml — story key may have changed
