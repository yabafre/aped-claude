export function scripts(c) {
  const a = c.apedDir;
  const o = c.outputDir;
  return [
    {
      path: `${a}/aped-a/scripts/validate-brief.sh`,
      executable: true,
      content: `#!/usr/bin/env bash
# Validate product brief has all required sections
# Usage: validate-brief.sh <brief-file>
# Exit 0 if valid, exit 1 with missing sections listed

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <brief-file>"
  exit 1
fi

FILE="$1"

if [[ ! -f "$FILE" ]]; then
  echo "ERROR: File not found: $FILE"
  exit 1
fi

REQUIRED_SECTIONS=(
  "## Executive Summary"
  "## Core Vision"
  "## Target Users"
  "## Success Metrics"
  "## MVP Scope"
)

MISSING=()

for section in "\${REQUIRED_SECTIONS[@]}"; do
  if ! grep -q "$section" "$FILE"; then
    MISSING+=("$section")
  fi
done

if [[ \${#MISSING[@]} -gt 0 ]]; then
  echo "VALIDATION FAILED — Missing sections:"
  for m in "\${MISSING[@]}"; do
    echo "  - $m"
  done
  exit 1
fi

echo "VALIDATION PASSED — All required sections present"
exit 0
`,
    },
    {
      path: `${a}/aped-p/scripts/validate-prd.sh`,
      executable: true,
      content: `#!/usr/bin/env bash
# Validate PRD has required sections, FR format, and no anti-patterns
# Usage: validate-prd.sh <prd-file>
# Exit 0 if valid, exit 1 with issues listed

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <prd-file>"
  exit 1
fi

FILE="$1"

if [[ ! -f "$FILE" ]]; then
  echo "ERROR: File not found: $FILE"
  exit 1
fi

ISSUES=()

# Check required sections
REQUIRED_SECTIONS=(
  "## Executive Summary"
  "## Success Criteria"
  "## Product Scope"
  "## User Journeys"
  "## Functional Requirements"
  "## Non-Functional Requirements"
)

for section in "\${REQUIRED_SECTIONS[@]}"; do
  if ! grep -q "$section" "$FILE"; then
    ISSUES+=("MISSING SECTION: $section")
  fi
done

# Check FR format — accepts: FR1:, - FR1:, **FR1:**, * FR1:, etc.
FR_LINES=$(grep -E '(^|[-*>[:space:]])\\*{0,2}FR[0-9]+\\*{0,2}\\s*:' "$FILE" 2>/dev/null || true)
FR_COUNT=0
if [[ -n "$FR_LINES" ]]; then
  FR_COUNT=$(echo "$FR_LINES" | wc -l | tr -d ' ')
fi

if [[ "$FR_COUNT" -lt 10 ]]; then
  ISSUES+=("FR COUNT TOO LOW: Found $FR_COUNT FRs (minimum 10)")
fi

if [[ "$FR_COUNT" -gt 80 ]]; then
  ISSUES+=("FR COUNT TOO HIGH: Found $FR_COUNT FRs (maximum 80)")
fi

# Check for anti-pattern words in FR lines
ANTI_PATTERNS=("easy" "intuitive" "fast" "responsive" "simple" "multiple" "several" "various")

for pattern in "\${ANTI_PATTERNS[@]}"; do
  MATCHES=$(grep -inE 'FR[0-9]+.*:.*\\b\${pattern}\\b' "$FILE" 2>/dev/null || true)
  if [[ -n "$MATCHES" ]]; then
    ISSUES+=("ANTI-PATTERN '$pattern' found in FR: $MATCHES")
  fi
done

# Report results
if [[ \${#ISSUES[@]} -gt 0 ]]; then
  echo "VALIDATION FAILED — Issues found:"
  for issue in "\${ISSUES[@]}"; do
    echo "  - $issue"
  done
  exit 1
fi

echo "VALIDATION PASSED — PRD is valid ($FR_COUNT FRs, all sections present, no anti-patterns)"
exit 0
`,
    },
    {
      path: `${a}/aped-e/scripts/validate-coverage.sh`,
      executable: true,
      content: `#!/usr/bin/env bash
# Validate that all FRs from PRD are covered in epics
# Usage: validate-coverage.sh <epics-file> <prd-file>
# Exit 0 if all covered, exit 1 with missing FRs listed

set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <epics-file> <prd-file>"
  exit 1
fi

EPICS_FILE="$1"
PRD_FILE="$2"

if [[ ! -f "$EPICS_FILE" ]]; then
  echo "ERROR: Epics file not found: $EPICS_FILE"
  exit 1
fi

if [[ ! -f "$PRD_FILE" ]]; then
  echo "ERROR: PRD file not found: $PRD_FILE"
  exit 1
fi

# Extract FR numbers
PRD_FRS=$(grep -oE 'FR[0-9]+' "$PRD_FILE" | sort -u || true)
EPIC_FRS=$(grep -oE 'FR[0-9]+' "$EPICS_FILE" | sort -u || true)

if [[ -z "$PRD_FRS" ]]; then
  echo "WARNING: No FRs found in PRD file"
  exit 0
fi

# Find missing FRs
MISSING=()
for fr in $PRD_FRS; do
  [[ -z "$fr" ]] && continue
  if ! echo "$EPIC_FRS" | grep -q "^\${fr}$"; then
    MISSING+=("$fr")
  fi
done

PRD_COUNT=$(echo "$PRD_FRS" | grep -c . || echo 0)
EPIC_COUNT=$(echo "$EPIC_FRS" | grep -c . || echo 0)

if [[ \${#MISSING[@]} -gt 0 ]]; then
  echo "COVERAGE VALIDATION FAILED"
  echo "PRD FRs: $PRD_COUNT | Epics FRs: $EPIC_COUNT"
  echo "Missing FRs (in PRD but not in epics):"
  for fr in "\${MISSING[@]}"; do
    echo "  - $fr"
  done
  exit 1
fi

echo "COVERAGE VALIDATION PASSED — All $PRD_COUNT FRs covered in epics"
exit 0
`,
    },
    {
      path: `${a}/aped-d/scripts/run-tests.sh`,
      executable: true,
      content: `#!/usr/bin/env bash
# Auto-detect test framework and run tests
# Usage: run-tests.sh [test-path]
# Exit code matches the test runner's exit code

set -euo pipefail

TEST_PATH="\${1:-}"

# Auto-detect test framework
if [[ -f "package.json" ]]; then
  echo "Detected: Node.js project"
  if grep -q '"vitest"' package.json 2>/dev/null; then
    echo "Runner: vitest"
    npx vitest run \${TEST_PATH:+"$TEST_PATH"}
  elif grep -q '"jest"' package.json 2>/dev/null; then
    echo "Runner: jest"
    npx jest \${TEST_PATH:+"$TEST_PATH"}
  else
    echo "Runner: npm test"
    npm test \${TEST_PATH:+-- "$TEST_PATH"}
  fi
elif [[ -f "setup.py" ]] || [[ -f "pyproject.toml" ]] || [[ -f "setup.cfg" ]]; then
  echo "Detected: Python project"
  if [[ -n "$TEST_PATH" ]]; then
    python -m pytest "$TEST_PATH" -v
  else
    python -m pytest -v
  fi
elif [[ -f "Cargo.toml" ]]; then
  echo "Detected: Rust project"
  if [[ -n "$TEST_PATH" ]]; then
    cargo test "$TEST_PATH"
  else
    cargo test
  fi
elif [[ -f "go.mod" ]]; then
  echo "Detected: Go project"
  if [[ -n "$TEST_PATH" ]]; then
    go test "$TEST_PATH" -v
  else
    go test ./... -v
  fi
else
  echo "ERROR: No recognized test framework found"
  echo "Supported: package.json (Node), setup.py/pyproject.toml (Python), Cargo.toml (Rust), go.mod (Go)"
  exit 1
fi
`,
    },
    {
      path: `${a}/aped-r/scripts/git-audit.sh`,
      executable: true,
      content: `#!/usr/bin/env bash
# Compare git changes vs story file list
# Usage: git-audit.sh <story-file> [commits-back]
# Exit 0 if clean, exit 1 if HIGH severity discrepancies

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <story-file> [commits-back]"
  exit 1
fi

STORY_FILE="$1"
COMMITS_BACK="\${2:-10}"

if [[ ! -f "$STORY_FILE" ]]; then
  echo "ERROR: Story file not found: $STORY_FILE"
  exit 1
fi

# Check if we're in a git repo
if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  echo "WARNING: Not a git repository. Skipping git audit."
  exit 0
fi

# Extract file list from story's Dev Agent Record section
STORY_FILES=$(sed -n '/^### File List/,/^##/p' "$STORY_FILE" | grep -E '^\\s*[-*]' | sed 's/^[[:space:]]*[-*][[:space:]]*//' | sort -u)

# Get git changed files
GIT_FILES=$(git diff --name-only "HEAD~\${COMMITS_BACK}" HEAD 2>/dev/null | sort -u)

if [[ -z "$GIT_FILES" ]]; then
  echo "WARNING: No git changes found in last $COMMITS_BACK commits"
  exit 0
fi

# Compare
IN_GIT_NOT_STORY=()
IN_STORY_NOT_GIT=()

while IFS= read -r file; do
  if [[ -n "$file" ]] && ! echo "$STORY_FILES" | grep -qF "$file"; then
    IN_GIT_NOT_STORY+=("$file")
  fi
done <<< "$GIT_FILES"

while IFS= read -r file; do
  if [[ -n "$file" ]] && ! echo "$GIT_FILES" | grep -qF "$file"; then
    IN_STORY_NOT_GIT+=("$file")
  fi
done <<< "$STORY_FILES"

# Report
echo "=== GIT AUDIT REPORT ==="
echo "Story: $STORY_FILE"
echo "Git range: HEAD~\${COMMITS_BACK}..HEAD"
echo ""

HAS_ISSUES=false

if [[ \${#IN_GIT_NOT_STORY[@]} -gt 0 ]]; then
  echo "[MEDIUM] Files changed in git but NOT listed in story:"
  for f in "\${IN_GIT_NOT_STORY[@]}"; do
    echo "  - $f"
  done
  echo ""
  HAS_ISSUES=true
fi

if [[ \${#IN_STORY_NOT_GIT[@]} -gt 0 ]]; then
  echo "[HIGH] Files listed in story but NO git changes:"
  for f in "\${IN_STORY_NOT_GIT[@]}"; do
    echo "  - $f"
  done
  echo ""
  HAS_ISSUES=true
fi

if [[ "$HAS_ISSUES" == "false" ]]; then
  echo "No discrepancies found. Git changes match story file list."
  exit 0
fi

# Exit 1 if HIGH severity items found
if [[ \${#IN_STORY_NOT_GIT[@]} -gt 0 ]]; then
  exit 1
fi

exit 0
`,
    },
    {
      path: `${a}/aped-ux/scripts/validate-ux.sh`,
      executable: true,
      content: `#!/usr/bin/env bash
# Validate UX design spec completeness
# Usage: validate-ux.sh <ux-dir>
# Exit 0 if valid, exit 1 with missing items listed

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <ux-directory>"
  exit 1
fi

UX_DIR="$1"

if [[ ! -d "$UX_DIR" ]]; then
  echo "ERROR: Directory not found: $UX_DIR"
  exit 1
fi

ISSUES=()

# Check required output files
REQUIRED_FILES=(
  "design-spec.md"
  "screen-inventory.md"
  "components.md"
  "flows.md"
)

for file in "\${REQUIRED_FILES[@]}"; do
  if [[ ! -f "$UX_DIR/$file" ]]; then
    ISSUES+=("MISSING FILE: $UX_DIR/$file")
  fi
done

# Check design-spec.md has required sections
if [[ -f "$UX_DIR/design-spec.md" ]]; then
  SPEC_SECTIONS=(
    "## Tech Stack"
    "## Architecture"
    "## Conventions"
    "## Dependencies"
  )

  # Reuse pattern: check for sections about design tokens and UI library
  if ! grep -q "color\\|Color\\|palette\\|token" "$UX_DIR/design-spec.md" 2>/dev/null; then
    ISSUES+=("MISSING CONTENT: design-spec.md has no color/token definitions")
  fi

  if ! grep -q "typography\\|Typography\\|font\\|Font" "$UX_DIR/design-spec.md" 2>/dev/null; then
    ISSUES+=("MISSING CONTENT: design-spec.md has no typography definitions")
  fi
fi

# Check screen-inventory.md has content
if [[ -f "$UX_DIR/screen-inventory.md" ]]; then
  SCREEN_COUNT=$(grep -cE '^\\|.*\\|.*\\|' "$UX_DIR/screen-inventory.md" 2>/dev/null || echo 0)
  if [[ "$SCREEN_COUNT" -lt 3 ]]; then
    ISSUES+=("LOW SCREEN COUNT: Found $SCREEN_COUNT screens (expected at least 3)")
  fi
fi

# Check components.md has component entries
if [[ -f "$UX_DIR/components.md" ]]; then
  COMP_COUNT=$(grep -cE '^#{2,3} ' "$UX_DIR/components.md" 2>/dev/null || echo 0)
  if [[ "$COMP_COUNT" -lt 3 ]]; then
    ISSUES+=("LOW COMPONENT COUNT: Found $COMP_COUNT components (expected at least 3)")
  fi
fi

# Check preview app exists
PREVIEW_DIR="\${UX_DIR}-preview"
if [[ -d "$PREVIEW_DIR" ]]; then
  if [[ ! -f "$PREVIEW_DIR/package.json" ]]; then
    ISSUES+=("MISSING: Preview app has no package.json")
  fi
  if [[ ! -d "$PREVIEW_DIR/src" ]]; then
    ISSUES+=("MISSING: Preview app has no src/ directory")
  fi
else
  ISSUES+=("WARNING: No preview app at $PREVIEW_DIR (optional but recommended)")
fi

# Report
if [[ \${#ISSUES[@]} -gt 0 ]]; then
  echo "UX VALIDATION FAILED — Issues found:"
  for issue in "\${ISSUES[@]}"; do
    echo "  - $issue"
  done
  exit 1
fi

echo "UX VALIDATION PASSED — All required files and content present"
exit 0
`,
    },
  ];
}
