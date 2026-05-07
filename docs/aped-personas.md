
---
tags: [aped, personas, agents, teams]
---

# APED — Personas & Teams

APED runs work through **named personas** (BMAD-inspired) so each agent stays in character and focuses its scope. The type of coordination depends on whether specialists need to talk to each other.

> 🔗 See: [APED — Workflow](.aped-workflow.md) · [APED — Phases](.aped-phases.md)

---

## Quick recap — who does what

| Persona | Role | Invoked by | Mode |
|---|---|---|---|
| **Mary** | Senior Market Analyst | `aped-analyze` | Independent parallel |
| **Derek** | Domain Expert | `aped-analyze` | Independent parallel |
| **Tom** | Staff Engineer | `aped-analyze` | Independent parallel |
| **Winston** | Systems Architect | `aped-arch` (Council) | Independent verdict |
| **Lena** | Pragmatic Engineer | `aped-arch` (Council) | Independent verdict |
| **Raj** | Security & Compliance | `aped-arch` (Council) | Independent verdict |
| **Nina** | Cost & Ops Analyst | `aped-arch` (Council) | Independent verdict |
| **Maya** | Edge Case Hunter | `aped-arch` (Council) | Independent verdict |
| **Kenji** | API Designer | `aped-dev` fullstack | Team (SendMessage) |
| **Amelia** | Senior Backend | `aped-dev` fullstack | Team (SendMessage) |
| **Leo** (dev) | Senior Frontend | `aped-dev` fullstack | Team (SendMessage) |
| **Spec auditor** | AC verbatim + task evidence | `aped-review` (always) | Parallel, Lead merges |
| **Code auditor** | File-surface aware code review | `aped-review` (always) | Parallel, Lead merges |
| **Edge & hallucination auditor** | Boundary + identifier presence | `aped-review` (always) | Parallel, Lead merges |
| **Aria** | Visual / Design Engineer | `aped-review` (if FE + preview) | Parallel, Lead merges |
| **Mia** | Struggle Analyzer | `aped-retro` | Independent parallel |
| **Leo** (retro) | Velocity & Quality | `aped-retro` | Independent parallel |
| **Ava** | Previous-Retro Auditor | `aped-retro` | Independent parallel |

---

## Research subagents — `aped-analyze`

**Independent parallel work**, no coordination. Each delivers a deliverable.

- **Mary** — Senior Market Analyst. *"Show me the data, not the hype."* Competitors, market signals, sizing, positioning.
- **Derek** — Domain Expert. *"I know where the bodies are buried."* Business constraints, regulatory, industry unwritten rules.
- **Tom** — Staff Engineer. *"Every choice has a tax."* Technical feasibility, hidden debt, build trade-offs.

---

## Architecture Council — `aped-arch` (high-stakes mode)

Dispatched in parallel via `Agent` when a Phase-2 decision would take **weeks to reverse** (primary DB, auth model, API paradigm, frontend framework, infra platform).

Each specialist thinks **independently** — no shared context, no convergence pressure — and returns a structured verdict: preferred option, rationale, top 2 risks, disqualifying conditions.

- **Winston** — Systems Architect (always included). *"Boring tech for MVP. Cleverness costs operationally."*
- **Lena** — Pragmatic Engineer. *"What ships fastest without regret?"*
- **Raj** — Security & Compliance Reviewer. *"Assume breach. Assume audit."*
- **Nina** — Cost & Ops Analyst. *"What does this cost at 10× scale? And when does it page us at 3am?"*
- **Maya** — Edge Case Hunter. *"Where does this break?"*

The user **picks the final option**; the minority view is documented for future pivots. **Escape hatch**: at MVP scale, the Council may be overkill — normal mode is enough.

---

## Fullstack dev team — `aped-dev` (optional mode)

Triggered when a story touches **≥ 2 layers**. Contract-first coordination via `SendMessage`.

- **Kenji** — API Designer. Owns the oRPC / OpenAPI contract. Contract validated **before** any implementation.
- **Amelia** — Senior Backend. Implements against Kenji's contract.
- **Leo** — Senior Frontend. UI against the contract + visual verification via React Grab MCP.

Uses `TeamCreate` / `TeamDelete` / `SendMessage` — because the three genuinely co-edit a shared artifact (the contract).

---

## Review specialists — `aped-review`

