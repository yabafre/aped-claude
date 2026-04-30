#!/usr/bin/env bash
# Automated pre-merge checklist. Validates the 4 files from CLAUDE.md
# "Pre-Merge Checklist" are consistent with the code.
# Exit 0 = all checks pass. Exit 1 = at least one failed.
set -euo pipefail

ERRORS=0

# ── 1. CHANGELOG.md — [Unreleased] has a Keep-a-Changelog category ──
UNRELEASED_BLOCK=$({ awk '/^## \[Unreleased\]/{flag=1;next} /^## \[/{flag=0} flag' CHANGELOG.md || true; })
CATEGORY_COUNT=$(echo "$UNRELEASED_BLOCK" | { grep -E '^### (Added|Changed|Deprecated|Removed|Fixed|Security)' 2>/dev/null || true; } | wc -l | tr -d ' ')
TIER_DIRECT=$(echo "$UNRELEASED_BLOCK" | { grep -E '^### Tier' 2>/dev/null || true; } | wc -l | tr -d ' ')

if [[ "$TIER_DIRECT" -gt 0 ]]; then
  echo "FAIL: CHANGELOG.md has '### Tier' direct heading (use '### Added — Tier N — ...' instead)"
  ERRORS=$((ERRORS + 1))
fi

# ── 2. Skills — description present, no /aped- self-refs ─────────────
for skill in src/templates/skills/aped-*.md; do
  [[ -f "$skill" ]] || continue
  base=$(basename "$skill")
  DESC_COUNT=$({ grep -E '^description:' "$skill" 2>/dev/null || true; } | wc -l | tr -d ' ')
  if [[ "$DESC_COUNT" -lt 1 ]]; then
    echo "FAIL: $base missing 'description:' frontmatter"
    ERRORS=$((ERRORS + 1))
  fi
  SELF_REF=$({ grep -E '^\s*/aped-' "$skill" 2>/dev/null || true; } | wc -l | tr -d ' ')
  if [[ "$SELF_REF" -gt 0 ]]; then
    echo "FAIL: $base has /aped- self-reference (slash commands retired in 4.0.0)"
    ERRORS=$((ERRORS + 1))
  fi
done

# ── 3. README skill counter matches actual ───────────────────────────
SKILL_COUNT=$({ ls src/templates/skills/aped-*.md 2>/dev/null || true; } | wc -l | tr -d ' ')
README_COUNT=$({ grep -oE '\*\*[0-9]+ skills\*\*' README.md || true; } | head -1 | { grep -oE '[0-9]+' || echo 0; })
if [[ "$SKILL_COUNT" != "$README_COUNT" ]]; then
  echo "FAIL: README claims $README_COUNT skills, actual count is $SKILL_COUNT"
  ERRORS=$((ERRORS + 1))
fi

# ── 4. SECURITY.md supported version matches current minor ──────────
CURRENT_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "0.0.0")
CURRENT_MINOR="${CURRENT_VERSION%.*}"
SEC_HAS_MINOR=$({ grep -E "^\| ${CURRENT_MINOR}\.x" SECURITY.md 2>/dev/null || true; } | wc -l | tr -d ' ')
if [[ "$SEC_HAS_MINOR" -lt 1 ]]; then
  echo "FAIL: SECURITY.md does not list ${CURRENT_MINOR}.x as supported"
  ERRORS=$((ERRORS + 1))
fi

# ── Result ───────────────────────────────────────────────────────────
if [[ "$ERRORS" -gt 0 ]]; then
  echo ""
  echo "PRE-MERGE CHECKLIST: $ERRORS issue(s) found"
  exit 1
fi

echo "PRE-MERGE CHECKLIST: all checks passed ✓"
exit 0
