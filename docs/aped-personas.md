
---
tags: [aped, personas, agents, teams]
---

# APED — Personas & Teams

APED runs work through **named personas** (BMAD-inspired) so each agent stays in character and focuses its scope. The type of coordination depends on whether specialists need to talk to each other.

> 🔗 See: [APED — Workflow](./aped-workflow.md) · [APED — Phases](./aped-phases.md)

---

## Quick recap — who does what

| Persona | Role | Invoked by | Mode |
|---|---|---|---|
| **Mary** | Senior Market Analyst | `/aped-analyze` | Independent parallel |
| **Derek** | Domain Expert | `/aped-analyze` | Independent parallel |
| **Tom** | Staff Engineer | `/aped-analyze` | Independent parallel |
| **Winston** | Systems Architect | `/aped-arch` (Council) | Independent verdict |
| **Lena** | Pragmatic Engineer | `/aped-arch` (Council) | Independent verdict |
| **Raj** | Security & Compliance | `/aped-arch` (Council) | Independent verdict |
| **Nina** | Cost & Ops Analyst | `/aped-arch` (Council) | Independent verdict |
| **Maya** | Edge Case Hunter | `/aped-arch` (Council) | Independent verdict |
| **Kenji** | API Designer | `/aped-dev` fullstack | Team (SendMessage) |
| **Amelia** | Senior Backend | `/aped-dev` fullstack | Team (SendMessage) |
| **Leo** (dev) | Senior Frontend | `/aped-dev` fullstack | Team (SendMessage) |
| **Eva** | AC Validator / QA | `/aped-review` (always) | Parallel, Lead merges |
| **Marcus** | Code Quality / Staff Eng | `/aped-review` (always) | Parallel, Lead merges |
| **Rex** | Git Auditor | `/aped-review` (always) | Parallel, Lead merges |
| **Diego** | Backend Reviewer | `/aped-review` (if backend) | Parallel, Lead merges |
| **Lucas** | Frontend Reviewer | `/aped-review` (if frontend) | Parallel, Lead merges |
| **Aria** | Visual / Design Engineer | `/aped-review` (if FE + preview) | Parallel, Lead merges |
| **Kai** | Platform / DevOps | `/aped-review` (if infra) | Parallel, Lead merges |
| **Sam** | Fullstack Tech Lead | `/aped-review` (if ≥ 2 layers) | Parallel, Lead merges |
| **Mia** | Struggle Analyzer | `/aped-retro` | Independent parallel |
| **Leo** (retro) | Velocity & Quality | `/aped-retro` | Independent parallel |
| **Ava** | Previous-Retro Auditor | `/aped-retro` | Independent parallel |

---

## Research subagents — `/aped-analyze`

**Independent parallel work**, no coordination. Each delivers a deliverable.

- **Mary** — Senior Market Analyst. *"Show me the data, not the hype."* Competitors, market signals, sizing, positioning.
- **Derek** — Domain Expert. *"I know where the bodies are buried."* Business constraints, regulatory, industry unwritten rules.
- **Tom** — Staff Engineer. *"Every choice has a tax."* Technical feasibility, hidden debt, build trade-offs.

---

## Architecture Council — `/aped-arch` (high-stakes mode)

Dispatched in parallel via `Agent` when a Phase-2 decision would take **weeks to reverse** (primary DB, auth model, API paradigm, frontend framework, infra platform).

Each specialist thinks **independently** — no shared context, no convergence pressure — and returns a structured verdict: preferred option, rationale, top 2 risks, disqualifying conditions.

- **Winston** — Systems Architect (always included). *"Boring tech for MVP. Cleverness costs operationally."*
- **Lena** — Pragmatic Engineer. *"What ships fastest without regret?"*
- **Raj** — Security & Compliance Reviewer. *"Assume breach. Assume audit."*
- **Nina** — Cost & Ops Analyst. *"What does this cost at 10× scale? And when does it page us at 3am?"*
- **Maya** — Edge Case Hunter. *"Where does this break?"*