**Plain subagents** (no `TeamCreate`, no `SendMessage`), dispatched in parallel. Each specialist returns its findings to the Lead, who **merges and cross-references manually**.

Why? Keeps the workflow focused on **validation**, avoids tmux-pane rendering issues of the experimental agent-teams mode, scales to N specialists without a parallelism cap.

### Slim model (since 6.2.0)

`aped-review` was 11 specialists across three sequential stages until 6.1.x; the 6.2.0 redesign collapses overlapping scopes into **one method = one auditor**, all dispatched in parallel.

- **Spec auditor** — *"Show me the AC in the test, verbatim."* Every AC has at least one test asserting it; every `[x]` task has code evidence at file:line. (Folds the previous Eva + Aaron.)
- **Code auditor** — *"Security and performance are non-negotiable."* File-surface aware: backend / frontend / infra / cross-layer lenses adapt to what the story touched. Security, performance, reliability, test quality, and the 5 testing anti-patterns. (Folds Marcus + Diego + Lucas + Kai + Sam.)
- **Edge & hallucination auditor** — *"What happens at the boundary? And does this identifier even exist?"* Boundary conditions + production identifiers absent from the diff context. (Folds Hannah + Eli.)
- **Aria** — Visual / Design Engineer. Conditional (frontend + preview app only). Validates dev's React Grab pass via MCP — does not redo it.

