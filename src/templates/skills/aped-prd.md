---
name: aped-prd
keep-coding-instructions: true
description: 'Use when user says "create PRD", "generate PRD", "draft requirements", "product requirement", "write the prd", "aped prd", or invokes aped-prd. Headless mode available via --headless.'
allowed-paths:
  write: ["{{OUTPUT_DIR}}/**", "{{APED_DIR}}/**"]
  read-only: ["src/**", "tests/**", "package.json"]
argument-hint: "[--headless]"
license: MIT
metadata:
  author: yabafre
  version: {{CLI_VERSION}}
---

# APED PRD — Section-by-Section PRD Authoring

## On Activation

Before any other action, read `{{APED_DIR}}/config.yaml` and resolve:
- `{user_name}` — for greeting and direct address
- `{communication_language}` — for ALL conversation with the user
- `{document_output_language}` — for artefacts written under `{{OUTPUT_DIR}}/`
- `{ticket_system}` / `{git_provider}` — routing for ticket / PR I/O (skip if `none`)

✅ YOU MUST speak `{communication_language}` in every message to the user.
✅ YOU MUST write artefact content in `{document_output_language}`.
✅ If `{{APED_DIR}}/config.yaml` is missing or unreadable, HALT and tell the user to run `npx aped-method`.

## Critical Rules

- EVERY FR must follow format: `FR#: [Actor] can [capability]` — no exceptions
- Take your time to generate quality FRs — 10-80 range, each independently testable
- Do not skip domain detection — it determines mandatory sections
- Quality is more important than speed — validate before writing
- **Interactive mode is the default.** Generate ONE section, present it, ⏸ HALT with the A/P/C menu, then move on. Pure-autonomous output is opt-in via `--headless` for headless workflows where no user is at the keyboard.

### Iron Law

**NO PRD SHIPPED WITH PLACEHOLDERS.** FR sections must contain real `FR#: [Actor] can [capability]` lines (no FR-less FR section); Goals / Non-goals / NFRs / Success Metrics must contain real prose, not `TBD`, `TODO`, `<placeholder>`, lone ellipses, or `to be defined`. Placeholders fail the Self-review lint and block the user gate. If a section can't be filled in, that's data — surface the gap to the user and ask, do not paper over it.

### Red Flags

Phrases that mean you are about to ship a placeholder. If you catch yourself thinking any of these, stop.

| Phrase | Why it's wrong |
|--------|----------------|
| "We'll fill this in later" | Later is a downstream skill misreading the gap. Fill it now or HALT. |
| "Section TBD — see the brief" | Downstream skills don't load the brief. The PRD is their source. |
| "This is mostly self-explanatory" | If it were, the PRD wouldn't need this section. Write it. |
| "The user will refine this" | The user invoked this skill to *avoid* writing it themselves. |
| "I'll mark it `...` for now" | Lone ellipses fail the lint. Same outcome, lost time. |

### Rationalizations

| Excuse | Reality |
|--------|---------|
| "I can put TBD now and refine in the next iteration" | There is no next iteration — the next skill (epics, arch) treats this PRD as LAW. |
| "This section is obvious from context" | Downstream skills don't have your context. They have only this file. |
| "Filling it in would slow the PRD down" | Shipping ambiguity slows the *project* down by an order of magnitude more. |

## Input Discovery

Before any work, discover and load all upstream APED artefacts that exist. This skill is consume-everything-found.

### 1. Glob discovery

Search these locations in order:
- `{{OUTPUT_DIR}}/**`
- `{{APED_DIR}}/**`
- `docs/**` (project root)

Look for these artefacts (✱ = required, others = optional):
- Product Brief — `*brief*.md` or `product-brief.md` ✱
- Project Context — `*context*.md` or `project-context.md`
- Research — `*research*.md`

### 2. Required-input validation (hard-stop)

