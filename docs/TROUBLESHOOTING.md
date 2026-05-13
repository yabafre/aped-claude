# Troubleshooting

Common issues, how to diagnose them, and how to fix them. If something isn't covered here, open an issue with the output of `aped-method --version` and `aped-method --debug` on the reproducing command.

---

## 1. `npx aped-method` installs an old version

**Symptom.** You just released a new version but `npx aped-method --version` still prints the previous one.

**Cause.** `npx` caches packages under `~/.npm/_npx/`.

**Fix.**

```bash
# Force a fresh download for this run
npx -y aped-method@latest

# Or clear the cache once
npm cache clean --force
```

You can also pin the exact version: `npx aped-method@3.7.1`.

---

## 2. Skills don't appear in Claude Code / OpenCode / Codex after scaffold

**Symptom.** The scaffold reports success, `.aped/aped-*` directories exist, but the tool doesn't see the APED skills.

**Cause.** The symlinks under `.claude/skills/`, `.opencode/skills/`, `.agents/skills/`, or `.codex/skills/` weren't created, or they point to the wrong target. This usually happens when:
- You're on Windows (see section 3).
- A non-symlink directory already exists at the target path (scaffolder refuses to overwrite real directories).
- The filesystem doesn't support symlinks (some SMB / NTFS-via-FUSE setups).

**Diagnose.**

```bash
ls -la .claude/skills/ | grep aped-
# Expect: lrwxr-xr-x ... aped-xxx -> ../../.aped/aped-xxx

# If you see a regular directory instead of a symlink:
file .claude/skills/aped-analyze
```

**Fix.**

```bash
# Remove the stale copies and re-run --update (safe: preserves artifacts)
rm -rf .claude/skills/aped-* .opencode/skills/aped-* .agents/skills/aped-* .codex/skills/aped-*
npx aped-method --update
```

If you run `--fresh`, the scaffolder cleans these targets for you before reinstalling.

---

## 3. Windows: symlinks are skipped

**Symptom.** On Windows, the scaffolder prints zero symlinks. Skills are not auto-discovered.

**Cause.** `fs.symlinkSync` requires either Developer Mode or administrator privileges, plus `git config --global core.symlinks true`. Rather than fail silently, the scaffolder skips symlink creation on `win32`.

**Workaround.** Two options:

1. **Enable Developer Mode + `core.symlinks`**, then manually run:
   ```powershell
   New-Item -ItemType SymbolicLink -Path ".claude\skills\aped-analyze" -Target "..\..\.aped\aped-analyze"
   ```
   Repeat for each skill (a one-liner loop over `.aped\aped-*`).
2. **Use WSL2** — symlinks work natively in the Linux filesystem.

Tracking: we do not currently produce a Windows-compatible fallback (e.g., `.lnk` shortcuts) because Claude Code's discovery logic expects real directories.

---

## 4. `settings.local.json` — my custom hooks got merged weirdly

**Symptom.** After `--update`, your existing hooks in `.claude/settings.local.json` are still there, but so are duplicates from APED.

**How the merge works.** `mergeSettings` appends incoming hook handlers **only if no existing handler has the same `command` string**. Deduplication is exact, so a hook command differing by even one character will be added twice.

**Diagnose.**

```bash
jq '.hooks.UserPromptSubmit[].hooks[].command' .claude/settings.local.json | sort | uniq -c
```

Look for count > 1.

**Fix.** Edit `.claude/settings.local.json` manually. The scaffolder never rewrites user-added permissions, env vars, or non-hook fields.

---

## 5. `--fresh` did not back up my installation

**Symptom.** `--fresh` completed, but `.aped-backups/` is empty or the backup archive is missing.

**Cause.** The backup step uses the system `tar` binary via `spawnSync`. On minimal containers (Alpine without `tar`, stripped-down CI images), this fails silently — documented behavior: backup never blocks a fresh install.

**Diagnose.**

```bash
which tar && tar --version
```

**Fix.** Install `tar` (`apk add tar` on Alpine) before running `--fresh`. As a belt-and-suspenders step, take your own backup first:

```bash
cp -r .aped .aped.bak && cp -r docs/aped docs/aped.bak
npx aped-method --fresh
```

---

## 6. `UserError: --aped must be a relative path`

**Symptom.** CLI exits with code 1 and this error.

**Cause.** `validateSafePath` rejects any absolute path, `..` segment, or null byte in `--aped`, `--output`, `--commands`, or their `config.yaml` equivalents. This is deliberate: the scaffolder writes under these paths and must not escape the project root.

**Fix.** Use a relative path from the current working directory:

```bash
# ❌ aped-method --aped=/tmp/foo
# ❌ aped-method --aped=../somewhere-else
# ✅ aped-method --aped=.aped
# ✅ aped-method --aped=tools/aped
```

---

## 7. Guardrail hook blocks every prompt with "pipeline out of order"

**Symptom.** Every user prompt in Claude Code is rejected by the APED guardrail.

**Cause.** `docs/aped/state.yaml` is in an inconsistent state — typically because:
- Someone edited it by hand and broke the YAML.
- A phase was committed but the state wasn't bumped (or vice versa).
- You switched branches with stale state.

**Diagnose.**

```bash
cat docs/aped/state.yaml
# Expect a clean YAML with current_phase: analyze|prd|ux|arch|epics|story|dev|review
```

**Fix — temporary (unblock yourself).** Disable the hook for one prompt by removing it from `.claude/settings.local.json`, or use `aped-quick` which bypasses the pipeline.

**Fix — permanent.** Reset state to a known phase:

```bash
# Example: reset to the start of the pipeline
cat > docs/aped/state.yaml <<'EOF'
current_phase: analyze
last_updated: 2026-04-22T00:00:00Z
EOF
```

