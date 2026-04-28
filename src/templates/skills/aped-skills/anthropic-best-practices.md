# APED Skill Authoring — Anthropic Best Practices (Reference)

> Reference document. No `description:` triggers — this file is read on demand from other APED skills (e.g. `/aped-claude` when generating new skills, `/aped-retro` when refining existing ones).

This file captures the Anthropic-recommended best practices for writing skills, adapted to APED's `/aped-*` namespacing. Lifted from `obra/superpowers` writing-skills with project-specific adjustments.

## Contents

- Concise principle (default assumption: Claude is already smart)
- Degrees of freedom (high / medium / low — match specificity to task fragility)
- Naming conventions (gerunds preferred; APED uses `aped-{verb}` form)
- Description writing (third person, CSO principle: triggers only)
- The No-Placeholders rule (banned tokens, lint enforcement)
- Progressive disclosure (one level deep from the SKILL file)

## Core principles

### Concise is key

The context window is a public good. An APED skill shares the context window with everything else: the system prompt, conversation history, other skills' metadata, the user's actual request. Not every token in your skill has an immediate cost — at startup, only the metadata (`name` and `description`) of every skill is pre-loaded; the body is read only when the skill becomes relevant. But once it is loaded, every token competes with conversation history.

**Default assumption: Claude is already very smart.**

Only add context Claude doesn't already have. Challenge each piece of information:
- "Does Claude really need this explanation?"
- "Can I assume Claude knows this?"
- "Does this paragraph justify its token cost?"

**Concise** (~50 tokens):
```markdown
## Extract PDF text

Use pdfplumber for text extraction:

`​`​`python
import pdfplumber

with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
`​`​`
```

**Too verbose** (~150 tokens) — explains what PDFs are, why we recommend pdfplumber, how to install it. The concise version assumes Claude knows what PDFs are and how libraries work.

### Set appropriate degrees of freedom

Match the level of specificity to the task's fragility and variability.

**High freedom** (text-based instructions) — multiple approaches valid, decisions depend on context, heuristics guide the approach. Example: APED's `/aped-review` Lead role has high freedom — it dispatches specialists by file surface, merges findings by judgment.

**Medium freedom** (pseudocode or scripts with parameters) — a preferred pattern exists, some variation is acceptable, configuration affects behaviour. Example: APED's `/aped-dev` TDD cycle is medium freedom — RED→GREEN→REFACTOR is mandated, but the test framework and assertions are project-specific.

**Low freedom** (specific scripts, few or no parameters) — operations are fragile and error-prone, consistency is critical, a specific sequence must be followed. Example: APED's `/aped-ship` git release flow is low freedom — the exact commands and the workflow_dispatch route are mandated.

**Analogy:** Think of Claude as a robot exploring a path:
- **Narrow bridge with cliffs on both sides** — only one safe way forward. Provide specific guardrails and exact instructions (low freedom).
- **Open field with no hazards** — many paths lead to success. Give general direction and trust Claude to find the best route (high freedom).

## Naming conventions

Anthropic recommends **gerund form** (verb + -ing) for skill names — clearly describes the activity or capability the skill provides.

**Anthropic's good examples (gerund form):**
- "Processing PDFs"
- "Analyzing spreadsheets"
- "Managing databases"
- "Testing code"
- "Writing documentation"

**APED naming convention (project-specific):**

APED skills follow `aped-{verb-or-noun}` for namespace consistency and slash-command ergonomics (`/aped-dev`, `/aped-review`, `/aped-debug`). The CLI form takes precedence over pure gerund — but the **internal section headings** within a skill should still use action-oriented language ("Phase 1 — Reproduce", "Step 4 — Dispatch Specialists").

**APED examples:**
- `aped-dev` (TDD story implementation)
- `aped-review` (adversarial code review)
- `aped-debug` (systematic debugging)
- `aped-receive-review` (receiving review feedback)
- `aped-brainstorm` (divergent ideation)

**Avoid:**
- Vague names: "Helper", "Utils", "Tools", "Process"
- Overly generic: "Documents", "Data", "Files"
- Inconsistent patterns within the APED collection

## Writing effective descriptions

The `description:` frontmatter field enables skill discovery and **must include both what the skill does and when to use it**.

### Always write in third person

The description is injected into the system prompt; inconsistent point-of-view causes discovery problems.