For the ✱ Product Brief:
- If found: continue
- If missing: HALT with this message:
  > "PRD generation requires a Product Brief to work from. Run `aped-analyze` first, or provide the brief file path."

Do NOT auto-generate a missing brief. Hard-stop is intentional.

### 3. Load + report

- Load every discovered file completely (no offset/limit).
- Brownfield/greenfield is detected via `project-context.md` presence.

Present a discovery report (adapt to `communication_language`):

> Welcome {user_name}! Setting up `aped-prd` for {project_name}.
>
> **Documents discovered:**
> - Product Brief: {N} files {✓ loaded | ✱ MISSING — HALT}
> - Project Context: {N} files {✓ loaded (brownfield mode) | (none)}
> - Research: {N} files {✓ loaded | (none)}
>
> **Files loaded:** {comma-separated filenames}
>
> {if brownfield} 📋 Brownfield mode: existing project context loaded. NFRs and architectural constraints from the existing system will bias FR formulation. {/if}
>
> [C] Continue with these documents
> [Other] Add a file path / paste content — I'll load it and redisplay

⏸ **HALT — wait for `[C]` or additional inputs.**

### 4. Bias the rest of the workflow

Loaded artefacts inform every subsequent section:
- FRs are extracted from the brief's MVP scope and refined against research findings.
- Domain detection uses the brief plus any research that flagged compliance signals.
- In brownfield mode, NFRs include constraints inherited from the existing system documented in `project-context.md`.

## Setup

1. Read `{{OUTPUT_DIR}}/state.yaml` — check pipeline state
   - If `pipeline.phases.prd.status` is `done`: ask user — redo PRD or skip?
   - If user skips: stop here (user will invoke next phase manually)
2. **Mode detection** — parse the `--headless` / `-H` flag from the user's invocation:
   - `--headless`: autonomous generation, no menus, no HALT (keep current 3.7 behaviour for CI / scripted runs)
   - Default (no flag): **interactive section-by-section** with A/P/C menu after each section

## Domain & Project Type Detection

1. Read `{{APED_DIR}}/aped-prd/references/domain-complexity.csv`
   - Match brief content against `signals` column
   - If match found: note `complexity`, `key_concerns`, `special_sections`
   - High-complexity domains (healthcare, fintech, govtech, etc.) — mandatory Domain Requirements section
2. Read `{{APED_DIR}}/aped-prd/references/project-types.csv`
   - Match against `detection_signals`
   - Note `required_sections`, `skip_sections`, `key_questions`

## Task Tracking

Create tasks for each section so progress is visible across the menu loops:
```
TaskCreate: "Section 1: Foundation — Executive Summary & Vision"
TaskCreate: "Section 2: Scope & Journeys"
TaskCreate: "Section 3: Domain Requirements (conditional)"
TaskCreate: "Section 4: Functional & Non-Functional Requirements"
TaskCreate: "Validate PRD"
```

Update each task to `completed` as the user picks `[C]` Continue on its menu.

## Self-review (run before user gate)

Before presenting any PRD section to the user, walk this checklist. Each `[ ]` must flip to `[x]` or HALT. If the lint step exits 1, present its output verbatim and ask the user `[F]ix the listed entries` / `[O]verride and accept (record reason in PRD frontmatter)`.

- [ ] **Placeholder lint** — run `bash {{APED_DIR}}/scripts/lint-placeholders.sh {{OUTPUT_DIR}}/prd.md`. Exit 0 = pass. Disabled silently when `placeholder_lint.enabled: false` in `config.yaml`.
- [ ] **FR format** — every FR matches `FR#: [Actor] can [capability]`. No FR-less section.
- [ ] **FR IDs** — sequential (no accidental gaps), unique, none reused.
- [ ] **NFRs measurable** — every NFR has a threshold (`< 200ms p95`, `99.9% uptime`); no bare "fast", "scalable", "secure".
- [ ] **Required sections present** — Goals, Non-goals (or Out of Scope), FRs, NFRs, Success Metrics.
- [ ] **Ambiguity scan** — `should`, `might`, `could` only appear with explicit justification. Otherwise rephrase as a concrete claim or remove.
- [ ] **Spec-reviewer dispatched** — reviewer returned Approved (or [O]verride recorded).

