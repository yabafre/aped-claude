---
name: aped-claude
description: 'Use when user says "update CLAUDE.md", "sync claude rules", "aped claude", or invokes /aped-claude. Merges — never overwrites user customizations.'
license: MIT
metadata:
  author: yabafre
  version: {{CLI_VERSION}}
---

# APED Claude — CLAUDE.md Sync

Inject and maintain APED working rules in the project's `CLAUDE.md`. Smart merge — never overwrites user customizations.

## Critical Rules

- NEVER overwrite the entire CLAUDE.md — always merge
- Use marker comments to delimit APED-managed sections: `<!-- APED:START -->` and `<!-- APED:END -->`
- User content outside markers is sacred — never touch it
- Discuss with the user before applying changes if CLAUDE.md is non-trivial

## Setup

1. Read `{{APED_DIR}}/config.yaml` — extract `project_name`, `user_name`, `communication_language`
2. Check if `CLAUDE.md` exists at the project root

## Mode Detection

### Case A: No CLAUDE.md exists
- Create one from scratch with the full APED block (see Template below)
- Wrap the entire APED content in `<!-- APED:START -->` ... `<!-- APED:END -->` markers
- Add a header line and brief project description above the markers

### Case B: CLAUDE.md exists with APED markers
- Locate the `<!-- APED:START -->` and `<!-- APED:END -->` block
- Replace ONLY the content between markers with the latest APED block
- Leave everything else untouched

### Case C: CLAUDE.md exists WITHOUT APED markers
- Show the user the current CLAUDE.md content
- Ask: "Where should I inject the APED section? Options:"
  - **Top** — before existing content
  - **Bottom** — after existing content
  - **Custom** — point to a specific heading to insert before/after
- ⏸ GATE: Wait for user choice
- Insert the APED block (wrapped in markers) at the chosen location

## APED Block Template

The block to inject (between `<!-- APED:START -->` and `<!-- APED:END -->`) contains:

### Section 1: Project Header
- Project name from config
- One-line description: "Uses the APED Method — disciplined user-driven dev pipeline"
- Pipeline diagram: `Analyze → PRD → UX → Architecture → Epics → Story → Dev → Review`

### Section 2: Working Rules

**1. Plan Mode Default**
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

**2. Subagent Strategy**
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

