---
name: aped-quick
keep-coding-instructions: true
description: 'Use when user says "quick fix", "quick feature", "hotfix", "aped quick", or invokes aped-quick. Bypasses the full A→P→E→D→R pipeline — use only for isolated fixes.'
argument-hint: "<title> [fix|feature|refactor]"
license: MIT
metadata:
  author: yabafre
  version: {{CLI_VERSION}}
---

# APED Quick — Fast Track for Small Changes

Use this for isolated fixes, small features, or refactors that don't warrant the full A→P→E→D→R pipeline.

> **Setup pointer.** Integrates with `ticket_system` in `{{APED_DIR}}/config.yaml` to label the hotfix on the source ticket so the team sees the bypass. With `ticket_system: none`, the skill writes its quick-spec under `{{OUTPUT_DIR}}/quick-specs/` only. Hard-dep matrix: `docs/skills-classification.md`.

## Setup

1. Read `{{APED_DIR}}/config.yaml` — extract config
2. Read `{{OUTPUT_DIR}}/state.yaml` — note current phase for context
3. Scan `{{OUTPUT_DIR}}/quick-specs/` for any specs with `**Status:** in-progress`
   - If found: ask user — "Resume spec `{slug}` or start a new one?"
   - If resume: load that spec and skip to Implementation

## Out-of-Scope KB Scan

Before any new quick-spec is drafted, check `{{APED_DIR}}/.out-of-scope/` for a persistent rejection that matches the user's title argument. The directory may not exist on pre-4.2 scaffolds — treat the missing directory as an empty KB and skip this section silently.

1. **List entries.** `ls {{APED_DIR}}/.out-of-scope/*.md 2>/dev/null` excluding `README.md`. If empty (or directory missing), skip.

2. **Tokenize the title argument** (the `<title>` passed to the skill). Lowercase, strip punctuation, split on whitespace, `-`, and `_`. Drop ≤2-character tokens and stop-words (`add`, `fix`, `update`, `the`, `a`, `an`, `to`, `for`, `with`).

3. **Match entries.** For each entry file, tokenize its filename the same way (drop the `.md` extension; strip `-resolved-YYYY-MM-DD` suffix so old decisions still match). Match if any title token equals any filename token (exact word equality).

4. **No match → continue silently** to Spec Isolation.

5. **Match → surface to user.** Show the entry's frontmatter + `## Why this is out of scope` body, then present the menu:

   ```
   ⚠️ Out-of-scope KB match: {{APED_DIR}}/.out-of-scope/{matched-file}

   {entry summary}

   [K] Keep refusal — abort this quick-spec, the rejection still holds
   [O] Override — append this request to "Prior requests", then continue drafting
   [U] Update — the rejection is stale; rename to {concept}-resolved-{today}.md and continue
   ```

   ⏸ **HALT — wait for user choice per match.**

6. **Behaviour by choice:**
   - `[K]` → abort with: `"Concept '{concept}' was declared out of scope on {rejected_at} (reason: {one-line rationale}). Refusing to draft this quick-spec. To revisit, re-invoke and pick `[U]`."` Exit cleanly without creating any spec file.
   - `[O]` → prepend `- {today} — quick-spec ({user_name}): {title}` to the entry's `## Prior requests` list. Continue to Spec Isolation.
   - `[U]` → rename the file to `{concept}-resolved-{YYYY-MM-DD}.md` and append `## Resolved on {YYYY-MM-DD}\n\n{one-line note from user}`. Continue to Spec Isolation.

7. **Multi-match.** Adjudicate per match, in order. Any `[K]` aborts the whole skill.

## Spec Isolation

Each quick spec is an independent file: `{{OUTPUT_DIR}}/quick-specs/{date}-{slug}.md`
- Multiple specs can exist in parallel (different sessions, different developers)
- Status field tracks lifecycle: `draft` → `in-progress` → `done` or `abandoned`
- Never overwrite an existing spec — always create a new file with a unique slug

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

Generate a quick spec using `{{APED_DIR}}/templates/quick-spec.md`:
- Fill: title, type, what, why, acceptance criteria, files to change, test plan
- Set `**Status:** draft`
- Write to `{{OUTPUT_DIR}}/quick-specs/{date}-{slug}.md`
- Present spec to user for validation before implementing

⏸ **GATE: User must approve the spec before implementation starts.**

Once approved, update `**Status:** in-progress`

## Implementation (TDD)

Same TDD cycle as aped-dev but compressed:

1. **RED** — Write test for the expected behavior
2. **GREEN** — Minimal implementation to pass
3. **REFACTOR** — Clean up while green

Run tests: `bash {{APED_DIR}}/aped-dev/scripts/run-tests.sh`

## Self-Review (30 seconds)

Quick checklist — no full adversarial review:
- [ ] Tests pass
- [ ] No security issues introduced
- [ ] No regressions in existing tests
- [ ] AC from quick spec satisfied

## Git & Ticket Workflow

Read `ticket_system` and `git_provider` from config.
Read `{{APED_DIR}}/aped-dev/references/ticket-git-workflow.md` for full guide.

1. **Branch**: create `fix/{ticket-id}-{slug}` or `feature/{ticket-id}-{slug}`
2. **Commits**: `type({ticket-id}): description` — include magic words per ticket provider
3. **PR/MR**:
   - `github`: `gh pr create --title "fix({ticket-id}): description" --body "Fixes {ticket-id}"`
   - `gitlab`: `glab mr create --title "fix({ticket-id}): description" --description "Closes {ticket-id}"`
   - `bitbucket`: push branch, create PR via web
4. **Ticket**: move to Done after merge

## Output

1. Update spec: set `**Status:** done`, fill the `## Result` section
2. No state.yaml update — quick specs don't affect pipeline phase
3. Report: files changed, tests added, quick spec path

## Example

User: "quick fix the login button not submitting"
1. Quick spec: fix, "login form submit handler not wired"
2. RED: test that clicking submit calls auth API
3. GREEN: wire onClick → submitForm()
4. Self-review: tests pass, no security issues
5. Commit: `fix(auth): wire login form submit handler`

## Common Issues

- **Change touches >5 files**: This is too big for quick — recommend full pipeline
- **New dependency needed**: HALT — ask user, this may need architectural discussion
