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
# 6.0.0: skills moved from flat aped-X.md to aped-X/SKILL.md (with optional
# workflow.md + steps/). Walk both layouts.
for skill_entry in src/templates/skills/aped-*; do
  [[ -e "$skill_entry" ]] || continue
  base_dir=$(basename "$skill_entry")
  [[ "$base_dir" == "aped-skills" ]] && continue  # non-routable bucket
  if [[ -d "$skill_entry" ]]; then
    skill_md="$skill_entry/SKILL.md"
    [[ -f "$skill_md" ]] || continue
    base="$base_dir/SKILL.md"
  elif [[ -f "$skill_entry" && "$skill_entry" == *.md ]]; then
    skill_md="$skill_entry"
    base=$(basename "$skill_entry")
  else
    continue
  fi
  DESC_COUNT=$({ grep -E '^description:' "$skill_md" 2>/dev/null || true; } | wc -l | tr -d ' ')
  if [[ "$DESC_COUNT" -lt 1 ]]; then
    echo "FAIL: $base missing 'description:' frontmatter"
    ERRORS=$((ERRORS + 1))
  fi
  SELF_REF=$({ grep -E '^\s*/aped-' "$skill_md" 2>/dev/null || true; } | wc -l | tr -d ' ')
  if [[ "$SELF_REF" -gt 0 ]]; then
    echo "FAIL: $base has /aped- self-reference (slash commands retired in 4.0.0)"
    ERRORS=$((ERRORS + 1))
  fi
done

# ── 3. README skill counter matches actual ───────────────────────────
# Count both flat aped-X.md (legacy) and aped-X/SKILL.md (6.0.0+).
SKILL_COUNT_FLAT=$({ ls src/templates/skills/aped-*.md 2>/dev/null || true; } | wc -l | tr -d ' ')
SKILL_COUNT_DIR=$({ find src/templates/skills -mindepth 2 -maxdepth 2 -name SKILL.md 2>/dev/null || true; } | grep -v aped-skills | wc -l | tr -d ' ')
SKILL_COUNT=$((SKILL_COUNT_FLAT + SKILL_COUNT_DIR))
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