## A/P/C Menu Pattern (interactive mode)

After **each** section is drafted, present the section content to the user, then display:

```
Section {N} of 4 — {section name} draft complete.

Choose your next move:
[A] Advanced elicitation — invoke aped-elicit on this section to stress-test
    (socratic / pre-mortem / red team / first principles / shark tank, etc.)
[P] Party / Council — invoke a focused sub-team to challenge this section:
      • Section 1 (Foundation): Mary (Market) + Derek (Domain) cross-check vision
      • Section 2 (Scope): a Product Manager persona pushes back on MVP boundary
      • Section 3 (Domain): Raj (Compliance) audits regulatory coverage
      • Section 4 (Requirements): Eva (QA) + Marcus (Staff Eng) pressure-test FRs
[C] Continue — accept this section, move to the next
[Other] Direct feedback — type your changes; I'll apply them and redisplay this menu
```

⏸ **HALT — wait for user choice. Never auto-pick `[C]`.** In `--headless` mode, skip the menu and treat every section as `[C]` Continue automatically.

### Behaviour by choice

- `[A]` → invoke `aped-elicit` with the current section as target. When elicit returns enhanced content, ask: "Apply these changes? (y/n/other)". On `y`: replace the section. Then redisplay the same A/P/C menu.
- `[P]` → dispatch the section-specific sub-team via the `Agent` tool, in parallel. Each subagent reviews the section through its persona's lens and returns 2-4 findings. Merge findings, present to user as "Council says: …", then ask: "Apply any of these? (numbers / all / none)". On selection: integrate into the section. Then redisplay the menu.
- `[C]` → mark the task `completed` and move to the next section.
- Direct feedback (anything else) → apply the user's edits to the section, redisplay the menu.

## PRD Generation (4 sections, each gated in interactive mode)

Generate the PRD using `{{APED_DIR}}/templates/prd.md` as structure. **One section at a time** in interactive mode; sequential straight-through in `--headless`.

### Section 1: Foundation
- Executive Summary from brief's Core Vision
- Product vision and purpose statement

⏸ Interactive: present + A/P/C menu. Headless: continue.

### Section 2: Scope & Journeys
- Success Criteria: User / Business / Technical / Measurable Outcomes
- Product Scope: MVP — Growth — Vision phases
- **Out of Scope:** explicit list of capabilities considered and decided NOT to do, one-line why each. Required — prevents scope creep in epics/arch downstream. Decisions expected to recur across PRDs (reused product strategy, recurring partner asks) can be promoted to `{{APED_DIR}}/.out-of-scope/<concept>.md` for cross-PRD persistence — see that directory's `README.md` for the format.
- User Journeys: key end-to-end workflows

⏸ Interactive: present + A/P/C menu. Headless: continue.

### Section 3: Domain Requirements (conditional)
- Only if domain-complexity detection flagged medium/high
- Include mandatory compliance, regulations, certifications from `key_concerns`
- Skip this section entirely for low-complexity/general domains

⏸ Interactive (when section is included): present + A/P/C menu. Headless: continue.

### Section 4: Requirements
- Functional Requirements (target 10-80 FRs)
  - Format: `FR#: [Actor] can [capability] [context/constraint]`
  - Group by capability area
  - Read `{{APED_DIR}}/aped-prd/references/fr-rules.md` — validate quality
- Non-Functional Requirements (relevant categories only)
  - Format: `The system shall [metric] [condition] [measurement method]`

⏸ Interactive: present + A/P/C menu. Headless: continue.

### Spec self-review

