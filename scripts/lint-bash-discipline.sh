#!/usr/bin/env bash
# Lint bash scripts for the §5.1 fragility patterns that have caused
# production bugs in aped-claude (4.7.5, 4.10.0, 4.11.0, 4.13.0).
#
# Scope:
#   1. Workspace shell scripts under packages/create-aped/scripts/
#   2. Scaffolded hook script (templates/hooks/*.sh)
#   3. CI scripts under .github/scripts/
#   4. ALL scaffolded scripts embedded as strings in src/templates/scripts.js
#      (materialized to a tmp dir via the exported `scripts()` function).
#
# Group 4 was previously uncovered — exactly the surface where the cited
# regressions originated. Linting the embedded strings catches discipline
# violations BEFORE they ship to user projects via npx aped-method.
#
# Exit 0 = clean. Exit 1 = violations found.
set -euo pipefail

ERRORS=0
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

lint_file() {
  local f="$1"
  local base
  # Use a path relative to SCRIPT_DIR for nicer reporting on workspace files,
  # and the basename for materialized files (which live in a tmp dir).
  if [[ "$f" == "$SCRIPT_DIR"/* ]]; then
    base=${f#"$SCRIPT_DIR"/}
  else
    base=$(basename "$f")
  fi

  # 1. grep -c in arithmetic context (§5.1#2)
  local grep_c_hits
  grep_c_hits=$({ grep -nE '\$\(.*grep\s+-c' "$f" 2>/dev/null || true; } | { grep -v 'wc -l' || true; } | wc -l | tr -d ' ')
  if [[ "$grep_c_hits" -gt 0 ]]; then
    echo "ERROR [$base]: uses 'grep -c' (use '{ grep … || true; } | wc -l | tr -d \" \"' instead)"
    ERRORS=$((ERRORS + 1))
  fi

  # 2. Unwrapped grep in pipeline under pipefail (§5.1#3)
  if { grep -q 'set -.*pipefail' "$f" 2>/dev/null || false; }; then
    local unwrapped
    unwrapped=$({ grep -nE '\|\s*grep\s' "$f" 2>/dev/null || true; } | { grep -v '|| true' || true; } | { grep -v '{ grep' || true; } | { grep -v '# ' || true; } | wc -l | tr -d ' ')
    if [[ "$unwrapped" -gt 0 ]]; then
      echo "WARN [$base]: grep in pipeline under pipefail without { … || true; } wrap"
    fi
  fi
}

# ── 1-3. Workspace + hook + CI scripts ───────────────────────────────────
for f in "$SCRIPT_DIR"/scripts/*.sh "$SCRIPT_DIR"/src/templates/hooks/*.sh; do
  [[ -f "$f" ]] || continue
  lint_file "$f"
done

for f in "$SCRIPT_DIR"/.github/scripts/*.sh; do
  [[ -f "$f" ]] || continue
  lint_file "$f"
done

# ── 4. Scaffolded scripts (embedded in src/templates/scripts.js) ─────────
TMP_SCAFFOLD=$(mktemp -d -t aped-lint-scaffold.XXXXXX 2>/dev/null || mktemp -d "${TMPDIR:-/tmp}/aped-lint-scaffold.XXXXXX")
# shellcheck disable=SC2064
trap "rm -rf '$TMP_SCAFFOLD' 2>/dev/null || true" EXIT INT TERM

if ! node --input-type=module -e "
  import { scripts } from '$SCRIPT_DIR/src/templates/scripts.js';
  import { mkdirSync, writeFileSync } from 'node:fs';
  import { dirname, join } from 'node:path';
  const list = scripts({ apedDir: '.aped', outputDir: 'docs/aped' });
  let written = 0;
  for (const entry of list) {
    if (!entry || typeof entry.path !== 'string' || !entry.path.endsWith('.sh')) continue;
    if (typeof entry.content !== 'string') continue;
    const abs = join('$TMP_SCAFFOLD', entry.path);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, entry.content);
    written++;
  }
  process.stderr.write('[lint-bash-discipline] materialized ' + written + ' scaffolded script(s) for linting\n');
" 2>&1; then
  echo "ERROR: failed to materialize scaffolded scripts from src/templates/scripts.js" >&2
  exit 1
fi

while IFS= read -r f; do
  lint_file "$f"
done < <(find "$TMP_SCAFFOLD" -type f -name '*.sh' 2>/dev/null | sort)

# ── Result ───────────────────────────────────────────────────────────────
if [[ "$ERRORS" -gt 0 ]]; then
  echo ""
  echo "BASH DISCIPLINE: $ERRORS violation(s) found"
  exit 1
fi

echo "BASH DISCIPLINE: all scripts clean ✓"
exit 0