Or rerun the phase that should be active (e.g., `aped-story`) to have it fix the state for you.

---

## 8. `--update` overwrote a file I had hand-edited

**Symptom.** A file under `.aped/` you had modified is now back to the stock template.

**Expected behavior.** `--update` overwrites every engine file **except** `docs/aped/state.yaml` (explicitly preserved) and `.claude/settings.local.json` (merged, not overwritten). If you edit engine templates in place, your edits are treated as bugs and overwritten on upgrade.

**Fix.**

1. Restore from the last `.aped-backups/aped-*.tar.gz` if you ran `--fresh` recently.
2. Going forward, put project-specific customization in:
   - `.aped/config.yaml` (preserved)
   - `docs/aped/` artifacts (PRDs, epics, stories — never touched)
   - A separate `docs/aped-custom/` directory you own

If you need to customize an engine skill permanently, open an issue — we're tracking which customizations are common enough to warrant config hooks.

---

## 9. `unknown flag: --something` but the command ran anyway

**Symptom.** You mistyped a flag name and saw a yellow warning, not an error.

**Cause.** Unknown flags are non-fatal by design: the CLI warns and continues so a minor typo doesn't wipe out a 2-minute interactive setup. Only invalid values for **known** flags (`--tickets`, `--git`, path flags) throw `UserError`.

**Fix.** Check `--help` for the canonical flag names and re-run. Short forms exist for the most common ones: `-y`, `-u`, `-v`, `-h`.

---

## 10. Colors are broken / escape codes leak in my terminal or CI logs

**Symptom.** You see `\x1b[32m` or raw ANSI codes instead of colored text.

**Fix.** Force no-color mode:

```bash
NO_COLOR=1 npx aped-method
```

If a CI runner strips TTY detection but supports colors (GitHub Actions, GitLab), force color:

```bash
FORCE_COLOR=1 npx aped-method --yes --project=ci-test
```

---

## 11. `migrate-state.sh` failed (or silently misbehaved) during `aped-method --update` (4.1.0+)

**Symptom A — explicit failure.** `aped-method --update` reports `Migration failed (exit N)` for the "Migrating state.yaml schema..." task. The previous schema and corrections are intact (no destructive change happened).

**Symptom B — silent partial success on 4.1.0 / 4.1.1.** `aped-method --update` reported success, but `docs/aped/state.yaml` is still on `schema_version: 1` with the top-level `corrections:` block in place — and `docs/aped/state-corrections.yaml` (or `docs/state-corrections.yaml` for older custom paths) was created with the same entries duplicated. Re-running `--update` made the duplication worse on each retry, eventually producing multi-document YAML in the sister file. **No data was lost** — `state.yaml.pre-v2-migration.bak` is intact and rewindable. **Fixed in 4.1.2** — upgrading and re-running `--update` is now self-healing (the migration deduplicates correctly, refuses multi-document output, and is idempotent on already-migrated v2 scaffolds).

**Cause.** The 1 → 2 schema migration (4.1.0) requires `yq` for structural YAML manipulation. The most common failure is yq not being on PATH; less commonly, a malformed `schema_version` value in state.yaml or a custom `state.corrections_path` that points outside the project root. The 4.1.0 / 4.1.1 silent-partial-success bug was the merge path emitting multi-doc YAML, breaking the downstream count read — fixed in 4.1.2.

**Diagnose.**

```bash
# Check yq presence
command -v yq || echo "yq is not installed"

# Inspect current schema version
grep -E '^schema_version:' docs/aped/state.yaml

# Re-run the migration manually to see the full error (the CLI shows it
# indented under "Full output:" — but running directly is also fine):
bash .aped/scripts/migrate-state.sh
```

**Fix.**

```bash
# Install yq (macOS / Linux / WSL):
brew install yq           # macOS
npm i -g yq               # cross-platform fallback (mikefarah/yq via npm)

# Re-run the migration. It is idempotent and non-destructive:
bash .aped/scripts/migrate-state.sh

# Or trigger via the engine refresh:
npx aped-method --update
```

**Recovery.** A backup at `<output_path>/state.yaml.pre-v2-migration.bak` (e.g. `docs/aped/state.yaml.pre-v2-migration.bak` for the standard scaffold) is written **before** any mutation. If something went catastrophically wrong:

```bash
cp docs/aped/state.yaml.pre-v2-migration.bak docs/aped/state.yaml
# Optional: roll back the corrections sister file too
rm -f docs/aped/state-corrections.yaml
```

The migration is idempotent on schema 2, so re-running after a partial rollback is safe. **For users who hit Symptom B on 4.1.0 / 4.1.1**: just upgrade to 4.1.2 and re-run `npx aped-method --update`. The migration's merge path now reads the first document from a multi-document sister file (dropping the legacy corruption), deduplicates entries by `(date, type, reason)` after merging state.yaml's still-v1 corrections with the existing sister file, and refuses multi-document output at sanity-check. The result is a clean v2 state.yaml with the correct count and a single-document sister file. No manual action required.

---

## 12. How do I know which schema version my state.yaml is on?

**Symptom.** You're not sure if `aped-method --update` already migrated your scaffold to v2.

**Diagnose.**

```bash
grep -E '^schema_version:' docs/aped/state.yaml
# v1: schema_version: 1   → corrections still inline at top-level
# v2: schema_version: 2   → corrections at corrections_pointer

# v2 should also have these top-level keys:
grep -E '^(corrections_pointer|corrections_count):' docs/aped/state.yaml

# Confirm the sister file exists when v2:
ls -la docs/state-corrections.yaml

# Use the validator for a binary verdict:
bash .aped/scripts/validate-state.sh
```

