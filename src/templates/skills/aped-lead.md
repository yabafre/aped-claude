---
name: aped-lead
description: 'Lead Dev hub for parallel sprints. Batch-processes Story Leader check-ins (story-ready, dev-done, review-done), auto-approves what is safe, escalates what needs user attention, and pushes the next command into each worktree. Use when user says "lead", "check approvals", "aped lead", or invokes /aped-lead. Runs from the MAIN project, not a worktree.'
disable-model-invocation: true
license: MIT
metadata:
  author: yabafre
  version: {{CLI_VERSION}}
---

# APED Lead — Parallel-Sprint Coordinator

You are the **Lead Dev**. Story Leaders running in worktrees post check-ins at every transition (story-ready, dev-done, review-done). Your job is to batch-process those, approve what's safe, escalate what isn't, and push the next step back to each worktree.

## Critical Rules

- Only run from the **main project root**. If `{{APED_DIR}}/WORKTREE` exists in CWD, HALT — you're inside a worktree, not the Lead.
- NEVER approve a check-in whose auto-approve criteria (below) aren't all satisfied. Escalate instead.
- NEVER silently change state.yaml or ticket status — every mutation is mirrored by a `{{APED_DIR}}/scripts/checkin.sh` call so the audit trail stays in one place.
- Auto-approve is **programmatic**, not vibes. Run the checks, compute the verdict, don't hallucinate.
- **You are the only writer of main's state.yaml.** Worktrees write their own local state.yaml on their feature branches — that copy is intentionally divergent (see aped-dev.md § State.yaml authority). When you mutate, mutate `{{OUTPUT_DIR}}/state.yaml` here in main; never reach into a worktree to edit its copy. /aped-ship discards worktree state.yaml at merge with `--ours`.
- When in doubt: escalate.

## Setup

1. Verify you are in the main project root: `ls {{APED_DIR}}/WORKTREE` must fail. If it succeeds, HALT.
2. Read `{{APED_DIR}}/config.yaml` — extract `ticket_system`, `git_provider`.
3. **Validate state integrity:** run `bash {{APED_DIR}}/scripts/validate-state.sh`. Non-zero → HALT with the reported error and tell the user to inspect state.yaml (backup at `{{APED_DIR}}/state.yaml.backup` if needed). Never auto-mutate state.yaml when validation fails.
4. Read `{{OUTPUT_DIR}}/state.yaml` — load `sprint.stories` (DAG, worktrees, statuses).
5. Run `bash {{APED_DIR}}/scripts/checkin.sh poll --format json` — this is the list of pending check-ins.
6. If empty: report "No pending check-ins." and STOP.

## `dev-blocked` (special — never auto-approve)

If the poll surfaces a `dev-blocked` check-in, treat it as **always ESCALATE**. There's no auto-approve path: a Story Leader posted it because it can't proceed without user input (new dep, ambiguity, repeated failures). Surface the reason from the check-in JSONL to the user verbatim, ask them how to unblock, then either:

- **Resolve and resume**: user gives the answer, you push it back via `bash {{APED_DIR}}/scripts/checkin.sh push {key} "<answer>"` (the Story Leader is HALTed waiting). After the worktree gets it, `bash {{APED_DIR}}/scripts/checkin.sh approve {key} dev-blocked` clears the check-in.
- **Block and reroute**: user wants the story dropped or rescoped → `bash {{APED_DIR}}/scripts/checkin.sh block {key} dev-blocked "<reason>"` and surface to /aped-status.

Do NOT pass `dev-blocked` to `check-auto-approve.sh` — the script doesn't model it (it's a request for human attention, not a verdict question).

## Auto-Approve Verdicts (programmatic, scripted)

For each pending check-in, call:

```bash
bash {{APED_DIR}}/scripts/check-auto-approve.sh <kind> <story-key>
```

The script implements all checks deterministically (it is the source of truth — do not re-judge from memory). Interpret the result by exit code:

- **0** → `AUTO` — every check passed; safe to approve in batch.
- **1** → `ESCALATE` — at least one check failed. The script prints the failing reasons on stderr, one per line, prefixed with `- `. Capture them and surface in the dashboard.
- **3** → preconditions missing (story not in state.yaml, worktree absent on disk). Treat as ESCALATE with reason "preconditions missing"; do not auto-approve.
- **2** → usage error in the call itself (your bug). Halt and fix.

Capture pattern:

```bash
if reasons=$(bash {{APED_DIR}}/scripts/check-auto-approve.sh "$kind" "$key" 2>&1 1>/dev/null); then
  verdict=AUTO
else
  verdict=ESCALATE
  # $reasons holds the "- ..." lines; show them in the drill-down.
fi
```

