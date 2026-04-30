#!/usr/bin/env bash
# Release preparation script. Validates preconditions, bumps version, rewrites
# CHANGELOG, then prints the manual steps for the user to execute one by one.
# Per feedback_review_before_push: the script PREPARES, the user APPROVES.
set -euo pipefail

# ── Guard rails ──────────────────────────────────────────────────────
[[ -f package.json && -f CHANGELOG.md ]] || { echo "ERROR: must run from packages/create-aped/"; exit 1; }
git diff --quiet || { echo "ERROR: working tree dirty — commit or stash first"; exit 1; }
[[ "$(git rev-parse --abbrev-ref HEAD)" == "main" ]] || { echo "ERROR: must be on main"; exit 1; }
git fetch origin main --quiet
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
[[ "$LOCAL" == "$REMOTE" ]] || { echo "ERROR: main not in sync with origin/main — git pull --ff-only first"; exit 1; }

BUMP="${1:-}"
[[ "$BUMP" =~ ^(patch|minor|major)$ ]] || { echo "USAGE: bash scripts/cut-release.sh patch|minor|major"; exit 1; }

# ── Pre-merge checklist (automated) ──────────────────────────────────
if [[ -f scripts/check-pre-merge.sh ]]; then
  bash scripts/check-pre-merge.sh || { echo "ERROR: pre-merge checklist failed — fix issues above"; exit 1; }
fi

# ── Read version FRESH (§5.1 lesson #1) ──────────────────────────────
CURRENT=$(node -p "require('./package.json').version")
TARGET=$(node -e "
  const [a,b,c] = process.argv[1].split('.').map(Number);
  const k = process.argv[2];
  if (k === 'major') console.log((a+1)+'.0.0');
  else if (k === 'minor') console.log(a+'.'+(b+1)+'.0');
  else console.log(a+'.'+b+'.'+(c+1));
" "$CURRENT" "$BUMP")

# ── Validate [Unreleased] non-empty ──────────────────────────────────
UNRELEASED_BODY=$({ awk '/^## \[Unreleased\]/{flag=1;next} /^## \[/{flag=0} flag' CHANGELOG.md || true; } | { grep -v '^[[:space:]]*$' || true; } | wc -l | tr -d ' ')
[[ "$UNRELEASED_BODY" -gt 0 ]] || { echo "ERROR: [Unreleased] section is empty — nothing to release"; exit 1; }

# ── Validate SECURITY.md ─────────────────────────────────────────────
MINOR="${TARGET%.*}"
{ grep -qE "^\| ${MINOR}\.x" SECURITY.md 2>/dev/null; } || {
  echo "ERROR: SECURITY.md does not list ${MINOR}.x as supported (update Supported Versions table)"
  exit 1
}

# ── Validate README skill counter ────────────────────────────────────
SKILL_COUNT=$({ ls src/templates/skills/aped-*.md 2>/dev/null || true; } | wc -l | tr -d ' ')
README_COUNT=$({ grep -oE '\*\*[0-9]+ skills\*\*' README.md || true; } | head -1 | { grep -oE '[0-9]+' || echo 0; })
[[ "$SKILL_COUNT" == "$README_COUNT" ]] || {
  echo "ERROR: README claims ${README_COUNT} skills, ls counts ${SKILL_COUNT}"
  exit 1
}

# ── Pre-flight summary ───────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════"
echo "  RELEASE PLAN"
echo "═══════════════════════════════════════════════"
echo "  current: $CURRENT  →  target: $TARGET  ($BUMP)"
echo "  unreleased entries: $UNRELEASED_BODY non-blank lines"
echo "  skills: $SKILL_COUNT  /  README: $README_COUNT  ✓"
echo "  SECURITY.md: ${MINOR}.x  ✓"
echo "═══════════════════════════════════════════════"
echo ""
echo "PRE-FLIGHT (verify each before typing 'yes'):"
echo "  [auto] all PRs for this release merged into main"
echo "  [auto] working dir is packages/create-aped/"
echo "  [auto] git status clean"
echo "  [auto] git pull --ff-only in sync"
echo ""
read -rp "Type 'yes' to bump package.json + rewrite CHANGELOG: " ANS
[[ "$ANS" == "yes" ]] || { echo "ABORTED"; exit 1; }

# ── Bump package.json ────────────────────────────────────────────────
npm version --no-git-tag-version "$BUMP" > /dev/null
echo "✓ package.json bumped to $TARGET"

# ── Rewrite CHANGELOG ────────────────────────────────────────────────
DATE=$(date -u +%Y-%m-%d)
awk -v ver="$TARGET" -v date="$DATE" '
  /^## \[Unreleased\]/ {
    print
    print ""
    printf "## [%s] - %s\n", ver, date
    next
  }
  { print }
' CHANGELOG.md > CHANGELOG.tmp && mv CHANGELOG.tmp CHANGELOG.md
echo "✓ CHANGELOG.md: [Unreleased] → [$TARGET] - $DATE"

# ── Show diff ────────────────────────────────────────────────────────
echo ""
echo "── Diff preview ──"
git diff --stat
echo ""
git diff package.json CHANGELOG.md
echo ""

# ── Print manual steps ───────────────────────────────────────────────
echo "═══════════════════════════════════════════════"
echo "  MANUAL STEPS (execute one at a time)"
echo "═══════════════════════════════════════════════"
echo ""
echo "  1. Review the diff above, then:"
echo "     git add package.json CHANGELOG.md"
echo "     git commit -m 'chore: release $TARGET'"
echo ""
echo "  2. Tag:"
echo "     git tag v$TARGET"
echo ""
echo "  3. Push main:"
echo "     git push"
echo ""
echo "  4. Push tag:"
echo "     git push origin v$TARGET"
echo ""
echo "  5. Trigger release workflow:"
echo "     gh workflow run release.yml -f tag=v$TARGET -f publish_to_npm=true"
echo ""
echo "═══════════════════════════════════════════════"