**Reading.** A clean v2 state.yaml has `schema_version: 2`, `corrections_pointer: "<path>"`, and `corrections_count: <N>` at the top level — and **no** top-level `corrections:` array. If the validator exits with code 4 and complains about a residual `corrections:` block on v2, the migration didn't complete or the file was hand-edited; run `bash .aped/scripts/migrate-state.sh` to converge.

---

## 13. Sync-logs are piling up under `docs/sync-logs/` (4.1.0+ retention)

**Symptom.** `docs/sync-logs/` keeps growing on every `aped-epics`, `aped-from-ticket`, `aped-ship`, or `aped-course` run, and your `git status` is noisy.

**Cause.** Default behavior is to **keep every log forever** (`sync_logs.retention.mode: none`). Retention is opt-in to avoid surprising existing users.

**Fix.** Enable the retention block in `.aped/config.yaml`:

```yaml
sync_logs:
  enabled: true
  dir: "docs/sync-logs/"
  retention:
    mode: keep_last_n
    keep_last_n: 50
```

After every successful `sync-log.sh end`, the helper now prunes the oldest provider-scoped logs beyond the window. Provider isolation is enforced — a Linear sync never deletes GitHub logs and vice versa.

**One-shot manual sweep.** Without enabling retention permanently:

```bash
# Dry-run — lists what would be deleted (default):
aped-method sync-logs prune

# Apply (actually deletes):
aped-method sync-logs prune --apply

# Scope to one provider:
aped-method sync-logs prune --apply --provider=linear
```

If `mode: none` is set in config, the CLI exits 0 with `retention disabled in sync_logs.retention.mode (...). Nothing to prune.` — set the mode first, then re-run.

---

## 14. My corrections appear in the wrong file (custom `corrections_path`)

**Symptom.** You set `state.corrections_path: "custom/path/corrections.yaml"` in `config.yaml`, but `aped-course` is still writing to `docs/state-corrections.yaml` (or vice versa).

**Cause.** The runtime source of truth is **`corrections_pointer` inside state.yaml**, not the config. `state.corrections_path` is the install-time default used by the scaffold and by `migrate-state.sh` when bootstrapping the file. Once `corrections_pointer` is set in state.yaml, every subsequent `append-correction` honors that pointer — a config edit alone won't move existing corrections.

**Fix.** Move both in lock-step:

```bash
# 1. Move the file to the new location.
mkdir -p custom/path
git mv docs/state-corrections.yaml custom/path/corrections.yaml

# 2. Update the pointer in state.yaml (use yq for safety):
yq eval -i '.corrections_pointer = "custom/path/corrections.yaml"' docs/aped/state.yaml

# 3. Update the install-time default in config.yaml so future scaffolds /
#    --update runs see the same path.
yq eval -i '.state.corrections_path = "custom/path/corrections.yaml"' .aped/config.yaml

# 4. Verify state validates and the count matches:
bash .aped/scripts/validate-state.sh
yq eval '.corrections | length' custom/path/corrections.yaml
yq eval '.corrections_count' docs/aped/state.yaml
```

The two counts must agree — if they diverge, run any `append-correction` (even a no-op probe followed by manual rollback isn't necessary; `mark-story-done` calls don't touch this) to re-sync the cache, or hand-edit `corrections_count` to match `length`.

---

## 15. `corrections_pointer` points to the wrong path on a 4.1.0 / 4.1.1 install (4.1.2+ self-heal)

**Symptom.** Your `state.yaml` has `corrections_pointer: "docs/state-corrections.yaml"` but your `output_path` is `docs/aped/` (the default scaffold). The actual file at `docs/state-corrections.yaml` is empty, and `docs/aped/state-corrections.yaml` is also empty (or missing). `append-correction` writes to the path the pointer says, so any past entries landed at the orphaned `docs/state-corrections.yaml`.

**Cause.** The 4.1.0 / 4.1.1 scaffold hardcoded the literal `"docs/state-corrections.yaml"` for both `corrections_pointer` (in state.yaml) and `state.corrections_path` (in config.yaml). For projects whose `output_path` happened to match (e.g. `output_path: docs`), the bug was invisible. For default scaffolds with `output_path: docs/aped`, the pointer pointed one level too high.

**Fix — automatic in 4.1.2.** `migrate-state.sh` 4.1.2+ runs a `self_heal_corrections_pointer` step on every invocation (regardless of `schema_version`). If the pointer differs from the expected `<output_path>/state-corrections.yaml` AND the wrong location is empty/missing, the pointer is retargeted to the correct value. **User data at the wrong location is never moved without explicit user action** — the self-heal is conservative on purpose.

```bash
# The self-heal runs automatically on:
npx aped-method --update      # part of the Phase-3 migration task
bash .aped/scripts/migrate-state.sh   # standalone invocation
```

**Manual fix — if the wrong location has user data.** The self-heal won't move data on your behalf. You either keep the (wrong-but-stable) pointer where the data lives, or you relocate manually. For relocating, follow §14 above (move the file + update both `corrections_pointer` in state.yaml and `state.corrections_path` in config.yaml in lock-step, then re-validate counts).

**Verify the heal worked.**

```bash
# After 4.1.2 --update:
grep '^corrections_pointer:' docs/aped/state.yaml
# Should print: corrections_pointer: docs/aped/state-corrections.yaml  (matches output_path)

bash .aped/scripts/validate-state.sh
# Exit 0 = clean
```

---

## 16. MCP server not working after `enable-mcp` (4.13.0+)

**Symptom.** You ran `aped-method enable-mcp` but Claude Code doesn't show `aped_state.get`, `aped_state.update`, etc. in the MCP tools list.

