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