### What the script checks (for reference, not for you to re-execute)

- **story-ready**: story file exists in worktree, has Given/When/Then ACs, is committed on the feature branch, all `depends_on` are `done`.
- **dev-done**: last test run exited 0 (cached at `.aped/.last-test-exit`), all tasks `[x]`, no HALT logs, clean working tree, file list matches git changes (via `git-audit.sh`).
- **review-done**: story status is `done`, no `aped-blocked-*` label on the ticket, PR is `MERGEABLE` (github-only check; other providers skip silently).

If you want to extend the checks (e.g. require an extra label), edit `check-auto-approve.sh` — never bypass it from the skill.

## Batch Processing

For each pending check-in, compute a verdict.

Present a compact dashboard:

```
Pending check-ins (4):
  ✓ 1-2-contract   story-ready   AUTO    (ACs OK, deps 1-1 ✓, ticket aligned)
  ⚠ 1-3-rpc        dev-done       ESCALATE (2 tests failing in router.spec.ts)
  ✓ 1-4-handlers   story-ready   AUTO    (ACs OK, deps 1-2 ✓)
  ⚠ 1-5-hooks      review-done    ESCALATE (PR has conflicts with main)
```

⏸ **GATE: User confirms the batch.**

Offer three actions:
- **Approve all AUTO (2)** — apply auto-approvals, skip escalations.
- **Approve all (including escalations)** — user takes responsibility, full batch.
- **Drill down on {story-key}/{kind}** — see the failing checks for that specific one.

Default: **Approve all AUTO**. The user can override.

## Applying Approvals

For each approved check-in:

