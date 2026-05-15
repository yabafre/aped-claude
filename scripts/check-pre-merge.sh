#!/usr/bin/env bash
# Automated pre-merge checklist. Validates that the 5 rows of CLAUDE.md
# "Pre-Merge Checklist" are consistent with the code.
# Exit 0 = all checks pass. Exit 1 = at least one failed.
set -euo pipefail

ERRORS=0
WARNINGS=0

# ── 1. CHANGELOG.md — [Unreleased] non-empty AND uses Keep-a-Changelog ──
UNRELEASED_BLOCK=$({ awk '/^## \[Unreleased\]/{flag=1;next} /^## \[/{flag=0} flag' CHANGELOG.md || true; })
CATEGORY_COUNT=$(echo "$UNRELEASED_BLOCK" | { grep -E '^### (Added|Changed|Deprecated|Removed|Fixed|Security)' 2>/dev/null || true; } | wc -l | tr -d ' ')
TIER_DIRECT=$(echo "$UNRELEASED_BLOCK" | { grep -E '^### Tier' 2>/dev/null || true; } | wc -l | tr -d ' ')
BULLET_COUNT=$(echo "$UNRELEASED_BLOCK" | { grep -E '^- ' 2>/dev/null || true; } | wc -l | tr -d ' ')

if [[ "$TIER_DIRECT" -gt 0 ]]; then
  echo "FAIL: CHANGELOG.md has '### Tier' direct heading (use '### Added — Tier N — ...' instead)"
  ERRORS=$((ERRORS + 1))
fi

# Empty [Unreleased] is only acceptable if there is literally nothing to ship.
# Detect that by checking whether any non-doc files changed since the last
# tagged release. If yes, [Unreleased] must have at least one category.
if [[ "$CATEGORY_COUNT" -eq 0 && "$BULLET_COUNT" -eq 0 ]]; then
  LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
  if [[ -n "$LAST_TAG" ]]; then
    SHIP_DIFF=$(git diff --name-only "${LAST_TAG}..HEAD" 2>/dev/null \
      | { grep -vE '^(docs/|CHANGELOG\.md|README\.md|SECURITY\.md|\.github/)' || true; } \
      | wc -l | tr -d ' ')
    if [[ "$SHIP_DIFF" -gt 0 ]]; then
      echo "FAIL: CHANGELOG.md [Unreleased] has no Keep-a-Changelog category but $SHIP_DIFF code file(s) changed since $LAST_TAG"
      ERRORS=$((ERRORS + 1))
    fi
  fi
fi

