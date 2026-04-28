export function scripts(c) {
  const a = c.apedDir;
  const o = c.outputDir;
  return [
    {
      path: `${a}/aped-analyze/scripts/validate-brief.sh`,
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
      path: `${a}/aped-prd/scripts/validate-prd.sh`,
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
      path: `${a}/aped-epics/scripts/validate-coverage.sh`,
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
      path: `${a}/aped-dev/scripts/run-tests.sh`,
      executable: true,
      content: `#!/usr/bin/env bash
# Auto-detect test framework and run tests, caching the exit code.
#
# Usage: run-tests.sh [test-path]
# Exit code matches the test runner's exit code.
#
# Side effect: writes the exit code to ${a}/.last-test-exit (relative to
# cwd) so /aped-lead's check-auto-approve.sh dev-done can verify the most
# recent run passed without re-executing the suite. Skipped silently if
# ${a}/ doesn't exist (running outside an APED project).

# Note: -e intentionally OMITTED so a failing test runner doesn't bypass
# the cache write below. -u and pipefail still apply.
set -uo pipefail

TEST_PATH="\${1:-}"

CMD=()
if [[ -f "package.json" ]]; then
  echo "Detected: Node.js project"
  if grep -q '"vitest"' package.json 2>/dev/null; then
    echo "Runner: vitest"
    CMD=(npx vitest run)
    [[ -n "\$TEST_PATH" ]] && CMD+=("\$TEST_PATH")
  elif grep -q '"jest"' package.json 2>/dev/null; then
    echo "Runner: jest"
    CMD=(npx jest)
    [[ -n "\$TEST_PATH" ]] && CMD+=("\$TEST_PATH")
  else
    echo "Runner: npm test"
    CMD=(npm test)
    [[ -n "\$TEST_PATH" ]] && CMD+=(-- "\$TEST_PATH")
  fi
elif [[ -f "setup.py" ]] || [[ -f "pyproject.toml" ]] || [[ -f "setup.cfg" ]]; then
  echo "Detected: Python project"
  CMD=(python -m pytest -v)
  [[ -n "\$TEST_PATH" ]] && CMD+=("\$TEST_PATH")
elif [[ -f "Cargo.toml" ]]; then
  echo "Detected: Rust project"
  if [[ -n "\$TEST_PATH" ]]; then
    CMD=(cargo test "\$TEST_PATH")
  else
    CMD=(cargo test)
  fi
elif [[ -f "go.mod" ]]; then
  echo "Detected: Go project"
  if [[ -n "\$TEST_PATH" ]]; then
    CMD=(go test "\$TEST_PATH" -v)
  else
    CMD=(go test ./... -v)
  fi
else
  echo "ERROR: No recognized test framework found"
  echo "Supported: package.json (Node), setup.py/pyproject.toml (Python), Cargo.toml (Rust), go.mod (Go)"
  exit 1
fi

"\${CMD[@]}"
EXIT=\$?

if [[ -d "${a}" ]]; then
  echo "\$EXIT" > "${a}/.last-test-exit" 2>/dev/null || true
fi

exit \$EXIT
`,
    },
    {
      path: `${a}/aped-review/scripts/git-audit.sh`,
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
    // ── Artefact placeholder lint (reusable across artefact-producing skills) ─
    {
      path: `${a}/scripts/lint-placeholders.sh`,
      executable: true,
      content: `#!/usr/bin/env bash
# APED placeholder lint — checks an artefact file for unmistakable
# placeholder strings that downstream skills shouldn't have to interpret.
#
# Usage: lint-placeholders.sh <file>
# Exit:  0 = clean, 1 = hits found, 2 = file or config error.
# Stdout (on hits): "<file>:<line>: <RULE_ID>: <matched-line>"
#
# Mustache tokens ({{var}} and {var}) are scrubbed before scanning so
# they never trip the lint. Lone ellipsis on its own line or as a table
# cell is flagged. Disabled when config.yaml has
# placeholder_lint.enabled: false.

set -u
set -o pipefail

if [[ \$# -ne 1 ]]; then
  echo "Usage: \$0 <file>" >&2
  exit 2
fi

FILE="\$1"

if [[ ! -f "\$FILE" ]]; then
  echo "lint-placeholders: file not found: \$FILE" >&2
  exit 2
fi

PROJECT_ROOT="\${CLAUDE_PROJECT_DIR:-\$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
CONFIG_FILE=""
for candidate in "\$PROJECT_ROOT/${a}/config.yaml" "\$PROJECT_ROOT/.aped/config.yaml"; do
  if [[ -f "\$candidate" ]]; then CONFIG_FILE="\$candidate"; break; fi
done

# Kill-switch: \`placeholder_lint: { enabled: false }\` in config.yaml means
# silent exit 0 regardless of file contents.
if [[ -n "\$CONFIG_FILE" ]]; then
  # Match the line under \`placeholder_lint:\` block. We can't rely on yq
  # (not always present) so use a 2-line awk window.
  # Anchored on the exact key (avoids matching siblings like
  # placeholder_lint_legacy:) and only accepts \`enabled:\` at exactly
  # 2-space indent (the canonical YAML child level), so deeply-nested
  # keys (e.g. placeholder_lint.rules.enabled) cannot poison the kill
  # switch. Trailing \`# comment\` is stripped before comparison.
  ENABLED=\$(awk '
    /^placeholder_lint:[[:space:]]*\$/ { in_block=1; next }
    in_block && /^[^[:space:]]/ { in_block=0 }
    in_block && /^  enabled:/ {
      sub(/^  enabled:[[:space:]]*/, "")
      sub(/[ \\t]*#.*\$/, "")
      gsub(/["'\\'' ]/, "")
      print
      exit
    }
  ' "\$CONFIG_FILE" 2>/dev/null || true)
  if [[ "\$ENABLED" == "false" ]]; then
    exit 0
  fi
fi

# Scrub mustache tokens: {{var}} and {var} where the inner content is plain
# alphanumeric+underscore. Math/code expressions like {x|x>0} are left alone.
SCRUBBED=\$(mktemp 2>/dev/null || echo "/tmp/aped-lint-\$\$")
trap 'rm -f "\$SCRUBBED"' EXIT
sed -E 's/\\{\\{[A-Za-z0-9_]+\\}\\}//g; s/\\{[A-Za-z0-9_]+\\}//g' "\$FILE" > "\$SCRUBBED"

HITS=""

emit_match() {
  # \$1 = rule_id, \$2 = grep output (lineno:content)
  local rule_id="\$1" grep_output="\$2" line lineno content
  while IFS= read -r line; do
    [[ -z "\$line" ]] && continue
    lineno=\$(printf '%s' "\$line" | cut -d: -f1)
    content=\$(printf '%s' "\$line" | cut -d: -f2-)
    HITS="\${HITS}\${FILE}:\${lineno}: \${rule_id}: \${content}
"
  done <<< "\$grep_output"
}

scan_cs() { # case-sensitive
  local matches
  matches=\$(grep -nE "\$2" "\$SCRUBBED" 2>/dev/null || true)
  [[ -n "\$matches" ]] && emit_match "\$1" "\$matches"
}

scan_ci() { # case-insensitive
  local matches
  matches=\$(grep -niE "\$2" "\$SCRUBBED" 2>/dev/null || true)
  [[ -n "\$matches" ]] && emit_match "\$1" "\$matches"
}

# Banned phrases. Order matters only for output stability.
scan_cs TBD                  '\\bTBD\\b'
scan_cs TODO                 '\\bTODO\\b'
scan_cs FIXME                '\\bFIXME\\b'
scan_cs XXX                  '\\bXXX\\b'
scan_ci PLACEHOLDER_TAG      '<placeholder>'
scan_ci PLACEHOLDER_HTML     '<!-- placeholder'
scan_ci ADD_ERROR_HANDLING   'add appropriate error handling'
scan_ci SIMILAR_TO_STORY     'similar to story [A-Za-z0-9-]'
scan_ci SIMILAR_TO_TASK      'similar to task [A-Za-z0-9-]'
scan_ci IMPLEMENT_LATER      'implement later'
scan_ci TO_BE_DEFINED        'to be defined'
scan_ci TO_BE_DETERMINED     'to be determined'

# Lone-ellipsis: line is just "..." (3+ dots) or appears as a table cell.
LONE=\$(grep -nE '^[[:space:]]*\\.{3,}[[:space:]]*\$|\\|[[:space:]]*\\.{3,}[[:space:]]*\\|' "\$SCRUBBED" 2>/dev/null || true)
[[ -n "\$LONE" ]] && emit_match LONE_ELLIPSIS "\$LONE"

if [[ -n "\$HITS" ]]; then
  printf '%s' "\$HITS"
  exit 1
fi

exit 0
`,
    },
    // ── Parallel Sprint helpers ────────────────────────────────────────────
    {
      path: `${a}/scripts/sprint-dispatch.sh`,
      executable: true,
      content: `#!/usr/bin/env bash
# APED sprint-dispatch — create a git worktree for a story so the user can
# launch a dedicated Claude Code session in it with /aped-dev.
#
# Usage: sprint-dispatch.sh <story-key> [<ticket-id>] [<base-ref>]
#
# <base-ref> is the git ref to cut the feature branch from. In sprint mode,
# the caller passes the sprint umbrella (e.g. "sprint/epic-1") so stories
# parent under it. In solo / classic mode, omit it — defaults to HEAD.
#
# Output: absolute path of the new worktree (stdout, line 1)
# Exit: 0 on success; 1 on user error; 2 on git error; 3 on concurrent dispatch;
#       4 if <base-ref> is given but does not resolve to a git ref.
#
# Concurrency: acquires a per-story mkdir lock at \${APED_DIR}/.sprint-locks/
# to prevent two /aped-sprint sessions from racing on the same story key
# (both calling \`git worktree add\` simultaneously and one failing cryptically).
# Stale locks older than SPRINT_LOCK_STALE_SECONDS (default 900s = 15min —
# worktree + initial push can be slow on large repos) are auto-reclaimed.

set -euo pipefail

SPRINT_LOCK_STALE_SECONDS=\${APED_SPRINT_LOCK_STALE_SECONDS:-900}
SPRINT_LOCK_TIMEOUT_SECONDS=\${APED_SPRINT_LOCK_TIMEOUT_SECONDS:-30}

if [[ \$# -lt 1 ]]; then
  echo "Usage: \$0 <story-key> [<ticket-id>] [<base-ref>]" >&2
  exit 1
fi

STORY_KEY="\$1"
TICKET_ID="\${2:-\$STORY_KEY}"
BASE_REF="\${3:-HEAD}"

PROJECT_ROOT="\${CLAUDE_PROJECT_DIR:-\$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
if [[ ! -d "\$PROJECT_ROOT/.git" ]] && ! git -C "\$PROJECT_ROOT" rev-parse --git-dir >/dev/null 2>&1; then
  echo "ERROR: \$PROJECT_ROOT is not inside a git repo" >&2
  exit 2
fi

# Compute target paths up-front so the lock is keyed on the actual contended
# resource (the worktree path), not on the story key. Two stories that share
# a TICKET_ID would resolve to the same WORKTREE_PATH and race in
# \`git worktree add\`; the old per-story-key lock missed that case.
PROJECT_NAME=\$(basename "\$PROJECT_ROOT")
WORKTREE_PATH="\$(dirname "\$PROJECT_ROOT")/\${PROJECT_NAME}-\${TICKET_ID}"
BRANCH_NAME="feature/\${TICKET_ID}-\${STORY_KEY}"

# ── Fleet-lock keyed on the worktree path (sanitised for filesystem use) ─
LOCK_KEY=\$(printf '%s' "\$WORKTREE_PATH" | tr '/ ' '__')
SPRINT_LOCK_DIR="\$PROJECT_ROOT/${a}/.sprint-locks/\$LOCK_KEY"
mkdir -p "\$(dirname "\$SPRINT_LOCK_DIR")"

mtime_age() {
  local target="\$1" now mtime
  now=\$(date +%s)
  mtime=\$(stat -c %Y "\$target" 2>/dev/null || stat -f %m "\$target" 2>/dev/null || echo "\$now")
  echo \$((now - mtime))
}

if [[ -d "\$SPRINT_LOCK_DIR" ]]; then
  age=\$(mtime_age "\$SPRINT_LOCK_DIR")
  if (( age > SPRINT_LOCK_STALE_SECONDS )); then
    echo "WARN: stale dispatch lock for \$WORKTREE_PATH (age \${age}s > \${SPRINT_LOCK_STALE_SECONDS}s) — previous dispatch likely crashed. Reclaiming." >&2
    rm -rf "\$SPRINT_LOCK_DIR"
  fi
fi

waited=0
until mkdir "\$SPRINT_LOCK_DIR" 2>/dev/null; do
  if (( waited >= SPRINT_LOCK_TIMEOUT_SECONDS * 10 )); then
    echo "ERROR: another /aped-sprint session is dispatching to \$WORKTREE_PATH (lock: \$SPRINT_LOCK_DIR). Wait for it to finish and retry, or remove the lock if you're certain it's stale." >&2
    exit 3
  fi
  sleep 0.1
  waited=\$((waited + 1))
done
# Release on any exit (success, error, signal). The "worktree path already
# exists" check below is the next safety net for replays.
trap "rm -rf '\$SPRINT_LOCK_DIR' 2>/dev/null || true" EXIT INT TERM

if [[ -d "\$WORKTREE_PATH" ]]; then
  echo "ERROR: worktree path already exists: \$WORKTREE_PATH" >&2
  exit 2
fi

cd "\$PROJECT_ROOT"

# Resolve base-ref up-front so a typo fails loud instead of silently
# branching from an unrelated commit.
if [[ "\$BASE_REF" != "HEAD" ]]; then
  if ! git rev-parse --verify "\$BASE_REF" >/dev/null 2>&1; then
    echo "ERROR: base-ref '\$BASE_REF' does not resolve. In sprint mode the umbrella must be created by /aped-sprint before dispatch." >&2
    exit 4
  fi
fi

if git rev-parse --verify "\$BRANCH_NAME" >/dev/null 2>&1; then
  git worktree add "\$WORKTREE_PATH" "\$BRANCH_NAME" >&2
else
  git worktree add -b "\$BRANCH_NAME" "\$WORKTREE_PATH" "\$BASE_REF" >&2
fi

mkdir -p "\$WORKTREE_PATH/${a}"
cat > "\$WORKTREE_PATH/${a}/WORKTREE" <<EOF
schema_version: 1
story_key: \$STORY_KEY
ticket: \$TICKET_ID
branch: \$BRANCH_NAME
project_root: \$PROJECT_ROOT
created_at: \$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF

bash "\$PROJECT_ROOT/${a}/scripts/log.sh" worktree_created \\
  story="\$STORY_KEY" ticket="\$TICKET_ID" branch="\$BRANCH_NAME" worktree="\$WORKTREE_PATH" \\
  2>/dev/null || true

printf '%s\\n' "\$WORKTREE_PATH"
`,
    },
    {
      path: `${a}/scripts/worktree-cleanup.sh`,
      executable: true,
      content: `#!/usr/bin/env bash
# APED worktree-cleanup — remove a worktree (and optionally its branch) once
# a story has been merged. Run from the main project root.
#
# Usage: worktree-cleanup.sh <worktree-path> [--delete-branch] [--yes-destroy]
#
# Safe by default: refuses to drop a worktree with uncommitted changes or
# stashes. The previous version silently re-tried with --force on the first
# failure, which is exactly how a half-finished branch's local-only files
# disappear (.env tweaks, debug logs, an unstaged migration). To opt into
# destructive removal, pass --yes-destroy explicitly.

set -euo pipefail

WORKTREE_PATH=""
DELETE_BRANCH=false
YES_DESTROY=false

while [[ \$# -gt 0 ]]; do
  case "\$1" in
    --delete-branch) DELETE_BRANCH=true; shift ;;
    --yes-destroy)   YES_DESTROY=true;   shift ;;
    --) shift; WORKTREE_PATH="\${1:-}"; shift; break ;;
    -*) echo "Unknown flag: \$1" >&2; exit 1 ;;
    *)
      if [[ -z "\$WORKTREE_PATH" ]]; then
        WORKTREE_PATH="\$1"
      else
        echo "Unexpected positional argument: \$1" >&2; exit 1
      fi
      shift
      ;;
  esac
done

[[ -n "\$WORKTREE_PATH" ]] || {
  echo "Usage: \$0 <worktree-path> [--delete-branch] [--yes-destroy]" >&2
  exit 1
}

if [[ ! -d "\$WORKTREE_PATH" ]]; then
  echo "No such worktree: \$WORKTREE_PATH" >&2
  exit 0
fi

BRANCH_NAME=""
if [[ -f "\$WORKTREE_PATH/${a}/WORKTREE" ]]; then
  BRANCH_NAME=\$(grep '^branch:' "\$WORKTREE_PATH/${a}/WORKTREE" | sed 's/.*:[[:space:]]*//')
fi

# Try a clean remove first.
if git worktree remove "\$WORKTREE_PATH" 2>/dev/null; then
  :
else
  # Diagnose what's holding the worktree before deciding.
  echo "Cannot remove cleanly — worktree has local state:" >&2
  echo "" >&2
  echo "Uncommitted changes (git status --porcelain):" >&2
  git -C "\$WORKTREE_PATH" status --porcelain | sed 's/^/  /' >&2 || true
  echo "" >&2
  echo "Stashes (git stash list):" >&2
  git -C "\$WORKTREE_PATH" stash list | sed 's/^/  /' >&2 || true
  echo "" >&2

  if [[ "\$YES_DESTROY" != "true" ]]; then
    echo "REFUSING to --force without --yes-destroy. Choose one:" >&2
    echo "  1. Commit/stash the work in the worktree, then re-run this script." >&2
    echo "  2. Re-run with --yes-destroy to discard the local state above." >&2
    exit 2
  fi

  echo "WARN: --yes-destroy specified — discarding the local state above." >&2
  git worktree remove --force "\$WORKTREE_PATH"
fi

if [[ "\$DELETE_BRANCH" == "true" && -n "\$BRANCH_NAME" ]]; then
  git branch -D "\$BRANCH_NAME" 2>&1 || echo "Branch \$BRANCH_NAME already gone or not fully merged"
fi

git worktree prune
echo "Cleaned up \$WORKTREE_PATH"
`,
    },
    {
      path: `${a}/scripts/log.sh`,
      executable: true,
      content: `#!/usr/bin/env bash
# APED log — append a structured event to the per-day sprint log.
#
# Usage: log.sh <event-type> [key=value ...]
# Example: log.sh worktree_created story_key=1-2 ticket=KON-83 worktree=/path
#
# Events are written as JSONL to {APED_DIR}/logs/sprint-YYYY-MM-DD.jsonl with
# a fixed envelope (ts, type, …) plus arbitrary key=value pairs. Log writes
# are line-atomic on POSIX as long as each JSONL line stays under PIPE_BUF
# (4 KiB on Linux/macOS) — true for all our events.
#
# **Best-effort**: if the log dir cannot be created or the write fails, emit
# a WARN to stderr and exit 0. Observability must never break the caller —
# /aped-sprint, /aped-ship et al. would silently fail otherwise.

set -uo pipefail

EVENT_TYPE="\${1:-}"
shift || true
[[ -n "\$EVENT_TYPE" ]] || { echo "log.sh: missing event type" >&2; exit 0; }

PROJECT_ROOT="\${CLAUDE_PROJECT_DIR:-\$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
LOG_DIR="\$PROJECT_ROOT/${a}/logs"
DAY=\$(date -u +%Y-%m-%d)
LOG_FILE="\$LOG_DIR/sprint-\${DAY}.jsonl"

mkdir -p "\$LOG_DIR" 2>/dev/null || { echo "WARN: cannot create \$LOG_DIR — skipping log" >&2; exit 0; }

now_iso() { date -u +%Y-%m-%dT%H:%M:%SZ; }

build_json() {
  local ts="\$(now_iso)" type="\$1"; shift
  if command -v jq >/dev/null 2>&1; then
    local -a jq_args=(-c -n --arg ts "\$ts" --arg type "\$type")
    local fields="{ts:\\\$ts, type:\\\$type"
    local kv k
    for kv in "\$@"; do
      k="\${kv%%=*}"
      jq_args+=(--arg "\$k" "\${kv#*=}")
      fields+=", \$k:\\\$\$k"
    done
    fields+="}"
    jq "\${jq_args[@]}" "\$fields"
  else
    # Fallback: minimal escape (\\ and "). Acceptable for local, trusted
    # values; logs are not meant to be processed by untrusted parsers.
    local out="{\\"ts\\":\\"\$ts\\",\\"type\\":\\"\$type\\""
    local kv k v esc
    for kv in "\$@"; do
      k="\${kv%%=*}"
      v="\${kv#*=}"
      esc=\$(printf '%s' "\$v" | sed 's/\\\\/\\\\\\\\/g; s/"/\\\\"/g')
      out+=",\\"\$k\\":\\"\$esc\\""
    done
    out+="}"
    printf '%s' "\$out"
  fi
}

JSON=\$(build_json "\$EVENT_TYPE" "\$@")
printf '%s\\n' "\$JSON" >> "\$LOG_FILE" 2>/dev/null || {
  echo "WARN: failed to append to \$LOG_FILE" >&2
  exit 0
}
`,
    },
    {
      path: `${a}/scripts/sync-state.sh`,
      executable: true,
      content: `#!/usr/bin/env bash
# APED sync-state — atomic, backed-up mutations to state.yaml.
#
# Takes a portable mkdir lock, writes via temp-file + mv (atomic on POSIX),
# and keeps a one-deep backup at \${APED_DIR}/state.yaml.backup for disaster
# recovery. Stale locks older than STALE_LOCK_SECONDS are auto-cleared with
# a warning (covers the "skill crashed mid-write" case).
#
# Usage: echo '<command> <args...>' | sync-state.sh
#
# Recognised commands:
#   set-scope-change       <true|false>
#   set-story-status       <key> <new-status>
#   set-story-worktree     <key> <path>
#   clear-story-worktree   <key>
#
# Exit codes: 0 ok, 1 generic error, 2 stale lock cleared + state untouched,
#             3 invalid command, 4 state.yaml missing or unreadable,
#             5 candidate file failed validation (refused to clobber state).

# Strict mode — any unhandled failure aborts the run BEFORE write_atomic
# touches the live state file. Without -e the previous version could swallow
# a failed cp/awk/sed and proceed to mv, writing corrupted YAML "atomically".
set -euo pipefail

STALE_LOCK_SECONDS=\${APED_STALE_LOCK_SECONDS:-300}
LOCK_TIMEOUT_SECONDS=\${APED_LOCK_TIMEOUT_SECONDS:-5}

PROJECT_ROOT="\${CLAUDE_PROJECT_DIR:-\$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
STATE_FILE="\$PROJECT_ROOT/${o}/state.yaml"
LOCK_DIR="\$PROJECT_ROOT/${a}/.state.lock"
BACKUP_FILE="\$PROJECT_ROOT/${a}/state.yaml.backup"

mkdir -p "\$(dirname "\$LOCK_DIR")"

if [[ ! -f "\$STATE_FILE" ]]; then
  echo "ERROR: state.yaml not found at \$STATE_FILE" >&2
  exit 4
fi

# ── Stale-lock auto-recovery ─────────────────────────────────────────────
# mkdir is atomic on every POSIX fs, so the lock dir is our mutex. If the
# last holder crashed (OOM, SIGKILL, power loss), the dir persists forever.
# We check its age via the stamp file written right after acquisition; if
# >STALE_LOCK_SECONDS old, we assume orphan and reclaim with a warning.
lock_age_seconds() {
  local stamp="\$LOCK_DIR/stamp"
  [[ -f "\$stamp" ]] || { stat_mtime "\$LOCK_DIR"; return; }
  stat_mtime "\$stamp"
}

stat_mtime() {
  local target="\$1"
  local now mtime
  now=\$(date +%s)
  # Linux: stat -c; macOS/BSD: stat -f
  mtime=\$(stat -c %Y "\$target" 2>/dev/null || stat -f %m "\$target" 2>/dev/null || echo "\$now")
  echo \$((now - mtime))
}

reclaim_stale_lock_if_any() {
  [[ -d "\$LOCK_DIR" ]] || return 0
  local age
  age=\$(lock_age_seconds)
  if (( age > STALE_LOCK_SECONDS )); then
    echo "WARN: stale lock \$LOCK_DIR (age \${age}s > \${STALE_LOCK_SECONDS}s) — the previous sync-state run likely crashed. Reclaiming. Verify state.yaml integrity." >&2
    rm -rf "\$LOCK_DIR"
  fi
}

acquire_lock() {
  local waited=0
  reclaim_stale_lock_if_any
  until mkdir "\$LOCK_DIR" 2>/dev/null; do
    (( waited >= LOCK_TIMEOUT_SECONDS * 10 )) && {
      echo "ERROR: could not acquire \$LOCK_DIR within \${LOCK_TIMEOUT_SECONDS}s. Another sync-state may be running. If you believe it is stuck, remove \$LOCK_DIR manually." >&2
      return 1
    }
    sleep 0.1
    waited=\$((waited + 1))
  done
  date +%s > "\$LOCK_DIR/stamp"
  # shellcheck disable=SC2064
  trap "rm -rf '\$LOCK_DIR' 2>/dev/null || true" EXIT INT TERM
}

# ── Atomic write + backup ────────────────────────────────────────────────
# All mutations flow through write_atomic. Order matters:
#   1. Validate the candidate file (non-empty, parses as YAML if yq present)
#      — refuse to clobber the live state with garbage. This is the gate
#      that turns a buggy awk/sed into "no-op + clear error" instead of
#      "atomically corrupt the canonical state".
#   2. Snapshot the current good state to BACKUP_FILE. Failure here aborts
#      — better to fail the mutation than to overwrite with no rollback.
#   3. mv the candidate over the live file. mv within the same filesystem
#      is atomic on POSIX, so a crash mid-mv leaves either the old or the
#      new state, never a truncated mix.
write_atomic() {
  local new_content_path="\$1"

  if [[ ! -s "\$new_content_path" ]]; then
    echo "ERROR: candidate state file is empty (\$new_content_path) — refusing write." >&2
    rm -f "\$new_content_path" 2>/dev/null || true
    return 5
  fi

  if command -v yq >/dev/null 2>&1; then
    if ! yq eval 'true' "\$new_content_path" >/dev/null 2>&1; then
      echo "ERROR: candidate state file is not valid YAML (\$new_content_path) — refusing write. Inspect the candidate before retrying." >&2
      return 5
    fi
  fi

  if ! cp -f "\$STATE_FILE" "\$BACKUP_FILE"; then
    echo "ERROR: failed to write backup at \$BACKUP_FILE — aborting before mutating live state." >&2
    return 1
  fi

  mv -f "\$new_content_path" "\$STATE_FILE"
  command -v sync >/dev/null 2>&1 && sync || true
}

# ── Commands ─────────────────────────────────────────────────────────────
set_scope_change() {
  local val="\${1:-false}"
  [[ "\$val" == "true" || "\$val" == "false" ]] || { echo "ERROR: set-scope-change expects true|false (got: \$val)" >&2; return 3; }
  local tmp="\$STATE_FILE.tmp"
  if grep -q 'scope_change_active:' "\$STATE_FILE"; then
    sed "s|scope_change_active:.*|scope_change_active: \$val|" "\$STATE_FILE" > "\$tmp"
  elif grep -q '^sprint:' "\$STATE_FILE"; then
    awk -v v="\$val" '
      /^sprint:/ { print; print "  scope_change_active: " v; next }
      { print }
    ' "\$STATE_FILE" > "\$tmp"
  else
    # No sprint section — append one.
    { cat "\$STATE_FILE"; echo "sprint:"; echo "  scope_change_active: \$val"; } > "\$tmp"
  fi
  write_atomic "\$tmp"
}

set_story_field() {
  local key="\$1" field="\$2" value="\$3"
  [[ -n "\$key" && -n "\$field" ]] || { echo "ERROR: missing story key or field" >&2; return 3; }
  local tmp="\$STATE_FILE.tmp"

  # Prefer yq when available — robust against regex metachars in story keys
  # (e.g. dots, hyphens, the slug suffix), preserves YAML structure exactly,
  # and survives indentation drift the awk fallback can't see. The path
  # 'sprint.stories."<key>".<field>' matches the canonical layout written by
  # /aped-epics. The caller wraps string values with literal quotes (so
  # awk's print-line preserves them); for yq we strip those and let yq
  # quote the value itself.
  if command -v yq >/dev/null 2>&1; then
    cp -f "\$STATE_FILE" "\$tmp"
    if [[ "\$value" == "null" ]]; then
      yq eval -i ".sprint.stories.\\"\$key\\".\$field = null" "\$tmp"
    else
      local raw="\${value#\\"}"
      raw="\${raw%\\"}"
      yq eval -i ".sprint.stories.\\"\$key\\".\$field = \\"\$raw\\"" "\$tmp"
    fi
    write_atomic "\$tmp"
    return
  fi

  # awk fallback (yq absent). Escape regex metachars in the story key so a
  # key like "1-2-foo.bar" or "story[v2]" doesn't blow up the match.
  local key_re
  key_re=\$(printf '%s' "\$key" | sed 's/[][\\\\/.^\$*+?(){}|]/\\\\&/g')
  awk -v k_re="\$key_re" -v f="\$field" -v v="\$value" '
    function is_story_header(s) {
      # "<indent>WORD:" with optional trailing whitespace and nothing else
      return match(s, "^[[:space:]]+[A-Za-z0-9_-]+:[[:space:]]*\$")
    }
    BEGIN { in_story = 0 }
    {
      line = \$0
      if (match(line, "^([[:space:]]+)" k_re ":[[:space:]]*\$")) {
        in_story = 1
        print line
        next
      }
      if (in_story && is_story_header(line)) {
        in_story = 0
      }
      if (in_story && match(line, "^([[:space:]]+)" f ":[[:space:]]")) {
        # Preserve the exact indentation of the original field line.
        split(line, arr, f ":")
        indent = arr[1]
        print indent f ": " v
        next
      }
      print line
    }
  ' "\$STATE_FILE" > "\$tmp"
  write_atomic "\$tmp"
}

apply_patch() {
  local cmd="\${1:-}"; shift || true
  case "\$cmd" in
    set-scope-change)
      set_scope_change "\${1:-false}"
      ;;
    set-story-status)
      [[ \$# -eq 2 ]] || { echo "Usage: set-story-status <key> <status>" >&2; return 3; }
      set_story_field "\$1" "status" "\\"\$2\\""
      ;;
    set-story-worktree)
      [[ \$# -eq 2 ]] || { echo "Usage: set-story-worktree <key> <path>" >&2; return 3; }
      set_story_field "\$1" "worktree" "\\"\$2\\""
      ;;
    clear-story-worktree)
      [[ \$# -eq 1 ]] || { echo "Usage: clear-story-worktree <key>" >&2; return 3; }
      set_story_field "\$1" "worktree" "null"
      ;;
    set-story-field)
      # Generic escape hatch — used by /aped-sprint for ticket_sync_status,
      # by /aped-lead for retry bookkeeping, etc. Keep specific commands
      # above for the hot-path mutations (better error messages, narrower
      # surface to misuse).
      [[ \$# -eq 3 ]] || { echo "Usage: set-story-field <key> <field> <value>" >&2; return 3; }
      local raw_value="\$3"
      if [[ "\$raw_value" == "null" || "\$raw_value" == "true" || "\$raw_value" == "false" ]]; then
        set_story_field "\$1" "\$2" "\$raw_value"
      else
        set_story_field "\$1" "\$2" "\\"\$raw_value\\""
      fi
      ;;
    set-sprint-field)
      # Mutate a top-level field under sprint:. Used for umbrella_branch
      # bookkeeping by /aped-sprint at sprint start. yq path is preferred;
      # awk fallback is the same shape as set_story_field.
      [[ \$# -eq 2 ]] || { echo "Usage: set-sprint-field <field> <value>" >&2; return 3; }
      local field="\$1" value="\$2" tmp="\$STATE_FILE.tmp"
      if command -v yq >/dev/null 2>&1; then
        cp -f "\$STATE_FILE" "\$tmp"
        if [[ "\$value" == "null" ]]; then
          yq eval -i ".sprint.\$field = null" "\$tmp"
        else
          local raw="\${value#\\"}"; raw="\${raw%\\"}"
          yq eval -i ".sprint.\$field = \\"\$raw\\"" "\$tmp"
        fi
        write_atomic "\$tmp"
      else
        # awk fallback: scan for "  \$field:" inside the sprint: block.
        awk -v f="\$field" -v v="\$value" '
          BEGIN { in_sprint = 0; emitted = 0 }
          /^sprint:/ { in_sprint = 1; print; next }
          in_sprint && /^[a-zA-Z]/ && !/^sprint:/ { in_sprint = 0 }
          in_sprint && match(\$0, "^([[:space:]]+)" f ":[[:space:]]") {
            split(\$0, arr, f ":")
            print arr[1] f ": " v
            emitted = 1
            next
          }
          { print }
          END {
            if (!emitted) {
              # Append the field at the end if the sprint section never had it
              print "  " f ": " v
            }
          }
        ' "\$STATE_FILE" > "\$tmp"
        write_atomic "\$tmp"
      fi
      ;;
    "")
      echo "ERROR: no command on stdin" >&2
      return 3
      ;;
    *)
      echo "ERROR: unknown command '\$cmd' (known: set-scope-change | set-story-status | set-story-worktree | clear-story-worktree | set-story-field | set-sprint-field)" >&2
      return 3
      ;;
  esac
}

read_cmd() {
  local line
  IFS= read -r line || return 1
  # shellcheck disable=SC2086
  set -- \$line
  apply_patch "\$@"
}

acquire_lock || exit 1
read_cmd
`,
    },
    {
      path: `${a}/scripts/validate-state.sh`,
      executable: true,
      content: `#!/usr/bin/env bash
# APED validate-state — check that state.yaml is syntactically valid,
# every story status is in the allowed whitelist, and the schema version
# is one this build understands. Skills call this at Setup so a hand-
# edited or half-corrupted state.yaml produces a clear message instead
# of silent grep/awk failures downstream.
#
# Schema versions: this script knows about version(s) listed in
# KNOWN_SCHEMA_VERSIONS below. Bumping the schema requires an explicit
# migration before this script will accept the file again.
#
# Exit codes:
#   0 ok
#   1 state.yaml missing
#   2 yaml parse error (if yq is available)
#   3 invalid status value
#   4 unknown schema_version (refuse to operate)

set -u
set -o pipefail

PROJECT_ROOT="\${CLAUDE_PROJECT_DIR:-\$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
STATE_FILE="\$PROJECT_ROOT/${o}/state.yaml"
BACKUP_FILE="\$PROJECT_ROOT/${a}/state.yaml.backup"

if [[ ! -f "\$STATE_FILE" ]]; then
  echo "ERROR: \$STATE_FILE not found." >&2
  if [[ -f "\$BACKUP_FILE" ]]; then
    echo "HINT: a backup exists at \$BACKUP_FILE — restore with: cp \$BACKUP_FILE \$STATE_FILE" >&2
  fi
  exit 1
fi

# ── YAML syntax (best-effort via yq if present) ──────────────────────────
if command -v yq >/dev/null 2>&1; then
  if ! yq eval 'true' "\$STATE_FILE" >/dev/null 2>&1; then
    echo "ERROR: \$STATE_FILE is not valid YAML." >&2
    if [[ -f "\$BACKUP_FILE" ]]; then
      echo "HINT: backup at \$BACKUP_FILE — inspect with: diff \$STATE_FILE \$BACKUP_FILE" >&2
    fi
    exit 2
  fi
fi

# ── Schema version check ─────────────────────────────────────────────────
# Hand-edited state.yaml may omit schema_version (legacy files); accept
# missing as version 1 so existing projects keep working until they bump.
KNOWN_SCHEMA_VERSIONS="1"
schema_version="1"
if command -v yq >/dev/null 2>&1; then
  schema_version=\$(yq eval '.schema_version // 1' "\$STATE_FILE" 2>/dev/null || echo "1")
else
  v=\$(grep -E '^schema_version:' "\$STATE_FILE" 2>/dev/null | head -1 | sed 's/.*:[[:space:]]*//;s/["[:space:]]//g')
  [[ -n "\$v" ]] && schema_version="\$v"
fi
if ! grep -qw "\$schema_version" <<< "\$KNOWN_SCHEMA_VERSIONS"; then
  echo "ERROR: state.yaml schema_version=\$schema_version is not understood by this APED build (known: \$KNOWN_SCHEMA_VERSIONS). A migration is required — do not edit state.yaml manually." >&2
  exit 4
fi

# ── Status whitelist check (grep-based, dependency-free) ─────────────────
# Accepted statuses: pending | ready-for-dev | in-progress | dev-done |
# review | review-queued | review-done | done
VALID_STATUSES_PATTERN='(pending|ready-for-dev|in-progress|dev-done|review|review-queued|review-done|done)'

# Extract all status: "xxx" lines and complain about any that don't match.
invalid_found=0
while IFS= read -r line; do
  # Skip comment lines and empty status values
  [[ "\$line" =~ ^[[:space:]]*# ]] && continue
  val=\$(echo "\$line" | sed -E 's/.*status:[[:space:]]*"?([^"#]*)"?.*/\\1/' | sed 's/[[:space:]]*\$//')
  [[ -z "\$val" ]] && continue
  if ! [[ "\$val" =~ ^\${VALID_STATUSES_PATTERN}\$ ]]; then
    echo "ERROR: invalid story status '\$val' in state.yaml" >&2
    invalid_found=1
  fi
done < <(grep -E '^[[:space:]]+status:' "\$STATE_FILE" 2>/dev/null || true)

if (( invalid_found )); then
  echo "HINT: valid values are: pending, ready-for-dev, in-progress, dev-done, review, review-queued, review-done, done" >&2
  exit 3
fi

exit 0
`,
    },
    {
      path: `${a}/scripts/check-active-worktrees.sh`,
      executable: true,
      content: `#!/usr/bin/env bash
# APED check-active-worktrees — reconcile state.yaml against disk reality.
#
# /aped-sprint computes parallel-capacity from state.yaml only. If the user
# manually rm-rf'd a worktree, capacity is wrong and dispatch is needlessly
# blocked. This script is the read-side reconciliation: it lists every
# story registered as active (in-progress / review-queued / review) and
# verifies its worktree path still exists on disk.
#
# Output (text default, --format json available): one line per story.
# Exit:
#   0 → all worktrees present (or none registered)
#   1 → one or more missing (state out of sync — /aped-lead can fix)
#   3 → state.yaml unreadable

set -uo pipefail

FORMAT="text"
if [[ "\${1:-}" == "--format" ]]; then
  FORMAT="\${2:-text}"
fi

PROJECT_ROOT="\${CLAUDE_PROJECT_DIR:-\$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
STATE_FILE="\$PROJECT_ROOT/${o}/state.yaml"
[[ -f "\$STATE_FILE" ]] || { echo "ERROR: \$STATE_FILE not found" >&2; exit 3; }

declare -a ENTRIES=()

emit_if_active() {
  local key="\$1" status="\$2" worktree="\$3"
  [[ -z "\$key" ]] && return
  [[ -z "\$worktree" || "\$worktree" == "null" ]] && return
  case "\$status" in
    in-progress|review-queued|review) ;;
    *) return ;;
  esac
  if [[ -d "\$worktree" ]]; then
    ENTRIES+=("\$key|\$status|\$worktree|present")
  else
    ENTRIES+=("\$key|\$status|\$worktree|missing")
  fi
}

if command -v yq >/dev/null 2>&1; then
  while IFS='|' read -r key status worktree; do
    emit_if_active "\$key" "\$status" "\$worktree"
  done < <(yq eval '.sprint.stories | to_entries | .[] | [.key, (.value.status // ""), (.value.worktree // "null")] | join("|")' "\$STATE_FILE" 2>/dev/null || true)
else
  # awk fallback — scoped to sprint.stories so we don't accidentally treat
  # other top-level maps as story entries. Story headers are 4-space indent
  # bare keys; status/worktree fields are 6-space indent.
  while IFS='|' read -r key status worktree; do
    emit_if_active "\$key" "\$status" "\$worktree"
  done < <(awk '
    /^sprint:/ { in_sprint=1; next }
    in_sprint && /^[a-zA-Z]/ { in_sprint=0 }
    in_sprint && /^  stories:/ { in_stories=1; next }
    in_stories && /^  [a-zA-Z]/ { in_stories=0 }
    in_stories && /^    [a-zA-Z0-9_-]+:[[:space:]]*\$/ {
      if (key != "") print key "|" status "|" worktree
      k=\$0; sub(/:[[:space:]]*\$/, "", k); sub(/^[[:space:]]+/, "", k)
      key=k; status=""; worktree="null"
      next
    }
    in_stories && /^      status:/ {
      v=\$0; sub(/^[^:]*:[[:space:]]*/, "", v); gsub(/"/, "", v); gsub(/[[:space:]]+\$/, "", v)
      status=v; next
    }
    in_stories && /^      worktree:/ {
      v=\$0; sub(/^[^:]*:[[:space:]]*/, "", v); gsub(/"/, "", v); gsub(/[[:space:]]+\$/, "", v)
      worktree=v; next
    }
    END { if (key != "") print key "|" status "|" worktree }
  ' "\$STATE_FILE")
fi

missing=0
# bash quirk: \${ENTRIES[@]} on an empty array under \`set -u\` raises
# "unbound variable" in bash <5.1. \${ENTRIES[@]+"\${ENTRIES[@]}"} expands
# to nothing safely on empty arrays.
for e in \${ENTRIES[@]+"\${ENTRIES[@]}"}; do
  [[ "\${e##*|}" == "missing" ]] && missing=\$((missing + 1))
done

if [[ "\$FORMAT" == "json" ]]; then
  printf '['
  first=1
  for e in \${ENTRIES[@]+"\${ENTRIES[@]}"}; do
    [[ \$first -eq 1 ]] && first=0 || printf ','
    IFS='|' read -r k s w r <<< "\$e"
    printf '{"story":"%s","status":"%s","worktree":"%s","reality":"%s"}' "\$k" "\$s" "\$w" "\$r"
  done
  printf ']\\n'
else
  if [[ \${#ENTRIES[@]} -eq 0 ]]; then
    echo "No active worktrees registered."
  else
    printf '%-20s  %-15s  %-50s  %s\\n' "STORY" "STATUS" "WORKTREE" "REALITY"
    for e in "\${ENTRIES[@]}"; do
      IFS='|' read -r k s w r <<< "\$e"
      mark="✓"
      [[ "\$r" == "missing" ]] && mark="✗"
      printf '%-20s  %-15s  %-50s  %s %s\\n' "\$k" "\$s" "\$w" "\$mark" "\$r"
    done
  fi
fi

exit \$(( missing > 0 ? 1 : 0 ))
`,
    },
    {
      path: `${a}/scripts/check-auto-approve.sh`,
      executable: true,
      content: `#!/usr/bin/env bash
# APED check-auto-approve — deterministic verdicts for /aped-lead's batch
# processor. Replaces LLM-based judgement on "is this check-in safe to
# auto-approve?". Each subcommand runs the checks listed in aped-lead.md
# and returns a verdict the LLM can trust.
#
# Subcommands:
#   story-ready  <story-key>
#   dev-done     <story-key>
#   review-done  <story-key>
#
# Exit codes:
#   0 → AUTO     (all checks passed)
#   1 → ESCALATE (one or more checks failed; reasons on stderr, "- " prefix)
#   2 → usage error
#   3 → preconditions missing (story not in state.yaml, worktree missing)
#
# Run from the MAIN project root; paths derive from there.

set -uo pipefail

ACTION="\${1:-}"
KEY="\${2:-}"

[[ -n "\$ACTION" && -n "\$KEY" ]] || {
  echo "Usage: check-auto-approve.sh <story-ready|dev-done|review-done> <story-key>" >&2
  exit 2
}

PROJECT_ROOT="\${CLAUDE_PROJECT_DIR:-\$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
STATE_FILE="\$PROJECT_ROOT/${o}/state.yaml"
APED_DIR="\$PROJECT_ROOT/${a}"
CONFIG_FILE="\$APED_DIR/config.yaml"

[[ -f "\$STATE_FILE" ]] || { echo "ERROR: state.yaml missing at \$STATE_FILE" >&2; exit 3; }

REASONS=()
fail() { REASONS+=("- \$1"); }

field_for_story() {
  local key="\$1" field="\$2"
  awk -v k="\$key" -v f="\$field" '
    \$0 ~ "^    " k ":" { in_story=1; next }
    in_story && /^    [a-zA-Z0-9_-]+:/ { in_story=0 }
    in_story && \$1 == f ":" { gsub(/"/, "", \$2); print \$2; exit }
  ' "\$STATE_FILE"
}

WORKTREE=\$(field_for_story "\$KEY" "worktree" || true)
[[ -n "\$WORKTREE" && "\$WORKTREE" != "null" ]] || {
  echo "ERROR: no worktree registered for \$KEY in state.yaml" >&2
  exit 3
}
[[ -d "\$WORKTREE" ]] || {
  echo "ERROR: worktree path \$WORKTREE not found on disk" >&2
  exit 3
}

STORY_FILE="\$WORKTREE/${o}/stories/\${KEY}.md"

check_story_ready() {
  [[ -f "\$STORY_FILE" ]] || { fail "story file missing at \$STORY_FILE"; return; }

  # ACs use Given/When/Then, either numbered ("1. Given …") or bulleted ("- Given …").
  if ! grep -qE '^[[:space:]]*([0-9]+\\.|-)[[:space:]]+(Given|GIVEN)' "\$STORY_FILE"; then
    fail "no Given/When/Then-formatted Acceptance Criteria in story file"
  fi

  # Story file must be committed on the worktree's branch.
  if ! git -C "\$WORKTREE" log --oneline -- "${o}/stories/\${KEY}.md" 2>/dev/null | grep -q .; then
    fail "story file is not committed on the feature branch"
  fi

  # depends_on all done.
  local deps
  deps=\$(awk -v k="\$KEY" '
    \$0 ~ "^    " k ":" { in_story=1; next }
    in_story && /^    [a-zA-Z0-9_-]+:/ && !/depends_on:/ { if (!in_deps) in_story=0 }
    in_story && /^[[:space:]]+depends_on:/ { in_deps=1; next }
    in_deps && /^[[:space:]]+-[[:space:]]/ { gsub(/^[[:space:]]+-[[:space:]]+/, ""); gsub(/"/, ""); print }
    in_deps && /^[[:space:]]+[a-zA-Z]/ { in_deps=0 }
  ' "\$STATE_FILE")

  local dep dep_status
  for dep in \$deps; do
    dep_status=\$(field_for_story "\$dep" "status" || echo "unknown")
    [[ "\$dep_status" == "done" ]] || fail "dependency \$dep is \$dep_status (need done)"
  done
}

check_dev_done() {
  # Test result freshness — /aped-dev should write .aped/.last-test-exit on
  # every run. Missing cache is treated as "tests not verified" and escalates.
  local exit_file="\$WORKTREE/${a}/.last-test-exit"
  if [[ -f "\$exit_file" ]]; then
    local last_exit
    last_exit=\$(cat "\$exit_file" 2>/dev/null || echo "missing")
    [[ "\$last_exit" == "0" ]] || fail "last test run exited \$last_exit (cached at .last-test-exit)"
  else
    fail "no .aped/.last-test-exit cache — run tests in worktree before approving"
  fi

  if [[ -f "\$STORY_FILE" ]]; then
    if grep -qE '^[[:space:]]*- \\[ \\]' "\$STORY_FILE"; then
      local unchecked
      unchecked=\$(grep -cE '^[[:space:]]*- \\[ \\]' "\$STORY_FILE")
      fail "\$unchecked tasks still unchecked in story"
    fi
    if grep -qi 'HALT' "\$STORY_FILE"; then
      fail "HALT entries present in Dev Agent Record"
    fi
  else
    fail "story file missing at \$STORY_FILE"
  fi

  if [[ -n "\$(git -C "\$WORKTREE" status --porcelain 2>/dev/null)" ]]; then
    fail "worktree has uncommitted changes"
  fi

  if [[ -x "\$APED_DIR/aped-review/scripts/git-audit.sh" && -f "\$STORY_FILE" ]]; then
    if ! (cd "\$WORKTREE" && bash "\$APED_DIR/aped-review/scripts/git-audit.sh" "\$STORY_FILE") >/dev/null 2>&1; then
      fail "git-audit.sh reports file-list/git-changes mismatch"
    fi
  fi
}

check_review_done() {
  local status
  status=\$(field_for_story "\$KEY" "status" || echo "unknown")
  [[ "\$status" == "done" ]] || fail "story status is \$status (need done)"

  local ticket ticket_system
  ticket=\$(field_for_story "\$KEY" "ticket" || true)
  ticket_system=\$(grep -E '^ticket_system:' "\$CONFIG_FILE" 2>/dev/null | sed 's/.*:[[:space:]]*//;s/["'"'"']//g' || echo "none")

  if [[ -n "\$ticket" ]]; then
    case "\$ticket_system" in
      github-issues)
        if command -v gh >/dev/null 2>&1; then
          if gh issue view "\$ticket" --json labels 2>/dev/null | grep -q 'aped-blocked-'; then
            fail "ticket \$ticket has aped-blocked-* label"
          fi
        fi
        ;;
      gitlab-issues)
        if command -v glab >/dev/null 2>&1; then
          if glab issue view "\$ticket" 2>/dev/null | grep -q 'aped-blocked-'; then
            fail "ticket \$ticket has aped-blocked-* label"
          fi
        fi
        ;;
    esac
  fi

  # PR mergeability + base check — github only for now; other providers skip
  # silently (no escalation). The PR's base MUST be the sprint umbrella; if
  # /aped-review opened it against the wrong base (e.g. the actual base
  # branch), the merge would skip the umbrella convention entirely.
  local umbrella=""
  if command -v yq >/dev/null 2>&1; then
    umbrella=\$(yq -r '.sprint.umbrella_branch // ""' "\$STATE_FILE" 2>/dev/null || echo "")
  fi

  if [[ -n "\$ticket" ]] && command -v gh >/dev/null 2>&1; then
    local pr_json mergeable base_ref
    pr_json=\$(cd "\$WORKTREE" && gh pr view --json mergeable,baseRefName 2>/dev/null || echo "{}")
    mergeable=\$(printf '%s' "\$pr_json" | grep -oE '"mergeable":[[:space:]]*"[A-Z]+"' | sed 's/.*"\\([A-Z]*\\)"/\\1/' || echo "UNKNOWN")
    base_ref=\$(printf '%s' "\$pr_json" | grep -oE '"baseRefName":[[:space:]]*"[^"]+"' | sed 's/.*"\\([^"]*\\)"/\\1/' || echo "")

    case "\$mergeable" in
      MERGEABLE|UNKNOWN) ;;
      *) fail "PR mergeable status is \$mergeable (need MERGEABLE)" ;;
    esac

    if [[ -n "\$umbrella" && -n "\$base_ref" && "\$base_ref" != "\$umbrella" ]]; then
      fail "PR base is '\$base_ref' but expected sprint umbrella '\$umbrella' — re-open the PR with --base \$umbrella"
    fi
  fi
}

case "\$ACTION" in
  story-ready) check_story_ready ;;
  dev-done)    check_dev_done ;;
  review-done) check_review_done ;;
  *) echo "Unknown action: \$ACTION (expected story-ready|dev-done|review-done)" >&2; exit 2 ;;
esac

if [[ \${#REASONS[@]} -gt 0 ]]; then
  printf '%s\\n' "\${REASONS[@]}" >&2
  exit 1
fi
exit 0
`,
    },
    {
      path: `${a}/scripts/checkin.sh`,
      executable: true,
      content: `#!/usr/bin/env bash
# APED checkin — lead/story coordination plumbing.
#
# Story Leaders (inside a worktree) \`post\` a checkin at every transition;
# the Lead Dev (inside the main project) \`poll\`s, \`approve\`s (or \`block\`s),
# and \`push\`es the next command back into the worktree's tmux window.
#
# Backend: ticket system if configured (Linear / GitHub / GitLab / Jira)
# with labels \`aped-checkin-<kind>\`, \`aped-approved-<kind>\`,
# \`aped-blocked-<kind>\`. Otherwise falls back to JSONL inboxes under
# \${main_project}/${a}/checkins/ — concurrent-safe via flock.
#
# Usage:
#   checkin.sh post    <story-key> <kind> [<reason>]
#   checkin.sh poll    [--format json|text]
#   checkin.sh approve <story-key> <kind>
#   checkin.sh block   <story-key> <kind> <reason>
#   checkin.sh push    <story-key> <next-command...>
#   checkin.sh status  <story-key> <kind>    # → pending|approved|blocked|none
#
# \`kind\` ∈ { story-ready, dev-done, review-done }.

set -u
set -o pipefail

ACTION="\${1:-}"
shift || true

# ── Paths ─────────────────────────────────────────────────────────────────
# Always resolve paths against the MAIN project root, not the worktree.
# \`git worktree list\` reports absolute paths with the main worktree on line 1.
MAIN_ROOT=""
if command -v git >/dev/null 2>&1; then
  MAIN_ROOT=\$(git worktree list 2>/dev/null | awk 'NR==1 {print \$1}' || true)
fi
: "\${MAIN_ROOT:=\${CLAUDE_PROJECT_DIR:-\$(pwd)}}"

# ── Portable lock (mkdir is atomic on every POSIX fs; flock is Linux-only) ─
acquire_lock() {
  local lock="\$1" timeout="\${2:-10}" waited=0
  until mkdir "\$lock" 2>/dev/null; do
    (( waited >= timeout * 10 )) && { echo "Lock timeout on \$lock" >&2; return 1; }
    sleep 0.1
    waited=\$((waited + 1))
  done
  # Cleanup on exit, including signals.
  # shellcheck disable=SC2064
  trap "rmdir '\$lock' 2>/dev/null || true" EXIT INT TERM
}

CONFIG_FILE="\$MAIN_ROOT/${a}/config.yaml"
STATE_FILE="\$MAIN_ROOT/${o}/state.yaml"
INBOX_DIR="\$MAIN_ROOT/${a}/checkins"
LOCK_FILE="\$INBOX_DIR/.lock"

mkdir -p "\$INBOX_DIR"

# ── Config helpers ────────────────────────────────────────────────────────
read_config() {
  local key="\$1"
  [[ -f "\$CONFIG_FILE" ]] || { echo "none"; return; }
  local val
  val=\$(grep -E "^\${key}:" "\$CONFIG_FILE" 2>/dev/null | head -1 | sed 's/.*:[[:space:]]*//;s/["'\\'']//g;s/[[:space:]]*\$//')
  echo "\${val:-none}"
}

TICKET_SYSTEM=\$(read_config ticket_system)
GIT_PROVIDER=\$(read_config git_provider)

ticket_for_story() {
  field_for_story "\$1" "ticket"
}

worktree_for_story() {
  field_for_story "\$1" "worktree"
}

field_for_story() {
  local key="\$1" field="\$2"
  [[ -f "\$STATE_FILE" ]] || return 1
  awk -v k="\$key" -v f="\$field" '
    \$0 ~ "^    " k ":" { in_story=1; next }
    in_story && /^    [a-zA-Z0-9_-]+:/ { in_story=0 }
    in_story && \$1 == f ":" {
      gsub(/"/, "", \$2); print \$2; exit
    }
  ' "\$STATE_FILE"
}

# ── Validation ────────────────────────────────────────────────────────────
validate_kind() {
  case "\$1" in
    story-ready|dev-done|review-done|dev-blocked) ;;
    *) echo "Invalid kind: \$1 (expected story-ready | dev-done | review-done | dev-blocked)" >&2; exit 1 ;;
  esac
}

now_iso() {
  date -u +%Y-%m-%dT%H:%M:%SZ
}

# ── Audit log (best-effort) ──────────────────────────────────────────────
# Mirrors every mutation through scripts/log.sh so /aped-status, postmortems,
# and replays have a single timeline to read. log.sh is fail-soft (always
# exits 0); we still guard with || true to be paranoid.
log_event() {
  bash "\$MAIN_ROOT/${a}/scripts/log.sh" "\$@" 2>/dev/null || true
}

# ── File backend ──────────────────────────────────────────────────────────
inbox_file() {
  echo "\$INBOX_DIR/\$1.jsonl"
}

append_entry() {
  local key="\$1" kind="\$2" status="\$3" reason="\${4:-}"
  local file
  file=\$(inbox_file "\$key")
  local entry
  if command -v jq >/dev/null 2>&1; then
    entry=\$(jq -c -n --arg ts "\$(now_iso)" --arg s "\$key" --arg k "\$kind" --arg st "\$status" --arg r "\$reason" \
      '{ts:\$ts, story:\$s, kind:\$k, status:\$st, reason:\$r}')
  else
    entry=\$(APED_TS="\$(now_iso)" APED_S="\$key" APED_K="\$kind" APED_ST="\$status" APED_R="\$reason" node -e '
      process.stdout.write(JSON.stringify({
        ts: process.env.APED_TS, story: process.env.APED_S,
        kind: process.env.APED_K, status: process.env.APED_ST, reason: process.env.APED_R
      }))')
  fi

  acquire_lock "\$LOCK_FILE" || return 1
  printf '%s\\n' "\$entry" >> "\$file"
  rmdir "\$LOCK_FILE" 2>/dev/null || true
  trap - EXIT INT TERM
}

latest_status() {
  local key="\$1" kind="\$2"
  local file
  file=\$(inbox_file "\$key")
  [[ -f "\$file" ]] || { echo "none"; return; }
  if command -v jq >/dev/null 2>&1; then
    jq -r --arg k "\$kind" 'select(.kind == \$k) | .status' "\$file" 2>/dev/null | tail -1 || echo "none"
  else
    grep "\"kind\":\"\$kind\"" "\$file" | tail -1 | sed 's/.*"status":"\\([^"]*\\)".*/\\1/' || echo "none"
  fi
}

# ── Ticket backend (thin — skills call providers directly, we just add labels + comments) ──
add_ticket_label() {
  local ticket="\$1" label="\$2"
  case "\$TICKET_SYSTEM" in
    github-issues) gh issue edit "\$ticket" --add-label "\$label" >/dev/null 2>&1 || true ;;
    gitlab-issues) glab issue update "\$ticket" --label "\$label" >/dev/null 2>&1 || true ;;
    linear|jira) true ;;  # Labels set by the calling skill via provider CLI — script stays provider-light.
  esac
}

remove_ticket_label() {
  local ticket="\$1" label="\$2"
  case "\$TICKET_SYSTEM" in
    github-issues) gh issue edit "\$ticket" --remove-label "\$label" >/dev/null 2>&1 || true ;;
    gitlab-issues) glab issue update "\$ticket" --unlabel "\$label" >/dev/null 2>&1 || true ;;
    linear|jira) true ;;
  esac
}

post_ticket_comment() {
  local ticket="\$1" body="\$2"
  case "\$TICKET_SYSTEM" in
    github-issues) gh issue comment "\$ticket" --body "\$body" >/dev/null 2>&1 || true ;;
    gitlab-issues) glab issue note create "\$ticket" --message "\$body" >/dev/null 2>&1 || true ;;
    linear|jira) true ;;
  esac
}

# ── Actions ───────────────────────────────────────────────────────────────
cmd_post() {
  local key="\${1:-}" kind="\${2:-}" reason="\${3:-}"
  [[ -n "\$key" && -n "\$kind" ]] || { echo "Usage: checkin.sh post <key> <kind> [reason]" >&2; exit 1; }
  validate_kind "\$kind"

  append_entry "\$key" "\$kind" "pending" "\$reason"

  if [[ "\$TICKET_SYSTEM" != "none" ]]; then
    local ticket
    ticket=\$(ticket_for_story "\$key" || true)
    if [[ -n "\$ticket" ]]; then
      add_ticket_label "\$ticket" "aped-checkin-\$kind"
      post_ticket_comment "\$ticket" "[APED:CHECKIN:\$kind] \$key — requesting lead approval.\${reason:+\$'\\n'Reason: \$reason}"
    fi
  fi

  log_event checkin_posted story="\$key" kind="\$kind" reason="\$reason"
  printf 'posted %s/%s (pending)\\n' "\$key" "\$kind"
}

cmd_approve() {
  local key="\${1:-}" kind="\${2:-}"
  [[ -n "\$key" && -n "\$kind" ]] || { echo "Usage: checkin.sh approve <key> <kind>" >&2; exit 1; }
  validate_kind "\$kind"
  append_entry "\$key" "\$kind" "approved" ""

  if [[ "\$TICKET_SYSTEM" != "none" ]]; then
    local ticket
    ticket=\$(ticket_for_story "\$key" || true)
    if [[ -n "\$ticket" ]]; then
      remove_ticket_label "\$ticket" "aped-checkin-\$kind"
      add_ticket_label "\$ticket" "aped-approved-\$kind"
      post_ticket_comment "\$ticket" "[APED:APPROVE:\$kind] \$key — lead approved. Proceed."
    fi
  fi
  log_event checkin_approved story="\$key" kind="\$kind"
  printf 'approved %s/%s\\n' "\$key" "\$kind"
}

cmd_block() {
  local key="\${1:-}" kind="\${2:-}" reason="\${3:-}"
  [[ -n "\$key" && -n "\$kind" && -n "\$reason" ]] || { echo "Usage: checkin.sh block <key> <kind> <reason>" >&2; exit 1; }
  validate_kind "\$kind"
  append_entry "\$key" "\$kind" "blocked" "\$reason"

  if [[ "\$TICKET_SYSTEM" != "none" ]]; then
    local ticket
    ticket=\$(ticket_for_story "\$key" || true)
    if [[ -n "\$ticket" ]]; then
      remove_ticket_label "\$ticket" "aped-checkin-\$kind"
      add_ticket_label "\$ticket" "aped-blocked-\$kind"
      post_ticket_comment "\$ticket" "[APED:BLOCK:\$kind] \$key — lead needs changes. Reason: \$reason"
    fi
  fi
  log_event checkin_blocked story="\$key" kind="\$kind" reason="\$reason"
  printf 'blocked %s/%s\\n' "\$key" "\$kind"
}

cmd_status() {
  local key="\${1:-}" kind="\${2:-}"
  [[ -n "\$key" && -n "\$kind" ]] || { echo "Usage: checkin.sh status <key> <kind>" >&2; exit 1; }
  latest_status "\$key" "\$kind"
}

cmd_poll() {
  local format="text"
  if [[ "\${1:-}" == "--format" ]]; then
    format="\${2:-text}"
  fi

  local pending=()
  shopt -s nullglob
  for f in "\$INBOX_DIR"/*.jsonl; do
    local key
    key=\$(basename "\$f" .jsonl)
    for kind in story-ready dev-done review-done dev-blocked; do
      local st
      st=\$(latest_status "\$key" "\$kind")
      if [[ "\$st" == "pending" ]]; then
        pending+=("\$key|\$kind")
      fi
    done
  done
  shopt -u nullglob

  if [[ "\$format" == "json" ]]; then
    printf '['
    local first=1
    # Guard against bash 4 \`set -u\` + empty array: \${a[@]+"\${a[@]}"} expands
    # to nothing safely when the array is empty.
    for entry in \${pending[@]+"\${pending[@]}"}; do
      local k="\${entry%|*}"
      local nd="\${entry#*|}"
      [[ \$first -eq 1 ]] && first=0 || printf ','
      printf '{"story":"%s","kind":"%s"}' "\$k" "\$nd"
    done
    printf ']\\n'
  else
    if [[ \${#pending[@]} -eq 0 ]]; then
      echo "No pending check-ins."
    else
      echo "Pending check-ins (\${#pending[@]}):"
      for entry in "\${pending[@]}"; do
        local k="\${entry%|*}"
        local nd="\${entry#*|}"
        echo "  \$k  \$nd"
      done
    fi
  fi
}

cmd_archive() {
  # Move all .jsonl checkin inboxes to a dated archive directory and start
  # fresh. Called by /aped-ship after a successful umbrella PR open so the
  # next sprint starts with empty inboxes (poll latency stays O(active)).
  local archive_dir="\$INBOX_DIR/archive/\$(date -u +%Y-%m-%d)"
  mkdir -p "\$archive_dir" 2>/dev/null || { echo "ERROR: cannot create \$archive_dir" >&2; exit 1; }

  local moved=0
  shopt -s nullglob
  for f in "\$INBOX_DIR"/*.jsonl; do
    mv -f "\$f" "\$archive_dir/" && moved=\$((moved + 1))
  done
  shopt -u nullglob

  log_event checkin_archived to="\$archive_dir" files="\$moved"
  printf 'archived %d inbox file(s) to %s\\n' "\$moved" "\$archive_dir"
}

cmd_push() {
  # Args: [--target <name>] <story-key> <prompt-words...>
  # Resolution order, in this priority:
  #   1. If --target is given, use only that name (no auto-discovery).
  #   2. Else build a candidate list from state.yaml: workmux handle (basename
  #      of worktree path), ticket id, story key — in that order.
  #   3. Try workmux first if installed: send to the candidate that workmux
  #      knows. If multiple match, REFUSE and ask for --target.
  #   4. Fall back to tmux: match against window names. Same multi-match rule.
  # Exit codes:
  #   0 pushed; 1 usage; 2 no target found anywhere; 3 ambiguous (>1 match).
  # Never prints "pushed" unless the underlying send command actually ran
  # against a single, unambiguous target.
  local key="" target=""
  local -a prompt_args=()
  while [[ \$# -gt 0 ]]; do
    case "\$1" in
      --target)
        target="\${2:-}"; shift 2 || { echo "Usage: --target requires a value" >&2; exit 1; }
        ;;
      --)
        shift
        while [[ \$# -gt 0 ]]; do prompt_args+=("\$1"); shift; done
        break
        ;;
      *)
        if [[ -z "\$key" ]]; then key="\$1"; else prompt_args+=("\$1"); fi
        shift
        ;;
    esac
  done

  [[ -n "\$key" && \${#prompt_args[@]} -gt 0 ]] || {
    echo "Usage: checkin.sh push [--target <name>] <key> <command...>" >&2
    exit 1
  }
  local prompt="\${prompt_args[*]}"

  local -a candidates=()
  if [[ -n "\$target" ]]; then
    candidates=("\$target")
  else
    local worktree ticket handle
    worktree=\$(worktree_for_story "\$key" || true)
    ticket=\$(ticket_for_story "\$key" || true)
    if [[ -n "\$worktree" ]]; then
      handle=\$(basename "\$worktree")
      candidates+=("\$handle")
    fi
    [[ -n "\$ticket" ]] && candidates+=("\$ticket")
    candidates+=("\$key")
  fi

  # ── Path A: workmux (preferred when installed) ─────────────────────────
  if command -v workmux >/dev/null 2>&1; then
    local list_out
    list_out=\$(workmux list --format name 2>/dev/null || true)
    local -a known=()
    local c
    for c in "\${candidates[@]}"; do
      if printf '%s\\n' "\$list_out" | grep -Fxq "\$c"; then
        known+=("\$c")
      fi
    done
    if [[ \${#known[@]} -eq 1 ]]; then
      workmux send "\${known[0]}" "\$prompt"
      log_event push story="\$key" target="\${known[0]}" via=workmux prompt="\$prompt"
      printf 'pushed via workmux to %s\\n' "\${known[0]}"
      return 0
    elif [[ \${#known[@]} -gt 1 ]]; then
      echo "ERROR: multiple workmux handles match candidates [\${candidates[*]}]: \${known[*]}" >&2
      echo "Pass --target <handle> to disambiguate." >&2
      exit 3
    fi
    # zero workmux matches → fall through to tmux
  fi

  # ── Path B: tmux fallback ──────────────────────────────────────────────
  if ! command -v tmux >/dev/null 2>&1; then
    echo "ERROR: no workmux match and tmux not installed — Story Leader for \$key must run '\$prompt' manually." >&2
    exit 2
  fi

  local windows
  windows=\$(tmux list-windows -a -F '#{session_name}:#{window_index} #{window_name}' 2>/dev/null || true)
  local -a matched=()
  local line name addr c
  for c in "\${candidates[@]}"; do
    while IFS= read -r line; do
      [[ -z "\$line" ]] && continue
      name="\${line##* }"
      addr="\${line%% *}"
      [[ "\$name" == "\$c" ]] && matched+=("\$addr")
    done <<< "\$windows"
  done

  # Dedupe while preserving order. Guard the iterations: matched and unique
  # may be empty (no candidate matched any window), and bash 4 \`set -u\`
  # would explode on \${matched[@]} / \${unique[@]} with no elements.
  local -a unique=()
  local m
  for m in \${matched[@]+"\${matched[@]}"}; do
    local seen=0 u
    for u in \${unique[@]+"\${unique[@]}"}; do [[ "\$u" == "\$m" ]] && { seen=1; break; }; done
    (( seen == 0 )) && unique+=("\$m")
  done

  if [[ \${#unique[@]} -eq 0 ]]; then
    echo "ERROR: no tmux window matches any candidate [\${candidates[*]}]. Story Leader for \$key must run '\$prompt' manually, or pass --target <session:window-or-name>." >&2
    exit 2
  fi
  if [[ \${#unique[@]} -gt 1 ]]; then
    echo "ERROR: multiple tmux windows match candidates [\${candidates[*]}]:" >&2
    printf '  %s\\n' "\${unique[@]}" >&2
    echo "Pass --target <session:window-or-name> to disambiguate." >&2
    exit 3
  fi

  tmux send-keys -t "\${unique[0]}" "\$prompt" Enter
  log_event push story="\$key" target="\${unique[0]}" via=tmux prompt="\$prompt"
  printf 'pushed via tmux to %s\\n' "\${unique[0]}"
}

case "\$ACTION" in
  post)    cmd_post    "\$@" ;;
  poll)    cmd_poll    "\$@" ;;
  approve) cmd_approve "\$@" ;;
  block)   cmd_block   "\$@" ;;
  status)  cmd_status  "\$@" ;;
  push)    cmd_push    "\$@" ;;
  archive) cmd_archive "\$@" ;;
  ""|help|-h|--help)
    sed -n '2,/^$/p' "\$0" | sed 's/^# \\{0,1\\}//'
    ;;
  *)
    echo "Unknown action: \$ACTION" >&2
    echo "Run checkin.sh --help" >&2
    exit 1
    ;;
esac
`,
    },
  ];
}