**Cause A.** `settings.local.json` merge lost the `mcpServers` key. This happened in v4.14.0–v5.5.0 when other hooks were installed before `enable-mcp`. Fixed in v5.5.1.

**Fix.** Upgrade to `aped-method@5.5.1+` and re-run `aped-method enable-mcp`. Verify:

```bash
cat .claude/settings.local.json | node -e '
  let d=""; process.stdin.on("data",c=>d+=c);
  process.stdin.on("end",()=>{
    const s=JSON.parse(d);
    console.log("mcpServers:", Object.keys(s.mcpServers || {}));
    console.log("hooks:", Object.keys(s.hooks || {}));
  });
'
```

Both `mcpServers` and `hooks` should have entries.

**Cause B.** `yq` not installed. The MCP server uses `yq` for YAML manipulation.

**Fix.** Install yq: `brew install yq` (macOS) or check [yq docs](https://github.com/mikefarah/yq).

**Cause C.** Claude Code needs a restart after `enable-mcp` to pick up the new MCP server.

## 17. Agent doesn't follow APED skills / skips steps (5.5.0+)

**Symptom.** The agent invokes a skill (e.g. `aped-dev`) but drops execution discipline — skips TDD, batches commits, doesn't sync tickets.

**Cause A.** `CLAUDE.md` missing the APED block. Check the session-start banner — if it shows `⚠ CLAUDE.md missing APED block`, the agent has no instruction to follow APED discipline.

**Fix.** Run `aped-claude` to inject the APED block into your project's `CLAUDE.md` (not `CLAUDE.local.md` — that's gitignored and invisible in worktrees).

**Cause B.** Long skill → attention degradation. Skills > 300 lines lose the agent's attention at the end.

**Fix.** v5.5.0 added completion-gate checklists for 16 skills. Verify they're installed: `ls .aped/skills/aped-skills/checklist-*.md`. If missing, re-scaffold with `aped-method --update`.

**Cause C.** `commit-gate` hook not installed. Without it, the agent can edit many files without committing.

**Fix.** `aped-method commit-gate` — installs the PostToolUse advisory hook that warns after 5+ uncommitted changes.

## 18. Completion-gate checklists not scaffolded (5.5.0+)

**Symptom.** Skills end without referencing a checklist file, or `ls .aped/skills/aped-skills/checklist-*.md` shows 0 files.

**Cause.** Scaffolded with a version < 5.5.0.

**Fix.** `npx aped-method@latest --update` re-scaffolds all engine files including checklists.

## 19. I have a flat `aped-X.md` scaffold from 5.x — does it still work in 6.0.0?

**Symptom.** You scaffolded with `aped-method@5.x` and have flat skill files (`.aped/aped-X.md`). After updating, you wonder whether anything still routes correctly.

**Cause.** None — both layouts are supported. v6.0.0 introduces the BMAD directory structure (`aped-X/SKILL.md` + optional `workflow.md` + `steps/*`), but the Claude Code skill loader has handled both layouts since v4.4.0.

**Fix.** Two paths:

- **Stay on the flat layout.** Skills keep working. Natural-language triggers still route via the `description:` frontmatter. Nothing breaks.
- **Migrate to the directory layout.** Run `npx aped-method@latest --update`. The scaffolder rewrites every skill into directory form and preserves `state.yaml`, story files, retros, and lessons. No manual cleanup required.

The directory layout's payoff is token economy: the 10 phase skills now ship 6–12 small step files (averaging <120 lines) instead of one 600-line monolith. Claude only loads the slice relevant to the current operation. If you're hitting context-pressure issues during long phases (especially `aped-review` with all 3 stages), `--update` is worth it.

## 20. Branch creation gate moved in 6.0.0 — `aped-dev` says "verify only"

**Symptom.** You run `aped-dev` and it expects a feature branch to already exist. In 5.x, `aped-dev` would create the branch.

**Cause.** v6.0.0 moved branch creation from `aped-dev` to `aped-story`. Reasons: a story should never start on `main`/`master`/`prod`/`develop`/`release/*`/detached HEAD; the gate belongs at the earliest point where work begins, not just before `aped-dev`.

**Fix.** Run `aped-story` first. It creates `feature/{ticket}-{slug}` after the story write step. Then `aped-dev` verifies the branch and proceeds. If you have `lessons.md` rules referencing `aped-dev` branch creation, re-scope them to `aped-story`.

## 21. `aped-review` Review Record location changed in 6.0.0

**Symptom.** You expected a `docs/reviews/{story-key}-review.md` file after `aped-review` finished. Nothing was created there.

**Cause.** v6.0.0 fixed a bug: `aped-review` no longer writes a separate review file. The Review Record is appended inline to the story file at `docs/aped/stories/{story-key}.md` under a `## Review Record` section. Step 12's completion gate has a hard `[ ] **NO separate review file created** anywhere` item.

**Fix.** Look for `## Review Record` at the bottom of the story file. If you have legacy `docs/reviews/*.md` files from 5.x, you can fold them into the matching story file or leave them as historical reference — the new pipeline never reads them.

## 22. Sprint mode — `parallel_limit` ignored after upgrading to 6.1.0

**Symptom.** You set `sprint.parallel_limit: 5` in `state.yaml.sprint.parallel_limit`, but `aped-sprint` still dispatches max 3.

**Cause.** v6.1.0 schema v3 moved `parallel_limit` and `review_limit` out of state.yaml into `{{APED_DIR}}/config.yaml.sprint.*` (preferences, not runtime state). Readers prefer config; only fall back to state.yaml for v2 scaffolds. If your scaffold has `schema_version: 3` AND a stale `sprint.parallel_limit` in state.yaml, the value in state.yaml is ignored and `validate-state.sh` will refuse to operate.