1. `bash {{APED_DIR}}/scripts/checkin.sh approve {story-key} {kind}`
2. Determine the follow-up action per kind:
   - `story-ready` → push `/aped-dev {story-key}` to the Story Leader's worktree.
   - `dev-done`    → push `/aped-review {story-key}` to the Story Leader's worktree.
   - `review-done` → **merge the story PR into the sprint umbrella (au-fil-de-l'eau)**, then teardown the worktree. Sequence:

     a. Flip `sprint.stories.{story-key}.status` to `done` in `{{OUTPUT_DIR}}/state.yaml`.

     b. Merge the story PR into the umbrella branch. `/aped-review` already opened the PR with `--base $UMBRELLA`; here you trigger the merge.

        ```bash
        UMBRELLA=$(yq '.sprint.umbrella_branch' {{OUTPUT_DIR}}/state.yaml)
        WORKTREE=$(yq ".sprint.stories.\\"{key}\\".worktree" {{OUTPUT_DIR}}/state.yaml)
        # github — merge with squash or merge commit per project convention
        gh pr merge --auto --squash $(cd "$WORKTREE" && gh pr view --json number -q .number)
        # gitlab equivalent
        # glab mr merge ...
        ```

        On merge failure (conflicts, branch protection, missing approval): do NOT proceed to teardown. Surface to the user with the exact PR URL. Treat as ESCALATE: the user resolves on the PR side, then re-runs `/aped-lead`.

     c. Teardown the worktree (the merge succeeded → local copy is no longer needed). Prefer `workmux merge` if available (it cleans up worktree + window + branch in one); else `bash {{APED_DIR}}/scripts/worktree-cleanup.sh "$WORKTREE" --delete-branch`. Both are safe-by-default since /aped-review left a clean tree.

     d. Clear `worktree` and set `merged_into_umbrella: true` on the story in state.yaml:

        ```bash
        bash {{APED_DIR}}/scripts/sync-state.sh <<< "clear-story-worktree {key}"
        bash {{APED_DIR}}/scripts/sync-state.sh <<< "set-story-field {key} merged_into_umbrella true"
        ```

     e. **Do NOT push `/aped-ship` automatically** — even when the last story merges. The user runs `/aped-ship` to open the umbrella → base PR with the composite review.

     **Why au-fil-de-l'eau and not batch:** the umbrella is the single integration point. Merging stories into it as they're approved keeps the umbrella always-deployable to a preview environment, gives the team continuous review feedback at the umbrella level, and means `/aped-ship` has nothing to do beyond the final composite + PR. Batching merges defers conflict pain to ship time.
3. **Clear context before pushing** (story-ready and dev-done only — review-done has no push). Each APED phase should start with a fresh conversation to avoid cross-phase hallucinations (e.g., /aped-dev relitigating scope decisions from /aped-story, or /aped-review being anchored by /aped-dev's rationale). Send `/clear` first, then the follow-up command as a separate message — workmux's send API sends sequentially, and `/clear` is a Claude Code built-in that resets the session context while keeping it alive. Preferring workmux when available:
   ```bash
   HANDLE="{basename-or-workmux-list-lookup}"
   workmux send "$HANDLE" "/clear"
   workmux send "$HANDLE" "{follow-up-command}"
   ```
   If workmux isn't available, the tmux-send-keys fallback must also send `/clear` first:
   ```bash
   bash {{APED_DIR}}/scripts/checkin.sh push {story-key} "/clear"
   bash {{APED_DIR}}/scripts/checkin.sh push {story-key} "{follow-up-command}"
   ```
4. If both push paths fail: tell the user "Story Leader for {story-key} is waiting — in its terminal, run `/clear` then `{follow-up-command}`."

## Applying Blocks (escalations user wants to reject)

For escalations the user rejects, invoke:

```bash
bash {{APED_DIR}}/scripts/checkin.sh block {story-key} {kind} "{reason}"
```

This labels the ticket `aped-blocked-{kind}` and posts a comment. The Story Leader polling will see the block and know to fix before re-posting the check-in.

## Teardown — Done Stories

Teardown of a story is part of the `review-done` approval handler above (steps b–d): the PR is merged into the umbrella, the worktree is removed, the local branch is deleted (or kept if the user chose --keep-branch), and state.yaml records `merged_into_umbrella: true`. Once all stories of the active epic are merged, tell the user:

> "{N} stories merged into `$UMBRELLA`. Sprint is integration-complete. Run `/aped-ship` to open the umbrella → {base} PR with the composite review."

Rationale: the umbrella is the unit of release. Stories merge into it as they are approved (au-fil-de-l'eau); `/aped-ship` only handles the umbrella → base PR.

## Dispatch Follow-up

After approvals, compute new capacity:
- Stories flipped out of `in-progress` or `review` → slots available for `/aped-sprint`.
- Stories flipped to `done` (unmerged) → `/aped-ship` candidates.

Surface both to the user: "{N} slots free for new dispatch, {M} stories ready to ship."

## Worktree Reconciliation (state-vs-disk drift)

Before processing check-ins, run:

```bash
bash {{APED_DIR}}/scripts/check-active-worktrees.sh --format json
```

Exit 0 → no drift, continue. Exit 1 → one or more registered worktrees are missing. Show the user the list and offer:
- **Reset to ready-for-dev** for each missing story (frees the parallel slot, the work can be re-dispatched). Per story:
  ```bash
  bash {{APED_DIR}}/scripts/sync-state.sh <<< "set-story-status {key} ready-for-dev"
  bash {{APED_DIR}}/scripts/sync-state.sh <<< "clear-story-worktree {key}"
  ```
- **Leave as-is** (the user will recreate the worktree manually).

Do not auto-reset — orphan rows can mean the user is mid-recovery and you'd erase context.

## Ticket-Sync Retry (if any story has `ticket_sync_status: failed`)

Before processing check-ins, scan `sprint.stories` for any story with `ticket_sync_status: failed` (set by `/aped-sprint` when the post-dispatch ticket mutation didn't go through). For each, surface in the dashboard:

```
⚠ Ticket sync deferred (2):
  1-2-contract  KON-83  reason: "401 from Linear API"
  1-3-rpc       KON-84  reason: "network timeout"
```

Offer the user: **Retry now** / **Skip** / **Drill down on {key}**.

On retry, replay the same 3 mutations the sprint skill would have done (assign + status transition + comment). On success, clear the two fields by setting them to `null`:
```bash
bash {{APED_DIR}}/scripts/sync-state.sh <<< "set-story-field {key} ticket_sync_status null"
bash {{APED_DIR}}/scripts/sync-state.sh <<< "set-story-field {key} ticket_sync_error null"
```
On second failure, leave the fields intact and report to the user — they may need to fix credentials or the ticket itself.

## Edge Cases

- **No pending check-ins**: report and STOP; no side effects.
- **Check-in without a matching state.yaml story**: report a stale inbox entry, ask the user whether to clear it (call `checkin.sh block` with reason "stale — story missing").
- **Worktree deleted but check-in pending**: same as above; likely the user merged without approving. Suggest `block`.
- **Conflicting responses on the same story/kind**: `latest_status` wins — the script is append-only JSONL with "last write wins" semantics.

## Next Step

Tell the user:
> "{N} approved, {M} escalated, {K} blocked. {D} stories now done and ready to ship — run `/aped-ship` to batch-merge them with pre-push review. Otherwise re-run `/aped-lead` after new check-ins land, or `/aped-status` for the sprint dashboard."

**Do NOT auto-chain.** The user decides when to re-run `/aped-lead`, `/aped-sprint`, or `/aped-ship`.