The user **picks the final option**; the minority view is documented for future pivots. **Escape hatch**: at MVP scale, the Council may be overkill — normal mode is enough.

---

## Fullstack dev team — `/aped-dev` (optional mode)

Triggered when a story touches **≥ 2 layers**. Contract-first coordination via `SendMessage`.

- **Kenji** — API Designer. Owns the oRPC / OpenAPI contract. Contract validated **before** any implementation.
- **Amelia** — Senior Backend. Implements against Kenji's contract.
- **Leo** — Senior Frontend. UI against the contract + visual verification via React Grab MCP.

Uses `TeamCreate` / `TeamDelete` / `SendMessage` — because the three genuinely co-edit a shared artifact (the contract).

---

## Review specialists — `/aped-review`

**Plain subagents** (no `TeamCreate`, no `SendMessage`), dispatched in parallel. Each specialist returns its findings to the Lead, who **merges and cross-references manually**.

Why? Keeps the workflow focused on **validation**, avoids tmux-pane rendering issues of the experimental agent-teams mode, scales to N specialists without a parallelism cap.

### Always invoked
- **Eva** — AC Validator / QA Lead. *"I trust nothing without proof in the code."* Verifies acceptance criteria with proof in the code.
- **Marcus** — Code Quality / Staff Engineer. *"Security and performance are non-negotiable."*
- **Rex** — Git Auditor. *"Every commit tells a story. Most lie."* Reads commits, detects drift and lying messages.

### Conditional (based on what the story touched)
- **Diego** — Backend reviewer (if backend files touched)
- **Lucas** — Frontend reviewer (if frontend files touched)
- **Aria** — Visual / Design Engineer (frontend + preview app)
- **Kai** — Platform / DevOps (if infra files)
- **Sam** — Fullstack Tech Lead (if story spans ≥ 2 layers)

**Minimum 3 findings** — if a reviewer finds nothing, they're looking wrong.

---

## Retrospective specialists — `/aped-retro`

Three parallel subagents reading post-mortem data once an epic completes.

- **Mia** — Struggle Analyzer. Patterns across dev notes, review feedback, accumulated technical debt.
- **Leo** — Velocity & Quality Analyzer. Review rounds, complexity vs effort, quality signals.
- **Ava** — Previous-Retro Auditor. Continuity check — did the prior retro's action items **actually** ship?

Output: `docs/aped/retros/epic-{N}.md` + `docs/aped/lessons.md` (distilled, cross-epic). Since 3.10.2, `lessons.md` is consumed at runtime by `/aped-story`, `/aped-dev`, and `/aped-review` (filtered by `Scope:`), closing the post-epic feedback loop the retro phase always promised.

---

## Tool surface used

| Tool | Usage |
|---|---|
| `Agent` | All specialist dispatches |
| `TaskCreate` / `TaskUpdate` / `TaskList` | Sprint task tracking |
| `TeamCreate` / `TeamDelete` / `SendMessage` | **Only** `/aped-dev` fullstack mode (Kenji / Amelia / Leo co-edit a contract) |

Review is **pure validation** → skips the team machinery entirely, each reviewer is a plain subagent.

---

## Two coordination types — why?

1. **Independent parallel** (`analyze`, `arch-council`, `review`, `retro`) → each persona returns its output, the human/Lead synthesizes. Scales naturally, no deadlocks.
2. **Contract-first team** (`dev` fullstack) → shared artifact (the API contract) → Kenji must freeze it before Amelia and Leo go. `SendMessage` is the only place where it's justified.

Principle: **don't introduce coordination where none is needed** — coordination is latency and potential deadlocks.

---

## What changed in 3.11.0 → 3.12.0