# ── 2. Skills — description present, no /aped- self-refs (full body) ──
# 6.0.0: skills moved from flat aped-X.md to aped-X/SKILL.md (with optional
# workflow.md + steps/). Walk both layouts AND scan workflow + steps for
# /aped- self-refs (lived experience: self-refs sneak into substeps).
for skill_entry in src/templates/skills/aped-*; do
  [[ -e "$skill_entry" ]] || continue
  base_dir=$(basename "$skill_entry")
  [[ "$base_dir" == "aped-skills" ]] && continue  # non-routable bucket
  if [[ -d "$skill_entry" ]]; then
    skill_md="$skill_entry/SKILL.md"
    [[ -f "$skill_md" ]] || continue
    base="$base_dir/SKILL.md"
    # Body files = SKILL.md + workflow.md + every steps/*.md.
    BODY_FILES=("$skill_md")
    [[ -f "$skill_entry/workflow.md" ]] && BODY_FILES+=("$skill_entry/workflow.md")
    if [[ -d "$skill_entry/steps" ]]; then
      while IFS= read -r step_file; do
        BODY_FILES+=("$step_file")
      done < <(find "$skill_entry/steps" -name '*.md' -type f 2>/dev/null | sort)
    fi
  elif [[ -f "$skill_entry" && "$skill_entry" == *.md ]]; then
    skill_md="$skill_entry"
    base=$(basename "$skill_entry")
    BODY_FILES=("$skill_md")
  else
    continue
  fi

  # Description frontmatter — only on the entry file (SKILL.md or flat .md).
  DESC_COUNT=$({ grep -E '^description:' "$skill_md" 2>/dev/null || true; } | wc -l | tr -d ' ')
  if [[ "$DESC_COUNT" -lt 1 ]]; then
    echo "FAIL: $base missing 'description:' frontmatter"
    ERRORS=$((ERRORS + 1))
  fi

  # Self-ref scan walks the full body (SKILL.md + workflow.md + steps).
  # Slash command stubs were retired in 4.0.0; only inline guidance like
  # "run aped-X" is allowed (no leading slash on the skill name).
  for body in "${BODY_FILES[@]}"; do
    SELF_REF=$({ grep -E '^\s*/aped-' "$body" 2>/dev/null || true; } | wc -l | tr -d ' ')
    if [[ "$SELF_REF" -gt 0 ]]; then
      rel=${body#src/templates/skills/}
      echo "FAIL: $rel has /aped- self-reference (slash commands retired in 4.0.0)"
      ERRORS=$((ERRORS + 1))
    fi
  done
done

# ── 3. README skill counter matches actual ──────────────────────────
# Count both flat aped-X.md (legacy) and aped-X/SKILL.md (6.0.0+).
SKILL_COUNT_FLAT=$({ ls src/templates/skills/aped-*.md 2>/dev/null || true; } | wc -l | tr -d ' ')
SKILL_COUNT_DIR=$({ find src/templates/skills -mindepth 2 -maxdepth 2 -name SKILL.md 2>/dev/null || true; } | { grep -v '/aped-skills/' || true; } | wc -l | tr -d ' ')
SKILL_COUNT=$((SKILL_COUNT_FLAT + SKILL_COUNT_DIR))
# Loosened regex: accept "**N skills**", "**N** skills", "N skills", or "N\nskills".
# Pick the first integer that precedes the word "skills" in README.md.
README_COUNT=$({ grep -oE '[0-9]+[[:space:]]*\**[[:space:]]*skills' README.md || true; } | head -1 | { grep -oE '[0-9]+' || echo 0; } | head -1)
README_COUNT=${README_COUNT:-0}
if [[ "$SKILL_COUNT" != "$README_COUNT" ]]; then
  echo "FAIL: README claims $README_COUNT skills, actual count is $SKILL_COUNT"
  ERRORS=$((ERRORS + 1))
fi

# ── 4. SECURITY.md supported version matches current minor ──────────
# Loosened: tolerate any whitespace between the table pipe and the version,
# so prettier-reflowed tables don't false-fail.
CURRENT_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "0.0.0")
CURRENT_MINOR="${CURRENT_VERSION%.*}"
SEC_HAS_MINOR=$({ grep -E "^\|[[:space:]]+${CURRENT_MINOR}\.x" SECURITY.md 2>/dev/null || true; } | wc -l | tr -d ' ')
if [[ "$SEC_HAS_MINOR" -lt 1 ]]; then
  echo "FAIL: SECURITY.md does not list ${CURRENT_MINOR}.x as supported"
  ERRORS=$((ERRORS + 1))
fi

# ── 5. Docs freshness — the 7 docs from feedback_docs_before_release ──
# Per CLAUDE.md row 5: all 7 docs/ files must be aligned with the code
# before any tag+release. We can't verify "freshness" perfectly, but we
# CAN catch the structural smells the lived-experience hit:
#   - skills-classification.md must cite a count matching SKILL_COUNT
#   - aped-quickstart.md must reference a version >= the current minor
#   - missing files = blocker
REQUIRED_DOCS=(
  "docs/aped-quickstart.md"
  "docs/aped-phases.md"
  "docs/aped-workflow.md"
  "docs/aped-personas.md"
  "docs/skills-classification.md"
  "docs/TROUBLESHOOTING.md"
  "docs/dev/discovery-pattern.md"
)
for doc in "${REQUIRED_DOCS[@]}"; do
  if [[ ! -f "$doc" ]]; then
    echo "FAIL: required doc missing: $doc"
    ERRORS=$((ERRORS + 1))
  fi