After all four sections are drafted, look at the full PRD with fresh eyes — this is an inline checklist you run yourself, not a subagent dispatch. Fix any issues inline; no need to re-review.

1. **Placeholder lint:** run `bash {{APED_DIR}}/scripts/lint-placeholders.sh {{OUTPUT_DIR}}/prd.md`. Exit 0 = pass. Fix any flagged TBD / TODO / lone ellipses inline.
2. **FR/NFR coherence:** no contradictions between sections — an NFR that requires offline-first must not collide with an FR that demands a live websocket.
3. **AC presence:** every FR has at least one acceptance criterion (explicit or implicit via the FR's `[capability]` clause being independently testable).
4. **Metrics measurability:** Success Metrics and NFRs have units and thresholds — no vague "improve X", "make it faster". Replace with `< 200ms p95`, `99.9% uptime`, `30% reduction in bounce rate`.
5. **No scope creep:** the PRD does not introduce features absent from the product brief. If the brief says MVP = inventory tracking and the PRD adds a chat feature, surface it to the user as a gap, do not silently widen scope.

If you find issues, fix them inline. No need to re-review — just fix and move on.

### Spec-reviewer dispatch

After the inline self-review passes, dispatch a fresh subagent to review the PRD **before** the user gate. The reviewer's job is to verify the PRD is complete, consistent, and ready for `aped-arch` / `aped-epics` planning.

Use the `Agent` tool (`subagent_type: "general-purpose"`) with this verbatim prompt (substitute `[ARTEFACT_FILE_PATH]` with the actual path of the PRD just written):

```
You are a spec document reviewer. Verify this PRD is complete and ready for planning.

**Spec to review:** [ARTEFACT_FILE_PATH]

## What to Check

| Category | What to Look For |
|----------|------------------|
| Completeness | TODOs, placeholders, "TBD", incomplete sections, missing required sections |
| Consistency | FR/NFR contradictions, conflicting requirements between sections |
| Clarity | Requirements ambiguous enough to cause someone to build the wrong thing |
| Scope | Features in the PRD that are not anchored in the product brief |
| YAGNI | Unrequested features, over-engineering, gold-plated NFRs |

## Calibration

**Only flag issues that would cause real problems during architecture or epic planning.**
FR/NFR contradictions, missing acceptance criteria, or ambiguous metrics that could
be interpreted two ways — those are issues. Approve unless there are serious gaps
that would lead to a flawed `aped-arch` or `aped-epics` cycle.

## Output Format

## Spec Review

**Status:** Approved | Issues Found

**Issues (if any):**
- [Section X]: [specific issue] - [why it matters for planning]

**Recommendations (advisory, do not block approval):**
- [suggestions for improvement]
```

When the reviewer returns:
- **Status: Approved** — proceed to the user gate. Surface the recommendations (advisory) but do not block on them.
- **Status: Issues Found** — fix the flagged issues inline (or `[O]verride` with a recorded reason if a flag is wrong), then re-dispatch the same reviewer once. If the second pass also returns issues, HALT and present the issues to the user for adjudication before handing off.

## Validation

Run **both** validators — `validate-prd.sh` is the legacy human-readable reporter; `oracle-prd.sh` (4.12.0+) is the C-compiler-convention deterministic verifier whose `ERROR <code>: <reason>` output any grep pipeline can parse.

```bash
# Legacy human-readable reporter (kept for backwards compat).
bash {{APED_DIR}}/aped-prd/scripts/validate-prd.sh {{OUTPUT_DIR}}/prd.md

# Deterministic oracle (canonical 4.12.0+ pre-merge gate).
bash {{APED_DIR}}/aped-prd/scripts/oracle-prd.sh {{OUTPUT_DIR}}/prd.md
```

In interactive mode, run this AFTER all sections accepted. If `oracle-prd.sh` exits non-zero, surface the `ERROR Eddd: ...` lines verbatim to the user and offer one final A/P/C round on the failing area. Do **not** ship the PRD until oracle-prd exits 0 — every error code (E001 file-not-found, E002 missing-section, E003 FR-count, E004 non-hyphenated FR, E006 anti-pattern word, E007 NFR-no-threshold) maps to a deterministic fix.

## Output & State

1. Write PRD to `{{OUTPUT_DIR}}/prd.md`
2. Update `{{OUTPUT_DIR}}/state.yaml` under `pipeline.phases.prd` with the structured fields below:

```yaml
pipeline:
  current_phase: "prd"
  phases:
    prd:
      status: "done"
      output: "{{OUTPUT_DIR}}/prd.md"
      completed_at: "<ISO 8601 now>"
      fr_count: <int>            # count of FRs in the PRD's Functional Requirements section
      mode: "interactive"        # interactive | headless — based on whether --headless was passed
```

### `fr_count` derivation

Parse from the FR section of `prd.md`. Count `FR<N>:` headings or list items (one per FR — the canonical `FR#: [Actor] can [capability]` format guarantees one match per FR). For PRDs that group FRs by capability area, sum across groups.

### `mode` derivation

- `mode: "interactive"` — user invoked the skill without `--headless` (the default A/P/C menu loop ran).
- `mode: "headless"` — user passed `--headless` / `-H` (autonomous straight-through generation, no menus).

Downstream tooling reads `mode` to know whether human gating actually happened.

## Next Step

Tell the user: "PRD is ready. Next options:"
- `aped-ux` — Design UX (recommended for UI-heavy projects)
- `aped-arch` — Define architecture decisions (recommended before epics)
- `aped-epics` — Go straight to epics (if arch/UX not needed)

**Do NOT auto-chain.** The user decides when to proceed.

## Example

From a restaurant inventory brief → PRD generates:
- FR-1: Manager can add inventory items with name, quantity, and unit
- FR-2: Manager can set low-stock thresholds per item
- FR-3: System can send alerts when stock falls below threshold
- NFR-1: The system shall respond to inventory queries within 200ms at p95

## Common Issues

- **FR count too low (<10)**: Brief may lack detail — re-read brief, extract implicit capabilities. The Section 4 menu's `[A]` Advanced elicit (Socratic / What If) is good for surfacing missing capabilities.
- **Anti-pattern words detected**: Replace "easy" with step count, "fast" with time threshold. Use `[A]` Advanced elicit with the Feynman method to find vague language.
- **Validation script fails**: Run `bash {{APED_DIR}}/aped-prd/scripts/validate-prd.sh {{OUTPUT_DIR}}/prd.md` — fix reported issues one by one. In interactive mode, this happens automatically after Section 4 with one final remediation round.
- **User wants the old autonomous behaviour (no menus)**: Tell them to invoke `aped-prd --headless`. This skips every A/P/C menu and produces the PRD straight-through, equivalent to the 3.7 behaviour.
- **Model auto-picks `[C]` without showing the menu**: This is a bug. The skill MUST present the menu and HALT after every section in interactive mode. If you catch it auto-continuing, stop, redisplay the menu, wait.
- **PRD already exists in this session and was reviewed**: Do NOT re-review the PRD automatically. If the user invokes `aped-prd` again, ask: "A PRD was already generated this session. Do you want to (1) edit the existing PRD, (2) start fresh, or (3) skip to arch?" (Pocock XS, 5.3.0)

## Stop Conditions (Pocock XS, 5.3.0)

The PRD generation ends when ANY of these fire:
1. **User says "done" / "looks good" / "ship it"** — emit the file and stop.
2. **4 consecutive [C]ontinue without user edits** — the PRD is converged; offer to finalize.
3. **All sections validated by validate-prd.sh + oracle-prd.sh** — green oracle = done.
4. **Token budget >30k consumed in this skill invocation** — warn the user that continued iteration risks context degradation; offer to save and `/clear`.
