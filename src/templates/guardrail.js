export function guardrail(c) {
  const a = c.apedDir;
  const o = c.outputDir;
  return [
    {
      path: `${a}/hooks/guardrail.sh`,
      executable: true,
      content: `#!/usr/bin/env bash
# APED Guardrail — UserPromptSubmit hook
# Injects pipeline coherence warnings into Claude's context.
# Does NOT block — warns and asks for confirmation.
#
# stdin: JSON with hook_event_name + prompt
# stdout: JSON with hookSpecificOutput.additionalContext
# exit 0 = allow (always), context injection is advisory

# No set -e: grep returns 1 on no match, which is expected behavior.
# No set -u: some variables are intentionally unset.
# No pipefail: same reason as -e.

# ── Read stdin JSON ──
INPUT=""
if ! read -r -t 2 INPUT; then
  exit 0
fi

# Extract prompt (jq preferred, fallback to grep)
PROMPT=""
if command -v jq &>/dev/null; then
  PROMPT=$(printf '%s' "$INPUT" | jq -r '.prompt // empty' 2>/dev/null) || true
else
  PROMPT=$(printf '%s' "$INPUT" | grep -o '"prompt":"[^"]*"' | sed 's/"prompt":"//;s/"$//' 2>/dev/null) || true
fi

# If no prompt or empty, allow silently
if [[ -z "$PROMPT" ]]; then
  exit 0
fi

# ── Resolve paths ──
PROJECT_ROOT="\${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
STATE_FILE="$PROJECT_ROOT/${o}/state.yaml"
CONFIG_FILE="$PROJECT_ROOT/${a}/config.yaml"
OUTPUT_DIR="$PROJECT_ROOT/${o}"

# ── Read current phase from state.yaml ──
CURRENT_PHASE="none"
if [[ -f "$STATE_FILE" ]]; then
  PHASE_LINE=$(grep 'current_phase:' "$STATE_FILE" 2>/dev/null || echo "")
  if [[ -n "$PHASE_LINE" ]]; then
    CURRENT_PHASE=$(echo "$PHASE_LINE" | sed 's/.*current_phase:[[:space:]]*//;s/"//g;s/^[[:space:]]*//;s/[[:space:]]*$//' || echo "none")
  fi
fi

# ── Read communication language from config ──
COMM_LANG="english"
if [[ -f "$CONFIG_FILE" ]]; then
  LANG_LINE=$(grep 'communication_language:' "$CONFIG_FILE" 2>/dev/null || echo "")
  if [[ -n "$LANG_LINE" ]]; then
    COMM_LANG=$(echo "$LANG_LINE" | sed 's/.*communication_language:[[:space:]]*//' | tr -d ' ' || echo "english")
  fi
fi

# ── Detect intent from prompt ──
PROMPT_LOWER=$(echo "$PROMPT" | tr '[:upper:]' '[:lower:]')

WANTS_ANALYZE=false
WANTS_PRD=false
WANTS_EPICS=false
WANTS_DEV=false
WANTS_REVIEW=false
WANTS_QUICK=false
WANTS_CODE=false

echo "$PROMPT_LOWER" | grep -qE '(aped-analyze|/aped-analyze|analyze|analyse|research)' && WANTS_ANALYZE=true
echo "$PROMPT_LOWER" | grep -qE '(aped-prd|/aped-prd|prd|product.req)' && WANTS_PRD=true
echo "$PROMPT_LOWER" | grep -qE '(aped-epics|/aped-epics|epic|stories|story)' && WANTS_EPICS=true
echo "$PROMPT_LOWER" | grep -qE '(aped-dev|/aped-dev|dev|implement|build|create.*component|create.*service)' && WANTS_DEV=true
echo "$PROMPT_LOWER" | grep -qE '(aped-review|/aped-review|review|audit)' && WANTS_REVIEW=true
echo "$PROMPT_LOWER" | grep -qE '(aped-quick|/aped-quick|quick.fix|quick.feature|hotfix)' && WANTS_QUICK=true
echo "$PROMPT_LOWER" | grep -qE '(code|implement|write.*function|create.*file|add.*feature|fix.*bug|refactor)' && WANTS_CODE=true

# ── Check artifact existence ──
HAS_BRIEF=false
HAS_PRD=false
HAS_EPICS=false

if [[ -d "$OUTPUT_DIR" ]]; then
  test -n "$(find "$OUTPUT_DIR" -maxdepth 1 -name '*brief*' 2>/dev/null | head -1)" && HAS_BRIEF=true
  test -n "$(find "$OUTPUT_DIR" -maxdepth 1 -name '*prd*' 2>/dev/null | head -1)" && HAS_PRD=true
  test -n "$(find "$OUTPUT_DIR" -maxdepth 1 -name '*epic*' 2>/dev/null | head -1)" && HAS_EPICS=true
fi

# ── Derive effective phase ──
# "sprint" covers the entire story/dev/review cycle
IN_SPRINT=false
if [[ "$CURRENT_PHASE" == "sprint" ]]; then
  IN_SPRINT=true
fi

# Also check story statuses as fallback (if current_phase wasn't updated properly)
HAS_STORY_IN_REVIEW=false
if [[ -f "$STATE_FILE" ]]; then
  grep -q 'status:.*\\(in-progress\\|review\\|ready-for-dev\\)' "$STATE_FILE" 2>/dev/null && IN_SPRINT=true
  grep -q 'status:.*review' "$STATE_FILE" 2>/dev/null && HAS_STORY_IN_REVIEW=true
fi

# ── Phase-aware guardrail logic ──
WARNINGS=""

# Rule 0: Quick mode bypasses pipeline checks
if [[ "$WANTS_QUICK" == "true" ]]; then
  exit 0
fi

# Rule 1: Trying to code without going through the pipeline
if [[ "$WANTS_CODE" == "true" || "$WANTS_DEV" == "true" ]] && [[ "$IN_SPRINT" == "false" ]]; then
  if [[ "$HAS_EPICS" == "false" ]]; then
    WARNINGS="$WARNINGS\\nSKIP_DETECTED: Attempting dev/code without epics. Current phase: $CURRENT_PHASE. Run /aped-analyze, /aped-prd, /aped-epics first."
  elif [[ "$HAS_PRD" == "false" ]]; then
    WARNINGS="$WARNINGS\\nSKIP_DETECTED: Attempting dev/code without PRD. Current phase: $CURRENT_PHASE. Run /aped-analyze, /aped-prd first."
  fi
fi

# Rule 2: PRD without brief
if [[ "$WANTS_PRD" == "true" ]] && [[ "$HAS_BRIEF" == "false" ]] && [[ "$CURRENT_PHASE" != "prd" ]]; then
  WARNINGS="$WARNINGS\\nMISSING_ARTIFACT: No product brief found. Run /aped-analyze first."
fi

# Rule 3: Epics without PRD
if [[ "$WANTS_EPICS" == "true" ]] && [[ "$HAS_PRD" == "false" ]]; then
  WARNINGS="$WARNINGS\\nMISSING_ARTIFACT: No PRD found. Run /aped-prd first."
fi

# Rule 4: Review without a story in review status
if [[ "$WANTS_REVIEW" == "true" ]] && [[ "$HAS_STORY_IN_REVIEW" == "false" ]]; then
  WARNINGS="$WARNINGS\\nPREMATURE_REVIEW: No story in review status. Run /aped-dev first."
fi

# Rule 5: Modifying upstream during sprint
if [[ "$IN_SPRINT" == "true" ]]; then
  if [[ "$WANTS_PRD" == "true" || "$WANTS_ANALYZE" == "true" ]]; then
    WARNINGS="$WARNINGS\\nSCOPE_CHANGE: Sprint is active. Modifying PRD/brief invalidates epics and stories. Use /aped-course instead."
  fi
fi

# Rule 6: Skipping phases — dev without completing planning
if [[ "$WANTS_DEV" == "true" ]] && [[ "$IN_SPRINT" == "false" ]] && [[ "$HAS_EPICS" == "true" ]]; then
  WARNINGS="$WARNINGS\\nPHASE_SKIP: Epics exist but sprint not started. Run /aped-epics to finalize and enter sprint phase."
fi

# ── No warnings = allow silently ──
if [[ -z "$WARNINGS" ]]; then
  exit 0
fi

# ── Build context for Claude ──
CONTEXT="[APED GUARDRAIL] Pipeline coherence check."
CONTEXT="$CONTEXT Current phase: $CURRENT_PHASE | Artifacts: brief=$HAS_BRIEF, prd=$HAS_PRD, epics=$HAS_EPICS"
CONTEXT="$CONTEXT Warnings:$WARNINGS"

if [[ "$COMM_LANG" == "french" ]] || [[ "$COMM_LANG" == "français" ]]; then
  CONTEXT="$CONTEXT INSTRUCTION: Signale ces avertissements a l utilisateur en francais AVANT d executer quoi que ce soit. Explique le probleme et propose le chemin correct. Demande confirmation pour continuer."
else
  CONTEXT="$CONTEXT INSTRUCTION: Report these warnings to the user BEFORE executing anything. Explain the issue and suggest the correct pipeline path. Ask for confirmation to proceed."
fi

# ── Output using official Claude Code hook format ──
# UserPromptSubmit: additionalContext injects context into Claude's prompt
# Does NOT block — advisory warnings only
# Use jq for safe JSON encoding if available, fallback to manual escaping
if command -v jq &>/dev/null; then
  ESCAPED=$(printf '%s' "$CONTEXT" | jq -Rs '.')
  printf '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":%s}}' "$ESCAPED"
else
  # Manual escaping: backslash, quotes, control chars
  ESCAPED=$(printf '%s' "$CONTEXT" | sed 's/\\\\/\\\\\\\\/g;s/"/\\\\"/g;s/	/\\\\t/g' | tr '\\n' ' ')
  printf '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"%s"}}' "$ESCAPED"
fi
`,
    },
    {
      path: `.claude/settings.local.json`,
      content: `{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/${a}/hooks/guardrail.sh"
          }
        ]
      }
    ]
  }
}
`,
    },
  ];
}
