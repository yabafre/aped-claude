export function guardrail(c) {
  const a = c.apedDir;
  const o = c.outputDir;
  return [
    {
      path: `${a}/hooks/guardrail.sh`,
      executable: true,
      content: `#!/usr/bin/env bash
# APED Guardrail — UserPromptSubmit hook
# Validates prompt coherence against pipeline state, existing artifacts, and memories.
# Returns JSON with "decision" and optionally "addToPrompt" to inject context.

set -euo pipefail

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
STATE_FILE="$PROJECT_ROOT/${o}/state.yaml"
CONFIG_FILE="$PROJECT_ROOT/${a}/config.yaml"
OUTPUT_DIR="$PROJECT_ROOT/${o}"

# Read stdin (JSON: {"session_id":"...","prompt":"..."})
INPUT=$(cat)
PROMPT=$(echo "$INPUT" | grep -o '"prompt":"[^"]*"' | sed 's/"prompt":"//;s/"$//' || echo "")

# If no prompt or empty, allow
if [[ -z "$PROMPT" ]]; then
  exit 0
fi

# ── Read current phase from state.yaml ──
CURRENT_PHASE="none"
if [[ -f "$STATE_FILE" ]]; then
  CURRENT_PHASE=$(grep 'current_phase:' "$STATE_FILE" | sed 's/.*current_phase:[[:space:]]*"\\{0,1\\}\\([^"]*\\)"\\{0,1\\}/\\1/' | tr -d ' ' || echo "none")
fi

# ── Read communication language from config ──
LANG="english"
if [[ -f "$CONFIG_FILE" ]]; then
  LANG=$(grep 'communication_language:' "$CONFIG_FILE" | sed 's/.*communication_language:[[:space:]]*//' | tr -d ' ' || echo "english")
fi

# ── Detect what the user is trying to do ──
PROMPT_LOWER=$(echo "$PROMPT" | tr '[:upper:]' '[:lower:]')

# Detect APED command invocations
WANTS_ANALYZE=false
WANTS_PRD=false
WANTS_EPICS=false
WANTS_DEV=false
WANTS_REVIEW=false
WANTS_ALL=false
WANTS_CODE=false

[[ "$PROMPT_LOWER" =~ (aped-a|/aped-a|analyze|analyse|research) ]] && WANTS_ANALYZE=true
[[ "$PROMPT_LOWER" =~ (aped-p|/aped-p|prd|product.req) ]] && WANTS_PRD=true
[[ "$PROMPT_LOWER" =~ (aped-e|/aped-e|epic|stories|story) ]] && WANTS_EPICS=true
[[ "$PROMPT_LOWER" =~ (aped-d|/aped-d|dev|implement|code|build|create.*component|create.*service) ]] && WANTS_DEV=true
[[ "$PROMPT_LOWER" =~ (aped-r|/aped-r|review|audit) ]] && WANTS_REVIEW=true
[[ "$PROMPT_LOWER" =~ (aped-all|/aped-all|full.pipeline|start.from.scratch) ]] && WANTS_ALL=true
WANTS_QUICK=false

[[ "$PROMPT_LOWER" =~ (aped-quick|/aped-quick|quick.fix|quick.feature|hotfix) ]] && WANTS_QUICK=true
[[ "$PROMPT_LOWER" =~ (code|implement|write.*function|create.*file|add.*feature|fix.*bug|refactor) ]] && WANTS_CODE=true

# ── Check artifact existence ──
HAS_BRIEF=false
HAS_PRD=false
HAS_EPICS=false

[[ -n "$(find "$OUTPUT_DIR" -name '*brief*' -o -name '*product-brief*' 2>/dev/null | head -1)" ]] && HAS_BRIEF=true
[[ -n "$(find "$OUTPUT_DIR" -name '*prd*' 2>/dev/null | head -1)" ]] && HAS_PRD=true
[[ -n "$(find "$OUTPUT_DIR" -name '*epic*' 2>/dev/null | head -1)" ]] && HAS_EPICS=true

# ── Phase-aware guardrail logic ──
WARNINGS=()

# Phase transition map: none → analyze → prd → ux → epics → dev ↔ review → done
PHASE_ORDER="none analyze prd ux epics dev review done"

phase_index() {
  local i=0
  for p in $PHASE_ORDER; do
    [[ "$p" == "$1" ]] && echo "$i" && return
    i=$((i + 1))
  done
  echo "0"
}

CURRENT_IDX=$(phase_index "$CURRENT_PHASE")

# Rule 0: Quick mode bypasses pipeline checks
if [[ "$WANTS_QUICK" == "true" ]]; then
  exit 0
fi

# Rule 1: Trying to code without epics/stories
if [[ "$WANTS_CODE" == "true" || "$WANTS_DEV" == "true" ]] && [[ "$CURRENT_PHASE" != "dev" && "$CURRENT_PHASE" != "review" ]]; then
  if [[ "$HAS_EPICS" == "false" ]]; then
    WARNINGS+=("SKIP_DETECTED: Attempting dev/code without epics. Current phase: $CURRENT_PHASE. Run /aped-a → /aped-p → /aped-e first.")
  elif [[ "$HAS_PRD" == "false" ]]; then
    WARNINGS+=("SKIP_DETECTED: Attempting dev/code without PRD. Current phase: $CURRENT_PHASE. Run /aped-a → /aped-p first.")
  fi
fi

# Rule 2: PRD without brief
if [[ "$WANTS_PRD" == "true" ]] && [[ "$HAS_BRIEF" == "false" ]] && [[ "$CURRENT_PHASE" != "prd" ]]; then
  WARNINGS+=("MISSING_ARTIFACT: No product brief found. Run /aped-a first to generate the brief.")
fi

# Rule 3: Epics without PRD
if [[ "$WANTS_EPICS" == "true" ]] && [[ "$HAS_PRD" == "false" ]]; then
  WARNINGS+=("MISSING_ARTIFACT: No PRD found. Run /aped-p first to generate the PRD.")
fi

# Rule 4: Review without dev
if [[ "$WANTS_REVIEW" == "true" ]] && [[ "$CURRENT_PHASE" != "dev" && "$CURRENT_PHASE" != "review" ]]; then
  WARNINGS+=("PREMATURE_REVIEW: No story has been developed yet. Run /aped-d first.")
fi

# Rule 5: Trying to modify upstream artifacts during dev
if [[ "$CURRENT_PHASE" == "dev" || "$CURRENT_PHASE" == "review" ]]; then
  if [[ "$WANTS_PRD" == "true" || "$WANTS_ANALYZE" == "true" ]]; then
    WARNINGS+=("SCOPE_CHANGE: You are in phase '$CURRENT_PHASE'. Modifying the PRD/brief now will invalidate existing epics and stories. Use /aped-r with correct-course protocol instead.")
  fi
fi

# Rule 6: Skipping phases
if [[ "$WANTS_DEV" == "true" ]] && [[ "$CURRENT_IDX" -lt 3 ]] && [[ "$WANTS_ALL" == "false" ]]; then
  if [[ "$CURRENT_PHASE" == "none" || "$CURRENT_PHASE" == "analyze" ]]; then
    WARNINGS+=("PHASE_SKIP: Jumping from '$CURRENT_PHASE' to dev skips critical pipeline steps. The pipeline ensures quality: Analyze → PRD → Epics → Dev.")
  fi
fi

# ── Build response ──
if [[ \${#WARNINGS[@]} -eq 0 ]]; then
  # No issues, allow silently
  exit 0
fi

# Build the addToPrompt context
CONTEXT="[APED GUARDRAIL — Pipeline Coherence Check]\\n"
CONTEXT+="Current phase: $CURRENT_PHASE\\n"
CONTEXT+="Artifacts: brief=\${HAS_BRIEF}, prd=\${HAS_PRD}, epics=\${HAS_EPICS}\\n"
CONTEXT+="\\nWarnings detected:\\n"

for w in "\${WARNINGS[@]}"; do
  CONTEXT+="  ⚠ $w\\n"
done

if [[ "$LANG" == "french" ]] || [[ "$LANG" == "français" ]]; then
  CONTEXT+="\\nINSTRUCTION: Signale ces avertissements à l'utilisateur en français AVANT d'exécuter quoi que ce soit. Explique le problème et propose le chemin correct dans le pipeline. Demande confirmation si l'utilisateur veut quand même continuer."
else
  CONTEXT+="\\nINSTRUCTION: Report these warnings to the user BEFORE executing anything. Explain the issue and suggest the correct pipeline path. Ask for confirmation if the user wants to proceed anyway."
fi

# Output JSON with addToPrompt — does not block, but injects context
printf '{"addToPrompt": "%s"}' "$CONTEXT"
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
            "command": "${a}/hooks/guardrail.sh"
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