- **Good:** "Processes Excel files and generates reports"
- **Avoid:** "I can help you process Excel files"
- **Avoid:** "You can use this to process Excel files"

### CSO principle — Conditions for use, Symptoms, Outputs

Each skill has exactly one description field. The description is critical for skill selection: Claude uses it to choose the right skill from potentially 100+ available skills. Your description must provide enough detail for Claude to know when to select this skill, while the rest of the skill body provides the implementation details.

The **CSO description principle**: triggers only, no workflow summary.

- **C** — *Conditions* — when to use it (verbatim user phrases that signal the trigger)
- **S** — *Symptoms* — observable signals in the conversation that indicate this skill applies, even if the user did not name it explicitly
- **O** — *Outputs* — what the skill produces, named once so other skills know they can chain off it

**Don't** include the workflow summary in the description — that belongs in the body. The description is for **routing**, not for documentation.

### APED examples

```yaml
description: 'Use when user says "debug", "troubleshoot", "why is X failing", "find the root cause", "aped debug", or invokes /aped-debug. Also invoked from /aped-dev on persistent test red (≥3 failed attempts) and from /aped-review on findings that need root-cause investigation.'
```

This description hits CSO: triggering phrases (Conditions), the upstream-skill HALT cases (Symptoms), and the implicit Output (a deterministic repro + root-cause statement + regression test) is named in the body, not the description.

### Avoid

```yaml
description: Helps with debugging
description: Processes data
description: Does stuff with files
```

These violate CSO — no triggers, no symptoms, no outputs.

## The No-Placeholders rule

APED's anti-placeholder lint (`scripts/lint-placeholders.sh`) bans these tokens in skill bodies and in generated artefacts:

<!-- aped-lint-disable -->
- `TBD`, `TODO`, `FIXME`, `XXX`
- `placeholder`, `your code here`, `fill in`, `implement later`
- `lorem ipsum`
- "Add appropriate error handling" / "add validation" / "handle edge cases" — without showing how
- "Similar to skill X" without inlining the relevant content
<!-- aped-lint-enable -->

These tokens are **failures** in any prescriptive section of a skill (Iron Law / Red Flags / Rationalizations / steps). They are acceptable only inside `<!-- -->` HTML comments or inside fenced code blocks marked as **non-prescriptive examples** (e.g. illustrating what NOT to write).

Reference files (this file, `persuasion-principles.md`, `testing-skills-with-subagents.md`) document the rule, which means quoting the banned tokens to explain them. Wrap such quotations in `<!-- aped-lint-disable -->` / `<!-- aped-lint-enable -->` markers so the lint skips them. Keep the disabled span tight — never wrap a whole file.

<!-- aped-lint-disable -->
**Why this rule:** placeholders are the single biggest source of agent improvisation. "Add appropriate error handling" produces five different implementations on five different runs. APED's "Reader persona" doctrine (`/aped-story`) generalises here: every skill must produce the right behaviour from a fresh agent who has never read it before, not from one who knows what was meant.
<!-- aped-lint-enable -->

## Progressive disclosure

The skill body is the table of contents; reference files are the appendix.

**Practical guidance:**
- Keep skill body under 500 lines for optimal performance.
- Split content into separate files when approaching this limit.
- Reference files (like this one, under `aped-skills/`) live one level deep from the skill that uses them. Do not nest references — Claude partially reads files when they're referenced from other referenced files (`head -100` previews, incomplete information).

**Bad** (too deep):
```markdown
# aped-dev.md
See [tdd-engine.md](aped-dev/references/tdd-engine.md)…

# tdd-engine.md
See [details.md](details.md)…

# details.md
Here's the actual information…
```

**Good** (one level deep):
```markdown
# aped-dev.md

**TDD cycle**: [instructions inline]
**TDD-engine reference**: See `aped-dev/references/tdd-engine.md`
**Ticket-git workflow**: See `aped-dev/references/ticket-git-workflow.md`
```

