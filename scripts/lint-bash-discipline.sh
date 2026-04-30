#!/usr/bin/env bash
# Lint bash scripts for the §5.1 fragility patterns that have caused
# production bugs in aped-claude (4.7.5, 4.10.0, 4.11.0, 4.13.0).
# Exit 0 = clean. Exit 1 = violations found.
set -euo pipefail

ERRORS=0
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

lint_file() {
  local f="$1"
  local base
  base=$(basename "$f")

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

# Lint standalone .sh files
for f in "$SCRIPT_DIR"/scripts/*.sh "$SCRIPT_DIR"/src/templates/hooks/*.sh; do
  [[ -f "$f" ]] || continue
  lint_file "$f"
done

# Lint .github/scripts/*.sh
for f in "$SCRIPT_DIR"/.github/scripts/*.sh; do
  [[ -f "$f" ]] || continue
  lint_file "$f"
done

if [[ "$ERRORS" -gt 0 ]]; then
  echo ""
  echo "BASH DISCIPLINE: $ERRORS violation(s) found"
  exit 1
fi

echo "BASH DISCIPLINE: all scripts clean ✓"
exit 0
