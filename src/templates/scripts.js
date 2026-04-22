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
    // ── Parallel Sprint helpers ────────────────────────────────────────────
    {
      path: `${a}/scripts/sprint-dispatch.sh`,
      executable: true,
      content: `#!/usr/bin/env bash
# APED sprint-dispatch — create a git worktree for a story so the user can
# launch a dedicated Claude Code session in it with /aped-dev.
#
# Usage: sprint-dispatch.sh <story-key> [<ticket-id>]
#
# Output: absolute path of the new worktree (stdout, line 1)
# Exit: 0 on success; 1 on user error; 2 on git error; 3 on concurrent dispatch.
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
  echo "Usage: \$0 <story-key> [<ticket-id>]" >&2
  exit 1
fi

STORY_KEY="\$1"
TICKET_ID="\${2:-\$STORY_KEY}"

PROJECT_ROOT="\${CLAUDE_PROJECT_DIR:-\$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
if [[ ! -d "\$PROJECT_ROOT/.git" ]] && ! git -C "\$PROJECT_ROOT" rev-parse --git-dir >/dev/null 2>&1; then
  echo "ERROR: \$PROJECT_ROOT is not inside a git repo" >&2
  exit 2
fi

# ── Fleet-lock (per-story, portable mkdir) ───────────────────────────────
SPRINT_LOCK_DIR="\$PROJECT_ROOT/${a}/.sprint-locks/\$STORY_KEY"
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
    echo "WARN: stale dispatch lock for \$STORY_KEY (age \${age}s > \${SPRINT_LOCK_STALE_SECONDS}s) — previous dispatch likely crashed. Reclaiming." >&2
    rm -rf "\$SPRINT_LOCK_DIR"
  fi
fi

waited=0
until mkdir "\$SPRINT_LOCK_DIR" 2>/dev/null; do
  if (( waited >= SPRINT_LOCK_TIMEOUT_SECONDS * 10 )); then
    echo "ERROR: another /aped-sprint session is dispatching \$STORY_KEY (lock: \$SPRINT_LOCK_DIR). Wait for it to finish and retry, or remove the lock if you're certain it's stale." >&2
    exit 3
  fi
  sleep 0.1
  waited=\$((waited + 1))
done
# Clear the lock on any exit (success, error, signal). Keep it if the whole
# dispatch succeeded so a later replay catches the collision — no, release
# unconditionally: a successful dispatch means the worktree now exists, and
# the "path already exists" check below becomes the next safety net.
trap "rm -rf '\$SPRINT_LOCK_DIR' 2>/dev/null || true" EXIT INT TERM

PROJECT_NAME=\$(basename "\$PROJECT_ROOT")
WORKTREE_PATH="\$(dirname "\$PROJECT_ROOT")/\${PROJECT_NAME}-\${TICKET_ID}"
BRANCH_NAME="feature/\${TICKET_ID}-\${STORY_KEY}"

if [[ -d "\$WORKTREE_PATH" ]]; then
  echo "ERROR: worktree path already exists: \$WORKTREE_PATH" >&2
  exit 2
fi

cd "\$PROJECT_ROOT"

if git rev-parse --verify "\$BRANCH_NAME" >/dev/null 2>&1; then
  git worktree add "\$WORKTREE_PATH" "\$BRANCH_NAME" >&2
else
  git worktree add -b "\$BRANCH_NAME" "\$WORKTREE_PATH" HEAD >&2
fi

mkdir -p "\$WORKTREE_PATH/${a}"
cat > "\$WORKTREE_PATH/${a}/WORKTREE" <<EOF
story_key: \$STORY_KEY
ticket: \$TICKET_ID
branch: \$BRANCH_NAME
project_root: \$PROJECT_ROOT
created_at: \$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF

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
# Usage: worktree-cleanup.sh <worktree-path> [--delete-branch]

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <worktree-path> [--delete-branch]" >&2
  exit 1
fi

WORKTREE_PATH="$1"
DELETE_BRANCH=false
[[ "\${2:-}" == "--delete-branch" ]] && DELETE_BRANCH=true

if [[ ! -d "$WORKTREE_PATH" ]]; then
  echo "No such worktree: $WORKTREE_PATH" >&2
  exit 0
fi

# Read branch name from marker or from git
BRANCH_NAME=""
if [[ -f "$WORKTREE_PATH/${a}/WORKTREE" ]]; then
  BRANCH_NAME=$(grep '^branch:' "$WORKTREE_PATH/${a}/WORKTREE" | sed 's/.*:[[:space:]]*//')
fi

git worktree remove "$WORKTREE_PATH" 2>&1 || {
  echo "Remove failed — forcing (uncommitted changes will be lost)" >&2
  git worktree remove --force "$WORKTREE_PATH"
}

if [[ "$DELETE_BRANCH" == "true" && -n "$BRANCH_NAME" ]]; then
  git branch -D "$BRANCH_NAME" 2>&1 || echo "Branch $BRANCH_NAME already gone or not fully merged"
fi

git worktree prune
echo "Cleaned up $WORKTREE_PATH"
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
#             3 invalid command, 4 state.yaml missing or unreadable.

set -u
set -o pipefail

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
# All mutations flow through write_atomic: snapshot the current file to
# BACKUP_FILE, write the new content to a .tmp sibling, then rename. mv
# within the same filesystem is atomic on POSIX — a crash mid-write leaves
# either the old state (if before rename) or the new state (if after), but
# never a truncated file. BACKUP_FILE is the one-deep safety net: doctor
# can offer to restore if the current file is unreadable.
write_atomic() {
  local new_content_path="\$1"
  cp -f "\$STATE_FILE" "\$BACKUP_FILE" 2>/dev/null || true
  mv -f "\$new_content_path" "\$STATE_FILE"
  # Best-effort fsync via dd (POSIX tool). Silent if unavailable.
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
  # We enter "in_story" when we see "    KEY:" at the story-header depth and
  # leave when we hit another header at the same depth or a shallower line.
  # Inside the story, any line matching "<indent>FIELD:" is rewritten,
  # preserving the exact original indentation of that field (capture via awk
  # match() and substr on RSTART of the leading spaces).
  awk -v k="\$key" -v f="\$field" -v v="\$value" '
    function is_story_header(s,    idx) {
      # "    KEY:" (4+ leading spaces, the key token, trailing colon)
      return match(s, "^[[:space:]]+[A-Za-z0-9_-]+:[[:space:]]*\$")
    }
    BEGIN { in_story = 0 }
    {
      line = \$0
      if (match(line, "^([[:space:]]+)" k ":[[:space:]]*\$")) {
        in_story = 1
        print line
        next
      }
      if (in_story && is_story_header(line)) {
        in_story = 0
      }
      if (in_story && match(line, "^([[:space:]]+)" f ":[[:space:]]")) {
        # RSTART=1, RLENGTH covers "<indent>field: "; grab the indent only by
        # splitting on the field name token.
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
    "")
      echo "ERROR: no command on stdin" >&2
      return 3
      ;;
    *)
      echo "ERROR: unknown command '\$cmd' (known: set-scope-change | set-story-status | set-story-worktree | clear-story-worktree)" >&2
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
# APED validate-state — check that state.yaml is syntactically valid and
# every story status is in the allowed whitelist. Skills call this at
# Setup so a hand-edited or half-corrupted state.yaml produces a clear
# message instead of silent grep/awk failures downstream.
#
# Exit codes:
#   0 ok
#   1 state.yaml missing
#   2 yaml parse error (if yq is available)
#   3 invalid status value

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
  local key="\$1"
  [[ -f "\$STATE_FILE" ]] || return 1
  awk -v k="\$key" '
    \$0 ~ "^    " k ":" { in_story=1; next }
    in_story && /^    [a-zA-Z0-9_-]+:/ { in_story=0 }
    in_story && \$1 == "ticket:" {
      gsub(/"/, "", \$2); print \$2; exit
    }
  ' "\$STATE_FILE"
}

# ── Validation ────────────────────────────────────────────────────────────
validate_kind() {
  case "\$1" in
    story-ready|dev-done|review-done) ;;
    *) echo "Invalid kind: \$1 (expected story-ready | dev-done | review-done)" >&2; exit 1 ;;
  esac
}

now_iso() {
  date -u +%Y-%m-%dT%H:%M:%SZ
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
    for kind in story-ready dev-done review-done; do
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
    for entry in "\${pending[@]}"; do
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

cmd_push() {
  local key="\${1:-}"; shift || true
  [[ -n "\$key" && \$# -gt 0 ]] || { echo "Usage: checkin.sh push <key> <command...>" >&2; exit 1; }
  local prompt="\$*"

  # Derive the tmux target window from the story's ticket (workmux naming default).
  local ticket
  ticket=\$(ticket_for_story "\$key" || true)
  [[ -n "\$ticket" ]] || { echo "No ticket found for \$key — cannot push." >&2; exit 1; }

  if ! command -v tmux >/dev/null 2>&1; then
    echo "tmux not available — Story Leader must invoke next command manually (\$prompt)." >&2
    exit 2
  fi

  # Try to send to any tmux window matching the ticket name (across sessions).
  local targets
  targets=\$(tmux list-windows -a -F '#{session_name}:#{window_index} #{window_name}' 2>/dev/null | awk -v n="\$ticket" '\$NF == n {print \$1}' || true)
  if [[ -z "\$targets" ]]; then
    echo "No tmux window named '\$ticket' found — Story Leader must invoke next command manually." >&2
    exit 2
  fi

  local first_target
  first_target=\$(echo "\$targets" | head -1)
  tmux send-keys -t "\$first_target" "\$prompt" Enter
  printf 'pushed to %s\\n' "\$first_target"
}

case "\$ACTION" in
  post)    cmd_post    "\$@" ;;
  poll)    cmd_poll    "\$@" ;;
  approve) cmd_approve "\$@" ;;
  block)   cmd_block   "\$@" ;;
  status)  cmd_status  "\$@" ;;
  push)    cmd_push    "\$@" ;;
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