For reference files longer than 100 lines, include a Contents block at the top (see this file's `## Contents`) so Claude can see the full scope of available information even when previewing with partial reads.

## Avoid time-sensitive information

Don't include information that will become outdated:

**Bad:**
```markdown
If you're doing this before August 2025, use the old API.
After August 2025, use the new API.
```

**Good:**
```markdown
## Current method
Use the v2 API endpoint: `api.example.com/v2/messages`

## Old patterns
<details>
<summary>Legacy v1 API (deprecated 2025-08)</summary>
The v1 API used `api.example.com/v1/messages`. No longer supported.
</details>
```

## Use consistent terminology

Choose one term and use it throughout the skill. APED's terminology canon:

- "Skill" — a `/aped-*` markdown file with frontmatter and body, invoked by the agent.
- "Subagent" / "specialist" — a fresh agent dispatched via the `Agent` tool from inside a skill.
- "Story" — APED unit of implementation (one feature branch, one PR, one `/aped-dev` cycle).
- "Epic" — group of stories delivering a coherent user-value slice.
- "Sprint" — the current active set of stories.
- "Worktree" — git worktree used by `/aped-sprint` to isolate one story per terminal.
- "Reader persona" — the enthusiastic-junior reader of every story file.

Mixing "task" and "story" or "review" and "audit" in the same skill produces ambiguity that the Reader persona will resolve in the wrong direction.

## Workflows and feedback loops

### Use workflows for complex tasks

Break complex operations into clear, sequential steps. For particularly complex skills (e.g. `/aped-review`'s 13 steps), provide a checklist Claude can copy into its response and check off as it progresses.

APED uses the `## Self-review` checklist pattern at the end of every skill — each `[ ]` must flip to `[x]` or HALT. This is the feedback loop: run validator → fix errors → repeat.

### Implement feedback loops

**Common pattern:** Run validator → fix errors → repeat. APED's lint-placeholders is the canonical example:

```markdown
1. Make your edits to the story file
2. **Validate immediately**: `bash {{APED_DIR}}/scripts/lint-placeholders.sh <story-file>`
3. If validation fails:
   - Review the error message carefully
   - Fix the issues
   - Run validation again
4. **Only proceed when validation passes**
```

The validation loop catches placeholder regressions before they reach `/aped-dev`.

## Anti-patterns to avoid

### Avoid Windows-style paths

Always use forward slashes in file paths, even on Windows:
- ✓ `scripts/helper.py`, `reference/guide.md`
- ✗ `scripts\helper.py`, `reference\guide.md`

### Avoid offering too many options

Don't present multiple approaches unless necessary:

**Bad** (confusing):
"You can use pypdf, or pdfplumber, or PyMuPDF, or pdf2image, or…"

**Good** (provide a default with escape hatch):
"Use pdfplumber for text extraction. For scanned PDFs requiring OCR, use pdf2image with pytesseract instead."

APED skills lean opinionated on the path most projects need, then mention the alternative explicitly when the project diverges (configurable via `config.yaml`).

## APED checklist for effective skills

Before adding or modifying an APED skill, verify:

### Core quality
- [ ] Description is specific and includes triggering phrases (CSO principle: conditions / symptoms / outputs).
- [ ] Description is third-person, no "I can help" / "You can use".
- [ ] Skill body is under 500 lines (split into reference files under one level deep otherwise).
- [ ] No time-sensitive information (or in "old patterns" section).
- [ ] Consistent terminology throughout (matches APED canon above).
- [ ] Examples are concrete, not abstract.
- [ ] File references are one level deep.
- [ ] Workflows have clear `Phase / Step` structure.
- [ ] Self-review checklist at the end with placeholder-lint item.

### APED-specific
- [ ] Iron Law present (single sentence, imperative — see persuasion-principles.md for why).
- [ ] Red Flags table (forbidden phrases that signal an imminent rule violation).
- [ ] Rationalizations table (excuses that mean the agent is about to break the rule).
- [ ] Iron Law / Red Flags / Rationalizations cross-referenced — no contradictions.
- [ ] No banned placeholder tokens in any prescriptive section.
- [ ] Frontmatter includes `name`, `description`, `license`, `metadata.author`, `metadata.version` (the standard APED set).

### Tested
- [ ] Skill has been run through at least one pressure scenario (see `testing-skills-with-subagents.md`) before deployment.
- [ ] Pressure scenario was a 3+-pressure case (time + sunk cost + authority, etc.) — not an academic recitation test.

## Bottom line

A good APED skill is **concise, opinionated where the path is fragile, flexible where the path is open, and bulletproof against rationalization under pressure**. The CSO description gets the skill discovered; the body gets it followed; the Self-review keeps it honest.