**Fix.** Either:
- Run `aped-method --update` and let `migrate-state.sh` move the value to `config.yaml` automatically (idempotent on v3, so safe to re-run); or
- Manually move the value: edit `{{APED_DIR}}/config.yaml`, add `sprint:` with `parallel_limit: 5` underneath, then delete the field from state.yaml.

Verify: `bash .aped/scripts/validate-state.sh` exits 0 and `bash .aped/scripts/migrate-state.sh` reports no-op.

## 23. Sprint mode — `aped-lead` review-done teardown happens before merge completes

**Symptom.** `aped-lead` approves `review-done`, prints "merging…", and then the worktree is gone — but the PR is still open / pending checks.

**Cause.** Pre-6.1.0, `aped-lead` used `gh pr merge --auto --squash` which returns success after **enqueueing** the merge (subject to required reviews / status checks), not after the merge actually happens. Teardown then ran while the PR was still pending.

**Fix.** v6.1.0 reordered the handler and added merge-completion polling: `gh pr merge --squash` (no `--auto`) → poll `gh pr view --json state -q .state` until `MERGED` or `sprint.merge_poll_timeout_seconds` elapses (default 120s) → only then set `merged_into_umbrella: true` → `mark-story-done` → teardown. On timeout / `CLOSED` / failure: state stays at `status: review`, worktree stays on disk for recovery, user re-runs `aped-lead` after fixing the PR side. If you're on 6.0.x, run `aped-method --update`.

## 24. Sprint mode — base branch is `develop` / `master`, but umbrella was cut from `main`

**Symptom.** Your project trunk-deploys from `develop`, but `aped-sprint` created `sprint/epic-N` from `origin/main` and `aped-ship` wants to PR into `main`.

**Cause.** Pre-6.1.0, `base_branch` was *referenced* by `aped-sprint` and `aped-ship` but **never seeded by the scaffolder** — the read always fell back to the literal string `"main"` regardless of the project. v6.1.0 seeds `base_branch: main` in `config.yaml` at scaffold time and the migration v2→v3 also adds it to existing scaffolds.

**Fix.** Edit `{{APED_DIR}}/config.yaml` and set `base_branch: develop` (or whatever your trunk is). `aped-sprint` will cut the next umbrella from `origin/develop` and `aped-ship` will PR against it. Existing umbrellas are not relocated — abandon them or rebase manually.

## 25. Sprint mode — Stage 1.5 reviewers (Hannah/Eli/Aaron) silently never run

**Symptom.** You set `review.parallel_reviewers: true` in `config.yaml` but the review only ever shows Eva / Marcus / Rex / specialists — never Hannah / Eli / Aaron.

**Cause.** Pre-6.1.0, the `review.parallel_reviewers` flag was *referenced* by `aped-review/steps/step-03` but the `review:` block was **never seeded in config.yaml**. Even if you added the key by hand, the resolution path read `null` and skipped Stage 1.5.

**Fix.** v6.1.0 adds a real `review:` block to `config.yaml` with `parallel_reviewers: false` as the default. Run `aped-method --update` to scaffold it, then flip to `true`. Verify via `yq '.review.parallel_reviewers' .aped/config.yaml` — must return `true` (not `null`).

## 26. APED skills auto-invoke even after I want Claude Code without APED (6.2.0+)

**Symptom.** You shipped APED into a project, then changed your mind — but typing "let's create the prd" still routes Claude to `aped-prd`. You don't want APED to auto-trigger on natural-language phrases anymore, but uninstalling feels heavy.

**Cause.** APED skills route via their `description:` frontmatter. Even if you stop *using* the skills, they still match.

**Fix — `aped-method disable`** (6.2.0+).

```bash
cd <project>
npx aped-method disable
```

This flips `disable-model-invocation: true` on every `.aped/aped-*/SKILL.md` and writes `.aped/.DISABLED` + `.aped/.disable-snapshot.json` recording which skills were originally unflagged. Claude Code will no longer auto-route to APED skills on the next session reload.

**Reverse it any time:**

```bash
npx aped-method enable
```

The snapshot is consumed: only the originally-unflagged skills lose the flag; the 14 always-opt-out skills (e.g. `aped-arch`, `aped-grill`, `aped-zoom-out`) stay opt-out as they were before.

**Check current state:**

```bash
npx aped-method status
# → APED is enabled — 35 skills routing normally.
# or
# → APED is disabled — 35 skills (20 newly suppressed, 14 already opt-out).
#   Last toggle: 2026-05-07T11:50:00.000Z
```

**Defense in depth.** Even if a user types `/aped-X` explicitly to bypass routing, every skill body now starts with an activation guard line:

> Before any other action, run `bash {{APED_DIR}}/scripts/check-enabled.sh`. If it exits non-zero, print "APED disabled — run aped-method enable" and HALT.

So the skill HALTs silently before doing any work when APED is disabled, regardless of how it was invoked.

**Stale snapshot recovery.** If `.aped/.DISABLED` exists but `.aped/.disable-snapshot.json` is missing (manual edits, partial backup restore), `aped-method enable` falls back to a best-effort restore — strips the flag from all 35 skills. The 14 originals lose their pre-existing opt-out, but routing is restored. Re-edit the 14 SKILL.md frontmatters by hand if you need them opt-out again, or run `aped-method --update` to re-scaffold from the package defaults.

## 27. `validate-state.sh` prints schema WARN lines about my state.yaml (6.2.0+)

**Symptom.** Running `bash .aped/scripts/validate-state.sh` (or any skill that calls it at Setup) emits stderr lines like:

