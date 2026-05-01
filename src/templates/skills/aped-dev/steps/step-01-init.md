---
step: 1
reads:
  - "{{APED_DIR}}/WORKTREE"
  - "git/HEAD"
  - "state.yaml#sprint.stories"
writes:
  - "tasks"
mutates_state: false
---

# Step 1: Initialization, Mode Detection, Branch Verification

## MANDATORY EXECUTION RULES (READ FIRST):

- 🛑 NEVER create a branch — branch creation is `aped-story`'s job
- 🛑 If on a protected branch (`main` / `master` / `prod` / `develop` / `release/*`), HALT and tell the user to run `aped-story` first
- 📖 ALWAYS read the complete step file before acting
- 🔄 In worktree mode, the branch is pre-existing — verify, don't create

## CONTEXT BOUNDARIES

- This is the first step of `aped-dev`.
- `aped-story` ran earlier and created the feature branch + the story file.
- The story key may be passed as argument; otherwise it's selected later in step 03 (solo mode) or pinned by the marker (worktree).

## YOUR TASK

Detect mode (worktree vs solo), verify the branch is a feature branch (not protected), confirm the story file exists.

## INITIALIZATION SEQUENCE

### 1. Mode detection — three-step lookup

Run, in order:

1. **Marker file**: `ls {{APED_DIR}}/WORKTREE` — if it succeeds, **worktree mode**. Read it (`story_key`, `ticket`, `branch`, `project_root`). Done.

2. **Worktree heuristic**: `git rev-parse --git-common-dir` — if its parent differs from `git rev-parse --show-toplevel`, we're inside a git worktree (not the main checkout). Infer:
   - `branch` from `git symbolic-ref --short HEAD`.
   - If branch matches `feature/{ticket}-{story-key}`, extract `ticket` (first dash-delimited segment after `feature/`) and `story_key` (the remainder).
   - `project_root = dirname $(git rev-parse --git-common-dir)`.
   - Write the marker now to cache the inference.

3. Else, **classic single-session mode** (main project, no worktree).

### 2. Branch verification

```bash
CURRENT_BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null || echo "DETACHED")
```

**HALT if `CURRENT_BRANCH` matches a protected pattern:**

- `main`, `master`, `prod`, `production`, `develop`, `release/*`, `DETACHED`

HALT message:

> ❌ **Cannot run `aped-dev` on `{CURRENT_BRANCH}`.** APED's branch-per-story rule lives in `aped-story`. Run `aped-story` first — it will create the feature branch and prepare the story file. Then re-invoke `aped-dev`.

In worktree mode, this HALT is normally unreachable — the worktree was cut from the umbrella by `aped-sprint`. If it fires, the worktree is corrupt — surface that to the user.

### 3. State.yaml read

Read `state.yaml` from the **current checkout's** copy:
- Worktree mode → `./{{OUTPUT_DIR}}/state.yaml` on the feature branch (NOT main's).
- Classic mode → `{{OUTPUT_DIR}}/state.yaml` (main).

If missing, HALT: *"`state.yaml` not found. Run `npx aped-method` first."*

### State.yaml authority

**Each worktree owns its own copy of state.yaml on its feature branch.** `aped-story` writes it, `aped-dev` reads + writes it, `aped-review` reads + writes it — all locally. Worktrees never reach across to main's `state.yaml` at runtime.

Main's `state.yaml` is the **authoritative** copy. `aped-lead` writes there when it approves check-ins. At merge time, `aped-ship` resolves `state.yaml` conflicts with `--ours` — main wins, the feature branch's `state.yaml` is intentionally discarded.

**Do not "fix" perceived inconsistencies** between worktree state.yaml and main's — they are expected and resolved at ship.

### 4. Verify story exists in state.yaml

In worktree mode, the story_key is pinned by the marker. Verify it exists in `state.yaml`'s `sprint.stories`. If not, HALT: the worktree doesn't map to a known story (likely a branch checked out without `aped-sprint`).

In solo mode, defer to step 03 (story selection).

## SUCCESS METRICS

✅ Mode detected (worktree marker / worktree heuristic / classic).
✅ Current branch verified to be a feature branch (not protected).
✅ State.yaml loaded from the correct checkout.
✅ Worktree mode: marker's story exists in state.yaml.

## FAILURE MODES

❌ Creating a branch from this skill — that's `aped-story`'s job.
❌ Reading main's `state.yaml` from a worktree — contradicts the authority model.
❌ Treating `release/*` as a feature branch — it's protected.

## NEXT STEP

Load `{{APED_DIR}}/aped-dev/steps/step-02-input-discovery.md` to discover upstream APED artefacts.