The persona roster is unchanged — no new named personas were added in Tiers 4-6. But several personas gained sharper criteria, and a new **adversarial subagent role** (the spec-reviewer) joins the lineup as a non-persona dispatched on demand.

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

`/aped-review` no longer fan-outs all specialists in parallel. **Eva** (AC Validator) runs alone first as a **blocking gate**. On Eva PASS, Marcus + Rex + conditionals dispatch in parallel. On Eva NACK, the skill HALTs and asks `[F]ix → return story to dev` / `[O]verride → proceed with reason recorded`. Spec-compliance precedes quality — no wasted dispatches on a story that's about to return for an AC gap.

### Spec-reviewer — adversarial subagent (NEW since 3.11.0, expanded in 3.12.0)

A **non-persona** subagent dispatched via the `Agent` tool by every artefact-producing skill before the user gate. Validates the produced artefact for completeness / consistency / clarity / scope / YAGNI. Calibrated per artefact type:

| Skill | Calibration target |
|---|---|
| `/aped-brainstorm` (since 3.11.0) | Spec contradictions, vague requirements, scope decomposition needed, YAGNI |
| `/aped-prd` (since 3.12.0) | FR/NFR contradictions, missing ACs, ambiguous metrics, scope creep |
| `/aped-ux` (since 3.12.0) | Screen/flow inconsistency, missing component inventory, accessibility gaps |
| `/aped-epics` (since 3.12.0) | Story granularity, orphan FRs, depends_on cycles, FR-coverage gap vs PRD |
| `/aped-analyze` (since 3.12.0) | Research consistency, evidence quality, scope clarity, non-falsifiable claims |

Output format: `## Spec Review` with **Status: Approved | Issues Found** + bulleted issues + advisory recommendations. NACK behaviour: HALT → `[F]ix → revise + redispatch once` / `[O]verride → proceed with reason recorded`. After re-dispatch, persistent NACK escalates to the user.

This is **not** a named persona — it's a fresh subagent per call, with a verbatim adversarial prompt. The pattern is lifted from Superpowers' `brainstorming/spec-document-reviewer-prompt.md`.

### `/aped-receive-review` skill (NEW since 3.11.0) — no new persona, but a new discipline

Closes the asymmetry: APED reviewed code but had no discipline for **receiving** review. The skill enforces:
- Forbidden performative responses (no "you're absolutely right!", no gratitude expressions)
- 6-step Response Pattern (READ → UNDERSTAND → VERIFY → EVALUATE → RESPOND → IMPLEMENT)
- YAGNI grep gate on "implement properly" suggestions
- Multi-item clarification gate (HALT before implementing partial feedback)

Invoked by the **Story Leader** (the implementer persona, no specific name — usually you or a Claude Code session) after `/aped-review` returns issues, or standalone when external review feedback (PR comments, Slack, senior eng email) is pasted.

### Architecture Council — councils now persist to state.yaml (since 3.12.0)

When the Architecture Council (Winston / Lena / Raj / Nina / Maya) is dispatched, the verdict now persists to `state.yaml` under `pipeline.phases.architecture.councils_dispatched: [{id, subject, specialists, verdict}]`. ADRs persist as `pipeline.phases.architecture.adrs: [{id, subject, path, author}]`. Watch items, residual gaps, and Epic 0 stories are recorded as counts. Tooling can rely on these without re-parsing `architecture.md`.

### Tool surface update

| Tool | Usage |
|---|---|
| `Agent` | All specialist dispatches **+** spec-reviewer subagent (since 3.11.0–3.12.0) |
| `TaskCreate` / `TaskUpdate` / `TaskList` | Sprint task tracking |
| `TeamCreate` / `TeamDelete` / `SendMessage` | **Only** `/aped-dev` fullstack mode (Kenji / Amelia / Leo co-edit a contract) |
| `Skill` | **New primary invocation surface** (since 3.12.0) — replaces deprecated `/aped-X` slash commands. Use the skill name without the leading slash. |


---

