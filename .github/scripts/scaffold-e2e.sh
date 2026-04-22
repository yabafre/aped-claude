#!/usr/bin/env bash
# End-to-end scaffold test: installs, validates layout, runs --update, verifies
# idempotence. Expected to run under GitHub Actions with $GITHUB_WORKSPACE set
# to the repo checkout.
set -euo pipefail

BIN="${GITHUB_WORKSPACE:-$(pwd)}/bin/aped-method.js"
if [[ ! -f "$BIN" ]]; then
  echo "::error::CLI entry point not found: $BIN" >&2
  exit 1
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
cd "$tmp"
echo "::group::Working directory"
pwd
echo "::endgroup::"

echo "::group::Phase 1 — fresh install"
node "$BIN" --yes --project=ci-e2e --author=ci
echo "::endgroup::"

echo "::group::Phase 2 — engine files present"
test -f .aped/config.yaml       || { echo "::error::.aped/config.yaml missing";       exit 1; }
test -f docs/aped/state.yaml    || { echo "::error::docs/aped/state.yaml missing";    exit 1; }
test -f .aped/hooks/guardrail.sh || { echo "::error::.aped/hooks/guardrail.sh missing"; exit 1; }
test -x .aped/hooks/guardrail.sh || { echo "::error::guardrail.sh not executable";     exit 1; }
echo "OK"
echo "::endgroup::"

echo "::group::Phase 3 — slash commands count"
cmd_count=$(find .claude/commands -maxdepth 1 -type f -name 'aped-*.md' | wc -l | tr -d ' ')
echo "slash commands found: $cmd_count"
if (( cmd_count < 8 )); then
  echo "::error::Expected at least 8 aped-*.md slash commands, got $cmd_count" >&2
  ls .claude/commands || true
  exit 1
fi
echo "::endgroup::"

echo "::group::Phase 4 — skill directories count"
skill_count=$(find .aped -maxdepth 1 -type d -name 'aped-*' | wc -l | tr -d ' ')
echo "skill directories found: $skill_count"
if (( skill_count < 8 )); then
  echo "::error::Expected at least 8 aped-* skill dirs, got $skill_count" >&2
  ls .aped || true
  exit 1
fi
echo "::endgroup::"

