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

**Symptom.** The scaffold reports success, `.aped/aped-*` directories exist, but the tool doesn't see the slash commands or skills.

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

**Fix — temporary (unblock yourself).** Disable the hook for one prompt by removing it from `.claude/settings.local.json`, or use `/aped-quick` which bypasses the pipeline.

**Fix — permanent.** Reset state to a known phase:

```bash
# Example: reset to the start of the pipeline
cat > docs/aped/state.yaml <<'EOF'
current_phase: analyze
last_updated: 2026-04-22T00:00:00Z
EOF
```

Or rerun the phase that should be active (e.g., `/aped-story`) to have it fix the state for you.

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
