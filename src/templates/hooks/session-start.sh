#!/usr/bin/env bash
# APED SessionStart hook (opt-in via `aped-method session-start`).
#
# Reads {{APED_DIR}}/skills/SKILL-INDEX.md and emits it as Claude Code
# `SessionStart` `additionalContext`, so the agent sees an APED skill
# inventory at the start of every session/clear/compact event.
#
# Silent (exit 0, no stdout) when the index is missing — keeps a partial
# install or pre-scaffold state harmless.
#
# Cross-platform note: design mirrors superpowers' polyglot wrapper
# pattern. On Windows, the matching `run-hook.cmd` (if installed) calls
# Git-for-Windows bash to execute this script. On macOS / Linux this
# script runs directly via the shebang.

set -u
set -o pipefail

# Locate the project root. Claude Code sets CLAUDE_PROJECT_DIR for hooks;
# fall back to git toplevel, then to PWD.
PROJECT_ROOT="${CLAUDE_PROJECT_DIR:-}"
if [[ -z "$PROJECT_ROOT" ]]; then
  PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
fi

# Discover the APED dir. Default is .aped (matches DEFAULTS.apedDir) but
# honour {{APED_DIR}} substitution at scaffold time so non-default dirs
# also work without re-editing the script.
APED_DIR="{{APED_DIR}}"
INDEX_FILE="${PROJECT_ROOT}/${APED_DIR}/skills/SKILL-INDEX.md"

if [[ ! -f "$INDEX_FILE" ]]; then
  # Index not generated (e.g. partial install) — emit nothing, exit clean.
  exit 0
fi

CONTENT=$(cat "$INDEX_FILE" 2>/dev/null || true)

if [[ -z "$CONTENT" ]]; then
  exit 0
fi

# Escape for JSON embedding. Bash parameter substitution is faster than
# a per-character loop and matches the superpowers session-start hook
# implementation.
escape_for_json() {
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\r'/\\r}"
  s="${s//$'\t'/\\t}"
  printf '%s' "$s"
}

ESCAPED=$(escape_for_json "$CONTENT")

# Emit Claude Code SessionStart hook envelope.
# Uses printf rather than heredoc to avoid bash 5.3+ heredoc hangs on
# some hosts (cf. obra/superpowers#571).
printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$ESCAPED"

exit 0