echo "::group::Phase 5 — skill symlinks (POSIX only)"
# Windows is skipped by the scaffolder itself; this script only runs on
# linux/macos in CI, so we always expect symlinks.
for base in .claude/skills .opencode/skills .agents/skills .codex/skills; do
  if [[ -d "$base" ]]; then
    link_count=0
    while IFS= read -r entry; do
      [[ -z "$entry" ]] && continue
      if [[ -L "$entry" ]]; then
        target="$(readlink "$entry")"
        case "$target" in
          ../*/.aped/aped-*|../*../*/.aped/*|../*/*/aped-*)
            : # relative path into .aped — expected shape
            ;;
          *)
            if [[ "$target" != ../*.aped* ]]; then
              echo "::error::symlink $entry points to unexpected target: $target" >&2
              exit 1
            fi
            ;;
        esac
        link_count=$((link_count + 1))
      else
        echo "::error::$entry exists but is not a symlink" >&2
        exit 1
      fi
    done < <(find "$base" -maxdepth 1 -name 'aped-*' ! -name '.' -print 2>/dev/null || true)
    echo "  $base  → $link_count symlinks"
    if (( link_count == 0 )); then
      echo "::warning::$base has no aped-* symlinks (scaffolder may have skipped this target)"
    fi
  else
    echo "  $base  → directory not created (expected for some targets)"
  fi
done
echo "::endgroup::"

echo "::group::Phase 6 — --update is idempotent"
# Run update twice. The second run should produce zero errors and should not
# change the content of preserved files.
before_state="$(sha256sum docs/aped/state.yaml | cut -d' ' -f1)"
node "$BIN" --yes --update --project=ci-e2e --author=ci
after_state="$(sha256sum docs/aped/state.yaml | cut -d' ' -f1)"
if [[ "$before_state" != "$after_state" ]]; then
  echo "::error::docs/aped/state.yaml was modified by --update (must be preserved)" >&2
  exit 1
fi
# Second --update should still succeed
node "$BIN" --yes --update --project=ci-e2e --author=ci
echo "::endgroup::"

echo "::group::Phase 7 — settings.local.json is valid JSON after merge"
if [[ -f .claude/settings.local.json ]]; then
  node -e 'JSON.parse(require("node:fs").readFileSync(".claude/settings.local.json","utf-8"))'
  echo "OK"
else
  echo "::warning::settings.local.json not present after install"
fi
echo "::endgroup::"

echo "::group::Phase 8 — --fresh creates a backup"
node "$BIN" --yes --fresh --project=ci-e2e --author=ci
backup_count=$(find .aped-backups -maxdepth 1 -name 'aped-*.tar.gz' 2>/dev/null | wc -l | tr -d ' ')
if (( backup_count == 0 )); then
  echo "::warning::.aped-backups/ has no archive (tar may be missing, not fatal)"
else
  echo "found $backup_count backup archive(s)"
fi
# After --fresh, the install should look fresh again
test -f .aped/config.yaml
test -f docs/aped/state.yaml
echo "::endgroup::"

echo "::group::Phase 9 — doctor passes on a healthy scaffold"
node "$BIN" doctor
doctor_exit=$?
if (( doctor_exit != 0 )); then
  echo "::error::doctor exited $doctor_exit on a fresh scaffold" >&2
  exit 1
fi
echo "::endgroup::"

echo "::group::Phase 10 — symlink repair recreates a broken link"
# Simulate a user who also has Codex — create a .codex marker so the
# auto-detection in symlinks.js picks up .codex/skills as a target.
mkdir -p .codex
node "$BIN" --yes --update --project=ci-e2e --author=ci > /dev/null
broken_link="$(find .codex/skills -maxdepth 1 -name 'aped-*' -print -quit 2>/dev/null || true)"
if [[ -n "$broken_link" && -L "$broken_link" ]]; then
  rm "$broken_link"
  test ! -e "$broken_link"
  node "$BIN" symlink
  if [[ ! -L "$broken_link" ]]; then
    echo "::error::symlink repair did not recreate $broken_link" >&2
    exit 1
  fi
  target="$(readlink "$broken_link")"
  echo "  repaired: $broken_link → $target"
else
  echo "::error::symlink repair test could not find a .codex/skills candidate after --update" >&2
  ls -la .codex/skills 2>&1 || true
  exit 1
fi
echo "::endgroup::"

echo "::group::Phase 11 — optional subcommands install without errors"
# statusline (with --yes to bypass the overwrite prompt)
node "$BIN" statusline --yes
test -f .aped/scripts/statusline.js  || { echo "::error::statusline.js missing";           exit 1; }
test -x .aped/scripts/statusline.js  || { echo "::error::statusline.js not executable";    exit 1; }

# safe-bash
node "$BIN" safe-bash
test -f .aped/hooks/safe-bash.js     || { echo "::error::safe-bash.js missing";            exit 1; }
test -x .aped/hooks/safe-bash.js     || { echo "::error::safe-bash.js not executable";     exit 1; }
node --check .aped/hooks/safe-bash.js

# post-edit-typescript
node "$BIN" post-edit-typescript
test -f .aped/hooks/post-edit-typescript.js || { echo "::error::post-edit-typescript.js missing"; exit 1; }
node --check .aped/hooks/post-edit-typescript.js

# settings.local.json still parses after three merges
node -e 'JSON.parse(require("node:fs").readFileSync(".claude/settings.local.json","utf-8"))'
echo "::endgroup::"

echo "::group::Phase 12 — doctor still passes after optional installs"
node "$BIN" doctor
echo "::endgroup::"

echo "scaffold e2e: OK"