The Lead also runs `git-audit.sh` inline (no longer a separate Rex subagent — it's a pure script).

**No minimum-findings floor.** The previous "minimum 3 findings — re-dispatch if fewer" rule produced false positives under pressure. If the auditors found fewer and the evidence is genuine, that's the answer.

**Spec NACK gate.** If Spec auditor flags AC gaps, the Lead presents `[F]ix → return story to dev` / `[O]verride → proceed with reason recorded` before merging the rest.

---

## Retrospective specialists — `aped-retro`

Three parallel subagents reading post-mortem data once an epic completes.

- **Mia** — Struggle Analyzer. Patterns across dev notes, review feedback, accumulated technical debt.
- **Leo** — Velocity & Quality Analyzer. Review rounds, complexity vs effort, quality signals.
- **Ava** — Previous-Retro Auditor. Continuity check — did the prior retro's action items **actually** ship?

Output: `docs/aped/retros/epic-{N}.md` + `docs/aped/lessons.md` (distilled, cross-epic). Since 3.10.2, `lessons.md` is consumed at runtime by `aped-story`, `aped-dev`, and `aped-review` (filtered by `Scope:`), closing the post-epic feedback loop the retro phase always promised.

---

## Tool surface used

| Tool | Usage |
|---|---|
| `Agent` | All specialist dispatches |
| `TaskCreate` / `TaskUpdate` / `TaskList` | Sprint task tracking |
| `TeamCreate` / `TeamDelete` / `SendMessage` | **Only** `aped-dev` fullstack mode (Kenji / Amelia / Leo co-edit a contract) |
| `aped_state.get` / `aped_state.update` / `aped_state.advance` | MCP state tools — read/write `state.yaml` fields, advance pipeline phase. Used by all pipeline skills. |
| `aped-ticket` adapter | Ticket system abstraction (Linear, GitHub Issues, Jira). Skills call the adapter; the adapter routes to the configured provider. |

Review is **pure validation** → skips the team machinery entirely, each reviewer is a plain subagent.

---

## Two coordination types — why?

1. **Independent parallel** (`analyze`, `arch-council`, `review`, `retro`) → each persona returns its output, the human/Lead synthesizes. Scales naturally, no deadlocks.
2. **Contract-first team** (`dev` fullstack) → shared artifact (the API contract) → Kenji must freeze it before Amelia and Leo go. `SendMessage` is the only place where it's justified.

Principle: **don't introduce coordination where none is needed** — coordination is latency and potential deadlocks.

---

## What changed in 3.11.0 → 6.0.0

### 3.11.0 → 3.12.0

The persona roster is unchanged — no new named personas were added in Tiers 4-6. But several personas gained sharper criteria, and a new **adversarial subagent role** (the spec-reviewer) joins the lineup as a non-persona dispatched on demand.

### 6.2.0 — review slim, persona consolidation

The 11-specialist model documented above (Eva / Marcus / Rex / Diego / Lucas / Aria / Kai / Sam / Hannah / Eli / Aaron, 1 → 1.5 → 2 sequential stages) is **superseded** by the slim model (Spec / Code / Edge & hallucination + Aria conditional, single parallel dispatch). The historical sections below describe the pre-6.2.0 lineage and the rationale that informed each persona's scope; the slim model preserves that scope but folds method-overlapping personas into one prompt each. The 5 testing anti-patterns Marcus carried since 3.11.0 are now part of the Code auditor's prompt; Hannah's blind-hunter discipline + Eli's boundary walk are part of the Edge & hallucination auditor's prompt; Eva's AC verbatim discipline + Aaron's task evidence rule are part of the Spec auditor's prompt. Rex's git audit moved from a subagent to an inline `git-audit.sh` invocation by the Lead.

### Marcus — gains a Testing Anti-Patterns checklist (since 3.11.0)

**Marcus** (Code Quality / Staff Engineer) now checks for **5 named testing anti-patterns** verbatim from Superpowers' `testing-anti-patterns.md`, with explicit gate functions:

| Anti-pattern | Gate function |
|---|---|
| **Testing mock behavior** | "Am I testing real component behavior or just mock existence? If testing mock existence: STOP — delete the assertion or unmock the component." |
| **Test-only methods on production classes** | "Is this method only used by tests? If yes: STOP — don't add it; put it in test utilities." |
| **Mocking without understanding** | "What side effects does the real method have? Does this test depend on any of those side effects? Do I fully understand what this test needs? If unclear: STOP." |
| **Incomplete mocks** | "Mock the COMPLETE data structure as it exists in reality, not just fields your immediate test uses." |
| **Integration test as afterthought** | "Tests are part of implementation, not optional follow-up. Reject PRs that defer integration tests to 'next sprint'." |

The Self-review checklist gains a "Marcus checked for the 5 testing anti-patterns" item.

### Eva — runs **first** as a synchronous gate (since 3.11.0, two-stage review)

`aped-review` no longer fan-outs all specialists in parallel. **Eva** (AC Validator) runs alone first as a **blocking gate**. On Eva PASS, Marcus + Rex + conditionals dispatch in parallel. On Eva NACK, the skill HALTs and asks `[F]ix → return story to dev` / `[O]verride → proceed with reason recorded`. Spec-compliance precedes quality — no wasted dispatches on a story that's about to return for an AC gap.

### Spec-reviewer — adversarial subagent (NEW since 3.11.0, expanded in 3.12.0)

A **non-persona** subagent dispatched via the `Agent` tool by every artefact-producing skill before the user gate. Validates the produced artefact for completeness / consistency / clarity / scope / YAGNI. Calibrated per artefact type:

| Skill | Calibration target |
|---|---|
| `aped-brainstorm` (since 3.11.0) | Spec contradictions, vague requirements, scope decomposition needed, YAGNI |
| `aped-prd` (since 3.12.0) | FR/NFR contradictions, missing ACs, ambiguous metrics, scope creep |
| `aped-ux` (since 3.12.0) | Screen/flow inconsistency, missing component inventory, accessibility gaps |
| `aped-epics` (since 3.12.0) | Story granularity, orphan FRs, depends_on cycles, FR-coverage gap vs PRD |
| `aped-analyze` (since 3.12.0) | Research consistency, evidence quality, scope clarity, non-falsifiable claims |

Output format: `## Spec Review` with **Status: Approved | Issues Found** + bulleted issues + advisory recommendations. NACK behaviour: HALT → `[F]ix → revise + redispatch once` / `[O]verride → proceed with reason recorded`. After re-dispatch, persistent NACK escalates to the user.

This is **not** a named persona — it's a fresh subagent per call, with a verbatim adversarial prompt. The pattern is lifted from Superpowers' `brainstorming/spec-document-reviewer-prompt.md`.

### `aped-receive-review` skill (NEW since 3.11.0) — no new persona, but a new discipline

Closes the asymmetry: APED reviewed code but had no discipline for **receiving** review. The skill enforces:
- Forbidden performative responses (no "you're absolutely right!", no gratitude expressions)
- 6-step Response Pattern (READ → UNDERSTAND → VERIFY → EVALUATE → RESPOND → IMPLEMENT)
- YAGNI grep gate on "implement properly" suggestions
- Multi-item clarification gate (HALT before implementing partial feedback)

Invoked by the **Story Leader** (the implementer persona, no specific name — usually you or a Claude Code session) after `aped-review` returns issues, or standalone when external review feedback (PR comments, Slack, senior eng email) is pasted.

### Architecture Council — councils now persist to state.yaml (since 3.12.0)

When the Architecture Council (Winston / Lena / Raj / Nina / Maya) is dispatched, the verdict now persists to `state.yaml` under `pipeline.phases.architecture.councils_dispatched: [{id, subject, specialists, verdict}]`. ADRs persist as `pipeline.phases.architecture.adrs: [{id, subject, path, author}]`. Watch items, residual gaps, and Epic 0 stories are recorded as counts. Tooling can rely on these without re-parsing `architecture.md`.

### Tool surface update

| Tool | Usage |
|---|---|
| `Agent` | All specialist dispatches **+** spec-reviewer subagent (since 3.11.0–3.12.0) |
| `TaskCreate` / `TaskUpdate` / `TaskList` | Sprint task tracking |
| `TeamCreate` / `TeamDelete` / `SendMessage` | **Only** `aped-dev` fullstack mode (Kenji / Amelia / Leo co-edit a contract) |
| `Skill` | Primary invocation surface (slash commands removed in 4.0.0). Use the bare skill name (`aped-prd`, `aped-review`…) — no leading slash. |

### 4.7.0 → 5.5.0

#### Stage 1.5 adversarial reviewers — Hannah, Eli, Aaron (since 4.18.0)

Three new **named personas** join the review pipeline as a dedicated adversarial layer between Eva's AC gate (Stage 1) and the conditional domain specialists (Stage 2). See the [Stage 1.5 section](#stage-15--adversarial-reviewers-since-4180) above for full descriptions.

The review flow is now three stages:

1. **Stage 1** — Eva (AC gate, blocking)
2. **Stage 1.5** — Hannah + Eli + Aaron (adversarial, parallel)
3. **Stage 2** — Marcus + Rex + conditional specialists (domain, parallel)

This brings the total named persona count to **24** (21 prior + Hannah + Eli + Aaron).

#### MCP state tools (since 4.7.0)

Pipeline skills no longer write `state.yaml` via raw file I/O. The `aped_state` MCP server exposes:

- `aped_state.get` — read any `state.yaml` path (dot-notation)
- `aped_state.update` — write any `state.yaml` path with validation
- `aped_state.advance` — advance the pipeline phase with guard rails (no skipping, no backward moves without `--force`)

#### aped-ticket adapter (since 5.0.0)

A provider-agnostic ticket abstraction. Skills call `aped-ticket` methods (`create`, `transition`, `comment`, `link`); the adapter routes to whichever provider was selected at install time (Linear, GitHub Issues, Jira). Persona skills that interact with tickets (Eva for AC traceability, Rex for commit-ticket cross-ref) use the adapter transparently.

#### Skill count

APED ships **35 skills** as of v6.0.0.

### 6.0.0 — BMAD-style skill decomposition

Personas and tool surface are unchanged. The structural change in v6.0.0: every skill that hosts a persona is now a directory (`aped-X/SKILL.md` + optional `workflow.md` + `steps/step-NN-*.md`). The 10 phase skills are fully decomposed (6–12 steps each) — `aped-review` step-04 is where Eva runs, step-05 is where Hannah/Eli/Aaron run, step-06 is where the Stage 2 specialists dispatch. The persona definitions themselves haven't moved — they live in the skill directory's reference files (`references/review-criteria.md`, etc.). Branch creation discipline moved into the persona-less `aped-story/steps/step-01-init.md` (refuses `main`/`master`/`prod`/`develop`/`release/*`/detached HEAD) and `aped-story/steps/step-03-*.md` (creates `feature/{ticket}-{slug}`).

#### Tool surface update (cumulative)

| Tool | Usage |
|---|---|
| `Agent` | All specialist dispatches + spec-reviewer subagent |
| `TaskCreate` / `TaskUpdate` / `TaskList` | Sprint task tracking |
| `TeamCreate` / `TeamDelete` / `SendMessage` | **Only** `aped-dev` fullstack mode |
| `Skill` | Primary invocation surface (bare skill name, no slash) |
| `aped_state.get` / `.update` / `.advance` | MCP state tools (since 4.7.0) |
| `aped-ticket` adapter | Provider-agnostic ticket ops (since 5.0.0) |

---