```
WARN: state.yaml does not match schema v3 (drift detected — see below).
6.2.0 is WARN-only; 7.0.0 will refuse to operate.
data/sprint/stories/1-2-auth must NOT have additional properties: dev_completed_at
data/pipeline/phases/ux must NOT have additional properties: design_system
```

**Cause.** v6.2.0 added a strict JSON Schema (draft 2020-12) for `state.yaml v3` shipped at `.aped/data/state.yaml.schema.v3.json`. `validate-state.sh` invokes `npx -y ajv-cli@^5` against the schema at the end of its checks. The schema rejects:

- Invented sub-blocks under `pipeline.phases.<phase>` (e.g. `design_system`, `style_direction`, `councils_retired`, `ramp_tiering`).
- Free-form fields under `sprint.stories.<key>` (e.g. `verdict`, `review_notes`, `dev_completed_at` — those belong in the story file's Review Record, not state.yaml).
- Out-of-taxonomy phase statuses (only `in-progress` / `done`).
- Heterogeneous-shape lists or prose-laden YAML comments narrating descopes.
- `sprint.parallel_limit` / `sprint.review_limit` (moved to `config.yaml.sprint.*` in v3).

**Rollout schedule.** WARN-only in 6.2.0 — your skills keep working unchanged. **7.0.0 will escalate to ERROR** (validate-state.sh exits non-zero) — clean drift before then.

**Fix.**

1. Read each WARN line — it names the exact path that drifted.
2. Decide per field:
   - **Field belongs in the story file's Review Record** (verdict, review_notes, dev_completed_at) — move it there, drop from state.yaml.
   - **Field belongs in `config.yaml`** (parallel_limit, review_limit) — move it. The migration script does this automatically: `bash .aped/scripts/migrate-state.sh`.
   - **Field is a legit new shape we forgot to schema-add** — open an issue with the field + its purpose so the next minor adds it.
3. Re-run `validate-state.sh` until clean.

**Skip the schema check** (offline / sandboxed CI / no `npx`):

The script auto-skips with a single-line `WARN: schema check skipped (...)` if any of `yq`, `npx`, or outbound npm access is unavailable. No special flag — graceful by design.

**Force-refresh the schema:**

```bash
npx aped-method --update    # ships the latest .aped/data/state.yaml.schema.v3.json
```

## 28. I see broken external links / unfamiliar names in old skill bodies (6.2.0+)

**Symptom.** Skills scaffolded before v6.2.0 mention "Pocock", "Adapted from", "Translation of", "Lifted from Superpowers", "BMAD pattern", or "Anthropic context-engineering". Claude tries to look up these references in your project and finds nothing.

**Cause.** Pre-6.2.0 skill bodies preserved attribution prose from the upstream sources APED translated. Those sources don't ship with your project — Claude wastes context trying to resolve them. v6.2.0 purged the citations across the skill set and added `tests/no-external-attributions.test.js` to fail the build on any new occurrence.

**Fix.** Run `npx aped-method --update` to refresh the scaffolded skills. The technical content is preserved; only the citation prose was removed. Reference docs under `.aped/aped-skills/` (e.g. `anthropic-best-practices.md`) keep their attribution intentionally — they are user-readable references, not skill bodies.

## 29. `validate-story.sh` complains about my `story.md` (6.3.0+)

**Symptom.** `aped-story` self-review (or a manual `bash .aped/scripts/validate-story.sh docs/aped/stories/1-1-foo.md`) emits stderr lines like:

```
docs/aped/stories/1-1-foo.md:42 — invented top-level heading 'Verdict' not in schema
docs/aped/stories/1-1-foo.md: missing required heading 'Acceptance Criteria'
docs/aped/stories/1-1-foo.md:23 — line does not match expected pattern under 'Acceptance Criteria'
```

**Cause.** v6.3.0 ships a structural schema for `story.md` at `.aped/data/story.schema.json`. The validator walks the markdown, requires the canonical `## ` headings (User Story / Acceptance Criteria / Tasks / Dev Notes / File List, plus optional Dev Agent Record / Review Record), forbids invented top-level sections, and requires AC bullets to mention `Given` / `When` / `Then`.

**Rollout schedule.** WARN-only in 6.3.0 (state stays advanced; the warning is informational). **7.0.0 will escalate to ERROR** — the producing skill blocks state.yaml advance on drift.

**Fix.**

1. Read each line — it names the file:line and the violation class.
2. **Invented heading** — rename to a canonical heading or move the content under one (most "Verdict" / "Status" / "Notes" sections belong inside Review Record).
3. **Missing required heading** — add the section. AC and Tasks are non-negotiable.
4. **AC line shape** — rewrite the bullet to include `Given X, when Y, then Z`. Rationale: see `.aped/aped-story/SKILL.md` ("Reader-persona check").
5. Re-run aped-story (or hand-edit and re-run `validate-story.sh`).

**Skip the schema check.** The validator fail-soft when its Node walker (`scripts/lib/markdown-schema-walk.mjs`) is missing — same pattern as `validate-state.sh`. No flag needed.

## 30. `validate-epic-context.sh` says my cache is malformed (6.3.0+)

**Symptom.**

```
docs/aped/epics-context/epic-1-context.md: missing required heading 'Previous stories — outcomes'
```

**Cause.** The epic-context cache at `docs/aped/epics-context/epic-{N}-context.md` is engine-owned: `aped-story` writes the strict template, and `aped-review` appends `### Story X — done {ISO}` blocks under the `## Previous stories — outcomes` heading. If that heading goes missing, `aped-review`'s append step has no anchor and silently breaks.

**Fix.** Re-run `aped-story` for any story in the epic — step-02 detects the stale/malformed cache and refreshes it. Do **not** hand-edit the cache to add the heading; the next refresh would re-overwrite. The validator's purpose is to surface the breakage early, before `aped-review` discovers it.

## 31. `validate-epics.sh` flags my `epics.md` (6.3.0+)

**Symptom.**

```
docs/aped/epics.md: missing required heading 'FR Coverage Map'
```

**Cause.** The 6.3.0 epics schema is permissive on `## Epic 1: ...`, `## Epic 2: ...` (count varies per project — pattern matching lands in 6.4.0), but **strict on the closing `## FR Coverage Map`** which `aped-sprint` consumes to compute the dependency DAG.

**Fix.** Re-run `aped-epics` step-07 — the writer adds the FR Coverage Map at the bottom. If you hand-edited an existing `epics.md`, append a `## FR Coverage Map` section listing each FR → Epic → Story mapping.

## 32. I see legacy `step-XX-*.md` files under `.aped/aped-review/steps/` after upgrading (6.3.0+)

**Symptom.** Right after `aped-method --update` from 6.1.x or 6.2.x to 6.3.0, the directory `.aped/aped-review/steps/` contains the **old** step files (12 of them, named `step-01-init.md` etc) **alongside** the **new** ones (5 files, `step-01-setup.md` etc). 17 files total. Confusing.

**Cause.** Pre-6.3.0, `--update` wrote the new templates but never deleted files that no longer existed in the new template set. Every release that renamed an engine file accumulated dead state.

**Fix.** v6.3.0+ surfaces those orphans during `--update`. Run:

```bash
npx aped-method --update            # interactive: pick [D]elete all
npx aped-method --update --yes      # non-interactive: auto-delete
```

The cleanup pass walks `.aped/`, diffs against the new templates, and prompts `[D]elete all` / `[K]eep + allowlist` / `[C]ancel`. `[K]eep + allowlist` appends paths to `.aped/.update-allowlist` (one path per line, `#` comments allowed) so future `--update` runs respect them — useful when you've hand-added an engine file you want to keep.

Audit log lands at `.aped/.update-orphans-{ISO}.log` before any rm, and the pre-update tarball under `.aped-backups/aped-{stamp}.tar.gz` (if present) preserves the file content for recovery.

**Out of scope.** The cleanup never touches `outputDir/` (your artefacts), `.aped/config.yaml`, `.disable-snapshot.json`, `.DISABLED`, `.archive/`, `checkins/`, `logs/`, or `WORKTREE`. Engine paths only.

**Opt-in installation surfaces are protected (6.3.1+).** `.aped/hooks/`, `.aped/mcp/`, `.aped/visual-companion/`, and any `*.example` file are never returned as orphans — even if the probe-detection in `getInstalledOptionalTemplates` ever misses a feature. So an `aped-method enable-mcp` install, an `aped-method commit-gate` hook, or a `workmux.yaml.example` survives every `--update`. (The 6.3.0 GA briefly flagged these as orphans; if you ran `--update --yes` between v6.3.0 and v6.3.1 release time, the `.aped-backups/aped-{stamp}.tar.gz` tarball under your project root is the recovery path: `tar xzf .aped-backups/...tar.gz path/to/file`.)

## 33. A generated `SKILL.md` looks stale after my edit (6.6.0+)

**Symptom.** You edited a `SKILL.md` that ships with a `SKILL.md.tmpl` sibling, but `npm test` (or PR CI) fails with `Stale generated file: ...` and a "Fix: npm run gen:skill-docs" hint.

**Cause.** Since v6.6.0, skill bodies sharing boilerplate (activation guard + config preamble + language directive) are generated by `scripts/gen-skill-docs.mjs` from `.tmpl` sources. The `<!-- AUTO-GENERATED -->` marker on the line right after frontmatter is the signal that a file is generated.

**Fix.** Move your edit to the `SKILL.md.tmpl` sibling, run `npm run gen:skill-docs` to regenerate, then commit both files. The freshness test re-runs the generator in-process and byte-compares — it surfaces the first diff with a line number to help locate the divergence. `prepublishOnly` runs the same check, so stale output can't reach npm.

## 34. Context-monitor advisory feels noisy in a long session (6.7.0+)

**Symptom.** `aped-method context-monitor` is installed and the agent receives `CONTEXT WARNING` / `CONTEXT CRITICAL` advisories.

**Cause.** This is intentional — the statusline shows the user the context bar, but the agent itself has no native signal. The hook reads the transcript's last assistant turn (`input_tokens + cache_read + cache_creation`) after every tool call, detects 1M-context models from `model.id` containing `[1m]`, and emits when remaining ≤ 35% (WARNING) or ≤ 25% (CRITICAL). Debounces 5 tool calls between same-severity warnings; severity escalation (WARNING → CRITICAL) bypasses the debounce.

**Fix options.**
- Disable per-developer: set `hooks.context_monitor: false` in `.aped/config.local.yaml` (gitignored; read with precedence over the team `config.yaml`).
- Disable for the team: same key in `.aped/config.yaml`.
- Uninstall entirely: `aped-method context-monitor --uninstall`.

The hook is advisory only — it never blocks tool execution. Debounce state in `/tmp/aped-ctx-{sessionId}-warned.json` is treated as fresh after 60s of inactivity, so leftover state from a previous session never persists across restarts.

## 35. `aped-lead` check-ins always escalate with "no worktree registered" (≤ 6.7.4)

**Symptom.** Every `aped-lead` `[A]uto` action escalates to manual review, with stderr ending `ERROR: no worktree registered for <story-key> in state.yaml`, even though `state.yaml` shows the story has a `worktree:` path set.

**Cause.** State.yaml v3+ writes numeric-leading story keys with double quotes — `    "3-5":` — because `3-5` is not a valid YAML bare scalar. Pre-6.7.5 the awk patterns inside `check-auto-approve.sh`, `checkin.sh`, and `check-active-worktrees.sh` matched `^    <key>:` literally and stepped over the quoted-key line. The story block was therefore "invisible" to the script — every field-lookup returned empty.

**Fix.** Upgrade to 6.7.5+ (`npm install aped-method@latest && npx aped-method --update`). The five affected awk patterns are symmetric across quoted and unquoted keys (`"?key"?:`). No state.yaml change required.

## 36. `aped-method context-monitor` was disabled but warnings still show (6.7.0)

**Symptom.** Set `hooks.context_monitor: false` in `config.local.yaml`, but the hook still emits `CONTEXT WARNING`. Or set `hooks.context_monitor: true` and nothing fires.

**Cause.** The hook reads `config.local.yaml` first (per-developer override, gitignored) then `config.yaml`. Whichever file matches first wins. If you set the key in `config.yaml` but `config.local.yaml` also has `hooks.context_monitor:` (with the opposite value), the local override beats the team setting silently.

**Fix.** Grep both files for `context_monitor:` and reconcile. If you want the team setting to apply, delete the line from `config.local.yaml`.

## 37. Sequential sprint mode HALTs with "requires git-spice" (6.7.5+)

**Symptom.** Set `sprint.mode: sequential` in config, ran `aped-sprint`, got `ERROR: sprint.mode=sequential requires git-spice` and an install link.

**Cause.** Sequential mode stacks stories via `git-spice` (`gs branch create`). The dispatch script sniffs `gs --version` for a git-spice signature to disambiguate from GhostScript (`/usr/bin/gs` on macOS) — both share the same binary name.

**Fix.** Install git-spice:

```bash
# macOS
brew install abhinav/tap/git-spice
# Linux / other — see https://github.com/abhinav/git-spice#installation
```

Then re-run `aped-sprint`. If you don't want sequential mode after all, set `sprint.mode: parallel` (or remove the key entirely — parallel is the default).

## 38. Sequential sprint marker reflects the wrong story after `gs branch checkout` (6.7.5)

**Symptom.** In sequential mode, you dispatched story 1-1, then dispatched 1-2. The `.aped/WORKTREE` marker now says `story_key: 1-2`. You `gs branch checkout feature/KON-1-1-1` to revisit story 1, but `aped-dev`'s step-01 reads the marker and thinks you're on 1-2.

**Cause.** Pre-6.8.0, the marker was rewritten on every dispatch and lived at a single path in the shared worktree. `gs branch checkout` switches the active git branch but didn't touch the marker (untracked file).

**Fix.** Upgrade to 6.8.0+. Sequential mode now writes per-story markers `.aped/WORKTREE.<story-key>.yaml` — story 1-1 keeps its own file, story 1-2 gets a separate one. `worktree-cleanup.sh --delete-branch` globs all markers and iterates their `branch:` lines. Parallel mode is unchanged (legacy `.aped/WORKTREE` single file). For projects upgrading from 6.7.5, the legacy `WORKTREE` file stays where it is until the next dispatch — first new sequential dispatch on 6.8.0 starts the per-story shape.

## 39. `prompt-injection` hook flagged a doc I trust (6.8.0+)

**Symptom.** `aped-method prompt-injection` is installed and you Read a known-good markdown file — the agent gets a `READ INJECTION SCAN [LOW]` advisory about `ignore previous instructions` or `<system>`. The file is a security cheat-sheet or an LLM evals fixture quoting these patterns intentionally.

**Cause.** L1 detection is regex-based with no semantic context. Any file that quotes an injection pattern as documentation (security notes, eval datasets, BLOG posts about attacks) trips the hook at `[LOW]`. By design — the hook is a canary, not a filter.

**Fix.** Three options, in order of preference:

1. **Trust the canary.** `[LOW]` means single-pattern match; the message tells the agent the doc may be quoting the pattern legitimately. The agent stays aware but doesn't pivot. This is the intended UX.
2. **Add the path to the excluded fragments.** Edit `.aped/hooks/prompt-injection.js`'s `EXCLUDED_PATH_FRAGMENTS` array — add a substring that matches your fixture/doc path (e.g. `/evals/injection-corpus/`). Reinstall preserves your edit only if it's outside the regenerable template — the engine treats the hook as opt-in, so the file stays untouched on `--update` unless you re-run `aped-method prompt-injection`.
3. **Disable per session.** `hooks.prompt_injection: false` in `.aped/config.local.yaml` (per-developer, gitignored). Re-enable when you're done.

## 40. `prompt-injection` advisory keeps firing on the same file (6.8.0+)

**Symptom.** Same file Read twice in a session, both times trigger the advisory.

**Cause.** Severity escalation — first Read matched 1 pattern (LOW), second Read matched 3+ (HIGH). The debounce intentionally lets HIGH through after LOW so a coordinated attack isn't muffled.

**Fix.** Inspect the file. If the second match is a real escalation (more patterns appeared, e.g. a fetched doc grew or got rewritten), trust the canary and react. If both Reads see identical content and the count grew because of how `tool_response` is structured (object form vs string form), report it — the hook should be deterministic per file content.

## Still stuck?

Run with `--debug` to get a stack trace on error:

```bash
npx aped-method --debug
```

Then open an issue at <https://github.com/yabafre/aped-claude/issues> with:
- `aped-method --version`
- `node --version`
- platform (`uname -a` or `ver`)
- the stack trace from `--debug`
- what you tried