**3. Self-Improvement Loop**
- After ANY correction from the user: update `{{OUTPUT_DIR}}/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Review lessons at session start

**4. Verification Before Done**
- Never mark a task complete without proving it works
- Run tests, check logs, demonstrate correctness
- Ask: "Would a staff engineer approve this?"

**5. Demand Elegance (Balanced)**
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: implement the elegant solution
- Skip for simple, obvious fixes — don't over-engineer

**6. Autonomous Bug Fixing**
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them

### Section 3: APED-Specific Rules

**7. Never Auto-Chain Phases** — Each APED skill ends with "Run /aped-X when ready". STOP. Wait for user.

**8. Validate Before Persisting** — Never write artifacts to `{{OUTPUT_DIR}}/` until the user has explicitly validated.

**9. Story-Driven Dev** — Never code without a story file. Use `/aped-story` first. Use the epic context cache.

**10. Frontend = Visual Verification** — Detect frontend stories. Use `mcp__react-grab-mcp__get_element_context` at every GREEN pass.

### Section 4: Task Management
1. **Plan First** — TaskCreate with checkable items
2. **Verify Plan** — Check in with user before implementation
3. **Track Progress** — TaskUpdate as you complete items
4. **Document Results** — Update story file's Dev Agent Record
5. **Capture Lessons** — Update `{{OUTPUT_DIR}}/lessons.md` after corrections

### Section 5: Core Principles
- **Simplicity First** — minimal code impact
- **No Laziness** — root causes, no temporary fixes
- **User Controls Pace** — collaborative, not automated
- **Quality > Speed** — validation gates exist for a reason

### Section 6: Project State
- Engine: `{{APED_DIR}}/` (immutable after install)
- Artifacts: `{{OUTPUT_DIR}}/` (evolves during project)
- State machine: `{{OUTPUT_DIR}}/state.yaml`
- Lessons: `{{OUTPUT_DIR}}/lessons.md`
- Project: {{project_name}} ({{user_name}}, {{communication_language}})

### Section 7: Skill Invocation Discipline

Render this section only if `aped/config.yaml` has `skill_invocation_discipline.enabled: true` (default `true`). When disabled, omit Section 7 entirely and renumber Section 8 to Section 7.

> *(Lifted verbatim from Superpowers' `using-superpowers` Iron Law — Meincke et al. 2025 research shows imperative authority language drives compliance from 33% to 72%. Do not weaken with qualifiers.)*

#### The 1% rule

**If you think there is even a 1% chance an APED skill might apply to what you are doing, you ABSOLUTELY MUST invoke the skill.**

**IF AN APED SKILL APPLIES TO YOUR TASK, YOU DO NOT HAVE A CHOICE. YOU MUST USE IT.**

This is not negotiable. This is not optional. You cannot rationalize your way out of this.

Invoke relevant or requested skills BEFORE any response or action — including clarifying questions and codebase exploration. Even a 1% chance a skill might apply means you should invoke it to check. If an invoked skill turns out to be wrong for the situation, you don't need to use it.

#### Red Flags — these thoughts mean STOP, you're rationalizing

| Thought | Reality |
|---------|---------|
| "This is just a simple question" | Questions are tasks. Check for skills. |
| "I need more context first" | Skill check comes BEFORE clarifying questions. |
| "Let me explore the codebase first" | Skills tell you HOW to explore. Check first. |
| "I can check git/files quickly" | Files lack conversation context. Check for skills. |
| "Let me gather information first" | Skills tell you HOW to gather information. |
| "This doesn't need a formal skill" | If a skill exists, use it. |
| "I remember this skill" | Skills evolve. Read the current version. |
| "This doesn't count as a task" | Action = task. Check for skills. |
| "The skill is overkill" | Simple things become complex. Use it. |
| "I'll just do this one thing first" | Check BEFORE doing anything. |
| "This feels productive" | Undisciplined action wastes time. Skills prevent this. |
| "I know what that means" | Knowing the concept ≠ using the skill. Invoke it. |

#### Instruction priority

APED skills override default system-prompt behavior, but **user instructions always take precedence**:

1. **User's explicit instructions** (CLAUDE.md, `aped/config.yaml`, direct requests) — highest priority.
2. **APED skills** (`/aped-*` slash commands and their templates) — override default system behavior where they conflict.
3. **Default system prompt** — lowest priority.

If CLAUDE.md, `aped/config.yaml`, or a direct user request says "skip the TDD gate for this hotfix" and `/aped-dev` says "always RED first", **follow the user's instructions**. The user is in control. Record the override and the reason; don't bake it into a new skill.

#### Skill priority order

When multiple skills could apply, use this order:

1. **Process skills first** (`/aped-brainstorm`, `/aped-debug`, `/aped-receive-review`, `/aped-review`) — these determine HOW to approach the task.
2. **Implementation skills second** (`/aped-dev`, `/aped-story`, `/aped-epics`, `/aped-arch`) — these guide execution.

#### Skill types

**Rigid** (`/aped-dev`, `/aped-debug`, `/aped-review`, `/aped-receive-review`): follow exactly. Don't adapt away the discipline. The Iron Laws are not stylistic preferences.

**Flexible** (`/aped-brainstorm`, `/aped-arch`): adapt principles to context. The skill itself tells you which.

### Section 8: Slash Commands Cheat Sheet

| Pipeline | Utility |
|----------|---------|
| /aped-analyze | /aped-status |
| /aped-prd | /aped-course |
| /aped-ux | /aped-context |
| /aped-arch | /aped-qa |
| /aped-epics | /aped-quick |
| /aped-story | /aped-check |
| /aped-dev | /aped-claude |
| /aped-review | /aped-debug |
| /aped-receive-review | |

## Lessons File

Also ensure `{{OUTPUT_DIR}}/lessons.md` exists. If missing, create it with the template:

```markdown
# Lessons Learned

Patterns from user corrections — so the same mistake isn't made twice.

## Format
- **Date:** YYYY-MM-DD
- **Mistake:** What I did wrong
- **Correction:** What the user told me
- **Rule:** The pattern to apply going forward

## Entries

<!-- Add new entries at the top -->
```

## Discussion with User

Before writing, present a summary:
- "Will create CLAUDE.md from scratch" (Case A)
- "Will update existing APED block (lines X-Y)" (Case B)
- "Will inject APED block at the {location}" (Case C)

⏸ **GATE: User confirms before any write.**

## Output

1. Write/update `CLAUDE.md` with the APED block in markers
2. Ensure `{{OUTPUT_DIR}}/lessons.md` exists
3. Report what changed (lines added/updated)

## Common Issues

- **CLAUDE.md has conflicting rules**: Discuss with user — APED rules vs existing rules. User decides which wins.
- **CLAUDE.md is huge (>500 lines)**: Show only the diff, not the full file. Confirm before write.
- **User wants to remove APED block**: Just delete the markers and content between them. The skill won't re-add unless explicitly invoked.

## Next Step

Tell the user: "CLAUDE.md updated. APED block is now at lines X-Y. Re-run `/aped-claude` anytime to refresh after APED updates."