done

# 5a. Skill-count parity across the docs that introduce APED with a
# headline count. The first `N skills?` match in each doc is treated as
# the LEAD claim and must equal SKILL_COUNT; deeper mentions (historical
# sections like "### 25 skills, slash commands removed in 4.0.0") are
# intentionally not checked — they reference prior versions. Caught the
# `35 skills` drift in aped-quickstart.md that survived 7 days post-6.9.0
# because no test enforced it.
DOCS_WITH_SKILL_COUNT=(
  "docs/aped-quickstart.md"
  "docs/aped-personas.md"
  "docs/skills-classification.md"
  "docs/dev/discovery-pattern.md"
)
for doc in "${DOCS_WITH_SKILL_COUNT[@]}"; do
  [[ -f "$doc" ]] || continue
  DOC_COUNT=$({ grep -oE '\b[0-9]+[[:space:]]*\**[[:space:]]*skills?\b' "$doc" 2>/dev/null || true; } \
    | head -1 | { grep -oE '[0-9]+' || echo 0; } | head -1)
  DOC_COUNT=${DOC_COUNT:-0}
  if [[ "$DOC_COUNT" -gt 0 && "$DOC_COUNT" != "$SKILL_COUNT" ]]; then
    echo "FAIL: $doc cites $DOC_COUNT skills, actual count is $SKILL_COUNT"
    ERRORS=$((ERRORS + 1))
  fi
done

# 5b. aped-quickstart.md must mention a version >= current minor.
# Heuristic: the doc cites `vX.Y` or `X.Y.Z` somewhere. We check that the
# *highest* version cited is >= the current minor. Catches the lived case
# where quickstart "stopped at v4.1.2" while code was on v5.5.
if [[ -f docs/aped-quickstart.md ]]; then
  HIGHEST_DOC_MINOR=$({ grep -oE 'v?[0-9]+\.[0-9]+' docs/aped-quickstart.md || true; } \
    | sed 's/^v//' \
    | sort -t. -k1,1n -k2,2n \
    | tail -1)
  if [[ -n "$HIGHEST_DOC_MINOR" ]]; then
    # Compare HIGHEST_DOC_MINOR vs CURRENT_MINOR as MAJOR.MINOR ints.
    doc_maj=${HIGHEST_DOC_MINOR%%.*}
    doc_min=${HIGHEST_DOC_MINOR##*.}
    cur_maj=${CURRENT_MINOR%%.*}
    cur_min=${CURRENT_MINOR##*.}
    if (( doc_maj < cur_maj || (doc_maj == cur_maj && doc_min < cur_min) )); then
      echo "WARN: docs/aped-quickstart.md highest version ref is v${HIGHEST_DOC_MINOR}, current minor is ${CURRENT_MINOR} — docs may be stale"
      WARNINGS=$((WARNINGS + 1))
    fi
  fi
fi

# 5c. TROUBLESHOOTING.md must be non-empty.
if [[ -f docs/TROUBLESHOOTING.md ]]; then
  troubleshoot_lines=$(wc -l < docs/TROUBLESHOOTING.md | tr -d ' ')
  if [[ "$troubleshoot_lines" -lt 20 ]]; then
    echo "WARN: docs/TROUBLESHOOTING.md has only $troubleshoot_lines lines — likely a stub"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# ── Result ───────────────────────────────────────────────────────────
if [[ "$ERRORS" -gt 0 || "$WARNINGS" -gt 0 ]]; then
  echo ""
fi
if [[ "$ERRORS" -gt 0 ]]; then
  echo "PRE-MERGE CHECKLIST: $ERRORS error(s), $WARNINGS warning(s)"
  exit 1
fi
if [[ "$WARNINGS" -gt 0 ]]; then
  echo "PRE-MERGE CHECKLIST: 0 errors, $WARNINGS warning(s) — review and proceed"
fi
echo "PRE-MERGE CHECKLIST: all checks passed ✓"
exit 0
